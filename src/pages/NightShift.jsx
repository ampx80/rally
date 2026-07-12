// Night Shift - the Diff of Record.
//
// Rook works the whole pipeline overnight (advances deals whose evidence
// outran their stage, drafts follow-ups into a STAGED outbox that never
// sends, and creates next-best tasks). Every proposed change lands here as
// a reversible, git-style diff entry with its provenance (the real signals
// that triggered it) and a rationale. You approve / reject / approve-all;
// every applied change stores its inverse so one click reverts it exactly.
//
// The Mandate is the IAM envelope Rook operates inside: deal-size caps,
// per-deal touch budgets, a volume cap, and per-capability switches.
// Anything outside the lines does NOT execute - it escalates as a
// decision card for a human.
//
// Purely additive: reads the live store + intelligence-data.js, stages
// everything in src/lib/nightshift.js, and only ever calls a store writer
// when you explicitly approve (or revert) an entry here.
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PageTitle, Card, SectionHeader, Button, Badge, useToast, relTime,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import {
  useNightShift, runNightShift, approveProposal, rejectProposal,
  revertProposal, approveAll, dismissProposal, updateMandate,
  nightShiftSummary, DEFAULT_MANDATE, fmtMoney,
} from '../lib/nightshift.js';
import './nightshift.css';

const KIND_META = {
  advance: { label: 'Stage advance', icon: 'trendUp' },
  draft: { label: 'Follow-up draft', icon: 'mail' },
  task: { label: 'Next-best task', icon: 'checkSquare' },
};

/* ---------- Mandate (IAM envelope) editor ---------- */
function Toggle({ on, onChange, children }) {
  return (
    <button type="button" className="ns-toggle" data-on={on} aria-pressed={on} onClick={() => onChange(!on)}>
      <span className="dot" aria-hidden />
      <span>{children}</span>
    </button>
  );
}

function MandatePanel({ mandate }) {
  const [open, setOpen] = useState(false);
  const set = (patch) => updateMandate(patch);
  const numeric = (v, fallback) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : fallback; };
  return (
    <div className="ns-mandate col">
      <button type="button" className="row between" onClick={() => setOpen(o => !o)}
        style={{ padding: '1rem 1.15rem', width: '100%', textAlign: 'left', cursor: 'pointer', background: 'transparent' }}>
        <span className="row gap-2" style={{ alignItems: 'center' }}>
          <span className="row center" style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--accent-50)', color: 'var(--accent-600)', flex: 'none' }}>
            <Icon name="shield" size={18} />
          </span>
          <span className="col" style={{ lineHeight: 1.25 }}>
            <span className="fw-7">Mandate</span>
            <span className="muted t-sm">The envelope Rook may operate inside. Changes outside the lines escalate to you.</span>
          </span>
        </span>
        <span className="row gap-2" style={{ alignItems: 'center', flex: 'none' }}>
          <Badge tone={mandate.enabled ? 'ok' : 'default'}>{mandate.enabled ? 'Autonomy on' : 'Autonomy off'}</Badge>
          <Icon name="chevronDown" size={16} style={{ transform: open ? 'none' : 'rotate(-90deg)', transition: 'transform .15s' }} />
        </span>
      </button>
      {open && (
        <div className="col gap-4 ns-fadein" style={{ padding: '0 1.15rem 1.2rem' }}>
          <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
            <Toggle on={mandate.enabled} onChange={(v) => set({ enabled: v })}>Autonomy master switch</Toggle>
            <Toggle on={mandate.allowStageAdvance} onChange={(v) => set({ allowStageAdvance: v })}>Advance stages</Toggle>
            <Toggle on={mandate.allowDrafts} onChange={(v) => set({ allowDrafts: v })}>Draft follow-ups</Toggle>
            <Toggle on={mandate.allowTasks} onChange={(v) => set({ allowTasks: v })}>Create tasks</Toggle>
            <Toggle on={mandate.noDiscount} onChange={(v) => set({ noDiscount: v })}>Never discount</Toggle>
          </div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '.9rem' }}>
            <label className="col gap-1">
              <span className="t-sm fw-6">Deal-size cap</span>
              <span className="muted t-xs">Rook will not mutate deals above this value.</span>
              <input className="input" type="number" min="0" step="10000" value={mandate.maxDealValue}
                onChange={(e) => set({ maxDealValue: numeric(e.target.value, DEFAULT_MANDATE.maxDealValue) })} />
              <span className="t-xs muted">{fmtMoney(mandate.maxDealValue)}</span>
            </label>
            <label className="col gap-1">
              <span className="t-sm fw-6">Per-deal touch budget</span>
              <span className="muted t-xs">Max autonomous actions per deal each run.</span>
              <input className="input" type="number" min="0" max="10" step="1" value={mandate.maxTouchesPerDeal}
                onChange={(e) => set({ maxTouchesPerDeal: numeric(e.target.value, DEFAULT_MANDATE.maxTouchesPerDeal) })} />
            </label>
            <label className="col gap-1">
              <span className="t-sm fw-6">Volume cap</span>
              <span className="muted t-xs">Max total proposals per overnight run.</span>
              <input className="input" type="number" min="1" max="50" step="1" value={mandate.maxProposalsPerRun}
                onChange={(e) => set({ maxProposalsPerRun: numeric(e.target.value, DEFAULT_MANDATE.maxProposalsPerRun) })} />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- one diff entry ---------- */
