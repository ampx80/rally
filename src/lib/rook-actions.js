// ============================================================
// ARDOVO ROOK ACTION REGISTRY  (client-side, additive)
// ------------------------------------------------------------
// Rook (api/rook.js) PROPOSES actions; RookDock renders them as
// buttons; clicking a button is the user's CONFIRM. This module is
// the execution layer for the NEWER surfaces Rook can now operate:
// marketing broadcasts, quote-to-cash, the scheduler, deal support/
// delivery summaries, and the non-destructive Pipeline Fork studio.
//
// Every handler runs entirely through the SAME store writers a human
// uses, so audit + validation + pub/sub all fire normally. Nothing
// here SENDS an email, books an external meeting, or mutates the live
// pipeline: a queued broadcast is a draft on /campaigns, a fork is an
// isolated digital twin, and suggest_meeting is read-only. The user
// finishes the irreversible step on the destination screen.
//
// Wiring (one import + one dispatch line in RookDock.runAction):
//   import { hasRookAction, runRookAction } from '../lib/rook-actions.js';
//   ...inside runAction, before the existing kind checks...
//   if (hasRookAction(a.kind)) return runRookAction(a.kind, a, { push, go });
// where push(content, extra) and go(to) are RookDock's existing helpers.
//
// ASCII only. NO em-dash / en-dash.
// ============================================================
import { getDeal, getCompany, getContact, contactName, userName } from './store.js';
import { getTickets } from './store-ext.js';
import { getProjects } from './store-depth.js';
import { createCampaign, scheduleCampaign, audienceById, audienceCount } from './marketing-campaigns.js';
import { createQuoteFromDeal, quoteTotals } from './store-quote.js';
import { upcomingAvailability, meetingsForContact, meetingsForCompany, getTangoConnector, splitMeetings } from './integrations/connectors/tango.js';
import { getContactsForCompany } from './store.js';
import { createBranch, getBranch, applyMove, computeMetrics, diffDeals, localNarrative, MOVES } from './fork.js';
import { getState } from './store.js';

