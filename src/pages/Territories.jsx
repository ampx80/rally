// Territories & Quota - the enterprise sales-ops command surface.
// Territory design (geo x segment books), quota + capacity planning
// with ramp, attainment vs quota off the real closed-won book, a
// coverage / white-space read, a balance/fairness gauge, and a
// one-click rebalance. Everything is live over the seeded book and the
// persisted territory rosters; every figure recomputes as deals move
// or a rep is reassigned.
import React, { useMemo, useState } from 'react';
import { useStore, getUsers } from '../lib/store.js';
import { useTerritoryStore, buildTerritoryModel } from '../lib/territory-data.js';
import { SectionHeader, StatCard, Tabs, Segmented, useToast } from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import TerritoryTable from '../components/terr/TerritoryTable.jsx';
import BalanceScore from '../components/terr/BalanceScore.jsx';
import QuotaAttainment from '../components/terr/QuotaAttainment.jsx';
import AttainmentBars from '../components/terr/AttainmentBars.jsx';
import CapacityPlanner from '../components/terr/CapacityPlanner.jsx';

export default function Territories() {
  const storeSnap = useStore();          // new ref on any deal/book mutation
  const terrSnap = useTerritoryStore();  // new ref on any roster mutation
  const toast = useToast();

  const [period, setPeriod] = useState('year');
  const [tab, setTab] = useState('design');

  // Rebuild whenever the period changes or either store commits (each
  // commit hands back a fresh object, so the refs are stable deps).
  const model = useMemo(() => buildTerritoryModel(period), [period, storeSnap, terrSnap]);
  const reps = getUsers().filter(u => u.role === 'rep');

  return (
    <div className="fade-up col gap-3">
      <SectionHeader
        title="Territories & Quota"
        sub="Design the books, plan capacity and quota, and track attainment against the real closed-won number."
        action={
          <Segmented
            options={[{ value: 'year', label: 'Fiscal year' }, { value: 'quarter', label: 'This quarter' }]}
            value={period}
            onChange={setPeriod}
          />
        }
      />

      {/* KPI rail */}
      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <StatCard label="Territories" value={model.territories.length} icon={<Icon name="target" size={18} />} sub={`${reps.length} reps carrying quota`} />
        <StatCard label="Team attainment" value={model.totals.teamAttainment} format={(v) => Math.round(v) + '%'} icon={<Icon name="trendUp" size={18} />} accent="var(--ok)" sparkColor="var(--ok)" sub={`won vs ${model.range.label} quota`} />
        <StatCard label="Coverage" value={model.coverage.pct} format={(v) => Math.round(v) + '%'} icon={<Icon name="shield" size={18} />} accent="#0ea5a3" sparkColor="#0ea5a3" sub={`${model.coverage.uncovered} accounts in white space`} />
        <StatCard label="Balance score" value={model.balanceScore} icon={<Icon name="sliders" size={18} />} accent={model.balanceScore >= 80 ? 'var(--ok)' : model.balanceScore >= 55 ? 'var(--accent)' : 'var(--warn)'} sub="accounts-per-rep fairness" />
      </div>

      <Tabs
        tabs={[
          { key: 'design', label: 'Design', count: model.territories.length },
          { key: 'attainment', label: 'Quota & attainment' },
          { key: 'capacity', label: 'Capacity & ramp' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'design' && (
        <div className="col gap-3">
          <BalanceScore model={model} onApplied={(sug) => toast(sug.type === 'move_rep' ? `Moved ${sug.repName} to ${sug.toName}` : 'Applied')} />
          <TerritoryTable model={model} reps={reps} />
        </div>
      )}

      {tab === 'attainment' && (
        <div className="col gap-3">
          <QuotaAttainment model={model} />
          <AttainmentBars model={model} />
        </div>
      )}

      {tab === 'capacity' && <CapacityPlanner model={model} />}
    </div>
  );
}
