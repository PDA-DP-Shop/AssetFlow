const express = require('express');
const db      = require('../db/db');
const router  = express.Router();

// GET /api/employees — list all employees with their department
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.role, 
        u.is_active, 
        u.department_id,
        d.name AS department_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      ORDER BY u.name ASC;
    `;
    const result = await db.query(query);
    return res.json({ employees: result.rows });
  } catch (err) {
    console.error('[GET /api/employees]', err.message);
    return res.status(500).json({ error: 'Failed to fetch employees.' });
  }
});

// PATCH /api/employees/:id/role — promote/assign employee roles (restricted to Admin in frontend)
router.patch('/:id/role', async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  const validRoles = ['Employee', 'Manager', 'Admin', 'Auditor', 'Finance'];
  if (!role || !validRoles.includes(role)) {
    return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
  }

  try {
    // Check user exists
    const userCheck = await db.query('SELECT name, role FROM users WHERE id = $1', [id]);
    if (userCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Employee not found.' });
    }
    const emp = userCheck.rows[0];

    // Update role
    const query = `
      UPDATE users
      SET role = $1
      WHERE id = $2
      RETURNING id, name, email, role, is_active;
    `;
    const result = await db.query(query, [role, id]);

    // Log the promotion
    await db.query(
      `INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'EMPLOYEE_ROLE_PROMOTION', 'users', $2, $3)`,
      [1, id, `Promoted/Updated role of "${emp.name}" from "${emp.role}" to "${role}".`]
    );

    // Emit Socket notification
    const io = req.app.get('socketio');
    if (io) {
      io.emit('activity', {
        action: 'EMPLOYEE_ROLE_PROMOTION',
        details: `Promoted/Updated role of "${emp.name}" from "${emp.role}" to "${role}".`,
        user_name: 'AssetFlow Administrator'
      });
      io.emit('notification', {
        message: `Employee "${emp.name}" promoted to ${role}`,
        time: new Date()
      });
    }

    return res.json({
      message: 'Employee role updated successfully.',
      employee: result.rows[0]
    });
  } catch (err) {
    console.error(`[PATCH /api/employees/${id}/role]`, err.message);
    return res.status(500).json({ error: 'Server error updating employee role.' });
  }
});

module.exports = router;
