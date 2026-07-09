# Easy Agra — Android App

## Setup

### Prerequisites (on your local machine or CI)

- Android Studio (latest stable)
- JDK 17+
- Android SDK with:
  - SDK Platform 34 (or `compileSdkVersion` from `build.gradle`)
  - Android SDK Build-Tools
  - Android SDK Platform-Tools

### First-time setup

```bash
# 1. Install dependencies
cd artifacts/easy-agra
pnpm install

# 2. Build the web app
pnpm run cap:build

# 3. Sync web assets into the Android project
pnpm run cap:sync

# 4. Open Android Studio
pnpm run cap:android
```

### Build signed AAB for Google Play Store

```bash
# 1. Create a keystore (do this once, keep it safe)
keytool -genkey -v -keystore upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias easyagra-upload

# 2. Set environment variables (or add to local.properties)
export ANDROID_KEYSTORE_PATH="upload-keystore.jks"
export ANDROID_KEYSTORE_PASSWORD="your-password"
export ANDROID_KEY_ALIAS="easyagra-upload"
export ANDROID_KEY_PASSWORD="your-password"

# 3. Build signed AAB
cd android
./gradlew bundleRelease

# 4. Output: android/app/build/outputs/bundle/release/app-release.aab
```

### Build unsigned APK for testing

```bash
cd android
./gradlew assembleDebug
# Output: android/app/build/outputs/apk/debug/app-debug.apk
```

## App Details

| Property | Value |
|----------|-------|
| App Name | Easy Agra |
| Package ID | `com.easyagra.app` |
| Version | 1.0 |
| Target SDK | Platform 34 |
| Min SDK | 22 |

## Project Structure

```
android/
  app/
    src/main/
      java/com/easyagra/app/MainActivity.java
      res/                  # Icons, splash, colors, strings
      AndroidManifest.xml
    build.gradle
  build.gradle
```

## Notes

- `capacitor.config.ts` controls the Capacitor bridge settings
- `android:usesCleartextTraffic="true"` allows HTTP for local dev
- For production, consider removing `usesCleartextTraffic` and using HTTPS only
- Keystore credentials should never be committed to git
