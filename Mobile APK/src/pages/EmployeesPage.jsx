/**
 * Guardian Desktop ERP - Employees Page
 * Employee management with CRUD operations
 */

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Mail,
  Phone,
  MoreVertical,
  Download,
  X,
  User,
  Building,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Key,
  UserPlus,
  Camera,
} from 'lucide-react';
import { employeesAPI } from '../services/api';
import toast from 'react-hot-toast';
import { TableSkeleton, InlineSpinner } from '../components/common/LoadingSpinner';
import { useAuth } from '../store/AuthContext';
import { CameraViewerPopup } from '../components/CameraViewerPopup';
import { 
  DEPARTMENT_LIST, 
  POSITIONS, 
  SYSTEM_ROLES,
  getDepartmentColor,
  getPositionLabel,
  getDepartmentLabel 
} from '../data/organizationConfig';

// Status Badge Component
function StatusBadge({ status }) {
  const styles = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    on_leave: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    resigned: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  };

  const labels = {
    active: 'Active',
    on_leave: 'On Leave',
    resigned: 'Resigned',
    inactive: 'Inactive',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.inactive}`}>
      {labels[status] || status}
    </span>
  );
}

// Employee Modal Component
function EmployeeModal({ isOpen, onClose, employee, onSave }) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: '',
    department: '',
    salary_pkr: '',
    joining_date: '',
    status: 'active',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (employee) {
      setFormData({
        first_name: employee.first_name || '',
        last_name: employee.last_name || '',
        email: employee.email || '',
        phone: employee.phone || '',
        role: employee.role || '',
        department: employee.department || '',
        salary_pkr: employee.salary_pkr || '',
        joining_date: employee.joining_date || '',
        status: employee.status || 'active',
      });
    } else {
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        role: '',
        department: '',
        salary_pkr: '',
        joining_date: new Date().toISOString().split('T')[0],
        status: 'active',
      });
    }
    setErrors({});
  }, [employee, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.first_name) newErrors.first_name = 'First name is required';
    if (!formData.last_name) newErrors.last_name = 'Last name is required';
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      if (employee) {
        await employeesAPI.update(employee.id, formData);
        toast.success('Employee updated successfully');
      } else {
        await employeesAPI.create(formData);
        toast.success('Employee added successfully');
      }
      onSave();
      onClose();
    } catch (error) {
      toast.error(error.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="card-header flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {employee ? 'Edit Employee' : 'Add New Employee'}
          </h3>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="card-body space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                First Name *
              </label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                className={`input ${errors.first_name ? 'input-error' : ''}`}
                placeholder="John"
              />
              {errors.first_name && (
                <p className="mt-1 text-xs text-red-500">{errors.first_name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                className={`input ${errors.last_name ? 'input-error' : ''}`}
                placeholder="Doe"
              />
              {errors.last_name && (
                <p className="mt-1 text-xs text-red-500">{errors.last_name}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`input ${errors.email ? 'input-error' : ''}`}
                placeholder="john@company.com"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">{errors.email}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="input"
                placeholder="+92 300 1234567"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Role
              </label>
              <input
                type="text"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="input"
                placeholder="Software Engineer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Department
              </label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="input"
              >
                <option value="">Select Department</option>
                {DEPARTMENT_LIST.map(dept => (
                  <option key={dept.value} value={dept.value}>{dept.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Position/Role
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="input"
              >
                <option value="">Select Position</option>
                {formData.department && POSITIONS[formData.department] ? (
                  POSITIONS[formData.department].map(pos => (
                    <option key={pos.value} value={pos.value}>{pos.label}</option>
                  ))
                ) : (
                  <option value="" disabled>Select department first</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Joining Date
              </label>
              <input
                type="date"
                name="joining_date"
                value={formData.joining_date}
                onChange={handleChange}
                className="input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                System Access Role
              </label>
              <select
                name="system_role"
                value={formData.system_role || 'employee'}
                onChange={handleChange}
                className="input"
              >
                {SYSTEM_ROLES.map(role => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="input"
              >
                <option value="active">Active</option>
                <option value="on_leave">On Leave</option>
                <option value="resigned">Resigned</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                employee ? 'Update Employee' : 'Add Employee'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Delete Confirmation Modal
function DeleteModal({ isOpen, onClose, onConfirm, employeeName }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="card-body text-center py-8">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Delete Employee
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Are you sure you want to delete <strong>{employeeName}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-center gap-3">
            <button onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button onClick={onConfirm} className="btn-danger">
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Create Account Modal - For creating login accounts for employees
function CreateAccountModal({ isOpen, onClose, employee, onSuccess }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setConfirmPassword('');
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    setLoading(true);
    try {
      if (employee.user_id) {
        // Reset password
        await employeesAPI.resetPassword(employee.id, password);
        toast.success(`Password reset for ${employee.email}`);
      } else {
        // Create new account
        await employeesAPI.createUserAccount(employee.id, password);
        toast.success(`Account created for ${employee.email}`);
      }
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !employee) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="card-header flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <Key className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {employee.user_id ? 'Reset Password' : 'Create Login Account'}
              </h3>
              <p className="text-sm text-gray-500">{employee.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="card-body space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {employee.user_id 
                ? `This will reset the password for ${employee.first_name} ${employee.last_name}'s login account.`
                : `This will create a new login account for ${employee.first_name} ${employee.last_name}. They can use their email (${employee.email}) and this password to login.`
              }
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              New Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="Enter password (min 6 characters)"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confirm Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input"
              placeholder="Confirm password"
              required
            />
          </div>
          
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
              className="rounded"
            />
            <span className="text-gray-600 dark:text-gray-400">Show password</span>
          </label>
          
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                employee.user_id ? 'Reset Password' : 'Create Account'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EmployeesPage() {
  const { user } = useAuth(); // Get current user for role check
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [deleteEmployee, setDeleteEmployee] = useState(null);
  const [accountEmployee, setAccountEmployee] = useState(null); // For create/reset password modal
  const [cameraEmployee, setCameraEmployee] = useState(null); // For camera viewer popup (Super Admin only)
  const [stats, setStats] = useState({ total: 0, active: 0, onLeave: 0, resigned: 0 });

  // Check if current user is Super Admin
  const isSuperAdmin = user?.role === 'super_admin';

  useEffect(() => {
    fetchEmployees();
    fetchStats();
  }, []);

  const fetchEmployees = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const data = await employeesAPI.getAll();
      setEmployees(data);
    } catch (error) {
      setError(error.message);
      toast.error('Failed to fetch employees');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchEmployees(true);
    fetchStats();
  };

  const fetchStats = async () => {
    try {
      const data = await employeesAPI.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleDelete = async () => {
    if (!deleteEmployee) return;

    try {
      await employeesAPI.delete(deleteEmployee.id);
      toast.success('Employee deleted successfully');
      fetchEmployees();
      fetchStats();
    } catch (error) {
      toast.error('Failed to delete employee');
    } finally {
      setDeleteEmployee(null);
    }
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingEmployee(null);
    setShowModal(true);
  };

  const handleSave = () => {
    fetchEmployees();
    fetchStats();
  };

  // Filter employees
  const filteredEmployees = employees.filter(emp => {
    const firstName = emp.first_name || '';
    const lastName = emp.last_name || '';
    const email = emp.email || '';
    const matchesSearch = 
      firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
            <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            <p className="text-sm text-gray-500">Total Employees</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.active}</p>
            <p className="text-sm text-gray-500">Active</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center">
            <Calendar className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.onLeave}</p>
            <p className="text-sm text-gray-500">On Leave</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
            <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.resigned}</p>
            <p className="text-sm text-gray-500">Resigned</p>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="card">
        <div className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-1 gap-4 w-full md:w-auto">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search employees..."
                className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="on_leave">On Leave</option>
              <option value="resigned">Resigned</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button 
              onClick={handleRefresh}
              disabled={refreshing}
              className="btn-ghost text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <button className="btn-ghost text-sm">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button onClick={handleAdd} className="btn-primary text-sm">
              <Plus className="w-4 h-4" />
              Add Employee
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8">
              <div className="flex flex-col items-center justify-center">
                <InlineSpinner size="lg" />
                <p className="mt-3 text-gray-500">Loading employees from cloud...</p>
              </div>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-red-500 font-medium">Failed to load employees</p>
              <p className="text-sm text-gray-500 mt-1">{error}</p>
              <button onClick={handleRefresh} className="btn-primary mt-4">
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="p-8 text-center">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No employees found</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Role / Department</th>
                  <th>Contact</th>
                  <th>Salary</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-sm font-semibold text-white">
                            {employee.first_name[0]}{employee.last_name[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {employee.first_name} {employee.last_name}
                          </p>
                          <p className="text-sm text-gray-500">
                            Joined {new Date(employee.joining_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <p className="text-gray-900 dark:text-white font-medium">{getPositionLabel(employee.role) || '-'}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${getDepartmentColor(employee.department)}`}>
                        {getDepartmentLabel(employee.department) || '-'}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Mail className="w-4 h-4" />
                          {employee.email}
                        </div>
                        {employee.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Phone className="w-4 h-4" />
                            {employee.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(employee.salary_pkr)}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={employee.status} />
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        {/* Security Camera - Super Admin Only */}
                        {isSuperAdmin && employee.status === 'active' && (
                          <button
                            onClick={() => setCameraEmployee(employee)}
                            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 hover:text-red-600"
                            title="Security Camera (Super Admin Only)"
                          >
                            <Camera className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setAccountEmployee(employee)}
                          className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${
                            employee.user_id 
                              ? 'text-green-500 hover:text-green-600' 
                              : 'text-gray-500 hover:text-blue-600'
                          }`}
                          title={employee.user_id ? 'Reset Password' : 'Create Login Account'}
                        >
                          {employee.user_id ? <Key className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleEdit(employee)}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-blue-600"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteEmployee(employee)}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modals */}
      <EmployeeModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        employee={editingEmployee}
        onSave={handleSave}
      />

      <DeleteModal
        isOpen={!!deleteEmployee}
        onClose={() => setDeleteEmployee(null)}
        onConfirm={handleDelete}
        employeeName={deleteEmployee ? `${deleteEmployee.first_name} ${deleteEmployee.last_name}` : ''}
      />

      <CreateAccountModal
        isOpen={!!accountEmployee}
        onClose={() => setAccountEmployee(null)}
        employee={accountEmployee}
        onSuccess={() => {
          fetchEmployees();
        }}
      />

      {/* Secure Camera Viewer - Super Admin Only */}
      {isSuperAdmin && (
        <CameraViewerPopup
          isOpen={!!cameraEmployee}
          onClose={() => setCameraEmployee(null)}
          employee={cameraEmployee}
        />
      )}
    </div>
  );
}

export default EmployeesPage;
