import fetch from 'node-fetch';
import { config } from '../utils/config.js';

const COINGECKO  = 'https://api.coingecko.com/api/v3';
const ETHERSCAN  = 'https://api.etherscan.io/api';

// ── CoinGecko ─────────────────────────────────────────────────────────────────
export async function searchToken(query) {
  const r = await fetch(`${COINGECKO}/search?query=${encodeURIComponent(query)}`);
  const d = await r.json();
  return (d.coins || []).slice(0, 5).map(c => ({
    id: c.id, name: c.name, symbol: c.symbol, rank: c.market_cap_rank,
  }));
}

export async function getTokenData(coinId) {
  const r = await fetch(`${COINGECKO}/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`);
  const d = await r.json();
  if (d.error) throw new Error(d.error);

  const price    = d.market_data?.current_price?.usd || 0;
  const change1h = d.market_data?.price_change_percentage_1h_in_currency?.usd || 0;
  const change24h= d.market_data?.price_change_percentage_24h || 0;
  const change7d = d.market_data?.price_change_percentage_7d  || 0;
  const volume24h= d.market_data?.total_volume?.usd || 0;
  const mcap     = d.market_data?.market_cap?.usd   || 0;
  const ath      = d.market_data?.ath?.usd           || 0;
  const athDate  = d.market_data?.ath_date?.usd      || '';

  return {
    id: d.id, name: d.name, symbol: d.symbol?.toUpperCase(),
    price, change1h, change24h, change7d,
    volume24h, mcap, ath, athDate,
    rank:        d.market_cap_rank,
    launchDate:  d.genesis_date,
    description: d.description?.en?.slice(0, 300),
    platforms:   Object.keys(d.platforms || {}),
    contractAddresses: d.platforms || {},
    homepage:    d.links?.homepage?.[0],
    reddit:      d.links?.subreddit_url,
    twitter:     d.links?.twitter_screen_name,
    github:      d.links?.repos_url?.github?.[0],
  };
}

export async function getMarketChart(coinId, days = 30) {
  const r = await fetch(`${COINGECKO}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`);
  const d = await r.json();
  return {
    prices:  d.prices  || [],
    volumes: d.total_volumes || [],
  };
}

// ── Risk scoring ──────────────────────────────────────────────────────────────
export function scoreToken(data, chart) {
  let score = 0;
  const flags = [];

  // Extreme price change
  if (Math.abs(data.change24h) > 100) { score += 30; flags.push(`±${data.change24h.toFixed(0)}% in 24h`); }
  else if (Math.abs(data.change24h) > 50) { score += 15; flags.push(`±${data.change24h.toFixed(0)}% in 24h`); }

  // No market cap or very small
  if (!data.mcap || data.mcap < 100_000) { score += 25; flags.push('Market cap under $100K'); }

  // No rank
  if (!data.rank) { score += 20; flags.push('Not ranked on CoinGecko'); }

  // No contract or no platform
  if (Object.keys(data.contractAddresses || {}).length === 0) { score += 10; flags.push('No contract address listed'); }

  // No website
  if (!data.homepage) { score += 10; flags.push('No official website'); }

  // Launched recently (< 30 days)
  if (data.launchDate) {
    const ageDays = (Date.now() - new Date(data.launchDate).getTime()) / 86400000;
    if (ageDays < 30) { score += 20; flags.push(`Launched only ${Math.ceil(ageDays)} days ago`); }
  }

  // Volume spike detection
  if (chart?.volumes?.length > 7) {
    const recent = chart.volumes.slice(-3).map(v => v[1]);
    const older  = chart.volumes.slice(-10, -3).map(v => v[1]);
    const avgRecent = recent.reduce((a,b)=>a+b,0)/recent.length;
    const avgOlder  = older.reduce((a,b)=>a+b,0)/older.length;
    if (avgOlder > 0 && avgRecent / avgOlder > 5) {
      score += 20; flags.push(`Volume spike: ${(avgRecent/avgOlder).toFixed(1)}x recent vs 7-day avg`);
    }
  }

  return { score: Math.min(score, 100), flags };
}

// ── Etherscan wallet lookup ───────────────────────────────────────────────────
export async function getWalletInfo(address) {
  const params = (p) => new URLSearchParams({ ...p, apikey: config.etherscanKey });

  const [balRes, txRes] = await Promise.all([
    fetch(`${ETHERSCAN}?${params({ module: 'account', action: 'balance', address, tag: 'latest' })}`),
    fetch(`${ETHERSCAN}?${params({ module: 'account', action: 'txlist', address, startblock: 0, endblock: 99999999, sort: 'desc', offset: 10, page: 1 })}`),
  ]);

  const balData = await balRes.json();
  const txData  = await txRes.json();

  return {
    address,
    balanceEth: parseFloat(balData.result || 0) / 1e18,
    recentTxs: (Array.isArray(txData.result) ? txData.result : []).map(tx => ({
      hash:    tx.hash,
      date:    new Date(parseInt(tx.timeStamp) * 1000).toISOString().split('T')[0],
      from:    tx.from,
      to:      tx.to,
      ethVal:  (parseFloat(tx.value) / 1e18).toFixed(6),
      status:  tx.txreceipt_status === '1' ? 'OK' : 'FAIL',
    })),
  };
}
