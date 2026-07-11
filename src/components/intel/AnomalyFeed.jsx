// AnomalyFeed - the "what changed / what is off" stream a CRO scans first.
// Each row is a detected pattern (slippage, concentration, silence, win-rate
// drift) with a severity dot and a plain-language explanation. Pure derivation
// off the live book via pipelineAnomalies().
import React, { useMemo } from 'react';
import { Card, SectionHeader, Badge } from '../UI.jsx';
import { Icon } from '../icons.jsx';
import { pipelineAnomalies } from '../../lib/intelligence-data.js';

const SEV_TONE = { high: 'risk', medium: 'warn', low: 'ok' };
const SEV_LABEL = { high: 'Act now', medium: 'Look into it', low: 'Good to know' };

export default function AnomalyFeed() {
  const items = useMemo(() => pipelineAnomalies(), []);

  return (
    <Card className="card-pad col gap-3">
      <SectionHeader
        eyebrow="Signals"
        title="Anomaly feed"
        sub="Patterns the numbers are hiding. Surfaced automatically, ranked by how much they should worry you."
        action={<Badge tone={items.some(i => i.severity === 'high') ? 'risk' : 'accent'}>{items.length} live</Badge>}
      />

      {items.length === 0 ? (
        <div className="col center gap-2" style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
          <Icon name="check" size={28} style={{ color: 'var(--ok)' }} />
          <div className="fw-6">Nothing anomalous</div>
          <div className="muted t-sm">The pipeline is behaving. No slippage, concentration, or silence worth flagging.</div>
        </div>
      ) : (
        <div className="col gap-2">
          {items.map((a, i) => (
            <div key={a.id} className="intel-insight" data-tier={a.severity === 'high' ? 'high' : a.severity === 'medium' ? 'medium' : 'low'} style={{ animationDelay: `${i * 40}ms` }}>
              <div className="card-pad row gap-2" style={{ alignItems: 'flex-start', padding: '.95rem 1.1rem' }}>
                <span className="intel-sev" data-sev={a.severity} />
                <div className="col gap-1" style={{ minWidth: 0, flex: 1 }}>
                  <div className="row between wrap" style={{ gap: '.4rem' }}>
                    <span className="row gap-1 fw-7" style={{ minWidth: 0 }}>
                      <Icon name={a.icon} size={16} style={{ color: `var(--${SEV_TONE[a.severity]})`, flex: 'none' }} />
                      <span className="clip">{a.title}</span>
                    </span>
                    <Badge tone={SEV_TONE[a.severity]} className="t-xs" style={{ flex: 'none' }}>{SEV_LABEL[a.severity]}</Badge>
                  </div>
                  <span className="t-sm" style={{ color: 'var(--ink-2)' }}>{a.detail}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
