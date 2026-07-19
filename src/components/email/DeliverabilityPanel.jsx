// ============================================================
// DeliverabilityPanel - domain authentication status + DNS setup.
// The SPF / DKIM / DMARC checklist every sender needs to land in the
// inbox instead of spam. When RESEND_API_KEY is wired it pulls the
// LIVE record status from Resend (via /api/marketing-cron?action=
// domain-status) and shows verified / pending / failed per record.
// With no backend it falls back to copy-paste DNS record guidance so
// the operator can still set the domain up correctly.
//
// ASCII only. NO em-dash / en-dash.
// ============================================================
import React, { useEffect, useState } from 'react';
import { Card, Badge, Button, useToast } from '../UI.jsx';
import { Icon } from '../icons.jsx';

// Reference DNS records for authenticating a sending domain through Resend
// (Amazon SES infrastructure). Used as guidance when no live domain is wired.
const REFERENCE_RECORDS = [
  { record: 'SPF', type: 'TXT', name: 'send', value: 'v=spf1 include:amazonses.com ~all', why: 'Authorizes the sending servers. Without it, receivers cannot confirm the mail came from you.' },
  { record: 'DKIM', type: 'TXT', name: 'resend._domainkey', value: 'p=MIGfMA0GCSq... (unique per domain, copy from Resend)', why: 'Cryptographically signs every message so tampering is detectable and reputation accrues to your domain.' },
  { record: 'MX', type: 'MX', name: 'send', value: 'feedback-smtp.us-east-1.amazonses.com (priority 10)', why: 'Routes bounce and complaint feedback back so suppression stays accurate.' },
  { record: 'DMARC', type: 'TXT', name: '_dmarc', value: 'v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com', why: 'Tells receivers what to do with mail that fails SPF/DKIM and gives you reporting. Start at p=none, then tighten to quarantine/reject.' },
];

const STATUS_TONE = { verified: 'ok', valid: 'ok', pending: 'warn', not_started: 'default', temporary_failure: 'warn', failed: 'risk', failure: 'risk' };

function CopyButton({ text, label = 'Copy' }) {
  const toast = useToast();
  const copy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(text);
      else { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
      toast('Copied to clipboard');
    } catch { toast('Copy failed - select and copy manually', 'warn'); }
  };
  return <Button variant="quiet" size="sm" onClick={copy} title="Copy value"><Icon name="copy" size={13} /> {label}</Button>;
}

function RecordRow({ rec }) {
  const tone = STATUS_TONE[String(rec.status || '').toLowerCase()] || 'default';
  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '.7rem .8rem' }} className="col gap-2">
      <div className="row between wrap gap-2" style={{ alignItems: 'center' }}>
        <div className="row gap-2" style={{ alignItems: 'center' }}>
          <Badge tone="accent">{rec.record || rec.type}</Badge>
          <span className="t-xs muted">{rec.type}</span>
        </div>
        {rec.status ? <Badge tone={tone}>{String(rec.status).replace(/_/g, ' ')}</Badge> : <Badge tone="default">not configured</Badge>}
      </div>
      <div className="col gap-1">
        <div className="row between gap-2" style={{ alignItems: 'center' }}>
          <span className="t-xs muted">Host / name</span>
          <CopyButton text={rec.name} label="Copy host" />
        </div>
        <code className="tnum" style={{ fontSize: '.82rem', wordBreak: 'break-all', background: 'var(--n-50)', borderRadius: 6, padding: '.35rem .5rem' }}>{rec.name}</code>
        <div className="row between gap-2" style={{ alignItems: 'center', marginTop: 4 }}>
          <span className="t-xs muted">Value</span>
          <CopyButton text={rec.value} label="Copy value" />
        </div>
        <code className="tnum" style={{ fontSize: '.82rem', wordBreak: 'break-all', background: 'var(--n-50)', borderRadius: 6, padding: '.35rem .5rem' }}>{rec.value}</code>
      </div>
      {rec.why && <div className="t-xs muted">{rec.why}</div>}
    </div>
  );
}

export default function DeliverabilityPanel() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [domains, setDomains] = useState([]);
  const [reason, setReason] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/marketing-cron?action=domain-status');
      const json = await res.json().catch(() => ({}));
      setConfigured(!!json.configured);
      setDomains(Array.isArray(json.domains) ? json.domains : []);
      setReason(json.reason || '');
    } catch (e) {
      setConfigured(false); setDomains([]); setReason((e && e.message) || 'network');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const verify = async () => {
    await load();
    toast(configured ? 'Re-checked domain status with Resend' : 'No sender configured - showing DNS setup guidance', configured ? 'ok' : 'info');
  };

  const anyVerified = domains.some(d => ['verified', 'valid'].includes(String(d.status || '').toLowerCase()));

  return (
    <div className="col gap-3">
      <Card className="col gap-2">
        <div className="row between wrap gap-2" style={{ alignItems: 'center' }}>
          <div className="col gap-1" style={{ minWidth: 0 }}>
            <div className="fw-7 row gap-2" style={{ alignItems: 'center' }}><Icon name="shield" size={16} /> Domain authentication</div>
            <div className="t-sm muted">SPF, DKIM, and DMARC prove you are who you say you are. Verified domains land in the inbox; unauthenticated mail lands in spam.</div>
          </div>
          <Button variant="primary" size="sm" onClick={verify} disabled={loading}><Icon name="rotateCcw" size={14} /> {loading ? 'Checking...' : 'Verify now'}</Button>
        </div>
        <div className="row gap-2 wrap">
          {loading ? <Badge tone="default">Checking status...</Badge>
            : configured
              ? (anyVerified ? <Badge tone="ok"><Icon name="check" size={12} /> Authenticated domain live</Badge> : <Badge tone="warn">Domain added, records pending</Badge>)
              : <Badge tone="default">No sender configured (RESEND_API_KEY)</Badge>}
          {reason && <span className="t-xs muted">{reason}</span>}
        </div>
      </Card>

      {configured && domains.length > 0 ? (
        domains.map(d => (
          <Card key={d.id || d.name} className="col gap-2">
            <div className="row between wrap gap-2" style={{ alignItems: 'center' }}>
              <div className="fw-6 row gap-2" style={{ alignItems: 'center' }}><Icon name="globe" size={15} /> {d.name}</div>
              <Badge tone={STATUS_TONE[String(d.status || '').toLowerCase()] || 'default'}>{String(d.status || 'unknown').replace(/_/g, ' ')}</Badge>
            </div>
            <div className="col gap-2">
              {(d.records && d.records.length ? d.records : REFERENCE_RECORDS).map((r, i) => <RecordRow key={i} rec={r} />)}
            </div>
          </Card>
        ))
      ) : (
        <Card className="col gap-2">
          <div className="fw-6 row gap-2" style={{ alignItems: 'center' }}><Icon name="list" size={15} /> DNS records to add</div>
          <div className="t-sm muted">Add these at your DNS provider, then hit Verify. Values with a note are unique per domain and come from your Resend dashboard.</div>
          <div className="col gap-2" style={{ marginTop: '.25rem' }}>
            {REFERENCE_RECORDS.map((r, i) => <RecordRow key={i} rec={r} />)}
          </div>
        </Card>
      )}
    </div>
  );
}
