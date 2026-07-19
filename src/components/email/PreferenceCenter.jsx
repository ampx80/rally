// ============================================================
// PreferenceCenter - a live preview of the hosted preference page a
// recipient lands on from an email footer, plus the one-click
// unsubscribe an inbox triggers via the RFC 8058 List-Unsubscribe /
// List-Unsubscribe-Post headers (already emitted by api/broadcast.js
// and api/marketing-cron.js). Operators can preview any recipient's
// subscription state, toggle topics, and exercise one-click
// unsubscribe / resubscribe. Backed by deliverability-store.js, which
// mirrors changes into the suppression list so a real opt-out is
// honored on the next send.
//
// ASCII only. NO em-dash / en-dash.
// ============================================================
import React, { useMemo, useState } from 'react';
import { Card, Badge, Button, Input, EmptyState, useToast } from '../UI.jsx';
import { Icon } from '../icons.jsx';
import { getContacts, contactName } from '../../lib/store.js';
import {
  useDeliverability, PREFERENCE_TOPICS, getPreferences,
  setPreference, unsubscribeAll, resubscribeAll,
} from './deliverability-store.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Toggle({ on, onClick, disabled }) {
  return (
    <button onClick={onClick} role="switch" aria-checked={on} disabled={disabled} className="row"
      style={{
        width: 44, height: 24, borderRadius: 999, padding: 2, flex: 'none', border: 'none',
        background: on ? 'var(--accent)' : 'var(--n-200)', cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1, transition: 'background .2s var(--ease)', justifyContent: 'flex-start',
      }}>
      <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: 'var(--shadow-sm)', transform: on ? 'translateX(20px)' : 'translateX(0)', transition: 'transform .2s var(--ease)' }} />
    </button>
  );
}

export default function PreferenceCenter() {
  useDeliverability();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [email, setEmail] = useState('');

  // Suggest real contacts with emails so the preview targets a real recipient.
  const suggestions = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return getContacts()
      .filter(c => EMAIL_RE.test((c.email || '').trim()))
      .filter(c => contactName(c).toLowerCase().includes(needle) || (c.email || '').toLowerCase().includes(needle))
      .slice(0, 6);
  }, [q]);

  const target = EMAIL_RE.test(email.trim().toLowerCase()) ? email.trim().toLowerCase() : null;
  const prefs = target ? getPreferences(target) : null;

  const pick = (c) => { setEmail(c.email); setQ(''); };

  const toggleTopic = (topicId, on) => { if (target) { setPreference(target, topicId, on); } };

  const doUnsub = async () => {
    const r = await unsubscribeAll(target);
    if (r && r.error) return toast('Enter a valid email first', 'risk');
    toast('Unsubscribed - added to suppression, honored on next send');
  };
  const doResub = async () => { await resubscribeAll(target); toast('Resubscribed - removed from suppression'); };

  return (
    <div className="col gap-3">
      <Card className="col gap-2">
        <div className="fw-7 row gap-2" style={{ alignItems: 'center' }}><Icon name="settings" size={16} /> Preference center</div>
        <div className="t-sm muted">
          This is what a recipient sees from the footer link. Ardovo also emits the RFC 8058 one-click headers
          (<code className="tnum">List-Unsubscribe</code> + <code className="tnum">List-Unsubscribe-Post: List-Unsubscribe=One-Click</code>),
          so Gmail and Apple Mail show a native Unsubscribe button that opts a recipient out without ever opening this page.
        </div>
        <div className="row gap-2 wrap" style={{ alignItems: 'center' }}>
          <Input placeholder="Recipient email or search a contact..." value={email || q}
            onChange={e => { setEmail(''); setQ(e.target.value); if (EMAIL_RE.test(e.target.value.trim())) setEmail(e.target.value.trim()); }}
            style={{ maxWidth: 340 }} />
        </div>
        {suggestions.length > 0 && (
          <div className="row gap-2 wrap">
            {suggestions.map(c => (
              <Button key={c.id} variant="quiet" size="sm" onClick={() => pick(c)}><Icon name="user" size={13} /> {contactName(c)}</Button>
            ))}
          </div>
        )}
      </Card>

      {!target ? (
        <Card><EmptyState icon="⚙️" title="Preview a recipient" body="Enter an email or search a contact to see their subscription preferences and exercise one-click unsubscribe." /></Card>
      ) : (
        <Card className="col gap-3" style={{ maxWidth: 560 }}>
          <div className="col gap-1">
            <div className="fw-7">Email preferences</div>
            <div className="t-sm muted">Managing preferences for <span className="fw-6" style={{ color: 'var(--ink)' }}>{target}</span></div>
          </div>

          {prefs.unsubscribedAll && (
            <div className="row gap-2" style={{ alignItems: 'center', background: 'var(--n-50)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '.6rem .8rem' }}>
              <Badge tone="warn">Unsubscribed from all</Badge>
              <span className="t-sm muted">On the suppression list. No marketing mail will send.</span>
            </div>
          )}

          <div className="col gap-2">
            {PREFERENCE_TOPICS.map(t => {
              const on = !prefs.unsubscribedAll && prefs.topics[t.id];
              return (
                <div key={t.id} className="row between gap-3" style={{ alignItems: 'center', padding: '.5rem 0', borderBottom: '1px solid var(--line)' }}>
                  <div className="col" style={{ minWidth: 0 }}>
                    <span className="fw-6">{t.label}</span>
                    <span className="t-xs muted">{t.hint}</span>
                  </div>
                  <Toggle on={on} disabled={prefs.unsubscribedAll} onClick={() => toggleTopic(t.id, !prefs.topics[t.id])} />
                </div>
              );
            })}
          </div>

          <div className="row gap-2 wrap" style={{ marginTop: '.25rem' }}>
            {prefs.unsubscribedAll
              ? <Button variant="primary" size="sm" onClick={doResub}><Icon name="check" size={14} /> Resubscribe</Button>
              : <Button variant="ghost" size="sm" onClick={doUnsub}><Icon name="flag" size={14} /> Unsubscribe from all</Button>}
          </div>
        </Card>
      )}
    </div>
  );
}
