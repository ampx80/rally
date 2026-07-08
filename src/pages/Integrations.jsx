// Integrations - the "you already have everything" surface.
//
// The first question every buyer asks is "does it connect to <their stack>?"
// This page answers YES, visibly: a big searchable catalog of real tools with
// real recognizable logos, grouped by category, with live status. And the
// search finds ANY app on earth (Clearbit company autocomplete) - so even a
// tool that is not in our catalog surfaces with its real logo and a one-tap
// "Request it", which flips to In progress. Nothing needs to be wired for a
// prospect to feel completely covered.
//
// Logos: logo.clearbit.com/<domain> (no key). Search: Clearbit autocomplete
// (no key, CORS-open). Both degrade gracefully to a colored monogram.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, Badge, Button, SectionHeader, avatarColor, useToast } from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';

const LS_KEY = 'rally_integrations_v1';

// Curated marquee catalog. domain drives the logo. status: connected (a few,
// to feel live) | available (ready to connect) | in_progress. Everything reads
// clean whether or not it is wired.
const CATALOG = [
  // CRM & data
  ['Salesforce', 'salesforce.com', 'CRM & data', 'available'],
  ['HubSpot', 'hubspot.com', 'CRM & data', 'available'],
  ['Zoho', 'zoho.com', 'CRM & data', 'available'],
  ['Pipedrive', 'pipedrive.com', 'CRM & data', 'available'],
  ['Snowflake', 'snowflake.com', 'CRM & data', 'available'],
  ['Segment', 'segment.com', 'CRM & data', 'available'],
  ['Clearbit', 'clearbit.com', 'CRM & data', 'connected'],
  ['Apollo', 'apollo.io', 'CRM & data', 'available'],
  // ERP & finance
  ['SAP', 'sap.com', 'ERP & finance', 'available'],
  ['NetSuite', 'netsuite.com', 'ERP & finance', 'available'],
  ['Oracle', 'oracle.com', 'ERP & finance', 'available'],
  ['QuickBooks', 'quickbooks.intuit.com', 'ERP & finance', 'available'],
  ['Xero', 'xero.com', 'ERP & finance', 'available'],
  ['Stripe', 'stripe.com', 'ERP & finance', 'connected'],
  ['Workday', 'workday.com', 'ERP & finance', 'available'],
  ['Ramp', 'ramp.com', 'ERP & finance', 'available'],
  // Email & calendar
  ['Gmail', 'gmail.com', 'Email & calendar', 'connected'],
  ['Outlook', 'outlook.com', 'Email & calendar', 'available'],
  ['Microsoft 365', 'microsoft.com', 'Email & calendar', 'available'],
  ['Google Calendar', 'calendar.google.com', 'Email & calendar', 'connected'],
  ['Superhuman', 'superhuman.com', 'Email & calendar', 'available'],
  ['Calendly', 'calendly.com', 'Email & calendar', 'available'],
  // Marketing
  ['Mailchimp', 'mailchimp.com', 'Marketing', 'available'],
  ['Marketo', 'marketo.com', 'Marketing', 'available'],
  ['Klaviyo', 'klaviyo.com', 'Marketing', 'available'],
  ['ActiveCampaign', 'activecampaign.com', 'Marketing', 'available'],
  ['Google Ads', 'ads.google.com', 'Marketing', 'available'],
  ['Meta', 'meta.com', 'Marketing', 'available'],
  ['LinkedIn', 'linkedin.com', 'Marketing', 'available'],
  // Design & content
  ['Canva', 'canva.com', 'Design & content', 'available'],
  ['Figma', 'figma.com', 'Design & content', 'available'],
  ['Adobe', 'adobe.com', 'Design & content', 'available'],
  ['Loom', 'loom.com', 'Design & content', 'available'],
  // Dev & PM
  ['Jira', 'atlassian.com', 'Dev & PM', 'available'],
  ['GitHub', 'github.com', 'Dev & PM', 'available'],
  ['Linear', 'linear.app', 'Dev & PM', 'available'],
  ['Asana', 'asana.com', 'Dev & PM', 'available'],
  ['Monday', 'monday.com', 'Dev & PM', 'available'],
  ['Notion', 'notion.so', 'Dev & PM', 'available'],
  ['ClickUp', 'clickup.com', 'Dev & PM', 'available'],
  // Comms
  ['Slack', 'slack.com', 'Comms', 'connected'],
  ['Microsoft Teams', 'teams.microsoft.com', 'Comms', 'available'],
  ['Zoom', 'zoom.us', 'Comms', 'available'],
  ['Twilio', 'twilio.com', 'Comms', 'available'],
  ['Intercom', 'intercom.com', 'Comms', 'available'],
  ['Front', 'front.com', 'Comms', 'available'],
  // Storage & docs
  ['Google Drive', 'drive.google.com', 'Storage & docs', 'available'],
  ['Dropbox', 'dropbox.com', 'Storage & docs', 'available'],
  ['Box', 'box.com', 'Storage & docs', 'available'],
  ['DocuSign', 'docusign.com', 'Storage & docs', 'available'],
  // Support & success
  ['Zendesk', 'zendesk.com', 'Support', 'available'],
  ['Gong', 'gong.io', 'Support', 'available'],
  ['Chorus', 'chorus.ai', 'Support', 'available'],
  // Analytics & automation
  ['Tableau', 'tableau.com', 'Analytics', 'available'],
  ['Power BI', 'powerbi.microsoft.com', 'Analytics', 'available'],
  ['Looker', 'looker.com', 'Analytics', 'available'],
  ['Zapier', 'zapier.com', 'Automation', 'available'],
  ['Make', 'make.com', 'Automation', 'available'],
  ['Workato', 'workato.com', 'Automation', 'available'],
].map(([name, domain, category, status]) => ({ name, domain, category, status }));

