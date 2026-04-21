import { Router } from 'express';
import { requirePermission } from '../../middlewares/rbac.middleware';
import { authenticate } from '../../middlewares/auth.middleware';
import * as controller from './scheduling.controller';

const router = Router();

// Calendar events
router.get('/', requirePermission('sales', 'read'), controller.list);
router.post('/', requirePermission('sales', 'create'), controller.create);
router.put('/:id', requirePermission('sales', 'update'), controller.update);
router.delete('/:id', requirePermission('sales', 'delete'), controller.remove);

// Lead Tasks
router.get('/tasks/upcoming', requirePermission('sales', 'read'), controller.listUpcomingTasks);
router.get('/tasks/lead/:leadId', requirePermission('sales', 'read'), controller.listLeadTasks);
router.post('/tasks', requirePermission('sales', 'create'), controller.createLeadTask);
router.patch('/tasks/:id/complete', requirePermission('sales', 'update'), controller.completeTask);
router.put('/tasks/:id', requirePermission('sales', 'update'), controller.updateTask);
router.delete('/tasks/:id', requirePermission('sales', 'delete'), controller.deleteTask);

// Calendar Integrations status
router.get('/integrations', authenticate, controller.listIntegrations);
router.delete('/integrations/:provider', authenticate, controller.disconnectCalendar);

// Google OAuth (requires auth to get userId)
router.get('/auth/google', authenticate, controller.googleAuthStart);
router.get('/auth/google/callback', controller.googleAuthCallback);

// Microsoft OAuth
router.get('/auth/microsoft', authenticate, controller.microsoftAuthStart);
router.get('/auth/microsoft/callback', controller.microsoftAuthCallback);

// Public availability (no auth needed)
router.get('/public/:userSlug/availability', controller.getPublicAvailability);
router.post('/public/:userSlug/check-availability', controller.checkPublicAvailability);

// Public booking (no auth needed)
router.post('/public/:userSlug', controller.bookPublic);

export default router;
