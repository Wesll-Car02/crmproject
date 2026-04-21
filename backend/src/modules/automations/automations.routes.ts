import { Router } from 'express';
import { requirePermission } from '../../middlewares/rbac.middleware';
import * as svc from './automations.service';

const router = Router();

router.get('/', requirePermission('automations', 'read'), async (req, res) => {
  res.json(await svc.findAll(req.user!.tenantId));
});

router.post('/', requirePermission('automations', 'create'), async (req, res) => {
  res.status(201).json(await svc.create(req.user!.tenantId, req.user!.id, req.body));
});

router.get('/:id', requirePermission('automations', 'read'), async (req, res) => {
  const a = await svc.findById(req.params.id, req.user!.tenantId);
  if (!a) { res.status(404).json({ error: 'Não encontrado' }); return; }
  res.json(a);
});

router.put('/:id', requirePermission('automations', 'update'), async (req, res) => {
  res.json(await svc.update(req.params.id, req.user!.tenantId, req.body));
});

router.delete('/:id', requirePermission('automations', 'delete'), async (req, res) => {
  await svc.remove(req.params.id, req.user!.tenantId);
  res.status(204).send();
});

router.patch('/:id/toggle', requirePermission('automations', 'update'), async (req, res) => {
  res.json(await svc.toggleActive(req.params.id, req.user!.tenantId));
});

router.post('/:id/trigger', requirePermission('automations', 'update'), async (req, res) => {
  res.json(await svc.triggerManual(req.params.id, req.user!.tenantId, req.user!.id, req.body));
});

router.get('/:id/executions', requirePermission('automations', 'read'), async (req, res) => {
  res.json(await svc.getExecutions(req.params.id, req.user!.tenantId));
});

export default router;
