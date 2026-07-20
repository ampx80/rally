// EmailCenter - the internal Ardovo email tool. See every email the system has
// ever sent, every reply, browse and test every pre-built template, tune the
// executive digests (batched, never a firehose), and route which domains email.
// Local-first; when Resend is live, sends flow through /api/notify. This is the
// Ardovo internal system - distinct from Mailchimp (outreach). NO em-dash.
import React, { useState, useMemo } from 'react';
import { SectionHeader, Card, StatCard, Badge, Button, Input, Select, Modal, EmptyState, useToast, relTime } from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import {
  EVENTS, DOMAINS, DIGESTS, domainById, eventsByDomain, renderEmailHtml, renderDigestHtml,
} from '../lib/email-catalog.js';
import {
  useEmailCenter, stats, sendTest, connectRecord, setDomainRouting, setDigest, updatePrefs, clearLog,
} from '../lib/email-center.js';

const STATUS = {
  sent: { tone: 'info', label: 'Sent' }, opened: { tone: 'info', label: 'Opened' },
  clicked: { tone: 'accent', label: 'Clicked' }, replied: { tone: 'ok', label: 'Replied' },
  reply: { tone: 'ok', label: 'Reply in' }, bounced: { tone: 'risk', label: 'Bounced' },
  suppressed: { tone: 'warn', label: 'Suppressed' }, batched: { tone: 'warn', label: 'Batched' },
  queued: { tone: 'default', label: 'Queued' },
};
const statusMeta = (s) => STATUS[s] || { tone: 'default', label: s };

