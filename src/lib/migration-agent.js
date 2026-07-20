// ============================================================
// MIRA  -  the Ardovo migration specialist.
//
// A calm, fast, genuinely expert data-migration guide. Mira does what a great
// human migration consultant does, minus the months of meetings: she greets
// the files you drop in, reads them, tells you exactly what she found, proposes
// how to map or keep every column (including creating custom fields so nothing
// is lost), and walks a whole team through it live before anything touches
// production.
//
// This module is DETERMINISTIC and offline-safe: every line Mira can say is
// generated here from the real analysis of your data (src/lib/migration.js).
// When a voice/LLM provider is configured (Vapi / OpenAI Realtime) the panel
// speaks these lines and can also free-form via /api/rook, but the guidance
// itself never depends on a key. Screen actions ride on the shared client
// tools in src/lib/companion-voice.js.
//
// ASCII only. No em-dash / no en-dash. Normal hyphen only.
// ============================================================
import { TARGETS, CUSTOM_TARGETS } from './migration.js';

export const SPECIALIST = {
  name: 'Mira',
  role: 'Migration specialist',
  tagline: 'I bring your data in fast, and we talk through every decision together.',
};

// Friendly target names Mira can highlight -> wizard selectors (data-mw hooks
// live in MigrationWizard). resolveTarget() falls back to a raw selector, so
// these work with the shared spotlight tool.
export const MIGRATION_TARGET_MAP = {
  dropzone: '[data-mw="dropzone"]',
  files: '[data-mw="files"]',
  mapping: '[data-mw="mapping"]',
  unmapped: '[data-mw="unmapped"] , .mw-map.is-unmapped',
  required: '[data-mw="required-flag"]',
  custom: '[data-mw="custom"]',
  cleanse: '[data-mw="cleanse"]',
  preview: '[data-mw="preview"]',
  push: '[data-mw="push"]',
  readiness: '[data-mw="readiness"]',
  duplicates: '[data-mw="duplicates"]',
};

export const SYSTEM_PROMPT = [
  'You are Mira, Ardovo\'s migration specialist. You help a company move its data',
  'into Ardovo without the usual months-long conversion project. You are calm,',
  'warm, concrete, and fast. You never overwhelm. You explain one decision at a',
  'time, in plain language, and you reassure people that nothing goes live until',
  'they approve it.',
  '',
  'What you do: read the files a customer drops in, detect what each file is',
  '(contacts, accounts, deals, quotes), map columns to Ardovo fields, flag',
  'required fields that are missing, spot duplicates and jammed data, and',
  'propose keeping unmapped columns as custom fields on the right object view so',
  'no data is lost. You can point at things on screen and move between steps.',
  '',
  'Boundaries: you talk about data mapping, cleansing, custom fields, and the',
  'migration flow. For contract, security, or pricing specifics, hand off to an',
  'account executive. Keep spoken replies to two or three sentences. Use a',
  'normal hyphen, never a long dash.',
].join(' ');

/* ---------- helpers ---------- */
const plur = (n, s, p) => `${n} ${n === 1 ? s : (p || s + 's')}`;
const targetLabel = (t) => (TARGETS[t]?.label || t).toLowerCase();

/* ============================================================
   FILE INTAKE  -  what Mira says as files land
   files: [{ name, target, rows }]
   ============================================================ */
export function greetingLines(files = []) {
  if (!files.length) {
    return [
      `Hi, I am ${SPECIALIST.name}, your migration specialist. Whenever you are ready, drop your files right here.`,
      'Exports from your old CRM, spreadsheets, contact lists - messy is fine, that is the whole point.',
      'As soon as something lands, I will read it and we will walk through it together.',
    ];
  }
  const total = files.reduce((s, f) => s + (f.rows || 0), 0);
  const kinds = [...new Set(files.map(f => targetLabel(f.target)))];
  const lead = files.length === 1
    ? `Thanks for dropping in ${files[0].name}. I read ${plur(files[0].rows || 0, 'row')}.`
    : `Thanks for dropping in ${plur(files.length, 'file')}. I read ${plur(total, 'row')} across them.`;
  return [
    lead,
    kinds.length === 1
      ? `Looks like ${kinds[0]}. Let us walk through this so it lands clean.`
      : `Looks like a mix of ${kinds.join(' and ')}. We will take them one at a time.`,
    'Nothing goes live until you say so. Ready when you are.',
  ];
}

