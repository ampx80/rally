// GoalEditor - edit one goal's target. Shows a live pacing preview so a
// manager sees the ahead/behind verdict shift as they type, plus a reset to
// the computed default. Writes persist through goals-data (setGoalTarget /
// clearGoalTarget); the store pub/sub re-renders every open GoalCard.
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Button, Field, Input, Badge, money, moneyK, useToast } from '../UI.jsx';
import {
  metricById, STATUS_META, computeDefaultTarget, computeActual, pacing, currentPeriod,
  setGoalTarget, clearGoalTarget, getTeam,
} from '../../lib/goals-data.js';

function scopeLabel(goal) {
  if (!goal) return '';
  if (goal.level === 'company') return 'Company';
  if (goal.level === 'team') return getTeam(goal.scope)?.name || 'Team';
  return 'Rep';
}

export default function GoalEditor({ goal, repName, onClose, onSaved }) {
  const toast = useToast();
  const [val, setVal] = useState('');
  const [err, setErr] = useState('');
  const period = useMemo(() => currentPeriod(), []);

  useEffect(() => { if (goal) { setVal(String(goal.target)); setErr(''); } }, [goal?.key]);

  if (!goal) return null;
  const m = metricById(goal.metric);
  const fmt = m.unit === 'money' ? money : (v) => Math.round(v).toLocaleString();
  const fmtK = m.unit === 'money' ? moneyK : (v) => Math.round(v).toLocaleString();

  const target = Number(val) || 0;
  const actual = computeActual(goal.level, goal.scope, goal.metric, period);
  const preview = pacing(actual, target, period);
  const sm = STATUS_META[preview.status] || STATUS_META['on-track'];
  const dflt = computeDefaultTarget(goal.level, goal.scope, goal.metric);

  const save = () => {
    const res = setGoalTarget(goal.level, goal.scope, goal.metric, target);
    if (res.error) { setErr(res.message); return; }
    toast(`${m.label} target updated`);
    onSaved?.();
    onClose();
  };
  const reset = () => {
    clearGoalTarget(goal.level, goal.scope, goal.metric);
    toast(`${m.label} target reset to default`);
    onSaved?.();
    onClose();
  };

  const who = goal.level === 'rep' ? (repName || 'this rep') : scopeLabel(goal);

  return (
    <Modal
      open={!!goal}
      onClose={onClose}
      title={`Edit ${m.label} goal`}
      footer={
        <>
          <Button variant="quiet" onClick={reset}>Reset to default</Button>
          <span className="spacer" style={{ flex: 1 }} />
          <Button variant="quiet" onClick={onClose}>Cancel</Button>
          <Button variant="accent" onClick={save}>Save target</Button>
        </>
      }
    >
      <div className="col gap-3">
        <div className="t-sm muted">
          {scopeLabel(goal)}{goal.level === 'rep' && repName ? ` - ${repName}` : ''} - {period.label}
        </div>

        <Field label={`${m.label} target`} hint={m.unit === 'money' ? 'Whole dollars for the quarter.' : 'Count for the quarter.'}>
          <Input
            type="number" min="0" value={val} autoFocus
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
          />
        </Field>

        {/* live pacing preview */}
        <div className="card card-pad col gap-2" style={{ background: 'var(--n-050, var(--paper))' }}>
          <div className="row between" style={{ alignItems: 'center' }}>
            <span className="eyebrow">Live pacing preview</span>
            <Badge tone={sm.tone}>{sm.label}</Badge>
          </div>
          <div className="row between t-sm">
            <span className="muted">Actual so far</span>
            <span className="fw-7 tnum">{fmt(actual)}</span>
          </div>
          <div className="row between t-sm">
            <span className="muted">Expected by now ({Math.round(period.elapsed * 100)}% elapsed)</span>
            <span className="fw-6 tnum">{fmt(Math.round(preview.expected))}</span>
          </div>
          <div className="row between t-sm">
            <span className="muted">Projected end of {period.label}</span>
            <span className="fw-7 tnum" style={{ color: sm.color }}>{fmt(Math.round(preview.projected))} ({Math.round(preview.projectedPct * 100)}%)</span>
          </div>
          <div className="t-xs muted" style={{ borderTop: '1px solid var(--line)', paddingTop: 6 }}>
            Computed default for {who}: {fmtK(dflt)}
          </div>
        </div>
      </div>
    </Modal>
  );
}
