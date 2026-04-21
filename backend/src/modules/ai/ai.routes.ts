import { Router } from 'express';
import { requirePermission } from '../../middlewares/rbac.middleware';
import * as svc from './ai.service';

const router = Router();

router.post('/leads/:id/score', requirePermission('leads', 'update'), async (req, res) => {
  res.json(await svc.scoreLead(req.params.id, req.user!.tenantId));
});

router.get('/conversations/:id/suggest', requirePermission('chat', 'read'), async (req, res) => {
  res.json(await svc.suggestResponse(req.params.id, req.user!.tenantId));
});

router.get('/conversations/:id/summary', requirePermission('chat', 'read'), async (req, res) => {
  res.json(await svc.summarizeConversation(req.params.id, req.user!.tenantId));
});

router.post('/classify-intent', requirePermission('chat', 'read'), async (req, res) => {
  res.json(await svc.classifyIntent(req.body.text || ''));
});

export default router;
