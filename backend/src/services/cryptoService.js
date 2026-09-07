import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });

const COINGECKO = 'https://api.coingecko.com/api/v3';
const ETHERSCAN = 'https://api.etherscan.io/api';
const ETHERSCAN_KEY = process.env.ETHERSCAN_API_KEY || 'demo';

async function fetchJSON(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'SafeNestT-Mia/1.0' } });
  if (!r.ok) throw new Error(`HTTP ${r.status} from ${url}`);
  return r.json();
}

// ── Token search & analysis ───────────────────────────────────────────────────
export async function scanToken(query) {
  const search = await fetchJSON(`${COINGECKO}/search?query=${encodeURIComponent(query)}`);
  const coins = (search.coins || []).slice(0, 5);
  if (!coins.length) return { found: false, query };

  const best = coins.find(c => c.symbol?.toLowerCase() === query.toLowerCase()) || coins[0];

  const [data, chart] = await Promise.all([
    fetchJSON(`${COINGECKO}/coins/${best.id}?localization=false&tickers=false&community_data=false&developer_data=false`),
    fetchJSON(`${COINGECKO}/coins/${best.id}/market_chart?vs_currency=usd&days=30`).catch(() => ({ prices: [], total_volumes: [] })),
  ]);

  const price     = data.market_data?.current_price?.usd || 0;
  const change24h = data.market_data?.price_change_percentage_24h || 0;
  const change7d  = data.market_data?.price_change_percentage_7d || 0;
  const mcap      = data.market_data?.market_cap?.usd || 0;
  const volume24h = data.market_data?.total_volume?.usd || 0;
  const ath       = data.market_data?.ath?.usd || 0;

  const tokenData = {
    id: data.id, name: data.name, symbol: data.symbol?.toUpperCase(),
    price, change24h, change7d, mcap, volume24h, ath,
    rank: data.market_cap_rank,
    launchDate: data.genesis_date,
    description: data.description?.en?.replace(/<[^>]*>/g, '').slice(0, 400),
    homepage: data.links?.homepage?.[0],
    twitter: data.links?.twitter_screen_name,
    platforms: data.platforms || {},
  };

  const { score, flags } = scoreToken(tokenData, chart);
  return { found: true, query, token: tokenData, score, flags, chartData: chart };
}

function scoreToken(data, chart) {
  let score = 0;
  const flags = [];

  if (Math.abs(data.change24h) > 100) { score += 30; flags.push(`Extreme 24h move: ${data.change24h.toFixed(0)}%`); }
  else if (Math.abs(data.change24h) > 50) { score += 15; flags.push(`High 24h move: ${data.change24h.toFixed(0)}%`); }
  if (!data.mcap || data.mcap < 100_000) { score += 25; flags.push('Market cap under $100K'); }
  if (!data.rank) { score += 20; flags.push('Not ranked on CoinGecko'); }
  if (!Object.keys(data.platforms || {}).length) { score += 10; flags.push('No contract address listed'); }
  if (!data.homepage) { score += 10; flags.push('No official website'); }
  if (data.launchDate) {
    const ageDays = (Date.now() - new Date(data.launchDate).getTime()) / 86400000;
    if (ageDays < 30) { score += 20; flags.push(`Launched only ${Math.ceil(ageDays)} days ago`); }
  }
  if (chart?.total_volumes?.length > 7) {
    const recent = chart.total_volumes.slice(-3).map(v => v[1]);
    const older  = chart.total_volumes.slice(-10, -3).map(v => v[1]);
    const avgR = recent.reduce((a,b)=>a+b,0)/recent.length;
    const avgO = older.reduce((a,b)=>a+b,0)/older.length;
    if (avgO > 0 && avgR / avgO > 5) {
      score += 20; flags.push(`Volume spike: ${(avgR/avgO).toFixed(1)}x vs 7-day avg`);
    }
  }

  return { score: Math.min(score, 100), flags };
}

