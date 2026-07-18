// Atlas - Rally's semantic map of the book of business. Every deal is a point;
// distance is similarity. Auto-clustered, colorable by cluster/stage/status/
// value, with look-alike detection (click a deal to see its nearest matches -
// "deals like your best wins") and drag-to-select segmentation that hands the
// selection to Rook or a report. Grounded in the live store, computed client
// side (PCA + k-means). NO em-dash / en-dash. ASCII hyphen only.
import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store.js';
import { SectionHeader, StatCard, EmptyState, moneyK, useToast } from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import { STAGE_COLOR } from '../lib/stage-colors.js';
import { buildAtlas, neighborsFor, predictOutcomes } from '../lib/atlas.js';

const CLUSTER_COLORS = ['#0e9f8f', '#2563a8', '#e0752d', '#7c5cf7', '#1a9f6d', '#c0392b', '#d4a017', '#0891b2'];
const W = 1000, H = 640, PAD = 46;
const px = (x) => PAD + x * (W - 2 * PAD);
const py = (y) => PAD + (1 - y) * (H - 2 * PAD);
const radius = (v) => 5 + Math.min(16, Math.log10((v || 0) + 1) * 3.2);

const COLOR_MODES = [
  { key: 'cluster', label: 'Clusters' },
  { key: 'predict', label: 'Predict' },
  { key: 'stage', label: 'Stage' },
  { key: 'status', label: 'Outcome' },
  { key: 'value', label: 'Value' },
];
const winColor = (wp) => `hsl(${Math.round((wp / 100) * 130)}, 68%, 45%)`; // red(0) -> green(130)
const VERDICT_LABEL = { 'likely-win': 'Likely win', 'at-risk': 'At risk', 'coin-flip': 'Coin flip' };

