// ============================================================
// ONBOARDING  (route /onboarding)
// The first-run experience that turns a signup into an activated user.
// Six spring-animated, skippable steps: welcome, tell-us-about-your-team,
// pick modules, import-or-explore, invite teammates, and a "you are ready"
// finish with next best actions. State persists via src/lib/onboarding-data
// so the flow resumes where it left off. NO em-dash / en-dash.
// ============================================================
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/icons.jsx';
import { GradientText, Button } from '../components/UI.jsx';
import StepShell from '../components/onboarding/StepShell.jsx';
import ModulePicker from '../components/onboarding/ModulePicker.jsx';
import InviteTeam from '../components/onboarding/InviteTeam.jsx';
import {
  ROLES, TEAM_SIZES, USE_CASES,
  useOnboarding, setProfile, setDataChoice, goToStep,
  completeOnboarding, markRookMet, setOnboardingState,
} from '../lib/onboarding-data.js';
import '../components/onboarding/onboarding.css';

export default function Onboarding() {
  const nav = useNavigate();
  const onb = useOnboarding();
  const step = onb.currentStep || 0;
  const { profile } = onb;

  const next = () => goToStep(step + 1);
  const back = () => goToStep(step - 1);

  const leave = () => { completeOnboarding(); nav('/app'); };
  const finish = () => { completeOnboarding(); nav('/app'); };

  const openRook = () => {
    markRookMet();
    completeOnboarding();
    nav('/app');
    setTimeout(() => window.dispatchEvent(new CustomEvent('rally:rook', { detail: { open: true } })), 350);
  };

  const pickSample = () => { setDataChoice('sample'); next(); };
  const pickImport = () => { setDataChoice('import'); completeOnboarding(); nav('/import'); };

  const teamReady = !!(profile.role && profile.teamSize);

  /* ---- per-step footer config ---- */
  const footerFor = {
    0: { showBack: false, onNext: next, nextLabel: 'Get started' },
    1: { showBack: true, onBack: back, onNext: next, nextLabel: 'Continue', canNext: teamReady },
    2: { showBack: true, onBack: back, onNext: next, nextLabel: 'Continue' },
    3: { showBack: true, onBack: back, showNext: false },
    4: { showBack: true, onBack: back, onNext: next, nextLabel: onb.invited?.length ? 'Continue' : 'Skip this step' },
    5: { showBack: false, showNext: true, onNext: finish, nextLabel: 'Go to Command center' },
  }[step] || {};

  return (
    <StepShell
      step={step}
      onSkip={step === 5 ? undefined : leave}
      skipLabel={step === 0 ? 'I will explore on my own' : 'Skip setup'}
      {...footerFor}
    >
      {/* STEP 0 - welcome */}
      {step === 0 && (
        <div className="col gap-2" style={{ paddingTop: '.4rem' }}>
          <div className="eyebrow">Welcome to Rally</div>
          <h1 className="ob-title">Let us get your revenue engine <GradientText>running</GradientText></h1>
          <p className="ob-sub">
            Rally is the AI-native CRM with an operator that actually runs the work. This takes about a minute,
            and you can skip any step. Let us tailor it to how you sell.
          </p>
          <div className="ob-grid cols-3" style={{ marginTop: '1.5rem' }}>
            {[
              { icon: 'target', t: 'Your pipeline, live', d: 'Deals, forecast, and win rate the moment you land.' },
              { icon: 'sparkles', t: 'Rook does the work', d: 'An AI operator that builds accounts and drafts your day.' },
              { icon: 'bolt', t: 'Up in minutes', d: 'Import from any CRM or start with sample data.' },
            ].map(c => (
              <div key={c.t} className="col gap-1" style={{ padding: '1rem', borderRadius: 'var(--r-md)', background: 'var(--n-25)', border: '1px solid var(--line)' }}>
                <span className="row center" style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--accent-50)', color: 'var(--accent-600)' }}>
                  <Icon name={c.icon} size={17} />
                </span>
                <span className="fw-7" style={{ marginTop: 4 }}>{c.t}</span>
                <span className="t-sm muted" style={{ lineHeight: 1.35 }}>{c.d}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 1 - about your team */}
      {step === 1 && (
        <div className="col gap-1">
          <h2 className="ob-title" style={{ fontSize: 'clamp(1.4rem,3vw,1.9rem)' }}>Tell us about your team</h2>
          <p className="ob-sub">We will tune Rally around your role and how you work.</p>

          <div className="fw-7" style={{ marginTop: '1.3rem', marginBottom: '-.4rem' }}>What is your role?</div>
          <div className="ob-grid cols-2">
            {ROLES.map(r => (
              <button key={r.id} type="button" onClick={() => setProfile({ role: r.id })}
                className={`ob-opt${profile.role === r.id ? ' on' : ''}`} aria-pressed={profile.role === r.id}>
                <span className="ob-opt-check"><Icon name="check" size={13} stroke={3} /></span>
                <span className="ob-opt-ico"><Icon name={r.icon} size={18} /></span>
                <span className="fw-7" style={{ marginTop: 4 }}>{r.label}</span>
                <span className="t-sm muted" style={{ lineHeight: 1.35 }}>{r.blurb}</span>
              </button>
            ))}
          </div>

          <div className="fw-7" style={{ marginTop: '1.5rem' }}>How big is your team?</div>
          <div className="ob-pills">
            {TEAM_SIZES.map(s => (
              <button key={s} type="button" onClick={() => setProfile({ teamSize: s })}
                className={`ob-pill${profile.teamSize === s ? ' on' : ''}`}>{s}</button>
            ))}
          </div>

          <div className="fw-7" style={{ marginTop: '1.5rem' }}>What do you want to do first? <span className="t-sm muted fw-6">(optional)</span></div>
          <div className="ob-grid cols-3">
            {USE_CASES.map(u => (
              <button key={u.id} type="button" onClick={() => setProfile({ useCase: profile.useCase === u.id ? '' : u.id })}
                className={`ob-opt${profile.useCase === u.id ? ' on' : ''}`} style={{ flexDirection: 'row', alignItems: 'center', gap: '.6rem' }}
                aria-pressed={profile.useCase === u.id}>
                <span className="ob-opt-ico" style={{ width: 32, height: 32 }}><Icon name={u.icon} size={16} /></span>
                <span className="fw-6" style={{ fontSize: '.94rem' }}>{u.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2 - pick modules */}
      {step === 2 && (
        <div className="col gap-1">
          <h2 className="ob-title" style={{ fontSize: 'clamp(1.4rem,3vw,1.9rem)' }}>Choose your modules</h2>
          <p className="ob-sub">Turn on what you need now. Everything can be changed later in Settings, and the CRM core is always on.</p>
          <ModulePicker />
        </div>
      )}

      {/* STEP 3 - data */}
      {step === 3 && (
        <div className="col gap-1">
          <h2 className="ob-title" style={{ fontSize: 'clamp(1.4rem,3vw,1.9rem)' }}>Bring in your data</h2>
          <p className="ob-sub">Start with your real book of business, or explore Rally with a rich sample workspace first.</p>
          <div className="ob-grid cols-2" style={{ marginTop: '1.4rem' }}>
            <button type="button" className="ob-choice" onClick={pickImport}>
              <span className="glow" aria-hidden />
              <span className="ob-choice-ico"><Icon name="download" size={22} /></span>
              <span className="fw-7" style={{ fontSize: '1.1rem' }}>Import my data</span>
              <span className="t-sm muted" style={{ lineHeight: 1.4 }}>Upload a CSV or migrate straight from Salesforce, HubSpot, or Pipedrive. Columns auto-map to Rally fields.</span>
              <span className="row gap-1" style={{ color: 'var(--accent-600)', fontWeight: 700, marginTop: 4 }}>Open import <Icon name="chevronRight" size={15} /></span>
            </button>
            <button type="button" className="ob-choice" onClick={pickSample}>
              <span className="glow" aria-hidden />
              <span className="ob-choice-ico" style={{ background: 'color-mix(in srgb, #0ea5a3 14%, transparent)', color: '#0ea5a3' }}><Icon name="sparkles" size={22} /></span>
              <span className="fw-7" style={{ fontSize: '1.1rem' }}>Explore with sample data</span>
              <span className="t-sm muted" style={{ lineHeight: 1.4 }}>Jump into a fully populated workspace with pipeline, deals, and activity so you can feel the product immediately.</span>
              <span className="row gap-1" style={{ color: '#0ea5a3', fontWeight: 700, marginTop: 4 }}>Continue <Icon name="chevronRight" size={15} /></span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4 - invite */}
      {step === 4 && (
        <div className="col gap-1">
          <h2 className="ob-title" style={{ fontSize: 'clamp(1.4rem,3vw,1.9rem)' }}>Invite your team</h2>
          <p className="ob-sub">Rally is a team sport. Add the reps, managers, and ops folks who run revenue with you.</p>
          <InviteTeam emails={onb.invited || []} onChange={(list) => setOnboardingState({ invited: list })} />
        </div>
      )}

      {/* STEP 5 - ready */}
      {step === 5 && (
        <div className="col gap-2" style={{ textAlign: 'center', paddingTop: '.4rem' }}>
          <div className="ob-burst"><Icon name="check" size={38} stroke={3} /></div>
          <h1 className="ob-title" style={{ marginTop: '.6rem' }}>You are <GradientText>ready</GradientText></h1>
          <p className="ob-sub" style={{ margin: '.4rem auto 0' }}>
            Your workspace is set up{onb.invited?.length ? ` and ${onb.invited.length} invite${onb.invited.length === 1 ? '' : 's'} are queued` : ''}.
            Here is where to go next.
          </p>
          <div className="ob-nba" style={{ textAlign: 'left' }}>
            {[
              { icon: 'target', t: 'See your pipeline', d: 'Every open deal by stage.', go: () => { completeOnboarding(); nav('/deals'); } },
              { icon: 'download', t: 'Import your data', d: 'Bring your book into Rally.', go: () => { completeOnboarding(); nav('/import'); } },
              { icon: 'sparkles', t: 'Ask Rook', d: 'Let the AI operator build for you.', go: openRook },
              { icon: 'chart', t: 'Open a dashboard', d: 'Live KPIs and trends.', go: () => { completeOnboarding(); nav('/dashboards'); } },
            ].map(a => (
              <button key={a.t} type="button" className="ob-nba-item" onClick={a.go}>
                <span className="ob-nba-ico"><Icon name={a.icon} size={19} /></span>
                <div className="col" style={{ minWidth: 0, lineHeight: 1.3 }}>
                  <span className="fw-7">{a.t}</span>
                  <span className="t-sm muted clip">{a.d}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </StepShell>
  );
}
