// ============================================================
// RALLY ACADEMY  (local-first, Supabase-swappable)
// Courses + memberships + client portal + community. Keeping
// customers inside the platform and adding a revenue line is how
// GHL monetizes; Rally does it natively. One module owns every
// Academy data shape + the read/write API. A deterministic PRNG
// builds a believable catalog on first run; mutations persist to
// localStorage so the demo stays alive across reloads. Every
// writer carries a // SUPABASE note describing the live table
// (namespaced rally_academy_*).
// NO em-dash or en-dash anywhere. ASCII hyphen only.
// ============================================================
import { useEffect, useState } from 'react';

const LS_KEY = 'rally_academy_v1';   // bump to force a clean reseed

/* ---------- deterministic PRNG (fixed seed, never Date/Math.random) ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ============================================================
   STATIC CONFIG
   ============================================================ */
export const LESSON_TYPES = {
  video: { label: 'Video', tint: 'var(--accent)' },
  text: { label: 'Reading', tint: 'var(--info)' },
  quiz: { label: 'Quiz', tint: 'var(--ok)' },
};

export const MEMBER_STATUS = {
  active: { label: 'Active', tone: 'ok' },
  'at-risk': { label: 'At risk', tone: 'warn' },
  completed: { label: 'Graduated', tone: 'accent' },
  new: { label: 'Just joined', tone: 'info' },
};

// Course accents reuse the design-system tokens (no new colors invented).
const COURSE_DEFS = [
  {
    id: 'crs_foundations', title: 'Revenue Foundations',
    subtitle: 'The first-principles playbook every rep runs on day one.',
    category: 'Sales Fundamentals', level: 'Beginner', accent: 'var(--accent)',
    status: 'published', instructor: 'Elena Ross', drip: false,
    modules: [
      { title: 'Mindset and Motion', lessons: [['Why revenue is a system', 'video', 8], ['The daily operating rhythm', 'video', 11], ['Reading a pipeline at a glance', 'text', 6], ['Checkpoint quiz', 'quiz', 5]] },
      { title: 'Owning the Conversation', lessons: [['Discovery that earns trust', 'video', 14], ['Question frameworks that open deals', 'text', 9], ['Handling the first objection', 'video', 12], ['Practice quiz', 'quiz', 6]] },
      { title: 'From Interest to Intent', lessons: [['Qualifying without pushing', 'video', 10], ['Multi-threading a deal', 'text', 8], ['Booking the next step every time', 'video', 7]] },
    ],
  },
  {
    id: 'crs_ros', title: 'The Rally Operating System',
    subtitle: 'Master the platform your whole revenue team runs on.',
    category: 'Product', level: 'Beginner', accent: 'var(--accent-teal)',
    status: 'published', instructor: 'Nina Kapoor', drip: true,
    modules: [
      { title: 'Your First Week in Rally', lessons: [['Command center tour', 'video', 9], ['Working a deal end to end', 'video', 13], ['Keyboard shortcuts that save an hour a day', 'text', 5]] },
      { title: 'Automations and Playbooks', lessons: [['Building your first workflow', 'video', 12], ['Sequences that never miss a follow-up', 'video', 10], ['Playbook design 101', 'text', 7], ['Automation quiz', 'quiz', 6]] },
      { title: 'Reporting and Forecasting', lessons: [['Dashboards that leaders trust', 'video', 11], ['Forecasting with confidence', 'text', 9], ['Certification quiz', 'quiz', 8]] },
    ],
  },
  {
    id: 'crs_outbound', title: 'Outbound That Converts',
    subtitle: 'Cold to booked without sounding like a robot.',
    category: 'Prospecting', level: 'Intermediate', accent: 'var(--accent-purple)',
    status: 'published', instructor: 'Marcus Hale', drip: true,
    modules: [
      { title: 'The Right List', lessons: [['Ideal customer profile in practice', 'video', 10], ['Signals worth acting on', 'text', 7], ['Enrichment without the busywork', 'video', 8]] },
      { title: 'Messages People Answer', lessons: [['The three-sentence cold email', 'video', 9], ['Openers for the phone', 'text', 6], ['Breaking through the gatekeeper', 'video', 11], ['Copy quiz', 'quiz', 5]] },
      { title: 'Cadence and Consistency', lessons: [['Designing a 12-touch cadence', 'video', 13], ['When to walk away', 'text', 6]] },
    ],
  },
  {
    id: 'crs_closing', title: 'Closing Masterclass',
    subtitle: 'Negotiation and late-stage moves that protect the deal.',
    category: 'Closing', level: 'Advanced', accent: 'var(--warn)',
    status: 'published', instructor: 'Jordan Avery', drip: false,
    modules: [
      { title: 'Reading the Room', lessons: [['Mapping the buying committee', 'video', 12], ['Spotting a stalled deal early', 'text', 8], ['The mutual action plan', 'video', 10]] },
      { title: 'Negotiation Under Pressure', lessons: [['Anchoring and concessions', 'video', 15], ['Defending your price', 'video', 13], ['Legal and procurement without panic', 'text', 9], ['Negotiation quiz', 'quiz', 7]] },
      { title: 'The Close', lessons: [['Asking for the business', 'video', 8], ['Turning a no into a not yet', 'text', 6]] },
    ],
  },
  {
    id: 'crs_success', title: 'Customer Success Playbook',
    subtitle: 'Retention, expansion, and turning customers into fans.',
    category: 'Success', level: 'Intermediate', accent: 'var(--ok)',
    status: 'published', instructor: 'Simone Diaz', drip: true,
    modules: [
      { title: 'Onboarding That Sticks', lessons: [['The first 90 days', 'video', 11], ['Defining the success plan', 'text', 8], ['Health scoring in Rally', 'video', 9]] },
      { title: 'Growing the Account', lessons: [['Spotting expansion signals', 'video', 10], ['The renewal conversation', 'video', 12], ['Save plays for at-risk accounts', 'text', 7], ['Retention quiz', 'quiz', 6]] },
    ],
  },
  {
    id: 'crs_analytics', title: 'Pipeline Analytics 101',
    subtitle: 'Turn your numbers into decisions leaders act on.',
    category: 'Analytics', level: 'Intermediate', accent: 'var(--info)',
    status: 'draft', instructor: 'Theo Bennett', drip: false,
    modules: [
      { title: 'The Metrics That Matter', lessons: [['Win rate, cycle time, and coverage', 'video', 10], ['Reading a funnel', 'text', 7]] },
      { title: 'Building the Report', lessons: [['Your first custom report', 'video', 12], ['Sharing insight without noise', 'text', 6], ['Analytics quiz', 'quiz', 5]] },
    ],
  },
];

