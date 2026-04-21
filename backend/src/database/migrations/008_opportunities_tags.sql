-- Migration 008: Tags system
-- Note: opportunities already has tags UUID[] column from migration 003

CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(20) DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tags_tenant_id ON tags(tenant_id);

-- Normalized many-to-many for leads
CREATE TABLE IF NOT EXISTS lead_tag_links (
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (lead_id, tag_id)
);

-- Normalized many-to-many for opportunities
CREATE TABLE IF NOT EXISTS opportunity_tag_links (
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (opportunity_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_lead_tag_links_lead ON lead_tag_links(lead_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_tag_links_opp ON opportunity_tag_links(opportunity_id);
