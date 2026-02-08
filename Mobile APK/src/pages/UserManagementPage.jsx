/**
 * Guardian Desktop ERP - User Management Page (Admin Only)
 * Allows admins to create and manage employee accounts
 */

import React, { useState, useEffect } from 'react';
import { 
  UserPlus, Search, Edit2, Trash2, Lock, Mail, User, Building2,
  Eye, EyeOff, X, Shield, Check, AlertCircle, RefreshCw
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { employeesAPI, usersAPI, authAPI } from '../services/api';
import { SYSTEM_ROLES, getSystemRoleLabel, getSystemRoleColor, getDepartmentLabel } from '../data/organizationConfig';
import toast from 'react-hot-toast';

function UserManagementPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [resetPasswordModal, setResetPasswordModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'employee',
    department: '',
    phone: '',
    linkToEmployee: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Get all users using Supabase API
      const usersData = await usersAPI.getAll();
      setUsers(usersData || []);

      // Get all employees for linking
      const employeesResult = await employeesAPI.getAll();
      if (employeesResult) {
        setEmployees(employeesResult);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!editingUser && !formData.password) {
      newErrors.password = 'Password is required';
    } else if (!editingUser && formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!formData.firstName) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName) {
      newErrors.lastName = 'Last name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (editingUser) {
        // Update existing user using Supabase API
        await usersAPI.update(editingUser.id, {
          role: formData.role,
          is_active: true,
        });
        
        toast.success('User updated successfully');
        loadData();
        closeModal();
      } else {
        // Create new user using Supabase API
        const result = await authAPI.register({
          email: formData.email,
          password: formData.password,
          role: formData.role,
        });

        if (result.success) {
          // If linking to employee, update the employee record
          if (formData.linkToEmployee) {
            await employeesAPI.update(formData.linkToEmployee, {
              user_id: result.data.id,
              email: formData.email,
            });
          }
          
          toast.success('Account created successfully');
          loadData();
          closeModal();
        } else {
          toast.error(result.error || 'Failed to create account');
        }
      }
    } catch (error) {
      toast.error(error.message || 'An error occurred');
      console.error(error);
    }
  };

  const handleDelete = async (userId) => {
    if (!confirm('Are you sure you want to delete this user account? This action cannot be undone.')) {
      return;
    }

    try {
      await usersAPI.delete(userId);
      toast.success('User deleted successfully');
      loadData();
    } catch (error) {
      toast.error(error.message || 'Failed to delete user');
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    try {
      await usersAPI.resetPassword(selectedUserId, newPassword);
      toast.success('Password reset successfully');
      setResetPasswordModal(false);
      setNewPassword('');
      setSelectedUserId(null);
    } catch (error) {
      toast.error(error.message || 'Failed to reset password');
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      role: 'employee',
      department: '',
      phone: '',
      linkToEmployee: '',
    });
    setErrors({});
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: '',
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      department: '',
      phone: '',
      linkToEmployee: '',
    });
    setErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      role: 'employee',
      department: '',
      phone: '',
      linkToEmployee: '',
    });
    setErrors({});
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeColor = (role) => {
    return getSystemRoleColor(role);
  };

  // Only admins can access this page
  if (user?.role !== 'admin' && user?.role !== 'super_admin') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            User Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Create and manage employee accounts
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="btn bg-guardian-600 hover:bg-guardian-700 text-white"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Create Account
        </button>
      </div>

      {/* Search Bar */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
          <button
            onClick={loadData}
            className="btn bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="w-8 h-8 border-4 border-guardian-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                            {u.first_name?.[0]}{u.last_name?.[0]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {u.first_name} {u.last_name}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              ID: {u.id?.slice(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-900 dark:text-white">
                        {u.email}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(u.role)}`}>
                          {getSystemRoleLabel(u.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(u)}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                            title="Edit user"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUserId(u.id);
                              setResetPasswordModal(true);
                            }}
                            className="p-2 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg"
                            title="Reset password"
                          >
                            <Lock className="w-4 h-4" />
                          </button>
                          {u.id !== user?.id && (
                            <button
                              onClick={() => handleDelete(u.id)}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                              title="Delete user"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingUser ? 'Edit User' : 'Create New Account'}
              </h3>
              <button
                onClick={closeModal}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className={`input w-full ${errors.firstName ? 'border-red-500' : ''}`}
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-xs text-red-500">{errors.firstName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className={`input w-full ${errors.lastName ? 'border-red-500' : ''}`}
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-xs text-red-500">{errors.lastName}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`input pl-10 w-full ${errors.email ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-xs text-red-500">{errors.email}</p>
                )}
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className={`input pl-10 pr-10 w-full ${errors.password ? 'border-red-500' : ''}`}
                      placeholder="Min. 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-xs text-red-500">{errors.password}</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  System Role
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="input w-full"
                >
                  {SYSTEM_ROLES.map(role => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>

              {!editingUser && employees.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Link to Employee (Optional)
                  </label>
                  <select
                    name="linkToEmployee"
                    value={formData.linkToEmployee}
                    onChange={handleChange}
                    className="input w-full"
                  >
                    <option value="">-- Don't link --</option>
                    {employees.filter(e => !e.user_id).map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} - {getDepartmentLabel(emp.department) || 'No department'}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Link this account to an existing employee record
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn bg-gray-200 hover:bg-gray-300 text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn bg-guardian-600 hover:bg-guardian-700 text-white"
                >
                  {editingUser ? 'Update User' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md shadow-2xl p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Reset Password
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Enter a new password for this user.
            </p>
            <div className="relative mb-4">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input pl-10 pr-10 w-full"
                placeholder="New password (min. 8 characters)"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setResetPasswordModal(false);
                  setNewPassword('');
                  setSelectedUserId(null);
                }}
                className="btn bg-gray-200 hover:bg-gray-300 text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                className="btn bg-yellow-500 hover:bg-yellow-600 text-white"
              >
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagementPage;
