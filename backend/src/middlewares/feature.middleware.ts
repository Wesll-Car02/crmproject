import { Request, Response, NextFunction } from 'express';
import { saasService } from '../services/saas.service';

/**
 * Middleware to require a specific feature to be enabled for the tenant
 */
export function requireFeature(featureSlug: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    // Super admin bypasses all feature checks
    if (req.user.roleSlug === 'super_admin') {
      next();
      return;
    }

    try {
      const isEnabled = await saasService.isFeatureEnabled(req.user.tenantId, featureSlug);

      if (!isEnabled) {
        res.status(403).json({
          error: 'Funcionalidade não disponível',
          details: `O módulo "${featureSlug}" não está incluído no seu plano atual`,
          code: 'FEATURE_NOT_AVAILABLE',
          feature: featureSlug,
          upgradeUrl: '/billing/upgrade'
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Error checking feature:', error);
      res.status(500).json({ error: 'Erro ao verificar disponibilidade da funcionalidade' });
    }
  };
}

/**
 * Middleware to require multiple features (all must be enabled)
 */
export function requireAllFeatures(...featureSlugs: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    // Super admin bypasses all feature checks
    if (req.user.roleSlug === 'super_admin') {
      next();
      return;
    }

    try {
      const checks = await Promise.all(
        featureSlugs.map(slug => saasService.isFeatureEnabled(req.user!.tenantId, slug))
      );

      const allEnabled = checks.every(enabled => enabled);

      if (!allEnabled) {
        const missingFeatures = featureSlugs.filter((_, index) => !checks[index]);

        res.status(403).json({
          error: 'Funcionalidades não disponíveis',
          details: `Os seguintes módulos não estão incluídos no seu plano: ${missingFeatures.join(', ')}`,
          code: 'FEATURES_NOT_AVAILABLE',
          missingFeatures,
          upgradeUrl: '/billing/upgrade'
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Error checking features:', error);
      res.status(500).json({ error: 'Erro ao verificar disponibilidade das funcionalidades' });
    }
  };
}

/**
 * Middleware to require at least one of the features to be enabled
 */
export function requireAnyFeature(...featureSlugs: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    // Super admin bypasses all feature checks
    if (req.user.roleSlug === 'super_admin') {
      next();
      return;
    }

    try {
      const checks = await Promise.all(
        featureSlugs.map(slug => saasService.isFeatureEnabled(req.user!.tenantId, slug))
      );

      const anyEnabled = checks.some(enabled => enabled);

      if (!anyEnabled) {
        res.status(403).json({
          error: 'Nenhuma funcionalidade disponível',
          details: `Nenhum dos seguintes módulos está incluído no seu plano: ${featureSlugs.join(', ')}`,
          code: 'NO_FEATURE_AVAILABLE',
          requiredFeatures: featureSlugs,
          upgradeUrl: '/billing/upgrade'
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Error checking features:', error);
      res.status(500).json({ error: 'Erro ao verificar disponibilidade das funcionalidades' });
    }
  };
}