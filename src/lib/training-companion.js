// ============================================================
// TRAINING COMPANION  (curriculum + progress + system prompt + target map)
//
// The brain behind Ardo, the in-app training companion. It owns:
//   1. A role-based curriculum (ordered lessons per track).
//   2. A local-first progress store (pub/sub, persisted to localStorage).
//   3. The system prompt + greeting used by the voice agent.
//   4. A friendly target map (name -> CSS selector) the client tools resolve.
//
// Read-only against src/lib/store.js (getCurrentUser). Never mutates the CRM.
// ASCII only. No em-dash / no en-dash. Normal hyphen only.
// ============================================================
import { getCurrentUser } from './store.js';

/* ============================================================
   TARGET MAP  (friendly name -> selector; raw selectors also allowed)
   The companion points at these while it teaches. Every value is a
   comma list so the resolver can fall back to a still-present element
   (e.g. the page's main region) when a page-specific hook is absent.
   ============================================================ */
export const TARGET_MAP = {
  'command-center': '.rl-content, main',
  home: '.rl-content, main',
  pipeline: '.kanban, [data-page="deals"], .rl-content, main',
  deals: '.kanban, [data-page="deals"], .rl-content, main',
  contacts: '[data-page="contacts"], .rl-content, main',
  companies: '[data-page="companies"], .rl-content, main',
  'my-day': '.rl-content, main',
  activities: '.rl-content, main',
  forecast: '.rl-content, main',
  leads: '.rl-content, main',
  sequences: '.rl-content, main',
  campaigns: '.rl-content, main',
  dashboards: '.rl-content, main',
  reports: '.rl-content, main',
  team: '.rl-content, main',
  tickets: '.rl-content, main',
  success: '.rl-content, main',
  inbox: '.rl-content, main',
  forms: '.rl-content, main',
  lists: '.rl-content, main',
  workflows: '.rl-content, main',
  integrations: '.rl-content, main',
  objects: '.rl-content, main',
  search: '.rl-topbar',
  topbar: '.rl-topbar',
  nav: '.rl-rail',
  spine: '.rl-rail',
  rook: '.rook-fab',
  cta: '.rl-topbar .btn-primary',
  new: '.rl-topbar .btn-primary',
};

/* ============================================================
   CURRICULUM  (per role: an ordered lessons array)
   lesson = { id, title, route, target, say (narration), ask (check) }
   ============================================================ */
