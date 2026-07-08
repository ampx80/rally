// Sequences. Automated multi-step outreach that runs on its own. KPI row over
// the whole book, then a responsive grid of premium sequence cards, each with
// enrollment, an active/paused switch, and open + reply rate meters. New
// sequence is a light stub for now.
import React, { useMemo, useState } from 'react';
import { useExt, getSequences } from '../lib/store-ext.js';
import {
  Button, Card, Badge, SectionHeader, ProgressBar, StatCard, useToast,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';

const TEAL = '#0ea5a3';

// Styled active/paused switch. Local-only toggle for now (persist later).
function Switch({ on, onClick }) {
  return (
    <button
      onClick={onClick}
      role="switch"
      aria-checked={on}
      className="row"
      style={{
        width: 44, height: 24, borderRadius: 999, padding: 2, flex: 'none',
        background: on ? 'var(--accent)' : 'var(--n-200)', border: 'none',
        cursor: 'pointer', transition: 'background .2s var(--ease)',
        justifyContent: 'flex-start',
      }}
    >
      <span
        style={{
          width: 20, height: 20, borderRadius: '50%', background: '#fff',
          boxShadow: 'var(--shadow-sm)',
          transform: on ? 'translateX(20px)' : 'translateX(0)',
          transition: 'transform .2s var(--ease)',
        }}
      />
    </button>
  );
}

function SequenceCard({ seq }) {
  const [active, setActive] = useState(seq.active);
  return (
    <Card hover style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="row between" style={{ alignItems: 'flex-start', gap: '.75rem' }}>
        <div className="col gap-1" style={{ minWidth: 0 }}>
          <h4 style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{seq.name}</h4>
          <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
            <Badge tone="accent">{seq.steps} steps</Badge>
            <Badge tone={active ? 'ok' : 'default'}>{active ? 'Active' : 'Paused'}</Badge>
          </div>
        </div>
        <Switch on={active} onClick={() => setActive(a => !a)} />
      </div>

      <div className="col gap-1">
        <div className="stat-value" style={{ fontSize: 'clamp(1.9rem, 3vw, 2.4rem)' }}>{seq.enrolled.toLocaleString()}</div>
        <div className="stat-label">Enrolled</div>
      </div>

      <div className="col gap-3">
        <div className="col gap-1">
          <div className="row between">
            <span className="t-sm fw-6" style={{ color: 'var(--n-600)' }}>Open rate</span>
            <span className="tnum fw-6 t-sm" style={{ color: 'var(--accent-600)' }}>{seq.openRate}%</span>
          </div>
          <ProgressBar value={seq.openRate} height={8} color="var(--accent)" />
        </div>
        <div className="col gap-1">
          <div className="row between">
            <span className="t-sm fw-6" style={{ color: 'var(--n-600)' }}>Reply rate</span>
            <span className="tnum fw-6 t-sm" style={{ color: TEAL }}>{seq.replyRate}%</span>
          </div>
          <ProgressBar value={seq.replyRate} height={8} color={TEAL} />
        </div>
      </div>

      <div className="row gap-2" style={{ alignItems: 'center', paddingTop: '.25rem', borderTop: '1px solid var(--line)' }}>
        <span style={{ color: 'var(--accent-600)' }}><Icon name="check" size={16} /></span>
        <span className="t-sm muted">Meetings booked:</span>
        <span className="tnum fw-6 t-sm">{seq.meetings}</span>
      </div>
    </Card>
  );
}

export default function Sequences() {
  useExt();
  const toast = useToast();
  const sequences = getSequences();

  const stats = useMemo(() => {
    const enrolled = sequences.reduce((s, q) => s + q.enrolled, 0);
    const meetings = sequences.reduce((s, q) => s + q.meetings, 0);
    const active = sequences.filter(q => q.active).length;
    const avgReply = sequences.length
      ? sequences.reduce((s, q) => s + q.replyRate, 0) / sequences.length : 0;
    return { enrolled, meetings, active, avgReply };
  }, [sequences]);

  return (
    <div className="fade-up">
      <SectionHeader
        title="Sequences"
        sub="Automated outreach that runs while you sleep."
        action={
          <Button variant="primary" size="sm" onClick={() => toast('Sequence created')}>
            <Icon name="plus" size={16} /> New sequence
          </Button>
        }
      />

      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', marginBottom: '1.25rem' }}>
        <StatCard
          label="Total enrolled" value={stats.enrolled}
          trend={14} icon={<Icon name="layers" size={18} />}
        />
        <StatCard
          label="Avg reply rate" value={Number(stats.avgReply.toFixed(1))} format={(n) => `${n.toFixed(1)}%`}
          trend={6} icon={<Icon name="mail" size={18} />}
          accent={TEAL} sparkColor={TEAL}
        />
        <StatCard
          label="Meetings booked" value={stats.meetings}
          trend={9} icon={<Icon name="target" size={18} />}
        />
        <StatCard
          label="Active sequences" value={stats.active}
          sub={`of ${sequences.length} total`} icon={<Icon name="bolt" size={18} />}
          accent="#e0752d"
        />
      </div>

      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))' }}>
        {sequences.map(seq => <SequenceCard key={seq.id} seq={seq} />)}
      </div>
    </div>
  );
}
