// Fetch crypto prices
async function loadCrypto() {
  const url = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd';
  const res = await fetch(url);
  const data = await res.json();

  const container = document.getElementById('crypto-prices');
  container.innerHTML = '';

  data.slice(0, 6).forEach(coin => {
    const div = document.createElement('div');
    div.className = 'data-card';
    div.innerHTML = `
      <h3>${coin.name}</h3>
      <p>💰 $${coin.current_price.toLocaleString()}</p>
      <p>📈 ${coin.price_change_percentage_24h.toFixed(2)}%</p>
    `;
    container.appendChild(div);
  });
}

// Fetch forex rates
async function loadForex() {
  const url = 'https://api.exchangerate-api.com/v4/latest/USD';
  const res = await fetch(url);
  const data = await res.json();

  const container = document.getElementById('forex-rates');
  container.innerHTML = '';

  const pairs = ['EUR', 'GBP', 'JPY', 'CAD', 'NGN', 'AUD'];
  pairs.forEach(code => {
    const div = document.createElement('div');
    div.className = 'data-card';
    div.innerHTML = `
      <h3>${code}/USD</h3>
      <p>💱 ${data.rates[code].toFixed(2)}</p>
    `;
    container.appendChild(div);
  });
}

// Load data
loadCrypto();
loadForex();