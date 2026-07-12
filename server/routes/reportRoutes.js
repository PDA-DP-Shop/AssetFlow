const express = require('express');
const db      = require('../db/db');
const router  = express.Router();

// 1. GET /api/reports/utilization — allocation count by department
router.get('/utilization', async (req, res) => {
  try {
    const query = `
      SELECT 
        d.id, 
        d.name AS department_name, 
        COUNT(al.id)::int AS total_allocations,
        COUNT(CASE WHEN al.status = 'active' THEN 1 END)::int AS active_allocations
      FROM departments d
      LEFT JOIN users u ON u.department_id = d.id
      LEFT JOIN allocations al ON al.user_id = u.id
      GROUP BY d.id, d.name
      ORDER BY total_allocations DESC;
    `;
    const result = await db.query(query);
    return res.json({ utilization: result.rows });
  } catch (err) {
    console.error('[GET /api/reports/utilization]', err.message);
    return res.status(500).json({ error: 'Failed to generate utilization report.' });
  }
});

// 2. GET /api/reports/maintenance-frequency — request count by asset/category
router.get('/maintenance-frequency', async (req, res) => {
  try {
    const assetQuery = `
      SELECT 
        a.id, 
        a.name AS asset_name, 
        a.asset_tag, 
        COUNT(mr.id)::int AS request_count,
        SUM(COALESCE(mr.cost, 0))::numeric AS total_cost
      FROM assets a
      JOIN maintenance_requests mr ON mr.asset_id = a.id
      GROUP BY a.id, a.name, a.asset_tag
      ORDER BY request_count DESC;
    `;
    const categoryQuery = `
      SELECT 
        c.name AS category_name, 
        COUNT(mr.id)::int AS request_count,
        SUM(COALESCE(mr.cost, 0))::numeric AS total_cost
      FROM categories c
      JOIN assets a ON a.category_id = c.id
      JOIN maintenance_requests mr ON mr.asset_id = a.id
      GROUP BY c.name
      ORDER BY request_count DESC;
    `;
    const assets = await db.query(assetQuery);
    const categories = await db.query(categoryQuery);
    return res.json({
      frequency_by_asset: assets.rows,
      frequency_by_category: categories.rows
    });
  } catch (err) {
    console.error('[GET /api/reports/maintenance-frequency]', err.message);
    return res.status(500).json({ error: 'Failed to generate maintenance frequency report.' });
  }
});

// 3. GET /api/reports/most-used-idle — top bookable assets vs. unused (30+ days)
router.get('/most-used-idle', async (req, res) => {
  try {
    // Top resources by booking count
    const mostUsedQuery = `
      SELECT 
        r.id, 
        r.name AS resource_name, 
        r.location, 
        COUNT(b.id)::int AS booking_count
      FROM resources r
      LEFT JOIN bookings b ON b.resource_id = r.id
      GROUP BY r.id, r.name, r.location
      ORDER BY booking_count DESC
      LIMIT 10;
    `;

    // Idle assets (not allocated in the last 30 days)
    const idleAssetsQuery = `
      SELECT 
        a.id, 
        a.name AS asset_name, 
        a.asset_tag, 
        a.location, 
        a.status,
        a.acquisition_date
      FROM assets a
      WHERE a.id NOT IN (
        SELECT DISTINCT asset_id 
        FROM allocations 
        WHERE allocated_at >= NOW() - INTERVAL '30 days'
      )
      ORDER BY a.name ASC;
    `;

    const mostUsed = await db.query(mostUsedQuery);
    const idle = await db.query(idleAssetsQuery);

    return res.json({
      most_used_resources: mostUsed.rows,
      idle_assets: idle.rows
    });
  } catch (err) {
    console.error('[GET /api/reports/most-used-idle]', err.message);
    return res.status(500).json({ error: 'Failed to generate usage report.' });
  }
});

// 4. GET /api/reports/due-for-maintenance-or-retirement — retirement/maintenance alerts
router.get('/due-for-maintenance-or-retirement', async (req, res) => {
  try {
    // Assets with upcoming scheduled maintenance dates
    const upcomingMaintenanceQuery = `
      SELECT 
        mr.id AS request_id, 
        mr.scheduled_date, 
        mr.description, 
        mr.priority, 
        mr.status AS request_status,
        a.name AS asset_name, 
        a.asset_tag
      FROM maintenance_requests mr
      JOIN assets a ON mr.asset_id = a.id
      WHERE mr.status = 'Pending' AND mr.scheduled_date >= CURRENT_DATE
      ORDER BY mr.scheduled_date ASC;
    `;

    // Assets older than 3 years (due for retirement evaluation)
    const retirementQuery = `
      SELECT 
        id, 
        name AS asset_name, 
        asset_tag, 
        acquisition_date, 
        condition, 
        status
      FROM assets
      WHERE acquisition_date <= NOW() - INTERVAL '3 years'
      ORDER BY acquisition_date ASC;
    `;

    const maintenance = await db.query(upcomingMaintenanceQuery);
    const retirement = await db.query(retirementQuery);

    return res.json({
      due_for_maintenance: maintenance.rows,
      due_for_retirement: retirement.rows
    });
  } catch (err) {
    console.error('[GET /api/reports/due-for-maintenance-or-retirement]', err.message);
    return res.status(500).json({ error: 'Failed to generate alerts report.' });
  }
});

module.exports = router;
