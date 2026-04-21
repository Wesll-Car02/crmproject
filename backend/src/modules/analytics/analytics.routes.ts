import { Router } from 'express';
import { requirePermission } from '../../middlewares/rbac.middleware';
import * as svc from './analytics.service';

const router = Router();

router.get('/leads', requirePermission('analytics', 'read'), async (req, res) => {
  res.json(await svc.getLeadsReport(req.user!.tenantId, req.query));
});

router.get('/opportunities', requirePermission('analytics', 'read'), async (req, res) => {
  res.json(await svc.getOpportunitiesReport(req.user!.tenantId, req.query));
});

router.get('/chat', requirePermission('analytics', 'read'), async (req, res) => {
  res.json(await svc.getChatReport(req.user!.tenantId, req.query));
});

router.get('/team', requirePermission('analytics', 'read'), async (req, res) => {
  res.json(await svc.getSalesTeamReport(req.user!.tenantId));
});

export default router;
