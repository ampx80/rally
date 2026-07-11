// Billing and plans - the in-app plan picker. Monthly / annual toggle, three
// tier cards with the current plan highlighted, a full feature comparison
// matrix, and an upgrade CTA that routes through startCheckout (Stripe when
// configured, local demo upgrade otherwise). Reads the shared catalog in
// src/lib/plans.js so it never drifts from the marketing Pricing page.
// NO em-dash / en-dash. ASCII only.
import React, { useState } from 'react';
import { Card, Button, Badge, SectionHeader, Segmented, useToast } from '../components/UI';
import { Icon } from '../components/icons';
import {
  PLANS, FEATURE_MATRIX, priceLabel, perMonthPrice, ANNUAL_DISCOUNT_LABEL, isPaidPlan,
} from '../lib/plans.js';
import { useBilling } from '../lib/billing.js';

const ACCENT = '#5b4bf5';

/* A single value cell in the feature matrix: check, dash, or a short string. */
function MatrixValue({ value }) {
  if (value === true) {
    return <span className="row center" style={{ color: 'var(--ok)' }}><Icon name="check" size={16} stroke={2.6} /></span>;
  }
  if (value === false || value == null) {
    return <span style={{ display: 'inline-block', width: 12, height: 2, borderRadius: 2, background: 'var(--n-300)' }} />;
  }
  return <span className="fw-6 t-sm">{value}</span>;
}

