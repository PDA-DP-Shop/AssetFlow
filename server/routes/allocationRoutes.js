const express = require('express');
const db      = require('../db/db');
const router  = express.Router();

// POST /api/allocations — allocate an asset
router.post('/', async (req, res) => {
  const { asset_id, user_id, notes, expected_return_date } = req.body;

  if (!asset_id || !user_id) {
    return res.status(400).json({ error: 'asset_id and user_id are required fields.' });
  }

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Check if asset exists and check its status
    const assetCheck = await client.query('SELECT name, status FROM assets WHERE id = $1', [asset_id]);
    if (assetCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Asset not found.' });
    }

    const asset = assetCheck.rows[0];
    if (asset.status === 'Allocated') {
      // Find the name of the user currently holding this asset
      const holderCheck = await client.query(
        `SELECT u.name 
         FROM allocations al
         JOIN users u ON al.user_id = u.id
         WHERE al.asset_id = $1 AND al.status = 'active'
         ORDER BY al.allocated_at DESC
         LIMIT 1`,
        [asset_id]
      );
      const currentHolderName = holderCheck.rowCount > 0 ? holderCheck.rows[0].name : 'Unknown Holder';
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'already_allocated',
        currentHolder: currentHolderName
      });
    }

    // 2. Check if target user exists and get their department
    const userCheck = await client.query('SELECT name, department_id FROM users WHERE id = $1', [user_id]);
    if (userCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Target employee user account not found.' });
    }
    const targetUser = userCheck.rows[0];

    // 3. Create allocation entry
    const insertQuery = `
      INSERT INTO allocations (asset_id, user_id, notes, expected_return_date, status)
      VALUES ($1, $2, $3, $4, 'active')
      RETURNING *;
    `;
    const allocationRes = await client.query(insertQuery, [
      asset_id,
      user_id,
      notes || null,
      expected_return_date || null
    ]);
    const allocation = allocationRes.rows[0];

    // 4. Update asset status to 'Allocated' and align department
    await client.query(
      `UPDATE assets 
       SET status = 'Allocated'::asset_status, department_id = COALESCE($1, department_id)
       WHERE id = $2`,
      [targetUser.department_id, asset_id]
    );

    // 5. Write activity log
    const logDetails = `Allocated "${asset.name}" to ${targetUser.name}.` + (expected_return_date ? ` Expected return: ${expected_return_date}` : '');
    await client.query(
      `INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'ASSET_ALLOCATE', 'allocations', $2, $3)`,
      [user_id, allocation.id, logDetails]
    );

    await client.query('COMMIT');

    // Emit Socket notifications
    const io = req.app.get('socketio');
    if (io) {
      io.emit('activity', {
        action: 'ASSET_ALLOCATE',
        details: logDetails,
        user_name: 'AssetFlow Administrator'
      });
      io.emit('notification', {
        message: `Asset allocated to ${targetUser.name}`,
        time: new Date()
      });
    }

    return res.status(201).json({
      message: 'Asset allocated successfully.',
      allocation
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[POST /api/allocations]', err.message);
    return res.status(500).json({ error: 'Server error during allocation.', details: err.message });
  } finally {
    client.release();
  }
});

// POST /api/allocations/:id/return — mark an allocation returned
router.post('/:id/return', async (req, res) => {
  const { id } = req.params;
  const { return_notes, condition } = req.body;

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Check if active allocation exists
    const allocCheck = await client.query(
      `SELECT al.*, a.name AS asset_name, u.name AS user_name
       FROM allocations al
       JOIN assets a ON al.asset_id = a.id
       JOIN users u ON al.user_id = u.id
       WHERE al.id = $1 AND al.status = 'active'`,
      [id]
    );
    if (allocCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Active allocation record not found.' });
    }
    const allocation = allocCheck.rows[0];

    // 2. Mark allocation returned
    const returnQuery = `
      UPDATE allocations
      SET returned_at = CURRENT_TIMESTAMP, status = 'returned', return_notes = $1
      WHERE id = $2
      RETURNING *;
    `;
    const updatedAllocRes = await client.query(returnQuery, [return_notes || null, id]);

    // 3. Set asset status back to 'Available' and optionally update condition
    const updateAssetQuery = `
      UPDATE assets
      SET status = 'Available'::asset_status, condition = COALESCE($1, condition)
      WHERE id = $2;
    `;
    await client.query(updateAssetQuery, [condition || null, allocation.asset_id]);

    // 4. Log the action
    const logDetails = `Returned asset "${allocation.asset_name}" from ${allocation.user_name}. Check-in note: "${return_notes || 'None'}"`;
    await client.query(
      `INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'ASSET_RETURN', 'allocations', $2, $3)`,
      [allocation.user_id, id, logDetails]
    );

    await client.query('COMMIT');

    // Emit Socket notifications
    const io = req.app.get('socketio');
    if (io) {
      io.emit('activity', {
        action: 'ASSET_RETURN',
        details: logDetails,
        user_name: 'AssetFlow Administrator'
      });
      io.emit('notification', {
        message: `Asset returned from ${allocation.user_name}`,
        time: new Date()
      });
    }

    return res.status(200).json({
      message: 'Asset marked as returned successfully.',
      allocation: updatedAllocRes.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`[POST /api/allocations/${id}/return]`, err.message);
    return res.status(500).json({ error: 'Server error during check-in return.', details: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
