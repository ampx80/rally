// FlowPreview - a compact, read-only render of a template's runnable
// flow: Trigger -> Conditions -> Actions. It renders straight from the
// engine's own summary helpers (triggerSummary / conditionSummaries /
// actionSummary in automations.js), so the preview always matches what
// the automation will actually do once installed. ASCII hyphen only.
import React from 'react';
import { Icon } from '../icons.jsx';
import {
  TRIGGERS, ACTIONS,
  triggerSummary, conditionSummaries, actionSummary,
} from '../../lib/automations.js';

const TONE = {
  accent: { bg: 'var(--accent-50)', fg: 'var(--accent)' },
  amber: { bg: 'var(--warn-bg)', fg: 'var(--warn)' },
  ok: { bg: 'var(--ok-bg)', fg: 'var(--ok)' },
  info: { bg: 'var(--info-bg)', fg: 'var(--info)' },
};

function Step({ tone = 'accent', eyebrow, icon, text }) {
  const t = TONE[tone] || TONE.accent;
  return (
    <div className="atpl-step">
      <span className="atpl-step-chip" style={{ background: t.bg, color: t.fg }}>
        <Icon name={icon} size={14} />
      </span>
      <div className="atpl-step-body">
        <span className="atpl-step-eyebrow" style={{ color: t.fg }}>{eyebrow}</span>
        <span className="atpl-step-text" title={text}>{text}</span>
      </div>
    </div>
  );
}

const Connector = () => <div className="atpl-connector" aria-hidden="true" />;

/* `flow` is any automation-shaped object: { trigger, conditions, actions }.
   Template objects from automation-templates.js match this shape exactly. */
export default function FlowPreview({ flow }) {
  if (!flow?.trigger) return null;
  const trig = TRIGGERS[flow.trigger.type];
  const conds = conditionSummaries(flow);
  const actions = flow.actions || [];
  return (
    <div className="atpl-flow" aria-label="Automation flow preview">
      <Step tone="accent" eyebrow="When" icon={trig?.icon || 'bolt'} text={triggerSummary(flow)} />
      {conds.map((c, i) => (
        <React.Fragment key={`c${i}`}>
          <Connector />
          <Step tone="amber" eyebrow={i === 0 ? 'If' : 'And'} icon="filter" text={c} />
        </React.Fragment>
      ))}
      {actions.map((a, i) => (
        <React.Fragment key={`a${i}`}>
          <Connector />
          <Step tone={ACTIONS[a.type]?.tone || 'ok'} eyebrow={i === 0 ? 'Then' : 'And'}
            icon={ACTIONS[a.type]?.icon || 'zap'} text={actionSummary(a)} />
        </React.Fragment>
      ))}
    </div>
  );
}
