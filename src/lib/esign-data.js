// ============================================================
// RALLY E-SIGN STORE  (the signing + audit layer for Studio docs)
// Turns a generated proposal into a signable, legally-legible
// document with a DocuSign-style flow: a sender adds signers and
// places fields (signature / date / text), sends the request, and
// each signer reviews the rendered doc, fills required fields, and
// signs (draw-to-sign or typed). Every step is stamped into an
// immutable audit trail (who / when / ip-placeholder / action) so
// the completed document carries a verifiable certificate.
//
// Local-first, deterministic-seed, pub/sub - the same pattern as
// store-docs / store-quote. A signature request snapshots the doc's
// blocks + accent at send time so the signed artifact never drifts
// even if the source doc is later edited.
// SUPABASE: rally_sign_requests, rally_sign_signers, rally_sign_fields,
// rally_sign_events (FK requestId).
// ============================================================
import { useSyncExternalStore } from 'react';
import { getDocs, getDoc } from './store-docs.js';
import { getDeal, getCompany, getContactsForCompany, getCurrentUser, userName } from './store.js';

const LS_KEY = 'rally_esign_v1';

let idc = Date.now();
const nid = (p) => `${p}_${(idc++).toString(36)}`;
const nowISO = () => new Date().toISOString();

// In a real deployment the signer IP is captured server-side from the
// request. Client-side we cannot see it, so we stamp an honest placeholder
// that still proves "an event happened from a client session".
const ipPlaceholder = () => 'client-session (ip captured server-side)';

/* ============================================================
   STATUS MODEL
   draft -> sent -> viewed -> signed -> completed  (+ voided)
   'signed' = at least one signer signed but not all;
   'completed' = every signer signed.
   ============================================================ */
export const SIGN_FLOW = ['draft', 'sent', 'viewed', 'signed', 'completed'];
export const SIGN_STATUS_META = {
  draft: { label: 'Draft', tone: 'default', blurb: 'Not sent yet' },
  sent: { label: 'Sent', tone: 'info', blurb: 'Awaiting signers' },
  viewed: { label: 'Viewed', tone: 'info', blurb: 'Opened by a signer' },
  signed: { label: 'Partially signed', tone: 'warn', blurb: 'Some signers done' },
  completed: { label: 'Completed', tone: 'ok', blurb: 'Fully executed' },
  voided: { label: 'Voided', tone: 'risk', blurb: 'Cancelled' },
};

export const FIELD_TYPES = [
  { type: 'signature', label: 'Signature', icon: 'edit' },
  { type: 'date', label: 'Date signed', icon: 'calendar' },
  { type: 'text', label: 'Text', icon: 'fileText' },
];
export const fieldMeta = (type) => FIELD_TYPES.find(f => f.type === type) || { type, label: type, icon: 'fileText' };

/* ============================================================
   TYPED-SIGNATURE HELPER
   Builds a self-contained SVG data URL of a name in a script face.
   Used by the typed-signature fallback and by the seed (no canvas
   needed), and safe to persist/print as an <img src>.
   ============================================================ */
