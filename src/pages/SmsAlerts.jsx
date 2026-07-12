// ============================================================
// SMS ALERTS  (/sms)
// The home for Rally's SMS channel. Three calm panels:
//   1. Connection status - reads /api/sms-send config state. Until
//      TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM are set the
//      page shows a "not connected yet" state. NOTHING about the live app
//      changes until those env vars exist (fully env-gated).
//   2. Account alert number - the fallback mobile the SMS automation step
//      texts when a rule has no explicit recipient. Persisted via
//      lib/sms.js (getAlertPhone / setAlertPhone).
//   3. Send a test text - the shared SmsComposer.
//
// Everything routes through src/lib/sms.js -> /api/sms-send (Twilio,
// env-gated, never throws). ASCII only, no long dashes. Dark-enterprise.
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import { SectionHeader, StatCard, Card, Button, Badge, Field, Input, useToast } from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import SmsComposer from '../components/SmsComposer.jsx';
import { getAlertPhone, setAlertPhone, smsStatus, validPhone, normalizePhone } from '../lib/sms.js';

export default function SmsAlerts() {
  const toast = useToast();
  const [configured, setConfigured] = useState(null); // null = probing
  const [alert, setAlert] = useState(() => getAlertPhone());
  const [draft, setDraft] = useState(() => getAlertPhone());

  useEffect(() => {
    let live = true;
    smsStatus().then((s) => { if (live) setConfigured(!!s.configured); });
    return () => { live = false; };
  }, []);

  const draftValid = draft.trim() === '' || validPhone(draft);
  const dirty = normalizePhone(draft) !== normalizePhone(alert);

  const saveAlert = () => {
    const saved = setAlertPhone(draft);
    setAlert(saved);
    setDraft(saved);
    toast(saved ? `Alert number set to ${saved}` : 'Alert number cleared', saved ? 'ok' : 'info');
  };

  const statusTone = configured === null ? 'default' : configured ? 'ok' : 'warn';
  const statusText = configured === null ? 'Checking...' : configured ? 'Connected' : 'Not connected';

  const kpis = useMemo(() => ([
    {
      label: 'SMS channel', value: statusText, accent: configured ? 'var(--ok)' : 'var(--warn)',
      icon: <Icon name="phone" size={18} />, sub: configured ? 'Twilio keys detected' : 'add Twilio keys to send',
    },
    {
      label: 'Alert number', value: alert || 'Not set', accent: 'var(--accent)',
      icon: <Icon name="bell" size={18} />, sub: alert ? 'automation fallback recipient' : 'set one below',
    },
    {
      label: 'Provider', value: 'Twilio', accent: 'var(--info)',
      icon: <Icon name="plug" size={18} />, sub: 'standard SMS rates apply',
    },
  ]), [statusText, configured, alert]);

  return (
    <div className="fade-up col gap-4">
      <SectionHeader
        eyebrow="Automated texting"
        title="SMS Alerts"
        sub="Text the right person the moment a deal moves. Your automations can send an SMS step, and this is where the channel and its fallback number live."
        action={<Badge tone={statusTone}>{statusText}</Badge>}
      />

      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
        {kpis.map((k, i) => (
          <StatCard key={i} label={k.label} value={k.value} icon={k.icon} accent={k.accent} sub={k.sub} />
        ))}
      </div>

      {configured === false && (
        <Card className="col gap-2">
          <div className="row gap-2" style={{ alignItems: 'center' }}>
            <span className="row center" style={{ width: 30, height: 30, flex: 'none', borderRadius: 'var(--r-md)', background: 'var(--warn-50, rgba(224,117,45,.12))', color: 'var(--warn)' }}>
              <Icon name="bolt" size={16} />
            </span>
            <div className="fw-7" style={{ color: 'var(--ink)' }}>SMS is not connected yet</div>
          </div>
          <div className="t-sm muted">
            Set these environment variables in your deployment, then redeploy. Until then the app is unchanged and any SMS step is a safe no-op.
          </div>
          <div className="row gap-1 wrap">
            <Badge tone="default">TWILIO_ACCOUNT_SID</Badge>
            <Badge tone="default">TWILIO_AUTH_TOKEN</Badge>
            <Badge tone="default">TWILIO_FROM</Badge>
          </div>
        </Card>
      )}

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', alignItems: 'start' }}>
        <Card className="col gap-3">
          <div className="col" style={{ lineHeight: 1.3 }}>
            <div className="fw-7" style={{ color: 'var(--ink)' }}>Account alert number</div>
            <div className="t-sm muted">The mobile your SMS automation step texts when a rule has no explicit recipient.</div>
          </div>
          <Field label="Mobile number" hint="Used as the default recipient for automation SMS alerts.">
            <Input
              value={draft}
              placeholder="+1 555 123 4567"
              onChange={(e) => setDraft(e.target.value)}
              aria-invalid={!draftValid || undefined}
            />
          </Field>
          <div className="row between wrap gap-2" style={{ alignItems: 'center' }}>
            <div className="t-xs muted">
              {alert ? <>Current: <span className="fw-6" style={{ color: 'var(--ink)' }}>{alert}</span></> : 'No alert number set yet.'}
            </div>
            <div className="row gap-2">
              {alert && (
                <Button variant="ghost" onClick={() => { setDraft(''); setAlertPhone(''); setAlert(''); toast('Alert number cleared', 'info'); }}>
                  Clear
                </Button>
              )}
              <Button variant="accent" onClick={saveAlert} disabled={!draftValid || !dirty}>
                <Icon name="check" size={15} /> Save number
              </Button>
            </div>
          </div>
          {!draftValid && <div className="t-xs" style={{ color: 'var(--risk)', fontWeight: 600 }}>That does not look like a valid phone number.</div>}
        </Card>

        <SmsComposer
          title="Send a test text"
          category="sms-alerts-test"
          defaultTo={alert}
          hint="Sends immediately through Twilio. Try your own number first."
        />
      </div>

      <div className="t-sm muted">
        Tip: add a <span className="fw-6" style={{ color: 'var(--ink)' }}>Send an SMS alert</span> action to any automation on the Automations page to text this number (or a rule-specific one) the instant a trigger fires.
      </div>
    </div>
  );
}
