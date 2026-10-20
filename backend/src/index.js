import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

import chatRoutes      from './routes/chat.js';
import ttsRoutes       from './routes/tts.js';
import verifyRzRoutes from './routes/verify-rz.js';
import vapiRoutes from './routes/vapi.js';
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

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'MIA Personal Assistant API', ts: new Date().toISOString() }));

app.use('/api/chat',     chatRoutes);
app.use('/api/tts',      ttsRoutes);
app.use('/vapi', verifyRzRoutes);
app.use('/vapi', vapiRoutes);

app.use((_, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, _next) => {
  logger.error(`${req.method} ${req.path} — ${err.message}`);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => logger.info(`MIA API running on port ${PORT}`));
export default app;
