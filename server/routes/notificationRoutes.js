const express = require('express');
const db      = require('../db/db');
const router  = express.Router();

// GET /api/notifications
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM notifications 
       ORDER BY created_at DESC 
       LIMIT 50`
    );
    return res.json({ notifications: result.rows });
  } catch (err) {
    console.error('[GET /api/notifications]', err.message);
    return res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

// POST /api/notifications/read-all
router.post('/read-all', async (req, res) => {
  try {
    await db.query(`UPDATE notifications SET is_read = true`);
    return res.json({ success: true });
  } catch (err) {
    console.error('[POST /api/notifications/read-all]', err.message);
    return res.status(500).json({ error: 'Failed to mark notifications as read.' });
  }
});

module.exports = router;
