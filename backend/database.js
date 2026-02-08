/**
 * Guardian Desktop ERP - Database Operations
 * SQLite database functions using sql.js (pure JS implementation)
 */

const { v4: uuidv4 } = require('uuid');

// Database wrapper to handle sql.js syntax
class DatabaseWrapper {
  constructor(db) {
    this.db = db;
  }

  run(sql, params = []) {
    return this.db.run(sql, params);
  }

  get(sql, params = []) {
    const stmt = this.db.prepare(sql);
    if (params.length > 0) {
      stmt.bind(params);
    }
    if (stmt.step()) {
      const result = stmt.getAsObject();
      stmt.free();
      return result;
    }
    stmt.free();
    return null;
  }

  all(sql, params = []) {
    const results = [];
    const stmt = this.db.prepare(sql);
    if (params.length > 0) {
      stmt.bind(params);
    }
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  }
}

// ============================================
// USER OPERATIONS
// ============================================

function getUserByEmail(db, email) {
  return db.get('SELECT * FROM users WHERE email = ?', [email]);
}

function getUserById(db, id) {
  return db.get('SELECT * FROM users WHERE id = ?', [id]);
}

function createUser(db, userData) {
  const id = uuidv4();
  const now = new Date().toISOString();
  
  db.run(`
    INSERT INTO users (id, email, password_hash, first_name, last_name, role, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, userData.email, userData.password_hash, userData.first_name, userData.last_name, userData.role, now, now]);
  
  return id;
}

function updateLastLogin(db, userId) {
  db.run('UPDATE users SET last_login = ? WHERE id = ?', [new Date().toISOString(), userId]);
}

function updatePassword(db, userId, passwordHash) {
  db.run('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?',
    [passwordHash, new Date().toISOString(), userId]);
}

// ============================================
// EMPLOYEE OPERATIONS
// ============================================

function getAllEmployees(db, filters = {}) {
  let query = 'SELECT * FROM employees WHERE 1=1';
  const params = [];
  
  if (filters.status && filters.status !== 'all') {
    query += ' AND status = ?';
    params.push(filters.status);
  }
  
  if (filters.search) {
    query += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)';
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }
  
  if (filters.department) {
    query += ' AND department = ?';
    params.push(filters.department);
  }
  
  query += ' ORDER BY created_at DESC';
  
  if (filters.limit) {
    query += ' LIMIT ?';
    params.push(filters.limit);
  }
  
  if (filters.offset) {
    query += ' OFFSET ?';
    params.push(filters.offset);
  }
  
  return db.all(query, params);
}

function getEmployeeById(db, id) {
  return db.get('SELECT * FROM employees WHERE id = ?', [id]);
}

function getEmployeeByUserId(db, userId) {
  return db.get('SELECT * FROM employees WHERE user_id = ?', [userId]);
}

function createEmployee(db, data) {
  const id = uuidv4();
  const now = new Date().toISOString();
  
  db.run(`
    INSERT INTO employees (
      id, first_name, last_name, email, phone, role, department, 
      salary_pkr, joining_date, status, user_id, avatar_url, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, data.first_name, data.last_name, data.email, data.phone || null,
    data.role || 'Employee', data.department || null, data.salary_pkr || 0,
    data.joining_date || now.split('T')[0], data.status || 'active',
    data.user_id || null, data.avatar_url || null, now, now
  ]);
  
  return id;
}

function updateEmployee(db, id, data) {
  const now = new Date().toISOString();
  const fields = [];
  const values = [];
  
  const allowedFields = ['first_name', 'last_name', 'email', 'phone', 'role', 'department', 
                         'salary_pkr', 'joining_date', 'status', 'avatar_url'];
  
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(data[field]);
    }
  }
  
  if (fields.length === 0) return false;
  
  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);
  
  db.run(`UPDATE employees SET ${fields.join(', ')} WHERE id = ?`, values);
  return true;
}

function deleteEmployee(db, id) {
  db.run('DELETE FROM employees WHERE id = ?', [id]);
  return true;
}

// ============================================
// ATTENDANCE OPERATIONS
// ============================================

function getAttendanceRecords(db, userId, startDate = null, endDate = null) {
  let query = 'SELECT * FROM attendance WHERE user_id = ?';
  const params = [userId];
  
  if (startDate) {
    query += ' AND date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    query += ' AND date <= ?';
    params.push(endDate);
  }
  
  query += ' ORDER BY date DESC';
  return db.all(query, params);
}

function getTodayAttendance(db, userId) {
  const today = new Date().toISOString().split('T')[0];
  return db.get('SELECT * FROM attendance WHERE user_id = ? AND date = ?', [userId, today]);
}