const OFFER_DEFS = [
  { id: 'off_allaccess', name: 'Academy All-Access', description: 'Every course, every certification, forever updated.', price: 49, billing: 'monthly', courseIds: ['crs_foundations', 'crs_ros', 'crs_outbound', 'crs_closing', 'crs_success'], status: 'active', featured: true },
  { id: 'off_starter', name: 'Revenue Starter', description: 'A free on-ramp that turns signups into engaged members.', price: 0, billing: 'free', courseIds: ['crs_foundations'], status: 'active', featured: false },
  { id: 'off_closer', name: "Closer's Bundle", description: 'The two courses top reps credit for their best quarter.', price: 199, billing: 'one-time', courseIds: ['crs_outbound', 'crs_closing'], status: 'active', featured: false },
  { id: 'off_team', name: 'Team License', description: 'Seat-based access with reporting for the whole org.', price: 499, billing: 'monthly', courseIds: ['crs_foundations', 'crs_ros', 'crs_outbound', 'crs_closing', 'crs_success', 'crs_analytics'], status: 'draft', featured: false },
];

const CHANNEL_DEFS = [
  { id: 'ch_general', name: 'General', icon: 'inbox', color: 'var(--accent)' },
  { id: 'ch_wins', name: 'Wins', icon: 'rocket', color: 'var(--ok)' },
  { id: 'ch_questions', name: 'Questions', icon: 'lifebuoy', color: 'var(--info)' },
  { id: 'ch_playbooks', name: 'Playbooks', icon: 'book', color: 'var(--accent-purple)' },
  { id: 'ch_intros', name: 'Introductions', icon: 'users', color: 'var(--warn)' },
];

