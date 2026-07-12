const express = require('express');
const db      = require('../db/db');
const router  = express.Router();

// GET /api/dashboard/summary
router.get('/summary', async (req, res) => {
  try {
    // 1. Available assets
    const availableRes = await db.query("SELECT COUNT(*)::int AS count FROM assets WHERE status = 'Available'");
    
    // 2. Allocated assets
    const allocatedRes = await db.query("SELECT COUNT(*)::int AS count FROM assets WHERE status = 'Allocated'");
    
    // 3. Active Bookings (Upcoming / Ongoing)
    const bookingsRes = await db.query("SELECT COUNT(*)::int AS count FROM bookings WHERE status IN ('Upcoming', 'Ongoing')");
    
    // 4. Pending Transfers
    const transfersRes = await db.query("SELECT COUNT(*)::int AS count FROM transfers WHERE status = 'pending'");
    
    // 5. Upcoming Returns (Allocations active, but allocated within the last 7 days as a proxy)
    const upcomingRes = await db.query("SELECT COUNT(*)::int AS count FROM allocations WHERE status = 'active' AND allocated_at >= NOW() - INTERVAL '7 days'");
    
    // 6. Under Maintenance
    const maintenanceRes = await db.query("SELECT COUNT(*)::int AS count FROM assets WHERE status = 'Under Maintenance'");
    
    // 7. Overdue Returns (Allocations active for more than 14 days)
    const overdueRes = await db.query("SELECT COUNT(*)::int AS count FROM allocations WHERE status = 'active' AND allocated_at < NOW() - INTERVAL '14 days'");

    // 8. Recent Activity Feed
    const activityRes = await db.query(`
      SELECT 
        l.id, 
        l.action, 
        l.entity_type, 
        l.entity_id, 
        l.details, 
        l.timestamp,
        u.name AS user_name,
        u.email AS user_email
      FROM activity_log l
      LEFT JOIN users u ON l.user_id = u.id
      ORDER BY l.timestamp DESC
      LIMIT 15
    `);

    return res.status(200).json({
      summary: {
        available: availableRes.rows[0].count,
        allocated: allocatedRes.rows[0].count,
        active_bookings: bookingsRes.rows[0].count,
        pending_transfers: transfersRes.rows[0].count,
        upcoming_returns: upcomingRes.rows[0].count,
        under_maintenance: maintenanceRes.rows[0].count,
        overdue: overdueRes.rows[0].count
      },
      activities: activityRes.rows
    });
  } catch (err) {
    console.error('[GET /api/dashboard/summary]', err.message);
    return res.status(500).json({ error: 'Server error retrieving dashboard summary.', details: err.message });
  }
});

module.exports = router;
