-- ══════════════════════════════════════════════════════════════════════
-- Migration 003: Sales (Pipelines, Opportunities, CPQ, Proposals, Contracts)
-- ══════════════════════════════════════════════════════════════════════

-- ─── Pipelines (Funis) ─────────────────────────────────────────────────
CREATE TABLE pipelines (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name         VARCHAR(255) NOT NULL,
  description  TEXT,
  is_default   BOOLEAN DEFAULT false,
  is_active    BOOLEAN DEFAULT true,
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Pipeline Stages (Colunas do Kanban) ──────────────────────────────
CREATE TABLE pipeline_stages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pipeline_id     UUID REFERENCES pipelines(id) ON DELETE CASCADE,
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  color           VARCHAR(20) DEFAULT '#6366f1',
  sort_order      INTEGER NOT NULL DEFAULT 0,
  probability     INTEGER DEFAULT 0,  -- 0-100%
  is_won          BOOLEAN DEFAULT false,
  is_lost         BOOLEAN DEFAULT false,
  custom_fields   JSONB DEFAULT '[]',  -- stage-specific fields
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Win/Loss Reasons ──────────────────────────────────────────────────
CREATE TABLE win_loss_reasons (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID REFERENCES tenants(id) ON DELETE CASCADE,
  type         VARCHAR(10) NOT NULL,  -- won, lost
  reason       VARCHAR(255) NOT NULL,
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Opportunities ─────────────────────────────────────────────────────
CREATE TABLE opportunities (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  pipeline_id     UUID REFERENCES pipelines(id),
  stage_id        UUID REFERENCES pipeline_stages(id),
  lead_id         UUID REFERENCES leads(id),
  contact_id      UUID REFERENCES contacts(id),
  -- Info
  title           VARCHAR(255) NOT NULL,
  value           NUMERIC(15,2) DEFAULT 0,
  currency        VARCHAR(3) DEFAULT 'BRL',
  probability     INTEGER DEFAULT 0,
  expected_close  DATE,
  -- Status
  status          VARCHAR(30) DEFAULT 'open',  -- open, won, lost
  won_at          TIMESTAMPTZ,
  lost_at         TIMESTAMPTZ,
  win_loss_reason_id UUID REFERENCES win_loss_reasons(id),
  win_loss_note   TEXT,
  -- Assignment
  owner_id        UUID REFERENCES users(id),
  team_id         UUID REFERENCES teams(id),
  -- Deal Rotting
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  rotting_days    INTEGER DEFAULT 0,
  is_rotting      BOOLEAN DEFAULT false,
  -- Metadata
  source          VARCHAR(50),
  tags            UUID[] DEFAULT '{}',
  custom_fields   JSONB DEFAULT '{}',
  notes           TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Opportunity Stage History ─────────────────────────────────────────
CREATE TABLE opportunity_history (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
  user_id        UUID REFERENCES users(id),
  from_stage_id  UUID REFERENCES pipeline_stages(id),
  to_stage_id    UUID REFERENCES pipeline_stages(id),
  from_value     NUMERIC(15,2),
  to_value       NUMERIC(15,2),
  note           TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Opportunity Activities ────────────────────────────────────────────
CREATE TABLE opportunity_activities (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id      UUID REFERENCES tenants(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
  user_id        UUID REFERENCES users(id),
  type           VARCHAR(50) NOT NULL,  -- note, call, email, meeting, task
  title          VARCHAR(255),
  description    TEXT,
  scheduled_at   TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,
  outcome        VARCHAR(50),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Sales Goals ───────────────────────────────────────────────────────
CREATE TABLE sales_goals (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES users(id),
  team_id      UUID REFERENCES teams(id),
  pipeline_id  UUID REFERENCES pipelines(id),
  period       VARCHAR(10) NOT NULL,  -- YYYY-MM
  target_value NUMERIC(15,2),
  target_deals INTEGER,
  actual_value NUMERIC(15,2) DEFAULT 0,
  actual_deals INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CPQ: Products & Services ──────────────────────────────────────────
CREATE TABLE product_categories (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name         VARCHAR(255) NOT NULL,
  parent_id    UUID REFERENCES product_categories(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  category_id     UUID REFERENCES product_categories(id),
  name            VARCHAR(255) NOT NULL,
  code            VARCHAR(100),
  description     TEXT,
  type            VARCHAR(20) DEFAULT 'product',  -- product, service, subscription
  unit            VARCHAR(30) DEFAULT 'un',
  base_price      NUMERIC(15,2) NOT NULL DEFAULT 0,
  cost_price      NUMERIC(15,2) DEFAULT 0,
  currency        VARCHAR(3) DEFAULT 'BRL',
  tax_rate        NUMERIC(5,2) DEFAULT 0,
  is_active       BOOLEAN DEFAULT true,
  is_recurring    BOOLEAN DEFAULT false,
  billing_cycle   VARCHAR(20),  -- monthly, quarterly, annual
  custom_fields   JSONB DEFAULT '{}',
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, code)
);

-- ─── Price Lists ───────────────────────────────────────────────────────
CREATE TABLE price_lists (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name         VARCHAR(255) NOT NULL,
  currency     VARCHAR(3) DEFAULT 'BRL',
  valid_from   DATE,
  valid_until  DATE,
  is_default   BOOLEAN DEFAULT false,
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE price_list_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  price_list_id UUID REFERENCES price_lists(id) ON DELETE CASCADE,
  product_id    UUID REFERENCES products(id) ON DELETE CASCADE,
  price         NUMERIC(15,2) NOT NULL,
  min_qty       INTEGER DEFAULT 1,
  discount_pct  NUMERIC(5,2) DEFAULT 0,
  UNIQUE(price_list_id, product_id)
);

-- ─── Quotes / Cotações ─────────────────────────────────────────────────
CREATE TABLE quotes (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        UUID REFERENCES tenants(id) ON DELETE CASCADE,
  opportunity_id   UUID REFERENCES opportunities(id),
  contact_id       UUID REFERENCES contacts(id),
  number           VARCHAR(50),
  title            VARCHAR(255),
  status           VARCHAR(30) DEFAULT 'draft',  -- draft, sent, approved, rejected, expired
  valid_until      DATE,
  subtotal         NUMERIC(15,2) DEFAULT 0,
  discount_value   NUMERIC(15,2) DEFAULT 0,
  discount_pct     NUMERIC(5,2) DEFAULT 0,
  tax_value        NUMERIC(15,2) DEFAULT 0,
  total            NUMERIC(15,2) DEFAULT 0,
  notes            TEXT,
  terms            TEXT,
  approval_status  VARCHAR(30),  -- pending, approved, rejected
  approved_by      UUID REFERENCES users(id),
  approved_at      TIMESTAMPTZ,
  created_by       UUID REFERENCES users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE quote_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id     UUID REFERENCES quotes(id) ON DELETE CASCADE,
  product_id   UUID REFERENCES products(id),
  name         VARCHAR(255) NOT NULL,
  description  TEXT,
  quantity     NUMERIC(10,3) NOT NULL DEFAULT 1,
  unit_price   NUMERIC(15,2) NOT NULL,
  discount_pct NUMERIC(5,2) DEFAULT 0,
  tax_rate     NUMERIC(5,2) DEFAULT 0,
  total        NUMERIC(15,2) NOT NULL,
  sort_order   INTEGER DEFAULT 0
);

-- ─── Proposals ─────────────────────────────────────────────────────────
CREATE TABLE proposal_templates (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name         VARCHAR(255) NOT NULL,
  content      JSONB NOT NULL DEFAULT '{}',  -- rich doc structure
  is_default   BOOLEAN DEFAULT false,
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE proposals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  opportunity_id  UUID REFERENCES opportunities(id),
  quote_id        UUID REFERENCES quotes(id),
  contact_id      UUID REFERENCES contacts(id),
  template_id     UUID REFERENCES proposal_templates(id),
  number          VARCHAR(50),
  title           VARCHAR(255) NOT NULL,
  content         JSONB NOT NULL DEFAULT '{}',
  status          VARCHAR(30) DEFAULT 'draft',  -- draft, sent, viewed, accepted, rejected
  total_value     NUMERIC(15,2) DEFAULT 0,
  valid_until     DATE,
  pdf_url         TEXT,
  sign_token      TEXT UNIQUE,
  signed_at       TIMESTAMPTZ,
  signer_ip       INET,
  signer_name     VARCHAR(255),
  viewed_at       TIMESTAMPTZ,
  sent_at         TIMESTAMPTZ,
  version         INTEGER DEFAULT 1,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Contracts ─────────────────────────────────────────────────────────
CREATE TABLE contracts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  proposal_id     UUID REFERENCES proposals(id),
  contact_id      UUID REFERENCES contacts(id),
  opportunity_id  UUID REFERENCES opportunities(id),
  number          VARCHAR(50),
  title           VARCHAR(255) NOT NULL,
  content         JSONB NOT NULL DEFAULT '{}',
  status          VARCHAR(30) DEFAULT 'draft',  -- draft, active, expired, cancelled, renewed
  value           NUMERIC(15,2) DEFAULT 0,
  start_date      DATE,
  end_date        DATE,
  renewal_date    DATE,
  pdf_url         TEXT,
  sign_token      TEXT UNIQUE,
  signed_at       TIMESTAMPTZ,
  signer_name     VARCHAR(255),
  signer_ip       INET,
  notes           TEXT,
  version         INTEGER DEFAULT 1,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Cadences (SDR) ────────────────────────────────────────────────────
CREATE TABLE cadences (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name         VARCHAR(255) NOT NULL,
  description  TEXT,
  is_active    BOOLEAN DEFAULT true,
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cadence_steps (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cadence_id   UUID REFERENCES cadences(id) ON DELETE CASCADE,
  step_number  INTEGER NOT NULL,
  type         VARCHAR(30) NOT NULL,  -- email, whatsapp, call, task
  delay_days   INTEGER DEFAULT 0,  -- days from previous step
  subject      VARCHAR(255),
  content      TEXT,
  variables    JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cadence_enrollments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cadence_id   UUID REFERENCES cadences(id) ON DELETE CASCADE,
  lead_id      UUID REFERENCES leads(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES users(id),
  status       VARCHAR(30) DEFAULT 'active',  -- active, paused, completed, replied, unsubscribed
  current_step INTEGER DEFAULT 0,
  started_at   TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cadence_executions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enrollment_id  UUID REFERENCES cadence_enrollments(id) ON DELETE CASCADE,
  step_id        UUID REFERENCES cadence_steps(id),
  status         VARCHAR(30) DEFAULT 'pending',  -- pending, executed, failed, skipped
  executed_at    TIMESTAMPTZ,
  error_message  TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ───────────────────────────────────────────────────────────
CREATE INDEX idx_opportunities_tenant ON opportunities(tenant_id);
CREATE INDEX idx_opportunities_pipeline ON opportunities(pipeline_id, stage_id);
CREATE INDEX idx_opportunities_owner ON opportunities(owner_id);
CREATE INDEX idx_opportunities_status ON opportunities(tenant_id, status);
CREATE INDEX idx_opportunities_close ON opportunities(tenant_id, expected_close);
CREATE INDEX idx_opportunities_rotting ON opportunities(tenant_id, is_rotting);
CREATE INDEX idx_quotes_tenant ON quotes(tenant_id);
CREATE INDEX idx_proposals_tenant ON proposals(tenant_id);
CREATE INDEX idx_contracts_tenant ON contracts(tenant_id);

CREATE TRIGGER update_pipelines_updated_at BEFORE UPDATE ON pipelines FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON opportunities FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON proposals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
