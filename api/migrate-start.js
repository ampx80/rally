// GET /api/migrate-start?source=salesforce|hubspot
//
// Begins an OAuth connect to a source CRM so Ardovo can pull records
// straight from its API (the live-migration counterpart to the CSV
// upload). When the source's OAuth client env is set
// (SALESFORCE_CLIENT_ID + SALESFORCE_CLIENT_SECRET, or
// HUBSPOT_CLIENT_ID + HUBSPOT_CLIENT_SECRET), it returns the provider
// consent URL. When it is NOT set it returns { configured:false } with
// a message pointing at the CSV import path, so the CSV flow is never
// affected. No secrets reach the client; only the public client_id is
// used to build the redirect. NO em-dash / en-dash.
//
// To enable, set on the Vercel project:
//   Salesforce: SALESFORCE_CLIENT_ID, SALESFORCE_CLIENT_SECRET
//               (+ optional SALESFORCE_LOGIN_URL for sandbox, SALESFORCE_SCOPES)
//   HubSpot:    HUBSPOT_CLIENT_ID, HUBSPOT_CLIENT_SECRET (+ optional HUBSPOT_SCOPES)
import { withErrorHandling } from './_utils.js';
import { getProvider, isConfigured, originOf } from './_lib-migrate.js';

export default withErrorHandling(async (req, res) => {
  const source = String((req.query && req.query.source) || '').toLowerCase();
  const provider = getProvider(source);
  if (!provider) {
    return res.status(200).json({ configured: false, message: 'Unknown migration source. Use salesforce or hubspot, or import a CSV.' });
  }

  if (!isConfigured(source)) {
    return res.status(200).json({
      configured: false,
      source,
      message: `${provider.label} API migration is not set up on this workspace yet. Add ${provider.clientIdEnv} + ${provider.clientSecretEnv} on Vercel, or import a CSV export instead.`,
    });
  }

  const clientId = process.env[provider.clientIdEnv];
  const redirectUri = `${originOf(req)}/api/migrate-callback?source=${source}`;
  const state = Buffer.from(JSON.stringify({ source, t: Date.now() })).toString('base64url');

  let url;
  if (source === 'salesforce') {
    const p = new URLSearchParams({
      response_type: 'code', client_id: clientId, redirect_uri: redirectUri,
      scope: provider.scope(), state,
    });
    url = `https://${provider.loginHost()}/services/oauth2/authorize?${p}`;
  } else {
    // hubspot
    const p = new URLSearchParams({
      client_id: clientId, redirect_uri: redirectUri, scope: provider.scope(), state,
    });
    url = `https://app.hubspot.com/oauth/authorize?${p}`;
  }

  return res.status(200).json({ configured: true, source, url });
});
