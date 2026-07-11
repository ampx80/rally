// Playbook runner modal. Pick a recovery / growth play for an account, see
// its steps, and run it. Running logs a real activity on the account timeline
// (via success-data.runPlaybook), so the action persists across reloads.
import React, { useState } from 'react';
import { Modal, Button, Badge, useToast, moneyK } from '../UI.jsx';
import { Icon } from '../icons.jsx';
import { PLAYBOOKS, playbookById, runPlaybook } from '../../lib/success-data.js';

const BAND_TONE = { healthy: 'ok', watch: 'warn', risk: 'risk' };

export default function PlaybookRunner({ account, open, onClose, onRan }) {
  const toast = useToast();
  const [selId, setSelId] = useState(account?.recommendedPlay || 'qbr');
  const [ran, setRan] = useState(false);

  // keep selection synced when the account changes
  React.useEffect(() => {
    if (account) { setSelId(account.recommendedPlay || 'qbr'); setRan(false); }
  }, [account?.id]);

  if (!account) return null;
  const pb = playbookById(selId) || PLAYBOOKS[0];

  const run = () => {
    const res = runPlaybook(account.id, selId);
    if (res.error) return toast(res.message, 'risk');
    setRan(true);
    toast(`${pb.name} started for ${account.name}`);
    onRan?.(res);
  };

  return (
    <Modal open={open} onClose={onClose} title={`Playbooks - ${account.name}`} width={620}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Close</Button>
        <Button variant="primary" onClick={run} disabled={ran}>
          <Icon name="rocket" size={15} /> {ran ? 'Playbook running' : `Run ${pb.name}`}
        </Button>
      </>}>
      <div className="col gap-3">
        <div className="row between gap-2 wrap" style={{ alignItems: 'center' }}>
          <span className="row gap-2" style={{ alignItems: 'center' }}>
            <Badge tone={BAND_TONE[account.band.key]}>{account.band.label} - health {account.score}</Badge>
            <span className="t-sm muted">{moneyK(account.arr)} ARR</span>
          </span>
          <span className="t-xs muted">Recommended: {playbookById(account.recommendedPlay)?.name}</span>
        </div>

        {/* play picker */}
        <div className="row gap-2 wrap">
          {PLAYBOOKS.map(p => {
            const on = p.id === selId;
            const rec = p.id === account.recommendedPlay;
            return (
              <button key={p.id} onClick={() => { setSelId(p.id); setRan(false); }}
                className="col gap-1" style={{
                  flex: '1 1 130px', textAlign: 'left', padding: '.65rem .75rem',
                  border: `1px solid ${on ? 'var(--accent)' : 'var(--line)'}`,
                  background: on ? 'var(--accent-50)' : 'var(--paper)',
                  borderRadius: 'var(--r-md)', minWidth: 0,
                }}>
                <span className="row between" style={{ alignItems: 'center', gap: 4 }}>
                  <span className="fw-7 t-sm clip">{p.name}</span>
                  {rec && <Icon name="sparkles" size={13} style={{ color: 'var(--accent-600)', flex: 'none' }} />}
                </span>
                <span className="t-xs muted" style={{ lineHeight: 1.3 }}>{p.blurb}</span>
              </button>
            );
          })}
        </div>

        {/* steps */}
        <div className="col gap-2" style={{ background: 'var(--n-25)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: '.9rem 1rem' }}>
          <span className="eyebrow">{pb.name} steps</span>
          {pb.steps.map((s, i) => (
            <div key={i} className="row gap-2 cs-step-in" style={{ alignItems: 'flex-start', animationDelay: `${i * 70}ms` }}>
              <span className="row center" style={{
                width: 20, height: 20, borderRadius: 999, flex: 'none', marginTop: 1,
                background: ran ? 'var(--ok)' : 'var(--accent)', color: '#fff',
                fontSize: '.66rem', fontWeight: 800,
              }}>{ran ? <Icon name="check" size={12} /> : i + 1}</span>
              <span className="t-sm">{s}</span>
            </div>
          ))}
        </div>

        {ran && (
          <div className="row gap-2 cs-panel-in" style={{
            alignItems: 'center', color: 'var(--ok)',
            background: 'var(--ok-bg)', borderRadius: 'var(--r-sm)', padding: '.6rem .8rem',
          }}>
            <Icon name="check" size={16} />
            <span className="t-sm fw-6">Logged to {account.name}'s timeline as a task due in 2 days.</span>
          </div>
        )}
      </div>
    </Modal>
  );
}
