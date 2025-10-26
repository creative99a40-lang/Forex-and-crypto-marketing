const { Pool } = require('pg');

let pool;

async function initDb() {
  if (pool) return pool;
  const connection = process.env.DATABASE_URL;
  if (!connection) throw new Error('DATABASE_URL not set');
  pool = new Pool({ connectionString: connection });
  // quick test
  await pool.query('SELECT 1');
  return pool;
}

function getPool() {
  if (!pool) throw new Error('DB not initialized');
  return pool;
}

module.exports = { initDb, getPool };