const MEMBER_NAMES = [
  'Ava Thornton', 'Marcus Bell', 'Priya Nair', 'Diego Salas', 'Hana Kimura', 'Owen Frost',
  'Lena Petrova', 'Caleb Osei', 'Mira Kapadia', 'Sven Larsson', 'Nadia Haddad', 'Rowan Pierce',
  'Isabel Marino', 'Kofi Mensah', 'Talia Roth', 'Bruno Costa', 'Yuki Tanaka', 'Elise Moreau',
  'Damian Cole', 'Farah Aziz', 'Grant Whitmore', 'Sasha Volkov', 'Nora Byrne', 'Emeka Obi',
];
const POST_BODIES = [
  { ch: 'ch_wins', body: 'Closed my first six-figure deal today using the mutual action plan from Closing Masterclass. The buying-committee map was the unlock.' },
  { ch: 'ch_questions', body: 'For the 12-touch cadence, how many of you mix in a video message? Curious whether it lifts reply rate or just feels novel.' },
  { ch: 'ch_general', body: 'Two weeks into Academy All-Access and my pipeline hygiene has never been cleaner. The Rally Operating System course paid for itself already.' },
  { ch: 'ch_playbooks', body: 'Sharing my discovery question bank from the Foundations course. Steal it, tweak it, and let me know what lands for you.' },
  { ch: 'ch_intros', body: 'Hi everyone. AE at a logistics startup, three years in, here to sharpen my late-stage game. Excited to learn alongside you all.' },
  { ch: 'ch_wins', body: 'The at-risk save play from the Success Playbook rescued a renewal I had written off. Customer just signed a two-year extension.' },
  { ch: 'ch_questions', body: 'What is everyone using to time the price-defense conversation? I keep bringing it up a beat too early.' },
  { ch: 'ch_general', body: 'Certification badge unlocked on the Operating System track. The reporting module changed how I run my Monday pipeline review.' },
  { ch: 'ch_playbooks', body: 'Turned the three-sentence cold email into a template with three variables. Reply rate went from 4 percent to 11 over the last month.' },
  { ch: 'ch_wins', body: 'First month applying Outbound That Converts: 22 booked meetings from a list I would have ignored before. The signals lesson is gold.' },
  { ch: 'ch_questions', body: 'Anyone else pair the health-scoring lesson with a weekly account review? Looking for a cadence that does not eat my whole Friday.' },
  { ch: 'ch_intros', body: 'New here and already hooked. SDR moving into a closing role next quarter, so the negotiation module is next on my list.' },
];

/* ============================================================
   SEED
   ============================================================ */
function flattenLessons(course) {
  const out = [];
  for (const m of course.modules) for (const l of m.lessons) out.push(l);
  return out;
}