function PlanCard({ plan, cycle, current, onChoose, busy }) {
  const price = priceLabel(plan, cycle);
  const perMonth = perMonthPrice(plan, cycle);
  const isCurrent = current === plan.id;
  const paid = isPaidPlan(plan);
  const unit = plan.custom
    ? plan.unit
    : plan.monthly === 0
      ? plan.unit
      : cycle === 'annual' ? 'per seat / mo, billed annually' : plan.unit;

  return (
    <div
      className="card"
      style={{
        position: 'relative',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '.9rem',
        border: plan.popular ? `1.5px solid ${ACCENT}` : '1px solid var(--line)',
        boxShadow: plan.popular ? '0 18px 48px -22px rgba(91,75,245,.5)' : 'var(--shadow-sm)',
        background: plan.popular ? 'color-mix(in srgb, var(--accent) 5%, var(--paper))' : 'var(--paper)',
      }}
    >
      {plan.popular && (
        <span style={{ position: 'absolute', top: -11, left: '1.5rem', background: `linear-gradient(100deg, #6d5cf7, #7c5cf7)`, color: '#fff', fontSize: '.72rem', fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', padding: '.2rem .6rem', borderRadius: 999, boxShadow: '0 8px 20px -8px rgba(109,92,247,.8)' }}>
          Most popular
        </span>
      )}

      <div className="row between" style={{ alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{plan.name}</h3>
        {isCurrent && <Badge tone="accent">Current plan</Badge>}
      </div>

      <div className="row" style={{ alignItems: 'flex-end', gap: 6 }}>
        <span className="stat-value" style={{ fontSize: 'clamp(2rem, 4vw, 2.6rem)', lineHeight: 1 }}>{price}</span>
        {paid && perMonth > 0 && <span className="muted t-sm" style={{ paddingBottom: 4 }}>/ seat / mo</span>}
      </div>
      <div className="muted t-sm" style={{ marginTop: -4 }}>{unit}</div>
      <p className="muted" style={{ margin: 0, lineHeight: 1.5 }}>{plan.line}</p>

      <div style={{ borderTop: '1px solid var(--line)', margin: '.2rem 0' }} />

      <ul className="col gap-2" style={{ listStyle: 'none', margin: 0, padding: 0, flex: 1 }}>
        {plan.features.map((f) => (
          <li key={f} className="row gap-2" style={{ alignItems: 'flex-start' }}>
            <span className="row center" style={{ color: ACCENT, flex: 'none', marginTop: 1 }}>
              <Icon name="check" size={15} stroke={2.8} />
            </span>
            <span className="t-sm">{f}</span>
          </li>
        ))}
      </ul>

      <div style={{ marginTop: '.3rem' }}>
        {plan.custom ? (
          <Button as="a" href="/pricing" variant="ghost" style={{ width: '100%', justifyContent: 'center' }}>
            {plan.cta}
          </Button>
        ) : isCurrent ? (
          <Button variant="ghost" disabled style={{ width: '100%', justifyContent: 'center', opacity: .7 }}>
            Your current plan
          </Button>
        ) : !paid ? (
          <Button variant="ghost" onClick={() => onChoose(plan)} style={{ width: '100%', justifyContent: 'center' }}>
            Switch to {plan.name}
          </Button>
        ) : (
          <Button
            variant={plan.popular ? 'primary' : 'accent'}
            onClick={() => onChoose(plan)}
            disabled={busy}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {busy ? 'Starting checkout...' : plan.cta} {!busy && <Icon name="chevronRight" size={16} />}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function BillingPlans() {
  const toast = useToast();
  const billing = useBilling();
  const [cycle, setCycle] = useState(billing.cycle === 'annual' ? 'annual' : 'monthly');
  const [busy, setBusy] = useState('');

  const currentId = billing.planId;

  const choose = async (plan) => {
    if (plan.id === currentId) return;
    if (!isPaidPlan(plan)) {
      // Free / downgrade: apply locally, no checkout.
      billing.setPlanState({ planId: plan.id, cycle, seats: 1, demo: true });
      toast(`Switched to ${plan.name}`);
      return;
    }
    setBusy(plan.id);
    try {
      const res = await billing.startCheckout(plan.id, { cycle, seats: billing.seats || 1 });
      if (res.redirected) return; // browser is navigating to Stripe
      if (res.demo) toast(`Upgraded to ${plan.name} (demo). Add Stripe keys to charge for real.`);
    } finally {
      setBusy('');
    }
  };

  const openPortal = async () => {
    const res = await billing.openPortal();
    if (res.redirected) return;
    toast('Billing portal opens once Stripe is connected.');
  };

  return (
    <div className="fade-up col gap-3">
      <SectionHeader
        title="Billing and plans"
        sub="Pick the plan that fits your team. Change or cancel anytime."
        action={
          <Button variant="ghost" size="sm" onClick={openPortal}>
            <Icon name="receipt" size={15} /> Manage billing
          </Button>
        }
      />

      {/* Current plan banner */}
      <Card className="row between wrap gap-3" style={{ alignItems: 'center' }}>
        <div className="row gap-3" style={{ alignItems: 'center', minWidth: 0 }}>
          <span className="row center" style={{ width: 44, height: 44, borderRadius: 12, background: `color-mix(in srgb, ${ACCENT} 14%, transparent)`, color: ACCENT, flex: 'none' }}>
            <Icon name="dollar" size={22} />
          </span>
          <div className="col" style={{ minWidth: 0, gap: 2 }}>
            <span className="fw-7" style={{ fontSize: '1.05rem' }}>
              You are on {billing.plan?.name}
              {billing.demo && <Badge className="t-xs" style={{ marginLeft: 8 }}>Demo</Badge>}
            </span>
            <span className="muted t-sm">
              {isPaidPlan(billing.plan)
                ? `${priceLabel(billing.plan, billing.cycle)} per seat / mo, billed ${billing.cycle === 'annual' ? 'annually' : 'monthly'}.`
                : 'The free forever plan. Upgrade when your team is ready.'}
            </span>
          </div>
        </div>
        <div className="row gap-2" style={{ flex: 'none', alignItems: 'center' }}>
          <span className="muted t-sm hide-520">Billing cycle</span>
          <Segmented
            options={[{ value: 'monthly', label: 'Monthly' }, { value: 'annual', label: 'Annual' }]}
            value={cycle}
            onChange={setCycle}
          />
          {cycle === 'annual' && <Badge tone="ok" className="t-xs">{ANNUAL_DISCOUNT_LABEL}</Badge>}
        </div>
      </Card>

      {/* Tier cards */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.15rem' }}>
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            cycle={cycle}
            current={currentId}
            onChoose={choose}
            busy={busy === plan.id}
          />
        ))}
      </div>

      <p className="muted t-xs" style={{ textAlign: 'center', margin: 0 }}>
        Pricing is illustrative for this preview. Live charges require Stripe keys on the server.
      </p>

      {/* Feature comparison matrix */}
      <Card pad={false}>
        <div className="col gap-1" style={{ padding: '1.15rem 1.4rem', borderBottom: '1px solid var(--line)' }}>
          <h4 style={{ margin: 0 }}>Compare every feature</h4>
          <span className="muted t-sm">The full breakdown, side by side.</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
            <thead>
              <tr>
                <th style={{ padding: '.75rem 1.4rem', textAlign: 'left', position: 'sticky', left: 0, background: 'var(--paper)' }}></th>
                {PLANS.map((p) => (
                  <th key={p.id} style={{ padding: '.75rem 1rem', textAlign: 'center', minWidth: 120 }}>
                    <div className="col center" style={{ gap: 2 }}>
                      <span className="fw-7">{p.name}</span>
                      <span className="t-xs muted">{priceLabel(p, cycle)}{isPaidPlan(p) ? ' / seat' : ''}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURE_MATRIX.map((section) => (
                <React.Fragment key={section.group}>
                  <tr>
                    <td colSpan={PLANS.length + 1} style={{ padding: '.7rem 1.4rem .3rem', background: 'color-mix(in srgb, var(--n-500) 5%, var(--paper))' }}>
                      <span className="eyebrow" style={{ margin: 0 }}>{section.group}</span>
                    </td>
                  </tr>
                  {section.rows.map((row) => (
                    <tr key={row.label} style={{ borderTop: '1px solid var(--line)' }}>
                      <td style={{ padding: '.65rem 1.4rem', position: 'sticky', left: 0, background: 'var(--paper)' }}>
                        <span className="fw-6 t-sm">{row.label}</span>
                      </td>
                      <td style={{ padding: '.55rem 1rem', textAlign: 'center' }}><MatrixValue value={row.starter} /></td>
                      <td style={{ padding: '.55rem 1rem', textAlign: 'center' }}><MatrixValue value={row.growth} /></td>
                      <td style={{ padding: '.55rem 1rem', textAlign: 'center' }}><MatrixValue value={row.enterprise} /></td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
