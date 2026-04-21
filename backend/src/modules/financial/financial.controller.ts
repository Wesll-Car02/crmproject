import { Request, Response } from 'express';
import * as financialService from './financial.service';

export async function listBillings(req: Request, res: Response) {
  const data = await financialService.findBillings(req.user!.tenantId, req.query);
  res.json(data);
}

export async function createBilling(req: Request, res: Response) {
  const data = await financialService.createBilling(req.user!.tenantId, req.user!.id, req.body);
  res.status(201).json(data);
}

export async function generateBoleto(req: Request, res: Response) {
  const data = await financialService.generateOnerousBoleto(req.params.id, req.user!.tenantId);
  res.json(data);
}

export async function registerPayment(req: Request, res: Response) {
  const data = await financialService.registerPayment(req.params.id, req.user!.tenantId, {
    ...req.body,
    userId: req.user!.id
  });
  res.json(data);
}

export async function getSubscriptions(req: Request, res: Response) {
  const data = await financialService.findSubscriptions(req.user!.tenantId);
  res.json(data);
}

export async function getCommissions(req: Request, res: Response) {
  const data = await financialService.findCommissions(req.user!.tenantId);
  res.json(data);
}

export async function getMrrMetrics(req: Request, res: Response) {
  const data = await financialService.getMrrMetrics(req.user!.tenantId);
  res.json(data);
}

export async function getForecasting(req: Request, res: Response) {
  const data = await financialService.getSalesForecasting(req.user!.tenantId);
  res.json(data);
}

export async function generateNfe(req: Request, res: Response) {
  const data = await financialService.generateBasicNfe(req.params.billingId, req.user!.tenantId, req.body);
  res.status(201).json(data);
}
