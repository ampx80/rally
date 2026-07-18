// ContextGraph - Rally's context layer (the "Data 360" answer): a unified,
// governed view of everything an AI agent can ground on. Rally is local-first,
// so the whole book already lives in the store; this page visualizes and
// governs that context layer. Every source card reads a live count + a real
// coverage metric; governance toggles (expose / mask PII) persist through
// src/lib/context-graph.js. The retrieval demo runs a real keyword match over
// the exposed sources to illustrate grounded retrieval.
// Teal is the product data; violet marks the AI / agent layer.
// NO em-dash / en-dash. ASCII only.
import React, { useMemo, useState } from 'react';
import {
  useStore, getContacts, getCompanies, getDeals, getActivities,
} from '../lib/store.js';
import {
  useExt, getLeads, getProducts, getQuotes, getInvoices,
  getCampaigns, getTickets, getWorkflows,
} from '../lib/store-ext.js';
import { SectionHeader, Card, StatCard, Badge, Input, useToast } from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import {
  useContextGov, isExposed, isMasked, toggleExpose, toggleMask,
  coveragePct, maskEmail, maskName, PII_SOURCES,
} from '../lib/context-graph.js';

// Every governed source: which entity, its icon, whether it is the AI layer
// (violet) or product data (teal), the live getter, a real coverage metric,
// and how to project a record into the retrieval index (name + subtitle).
const SOURCE_DEFS = [
  {
    key: 'companies', label: 'Companies', icon: 'building', layer: 'product', pii: false,
    get: getCompanies,
    coverage: { label: 'with industry', fn: (r) => !!r.industry },
    fields: ['name', 'domain', 'industry', 'size', 'location', 'health', 'lifecycleStage'],
    index: (r) => ({ name: r.name, sub: r.industry || r.domain }),
  },
  {
    key: 'contacts', label: 'Contacts', icon: 'users', layer: 'product', pii: true,
    get: getContacts,
    coverage: { label: 'with email', fn: (r) => !!r.email },
    fields: ['firstName', 'lastName', 'email', 'phone', 'title', 'tags', 'lifecycleStage'],
    index: (r) => ({ name: `${r.firstName} ${r.lastName}`.trim(), sub: r.title || r.email, email: r.email }),
  },
  {
    key: 'deals', label: 'Deals', icon: 'target', layer: 'product', pii: false,
    get: getDeals,
    coverage: { label: 'with close date', fn: (r) => !!r.closeDate },
    fields: ['name', 'value', 'stage', 'probability', 'closeDate', 'status'],
    index: (r) => ({ name: r.name, sub: r.stage }),
  },
  {
    key: 'activities', label: 'Activities', icon: 'activity', layer: 'product', pii: false,
    get: getActivities,
    coverage: { label: 'linked to a record', fn: (r) => !!r.relatedId },
    fields: ['type', 'subject', 'dueAt', 'done', 'relatedType'],
    index: (r) => ({ name: r.subject, sub: r.type }),
  },
  {
    key: 'leads', label: 'Leads', icon: 'funnel', layer: 'product', pii: true,
    get: getLeads,
    coverage: { label: 'scored', fn: (r) => Number(r.score) > 0 },
    fields: ['name', 'company', 'email', 'title', 'source', 'status', 'score'],
    index: (r) => ({ name: r.name, sub: r.company || r.source, email: r.email }),
  },
  {
    key: 'quotes', label: 'Quotes', icon: 'receipt', layer: 'product', pii: false,
    get: getQuotes,
    coverage: { label: 'with an amount', fn: (r) => Number(r.amount) > 0 },
    fields: ['number', 'companyName', 'amount', 'seats', 'status'],
    index: (r) => ({ name: r.number, sub: r.companyName }),
  },
  {
    key: 'invoices', label: 'Invoices', icon: 'creditCard', layer: 'product', pii: false,
    get: getInvoices,
    coverage: { label: 'with a due date', fn: (r) => !!r.dueAt },
    fields: ['number', 'companyName', 'amount', 'status', 'issuedAt', 'dueAt'],
    index: (r) => ({ name: r.number, sub: r.companyName }),
  },
  {
    key: 'tickets', label: 'Tickets', icon: 'lifebuoy', layer: 'product', pii: false,
    get: getTickets,
    coverage: { label: 'assigned', fn: (r) => !!r.assigneeId },
    fields: ['number', 'subject', 'companyName', 'priority', 'status'],
    index: (r) => ({ name: r.subject, sub: r.companyName }),
  },
  {
    key: 'campaigns', label: 'Campaigns', icon: 'megaphone', layer: 'product', pii: false,
    get: getCampaigns,
    coverage: { label: 'with revenue attributed', fn: (r) => Number(r.revenue) > 0 },
    fields: ['name', 'channel', 'status', 'sent', 'opened', 'leads', 'revenue'],
    index: (r) => ({ name: r.name, sub: r.channel }),
  },
  {
    key: 'products', label: 'Products', icon: 'box', layer: 'product', pii: false,
    get: getProducts,
    coverage: { label: 'active in catalog', fn: (r) => !!r.active },
    fields: ['name', 'sku', 'category', 'price', 'billing', 'active'],
    index: (r) => ({ name: r.name, sub: r.category }),
  },
  {
    key: 'workflows', label: 'Workflows', icon: 'workflow', layer: 'ai', pii: false,
    get: getWorkflows,
    coverage: { label: 'active', fn: (r) => !!r.active },
    fields: ['name', 'trigger', 'active', 'actions', 'runs'],
    index: (r) => ({ name: r.name, sub: r.trigger }),
  },
];

