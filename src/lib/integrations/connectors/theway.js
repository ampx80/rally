// ============================================================
// THE WAY CONNECTOR  (concrete - extends the base Connector)
// The first REAL connector built on the integration backbone. The
// Way (thewayhq.vercel.app) is the sibling project-management app;
// this connector surfaces its delivery PROJECTS + their status onto
// the right Rally deal / company record so post-sale delivery is
// visible from inside the CRM.
//
// Every project it surfaces carries provenance: source:'theway' plus
// an externalUrl that deep-links to the project in The Way. The
// timeline's ActivitySourceChip renders the "via The Way" stamp for
// any activity a user logs from a project (see logToRecord()).
//
// LOCAL-FIRST, GRACEFUL, ADDITIVE:
//   - When the connection is NOT live (no server env / not connected)
//     the connector returns DETERMINISTIC seeded demo projects keyed
//     off the record id, so the panel always shows believable data
//     and never throws. This mirrors src/lib/store.js's seeded book.
//   - When the connection IS live, fetchProjects() proxies through the
//     env-gated bridge (api/connect/theway.js). Any failure downgrades
//     to the demo set instead of throwing - the panel never breaks.
//
// SUPABASE / SERVER: real credentials live server-side only; this
// client module never holds a secret. The bridge decides live vs not.
// ============================================================
import { Connector } from '../connector.js';
import { getConnection, connectionStatus } from '../connections.js';
import { addUnlinked } from '../resolve-link.js';
import { createActivity } from '../../store.js';

const SOURCE = 'theway';
const DEFAULT_BASE = 'https://thewayhq.vercel.app';

/* ---------- status vocabulary (mirrors The Way's config.js) ---------- */
// ryg_status: green (On track) | yellow (At risk) | red (Off track)
// status:     Not Started | In Progress | On Hold | Complete
const RYG_LABEL = { green: 'On track', yellow: 'At risk', red: 'Off track' };
const RYG_TONE = { green: 'ok', yellow: 'warn', red: 'risk' };
const rygLabel = (r) => RYG_LABEL[String(r || '').toLowerCase()] || 'On track';
const rygTone = (r) => RYG_TONE[String(r || '').toLowerCase()] || 'ok';

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const clamp = (n) => Math.max(0, Math.min(100, Math.round(num(n))));

