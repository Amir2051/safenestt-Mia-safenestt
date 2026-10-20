import { Router } from 'express';

const router = Router();

const SECRET = (process.env.RZ_VERIFICATION_SECRET || '').trim() || null;
const MAX_ATTEMPTS = 3;
const TTL_MS = 1000 * 60 * 60;

const store = new Map();
const sweep = () => {
  const now = Date.now();
  for (const [k, v] of store) {
    if (now - v.updatedAt > TTL_MS) store.delete(k);
  }
};
setInterval(sweep, 60_000).unref?.();

function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  let result = 0;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    const ca = i < a.length ? a.charCodeAt(i) : 0;
    const cb = i < b.length ? b.charCodeAt(i) : 0;
    result |= ca ^ cb;
  }
  return result === 0;
}

router.post('/verify-rz', (req, res) => {
  if (!SECRET) {
    return res.status(503).json({ verified: false });
  }

  const callId = req.body?.message?.call?.id;
  const args = Array.isArray(req.body?.message?.toolCallList) ? req.body.message.toolCallList : [];
  const payload = args.find(item => item && typeof item.arguments === 'string');
  if (!callId || !payload) {
    return res.status(400).json({ verified: false });
  }

  let parsed;
  try {
    parsed = JSON.parse(payload.arguments);
  } catch {
    return res.status(400).json({ verified: false });
  }

  const suppliedSecret = typeof parsed.supplied_secret === 'string' ? parsed.supplied_secret : '';
  const suppliedCallId = typeof parsed.call_id === 'string' ? parsed.call_id : '';
  if (suppliedCallId !== callId) {
    return res.status(400).json({ verified: false });
  }

  const now = Date.now();
  const record = store.get(callId);
  if (!record || now - record.updatedAt > TTL_MS) {
    store.set(callId, { attempts: 0, updatedAt: now });
  }
  const entry = store.get(callId);
  entry.attempts += 1;
  entry.updatedAt = now;

  if (entry.attempts > MAX_ATTEMPTS) {
    return res.status(429).json({ verified: false });
  }

  const ok = constantTimeEqual(suppliedSecret, SECRET);
  if (ok) store.delete(callId);
  return res.status(200).json({ verified: ok });
});

export default router;
