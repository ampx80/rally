// FormRenderer.jsx
// The shared, self-contained widget that renders a Ardovo form for real.
// Used both by the public hosted page (/f/:formId, mode="live") and by the
// builder's live preview (mode="preview"). It is intentionally self-styled
// with inline styles + a palette so it renders identically whether opened
// directly, dropped into an <iframe> embed, or previewed inside the app shell
// (it does not depend on the app's global CSS variables).
//
// Handles: multi-step navigation with a progress indicator, per-field
// conditional (show/hide) logic, every field type (including file upload,
// hidden, section heading, and payment), spam protection (honeypot +
// time-trap), analytics tracking (live only), and submission through the
// forms store (which creates/updates a contact and fires window events).
//
// ASCII only. NO em-dash / en-dash. ASCII hyphen only.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  submitForm, notifyOwner, postSubmission,
  isFieldVisible, visibleSteps, fieldsForStep, validateStep, validateSubmission,
  trackView, trackStart, trackStepReached,
  typeIsStatic, HONEYPOT_FIELD,
} from '../../lib/forms.js';

export function palette(theme, accent) {
  if (theme === 'light') {
    return { card: '#ffffff', line: '#e6e8f0', ink: '#0f1222', muted: '#5b6079', dim: '#8a8fa3', inputBg: '#f6f7fb', inputLine: '#d7dae8', track: '#eceef6', accent };
  }
  return { card: '#12141f', line: '#262a3d', ink: '#e7e9f0', muted: '#a3a7ba', dim: '#6b7085', inputBg: '#0b0d14', inputLine: '#2a2f42', track: '#1c2030', accent };
}

const ERR = '#e0752d';

function initialValues(form) {
  const v = {};
  for (const fd of (form.fields || [])) {
    if (fd.type === 'hidden') v[fd.id] = fd.defaultValue || '';
    else if (fd.type === 'payment') v[fd.id] = fd.amount != null ? fd.amount : '';
    else if (fd.type === 'checkboxes') v[fd.id] = [];
  }
  return v;
}

