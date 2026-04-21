import { Request, Response, NextFunction } from 'express';
import { query } from '../database';

export function requirePermission(module: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    // Super admin bypasses all permission checks
    if (req.user.roleSlug === 'super_admin') {
      next();
      return;
    }

    const { rows } = await query(
      `SELECT rp.permission_id
       FROM role_permissions rp
       JOIN permissions p ON p.id = rp.permission_id
       WHERE rp.role_id = $1 AND p.module = $2 AND p.action = $3`,
      [req.user.roleId, module, action]
    );

    if (!rows[0]) {
      res.status(403).json({
        error: 'Acesso negado',
        details: `Sem permissão: ${module}:${action}`,
      });
      return;
    }

    next();
  };
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    if (!roles.includes(req.user.roleSlug)) {
      res.status(403).json({
        error: 'Acesso negado',
        details: `Role necessária: ${roles.join(' ou ')}`,
      });
      return;
    }

    next();
  };
}

export function requireSameTeam(req: Request, res: Response, next: NextFunction): void {
  // Managers and above can see everything; reps can only see their own
  if (!req.user) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  const allowedRoles = ['super_admin', 'admin', 'manager'];
  if (allowedRoles.includes(req.user.roleSlug)) {
    next();
    return;
  }
  // For sales_rep, sdr, support — filter to their own data
  req.query.ownerId = req.user.id;
  next();
}
