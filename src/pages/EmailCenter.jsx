// EmailCenter - the internal Ardovo email tool. See every email the system has
// ever sent, every reply, browse and test every pre-built template, tune the
// executive digests (batched, never a firehose), and route which domains email.
// Local-first; when Resend is live, sends flow through /api/notify. This is the
// Ardovo internal system - distinct from Mailchimp (outreach). NO em-dash.
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { SectionHeader, Card, StatCard, Badge, Button, Input, Select, Modal, EmptyState, useToast, relTime, AnimatedNumber } from '../components/UI.jsx';
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

// A live "mail fabric" - glowing packets streaming across the console header,
// evoking email routing through the system. Bounded to the hero, DPR-aware,
// capped, reduced-motion safe. NO em-dash.
function MailFlow() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const COLORS = [[34, 211, 238], [124, 92, 247], [14, 159, 143], [59, 130, 246]];
    let w = 0, h = 0, dpr = 1, parts = [], raf = 0, running = true;
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect(); w = r.width; h = r.height;
      if (w === 0 || h === 0) return;
      canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(64, Math.max(22, Math.floor(w / 18)));
      parts = [];
      for (let i = 0; i < n; i++) parts.push({
        x: Math.random() * w, y: Math.random() * h, s: 0.5 + Math.random() * 1.6,
        r: 0.7 + Math.random() * 1.7, len: 14 + Math.random() * 46, c: COLORS[(Math.random() * COLORS.length) | 0],
      });
    }
    function frame() {
      if (w === 0 || h === 0) { raf = 0; return; }
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.x += p.s * (1 + p.r * 0.3);
        if (p.x > w + 50) { p.x = -50; p.y = Math.random() * h; }
        const c = p.c;
        const g = ctx.createLinearGradient(p.x - p.len, p.y, p.x, p.y);
        g.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},0)`);
        g.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},.55)`);
        ctx.strokeStyle = g; ctx.lineWidth = p.r; ctx.beginPath();
        ctx.moveTo(p.x - p.len, p.y); ctx.lineTo(p.x, p.y); ctx.stroke();
        ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},.95)`;
        ctx.shadowColor = `rgba(${c[0]},${c[1]},${c[2]},.9)`; ctx.shadowBlur = 9;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      }
      if (running && !reduce) raf = requestAnimationFrame(frame);
    }
    resize();
    const onResize = () => { resize(); if (running && !reduce && !raf && w > 0) raf = requestAnimationFrame(frame); };
    window.addEventListener('resize', onResize);
    frame(); if (!reduce) raf = requestAnimationFrame(frame);
    return () => { running = false; cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, []);
  return <canvas ref={ref} className="ec-flow" aria-hidden />;
}

export default function EmailCenter() {
  const [tab, setTab] = useState('activity');
  const s = stats();
  useEmailCenter(); // subscribe to re-render on changes

  const tiles = [
    { label: 'Templates ready', value: s.templates, icon: 'mail', c: '#22d3ee' },
    { label: 'Emails sent', value: s.total, icon: 'send', c: '#7c5cf7' },
    { label: 'Open rate', value: s.openRate, suffix: '%', icon: 'activity', c: '#0e9f8f' },
    { label: 'Reply rate', value: s.replyRate, suffix: '%', icon: 'inbox', c: '#34d399' },
    { label: 'Held / suppressed', value: s.problems, icon: 'shield', c: '#fbbf24' },
  ];

  return (
    <div className="fade-up ec-fx">
      <div className="ec-amb" aria-hidden />
      <div className="ec-content">
        <div className="ec-hero">
          <MailFlow />
          <div className="ec-scan" aria-hidden />
          <div className="ec-hero-in">
            <div className="ec-eyebrow"><span className="ec-live" /> Ardovo mail fabric</div>
            <h1 className="ec-title">Email <span className="ec-grad">Center</span></h1>
            <p className="ec-sub">Every email Ardovo sends, in one console. Browse all {s.templates} pre-built templates, watch what was opened and replied to, tune the executive digests, and route what emails whom. Transactional mail flows through Resend here - Mailchimp stays for outreach.</p>
            <div className="ec-stats">
              {tiles.map((t, i) => (
                <div className="ec-stat" key={t.label} style={{ '--c': t.c, animationDelay: `${i * 70}ms` }}>
                  <span className="ec-stat-ic"><Icon name={t.icon} size={16} /></span>
                  <div className="ec-stat-v"><AnimatedNumber value={t.value} />{t.suffix || ''}</div>
                  <div className="ec-stat-l">{t.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="ec-tabs">
          {[['activity', 'Activity', 'activity'], ['catalog', 'Catalog', 'mail'], ['digests', 'Digests', 'calendar'], ['routing', 'Routing', 'filter']].map(([k, label, icon]) => (
            <button key={k} className={`ec-tab ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>
              <Icon name={icon} size={15} /> {label}
            </button>
          ))}
        </div>

        <div className="ec-panel">
          {tab === 'activity' && <ActivityTab />}
          {tab === 'catalog' && <CatalogTab />}
          {tab === 'digests' && <DigestsTab />}
          {tab === 'routing' && <RoutingTab />}
        </div>
      </div>

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
    /* ===== Futuristic console skin: scope a dark neon theme to the page ===== */
    .ec-fx {
      position: relative; overflow: hidden; border-radius: 22px; isolation: isolate;
      --paper: rgba(20,26,44,.62); --page: #0a0e1c; --ink: #eaf0ff; --ink-2: #b3bfe0; --muted: #808eb4;
      --line: rgba(255,255,255,.09); --line-strong: rgba(255,255,255,.18);
      --accent: #22d3ee; --accent-600: #0891b2; --accent-700: #0e7490; --accent-300: #67e8f9; --accent-50: rgba(34,211,238,.13);
      --ok: #34d399; --warn: #fbbf24; --risk: #fb7185; --info: #60a5fa; --ai: #7c5cf7;
      color: var(--ink); background: #0a0e1c;
      box-shadow: 0 40px 120px -50px rgba(34,211,238,.25);
    }
    .ec-amb { position: absolute; inset: 0; z-index: 0; pointer-events: none;
      background:
        radial-gradient(1000px 640px at 78% -12%, rgba(34,211,238,.16), transparent 60%),
        radial-gradient(820px 620px at -8% 20%, rgba(124,92,247,.18), transparent 55%),
        radial-gradient(700px 700px at 50% 120%, rgba(14,159,143,.12), transparent 60%),
        #0a0e1c;
    }
    .ec-amb::after { content: ''; position: absolute; inset: 0; opacity: .5;
      background-image: linear-gradient(rgba(120,160,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(120,160,255,.05) 1px, transparent 1px);
      background-size: 48px 48px;
      -webkit-mask-image: radial-gradient(120% 80% at 50% 0%, #000 30%, transparent 78%);
      mask-image: radial-gradient(120% 80% at 50% 0%, #000 30%, transparent 78%); }
    .ec-content { position: relative; z-index: 1; padding: 6px; }

    /* ===== Hero ===== */
    .ec-hero { position: relative; overflow: hidden; border-radius: 18px; padding: 30px 30px 26px;
      background: linear-gradient(180deg, rgba(14,20,38,.72), rgba(10,14,28,.55));
      border: 1px solid var(--line); }
    .ec-flow { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 0; opacity: .9; }
    .ec-scan { position: absolute; left: 0; right: 0; top: 0; height: 34%; z-index: 1; pointer-events: none;
      background: linear-gradient(180deg, rgba(34,211,238,.10), transparent); animation: ecScan 6s ease-in-out infinite; }
    @keyframes ecScan { 0%,100% { transform: translateY(-10%); opacity: .5; } 50% { transform: translateY(260%); opacity: 1; } }
    .ec-hero-in { position: relative; z-index: 2; }
    .ec-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; color: #8fe6f2; }
    .ec-live { width: 8px; height: 8px; border-radius: 50%; background: #22d3ee; box-shadow: 0 0 0 0 rgba(34,211,238,.6); animation: ecPulse 1.8s ease-out infinite; }
    @keyframes ecPulse { 0% { box-shadow: 0 0 0 0 rgba(34,211,238,.6); } 70% { box-shadow: 0 0 0 9px rgba(34,211,238,0); } 100% { box-shadow: 0 0 0 0 rgba(34,211,238,0); } }
    .ec-title { margin: 12px 0 6px; font-size: clamp(30px, 5vw, 46px); font-weight: 900; letter-spacing: -.02em; font-family: var(--font-display, 'Space Grotesk', sans-serif); line-height: 1.02; }
    .ec-grad { background: linear-gradient(100deg, #22d3ee, #7c5cf7 60%, #0e9f8f); -webkit-background-clip: text; background-clip: text; color: transparent; background-size: 200% auto; animation: ecShift 6s linear infinite; }
    @keyframes ecShift { to { background-position: 200% center; } }
    .ec-sub { max-width: 720px; font-size: 15px; line-height: 1.6; color: var(--ink-2); margin: 0; }

    /* ===== Stat tiles ===== */
    .ec-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-top: 22px; }
    .ec-stat { position: relative; overflow: hidden; border-radius: 14px; padding: 15px 16px;
      background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.02));
      border: 1px solid var(--line); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
      animation: ecTileIn .55s cubic-bezier(.22,1,.36,1) both; transition: transform .25s, box-shadow .25s, border-color .25s; }
    @keyframes ecTileIn { 0% { opacity: 0; transform: translateY(14px); } 100% { opacity: 1; transform: none; } }
    .ec-stat::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: var(--c); box-shadow: 0 0 14px var(--c); opacity: .9; }
    .ec-stat::after { content: ''; position: absolute; top: 0; left: -60%; width: 40%; height: 100%; background: linear-gradient(100deg, transparent, rgba(255,255,255,.12), transparent); transform: skewX(-18deg); animation: ecSheen 5s ease-in-out infinite; }
    @keyframes ecSheen { 0%, 60% { left: -60%; } 85%, 100% { left: 150%; } }
    .ec-stat:hover { transform: translateY(-4px); border-color: color-mix(in srgb, var(--c) 60%, transparent); box-shadow: 0 24px 60px -30px var(--c); }
    .ec-stat-ic { display: inline-grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; color: var(--c); background: color-mix(in srgb, var(--c) 16%, transparent); border: 1px solid color-mix(in srgb, var(--c) 34%, transparent); }
    .ec-stat-v { font-size: 30px; font-weight: 900; margin-top: 10px; letter-spacing: -.02em; font-family: var(--font-display, 'Space Grotesk', sans-serif); color: #fff; }
    .ec-stat-l { font-size: 12px; color: var(--muted); margin-top: 2px; font-weight: 600; }

    /* ===== Tabs ===== */
    .ec-tabs { display: flex; gap: 6px; flex-wrap: wrap; margin: 18px 2px 14px; padding: 5px; border-radius: 13px;
      background: rgba(255,255,255,.03); border: 1px solid var(--line); width: fit-content; }
    .ec-tab { display: inline-flex; align-items: center; gap: 7px; font-family: inherit; font-size: 13.5px; font-weight: 700;
      color: var(--muted); background: transparent; border: none; border-radius: 9px; padding: 9px 15px; cursor: pointer; transition: all .2s; }
    .ec-tab:hover { color: var(--ink); }
    .ec-tab.on { color: #04121a; background: linear-gradient(100deg, #22d3ee, #38bdf8); box-shadow: 0 10px 26px -12px rgba(34,211,238,.8); }

    .ec-panel { animation: ecFade .4s ease both; }
    @keyframes ecFade { 0% { opacity: 0; transform: translateY(8px); } 100% { opacity: 1; transform: none; } }

    /* ===== Glass cards + inputs within the console ===== */
    .ec-fx .card { background: linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.02)) !important;
      border: 1px solid var(--line) !important; backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      transition: transform .22s, box-shadow .22s, border-color .22s; }
    .ec-fx .input, .ec-fx .select, .ec-fx .textarea { background: rgba(255,255,255,.04); color: var(--ink); border-color: var(--line); }
    .ec-fx .input::placeholder { color: var(--muted); }
    .ec-fx .select option { background: #0f1626; color: var(--ink); }
    .ec-fx .btn-ghost { color: var(--ink); border-color: var(--line); background: rgba(255,255,255,.03); }
    .ec-fx .btn-ghost:hover { background: rgba(255,255,255,.08); border-color: var(--accent); }
    .ec-fx .btn-quiet { color: var(--muted); }
    .ec-fx .btn-quiet:hover { color: var(--accent); }

    /* ===== Rows + bits ===== */
    .ec-row { display: flex; align-items: center; gap: 12px; cursor: pointer; position: relative; overflow: hidden;
      animation: ecRowIn .45s cubic-bezier(.22,1,.36,1) both; }
    @keyframes ecRowIn { 0% { opacity: 0; transform: translateX(-10px); } 100% { opacity: 1; transform: none; } }
    .ec-row:hover { transform: translateY(-2px); border-color: var(--accent) !important; box-shadow: 0 20px 50px -30px rgba(34,211,238,.6) !important; }
    .ec-dot { width: 9px; height: 9px; border-radius: 50%; flex: none; box-shadow: 0 0 10px currentColor; animation: ecDot 2.4s ease-in-out infinite; }
    @keyframes ecDot { 0%,100% { opacity: .6; transform: scale(.85); } 50% { opacity: 1; transform: scale(1.15); } }
    .ec-subj { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
    .ec-chev { color: var(--muted); flex: none; }
    .ec-code { font-family: var(--font-mono, monospace); font-size: 11.5px; background: rgba(255,255,255,.05); border: 1px solid var(--line); border-radius: 5px; padding: 1px 6px; color: #9fe9f2; }
    .ec-iframe { width: 100%; height: 460px; border: 1px solid var(--line); border-radius: 12px; background: #eef1f6; }
    .ec-reply { border-left: 3px solid var(--ok); background: rgba(52,211,153,.08); border-radius: 8px; padding: 10px 12px; }
    .ec-dchip { width: 30px; height: 30px; flex: none; border-radius: 8px; display: grid; place-items: center; }
    .ec-dchip.sm { width: 26px; height: 26px; border-radius: 7px; }
    .ec-cat-row { display: flex; align-items: center; gap: 10px; padding: 10px 2px; border-bottom: 1px solid var(--line); transition: background .15s; }
    .ec-cat-row:last-child { border-bottom: none; }
    .ec-cat-row:hover { background: rgba(34,211,238,.05); }
    .ec-note { display: flex; align-items: flex-start; gap: 12px; background: rgba(34,211,238,.08) !important; border-color: color-mix(in srgb, var(--accent) 40%, transparent) !important; }
    .ec-note > svg { color: var(--accent); flex: none; margin-top: 2px; }
    .ec-domrow { display: flex; align-items: center; gap: 10px; padding: 9px 11px; border: 1px solid var(--line); border-radius: 10px; background: rgba(255,255,255,.02); transition: border-color .2s, background .2s; }
    .ec-domrow:hover { border-color: var(--accent); background: rgba(34,211,238,.05); }
    .ec-prov { display: flex; align-items: center; gap: 11px; padding: 12px; border: 1px solid var(--line); border-radius: 12px; background: rgba(255,255,255,.02); }
    .ec-prov > div { flex: 1; min-width: 0; }

    @media (prefers-reduced-motion: reduce) {
      .ec-scan, .ec-live, .ec-grad, .ec-stat, .ec-stat::after, .ec-row, .ec-dot, .ec-panel { animation: none !important; }
    }
    `}</style>
  );
}
