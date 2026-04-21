import { Router } from 'express';
const router = Router();
router.get('/', (_req, res) => res.json({ module: 'pipeline', status: 'ok' }));
export default router;