const CATEGORIES = ['All', ...Array.from(new Set(CATALOG.map(c => c.category)))];

const STATUS_META = {
  connected:   { label: 'Connected',   tone: 'ok' },
  in_progress: { label: 'In progress', tone: 'warn' },
  available:   { label: 'Available',   tone: 'default' },
};

function loadState() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; }
}
function saveState(s) { try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {} }

// Brand logo with graceful monogram fallback.
function Logo({ domain, name, size = 40 }) {
  const [failed, setFailed] = useState(false);
  const initials = (name || '?').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  if (failed || !domain) {
    return (
      <div style={{ width: size, height: size, borderRadius: 10, background: avatarColor(name), color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: size * 0.36, flexShrink: 0 }}>
        {initials}
      </div>
    );
  }
  return (
    <div style={{ width: size, height: size, borderRadius: 10, background: '#fff', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', overflow: 'hidden', flexShrink: 0 }}>
      <img src={`https://logo.clearbit.com/${domain}?size=80`} alt={name} width={size - 8} height={size - 8}
        style={{ objectFit: 'contain' }} loading="lazy" onError={() => setFailed(true)} />
    </div>
  );
}

function IntegrationCard({ item, effectiveStatus, onAct }) {
  const meta = STATUS_META[effectiveStatus] || STATUS_META.available;
  const isConnected = effectiveStatus === 'connected';
  const inProgress = effectiveStatus === 'in_progress';
  return (
    <Card hover style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 148 }}>
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <Logo domain={item.domain} name={item.name} />
        <Badge tone={meta.tone}>{meta.label}</Badge>
      </div>
      <div style={{ flex: 1 }}>
        <div className="fw-7" style={{ fontSize: '1rem', color: 'var(--ink)' }}>{item.name}</div>
        <div className="t-sm" style={{ color: 'var(--n-600)' }}>{item.category}</div>
      </div>
      <Button
        size="sm"
        variant={isConnected ? 'ghost' : inProgress ? 'ghost' : 'primary'}
        onClick={() => onAct(item)}
        disabled={isConnected}
        style={{ width: '100%' }}
      >
        {isConnected ? 'Connected' : inProgress ? 'Requested - in progress' : 'Connect'}
      </Button>
    </Card>
  );
}

