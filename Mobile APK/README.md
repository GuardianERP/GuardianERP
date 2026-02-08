# Guardian ERP Mobile

Android/iOS mobile app for Guardian Desktop ERP built with Capacitor.

## Features

- 📱 Full ERP functionality on mobile
- 🔄 Real-time sync between desktop and mobile
- 🔔 Push notifications
- 📴 Offline support with automatic sync
- 🔒 Secure authentication
- 📊 All dashboard, reports, and management features

## Prerequisites

### For Building

1. **Node.js** (v18 or higher)
2. **Java JDK 17** - Required for Android builds
   - Download from: https://adoptium.net/ (Temurin 17)
   - Set `JAVA_HOME` environment variable
3. **Android Studio** - For Android builds
   - Download from: https://developer.android.com/studio
   - Install Android SDK (API 34 recommended)
   - Set `ANDROID_HOME` environment variable
4. **Xcode** (macOS only) - For iOS builds

### Environment Variables (Windows)

```powershell
# Add to System Environment Variables
JAVA_HOME = C:\Program Files\Eclipse Adoptium\jdk-17.x.x
ANDROID_HOME = C:\Users\<username>\AppData\Local\Android\Sdk

# Add to PATH
%JAVA_HOME%\bin
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\tools
```

## Setup

1. **Copy environment file**
```bash
cp .env.example .env
```

2. **Edit `.env`** with your Supabase credentials (same as desktop app)

3. **Install dependencies**
```bash
npm install
```

4. **Initialize Capacitor** (first time only)
```bash
npm run cap:add:android
npm run cap:add:ios  # macOS only
```

5. **Run database migration** (optional - for app updates feature)
```sql
-- Run in Supabase SQL Editor
-- See: ../database/migration-app-updates.sql
```

## Building

### Debug APK (Development)

```bash
# Build web assets and sync to Android
npm run build:android

# Open in Android Studio to build APK
npm run cap:open:android

# Or build directly via command line
npm run android:apk
```

The debug APK will be at:
`android/app/build/outputs/apk/debug/app-debug.apk`

### Release APK (Production)

1. **Create keystore** (one time):
```bash
keytool -genkey -v -keystore guardian-release.keystore -alias guardian -keyalg RSA -keysize 2048 -validity 10000
```

2. **Configure signing** in `android/app/build.gradle`

3. **Build release**:
```bash
npm run android:release
```

### iOS Build (macOS only)

```bash
npm run build:ios
npm run cap:open:ios
```

Then build in Xcode.

## Development

```bash
# Start dev server
npm run dev

# Sync changes to native projects
npm run cap:sync
```

## Real-time Sync

The app automatically syncs with desktop when:
- User logs in from mobile or desktop
- Data is modified on either platform
- Settings are changed
- User comes online after being offline

Sync is powered by Supabase Realtime and works automatically.

## Auto Updates

The app checks for updates:
- On app launch
- Every 4 hours while running
- When user manually checks

Update info is stored in the `app_updates` table in Supabase.

## Project Structure

```
Mobile APK/
├── android/           # Android native project (after cap:add)
├── ios/               # iOS native project (after cap:add)
├── src/
│   ├── components/    # React components
│   ├── pages/         # Page components
│   ├── services/      # API and platform services
│   │   ├── platformService.js   # Native bridge
│   │   ├── syncService.js       # Cross-device sync
│   │   └── updateService.js     # OTA updates
│   ├── store/         # State management
│   └── hooks/         # Custom hooks
├── public/            # Static assets
├── capacitor.config.json  # Capacitor config
└── package.json
```

## Troubleshooting

### Build fails with "SDK not found"
- Ensure Android Studio is installed
- Run Android Studio once to download SDK
- Verify `ANDROID_HOME` is set correctly

### Build fails with "Java not found"
- Install JDK 17 from Adoptium
- Verify `JAVA_HOME` is set correctly
- Restart terminal after setting environment variables

### App crashes on launch
- Check that `.env` has correct Supabase credentials
- Verify Supabase project is accessible
- Check Android logs: `adb logcat`

## License

MIT - Guardian Systems