export function typedSignatureDataUrl(name, color = '#1c2333') {
  const safe = String(name || 'Signature').replace(/[<>&]/g, '').slice(0, 40);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="150" viewBox="0 0 520 150">` +
    `<text x="24" y="98" font-family="'Segoe Script','Brush Script MT',cursive" ` +
    `font-size="64" fill="${color}">${safe}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

/* ============================================================
   SEED  (a couple of believable requests so /signatures is alive)
   ============================================================ */
function docSnapshot(doc) {
  return doc ? { name: doc.name, accent: doc.accent || '#5b4bf5', blocks: doc.blocks || [] } : null;
}

function buildSeed() {
  const requests = [];
  const docs = (() => { try { return getDocs(); } catch { return []; } })();
  const senderName = getCurrentUser()?.name || 'Rally';

  // 1) A completed, fully-executed proposal (both parties signed).
  const d1 = docs.find(d => d.id === 'doc_seed_1') || docs[0];
  if (d1) {
    const snap = docSnapshot(d1);
    const deal = d1.dealId ? getDeal(d1.dealId) : null;
    const co = deal ? getCompany(deal.companyId) : null;
    const buyerName = (() => {
      const contacts = co ? getContactsForCompany(co.id) : [];
      const c = contacts[0];
      return c ? `${c.firstName} ${c.lastName}` : 'Jordan Avery';
    })();
    const buyerEmail = co?.domain ? `${buyerName.split(' ')[0].toLowerCase()}@${co.domain}` : 'jordan@vertex.com';
    const t0 = new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString();
    const t1 = new Date(Date.now() - 1000 * 60 * 60 * 29).toISOString();
    const t2 = new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString();
    const t3 = new Date(Date.now() - 1000 * 60 * 60 * 19).toISOString();
    const s1 = { id: nid('sgr'), name: buyerName, email: buyerEmail, role: 'Customer', order: 1, status: 'signed', signedAt: t3, signatureDataUrl: typedSignatureDataUrl(buyerName) };
    const s2 = { id: nid('sgr'), name: senderName, email: 'revops@rally.app', role: 'Rally', order: 2, status: 'signed', signedAt: t3, signatureDataUrl: typedSignatureDataUrl(senderName) };
    const fields = [
      { id: nid('sgf'), signerId: s1.id, type: 'signature', label: 'Authorized signature', required: true, value: s1.signatureDataUrl },
      { id: nid('sgf'), signerId: s1.id, type: 'date', label: 'Date signed', required: true, value: t3.slice(0, 10) },
      { id: nid('sgf'), signerId: s2.id, type: 'signature', label: 'Rally signature', required: true, value: s2.signatureDataUrl },
    ];
    requests.push({
      id: 'sig_seed_1', docId: d1.id, docName: snap.name, accent: snap.accent, snapshot: snap,
      status: 'completed', message: 'Excited to partner. Countersigned on our end - your turn.',
      signers: [s1, s2], fields,
      createdAt: t0, updatedAt: t3, sentAt: t1, completedAt: t3,
      events: [
        { id: nid('sge'), at: t0, who: senderName, action: 'created', ip: ipPlaceholder(), label: 'Request created' },
        { id: nid('sge'), at: t1, who: senderName, action: 'sent', ip: ipPlaceholder(), label: `Sent to ${buyerName}` },
        { id: nid('sge'), at: t2, who: buyerName, action: 'viewed', ip: ipPlaceholder(), label: 'Document opened' },
        { id: nid('sge'), at: t3, who: buyerName, action: 'signed', ip: ipPlaceholder(), label: 'Signed the document' },
        { id: nid('sge'), at: t3, who: senderName, action: 'signed', ip: ipPlaceholder(), label: 'Countersigned' },
        { id: nid('sge'), at: t3, who: 'system', action: 'completed', ip: ipPlaceholder(), label: 'All parties signed - execution complete' },
      ],
    });
  }

  // 2) A sent-and-viewed request still awaiting signature.
  const d2 = docs.find(d => d.id === 'doc_seed_2') || docs[1] || d1;
  if (d2) {
    const snap = docSnapshot(d2);
    const t0 = new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString();
    const t1 = new Date(Date.now() - 1000 * 60 * 60 * 3.5).toISOString();
    const t2 = new Date(Date.now() - 1000 * 60 * 50).toISOString();
    const s1 = { id: nid('sgr'), name: 'Morgan Ellis', email: 'morgan@northwind.io', role: 'Customer', order: 1, status: 'viewed', signedAt: null, signatureDataUrl: null };
    const fields = [
      { id: nid('sgf'), signerId: s1.id, type: 'signature', label: 'Authorized signature', required: true, value: null },
      { id: nid('sgf'), signerId: s1.id, type: 'date', label: 'Date signed', required: true, value: null },
      { id: nid('sgf'), signerId: s1.id, type: 'text', label: 'Title', required: false, value: null },
    ];
    requests.push({
      id: 'sig_seed_2', docId: d2.id, docName: snap.name, accent: snap.accent, snapshot: snap,
      status: 'viewed', message: 'Here is the one-pager we discussed. Sign when ready to kick off.',
      signers: [s1], fields,
      createdAt: t0, updatedAt: t2, sentAt: t1, completedAt: null,
      events: [
        { id: nid('sge'), at: t0, who: senderName, action: 'created', ip: ipPlaceholder(), label: 'Request created' },
        { id: nid('sge'), at: t1, who: senderName, action: 'sent', ip: ipPlaceholder(), label: 'Sent to Morgan Ellis' },
        { id: nid('sge'), at: t2, who: 'Morgan Ellis', action: 'viewed', ip: ipPlaceholder(), label: 'Document opened' },
      ],
    });
  }

  return { seededAt: nowISO(), requests };
}

/* ============================================================
   PERSISTENCE + PUB/SUB
   ============================================================ */
let state = load();
const subs = new Set();
function load() {
  try { const raw = localStorage.getItem(LS_KEY); if (raw) return JSON.parse(raw); } catch {}
  const seed = buildSeed();
  try { localStorage.setItem(LS_KEY, JSON.stringify(seed)); } catch {}
  return seed;
}
function commit(next) {
  state = next;
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  subs.forEach(fn => fn(state));
}
export function resetEsign() { try { localStorage.removeItem(LS_KEY); } catch {} state = load(); subs.forEach(fn => fn(state)); }
function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }
export function useEsign() { return useSyncExternalStore(subscribe, () => state, () => state); }

