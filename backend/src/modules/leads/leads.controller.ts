import { Request, Response } from 'express';
import * as leadsService from './leads.service';

export async function list(req: Request, res: Response): Promise<void> {
  const result = await leadsService.findAll(req.user!.tenantId, req.query);
  res.json(result);
}

export async function get(req: Request, res: Response): Promise<void> {
  const lead = await leadsService.findById(req.params.id, req.user!.tenantId);
  if (!lead) { res.status(404).json({ error: 'Lead não encontrado' }); return; }
  res.json(lead);
}

export async function create(req: Request, res: Response): Promise<void> {
  const lead = await leadsService.create(req.user!.tenantId, req.user!.id, req.body);
  res.status(201).json(lead);
}

export async function update(req: Request, res: Response): Promise<void> {
  const lead = await leadsService.update(req.params.id, req.user!.tenantId, req.body);
  res.json(lead);
}

export async function remove(req: Request, res: Response): Promise<void> {
  await leadsService.remove(req.params.id, req.user!.tenantId);
  res.status(204).send();
}

export async function getActivities(req: Request, res: Response): Promise<void> {
  const activities = await leadsService.getActivities(req.params.id);
  res.json(activities);
}

export async function addActivity(req: Request, res: Response): Promise<void> {
  const activity = await leadsService.addActivity(
    req.params.id, req.user!.tenantId, req.user!.id, req.body
  );
  res.status(201).json(activity);
}

export async function addTag(req: Request, res: Response): Promise<void> {
  await leadsService.addTag(req.params.id, req.body.tagId);
  res.json({ message: 'Tag adicionada' });
}

export async function removeTag(req: Request, res: Response): Promise<void> {
  await leadsService.removeTag(req.params.id, req.params.tagId);
  res.json({ message: 'Tag removida' });
}

export async function stats(req: Request, res: Response): Promise<void> {
  const stats = await leadsService.getStats(req.user!.tenantId);
  res.json(stats);
}

export async function convertToOpportunity(req: Request, res: Response): Promise<void> {
  const opp = await leadsService.convertToOpportunity(
    req.params.id, req.user!.tenantId, req.user!.id, req.body
  );
  res.status(201).json(opp);
}

export async function importLeads(req: Request, res: Response): Promise<void> {
  res.json({ message: 'Importação em processamento' });
}

export async function exportLeads(req: Request, res: Response): Promise<void> {
  res.json({ message: 'Exportação disponível em breve' });
}

export async function getContacts(req: Request, res: Response): Promise<void> {
  const contacts = await leadsService.getContacts(req.params.id, req.user!.tenantId);
  res.json(contacts);
}

export async function addContact(req: Request, res: Response): Promise<void> {
  const contact = await leadsService.addContact(req.params.id, req.user!.tenantId, req.body);
  res.status(201).json(contact);
}

export async function updateContact(req: Request, res: Response): Promise<void> {
  const contact = await leadsService.updateContact(req.params.contactId, req.user!.tenantId, req.body);
  res.json(contact);
}

export async function removeContact(req: Request, res: Response): Promise<void> {
  await leadsService.removeContact(req.params.contactId, req.user!.tenantId);
  res.status(204).send();
}
