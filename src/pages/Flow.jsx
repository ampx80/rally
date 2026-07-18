// ============================================================
// ARDOVO FLOW  -  the visual automation studio (crown jewel)
// ------------------------------------------------------------
// A real node canvas: drag nodes, drag-to-connect ports, click a
// node to configure it, load a prebuilt recipe, and press Test run
// to watch a sample record glide through the graph. Every action
// mutates the local-first store (src/lib/flow-data.js) so the demo
// is alive across reloads. Native Rook AI nodes ship here that no
// other builder has.
//
// Additive: this file only READS design tokens + UI primitives and
// its own data layer. It edits no existing file. ASCII only.
// ============================================================
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PageTitle, SectionHeader, Card, StatCard, Button, Badge, Field, Input,
  Select, Textarea, Modal, EmptyState, useToast, GradientText,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import {
  useFlowStore, getFlows, getActiveFlow, getFlow, setActiveFlow, createFlow,
  loadRecipeToCanvas, renameFlow, setFlowStatus, deleteFlow,
  addNode, moveNode, updateNodeConfig, removeNode, addEdge, removeEdge, bumpSim,
  runFlow, flowStats, getSimCount,
  NODE_TYPES, GROUPS, GROUP_META, RECIPES, nodeMeta, typesByGroup, outPorts, hasInput,
} from '../lib/flow-data.js';

const NODE_W = 194;
const NODE_H = 74;
const CANVAS_W = 1320;
const CANVAS_H = 620;

const STATUS_TONE = { live: 'ok', draft: 'accent', paused: 'warn' };

/* representative one-line summary of a node's config for the card body */
function nodeSummary(node) {
  const c = node.config || {};
  switch (node.type) {
    case 'condition': return `${c.field} ${c.op} ${c.value}`;
    case 'split': return `${c.percent}% / ${100 - Number(c.percent || 50)}%`;
    case 'filter': return `${c.field} ${c.op} ${c.value}`;
    case 'send_email': return c.subject;
    case 'send_sms': case 'send_whatsapp': return c.body;
    case 'start_sequence': return c.sequence;
    case 'notify_rep': return `via ${c.channel}`;
    case 'create_task': return `${c.subject} - ${c.due}`;
    case 'update_field': return `${c.field} = ${c.value}`;
    case 'add_to_list': return c.list;
    case 'create_deal': return c.pipeline;
    case 'webhook': return c.url;
    case 'wait': return `${c.amount} ${c.unit}`;
    case 'no_activity': return `${c.days} days quiet`;
    case 'deal_stage': return `to ${c.stage}`;
    case 'form_submitted': return c.form;
    case 'lead_created': return c.source;
    case 'tag_added': return c.tag;
    case 'rook_decide': return c.question;
    case 'rook_draft': return c.instruction;
    case 'rook_qualify': return c.rubric;
    default: return nodeMeta(node.type).desc;
  }
}

