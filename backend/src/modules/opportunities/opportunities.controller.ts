import { Request, Response } from 'express';
import * as svc from './opportunities.service';

export async function list(req: Request, res: Response): Promise<void> {
  const result = await svc.findAll(req.user!.tenantId, req.query);
  res.json(result);
}

export async function get(req: Request, res: Response): Promise<void> {
  const opp = await svc.findById(req.params.id, req.user!.tenantId);
  if (!opp) { res.status(404).json({ error: 'Oportunidade não encontrada' }); return; }
  res.json(opp);
}

export async function create(req: Request, res: Response): Promise<void> {
  const opp = await svc.create(req.user!.tenantId, req.user!.id, req.body);
  res.status(201).json(opp);
}

export async function update(req: Request, res: Response): Promise<void> {
  const opp = await svc.update(req.params.id, req.user!.tenantId, req.body);
  res.json(opp);
}

export async function remove(req: Request, res: Response): Promise<void> {
  await svc.remove(req.params.id, req.user!.tenantId);
  res.status(204).send();
}

export async function moveStage(req: Request, res: Response): Promise<void> {
  const opp = await svc.moveStage(req.params.id, req.user!.tenantId, req.user!.id, req.body.stageId);
  res.json(opp);
}

export async function listPipelines(req: Request, res: Response): Promise<void> {
  const pipelines = await svc.getPipelines(req.user!.tenantId);
  res.json(pipelines);
}

export async function createPipeline(req: Request, res: Response): Promise<void> {
  const pipeline = await svc.createPipeline(req.user!.tenantId, req.user!.id, req.body);
  res.status(201).json(pipeline);
}

export async function updatePipeline(req: Request, res: Response): Promise<void> {
  const pipeline = await svc.updatePipeline(req.params.id, req.user!.tenantId, req.body);
  res.json(pipeline);
}

export async function deletePipeline(req: Request, res: Response): Promise<void> {
  await svc.deletePipeline(req.params.id, req.user!.tenantId);
  res.status(204).send();
}

export async function createStage(req: Request, res: Response): Promise<void> {
  const stage = await svc.createStage(req.params.pipelineId, req.user!.tenantId, req.body);
  res.status(201).json(stage);
}

export async function updateStage(req: Request, res: Response): Promise<void> {
  const stage = await svc.updateStage(req.params.stageId, req.user!.tenantId, req.body);
  res.json(stage);
}

export async function updateStageOrder(req: Request, res: Response): Promise<void> {
  const stage = await svc.updateStageOrder(req.params.stageId, req.user!.tenantId, req.body.sortOrder);
  res.json(stage);
}

export async function deleteStage(req: Request, res: Response): Promise<void> {
  await svc.deleteStage(req.params.stageId, req.user!.tenantId);
  res.status(204).send();
}

export async function stats(req: Request, res: Response): Promise<void> {
  const result = await svc.getStats(req.user!.tenantId);
  res.json(result);
}

export async function getActivities(req: Request, res: Response): Promise<void> {
  const activities = await svc.getActivities(req.params.id);
  res.json(activities);
}

export async function addActivity(req: Request, res: Response): Promise<void> {
  const activity = await svc.addActivity(req.params.id, req.user!.tenantId, req.user!.id, req.body);
  res.status(201).json(activity);
}
