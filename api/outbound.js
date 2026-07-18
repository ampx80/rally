// Outbound integration proxy. The automation engine runs in the browser, where
// Slack / Teams / webhook endpoints reject cross-origin POSTs. This same-origin
// route forwards the call server-side with the right headers so workflow actions
// genuinely reach other systems. SSRF-guarded: https only, no internal hosts.
import { withErrorHandling, methodNotAllowed, readJsonBody } from './_utils.js';

const BLOCKED_HOST = /^(localhost|127\.|0\.0\.0\.0|169\.254\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|\[?::1\]?|metadata\.)/i;

function safeUrl(raw) {
  let u;
  try { u = new URL(String(raw)); } catch { return null; }
  if (u.protocol !== 'https:') return null;
  if (BLOCKED_HOST.test(u.hostname)) return null;
  return u.toString();
}

// Build the provider-specific request body from a generic message + payload.
function buildBody(kind, message, payload) {
  if (kind === 'slack') {
    return { contentType: 'application/json', body: JSON.stringify({ text: message || 'Ardovo automation fired' }) };
  }
  if (kind === 'teams') {
    return {
      contentType: 'application/json',
      body: JSON.stringify({
        '@type': 'MessageCard', '@context': 'https://schema.org/extensions',
        summary: 'Ardovo automation', themeColor: '5b4bf5',
        title: 'Ardovo automation', text: message || 'Ardovo automation fired',
      }),
    };
  }
  // generic webhook: send the structured payload plus the human message
  return { contentType: 'application/json', body: JSON.stringify({ message: message || null, ...(payload || {}) }) };
}

export default withErrorHandling(async (req, res) => {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  const { kind = 'webhook', url, message, payload } = readJsonBody(req);

  const target = safeUrl(url);
  if (!target) return res.status(400).json({ ok: false, error: 'A valid public https URL is required.' });

  const { contentType, body } = buildBody(kind, message, payload);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': contentType, 'User-Agent': 'Ardovo-Automations/1.0' },
      body,
      signal: ctrl.signal,
    });
    const text = await r.text().catch(() => '');
    return res.status(200).json({ ok: r.ok, status: r.status, response: text.slice(0, 300) });
  } catch (e) {
    return res.status(200).json({ ok: false, error: e.name === 'AbortError' ? 'Request timed out' : e.message });
  } finally {
    clearTimeout(timer);
  }
});
