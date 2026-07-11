// SignatureRequestModal - the sender flow. Add one or more signers, place the
// fields each must complete (signature / date / text), write an optional note,
// and send. On send it snapshots the doc and creates a signature request via
// esign-data.sendForSignature, then surfaces the per-signer signing links to
// copy. Self-contained: pass { doc, open, onClose, onSent } - no shared-file
// edits needed to drop it into Studio or the Signatures page.
import React, { useMemo, useState } from 'react';
import {
  Button, Field, Input, Select, Textarea, Modal, useToast,
} from '../UI.jsx';
import { Icon } from '../icons.jsx';
import { sendForSignature, suggestSigners, FIELD_TYPES, fieldMeta } from '../../lib/esign-data.js';

const SIGN_ORIGIN = () => (typeof window !== 'undefined' ? window.location.origin : '');
const signLink = (reqId, signerId) => `${SIGN_ORIGIN()}/sign/${reqId}?signer=${signerId}`;

export default function SignatureRequestModal({ doc, open, onClose, onSent }) {
  const toast = useToast();
  const initialSigners = useMemo(() => {
    const s = doc ? suggestSigners(doc.id) : [];
    return s.length ? s : [{ name: '', email: '', role: 'Customer' }];
  }, [doc]);

  const [signers, setSigners] = useState(initialSigners);
  const [fields, setFields] = useState(() => defaultFields(initialSigners));
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(null);   // the created request (success view)

  if (!open) return null;

  const setSigner = (i, patch) => setSigners(list => list.map((s, idx) => idx === i ? { ...s, ...patch } : s));
  const addSigner = () => {
    setSigners(list => [...list, { name: '', email: '', role: 'Signer' }]);
  };
  const rmSigner = (i) => {
    setSigners(list => list.filter((_, idx) => idx !== i));
    setFields(list => list.filter(f => f.signerIndex !== i).map(f => ({ ...f, signerIndex: f.signerIndex > i ? f.signerIndex - 1 : f.signerIndex })));
  };

  const addField = () => setFields(list => [...list, { signerIndex: 0, type: 'signature', label: 'Signature', required: true }]);
  const setField = (i, patch) => setFields(list => list.map((f, idx) => idx === i ? { ...f, ...patch } : f));
  const rmField = (i) => setFields(list => list.filter((_, idx) => idx !== i));

  const send = () => {
    if (!doc) { toast('No document to send.'); return; }
    const res = sendForSignature(doc.id, signers, { fields, message, docName: doc.name });
    if (res.error) { toast(res.message || 'Could not send.'); return; }
    setSent(res.request);
    toast('Sent for signature.');
    onSent && onSent(res.request);
  };

  const copy = (text) => {
    try { navigator.clipboard?.writeText(text); toast('Link copied.'); } catch { toast('Copy failed - select the link.'); }
  };

  /* ---------- success view: the signing links ---------- */
  if (sent) {
    return (
      <Modal open onClose={onClose} width={560} title="Ready to sign"
        footer={<Button variant="accent" onClick={onClose}><Icon name="check" size={16} /> Done</Button>}>
        <div className="es-reqmodal col gap-3">
          <div className="es-sent-banner">
            <span className="es-sent-mark"><Icon name="send" size={18} /></span>
            <div className="col" style={{ gap: 2, minWidth: 0 }}>
              <strong>Sent for signature</strong>
              <span className="t-sm muted">Share each signer's private link. In production these go out by email automatically.</span>
            </div>
          </div>
          <div className="col gap-2">
            {sent.signers.map(s => (
              <div key={s.id} className="es-linkrow">
                <div className="col" style={{ gap: 1, minWidth: 0 }}>
                  <strong className="clip">{s.name || s.email || 'Signer'}</strong>
                  <span className="t-xs muted clip">{s.role}{s.email ? ` - ${s.email}` : ''}</span>
                </div>
                <div className="row gap-1" style={{ flex: 'none' }}>
                  <a className="btn btn-quiet btn-sm" href={signLink(sent.id, s.id)} target="_blank" rel="noreferrer"><Icon name="chevronRight" size={14} /> Open</a>
                  <button className="btn btn-ghost btn-sm" onClick={() => copy(signLink(sent.id, s.id))}><Icon name="fileText" size={14} /> Copy link</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    );
  }

  /* ---------- compose view ---------- */
  return (
    <Modal open onClose={onClose} width={620} title={`Send "${doc?.name || 'document'}" for signature`}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>Cancel</Button>
          <Button variant="accent" onClick={send}><Icon name="send" size={16} /> Send for signature</Button>
        </>
      }>
      <div className="es-reqmodal col gap-4">
        {/* signers */}
        <section className="col gap-2">
          <div className="row between" style={{ alignItems: 'baseline' }}>
            <strong>Signers</strong>
            <span className="t-xs muted">They sign in the order listed</span>
          </div>
          {signers.map((s, i) => (
            <div key={i} className="es-signer">
              <span className="es-signer-num">{i + 1}</span>
              <div className="es-signer-grid">
                <Input value={s.name} onChange={e => setSigner(i, { name: e.target.value })} placeholder="Full name" />
                <Input value={s.email} onChange={e => setSigner(i, { email: e.target.value })} placeholder="email@company.com" />
                <Input value={s.role} onChange={e => setSigner(i, { role: e.target.value })} placeholder="Role" />
              </div>
              <button className="es-icon-btn es-del" title="Remove signer" onClick={() => rmSigner(i)} disabled={signers.length <= 1}>
                <Icon name="x" size={15} />
              </button>
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={addSigner} style={{ alignSelf: 'flex-start' }}>
            <Icon name="plus" size={14} /> Add signer
          </Button>
        </section>

        {/* fields */}
        <section className="col gap-2">
          <div className="row between" style={{ alignItems: 'baseline' }}>
            <strong>Fields to complete</strong>
            <span className="t-xs muted">Each signer gets a signature + date by default</span>
          </div>
          {fields.length === 0 && <span className="t-sm muted">No custom fields - signers will get a signature and date automatically.</span>}
          {fields.map((f, i) => (
            <div key={i} className="es-fieldrow">
              <Select value={f.type} onChange={e => setField(i, { type: e.target.value, label: fieldMeta(e.target.value).label })}>
                {FIELD_TYPES.map(t => <option key={t.type} value={t.type}>{t.label}</option>)}
              </Select>
              <Input value={f.label} onChange={e => setField(i, { label: e.target.value })} placeholder="Label" />
              <Select value={f.signerIndex} onChange={e => setField(i, { signerIndex: Number(e.target.value) })}>
                {signers.map((s, idx) => <option key={idx} value={idx}>{s.name || s.email || `Signer ${idx + 1}`}</option>)}
              </Select>
              <label className="es-req-toggle" title="Required">
                <input type="checkbox" checked={f.required !== false} onChange={e => setField(i, { required: e.target.checked })} />
                Req
              </label>
              <button className="es-icon-btn es-del" title="Remove field" onClick={() => rmField(i)}><Icon name="x" size={14} /></button>
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={addField} style={{ alignSelf: 'flex-start' }}>
            <Icon name="plus" size={14} /> Add field
          </Button>
        </section>

        {/* message */}
        <Field label="Message to signers" hint="Shown at the top of the signing page.">
          <Textarea rows={3} value={message} onChange={e => setMessage(e.target.value)}
            placeholder="A quick note - e.g. sign to lock in pricing and kick off onboarding this week." />
        </Field>

        <div className="es-note">
          <Icon name="shield" size={15} />
          <span>Every open, field entry, and signature is recorded in a tamper-evident audit trail with a timestamp and session marker.</span>
        </div>
      </div>
    </Modal>
  );
}

function defaultFields(signers) {
  // Seed the composer with a signature + date for the first signer so the
  // form reads as "ready to send" without extra clicks.
  return [
    { signerIndex: 0, type: 'signature', label: 'Authorized signature', required: true },
    { signerIndex: 0, type: 'date', label: 'Date signed', required: true },
  ];
}
