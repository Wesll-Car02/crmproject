-- ══════════════════════════════════════════════════════════════════════
-- Seed: Default tenant, roles, admin user
-- ══════════════════════════════════════════════════════════════════════

-- Default Tenant
INSERT INTO tenants (id, name, slug, plan) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Minha Empresa', 'minha-empresa', 'enterprise')
ON CONFLICT DO NOTHING;

-- System Roles
INSERT INTO roles (id, tenant_id, name, slug, description, is_system) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Super Admin', 'super_admin', 'Acesso total ao sistema', true),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Admin', 'admin', 'Administrador da empresa', true),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Gerente', 'manager', 'Gerente de vendas', true),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Vendedor', 'sales_rep', 'Representante de vendas', true),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'SDR', 'sdr', 'Sales Development Representative', true),
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'Suporte', 'support', 'Agente de suporte', true),
  ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'Visualizador', 'viewer', 'Somente leitura', true)
ON CONFLICT DO NOTHING;

-- Grant all permissions to super_admin and admin
INSERT INTO role_permissions (role_id, permission_id)
  SELECT '10000000-0000-0000-0000-000000000001', id FROM permissions
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
  SELECT '10000000-0000-0000-0000-000000000002', id FROM permissions
  WHERE module != 'settings' OR action = 'read'
ON CONFLICT DO NOTHING;

-- Manager permissions
INSERT INTO role_permissions (role_id, permission_id)
  SELECT '10000000-0000-0000-0000-000000000003', id FROM permissions
  WHERE module IN ('dashboard','leads','opportunities','proposals','contracts','cpq','campaigns','scheduling','analytics','ai','chat')
ON CONFLICT DO NOTHING;

-- Sales Rep permissions
INSERT INTO role_permissions (role_id, permission_id)
  SELECT '10000000-0000-0000-0000-000000000004', id FROM permissions
  WHERE module IN ('dashboard','leads','opportunities','proposals','cpq','scheduling','chat','ai')
  AND action IN ('create','read','update')
ON CONFLICT DO NOTHING;

-- SDR permissions
INSERT INTO role_permissions (role_id, permission_id)
  SELECT '10000000-0000-0000-0000-000000000005', id FROM permissions
  WHERE module IN ('dashboard','leads','scheduling','chat')
  AND action IN ('create','read','update')
ON CONFLICT DO NOTHING;

-- Support permissions
INSERT INTO role_permissions (role_id, permission_id)
  SELECT '10000000-0000-0000-0000-000000000006', id FROM permissions
  WHERE module IN ('dashboard','chat','leads','scheduling')
  AND action IN ('read','create','update')
ON CONFLICT DO NOTHING;

-- Viewer permissions
INSERT INTO role_permissions (role_id, permission_id)
  SELECT '10000000-0000-0000-0000-000000000007', id FROM permissions
  WHERE action = 'read'
ON CONFLICT DO NOTHING;

-- Default Admin User (password: Admin@123)
-- password hash for "Admin@123"
INSERT INTO users (id, tenant_id, email, password_hash, first_name, last_name, role_id, is_active, is_email_verified)
VALUES (
  '20000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'admin@crm.local',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewLxds4ZTAQ4pRVW',
  'Admin',
  'CRM',
  '10000000-0000-0000-0000-000000000001',
  true,
  true
) ON CONFLICT DO NOTHING;

-- Default Pipeline
INSERT INTO pipelines (id, tenant_id, name, is_default, created_by)
VALUES (
  '30000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Funil Principal',
  true,
  '20000000-0000-0000-0000-000000000001'
) ON CONFLICT DO NOTHING;

-- Default Pipeline Stages
INSERT INTO pipeline_stages (pipeline_id, tenant_id, name, color, sort_order, probability) VALUES
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Prospecção', '#6366f1', 0, 10),
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Qualificação', '#8b5cf6', 1, 25),
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Proposta', '#ec4899', 2, 50),
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Negociação', '#f59e0b', 3, 75),
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Fechamento', '#10b981', 4, 90)
ON CONFLICT DO NOTHING;

-- Default Win/Loss Reasons
INSERT INTO win_loss_reasons (tenant_id, type, reason) VALUES
  ('00000000-0000-0000-0000-000000000001', 'won', 'Melhor preço'),
  ('00000000-0000-0000-0000-000000000001', 'won', 'Melhor produto/serviço'),
  ('00000000-0000-0000-0000-000000000001', 'won', 'Relacionamento'),
  ('00000000-0000-0000-0000-000000000001', 'won', 'Prazos atendidos'),
  ('00000000-0000-0000-0000-000000000001', 'lost', 'Preço alto'),
  ('00000000-0000-0000-0000-000000000001', 'lost', 'Perdeu para concorrente'),
  ('00000000-0000-0000-0000-000000000001', 'lost', 'Budget insuficiente'),
  ('00000000-0000-0000-0000-000000000001', 'lost', 'Timing ruim'),
  ('00000000-0000-0000-0000-000000000001', 'lost', 'Lead sem qualidade'),
  ('00000000-0000-0000-0000-000000000001', 'lost', 'Não tomou decisão')
ON CONFLICT DO NOTHING;

-- Default Tags
INSERT INTO tags (tenant_id, name, color, created_by) VALUES
  ('00000000-0000-0000-0000-000000000001', 'VIP', '#f59e0b', '20000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000001', 'Cliente Potencial', '#10b981', '20000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000001', 'Follow-up', '#6366f1', '20000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000001', 'Indicação', '#ec4899', '20000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000001', 'Inativo', '#94a3b8', '20000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- Default NPS Survey
INSERT INTO nps_surveys (tenant_id, name, question, trigger, is_active) VALUES
  ('00000000-0000-0000-0000-000000000001',
   'Pesquisa Pós-venda',
   'Em uma escala de 0 a 10, qual a probabilidade de você recomendar nossa empresa para um amigo ou colega?',
   'post_sale',
   true)
ON CONFLICT DO NOTHING;