function buildSeed() {
  const rnd = mulberry32(720712);           // FIXED seed
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const range = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const now = Date.now();
  const DAY = 86400000;
  const daysFromNow = (d) => new Date(now + d * DAY).toISOString();

  /* --- courses (assign stable lesson ids) --- */
  const courses = COURSE_DEFS.map((def) => {
    let ln = 0;
    const modules = def.modules.map((m, mi) => ({
      id: `${def.id}_m${mi + 1}`,
      title: m.title,
      lessons: m.lessons.map(([title, type, durationMin]) => ({
        id: `${def.id}_l${++ln}`, title, type, durationMin,
      })),
    }));
    return {
      id: def.id, title: def.title, subtitle: def.subtitle, category: def.category,
      level: def.level, accent: def.accent, status: def.status, instructor: def.instructor,
      dripEnabled: !!def.drip, dripInterval: def.drip ? range(2, 5) : 3,
      modules, createdAt: daysFromNow(-range(30, 260)),
    };
  });
  const courseById = Object.fromEntries(courses.map(c => [c.id, c]));
  const publishedIds = courses.filter(c => c.status === 'published').map(c => c.id);

  /* --- members + lesson-level completion (real progress tracking) --- */
  const completions = {};
  const members = MEMBER_NAMES.map((name, i) => {
    const id = `mem_${i + 1}`;
    const first = name.split(' ')[0].toLowerCase();
    const nEnroll = i === 0 ? 4 : range(1, 3);
    const pool = [...publishedIds];
    const enrolled = [];
    for (let k = 0; k < nEnroll && pool.length; k++) enrolled.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
    // Mark a seeded prefix of each enrolled course's lessons complete.
    for (const cid of enrolled) {
      const lessons = flattenLessons(courseById[cid]);
      const target = pick([0.15, 0.3, 0.3, 0.5, 0.6, 0.8, 1, 1]);
      const done = Math.round(lessons.length * target);
      for (let li = 0; li < done; li++) completions[`${id}::${lessons[li].id}`] = true;
    }
    const joinedDays = -range(3, 180);
    const lastDays = -range(0, 34);
    return {
      id, name,
      email: `${first}@${pick(['gmail.com', 'outlook.com', 'fastmail.com', 'proton.me'])}`,
      enrolledCourseIds: enrolled,
      joinedAt: daysFromNow(joinedDays),
      lastActivityAt: daysFromNow(lastDays),
    };
  });
  // Pin the portal viewer as a warm, mid-progress member.
  members[0].lastActivityAt = daysFromNow(0);

  /* --- offers (attach seeded sales + revenue) --- */
  const offers = OFFER_DEFS.map((def) => {
    const sales = def.billing === 'free' ? range(180, 320) : range(24, 140);
    const monthly = def.billing === 'monthly';
    const revenue = def.price * sales * (monthly ? 1 : 1);
    return { ...def, sales, revenue, createdAt: daysFromNow(-range(20, 200)) };
  });

  /* --- community posts --- */
  const posts = POST_BODIES.map((p, i) => {
    const author = pick(members);
    return {
      id: `post_${i + 1}`,
      authorId: author.id,
      channelId: p.ch,
      body: p.body,
      likes: range(3, 48),
      comments: range(0, 14),
      likedByMe: rnd() < 0.35,
      pinned: i === 2,
      createdAt: daysFromNow(-range(0, 18)),
    };
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return {
    seededAt: new Date(now).toISOString(),
    currentMemberId: 'mem_1',
    courses, offers, members,
    channels: CHANNEL_DEFS,
    posts, completions,
  };
}

/* ============================================================
   PERSISTENCE + PUB/SUB
   ============================================================ */
let state = load();
const subs = new Set();

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const seed = buildSeed();
  try { localStorage.setItem(LS_KEY, JSON.stringify(seed)); } catch {}
  return seed;
}
function commit(next) {
  state = next;
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  subs.forEach(fn => fn(state));
}
export function resetAcademy() { try { localStorage.removeItem(LS_KEY); } catch {} state = buildSeed(); try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {} subs.forEach(fn => fn(state)); }
export function getAcademyState() { return state; }

export function useAcademy(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => {
    const fn = (s) => setSnap(selector(s));
    subs.add(fn); fn(state);
    return () => subs.delete(fn);
  }, []); // eslint-disable-line
  return snap;
}

let idc = Date.now();
const newId = (p) => `${p}_${(idc++).toString(36)}`;

/* ============================================================
   READ API + DERIVED SELECTORS (pure over state)
   ============================================================ */
export const getCourses = () => state.courses;                              // SUPABASE: from('rally_academy_courses').select()
export const getCourse = (id) => state.courses.find(c => c.id === id);
export const getOffers = () => state.offers;                                // SUPABASE: from('rally_academy_offers').select()
export const getOffer = (id) => state.offers.find(o => o.id === id);
export const getMembers = () => state.members;                              // SUPABASE: from('rally_academy_members').select()
export const getMember = (id) => state.members.find(m => m.id === id);
export const getChannels = () => state.channels;
export const getPosts = () => state.posts;                                  // SUPABASE: from('rally_academy_posts').select()
export const getCurrentMember = () => getMember(state.currentMemberId) || state.members[0];

export const courseLessons = (course) => (course ? flattenLessons(course) : []);
export const courseLessonCount = (course) => courseLessons(course).length;
export const courseModuleCount = (course) => (course ? course.modules.length : 0);
export const courseDuration = (course) => courseLessons(course).reduce((s, l) => s + l.durationMin, 0);

// A lesson is complete for a member when its completion key is set.
export const isLessonComplete = (memberId, lessonId) => !!state.completions[`${memberId}::${lessonId}`];