export const TRACKS = {
  AE: {
    id: 'AE',
    label: 'Account Executive',
    blurb: 'Run your pipeline, work deals, and close from one screen.',
    lessons: [
      { id: 'cc', title: 'Your Command Center', route: '/app', target: 'command-center',
        say: 'This is your Command Center, the home base in Ardova. Every morning it shows your pipeline, your forecast, and what needs you today. Think of it as mission control for your number.',
        ask: 'What is the one screen you start your day on in Ardova?' },
      { id: 'pipeline', title: 'Work the pipeline', route: '/deals', target: 'pipeline',
        say: 'Here is your pipeline board. Each column is a stage, and each card is a deal. To move a deal forward you just drag its card to the next stage. Ardova updates the probability and forecast the instant you drop it.',
        ask: 'How do you move a deal to the next stage in Ardova?' },
      { id: 'deal', title: 'Inside a deal', route: '/deals', target: 'pipeline',
        say: 'Open any deal card and you get the full story: the value, the buying committee, and every activity. Log a call or a next step right here so nothing slips. In Ardova the deal record is the single source of truth.',
        ask: 'Where do you log your next step for a deal in Ardova?' },
      { id: 'contacts', title: 'Contacts', route: '/contacts', target: 'contacts',
        say: 'These are your contacts, the people behind every deal. Click one to see their history, their company, and their role in the buying committee. Keep this current and Ardova keeps your deals honest.',
        ask: 'Where do you find the people tied to your deals in Ardova?' },
      { id: 'companies', title: 'Companies', route: '/companies', target: 'companies',
        say: 'Companies are the accounts. Open one to see every contact, every deal, and the account health in one place. This is how you walk into a call knowing the whole relationship inside Ardova.',
        ask: 'What does the company record show you in Ardova?' },
      { id: 'myday', title: 'My Day', route: '/activities', target: 'my-day',
        say: 'My Day is your task list, sorted by what is due. Knock these out top to bottom and you are always working the highest-value next step. Ardova builds this list from your deals automatically.',
        ask: 'Where does Ardova show you what to do next today?' },
      { id: 'forecast', title: 'Forecasting', route: '/forecasting', target: 'forecast',
        say: 'Forecasting rolls your open deals into a weighted number so you always know where you stand against quota. When you move deals on the board, this number moves with you in Ardova.',
        ask: 'What screen tells you if you are on track for quota in Ardova?' },
      { id: 'rook', title: 'Ask Rook anything', route: '/app', target: 'rook',
        say: 'That glowing button is Rook, your AI operator. Ask it which deals are slipping, or tell it to stand up a whole account in one sentence. Whenever you are stuck, Rook is the fastest way to move in Ardova.',
        ask: 'Who do you ask when you want something done fast in Ardova?' },
    ],
  },
  SDR: {
    id: 'SDR',
    label: 'Sales Development',
    blurb: 'Turn raw leads into qualified pipeline, fast.',
    lessons: [
      { id: 'cc', title: 'Your Command Center', route: '/app', target: 'command-center',
        say: 'Welcome to your Command Center. As an SDR this is where you see fresh leads, your outreach for the day, and how much pipeline you are creating. Start here every morning in Ardova.',
        ask: 'What screen is your home base in Ardova?' },
      { id: 'leads', title: 'Work your leads', route: '/leads', target: 'leads',
        say: 'This is the leads list, your raw material. Each lead has a score so you know who to call first. When one is ready, you convert it into a contact and a deal without leaving Ardova.',
        ask: 'How do you know which lead to work first in Ardova?' },
      { id: 'sequences', title: 'Sequences', route: '/sequences', target: 'sequences',
        say: 'Sequences are your automated outreach: a series of emails and touches that run on a schedule. Drop a lead into one and Ardova keeps the follow-up going so nobody falls through the cracks.',
        ask: 'What runs your multi-touch outreach automatically in Ardova?' },
      { id: 'contacts', title: 'Contacts', route: '/contacts', target: 'contacts',
        say: 'Once a lead responds it becomes a contact. This is where you track every real person and hand warm ones to an account executive. Clean contacts are how Ardova keeps the whole team in sync.',
        ask: 'Where do qualified people live in Ardova?' },
      { id: 'myday', title: 'My Day', route: '/activities', target: 'my-day',
        say: 'My Day is your call and email queue, sorted by what is due. Work it top to bottom and you never wonder what to do next. Ardova builds it for you automatically.',
        ask: 'Where does Ardova tell you your next call today?' },
      { id: 'rook', title: 'Ask Rook anything', route: '/app', target: 'rook',
        say: 'Rook is your AI teammate. Ask it to draft a cold email or find accounts you have not touched in a month. It is the quickest shortcut in Ardova.',
        ask: 'Who drafts your outreach fast in Ardova?' },
    ],
  },
  Manager: {
    id: 'Manager',
    label: 'Sales Manager',
    blurb: 'Coach the team, call the number, and spot risk early.',
    lessons: [
      { id: 'cc', title: 'Team Command Center', route: '/app', target: 'command-center',
        say: 'This is your Command Center. As a manager it gives you the pulse of the whole team: total pipeline, the forecast, and where deals are stuck. This is your one-glance view in Ardova.',
        ask: 'What screen gives you the team pulse in Ardova?' },
      { id: 'forecast', title: 'Forecasting', route: '/forecasting', target: 'forecast',
        say: 'Forecasting is where you call the number. It rolls up every rep into a weighted forecast so you can commit with confidence and catch a gap before it hurts. This is the heart of your job in Ardova.',
        ask: 'Where do you call the team number in Ardova?' },
      { id: 'dashboards', title: 'Dashboards', route: '/dashboards', target: 'dashboards',
        say: 'Dashboards turn the raw data into charts you can act on: win rates, stage conversion, activity by rep. Build the view you care about once and Ardova keeps it live.',
        ask: 'Where do you see win rates and conversion in Ardova?' },
      { id: 'team', title: 'Your team', route: '/team', target: 'team',
        say: 'The Team page is your roster and leaderboard. See who is ahead, who needs coaching, and how activity maps to results. This is how you coach with facts in Ardova.',
        ask: 'Where do you see each rep is performance in Ardova?' },
      { id: 'reports', title: 'Reports', route: '/reports', target: 'reports',
        say: 'Reports let you slice the business any way you need for your own leadership. Save the ones you run weekly so the answer is one click away in Ardova.',
        ask: 'Where do you build a custom slice of the business in Ardova?' },
      { id: 'pipeline', title: 'Inspect the pipeline', route: '/deals', target: 'pipeline',
        say: 'The pipeline board is where deal inspection happens. Filter to a rep, look for deals with no next step, and coach right on the card. Everything you need to run a pipeline review lives here in Ardova.',
        ask: 'Where do you run a pipeline review in Ardova?' },
    ],
  },
  CS: {
    id: 'CS',
    label: 'Customer Success',
    blurb: 'Keep customers healthy, renewing, and expanding.',
    lessons: [
      { id: 'cc', title: 'Your Command Center', route: '/app', target: 'command-center',
        say: 'This is your Command Center. For Customer Success it surfaces account health, renewals coming up, and anything at risk. Start your day here in Ardova.',
        ask: 'What screen is your home base in Ardova?' },
      { id: 'success', title: 'Customer Success', route: '/success', target: 'success',
        say: 'The Customer Success hub shows every account you own with a health signal. Green is healthy, red needs you now. This is where you protect and grow revenue in Ardova.',
        ask: 'Where do you see account health in Ardova?' },
      { id: 'tickets', title: 'Support tickets', route: '/tickets', target: 'tickets',
        say: 'Tickets are the open issues tied to your accounts. Resolve them fast and health goes up. Ardova ties each ticket back to the company so you always have context.',
        ask: 'Where do open customer issues live in Ardova?' },
      { id: 'companies', title: 'Account view', route: '/companies', target: 'companies',
        say: 'Open a company to see the full relationship: contacts, deals, activity, and tickets in one place. Walk into every check-in prepared with the whole picture from Ardova.',
        ask: 'Where do you see the full account relationship in Ardova?' },
      { id: 'inbox', title: 'Inbox', route: '/inbox', target: 'inbox',
        say: 'The Inbox is your shared conversation stream so nothing from a customer gets missed. Reply here and it logs straight to the account in Ardova.',
        ask: 'Where do customer conversations land in Ardova?' },
    ],
  },
  Marketing: {
    id: 'Marketing',
    label: 'Marketing',
    blurb: 'Launch campaigns, capture leads, and prove impact.',
    lessons: [
      { id: 'cc', title: 'Your Command Center', route: '/app', target: 'command-center',
        say: 'This is your Command Center. For Marketing it shows leads created, campaign performance, and revenue you influenced. Start here in Ardova.',
        ask: 'What screen is your home base in Ardova?' },
      { id: 'campaigns', title: 'Campaigns', route: '/campaigns', target: 'campaigns',
        say: 'Campaigns are how you launch and measure every send and channel. Track leads and revenue against each one so you always know what is working in Ardova.',
        ask: 'Where do you launch and measure a send in Ardova?' },
      { id: 'sequences', title: 'Sequences', route: '/sequences', target: 'sequences',
        say: 'Sequences run automated nurtures over time. Build one once and Ardova keeps warming leads until they are ready for sales.',
        ask: 'What automates your nurtures in Ardova?' },
      { id: 'forms', title: 'Forms', route: '/forms', target: 'forms',
        say: 'Forms capture new leads from your site straight into the CRM. Every submission becomes a lead you can route and score inside Ardova.',
        ask: 'How do website visitors become leads in Ardova?' },
      { id: 'lists', title: 'Lists', route: '/lists', target: 'lists',
        say: 'Lists are your audience segments. Build a smart list once and use it across campaigns and sequences. This is how you target the right people in Ardova.',
        ask: 'Where do you build an audience segment in Ardova?' },
      { id: 'reports', title: 'Prove impact', route: '/reports', target: 'reports',
        say: 'Reports let you prove marketing revenue with attribution and pipeline created. Save the ones your leadership asks for so the answer is always ready in Ardova.',
        ask: 'Where do you prove marketing impact in Ardova?' },
    ],
  },
  RevOps: {
    id: 'RevOps',
    label: 'Revenue Operations',
    blurb: 'Wire the system, automate the busywork, keep data clean.',
    lessons: [
      { id: 'cc', title: 'Your Command Center', route: '/app', target: 'command-center',
        say: 'This is the Command Center. As RevOps it is your window into the health of the whole revenue engine. Everything you tune shows up here in Ardova.',
        ask: 'What screen shows the health of the revenue engine in Ardova?' },
      { id: 'forecast', title: 'Forecasting', route: '/forecasting', target: 'forecast',
        say: 'Forecasting is the model you own. Tune the stages and probabilities so the number the team commits is one leadership can trust. This is your accuracy lever in Ardova.',
        ask: 'What model does RevOps own in Ardova?' },
      { id: 'reports', title: 'Reports', route: '/reports', target: 'reports',
        say: 'Reports are how you answer any question about the business. Build the definitive versions and share them so everyone works from one truth in Ardova.',
        ask: 'Where do you build the source of truth reports in Ardova?' },
      { id: 'workflows', title: 'Workflows', route: '/workflows', target: 'workflows',
        say: 'Workflows automate the busywork: assignments, follow-up tasks, stage rules. Build one and Ardova runs it forever so reps stay selling.',
        ask: 'Where do you automate busywork in Ardova?' },
      { id: 'integrations', title: 'Integrations', route: '/integrations', target: 'integrations',
        say: 'Integrations connect Ardova to the rest of your stack. Wire them once and data flows both ways with no manual copy-paste.',
        ask: 'Where do you connect Ardova to other tools?' },
      { id: 'objects', title: 'Custom objects', route: '/objects', target: 'objects',
        say: 'Custom objects let you model anything your business needs beyond the standard records. This is how you make Ardova fit your process exactly, not the other way around.',
        ask: 'How do you model your own data shapes in Ardova?' },
    ],
  },
};

