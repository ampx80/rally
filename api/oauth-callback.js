// OAuth callback - exchanges the provider code for tokens (server-side, using
// the client secret) and confirms the connected mailbox identity, then hands
// control back to the app which persists the connection. When the provider is
// not configured, it redirects back with a clear status so the UI can explain
// and offer the SMTP path. Tokens are not persisted here (mailbox secrets need
// the Supabase vault, a follow-up); this proves the round trip end to end.

async function exchangeGoogle(code, redirectUri) {
  const body = new URLSearchParams({
    code, client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: redirectUri, grant_type: 'authorization_code',
  });
  const tok = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body }).then(r => r.json());
  if (!tok.access_token) throw new Error(tok.error_description || 'Token exchange failed.');
  const me = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${tok.access_token}` } }).then(r => r.json());
  return { email: me.email, name: me.name };
}

async function exchangeMicrosoft(code, redirectUri) {
  const tenant = process.env.MICROSOFT_TENANT || 'common';
  const body = new URLSearchParams({
    code, client_id: process.env.MICROSOFT_CLIENT_ID, client_secret: process.env.MICROSOFT_CLIENT_SECRET,
    redirect_uri: redirectUri, grant_type: 'authorization_code',
  });
  const tok = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body }).then(r => r.json());
  if (!tok.access_token) throw new Error(tok.error_description || 'Token exchange failed.');
  const me = await fetch('https://graph.microsoft.com/v1.0/me', { headers: { Authorization: `Bearer ${tok.access_token}` } }).then(r => r.json());
  return { email: me.mail || me.userPrincipalName, name: me.displayName };
}

export default async function handler(req, res) {
  const provider = String((req.query && req.query.provider) || '').toLowerCase();
  const back = (params) => {
    const q = new URLSearchParams({ mailbox: '1', provider, ...params });
    res.writeHead(302, { Location: `/settings?tab=email&${q}` });
    res.end();
  };
  try {
    const code = req.query && req.query.code;
    const err = req.query && req.query.error;
    if (err) return back({ status: 'error', message: String(err) });
    if (!code) return back({ status: 'error', message: 'Missing authorization code.' });

    const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const redirectUri = `${proto}://${host}/api/oauth-callback?provider=${provider}`;

    const configured = provider === 'google'
      ? !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
      : provider === 'microsoft'
        ? !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET)
        : false;
    if (!configured) return back({ status: 'notconfigured' });

    const info = provider === 'google' ? await exchangeGoogle(code, redirectUri) : await exchangeMicrosoft(code, redirectUri);
    if (!info.email) return back({ status: 'error', message: 'Could not read the mailbox address.' });
    return back({ status: 'connected', email: info.email, name: info.name || '' });
  } catch (e) {
    return back({ status: 'error', message: (e?.message || 'OAuth callback failed.').slice(0, 140) });
  }
}
