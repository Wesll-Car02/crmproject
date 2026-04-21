-- ══════════════════════════════════════════════════════════════════════
-- Migration 004: Financial Tables
-- ══════════════════════════════════════════════════════════════════════

-- ─── Cost Centers ──────────────────────────────────────────────────────
CREATE TABLE cost_centers (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name         VARCHAR(255) NOT NULL,
  code         VARCHAR(30),
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Commission Rules ──────────────────────────────────────────────────
CREATE TABLE commission_rules (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  type            VARCHAR(20) DEFAULT 'percentage',  -- percentage, fixed
  value           NUMERIC(10,4) NOT NULL,
  applies_to      VARCHAR(30) DEFAULT 'all',  -- all, specific_product, specific_team
  product_id      UUID REFERENCES products(id),
  team_id         UUID REFERENCES teams(id),
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Billings / Cobranças ──────────────────────────────────────────────
CREATE TABLE billings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id      UUID REFERENCES contacts(id),
  opportunity_id  UUID REFERENCES opportunities(id),
  contract_id     UUID REFERENCES contracts(id),
  -- Billing Info
  number          VARCHAR(50),
  description     VARCHAR(255),
  type            VARCHAR(30) DEFAULT 'single',  -- single, recurring
  -- Values
  subtotal        NUMERIC(15,2) NOT NULL,
  discount_value  NUMERIC(15,2) DEFAULT 0,
  interest_value  NUMERIC(15,2) DEFAULT 0,
  fine_value      NUMERIC(15,2) DEFAULT 0,
  total           NUMERIC(15,2) NOT NULL,
  currency        VARCHAR(3) DEFAULT 'BRL',
  -- Dates
  issue_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date        DATE NOT NULL,
  paid_at         TIMESTAMPTZ,
  -- Status
  status          VARCHAR(30) DEFAULT 'pending',  -- pending, paid, overdue, cancelled, refunded
  payment_method  VARCHAR(30),  -- boleto, pix, credit_card, bank_transfer
  -- Bradesco Boleto
  boleto_id       VARCHAR(100),
  boleto_url      TEXT,
  boleto_barcode  TEXT,
  boleto_digitable TEXT,
  boleto_pdf_url  TEXT,
  -- Notes
  notes           TEXT,
  cost_center_id  UUID REFERENCES cost_centers(id),
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Billing Items ─────────────────────────────────────────────────────
CREATE TABLE billing_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  billing_id   UUID REFERENCES billings(id) ON DELETE CASCADE,
  product_id   UUID REFERENCES products(id),
  description  VARCHAR(255) NOT NULL,
  quantity     NUMERIC(10,3) NOT NULL DEFAULT 1,
  unit_price   NUMERIC(15,2) NOT NULL,
  discount_pct NUMERIC(5,2) DEFAULT 0,
  total        NUMERIC(15,2) NOT NULL
);

-- ─── Payments ──────────────────────────────────────────────────────────
CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  billing_id      UUID REFERENCES billings(id) ON DELETE CASCADE,
  amount          NUMERIC(15,2) NOT NULL,
  payment_method  VARCHAR(30) NOT NULL,
  transaction_id  VARCHAR(255),
  paid_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes           TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Commissions ───────────────────────────────────────────────────────
CREATE TABLE commissions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES users(id),
  billing_id   UUID REFERENCES billings(id),
  opportunity_id UUID REFERENCES opportunities(id),
  rule_id      UUID REFERENCES commission_rules(id),
  type         VARCHAR(20) NOT NULL,
  rate         NUMERIC(10,4),
  base_value   NUMERIC(15,2),
  amount       NUMERIC(15,2) NOT NULL,
  status       VARCHAR(20) DEFAULT 'pending',  -- pending, approved, paid, cancelled
  period       VARCHAR(10),  -- YYYY-MM
  paid_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Subscriptions / Recorrência ───────────────────────────────────────
CREATE TABLE subscriptions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id      UUID REFERENCES contacts(id),
  contract_id     UUID REFERENCES contracts(id),
  product_id      UUID REFERENCES products(id),
  name            VARCHAR(255) NOT NULL,
  value           NUMERIC(15,2) NOT NULL,
  currency        VARCHAR(3) DEFAULT 'BRL',
  billing_cycle   VARCHAR(20) NOT NULL,  -- monthly, quarterly, semiannual, annual
  status          VARCHAR(20) DEFAULT 'active',  -- active, paused, cancelled, churned
  start_date      DATE NOT NULL,
  end_date        DATE,
  next_billing    DATE,
  churn_date      TIMESTAMPTZ,
  churn_reason    TEXT,
  trial_ends_at   DATE,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── NF-e Documents ────────────────────────────────────────────────────
CREATE TABLE nfe_documents (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id      UUID REFERENCES tenants(id) ON DELETE CASCADE,
  billing_id     UUID REFERENCES billings(id),
  type           VARCHAR(10) DEFAULT 'nfse',  -- nfse, nfe
  number         VARCHAR(50),
  series         VARCHAR(10),
  status         VARCHAR(30) DEFAULT 'pending',  -- pending, issued, cancelled, error
  xml_url        TEXT,
  pdf_url        TEXT,
  protocol       VARCHAR(100),
  verify_code    VARCHAR(50),
  service_code   VARCHAR(20),
  iss_value      NUMERIC(15,2),
  external_id    VARCHAR(255),
  error_message  TEXT,
  issued_at      TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ───────────────────────────────────────────────────────────
CREATE INDEX idx_billings_tenant ON billings(tenant_id);
CREATE INDEX idx_billings_status ON billings(tenant_id, status);
CREATE INDEX idx_billings_due ON billings(tenant_id, due_date);
CREATE INDEX idx_billings_contact ON billings(contact_id);
CREATE INDEX idx_payments_tenant ON payments(tenant_id);
CREATE INDEX idx_commissions_user ON commissions(user_id, period);
CREATE INDEX idx_subscriptions_tenant ON subscriptions(tenant_id, status);

CREATE TRIGGER update_billings_updated_at BEFORE UPDATE ON billings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
