// POST /api/csp-report
//
// Content-Security-Policy violation report sink. Point the CSP directives
// `report-uri /api/csp-report` and `report-to csp` at this route so the
// browser POSTs a JSON report whenever the policy blocks something. We log a
// compact, PII-free summary (no cookies, no full request bodies) and return
// 204 No Content. Reports are advisory telemetry: this endpoint never fails
// the browser and never trusts the report body beyond logging a few clamped
// fields.
//
// Browsers send one of two shapes:
//   Legacy report-uri:  Content-Type: application/csp-report
//                       { "csp-report": { "document-uri", "violated-directive", "blocked-uri", ... } }
//   Reporting API:      Content-Type: application/reports+json
//                       [ { "type": "csp-violation", "body": { "documentURL", "effectiveDirective", "blockedURL" } } ]
//
// NO em-dash / en-dash. ASCII only.
import { withErrorHandling, methodNotAllowed, readJsonBody } from './_utils.js';

// Strip control + zero-width chars, built from escapes so the source stays ASCII.
const CTRL_RE = new RegExp(
  '[\\u0000-\\u001F\\u007F-\\u009F\\u200B-\\u200D\\uFEFF]',
  'g',
);

// Clamp to keep log lines bounded and strip control chars.
const clip = (v, max = 300) =>
  String(v == null ? '' : v).replace(CTRL_RE, '').trim().slice(0, max);

// Normalize either report shape into a small, uniform record for logging.
function summarize(payload) {
  const out = [];
  const push = (b) => {
    if (!b || typeof b !== 'object') return;
    out.push({
      directive: clip(b['effective-directive'] || b.effectiveDirective || b['violated-directive'] || b.violatedDirective, 80),
      blocked: clip(b['blocked-uri'] || b.blockedURL, 200),
      document: clip(b['document-uri'] || b.documentURL, 200),
      // A CSP source snippet can contain page text; keep it very short.
      sample: clip(b['script-sample'] || b.sample, 60),
    });
  };

  if (Array.isArray(payload)) {
    // Reporting API batch
    for (const r of payload) push(r && r.body ? r.body : r);
  } else if (payload && payload['csp-report']) {
    // Legacy report-uri
    push(payload['csp-report']);
  } else if (payload && (payload.body || payload.documentURL)) {
    push(payload.body || payload);
  }
  return out;
}

export default withErrorHandling(async (req, res) => {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  // Tolerate any content type; readJsonBody handles string or parsed bodies.
  let payload = {};
  try { payload = readJsonBody(req); } catch { payload = {}; }

  const reports = summarize(payload);
  if (reports.length) {
    for (const r of reports) {
      console.warn('[csp-violation]', JSON.stringify(r));
    }
  } else {
    console.warn('[csp-violation] received report with no recognizable body');
  }

  // Always acknowledge with 204 so the browser reporter stays quiet.
  return res.status(204).end();
});
