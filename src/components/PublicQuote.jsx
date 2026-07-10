// PublicQuote - the customer-facing quote document. One component serves two
// jobs: the in-app Preview (inside a Modal) and the print/PDF layout (window.print
// via a scoped print stylesheet). Kept purely presentational - the caller passes
// the quote record, its resolved company/owner, the computed lines + totals, and
// an optional onAccept handler. Set printRoot to mount the print stylesheet + id
// (exactly one instance per page should own it).
import React from 'react';
import { Icon } from './icons.jsx';
import { money, monthDay } from './UI.jsx';
import { lineQuoteTotal, QUOTE_STATUS_META } from '../lib/store-quote.js';

export default function PublicQuote({
  quote, company, accountName, ownerName, lines = [], totals,
  onAccept, printRoot = false, brandName = 'Rally',
}) {
  if (!quote) return null;
  const meta = QUOTE_STATUS_META[quote.status] || QUOTE_STATUS_META.draft;
  const accepted = quote.status === 'accepted';
  const expired = quote.status === 'expired';
  const t = totals || { subtotal: 0, discountTotal: 0, taxTotal: 0, shipping: 0, grandTotal: 0 };

  return (
    <div id={printRoot ? 'rally-print-root' : undefined} className={printRoot ? 'rally-print-root' : 'public-quote'}>
      <div className="pq-doc">
        {/* ---------- letterhead ---------- */}
        <div className="pq-head">
          <div className="pq-brand">
            <span className="pq-mark"><Icon name="zap" size={22} fill="currentColor" stroke={0} /></span>
            <div className="col" style={{ lineHeight: 1.15 }}>
              <strong style={{ fontSize: '1.3rem', letterSpacing: '-.02em' }}>{brandName}</strong>
              <span className="pq-muted" style={{ fontSize: '.82rem' }}>Revenue platform - rally.app</span>
            </div>
          </div>
          <div className="col" style={{ alignItems: 'flex-end', gap: 3, textAlign: 'right' }}>
            <span className="pq-eyebrow">Quote</span>
            <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', letterSpacing: '-.01em' }}>{quote.number}</strong>
            <span className={`pq-status pq-status-${meta.tone}`}>{meta.label}</span>
          </div>
        </div>

        {/* ---------- parties + dates ---------- */}
        <div className="pq-parties">
          <div className="col" style={{ gap: 4 }}>
            <span className="pq-eyebrow">Prepared for</span>
            <strong style={{ fontSize: '1.1rem' }}>{accountName || quote.companyName || 'Customer'}</strong>
            {company?.location && <span className="pq-muted">{company.location}</span>}
            {company?.domain && <span className="pq-muted">{company.domain}</span>}
          </div>
          <div className="col" style={{ gap: 4, alignItems: 'flex-end', textAlign: 'right' }}>
            <span className="pq-eyebrow">Details</span>
            <span className="pq-muted">Prepared by <strong style={{ color: 'var(--ink)' }}>{ownerName || 'Your account team'}</strong></span>
            <span className="pq-muted">Issued {monthDay(quote.createdAt)}</span>
            <span className="pq-muted" style={expired ? { color: 'var(--risk)', fontWeight: 700 } : undefined}>
              Valid until {monthDay(quote.expiresAt)}
            </span>
          </div>
        </div>

        {/* ---------- line items ---------- */}
        <div style={{ overflowX: 'auto' }}>
          <table className="pq-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Item</th>
                <th style={{ textAlign: 'right', width: 70 }}>Qty</th>
                <th style={{ textAlign: 'right', width: 110 }}>Unit price</th>
                <th style={{ textAlign: 'right', width: 70 }}>Disc</th>
                <th style={{ textAlign: 'right', width: 120 }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {lines.map(l => (
                <tr key={l.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{l.name}</div>
                    {l.description && <div className="pq-muted" style={{ fontSize: '.82rem' }}>{l.description}</div>}
                  </td>
                  <td style={{ textAlign: 'right' }}>{l.qty}</td>
                  <td style={{ textAlign: 'right' }}>{money(l.unitPrice)}</td>
                  <td style={{ textAlign: 'right' }}>{l.discount ? `${l.discount}%` : '-'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{money(lineQuoteTotal(l))}</td>
                </tr>
              ))}
              {lines.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--n-600)' }}>No line items on this quote yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ---------- totals ---------- */}
        <div className="pq-totals-wrap">
          <div className="pq-totals">
            <Row label="Subtotal" value={money(t.subtotal)} />
            {t.discountTotal > 0 && <Row label="Discount" value={`- ${money(t.discountTotal)}`} tone="var(--risk)" />}
            <Row label="Tax" value={money(t.taxTotal)} />
            {t.shipping > 0 && <Row label="Shipping" value={money(t.shipping)} />}
            <div className="pq-rule" />
            <Row label="Total due" value={money(t.grandTotal)} big />
          </div>
        </div>

        {/* ---------- terms ---------- */}
        {quote.terms !== '' && (
          <div className="pq-terms">
            <span className="pq-eyebrow">Terms</span>
            <p className="pq-muted" style={{ margin: '.35rem 0 0', lineHeight: 1.6 }}>{quote.terms}</p>
            {quote.notes && <p style={{ margin: '.6rem 0 0', lineHeight: 1.6 }}>{quote.notes}</p>}
          </div>
        )}

        {/* ---------- accept / stamp ---------- */}
        <div className="pq-accept">
          {accepted ? (
            <div className="pq-stamp"><Icon name="check" size={20} /> Accepted - thank you for your business</div>
          ) : (
            <div className="row between wrap" style={{ gap: '1rem', alignItems: 'center' }}>
              <div className="col" style={{ gap: 2 }}>
                <strong style={{ fontSize: '1.05rem' }}>Ready to move forward?</strong>
                <span className="pq-muted">Accept this quote to lock in pricing before it expires.</span>
              </div>
              {onAccept && (
                <button className="pq-accept-btn no-print" onClick={onAccept}>
                  <Icon name="check" size={18} /> Accept quote
                </button>
              )}
            </div>
          )}
        </div>

        <div className="pq-foot pq-muted">
          {brandName} - rally.app - This document was generated for {accountName || quote.companyName || 'the customer'} and is confidential.
        </div>
      </div>

      <style>{`
        .public-quote, .rally-print-root { color: var(--ink); }
        .pq-doc { display: flex; flex-direction: column; gap: 1.4rem; }
        .pq-head { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start;
          padding-bottom: 1.2rem; border-bottom: 2px solid var(--ink); }
        .pq-brand { display: flex; gap: .7rem; align-items: center; min-width: 0; }
        .pq-mark { width: 42px; height: 42px; border-radius: 11px; display: grid; place-items: center; flex: none;
          background: linear-gradient(135deg, #6d5cf7, #4a3ce0); color: #fff; }
        .pq-muted { color: var(--n-600); }
        .pq-eyebrow { font-size: .7rem; font-weight: 700; letter-spacing: .09em; text-transform: uppercase; color: var(--n-600); }
        .pq-status { padding: .18rem .6rem; border-radius: var(--r-pill); font-size: .78rem; font-weight: 700; margin-top: 2px; }
        .pq-status-default { background: var(--n-100); color: var(--n-600); }
        .pq-status-info { background: var(--info-bg, #e6effb); color: var(--info, #2563a8); }
        .pq-status-ok { background: var(--ok-bg, #e4f5ec); color: var(--ok, #1a7f52); }
        .pq-status-risk { background: var(--risk-bg, #fbe8e6); color: var(--risk, #c0392b); }
        .pq-parties { display: flex; justify-content: space-between; gap: 1.5rem; flex-wrap: wrap; }
        .pq-table { width: 100%; border-collapse: collapse; font-size: 16px; }
        .pq-table thead th { padding: .55rem .4rem; font-size: .72rem; font-weight: 700; letter-spacing: .05em;
          text-transform: uppercase; color: var(--n-600); border-bottom: 1px solid var(--line-strong); }
        .pq-table tbody td { padding: .7rem .4rem; vertical-align: top; border-bottom: 1px solid var(--line); }
        .pq-totals-wrap { display: flex; justify-content: flex-end; }
        .pq-totals { min-width: 300px; display: flex; flex-direction: column; gap: .35rem; }
        .pq-row { display: flex; justify-content: space-between; align-items: baseline; }
        .pq-rule { border-top: 2px solid var(--ink); margin: .45rem 0 .2rem; }
        .pq-terms { border-top: 1px solid var(--line); padding-top: 1.1rem; }
        .pq-accept { border-radius: var(--r-md); border: 1px solid var(--line); background: var(--n-50, rgba(0,0,0,.02)); padding: 1.1rem 1.25rem; }
        .pq-accept-btn { display: inline-flex; align-items: center; gap: .5rem; border: none; cursor: pointer;
          background: linear-gradient(135deg, #6d5cf7, #4a3ce0); color: #fff; font-weight: 700; font-size: 1rem;
          padding: .75rem 1.4rem; border-radius: var(--r-sm); box-shadow: var(--accent-glow, 0 8px 24px -6px rgba(91,75,245,.6));
          transition: transform .15s var(--ease), box-shadow .15s var(--ease); }
        .pq-accept-btn:hover { transform: translateY(-1px); }
        .pq-stamp { display: inline-flex; align-items: center; gap: .55rem; font-weight: 800; font-size: 1.05rem;
          color: var(--ok, #1a7f52); }
        .pq-foot { font-size: .78rem; text-align: center; padding-top: .4rem; }
        ${printRoot ? `
        @media screen { .rally-print-root { display: none; } }
        @media print {
          body * { visibility: hidden !important; }
          #rally-print-root, #rally-print-root * { visibility: visible !important; }
          #rally-print-root { position: absolute; left: 0; top: 0; width: 100%; display: block !important;
            padding: 8mm; background: #fff; }
          .no-print { display: none !important; }
          @page { margin: 12mm; }
        }` : ''}
      `}</style>
    </div>
  );
}

function Row({ label, value, tone, big }) {
  return (
    <div className="pq-row">
      <span style={{ fontWeight: big ? 800 : 600, fontSize: big ? '1.1rem' : '.95rem', color: big ? 'var(--ink)' : 'var(--n-600)' }}>{label}</span>
      <span style={{ fontWeight: big ? 800 : 700, fontSize: big ? '1.5rem' : '.98rem', color: tone || 'var(--ink)' }}>{value}</span>
    </div>
  );
}
