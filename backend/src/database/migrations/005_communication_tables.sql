-- ══════════════════════════════════════════════════════════════════════
-- Migration 005: Communication (Channels, Chat, Campaigns, Landing Pages)
-- ══════════════════════════════════════════════════════════════════════

-- ─── Channels (WhatsApp, Instagram, Email) ────────────────────────────
CREATE TABLE channels (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id      UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name           VARCHAR(255) NOT NULL,
  type           VARCHAR(30) NOT NULL,  -- whatsapp, instagram, email, website
  status         VARCHAR(20) DEFAULT 'disconnected',  -- connected, disconnected, connecting
  config         JSONB DEFAULT '{}',  -- credentials, identifiers, etc.
  is_active      BOOLEAN DEFAULT true,
  last_seen_at   TIMESTAMPTZ,
  created_by     UUID REFERENCES users(id),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Quick Replies (Templates) ─────────────────────────────────────────
CREATE TABLE quick_replies (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID REFERENCES tenants(id) ON DELETE CASCADE,
  title        VARCHAR(255) NOT NULL,
  content      TEXT NOT NULL,
  shortcut     VARCHAR(50),
  category     VARCHAR(50),
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Conversations ─────────────────────────────────────────────────────
CREATE TABLE conversations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  channel_id      UUID REFERENCES channels(id),
  lead_id         UUID REFERENCES leads(id),
  contact_id      UUID REFERENCES contacts(id),
  -- External IDs
  external_id     VARCHAR(255),  -- WhatsApp chat ID, email thread, etc.
  -- Status
  status          VARCHAR(30) DEFAULT 'open',  -- open, resolved, pending, bot
  -- Assignment
  assigned_to     UUID REFERENCES users(id),
  assigned_team   UUID REFERENCES teams(id),
  -- SLA
  sla_first_response INTERVAL DEFAULT '4 hours',
  sla_resolution     INTERVAL DEFAULT '24 hours',
  first_response_at  TIMESTAMPTZ,
  sla_breached       BOOLEAN DEFAULT false,
  -- Metadata
  subject         VARCHAR(255),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  unread_count    INTEGER DEFAULT 0,
  tags            UUID[] DEFAULT '{}',
  notes           TEXT,
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Messages ──────────────────────────────────────────────────────────
CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  -- Direction: inbound (from customer), outbound (from agent)
  direction       VARCHAR(10) NOT NULL,  -- inbound, outbound
  -- Content
  type            VARCHAR(20) DEFAULT 'text',  -- text, image, audio, video, document, location, sticker, template
  content         TEXT,
  media_url       TEXT,
  media_type      VARCHAR(100),
  media_name      VARCHAR(255),
  media_size      INTEGER,
  -- Status (for outbound)
  status          VARCHAR(20) DEFAULT 'sent',  -- sent, delivered, read, failed
  -- References
  external_id     VARCHAR(255),  -- message ID from channel
  quoted_message_id UUID REFERENCES messages(id),
  -- AI
  sentiment       VARCHAR(20),  -- positive, neutral, negative
  ai_summary      TEXT,
  -- Sender
  sender_user_id  UUID REFERENCES users(id),
  sender_name     VARCHAR(255),
  sent_at         TIMESTAMPTZ DEFAULT NOW(),
  delivered_at    TIMESTAMPTZ,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Internal Chat ─────────────────────────────────────────────────────
CREATE TABLE internal_chats (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID REFERENCES tenants(id) ON DELETE CASCADE,
  type         VARCHAR(20) DEFAULT 'direct',  -- direct, group
  name         VARCHAR(255),
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE internal_chat_members (
  chat_id    UUID REFERENCES internal_chats(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY(chat_id, user_id)
);

CREATE TABLE internal_messages (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id      UUID REFERENCES internal_chats(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES users(id),
  type         VARCHAR(20) DEFAULT 'text',
  content      TEXT,
  media_url    TEXT,
  is_edited    BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Schedules / Agendamentos ──────────────────────────────────────────
CREATE TABLE schedules (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  type            VARCHAR(30) DEFAULT 'meeting',  -- meeting, call, task, follow_up, reminder
  -- Related
  lead_id         UUID REFERENCES leads(id),
  opportunity_id  UUID REFERENCES opportunities(id),
  contact_id      UUID REFERENCES contacts(id),
  -- Timing
  start_at        TIMESTAMPTZ NOT NULL,
  end_at          TIMESTAMPTZ,
  all_day         BOOLEAN DEFAULT false,
  -- Status
  status          VARCHAR(20) DEFAULT 'scheduled',  -- scheduled, completed, cancelled, no_show
  outcome         TEXT,
  -- Assignment
  owner_id        UUID REFERENCES users(id),
  -- Notifications
  remind_before   INTEGER DEFAULT 30,  -- minutes
  reminded_at     TIMESTAMPTZ,
  -- Location
  location        VARCHAR(255),
  meet_url        TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE schedule_attendees (
  schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  status      VARCHAR(20) DEFAULT 'pending',  -- pending, accepted, declined
  PRIMARY KEY(schedule_id, user_id)
);

-- ─── Campaigns ─────────────────────────────────────────────────────────
CREATE TABLE campaigns (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  type            VARCHAR(30) NOT NULL,  -- email, whatsapp
  status          VARCHAR(30) DEFAULT 'draft',  -- draft, scheduled, sending, sent, paused, cancelled
  channel_id      UUID REFERENCES channels(id),
  -- Content
  subject         VARCHAR(255),
  content         TEXT NOT NULL,
  content_html    TEXT,
  -- A/B Testing
  is_ab_test      BOOLEAN DEFAULT false,
  variant_b_content TEXT,
  variant_b_subject VARCHAR(255),
  ab_winner       VARCHAR(1),  -- A or B
  -- Segmentation
  segment_filters  JSONB DEFAULT '{}',
  recipient_count  INTEGER DEFAULT 0,
  -- Scheduling
  scheduled_at     TIMESTAMPTZ,
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  -- Metrics
  sent_count       INTEGER DEFAULT 0,
  delivered_count  INTEGER DEFAULT 0,
  opened_count     INTEGER DEFAULT 0,
  clicked_count    INTEGER DEFAULT 0,
  replied_count    INTEGER DEFAULT 0,
  bounced_count    INTEGER DEFAULT 0,
  unsubscribed_count INTEGER DEFAULT 0,
  conversion_count    INTEGER DEFAULT 0,
  revenue_generated   NUMERIC(15,2) DEFAULT 0,
  created_by       UUID REFERENCES users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE campaign_recipients (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id  UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id      UUID REFERENCES leads(id),
  contact_id   UUID REFERENCES contacts(id),
  email        VARCHAR(255),
  phone        VARCHAR(30),
  variant      VARCHAR(1) DEFAULT 'A',
  status       VARCHAR(20) DEFAULT 'pending',  -- pending, sent, delivered, opened, clicked, bounced, unsubscribed
  sent_at      TIMESTAMPTZ,
  opened_at    TIMESTAMPTZ,
  clicked_at   TIMESTAMPTZ,
  replied_at   TIMESTAMPTZ,
  open_count   INTEGER DEFAULT 0,
  click_count  INTEGER DEFAULT 0
);

-- ─── Landing Pages ─────────────────────────────────────────────────────
CREATE TABLE landing_pages (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID REFERENCES tenants(id) ON DELETE CASCADE,
  title        VARCHAR(255) NOT NULL,
  slug         VARCHAR(255) NOT NULL,
  content      JSONB NOT NULL DEFAULT '{}',  -- page builder blocks
  seo_title    VARCHAR(255),
  seo_description TEXT,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  custom_domain VARCHAR(255),
  favicon_url  TEXT,
  og_image_url TEXT,
  -- Analytics
  view_count   INTEGER DEFAULT 0,
  submit_count INTEGER DEFAULT 0,
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, slug)
);

CREATE TABLE landing_page_forms (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  landing_page_id UUID REFERENCES landing_pages(id) ON DELETE CASCADE,
  fields          JSONB NOT NULL DEFAULT '[]',  -- form field definitions
  redirect_url    TEXT,
  success_message TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE landing_page_submissions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  landing_page_id UUID REFERENCES landing_pages(id) ON DELETE CASCADE,
  form_id         UUID REFERENCES landing_page_forms(id),
  lead_id         UUID REFERENCES leads(id),
  data            JSONB NOT NULL DEFAULT '{}',
  utm_source      VARCHAR(100),
  utm_medium      VARCHAR(100),
  utm_campaign    VARCHAR(100),
  utm_term        VARCHAR(100),
  utm_content     VARCHAR(100),
  referrer        TEXT,
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Customer Success ──────────────────────────────────────────────────
CREATE TABLE cs_accounts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id      UUID REFERENCES contacts(id),
  contract_id     UUID REFERENCES contracts(id),
  owner_id        UUID REFERENCES users(id),
  health_score    INTEGER DEFAULT 100,  -- 0-100
  status          VARCHAR(30) DEFAULT 'onboarding',  -- onboarding, active, at_risk, churned
  onboarded_at    TIMESTAMPTZ,
  renewal_date    DATE,
  mrr             NUMERIC(15,2) DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE nps_surveys (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  question        TEXT NOT NULL DEFAULT 'Em uma escala de 0 a 10, qual a probabilidade de você recomendar nossa empresa?',
  trigger         VARCHAR(30) DEFAULT 'manual',  -- manual, post_sale, periodic
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE nps_responses (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID REFERENCES tenants(id) ON DELETE CASCADE,
  survey_id    UUID REFERENCES nps_surveys(id),
  contact_id   UUID REFERENCES contacts(id),
  score        INTEGER NOT NULL CHECK (score >= 0 AND score <= 10),
  category     VARCHAR(20),  -- promoter (9-10), passive (7-8), detractor (0-6)
  comment      TEXT,
  responded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ───────────────────────────────────────────────────────────
CREATE INDEX idx_conversations_tenant ON conversations(tenant_id);
CREATE INDEX idx_conversations_status ON conversations(tenant_id, status);
CREATE INDEX idx_conversations_assigned ON conversations(assigned_to, status);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(conversation_id, created_at);
CREATE INDEX idx_campaigns_tenant ON campaigns(tenant_id, status);
CREATE INDEX idx_landing_pages_slug ON landing_pages(tenant_id, slug);
CREATE INDEX idx_schedules_owner ON schedules(owner_id, start_at);
CREATE INDEX idx_schedules_tenant ON schedules(tenant_id, start_at);

CREATE TRIGGER update_channels_updated_at BEFORE UPDATE ON channels FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_landing_pages_updated_at BEFORE UPDATE ON landing_pages FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_cs_accounts_updated_at BEFORE UPDATE ON cs_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
