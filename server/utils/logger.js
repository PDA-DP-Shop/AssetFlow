const db = require('../db/db');

/**
 * Global helper to log operational actions to activity_log and notifications tables.
 * Emits Socket notifications in real-time.
 */
async function logActivity(userId, action, details, entityType = 'system', entityId = null, io = null) {
  try {
    let notifType = 'general';
    if (action.includes('ALLOCATE') || action.includes('TRANSFER')) notifType = 'assignment';
    else if (action.includes('AUDIT')) notifType = 'audit';
    else if (action.includes('MAINTENANCE')) notifType = 'alert';
    else if (action.includes('BOOKING')) notifType = 'booking';

    // 1. Insert into activity_log
    const logQuery = `
      INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    await db.query(logQuery, [
      userId || null,
      action,
      entityType,
      entityId || null,
      details
    ]);

    // 2. Insert into notifications
    const notifQuery = `
      INSERT INTO notifications (user_id, message, type, is_read)
      VALUES ($1, $2, $3, false)
      RETURNING *;
    `;
    await db.query(notifQuery, [
      userId || 1,
      details,
      notifType
    ]);

    // 3. Emit socket events if io is present
    if (io) {
      io.emit('activity', {
        action,
        details,
        user_name: 'AssetFlow Sentinel',
        timestamp: new Date().toLocaleTimeString()
      });

      io.emit('notification', {
        message: details,
        type: notifType,
        time: new Date()
      });

      io.emit('notification:new', {
        message: details,
        type: notifType,
        time: new Date()
      });
    }

    console.log(`[logActivity] Logged action: ${action}`);
  } catch (err) {
    console.error('[logActivity Error]', err.message);
  }
}

module.exports = { logActivity };
