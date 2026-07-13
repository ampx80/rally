// ============================================================
// JOURNEYS  (marketing) - customer journey orchestration.
//
// The visual journey builder: a scrollable canvas of draggable
// nodes wired by SVG connectors (Entry -> Wait -> If/Else ->
// Actions: email, SMS, campaign, task, lifecycle, notify, list,
// and Rook AI decision - the node no other platform has). Plus a
// journeys list with live status + conversion + revenue, per-node
// enrollment counts, a goal + exit banner, a template gallery, and
// a test run that animates one contact flowing through.
//
// 100% local-first and deterministic (src/lib/journeys-data.js).
// Additive: no existing file is modified. NO em-dash / en-dash.
// ============================================================
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button, Card, Badge, PageTitle, SectionHeader, Field, Input, Select, Textarea,
  Modal, EmptyState, Segmented, StatCard, Sparkline, ProgressBar, useToast,
  money, moneyK, relTime,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import {
  useJourneys, getJourneys, getJourney, fleetStats, journeyTrend,
  simulateEnrollment, testRunPath, statusMeta, JOURNEY_STATUSES,
  NODE_LIBRARY, ADDABLE_TYPES, ENTRY_TRIGGERS, DELAY_UNITS, BRANCH_PROPS,
  LIST_ACTIONS, TEMPLATES, templateById, nodeSummary,
  NODE_W, NODE_H, ROW, COL,
  createJourney, createBlankJourney, setJourneyStatus, updateJourney,
  deleteJourney, duplicateJourney, updateNode, moveNode, addNode, deleteNode,
  askRook,
} from '../lib/journeys-data.js';
import { AUDIENCE_STAGES } from '../lib/marketing-engine.js';

const PAD = 48;

/* ============================================================
   PAGE
   ============================================================ */
