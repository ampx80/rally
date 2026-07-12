// Rolled-up metric cards for the company Hierarchy tab. Shows the focused
// account's numbers combined with every sub-account beneath it: open
// pipeline, closed-won revenue, AR outstanding, and contacts. Each card
// shows the rolled total big, with the account's own contribution as a
// sub-line so a parent can see how much comes from its children.
import React, { useEffect } from 'react';
import { Card, Stat, moneyK } from '../UI.jsx';
import { Icon } from '../icons.jsx';
import { useStore } from '../../lib/store.js';
import { useInvoices } from '../../lib/invoices-data.js';
import { rollupFor, seedHierarchyExamples } from '../../lib/hierarchy.js';
import './hierarchy.css';

export default function HierarchyRollupCards({ companyId }) {
  useStore();                       // live deals / contacts / parent links
  useInvoices();                    // live AR
  useEffect(() => { seedHierarchyExamples(); }, []);

  const { self, roll, childCount, descendantCount } = rollupFor(companyId);
  const hasKids = descendantCount > 0;
  const scope = hasKids
    ? `This account + ${descendantCount} sub-account${descendantCount === 1 ? '' : 's'}`
    : 'This account only';

  const cards = [
    { label: 'Rolled-up open pipeline', value: moneyK(roll.openPipeline), self: moneyK(self.openPipeline), icon: 'dollar' },
    { label: 'Rolled-up revenue (won)', value: moneyK(roll.wonRevenue), self: moneyK(self.wonRevenue), icon: 'trendUp' },
    { label: 'Rolled-up AR outstanding', value: moneyK(roll.ar), self: moneyK(self.ar), icon: 'receipt' },
    { label: 'Rolled-up contacts', value: roll.contacts, self: `${self.contacts}`, icon: 'users' },
  ];

  return (
    <div className="rh-rollup">
      <div className="rh-rollup-head row between wrap gap-2">
        <div className="eyebrow">Account roll-up</div>
        <span className="t-sm muted">{scope}{hasKids ? ` - ${childCount} direct` : ''}</span>
      </div>
      <div className="rh-rollup-grid">
        {cards.map(c => (
          <Card key={c.label} className="rh-rollup-card">
            <Stat
              value={c.value}
              label={c.label}
              sub={hasKids ? `${c.self} this account` : 'No sub-accounts yet'}
              icon={<Icon name={c.icon} size={18} />}
            />
          </Card>
        ))}
      </div>
    </div>
  );
}
