/**
 * Guardian Desktop ERP - Electron Main Process
 * Handles window management, IPC communication, and native OS integration
 */

const { app, BrowserWindow, ipcMain, Notification, shell, dialog, session, desktopCapturer, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const { initAutoUpdater } = require('./updater');

// Database and Auth utilities
let db = null;
let sqlJsDb = null;
let authUtils = null;

// App data directory
const APP_DATA_DIR = path.join(app.getPath('userData'), 'guardian-desktop');
const DB_PATH = path.join(APP_DATA_DIR, 'app.db');
const DOCUMENTS_DIR = path.join(APP_DATA_DIR, 'documents');
const EXPORTS_DIR = path.join(APP_DATA_DIR, 'exports');
const CREDENTIALS_PATH = path.join(APP_DATA_DIR, 'credentials.enc');

// Check if app was started with --autostart flag
const isAutoStart = process.argv.includes('--autostart');

// Create directories if they don't exist
function ensureDirectories() {
  const dirs = [APP_DATA_DIR, DOCUMENTS_DIR, EXPORTS_DIR];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

/**
 * Configure auto-start on Windows startup
 */
function configureAutoStart(enable) {
  if (process.platform !== 'win32') return;
  
  app.setLoginItemSettings({
    openAtLogin: enable,
    path: app.getPath('exe'),
    args: ['--autostart']
  });
  
  console.log(`Auto-start ${enable ? 'enabled' : 'disabled'}`);
}

/**
 * Store credentials securely using Electron's safeStorage
 */
function storeCredentials(email, password) {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      console.warn('Encryption not available on this system');
      return false;
    }
    
    const credentials = JSON.stringify({ email, password });
    const encrypted = safeStorage.encryptString(credentials);
    fs.writeFileSync(CREDENTIALS_PATH, encrypted);
    console.log('Credentials stored securely');
    return true;
  } catch (error) {
    console.error('Failed to store credentials:', error);
    return false;
  }
}

/**
 * Retrieve stored credentials
 */
function getStoredCredentials() {
  try {
    if (!fs.existsSync(CREDENTIALS_PATH)) {
      return null;
    }
    
    if (!safeStorage.isEncryptionAvailable()) {
      console.warn('Encryption not available on this system');
      return null;
    }
    
    const encrypted = fs.readFileSync(CREDENTIALS_PATH);
    const decrypted = safeStorage.decryptString(encrypted);
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Failed to retrieve credentials:', error);
    return null;
  }
}

/**
 * Clear stored credentials
 */
function clearStoredCredentials() {
  try {
    if (fs.existsSync(CREDENTIALS_PATH)) {
      fs.unlinkSync(CREDENTIALS_PATH);
      console.log('Credentials cleared');
    }
    return true;
  } catch (error) {
    console.error('Failed to clear credentials:', error);
    return false;
  }
}

// Save database to file
function saveDatabase() {
  if (sqlJsDb) {
    try {
      const data = sqlJsDb.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(DB_PATH, buffer);
      console.log('Database saved to disk');
    } catch (err) {
      console.error('Error saving database:', err);
    }
  }
}

// Main window reference
let mainWindow = null;

// Check if running in development
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

/**
 * Create the main application window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Guardian Desktop ERP',
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false, // Allow cross-origin requests to Supabase
    },
    show: false,
    backgroundColor: '#0f172a',
    titleBarStyle: 'default',
    autoHideMenuBar: false,
  });

  // Remove Content-Security-Policy headers that block Supabase
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ['']
      }
    });
  });

  // Grant permissions for camera, microphone, and screen capture
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'mediaKeySystem', 'geolocation', 'notifications', 'fullscreen', 'pointerLock'];
    if (allowedPermissions.includes(permission)) {
      console.log(`[Permission] Granted: ${permission}`);
      callback(true);
    } else {
      console.log(`[Permission] Denied: ${permission}`);
      callback(false);
    }
  });

  // Also handle permission check (for some Electron versions)
  session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    const allowedPermissions = ['media', 'mediaKeySystem', 'geolocation', 'notifications', 'fullscreen', 'pointerLock'];
    return allowedPermissions.includes(permission);
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
    // Initialize auto-updater in production
    if (!isDev) {
      initAutoUpdater(mainWindow);
    }
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:8888');
  } else {
    // In production, load from the app's root dist folder
    const indexPath = path.join(app.getAppPath(), 'dist', 'index.html');
    console.log('Loading from:', indexPath);
    console.log('App path:', app.getAppPath());
    console.log('File exists:', fs.existsSync(indexPath));
    
    mainWindow.loadFile(indexPath).catch(err => {
      console.error('Failed to load index.html:', err);
      // Fallback: try alternative paths
      const altPath = path.join(__dirname, '..', 'dist', 'index.html');
      console.log('Trying fallback path:', altPath);
      console.log('Fallback exists:', fs.existsSync(altPath));
      mainWindow.loadFile(altPath).catch(err2 => {
        console.error('Fallback also failed:', err2);
        mainWindow.webContents.loadURL(`data:text/html,<h1>Error loading app</h1><p>Path: ${indexPath}</p><p>Alt: ${altPath}</p><p>${err.message}</p>`);
      });
    });
  }

  // Log any page errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Page failed to load:', errorCode, errorDescription);
  });

  mainWindow.webContents.on('console-message', (event, level, message) => {
    console.log('Renderer:', message);
  });

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

/**
 * Initialize the database using sql.js
 */
