// Signatures - the product-side tracker for every signature request. A card
// wall of requests with live status, per-signer progress, and a detail drawer
// that shows the full audit trail, each signer's state + captured signature,
// copy-link and open-signing-page actions, and a print/download of the signed
// document. A "New signature request" button lets you pick any Studio doc and
// launch the SignatureRequestModal, so the whole flow works end-to-end from
// here even before Studio is wired. All data flows through esign-data (useEsign).
import React, { useState } from 'react';
import {
  Button, Card, Modal, Field, Select, EmptyState, useToast, relTime, GradientText,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import DocRender from '../components/DocRender.jsx';
import SignatureRequestModal from '../components/esign/SignatureRequestModal.jsx';
import {
  useEsign, getRequests, getRequest, auditTrail, signProgress,
  voidRequest, deleteRequest, SIGN_STATUS_META,
} from '../lib/esign-data.js';
import { getDocs } from '../lib/store-docs.js';
import '../components/esign/esign.css';

const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');
const signLink = (r, s) => `${typeof window !== 'undefined' ? window.location.origin : ''}/sign/${r.id}?signer=${s.id}`;

export default function Signatures() {
  const toast = useToast();
  useEsign();
  const requests = getRequests();

  const [openId, setOpenId] = useState(null);     // request in the detail drawer
  const [pickDoc, setPickDoc] = useState(false);  // doc-picker for a new request
  const [newFor, setNewFor] = useState(null);     // doc chosen -> request modal

  const counts = requests.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});
  const openReq = openId ? getRequest(openId) : null;

  return (
    <div className="rl-page col gap-4 page-in">
      <SignaturesStyles />

      {/* hero */}
      <div className="es-hero">
        <div className="col gap-2" style={{ minWidth: 0 }}>
          <div className="eyebrow">E-signature</div>
          <h1 style={{ margin: 0 }}>Signature <GradientText>requests</GradientText></h1>
          <p className="muted" style={{ margin: 0, maxWidth: 560, fontSize: '1.05rem' }}>
            Send any Studio proposal for a legally-binding e-signature. Track every open, field entry, and signature in a tamper-evident audit trail.
          </p>
        </div>
        <Button variant="accent" onClick={() => setPickDoc(true)} style={{ flex: 'none' }}>
          <Icon name="send" size={16} /> New signature request
        </Button>
      </div>

      {/* stat strip */}
      {requests.length > 0 && (
        <div className="es-statstrip">
          {['sent', 'viewed', 'signed', 'completed'].map(k => (
            <div key={k} className="es-statcell">
              <span className="es-statnum">{counts[k] || 0}</span>
              <span className={`es-status es-status-${SIGN_STATUS_META[k].tone}`}>{SIGN_STATUS_META[k].label}</span>
            </div>
          ))}
        </div>
      )}

      {/* request wall */}
      {requests.length === 0 ? (
        <Card><EmptyState icon="🔏" title="No signature requests yet"
          body="Send a Studio document for signature to start tracking it here." /></Card>
      ) : (
        <div className="es-reqgrid stagger">
          {requests.map(r => {
            const meta = SIGN_STATUS_META[r.status] || SIGN_STATUS_META.sent;
            const p = signProgress(r);
            return (
              <Card key={r.id} pad={false} className="es-reqcard" hover onClick={() => setOpenId(r.id)}>
                <div className="es-reqcard-top" style={{ background: `linear-gradient(135deg, ${r.accent}, ${r.accent}bb 78%, ${r.accent}88)` }}>
                  <span className="es-reqcard-eyebrow">Signature request</span>
                  <span className="es-reqcard-title">{r.docName}</span>
                  <span className={`es-status es-status-${meta.tone} es-status-onart`}>{meta.label}</span>
                </div>
                <div className="col gap-2" style={{ padding: '.9rem 1rem 1rem' }}>
                  <div className="row between" style={{ alignItems: 'center' }}>
                    <span className="t-sm" style={{ fontWeight: 600 }}>{p.done} of {p.total} signed</span>
                    <span className="t-xs muted">{relTime(r.updatedAt || r.createdAt)}</span>
                  </div>
                  <div className="es-progress"><span className="es-progress-fill" style={{ width: `${p.pct}%`, background: r.accent }} /></div>
                  <div className="row gap-1 wrap">
                    {r.signers.map(s => (
                      <span key={s.id} className={`es-chip es-chip-${s.status}`} title={`${s.name} - ${s.status}`}>
                        {s.status === 'signed' ? <Icon name="check" size={12} /> : <Icon name="clock" size={12} />}
                        <span className="clip">{s.name}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* detail drawer */}
      {openReq && (
        <RequestDetail req={openReq} onClose={() => setOpenId(null)} toast={toast} />
      )}

      {/* doc picker for a new request */}
      {pickDoc && (
        <DocPicker onClose={() => setPickDoc(false)} onPick={(doc) => { setPickDoc(false); setNewFor(doc); }} />
      )}

      {/* send modal */}
      {newFor && (
        <SignatureRequestModal doc={newFor} open onClose={() => setNewFor(null)} onSent={() => { /* stays live via useEsign */ }} />
      )}
    </div>
  );
}

/* ============================================================
   DETAIL DRAWER  (signers + audit trail + actions + print)
   ============================================================ */
function RequestDetail({ req, onClose, toast }) {
  const [confirmVoid, setConfirmVoid] = useState(false);
  const meta = SIGN_STATUS_META[req.status] || SIGN_STATUS_META.sent;
  const trail = auditTrail(req.id);
  const snapshotDoc = { name: req.snapshot?.name || req.docName, accent: req.accent, blocks: req.snapshot?.blocks || [] };

  const copy = (text) => { try { navigator.clipboard?.writeText(text); toast('Link copied.'); } catch { toast('Copy failed.'); } };

  return (
    <Modal open onClose={onClose} width={760} title={req.docName}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>Close</Button>
          {req.status !== 'voided' && req.status !== 'completed' && (
            <Button variant="danger" onClick={() => setConfirmVoid(true)}><Icon name="x" size={15} /> Void</Button>
          )}
          <Button variant="ghost" onClick={() => window.print()}><Icon name="download" size={16} /> Download signed PDF</Button>
        </>
      }>
      <div className="es-detail col gap-4">
        <div className="row between wrap" style={{ gap: '.6rem', alignItems: 'center' }}>
          <span className={`es-status es-status-${meta.tone}`}>{meta.label}</span>
          <span className="t-sm muted">Created {fmtDateTime(req.createdAt)}{req.completedAt ? ` - completed ${fmtDateTime(req.completedAt)}` : ''}</span>
        </div>

        {req.message && <div className="es-message"><Icon name="mail" size={15} /><span>{req.message}</span></div>}

        {/* signers */}
        <section className="col gap-2">
          <strong>Signers</strong>
          {req.signers.map(s => (
            <div key={s.id} className="es-detail-signer">
              <span className={`es-chip es-chip-${s.status}`}>
                {s.status === 'signed' ? <Icon name="check" size={12} /> : <Icon name="clock" size={12} />}
                {SIGN_STATUS_META[s.status]?.label || s.status}
              </span>
              <div className="col" style={{ gap: 1, minWidth: 0, flex: 1 }}>
                <strong className="clip">{s.name}</strong>
                <span className="t-xs muted clip">{s.role}{s.email ? ` - ${s.email}` : ''}{s.signedAt ? ` - signed ${fmtDateTime(s.signedAt)}` : ''}</span>
              </div>
              {s.signatureDataUrl
                ? <img src={s.signatureDataUrl} alt={`${s.name} signature`} className="es-detail-sig" />
                : (req.status !== 'voided' && (
                  <button className="btn btn-ghost btn-sm" onClick={() => copy(signLink(req, s))} style={{ flex: 'none' }}>
                    <Icon name="fileText" size={14} /> Copy link
                  </button>
                ))}
            </div>
          ))}
        </section>

        {/* audit trail */}
        <section className="col gap-2">
          <strong>Audit trail</strong>
          <ol className="es-audit-list es-audit-inset">
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
        </section>

        {confirmVoid && (
          <div className="es-voidbar">
            <span>Void this request? Signers can no longer sign, but the audit trail is kept.</span>
            <div className="row gap-1" style={{ flex: 'none' }}>
              <Button variant="quiet" size="sm" onClick={() => setConfirmVoid(false)}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={() => { voidRequest(req.id); setConfirmVoid(false); toast('Request voided.'); }}>Void request</Button>
            </div>
          </div>
        )}
      </div>

      {/* hidden print root: the signed document for Download PDF */}
      <DocRender doc={snapshotDoc} accent={req.accent} printRoot />
    </Modal>
  );
}

/* ============================================================
   DOC PICKER  (choose a Studio doc to send)
   ============================================================ */
function DocPicker({ onClose, onPick }) {
  const docs = getDocs();
  const [id, setId] = useState(docs[0]?.id || '');
  return (
    <Modal open onClose={onClose} width={480} title="Send a document for signature"
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>Cancel</Button>
          <Button variant="accent" onClick={() => { const d = docs.find(x => x.id === id); if (d) onPick(d); }} disabled={!id}>
            <Icon name="chevronRight" size={16} /> Continue
          </Button>
        </>
      }>
      {docs.length === 0 ? (
        <EmptyState icon="📄" title="No documents yet" body="Build a proposal in Studio first, then send it for signature." />
      ) : (
        <Field label="Document" hint="Pick a Studio proposal or document to send.">
          <Select value={id} onChange={e => setId(e.target.value)}>
            {docs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </Field>
      )}
    </Modal>
  );
}

function SignaturesStyles() {
  return (
    <style>{`
      .es-hero { display: flex; justify-content: space-between; gap: 1.5rem; align-items: center;
        padding: 1.75rem 2rem; border-radius: var(--r-xl); overflow: hidden; position: relative;
        background: linear-gradient(120deg, var(--paper), var(--n-25)); border: 1px solid var(--line); box-shadow: var(--shadow-sm); }
      @media (max-width: 640px) { .es-hero { flex-direction: column; align-items: flex-start; } }

      .es-statstrip { display: grid; grid-template-columns: repeat(4, 1fr); gap: .8rem; }
      @media (max-width: 620px) { .es-statstrip { grid-template-columns: repeat(2, 1fr); } }
      .es-statcell { display: flex; flex-direction: column; gap: .4rem; align-items: flex-start; padding: 1rem 1.1rem;
        background: var(--paper); border: 1px solid var(--line); border-radius: var(--r-lg); box-shadow: var(--shadow-sm); }
      .es-statnum { font-size: 1.9rem; font-weight: 800; letter-spacing: -.02em; line-height: 1; color: var(--ink); }

      .es-reqgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.15rem; }
      .es-reqcard { overflow: hidden; cursor: pointer; }
      .es-reqcard-top { position: relative; padding: 1.1rem 1.2rem 1.15rem; color: #fff; min-height: 116px;
        display: flex; flex-direction: column; justify-content: flex-end; }
      .es-reqcard-eyebrow { position: absolute; top: .9rem; left: 1.2rem; font-size: .62rem; font-weight: 700;
        letter-spacing: .14em; text-transform: uppercase; color: rgba(255,255,255,.82); }
      .es-reqcard-title { font-size: 1.12rem; font-weight: 800; letter-spacing: -.02em; line-height: 1.18;
        display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      .es-status-onart { position: absolute; top: .8rem; right: 1.1rem; }

      .es-progress { height: 7px; border-radius: 999px; background: var(--n-100); overflow: hidden; }
      .es-progress-fill { display: block; height: 100%; border-radius: 999px; transition: width .5s var(--ease); }
    `}</style>
  );
}
