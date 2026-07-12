const express = require('express');
const db      = require('../db/db');
const router  = express.Router();

// GET /api/resources — list all resources for the dropdown
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, type, location, capacity, is_active
       FROM resources
       ORDER BY name ASC`
    );
    return res.json({ resources: result.rows });
  } catch (err) {
    console.error('[GET /api/resources]', err.message);
    return res.status(500).json({ error: 'Failed to fetch resources.' });
  }
});

module.exports = router;
