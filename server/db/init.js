const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL;

async function createDatabaseIfNotExists() {
  if (!connectionString) {
    console.error('DATABASE_URL is not set.');
    return;
  }

  try {
    const url = new URL(connectionString);
    const dbName = url.pathname.substring(1);

    if (!dbName || dbName === 'postgres') {
      return; // Already connecting to system DB, no action needed
    }

    // Redirect administrative check to system 'postgres' DB
    const adminUrl = new URL(connectionString);
    adminUrl.pathname = '/postgres';
    const adminConnectionString = adminUrl.toString();

    const client = new Client({ connectionString: adminConnectionString });
    
    await client.connect();
    
    // Query database list
    const res = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    
    if (res.rowCount === 0) {
      console.log(`Database "${dbName}" does not exist. Creating database...`);
      // CREATE DATABASE cannot run inside a transaction block, raw query execution
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Database "${dbName}" created successfully.`);
    } else {
      console.log(`Database "${dbName}" verified: already exists.`);
    }
    
    await client.end();
  } catch (err) {
    console.warn('Database existence check bypassed:', err.message);
    console.warn('If database does not exist, pool initialization may fail next.');
  }
}

async function initializeDatabase() {
  // 1. Create DB if needed
  await createDatabaseIfNotExists();

  // 2. Connect via application pool
  const { pool } = require('./db');

  try {
    console.log('Parsing schema.sql configurations...');
    const schemaPath = path.resolve(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute DDL schema definition
    await pool.query(schemaSql);
    console.log('Database tables successfully verified and initialized.');

    // 3. Conditional Seeding check
    const checkRes = await pool.query('SELECT COUNT(*) FROM departments');
    const departmentCount = parseInt(checkRes.rows[0].count, 10);

    if (departmentCount === 0) {
      console.log('Departments table is empty. Injecting seed data...');
      const seedPath = path.resolve(__dirname, 'seed.sql');
      const seedSql = fs.readFileSync(seedPath, 'utf8');
      await pool.query(seedSql);
      console.log('Sample seeding completed. AssetFlow demo data populated.');
    } else {
      console.log(`Seeding skipped: departments table already has ${departmentCount} records.`);
    }
  } catch (err) {
    console.error('ERROR during database startup initialization:', err.message);
    throw err;
  }
}

module.exports = initializeDatabase;
