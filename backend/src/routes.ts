import { Application } from 'express';
import { Server as SocketServer } from 'socket.io';
import rateLimit from 'express-rate-limit';
import { authenticate } from './middlewares/auth.middleware';

// Module routes
import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import leadsRoutes from './modules/leads/leads.routes';
import opportunitiesRoutes from './modules/opportunities/opportunities.routes';
import pipelineRoutes from './modules/pipeline/pipeline.routes';
import cpqRoutes from './modules/cpq/cpq.routes';
import proposalsRoutes from './modules/proposals/proposals.routes';
import contractsRoutes from './modules/contracts/contracts.routes';
import cadenceRoutes from './modules/cadence/cadence.routes';
import financialRoutes from './modules/financial/financial.routes';
import chatRoutes from './modules/chat/chat.routes';
import automationsRoutes from './modules/automations/automations.routes';
import campaignsRoutes from './modules/campaigns/campaigns.routes';
import landingPagesRoutes from './modules/landing-pages/landing-pages.routes';
import schedulingRoutes from './modules/scheduling/scheduling.routes';
import csRoutes from './modules/customer-success/customer-success.routes';
import aiRoutes from './modules/ai/ai.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import tagsRoutes from './modules/tags/tags.routes';
import prospectingRoutes from './modules/prospecting/prospecting.routes';
import integrationsRoutes from './modules/integrations/integrations.routes';
import webhooksRoutes from './modules/webhooks/webhooks.routes';
import adminRoutes from './modules/admin/admin.routes';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Muitas requisições, tente novamente em breve' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Muitas tentativas de login' },
});

export function setupRoutes(app: Application, _io: SocketServer): void {
  // Public routes
  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/webhooks', webhooksRoutes);

  // Protected routes
  app.use('/api', apiLimiter, authenticate);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/leads', leadsRoutes);
  app.use('/api/opportunities', opportunitiesRoutes);
  app.use('/api/pipelines', pipelineRoutes);
  app.use('/api/cpq', cpqRoutes);
  app.use('/api/proposals', proposalsRoutes);
  app.use('/api/contracts', contractsRoutes);
  app.use('/api/cadences', cadenceRoutes);
  app.use('/api/financial', financialRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/automations', automationsRoutes);
  app.use('/api/campaigns', campaignsRoutes);
  app.use('/api/landing-pages', landingPagesRoutes);
  app.use('/api/scheduling', schedulingRoutes);
  app.use('/api/customer-success', csRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/tags', tagsRoutes);
  app.use('/api/prospecting', prospectingRoutes);
  app.use('/api/integrations', integrationsRoutes);
  app.use('/api/admin', adminRoutes);
}
