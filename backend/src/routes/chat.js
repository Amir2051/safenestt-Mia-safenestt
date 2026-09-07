import { Router } from 'express';
import { chatAgentStream } from '../services/aiService.js';
import {
  createConversation, getSessionConversations, deleteConversation,
  saveMessage, getConversationMessages, updateConversationTitle
} from '../services/supabaseService.js';

const router = Router();

async function tryDB(fn) {
  try { return await fn(); } catch { return null; }
}

// GET /api/chat/conversations
router.get('/conversations', async (req, res) => {
  const data = await tryDB(() => getSessionConversations(req.sessionId));
  res.json(data || []);
});

// POST /api/chat/conversations
router.post('/conversations', async (req, res) => {
  const conv = await tryDB(() => createConversation(req.sessionId, req.body.title));
  conv ? res.status(201).json(conv) : res.status(503).json({ error: 'DB unavailable' });
});

// DELETE /api/chat/conversations/:id
router.delete('/conversations/:id', async (req, res) => {
  await tryDB(() => deleteConversation(req.params.id, req.sessionId));
  res.json({ success: true });
});

// GET /api/chat/conversations/:id/messages
router.get('/conversations/:id/messages', async (req, res) => {
  const data = await tryDB(() => getConversationMessages(req.params.id));
  res.json(data || []);
});

// POST /api/chat/stream — agentic SSE stream with tool use
router.post('/stream', async (req, res, next) => {
  try {
    const { content, history = [], conversation_id } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'content is required' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Persist conversation (best-effort)
    let convId = conversation_id;
    if (!convId) {
      const conv = await tryDB(() => createConversation(req.sessionId, content.slice(0, 60)));
      if (conv) {
        convId = conv.id;
        res.write(`data: ${JSON.stringify({ conversation_id: convId })}\n\n`);
      }
    }
    if (convId) await tryDB(() => saveMessage({ conversation_id: convId, role: 'user', content }));

    // Build message list
    const messages = [...history.slice(-20), { role: 'user', content }];

    // Agentic stream
    let full = '';
    const agentStream = chatAgentStream(messages);

    for await (const event of agentStream) {
      if (event.type === 'delta') {
        full += event.text;
        res.write(`data: ${JSON.stringify({ delta: event.text })}\n\n`);
      } else if (event.type === 'tool_start') {
        res.write(`data: ${JSON.stringify({ tool_call: { name: event.name, input: event.input } })}\n\n`);
      } else if (event.type === 'tool_done') {
        res.write(`data: ${JSON.stringify({ tool_result: { name: event.name } })}\n\n`);
      }
    }

    // Persist AI reply (best-effort)
    if (convId && full) {
      await tryDB(() => saveMessage({ conversation_id: convId, role: 'assistant', content: full }));
      if (!history.length) tryDB(() => updateConversationTitle(convId, content.slice(0, 60)));
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) { next(err); }
});

export default router;
