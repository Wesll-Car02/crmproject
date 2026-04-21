import { Router } from 'express';
import { requirePermission } from '../../middlewares/rbac.middleware';
import * as controller from './contracts.controller';

const router = Router();

router.get('/', requirePermission('sales', 'read'), controller.list);
router.post('/', requirePermission('sales', 'create'), controller.create);
router.get('/:id', requirePermission('sales', 'read'), controller.get);
router.put('/:id', requirePermission('sales', 'update'), controller.update);
router.delete('/:id', requirePermission('sales', 'delete'), controller.remove);

router.post('/:id/pdf', requirePermission('sales', 'read'), controller.generatePdf);

// Public route for signing (token is passed in the URL)
router.post('/sign/:token', controller.signContract);

export default router;
