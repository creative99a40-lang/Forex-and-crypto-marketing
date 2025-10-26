const express = require('express');
const { getPool } = require('../db');
const router = express.Router();

/**
 * This endpoint is a MOCK webhook receiver for payment provider notifications.
 * When integrating a real payment provider, validate signatures and payloads.
 *
 * Important: do NOT store private wallet keys here. Use hosted provider.
 */

router.post('/payment', async (req, res) => {
  const { provider, provider_id, user_id, amount, currency, status } = req.body;
  const pool = getPool();
  try {
    await pool.query(
      'INSERT INTO payments (user_id, provider, provider_id, amount, currency, status) VALUES ($1,$2,$3,$4,$5,$6)',
      [user_id, provider, provider_id, amount, currency, status]
    );

    // Simulate crediting demo USD if provider is "MOCK" and status = "CONFIRMED"
    if(provider === 'MOCK' && status === 'CONFIRMED'){
      await pool.query('UPDATE accounts SET balance = balance + $1 WHERE user_id=$2 AND currency=$3', [amount, user_id, currency]);
    }

    res.json({ received: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'webhook error' });
  }
});

module.exports = router;