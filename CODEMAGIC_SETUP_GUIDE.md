# Codemagic CI/CD Setup Guide for Easy Agra

## Overview

This guide helps you build a signed Android App Bundle (AAB) for Google Play Store using **Codemagic CI/CD** — no PC or Android Studio required.

All builds run in the cloud. You only need a browser on your Android phone.

---

## One-Click APK Download (GitHub Actions)

The easiest way to get an APK:

1. Go to your GitHub repository: **https://github.com/stayagra1-a11y/Easy-Agra**
2. Click **"Actions"** tab at the top
3. Click **"Build APK"** workflow on the left
4. Click the **latest green run** (top of the list)
5. Scroll down to **"Artifacts"** section
6. Click **"easy-agra-apk"** → ZIP download ho jayega
7. ZIP extract karein → APK file phone mein install karein

**OR**

1. Go directly to: **https://github.com/stayagra1-a11y/Easy-Agra/actions**
2. Latest successful run par click karein
3. **Artifacts** → **easy-agra-apk** download karein

---

## Step 1: Create a Codemagic Account

1. Open your phone browser and go to: **https://codemagic.io**
2. Sign up with your **GitHub** account (same one where `Easy-Agra` repo is hosted)
3. Authorize Codemagic to access your repositories

---

## Step 2: Add Your App to Codemagic

1. In Codemagic dashboard, click **"Add application"**
2. Select **GitHub** as the source
3. Find and select your repository: **stayagra1-a11y/Easy-Agra**
4. Choose the **main** branch
5. Click **"Add application"**

---

## Step 3: Configure Android Signing (Keystore)

You need a keystore to sign the AAB for Play Store upload.

### Option A: Generate Keystore in Codemagic (Recommended)

1. In your app settings, go to **"Code signing"** 
2. Click **"Android keystore"** tab
3. Click **"Generate a new keystore"**
4. Fill in:
   - **Keystore name**: `easy_agra_keystore`
   - **Key alias**: `release`
   - **Key password**: Choose a strong password
   - **Keystore password**: Same as key password (or different)
5. Click **"Generate"**
6. **Download** the keystore file (.jks) — save it safely, you will need it for Play Store

### Option B: Generate Keystore via Script (If you have access to any computer)

```bash
# Run this on any Mac/Linux/Windows with Java installed
keytool -genkey -v -keystore easy-agra-upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias release -storepass YOUR_PASSWORD -keypass YOUR_PASSWORD -dname "CN=Easy Agra, OU=App, O=EasyAgra, L=Agra, ST=UP, C=IN"

# Convert to base64 for Codemagic
base64 -i easy-agra-upload-keystore.jks -o keystore.b64.txt
```

---

## Step 4: Upload Keystore to Codemagic

If you used Option A (Codemagic generated), it's already there.

If you used Option B (manual):
1. Go to **"Code signing" > "Android keystore"**
2. Click **"Upload keystore"**
3. Select your `.jks` file
4. Set the keystore reference name to: **easy_agra_keystore**

---

## Step 5: Set Environment Variables

Go to **"Environment variables"** and add these as a group named `easy_agra_secrets`:

| Variable | Value | Secret? |
|----------|-------|---------|
| `CM_KEYSTORE_PASSWORD` | Your keystore password | Yes |
| `CM_KEY_ALIAS` | `release` | No |
| `CM_KEY_PASSWORD` | Your key password | Yes |
| `CM_EMAIL` | your-email@gmail.com | No |

### How to add:
1. Click **"Add variable group"**
2. Name: `easy_agra_secrets`
3. Add each variable above
4. For password fields, tick **"Encrypt"** to make them secrets
5. Click **"Add"**

---

## Step 6: Configure Build Settings

1. Go to **"Build settings"**
2. Make sure the workflow file `codemagic.yaml` is detected
3. Verify the workflow name shows: **Easy Agra Android Release**

---

## Step 7: Trigger Your First Build

### Option A: Manual Build
1. Click **"Start new build"**
2. Select the **main** branch
3. Click **"Start new build"**
4. Wait ~10-15 minutes
5. Download the AAB from the build artifacts

### Option B: Automatic Build on Push
- Push any change to the `main` branch
- Codemagic automatically starts a build

---

## Step 8: Download AAB/APK for Play Store

1. After build completes, go to the build page
2. Click **"Artifacts"** tab
3. Download:
   - `.aab` file → **Play Store upload**
   - `.apk` file → **Direct install on phone**

---

## Build Outputs

| File | Purpose |
|------|---------|
| `app-release.aab` | **Play Store upload** (recommended) |
| `app-release.apk` | Direct install (optional) |

---

## Troubleshooting

### Build fails at "Install dependencies"
- Make sure `pnpm-lock.yaml` exists in the repo root
- Check that Node.js 20 is selected in environment settings

### Build fails at "Build Android AAB"
- Verify keystore is uploaded correctly
- Check environment variables are set
- Review the build logs for specific Gradle errors

### AAB is unsigned
- Make sure `android/app/build.gradle` has the correct signing config
- Verify keystore reference name matches: `easy_agra_keystore`

### Capacitor sync fails
- Make sure web build succeeded (dist/public/index.html exists)
- Check that `@capacitor/android` is in devDependencies

---

## Google Play Console Upload Steps

After downloading AAB:

1. Open **https://play.google.com/console** on your phone browser
2. Go to your app → **Production** tab
3. Click **"Create new release"**
4. Upload the `.aab` file
5. Fill release notes
6. Click **"Start rollout to Production"**

---

## Complete File Structure

```
Easy-Agra/
  codemagic.yaml                  ← CI/CD workflow (this file)
  .github/workflows/build-apk.yml ← GitHub Actions APK build
  artifacts/
    easy-agra/
      android/
        app/
          build.gradle            ← Signing config reads env vars
  CODEMAGIC_SETUP_GUIDE.md         ← This guide
```

---

## Need Help?

- Codemagic Docs: https://docs.codemagic.io
- Capacitor Android Guide: https://capacitorjs.com/docs/android
- Google Play Console: https://play.google.com/console

---

## Summary

With this setup:
- **GitHub Actions** → One-click APK download from Actions tab
- **Codemagic** → Signed AAB for Play Store on every push
- No Android Studio, no PC needed
- Build entirely on your phone via browser
