// src/components/SmsComposer.jsx
//
// A small, self-contained SMS composer. Recipient(s) + message + a live segment
// counter + send. Routes through src/lib/sms.js -> /api/sms-send (Twilio,
// env-gated). If Twilio is not configured the endpoint returns configured:false
// and this surfaces a calm "not connected yet" note instead of an error.
// Dark-enterprise, #5b4bf5 accent. ASCII only, no long dashes.
import React, { useMemo, useState } from 'react';
import { Card, Field, Input, Textarea, Button, Badge, useToast } from './UI.jsx';
import { Icon } from './icons.jsx';
import { sendSms, smsSegments, validPhone } from '../lib/sms.js';

export default function SmsComposer({
  defaultTo = '',
  defaultBody = '',
  category = 'composer',
  title = 'Send a text',
  hint = 'One or more mobile numbers, comma or newline separated.',
  onSent,
}) {
  const [to, setTo] = useState(defaultTo);
  const [body, setBody] = useState(defaultBody);
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState(null);
  const toast = useToast();

  const recipients = useMemo(
    () => to.split(/[,\n;]+/).map((s) => s.trim()).filter(Boolean),
    [to],
  );
  const invalid = recipients.filter((r) => !validPhone(r));
  const seg = smsSegments(body);
  const canSend = recipients.length > 0 && invalid.length === 0 && body.trim().length > 0 && !sending;

  const onSend = async () => {
    if (!canSend) return;
    setSending(true);
    setNote(null);
    const res = await sendSms({ to: recipients, body, category });
    setSending(false);
    if (res && res.configured === false) {
      setNote({ tone: 'warn', text: 'SMS is not connected yet. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM to send for real.' });
      toast('SMS not connected - add your Twilio keys', 'warn');
      return;
    }
    if (res && res.ok) {
      const n = res.sent || recipients.length;
      setNote({ tone: 'ok', text: `Sent to ${n} recipient${n === 1 ? '' : 's'}.` });
      toast(`Text sent to ${n} recipient${n === 1 ? '' : 's'}`, 'ok');
      setBody('');
      if (onSent) onSent(res);
    } else {
      const err = (res && res.error) || 'unknown error';
      setNote({ tone: 'risk', text: `Could not send: ${err}` });
      toast('Could not send the text', 'risk');
    }
  };

  const toneColor = { ok: 'var(--ok)', warn: 'var(--warn)', risk: 'var(--risk)' };

  return (
    <Card className="col gap-3">
      <div className="row gap-2" style={{ alignItems: 'center' }}>
        <span className="row center" style={{ width: 34, height: 34, flex: 'none', borderRadius: 'var(--r-md)', background: 'var(--accent-50)', color: 'var(--accent)', boxShadow: 'inset 0 0 0 1px rgba(91,75,245,.18)' }}>
          <Icon name="phone" size={18} />
        </span>
        <div className="col" style={{ lineHeight: 1.2, minWidth: 0 }}>
          <div className="fw-7" style={{ color: 'var(--ink)' }}>{title}</div>
          <div className="t-xs muted">Powered by Twilio. Standard SMS rates apply.</div>
        </div>
      </div>

      <Field label="To" hint={hint}>
        <Input
          value={to}
          placeholder="+1 555 123 4567, +1 555 987 6543"
          onChange={(e) => setTo(e.target.value)}
          aria-invalid={invalid.length > 0 || undefined}
        />
      </Field>

      {recipients.length > 0 && (
        <div className="row gap-1 wrap">
          {recipients.slice(0, 12).map((r, i) => {
            const bad = !validPhone(r);
            return <Badge key={i} tone={bad ? 'risk' : 'accent'}>{r}{bad ? ' (invalid)' : ''}</Badge>;
          })}
          {recipients.length > 12 && <Badge tone="default">+{recipients.length - 12} more</Badge>}
        </div>
      )}

      <Field label="Message">
        <Textarea
          rows={4}
          value={body}
          placeholder="Type your text. Keep it short - texts get read in seconds."
          onChange={(e) => setBody(e.target.value)}
          maxLength={1600}
        />
      </Field>

      <div className="row between" style={{ alignItems: 'center' }}>
        <div className="t-xs muted">
          {seg.chars} char{seg.chars === 1 ? '' : 's'} - {seg.segments} segment{seg.segments === 1 ? '' : 's'}
          {seg.encoding === 'unicode' ? ' (unicode)' : ''}
        </div>
        <Button variant="accent" onClick={onSend} disabled={!canSend}>
          <Icon name="send" size={15} /> {sending ? 'Sending...' : 'Send text'}
        </Button>
      </div>

      {note && (
        <div className="t-sm fade-up" style={{ color: toneColor[note.tone] || 'var(--ink)', fontWeight: 600 }}>
          {note.text}
        </div>
      )}
    </Card>
  );
}