export const TRACK_IDS = Object.keys(TRACKS);
export const DEFAULT_TRACK_ID = 'AE';

/* Map a store role string to a training track. Reps default to the AE track. */
export function roleToTrackId(role) {
  const r = String(role || '').toLowerCase();
  if (r === 'manager' || r === 'vp' || r === 'lead') return 'Manager';
  if (r === 'sdr' || r === 'bdr') return 'SDR';
  if (r === 'cs' || r === 'csm' || r === 'success') return 'CS';
  if (r === 'marketing' || r === 'marketer') return 'Marketing';
  if (r === 'revops' || r === 'ops' || r === 'admin') return 'RevOps';
  return DEFAULT_TRACK_ID; // rep + anything unknown
}

export function getTrack(trackId) {
  return TRACKS[trackId] || TRACKS[DEFAULT_TRACK_ID];
}

/* Resolve the current user (read-only) to their track. */
export function currentTrack() {
  let user = null;
  try { user = getCurrentUser(); } catch { user = null; }
  return getTrack(roleToTrackId(user?.role));
}

/* First name only, for the energetic greeting. */
export function firstNameOf(user) {
  const name = String(user?.name || '').trim();
  if (!name) return 'there';
  return name.split(/\s+/)[0];
}

/* ============================================================
   PROGRESS STORE  (local-first, pub/sub)
   Shape: { [trackId]: { [lessonId]: true } }
   ============================================================ */
