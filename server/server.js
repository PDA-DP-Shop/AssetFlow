const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config();

const db = require('./db/db');
const initializeDatabase = require('./db/init');
const { logActivity } = require('./utils/logger');

// Route imports
const authRoutes     = require('./routes/authRoutes');
const assetRoutes    = require('./routes/assetRoutes');
const bookingRoutes  = require('./routes/bookingRoutes');
const auditRoutes    = require('./routes/auditRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const allocationRoutes = require('./routes/allocationRoutes');
const maintenanceRoutes = require('./routes/maintenanceRoutes');
const reportRoutes = require('./routes/reportRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const transferRoutes = require('./routes/transferRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
const server = http.createServer(app);

// Enable Socket.io server
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

app.set('socketio', io);

app.use(cors());
app.use(express.json());

// Set up Socket.io connection logging
io.on('connection', (socket) => {
  console.log(`WebSocket client connected: ${socket.id}`);
  
  socket.on('testBroadcast', (data) => {
    console.log('Test broadcast received from socket client:', data);
    io.emit('notification', {
      message: data.message || 'Automated asset check triggered.',
      time: new Date()
    });
  });

  socket.on('disconnect', () => {
    console.log(`WebSocket client disconnected: ${socket.id}`);
  });
});

// API Routes
app.use('/api/auth',      authRoutes);
app.use('/api/assets',    assetRoutes);
app.use('/api/bookings',  bookingRoutes);
app.use('/api/resources',   resourceRoutes);
app.use('/api/dashboard',   dashboardRoutes);
app.use('/api/departments',          departmentRoutes);
app.use('/api/allocations',          allocationRoutes);
app.use('/api/maintenance-requests', maintenanceRoutes);
app.use('/api/reports',              reportRoutes);
app.use('/api/categories',           categoryRoutes);
app.use('/api/employees',            employeeRoutes);
app.use('/api/transfers',            transferRoutes);
app.use('/api/notifications',        notificationRoutes);
app.use('/api',                      auditRoutes);

app.get('/api/health', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({
      status: 'ok',
      db_time: result.rows[0].now,
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (err) {
    console.error('Healthcheck DB Error:', err.message);
    res.status(500).json({ error: 'Database connection failed', details: err.message });
  }
});

// Demo Route to trigger a Socket.io broadcast and save to DB
app.post('/api/test-broadcast', async (req, res) => {
  const { message } = req.body;
  const broadcastMsg = message || `Asset update event dispatched at ${new Date().toLocaleTimeString()}`;
  
  try {
    // Attempt to write notification to database for the admin user (ID = 1 from seed)
    await db.query(
      'INSERT INTO notifications (user_id, message, type) VALUES ($1, $2, $3)',
      [1, broadcastMsg, 'system']
    );

    // Write log to activity log
    await db.query(
      'INSERT INTO activity_log (user_id, action, entity_type, details) VALUES ($1, $2, $3, $4)',
      [1, 'BROADCAST_TEST', 'system', broadcastMsg]
    );

    // Emit live socket event
    io.emit('notification', {
      message: broadcastMsg,
      time: new Date()
    });

    res.json({ success: true, message: 'Broadcast emitted and logged in database successfully.' });
  } catch (err) {
    // If DB fails (e.g. table doesn't exist yet or connection down), still emit via Socket
    console.warn('Logging broadcast to DB failed, forwarding via socket only:', err.message);
    io.emit('notification', {
      message: `${broadcastMsg} (Bypassed DB logs: ${err.message})`,
      time: new Date()
    });
    res.json({ success: true, warning: 'Forwarded over sockets, but DB log failed.', details: err.message });
  }
});

// Serve frontend static assets in production mode
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// Database and Server Boot
const PORT = process.env.PORT || 5000;

// Background Check for Bookings starting within 15 minutes
async function checkUpcomingBookings() {
  try {
    const upcomingRes = await db.query(
      `SELECT b.id, b.start_time, b.purpose, r.name AS resource_name, u.name AS user_name, u.id AS user_id
       FROM bookings b
       JOIN resources r ON b.resource_id = r.id
       JOIN users u ON b.booked_by = u.id
       WHERE b.status = 'Upcoming' 
         AND b.reminder_sent = false 
         AND b.start_time <= NOW() + INTERVAL '15 minutes'
         AND b.start_time >= NOW()`
    );

    if (upcomingRes.rowCount > 0) {
      console.log(`[Booking Reminder Check] Found ${upcomingRes.rowCount} bookings starting within 15 minutes. Sending notifications...`);
      for (const row of upcomingRes.rows) {
        // Set reminder_sent to true in database
        await db.query(`UPDATE bookings SET reminder_sent = true WHERE id = $1`, [row.id]);

        // Log notification to activity_log and notifications tables
        const timeStr = new Date(row.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const reminderMsg = `Reminder: Your booking for "${row.resource_name}" is starting at ${timeStr}.`;
        await logActivity(row.user_id, 'BOOKING_REMINDER', reminderMsg, 'bookings', row.id, io);
      }
    }
  } catch (err) {
    console.error('[checkUpcomingBookings error]', err.message);
  }
}

// Background Check for Overdue Allocations
async function checkOverdueAllocations() {
  try {
    const overdueRes = await db.query(
      `SELECT al.id, al.asset_id, al.user_id, al.expected_return_date, a.name AS asset_name, a.asset_tag, u.name AS user_name
       FROM allocations al
       JOIN assets a ON al.asset_id = a.id
       JOIN users u ON al.user_id = u.id
       WHERE al.status = 'active' AND al.expected_return_date < CURRENT_DATE`
    );

    if (overdueRes.rowCount > 0) {
      console.log(`[Overdue Check] Found ${overdueRes.rowCount} overdue allocations. Flagging...`);
      for (const row of overdueRes.rows) {
        // Update status to 'overdue' in allocations table
        await db.query(`UPDATE allocations SET status = 'overdue' WHERE id = $1`, [row.id]);
        
        // Log activity to activity_log and notifications tables
        const detailsText = `Asset "${row.asset_name}" (${row.asset_tag}) checked out by ${row.user_name} is OVERDUE (expected: ${new Date(row.expected_return_date).toLocaleDateString()}).`;
        await logActivity(row.user_id, 'ALLOCATION_OVERDUE_FLAG', detailsText, 'allocations', row.id, io);
      }
    }
  } catch (err) {
    console.error('[checkOverdueAllocations error]', err.message);
  }
}

// Background Check for Bookings status transitions (Upcoming -> Ongoing -> Completed)
async function updateBookingStatuses() {
  try {
    // 1. Upcoming -> Ongoing (if current time has reached start_time)
    await db.query(
      `UPDATE bookings 
       SET status = 'Ongoing'::booking_status 
       WHERE status = 'Upcoming' 
         AND start_time <= NOW()`
    );

    // 2. Ongoing/Upcoming -> Completed (if current time has reached end_time)
    await db.query(
      `UPDATE bookings 
       SET status = 'Completed'::booking_status 
       WHERE status IN ('Upcoming', 'Ongoing') 
         AND end_time <= NOW()`
    );
  } catch (err) {
    console.error('[updateBookingStatuses error]', err.message);
  }
}

async function startServer() {
  try {
    console.log('Booting AssetFlow server configurations...');
    // Initialize DB schema & seeds
    await initializeDatabase();
    
    server.listen(PORT, () => {
      console.log(`================================================`);
      console.log(`AssetFlow Server running on port ${PORT}`);
      console.log(`Database is connected and schema verified.`);
      console.log(`================================================`);
      
      // Run once immediately on start
      checkOverdueAllocations();
      updateBookingStatuses();
      checkUpcomingBookings();

      // Schedule to run overdue checker every 2 minutes
      setInterval(checkOverdueAllocations, 2 * 60 * 1000);

      // Schedule to run booking status update and reminder check every 1 minute
      setInterval(async () => {
        await checkUpcomingBookings();
        await updateBookingStatuses();
      }, 1 * 60 * 1000);
    });
  } catch (err) {
    console.error('FAILED to start AssetFlow server:', err.message);
    // Listen on PORT anyway so that the process doesn't enter crash-loops
    // and developers can check error outputs via API
    server.listen(PORT, () => {
      console.log(`Server started in emergency fail-safe mode on port ${PORT}.`);
    });
  }
}

startServer();
