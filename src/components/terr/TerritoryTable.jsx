// The territory grid: one card per book with region/segment, assigned
// reps, account + open-deal counts, a live attainment bar, and a mini
// load meter (accounts-per-rep vs the team average). Reps are editable
// through an assign modal that writes to the persisted rosters.
import React, { useState } from 'react';
import { Card, Button, Badge, Avatar, Modal, useToast, moneyK } from '../UI.jsx';
import { Icon } from '../icons.jsx';
import { setTerritoryReps } from '../../lib/territory-data.js';
import './terr.css';

const ACCENT = '#5b4bf5';

function barColor(pct) {
  if (pct >= 100) return 'var(--ok)';
  if (pct >= 60) return ACCENT;
  return 'var(--warn)';
}

export default function TerritoryTable({ model, reps }) {
  const toast = useToast();
  const [assigning, setAssigning] = useState(null);
  const territories = model.territories;

  // team average accounts-per-rep = the "fair" load line
  const totalAcct = territories.reduce((s, t) => s + t.accountCount, 0);
  const totalReps = territories.reduce((s, t) => s + t.repCount, 0);
  const fairLoad = totalReps ? totalAcct / totalReps : 0;

  return (
    <div className="col gap-3">
      <div className="row between wrap" style={{ gap: '.75rem' }}>
        <div className="muted t-sm">Each book rolls up live from its assigned reps. The load meter compares accounts-per-rep to the team average.</div>
      </div>

      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}>
        {territories.map(t => {
          const load = t.loadPerRep;
          const loadPct = fairLoad ? Math.min(100, Math.round((load / (fairLoad * 2)) * 100)) : 50;
          const over = load > fairLoad * 1.25;
          const under = load < fairLoad * 0.75;
          const loadColor = over ? 'var(--warn)' : under ? 'var(--n-400)' : 'var(--ok)';
          const attain = Math.min(100, t.attainment);
          return (
            <Card key={t.id} className="terr-card col" style={{ gap: '1rem' }}>
              <div className="row between" style={{ alignItems: 'flex-start' }}>
                <div className="col gap-1" style={{ minWidth: 0 }}>
                  <h4 className="clip" style={{ margin: 0 }}>{t.name}</h4>
                  <div className="row gap-1 wrap">
                    <Badge tone="info"><Icon name="target" size={11} /> {t.region}</Badge>
                    <Badge tone="default">{t.segment}</Badge>
                  </div>
                </div>
                <Badge tone={over ? 'warn' : 'accent'} style={{ flex: 'none' }}>
                  {t.repCount} rep{t.repCount === 1 ? '' : 's'}
                </Badge>
              </div>

              {t.industry && <div className="t-xs muted clip">Focus: {t.industry}</div>}

              <div className="row" style={{ gap: '1.25rem', flexWrap: 'wrap' }}>
                <div className="col gap-1">
                  <span className="stat-label">Accounts</span>
                  <span className="fw-7 tnum" style={{ fontSize: '1.15rem' }}>{t.accountCount}</span>
                </div>
                <div className="col gap-1">
                  <span className="stat-label">Open pipeline</span>
                  <span className="fw-7 tnum" style={{ fontSize: '1.15rem', color: ACCENT }}>{moneyK(t.pipeline)}</span>
                </div>
                <div className="col gap-1">
                  <span className="stat-label">Open deals</span>
                  <span className="fw-7 tnum" style={{ fontSize: '1.15rem' }}>{t.openCount}</span>
                </div>
              </div>

              {/* attainment */}
              <div className="col gap-1">
                <div className="row between">
                  <span className="t-sm muted">Attainment vs quota</span>
                  <span className="fw-7 t-sm" style={{ color: barColor(t.attainment) }}>{t.attainment}%</span>
                </div>
                <div className="terr-bar-track">
                  <div className="terr-bar-fill" style={{ '--terr-w': attain + '%', width: attain + '%', background: barColor(t.attainment) }} />
                </div>
                <div className="t-xs muted">{moneyK(t.won)} won of {moneyK(t.quota)} quota</div>
              </div>

              {/* load meter */}
              <div className="col gap-1">
                <div className="row between">
                  <span className="t-sm muted">Load ({load ? load.toFixed(1) : 0} accounts/rep)</span>
                  <span className="t-xs fw-6" style={{ color: loadColor }}>{over ? 'Overloaded' : under ? 'Light' : 'Balanced'}</span>
                </div>
                <div className="terr-load" style={{ position: 'relative' }}>
                  <span style={{ '--terr-w': loadPct + '%', width: loadPct + '%', background: loadColor }} />
                  {fairLoad > 0 && (
                    <span className="terr-pace-mark" title="Team average"
                      style={{ left: `${Math.min(100, Math.round((fairLoad / (fairLoad * 2)) * 100))}%`, height: 12, top: -3 }} />
                  )}
                </div>
              </div>

              <div className="row between" style={{ gap: '.5rem' }}>
                <div className="row gap-1" style={{ flexWrap: 'wrap', minWidth: 0 }}>
                  {t.reps.length === 0 ? (
                    <span className="muted t-sm">No reps assigned</span>
                  ) : t.reps.map(r => (
                    <span key={r.id} title={r.name}><Avatar name={r.name} size={26} /></span>
                  ))}
                </div>
                <Button variant="ghost" size="sm" style={{ flex: 'none' }} onClick={() => setAssigning(t)}>
                  <Icon name="users" size={14} /> Assign
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* white-space callout */}
      {model.coverage.gaps.length > 0 && (
        <Card className="col gap-2">
          <div className="row gap-2" style={{ alignItems: 'center' }}>
            <Icon name="filter" size={16} />
            <h4 style={{ margin: 0 }}>White space</h4>
            <Badge tone="warn">{model.coverage.uncovered} accounts</Badge>
          </div>
          <div className="muted t-sm">Region + segment combinations with accounts but no territory. Prime ground for a new book.</div>
          <div className="row gap-1 wrap">
            {model.coverage.gaps.map(g => (
              <Badge key={g.label} tone="default">{g.label} - {g.count}</Badge>
            ))}
          </div>
        </Card>
      )}

      <AssignRepsModal territory={assigning} reps={reps} model={model}
        onClose={() => setAssigning(null)} onSaved={() => toast('Territory reps updated')} />
    </div>
  );
}

function AssignRepsModal({ territory, reps, model, onClose, onSaved }) {
  const [sel, setSel] = useState([]);
  React.useEffect(() => { setSel(territory ? [...(territory.repIds || [])] : []); }, [territory?.id]);
  if (!territory) return null;

  const toggle = (id) => setSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const save = () => { setTerritoryReps(territory.id, sel); onSaved?.(); onClose(); };

  const otherBooksFor = (repId) => model.territories
    .filter(t => t.id !== territory.id && (t.repIds || []).includes(repId))
    .map(t => t.name);

  return (
    <Modal open={!!territory} onClose={onClose} title={`Assign reps - ${territory.name}`}
      footer={<><Button variant="quiet" onClick={onClose}>Cancel</Button><Button variant="accent" onClick={save}><Icon name="check" size={15} /> Save assignments</Button></>}>
      <div className="col gap-1">
        {reps.length === 0 && <div className="muted t-sm">No reps available.</div>}
        {reps.map(r => {
          const on = sel.includes(r.id);
          const others = otherBooksFor(r.id);
          return (
            <button key={r.id} onClick={() => toggle(r.id)} className="row between" style={{
              width: '100%', textAlign: 'left', padding: '.6rem .75rem', borderRadius: 'var(--r-sm)',
              border: on ? `1.5px solid ${ACCENT}` : '1.5px solid var(--line)',
              background: on ? ACCENT + '0d' : 'transparent', cursor: 'pointer',
            }}>
              <div className="row gap-2" style={{ alignItems: 'center', minWidth: 0 }}>
                <Avatar name={r.name} size={34} />
                <div className="col" style={{ minWidth: 0 }}>
                  <span className="fw-6 clip">{r.name}</span>
                  <span className="muted t-xs clip">{r.title}{others.length ? ` - also in ${others.join(', ')}` : ''}</span>
                </div>
              </div>
              <span className="row center" style={{
                width: 24, height: 24, borderRadius: 6, flex: 'none',
                border: on ? 'none' : '1.5px solid var(--line-strong)', background: on ? ACCENT : 'transparent', color: '#fff',
              }}>
                {on && <Icon name="check" size={15} />}
              </span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