const LS_KEY = 'ardova_companion_progress_v1';
const subs = new Set();

function readProgress() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') || {}; } catch { return {}; }
}
function writeProgress(p) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(p)); } catch {}
  subs.forEach(fn => { try { fn(p); } catch {} });
}

export function subscribeProgress(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}

export function getProgress(trackId) {
  return readProgress()[trackId] || {};
}

export function isLessonDone(trackId, lessonId) {
  return !!getProgress(trackId)[lessonId];
}

export function markLessonDone(trackId, lessonId, done = true) {
  const all = readProgress();
  const track = { ...(all[trackId] || {}) };
  if (done) track[lessonId] = true; else delete track[lessonId];
  writeProgress({ ...all, [trackId]: track });
}

export function toggleLesson(trackId, lessonId) {
  markLessonDone(trackId, lessonId, !isLessonDone(trackId, lessonId));
}

export function resetProgress(trackId) {
  const all = readProgress();
  if (trackId) { delete all[trackId]; writeProgress({ ...all }); }
  else writeProgress({});
}

/* { done, total, pct } for a track. */
export function trackCompletion(trackId) {
  const track = getTrack(trackId);
  const total = track.lessons.length;
  const prog = getProgress(trackId);
  const done = track.lessons.filter(l => prog[l.id]).length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

/* ============================================================
   VOICE COPY  (greeting + system prompt)
   ============================================================ */

/* Energetic, greets by FIRST name, always steers back to Ardova. */
export function greetingFor(user, track) {
  const first = firstNameOf(user);
  const label = track?.label ? ` as ${aOrAn(track.label)}` : '';
  return `Hey, what is up ${first}! Let us knock some things out and walk the system together. Ask me anything, I will always bring it back to Ardova. I will show you how to crush it${label}. Ready? Let us go.`;
}

function aOrAn(word) {
  return /^[aeiou]/i.test(word || '') ? `an ${word}` : `a ${word}`;
}

// The base system prompt string (a friendly expert Ardova coach).
export const SYSTEM_PROMPT = [
  'You are Ardo, the friendly, high-energy training companion built into Ardova, an AI-native revenue platform (CRM plus marketing, forecasting, and AI agents).',
  'Your job is to make learning Ardova fun and fast. A brand-new rep should be productive in a single morning, with no long team meetings.',
  'PERSONALITY: warm, upbeat, encouraging, a little playful. Short, energetic turns. Celebrate small wins. Never lecture.',
  'GREETING: always greet the user by their FIRST name and pump them up.',
  'ANSWER ANYTHING, ALWAYS STEER BACK: you may answer any question the user asks, but ALWAYS bring it back to how to use Ardova. If a question is off-topic, give a quick friendly answer and then say something like "here is how that connects to Ardova" and point them at the right screen or feature.',
  'SHOW, DO NOT JUST TELL: when you mention a screen, a record, or a feature, call your client tools to point at it. Use highlight to spotlight an element, scrollTo to bring it into view, and navigate to move to the right route. Use setLesson to advance the lesson track, and celebrate when the user finishes something.',
  'TEACH ONE THING AT A TIME: explain the single next step, then check understanding with a light question. Keep momentum.',
  'STAY GROUNDED: talk about real Ardova screens and workflows (Command Center, Deals pipeline, Contacts, Companies, My Day, Forecasting, Reports, Campaigns, Sequences, and Rook the AI operator). Do not invent features that do not exist.',
  'FORMAT: plain spoken language, no markdown, no lists read aloud, no URLs read aloud. One or two short sentences per turn since your reply is spoken.',
  'ABSOLUTE RULE: never use an em dash or an en dash. Use a normal hyphen only.',
].join('\n');

/* Full system prompt for a specific user + track, with the lesson outline
   inlined so the agent knows the path it is walking the user through. */
export function buildSystemPrompt(user, track) {
  const first = firstNameOf(user);
  const t = track || currentTrack();
  const outline = t.lessons.map((l, i) => `${i + 1}. ${l.title} (route ${l.route}) - ${l.say}`).join('\n');
  return [
    SYSTEM_PROMPT,
    '',
    `THE USER: ${user?.name || 'a new teammate'}${user?.title ? `, ${user.title}` : ''}. Greet them as "${first}".`,
    `THEIR TRACK: ${t.label}. ${t.blurb}`,
    'THE LESSON PATH you are walking them through (use navigate + highlight as you reach each one, and mark progress with setLesson):',
    outline,
  ].join('\n');
}

/* ============================================================
   CROSS-LAUNCH HELPERS  (additive; the Learn Hub + Skill Map call these)
   These fire the shared 'ardova:companion' window event so the docked
   TrainingCompanion can jump straight into the right lesson or seed a
   question. Every helper is a safe no-op when window is unavailable.
   ============================================================ */

/* Fire the companion launch event. Opens Ardo by default; pass any of
   { lessonId, skillId, prompt, route, area, label } to steer it. */
export function launchCompanion(detail = {}) {
  try {
    window.dispatchEvent(new CustomEvent('ardova:companion', { detail: { open: true, ...detail } }));
  } catch {}
  return true;
}

/* Open Ardo and start a specific lesson by id within the current track. */
export function startLesson(lessonId) {
  return launchCompanion({ lessonId });
}

/* Open Ardo with a seeded opening question so it starts on that topic. */
export function startWithPrompt(prompt) {
  return launchCompanion({ prompt: String(prompt || '').trim() });
}

/* Map a Skill Map area id to lesson keywords we can match against a
   lesson's id / target / route. Keeps the companion and the hub in sync. */
const AREA_LESSON_HINTS = {
  pipeline:    ['pipeline', 'deal'],
  contacts:    ['contacts', 'companies'],
  forecasting: ['forecast'],
  marketing:   ['campaigns', 'sequences', 'forms', 'lists'],
  automation:  ['workflows'],
  reporting:   ['reports', 'dashboards'],
  payments:    ['deal', 'pipeline'],
  agents:      ['rook'],
  admin:       ['team', 'integrations', 'objects'],
};

/* Find the best-matching lesson in a track for a launch request. Returns
   { lesson, index } or null. Priority: explicit lessonId, then route match,
   then product area heuristic. Used by the hub and the companion so a
   Skill Map node resolves to a real lesson when one exists. */
export function findLessonInTrack(track, { lessonId, route, area } = {}) {
  const t = track || currentTrack();
  const lessons = t.lessons || [];

  if (lessonId) {
    const i = lessons.findIndex(l => l.id === lessonId);
    if (i >= 0) return { lesson: lessons[i], index: i };
  }

  if (route) {
    const clean = String(route).split('?')[0].split('#')[0];
    let i = lessons.findIndex(l => l.route === clean);
    if (i < 0 && clean !== '/app') {
      i = lessons.findIndex(l => l.route !== '/app' && clean.startsWith(l.route));
    }
    if (i >= 0) return { lesson: lessons[i], index: i };
  }

  if (area) {
    const hints = AREA_LESSON_HINTS[area] || [];
    for (const h of hints) {
      const i = lessons.findIndex(l =>
        l.id.includes(h) || (l.target || '').includes(h) || l.route.includes(h));
      if (i >= 0) return { lesson: lessons[i], index: i };
    }
  }

  return null;
}

/* A compact, read-only snapshot the Learn Hub renders for the current
   user: their track, per-lesson done state, completion, and the next
   lesson to take. Pure read of the local progress store. */
export function progressSummary() {
  let user = null;
  try { user = getCurrentUser(); } catch { user = null; }
  const track = currentTrack();
  const prog = getProgress(track.id);
  const lessons = track.lessons.map(l => ({
    id: l.id,
    title: l.title,
    route: l.route,
    target: l.target,
    say: l.say,
    done: !!prog[l.id],
  }));
  const done = lessons.filter(l => l.done).length;
  const total = lessons.length;
  const nextLesson = lessons.find(l => !l.done) || null;
  return {
    user,
    track,
    firstName: firstNameOf(user),
    lessons,
    done,
    total,
    pct: total ? Math.round((done / total) * 100) : 0,
    nextLesson,
  };
}
