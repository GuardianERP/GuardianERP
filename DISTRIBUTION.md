# Guardian Desktop ERP - Distribution Guide

## Building for Distribution

This guide explains how to build and distribute Guardian Desktop ERP for different platforms.

## Prerequisites

1. **Node.js** (v18 or higher)
2. **npm** (v9 or higher)
3. **Git**
4. For Windows: NSIS (automatically downloaded by electron-builder)
5. For macOS: Xcode Command Line Tools
6. For Linux: `fakeroot`, `dpkg`

## Build Commands

### Development Build
```bash
# Install dependencies
npm install

# Run in development mode
npm run electron:dev
```

### Production Builds

#### Windows
```bash
# Build for Windows (NSIS installer + portable)
npm run electron:build:win

# Output: dist-electron/Guardian Desktop ERP-1.0.0-x64.exe
```

#### macOS
```bash
# Build for macOS (DMG + ZIP)
npm run electron:build:mac

# Output: dist-electron/Guardian Desktop ERP-1.0.0-arm64.dmg
```

#### Linux
```bash
# Build for Linux (AppImage, DEB, RPM)
npm run electron:build:linux

# Output: 
# - dist-electron/Guardian Desktop ERP-1.0.0-x64.AppImage
# - dist-electron/guardian-desktop-erp_1.0.0_amd64.deb
# - dist-electron/guardian-desktop-erp-1.0.0.x86_64.rpm
```

#### All Platforms
```bash
# Build for all platforms (requires corresponding OS or CI)
npm run electron:build:all
```

## Code Signing

### Windows Code Signing
Set these environment variables before building:
```bash
CSC_LINK=path/to/certificate.pfx
CSC_KEY_PASSWORD=your_password
```

### macOS Code Signing & Notarization
Set these environment variables:
```bash
APPLE_ID=your@apple.id
APPLE_ID_PASSWORD=app-specific-password
APPLE_TEAM_ID=your_team_id
```

## Auto-Update Setup

### GitHub Releases
1. Create a GitHub repository for your app
2. Update `publish` settings in `electron-builder.config.js`:
```javascript
publish: {
  provider: 'github',
  owner: 'your-github-username',
  repo: 'guardian-desktop-erp',
}
```
3. Set `GH_TOKEN` environment variable with a GitHub Personal Access Token
4. Build and publish:
```bash
npm run dist -- --publish always
```

### Generic Server
For self-hosted updates, use a generic server:
```javascript
publish: {
  provider: 'generic',
  url: 'https://your-server.com/updates',
}
```

Upload these files to your server:
- `latest.yml` (for Windows)
- `latest-mac.yml` (for macOS)
- `latest-linux.yml` (for Linux)
- The actual installer files

## Directory Structure After Build

```
dist-electron/
├── win-unpacked/           # Windows unpacked app
├── mac/                    # macOS app bundle
├── linux-unpacked/         # Linux unpacked app
├── Guardian Desktop ERP-1.0.0-x64.exe       # Windows NSIS installer
├── Guardian Desktop ERP-1.0.0-x64-portable.exe  # Windows portable
├── Guardian Desktop ERP-1.0.0-arm64.dmg     # macOS DMG
├── Guardian Desktop ERP-1.0.0-arm64.zip     # macOS ZIP
├── Guardian Desktop ERP-1.0.0-x64.AppImage  # Linux AppImage
├── guardian-desktop-erp_1.0.0_amd64.deb     # Debian package
├── guardian-desktop-erp-1.0.0.x86_64.rpm    # RPM package
├── latest.yml              # Windows update manifest
├── latest-mac.yml          # macOS update manifest
└── latest-linux.yml        # Linux update manifest
```

## Release Checklist

- [ ] Update version in `package.json`
- [ ] Update CHANGELOG.md
- [ ] Run all tests: `npm test`
- [ ] Build for target platform(s)
- [ ] Test the installer on a clean machine
- [ ] Verify auto-update works
- [ ] Create GitHub release with release notes
- [ ] Upload artifacts to release
- [ ] Announce release

## Troubleshooting

### Windows Build Issues
- If NSIS is not found, electron-builder will download it automatically
- For code signing issues, verify your certificate is valid and not expired

### macOS Build Issues
- Notarization requires macOS 10.14.5 or later
- If notarization fails, check your Apple Developer account status
- Hardened runtime must be enabled for notarization

### Linux Build Issues
- AppImage requires FUSE to run on some systems
- For DEB packages, ensure `fakeroot` and `dpkg` are installed
- For RPM packages, ensure `rpm-build` is installed

## Security Considerations

1. **Never commit certificates or passwords** to version control
2. Use environment variables for sensitive data
3. Enable code signing for production releases
4. Keep dependencies updated
5. Run security audits: `npm audit`

## Support

For issues or questions:
- GitHub Issues: [repository-url]/issues
- Email: support@guardiansystems.com
