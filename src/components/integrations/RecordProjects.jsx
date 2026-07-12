// Delivery projects panel - The Way connector surfaced on a deal / company
// record. Shows post-sale delivery projects with their RYG health + status,
// PM, progress, and open task count, each deep-linking into The Way. When the
// connection is not live it shows deterministic seeded demo projects (never a
// spinner, never empty) with a subtle "connect for live status" affordance;
// when live it pulls through the env-gated bridge and degrades to demo on any
// failure. Fully additive: mount it on any record page, remove it and nothing
// else changes.
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Badge, Button, ProgressBar, useToast, relTime } from '../UI.jsx';
import { Icon } from '../icons.jsx';
import { theway } from '../../lib/integrations/connectors/theway.js';
import { useConnections } from '../../lib/integrations/connections.js';

export default function RecordProjects({ company, deal }) {
  const toast = useToast();
  useConnections();                         // re-render when a connection flips
  const connected = theway.isLive();

  // Stable anchor + deterministic demo set (recomputed only when the record id changes).
  const anchor = useMemo(() => ({ company, deal }), [company?.id, deal?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const demo = useMemo(() => theway.demoProjectsForRecord(anchor), [anchor]);

  const [projects, setProjects] = useState(demo);
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setProjects(demo);
    setLive(false);
    if (!connected) return;                 // graceful: demo stays, nothing thrown
    setLoading(true);
    theway.fetchProjects(anchor)
      .then((r) => {
        if (cancelled) return;
        setProjects(r.projects && r.projects.length ? r.projects : demo);
        setLive(!!r.live);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [anchor, connected, demo]);

  if (!company && !deal) return null;

  const target = deal
    ? { relatedType: 'deal', relatedId: deal.id, companyId: deal.companyId }
    : { relatedType: 'company', relatedId: company.id, companyId: company.id };

  const logIt = (p) => {
    const r = theway.logToRecord(p, target);
    if (r?.error) return toast(r.message || 'Could not log update', 'risk');
    toast('Delivery update logged to timeline', 'ok');
  };

  const atRisk = projects.filter((p) => p.ryg === 'yellow' || p.ryg === 'red').length;

  return (
    <Card pad={false}>
      {/* header */}
      <div className="row between wrap gap-2" style={{ padding: '1.1rem 1.25rem', borderBottom: '1px solid var(--line)', alignItems: 'center' }}>
        <div className="row gap-2" style={{ alignItems: 'center', minWidth: 0 }}>
          <span className="row center" style={{ width: 30, height: 30, borderRadius: 'var(--r-sm)', background: 'var(--accent-50)', color: 'var(--accent-600)', flex: 'none' }}>
            <Icon name="layers" size={17} />
          </span>
          <div className="col" style={{ minWidth: 0, lineHeight: 1.2 }}>
            <h4 style={{ margin: 0 }}>Delivery projects</h4>
            <span className="t-xs muted clip">Post-sale delivery in The Way</span>
          </div>
        </div>
        <div className="row gap-1" style={{ alignItems: 'center', flex: 'none' }}>
          {atRisk > 0 && <Badge tone="warn">{atRisk} at risk</Badge>}
          <Badge tone="default">{projects.length}</Badge>
          <span
            className="row gap-1"
            title={live ? 'Live from The Way' : 'Preview data - connect The Way for live status'}
            style={{ alignItems: 'center', gap: '.3rem', padding: '.1rem .45rem', borderRadius: 'var(--r-pill)', border: '1px solid var(--line)', background: 'var(--n-50)', fontSize: '.68rem', color: 'var(--n-600)' }}
          >
            <span className="dot" style={{ background: live ? 'var(--ok)' : 'var(--n-400)' }} />
            {loading ? 'Syncing' : live ? 'Live' : 'Preview'} via The Way
          </span>
        </div>
      </div>

      {/* rows */}
      <div className="col">
        {projects.map((p, i) => (
          <div
            key={p.id || i}
            className="col gap-2"
            style={{ padding: '.85rem 1.25rem', borderBottom: i < projects.length - 1 ? '1px solid var(--line)' : 'none' }}
          >
            <div className="row between gap-2" style={{ alignItems: 'flex-start' }}>
              <div className="col" style={{ minWidth: 0, lineHeight: 1.3, gap: 2 }}>
                <a
                  href={p.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="fw-6 clip link"
                  style={{ minWidth: 0 }}
                  title="Open in The Way"
                >
                  {p.name}
                </a>
                <div className="row gap-2 wrap" style={{ alignItems: 'center' }}>
                  <span className="t-xs muted clip">{p.statusLabel}</span>
                  {p.pmName && <span className="t-xs muted clip">PM: {p.pmName}</span>}
                  {p.updatedAt && <span className="t-xs muted">Updated {relTime(p.updatedAt)}</span>}
                </div>
              </div>
              <Badge tone={p.tone} className="" >
                <span className="row gap-1" style={{ alignItems: 'center' }}>
                  <span className="dot" style={{ background: p.tone === 'ok' ? 'var(--ok)' : p.tone === 'warn' ? 'var(--warn)' : 'var(--risk)' }} />
                  {p.rygLabel}
                </span>
              </Badge>
            </div>

            <div className="row gap-2" style={{ alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 0 }}><ProgressBar value={p.progress} /></div>
              <span className="t-xs muted tnum" style={{ flex: 'none' }}>{p.progress}%</span>
            </div>

            <div className="row between gap-2 wrap" style={{ alignItems: 'center' }}>
              <span className="t-xs muted">
                {p.openTasks > 0 ? `${p.openTasks} open of ${p.totalTasks} tasks` : `${p.totalTasks} tasks - all done`}
              </span>
              <div className="row gap-1" style={{ flex: 'none' }}>
                <Button variant="ghost" size="sm" onClick={() => logIt(p)} title="Log a delivery update to this record's timeline">
                  <Icon name="plus" size={14} /> Log update
                </Button>
                <a href={p.externalUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" title="Open in The Way">
                  <Icon name="arrowUp" size={14} style={{ transform: 'rotate(45deg)' }} /> Open
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* footer - connect affordance when not live */}
      {!live && (
        <div className="row between gap-2 wrap" style={{ padding: '.7rem 1.25rem', borderTop: '1px solid var(--line)', background: 'var(--n-25)', alignItems: 'center' }}>
          <span className="t-xs muted" style={{ minWidth: 0 }}>
            Preview delivery data. Connect The Way to sync live project status.
          </span>
          <Link to="/integrations" className="btn btn-ghost btn-sm" style={{ flex: 'none' }}>
            <Icon name="plug" size={14} /> Connect The Way
          </Link>
        </div>
      )}
    </Card>
  );
}
