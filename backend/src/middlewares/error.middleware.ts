import { Request, Response, NextFunction } from 'express';
import { query } from '../database';

export function auditLog(action: string, module: string) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    next();
    // Log is async and non-blocking
    if (req.user) {
      query(
        `INSERT INTO audit_logs (tenant_id, user_id, action, module, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          req.user.tenantId,
          req.user.id,
          action,
          module,
          req.ip,
          req.get('user-agent'),
        ]
      ).catch(console.error);
    }
  };
}

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('[Error]', err);

  if (err.name === 'ZodError') {
    res.status(400).json({
      error: 'Dados inválidos',
      details: err.errors.map((e: any) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  if (err.code === '23505') {
    res.status(409).json({ error: 'Registro duplicado' });
    return;
  }

  if (err.code === '23503') {
    res.status(400).json({ error: 'Referência inválida' });
    return;
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Erro interno do servidor';

  res.status(status).json({ error: message });
}