export default function FormRenderer({ form, mode = 'live', onSubmitted, chromeless = false }) {
  const live = mode === 'live';
  const style = form.style || {};
  const accent = style.accent || '#5b4bf5';
  const pal = palette(style.theme, accent);

  const [values, setValues] = useState(() => initialValues(form));
  const [errors, setErrors] = useState({});
  const [cursor, setCursor] = useState(0);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState('');
  const [honeypot, setHoneypot] = useState('');

  const mountAt = useRef(Date.now());
  const startedRef = useRef(false);
  const viewedRef = useRef(false);

  // Reset when the form identity changes (switching forms / reopening).
  useEffect(() => {
    setValues(initialValues(form));
    setErrors({}); setCursor(0); setDone(false); setBusy(false); setBanner('');
    mountAt.current = Date.now(); startedRef.current = false;
  }, [form.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Count a view once per session per form (live only).
  useEffect(() => {
    if (!live || viewedRef.current) return;
    viewedRef.current = true;
    const key = `rally_form_viewed_${form.id}`;
    try {
      if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(key)) return;
      if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(key, '1');
    } catch { /* storage blocked; still count once per mount */ }
    trackView(form.id);
  }, [live, form.id]);

  const vSteps = useMemo(() => visibleSteps(form, values), [form, values]);
  const safeCursor = Math.min(cursor, vSteps.length - 1);
  useEffect(() => { if (cursor !== safeCursor) setCursor(safeCursor); }, [cursor, safeCursor]);

  const stepIdx = vSteps[safeCursor];
  const isLast = safeCursor >= vSteps.length - 1;
  const multi = vSteps.length > 1;

  function maybeStart() {
    if (startedRef.current) return;
    startedRef.current = true;
    if (live) { trackStart(form.id); trackStepReached(form.id, stepIdx); }
  }

  function set(id, val) {
    maybeStart();
    setBanner('');
    setValues(p => ({ ...p, [id]: val }));
    if (errors[id]) setErrors(e => ({ ...e, [id]: undefined }));
  }

  function goBack() { setBanner(''); setCursor(c => Math.max(0, c - 1)); }

  function goNext() {
    maybeStart();
    const check = validateStep(form, stepIdx, values);
    if (!check.ok) { setErrors(check.errors); return; }
    const steps = visibleSteps(form, values);
    const nextCursor = Math.min(steps.length - 1, safeCursor + 1);
    const nextStep = steps[nextCursor];
    setCursor(nextCursor);
    if (live && nextStep != null) trackStepReached(form.id, nextStep);
  }

  function finish(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (busy) return;
    maybeStart();
    const check = validateSubmission(form, values);
    if (!check.ok) {
      setErrors(check.errors);
      // Jump the visitor back to the first step that has an error.
      const firstBad = Object.keys(check.errors)[0];
      const badStep = (form.fields || []).find(f => f.id === firstBad)?.step;
      if (badStep != null) {
        const idx = vSteps.indexOf(badStep);
        if (idx >= 0) setCursor(idx);
      }
      return;
    }
    if (!live) { setDone(true); onSubmitted && onSubmitted({ ok: true, preview: true }); return; }

    setBusy(true);
    const out = submitForm(form.id, values, { startedAt: mountAt.current, honeypot });
    if (out && out.error) {
      setBusy(false);
      if (out.error === 'validation') { setErrors(out.errors || {}); return; }
      setBanner(out.message || 'Something went wrong. Please try again.');
      return;
    }
    // Best-effort server-side capture + owner notification (both env-gated,
    // never block the visitor).
    postSubmission(form, values, { startedAt: mountAt.current, honeypot });
    notifyOwner(form, values);
    setBusy(false);
    setDone(true);
    onSubmitted && onSubmitted(out);
  }

  const inputStyle = {
    width: '100%', boxSizing: 'border-box', padding: '11px 13px', fontSize: 15,
    border: `1.5px solid ${pal.inputLine}`, borderRadius: 10, background: pal.inputBg,
    color: pal.ink, fontFamily: 'inherit', outline: 'none',
  };
  const labelStyle = { display: 'block', fontSize: 13.5, fontWeight: 700, color: pal.ink, marginBottom: 6 };

  if (done) {
    return (
      <Shell pal={pal} accent={accent} chromeless={chromeless}>
        <div style={{ textAlign: 'center', padding: '18px 0 6px' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: accent, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          </div>
          <h1 style={{ color: pal.ink, fontSize: 23, margin: '0 0 8px', lineHeight: 1.25 }}>{style.successTitle || 'Thanks for reaching out.'}</h1>
          <p style={{ color: pal.muted, fontSize: 15, margin: 0, lineHeight: 1.6 }}>{style.successBody || 'We will be in touch shortly.'}</p>
          {!live && <p style={{ color: pal.dim, fontSize: 12.5, marginTop: 18 }}>Preview only. No contact was created.</p>}
        </div>
      </Shell>
    );
  }

  const stepFields = fieldsForStep(form, stepIdx).filter(fd => typeIsStatic(fd.type) || isFieldVisible(fd, values));

  return (
    <Shell pal={pal} accent={accent} chromeless={chromeless}>
      <form onSubmit={finish} noValidate>
        <h1 style={{ color: pal.ink, fontSize: 25, margin: '0 0 6px', lineHeight: 1.2, letterSpacing: '-.01em' }}>{form.name}</h1>
        {form.description && <p style={{ color: pal.muted, fontSize: 15, margin: '0 0 18px', lineHeight: 1.6 }}>{form.description}</p>}

        {multi && (
          <div style={{ margin: '0 0 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 700, color: pal.dim, marginBottom: 7 }}>
              <span>Step {safeCursor + 1} of {vSteps.length}</span>
              <span>{Math.round(((safeCursor + 1) / vSteps.length) * 100)}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 999, background: pal.track, overflow: 'hidden' }}>
              <div style={{ width: `${((safeCursor + 1) / vSteps.length) * 100}%`, height: '100%', background: accent, borderRadius: 999, transition: 'width .35s ease' }} />
            </div>
          </div>
        )}

        {banner && (
          <div style={{ marginBottom: 16, padding: '9px 13px', borderRadius: 9, background: 'rgba(224,117,45,.14)', border: `1px solid rgba(224,117,45,.4)`, color: ERR, fontSize: 13, fontWeight: 600 }}>{banner}</div>
        )}

        <div style={{ display: 'grid', gap: 16 }}>
          {stepFields.map(fd => (
            <Control key={fd.id} fd={fd} value={values[fd.id]} error={errors[fd.id]} onChange={set} pal={pal} accent={accent} inputStyle={inputStyle} labelStyle={labelStyle} />
          ))}
          {stepFields.length === 0 && <div style={{ color: pal.dim, fontSize: 14, fontStyle: 'italic' }}>Add a field to this step.</div>}
        </div>

        {/* Honeypot: hidden from humans, catnip for bots. Live only. */}
        {live && (
          <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', top: 'auto', width: 1, height: 1, overflow: 'hidden' }}>
            <label>Leave this field empty
              <input type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" value={honeypot} onChange={e => setHoneypot(e.target.value)} />
            </label>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          {multi && safeCursor > 0 && (
            <button type="button" onClick={goBack} style={{
              padding: '13px 18px', border: `1.5px solid ${pal.inputLine}`, borderRadius: 11, background: 'transparent',
              color: pal.ink, fontWeight: 700, fontSize: 15, cursor: 'pointer', flex: 'none',
            }}>Back</button>
          )}
          {isLast ? (
            <button type="submit" disabled={busy} style={{
              flex: 1, padding: '13px 18px', border: 'none', borderRadius: 11,
              background: accent, color: '#fff', fontWeight: 800, fontSize: 15.5, cursor: busy ? 'default' : 'pointer',
              opacity: busy ? 0.7 : 1, boxShadow: `0 10px 26px -12px ${accent}`,
            }}>{busy ? 'Sending...' : (style.buttonLabel || 'Submit')}</button>
          ) : (
            <button type="button" onClick={goNext} style={{
              flex: 1, padding: '13px 18px', border: 'none', borderRadius: 11,
              background: accent, color: '#fff', fontWeight: 800, fontSize: 15.5, cursor: 'pointer',
              boxShadow: `0 10px 26px -12px ${accent}`,
            }}>Continue</button>
          )}
        </div>
      </form>
    </Shell>
  );
}

function Shell({ pal, accent, chromeless, children }) {
  const inner = (
    <>
      <div style={{ height: 4, width: 46, borderRadius: 999, background: accent, marginBottom: 20 }} />
      {children}
    </>
  );
  if (chromeless) return <div>{inner}</div>;
  return (
    <div style={{ background: pal.card, border: `1px solid ${pal.line}`, borderRadius: 18, padding: 'clamp(22px, 5vw, 34px)', boxShadow: '0 20px 60px -30px rgba(0,0,0,.6)' }}>
      {inner}
    </div>
  );
}

/* ------------------------------------------------------------
   One rendered field control (all types).
   ------------------------------------------------------------ */
function Control({ fd, value, error, onChange, pal, accent, inputStyle, labelStyle }) {
  const help = fd.help ? <div style={{ fontSize: 12, color: pal.dim, marginTop: 5, lineHeight: 1.5 }}>{fd.help}</div> : null;
  const errNode = error ? <div style={{ fontSize: 12, color: ERR, marginTop: 5, fontWeight: 600 }}>{error}</div> : null;
  const req = fd.required ? <span style={{ color: accent }}> *</span> : null;
  const borderErr = error ? { borderColor: ERR } : null;

  // Section heading: static content, no control.
  if (fd.type === 'heading') {
    return (
      <div style={{ paddingTop: 4 }}>
        <h2 style={{ color: pal.ink, fontSize: 18, margin: '0 0 2px', letterSpacing: '-.01em' }}>{fd.label}</h2>
        {fd.help && <div style={{ fontSize: 13, color: pal.muted, lineHeight: 1.5 }}>{fd.help}</div>}
      </div>
    );
  }

  // Hidden: never rendered (its value rides along in state).
  if (fd.type === 'hidden') return null;

  const label = <label style={labelStyle}>{fd.label}{req}</label>;

  if (fd.type === 'checkbox') {
    return (
      <div>
        <label style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 10, fontSize: 14.5, fontWeight: 600, color: pal.ink, cursor: 'pointer', lineHeight: 1.4 }}>
          <input type="checkbox" checked={!!value} onChange={e => onChange(fd.id, e.target.checked)} style={{ width: 17, height: 17, accentColor: accent, marginTop: 2, flex: 'none' }} />
          <span>{fd.label}{req}</span>
        </label>
        {help}{errNode}
      </div>
    );
  }

  if (fd.type === 'checkboxes') {
    const arr = Array.isArray(value) ? value : [];
    const toggle = (opt) => { const has = arr.includes(opt); onChange(fd.id, has ? arr.filter(x => x !== opt) : [...arr, opt]); };
    return (
      <div>
        {label}
        <div style={{ display: 'grid', gap: 8 }}>
          {(fd.options || []).map(opt => (
            <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', border: `1.5px solid ${arr.includes(opt) ? accent : pal.inputLine}`, borderRadius: 10, background: pal.inputBg, color: pal.ink, fontSize: 14.5, cursor: 'pointer' }}>
              <input type="checkbox" checked={arr.includes(opt)} onChange={() => toggle(opt)} style={{ width: 16, height: 16, accentColor: accent }} />
              <span>{opt}</span>
            </label>
          ))}
        </div>
        {help}{errNode}
      </div>
    );
  }

  if (fd.type === 'radio') {
    return (
      <div>
        {label}
        <div style={{ display: 'grid', gap: 8 }}>
          {(fd.options || []).map(opt => (
            <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', border: `1.5px solid ${value === opt ? accent : pal.inputLine}`, borderRadius: 10, background: pal.inputBg, color: pal.ink, fontSize: 14.5, cursor: 'pointer' }}>
              <input type="radio" name={fd.id} checked={value === opt} onChange={() => onChange(fd.id, opt)} style={{ width: 16, height: 16, accentColor: accent }} />
              <span>{opt}</span>
            </label>
          ))}
        </div>
        {help}{errNode}
      </div>
    );
  }

  if (fd.type === 'file') {
    return (
      <div>
        {label}
        <input type="file" accept={fd.accept || undefined} multiple={!!fd.multiple}
          onChange={e => { const files = Array.from(e.target.files || []); onChange(fd.id, files.map(f => f.name).join(', ')); }}
          style={{ ...inputStyle, ...borderErr, padding: '9px 12px' }} />
        {value ? <div style={{ fontSize: 12, color: pal.muted, marginTop: 5 }}>Selected: {value}</div> : null}
        {help}{errNode}
      </div>
    );
  }

  if (fd.type === 'payment') {
    const cur = fd.currency || 'USD';
    const amt = value === '' || value == null ? (fd.amount != null ? fd.amount : '') : value;
    return (
      <div>
        {label}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', border: `1.5px solid ${error ? ERR : pal.inputLine}`, borderRadius: 10, background: pal.inputBg }}>
          <span style={{ display: 'inline-flex', width: 30, height: 30, borderRadius: 8, background: accent, alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 4h18a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM1 10h22" /></svg>
          </span>
          <span style={{ fontSize: 15, fontWeight: 700, color: pal.dim }}>{cur}</span>
          {fd.amountEditable ? (
            <input type="number" min="0" step="0.01" value={amt} onChange={e => onChange(fd.id, e.target.value === '' ? '' : Number(e.target.value))}
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: pal.ink, fontSize: 17, fontWeight: 800, fontFamily: 'inherit' }} placeholder="0.00" />
          ) : (
            <span style={{ flex: 1, color: pal.ink, fontSize: 17, fontWeight: 800 }}>{Number(amt || 0).toFixed(2)}</span>
          )}
        </div>
        <div style={{ fontSize: 12, color: pal.dim, marginTop: 5 }}>Secured payment handled at checkout.</div>
        {help}{errNode}
      </div>
    );
  }

  // Text-like controls.
  const common = {
    style: { ...inputStyle, ...borderErr },
    value: value == null ? '' : value,
    onChange: e => onChange(fd.id, e.target.value),
    placeholder: fd.placeholder || '',
  };
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
    case 'number': control = <input type="number" {...common} min={fd.min === '' ? undefined : fd.min} max={fd.max === '' ? undefined : fd.max} />; break;
    case 'date': control = <input type="date" {...common} />; break;
    default: control = <input type="text" {...common} />;
  }
  return <div>{label}{control}{help}{errNode}</div>;
}
