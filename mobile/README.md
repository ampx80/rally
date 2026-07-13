# Rally Mobile

The native iOS and Android app for **Rally**, the AI-native CRM. Built with
[Expo](https://expo.dev) (managed workflow) and
[expo-router](https://docs.expo.dev/router/introduction/) file-based routing.
It talks to the same backend as the Rally web app
(`https://rally-psi-five.vercel.app`) and ships with a full local-first demo
mode so every screen renders rich content with no network and no login.

- **Framework:** Expo SDK 51, React Native 0.74, React 18
- **Routing:** expo-router 3 (file-based, `app/` tree)
- **Bundle id / package:** `com.rallyhq.app` (both platforms)
- **Web API base:** `https://rally-psi-five.vercel.app` (override via config)
- **Build + submit:** EAS Build + EAS Submit

> Mac-specific, step-by-step store submission instructions live in
> [`SETUP_MAC.md`](./SETUP_MAC.md). This README is the platform-agnostic
> overview. Both cover the same TODOs so you can work from either one.

---

## What this is

Rally Mobile is a thin, resilient native client over the Rally CRM API. The
design goals:

1. **Always usable.** The app boots straight into a seeded demo book of
   business (companies, contacts, deals, activities, inbox, notifications).
   No sign-in required. Real auth is env-gated and off by default.
2. **Never crashes on the network.** Every API call is wrapped so it returns
   `{ ok, data, error }` instead of throwing, and successful GETs are cached
   to disk and re-served when offline.
3. **Store-ready.** `app.json` and `eas.json` are pre-configured for the
   Apple App Store and Google Play. The only blanks are the account-specific
   IDs, which are flagged as `TODO` (see
   [TODO checklist](#todo-checklist-fill-before-you-ship)).

---

## Prerequisites

Install these before doing anything else.

| Tool | Why | Install |
| --- | --- | --- |
| **Node.js 18 or 20 LTS** | Runs Expo, Metro, EAS CLI. | https://nodejs.org (or `nvm`) |
| **npm** | Ships with Node. `yarn`/`pnpm` also fine. | bundled with Node |
| **EAS CLI** | Cloud builds + store submission. | `npm i -g eas-cli` |
| **Expo Go app** | Fastest way to run on a real phone during development. | App Store / Play Store on your device |
| **Xcode** (macOS only) | iOS simulator + required for iOS builds/submission. | Mac App Store |
| **Android Studio** | Android emulator + SDK/platform tools. | https://developer.android.com/studio |

Notes:

- You do **not** need Xcode or Android Studio to run in **Expo Go** or to run
  cloud EAS builds. You need Xcode to launch the iOS **simulator** locally, and
  Android Studio to launch the Android **emulator** locally.
- Building and submitting the iOS app to the App Store requires a **macOS
  machine** for some steps and a paid **Apple Developer Program** membership
  ($99/yr). Android submission requires a **Google Play Console** account
  (one-time $25).
- Create a free Expo account at https://expo.dev/signup. EAS builds run in
  Expo's cloud and are tied to that account.

---

## Local run

From `rally/mobile/`:

```bash
npm install          # install dependencies (first time, and after pulls)
npx expo start       # start the Metro dev server
```

The dev server prints a QR code and a menu. Then:

- Press **`i`** to open the **iOS simulator** (requires Xcode).
- Press **`a`** to open the **Android emulator** (requires Android Studio with
  a virtual device created).
- Press **`w`** to open the app in a **web browser** (Metro web output).
- **Scan the QR code** with the **Expo Go** app on a physical iPhone/Android to
  run on a real device over the same network. This is the fastest loop and
  needs no native toolchain.

Convenience scripts (in `package.json`) do the same:

```bash
npm run ios          # expo start --ios
npm run android      # expo start --android
npm run web          # expo start --web
npm run lint         # expo lint
```

Hot reload is on by default. Press **`r`** in the terminal to reload, **`m`**
to toggle the dev menu.

### First-run assets

The three image assets are intentionally **not** committed as binaries. Before
your first build (and ideally before your first `expo start`), add them:

- `assets/icon.png` (1024 x 1024)
- `assets/splash.png` (tall portrait, e.g. 1284 x 2778)
- `assets/adaptive-icon.png` (1024 x 1024, Android foreground)

See [`assets/README.md`](./assets/README.md) for exact specs and a quick way to
generate placeholders. `app.json` already points at these paths, so no code
change is needed once the files exist.

---

## Project structure

```
mobile/
  app.json              Expo app config (name, bundle ids, icon/splash, plugins, extra.apiBaseUrl)
  eas.json              EAS Build profiles + EAS Submit credentials (has TODOs)
  package.json          deps + scripts (main = "expo-router/entry")
  babel.config.js       babel-preset-expo
  metro.config.js       default Expo Metro config
  assets/               icon.png / splash.png / adaptive-icon.png (add these; see assets/README.md)

  app/                  expo-router file-based routes (each file = a screen)
    _layout.jsx         ROOT layout: SafeAreaProvider + AuthProvider + auth gate + stack
    (auth)/
      _layout.jsx       auth group layout
      sign-in.jsx       branded entry screen (real sign-in env-gated; demo otherwise)
    (tabs)/
      _layout.jsx       bottom tab bar
      index.jsx         Home / dashboard tab
      deals.jsx         Deals pipeline tab
      contacts.jsx      Contacts tab
      inbox.jsx         Inbox tab
      more.jsx          More menu tab
    deal/[id].jsx       Deal detail (dynamic route)
    contact/[id].jsx    Contact detail (dynamic route)
    activities.jsx      Activities list
    companies.jsx       Companies list
    notifications.jsx   Notification feed
    rook.jsx            Rook AI operator (modal; env-gated live mode)
    settings.jsx        Settings (appearance, notifications, connection, data, sign out)

  src/                  shared infrastructure (NOT routes)
    api.js              resilient fetch client (see below)
    auth.js             AuthProvider + useAuth (demo mode + env-gated live auth)
    store.js            local-first seeded data store (companies/contacts/deals/etc.)
    theme.js            useTheme() + light/dark tokens
    ui.jsx              shared UI primitives (Screen, Card, Row, Button, Badge, etc.)
```

Routing rule of thumb: anything in `app/` is a screen and its filename is its
URL path. Groups in parentheses like `(tabs)` and `(auth)` organize routes
without adding a path segment. Dynamic segments use brackets: `deal/[id].jsx`.
Shared code that is not a screen lives in `src/`.

---

## API client + demo mode

### The API client (`src/api.js`)

A tiny fetch wrapper with four exported verbs: `get`, `post`, `put`, `del`,
plus `ping()`.

- **Base URL resolution:** `Constants.expoConfig.extra.apiBaseUrl` (from
  `app.json`) wins, then a legacy manifest field, then the hardcoded default
  `https://rally-psi-five.vercel.app`. Change the base by editing
  `extra.apiBaseUrl` in `app.json`.
- **Never throws.** Every call returns `{ ok, status, data, error, fromCache }`.
  A screen checks `ok` and renders an offline fallback on failure instead of
  crashing.
- **Cache-first-on-failure.** Successful GET responses are written to
  AsyncStorage. On a network error or timeout (12s default) the client serves
  the last cached body with `fromCache: true` if one exists.
- **Auth header.** `setAuthToken(token)` stores a bearer token in module scope;
  every subsequent request sends `Authorization: Bearer <token>`. `src/auth.js`
  calls this after a real sign-in.
- **Helpers.** `ping()` probes `/api/health` (5s timeout, returns a boolean).
  `clearApiCache()` wipes all cached GET bodies.

### Demo mode (`src/auth.js` + `src/store.js`)

The app is fully functional with no account and no backend.

- On boot, if there is no persisted session the auth gate sends the user to the
  sign-in screen; tapping through enters **demo mode** (`isDemo === true`) with
  a seeded identity (Jordan Avery, mirroring the web seed).
- All screens read from **`src/store.js`**, a deterministic local-first store
  (mulberry32 PRNG seed) that builds a believable book of business and persists
  to AsyncStorage. No network is needed for any screen to render.
- **Live auth is env-gated.** `signIn()` only calls the real API
  (`POST /api/auth-session`) when `EXPO_PUBLIC_AUTH_LIVE=1`. Otherwise it
  resolves to demo mode. This means the app ships store-ready even before the
  auth backend is wired.
- Similarly, the Rook AI screen calls the live `/api/rook` endpoint only when
  `EXPO_PUBLIC_ROOK_LIVE=1`; otherwise it responds from a local canned flow.

### Environment variables

Expo exposes `EXPO_PUBLIC_*` variables to the JS bundle at build time. Set them
in your shell, an `.env` file (see `.gitignore`; `.env.example` is allowed), or
as EAS secrets for cloud builds.

| Variable | Effect | Default |
| --- | --- | --- |
| `EXPO_PUBLIC_AUTH_LIVE` | `1` routes sign-in through `/api/auth-session`. | unset (demo) |
| `EXPO_PUBLIC_ROOK_LIVE` | `1` routes Rook messages through `/api/rook`. | unset (canned) |
| `extra.apiBaseUrl` (in `app.json`, not an env var) | Web API base URL for all requests. | `https://rally-psi-five.vercel.app` |

For EAS cloud builds, register secrets with:

```bash
eas secret:create --scope project --name EXPO_PUBLIC_AUTH_LIVE --value 1
```

---

## Store submission

This section is the platform-agnostic version. Mac users should follow
[`SETUP_MAC.md`](./SETUP_MAC.md), which walks the same path with Mac specifics.

### 0. One-time accounts

- **Apple Developer Program** membership (paid) at
  https://developer.apple.com/programs/ . Note your **Apple Team ID** (a
  10-character string, found under Membership).
- **App Store Connect** access at https://appstoreconnect.apple.com .
- **Google Play Console** account (paid one-time) at
  https://play.google.com/console .
- **Expo account** for EAS at https://expo.dev/signup .

### 1. Create the Apple app (App Store Connect)

1. In App Store Connect go to **Apps > +** and create a new app.
2. Platform iOS, set the name (**Rally**), primary language, and choose the
   bundle id **`com.rallyhq.app`**. If the bundle id is not listed, first
   register it in the Apple Developer portal under
   **Certificates, Identifiers & Profiles > Identifiers**.
3. After creation, copy the app's **Apple ID** number (the numeric ASC app id
   shown in the App Information page). You will paste it into `eas.json`.

### 2. Create the Google Play app (Play Console)

1. In Play Console go to **All apps > Create app**. Set the name (**Rally**),
   default language, app type, and free/paid.
2. Under **App content** complete the required declarations (privacy policy,
   data safety, content rating, target audience).
3. The Android package name **`com.rallyhq.app`** is claimed the first time you
   upload a build to any track.
4. Create a **service account** for automated submission:
   Play Console **Setup > API access** (or the linked Google Cloud project),
   create a service account, grant it release permissions, and download its
   JSON key. You will point `eas.json` at that JSON file.

### 3. Set the icon and splash assets

Add `assets/icon.png`, `assets/splash.png`, and `assets/adaptive-icon.png`
per [`assets/README.md`](./assets/README.md). They are already referenced by
`app.json` (`icon`, `splash.image`, `android.adaptiveIcon.foregroundImage`) and
the splash background is `#12151c`. Replace any placeholder art with final
branding before submitting.

### 4. Configure EAS

```bash
eas login                 # sign in to your Expo account
eas build:configure       # links the project + writes the eas projectId
```

`eas build:configure` fills in `extra.eas.projectId` in `app.json` (currently
`TODO-replace-with-eas-project-id`) and confirms the build profiles in
`eas.json`. The profiles are already defined:

- **development** internal dev client
- **preview** internal distribution (Android builds an APK)
- **production** store build with remote auto-incremented version

### 5. Build

```bash
# iOS production build (App Store)
eas build --platform ios --profile production

# Android production build (Play Store)
eas build --platform android --profile production

# or both at once
eas build --platform all --profile production
```

EAS runs the build in the cloud. For iOS it will prompt to create/manage the
distribution certificate and provisioning profile (let EAS manage them unless
you have a reason not to). For Android it manages the upload keystore.

### 6. Submit

Fill in the `submit.production` TODOs in `eas.json` first (see
[TODO checklist](#todo-checklist-fill-before-you-ship)), then:

```bash
eas submit --platform ios --profile production
eas submit --platform android --profile production
```

- **iOS** uploads the build to App Store Connect. It appears in **TestFlight**
  after Apple processing (a few minutes to an hour). Add internal testers in
  App Store Connect > TestFlight, then submit for App Store review when ready.
- **Android** uploads to the **internal testing** track (set in
  `eas.json > submit.production.android.track`). Add testers in Play Console >
  Testing > Internal testing, share the opt-in link, then promote to closed /
  open / production tracks when ready.

### 7. Testing tracks summary

- **TestFlight (iOS):** internal testers (up to 100, no review) get builds
  immediately; external testers require a light Beta App Review.
- **Play internal testing (Android):** up to 100 testers via an email list and
  opt-in URL; no review, near-instant availability. Promote the same build up
  the track ladder (internal > closed > open > production) without rebuilding.

---

## Push notifications

`expo-notifications` is already declared as a plugin in `app.json` (with the
Rally accent color `#5b4bf5`), but the **runtime registration code is not yet
wired** and there is no push token upload path in the app today. To enable real
push:

1. **Register for a push token** in the app (e.g. in the root layout after
   auth). Request permission, then call
   `Notifications.getExpoPushTokenAsync()`. Send the resulting Expo push token
   to the web API so the backend can target the device. (Handle the case where
   permission is denied gracefully; the app must remain usable without push.)

2. **iOS (APNs):** you need an Apple Push Notifications key. In the Apple
   Developer portal create an **APNs Auth Key (.p8)** and upload it to Expo:

   ```bash
   eas credentials      # choose iOS > Push Notifications > set up APNs key
   ```

   Expo uses the APNs key to deliver notifications to iOS devices.

3. **Android (FCM):** create a Firebase project, add an Android app with
   package `com.rallyhq.app`, and provide the **FCM server credentials**
   (the FCM V1 service account JSON) to Expo:

   ```bash
   eas credentials      # choose Android > FCM V1 > upload service account JSON
   ```

4. **Test** with the Expo push tool (https://expo.dev/notifications) or the
   backend by POSTing to `https://exp.host/--/api/v2/push/send` with the token.

Until this is wired, in-app notifications are served entirely from the local
store (`app/notifications.jsx` reads `src/store.js`), which needs no push
infrastructure.

---

## TODO checklist (fill before you ship)

Every blank the developer must fill, and where it lives:

| TODO | File / location | What to put |
| --- | --- | --- |
| EAS project id | `app.json` > `extra.eas.projectId` (`TODO-replace-with-eas-project-id`) | Auto-filled by `eas build:configure`, or paste from expo.dev. |
| Apple ID email | `eas.json` > `submit.production.ios.appleId` (`TODO-apple-id-email`) | Your Apple Developer account email. |
| ASC app id | `eas.json` > `submit.production.ios.ascAppId` (`TODO-app-store-connect-app-id`) | Numeric App Store Connect app id from step 1. |
| Apple Team ID | `eas.json` > `submit.production.ios.appleTeamId` (`TODO-apple-team-id`) | 10-char Team ID from Apple Developer > Membership. |
| Play service account key | `eas.json` > `submit.production.android.serviceAccountKeyPath` (`TODO-path-to-google-service-account.json`) | Local path to the Play service account JSON from step 2.4. |
| App icon | `assets/icon.png` | 1024x1024 master icon (see `assets/README.md`). |
| Splash art | `assets/splash.png` | Tall portrait launch art on `#12151c`. |
| Android adaptive icon | `assets/adaptive-icon.png` | 1024x1024 foreground, logo in center safe zone. |
| APNs key (push) | Expo credentials (`eas credentials`) | Apple .p8 push key, if enabling push. |
| FCM credentials (push) | Expo credentials (`eas credentials`) | Firebase FCM V1 service account JSON, if enabling push. |
| Push registration code | app source (not yet written) | Add `getExpoPushTokenAsync()` + token upload, if enabling push. |
| Live auth backend | `EXPO_PUBLIC_AUTH_LIVE=1` + `/api/auth-session` | Only when the auth API is ready; demo works without it. |

---

## Troubleshooting

- **Metro cache weirdness:** `npx expo start -c` clears the bundler cache.
- **iOS simulator will not open:** launch Xcode once, accept the license, and
  install a simulator runtime under Xcode > Settings > Platforms.
- **Android emulator not found:** open Android Studio > Device Manager and
  create a virtual device; ensure `adb` is on your PATH.
- **Build fails on missing assets:** confirm the three PNGs exist in `assets/`.
- **App shows old data:** the seeded store persists under key
  `rally_mobile_state_v1`; Settings > Data resets it, or bump `LS_KEY` in
  `src/store.js`.
