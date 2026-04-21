import { query } from '../database';

/**
 * SAAS Service - Handles feature flags and quota management
 */

export class SaasService {
  /**
   * Check if a feature is enabled for a tenant
   */
  async isFeatureEnabled(tenantId: string, featureSlug: string): Promise<boolean> {
    try {
      const { rows } = await query(
        `SELECT is_feature_enabled($1, $2) as enabled`,
        [tenantId, featureSlug]
      );
      return rows[0]?.enabled === true;
    } catch (error) {
      console.error('Error checking feature:', error);
      return false;
    }
  }

  /**
   * Check if tenant has quota available for a metric
   */
  async checkQuota(tenantId: string, metric: string, increment = 1): Promise<boolean> {
    try {
      const { rows } = await query(
        `SELECT check_quota($1, $2, $3) as has_quota`,
        [tenantId, metric, increment]
      );
      return rows[0]?.has_quota === true;
    } catch (error) {
      console.error('Error checking quota:', error);
      return false;
    }
  }

  /**
   * Increment usage for a tenant
   */
  async incrementUsage(tenantId: string, metric: string, amount = 1): Promise<void> {
    try {
      await query(
        `SELECT increment_usage($1, $2, $3)`,
        [tenantId, metric, amount]
      );
    } catch (error) {
      console.error('Error incrementing usage:', error);
    }
  }

  /**
   * Get tenant's current plan information
   */
  async getTenantPlan(tenantId: string): Promise<any> {
    try {
      const { rows } = await query(
        `SELECT
          p.*,
          ts.status as subscription_status,
          ts.current_period_end,
          ts.trial_ends_at
        FROM tenant_subscriptions ts
        INNER JOIN saas_plans p ON p.id = ts.plan_id
        WHERE ts.tenant_id = $1
          AND ts.status IN ('active', 'trialing')`,
        [tenantId]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('Error getting tenant plan:', error);
      return null;
    }
  }

  /**
   * Get tenant's current usage
   */
  async getTenantUsage(tenantId: string, period?: string): Promise<any[]> {
    try {
      const currentPeriod = period || new Date().toISOString().slice(0, 7); // YYYY-MM
      const { rows } = await query(
        `SELECT metric, used, limit_value
         FROM tenant_usage
         WHERE tenant_id = $1 AND period = $2`,
        [tenantId, currentPeriod]
      );
      return rows;
    } catch (error) {
      console.error('Error getting tenant usage:', error);
      return [];
    }
  }

  /**
   * Get all features available for tenant
   */
  async getTenantFeatures(tenantId: string): Promise<any[]> {
    try {
      const { rows } = await query(
        `SELECT
          f.*,
          COALESCE(tf.is_enabled, pf.is_enabled) as is_enabled,
          tf.overrides,
          tf.enabled_at,
          tf.disabled_at
        FROM saas_features f
        LEFT JOIN tenant_features tf ON tf.feature_id = f.id AND tf.tenant_id = $1
        LEFT JOIN tenant_subscriptions ts ON ts.tenant_id = $1
        LEFT JOIN plan_features pf ON pf.plan_id = ts.plan_id AND pf.feature_id = f.id
        WHERE ts.status IN ('active', 'trialing')
        ORDER BY f.sort_order`,
        [tenantId]
      );
      return rows;
    } catch (error) {
      console.error('Error getting tenant features:', error);
      return [];
    }
  }

  /**
   * Enable/disable feature for tenant (admin only)
   */
  async setFeatureEnabled(tenantId: string, featureSlug: string, enabled: boolean): Promise<boolean> {
    try {
      // Get feature ID
      const { rows: featureRows } = await query(
        'SELECT id FROM saas_features WHERE slug = $1',
        [featureSlug]
      );

      if (featureRows.length === 0) {
        return false;
      }

      const featureId = featureRows[0].id;

      if (enabled) {
        await query(
          `INSERT INTO tenant_features (tenant_id, feature_id, is_enabled, enabled_at)
           VALUES ($1, $2, true, NOW())
           ON CONFLICT (tenant_id, feature_id)
           DO UPDATE SET is_enabled = true, disabled_at = NULL`,
          [tenantId, featureId]
        );
      } else {
        await query(
          `UPDATE tenant_features
           SET is_enabled = false, disabled_at = NOW()
           WHERE tenant_id = $1 AND feature_id = $2`,
          [tenantId, featureId]
        );
      }

      return true;
    } catch (error) {
      console.error('Error setting feature:', error);
      return false;
    }
  }
}

// Export singleton instance
export const saasService = new SaasService();