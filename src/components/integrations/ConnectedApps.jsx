// ============================================================
// CONNECTED APPS  (the "everything native ties together" surface)
// A compact right-rail card that, given ONE record (contact / company /
// deal), gathers every external entity any connector has synced onto it -
// Tango meetings, Resolve tickets, The Way sessions, Gmail threads,
// Slack posts - and shows them in ONE place with a provenance chip and a
// deep link back to the source app.
//
// The data is already in the store: an activity a connector wrote carries
// { source, externalId, externalUrl } (Connector.via() -> createActivity).
// This surface is pure READ over those sourced activities - additive,
// display-only, no fabricated data. It renders nothing when there is
// nothing synced and no connectors are connected, so detail pages that
// have never touched an integration stay exactly as they were.
//
// Mount it beside <ActivityTimeline> on a detail page with the same props:
//   <ConnectedApps relatedType="deal" relatedId={deal.id} companyId={deal.companyId} tick={tick} />
// ============================================================
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Icon, typeIcon } from '../icons.jsx';
import { relTime } from '../UI.jsx';
import { getActivities, getActivitiesForRecord } from '../../lib/store.js';
import { integrationById } from '../../lib/integrations/registry.js';
import { useConnections } from '../../lib/integrations/connections.js';

const typeTint = { task: '#5b4bf5', call: '#0ea5a3', email: '#2563a8', meeting: '#b3721a', note: '#5b6474' };

// A connector's brand mark with a graceful plug fallback (same source as the
// timeline's ActivitySourceChip, kept local so this card is self-contained).
function SourceMark({ domain, size = 18 }) {
  const [failed, setFailed] = React.useState(false);
  if (failed || !domain) {
    return (
      <span className="row center" style={{ width: size, height: size, borderRadius: 4, background: 'var(--n-100, #eef0f6)', color: 'var(--n-500)', flex: 'none' }}>
        <Icon name="plug" size={Math.round(size * 0.6)} />
      </span>
    );
  }
  return (
    <span className="row center" style={{ width: size, height: size, borderRadius: 4, background: '#fff', border: '1px solid var(--line)', overflow: 'hidden', flex: 'none' }}>
      <img src={`https://logo.clearbit.com/${domain}?size=48`} alt="" width={size - 2} height={size - 2}
        loading="lazy" style={{ objectFit: 'contain' }} onError={() => setFailed(true)} />
    </span>
  );
}

export default function ConnectedApps({ relatedType, relatedId, companyId, tick }) {
  const conns = useConnections();

  // ids of connectors currently connected (reactive via the snapshot).
  const connectedIds = useMemo(
    () => Object.keys(conns).filter(id => conns[id]?.status === 'connected'),
    [conns]
  );

  // Sourced activities for this record. For a COMPANY, also roll up everything
  // synced onto its contacts and deals (they carry companyId) so the account
  // shows its full connected picture. De-duplicated by activity id.
  const groups = useMemo(() => {
    const seen = new Set();
    const pool = [];
    const push = (a) => { if (a && a.source && !seen.has(a.id)) { seen.add(a.id); pool.push(a); } };

    for (const a of getActivitiesForRecord(relatedType, relatedId)) push(a);
    if (relatedType === 'company' && relatedId) {
      for (const a of getActivities()) if (a.companyId === relatedId) push(a);
    }

    const bySource = new Map();
    for (const a of pool) {
      if (!bySource.has(a.source)) bySource.set(a.source, []);
      bySource.get(a.source).push(a);
    }
    // Newest first within a group; groups ordered by volume then name.
    const out = [];
    for (const [source, items] of bySource) {
      items.sort((x, y) => new Date(y.dueAt || y.createdAt) - new Date(x.dueAt || x.createdAt));
      const desc = integrationById(source);
      out.push({ source, items, name: desc?.name || source, domain: desc?.logo || null });
    }
    out.sort((a, b) => b.items.length - a.items.length || a.name.localeCompare(b.name));
    return out;
    // tick lets a parent force a recompute after logging/sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relatedType, relatedId, tick]);

  const total = groups.reduce((n, g) => n + g.items.length, 0);

  // Nothing synced and nothing connected: stay invisible on untouched records.
  if (total === 0 && connectedIds.length === 0) return null;

  return (
    <div className="card card-pad col gap-3">
      <div className="row between" style={{ alignItems: 'center' }}>
        <div className="row gap-2" style={{ alignItems: 'center', minWidth: 0 }}>
          <span className="row center" style={{ width: 28, height: 28, borderRadius: 'var(--r-pill)', background: 'var(--accent-50)', color: 'var(--accent-600)', flex: 'none' }}>
            <Icon name="plug" size={15} />
          </span>
          <span className="fw-7" style={{ color: 'var(--ink)' }}>Connected apps</span>
          {total > 0 && (
            <span className="t-xs" style={{ padding: '.05rem .4rem', borderRadius: 'var(--r-pill)', background: 'var(--n-100, #eef0f6)', color: 'var(--n-600)' }}>{total}</span>
          )}
        </div>
        <Link to="/integrations" className="t-xs" style={{ color: 'var(--accent-600)', flex: 'none', textDecoration: 'none' }}>Manage</Link>
      </div>

      {total === 0 ? (
        <div className="t-sm muted">
          {connectedIds.length === 1 ? '1 app connected' : `${connectedIds.length} apps connected`}. Nothing synced to this record yet - meetings, tickets, and threads land here automatically.
        </div>
      ) : (
        <div className="col gap-3">
          {groups.map(g => (
            <div key={g.source} className="col gap-1">
              <div className="row gap-2" style={{ alignItems: 'center' }}>
                <SourceMark domain={g.domain} />
                <span className="fw-6 t-sm" style={{ color: 'var(--ink)', minWidth: 0 }}>{g.name}</span>
                <span className="t-xs muted">{g.items.length}</span>
              </div>
              <div className="col" style={{ paddingLeft: 26 }}>
                {g.items.map((a, i) => (
                  <div key={a.id} className="row gap-2"
                    style={{ alignItems: 'center', padding: '.35rem 0', borderBottom: i < g.items.length - 1 ? '1px solid var(--line)' : 'none' }}>
                    <span className="row center" style={{ width: 22, height: 22, borderRadius: 'var(--r-pill)', background: (typeTint[a.type] || '#5b6474') + '1a', color: typeTint[a.type] || '#5b6474', flex: 'none' }}>
                      <Icon name={typeIcon[a.type] || 'fileText'} size={12} />
                    </span>
                    <span className="clip t-sm" style={{ flex: 1, minWidth: 0, color: 'var(--ink)' }}>{a.subject}</span>
                    <span className="t-xs muted" style={{ flex: 'none' }}>{relTime(a.dueAt || a.createdAt)}</span>
                    {a.externalUrl && (
                      <a href={a.externalUrl} target="_blank" rel="noopener noreferrer"
                        title={`Open in ${g.name}`} aria-label={`Open in ${g.name}`}
                        style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--accent-600)', flex: 'none' }}
                        onClick={(e) => e.stopPropagation()}>
                        <Icon name="arrowUp" size={13} style={{ transform: 'rotate(45deg)' }} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
