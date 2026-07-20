// Campaigns. Ardovo's Marketing hub. Two surfaces behind a tab switch:
//   Broadcasts  - the real send layer. Author an email (subject + body with
//                 {firstName}/{company} merge tokens), pick a live audience,
//                 preview it, then send now or schedule. Every send routes to
//                 POST /api/broadcast -> api/_lib-email.js. Backed by the
//                 persisted src/lib/marketing-campaigns.js slice.
//   Performance - the original programs dashboard (KPIs + channel mix + a dense
//                 sortable table over the store-ext campaigns). Preserved
//                 verbatim so nothing that shipped before is lost.
import React, { useMemo, useState } from 'react';
import {
  useExt, getCampaigns, campaignRevenue, campaignLeads,
} from '../lib/store-ext.js';
import { useStore } from '../lib/store.js';
import {
  useMarketing, getMarketingCampaigns, marketingStats, applyTokens,
  AUDIENCES, audienceById, resolveAudience, audienceCount, MERGE_TOKENS,
  createCampaign, updateCampaign, deleteCampaign, duplicateCampaign,
  scheduleCampaign, recordSend,
} from '../lib/marketing-campaigns.js';
import {
  Button, Card, Badge, SectionHeader, Field, Input, Select, Textarea, Modal, Segmented,
  StatCard, ProgressBar, Tabs, EmptyState, moneyK, relTime, shortDate, useToast,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import DataTable from '../components/DataTable.jsx';
import VisualEmailBuilder from '../components/email/VisualEmailBuilder.jsx';
import { renderEmailHtml, emailToText, blankEmailDoc } from '../lib/email-blocks.js';

const CHANNELS = ['ABM', 'Email', 'Paid ads', 'Webinar', 'Event', 'Partner'];

// Mirrors the validator in api/broadcast.js for the client-side test-send check.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STATUS_TONE = { active: 'ok', scheduled: 'info', completed: 'default', draft: 'warn' };
// Marketing-campaign lifecycle -> badge tone.
const MC_STATUS_TONE = { draft: 'warn', scheduled: 'info', sending: 'accent', sent: 'ok' };

const pct = (num, den) => (den > 0 ? (num / den) * 100 : 0);
const fmtPct = (v) => `${v.toFixed(1)}%`;

// A deterministic plausible spark from a seed number (so the KPI sparks look
// alive and varied without any extra stored series). Rising by default.
function spark(seed, len = 12, rise = 1) {
  const out = [];
  let v = 40 + (seed % 30);
  for (let i = 0; i < len; i++) {
    const wobble = ((seed * (i + 3)) % 17) - 8;
    v = Math.max(6, v + wobble + rise * 3);
    out.push(Math.round(v));
  }
  return out;
}

/* ============================================================
   EMAIL BUILDER  (create / edit a broadcast)
   ============================================================ */
const EMPTY_DRAFT = { id: null, name: '', type: 'email', subject: '', body: '', audience: 'all-contacts', customList: '', designMode: 'text', design: null };

function EmailBuilder({ open, onClose, initial, onSaved, onSent }) {
  const toast = useToast();
  const [d, setD] = useState(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // Seed the form whenever the modal opens (create = blank, edit = record).
  React.useEffect(() => {
    if (open) { setD(initial ? { ...EMPTY_DRAFT, ...initial } : EMPTY_DRAFT); setShowPreview(false); setTestEmail(''); }
  }, [open, initial]);

  const set = (k, v) => setD(prev => ({ ...prev, [k]: v }));

  // Live audience resolution for the count + the preview sample.
  const recipients = useMemo(
    () => resolveAudience(d.audience, d.customList),
    [d.audience, d.customList],
  );
  const sample = recipients[0] || { firstName: 'Jordan', company: 'Vertex Robotics' };
  const previewVars = { firstName: sample.firstName || 'Jordan', company: sample.company || 'Vertex Robotics' };

  // Persist the draft (create or update) and return the saved record.
  const persist = () => {
    if (!d.name.trim()) { toast('Name your campaign', 'risk'); return null; }
    if (d.id) { const r = updateCampaign(d.id, d); return r.campaign; }
    const r = createCampaign(d);
    if (r.error) { toast(r.message, 'risk'); return null; }
    // Fold the freshly-created id back in so a subsequent Send targets it.
    setD(prev => ({ ...prev, id: r.campaign.id }));
    return r.campaign;
  };

  const onSaveDraft = () => {
    const rec = persist();
    if (!rec) return;
    toast('Draft saved');
    onSaved?.(rec);
    onClose?.();
  };

  const visual = d.designMode === 'visual';

  // Save the draft with a scheduled marker. There is no live server scheduler
  // wired here, so the copy stays honest: this saves a scheduled draft, it does
  // not promise an automatic future send.
  const onSchedule = () => {
    const rec = persist();
    if (!rec) return;
    scheduleCampaign(rec.id, new Date(Date.now() + 86400000).toISOString());
    toast('Saved as a scheduled draft. Live scheduling activates when the sending backend is connected.');
    onSaved?.(rec);
    onClose?.();
  };

  // Build the campaign payload the /api/broadcast route expects, from the
  // current draft. Shared by the real send and the test send.
  const buildPayloadCampaign = () => {
    const p = { id: d.id || undefined, name: d.name, subject: d.subject, type: d.type };
    if (visual) {
      p.designHtml = renderEmailHtml(d.design, { subject: d.subject });
      p.designText = emailToText(d.design);
    } else {
      p.body = d.body;
    }
    return p;
  };

  // Shared content validation used by both send and test-send.
  const validateContent = () => {
    if (!d.subject.trim()) { toast('Add a subject line', 'risk'); return false; }
    if (visual) {
      if (!d.design || !(d.design.blocks || []).length) { toast('Add a block to your design', 'risk'); return false; }
    } else if (!d.body.trim()) { toast('Write a message', 'risk'); return false; }
    return true;
  };

  // Light pre-send lint for visual designs: warn (allow override) when a button
  // link is still the placeholder 'https://' or an image has no source, so a
  // half-finished design does not silently ship.
  const confirmDesignLint = () => {
    if (!visual || !d.design) return true;
    const issues = new Set();
    for (const b of (d.design.blocks || [])) {
      const els = b.type === 'columns' ? [b.left, b.right] : [b];
      for (const el of els) {
        if (!el) continue;
        if (el.type === 'button') {
          const href = String(el.href || '').trim();
          if (href === '' || href === 'https://' || href === 'http://') issues.add('a button link is still a placeholder (https://)');
        }
        if (el.type === 'image' && !String(el.src || '').trim()) issues.add('an image block has no URL (it will not render)');
      }
    }
    if (!issues.size) return true;
    return window.confirm(`Before you send:\n- ${[...issues].join('\n- ')}\n\nSend anyway?`);
  };

  const sendTest = async () => {
    if (!validateContent()) return;
    const to = testEmail.trim();
    if (!EMAIL_RE.test(to)) { toast('Enter a valid test email address', 'risk'); return; }
    setTesting(true);
    try {
      const resp = await fetch('/api/broadcast', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign: buildPayloadCampaign(), test: true, testEmail: to }),
      });
      const j = await resp.json().catch(() => ({}));
      if (j.configured === false) {
        toast('Email sending is not configured (set RESEND_API_KEY).', 'warn');
      } else if (j.ok) {
        toast(`Test sent to ${to}`);
      } else {
        toast(j.error || 'Test send failed', 'risk');
      }
    } catch (e) {
      toast('Network error sending test', 'risk');
    } finally {
      setTesting(false);
    }
  };

  const doSend = async () => {
    if (!validateContent()) return;
    if (!recipients.length) { toast('This audience is empty', 'risk'); return; }
    if (!confirmDesignLint()) return;
    const rec = persist();
    if (!rec) return;
    setBusy(true);
    const payloadCampaign = { ...buildPayloadCampaign(), id: rec.id, name: rec.name };
    try {
      const resp = await fetch('/api/broadcast', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign: payloadCampaign, recipients }),
      });
      const j = await resp.json().catch(() => ({}));
      if (j.configured === false) {
        // Sending not wired in this environment. Keep the modal open so the user
        // can fix it (or copy the draft) instead of silently dismissing.
        toast('Email sending is not configured (set RESEND_API_KEY).', 'warn');
      } else if (j.ok) {
        recordSend(rec.id, { recipients: recipients.length, sent: j.sent || 0, failed: j.failed || 0 });
        toast(`Sent to ${j.sent || 0} of ${recipients.length}`);
        onSent?.(rec);
        onClose?.();
      } else {
        // Real failure (e.g. 422 domain not verified). Keep the modal open so
        // the user can fix subject / audience / Resend and retry.
        toast(j.error || 'Send failed', 'risk');
      }
    } catch (e) {
      toast('Network error sending broadcast', 'risk');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={d.id ? 'Edit broadcast' : 'New broadcast'}
      width={d.designMode === 'visual' ? 1040 : 760}
      footer={
        <div className="row between" style={{ width: '100%', gap: '.75rem' }}>
          <span className="t-sm muted">{recipients.length.toLocaleString()} recipient{recipients.length === 1 ? '' : 's'}</span>
          <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
            <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button variant="quiet" onClick={onSaveDraft} disabled={busy}>Save draft</Button>
            <Button variant="quiet" onClick={onSchedule} disabled={busy}><Icon name="calendar" size={15} /> Save as scheduled draft</Button>
            <Button variant="primary" onClick={doSend} disabled={busy}>
              <Icon name="send" size={15} /> {busy ? 'Sending...' : 'Send now'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="col gap-3">
        <div className="grid" style={{ gridTemplateColumns: '1fr 180px', gap: '.85rem' }}>
          <Field label="Campaign name">
            <Input autoFocus placeholder="Q4 product announcement" value={d.name}
              onChange={e => set('name', e.target.value)} />
          </Field>
          <Field label="Type">
            <Select value={d.type} onChange={e => set('type', e.target.value)}>
              <option value="email">One-time email</option>
              <option value="nurture">Nurture</option>
            </Select>
          </Field>
        </div>

        <Field label="Audience" hint={audienceById(d.audience).hint}>
          <Select value={d.audience} onChange={e => set('audience', e.target.value)}>
            {AUDIENCES.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
          </Select>
        </Field>
        {d.audience === 'custom' && (
          <Field label="Custom recipients" hint="Emails separated by commas, spaces, or new lines">
            <Textarea rows={3} placeholder="jordan@vertexrobotics.com, sam@northwind.com"
              value={d.customList} onChange={e => set('customList', e.target.value)} />
          </Field>
        )}

        <Field label="Subject" hint="Merge tokens work here too">
          <Input placeholder="{firstName}, a quick idea for {company}" value={d.subject}
            onChange={e => set('subject', e.target.value)} />
        </Field>

        <div className="row gap-2" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="t-xs muted">Editor</span>
          <Segmented
            value={d.designMode}
            onChange={(v) => {
              const mode = v === 'visual' ? 'visual' : 'text';
              setD(prev => ({ ...prev, designMode: mode, design: mode === 'visual' && !prev.design ? blankEmailDoc() : prev.design }));
            }}
            options={[{ value: 'text', label: 'Plain text' }, { value: 'visual', label: 'Visual design' }]}
          />
          <span className="spacer" style={{ flex: 1 }} />
          {d.designMode === 'text' && (
            <Button variant="quiet" size="sm" onClick={() => setShowPreview(s => !s)}>
              <Icon name="eye" size={15} /> {showPreview ? 'Hide preview' : 'Preview'}
            </Button>
          )}
        </div>

        <div className="row gap-2" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="t-xs muted">Send test to me</span>
          <Input
            type="email"
            placeholder="you@company.com"
            value={testEmail}
            onChange={e => setTestEmail(e.target.value)}
            style={{ maxWidth: 260 }}
          />
          <Button variant="quiet" size="sm" onClick={sendTest} disabled={testing || busy}>
            <Icon name="send" size={14} /> {testing ? 'Sending test...' : 'Send test'}
          </Button>
        </div>

        {d.designMode === 'visual' ? (
          <VisualEmailBuilder
            doc={d.design || blankEmailDoc()}
            onChange={(doc) => set('design', doc)}
            sampleVars={previewVars}
          />
        ) : (
          <>
            <Field label="Message">
              <Textarea rows={8} placeholder={'Hi {firstName},\n\n...'} value={d.body}
                onChange={e => set('body', e.target.value)} />
            </Field>
            <div className="row gap-2" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="t-xs muted">Merge tokens:</span>
              {MERGE_TOKENS.map(t => (
                <button key={t.token} type="button" className="badge" title={`Insert ${t.label}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => set('body', `${d.body}${t.token}`)}>
                  {t.token}
                </button>
              ))}
            </div>
            {showPreview && (
              <Card style={{ background: 'var(--n-50)' }}>
                <div className="t-xs muted" style={{ marginBottom: 6 }}>
                  Preview for {sample.firstName || 'a recipient'}{sample.company ? ` at ${sample.company}` : ''}
                </div>
                <div className="fw-7" style={{ color: 'var(--ink)', marginBottom: 10 }}>
                  {applyTokens(d.subject, previewVars) || <span className="muted">No subject</span>}
                </div>
                <div style={{ whiteSpace: 'pre-wrap', color: 'var(--n-700)', fontSize: '.94rem', lineHeight: 1.6 }}>
                  {applyTokens(d.body, previewVars) || <span className="muted">No message yet</span>}
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

/* ============================================================
   BROADCASTS TAB
   ============================================================ */
function Broadcasts() {
  const toast = useToast();
  useMarketing();      // re-render on marketing-slice writes
  useStore();          // re-render when the CRM book of business changes (counts)
  useExt();            // leads live in the ext store (audience counts)
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const campaigns = getMarketingCampaigns();
  const stats = marketingStats();

  const openNew = () => { setEditing(null); setBuilderOpen(true); };
  const openEdit = (c) => { setEditing(c); setBuilderOpen(true); };

  const onDuplicate = (c) => { duplicateCampaign(c.id); toast('Duplicated'); };
  const onDelete = (c) => { deleteCampaign(c.id); toast('Deleted'); };

  return (
    <div className="fade-up">
      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', marginBottom: '1.25rem' }}>
        <StatCard label="Broadcasts" value={stats.total} sub="in this workspace"
          icon={<Icon name="megaphone" size={18} />} spark={spark(4, 12, 0.5)} />
        <StatCard label="Emails sent" value={stats.sent} trend={9}
          icon={<Icon name="send" size={18} />} spark={spark(8, 12, 1)} accent="#0ea5a3" sparkColor="#0ea5a3" />
        <StatCard label="Open rate" value={Number(stats.openRate.toFixed(1))} format={(n) => `${n.toFixed(1)}%`}
          icon={<Icon name="mail" size={18} />} spark={spark(6, 12, 0.6)} accent="#e0752d" sparkColor="#e0752d" />
        <StatCard label="Scheduled / sending" value={stats.active} sub="queued now"
          icon={<Icon name="clock" size={18} />} spark={spark(3, 12, 0.3)} />
      </div>

      <SectionHeader
        title="Broadcasts"
        sub="Author, preview, and send email to a live audience"
        action={<Button variant="primary" size="sm" onClick={openNew}><Icon name="plus" size={16} /> New broadcast</Button>}
      />

      {campaigns.length === 0 ? (
        <Card>
          <EmptyState icon="📣" title="No broadcasts yet"
            body="Create your first email broadcast, pick an audience from your contacts or leads, and send it."
            action={<Button variant="primary" size="sm" onClick={openNew}><Icon name="plus" size={16} /> New broadcast</Button>}
          />
        </Card>
      ) : (
        <div className="col gap-3">
          {campaigns.map(c => {
            const count = audienceCount(c.audience, c.customList);
            const m = c.metrics || {};
            const openRate = pct(m.opened, m.sent);
            return (
              <Card key={c.id} hover>
                <div className="row between wrap gap-3" style={{ alignItems: 'flex-start' }}>
                  <div className="col gap-1" style={{ minWidth: 0, flex: '1 1 320px' }}>
                    <div className="row gap-2" style={{ alignItems: 'center', flexWrap: 'wrap', minWidth: 0 }}>
                      <span className="fw-7" style={{ color: 'var(--ink)', fontSize: '1.02rem' }}>{c.name}</span>
                      <Badge tone={MC_STATUS_TONE[c.status] || 'default'}>{c.status}</Badge>
                      <Badge>{c.type === 'nurture' ? 'Nurture' : 'Email'}</Badge>
                    </div>
                    <div className="t-sm muted clip">{applyTokens(c.subject, { firstName: 'there', company: 'your team' }) || 'No subject'}</div>
                    <div className="row gap-2 t-xs muted" style={{ flexWrap: 'wrap', marginTop: 2 }}>
                      <span><Icon name="users" size={13} /> {audienceById(c.audience).label} ({count.toLocaleString()})</span>
                      {c.status === 'sent' && c.sentAt && <span><Icon name="check" size={13} /> Sent {relTime(c.sentAt)}</span>}
                      {c.status === 'scheduled' && c.scheduledAt && <span><Icon name="calendar" size={13} /> {shortDate(c.scheduledAt)}</span>}
                      {c.status === 'draft' && <span><Icon name="edit" size={13} /> Updated {relTime(c.updatedAt)}</span>}
                    </div>
                  </div>

                  <div className="row gap-1" style={{ flex: 'none' }}>
                    <Button variant="quiet" size="sm" onClick={() => openEdit(c)} title="Edit"><Icon name="edit" size={15} /></Button>
                    <Button variant="quiet" size="sm" onClick={() => onDuplicate(c)} title="Duplicate"><Icon name="copy" size={15} /></Button>
                    <Button variant="quiet" size="sm" onClick={() => onDelete(c)} title="Delete"><Icon name="trash" size={15} /></Button>
                  </div>
                </div>

                {(m.sent > 0) && (
                  <div className="row gap-4 wrap" style={{ marginTop: '.9rem', paddingTop: '.9rem', borderTop: '1px solid var(--line)' }}>
                    <div className="col" style={{ minWidth: 90 }}>
                      <span className="tnum fw-7">{(m.sent || 0).toLocaleString()}</span>
                      <span className="t-xs muted">Delivered</span>
                    </div>
                    <div className="col" style={{ minWidth: 140, flex: '1 1 160px' }}>
                      <span className="tnum fw-7 t-sm">{fmtPct(openRate)} open</span>
                      <ProgressBar value={openRate} height={6} />
                    </div>
                    <div className="col" style={{ minWidth: 90 }}>
                      <span className="tnum fw-7">{(m.clicked || 0).toLocaleString()}</span>
                      <span className="t-xs muted">Clicked</span>
                    </div>
                    {(m.failed > 0) && (
                      <div className="col" style={{ minWidth: 80 }}>
                        <span className="tnum fw-7" style={{ color: 'var(--risk)' }}>{m.failed.toLocaleString()}</span>
                        <span className="t-xs muted">Failed</span>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <EmailBuilder
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        initial={editing}
        onSaved={() => {}}
        onSent={() => {}}
      />
    </div>
  );
}

/* ============================================================
   PERFORMANCE TAB  (original programs dashboard, preserved)
   ============================================================ */
function Performance() {
  const campaigns = getCampaigns();

  const stats = useMemo(() => {
    const revenue = campaignRevenue();
    const leads = campaignLeads();
    const active = campaigns.filter(c => c.status === 'active').length;
    const rates = campaigns.filter(c => c.sent > 0).map(c => pct(c.opened, c.sent));
    const avgOpen = rates.length ? rates.reduce((s, r) => s + r, 0) / rates.length : 0;
    return { revenue, leads, active, avgOpen };
  }, [campaigns]);

  // Revenue grouped by channel for the mix card, sorted desc.
  const channelMix = useMemo(() => {
    const by = new Map();
    for (const c of campaigns) by.set(c.channel, (by.get(c.channel) || 0) + c.revenue);
    const rows = [...by.entries()].map(([channel, revenue]) => ({ channel, revenue }));
    rows.sort((a, b) => b.revenue - a.revenue);
    const top = rows[0]?.revenue || 1;
    return rows.map(r => ({ ...r, share: pct(r.revenue, top) }));
  }, [campaigns]);

  const columns = [
    {
      key: 'name', header: 'Campaign', width: '22%',
      value: (c) => c.name,
      render: (c) => <span className="fw-6" style={{ color: 'var(--ink)' }}>{c.name}</span>,
    },
    {
      key: 'channel', header: 'Channel',
      value: (c) => c.channel,
      render: (c) => <Badge>{c.channel}</Badge>,
    },
    {
      key: 'status', header: 'Status',
      value: (c) => c.status,
      render: (c) => <Badge tone={STATUS_TONE[c.status] || 'default'}>{c.status}</Badge>,
    },
    {
      key: 'sent', header: 'Sent', align: 'right',
      sortValue: (c) => c.sent,
      render: (c) => <span className="tnum muted">{c.sent.toLocaleString()}</span>,
    },
    {
      key: 'open', header: 'Open rate', width: 140,
      sortValue: (c) => pct(c.opened, c.sent),
      render: (c) => {
        const v = pct(c.opened, c.sent);
        return (
          <div className="col gap-1" style={{ minWidth: 96 }}>
            <span className="tnum fw-6 t-sm">{fmtPct(v)}</span>
            <ProgressBar value={v} height={5} />
          </div>
        );
      },
    },
    {
      key: 'click', header: 'Click rate', align: 'right',
      sortValue: (c) => pct(c.clicked, c.opened),
      render: (c) => <span className="tnum muted">{fmtPct(pct(c.clicked, c.opened))}</span>,
    },
    {
      key: 'leads', header: 'Leads', align: 'right',
      sortValue: (c) => c.leads,
      render: (c) => <span className="tnum fw-6">{c.leads.toLocaleString()}</span>,
    },
    {
      key: 'revenue', header: 'Revenue', align: 'right',
      sortValue: (c) => c.revenue,
      render: (c) => <span className="tnum fw-6" style={{ color: 'var(--accent-600)' }}>{moneyK(c.revenue)}</span>,
    },
    {
      key: 'startAt', header: 'Started', align: 'right',
      sortValue: (c) => new Date(c.startAt),
      render: (c) => <span className="tnum muted" title={new Date(c.startAt).toLocaleDateString()}>{relTime(c.startAt)}</span>,
    },
  ];

  return (
    <div className="fade-up">
      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', marginBottom: '1.25rem' }}>
        <StatCard
          label="Revenue influenced" value={stats.revenue} format={moneyK}
          trend={18} icon={<Icon name="megaphone" size={18} />}
          spark={spark(3, 12, 1.2)}
        />
        <StatCard
          label="Leads generated" value={stats.leads}
          trend={11} icon={<Icon name="target" size={18} />}
          spark={spark(7, 12, 1)} accent="#0ea5a3" sparkColor="#0ea5a3"
        />
        <StatCard
          label="Active campaigns" value={stats.active}
          sub="running now" icon={<Icon name="bolt" size={18} />}
          spark={spark(5, 12, 0.4)}
        />
        <StatCard
          label="Avg open rate" value={Number(stats.avgOpen.toFixed(1))} format={(n) => `${n.toFixed(1)}%`}
          trend={4} icon={<Icon name="mail" size={18} />}
          spark={spark(2, 12, 0.6)} accent="#e0752d" sparkColor="#e0752d"
        />
      </div>

      <Card className="fade-up" style={{ marginBottom: '1.25rem' }}>
        <div className="row between" style={{ marginBottom: '1rem' }}>
          <div className="col gap-1" style={{ minWidth: 0 }}>
            <h4 style={{ margin: 0 }}>Channel mix</h4>
            <div className="muted t-sm">Revenue influenced by channel</div>
          </div>
          <span style={{ color: 'var(--accent-600)' }}><Icon name="layers" size={20} /></span>
        </div>
        <div className="col gap-3">
          {channelMix.map(ch => (
            <div key={ch.channel} className="row gap-3" style={{ alignItems: 'center' }}>
              <div className="fw-6 t-sm" style={{ width: 96, flex: 'none' }}>{ch.channel}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <ProgressBar value={ch.share} height={10} />
              </div>
              <div className="tnum fw-6 t-sm" style={{ width: 64, textAlign: 'right', flex: 'none', color: 'var(--accent-600)' }}>
                {moneyK(ch.revenue)}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <DataTable
        columns={columns}
        rows={campaigns}
        getId={(c) => c.id}
        searchable
        searchKeys={['name', 'channel']}
        initialSort={{ key: 'revenue', dir: 'desc' }}
      />
    </div>
  );
}

/* ============================================================
   PAGE
   ============================================================ */
export default function Campaigns() {
  useExt();
  const marketing = useMarketing();
  const [tab, setTab] = useState('broadcasts');

  const bc = marketing?.campaigns?.length ?? getMarketingCampaigns().length;
  const perfCount = getCampaigns().length;

  const tabs = [
    { key: 'broadcasts', label: 'Broadcasts', count: bc },
    { key: 'performance', label: 'Performance', count: perfCount },
  ];

  return (
    <div className="fade-up">
      <SectionHeader
        title="Marketing"
        sub="Broadcasts, nurtures, and program performance in one hub"
      />
      <Tabs tabs={tabs} active={tab} onChange={setTab} />
      {tab === 'broadcasts' ? <Broadcasts /> : <Performance />}
    </div>
  );
}
