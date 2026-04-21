-- ══════════════════════════════════════════════════════════════════════
-- Migration 006: Automations & Analytics
-- ══════════════════════════════════════════════════════════════════════

-- ─── Automations (Workflow Engine) ─────────────────────────────────────
CREATE TABLE automations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name         VARCHAR(255) NOT NULL,
  description  TEXT,
  is_active    BOOLEAN DEFAULT false,
  trigger_type VARCHAR(50) NOT NULL,
  -- Stored Flow
  nodes        JSONB NOT NULL DEFAULT '[]',
  edges        JSONB NOT NULL DEFAULT '[]',
  -- Stats
  run_count    INTEGER DEFAULT 0,
  last_run_at  TIMESTAMPTZ,
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE automation_executions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id      UUID REFERENCES tenants(id) ON DELETE CASCADE,
  automation_id  UUID REFERENCES automations(id) ON DELETE CASCADE,
  trigger_data   JSONB DEFAULT '{}',
  status         VARCHAR(20) DEFAULT 'running',  -- running, completed, failed
  started_at     TIMESTAMPTZ DEFAULT NOW(),
  completed_at   TIMESTAMPTZ,
  error_message  TEXT,
  steps_completed INTEGER DEFAULT 0
);

CREATE TABLE automation_execution_logs (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_id   UUID REFERENCES automation_executions(id) ON DELETE CASCADE,
  node_id        VARCHAR(100),
  node_type      VARCHAR(50),
  status         VARCHAR(20),  -- success, failed, skipped
  input          JSONB,
  output         JSONB,
  error          TEXT,
  duration_ms    INTEGER,
  executed_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Analytics / Reports ───────────────────────────────────────────────
CREATE TABLE report_snapshots (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID REFERENCES tenants(id) ON DELETE CASCADE,
  period       VARCHAR(10) NOT NULL,  -- YYYY-MM
  type         VARCHAR(50) NOT NULL,
  data         JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE forecast_periods (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  period          VARCHAR(10) NOT NULL,  -- YYYY-MM
  pipeline_id     UUID REFERENCES pipelines(id),
  user_id         UUID REFERENCES users(id),
  committed_value NUMERIC(15,2) DEFAULT 0,
  best_case_value NUMERIC(15,2) DEFAULT 0,
  pipeline_value  NUMERIC(15,2) DEFAULT 0,
  closed_value    NUMERIC(15,2) DEFAULT 0,
  ai_prediction   NUMERIC(15,2),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, period, pipeline_id, user_id)
);

-- ─── Integration Config ────────────────────────────────────────────────
CREATE TABLE integration_configs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID REFERENCES tenants(id) ON DELETE CASCADE,
  type         VARCHAR(50) NOT NULL,  -- meta_ads, bradesco, openai, etc.
  config       JSONB NOT NULL DEFAULT '{}',
  is_active    BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, type)
);

-- ─── Webhook Events ────────────────────────────────────────────────────
CREATE TABLE webhook_events (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID REFERENCES tenants(id) ON DELETE CASCADE,
  source       VARCHAR(50) NOT NULL,  -- whatsapp, instagram, meta_ads, bradesco, website
  event_type   VARCHAR(100),
  payload      JSONB NOT NULL DEFAULT '{}',
  processed    BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  error        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Chatbot Flows ─────────────────────────────────────────────────────
CREATE TABLE chatbot_flows (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID REFERENCES tenants(id) ON DELETE CASCADE,
  channel_id   UUID REFERENCES channels(id),
  name         VARCHAR(255) NOT NULL,
  nodes        JSONB NOT NULL DEFAULT '[]',
  edges        JSONB NOT NULL DEFAULT '[]',
  is_active    BOOLEAN DEFAULT false,
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── AI Usage Log ──────────────────────────────────────────────────────
CREATE TABLE ai_usage_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES users(id),
  feature      VARCHAR(50) NOT NULL,  -- lead_score, chat_suggest, summary, assistant, content_gen
  model        VARCHAR(50),
  tokens_in    INTEGER DEFAULT 0,
  tokens_out   INTEGER DEFAULT 0,
  cost_usd     NUMERIC(10,6) DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ───────────────────────────────────────────────────────────
CREATE INDEX idx_automations_tenant ON automations(tenant_id, is_active);
CREATE INDEX idx_automation_executions_automation ON automation_executions(automation_id);
CREATE INDEX idx_webhook_events_tenant ON webhook_events(tenant_id, processed);
CREATE INDEX idx_forecast_period ON forecast_periods(tenant_id, period);

CREATE TRIGGER update_automations_updated_at BEFORE UPDATE ON automations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_integration_configs_updated_at BEFORE UPDATE ON integration_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