// Percent of a single course a member has finished.
export function memberCourseProgress(memberId, courseId) {
  const course = getCourse(courseId);
  const lessons = courseLessons(course);
  if (!lessons.length) return 0;
  const done = lessons.filter(l => isLessonComplete(memberId, l.id)).length;
  return Math.round((done / lessons.length) * 100);
}
// Weighted progress across everything a member is enrolled in.
export function memberOverallProgress(memberId) {
  const m = getMember(memberId);
  if (!m || !m.enrolledCourseIds.length) return 0;
  let done = 0, total = 0;
  for (const cid of m.enrolledCourseIds) {
    const lessons = courseLessons(getCourse(cid));
    total += lessons.length;
    done += lessons.filter(l => isLessonComplete(memberId, l.id)).length;
  }
  return total ? Math.round((done / total) * 100) : 0;
}
// Derived engagement status, never stored raw so it stays truthful.
export function memberStatus(memberId) {
  const m = getMember(memberId);
  if (!m) return 'new';
  const prog = memberOverallProgress(memberId);
  const idleDays = (Date.now() - new Date(m.lastActivityAt).getTime()) / 86400000;
  if (prog >= 100) return 'completed';
  const joinDays = (Date.now() - new Date(m.joinedAt).getTime()) / 86400000;
  if (joinDays <= 10 && prog < 20) return 'new';
  if (idleDays >= 14 && prog < 100) return 'at-risk';
  return 'active';
}
export const courseEnrollment = (courseId) => state.members.filter(m => m.enrolledCourseIds.includes(courseId)).length;
export function courseCompletionRate(courseId) {
  const enrolled = state.members.filter(m => m.enrolledCourseIds.includes(courseId));
  if (!enrolled.length) return 0;
  const completed = enrolled.filter(m => memberCourseProgress(m.id, courseId) >= 100).length;
  return Math.round((completed / enrolled.length) * 100);
}
export const offerCourses = (offer) => (offer?.courseIds || []).map(getCourse).filter(Boolean);

