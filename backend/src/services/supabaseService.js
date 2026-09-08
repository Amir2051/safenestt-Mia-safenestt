import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { randomBytes } from 'node:crypto';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });

// Lazy client — won't crash if env vars are missing at startup
let _supabase = null;
function getClient() {
  if (!_supabase) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) return null;
    _supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  }
  return _supabase;
}
const supabase = new Proxy({}, {
  get: (_, prop) => {
    const client = getClient();
    if (!client) throw new Error('Supabase not configured');
    return client[prop].bind(client);
  }
});

// ── Users ──────────────────────────────────────────────────────────────────────
function generateUserId() {
  // Match the 24-char hex ids already present in the users table.
  return randomBytes(12).toString('hex');
}

export async function upsertUser({ id, email, name, _avatar_url, _provider }) {
  if (!email || typeof email !== 'string') {
    throw new Error('email is required for upsertUser');
  }

  const canonicalId = id && /^[0-9a-f]{24}$/i.test(id) ? id : generateUserId();

  const { data: existing, error: fetchError } = await supabase
    .from('users')
    .select('id, role, hashed_password')
    .eq('email', email)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (existing) {
    const safeUpdate = {
      full_name: name || existing.full_name || email,
    };

    const { data, error } = await supabase
      .from('users')
      .update(safeUpdate)
      .eq('email', email)
      .select('id, email, full_name, role, created_at')
      .single();

    if (error) throw error;
    return data;
  }

  const payload = {
    id: canonicalId,
    email,
    full_name: name || email,
    role: 'user',
    hashed_password: '',
    is_active: true,
  };

  const { data, error } = await supabase
    .from('users')
    .insert(payload)
    .select('id, email, full_name, role, created_at')
    .single();

  if (error) throw error;
  return data;
}

export async function getUserById(id) {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, full_name, role, created_at')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

// ── Conversations ─────────────────────────────────────────────────────────────
export async function createConversation(sessionId, title = 'New Chat') {
  const { data, error } = await supabase
    .from('conversations')
    .insert({ session_id: sessionId, title })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getSessionConversations(sessionId) {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('session_id', sessionId)
    .order('updated_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
}

export async function updateConversationTitle(id, title) {
  const { error } = await supabase
    .from('conversations')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteConversation(id, sessionId) {
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', id)
    .eq('session_id', sessionId);
  if (error) throw error;
}

// ── Messages ──────────────────────────────────────────────────────────────────
export async function saveMessage({ conversation_id, role, content }) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id, role, content })
    .select()
    .single();
  if (error) throw error;

  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversation_id);

  return data;
}

export async function getConversationMessages(conversationId, limit = 100) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data;
}

export default supabase;
