/**
 * Guardian Desktop ERP - Role Management Page
 * Admin page for managing roles and permissions
 */

import React, { useState, useEffect } from 'react';
import { 
  Shield, Plus, Edit2, Trash2, Users, Check, X, 
  Search, ChevronDown, ChevronRight, Save, AlertTriangle
} from 'lucide-react';
import { usePermission, ROLES, PERMISSIONS } from '../hooks/usePermission';
import { FeatureGate } from '../components/PermissionGate';

// Group permissions by resource
const PERMISSION_GROUPS = {
  employees: {
    name: 'Employees',
    permissions: [
      { key: PERMISSIONS.EMPLOYEES_CREATE, label: 'Create' },
      { key: PERMISSIONS.EMPLOYEES_READ, label: 'Read' },
      { key: PERMISSIONS.EMPLOYEES_UPDATE, label: 'Update' },
      { key: PERMISSIONS.EMPLOYEES_DELETE, label: 'Delete' },
    ],
  },
  tasks: {
    name: 'Tasks',
    permissions: [
      { key: PERMISSIONS.TASKS_CREATE, label: 'Create' },
      { key: PERMISSIONS.TASKS_READ, label: 'Read' },
      { key: PERMISSIONS.TASKS_UPDATE, label: 'Update' },
      { key: PERMISSIONS.TASKS_DELETE, label: 'Delete' },
      { key: PERMISSIONS.TASKS_ASSIGN, label: 'Assign' },
    ],
  },
  leaves: {
    name: 'Leaves',
    permissions: [
      { key: PERMISSIONS.LEAVES_CREATE, label: 'Create' },
      { key: PERMISSIONS.LEAVES_READ, label: 'Read' },
      { key: PERMISSIONS.LEAVES_UPDATE, label: 'Update' },
      { key: PERMISSIONS.LEAVES_DELETE, label: 'Delete' },
      { key: PERMISSIONS.LEAVES_APPROVE, label: 'Approve' },
    ],
  },
  expenses: {
    name: 'Expenses',
    permissions: [
      { key: PERMISSIONS.EXPENSES_CREATE, label: 'Create' },
      { key: PERMISSIONS.EXPENSES_READ, label: 'Read' },
      { key: PERMISSIONS.EXPENSES_UPDATE, label: 'Update' },
      { key: PERMISSIONS.EXPENSES_DELETE, label: 'Delete' },
      { key: PERMISSIONS.EXPENSES_APPROVE, label: 'Approve' },
    ],
  },
  revenue: {
    name: 'Revenue',
    permissions: [
      { key: PERMISSIONS.REVENUE_CREATE, label: 'Create' },
      { key: PERMISSIONS.REVENUE_READ, label: 'Read' },
      { key: PERMISSIONS.REVENUE_UPDATE, label: 'Update' },
      { key: PERMISSIONS.REVENUE_DELETE, label: 'Delete' },
    ],
  },
  reports: {
    name: 'Reports',
    permissions: [
      { key: PERMISSIONS.REPORTS_READ, label: 'Read' },
      { key: PERMISSIONS.REPORTS_GENERATE, label: 'Generate' },
      { key: PERMISSIONS.REPORTS_EXPORT, label: 'Export' },
    ],
  },
  time: {
    name: 'Time Tracking',
    permissions: [
      { key: PERMISSIONS.TIME_CREATE, label: 'Create' },
      { key: PERMISSIONS.TIME_READ, label: 'Read' },
      { key: PERMISSIONS.TIME_UPDATE, label: 'Update' },
      { key: PERMISSIONS.TIME_DELETE, label: 'Delete' },
    ],
  },
  chat: {
    name: 'Chat',
    permissions: [
      { key: PERMISSIONS.CHAT_READ, label: 'Read' },
      { key: PERMISSIONS.CHAT_SEND, label: 'Send' },
      { key: PERMISSIONS.CHAT_DELETE, label: 'Delete' },
    ],
  },
  files: {
    name: 'Files',
    permissions: [
      { key: PERMISSIONS.FILES_UPLOAD, label: 'Upload' },
      { key: PERMISSIONS.FILES_READ, label: 'Read' },
      { key: PERMISSIONS.FILES_DELETE, label: 'Delete' },
    ],
  },
  admin: {
    name: 'Administration',
    permissions: [
      { key: PERMISSIONS.ADMIN_USERS, label: 'Manage Users' },
      { key: PERMISSIONS.ADMIN_ROLES, label: 'Manage Roles' },
      { key: PERMISSIONS.ADMIN_SETTINGS, label: 'System Settings' },
      { key: PERMISSIONS.ADMIN_LOGS, label: 'View Logs' },
    ],
  },
};

