// One-off: patch the Vapi assistant so it hangs up cleanly. Reads VAPI creds
// from a pulled env file (never prints them). Safe to delete after running.
import fs from 'fs';
function readEnv(file) {
  const out = {};
  try {
    const raw = fs.readFileSync(file);
    let s = (raw[0] === 0xFF && raw[1] === 0xFE) ? raw.toString('utf16le') : raw.toString('utf8');
    s = s.replace(/^\uFEFF/, '').replace(/\u0000/g, '');
    for (const line of s.split(/\r?\n/)) {
      const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      out[m[1]] = v;
    }
  } catch {}
  return out;
}
let env = {};
for (const f of ['.env.vapi.local', '.env.pulled.production', '.env.local', '.env']) env = { ...readEnv(f), ...env };
const KEY = env.VAPI_API_KEY, ID = env.VAPI_ASSISTANT_ID;
if (!KEY || !ID) {
  console.log('MISSING creds', { hasKey: !!KEY, hasId: !!ID });
  const dbg = readEnv('.env.vapi.local');
  console.log('value lengths ->', { VAPI_API_KEY: (dbg.VAPI_API_KEY || '').length, VAPI_ASSISTANT_ID: (dbg.VAPI_ASSISTANT_ID || '').length, RESEND_API_KEY: (dbg.RESEND_API_KEY || '').length });
  try {
    const raw = fs.readFileSync('.env.vapi.local');
    console.log('file bytes:', raw.length, 'first16hex:', raw.slice(0, 16).toString('hex'));
  } catch (e) { console.log('read error', e.message); }
  process.exit(1);
}

const full = {
  endCallFunctionEnabled: true,
  silenceTimeoutSeconds: 20,
  maxDurationSeconds: 300,
  endCallPhrases: ['goodbye', 'talk soon', 'have a great day', 'take care'],
  endCallMessage: 'Thanks so much - talk soon!',
};
async function patch(body) {
  const r = await fetch(`https://api.vapi.ai/assistant/${ID}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const t = await r.text();
  return { status: r.status, body: t };
}
let res = await patch(full);
if (res.status >= 400 && /endCall/i.test(res.body)) {
  console.log('full patch rejected endCallFunctionEnabled, retrying without it...');
  const { endCallFunctionEnabled, ...rest } = full;
  res = await patch(rest);
}
console.log('HTTP', res.status);
try {
  const j = JSON.parse(res.body);
  console.log('applied ->', {
    silenceTimeoutSeconds: j.silenceTimeoutSeconds,
    maxDurationSeconds: j.maxDurationSeconds,
    endCallPhrases: j.endCallPhrases,
    endCallFunctionEnabled: j.endCallFunctionEnabled,
    name: j.name,
  });
} catch { console.log(res.body.slice(0, 500)); }
