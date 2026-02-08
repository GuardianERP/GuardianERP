-- Migration: Add field_label column to vob_custom_fields table
-- Run this SQL in your Supabase SQL Editor if you already have the table

-- Add field_label column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vob_custom_fields' AND column_name = 'field_label'
    ) THEN
        ALTER TABLE vob_custom_fields ADD COLUMN field_label VARCHAR(255) DEFAULT '';
    END IF;
END $$;

-- Update field_type default
ALTER TABLE vob_custom_fields ALTER COLUMN field_type SET DEFAULT 'text';

-- ============================================
-- Also ensure roles exist for user creation
-- ============================================
INSERT INTO roles (name, description, permissions)
SELECT 'super_admin', 'Super Administrator with full access', '["*"]'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'super_admin');

INSERT INTO roles (name, description, permissions)
SELECT 'admin', 'Administrator with most permissions', '["users:read", "users:write", "employees:read", "employees:write", "tasks:read", "tasks:write", "expenses:read", "expenses:write", "revenue:read", "revenue:write", "leaves:read", "leaves:write", "attendance:read", "attendance:write", "reports:read"]'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'admin');

INSERT INTO roles (name, description, permissions)
SELECT 'manager', 'Manager with team access', '["employees:read", "tasks:read", "tasks:write", "expenses:read", "leaves:read", "leaves:write", "attendance:read", "reports:read"]'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'manager');

INSERT INTO roles (name, description, permissions)
SELECT 'employee', 'Regular employee with limited access', '["tasks:read", "attendance:read", "attendance:write", "leaves:read", "leaves:write"]'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'employee');

-- Verify
SELECT 'Roles exist:' as status, name FROM roles;
SELECT 'vob_custom_fields columns:' as status, column_name FROM information_schema.columns WHERE table_name = 'vob_custom_fields';