function clockIn(db, userId) {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();
  
  const existing = getTodayAttendance(db, userId);
  if (existing) {
    throw new Error('Already clocked in today');
  }
  
  const id = uuidv4();
  db.run(`
    INSERT INTO attendance (id, user_id, date, clock_in, status, created_at)
    VALUES (?, ?, ?, ?, 'present', ?)
  `, [id, userId, today, now, now]);
  
  return { id, clock_in: now };
}

function clockOut(db, userId) {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();
  
  const record = getTodayAttendance(db, userId);
  if (!record) {
    throw new Error('No clock-in record found for today');
  }
  if (record.clock_out) {
    throw new Error('Already clocked out today');
  }
  
  const clockInTime = new Date(record.clock_in);
  const clockOutTime = new Date(now);
  const durationMinutes = Math.round((clockOutTime - clockInTime) / 60000);
  
  db.run(`
    UPDATE attendance 
    SET clock_out = ?, duration_minutes = ?, updated_at = ?
    WHERE id = ?
  `, [now, durationMinutes, now, record.id]);
  
  return { clock_out: now, duration_minutes: durationMinutes };
}

function getAttendanceStats(db, userId, period = 'month') {
  const now = new Date();
  let startDate;
  
  if (period === 'week') {
    startDate = new Date(now.setDate(now.getDate() - 7));
  } else if (period === 'month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    startDate = new Date(now.getFullYear(), 0, 1);
  }
  
  const records = db.all(`
    SELECT * FROM attendance 
    WHERE user_id = ? AND date >= ?
  `, [userId, startDate.toISOString().split('T')[0]]);
  
  const totalMinutes = records.reduce((sum, r) => sum + (r.duration_minutes || 0), 0);
  const totalHours = Math.round(totalMinutes / 60);
  const daysPresent = records.filter(r => r.status === 'present').length;
  const avgHoursPerDay = daysPresent > 0 ? Math.round(totalHours / daysPresent) : 0;
  
  return { totalHours, daysPresent, avgHoursPerDay };
}

// ============================================
// TASK OPERATIONS
// ============================================

function getAllTasks(db, filters = {}) {
  let query = 'SELECT * FROM tasks WHERE 1=1';
  const params = [];
  
  if (filters.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters.priority) {
    query += ' AND priority = ?';
    params.push(filters.priority);
  }
  if (filters.assigned_to) {
    query += ' AND assigned_to = ?';
    params.push(filters.assigned_to);
  }
  
  query += ' ORDER BY created_at DESC';
  return db.all(query, params);
}

function getTaskById(db, id) {
  return db.get('SELECT * FROM tasks WHERE id = ?', [id]);
}

function createTask(db, data) {
  const id = uuidv4();
  const now = new Date().toISOString();
  
  db.run(`
    INSERT INTO tasks (id, title, description, assigned_to, due_date, priority, status, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, data.title, data.description || null, data.assigned_to || null,
     data.due_date || null, data.priority || 'medium', data.status || 'pending',
     data.created_by, now, now]);
  
  return id;
}

function updateTask(db, id, data) {
  const now = new Date().toISOString();
  const fields = [];
  const values = [];
  
  const allowedFields = ['title', 'description', 'assigned_to', 'due_date', 'priority', 'status'];
  
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(data[field]);
    }
  }
  
  if (fields.length === 0) return false;
  
  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);
  
  db.run(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, values);
  return true;
}

function deleteTask(db, id) {
  db.run('DELETE FROM tasks WHERE id = ?', [id]);
  return true;
}

// ============================================
// LEAVE OPERATIONS
// ============================================

function getAllLeaves(db, filters = {}) {
  let query = 'SELECT * FROM leaves WHERE 1=1';
  const params = [];
  
  if (filters.user_id) {
    query += ' AND user_id = ?';
    params.push(filters.user_id);
  }
  if (filters.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }
  
  query += ' ORDER BY created_at DESC';
  return db.all(query, params);
}

function getLeaveById(db, id) {
  return db.get('SELECT * FROM leaves WHERE id = ?', [id]);
}

function createLeave(db, data) {
  const id = uuidv4();
  const now = new Date().toISOString();
  
  db.run(`
    INSERT INTO leaves (id, user_id, leave_type, start_date, end_date, reason, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
  `, [id, data.user_id, data.leave_type, data.start_date, data.end_date, data.reason || null, now, now]);
  
  return id;
}

function updateLeaveStatus(db, id, status, approvedBy = null) {
  const now = new Date().toISOString();
  db.run(`
    UPDATE leaves 
    SET status = ?, approved_by = ?, approved_at = ?, updated_at = ?
    WHERE id = ?
  `, [status, approvedBy, status !== 'pending' ? now : null, now, id]);
}

// ============================================
// EXPENSE OPERATIONS
// ============================================

function getAllExpenses(db, filters = {}) {
  let query = 'SELECT * FROM expenses WHERE 1=1';
  const params = [];
  
  if (filters.user_id) {
    query += ' AND user_id = ?';
    params.push(filters.user_id);
  }
  if (filters.category) {
    query += ' AND category = ?';
    params.push(filters.category);
  }
  if (filters.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }
  
  query += ' ORDER BY date DESC';
  return db.all(query, params);
}

function getExpenseById(db, id) {
  return db.get('SELECT * FROM expenses WHERE id = ?', [id]);
}

function createExpense(db, data) {
  const id = uuidv4();
  const now = new Date().toISOString();
  
  db.run(`
    INSERT INTO expenses (id, user_id, title, amount, category, date, description, receipt_url, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, data.user_id, data.title, data.amount, data.category, 
     data.date || now.split('T')[0], data.description || null,
     data.receipt_url || null, data.status || 'pending', now, now]);
  
  return id;
}

function updateExpense(db, id, data) {
  const now = new Date().toISOString();
  const fields = [];
  const values = [];
  
  const allowedFields = ['title', 'amount', 'category', 'date', 'description', 'receipt_url', 'status'];
  
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(data[field]);
    }
  }
  
  if (fields.length === 0) return false;
  
  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);
  
  db.run(`UPDATE expenses SET ${fields.join(', ')} WHERE id = ?`, values);
  return true;
}

