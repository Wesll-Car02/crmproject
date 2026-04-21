import { Router } from 'express';
import { requirePermission } from '../../middlewares/rbac.middleware';
import * as controller from './chat.controller';

const router = Router();

// Conversations (customer-facing)
router.get('/conversations', requirePermission('chat', 'read'), controller.listConversations);
router.get('/conversations/:id/messages', requirePermission('chat', 'read'), controller.getMessages);
router.post('/conversations/:id/messages', requirePermission('chat', 'create'), controller.sendMessage);
router.patch('/conversations/:id/assign', requirePermission('chat', 'update'), controller.assign);
router.patch('/conversations/:id/resolve', requirePermission('chat', 'update'), controller.resolve);

// Internal Chat
router.get('/internal', requirePermission('chat', 'read'), controller.listInternalChats);
router.post('/internal/direct', requirePermission('chat', 'create'), controller.createDirectChat);
router.get('/internal/:chatId/messages', requirePermission('chat', 'read'), controller.getInternalMessages);
router.post('/internal/:chatId/messages', requirePermission('chat', 'create'), controller.sendInternalMessage);

export default router;
