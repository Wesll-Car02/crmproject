import { Request, Response } from 'express';
import * as cadenceService from './cadence.service';

export async function list(req: Request, res: Response) {
  const data = await cadenceService.findCadences(req.user!.tenantId, Number(req.query.page) || 1);
  res.json(data);
}

export async function get(req: Request, res: Response) {
  const data = await cadenceService.findCadenceById(req.params.id, req.user!.tenantId);
  if (!data) return res.status(404).json({ error: 'Cadência não encontrada' });
  res.json(data);
}

export async function create(req: Request, res: Response) {
  const data = await cadenceService.createCadence(req.user!.tenantId, req.user!.id, req.body);
  res.status(201).json(data);
}

export async function update(req: Request, res: Response) {
  const data = await cadenceService.updateCadence(req.params.id, req.user!.tenantId, req.body);
  res.json(data);
}

export async function enroll(req: Request, res: Response) {
  try {
    const data = await cadenceService.enrollLeads(req.params.id, req.user!.tenantId, req.user!.id, req.body.leadIds || []);
    res.status(201).json({ message: 'Leads inscritos com sucesso', enrolled: data.length });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function listEnrollments(req: Request, res: Response) {
  const data = await cadenceService.getEnrollments(req.params.id, req.user!.tenantId, Number(req.query.page) || 1);
  res.json(data);
}