export default function Journeys() {
  useJourneys();
  const toast = useToast();
  const journeys = getJourneys();
  const fleet = fleetStats();

  const [selectedId, setSelectedId] = useState(journeys[0]?.id || null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const selected = selectedId ? getJourney(selectedId) : null;

  // If the selected journey is deleted, fall back to the first available.
  useEffect(() => {
    if (selectedId && !getJourney(selectedId)) setSelectedId(getJourneys()[0]?.id || null);
  }, [journeys.length]); // eslint-disable-line

  return (
    <div className="fade-up">
      <PageTitle
        eyebrow="Marketing"
        title="Journeys"
        sub="Orchestrate every touch a customer feels - the flagship capability enterprises pick HubSpot and Salesforce for, with native Rook AI decision nodes no one else ships."
        action={
          <>
            <Button variant="ghost" size="sm" onClick={() => askRook('Audit my customer journeys. Which have the weakest conversion and what one change would lift each?') || toast('Rook is reviewing your journeys')}>
              <Icon name="sparkles" size={16} /> Ask Rook
            </Button>
            <Button variant="primary" size="sm" onClick={() => setGalleryOpen(true)}>
              <Icon name="plus" size={16} /> New journey
            </Button>
          </>
        }
      />

      {/* Fleet roll-up */}
      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '1.4rem' }}>
        <StatCard label="Live journeys" value={fleet.live} icon={<Icon name="funnel" size={18} />} sub={`${fleet.total} total built`} />
        <StatCard label="Contacts enrolled" value={fleet.enrolled} icon={<Icon name="users" size={18} />} accent="var(--accent-teal)" sub={`${fleet.active.toLocaleString()} active right now`} />
        <StatCard label="Avg conversion" value={fleet.conversion} format={(n) => `${n.toFixed(1)}%`} icon={<Icon name="target" size={18} />} accent="#a855f7" sub="Reached the goal" />
        <StatCard label="Revenue influenced" value={fleet.revenue} format={moneyK} icon={<Icon name="dollar" size={18} />} accent="#1a7f52" sub={`${fleet.completed.toLocaleString()} conversions`} />
      </div>

      <div className="jr-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) 1fr', gap: '1.15rem', alignItems: 'start' }}>
        <JourneyList journeys={journeys} selectedId={selectedId} onSelect={setSelectedId} onNew={() => setGalleryOpen(true)} />
        {selected
          ? <Builder key={selected.id} journey={selected} toast={toast} />
          : <Card className="col center" style={{ minHeight: 420 }}>
              <EmptyState icon="🧭" title="No journey selected" body="Pick a journey on the left, or start one from a proven template." action={<Button variant="primary" onClick={() => setGalleryOpen(true)}><Icon name="plus" size={16} /> New journey</Button>} />
            </Card>}
      </div>

      <TemplateGallery
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        onPick={(tplId) => {
          const tpl = templateById(tplId);
          const j = createJourney({ name: tpl.name, templateId: tplId });
          setSelectedId(j.id);
          setGalleryOpen(false);
          toast(`Started "${tpl.name}"`);
        }}
        onBlank={() => {
          const j = createBlankJourney({});
          setSelectedId(j.id);
          setGalleryOpen(false);
          toast('Blank journey created');
        }}
      />

      <style>{`
        @media (max-width: 900px) {
          .jr-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

/* ============================================================
   JOURNEY LIST (left rail)
   ============================================================ */
function JourneyList({ journeys, selectedId, onSelect, onNew }) {
  return (
    <Card pad={false} style={{ overflow: 'hidden' }}>
      <div className="row between" style={{ padding: '1rem 1.1rem', borderBottom: '1px solid var(--line)' }}>
        <div className="fw-7">All journeys</div>
        <Badge tone="accent">{journeys.length}</Badge>
      </div>
      <div className="col" style={{ maxHeight: 620, overflowY: 'auto' }}>
        {journeys.map(j => {
          const s = simulateEnrollment(j);
          const st = statusMeta(j.status);
          const on = j.id === selectedId;
          return (
            <button
              key={j.id}
              onClick={() => onSelect(j.id)}
              className="col gap-1"
              style={{
                textAlign: 'left', background: on ? 'var(--accent-50)' : 'transparent',
                border: 'none', borderLeft: `3px solid ${on ? 'var(--accent)' : 'transparent'}`,
                borderBottom: '1px solid var(--line)', padding: '.85rem 1.1rem', cursor: 'pointer',
              }}
            >
              <div className="row between" style={{ gap: '.5rem' }}>
                <span className="fw-7 clip" style={{ color: 'var(--ink)' }}>{j.name}</span>
                <Badge tone={st.tone}>{j.status === 'live' && <span className="dot" style={{ background: 'var(--ok)', animation: 'pulseDot 1.6s infinite' }} />}{st.label}</Badge>
              </div>
              <div className="row between" style={{ gap: '.5rem' }}>
                <span className="t-xs muted">{s.enrolled.toLocaleString()} enrolled - {s.conversion.toFixed(1)}% conv</span>
                <Sparkline data={journeyTrend(j)} w={70} h={22} color={on ? 'var(--accent)' : 'var(--n-400)'} />
              </div>
              <div className="t-xs" style={{ color: 'var(--ok)', fontWeight: 700 }}>{moneyK(s.revenue)} influenced</div>
            </button>
          );
        })}
        <button onClick={onNew} className="row gap-1 center" style={{ background: 'transparent', border: 'none', padding: '.9rem', cursor: 'pointer', color: 'var(--accent-600)', fontWeight: 700 }}>
          <Icon name="plus" size={16} /> New journey
        </button>
      </div>
    </Card>
  );
}

/* ============================================================
   BUILDER
   ============================================================ */
function Builder({ journey, toast }) {
  const sim = useMemo(() => simulateEnrollment(journey), [journey]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [addFor, setAddFor] = useState(null);       // { afterId, branch }
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Test run animation state.
  const [runStep, setRunStep] = useState(-1);
  const runPath = useMemo(() => testRunPath(journey), [journey]);
  const runTimer = useRef(null);
  useEffect(() => () => clearTimeout(runTimer.current), []);
  const startRun = () => {
    clearTimeout(runTimer.current);
    setSelectedNode(null);
    let i = 0;
    setRunStep(0);
    const tick = () => {
      i++;
      if (i >= runPath.length) { runTimer.current = setTimeout(() => setRunStep(-1), 1100); return; }
      setRunStep(i);
      runTimer.current = setTimeout(tick, 850);
    };
    runTimer.current = setTimeout(tick, 850);
  };
  const activeRunNode = runStep >= 0 ? runPath[runStep] : null;

  const st = statusMeta(journey.status);

  return (
    <Card pad={false} style={{ overflow: 'hidden' }}>
      {/* Toolbar */}
      <div className="row between wrap" style={{ gap: '.75rem', padding: '.9rem 1.1rem', borderBottom: '1px solid var(--line)' }}>
        <div className="col gap-1" style={{ minWidth: 0 }}>
          <input
            value={journey.name}
            onChange={(e) => updateJourney(journey.id, { name: e.target.value })}
            className="fw-8"
            style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', color: 'var(--ink)', padding: 0, maxWidth: '100%', letterSpacing: '-.02em' }}
            aria-label="Journey name"
          />
          <div className="t-xs muted">Updated {relTime(journey.updatedAt)} - {journey.nodes.length} steps</div>
        </div>
        <div className="row gap-1 wrap" style={{ flex: 'none' }}>
          <Segmented
            options={JOURNEY_STATUSES.map(s => ({ value: s.id, label: s.label }))}
            value={journey.status}
            onChange={(v) => { setJourneyStatus(journey.id, v); toast(`Journey ${v === 'live' ? 'is now live' : v}`); }}
          />
          <Button variant="ghost" size="sm" onClick={startRun} disabled={runStep >= 0}>
            <Icon name="play" size={15} /> {runStep >= 0 ? 'Running...' : 'Test run'}
          </Button>
          <Button variant="quiet" size="sm" onClick={() => { const c = duplicateJourney(journey.id); if (c) toast('Duplicated'); }} aria-label="Duplicate">
            <Icon name="copy" size={16} />
          </Button>
          <Button variant="quiet" size="sm" onClick={() => setConfirmDelete(true)} aria-label="Delete">
            <Icon name="trash" size={16} />
          </Button>
        </div>
      </div>

      {/* Goal + exit banner */}
      <GoalBanner journey={journey} sim={sim} />

      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        {/* Canvas */}
        <Canvas
          journey={journey}
          sim={sim}
          selectedNodeId={selectedNode?.id}
          activeRunNode={activeRunNode}
          onSelectNode={(n) => { setSelectedNode(n); }}
          onAdd={(afterId, branch) => setAddFor({ afterId, branch })}
        />
        {/* Config drawer */}
        {selectedNode && (
          <NodeConfig
            journey={journey}
            node={journey.nodes.find(n => n.id === selectedNode.id) || selectedNode}
            sitting={sim.perNode[selectedNode.id]?.sitting || 0}
            live={journey.status === 'live'}
            onClose={() => setSelectedNode(null)}
            onDelete={() => { deleteNode(journey.id, selectedNode.id); setSelectedNode(null); toast('Step removed'); }}
            toast={toast}
          />
        )}
      </div>

      {/* Add-step picker */}
      <AddStepModal
        open={!!addFor}
        onClose={() => setAddFor(null)}
        branch={addFor?.branch}
        onPick={(type) => {
          const n = addNode(journey.id, addFor.afterId, type, { branch: addFor.branch });
          setAddFor(null);
          if (n) { setSelectedNode(n); toast(`${NODE_LIBRARY[type].label} added`); }
        }}
      />

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete journey?"
        width={420}
        footer={<>
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <Button variant="danger" onClick={() => { deleteJourney(journey.id); setConfirmDelete(false); toast('Journey deleted'); }}>Delete</Button>
        </>}
      >
        <p style={{ margin: 0 }}>This removes <strong>{journey.name}</strong> and its {journey.nodes.length} steps. Enrollment history is cleared. This cannot be undone.</p>
      </Modal>
    </Card>
  );
}

/* ---------- goal + exit banner ---------- */
function GoalBanner({ journey, sim }) {
  return (
    <div className="row between wrap" style={{ gap: '1rem', padding: '.85rem 1.1rem', background: 'var(--n-25)', borderBottom: '1px solid var(--line)' }}>
      <div className="row gap-2 wrap" style={{ minWidth: 0 }}>
        <div className="row gap-1" style={{ color: 'var(--accent-600)' }}>
          <Icon name="flag" size={16} />
          <span className="fw-7 t-sm" style={{ color: 'var(--ink)' }}>Goal: {journey.goal?.label || 'Goal reached'}</span>
        </div>
        <span className="t-xs muted">Exit when: {(journey.exit || []).join(' - ') || 'goal reached'}</span>
      </div>
      <div className="row gap-3" style={{ flex: 'none' }}>
        <div className="col" style={{ minWidth: 120 }}>
          <div className="row between" style={{ gap: '.5rem' }}>
            <span className="t-xs muted">Conversion</span>
            <span className="t-xs fw-7">{sim.conversion.toFixed(1)}%</span>
          </div>
          <ProgressBar value={sim.conversion} height={6} />
        </div>
        <div className="col" style={{ textAlign: 'right' }}>
          <span className="fw-8" style={{ fontSize: '1.05rem' }}>{sim.active.toLocaleString()}</span>
          <span className="t-xs muted">active now</span>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   CANVAS  (SVG connectors + draggable nodes)
   ============================================================ */
function Canvas({ journey, sim, selectedNodeId, activeRunNode, onSelectNode, onAdd }) {
  const scrollRef = useRef(null);
  const [drag, setDrag] = useState(null); // { id, grabDX, grabDY, x, y }

  const nodes = journey.nodes;
  const xs = nodes.map(n => n.x), ys = nodes.map(n => n.y);
  const minX = Math.min(0, ...xs), minY = Math.min(0, ...ys);
  const originX = PAD - minX, originY = PAD - minY;
  const canvasW = Math.max(NODE_W + PAD * 2, Math.max(...xs) + NODE_W - minX + PAD * 2);
  const canvasH = Math.max(NODE_H + PAD * 2, Math.max(...ys) + NODE_H - minY + PAD * 2);

  const posOf = (n) => {
    if (drag && drag.id === n.id) return { x: drag.x + originX, y: drag.y + originY };
    return { x: n.x + originX, y: n.y + originY };
  };

  const onPointerDown = (e, n) => {
    if (e.button != null && e.button !== 0) return;
    const rect = scrollRef.current.getBoundingClientRect();
    const rawX = e.clientX - rect.left + scrollRef.current.scrollLeft - originX;
    const rawY = e.clientY - rect.top + scrollRef.current.scrollTop - originY;
    setDrag({ id: n.id, grabDX: rawX - n.x, grabDY: rawY - n.y, x: n.x, y: n.y });
    try { e.target.setPointerCapture?.(e.pointerId); } catch {}
  };
  const onPointerMove = (e) => {
    if (!drag) return;
    const rect = scrollRef.current.getBoundingClientRect();
    const rawX = e.clientX - rect.left + scrollRef.current.scrollLeft - originX;
    const rawY = e.clientY - rect.top + scrollRef.current.scrollTop - originY;
    setDrag(d => d && ({ ...d, x: Math.round((rawX - d.grabDX) / 4) * 4, y: Math.round((rawY - d.grabDY) / 4) * 4 }));
  };
  const endDrag = () => {
    if (drag) { moveNode(journey.id, drag.id, drag.x, drag.y); }
    setDrag(null);
  };

  return (
    <div
      ref={scrollRef}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
      style={{
        position: 'relative', flex: 1, minWidth: 0, overflow: 'auto',
        maxHeight: 640, background: 'var(--n-25)',
        backgroundImage: 'radial-gradient(var(--line) 1px, transparent 1px)',
        backgroundSize: '22px 22px',
        touchAction: drag ? 'none' : 'auto',
      }}
    >
      <div style={{ position: 'relative', width: canvasW, height: canvasH }}>
        {/* Connectors */}
        <svg width={canvasW} height={canvasH} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <defs>
            <marker id="jr-arrow" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0 0 L6 3 L0 6 z" fill="var(--n-400)" />
            </marker>
            <marker id="jr-arrow-yes" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0 0 L6 3 L0 6 z" fill="#1a7f52" />
            </marker>
            <marker id="jr-arrow-no" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0 0 L6 3 L0 6 z" fill="#c0392b" />
            </marker>
          </defs>
          {journey.edges.map(e => {
            const from = nodes.find(n => n.id === e.from);
            const to = nodes.find(n => n.id === e.to);
            if (!from || !to) return null;
            const fp = posOf(from), tp = posOf(to);
            const sx = fp.x + NODE_W / 2, sy = fp.y + NODE_H;
            const tx = tp.x + NODE_W / 2, ty = tp.y;
            const midY = (sy + ty) / 2;
            const path = `M ${sx} ${sy} C ${sx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`;
            const color = e.branch === 'yes' ? '#1a7f52' : e.branch === 'no' ? '#c0392b' : 'var(--n-400)';
            const marker = e.branch === 'yes' ? 'jr-arrow-yes' : e.branch === 'no' ? 'jr-arrow-no' : 'jr-arrow';
            const onRun = activeRunNode && (e.from === activeRunNode || e.to === activeRunNode);
            return (
              <g key={e.id}>
                <path d={path} fill="none" stroke={color} strokeWidth={onRun ? 3 : 1.75} opacity={onRun ? 1 : 0.75} markerEnd={`url(#${marker})`} style={{ transition: 'stroke-width .2s' }} />
                {e.branch && (
                  <g>
                    <rect x={sx - 16} y={sy + 6} width={32} height={17} rx={8} fill={color} />
                    <text x={sx} y={sy + 18} textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff" style={{ letterSpacing: '.05em' }}>{e.branch === 'yes' ? 'YES' : 'NO'}</text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* Nodes */}
        {nodes.map(n => {
          const p = posOf(n);
          return (
            <NodeCard
              key={n.id}
              node={n}
              left={p.x}
              top={p.y}
              selected={n.id === selectedNodeId}
              running={n.id === activeRunNode}
              sitting={sim.perNode[n.id]?.sitting || 0}
              live={journey.status === 'live'}
              dragging={drag?.id === n.id}
              onPointerDown={(e) => onPointerDown(e, n)}
              onSelect={() => onSelectNode(n)}
              onAdd={(branch) => onAdd(n.id, branch)}
            />
          );
        })}

        {/* Traveling token during test run */}
        {activeRunNode && (() => {
          const n = nodes.find(x => x.id === activeRunNode);
          if (!n) return null;
          const p = posOf(n);
          return (
            <div style={{
              position: 'absolute', left: p.x + NODE_W / 2 - 11, top: p.y - 11, width: 22, height: 22,
              borderRadius: '50%', background: 'var(--accent)', boxShadow: 'var(--accent-glow)',
              display: 'grid', placeItems: 'center', color: '#fff', zIndex: 5,
              transition: 'left .55s var(--ease), top .55s var(--ease)', pointerEvents: 'none',
            }}>
              <Icon name="user" size={12} />
            </div>
          );
        })()}
      </div>
    </div>
  );
}

/* ---------- one node card ---------- */
function NodeCard({ node, left, top, selected, running, sitting, live, dragging, onPointerDown, onSelect, onAdd }) {
  const lib = NODE_LIBRARY[node.type];
  const isBranch = node.type === 'branch';
  const isEntry = node.type === 'entry';
  return (
    <div style={{ position: 'absolute', left, top, width: NODE_W, zIndex: dragging ? 20 : selected ? 10 : 1 }}>
      <div
        onPointerDown={onPointerDown}
        onClick={onSelect}
        className="card"
        style={{
          padding: '.6rem .7rem', cursor: dragging ? 'grabbing' : 'grab',
          border: `1.5px solid ${selected ? 'var(--accent)' : running ? 'var(--accent-300)' : 'var(--line)'}`,
          boxShadow: running ? 'var(--accent-glow)' : selected ? 'var(--shadow-md)' : 'var(--shadow-sm)',
          borderLeft: `4px solid ${lib.color}`,
          transform: running ? 'scale(1.03)' : 'none', transition: 'transform .2s var(--ease), box-shadow .2s, border-color .2s',
          userSelect: 'none',
        }}
      >
        <div className="row between" style={{ gap: '.4rem' }}>
          <div className="row gap-1" style={{ minWidth: 0 }}>
            <span style={{ width: 26, height: 26, borderRadius: 7, background: lib.color, color: '#fff', display: 'grid', placeItems: 'center', flex: 'none' }}>
              <Icon name={lib.icon} size={15} />
            </span>
            <span className="t-xs fw-7" style={{ color: lib.color, textTransform: 'uppercase', letterSpacing: '.04em' }}>{lib.label}</span>
          </div>
          {live && sitting > 0 && (
            <span title={`${sitting.toLocaleString()} contacts here now`} className="badge badge-accent" style={{ fontSize: '.68rem', padding: '.1rem .4rem' }}>
              {sitting >= 1000 ? (sitting / 1000).toFixed(1) + 'k' : sitting}
            </span>
          )}
        </div>
        <div className="t-sm fw-6 clip" style={{ marginTop: 5, color: 'var(--ink)' }} title={nodeSummary(node)}>{nodeSummary(node)}</div>
      </div>

      {/* Add controls */}
      {isBranch ? (
        <div className="row between" style={{ marginTop: 4, padding: '0 8px' }}>
          <AddDot label="Add to NO path" tone="#c0392b" onClick={(e) => { e.stopPropagation(); onAdd('no'); }} />
          <AddDot label="Add to YES path" tone="#1a7f52" onClick={(e) => { e.stopPropagation(); onAdd('yes'); }} />
        </div>
      ) : (
        <div className="row center" style={{ marginTop: 4 }}>
          <AddDot label="Add next step" onClick={(e) => { e.stopPropagation(); onAdd(null); }} />
        </div>
      )}
    </div>
  );
}

function AddDot({ onClick, label, tone = 'var(--accent)' }) {
  return (
    <button
      onClick={onClick}
      onPointerDown={(e) => e.stopPropagation()}
      aria-label={label}
      title={label}
      style={{
        width: 24, height: 24, borderRadius: '50%', border: `1.5px dashed ${tone}`,
        background: 'var(--paper)', color: tone, cursor: 'pointer', display: 'grid', placeItems: 'center',
      }}
    >
      <Icon name="plus" size={14} />
    </button>
  );
}

/* ============================================================
   NODE CONFIG DRAWER
   ============================================================ */
function NodeConfig({ journey, node, sitting, live, onClose, onDelete, toast }) {
  const lib = NODE_LIBRARY[node.type];
  const set = (patch) => updateNode(journey.id, node.id, { config: patch });
  const c = node.config || {};

  return (
    <div style={{ width: 340, flex: 'none', borderLeft: '1px solid var(--line)', background: 'var(--paper)', display: 'flex', flexDirection: 'column', maxHeight: 640 }}>
      <div className="row between" style={{ padding: '.9rem 1rem', borderBottom: '1px solid var(--line)' }}>
        <div className="row gap-1" style={{ minWidth: 0 }}>
          <span style={{ width: 28, height: 28, borderRadius: 7, background: lib.color, color: '#fff', display: 'grid', placeItems: 'center', flex: 'none' }}>
            <Icon name={lib.icon} size={16} />
          </span>
          <span className="fw-7 clip">{lib.label}</span>
        </div>
        <button onClick={onClose} className="btn btn-quiet" aria-label="Close" style={{ padding: '.2rem .45rem' }}><Icon name="x" size={16} /></button>
      </div>

      <div className="col gap-3" style={{ padding: '1rem', overflowY: 'auto' }}>
        {live && (
          <div className="row between" style={{ padding: '.55rem .7rem', background: 'var(--accent-50)', borderRadius: 'var(--r-sm)' }}>
            <span className="t-xs fw-6" style={{ color: 'var(--accent-700)' }}>Contacts here now</span>
            <span className="fw-8" style={{ color: 'var(--accent-700)' }}>{sitting.toLocaleString()}</span>
          </div>
        )}

        <NodeFields node={node} c={c} set={set} toast={toast} />

        {(node.type === 'email' || node.type === 'sms' || node.type === 'rook') && (
          <Button variant="ghost" size="sm" onClick={() => { askRook(rookPromptFor(node)); toast('Rook is drafting this step'); }}>
            <Icon name="sparkles" size={15} /> {node.type === 'rook' ? 'Configure with Rook' : 'Write with Rook'}
          </Button>
        )}
      </div>

      {node.type !== 'entry' && (
        <div style={{ padding: '.8rem 1rem', borderTop: '1px solid var(--line)' }}>
          <Button variant="danger" size="sm" onClick={onDelete} style={{ width: '100%' }}>
            <Icon name="trash" size={15} /> Remove step
          </Button>
        </div>
      )}
    </div>
  );
}

function rookPromptFor(node) {
  const c = node.config || {};
  if (node.type === 'email') return `Draft a high-converting journey email. Working subject: "${c.subject || ''}". Keep it short, personal, and on Rally brand.`;
  if (node.type === 'sms') return `Write a 1-2 sentence journey SMS. Current draft: "${c.message || ''}". Friendly, compliant, one clear ask.`;
  return `Configure this Rook decision node. Goal: pick the best next step per contact. Current instruction: "${c.instruction || ''}".`;
}

function NodeFields({ node, c, set, toast }) {
  switch (node.type) {
    case 'entry':
      return (
        <>
          <Field label="Enrollment trigger" hint="What puts a contact into this journey.">
            <Select value={c.trigger || 'signup'} onChange={(e) => set({ trigger: e.target.value, label: ENTRY_TRIGGERS.find(t => t.id === e.target.value)?.label })}>
              {ENTRY_TRIGGERS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </Select>
          </Field>
          <Field label="Display label">
            <Input value={c.label || ''} onChange={(e) => set({ label: e.target.value })} placeholder="New signup" />
          </Field>
        </>
      );
    case 'email':
      return (
        <>
          <Field label="Subject line" hint="Merge tags like {{firstName}} and {{company}} work.">
            <Input value={c.subject || ''} onChange={(e) => set({ subject: e.target.value })} placeholder="Welcome, {{firstName}}" />
          </Field>
          <Field label="Template">
            <Input value={c.template || ''} onChange={(e) => set({ template: e.target.value })} placeholder="Welcome" />
          </Field>
        </>
      );
    case 'sms':
      return (
        <Field label="Message" hint="Keep it short. Merge tags supported.">
          <Textarea rows={4} value={c.message || ''} onChange={(e) => set({ message: e.target.value })} placeholder="Quick note for you, {{firstName}}." />
        </Field>
      );
    case 'delay':
      return (
        <div className="row gap-2" style={{ alignItems: 'flex-end' }}>
          <Field label="Wait">
            <Input type="number" min="1" value={c.amount ?? 1} onChange={(e) => set({ amount: Math.max(1, Number(e.target.value) || 1) })} />
          </Field>
          <Field label="Unit">
            <Select value={c.unit || 'days'} onChange={(e) => set({ unit: e.target.value })}>
              {DELAY_UNITS.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
            </Select>
          </Field>
        </div>
      );
    case 'branch':
      return (
        <>
          <Field label="Test this condition" hint="YES and NO paths flow from here. Wire a step onto each with the + dots.">
            <Select value={c.prop || 'opened_email'} onChange={(e) => set({ prop: e.target.value })}>
              {BRANCH_PROPS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </Select>
          </Field>
          <div className="row gap-1">
            <Badge tone="ok">YES path</Badge>
            <Badge tone="risk">NO path</Badge>
          </div>
        </>
      );
    case 'task':
      return (
        <>
          <Field label="Task title">
            <Input value={c.title || ''} onChange={(e) => set({ title: e.target.value })} placeholder="Follow up with the contact" />
          </Field>
          <Field label="Assign to">
            <Select value={c.owner || 'owner'} onChange={(e) => set({ owner: e.target.value })}>
              <option value="owner">Record owner</option>
              <option value="me">Me</option>
              <option value="round">Round-robin</option>
            </Select>
          </Field>
        </>
      );
    case 'lifecycle':
      return (
        <Field label="Set lifecycle stage to">
          <Select value={c.stage || 'sql'} onChange={(e) => set({ stage: e.target.value })}>
            {AUDIENCE_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </Select>
        </Field>
      );
    case 'campaign':
      return (
        <Field label="Campaign" hint="Adds the contact to this marketing campaign.">
          <Input value={c.campaign || ''} onChange={(e) => set({ campaign: e.target.value })} placeholder="Nurture" />
        </Field>
      );
    case 'notify':
      return (
        <>
          <Field label="Notify">
            <Select value={c.who || 'owner'} onChange={(e) => set({ who: e.target.value })}>
              <option value="owner">Record owner</option>
              <option value="manager">Owner's manager</option>
              <option value="me">Me</option>
            </Select>
          </Field>
          <Field label="Note">
            <Input value={c.note || ''} onChange={(e) => set({ note: e.target.value })} placeholder="Journey milestone reached" />
          </Field>
        </>
      );
    case 'list':
      return (
        <>
          <Field label="Action">
            <Select value={c.action || 'add'} onChange={(e) => set({ action: e.target.value })}>
              {LIST_ACTIONS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
            </Select>
          </Field>
          <Field label="List name">
            <Input value={c.list || ''} onChange={(e) => set({ list: e.target.value })} placeholder="Journey members" />
          </Field>
        </>
      );
    case 'rook':
      return (
        <Field label="Rook instruction" hint="Rally-only: an AI decision node. Rook reads the contact and picks the best next step.">
          <Textarea rows={4} value={c.instruction || ''} onChange={(e) => set({ instruction: e.target.value })} placeholder="Choose the best next step for this contact." />
        </Field>
      );
    default:
      return null;
  }
}

/* ============================================================
   ADD-STEP MODAL
   ============================================================ */
function AddStepModal({ open, onClose, branch, onPick }) {
  return (
    <Modal open={open} onClose={onClose} title={branch ? `Add step to the ${branch.toUpperCase()} path` : 'Add a step'} width={560}>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '.65rem' }}>
        {ADDABLE_TYPES.map(type => {
          const lib = NODE_LIBRARY[type];
          return (
            <button
              key={type}
              onClick={() => onPick(type)}
              className="card card-hover col gap-1"
              style={{ padding: '.9rem', textAlign: 'left', cursor: 'pointer', border: '1px solid var(--line)' }}
            >
              <span style={{ width: 32, height: 32, borderRadius: 8, background: lib.color, color: '#fff', display: 'grid', placeItems: 'center' }}>
                <Icon name={lib.icon} size={17} />
              </span>
              <span className="fw-7 t-sm" style={{ color: 'var(--ink)' }}>{lib.label}</span>
              <span className="t-xs muted" style={{ textTransform: 'capitalize' }}>{lib.cat}</span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

/* ============================================================
   TEMPLATE GALLERY
   ============================================================ */
function TemplateGallery({ open, onClose, onPick, onBlank }) {
  return (
    <Modal open={open} onClose={onClose} title="Start a journey" width={720}>
      <div className="col gap-3">
        <div className="muted t-sm">Launch from a proven play, or start from a blank canvas. Every template is fully editable.</div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '.8rem' }}>
          {TEMPLATES.map(t => {
            const g = t.build();
            return (
              <button
                key={t.id}
                onClick={() => onPick(t.id)}
                className="card card-hover col gap-2"
                style={{ padding: '1rem', textAlign: 'left', cursor: 'pointer', border: '1px solid var(--line)' }}
              >
                <span style={{ width: 40, height: 40, borderRadius: 10, background: t.accent, color: '#fff', display: 'grid', placeItems: 'center' }}>
                  <Icon name={t.icon} size={20} />
                </span>
                <div className="fw-7" style={{ color: 'var(--ink)' }}>{t.name}</div>
                <div className="t-sm muted" style={{ minHeight: 40 }}>{t.tagline}</div>
                <div className="row gap-1 wrap">
                  <Badge>{g.nodes.length} steps</Badge>
                  <Badge tone="accent">Goal: {g.goal.label}</Badge>
                </div>
              </button>
            );
          })}
          <button
            onClick={onBlank}
            className="card card-hover col center gap-1"
            style={{ padding: '1rem', cursor: 'pointer', border: '1.5px dashed var(--line-strong)', minHeight: 160 }}
          >
            <Icon name="plus" size={24} style={{ color: 'var(--accent-600)' }} />
            <div className="fw-7" style={{ color: 'var(--ink)' }}>Blank journey</div>
            <div className="t-xs muted" style={{ textAlign: 'center' }}>Start with just an entry trigger</div>
          </button>
        </div>
      </div>
    </Modal>
  );
}
