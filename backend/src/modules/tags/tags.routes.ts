import { Router } from 'express';
import { requirePermission } from '../../middlewares/rbac.middleware';
import * as controller from './tags.controller';

const router = Router();

router.get('/', requirePermission('leads', 'read'), controller.list);
router.post('/', requirePermission('leads', 'update'), controller.create);
router.put('/:id', requirePermission('leads', 'update'), controller.update);
router.delete('/:id', requirePermission('leads', 'update'), controller.remove);

export default router;
