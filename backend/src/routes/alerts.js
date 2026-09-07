import { Router } from 'express';
import { alerts, detectPatterns } from '../db/index.js';

const router = Router();

router.get('/',        (req, res) => res.json(alerts.list(req.query.all !== 'true')));
router.post('/scan',   (_, res)   => res.json({ found: detectPatterns() }));
router.patch('/:id/ack', (req, res) => { alerts.ack(parseInt(req.params.id)); res.json({ message: 'Acknowledged' }); });
router.post('/ack-all',  (_, res) => { alerts.ackAll(); res.json({ message: 'All acknowledged' }); });

export default router;
