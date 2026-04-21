-- ══════════════════════════════════════════════════════════════════════
-- Migration 002: Contacts, Leads, Prospecting Tables
-- ══════════════════════════════════════════════════════════════════════

-- ─── Contacts ──────────────────────────────────────────────────────────
CREATE TABLE contacts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  type            VARCHAR(20) DEFAULT 'person',  -- person, company
  -- Person fields
  first_name      VARCHAR(100),
  last_name       VARCHAR(100),
  email           VARCHAR(255),
  phone           VARCHAR(30),
  mobile          VARCHAR(30),
  cpf             VARCHAR(20),
  birth_date      DATE,
  -- Company fields
  company_name    VARCHAR(255),
  cnpj            VARCHAR(20),
  trade_name      VARCHAR(255),
  cnae            VARCHAR(10),
  legal_nature    VARCHAR(100),
  founding_date   DATE,
  company_size    VARCHAR(50),  -- micro, small, medium, large
  annual_revenue  NUMERIC(15,2),
  employee_count  INTEGER,
  -- Address
  address_street  VARCHAR(255),
  address_number  VARCHAR(20),
  address_comp    VARCHAR(100),
  address_district VARCHAR(100),
  address_city    VARCHAR(100),
  address_state   VARCHAR(2),
  address_zip     VARCHAR(10),
  address_country VARCHAR(50) DEFAULT 'BR',
  -- Social
  linkedin_url    TEXT,
  instagram_url   TEXT,
  website_url     TEXT,
  -- Internal
  owner_id        UUID REFERENCES users(id),
  is_customer     BOOLEAN DEFAULT false,
  custom_fields   JSONB DEFAULT '{}',
  notes           TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Lead Custom Field Definitions ────────────────────────────────────
CREATE TABLE lead_custom_fields (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID REFERENCES tenants(id) ON DELETE CASCADE,
  label        VARCHAR(100) NOT NULL,
  field_key    VARCHAR(100) NOT NULL,
  field_type   VARCHAR(30) NOT NULL,  -- text, number, date, select, multiselect, checkbox, url, email, phone
  options      JSONB,  -- for select/multiselect
  is_required  BOOLEAN DEFAULT false,
  is_active    BOOLEAN DEFAULT true,
  sort_order   INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, field_key)
);

-- ─── Leads ─────────────────────────────────────────────────────────────
CREATE TABLE leads (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id      UUID REFERENCES contacts(id),
  -- Basic Info
  name            VARCHAR(255) NOT NULL,
  email           VARCHAR(255),
  phone           VARCHAR(30),
  company         VARCHAR(255),
  job_title       VARCHAR(100),
  -- Lead Data
  status          VARCHAR(30) DEFAULT 'new',  -- new, contacted, qualified, disqualified, converted
  source          VARCHAR(50),  -- whatsapp, instagram, email, website, meta_ads, referral, manual, csv, phone
  score           INTEGER DEFAULT 0,
  temperature     VARCHAR(20) DEFAULT 'cold',  -- cold, warm, hot
  -- UTM Tracking
  utm_source      VARCHAR(100),
  utm_medium      VARCHAR(100),
  utm_campaign    VARCHAR(100),
  utm_term        VARCHAR(100),
  utm_content     VARCHAR(100),
  referrer_url    TEXT,
  landing_page_id UUID,
  -- Assignment
  owner_id        UUID REFERENCES users(id),
  team_id         UUID REFERENCES teams(id),
  -- Fields
  custom_fields   JSONB DEFAULT '{}',
  notes           TEXT,
  -- Timing
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  converted_at    TIMESTAMPTZ,
  disqualified_at TIMESTAMPTZ,
  disqualify_reason TEXT,
  -- Meta
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Lead Tags ─────────────────────────────────────────────────────────
CREATE TABLE lead_tags (
  lead_id   UUID REFERENCES leads(id) ON DELETE CASCADE,
  tag_id    UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY(lead_id, tag_id)
);

-- ─── Lead Activities ───────────────────────────────────────────────────
CREATE TABLE lead_activities (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id      UUID REFERENCES leads(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES users(id),
  type         VARCHAR(50) NOT NULL,  -- note, call, email, whatsapp, meeting, task, status_change, score_change
  title        VARCHAR(255),
  description  TEXT,
  data         JSONB DEFAULT '{}',
  duration_min INTEGER,
  outcome      VARCHAR(50),  -- answered, not_answered, no_interest, follow_up, etc.
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Lead Score History ────────────────────────────────────────────────
CREATE TABLE lead_score_history (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id      UUID REFERENCES leads(id) ON DELETE CASCADE,
  score_before INTEGER,
  score_after  INTEGER,
  reason       VARCHAR(100),
  data         JSONB,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Prospecting B2B ───────────────────────────────────────────────────
CREATE TABLE prospecting_searches (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES users(id),
  name         VARCHAR(255),
  filters      JSONB DEFAULT '{}',  -- cnae, state, city, size, etc.
  result_count INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prospecting_results (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  search_id     UUID REFERENCES prospecting_searches(id) ON DELETE CASCADE,
  tenant_id     UUID REFERENCES tenants(id) ON DELETE CASCADE,
  cnpj          VARCHAR(20) NOT NULL,
  company_name  VARCHAR(255),
  trade_name    VARCHAR(255),
  cnae          VARCHAR(10),
  cnae_desc     VARCHAR(255),
  city          VARCHAR(100),
  state         VARCHAR(2),
  phone         VARCHAR(30),
  email         VARCHAR(255),
  website       VARCHAR(255),
  size          VARCHAR(50),
  status        VARCHAR(30) DEFAULT 'found',  -- found, added_as_lead, discarded
  raw_data      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ICP (Ideal Customer Profile) ─────────────────────────────────────
CREATE TABLE icp_profiles (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id      UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name           VARCHAR(255) NOT NULL,
  description    TEXT,
  criteria       JSONB DEFAULT '{}',  -- sectors, sizes, roles, etc.
  is_active      BOOLEAN DEFAULT true,
  created_by     UUID REFERENCES users(id),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ───────────────────────────────────────────────────────────
CREATE INDEX idx_contacts_tenant ON contacts(tenant_id);
CREATE INDEX idx_contacts_cnpj ON contacts(cnpj) WHERE cnpj IS NOT NULL;
CREATE INDEX idx_contacts_email ON contacts(email) WHERE email IS NOT NULL;
CREATE INDEX idx_leads_tenant ON leads(tenant_id);
CREATE INDEX idx_leads_owner ON leads(owner_id);
CREATE INDEX idx_leads_status ON leads(tenant_id, status);
CREATE INDEX idx_leads_source ON leads(tenant_id, source);
CREATE INDEX idx_leads_score ON leads(tenant_id, score DESC);
CREATE INDEX idx_leads_last_activity ON leads(tenant_id, last_activity_at);
CREATE INDEX idx_lead_activities_lead ON lead_activities(lead_id);
CREATE INDEX idx_lead_activities_type ON lead_activities(lead_id, type);

-- Full text search on leads
CREATE INDEX idx_leads_search ON leads USING gin(
  to_tsvector('portuguese', coalesce(name,'') || ' ' || coalesce(email,'') || ' ' || coalesce(company,''))
);

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
