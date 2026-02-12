# Changelog

All notable changes to Guardian Desktop ERP will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.4.0] - 2026-02-12

### Added
- **Complete Employee Profile Form**
  - Multi-tab profile form with Basic Info, Contact, Employment, and Personal tabs
  - Profile picture upload with camera icon and preview
  - Company email and personal email fields
  - Date of birth, gender, and marital status
  - Complete address with city, country, and nationality
  - Emergency contact with name and phone number
  - Blood group selection

- **C-Class Executive Department**
  - New department for executive leadership
  - Positions include: CEO, COO, CFO, CTO, CMO, CHRO, MD, GM, AVP, VP, SVP, Director
  - Gold color badge for executive identification

- **App Update Notifications**
  - System-wide notification when new version is released
  - Automatic notification to all employees with accounts

### Fixed
- **system_role Column Error**
  - Fixed "Could not find the 'system_role' column" error when adding employees
  - Properly separated system access role from job designation
  - System role now correctly saved to 'role' column
  - Job position now saved to 'designation' column

### Improved
- **Employee Self-Service**
  - Employees can now update their own profile pictures
  - Extended self-update fields: personal email, nationality, emergency contact name, blood group, marital status, gender

### Database
- New migration: `migration-employee-profile-update.sql`
  - Added `personal_email` column
  - Added `emergency_contact_name` column
  - Added `nationality` column
  - Added `gender` column
  - Added `marital_status` column
  - Added indexes for faster queries

## [1.0.0] - 2024-01-15

### Added
- **Core Features**
  - Employee management with full CRUD operations
  - Attendance tracking with clock-in/clock-out
  - Task management with priorities and assignments
  - Leave request management with approval workflow
  - Expense tracking and reimbursement
  - Revenue tracking and analysis
  - Document management with upload/download
  - Time tracking with project allocation
  - Real-time chat for team communication
  - Notification system

- **Dashboard**
  - Overview statistics
  - Interactive charts with Recharts
  - Quick action buttons
  - Recent activity feed

- **Reports**
  - Employee reports
  - Attendance reports
  - Financial summaries
  - Export to PDF and Excel

- **AI Assistant**
  - Natural language queries
  - Smart suggestions
  - Voice commands
  - Quick actions

- **Voice Features**
  - Text-to-speech for accessibility
  - Speech recognition for commands
  - Voice navigation

- **Security**
  - Role-based access control (RBAC)
  - Permission management
  - Secure authentication
  - Session management

- **Developer Features**
  - Unit testing with Jest
  - Error boundaries
  - Centralized logging
  - Toast notifications

- **Desktop Features**
  - Auto-update mechanism
  - System tray integration
  - Native notifications
  - Cross-platform support (Windows, macOS, Linux)

### Technical Stack
- Electron 28 for desktop runtime
- React 18 for UI components
- Vite 5 for build tooling
- sql.js for SQLite database
- Tailwind CSS for styling
- Lucide React for icons

## [Unreleased]

### Planned Features
- Multi-language support (i18n)
- Dark/Light theme toggle
- Data backup and restore
- Cloud sync option
- Mobile companion app
- Advanced reporting dashboard
- Integration APIs
- Audit logging
- Two-factor authentication

---

## Version History

| Version | Release Date | Status |
|---------|--------------|--------|
| 2.4.0   | 2026-02-12   | Current |
| 2.3.6   | 2026-02-10   | Previous |
| 1.0.0   | 2024-01-15   | Legacy |

## Upgrading

### From 0.x to 1.0.0
This is the initial release. No migration required.

## Known Issues

1. **Windows**: High DPI scaling may affect some UI elements
2. **macOS**: First launch may require security approval
3. **Linux**: Some distributions may need additional dependencies for AppImage

## Reporting Issues

Please report issues at: [GitHub Issues](https://github.com/guardian-systems/guardian-desktop-erp/issues)

Include:
- OS and version
- Application version
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
