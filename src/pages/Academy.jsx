// Rally Academy. Courses, memberships, community, and a client portal that
// keep customers inside the platform and add a recurring revenue line. Five
// tabs over one local-first store (src/lib/academy-data.js): Courses (grid +
// builder), Offers (pricing bundles + checkout preview), Members (progress +
// engagement), Community (feed + channels), and Client portal (what a customer
// sees when they log in). 100% functional with seeded deterministic data and
// zero backend. ASCII hyphen only, never em/en dash.
import React, { useState } from 'react';
import {
  useAcademy, getCourses, getCourse, getOffers, getMembers, getMember,
  getChannels, getPosts, getCurrentMember,
  courseLessons, courseLessonCount, courseModuleCount, courseDuration,
  isLessonComplete, memberCourseProgress, memberOverallProgress, memberStatus,
  courseEnrollment, courseCompletionRate, offerCourses, academyMetrics,
  topContributors, LESSON_TYPES, MEMBER_STATUS,
  createCourse, updateCourse, toggleCoursePublish, addModule, addLesson,
  createOffer, toggleOfferStatus, toggleLessonComplete, completeNextLesson,
  setCurrentMember, createPost, toggleLike,
} from '../lib/academy-data.js';
import {
  Button, Card, Badge, Avatar, PageTitle, SectionHeader, StatCard, Ring,
  ProgressBar, Field, Input, Select, Textarea, Modal, Segmented, EmptyState,
  Tabs, GradientText, useToast, money, moneyK, relTime,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';

/* Open Rook (the AI operator) with a prefilled prompt. Fire-and-forget event
   that RookDock listens for; never throws if the dock is absent. */
const askRook = (prompt) => {
  try { window.dispatchEvent(new CustomEvent('rally:rook', { detail: { prompt } })); } catch {}
};

/* ---------- small inline glyphs (self-contained, no icon-registry edits) ---------- */
const PlayGlyph = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4l13 8-13 8V4z" /></svg>
);
const HeartGlyph = ({ size = 15, filled }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.8 5.6a5.4 5.4 0 0 0-7.7 0L12 6.7l-1.1-1.1a5.4 5.4 0 1 0-7.7 7.7l1.1 1.1L12 22l7.7-7.6 1.1-1.1a5.4 5.4 0 0 0 0-7.7z" /></svg>
);
const ChatGlyph = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
);

const lessonGlyph = (type) => type === 'video'
  ? <PlayGlyph />
  : <Icon name={type === 'quiz' ? 'checkSquare' : 'fileText'} size={14} />;

const LEVEL_TONE = { Beginner: 'ok', Intermediate: 'info', Advanced: 'warn' };
const BILLING_LABEL = { monthly: '/mo', 'one-time': 'once', free: 'free' };

/* Cover art derived from a course accent. No external assets, pure CSS. */
function CourseCover({ course, height = 96 }) {
  return (
    <div style={{
      height, borderRadius: 'var(--r-md)', position: 'relative', overflow: 'hidden',
      background: `linear-gradient(135deg, ${course.accent}, color-mix(in srgb, ${course.accent} 55%, #12151c))`,
    }}>
      <div style={{ position: 'absolute', inset: 0, opacity: .22, background: 'radial-gradient(120px 120px at 80% 10%, #fff, transparent 70%)' }} />
      <div className="row" style={{ position: 'absolute', left: 14, bottom: 12, gap: 8, color: '#fff' }}>
        <span style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 9, background: 'rgba(255,255,255,.18)' }}>
          <Icon name="book" size={16} />
        </span>
        <span className="fw-7" style={{ letterSpacing: '.02em', fontSize: '.86rem', textTransform: 'uppercase', opacity: .95 }}>{course.category}</span>
      </div>
    </div>
  );
}

/* ============================================================
   COURSES TAB  (grid + builder)
   ============================================================ */
