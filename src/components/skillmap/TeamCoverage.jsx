// Manager lens for the Skill Map: a team coverage heatmap. Rows are team
// members (from the store), columns are the nine skill areas. Each cell is
// that member's coverage in that area, heat-coloured so gaps jump out. Click a
// cell to drill into exactly which skills that member has (and has not) got.
// The idea: replace the weekly status meeting with one look at the map.
import React, { useMemo, useState } from 'react';
import { Icon } from '../icons.jsx';
import { Avatar, Ring, Badge } from '../UI.jsx';
import { useStore } from '../../lib/store.js';
import {
  AREAS, LEVELS, skillsForArea, areaColor,
  teamCoverage, teamAreaAverages,
} from '../../lib/skill-graph.js';

// pct -> light heat background (red gap through amber to green strength).
function heatStyle(pct) {
  const hue = Math.round((pct / 100) * 125);
  return { background: `hsl(${hue} 66% 88%)`, color: '#182338' };
}

export default function TeamCoverage({ version, currentUserId }) {
  // Subscribe to the CRM store so the heatmap recomputes live when signal
  // sources change (deals, contacts, companies, activities), not only when a
  // practice mark fires. The `version` prop already folds in a store + practice
  // signature; the store snapshot in the deps is the belt-and-suspenders read.
  const store = useStore();
  const storeSig = useMemo(() => JSON.stringify([
    store.deals.map(d => `${d.stage || ''}:${d.status || ''}:${d.ownerId || ''}`),
    store.contacts.length, store.companies.length, store.activities.length,
  ]), [store]);
  const rows = useMemo(() => teamCoverage(), [version, storeSig]);
  const averages = useMemo(() => teamAreaAverages(rows), [rows]);
  const [cell, setCell] = useState(null); // { userId, areaId }

  const gapAreaId = useMemo(() => {
    let min = null;
    for (const a of AREAS) if (min === null || averages[a.id] < averages[min]) min = a.id;
    return min;
  }, [averages]);

  const drill = useMemo(() => {
    if (!cell) return null;
    const row = rows.find(r => r.user.id === cell.userId);
    if (!row) return null;
    const skills = skillsForArea(cell.areaId);
    return { row, area: AREAS.find(a => a.id === cell.areaId), skills };
  }, [cell, rows]);

  return (
    <div className="col gap-3 fx-scene">
      <div className="card card-pad fx-glass fx-rise">
        <div className="row between wrap" style={{ gap: '.75rem', marginBottom: '.9rem' }}>
          <div className="col gap-1" style={{ minWidth: 0 }}>
            <div className="eyebrow">Manager lens</div>
            <h3 style={{ margin: 0 }}>Team skill coverage</h3>
            <div className="muted t-sm">Rows are teammates, columns are areas. Darker red is a coverage gap. Click any cell to see the skills behind it.</div>
          </div>
          {gapAreaId && (
            <Badge tone="risk">
              <Icon name="target" size={13} /> Biggest gap: {AREAS.find(a => a.id === gapAreaId)?.label} ({averages[gapAreaId]}%)
            </Badge>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="sm-heat">
            <thead>
              <tr>
                <th className="sm-heat__rowhead">Teammate</th>
                {AREAS.map(a => (
                  <th key={a.id} title={a.label}>
                    <span className="col center gap-1" style={{ color: a.color }}>
                      <Icon name={a.icon} size={15} />
                      <span style={{ color: 'var(--n-600)' }}>{a.label.split('/')[0]}</span>
                    </span>
                  </th>
                ))}
                <th title="Overall mastery">Overall</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.user.id}>
                  <td className="sm-heat__rowhead">
                    <div className="row gap-2" style={{ alignItems: 'center' }}>
                      <Avatar name={row.user.name} size={30} />
                      <div className="col" style={{ lineHeight: 1.15, minWidth: 0 }}>
                        <span className="clip" style={{ fontWeight: 700 }}>
                          {row.user.name}{row.user.id === currentUserId ? ' (you)' : ''}
                        </span>
                        <span className="t-xs muted clip">{row.user.role === 'manager' ? 'Manager' : row.user.title}</span>
                      </div>
                    </div>
                  </td>
                  {AREAS.map(a => {
                    const pct = row.areas[a.id]?.pct || 0;
                    const active = cell && cell.userId === row.user.id && cell.areaId === a.id;
                    return (
                      <td key={a.id}>
                        <button type="button"
                          className={`sm-heat__cell${active ? ' is-active' : ''}`}
                          style={heatStyle(pct)}
                          title={`${row.user.name} - ${a.label}: ${pct}%`}
                          onClick={() => setCell(active ? null : { userId: row.user.id, areaId: a.id })}>
                          {pct}
                        </button>
                      </td>
                    );
                  })}
                  <td>
                    <div className="row center"><Ring value={row.overall} size={40} stroke={5} label={`${row.overall}`} /></div>
                  </td>
                </tr>
              ))}
              <tr className="sm-heat__avg">
                <td className="sm-heat__rowhead"><span style={{ fontWeight: 800 }}>Team average</span></td>
                {AREAS.map(a => (
                  <td key={a.id}>
                    <div className={`sm-heat__cell${a.id === gapAreaId ? ' sm-heat__gap' : ''}`} style={{ ...heatStyle(averages[a.id]), cursor: 'default' }}>
                      {averages[a.id]}
                    </div>
                  </td>
                ))}
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {drill && (
        <div className="card card-pad fx-glass fx-rise">
          <div className="row gap-2" style={{ alignItems: 'center', marginBottom: '.75rem' }}>
            <span className="sm-lvl-dot" style={{ width: 12, height: 12, background: areaColor(drill.area.id) }} />
            <h4 style={{ margin: 0 }}>{drill.row.user.name} on {drill.area.label}</h4>
            <span className="spacer" />
            <Badge tone="default">{drill.row.areas[drill.area.id]?.pct || 0}% covered</Badge>
          </div>
          <div className="sm-summary" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
            {drill.skills.map(s => {
              const lvl = drill.row.state[s.id]?.level || 'locked';
              return (
                <div key={s.id} className="row gap-2" style={{ alignItems: 'center', padding: '.5rem .65rem', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)' }}>
                  <span className="sm-lvl-dot" style={{ background: LEVELS[lvl].color }} />
                  <span className="clip" style={{ fontWeight: 600 }}>{s.label}</span>
                  <span className="spacer" />
                  <span className="t-xs muted">{LEVELS[lvl].label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
