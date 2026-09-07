import { Router } from 'express';
import multer from 'multer';
import { resolve, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import { cases, evidence, intakeTokens, alerts } from '../db/index.js';
import { generateReportPDF } from '../services/reportService.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = resolve(__dirname, '../../../uploads');
mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOADS_DIR),
  filename:    (_, file, cb) => {
    const ext  = extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_, file, cb) => {
    const allowed = ['.pdf','.png','.jpg','.jpeg','.gif','.webp','.txt','.csv','.json','.log','.mp4','.mov'];
    cb(null, allowed.includes(extname(file.originalname).toLowerCase()));
  },
});

const router = Router();

// ── Case CRUD ─────────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const list = cases.list(req.query.status ? { status: req.query.status } : {});
  res.json({ cases: list, total: list.length });
});

router.post('/', (req, res) => {
  const { title, type, victim, suspect, description, amount_lost, currency } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  const id = cases.create({ title, type, victim, suspect, description, amount_lost, currency });
  res.status(201).json({ id, message: 'Case created' });
});

router.get('/stats', (_, res) => res.json(cases.stats()));

router.get('/:id', (req, res) => {
  const c = cases.get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Case not found' });
  const ev  = evidence.list(req.params.id);
  const tok = intakeTokens.list(req.params.id);
  res.json({ ...c, evidence: ev, intake_links: tok });
});

router.patch('/:id', (req, res) => {
  const c = cases.get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Case not found' });
  const allowed = ['title','type','status','victim','suspect','description','amount_lost','currency'];
  const fields  = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
  if (!Object.keys(fields).length) return res.status(400).json({ error: 'No valid fields' });
  cases.update(req.params.id, fields);
  res.json({ message: 'Case updated' });
});

router.delete('/:id', (req, res) => {
  const c = cases.get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Case not found' });
  cases.delete(req.params.id);
  res.json({ message: 'Case deleted' });
});

// ── Evidence ──────────────────────────────────────────────────────────────────
router.get('/:id/evidence', (req, res) => {
  const c = cases.get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Case not found' });
  res.json(evidence.list(req.params.id));
});

router.post('/:id/evidence', upload.single('file'), (req, res) => {
  const c = cases.get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Case not found' });

  const { type = 'note', label, content, wallet, url } = req.body;

  const evidenceData = {
    case_id:      req.params.id,
    type,
    label:        label || null,
    content:      content || wallet || url || null,
    submitted_by: req.body.submitted_by || 'investigator',
    metadata:     req.body.metadata || null,
  };

  if (req.file) {
    evidenceData.file_path  = req.file.path;
    evidenceData.file_name  = req.file.originalname;
    evidenceData.mime_type  = req.file.mimetype;
    evidenceData.file_size  = req.file.size;
    evidenceData.type       = 'file';
  }

  const id = evidence.add(evidenceData);
  res.status(201).json({ id, message: 'Evidence added' });
});

router.delete('/:caseId/evidence/:evId', (req, res) => {
  evidence.delete(req.params.evId);
  res.json({ message: 'Evidence deleted' });
});

// ── Intake links ──────────────────────────────────────────────────────────────
router.post('/:id/intake-link', (req, res) => {
  const c = cases.get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Case not found' });

  const { label, expiresAt } = req.body;
  const token = intakeTokens.create(req.params.id, label, expiresAt);
  const url   = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/intake/${token}`;
  res.status(201).json({ token, url, message: 'Intake link created' });
});

router.delete('/:caseId/intake-link/:token', (req, res) => {
  intakeTokens.delete(req.params.token);
  res.json({ message: 'Intake link revoked' });
});

// ── Intake public endpoint ────────────────────────────────────────────────────
router.get('/intake/:token', (req, res) => {
  const tok = intakeTokens.get(req.params.token);
  if (!tok) return res.status(404).json({ error: 'Invalid or expired intake link' });
  if (tok.expires_at && new Date(tok.expires_at) < new Date()) {
    return res.status(410).json({ error: 'This intake link has expired' });
  }
  const c = cases.get(tok.case_id);
  res.json({ caseId: tok.case_id, caseTitle: c?.title, label: tok.label });
});

router.post('/intake/:token', upload.array('files', 10), (req, res) => {
  const tok = intakeTokens.get(req.params.token);
  if (!tok) return res.status(404).json({ error: 'Invalid or expired intake link' });
  if (tok.expires_at && new Date(tok.expires_at) < new Date()) {
    return res.status(410).json({ error: 'This intake link has expired' });
  }

  const { description, wallets, urls, contact } = req.body;
  const added = [];

  if (description) {
    added.push(evidence.add({
      case_id: tok.case_id, type: 'victim_statement', label: 'Victim Statement',
      content: description, submitted_by: 'victim',
      metadata: JSON.stringify({ contact: contact || 'anonymous', ip: req.ip }),
    }));
  }

  if (wallets) {
    String(wallets).split(/[\n,]/).map(w => w.trim()).filter(Boolean).forEach(wallet => {
      added.push(evidence.add({
        case_id: tok.case_id, type: 'wallet', label: 'Wallet (victim submitted)',
        content: wallet, submitted_by: 'victim',
      }));
    });
  }

  if (urls) {
    String(urls).split(/[\n,]/).map(u => u.trim()).filter(Boolean).forEach(url => {
      added.push(evidence.add({
        case_id: tok.case_id, type: 'url', label: 'Suspicious URL (victim submitted)',
        content: url, submitted_by: 'victim',
      }));
    });
  }

  (req.files || []).forEach(file => {
    added.push(evidence.add({
      case_id:  tok.case_id, type: 'file', label: file.originalname,
      file_path: file.path, file_name: file.originalname,
      mime_type: file.mimetype, file_size: file.size, submitted_by: 'victim',
    }));
  });

  intakeTokens.incrementUse(tok.token);
  alerts.create({
    type: 'intake_submission', severity: 'low',
    message: `New evidence submitted via intake link for case ${tok.case_id} (${added.length} items)`,
    case_id: tok.case_id,
  });

  res.json({ message: 'Evidence received. Thank you.', itemsAdded: added.length });
});

// ── Report generation ─────────────────────────────────────────────────────────
router.post('/:id/report', async (req, res) => {
  const c = cases.get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Case not found' });

  try {
    const ev = evidence.list(req.params.id);
    const { fileName, filePath } = await generateReportPDF(c, ev);
    res.json({ fileName, message: 'Report generated', downloadPath: `/api/reports/${fileName}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
