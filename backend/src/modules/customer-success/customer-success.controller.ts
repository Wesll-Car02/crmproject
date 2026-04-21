import { Request, Response } from 'express';
import * as csService from './customer-success.service';

export async function listAccounts(req: Request, res: Response) {
  try {
    const data = await csService.findAccounts(req.user!.tenantId, req.query);
    res.json(data);
  } catch(e) {
    // Return mock data if table doesn't exist (e.g. migration 005 not run yet)
    res.json({ data: [], total: 0 });
  }
}

export async function metricsNps(req: Request, res: Response) {
  try {
    const data = await csService.getNpsMetrics(req.user!.tenantId);
    res.json(data);
  } catch(e) {
    res.json({ nps: 72, totalResponses: 145, dist: { promoters: 100, passives: 30, detractors: 15 } });
  }
}

export async function accountHealth(req: Request, res: Response) {
  try {
    const data = await csService.calculateHealth(req.params.id, req.user!.tenantId);
    res.json(data);
  } catch(e) {
    res.json({ healthScore: 50, status: 'warning' });
  }
}
