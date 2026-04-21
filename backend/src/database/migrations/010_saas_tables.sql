-- Migration 010: SAAS multi-tenant management system
-- Adds tables for plans, subscriptions, features, and usage tracking

-- SAAS Plans table (básico, profissional, enterprise)
CREATE TABLE IF NOT EXISTS saas_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2),
  price_yearly DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  features JSONB DEFAULT '{}',
  limits JSONB DEFAULT '{}',
  stripe_price_id_monthly VARCHAR(255),
  stripe_price_id_yearly VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tenant subscriptions (link between tenant and plan)
CREATE TABLE IF NOT EXISTS tenant_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES saas_plans(id),
  status VARCHAR(20) DEFAULT 'active', -- active, trialing, past_due, cancelled, expired
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  trial_ends_at TIMESTAMPTZ,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id)
);

-- Tenant usage tracking
CREATE TABLE IF NOT EXISTS tenant_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  period VARCHAR(7) NOT NULL, -- YYYY-MM format
  metric VARCHAR(50) NOT NULL, -- users, leads, opportunities, storage_mb, api_calls
  used INTEGER DEFAULT 0,
  limit_value INTEGER, -- NULL for unlimited
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, period, metric)
);

-- SAAS Features table (available features/modules)
CREATE TABLE IF NOT EXISTS saas_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module VARCHAR(100) NOT NULL, -- leads, opportunities, crm, scheduling, etc.
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  is_core BOOLEAN DEFAULT false, -- Core feature always active
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Plan features (which features are included in each plan)
CREATE TABLE IF NOT EXISTS plan_features (
  plan_id UUID NOT NULL REFERENCES saas_plans(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES saas_features(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT true,
  limits JSONB DEFAULT '{}', -- Feature-specific limits
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY(plan_id, feature_id)
);

-- Tenant features (which features are active for each tenant)
CREATE TABLE IF NOT EXISTS tenant_features (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES saas_features(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT true,
  overrides JSONB DEFAULT '{}', -- Tenant-specific overrides
  enabled_at TIMESTAMPTZ DEFAULT NOW(),
  disabled_at TIMESTAMPTZ,
  PRIMARY KEY(tenant_id, feature_id)
);

-- Add billing fields to tenants table
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES tenant_subscriptions(id),
ADD COLUMN IF NOT EXISTS billing_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS billing_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS billing_address JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS plan_upgrade_requested_at TIMESTAMPTZ;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_saas_plans_slug ON saas_plans(slug);
CREATE INDEX IF NOT EXISTS idx_saas_plans_active ON saas_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_tenant ON tenant_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_status ON tenant_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_period ON tenant_subscriptions(current_period_end);
CREATE INDEX IF NOT EXISTS idx_tenant_usage_tenant_period ON tenant_usage(tenant_id, period);
CREATE INDEX IF NOT EXISTS idx_saas_features_slug ON saas_features(slug);
CREATE INDEX IF NOT EXISTS idx_saas_features_module ON saas_features(module);
CREATE INDEX IF NOT EXISTS idx_plan_features_plan ON plan_features(plan_id);
CREATE INDEX IF NOT EXISTS idx_tenant_features_tenant ON tenant_features(tenant_id);

-- Insert default SAAS plans
INSERT INTO saas_plans (name, slug, description, price_monthly, price_yearly, is_active, sort_order, features, limits) VALUES
(
  'Básico',
  'basic',
  'Plano ideal para pequenas equipes que estão começando',
  99.00,
  999.00, -- ~16% discount for yearly
  true,
  1,
  '{"leads": true, "contacts": true, "basic_scheduling": true, "email_templates": true, "basic_reports": true}'::jsonb,
  '{"users": 5, "leads": 1000, "storage_mb": 1024, "api_calls": 10000}'::jsonb
),
(
  'Profissional',
  'professional',
  'Para equipes que precisam de funcionalidades avançadas',
  199.00,
  1999.00, -- ~16% discount for yearly
  true,
  2,
  '{"leads": true, "contacts": true, "advanced_scheduling": true, "opportunities": true, "automations": true, "advanced_reports": true, "integrations": true}'::jsonb,
  '{"users": 20, "leads": 10000, "storage_mb": 5120, "api_calls": 50000}'::jsonb
),
(
  'Enterprise',
  'enterprise',
  'Solução completa para grandes empresas',
  499.00,
  4999.00, -- ~16% discount for yearly
  true,
  3,
  '{"leads": true, "contacts": true, "advanced_scheduling": true, "opportunities": true, "automations": true, "advanced_reports": true, "integrations": true, "custom_fields": true, "sso": true, "api_access": true, "white_label": true}'::jsonb,
  '{"users": 100, "leads": 50000, "storage_mb": 20480, "api_calls": 250000}'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- Insert default SAAS features
INSERT INTO saas_features (module, name, slug, description, is_core, sort_order) VALUES
-- Core features (always available)
('core', 'Gestão de Leads', 'leads', 'Sistema completo de gestão de leads', true, 1),
('core', 'Contatos', 'contacts', 'Gestão de contatos e empresas', true, 2),
('core', 'Agendamento Básico', 'basic_scheduling', 'Agendamento interno de tarefas', true, 3),

-- Professional features
('scheduling', 'Agendamento Avançado', 'advanced_scheduling', 'Agendamento público, integração com calendários', false, 4),
('sales', 'Oportunidades', 'opportunities', 'Funil de vendas e gestão de oportunidades', false, 5),
('automation', 'Automações', 'automations', 'Workflows e automações de marketing', false, 6),
('analytics', 'Relatórios Avançados', 'advanced_reports', 'Dashboards e analytics detalhados', false, 7),
('integrations', 'Integrações', 'integrations', 'Integração com WhatsApp, Email, etc.', false, 8),

-- Enterprise features
('customization', 'Campos Personalizados', 'custom_fields', 'Criação de campos personalizados', false, 9),
('security', 'SSO (Single Sign-On)', 'sso', 'Autenticação única com SAML/OAuth', false, 10),
('api', 'API Access', 'api_access', 'Acesso à API REST completa', false, 11),
('branding', 'White Label', 'white_label', 'Personalização completa da marca', false, 12)
ON CONFLICT (slug) DO NOTHING;

-- Link features to plans
INSERT INTO plan_features (plan_id, feature_id, is_enabled)
SELECT p.id, f.id, true
FROM saas_plans p
CROSS JOIN saas_features f
WHERE
  -- Basic plan: core features only
  (p.slug = 'basic' AND f.is_core = true) OR
  -- Professional plan: core + professional features
  (p.slug = 'professional' AND (f.is_core = true OR f.slug IN ('advanced_scheduling', 'opportunities', 'automations', 'advanced_reports', 'integrations'))) OR
  -- Enterprise plan: all features
  (p.slug = 'enterprise')
ON CONFLICT (plan_id, feature_id) DO NOTHING;

-- Create function to check if a feature is enabled for a tenant
CREATE OR REPLACE FUNCTION is_feature_enabled(
  p_tenant_id UUID,
  p_feature_slug VARCHAR(100)
) RETURNS BOOLEAN AS $$
DECLARE
  v_feature_id UUID;
  v_is_enabled BOOLEAN;
BEGIN
  -- Get feature ID
  SELECT id INTO v_feature_id FROM saas_features WHERE slug = p_feature_slug;

  IF v_feature_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check if feature is enabled for tenant
  SELECT is_enabled INTO v_is_enabled
  FROM tenant_features
  WHERE tenant_id = p_tenant_id AND feature_id = v_feature_id;

  -- If tenant has specific setting, use it
  IF FOUND THEN
    RETURN v_is_enabled;
  END IF;

  -- Otherwise check plan default
  SELECT pf.is_enabled INTO v_is_enabled
  FROM tenant_subscriptions ts
  INNER JOIN plan_features pf ON pf.plan_id = ts.plan_id
  WHERE ts.tenant_id = p_tenant_id
    AND ts.status IN ('active', 'trialing')
    AND pf.feature_id = v_feature_id;

  RETURN COALESCE(v_is_enabled, false);
END;
$$ LANGUAGE plpgsql;

-- Create function to check quota/limit
CREATE OR REPLACE FUNCTION check_quota(
  p_tenant_id UUID,
  p_metric VARCHAR(50),
  p_increment INTEGER DEFAULT 1
) RETURNS BOOLEAN AS $$
DECLARE
  v_limit INTEGER;
  v_used INTEGER;
  v_plan_limits JSONB;
BEGIN
  -- Get current period (YYYY-MM)
  DECLARE
    v_period VARCHAR(7) := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
  BEGIN
    -- Get plan limits
    SELECT p.limits->>p_metric INTO v_limit
    FROM tenant_subscriptions ts
    INNER JOIN saas_plans p ON p.id = ts.plan_id
    WHERE ts.tenant_id = p_tenant_id
      AND ts.status IN ('active', 'trialing');

    -- If limit is NULL, unlimited
    IF v_limit IS NULL THEN
      RETURN true;
    END IF;

    -- Get current usage
    SELECT used INTO v_used
    FROM tenant_usage
    WHERE tenant_id = p_tenant_id
      AND period = v_period
      AND metric = p_metric;

    -- If no record exists, start at 0
    v_used := COALESCE(v_used, 0);

    -- Check if increment would exceed limit
    RETURN (v_used + p_increment) <= v_limit::INTEGER;
  END;
END;
$$ LANGUAGE plpgsql;

-- Create function to increment usage
CREATE OR REPLACE FUNCTION increment_usage(
  p_tenant_id UUID,
  p_metric VARCHAR(50),
  p_amount INTEGER DEFAULT 1
) RETURNS VOID AS $$
DECLARE
  v_period VARCHAR(7) := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
BEGIN
  INSERT INTO tenant_usage (tenant_id, period, metric, used)
  VALUES (p_tenant_id, v_period, p_metric, p_amount)
  ON CONFLICT (tenant_id, period, metric)
  DO UPDATE SET
    used = tenant_usage.used + EXCLUDED.used,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;