const fs = require('fs');
const path = require('path');
const { initDb, getPool } = require('../db');

async function run(){
  await initDb();
  const sql = fs.readFileSync(path.join(__dirname,'001_init.sql'), 'utf8');
  const pool = getPool();
  await pool.query(sql);
  console.log('Migrations applied');
  process.exit(0);
}

run().catch(err=>{
  console.error(err);
  process.exit(1);
});