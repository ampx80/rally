# Rally Mobile - Mac setup, build, and ship guide

Step-by-step instructions for developing, building, and submitting **Rally
Mobile** to the App Store and Google Play from a **macOS** machine. This is the
hands-on companion to [`README.md`](./README.md); the README has the
architecture overview and the full TODO checklist.

A Mac is required for iOS: only macOS can run the iOS simulator locally, and
some App Store steps assume Xcode is installed. Android work can be done from
any OS, but this guide covers both from a single Mac.

---

## 1. Install the toolchain

Run these in Terminal.

### Homebrew (package manager)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### Node.js (18 or 20 LTS) + npm

Either download from https://nodejs.org, or use nvm:

```bash
brew install nvm
mkdir -p ~/.nvm
# add the nvm lines Homebrew prints to your ~/.zshrc, then reopen Terminal
nvm install 20
nvm use 20
node -v      # expect v20.x
npm -v
```

### EAS CLI (cloud builds + submission)

```bash
npm i -g eas-cli
eas --version
```

### Xcode (iOS simulator + iOS submission)

1. Install **Xcode** from the Mac App Store (large download).
2. Launch it once to install additional components and accept the license.
3. Set command-line tools and accept the license from Terminal:

   ```bash
   sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
   sudo xcodebuild -license accept
   ```

4. Install a simulator runtime: Xcode > Settings > Platforms > iOS.
5. (Optional but handy) install Watchman for faster file watching:

   ```bash
   brew install watchman
   ```

### Android Studio (Android emulator + SDK)

1. Install from https://developer.android.com/studio (or `brew install --cask
   android-studio`).
2. Open it, run the setup wizard (installs the Android SDK + platform tools).
3. Create a virtual device: **More Actions > Virtual Device Manager > Create
   device** (e.g. Pixel 7, a recent system image).
4. Add the SDK tools to your PATH in `~/.zshrc`:

   ```bash
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator
   ```

   Reopen Terminal and confirm: `adb --version`.

### Expo Go (optional, on your phone)

Install **Expo Go** from the App Store / Play Store to run the app on a
physical device during development.

---

## 2. Get the app running locally

From the repo:

```bash
cd rally/mobile
npm install
npx expo start
```

In the Metro terminal:

- Press **`i`** to open the iOS simulator (Xcode required).
- Press **`a`** to open the Android emulator (Android Studio required).
- Press **`w`** for the web preview.
- Or scan the QR code with **Expo Go** on your phone (same Wi-Fi).

The app boots into demo mode with a full seeded book of business; no login or
backend is required. See the README section "API client + demo mode" for how
that works.

### Add the image assets first

Before building (and ideally before the first `expo start`), add the three
PNGs to `assets/`:

- `assets/icon.png` (1024 x 1024)
- `assets/splash.png` (tall portrait, e.g. 1284 x 2778, on `#12151c`)
- `assets/adaptive-icon.png` (1024 x 1024, Android foreground)

Specs and a placeholder recipe are in [`assets/README.md`](./assets/README.md).
`app.json` already references these paths.

---

## 3. Create the developer accounts

- **Apple Developer Program** (paid, $99/yr): https://developer.apple.com/programs/
  - Find your **Apple Team ID** (10 chars) under Membership. You will need it.
- **App Store Connect:** https://appstoreconnect.apple.com
- **Google Play Console** (one-time $25): https://play.google.com/console
- **Expo account** (free, for EAS): https://expo.dev/signup

---

## 4. Create the App Store Connect app (iOS)

1. In the Apple Developer portal > **Certificates, Identifiers & Profiles >
   Identifiers**, register an App ID with the bundle id **`com.rallyhq.app`**
   if it does not already exist.
2. In **App Store Connect > Apps > +** create a new app:
   - Platform: iOS
   - Name: **Rally**
   - Bundle ID: **com.rallyhq.app**
   - SKU: any unique string (e.g. `rally-ios`)
3. Open the new app's **App Information** page and copy its numeric **Apple ID**
   (this is the **ASC app id**). Save it for `eas.json`.

---

## 5. Create the Google Play app (Android)

1. In **Play Console > Create app**: name **Rally**, pick language, app type,
   free/paid.
2. Complete **App content** declarations (privacy policy URL, data safety,
   content rating, target audience, ads).
3. Create a **service account** for automated submission:
   - Play Console > **Setup > API access**.
   - Create a new service account in the linked Google Cloud project.
   - Grant it the **Release manager** (or at least release) permission in Play
     Console.
   - Create and download a **JSON key** for the service account.
   - Save the JSON file somewhere local and note its path (do **not** commit
     it; it is a secret).
4. The Android package `com.rallyhq.app` is claimed on your first upload to any
   track.

---

## 6. Fill in `eas.json` and `app.json`

Edit the TODO placeholders. In `eas.json` under `submit.production`:

