import { Router } from 'express';
import { requirePermission, requireRole } from '../../middlewares/rbac.middleware';
import * as controller from './leads.controller';

const router = Router();

router.get('/', requirePermission('leads', 'read'), controller.list);
router.post('/', requirePermission('leads', 'create'), controller.create);
router.get('/stats', requirePermission('leads', 'read'), controller.stats);
router.get('/:id', requirePermission('leads', 'read'), controller.get);
router.put('/:id', requirePermission('leads', 'update'), controller.update);
router.delete('/:id', requirePermission('leads', 'delete'), controller.remove);
router.post('/:id/convert', requirePermission('leads', 'update'), controller.convertToOpportunity);
router.get('/:id/activities', requirePermission('leads', 'read'), controller.getActivities);
router.post('/:id/activities', requirePermission('leads', 'update'), controller.addActivity);
router.post('/:id/tags', requirePermission('leads', 'update'), controller.addTag);
router.delete('/:id/tags/:tagId', requirePermission('leads', 'update'), controller.removeTag);
router.post('/import', requirePermission('leads', 'import'), controller.importLeads);
router.get('/export/csv', requirePermission('leads', 'export'), controller.exportLeads);

// Contatos relacionados
router.get('/:id/contacts', requirePermission('leads', 'read'), controller.getContacts);
router.post('/:id/contacts', requirePermission('leads', 'update'), controller.addContact);
router.put('/:id/contacts/:contactId', requirePermission('leads', 'update'), controller.updateContact);
router.delete('/:id/contacts/:contactId', requirePermission('leads', 'update'), controller.removeContact);

export default router;
