/**
 * Guardian Desktop ERP - API Service (Supabase Cloud)
 * All database operations now use Supabase instead of local SQLite
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import bcrypt from 'bcryptjs';
import notificationService from './notificationService';

// ============================================
// Helper Functions
// ============================================

// Check if Supabase is properly configured
const checkSupabase = () => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Please check your .env file.');
  }
};

// Handle Supabase errors
const handleError = (error, operation) => {
  console.error(`Error in ${operation}:`, error);
  throw new Error(error.message || `Failed to ${operation}`);
};

// Get current user from localStorage
const getCurrentUser = () => {
  try {
    const userStr = localStorage.getItem('guardian_user');
    if (!userStr) {
      console.warn('No user found in localStorage');
      return null;
    }
    const user = JSON.parse(userStr);
    // Debug log removed to reduce noise, uncomment if needed
    // console.log('Current user:', user?.email, 'Role:', user?.role);
    return user;
  } catch (e) {
    console.error('Error parsing user from localStorage:', e);
    return null;
  }
};

// Check if current user is admin or manager
const isAdminOrManager = () => {
  const user = getCurrentUser();
  if (!user) {
    console.warn('isAdminOrManager: No user logged in');
    return false;
  }
  const validRoles = ['admin', 'super_admin', 'manager', 'Admin', 'Super_Admin', 'Manager'];
  const hasAccess = validRoles.some(role => 
    user.role?.toLowerCase() === role.toLowerCase()
  );
  if (!hasAccess) {
    console.warn('Access check failed. User:', user?.email, 'Role:', user?.role);
  }
  return hasAccess;
};

// Get current employee ID from user
const getCurrentEmployeeId = async () => {
  const user = getCurrentUser();
  if (!user) return null;
  
  const { data, error } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', user.id)
    .single();
  
  return data?.id || null;
};

// ============================================
// Authentication API
// ============================================

export const authAPI = {
  login: async (email, password) => {
    checkSupabase();
    
    try {
      console.log('Login attempt for:', email.toLowerCase());
      
      // Get user from database
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('is_active', true)
        .single();
      
      console.log('Supabase query result:', { user: user?.email, error: error?.message });
      
      if (error || !user) {
        console.log('User not found or error:', error?.message);
        return { success: false, error: 'Invalid email or password' };
      }
      
      console.log('User found:', user.email, 'Hash:', user.password_hash?.substring(0, 20) + '...');
      
      // Verify password
      const isValid = await bcrypt.compare(password, user.password_hash);
      console.log('Password valid:', isValid);
      
      if (!isValid) {
        return { success: false, error: 'Invalid email or password' };
      }
      
      // Update last login
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id);
      
      // Get employee data if exists
      const { data: employee } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email, department, designation, role, status, avatar_url')
        .eq('user_id', user.id)
        .single();

      if (!employee) {
        console.warn('No employee record found for user:', user.email);
      }

      // Create a simple JWT-like token (for client-side use)
      const payload = {
        id: user.id,
        email: user.email,
        role: user.role,
        employeeId: employee?.id,
        firstName: employee?.first_name,
        lastName: employee?.last_name,
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
      };
      const token = btoa(JSON.stringify(payload));

      return {
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            employeeId: employee?.id,
            firstName: employee?.first_name || 'User',
            lastName: employee?.last_name || '',
            fullName: (employee?.first_name || 'User') + ' ' + (employee?.last_name || ''),
            department: employee?.department,
            designation: employee?.designation,
            avatar_url: employee?.avatar_url,
            employee: employee || null,
          },
        },
      };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  },
  
  register: async (userData) => {
    checkSupabase();
    
    try {
      // Hash password
      const passwordHash = await bcrypt.hash(userData.password, 10);
      
      // Create user
      const { data: user, error } = await supabase
        .from('users')
        .insert({
          email: userData.email.toLowerCase(),
          password_hash: passwordHash,
          role: userData.role || 'employee',
        })
        .select()
        .single();
      
      if (error) {
        if (error.code === '23505') {
          return { success: false, error: 'Email already exists' };
        }
        throw error;
      }
      
      return { success: true, data: { id: user.id, email: user.email } };
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, error: error.message };
    }
  },
  
  verify: async (token) => {
    try {
      const payload = JSON.parse(atob(token));
      const now = Math.floor(Date.now() / 1000);
      
      if (payload.exp < now) {
        return { success: false, error: 'Token expired' };
      }
      
      // Verify user still exists and is active
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, role, is_active')
        .eq('id', payload.id)
        .eq('is_active', true)
        .single();
      
      if (error || !user) {
        return { success: false, error: 'User not found or inactive' };
      }

      // Fetch employee data to return full user object (consistent with login)
      const { data: employee } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email, department, designation, role, status, avatar_url')
        .eq('user_id', user.id)
        .single();

      const fullUser = {
        id: user.id,
        email: user.email,
        role: user.role,
        employeeId: employee?.id,
        firstName: employee?.first_name || payload.firstName || 'User',
        lastName: employee?.last_name || payload.lastName || '',
        fullName: (employee?.first_name || payload.firstName || 'User') + ' ' + (employee?.last_name || payload.lastName || ''),
        department: employee?.department,
        designation: employee?.designation,
        avatar_url: employee?.avatar_url,
        employee: employee || null,
      };
      
      return { success: true, data: { user: fullUser } };
    } catch (error) {
      return { success: false, error: 'Invalid token' };
    }
  },
};

// ============================================
// Users API (Admin only)
// ============================================

export const usersAPI = {
  getAll: async () => {
    checkSupabase();
    
    if (!isAdminOrManager()) {
      throw new Error('Access denied. Admin privileges required.');
    }
    
    const { data, error } = await supabase
      .from('users')
      .select(`
        id, email, role, is_active, last_login, created_at,
        employees (id, first_name, last_name, department, designation)
      `)
      .order('created_at', { ascending: false });
    
    if (error) handleError(error, 'fetch users');
    return data;
  },
  
  getById: async (id) => {
    checkSupabase();
    
    const { data, error } = await supabase
      .from('users')
      .select(`
        id, email, role, is_active, last_login, created_at,
        employees (*)
      `)
      .eq('id', id)
      .single();
    
    if (error) handleError(error, 'fetch user');
    return data;
  },
  
  create: async (userData) => {
    checkSupabase();
    
    if (!isAdminOrManager()) {
      throw new Error('Access denied. Admin privileges required.');
    }
    
    const passwordHash = await bcrypt.hash(userData.password, 10);
    
    const { data, error } = await supabase
      .from('users')
      .insert({
        email: userData.email.toLowerCase(),
        password_hash: passwordHash,
        role: userData.role || 'employee',
      })
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') {
        throw new Error('Email already exists');
      }
      handleError(error, 'create user');
    }
    
    return data;
  },
  
  update: async (id, userData) => {
    checkSupabase();
    
    const updateData = {
      role: userData.role,
      is_active: userData.is_active,
      updated_at: new Date().toISOString(),
    };
    
    if (userData.password) {
      updateData.password_hash = await bcrypt.hash(userData.password, 10);
    }
    
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) handleError(error, 'update user');
    return data;
  },
  
  delete: async (id) => {
    checkSupabase();
    
    if (!isAdminOrManager()) {
      throw new Error('Access denied. Admin privileges required.');
    }
    
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
    
    if (error) handleError(error, 'delete user');
    return { success: true };
  },
  
  resetPassword: async (id, newPassword) => {
    checkSupabase();
    
    if (!isAdminOrManager()) {
      throw new Error('Access denied. Admin privileges required.');
    }
    
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    const { error } = await supabase
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('id', id);
    
    if (error) handleError(error, 'reset password');
    return { success: true };
  },
};

// ============================================
// Employees API
// ============================================

export const employeesAPI = {
  getAll: async (filters = {}) => {
    checkSupabase();
    
    let query = supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Apply filters
    if (filters.department) {
      query = query.eq('department', filters.department);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.search) {
      query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }
    
    // RBAC: Non-admins can only see limited data
    if (!isAdminOrManager()) {
      // Employees can only see basic info of colleagues (including user_id for notifications)
      query = query.select('id, user_id, first_name, last_name, email, department, designation, avatar_url');
    }
    
    const { data, error } = await query;
    if (error) handleError(error, 'fetch employees');
    return data;
  },
  
  getById: async (id) => {
    checkSupabase();
    
    const user = getCurrentUser();
    let selectFields = '*';
    
    // RBAC: Non-admins can't see salary info unless it's their own record
    if (!isAdminOrManager()) {
      const { data: empCheck } = await supabase
        .from('employees')
        .select('user_id')
        .eq('id', id)
        .single();
      
      if (empCheck?.user_id !== user?.id) {
        selectFields = 'id, first_name, last_name, email, department, designation, avatar_url, status';
      }
    }
    
    const { data, error } = await supabase
      .from('employees')
      .select(selectFields)
      .eq('id', id)
      .single();
    
    if (error) handleError(error, 'fetch employee');
    return data;
  },
  
  create: async (data) => {
    checkSupabase();
    
    if (!isAdminOrManager()) {
      throw new Error('Access denied. Admin privileges required.');
    }
    
    // Generate employee code
    const { data: lastEmp } = await supabase
      .from('employees')
      .select('employee_code')
      .order('employee_code', { ascending: false })
      .limit(1)
      .single();
    
    const lastCode = lastEmp?.employee_code || 'EMP000';
    const newNum = parseInt(lastCode.replace('EMP', '')) + 1;
    const employeeCode = `EMP${String(newNum).padStart(3, '0')}`;
    
    // Clean data - handle empty numeric fields
    const cleanData = {
      ...data,
      employee_code: employeeCode,
      salary_pkr: data.salary_pkr ? parseFloat(data.salary_pkr) : 0,
    };
    
    const { data: employee, error } = await supabase
      .from('employees')
      .insert(cleanData)
      .select()
      .single();
    
    if (error) handleError(error, 'create employee');

    // Send welcome notification to all team members
    if (employee) {
      notificationService.sendWelcomeNotification(employee).catch(err => {
        console.error('Welcome notification failed:', err);
      });
    }

    return employee;
  },
  
  update: async (id, data) => {
    checkSupabase();
    
    const user = getCurrentUser();
    
    // RBAC: Employees can only update their own profile (limited fields)
    if (!isAdminOrManager()) {
      const { data: empCheck } = await supabase
        .from('employees')
        .select('user_id')
        .eq('id', id)
        .single();
      
      if (empCheck?.user_id !== user?.id) {
        throw new Error('Access denied. You can only update your own profile.');
      }
      
      // Limit what employees can update
      const allowedFields = ['first_name', 'last_name', 'phone', 'personal_email', 'address', 'city', 'country', 'nationality', 'emergency_contact', 'emergency_contact_name', 'blood_group', 'marital_status', 'gender', 'date_of_birth', 'avatar_url'];
      const filteredData = {};
      allowedFields.forEach(field => {
        if (data[field] !== undefined) {
          filteredData[field] = data[field];
        }
      });
      data = filteredData;
    }
    
    const { data: employee, error } = await supabase
      .from('employees')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) handleError(error, 'update employee');
    return employee;
  },
  
  delete: async (id) => {
    checkSupabase();
    
    if (!isAdminOrManager()) {
      throw new Error('Access denied. Admin privileges required.');
    }
    
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);
    
    if (error) handleError(error, 'delete employee');
    return { success: true };
  },
  
  getStats: async () => {
    checkSupabase();
    
    if (!isAdminOrManager()) {
      throw new Error('Access denied. Admin privileges required.');
    }
    
    const { data: employees, error } = await supabase
      .from('employees')
      .select('status, department');
    
    if (error) handleError(error, 'fetch employee stats');
    
    const stats = {
      total: employees.length,
      active: employees.filter(e => e.status === 'active').length,
      inactive: employees.filter(e => e.status !== 'active').length,
      byDepartment: {},
    };
    
    employees.forEach(emp => {
      const dept = emp.department || 'Unassigned';
      stats.byDepartment[dept] = (stats.byDepartment[dept] || 0) + 1;
    });
    
    return stats;
  },
  
  // Create login account for an employee
  createUserAccount: async (employeeId, password) => {
    checkSupabase();
    
    if (!isAdminOrManager()) {
      throw new Error('Access denied. Admin privileges required.');
    }
    
    // Get employee details
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .single();
    
    if (empError || !employee) {
      throw new Error('Employee not found');
    }
    
    if (employee.user_id) {
      throw new Error('Employee already has a user account');
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Validate role exists in roles table - use 'employee' as safe default
    const validRole = ['super_admin', 'admin', 'manager', 'employee'].includes(employee.role) 
      ? employee.role 
      : 'employee';
    
    // Create user account
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        email: employee.email,
        password_hash: passwordHash,
        role: validRole,
        is_active: true,
      })
      .select()
      .single();
    
    if (userError) {
      if (userError.code === '23505') {
        throw new Error('A user with this email already exists');
      }
      handleError(userError, 'create user account');
    }
    
    // Link employee to user
    const { error: updateError } = await supabase
      .from('employees')
      .update({ user_id: user.id })
      .eq('id', employeeId);
    
    if (updateError) handleError(updateError, 'link employee to user');
    
    return { success: true, userId: user.id, email: employee.email };
  },
  
  // Reset employee password
  resetPassword: async (employeeId, newPassword) => {
    checkSupabase();
    
    if (!isAdminOrManager()) {
      throw new Error('Access denied. Admin privileges required.');
    }
    
    // Get employee with user_id
    const { data: employee } = await supabase
      .from('employees')
      .select('user_id, email')
      .eq('id', employeeId)
      .single();
    
    if (!employee?.user_id) {
      throw new Error('Employee does not have a user account. Create one first.');
    }
    
    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    // Update user password
    const { error } = await supabase
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('id', employee.user_id);
    
    if (error) handleError(error, 'reset password');
    
    return { success: true, email: employee.email };
  },

  // Upload employee profile photo
  uploadPhoto: async (file, employeeId) => {
    checkSupabase();
    
    const user = getCurrentUser();
    
    // RBAC: Check if user can upload photo
    // Admins/managers can upload for anyone, employees can only upload their own
    if (!isAdminOrManager()) {
      const { data: empCheck } = await supabase
        .from('employees')
        .select('user_id')
        .eq('id', employeeId)
        .single();
      
      if (empCheck?.user_id !== user?.id) {
        throw new Error('Access denied. You can only update your own photo.');
      }
    }
    
    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `employee-photos/${employeeId || 'temp'}-${Date.now()}.${fileExt}`;
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('files')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      });
    
    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error('Failed to upload photo. Please try again.');
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('files')
      .getPublicUrl(fileName);
    
    const photoUrl = urlData?.publicUrl;
    
    // If employeeId provided, update the employee record
    if (employeeId) {
      const { error: updateError } = await supabase
        .from('employees')
        .update({ avatar_url: photoUrl, updated_at: new Date().toISOString() })
        .eq('id', employeeId);
      
      if (updateError) {
        console.error('Update error:', updateError);
        // Don't throw, photo was uploaded successfully
      }
    }
    
    return photoUrl;
  },
};

// ============================================
// Attendance API
// ============================================

export const attendanceAPI = {
  clockIn: async (employeeId) => {
    checkSupabase();
    
    // If no employeeId provided, get current user's employee ID
    if (!employeeId) {
      employeeId = await getCurrentEmployeeId();
    }
    
    if (!employeeId) {
      throw new Error('Employee record not found. Please contact admin.');
    }
    
    // Verify employee exists
    const { data: employee } = await supabase
      .from('employees')
      .select('id')
      .eq('id', employeeId)
      .single();
    
    if (!employee) {
      throw new Error('Invalid employee ID. Please contact admin.');
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    // Check if already clocked in today
    const { data: existing } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('date', today)
      .single();
    
    if (existing?.clock_in && !existing?.clock_out) {
      throw new Error('Already clocked in. Please clock out first.');
    }
    
    if (existing?.clock_out) {
      throw new Error('Already completed attendance for today.');
    }
    
    const { data, error } = await supabase
      .from('attendance')
      .insert({
        employee_id: employeeId,
        date: today,
        clock_in: new Date().toISOString(),
        status: 'present',
      })
      .select()
      .single();
    
    if (error) handleError(error, 'clock in');
    return data;
  },
  
  clockOut: async (employeeId) => {
    checkSupabase();
    
    const today = new Date().toISOString().split('T')[0];
    
    const { data: existing } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('date', today)
      .single();
    
    if (!existing) {
      throw new Error('No clock-in record found for today.');
    }
    
    if (existing.clock_out) {
      throw new Error('Already clocked out for today.');
    }
    
    const clockOut = new Date();
    const clockIn = new Date(existing.clock_in);
    const workHours = (clockOut - clockIn) / (1000 * 60 * 60);
    const overtimeHours = Math.max(0, workHours - 8);
    
    const { data, error } = await supabase
      .from('attendance')
      .update({
        clock_out: clockOut.toISOString(),
        work_hours: workHours.toFixed(2),
        overtime_hours: overtimeHours.toFixed(2),
      })
      .eq('id', existing.id)
      .select()
      .single();
    
    if (error) handleError(error, 'clock out');
    return data;
  },
  
  getStatus: async (employeeId) => {
    checkSupabase();
    
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('date', today)
      .single();
    
    return {
      isClockedIn: data?.clock_in && !data?.clock_out,
      clockInTime: data?.clock_in,
      clockOutTime: data?.clock_out,
      todayRecord: data,
    };
  },
  
  getRecords: async (employeeId, startDate, endDate) => {
    checkSupabase();
    
    const user = getCurrentUser();
    
    // RBAC: Employees can only see their own attendance
    if (!isAdminOrManager()) {
      const currentEmpId = await getCurrentEmployeeId();
      if (employeeId && employeeId !== currentEmpId) {
        throw new Error('Access denied. You can only view your own attendance.');
      }
      employeeId = currentEmpId;
    }
    
    let query = supabase
      .from('attendance')
      .select(`*, employees (first_name, last_name)`)
      .order('date', { ascending: false });
    
    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }
    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }
    
    const { data, error } = await query;
    if (error) handleError(error, 'fetch attendance records');
    return data;
  },
  
  getStats: async (employeeId, period = 'month') => {
    checkSupabase();
    
    const user = getCurrentUser();
    
    // RBAC
    if (!isAdminOrManager()) {
      const currentEmpId = await getCurrentEmployeeId();
      if (employeeId && employeeId !== currentEmpId) {
        throw new Error('Access denied.');
      }
      employeeId = currentEmpId;
    }
    
    const now = new Date();
    let startDate;
    
    if (period === 'week') {
      startDate = new Date(now.setDate(now.getDate() - 7));
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      startDate = new Date(now.getFullYear(), 0, 1);
    }
    
    let query = supabase
      .from('attendance')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0]);
    
    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }
    
    const { data, error } = await query;
    if (error) handleError(error, 'fetch attendance stats');
    
    const stats = {
      totalDays: data.length,
      presentDays: data.filter(a => a.status === 'present').length,
      lateDays: data.filter(a => a.status === 'late').length,
      totalHours: data.reduce((sum, a) => sum + (parseFloat(a.work_hours) || 0), 0),
      overtimeHours: data.reduce((sum, a) => sum + (parseFloat(a.overtime_hours) || 0), 0),
    };
    
    return stats;
  },
};

// ============================================
// Tasks API
// ============================================

export const tasksAPI = {
  getAll: async (filters = {}) => {
    checkSupabase();
    
    let query = supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });
    
    // RBAC: Employees only see their own tasks
    if (!isAdminOrManager()) {
      const employeeId = await getCurrentEmployeeId();
      if (employeeId) {
        query = query.eq('assigned_to', employeeId);
      }
    }
    
    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.priority) {
      query = query.eq('priority', filters.priority);
    }
    if (filters.assignedTo) {
      query = query.eq('assigned_to', filters.assignedTo);
    }
    
    const { data, error } = await query;
    if (error) handleError(error, 'fetch tasks');
    return data || [];
  },
  
  getById: async (id) => {
    checkSupabase();
    
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) handleError(error, 'fetch task');
    return data;
  },
  
  create: async (data) => {
    checkSupabase();
    
    // Check admin access - log for debugging
    const user = getCurrentUser();
    console.log('Task create - User role:', user?.role);
    
    if (!isAdminOrManager()) {
      throw new Error('Access denied. Admin or manager role required to create tasks.');
    }
    
    const assignerId = await getCurrentEmployeeId();
    
    // Clean up data - remove any fields not in schema
    const taskData = {
      title: data.title,
      description: data.description || '',
      assigned_to: data.assigned_to || null,
      assigned_by: assignerId,
      status: data.status || 'pending',
      priority: data.priority || 'medium',
      due_date: data.due_date || null,
    };
    
    const { data: task, error } = await supabase
      .from('tasks')
      .insert(taskData)
      .select()
      .single();
    
    if (error) handleError(error, 'create task');
    return task;
  },
  
  update: async (id, data) => {
    checkSupabase();
    
    const { data: task, error } = await supabase
      .from('tasks')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) handleError(error, 'update task');
    return task;
  },
  
  delete: async (id) => {
    checkSupabase();
    
    if (!isAdminOrManager()) {
      throw new Error('Access denied. Only admins and managers can delete tasks.');
    }
    
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);
    
    if (error) handleError(error, 'delete task');
    return { success: true };
  },
  
  updateStatus: async (id, status) => {
    checkSupabase();
    
    const updateData = {
      status,
      updated_at: new Date().toISOString(),
    };
    
    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }
    
    const { data: task, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) handleError(error, 'update task status');
    return task;
  },
};

// ============================================
// Leaves API
// ============================================

export const leavesAPI = {
  getAll: async (filters = {}) => {
    checkSupabase();
    
    try {
      let query = supabase
        .from('leaves')
        .select(`*, employees (id, first_name, last_name, department)`)
        .order('created_at', { ascending: false });
      
      // RBAC: Employees only see their own leaves
      if (!isAdminOrManager()) {
        const employeeId = await getCurrentEmployeeId();
        if (employeeId) {
          query = query.eq('employee_id', employeeId);
        } else {
          // No employee ID found, return empty array
          return [];
        }
      }
      
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.employeeId) {
        query = query.eq('employee_id', filters.employeeId);
      }
      
      const { data, error } = await query;
      if (error) {
        console.error('Error fetching leaves:', error);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error('Leaves API error:', err);
      return [];
    }
  },
  
  create: async (data) => {
    checkSupabase();
    
    // Get employee ID from current user
    let employeeId = data.employee_id;
    if (!employeeId) {
      employeeId = await getCurrentEmployeeId();
    }
    
    if (!employeeId) {
      throw new Error('Employee record not found. Please contact admin.');
    }
    
    // Calculate days
    const start = new Date(data.start_date);
    const end = new Date(data.end_date);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    
    // Only include fields that exist in the leaves table
    const leaveData = {
      employee_id: employeeId,
      leave_type: data.leave_type,
      start_date: data.start_date,
      end_date: data.end_date,
      days,
      reason: data.reason || '',
      status: 'pending',
    };
    
    const { data: leave, error } = await supabase
      .from('leaves')
      .insert(leaveData)
      .select()
      .single();
    
    if (error) handleError(error, 'create leave request');
    return leave;
  },
  
  approve: async (id) => {
    checkSupabase();
    
    if (!isAdminOrManager()) {
      throw new Error('Access denied. Only admins and managers can approve leaves.');
    }
    
    // Get current employee ID for approved_by
    const employeeId = await getCurrentEmployeeId();
    
    const { data: leave, error } = await supabase
      .from('leaves')
      .update({
        status: 'approved',
        approved_by: employeeId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`*, employees (id, first_name, last_name, department)`)
      .single();
    
    if (error) handleError(error, 'approve leave');
    return leave;
  },
  
  reject: async (id, reason) => {
    checkSupabase();
    
    if (!isAdminOrManager()) {
      throw new Error('Access denied. Only admins and managers can reject leaves.');
    }
    
    // Get current employee ID for approved_by
    const employeeId = await getCurrentEmployeeId();
    
    const { data: leave, error } = await supabase
      .from('leaves')
      .update({
        status: 'rejected',
        approved_by: employeeId,
        approved_at: new Date().toISOString(),
        rejection_reason: reason || '',
      })
      .eq('id', id)
      .select(`*, employees (id, first_name, last_name, department)`)
      .single();
    
    if (error) handleError(error, 'reject leave');
    return leave;
  },
  
  getBalance: async (employeeId) => {
    checkSupabase();
    
    // Default leave balances per year
    const defaultBalance = {
      annual: 14,
      sick: 10,
      casual: 5,
      maternity: 90,
      paternity: 7,
    };
    
    const { data: usedLeaves, error } = await supabase
      .from('leaves')
      .select('leave_type, days')
      .eq('employee_id', employeeId)
      .eq('status', 'approved')
      .gte('start_date', `${new Date().getFullYear()}-01-01`);
    
    if (error) handleError(error, 'fetch leave balance');
    
    const usedByType = {};
    usedLeaves.forEach(leave => {
      usedByType[leave.leave_type] = (usedByType[leave.leave_type] || 0) + leave.days;
    });
    
    const balance = {};
    Object.keys(defaultBalance).forEach(type => {
      balance[type] = {
        total: defaultBalance[type],
        used: usedByType[type] || 0,
        remaining: defaultBalance[type] - (usedByType[type] || 0),
      };
    });
    
    return balance;
  },
};

// ============================================
// Expenses API (Admin only)
// ============================================

export const expensesAPI = {
  getAll: async (filters = {}) => {
    checkSupabase();
    
    // RBAC check - return empty array for non-admins instead of throwing
    if (!isAdminOrManager()) {
      console.warn('Expenses: Access denied for non-admin user');
      return [];
    }
    
    let query = supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false });
    
    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.startDate) {
      query = query.gte('date', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('date', filters.endDate);
    }
    
    const { data, error } = await query;
    if (error) handleError(error, 'fetch expenses');
    return data || [];
  },
  
  getById: async (id) => {
    checkSupabase();
    
    if (!isAdminOrManager()) {
      throw new Error('Access denied.');
    }
    
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) handleError(error, 'fetch expense');
    return data;
  },
  
  create: async (data) => {
    checkSupabase();
    
    // Check admin access - log for debugging
    const user = getCurrentUser();
    console.log('Expense create - User role:', user?.role);
    
    if (!isAdminOrManager()) {
      throw new Error('Access denied. Admin or manager role required.');
    }
    
    // Clean data - only include fields that exist in the database
    // Note: 'title' is mapped to description since database doesn't have title column
    const cleanData = {
      amount: data.amount ? parseFloat(data.amount) : 0,
      category: data.category || '',
      description: data.title || data.description || '', // Title maps to description
      date: data.date || new Date().toISOString().split('T')[0],
      receipt_url: data.receipt_url || null,
      status: data.status || 'pending',
      employee_id: data.employee_id || null,
    };
    
    const { data: expense, error } = await supabase
      .from('expenses')
      .insert(cleanData)
      .select()
      .single();
    
    if (error) handleError(error, 'create expense');
    return expense;
  },
  
  update: async (id, data) => {
    checkSupabase();
    
    if (!isAdminOrManager()) {
      throw new Error('Access denied.');
    }
    
    // Clean data - only include fields that exist in database
    // Note: 'title' is mapped to description since database doesn't have title column
    const cleanData = {
      amount: data.amount ? parseFloat(data.amount) : undefined,
      category: data.category,
      description: data.title || data.description || '', // Title maps to description
      date: data.date,
      receipt_url: data.receipt_url,
      status: data.status,
      updated_at: new Date().toISOString(),
    };
    
    // Remove undefined values
    Object.keys(cleanData).forEach(key => cleanData[key] === undefined && delete cleanData[key]);
    
    const { data: expense, error } = await supabase
      .from('expenses')
      .update(cleanData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) handleError(error, 'update expense');
    return expense;
  },
  
  delete: async (id) => {
    checkSupabase();
    
    if (!isAdminOrManager()) {
      throw new Error('Access denied.');
    }
    
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);
    
    if (error) handleError(error, 'delete expense');
    return { success: true };
  },
  
  approve: async (id, approverId) => {
    checkSupabase();
    
    if (!isAdminOrManager()) {
      throw new Error('Access denied.');
    }
    
    const { data, error } = await supabase
      .from('expenses')
      .update({
        status: 'approved',
        approved_by: approverId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) handleError(error, 'approve expense');
    return data;
  },
  
  reject: async (id, approverId, reason) => {
    checkSupabase();
    
    if (!isAdminOrManager()) {
      throw new Error('Access denied.');
    }
    
    const { data, error } = await supabase
      .from('expenses')
      .update({
        status: 'rejected',
        approved_by: approverId,
        approved_at: new Date().toISOString(),
        rejection_reason: reason,
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) handleError(error, 'reject expense');
    return data;
  },
  
  getStats: async (employeeId, period = 'month') => {
    checkSupabase();
    
    if (!isAdminOrManager()) {
      throw new Error('Access denied.');
    }
    
    const now = new Date();
    let startDate;
    
    if (period === 'week') {
      startDate = new Date(now.setDate(now.getDate() - 7));
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      startDate = new Date(now.getFullYear(), 0, 1);
    }
    
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0]);
    
    if (error) handleError(error, 'fetch expense stats');
    
    const stats = {
      total: data.reduce((sum, e) => sum + parseFloat(e.amount), 0),
      pending: data.filter(e => e.status === 'pending').reduce((sum, e) => sum + parseFloat(e.amount), 0),
      approved: data.filter(e => e.status === 'approved').reduce((sum, e) => sum + parseFloat(e.amount), 0),
      byCategory: {},
    };
    
    data.forEach(exp => {
      stats.byCategory[exp.category] = (stats.byCategory[exp.category] || 0) + parseFloat(exp.amount);
    });
    
    return stats;
  },
};

// ============================================
// Revenue API (Admin only)
// ============================================

export const revenueAPI = {
  getAll: async (filters = {}) => {
    checkSupabase();
    
    // RBAC check - return empty array for non-admins instead of throwing
    if (!isAdminOrManager()) {
      console.warn('Revenue: Access denied for non-admin user');
      return [];
    }
    
    let query = supabase
      .from('revenue')
      .select('*')
      .order('date', { ascending: false });
    
    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    if (filters.source) {
      query = query.eq('source', filters.source);
    }
    if (filters.startDate) {
      query = query.gte('date', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('date', filters.endDate);
    }
    
    const { data, error } = await query;
    if (error) handleError(error, 'fetch revenue');
    return data || [];
  },
  
  getById: async (id) => {
    checkSupabase();
    
    if (!isAdminOrManager()) {
      throw new Error('Access denied.');
    }
    
    const { data, error } = await supabase
      .from('revenue')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) handleError(error, 'fetch revenue entry');
    return data;
  },
  
  create: async (data) => {
    checkSupabase();
    
    // Check admin access - log for debugging
    const user = getCurrentUser();
    console.log('Revenue create - User role:', user?.role);
    
    if (!isAdminOrManager()) {
      throw new Error('Access denied. Admin or manager role required.');
    }
    
    const employeeId = await getCurrentEmployeeId();
    
    // Clean data - include all fields that exist in the revenue table
    // Note: 'title' is mapped to description since database doesn't have title column
    const revenueData = {
      amount: data.amount ? parseFloat(data.amount) : 0,
      source: data.source || '',
      category: data.category || '',
      description: data.title || data.description || '', // Title maps to description
      date: data.date || new Date().toISOString().split('T')[0],
      client_name: data.client_name || '',
      invoice_number: data.invoice_number || '',
      payment_method: data.payment_method || '',
      status: data.status || 'received',
      created_by: employeeId,
    };
    
    const { data: revenue, error } = await supabase
      .from('revenue')
      .insert(revenueData)
      .select()
      .single();
    
    if (error) handleError(error, 'create revenue');
    return revenue;
  },
  
  update: async (id, data) => {
    checkSupabase();
    
    if (!isAdminOrManager()) {
      throw new Error('Access denied.');
    }
    
    // Clean data - only include fields that exist in database
    // Note: 'title' is mapped to description since database doesn't have title column
    const cleanData = {
      amount: data.amount ? parseFloat(data.amount) : undefined,
      source: data.source,
      category: data.category,
      description: data.title || data.description || '', // Title maps to description
      date: data.date,
      client_name: data.client_name,
      invoice_number: data.invoice_number,
      payment_method: data.payment_method,
      status: data.status,
      updated_at: new Date().toISOString(),
    };
    
    // Remove undefined values
    Object.keys(cleanData).forEach(key => cleanData[key] === undefined && delete cleanData[key]);
    
    const { data: revenue, error } = await supabase
      .from('revenue')
      .update(cleanData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) handleError(error, 'update revenue');
    return revenue;
  },
  
  delete: async (id) => {
    checkSupabase();
    
    if (!isAdminOrManager()) {
      throw new Error('Access denied.');
    }
    
    const { error } = await supabase
      .from('revenue')
      .delete()
      .eq('id', id);
    
    if (error) handleError(error, 'delete revenue');
    return { success: true };
  },
  
  getStats: async (period = 'month') => {
    checkSupabase();
    
    if (!isAdminOrManager()) {
      throw new Error('Access denied.');
    }
    
    const now = new Date();
    let startDate;
    
    if (period === 'week') {
      startDate = new Date(now.setDate(now.getDate() - 7));
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      startDate = new Date(now.getFullYear(), 0, 1);
    }
    
    const { data, error } = await supabase
      .from('revenue')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0]);
    
    if (error) handleError(error, 'fetch revenue stats');
    
    const stats = {
      total: data.reduce((sum, r) => sum + parseFloat(r.amount), 0),
      received: data.filter(r => r.status === 'received').reduce((sum, r) => sum + parseFloat(r.amount), 0),
      pending: data.filter(r => r.status === 'pending').reduce((sum, r) => sum + parseFloat(r.amount), 0),
      byCategory: {},
      bySource: {},
    };
    
    data.forEach(rev => {
      if (rev.category) {
        stats.byCategory[rev.category] = (stats.byCategory[rev.category] || 0) + parseFloat(rev.amount);
      }
      if (rev.source) {
        stats.bySource[rev.source] = (stats.bySource[rev.source] || 0) + parseFloat(rev.amount);
      }
    });
    
    return stats;
  },
};

// ============================================
// Reports API
// ============================================

export const reportsAPI = {
  generate: async (type, filters) => {
    checkSupabase();
    
    if (!isAdminOrManager()) {
      throw new Error('Access denied. Only admins can generate reports.');
    }
    
    // This would generate reports based on type
    // For now, return aggregated data
    const report = {
      type,
      generatedAt: new Date().toISOString(),
      filters,
      data: {},
    };
    
    switch (type) {
      case 'employees':
        report.data = await employeesAPI.getStats();
        break;
      case 'attendance':
        report.data = await attendanceAPI.getStats(null, filters?.period || 'month');
        break;
      case 'expenses':
        report.data = await expensesAPI.getStats(null, filters?.period || 'month');
        break;
      case 'revenue':
        report.data = await revenueAPI.getStats(filters?.period || 'month');
        break;
      default:
        report.data = { message: 'Report type not supported' };
    }
    
    return report;
  },
  
  getOverview: async () => {
    checkSupabase();
    
    const today = new Date().toISOString().split('T')[0];
    
    if (!isAdminOrManager()) {
      // Return limited overview for employees - but still match the expected structure
      const employeeId = await getCurrentEmployeeId();
      const [tasks, attendance, leaves] = await Promise.all([
        supabase.from('tasks').select('status').eq('assigned_to', employeeId),
        supabase.from('attendance').select('status').eq('employee_id', employeeId).eq('date', today),
        supabase.from('leaves').select('status').eq('employee_id', employeeId).eq('status', 'approved'),
      ]);
      
      // Return structure that matches DashboardPage expectations
      return {
        employees: { total: 1, active: 1, onLeave: 0 },
        tasks: {
          total: tasks.data?.length || 0,
          pending: tasks.data?.filter(t => t.status === 'pending').length || 0,
          inProgress: tasks.data?.filter(t => t.status === 'in_progress').length || 0,
          completed: tasks.data?.filter(t => t.status === 'completed').length || 0,
          overdue: 0,
        },
        expenses: { total: 0, pending: 0, approved: 0 },
        revenue: { total: 0, paid: 0, pending: 0 },
        // Extra data for employee view
        myTasks: {
          total: tasks.data?.length || 0,
          pending: tasks.data?.filter(t => t.status === 'pending').length || 0,
          completed: tasks.data?.filter(t => t.status === 'completed').length || 0,
        },
        todayAttendance: attendance.data?.[0] || null,
      };
    }
    
    // Full overview for admins
    const [employees, tasks, expenses, revenue, leaves] = await Promise.all([
      supabase.from('employees').select('status'),
      supabase.from('tasks').select('status, due_date'),
      supabase.from('expenses').select('amount, status'),
      supabase.from('revenue').select('amount, status'),
      supabase.from('leaves').select('employee_id, status, start_date, end_date').eq('status', 'approved'),
    ]);
    
    // Count employees currently on leave
    const onLeaveCount = leaves.data?.filter(l => {
      const start = new Date(l.start_date);
      const end = new Date(l.end_date);
      const now = new Date();
      return now >= start && now <= end;
    }).length || 0;
    
    // Count overdue tasks
    const overdueCount = tasks.data?.filter(t => {
      if (t.status === 'completed') return false;
      if (!t.due_date) return false;
      return new Date(t.due_date) < new Date();
    }).length || 0;
    
    return {
      employees: {
        total: employees.data?.length || 0,
        active: employees.data?.filter(e => e.status === 'active').length || 0,
        onLeave: onLeaveCount,
      },
      tasks: {
        total: tasks.data?.length || 0,
        pending: tasks.data?.filter(t => t.status === 'pending').length || 0,
        inProgress: tasks.data?.filter(t => t.status === 'in_progress').length || 0,
        completed: tasks.data?.filter(t => t.status === 'completed').length || 0,
        overdue: overdueCount,
      },
      expenses: {
        total: expenses.data?.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) || 0,
        pending: expenses.data?.filter(e => e.status === 'pending').reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) || 0,
        approved: expenses.data?.filter(e => e.status === 'approved').reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) || 0,
      },
      revenue: {
        total: revenue.data?.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0) || 0,
        pending: revenue.data?.filter(r => r.status === 'pending').reduce((sum, r) => sum + parseFloat(r.amount || 0), 0) || 0,
        paid: revenue.data?.filter(r => r.status === 'received').reduce((sum, r) => sum + parseFloat(r.amount || 0), 0) || 0,
      },
    };
  },
};

// ============================================
// Notifications API
// ============================================

export const notificationsAPI = {
  getAll: async (userId, filters = {}) => {
    checkSupabase();
    
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (filters.unreadOnly) {
      query = query.eq('read', false);
    }
    
    const { data, error } = await query.limit(filters.limit || 50);
    if (error) handleError(error, 'fetch notifications');
    return data;
  },
  
  markRead: async (id) => {
    checkSupabase();
    
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .select()
      .single();
    
    if (error) handleError(error, 'mark notification read');
    return data;
  },
  
  markAllRead: async (userId) => {
    checkSupabase();
    
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);
    
    if (error) handleError(error, 'mark all notifications read');
    return { success: true };
  },
  
  delete: async (id) => {
    checkSupabase();
    
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);
    
    if (error) handleError(error, 'delete notification');
    return { success: true };
  },
  
  deleteAll: async (userId) => {
    checkSupabase();
    
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId);
    
    if (error) handleError(error, 'delete all notifications');
    return { success: true };
  },
  
  create: async (userId, notification) => {
    checkSupabase();
    
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: notification.title,
        message: notification.message,
        type: notification.type || 'info',
        link: notification.link,
      })
      .select()
      .single();
    
    if (error) handleError(error, 'create notification');
    return data;
  },
  
  show: async (title, body, icon) => {
    // For Electron native notifications, we still use the IPC if available
    if (window.electronAPI?.notifications?.show) {
      return window.electronAPI.notifications.show(title, body, icon);
    }
    // Fallback to browser notification
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon });
    }
  },
};

// ============================================
// Settings API
// ============================================

export const settingsAPI = {
  get: async (userId) => {
    checkSupabase();
    
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') { // Not found is ok
      handleError(error, 'fetch settings');
    }
    
    // Return defaults if no settings found
    return data || {
      theme: 'system',
      notifications_enabled: true,
      email_notifications: true,
      language: 'en',
      timezone: 'Asia/Karachi',
    };
  },
  
  update: async (userId, settings) => {
    checkSupabase();
    
    // Upsert settings
    const { data, error } = await supabase
      .from('settings')
      .upsert({
        user_id: userId,
        ...settings,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single();
    
    if (error) handleError(error, 'update settings');
    return data;
  },
  
  changePassword: async (userId, currentPassword, newPassword) => {
    checkSupabase();
    
    // Get current user
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', userId)
      .single();
    
    if (fetchError) handleError(fetchError, 'fetch user');
    
    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }
    
    // Update password
    const newHash = await bcrypt.hash(newPassword, 10);
    const { error } = await supabase
      .from('users')
      .update({ password_hash: newHash })
      .eq('id', userId);
    
    if (error) handleError(error, 'change password');
    return { success: true };
  },
};

// ============================================
// Chat API
// ============================================

export const chatAPI = {
  // Cache for employee lookup by user_id
  _employeeCache: {},
  _employeeCacheTime: 0,

  // Fetch all employees and cache them for name lookups
  _ensureEmployeeCache: async () => {
    const now = Date.now();
    if (now - chatAPI._employeeCacheTime < 60000 && Object.keys(chatAPI._employeeCache).length > 0) {
      return chatAPI._employeeCache;
    }
    const { data } = await supabase
      .from('employees')
      .select('id, user_id, first_name, last_name, email, department, designation, avatar_url, status');
    const cache = {};
    (data || []).forEach(e => {
      if (e.user_id) cache[e.user_id] = e;
    });

    // Also fetch users who might not have employee records (e.g. admin accounts)
    try {
      const { data: users } = await supabase
        .from('users')
        .select('id, email, role');
      (users || []).forEach(u => {
        if (!cache[u.id]) {
          // Create a synthetic employee cache entry for users without employee records
          cache[u.id] = {
            user_id: u.id,
            email: u.email,
            first_name: u.role === 'super_admin' ? 'Super' : (u.role === 'admin' ? 'Admin' : 'User'),
            last_name: u.email ? u.email.split('@')[0] : '',
            department: u.role === 'super_admin' || u.role === 'admin' ? 'Administration' : '',
          };
        }
      });
    } catch (e) {
      console.warn('[chatAPI] Could not fetch users for cache:', e);
    }

    chatAPI._employeeCache = cache;
    chatAPI._employeeCacheTime = now;
    return cache;
  },

  getEmployeeName: (empCache, userId) => {
    const emp = empCache[userId];
    if (!emp) {
      // Check if there's a case-insensitive match (UUID format differences)
      const userIdLower = String(userId).toLowerCase();
      const matchKey = Object.keys(empCache).find(k => k.toLowerCase() === userIdLower);
      if (matchKey) return `${empCache[matchKey].first_name || ''} ${empCache[matchKey].last_name || ''}`.trim() || empCache[matchKey].email || 'Unknown';
      return 'Unknown User';
    }
    return `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.email || 'Unknown';
  },

  getConversations: async (userId) => {
    checkSupabase();
    
    try {
      console.log('[chatAPI] getConversations for user:', userId);
      
      // Fetch ALL conversations and filter client-side
      // (.contains() can fail with certain JSONB/array column types)
      const { data: allConvs, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (error) {
        console.error('[chatAPI] getConversations error:', error);
        return [];
      }
      
      // Filter to only conversations this user is part of
      // Use string comparison to handle UUID format differences
      const userIdStr = String(userId).trim().toLowerCase();
      const conversations = (allConvs || []).filter(c => {
        const parts = c.participants || [];
        return parts.some(p => String(p).trim().toLowerCase() === userIdStr);
      });
      
      console.log('[chatAPI] All convs in DB:', (allConvs || []).length, '| For user:', conversations.length, '| userId:', userId);
      if (conversations.length === 0) {
        console.log('[chatAPI] No conversations found for user. Sample participants from first conv:', 
          allConvs?.[0]?.participants, '| Looking for:', userId);
        return [];
      }

    // Get employee cache for name lookups
    const empCache = await chatAPI._ensureEmployeeCache();

    // Get last message for each conversation
    const convIds = conversations.map(c => c.id);
    const { data: lastMessages } = await supabase
      .from('chat_messages')
      .select('conversation_id, content, sender_id, created_at, read_by')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: false });

    // Group last messages by conversation
    const lastMsgMap = {};
    const unreadMap = {};
    (lastMessages || []).forEach(msg => {
      if (!lastMsgMap[msg.conversation_id]) {
        lastMsgMap[msg.conversation_id] = msg;
      }
      // Count unread for this user
      if (!unreadMap[msg.conversation_id]) unreadMap[msg.conversation_id] = 0;
      if (!Array.isArray(msg.read_by) || !msg.read_by.includes(userId)) {
        if (msg.sender_id !== userId) {
          unreadMap[msg.conversation_id]++;
        }
      }
    });

    // Enrich conversations
    return conversations.map(conv => {
      const lastMsg = lastMsgMap[conv.id];
      const participants = conv.participants || [];
      
      let displayName = conv.name || '';
      if (conv.type === 'direct') {
        const otherId = participants.find(p => p !== userId);
        displayName = chatAPI.getEmployeeName(empCache, otherId);
      } else if (!displayName) {
        displayName = participants.map(p => chatAPI.getEmployeeName(empCache, p)).join(', ');
      }

      return {
        ...conv,
        display_name: displayName,
        last_message: lastMsg?.content || '',
        last_message_at: lastMsg?.created_at || conv.updated_at,
        last_sender_id: lastMsg?.sender_id || null,
        unread_count: unreadMap[conv.id] || 0,
        participant_names: participants.map(p => ({
          user_id: p,
          name: chatAPI.getEmployeeName(empCache, p),
          avatar: empCache[p]?.avatar_url,
          department: empCache[p]?.department,
        })),
      };
    });
    } catch (err) {
      console.error('getConversations failed:', err);
      return [];
    }
  },
  
  getMessages: async (conversationId, limit = 100, offset = 0) => {
    checkSupabase();
    
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1);
      
      if (error) {
        console.error('getMessages error:', error);
        return [];
      }

      // Enrich with sender names
      const empCache = await chatAPI._ensureEmployeeCache();
      return (data || []).map(msg => ({
        ...msg,
        sender_name: chatAPI.getEmployeeName(empCache, msg.sender_id),
        sender_avatar: empCache[msg.sender_id]?.avatar_url,
      }));
    } catch (err) {
      console.error('getMessages failed:', err);
      return [];
    }
  },
  
  sendMessage: async (data) => {
    checkSupabase();
    
    const messageData = {
      conversation_id: data.conversationId,
      sender_id: data.senderId,
      content: data.content,
      message_type: data.type || 'text',
      attachments: data.attachments || [],
      read_by: [data.senderId], // Sender has read their own message
    };

    // If mentions are found, store them
    if (data.mentions && data.mentions.length > 0) {
      messageData.attachments = [...(data.attachments || []), { type: 'mentions', user_ids: data.mentions }];
    }

    const { data: message, error } = await supabase
      .from('chat_messages')
      .insert(messageData)
      .select()
      .single();
    
    if (error) {
      console.error('sendMessage error:', error);
      throw new Error(error.message || 'Failed to send message');
    }
    if (!message) throw new Error('No message returned from insert');
    
    // Update conversation timestamp and last message
    await supabase
      .from('chat_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', data.conversationId);

    // Create notifications for mentioned users
    if (data.mentions && data.mentions.length > 0) {
      const empCache = await chatAPI._ensureEmployeeCache();
      const senderName = chatAPI.getEmployeeName(empCache, data.senderId);
      for (const mentionedUserId of data.mentions) {
        if (mentionedUserId !== data.senderId) {
          try {
            await supabase.from('notifications').insert({
              user_id: mentionedUserId,
              title: 'You were mentioned',
              message: `${senderName} mentioned you: "${data.content.substring(0, 100)}"`,
              type: 'info',
              link: `/chat`,
            });
          } catch (e) {
            console.error('Failed to create mention notification:', e);
          }
        }
      }
    }

    // Create chat notification for other participants
    try {
      const { data: conv } = await supabase
        .from('chat_conversations')
        .select('participants, name, type')
        .eq('id', data.conversationId)
        .single();
      
      if (conv) {
        const empCache = await chatAPI._ensureEmployeeCache();
        const senderName = chatAPI.getEmployeeName(empCache, data.senderId);
        const recipients = (conv.participants || []).filter(p => p !== data.senderId);
        // skip if user is already mentioned
        const mentionedSet = new Set(data.mentions || []);
        for (const recipientId of recipients) {
          if (!mentionedSet.has(recipientId)) {
            try {
              await supabase.from('notifications').insert({
                user_id: recipientId,
                title: conv.type === 'group' ? `New message in ${conv.name || 'Group'}` : `Message from ${senderName}`,
                message: data.content.substring(0, 150),
                type: 'info',
                link: '/chat',
              });
            } catch (e) {
              // Silent fail for notification
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to create chat notifications:', e);
    }
    
    // Enrich returned message
    const empCache = await chatAPI._ensureEmployeeCache();
    return {
      ...message,
      sender_name: chatAPI.getEmployeeName(empCache, message.sender_id),
      sender_avatar: empCache[message.sender_id]?.avatar_url,
    };
  },
  
  createConversation: async (participantIds, name, type = 'direct') => {
    checkSupabase();

    // Helper to enrich a conversation with display_name and participant_names
    const enrichConversation = async (conv, requesterId) => {
      const empCache = await chatAPI._ensureEmployeeCache();
      const participants = conv.participants || [];
      
      let displayName = conv.name || '';
      if (conv.type === 'direct') {
        const otherId = participants.find(p => p !== requesterId);
        displayName = chatAPI.getEmployeeName(empCache, otherId);
      } else if (!displayName) {
        displayName = participants.map(p => chatAPI.getEmployeeName(empCache, p)).join(', ');
      }
      
      return {
        ...conv,
        display_name: displayName,
        last_message: '',
        last_message_at: conv.updated_at,
        unread_count: 0,
        participant_names: participants.map(p => ({
          user_id: p,
          name: chatAPI.getEmployeeName(empCache, p),
          avatar: empCache[p]?.avatar_url,
          department: empCache[p]?.department,
        })),
      };
    };

    // For direct conversations, check if one already exists
    if (type === 'direct' && participantIds.length === 2) {
      const { data: existing } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('type', 'direct')
        .contains('participants', participantIds);
      
      if (existing && existing.length > 0) {
        // Find exact match (both participants)
        const exactMatch = existing.find(c => {
          const parts = c.participants || [];
          return parts.length === 2 && 
                 parts.includes(participantIds[0]) && 
                 parts.includes(participantIds[1]);
        });
        if (exactMatch) {
          console.log('[chatAPI] Found existing conversation:', exactMatch.id);
          return await enrichConversation(exactMatch, participantIds[0]);
        }
      }
    }
    
    const { data, error } = await supabase
      .from('chat_conversations')
      .insert({
        participants: participantIds,
        name: name || null,
        type,
      })
      .select()
      .single();
    
    if (error) {
      console.error('createConversation error:', error);
      throw new Error(error.message || 'Failed to create conversation');
    }
    
    console.log('[chatAPI] Created new conversation:', data.id);
    return await enrichConversation(data, participantIds[0]);
  },
  
  // Real-time subscription for new messages
  subscribeToMessages: (conversationId, callback) => {
    return supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          const empCache = await chatAPI._ensureEmployeeCache();
          const msg = payload.new;
          callback({
            ...msg,
            sender_name: chatAPI.getEmployeeName(empCache, msg.sender_id),
            sender_avatar: empCache[msg.sender_id]?.avatar_url,
          }, 'INSERT');
        } else if (payload.eventType === 'UPDATE') {
          callback(payload.new, 'UPDATE');
        }
      })
      .subscribe();
  },
  
  unsubscribeFromMessages: (subscription) => {
    if (subscription) supabase.removeChannel(subscription);
  },

  subscribeToConversations: (userId, callback) => {
    return supabase
      .channel(`conversations:user:${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_conversations',
      }, (payload) => {
        try {
          const conv = payload.new || payload.old;
          if (!conv) return;
          const parts = conv.participants || [];
          if (Array.isArray(parts) && parts.includes(userId)) {
            callback(conv, payload.eventType || payload.event || 'unknown');
          }
        } catch (err) {
          console.error('subscribeToConversations handler error', err);
        }
      })
      .subscribe();
  },

  unsubscribeFromChannel: (subscription) => {
    if (subscription) supabase.removeChannel(subscription);
  },

  markMessagesRead: async (conversationId, userId) => {
    checkSupabase();
    try {
      // Get unread messages not sent by this user
      const { data: messages, error: fetchError } = await supabase
        .from('chat_messages')
        .select('id, read_by, sender_id')
        .eq('conversation_id', conversationId);
      if (fetchError) throw fetchError;

      const toUpdate = (messages || []).filter(m => {
        const readBy = Array.isArray(m.read_by) ? m.read_by : [];
        return !readBy.includes(userId);
      });

      for (const msg of toUpdate) {
        const newReadBy = Array.isArray(msg.read_by) ? [...msg.read_by, userId] : [userId];
        await supabase
          .from('chat_messages')
          .update({ read_by: newReadBy })
          .eq('id', msg.id);
      }
      return { success: true, updated: toUpdate.length };
    } catch (error) {
      console.error('Error marking messages read:', error);
    }
  },

  pinConversation: async (userId, conversationId) => {
    try {
      const settings = await settingsAPI.get(userId);
      const json = settings.settings_json || {};
      const pins = Array.isArray(json.chat_pins) ? json.chat_pins : [];
      if (!pins.includes(conversationId)) pins.unshift(conversationId);
      json.chat_pins = pins;
      await settingsAPI.update(userId, { settings_json: json });
      return { success: true };
    } catch (error) {
      handleError(error, 'pin conversation');
    }
  },

  unpinConversation: async (userId, conversationId) => {
    try {
      const settings = await settingsAPI.get(userId);
      const json = settings.settings_json || {};
      const pins = Array.isArray(json.chat_pins) ? json.chat_pins.filter(id => id !== conversationId) : [];
      json.chat_pins = pins;
      await settingsAPI.update(userId, { settings_json: json });
      return { success: true };
    } catch (error) {
      handleError(error, 'unpin conversation');
    }
  },

  // Get all employees for chat - includes ALL employees, even without user_id
  getAllChatUsers: async () => {
    checkSupabase();
    const { data, error } = await supabase
      .from('employees')
      .select('id, user_id, first_name, last_name, email, department, designation, avatar_url, status')
      .order('first_name', { ascending: true });
    
    if (error) {
      console.error('getAllChatUsers error:', error);
      // Fallback to cache
      const empCache = await chatAPI._ensureEmployeeCache();
      return Object.values(empCache).map(emp => ({
        user_id: emp.user_id,
        employee_id: emp.id,
        name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
        first_name: emp.first_name,
        last_name: emp.last_name,
        email: emp.email,
        department: emp.department,
        designation: emp.designation,
        avatar_url: emp.avatar_url,
        status: emp.status,
      }));
    }
    
    return (data || []).map(emp => ({
      user_id: emp.user_id,
      employee_id: emp.id,
      name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.email || 'Unknown',
      first_name: emp.first_name,
      last_name: emp.last_name,
      email: emp.email,
      department: emp.department,
      designation: emp.designation,
      avatar_url: emp.avatar_url,
      status: emp.status,
    }));
  },
};

// ============================================
// Files API
// ============================================

export const filesAPI = {
  upload: async (fileName, fileData, folder = 'documents') => {
    checkSupabase();
    
    const user = getCurrentUser();
    const employeeId = await getCurrentEmployeeId();
    const path = `${folder}/${Date.now()}_${fileName}`;
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('files')
      .upload(path, fileData, {
        cacheControl: '3600',
        upsert: false,
      });
    
    if (uploadError) handleError(uploadError, 'upload file');
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('files')
      .getPublicUrl(path);
    
    // Save file record
    const { data: fileRecord, error } = await supabase
      .from('files')
      .insert({
        name: fileName,
        path: path, // Store the path, not full URL
        url: publicUrl,
        folder,
        uploaded_by: employeeId,
        size: fileData.size || 0,
        mime_type: fileData.type || 'application/octet-stream',
      })
      .select()
      .single();
    
    if (error) handleError(error, 'save file record');
    return fileRecord;
  },
  
  getAll: async (filters = {}) => {
    checkSupabase();
    
    let query = supabase
      .from('files')
      .select(`*, employees (first_name, last_name)`)
      .order('created_at', { ascending: false });
    
    if (filters.folder) {
      query = query.eq('folder', filters.folder);
    }
    
    const { data, error } = await query;
    if (error) handleError(error, 'fetch files');
    
    // Add download URLs
    return data?.map(file => ({
      ...file,
      downloadUrl: file.url || supabase.storage.from('files').getPublicUrl(file.path).data.publicUrl,
    })) || [];
  },
  
  download: async (fileRecord) => {
    checkSupabase();
    
    // If we have a URL, use it directly
    if (fileRecord.url || fileRecord.downloadUrl) {
      const url = fileRecord.url || fileRecord.downloadUrl;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to download file');
      return await response.blob();
    }
    
    // Otherwise download from storage
    const { data, error } = await supabase.storage
      .from('files')
      .download(fileRecord.path);
    
    if (error) handleError(error, 'download file');
    return data;
  },
  
  getSignedUrl: async (path, expiresIn = 3600) => {
    checkSupabase();
    
    const { data, error } = await supabase.storage
      .from('files')
      .createSignedUrl(path, expiresIn);
    
    if (error) handleError(error, 'create signed URL');
    return data?.signedUrl;
  },
  
  delete: async (id) => {
    checkSupabase();
    
    // Get file record
    const { data: file } = await supabase
      .from('files')
      .select('path')
      .eq('id', id)
      .single();
    
    if (file?.path) {
      // Delete from storage
      await supabase.storage.from('files').remove([file.path]);
    }
    
    // Delete record
    const { error } = await supabase
      .from('files')
      .delete()
      .eq('id', id);
    
    if (error) handleError(error, 'delete file');
    return { success: true };
  },
  
  // Upload profile picture
  uploadProfilePicture: async (file, employeeId) => {
    checkSupabase();
    
    const ext = file.name.split('.').pop();
    const path = `avatars/${employeeId}_${Date.now()}.${ext}`;
    
    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('files')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      });
    
    if (uploadError) {
      // Check if it's an RLS policy error
      if (uploadError.message?.includes('row-level security') || 
          uploadError.message?.includes('policy') ||
          uploadError.statusCode === 403) {
        throw new Error(
          'Storage permission denied. Please run the migration-storage-policies.sql script in your Supabase SQL Editor to enable file uploads.'
        );
      }
      handleError(uploadError, 'upload profile picture');
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('files')
      .getPublicUrl(path);
    
    return publicUrl;
  },
  
  // These still use Electron API if available
  openDialog: async (options) => {
    if (window.electronAPI?.files?.openDialog) {
      return window.electronAPI.files.openDialog(options);
    }
    // Fallback: use file input
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = options?.properties?.includes('multiSelections');
      input.onchange = (e) => {
        resolve(Array.from(e.target.files).map(f => f.path || f.name));
      };
      input.click();
    });
  },
  
  saveDialog: async (options) => {
    if (window.electronAPI?.files?.saveDialog) {
      return window.electronAPI.files.saveDialog(options);
    }
    return null;
  },
};

// ============================================
// Export API
// ============================================

export const exportAPI = {
  save: async (data, fileName, type) => {
    // Still use Electron for file saving if available
    if (window.electronAPI?.export?.save) {
      return window.electronAPI.export.save(data, fileName, type);
    }
    
    // Fallback: browser download
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.${type || 'json'}`;
    a.click();
    URL.revokeObjectURL(url);
    
    return { success: true };
  },
};

// ============================================
// System API
// ============================================

export const systemAPI = {
  getAppInfo: async () => {
    if (window.electronAPI?.system?.getAppInfo) {
      return window.electronAPI.system.getAppInfo();
    }
    return {
      version: '1.0.0',
      name: 'Guardian Desktop ERP',
      platform: navigator.platform,
    };
  },
  
  openExternal: async (url) => {
    if (window.electronAPI?.system?.openExternal) {
      return window.electronAPI.system.openExternal(url);
    }
    window.open(url, '_blank');
  },
};

// ============================================
// VOB Custom Fields API
// ============================================

export const vobCustomFieldsAPI = {
  getAll: async () => {
    checkSupabase();
    
    const { data, error } = await supabase
      .from('vob_custom_fields')
      .select('*')
      .order('sort_order');
    
    if (error) handleError(error, 'fetch VOB custom fields');
    return data;
  },
  
  getBySection: async (section) => {
    checkSupabase();
    
    const { data, error } = await supabase
      .from('vob_custom_fields')
      .select('*')
      .eq('section', section)
      .order('sort_order');
    
    if (error) handleError(error, 'fetch VOB custom fields');
    return data;
  },
  
  create: async (fieldData) => {
    checkSupabase();
    
    const { data, error } = await supabase
      .from('vob_custom_fields')
      .insert(fieldData)
      .select()
      .single();
    
    if (error) handleError(error, 'create VOB custom field');
    return data;
  },
  
  delete: async (id) => {
    checkSupabase();
    
    const { error } = await supabase
      .from('vob_custom_fields')
      .delete()
      .eq('id', id);
    
    if (error) handleError(error, 'delete VOB custom field');
    return { success: true };
  },
};

// ============================================
// VOB Records API
// ============================================

export const vobRecordsAPI = {
  getAll: async (filters = {}) => {
    checkSupabase();
    
    let query = supabase
      .from('vob_records')
      .select(`*, employees (first_name, last_name)`)
      .order('created_at', { ascending: false });
    
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.search) {
      query = query.or(`patient_name.ilike.%${filters.search}%,insurance_company.ilike.%${filters.search}%`);
    }
    
    const { data, error } = await query;
    if (error) handleError(error, 'fetch VOB records');
    return data;
  },
  
  create: async (recordData) => {
    checkSupabase();
    
    const employeeId = await getCurrentEmployeeId();
    
    const { data, error } = await supabase
      .from('vob_records')
      .insert({ ...recordData, created_by: employeeId })
      .select()
      .single();
    
    if (error) handleError(error, 'create VOB record');
    return data;
  },
  
  update: async (id, recordData) => {
    checkSupabase();
    
    const { data, error } = await supabase
      .from('vob_records')
      .update({ ...recordData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) handleError(error, 'update VOB record');
    return data;
  },
  
  delete: async (id) => {
    checkSupabase();
    
    const { error } = await supabase
      .from('vob_records')
      .delete()
      .eq('id', id);
    
    if (error) handleError(error, 'delete VOB record');
    return { success: true };
  },
};

// ============================================
// Roles API
// ============================================

export const rolesAPI = {
  getAll: async () => {
    checkSupabase();
    
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('name');
    
    if (error) handleError(error, 'fetch roles');
    return data;
  },
};

// ============================================
// Default Export
// ============================================

export default {
  auth: authAPI,
  users: usersAPI,
  employees: employeesAPI,
  attendance: attendanceAPI,
  tasks: tasksAPI,
  leaves: leavesAPI,
  expenses: expensesAPI,
  revenue: revenueAPI,
  reports: reportsAPI,
  chat: chatAPI,
  notifications: notificationsAPI,
  settings: settingsAPI,
  files: filesAPI,
  export: exportAPI,
  system: systemAPI,
  vobCustomFields: vobCustomFieldsAPI,
  vobRecords: vobRecordsAPI,
  roles: rolesAPI,
};
