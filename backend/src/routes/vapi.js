import { Router } from 'express';
import { randomUUID } from 'crypto';
import { spawn } from 'child_process';

const router = Router();

const HERMES_BIN = '/home/ronzoro/.local/bin/hermes';
const HERMES_TIMEOUT_MS = 180_000;
const SESSION_TTL_MS = 1000 * 60 * 60 * 4;

const sessions = new Map();
const sweep = () => {
  const now = Date.now();
  for (const [k, v] of sessions) {
    if (now - v.updatedAt > SESSION_TTL_MS) sessions.delete(k);
  }
};
setInterval(sweep, 60_000).unref?.();

async function runHermes(query, sessionId) {
  const args = ['chat', '-q', query, '--quiet', '--source', 'tool', '--no-restore-cwd', '--safe-mode', '--ignore-user-config', '-m', 'stepfun/step-3.7-flash:free', '--provider', 'nous'];
  const env = { ...process.env, HERMES_HOME: '/home/ronzoro/.hermes' };
  if (sessionId) args.push('--resume', sessionId);

  return new Promise((resolve) => {
    const proc = spawn(HERMES_BIN, args, { env });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      try { proc.kill('SIGTERM'); } catch (killError) {
        if (killError?.code !== 'ESRCH') console.error('Could not stop Hermes process:', killError.message);
      }
      resolve({ text: '[Hermes timed out]', sessionId: null });
    }, HERMES_TIMEOUT_MS);

    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => { stderr += d.toString(); });
    proc.on('error', () => {
      clearTimeout(timer);
      resolve({ text: '[Hermes unavailable]', sessionId: null });
    });
    proc.on('close', _code => {
      clearTimeout(timer);
      const lines = (stdout || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const resultLine = lines.find(l => l.startsWith('session_id:')) || '';
      const match = resultLine.match(/session_id:\s*([^\s]+)/);
      const resolvedSession = match ? match[1] : (sessionId || null);
      const textLines = lines.filter(l => !l.startsWith('session_id:')).filter(Boolean);
      const text = textLines.join(' ').trim() || (stderr.trim() ? `[Hermes error] ${stderr.trim().slice(-1000)}` : '[Hermes returned no output]');
      resolve({ text, sessionId: resolvedSession });
    });
  });
}

router.post('/webhook', async (req, res) => {
  const body = req.body || {};
  const type = body.type;
  const call = body.call || {};
  const callId = call.id || ('call-' + randomUUID());

  if (type === 'function-call') {
    const fn = body.functionCall || {};
    const name = typeof fn.name === 'string' ? fn.name : '';
    const arguments_ = typeof fn.arguments === 'string' ? fn.arguments : '{}';

    if (name === 'verify_rz') {
      return res.redirect(307, `/vapi/verify-rz`);
    }

    let parsed;
    try { parsed = JSON.parse(arguments_); } catch { parsed = {}; }

    const query = typeof parsed.query === 'string' ? parsed.query.trim() : '';
    if (!query) return res.status(400).json({ error: 'query is required' });

    const existing = sessions.get(callId);
    const sessionId = parsed.session_id || existing?.sessionId || null;
    const { text, sessionId: newSessionId } = await runHermes(query, sessionId);
    if (newSessionId) sessions.set(callId, { sessionId: newSessionId, updatedAt: Date.now() });

    return res.status(200).json({
      result: text,
      session_id: newSessionId,
    });
  }

  return res.status(200).json({ ok: true });
});

export default router;
