const MAX_URL_LENGTH = 2048;
const MAX_BODY_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 14_000;

import * as nodeDns from 'node:dns';

const DEFAULT_ALLOWED_DOMAINS = new Set([
  'api.duckduckgo.com',
  'hn.algolia.com',
  'www.reddit.com',
  'api.gdeltproject.org',
  'r.jina.ai',
  'wttr.in',
  'en.wikipedia.org',
  'api.coingecko.com',
  'api.frankfurter.app',
  'restcountries.com',
  'api.github.com',
  'openlibrary.org',
  'www.omdbapi.com',
  'v2.jokeapi.dev',
  'api.ipify.org',
  'ip-api.com',
  'rdap.org',
  'crt.sh',
  'urlscan.io',
  'api.abuseipdb.com',
  'api.shodan.io',
  'www.virustotal.com',
  'api.hackertarget.com',
  'haveibeenpwned.com',
  'emailrep.io',
  'mb-api.abuse.ch',
  'api.trade.gov',
  'blockchain.info',
  'api.etherscan.io',
  'hacker-news.firebaseio.com',
  'api.twitch.tv',
  'gitlab.com',
  'keybase.io',
  'dev.to',
]);

function parseAllowedDomains() {
  const raw = process.env.ALLOWED_FETCH_DOMAINS || '';
  if (!raw.trim()) return DEFAULT_ALLOWED_DOMAINS;
  return new Set(raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean));
}

function normalizeHost(host) {
  return String(host || '').trim().toLowerCase();
}

function isIpv4(text) {
  return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(text);
}

