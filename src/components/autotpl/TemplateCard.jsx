// TemplateCard - one automation template on the library shelf. Shows
// the template identity, its flow preview, and a one-click Install that
// writes a REAL, live automation through the engine. Once installed it
// flips to a confirmed state with a link into the builder. ASCII hyphen
// only, no long dashes.
import React from 'react';
import { Card, Button, Badge } from '../UI.jsx';
import { Icon } from '../icons.jsx';
import { categoryById } from '../../lib/automation-templates.js';
import FlowPreview from './FlowPreview.jsx';

export default function TemplateCard({ tpl, installed, onInstall, onOpenBuilder }) {
  const cat = categoryById(tpl.category);
  const actionCount = (tpl.actions || []).length;
  return (
    <Card className={`atpl-card${installed ? ' is-installed' : ''}`}>
      <div className="atpl-card-head">
        <span className="atpl-step-chip" style={{ width: 40, height: 40, borderRadius: 'var(--r-md)', background: 'var(--accent-50)', color: 'var(--accent)' }}>
          <Icon name={tpl.icon} size={20} />
        </span>
        {installed
          ? <Badge tone="ok"><Icon name="check" size={12} /> Installed</Badge>
          : <Badge tone="default">{cat?.name || 'Template'}</Badge>}
      </div>

      <div className="col gap-1">
        <div className="atpl-card-title">{tpl.name}</div>
        <div className="atpl-card-desc">{tpl.description}</div>
      </div>

      <FlowPreview flow={tpl} />

      <div className="atpl-card-foot">
        {installed ? (
          <>
            <Button variant="ghost" size="sm" disabled style={{ color: 'var(--ok)', borderColor: 'var(--ok)' }}><Icon name="check" size={14} /> Live in your library</Button>
            <Button variant="ghost" size="sm" onClick={onOpenBuilder} style={{ marginLeft: 'auto' }}>
              Open in builder <Icon name="chevronRight" size={14} />
            </Button>
          </>
        ) : (
          <>
            <Button variant="accent" size="sm" onClick={onInstall}><Icon name="plus" size={14} /> Install</Button>
            <span className="t-xs muted" style={{ marginLeft: 'auto' }}>
              {actionCount} action{actionCount === 1 ? '' : 's'}
            </span>
          </>
        )}
      </div>
    </Card>
  );
}
