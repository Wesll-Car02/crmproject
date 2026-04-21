import { Request, Response } from 'express';
import * as svc from './chat.service';

export async function listConversations(req: Request, res: Response): Promise<void> {
  res.json(await svc.getConversations(req.user!.tenantId, req.query));
}

export async function getMessages(req: Request, res: Response): Promise<void> {
  res.json(await svc.getMessages(req.params.id, req.user!.tenantId, req.query.before as string));
}

export async function sendMessage(req: Request, res: Response): Promise<void> {
  const msg = await svc.sendMessage(req.params.id, req.user!.tenantId, req.user!.id, {
    ...req.body,
    senderName: `${req.user!.firstName} ${req.user!.lastName}`,
  });
  res.status(201).json(msg);
}

export async function assign(req: Request, res: Response): Promise<void> {
  res.json(await svc.assignConversation(req.params.id, req.user!.tenantId, req.body.userId || req.user!.id));
}

export async function resolve(req: Request, res: Response): Promise<void> {
  res.json(await svc.resolveConversation(req.params.id, req.user!.tenantId));
}

// Internal
export async function listInternalChats(req: Request, res: Response): Promise<void> {
  res.json(await svc.getInternalChats(req.user!.tenantId, req.user!.id));
}

export async function getInternalMessages(req: Request, res: Response): Promise<void> {
  res.json(await svc.getInternalMessages(req.params.chatId, req.user!.id));
}

export async function sendInternalMessage(req: Request, res: Response): Promise<void> {
  const msg = await svc.sendInternalMessage(req.params.chatId, req.user!.id, req.body.content, req.body.type);
  res.status(201).json(msg);
}

export async function createDirectChat(req: Request, res: Response): Promise<void> {
  const chat = await svc.createDirectChat(req.user!.tenantId, req.user!.id, req.body.targetUserId);
  res.status(201).json(chat);
}
