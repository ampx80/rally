// Pipeline switcher: a segmented control listing every configured deal
// pipeline. Opt-in - a page mounts it and filters its deal list by the
// selected pipeline id. The default pipeline is always first and always
// present, so mounting this with no selection is identical to today.
import React from 'react';
import { usePipelines, DEFAULT_PIPELINE_ID } from '../lib/pipelines.js';

// Controlled: parent owns the selected id and applies the filter.
// `value`     - selected pipeline id (defaults to the default pipeline)
// `onChange`  - called with the newly selected pipeline id
// `showCount` - optional (deal count per pipeline) -> render a badge
export default function PipelineSwitcher({ value, onChange, showCount }) {
  const pipelines = usePipelines();
  if (!pipelines || pipelines.length < 2) return null; // nothing to switch between

  const selected = value || DEFAULT_PIPELINE_ID;

  return (
    <div
      className="row gap-1"
      role="tablist"
      aria-label="Deal pipeline"
      style={{ background: 'var(--n-50)', padding: 3, borderRadius: 'var(--r-sm)', border: '1px solid var(--line)', flexWrap: 'wrap' }}
    >
      {pipelines.map(p => {
        const on = p.id === selected;
        const count = typeof showCount === 'function' ? showCount(p.id) : null;
        return (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange && onChange(p.id)}
            className={`btn btn-sm ${on ? 'btn-primary' : 'btn-ghost'}`}
          >
            {p.name}
            {count != null && (
              <span className="badge t-xs" style={{ marginLeft: 6 }}>{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
