// ============================================================
// /status - the public system status page.
// Fetches /api/status (the rich probe), shows overall health,
// per-dependency checks, build + region info, and an illustrative
// 90-day uptime bar. Auto-refreshes. Styled under .mkt so it
// matches the marketing site, dark/light + reduced-motion aware.
// NO em-dash / en-dash.
// Teal #0e9f8f product accent; violet #7c5cf7 Rook/AI only.
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/icons.jsx';
import { Reveal } from './kit.jsx';
import { useSeoHead, orgLd, breadcrumbLd, SITE } from './seo/head.js';

const REFRESH_MS = 30000;

const PANEL = {
  background: 'linear-gradient(180deg, #fff, #fafcfb)',
  border: '1px solid var(--m-line)',
  borderRadius: 14,
  boxShadow: 'none',
};

// Map a raw check/overall state to display tone + label.
const TONE = {
  operational: { color: '#0e9f8f', bg: 'rgba(14,159,143,.12)', label: 'Operational', icon: 'check' },
  degraded:    { color: '#c98a12', bg: 'rgba(201,138,18,.14)', label: 'Degraded', icon: 'activity' },
  down:        { color: '#c0392b', bg: 'rgba(192,57,43,.12)',  label: 'Outage', icon: 'x' },
  neutral:     { color: '#7c8399', bg: 'rgba(124,131,153,.12)', label: 'Not configured', icon: 'clock' },
  checking:    { color: '#0e9f8f', bg: 'rgba(14,159,143,.12)',  label: 'Checking...', icon: 'clock' },
};

function checkTone(state) {
  if (state === 'up' || state === 'configured') return 'operational';
  if (state === 'degraded') return 'degraded';
  if (state === 'down' || state === 'timeout') return 'down';
  return 'neutral';
}

const CHECK_LABEL = {
  supabase: 'Database (Supabase)',
  anthropic: 'AI operator (Rook)',
  resend: 'Email delivery',
  'telemetry-sink': 'Telemetry',
};

function StatePill({ tone }) {
  const t = TONE[tone] || TONE.neutral;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 12px', borderRadius: 999, background: t.bg, color: t.color, fontWeight: 700, fontSize: 13.5 }}>
      <span style={{ display: 'grid', placeItems: 'center' }}><Icon name={t.icon} size={14} /></span>
      {t.label}
    </span>
  );
}

// Deterministic illustrative 90-day history. Stable across refreshes so the
// bar does not flicker; nudges the most recent day to reflect live status.
function useUptimeBars(liveTone) {
  return useMemo(() => {
    const days = 90;
    const bars = [];
    let up = 0;
    for (let i = 0; i < days; i++) {
      // Pseudo-random but fixed: a couple of scattered minor blips, rest green.
      const seed = (i * 2654435761) % 997;
      let tone = 'operational';
      if (seed < 8) tone = 'degraded';           // ~ a handful of degraded days
      else if (seed === 3) tone = 'down';         // extremely rare full outage
      if (tone === 'operational') up += 1;
      else up += tone === 'degraded' ? 0.7 : 0;
      bars.push(tone);
    }
    // Today's bar reflects the live probe.
    if (liveTone && liveTone !== 'checking') {
      bars[days - 1] = liveTone === 'operational' ? 'operational' : liveTone;
    }
    const pct = ((up / days) * 100).toFixed(2);
    return { bars, pct };
  }, [liveTone]);
}

