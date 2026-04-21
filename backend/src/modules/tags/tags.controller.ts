import { Request, Response } from 'express';
import * as svc from './tags.service';

export async function list(req: Request, res: Response): Promise<void> {
  res.json(await svc.findAll(req.user!.tenantId));
}

export async function create(req: Request, res: Response): Promise<void> {
  res.status(201).json(await svc.create(req.user!.tenantId, req.body));
}

export async function update(req: Request, res: Response): Promise<void> {
  res.json(await svc.update(req.params.id, req.user!.tenantId, req.body));
}

export async function remove(req: Request, res: Response): Promise<void> {
  await svc.remove(req.params.id, req.user!.tenantId);
  res.status(204).send();
}