function RoleManagementPage() {
  const { isAdmin } = usePermission();
  const [roles, setRoles] = useState(Object.entries(ROLES).map(([key, value]) => ({
    id: key,
    ...value,
    isDefault: true,
  })));
  const [selectedRole, setSelectedRole] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState(Object.keys(PERMISSION_GROUPS));
  const [editingRole, setEditingRole] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  // Filter roles based on search
  const filteredRoles = roles.filter(role => {
    const name = role.name || '';
    const description = role.description || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           description.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const toggleGroup = (group) => {
    setExpandedGroups(prev => 
      prev.includes(group) 
        ? prev.filter(g => g !== group)
        : [...prev, group]
    );
  };

  const handleEditRole = (role) => {
    setEditingRole({
      ...role,
      permissions: [...role.permissions],
    });
    setIsEditing(true);
  };

  const handleCreateRole = () => {
    setEditingRole({
      id: `custom_${Date.now()}`,
      name: '',
      description: '',
      permissions: [],
      isDefault: false,
    });
    setIsEditing(true);
  };

  const handleSaveRole = () => {
    if (!editingRole.name.trim()) {
      alert('Role name is required');
      return;
    }

    setRoles(prev => {
      const existing = prev.find(r => r.id === editingRole.id);
      if (existing) {
        return prev.map(r => r.id === editingRole.id ? editingRole : r);
      }
      return [...prev, editingRole];
    });

    setIsEditing(false);
    setEditingRole(null);
  };

  const handleDeleteRole = (roleId) => {
    const role = roles.find(r => r.id === roleId);
    if (role?.isDefault) {
      alert('Cannot delete default roles');
      return;
    }
    setRoles(prev => prev.filter(r => r.id !== roleId));
    setShowDeleteConfirm(null);
  };

  const togglePermission = (permission) => {
    if (!editingRole) return;
    
    setEditingRole(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const toggleAllInGroup = (groupKey) => {
    if (!editingRole) return;
    
    const group = PERMISSION_GROUPS[groupKey];
    const groupPermissions = group.permissions.map(p => p.key);
    const allSelected = groupPermissions.every(p => editingRole.permissions.includes(p));
    
    setEditingRole(prev => ({
      ...prev,
      permissions: allSelected
        ? prev.permissions.filter(p => !groupPermissions.includes(p))
        : [...new Set([...prev.permissions, ...groupPermissions])],
    }));
  };

  return (
    <FeatureGate permission={PERMISSIONS.ADMIN_ROLES}>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Role Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage user roles and permissions
            </p>
          </div>
          <button
            onClick={handleCreateRole}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Role
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Roles List */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm">
              {/* Search */}
              <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search roles..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-slate-700 border-0 rounded-lg text-gray-900 dark:text-white placeholder-gray-500"
                  />
                </div>
              </div>

              {/* Roles */}
              <div className="divide-y divide-gray-200 dark:divide-slate-700">
                {filteredRoles.map(role => (
                  <div
                    key={role.id}
                    onClick={() => setSelectedRole(role)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors ${
                      selectedRole?.id === role.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          role.id === 'super_admin' ? 'bg-purple-100 dark:bg-purple-900/30' :
                          role.id === 'admin' ? 'bg-red-100 dark:bg-red-900/30' :
                          role.id === 'manager' ? 'bg-blue-100 dark:bg-blue-900/30' :
                          'bg-gray-100 dark:bg-gray-700'
                        }`}>
                          <Shield className={`w-5 h-5 ${
                            role.id === 'super_admin' ? 'text-purple-600' :
                            role.id === 'admin' ? 'text-red-600' :
                            role.id === 'manager' ? 'text-blue-600' :
                            'text-gray-600 dark:text-gray-400'
                          }`} />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {role.name}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {role.permissions.length} permissions
                          </p>
                        </div>
                      </div>
                      {role.isDefault && (
                        <span className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                          Default
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Role Details / Editor */}
          <div className="lg:col-span-2">
            {isEditing && editingRole ? (
              /* Role Editor */
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {editingRole.isDefault ? 'View Role' : (editingRole.name ? 'Edit Role' : 'Create Role')}
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setIsEditing(false); setEditingRole(null); }}
                      className="px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
                    >
                      Cancel
                    </button>
                    {!editingRole.isDefault && (
                      <button
                        onClick={handleSaveRole}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        <Save className="w-4 h-4" />
                        Save
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  {/* Role Name & Description */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Role Name
                      </label>
                      <input
                        type="text"
                        value={editingRole.name}
                        onChange={(e) => setEditingRole(prev => ({ ...prev, name: e.target.value }))}
                        disabled={editingRole.isDefault}
                        className="w-full px-3 py-2 bg-gray-100 dark:bg-slate-700 border-0 rounded-lg text-gray-900 dark:text-white disabled:opacity-60"
                        placeholder="Enter role name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={editingRole.description}
                        onChange={(e) => setEditingRole(prev => ({ ...prev, description: e.target.value }))}
                        disabled={editingRole.isDefault}
                        className="w-full px-3 py-2 bg-gray-100 dark:bg-slate-700 border-0 rounded-lg text-gray-900 dark:text-white disabled:opacity-60"
                        placeholder="Enter description"
                      />
                    </div>
                  </div>

                  {/* Permissions */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Permissions
                    </h3>
                    <div className="space-y-2">
                      {Object.entries(PERMISSION_GROUPS).map(([groupKey, group]) => (
                        <div key={groupKey} className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
                          <button
                            onClick={() => toggleGroup(groupKey)}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              {expandedGroups.includes(groupKey) ? (
                                <ChevronDown className="w-4 h-4 text-gray-500" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-500" />
                              )}
                              <span className="font-medium text-gray-900 dark:text-white">
                                {group.name}
                              </span>
                            </div>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {group.permissions.filter(p => editingRole.permissions.includes(p.key)).length}/{group.permissions.length}
                            </span>
                          </button>
                          
                          {expandedGroups.includes(groupKey) && (
                            <div className="p-4 space-y-2">
                              {!editingRole.isDefault && (
                                <button
                                  onClick={() => toggleAllInGroup(groupKey)}
                                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2"
                                >
                                  {group.permissions.every(p => editingRole.permissions.includes(p.key)) 
                                    ? 'Deselect All' 
                                    : 'Select All'}
                                </button>
                              )}
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {group.permissions.map(permission => (
                                  <label
                                    key={permission.key}
                                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer ${
                                      editingRole.permissions.includes(permission.key)
                                        ? 'bg-blue-50 dark:bg-blue-900/20'
                                        : 'hover:bg-gray-50 dark:hover:bg-slate-600'
                                    } ${editingRole.isDefault ? 'cursor-default' : ''}`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={editingRole.permissions.includes(permission.key)}
                                      onChange={() => togglePermission(permission.key)}
                                      disabled={editingRole.isDefault}
                                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                      {permission.label}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : selectedRole ? (
              /* Role Details View */
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="w-6 h-6 text-blue-600" />
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {selectedRole.name}
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {selectedRole.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditRole(selectedRole)}
                      className="flex items-center gap-2 px-3 py-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                      {selectedRole.isDefault ? 'View' : 'Edit'}
                    </button>
                    {!selectedRole.isDefault && (
                      <button
                        onClick={() => setShowDeleteConfirm(selectedRole.id)}
                        className="flex items-center gap-2 px-3 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-4">
                    Permissions ({selectedRole.permissions.length})
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(PERMISSION_GROUPS).map(([groupKey, group]) => {
                      const activePermissions = group.permissions.filter(p => 
                        selectedRole.permissions.includes(p.key)
                      );
                      if (activePermissions.length === 0) return null;
                      
                      return (
                        <div key={groupKey}>
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {group.name}
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {activePermissions.map(permission => (
                              <span
                                key={permission.key}
                                className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm rounded-lg"
                              >
                                {permission.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* Empty State */
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm h-full flex items-center justify-center p-8">
                <div className="text-center">
                  <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Select a Role
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Click on a role to view its permissions
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Delete Role
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to delete this role? Users with this role will need to be reassigned.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteRole(showDeleteConfirm)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </FeatureGate>
  );
}

export default RoleManagementPage;
