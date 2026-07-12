const express = require('express');
const db      = require('../db/db');
const router  = express.Router();

// GET /api/departments/employees — list all employees for the Head dropdown
router.get('/employees', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, email, role FROM users ORDER BY name ASC`
    );
    return res.json({ employees: result.rows });
  } catch (err) {
    console.error('[GET /api/departments/employees]', err.message);
    return res.status(500).json({ error: 'Failed to fetch employees.' });
  }
});

// GET /api/departments — list all departments
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        d.id, 
        d.name, 
        d.code, 
        d.manager, 
        d.parent_id, 
        d.is_active, 
        d.manager_id,
        p.name AS parent_name,
        u.name AS manager_name,
        u.email AS manager_email
      FROM departments d
      LEFT JOIN departments p ON d.parent_id = p.id
      LEFT JOIN users u ON d.manager_id = u.id
      ORDER BY d.name ASC
    `);
    return res.json({ departments: result.rows });
  } catch (err) {
    console.error('[GET /api/departments]', err.message);
    return res.status(500).json({ error: 'Failed to fetch departments.' });
  }
});

// POST /api/departments — create a department
router.post('/', async (req, res) => {
  const { name, code, manager_id, parent_id, is_active } = req.body;

  if (!name || !code) {
    return res.status(400).json({ error: 'Department name and code are required.' });
  }

  try {
    // Check duplicates
    const duplicate = await db.query('SELECT id FROM departments WHERE name = $1 OR code = $2', [name.trim(), code.trim().toUpperCase()]);
    if (duplicate.rowCount > 0) {
      return res.status(409).json({ error: 'A department with this name or code already exists.' });
    }

    // Resolve manager name string for legacy manager text column
    let managerNameText = null;
    if (manager_id) {
      const managerUser = await db.query('SELECT name FROM users WHERE id = $1', [manager_id]);
      if (managerUser.rowCount > 0) managerNameText = managerUser.rows[0].name;
    }

    const query = `
      INSERT INTO departments (name, code, manager_id, manager, parent_id, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const result = await db.query(query, [
      name.trim(),
      code.trim().toUpperCase(),
      manager_id || null,
      managerNameText,
      parent_id ? Number(parent_id) : null,
      is_active !== false
    ]);

    return res.status(201).json({
      message: 'Department created successfully.',
      department: result.rows[0]
    });
  } catch (err) {
    console.error('[POST /api/departments]', err.message);
    return res.status(500).json({ error: 'Server error creating department.' });
  }
});

// PUT /api/departments/:id — update a department
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, code, manager_id, parent_id, is_active } = req.body;

  if (!name || !code) {
    return res.status(400).json({ error: 'Department name and code are required.' });
  }

  try {
    // Check existence
    const deptCheck = await db.query('SELECT id FROM departments WHERE id = $1', [id]);
    if (deptCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Department not found.' });
    }

    // Check circular reference for parent
    if (parent_id && Number(parent_id) === Number(id)) {
      return res.status(400).json({ error: 'A department cannot be its own parent.' });
    }

    // Resolve manager name
    let managerNameText = null;
    if (manager_id) {
      const managerUser = await db.query('SELECT name FROM users WHERE id = $1', [manager_id]);
      if (managerUser.rowCount > 0) managerNameText = managerUser.rows[0].name;
    }

    const query = `
      UPDATE departments
      SET 
        name = $1, 
        code = $2, 
        manager_id = $3, 
        manager = $4,
        parent_id = $5, 
        is_active = $6
      WHERE id = $7
      RETURNING *;
    `;
    const result = await db.query(query, [
      name.trim(),
      code.trim().toUpperCase(),
      manager_id || null,
      managerNameText,
      parent_id ? Number(parent_id) : null,
      is_active !== false,
      id
    ]);

    return res.status(200).json({
      message: 'Department updated successfully.',
      department: result.rows[0]
    });
  } catch (err) {
    console.error('[PUT /api/departments/:id]', err.message);
    return res.status(500).json({ error: 'Server error updating department.' });
  }
});

module.exports = router;
