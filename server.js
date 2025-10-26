require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDb } = require('./db');
const authRoutes = require('./routes/auth');
const marketRoutes = require('./routes/market');
const tradeRoutes = require('./routes/trade');
const webhookRoutes = require('./routes/webhook');

const PORT = process.env.PORT || 4000;

const app = express();
app.use(cors());
app.use(express.json());

// Initialize DB pool
initDb().then(() => {
  console.log('DB initialized');
}).catch(err => {
  console.error('DB init failed', err);
  process.exit(1);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/trade', tradeRoutes);
app.use('/api/webhook', webhookRoutes);

// Health
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});