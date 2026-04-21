import { Router } from 'express';
import { requirePermission } from '../../middlewares/rbac.middleware';
import * as controller from './prospecting.controller';

const router = Router();

router.get('/recent', requirePermission('leads', 'read'), controller.recentSearches);
router.get('/cnpj/:cnpj', requirePermission('leads', 'read'), controller.searchCNPJ);
router.post('/add-lead', requirePermission('leads', 'create'), controller.addAsLead);

export default router;
