const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getPool } = require('../db');

// Place market order (BUY/SELL) — simulation only
router.post('/order', auth, async (req, res) => {
  const { side, symbol, usd_amount, price } = req.body;
  if(!side || !symbol || !usd_amount || !price) return res.status(400).json({ error: 'Missing fields' });
  const pool = getPool();
  const userId = req.user.sub;

  try {
    await pool.query('BEGIN');

    // load account USD
    const acc = await pool.query('SELECT id,balance FROM accounts WHERE user_id=$1 AND currency=$2 FOR UPDATE', [userId, 'USD']);
    if(acc.rowCount === 0) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ error: 'No USD account' });
    }
    const account = acc.rows[0];

    if(side === 'BUY') {
      if(Number(account.balance) < Number(usd_amount)) {
        await pool.query('ROLLBACK');
        return res.status(400).json({ error: 'Insufficient balance' });
      }
      const qty = Number(usd_amount) / Number(price);

      // update or insert position
      const posR = await pool.query('SELECT id, qty, avg_price FROM positions WHERE user_id=$1 AND symbol=$2 FOR UPDATE', [userId, symbol]);
      if(posR.rowCount === 0){
        await pool.query('INSERT INTO positions (user_id, symbol, qty, avg_price) VALUES ($1,$2,$3,$4)', [userId, symbol, qty, price]);
      } else {
        const pos = posR.rows[0];
        const newQty = Number(pos.qty) + qty;
        const newAvg = ((Number(pos.qty) * Number(pos.avg_price)) + (qty * Number(price))) / newQty;
        await pool.query('UPDATE positions SET qty=$1, avg_price=$2, updated_at=now() WHERE id=$3', [newQty, newAvg, pos.id]);
      }

      // deduct USD
      await pool.query('UPDATE accounts SET balance = balance - $1, updated_at=now() WHERE id=$2', [usd_amount, account.id]);

      // record trade
      await pool.query('INSERT INTO trades (user_id, side, symbol, qty, price, usd_value) VALUES ($1,$2,$3,$4,$5,$6)', [userId, 'BUY', symbol, qty, price, usd_amount]);

      await pool.query('COMMIT');
      return res.json({ status: 'ok', message: `Bought ${qty} ${symbol}`});
    } else if (side === 'SELL') {
      // load position
      const posR = await pool.query('SELECT id, qty, avg_price FROM positions WHERE user_id=$1 AND symbol=$2 FOR UPDATE', [userId, symbol]);
      if(posR.rowCount === 0) { await pool.query('ROLLBACK'); return res.status(400).json({ error: 'No position' }); }
      const pos = posR.rows[0];
      const qty = Number(usd_amount) / Number(price);
      if(qty > Number(pos.qty)) { await pool.query('ROLLBACK'); return res.status(400).json({ error: 'Not enough qty' }); }

      const newQty = Number(pos.qty) - qty;
      if(newQty <= 0) {
        await pool.query('DELETE FROM positions WHERE id=$1', [pos.id]);
      } else {
        await pool.query('UPDATE positions SET qty=$1, updated_at=now() WHERE id=$2', [newQty, pos.id]);
      }

      // credit USD
      await pool.query('UPDATE accounts SET balance = balance + $1, updated_at=now() WHERE id=$2', [qty * price, account.id]);

      // record trade
      await pool.query('INSERT INTO trades (user_id, side, symbol, qty, price, usd_value) VALUES ($1,$2,$3,$4,$5,$6)', [userId, 'SELL', symbol, qty, price, qty*price]);

      await pool.query('COMMIT');
      return res.json({ status: 'ok', message: `Sold ${qty} ${symbol}`});
    } else {
      await pool.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid side' });
    }

  } catch (e) {
    console.error(e);
    try { await getPool().query('ROLLBACK'); } catch(_) {}
    res.status(500).json({ error: 'Trade failed' });
  }
});

router.get('/portfolio', auth, async (req,res) => {
  const pool = getPool();
  const userId = req.user.sub;
  const pos = await pool.query('SELECT symbol, qty, avg_price FROM positions WHERE user_id=$1', [userId]);
  const acc = await pool.query('SELECT currency, balance FROM accounts WHERE user_id=$1', [userId]);
  const trades = await pool.query('SELECT * FROM trades WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50', [userId]);
  res.json({ positions: pos.rows, accounts: acc.rows, trades: trades.rows });
});

module.exports = router;