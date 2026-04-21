import { Router } from 'express';
const router = Router();
router.get('/', (_req, res) => res.json({ module: 'landing-pages', status: 'ok' }));
export default router;
