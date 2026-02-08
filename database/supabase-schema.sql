-- Guardian Desktop ERP - Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor (Dashboard > SQL Editor)

-- ============================================
-- ENABLE UUID EXTENSION
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- DROP EXISTING TABLES (if re-running)
-- ============================================
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_conversations CASCADE;
DROP TABLE IF EXISTS files CASCADE;
DROP TABLE IF EXISTS vob_records CASCADE;
DROP TABLE IF EXISTS vob_custom_fields CASCADE;
DROP TABLE IF EXISTS time_tracking CASCADE;
DROP TABLE IF EXISTS leaves CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS revenue CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS settings CASCADE;

-- ============================================
-- ROLES TABLE
-- ============================================
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default roles
INSERT INTO roles (name, description, permissions) VALUES
  ('super_admin', 'Super Administrator with full access', '["*"]'),
  ('admin', 'Administrator with most permissions', '["users:read", "users:write", "employees:read", "employees:write", "tasks:read", "tasks:write", "expenses:read", "expenses:write", "revenue:read", "revenue:write", "leaves:read", "leaves:write", "attendance:read", "attendance:write", "reports:read"]'),
  ('manager', 'Manager with team access', '["employees:read", "tasks:read", "tasks:write", "expenses:read", "leaves:read", "leaves:write", "attendance:read", "reports:read"]'),
  ('employee', 'Regular employee with limited access', '["tasks:read", "attendance:read", "attendance:write", "leaves:read", "leaves:write"]');

-- ============================================
-- USERS TABLE (Authentication)
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'employee',
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_user_role FOREIGN KEY (role) REFERENCES roles(name) ON UPDATE CASCADE
);

-- ============================================
-- EMPLOYEES TABLE
-- ============================================
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  employee_code VARCHAR(20) UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  department VARCHAR(100),
  designation VARCHAR(100),
  role VARCHAR(50) NOT NULL DEFAULT 'employee',
  salary_pkr DECIMAL(15, 2) DEFAULT 0,
  joining_date DATE,
  date_of_birth DATE,
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Pakistan',
  emergency_contact VARCHAR(20),
  blood_group VARCHAR(10),
  status VARCHAR(20) DEFAULT 'active',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ATTENDANCE TABLE
-- ============================================
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  clock_in TIMESTAMP WITH TIME ZONE,
  clock_out TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'present',
  work_hours DECIMAL(5, 2),
  overtime_hours DECIMAL(5, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id, date)
);

