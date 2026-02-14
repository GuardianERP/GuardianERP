-- Guardian Desktop ERP - Marketing CRM Module Migration
-- Run this SQL in your Supabase SQL Editor

-- ============================================
-- Marketing Campaigns Table
-- ============================================
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active',
  created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON marketing_campaigns(status);

INSERT INTO marketing_campaigns (name, description, status) 
VALUES ('General Leads', 'Default campaign for all marketing leads', 'active')
ON CONFLICT DO NOTHING;

-- ============================================
-- Email Template Sets Table
-- ============================================
CREATE TABLE IF NOT EXISTS email_template_sets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active',
  is_public BOOLEAN DEFAULT false,
  created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_template_sets_status ON email_template_sets(status);
CREATE INDEX IF NOT EXISTS idx_email_template_sets_created_by ON email_template_sets(created_by);

-- ============================================
-- Email Templates Table
-- ============================================
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_set_id UUID REFERENCES email_template_sets(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL, -- First Email, 1st Follow-up, 2nd Follow-up, etc.
  type_order INTEGER DEFAULT 99,
  priority VARCHAR(20) DEFAULT 'Medium', -- High, Medium, Low
  subject VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_templates_set ON email_templates(template_set_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_type ON email_templates(type);
CREATE INDEX IF NOT EXISTS idx_email_templates_status ON email_templates(status);

-- ============================================
-- Email Template Comments (Social Layer)
-- ============================================
CREATE TABLE IF NOT EXISTS email_template_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_set_id UUID REFERENCES email_template_sets(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_template_comments_set ON email_template_comments(template_set_id);

-- ============================================
-- Marketing Leads Table (Updated)
-- ============================================
CREATE TABLE IF NOT EXISTS marketing_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
  practice_name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  phone_number VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(20),
  website VARCHAR(500),
  contact_person VARCHAR(255),
  assigned_to UUID REFERENCES employees(id) ON DELETE SET NULL,
  assigned_date DATE DEFAULT CURRENT_DATE,
  calling_date DATE,
  call_status VARCHAR(100),
  overall_status VARCHAR(50) DEFAULT 'Decision Pending',
  follow_up_required VARCHAR(10) DEFAULT 'No',
  meeting_date DATE,
  meeting_notes TEXT,
  remarks TEXT,
  supervisor_remarks TEXT,
  ceo_remarks TEXT,
  -- Email Template Integration
  email_template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  email_sent_date DATE,
  email_status VARCHAR(50) DEFAULT 'Not Sent', -- Not Sent, Sent, Opened, Replied, Interested, Bounce
  -- Referral/Transfer fields
  referred_from UUID REFERENCES employees(id) ON DELETE SET NULL,
  referred_at TIMESTAMP WITH TIME ZONE,
  referral_notes TEXT,
  created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_leads_campaign ON marketing_leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_assigned_to ON marketing_leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_status ON marketing_leads(overall_status);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_email_template ON marketing_leads(email_template_id);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_email_status ON marketing_leads(email_status);

CREATE TABLE IF NOT EXISTS marketing_lead_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES marketing_leads(id) ON DELETE CASCADE,
  from_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  to_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  transfer_reason TEXT,
  transferred_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  transferred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_lead_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_template_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_template_comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running migration)
DROP POLICY IF EXISTS marketing_campaigns_all ON marketing_campaigns;
DROP POLICY IF EXISTS marketing_leads_all ON marketing_leads;
DROP POLICY IF EXISTS marketing_lead_transfers_all ON marketing_lead_transfers;
DROP POLICY IF EXISTS email_template_sets_all ON email_template_sets;
DROP POLICY IF EXISTS email_templates_all ON email_templates;
DROP POLICY IF EXISTS email_template_comments_all ON email_template_comments;

-- Create policies with full access (USING for SELECT/UPDATE/DELETE, WITH CHECK for INSERT/UPDATE)
CREATE POLICY marketing_campaigns_all ON marketing_campaigns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY marketing_leads_all ON marketing_leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY marketing_lead_transfers_all ON marketing_lead_transfers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY email_template_sets_all ON email_template_sets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY email_templates_all ON email_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY email_template_comments_all ON email_template_comments FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- Realtime Subscriptions
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE marketing_leads;
ALTER PUBLICATION supabase_realtime ADD TABLE marketing_campaigns;
ALTER PUBLICATION supabase_realtime ADD TABLE email_template_sets;
ALTER PUBLICATION supabase_realtime ADD TABLE email_templates;
ALTER PUBLICATION supabase_realtime ADD TABLE email_template_comments;
