// OAuth start - the foundation for one-click Google / Microsoft mailbox
// connect. Builds the provider consent URL when the org has configured its
// OAuth client (env keys below), otherwise returns { configured:false } so the
// UI cleanly routes the customer to the SMTP path. No secrets ever reach the
// client; only the public client_id is used to build the redirect.
//
// To enable, set on the Vercel project:
//   Google:    GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
//   Microsoft: MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET (+ optional MICROSOFT_TENANT, default 'common')

const SCOPES = {
  google: [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/calendar.readonly',
  ],
  microsoft: ['openid', 'email', 'offline_access', 'User.Read', 'Mail.Send', 'Mail.Read', 'Calendars.Read'],
};

export default function handler(req, res) {
  try {
    const provider = String((req.query && req.query.provider) || '').toLowerCase();
    if (provider !== 'google' && provider !== 'microsoft') {
      return res.status(400).json({ configured: false, message: 'Unknown provider.' });
    }
    const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const redirectUri = `${proto}://${host}/api/oauth-callback?provider=${provider}`;
    const state = Buffer.from(JSON.stringify({ provider, t: Date.now() })).toString('base64url');

    if (provider === 'google') {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!clientId) return res.status(200).json({ configured: false, provider, message: 'Google OAuth is not configured on this workspace yet. Set GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET on Vercel, or connect this mailbox via SMTP.' });
      const p = new URLSearchParams({
        client_id: clientId, redirect_uri: redirectUri, response_type: 'code',
        scope: SCOPES.google.join(' '), access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true', state,
      });
      return res.status(200).json({ configured: true, provider, url: `https://accounts.google.com/o/oauth2/v2/auth?${p}` });
    }

    // microsoft
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    if (!clientId) return res.status(200).json({ configured: false, provider, message: 'Microsoft OAuth is not configured on this workspace yet. Set MICROSOFT_CLIENT_ID + MICROSOFT_CLIENT_SECRET on Vercel, or connect this mailbox via SMTP.' });
    const tenant = process.env.MICROSOFT_TENANT || 'common';
    const p = new URLSearchParams({
      client_id: clientId, redirect_uri: redirectUri, response_type: 'code',
      scope: SCOPES.microsoft.join(' '), response_mode: 'query', state,
    });
    return res.status(200).json({ configured: true, provider, url: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${p}` });
  } catch (e) {
    return res.status(200).json({ configured: false, message: 'OAuth start failed: ' + (e?.message || 'unknown error') });
  }
}