// ── Wallet analysis ───────────────────────────────────────────────────────────
export async function scanWallet(address) {
  const isETH = /^0x[a-fA-F0-9]{40}$/.test(address);
  const isBTC = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/.test(address);

  if (!isETH && !isBTC) throw new Error('Invalid wallet address format');

  if (isETH) return scanETHWallet(address);
  return scanBTCWallet(address);
}

async function scanETHWallet(address) {
  const key = ETHERSCAN_KEY;
  const base = `${ETHERSCAN}?apikey=${key}`;

  const [balRes, txRes, internalRes] = await Promise.all([
    fetchJSON(`${base}&module=account&action=balance&address=${address}&tag=latest`),
    fetchJSON(`${base}&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&page=1&offset=20`),
    fetchJSON(`${base}&module=account&action=txlistinternal&address=${address}&startblock=0&endblock=99999999&sort=desc&page=1&offset=10`).catch(() => ({ result: [] })),
  ]);

  const balEth = parseFloat(balRes.result || '0') / 1e18;
  const txs = Array.isArray(txRes.result) ? txRes.result : [];

  const totalIn  = txs.filter(t => t.to?.toLowerCase() === address.toLowerCase()).reduce((s,t) => s + parseFloat(t.value)/1e18, 0);
  const totalOut = txs.filter(t => t.from?.toLowerCase() === address.toLowerCase()).reduce((s,t) => s + parseFloat(t.value)/1e18, 0);

  const uniqueCounterparties = [...new Set(txs.map(t =>
    t.from?.toLowerCase() === address.toLowerCase() ? t.to : t.from
  ).filter(Boolean))];

  const flags = [];
  if (txs.length === 0) flags.push('No transaction history');
  if (balEth === 0 && txs.length > 0) flags.push('Zero balance — funds moved out');
  if (uniqueCounterparties.length > 20) flags.push(`High number of counterparties: ${uniqueCounterparties.length}`);
  const failedTxs = txs.filter(t => t.txreceipt_status === '0').length;
  if (failedTxs > 2) flags.push(`${failedTxs} failed transactions`);

  return {
    address,
    chain: 'ethereum',
    balanceEth: balEth,
    balanceUSD: null,
    totalReceived: totalIn,
    totalSent: totalOut,
    txCount: txs.length,
    uniqueCounterparties: uniqueCounterparties.length,
    firstSeen: txs.length ? new Date(parseInt(txs[txs.length-1]?.timeStamp)*1000).toISOString().split('T')[0] : null,
    lastSeen:  txs.length ? new Date(parseInt(txs[0]?.timeStamp)*1000).toISOString().split('T')[0] : null,
    recentTxs: txs.slice(0, 10).map(t => ({
      hash:   t.hash,
      date:   new Date(parseInt(t.timeStamp)*1000).toISOString().split('T')[0],
      from:   t.from,
      to:     t.to,
      ethVal: (parseFloat(t.value)/1e18).toFixed(6),
      status: t.txreceipt_status === '1' ? 'success' : 'failed',
    })),
    flags,
    riskScore: Math.min(flags.length * 15, 80),
  };
}

async function scanBTCWallet(address) {
  const data = await fetchJSON(`https://blockchain.info/rawaddr/${address}?limit=10`).catch(() => null);
  if (!data) return { address, chain: 'bitcoin', error: 'Lookup failed', flags: ['API unavailable'], riskScore: 0 };

  const txs = data.txs || [];
  const flags = [];
  if (data.final_balance === 0 && txs.length > 0) flags.push('Zero balance — funds moved out');
  if (txs.length === 0) flags.push('No transaction history');

  return {
    address,
    chain: 'bitcoin',
    balanceBTC: data.final_balance / 1e8,
    totalReceived: data.total_received / 1e8,
    totalSent: data.total_sent / 1e8,
    txCount: data.n_tx || 0,
    recentTxs: txs.slice(0, 10).map(t => ({
      hash: t.hash,
      date: new Date(t.time * 1000).toISOString().split('T')[0],
      value: t.out?.reduce((s,o) => s + (o.value||0), 0) / 1e8,
    })),
    flags,
    riskScore: Math.min(flags.length * 15, 80),
  };
}