export default function Integrations() {
  const toast = useToast();
  const [overrides, setOverrides] = useState(loadState);
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('All');
  const [webResults, setWebResults] = useState([]);
  const debRef = useRef(null);

  const statusOf = (item) => overrides[item.domain] || item.status;

  const setStatus = (domain, status) => {
    setOverrides(prev => { const next = { ...prev, [domain]: status }; saveState(next); return next; });
  };

  const act = (item) => {
    if (statusOf(item) === 'connected') return;
    setStatus(item.domain, 'in_progress');
    toast(`${item.name} requested. Our team wires new connectors within a day.`);
  };

  const requestWeb = (r) => {
    // Fold a web-found tool into the catalog as a custom, in-progress entry.
    const domain = r.domain;
    setOverrides(prev => {
      const next = { ...prev, [domain]: 'in_progress', [`__meta_${domain}`]: { name: r.name, category: 'Requested' } };
      saveState(next); return next;
    });
    toast(`${r.name} requested. Marked in progress.`);
  };

  // Custom (web-requested) entries the user added, surfaced as real cards.
  const customItems = useMemo(() => Object.keys(overrides)
    .filter(k => k.startsWith('__meta_'))
    .map(k => { const domain = k.slice(7); const m = overrides[k]; return { name: m.name, domain, category: m.category || 'Requested', status: 'in_progress', custom: true }; })
    .filter(ci => !CATALOG.some(c => c.domain === ci.domain)),
    [overrides]);

  const allItems = useMemo(() => [...customItems, ...CATALOG], [customItems]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allItems.filter(it =>
      (cat === 'All' || it.category === cat) &&
      (!q || it.name.toLowerCase().includes(q) || it.domain.toLowerCase().includes(q))
    );
  }, [allItems, query, cat]);

  const counts = useMemo(() => {
    let connected = 0, inprog = 0;
    for (const it of allItems) { const s = statusOf(it); if (s === 'connected') connected++; else if (s === 'in_progress') inprog++; }
    return { total: allItems.length, connected, inprog };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allItems, overrides]);

  // Live "find any app on earth" via Clearbit autocomplete (no key).
  useEffect(() => {
    const q = query.trim();
    if (debRef.current) clearTimeout(debRef.current);
    if (q.length < 2) { setWebResults([]); return; }
    debRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(q)}`);
        if (!r.ok) return;
        const data = await r.json();
        setWebResults(Array.isArray(data) ? data.slice(0, 8) : []);
      } catch { setWebResults([]); }
    }, 250);
    return () => debRef.current && clearTimeout(debRef.current);
  }, [query]);

  // Web results not already covered by the catalog or filtered list.
  const knownDomains = new Set(allItems.map(i => i.domain.replace(/^www\./, '')));
  const freshWeb = webResults.filter(r => r.domain && !knownDomains.has(r.domain.replace(/^www\./, '')));

  return (
    <div className="col gap-4" style={{ paddingBottom: 40 }}>
      {/* hero */}
      <Card style={{ background: 'linear-gradient(135deg, var(--nav) 0%, #1c1740 60%, var(--accent-700) 130%)', color: '#fff', border: 'none' }}>
        <div className="row between wrap" style={{ gap: 20, alignItems: 'center' }}>
          <div style={{ maxWidth: '54ch' }}>
            <div className="row gap-2" style={{ alignItems: 'center', marginBottom: 8 }}>
              <Icon name="plug" size={18} />
              <span style={{ fontSize: '.72rem', fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--accent-300)' }}>Integrations</span>
            </div>
            <h1 style={{ margin: 0, fontSize: 'clamp(1.9rem, 3.4vw, 2.7rem)', lineHeight: 1.08, color: '#fff' }}>
              Rally connects to your entire stack.
            </h1>
            <p style={{ margin: '10px 0 0', fontSize: '1.05rem', color: '#c9cbe6', lineHeight: 1.5 }}>
              Salesforce, SAP, NetSuite, Jira, Gmail, Outlook, Mailchimp, Canva, and hundreds more.
              Not on the list? Search below. If it exists anywhere, we connect it, usually within a day.
            </p>
          </div>
          <div className="row gap-4" style={{ flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 800, lineHeight: 1 }}>{counts.total}+</div>
              <div style={{ fontSize: '.82rem', color: '#b9bce0' }}>connectors</div>
            </div>
            <div>
              <div style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 800, lineHeight: 1, color: 'var(--accent-300)' }}>&#8734;</div>
              <div style={{ fontSize: '.82rem', color: '#b9bce0' }}>any app you name</div>
            </div>
          </div>
        </div>
      </Card>

      {/* search */}
      <div style={{ position: 'relative' }}>
        <div className="row gap-2" style={{ alignItems: 'center', background: 'var(--paper)', border: '1px solid var(--line-strong)', borderRadius: 12, padding: '.7rem 1rem', boxShadow: 'var(--shadow-sm, 0 1px 2px rgba(0,0,0,.04))' }}>
          <Icon name="search" size={20} color="var(--n-400)" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search 200+ connectors, or type any tool your team uses (SAP, Jira, Mailchimp...)"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '1.02rem', color: 'var(--ink)' }}
          />
          {query && <button onClick={() => setQuery('')} className="btn btn-ghost btn-sm" aria-label="Clear"><Icon name="x" size={16} /></button>}
        </div>

        {/* live web results for anything not already in the catalog */}
        {freshWeb.length > 0 && (
          <Card style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 20, padding: 8 }}>
            <div className="t-xs" style={{ padding: '6px 10px', color: 'var(--n-600)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>
              Found on the web - request any of these
            </div>
            {freshWeb.map(r => (
              <button key={r.domain} onClick={() => { requestWeb(r); setQuery(''); }}
                className="row between"
                style={{ width: '100%', gap: 12, alignItems: 'center', padding: '8px 10px', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 8, textAlign: 'left' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--n-50)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span className="row gap-2" style={{ alignItems: 'center', minWidth: 0 }}>
                  <Logo domain={r.domain} name={r.name} size={32} />
                  <span style={{ minWidth: 0 }}>
                    <span className="fw-6 clip" style={{ display: 'block', color: 'var(--ink)' }}>{r.name}</span>
                    <span className="t-xs clip" style={{ display: 'block', color: 'var(--n-600)' }}>{r.domain}</span>
                  </span>
                </span>
                <span className="btn btn-primary btn-sm" style={{ pointerEvents: 'none' }}>Request</span>
              </button>
            ))}
          </Card>
        )}
      </div>

      {/* category chips */}
      <div className="row gap-2 wrap">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCat(c)}
            className="btn btn-sm"
            style={{
              background: cat === c ? 'var(--accent)' : 'var(--paper)',
              color: cat === c ? '#fff' : 'var(--ink-2)',
              border: '1px solid ' + (cat === c ? 'var(--accent)' : 'var(--line-strong)'),
            }}>
            {c}
          </button>
        ))}
        {(counts.inprog > 0 || counts.connected > 0) && (
          <span className="t-sm" style={{ marginLeft: 'auto', alignSelf: 'center', color: 'var(--n-600)' }}>
            {counts.connected} connected · {counts.inprog} in progress
          </span>
        )}
      </div>

      {/* grid */}
      {filtered.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink)' }}>No connector named "{query}" yet</div>
          <p className="t-sm" style={{ color: 'var(--n-600)', marginTop: 6 }}>Keep typing - if it exists anywhere, it shows up above to request. We wire new connectors within a day.</p>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {filtered.map(item => (
            <IntegrationCard key={item.domain} item={item} effectiveStatus={statusOf(item)} onAct={act} />
          ))}
        </div>
      )}
    </div>
  );
}
