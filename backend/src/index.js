import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });

import chatRoutes      from './routes/chat.js';
import ttsRoutes       from './routes/tts.js';
import casesRoutes     from './routes/cases.js';
import cryptoRoutes    from './routes/crypto.js';
import trackingRoutes  from './routes/tracking.js';
import alertsRoutes    from './routes/alerts.js';
import reportsRoutes   from './routes/reports.js';
import osintRoutes     from './routes/osint.js';
import { sessionMiddleware } from './middleware/sessionMiddleware.js';
import { logger } from './utils/logger.js';

const app  = express();
const PORT = process.env.PORT || 4000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

app.use('/api/chat', rateLimit({ windowMs: 60_000, max: 30, message: { error: 'Rate limit exceeded' } }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));
app.use(sessionMiddleware);

// Public tracking hit — no session needed
app.get('/t/:id', async (req, res) => {
  const { trackingLinks } = await import('./db/index.js');
  const link = trackingLinks.get(req.params.id);
  if (!link) return res.status(404).send('Not found');
  const ip        = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'] || '';
  const referer   = req.headers['referer'] || '';
  trackingLinks.addHit(link.id, { ip, userAgent, referer });
  if (link.redirect_url) return res.redirect(302, link.redirect_url);
  const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  res.set('Content-Type', 'image/gif').send(pixel);
});

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'SafeNestT Mia API', ts: new Date().toISOString() }));

app.use('/api/chat',     chatRoutes);
app.use('/api/tts',      ttsRoutes);
app.use('/api/cases',    casesRoutes);
app.use('/api/crypto',   cryptoRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/alerts',   alertsRoutes);
app.use('/api/reports',  reportsRoutes);
app.use('/api/osint',    osintRoutes);

// Intake public routes handled via /api/cases/intake/:token in casesRoutes

app.use((_, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, _next) => {
  logger.error(`${req.method} ${req.path} — ${err.message}`);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => logger.info(`SafeNestT Mia API running on port ${PORT}`));
export default app;
