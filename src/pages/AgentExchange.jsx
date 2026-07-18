// Agent Exchange - Ardovo's answer to Salesforce AgentExchange: a marketplace of
// proven, ready-to-run agent templates that install into your fleet in one
// click. Every template is wired to the shared TOOL CATALOG, so an installed
// agent lands in Agent Cloud fully specified (role, tools, autonomy, mandate)
// and ready to work the real book. Teal is the product; violet marks the AI
// layer. NO em-dash / en-dash. ASCII only.
import React, { useMemo, useState } from 'react';
import {
  SectionHeader, Card, StatCard, Button, Badge, Input, Modal, useToast, EmptyState,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import AgentDeck from '../components/agent/AgentDeck.jsx';
import {
  useAgentCloud, getAgents, createAgent,
  TOOL_CATALOG, AUTONOMY, DEFAULT_MANDATE, MODELS,
} from '../lib/agent-cloud.js';

const toolByName = (n) => TOOL_CATALOG.find(t => t.name === n) || null;
const autonomyMeta = (id) => AUTONOMY.find(a => a.id === id) || AUTONOMY[0];
const AUTONOMY_TONE = { suggest: '#2563a8', approve: '#7c5cf7', auto: '#0e9f8f' };

const CATEGORY_TONE = {
  Sales: 'var(--accent-600)',
  Marketing: '#7c5cf7',
  Success: '#1a9f6d',
  Ops: '#2563a8',
  Analytics: '#e0752d',
};

/* ============================================================
   TEMPLATES - the marketplace catalog. Each references only tool names that
   exist in TOOL_CATALOG. `does` powers the detail modal's "what it will do".
   ============================================================ */
const TEMPLATES = [
  {
    id: 't_renewal_watchdog',
    name: 'Renewal Watchdog',
    tagline: 'Never let a renewal sneak up on you again.',
    category: 'Success',
    icon: 'shield',
    role: 'Watches every account approaching its renewal window and stages the save play before the deal goes cold.',
    tools: ['list_deals', 'summarize_deal', 'log_activity'],
    autonomy: 'approve',
    model: 'claude-sonnet-4-6',
    popularity: 94,
    does: [
      'Scans the book for deals inside their renewal window.',
      'Summarizes each account with its open tickets and usage signals.',
      'Stages a renewal outreach task ranked by dollars at risk.',
    ],
  },
  {
    id: 't_inbound_qualifier',
    name: 'Inbound Qualifier',
    tagline: 'Every inbound lead scored and routed in seconds.',
    category: 'Sales',
    icon: 'zap',
    role: 'Works fresh inbound leads: dedupes against the book, creates the contact and deal, and logs the qualification note.',
    tools: ['find_record', 'create_contact', 'create_deal', 'log_activity'],
    autonomy: 'auto',
    model: 'gpt-5-mini',
    popularity: 88,
    does: [
      'Checks for an existing record to avoid duplicates.',
      'Creates the contact and opens a qualified deal at the right stage.',
      'Logs a qualification note so the rep picks up warm.',
    ],
  },
  {
    id: 't_meeting_booker',
    name: 'Meeting Booker',
    tagline: 'Turns a warm reply into a booked slot.',
    category: 'Sales',
    icon: 'target',
    role: 'Drafts the scheduling reply for engaged prospects and logs the follow-up so nothing stalls in the inbox.',
    tools: ['find_record', 'draft_email', 'log_activity'],
    autonomy: 'approve',
    model: 'claude-sonnet-4-6',
    popularity: 82,
    does: [
      'Pulls the prospect record and recent thread context.',
      'Drafts a grounded scheduling email (staged, never auto-sends).',
      'Logs the outreach as a task with a due date.',
    ],
  },
  {
    id: 't_churn_sentinel',
    name: 'Churn Sentinel',
    tagline: 'Catches at-risk accounts before they slip.',
    category: 'Success',
    icon: 'activity',
    role: 'Monitors slipping and single-threaded deals, surfaces the risk story, and lines up a rescue task.',
    tools: ['slipping_deals', 'summarize_deal', 'log_activity'],
    autonomy: 'approve',
    model: 'claude-sonnet-4-6',
    popularity: 79,
    does: [
      'Ranks slipping deals by value at risk.',
      'Summarizes why each account is exposed.',
      'Stages a rescue task for the owner to approve.',
    ],
  },
  {
    id: 't_expansion_spotter',
    name: 'Expansion Spotter',
    tagline: 'Finds the upsell hiding in your book.',
    category: 'Sales',
    icon: 'trendUp',
    role: 'Reads the pipeline for accounts primed to expand and predicts which are most likely to land.',
    tools: ['get_pipeline', 'list_deals', 'predict_outcome'],
    autonomy: 'suggest',
    model: 'claude-sonnet-4-6',
    popularity: 76,
    does: [
      'Reads pipeline coverage and stage breakdown.',
      'Flags accounts with expansion signals.',
      'Predicts win likelihood from nearest closed deals.',
    ],
  },
  {
    id: 't_quote_builder',
    name: 'Quote Builder',
    tagline: 'From live deal to clean draft quote.',
    category: 'Sales',
    icon: 'receipt',
    role: 'Assembles a draft quote from an active deal so reps stop rebuilding pricing by hand.',
    tools: ['summarize_deal', 'quote_from_deal'],
    autonomy: 'approve',
    model: 'claude-sonnet-4-6',
    popularity: 71,
    does: [
      'Summarizes the deal scope and line items.',
      'Builds a draft quote from the deal record.',
      'Stages it for a one-click send after review.',
    ],
  },
  {
    id: 't_pipeline_hygienist',
    name: 'Pipeline Hygienist',
    tagline: 'Keeps every stage honest, automatically.',
    category: 'Ops',
    icon: 'sparkles',
    role: 'Advances deals whose evidence outran their stage and logs the correction for a clean forecast.',
    tools: ['list_deals', 'move_stage', 'log_activity'],
    autonomy: 'approve',
    model: 'claude-sonnet-4-6',
    popularity: 85,
    does: [
      'Lists deals whose activity does not match their stage.',
      'Proposes the stage move that reflects reality.',
      'Logs the change so the audit trail stays clean.',
    ],
  },
  {
    id: 't_winback_writer',
    name: 'Win-back Writer',
    tagline: 'Re-opens the door on cold deals.',
    category: 'Marketing',
    icon: 'mail',
    role: 'Finds deals that went quiet and drafts a tailored win-back message for each.',
    tools: ['slipping_deals', 'draft_email'],
    autonomy: 'approve',
    model: 'gpt-5-mini',
    popularity: 68,
    does: [
      'Identifies deals that have gone dark.',
      'Drafts a personalized win-back email per deal.',
      'Stages each draft for your approval before anything sends.',
    ],
  },
  {
    id: 't_qbr_generator',
    name: 'QBR Generator',
    tagline: 'Quarterly business reviews on autopilot.',
    category: 'Success',
    icon: 'receipt',
    role: 'Generates a QBR deck for an account from its live deals, tickets, and outcomes.',
    tools: ['summarize_deal', 'generate_deck'],
    autonomy: 'suggest',
    model: 'claude-opus-4',
    popularity: 73,
    does: [
      'Summarizes the account relationship and open work.',
      'Generates a QBR deck ready to present.',
      'Hands it back for a final review and edits.',
    ],
  },
  {
    id: 't_territory_mapper',
    name: 'Territory Mapper',
    tagline: 'See coverage and whitespace at a glance.',
    category: 'Analytics',
    icon: 'target',
    role: 'Reads the full book to map territory coverage, concentration, and the accounts nobody is working.',
    tools: ['get_pipeline', 'list_deals', 'find_record'],
    autonomy: 'suggest',
    model: 'claude-sonnet-4-6',
    popularity: 61,
    does: [
      'Reads pipeline totals and stage distribution.',
      'Segments deals by owner and value band.',
      'Surfaces whitespace accounts with no active coverage.',
    ],
  },
  {
    id: 't_broadcast_composer',
    name: 'Broadcast Composer',
    tagline: 'Segment, write, and stage a campaign.',
    category: 'Marketing',
    icon: 'mail',
    role: 'Drafts and stages a marketing broadcast to a target audience with a grounded message.',
    tools: ['queue_broadcast', 'draft_email'],
    autonomy: 'approve',
    model: 'claude-sonnet-4-6',
    popularity: 64,
    does: [
      'Drafts the broadcast copy for the chosen audience.',
      'Queues it as a staged campaign.',
      'Waits for your approval before it goes out.',
    ],
  },
  {
    id: 't_account_builder',
    name: 'Account Builder',
    tagline: 'Stand up a whole account from one sentence.',
    category: 'Ops',
    icon: 'users',
    role: 'Turns a single sentence into a full account: company, committee, deal, and the first tasks.',
    tools: ['build_account', 'create_company', 'create_deal'],
    autonomy: 'approve',
    model: 'claude-opus-4',
    popularity: 70,
    does: [
      'Parses your one-line goal into an account plan.',
      'Creates the company and opens the deal.',
      'Lays down the opening tasks for the team.',
    ],
  },
];

const CATEGORIES = ['All', 'Sales', 'Marketing', 'Success', 'Ops', 'Analytics'];

export default function AgentExchange() {
  const cloud = useAgentCloud();
  const toast = useToast();
  const [cat, setCat] = useState('All');
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState(null);

  // cloud.agents keeps this reactive: installing an agent re-renders the cards.
  const agents = cloud.agents || getAgents();
  const installedNames = useMemo(
    () => new Set(agents.map(a => (a.name || '').toLowerCase())),
    [agents],
  );
  const isInstalled = (t) => installedNames.has(t.name.toLowerCase());

  const categoryCount = useMemo(() => new Set(TEMPLATES.map(t => t.category)).size, []);
  const installedCount = agents.filter(a => !a.builtin).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TEMPLATES
      .filter(t => cat === 'All' || t.category === cat)
      .filter(t => {
        if (!q) return true;
        const hay = [t.name, t.tagline, t.role, t.category, ...t.tools].join(' ').toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => b.popularity - a.popularity);
  }, [cat, query]);

  function install(t) {
    if (isInstalled(t)) { setDetail(null); return; }
    createAgent({
      name: t.name,
      role: t.role,
      icon: t.icon,
      tools: t.tools,
      model: t.model || MODELS[0].id,
      autonomy: t.autonomy,
      mandate: { ...DEFAULT_MANDATE },
    });
    toast('Installed to your fleet');
    setDetail(null);
  }

  return (
    <div className="fade-up ax">
      <AgentDeck
        eyebrow="Agent Exchange"
        title="Proven agents,"
        highlight="one click in."
        sub="Install proven agents into your fleet in one click. Every template lands fully specified with role, tools, autonomy, and mandate, ready to work the real book."
      />

      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', marginBottom: '1.15rem' }}>
        <StatCard label="Templates available" value={TEMPLATES.length} icon={<Icon name="store" size={18} />} accent="var(--ai)" />
        <StatCard label="Categories" value={categoryCount} icon={<Icon name="target" size={18} />} accent="var(--accent)" />
        <StatCard label="Installed from Exchange" value={installedCount} sub={installedCount ? 'live in your fleet' : 'nothing yet'} icon={<Icon name="check" size={18} />} accent="var(--ok)" />
      </div>

      <div className="ax-toolbar">
        <div className="ax-chips">
          {CATEGORIES.map(c => (
            <button
              key={c}
              className="ax-chip"
              data-on={cat === c}
              onClick={() => setCat(c)}
              style={cat === c && c !== 'All' ? { borderColor: CATEGORY_TONE[c], color: CATEGORY_TONE[c] } : undefined}
            >
              {c}
              <span className="ax-chip-count">{c === 'All' ? TEMPLATES.length : TEMPLATES.filter(t => t.category === c).length}</span>
            </button>
          ))}
        </div>
        <div className="ax-search">
          <Icon name="search" size={16} />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search templates, roles, tools"
            aria-label="Search templates"
            style={{ border: 'none', background: 'transparent', padding: 0, height: 'auto' }}
          />
          {query && <button className="ax-search-clear" onClick={() => setQuery('')} aria-label="Clear search"><Icon name="x" size={15} /></button>}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon="🔍"
            title="No templates match that search"
            body="Try a different keyword or clear the filter to see the full catalog."
            action={<Button variant="ghost" size="sm" onClick={() => { setQuery(''); setCat('All'); }}>Clear filters</Button>}
          />
        </Card>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '1rem' }}>
          {filtered.map(t => {
            const am = autonomyMeta(t.autonomy);
            const installed = isInstalled(t);
            return (
              <div key={t.id} className="ax-card" onClick={() => setDetail(t)} role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDetail(t); } }}>
                <div className="row gap-2" style={{ alignItems: 'flex-start' }}>
                  <span className="ax-card-ico"><Icon name={t.icon} size={19} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="ax-card-name">{t.name}</div>
                    <span className="ax-cat" style={{ color: CATEGORY_TONE[t.category], background: CATEGORY_TONE[t.category] + '18' }}>{t.category}</span>
                  </div>
                  <span className="ax-pop" title="Popularity"><Icon name="trendUp" size={13} /> {t.popularity}</span>
                </div>

                <div className="ax-card-tag">{t.tagline}</div>

                <div className="ax-card-meta">
                  <span className="ax-chip-sm" style={{ color: AUTONOMY_TONE[t.autonomy], background: AUTONOMY_TONE[t.autonomy] + '18' }}>{am.label}</span>
                  <span className="ax-chip-sm ax-chip-sm--muted">{t.tools.length} tool{t.tools.length === 1 ? '' : 's'}</span>
                </div>

                <div className="ax-card-foot" onClick={(e) => e.stopPropagation()}>
                  <button className="ax-detail-link" onClick={() => setDetail(t)}>Details <Icon name="chevronRight" size={13} /></button>
                  {installed ? (
                    <span className="ax-installed"><Icon name="check" size={14} /> Installed</span>
                  ) : (
                    <Button size="sm" onClick={() => install(t)}><Icon name="plus" size={14} /> Install</Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <DetailModal
        template={detail}
        installed={detail ? isInstalled(detail) : false}
        onClose={() => setDetail(null)}
        onInstall={install}
      />

      <AgentExchangeStyles />
    </div>
  );
}

function DetailModal({ template, installed, onClose, onInstall }) {
  if (!template) return null;
  const am = autonomyMeta(template.autonomy);
  const model = MODELS.find(m => m.id === template.model) || MODELS[0];
  return (
    <Modal open={!!template} onClose={onClose} width={600} title={
      <span className="row gap-2" style={{ alignItems: 'center' }}>
        <span className="ax-card-ico" style={{ width: 34, height: 34 }}><Icon name={template.icon} size={18} /></span>
        {template.name}
      </span>
    }>
      <div className="col gap-3">
        <div>
          <div className="row gap-2" style={{ flexWrap: 'wrap', marginBottom: 8 }}>
            <span className="ax-cat" style={{ color: CATEGORY_TONE[template.category], background: CATEGORY_TONE[template.category] + '18' }}>{template.category}</span>
            <span className="ax-chip-sm" style={{ color: AUTONOMY_TONE[template.autonomy], background: AUTONOMY_TONE[template.autonomy] + '18' }}>{am.label}</span>
            <span className="ax-chip-sm ax-chip-sm--muted">{model.label}</span>
            <span className="ax-chip-sm ax-chip-sm--muted"><Icon name="trendUp" size={12} /> {template.popularity} popularity</span>
          </div>
          <p className="ax-role">{template.role}</p>
        </div>

        <div>
          <div className="ax-section-label">What it will do</div>
          <ul className="ax-does">
            {template.does.map((d, i) => (
              <li key={i}><span className="ax-does-dot"><Icon name="check" size={12} /></span>{d}</li>
            ))}
          </ul>
        </div>

        <div>
          <div className="ax-section-label">Tools ({template.tools.length})</div>
          <div className="col gap-1">
            {template.tools.map(name => {
              const tool = toolByName(name);
              if (!tool) return null;
              const write = tool.kind === 'write';
              return (
                <div key={name} className="ax-tool">
                  <span className="ax-tool-name">{tool.name}</span>
                  <span className="ax-tool-kind" data-write={write}>{write ? 'write' : 'read'}</span>
                  <span className="ax-tool-desc">{tool.description}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="ax-govnote">
          <Icon name="shield" size={14} />
          <span>Installs at <strong>{am.label}</strong> autonomy inside the default mandate: writes stay reversible and every run is logged. You can retune it in Agent Cloud any time.</span>
        </div>

        <div className="row gap-2" style={{ justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onClose}>Close</Button>
          {installed ? (
            <span className="ax-installed" style={{ padding: '.55rem .9rem' }}><Icon name="check" size={15} /> Installed</span>
          ) : (
            <Button onClick={() => onInstall(template)}><Icon name="plus" size={15} /> Install to fleet</Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function AgentExchangeStyles() {
  return (
    <style>{`
    .ax-mark { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, var(--ai), var(--ai-600)); box-shadow: var(--ai-glow); }

    .ax-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 1.15rem; }
    .ax-chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .ax-chip { display: inline-flex; align-items: center; gap: 6px; font-family: inherit; font-size: 13px; font-weight: 700; color: var(--n-600); background: var(--paper); border: 1px solid var(--line); border-radius: 999px; padding: 6px 12px; cursor: pointer; transition: border-color .15s, color .15s, background .15s; }
    .ax-chip:hover { border-color: var(--line-strong); color: var(--ink); }
    .ax-chip[data-on="true"] { color: var(--ink); border-color: var(--ink); background: var(--n-25); }
    .ax-chip-count { font-size: 11px; font-weight: 800; color: var(--n-600); background: var(--n-100); border-radius: 999px; padding: 1px 7px; }

    .ax-search { display: flex; align-items: center; gap: 8px; background: var(--paper); border: 1px solid var(--line); border-radius: 999px; padding: 7px 14px; min-width: 240px; color: var(--n-400); transition: border-color .15s; }
    .ax-search:focus-within { border-color: var(--accent); color: var(--accent-600); }
    .ax-search input { flex: 1; font-family: inherit; font-size: 14px; color: var(--ink); outline: none; }
    .ax-search-clear { display: grid; place-items: center; background: none; border: none; color: var(--n-400); cursor: pointer; padding: 0; }
    .ax-search-clear:hover { color: var(--ink); }

    .ax-card { background: var(--paper); border: 1px solid var(--line); border-radius: 14px; padding: 15px; display: flex; flex-direction: column; gap: 11px; cursor: pointer; transition: border-color .15s, box-shadow .15s, transform .15s; }
    .ax-card:hover { border-color: rgba(124,92,247,.4); box-shadow: var(--shadow-sm); transform: translateY(-2px); }
    .ax-card:focus-visible { outline: 2px solid var(--ai); outline-offset: 2px; }
    .ax-card-ico { width: 40px; height: 40px; border-radius: 11px; flex: none; display: grid; place-items: center; color: var(--ai-600); background: var(--ai-50); }
    .ax-card-name { font-weight: 800; font-size: 15.5px; color: var(--ink); line-height: 1.2; }
    .ax-cat { display: inline-block; font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 999px; margin-top: 4px; }
    .ax-pop { display: inline-flex; align-items: center; gap: 3px; flex: none; font-size: 12px; font-weight: 800; color: var(--ok); font-variant-numeric: tabular-nums; }
    .ax-card-tag { font-size: 13px; color: var(--n-600); line-height: 1.45; flex: 1; }
    .ax-card-meta { display: flex; flex-wrap: wrap; gap: 6px; }
    .ax-chip-sm { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 999px; text-transform: capitalize; }
    .ax-chip-sm--muted { color: var(--n-600); background: var(--n-100); text-transform: none; }
    .ax-card-foot { display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--line); padding-top: 11px; }
    .ax-detail-link { display: inline-flex; align-items: center; gap: 3px; background: none; border: none; font-family: inherit; font-weight: 700; font-size: 12.5px; color: var(--ai-600); cursor: pointer; padding: 0; }
    .ax-installed { display: inline-flex; align-items: center; gap: 5px; font-size: 13px; font-weight: 800; color: var(--ok); background: var(--ok-bg); border-radius: 999px; padding: .4rem .8rem; }

    .ax-role { font-size: 14px; color: var(--ink-2); line-height: 1.55; margin: 0; }
    .ax-section-label { font-size: 11.5px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; color: var(--n-600); margin-bottom: 9px; }
    .ax-does { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
    .ax-does li { display: flex; align-items: flex-start; gap: 9px; font-size: 13.5px; color: var(--ink-2); line-height: 1.45; }
    .ax-does-dot { flex: none; width: 20px; height: 20px; border-radius: 50%; display: grid; place-items: center; color: var(--ok); background: var(--ok-bg); margin-top: 1px; }

    .ax-tool { display: flex; align-items: baseline; gap: 9px; padding: 9px 11px; border: 1px solid var(--line); border-radius: 10px; background: var(--n-25); flex-wrap: wrap; }
    .ax-tool-name { font-family: var(--font-mono); font-size: 12.5px; font-weight: 700; color: var(--ink); }
    .ax-tool-kind { font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .03em; padding: 1px 7px; border-radius: 999px; color: var(--accent-600); background: var(--accent-50); flex: none; }
    .ax-tool-kind[data-write="true"] { color: var(--ai-600); background: var(--ai-50); }
    .ax-tool-desc { flex: 1 1 100%; font-size: 12.5px; color: var(--n-600); line-height: 1.4; }

    .ax-govnote { display: flex; align-items: flex-start; gap: 9px; font-size: 12.5px; color: var(--ink-2); line-height: 1.5; background: var(--ai-50); border-radius: 10px; padding: 11px 13px; }
    .ax-govnote svg { flex: none; color: var(--ai-600); margin-top: 2px; }
    `}</style>
  );
}