function DiffEntry({ p }) {
  const navigate = useNavigate();
  const toast = useToast();
  const meta = KIND_META[p.kind] || KIND_META.task;
  const staged = p.status === 'staged';
  const approved = p.status === 'approved';

  const onApprove = () => { const r = approveProposal(p.id); toast(r.error ? r.error : 'Applied. You can revert it any time.', r.error ? 'risk' : 'ok'); };
  const onReject = () => { rejectProposal(p.id); toast('Rejected. Nothing was changed.'); };
  const onRevert = () => { const r = revertProposal(p.id); toast(r.error ? r.error : 'Reverted. The change was undone.', r.error ? 'risk' : 'warn'); };

  const statusPill = approved
    ? <Badge tone="ok"><Icon name="check" size={12} /> Applied</Badge>
    : p.status === 'reverted' ? <Badge tone="warn">Reverted</Badge>
    : p.status === 'rejected' ? <Badge tone="default">Rejected</Badge>
    : <Badge tone="accent">Staged</Badge>;

  return (
    <div className="ns-entry ns-fadein col" data-kind={p.kind} data-status={p.status}>
      <div className="col gap-3" style={{ padding: '1.05rem 1.15rem' }}>
        <div className="row between" style={{ gap: '.75rem', alignItems: 'flex-start' }}>
          <div className="col gap-1" style={{ minWidth: 0 }}>
            <div className="row gap-2" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="ns-kind" data-kind={p.kind}><Icon name={meta.icon} size={12} /> {meta.label}</span>
              <button className="fw-7 clip" onClick={() => navigate(`/deals/${p.dealId}`)}
                style={{ background: 'transparent', cursor: 'pointer', fontSize: '1.02rem', textAlign: 'left', padding: 0 }}>
                {p.title}
              </button>
            </div>
            <div className="muted t-sm row gap-2" style={{ flexWrap: 'wrap' }}>
              <span className="clip">{p.dealName}</span>
              <span aria-hidden>&middot;</span>
              <span>{fmtMoney(p.value)}</span>
              <span aria-hidden>&middot;</span>
              <span>{p.owner}</span>
            </div>
          </div>
          <div style={{ flex: 'none' }}>{statusPill}</div>
        </div>

        {/* git-style diff */}
        <div className="ns-diff">
          <div className="ns-diff__row del"><span className="gut">-</span><span className="clip">{p.before}</span></div>
          <div className="ns-diff__row add"><span className="gut">+</span><span className="clip">{p.after}</span></div>
        </div>

        {/* rationale */}
        <div className="row gap-2" style={{ alignItems: 'flex-start' }}>
          <Icon name="sparkles" size={15} style={{ color: 'var(--accent)', flex: 'none', marginTop: 2 }} />
          <span className="t-sm" style={{ lineHeight: 1.45 }}>{p.rationale}</span>
        </div>

        {/* staged follow-up draft body */}
        {p.draft && (
          <details>
            <summary className="t-sm fw-6" style={{ cursor: 'pointer', color: 'var(--accent-600)' }}>Preview staged draft (nothing is sent)</summary>
            <pre className="ns-draft" style={{ marginTop: '.6rem' }}>{p.draft}</pre>
          </details>
        )}

        {/* provenance / receipts */}
        <div className="col gap-2">
          <span className="eyebrow" style={{ letterSpacing: '.1em' }}>Provenance</span>
          <ul className="ns-prov">
            {p.provenance.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>

        {/* action row */}
        <div className="row gap-2" style={{ flexWrap: 'wrap', paddingTop: '.15rem' }}>
          {staged && (
            <>
              <Button size="sm" onClick={onApprove}><Icon name="check" size={14} /> Approve</Button>
              <Button size="sm" variant="ghost" onClick={onReject}><Icon name="x" size={14} /> Reject</Button>
            </>
          )}
          {approved && (
            <Button size="sm" variant="ghost" onClick={onRevert}><Icon name="history" size={14} /> Revert</Button>
          )}
          {(p.status === 'reverted' || p.status === 'rejected') && (
            <Button size="sm" variant="quiet" onClick={() => dismissProposal(p.id)}><Icon name="trash" size={14} /> Clear</Button>
          )}
          <span className="spacer" />
          <button className="t-xs muted" onClick={() => navigate(`/deals/${p.dealId}`)}
            style={{ background: 'transparent', cursor: 'pointer' }}>
            Open deal <Icon name="chevronRight" size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- escalations (outside the mandate) ---------- */
function EscalationCard({ e }) {
  const navigate = useNavigate();
  return (
    <div className="ns-escalation col gap-2 ns-fadein" style={{ padding: '1rem 1.1rem' }}>
      <div className="row gap-2" style={{ alignItems: 'center' }}>
        <Icon name="shield" size={16} style={{ color: 'var(--warn)', flex: 'none' }} />
        <span className="fw-7 clip">{e.title}</span>
        <span className="spacer" />
        <Badge tone="warn">Needs you</Badge>
      </div>
      <div className="muted t-sm">{e.reason}</div>
      <div className="t-sm" style={{ lineHeight: 1.4 }}>{e.rationale}</div>
      <div className="row gap-2" style={{ alignItems: 'center' }}>
        <span className="muted t-xs">{e.companyName} &middot; {fmtMoney(e.value)}</span>
        <span className="spacer" />
        <Button size="sm" variant="ghost" onClick={() => navigate(`/deals/${e.dealId}`)}>Handle manually</Button>
      </div>
    </div>
  );
}

/* ---------- hero ---------- */
function Hero({ summary, mandate, onRun, running }) {
  const chips = [
    { v: summary.staged, l: 'Staged' },
    { v: fmtMoney(summary.atStake), l: 'At stake' },
    { v: summary.dealsTouched, l: 'Deals touched' },
    { v: summary.approved, l: 'Applied' },
    { v: summary.escalated, l: 'Escalated' },
  ];
  return (
    <div className="ns-hero">
      <span className="ns-stars" aria-hidden />
      <div className="col gap-4" style={{ position: 'relative', padding: '1.4rem 1.5rem' }}>
        <div className="row between" style={{ gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div className="col gap-1" style={{ minWidth: 0 }}>
            <span className="eyebrow row gap-1" style={{ alignItems: 'center' }}>
              <Icon name="moon" size={13} /> Overnight operator
            </span>
            <span className="fw-8" style={{ fontSize: '1.5rem', letterSpacing: '-.02em' }}>
              {summary.lastRunAt ? `Rook worked your book ${relTime(summary.lastRunAt)}` : 'Rook is standing by'}
            </span>
            <span className="muted t-sm" style={{ maxWidth: 620 }}>
              {mandate.enabled
                ? 'Every change below is a proposal, not a done deal. Nothing was sent and nothing on your deals moved until you approve it. Each approval is reversible in one click.'
                : 'Autonomy is off in your Mandate. Turn it on to let Rook stage overnight proposals for your review.'}
            </span>
          </div>
          <Button className="ns-run-btn" onClick={onRun} disabled={running}>
            <span className="ns-sweep" aria-hidden />
            <Icon name={running ? 'activity' : 'zap'} size={16} />
            {running ? 'Working...' : summary.lastRunAt ? 'Re-run Night Shift' : 'Run Night Shift'}
          </Button>
        </div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '.7rem' }}>
          {chips.map((c) => (
            <div key={c.l} className="ns-chip">
              <div className="v">{c.v}</div>
              <div className="l">{c.l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function NightShift() {
  const ns = useNightShift();
  const toast = useToast();
  const [running, setRunning] = useState(false);
  const summary = useMemo(() => nightShiftSummary(), [ns]);

  const staged = ns.proposals.filter(p => p.status === 'staged');
  const resolved = ns.proposals.filter(p => p.status !== 'staged');

  const onRun = () => {
    if (!ns.mandate.enabled) { toast('Autonomy is off. Turn on the Mandate master switch first.', 'warn'); return; }
    setRunning(true);
    // A short, honest beat so the "overnight pass" reads as work, then compute.
    setTimeout(() => {
      const r = runNightShift();
      setRunning(false);
      toast(r.staged ? `Rook staged ${r.staged} change${r.staged === 1 ? '' : 's'} for review` : 'The book is clean - nothing to propose', r.staged ? 'ok' : 'warn');
    }, 620);
  };

  const onApproveAll = () => {
    const r = approveAll();
    toast(r.approved ? `Applied ${r.approved} change${r.approved === 1 ? '' : 's'}. Each is reversible.` : 'Nothing to apply', r.approved ? 'ok' : 'warn');
  };
  const onRejectAll = () => {
    staged.forEach(p => rejectProposal(p.id));
    toast('Cleared all staged proposals');
  };

  const hasAnyRun = !!ns.lastRunAt;

  return (
    <div className="col gap-4" style={{ maxWidth: 1080, margin: '0 auto' }}>
      <PageTitle
        eyebrow="Automation"
        title="Night Shift"
        sub="Rook's overnight work, presented as a reversible Diff of Record. Approve, reject, or revert - inside a Mandate you control."
      />

      <Hero summary={summary} mandate={ns.mandate} onRun={onRun} running={running} />

      <MandatePanel mandate={ns.mandate} />

      {/* Escalations */}
      {ns.escalations.length > 0 && (
        <Card className="col gap-3" pad>
          <SectionHeader
            eyebrow="Outside the Mandate"
            title={`${ns.escalations.length} escalation${ns.escalations.length === 1 ? '' : 's'} for your call`}
            sub="Rook wanted to act here but the change fell outside your envelope, so it did nothing and handed it back to you."
          />
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '.8rem' }}>
            {ns.escalations.map(e => <EscalationCard key={e.id} e={e} />)}
          </div>
        </Card>
      )}

      {/* Diff of Record */}
      {staged.length > 0 && (
        <div className="col gap-3">
          <SectionHeader
            eyebrow="Diff of record"
            title={`${staged.length} change${staged.length === 1 ? '' : 's'} awaiting your approval`}
            sub="Every line has receipts. Nothing has moved on your deals yet."
          />
          {staged.map(p => <DiffEntry key={p.id} p={p} />)}
          <div className="ns-actionbar row between" style={{ padding: '.8rem 1rem', gap: '.75rem', flexWrap: 'wrap' }}>
            <span className="t-sm fw-6 row gap-2" style={{ alignItems: 'center' }}>
              <Icon name="sparkles" size={15} style={{ color: 'var(--accent)' }} />
              {staged.length} staged &middot; {fmtMoney(summary.atStake)} across {summary.dealsTouched} deal{summary.dealsTouched === 1 ? '' : 's'}
            </span>
            <span className="row gap-2">
              <Button variant="ghost" size="sm" onClick={onRejectAll}><Icon name="x" size={14} /> Reject all</Button>
              <Button size="sm" onClick={onApproveAll}><Icon name="check" size={14} /> Approve all</Button>
            </span>
          </div>
        </div>
      )}

      {/* Resolved history */}
      {resolved.length > 0 && (
        <div className="col gap-3">
          <SectionHeader eyebrow="Ledger" title="Resolved this session" sub="Applied changes stay reversible. Rejected and reverted entries are kept for the record." />
          {resolved.map(p => <DiffEntry key={p.id} p={p} />)}
        </div>
      )}

      {/* Empty state */}
      {hasAnyRun && ns.proposals.length === 0 && ns.escalations.length === 0 && (
        <Card pad className="col center gap-2" style={{ padding: '2.4rem 1rem', textAlign: 'center' }}>
          <Icon name="check" size={28} style={{ color: 'var(--ok)' }} />
          <div className="fw-7">The book is clean</div>
          <div className="muted t-sm" style={{ maxWidth: 420 }}>Rook found nothing worth proposing this run. Every open deal is inside its evidence and its stage.</div>
        </Card>
      )}

      {!hasAnyRun && (
        <Card pad className="col center gap-3" style={{ padding: '2.6rem 1rem', textAlign: 'center' }}>
          <span className="row center" style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--accent-50)', color: 'var(--accent-600)' }}>
            <Icon name="moon" size={24} />
          </span>
          <div className="fw-7" style={{ fontSize: '1.1rem' }}>No run yet</div>
          <div className="muted t-sm" style={{ maxWidth: 460 }}>
            Run Night Shift to have Rook work your pipeline the way it would overnight: advance deals whose evidence outran their stage, draft follow-ups into a staged outbox that never sends, and line up next-best tasks. You will get a reversible Diff of Record to review.
          </div>
          <Button className="ns-run-btn" onClick={onRun} disabled={running}>
            <span className="ns-sweep" aria-hidden />
            <Icon name="zap" size={16} /> Run Night Shift
          </Button>
        </Card>
      )}
    </div>
  );
}