export default function Flow() {
  useFlowStore();
  const toast = useToast();
  const flow = getActiveFlow();
  const flows = getFlows();
  const stats = flowStats();
  const sims = getSimCount();

  const [selectedId, setSelectedId] = useState(null);
  const [live, setLive] = useState(null);     // {nodeId,x,y} during a drag
  const [temp, setTemp] = useState(null);     // {x1,y1,x2,y2} during a connect
  const [run, setRun] = useState(null);       // {steps, edgePath, i, running}
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [paletteGroup, setPaletteGroup] = useState('Triggers');

  const canvasRef = useRef(null);
  const inter = useRef(null);
  const flowRef = useRef(flow);
  flowRef.current = flow;
  const addOffset = useRef(0);

  const selected = flow?.nodes.find(n => n.id === selectedId) || null;

  /* ----- coordinate helpers ----- */
  const canvasPoint = useCallback((e) => {
    const el = canvasRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return { x: e.clientX - r.left + el.scrollLeft, y: e.clientY - r.top + el.scrollTop };
  }, []);

  const portY = useCallback((node, port) => {
    if (port === 'yes') return node.y + 26;
    if (port === 'no') return node.y + NODE_H - 26;
    return node.y + NODE_H / 2;
  }, []);

  const nodeAtPoint = useCallback((p) => {
    const f = flowRef.current;
    for (let i = f.nodes.length - 1; i >= 0; i--) {
      const n = f.nodes[i];
      if (p.x >= n.x && p.x <= n.x + NODE_W && p.y >= n.y && p.y <= n.y + NODE_H) return n;
    }
    return null;
  }, []);

  /* ----- pointer interaction (stable handlers, read from refs) ----- */
  const onMove = useCallback((e) => {
    const it = inter.current; if (!it) return;
    const p = canvasPoint(e);
    if (it.mode === 'drag') {
      it.moved = true;
      const x = Math.max(0, Math.min(CANVAS_W - NODE_W, p.x - it.offX));
      const y = Math.max(0, Math.min(CANVAS_H - NODE_H, p.y - it.offY));
      it.curX = x; it.curY = y;
      setLive({ nodeId: it.nodeId, x, y });
    } else if (it.mode === 'connect') {
      setTemp((t) => (t ? { ...t, x2: p.x, y2: p.y } : t));
    }
  }, [canvasPoint]);

  const onUp = useCallback((e) => {
    const it = inter.current;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    if (it?.mode === 'drag' && it.moved) {
      moveNode(flowRef.current.id, it.nodeId, it.curX, it.curY);
    } else if (it?.mode === 'connect') {
      const target = nodeAtPoint(canvasPoint(e));
      if (target && target.id !== it.from) {
        const r = addEdge(flowRef.current.id, it.from, target.id, it.fromPort);
        if (r.error === 'trigger-input') toast('Triggers cannot receive a connection', 'warn');
        else if (!r.error) toast('Connected');
      }
    }
    inter.current = null;
    setLive(null);
    setTemp(null);
  }, [onMove, canvasPoint, nodeAtPoint, toast]);

  useEffect(() => () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
  }, [onMove, onUp]);

  const startNodeDrag = (e, node) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setSelectedId(node.id);
    const p = canvasPoint(e);
    inter.current = { mode: 'drag', nodeId: node.id, offX: p.x - node.x, offY: p.y - node.y, curX: node.x, curY: node.y, moved: false };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const startConnect = (e, node, port) => {
    e.stopPropagation();
    const y1 = portY(node, port);
    inter.current = { mode: 'connect', from: node.id, fromPort: port };
    setTemp({ x1: node.x + NODE_W, y1, x2: node.x + NODE_W, y2: y1 });
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  /* ----- palette add ----- */
  const addFromPalette = (type) => {
    const el = canvasRef.current;
    const cx = (el ? el.scrollLeft + el.clientWidth / 2 : 400) - NODE_W / 2;
    const cy = (el ? el.scrollTop + 90 : 90);
    const k = addOffset.current % 5;
    addOffset.current += 1;
    const r = addNode(flow.id, type, { x: Math.max(20, cx + k * 26), y: cy + k * 22 });
    if (r.node) { setSelectedId(r.node.id); toast(`${nodeMeta(type).label} added`); }
  };

  /* ----- Rook: add a smart step and wire it in ----- */
  const askRook = () => {
    const f = flowRef.current;
    // find a trailing node to extend from, else the trigger
    const tail = [...f.nodes].reverse().find(n => nodeMeta(n.type).kind !== 'branch') || f.nodes[0];
    const type = f.nodes.some(n => n.type === 'rook_qualify') ? 'rook_draft' : 'rook_qualify';
    const r = addNode(f.id, type, { x: Math.min(CANVAS_W - NODE_W - 20, tail.x + NODE_W + 60), y: tail.y });
    if (r.node) {
      addEdge(f.id, tail.id, r.node.id, 'out');
      setSelectedId(r.node.id);
      toast('Rook added an AI step and wired it in');
    }
  };

  /* ----- test run animation ----- */
  useEffect(() => {
    if (!run || !run.running) return;
    if (run.i >= run.steps.length - 1) {
      const t = setTimeout(() => setRun(r => (r ? { ...r, running: false } : r)), 800);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setRun(r => (r ? { ...r, i: r.i + 1 } : r)), 780);
    return () => clearTimeout(t);
  }, [run]);

  const testRun = () => {
    const { steps, edgePath } = runFlow(flow);
    if (!steps.length) { toast('Add a trigger to run this flow', 'warn'); return; }
    bumpSim();
    setSelectedId(null);
    setRun({ steps, edgePath, i: 0, running: true });
  };

  /* ----- derived render data ----- */
  const posOf = (n) => (live && live.nodeId === n.id ? { x: live.x, y: live.y } : { x: n.x, y: n.y });

  const activeNodeId = run ? run.steps[run.i]?.nodeId : null;
  const doneNodeIds = useMemo(() => new Set(run ? run.steps.slice(0, run.i + 1).map(s => s.nodeId) : []), [run]);
  const doneEdgeIds = useMemo(() => new Set(run ? run.edgePath.slice(0, run.i) : []), [run]);

  const edgePath = (edge) => {
    const f = flow;
    const from = f.nodes.find(n => n.id === edge.from);
    const to = f.nodes.find(n => n.id === edge.to);
    if (!from || !to) return null;
    const fp = posOf(from), tp = posOf(to);
    const sx = fp.x + NODE_W;
    const sy = edge.fromPort === 'yes' ? fp.y + 26 : edge.fromPort === 'no' ? fp.y + NODE_H - 26 : fp.y + NODE_H / 2;
    const tx = tp.x, ty = tp.y + NODE_H / 2;
    const dx = Math.max(40, Math.abs(tx - sx) * 0.5);
    return { d: `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`, mid: { x: (sx + tx) / 2, y: (sy + ty) / 2 } };
  };

  const tokenPos = useMemo(() => {
    if (!run) return null;
    const n = flow.nodes.find(x => x.id === run.steps[run.i]?.nodeId);
    if (!n) return null;
    const p = posOf(n);
    return { x: p.x + (hasInput(n.type) ? 0 : NODE_W / 2), y: p.y + NODE_H / 2 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, flow]);

  if (!flow) {
    return (
      <div className="page-in">
        <PageTitle eyebrow="Automation" title="Flow" sub="Your visual workflow builder." />
        <Card><EmptyState icon="🔗" title="No workflows yet" body="Start from a recipe or a blank canvas." action={<Button onClick={() => createFlow()}>New workflow</Button>} /></Card>
      </div>
    );
  }

  return (
    <div className="page-in">
      <PageTitle
        eyebrow="Automation"
        title={<span>Flow <GradientText style={{ fontSize: '.5em', verticalAlign: 'middle', fontWeight: 800 }}>studio</GradientText></span>}
        sub="Drag to connect. Click to configure. Press Test run to watch a record flow through. The only builder with native Rook AI nodes."
        action={
          <>
            <Button variant="ghost" onClick={askRook}><Icon name="sparkles" size={16} /> Ask Rook</Button>
            <Button variant="ghost" as={Link} to="/workflows"><Icon name="workflow" size={16} /> All workflows</Button>
            <Button variant="accent" onClick={testRun}><Icon name="bolt" size={16} /> Test run</Button>
          </>
        }
      />

      {/* KPI strip */}
      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '1.15rem' }}>
        <StatCard label="Workflows" value={stats.flows} icon={<Icon name="workflow" size={18} />} sub={`${stats.live} live now`} />
        <StatCard label="Runs automated" value={stats.totalRuns} format={(n) => Math.round(n).toLocaleString()} icon={<Icon name="bolt" size={18} />} accent="var(--accent-teal)" sub="across all flows" />
        <StatCard label="Rook AI steps" value={stats.aiNodes} icon={<Icon name="sparkles" size={18} />} accent="var(--accent-purple)" sub="native to Ardovo only" />
        <StatCard label="Test runs" value={sims} icon={<Icon name="target" size={18} />} accent="var(--warn)" sub="simulated this session" />
      </div>

      {/* Recipe gallery */}
      <Card className="fade-up" style={{ marginBottom: '1.15rem' }} pad={false}>
        <div style={{ padding: '1.1rem 1.35rem .4rem' }}>
          <SectionHeader eyebrow="Recipe gallery" title="Load a proven workflow" sub="One click drops a fully wired graph onto the canvas. Tune it, then ship." />
        </div>
        <div className="row gap-2" style={{ overflowX: 'auto', padding: '0 1.35rem 1.25rem', scrollSnapType: 'x proximity' }}>
          {RECIPES.map(r => (
            <button
              key={r.id}
              onClick={() => { const res = loadRecipeToCanvas(r.id); if (res.flow) { setSelectedId(null); setRun(null); toast(`Loaded "${r.name}"`); } }}
              className="card card-pad card-hover"
              style={{ minWidth: 246, maxWidth: 246, textAlign: 'left', cursor: 'pointer', flex: 'none', scrollSnapAlign: 'start', border: '1px solid var(--line)' }}
            >
              <div className="row between" style={{ marginBottom: 10 }}>
                <span style={{ width: 38, height: 38, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'color-mix(in srgb, ' + r.accent + ' 16%, transparent)', color: r.accent }}>
                  <Icon name={r.icon} size={20} />
                </span>
                <Badge tone="accent" className="t-xs">{r.nodes.length} steps</Badge>
              </div>
              <div className="fw-7" style={{ fontSize: '1.02rem', marginBottom: 4 }}>{r.name}</div>
              <div className="t-sm muted" style={{ lineHeight: 1.4 }}>{r.tagline}</div>
              <div className="row gap-1" style={{ marginTop: 12, color: 'var(--accent-600)', fontWeight: 700, fontSize: '.86rem' }}>
                Load onto canvas <Icon name="arrowRight" size={15} />
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Flow toolbar */}
      <Card className="fade-up" pad={false} style={{ marginBottom: '1.15rem' }}>
        <div className="row between wrap" style={{ padding: '.85rem 1.1rem', gap: '.75rem' }}>
          <div className="row gap-2 wrap" style={{ minWidth: 0 }}>
            <Field label={null}>
              <Select value={flow.id} onChange={(e) => { setActiveFlow(e.target.value); setSelectedId(null); setRun(null); }} style={{ minWidth: 220, fontWeight: 700 }}>
                {flows.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </Select>
            </Field>
            <Badge tone={STATUS_TONE[flow.status] || 'default'}>{flow.status === 'live' ? 'Live' : flow.status === 'paused' ? 'Paused' : 'Draft'}</Badge>
            <span className="t-sm muted">{flow.nodes.length} nodes | {flow.edges.length} connections | {(flow.runs || 0).toLocaleString()} lifetime runs</span>
          </div>
          <div className="row gap-1 wrap">
            <Button variant="quiet" size="sm" onClick={() => { setRenaming(true); setNameDraft(flow.name); }}><Icon name="edit" size={15} /> Rename</Button>
            {flow.status === 'live'
              ? <Button variant="quiet" size="sm" onClick={() => { setFlowStatus(flow.id, 'paused'); toast('Workflow paused'); }}><Icon name="clock" size={15} /> Pause</Button>
              : <Button variant="quiet" size="sm" onClick={() => { setFlowStatus(flow.id, 'live'); toast('Workflow is live'); }}><Icon name="rocket" size={15} /> Set live</Button>}
            <Button variant="ghost" size="sm" onClick={() => { const r = createFlow(); setSelectedId(null); setRun(null); toast('Blank workflow created'); }}><Icon name="plus" size={15} /> New</Button>
            {flows.length > 1 && (
              <Button variant="quiet" size="sm" onClick={() => { if (confirm(`Delete "${flow.name}"?`)) { deleteFlow(flow.id); setSelectedId(null); setRun(null); toast('Workflow deleted'); } }}><Icon name="trash" size={15} /></Button>
            )}
          </div>
        </div>
      </Card>

      {/* Builder: palette | canvas | panel */}
      <div className="row" style={{ gap: '1.15rem', alignItems: 'stretch', flexWrap: 'wrap' }}>
        {/* Palette */}
        <Card pad={false} style={{ width: 214, flex: '1 1 200px', maxWidth: 240, alignSelf: 'stretch', overflow: 'hidden' }}>
          <div style={{ padding: '.9rem 1rem .3rem' }}>
            <div className="stat-label">Palette</div>
            <div className="t-xs muted" style={{ marginTop: 2 }}>Click to drop a node</div>
          </div>
          <div className="row wrap gap-1" style={{ padding: '.5rem .7rem' }}>
            {GROUPS.map(g => (
              <button key={g} onClick={() => setPaletteGroup(g)} className="badge"
                style={{ cursor: 'pointer', border: '1px solid ' + (paletteGroup === g ? 'transparent' : 'var(--line)'), background: paletteGroup === g ? GROUP_META[g].color : 'transparent', color: paletteGroup === g ? '#fff' : 'var(--ink-2)' }}>
                {g}
              </button>
            ))}
          </div>
          <div style={{ padding: '.2rem .7rem 1rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="t-xs muted" style={{ padding: '0 .3rem .2rem' }}>{GROUP_META[paletteGroup].hint}</div>
            {typesByGroup(paletteGroup).map(nt => (
              <button key={nt.type} onClick={() => addFromPalette(nt.type)}
                className="row gap-2"
                style={{ width: '100%', textAlign: 'left', cursor: 'pointer', background: 'var(--n-25)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '.55rem .6rem', transition: 'border-color .15s, transform .12s' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = nt.color; e.currentTarget.style.transform = 'translateX(2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.transform = 'none'; }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, display: 'grid', placeItems: 'center', flex: 'none', background: 'color-mix(in srgb, ' + nt.color + ' 15%, transparent)', color: nt.color }}>
                  <Icon name={nt.icon} size={16} />
                </span>
                <span style={{ minWidth: 0 }}>
                  <span className="fw-6 clip" style={{ display: 'block', fontSize: '.92rem' }}>{nt.label}</span>
                  <span className="t-xs muted clip" style={{ display: 'block' }}>{nt.desc}</span>
                </span>
                <Icon name="plus" size={14} style={{ marginLeft: 'auto', color: 'var(--n-400)', flex: 'none' }} />
              </button>
            ))}
          </div>
        </Card>

        {/* Canvas */}
        <Card pad={false} style={{ flex: '3 1 520px', minWidth: 320, alignSelf: 'stretch', overflow: 'hidden', position: 'relative' }}>
          <div className="row between" style={{ padding: '.7rem 1rem', borderBottom: '1px solid var(--line)' }}>
            <div className="row gap-2" style={{ minWidth: 0 }}>
              <Icon name="workflow" size={18} style={{ color: 'var(--accent)' }} />
              <span className="fw-7 clip">{flow.name}</span>
            </div>
            <div className="row gap-1">
              {run && <Badge tone={run.running ? 'accent' : 'ok'}>{run.running ? `Running step ${run.i + 1}/${run.steps.length}` : 'Run complete'}</Badge>}
              {run && <Button variant="quiet" size="sm" onClick={() => setRun(null)}>Clear</Button>}
              <Button variant="accent" size="sm" onClick={testRun}><Icon name="bolt" size={14} /> Test run</Button>
            </div>
          </div>
          <div
            ref={canvasRef}
            onPointerDown={() => setSelectedId(null)}
            style={{
              position: 'relative', height: 560, overflow: 'auto', cursor: temp ? 'crosshair' : 'default',
              background:
                'radial-gradient(circle at 1px 1px, var(--n-100) 1px, transparent 0) 0 0 / 22px 22px, var(--page)',
            }}
          >
            <div style={{ position: 'relative', width: CANVAS_W, height: CANVAS_H }}>
              {/* connectors */}
              <svg width={CANVAS_W} height={CANVAS_H} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                <defs>
                  <marker id="flow-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
                    <path d="M1 1 L7.5 4.5 L1 8" fill="none" stroke="var(--n-400)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </marker>
                  <marker id="flow-arrow-on" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
                    <path d="M1 1 L7.5 4.5 L1 8" fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </marker>
                </defs>
                {flow.edges.map(edge => {
                  const p = edgePath(edge);
                  if (!p) return null;
                  const on = doneEdgeIds.has(edge.id);
                  return (
                    <g key={edge.id}>
                      {/* wide invisible hit area for click-to-delete */}
                      <path d={p.d} fill="none" stroke="transparent" strokeWidth="16" style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                        onClick={(e) => { e.stopPropagation(); removeEdge(flow.id, edge.id); toast('Connection removed'); }} />
                      <path d={p.d} fill="none" stroke={on ? 'var(--accent)' : 'var(--line-strong)'} strokeWidth={on ? 3 : 2}
                        markerEnd={on ? 'url(#flow-arrow-on)' : 'url(#flow-arrow)'}
                        style={{ transition: 'stroke .3s, stroke-width .3s' }} />
                      {edge.fromPort !== 'out' && (
                        <text x={p.mid.x} y={p.mid.y - 6} textAnchor="middle" style={{ fontSize: 10, fontWeight: 700, fill: edge.fromPort === 'yes' ? 'var(--ok)' : 'var(--risk)' }}>
                          {edge.fromPort === 'yes' ? 'Yes' : 'No'}
                        </text>
                      )}
                    </g>
                  );
                })}
                {/* temp connect line */}
                {temp && <path d={`M ${temp.x1} ${temp.y1} C ${temp.x1 + 60} ${temp.y1}, ${temp.x2 - 60} ${temp.y2}, ${temp.x2} ${temp.y2}`} fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeDasharray="5 5" />}
                {/* animated record token */}
                {tokenPos && (
                  <g style={{ transition: 'transform .7s var(--ease)', transform: `translate(${tokenPos.x}px, ${tokenPos.y}px)` }}>
                    <circle r="13" fill="var(--accent)" opacity="0.18" />
                    <circle r="7" fill="var(--accent)" />
                    <circle r="7" fill="none" stroke="#fff" strokeWidth="1.5" opacity="0.7" />
                  </g>
                )}
              </svg>

              {/* nodes */}
              {flow.nodes.map(node => {
                const m = nodeMeta(node.type);
                const p = posOf(node);
                const isSel = node.id === selectedId;
                const isActive = node.id === activeNodeId;
                const isDone = doneNodeIds.has(node.id) && !isActive;
                const ports = outPorts(node.type);
                return (
                  <div key={node.id}
                    onPointerDown={(e) => startNodeDrag(e, node)}
                    style={{
                      position: 'absolute', left: p.x, top: p.y, width: NODE_W, minHeight: NODE_H,
                      background: 'var(--paper)', borderRadius: 'var(--r-md)',
                      border: '1.5px solid ' + (isSel ? 'var(--accent)' : isActive ? m.color : 'var(--line-strong)'),
                      boxShadow: isActive ? '0 0 0 4px color-mix(in srgb, ' + m.color + ' 22%, transparent), var(--shadow-md)' : isSel ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                      cursor: 'grab', userSelect: 'none', touchAction: 'none',
                      transition: live && live.nodeId === node.id ? 'none' : 'box-shadow .2s, border-color .2s, transform .2s',
                      transform: isActive ? 'scale(1.03)' : 'none', opacity: run && !isActive && !isDone && run.i >= 0 ? 0.72 : 1,
                      zIndex: isSel || isActive ? 5 : 2,
                    }}>
                    {/* accent rail */}
                    <div style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 4, borderRadius: 4, background: m.color }} />
                    <div style={{ padding: '.55rem .65rem .55rem .8rem' }}>
                      <div className="row gap-2" style={{ alignItems: 'flex-start' }}>
                        <span style={{ width: 26, height: 26, borderRadius: 7, display: 'grid', placeItems: 'center', flex: 'none', background: 'color-mix(in srgb, ' + m.color + ' 16%, transparent)', color: m.color, marginTop: 1 }}>
                          <Icon name={m.icon} size={15} />
                        </span>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="row between" style={{ gap: 4 }}>
                            <span className="t-xs fw-7" style={{ letterSpacing: '.02em', color: m.color, textTransform: 'uppercase', fontSize: '.62rem' }}>{m.group}</span>
                            {m.group === 'AI' && <Icon name="sparkles" size={12} style={{ color: 'var(--accent-purple)' }} />}
                          </div>
                          <div className="fw-7 clip" style={{ fontSize: '.92rem', lineHeight: 1.2 }}>{m.label}</div>
                          <div className="t-xs muted clip" style={{ display: 'block', marginTop: 1 }}>{nodeSummary(node) || m.desc}</div>
                        </div>
                      </div>
                    </div>
                    {/* input port */}
                    {hasInput(node.type) && (
                      <span style={{ position: 'absolute', left: -7, top: NODE_H / 2 - 6, width: 12, height: 12, borderRadius: '50%', background: 'var(--paper)', border: '2px solid var(--n-400)' }} />
                    )}
                    {/* output ports (drag to connect) */}
                    {ports.map(port => {
                      const py = port.id === 'yes' ? 26 : port.id === 'no' ? NODE_H - 26 : NODE_H / 2;
                      const col = port.id === 'yes' ? 'var(--ok)' : port.id === 'no' ? 'var(--risk)' : m.color;
                      return (
                        <span key={port.id}
                          title={port.label ? `Drag from ${port.label}` : 'Drag to connect'}
                          onPointerDown={(e) => startConnect(e, node, port.id)}
                          style={{ position: 'absolute', right: -8, top: py - 7, width: 14, height: 14, borderRadius: '50%', background: col, border: '2px solid var(--paper)', cursor: 'crosshair', boxShadow: 'var(--shadow-sm)', zIndex: 6 }} />
                      );
                    })}
                    {ports.length > 1 && ports.map(port => {
                      const py = port.id === 'yes' ? 26 : NODE_H - 26;
                      return <span key={'lbl' + port.id} style={{ position: 'absolute', right: 10, top: py - 8, fontSize: '.58rem', fontWeight: 800, letterSpacing: '.04em', color: port.id === 'yes' ? 'var(--ok)' : 'var(--risk)', pointerEvents: 'none' }}>{port.label}</span>;
                    })}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="row between" style={{ padding: '.55rem 1rem', borderTop: '1px solid var(--line)', color: 'var(--n-600)', fontSize: '.8rem' }}>
            <span>Drag the colored dots to connect. Click a wire to remove it.</span>
            <span className="row gap-2 hide-520">
              <span className="row gap-1"><span className="dot" style={{ background: 'var(--ok)' }} /> Yes path</span>
              <span className="row gap-1"><span className="dot" style={{ background: 'var(--risk)' }} /> No path</span>
              <span className="row gap-1"><span className="dot" style={{ background: 'var(--accent-purple)' }} /> Rook AI</span>
            </span>
          </div>
        </Card>

        {/* Config / inspector panel */}
        <Card pad={false} style={{ flex: '1 1 280px', minWidth: 260, maxWidth: 340, alignSelf: 'stretch', overflow: 'hidden' }}>
          {selected
            ? <ConfigPanel key={selected.id} flow={flow} node={selected} onClose={() => setSelectedId(null)} toast={toast} />
            : <RunOrHints run={run} />}
        </Card>
      </div>

      {/* Rename modal */}
      <Modal open={renaming} onClose={() => setRenaming(false)} title="Rename workflow"
        footer={<>
          <Button variant="ghost" onClick={() => setRenaming(false)}>Cancel</Button>
          <Button onClick={() => { renameFlow(flow.id, nameDraft.trim()); setRenaming(false); toast('Renamed'); }}>Save</Button>
        </>}>
        <Field label="Workflow name">
          <Input value={nameDraft} autoFocus onChange={(e) => setNameDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { renameFlow(flow.id, nameDraft.trim()); setRenaming(false); } }} />
        </Field>
      </Modal>
    </div>
  );
}

/* ============================================================
   CONFIG PANEL  -  edit the selected node, real persistence
   ============================================================ */
const OP_OPTIONS = ['greater than', 'less than', 'is', 'is not', 'exists'];
const UNIT_OPTIONS = ['minutes', 'hours', 'days'];
const CHANNEL_OPTIONS = ['Slack', 'Email', 'SMS', 'Teams'];
const NUMERIC_KEYS = new Set(['days', 'amount', 'value', 'percent']);

function ConfigPanel({ flow, node, onClose, toast }) {
  const m = nodeMeta(node.type);
  const [draft, setDraft] = useState(node.config);
  useEffect(() => { setDraft(node.config); }, [node.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));
  const save = () => { updateNodeConfig(flow.id, node.id, draft); toast('Step saved'); };
  const dirty = JSON.stringify(draft) !== JSON.stringify(node.config);

  const fieldFor = (k, v) => {
    if (k === 'op') return <Select value={v} onChange={(e) => set(k, e.target.value)}>{OP_OPTIONS.map(o => <option key={o}>{o}</option>)}</Select>;
    if (k === 'unit') return <Select value={v} onChange={(e) => set(k, e.target.value)}>{UNIT_OPTIONS.map(o => <option key={o}>{o}</option>)}</Select>;
    if (k === 'channel') return <Select value={v} onChange={(e) => set(k, e.target.value)}>{CHANNEL_OPTIONS.map(o => <option key={o}>{o}</option>)}</Select>;
    if (k === 'body' || k === 'instruction' || k === 'question' || k === 'rubric') return <Textarea rows={4} value={v} onChange={(e) => set(k, e.target.value)} />;
    if (NUMERIC_KEYS.has(k)) return <Input type="number" value={v} onChange={(e) => set(k, e.target.value)} />;
    return <Input value={v} onChange={(e) => set(k, e.target.value)} />;
  };

  const label = (k) => k.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="row between" style={{ padding: '.9rem 1.1rem', borderBottom: '1px solid var(--line)', background: 'color-mix(in srgb, ' + m.color + ' 8%, var(--paper))' }}>
        <div className="row gap-2" style={{ minWidth: 0 }}>
          <span style={{ width: 34, height: 34, borderRadius: 9, display: 'grid', placeItems: 'center', flex: 'none', background: 'color-mix(in srgb, ' + m.color + ' 18%, transparent)', color: m.color }}>
            <Icon name={m.icon} size={18} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div className="fw-7 clip">{m.label}</div>
            <div className="t-xs muted">{m.group} step</div>
          </div>
        </div>
        <button onClick={onClose} className="btn btn-quiet" aria-label="Close" style={{ padding: '.2rem .45rem' }}><Icon name="x" size={16} /></button>
      </div>

      <div style={{ padding: '1rem 1.1rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="t-sm muted" style={{ lineHeight: 1.45 }}>{m.desc}</div>

        {m.group === 'AI' && (
          <div className="panel" style={{ padding: '.7rem .8rem', background: 'color-mix(in srgb, var(--accent-purple) 8%, var(--paper))', borderColor: 'color-mix(in srgb, var(--accent-purple) 30%, var(--line))' }}>
            <div className="row gap-1" style={{ color: 'var(--accent-purple)', fontWeight: 700, fontSize: '.82rem' }}>
              <Icon name="sparkles" size={14} /> Rook runs this step live
            </div>
            <div className="t-xs muted" style={{ marginTop: 4 }}>No prompt engineering. Rook reads the record, decides, and acts inside your guardrails.</div>
          </div>
        )}

        {Object.keys(draft).length === 0 && <div className="t-sm muted">This trigger has no options to configure.</div>}
        {Object.entries(draft).map(([k, v]) => (
          <Field key={k} label={label(k)}>{fieldFor(k, v)}</Field>
        ))}
      </div>

      <div className="row between" style={{ padding: '.8rem 1.1rem', borderTop: '1px solid var(--line)', gap: 8 }}>
        <Button variant="danger" size="sm" onClick={() => { removeNode(flow.id, node.id); onClose(); toast('Step removed'); }}><Icon name="trash" size={15} /> Delete</Button>
        <Button variant={dirty ? 'accent' : 'ghost'} size="sm" onClick={save} disabled={!dirty}><Icon name="check" size={15} /> Save step</Button>
      </div>
    </div>
  );
}

/* ============================================================
   RUN LOG / HINTS  -  shown when no node is selected
   ============================================================ */
function RunOrHints({ run }) {
  if (run && run.steps.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="row between" style={{ padding: '.9rem 1.1rem', borderBottom: '1px solid var(--line)' }}>
          <div>
            <div className="fw-7">Run log</div>
            <div className="t-xs muted">Sample: Priya Shah at Vertex Robotics</div>
          </div>
          <Badge tone={run.running ? 'accent' : 'ok'}>{run.running ? 'Running' : 'Done'}</Badge>
        </div>
        <div style={{ padding: '.7rem .9rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {run.steps.map((s, i) => {
            const active = i === run.i && run.running;
            const reached = i <= run.i;
            return (
              <div key={s.nodeId + i} className="row gap-2" style={{ alignItems: 'flex-start', opacity: reached ? 1 : 0.4, transition: 'opacity .3s', padding: '.35rem .2rem' }}>
                <span style={{ width: 24, height: 24, borderRadius: 7, flex: 'none', display: 'grid', placeItems: 'center', background: reached ? 'color-mix(in srgb, ' + s.color + ' 16%, transparent)' : 'var(--n-50)', color: reached ? s.color : 'var(--n-400)', boxShadow: active ? '0 0 0 3px color-mix(in srgb, ' + s.color + ' 25%, transparent)' : 'none' }}>
                  <Icon name={s.icon} size={13} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div className="fw-6" style={{ fontSize: '.86rem' }}>{s.label}</div>
                  <div className="t-xs muted" style={{ lineHeight: 1.4 }}>{s.note}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ padding: '.7rem 1.1rem', borderTop: '1px solid var(--line)' }} className="t-xs muted">
          {run.running ? 'Watch the token glide through the canvas.' : `Completed ${run.steps.length} steps with zero human touches.`}
        </div>
      </div>
    );
  }
  return (
    <div style={{ padding: '1.2rem 1.1rem', display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
      <div>
        <div className="stat-label">Inspector</div>
        <div className="fw-7" style={{ fontSize: '1.05rem', marginTop: 4 }}>Select a node to configure it</div>
        <div className="t-sm muted" style={{ marginTop: 4, lineHeight: 1.45 }}>Every step is editable. Change a message, a delay, or a branch rule and it persists instantly.</div>
      </div>
      <div className="panel" style={{ padding: '.9rem 1rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { icon: 'plus', t: 'Add a step', d: 'Click any palette node to drop it in.' },
          { icon: 'gitBranch', t: 'Connect it', d: 'Drag from a colored port to another node.' },
          { icon: 'sparkles', t: 'Let Rook run it', d: 'Purple AI nodes decide and draft for you.' },
          { icon: 'bolt', t: 'Test run', d: 'Watch a record flow through end to end.' },
        ].map(x => (
          <div key={x.t} className="row gap-2" style={{ alignItems: 'flex-start' }}>
            <span style={{ width: 28, height: 28, borderRadius: 8, flex: 'none', display: 'grid', placeItems: 'center', background: 'var(--accent-50)', color: 'var(--accent-600)' }}><Icon name={x.icon} size={15} /></span>
            <div><div className="fw-6" style={{ fontSize: '.9rem' }}>{x.t}</div><div className="t-xs muted">{x.d}</div></div>
          </div>
        ))}
      </div>
      <div className="panel" style={{ padding: '.9rem 1rem', background: 'color-mix(in srgb, var(--accent-purple) 7%, var(--paper))', borderColor: 'color-mix(in srgb, var(--accent-purple) 26%, var(--line))' }}>
        <div className="row gap-1" style={{ color: 'var(--accent-purple)', fontWeight: 700, fontSize: '.86rem' }}><Icon name="sparkles" size={15} /> Only on Ardovo</div>
        <div className="t-sm muted" style={{ marginTop: 4, lineHeight: 1.45 }}>HubSpot and GHL give you a canvas. Ardovo gives you a canvas that thinks. Drop a Rook node anywhere a human judgment call used to block the flow.</div>
      </div>
    </div>
  );
}
