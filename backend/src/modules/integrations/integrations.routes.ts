import { Router } from 'express';
const router = Router();
router.get('/', (_req, res) => res.json({ module: 'integrations', status: 'ok' }));
export default router;
