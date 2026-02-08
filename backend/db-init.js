/**
 * Guardian Desktop ERP - Database Initialization
 * Creates all tables and seeds initial data for sql.js
 */

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

/**
 * SQL Schema definitions for all tables
 */
const schemas = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT DEFAULT 'employee',
  avatar_url TEXT,
  last_login TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'Employee',
  department TEXT,
  salary_pkr REAL DEFAULT 0,
  joining_date TEXT,
  status TEXT DEFAULT 'active',
  user_id TEXT,
  avatar_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  employee_id TEXT,
  clock_in TEXT NOT NULL,
  clock_out TEXT,
  date TEXT NOT NULL,
  duration_minutes INTEGER,
  status TEXT DEFAULT 'present',
  notes TEXT,
  created_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to TEXT,
  created_by TEXT,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  due_date TEXT,
  completed_at TEXT,
  tags TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (assigned_to) REFERENCES employees(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- Task Comments table
CREATE TABLE IF NOT EXISTS task_comments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id);

-- Leaves table
CREATE TABLE IF NOT EXISTS leaves (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  employee_id TEXT,
  leave_type TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  days INTEGER,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  approved_by TEXT,
  approved_at TEXT,
  rejection_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (approved_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_leaves_user ON leaves(user_id);
CREATE INDEX IF NOT EXISTS idx_leaves_employee ON leaves(employee_id);
CREATE INDEX IF NOT EXISTS idx_leaves_status ON leaves(status);
CREATE INDEX IF NOT EXISTS idx_leaves_dates ON leaves(start_date, end_date);

-- Leave Balance table
CREATE TABLE IF NOT EXISTS leave_balance (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  leave_type TEXT NOT NULL,
  total INTEGER DEFAULT 0,
  used INTEGER DEFAULT 0,
  remaining INTEGER DEFAULT 0,
  year INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (employee_id) REFERENCES employees(id),
  UNIQUE(employee_id, leave_type, year)
);

CREATE INDEX IF NOT EXISTS idx_leave_balance_employee ON leave_balance(employee_id);

-- Public Holidays table
CREATE TABLE IF NOT EXISTS public_holidays (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  employee_id TEXT,
  title TEXT,
  amount REAL NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  date TEXT NOT NULL,
  receipt_url TEXT,
  status TEXT DEFAULT 'pending',
  approved_by TEXT,
  approved_at TEXT,
  rejection_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (approved_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_employee ON expenses(employee_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- Revenue table
CREATE TABLE IF NOT EXISTS revenue (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  invoice_number TEXT,
  title TEXT,
  client_name TEXT,
  client_email TEXT,
  source TEXT,
  service_type TEXT,
  service_description TEXT,
  description TEXT,
  amount REAL NOT NULL,
  status TEXT DEFAULT 'pending',
  date TEXT,
  invoice_date TEXT,
  due_date TEXT,
  payment_date TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_revenue_status ON revenue(status);
CREATE INDEX IF NOT EXISTS idx_revenue_date ON revenue(date);
CREATE INDEX IF NOT EXISTS idx_revenue_client ON revenue(client_name);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  name TEXT,
  type TEXT DEFAULT 'direct',
  participant1_id TEXT,
  participant2_id TEXT,
  last_message TEXT,
  last_message_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (participant1_id) REFERENCES users(id),
  FOREIGN KEY (participant2_id) REFERENCES users(id)
);

-- Conversation Participants table
CREATE TABLE IF NOT EXISTS conversation_participants (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  joined_at TEXT NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_conv_participants_conv ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON conversation_participants(user_id);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  attachment_url TEXT,
  is_read INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id),
  FOREIGN KEY (sender_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  link TEXT,
  read INTEGER DEFAULT 0,
  is_read INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  settings_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- User Preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  theme TEXT DEFAULT 'light',
  language TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'Asia/Karachi',
  date_format TEXT DEFAULT 'DD/MM/YYYY',
  time_format TEXT DEFAULT '12h',
  currency TEXT DEFAULT 'PKR',
  sidebar_collapsed INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Notification Settings table
CREATE TABLE IF NOT EXISTS notification_settings (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  email_notifications INTEGER DEFAULT 1,
  desktop_notifications INTEGER DEFAULT 1,
  task_notifications INTEGER DEFAULT 1,
  leave_notifications INTEGER DEFAULT 1,
  expense_notifications INTEGER DEFAULT 1,
  chat_notifications INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Files table
CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  folder TEXT DEFAULT 'root',
  size INTEGER,
  mime_type TEXT,
  uploaded_by TEXT,
  is_deleted INTEGER DEFAULT 0,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_files_folder ON files(folder);
CREATE INDEX IF NOT EXISTS idx_files_deleted ON files(is_deleted);
CREATE INDEX IF NOT EXISTS idx_files_user ON files(user_id);

-- Time Entries table
CREATE TABLE IF NOT EXISTS time_entries (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  project TEXT,
  category TEXT,
  description TEXT,
  start_time TEXT NOT NULL,
  end_time TEXT,
  duration_minutes INTEGER,
  is_billable INTEGER DEFAULT 0,
  is_running INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE INDEX IF NOT EXISTS idx_time_entries_employee ON time_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(start_time);

-- Search Presets table
CREATE TABLE IF NOT EXISTS search_presets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  filters TEXT NOT NULL,
  module TEXT NOT NULL,
  is_default INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_search_presets_user ON search_presets(user_id);

-- VOB Custom Fields table
CREATE TABLE IF NOT EXISTS vob_custom_fields (
  id TEXT PRIMARY KEY,
  section TEXT NOT NULL,
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT DEFAULT 'text',
  placeholder TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vob_custom_fields_section ON vob_custom_fields(section);
`;

/**
 * Initialize database with schema and seed data using sql.js
 * @param {Object} db - sql.js database instance
 */
async function initializeDatabase(db) {
  console.log('Initializing Guardian Desktop ERP database...');
  
  // Execute schema - sql.js can execute multiple statements with exec
  try {
    db.exec(schemas);
    console.log('Database schema created successfully');
  } catch (err) {
    console.error('Error creating schema:', err.message);
    throw err;
  }
  
  // Check if admin user exists using sql.js syntax
  const adminCheck = db.exec("SELECT id FROM users WHERE email = 'admin@guardian.com'");
  const adminExists = adminCheck.length > 0 && adminCheck[0].values.length > 0;
  
  if (!adminExists) {
    console.log('Creating seed data...');
    
    const now = new Date().toISOString();
    const adminId = uuidv4();
    const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
    
    // Create admin user
    db.run(`
      INSERT INTO users (id, email, password_hash, first_name, last_name, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [adminId, 'admin@guardian.com', adminPasswordHash, 'System', 'Administrator', 'admin', now, now]);
    
    // Create admin employee profile
    const adminEmployeeId = uuidv4();
    db.run(`
      INSERT INTO employees (id, first_name, last_name, email, phone, role, department, salary_pkr, joining_date, status, user_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [adminEmployeeId, 'System', 'Administrator', 'admin@guardian.com', '+92 300 1234567', 'CEO', 'Management', 500000, '2024-01-01', 'active', adminId, now, now]);
    
    // Create sample employees
    const employees = [
      { first: 'Ahmed', last: 'Khan', email: 'ahmed.khan@guardian.com', role: 'Senior Developer', dept: 'Engineering', salary: 250000 },
      { first: 'Fatima', last: 'Ali', email: 'fatima.ali@guardian.com', role: 'HR Manager', dept: 'Human Resources', salary: 200000 },
      { first: 'Hassan', last: 'Raza', email: 'hassan.raza@guardian.com', role: 'Designer', dept: 'Design', salary: 180000 },
      { first: 'Ayesha', last: 'Malik', email: 'ayesha.malik@guardian.com', role: 'Accountant', dept: 'Finance', salary: 150000 },
      { first: 'Bilal', last: 'Ahmed', email: 'bilal.ahmed@guardian.com', role: 'Developer', dept: 'Engineering', salary: 180000 },
    ];
    
    const employeeIds = [];
    for (const emp of employees) {
      const empId = uuidv4();
      const userId = uuidv4();
      const empPasswordHash = await bcrypt.hash('Employee@123', 10);
      
      db.run(`
        INSERT INTO users (id, email, password_hash, first_name, last_name, role, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [userId, emp.email, empPasswordHash, emp.first, emp.last, 'employee', now, now]);
      
      db.run(`
        INSERT INTO employees (id, first_name, last_name, email, phone, role, department, salary_pkr, joining_date, status, user_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [empId, emp.first, emp.last, emp.email, '+92 300 ' + Math.floor(1000000 + Math.random() * 9000000), emp.role, emp.dept, emp.salary, '2024-01-15', 'active', userId, now, now]);
      
      employeeIds.push(empId);
      
      // Create leave balance for each employee
      const currentYear = new Date().getFullYear();
      const leaveTypes = ['annual', 'sick', 'casual'];
      for (const type of leaveTypes) {
        const total = type === 'annual' ? 20 : type === 'sick' ? 10 : 7;
        db.run(`
          INSERT INTO leave_balance (id, employee_id, leave_type, total, used, remaining, year, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [uuidv4(), empId, type, total, 0, total, currentYear, now, now]);
      }
    }
    
    // Create sample tasks
    const tasks = [
      { title: 'Complete project documentation', desc: 'Write comprehensive docs for the new module', status: 'in-progress', priority: 'high' },
      { title: 'Review code changes', desc: 'Review PRs from the team', status: 'pending', priority: 'medium' },
      { title: 'Client meeting preparation', desc: 'Prepare presentation slides', status: 'completed', priority: 'high' },
      { title: 'Bug fixes for dashboard', desc: 'Fix reported UI issues', status: 'in-progress', priority: 'medium' },
      { title: 'Database optimization', desc: 'Optimize slow queries', status: 'pending', priority: 'low' },
    ];
    
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (i + 1) * 3);
      
      db.run(`
        INSERT INTO tasks (id, title, description, assigned_to, created_by, status, priority, due_date, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        uuidv4(), task.title, task.desc, 
        employeeIds[i % employeeIds.length], adminId,
        task.status, task.priority, 
        dueDate.toISOString().split('T')[0], now, now
      ]);
    }
    
    // Create sample expenses
    const expenses = [
      { amount: 5000, category: 'Transport', desc: 'Fuel expenses', title: 'Monthly Fuel' },
      { amount: 15000, category: 'Equipment', desc: 'Keyboard and mouse', title: 'Office Equipment' },
      { amount: 3500, category: 'Food', desc: 'Client lunch meeting', title: 'Client Lunch' },
      { amount: 8000, category: 'Supplies', desc: 'Office stationery', title: 'Stationery Purchase' },
    ];
    
    for (let i = 0; i < expenses.length; i++) {
      const exp = expenses[i];
      const expDate = new Date();
      expDate.setDate(expDate.getDate() - (i * 5));
      
      db.run(`
        INSERT INTO expenses (id, user_id, employee_id, title, amount, category, description, date, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        uuidv4(), adminId, employeeIds[i % employeeIds.length],
        exp.title, exp.amount, exp.category, exp.desc,
        expDate.toISOString().split('T')[0],
        i % 2 === 0 ? 'approved' : 'pending', now, now
      ]);
    }
    
    // Create sample revenue
    const revenues = [
      { client: 'Tech Solutions Ltd', service: 'Software Development', amount: 500000, source: 'Project' },
      { client: 'Global Corp', service: 'Consulting', amount: 250000, source: 'Consulting' },
      { client: 'StartUp Inc', service: 'Web Development', amount: 350000, source: 'Project' },
      { client: 'Enterprise Co', service: 'Maintenance', amount: 150000, source: 'Maintenance' },
    ];
    
    for (let i = 0; i < revenues.length; i++) {
      const rev = revenues[i];
      const invDate = new Date();
      invDate.setDate(invDate.getDate() - (i * 10));
      const dueDate = new Date(invDate);
      dueDate.setDate(dueDate.getDate() + 30);
      
      db.run(`
        INSERT INTO revenue (id, user_id, invoice_number, title, client_name, source, service_type, service_description, amount, status, date, invoice_date, due_date, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        uuidv4(), adminId, `INV-${1001 + i}`, rev.service, rev.client, rev.source,
        rev.service, `${rev.service} services`, rev.amount,
        i === 0 ? 'received' : 'pending',
        invDate.toISOString().split('T')[0],
        invDate.toISOString().split('T')[0],
        dueDate.toISOString().split('T')[0],
        now, now
      ]);
    }
    
    // Create public holidays for Pakistan
    const holidays = [
      { name: 'Kashmir Day', date: '2026-02-05' },
      { name: 'Pakistan Day', date: '2026-03-23' },
      { name: 'Labour Day', date: '2026-05-01' },
      { name: 'Independence Day', date: '2026-08-14' },
      { name: 'Iqbal Day', date: '2026-11-09' },
      { name: 'Quaid-e-Azam Day', date: '2026-12-25' },
    ];
    
    for (const holiday of holidays) {
      db.run(`
        INSERT INTO public_holidays (id, name, date, created_at)
        VALUES (?, ?, ?, ?)
      `, [uuidv4(), holiday.name, holiday.date, now]);
    }
    
    // Create admin preferences
    db.run(`
      INSERT INTO user_preferences (id, user_id, theme, language, timezone, date_format, time_format, currency, sidebar_collapsed, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [uuidv4(), adminId, 'dark', 'en', 'Asia/Karachi', 'DD/MM/YYYY', '12h', 'PKR', 0, now, now]);
    
    // Create notification settings for admin
    db.run(`
      INSERT INTO notification_settings (id, user_id, email_notifications, desktop_notifications, task_notifications, leave_notifications, expense_notifications, chat_notifications, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [uuidv4(), adminId, 1, 1, 1, 1, 1, 1, now, now]);
    
    // Create settings for admin
    db.run(`
      INSERT INTO settings (id, user_id, settings_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `, [uuidv4(), adminId, JSON.stringify({ theme: 'dark', language: 'en' }), now, now]);
    
    // Create sample notifications for admin
    const notifications = [
      { title: 'Welcome to Guardian ERP', message: 'Your account has been set up successfully.', type: 'success' },
      { title: 'New Task Assigned', message: 'You have been assigned a new task: Complete project documentation', type: 'task' },
      { title: 'Leave Request', message: 'Ahmed Khan has requested annual leave from Jan 20-25', type: 'leave' },
    ];
    
    for (const notif of notifications) {
      db.run(`
        INSERT INTO notifications (id, user_id, title, message, type, read, is_read, created_at)
        VALUES (?, ?, ?, ?, ?, 0, 0, ?)
      `, [uuidv4(), adminId, notif.title, notif.message, notif.type, now]);
    }
    
    console.log('Seed data created successfully');
    console.log('Admin credentials: admin@guardian.com / Admin@123');
  } else {
    console.log('Database already initialized, skipping seed data');
  }
  
  console.log('Database initialization complete!');
}

module.exports = { initializeDatabase, schemas };
