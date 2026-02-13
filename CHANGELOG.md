# Changelog

All notable changes to Guardian Desktop ERP will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.6.0] - 2026-02-13

### Added
- **Leave Approval Workflow** — Multi-level approval chain (Employee → Team Lead → CEO)
  - Team lead can recommend/forward or reject leave requests
  - CEO final approval with full audit trail
  - Approval chain column shows current status
- **Loan Request System** — Full loan management page
  - Personal, salary advance, and emergency loan types
  - Repayment plan calculator
  - Admin approve/reject with notes
  - Stats dashboard (total, pending, approved, active amount)
- **Employee Directory** — Public directory viewable by all users
  - Department-grouped accordion view with colored headers
  - Flat list view with search and department filter
  - Profile pictures, email, location, joining date
- **Teams Management** — Team creation and member management
  - Create/edit/delete teams (admin only)
  - Add/remove members with team lead designation
  - Expandable team cards with gradient department headers
- **Admin Announcements** — Send company-wide notifications
  - Announcement modal on Notifications page (admin only)
  - Title, message, and urgent toggle
  - Sends to all employees instantly
- **Milestone Notifications** — Auto-celebrate employee milestones
  - 100, 200, 300 days and 3, 6, 12, 24 month milestones
  - Runs once daily, no duplicate notifications
- **Database migration** for teams, team_members, loans tables, leave approval columns, profile-pictures bucket

### Fixed
- **BOB description** — Changed "Book of Business" to "Breakdown of Benefits"
- **Electron menu bar** — Hidden completely (no menu bar visible)

### Changed
- Sidebar updated with Loans, Teams, and Directory navigation items
- Header page names extended for all new routes
- Leave API updated with approval chain support
- Notification service expanded with milestone, announcement, and status notification functions

## [2.5.4] - 2026-02-13

### Fixed
- **Auto-update now works properly** — switched from portable to NSIS installer build
- **PDF download in Electron** — replaced window.open() with iframe print (no popup permission needed)
- Fixed version detection in update notification component
- Build config now uses electron-builder.config.js properly

## [2.5.3] - 2026-02-13

### Added
- **Employee Agreements Page** 📋
  - 14-article Employment Agreement (dental billing specific, Pakistan standard)
  - Guarantor Agreement with bilingual format
  - Auto-fill from employee data on selection
  - Preview modal and native browser PDF download
  - Save & attach agreements to employee profile in Supabase Storage
  - Dual office addresses (USA & Pakistan)
  - HIPAA, IP Rights, Non-Compete articles included
- **Employee Agreements database migration** with RLS policies

### Fixed
- PDF generation reliability (switched to native browser print)
- Employee agreement save error (RLS policy fix)

### Removed
- **Removed duplicate Mobile APK folder** (137 stale files — complete copy of main project)
- Cleaned up dist/ build artifacts

### Improved
- Repository reduced from 252 to 115 tracked files
- Cleaner project structure with no duplicated source code

## [2.4.1] - 2026-02-12

### Added
- **Native Desktop Notifications** 🔔
  - Pop-up notifications appear even when app is minimized
  - Works when user is in another application
  - Click notification to bring Guardian ERP to front
  - Sound alert for new notifications

### Improved
- Admin and Super Admin can both access System Admin features
- Better notification handling with real-time updates

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
