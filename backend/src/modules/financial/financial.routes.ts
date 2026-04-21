import { Router } from 'express';
import { requirePermission } from '../../middlewares/rbac.middleware';
import * as controller from './financial.controller';

const router = Router();

// Billings / Boletos
router.get('/billings', requirePermission('financial', 'read'), controller.listBillings);
router.post('/billings', requirePermission('financial', 'create'), controller.createBilling);
router.post('/billings/:id/boleto', requirePermission('financial', 'update'), controller.generateBoleto);
router.post('/billings/:id/pay', requirePermission('financial', 'update'), controller.registerPayment);
router.post('/billings/:billingId/nfe', requirePermission('financial', 'create'), controller.generateNfe);

// Subscriptions
router.get('/subscriptions', requirePermission('financial', 'read'), controller.getSubscriptions);

// Metrics & Forecasting
router.get('/metrics/mrr', requirePermission('financial', 'read'), controller.getMrrMetrics);
router.get('/forecasting', requirePermission('financial', 'read'), controller.getForecasting);

// Commissions
router.get('/commissions', requirePermission('financial', 'read'), controller.getCommissions);

export default router;
