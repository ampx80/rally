// DocRender - the beautiful, print-ready proposal document. One component
// serves three jobs: the live builder canvas (each block wrapped in edit
// chrome by DocBuilder), the Preview modal, and the window.print PDF layout
// (via a scoped print stylesheet + page breaks). BlockBody is the pure visual
// for a single block and is exported so the builder can render identical output
// inside its editing shell. Pricing tables bind LIVE via resolvePricing so the
// money on the page always equals the money in the CRM.
import React from 'react';
import { Icon } from './icons.jsx';
import { Avatar, money } from './UI.jsx';
import { resolvePricing } from '../lib/store-docs.js';

/* ---------- one block, purely presentational ---------- */
export function BlockBody({ block, accent = '#5b4bf5', doc }) {
  const c = block.config || {};
  switch (block.type) {
    case 'cover':
      return (
        <div className="dr-cover" style={{ background: `linear-gradient(135deg, ${accent}, ${shade(accent, -28)} 70%, ${shade(accent, -50)})` }}>
          <div className="dr-cover-glow" />
          <div className="dr-cover-inner">
            {c.eyebrow && <div className="dr-cover-eyebrow">{c.eyebrow}</div>}
            <h1 className="dr-cover-title">{c.title || 'Proposal'}</h1>
            {c.subtitle && <p className="dr-cover-sub">{c.subtitle}</p>}
            <div className="dr-cover-meta">
              {c.preparedFor && <div className="dr-cover-party"><span>Prepared for</span><strong>{c.preparedFor}</strong></div>}
              {c.preparedBy && <div className="dr-cover-party"><span>Prepared by</span><strong>{c.preparedBy}</strong></div>}
            </div>
          </div>
          <div className="dr-cover-mark"><Icon name="zap" size={20} fill="currentColor" stroke={0} /> Ardovo</div>
        </div>
      );

    case 'heading':
      return (
        <div className="dr-heading" style={{ textAlign: c.align || 'left' }}>
          <h2 style={{ margin: 0 }}>{c.text || 'Section heading'}</h2>
          <span className="dr-heading-rule" style={{ background: accent, marginLeft: c.align === 'center' ? 'auto' : 0, marginRight: c.align === 'center' ? 'auto' : c.align === 'right' ? 0 : undefined }} />
        </div>
      );

    case 'text':
      return <div className="dr-text">{(c.text || '').split('\n').map((line, i) => <p key={i} style={{ margin: i ? '.7rem 0 0' : 0 }}>{line || ' '}</p>)}</div>;

    case 'pricingTable': {
      const { lines, total, source } = resolvePricing(c);
      return (
        <div className="dr-pricing">
          <div className="row between" style={{ alignItems: 'baseline', marginBottom: '.6rem' }}>
            <strong style={{ fontSize: '1.15rem' }}>{c.title || 'Investment'}</strong>
            {source !== 'manual' && <span className="dr-live" style={{ color: accent }}><span className="dr-live-dot" style={{ background: accent }} /> Live from {source}</span>}
          </div>
          <table className="dr-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Item</th>
                <th style={{ textAlign: 'right', width: 64 }}>Qty</th>
                <th style={{ textAlign: 'right', width: 110 }}>Unit</th>
                <th style={{ textAlign: 'right', width: 128 }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', padding: '1.3rem', color: 'var(--n-600)' }}>No line items yet. Link a deal or add lines in the inspector.</td></tr>}
              {lines.map(l => (
                <tr key={l.id}>
                  <td style={{ fontWeight: 600 }}>{l.name}{l.discount ? <span className="dr-disc"> {l.discount}% off</span> : null}</td>
                  <td style={{ textAlign: 'right' }} className="tnum">{l.qty}</td>
                  <td style={{ textAlign: 'right' }} className="tnum">{money(l.unitPrice)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }} className="tnum">{money(l.total)}</td>
                </tr>
              ))}
            </tbody>
            {lines.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={3} style={{ textAlign: 'right', fontWeight: 700, paddingTop: '.7rem' }}>Total</td>
                  <td style={{ textAlign: 'right', paddingTop: '.7rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '1.35rem', color: accent }} className="tnum">{money(total)}</span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
          {c.note && <p className="dr-note">{c.note}</p>}
        </div>
      );
    }

    case 'team': {
      const members = c.members || [];
      return (
        <div className="dr-team">
          {c.title && <strong style={{ fontSize: '1.15rem', display: 'block', marginBottom: '.9rem' }}>{c.title}</strong>}
          <div className="dr-team-grid">
            {members.map((m, i) => (
              <div key={i} className="dr-team-card">
                <Avatar name={m.name || '?'} size={46} />
                <div className="col" style={{ gap: 1, minWidth: 0 }}>
                  <strong>{m.name || 'Team member'}</strong>
                  <span className="dr-muted" style={{ fontWeight: 600, color: accent }}>{m.title}</span>
                  {m.blurb && <span className="dr-muted" style={{ fontSize: '.85rem' }}>{m.blurb}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'testimonial':
      return (
        <div className="dr-quote" style={{ borderColor: accent }}>
          <div className="dr-quote-mark" style={{ color: accent }}>&ldquo;</div>
          <p className="dr-quote-text">{c.quote}</p>
          <div className="dr-quote-by">
            <strong>{c.author}</strong>
            <span className="dr-muted">{[c.role, c.company].filter(Boolean).join(', ')}</span>
          </div>
        </div>
      );

    case 'image':
      return c.url ? (
        <figure className="dr-figure">
          <img src={c.url} alt={c.caption || ''} style={{ width: '100%', maxHeight: c.height || 260, objectFit: 'cover', borderRadius: 'var(--r-md)' }} />
          {c.caption && <figcaption className="dr-muted">{c.caption}</figcaption>}
        </figure>
      ) : (
        <div className="dr-image-empty" style={{ height: c.height || 260 }}>
          <Icon name="grid" size={26} />
          <span>Paste an image URL in the inspector</span>
        </div>
      );

    case 'divider':
      return <hr className="dr-divider" />;

    case 'signature':
      return (
        <div className="dr-sign">
          <div className="dr-sign-line">
            <span className="dr-sign-rule" />
            <span className="dr-muted">{c.partyLabel || 'Signature'}{c.name ? ` - ${c.name}` : ''}{c.title ? `, ${c.title}` : ''}</span>
          </div>
          <div className="dr-sign-line" style={{ maxWidth: 220 }}>
            <span className="dr-sign-rule" />
            <span className="dr-muted">{c.dateLabel || 'Date'}</span>
          </div>
        </div>
      );

    case 'cta':
      return (
        <div className="dr-cta" style={{ background: `linear-gradient(135deg, ${accent}, ${shade(accent, -30)})` }}>
          <div className="col" style={{ gap: 4, minWidth: 0 }}>
            <strong style={{ fontSize: '1.4rem', color: '#fff' }}>{c.headline}</strong>
            <span style={{ color: 'rgba(255,255,255,.85)' }}>{c.sub}</span>
          </div>
          <button className="dr-cta-btn no-print">{c.buttonText || 'Accept'}</button>
        </div>
      );

    default:
      return null;
  }
}

/* ---------- the full document (preview + print) ---------- */
export default function DocRender({ doc, accent, printRoot = false }) {
  if (!doc) return null;
  const ac = accent || doc.accent || '#5b4bf5';
  return (
    <div id={printRoot ? 'rally-doc-print-root' : undefined} className={printRoot ? 'rally-doc-print-root' : 'dr-page'}>
      <div className="dr-doc">
        {doc.blocks.map(b => (
          <div key={b.id} className={`dr-block dr-block-${b.type}`}>
            <BlockBody block={b} accent={ac} doc={doc} />
          </div>
        ))}
      </div>
      <DocStyles printRoot={printRoot} />
    </div>
  );
}

/* darken/lighten a hex color by pct (-100..100) for gradient depth. */
function shade(hex, pct) {
  const h = String(hex).replace('#', '');
  if (h.length !== 6) return hex;
  const num = parseInt(h, 16);
  const amt = Math.round(2.55 * pct);
  const r = Math.max(0, Math.min(255, (num >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amt));
  const b = Math.max(0, Math.min(255, (num & 0xff) + amt));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

export function DocStyles({ printRoot }) {
  return (
    <style>{`
      .dr-doc { display: flex; flex-direction: column; gap: 1.5rem; color: var(--ink); }
      .dr-block { break-inside: avoid; }
      .dr-muted { color: var(--n-600); }

      .dr-cover { position: relative; overflow: hidden; border-radius: var(--r-lg); padding: 3rem 2.4rem; color: #fff; break-inside: avoid; }
      .dr-cover-glow { position: absolute; top: -60px; right: -40px; width: 320px; height: 320px; border-radius: 50%; background: rgba(255,255,255,.18); filter: blur(30px); pointer-events: none; }
      .dr-cover-inner { position: relative; }
      .dr-cover-eyebrow { font-size: .74rem; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: rgba(255,255,255,.8); }
      .dr-cover-title { color: #fff; font-size: clamp(1.9rem, 4vw, 2.9rem); line-height: 1.08; margin: .6rem 0 0; letter-spacing: -.02em; }
      .dr-cover-sub { color: rgba(255,255,255,.9); font-size: 1.1rem; margin: .8rem 0 0; max-width: 620px; }
      .dr-cover-meta { display: flex; gap: 2.4rem; flex-wrap: wrap; margin-top: 2rem; }
      .dr-cover-party { display: flex; flex-direction: column; gap: 2px; }
      .dr-cover-party span { font-size: .72rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: rgba(255,255,255,.7); }
      .dr-cover-party strong { font-size: 1.05rem; }
      .dr-cover-mark { position: absolute; bottom: 1.4rem; right: 1.8rem; display: inline-flex; align-items: center; gap: .4rem; font-weight: 800; letter-spacing: -.01em; color: rgba(255,255,255,.92); }

      .dr-heading h2 { font-size: clamp(1.4rem, 2.4vw, 1.9rem); letter-spacing: -.02em; }
      .dr-heading-rule { display: block; width: 54px; height: 4px; border-radius: 999px; margin-top: .6rem; }

      .dr-text { font-size: 1.05rem; line-height: 1.65; color: var(--ink-2); }

      .dr-pricing { }
      .dr-live { display: inline-flex; align-items: center; gap: .4rem; font-size: .78rem; font-weight: 700; }
      .dr-live-dot { width: 8px; height: 8px; border-radius: 50%; animation: drPulse 1.8s ease-in-out infinite; }
      @keyframes drPulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
      .dr-table { width: 100%; border-collapse: collapse; font-size: 1rem; }
      .dr-table thead th { padding: .55rem .6rem; font-size: .72rem; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: var(--n-600); border-bottom: 2px solid var(--ink); }
      .dr-table tbody td { padding: .72rem .6rem; border-bottom: 1px solid var(--line); vertical-align: top; }
      .dr-table tfoot td { border-top: 2px solid var(--ink); }
      .dr-disc { font-size: .78rem; font-weight: 600; color: var(--ok); }
      .dr-note { margin: .7rem 0 0; font-size: .85rem; color: var(--n-600); }

      .dr-team-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; }
      .dr-team-card { display: flex; gap: .8rem; align-items: flex-start; padding: 1rem; border: 1px solid var(--line); border-radius: var(--r-md); background: var(--n-25); }
      .dr-team-card strong { font-size: 1rem; }

      .dr-quote { position: relative; border-left: 4px solid; padding: .4rem 0 .4rem 1.5rem; }
      .dr-quote-mark { position: absolute; top: -14px; left: 8px; font-size: 3rem; line-height: 1; font-weight: 800; opacity: .3; }
      .dr-quote-text { font-size: 1.3rem; line-height: 1.5; font-weight: 600; letter-spacing: -.01em; margin: 0; }
      .dr-quote-by { display: flex; gap: .5rem; align-items: baseline; margin-top: .8rem; flex-wrap: wrap; }

      .dr-figure { margin: 0; }
      .dr-figure figcaption { margin-top: .5rem; font-size: .85rem; text-align: center; }
      .dr-image-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .5rem; border: 2px dashed var(--line-strong); border-radius: var(--r-md); color: var(--n-400); font-size: .9rem; }

      .dr-divider { border: none; border-top: 1px solid var(--line); margin: .4rem 0; }

      .dr-sign { display: flex; gap: 2.5rem; flex-wrap: wrap; padding-top: 1rem; }
      .dr-sign-line { flex: 1; min-width: 200px; }
      .dr-sign-rule { display: block; border-bottom: 1.5px solid var(--ink); height: 2.4rem; }
      .dr-sign-line .dr-muted { font-size: .82rem; display: block; margin-top: .35rem; }

      .dr-cta { display: flex; gap: 1.2rem; align-items: center; justify-content: space-between; flex-wrap: wrap; padding: 1.6rem 1.8rem; border-radius: var(--r-lg); }
      .dr-cta-btn { flex: none; border: none; cursor: pointer; background: #fff; color: var(--ink); font-weight: 700; font-size: 1rem; padding: .8rem 1.5rem; border-radius: var(--r-sm); box-shadow: 0 8px 24px rgba(0,0,0,.2); transition: transform .15s var(--ease); }
      .dr-cta-btn:hover { transform: translateY(-1px); }

      ${printRoot ? `
      @media screen { .rally-doc-print-root { display: none; } }
      @media print {
        body * { visibility: hidden !important; }
        #rally-doc-print-root, #rally-doc-print-root * { visibility: visible !important; }
        #rally-doc-print-root { position: absolute; left: 0; top: 0; width: 100%; display: block !important; padding: 0; background: #fff; }
        #rally-doc-print-root .dr-doc { gap: 1.2rem; }
        #rally-doc-print-root .dr-block-cover, #rally-doc-print-root .dr-block-signature, #rally-doc-print-root .dr-block-cta { break-inside: avoid; }
        #rally-doc-print-root .dr-block-heading { break-after: avoid; }
        .no-print { display: none !important; }
        @page { margin: 14mm; }
      }` : ''}
    `}</style>
  );
}
