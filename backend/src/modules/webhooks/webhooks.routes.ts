import { Router } from 'express';
const router = Router();
router.get('/', (_req, res) => res.json({ module: 'webhooks', status: 'ok' }));
export default router;
