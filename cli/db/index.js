import Database from 'better-sqlite3';
import { config } from '../utils/config.js';

let _db = null;

export function getDb() {
  if (_db) return _db;
  _db = new Database(config.dbPath);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  migrate(_db);
  return _db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS cases (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id       TEXT UNIQUE NOT NULL,
      title         TEXT NOT NULL,
      type          TEXT DEFAULT 'fraud',
      status        TEXT DEFAULT 'open',
      victim        TEXT,
      suspect       TEXT,
      description   TEXT,
      tags          TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS evidence (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id       TEXT NOT NULL REFERENCES cases(case_id) ON DELETE CASCADE,
      type          TEXT NOT NULL,
      description   TEXT,
      content       TEXT,
      file_path     TEXT,
      hash          TEXT,
      added_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id       TEXT REFERENCES cases(case_id) ON DELETE CASCADE,
      action        TEXT NOT NULL,
      details       TEXT,
      operator      TEXT DEFAULT 'mia',
      timestamp     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      type          TEXT NOT NULL,
      severity      TEXT DEFAULT 'medium',
      message       TEXT NOT NULL,
      data          TEXT,
      case_id       TEXT,
      acknowledged  INTEGER DEFAULT 0,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS crypto_scans (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id       TEXT,
      query         TEXT NOT NULL,
      chain         TEXT,
      risk_score    INTEGER,
      result        TEXT,
      scanned_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

// ── Case helpers ─────────────────────────────────────────────────────────────
export function createCase(data) {
  const db = getDb();
  const caseId = `RZ-${new Date().getFullYear()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
  db.prepare(`
    INSERT INTO cases (case_id, title, type, status, victim, suspect, description, tags)
    VALUES (@caseId, @title, @type, @status, @victim, @suspect, @description, @tags)
  `).run({ caseId, status: 'open', victim: null, suspect: null, description: null, tags: null, ...data });
  logActivity(caseId, 'CASE_CREATED', `Case "${data.title}" opened`);
  return caseId;
}

export function getCases(filter = {}) {
  const db = getDb();
  let q = 'SELECT * FROM cases';
  const params = [];
  if (filter.status) { q += ' WHERE status = ?'; params.push(filter.status); }
  q += ' ORDER BY created_at DESC';
  return db.prepare(q).all(...params);
}

export function getCaseById(caseId) {
  return getDb().prepare('SELECT * FROM cases WHERE case_id = ?').get(caseId);
}

export function updateCase(caseId, fields) {
  const db = getDb();
  const sets = Object.keys(fields).map(k => `${k} = @${k}`).join(', ');
  db.prepare(`UPDATE cases SET ${sets}, updated_at = datetime('now') WHERE case_id = @caseId`)
    .run({ ...fields, caseId });
  logActivity(caseId, 'CASE_UPDATED', JSON.stringify(fields));
}

// ── Evidence helpers ──────────────────────────────────────────────────────────
export function addEvidence(data) {
  getDb().prepare(`
    INSERT INTO evidence (case_id, type, description, content, file_path, hash)
    VALUES (@case_id, @type, @description, @content, @file_path, @hash)
  `).run(data);
  logActivity(data.case_id, 'EVIDENCE_ADDED', data.description || data.type);
}

export function getEvidence(caseId) {
  return getDb().prepare('SELECT * FROM evidence WHERE case_id = ? ORDER BY added_at').all(caseId);
}

// ── Activity log ──────────────────────────────────────────────────────────────
export function logActivity(caseId, action, details) {
  getDb().prepare('INSERT INTO activity_log (case_id, action, details) VALUES (?, ?, ?)')
    .run(caseId || null, action, details || null);
}

// ── Alerts ───────────────────────────────────────────────────────────────────
export function createAlert(data) {
  getDb().prepare(`
    INSERT INTO alerts (type, severity, message, data, case_id)
    VALUES (@type, @severity, @message, @data, @case_id)
  `).run({ case_id: null, data: null, ...data });
}

export function getAlerts(onlyUnack = true) {
  const q = onlyUnack
    ? 'SELECT * FROM alerts WHERE acknowledged = 0 ORDER BY created_at DESC'
    : 'SELECT * FROM alerts ORDER BY created_at DESC LIMIT 50';
  return getDb().prepare(q).all();
}

export function ackAlert(id) {
  getDb().prepare('UPDATE alerts SET acknowledged = 1 WHERE id = ?').run(id);
}

// ── Crypto scans ─────────────────────────────────────────────────────────────
export function saveCryptoScan(data) {
  getDb().prepare(`
    INSERT INTO crypto_scans (case_id, query, chain, risk_score, result)
    VALUES (@case_id, @query, @chain, @risk_score, @result)
  `).run(data);
}
