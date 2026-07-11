// GET /api/migrate-callback?source=salesforce|hubspot&code=...
//
// Exchanges the OAuth code for an access token (server-side, using the
// client secret), seals it into a short-lived httpOnly cookie (see
// _lib-migrate.sealToken), then redirects back to the Import wizard
// with a connected flag so MigratePanel can offer object pulls. The
// token never touches client JS and never rides in a URL. When the
// source is not configured, it redirects back with a status the panel
// can explain, and the CSV path is untouched. NO em-dash / en-dash.
import {
  getProvider, isConfigured, originOf, sealToken, setTokenCookie,
} from './_lib-migrate.js';

async function exchangeSalesforce(provider, code, redirectUri) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code', code,
    client_id: process.env[provider.clientIdEnv], client_secret: process.env[provider.clientSecretEnv],
    redirect_uri: redirectUri,
  });
  const tok = await fetch(`https://${provider.loginHost()}/services/oauth2/token`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
  }).then(r => r.json());
  if (!tok.access_token) throw new Error(tok.error_description || tok.error || 'Token exchange failed.');
  return { accessToken: tok.access_token, instanceUrl: tok.instance_url };
}

async function exchangeHubspot(provider, code, redirectUri) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code', code,
    client_id: process.env[provider.clientIdEnv], client_secret: process.env[provider.clientSecretEnv],
    redirect_uri: redirectUri,
  });
  const tok = await fetch('https://api.hubapi.com/oauth/v1/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
  }).then(r => r.json());
  if (!tok.access_token) throw new Error(tok.message || tok.error || 'Token exchange failed.');
  return { accessToken: tok.access_token, instanceUrl: null };
}

export default async function handler(req, res) {
  const source = String((req.query && req.query.source) || '').toLowerCase();
  const back = (params) => {
    const q = new URLSearchParams({ migrate: '1', source, ...params });
    res.writeHead(302, { Location: `/import?${q}` });
    res.end();
  };

  try {
    const provider = getProvider(source);
    if (!provider) return back({ status: 'error', message: 'Unknown source.' });

    const err = req.query && req.query.error;
    const code = req.query && req.query.code;
    if (err) return back({ status: 'error', message: String(req.query.error_description || err).slice(0, 140) });
    if (!code) return back({ status: 'error', message: 'Missing authorization code.' });
    if (!isConfigured(source)) return back({ status: 'notconfigured' });

    const redirectUri = `${originOf(req)}/api/migrate-callback?source=${source}`;
    const info = source === 'salesforce'
      ? await exchangeSalesforce(provider, code, redirectUri)
      : await exchangeHubspot(provider, code, redirectUri);

    const sealed = sealToken(source, {
      accessToken: info.accessToken,
      instanceUrl: info.instanceUrl || null,
      exp: Date.now() + 55 * 60 * 1000, // ~55 min, inside typical token TTLs
    });
    res.setHeader('Set-Cookie', setTokenCookie(source, sealed, 3600));
    return back({ status: 'connected' });
  } catch (e) {
    return back({ status: 'error', message: (e?.message || 'Migration connect failed.').slice(0, 140) });
  }
}
