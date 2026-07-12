const express = require('express');
const db      = require('../db/db');
const router  = express.Router();

// POST /api/maintenance-requests — create maintenance request
router.post('/', async (req, res) => {
  const { asset_id, reported_by, description, priority } = req.body;

  if (!asset_id || !description) {
    return res.status(400).json({ error: 'asset_id and description are required fields.' });
  }

  try {
    // Verify asset exists
    const assetCheck = await db.query('SELECT name FROM assets WHERE id = $1', [asset_id]);
    if (assetCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Asset not found.' });
    }
    const asset = assetCheck.rows[0];

    const insertQuery = `
      INSERT INTO maintenance_requests (asset_id, reported_by, description, priority, status)
      VALUES ($1, $2, $3, COALESCE($4, 'medium'), 'Pending')
      RETURNING *;
    `;
    const result = await db.query(insertQuery, [
      asset_id,
      reported_by || null,
      description.trim(),
      priority
    ]);
    const request = result.rows[0];

    // Log action to activity_log
    const logDetails = `Raised maintenance request #${request.id} for "${asset.name}" (Priority: ${request.priority}).`;
    await db.query(
      `INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'MAINTENANCE_CREATE', 'maintenance_requests', $2, $3)`,
      [reported_by || 1, request.id, logDetails]
    );

    // Emit Socket notification
    const io = req.app.get('socketio');
    if (io) {
      io.emit('activity', {
        action: 'MAINTENANCE_CREATE',
        details: logDetails,
        user_name: 'AssetFlow Administrator'
      });
      io.emit('notification', {
        message: `Maintenance raised for "${asset.name}"`,
        time: new Date()
      });
    }

    return res.status(201).json({
      message: 'Maintenance request created successfully.',
      request
    });
  } catch (err) {
    console.error('[POST /api/maintenance-requests]', err.message);
    return res.status(500).json({ error: 'Server error creating maintenance request.', details: err.message });
  }
});

// PATCH /api/maintenance-requests/:id/status — update status through workflow
router.patch('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, cost } = req.body; // optional cost can be updated at same time

  const validStatuses = ['Pending', 'Approved', 'Rejected', 'Technician Assigned', 'In Progress', 'Resolved'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Check if request exists
    const checkQuery = `
      SELECT mr.*, a.name AS asset_name
      FROM maintenance_requests mr
      JOIN assets a ON mr.asset_id = a.id
      WHERE mr.id = $1
    `;
    const checkRes = await client.query(checkQuery, [id]);
    if (checkRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Maintenance request not found.' });
    }
    const request = checkRes.rows[0];

    // 2. Update status and dates
    let completedDateUpdate = null;
    if (status === 'Resolved') {
      completedDateUpdate = new Date();
    }

    const updateQuery = `
      UPDATE maintenance_requests
      SET 
        status = $1, 
        completed_date = COALESCE($2, completed_date),
        cost = COALESCE($3, cost)
      WHERE id = $4
      RETURNING *;
    `;
    const result = await client.query(updateQuery, [
      status,
      completedDateUpdate,
      cost || null,
      id
    ]);
    const updatedRequest = result.rows[0];

    // 3. Automatically transition asset status
    let assetStatusUpdate = null;
    if (status === 'Approved') {
      assetStatusUpdate = 'Under Maintenance';
    } else if (status === 'Resolved') {
      assetStatusUpdate = 'Available';
    }

    if (assetStatusUpdate) {
      await client.query(
        `UPDATE assets SET status = $1::asset_status WHERE id = $2`,
        [assetStatusUpdate, request.asset_id]
      );
    }

    // 4. Log the state change
    const logDetails = `Maintenance request #${id} updated to status "${status}".` + (assetStatusUpdate ? ` Synced asset to "${assetStatusUpdate}".` : '');
    await client.query(
      `INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'MAINTENANCE_STATUS_UPDATE', 'maintenance_requests', $2, $3)`,
      [request.reported_by || 1, id, logDetails]
    );

    await client.query('COMMIT');

    // Emit Socket notification
    const io = req.app.get('socketio');
    if (io) {
      io.emit('activity', {
        action: 'MAINTENANCE_STATUS_UPDATE',
        details: logDetails,
        user_name: 'AssetFlow Administrator'
      });
      io.emit('notification', {
        message: `Maintenance request #${id} updated to ${status}`,
        time: new Date()
      });
    }

    return res.status(200).json({
      message: 'Maintenance request status updated successfully.',
      request: updatedRequest,
      asset_synced_status: assetStatusUpdate
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`[PATCH /api/maintenance-requests/${id}/status]`, err.message);
    return res.status(500).json({ error: 'Server error updating status.', details: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
