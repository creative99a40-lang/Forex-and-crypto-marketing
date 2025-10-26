const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getPool } = require('../db');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';

router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if(!username || !password) return res.status(400).json({ error: 'Missing fields' });
  const pool = getPool();
  const hash = await bcrypt.hash(password, 10);
  try {
    const r = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
      [username, hash]
    );
    // create default USD demo account
    const user = r.rows[0];
    await pool.query('INSERT INTO accounts (user_id, currency, balance) VALUES ($1,$2,$3)', [user.id, 'USD', 10000]);
    const token = jwt.sign({ sub: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: 'Username exists or DB error' });
  }
});

router.post('/login', async (req,res) => {
  const { username, password } = req.body;
  const pool = getPool();
  const r = await pool.query('SELECT id, username, password_hash FROM users WHERE username=$1', [username]);
  if(r.rowCount === 0) return res.status(401).json({ error: 'Invalid credentials' });
  const user = r.rows[0];
  const ok = await bcrypt.compare(password, user.password_hash);
  if(!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ sub: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username: user.username } });
});

module.exports = router;