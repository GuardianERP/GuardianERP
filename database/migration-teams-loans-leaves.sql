-- ============================================
-- Guardian ERP - Migration: Teams, Loans, Leave Approval Workflow
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. TEAMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  department TEXT,
  team_lead_id UUID REFERENCES employees(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team Members junction table
CREATE TABLE IF NOT EXISTS team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- 'lead', 'member'
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, employee_id)
);

-- RLS for teams
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "teams_select" ON teams;
CREATE POLICY "teams_select" ON teams FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "teams_insert" ON teams;
CREATE POLICY "teams_insert" ON teams FOR INSERT TO public WITH CHECK (true);
DROP POLICY IF EXISTS "teams_update" ON teams;
CREATE POLICY "teams_update" ON teams FOR UPDATE TO public USING (true);
DROP POLICY IF EXISTS "teams_delete" ON teams;
CREATE POLICY "teams_delete" ON teams FOR DELETE TO public USING (true);

-- RLS for team_members
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "team_members_select" ON team_members;
CREATE POLICY "team_members_select" ON team_members FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "team_members_insert" ON team_members;
CREATE POLICY "team_members_insert" ON team_members FOR INSERT TO public WITH CHECK (true);
DROP POLICY IF EXISTS "team_members_update" ON team_members;
CREATE POLICY "team_members_update" ON team_members FOR UPDATE TO public USING (true);
DROP POLICY IF EXISTS "team_members_delete" ON team_members;
CREATE POLICY "team_members_delete" ON team_members FOR DELETE TO public USING (true);

-- ============================================
-- 2. LOANS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS loans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  reason TEXT,
  loan_type TEXT DEFAULT 'personal', -- 'personal', 'advance', 'emergency'
  status TEXT DEFAULT 'pending', -- 'pending', 'recommended', 'approved', 'rejected', 'disbursed', 'repaying', 'completed'
  repayment_plan TEXT, -- e.g., 'monthly', 'bi-weekly'
  installment_amount DECIMAL(10,2),
  total_installments INTEGER,
  paid_installments INTEGER DEFAULT 0,
  requested_date TIMESTAMPTZ DEFAULT NOW(),
  recommended_by UUID REFERENCES employees(id),
  recommended_at TIMESTAMPTZ,
  approved_by UUID REFERENCES employees(id),
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES employees(id),
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for loans
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "loans_select" ON loans;
CREATE POLICY "loans_select" ON loans FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "loans_insert" ON loans;
CREATE POLICY "loans_insert" ON loans FOR INSERT TO public WITH CHECK (true);
DROP POLICY IF EXISTS "loans_update" ON loans;
CREATE POLICY "loans_update" ON loans FOR UPDATE TO public USING (true);
DROP POLICY IF EXISTS "loans_delete" ON loans;
CREATE POLICY "loans_delete" ON loans FOR DELETE TO public USING (true);

-- ============================================
-- 3. LEAVE APPROVAL WORKFLOW - Add columns to leaves table
-- ============================================

-- Add team_lead approval columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leaves' AND column_name = 'team_lead_id') THEN
    ALTER TABLE leaves ADD COLUMN team_lead_id UUID REFERENCES employees(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leaves' AND column_name = 'team_lead_status') THEN
    ALTER TABLE leaves ADD COLUMN team_lead_status TEXT DEFAULT NULL; -- 'recommended', 'rejected'
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leaves' AND column_name = 'team_lead_comment') THEN
    ALTER TABLE leaves ADD COLUMN team_lead_comment TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leaves' AND column_name = 'team_lead_action_at') THEN
    ALTER TABLE leaves ADD COLUMN team_lead_action_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leaves' AND column_name = 'approval_chain') THEN
    ALTER TABLE leaves ADD COLUMN approval_chain TEXT DEFAULT 'direct'; -- 'direct' (to CEO), 'team_lead' (via team lead)
  END IF;
END $$;

-- ============================================
-- 4. PROFILE PICTURES STORAGE BUCKET
-- ============================================

-- Create profile-pictures bucket (if not exists)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('profile-pictures', 'profile-pictures', true) 
ON CONFLICT (id) DO NOTHING;

-- Storage policies for profile-pictures bucket
DO $$
BEGIN
  -- Drop existing policies if any
  DROP POLICY IF EXISTS "profile_pictures_select" ON storage.objects;
  DROP POLICY IF EXISTS "profile_pictures_insert" ON storage.objects;
  DROP POLICY IF EXISTS "profile_pictures_update" ON storage.objects;
  DROP POLICY IF EXISTS "profile_pictures_delete" ON storage.objects;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "profile_pictures_select" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'profile-pictures');

CREATE POLICY "profile_pictures_insert" ON storage.objects
  FOR INSERT TO public WITH CHECK (bucket_id = 'profile-pictures');

CREATE POLICY "profile_pictures_update" ON storage.objects
  FOR UPDATE TO public USING (bucket_id = 'profile-pictures');

CREATE POLICY "profile_pictures_delete" ON storage.objects
  FOR DELETE TO public USING (bucket_id = 'profile-pictures');

-- Also ensure the 'files' bucket exists for general file storage
INSERT INTO storage.buckets (id, name, public) 
VALUES ('files', 'files', true) 
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 5. INDEXES for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_teams_department ON teams(department);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_employee ON team_members(employee_id);
CREATE INDEX IF NOT EXISTS idx_loans_employee ON loans(employee_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_leaves_team_lead ON leaves(team_lead_id);
CREATE INDEX IF NOT EXISTS idx_leaves_approval_chain ON leaves(approval_chain);
