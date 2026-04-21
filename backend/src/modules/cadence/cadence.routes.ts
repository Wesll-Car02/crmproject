import { Router } from 'express';
import { requirePermission } from '../../middlewares/rbac.middleware';
import * as controller from './cadence.controller';

const router = Router();

router.get('/', requirePermission('cadences', 'read'), controller.list);
router.post('/', requirePermission('cadences', 'create'), controller.create);
router.get('/:id', requirePermission('cadences', 'read'), controller.get);
router.put('/:id', requirePermission('cadences', 'update'), controller.update);

// Enrollments
router.post('/:id/enroll', requirePermission('cadences', 'update'), controller.enroll);
router.get('/:id/enrollments', requirePermission('cadences', 'read'), controller.listEnrollments);

export default router;
