import { Router } from 'express';
import { requirePermission } from '../../middlewares/rbac.middleware';
import * as controller from './customer-success.controller';

const router = Router();

router.get('/accounts', requirePermission('customer_success', 'read'), controller.listAccounts);
router.get('/accounts/:id/health', requirePermission('customer_success', 'read'), controller.accountHealth);
router.get('/nps', requirePermission('customer_success', 'read'), controller.metricsNps);

export default router;