function CourseCard({ course, onOpen }) {
  const lessons = courseLessonCount(course);
  const mins = courseDuration(course);
  return (
    <Card pad={false} hover className="col" style={{ overflow: 'hidden', cursor: 'pointer' }} onClick={() => onOpen(course.id)}>
      <div style={{ padding: '.85rem .85rem 0' }}><CourseCover course={course} /></div>
      <div className="col gap-2" style={{ padding: '1rem 1.1rem 1.2rem', flex: 1 }}>
        <div className="row between" style={{ gap: 8, alignItems: 'flex-start' }}>
          <h4 style={{ margin: 0, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{course.title}</h4>
          <Badge tone={course.status === 'published' ? 'ok' : 'default'} style={{ flex: 'none' }}>{course.status === 'published' ? 'Live' : 'Draft'}</Badge>
        </div>
        <div className="muted t-sm" style={{ minHeight: 42 }}>{course.subtitle}</div>
        <div className="row gap-1 wrap" style={{ marginTop: 2 }}>
          <Badge tone={LEVEL_TONE[course.level] || 'default'}>{course.level}</Badge>
          <Badge>{courseModuleCount(course)} modules</Badge>
          <Badge>{lessons} lessons</Badge>
          {course.dripEnabled && <Badge tone="accent"><Icon name="clock" size={12} /> Drip</Badge>}
        </div>
        <div className="row between" style={{ marginTop: 'auto', paddingTop: 10, borderTop: '1px solid var(--line)' }}>
          <span className="row gap-1 t-sm muted"><Avatar name={course.instructor} size={22} /> {course.instructor}</span>
          <span className="t-sm fw-6">{Math.round(mins / 60 * 10) / 10}h</span>
        </div>
        <div className="row between t-sm" style={{ alignItems: 'center' }}>
          <span className="muted">{courseEnrollment(course.id)} enrolled</span>
          <span className="row gap-1" style={{ color: 'var(--ok)' }}><Icon name="check" size={13} /> {courseCompletionRate(course.id)}% complete</span>
        </div>
      </div>
    </Card>
  );
}

function NewCourseModal({ open, onClose, onCreated }) {
  const toast = useToast();
  const [draft, setDraft] = useState({ title: '', subtitle: '', category: 'Sales Fundamentals', level: 'Beginner', accent: 'var(--accent)' });
  const submit = () => {
    const r = createCourse(draft);
    if (r.error) return toast(r.message, 'risk');
    toast('Course created. Open the builder to add lessons.');
    onCreated?.(r.course.id);
    onClose();
    setDraft({ title: '', subtitle: '', category: 'Sales Fundamentals', level: 'Beginner', accent: 'var(--accent)' });
  };
  const accents = [['var(--accent)', 'Indigo'], ['var(--accent-teal)', 'Teal'], ['var(--accent-purple)', 'Purple'], ['var(--warn)', 'Amber'], ['var(--ok)', 'Green'], ['var(--info)', 'Blue']];
  return (
    <Modal open={open} onClose={onClose} title="New course" width={620}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>Create course</Button></>}>
      <div className="col gap-3">
        <Field label="Course title"><Input autoFocus placeholder="Objection Handling in 5 Moves" value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} onKeyDown={e => e.key === 'Enter' && submit()} /></Field>
        <Field label="One-line promise"><Input placeholder="What a learner walks away able to do." value={draft.subtitle} onChange={e => setDraft(d => ({ ...d, subtitle: e.target.value }))} /></Field>
        <div className="row gap-2" style={{ alignItems: 'flex-start' }}>
          <Field label="Category"><Input value={draft.category} onChange={e => setDraft(d => ({ ...d, category: e.target.value }))} /></Field>
          <Field label="Level"><Select value={draft.level} onChange={e => setDraft(d => ({ ...d, level: e.target.value }))}>{['Beginner', 'Intermediate', 'Advanced'].map(l => <option key={l}>{l}</option>)}</Select></Field>
        </div>
        <Field label="Cover accent">
          <div className="row gap-1 wrap">
            {accents.map(([val, name]) => (
              <button key={val} onClick={() => setDraft(d => ({ ...d, accent: val }))} title={name}
                className="row center" style={{ width: 34, height: 34, borderRadius: 9, border: draft.accent === val ? '2px solid var(--ink)' : '2px solid var(--line)', background: val, cursor: 'pointer' }} aria-label={name} />
            ))}
          </div>
        </Field>
      </div>
    </Modal>
  );
}

