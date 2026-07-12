const express = require('express');
const db      = require('../db/db');
const router  = express.Router();

// ─── POST /api/bookings ───────────────────────────────────────────────────────
// Create a new booking. Blocks double bookings on overlapping slots but allows back-to-back.
router.post('/', async (req, res) => {
  const { resource_id, booked_by, start_time, end_time, purpose } = req.body;

  if (!resource_id || !booked_by || !start_time || !end_time) {
    return res.status(400).json({ error: 'resource_id, booked_by, start_time, and end_time are required fields.' });
  }

  const start = new Date(start_time);
  const end = new Date(end_time);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return res.status(400).json({ error: 'Invalid start_time or end_time date string format.' });
  }

  if (start >= end) {
    return res.status(400).json({ error: 'Booking end_time must be strictly after start_time.' });
  }

  try {
    // 1. Verify resource exists
    const resourceCheck = await db.query('SELECT name FROM resources WHERE id = $1', [resource_id]);
    if (resourceCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Target resource does not exist.' });
    }
    const resourceName = resourceCheck.rows[0].name;

    // 2. Verify user exists
    const userCheck = await db.query('SELECT name FROM users WHERE id = $1', [booked_by]);
    if (userCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Booking employee user account does not exist.' });
    }

    // 3. Query for overlaps on Upcoming/Ongoing bookings
    // Formula: (existing.start_time < new.end_time) AND (existing.end_time > new.start_time)
    const overlapQuery = `
      SELECT 
        b.id, 
        b.start_time, 
        b.end_time, 
        u.name AS booked_by_name, 
        u.email AS booked_by_email
      FROM bookings b
      JOIN users u ON b.booked_by = u.id
      WHERE b.resource_id = $1
        AND b.status IN ('Upcoming', 'Ongoing')
        AND b.start_time < $3
        AND b.end_time > $2
      LIMIT 1;
    `;

    const overlapResult = await db.query(overlapQuery, [resource_id, start, end]);

    if (overlapResult.rowCount > 0) {
      const conflict = overlapResult.rows[0];
      const conflictStart = new Date(conflict.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const conflictEnd = new Date(conflict.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      return res.status(409).json({
        error: `Booking conflict: "${resourceName}" is already reserved by ${conflict.booked_by_name} (${conflict.booked_by_email}) from ${conflictStart} to ${conflictEnd}.`
      });
    }

    // 4. Create the booking
    const insertQuery = `
      INSERT INTO bookings (
        resource_id,
        booked_by,
        start_time,
        end_time,
        purpose,
        status
      ) VALUES ($1, $2, $3, $4, $5, 'Upcoming')
      RETURNING *;
    `;

    const result = await db.query(insertQuery, [resource_id, booked_by, start, end, purpose || null]);
    const booking = result.rows[0];
    const userName = userCheck.rows[0].name;

    // Log the activity
    await db.query(
      `INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'BOOKING_CREATE', 'bookings', $2, $3)`,
      [booked_by, booking.id, `Booked "${resourceName}" for: "${purpose || 'Reserved Slot'}"`]
    );

    // Emit socket notification
    const io = req.app.get('socketio');
    if (io) {
      io.emit('activity', {
        action: 'BOOKING_CREATE',
        details: `Booked "${resourceName}" for: "${purpose || 'Reserved Slot'}"`,
        user_name: userName
      });
      io.emit('notification', {
        message: `${userName} booked "${resourceName}"`,
        time: new Date()
      });
      io.emit('booking:created', {
        booking,
        resource_id: Number(resource_id)
      });
    }

    return res.status(201).json({
      message: 'Booking created successfully.',
      booking
    });
  } catch (err) {
    console.error('[POST /api/bookings]', err.message);
    return res.status(500).json({ error: 'Server error during booking creation.', details: err.message });
  }
});

// ─── GET /api/bookings/:resourceId ────────────────────────────────────────────
// Fetch the calendar (booking schedule) for a resource.
router.get('/:resourceId', async (req, res) => {
  const { resourceId } = req.params;

  try {
    // Verify resource
    const resourceCheck = await db.query('SELECT id, name FROM resources WHERE id = $1', [resourceId]);
    if (resourceCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Resource not found.' });
    }

    const queryText = `
      SELECT 
        b.id,
        b.start_time,
        b.end_time,
        b.purpose,
        b.status,
        b.created_at,
        u.name AS booked_by_name,
        u.email AS booked_by_email
      FROM bookings b
      JOIN users u ON b.booked_by = u.id
      WHERE b.resource_id = $1
      ORDER BY b.start_time ASC
    `;

    const result = await db.query(queryText, [resourceId]);
    return res.status(200).json({
      resource: resourceCheck.rows[0],
      count: result.rowCount,
      schedule: result.rows
    });
  } catch (err) {
    console.error(`[GET /api/bookings/${resourceId}]`, err.message);
    return res.status(500).json({ error: 'Server error fetching resource calendar.', details: err.message });
  }
});

// ─── PATCH /api/bookings/:id/cancel ───────────────────────────────────────────
router.patch('/:id/cancel', async (req, res) => {
  const { id } = req.params;

  try {
    const bookingCheck = await db.query(
      `SELECT b.*, r.name AS resource_name, u.name AS user_name
       FROM bookings b
       JOIN resources r ON b.resource_id = r.id
       JOIN users u ON b.booked_by = u.id
       WHERE b.id = $1`,
      [id]
    );

    if (bookingCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    const booking = bookingCheck.rows[0];
    if (booking.status === 'Cancelled') {
      return res.status(400).json({ error: 'Booking is already cancelled.' });
    }

    // Cancel booking in DB
    const cancelRes = await db.query(
      `UPDATE bookings
       SET status = 'Cancelled'
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    const updatedBooking = cancelRes.rows[0];

    // Log the cancellation
    await db.query(
      `INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'BOOKING_CANCEL', 'bookings', $2, $3)`,
      [booking.booked_by, id, `Cancelled booking for "${booking.resource_name}"`]
    );

    // Emit socket notifications
    const io = req.app.get('socketio');
    if (io) {
      io.emit('activity', {
        action: 'BOOKING_CANCEL',
        details: `Cancelled booking for "${booking.resource_name}"`,
        user_name: booking.user_name
      });
      io.emit('notification', {
        message: `${booking.user_name} cancelled booking for "${booking.resource_name}"`,
        time: new Date()
      });
      io.emit('booking:cancelled', {
        booking_id: Number(id),
        resource_id: booking.resource_id
      });
    }

    return res.status(200).json({
      message: 'Booking cancelled successfully.',
      booking: updatedBooking
    });
  } catch (err) {
    console.error(`[PATCH /api/bookings/${id}/cancel]`, err.message);
    return res.status(500).json({ error: 'Server error during booking cancellation.', details: err.message });
  }
});

module.exports = router;
