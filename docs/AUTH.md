# Rally Authentication (additive layer)

This is a real authentication foundation built on Supabase Auth. It ships
**dormant**: nothing here changes the current coming-soon access-code gate or
the local-first demo. The app keeps working exactly as before until you
deliberately turn auth on.

No em-dash / en-dash anywhere in this project. ASCII only.

## What was added

| File | Role |
| --- | --- |
| `src/lib/supabase-browser.js` | Lazy, guarded browser Supabase client. `getBrowserSupabase()` returns `null` and `isConfigured()` returns `false` when the public env vars are absent. Separate from `src/lib/supabase.js` (the data store client) on purpose. |
| `src/lib/auth.js` | `signUp`, `signIn`, `signInWithGoogle`, `signOut`, `getSession`, `getUser`, `resetPassword`, `updatePassword`, and the `useSession()` hook. Every call is no-op-safe: with no env it returns `{ error: 'auth-not-configured', message }` instead of throwing. |
| `src/pages/SignIn.jsx` | Email + password sign in, plus continue-with-Google. |
| `src/pages/SignUp.jsx` | Account creation with a password strength hint and a "confirm your email" state. |
| `src/pages/ForgotPassword.jsx` | Request a password reset link. |
| `src/pages/auth-shell.jsx` | Shared dark-premium chrome + form controls (matches the gate/marketing look). |
| `src/pages/auth.css` | Self-contained styles, scoped under `.auth`. |
| `api/auth-session.js` | Optional serverless endpoint that validates a Supabase JWT server-side. |

## How it works

- The browser client is **lazy**. It is never constructed at import time unless
  both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are present, so
  importing any of these modules is side-effect free in the demo build.
- Every auth function short-circuits to a clear "not configured" result when
  the client is `null`. The auth screens still render (so you can preview them)
  but submitting explains that auth is not enabled, and the Google button is
  disabled with a note.
- `useSession()` subscribes to `onAuthStateChange` when configured and returns a
  stable signed-out state `{ session:null, user:null, loading:false,
  configured:false }` when not.
- Sessions persist in the browser (`persistSession: true`, auto refresh on).
- OAuth and email links redirect back to `/app`.

## Required environment variables

Client (Vite, must be prefixed `VITE_` to reach the browser bundle):

```
VITE_SUPABASE_URL=<your Supabase project URL>
VITE_SUPABASE_ANON_KEY=<your Supabase anon/public key>
```

Server (already present on Vercel for this project):

```
SUPABASE_URL=<same project URL>
SUPABASE_SERVICE_ROLE_KEY=<service role key, server only, never shipped to client>
```

`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are what light up the whole
client-side auth layer. `api/auth-session.js` uses the server pair only.

Set the two `VITE_` vars in Vercel (Project Settings > Environment Variables)
for the environments you want auth in, then redeploy so the build inlines them.

## Wiring the routes

The auth screens are not routed yet (App.jsx was intentionally left untouched).
To expose them, add three routes to the marketing/public `Routes` block in
`src/App.jsx` (they should be public, like the marketing site, not behind the
product gate):

```jsx
import SignIn from './pages/SignIn.jsx';
import SignUp from './pages/SignUp.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';

// inside the non-app <Routes> group:
<Route path="/signin" element={<SignIn />} />
<Route path="/signup" element={<SignUp />} />
<Route path="/forgot" element={<ForgotPassword />} />
```

Because `App.jsx` routes by first path segment (`PRODUCT_SEGS`), `/signin`,
`/signup`, and `/forgot` are NOT product segments, so they render inside the
public `MarketingShell` branch. The auth pages paint their own full-screen dark
shell over it, so they look standalone. (Optional: point the marketing nav
"Sign in" / "Get started" links in `src/marketing/kit.jsx` at `/signin` and
`/signup` instead of `/app`.)

You can expose these routes at any time even before flipping the gate: with no
env they render but clearly say auth is not enabled, so they are safe to ship
early.

## Flipping the app from the access-code gate to real auth

Today `src/App.jsx` gates the product with the coming-soon access code:

```jsx
if (!unlocked) return <ComingSoon onUnlock={() => setUnlocked(true)} />;
```

When you are ready to move from the shared access code to per-user accounts,
gate on a real session instead. Recommended: a feature flag so you can switch
back instantly.

1. Add a build-time flag, e.g. `VITE_AUTH_MODE=supabase` (default unset = keep
   the access-code gate).
2. In `src/App.jsx`, replace the single gate line with a mode check (sketch):

```jsx
import { useSession } from './lib/auth.js';
import { Navigate, useLocation } from 'react-router-dom';

const AUTH_MODE = import.meta.env.VITE_AUTH_MODE; // 'supabase' | undefined

// inside App(), before rendering the product shell:
const { session, loading, configured } = useSession();

if (AUTH_MODE === 'supabase' && configured) {
  if (loading) return null; // or a splash
  if (!session) return <Navigate to="/signin" replace state={{ from: loc.pathname }} />;
  // signed in: fall through to the product shell
} else if (!unlocked) {
  return <ComingSoon onUnlock={() => setUnlocked(true)} />;
}
```

With `VITE_AUTH_MODE` unset (or Supabase env absent), behavior is identical to
today: the access-code gate. Set `VITE_AUTH_MODE=supabase` **and** provide the
`VITE_SUPABASE_*` env vars to require a real login.

3. Add a sign-out control somewhere in the product chrome (the sidebar user
   footer in `App.jsx` is the natural home) that calls `signOut()` from
   `src/lib/auth.js` and navigates to `/signin`.

4. (Optional) Bridge the authenticated user into the data store. Today
   `getCurrentUser()` in `src/lib/store.js` returns the seeded demo user
   `{ id, name, email, role, title, quota }`. When you go live, map the
   Supabase user onto that shape (or extend the store to read the session) so
   the product greets the real person. This is a data-store change, out of
   scope for this additive layer.

## Server-side token checks (optional)

Any serverless route that needs to trust the caller can validate the client's
Supabase access token:

- From the browser, get the token with `getSession()` (`session.access_token`)
  and send it as `Authorization: Bearer <jwt>`.
- `POST /api/auth-session` (or GET with the header) returns `{ ok:true, user }`
  for a valid token, `401` for a missing/invalid one, and `503` when the server
  env is not configured. Reuse `getAdmin()` / the `admin.auth.getUser(token)`
  pattern inside other routes as needed.

## Safety guarantees

- Nothing constructs a Supabase client or throws when env is missing.
- The coming-soon gate, local-first store, and marketing site are untouched.
- Turning auth on is entirely env-var + a small `App.jsx` edit; turning it off
  is removing the env var or the flag.
