import { Router } from 'express';
import { scanToken, scanWallet } from '../services/cryptoService.js';
import { cryptoScans, cases } from '../db/index.js';

const router = Router();

router.post('/token', async (req, res) => {
  const { query, caseId } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });

  try {
    const result = await scanToken(query);
    cryptoScans.save({
      case_id:    caseId || null,
      query,
      type:       'token',
      risk_score: result.score || 0,
      result:     JSON.stringify(result),
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/wallet', async (req, res) => {
  const { address, caseId } = req.body;
  if (!address) return res.status(400).json({ error: 'address is required' });

  try {
    const result = await scanWallet(address);
    cryptoScans.save({
      case_id:    caseId || null,
      query:      address,
      type:       'wallet',
      risk_score: result.riskScore || 0,
      result:     JSON.stringify(result),
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/history', (req, res) => {
  res.json(cryptoScans.list(parseInt(req.query.limit) || 20));
});

export default router;
