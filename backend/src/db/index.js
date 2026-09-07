import Database from 'better-sqlite3';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, '../../../data/mia.db');
mkdirSync(resolve(__dirname, '../../../data'), { recursive: true });

let _db = null;
export function db() {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  migrate(_db);
  return _db;
}

function migrate(d) {
  d.exec(`
    CREATE TABLE IF NOT EXISTS cases (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      type        TEXT DEFAULT 'fraud',
      status      TEXT DEFAULT 'open',
      victim      TEXT,
      suspect     TEXT,
      description TEXT,
      amount_lost REAL,
      currency    TEXT DEFAULT 'USD',
      created_at  TEXT DEFAULT (datetime('now')),
      updated_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS evidence (
      id          TEXT PRIMARY KEY,
      case_id     TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      type        TEXT NOT NULL,
      label       TEXT,
      content     TEXT,
      file_path   TEXT,
      file_name   TEXT,
      mime_type   TEXT,
      file_size   INTEGER,
      submitted_by TEXT DEFAULT 'investigator',
      metadata    TEXT,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS intake_tokens (
      token       TEXT PRIMARY KEY,
      case_id     TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      label       TEXT,
      used_count  INTEGER DEFAULT 0,
      expires_at  TEXT,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tracking_links (
      id          TEXT PRIMARY KEY,
      case_id     TEXT REFERENCES cases(id) ON DELETE SET NULL,
      label       TEXT,
      redirect_url TEXT,
      clicks      INTEGER DEFAULT 0,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tracking_hits (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      link_id     TEXT NOT NULL REFERENCES tracking_links(id) ON DELETE CASCADE,
      ip          TEXT,
      user_agent  TEXT,
      referer     TEXT,
      country     TEXT,
      timestamp   TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      type        TEXT NOT NULL,
      severity    TEXT DEFAULT 'medium',
      message     TEXT NOT NULL,
      case_id     TEXT REFERENCES cases(id) ON DELETE SET NULL,
      data        TEXT,
      acknowledged INTEGER DEFAULT 0,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS crypto_scans (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id     TEXT REFERENCES cases(id) ON DELETE SET NULL,
      query       TEXT NOT NULL,
      type        TEXT,
      risk_score  INTEGER,
      result      TEXT,
      scanned_at  TEXT DEFAULT (datetime('now'))
    );
  `);
}

// ── Cases ─────────────────────────────────────────────────────────────────────
export const cases = {
  create: (data) => {
    const id = `SNT-${new Date().getFullYear()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
    db().prepare(`
      INSERT INTO cases (id, title, type, status, victim, suspect, description, amount_lost, currency)
      VALUES (@id, @title, @type, @status, @victim, @suspect, @description, @amount_lost, @currency)
    `).run({ id, status: 'open', victim: null, suspect: null, description: null, amount_lost: null, currency: 'USD', ...data });
    return id;
  },
  list: (filter = {}) => {
    let q = 'SELECT * FROM cases';
    const params = [];
    if (filter.status) { q += ' WHERE status = ?'; params.push(filter.status); }
    q += ' ORDER BY created_at DESC';
    return db().prepare(q).all(...params);
  },
  get: (id) => db().prepare('SELECT * FROM cases WHERE id = ?').get(id),
  update: (id, fields) => {
    const sets = Object.keys(fields).map(k => `${k} = @${k}`).join(', ');
    db().prepare(`UPDATE cases SET ${sets}, updated_at = datetime('now') WHERE id = @id`).run({ ...fields, id });
  },
  delete: (id) => db().prepare('DELETE FROM cases WHERE id = ?').run(id),
  stats: () => db().prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status='open' THEN 1 ELSE 0 END) as open,
      SUM(CASE WHEN status='closed' THEN 1 ELSE 0 END) as closed,
      SUM(CASE WHEN status='escalated' THEN 1 ELSE 0 END) as escalated,
      SUM(amount_lost) as total_losses
    FROM cases
  `).get(),
};

// ── Evidence ──────────────────────────────────────────────────────────────────
export const evidence = {
  add: (data) => {
    const id = Math.random().toString(36).slice(2, 10);
    db().prepare(`
      INSERT INTO evidence (id, case_id, type, label, content, file_path, file_name, mime_type, file_size, submitted_by, metadata)
      VALUES (@id, @case_id, @type, @label, @content, @file_path, @file_name, @mime_type, @file_size, @submitted_by, @metadata)
    `).run({ id, label: null, content: null, file_path: null, file_name: null, mime_type: null, file_size: null, submitted_by: 'investigator', metadata: null, ...data });
    return id;
  },
  list: (case_id) => db().prepare('SELECT * FROM evidence WHERE case_id = ? ORDER BY created_at ASC').all(case_id),
  delete: (id) => db().prepare('DELETE FROM evidence WHERE id = ?').run(id),
};

