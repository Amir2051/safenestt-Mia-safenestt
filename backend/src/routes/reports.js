import { Router } from 'express';
import { createReadStream, existsSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname  = dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = resolve(__dirname, '../../../reports');

const router = Router();

router.get('/', (_, res) => {
  try {
    const files = readdirSync(REPORTS_DIR).filter(f => f.endsWith('.pdf'))
      .map(f => ({ name: f, url: `/api/reports/${f}` }));
    res.json(files);
  } catch {
    res.json([]);
  }
});

router.get('/:file', (req, res) => {
  const filePath = resolve(REPORTS_DIR, req.params.file);
  if (!filePath.startsWith(REPORTS_DIR) || !existsSync(filePath)) {
    return res.status(404).json({ error: 'Report not found' });
  }
  res.set({
    'Content-Type':        'application/pdf',
    'Content-Disposition': `inline; filename="${req.params.file}"`,
  });
  createReadStream(filePath).pipe(res);
});

export default router;
