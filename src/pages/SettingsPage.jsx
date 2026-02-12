/**
 * Guardian Desktop ERP - Settings Page
 * User profile and application settings
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  User, Mail, Phone, Lock, Camera, Bell, Moon, Globe, 
  Shield, Database, Download, Trash2, Save, Eye, EyeOff, Check,
  Key, Cpu, TestTube, RefreshCw, Send, Megaphone
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { useTheme } from '../store/ThemeContext';
import { settingsAPI, filesAPI, employeesAPI } from '../services/api';
import { appSettingsService, testGeminiConnection } from '../services/geminiService';
import notificationService from '../services/notificationService';
import toast from 'react-hot-toast';

function SettingsPage() {
  const { user, updateUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const avatarInputRef = useRef(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingApi, setTestingApi] = useState(false);

  // Check if user is admin
  const isAdmin = ['admin', 'super_admin', 'Admin', 'Super_Admin'].includes(user?.role);
  const isSuperAdmin = ['admin', 'super_admin', 'Admin', 'Super_Admin'].includes(user?.role);

  // System notification state
  const [releaseNotification, setReleaseNotification] = useState({
    version: '2.4.0',
    message: 'New features include: Complete Employee Profile Form, C-Class Executive Department, and Profile Picture Upload!'
  });
  const [sendingNotification, setSendingNotification] = useState(false);

  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    bio: '',
    avatar: ''
  });

  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const [notifications, setNotifications] = useState({
    email: true,
    desktop: true,
    tasks: true,
    messages: true,
    updates: false
  });

  const [preferences, setPreferences] = useState({
    language: 'en',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    startOfWeek: 'sunday'
  });

  // API Settings state
  const [apiSettings, setApiSettings] = useState({
    gemini_api_key: '',
    use_ai_parsing: true
  });

  useEffect(() => {
    loadSettings();
    loadApiSettings();
  }, []);

  const loadApiSettings = () => {
    const settings = appSettingsService.get();
    setApiSettings(settings);
  };

  const handleApiSettingsSave = () => {
    appSettingsService.save(apiSettings);
    toast.success('API Settings saved successfully!');
  };

  const handleTestApiConnection = async () => {
    setTestingApi(true);
    try {
      const result = await testGeminiConnection();
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.error || 'Connection failed');
      }
    } catch (error) {
      toast.error('Failed to test connection');
    } finally {
      setTestingApi(false);
    }
  };

  const loadSettings = async () => {
    try {
      const data = await settingsAPI.get(user?.id);
      if (data) {
        // Load profile from settings_json
        if (data.settings_json) {
          const json = typeof data.settings_json === 'string' 
            ? JSON.parse(data.settings_json) 
            : data.settings_json;
          if (json.profile) setProfile(p => ({ ...p, ...json.profile }));
          if (json.notifications) setNotifications(json.notifications);
          if (json.preferences) setPreferences(json.preferences);
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleProfileSave = async () => {
    setLoading(true);
    try {
      // Get existing settings_json first
      const existingData = await settingsAPI.get(user?.id);
      const existingJson = existingData?.settings_json 
        ? (typeof existingData.settings_json === 'string' 
            ? JSON.parse(existingData.settings_json) 
            : existingData.settings_json)
        : {};
      
      // Merge profile into settings_json
      const newSettingsJson = { ...existingJson, profile };
      
      await settingsAPI.update(user.id, { settings_json: newSettingsJson });
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Profile save error:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwords.new !== passwords.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwords.new.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await settingsAPI.changePassword(user.id, passwords.current, passwords.new);
      toast.success('Password changed successfully');
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (error) {
      toast.error(error.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }
    
    setLoading(true);
    try {
      let employeeId = user?.employeeId;
      
      // If employeeId not in user object, try to fetch it
      if (!employeeId && user?.id) {
        const employees = await employeesAPI.getAll();
        const myEmployee = employees.find(emp => emp.user_id === user.id);
        employeeId = myEmployee?.id;
      }
      
      if (!employeeId) {
        toast.error('Employee record not found. Please contact administrator.');
        return;
      }
      
      // Upload to Supabase storage
      const avatarUrl = await filesAPI.uploadProfilePicture(file, employeeId);
      
      // Update employee record with new avatar URL
      await employeesAPI.update(employeeId, { avatar_url: avatarUrl });
      
      setProfile(prev => ({ ...prev, avatar: avatarUrl }));
      toast.success('Profile picture updated');
    } catch (error) {
      toast.error('Failed to upload profile picture: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationsSave = async () => {
    setLoading(true);
    try {
      const existingData = await settingsAPI.get(user?.id);
      const existingJson = existingData?.settings_json 
        ? (typeof existingData.settings_json === 'string' 
            ? JSON.parse(existingData.settings_json) 
            : existingData.settings_json)
        : {};
      const newSettingsJson = { ...existingJson, notifications };
      await settingsAPI.update(user.id, { settings_json: newSettingsJson });
      toast.success('Notification settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handlePreferencesSave = async () => {
    setLoading(true);
    try {
      const existingData = await settingsAPI.get(user?.id);
      const existingJson = existingData?.settings_json 
        ? (typeof existingData.settings_json === 'string' 
            ? JSON.parse(existingData.settings_json) 
            : existingData.settings_json)
        : {};
      const newSettingsJson = { ...existingJson, preferences };
      await settingsAPI.update(user.id, { settings_json: newSettingsJson });
      toast.success('Preferences saved');
    } catch (error) {
      toast.error('Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    toast.success('Exporting your data...');
    // Implement data export
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      toast.error('Account deletion is disabled in demo mode');
    }
  };

  const baseTabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'preferences', label: 'Preferences', icon: Globe },
    { id: 'data', label: 'Data & Privacy', icon: Shield }
  ];

  // Add API Settings tab for admin users, and System tab for super admin
  let tabs = [...baseTabs];
  if (isAdmin) {
    tabs.push({ id: 'api', label: 'API Settings', icon: Key });
  }
  if (isSuperAdmin) {
    tabs.push({ id: 'system', label: 'System Admin', icon: Megaphone });
  }

  // Send app update notification to all employees
  const handleSendReleaseNotification = async () => {
    if (!releaseNotification.version.trim()) {
      toast.error('Please enter a version number');
      return;
    }
    
    setSendingNotification(true);
    try {
      const result = await notificationService.sendAppUpdateNotification(
        releaseNotification.version,
        releaseNotification.message
      );
      toast.success(`Notification sent to ${result.count} employees!`);
    } catch (error) {
      toast.error(error.message || 'Failed to send notification');
    } finally {
      setSendingNotification(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-500">Manage your account settings and preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <div className="card p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-guardian-100 text-guardian-700 dark:bg-guardian-900/30 dark:text-guardian-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="card p-6 space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Profile Information</h2>
              
              {/* Avatar */}
              <div className="flex items-center gap-6">
                <div className="relative">
                  {profile.avatar ? (
                    <img 
                      src={profile.avatar} 
                      alt="Profile" 
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-guardian-400 to-guardian-600 flex items-center justify-center text-white text-3xl font-bold">
                      {profile.name?.charAt(0) || 'U'}
                    </div>
                  )}
                  <button 
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={loading}
                    className="absolute bottom-0 right-0 w-8 h-8 bg-guardian-600 text-white rounded-full flex items-center justify-center hover:bg-guardian-700 transition-colors disabled:opacity-50"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{profile.name}</p>
                  <p className="text-sm text-gray-500">{profile.email}</p>
                </div>
              </div>

              {/* Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="input w-full pl-10"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="input w-full pl-10"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className="input w-full pl-10"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Bio
                </label>
                <textarea
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  className="input w-full"
                  rows={3}
                  placeholder="Tell us about yourself..."
                />
              </div>
              <div className="flex justify-end">
                <button onClick={handleProfileSave} disabled={loading} className="btn btn-primary">
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="card p-6 space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Change Password</h2>
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Current Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwords.current}
                      onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                      className="input w-full pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    New Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwords.new}
                    onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwords.confirm}
                    onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                    className="input w-full"
                  />
                </div>
                <button onClick={handlePasswordChange} disabled={loading} className="btn btn-primary">
                  <Lock className="w-4 h-4 mr-2" />
                  Update Password
                </button>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="card p-6 space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notification Settings</h2>
              <div className="space-y-4">
                {[
                  { key: 'email', label: 'Email Notifications', desc: 'Receive notifications via email' },
                  { key: 'desktop', label: 'Desktop Notifications', desc: 'Show desktop push notifications' },
                  { key: 'tasks', label: 'Task Updates', desc: 'Notify when tasks are assigned or updated' },
                  { key: 'messages', label: 'New Messages', desc: 'Notify when you receive new messages' },
                  { key: 'updates', label: 'Product Updates', desc: 'Receive updates about new features' }
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{item.label}</p>
                      <p className="text-sm text-gray-500">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => setNotifications({ ...notifications, [item.key]: !notifications[item.key] })}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        notifications[item.key] ? 'bg-guardian-600' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        notifications[item.key] ? 'left-7' : 'left-1'
                      }`} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <button onClick={handleNotificationsSave} disabled={loading} className="btn btn-primary">
                  <Save className="w-4 h-4 mr-2" />
                  Save Settings
                </button>
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="card p-6 space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Preferences</h2>
              
              {/* Theme */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Moon className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Dark Mode</p>
                    <p className="text-sm text-gray-500">Toggle dark/light theme</p>
                  </div>
                </div>
                <button
                  onClick={toggleTheme}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    theme === 'dark' ? 'bg-guardian-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    theme === 'dark' ? 'left-7' : 'left-1'
                  }`} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Language
                  </label>
                  <select
                    value={preferences.language}
                    onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                    className="input w-full"
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date Format
                  </label>
                  <select
                    value={preferences.dateFormat}
                    onChange={(e) => setPreferences({ ...preferences, dateFormat: e.target.value })}
                    className="input w-full"
                  >
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Time Format
                  </label>
                  <select
                    value={preferences.timeFormat}
                    onChange={(e) => setPreferences({ ...preferences, timeFormat: e.target.value })}
                    className="input w-full"
                  >
                    <option value="12h">12 Hour</option>
                    <option value="24h">24 Hour</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start of Week
                  </label>
                  <select
                    value={preferences.startOfWeek}
                    onChange={(e) => setPreferences({ ...preferences, startOfWeek: e.target.value })}
                    className="input w-full"
                  >
                    <option value="sunday">Sunday</option>
                    <option value="monday">Monday</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={handlePreferencesSave} disabled={loading} className="btn btn-primary">
                  <Save className="w-4 h-4 mr-2" />
                  Save Preferences
                </button>
              </div>
            </div>
          )}

          {/* Data & Privacy Tab */}
          {activeTab === 'data' && (
            <div className="card p-6 space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Data & Privacy</h2>
              
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Database className="w-5 h-5 text-blue-600" />
                  <p className="font-medium text-gray-900 dark:text-white">Export Your Data</p>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  Download a copy of all your data including tasks, time entries, and settings.
                </p>
                <button onClick={handleExportData} className="btn btn-ghost">
                  <Download className="w-4 h-4 mr-2" />
                  Export Data
                </button>
              </div>

              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-3 mb-3">
                  <Trash2 className="w-5 h-5 text-red-600" />
                  <p className="font-medium text-red-700 dark:text-red-400">Delete Account</p>
                </div>
                <p className="text-sm text-red-600 dark:text-red-400 mb-4">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <button onClick={handleDeleteAccount} className="btn bg-red-600 hover:bg-red-700 text-white">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Account
                </button>
              </div>
            </div>
          )}

          {/* API Settings Tab (Admin Only) */}
          {activeTab === 'api' && isAdmin && (
            <div className="card p-6 space-y-6">
              <div className="flex items-center gap-3">
                <Cpu className="w-6 h-6 text-purple-600" />
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">API Settings</h2>
                  <p className="text-sm text-gray-500">Manage AI and external service API keys</p>
                </div>
              </div>
              
              {/* Google Gemini API */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">G</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Google Gemini AI</p>
                    <p className="text-xs text-gray-500">Used for intelligent PDF parsing in VOB/BOB Auto-Fill</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      API Key
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          value={apiSettings.gemini_api_key}
                          onChange={(e) => setApiSettings({ ...apiSettings, gemini_api_key: e.target.value })}
                          placeholder="Enter your Gemini API key"
                          className="input w-full pr-10 font-mono text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <button 
                        onClick={handleTestApiConnection}
                        disabled={testingApi}
                        className="btn btn-ghost flex items-center gap-2"
                      >
                        {testingApi ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <TestTube className="w-4 h-4" />
                        )}
                        Test
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Get your API key from{' '}
                      <a 
                        href="https://aistudio.google.com/app/apikey" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Google AI Studio
                      </a>
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Use AI for PDF Parsing</p>
                      <p className="text-xs text-gray-500">Enable intelligent extraction from VOB/BOB PDFs</p>
                    </div>
                    <button
                      onClick={() => setApiSettings({ ...apiSettings, use_ai_parsing: !apiSettings.use_ai_parsing })}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        apiSettings.use_ai_parsing ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                          apiSettings.use_ai_parsing ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Info Box */}
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800 dark:text-yellow-200">Security Note</p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      API keys are stored locally on this device. They are not shared with any server.
                      All users on this device will use these API settings.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button onClick={handleApiSettingsSave} className="btn btn-primary">
                  <Save className="w-4 h-4 mr-2" />
                  Save API Settings
                </button>
              </div>
            </div>
          )}

          {/* System Admin Tab (Super Admin Only) */}
          {activeTab === 'system' && isSuperAdmin && (
            <div className="card p-6 space-y-6">
              <div className="flex items-center gap-3">
                <Megaphone className="w-6 h-6 text-blue-600" />
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">System Administration</h2>
                  <p className="text-sm text-gray-500">Send announcements and manage system-wide settings</p>
                </div>
              </div>
              
              {/* Send Release Notification */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-green-500 rounded-lg flex items-center justify-center">
                    <Send className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Send App Update Notification</p>
                    <p className="text-xs text-gray-500">Notify all employees about a new version release</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Version Number
                    </label>
                    <input
                      type="text"
                      value={releaseNotification.version}
                      onChange={(e) => setReleaseNotification({ ...releaseNotification, version: e.target.value })}
                      placeholder="e.g., 2.4.0"
                      className="input w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Release Notes (Optional)
                    </label>
                    <textarea
                      value={releaseNotification.message}
                      onChange={(e) => setReleaseNotification({ ...releaseNotification, message: e.target.value })}
                      placeholder="Describe what's new in this version..."
                      rows={3}
                      className="input w-full"
                    />
                  </div>
                  
                  <button 
                    onClick={handleSendReleaseNotification}
                    disabled={sendingNotification}
                    className="btn btn-primary w-full"
                  >
                    {sendingNotification ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send Notification to All Employees
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Info Box */}
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
                <div className="flex items-start gap-3">
                  <Bell className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800 dark:text-yellow-200">Notification Info</p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      This will send a pop-up notification to all employees who have login accounts. 
                      The notification will appear in their notification inbox and as a real-time alert.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