export default function Atlas() {
  useStore();
  const nav = useNavigate();
  const toast = useToast();
  const svgRef = useRef(null);
  const [colorMode, setColorMode] = useState('cluster');
  const [includeClosed, setIncludeClosed] = useState(true);
  const [hover, setHover] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [drag, setDrag] = useState(null);      // { x0,y0,x1,y1 } in svg units
  const [segment, setSegment] = useState([]);  // selected point ids

  const atlas = useMemo(() => buildAtlas({ includeClosed }), [includeClosed]);
  const { points, clusters, empty } = atlas;

  const neighbors = useMemo(() => (selectedId ? neighborsFor(points, selectedId, 6) : []), [selectedId, points]);
  const neighborIds = useMemo(() => new Set(neighbors.map(n => n.id)), [neighbors]);
  const selected = selectedId ? points.find(p => p.id === selectedId) : null;
  const predictions = useMemo(() => predictOutcomes(points, 7), [points]);
  const selPred = selected && selected.status === 'open' ? predictions.get(selected.id) : null;

  // At-risk open deals sitting in the loss region.
  const atRisk = useMemo(() => {
    const rows = [];
    for (const p of points) { const pr = predictions.get(p.id); if (pr && pr.verdict === 'at-risk') rows.push({ p, pr }); }
    return rows.sort((a, b) => b.p.value - a.p.value);
  }, [points, predictions]);
  const atRiskValue = atRisk.reduce((s, r) => s + r.p.value, 0);

  const colorFor = (p) => {
    if (colorMode === 'predict') {
      if (p.status === 'won') return '#1a9f6d';
      if (p.status === 'lost') return '#c0392b';
      const pr = predictions.get(p.id);
      return pr ? winColor(pr.winProb) : '#94a3b8';
    }
    if (colorMode === 'cluster') return CLUSTER_COLORS[p.cluster % CLUSTER_COLORS.length];
    if (colorMode === 'stage') return STAGE_COLOR[p.stage] || '#94a3b8';
    if (colorMode === 'status') return p.status === 'won' ? '#1a9f6d' : p.status === 'lost' ? '#c0392b' : '#0e9f8f';
    const t = Math.min(1, Math.log10((p.value || 0) + 1) / 6.5);
    return `hsl(${Math.round(170 - t * 150)}, 70%, ${Math.round(52 - t * 10)}%)`;
  };

  /* ---- drag-to-select ---- */
  const toSvg = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * W,
      y: ((e.clientY - rect.top) / rect.height) * H,
    };
  };
  const onDown = (e) => {
    if (e.target.dataset?.point) return; // starting on a point = click, not drag
    const s = toSvg(e);
    setDrag({ x0: s.x, y0: s.y, x1: s.x, y1: s.y });
    setSegment([]); setSelectedId(null);
  };
  const onMove = (e) => { if (!drag) return; const s = toSvg(e); setDrag(d => ({ ...d, x1: s.x, y1: s.y })); };
  const onUp = () => {
    if (!drag) return;
    const x0 = Math.min(drag.x0, drag.x1), x1 = Math.max(drag.x0, drag.x1);
    const y0 = Math.min(drag.y0, drag.y1), y1 = Math.max(drag.y0, drag.y1);
    if (Math.abs(x1 - x0) > 8 && Math.abs(y1 - y0) > 8) {
      const ids = points.filter(p => { const X = px(p.x), Y = py(p.y); return X >= x0 && X <= x1 && Y >= y0 && Y <= y1; }).map(p => p.id);
      setSegment(ids);
    }
    setDrag(null);
  };

  const segPoints = points.filter(p => segment.includes(p.id));
  const segValue = segPoints.reduce((s, p) => s + (p.value || 0), 0);

  const askRookAboutSegment = () => {
    const names = segPoints.slice(0, 10).map(p => p.name).join(', ');
    window.dispatchEvent(new CustomEvent('rally:rook', {
      detail: { open: true, prompt: `I lassoed ${segPoints.length} similar deals on the Atlas worth ${moneyK(segValue)}: ${names}. What do these have in common and what is the single best play across them?` },
    }));
  };

  if (empty) {
    return (
      <div className="fade-up">
        <SectionHeader title="Atlas" sub="A living map of your whole book, where distance means similarity." />
        <EmptyState icon="🗺️" title="Not enough deals yet" body="Atlas maps your pipeline once there are a few deals to compare. Add deals and the terrain fills in." />
      </div>
    );
  }

  return (
    <div className="fade-up">
      <SectionHeader
        title="Atlas"
        sub="Every deal placed by similarity, auto-clustered from the live book. Click a deal for look-alikes, or drag a box to segment and hand it to Rook."
        action={
          <div className="row gap-2" style={{ alignItems: 'center' }}>
            <div className="atl-seg">
              {COLOR_MODES.map(m => (
                <button key={m.key} className={`atl-seg-btn${colorMode === m.key ? ' is-on' : ''}`} onClick={() => setColorMode(m.key)}>{m.label}</button>
              ))}
            </div>
            <button className={`btn btn-sm ${includeClosed ? 'btn-ghost' : 'btn-primary'}`} onClick={() => setIncludeClosed(v => !v)}>
              <Icon name={includeClosed ? 'eye' : 'eyeOff'} size={15} /> {includeClosed ? 'All deals' : 'Open only'}
            </button>
          </div>
        }
      />

      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', marginBottom: '1rem' }}>
        <StatCard label="Deals mapped" value={points.length} icon={<Icon name="target" size={18} />} />
        <StatCard label="Clusters found" value={clusters.length} icon={<Icon name="grid" size={18} />} accent="var(--ai)" />
        <StatCard label="Mapped value" value={points.reduce((s, p) => s + p.value, 0)} format={moneyK} icon={<Icon name="dollar" size={18} />} />
        <StatCard label="Look-alike ready" value={points.length} sub="click any deal" icon={<Icon name="sparkles" size={18} />} />
      </div>

      <div className="atl-grid">
        <div className="atl-mapcard">
          <svg ref={svgRef} className="atl-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet"
            onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={() => { onUp(); setHover(null); }}>
            <defs>
              <radialGradient id="atlGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(14,159,143,.10)" /><stop offset="100%" stopColor="rgba(14,159,143,0)" />
              </radialGradient>
            </defs>
            <rect x="0" y="0" width={W} height={H} fill="url(#atlGlow)" />

            {/* cluster halos + labels */}
            {colorMode === 'cluster' && clusters.map(c => (
              <g key={c.id}>
                <circle cx={px(c.cx)} cy={py(c.cy)} r="70" fill={CLUSTER_COLORS[c.id % CLUSTER_COLORS.length]} opacity="0.06" />
                <text x={px(c.cx)} y={py(c.cy) - 78} textAnchor="middle" className="atl-clabel" fill={CLUSTER_COLORS[c.id % CLUSTER_COLORS.length]}>{c.label}</text>
              </g>
            ))}

            {/* neighbor links when a deal is selected */}
            {selected && neighbors.map(n => (
              <line key={n.id} x1={px(selected.x)} y1={py(selected.y)} x2={px(n.x)} y2={py(n.y)} stroke="var(--ai)" strokeWidth="1.4" opacity="0.45" />
            ))}

            {/* points */}
            {points.map(p => {
              const dim = (selectedId && p.id !== selectedId && !neighborIds.has(p.id)) || (segment.length && !segment.includes(p.id));
              const isSel = p.id === selectedId;
              const isNb = neighborIds.has(p.id);
              const inSeg = segment.includes(p.id);
              return (
                <circle key={p.id} data-point="1" cx={px(p.x)} cy={py(p.y)} r={radius(p.value) * (isSel ? 1.5 : 1)}
                  fill={colorFor(p)} stroke={isSel ? 'var(--ink)' : isNb ? 'var(--ai)' : inSeg ? 'var(--accent)' : '#fff'}
                  strokeWidth={isSel || isNb || inSeg ? 2.2 : 1} opacity={dim ? 0.18 : (p.status === 'lost' ? 0.55 : 0.9)}
                  style={{ cursor: 'pointer', transition: 'opacity .2s' }}
                  onMouseEnter={(e) => setHover({ p, x: px(p.x), y: py(p.y) })}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => { setSelectedId(id => id === p.id ? null : p.id); setSegment([]); }} />
              );
            })}

            {/* drag rectangle */}
            {drag && (
              <rect x={Math.min(drag.x0, drag.x1)} y={Math.min(drag.y0, drag.y1)}
                width={Math.abs(drag.x1 - drag.x0)} height={Math.abs(drag.y1 - drag.y0)}
                fill="rgba(14,159,143,.08)" stroke="var(--accent)" strokeDasharray="5 4" strokeWidth="1.5" />
            )}

            {/* hover tooltip */}
            {hover && (
              <g transform={`translate(${Math.min(hover.x + 12, W - 210)}, ${Math.max(hover.y - 46, 8)})`} pointerEvents="none">
                <rect width="200" height="46" rx="8" fill="var(--ink)" opacity="0.95" />
                <text x="10" y="19" className="atl-tt-name" fill="#fff">{hover.p.name.slice(0, 26)}</text>
                <text x="10" y="35" className="atl-tt-sub" fill="#c7cbd6">{moneyK(hover.p.value)} - {hover.p.stageName}</text>
              </g>
            )}
          </svg>

          <div className="atl-hint"><Icon name="sparkles" size={13} /> Click a deal for look-alikes. Drag an empty area to lasso a segment.</div>
        </div>

        <div className="atl-side">
          {selected ? (
            <div className="atl-panel">
              <div className="atl-panel-head">
                <span className="atl-panel-eyebrow" style={{ color: 'var(--ai-600)' }}>Look-alikes</span>
                <button className="atl-x" onClick={() => setSelectedId(null)}><Icon name="x" size={15} /></button>
              </div>
              <button className="atl-selname" onClick={() => nav(`/deals/${selected.id}`)}>{selected.name} <Icon name="chevronRight" size={14} /></button>
              <div className="atl-selmeta">{moneyK(selected.value)} - {selected.stageName} - {selected.status}</div>
              {selPred && (
                <div className="atl-pred" data-verdict={selPred.verdict}>
                  <div className="atl-pred-top">
                    <span className="atl-pred-prob">{selPred.winProb}%</span>
                    <span className="atl-pred-verdict">{VERDICT_LABEL[selPred.verdict]}</span>
                  </div>
                  <div className="atl-pred-sub">Predicted from {selPred.basis.length} similar closed deals - {selPred.confidence}% confidence</div>
                  <div className="atl-pred-basis">
                    {selPred.basis.slice(0, 4).map(b => (
                      <span key={b.id} className="atl-pred-chip" data-w={b.status}>{b.status === 'won' ? 'Won' : 'Lost'}: {b.name.split(' - ')[0]}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="atl-nb-label">Most similar deals</div>
              {neighbors.map(n => (
                <button key={n.id} className="atl-nb" onClick={() => nav(`/deals/${n.id}`)}>
                  <span className="atl-nb-dot" style={{ background: n.status === 'won' ? '#1a9f6d' : n.status === 'lost' ? '#c0392b' : '#0e9f8f' }} />
                  <span className="atl-nb-name">{n.name}</span>
                  <span className="atl-nb-sim">{n.sim}%</span>
                </button>
              ))}
              <button className="btn btn-ghost btn-sm" style={{ marginTop: '.6rem', width: '100%' }}
                onClick={() => window.dispatchEvent(new CustomEvent('rally:rook', { detail: { open: true, prompt: `On the Atlas, ${selected.name} sits closest to: ${neighbors.map(n => `${n.name} (${n.status})`).join(', ')}. Based on those look-alikes, what is the likely outcome and best next move for ${selected.name}?` } }))}>
                <Icon name="sparkles" size={14} /> Ask Rook to read the pattern
              </button>
            </div>
          ) : segment.length ? (
            <div className="atl-panel">
              <div className="atl-panel-head">
                <span className="atl-panel-eyebrow" style={{ color: 'var(--accent-600)' }}>Segment</span>
                <button className="atl-x" onClick={() => setSegment([])}><Icon name="x" size={15} /></button>
              </div>
              <div className="atl-segbig">{segPoints.length}</div>
              <div className="atl-selmeta">deals - {moneyK(segValue)} total</div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: '.8rem', width: '100%' }} onClick={askRookAboutSegment}><Icon name="sparkles" size={14} /> Ask Rook about these</button>
              <button className="btn btn-ghost btn-sm" style={{ marginTop: '.5rem', width: '100%' }} onClick={() => nav('/deals')}><Icon name="target" size={14} /> Open in Deals</button>
              <div className="atl-seglist">
                {segPoints.slice(0, 12).map(p => (
                  <button key={p.id} className="atl-seglist-item" onClick={() => nav(`/deals/${p.id}`)}>{p.name}<span>{moneyK(p.value)}</span></button>
                ))}
                {segPoints.length > 12 && <div className="atl-seglist-more">+{segPoints.length - 12} more</div>}
              </div>
            </div>
          ) : (
            <div className="atl-panel">
              {atRisk.length > 0 && (
                <button className="atl-risk" onClick={() => setColorMode('predict')}>
                  <Icon name="activity" size={16} />
                  <div style={{ minWidth: 0 }}>
                    <div className="atl-risk-big">{atRisk.length} open deals in your loss region</div>
                    <div className="atl-risk-sub">{moneyK(atRiskValue)} at risk, inferred from your own closed history</div>
                  </div>
                </button>
              )}
              <div className="atl-panel-eyebrow">Terrain</div>
              <div className="atl-nb-label" style={{ marginTop: '.5rem' }}>Clusters by value</div>
              {clusters.map(c => (
                <div key={c.id} className="atl-cluster">
                  <span className="atl-cluster-dot" style={{ background: CLUSTER_COLORS[c.id % CLUSTER_COLORS.length] }} />
                  <div className="atl-cluster-body">
                    <div className="atl-cluster-label">{c.label}</div>
                    <div className="atl-cluster-meta">{c.count} deals - {moneyK(c.totalValue)} - {c.domInd}{c.wonRate ? ` - ${c.wonRate}% won` : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AtlasStyles />
    </div>
  );
}

function AtlasStyles() {
  return (
    <style>{`
    .atl-seg { display: inline-flex; background: var(--n-100); border-radius: 999px; padding: 3px; }
    .atl-seg-btn { font-family: inherit; font-size: 12.5px; font-weight: 700; border: none; background: transparent; color: var(--n-600); padding: 6px 12px; border-radius: 999px; cursor: pointer; }
    .atl-seg-btn.is-on { background: var(--paper); color: var(--ink); box-shadow: var(--shadow-sm); }

    .atl-grid { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 1rem; align-items: start; }
    @media (max-width: 940px) { .atl-grid { grid-template-columns: 1fr; } }
    .atl-mapcard { background: var(--paper); border: 1px solid var(--line); border-radius: 16px; padding: 8px; box-shadow: var(--shadow-sm); overflow: hidden; }
    .atl-svg { width: 100%; height: auto; display: block; border-radius: 12px; background:
      radial-gradient(120% 120% at 30% 0%, var(--n-25), var(--paper) 60%); user-select: none; }
    .atl-clabel { font-size: 15px; font-weight: 800; letter-spacing: -.01em; opacity: .85; }
    .atl-tt-name { font-size: 13px; font-weight: 700; }
    .atl-tt-sub { font-size: 11.5px; }
    .atl-hint { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--n-600); padding: 8px 6px 4px; }
    .atl-hint svg { color: var(--ai); }

    .atl-side { position: sticky; top: 84px; }
    .atl-panel { background: var(--paper); border: 1px solid var(--line); border-radius: 16px; padding: 16px; box-shadow: var(--shadow-sm); }
    .atl-panel-head { display: flex; align-items: center; justify-content: space-between; }
    .atl-panel-eyebrow { font-size: 11.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .07em; color: var(--n-500, var(--n-600)); }
    .atl-x { border: none; background: transparent; color: var(--n-600); cursor: pointer; padding: 3px; border-radius: 6px; }
    .atl-x:hover { background: var(--n-100); color: var(--ink); }
    .atl-selname { display: flex; align-items: center; gap: 6px; font-family: inherit; font-size: 16px; font-weight: 800; color: var(--ink); background: none; border: none; padding: 8px 0 2px; cursor: pointer; text-align: left; }
    .atl-selname:hover { color: var(--ai-600); }
    .atl-selmeta { font-size: 12.5px; color: var(--n-600); }
    .atl-segbig { font-size: 40px; font-weight: 900; color: var(--ink); letter-spacing: -.02em; margin-top: 6px; }
    .atl-nb-label { font-size: 11.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: var(--n-600); margin: 14px 0 8px; }
    .atl-nb { display: flex; align-items: center; gap: 8px; width: 100%; font-family: inherit; background: var(--n-25); border: 1px solid var(--line); border-radius: 9px; padding: 8px 10px; margin-bottom: 5px; cursor: pointer; transition: border-color .13s, background .13s; }
    .atl-nb:hover { border-color: var(--ai); background: var(--ai-50); }
    .atl-nb-dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
    .atl-nb-name { flex: 1; min-width: 0; text-align: left; font-size: 13.5px; font-weight: 600; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .atl-nb-sim { font-size: 12px; font-weight: 800; color: var(--ai-600); flex: none; }
    .atl-cluster { display: flex; gap: 9px; align-items: flex-start; padding: 9px 0; border-top: 1px solid var(--line); }
    .atl-cluster:first-of-type { border-top: none; }
    .atl-cluster-dot { width: 10px; height: 10px; border-radius: 50%; margin-top: 3px; flex: none; }
    .atl-cluster-label { font-size: 13.5px; font-weight: 700; color: var(--ink); text-transform: capitalize; }
    .atl-cluster-meta { font-size: 12px; color: var(--n-600); }
    .atl-seglist { margin-top: 12px; max-height: 240px; overflow-y: auto; }
    .atl-seglist-item { display: flex; justify-content: space-between; gap: 8px; width: 100%; font-family: inherit; font-size: 13px; color: var(--ink); background: none; border: none; border-radius: 7px; padding: 6px 8px; cursor: pointer; }
    .atl-seglist-item:hover { background: var(--accent-50); }
    .atl-seglist-item span { color: var(--n-600); flex: none; }
    .atl-seglist-more { font-size: 12px; color: var(--n-600); padding: 6px 8px; }

    .atl-pred { margin-top: 12px; border-radius: 12px; padding: 12px; border: 1px solid var(--line); background: var(--n-25); }
    .atl-pred[data-verdict="likely-win"] { border-color: rgba(26,159,109,.4); background: rgba(26,159,109,.07); }
    .atl-pred[data-verdict="at-risk"] { border-color: rgba(192,57,43,.4); background: rgba(192,57,43,.07); }
    .atl-pred-top { display: flex; align-items: baseline; gap: 8px; }
    .atl-pred-prob { font-size: 30px; font-weight: 900; letter-spacing: -.02em; color: var(--ink); }
    .atl-pred-verdict { font-size: 12.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; color: var(--n-600); }
    .atl-pred-sub { font-size: 12px; color: var(--n-600); margin-top: 2px; }
    .atl-pred-basis { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 9px; }
    .atl-pred-chip { font-size: 11px; font-weight: 700; padding: 3px 7px; border-radius: 999px; color: #fff; max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .atl-pred-chip[data-w="won"] { background: #1a9f6d; }
    .atl-pred-chip[data-w="lost"] { background: #c0392b; }

    .atl-risk { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; font-family: inherit; cursor: pointer; margin-bottom: 14px;
      border: 1px solid rgba(192,57,43,.35); background: rgba(192,57,43,.07); color: var(--ink); border-radius: 12px; padding: 11px 12px; transition: background .13s; }
    .atl-risk:hover { background: rgba(192,57,43,.12); }
    .atl-risk svg { color: #c0392b; flex: none; }
    .atl-risk-big { font-size: 13.5px; font-weight: 800; }
    .atl-risk-sub { font-size: 12px; color: var(--n-600); }
    `}</style>
  );
}
