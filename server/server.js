const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config();

const db = require('./db/db');
const initializeDatabase = require('./db/init');

// Route imports
const authRoutes = require('./routes/authRoutes');
const assetRoutes = require('./routes/assetRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const auditRoutes = require('./routes/auditRoutes');

const app = express();
const server = http.createServer(app);

// Enable Socket.io server
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

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
app.use('/api/auth', authRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api', auditRoutes);

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