function CourseBuilderModal({ courseId, onClose }) {
  useAcademy();
  const toast = useToast();
  const course = courseId ? getCourse(courseId) : null;
  const [modTitle, setModTitle] = useState('');
  const [lessonDraft, setLessonDraft] = useState({}); // moduleId -> { title, type, durationMin }
  if (!course) return null;
  const lessons = courseLessons(course);
  const setLD = (mid, patch) => setLessonDraft(s => ({ ...s, [mid]: { title: '', type: 'video', durationMin: 8, ...s[mid], ...patch } }));
  const submitLesson = (mid) => {
    const ld = lessonDraft[mid] || {};
    const r = addLesson(course.id, mid, ld);
    if (r.error) return toast(r.message, 'risk');
    setLD(mid, { title: '' });
    toast('Lesson added');
  };
  const submitModule = () => {
    const r = addModule(course.id, modTitle);
    if (r.error) return toast(r.message, 'risk');
    setModTitle('');
    toast('Module added');
  };
  return (
    <Modal open={!!courseId} onClose={onClose} width={820}
      title={<span className="row gap-1"><Icon name="layers" size={18} /> Course builder</span>}
      footer={
        <>
          <Button variant="ghost" onClick={() => { askRook(`Suggest a lesson outline to improve the course "${course.title}".`); onClose(); }}><Icon name="sparkles" size={15} /> Ask Rook to improve</Button>
          <Button variant={course.status === 'published' ? 'ghost' : 'primary'} onClick={() => { const r = toggleCoursePublish(course.id); toast(r.course.status === 'published' ? 'Course published' : 'Moved to draft'); }}>
            {course.status === 'published' ? 'Unpublish' : 'Publish course'}
          </Button>
        </>
      }>
      <div className="col gap-3">
        {/* header + at-a-glance completion tracking */}
        <div className="row between wrap" style={{ gap: 12 }}>
          <div className="col gap-1" style={{ minWidth: 0 }}>
            <div className="row gap-1"><h4 style={{ margin: 0 }}>{course.title}</h4><Badge tone={course.status === 'published' ? 'ok' : 'default'}>{course.status === 'published' ? 'Live' : 'Draft'}</Badge></div>
            <div className="muted t-sm">{course.subtitle}</div>
          </div>
          <div className="row gap-3" style={{ flex: 'none' }}>
            <div className="col center"><div className="stat-value" style={{ fontSize: '1.6rem' }}>{lessons.length}</div><div className="stat-label">lessons</div></div>
            <div className="col center"><div className="stat-value" style={{ fontSize: '1.6rem' }}>{courseEnrollment(course.id)}</div><div className="stat-label">enrolled</div></div>
            <Ring value={courseCompletionRate(course.id)} size={54} label={`${courseCompletionRate(course.id)}%`} />
          </div>
        </div>

        {/* drip schedule control */}
        <Card pad className="row between wrap" style={{ gap: 12, background: 'var(--n-25)' }}>
          <div className="col gap-1" style={{ minWidth: 0 }}>
            <div className="row gap-1 fw-6"><Icon name="clock" size={15} /> Drip schedule</div>
            <div className="muted t-sm">Release lessons over time to keep members coming back instead of binging and bouncing.</div>
          </div>
          <div className="row gap-2" style={{ flex: 'none', alignItems: 'center' }}>
            {course.dripEnabled && (
              <Select value={course.dripInterval} onChange={e => { updateCourse(course.id, { dripInterval: Number(e.target.value) }); }} style={{ width: 150 }}>
                {[1, 2, 3, 5, 7].map(n => <option key={n} value={n}>Every {n} day{n === 1 ? '' : 's'}</option>)}
              </Select>
            )}
            <button className={`switch${course.dripEnabled ? ' on' : ''}`} aria-pressed={course.dripEnabled} aria-label="Toggle drip schedule"
              onClick={() => { const r = updateCourse(course.id, { dripEnabled: !course.dripEnabled }); toast(r.course.dripEnabled ? 'Drip enabled' : 'Drip disabled'); }} />
          </div>
        </Card>

        {/* modules + lessons */}
        <div className="col gap-3">
          {course.modules.map((m, mi) => (
            <Card key={m.id} pad>
              <div className="row between" style={{ marginBottom: 10 }}>
                <div className="row gap-1"><Badge tone="accent">Module {mi + 1}</Badge><span className="fw-7">{m.title}</span></div>
                <span className="t-sm muted">{m.lessons.length} lesson{m.lessons.length === 1 ? '' : 's'}</span>
              </div>
              <div className="col" style={{ gap: 6 }}>
                {m.lessons.map((l, li) => (
                  <div key={l.id} className="row between" style={{ padding: '.5rem .7rem', borderRadius: 'var(--r-sm)', background: 'var(--n-25)', gap: 10 }}>
                    <span className="row gap-1" style={{ minWidth: 0 }}>
                      <span className="row center" style={{ width: 26, height: 26, borderRadius: 7, flex: 'none', background: 'var(--paper)', border: '1px solid var(--line)', color: LESSON_TYPES[l.type].tint }}>{lessonGlyph(l.type)}</span>
                      <span className="clip">{li + 1}. {l.title}</span>
                    </span>
                    <span className="row gap-1 t-sm muted" style={{ flex: 'none' }}><Badge>{LESSON_TYPES[l.type].label}</Badge>{l.durationMin} min</span>
                  </div>
                ))}
                {!m.lessons.length && <div className="muted t-sm" style={{ padding: '.4rem .2rem' }}>No lessons yet. Add the first one below.</div>}
              </div>
              {/* add lesson inline */}
              <div className="row gap-1 wrap" style={{ marginTop: 10, alignItems: 'flex-end' }}>
                <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                  <Input placeholder="New lesson title" value={lessonDraft[m.id]?.title || ''} onChange={e => setLD(m.id, { title: e.target.value })} onKeyDown={e => e.key === 'Enter' && submitLesson(m.id)} />
                </div>
                <Select value={lessonDraft[m.id]?.type || 'video'} onChange={e => setLD(m.id, { type: e.target.value })} style={{ width: 120, flex: 'none' }}>
                  {Object.entries(LESSON_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </Select>
                <Input type="number" min="1" style={{ width: 90, flex: 'none' }} placeholder="min" value={lessonDraft[m.id]?.durationMin ?? 8} onChange={e => setLD(m.id, { durationMin: e.target.value })} />
                <Button variant="ghost" size="sm" onClick={() => submitLesson(m.id)}><Icon name="plus" size={15} /> Add</Button>
              </div>
            </Card>
          ))}
        </div>

        {/* add module */}
        <div className="row gap-1" style={{ alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}><Field label="Add a module"><Input placeholder="e.g. Advanced Negotiation" value={modTitle} onChange={e => setModTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitModule()} /></Field></div>
          <Button variant="primary" onClick={submitModule}><Icon name="plus" size={16} /> Module</Button>
        </div>
      </div>
    </Modal>
  );
}

function CoursesTab() {
  const courses = getCourses();
  const [builderId, setBuilderId] = useState(null);
  const [newOpen, setNewOpen] = useState(false);
  return (
    <div>
      <SectionHeader title="Course catalog" sub={`${courses.length} courses keeping members learning and logged in`}
        action={
          <>
            <Button variant="ghost" size="sm" onClick={() => askRook('Which Academy course should I build next based on where my members drop off?')}><Icon name="sparkles" size={15} /> Ask Rook</Button>
            <Button variant="primary" size="sm" onClick={() => setNewOpen(true)}><Icon name="plus" size={16} /> New course</Button>
          </>
        } />
      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))' }}>
        {courses.map(c => <CourseCard key={c.id} course={c} onOpen={setBuilderId} />)}
      </div>
      <NewCourseModal open={newOpen} onClose={() => setNewOpen(false)} onCreated={setBuilderId} />
      <CourseBuilderModal courseId={builderId} onClose={() => setBuilderId(null)} />
    </div>
  );
}

/* ============================================================
   OFFERS TAB  (pricing bundles + checkout preview)
   ============================================================ */
function priceLabel(offer) {
  if (offer.billing === 'free') return 'Free';
  return money(offer.price) + (offer.billing === 'monthly' ? '/mo' : '');
}

function CheckoutPreviewModal({ offerId, onClose }) {
  useAcademy();
  const toast = useToast();
  const offer = offerId ? getOffers().find(o => o.id === offerId) : null;
  if (!offer) return null;
  const courses = offerCourses(offer);
  const paymentsLive = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_STRIPE_KEY;
  const copyLink = async () => {
    const link = `https://rally.app/checkout/${offer.id}`;
    try { await navigator.clipboard.writeText(link); toast('Checkout link copied'); } catch { toast(link, 'warn'); }
  };
  return (
    <Modal open={!!offerId} onClose={onClose} width={720}
      title={<span className="row gap-1"><Icon name="receipt" size={18} /> Checkout preview</span>}
      footer={
        <>
          <Button variant="ghost" onClick={copyLink}><Icon name="copy" size={15} /> Copy link</Button>
          <Button variant={offer.status === 'active' ? 'ghost' : 'primary'} onClick={() => { const r = toggleOfferStatus(offer.id); toast(r.offer.status === 'active' ? 'Offer published' : 'Offer set to draft'); }}>
            {offer.status === 'active' ? 'Set to draft' : 'Publish offer'}
          </Button>
        </>
      }>
      <div className="row gap-3 wrap" style={{ alignItems: 'stretch' }}>
        {/* left: what the customer sees */}
        <div className="col gap-2" style={{ flex: '1 1 320px', minWidth: 0 }}>
          <div className="eyebrow">Customer view</div>
          <Card pad className="col gap-2">
            <div className="row between"><h4 style={{ margin: 0 }}>{offer.name}</h4>{offer.featured && <Badge tone="accent">Most popular</Badge>}</div>
            <div className="muted">{offer.description}</div>
            <div className="row" style={{ alignItems: 'baseline', gap: 6 }}>
              <span className="stat-value" style={{ fontSize: '2.4rem' }}>{offer.billing === 'free' ? 'Free' : money(offer.price)}</span>
              {offer.billing !== 'free' && <span className="muted fw-6">{offer.billing === 'monthly' ? 'per month' : 'one-time'}</span>}
            </div>
            <div className="col gap-1" style={{ marginTop: 4 }}>
              {courses.map(c => (
                <div key={c.id} className="row gap-1"><span style={{ color: 'var(--ok)' }}><Icon name="check" size={15} /></span><span className="t-sm">{c.title}</span></div>
              ))}
              <div className="row gap-1"><span style={{ color: 'var(--ok)' }}><Icon name="check" size={15} /></span><span className="t-sm">Community access + certification badges</span></div>
            </div>
            <Button variant="accent" style={{ marginTop: 6 }} onClick={() => toast(paymentsLive ? 'Redirecting to secure checkout...' : 'Add VITE_STRIPE_KEY to take live payments.', paymentsLive ? 'ok' : 'warn')}>
              {offer.billing === 'free' ? 'Get instant access' : 'Continue to checkout'}
            </Button>
          </Card>
        </div>
        {/* right: mock payment form (preview only) + status */}
        <div className="col gap-2" style={{ flex: '1 1 260px', minWidth: 0 }}>
          <div className="eyebrow">Payment step</div>
          <Card pad className="col gap-2">
            <Field label="Email"><Input placeholder="customer@company.com" disabled /></Field>
            <Field label="Card details"><Input placeholder="Card number handled by Stripe Elements" disabled /></Field>
            <div className="row gap-2">
              <Field label="Expiry"><Input placeholder="MM / YY" disabled /></Field>
              <Field label="CVC"><Input placeholder="123" disabled /></Field>
            </div>
            <div className="row gap-1 t-xs muted" style={{ marginTop: 2 }}>
              <Icon name="lock" size={13} />
              {paymentsLive ? 'Live payments are connected.' : 'Preview only. Payments activate when a Stripe key is set in env.'}
            </div>
          </Card>
          <Card pad className="row between" style={{ background: 'var(--n-25)' }}>
            <div className="col gap-1"><span className="stat-label">Lifetime</span><span className="fw-7">{offer.sales} sold</span></div>
            <div className="col gap-1" style={{ textAlign: 'right' }}><span className="stat-label">Revenue</span><span className="fw-7">{moneyK(offer.revenue)}</span></div>
          </Card>
        </div>
      </div>
    </Modal>
  );
}

function NewOfferModal({ open, onClose }) {
  const toast = useToast();
  const courses = getCourses();
  const [draft, setDraft] = useState({ name: '', description: '', price: '49', billing: 'monthly', courseIds: [] });
  const toggleCourse = (id) => setDraft(d => ({ ...d, courseIds: d.courseIds.includes(id) ? d.courseIds.filter(x => x !== id) : [...d.courseIds, id] }));
  const submit = () => {
    const r = createOffer(draft);
    if (r.error) return toast(r.message, 'risk');
    toast('Offer created');
    onClose();
    setDraft({ name: '', description: '', price: '49', billing: 'monthly', courseIds: [] });
  };
  return (
    <Modal open={open} onClose={onClose} title="New offer" width={640}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>Create offer</Button></>}>
      <div className="col gap-3">
        <Field label="Offer name"><Input autoFocus placeholder="Pro Membership" value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} /></Field>
        <Field label="Description"><Textarea rows={2} placeholder="What members get and why it is worth it." value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} /></Field>
        <div className="row gap-2" style={{ alignItems: 'flex-start' }}>
          <Field label="Billing"><Select value={draft.billing} onChange={e => setDraft(d => ({ ...d, billing: e.target.value }))}>{[['monthly', 'Monthly'], ['one-time', 'One-time'], ['free', 'Free']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
          <Field label="Price (USD)"><Input type="number" min="0" step="10" disabled={draft.billing === 'free'} value={draft.billing === 'free' ? 0 : draft.price} onChange={e => setDraft(d => ({ ...d, price: e.target.value }))} /></Field>
        </div>
        <Field label={`Included courses (${draft.courseIds.length})`}>
          <div className="col gap-1" style={{ maxHeight: 180, overflowY: 'auto' }}>
            {courses.map(c => (
              <button key={c.id} onClick={() => toggleCourse(c.id)} className="row between" style={{ padding: '.55rem .7rem', borderRadius: 'var(--r-sm)', border: '1px solid var(--line)', background: draft.courseIds.includes(c.id) ? 'var(--accent-50)' : 'var(--paper)', cursor: 'pointer', textAlign: 'left' }}>
                <span className="clip">{c.title}</span>
                {draft.courseIds.includes(c.id) && <span style={{ color: 'var(--accent-600)', flex: 'none' }}><Icon name="check" size={16} /></span>}
              </button>
            ))}
          </div>
        </Field>
      </div>
    </Modal>
  );
}

