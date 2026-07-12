// ============================================================
// PIPELINE FORK STUDIO  -  git for your entire pipeline
// Deep-clone the live book into named branches, make speculative edits
// (slide dates, reassign a book, apply a discount policy, advance every
// stage), see a side-by-side diff vs main across forecast / coverage /
// cash-in / per-rep attainment, and cherry-pick which changes to commit.
// 100% additive + non-destructive: branches are structuredClone twins,
// metrics re-run the existing engines via store.withState(), and only an
// explicit commit replays changes through the real writers.
// ============================================================
import React, { useMemo, useState } from 'react';
import {
  getState, useStore, getUsers, userName,
} from '../lib/store.js';
import {
  useBranches, createBranch, deleteBranch, resetBranch, applyMove, MOVES,
  computeMetrics, deltaLines, repDelta, diffDeals, fmtField,
  commitDeals, localNarrative, narrativePrompt,
} from '../lib/fork.js';
import {
  PageTitle, Card, SectionHeader, Button, Badge, Modal, Field, Input, Select,
  AnimatedNumber, GradientText, EmptyState, Avatar, useToast, money, moneyK,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import DataTable from '../components/DataTable.jsx';
import './fork.css';

const fmtMoney = (n) => money(n);
const fmtPct = (n) => `${Math.round(n)}%`;
const signed = (n, fmt) => (n > 0 ? '+' : n < 0 ? '-' : '') + fmt(Math.abs(n));

/* one delta card in the head strip */
function DeltaCard({ line }) {
  const isPct = line.fmt === 'pct';
  const fmt = isPct ? fmtPct : moneyK;
  const up = line.delta > 0;
  const flat = line.delta === 0;
  const tone = flat ? 'flat' : up ? 'up' : 'down';
  return (
    <div className={`fk-delta fk-delta-${tone}`}>
      <span className="t-xs muted fw-6" style={{ letterSpacing: '.02em' }}>{line.label}</span>
      <span className="fk-delta-val">
        <AnimatedNumber value={line.to} format={fmt} />
      </span>
      <span className="fk-delta-chip">
        {flat ? (
          <span className="muted t-xs">no change</span>
        ) : (
          <>
            <Icon name={up ? 'arrowUp' : 'arrowDown'} size={12} />
            {signed(line.delta, fmt)}
          </>
        )}
      </span>
      <span className="t-xs muted fk-delta-from">main {fmt(line.from)}</span>
    </div>
  );
}

export default function ForkStudio() {
  const branches = useBranches();
  const snap = useStore(); // re-render (and refresh main metrics) after a commit
  const toast = useToast();

  const [activeId, setActiveId] = useState(() => branches[0]?.id || null);
  const [newOpen, setNewOpen] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftNote, setDraftNote] = useState('');
  const [slipDays, setSlipDays] = useState(14);
  const [discPct, setDiscPct] = useState(10);
  const reps = useMemo(() => getUsers().filter(u => u.role === 'rep'), [snap]);
  const [reFrom, setReFrom] = useState(reps[0]?.id || '');
  const [reTo, setReTo] = useState(reps[1]?.id || '');

  // keep a valid active branch as the list changes
  const active = branches.find(b => b.id === activeId) || null;

  const mainState = getState();
  const main = useMemo(() => computeMetrics(mainState), [snap]);
  // branch state mutates in place; recompute every render (small dataset)
  const bm = active ? computeMetrics(active.state) : null;
  const diff = active ? diffDeals(mainState, active.state) : [];
  const lines = bm ? deltaLines(main, bm) : [];
  const reps2 = bm ? repDelta(main, bm) : [];

  const openNew = () => { setDraftName(''); setDraftNote(''); setNewOpen(true); };
  const doCreate = () => {
    const b = createBranch(draftName, { note: draftNote });
    setActiveId(b.id);
    setNewOpen(false);
    toast('Branch forked from the live book', 'ok');
  };
  const doDelete = (id) => {
    deleteBranch(id);
    if (activeId === id) setActiveId(null);
    toast('Branch deleted', 'default');
  };
  const doMove = (type, params) => {
    if (!active) return;
    applyMove(active.id, type, params);
  };
  const doCommit = (ids) => {
    if (!active || !ids.length) return;
    const { committed } = commitDeals(active.id, ids);
    toast(`${committed} change${committed === 1 ? '' : 's'} committed to main`, 'ok');
  };
  const askRook = () => {
    if (!active || !bm) return;
    window.dispatchEvent(new CustomEvent('rally:rook', { detail: { prompt: narrativePrompt(active, main, bm, diff) } }));
  };

  const diffCols = [
    {
      key: 'name', header: 'Deal', width: '30%',
      render: (r) => (
        <div className="col" style={{ gap: 2, minWidth: 0 }}>
          <span className="fw-6 clip">{r.name}</span>
          <span className={`fk-tag fk-tag-${r.status}`}>{r.status}</span>
        </div>
      ),
    },
    {
      key: 'changes', header: 'What changed', sortable: false,
      render: (r) => r.changes.length ? (
        <div className="col" style={{ gap: 3 }}>
          {r.changes.map((c, i) => (
            <span key={i} className="fk-change t-xs">
              <span className="muted">{c.label}</span>
              <span className="fk-from">{fmtField(c.kind, c.from)}</span>
              <Icon name="arrowRight" size={11} />
              <span className="fk-to">{fmtField(c.kind, c.to)}</span>
            </span>
          ))}
        </div>
      ) : <span className="muted t-xs">{r.status === 'added' ? 'new in branch' : 'removed in branch'}</span>,
    },
    {
      key: 'valueDelta', header: 'Value delta', align: 'right', width: 130,
      sortValue: (r) => r.valueDelta || 0,
      render: (r) => {
        const d = r.valueDelta || 0;
        if (!d) return <span className="muted">-</span>;
        return <span className={`fw-7 ${d > 0 ? 'fk-pos' : 'fk-neg'}`}>{signed(d, moneyK)}</span>;
      },
    },
    {
      key: 'owner', header: 'Owner', width: 150, sortable: false,
      render: (r) => <span className="t-sm">{userName(r.deal.ownerId)}</span>,
    },
  ];

  return (
    <div className="fk-page">
      <PageTitle
        eyebrow="Analytics / What-if"
        title={<>Pipeline <GradientText>Fork</GradientText></>}
        sub="Git for your entire pipeline. Branch the live book, make speculative edits inside an isolated twin, diff it against main, and cherry-pick what to commit."
        action={<Button onClick={openNew}><Icon name="plus" size={16} /> New branch</Button>}
      />

      {/* branch bar */}
      <div className="fk-branchbar">
        <button className={`fk-branch ${!active ? 'active' : ''}`} onClick={() => setActiveId(null)}>
          <span className="fk-dot" style={{ background: 'var(--n-400)' }} />
          <span className="fw-7">main</span>
          <span className="t-xs muted">live book</span>
        </button>
        {branches.map(b => (
          <button key={b.id} className={`fk-branch ${active?.id === b.id ? 'active' : ''}`} onClick={() => setActiveId(b.id)}>
            <span className="fk-dot" style={{ background: b.color }} />
            <span className="fw-7 clip" style={{ maxWidth: 160 }}>{b.name}</span>
            <span className="t-xs muted">{b.moves.length ? `${b.moves.length} move${b.moves.length === 1 ? '' : 's'}` : 'clean'}</span>
          </button>
        ))}
        {branches.length === 0 && <span className="muted t-sm" style={{ alignSelf: 'center' }}>No branches yet. Fork the live book to start.</span>}
      </div>

      {!active ? (
        branches.length === 0 ? (
          <Card className="fk-empty">
            <div className="fk-empty-mark"><Icon name="gitBranch" size={30} /></div>
            <h3 style={{ margin: '0 0 .35rem' }}>Fork your pipeline like code</h3>
            <p className="muted" style={{ maxWidth: 560, margin: '0 auto 1.1rem' }}>
              A branch is a full, mutable clone of your book of business. Slide every close date, reassign a rep, apply a discount policy, or advance every stage, then watch the forecast, coverage, and cash-in move before a single real record changes.
            </p>
            <Button onClick={openNew}><Icon name="plus" size={16} /> Fork the live book</Button>
          </Card>
        ) : (
          <Card>
            <SectionHeader title="Main" sub={`Live book of business, ${main.quarterLabel}`} />
            <div className="fk-delta-grid" style={{ marginTop: '.4rem' }}>
              {['commit', 'best', 'weighted', 'cashIn', 'pipeline'].map(k => (
                <div key={k} className="fk-delta fk-delta-flat">
                  <span className="t-xs muted fw-6">{({ commit: 'Commit', best: 'Best case', weighted: 'Weighted', cashIn: 'Cash in (won)', pipeline: 'Coverage pipeline' })[k]}</span>
                  <span className="fk-delta-val">{moneyK(main[k])}</span>
                </div>
              ))}
              <div className="fk-delta fk-delta-flat">
                <span className="t-xs muted fw-6">Confidence</span>
                <span className="fk-delta-val">{main.confidence}%</span>
              </div>
            </div>
            <p className="muted t-sm" style={{ marginTop: '1rem' }}>Select a branch above, or fork a new one, to see a side-by-side diff.</p>
          </Card>
        )
      ) : (
        <>
          {/* delta strip */}
          <div className="fk-delta-grid">
            {lines.map(l => <DeltaCard key={l.key} line={l} />)}
          </div>

          {/* moves toolbar */}
          <Card className="fk-moves">
            <div className="row between wrap" style={{ gap: '.6rem', marginBottom: '.7rem' }}>
              <SectionHeader title="Speculative edits" sub="Applied to the branch twin only. Nothing touches main until you commit." />
              <div className="row gap-2">
                <Button variant="ghost" size="sm" onClick={() => resetBranch(active.id)}><Icon name="rotateCcw" size={14} /> Reset</Button>
                <Button variant="ghost" size="sm" onClick={() => doDelete(active.id)}><Icon name="trash" size={14} /> Delete</Button>
              </div>
            </div>
            <div className="fk-move-row">
              <div className="fk-move-cluster">
                <input className="input fk-num" type="number" value={slipDays} min={1} max={120}
                  onChange={e => setSlipDays(Math.max(1, Number(e.target.value) || 1))} aria-label="days" />
                <button className="fk-move-btn" onClick={() => doMove('slip', { days: slipDays })}><Icon name="arrowRight" size={14} /> Slip {slipDays}d</button>
                <button className="fk-move-btn" onClick={() => doMove('pull', { days: slipDays })}><Icon name="arrowLeft" size={14} /> Pull {slipDays}d</button>
              </div>
              <div className="fk-move-cluster">
                <input className="input fk-num" type="number" value={discPct} min={0} max={90}
                  onChange={e => setDiscPct(Math.max(0, Math.min(90, Number(e.target.value) || 0)))} aria-label="discount percent" />
                <button className="fk-move-btn" onClick={() => doMove('discount', { pct: discPct })}><Icon name="dollar" size={14} /> Discount {discPct}%</button>
              </div>
              <button className="fk-move-btn" onClick={() => doMove('boost', { floor: 60 })}><Icon name="trendUp" size={14} /> Boost win %</button>
              <button className="fk-move-btn" onClick={() => doMove('advance')}><Icon name="zap" size={14} /> Advance all stages</button>
              <div className="fk-move-cluster">
                <select className="select fk-sel" value={reFrom} onChange={e => setReFrom(e.target.value)} aria-label="from rep">
                  {reps.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <Icon name="arrowRight" size={13} className="muted" />
                <select className="select fk-sel" value={reTo} onChange={e => setReTo(e.target.value)} aria-label="to rep">
                  {reps.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <button className="fk-move-btn" onClick={() => doMove('reassign', { from: reFrom, to: reTo })}><Icon name="users" size={14} /> Reassign</button>
              </div>
            </div>
            {active.moves.length > 0 && (
              <div className="fk-moves-log">
                {active.moves.map(m => (
                  <span key={m.id} className="fk-move-chip"><Icon name="check" size={12} /> {m.label}</span>
                ))}
              </div>
            )}
          </Card>

          {/* narrative */}
          <Card className="fk-narrative">
            <div className="row gap-2" style={{ alignItems: 'flex-start' }}>
              <span className="fk-rook-mark"><Icon name="sparkles" size={16} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row between wrap" style={{ gap: '.5rem', marginBottom: '.35rem' }}>
                  <span className="fw-7">Rook reads the diff</span>
                  <Button variant="ghost" size="sm" onClick={askRook}><Icon name="sparkles" size={14} /> Ask Rook to narrate</Button>
                </div>
                <p className="t-sm" style={{ margin: 0, lineHeight: 1.55 }}>{localNarrative(active, main, bm, diff)}</p>
              </div>
            </div>
          </Card>

          {/* per-rep attainment delta */}
          {reps2.length > 0 && (
            <Card>
              <SectionHeader title="Per-rep attainment" sub="Booked (closed + commit) against quarterly quota, main vs branch." />
              <div className="fk-reptable">
                {reps2.map(r => (
                  <div key={r.userId} className="fk-reprow">
                    <div className="row gap-2" style={{ minWidth: 0, flex: '1 1 200px' }}>
                      <Avatar name={r.name} size={30} />
                      <div className="col" style={{ minWidth: 0, lineHeight: 1.15 }}>
                        <span className="fw-6 clip t-sm">{r.name}</span>
                        <span className="t-xs muted">quota {moneyK(r.quota)}</span>
                      </div>
                    </div>
                    <div className="fk-repbars">
                      <div className="fk-bar-track"><span className="fk-bar fk-bar-main" style={{ width: `${Math.min(120, r.mainAttain)}%` }} /></div>
                      <div className="fk-bar-track"><span className="fk-bar fk-bar-branch" style={{ width: `${Math.min(120, r.branchAttain)}%`, background: active.color }} /></div>
                    </div>
                    <div className="fk-repnums">
                      <span className="t-xs muted">{r.mainAttain}% <Icon name="arrowRight" size={10} /> <b>{r.branchAttain}%</b></span>
                      <span className={`fk-repdelta ${r.delta > 0 ? 'fk-pos' : r.delta < 0 ? 'fk-neg' : 'muted'}`}>
                        {r.delta === 0 ? 'flat' : `${r.delta > 0 ? '+' : ''}${r.delta}pts`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* diff table + cherry-pick */}
          <div style={{ marginTop: '1.1rem' }}>
            <SectionHeader
              title={`Changes vs main (${diff.length})`}
              sub="Select rows and commit to replay those changes through the real writers. Everything else stays speculative."
            />
            {diff.length === 0 ? (
              <EmptyState icon="🌱" title="No changes yet" body="Apply an edit above and the diff against main shows up here." />
            ) : (
              <DataTable
                columns={diffCols}
                rows={diff}
                searchPlaceholder="Filter changed deals..."
                bulkActions={[{ label: 'Commit selected to main', onClick: doCommit }]}
                initialSort={{ key: 'valueDelta', dir: 'desc' }}
                maxHeight="52vh"
              />
            )}
          </div>
        </>
      )}

      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="Fork the live book" width={480}
        footer={<>
          <Button variant="ghost" onClick={() => setNewOpen(false)}>Cancel</Button>
          <Button onClick={doCreate}><Icon name="gitBranch" size={15} /> Create branch</Button>
        </>}>
        <Field label="Branch name">
          <Input value={draftName} onChange={e => setDraftName(e.target.value)} placeholder="e.g. Aggressive Q3 close" autoFocus />
        </Field>
        <Field label="Note" hint="Optional. What are you testing?">
          <Input value={draftNote} onChange={e => setDraftNote(e.target.value)} placeholder="Slide every date, then see coverage" />
        </Field>
        <p className="muted t-xs" style={{ marginTop: '.4rem' }}>A branch is a full clone of every deal, company, and contact as of now. Edits inside it never touch your live book until you commit.</p>
      </Modal>
    </div>
  );
}