function tone(pct) {
  if (pct >= 80) return { color: 'var(--ok)', bg: 'var(--ok-bg)', label: 'Fresh' };
  if (pct >= 50) return { color: 'var(--warn)', bg: 'var(--warn-bg)', label: 'Partial' };
  return { color: 'var(--warn)', bg: 'var(--warn-bg)', label: 'Sparse' };
}

export default function ContextGraph() {
  // Subscribe to both stores and the governance layer. Any commit to any of
  // them re-renders this component with a fresh snapshot reference, which is
  // what the memos below key off of.
  const storeSnap = useStore();
  const extSnap = useExt();
  const gov = useContextGov();
  const toast = useToast();
  const [query, setQuery] = useState('');

  // Snapshot every source live. Recomputed on any store or governance change.
  const sources = useMemo(() => SOURCE_DEFS.map(def => {
    const records = def.get() || [];
    const pct = coveragePct(records, def.coverage.fn);
    return {
      ...def,
      records,
      count: records.length,
      coveragePct: pct,
      exposed: isExposed(def.key),
      masked: def.pii ? isMasked(def.key) : false,
      fieldCount: def.fields.length,
    };
  }), [storeSnap, extSnap, gov]);

  const totals = useMemo(() => {
    const exposedSources = sources.filter(s => s.exposed);
    const totalRecords = sources.reduce((n, s) => n + s.count, 0);
    const groundedRecords = exposedSources.reduce((n, s) => n + s.count, 0);
    const totalFields = sources.reduce((n, s) => n + s.fieldCount, 0);
    // Coverage across the layer, weighted by record count (empty sources do
    // not drag the average toward zero).
    const denom = sources.reduce((n, s) => n + s.count, 0) || 1;
    const weighted = Math.round(
      sources.reduce((n, s) => n + s.coveragePct * s.count, 0) / denom
    );
    return {
      totalRecords, groundedRecords, totalFields,
      sourceCount: sources.length,
      exposedCount: exposedSources.length,
      maskedCount: sources.filter(s => s.masked).length,
      coverage: weighted,
    };
  }, [sources]);

  // Grounded retrieval demo. Real keyword match across the EXPOSED sources
  // only, honoring the mask on PII sources. startsWith outranks a substring
  // hit; shorter names rank slightly higher so exact-ish matches float up.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out = [];
    for (const s of sources) {
      if (!s.exposed) continue;
      for (const r of s.records) {
        const proj = s.index(r);
        const name = String(proj.name || '');
        const sub = String(proj.sub || '');
        const hay = `${name} ${sub}`.toLowerCase();
        const idx = hay.indexOf(q);
        if (idx === -1) continue;
        const starts = name.toLowerCase().startsWith(q);
        const score = (starts ? 1000 : 500) - idx - Math.min(name.length, 200);
        out.push({
          id: `${s.key}:${r.id}`,
          sourceKey: s.key, sourceLabel: s.label, icon: s.icon, layer: s.layer,
          masked: s.masked,
          name: s.masked ? maskName(name) : name,
          sub: s.masked && proj.email ? maskEmail(proj.email) : sub,
          score,
        });
      }
    }
    return out.sort((a, b) => b.score - a.score).slice(0, 12);
  }, [query, sources]);

  return (
    <div className="fade-up cg">
      <SectionHeader
        eyebrow="Context layer"
        title={<span className="row gap-2" style={{ alignItems: 'center' }}><span className="cg-mark"><Icon name="radar" size={18} /></span> Context</span>}
        sub="The unified, governed view of everything an agent can ground on. Rally is local-first, so the whole book is already indexed. This is the read scope every agent inherits, and the controls that keep it safe."
      />

      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', marginBottom: '1.15rem' }}>
        <StatCard label="Records indexed" value={totals.totalRecords} sub={`${totals.groundedRecords.toLocaleString()} grounded for agents`} icon={<Icon name="layers" size={18} />} />
        <StatCard label="Governed sources" value={totals.sourceCount} sub={`${totals.exposedCount} exposed, ${totals.maskedCount} masked`} icon={<Icon name="radar" size={18} />} accent="var(--ai)" />
        <StatCard label="Fields mapped" value={totals.totalFields} sub="across the layer" icon={<Icon name="sheet" size={18} />} />
        <StatCard label="Layer coverage" value={totals.coverage} format={(n) => `${Math.round(n)}%`} sub="record completeness" icon={<Icon name="gauge" size={18} />} accent="var(--ok)" />
      </div>

      {/* What agents can see */}
      <div className="cg-see">
        <div className="cg-see-ico"><Icon name="sparkles" size={20} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="cg-see-title">What every agent can see</div>
          <p className="cg-see-p">
            {totals.groundedRecords.toLocaleString()} records across {totals.exposedCount} exposed source{totals.exposedCount === 1 ? '' : 's'} and {totals.totalFields} mapped fields are grounded and ready for retrieval. Every agent inherits this context <strong>read-only</strong> by default. Writing back to the book requires a granted write tool with its own mandate, so grounding can never silently mutate your data.
          </p>
        </div>
      </div>

      {/* Grounded retrieval demo */}
      <Card className="cg-retrieval">
        <div className="row between" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '.75rem' }}>
          <div style={{ minWidth: 0 }}>
            <div className="cg-block-title"><Icon name="search" size={16} /> Grounded retrieval</div>
            <div className="cg-block-sub">Search the way an agent does. Only exposed sources are searchable; masked PII is returned masked.</div>
          </div>
          <Badge tone="accent"><span className="row gap-1" style={{ alignItems: 'center' }}><Icon name="shield" size={12} /> {totals.exposedCount} sources in scope</span></Badge>
        </div>
        <div className="cg-search">
          <Icon name="search" size={16} className="cg-search-ico" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Try 'Vertex', 'proposal', 'renewal', a person, an invoice..." aria-label="Search the context layer" />
          {query && <button className="cg-search-clear" onClick={() => setQuery('')} aria-label="Clear search"><Icon name="x" size={15} /></button>}
        </div>

        {query && results.length === 0 && (
          <div className="cg-noresults">No grounded match for "{query}". Try an account, deal, contact, or record number.</div>
        )}
        {results.length > 0 && (
          <div className="cg-results">
            {results.map((r, i) => (
              <div key={r.id} className="cg-result" style={{ animationDelay: `${Math.min(i * 28, 280)}ms` }}>
                <span className="cg-result-rank">{i + 1}</span>
                <span className={`cg-result-ico ${r.layer === 'ai' ? 'is-ai' : ''}`}><Icon name={r.icon} size={15} /></span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="cg-result-name">{r.name}</div>
                  {r.sub && <div className="cg-result-sub">{r.sub}</div>}
                </div>
                {r.masked && <span className="cg-mask-chip"><Icon name="lock" size={11} /> masked</span>}
                <span className="cg-result-src">{r.sourceLabel}</span>
              </div>
            ))}
          </div>
        )}
        {!query && (
          <div className="cg-retrieval-hint">An agent grounds every answer by retrieving from these sources first, then reasoning. No hallucinated records, and nothing outside your exposed scope.</div>
        )}
      </Card>

      {/* Governed sources grid */}
      <div className="section-head" style={{ marginTop: '1.5rem' }}>
        <div className="col gap-1">
          <h3 style={{ margin: 0 }}>Context sources</h3>
          <div className="muted t-sm">Each entity type is a governed source. Toggle what agents can read, and mask PII before it ever reaches a model.</div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '1rem' }}>
        {sources.map(s => {
          const t = tone(s.coveragePct);
          const empty = s.count === 0;
          return (
            <div key={s.key} className="cg-source" data-off={!s.exposed} data-ai={s.layer === 'ai'}>
              <div className="row gap-2" style={{ alignItems: 'flex-start' }}>
                <span className={`cg-source-ico ${s.layer === 'ai' ? 'is-ai' : ''}`}><Icon name={s.icon} size={18} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row between" style={{ alignItems: 'center', gap: 8 }}>
                    <span className="cg-source-name">{s.label}</span>
                    {s.exposed
                      ? <span className="cg-grounded"><Icon name="check" size={11} /> Grounded</span>
                      : <span className="cg-hidden">Hidden</span>}
                  </div>
                  <div className="cg-source-count">{s.count.toLocaleString()} record{s.count === 1 ? '' : 's'}<span className="cg-dot-sep">-</span>{s.fieldCount} fields</div>
                </div>
              </div>

              {empty ? (
                <div className="cg-source-empty">No records yet. This source lights up automatically the moment data lands.</div>
              ) : (
                <div className="cg-cov">
                  <div className="row between" style={{ marginBottom: 5 }}>
                    <span className="cg-cov-label">{s.coveragePct}% {s.coverage.label}</span>
                    <span className="cg-cov-tag" style={{ color: t.color, background: t.bg }}>{t.label}</span>
                  </div>
                  <div className="cg-cov-track"><div className="cg-cov-fill" style={{ width: `${s.coveragePct}%`, background: t.color }} /></div>
                </div>
              )}

              <div className="cg-controls">
                <button className="cg-toggle" data-on={s.exposed} onClick={() => { const now = toggleExpose(s.key); toast(now ? `${s.label} exposed to agents` : `${s.label} hidden from agents`); }}>
                  <span className="cg-switch" data-on={s.exposed}><span /></span>
                  <span className="cg-toggle-label">Expose to agents</span>
                </button>
                {s.pii && (
                  <button className="cg-toggle" data-on={s.masked} data-mask="true" disabled={!s.exposed} onClick={() => { const now = toggleMask(s.key); toast(now ? `${s.label} PII masked` : `${s.label} PII unmasked`, now ? 'ok' : 'warn'); }}>
                    <span className="cg-switch" data-on={s.masked} data-mask="true"><span /></span>
                    <span className="cg-toggle-label"><Icon name="lock" size={12} /> Mask PII</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Governance footer */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '1rem', marginTop: '1.5rem' }}>
        <div className="cg-gov">
          <div className="cg-gov-head"><Icon name="shield" size={16} /> Read scope</div>
          <p className="cg-gov-p">Agents inherit the exposed sources as a read-only ground truth. Flip a source off and it disappears from every agent's retrieval instantly, no redeploy.</p>
          <div className="cg-gov-stat">{totals.exposedCount} of {totals.sourceCount} sources exposed</div>
        </div>
        <div className="cg-gov">
          <div className="cg-gov-head"><Icon name="lock" size={16} /> PII masking</div>
          <p className="cg-gov-p">Contacts and leads carry personal data. Masking returns structure (domains, initials) instead of raw identity, so an agent can reason without ever reading the person.</p>
          <div className="cg-gov-stat">{totals.maskedCount} PII source{totals.maskedCount === 1 ? '' : 's'} masked <span className="muted">of {PII_SOURCES.length}</span></div>
        </div>
        <div className="cg-gov">
          <div className="cg-gov-head"><Icon name="sparkles" size={16} /> Grounding contract</div>
          <p className="cg-gov-p">Every agent answer is retrieved from this layer first, then reasoned. Reads never mutate the book; writes require a granted tool with its own mandate.</p>
          <div className="cg-gov-stat">Read-only by default</div>
        </div>
      </div>

      <ContextGraphStyles />
    </div>
  );
}

function ContextGraphStyles() {
  return (
    <style>{`
    .cg-mark { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, var(--ai), var(--ai-600)); box-shadow: var(--ai-glow); }

    .cg-see { display: flex; gap: 14px; align-items: flex-start; background: var(--ai-50); border: 1px solid var(--line); border-radius: 14px; padding: 16px 18px; margin-bottom: 1.15rem; }
    .cg-see-ico { width: 40px; height: 40px; flex: none; border-radius: 11px; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, var(--ai), var(--ai-600)); box-shadow: var(--ai-glow); }
    .cg-see-title { font-weight: 800; font-size: 15px; color: var(--ink); margin-bottom: 3px; }
    .cg-see-p { margin: 0; font-size: 13.5px; line-height: 1.55; color: var(--ink-2); }
    .cg-see-p strong { color: var(--ai-600); }

    .cg-block-title { display: flex; align-items: center; gap: 7px; font-weight: 800; font-size: 15px; color: var(--ink); }
    .cg-block-sub { font-size: 12.5px; color: var(--n-600); margin-top: 3px; }

    .cg-retrieval { padding: 16px 18px; }
    .cg-search { position: relative; display: flex; align-items: center; margin-top: 14px; }
    .cg-search-ico { position: absolute; left: 12px; color: var(--n-400); pointer-events: none; }
    .cg-retrieval .cg-search .input { padding-left: 36px; padding-right: 36px; }
    .cg-search-clear { position: absolute; right: 8px; background: none; border: none; cursor: pointer; color: var(--n-400); display: grid; place-items: center; padding: 4px; border-radius: 6px; }
    .cg-search-clear:hover { color: var(--ink); background: var(--n-100); }

    .cg-noresults { margin-top: 12px; padding: 16px; text-align: center; font-size: 13px; color: var(--n-600); background: var(--n-25); border: 1px dashed var(--line-strong); border-radius: 10px; }
    .cg-retrieval-hint { margin-top: 12px; font-size: 12.5px; color: var(--n-600); line-height: 1.5; }
    .cg-results { margin-top: 14px; display: flex; flex-direction: column; gap: 6px; }
    .cg-result { display: flex; align-items: center; gap: 11px; padding: 9px 11px; border: 1px solid var(--line); border-radius: 10px; background: var(--paper); animation: fadeUp .32s var(--ease) both; }
    .cg-result:hover { border-color: var(--line-strong); background: var(--n-25); }
    .cg-result-rank { width: 20px; flex: none; text-align: center; font-size: 11px; font-weight: 800; color: var(--n-400); font-variant-numeric: tabular-nums; }
    .cg-result-ico { width: 30px; height: 30px; flex: none; border-radius: 8px; display: grid; place-items: center; color: var(--accent-600); background: var(--accent-50); }
    .cg-result-ico.is-ai { color: var(--ai-600); background: var(--ai-50); }
    .cg-result-name { font-weight: 700; font-size: 13.5px; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .cg-result-sub { font-size: 12px; color: var(--n-600); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-transform: capitalize; }
    .cg-result-src { flex: none; font-size: 11px; font-weight: 700; color: var(--n-600); background: var(--n-100); padding: 3px 9px; border-radius: 999px; }
    .cg-mask-chip { flex: none; display: inline-flex; align-items: center; gap: 3px; font-size: 10.5px; font-weight: 800; color: var(--ai-600); background: var(--ai-50); padding: 3px 8px; border-radius: 999px; }

    .cg-source { background: var(--paper); border: 1px solid var(--line); border-radius: 14px; padding: 15px; display: flex; flex-direction: column; gap: 13px; transition: border-color .15s, box-shadow .15s, opacity .15s; }
    .cg-source:hover { border-color: var(--line-strong); box-shadow: var(--shadow-sm); }
    .cg-source[data-off="true"] { opacity: .62; }
    .cg-source[data-off="true"]:hover { opacity: .82; }
    .cg-source-ico { width: 38px; height: 38px; border-radius: 11px; flex: none; display: grid; place-items: center; color: var(--accent-600); background: var(--accent-50); }
    .cg-source-ico.is-ai { color: var(--ai-600); background: var(--ai-50); }
    .cg-source-name { font-weight: 800; font-size: 15px; color: var(--ink); }
    .cg-source-count { font-size: 12px; color: var(--n-600); margin-top: 2px; }
    .cg-dot-sep { margin: 0 7px; color: var(--n-400); }
    .cg-grounded { flex: none; display: inline-flex; align-items: center; gap: 3px; font-size: 10.5px; font-weight: 800; color: var(--ok); background: var(--ok-bg); padding: 3px 8px; border-radius: 999px; }
    .cg-hidden { flex: none; font-size: 10.5px; font-weight: 800; color: var(--n-600); background: var(--n-100); padding: 3px 8px; border-radius: 999px; }

    .cg-cov-label { font-size: 12px; font-weight: 700; color: var(--ink-2); }
    .cg-cov-tag { font-size: 10.5px; font-weight: 800; padding: 2px 8px; border-radius: 999px; }
    .cg-cov-track { height: 7px; border-radius: 999px; background: var(--n-100); overflow: hidden; }
    .cg-cov-fill { height: 100%; border-radius: 999px; transition: width .6s var(--ease); }
    .cg-source-empty { font-size: 12.5px; color: var(--n-600); line-height: 1.45; background: var(--n-25); border: 1px dashed var(--line-strong); border-radius: 10px; padding: 11px 12px; }

    .cg-controls { display: flex; flex-direction: column; gap: 4px; border-top: 1px solid var(--line); padding-top: 11px; margin-top: auto; }
    .cg-toggle { display: flex; align-items: center; gap: 9px; background: none; border: none; cursor: pointer; font-family: inherit; padding: 4px 0; text-align: left; }
    .cg-toggle:disabled { opacity: .45; cursor: not-allowed; }
    .cg-toggle-label { display: inline-flex; align-items: center; gap: 4px; font-size: 12.5px; font-weight: 600; color: var(--n-700); }
    .cg-switch { width: 34px; height: 20px; flex: none; border-radius: 999px; background: var(--n-200); position: relative; transition: background .2s; }
    .cg-switch[data-on="true"] { background: var(--accent); }
    .cg-switch[data-mask="true"][data-on="true"] { background: var(--ai); }
    .cg-switch span { position: absolute; top: 3px; left: 3px; width: 14px; height: 14px; border-radius: 50%; background: #fff; transition: left .2s; box-shadow: 0 1px 2px rgba(0,0,0,.3); }
    .cg-switch[data-on="true"] span { left: 17px; }

    .cg-gov { background: var(--paper); border: 1px solid var(--line); border-radius: 14px; padding: 16px; }
    .cg-gov-head { display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 14.5px; color: var(--ink); margin-bottom: 8px; }
    .cg-gov-p { font-size: 13px; color: var(--n-600); line-height: 1.5; margin: 0 0 12px; }
    .cg-gov-stat { font-size: 13px; font-weight: 700; color: var(--ink); }
    `}</style>
  );
}