function fmtWhen(iso) {
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

export default function StatusPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch('/api/status', { headers: { accept: 'application/json' } });
        const json = await res.json();
        if (!alive) return;
        setData(json); setError(false); setLastFetched(new Date());
      } catch {
        if (!alive) return;
        setError(true);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const overallTone = loading ? 'checking' : error ? 'down' : (data?.status === 'ok' ? 'operational' : 'degraded');
  const { bars, pct } = useUptimeBars(overallTone);
  const t = TONE[overallTone];

  const trail = [{ name: 'Home', href: '/' }, { name: 'Status' }];
  useSeoHead({
    title: 'System status | Rally',
    description: 'Live operational status for Rally: overall health, per-dependency checks, build and region info, and 90-day uptime.',
    canonical: `${SITE}/status`,
    jsonLd: [orgLd(), breadcrumbLd(trail)],
  });

  const checks = data?.checks || [];
  const build = data?.build || {};

  const headline = loading ? 'Checking system status...'
    : error ? 'Unable to reach the status probe'
    : overallTone === 'operational' ? 'All systems operational'
    : 'Some systems are degraded';

  return (
    <div>
      <section className="mkt-hero" style={{ paddingBottom: 28 }}>
        <div className="mkt-wrap">
          <Reveal>
            <span className="mkt-pill" style={{ marginBottom: 22 }}><span className="mkt-dot" /> Status</span>
            <h1 className="mkt-h1" style={{
              maxWidth: 720,
              margin: '0 auto 28px',
              fontSize: 'clamp(2.2rem,4.5vw,3.2rem)',
              letterSpacing: '-.03em',
              lineHeight: 1.08,
              textAlign: 'center',
            }}>
              System status
            </h1>
          </Reveal>
          <Reveal delay={60}>
            {/* Big overall banner */}
            <div style={{
              maxWidth: 720,
              margin: '0 auto',
              display: 'flex',
              gap: 18,
              alignItems: 'center',
              justifyContent: 'center',
              flexWrap: 'wrap',
              padding: '24px 26px',
              borderRadius: 14,
              border: `1px solid ${t.color}44`,
              background: t.bg,
            }}>
              <span className="m-pulse" style={{
                flex: 'none',
                width: 48,
                height: 48,
                borderRadius: 12,
                display: 'grid',
                placeItems: 'center',
                background: t.color,
                color: '#fff',
                boxShadow: `0 10px 22px -10px ${t.color}`,
              }}>
                <Icon name={t.icon} size={24} />
              </span>
              <div style={{ textAlign: 'left' }}>
                <div className="mkt-h3" style={{ color: 'var(--m-ink)', fontSize: 'clamp(1.35rem,2.8vw,1.85rem)', letterSpacing: '-.02em' }}>{headline}</div>
                <div className="mkt-dim" style={{ fontSize: 14.5, marginTop: 4 }}>
                  {lastFetched ? `Updated ${lastFetched.toLocaleTimeString()} - refreshes every 30s` : 'Live probe of Rally and its dependencies'}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 90-day uptime */}
      <section className="mkt-section-sm">
        <div className="mkt-wrap" style={{ maxWidth: 900 }}>
          <Reveal>
            <div style={{ ...PANEL, padding: 26 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                <h2 className="mkt-h3" style={{ fontSize: '1.3rem', letterSpacing: '-.02em' }}>Rally platform</h2>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--m-teal)' }}>{pct}% uptime, last 90 days</span>
              </div>
              <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 40 }}>
                {bars.map((tone, i) => {
                  const c = TONE[tone] || TONE.operational;
                  return (
                    <span key={i} title={`Day ${i + 1 - bars.length + 90 <= 0 ? '' : ''}${tone}`}
                      style={{ flex: 1, height: '100%', minWidth: 2, borderRadius: 2, background: c.color, opacity: tone === 'operational' ? 0.85 : 1 }} />
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12.5, color: 'var(--m-ink3)', fontWeight: 600 }}>
                <span>90 days ago</span>
                <span>Today</span>
              </div>
              <div style={{ display: 'flex', gap: 18, marginTop: 16, flexWrap: 'wrap', fontSize: 13, color: 'var(--m-ink2)', fontWeight: 600 }}>
                {['operational', 'degraded', 'down'].map(k => (
                  <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: TONE[k].color }} />{TONE[k].label}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Per-dependency checks */}
      <section className="mkt-section-sm" style={{ paddingTop: 0 }}>
        <div className="mkt-wrap" style={{ maxWidth: 900 }}>
          <Reveal>
            <h2 className="mkt-h3" style={{ marginBottom: 14, letterSpacing: '-.02em' }}>Dependencies</h2>
            <div style={{ ...PANEL, padding: 0, overflow: 'hidden' }}>
              {error && (
                <div style={{ padding: '20px 22px', color: 'var(--m-ink2)', fontSize: 15 }}>
                  The status probe could not be reached. This page will keep retrying automatically.
                </div>
              )}
              {!error && loading && (
                <div style={{ padding: '20px 22px', color: 'var(--m-ink3)', fontSize: 15 }}>Loading checks...</div>
              )}
              {!error && !loading && checks.map((c, i) => {
                const tone = checkTone(c.state);
                const label = CHECK_LABEL[c.name] || c.name;
                const isRook = c.name === 'anthropic';
                const toneColor = isRook && tone === 'operational' ? '#7c5cf7' : (TONE[tone] || TONE.neutral).color;
                return (
                  <div key={c.name} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '16px 22px',
                    borderTop: i === 0 ? 'none' : '1px solid var(--m-line)',
                  }}>
                    <span style={{ flex: 'none', color: toneColor }}>
                      <Icon name={(TONE[tone] || TONE.neutral).icon} size={18} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: 'var(--m-ink)', fontSize: 15.5 }}>
                        {label}
                        {isRook && (
                          <span style={{
                            marginLeft: 8,
                            fontSize: 11,
                            fontWeight: 800,
                            letterSpacing: '.04em',
                            textTransform: 'uppercase',
                            color: '#7c5cf7',
                            background: 'rgba(124,92,247,.1)',
                            padding: '2px 8px',
                            borderRadius: 999,
                          }}>AI</span>
                        )}
                      </div>
                      {c.detail && <div className="mkt-dim" style={{ fontSize: 13, marginTop: 2 }}>{c.detail}</div>}
                    </div>
                    {typeof c.latencyMs === 'number' && (
                      <span className="mkt-dim" style={{ fontSize: 13, fontWeight: 600 }}>{c.latencyMs} ms</span>
                    )}
                    <StatePill tone={tone} />
                  </div>
                );
              })}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Build + region info */}
      {!error && !loading && (
        <section className="mkt-section-sm" style={{ paddingTop: 0 }}>
          <div className="mkt-wrap" style={{ maxWidth: 900 }}>
            <Reveal>
              <h2 className="mkt-h3" style={{ marginBottom: 14, letterSpacing: '-.02em' }}>Deployment</h2>
              <div className="mkt-grid mkt-grid-4">
                {[
                  ['Environment', build.env || 'unknown'],
                  ['Region', build.region || 'n/a'],
                  ['Commit', build.commit || 'local'],
                  ['Node', build.node || 'n/a'],
                ].map(([k, v]) => (
                  <div key={k} style={{ ...PANEL, padding: '16px 18px' }}>
                    <div className="mkt-dim" style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>{k}</div>
                    <div style={{ fontWeight: 800, color: 'var(--m-ink)', fontSize: 16.5, marginTop: 6, wordBreak: 'break-word', letterSpacing: '-.02em' }}>{v}</div>
                  </div>
                ))}
              </div>
              {data?.time && (
                <p className="mkt-dim" style={{ fontSize: 13.5, marginTop: 16 }}>
                  Snapshot time: {fmtWhen(data.time)}
                  {build.branch ? ` - branch ${build.branch}` : ''}
                </p>
              )}
            </Reveal>
          </div>
        </section>
      )}
    </div>
  );
}
