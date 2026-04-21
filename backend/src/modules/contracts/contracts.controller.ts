import { Request, Response } from 'express';
import * as contractsService from './contracts.service';

export async function list(req: Request, res: Response): Promise<void> {
  const result = await contractsService.findAll(req.user!.tenantId, req.query);
  res.json(result);
}

export async function get(req: Request, res: Response): Promise<void> {
  const contract = await contractsService.findById(req.params.id, req.user!.tenantId);
  if (!contract) { res.status(404).json({ error: 'Contrato não encontrado' }); return; }
  res.json(contract);
}

export async function create(req: Request, res: Response): Promise<void> {
  const contract = await contractsService.create(req.user!.tenantId, req.user!.id, req.body);
  res.status(201).json(contract);
}

export async function update(req: Request, res: Response): Promise<void> {
  const contract = await contractsService.update(req.params.id, req.user!.tenantId, req.body);
  res.json(contract);
}

export async function remove(req: Request, res: Response): Promise<void> {
  await contractsService.remove(req.params.id, req.user!.tenantId);
  res.status(204).send();
}

export async function generatePdf(req: Request, res: Response): Promise<void> {
  const result = await contractsService.generatePdf(req.params.id, req.user!.tenantId);
  res.json(result);
}

// Rota pública (não precisa de token JWT, a autenticação é via link signToken)
export async function signContract(req: Request, res: Response): Promise<void> {
  try {
    const { token } = req.params;
    const { signerName } = req.body;
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    
    if (!signerName) {
      res.status(400).json({ error: 'Nome do assinante é obrigatório' });
      return;
    }

    const contract = await contractsService.sign(token, ip as string, signerName);
    res.json({ message: 'Contrato assinado com sucesso!', contract });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}