function deleteExpense(db, id) {
  db.run('DELETE FROM expenses WHERE id = ?', [id]);
  return true;
}

// ============================================
// REVENUE OPERATIONS
// ============================================

function getAllRevenue(db, filters = {}) {
  let query = 'SELECT * FROM revenue WHERE 1=1';
  const params = [];
  
  if (filters.source) {
    query += ' AND source = ?';
    params.push(filters.source);
  }
  if (filters.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }
  
  query += ' ORDER BY date DESC';
  return db.all(query, params);
}

function getRevenueById(db, id) {
  return db.get('SELECT * FROM revenue WHERE id = ?', [id]);
}

function createRevenue(db, data) {
  const id = uuidv4();
  const now = new Date().toISOString();
  
  db.run(`
    INSERT INTO revenue (id, user_id, title, amount, source, date, client_name, description, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, data.user_id, data.title, data.amount, data.source,
     data.date || now.split('T')[0], data.client_name || null,
     data.description || null, data.status || 'pending', now, now]);
  
  return id;
}

function updateRevenue(db, id, data) {
  const now = new Date().toISOString();
  const fields = [];
  const values = [];
  
  const allowedFields = ['title', 'amount', 'source', 'date', 'client_name', 'description', 'status'];
  
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(data[field]);
    }
  }
  
  if (fields.length === 0) return false;
  
  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);
  
  db.run(`UPDATE revenue SET ${fields.join(', ')} WHERE id = ?`, values);
  return true;
}

function deleteRevenue(db, id) {
  db.run('DELETE FROM revenue WHERE id = ?', [id]);
  return true;
}

// ============================================
// CHAT OPERATIONS
// ============================================

function getConversations(db, userId) {
  return db.all(`
    SELECT c.*, 
           u.first_name || ' ' || u.last_name as other_user_name
    FROM conversations c
    LEFT JOIN users u ON (
      CASE 
        WHEN c.participant1_id = ? THEN c.participant2_id 
        ELSE c.participant1_id 
      END = u.id
    )
    WHERE c.participant1_id = ? OR c.participant2_id = ?
    ORDER BY c.last_message_at DESC
  `, [userId, userId, userId]);
}

function getOrCreateConversation(db, userId1, userId2) {
  let conv = db.get(`
    SELECT * FROM conversations 
    WHERE (participant1_id = ? AND participant2_id = ?)
       OR (participant1_id = ? AND participant2_id = ?)
  `, [userId1, userId2, userId2, userId1]);
  
  if (!conv) {
    const id = uuidv4();
    const now = new Date().toISOString();
    db.run(`
      INSERT INTO conversations (id, participant1_id, participant2_id, created_at)
      VALUES (?, ?, ?, ?)
    `, [id, userId1, userId2, now]);
    conv = { id, participant1_id: userId1, participant2_id: userId2 };
  }
  
  return conv;
}

function getMessages(db, conversationId, limit = 50) {
  return db.all(`
    SELECT m.*, u.first_name || ' ' || u.last_name as sender_name
    FROM messages m
    LEFT JOIN users u ON m.sender_id = u.id
    WHERE m.conversation_id = ?
    ORDER BY m.created_at ASC
    LIMIT ?
  `, [conversationId, limit]);
}

function sendMessage(db, conversationId, senderId, content) {
  const id = uuidv4();
  const now = new Date().toISOString();
  
  db.run(`
    INSERT INTO messages (id, conversation_id, sender_id, content, created_at)
    VALUES (?, ?, ?, ?, ?)
  `, [id, conversationId, senderId, content, now]);
  
  db.run(`
    UPDATE conversations 
    SET last_message = ?, last_message_at = ?
    WHERE id = ?
  `, [content.substring(0, 100), now, conversationId]);
  
  return { id, content, created_at: now };
}

// ============================================
// NOTIFICATION OPERATIONS
// ============================================

function getNotifications(db, userId, unreadOnly = false) {
  let query = 'SELECT * FROM notifications WHERE user_id = ?';
  if (unreadOnly) {
    query += ' AND read = 0';
  }
  query += ' ORDER BY created_at DESC';
  return db.all(query, [userId]);
}

function createNotification(db, data) {
  const id = uuidv4();
  const now = new Date().toISOString();
  
  db.run(`
    INSERT INTO notifications (id, user_id, type, title, message, read, created_at)
    VALUES (?, ?, ?, ?, ?, 0, ?)
  `, [id, data.user_id, data.type || 'info', data.title, data.message, now]);
  
  return id;
}

function markNotificationAsRead(db, id) {
  db.run('UPDATE notifications SET read = 1 WHERE id = ?', [id]);
}

function markAllNotificationsAsRead(db, userId) {
  db.run('UPDATE notifications SET read = 1 WHERE user_id = ?', [userId]);
}

function deleteNotification(db, id) {
  db.run('DELETE FROM notifications WHERE id = ?', [id]);
}

// ============================================
// SETTINGS OPERATIONS
// ============================================

function getSettings(db, userId) {
  const row = db.get('SELECT * FROM settings WHERE user_id = ?', [userId]);
  if (row && row.settings_json) {
    try {
      return JSON.parse(row.settings_json);
    } catch (e) {
      return {};
    }
  }
  return {};
}

function updateSettings(db, userId, settings) {
  const now = new Date().toISOString();
  const existing = db.get('SELECT * FROM settings WHERE user_id = ?', [userId]);
  
  if (existing) {
    const merged = { ...JSON.parse(existing.settings_json || '{}'), ...settings };
    db.run(`
      UPDATE settings SET settings_json = ?, updated_at = ? WHERE user_id = ?
    `, [JSON.stringify(merged), now, userId]);
  } else {
    const id = uuidv4();
    db.run(`
      INSERT INTO settings (id, user_id, settings_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `, [id, userId, JSON.stringify(settings), now, now]);
  }
}

// ============================================
// FILE OPERATIONS
// ============================================

function getFiles(db, userId) {
  return db.all('SELECT * FROM files WHERE user_id = ? ORDER BY created_at DESC', [userId]);
}

function createFile(db, data) {
  const id = uuidv4();
  const now = new Date().toISOString();
  
  db.run(`
    INSERT INTO files (id, user_id, name, path, size, mime_type, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [id, data.user_id, data.name, data.path, data.size, data.mime_type, now]);
  
  return id;
}

function deleteFile(db, id) {
  db.run('DELETE FROM files WHERE id = ?', [id]);
}

// Export all functions
module.exports = {
  DatabaseWrapper,
  // Users
  getUserByEmail,
  getUserById,
  createUser,
  updateLastLogin,
  updatePassword,
  // Employees
  getAllEmployees,
  getEmployeeById,
  getEmployeeByUserId,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  // Attendance
  getAttendanceRecords,
  getTodayAttendance,
  clockIn,
  clockOut,
  getAttendanceStats,
  // Tasks
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  // Leaves
  getAllLeaves,
  getLeaveById,
  createLeave,
  updateLeaveStatus,
  // Expenses
  getAllExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  // Revenue
  getAllRevenue,
  getRevenueById,
  createRevenue,
  updateRevenue,
  deleteRevenue,
  // Chat
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  // Notifications
  getNotifications,
  createNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  // Settings
  getSettings,
  updateSettings,
  // Files
  getFiles,
  createFile,
  deleteFile
};
