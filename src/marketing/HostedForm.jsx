// HostedForm.jsx
// PUBLIC hosted page for a Rally form. Mounted at /f/:formId inside the
// marketing Routes block (see App.jsx). It resolves the form from the
// local-first forms slice (same origin -> same localStorage as the builder),
// renders a real, self-contained widget, and on submit CREATES a contact
// through the store + LOGS the submission (submitForm), then fires the
// optional owner notification (env-gated, never blocks).
//
// The widget is self-styled (its own accent + theme) so it reads as one piece
// whether opened directly or dropped into an <iframe> embed. A collapsible
// footer exposes the copyable embed snippet + hosted link.
//
// ASCII only. NO em-dash / en-dash. ASCII hyphen only.
import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  resolveForm, submitForm, notifyOwner, validateSubmission,
  embedSnippet, hostedUrl,
} from '../lib/forms.js';

function palette(theme, accent) {
  if (theme === 'light') {
    return { card: '#ffffff', line: '#e6e8f0', ink: '#0f1222', muted: '#5b6079', dim: '#8a8fa3', inputBg: '#f6f7fb', inputLine: '#d7dae8', accent };
  }
  return { card: '#12141f', line: '#262a3d', ink: '#e7e9f0', muted: '#a3a7ba', dim: '#6b7085', inputBg: '#0b0d14', inputLine: '#2a2f42', accent };
}

