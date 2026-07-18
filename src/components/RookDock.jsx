// RookDock - Rally's always-there AI operator, docked bottom-right on every
// screen. Ask it anything ("which deals are slipping?"), and it answers from
// your live book of business, points you to the right screen, or proposes
// actions you run with one click (create a contact/company/deal, log an
// activity, move a stage, draft an email, generate a QBR deck). In Juggernaut
// mode one sentence stands up a whole account. Rook proposes; the store writers
// do the work, live in the chat.
import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icon } from './icons.jsx';
import { moneyK } from './UI.jsx';
import { celebrate } from '../lib/celebrate.js';
import {
  getCurrentUser, userName, contactName, pipelineValue, weightedForecast, winRate,
  openDeals, slippingDeals, myDayQueue, getCompanies, getDealsForCompany, getContactsForCompany,
  getDeal, getContact, getCompany, stageById, OPEN_STAGES,
  getContacts, getDeals, getActivities, getUsers, wonThisMonth,
  createCompany, createContact, createDeal, createActivity, moveDealStage,
} from '../lib/store.js';
import {
  getLeads, getProducts, getQuotes, getInvoices, getCampaigns, getSequences, getTickets, getWorkflows,
  arOutstanding, arOverdue, arPaid, campaignRevenue, openTickets, qualifiedLeads,
} from '../lib/store-ext.js';
import { hasRookAction, runRookAction } from '../lib/rook-actions.js';

function RookGlyph({ size = 22, color = '#fff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden>
      <path d="M6 3h2v2h2V3h4v2h2V3h2v5l-2 2v6l1 3H5l1-3v-6L4 8V3h2zm1 15h10v2H7v-2z" />
    </svg>
  );
}

const GREETING = {
  role: 'assistant',
  content: "I'm Rook, your revenue operator. I know your pipeline cold. I can answer questions, build a contact, company, or deal, draft a follow-up, generate a QBR deck, or stand up a whole account from one sentence. Ask me anything, or try one of these:",
};
const STARTERS = [
  'Which deals are slipping?',
  "What is my forecast this quarter?",
  'Set up Northwind Freight as an enterprise account with a 180k deal and a first-call task Friday',
  'Draft a follow-up email for the Vertex Robotics deal',
  'What is on my plate today?',
];

const CAPS = [
  { group: 'Stand up a whole account', icon: 'zap', tint: '#5b4bf5', items: [
    'Set up Acme Systems as a new enterprise account with a 120k deal and a first-call task Friday',
    'Onboard Cascade Health with a buying committee and a pilot deal',
    'Create a new account for Ironclad Aerospace with a renewal opportunity',
  ] },
  { group: 'Ask about the business', icon: 'search', tint: '#0ea5a3', items: [
    'Which deals are slipping?',
    'What is my weighted forecast this quarter?',
    'Which accounts have we not touched in 30 days?',
  ] },
  { group: 'Create + log', icon: 'plus', tint: '#b3721a', items: [
    'Add a contact at Vertex Robotics',
    'Log a discovery call on the Vertex deal',
    'Move the Vertex deal to proposal',
  ] },
  { group: 'Draft + generate', icon: 'fileText', tint: '#2563a8', items: [
    'Draft a follow-up email for the Vertex Robotics deal',
    'Generate a QBR deck for Vertex Robotics',
    'Write a re-engagement email for a cold account',
  ] },
  { group: 'Get around', icon: 'chevronRight', tint: '#8b3fd4', items: [
    'Take me to the deals pipeline',
    'Open my dashboards',
    'Show me my day',
  ] },
];

const actionIconName = (k) => ({
  build_account: 'zap', create_company: 'building', create_contact: 'users', create_deal: 'target',
  log_activity: 'checkSquare', move_stage: 'target', draft_email: 'mail', generate_deck: 'fileText',
  navigate: 'chevronRight',
}[k] || 'chevronRight');

/* Build a COMPLETE live snapshot of the whole workspace for grounding. Exact
   counts of every object plus full records, so Rook can answer any inventory,
   lookup, or count question precisely. Rook is blind to whatever is not here. */
