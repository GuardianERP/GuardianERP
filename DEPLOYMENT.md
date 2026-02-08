# Guardian Desktop ERP - Production Deployment Guide

## Overview
Guardian Desktop ERP is an Electron-based desktop application for employee management, built with React and SQLite.

## Features
- **Role-Based Access Control**: Admin vs Employee permissions
- **User Management**: Admins can create/manage employee accounts
- **Financial Privacy**: Expenses, Revenue, and Reports are admin-only
- **Employee Self-Service**: Profile updates, password changes, task history

---

## Production Deployment

### Step 1: Build the Application

**For Windows:**
```bash
npm run electron:build:win
```

**For Mac:**
```bash
npm run electron:build:mac
```

**For Linux:**
```bash
npm run electron:build:linux
```

**For all platforms:**
```bash
npm run electron:build:all
```

The built installers will be in the `dist-electron` folder.

---

### Step 2: Distribute to Employees

1. **Windows Users**: Share the `.exe` installer from `dist-electron/`
2. **Mac Users**: Share the `.dmg` file from `dist-electron/`
3. **Linux Users**: Share the `.AppImage` file from `dist-electron/`

---

## User Roles

### Admin (admin@guardian.com / Admin@123)
- ✅ Create/edit/delete employee accounts
- ✅ View all employees and salaries
- ✅ Access Expenses, Revenue, Reports
- ✅ Role Management
- ✅ Full dashboard with financial data

### Employee (created by admin)
- ✅ View own profile, salary, department
- ✅ Update profile information
- ✅ Change password
- ✅ View assigned tasks and history
- ✅ Clock in/out attendance
- ✅ Request leaves
- ✅ Use AR Follow Up, VOB/BOB forms
- ✅ Access Chat, AI Assistant
- ❌ Cannot see other employees' salaries
- ❌ Cannot access Expenses, Revenue, Reports
- ❌ Cannot create user accounts

---

## Creating Employee Accounts

1. Login as admin
2. Go to **Administration → User Accounts**
3. Click **Create Account**
4. Fill in:
   - First Name, Last Name
   - Email (used for login)
   - Password (min. 8 characters)
   - Role (Employee/Manager/Admin)
   - Optionally link to existing employee record
5. Share the login credentials with the employee

---

## Database Location

The SQLite database is stored at:
- **Windows**: `%APPDATA%/guardian-desktop-erp/guardian-desktop/app.db`
- **Mac**: `~/Library/Application Support/guardian-desktop-erp/guardian-desktop/app.db`
- **Linux**: `~/.config/guardian-desktop-erp/guardian-desktop/app.db`

### Backup
To backup the database, simply copy the `app.db` file to a safe location.

---

## Multi-User Setup (Network/Cloud)

Currently, Guardian Desktop ERP uses a **local SQLite database** per installation. For multi-user access with a shared database:

### Option 1: Shared Network Drive
1. Configure the database path to a shared network location
2. All users on the same network can access the same data
3. Note: Requires careful handling of concurrent access

### Option 2: Cloud Database (Future Enhancement)
For true multi-user support, consider migrating to:
- PostgreSQL or MySQL server
- Cloud database (Supabase, PlanetScale, etc.)

---

## Security Notes

1. **Self-Registration Disabled**: Only admins can create accounts
2. **Password Requirements**: Minimum 8 characters
3. **Role-Based Routes**: Admin pages return "Unauthorized" for employees
4. **Sensitive Data Hidden**: Employees cannot see financial information

---

## Troubleshooting

### App won't start
1. Check if port 8888 is in use (dev mode only)
2. Delete `%APPDATA%/guardian-desktop-erp` and restart

### Database errors
1. Backup and delete `app.db`
2. Restart app to reinitialize database

### Login issues
1. Default admin: `admin@guardian.com` / `Admin@123`
2. If locked out, delete database and restart

---

## Tech Stack

- **Frontend**: React 18, Vite, TailwindCSS
- **Backend**: Electron 28, Node.js
- **Database**: SQLite (sql.js)
- **Auth**: JWT tokens, bcrypt password hashing
- **PDF**: jsPDF, jspdf-autotable
- **Charts**: Recharts, Chart.js

---

## Support

Guardian Dental Billing LLC
- Website: www.guardiandentalbilling.com
- Email: info@guardiandentalbilling.com
- Phone: +1 (732) 944-0080
