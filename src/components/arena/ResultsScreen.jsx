// Shared results screen for every Arena mode. Shows a big animated letter
// grade, a score ring, the rubric breakdown as growing bars, coaching
// feedback, and any badges just earned. Reused by RolePlay, SpeedDrill, and
// KnowledgeCheck so a "graded run" always feels the same. ASCII only.
import React from 'react';
import { Card, Button, Badge, Ring, SectionHeader } from '../UI.jsx';
import { Icon } from '../icons.jsx';
import { gradeTone, MODE_LABEL, PASS_MARK } from '../../lib/arena.js';

export default function ResultsScreen({ result, awarded = [], certifiedNow = false, onRetry, onExit, retryLabel = 'Try again' }) {
  const tone = gradeTone(result.score);
  const toneVar = tone === 'ok' ? 'var(--ok)' : tone === 'warn' ? 'var(--warn)' : tone === 'risk' ? 'var(--risk)' : 'var(--accent)';

  return (
    <div className="col gap-3 ar-rise" style={{ maxWidth: 720, margin: '0 auto' }}>
      {certifiedNow && (
        <Card className="ar-celebrate" style={{ borderColor: 'var(--ok)', background: 'color-mix(in srgb, var(--ok) 8%, var(--paper))' }}>
          <div className="row gap-2" style={{ alignItems: 'center' }}>
            <span style={{ fontSize: '1.8rem' }}>{'\u2605'}</span>
            <div>
              <div className="fw-7">Certification unlocked</div>
              <div className="t-sm muted">You passed all three modes for this role. The badge is now on your wall.</div>
            </div>
          </div>
        </Card>
      )}

      <Card pad style={{ textAlign: 'center' }}>
        <div className="t-sm muted" style={{ letterSpacing: '.06em', textTransform: 'uppercase' }}>
          {MODE_LABEL[result.mode] || 'Result'}
        </div>
        <div className="row center gap-3" style={{ marginTop: '1rem', flexWrap: 'wrap' }}>
          <div className="ar-grade" style={{ fontSize: '5.5rem', fontWeight: 800, lineHeight: 1, color: toneVar }}>
            {result.grade}
          </div>
          <Ring value={result.score} size={104} stroke={9} color={toneVar} label={`${result.score}`} />
        </div>
        <div style={{ marginTop: '.75rem' }}>
          {result.pass
            ? <Badge tone="ok">Passed ({PASS_MARK}+ to pass)</Badge>
            : <Badge tone="risk">Not passed yet ({PASS_MARK}+ to pass)</Badge>}
        </div>
      </Card>

      <Card pad>
        <SectionHeader title="Score breakdown" />
        <div className="col gap-3" style={{ marginTop: '.5rem' }}>
          {result.breakdown.map((b) => {
            const pct = b.max ? Math.round((b.value / b.max) * 100) : 0;
            return (
              <div key={b.label} className="col gap-1">
                <div className="row between t-sm">
                  <span className="fw-6">{b.label}</span>
                  <span className="muted">{b.value} / {b.max}</span>
                </div>
                <div style={{ background: 'var(--n-100)', borderRadius: 999, height: 10, overflow: 'hidden' }}>
                  <div className="ar-bar-fill" style={{ width: `${pct}%`, height: '100%', borderRadius: 999, background: toneVar }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card pad>
        <SectionHeader title="Coach notes" sub={result.meta && result.meta.source === 'ai' ? 'Graded with AI assist' : 'Deterministic rubric'} />
        <ul className="col gap-2" style={{ margin: '.5rem 0 0', paddingLeft: '1.1rem' }}>
          {result.feedback.map((f, i) => (
            <li key={i} style={{ lineHeight: 1.55 }}>{f}</li>
          ))}
        </ul>
      </Card>

      {awarded.length > 0 && (
        <Card pad>
          <SectionHeader title="Badges earned" />
          <div className="row gap-2 wrap" style={{ marginTop: '.5rem' }}>
            {awarded.map((b) => (
              <div key={b.id} className="ar-badge row gap-2" style={{ alignItems: 'center', padding: '.5rem .8rem', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)' }}>
                <span style={{ color: `var(--${b.tone === 'accent' ? 'accent' : b.tone})` }}><Icon name={b.icon} size={20} /></span>
                <span className="fw-6">{b.label}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="row gap-2" style={{ justifyContent: 'center', marginTop: '.25rem' }}>
        <Button variant="ghost" onClick={onExit}>Back to Arena</Button>
        <Button variant="primary" onClick={onRetry}>{retryLabel}</Button>
      </div>
    </div>
  );
}
