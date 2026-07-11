// ============================================================
// RALLY WELCOME  (route /welcome)
// The post-signup step that turns a fresh account into a working workspace:
// name the workspace, pick a plan tier, and (optionally) invite teammates.
// It provisions the org via src/lib/workspace.js, then routes into the
// existing onboarding wizard (/onboarding), which finishes at the product.
//
// Funnel: land -> signup (real email) -> verify -> /welcome -> /onboarding -> app.
// Self-contained full-screen shell (its own welcome.css) so it looks right
// whether it mounts in the marketing or product shell. Additive + inert:
// nothing routes here until App.jsx adds the /welcome route.
// NO em-dash / en-dash. ASCII only.
// ============================================================
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/icons.jsx';
import { PLANS, priceLabel, isPaidPlan } from '../lib/plans.js';
import { createWorkspace, inviteMembers } from '../lib/workspace.js';
import { useSession } from '../lib/auth.js';
import { getCurrentUser } from '../lib/store.js';
import './welcome.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Derive a friendly default workspace name from a person's name or email.
function defaultWorkspaceName(name, email) {
  const first = (name || '').trim().split(/\s+/)[0];
  if (first) return `${first}'s Workspace`;
  const handle = (email || '').split('@')[0];
  if (handle) return `${handle}'s Workspace`;
  return 'My Workspace';
}

export default function Welcome() {
  const nav = useNavigate();
  const sess = useSession();

  // Identify the operator: real session when configured, seeded demo user else.
  const demoUser = getCurrentUser();
  const person = useMemo(() => {
    const u = sess.user;
    const name = u?.user_metadata?.name || u?.user_metadata?.full_name || demoUser?.name || '';
    const email = u?.email || demoUser?.email || '';
    return { name, email };
  }, [sess.user, demoUser]);

  const [wsName, setWsName] = useState(() => defaultWorkspaceName(person.name, person.email));
  const [cycle, setCycle] = useState('monthly');
  const [planId, setPlanId] = useState('growth'); // most teams land here; Starter is free
  const [inviteInput, setInviteInput] = useState('');
  const [invites, setInvites] = useState([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const addInvite = () => {
    const raw = inviteInput.trim().toLowerCase();
    if (!raw) return;
    if (!EMAIL_RE.test(raw)) { setErr('That does not look like an email.'); return; }
    if (invites.includes(raw)) { setInviteInput(''); return; }
    setInvites((xs) => [...xs, raw]);
    setInviteInput('');
    setErr('');
  };
  const removeInvite = (e) => setInvites((xs) => xs.filter((x) => x !== e));

  const onInviteKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addInvite(); }
  };

  const finish = () => {
    setErr('');
    if (!wsName.trim()) { setErr('Give your workspace a name.'); return; }
    setBusy(true);
    try {
      createWorkspace({
        name: wsName.trim(),
        plan: planId,
        cycle,
        ownerEmail: person.email,
        ownerName: person.name,
      });
      // Fold in any typed-but-not-added email, then send the invites.
      const pending = inviteInput.trim().toLowerCase();
      const all = EMAIL_RE.test(pending) ? [...invites, pending] : invites;
      if (all.length) inviteMembers(all, 'member');
      nav('/onboarding');
    } catch {
      setBusy(false);
      setErr('Something went wrong setting up your workspace. Please try again.');
    }
  };

  return (
    <div className="wc">
      <div className="wc-orbs" aria-hidden><span className="o1" /><span className="o2" /><span className="o3" /></div>
      <div className="wc-grid" aria-hidden />

      <div className="wc-card">
        <div className="wc-brand">
          <span className="wc-mark"><Icon name="zap" size={20} fill="#fff" stroke={0} /></span>
          Rally
        </div>

        <div className="wc-head">
          <div className="wc-eyebrow">Welcome{person.name ? `, ${person.name.split(' ')[0]}` : ''}</div>
          <h1 className="wc-h1">Set up your workspace</h1>
          <p className="wc-sub">Two quick choices and one optional invite. You can change any of this later.</p>
        </div>

        {/* Step 1 - workspace name */}
        <div className="wc-section">
          <label className="wc-label">Workspace name</label>
          <input
            className="wc-input"
            value={wsName}
            onChange={(e) => setWsName(e.target.value)}
            placeholder="Acme Revenue"
            autoComplete="organization"
            maxLength={60}
          />
        </div>

        {/* Step 2 - plan */}
        <div className="wc-section">
          <div className="wc-rowhead">
            <label className="wc-label" style={{ margin: 0 }}>Choose a plan</label>
            <div className="wc-toggle" role="tablist" aria-label="Billing cycle">
              <button type="button" className={cycle === 'monthly' ? 'on' : ''} onClick={() => setCycle('monthly')}>Monthly</button>
              <button type="button" className={cycle === 'annual' ? 'on' : ''} onClick={() => setCycle('annual')}>Annual</button>
            </div>
          </div>
          <div className="wc-plans">
            {PLANS.map((p) => {
              const active = planId === p.id;
              return (
                <button
                  type="button"
                  key={p.id}
                  className={`wc-plan${active ? ' active' : ''}${p.popular ? ' popular' : ''}`}
                  onClick={() => setPlanId(p.id)}
                  aria-pressed={active}
                >
                  {p.popular && <span className="wc-plantag">Popular</span>}
                  <span className="wc-planname">{p.name}</span>
                  <span className="wc-planprice">
                    {priceLabel(p, cycle)}
                    {isPaidPlan(p) && <span className="wc-planunit"> / seat / mo</span>}
                    {!isPaidPlan(p) && !p.custom && <span className="wc-planunit"> forever</span>}
                  </span>
                  <span className="wc-planline">{p.line}</span>
                  <span className="wc-planpick" aria-hidden>
                    <Icon name={active ? 'check' : 'chevronRight'} size={15} stroke={active ? 2.6 : 2} />
                  </span>
                </button>
              );
            })}
          </div>
          <p className="wc-fine">Starter is free forever. Paid plans only charge once Stripe is connected; you will not be billed setting up.</p>
        </div>

        {/* Step 3 - invite (optional) */}
        <div className="wc-section">
          <label className="wc-label">Invite your team <span className="wc-optional">optional</span></label>
          <div className="wc-invite">
            <input
              className="wc-input"
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              onKeyDown={onInviteKey}
              placeholder="teammate@company.com"
              type="email"
              autoComplete="off"
            />
            <button type="button" className="wc-add" onClick={addInvite}><Icon name="plus" size={16} /> Add</button>
          </div>
          {invites.length > 0 && (
            <div className="wc-chips">
              {invites.map((e) => (
                <span className="wc-chip" key={e}>
                  {e}
                  <button type="button" onClick={() => removeInvite(e)} aria-label={`Remove ${e}`}><Icon name="x" size={13} /></button>
                </span>
              ))}
            </div>
          )}
        </div>

        {err && <div className="wc-err">{err}</div>}

        <button className="wc-btn" onClick={finish} disabled={busy}>
          {busy ? <><span className="wc-spin" /> Setting up...</> : <>Create workspace <Icon name="chevronRight" size={18} /></>}
        </button>

        <button className="wc-skip" onClick={() => { createWorkspace({ name: wsName.trim() || defaultWorkspaceName(person.name, person.email), plan: 'starter', cycle, ownerEmail: person.email, ownerName: person.name }); nav('/onboarding'); }}>
          Skip for now, start on Starter
        </button>
      </div>
    </div>
  );
}
