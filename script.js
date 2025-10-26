// Simple demo trading platform logic
// Uses CoinGecko public API for prices (no key required).

const COINGECKO_MARKETS = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=12&page=1&sparkline=false';
const FX_API = 'https://open.er-api.com/v6/latest/USD'; // free fx rates

// App state (persisted to localStorage)
const state = {
  user: null,
  balanceUSD: 10000, // demo default
  portfolio: {}, // { symbol: { qty, avg } }
  history: [], // trades
  prices: {}, // live prices
};

function saveState(){ localStorage.setItem('cryptox_state', JSON.stringify(state)); }
function loadState(){
  const s = localStorage.getItem('cryptox_state');
  if(s){ Object.assign(state, JSON.parse(s)); }
}
loadState();

// UI elements
const pages = { home: document.getElementById('home'), market: document.getElementById('market'), trade: document.getElementById('trade'), account: document.getElementById('account') };
const nav = { homeBtn: document.getElementById('homeBtn'), marketBtn: document.getElementById('marketBtn'), tradeBtn: document.getElementById('tradeBtn'), accountBtn: document.getElementById('accountBtn') };
const userArea = document.getElementById('userArea');
const loginBtn = document.getElementById('loginBtn');
const modal = document.getElementById('modal');
const closeModal = document.getElementById('closeModal');
const registerNow = document.getElementById('registerNow');
const usernameInput = document.getElementById('username');
const demoBalance = document.getElementById('demoBalance');
const topCrypto = document.getElementById('topCrypto');
const topForex = document.getElementById('topForex');
const marketList = document.getElementById('marketList');
const pairSelect = document.getElementById('pairSelect');
const amountInput = document.getElementById('amountInput');
const placeOrder = document.getElementById('placeOrder');
const orderPreview = document.getElementById('orderPreview');
const tradeMsg = document.getElementById('tradeMsg');
const profileName = document.getElementById('profileName');
const accountBalance = document.getElementById('accountBalance');
const portfolioEl = document.getElementById('portfolio');
const historyEl = document.getElementById('history');
const startDemo = document.getElementById('startDemo');

function show(page){
  Object.values(pages).forEach(p=>p.classList.add('hidden'));
  pages[page].classList.remove('hidden');
}
nav.homeBtn.onclick = ()=>show('home');
nav.marketBtn.onclick = ()=>show('market');
nav.tradeBtn.onclick = ()=>show('trade');
nav.accountBtn.onclick = ()=>show('account');
loginBtn.onclick = ()=>modal.classList.remove('hidden');
closeModal.onclick = ()=>modal.classList.add('hidden');
startDemo.onclick = ()=>{ modal.classList.remove('hidden'); usernameInput.value='Trader'+Math.floor(Math.random()*900); };

// Register / login (demo)
registerNow.onclick = ()=>{
  const u = usernameInput.value.trim();
  if(!u){ alert('Choose a username'); return; }
  state.user = u;
  if(!state.balanceUSD) state.balanceUSD = 10000;
  profileName.innerText = u;
  updateAccountUI();
  saveState();
  modal.classList.add('hidden');
  loginBtn.style.display='none';
  userArea.innerHTML = `<div style="font-weight:600">${u}</div>`;
}

// Fetch market data
async function loadMarkets(){
  try{
    const res = await fetch(COINGECKO_MARKETS);
    const coins = await res.json();
    marketList.innerHTML = '';
    topCrypto.innerHTML = '';
    coins.slice(0,6).forEach(c=>{
      const card = document.createElement('div'); card.className='card';
      card.innerHTML = `<strong>${c.name} (${c.symbol.toUpperCase()})</strong>
        <div>$${format(c.current_price)} <small>${c.price_change_percentage_24h?.toFixed(2)||'0'}%</small></div>`;
      marketList.appendChild(card);
      topCrypto.innerHTML += `<div>${c.symbol.toUpperCase()}: $${format(c.current_price)}</div>`;
      state.prices[c.symbol.toUpperCase()] = c.current_price;
    });
    populatePairs();
    updateAllPreviews();
    saveState();
  }catch(e){ console.error('Markets load failed', e) }
}

async function loadForex(){
  try{
    const r = await fetch(FX_API);
    const data = await r.json();
    const pairs = ['EUR','GBP','JPY','CAD','NGN','AUD'];
    topForex.innerHTML = '';
    pairs.forEach(p=>{
      const v = data.rates[p];
      if(v) topForex.innerHTML += `<div>${p}/USD: ${v.toFixed(4)}</div>`;
    });
  }catch(e){ console.error('FX load failed', e) }
}

function format(n){ return Number(n).toLocaleString(undefined,{maximumFractionDigits:2}); }

// Populate trade pair select
function populatePairs(){
  pairSelect.innerHTML = '';
  const cryptos = Object.keys(state.prices);
  cryptos.forEach(sym=>{
    const opt = document.createElement('option'); opt.value = `USD-${sym}`; opt.textContent = `${sym}/USD`;
    pairSelect.appendChild(opt);
  });
}

