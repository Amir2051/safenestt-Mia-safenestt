import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });

const VT_KEY       = process.env.VIRUSTOTAL_API_KEY    || '';
const ABUSE_KEY    = process.env.ABUSEIPDB_API_KEY     || '';
const HIBP_KEY     = process.env.HIBP_API_KEY          || '';
const SHODAN_KEY   = process.env.SHODAN_API_KEY        || '';
const EMAILREP_KEY = process.env.EMAILREP_API_KEY      || '';

async function get(url, opts = {}) {
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'SafeNestT-Mia/1.0', ...opts.headers },
      signal: AbortSignal.timeout(8000),
      ...opts,
    });
    if (!r.ok) return { error: `HTTP ${r.status}` };
    return r.json();
  } catch (e) {
    return { error: e.message };
  }
}

async function getText(url, opts = {}) {
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'SafeNestT-Mia/1.0', ...opts.headers },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return { error: `HTTP ${r.status}` };
    return { text: await r.text() };
  } catch (e) {
    return { error: e.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// IP ADDRESS TOOLS
// ─────────────────────────────────────────────────────────────────────────────

export async function ipGeolocate(ip) {
  const d = await get(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,asname,reverse,mobile,proxy,hosting,query`);
  if (d.error || d.status === 'fail') return { tool: 'IP Geolocation', error: d.message || d.error };
  return {
    tool: 'IP Geolocation (ip-api)',
    data: {
      ip: d.query, country: d.country, countryCode: d.countryCode,
      region: d.regionName, city: d.city, zip: d.zip,
      lat: d.lat, lon: d.lon, timezone: d.timezone,
      isp: d.isp, org: d.org, asn: d.as, asnName: d.asname,
      reverseDns: d.reverse,
      flags: [
        d.proxy && 'Proxy/VPN detected',
        d.hosting && 'Hosting/datacenter IP',
        d.mobile && 'Mobile network',
      ].filter(Boolean),
    },
  };
}

export async function ipRdap(ip) {
  const d = await get(`https://rdap.org/ip/${ip}`);
  if (d.error) return { tool: 'IP RDAP', error: d.error };
  return {
    tool: 'IP RDAP',
    data: {
      handle: d.handle,
      name:   d.name,
      type:   d.type,
      country: d.country,
      startAddress: d.startAddress,
      endAddress:   d.endAddress,
      entities: (d.entities || []).slice(0, 3).map(e => ({
        name: e.vcardArray?.[1]?.find(v => v[0] === 'fn')?.[3],
        roles: e.roles,
      })),
    },
  };
}

export async function ipAbuse(ip) {
  if (!ABUSE_KEY) return { tool: 'AbuseIPDB', skipped: true, reason: 'ABUSEIPDB_API_KEY not set' };
  const d = await get(`https://api.abuseipdb.com/api/v2/check?ipAddress=${ip}&maxAgeInDays=90&verbose`, {
    headers: { Key: ABUSE_KEY, Accept: 'application/json' },
  });
  if (d.error) return { tool: 'AbuseIPDB', error: d.error };
  const r = d.data || {};
  return {
    tool: 'AbuseIPDB',
    data: {
      abuseScore:    r.abuseConfidenceScore,
      totalReports:  r.totalReports,
      lastReported:  r.lastReportedAt,
      isTor:         r.isTor,
      isWhitelisted: r.isWhitelisted,
      countryCode:   r.countryCode,
      isp:           r.isp,
      domain:        r.domain,
    },
  };
}

export async function ipShodan(ip) {
  if (!SHODAN_KEY) return { tool: 'Shodan', skipped: true, reason: 'SHODAN_API_KEY not set' };
  const d = await get(`https://api.shodan.io/shodan/host/${ip}?key=${SHODAN_KEY}`);
  if (d.error) return { tool: 'Shodan', error: typeof d.error === 'string' ? d.error : JSON.stringify(d.error) };

  // Extract banner details per open port
  const services = (d.data || []).slice(0, 15).map(s => ({
    port:      s.port,
    transport: s.transport,
    module:    s._shodan?.module,
    product:   s.product,
    version:   s.version,
    cpe:       s.cpe23 || s.cpe || [],
    banner:    (s.data || '').slice(0, 120).trim(),
    ssl:       s.ssl ? { cipher: s.ssl.cipher?.name, version: s.ssl.version, subject: s.ssl.cert?.subject?.CN } : null,
    http:      s.http ? { status: s.http.status, title: s.http.title, server: s.http.server } : null,
    vulns:     s.vulns ? Object.keys(s.vulns) : [],
  }));

  const allVulns = [...new Set(services.flatMap(s => s.vulns).concat(d.vulns ? Object.keys(d.vulns) : []))];

  return {
    tool: 'Shodan',
    data: {
      ip:         d.ip_str,
      org:        d.org,
      isp:        d.isp,
      asn:        d.asn,
      country:    d.country_name,
      region:     d.region_code,
      city:       d.city,
      os:         d.os,
      openPorts:  d.ports || [],
      hostnames:  d.hostnames || [],
      domains:    d.domains || [],
      tags:       d.tags || [],
      lastUpdate: d.last_update,
      totalBanners: (d.data || []).length,
      services,
      vulns:      allVulns,
      flags: [
        allVulns.length > 0 && `⚠ ${allVulns.length} CVE(s) detected: ${allVulns.slice(0, 3).join(', ')}`,
        (d.tags || []).includes('vpn') && '⚠ VPN endpoint detected',
        (d.tags || []).includes('tor') && '⚠ Tor exit node',
      ].filter(Boolean),
    },
  };
}

// Resolve domain → IP via Shodan DNS, then run full host scan
export async function domainShodan(domain) {
  if (!SHODAN_KEY) return { tool: 'Shodan (Domain)', skipped: true, reason: 'SHODAN_API_KEY not set' };

  // Step 1: resolve hostname to IP
  const resolve = await get(`https://api.shodan.io/dns/resolve?hostnames=${domain}&key=${SHODAN_KEY}`);
  if (resolve.error) return { tool: 'Shodan (Domain)', error: resolve.error };

  const ip = resolve[domain];
  if (!ip) return { tool: 'Shodan (Domain)', data: { domain, resolved: false, note: 'Domain not in Shodan DNS database' } };

  // Step 2: full host scan on resolved IP
  const host = await ipShodan(ip);
  return {
    tool: 'Shodan (Domain → Host)',
    data: {
      domain,
      resolvedIp: ip,
      ...(host.data || {}),
    },
  };
}

export async function ipVirusTotal(ip) {
  if (!VT_KEY) return { tool: 'VirusTotal (IP)', skipped: true, reason: 'VIRUSTOTAL_API_KEY not set' };
  const d = await get(`https://www.virustotal.com/api/v3/ip_addresses/${ip}`, {
    headers: { 'x-apikey': VT_KEY },
  });
  if (d.error) return { tool: 'VirusTotal (IP)', error: d.error.message };
  const stats = d.data?.attributes?.last_analysis_stats || {};
  return {
    tool: 'VirusTotal (IP)',
    data: {
      malicious:  stats.malicious || 0,
      suspicious: stats.suspicious || 0,
      harmless:   stats.harmless || 0,
      undetected: stats.undetected || 0,
      reputation: d.data?.attributes?.reputation,
      asOwner:    d.data?.attributes?.as_owner,
      country:    d.data?.attributes?.country,
      tags:       d.data?.attributes?.tags || [],
    },
  };
}

export async function reverseIP(ip) {
  const d = await getText(`https://api.hackertarget.com/reverseiplookup/?q=${ip}`);
  if (d.error) return { tool: 'Reverse IP', error: d.error };
  const hosts = (d.text || '').split('\n').map(s => s.trim()).filter(Boolean);
  return { tool: 'Reverse IP (HackerTarget)', data: { hosts, count: hosts.length } };
}

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN TOOLS
// ─────────────────────────────────────────────────────────────────────────────

export async function domainWhois(domain) {
  const d = await get(`https://rdap.org/domain/${domain}`);
  if (d.error) return { tool: 'WHOIS/RDAP', error: d.error };
  const reg    = d.events?.find(e => e.eventAction === 'registration')?.eventDate;
  const exp    = d.events?.find(e => e.eventAction === 'expiration')?.eventDate;
  const upd    = d.events?.find(e => e.eventAction === 'last changed')?.eventDate;
  const regName = d.entities?.[0]?.vcardArray?.[1]?.find(v => v[0] === 'fn')?.[3];
  const ageDays = reg ? Math.floor((Date.now() - new Date(reg)) / 86400000) : null;
  return {
    tool: 'WHOIS/RDAP',
    data: {
      domain, registrar: regName,
      registered: reg?.split('T')[0],
      expires:    exp?.split('T')[0],
      updated:    upd?.split('T')[0],
      status:     d.status || [],
      ageDays,
      flags: [ageDays !== null && ageDays < 90 && `⚠ Domain only ${ageDays} days old — phishing risk`].filter(Boolean),
    },
  };
}

export async function domainDns(domain) {
  const d = await getText(`https://api.hackertarget.com/dnslookup/?q=${domain}`);
  if (d.error) return { tool: 'DNS Lookup', error: d.error };
  const records = (d.text || '').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('API'));
  return { tool: 'DNS Records (HackerTarget)', data: { records } };
}

export async function domainCertHistory(domain) {
  const d = await get(`https://crt.sh/?q=%.${domain}&output=json`);
  if (d.error || !Array.isArray(d)) return { tool: 'Certificate History', error: d.error || 'No data' };
  const certs = d.slice(0, 20).map(c => ({
    cn:       c.common_name,
    issuer:   c.issuer_name?.match(/O=([^,]+)/)?.[1]?.trim(),
    notBefore:c.not_before?.split('T')[0],
    notAfter: c.not_after?.split('T')[0],
  }));
  const subdomains = [...new Set(d.map(c => c.common_name).filter(cn => cn?.endsWith(domain)))];
  return {
    tool: 'Certificate Transparency (crt.sh)',
    data: { totalCerts: d.length, recentCerts: certs, subdomains: subdomains.slice(0, 30) },
  };
}

export async function domainUrlScan(domain) {
  const d = await get(`https://urlscan.io/api/v1/search/?q=domain:${domain}&size=5`);
  if (d.error) return { tool: 'URLScan.io', error: d.error };
  const results = (d.results || []).map(r => ({
    url:       r.page?.url,
    ip:        r.page?.ip,
    country:   r.page?.country,
    server:    r.page?.server,
    malicious: r.verdicts?.overall?.malicious,
    score:     r.verdicts?.overall?.score,
    date:      r.task?.time?.split('T')[0],
  }));
  return { tool: 'URLScan.io', data: { results, total: d.total } };
}

export async function domainVirusTotal(domain) {
  if (!VT_KEY) return { tool: 'VirusTotal (Domain)', skipped: true, reason: 'VIRUSTOTAL_API_KEY not set' };
  const d = await get(`https://www.virustotal.com/api/v3/domains/${domain}`, {
    headers: { 'x-apikey': VT_KEY },
  });
  if (d.error) return { tool: 'VirusTotal (Domain)', error: d.error.message };
  const stats = d.data?.attributes?.last_analysis_stats || {};
  return {
    tool: 'VirusTotal (Domain)',
    data: {
      malicious:   stats.malicious || 0,
      suspicious:  stats.suspicious || 0,
      harmless:    stats.harmless || 0,
      reputation:  d.data?.attributes?.reputation,
      categories:  d.data?.attributes?.categories,
      registrar:   d.data?.attributes?.registrar,
      creationDate:d.data?.attributes?.creation_date,
      tags:        d.data?.attributes?.tags || [],
    },
  };
}

export async function domainSubfinder(domain) {
  const d = await getText(`https://api.hackertarget.com/hostsearch/?q=${domain}`);
  if (d.error) return { tool: 'Subdomain Finder', error: d.error };
  const lines = (d.text || '').split('\n').filter(l => l.trim() && !l.includes('API count'));
  const subs  = lines.map(l => l.split(',')[0]).filter(Boolean);
  return { tool: 'Subdomain Finder (HackerTarget)', data: { subdomains: subs, count: subs.length } };
}

export async function domainPageLinks(domain) {
  const d = await getText(`https://api.hackertarget.com/pagelinks/?q=https://${domain}`);
  if (d.error) return { tool: 'Page Links', error: d.error };
  const links = (d.text || '').split('\n').map(s => s.trim()).filter(s => s.startsWith('http'));
  return { tool: 'Page Links (HackerTarget)', data: { links: links.slice(0, 20), count: links.length } };
}

export async function domainEmailSecurity(domain) {
  const [spf, dmarc] = await Promise.all([
    getText(`https://api.hackertarget.com/dnslookup/?q=${domain}&type=TXT`),
    getText(`https://api.hackertarget.com/dnslookup/?q=_dmarc.${domain}&type=TXT`),
  ]);
  const spfRecord   = (spf.text || '').split('\n').find(l => l.includes('v=spf1'));
  const dmarcRecord = (dmarc.text || '').split('\n').find(l => l.includes('v=DMARC1'));
  return {
    tool: 'Email Security Check',
    data: {
      spf:   spfRecord  || 'Not found',
      dmarc: dmarcRecord || 'Not found',
      flags: [
        !spfRecord   && '⚠ No SPF record — email spoofing risk',
        !dmarcRecord && '⚠ No DMARC record — spoofing unprotected',
      ].filter(Boolean),
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL TOOLS
// ─────────────────────────────────────────────────────────────────────────────

export async function emailBreachCheck(email) {
  if (!HIBP_KEY) return { tool: 'HaveIBeenPwned', skipped: true, reason: 'HIBP_API_KEY not set — get free key at haveibeenpwned.com/API/Key' };
  const d = await get(`https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`, {
    headers: { 'hibp-api-key': HIBP_KEY },
  });
  if (d.error?.includes('404')) return { tool: 'HaveIBeenPwned', data: { breached: false, breaches: [] } };
  if (d.error) return { tool: 'HaveIBeenPwned', error: d.error };
  return {
    tool: 'HaveIBeenPwned',
    data: {
      breached: Array.isArray(d) && d.length > 0,
      count:    Array.isArray(d) ? d.length : 0,
      breaches: (Array.isArray(d) ? d : []).map(b => ({
        name:       b.Name,
        domain:     b.Domain,
        date:       b.BreachDate,
        dataClasses:b.DataClasses,
        verified:   b.IsVerified,
      })),
    },
  };
}

export async function emailReputation(email) {
  if (!EMAILREP_KEY) {
    // emailrep.io allows limited free requests without key
    const d = await get(`https://emailrep.io/${encodeURIComponent(email)}`, {
      headers: { 'User-Agent': 'SafeNestT-Mia/1.0' },
    });
    if (d.error) return { tool: 'EmailRep.io', error: d.error };
    return {
      tool: 'EmailRep.io',
      data: {
        email:       d.email,
        reputation:  d.reputation,
        suspicious:  d.suspicious,
        references:  d.references,
        details: {
          blacklisted:     d.details?.blacklisted,
          maliciousActivity:d.details?.malicious_activity,
          spamActivity:    d.details?.spam,
          freeProvider:    d.details?.free_provider,
          disposable:      d.details?.disposable,
          domainExists:    d.details?.domain_exists,
          domainReputation:d.details?.domain_reputation,
        },
      },
    };
  }
  const d = await get(`https://emailrep.io/${encodeURIComponent(email)}`, {
    headers: { 'Key': EMAILREP_KEY },
  });
  if (d.error) return { tool: 'EmailRep.io', error: d.error };
  return { tool: 'EmailRep.io', data: d };
}

export async function emailDomainInfo(email) {
  const domain = email.split('@')[1];
  if (!domain) return { tool: 'Email Domain Info', error: 'Invalid email' };
  const [whois, mx] = await Promise.all([
    domainWhois(domain),
    getText(`https://api.hackertarget.com/dnslookup/?q=${domain}&type=MX`),
  ]);
  const mxRecords = (mx.text || '').split('\n').filter(l => l.includes('MX'));
  return {
    tool: 'Email Domain Analysis',
    data: {
      domain,
      whois:     whois.data,
      mxRecords,
      disposableProviders: ['guerrillamail','mailinator','tempmail','10minutemail','throwam','yopmail','trashmail'].some(p => domain.includes(p)),
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// USERNAME / SOCIAL MEDIA TOOLS
// ─────────────────────────────────────────────────────────────────────────────

const SOCIAL_PLATFORMS = [
  { name: 'GitHub',      url: 'https://github.com/{}',                   check: 'https://api.github.com/users/{}' },
  { name: 'Reddit',      url: 'https://www.reddit.com/user/{}',           check: 'https://www.reddit.com/user/{}/about.json' },
  { name: 'Twitter/X',   url: 'https://twitter.com/{}',                  check: null },
  { name: 'Instagram',   url: 'https://www.instagram.com/{}/',            check: null },
  { name: 'TikTok',      url: 'https://www.tiktok.com/@{}',              check: null },
  { name: 'LinkedIn',    url: 'https://www.linkedin.com/in/{}',          check: null },
  { name: 'Telegram',    url: 'https://t.me/{}',                         check: null },
  { name: 'YouTube',     url: 'https://www.youtube.com/@{}',             check: null },
  { name: 'Pinterest',   url: 'https://www.pinterest.com/{}',            check: null },
  { name: 'Twitch',      url: 'https://www.twitch.tv/{}',                check: 'https://api.twitch.tv/helix/users?login={}' },
  { name: 'Steam',       url: 'https://steamcommunity.com/id/{}',        check: null },
  { name: 'Snapchat',    url: 'https://www.snapchat.com/add/{}',         check: null },
  { name: 'Pastebin',    url: 'https://pastebin.com/u/{}',               check: null },
  { name: 'HackerNews',  url: 'https://news.ycombinator.com/user?id={}', check: `https://hacker-news.firebaseio.com/v0/user/{}.json` },
  { name: 'Keybase',     url: 'https://keybase.io/{}',                   check: 'https://keybase.io/_/api/1.0/user/lookup.json?username={}' },
  { name: 'GitLab',      url: 'https://gitlab.com/{}',                   check: 'https://gitlab.com/api/v4/users?username={}' },
  { name: 'Medium',      url: 'https://medium.com/@{}',                  check: null },
  { name: 'Dev.to',      url: 'https://dev.to/{}',                       check: 'https://dev.to/api/users/by_username?url={}' },
  { name: 'Gravatar',    url: 'https://gravatar.com/{}',                 check: null },
  { name: 'About.me',    url: 'https://about.me/{}',                     check: null },
];

async function checkPlatform(username, platform) {
  if (!platform.check) {
    // Return URL only — can't check without scraping
    return { name: platform.name, url: platform.url.replace('{}', username), status: 'unverified' };
  }
  try {
    const url = platform.check.replace('{}', username);
    const r   = await fetch(url, {
      headers: { 'User-Agent': 'SafeNestT-Mia/1.0' },
      signal: AbortSignal.timeout(5000),
    });

    if (platform.name === 'Reddit') {
      if (r.status === 200) {
        const d = await r.json();
        return { name: platform.name, url: platform.url.replace('{}', username), status: 'found', karma: d.data?.total_karma };
      }
      return { name: platform.name, url: platform.url.replace('{}', username), status: r.status === 404 ? 'not found' : 'unknown' };
    }

    if (platform.name === 'GitHub') {
      if (r.status === 200) {
        const d = await r.json();
        return { name: platform.name, url: platform.url.replace('{}', username), status: 'found', followers: d.followers, repos: d.public_repos, created: d.created_at?.split('T')[0], bio: d.bio };
      }
      return { name: platform.name, url: platform.url.replace('{}', username), status: r.status === 404 ? 'not found' : 'unknown' };
    }

    if (platform.name === 'HackerNews') {
      if (r.status === 200) {
        const d = await r.json();
        if (d) return { name: platform.name, url: platform.url.replace('{}', username), status: 'found', karma: d.karma, created: d.created };
        return { name: platform.name, url: platform.url.replace('{}', username), status: 'not found' };
      }
    }

    if (platform.name === 'Keybase') {
      if (r.status === 200) {
        const d = await r.json();
        if (d?.them?.length) return { name: platform.name, url: platform.url.replace('{}', username), status: 'found', proofs: d.them[0]?.proofs_summary?.all?.length };
        return { name: platform.name, url: platform.url.replace('{}', username), status: 'not found' };
      }
    }

    if (platform.name === 'GitLab') {
      if (r.status === 200) {
        const d = await r.json();
        if (d?.length) return { name: platform.name, url: platform.url.replace('{}', username), status: 'found', name: d[0]?.name };
        return { name: platform.name, url: platform.url.replace('{}', username), status: 'not found' };
      }
    }

    if (platform.name === 'Dev.to') {
      if (r.status === 200) {
        const d = await r.json();
        return { name: platform.name, url: platform.url.replace('{}', username), status: 'found', name: d.name, joined: d.joined_at?.split('T')[0] };
      }
    }

    return { name: platform.name, url: platform.url.replace('{}', username), status: r.ok ? 'found' : 'not found' };
  } catch {
    return { name: platform.name, url: platform.url.replace('{}', username), status: 'timeout' };
  }
}

export async function usernameSearch(username) {
  const results = await Promise.all(SOCIAL_PLATFORMS.map(p => checkPlatform(username, p)));
  const found   = results.filter(r => r.status === 'found');
  const unverified = results.filter(r => r.status === 'unverified');
  const notFound   = results.filter(r => r.status === 'not found');
  return {
    tool: 'Username Search (20 platforms)',
    data: { username, found, unverified, notFound, totalChecked: results.length },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PHONE TOOLS
// ─────────────────────────────────────────────────────────────────────────────

export async function phoneInfo(phone) {
  // Basic format analysis (no API key needed)
  const cleaned   = phone.replace(/\D/g, '');
  const e164      = phone.startsWith('+') ? phone : `+${cleaned}`;
  const countryCode = cleaned.length > 10 ? cleaned.slice(0, cleaned.length - 10) : '';

  const countryMap = { '1': 'US/Canada', '44': 'UK', '234': 'Nigeria', '233': 'Ghana',
    '27': 'South Africa', '91': 'India', '86': 'China', '7': 'Russia/Kazakhstan',
    '49': 'Germany', '33': 'France', '34': 'Spain', '39': 'Italy', '81': 'Japan', '82': 'South Korea',
    '55': 'Brazil', '52': 'Mexico', '61': 'Australia', '64': 'New Zealand', '31': 'Netherlands',
    '32': 'Belgium', '41': 'Switzerland', '46': 'Sweden', '47': 'Norway', '45': 'Denmark',
    '358': 'Finland', '48': 'Poland', '380': 'Ukraine', '90': 'Turkey', '20': 'Egypt',
    '212': 'Morocco', '213': 'Algeria', '254': 'Kenya', '255': 'Tanzania', '256': 'Uganda',
    '260': 'Zambia', '263': 'Zimbabwe', '225': 'Ivory Coast', '221': 'Senegal', '237': 'Cameroon',
  };

  const country = Object.entries(countryMap).find(([code]) => cleaned.startsWith(code));

  return {
    tool: 'Phone Analysis',
    data: {
      input:       phone,
      e164,
      digits:      cleaned,
      length:      cleaned.length,
      countryCode: countryCode || 'Unknown',
      country:     country ? country[1] : 'Unknown',
      format:      cleaned.length === 11 && cleaned.startsWith('1') ? 'US/CA (NANP)' :
                   cleaned.length === 12 ? 'International' : 'Varies by country',
      voipIndicators: ['google', 'twilio', 'vonage', 'bandwidth', 'textfree', 'textplus'].some(v => phone.toLowerCase().includes(v)) ? 'VOIP keywords detected' : null,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// URL TOOLS
// ─────────────────────────────────────────────────────────────────────────────

export async function urlScanSubmit(url) {
  const search = await get(`https://urlscan.io/api/v1/search/?q=page.url:"${encodeURIComponent(url)}"&size=3`);
  const results = (search.results || []).map(r => ({
    uuid:      r._id,
    url:       r.page?.url,
    ip:        r.page?.ip,
    country:   r.page?.country,
    server:    r.page?.server,
    malicious: r.verdicts?.overall?.malicious,
    score:     r.verdicts?.overall?.score,
    date:      r.task?.time?.split('T')[0],
    screenshot:`https://urlscan.io/screenshots/${r._id}.png`,
  }));
  return { tool: 'URLScan.io (URL)', data: { url, results, total: search.total || 0 } };
}

export async function urlVirusTotal(url) {
  if (!VT_KEY) return { tool: 'VirusTotal (URL)', skipped: true, reason: 'VIRUSTOTAL_API_KEY not set' };
  const id  = Buffer.from(url).toString('base64').replace(/=/g, '');
  const d   = await get(`https://www.virustotal.com/api/v3/urls/${id}`, { headers: { 'x-apikey': VT_KEY } });
  if (d.error) return { tool: 'VirusTotal (URL)', error: d.error.message };
  const stats = d.data?.attributes?.last_analysis_stats || {};
  return {
    tool: 'VirusTotal (URL)',
    data: {
      malicious:  stats.malicious  || 0,
      suspicious: stats.suspicious || 0,
      harmless:   stats.harmless   || 0,
      finalUrl:   d.data?.attributes?.last_final_url,
      title:      d.data?.attributes?.title,
      categories: d.data?.attributes?.categories,
      tags:       d.data?.attributes?.tags || [],
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE HASH TOOLS
// ─────────────────────────────────────────────────────────────────────────────

export async function hashVirusTotal(hash) {
  if (!VT_KEY) return { tool: 'VirusTotal (Hash)', skipped: true, reason: 'VIRUSTOTAL_API_KEY not set' };
  const d = await get(`https://www.virustotal.com/api/v3/files/${hash}`, { headers: { 'x-apikey': VT_KEY } });
  if (d.error) return { tool: 'VirusTotal (Hash)', error: d.error.message };
  const stats = d.data?.attributes?.last_analysis_stats || {};
  return {
    tool: 'VirusTotal (Hash)',
    data: {
      name:        d.data?.attributes?.meaningful_name,
      type:        d.data?.attributes?.type_description,
      size:        d.data?.attributes?.size,
      malicious:   stats.malicious  || 0,
      suspicious:  stats.suspicious || 0,
      harmless:    stats.harmless   || 0,
      md5:         d.data?.attributes?.md5,
      sha1:        d.data?.attributes?.sha1,
      sha256:      d.data?.attributes?.sha256,
      firstSeen:   d.data?.attributes?.first_submission_date,
      tags:        d.data?.attributes?.tags || [],
    },
  };
}

export async function hashMalwareBazaar(hash) {
  try {
    const r = await fetch('https://mb-api.abuse.ch/api/v1/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    `query=get_info&hash=${hash}`,
      signal:  AbortSignal.timeout(8000),
    });
    const d = await r.json();
    if (d.query_status !== 'ok') return { tool: 'MalwareBazaar', data: { found: false } };
    const info = d.data?.[0] || {};
    return {
      tool: 'MalwareBazaar',
      data: {
        found:       true,
        fileName:    info.file_name,
        fileType:    info.file_type,
        signature:   info.signature,
        tags:        info.tags || [],
        firstSeen:   info.first_seen,
        reporter:    info.reporter,
        malwareTags: info.vendor_intel,
      },
    };
  } catch (e) {
    return { tool: 'MalwareBazaar', error: e.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE DORK BUILDER
// ─────────────────────────────────────────────────────────────────────────────

export function buildDorks(target, type) {
  const dorks = {
    person: [
      `"${target}" site:linkedin.com`,
      `"${target}" site:facebook.com OR site:instagram.com`,
      `"${target}" filetype:pdf`,
      `"${target}" "phone" OR "email" OR "address"`,
      `"${target}" site:pipl.com OR site:spokeo.com`,
      `"${target}" intext:"date of birth" OR "born in"`,
    ],
    domain: [
      `site:${target}`,
      `site:${target} filetype:pdf OR filetype:xls OR filetype:doc`,
      `site:${target} intitle:"index of"`,
      `site:${target} inurl:login OR inurl:admin OR inurl:portal`,
      `"${target}" site:pastebin.com`,
      `"${target}" site:github.com`,
      `related:${target}`,
    ],
    email: [
      `"${target}"`,
      `"${target}" site:linkedin.com OR site:github.com`,
      `"${target}" site:pastebin.com`,
      `"${target}" password OR credentials OR leak`,
    ],
    username: [
      `"${target}" site:twitter.com OR site:reddit.com OR site:github.com`,
      `"${target}" site:pastebin.com`,
      `"${target}" profile`,
      `intitle:"${target}" profile`,
    ],
    company: [
      `site:${target}.com filetype:pdf annual report`,
      `"${target}" site:glassdoor.com OR site:indeed.com`,
      `"${target}" breach OR hack OR leak`,
      `"${target}" site:opencorporates.com`,
      `"${target}" CEO OR CFO OR CTO site:linkedin.com`,
    ],
  };
  return { tool: 'Google Dork Builder', data: { target, type, dorks: dorks[type] || dorks.person } };
}

// ─────────────────────────────────────────────────────────────────────────────
// PERSON NAME TOOLS
// ─────────────────────────────────────────────────────────────────────────────

export async function personSearch(name) {
  const [news, wiki, sanctions] = await Promise.all([
    fetch(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(name)}&tags=story&hitsPerPage=5`).then(r=>r.json()).catch(()=>null),
    fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`).then(r=>r.ok?r.json():null).catch(()=>null),
    fetch(`https://api.trade.gov/v1/consolidated_screening_list/search?name=${encodeURIComponent(name)}&api_key=DEMO_KEY`).then(r=>r.json()).catch(()=>null),
  ]);

  return {
    tool: 'Person Search',
    data: {
      name,
      wikipedia:  wiki ? { title: wiki.title, summary: wiki.extract?.slice(0, 300), url: wiki.content_urls?.desktop?.page } : null,
      newsHits:   (news?.hits || []).slice(0, 5).map(h => ({ title: h.title, url: h.url, date: h.created_at?.split('T')[0] })),
      sanctions:  { checked: !!sanctions, hits: (sanctions?.results || []).slice(0, 3), flagged: (sanctions?.results?.length || 0) > 0 },
      dorks:      buildDorks(name, 'person').data.dorks,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ORCHESTRATOR
// ─────────────────────────────────────────────────────────────────────────────

export async function runOsint(target, type) {
  let tools = [];

  if (type === 'ip') {
    tools = await Promise.allSettled([
      ipGeolocate(target), ipRdap(target), ipAbuse(target),
      ipVirusTotal(target), ipShodan(target), reverseIP(target),
    ]);
  } else if (type === 'domain') {
    tools = await Promise.allSettled([
      domainWhois(target), domainDns(target), domainCertHistory(target),
      domainUrlScan(target), domainVirusTotal(target),
      domainSubfinder(target), domainEmailSecurity(target),
      domainShodan(target),
    ]);
  } else if (type === 'email') {
    tools = await Promise.allSettled([
      emailBreachCheck(target), emailReputation(target), emailDomainInfo(target),
    ]);
  } else if (type === 'username') {
    tools = await Promise.allSettled([usernameSearch(target)]);
  } else if (type === 'phone') {
    tools = await Promise.allSettled([phoneInfo(target)]);
  } else if (type === 'url') {
    const domain = target.replace(/^https?:\/\//, '').split('/')[0];
    tools = await Promise.allSettled([
      urlScanSubmit(target), urlVirusTotal(target),
      domainWhois(domain), ipGeolocate(domain),
    ]);
  } else if (type === 'hash') {
    tools = await Promise.allSettled([hashVirusTotal(target), hashMalwareBazaar(target)]);
  } else if (type === 'person') {
    tools = await Promise.allSettled([personSearch(target)]);
  }

  return tools.map(r => r.status === 'fulfilled' ? r.value : { tool: 'unknown', error: r.reason?.message });
}
