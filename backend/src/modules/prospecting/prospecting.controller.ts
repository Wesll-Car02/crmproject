import { Request, Response } from 'express';
import * as svc from './prospecting.service';

export async function searchCNPJ(req: Request, res: Response): Promise<void> {
  const { cnpj } = req.params;
  const data = await svc.searchByCNPJ(cnpj);
  await svc.saveSearch(req.user!.tenantId, req.user!.id, cnpj, [data]);
  res.json(data);
}

export async function recentSearches(req: Request, res: Response): Promise<void> {
  const searches = await svc.getRecentSearches(req.user!.tenantId, req.user!.id);
  res.json(searches);
}

export async function addAsLead(req: Request, res: Response): Promise<void> {
  const lead = await svc.addAsLead(req.user!.tenantId, req.user!.id, req.body);
  res.status(201).json(lead);
}
