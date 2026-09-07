import fetch from 'node-fetch';
import { config } from '../utils/config.js';

// ── Public news search (NewsAPI) ──────────────────────────────────────────────
export async function searchNews(query, maxResults = 5) {
  if (!config.newsApiKey) {
    // Fallback: GNews free API (no key needed for basic use)
    const r = await fetch(`https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=${maxResults}&apikey=&token=`).catch(() => null);
    // GNews needs a key too — use a basic fallback
    return searchNewsHN(query);
  }

  const r = await fetch(
    `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&pageSize=${maxResults}&sortBy=relevancy&apiKey=${config.newsApiKey}`
  );
  if (!r.ok) return searchNewsHN(query);
  const d = await r.json();
  return (d.articles || []).map(a => ({
    title:       a.title,
    source:      a.source?.name,
    publishedAt: a.publishedAt?.split('T')[0],
    url:         a.url,
    summary:     a.description,
  }));
}

// Fallback: Hacker News Algolia API (no key, public)
async function searchNewsHN(query) {
  const r = await fetch(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=8`);
  const d = await r.json();
  return (d.hits || []).map(h => ({
    title:       h.title,
    source:      'Hacker News',
    publishedAt: h.created_at?.split('T')[0],
    url:         h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
    summary:     null,
  }));
}

// ── Wikipedia public data ─────────────────────────────────────────────────────
export async function searchWikipedia(query) {
  const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`);
  if (!r.ok) return null;
  const d = await r.json();
  return { title: d.title, summary: d.extract, url: d.content_urls?.desktop?.page };
}

// ── OFAC / Sanctions check (public SDN list via treasury.gov) ─────────────────
export async function checkSanctions(name) {
  // OFAC has a public API — returns basic match results
  const encoded = encodeURIComponent(name);
  try {
    const r = await fetch(`https://api.trade.gov/v1/consolidated_screening_list/search?name=${encoded}&api_key=DEMO_KEY`);
    if (!r.ok) return { checked: false, reason: 'API unavailable' };
    const d = await r.json();
    const hits = (d.results || []).slice(0, 5);
    return {
      checked: true,
      hits:    hits.map(h => ({
        name:   h.name,
        type:   h.type,
        source: h.source,
        country: h.addresses?.[0]?.country,
      })),
      isFlagged: hits.length > 0,
    };
  } catch {
    return { checked: false, reason: 'Network error' };
  }
}

// ── Domain WHOIS (public RDAP) ────────────────────────────────────────────────
export async function lookupDomain(domain) {
  const r = await fetch(`https://rdap.org/domain/${domain}`).catch(() => null);
  if (!r?.ok) return null;
  const d = await r.json();
  return {
    domain,
    registered: d.events?.find(e => e.eventAction === 'registration')?.eventDate,
    expires:    d.events?.find(e => e.eventAction === 'expiration')?.eventDate,
    registrar:  d.entities?.[0]?.vcardArray?.[1]?.find(v => v[0] === 'fn')?.[3],
    status:     d.status,
  };
}
