// ============================================================
// SuppressionManager - the do-not-email list. Every send routes
// through api/_lib-email.js which drops any recipient on
// rally_email_unsubscribes or rally_email_excluded, so this list is
// enforced automatically. Bounces + complaints land here from
// api/resend-webhook.js; operators can also add/remove addresses by
// hand. Local-first mirror + best-effort backend sync via
// deliverability-store.js.
//
// ASCII only. NO em-dash / en-dash.
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import { Card, Badge, Button, Input, Select, StatCard, EmptyState, useToast, relTime } from '../UI.jsx';
import { Icon } from '../icons.jsx';
import {
  useDeliverability, getSuppression, suppressionStats,
  addSuppression, removeSuppression, syncFromApi,
} from './deliverability-store.js';

const LIST_TONE = { excluded: 'risk', unsubscribes: 'warn' };
const LIST_LABEL = { excluded: 'Excluded', unsubscribes: 'Unsubscribed' };

export default function SuppressionManager() {
  useDeliverability();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [email, setEmail] = useState('');
  const [list, setList] = useState('excluded');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => { const r = await syncFromApi(); if (alive && r && r.configured) toast(`Synced ${r.count} suppressed address${r.count === 1 ? '' : 'es'}`); })();
    return () => { alive = false; };
  }, []);

  const stats = suppressionStats();
  const rows = getSuppression();
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows
      .filter(r => !needle || r.email.includes(needle) || (r.reason || '').toLowerCase().includes(needle))
      .sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
  }, [q, rows]);

  const add = async () => {
    setBusy(true);
    try {
      const r = await addSuppression(email, { list });
      if (r.error) { toast(r.message, 'risk'); return; }
      toast(r.configured ? 'Suppressed (durable)' : 'Suppressed locally');
      setEmail('');
    } finally { setBusy(false); }
  };

  const remove = async (r) => {
    await removeSuppression(r.email, r.list);
    toast('Removed from suppression');
  };

  return (
    <div className="col gap-3">
      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))' }}>
        <StatCard label="Suppressed" value={stats.total} sub="never emailed" icon={<Icon name="lock" size={18} />} accent="#c0392b" />
        <StatCard label="Unsubscribes" value={stats.unsubscribes} sub="opt-outs + complaints" icon={<Icon name="flag" size={18} />} accent="#e0752d" />
        <StatCard label="Bounces" value={stats.bounces} sub="auto-added" icon={<Icon name="rotateCcw" size={18} />} accent="#c0392b" />
        <StatCard label="Manual excludes" value={stats.excluded} sub="do-not-contact" icon={<Icon name="shield" size={18} />} />
      </div>

      <Card className="col gap-2">
        <div className="fw-7 row gap-2" style={{ alignItems: 'center' }}><Icon name="plus" size={15} /> Add to suppression</div>
        <div className="row gap-2 wrap" style={{ alignItems: 'center' }}>
          <Input placeholder="email@example.com" value={email} onChange={e => setEmail(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') add(); }} style={{ maxWidth: 280 }} />
          <Select value={list} onChange={e => setList(e.target.value)} style={{ maxWidth: 200 }}>
            <option value="excluded">Do-not-contact (excluded)</option>
            <option value="unsubscribes">Unsubscribed</option>
          </Select>
          <Button variant="primary" size="sm" onClick={add} disabled={busy || !email.trim()}><Icon name="lock" size={14} /> Suppress</Button>
        </div>
        <div className="t-xs muted">Enforced on every send by the hardened email primitive - suppressed addresses are silently skipped, never mailed.</div>
      </Card>

      <Card className="col gap-2">
        <div className="row between wrap gap-2" style={{ alignItems: 'center' }}>
          <div className="fw-7">Suppression list</div>
          <Input placeholder="Search..." value={q} onChange={e => setQ(e.target.value)} style={{ maxWidth: 240 }} />
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon="🛡️" title={q ? 'No matches' : 'No suppressed addresses'} body={q ? 'No suppressed address matches that search.' : 'Bounces and complaints land here automatically. You can also add addresses by hand above.'} />
        ) : (
          <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', maxHeight: 460, overflowY: 'auto' }}>
            {filtered.map((r, i) => (
              <div key={`${r.email}_${r.list}_${i}`} className="row between gap-2" style={{ padding: '.55rem .7rem', borderBottom: '1px solid var(--line)', alignItems: 'center' }}>
                <div className="col" style={{ minWidth: 0 }}>
                  <span className="fw-6 clip" style={{ fontSize: '.92rem' }}>{r.email}</span>
                  <span className="t-xs muted">{r.reason || 'manual'} - {relTime(r.at)}</span>
                </div>
                <div className="row gap-2" style={{ flex: 'none', alignItems: 'center' }}>
                  <Badge tone={LIST_TONE[r.list] || 'default'}>{LIST_LABEL[r.list] || r.list}</Badge>
                  <Button variant="quiet" size="sm" onClick={() => remove(r)} title="Remove"><Icon name="x" size={14} /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
