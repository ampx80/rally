// SignDocument - the PUBLIC signer experience at /sign/:reqId. A signer opens
// their private link (?signer=<id>), reviews the exact document that was sent
// (the snapshot, rendered read-only via DocRender), completes their required
// fields, draws or types a signature, and submits. On completion it shows a
// confirmation plus the audit trail so the signer keeps a receipt. Mobile-first
// and kit-styled - it renders INSIDE the marketing shell (App mounts marketing
// routes wrapped in MarketingShell), so it does not wrap itself again.
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import DocRender from '../components/DocRender.jsx';
import SignatureBlock from '../components/esign/SignatureBlock.jsx';
import { Icon } from '../components/icons.jsx';
import {
  useEsign, getRequest, signerById, fieldsForSigner, auditTrail,
  markViewed, setFieldValue, recordSignature, SIGN_STATUS_META,
} from '../lib/esign-data.js';
import '../components/esign/esign.css';

const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');

export default function SignDocument() {
  const { reqId } = useParams();
  const [params] = useSearchParams();
  useEsign();
  const req = getRequest(reqId);

  // Resolve which signer this link is for: explicit ?signer, else first unsigned.
  const signerId = useMemo(() => {
    if (!req) return null;
    const q = params.get('signer');
    if (q && signerById(req, q)) return q;
    const pending = req.signers.find(s => s.status !== 'signed');
    return (pending || req.signers[0])?.id || null;
  }, [req, params]);

  const signer = req ? signerById(req, signerId) : null;
  const myFields = req ? fieldsForSigner(req, signerId) : [];

  // Local draft of field values + signature until the signer submits.
  const [values, setValues] = useState({});
  const [signature, setSignature] = useState(null);
  const [error, setError] = useState('');
  const [justSigned, setJustSigned] = useState(false);

  // Stamp a "viewed" event once, when a not-yet-signed signer opens the doc.
  useEffect(() => {
    if (req && signer && signer.status !== 'signed') markViewed(req.id, signer.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reqId, signerId]);

  if (!req) return <SignShell><NotFound /></SignShell>;

  const alreadySigned = signer && signer.status === 'signed';
  const isCompleted = req.status === 'completed';
  const sigField = myFields.find(f => f.type === 'signature');

  const setVal = (fieldId, v) => setValues(prev => ({ ...prev, [fieldId]: v }));

  const submit = () => {
    setError('');
    // Validate required non-signature fields.
    for (const f of myFields) {
      if (f.type === 'signature') continue;
      const v = values[f.id] ?? f.value ?? (f.type === 'date' ? new Date().toISOString().slice(0, 10) : '');
      if (f.required && !String(v).trim()) { setError(`Please complete "${f.label}".`); return; }
    }
    if (sigField && sigField.required && !signature) { setError('Please add your signature.'); return; }

    // Persist filled fields, then the signature (which rolls up status).
    for (const f of myFields) {
      if (f.type === 'signature') continue;
      let v = values[f.id];
      if (v == null && f.type === 'date') v = new Date().toISOString().slice(0, 10);
      if (v != null && v !== '') setFieldValue(req.id, f.id, v);
    }
    const res = recordSignature(req.id, signer.id, signature || sigField?.value);
    if (res.error) { setError(res.message || 'Could not sign.'); return; }
    setJustSigned(true);
    window.scrollTo(0, 0);
  };

  const snapshotDoc = { name: req.snapshot?.name || req.docName, accent: req.accent, blocks: req.snapshot?.blocks || [] };
  const meta = SIGN_STATUS_META[req.status] || SIGN_STATUS_META.sent;
  const showConfirmation = justSigned || alreadySigned || isCompleted;

  return (
    <SignShell>
      <div className="es-sign-head">
        <div className="es-sign-head-in">
          <div className="col" style={{ gap: 4, minWidth: 0 }}>
            <span className="es-eyebrow"><Icon name="lock" size={13} /> Secure signing</span>
            <h1 className="es-sign-title">{req.docName}</h1>
            <span className="es-sign-sub">Prepared for {signer?.name || 'you'}{signer?.role ? ` - ${signer.role}` : ''}</span>
          </div>
          <span className={`es-status es-status-${meta.tone}`}>{meta.label}</span>
        </div>
        {req.message && !showConfirmation && (
          <div className="es-message"><Icon name="mail" size={15} /><span>{req.message}</span></div>
        )}
      </div>

      {showConfirmation && (
        <Confirmation req={req} signer={signer} />
      )}

      {/* the exact document that was sent, read-only */}
      <div className="es-doc-card">
        <DocRender doc={snapshotDoc} accent={req.accent} />
      </div>

      {/* the signing panel (only when this signer still needs to sign) */}
      {!showConfirmation && signer && (
        <div className="es-sign-panel">
          <div className="es-panel-head">
            <strong>Complete your fields</strong>
            <span className="t-sm muted">{signer.name}{signer.email ? ` - ${signer.email}` : ''}</span>
          </div>

          <div className="col gap-3" style={{ padding: '1.1rem 1.15rem' }}>
            {myFields.filter(f => f.type !== 'signature').map(f => (
              <div key={f.id} className="col gap-1">
                <label className="es-flabel">{f.label}{f.required && <span className="es-req">*</span>}</label>
                {f.type === 'date' ? (
                  <input type="date" className="input"
                    value={values[f.id] ?? f.value ?? new Date().toISOString().slice(0, 10)}
                    onChange={e => setVal(f.id, e.target.value)} />
                ) : (
                  <input className="input" value={values[f.id] ?? f.value ?? ''}
                    onChange={e => setVal(f.id, e.target.value)} placeholder={f.label} />
                )}
              </div>
            ))}

            {sigField && (
              <div className="col gap-1">
                <label className="es-flabel">{sigField.label}{sigField.required && <span className="es-req">*</span>}</label>
                <SignatureBlock value={signature} onChange={setSignature} typedName={signer.name} />
              </div>
            )}

            {error && <div className="es-error"><Icon name="x" size={14} /> {error}</div>}

            <div className="es-consent">
              <Icon name="shield" size={14} />
              <span>By signing, you agree this electronic signature is the legal equivalent of your handwritten signature on {req.docName}.</span>
            </div>

            <button className="es-sign-btn" onClick={submit}>
              <Icon name="check" size={18} /> Adopt and sign
            </button>
          </div>
        </div>
      )}

      {/* audit trail is always available as a receipt */}
      <AuditPanel reqId={req.id} />

      <div className="es-foot">
        <Icon name="zap" size={14} fill="currentColor" stroke={0} /> Signed with Rally - rally.app
      </div>
    </SignShell>
  );
}

/* ---------- confirmation banner after signing ---------- */
function Confirmation({ req, signer }) {
  const done = req.status === 'completed';
  return (
    <div className={`es-confirm${done ? ' es-confirm-done' : ''}`}>
      <span className="es-confirm-mark"><Icon name="check" size={26} /></span>
      <div className="col" style={{ gap: 4, minWidth: 0 }}>
        <strong style={{ fontSize: '1.15rem' }}>
          {done ? 'Document fully executed' : 'Your signature is recorded'}
        </strong>
        <span className="es-sign-sub">
          {done
            ? 'Every party has signed. A copy of this record is available below.'
            : `Thank you, ${signer?.name || 'signer'}. We have notified the sender and are awaiting any remaining signatures.`}
        </span>
      </div>
    </div>
  );
}

/* ---------- the audit trail (certificate) ---------- */
function AuditPanel({ reqId }) {
  const [open, setOpen] = useState(true);
  const trail = auditTrail(reqId);
  return (
    <div className="es-audit">
      <button className="es-audit-head" onClick={() => setOpen(o => !o)}>
        <Icon name="shield" size={16} />
        <strong>Audit trail</strong>
        <span className="t-xs muted">{trail.length} events</span>
        <span className="es-audit-caret" style={{ transform: open ? 'rotate(90deg)' : 'none' }}><Icon name="chevronRight" size={16} /></span>
      </button>
      {open && (
        <ol className="es-audit-list">
          {trail.map(e => (
            <li key={e.id} className="es-audit-item">
              <span className={`es-audit-dot es-audit-${e.action}`} />
              <div className="col" style={{ gap: 2, minWidth: 0 }}>
                <div className="row gap-1 wrap" style={{ alignItems: 'baseline' }}>
                  <strong className="es-audit-label">{e.label}</strong>
                  <span className="t-xs muted">by {e.who}</span>
                </div>
                <span className="t-xs muted">{fmtDateTime(e.at)} - {e.ip}</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function NotFound() {
  return (
    <div className="es-empty">
      <div style={{ fontSize: '2.4rem' }}>🔏</div>
      <h2 style={{ margin: 0 }}>Signing link not found</h2>
      <p className="es-sign-sub" style={{ maxWidth: 400 }}>This request may have been voided, completed, or the link is out of date. Ask the sender to resend it.</p>
      <Link to="/" className="es-sign-btn" style={{ maxWidth: 220, textDecoration: 'none' }}><Icon name="chevronRight" size={16} /> Back to Rally</Link>
    </div>
  );
}

/* Kit-styled outer wrapper (renders inside MarketingShell). */
function SignShell({ children }) {
  return <div className="es-sign-wrap">{children}</div>;
}
