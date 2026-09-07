import { Router } from 'express';
import { trackingLinks } from '../db/index.js';

const router = Router();

// List all tracking links
router.get('/', (req, res) => {
  res.json(trackingLinks.list(req.query.caseId || null));
});

// Create tracking link
router.post('/', (req, res) => {
  const { caseId, label, redirectUrl } = req.body;
  if (!label) return res.status(400).json({ error: 'label is required' });
  const id  = trackingLinks.create({ case_id: caseId || null, label, redirect_url: redirectUrl || null });
  const url = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/t/${id}`;
  res.status(201).json({ id, url, trackingUrl: url });
});

// Public tracking hit — called when target clicks link
router.get('/hit/:id', (req, res) => {
  const link = trackingLinks.get(req.params.id);
  if (!link) return res.status(404).send('Not found');

  const ip        = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'] || '';
  const referer   = req.headers['referer'] || '';

  trackingLinks.addHit(link.id, { ip, userAgent, referer });

  if (link.redirect_url) {
    return res.redirect(302, link.redirect_url);
  }
  // Transparent 1x1 pixel fallback
  const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  res.set('Content-Type', 'image/gif').send(pixel);
});

// View hit stats for a link
router.get('/:id/stats', (req, res) => {
  const link = trackingLinks.get(req.params.id);
  if (!link) return res.status(404).json({ error: 'Not found' });
  const hits = trackingLinks.hits(req.params.id);
  res.json({ link, hits, total: hits.length });
});

// Delete tracking link
router.delete('/:id', (req, res) => {
  trackingLinks.delete(req.params.id);
  res.json({ message: 'Tracking link deleted' });
});

export default router;
