/**
 * Guardian Desktop ERP - Preload Script
 * Secure bridge between Electron main process and React renderer
 * Uses contextBridge to expose safe IPC methods
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // ============================================
  // Authentication
  // ============================================
  auth: {
    login: (email, password) => ipcRenderer.invoke('auth:login', { email, password }),
    register: (userData) => ipcRenderer.invoke('auth:register', userData),
    verify: (token) => ipcRenderer.invoke('auth:verify', token),
  },

  // ============================================
  // Credentials (Secure Storage)
  // ============================================
  credentials: {
    store: (email, password) => ipcRenderer.invoke('credentials:store', { email, password }),
    get: () => ipcRenderer.invoke('credentials:get'),
    clear: () => ipcRenderer.invoke('credentials:clear'),
  },

  // ============================================
  // App Control
  // ============================================
  app: {
    isAutoStart: () => ipcRenderer.invoke('app:isAutoStart'),
    setAutoStart: (enable) => ipcRenderer.invoke('app:setAutoStart', enable),
    getAutoStartStatus: () => ipcRenderer.invoke('app:getAutoStartStatus'),
  },

  // ============================================
  // Employees
  // ============================================
  employees: {
    getAll: (filters) => ipcRenderer.invoke('employees:getAll', filters),
    getById: (id) => ipcRenderer.invoke('employees:getById', id),
    create: (data) => ipcRenderer.invoke('employees:create', data),
    update: (id, data) => ipcRenderer.invoke('employees:update', { id, data }),
    delete: (id) => ipcRenderer.invoke('employees:delete', id),
    getStats: () => ipcRenderer.invoke('employees:getStats'),
  },

  // ============================================
  // Attendance
  // ============================================
  attendance: {
    clockIn: (employeeId) => ipcRenderer.invoke('attendance:clockIn', employeeId),
    clockOut: (employeeId) => ipcRenderer.invoke('attendance:clockOut', employeeId),
    getStatus: (employeeId) => ipcRenderer.invoke('attendance:getStatus', employeeId),
    getRecords: (employeeId, startDate, endDate) => 
      ipcRenderer.invoke('attendance:getRecords', { employeeId, startDate, endDate }),
    getStats: (employeeId, period) => 
      ipcRenderer.invoke('attendance:getStats', { employeeId, period }),
  },

  // ============================================
  // Tasks
  // ============================================
  tasks: {
    getAll: (filters) => ipcRenderer.invoke('tasks:getAll', filters),
    getById: (id) => ipcRenderer.invoke('tasks:getById', id),
    create: (data) => ipcRenderer.invoke('tasks:create', data),
    update: (id, data) => ipcRenderer.invoke('tasks:update', { id, data }),
    delete: (id) => ipcRenderer.invoke('tasks:delete', id),
    updateStatus: (id, status) => ipcRenderer.invoke('tasks:updateStatus', { id, status }),
  },

  // ============================================
  // Leaves
  // ============================================
  leaves: {
    getAll: (filters) => ipcRenderer.invoke('leaves:getAll', filters),
    create: (data) => ipcRenderer.invoke('leaves:create', data),
    approve: (id, approverId) => ipcRenderer.invoke('leaves:approve', { id, approverId }),
    reject: (id, approverId, reason) => 
      ipcRenderer.invoke('leaves:reject', { id, approverId, reason }),
    getBalance: (employeeId) => ipcRenderer.invoke('leaves:getBalance', employeeId),
  },

  // ============================================
  // Expenses
  // ============================================
  expenses: {
    getAll: (filters) => ipcRenderer.invoke('expenses:getAll', filters),
    getById: (id) => ipcRenderer.invoke('expenses:getById', id),
    create: (data) => ipcRenderer.invoke('expenses:create', data),
    update: (id, data) => ipcRenderer.invoke('expenses:update', { id, data }),
    delete: (id) => ipcRenderer.invoke('expenses:delete', id),
    approve: (id, approverId) => ipcRenderer.invoke('expenses:approve', { id, approverId }),
    reject: (id, approverId, reason) => 
      ipcRenderer.invoke('expenses:reject', { id, approverId, reason }),
    getStats: (employeeId, period) => 
      ipcRenderer.invoke('expenses:getStats', { employeeId, period }),
  },

  // ============================================
  // Revenue
  // ============================================
  revenue: {
    getAll: (filters) => ipcRenderer.invoke('revenue:getAll', filters),
    getById: (id) => ipcRenderer.invoke('revenue:getById', id),
    create: (data) => ipcRenderer.invoke('revenue:create', data),
    update: (id, data) => ipcRenderer.invoke('revenue:update', { id, data }),
    delete: (id) => ipcRenderer.invoke('revenue:delete', id),
    getStats: (period) => ipcRenderer.invoke('revenue:getStats', period),
  },

  // ============================================
  // Reports
  // ============================================
  reports: {
    generate: (type, filters) => ipcRenderer.invoke('reports:generate', { type, filters }),
    getOverview: () => ipcRenderer.invoke('reports:getOverview'),
  },

  // ============================================
  // Chat/Messages
  // ============================================
  chat: {
    getConversations: (userId) => ipcRenderer.invoke('chat:getConversations', userId),
    getMessages: (conversationId, limit, offset) => 
      ipcRenderer.invoke('chat:getMessages', { conversationId, limit, offset }),
    sendMessage: (data) => ipcRenderer.invoke('chat:sendMessage', data),
    createConversation: (participantIds, name, type) => 
      ipcRenderer.invoke('chat:createConversation', { participantIds, name, type }),
    onNewMessage: (callback) => {
      ipcRenderer.on('chat:newMessage', (event, message) => callback(message));
    },
    removeNewMessageListener: () => {
      ipcRenderer.removeAllListeners('chat:newMessage');
    },
  },

  // ============================================
  // Notifications
  // ============================================
  notifications: {
    getAll: (userId, filters) => ipcRenderer.invoke('notifications:getAll', { userId, filters }),
    markRead: (id) => ipcRenderer.invoke('notifications:markRead', id),
    markAllRead: (userId) => ipcRenderer.invoke('notifications:markAllRead', userId),
    delete: (id) => ipcRenderer.invoke('notifications:delete', id),
    show: (title, body, icon) => ipcRenderer.invoke('notifications:show', { title, body, icon }),
  },

  // ============================================
  // Settings
  // ============================================
  settings: {
    get: (userId) => ipcRenderer.invoke('settings:get', userId),
    update: (userId, settings) => ipcRenderer.invoke('settings:update', { userId, settings }),
    changePassword: (userId, currentPassword, newPassword) => 
      ipcRenderer.invoke('settings:changePassword', { userId, currentPassword, newPassword }),
  },

  // ============================================
  // Files
  // ============================================
  files: {
    upload: (fileName, fileData, folder) => 
      ipcRenderer.invoke('files:upload', { fileName, fileData, folder }),
    getAll: (filters) => ipcRenderer.invoke('files:getAll', filters),
    delete: (id) => ipcRenderer.invoke('files:delete', id),
    openDialog: (options) => ipcRenderer.invoke('files:openDialog', options),
    saveDialog: (options) => ipcRenderer.invoke('files:saveDialog', options),
  },

  // ============================================
  // Export
  // ============================================
  export: {
    save: (data, fileName, type) => 
      ipcRenderer.invoke('export:save', { data, fileName, type }),
  },

  // ============================================
  // System
  // ============================================
  system: {
    getAppInfo: () => ipcRenderer.invoke('system:getAppInfo'),
    openExternal: (url) => ipcRenderer.invoke('system:openExternal', url),
  },

  // ============================================
  // VOB Custom Fields
  // ============================================
  vobCustomFields: {
    getAll: () => ipcRenderer.invoke('vobCustomFields:getAll'),
    getBySection: (section) => ipcRenderer.invoke('vobCustomFields:getBySection', section),
    create: (fieldData) => ipcRenderer.invoke('vobCustomFields:create', fieldData),
    delete: (id) => ipcRenderer.invoke('vobCustomFields:delete', id),
  },

  // ============================================
  // Users (Admin Only)
  // ============================================
  users: {
    getAll: () => ipcRenderer.invoke('users:getAll'),
    getById: (id) => ipcRenderer.invoke('users:getById', id),
    update: (payload) => ipcRenderer.invoke('users:update', payload),
    delete: (id) => ipcRenderer.invoke('users:delete', id),
    resetPassword: (payload) => ipcRenderer.invoke('users:resetPassword', payload),
  },

  // ============================================
  // Screen Capture (for monitoring)
  // ============================================
  screen: {
    getSources: () => ipcRenderer.invoke('screen:getSources'),
    getPrimarySource: () => ipcRenderer.invoke('screen:getPrimarySource'),
  },
});

// Log that preload script has loaded
console.log('Guardian Desktop ERP - Preload script loaded');
