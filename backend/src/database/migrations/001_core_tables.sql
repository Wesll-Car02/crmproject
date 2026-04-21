-- ══════════════════════════════════════════════════════════════════════
-- Migration 001: Core Tables (tenants, users, roles, permissions, RBAC)
-- ══════════════════════════════════════════════════════════════════════

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ─── Tenants (Multi-company) ───────────────────────────────────────────
CREATE TABLE tenants (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         VARCHAR(255) NOT NULL,
  slug         VARCHAR(100) UNIQUE NOT NULL,
  domain       VARCHAR(255),
  logo_url     TEXT,
  plan         VARCHAR(50) DEFAULT 'starter',
  settings     JSONB DEFAULT '{}',
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Roles ─────────────────────────────────────────────────────────────
CREATE TABLE roles (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name         VARCHAR(100) NOT NULL,
  slug         VARCHAR(100) NOT NULL,
  description  TEXT,
  is_system    BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, slug)
);

-- ─── Permissions ───────────────────────────────────────────────────────
CREATE TABLE permissions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module       VARCHAR(100) NOT NULL,
  action       VARCHAR(50) NOT NULL,  -- create, read, update, delete, manage
  description  TEXT,
  UNIQUE(module, action)
);

-- ─── Role Permissions ──────────────────────────────────────────────────
CREATE TABLE role_permissions (
  role_id        UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id  UUID REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY(role_id, permission_id)
);

-- ─── Users ─────────────────────────────────────────────────────────────
CREATE TABLE users (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        UUID REFERENCES tenants(id) ON DELETE CASCADE,
  email            VARCHAR(255) NOT NULL,
  password_hash    TEXT NOT NULL,
  first_name       VARCHAR(100) NOT NULL,
  last_name        VARCHAR(100) NOT NULL,
  phone            VARCHAR(20),
  avatar_url       TEXT,
  role_id          UUID REFERENCES roles(id),
  is_active        BOOLEAN DEFAULT true,
  is_email_verified BOOLEAN DEFAULT false,
  two_factor_secret TEXT,
  two_factor_enabled BOOLEAN DEFAULT false,
  last_login_at    TIMESTAMPTZ,
  invited_by       UUID REFERENCES users(id),
  settings         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

-- ─── Sessions / Refresh Tokens ─────────────────────────────────────────
CREATE TABLE user_sessions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL UNIQUE,
  ip_address   INET,
  user_agent   TEXT,
  is_active    BOOLEAN DEFAULT true,
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── User Invitations ──────────────────────────────────────────────────
CREATE TABLE user_invitations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID REFERENCES tenants(id) ON DELETE CASCADE,
  email        VARCHAR(255) NOT NULL,
  role_id      UUID REFERENCES roles(id),
  invited_by   UUID REFERENCES users(id),
  token        TEXT NOT NULL UNIQUE,
  expires_at   TIMESTAMPTZ NOT NULL,
  accepted_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Audit Logs ────────────────────────────────────────────────────────
CREATE TABLE audit_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  action       VARCHAR(100) NOT NULL,
  module       VARCHAR(100) NOT NULL,
  resource_id  UUID,
  old_data     JSONB,
  new_data     JSONB,
  ip_address   INET,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Teams ─────────────────────────────────────────────────────────────
CREATE TABLE teams (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name         VARCHAR(255) NOT NULL,
  description  TEXT,
  manager_id   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE team_members (
  team_id    UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY(team_id, user_id)
);

-- ─── Tags ──────────────────────────────────────────────────────────────
CREATE TABLE tags (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name         VARCHAR(100) NOT NULL,
  color        VARCHAR(20) DEFAULT '#6366f1',
  icon         VARCHAR(50),
  description  TEXT,
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

-- ─── Notifications ─────────────────────────────────────────────────────
CREATE TABLE notifications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  type         VARCHAR(50) NOT NULL,
  title        VARCHAR(255) NOT NULL,
  body         TEXT,
  data         JSONB DEFAULT '{}',
  is_read      BOOLEAN DEFAULT false,
  read_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ───────────────────────────────────────────────────────────
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id, is_active);

-- ─── Triggers: updated_at ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Default Permissions ───────────────────────────────────────────────
INSERT INTO permissions (module, action, description) VALUES
-- Dashboard
('dashboard', 'read', 'Visualizar dashboard'),
-- Leads
('leads', 'create', 'Criar leads'),
('leads', 'read', 'Visualizar leads'),
('leads', 'update', 'Editar leads'),
('leads', 'delete', 'Excluir leads'),
('leads', 'import', 'Importar leads'),
('leads', 'export', 'Exportar leads'),
-- Opportunities
('opportunities', 'create', 'Criar oportunidades'),
('opportunities', 'read', 'Visualizar oportunidades'),
('opportunities', 'update', 'Editar oportunidades'),
('opportunities', 'delete', 'Excluir oportunidades'),
-- Proposals
('proposals', 'create', 'Criar propostas'),
('proposals', 'read', 'Visualizar propostas'),
('proposals', 'update', 'Editar propostas'),
('proposals', 'delete', 'Excluir propostas'),
-- Contracts
('contracts', 'create', 'Criar contratos'),
('contracts', 'read', 'Visualizar contratos'),
('contracts', 'update', 'Editar contratos'),
('contracts', 'delete', 'Excluir contratos'),
-- CPQ
('cpq', 'create', 'Criar produtos/cotações'),
('cpq', 'read', 'Ver catálogo e cotações'),
('cpq', 'update', 'Editar produtos/cotações'),
('cpq', 'delete', 'Excluir produtos/cotações'),
-- Financial
('financial', 'create', 'Criar cobranças/boletos'),
('financial', 'read', 'Visualizar financeiro'),
('financial', 'update', 'Editar cobranças'),
('financial', 'delete', 'Cancelar cobranças'),
-- Chat
('chat', 'read', 'Visualizar conversas'),
('chat', 'create', 'Enviar mensagens'),
('chat', 'manage', 'Gerenciar canais de chat'),
-- Campaigns
('campaigns', 'create', 'Criar campanhas'),
('campaigns', 'read', 'Visualizar campanhas'),
('campaigns', 'update', 'Editar campanhas'),
('campaigns', 'delete', 'Excluir campanhas'),
-- Automations
('automations', 'create', 'Criar automações'),
('automations', 'read', 'Visualizar automações'),
('automations', 'update', 'Editar automações'),
('automations', 'delete', 'Excluir automações'),
-- Landing Pages
('landing_pages', 'create', 'Criar landing pages'),
('landing_pages', 'read', 'Visualizar landing pages'),
('landing_pages', 'update', 'Editar landing pages'),
('landing_pages', 'delete', 'Excluir landing pages'),
-- Reports
('analytics', 'read', 'Visualizar relatórios'),
('analytics', 'export', 'Exportar relatórios'),
-- Users
('users', 'create', 'Criar usuários'),
('users', 'read', 'Visualizar usuários'),
('users', 'update', 'Editar usuários'),
('users', 'delete', 'Excluir usuários'),
('users', 'manage', 'Gerenciar roles/permissões'),
-- Settings
('settings', 'read', 'Visualizar configurações'),
('settings', 'update', 'Editar configurações'),
-- AI
('ai', 'use', 'Usar funcionalidades de IA'),
-- Scheduling
('scheduling', 'create', 'Criar agendamentos'),
('scheduling', 'read', 'Visualizar agenda'),
('scheduling', 'update', 'Editar agendamentos'),
('scheduling', 'delete', 'Excluir agendamentos');