-- ============================================
-- TASKS TABLE
-- ============================================
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES employees(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'pending',
  priority VARCHAR(20) DEFAULT 'medium',
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  tags JSONB DEFAULT '[]',
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- EXPENSES TABLE
-- ============================================
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  amount DECIMAL(15, 2) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  receipt_url TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  approved_by UUID REFERENCES employees(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- REVENUE TABLE
-- ============================================
CREATE TABLE revenue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  amount DECIMAL(15, 2) NOT NULL,
  source VARCHAR(100) NOT NULL,
  category VARCHAR(100),
  description TEXT,
  date DATE NOT NULL,
  client_name VARCHAR(255),
  invoice_number VARCHAR(100),
  payment_method VARCHAR(50),
  status VARCHAR(20) DEFAULT 'received',
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- LEAVES TABLE
-- ============================================
CREATE TABLE leaves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days INTEGER NOT NULL,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  approved_by UUID REFERENCES employees(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TIME TRACKING TABLE
-- ============================================
CREATE TABLE time_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  hours DECIMAL(5, 2) NOT NULL,
  description TEXT,
  billable BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- VOB CUSTOM FIELDS TABLE
-- ============================================
CREATE TABLE vob_custom_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  field_name VARCHAR(100) NOT NULL,
  field_label VARCHAR(255) NOT NULL,
  field_type VARCHAR(50) NOT NULL DEFAULT 'text',
  section VARCHAR(100) NOT NULL,
  options JSONB,
  required BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- VOB RECORDS TABLE
-- ============================================
CREATE TABLE vob_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_name VARCHAR(255) NOT NULL,
  insurance_company VARCHAR(255),
  policy_number VARCHAR(100),
  group_number VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending',
  custom_fields JSONB DEFAULT '{}',
  notes TEXT,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- FILES TABLE
-- ============================================
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  path TEXT NOT NULL,
  size BIGINT,
  mime_type VARCHAR(100),
  folder VARCHAR(100),
  uploaded_by UUID REFERENCES employees(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CHAT CONVERSATIONS TABLE
-- ============================================
CREATE TABLE chat_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255),
  type VARCHAR(20) DEFAULT 'direct',
  participants JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CHAT MESSAGES TABLE
-- ============================================
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text',
  attachments JSONB DEFAULT '[]',
  read_by JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  read BOOLEAN DEFAULT FALSE,
  link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SETTINGS TABLE
-- ============================================
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  theme VARCHAR(20) DEFAULT 'system',
  notifications_enabled BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  language VARCHAR(10) DEFAULT 'en',
  timezone VARCHAR(50) DEFAULT 'Asia/Karachi',
  settings_json JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_employees_user_id ON employees(user_id);
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_department ON employees(department);
CREATE INDEX idx_employees_status ON employees(status);

CREATE INDEX idx_attendance_employee_id ON attendance(employee_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_employee_date ON attendance(employee_id, date);

CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);

CREATE INDEX idx_expenses_employee_id ON expenses(employee_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_status ON expenses(status);

CREATE INDEX idx_revenue_date ON revenue(date);
CREATE INDEX idx_revenue_category ON revenue(category);

CREATE INDEX idx_leaves_employee_id ON leaves(employee_id);
CREATE INDEX idx_leaves_status ON leaves(status);
CREATE INDEX idx_leaves_dates ON leaves(start_date, end_date);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);

CREATE INDEX idx_chat_messages_conversation ON chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_sender ON chat_messages(sender_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

-- Policy: Admins can read all users
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin', 'super_admin')
    )
  );

-- Policy: Employees can view their own records
CREATE POLICY "Employees view own attendance" ON attendance
  FOR SELECT USING (
    employee_id IN (SELECT id FROM employees WHERE user_id::text = auth.uid()::text)
  );

-- Policy: Admins/Managers can view all attendance
CREATE POLICY "Admins view all attendance" ON attendance
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin', 'super_admin', 'manager')
    )
  );

-- Policy: Employees can view/update their own tasks
CREATE POLICY "Employees view own tasks" ON tasks
  FOR SELECT USING (
    assigned_to IN (SELECT id FROM employees WHERE user_id::text = auth.uid()::text)
  );

-- Policy: Admins/Managers can manage all tasks
CREATE POLICY "Admins manage all tasks" ON tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin', 'super_admin', 'manager')
    )
  );

-- Policy: Only admins can view expenses and revenue
CREATE POLICY "Admins view expenses" ON expenses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins view revenue" ON revenue
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin', 'super_admin')
    )
  );

-- Policy: Employees can view their own leaves
CREATE POLICY "Employees view own leaves" ON leaves
  FOR SELECT USING (
    employee_id IN (SELECT id FROM employees WHERE user_id::text = auth.uid()::text)
  );

-- Policy: Admins/Managers can manage all leaves
CREATE POLICY "Admins manage all leaves" ON leaves
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin', 'super_admin', 'manager')
    )
  );

-- Policy: Users can view their own notifications
CREATE POLICY "Users view own notifications" ON notifications
  FOR ALL USING (user_id::text = auth.uid()::text);

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at column
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_revenue_updated_at BEFORE UPDATE ON revenue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leaves_updated_at BEFORE UPDATE ON leaves
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- GRANT PERMISSIONS (for anon/authenticated users)
-- ============================================
-- Note: In Supabase, you may need to adjust these based on your RLS policies

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
SELECT 'Guardian Desktop ERP database schema created successfully!' AS message;
