// BoardroomBrief - the Command Center's window into the Autonomous Revenue
// Council. Auto-convenes a standing memo off the live book (unfiled, no CRM
// writes) and shows the consensus + top directives, one click from the full
// room. Violet marks the AI layer. NO em-dash / en-dash. ASCII only.
import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../icons.jsx';
import { SectionHeader, Badge, relTime } from '../UI.jsx';
import { useBoardroom, autoConvene, latestBrief, fmtMoney } from '../../lib/boardroom.js';

const VOTE = {
  press: { label: 'Press the advantage', tone: 'ok' },
  hold: { label: 'Hold and tighten', tone: 'info' },
  defend: { label: 'Defend the quarter', tone: 'risk' },
};

export default function BoardroomBrief() {
  useBoardroom(); // re-render when the council files or drafts a memo
  const nav = useNavigate();
  useEffect(() => { try { autoConvene(); } catch {} }, []);
  const brief = latestBrief();

  if (!brief) return null;
  const vm = VOTE[brief.vote] || VOTE.hold;
  const m = brief.metrics || {};
  const top = (brief.decisions || []).slice(0, 2);

  return (
    <div className="card card-pad cc-rise" style={{ position: 'relative', overflow: 'hidden', borderColor: 'rgba(124,92,247,.28)' }}>
      <span aria-hidden style={{ position: 'absolute', top: -60, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,92,247,.14), transparent 70%)', pointerEvents: 'none' }} />
      <SectionHeader
        title="The Boardroom"
        sub={`Your revenue council met ${brief.filed ? '' : 'and drafted a memo '}${relTime(brief.filedAt || brief.at)}`}
        action={<Link to="/boardroom" className="link t-sm row gap-1">Open the boardroom <Icon name="chevronRight" size={14} /></Link>}
      />
      <div className="row between wrap" style={{ gap: '1rem', alignItems: 'flex-start', marginTop: '.35rem' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="row gap-2" style={{ alignItems: 'center', marginBottom: '.4rem' }}>
            <Badge tone={vm.tone}>{vm.label}</Badge>
            <span className="t-sm" style={{ color: 'var(--ink-2)' }}>{brief.seats?.length || 6} agents - consensus</span>
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--ink)' }}>{brief.rationale}</div>
        </div>
        <div className="row gap-3 wrap" style={{ flex: 'none' }}>
          {[['Weighted', fmtMoney(m.weighted || 0)], ['Coverage', `${m.coverage || 0}x`], ['Confidence', `${m.confidence || 0}%`]].map(([l, v]) => (
            <div key={l} style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-.02em', color: 'var(--ink)' }}>{v}</div>
              <div className="t-xs" style={{ color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 700 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      {top.length > 0 && (
        <div style={{ marginTop: '.85rem', paddingTop: '.85rem', borderTop: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          {top.map(d => (
            <button key={d.id} type="button" onClick={() => nav(d.to || '/boardroom')} className="row between" style={{ gap: '.75rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, font: 'inherit' }}>
              <span className="row gap-2" style={{ minWidth: 0, alignItems: 'center' }}>
                <Icon name="chevronRight" size={13} style={{ color: 'var(--ai)', flexShrink: 0 }} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)' }}>{d.title}</span>
                </span>
              </span>
              {d.impactLabel && <span className="t-sm" style={{ color: 'var(--accent)', fontWeight: 800, flexShrink: 0 }}>{d.impactLabel}</span>}
            </button>
          ))}
          {!brief.filed && (
            <div className="t-xs" style={{ color: 'var(--ink-2)', marginTop: '.15rem' }}>
              <Icon name="roleShield" size={11} style={{ verticalAlign: '-1px' }} /> Draft memo - open the boardroom to approve and file.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
