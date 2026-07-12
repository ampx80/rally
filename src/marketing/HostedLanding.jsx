// ============================================================
// /l/:slug - the PUBLIC hosted landing-page renderer.
// Turns a PUBLISHED landing page (authored in /landing-pages) into a
// gorgeous, animated, mobile-first page: a gradient hero, prose text,
// hosted images, a working lead-capture form, and conversion CTAs.
//
// A form submission is captured locally (recordSubmission), turned into
// a real CRM lead (store-ext createLead), and fires a best-effort
// team notification through /api/landing-notify -> api/_lib-email.js.
// The notification is env-gated: with no RESEND_API_KEY it is a clean
// no-op, so the page never depends on a backend to work.
//
// Mounted inside the marketing Routes block, so it inherits the marketing
// shell (nav + footer). NO em-dash / en-dash. ASCII hyphen only.
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Reveal } from './kit.jsx';
import SmartCTA from '../components/cta/SmartCTA.jsx';
import {
  getPublishedPageBySlug, recordSubmission, recordView, useLanding,
} from '../lib/landing-pages.js';
import { createLead } from '../lib/store-ext.js';

const ACCENT = '#5b4bf5';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Lightweight head manager: set title + description for the served page.
function usePageHead(page) {
  useEffect(() => {
    if (!page) return;
    const prevTitle = document.title;
    const title = (page.seo && page.seo.title) || page.title || 'Rally';
    document.title = title;
    let meta = document.querySelector('meta[name="description"]');
    let created = false;
    const desc = (page.seo && page.seo.description) || '';
    if (desc) {
      if (!meta) { meta = document.createElement('meta'); meta.setAttribute('name', 'description'); document.head.appendChild(meta); created = true; }
      var prevDesc = meta.getAttribute('content');
      meta.setAttribute('content', desc);
    }
    return () => {
      document.title = prevTitle;
      if (meta) { if (created) meta.remove(); else if (prevDesc != null) meta.setAttribute('content', prevDesc); }
    };
  }, [page]);
}

/* ---------- block renderers ---------- */

function HeroBlock({ b }) {
  const centered = (b.align || 'center') === 'center';
  return (
    <section style={{ position: 'relative', overflow: 'hidden', padding: 'clamp(64px, 12vw, 132px) 0 clamp(48px, 8vw, 92px)' }}>
      <span aria-hidden style={{ position: 'absolute', inset: '-20% -10% auto -10%', height: '130%', background: `radial-gradient(60% 60% at 50% 0%, ${ACCENT}1f, transparent 70%)`, pointerEvents: 'none' }} />
      <div className="mkt-wrap" style={{ position: 'relative', textAlign: centered ? 'center' : 'left' }}>
        {b.eyebrow && <div className="mkt-eyebrow" style={{ marginBottom: 16 }}>{b.eyebrow}</div>}
        <h1 className="mkt-h1" style={{ fontSize: 'clamp(2.6rem, 6vw, 4.6rem)', maxWidth: 940, marginInline: centered ? 'auto' : 0 }}>{b.headline}</h1>
        {b.sub && <p className="mkt-lead" style={{ marginTop: 22, maxWidth: 660, marginInline: centered ? 'auto' : 0 }}>{b.sub}</p>}
        {b.ctaLabel && (
          <div style={{ marginTop: 34 }}>
            <SmartCTA variant="minimal" align={b.align || 'center'} buttonLabel={b.ctaLabel} buttonHref={b.ctaHref || '#form'} accent={ACCENT} />
          </div>
        )}
      </div>
    </section>
  );
}