// Update preview
function updateAllPreviews(){
  const pair = pairSelect.value;
  const amt = Number(amountInput.value || 0);
  if(!pair) return orderPreview.innerText='Select pair';
  const sym = pair.split('-')[1];
  const price = state.prices[sym] || 0;
  orderPreview.innerHTML = `<div>Pair: ${sym}/USD</div><div>Price: $${format(price)}</div><div>Amount: $${format(amt)} → Qty: ${amt && price ? (amt/price).toFixed(6) : 0}</div>`;
}
pairSelect.onchange = updateAllPreviews;
amountInput.oninput = updateAllPreviews;

// Place a simulated market order
placeOrder.onclick = ()=>{
  if(!state.user){ tradeMsg.innerText='Please register/login (demo)'; return; }
  const side = document.querySelector('input[name="side"]:checked').value;
  const pair = pairSelect.value; if(!pair){ tradeMsg.innerText='Select a pair'; return; }
  const amt = Number(amountInput.value); if(!amt || amt<=0){ tradeMsg.innerText='Enter a valid amount'; return; }
  const sym = pair.split('-')[1];
  const price = state.prices[sym] || 0;
  if(price<=0){ tradeMsg.innerText='Price unavailable'; return; }

  if(side==='buy'){
    if(amt > state.balanceUSD){ tradeMsg.innerText='Insufficient demo balance'; return; }
    const qty = amt / price;
    // update portfolio
    if(!state.portfolio[sym]) state.portfolio[sym] = { qty:0, avg:0 };
    const pos = state.portfolio[sym];
    const totalCost = pos.qty*pos.avg + qty*price;
    pos.qty += qty;
    pos.avg = totalCost / pos.qty;
    state.balanceUSD -= amt;
    state.history.unshift({ ts:Date.now(), side:'BUY', symbol:sym, qty, price, usd:amt });
    tradeMsg.innerText = `Bought ${qty.toFixed(6)} ${sym} for $${format(amt)}`;
  }else{
    const pos = state.portfolio[sym];
    if(!pos || pos.qty<=0){ tradeMsg.innerText='No position to sell'; return; }
    const qty = amt / price;
    if(qty > pos.qty){ tradeMsg.innerText='Selling more than you hold'; return; }
    pos.qty -= qty;
    state.balanceUSD += qty*price;
    state.history.unshift({ ts:Date.now(), side:'SELL', symbol:sym, qty, price, usd:qty*price });
    if(pos.qty === 0) delete state.portfolio[sym];
    tradeMsg.innerText = `Sold ${qty.toFixed(6)} ${sym} for $${format(qty*price)}`;
  }
  updateAccountUI();
  saveState();
}

// Update account UI
function updateAccountUI(){
  demoBalance.innerText = `$${format(state.balanceUSD)}`;
  accountBalance.innerText = `$${format(state.balanceUSD)}`;
  // portfolio
  const keys = Object.keys(state.portfolio);
  if(keys.length===0) portfolioEl.innerText='No positions';
  else {
    portfolioEl.innerHTML = keys.map(s=>{
      const p = state.portfolio[s]; const cur = state.prices[s] || 0;
      const value = (p.qty*cur);
      return `<div><strong>${s}</strong> ${p.qty.toFixed(6)} @ $${format(cur)} → $${format(value)}</div>`;
    }).join('');
  }
  // history
  if(state.history.length===0) historyEl.innerText='No trades yet';
  else historyEl.innerHTML = state.history.slice(0,20).map(h=>{
    const d = new Date(h.ts).toLocaleString();
    return `<div>${d} — ${h.side} ${h.qty.toFixed(6)} ${h.symbol} @ $${format(h.price)} ($${format(h.usd)})</div>`;
  }).join('');
  profileName.innerText = state.user || 'Not logged in';
  // hide login if logged in
  if(state.user) loginBtn.style.display = 'none';
}

// Periodically refresh prices
async function refreshLoop(){
  try{
    const res = await fetch(COINGECKO_MARKETS);
    const coins = await res.json();
    coins.slice(0,12).forEach(c=> state.prices[c.symbol.toUpperCase()] = c.current_price);
    // update UI
    updateAccountUI();
    // update market list quickly
    marketList.innerHTML = '';
    coins.slice(0,12).forEach(c=>{
      const card = document.createElement('div'); card.className='card';
      card.innerHTML = `<strong>${c.name} (${c.symbol.toUpperCase()})</strong>
        <div>$${format(c.current_price)} <small>${c.price_change_percentage_24h?.toFixed(2)||'0'}%</small></div>`;
      marketList.appendChild(card);
    });
    populatePairs();
    updateAllPreviews();
    saveState();
  }catch(e){ console.error('refresh failed', e) }
  setTimeout(refreshLoop, 20000); // every 20s
}

// Init
(async function init(){
  updateAccountUI();
  await loadMarkets();
  await loadForex();
  refreshLoop();
})();