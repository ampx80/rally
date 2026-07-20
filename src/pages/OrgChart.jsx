// OrgChart - "Org & Command". Three tabs:
//  1) Org chart: a color-ranked, drag-and-drop reporting tree (rank = seniority
//     spine purple->green, plus off-spine support/analyst colors). Drag a person
//     onto another to change their reporting line; cycles are blocked.
//  2) Views: persona-scoped dashboards (Executive/Admin/Manager/Support/Analyst).
//     Limited by default so an exec does not drown in everything - one toggle
//     expands to the full system.
//  3) Guide: a management assistant that walks leaders through their org and
//     hands the deep work to Rook.
// Rank color is never the only signal - every tier carries an icon + label.
// NO em-dash / en-dash. ASCII hyphen only.
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Badge, Button, Input, Select, EmptyState, useToast, Avatar, moneyK } from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import {
  RANKS, PERSONAS, rankById, personaById,
  useOrg, getPeople, childrenOf, rootPeople, rankCounts, setManager, setRank, updatePerson, addPerson, removePerson, setPersona, orgInsights,
} from '../lib/org.js';
import {
  useStore, pipelineValue, weightedForecast, winRate, wonThisMonth, openDeals, slippingDeals, repLeaderboard, getUsers,
} from '../lib/store.js';
import { enabledCount } from '../lib/modules.js';
import { openTickets } from '../lib/store-ext.js';

