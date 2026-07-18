// ============================================================
// GENESIS  (Overview > Genesis)  -  prompt-to-platform studio
// ------------------------------------------------------------
// The signature leapfrog: describe your business in a sentence
// and watch Ardovo GENERATE your entire revenue OS in front of
// you - pipelines, custom fields, deal types, automations,
// comms templates, dashboards, and seed segments - then apply
// it in one click. GoHighLevel ships static snapshots; Genesis
// is generative and previewed.
//
// 100% local-first: the "generation" runs off a deterministic
// blueprint library (src/lib/genesis-data.js). An optional
// env-gated hook (VITE_GENESIS_LIVE -> /api/rook-plan) upgrades
// the advisory notes when present and degrades silently.
//
// ADDITIVE ONLY - this file is new. No existing file is edited.
// ASCII only. NO em-dash and NO en-dash.
// ============================================================
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Button, Card, Badge, Modal, Textarea, SectionHeader, PageTitle,
  ProgressBar, GradientText, Segmented, EmptyState, useToast, relTime,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import { celebrate } from '../lib/celebrate.js';
import {
  BLUEPRINTS, blueprintById, countArtifacts, buildSteps,
  generatePlan, generateWithRook, isLiveEnabled, seedCountFor,
  applyBlueprint, removeApplied, useGenesis, isApplied,
} from '../lib/genesis-data.js';

/* Example prompts that seed the generator - each maps cleanly to a blueprint. */
const EXAMPLES = [
  'I run a 3-location med spa, I sell memberships and single treatments, my team is 8 people',
  'HVAC and plumbing company, we do estimates then jobs, want maintenance plans too',
  'B2B SaaS startup selling seats to enterprise, need forecasting and renewals',
  'Marketing agency, we pitch retainers and run client projects',
  'Real estate team, buyer and seller leads, want speed to lead and past-client nurture',
  'Boutique fitness studio, trials into memberships, keep classes full',
];

/* Icon for the count of each artifact kind in the summary row. */
const KIND_META = [
  { key: 'pipelines', label: 'Pipelines', icon: 'target' },
  { key: 'stages', label: 'Stages', icon: 'chevronRight' },
  { key: 'fields', label: 'Custom fields', icon: 'sliders' },
  { key: 'dealTypes', label: 'Deal types', icon: 'box' },
  { key: 'automations', label: 'Automations', icon: 'zap' },
  { key: 'templates', label: 'Templates', icon: 'fileText' },
  { key: 'dashboards', label: 'Dashboards', icon: 'chart' },
  { key: 'segments', label: 'Segments', icon: 'funnel' },
];

function askRook(prompt) {
  try { window.dispatchEvent(new CustomEvent('rally:rook', { detail: { prompt } })); } catch {}
}

/* ---------- small presentational bits ---------- */
function GlyphTile({ icon, accent, size = 44 }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: 12, display: 'grid', placeItems: 'center',
      flex: 'none', color: '#fff',
      background: `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 60%, #000 12%))`,
      boxShadow: `0 8px 20px -8px ${accent}`,
    }}>
      <Icon name={icon} size={size * 0.5} stroke={1.9} />
    </span>
  );
}

