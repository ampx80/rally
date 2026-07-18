// POST /api/realtime-session
//
// Mints a short-lived OpenAI Realtime session token for the in-app Rook voice
// assistant (Use Case B). The browser never sees OPENAI_API_KEY - it gets an
// ephemeral client secret, opens a WebRTC session directly to OpenAI, and
// drives the app through the tool schema defined here. Env-gated: with no key
// it returns { ok:false, disabled:true } and the client falls back to the
// Web Speech voice loop. NO em-dash / en-dash. ASCII only.
import { withErrorHandling, methodNotAllowed } from './_utils.js';

const MODEL = () => process.env.OPENAI_REALTIME_MODEL || 'gpt-4o-realtime-preview-2024-12-17';

const INSTRUCTIONS = [
  'You are Rook, the voice operator inside Ardovo, an AI-native revenue CRM.',
  'You help the user get around and get things done by voice. Keep spoken replies to one or two short, natural sentences. No lists, no markdown, no reading URLs aloud.',
  'When the user asks to go somewhere or find something, call the matching tool immediately, then confirm in a few words (the app navigates for them). Do not repeat yourself.',
  'If you are unsure what they mean, ask one short question. Be warm and brief.',
].join(' ');

const TOOLS = [
  {
    type: 'function', name: 'navigate',
    description: 'Navigate the Ardovo app to a destination screen.',
    parameters: {
      type: 'object',
      properties: { destination: { type: 'string', description: 'One of: home, deals, leads, contacts, companies, activities, forecasting, dashboards, reports, campaigns, sequences, quotes, invoices, workflows, training, migrate, qualify, settings, intelligence' } },
      required: ['destination'],
    },
  },
  {
    type: 'function', name: 'search_record',
    description: 'Find a specific deal, contact, or company by name and open it.',
    parameters: {
      type: 'object',
      properties: { entity: { type: 'string', enum: ['deal', 'contact', 'company', 'any'] }, query: { type: 'string' } },
      required: ['query'],
    },
  },
  {
    type: 'function', name: 'build_report',
    description: 'Open the report builder, optionally pre-filled from a natural-language spec.',
    parameters: { type: 'object', properties: { spec: { type: 'string' } } },
  },
  {
    type: 'function', name: 'open_help',
    description: 'Open a training topic in the Training area.',
    parameters: { type: 'object', properties: { topic: { type: 'string' } } },
  },
];

export default withErrorHandling(async (req, res) => {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  if (!process.env.OPENAI_API_KEY) {
    return res.status(200).json({ ok: false, disabled: true, reason: 'no-key' });
  }
  try {
    const r = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL(),
        voice: process.env.OPENAI_REALTIME_VOICE || 'alloy',
        modalities: ['audio', 'text'],
        instructions: INSTRUCTIONS,
        tools: TOOLS,
        tool_choice: 'auto',
        input_audio_transcription: { model: 'whisper-1' },
        turn_detection: { type: 'server_vad', threshold: 0.5, silence_duration_ms: 500 },
      }),
    });
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      console.warn('[realtime-session]', r.status, t.slice(0, 200));
      return res.status(200).json({ ok: false, disabled: true, reason: `openai-${r.status}` });
    }
    const j = await r.json();
    return res.status(200).json({ ok: true, model: MODEL(), session: j });
  } catch (e) {
    console.warn('[realtime-session] error', e?.message);
    return res.status(200).json({ ok: false, disabled: true, reason: 'error' });
  }
});
