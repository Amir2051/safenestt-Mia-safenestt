// Local fallback storage for chat history (conversations + messages).
// Used only when the configured backed (Supabase) is unreachable, so that
// MIA never loses conversation history.
import Database from 'better-sqlite3';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, '../../../data/mia-local.db');
let _db = null;

function getDb() {
  if (!_db) {
    mkdirSync(dirname(DB_PATH), { recursive: true });
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        title TEXT DEFAULT 'New Chat',
        created_at TEXT,
        updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT,
        role TEXT,
        content TEXT,
        created_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
    `);
  }
  return _db;
}

export function localCreateConversation(sessionId, title = 'New Chat') {
  const d = getDb();
  const id = crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const now = new Date().toISOString();
  d.prepare('INSERT INTO conversations (id, session_id, title, created_at, updated_at) VALUES (?,?,?,?,?)').run(
    id, sessionId, title, now, now
  );
  return { id, session_id: sessionId, title, created_at: now, updated_at: now };
}

export function localGetSessionConversations(sessionId) {
  const d = getDb();
  return d.prepare('SELECT * FROM conversations WHERE session_id = ? ORDER BY updated_at DESC').all(sessionId);
}

export function localUpdateConversationTitle(id, title) {
  const d = getDb();
  const now = new Date().toISOString();
  d.prepare('UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?').run(title, now, id);
}

export function localSaveMessage({ conversation_id, role, content }) {
  const d = getDb();
  const now = new Date().toISOString();
  const id = crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  d.prepare('INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?,?,?,?,?)').run(
    id, conversation_id, role, content, now
  );
  return { id, conversation_id, role, content, created_at: now };
}

export function localGetConversationMessages(conversationId, sessionId, limit = 100) {
  const d = getDb();
  return d.prepare(`SELECT m.* FROM messages m
    INNER JOIN conversations c ON c.id = m.conversation_id
    WHERE m.conversation_id = ? AND c.session_id = ?
    ORDER BY m.created_at ASC LIMIT ?`).all(conversationId, sessionId, limit);
}

export function localConversationBelongsToSession(conversationId, sessionId) {
  return Boolean(getDb().prepare('SELECT 1 FROM conversations WHERE id = ? AND session_id = ?').get(conversationId, sessionId));
}

export function localDeleteConversation(id, sessionId) {
  const d = getDb();
  const remove = d.transaction(() => {
    const owned = d.prepare('SELECT 1 FROM conversations WHERE id = ? AND session_id = ?').get(id, sessionId);
    if (!owned) return false;
    d.prepare('DELETE FROM messages WHERE conversation_id = ?').run(id);
    d.prepare('DELETE FROM conversations WHERE id = ? AND session_id = ?').run(id, sessionId);
    return true;
  });
  return remove();
}

export function localMarkConversationUpdated(id) {
  const d = getDb();
  const now = new Date().toISOString();
  d.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(now, id);
}
