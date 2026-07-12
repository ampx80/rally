// A tiny provenance chip: "via <app>" plus an open-in-source link.
// Mount it in ActivityTimeline (or any activity row) - it renders only
// when the activity carries a `source` (the integration id stamped by a
// connector via Connector.via()). Self-contained + additive: nothing
// else needs to change, and rows with no source render nothing.
import React from 'react';
import { Icon } from '../../components/icons.jsx';
import { integrationById } from './registry.js';

export default function ActivitySourceChip({ source, externalUrl }) {
  if (!source) return null;
  const desc = integrationById(source);
  const name = desc?.name || source;
  const domain = desc?.logo || null;

  return (
    <span
      className="row gap-1"
      title={`Logged via ${name}`}
      style={{
        alignItems: 'center', flex: 'none', gap: '.3rem',
        padding: '.1rem .4rem', borderRadius: 'var(--r-pill)',
        border: '1px solid var(--line)', background: 'var(--n-50)',
        fontSize: '.68rem', color: 'var(--n-600)', lineHeight: 1.4,
      }}
    >
      {domain ? (
        <img
          src={`https://logo.clearbit.com/${domain}?size=32`}
          alt=""
          width={12}
          height={12}
          loading="lazy"
          style={{ borderRadius: 3, objectFit: 'contain' }}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      ) : (
        <Icon name="plug" size={11} />
      )}
      <span>via {name}</span>
      {externalUrl && (
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={`Open in ${name}`}
          aria-label={`Open in ${name}`}
          style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--accent-600)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <Icon name="arrowUp" size={11} style={{ transform: 'rotate(45deg)' }} />
        </a>
      )}
    </span>
  );
}