export default function HostedForm() {
  const { formId } = useParams();
  const form = useMemo(() => resolveForm(formId), [formId]);

  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);
  const [copied, setCopied] = useState('');

  if (!form) {
    return (
      <div style={{ maxWidth: 560, margin: '80px auto', padding: '0 20px', textAlign: 'center', color: '#a3a7ba' }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
        <h1 style={{ color: '#e7e9f0', fontSize: 24, margin: '0 0 8px' }}>Form not found</h1>
        <p style={{ margin: '0 0 20px' }}>This form may have been unpublished or removed.</p>
        <Link to="/" style={{ color: '#8b8ff5', fontWeight: 700 }}>Back to Rally</Link>
      </div>
    );
  }

  const style = form.style || {};
  const accent = style.accent || '#0e9f8f';
  const pal = palette(style.theme, accent);
  const isDraft = form.status !== 'published';

  const set = (id, v) => { setValues(p => ({ ...p, [id]: v })); if (errors[id]) setErrors(e => ({ ...e, [id]: undefined })); };

  function onSubmit(e) {
    e.preventDefault();
    if (busy) return;
    const check = validateSubmission(form, values);
    if (!check.ok) { setErrors(check.errors); return; }
    setBusy(true);
    const out = submitForm(form.id, values);
    if (out && out.error) {
      setErrors(out.errors || {});
      setBusy(false);
      return;
    }
    // Fire-and-forget owner notification (env-gated, never throws).
    notifyOwner(form, values);
    setBusy(false);
    setDone(true);
  }

  async function copy(text, key) {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(''), 1600); } catch { /* clipboard blocked */ }
  }

  const url = hostedUrl(form);
  const snippet = embedSnippet(form);

  const inputStyle = {
    width: '100%', boxSizing: 'border-box', padding: '11px 13px', fontSize: 15,
    border: `1.5px solid ${pal.inputLine}`, borderRadius: 10, background: pal.inputBg,
    color: pal.ink, fontFamily: 'inherit', outline: 'none',
  };
  const labelStyle = { display: 'block', fontSize: 13.5, fontWeight: 700, color: pal.ink, marginBottom: 6 };

  return (
    <div style={{ maxWidth: 560, margin: '48px auto 64px', padding: '0 18px' }}>
      <div style={{ background: pal.card, border: `1px solid ${pal.line}`, borderRadius: 18, padding: 'clamp(22px, 5vw, 34px)', boxShadow: '0 20px 60px -30px rgba(0,0,0,.6)' }}>
        <div style={{ height: 4, width: 46, borderRadius: 999, background: accent, marginBottom: 20 }} />

        {isDraft && (
          <div style={{ marginBottom: 16, padding: '8px 12px', borderRadius: 8, background: 'rgba(224,117,45,.14)', border: '1px solid rgba(224,117,45,.35)', color: '#e0752d', fontSize: 12.5, fontWeight: 700 }}>
            Draft preview. This form is not published yet.
          </div>
        )}

        {done ? (
          <div style={{ textAlign: 'center', padding: '18px 0 6px' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: accent, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            </div>
            <h1 style={{ color: pal.ink, fontSize: 23, margin: '0 0 8px', lineHeight: 1.25 }}>{style.successTitle || 'Thanks for reaching out.'}</h1>
            <p style={{ color: pal.muted, fontSize: 15, margin: 0, lineHeight: 1.6 }}>{style.successBody || 'We will be in touch shortly.'}</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate>
            <h1 style={{ color: pal.ink, fontSize: 25, margin: '0 0 6px', lineHeight: 1.2, letterSpacing: '-.01em' }}>{form.name}</h1>
            {form.description && <p style={{ color: pal.muted, fontSize: 15, margin: '0 0 22px', lineHeight: 1.6 }}>{form.description}</p>}

            <div style={{ display: 'grid', gap: 16 }}>
              {(form.fields || []).map(fd => (
                <Field key={fd.id} fd={fd} value={values[fd.id]} error={errors[fd.id]} onChange={set} pal={pal} inputStyle={inputStyle} labelStyle={labelStyle} />
              ))}
            </div>

            <button type="submit" disabled={busy} style={{
              marginTop: 22, width: '100%', padding: '13px 18px', border: 'none', borderRadius: 11,
              background: accent, color: '#fff', fontWeight: 800, fontSize: 15.5, cursor: busy ? 'default' : 'pointer',
              opacity: busy ? 0.7 : 1, boxShadow: `0 10px 26px -12px ${accent}`,
            }}>
              {busy ? 'Sending...' : (style.buttonLabel || 'Submit')}
            </button>
          </form>
        )}
      </div>

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
          Powered by <Link to="/" style={{ color: pal.muted, fontWeight: 700 }}>Rally</Link>
        </div>
      </div>
    </div>
  );
}

function Field({ fd, value, error, onChange, pal, inputStyle, labelStyle }) {
  const help = fd.help ? <div style={{ fontSize: 12, color: pal.dim, marginTop: 5 }}>{fd.help}</div> : null;
  const errNode = error ? <div style={{ fontSize: 12, color: '#e0752d', marginTop: 5, fontWeight: 600 }}>{error}</div> : null;
  const req = fd.required ? <span style={{ color: pal.accent }}> *</span> : null;
  const borderErr = error ? { borderColor: '#e0752d' } : null;

  if (fd.type === 'checkbox') {
    return (
      <div>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 14.5, fontWeight: 600, color: pal.ink, cursor: 'pointer' }}>
          <input type="checkbox" checked={!!value} onChange={e => onChange(fd.id, e.target.checked)} style={{ width: 17, height: 17, accentColor: pal.accent }} />
          <span>{fd.label}{req}</span>
        </label>
        {help}{errNode}
      </div>
    );
  }

  const label = <label style={labelStyle}>{fd.label}{req}</label>;
  const common = { style: { ...inputStyle, ...borderErr }, value: value == null ? '' : value, onChange: e => onChange(fd.id, e.target.value), placeholder: fd.placeholder || '' };

  let control;
  switch (fd.type) {
    case 'textarea': control = <textarea rows={4} {...common} />; break;
    case 'select':
      control = (
        <select {...common} style={{ ...inputStyle, ...borderErr }}>
          <option value="">{fd.placeholder || 'Choose...'}</option>
          {(fd.options || []).map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      );
      break;
    case 'email': control = <input type="email" {...common} />; break;
    case 'phone': control = <input type="tel" {...common} placeholder={fd.placeholder || '(555) 555-1234'} />; break;
    case 'number': control = <input type="number" {...common} />; break;
    case 'date': control = <input type="date" {...common} />; break;
    default: control = <input type="text" {...common} />;
  }
  return <div>{label}{control}{help}{errNode}</div>;
}