export default function EmailCenter() {
  const [tab, setTab] = useState('activity');
  const s = stats();
  useEmailCenter(); // subscribe to re-render on changes

  return (
    <div className="fade-up">
      <SectionHeader
        title="Email Center"
        sub="Every email Ardovo sends, in one place. Browse every pre-built template, watch what was opened and replied to, tune the executive digests, and route what emails whom. Transactional and system mail runs through Resend here; Mailchimp stays for outreach."
      />

      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', marginBottom: '1.25rem' }}>
        <StatCard label="Templates ready" value={s.templates} icon={<Icon name="mail" size={18} />} accent="var(--accent)" />
        <StatCard label="Emails sent" value={s.total} icon={<Icon name="send" size={18} />} />
        <StatCard label="Open rate" value={s.openRate} format={(n) => `${n}%`} icon={<Icon name="activity" size={18} />} />
        <StatCard label="Reply rate" value={s.replyRate} format={(n) => `${n}%`} icon={<Icon name="inbox" size={18} />} accent="var(--ok)" />
        <StatCard label="Held / suppressed" value={s.problems} icon={<Icon name="shield" size={18} />} accent="var(--warn)" />
      </div>

      <div className="row gap-2 wrap" style={{ marginBottom: '1rem' }}>
        {[['activity', 'Activity', 'activity'], ['catalog', 'Catalog', 'mail'], ['digests', 'Digests', 'calendar'], ['routing', 'Routing', 'filter']].map(([k, label, icon]) => (
          <button key={k} className={`btn btn-sm ${tab === k ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab(k)}>
            <Icon name={icon} size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === 'activity' && <ActivityTab />}
      {tab === 'catalog' && <CatalogTab />}
      {tab === 'digests' && <DigestsTab />}
      {tab === 'routing' && <RoutingTab />}

      <EmailCenterStyles />
    </div>
  );
}

/* ---------------- Activity ---------------- */
function ActivityTab() {
  const log = useEmailCenter((s) => s.log);
  const [q, setQ] = useState('');
  const [domain, setDomain] = useState('all');
  const [status, setStatus] = useState('all');
  const [open, setOpen] = useState(null); // entry being previewed
  const toast = useToast();

  const threads = useMemo(() => log.filter(e => !e.parentId), [log]);
  const rows = threads.filter(e => {
    if (domain !== 'all' && e.domain !== domain) return false;
    if (status !== 'all' && e.status !== status) return false;
    if (q && !(`${e.subject} ${e.to?.join(' ')} ${e.eventKey}`.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });
  const replies = (thread) => log.filter(e => e.parentId === thread.id);

  return (
    <div className="col gap-2">
      <div className="row gap-2 wrap" style={{ alignItems: 'center', marginBottom: '.25rem' }}>
        <div style={{ flex: 1, minWidth: 200 }}><Input placeholder="Search subject, recipient, or event..." value={q} onChange={e => setQ(e.target.value)} /></div>
        <Select value={domain} onChange={e => setDomain(e.target.value)}>
          <option value="all">All domains</option>
          {DOMAINS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
        </Select>
        <Select value={status} onChange={e => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          {['sent', 'opened', 'clicked', 'replied', 'bounced', 'suppressed', 'batched'].map(x => <option key={x} value={x}>{statusMeta(x).label}</option>)}
        </Select>
      </div>

      {!rows.length ? (
        <EmptyState icon="📭" title="No emails match" body="Try clearing the filters, or send a test from the Catalog tab." />
      ) : rows.map(e => {
        const dm = domainById(e.domain);
        const rc = replies(e).length;
        return (
          <Card key={e.id} hover className="ec-row" onClick={() => setOpen(e)}>
            <div className="ec-dot" style={{ background: dm.color }} />
            <div className="col gap-1" style={{ minWidth: 0, flex: 1 }}>
              <div className="row gap-2" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="fw-6 ec-subj" style={{ color: 'var(--ink)' }}>{e.subject}</span>
                <Badge tone={statusMeta(e.status).tone}>{statusMeta(e.status).label}</Badge>
                {rc > 0 && <Badge tone="ok"><Icon name="inbox" size={11} /> {rc} repl{rc === 1 ? 'y' : 'ies'}</Badge>}
                {e.test && <Badge tone="default">test</Badge>}
                {e.link && <Badge tone="accent"><Icon name="target" size={11} /> {e.link.label}</Badge>}
              </div>
              <div className="t-sm muted">{dm.label} &middot; to {e.to?.join(', ')} &middot; {relTime(e.at)}</div>
            </div>
            <Icon name="chevronRight" size={16} className="ec-chev" />
          </Card>
        );
      })}

      {open && <PreviewModal entry={open} replies={replies(open)} onClose={() => setOpen(null)}
        onResend={() => { sendTest(open.eventKey, open.to?.[0]); toast('Test re-sent'); }}
        onConnect={() => { connectRecord(open.id, { type: 'deal', label: 'Contoso - Platform Expansion' }); toast('Linked to a deal'); }}
      />}
    </div>
  );
}

function PreviewModal({ entry, replies = [], onClose, onResend, onConnect }) {
  const { html } = renderEmailHtml(entry.eventKey);
  return (
    <Modal open onClose={onClose} title={entry.subject} width={720}>
      <div className="row gap-2 wrap" style={{ marginBottom: '.75rem', alignItems: 'center' }}>
        <Badge tone={statusMeta(entry.status).tone}>{statusMeta(entry.status).label}</Badge>
        <span className="t-sm muted">Event <code className="ec-code">{entry.eventKey}</code></span>
        <span className="t-sm muted">to {entry.to?.join(', ')}</span>
      </div>
      <iframe title="email preview" srcDoc={html} className="ec-iframe" />
      {replies.length > 0 && (
        <div className="col gap-2" style={{ marginTop: '1rem' }}>
          <div className="fw-6" style={{ color: 'var(--ink)' }}>Thread</div>
          {replies.map(r => (
            <div key={r.id} className="ec-reply">
              <div className="row gap-2" style={{ alignItems: 'center' }}>
                <Icon name="inbox" size={14} /><span className="fw-6 t-sm">{r.from || 'Reply'}</span>
                <span className="t-xs muted">{relTime(r.at)}</span>
              </div>
              <div className="t-sm" style={{ marginTop: 4, color: 'var(--ink-2)' }}>{r.replyText}</div>
            </div>
          ))}
        </div>
      )}
      <div className="row gap-2 wrap" style={{ marginTop: '1rem' }}>
        <Button variant="ghost" size="sm" onClick={onResend}><Icon name="send" size={15} /> Re-send test</Button>
        {!entry.link && <Button variant="ghost" size="sm" onClick={onConnect}><Icon name="target" size={15} /> Connect to a record</Button>}
      </div>
    </Modal>
  );
}

/* ---------------- Catalog ---------------- */
function CatalogTab() {
  const [q, setQ] = useState('');
  const [preview, setPreview] = useState(null);
  const toast = useToast();
  const ql = q.toLowerCase();

  return (
    <div className="col gap-3">
      <div className="row gap-2 wrap" style={{ alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 200 }}><Input placeholder="Search all templates by name or event key..." value={q} onChange={e => setQ(e.target.value)} /></div>
        <span className="t-sm muted">{EVENTS.length} templates across {DOMAINS.length} domains</span>
      </div>
      {DOMAINS.map(d => {
        const evs = eventsByDomain(d.id).filter(e => !ql || `${e.label} ${e.key}`.toLowerCase().includes(ql));
        if (!evs.length) return null;
        return (
          <Card key={d.id}>
            <div className="row gap-2" style={{ alignItems: 'center', marginBottom: '.6rem' }}>
              <span className="ec-dchip" style={{ background: d.color + '22', color: d.color }}><Icon name={d.icon} size={15} /></span>
              <span className="fw-6" style={{ color: 'var(--ink)' }}>{d.label}</span>
              <Badge tone="default">{evs.length}</Badge>
            </div>
            <div className="col gap-1">
              {evs.map(e => (
                <div key={e.key} className="ec-cat-row">
                  <div className="col gap-1" style={{ minWidth: 0, flex: 1 }}>
                    <div className="row gap-2" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className="fw-6 t-sm" style={{ color: 'var(--ink)' }}>{e.label}</span>
                      <code className="ec-code">{e.key}</code>
                      {e.severity !== 'info' && <Badge tone={e.severity === 'success' ? 'ok' : e.severity === 'critical' ? 'risk' : 'warn'}>{e.severity}</Badge>}
                    </div>
                    <div className="t-xs muted">to {e.audience.join(', ')}</div>
                  </div>
                  <div className="row gap-1" style={{ flex: 'none' }}>
                    <Button variant="quiet" size="sm" onClick={() => setPreview(e.key)}><Icon name="eye" size={14} /> Preview</Button>
                    <Button variant="ghost" size="sm" onClick={() => { sendTest(e.key); toast(`Test sent: ${e.label}`); }}><Icon name="send" size={14} /> Test</Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
      {preview && <CatalogPreview eventKey={preview} onClose={() => setPreview(null)} onTest={() => { sendTest(preview); toast('Test sent'); }} />}
    </div>
  );
}

function CatalogPreview({ eventKey, onClose, onTest }) {
  const { subject, html } = renderEmailHtml(eventKey);
  return (
    <Modal open onClose={onClose} title={subject} width={720}>
      <div className="t-sm muted" style={{ marginBottom: '.5rem' }}>Event <code className="ec-code">{eventKey}</code></div>
      <iframe title="preview" srcDoc={html} className="ec-iframe" />
      <div className="row gap-2" style={{ marginTop: '1rem' }}>
        <Button size="sm" onClick={onTest}><Icon name="send" size={15} /> Send myself a test</Button>
      </div>
    </Modal>
  );
}

/* ---------------- Digests ---------------- */
function DigestsTab() {
  const prefs = useEmailCenter((s) => s.prefs);
  const [preview, setPreview] = useState(null);
  const toast = useToast();
  return (
    <div className="col gap-3">
      <Card className="ec-note">
        <Icon name="shield" size={18} />
        <div>
          <div className="fw-6" style={{ color: 'var(--ink)' }}>Executives get a summary, never a firehose.</div>
          <div className="t-sm muted">Per-event emails go to the people doing the work. Leadership gets these batched rollups on a cadence you set. Quiet hours hold non-critical mail and fold it into the next digest.</div>
        </div>
      </Card>
      {DIGESTS.map(d => {
        const on = prefs.digests?.[d.key] !== false;
        return (
          <Card key={d.key} className="row between wrap" style={{ alignItems: 'center', gap: '.8rem' }}>
            <div className="col gap-1" style={{ minWidth: 0, flex: 1 }}>
              <div className="row gap-2" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="fw-6" style={{ color: 'var(--ink)' }}>{d.title}</span>
                <Badge tone="accent">every {d.cadence}</Badge>
                <span className="t-xs muted">to {d.audience.join(', ')}</span>
              </div>
              <div className="t-sm muted">{d.intro}</div>
            </div>
            <div className="row gap-2" style={{ flex: 'none', alignItems: 'center' }}>
              <Button variant="quiet" size="sm" onClick={() => setPreview(d.key)}><Icon name="eye" size={14} /> Preview</Button>
              <Toggle on={on} onChange={(v) => { setDigest(d.key, v); toast(v ? 'Digest on' : 'Digest off'); }} />
            </div>
          </Card>
        );
      })}
      {preview && <DigestPreview digestKey={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

function DigestPreview({ digestKey, onClose }) {
  const d = DIGESTS.find(x => x.key === digestKey);
  const { subject, html } = renderDigestHtml(d);
  return (
    <Modal open onClose={onClose} title={subject} width={720}>
      <iframe title="digest preview" srcDoc={html} className="ec-iframe" />
    </Modal>
  );
}

/* ---------------- Routing ---------------- */
function RoutingTab() {
  const prefs = useEmailCenter((s) => s.prefs);
  const toast = useToast();
  const q = prefs.quietHours || { enabled: true, start: 21, end: 7 };
  return (
    <div className="col gap-3">
      <Card>
        <div className="fw-6" style={{ marginBottom: '.3rem', color: 'var(--ink)' }}>Which domains send email</div>
        <div className="t-sm muted" style={{ marginBottom: '.8rem' }}>Turn a whole domain off and every event under it is suppressed (still logged here, never sent). Critical security mail always goes through.</div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: '.6rem' }}>
          {DOMAINS.map(d => (
            <div key={d.id} className="ec-domrow">
              <span className="ec-dchip sm" style={{ background: d.color + '22', color: d.color }}><Icon name={d.icon} size={14} /></span>
              <span className="fw-6 t-sm" style={{ flex: 1, color: 'var(--ink)' }}>{d.label}</span>
              <Toggle on={prefs.domains?.[d.id] !== false} onChange={(v) => { setDomainRouting(d.id, v); toast(v ? `${d.label} on` : `${d.label} muted`); }} />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="fw-6" style={{ marginBottom: '.3rem', color: 'var(--ink)' }}>Quiet hours</div>
        <div className="t-sm muted" style={{ marginBottom: '.8rem' }}>Outside these hours we still send. Inside, non-critical mail is batched into the next digest so nobody gets pinged at 2am.</div>
        <div className="row gap-3 wrap" style={{ alignItems: 'center' }}>
          <Toggle on={!!q.enabled} onChange={(v) => { updatePrefs({ quietHours: { ...q, enabled: v } }); toast(v ? 'Quiet hours on' : 'Quiet hours off'); }} label="Enable quiet hours" />
          <label className="t-sm muted">From
            <Select value={q.start} onChange={e => updatePrefs({ quietHours: { ...q, start: Number(e.target.value) } })} style={{ marginLeft: 6, width: 90 }}>
              {Array.from({ length: 24 }).map((_, h) => <option key={h} value={h}>{h}:00</option>)}
            </Select>
          </label>
          <label className="t-sm muted">To
            <Select value={q.end} onChange={e => updatePrefs({ quietHours: { ...q, end: Number(e.target.value) } })} style={{ marginLeft: 6, width: 90 }}>
              {Array.from({ length: 24 }).map((_, h) => <option key={h} value={h}>{h}:00</option>)}
            </Select>
          </label>
        </div>
      </Card>

      <Card>
        <div className="fw-6" style={{ marginBottom: '.3rem', color: 'var(--ink)' }}>Providers</div>
        <div className="col gap-2" style={{ marginTop: '.4rem' }}>
          <div className="ec-prov"><span className="ec-dchip sm" style={{ background: 'rgba(14,159,143,.14)', color: 'var(--accent)' }}><Icon name="mail" size={14} /></span>
            <div><div className="fw-6 t-sm" style={{ color: 'var(--ink)' }}>Resend - transactional and system</div><div className="t-xs muted">Every email in this center. Hardened path with idempotency, suppression, and open/click/reply tracking. Wired via /api/notify.</div></div>
            <Badge tone="ok">active</Badge>
          </div>
          <div className="ec-prov"><span className="ec-dchip sm" style={{ background: 'rgba(124,92,247,.14)', color: 'var(--ai)' }}><Icon name="sparkles" size={14} /></span>
            <div><div className="fw-6 t-sm" style={{ color: 'var(--ink)' }}>Mailchimp - outreach</div><div className="t-xs muted">Reserved for marketing outreach and audiences. Kept separate from system mail on purpose.</div></div>
            <Badge tone="default">outreach</Badge>
          </div>
        </div>
      </Card>

      <div className="row gap-2">
        <Button variant="quiet" size="sm" onClick={() => { if (window.confirm('Clear the local email activity log? (templates and settings stay)')) { clearLog(); toast('Activity cleared'); } }}><Icon name="trash" size={14} /> Clear activity log</Button>
      </div>
    </div>
  );
}

/* ---------------- shared ---------------- */
function Toggle({ on, onChange, label }) {
  return (
    <button type="button" onClick={() => onChange(!on)} className="row gap-2" style={{ alignItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '.2rem 0' }}>
      <span style={{ position: 'relative', width: 40, height: 23, flex: 'none', borderRadius: 999, background: on ? 'var(--accent)' : 'var(--line-strong, #d0d6de)', transition: 'background .2s' }}>
        <span style={{ position: 'absolute', top: 3, left: on ? 20 : 3, width: 17, height: 17, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.3)' }} />
      </span>
      {label && <span className="t-sm fw-6" style={{ color: 'var(--ink)' }}>{label}</span>}
    </button>
  );
}

function EmailCenterStyles() {
  return (
    <style>{`
    .ec-row { display: flex; align-items: center; gap: 12px; cursor: pointer; }
    .ec-dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
    .ec-subj { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
    .ec-chev { color: var(--muted); flex: none; }
    .ec-code { font-family: var(--font-mono, monospace); font-size: 11.5px; background: var(--page); border: 1px solid var(--line); border-radius: 5px; padding: 1px 6px; color: var(--ink-2); }
    .ec-iframe { width: 100%; height: 460px; border: 1px solid var(--line); border-radius: 12px; background: #eef1f6; }
    .ec-reply { border-left: 3px solid var(--ok); background: var(--page); border-radius: 8px; padding: 10px 12px; }
    .ec-dchip { width: 30px; height: 30px; flex: none; border-radius: 8px; display: grid; place-items: center; }
    .ec-dchip.sm { width: 26px; height: 26px; border-radius: 7px; }
    .ec-cat-row { display: flex; align-items: center; gap: 10px; padding: 9px 2px; border-bottom: 1px solid var(--line); }
    .ec-cat-row:last-child { border-bottom: none; }
    .ec-note { display: flex; align-items: flex-start; gap: 12px; background: var(--accent-50, #e6f7f5); border-color: var(--accent-300, #5ecfc3); }
    .ec-note > svg { color: var(--accent); flex: none; margin-top: 2px; }
    .ec-domrow { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border: 1px solid var(--line); border-radius: 10px; }
    .ec-prov { display: flex; align-items: center; gap: 11px; padding: 11px 12px; border: 1px solid var(--line); border-radius: 12px; }
    .ec-prov > div { flex: 1; min-width: 0; }
    `}</style>
  );
}