function OffersTab() {
  const offers = getOffers();
  const [previewId, setPreviewId] = useState(null);
  const [newOpen, setNewOpen] = useState(false);
  const toast = useToast();
  return (
    <div>
      <SectionHeader title="Offers and pricing" sub="Bundle courses into paid or free offers. This is the revenue line GHL charges for."
        action={<Button variant="primary" size="sm" onClick={() => setNewOpen(true)}><Icon name="plus" size={16} /> New offer</Button>} />
      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {offers.map(o => {
          const courses = offerCourses(o);
          return (
            <Card key={o.id} pad hover className="col gap-2" style={{ position: 'relative', border: o.featured ? '1px solid var(--accent-300)' : undefined }}>
              {o.featured && <div style={{ position: 'absolute', top: -1, right: 16 }}><Badge tone="accent">Most popular</Badge></div>}
              <div className="row between" style={{ alignItems: 'flex-start' }}>
                <div className="col gap-1" style={{ minWidth: 0 }}>
                  <h4 style={{ margin: 0 }}>{o.name}</h4>
                  <Badge tone={o.status === 'active' ? 'ok' : 'default'} style={{ width: 'fit-content' }}>{o.status === 'active' ? 'Active' : 'Draft'}</Badge>
                </div>
              </div>
              <div className="muted t-sm" style={{ minHeight: 40 }}>{o.description}</div>
              <div className="row" style={{ alignItems: 'baseline', gap: 6 }}>
                <span className="stat-value" style={{ fontSize: '2rem' }}>{o.billing === 'free' ? 'Free' : money(o.price)}</span>
                {o.billing !== 'free' && <span className="muted fw-6">{o.billing === 'monthly' ? '/mo' : 'once'}</span>}
              </div>
              <div className="row gap-1 wrap">
                <Badge><Icon name="book" size={12} /> {courses.length} course{courses.length === 1 ? '' : 's'}</Badge>
                <Badge>{o.sales} sold</Badge>
                <Badge tone="accent">{moneyK(o.revenue)} earned</Badge>
              </div>
              <div className="row gap-1" style={{ marginTop: 'auto', paddingTop: 8 }}>
                <Button variant="ghost" size="sm" style={{ flex: 1 }} onClick={() => setPreviewId(o.id)}><Icon name="eye" size={15} /> Preview checkout</Button>
                <Button variant={o.status === 'active' ? 'quiet' : 'primary'} size="sm" onClick={() => { const r = toggleOfferStatus(o.id); toast(r.offer.status === 'active' ? 'Published' : 'Set to draft'); }}>{o.status === 'active' ? 'Unpublish' : 'Publish'}</Button>
              </div>
            </Card>
          );
        })}
      </div>
      <CheckoutPreviewModal offerId={previewId} onClose={() => setPreviewId(null)} />
      <NewOfferModal open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  );
}

