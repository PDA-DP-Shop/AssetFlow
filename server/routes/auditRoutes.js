const express = require('express');
const db      = require('../db/db');
const router  = express.Router();

// ─── POST /api/audits ─────────────────────────────────────────────────────────
// Create audit cycle, map auditors, and automatically generate audit items for matching scope.
router.post('/audits', async (req, res) => {
  const { name, scope_department_id, scope_location, start_date, end_date, auditor_ids } = req.body;

  if (!name || !start_date || !end_date) {
    return res.status(400).json({ error: 'name, start_date, and end_date are required fields.' });
  }

  // Get client from pool for Transaction
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Create audit cycle
    const cycleQuery = `
      INSERT INTO audit_cycles (name, scope_department_id, scope_location, start_date, end_date, status)
      VALUES ($1, $2, $3, $4, $5, 'Open')
      RETURNING *;
    `;
    const cycleRes = await client.query(cycleQuery, [
      name.trim(),
      scope_department_id || null,
      scope_location || null,
      start_date,
      end_date
    ]);
    const cycle = cycleRes.rows[0];

    // 2. Assign auditors if provided
    if (Array.isArray(auditor_ids) && auditor_ids.length > 0) {
      const auditorInsert = `
        INSERT INTO audit_auditors (audit_cycle_id, user_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING;
      `;
      for (const auditorId of auditor_ids) {
        await client.query(auditorInsert, [cycle.id, auditorId]);
      }
    }

    // 3. Select assets matching the scope to generate audit_items
    let assetQuery = `
      SELECT id, location 
      FROM assets 
      WHERE status NOT IN ('Retired', 'Disposed')
    `;
    const assetParams = [];

    if (scope_department_id) {
      assetParams.push(scope_department_id);
      assetQuery += ` AND department_id = $${assetParams.length}`;
    }

    if (scope_location) {
      assetParams.push(scope_location);
      assetQuery += ` AND location = $${assetParams.length}`;
    }

    const assetsRes = await client.query(assetQuery, assetParams);
    const matchingAssets = assetsRes.rows;

    // 4. Insert audit items
    if (matchingAssets.length > 0) {
      const itemInsert = `
        INSERT INTO audit_items (audit_cycle_id, asset_id, expected_location, status)
        VALUES ($1, $2, $3, 'Pending');
      `;
      for (const asset of matchingAssets) {
        await client.query(itemInsert, [cycle.id, asset.id, asset.location]);
      }
    }

    await client.query('COMMIT');

    return res.status(201).json({
      message: 'Audit cycle successfully created and initialized.',
      cycle,
      assigned_auditors_count: auditor_ids ? auditor_ids.length : 0,
      generated_items_count: matchingAssets.length
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[POST /api/audits]', err.message);
    return res.status(500).json({ error: 'Server error creating audit cycle.', details: err.message });
  } finally {
    client.release();
  }
});

// GET /api/audits — List all audit cycles
router.get('/audits', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT ac.*, d.name AS department_name
       FROM audit_cycles ac
       LEFT JOIN departments d ON ac.scope_department_id = d.id
       ORDER BY ac.created_at DESC`
    );
    return res.json({ cycles: result.rows });
  } catch (err) {
    console.error('[GET /api/audits]', err.message);
    return res.status(500).json({ error: 'Failed to fetch audit cycles.' });
  }
});

// ─── GET /api/audits/:id ──────────────────────────────────────────────────────
// Fetch details of a cycle, list of assigned auditors, and all generated audit items.
router.get('/audits/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Fetch Cycle Details
    const cycleQuery = `
      SELECT ac.*, d.name AS department_name
      FROM audit_cycles ac
      LEFT JOIN departments d ON ac.scope_department_id = d.id
      WHERE ac.id = $1
    `;
    const cycleRes = await db.query(cycleQuery, [id]);
    if (cycleRes.rowCount === 0) {
      return res.status(404).json({ error: 'Audit cycle not found.' });
    }
    const cycle = cycleRes.rows[0];

    // 2. Fetch Assigned Auditors
    const auditorsQuery = `
      SELECT u.id, u.name, u.email, u.role
      FROM audit_auditors aa
      JOIN users u ON aa.user_id = u.id
      WHERE aa.audit_cycle_id = $1
    `;
    const auditorsRes = await db.query(auditorsQuery, [id]);

    // 3. Fetch Audit Items
    const itemsQuery = `
      SELECT 
        ai.id, 
        ai.expected_location, 
        ai.status, 
        ai.notes, 
        ai.verified_at,
        a.id AS asset_id,
        a.name AS asset_name, 
        a.serial_number, 
        a.asset_tag,
        a.status AS current_asset_status,
        u.name AS verified_by_name,
        u.email AS verified_by_email
      FROM audit_items ai
      JOIN assets a ON ai.asset_id = a.id
      LEFT JOIN users u ON ai.verified_by = u.id
      WHERE ai.audit_cycle_id = $1
      ORDER BY ai.id ASC
    `;
    const itemsRes = await db.query(itemsQuery, [id]);

    return res.status(200).json({
      cycle,
      auditors: auditorsRes.rows,
      items: itemsRes.rows
    });
  } catch (err) {
    console.error(`[GET /api/audits/${id}]`, err.message);
    return res.status(500).json({ error: 'Server error retrieving audit cycle details.', details: err.message });
  }
});

// ─── PATCH /api/audit-items/:id ────────────────────────────────────────────────
// Update the verification status and notes of a specific audit item.
// Syncs asset status immediately if marked Missing or Damaged.
router.patch('/audit-items/:id', async (req, res) => {
  const { id } = req.params;
  const { status, notes, verified_by } = req.body;

  const validStatuses = ['Pending', 'Verified', 'Missing', 'Damaged'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  if (!verified_by) {
    return res.status(400).json({ error: 'verified_by (User ID of the auditor) is required.' });
  }

  // Get client from pool for Transaction
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Verify item exists and get asset id
    const itemCheck = await client.query('SELECT id, asset_id FROM audit_items WHERE id = $1', [id]);
    if (itemCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Audit item not found.' });
    }
    const assetId = itemCheck.rows[0].asset_id;

    // 2. Verify auditor exists
    const auditorCheck = await client.query('SELECT name FROM users WHERE id = $1', [verified_by]);
    if (auditorCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Auditor user account not found.' });
    }

    // 3. Update Audit Item status
    const updateItemQuery = `
      UPDATE audit_items
      SET 
        status = $1,
        notes = $2,
        verified_by = $3,
        verified_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *;
    `;
    const result = await client.query(updateItemQuery, [status, notes || null, verified_by, id]);
    const updatedItem = result.rows[0];

    // 4. Automatically sync the asset's main status based on verification result
    let assetStatusUpdate = null;
    if (status === 'Missing') {
      assetStatusUpdate = 'Lost';
    } else if (status === 'Damaged') {
      assetStatusUpdate = 'Under Maintenance';
    } else if (status === 'Verified') {
      assetStatusUpdate = 'Available'; // Restores status back to Available
    }

    if (assetStatusUpdate) {
      await client.query('UPDATE assets SET status = $1::asset_status WHERE id = $2', [assetStatusUpdate, assetId]);
      
      // Write log to activity_log
      await client.query(`
        INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
        VALUES ($1, 'AUDIT_SYNC_ASSET_STATUS', 'assets', $2, $3)
      `, [
        verified_by, 
        assetId, 
        `Audit item #${id} marked as ${status}. Synced asset status to ${assetStatusUpdate}.`
      ]);
    }

    await client.query('COMMIT');

    // Emit socket notification
    const io = req.app.get('socketio');
    if (io) {
      const auditorName = auditorCheck.rows[0].name;
      io.emit('activity', {
        action: 'AUDIT_ITEM_VERIFY',
        details: `Audit item #${id} marked as ${status}.` + (assetStatusUpdate ? ` Synced asset to ${assetStatusUpdate}.` : ''),
        user_name: auditorName
      });
      io.emit('notification', {
        message: `${auditorName} marked audit item as ${status}`,
        time: new Date()
      });
    }

    return res.status(200).json({
      message: 'Audit item updated successfully.',
      audit_item: updatedItem,
      asset_synced_status: assetStatusUpdate
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`[PATCH /api/audit-items/${id}]`, err.message);
    return res.status(500).json({ error: 'Server error updating audit item.', details: err.message });
  } finally {
    client.release();
  }
});

// PATCH /api/audits/:id — Update audit cycle status (e.g. set status = 'Closed')
router.patch('/audits/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (status !== 'Closed' && status !== 'Open') {
    return res.status(400).json({ error: "Invalid status. Must be 'Open' or 'Closed'." });
  }

  try {
    const checkCycle = await db.query('SELECT id FROM audit_cycles WHERE id = $1', [id]);
    if (checkCycle.rowCount === 0) {
      return res.status(404).json({ error: 'Audit cycle not found.' });
    }

    const updateQuery = `
      UPDATE audit_cycles
      SET status = $1
      WHERE id = $2
      RETURNING *;
    `;
    const result = await db.query(updateQuery, [status, id]);
    return res.status(200).json({
      message: \`Audit cycle status updated to \${status}.\`,
      cycle: result.rows[0]
    });
  } catch (err) {
    console.error(\`[PATCH /api/audits/\${id}]\`, err.message);
    return res.status(500).json({ error: 'Server error updating audit cycle status.', details: err.message });
  }
});

module.exports = router;
