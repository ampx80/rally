// ScheduleDialog - configure scheduled delivery for a saved report. Pick a
// cadence + send hour, add recipient emails, choose the payload format, and
// optionally fire a "send test now" that renders the report client-side and
// POSTs it to /api/report-deliver (which emails via Resend when configured,
// else no-ops). Persists config through the report-builder store. ASCII only.
// NO em-dash / en-dash.
import React, { useState } from 'react';
import {
  Modal, Field, Input, Select, Button, Badge, useToast,
} from '../UI';
import { Icon } from '../icons';
import {
  CADENCES, saveSchedule, renderScheduleForDelivery, nextRun,
} from '../../lib/report-builder';
import './reports2.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ScheduleDialog({ open, onClose, report, existing, onSaved }) {
  const toast = useToast();
  const [cadence, setCadence] = useState(existing?.cadence || 'weekly');
  const [hour, setHour] = useState(existing?.hour ?? 8);
  const [format, setFormat] = useState(existing?.format || 'summary');
  const [recipients, setRecipients] = useState(existing?.recipients || []);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  if (!open || !report) return null;

  const addRecipient = () => {
    const e = draft.trim().toLowerCase();
    if (!EMAIL_RE.test(e)) { toast('Enter a valid email', 'warn'); return; }
    if (recipients.includes(e)) { setDraft(''); return; }
    setRecipients([...recipients, e]);
    setDraft('');
  };
  const removeRecipient = (e) => setRecipients(recipients.filter(x => x !== e));

  const buildConfig = () => ({
    id: existing?.id || null,
    reportId: report.id,
    reportTitle: report.title,
    cadence, hour: Number(hour), format, recipients,
    createdAt: existing?.createdAt,
    lastRunAt: existing?.lastRunAt || null,
    nextRunAt: nextRun(cadence, Number(hour)),
    enabled: existing?.enabled !== false,
  });

  const doSave = () => {
    if (!recipients.length) { toast('Add at least one recipient', 'warn'); return; }
    const saved = saveSchedule(buildConfig());
    toast('Delivery scheduled');
    onSaved?.(saved);
    onClose();
  };

  const sendTest = async () => {
    if (!recipients.length) { toast('Add at least one recipient', 'warn'); return; }
    setSending(true);
    try {
      const payload = renderScheduleForDelivery(buildConfig());
      const r = await fetch('/api/report-deliver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', deliveries: [payload] }),
      });
      const j = await r.json().catch(() => ({}));
      if (j?.emailed) toast(`Test sent to ${recipients.length} recipient(s)`);
      else toast('Rendered. Email is a no-op until RESEND_API_KEY is set.', 'warn');
    } catch (e) {
      toast('Could not reach delivery endpoint', 'risk');
    } finally {
      setSending(false);
    }
  };

  const cad = CADENCES.find(c => c.id === cadence);

  return (
    <Modal open={open} onClose={onClose} title="Schedule delivery" width={620}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="ghost" onClick={sendTest} disabled={sending}>
          <Icon name="send" size={15} /> {sending ? 'Sending...' : 'Send test now'}
        </Button>
        <Button onClick={doSave}><Icon name="check" size={16} /> Save schedule</Button>
      </>}>
      <div className="col gap-3">
        <div className="row gap-2" style={{ alignItems: 'center' }}>
          <span className="row center" style={{ width: 34, height: 34, borderRadius: 9, background: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent-600)', flex: 'none' }}>
            <Icon name="pie" size={18} />
          </span>
          <div className="col" style={{ minWidth: 0 }}>
            <span className="fw-7 clip">{report.title}</span>
            <span className="rb-muted">Delivered as a chart summary + CSV attachment.</span>
          </div>
        </div>

        <div className="row gap-2 wrap">
          <Field label="Cadence">
            <Select value={cadence} onChange={e => setCadence(e.target.value)}>
              {CADENCES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </Select>
          </Field>
          <Field label="Send hour (local)">
            <Select value={hour} onChange={e => setHour(e.target.value)}>
              {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{h.toString().padStart(2, '0')}:00</option>)}
            </Select>
          </Field>
          <Field label="Format">
            <Select value={format} onChange={e => setFormat(e.target.value)}>
              <option value="summary">Summary + CSV</option>
              <option value="csv">CSV only</option>
            </Select>
          </Field>
        </div>
        <div className="rb-muted">{cad?.desc}. Next run {new Date(nextRun(cadence, Number(hour))).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}.</div>

        <Field label="Recipients">
          <div className="row gap-1">
            <Input value={draft} onChange={e => setDraft(e.target.value)} placeholder="name@company.com"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addRecipient(); } }} />
            <Button variant="ghost" onClick={addRecipient}><Icon name="plus" size={15} /> Add</Button>
          </div>
        </Field>
        {recipients.length > 0 && (
          <div className="row gap-1 wrap">
            {recipients.map(e => (
              <span key={e} className="rb-recip">
                {e}<button onClick={() => removeRecipient(e)} aria-label={`Remove ${e}`}><Icon name="x" size={13} /></button>
              </span>
            ))}
          </div>
        )}
        <div className="row gap-1" style={{ alignItems: 'center' }}>
          <Badge tone="accent">Cron</Badge>
          <span className="rb-muted">Send a test now. Automatic scheduled delivery activates when the sending backend is connected.</span>
        </div>
      </div>
    </Modal>
  );
}
