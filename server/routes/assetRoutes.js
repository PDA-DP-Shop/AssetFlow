const express = require('express');
const db      = require('../db/db');
const router  = express.Router();

// ─── POST /api/assets ─────────────────────────────────────────────────────────
// Register a new asset. Tag auto-generation is handled by PostgreSQL trigger.
router.post('/', async (req, res) => {
  const {
    name,
    serial_number,
    category_id,
    department_id,
    acquisition_date,
    acquisition_cost,
    condition,
    location,
    photo_url,
    is_bookable,
    status
  } = req.body;

  if (!name || !serial_number || !category_id) {
    return res.status(400).json({ error: 'name, serial_number, and category_id are required fields.' });
  }

  try {
    // Check if serial number already exists
    const duplicate = await db.query('SELECT id FROM assets WHERE serial_number = $1', [serial_number]);
    if (duplicate.rowCount > 0) {
      return res.status(409).json({ error: 'An asset with this serial number is already registered.' });
    }

    const queryText = `
      INSERT INTO assets (
        name,
        serial_number,
        category_id,
        department_id,
        acquisition_date,
        acquisition_cost,
        condition,
        location,
        photo_url,
        is_bookable,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11, 'Available'::asset_status))
      RETURNING *;
    `;

    const values = [
      name.trim(),
      serial_number.trim(),
      category_id,
      department_id || null,
      acquisition_date || new Date(),
      acquisition_cost || null,
      condition || 'New',
      location || null,
      photo_url || null,
      is_bookable || false,
      status || 'Available'
    ];

    const result = await db.query(queryText, values);
    const asset = result.rows[0];

    // Log the activity
    await db.query(
      `INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'ASSET_REGISTER', 'assets', $2, $3)`,
      [1, asset.id, `Registered new asset: ${asset.name} (${asset.asset_tag})`]
    );

    // Emit socket notification
    const io = req.app.get('socketio');
    if (io) {
      io.emit('activity', {
        action: 'ASSET_REGISTER',
        details: `Registered new asset: ${asset.name} (${asset.asset_tag})`,
        user_name: 'AssetFlow Administrator'
      });
      io.emit('notification', {
        message: `New asset registered: ${asset.name} (${asset.asset_tag})`,
        time: new Date()
      });
    }

    return res.status(201).json({
      message: 'Asset registered successfully.',
      asset
    });
  } catch (err) {
    console.error('[POST /api/assets]', err.message);
    return res.status(500).json({ error: 'Server error during asset registration.', details: err.message });
  }
});

// ─── GET /api/assets ──────────────────────────────────────────────────────────
// List all assets, supporting search, category, status, department, and location filters.
router.get('/', async (req, res) => {
  const { search, category, status, department, location } = req.query;

  try {
    let queryText = `
      SELECT 
        a.*, 
        c.name AS category_name, 
        d.name AS department_name
      FROM assets a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN departments d ON a.department_id = d.id
      WHERE 1=1
    `;
    const queryParams = [];

    if (category) {
      queryParams.push(category);
      queryText += ` AND a.category_id = $${queryParams.length}`;
    }

    if (status) {
      queryParams.push(status);
      queryText += ` AND a.status::text = $${queryParams.length}`;
    }

    if (department) {
      queryParams.push(department);
      queryText += ` AND a.department_id = $${queryParams.length}`;
    }

    if (location) {
      queryParams.push(`%${location.trim()}%`);
      queryText += ` AND a.location ILIKE $${queryParams.length}`;
    }

    if (search) {
      queryParams.push(`%${search.trim()}%`);
      queryText += ` AND (
        a.name ILIKE $${queryParams.length} OR 
        a.serial_number ILIKE $${queryParams.length} OR 
        a.asset_tag ILIKE $${queryParams.length}
      )`;
    }

    queryText += ` ORDER BY a.id DESC`;

    const result = await db.query(queryText, queryParams);
    return res.status(200).json({
      count: result.rowCount,
      assets: result.rows
    });
  } catch (err) {
    console.error('[GET /api/assets]', err.message);
    return res.status(500).json({ error: 'Server error listing assets.', details: err.message });
  }
});

// ─── GET /api/assets/:id ──────────────────────────────────────────────────────
// Fetch a single asset with full allocation and maintenance history.
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Fetch asset details
    const assetQuery = `
      SELECT 
        a.*, 
        c.name AS category_name, 
        d.name AS department_name
      FROM assets a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN departments d ON a.department_id = d.id
      WHERE a.id = $1
    `;
    const assetRes = await db.query(assetQuery, [id]);

    if (assetRes.rowCount === 0) {
      return res.status(404).json({ error: 'Asset not found.' });
    }

    const asset = assetRes.rows[0];

    // 2. Fetch allocation history
    const allocationQuery = `
      SELECT 
        al.id,
        al.user_id,
        al.allocated_at, 
        al.returned_at, 
        al.notes, 
        al.status,
        u.name AS user_name, 
        u.email AS user_email
      FROM allocations al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.asset_id = $1
      ORDER BY al.allocated_at DESC
    `;
    const allocationRes = await db.query(allocationQuery, [id]);

    // 3. Fetch maintenance requests history
    const maintenanceQuery = `
      SELECT 
        mr.id, 
        mr.description, 
        mr.priority, 
        mr.status, 
        mr.cost, 
        mr.scheduled_date, 
        mr.completed_date, 
        mr.created_at,
        u.name AS reported_by_name
      FROM maintenance_requests mr
      LEFT JOIN users u ON mr.reported_by = u.id
      WHERE mr.asset_id = $1
      ORDER BY mr.created_at DESC
    `;
    const maintenanceRes = await db.query(maintenanceQuery, [id]);

    // Combine results
    return res.status(200).json({
      asset,
      allocation_history: allocationRes.rows,
      maintenance_history: maintenanceRes.rows
    });
  } catch (err) {
    console.error(`[GET /api/assets/${id}]`, err.message);
    return res.status(500).json({ error: 'Server error retrieving asset details.', details: err.message });
  }
});

module.exports = router;
