import { Request, Response, NextFunction } from 'express';
import { saasService } from '../services/saas.service';

/**
 * Middleware to check if tenant has quota available for a specific metric
 */
export function checkQuota(metric: string, increment = 1) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    // Super admin bypasses all quota checks
    if (req.user.roleSlug === 'super_admin') {
      next();
      return;
    }

    try {
      const hasQuota = await saasService.checkQuota(req.user.tenantId, metric, increment);

      if (!hasQuota) {
        // Get current usage and limit for better error message
        const plan = await saasService.getTenantPlan(req.user.tenantId);
        const limit = plan?.limits?.[metric];
        const usage = await saasService.getTenantUsage(req.user.tenantId);
        const currentUsage = usage.find(u => u.metric === metric)?.used || 0;

        res.status(429).json({
          error: 'Limite excedido',
          details: `Você atingiu o limite máximo de ${metric} para seu plano atual`,
          code: 'QUOTA_EXCEEDED',
          metric,
          currentUsage,
          limit,
          upgradeUrl: '/billing/upgrade'
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Error checking quota:', error);
      res.status(500).json({ error: 'Erro ao verificar limite de uso' });
    }
  };
}

/**
 * Middleware to increment usage after successful operation
 * Should be used after the main operation middleware
 */
export function incrementUsage(metric: string, amount = 1) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    // Store original json method
    const originalJson = res.json;

    // Override json method to increment usage after successful response
    res.json = function(body: any) {
      // Only increment usage on success (2xx status)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Check if this is a creation operation (POST with 201)
        if (req.method === 'POST' && res.statusCode === 201) {
          saasService.incrementUsage(req.user!.tenantId, metric, amount).catch(error => {
            console.error('Error incrementing usage:', error);
            // Don't fail the request if usage tracking fails
          });
        }
        // For other operations, you might want different logic
      }

      return originalJson.call(this, body);
    };

    next();
  };
}

/**
 * Combined middleware: check quota before, increment after
 */
export function withQuota(metric: string, increment = 1) {
  return [
    checkQuota(metric, increment),
    incrementUsage(metric, increment)
  ];
}

/**
 * Specialized quota middlewares for common operations
 */
export const quotaMiddleware = {
  // Lead operations
  leads: {
    create: withQuota('leads', 1),
    import: (count: number) => withQuota('leads', count)
  },

  // User operations
  users: {
    create: withQuota('users', 1),
    invite: withQuota('users', 1)
  },

  // Opportunity operations
  opportunities: {
    create: withQuota('opportunities', 1)
  },

  // Storage operations (in MB)
  storage: {
    upload: (sizeMB: number) => withQuota('storage_mb', sizeMB)
  },

  // API calls
  api: {
    call: withQuota('api_calls', 1)
  }
};