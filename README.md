# Guardian Desktop ERP

<p align="center">
  <img src="public/icon.png" width="128" height="128" alt="Guardian ERP Logo">
</p>

<p align="center">
  <strong>Comprehensive Employee Management & Business Dashboard</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#development">Development</a> •
  <a href="#building">Building</a> •
  <a href="#license">License</a>
</p>

---

## Overview

Guardian Desktop ERP is a powerful, cross-platform desktop application for managing employees, tracking attendance, handling tasks, processing expenses, and much more. Built with modern technologies for performance and reliability.

## Features

### 📊 Dashboard
- Real-time statistics and KPIs
- Interactive charts and graphs
- Quick action buttons
- Recent activity feed

### 👥 Employee Management
- Complete employee profiles
- Department organization
- Status tracking
- Performance history

### ⏰ Attendance Tracking
- Clock-in/Clock-out system
- Attendance reports
- Late arrival tracking
- Overtime calculations

### ✅ Task Management
- Priority-based tasks
- Assignment and delegation
- Progress tracking
- Due date reminders

### 📅 Leave Management
- Leave request submission
- Approval workflows
- Balance tracking
- Calendar integration

### 💰 Financial Tracking
- Expense management
- Revenue tracking
- Budget analysis
- Financial reports

### 📄 Document Management
- File upload and storage
- Category organization
- Version control
- Access permissions

### 💬 Team Communication
- Real-time chat
- Group conversations
- File sharing
- Message history

### 🤖 AI Assistant
- Natural language queries
- Smart suggestions
- Voice commands
- Automated insights

### 🔐 Security
- Role-based access control
- Permission management
- Secure authentication
- Session management

## Tech Stack

- **Frontend**: React 18, Tailwind CSS
- **Desktop**: Electron 28
- **Build Tool**: Vite 5
- **Database**: SQLite (sql.js)
- **Charts**: Recharts, Chart.js
- **Icons**: Lucide React
- **Testing**: Jest, React Testing Library

## Installation

### From Release
1. Download the latest release for your OS from [Releases](https://github.com/guardian-systems/guardian-desktop-erp/releases)
2. Run the installer
3. Launch Guardian Desktop ERP

### From Source
```bash
# Clone the repository
git clone https://github.com/guardian-systems/guardian-desktop-erp.git
cd guardian-desktop-erp

# Install dependencies
npm install

# Initialize database
npm run init-db

# Start development
npm run electron:dev
```

## Development

### Prerequisites
- Node.js 18+
- npm 9+

### Commands
```bash
# Start Vite dev server only
npm run dev

# Start Electron with dev server
npm run electron:dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint
```

## Building

### Development Build
```bash
npm run build
npm run electron
```

### Production Build
```bash
# Windows
npm run electron:build:win

# macOS
npm run electron:build:mac

# Linux
npm run electron:build:linux

# All platforms
npm run electron:build:all
```

## Project Structure

```
guardian-desktop-erp/
├── electron/           # Electron main process
│   ├── main.js        # Main entry point
│   ├── preload.js     # Preload scripts
│   ├── updater.js     # Auto-update module
│   ├── logger.js      # Logging module
│   └── errorHandler.js # Error handling
├── backend/           # Backend logic
│   ├── database.js    # Database operations
│   └── db-init.js     # Database initialization
├── src/               # React frontend
│   ├── components/    # UI components
│   ├── pages/         # Page components
│   ├── hooks/         # Custom hooks
│   ├── services/      # Business logic
│   ├── store/         # State management
│   └── tests/         # Test files
├── public/            # Static assets
├── build-resources/   # Build configuration
└── dist-electron/     # Build output
```

## Default Login

For initial access, use:
- **Email**: admin@guardian.com
- **Password**: Admin@123

⚠️ Change the default password after first login!

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE.txt) file for details.

## Support

- 📧 Email: support@guardiansystems.com
- 🐛 Issues: [GitHub Issues](https://github.com/guardian-systems/guardian-desktop-erp/issues)
- 📖 Documentation: [Wiki](https://github.com/guardian-systems/guardian-desktop-erp/wiki)

---

<p align="center">
  Made with ❤️ by Guardian Systems
</p>