/* ---------- deterministic PRNG (same family as store.js) ---------- */
function hashStr(s) {
  let h = 2166136261 >>> 0;
  const str = String(s || '');
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const KINDS = [
  'Platform rollout', 'Onboarding and implementation', 'Data migration',
  'Integration buildout', 'Customer success plan', 'Pilot to production',
  'Reporting and analytics', 'Change management', 'Security review',
];
const PMS = ['A. Okafor', 'J. Reyes', 'M. Larsen', 'S. Bennett', 'R. Castillo', 'L. Frost', 'D. Vance', 'P. Sharma'];
// weighted pools - mostly healthy / in-flight, a realistic minority at risk
const STATUS_POOL = ['In Progress', 'In Progress', 'In Progress', 'Not Started', 'On Hold', 'Complete'];
const RYG_POOL = ['green', 'green', 'green', 'yellow', 'yellow', 'red'];

function currentStatusLine(status, ryg) {
  const s = String(status);
  if (/complete|done/i.test(s)) return 'Delivered and closed out.';
  if (ryg === 'red') return 'Off track - blocker escalated to the delivery lead.';
  if (ryg === 'yellow') return 'At risk - watching timeline, mitigation in progress.';
  if (s === 'On Hold') return 'On hold pending customer input.';
  if (s === 'Not Started') return 'Queued - kickoff scheduled.';
  return 'On track - workstreams progressing to plan.';
}

export class TheWayConnector extends Connector {
  constructor() { super(SOURCE); }

  /* ---------- workspace origin (deep-link base) ----------
     Prefer the connected workspace URL (origin only), else the canonical
     production URL. Never returns a path - callers append /app/projects. */
  baseUrl() {
    const raw = getConnection(this.id)?.metadata?.workspaceUrl;
    if (raw) { try { return new URL(raw).origin; } catch { /* fall through */ } }
    return DEFAULT_BASE;
  }

  // Deep link to a project in The Way. Demo rows have synthetic ids that do
  // not exist upstream, so they link to the projects list instead of a 404.
  projectUrl(externalId, { demo = false } = {}) {
    const base = this.baseUrl();
    if (demo || !externalId) return `${base}/app/projects`;
    return `${base}/app/projects/${encodeURIComponent(externalId)}`;
  }

  isLive() { return connectionStatus(this.id) === 'connected'; }

  /* ---------- mapRecord seam: raw the_way_projects row -> Rally shape ---------- */
  mapRecord(row = {}) {
    const status = String(row.status || row.current_status || 'In Progress');
    const ryg = String(row.ryg_status || row.ryg || 'green').toLowerCase();
    const externalId = row.id != null ? String(row.id) : null;
    const totalTasks = num(row.total_tasks ?? row.task_count);
    let progress = num(row.progress ?? row.percent_complete);
    if (!progress && /complete|done/i.test(status)) progress = 100;
    progress = clamp(progress);
    const openTasks = row.open_tasks != null
      ? num(row.open_tasks)
      : (totalTasks ? Math.max(0, Math.round(totalTasks * (1 - progress / 100))) : 0);
    return {
      id: externalId,
      name: row.name || 'Untitled project',
      status,
      statusLabel: status,
      ryg,
      rygLabel: rygLabel(ryg),
      tone: rygTone(ryg),
      progress,
      pmName: row.project_manager || row.pm || '',
      openTasks,
      totalTasks,
      updatedAt: row.updated_at || row.created_at || null,
      currentStatus: row.current_status || currentStatusLine(status, ryg),
      demo: false,
      ...this.via(externalId, this.projectUrl(externalId)),
    };
  }

  /* ---------- deterministic demo projects (never network, never throws) ----------
     Keyed off the deal id (preferred, post-sale delivery) or company id, so the
     same record always yields the same believable delivery projects. */
  demoProjectsForRecord({ company, deal } = {}) {
    const anchorId = deal?.id || company?.id || 'acct';
    const coName = company?.name || deal?.name || 'Account';
    const firstWord = String(coName).split(/\s+/)[0] || 'Account';
    const rnd = mulberry32(hashStr(anchorId));
    const pick = (a) => a[Math.floor(rnd() * a.length)];
    const range = (a, b) => a + Math.floor(rnd() * (b - a + 1));
    const count = deal ? range(2, 3) : range(1, 3);
    const now = Date.now();
    const usedKinds = new Set();
    const out = [];
    for (let i = 0; i < count; i++) {
      let kind, g = 0;
      do { kind = pick(KINDS); g++; } while (usedKinds.has(kind) && g < 12);
      usedKinds.add(kind);
      const status = pick(STATUS_POOL);
      const ryg = /complete/i.test(status) ? 'green' : pick(RYG_POOL);
      const totalTasks = range(8, 34);
      const progress = /complete/i.test(status) ? 100
        : status === 'Not Started' ? range(0, 8)
        : status === 'On Hold' ? range(25, 60)
        : range(20, 88);
      const openTasks = /complete/i.test(status) ? 0 : Math.max(0, Math.round(totalTasks * (1 - progress / 100)));
      const externalId = `demo-${anchorId}-${i + 1}`;
      out.push({
        id: externalId,
        name: `${firstWord} ${kind}`,
        status,
        statusLabel: status,
        ryg,
        rygLabel: rygLabel(ryg),
        tone: rygTone(ryg),
        progress: clamp(progress),
        pmName: pick(PMS),
        openTasks,
        totalTasks,
        updatedAt: new Date(now - range(0, 20) * 86400000).toISOString(),
        currentStatus: currentStatusLine(status, ryg),
        demo: true,
        ...this.via(externalId, this.projectUrl(externalId, { demo: true })),
      });
    }
    return out;
  }

  /* ---------- fetch: live-first, demo-fallback, never throws ---------- */
  async fetchProjects({ company, deal } = {}) {
    const demo = this.demoProjectsForRecord({ company, deal });
    if (!this.isLive()) return { connected: false, live: false, projects: demo };
    try {
      const res = await fetch('/api/connect/theway', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'projects',
          company: company ? { id: company.id, name: company.name, domain: company.domain } : null,
          deal: deal ? { id: deal.id, name: deal.name } : null,
        }),
      });
      if (!res.ok) return { connected: true, live: false, error: `HTTP ${res.status}`, projects: demo };
      const data = await res.json().catch(() => ({}));
      if (!data || data.configured === false || data.ok === false || !Array.isArray(data.projects)) {
        return { connected: true, live: false, error: data?.reason || data?.error || 'not-configured', projects: demo };
      }
      const projects = data.projects.map((r) => this.mapRecord(r)).filter((p) => p && p.name);
      return { connected: true, live: true, projects: projects.length ? projects : demo };
    } catch (e) {
      return { connected: true, live: false, error: e?.message || 'fetch failed', projects: demo };
    }
  }

  /* ---------- sync seam: best-effort import count (graceful) ---------- */
  async sync({ company, deal } = {}) {
    const r = await this.fetchProjects({ company, deal });
    return { imported: r.live ? r.projects.length : 0, linked: 0, unlinked: 0, live: !!r.live };
  }

  /* ---------- handleWebhook seam: resolve identity + log with provenance ---------- */
  handleWebhook(payload = {}) {
    const project = payload.project || payload || {};
    const normalized = this.mapRecord(project);
    const id = this.resolveIdentity({ email: payload.email, domain: payload.domain, name: payload.name });
    if (!id.matched) {
      addUnlinked({
        source: this.id, email: payload.email, domain: payload.domain, name: payload.name,
        event: payload.event || 'project.updated', payload: project,
      });
      return { parked: true, normalized };
    }
    createActivity({
      type: 'note',
      subject: `Project ${normalized.statusLabel}: ${normalized.name}`,
      body: normalized.currentStatus || '',
      relatedType: id.relatedType, relatedId: id.relatedId, companyId: id.companyId,
      done: true,
      source: this.id, externalId: normalized.externalId, externalUrl: normalized.externalUrl,
    });
    return { logged: true, normalized };
  }

  /* ---------- user-initiated: log a project update onto a record's timeline ----------
     Stamps provenance via the base via() passthrough so ActivitySourceChip renders
     the "via The Way" chip + open-in-source link on the resulting activity. */
  logToRecord(project = {}, { relatedType, relatedId, companyId } = {}) {
    if (!relatedType || !relatedId) return { error: 'target', message: 'No record to log against.' };
    return createActivity({
      type: 'note',
      subject: `Delivery update - ${project.name} (${project.rygLabel || rygLabel(project.ryg)})`,
      body: project.currentStatus || '',
      relatedType, relatedId, companyId,
      done: true,
      ...this.via(project.externalId, project.externalUrl),
    });
  }
}

// Singleton - import { theway } wherever the connector is needed.
export const theway = new TheWayConnector();
export default theway;
