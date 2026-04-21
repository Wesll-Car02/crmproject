import { Router } from 'express';
import { requirePermission } from '../../middlewares/rbac.middleware';
import * as svc from './dashboard.service';

const router = Router();

router.get('/stats', requirePermission('dashboard', 'read'), async (req, res) => {
  res.json(await svc.getStats(req.user!.tenantId));
});

router.get('/leads-chart', requirePermission('dashboard', 'read'), async (req, res) => {
  res.json(await svc.getLeadsChart(req.user!.tenantId));
});

router.get('/opps-chart', requirePermission('dashboard', 'read'), async (req, res) => {
  res.json(await svc.getOppsChart(req.user!.tenantId));
});

router.get('/activity', requirePermission('dashboard', 'read'), async (req, res) => {
  res.json(await svc.getRecentActivity(req.user!.tenantId));
});

export default router;
