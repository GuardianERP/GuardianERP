/**
 * Guardian Desktop ERP - Electron Builder Configuration
 * Comprehensive build configuration for all platforms
 */

const config = {
  appId: 'com.guardian.desktop-erp',
  productName: 'Guardian Desktop ERP',
  copyright: 'Copyright © 2026 Guardian Systems',
  
  // Build directories
  directories: {
    output: 'release-new',
    buildResources: 'build-resources',
  },
  
  // Files to include
  files: [
    'dist/**/*',
    'electron/**/*',
    'backend/**/*',
    'package.json',
  ],
  
  // Extra files to include
  extraFiles: [
    {
      from: 'backend/data',
      to: 'data',
      filter: ['**/*'],
    },
  ],
  
  // Extra resources
  extraResources: [
    {
      from: 'public',
      to: 'public',
      filter: ['**/*.ico', '**/*.icns', '**/*.png'],
    },
  ],
  
  // Compression
  compression: 'maximum',
  
  // ASAR packaging
  asar: true,
  asarUnpack: [
    '**/*.node',
    '**/sql.js/**/*',
  ],
  
  // Windows configuration
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64'],
      },
      {
        target: 'portable',
        arch: ['x64'],
      },
    ],
    icon: 'public/icon.ico',
    artifactName: '${productName}-${version}-${arch}.${ext}',
    publisherName: 'Guardian Dental Billing LLC',
    legalTrademarks: 'Guardian Desktop ERP is a trademark of Guardian Dental Billing LLC',
    verifyUpdateCodeSignature: false,
    signAndEditExecutable: false,
    requestedExecutionLevel: 'asInvoker',
  },
  
  // NSIS installer configuration
  nsis: {
    oneClick: false,
    perMachine: true,
    allowToChangeInstallationDirectory: true,
    allowElevation: true,
    installerIcon: 'public/icon.ico',
    uninstallerIcon: 'public/icon.ico',
    installerHeaderIcon: 'public/icon.ico',
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'Guardian ERP',
    license: 'LICENSE.txt',
    deleteAppDataOnUninstall: false,
    include: 'build-resources/installer.nsh',
    warningsAsErrors: false,
    menuCategory: 'Guardian Systems',
    installerSidebar: null,
    uninstallerSidebar: null,
  },
  
  // macOS configuration
  mac: {
    target: [
      {
        target: 'dmg',
        arch: ['x64', 'arm64'],
      },
      {
        target: 'zip',
        arch: ['x64', 'arm64'],
      },
    ],
    icon: 'public/icon.icns',
    category: 'public.app-category.business',
    artifactName: '${productName}-${version}-${arch}.${ext}',
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: 'build-resources/entitlements.mac.plist',
    entitlementsInherit: 'build-resources/entitlements.mac.plist',
  },
  
  // DMG configuration
  dmg: {
    contents: [
      {
        x: 130,
        y: 220,
      },
      {
        x: 410,
        y: 220,
        type: 'link',
        path: '/Applications',
      },
    ],
    window: {
      width: 540,
      height: 380,
    },
  },
  
  // Linux configuration
  linux: {
    target: [
      {
        target: 'AppImage',
        arch: ['x64'],
      },
      {
        target: 'deb',
        arch: ['x64'],
      },
      {
        target: 'rpm',
        arch: ['x64'],
      },
    ],
    icon: 'public',
    category: 'Office',
    artifactName: '${productName}-${version}-${arch}.${ext}',
    synopsis: 'Employee Management Dashboard',
    description: 'Guardian Desktop ERP - Comprehensive Employee Management and Business Dashboard',
    desktop: {
      Name: 'Guardian ERP',
      Comment: 'Employee Management Dashboard',
      Keywords: 'erp;employee;management;business',
      Categories: 'Office;Finance;ProjectManagement',
    },
  },
  
  // Debian package configuration
  deb: {
    depends: ['libgtk-3-0', 'libnotify4', 'libnss3', 'libxss1', 'libxtst6', 'xdg-utils'],
    packageCategory: 'office',
    priority: 'optional',
  },
  
  // Publish configuration (for auto-updater)
  publish: {
    provider: 'github',
    owner: 'GuardianERP',
    repo: 'GuardianERP',
    releaseType: 'release',
  },
  
  // Generate artifacts
  generateUpdatesFilesForAllChannels: true,
  
  // Notarization (macOS)
  afterSign: 'build-resources/scripts/notarize.js',
  
  // Protocol registration
  protocols: [
    {
      name: 'Guardian ERP Protocol',
      schemes: ['guardian-erp'],
    },
  ],
  
  // File associations
  fileAssociations: [
    {
      ext: 'gerp',
      name: 'Guardian ERP Data',
      description: 'Guardian ERP Data File',
      mimeType: 'application/x-guardian-erp',
      icon: 'public/icon.ico',
    },
  ],
};

module.exports = config;