function TextBlock({ b }) {
  const centered = (b.align || 'left') === 'center';
  const paras = String(b.body || '').split(/\n{2,}/).filter(Boolean);
  return (
    <section style={{ padding: 'clamp(28px, 5vw, 52px) 0' }}>
      <div className="mkt-wrap" style={{ maxWidth: 820, textAlign: centered ? 'center' : 'left' }}>
        <Reveal>
          {b.heading && <h2 className="mkt-h2" style={{ fontSize: 'clamp(1.7rem, 3.4vw, 2.5rem)', marginBottom: 16 }}>{b.heading}</h2>}
          {paras.map((p, i) => (
            <p key={i} className="mkt-body" style={{ fontSize: 18, lineHeight: 1.7, color: 'var(--m-ink2)', margin: i ? '14px 0 0' : 0, maxWidth: 720, marginInline: centered ? 'auto' : 0 }}>{p}</p>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

function ImageBlock({ b }) {
  if (!b.url) return null;
  return (
    <section style={{ padding: 'clamp(24px, 4vw, 44px) 0' }}>
      <div className="mkt-wrap" style={{ maxWidth: 960 }}>
        <Reveal>
          <figure style={{ margin: 0 }}>
            <img src={b.url} alt={b.alt || ''} loading="lazy" style={{ width: '100%', height: 'auto', borderRadius: 20, border: '1px solid var(--m-line)', boxShadow: 'var(--m-shadow-md)', display: 'block' }} />
            {b.caption && <figcaption style={{ marginTop: 12, fontSize: 14, color: 'var(--m-ink3)', textAlign: 'center' }}>{b.caption}</figcaption>}
          </figure>
        </Reveal>
      </div>
    </section>
  );
}

function FormBlock({ b, page }) {
  const fields = Array.isArray(b.fields) ? b.fields : [];
  const [values, setValues] = useState({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  const set = (k, v) => setValues(prev => ({ ...prev, [k]: v }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    // Validate required fields + any email field.
    for (const f of fields) {
      const val = String(values[f.key] || '').trim();
      if (f.required && !val) { setErr(`${f.label} is required.`); return; }
      if (f.type === 'email' && val && !EMAIL_RE.test(val)) { setErr('Enter a valid email address.'); return; }
    }
    setBusy(true);
    try {
      const data = {};
      for (const f of fields) data[f.key] = String(values[f.key] || '').trim();

      // 1) Record the raw submission on the page.
      recordSubmission(page.id, data);

      // 2) Turn it into a CRM lead (additive write; needs a first name).
      const firstName = data.firstName || data.name || (data.email ? data.email.split('@')[0] : '');
      if (firstName) {
        createLead({
          firstName,
          lastName: data.lastName || '',
          company: data.company || '',
          title: data.title || '',
          email: data.email || '',
          source: b.source || 'Landing page',
        });
      }

      // 3) Best-effort team notification. Env-gated + never blocks the UI.
      try {
        await fetch('/api/landing-notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            page: { slug: page.slug, title: page.title },
            submission: data,
          }),
        });
      } catch { /* notification is best-effort; local capture already succeeded */ }

      setDone(true);
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '13px 15px', borderRadius: 11,
    border: '1.5px solid var(--m-line2)', background: '#fff',
    fontSize: 16, color: 'var(--m-ink)', fontFamily: 'inherit', boxSizing: 'border-box',
  };

  return (
    <section id="form" style={{ padding: 'clamp(36px, 6vw, 72px) 0', scrollMarginTop: 90 }}>
      <div className="mkt-wrap" style={{ maxWidth: 640 }}>
        <Reveal>
          <div className="mkt-card mkt-card-glow" style={{ padding: 'clamp(26px, 4vw, 40px)' }}>
            {done ? (
              <div style={{ textAlign: 'center', padding: '18px 0' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${ACCENT}18`, color: ACCENT }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
                </div>
                <h3 style={{ margin: 0, fontSize: 22, color: 'var(--m-ink)' }}>You are all set</h3>
                <p style={{ margin: '10px 0 0', color: 'var(--m-ink2)', fontSize: 16, lineHeight: 1.55 }}>{b.successMessage || 'Thanks. We will be in touch shortly.'}</p>
              </div>
            ) : (
              <form onSubmit={onSubmit} noValidate>
                {b.heading && <h2 className="mkt-h2" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.1rem)', marginBottom: 6 }}>{b.heading}</h2>}
                {b.sub && <p className="mkt-body" style={{ margin: '0 0 20px', color: 'var(--m-ink2)', fontSize: 16, lineHeight: 1.55 }}>{b.sub}</p>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {fields.map((f) => (
                    <label key={f.key} style={{ display: 'block' }}>
                      <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--m-ink2)', marginBottom: 6 }}>
                        {f.label}{f.required ? ' *' : ''}
                      </span>
                      {f.type === 'textarea' ? (
                        <textarea rows={4} value={values[f.key] || ''} onChange={e => set(f.key, e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} />
                      ) : (
                        <input type={f.type === 'email' ? 'email' : f.type === 'tel' ? 'tel' : 'text'} value={values[f.key] || ''} onChange={e => set(f.key, e.target.value)} style={inputStyle} />
                      )}
                    </label>
                  ))}
                </div>
                {err && <div role="alert" style={{ marginTop: 14, color: '#b3261e', fontSize: 14, fontWeight: 600 }}>{err}</div>}
                <button type="submit" disabled={busy} style={{
                  marginTop: 22, width: '100%', padding: '15px 24px', borderRadius: 12, border: 'none',
                  background: busy ? `${ACCENT}99` : `linear-gradient(100deg, ${ACCENT}, #7c5cf7)`,
                  color: '#fff', fontSize: 17, fontWeight: 800, cursor: busy ? 'not-allowed' : 'pointer',
                  boxShadow: `0 12px 26px -10px ${ACCENT}99`, fontFamily: 'inherit',
                }}>
                  {busy ? 'Sending...' : (b.submitLabel || 'Submit')}
                </button>
                <p style={{ margin: '14px 0 0', fontSize: 12.5, color: 'var(--m-ink3)', textAlign: 'center' }}>
                  We respect your inbox. No spam, unsubscribe anytime.
                </p>
              </form>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function CtaBlock({ b }) {
  return (
    <section style={{ padding: 'clamp(36px, 6vw, 72px) 0' }}>
      <div className="mkt-wrap" style={{ maxWidth: 1000 }}>
        <Reveal>
          <SmartCTA
            variant={b.style === 'inline' ? 'inline' : 'band'}
            headline={b.headline}
            sub={b.sub}
            buttonLabel={b.buttonLabel}
            buttonHref={b.buttonHref || '/app'}
            accent={ACCENT}
          />
        </Reveal>
      </div>
    </section>
  );
}

function renderBlock(b, page) {
  switch (b.type) {
    case 'hero': return <HeroBlock key={b.id} b={b} />;
    case 'text': return <TextBlock key={b.id} b={b} />;
    case 'image': return <ImageBlock key={b.id} b={b} />;
    case 'form': return <FormBlock key={b.id} b={b} page={page} />;
    case 'cta': return <CtaBlock key={b.id} b={b} />;
    default: return null;
  }
}

/* ---------- page ---------- */

export default function HostedLanding() {
  const { slug } = useParams();
  useLanding();   // re-render if the page is published/edited in another tab
  const page = useMemo(() => getPublishedPageBySlug(slug), [slug]);

  usePageHead(page);

  // Count the view once per mount for a real published page.
  useEffect(() => {
    if (page) recordView(page.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page && page.id]);

  if (!page) {
    return (
      <div className="mkt-wrap" style={{ padding: '120px 0', textAlign: 'center', minHeight: '60vh' }}>
        <div className="mkt-eyebrow" style={{ marginBottom: 12 }}>Page not found</div>
        <h1 className="mkt-h2" style={{ marginBottom: 14 }}>This page is not available</h1>
        <p className="mkt-lead" style={{ maxWidth: 520, margin: '0 auto 28px' }}>
          The landing page you are looking for is unpublished or does not exist.
        </p>
        <Link to="/" className="mkt-btn mkt-btn-primary">Back to Rally</Link>
      </div>
    );
  }

  return (
    <div>
      {(page.blocks || []).map(b => renderBlock(b, page))}
    </div>
  );
}
