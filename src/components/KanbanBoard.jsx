// Deal pipeline board. One column per stage, drag a card to move a deal
// (native HTML5 drag/drop). Card headers guard against overflow in narrow
// columns: title minWidth:0 + ellipsis, chip group wraps, never flexShrink:0.
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { STAGES } from '../lib/store.js';
import { Avatar, moneyK, relTime } from './UI.jsx';
import { Icon } from './icons.jsx';

const stageAccent = {
  lead: '#8b93a4', qualified: '#2563a8', discovery: '#5b4bf5',
  proposal: '#b3721a', negotiation: '#0ea5a3', won: '#1a7f52', lost: '#c0392b',
};

function DealCard({ deal, companyName, ownerName, onDragStart, onClick }) {
  return (
    <div draggable onDragStart={onDragStart} onClick={onClick} className="card card-hover"
      style={{ padding: '.75rem .8rem', cursor: 'grab', borderRadius: 'var(--r-md)' }}>
      <div className="row between gap-1" style={{ alignItems: 'flex-start' }}>
        <span className="fw-6 clip" style={{ minWidth: 0, fontSize: '.94rem' }}>{deal.name}</span>
      </div>
      <div className="t-xs muted clip" style={{ marginTop: 2 }}>{companyName}</div>
      <div className="row between wrap gap-1" style={{ marginTop: '.6rem' }}>
        <span className="fw-7 tnum" style={{ color: 'var(--ink)' }}>{moneyK(deal.value)}</span>
        <span className="row gap-1 wrap" style={{ justifyContent: 'flex-end' }}>
          <span className="badge t-xs"><Icon name="clock" size={12} /> {relTime(deal.closeDate)}</span>
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
            style={{ width: 244, flex: 'none', background: isOver ? 'var(--accent-50)' : 'var(--n-50)', borderRadius: 'var(--r-md)', border: isOver ? '1px solid var(--accent-300)' : '1px solid var(--line)', display: 'flex', flexDirection: 'column', maxHeight: '72vh' }}>
            <div className="row between" style={{ padding: '.7rem .8rem .5rem' }}>
              <span className="row gap-1" style={{ minWidth: 0 }}>
                <span className="dot" style={{ background: stageAccent[stage.id] }} />
                <span className="fw-6 clip" style={{ fontSize: '.9rem' }}>{stage.name}</span>
                <span className="badge t-xs">{list.length}</span>
              </span>
            </div>
            <div className="t-xs muted tnum" style={{ padding: '0 .8rem .55rem' }}>{moneyK(sum)}</div>
            <div className="col gap-1" style={{ padding: '0 .55rem .7rem', overflowY: 'auto' }}>
              {list.map(d => (
                <DealCard key={d.id} deal={d} companyName={companyName(d.companyId)} ownerName={ownerName(d.ownerId)}
                  onDragStart={() => setDragId(d.id)}
                  onClick={() => nav(`/deals/${d.id}`)} />
              ))}
              {list.length === 0 && <div className="t-xs muted" style={{ padding: '.5rem .3rem', textAlign: 'center' }}>Drop here</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
