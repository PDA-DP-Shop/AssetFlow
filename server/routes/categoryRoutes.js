const express = require('express');
const db      = require('../db/db');
const router  = express.Router();

// GET /api/categories
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM categories ORDER BY name ASC');
    return res.json({ categories: result.rows });
  } catch (err) {
    console.error('[GET /api/categories]', err.message);
    return res.status(500).json({ error: 'Failed to fetch categories.' });
  }
});

// POST /api/categories
router.post('/', async (req, res) => {
  const { name, description, fields } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Category name is required.' });
  }

  try {
    const duplicate = await db.query('SELECT id FROM categories WHERE name = $1', [name.trim()]);
    if (duplicate.rowCount > 0) {
      return res.status(409).json({ error: 'A category with this name already exists.' });
    }

    const query = `
      INSERT INTO categories (name, description, fields)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const result = await db.query(query, [name.trim(), description || null, fields ? JSON.stringify(fields) : null]);
    return res.status(201).json({
      message: 'Category created successfully.',
      category: result.rows[0]
    });
  } catch (err) {
    console.error('[POST /api/categories]', err.message);
    return res.status(500).json({ error: 'Server error creating category.' });
  }
});

// PUT /api/categories/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, fields } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Category name is required.' });
  }

  try {
    const catCheck = await db.query('SELECT id FROM categories WHERE id = $1', [id]);
    if (catCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Category not found.' });
    }

    const query = `
      UPDATE categories
      SET name = $1, description = $2, fields = $3
      WHERE id = $4
      RETURNING *;
    `;
    const result = await db.query(query, [name.trim(), description || null, fields ? JSON.stringify(fields) : null, id]);
    return res.status(200).json({
      message: 'Category updated successfully.',
      category: result.rows[0]
    });
  } catch (err) {
    console.error('[PUT /api/categories/:id]', err.message);
    return res.status(500).json({ error: 'Server error updating category.' });
  }
});

module.exports = router;