export default function OrgChart() {
  const [tab, setTab] = useState('chart');
  useOrg(); useStore();

  return (
    <div className="fade-up org-fx">
      <div className="org-hero">
        <div className="org-hero-glow" aria-hidden />
        <div className="org-eyebrow"><span className="org-live" /> People operating system</div>
        <h1 className="org-title">Org <span className="org-grad">and Command</span></h1>
        <p className="org-sub">Build the org chart by dragging people into their reporting line. Colors rank seniority at a glance. Then give every role the view they actually need - executives see the rollup, admins see the system, and anyone can expand to the whole platform.</p>
        <div className="org-tabs">
          {[['chart', 'Org chart', 'users'], ['views', 'Views', 'target'], ['guide', 'Guide', 'sparkles']].map(([k, label, icon]) => (
            <button key={k} className={`org-tab ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}><Icon name={icon} size={15} /> {label}</button>
          ))}
        </div>
      </div>

      <div className="org-panel">
        {tab === 'chart' && <ChartTab />}
        {tab === 'views' && <ViewsTab />}
        {tab === 'guide' && <GuideTab />}
      </div>

      <OrgStyles />
    </div>
  );
}

/* ---------------- Org chart tab ---------------- */
function ChartTab() {
  const people = useOrg((s) => s.people);
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  const [adding, setAdding] = useState(false);
  const toast = useToast();
  const counts = rankCounts();
  const roots = rootPeople();

  const reparent = (id, managerId) => {
    if (id === managerId) return;
    const ok = setManager(id, managerId);
    toast(ok ? 'Reporting line updated' : 'That would create a loop', ok ? 'ok' : 'warn');
  };

  return (
    <div className="col gap-3">
      <div className="row between wrap" style={{ alignItems: 'center', gap: '.75rem' }}>
        <div className="org-legend">
          {RANKS.map(r => counts[r.id] ? (
            <span key={r.id} className="org-leg" style={{ '--c': r.color }}>
              <span className="org-leg-dot" /><Icon name={r.icon} size={12} /> {r.label} <b>{counts[r.id]}</b>
            </span>
          ) : null)}
        </div>
        <Button size="sm" onClick={() => setAdding(true)}><Icon name="plus" size={15} /> Add person</Button>
      </div>

      <div
        className={`org-root-drop ${overId === '__root__' ? 'over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setOverId('__root__'); }}
        onDragLeave={() => setOverId(o => o === '__root__' ? null : o)}
        onDrop={() => { if (dragId) reparent(dragId, null); setDragId(null); setOverId(null); }}
      >
        <Icon name="target" size={13} /> Drop here to make someone top-level
      </div>

      <div className="org-tree">
        {roots.map(p => (
          <TreeNode key={p.id} person={p} depth={0} dragId={dragId} overId={overId}
            setDragId={setDragId} setOverId={setOverId} reparent={reparent} />
        ))}
      </div>

      {adding && <AddModal onClose={() => setAdding(false)} onAdd={(d) => { addPerson(d); toast('Added to the org'); setAdding(false); }} />}
    </div>
  );
}

function TreeNode({ person, depth, dragId, overId, setDragId, setOverId, reparent }) {
  const [open, setOpen] = useState(true);
  const toast = useToast();
  const kids = childrenOf(person.id);
  const r = rankById(person.rankId);
  const isOver = overId === person.id;
  const isDragging = dragId === person.id;

  return (
    <div className="org-branch" style={{ '--c': r.color }}>
      <div
        className={`org-node ${isOver ? 'over' : ''} ${isDragging ? 'dragging' : ''}`}
        draggable
        onDragStart={() => setDragId(person.id)}
        onDragEnd={() => { setDragId(null); setOverId(null); }}
        onDragOver={(e) => { e.preventDefault(); if (dragId && dragId !== person.id) setOverId(person.id); }}
        onDragLeave={() => setOverId(o => o === person.id ? null : o)}
        onDrop={() => { if (dragId && dragId !== person.id) reparent(dragId, person.id); setDragId(null); setOverId(null); }}
      >
        <span className="org-grip" title="Drag to reassign"><Icon name="menu" size={14} /></span>
        {kids.length > 0 ? (
          <button className="org-toggle" onClick={() => setOpen(o => !o)} aria-label={open ? 'Collapse' : 'Expand'}>
            <Icon name={open ? 'chevronDown' : 'chevronRight'} size={15} />
          </button>
        ) : <span className="org-toggle-spacer" />}
        <span className="org-rank-ic" style={{ background: r.color }}><Icon name={r.icon} size={14} /></span>
        <Avatar name={person.name} size={34} />
        <div className="col" style={{ minWidth: 0, flex: 1, gap: 1 }}>
          <div className="row gap-2" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="org-name">{person.name}</span>
            <span className="org-rank-badge" style={{ '--c': r.color }}>{r.label}</span>
            {kids.length > 0 && <span className="org-span">{kids.length} direct</span>}
          </div>
          <div className="org-title-txt">{person.title || 'No title'}</div>
        </div>
        <div className="org-node-actions">
          <Select value={person.rankId} onChange={e => { setRank(person.id, e.target.value); toast('Rank updated'); }} title="Change rank" className="org-rank-select">
            {RANKS.map(rk => <option key={rk.id} value={rk.id}>{rk.label}</option>)}
          </Select>
          <button className="org-x" title="Remove" onClick={() => { if (window.confirm(`Remove ${person.name}? Their reports move up a level.`)) { removePerson(person.id); toast('Removed'); } }}><Icon name="trash" size={14} /></button>
        </div>
      </div>
      {open && kids.length > 0 && (
        <div className="org-children">
          {kids.map(k => (
            <TreeNode key={k.id} person={k} depth={depth + 1} dragId={dragId} overId={overId}
              setDragId={setDragId} setOverId={setOverId} reparent={reparent} />
          ))}
        </div>
      )}
    </div>
  );
}

function AddModal({ onClose, onAdd }) {
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [rankId, setRankId] = useState('ic');
  const people = getPeople();
  const [managerId, setManagerId] = useState(people[0]?.id || null);
  return (
    <div className="org-modal" onClick={(e) => { if (e.target.classList.contains('org-modal')) onClose(); }}>
      <div className="org-modal-card">
        <div className="row between" style={{ alignItems: 'center', marginBottom: '.8rem' }}>
          <span className="fw-6" style={{ color: 'var(--ink)' }}>Add someone to the org</span>
          <button className="org-x" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <div className="col gap-2">
          <label className="org-field"><span>Name</span><Input value={name} onChange={e => setName(e.target.value)} placeholder="Alex Morgan" autoFocus /></label>
          <label className="org-field"><span>Title</span><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Account Executive" /></label>
          <label className="org-field"><span>Rank</span>
            <Select value={rankId} onChange={e => setRankId(e.target.value)}>{RANKS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}</Select>
          </label>
          <label className="org-field"><span>Reports to</span>
            <Select value={managerId || ''} onChange={e => setManagerId(e.target.value || null)}>
              <option value="">Top level (no manager)</option>
              {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </label>
          <Button onClick={() => onAdd({ name, title, rankId, managerId })} disabled={!name.trim()}><Icon name="plus" size={15} /> Add to org</Button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Views tab ---------------- */
function ViewsTab() {
  const persona = useOrg((s) => s.persona);
  const [full, setFull] = useState(false);
  const nav = useNavigate();
  const toast = useToast();
  const p = personaById(persona);

  const kpi = buildKpis();
  const tiles = (full ? Object.keys(kpi) : p.kpis).map(k => ({ key: k, ...kpi[k] })).filter(t => t.label);

  return (
    <div className="col gap-3">
      <div className="org-persona-row">
        {PERSONAS.map(pp => (
          <button key={pp.id} className={`org-persona ${persona === pp.id ? 'on' : ''}`} style={{ '--c': pp.color }} onClick={() => { setPersona(pp.id); toast(`${pp.label} view`); }}>
            <span className="org-persona-ic"><Icon name={pp.icon} size={16} /></span>
            <span>{pp.label}</span>
          </button>
        ))}
      </div>

      <Card className="org-view-head" style={{ '--c': p.color }}>
        <div className="row between wrap" style={{ alignItems: 'center', gap: '.6rem' }}>
          <div>
            <div className="row gap-2" style={{ alignItems: 'center' }}>
              <span className="org-view-ic" style={{ background: p.color }}><Icon name={p.icon} size={18} /></span>
              <span className="fw-7" style={{ fontSize: '1.15rem', color: 'var(--ink)' }}>{p.label} view</span>
            </div>
            <div className="t-sm muted" style={{ marginTop: 4 }}>{p.tagline}</div>
          </div>
          <button className={`org-fulltoggle ${full ? 'on' : ''}`} onClick={() => setFull(f => !f)}>
            <Icon name={full ? 'checkSquare' : 'shield'} size={15} /> {full ? 'Full system on' : 'See everything'}
          </button>
        </div>
      </Card>

      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '.75rem' }}>
        {tiles.map((t, i) => (
          <div key={t.key} className="org-kpi" style={{ '--c': p.color, animationDelay: `${i * 55}ms` }}>
            <div className="org-kpi-v">{t.fmt ? t.fmt(t.value) : t.value}</div>
            <div className="org-kpi-l">{t.label}</div>
          </div>
        ))}
      </div>

      <Card>
        <div className="fw-6" style={{ color: 'var(--ink)', marginBottom: '.5rem' }}>{full ? 'Every module is open to you' : `What ${p.label.toLowerCase()}s jump to`}</div>
        <div className="row gap-2 wrap">
          {p.modules.map(([to, label]) => (
            <button key={to} className="org-modlink" onClick={() => nav(to)}>{label} <Icon name="chevronRight" size={13} /></button>
          ))}
        </div>
        {!full && <div className="org-hidden"><Icon name="lock" size={13} /> Hidden by default: {p.hide} Flip <b>See everything</b> to unlock the full platform.</div>}
        {full && <div className="org-hidden ok"><Icon name="checkSquare" size={13} /> Full system unlocked. Every module in the left nav is available - the curated view is just the fast path.</div>}
      </Card>
    </div>
  );
}

function buildKpis() {
  const num = (fn, d = 0) => { try { return fn(); } catch { return d; } };
  const tix = num(() => openTickets(), []);
  // wonThisMonth may return a number or an object ({ value/sum/total }); coerce.
  let wonVal = 0;
  try { const w = wonThisMonth(); wonVal = typeof w === 'number' ? w : (w && (w.value ?? w.sum ?? w.total ?? w.amount)) || 0; } catch {}
  return {
    pipeline: { label: 'Pipeline', value: num(pipelineValue), fmt: moneyK },
    forecast: { label: 'Weighted forecast', value: num(weightedForecast), fmt: moneyK },
    teamPipeline: { label: 'Team pipeline', value: num(pipelineValue), fmt: moneyK },
    wonMonth: { label: 'Won this month', value: wonVal, fmt: moneyK },
    winRate: { label: 'Win rate', value: Math.round(num(winRate)), fmt: (n) => `${n}%` },
    openDeals: { label: 'Open deals', value: num(() => openDeals().length) },
    slipping: { label: 'Slipping', value: num(() => slippingDeals().length) },
    people: { label: 'People', value: getPeople().length },
    modulesOn: { label: 'Modules on', value: num(enabledCount) },
    openTickets: { label: 'Open tickets', value: Array.isArray(tix) ? tix.length : 0 },
    urgent: { label: 'Urgent', value: Array.isArray(tix) ? tix.filter(t => t.priority === 'urgent' || t.priority === 'high').length : 0 },
    csat: { label: 'CSAT', value: 94, fmt: (n) => `${n}%` },
    solved: { label: 'Solved rate', value: 88, fmt: (n) => `${n}%` },
    health: { label: 'Data health', value: 97, fmt: (n) => `${n}%` },
  };
}

/* ---------------- Guide (management assistant) ---------------- */
function GuideTab() {
  const persona = useOrg((s) => s.persona);
  useStore();
  const p = personaById(persona);
  const insights = orgInsights({ repLeaderboard: safe(() => repLeaderboard(), []), slipping: safe(() => slippingDeals().length, 0) });
  const toneColor = { exec: '#7c3aed', warn: '#b45309', ok: '#047857', info: '#1d4ed8' };

  const askRook = (prompt) => {
    try { window.dispatchEvent(new CustomEvent('rally:rook', { detail: { open: true, prompt } })); } catch {}
  };

  return (
    <div className="col gap-3">
      <Card className="org-atlas">
        <div className="org-atlas-orb" style={{ '--c': p.color }}><Icon name="sparkles" size={22} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="fw-7" style={{ fontSize: '1.1rem', color: 'var(--ink)' }}>Atlas, your management guide</div>
          <div className="t-sm muted" style={{ marginTop: 3 }}>I read your org and your numbers so you do not have to dig. Here is what stands out for the <b style={{ color: p.color }}>{p.label.toLowerCase()}</b> lens. When you want to act, I hand it to Rook.</div>
          <div className="row gap-2 wrap" style={{ marginTop: '.8rem' }}>
            <Button size="sm" onClick={() => askRook('Walk me through my team, who is behind pace, and where I should coach this week.')}><Icon name="sparkles" size={15} /> Ask Rook about my team</Button>
            <Button size="sm" variant="ghost" onClick={() => askRook('Draft a short agenda for a pipeline review with the reps who are behind quota.')}><Icon name="fileText" size={15} /> Draft a coaching agenda</Button>
          </div>
        </div>
      </Card>

      <div className="col gap-2">
        {insights.map((it, i) => (
          <div key={i} className="org-insight" style={{ '--c': toneColor[it.tone] || '#1d4ed8', animationDelay: `${i * 60}ms` }}>
            <span className="org-insight-ic"><Icon name={it.icon} size={16} /></span>
            <div>
              <div className="fw-6" style={{ color: 'var(--ink)' }}>{it.title}</div>
              <div className="t-sm muted" style={{ marginTop: 2 }}>{it.body}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
function safe(fn, d) { try { return fn(); } catch { return d; } }

/* ---------------- styles ---------------- */
function OrgStyles() {
  return (
    <style>{`
    .org-fx { position: relative; }
    .org-hero { position: relative; overflow: hidden; border-radius: 20px; padding: 26px 28px 20px; margin-bottom: 1.1rem;
      background: linear-gradient(135deg, #14102b, #0d1424 55%, #0a1a1e); border: 1px solid rgba(124,92,247,.25); color: #eaf0ff; }
    .org-hero-glow { position: absolute; inset: 0; pointer-events: none;
      background: radial-gradient(700px 400px at 82% -20%, rgba(124,58,237,.35), transparent 60%), radial-gradient(600px 400px at 0% 120%, rgba(4,120,87,.28), transparent 60%); }
    .org-eyebrow { position: relative; display: inline-flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 800; letter-spacing: .15em; text-transform: uppercase; color: #c4b5fd; }
    .org-live { width: 8px; height: 8px; border-radius: 50%; background: #a78bfa; box-shadow: 0 0 0 0 rgba(167,139,250,.6); animation: orgPulse 1.8s ease-out infinite; }
    @keyframes orgPulse { 0% { box-shadow: 0 0 0 0 rgba(167,139,250,.6); } 70% { box-shadow: 0 0 0 9px rgba(167,139,250,0); } 100% { box-shadow: 0 0 0 0 rgba(167,139,250,0); } }
    .org-title { position: relative; margin: 10px 0 6px; font-size: clamp(26px,4.5vw,40px); font-weight: 900; letter-spacing: -.02em; font-family: var(--font-display,'Space Grotesk',sans-serif); }
    .org-grad { background: linear-gradient(100deg, #a78bfa, #60a5fa 55%, #34d399); -webkit-background-clip: text; background-clip: text; color: transparent; background-size: 200% auto; animation: orgShift 6s linear infinite; }
    @keyframes orgShift { to { background-position: 200% center; } }
    .org-sub { position: relative; max-width: 760px; font-size: 14.5px; line-height: 1.6; color: #b9c2de; margin: 0; }
    .org-tabs { position: relative; display: flex; gap: 6px; flex-wrap: wrap; margin-top: 18px; padding: 5px; border-radius: 12px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.09); width: fit-content; }
    .org-tab { display: inline-flex; align-items: center; gap: 7px; font-family: inherit; font-size: 13.5px; font-weight: 700; color: #aab4d4; background: transparent; border: none; border-radius: 9px; padding: 8px 15px; cursor: pointer; transition: all .2s; }
    .org-tab:hover { color: #fff; }
    .org-tab.on { color: #0a0e1c; background: linear-gradient(100deg,#a78bfa,#818cf8); box-shadow: 0 10px 26px -12px rgba(129,140,248,.8); }
    .org-panel { animation: orgFade .4s ease both; }
    @keyframes orgFade { 0% { opacity: 0; transform: translateY(8px); } 100% { opacity: 1; transform: none; } }

    /* legend */
    .org-legend { display: flex; flex-wrap: wrap; gap: 8px; }
    .org-leg { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: var(--ink-2); border: 1px solid var(--line); border-radius: 999px; padding: 4px 11px; }
    .org-leg svg { color: var(--c); }
    .org-leg b { color: var(--c); }
    .org-leg-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--c); box-shadow: 0 0 8px var(--c); }

    /* root dropzone */
    .org-root-drop { display: flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 600; color: var(--muted); border: 1.5px dashed var(--line-strong,#d0d6de); border-radius: 12px; padding: 10px 14px; transition: all .18s; }
    .org-root-drop.over { border-color: var(--accent); color: var(--accent); background: var(--accent-50,#e6f7f5); }
    .org-root-drop svg { color: var(--accent); }

    /* tree */
    .org-tree { display: flex; flex-direction: column; gap: 8px; }
    .org-branch { position: relative; }
    .org-children { margin-left: 26px; padding-left: 16px; border-left: 2px solid var(--line); display: flex; flex-direction: column; gap: 8px; margin-top: 8px; position: relative; }
    .org-node { position: relative; display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 13px;
      background: var(--paper); border: 1px solid var(--line); border-left: 4px solid var(--c);
      transition: transform .16s, box-shadow .16s, border-color .16s; cursor: grab; animation: orgNodeIn .4s cubic-bezier(.22,1,.36,1) both; }
    @keyframes orgNodeIn { 0% { opacity: 0; transform: translateX(-8px); } 100% { opacity: 1; transform: none; } }
    .org-node:hover { transform: translateY(-1px); box-shadow: 0 16px 40px -26px var(--c); }
    .org-node.over { border-color: var(--c); box-shadow: 0 0 0 2px var(--c), 0 18px 40px -22px var(--c); }
    .org-node.dragging { opacity: .5; }
    .org-grip { color: var(--muted); display: inline-flex; cursor: grab; flex: none; }
    .org-toggle { background: none; border: none; color: var(--muted); cursor: pointer; padding: 0; display: inline-flex; flex: none; }
    .org-toggle-spacer { width: 15px; flex: none; }
    .org-rank-ic { width: 28px; height: 28px; flex: none; border-radius: 8px; display: grid; place-items: center; color: #fff; box-shadow: 0 4px 12px -4px var(--c); }
    .org-name { font-weight: 700; color: var(--ink); }
    .org-rank-badge { font-size: 11px; font-weight: 800; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 34%, transparent); border-radius: 999px; padding: 1px 9px; }
    .org-span { font-size: 11px; color: var(--muted); background: var(--page); border-radius: 999px; padding: 1px 8px; }
    .org-title-txt { font-size: 12.5px; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .org-node-actions { display: flex; align-items: center; gap: 6px; flex: none; }
    .org-rank-select { font-size: 12px; padding: 5px 8px; max-width: 140px; }
    .org-x { background: none; border: none; color: var(--muted); cursor: pointer; padding: 5px; border-radius: 7px; display: inline-flex; }
    .org-x:hover { color: var(--risk); background: rgba(192,57,43,.08); }

    /* add modal */
    .org-modal { position: fixed; inset: 0; z-index: 90; display: grid; place-items: center; padding: 20px; background: rgba(6,10,20,.6); backdrop-filter: blur(5px); }
    .org-modal-card { width: 100%; max-width: 440px; background: var(--paper); border: 1px solid var(--line); border-radius: 18px; padding: 20px; box-shadow: 0 30px 80px -30px rgba(0,0,0,.5); }
    .org-field { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 700; color: var(--ink); }

    /* views: persona chips */
    .org-persona-row { display: flex; flex-wrap: wrap; gap: 8px; }
    .org-persona { display: inline-flex; align-items: center; gap: 8px; font-family: inherit; font-size: 13.5px; font-weight: 700; color: var(--ink-2); background: var(--paper); border: 1px solid var(--line); border-radius: 12px; padding: 9px 14px; cursor: pointer; transition: all .18s; }
    .org-persona:hover { border-color: var(--c); color: var(--ink); }
    .org-persona.on { color: #fff; background: var(--c); border-color: var(--c); box-shadow: 0 14px 30px -14px var(--c); }
    .org-persona-ic { display: inline-grid; place-items: center; }
    .org-view-head { border-left: 4px solid var(--c) !important; }
    .org-view-ic { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; color: #fff; }
    .org-fulltoggle { display: inline-flex; align-items: center; gap: 7px; font-family: inherit; font-size: 13px; font-weight: 700; color: var(--ink-2); background: var(--page); border: 1px solid var(--line); border-radius: 10px; padding: 8px 14px; cursor: pointer; transition: all .18s; }
    .org-fulltoggle.on { color: #fff; background: linear-gradient(100deg,#7c3aed,#4338ca); border-color: transparent; box-shadow: 0 12px 28px -14px rgba(124,58,237,.7); }
    .org-kpi { position: relative; overflow: hidden; border-radius: 14px; padding: 15px 16px; background: var(--paper); border: 1px solid var(--line); border-top: 3px solid var(--c); animation: orgKpiIn .5s cubic-bezier(.22,1,.36,1) both; transition: transform .2s, box-shadow .2s; }
    @keyframes orgKpiIn { 0% { opacity: 0; transform: translateY(12px); } 100% { opacity: 1; transform: none; } }
    .org-kpi:hover { transform: translateY(-3px); box-shadow: 0 20px 44px -26px var(--c); }
    .org-kpi-v { font-size: 26px; font-weight: 900; letter-spacing: -.02em; color: var(--ink); font-family: var(--font-display,'Space Grotesk',sans-serif); }
    .org-kpi-l { font-size: 12px; color: var(--muted); margin-top: 3px; font-weight: 600; }
    .org-modlink { display: inline-flex; align-items: center; gap: 5px; font-family: inherit; font-size: 13px; font-weight: 700; color: var(--accent); background: var(--accent-50,#e6f7f5); border: 1px solid color-mix(in srgb, var(--accent) 28%, transparent); border-radius: 9px; padding: 7px 12px; cursor: pointer; transition: all .16s; }
    .org-modlink:hover { transform: translateY(-1px); box-shadow: 0 10px 22px -12px var(--accent); }
    .org-hidden { display: flex; align-items: center; gap: 7px; font-size: 12.5px; color: var(--muted); margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--line); }
    .org-hidden svg { color: var(--muted); flex: none; }
    .org-hidden.ok { color: var(--ok); } .org-hidden.ok svg { color: var(--ok); }

    /* guide */
    .org-atlas { display: flex; align-items: flex-start; gap: 14px; }
    .org-atlas-orb { width: 46px; height: 46px; flex: none; border-radius: 13px; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, var(--c), color-mix(in srgb, var(--c) 55%, #000)); box-shadow: 0 12px 30px -12px var(--c); animation: orgFloat 5s ease-in-out infinite; }
    @keyframes orgFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
    .org-insight { display: flex; align-items: flex-start; gap: 12px; padding: 13px 15px; border-radius: 13px; background: var(--paper); border: 1px solid var(--line); border-left: 4px solid var(--c); animation: orgKpiIn .45s cubic-bezier(.22,1,.36,1) both; }
    .org-insight-ic { width: 30px; height: 30px; flex: none; border-radius: 9px; display: grid; place-items: center; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); }

    @media (prefers-reduced-motion: reduce) {
      .org-live, .org-grad, .org-panel, .org-node, .org-kpi, .org-insight, .org-atlas-orb { animation: none !important; }
    }
    `}</style>
  );
}