/* ============================================================
   MEMBERS TAB  (progress + engagement)
   ============================================================ */
function MemberDetailModal({ memberId, onClose }) {
  useAcademy();
  const toast = useToast();
  const m = memberId ? getMember(memberId) : null;
  if (!m) return null;
  const status = memberStatus(m.id);
  return (
    <Modal open={!!memberId} onClose={onClose} width={640}
      title={<span className="row gap-1"><Avatar name={m.name} size={26} /> {m.name}</span>}
      footer={
        <>
          <Button variant="ghost" onClick={() => { askRook(`Draft a re-engagement message for Academy member ${m.name}, who is ${MEMBER_STATUS[status].label.toLowerCase()} at ${memberOverallProgress(m.id)}% overall progress.`); onClose(); }}><Icon name="sparkles" size={15} /> Nudge with Rook</Button>
          <Button variant="primary" onClick={onClose}>Done</Button>
        </>
      }>
      <div className="col gap-3">
        <div className="row gap-3 wrap" style={{ alignItems: 'center' }}>
          <Ring value={memberOverallProgress(m.id)} size={72} label={`${memberOverallProgress(m.id)}%`} />
          <div className="col gap-1" style={{ minWidth: 0 }}>
            <div className="row gap-1"><Badge tone={MEMBER_STATUS[status].tone}>{MEMBER_STATUS[status].label}</Badge></div>
            <div className="muted t-sm">{m.email}</div>
            <div className="muted t-sm">Joined {relTime(m.joinedAt)} - last active {relTime(m.lastActivityAt)}</div>
          </div>
        </div>
        <div className="col gap-2">
          <div className="eyebrow">Enrolled courses</div>
          {m.enrolledCourseIds.map(cid => {
            const c = getCourse(cid); if (!c) return null;
            const p = memberCourseProgress(m.id, cid);
            return (
              <div key={cid} className="col gap-1" style={{ padding: '.6rem .1rem' }}>
                <div className="row between"><span className="fw-6 clip">{c.title}</span><span className="t-sm muted tnum">{p}%</span></div>
                <ProgressBar value={p} color={c.accent} />
              </div>
            );
          })}
          {!m.enrolledCourseIds.length && <div className="muted t-sm">Not enrolled in any course yet.</div>}
        </div>
      </div>
    </Modal>
  );
}

