import { Router } from 'express';
import { runOsint, buildDorks } from '../services/osintService.js';
import { evidence } from '../db/index.js';

const router = Router();

const TYPES = ['ip','domain','email','username','phone','url','hash','person'];

router.post('/investigate', async (req, res) => {
  const { target, type, caseId } = req.body;
  if (!target) return res.status(400).json({ error: 'target is required' });
  if (!TYPES.includes(type)) return res.status(400).json({ error: `type must be one of: ${TYPES.join(', ')}` });

  try {
    const results = await runOsint(target.trim(), type);

    if (caseId) {
      const summary = results
        .filter(r => !r.error && !r.skipped)
        .map(r => `[${r.tool}] ${JSON.stringify(r.data).slice(0, 200)}`)
        .join('\n');
      evidence.add({
        case_id:     caseId,
        type:        'osint',
        label:       `OSINT: ${type.toUpperCase()} — ${target}`,
        content:     summary,
        submitted_by:'mia-osint',
        metadata:    JSON.stringify({ target, type, toolCount: results.length }),
      });
    }

    res.json({ target, type, results, toolCount: results.length, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/dorks', (req, res) => {
  const { target, type = 'person' } = req.body;
  if (!target) return res.status(400).json({ error: 'target is required' });
  res.json(buildDorks(target, type));
});

router.get('/tools', (_, res) => {
  res.json({
    types: TYPES,
    tools: {
      ip:       ['IP Geolocation (ip-api)', 'IP RDAP', 'AbuseIPDB*', 'VirusTotal*', 'Shodan*', 'Reverse IP'],
      domain:   ['WHOIS/RDAP', 'DNS Records', 'Certificate Transparency (crt.sh)', 'URLScan.io', 'VirusTotal*', 'Subdomain Finder', 'Email Security Check', 'Shodan (Domain→Host)*'],
      email:    ['HaveIBeenPwned*', 'EmailRep.io', 'Email Domain Analysis'],
      username: ['Username Search (20 platforms: GitHub, Reddit, GitLab, HackerNews, Keybase, Dev.to + 14 more)'],
      phone:    ['Phone Analysis (format, country, carrier type)'],
      url:      ['URLScan.io', 'VirusTotal*', 'WHOIS/RDAP', 'IP Geolocation'],
      hash:     ['VirusTotal*', 'MalwareBazaar'],
      person:   ['Person Search (Wikipedia, News, Sanctions, Google Dorks)'],
    },
    note: '* = Requires free API key in .env',
    apiKeys: {
      VIRUSTOTAL_API_KEY:  !!process.env.VIRUSTOTAL_API_KEY,
      ABUSEIPDB_API_KEY:   !!process.env.ABUSEIPDB_API_KEY,
      HIBP_API_KEY:        !!process.env.HIBP_API_KEY,
      SHODAN_API_KEY:      !!process.env.SHODAN_API_KEY,
      EMAILREP_API_KEY:    !!process.env.EMAILREP_API_KEY,
    },
  });
});

export default router;