function buildSnapshot(path) {
  const cu = getCurrentUser();
  const allDeals = getDeals();
  const opens = openDeals();
  const allContacts = getContacts();
  const allCompanies = getCompanies();
  const allActs = getActivities();
  const leads = getLeads();
  const tickets = getTickets();

  const counts = {
    contacts: allContacts.length,
    companies: allCompanies.length,
    deals: allDeals.length,
    openDeals: opens.length,
    wonDeals: allDeals.filter(d => d.status === 'won').length,
    lostDeals: allDeals.filter(d => d.status === 'lost').length,
    activities: allActs.length,
    openTasks: allActs.filter(a => !a.done && a.type !== 'note').length,
    users: getUsers().length,
    leads: leads.length,
    qualifiedLeads: qualifiedLeads().length,
    products: getProducts().length,
    quotes: getQuotes().length,
    invoices: getInvoices().length,
    campaigns: getCampaigns().length,
    sequences: getSequences().length,
    tickets: tickets.length,
    openTickets: openTickets().length,
    workflows: getWorkflows().length,
  };

  const stageBreakdown = OPEN_STAGES.map(s => {
    const list = opens.filter(d => d.stage === s.id);
    return { stage: s.name, count: list.length, value: list.reduce((a, d) => a + d.value, 0) };
  });

  const companies = allCompanies.map(c => ({
    id: c.id, name: c.name, industry: c.industry, size: c.size, health: c.health, owner: userName(c.ownerId),
    contacts: getContactsForCompany(c.id).length,
    openPipeline: getDealsForCompany(c.id).filter(d => d.status === 'open').reduce((a, d) => a + d.value, 0),
  }));

  const contacts = allContacts.map(c => ({
    id: c.id, name: contactName(c), title: c.title, company: getCompany(c.companyId)?.name || null,
    email: c.email, owner: userName(c.ownerId), lastActivity: c.lastActivityAt,
  }));

  const deals = allDeals.map(d => ({
    id: d.id, name: d.name, company: getCompany(d.companyId)?.name || null, value: d.value,
    stage: stageById(d.stage)?.name, status: d.status, probability: d.probability, closeDate: d.closeDate, owner: userName(d.ownerId),
  }));

  const activityByType = {};
  for (const a of allActs) activityByType[a.type] = (activityByType[a.type] || 0) + 1;

  const revenue = {
    pipeline: pipelineValue(), forecast: Math.round(weightedForecast()), winRate: winRate(),
    wonThisMonth: wonThisMonth().reduce((a, d) => a + d.value, 0),
    arOutstanding: arOutstanding(), arOverdue: arOverdue(), collected: arPaid(),
    campaignRevenue: campaignRevenue(),
  };

  const modules = {
    leads: leads.map(l => ({ name: l.name, company: l.company, status: l.status, score: l.score, source: l.source, owner: userName(l.ownerId) })),
    quotes: getQuotes().map(q => ({ number: q.number, company: q.companyName, amount: q.amount, status: q.status })),
    invoices: getInvoices().map(i => ({ number: i.number, company: i.companyName, amount: i.amount, status: i.status })),
    tickets: tickets.map(t => ({ number: t.number, subject: t.subject, company: t.companyName, priority: t.priority, status: t.status, assignee: userName(t.assigneeId) })),
    campaigns: getCampaigns().map(c => ({ name: c.name, channel: c.channel, status: c.status, revenue: c.revenue, leads: c.leads })),
    products: getProducts().map(p => ({ name: p.name, category: p.category, price: p.price, billing: p.billing })),
    workflows: getWorkflows().map(w => ({ name: w.name, trigger: w.trigger, active: w.active })),
  };

  const slipping = slippingDeals().map(d => ({ id: d.id, name: d.name, value: d.value, closeDate: d.closeDate }));
  const myDay = myDayQueue(cu?.id).map(a => ({ type: a.type, subject: a.subject, due: a.dueAt }));

  let focus = null;
  let m;
  if ((m = /\/deals\/([^/?]+)/.exec(path || ''))) {
    const d = getDeal(m[1]);
    if (d) focus = { type: 'deal', id: d.id, name: d.name, value: d.value, stage: stageById(d.stage)?.name, company: getCompany(d.companyId)?.name, companyId: d.companyId };
  } else if ((m = /\/companies\/([^/?]+)/.exec(path || ''))) {
    const c = getCompany(m[1]);
    if (c) focus = { type: 'company', id: c.id, name: c.name, industry: c.industry, contacts: getContactsForCompany(c.id).map(x => ({ id: x.id, name: contactName(x), title: x.title })) };
  } else if ((m = /\/contacts\/([^/?]+)/.exec(path || ''))) {
    const c = getContact(m[1]);
    if (c) focus = { type: 'contact', id: c.id, name: contactName(c), title: c.title, company: getCompany(c.companyId)?.name, companyId: c.companyId };
  }

  return {
    currentUser: { name: cu?.name, title: cu?.title },
    counts, revenue, stageBreakdown, companies, contacts, deals, activityByType,
    slipping, myDay, modules, focus,
  };
}

