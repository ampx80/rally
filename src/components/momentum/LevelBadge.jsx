// A single level badge: the roman-numeral rank on its level color.
import React from 'react';

export default function LevelBadge({ level, size = 'lg', color, badge, style }) {
  const cls = `mo-badge mo-badge--${size === 'sm' ? 'sm' : 'lg'}`;
  return (
    <span className={cls} style={{ background: color, ...style }} aria-hidden="true">
      {badge ?? level}
    </span>
  );
}