const senderNow = () => getCurrentUser()?.name || 'You';

/* ============================================================
   READ API
   ============================================================ */
export const getRequests = () => state.requests;
export const getRequest = (id) => state.requests.find(r => r.id === id);
export const getRequestsForDoc = (docId) => state.requests.filter(r => r.docId === docId);
export const signerById = (req, signerId) => (req?.signers || []).find(s => s.id === signerId) || null;
export const fieldsForSigner = (req, signerId) => (req?.fields || []).filter(f => f.signerId === signerId);

/* Progress helper for list rows: how many signers have signed. */
export function signProgress(req) {
  const total = (req?.signers || []).length;
  const done = (req?.signers || []).filter(s => s.status === 'signed').length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

/* Chronological (oldest-first) audit trail - the certificate order. */
export function auditTrail(reqId) {
  const req = getRequest(reqId);
  if (!req) return [];
  return [...(req.events || [])].sort((a, b) => new Date(a.at) - new Date(b.at));
}

/* ============================================================
   WRITE API
   ============================================================ */
function patchRequest(id, mut) {
  const requests = state.requests.map(r => {
    if (r.id !== id) return r;
    const next = { ...r, signers: r.signers.map(s => ({ ...s })), fields: r.fields.map(f => ({ ...f })), events: [...r.events] };
    mut(next);
    next.updatedAt = nowISO();
    return next;
  });
  commit({ ...state, requests });
}

function pushEvent(req, action, who, label, meta) {
  req.events.push({ id: nid('sge'), at: nowISO(), who: who || 'system', action, ip: ipPlaceholder(), label: label || action, ...(meta ? { meta } : {}) });
}

/* Re-derive request.status from its signers (never downgrade a voided req). */
function rollupStatus(req) {
  if (req.status === 'voided') return;
  const signers = req.signers || [];
  const signed = signers.filter(s => s.status === 'signed').length;
  if (signers.length && signed === signers.length) req.status = 'completed';
  else if (signed > 0) req.status = 'signed';
  else if (signers.some(s => s.status === 'viewed')) req.status = 'viewed';
  else req.status = req.sentAt ? 'sent' : 'draft';
}

/*
  sendForSignature(docId, signers, opts)
  - signers: [{ name, email, role }]  (order assigned by array position)
  - opts.fields: [{ signerId?|signerIndex?, type, label, required }]
      signerIndex lets callers place fields before signer ids exist.
  - opts.message, opts.docName, opts.snapshot (falls back to live doc)
  Returns { request } or { error }.
*/
export function sendForSignature(docId, signers = [], opts = {}) {
  const doc = getDoc(docId);
  const snap = opts.snapshot || docSnapshot(doc);
  if (!snap) return { error: 'doc', message: 'Document not found to send.' };
  const cleanSigners = (signers || [])
    .map(s => ({ name: (s.name || '').trim(), email: (s.email || '').trim(), role: (s.role || 'Signer').trim() }))
    .filter(s => s.name || s.email);
  if (!cleanSigners.length) return { error: 'signers', message: 'Add at least one signer with a name or email.' };

  const reqId = nid('sig');
  const signerRows = cleanSigners.map((s, i) => ({
    id: nid('sgr'), name: s.name || s.email, email: s.email, role: s.role, order: i + 1,
    status: 'pending', signedAt: null, signatureDataUrl: null,
  }));

  // Resolve fields: map any signerIndex to the created signer id. If a signer
  // has no explicit fields, give them a required signature + date so the doc
  // is always signable out of the box.
  let fields = (opts.fields || []).map(f => {
    let signerId = f.signerId;
    if (!signerId && f.signerIndex != null) signerId = signerRows[f.signerIndex]?.id;
    if (!signerId) signerId = signerRows[0].id;
    return { id: nid('sgf'), signerId, type: f.type || 'text', label: f.label || fieldMeta(f.type).label, required: f.required !== false, value: null };
  });
  for (const s of signerRows) {
    if (!fields.some(f => f.signerId === s.id)) {
      fields.push({ id: nid('sgf'), signerId: s.id, type: 'signature', label: 'Authorized signature', required: true, value: null });
      fields.push({ id: nid('sgf'), signerId: s.id, type: 'date', label: 'Date signed', required: true, value: null });
    }
  }

  const now = nowISO();
  const who = senderNow();
  const req = {
    id: reqId, docId, docName: opts.docName || snap.name, accent: snap.accent || '#5b4bf5', snapshot: snap,
    status: 'sent', message: (opts.message || '').trim(),
    signers: signerRows, fields,
    createdAt: now, updatedAt: now, sentAt: now, completedAt: null,
    events: [],
  };
  pushEvent(req, 'created', who, 'Request created');
  pushEvent(req, 'sent', who, `Sent to ${signerRows.map(s => s.name).join(', ')}`);
  commit({ ...state, requests: [req, ...state.requests] });
  return { request: req };
}

/* Stamp a "viewed" event the first time a given signer opens the doc. */
export function markViewed(reqId, signerId) {
  const req = getRequest(reqId);
  if (!req) return { error: 'missing' };
  const s = signerById(req, signerId);
  if (!s || s.status === 'signed') return { ok: true };
  const already = req.events.some(e => e.action === 'viewed' && e.who === s.name);
  patchRequest(reqId, (r) => {
    const sg = signerById(r, signerId);
    if (sg && sg.status === 'pending') sg.status = 'viewed';
    if (!already) pushEvent(r, 'viewed', s.name, 'Document opened');
    rollupStatus(r);
  });
  return { ok: true };
}

/* Persist a filled field value (text/date) with an audit line. */
export function setFieldValue(reqId, fieldId, value) {
  patchRequest(reqId, (r) => {
    const f = r.fields.find(x => x.id === fieldId);
    if (!f) return;
    f.value = value;
    const who = signerById(r, f.signerId)?.name || 'Signer';
    pushEvent(r, 'field_filled', who, `Filled "${f.label}"`, { fieldId });
  });
  return { ok: true };
}

/*
  recordSignature(reqId, signerId, signatureDataUrl)
  Applies the signature to the signer + their signature field(s), stamps
  the signed event, rolls up status, and stamps completion when every
  signer is done. Returns { ok, completed } or { error }.
*/
export function recordSignature(reqId, signerId, signatureDataUrl) {
  const req = getRequest(reqId);
  if (!req) return { error: 'missing', message: 'Signature request not found.' };
  const signer = signerById(req, signerId);
  if (!signer) return { error: 'signer', message: 'Signer not found on this request.' };
  if (!signatureDataUrl) return { error: 'signature', message: 'A signature is required.' };

  let completed = false;
  patchRequest(reqId, (r) => {
    const sg = signerById(r, signerId);
    const at = nowISO();
    sg.status = 'signed';
    sg.signedAt = at;
    sg.signatureDataUrl = signatureDataUrl;
    // Fill this signer's signature fields; default a date field to today.
    for (const f of r.fields.filter(x => x.signerId === signerId)) {
      if (f.type === 'signature' && !f.value) f.value = signatureDataUrl;
      if (f.type === 'date' && !f.value) f.value = at.slice(0, 10);
    }
    pushEvent(r, 'signed', sg.name, 'Signed the document');
    rollupStatus(r);
    if (r.status === 'completed' && !r.completedAt) {
      r.completedAt = at;
      pushEvent(r, 'completed', 'system', 'All parties signed - execution complete');
      completed = true;
    }
  });
  return { ok: true, completed };
}

/* Void (cancel) a request - keeps the audit trail intact. */
export function voidRequest(reqId, reason = '') {
  patchRequest(reqId, (r) => {
    r.status = 'voided';
    pushEvent(r, 'voided', senderNow(), reason ? `Voided - ${reason}` : 'Request voided');
  });
  return { ok: true };
}

export function deleteRequest(reqId) {
  commit({ ...state, requests: state.requests.filter(r => r.id !== reqId) });
  return { ok: true };
}

/* Prefill likely signers from a doc's linked deal (buyer contacts + rep). */
export function suggestSigners(docId) {
  const doc = getDoc(docId);
  const out = [];
  const deal = doc?.dealId ? getDeal(doc.dealId) : null;
  const co = deal ? getCompany(deal.companyId) : null;
  if (co) {
    for (const c of getContactsForCompany(co.id).slice(0, 1)) {
      out.push({ name: `${c.firstName} ${c.lastName}`, email: c.email || (co.domain ? `${c.firstName.toLowerCase()}@${co.domain}` : ''), role: 'Customer' });
    }
  }
  const rep = deal ? userName(deal.ownerId) : senderNow();
  out.push({ name: rep, email: 'revops@rally.app', role: 'Rally' });
  return out;
}