function MembersTab() {
  const members = getMembers();
  const [filter, setFilter] = useState('all');
  const [detailId, setDetailId] = useState(null);
  const rows = members
    .map(m => ({ m, status: memberStatus(m.id), progress: memberOverallProgress(m.id) }))
    .filter(r => filter === 'all' || r.status === filter)
    .sort((a, b) => new Date(b.m.lastActivityAt) - new Date(a.m.lastActivityAt));
  const opts = [{ value: 'all', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'at-risk', label: 'At risk' }, { value: 'completed', label: 'Graduated' }, { value: 'new', label: 'New' }];
  return (
    <div>
      <SectionHeader title="Members" sub={`${members.length} enrolled learners. Engagement is your churn early-warning system.`}
        action={<Button variant="ghost" size="sm" onClick={() => askRook('List my at-risk Academy members and suggest one re-engagement play for each.')}><Icon name="sparkles" size={15} /> Ask Rook</Button>} />
      <div className="row between wrap gap-2" style={{ marginBottom: '1rem' }}>
        <Segmented options={opts} value={filter} onChange={setFilter} />
        <span className="t-sm muted">{rows.length} shown</span>
      </div>
      <Card pad={false} style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead><tr><th>Member</th><th>Status</th><th>Courses</th><th style={{ width: '26%' }}>Progress</th><th>Last active</th></tr></thead>
          <tbody>
            {rows.map(({ m, status, progress }) => (
              <tr key={m.id} onClick={() => setDetailId(m.id)} style={{ cursor: 'pointer' }}>
                <td>
                  <span className="row gap-1" style={{ minWidth: 0 }}><Avatar name={m.name} size={30} /><span className="col" style={{ minWidth: 0 }}><span className="fw-6 clip">{m.name}</span><span className="t-xs muted clip">{m.email}</span></span></span>
                </td>
                <td><Badge tone={MEMBER_STATUS[status].tone}>{MEMBER_STATUS[status].label}</Badge></td>
                <td className="tnum">{m.enrolledCourseIds.length}</td>
                <td>
                  <span className="row gap-1" style={{ alignItems: 'center' }}><span style={{ flex: 1 }}><ProgressBar value={progress} /></span><span className="t-sm tnum muted" style={{ width: 38, textAlign: 'right' }}>{progress}%</span></span>
                </td>
                <td className="t-sm muted">{relTime(m.lastActivityAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <EmptyState icon="👥" title="No members here" body="Try a different filter." />}
      </Card>
      <MemberDetailModal memberId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}

/* ============================================================
   COMMUNITY TAB  (feed + channels + members)
   ============================================================ */
function CommunityTab() {
  const channels = getChannels();
  const posts = getPosts();
  const me = getCurrentMember();
  const toast = useToast();
  const [channel, setChannel] = useState('all');
  const [draft, setDraft] = useState('');
  const [composeChannel, setComposeChannel] = useState('ch_general');
  const shown = posts.filter(p => channel === 'all' || p.channelId === channel);
  const channelName = (id) => channels.find(c => c.id === id)?.name || 'General';
  const post = () => {
    const r = createPost({ authorId: me.id, channelId: composeChannel, body: draft });
    if (r.error) return toast(r.message, 'risk');
    setDraft('');
    toast('Posted to the community');
  };
  return (
    <div>
      <SectionHeader title="Community" sub="A space where members answer each other, share wins, and stay. Belonging is the best retention tool there is." />
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '1.15rem', alignItems: 'start' }}>
        {/* feed */}
        <div className="col gap-3" style={{ minWidth: 0 }}>
          {/* composer */}
          <Card pad className="col gap-2">
            <div className="row gap-1"><Avatar name={me.name} size={34} /><span className="fw-6">Share with the community</span></div>
            <Textarea rows={2} placeholder="Ask a question, share a win, or drop a playbook..." value={draft} onChange={e => setDraft(e.target.value)} />
            <div className="row between wrap gap-2">
              <Select value={composeChannel} onChange={e => setComposeChannel(e.target.value)} style={{ width: 180 }}>
                {channels.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
              </Select>
              <Button variant="primary" size="sm" disabled={!draft.trim()} onClick={post}><Icon name="send" size={15} /> Post</Button>
            </div>
          </Card>
          {/* channel filter */}
          <div className="row gap-1 wrap">
            <button className={`btn btn-sm ${channel === 'all' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setChannel('all')}>All</button>
            {channels.map(c => (
              <button key={c.id} className={`btn btn-sm ${channel === c.id ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setChannel(c.id)}><Icon name={c.icon} size={14} /> {c.name}</button>
            ))}
          </div>
          {/* posts */}
          <div className="col gap-2 stagger">
            {shown.map(p => {
              const author = getMember(p.authorId);
              return (
                <Card key={p.id} pad className="col gap-2">
                  <div className="row between">
                    <span className="row gap-1" style={{ minWidth: 0 }}>
                      <Avatar name={author?.name || 'Member'} size={34} />
                      <span className="col" style={{ minWidth: 0 }}>
                        <span className="fw-6 clip">{author?.name || 'Member'}</span>
                        <span className="t-xs muted">{relTime(p.createdAt)} in #{channelName(p.channelId)}</span>
                      </span>
                    </span>
                    {p.pinned && <Badge tone="accent">Pinned</Badge>}
                  </div>
                  <div style={{ lineHeight: 1.55 }}>{p.body}</div>
                  <div className="row gap-3" style={{ color: 'var(--n-600)' }}>
                    <button className="row gap-1" onClick={() => toggleLike(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: p.likedByMe ? 'var(--risk)' : 'var(--n-600)', fontWeight: 600 }} aria-pressed={p.likedByMe} aria-label="Like">
                      <HeartGlyph filled={p.likedByMe} /> {p.likes}
                    </button>
                    <span className="row gap-1 t-sm"><ChatGlyph /> {p.comments}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
        {/* sidebar */}
        <div className="col gap-3" style={{ minWidth: 0 }}>
          <Card pad className="col gap-2">
            <div className="eyebrow">Channels</div>
            {channels.map(c => (
              <button key={c.id} className="row between" onClick={() => setChannel(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '.35rem .1rem', textAlign: 'left' }}>
                <span className="row gap-1"><span style={{ color: c.color }}><Icon name={c.icon} size={16} /></span> #{c.name}</span>
                <span className="t-xs muted">{posts.filter(p => p.channelId === c.id).length}</span>
              </button>
            ))}
          </Card>
          <Card pad className="col gap-2">
            <div className="eyebrow">Top contributors</div>
            {topContributors(5).map(({ member, count }) => (
              <div key={member.id} className="row between">
                <span className="row gap-1" style={{ minWidth: 0 }}><Avatar name={member.name} size={28} /><span className="clip t-sm fw-6">{member.name}</span></span>
                <Badge>{count} posts</Badge>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   CLIENT PORTAL TAB  (what a customer sees on login)
   ============================================================ */
function PortalTab() {
  useAcademy();
  const members = getMembers();
  const me = getCurrentMember();
  const toast = useToast();
  const enrolled = me.enrolledCourseIds.map(getCourse).filter(Boolean);
  const inProgress = enrolled
    .map(c => ({ c, p: memberCourseProgress(me.id, c.id) }))
    .filter(x => x.p < 100)
    .sort((a, b) => b.p - a.p);
  const resume = (courseId) => {
    const r = completeNextLesson(me.id, courseId);
    if (r.error) return toast(r.message, 'warn');
    toast(`Completed: ${r.lesson.title}`);
  };
  return (
    <div>
      <SectionHeader title="Client portal preview" sub="Exactly what your customer sees when they log in. Their courses, progress, and resources in one place."
        action={
          <div className="row gap-1" style={{ alignItems: 'center' }}>
            <span className="t-sm muted desktop-only">Viewing as</span>
            <Select value={me.id} onChange={e => setCurrentMember(e.target.value)} style={{ width: 190 }}>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
          </div>
        } />

      {/* portal hero */}
      <Card pad style={{ background: 'linear-gradient(120deg, var(--accent-700), var(--accent) 55%, var(--accent-purple))', color: '#fff', border: 'none', marginBottom: '1.15rem' }}>
        <div className="row between wrap" style={{ gap: 16 }}>
          <div className="col gap-1" style={{ minWidth: 0 }}>
            <div className="eyebrow" style={{ color: 'rgba(255,255,255,.85)' }}>Your learning hub</div>
            <h3 style={{ margin: 0, color: '#fff' }}>Welcome back, {me.name.split(' ')[0]}</h3>
            <div style={{ color: 'rgba(255,255,255,.9)' }}>{enrolled.length} course{enrolled.length === 1 ? '' : 's'} enrolled - {memberOverallProgress(me.id)}% of your journey complete</div>
          </div>
          <Ring value={memberOverallProgress(me.id)} size={84} stroke={8} color="#fff" label={<span style={{ color: '#fff' }}>{memberOverallProgress(me.id)}%</span>} />
        </div>
      </Card>

      {/* continue learning */}
      <div className="col gap-2" style={{ marginBottom: '1.4rem' }}>
        <SectionHeader title="Continue learning" sub="Pick up right where you left off." />
        {inProgress.length ? (
          <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {inProgress.slice(0, 3).map(({ c, p }) => {
              const next = courseLessons(c).find(l => !isLessonComplete(me.id, l.id));
              return (
                <Card key={c.id} pad className="col gap-2">
                  <div className="row gap-2" style={{ alignItems: 'center' }}>
                    <Ring value={p} size={48} label={`${p}%`} color={c.accent} />
                    <div className="col gap-1" style={{ minWidth: 0 }}><span className="fw-7 clip">{c.title}</span><span className="t-xs muted">{c.instructor}</span></div>
                  </div>
                  {next && (
                    <div className="row gap-1 t-sm" style={{ padding: '.5rem .7rem', borderRadius: 'var(--r-sm)', background: 'var(--n-25)' }}>
                      <span style={{ color: LESSON_TYPES[next.type].tint }}>{lessonGlyph(next.type)}</span>
                      <span className="clip">Up next: {next.title}</span>
                    </div>
                  )}
                  <Button variant="primary" size="sm" onClick={() => resume(c.id)}><PlayGlyph /> Resume lesson</Button>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState icon="🎓" title="All caught up" body="This member has completed every enrolled course. Time to offer them the next one." />
        )}
      </div>

      {/* my courses + resources */}
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: '1.15rem', alignItems: 'start' }}>
        <div className="col gap-2">
          <SectionHeader title="My courses" />
          <Card pad={false} style={{ overflow: 'hidden' }}>
            {enrolled.map((c, i) => {
              const p = memberCourseProgress(me.id, c.id);
              return (
                <div key={c.id} className="row between" style={{ padding: '.9rem 1.1rem', borderTop: i ? '1px solid var(--line)' : 'none', gap: 12 }}>
                  <span className="row gap-2" style={{ minWidth: 0 }}>
                    <span style={{ width: 8, height: 40, borderRadius: 4, background: c.accent, flex: 'none' }} />
                    <span className="col" style={{ minWidth: 0 }}><span className="fw-6 clip">{c.title}</span><span className="t-xs muted">{courseLessonCount(c)} lessons - {Math.round(courseDuration(c) / 60 * 10) / 10}h</span></span>
                  </span>
                  <span className="row gap-2" style={{ flex: 'none', alignItems: 'center', width: 150 }}>
                    <span style={{ flex: 1 }}><ProgressBar value={p} color={c.accent} /></span>
                    <span className="t-sm tnum muted" style={{ width: 34, textAlign: 'right' }}>{p}%</span>
                  </span>
                </div>
              );
            })}
            {!enrolled.length && <EmptyState icon="📚" title="No courses yet" body="Enroll this member from an offer to get started." />}
          </Card>
        </div>
        <div className="col gap-2">
          <SectionHeader title="Resources" />
          <Card pad className="col gap-1">
            {[['Discovery question bank', 'fileText'], ['Cold email templates', 'mail'], ['Negotiation cheat sheet', 'fileText'], ['Community guidelines', 'book']].map(([label, icon]) => (
              <button key={label} className="row between" onClick={() => toast(`Opening: ${label}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '.55rem .1rem', textAlign: 'left' }}>
                <span className="row gap-1"><span style={{ color: 'var(--accent-600)' }}><Icon name={icon} size={16} /></span> {label}</span>
                <Icon name="download" size={15} className="muted" />
              </button>
            ))}
          </Card>
          <Card pad className="col gap-2" style={{ background: 'var(--n-25)' }}>
            <div className="row gap-1 fw-6"><Icon name="sparkles" size={16} style={{ color: 'var(--accent-600)' }} /> Need a hand?</div>
            <div className="t-sm muted">Ask Rook anything about your courses, progress, or what to learn next.</div>
            <Button variant="ghost" size="sm" onClick={() => askRook(`I am the member ${me.name}. What should I focus on next in my Academy courses?`)}>Ask Rook</Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PAGE SHELL
   ============================================================ */
const TABS = [
  { key: 'courses', label: 'Courses' },
  { key: 'offers', label: 'Offers' },
  { key: 'members', label: 'Members' },
  { key: 'community', label: 'Community' },
  { key: 'portal', label: 'Client portal' },
];

export default function Academy() {
  useAcademy(); // subscribe: any store mutation re-renders the whole page
  const [tab, setTab] = useState('courses');
  const m = academyMetrics();
  return (
    <div className="fade-up">
      <PageTitle
        eyebrow="Delivery"
        title={<>Rally <GradientText>Academy</GradientText></>}
        sub="Courses, memberships, and community that keep customers inside the platform and add a recurring revenue line."
        action={<Button variant="ghost" size="sm" onClick={() => askRook('Give me a 3-step plan to grow Academy membership revenue this quarter.')}><Icon name="sparkles" size={15} /> Ask Rook</Button>}
      />

      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '1.5rem' }}>
        <StatCard label="Active members" value={m.activeMembers} icon={<Icon name="users" size={18} />} sub={`of ${m.memberCount} enrolled`} spark={[6, 8, 7, 11, 13, 12, 15, 18]} />
        <StatCard label="Course completions" value={m.completions} accent="var(--ok)" sparkColor="var(--ok)" icon={<Icon name="check" size={18} />} sub={`${m.avgCompletion}% avg progress`} spark={[3, 5, 6, 6, 9, 11, 12, 14]} />
        <StatCard label="Academy revenue" value={m.mrr} format={moneyK} accent="var(--accent-purple)" sparkColor="var(--accent-purple)" icon={<Icon name="dollar" size={18} />} sub="recurring, per month" spark={[12, 14, 15, 19, 22, 24, 27, 31]} />
        <StatCard label="Community posts" value={m.postsThisWeek} accent="var(--accent-teal)" sparkColor="var(--accent-teal)" icon={<Icon name="activity" size={18} />} sub="in the last 7 days" spark={[2, 4, 3, 5, 4, 6, 7, 8]} />
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'courses' && <CoursesTab />}
      {tab === 'offers' && <OffersTab />}
      {tab === 'members' && <MembersTab />}
      {tab === 'community' && <CommunityTab />}
      {tab === 'portal' && <PortalTab />}
    </div>
  );
}