```json
"ios": {
  "appleId": "you@example.com",              // your Apple Developer email
  "ascAppId": "1234567890",                  // numeric ASC app id from step 4
  "appleTeamId": "ABCDE12345"                // 10-char Team ID from Membership
},
"android": {
  "serviceAccountKeyPath": "/absolute/path/to/play-service-account.json",
  "track": "internal"
}
```

`extra.eas.projectId` in `app.json` (`TODO-replace-with-eas-project-id`) is set
automatically by `eas build:configure` in the next step.

---

## 7. Log in and configure EAS

```bash
eas login                 # your Expo account
eas build:configure       # links project, writes app.json extra.eas.projectId
```

The build profiles already exist in `eas.json`:

- **development** dev client, internal distribution
- **preview** internal distribution (Android = APK) for quick sharing
- **production** store build, remote auto-incremented version

---

## 8. Build

```bash
# iOS App Store build
eas build --platform ios --profile production

# Android Play Store build
eas build --platform android --profile production

# or both
eas build --platform all --profile production
```

- **iOS:** EAS will offer to manage your distribution certificate and
  provisioning profile. Accept unless you manage credentials manually. You must
  be signed in with an account that has access to Team ID `appleTeamId`.
- **Android:** EAS generates and stores the upload keystore for you.

Builds run in Expo's cloud; the terminal prints a link to watch progress and
download the artifact.

---

## 9. Submit to the stores

With the `eas.json` TODOs filled (step 6):

```bash
eas submit --platform ios --profile production
eas submit --platform android --profile production
```

- **iOS:** the build is uploaded to App Store Connect. After Apple processing
  it shows up in **TestFlight**. Add internal testers under TestFlight, then
  submit for App Store review from the App Store tab when ready.
- **Android:** the build is uploaded to the **internal testing** track (per
  `eas.json`). Add testers in Play Console > Testing > Internal testing, share
  the opt-in link, and promote up the track ladder (internal > closed > open >
  production) when ready. Promotion reuses the same build; no rebuild needed.

---

## 10. Beta testing

- **TestFlight (iOS):** up to 100 internal testers get builds immediately with
  no review. External testers (up to 10,000) require a light Beta App Review.
- **Play internal testing (Android):** up to 100 testers via an email list and
  an opt-in URL, near-instant, no review.

---

## 11. Push notifications (optional, not yet wired)

`expo-notifications` is registered as a plugin in `app.json`, but the app does
**not** yet request a push token or upload one to the backend. To turn push on:

1. **App code:** after auth, request permission and call
   `Notifications.getExpoPushTokenAsync()`, then POST the token to the Rally web
   API so it can target the device. Keep the app usable if permission is denied.

2. **iOS (APNs):** in the Apple Developer portal create an **APNs Auth Key
   (.p8)**, then register it with Expo:

   ```bash
   eas credentials      # iOS > Push Notifications > add APNs key
   ```

3. **Android (FCM):** create a Firebase project, add an Android app with package
   `com.rallyhq.app`, download the **FCM V1 service account JSON**, and upload
   it:

   ```bash
   eas credentials      # Android > FCM V1 > upload service account JSON
   ```

4. **Test:** use https://expo.dev/notifications or POST to
   `https://exp.host/--/api/v2/push/send` with the device's Expo push token.

---

## 12. Environment and secrets

`EXPO_PUBLIC_*` variables are baked into the JS bundle at build time. For local
runs, export them in your shell or an `.env` file. For cloud builds, register
them as EAS secrets:

```bash
eas secret:create --scope project --name EXPO_PUBLIC_AUTH_LIVE --value 1
eas secret:create --scope project --name EXPO_PUBLIC_ROOK_LIVE --value 1
```

| Variable | Effect | Default |
| --- | --- | --- |
| `EXPO_PUBLIC_AUTH_LIVE` | `1` routes sign-in through `/api/auth-session`. | unset (demo) |
| `EXPO_PUBLIC_ROOK_LIVE` | `1` routes Rook through `/api/rook`. | unset (canned) |

The web API base URL is **not** an env var; it lives in `app.json` at
`extra.apiBaseUrl` (default `https://rally-psi-five.vercel.app`). Edit it there
to point at a different backend (staging, local tunnel, etc.).

---

## 13. TODO summary (Mac)

| TODO | Where | Value |
| --- | --- | --- |
| EAS project id | `app.json` extra.eas.projectId | set by `eas build:configure` |
| Apple ID email | `eas.json` submit.production.ios.appleId | your Apple Dev email |
| ASC app id | `eas.json` submit.production.ios.ascAppId | numeric id from App Store Connect |
| Apple Team ID | `eas.json` submit.production.ios.appleTeamId | 10-char Team ID |
| Play service account | `eas.json` submit.production.android.serviceAccountKeyPath | local path to JSON key |
| icon / splash / adaptive-icon | `assets/` | the three PNGs (see assets/README.md) |
| APNs key + FCM JSON | `eas credentials` | only if enabling push |

Once every row is filled, `eas build --profile production` followed by
`eas submit --profile production` for each platform ships Rally to TestFlight
and Play internal testing.
