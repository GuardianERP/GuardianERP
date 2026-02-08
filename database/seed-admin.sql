-- Guardian Desktop ERP - Admin Seed Data
-- Run this SQL AFTER running supabase-schema.sql
-- This creates the default admin user: admin@guardian.com / Admin@123

-- ============================================
-- INSERT DEFAULT ADMIN USER
-- ============================================
-- Password: Admin@123 (hashed with bcrypt, 10 rounds)
-- Hash generated with bcryptjs: $2a$10$fYXDUd.5hclRDwgsvh91S.CWZ1MAP/V89rAxe6y7diDThS7eTmrAq

INSERT INTO users (email, password_hash, role, is_active) VALUES
  ('admin@guardian.com', '$2a$10$fYXDUd.5hclRDwgsvh91S.CWZ1MAP/V89rAxe6y7diDThS7eTmrAq', 'super_admin', TRUE)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;

-- Get the admin user ID
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  SELECT id INTO admin_user_id FROM users WHERE email = 'admin@guardian.com';
  
  -- Insert corresponding employee record for admin
  INSERT INTO employees (
    user_id,
    employee_code,
    first_name,
    last_name,
    email,
    department,
    designation,
    role,
    status,
    joining_date
  ) VALUES (
    admin_user_id,
    'EMP001',
    'System',
    'Administrator',
    'admin@guardian.com',
    'Administration',
    'System Administrator',
    'super_admin',
    'active',
    CURRENT_DATE
  )
  ON CONFLICT (email) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    role = EXCLUDED.role;
END $$;

-- ============================================
-- INSERT SAMPLE DATA (Optional)
-- ============================================

-- Sample employees
INSERT INTO employees (employee_code, first_name, last_name, email, department, designation, role, salary_pkr, status, joining_date) VALUES
  ('EMP002', 'John', 'Doe', 'john.doe@guardian.com', 'Engineering', 'Software Engineer', 'employee', 150000, 'active', '2024-01-15'),
  ('EMP003', 'Jane', 'Smith', 'jane.smith@guardian.com', 'HR', 'HR Manager', 'manager', 200000, 'active', '2023-06-01'),
  ('EMP004', 'Ahmed', 'Khan', 'ahmed.khan@guardian.com', 'Finance', 'Accountant', 'employee', 120000, 'active', '2024-03-01')
ON CONFLICT (email) DO NOTHING;

-- Sample tasks
INSERT INTO tasks (title, description, status, priority, due_date) VALUES
  ('Complete project documentation', 'Write comprehensive documentation for the ERP system', 'in_progress', 'high', CURRENT_DATE + INTERVAL '7 days'),
  ('Review employee performance', 'Conduct quarterly performance reviews', 'pending', 'medium', CURRENT_DATE + INTERVAL '14 days'),
  ('Update security policies', 'Review and update company security policies', 'pending', 'high', CURRENT_DATE + INTERVAL '5 days')
ON CONFLICT DO NOTHING;

-- Sample expense categories (as expenses)
INSERT INTO expenses (amount, category, description, date, status) VALUES
  (5000, 'Office Supplies', 'Monthly stationery purchase', CURRENT_DATE - INTERVAL '5 days', 'approved'),
  (25000, 'Equipment', 'New laptop for engineering team', CURRENT_DATE - INTERVAL '10 days', 'approved'),
  (3500, 'Travel', 'Client meeting transportation', CURRENT_DATE - INTERVAL '2 days', 'pending')
ON CONFLICT DO NOTHING;

-- Sample revenue entries
INSERT INTO revenue (amount, source, category, description, date, client_name, status) VALUES
  (500000, 'Project', 'Software Development', 'ERP implementation for Client A', CURRENT_DATE - INTERVAL '15 days', 'ABC Corporation', 'received'),
  (150000, 'Consulting', 'IT Consulting', 'System audit services', CURRENT_DATE - INTERVAL '7 days', 'XYZ Industries', 'received'),
  (250000, 'Maintenance', 'Support Contract', 'Annual maintenance contract', CURRENT_DATE - INTERVAL '3 days', 'Tech Solutions', 'pending')
ON CONFLICT DO NOTHING;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
SELECT 'Admin user and sample data seeded successfully!' AS message;
SELECT 'Login credentials: admin@guardian.com / Admin@123' AS credentials;
