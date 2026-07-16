// Deal pipeline board. One column per stage, drag a card to move a deal
// (native HTML5 drag/drop). Columns read as tonal bands (a soft tint + a
// colored top edge in the stage's own hue) so the pipeline shape is legible
// at a glance; cards echo the same hue as a left accent stripe. Card headers
// guard against overflow in narrow columns: title minWidth:0 + ellipsis,
// chip group wraps, never flexShrink:0.
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { STAGES } from '../lib/store.js';
import { Avatar, moneyK, relTime, AnimatedNumber } from './UI.jsx';
import { Icon } from './icons.jsx';

const stageAccent = {
  lead: '#8b93a4', qualified: '#2563a8', discovery: '#7c5cf7',
  proposal: '#b3721a', negotiation: '#0e9f8f', won: '#1a7f52', lost: '#c0392b',
};

function healthColor(p) {
  if (p >= 70) return 'var(--ok)';
  if (p >= 40) return 'var(--warn)';
  return 'var(--risk)';
}

function DealCard({ deal, companyName, ownerName, onDragStart, onDragEnd, onClick }) {
  const [drag, setDrag] = useState(false);
  const prob = Number(deal.probability ?? deal.prob ?? 50);
  return (
    <div draggable
      onDragStart={(e) => { setDrag(true); onDragStart && onDragStart(e); }}
      onDragEnd={() => { setDrag(false); onDragEnd && onDragEnd(); }}
      onClick={onClick} className="card kb-card"
      style={{
        padding: '.8rem .85rem', cursor: drag ? 'grabbing' : 'grab', borderRadius: 'var(--r-md)',
        border: '1px solid var(--line)',
        borderLeft: `3px solid ${healthColor(prob)}`,
        transform: drag ? 'rotate(2.5deg) scale(1.04)' : 'none',
        boxShadow: drag ? '0 18px 40px -12px rgba(11,18,20,.35)' : '0 1px 2px rgba(16,20,30,.05)',
        opacity: drag ? 0.92 : 1,
        transition: 'transform .16s var(--ease), box-shadow .16s var(--ease), border-color .16s var(--ease)',
      }}>
      <div className="row between gap-1" style={{ alignItems: 'flex-start' }}>
        <span className="fw-6 clip" style={{ minWidth: 0, fontSize: '.94rem', fontFamily: 'var(--font-display)' }}>{deal.name}</span>
        <span className="badge t-xs tnum" style={{ flex: 'none' }}>{prob}%</span>
      </div>
      <div className="t-xs muted clip" style={{ marginTop: 2 }}>{companyName}</div>
      <div className="row between wrap gap-1" style={{ marginTop: '.65rem' }}>
        <span className="fw-7 tnum" style={{ color: 'var(--ink)' }}>{moneyK(deal.value)}</span>
        <span className="row gap-2 wrap" style={{ justifyContent: 'flex-end', alignItems: 'center' }}>
          <span className="row gap-1 t-xs muted" style={{ alignItems: 'center' }}><Icon name="clock" size={12} /> {relTime(deal.closeDate)}</span>
          <Avatar name={ownerName} size={22} />
        </span>
      </div>
    </div>
  );
}

export default function KanbanBoard({ deals, companyName, ownerName, onMove }) {
  const nav = useNavigate();
  const [dragId, setDragId] = useState(null);
  const [overStage, setOverStage] = useState(null);

  const byStage = {};
  for (const s of STAGES) byStage[s.id] = [];
  for (const d of deals) (byStage[d.stage] = byStage[d.stage] || []).push(d);

  return (
    <div className="row" style={{ gap: '.85rem', overflowX: 'auto', alignItems: 'flex-start', paddingBottom: '.5rem' }}>
      {STAGES.map(stage => {
        const list = byStage[stage.id] || [];
        const sum = list.reduce((s, d) => s + d.value, 0);
        const isOver = overStage === stage.id;
        return (
          <div key={stage.id}
            onDragOver={e => { e.preventDefault(); setOverStage(stage.id); }}
            onDragLeave={() => setOverStage(s => s === stage.id ? null : s)}
            onDrop={() => { if (dragId) onMove(dragId, stage.id); setDragId(null); setOverStage(null); }}
            style={{
              width: 244, flex: 'none',
              background: isOver
                ? 'var(--accent-50)'
                : `linear-gradient(180deg, color-mix(in srgb, ${stageAccent[stage.id]} 12%, var(--n-50)), var(--n-50) 48%)`,
              borderRadius: 'var(--r-md)',
              border: '1px solid ' + (isOver ? 'var(--accent-300)' : 'var(--line)'),
              borderTop: `3px solid ${stageAccent[stage.id]}`,
              boxShadow: isOver ? '0 0 0 3px var(--accent-50), var(--accent-glow)' : 'var(--shadow-sm)',
              transform: isOver ? 'translateY(-2px) scale(1.012)' : 'none',
              transition: 'transform .18s var(--ease), box-shadow .18s var(--ease), background .18s, border-color .18s',
              display: 'flex', flexDirection: 'column', maxHeight: '72vh',
            }}>
            <div className="row between" style={{ padding: '.7rem .8rem .5rem' }}>
              <span className="fw-7 clip" style={{ fontSize: '.92rem', fontFamily: 'var(--font-display)' }}>{stage.name}</span>
              <span className="badge t-xs" style={{ background: `color-mix(in srgb, ${stageAccent[stage.id]} 16%, var(--paper))`, color: stageAccent[stage.id], flex: 'none' }}>{list.length}</span>
            </div>
            <div className="tnum fw-7" style={{ padding: '0 .8rem .6rem', fontSize: '.94rem', color: 'var(--ink-2)' }}><AnimatedNumber value={sum} format={moneyK} /></div>
            <div className="col gap-1" style={{ padding: '0 .55rem .7rem', overflowY: 'auto' }}>
              {list.map(d => (
                <DealCard key={d.id} deal={d} companyName={companyName(d.companyId)} ownerName={ownerName(d.ownerId)}
                  onDragStart={() => setDragId(d.id)}
                  onClick={() => nav(`/deals/${d.id}`)} />
              ))}
              {list.length === 0 && (
                <div className="t-xs muted" style={{ padding: '.9rem .4rem', textAlign: 'center', border: '1.5px dashed var(--line-strong)', borderRadius: 'var(--r-sm)' }}>Drop here</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