/* --- headline metrics for the KPI strip --- */
export function academyMetrics() {
  const members = state.members;
  const activeMembers = members.filter(m => ['active', 'new'].includes(memberStatus(m.id))).length;
  const completions = members.reduce((s, m) => s + m.enrolledCourseIds.filter(cid => memberCourseProgress(m.id, cid) >= 100).length, 0);
  const avgCompletion = members.length ? Math.round(members.reduce((s, m) => s + memberOverallProgress(m.id), 0) / members.length) : 0;
  // Recurring Academy revenue: monthly offers count directly, annualized one-time smoothed to a monthly figure.
  const mrr = state.offers.filter(o => o.status === 'active').reduce((s, o) => {
    if (o.billing === 'monthly') return s + o.price * o.sales;
    if (o.billing === 'one-time') return s + Math.round((o.price * o.sales) / 12);
    return s;
  }, 0);
  const weekAgo = Date.now() - 7 * 86400000;
  const postsThisWeek = state.posts.filter(p => new Date(p.createdAt).getTime() >= weekAgo).length;
  return { activeMembers, memberCount: members.length, completions, avgCompletion, mrr, postsThisWeek };
}
export function topContributors(n = 5) {
  const map = {};
  for (const p of state.posts) map[p.authorId] = (map[p.authorId] || 0) + 1;
  return Object.entries(map)
    .map(([id, count]) => ({ member: getMember(id), count }))
    .filter(x => x.member)
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

/* ============================================================
   WRITE API   (validated writers, return { error, message } or record)
   ============================================================ */

// SUPABASE: from('rally_academy_courses').insert(row).select().single()
export function createCourse({ title, subtitle, category, level = 'Beginner', accent = 'var(--accent)', instructor = 'You' }) {
  if (!title || !title.trim()) return { error: 'title', message: 'A course title is required.' };
  const id = newId('crs');
  const course = {
    id, title: title.trim(),
    subtitle: (subtitle || '').trim() || 'A new course. Add modules and lessons to bring it to life.',
    category: category || 'General', level, accent, status: 'draft', instructor,
    dripEnabled: false, dripInterval: 3,
    modules: [{ id: `${id}_m1`, title: 'Getting Started', lessons: [{ id: `${id}_l1`, title: 'Welcome and overview', type: 'video', durationMin: 5 }] }],
    createdAt: new Date().toISOString(),
  };
  commit({ ...state, courses: [course, ...state.courses] });
  return { course };
}
export function updateCourse(id, patch) {
  const c = getCourse(id);
  if (!c) return { error: 'missing', message: 'Course not found.' };
  Object.assign(c, patch);
  commit({ ...state });
  return { course: c };
}
export function toggleCoursePublish(id) {
  const c = getCourse(id);
  if (!c) return { error: 'missing', message: 'Course not found.' };
  c.status = c.status === 'published' ? 'draft' : 'published';
  commit({ ...state });
  return { course: c };
}
export function addModule(courseId, title) {
  const c = getCourse(courseId);
  if (!c) return { error: 'missing', message: 'Course not found.' };
  if (!title || !title.trim()) return { error: 'title', message: 'A module title is required.' };
  c.modules.push({ id: newId(`${courseId}_m`), title: title.trim(), lessons: [] });
  commit({ ...state });
  return { course: c };
}
export function addLesson(courseId, moduleId, { title, type = 'video', durationMin = 8 }) {
  const c = getCourse(courseId);
  if (!c) return { error: 'missing', message: 'Course not found.' };
  const mod = c.modules.find(m => m.id === moduleId);
  if (!mod) return { error: 'module', message: 'Module not found.' };
  if (!title || !title.trim()) return { error: 'title', message: 'A lesson title is required.' };
  const dur = Number(durationMin);
  mod.lessons.push({ id: newId(`${courseId}_l`), title: title.trim(), type, durationMin: Number.isFinite(dur) && dur > 0 ? dur : 8 });
  commit({ ...state });
  return { course: c };
}

// SUPABASE: from('rally_academy_offers').insert(row).select().single()
export function createOffer({ name, description, price, billing = 'monthly', courseIds = [] }) {
  if (!name || !name.trim()) return { error: 'name', message: 'An offer name is required.' };
  const p = billing === 'free' ? 0 : Number(price);
  if (billing !== 'free' && (!Number.isFinite(p) || p < 0)) return { error: 'price', message: 'Enter a valid price.' };
  const offer = {
    id: newId('off'), name: name.trim(),
    description: (description || '').trim() || 'A new offer.',
    price: p, billing, courseIds, status: 'draft', featured: false,
    sales: 0, revenue: 0, createdAt: new Date().toISOString(),
  };
  commit({ ...state, offers: [offer, ...state.offers] });
  return { offer };
}
export function toggleOfferStatus(id) {
  const o = getOffer(id);
  if (!o) return { error: 'missing', message: 'Offer not found.' };
  o.status = o.status === 'active' ? 'draft' : 'active';
  commit({ ...state });
  return { offer: o };
}

// Real completion tracking. Toggling a lesson recomputes every derived progress.
// SUPABASE: upsert/delete on rally_academy_progress (member_id, lesson_id).
export function toggleLessonComplete(memberId, lessonId) {
  const key = `${memberId}::${lessonId}`;
  const completions = { ...state.completions };
  if (completions[key]) delete completions[key]; else completions[key] = true;
  const members = state.members.map(m => m.id === memberId ? { ...m, lastActivityAt: new Date().toISOString() } : m);
  commit({ ...state, completions, members });
  return { ok: true, done: !!completions[key] };
}
// Advance a member to their next unfinished lesson in a course (portal "Resume").
export function completeNextLesson(memberId, courseId) {
  const lessons = courseLessons(getCourse(courseId));
  const next = lessons.find(l => !isLessonComplete(memberId, l.id));
  if (!next) return { error: 'done', message: 'This course is already complete.' };
  return { ...toggleLessonComplete(memberId, next.id), lesson: next };
}

export function enrollMember(memberId, courseId) {
  const m = getMember(memberId);
  if (!m) return { error: 'missing', message: 'Member not found.' };
  if (m.enrolledCourseIds.includes(courseId)) return { ok: true };
  m.enrolledCourseIds = [...m.enrolledCourseIds, courseId];
  m.lastActivityAt = new Date().toISOString();
  commit({ ...state });
  return { ok: true };
}
export function setCurrentMember(memberId) {
  if (!getMember(memberId)) return { error: 'missing' };
  commit({ ...state, currentMemberId: memberId });
  return { ok: true };
}

// SUPABASE: from('rally_academy_posts').insert(row).select().single()
export function createPost({ authorId, channelId, body }) {
  if (!body || !body.trim()) return { error: 'body', message: 'Write something before posting.' };
  const post = {
    id: newId('post'),
    authorId: authorId || state.currentMemberId,
    channelId: channelId || 'ch_general',
    body: body.trim(), likes: 0, comments: 0, likedByMe: false, pinned: false,
    createdAt: new Date().toISOString(),
  };
  commit({ ...state, posts: [post, ...state.posts] });
  return { post };
}
export function toggleLike(postId) {
  const p = state.posts.find(x => x.id === postId);
  if (!p) return { error: 'missing' };
  p.likedByMe = !p.likedByMe;
  p.likes += p.likedByMe ? 1 : -1;
  commit({ ...state });
  return { post: p };
}
