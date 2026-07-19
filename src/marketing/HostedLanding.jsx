// ============================================================
// /l/:slug - the PUBLIC hosted landing-page renderer.
//
// Engine 6 (Marketing Hub unification): a landing page is authored with
// the SAME block-model visual designer as email. This page renders the
// page's `design` document full-width and browser-native via
// email-blocks.renderDoc(design, { target: 'landing', fragment: true }),
// then mounts the LINKED Ardovo form (by formId) below it using the same
// FormRenderer that powers /f/:formId - so a submission creates a real
// contact, fires rally:form-submit (which the automation engine listens
// to), tracks form analytics, and here also logs a landing submission so
// funnels + attribution roll up real events.
//
// Views are counted once per hosted load (recordView). With no linked
// form the page still works (design + optional page-level CTA). Mounted
// inside the marketing Routes block. NO em-dash / en-dash. ASCII only.
// ============================================================
import React, { useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getPublishedPageBySlug, recordSubmission, recordView, useLanding,
} from '../lib/landing-pages.js';
import { renderDoc } from '../lib/email-blocks.js';
import { resolveForm } from '../lib/forms.js';
import FormRenderer from '../components/forms/FormRenderer.jsx';

// Lightweight head manager: set title + description for the served page.
function usePageHead(page) {
  useEffect(() => {
    if (!page) return;
    const prevTitle = document.title;
    const title = (page.seo && page.seo.title) || page.title || 'Ardovo';
    document.title = title;
    let meta = document.querySelector('meta[name="description"]');
    let created = false;
    let prevDesc = null;
    const desc = (page.seo && page.seo.description) || '';
    if (desc) {
      if (!meta) { meta = document.createElement('meta'); meta.setAttribute('name', 'description'); document.head.appendChild(meta); created = true; }
      prevDesc = meta.getAttribute('content');
      meta.setAttribute('content', desc);
    }
    return () => {
      document.title = prevTitle;
      if (meta) { if (created) meta.remove(); else if (prevDesc != null) meta.setAttribute('content', prevDesc); }
    };
  }, [page]);
}

export default function HostedLanding() {
  const { slug } = useParams();
  useLanding();   // re-render if the page is published/edited in another tab
  const page = useMemo(() => getPublishedPageBySlug(slug), [slug]);
  const form = useMemo(() => (page && page.formId ? resolveForm(page.formId) : null), [page && page.formId]);

  usePageHead(page);

  // Render the shared-designer document as an inline fragment.
  const designHtml = useMemo(
    () => (page ? renderDoc(page.design, { target: 'landing', fragment: true }) : ''),
    [page && page.updatedAt, page && page.id]
  );

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
        <Link to="/" className="mkt-btn mkt-btn-primary">Back to Ardovo</Link>
      </div>
    );
  }

  const accent = (page.design && page.design.settings && page.design.settings.accent) || '#5b4bf5';

  return (
    <div>
      {/* the shared-designer page */}
      <div dangerouslySetInnerHTML={{ __html: designHtml }} />

      {/* linked lead-capture form (real forms engine) */}
      {form && (
        <section id="form" style={{ scrollMarginTop: 90, padding: '8px 18px 64px' }}>
          <div style={{ maxWidth: Math.max(320, Math.min(900, Number(form.style?.width) || 560)), margin: '0 auto' }}>
            <FormRenderer form={form} mode="live"
              onSubmitted={(out) => { if (out && out.ok) recordSubmission(page.id, (out.submission && out.submission.data) || {}); }} />
          </div>
        </section>
      )}

      {/* optional page-level CTA */}
      {page.ctaLabel && page.ctaHref && (
        <section style={{ padding: '8px 18px 72px', textAlign: 'center' }}>
          <a href={page.ctaHref} className="mkt-btn mkt-btn-primary"
            style={{ display: 'inline-block', background: accent, color: '#fff', padding: '14px 28px', borderRadius: 12, fontWeight: 800, textDecoration: 'none' }}>
            {page.ctaLabel}
          </a>
        </section>
      )}

      {/* powered-by mark */}
      <div style={{ textAlign: 'center', padding: '0 0 48px', fontSize: 13, color: '#8b8ff5' }}>
        Powered by <Link to="/" style={{ color: '#5b4bf5', fontWeight: 700 }}>Ardovo</Link>
      </div>
    </div>
  );
}