// ── Intake tokens ─────────────────────────────────────────────────────────────
export const intakeTokens = {
  create: (case_id, label, expiresAt) => {
    const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    db().prepare(`
      INSERT INTO intake_tokens (token, case_id, label, expires_at) VALUES (?, ?, ?, ?)
    `).run(token, case_id, label || null, expiresAt || null);
    return token;
  },
  get: (token) => db().prepare('SELECT * FROM intake_tokens WHERE token = ?').get(token),
  list: (case_id) => db().prepare('SELECT * FROM intake_tokens WHERE case_id = ? ORDER BY created_at DESC').all(case_id),
  incrementUse: (token) => db().prepare('UPDATE intake_tokens SET used_count = used_count + 1 WHERE token = ?').run(token),
  delete: (token) => db().prepare('DELETE FROM intake_tokens WHERE token = ?').run(token),
};

// ── Tracking links ────────────────────────────────────────────────────────────
export const trackingLinks = {
  create: (data) => {
    const id = Math.random().toString(36).slice(2, 10);
    db().prepare(`
      INSERT INTO tracking_links (id, case_id, label, redirect_url)
      VALUES (@id, @case_id, @label, @redirect_url)
    `).run({ id, case_id: null, label: null, redirect_url: null, ...data });
    return id;
  },
  get: (id) => db().prepare('SELECT * FROM tracking_links WHERE id = ?').get(id),
  list: (case_id) => {
    if (case_id) return db().prepare('SELECT * FROM tracking_links WHERE case_id = ? ORDER BY created_at DESC').all(case_id);
    return db().prepare('SELECT * FROM tracking_links ORDER BY created_at DESC LIMIT 50').all();
  },
  addHit: (link_id, hit) => {
    db().prepare(`
      INSERT INTO tracking_hits (link_id, ip, user_agent, referer) VALUES (?, ?, ?, ?)
    `).run(link_id, hit.ip || null, hit.userAgent || null, hit.referer || null);
    db().prepare('UPDATE tracking_links SET clicks = clicks + 1 WHERE id = ?').run(link_id);
  },
  hits: (link_id) => db().prepare('SELECT * FROM tracking_hits WHERE link_id = ? ORDER BY timestamp DESC').all(link_id),
  delete: (id) => db().prepare('DELETE FROM tracking_links WHERE id = ?').run(id),
};

// ── Alerts ────────────────────────────────────────────────────────────────────
export const alerts = {
  create: (data) => {
    db().prepare(`
      INSERT INTO alerts (type, severity, message, case_id, data) VALUES (@type, @severity, @message, @case_id, @data)
    `).run({ severity: 'medium', case_id: null, data: null, ...data });
  },
  list: (onlyUnack = true) => {
    const q = onlyUnack
      ? 'SELECT * FROM alerts WHERE acknowledged = 0 ORDER BY created_at DESC'
      : 'SELECT * FROM alerts ORDER BY created_at DESC LIMIT 100';
    return db().prepare(q).all();
  },
  ack: (id) => db().prepare('UPDATE alerts SET acknowledged = 1 WHERE id = ?').run(id),
  ackAll: () => db().prepare('UPDATE alerts SET acknowledged = 1 WHERE acknowledged = 0').run(),
};

// ── Crypto scans ──────────────────────────────────────────────────────────────
export const cryptoScans = {
  save: (data) => db().prepare(`
    INSERT INTO crypto_scans (case_id, query, type, risk_score, result)
    VALUES (@case_id, @query, @type, @risk_score, @result)
  `).run({ case_id: null, type: 'token', risk_score: 0, result: null, ...data }),
  list: (limit = 20) => db().prepare('SELECT * FROM crypto_scans ORDER BY scanned_at DESC LIMIT ?').all(limit),
};

// ── Pattern detection ─────────────────────────────────────────────────────────
export function detectPatterns() {
  const d = db();
  const found = [];

  // Repeated wallet addresses across cases
  const wallets = d.prepare(`
    SELECT content, COUNT(DISTINCT case_id) as case_count, GROUP_CONCAT(DISTINCT case_id) as cases
    FROM evidence WHERE type IN ('wallet','crypto') AND content IS NOT NULL
    GROUP BY content HAVING case_count > 1
  `).all();
  wallets.forEach(w => found.push({
    type: 'repeated_wallet',
    severity: 'high',
    message: `Wallet ${w.content.slice(0, 20)}... appears in ${w.case_count} cases`,
    data: JSON.stringify({ wallet: w.content, cases: w.cases.split(',') }),
  }));

  // Repeated suspect names
  const suspects = d.prepare(`
    SELECT suspect, COUNT(*) as count FROM cases WHERE suspect IS NOT NULL AND suspect != ''
    GROUP BY LOWER(suspect) HAVING count > 1
  `).all();
  suspects.forEach(s => found.push({
    type: 'repeated_suspect',
    severity: 'high',
    message: `Suspect "${s.suspect}" appears in ${s.count} cases`,
    data: JSON.stringify({ suspect: s.suspect, count: s.count }),
  }));

  found.forEach(f => alerts.create({ ...f, case_id: null }));
  return found;
}
