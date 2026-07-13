# Rally mobile - app assets

Drop three PNG image files into this `assets/` folder before you build or
submit. They are referenced by `app.json` and are intentionally NOT checked
in as binaries so the repo stays diffable. Sizes below are hard requirements
for the app stores and Expo.

## Required files

| File | Size | Notes |
| --- | --- | --- |
| `icon.png` | 1024 x 1024 px | Master app icon. Square, no transparency, no rounded corners (the OS masks it). Also used as the web favicon. |
| `splash.png` | 1284 x 2778 px (or any tall portrait) | Launch screen art. Sits on a `#12151c` background (see `app.json` splash.backgroundColor). Keep the logo centered with padding; `resizeMode` is `contain`. |
| `adaptive-icon.png` | 1024 x 1024 px | Android adaptive icon FOREGROUND only. Keep the logo inside the center ~66% safe zone - Android crops the outer ring into circles/squircles. Background is the flat `#12151c` from `app.json`. |

## Brand

- Accent: `#5b4bf5` (Rally purple)
- Dark ink / background: `#12151c`
- Keep the mark simple and high-contrast so it reads at 40 px on a home screen.

## Quick way to generate placeholders

Until final art exists, you can export a 1024x1024 purple square with a white
"R" from any design tool, duplicate it to all three names, and the build will
succeed. Replace with real art before store submission.

## After adding files

No code change is needed - `app.json` already points at these paths. Run
`npx expo start` and the icon/splash pick up automatically.