function parseIPv4(text) {
  if (!isIpv4(text)) return null;
  const [a, b, c, d] = text.split('.').map(Number);
  if ([a, b, c, d].some(n => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return [a, b, c, d];
}

function ipv4ToInt([a, b, c, d]) {
  return ((a << 24) | (b << 16) | (c << 8) | d) >>> 0;
}

function isPrivateOrSpecialIPv4(ip) {
  const parts = parseIPv4(ip);
  if (!parts) return false;
  const n = ipv4ToInt(parts);
  return (
    n >= ipv4ToInt([10, 0, 0, 0]) && n <= ipv4ToInt([10, 255, 255, 255]) ||
    n >= ipv4ToInt([172, 16, 0, 0]) && n <= ipv4ToInt([172, 31, 255, 255]) ||
    n >= ipv4ToInt([192, 168, 0, 0]) && n <= ipv4ToInt([192, 168, 255, 255]) ||
    n >= ipv4ToInt([127, 0, 0, 0]) && n <= ipv4ToInt([127, 255, 255, 255]) ||
    n >= ipv4ToInt([169, 254, 0, 0]) && n <= ipv4ToInt([169, 254, 255, 255]) ||
    n === ipv4ToInt([169, 254, 169, 254]) ||
    n === ipv4ToInt([0, 0, 0, 0])
  );
}

function isIpv6Literal(text) {
  return text.includes(':');
}

function classifyHost(host) {
  const h = normalizeHost(host);
  if (!h) return 'invalid';
  if (h === 'localhost') return 'blocked';
  if (isIpv4(h)) {
    if (isPrivateOrSpecialIPv4(h)) return 'blocked';
    return 'numeric-public';
  }
  if (isIpv6Literal(h)) {
    const lower = h.toLowerCase();
    if (
      lower === '::1' ||
      lower === '[::1]' ||
      lower.startsWith('::ffff:127.') ||
      lower.startsWith('::ffff:10.') ||
      lower.startsWith('::ffff:172.16.') ||
      lower.startsWith('::ffff:192.168.') ||
      lower.startsWith('fe80::') ||
      lower.startsWith('fc') ||
      lower.startsWith('fd')
    ) {
      return 'blocked';
    }
    return 'ipv6-public';
  }
  return 'hostname';
}

function resolveHost(host) {
  return new Promise(resolve => {
    const timeout = setTimeout(() => resolve({ error: 'dns-timeout', host, addresses: [] }), FETCH_TIMEOUT_MS);
    try {
      nodeDns.lookup(host, { all: true }, (err, addresses) => {
        clearTimeout(timeout);
        if (err) return resolve({ error: String(err), host, addresses: [] });
        resolve({ host, addresses: addresses.map(a => a.address) });
      });
    } catch (e) {
      clearTimeout(timeout);
      resolve({ error: e.message || 'dns-error', host, addresses: [] });
    }
  });
}

export function validateFetchTarget(url) {
  const stringified = typeof url === 'string' ? url : String(url);
  if (!stringified || stringified.length > MAX_URL_LENGTH) {
    return { ok: false, error: 'URL is empty or exceeds maximum length' };
  }

  let parsed;
  try {
    parsed = new URL(stringified);
  } catch {
    return { ok: false, error: 'Malformed URL' };
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    return { ok: false, error: 'URL protocol is not allowed' };
  }

  const allowed = parseAllowedDomains();
  const host = normalizeHost(parsed.hostname);
  const hostClass = classifyHost(parsed.hostname);

  if (hostClass === 'invalid' || hostClass === 'blocked') {
    return { ok: false, error: 'URL destination is not allowed' };
  }

  if (hostClass === 'hostname') {
    if (!allowed.has(host)) {
      return { ok: false, error: 'Domain is not in the allowed fetch list' };
    }
  }

  return { ok: true, host, hostClass, parsed };
}

export async function resolveAndValidateFetchTarget(url) {
  const base = validateFetchTarget(url);
  if (!base.ok) return base;

  if (base.hostClass === 'hostname') {
    const resolution = await resolveHost(base.parsed.hostname);
    if (resolution.error) {
      return { ok: false, error: `DNS resolution failed: ${resolution.error}` };
    }
    for (const addr of resolution.addresses) {
      if (isPrivateOrSpecialIPv4(addr) || addr.startsWith('fe80::') || addr.startsWith('fc') || addr.startsWith('fd') || addr === '::1') {
        return { ok: false, error: 'DNS resolution returned a private/internal address' };
      }
    }
  }
  return base;
}

async function safeFetchURL(url, opts = {}) {
  const preflight = validateFetchTarget(url);
  if (!preflight.ok) {
    return Promise.resolve({ _error: preflight.error });
  }

  const stringified = typeof url === 'string' ? url : String(url);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const headers = Object.assign({ 'User-Agent': 'MiaAI/2.0' }, opts.headers || {});
    const req = fetch(stringified, {
      headers,
      signal: controller.signal,
      redirect: 'follow',
      ...opts,
    });
    clearTimeout(timeout);

    const response = await req;
    const finalUrl = response.url || stringified;

    if (finalUrl !== stringified) {
      const redirectValidation = await resolveAndValidateFetchTarget(finalUrl);
      if (!redirectValidation.ok) {
        return { _error: `Redirect to disallowed destination: ${redirectValidation.error}` };
      }
    }

    if (!response.ok) {
      return { ok: false, status: response.status, _error: `HTTP ${response.status}` };
    }

    const chunks = [];
    const reader = response.body.getReader();
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_BODY_BYTES) {
        reader.cancel('body-limit');
        break;
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    return { ok: true, status: response.status, text: new TextDecoder().decode(bytes) };
  } catch (e) {
    if (e?.name === 'AbortError' || String(e).includes('body-limit')) {
      return { _error: 'Request timed out' };
    }
    return { _error: e?.message || 'Fetch failed' };
  }
}

export function validateExternalFetchTarget(targetUrl) {
  return validateFetchTarget(targetUrl);
}

export async function validateExternalFetchTargetWithResolve(targetUrl) {
  return resolveAndValidateFetchTarget(targetUrl);
}

export { safeFetchURL, MAX_BODY_BYTES, FETCH_TIMEOUT_MS };
