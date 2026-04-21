import { Router } from 'express';
import { requirePermission } from '../../middlewares/rbac.middleware';
import * as svc from './users.service';

const router = Router();

router.get('/', requirePermission('users', 'read'), async (req, res) => {
  res.json(await svc.findAll(req.user!.tenantId));
});

router.get('/roles', requirePermission('users', 'read'), async (req, res) => {
  res.json(await svc.findRoles(req.user!.tenantId));
});

router.post('/', requirePermission('users', 'create'), async (req, res) => {
  res.status(201).json(await svc.create(req.user!.tenantId, req.body));
});

router.get('/:id', requirePermission('users', 'read'), async (req, res) => {
  const u = await svc.findById(req.params.id, req.user!.tenantId);
  if (!u) { res.status(404).json({ error: 'Usuário não encontrado' }); return; }
  res.json(u);
});

router.put('/:id', requirePermission('users', 'update'), async (req, res) => {
  res.json(await svc.update(req.params.id, req.user!.tenantId, req.body));
});

router.delete('/:id', requirePermission('users', 'delete'), async (req, res) => {
  await svc.remove(req.params.id, req.user!.tenantId);
  res.status(204).send();
});

export default router;
