import { Router } from 'express';
import { requirePermission } from '../../middlewares/rbac.middleware';
import * as controller from './opportunities.controller';

const router = Router();

// Stats
router.get('/stats', requirePermission('opportunities', 'read'), controller.stats);

// Pipelines
router.get('/pipelines', requirePermission('opportunities', 'read'), controller.listPipelines);
router.post('/pipelines', requirePermission('opportunities', 'create'), controller.createPipeline);
router.put('/pipelines/:id', requirePermission('opportunities', 'update'), controller.updatePipeline);
router.delete('/pipelines/:id', requirePermission('opportunities', 'delete'), controller.deletePipeline);

// Pipeline Stages
router.post('/pipelines/:pipelineId/stages', requirePermission('opportunities', 'update'), controller.createStage);
router.put('/pipelines/:pipelineId/stages/:stageId', requirePermission('opportunities', 'update'), controller.updateStage);
router.put('/pipelines/:pipelineId/stages/:stageId/order', requirePermission('opportunities', 'update'), controller.updateStageOrder);
router.delete('/pipelines/:pipelineId/stages/:stageId', requirePermission('opportunities', 'update'), controller.deleteStage);

// Opportunities CRUD
router.get('/', requirePermission('opportunities', 'read'), controller.list);
router.post('/', requirePermission('opportunities', 'create'), controller.create);
router.get('/:id', requirePermission('opportunities', 'read'), controller.get);
router.put('/:id', requirePermission('opportunities', 'update'), controller.update);
router.delete('/:id', requirePermission('opportunities', 'delete'), controller.remove);
router.patch('/:id/stage', requirePermission('opportunities', 'update'), controller.moveStage);

// Activities
router.get('/:id/activities', requirePermission('opportunities', 'read'), controller.getActivities);
router.post('/:id/activities', requirePermission('opportunities', 'update'), controller.addActivity);

export default router;
