# Easy Agra — Android App Build Guide

## ✅ Already Done in Replit (Complete)

| Task | Status |
|------|--------|
| Capacitor installed (core, cli, android v8.4.1) | ✅ |
| Android platform created (`npx cap add android`) | ✅ |
| Web assets synced to `android/app/src/main/assets/public/` | ✅ |
| App Name: **Easy Agra** | ✅ |
| Package ID: **com.easyagra.app** | ✅ |
| App icons generated from logo (48px to 192px) | ✅ |
| Splash screens (portrait + landscape, all densities) | ✅ |
| AndroidManifest permissions (Internet, Camera, Location, Storage) | ✅ |
| build.gradle with release signing config | ✅ |
| WebView header fixes (sticky, z-index, safe-area) | ✅ |
| Dark teal brand color (#0d2b20) | ✅ |
| Gradle 8.14 + Android Gradle Plugin 8.13 configured | ✅ |

## ❌ Cannot Do in Replit (Requires Your Machine)

| Task | Why |
|------|-----|
| Run `./gradlew assembleDebug` | Needs Java JDK 17+ |
| Run `./gradlew bundleRelease` | Needs Java JDK + Android SDK |
| Generate signed APK/AAB | Needs keystore + Android Studio |

---

## 💾 What You Need on Your Machine

1. **Android Studio** (latest stable) — download from [developer.android.com/studio](https://developer.android.com/studio)
2. **JDK 17** (Android Studio bundles one, or install separately)
3. **Android SDK** (installed automatically by Android Studio)

---

## 🚀 Build Steps

### Step 1: Open Android Studio

Open the `android/` folder directly in Android Studio:
```bash
cd easy-agra/android
# Android Studio will auto-detect the Gradle project
```

### Step 2: First Build (Debug APK)

In Android Studio, or via terminal:
```bash
cd easy-agra/android
./gradlew assembleDebug
```
Output: `android/app/build/outputs/apk/debug/app-debug.apk`

### Step 3: Create Keystore for Play Store

```bash
cd easy-agra/android
keytool -genkey -v \
  -keystore upload-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias easyagra-upload
```

### Step 4: Set Signing Credentials

Option A — Environment variables:
```bash
export ANDROID_KEYSTORE_PATH="upload-keystore.jks"
export ANDROID_KEYSTORE_PASSWORD="your-password"
export ANDROID_KEY_ALIAS="easyagra-upload"
export ANDROID_KEY_PASSWORD="your-password"
```

Option B — `local.properties` file (in `android/` folder, **never commit to git**):
```properties
storeFile=upload-keystore.jks
storePassword=your-password
keyAlias=easyagra-upload
keyPassword=your-password
```

### Step 5: Build Release AAB for Play Store

```bash
cd easy-agra/android
./gradlew bundleRelease
```
Output: `android/app/build/outputs/bundle/release/app-release.aab`

This `.aab` file is what you upload to Google Play Console.

### Step 6: Build Release APK (alternative)

```bash
cd easy-agra/android
./gradlew assembleRelease
```
Output: `android/app/build/outputs/apk/release/app-release.apk`

---

## 📝 App Details

| Property | Value |
|----------|-------|
| App Name | Easy Agra |
| Package | `com.easyagra.app` |
| Version | 1.0 |
| Version Code | 1 |
| Min SDK | 24 (Android 7.0) |
| Target SDK | 36 (Android 16) |
| Compile SDK | 36 |
| Gradle | 8.14.3 |
| AGP | 8.13.0 |
| Capacitor | 8.4.1 |

---

## 🖼️ Permissions Included

```xml
INTERNET                 → Required for API calls
ACCESS_NETWORK_STATE     → Check connectivity
CAMERA                   → Photo uploads
READ_EXTERNAL_STORAGE    → Gallery access (API ≤32)
READ_MEDIA_IMAGES        → Gallery access (API 33+)
ACCESS_FINE_LOCATION     → Maps & nearby search
ACCESS_COARSE_LOCATION   → Approximate location
```

---

## 🎯 Troubleshooting

**"JAVA_HOME is not set"**
```bash
export JAVA_HOME=/Applications/Android\ Studio.app/Contents/jbr/Contents/Home
# Or wherever your JDK is installed
```

**"Could not find com.android.tools.build:gradle"**
- Check internet connection
- Try `File → Invalidate Caches / Restart` in Android Studio

**Build fails with "capacitor-android not found"**
```bash
cd easy-agra
pnpm exec cap sync
```

---

## 📦 Project Files

Key files you may want to customize:

| File | Purpose |
|------|---------|
| `capacitor.config.ts` | Capacitor bridge settings |
| `android/app/src/main/AndroidManifest.xml` | Permissions & app config |
| `android/app/build.gradle` | Build config, signing, version |
| `android/app/src/main/res/values/strings.xml` | App name |
| `android/app/src/main/res/values/colors.xml` | Brand colors |
| `android/app/src/main/res/values/styles.xml` | Splash screen theme |

---

## 🆘 WebView Compatibility (Already Fixed)

The web app already has these fixes for Android WebView:
- Header: `sticky top-0 z-[9999] will-change-transform translateZ(0)`
- Safe-area padding: `pt-[env(safe-area-inset-top)]`
- Bottom nav: `pb-[env(safe-area-inset-bottom)]`
- Viewport: `viewport-fit=cover, user-scalable=no`
- CSS: `-webkit-overflow-scrolling: touch`, `overscroll-behavior-y: none`

---

## 💾 Next Steps After Build

1. Test `app-debug.apk` on a real Android device
2. Create a Google Play Developer account ($25 one-time fee)
3. Upload `app-release.aab` to Google Play Console
4. Fill in app details, screenshots, privacy policy
5. Submit for review
