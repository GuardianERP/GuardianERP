/**
 * Guardian Desktop ERP - My Profile Page
 * Allows employees to view their info and update profile/password
 */

import React, { useState, useEffect } from 'react';
import { 
  User, Mail, Phone, Building2, Calendar, Briefcase, DollarSign,
  Lock, Eye, EyeOff, Save, Clock, CheckSquare, History, Award
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { employeesAPI, tasksAPI, attendanceAPI, settingsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { getPositionLabel, getDepartmentLabel, getDepartmentColor } from '../data/organizationConfig';

function MyProfilePage() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);

  const [employeeData, setEmployeeData] = useState(null);
  const [taskHistory, setTaskHistory] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState(null);

  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      // Get employee data linked to this user
      const employeesResult = await employeesAPI.getAll();
      const myEmployee = employeesResult?.find(e => e.user_id === user?.id || e.email === user?.email);
      
      if (myEmployee) {
        setEmployeeData(myEmployee);
        setProfileData({
          firstName: myEmployee.first_name || user?.firstName || '',
          lastName: myEmployee.last_name || user?.lastName || '',
          phone: myEmployee.phone || '',
        });

        // Get task history
        const tasksResult = await tasksAPI.getAll({ assignedTo: myEmployee.id });
        if (tasksResult) {
          setTaskHistory(tasksResult.slice(0, 10)); // Last 10 tasks
        }

        // Get attendance stats
        const statsResult = await attendanceAPI.getStats({ 
          employeeId: myEmployee.id, 
          period: 'month' 
        });
        if (statsResult) {
          setAttendanceStats(statsResult);
        }
      } else {
        // User has no linked employee record
        setProfileData({
          firstName: user?.firstName || '',
          lastName: user?.lastName || '',
          phone: '',
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      // Update user settings
      await settingsAPI.update(user.id, {
        profile: {
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          phone: profileData.phone,
        }
      });

      // If linked to employee, update employee record
      if (employeeData) {
        await employeesAPI.update(employeeData.id, {
          first_name: profileData.firstName,
          last_name: profileData.lastName,
          phone: profileData.phone,
        });
      }

      // Update local user context
      updateUser({
        firstName: profileData.firstName,
        lastName: profileData.lastName,
      });

      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setSaving(true);
    try {
      await settingsAPI.changePassword(user.id, passwordData.currentPassword, passwordData.newPassword);
      toast.success('Password changed successfully');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      toast.error(error.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const tabs = [
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'tasks', label: 'Task History', icon: CheckSquare },
    { id: 'security', label: 'Security', icon: Lock },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-guardian-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-6">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
          {profileData.firstName?.[0]}{profileData.lastName?.[0]}
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {profileData.firstName} {profileData.lastName}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Briefcase className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600 dark:text-gray-400">
              {getPositionLabel(employeeData?.role) || user?.role || 'Employee'}
            </span>
          </div>
          {employeeData?.department && (
            <div className="flex items-center gap-2 mt-1">
              <Building2 className="w-4 h-4 text-gray-400" />
              <span className={`text-sm px-2 py-0.5 rounded ${getDepartmentColor(employeeData.department)}`}>
                {getDepartmentLabel(employeeData.department)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? 'border-guardian-600 text-guardian-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Edit Profile Card */}
          <div className="lg:col-span-2 card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Personal Information
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={profileData.firstName}
                    onChange={handleProfileChange}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={profileData.lastName}
                    onChange={handleProfileChange}
                    className="input w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={user?.email || employeeData?.email || ''}
                    className="input pl-10 w-full bg-gray-100 dark:bg-gray-700"
                    disabled
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Contact admin to change email</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    name="phone"
                    value={profileData.phone}
                    onChange={handleProfileChange}
                    className="input pl-10 w-full"
                    placeholder="+92 300 1234567"
                  />
                </div>
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="btn bg-guardian-600 hover:bg-guardian-700 text-white"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </button>
            </div>
          </div>

          {/* Info Cards */}
          <div className="space-y-4">
            {/* Employment Info */}
            {employeeData && (
              <div className="card p-4">
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase mb-3">
                  Employment Details
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Department</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {getDepartmentLabel(employeeData.department) || 'Not assigned'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Briefcase className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Position</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {getPositionLabel(employeeData.role) || 'Employee'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Joining Date</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {employeeData.joining_date 
                          ? new Date(employeeData.joining_date).toLocaleDateString()
                          : 'Not set'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Monthly Salary</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(employeeData.salary_pkr)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Attendance Summary */}
            {attendanceStats && (
              <div className="card p-4">
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase mb-3">
                  This Month's Attendance
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-600">{attendanceStats.presentDays || 0}</p>
                    <p className="text-xs text-green-700 dark:text-green-400">Present</p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-red-600">{attendanceStats.absentDays || 0}</p>
                    <p className="text-xs text-red-700 dark:text-red-400">Absent</p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">{attendanceStats.totalHours || 0}</p>
                    <p className="text-xs text-blue-700 dark:text-blue-400">Hours</p>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-yellow-600">{attendanceStats.lateDays || 0}</p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-400">Late</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Task History Tab */}
      {activeTab === 'tasks' && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Tasks
          </h2>
          {taskHistory.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No tasks assigned yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {taskHistory.map((task) => (
                <div 
                  key={task.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      task.status === 'completed' ? 'bg-green-500' :
                      task.status === 'in_progress' ? 'bg-blue-500' :
                      task.status === 'pending' ? 'bg-yellow-500' : 'bg-gray-400'
                    }`} />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{task.title}</p>
                      <p className="text-sm text-gray-500">
                        {task.due_date ? `Due: ${new Date(task.due_date).toLocaleDateString()}` : 'No due date'}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                    task.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                    task.status === 'in_progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                  }`}>
                    {task.status?.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="card p-6 max-w-lg">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Change Password
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Current Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  className="input pl-10 w-full"
                  placeholder="Enter current password"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  className="input pl-10 pr-10 w-full"
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
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  className="input pl-10 w-full"
                  placeholder="Confirm new password"
                />
              </div>
            </div>

            <button
              onClick={handleChangePassword}
              disabled={saving}
              className="btn bg-guardian-600 hover:bg-guardian-700 text-white"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              ) : (
                <Lock className="w-4 h-4 mr-2" />
              )}
              Change Password
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyProfilePage;
