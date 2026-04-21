import { Router } from 'express';
import { requirePermission } from '../../middlewares/rbac.middleware';
import * as svc from './proposals.service';

const router = Router();

router.get('/', requirePermission('proposals', 'read'), async (req, res) => {
  res.json(await svc.findAll(req.user!.tenantId, req.query));
});

router.post('/', requirePermission('proposals', 'create'), async (req, res) => {
  res.status(201).json(await svc.create(req.user!.tenantId, req.user!.id, req.body));
});

router.get('/:id', requirePermission('proposals', 'read'), async (req, res) => {
  const p = await svc.findById(req.params.id, req.user!.tenantId);
  if (!p) { res.status(404).json({ error: 'Não encontrada' }); return; }
  res.json(p);
});

router.put('/:id', requirePermission('proposals', 'update'), async (req, res) => {
  res.json(await svc.update(req.params.id, req.user!.tenantId, req.body));
});

router.delete('/:id', requirePermission('proposals', 'delete'), async (req, res) => {
  await svc.remove(req.params.id, req.user!.tenantId);
  res.status(204).send();
});

router.post('/:id/send', requirePermission('proposals', 'update'), async (req, res) => {
  res.json(await svc.sendProposal(req.params.id, req.user!.tenantId));
});

export default router;
