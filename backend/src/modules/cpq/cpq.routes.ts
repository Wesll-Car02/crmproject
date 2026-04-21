import { Router } from 'express';
const router = Router();
router.get('/', (_req, res) => res.json({ module: 'cpq', status: 'ok' }));
export default router;
