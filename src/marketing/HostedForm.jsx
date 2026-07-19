// HostedForm.jsx
// PUBLIC hosted page for an Ardovo form. Mounted at /f/:formId inside the
// marketing Routes block (see App.jsx). It resolves the form from the
// local-first forms slice (same origin -> same localStorage as the builder)
// and renders the shared, self-contained widget (FormRenderer) in "live"
// mode. On submit the renderer CREATES or UPDATES a contact through the store,
// LOGS the submission, tracks analytics, and fires window events; it also
// handles multi-step navigation, conditional logic, spam protection, and the
// payment hand-off.
//
// This page adds the public chrome around the widget: a draft banner, a
// collapsible embed/share footer, and the "Powered by Ardovo" mark. It reads
// as one piece whether opened directly or dropped into an <iframe> embed.
//
// ASCII only. NO em-dash / en-dash. ASCII hyphen only.
import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { resolveForm, embedSnippet, hostedUrl } from '../lib/forms.js';
import FormRenderer, { palette } from '../components/forms/FormRenderer.jsx';

export default function HostedForm() {
  const { formId } = useParams();
  const form = useMemo(() => resolveForm(formId), [formId]);

  const [showEmbed, setShowEmbed] = useState(false);
  const [copied, setCopied] = useState('');

  if (!form) {
    return (
      <div style={{ maxWidth: 560, margin: '80px auto', padding: '0 20px', textAlign: 'center', color: '#a3a7ba' }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
        <h1 style={{ color: '#e7e9f0', fontSize: 24, margin: '0 0 8px' }}>Form not found</h1>
        <p style={{ margin: '0 0 20px' }}>This form may have been unpublished or removed.</p>
        <Link to="/" style={{ color: '#8b8ff5', fontWeight: 700 }}>Back to Ardovo</Link>
      </div>
    );
  }

  const style = form.style || {};
  const accent = style.accent || '#0e9f8f';
  const pal = palette(style.theme, accent);
  const isDraft = form.status !== 'published';
  const maxWidth = Math.max(320, Math.min(900, Number(style.width) || 560));

  async function copy(text, key) {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(''), 1600); } catch { /* clipboard blocked */ }
  }

  const url = hostedUrl(form);
  const snippet = embedSnippet(form);

  return (
    <div style={{ maxWidth, margin: '48px auto 64px', padding: '0 18px' }}>
      {isDraft && (
        <div style={{ marginBottom: 14, padding: '8px 12px', borderRadius: 8, background: 'rgba(224,117,45,.14)', border: '1px solid rgba(224,117,45,.35)', color: '#e0752d', fontSize: 12.5, fontWeight: 700 }}>
          Draft preview. This form is not published yet.
        </div>
      )}

      <FormRenderer form={form} mode="live" />

      {/* Share + embed. Present on the hosted page so an owner can grab the snippet. */}
      <div style={{ marginTop: 14, textAlign: 'center' }}>
        <button onClick={() => setShowEmbed(s => !s)} style={{ background: 'none', border: 'none', color: pal.dim, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', letterSpacing: '.02em' }}>
          {showEmbed ? 'Hide embed code' : 'Embed this form'}
        </button>
        {showEmbed && (
          <div style={{ marginTop: 12, textAlign: 'left', background: pal.card, border: `1px solid ${pal.line}`, borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: pal.dim }}>Hosted link</span>
              <button onClick={() => copy(url, 'url')} style={{ background: 'none', border: 'none', color: accent, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>{copied === 'url' ? 'Copied' : 'Copy'}</button>
            </div>
            <code style={{ display: 'block', fontSize: 12.5, color: pal.muted, wordBreak: 'break-all', marginBottom: 14 }}>{url}</code>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: pal.dim }}>Embed snippet</span>
              <button onClick={() => copy(snippet, 'snip')} style={{ background: 'none', border: 'none', color: accent, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>{copied === 'snip' ? 'Copied' : 'Copy'}</button>
            </div>
            <pre style={{ margin: 0, fontSize: 12, color: pal.muted, background: pal.inputBg, border: `1px solid ${pal.inputLine}`, borderRadius: 8, padding: 12, overflowX: 'auto', whiteSpace: 'pre' }}>{snippet}</pre>
          </div>
        )}
        <div style={{ marginTop: 12, fontSize: 12, color: pal.dim }}>
          Powered by <Link to="/" style={{ color: pal.muted, fontWeight: 700 }}>Ardovo</Link>
        </div>
      </div>
    </div>
  );
}