function CountPill({ n, label, icon, accent }) {
  return (
    <div className="row gap-1" style={{ alignItems: 'center', padding: '.5rem .7rem', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', background: 'var(--n-25)' }}>
      <span style={{ color: accent }}><Icon name={icon} size={16} /></span>
      <span className="fw-8 tnum" style={{ fontSize: '1.15rem' }}>{n}</span>
      <span className="t-xs muted">{label}</span>
    </div>
  );
}

/* ============================================================
   BUILD STEPPER  -  the live "assembling your platform" reveal
   ============================================================ */
function BuildStepper({ plan, revealed }) {
  const scrollRef = useRef(null);
  useEffect(() => {
    // keep the newest artifact in view as the machine wires them up
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [revealed]);

  const steps = plan.steps;
  const shown = steps.slice(0, revealed);
  const accent = plan.blueprint.accent;

  return (
    <div>
      <div className="row between wrap gap-2" style={{ marginBottom: '.9rem' }}>
        <div className="row gap-2" style={{ minWidth: 0 }}>
          <GlyphTile icon={plan.blueprint.icon} accent={accent} />
          <div className="col" style={{ minWidth: 0 }}>
            <div className="fw-7 clip" style={{ fontSize: '1.1rem' }}>{plan.blueprint.name} blueprint</div>
            <div className="t-sm muted clip">{plan.blueprint.tagline}</div>
          </div>
        </div>
        <Badge tone="accent">
          <span className="tnum">{revealed}</span> / {steps.length} artifacts
        </Badge>
      </div>

      <ProgressBar value={(revealed / Math.max(1, steps.length)) * 100} color={accent} height={7} />

      <div ref={scrollRef} style={{ marginTop: '1rem', maxHeight: 340, overflowY: 'auto', paddingRight: 4 }}>
        {shown.map((s, i) => {
          const prev = shown[i - 1];
          const newGroup = !prev || prev.group !== s.group;
          const last = i === shown.length - 1;
          return (
            <React.Fragment key={s.id}>
              {newGroup && (
                <div className="eyebrow" style={{ margin: i === 0 ? '.2rem 0 .5rem' : '.9rem 0 .5rem' }}>{s.group}</div>
              )}
              <div className="fade-up row gap-2" style={{ alignItems: 'flex-start', padding: '.4rem 0' }}>
                <span style={{
                  width: 22, height: 22, borderRadius: 6, flex: 'none', display: 'grid', placeItems: 'center',
                  background: last ? 'var(--accent-50)' : 'var(--ok-bg)',
                  color: last ? accent : 'var(--ok)',
                  transition: 'background .2s',
                }}>
                  <Icon name={last ? s.kind : 'check'} size={13} stroke={2.4} />
                </span>
                <div className="col" style={{ minWidth: 0, gap: 1 }}>
                  <span className="fw-6 clip" style={{ fontSize: '.98rem' }}>{s.label}</span>
                  {s.detail && <span className="t-xs muted clip" style={{ maxWidth: '60ch' }}>{s.detail}</span>}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   BLUEPRINT DETAIL MODAL  -  expands a gallery card into the
   full contents across tabbed sections.
   ============================================================ */
function BlueprintModal({ bp, onClose, onPreview, onApply }) {
  const [tab, setTab] = useState('pipelines');
  if (!bp) return null;
  const c = countArtifacts(bp);
  const tabs = [
    { value: 'pipelines', label: `Pipelines ${c.pipelines}` },
    { value: 'fields', label: `Fields ${c.fields}` },
    { value: 'automations', label: `Automations ${c.automations}` },
    { value: 'templates', label: `Templates ${c.templates}` },
    { value: 'dashboards', label: `Dashboards ${c.dashboards}` },
    { value: 'segments', label: `Segments ${c.segments}` },
  ];
  return (
    <Modal open={!!bp} onClose={onClose} width={720} title={`${bp.name} blueprint`}
      footer={
        <>
          <Button variant="ghost" onClick={() => onPreview(bp)}><Icon name="eye" size={16} /> Preview build</Button>
          <Button variant="accent" onClick={() => onApply(bp)}><Icon name="rocket" size={16} /> Apply blueprint</Button>
        </>
      }>
      <div className="row gap-2" style={{ marginBottom: '1rem', alignItems: 'flex-start' }}>
        <GlyphTile icon={bp.icon} accent={bp.accent} size={52} />
        <div className="col" style={{ gap: 4 }}>
          <div className="muted">{bp.summary}</div>
          <div className="row gap-1 wrap" style={{ marginTop: 4 }}>
            {bp.dealTypes.map(d => <Badge key={d}>{d}</Badge>)}
          </div>
        </div>
      </div>

      <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
        <Segmented options={tabs} value={tab} onChange={setTab} />
      </div>

      {tab === 'pipelines' && (
        <div className="col gap-3">
          {bp.pipelines.map(p => (
            <div key={p.name}>
              <div className="fw-7" style={{ marginBottom: '.5rem' }}>{p.name}</div>
              <div className="row gap-1 wrap">
                {p.stages.map((st, i) => (
                  <span key={st} className="row gap-1" style={{ alignItems: 'center' }}>
                    <Badge tone={i === 0 ? 'accent' : 'default'}>{st}</Badge>
                    {i < p.stages.length - 1 && <Icon name="chevronRight" size={13} style={{ color: 'var(--n-400)' }} />}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'fields' && (
        <table className="table"><tbody>
          {bp.fields.map(f => (
            <tr key={f.object + f.name}>
              <td style={{ width: 110 }}><Badge>{f.object}</Badge></td>
              <td className="fw-6">{f.name}</td>
              <td className="muted t-sm" style={{ textAlign: 'right' }}>{f.type}</td>
            </tr>
          ))}
        </tbody></table>
      )}

      {tab === 'automations' && (
        <div className="col gap-2">
          {bp.automations.map(a => (
            <div key={a.name} className="row gap-2" style={{ alignItems: 'flex-start', padding: '.7rem .85rem', border: '1px solid var(--line)', borderRadius: 'var(--r-md)' }}>
              <span style={{ color: bp.accent, marginTop: 2 }}><Icon name="zap" size={18} /></span>
              <div className="col" style={{ gap: 2, minWidth: 0 }}>
                <span className="fw-7">{a.name}</span>
                <span className="t-sm muted">When <span className="fw-6" style={{ color: 'var(--ink-2)' }}>{a.trigger.toLowerCase()}</span>, then {a.action.toLowerCase()}.</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'templates' && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          {bp.templates.map(t => (
            <div key={t.name} className="row gap-2" style={{ padding: '.75rem .85rem', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', alignItems: 'center' }}>
              <span style={{ color: bp.accent }}><Icon name="fileText" size={18} /></span>
              <div className="col" style={{ gap: 1, minWidth: 0 }}>
                <span className="fw-6 clip">{t.name}</span>
                <span className="t-xs muted">{t.kind}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'dashboards' && (
        <div className="col gap-2">
          {bp.dashboards.map(d => (
            <div key={d.name} style={{ padding: '.8rem .9rem', border: '1px solid var(--line)', borderRadius: 'var(--r-md)' }}>
              <div className="row gap-1" style={{ marginBottom: '.5rem', alignItems: 'center' }}>
                <span style={{ color: bp.accent }}><Icon name="chart" size={16} /></span>
                <span className="fw-7">{d.name}</span>
              </div>
              <div className="row gap-1 wrap">
                {d.tiles.map(t => <Badge key={t} tone="default">{t}</Badge>)}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'segments' && (
        <table className="table"><tbody>
          {bp.segments.map(s => (
            <tr key={s.name}>
              <td className="fw-6">{s.name}</td>
              <td className="muted t-sm">{s.criteria}</td>
              <td className="tnum fw-6" style={{ textAlign: 'right', color: bp.accent }}>{seedCountFor(bp.id, s.name)}</td>
            </tr>
          ))}
        </tbody></table>
      )}
    </Modal>
  );
}

/* ============================================================
   PAGE
   ============================================================ */
export default function Genesis() {
  const toast = useToast();
  const applied = useGenesis();

  const [prompt, setPrompt] = useState('');
  const [plan, setPlan] = useState(null);         // set once per generate
  const [notes, setNotes] = useState([]);          // may upgrade via Rook (env-gated)
  const [building, setBuilding] = useState(false);
  const [revealed, setRevealed] = useState(0);
  const [modalBp, setModalBp] = useState(null);
  const resultRef = useRef(null);

  const live = isLiveEnabled();
  const done = plan && !building;

  /* run the generator + kick off the reveal animation */
  const generate = (text) => {
    const p = (text ?? prompt).trim();
    if (!p) { toast('Describe your business first.', 'warn'); return; }
    const local = generatePlan(p);
    setPrompt(p);
    setPlan(local);
    setNotes(local.notes);
    setRevealed(0);
    setBuilding(true);
    // env-gated upgrade of advisory notes; silent fallback, never blocks UI
    generateWithRook(p).then(res => { if (res?.notes?.length) setNotes(res.notes); }).catch(() => {});
    // bring the build into view
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  /* preview a specific gallery blueprint (skips the prompt) */
  const previewBlueprint = (bp) => {
    setModalBp(null);
    const local = { prompt: '', blueprint: bp, steps: buildSteps(bp), counts: countArtifacts(bp), signals: {}, notes: [`Previewing the ${bp.name} blueprint. Apply it as-is or describe your business to tune it.`], source: 'local' };
    setPrompt('');
    setPlan(local);
    setNotes(local.notes);
    setRevealed(0);
    setBuilding(true);
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  /* the reveal loop - deterministic step count, respects reduced motion */
  useEffect(() => {
    if (!building || !plan) return;
    const total = plan.steps.length;
    let reduce = false;
    try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch {}
    if (reduce) { setRevealed(total); setBuilding(false); return; }
    let i = 0;
    let timer;
    const tick = () => {
      i += 1;
      setRevealed(i);
      if (i >= total) { setBuilding(false); return; }
      // ease the cadence: quick through the long lists, small pause at the end
      const delay = i < 3 ? 220 : (total - i <= 2 ? 260 : 70);
      timer = setTimeout(tick, delay);
    };
    timer = setTimeout(tick, 240);
    return () => clearTimeout(timer);
  }, [building, plan]);

  const apply = (bp, srcPrompt = prompt, extraNotes = notes) => {
    const r = applyBlueprint(bp, srcPrompt, { notes: extraNotes });
    if (r.error) { toast(r.message, 'risk'); return; }
    setModalBp(null);
    try {
      celebrate({ x: window.innerWidth / 2, y: window.innerHeight / 2, count: 90 });
    } catch {}
    toast(`${bp.name} blueprint applied. ${countArtifacts(bp).total} artifacts installed.`, 'ok');
  };

  const startOver = () => { setPlan(null); setNotes([]); setBuilding(false); setRevealed(0); };

  const counts = plan ? plan.counts : null;

  return (
    <div className="page-in">
      <PageTitle
        eyebrow="Prompt to Platform"
        title="Genesis"
        sub="Describe your business in a sentence. Watch Ardovo generate your entire revenue OS, then apply it in one click."
        action={
          <Button variant="ghost" onClick={() => askRook('Help me describe my business so Genesis can build my revenue OS')}>
            <Icon name="sparkles" size={16} /> Ask Rook
          </Button>
        }
      />

      {/* ---------- STUDIO: prompt box ---------- */}
      <Card className="fade-up" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(680px 240px at 12% -10%, var(--accent-50), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <div className="row gap-1" style={{ alignItems: 'center', marginBottom: '.7rem' }}>
            <span style={{ color: 'var(--accent)' }}><Icon name="sparkles" size={20} /></span>
            <h3 style={{ margin: 0 }}>Generate your <GradientText>revenue OS</GradientText></h3>
          </div>
          <p className="muted" style={{ marginBottom: '1rem', maxWidth: '68ch' }}>
            Nobody else ships a platform you describe in a sentence. Tell Genesis what you do and it assembles pipelines, fields, deal types, automations, templates, dashboards, and segments - previewed before anything touches your data.
          </p>

          <Textarea
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. I run a 3-location med spa, I sell memberships and single treatments, my team is 8 people"
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') generate(); }}
            aria-label="Describe your business"
          />

          <div className="row between wrap gap-2" style={{ marginTop: '.85rem' }}>
            <div className="row gap-1 wrap" style={{ minWidth: 0 }}>
              {EXAMPLES.slice(0, 3).map(ex => (
                <button key={ex} className="badge" onClick={() => { setPrompt(ex); generate(ex); }}
                  style={{ cursor: 'pointer', maxWidth: 260, border: '1px solid var(--line)' }} title={ex}>
                  <span className="clip">{ex}</span>
                </button>
              ))}
            </div>
            <div className="row gap-1" style={{ flex: 'none' }}>
              {live && <Badge tone="ok"><span className="dot" style={{ background: 'var(--ok)' }} /> Live Rook</Badge>}
              <Button variant="accent" onClick={() => generate()}>
                <Icon name="bolt" size={16} /> Generate my platform
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* ---------- RESULT: live build + summary + apply ---------- */}
      <div ref={resultRef} />
      {plan && (
        <Card className="fade-up" style={{ marginTop: '1.15rem' }}>
          <SectionHeader
            eyebrow={building ? 'Assembling your platform' : 'Platform ready'}
            title={building ? 'Building live' : 'Your revenue OS, previewed'}
            sub={building ? 'Each artifact is wired in front of you. Nothing is saved until you apply.' : 'Review everything Genesis generated, then apply it in one click.'}
            action={
              <div className="row gap-1">
                <Button variant="quiet" onClick={startOver}><Icon name="rotateCcw" size={15} /> Start over</Button>
                {done && (
                  <Button variant="accent" onClick={() => apply(plan.blueprint)}>
                    <Icon name="rocket" size={16} /> Apply blueprint
                  </Button>
                )}
              </div>
            }
          />

          <BuildStepper plan={plan} revealed={revealed} />

          {/* summary artifact counts */}
          {counts && (
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', marginTop: '1.2rem' }}>
              {KIND_META.map(k => (
                <div key={k.key} className="card card-pad" style={{ padding: '.9rem 1rem' }}>
                  <div className="row between" style={{ alignItems: 'center' }}>
                    <span className="stat-label">{k.label}</span>
                    <span style={{ color: plan.blueprint.accent }}><Icon name={k.icon} size={16} /></span>
                  </div>
                  <div className="fw-8 tnum" style={{ fontSize: '2rem', lineHeight: 1.1, marginTop: 4 }}>
                    {building ? '-' : counts[k.key]}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* what Genesis tuned */}
          {done && notes.length > 0 && (
            <div style={{ marginTop: '1.2rem', padding: '1rem 1.1rem', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', background: 'var(--n-25)' }}>
              <div className="row gap-1" style={{ alignItems: 'center', marginBottom: '.5rem' }}>
                <span style={{ color: 'var(--accent)' }}><Icon name="sparkles" size={16} /></span>
                <span className="fw-7">What Rook tuned for you</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                {notes.map((n, i) => <li key={i} className="t-sm" style={{ marginBottom: 4, color: 'var(--ink-2)' }}>{n}</li>)}
              </ul>
              <div className="row gap-1 wrap" style={{ marginTop: '.8rem' }}>
                <Button variant="ghost" size="sm" onClick={() => setModalBp(plan.blueprint)}>
                  <Icon name="eye" size={15} /> Inspect contents
                </Button>
                <Button variant="ghost" size="sm" onClick={() => askRook(`I generated the ${plan.blueprint.name} blueprint in Genesis. What should I customize before applying it?`)}>
                  <Icon name="sparkles" size={15} /> Ask Rook to refine
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ---------- APPLIED BLUEPRINTS ---------- */}
      {applied.length > 0 && (
        <div style={{ marginTop: '1.6rem' }}>
          <SectionHeader
            eyebrow="Installed"
            title="Applied blueprints"
            sub="Everything Genesis has provisioned into this workspace."
          />
          <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {applied.map(a => (
              <Card key={a.id} className="row gap-2" style={{ alignItems: 'flex-start' }}>
                <GlyphTile icon={a.icon} accent={a.accent} />
                <div className="col" style={{ gap: 4, minWidth: 0, flex: 1 }}>
                  <div className="row between" style={{ alignItems: 'flex-start' }}>
                    <span className="fw-7 clip">{a.name}</span>
                    <button className="btn btn-quiet btn-sm" title="Remove" aria-label={`Remove ${a.name}`}
                      onClick={() => { removeApplied(a.id); toast(`${a.name} blueprint removed.`, 'warn'); }}
                      style={{ padding: '.2rem .4rem' }}>
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                  <div className="t-xs muted">Applied {relTime(a.appliedAt)} - {a.counts.total} artifacts</div>
                  {a.prompt && <div className="t-sm clip" style={{ color: 'var(--ink-2)' }}>"{a.prompt}"</div>}
                  <div className="row gap-1 wrap" style={{ marginTop: 4 }}>
                    <Badge tone="accent">{a.counts.pipelines} pipelines</Badge>
                    <Badge>{a.counts.automations} automations</Badge>
                    <Badge>{a.counts.dashboards} dashboards</Badge>
                  </div>
                  <div className="row gap-1" style={{ marginTop: 6 }}>
                    <Link to="/deals" className="link t-sm">Open pipeline</Link>
                    <span className="muted">-</span>
                    <Link to="/dashboards" className="link t-sm">View dashboards</Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ---------- BLUEPRINT GALLERY ---------- */}
      <div style={{ marginTop: '1.6rem' }}>
        <SectionHeader
          eyebrow="Prebuilt blueprints"
          title="Start from an industry"
          sub="Six opinionated revenue systems. Expand any one to preview every pipeline, field, and automation before you apply."
        />
        <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {BLUEPRINTS.map(bp => {
            const c = countArtifacts(bp);
            const on = isApplied(bp.id);
            return (
              <Card key={bp.id} hover className="col gap-2" style={{ cursor: 'pointer' }}
                onClick={() => setModalBp(bp)}
                role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setModalBp(bp); } }}>
                <div className="row between" style={{ alignItems: 'flex-start' }}>
                  <div className="row gap-2" style={{ minWidth: 0 }}>
                    <GlyphTile icon={bp.icon} accent={bp.accent} />
                    <div className="col" style={{ minWidth: 0 }}>
                      <span className="fw-7" style={{ fontSize: '1.05rem' }}>{bp.name}</span>
                      <span className="t-sm muted clip">{bp.tagline}</span>
                    </div>
                  </div>
                  {on && <Badge tone="ok"><Icon name="check" size={12} /> Applied</Badge>}
                </div>
                <p className="t-sm" style={{ color: 'var(--ink-2)', margin: '.2rem 0' }}>{bp.summary}</p>
                <div className="row gap-1 wrap">
                  <CountPill n={c.pipelines} label="pipelines" icon="target" accent={bp.accent} />
                  <CountPill n={c.automations} label="automations" icon="zap" accent={bp.accent} />
                  <CountPill n={c.fields} label="fields" icon="sliders" accent={bp.accent} />
                </div>
                <div className="row between" style={{ marginTop: 4 }}>
                  <span className="link t-sm row gap-1" style={{ alignItems: 'center' }}>
                    Explore blueprint <Icon name="arrowRight" size={14} />
                  </span>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); previewBlueprint(bp); }}>
                    <Icon name="bolt" size={14} /> Preview build
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {applied.length === 0 && !plan && (
        <Card className="fade-up" style={{ marginTop: '1.6rem' }}>
          <EmptyState
            icon="✨"
            title="Your workspace is a blank canvas"
            body="Describe your business above or pick a blueprint. Genesis assembles the whole revenue OS in seconds - the switch-in-a-weekend promise, made literal."
            action={<Button variant="accent" onClick={() => { setPrompt(EXAMPLES[0]); generate(EXAMPLES[0]); }}><Icon name="bolt" size={16} /> Try an example</Button>}
          />
        </Card>
      )}

      <BlueprintModal bp={modalBp} onClose={() => setModalBp(null)} onPreview={previewBlueprint} onApply={(bp) => apply(bp, '', [`Applied the ${bp.name} blueprint from the gallery.`])} />
    </div>
  );
}
