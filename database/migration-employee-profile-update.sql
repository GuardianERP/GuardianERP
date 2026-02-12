-- Guardian Desktop ERP - Employee Profile Enhancement Migration
-- Run this SQL in your Supabase SQL Editor to add personal email and emergency name fields

-- ============================================
-- ADD PERSONAL EMAIL COLUMN
-- ============================================
ALTER TABLE employees ADD COLUMN IF NOT EXISTS personal_email VARCHAR(255);

-- ============================================
-- ADD EMERGENCY CONTACT NAME COLUMN
-- ============================================
ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(100);

-- ============================================
-- ADD NATIONALITY COLUMN
-- ============================================
ALTER TABLE employees ADD COLUMN IF NOT EXISTS nationality VARCHAR(100);

-- ============================================
-- ADD GENDER COLUMN
-- ============================================
ALTER TABLE employees ADD COLUMN IF NOT EXISTS gender VARCHAR(20);

-- ============================================
-- ADD MARITAL STATUS COLUMN
-- ============================================
ALTER TABLE employees ADD COLUMN IF NOT EXISTS marital_status VARCHAR(20);

-- ============================================
-- ENSURE ROLE COLUMN HAS DEFAULT
-- The 'role' column is used for system access role (super_admin, admin, manager, employee)
-- ============================================
ALTER TABLE employees ALTER COLUMN role SET DEFAULT 'employee';

-- ============================================
-- CREATE INDEX FOR FASTER QUERIES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON COLUMN employees.email IS 'Company/Work email address';
COMMENT ON COLUMN employees.personal_email IS 'Personal email address';
COMMENT ON COLUMN employees.designation IS 'Job position/title';
COMMENT ON COLUMN employees.role IS 'System access role (super_admin, admin, manager, employee)';