async function initializeDatabase() {
  try {
    ensureDirectories();
    
    // Load sql.js
    const initSqlJs = require('sql.js');
    const SQL = await initSqlJs();
    
    // Load existing database or create new one
    let fileBuffer = null;
    if (fs.existsSync(DB_PATH)) {
      fileBuffer = fs.readFileSync(DB_PATH);
    }
    
    // Create database instance
    sqlJsDb = fileBuffer ? new SQL.Database(fileBuffer) : new SQL.Database();
    
    // Create wrapper for compatibility
    const { DatabaseWrapper } = require('../backend/database');
    db = new DatabaseWrapper(sqlJsDb);
    
    // Initialize auth utilities
    authUtils = require('../backend/auth');
    
    // Run database initialization
    const dbInit = require('../backend/db-init');
    await dbInit.initializeDatabase(sqlJsDb);
    
    // Save database after initialization
    saveDatabase();
    
    // Auto-save database every 30 seconds
    setInterval(saveDatabase, 30000);
    
    console.log('Database initialized successfully at:', DB_PATH);
    return true;
  } catch (error) {
    console.error('Database initialization failed:', error);
    return false;
  }
}

// ============================================
// IPC HANDLERS - Authentication
// ============================================

ipcMain.handle('auth:login', async (event, { email, password }) => {
  try {
    const database = require('../backend/database');
    const user = database.getUserByEmail(db, email);
    
    if (!user) {
      return { success: false, error: 'User not found' };
    }
    
    const isValid = await authUtils.comparePassword(password, user.password_hash);
    if (!isValid) {
      return { success: false, error: 'Invalid password' };
    }
    
    const token = authUtils.generateToken({ 
      id: user.id, 
      email: user.email, 
      role: user.role 
    });
    
    // Update last login
    database.updateLastLogin(db, user.id);
    
    return { 
      success: true, 
      data: { 
        token, 
        user: { 
          id: user.id, 
          email: user.email, 
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role 
        } 
      } 
    };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('auth:register', async (event, userData) => {
  try {
    const database = require('../backend/database');
    
    // Check if user exists
    const existingUser = database.getUserByEmail(db, userData.email);
    if (existingUser) {
      return { success: false, error: 'Email already registered' };
    }
    
    // Hash password
    const passwordHash = await authUtils.hashPassword(userData.password);
    
    // Create user
    const userId = database.createUser(db, {
      email: userData.email,
      password_hash: passwordHash,
      first_name: userData.firstName,
      last_name: userData.lastName,
      role: userData.role || 'employee'
    });
    
    return { success: true, data: { userId } };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('auth:verify', async (event, token) => {
  try {
    const decoded = authUtils.verifyToken(token);
    return { success: true, data: decoded };
  } catch (error) {
    return { success: false, error: 'Invalid token' };
  }
});

// ============================================
// IPC HANDLERS - Credentials & Auto-Start
// ============================================

// Store credentials securely
ipcMain.handle('credentials:store', async (event, { email, password }) => {
  try {
    const success = storeCredentials(email, password);
    return { success };
  } catch (error) {
    console.error('Store credentials error:', error);
    return { success: false, error: error.message };
  }
});

// Get stored credentials
ipcMain.handle('credentials:get', async () => {
  try {
    const credentials = getStoredCredentials();
    return { success: true, data: credentials };
  } catch (error) {
    console.error('Get credentials error:', error);
    return { success: false, error: error.message };
  }
});

// Clear stored credentials
ipcMain.handle('credentials:clear', async () => {
  try {
    const success = clearStoredCredentials();
    return { success };
  } catch (error) {
    console.error('Clear credentials error:', error);
    return { success: false, error: error.message };
  }
});

// Check if auto-started
ipcMain.handle('app:isAutoStart', async () => {
  return { isAutoStart };
});

// Configure auto-start
ipcMain.handle('app:setAutoStart', async (event, enable) => {
  try {
    configureAutoStart(enable);
    return { success: true };
  } catch (error) {
    console.error('Set auto-start error:', error);
    return { success: false, error: error.message };
  }
});

// Get auto-start status
ipcMain.handle('app:getAutoStartStatus', async () => {
  try {
    const settings = app.getLoginItemSettings();
    return { success: true, data: { enabled: settings.openAtLogin } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// IPC HANDLERS - Employees
// ============================================

ipcMain.handle('employees:getAll', async (event, filters = {}) => {
  try {
    const database = require('../backend/database');
    const employees = database.getAllEmployees(db, filters);
    return { success: true, data: employees };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('employees:getById', async (event, id) => {
  try {
    const database = require('../backend/database');
    const employee = database.getEmployeeById(db, id);
    return { success: true, data: employee };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('employees:create', async (event, employeeData) => {
  try {
    const database = require('../backend/database');
    const id = database.createEmployee(db, employeeData);
    return { success: true, data: { id } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('employees:update', async (event, { id, data }) => {
  try {
    const database = require('../backend/database');
    database.updateEmployee(db, id, data);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('employees:delete', async (event, id) => {
  try {
    const database = require('../backend/database');
    database.deleteEmployee(db, id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('employees:getStats', async () => {
  try {
    const database = require('../backend/database');
    const stats = database.getEmployeeStats(db);
    return { success: true, data: stats };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// IPC HANDLERS - Attendance
// ============================================

ipcMain.handle('attendance:clockIn', async (event, employeeId) => {
  try {
    const database = require('../backend/database');
    const record = database.clockIn(db, employeeId);
    return { success: true, data: record };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('attendance:clockOut', async (event, employeeId) => {
  try {
    const database = require('../backend/database');
    const record = database.clockOut(db, employeeId);
    return { success: true, data: record };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('attendance:getStatus', async (event, employeeId) => {
  try {
    const database = require('../backend/database');
    const status = database.getAttendanceStatus(db, employeeId);
    return { success: true, data: status };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('attendance:getRecords', async (event, { employeeId, startDate, endDate }) => {
  try {
    const database = require('../backend/database');
    const records = database.getAttendanceRecords(db, employeeId, startDate, endDate);
    return { success: true, data: records };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('attendance:getStats', async (event, { employeeId, period }) => {
  try {
    const database = require('../backend/database');
    const stats = database.getAttendanceStats(db, employeeId, period);
    return { success: true, data: stats };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// IPC HANDLERS - Tasks
// ============================================

ipcMain.handle('tasks:getAll', async (event, filters = {}) => {
  try {
    const database = require('../backend/database');
    const tasks = database.getAllTasks(db, filters);
    return { success: true, data: tasks };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tasks:getById', async (event, id) => {
  try {
    const database = require('../backend/database');
    const task = database.getTaskById(db, id);
    return { success: true, data: task };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tasks:create', async (event, taskData) => {
  try {
    const database = require('../backend/database');
    const id = database.createTask(db, taskData);
    return { success: true, data: { id } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tasks:update', async (event, { id, data }) => {
  try {
    const database = require('../backend/database');
    database.updateTask(db, id, data);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tasks:delete', async (event, id) => {
  try {
    const database = require('../backend/database');
    database.deleteTask(db, id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tasks:updateStatus', async (event, { id, status }) => {
  try {
    const database = require('../backend/database');
    database.updateTaskStatus(db, id, status);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// IPC HANDLERS - Leaves
// ============================================

ipcMain.handle('leaves:getAll', async (event, filters = {}) => {
  try {
    const database = require('../backend/database');
    const leaves = database.getAllLeaves(db, filters);
    return { success: true, data: leaves };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('leaves:create', async (event, leaveData) => {
  try {
    const database = require('../backend/database');
    const id = database.createLeave(db, leaveData);
    return { success: true, data: { id } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('leaves:approve', async (event, { id, approverId }) => {
  try {
    const database = require('../backend/database');
    database.approveLeave(db, id, approverId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('leaves:reject', async (event, { id, approverId, reason }) => {
  try {
    const database = require('../backend/database');
    database.rejectLeave(db, id, approverId, reason);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('leaves:getBalance', async (event, employeeId) => {
  try {
    const database = require('../backend/database');
    const balance = database.getLeaveBalance(db, employeeId);
    return { success: true, data: balance };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// IPC HANDLERS - Expenses
// ============================================

ipcMain.handle('expenses:getAll', async (event, filters = {}) => {
  try {
    const database = require('../backend/database');
    const expenses = database.getAllExpenses(db, filters);
    return { success: true, data: expenses };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('expenses:create', async (event, expenseData) => {
  try {
    const database = require('../backend/database');
    const id = database.createExpense(db, expenseData);
    return { success: true, data: { id } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('expenses:approve', async (event, { id, approverId }) => {
  try {
    const database = require('../backend/database');
    database.approveExpense(db, id, approverId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('expenses:reject', async (event, { id, approverId, reason }) => {
  try {
    const database = require('../backend/database');
    database.rejectExpense(db, id, approverId, reason);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('expenses:getStats', async (event, { employeeId, period }) => {
  try {
    const database = require('../backend/database');
    const stats = database.getExpenseStats(db, employeeId, period);
    return { success: true, data: stats };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('expenses:getById', async (event, id) => {
  try {
    const database = require('../backend/database');
    const expense = database.getExpenseById(db, id);
    return { success: true, data: expense };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('expenses:update', async (event, { id, data }) => {
  try {
    const database = require('../backend/database');
    database.updateExpense(db, id, data);
    return { success: true, data: { id } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('expenses:delete', async (event, id) => {
  try {
    const database = require('../backend/database');
    database.deleteExpense(db, id);
    return { success: true, data: { id } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// IPC HANDLERS - Revenue
// ============================================

ipcMain.handle('revenue:getAll', async (event, filters = {}) => {
  try {
    const database = require('../backend/database');
    const revenue = database.getAllRevenue(db, filters);
    return { success: true, data: revenue };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('revenue:create', async (event, revenueData) => {
  try {
    const database = require('../backend/database');
    const id = database.createRevenue(db, revenueData);
    return { success: true, data: { id } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('revenue:getStats', async (event, period) => {
  try {
    const database = require('../backend/database');
    const stats = database.getRevenueStats(db, period);
    return { success: true, data: stats };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('revenue:getById', async (event, id) => {
  try {
    const database = require('../backend/database');
    const revenue = database.getRevenueById(db, id);
    return { success: true, data: revenue };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('revenue:update', async (event, { id, data }) => {
  try {
    const database = require('../backend/database');
    database.updateRevenue(db, id, data);
    return { success: true, data: { id } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('revenue:delete', async (event, id) => {
  try {
    const database = require('../backend/database');
    database.deleteRevenue(db, id);
    return { success: true, data: { id } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// IPC HANDLERS - Reports
// ============================================

ipcMain.handle('reports:generate', async (event, { type, filters }) => {
  try {
    const database = require('../backend/database');
    const report = database.generateReport(db, type, filters);
    return { success: true, data: report };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reports:getOverview', async () => {
  try {
    const database = require('../backend/database');
    const overview = database.getOverviewReport(db);
    return { success: true, data: overview };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// IPC HANDLERS - Chat/Messages
// ============================================

ipcMain.handle('chat:getConversations', async (event, userId) => {
  try {
    const database = require('../backend/database');
    const conversations = database.getConversations(db, userId);
    return { success: true, data: conversations };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('chat:getMessages', async (event, { conversationId, limit, offset }) => {
  try {
    const database = require('../backend/database');
    const messages = database.getMessages(db, conversationId, limit, offset);
    return { success: true, data: messages };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('chat:sendMessage', async (event, messageData) => {
  try {
    const database = require('../backend/database');
    const result = database.sendMessage(db, messageData.conversationId, messageData.senderId, messageData.content);
    mainWindow?.webContents.send('chat:newMessage', { ...messageData, id: result.id });
    saveDatabase();
    return { success: true, data: { id: result.id } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('chat:createConversation', async (event, { participantIds, name, type }) => {
  try {
    const database = require('../backend/database');
    const id = database.createConversation(db, participantIds, name, type);
    return { success: true, data: { id } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// IPC HANDLERS - Notifications
// ============================================

ipcMain.handle('notifications:getAll', async (event, { userId, filters }) => {
  try {
    const database = require('../backend/database');
    const notifications = database.getNotifications(db, userId, filters);
    return { success: true, data: notifications };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('notifications:markRead', async (event, notificationId) => {
  try {
    const database = require('../backend/database');
    database.markNotificationRead(db, notificationId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('notifications:markAllRead', async (event, userId) => {
  try {
    const database = require('../backend/database');
    database.markAllNotificationsRead(db, userId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('notifications:show', async (event, { title, body, icon }) => {
  const notification = new Notification({ title, body, icon });
  notification.show();
  return { success: true };
});

ipcMain.handle('notifications:delete', async (event, id) => {
  try {
    const database = require('../backend/database');
    database.deleteNotification(db, id);
    return { success: true, data: { id } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// IPC HANDLERS - Settings/Preferences
// ============================================

ipcMain.handle('settings:get', async (event, userId) => {
  try {
    const database = require('../backend/database');
    const settings = database.getUserSettings(db, userId);
    return { success: true, data: settings };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('settings:update', async (event, { userId, settings }) => {
  try {
    const database = require('../backend/database');
    database.updateUserSettings(db, userId, settings);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('settings:changePassword', async (event, { userId, currentPassword, newPassword }) => {
  try {
    const database = require('../backend/database');
    const user = database.getUserById(db, userId);
    
    const isValid = await authUtils.comparePassword(currentPassword, user.password_hash);
    if (!isValid) {
      return { success: false, error: 'Current password is incorrect' };
    }
    
    const newHash = await authUtils.hashPassword(newPassword);
    database.updatePassword(db, userId, newHash);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// IPC HANDLERS - File Operations
// ============================================

ipcMain.handle('files:upload', async (event, { fileName, fileData, folder }) => {
  try {
    const targetDir = path.join(DOCUMENTS_DIR, folder || '');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    const filePath = path.join(targetDir, fileName);
    fs.writeFileSync(filePath, Buffer.from(fileData));
    
    const database = require('../backend/database');
    const id = database.saveFileMetadata(db, {
      name: fileName,
      path: filePath,
      folder,
      size: fileData.length
    });
    
    return { success: true, data: { id, path: filePath } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('files:getAll', async (event, filters = {}) => {
  try {
    const database = require('../backend/database');
    const files = database.getAllFiles(db, filters);
    return { success: true, data: files };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('files:delete', async (event, fileId) => {
  try {
    const database = require('../backend/database');
    const file = database.getFileById(db, fileId);
    
    if (file && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    
    database.deleteFile(db, fileId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('files:openDialog', async (event, options = {}) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', ...(options.multiple ? ['multiSelections'] : [])],
    filters: options.filters || [
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  return { success: !result.canceled, data: result.filePaths };
});

ipcMain.handle('files:saveDialog', async (event, options = {}) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: options.defaultPath,
    filters: options.filters || [
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  return { success: !result.canceled, data: result.filePath };
});

// ============================================
// IPC HANDLERS - Export
// ============================================

ipcMain.handle('export:save', async (event, { data, fileName, type }) => {
  try {
    const filePath = path.join(EXPORTS_DIR, fileName);
    fs.writeFileSync(filePath, data);
    return { success: true, data: { path: filePath } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// IPC HANDLERS - System
// ============================================

ipcMain.handle('system:getAppInfo', async () => {
  return {
    success: true,
    data: {
      version: app.getVersion(),
      name: app.getName(),
      paths: {
        appData: APP_DATA_DIR,
        documents: DOCUMENTS_DIR,
        exports: EXPORTS_DIR
      }
    }
  };
});

ipcMain.handle('system:openExternal', async (event, url) => {
  await shell.openExternal(url);
  return { success: true };
});

// ============================================
// IPC HANDLERS - VOB Custom Fields
// ============================================

ipcMain.handle('vobCustomFields:getAll', async () => {
  try {
    const result = sqlJsDb.exec(`
      SELECT * FROM vob_custom_fields ORDER BY section, display_order
    `);
    
    if (result.length === 0) return { success: true, data: [] };
    
    const columns = result[0].columns;
    const data = result[0].values.map(row => {
      const obj = {};
      columns.forEach((col, i) => obj[col] = row[i]);
      return obj;
    });
    
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('vobCustomFields:getBySection', async (event, section) => {
  try {
    const stmt = sqlJsDb.prepare(`
      SELECT * FROM vob_custom_fields WHERE section = ? ORDER BY display_order
    `);
    stmt.bind([section]);
    
    const data = [];
    while (stmt.step()) {
      data.push(stmt.getAsObject());
    }
    stmt.free();
    
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('vobCustomFields:create', async (event, fieldData) => {
  try {
    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();
    const now = new Date().toISOString();
    
    // Get max display order for section
    const orderResult = sqlJsDb.exec(`
      SELECT COALESCE(MAX(display_order), 0) + 1 as next_order 
      FROM vob_custom_fields WHERE section = '${fieldData.section}'
    `);
    const displayOrder = orderResult.length > 0 ? orderResult[0].values[0][0] : 1;
    
    sqlJsDb.run(`
      INSERT INTO vob_custom_fields (id, section, field_name, field_label, field_type, placeholder, display_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, fieldData.section, fieldData.fieldName, fieldData.fieldLabel, fieldData.fieldType || 'text', fieldData.placeholder || '', displayOrder, now, now]);
    
    saveDatabase();
    
    return { success: true, data: { id, ...fieldData, display_order: displayOrder } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('vobCustomFields:delete', async (event, id) => {
  try {
    sqlJsDb.run('DELETE FROM vob_custom_fields WHERE id = ?', [id]);
    saveDatabase();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// IPC HANDLERS - Users (Admin Only)
// ============================================

ipcMain.handle('users:getAll', async () => {
  try {
    const result = sqlJsDb.exec(`
      SELECT id, email, first_name, last_name, role, last_login, created_at, updated_at 
      FROM users ORDER BY created_at DESC
    `);
    
    if (result.length === 0) return { success: true, data: [] };
    
    const columns = result[0].columns;
    const data = result[0].values.map(row => {
      const obj = {};
      columns.forEach((col, i) => obj[col] = row[i]);
      return obj;
    });
    
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('users:getById', async (event, id) => {
  try {
    const stmt = sqlJsDb.prepare(`
      SELECT id, email, first_name, last_name, role, last_login, created_at 
      FROM users WHERE id = ?
    `);
    stmt.bind([id]);
    
    let user = null;
    if (stmt.step()) {
      user = stmt.getAsObject();
    }
    stmt.free();
    
    return { success: true, data: user };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('users:update', async (event, { id, data }) => {
  try {
    const now = new Date().toISOString();
    const updates = [];
    const values = [];
    
    if (data.email) {
      updates.push('email = ?');
      values.push(data.email);
    }
    if (data.first_name) {
      updates.push('first_name = ?');
      values.push(data.first_name);
    }
    if (data.last_name) {
      updates.push('last_name = ?');
      values.push(data.last_name);
    }
    if (data.role) {
      updates.push('role = ?');
      values.push(data.role);
    }
    
    updates.push('updated_at = ?');
    values.push(now);
    values.push(id);
    
    sqlJsDb.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
    saveDatabase();
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('users:delete', async (event, id) => {
  try {
    sqlJsDb.run('DELETE FROM users WHERE id = ?', [id]);
    saveDatabase();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('users:resetPassword', async (event, { userId, newPassword }) => {
  try {
    const newHash = await authUtils.hashPassword(newPassword);
    const now = new Date().toISOString();
    
    sqlJsDb.run('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', 
      [newHash, now, userId]);
    saveDatabase();
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// SCREEN CAPTURE (for silent monitoring)
// ============================================

// Get available screen sources for capture
ipcMain.handle('screen:getSources', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 320, height: 180 }
    });
    
    return sources.map(source => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL(),
      display_id: source.display_id,
      appIcon: source.appIcon ? source.appIcon.toDataURL() : null
    }));
  } catch (error) {
    console.error('Error getting screen sources:', error);
    return [];
  }
});

// Get primary screen source ID (for silent monitoring)
ipcMain.handle('screen:getPrimarySource', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1, height: 1 }
    });
    
    // Return the first/primary screen
    if (sources.length > 0) {
      return {
        id: sources[0].id,
        name: sources[0].name,
        display_id: sources[0].display_id
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting primary screen source:', error);
    return null;
  }
});

// ============================================
// APP LIFECYCLE
// ============================================

app.whenReady().then(async () => {
  await initializeDatabase();
  createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    saveDatabase();
    if (sqlJsDb) {
      sqlJsDb.close();
    }
    app.quit();
  }
});

app.on('before-quit', () => {
  saveDatabase();
  if (sqlJsDb) {
    sqlJsDb.close();
  }
});

// Handle certificate errors in development
if (isDev) {
  app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    event.preventDefault();
    callback(true);
  });
}