/* ---------- tiny formatters (ASCII only) ---------- */
function kMoney(n) {
  const a = Math.abs(Number(n) || 0);
  const s = (Number(n) || 0) < 0 ? '-' : '';
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(a % 1e6 === 0 ? 0 : 1)}M`;
  if (a >= 1e3) return `${s}$${Math.round(a / 1e3)}K`;
  return `${s}$${Math.round(a)}`;
}
function whenLabel(ms) {
  try {
    return new Date(ms).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch { return String(ms); }
}

/* ---------- projects/tickets for a deal's account ---------- */
function openTaskCounts(project) {
  const tasks = Array.isArray(project.tasks) ? project.tasks : [];
  const open = tasks.filter(t => t.status !== 'done').length;
  return { open, total: tasks.length };
}

/* ============================================================
   HANDLERS
   Each returns nothing; it calls ctx.push(content, extra) to speak
   in the chat. extra.nav = { label, to } renders a click-through
   button via RookDock's existing renderer.
   ============================================================ */
const HANDLERS = {
  /* Draft + queue a marketing broadcast. Creates a DRAFT (or scheduled)
     campaign - it does NOT email anyone. The real send happens on /campaigns. */
  queue_broadcast(a, ctx) {
    const b = a.broadcast || {};
    const name = (b.name || '').trim();
    if (!name) { ctx.push('I need a name for the broadcast before I can queue it. What should we call it?'); return; }
    const audienceId = audienceById(b.audience).id;
    const res = createCampaign({
      name,
      type: b.type === 'nurture' ? 'nurture' : 'email',
      subject: b.subject || '',
      body: b.body || '',
      audience: audienceId,
      customList: '',
    });
    if (res.error) { ctx.push(res.message || 'Could not queue that broadcast.'); return; }
    const camp = res.campaign;
    const count = audienceCount(audienceId);
    let tail = '';
    if (b.scheduleInDays != null && Number(b.scheduleInDays) >= 0) {
      const whenIso = new Date(Date.now() + Number(b.scheduleInDays) * 86400000).toISOString();
      scheduleCampaign(camp.id, whenIso);
      tail = ` Scheduled to send ${whenLabel(new Date(whenIso).getTime())}.`;
    } else {
      tail = ' It is saved as a draft.';
    }
    ctx.push(
      `Queued "${camp.name}" to ${audienceById(audienceId).label} (${count} recipient${count === 1 ? '' : 's'}).${tail} Nothing has been sent - open it to review and hit send.`,
      { nav: { label: 'Review on Campaigns', to: '/campaigns' } }
    );
  },

  /* Build a real quote from a deal (clones the deal's line items). */
  quote_from_deal(a, ctx) {
    const dealId = a.deal_id;
    const deal = dealId && getDeal(dealId);
    if (!deal) { ctx.push('Tell me which deal to quote and I will build it.'); return; }
    const res = createQuoteFromDeal(dealId);
    if (res.error) { ctx.push(res.message || 'Could not build the quote.'); return; }
    const q = res.quote;
    const totals = quoteTotals(q.id);
    ctx.push(
      `Built ${q.number} from ${deal.name}: ${kMoney(totals.grandTotal)} across the deal's line items, as a draft. Open it to tune pricing, terms, and send.`,
      { nav: { label: `Open ${q.number}`, to: `/quotes/${q.id}` } }
    );
  },

  /* Hand a prospect the next open times. Read-only - no external booking. */
  suggest_meeting(a, ctx) {
    const contact = a.contact_id ? getContact(a.contact_id) : null;
    const company = a.company_id ? getCompany(a.company_id) : (contact ? getCompany(contact.companyId) : null);
    const tango = getTangoConnector();
    const slots = upcomingAvailability(4);
    const who = contact ? contactName(contact) : (company ? company.name : 'the prospect');

    // Any already-booked meetings so Rook does not double-book context.
    let existing = [];
    if (contact) existing = meetingsForContact(contact);
    else if (company) existing = meetingsForCompany(company, getContactsForCompany(company.id));
    const { upcoming } = splitMeetings(existing);

    const lines = [];
    if (upcoming.length) {
      lines.push(`${who} already has ${upcoming.length} meeting${upcoming.length === 1 ? '' : 's'} booked (next: ${whenLabel(upcoming[0].startsAt)}).`);
    }
    if (slots.length) {
      lines.push(`Next open times to offer ${who}: ${slots.map(s => whenLabel(s.startsAt)).join('; ')}.`);
      lines.push(`Send them to grab one: ${tango.bookUrl()}`);
    } else {
      lines.push('No open slots surfaced from the calendar right now.');
    }
    ctx.push(lines.join(' '), { nav: { label: 'Open Scheduling', to: '/scheduling' } });
  },

  /* Summarize a deal plus its account's support tickets and projects. Read-only. */
  summarize_deal(a, ctx) {
    const dealId = a.deal_id;
    const deal = dealId && getDeal(dealId);
    if (!deal) { ctx.push('Which deal should I summarize?'); return; }
    const co = getCompany(deal.companyId);
    const tickets = co ? getTickets().filter(t => t.companyId === co.id) : [];
    const openT = tickets.filter(t => t.status !== 'solved');
    const urgentT = openT.filter(t => t.priority === 'urgent' || t.priority === 'high');
    const projects = co ? getProjects().filter(p => p.companyId === co.id) : [];
    let openTasks = 0, totalTasks = 0;
    for (const p of projects) { const c = openTaskCounts(p); openTasks += c.open; totalTasks += c.total; }

    const parts = [];
    parts.push(`${deal.name}: ${kMoney(deal.value)}${co ? ` at ${co.name}` : ''}, owned by ${userName(deal.ownerId)}.`);
    if (tickets.length) {
      parts.push(`Support: ${openT.length} open ticket${openT.length === 1 ? '' : 's'}${urgentT.length ? ` (${urgentT.length} high/urgent: ${urgentT.slice(0, 2).map(t => `#${t.number} ${t.subject}`).join(', ')})` : ''} of ${tickets.length} total on the account.`);
    } else {
      parts.push('Support: no tickets on the account.');
    }
    if (projects.length) {
      parts.push(`Delivery: ${projects.length} project${projects.length === 1 ? '' : 's'} (${projects.map(p => p.name).slice(0, 3).join(', ')}) with ${openTasks} open of ${totalTasks} tasks.`);
    } else {
      parts.push('Delivery: no projects on the account yet.');
    }
    parts.push(urgentT.length ? 'Clear the high-priority tickets before you push this deal forward.' : 'Nothing on support or delivery is blocking this deal.');
    ctx.push(parts.join(' '), { nav: { label: `Open ${deal.name}`, to: `/deals/${deal.id}` } });
  },

  /* Model a change in the non-destructive Pipeline Fork studio (a digital twin).
     Applies one macro move and reports the delta vs main. Live pipeline is
     untouched until the user commits inside the studio. */
  fork_whatif(a, ctx) {
    const f = a.fork || {};
    const move = f.move;
    if (!MOVES[move]) { ctx.push('Tell me what to model - slip or pull close dates, apply a discount, raise win probability, or advance every deal a stage.'); return; }
    const name = (f.name || `${MOVES[move].label} what-if`).trim();
    const branch = createBranch(name, { note: 'Created by Rook' });
    const params = {};
    if (move === 'slip' || move === 'pull') params.days = Number(f.days) > 0 ? Number(f.days) : 14;
    if (move === 'discount') params.pct = Number(f.pct) > 0 ? Number(f.pct) : 10;
    if (move === 'boost') params.floor = Number(f.floor) > 0 ? Number(f.floor) : 60;
    applyMove(branch.id, move, params);

    const fresh = getBranch(branch.id) || branch;
    const main = computeMetrics(getState());
    const branchMetrics = computeMetrics(fresh.state);
    const diff = diffDeals(getState(), fresh.state);
    const narrative = localNarrative(fresh, main, branchMetrics, diff);
    ctx.push(
      `${narrative} This lives in an isolated branch - your live pipeline has not changed. Open the studio to inspect the diff and cherry-pick what to commit.`,
      { nav: { label: `Open "${fresh.name}" in Fork studio`, to: '/fork' } }
    );
  },
};

/* ============================================================
   PUBLIC API
   ============================================================ */
export const ROOK_ACTION_KINDS = Object.keys(HANDLERS);

export function hasRookAction(kind) {
  return Object.prototype.hasOwnProperty.call(HANDLERS, kind);
}

// Dispatch a proposed action. ctx = { push, go }. Async-shaped for parity with
// RookDock's other handlers (all current handlers are synchronous store writes).
export async function runRookAction(kind, action, ctx = {}) {
  const push = typeof ctx.push === 'function' ? ctx.push : () => {};
  const go = typeof ctx.go === 'function' ? ctx.go : () => {};
  const fn = HANDLERS[kind];
  if (!fn) { push(`I do not know how to run "${kind}".`); return; }
  try {
    await fn(action, { push, go });
  } catch (e) {
    push(`Could not complete that: ${e.message}`);
  }
}
