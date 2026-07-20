// A single journey dashboard tile for the Learn Hub. The whole card is a
// router Link (so every tile navigates and nothing is a dead button). It shows
// an icon, an eyebrow, a big headline value, and up to three supporting rows.
// ASCII only. No em-dash / no en-dash.
import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../icons.jsx';

export default function JourneyTile({
  icon, accent = 'var(--accent)', eyebrow, value, valueSub, headline, rows = [], to, cta,
}) {
  return (
    <Link to={to} className="lh-tile fx-lift fx-shimmer" style={{ '--lh-accent': accent }} aria-label={`${eyebrow}: open`}>
      <span className="lh-tile__glow" aria-hidden />
      <span className="lh-tile__ring" aria-hidden />
      <span className="lh-tile__head">
        <span className="lh-tile__icon"><Icon name={icon} size={18} /></span>
        <span className="lh-tile__eyebrow">{eyebrow}</span>
        <span className="lh-tile__go" aria-hidden><Icon name="arrowUpRight" size={16} /></span>
      </span>

      <span className="lh-tile__value fx-holo">
        {value}
        {valueSub != null && <span className="lh-tile__valueSub">{valueSub}</span>}
      </span>
      {headline && <span className="lh-tile__headline">{headline}</span>}

      {rows.length > 0 && (
        <span className="lh-tile__rows">
          {rows.map((r, i) => (
            <span key={i} className="lh-tile__row">
              <span className="lh-tile__rowLabel">{r.label}</span>
              <span className="lh-tile__rowVal">{r.value}</span>
            </span>
          ))}
        </span>
      )}

      <span className="lh-tile__cta">{cta} <Icon name="arrowRight" size={14} /></span>
    </Link>
  );
}