export default function RookDock() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([GREETING]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [running, setRunning] = useState(null);
  const [building, setBuilding] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [training, setTraining] = useState(false);
  const loc = useLocation();
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const recogRef = useRef(null);
  // Refs let the voice loop read the latest state without re-creating callbacks.
  const voiceModeRef = useRef(false);
  const speakingRef = useRef(false);
  const sendRef = useRef(null);
  useEffect(() => { voiceModeRef.current = voiceMode; }, [voiceMode]);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [msgs, busy, open, building]);
  useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);

  // Open from anywhere (e.g. the Command center "Ask Rook" banner, the Training
  // page steps). detail.training flips Rook into patient-trainer mode.
  useEffect(() => {
    const onOpen = (e) => {
      setOpen(true);
      if (e.detail?.training) setTraining(true);
      const p = e.detail?.prompt;
      if (p) setTimeout(() => send(p), 120);
    };
    window.addEventListener('rally:rook', onOpen);
    return () => window.removeEventListener('rally:rook', onOpen);
  }, []); // eslint-disable-line

  const speechOK = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
  const toggleMic = () => {
    if (!speechOK) return;
    if (listening) { try { recogRef.current?.stop(); } catch {} return; }
    try {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SR();
      rec.lang = 'en-US'; rec.interimResults = true; rec.continuous = false;
      const base = input ? input.trim() + ' ' : '';
      rec.onresult = (e) => { let txt = ''; for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript; setInput(base + txt); };
      rec.onend = () => { setListening(false); recogRef.current = null; inputRef.current?.focus(); };
      rec.onerror = () => { setListening(false); recogRef.current = null; };
      recogRef.current = rec; setListening(true); rec.start();
    } catch { setListening(false); }
  };
  useEffect(() => () => { try { recogRef.current?.stop(); } catch {} }, []);

  // ---- Hands-free VOICE MODE: continuous listen -> send -> speak -> listen.
  // Feature-detected and fully defensive: if speech APIs are missing it simply
  // never turns on, and the app is unaffected. This is the Web Speech fallback;
  // a vendor (Vapi / ElevenLabs) can later replace speak()/listen() wholesale.
  const ttsOK = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const voiceOK = !!speechOK && ttsOK;

  const stripForSpeech = (t) => String(t || '')
    .replace(/[\u2019\u2018]/g, "'").replace(/[\u201c\u201d]/g, '"')
    .replace(/[*_`#>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 320);

  const startVoiceListen = useCallback(() => {
    if (!voiceModeRef.current || !speechOK || speakingRef.current) return;
    if (recogRef.current) return; // already listening
    try {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SR();
      rec.lang = 'en-US'; rec.interimResults = false; rec.continuous = false;
      rec.onspeechstart = () => { if (speakingRef.current) { try { window.speechSynthesis.cancel(); } catch {} speakingRef.current = false; setSpeaking(false); } };
      rec.onresult = (e) => {
        let txt = ''; for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
        txt = txt.trim();
        recogRef.current = null; setListening(false);
        if (txt) sendRef.current?.(txt);
      };
      rec.onend = () => { setListening(false); recogRef.current = null; };
      rec.onerror = () => { setListening(false); recogRef.current = null; };
      recogRef.current = rec; setListening(true); rec.start();
    } catch { setListening(false); recogRef.current = null; }
  }, [speechOK]);

  const speak = useCallback((text) => {
    if (!voiceModeRef.current || !ttsOK) return;
    try {
      const synth = window.speechSynthesis;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(stripForSpeech(text));
      u.rate = 1.05; u.pitch = 1.0;
      speakingRef.current = true; setSpeaking(true);
      u.onend = () => { speakingRef.current = false; setSpeaking(false); setTimeout(() => startVoiceListen(), 250); };
      u.onerror = () => { speakingRef.current = false; setSpeaking(false); };
      synth.speak(u);
    } catch { speakingRef.current = false; setSpeaking(false); }
  }, [ttsOK, startVoiceListen]);

  const toggleVoiceMode = () => {
    if (!voiceOK) return;
    if (voiceMode) {
      voiceModeRef.current = false; setVoiceMode(false);
      try { window.speechSynthesis.cancel(); } catch {}
      try { recogRef.current?.stop(); } catch {}
      speakingRef.current = false; setSpeaking(false); setListening(false);
    } else {
      voiceModeRef.current = true; setVoiceMode(true);
      setTimeout(() => startVoiceListen(), 150);
    }
  };
  useEffect(() => () => { try { window.speechSynthesis?.cancel(); } catch {} }, []);

  const go = (to) => { if (to) { navigate(to); setOpen(false); } };
  const push = (content, extra) => setMsgs(m => [...m, { role: 'assistant', content, ...(extra || {}) }]);
  const pause = (ms) => new Promise(r => setTimeout(r, ms));

  const send = useCallback(async (text) => {
    const q = (text ?? input).trim();
    if (!q || busy || building) return;
    const next = [...msgs, { role: 'user', content: q }];
    setMsgs(next); setInput(''); setBusy(true);
    try {
      const r = await fetch('/api/rook', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content })),
          snapshot: buildSnapshot(loc.pathname),
          context: { path: loc.pathname, mode: training ? 'training' : 'operator', voice: voiceModeRef.current },
        }),
      });
      const data = await r.json();
      if (!r.ok || !data.ok) throw new Error(data.error || 'Rook is unavailable');
      setMsgs(m => [...m, { role: 'assistant', content: data.reply, nav: data.nav, actions: data.actions || [], suggestions: data.suggestions || [] }]);
      // Voice mode: speak the reply, and if Rook pointed somewhere, take them
      // there (once) without making them click. Speaking resumes listening.
      if (voiceModeRef.current) {
        speak(data.reply);
        if (data.nav?.to) setTimeout(() => { navigate(data.nav.to); }, 700);
      }
    } catch (e) {
      const msg = `I hit a snag: ${e.message}. Check that ANTHROPIC_API_KEY is wired, then try again.`;
      setMsgs(m => [...m, { role: 'assistant', content: msg }]);
      if (voiceModeRef.current) speak('Sorry, I hit a snag. Try again.');
    } finally { setBusy(false); }
  }, [input, busy, building, msgs, loc.pathname, training, speak, navigate]);
  useEffect(() => { sendRef.current = send; }, [send]);

  const daysToDate = (d) => new Date(Date.now() + (Number(d) || 1) * 86400000).toISOString();

  // JUGGERNAUT: one sentence -> a whole account, built live via store writers.
  const runBuild = async (goal) => {
    if (building) return;
    setBuilding(true);
    push(`Standing up the account. Designing it from "${goal}"...`);
    try {
      const r = await fetch('/api/rook-plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ goal }) });
      const data = await r.json();
      if (!r.ok || !data.ok) throw new Error(data.error || 'planner failed');
      const plan = data.plan;
      push(`Blueprint ready: ${plan.company.name}, ${plan.contacts?.length || 0} contacts, a ${moneyK(plan.deal?.value)} deal, ${plan.activities?.length || 0} first activities. Building it now...`);
      await pause(300);

      const coRes = createCompany(plan.company);
      const co = coRes.company;
      if (!co) throw new Error(coRes.message || 'could not create the company');
      push(`Created ${co.name} ✓`);
      await pause(220);

      const contactIds = [];
      for (const ct of (plan.contacts || [])) {
        const cr = createContact({ firstName: ct.firstName, lastName: ct.lastName, title: ct.title, companyId: co.id });
        if (cr.contact) contactIds.push(cr.contact.id);
      }
      push(`Added ${contactIds.length} contacts (the buying committee) ✓`);
      await pause(220);

      const dr = createDeal({
        name: plan.deal.name, companyId: co.id, contactIds,
        value: plan.deal.value, stage: plan.deal.stage || 'qualified',
        closeDate: daysToDate(plan.deal.closeInDays || 45),
      });
      const deal = dr.deal;
      if (!deal) throw new Error(dr.message || 'could not open the deal');
      push(`Opened the deal: ${deal.name} at ${moneyK(deal.value)} ✓`);
      await pause(220);

      let made = 0;
      for (const a of (plan.activities || [])) {
        const ar = createActivity({ type: a.type || 'task', subject: a.subject, relatedType: 'deal', relatedId: deal.id, companyId: co.id, dueAt: daysToDate(a.dueInDays) });
        if (ar.activity) made++;
      }
      push(`Scheduled ${made} first activities ✓`);
      await pause(150);

      celebrate({ x: window.innerWidth - 90, y: window.innerHeight - 90, count: 90 });
      push(`Done. ${co.name} is a live account now - company, buying committee, a ${moneyK(deal.value)} deal, and your first tasks. What next?`, {
        actions: [
          { kind: 'navigate', label: `Open ${co.name}`, to: `/companies/${co.id}` },
          { kind: 'navigate', label: 'Go to the deal', to: `/deals/${deal.id}` },
          { kind: 'generate_deck', label: 'Generate a QBR deck', company_id: co.id },
        ],
      });
    } catch (e) {
      push(`The build hit a snag: ${e.message}. Anything created is real and editable - open Companies to check.`);
    } finally { setBuilding(false); }
  };

  const runAction = async (a) => {
    if (running || building) return;
    if (a.kind === 'build_account') return runBuild(a.goal || a.label);
    const key = a.label + a.kind;
    setRunning(key);
    try {
      // Newer Rook-operated surfaces (broadcasts, quotes, scheduling, deal
      // summaries, fork studio) live in the action registry. Run them through
      // the SAME push/go helpers before the built-in kind checks.
      if (hasRookAction(a.kind)) { await runRookAction(a.kind, a, { push, go }); return; }
      if (a.kind === 'navigate' && a.to) return go(a.to);

      if (a.kind === 'create_company' && a.company?.name) {
        const r = createCompany(a.company);
        if (r.error) return push(r.message);
        push(`Created ${r.company.name}. Opening it now.`); return go(`/companies/${r.company.id}`);
      }
      if (a.kind === 'create_contact' && a.contact?.firstName) {
        const r = createContact(a.contact);
        if (r.error) return push(r.message);
        push(`Added ${contactName(r.contact)}. Opening the contact.`); return go(`/contacts/${r.contact.id}`);
      }
      if (a.kind === 'create_deal' && a.deal?.name) {
        const r = createDeal({ ...a.deal, closeDate: a.deal.closeDate || daysToDate(45) });
        if (r.error) return push(r.message);
        push(`Opened ${r.deal.name} at ${moneyK(r.deal.value)}. Opening the deal.`); return go(`/deals/${r.deal.id}`);
      }
      if (a.kind === 'log_activity' && a.activity?.subject) {
        const act = a.activity;
        const r = createActivity({ type: act.type || 'task', subject: act.subject, relatedType: act.relatedType, relatedId: act.relatedId, dueAt: daysToDate(act.dueInDays || 1) });
        if (r.error) return push(r.message);
        return push(`Logged: ${act.subject} ✓`);
      }
      if (a.kind === 'move_stage' && a.deal_id && a.stage) {
        const r = moveDealStage(a.deal_id, a.stage);
        if (r.error) return push(r.message);
        return push(`Moved the deal to ${stageById(a.stage)?.name} ✓`);
      }
      if (a.kind === 'draft_email' && a.email) {
        return push(`Here is a draft you can send:`, { email: a.email });
      }
      if (a.kind === 'generate_deck' && a.company_id) {
        push('Building the QBR deck from the account data...');
        const r = await fetch('/api/export-deck-pptx', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ company: buildDeckPayload(a.company_id) }) });
        if (!r.ok) { const e = await r.json().catch(() => ({})); return push(`Could not build the deck: ${e.error || r.status}.`); }
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a'); link.href = url;
        link.download = `${(getCompany(a.company_id)?.name || 'Account').replace(/[^a-z0-9]+/gi, '-')}-QBR.pptx`;
        document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
        return push('QBR deck downloaded. Open it in PowerPoint or Keynote - it is built from this account\'s live data.');
      }
    } catch (e) {
      push(`Could not complete that: ${e.message}`);
    } finally { setRunning(null); }
  };

  const copyEmail = (email) => {
    const text = `Subject: ${email.subject}\n\n${email.body}`;
    try { navigator.clipboard.writeText(text); } catch {}
  };

  return (
    <>
      <button className={`rook-fab${open ? ' is-open' : ''}`} onClick={() => setOpen(o => !o)} aria-label="Ask Rook">
        {open ? <Icon name="x" size={22} /> : <RookGlyph size={24} />}
        {!open && <span className="rook-fab__ring" aria-hidden />}
      </button>

      {open && (
        <div className="rook-panel" role="dialog" aria-label="Rook assistant">
          <div className="rook-head">
            <div className="rook-head__mark"><RookGlyph size={18} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="rook-head__name">Rook <span className="rook-head__tag">{training ? 'trainer' : 'operator'}</span></div>
              <div className="rook-head__sub">
                {voiceMode ? (speaking ? 'Speaking...' : listening ? 'Listening...' : 'Voice on') : training ? 'Teaching you Rally' : 'Knows your pipeline'}
              </div>
            </div>
            <button className={`rook-x${training ? ' is-active' : ''}`} onClick={() => setTraining(t => !t)} aria-label="Training mode" title="Training mode - Rook teaches you Rally"><Icon name="rocket" size={17} /></button>
            {voiceOK && (
              <button className={`rook-x${voiceMode ? ' is-live' : ''}`} onClick={toggleVoiceMode} aria-label="Voice mode" title="Voice mode - talk hands-free"><Icon name="activity" size={18} /></button>
            )}
            <button className={`rook-x${menuOpen ? ' is-active' : ''}`} onClick={() => setMenuOpen(o => !o)} aria-label="What Rook can do" title="What can Rook do?"><Icon name="sparkles" size={18} /></button>
            <button className="rook-x" onClick={() => setOpen(false)} aria-label="Close"><Icon name="x" size={18} /></button>
          </div>

          {menuOpen && (
            <div className="rook-menu">
              <div className="rook-menu__head">
                <span>What Rook can do</span>
                <button className="rook-x" onClick={() => setMenuOpen(false)} aria-label="Back"><Icon name="x" size={16} /></button>
              </div>
              <div className="rook-menu__scroll">
                {CAPS.map((cap) => (
                  <div key={cap.group} className="rook-cap">
                    <div className="rook-cap__head">
                      <span className="rook-cap__ic" style={{ background: cap.tint + '1a', color: cap.tint }}><Icon name={cap.icon} size={15} /></span>
                      {cap.group}
                    </div>
                    {cap.items.map((it) => (
                      <button key={it} className="rook-cap__item" onClick={() => { setMenuOpen(false); send(it); }}>
                        {it}<Icon name="chevronRight" size={14} className="rook-cap__go" />
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rook-scroll" ref={scrollRef}>
            {msgs.map((m, i) => (
              <div key={i} className={`rook-msg rook-msg--${m.role}`}>
                {m.role === 'assistant' && <div className="rook-msg__mark"><RookGlyph size={13} color="var(--ai)" /></div>}
                <div className="rook-bubble">
                  <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
                  {m.email && (
                    <div className="rook-email">
                      <div className="rook-email__subj">{m.email.to ? `To: ${m.email.to}` : ''}</div>
                      <div className="rook-email__subj">Subject: {m.email.subject}</div>
                      <div className="rook-email__body">{m.email.body}</div>
                      <button className="rook-nav" onClick={() => copyEmail(m.email)}><Icon name="fileText" size={14} /> Copy email</button>
                    </div>
                  )}
                  {m.nav && (
                    <button className="rook-nav" onClick={() => go(m.nav.to)}>{m.nav.label} <Icon name="chevronRight" size={14} /></button>
                  )}
                  {Array.isArray(m.actions) && m.actions.length > 0 && (
                    <div className="rook-actions">
                      {m.actions.map((a, j) => {
                        const isRunning = running === (a.label + a.kind);
                        const isJugg = a.kind === 'build_account';
                        return (
                          <button key={j} className={`rook-action${isJugg ? ' rook-action--jugg' : ''}`} onClick={() => runAction(a)} disabled={!!running || building}>
                            <Icon name={actionIconName(a.kind)} size={14} className={(isRunning || (isJugg && building)) ? 'rook-spin' : ''} /> {a.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {Array.isArray(m.suggestions) && m.suggestions.length > 0 && (
                    <div className="rook-suggest">
                      {m.suggestions.map((s, j) => <button key={j} className="rook-chip" onClick={() => send(s)}>{s}</button>)}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {msgs.length === 1 && (
              <div className="rook-suggest" style={{ paddingLeft: 30 }}>
                {STARTERS.map((s, j) => <button key={j} className="rook-chip" onClick={() => send(s)}>{s}</button>)}
              </div>
            )}
            {(busy || building) && (
              <div className="rook-msg rook-msg--assistant">
                <div className="rook-msg__mark"><RookGlyph size={13} color="var(--ai)" /></div>
                <div className="rook-bubble rook-thinking">{building && <span className="rook-buildlabel">Building</span>}<span /><span /><span /></div>
              </div>
            )}
          </div>

          <form className="rook-input" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} disabled={building} placeholder={voiceMode ? (speaking ? 'Rook is speaking...' : listening ? 'Listening... just talk' : 'Voice mode on') : listening ? 'Listening...' : building ? 'Rook is building your account...' : training ? 'Ask me to teach you anything...' : 'Ask Rook, or hold the mic to talk...'} />
            {speechOK && (
              <button type="button" className={`rook-mic${listening ? ' is-live' : ''}`} onClick={toggleMic} disabled={building} aria-label={listening ? 'Stop' : 'Speak to Rook'} title="Voice to text">
                <Icon name="mic" size={16} />
              </button>
            )}
            <button type="submit" disabled={busy || building || !input.trim()} aria-label="Send"><Icon name="send" size={16} /></button>
          </form>
        </div>
      )}

      <RookStyles />
    </>
  );
}

/* Build the payload the deck endpoint needs, from the live store. */
function buildDeckPayload(companyId) {
  const co = getCompany(companyId);
  if (!co) return { name: 'Account' };
  const deals = getDealsForCompany(companyId);
  const contacts = getContactsForCompany(companyId);
  return {
    name: co.name, industry: co.industry, size: co.size, location: co.location, health: co.health, owner: userName(co.ownerId),
    contacts: contacts.map(c => ({ name: contactName(c), title: c.title, email: c.email })),
    deals: deals.map(d => ({ name: d.name, value: d.value, stage: stageById(d.stage)?.name, status: d.status, closeDate: d.closeDate })),
    openPipeline: deals.filter(d => d.status === 'open').reduce((a, d) => a + d.value, 0),
    won: deals.filter(d => d.status === 'won').reduce((a, d) => a + d.value, 0),
  };
}

function RookStyles() {
  return (
    <style>{`
    .rook-fab { position: fixed; right: 24px; bottom: 24px; z-index: 60; width: 60px; height: 60px; border-radius: 50%; border: none; cursor: pointer;
      background: radial-gradient(circle at 30% 25%, #6d5cf7, #4a3ce0 70%); color: #fff; display: grid; place-items: center;
      box-shadow: 0 12px 32px -8px rgba(74,60,224,.6), 0 0 0 1px rgba(255,255,255,.08) inset; transition: transform .2s cubic-bezier(.22,1,.36,1), box-shadow .2s; animation: rook-float 5s ease-in-out infinite; }
    .rook-fab:hover { transform: translateY(-3px) scale(1.04); box-shadow: 0 18px 42px -8px rgba(91,75,245,.6), 0 0 0 1px rgba(255,255,255,.12) inset; }
    .rook-fab.is-open { animation: none; background: #3d31c2; }
    .rook-fab__ring { position: absolute; inset: -4px; border-radius: 50%; border: 2px solid #5b4bf5; opacity: .5; animation: rook-ring 2.4s ease-out infinite; }
    @keyframes rook-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
    @keyframes rook-ring { 0% { transform: scale(1); opacity: .5; } 70% { transform: scale(1.35); opacity: 0; } 100% { opacity: 0; } }

    .rook-panel { position: fixed; right: 24px; bottom: 96px; z-index: 60; width: min(410px, calc(100vw - 32px)); height: min(640px, calc(100vh - 130px));
      background: var(--paper); border: 1px solid var(--line); border-radius: 18px; overflow: hidden; display: flex; flex-direction: column;
      box-shadow: 0 30px 70px -24px rgba(16,20,30,.5), 0 0 0 1px rgba(0,0,0,.02); transform-origin: bottom right; animation: rook-in .26s cubic-bezier(.22,1,.36,1); }
    @keyframes rook-in { from { opacity: 0; transform: translateY(14px) scale(.97); } to { opacity: 1; transform: none; } }

    .rook-head { display: flex; align-items: center; gap: 11px; padding: 14px 16px; color: #fff;
      background: linear-gradient(120deg, #3d31c2, #5b4bf5 60%, #7c5cf7); position: relative; }
    .rook-head::after { content:''; position:absolute; inset:0; background: radial-gradient(120px 60px at 85% 0%, rgba(255,255,255,.25), transparent 70%); pointer-events:none; }
    .rook-head__mark { width: 34px; height: 34px; border-radius: 10px; background: rgba(255,255,255,.16); display: grid; place-items: center; }
    .rook-head__name { font-weight: 800; font-size: 16px; letter-spacing: -.01em; }
    .rook-head__tag { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; background: rgba(255,255,255,.92); color: #3d31c2; padding: 2px 6px; border-radius: 5px; margin-left: 6px; vertical-align: middle; }
    .rook-head__sub { font-size: 12px; color: #e2ddff; margin-top: 1px; }
    .rook-x { border: none; background: transparent; color: #e8e5ff; cursor: pointer; padding: 4px; border-radius: 7px; display: grid; place-items: center; }
    .rook-x:hover, .rook-x.is-active { background: rgba(255,255,255,.18); color: #fff; }
    .rook-x.is-live { background: #fff; color: #3d31c2; animation: rook-mic-pulse 1.3s ease-in-out infinite; }

    .rook-menu { position: absolute; top: 62px; left: 0; right: 0; bottom: 0; z-index: 5; background: var(--paper); display: flex; flex-direction: column; animation: rook-menu-in .2s cubic-bezier(.22,1,.36,1); }
    @keyframes rook-menu-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    .rook-menu__head { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--line); font-weight: 800; font-size: 14px; color: var(--ink); }
    .rook-menu__head .rook-x { color: var(--n-600); } .rook-menu__head .rook-x:hover { background: var(--n-100); color: var(--ink); }
    .rook-menu__scroll { flex: 1; overflow-y: auto; padding: 12px 12px 18px; }
    .rook-cap { margin-bottom: 14px; }
    .rook-cap__head { display: flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; color: var(--n-600); padding: 0 4px 6px; }
    .rook-cap__ic { width: 26px; height: 26px; border-radius: 8px; display: grid; place-items: center; }
    .rook-cap__item { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; text-align: left; font-family: inherit; font-size: 14px; font-weight: 500; color: var(--ink); background: var(--paper); border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; margin-bottom: 6px; cursor: pointer; transition: border-color .14s, background .14s, transform .14s; }
    .rook-cap__item:hover { border-color: var(--ai); background: var(--ai-50); transform: translateX(2px); }
    .rook-cap__go { color: var(--n-400); flex-shrink: 0; }
    .rook-cap__item:hover .rook-cap__go { color: var(--ai-600); }

    .rook-scroll { flex: 1; overflow-y: auto; padding: 16px; background: var(--page); display: flex; flex-direction: column; gap: 14px; }
    .rook-msg { display: flex; gap: 8px; align-items: flex-start; }
    .rook-msg--user { justify-content: flex-end; }
    .rook-msg__mark { width: 22px; height: 22px; border-radius: 7px; background: var(--ai-50); border: 1px solid color-mix(in srgb, var(--ai) 40%, var(--ai-50)); display: grid; place-items: center; flex-shrink: 0; margin-top: 2px; }
    .rook-bubble { max-width: 85%; font-size: 14.5px; line-height: 1.5; color: var(--ink); background: var(--paper); border: 1px solid var(--line); padding: 10px 13px; border-radius: 14px; }
    .rook-msg--user .rook-bubble { background: var(--ai); color: #fff; border-color: var(--ai); border-bottom-right-radius: 5px; }
    .rook-msg--assistant .rook-bubble { border-bottom-left-radius: 5px; }

    .rook-email { margin-top: 9px; border: 1px solid var(--line); border-radius: 10px; padding: 10px; background: var(--n-25); }
    .rook-email__subj { font-size: 12.5px; font-weight: 700; color: var(--n-700); margin-bottom: 4px; }
    .rook-email__body { font-size: 13.5px; white-space: pre-wrap; color: var(--ink-2); margin: 6px 0 8px; }

    .rook-nav { display: inline-flex; align-items: center; gap: 6px; margin-top: 9px; padding: 7px 12px; font-size: 13.5px; font-weight: 700; font-family: inherit;
      background: var(--ai-50); color: var(--ai-600); border: 1px solid color-mix(in srgb, var(--ai) 40%, var(--ai-50)); border-radius: 9px; cursor: pointer; }
    .rook-nav:hover { background: #e2defd; }
    .rook-actions { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
    .rook-action { display: inline-flex; align-items: center; gap: 7px; padding: 9px 12px; font-size: 13.5px; font-weight: 700; font-family: inherit;
      background: var(--ink); color: #fff; border: none; border-radius: 9px; cursor: pointer; text-align: left; transition: filter .15s, transform .15s; }
    .rook-action:hover { filter: brightness(1.2); transform: translateY(-1px); }
    .rook-action:disabled { opacity: .6; cursor: default; }
    .rook-action--jugg { background: linear-gradient(100deg, #3d31c2, #5b4bf5 60%, #7c5cf7); position: relative; overflow: hidden; box-shadow: 0 6px 20px -6px rgba(91,75,245,.5); }
    .rook-action--jugg::after { content:''; position:absolute; top:0; bottom:0; width:40%; left:-50%; background: linear-gradient(90deg, transparent, rgba(255,255,255,.35), transparent); animation: rook-sheen 2.6s ease-in-out infinite; }
    @keyframes rook-sheen { 0% { left:-50%; } 60%,100% { left:130%; } }
    .rook-buildlabel { font-size: 12px; font-weight: 700; color: var(--ai); margin-right: 6px; letter-spacing: .02em; }
    .rook-suggest { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
    .rook-chip { font-size: 12.5px; font-weight: 600; font-family: inherit; padding: 6px 11px; border-radius: 999px; border: 1px solid var(--line-strong); background: var(--paper); color: var(--n-600); cursor: pointer; text-align: left; }
    .rook-chip:hover { border-color: var(--ai); color: var(--ai-600); }

    .rook-thinking { display: inline-flex; gap: 4px; align-items: center; }
    .rook-thinking span { width: 6px; height: 6px; border-radius: 50%; background: var(--ai); animation: rook-blink 1.2s infinite; }
    .rook-thinking span:nth-child(2) { animation-delay: .2s; } .rook-thinking span:nth-child(3) { animation-delay: .4s; }
    @keyframes rook-blink { 0%,60%,100% { opacity: .25; } 30% { opacity: 1; } }
    .rook-spin { animation: spin .9s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }

    .rook-input { display: flex; gap: 8px; padding: 12px; border-top: 1px solid var(--line); background: var(--paper); }
    .rook-input input { flex: 1; border: 1px solid var(--line-strong); border-radius: 11px; padding: 11px 13px; font-size: 14.5px; font-family: inherit; color: var(--ink); outline: none; background: var(--page); }
    .rook-input input:focus { border-color: var(--ai); box-shadow: 0 0 0 3px rgba(124,92,247,.16); }
    .rook-mic { border: 1px solid var(--line-strong); background: var(--paper); color: var(--n-600); cursor: pointer; width: 42px; border-radius: 11px; display: grid; place-items: center; flex-shrink: 0; transition: all .15s; }
    .rook-mic:hover { border-color: var(--ai); color: var(--ai); }
    .rook-mic.is-live { background: #c0392b; border-color: #c0392b; color: #fff; animation: rook-mic-pulse 1.3s ease-in-out infinite; }
    @keyframes rook-mic-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(192,57,43,.5); } 50% { box-shadow: 0 0 0 6px rgba(192,57,43,0); } }
    .rook-input button[type=submit] { width: 42px; border: none; border-radius: 11px; background: var(--ai); color: #fff; cursor: pointer; display: grid; place-items: center; }
    .rook-input button:disabled { opacity: .45; cursor: default; }

    @media (prefers-reduced-motion: reduce) { .rook-fab, .rook-fab__ring, .rook-panel, .rook-thinking span { animation: none !important; } }
    @media print { .rook-fab, .rook-panel { display: none !important; } }
    `}</style>
  );
}
