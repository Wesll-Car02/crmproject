import { Router } from 'express';
import { requirePermission } from '../../middlewares/rbac.middleware';
import * as svc from './campaigns.service';

const router = Router();

router.get('/stats', requirePermission('campaigns', 'read'), async (req, res) => {
  res.json(await svc.getStats(req.user!.tenantId));
});

router.get('/', requirePermission('campaigns', 'read'), async (req, res) => {
  res.json(await svc.findAll(req.user!.tenantId, req.query));
});

router.post('/', requirePermission('campaigns', 'create'), async (req, res) => {
  res.status(201).json(await svc.create(req.user!.tenantId, req.user!.id, req.body));
});

router.get('/:id', requirePermission('campaigns', 'read'), async (req, res) => {
  const c = await svc.findById(req.params.id, req.user!.tenantId);
  if (!c) { res.status(404).json({ error: 'Não encontrada' }); return; }
  res.json(c);
});

router.put('/:id', requirePermission('campaigns', 'update'), async (req, res) => {
  res.json(await svc.update(req.params.id, req.user!.tenantId, req.body));
});

router.delete('/:id', requirePermission('campaigns', 'delete'), async (req, res) => {
  await svc.remove(req.params.id, req.user!.tenantId);
  res.status(204).send();
});

export default router;
