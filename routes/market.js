const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();
const COINGECKO = process.env.COINGECKO_BASE || 'https://api.coingecko.com/api/v3';

// Get top markets
router.get('/coins', async (req, res) => {
  try {
    const url = `${COINGECKO}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false`;
    const r = await fetch(url);
    const data = await r.json();
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Market fetch failed' });
  }
});

module.exports = router;