/* ============================================================
   REVIEW BRIEFING  -  the ordered findings Mira walks
   Returns talking points from the real analyze() report + suggestions.
   Each point: { id, text, severity, highlight?, fixHint? }
   ============================================================ */
export function reviewBriefing({ report, suggestions = [], target = 'contact' } = {}) {
  if (!report) return [];
  const out = [];
  out.push({
    id: 'readiness',
    severity: report.readiness >= 80 ? 'ok' : report.readiness >= 50 ? 'warn' : 'risk',
    highlight: 'readiness',
    text: report.readiness >= 80
      ? `Good news: about ${report.readiness}% of these ${targetLabel(target)} are ready to import as-is.`
      : `About ${report.readiness}% are ready as-is. Let us clean up the rest together, it is quick.`,
  });

  if (report.missingTargets?.length) {
    out.push({
      id: 'required',
      severity: 'risk',
      highlight: 'required',
      text: `First, ${report.missingTargets.join(' and ')} ${report.missingTargets.length > 1 ? 'are' : 'is'} required and not mapped yet. Point a column at ${report.missingTargets.length > 1 ? 'them' : 'it'} and we are safe.`,
    });
  }
  if (report.unmapped?.length) {
    const s = suggestions.length;
    out.push({
      id: 'unmapped',
      severity: 'warn',
      highlight: 'custom',
      text: s
        ? `${plur(report.unmapped.length, 'column')} did not match an Ardovo field. Rather than drop ${report.unmapped.length > 1 ? 'them' : 'it'}, I can create ${plur(s, 'custom field')} on your ${CUSTOM_TARGETS.find(c => c.key === target)?.label || 'record view'} so no data is lost.`
        : `${plur(report.unmapped.length, 'column')} did not match a field. Map ${report.unmapped.length > 1 ? 'them' : 'it'} or tell me to skip ${report.unmapped.length > 1 ? 'them' : 'it'}.`,
    });
  }
  if (report.duplicateRows) {
    out.push({
      id: 'dupes',
      severity: 'warn',
      highlight: 'duplicates',
      text: `I found ${plur(report.duplicateRows, 'duplicate')}. Keep merge duplicates on and I will collapse ${report.duplicateRows > 1 ? 'them' : 'it'} into one clean record.`,
    });
  }
  (report.jammed || []).forEach((j, i) => {
    out.push({ id: `jam-${i}`, severity: 'warn', highlight: 'cleanse', text: `${j.label}. I can fix that on the way in - just leave the matching toggle on.` });
  });

  if (out.length === 1) {
    out.push({ id: 'clean', severity: 'ok', highlight: 'preview', text: 'Honestly, this is clean. Preview it and we can push whenever you want.' });
  } else {
    out.push({ id: 'next', severity: 'ok', highlight: 'preview', text: 'Handle those and hit preview. I will show you exactly what lands before anything goes live.' });
  }
  return out;
}

/* ============================================================
   CUSTOM FIELD PITCH  -  how Mira proposes a single custom field
   ============================================================ */
export function customFieldPitch(sug, target = 'contact') {
  const view = CUSTOM_TARGETS.find(c => c.key === target)?.label || 'record view';
  const sample = sug.samples?.length ? ` For example: ${sug.samples.slice(0, 2).join(', ')}.` : '';
  return `"${sug.label}" looks like a ${sug.type} field and it is filled on ${sug.fillRate}% of rows. I suggest keeping it as a custom ${sug.type} field on your ${view}.${sample}`;
}

/* ============================================================
   STAGE + PUSH BRIEFINGS
   ============================================================ */
