-- Migration: Employee Agreements Table & RLS Policies
-- Run this in your Supabase SQL Editor
-- Guardian ERP uses its own auth system, so policies allow public access

-- 1. Create the employee_agreements table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS employee_agreements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  agreement_type VARCHAR(50) NOT NULL,        -- 'employee' or 'guarantor'
  agreement_date DATE,
  reference_no VARCHAR(100),
  file_url TEXT,
  file_path TEXT,
  form_data JSONB,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE employee_agreements ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if any (safe re-run)
DROP POLICY IF EXISTS "Allow all select on employee_agreements" ON employee_agreements;
DROP POLICY IF EXISTS "Allow all insert on employee_agreements" ON employee_agreements;
DROP POLICY IF EXISTS "Allow all update on employee_agreements" ON employee_agreements;
DROP POLICY IF EXISTS "Allow all delete on employee_agreements" ON employee_agreements;

-- 4. Create permissive policies (using TO public since Guardian ERP has its own auth)
CREATE POLICY "Allow all select on employee_agreements"
  ON employee_agreements FOR SELECT TO public
  USING (true);

CREATE POLICY "Allow all insert on employee_agreements"
  ON employee_agreements FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Allow all update on employee_agreements"
  ON employee_agreements FOR UPDATE TO public
  USING (true);

CREATE POLICY "Allow all delete on employee_agreements"
  ON employee_agreements FOR DELETE TO public
  USING (true);
