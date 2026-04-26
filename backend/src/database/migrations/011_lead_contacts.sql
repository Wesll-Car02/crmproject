CREATE TABLE IF NOT EXISTS lead_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(255),
  notes TEXT,
  email VARCHAR(255),
  phone VARCHAR(50),
  birth_date DATE,
  is_favorite BOOLEAN DEFAULT false,
  is_decision_maker BOOLEAN DEFAULT false,
  source VARCHAR(50) DEFAULT 'manual', -- 'manual' | 'quadro_societario'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index para buscas mais rápidas e relacionamento
CREATE INDEX IF NOT EXISTS idx_lead_contacts_lead_id ON lead_contacts(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_contacts_tenant_id ON lead_contacts(tenant_id);

-- Restrição de unicidade por lead e nome, dependendo da necessidade
-- Mas como o usuário quer evitar duplicidade pelo código, faremos no backend