export function stageBriefing(staged, target = 'contact') {
  const out = [`Staged ${plur(staged.records.length, targetLabel(target).replace(/s$/, ''), targetLabel(target))}. This is the exact set that will land.`];
  if (staged.problems?.droppedDupes) out.push(`I merged ${plur(staged.problems.droppedDupes, 'duplicate')} for you.`);
  if (staged.problems?.droppedMissing) out.push(`I set aside ${plur(staged.problems.droppedMissing, 'row')} that were missing required data.`);
  out.push('Scroll the preview. If it looks right, push it. Still nothing live until you do.');
  return out.map((text, i) => ({ id: `stage-${i}`, severity: 'ok', highlight: i === out.length - 1 ? 'push' : 'preview', text }));
}

export function pushBriefing(result, target = 'contact') {
  return [
    `Done. ${plur(result.created, targetLabel(target).replace(/s$/, ''), targetLabel(target))} are live in your Ardovo book${result.failed ? `, and ${plur(result.failed, 'row')} could not be created` : ''}.`,
    'These are real records you can open and work right now. Want to bring in another file, or should I open them for you?',
  ].map((text, i) => ({ id: `push-${i}`, severity: 'ok', text }));
}

/* ============================================================
   LOCAL Q&A  -  offline steer for the questions people actually ask.
   The panel tries /api/rook first (grounded); this is the fail-safe so typed
   or spoken questions always get a real, useful answer with no key.
   ============================================================ */
const QA = [
  { re: /(how long|timeline|how fast|when.*done|months)/i, a: 'Most migrations drag out for months because of back-and-forth. Here we do it in one guided session: you drop the files, we map and clean together, and you push when it looks right. Usually one sitting.' },
  { re: /(duplicate|dedupe|merge)/i, a: 'I detect duplicates by email for contacts and by name for accounts. Keep merge duplicates on and I collapse them into one record, keeping the fullest values.' },
  { re: /(custom field|custom column|extra column|does not map|doesn.t map|unmapped)/i, a: 'If a column does not match an Ardovo field, we do not lose it. I propose a custom field on the right object view - contact, account, deal, or quote - infer its type, and you approve it in one click.' },
  { re: /(required|missing)/i, a: 'Required fields must be mapped before we import. I flag any that are not, and the row will be set aside if a required value is empty, so your book stays clean.' },
  { re: /(sandbox|test|preview|safe|production|go live|revert)/i, a: 'Nothing touches production until you push. You review a clean preview first, and you can start over anytime. Think of the review step as your sandbox.' },
  { re: /(security|gdpr|compliance|contract|price|pricing|cost)/i, a: 'That is one for your account executive - I keep to the data itself. I can flag it and they will follow up.' },
  { re: /(team|meeting|session|invite|together|zoom|call)/i, a: 'We can do this as a live session. Start one, share the link, and up to a handful of people join the same page. I present, we decide the mapping together, and one person pushes at the end.' },
];
export function localAnswer(question) {
  const q = String(question || '');
  const hit = QA.find(x => x.re.test(q));
  if (hit) return hit.a;
  return 'Good question. In this migration I can map columns, clean up duplicates and messy values, and keep anything that does not map as a custom field. Tell me what you are looking at and I will point you to it.';
}

/* ============================================================
   AGENDA  -  the running order Mira presents in a live session
   ============================================================ */
export function buildAgenda(files = []) {
  const kinds = [...new Set(files.map(f => targetLabel(f.target)))];
  return [
    { id: 'intro', title: 'Welcome + what we are bringing in', done: false },
    { id: 'files', title: files.length ? `Review ${plur(files.length, 'file')}${kinds.length ? ` (${kinds.join(', ')})` : ''}` : 'Drop in the files', done: false },
    { id: 'mapping', title: 'Map columns to Ardovo fields', done: false },
    { id: 'custom', title: 'Decide custom fields for the rest', done: false },
    { id: 'cleanse', title: 'Clean duplicates and messy values', done: false },
    { id: 'preview', title: 'Preview the exact records', done: false },
    { id: 'push', title: 'Push to production together', done: false },
  ];
}
