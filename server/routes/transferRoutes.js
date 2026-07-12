const express = require('express');
const db      = require('../db/db');
const router  = express.Router();

// GET /api/transfers — fetch all transfer requests
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        t.id,
        t.asset_id,
        t.from_department_id,
        t.to_department_id,
        t.from_user_id,
        t.to_user_id,
        t.reason,
        t.request_date,
        t.status,
        a.name AS asset_name,
        a.asset_tag,
        u_from.name AS from_user_name,
        u_to.name AS to_user_name,
        d_from.name AS from_department_name,
        d_to.name AS to_department_name
      FROM transfers t
      JOIN assets a ON t.asset_id = a.id
      LEFT JOIN users u_from ON t.from_user_id = u_from.id
      LEFT JOIN users u_to ON t.to_user_id = u_to.id
      LEFT JOIN departments d_from ON t.from_department_id = d_from.id
      LEFT JOIN departments d_to ON t.to_department_id = d_to.id
      ORDER BY t.request_date DESC;
    `;
    const result = await db.query(query);
    return res.json({ transfers: result.rows });
  } catch (err) {
    console.error('[GET /api/transfers]', err.message);
    return res.status(500).json({ error: 'Failed to fetch transfer requests.' });
  }
});

// POST /api/transfers — submit a transfer request
router.post('/', async (req, res) => {
  const { asset_id, from_user_id, to_user_id, reason } = req.body;

  if (!asset_id || !to_user_id) {
    return res.status(400).json({ error: 'asset_id and to_user_id are required fields.' });
  }

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Verify asset exists
    const assetCheck = await client.query('SELECT name, status FROM assets WHERE id = $1', [asset_id]);
    if (assetCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Asset not found.' });
    }
    const asset = assetCheck.rows[0];

    // 2. Resolve active holder for from_user_id if not explicitly provided
    let finalFromUserId = from_user_id;
    if (!finalFromUserId) {
      const activeAlloc = await client.query(
        `SELECT user_id FROM allocations WHERE asset_id = $1 AND status IN ('active', 'overdue') ORDER BY allocated_at DESC LIMIT 1`,
        [asset_id]
      );
      if (activeAlloc.rowCount > 0) {
        finalFromUserId = activeAlloc.rows[0].user_id;
      }
    }

    if (!finalFromUserId) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Asset has no active current holder to transfer from.' });
    }

    // 3. Resolve departments for from_user and to_user
    const fromUserCheck = await client.query('SELECT name, department_id FROM users WHERE id = $1', [finalFromUserId]);
    const toUserCheck = await client.query('SELECT name, department_id FROM users WHERE id = $1', [to_user_id]);

    if (fromUserCheck.rowCount === 0 || toUserCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Origin or target employee user account not found.' });
    }

    const fromUser = fromUserCheck.rows[0];
    const toUser = toUserCheck.rows[0];

    const insertQuery = `
      INSERT INTO transfers (
        asset_id, 
        from_user_id, 
        to_user_id, 
        from_department_id, 
        to_department_id, 
        reason, 
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING *;
    `;
    const result = await client.query(insertQuery, [
      asset_id,
      finalFromUserId,
      to_user_id,
      fromUser.department_id,
      toUser.department_id,
      reason || null
    ]);
    const transfer = result.rows[0];

    // 4. Log the action
    const logDetails = `Submitted transfer request for "${asset.name}" from ${fromUser.name} to ${toUser.name}.`;
    await client.query(
      `INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'TRANSFER_REQUEST', 'transfers', $2, $3)`,
      [finalFromUserId, transfer.id, logDetails]
    );

    await client.query('COMMIT');

    // Emit Socket notification
    const io = req.app.get('socketio');
    if (io) {
      io.emit('activity', {
        action: 'TRANSFER_REQUEST',
        details: logDetails,
        user_name: 'AssetFlow Administrator'
      });
      io.emit('notification', {
        message: `Transfer requested for "${asset.name}"`,
        time: new Date()
      });
    }

    return res.status(201).json({
      message: 'Transfer request submitted successfully.',
      transfer
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[POST /api/transfers]', err.message);
    return res.status(500).json({ error: 'Server error submitting transfer request.', details: err.message });
  } finally {
    client.release();
  }
});

// POST /api/transfers/:id/approve — approve transfer request
router.post('/:id/approve', async (req, res) => {
  const { id } = req.params;

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Get transfer details
    const transCheck = await client.query(
      `SELECT t.*, a.name AS asset_name, u_to.name AS to_user_name, u_to.department_id AS to_user_dept
       FROM transfers t
       JOIN assets a ON t.asset_id = a.id
       JOIN users u_to ON t.to_user_id = u_to.id
       WHERE t.id = $1 AND t.status = 'pending'`,
      [id]
    );

    if (transCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Pending transfer request not found.' });
    }
    const transfer = transCheck.rows[0];

    // 2. Mark transfer as approved
    await client.query(
      `UPDATE transfers 
       SET status = 'approved', transfer_date = CURRENT_TIMESTAMP, approved_by = $1
       WHERE id = $2`,
      [1, id] // default to user 1 as approver
    );

    // 3. Mark previous active allocations as returned
    await client.query(
      `UPDATE allocations        SET returned_at = CURRENT_TIMESTAMP, status = 'returned', return_notes = 'Transferred to another employee'
        WHERE asset_id = $1 AND status IN ('active', 'overdue')`,
      [transfer.asset_id]
    );

    // 4. Create new active allocation for target user
    await client.query(
      `INSERT INTO allocations (asset_id, user_id, notes, status)
       VALUES ($1, $2, $3, 'active')`,
      [transfer.asset_id, transfer.to_user_id, `Transferred from request #${id}. Reason: ${transfer.reason || 'None'}`]
    );

    // 5. Update asset department and status
    await client.query(
      `UPDATE assets 
       SET status = 'Allocated'::asset_status, department_id = $1
       WHERE id = $2`,
      [transfer.to_user_dept, transfer.asset_id]
    );

    // 6. Log activity
    const logDetails = `Approved transfer of "${transfer.asset_name}" to ${transfer.to_user_name}.`;
    await client.query(
      `INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'TRANSFER_APPROVE', 'transfers', $2, $3)`,
      [1, id, logDetails]
    );

    await client.query('COMMIT');

    // Emit Socket notification
    const io = req.app.get('socketio');
    if (io) {
      io.emit('activity', {
        action: 'TRANSFER_APPROVE',
        details: logDetails,
        user_name: 'AssetFlow Administrator'
      });
      io.emit('notification', {
        message: `Transfer approved for "${transfer.asset_name}"`,
        time: new Date()
      });
    }

    return res.json({ message: 'Transfer request approved successfully.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`[POST /api/transfers/${id}/approve]`, err.message);
    return res.status(500).json({ error: 'Server error approving transfer request.' });
  } finally {
    client.release();
  }
});

// POST /api/transfers/:id/reject — reject transfer request
router.post('/:id/reject', async (req, res) => {
  const { id } = req.params;

  try {
    const check = await db.query('SELECT id, asset_id FROM transfers WHERE id = $1 AND status = $2', [id, 'pending']);
    if (check.rowCount === 0) {
      return res.status(404).json({ error: 'Pending transfer request not found.' });
    }

    await db.query("UPDATE transfers SET status = 'rejected' WHERE id = $1", [id]);

    return res.json({ message: 'Transfer request rejected successfully.' });
  } catch (err) {
    console.error(`[POST /api/transfers/${id}/reject]`, err.message);
    return res.status(500).json({ error: 'Server error rejecting transfer request.' });
  }
});

module.exports = router;
