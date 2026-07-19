// Security - the workspace security console. Two-factor policy, authenticator
// app (TOTP) enrollment per account, and account 2FA status at a glance.
// Enrollment uses the real local TOTP engine (src/lib/auth-local.js): scan or
// paste the setup key into Google Authenticator / Authy / 1Password, confirm a
// code, save recovery codes. Admin surfaces are gated by the workspace RBAC
// engine (can('users.manage')). NO em-dash / en-dash. ASCII hyphen only.
import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { SectionHeader, Card, Button, Badge, StatCard, useToast } from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import { can } from '../lib/rbac.js';
import {
  useAuth, getPolicy, setEnforce2faForAdmins, beginEnroll2fa, confirmEnroll2fa, disable2fa,
  regenerateRecoveryCodes,
} from '../lib/auth-local.js';
import { useAuthLog, authEventMeta, methodLabel, clearAuthLog } from '../lib/auth-log.js';

const timeAgo = (iso) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
};

// Group a base32 secret into readable quads for manual entry.
const groupSecret = (s) => String(s || '').replace(/(.{4})/g, '$1 ').trim();

export default function Security() {
  const { accounts, policy } = useAuth(s => ({ accounts: s.accounts, policy: s.policy }));
  const log = useAuthLog();
  const toast = useToast();
  const manage = can('users.manage');
  const [enroll, setEnroll] = useState(null); // { accountId, secret, uri }
  const [code, setCode] = useState('');
  const [recovery, setRecovery] = useState(null); // { accountId, codes }
  const [qr, setQr] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const enrolled = accounts.filter(a => a.twofa?.enabled).length;

  // Render the otpauth URI to a scannable QR (fully offline, no network).
  useEffect(() => {
    if (!enroll?.uri) { setQr(''); return; }
    let live = true;
    QRCode.toDataURL(enroll.uri, { margin: 1, width: 200, color: { dark: '#0d1117', light: '#ffffff' } })
      .then(url => { if (live) setQr(url); }).catch(() => { if (live) setQr(''); });
    return () => { live = false; };
  }, [enroll?.uri]);

  const downloadCodes = (codes) => {
    const text = `Ardovo recovery codes\nSaved ${new Date().toLocaleString()}\n\n${codes.join('\n')}\n\nEach code works once if you lose your authenticator. Keep them somewhere safe.`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = 'ardovo-recovery-codes.txt';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    toast('Recovery codes downloaded');
  };
  const regen = (a) => {
    if (!window.confirm(`Generate new recovery codes for ${a.email}? The old codes stop working right away.`)) return;
    const r = regenerateRecoveryCodes(a.id);
    if (!r.ok) { toast(r.error); return; }
    setRecovery({ accountId: a.id, codes: r.recoveryCodes });
    toast('New recovery codes generated. Save them.');
  };

  const startEnroll = (a) => {
    const r = beginEnroll2fa(a.id);
    if (!r) return;
    setEnroll({ accountId: a.id, email: a.email, ...r }); setCode(''); setErr(''); setRecovery(null);
  };
  const confirm = async () => {
    setBusy(true); setErr('');
    try {
      const r = await confirmEnroll2fa(enroll.accountId, enroll.secret, code);
      if (!r.ok) { setErr(r.error); return; }
      setRecovery({ accountId: enroll.accountId, codes: r.recoveryCodes });
      setEnroll(null); setCode('');
      toast('Two-factor enabled. Save the recovery codes.');
    } finally { setBusy(false); }
  };
  const turnOff = (a) => {
    if (!window.confirm(`Turn off 2FA for ${a.email}?`)) return;
    disable2fa(a.id); toast('Two-factor disabled.');
  };
  const copy = (t) => { try { navigator.clipboard.writeText(t); toast('Copied'); } catch {} };

  return (
    <div className="fade-up">
      <SectionHeader
        title="Security"
        sub="Two-factor authentication and account protection for the workspace. Turn on an authenticator-app requirement for admins in one switch."
      />

      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', marginBottom: '1.25rem' }}>
        <StatCard label="Accounts" value={accounts.length} icon={<Icon name="users" size={18} />} />
        <StatCard label="2FA enabled" value={enrolled} icon={<Icon name="lock" size={18} />} accent="var(--ok)" />
        <StatCard label="2FA coverage" value={accounts.length ? Math.round((enrolled / accounts.length) * 100) : 0} format={n => `${Math.round(n)}%`} icon={<Icon name="shield" size={18} />} />
        <StatCard label="Admin enforcement" value={policy.enforce2faForAdmins ? 1 : 0} format={n => (n ? 'On' : 'Off')} icon={<Icon name="roleShield" size={18} />} accent="var(--ai)" />
      </div>

      {/* Policy */}
      <Card style={{ marginBottom: '1.25rem' }}>
        <div className="row between wrap" style={{ gap: '1rem', alignItems: 'center' }}>
          <div className="col gap-1" style={{ minWidth: 0 }}>
            <div className="fw-6" style={{ color: 'var(--ink)' }}>Require 2FA for admins</div>
            <div className="t-sm muted" style={{ maxWidth: 520 }}>When on, any admin must set up an authenticator app before they can reach the app. Recommended for every real workspace.</div>
          </div>
          <Toggle on={!!policy.enforce2faForAdmins} disabled={!manage} onChange={v => { setEnforce2faForAdmins(v); toast(v ? 'Admins now require 2FA' : 'Admin 2FA requirement off'); }} />
        </div>
      </Card>

      {/* Enrollment flow */}
      {enroll && (
        <Card style={{ marginBottom: '1.25rem', borderColor: 'var(--ai)' }}>
          <div className="fw-6" style={{ color: 'var(--ink)', marginBottom: '.3rem' }}>Set up authenticator for {enroll.email}</div>
          <div className="t-sm muted" style={{ marginBottom: '1rem' }}>Scan the QR with Google Authenticator, Authy, or 1Password, then enter the 6-digit code it shows. Tip: 1Password stores the key in your vault, so a new phone never locks you out.</div>
          <div className="sec-enroll">
            <div className="sec-qr">
              {qr ? <img src={qr} alt="Scan this QR code with your authenticator app" width={168} height={168} /> : <div className="sec-qr-ph"><Icon name="shield" size={26} /></div>}
              <span className="t-xs muted">Scan to add</span>
            </div>
            <div className="sec-enroll-manual">
              <div className="sec-key">
                <div className="sec-key-label">Can't scan? Enter this key</div>
                <div className="sec-key-val">{groupSecret(enroll.secret)}</div>
                <button className="btn btn-ghost btn-sm" onClick={() => copy(enroll.secret)}><Icon name="copy" size={14} /> Copy key</button>
              </div>
              <div className="sec-uri">
                <span className="t-xs muted">Or paste this setup URI:</span>
                <code className="sec-uri-code">{enroll.uri}</code>
                <button className="btn btn-ghost btn-sm" onClick={() => copy(enroll.uri)}><Icon name="copy" size={14} /> Copy URI</button>
              </div>
            </div>
          </div>
          <div className="row gap-2" style={{ marginTop: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <label className="col gap-1">
              <span className="t-sm fw-6" style={{ color: 'var(--ink)' }}>6-digit code</span>
              <input value={code} onChange={e => setCode(e.target.value)} placeholder="123456" inputMode="numeric" className="sec-code" />
            </label>
            <Button variant="primary" onClick={confirm} disabled={busy || code.replace(/\s/g, '').length < 6}><Icon name="check" size={15} /> {busy ? 'Verifying...' : 'Verify + enable'}</Button>
            <Button variant="ghost" onClick={() => { setEnroll(null); setErr(''); }}>Cancel</Button>
          </div>
          {err && <div className="sec-err"><Icon name="activity" size={14} /> {err}</div>}
        </Card>
      )}

      {/* Recovery codes (shown once) */}
      {recovery && (
        <Card style={{ marginBottom: '1.25rem', borderColor: 'var(--ok)' }}>
          <div className="fw-6" style={{ color: 'var(--ink)' }}>Recovery codes</div>
          <div className="t-sm muted" style={{ margin: '.3rem 0 .8rem' }}>Save these somewhere safe. Each works once if you lose your device. They will not be shown again.</div>
          <div className="sec-recovery">{recovery.codes.map(c => <span key={c} className="sec-recovery-code">{c}</span>)}</div>
          <div className="row gap-2" style={{ marginTop: '.8rem', flexWrap: 'wrap' }}>
            <Button variant="primary" size="sm" onClick={() => downloadCodes(recovery.codes)}><Icon name="download" size={14} /> Download</Button>
            <Button variant="ghost" size="sm" onClick={() => copy(recovery.codes.join('\n'))}><Icon name="copy" size={14} /> Copy all</Button>
            <Button variant="ghost" size="sm" onClick={() => setRecovery(null)}>Done, saved</Button>
          </div>
        </Card>
      )}

      {/* Accounts */}
      <Card>
        <div className="fw-6" style={{ color: 'var(--ink)', marginBottom: '.7rem' }}>Accounts</div>
        <div className="col gap-2">
          {accounts.map(a => (
            <div key={a.id} className="row between wrap sec-acct" style={{ gap: '.6rem', alignItems: 'center' }}>
              <div className="col gap-1" style={{ minWidth: 0 }}>
                <span className="fw-6" style={{ color: 'var(--ink)' }}>{a.name || a.email}</span>
                <span className="t-sm muted">{a.email}</span>
                {a.twofa?.enabled && (
                  <span className={`t-xs ${(a.twofa.recoveryCodes || []).length <= 2 ? 'sec-low' : 'muted'}`}>
                    {(a.twofa.recoveryCodes || []).length} recovery code{(a.twofa.recoveryCodes || []).length === 1 ? '' : 's'} left
                    {(a.twofa.recoveryCodes || []).length <= 2 && ' - regenerate to stay safe'}
                  </span>
                )}
              </div>
              <div className="row gap-2" style={{ alignItems: 'center', flex: 'none', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {a.twofa?.enabled
                  ? <Badge tone="ok">2FA on</Badge>
                  : <Badge tone="warn">2FA off</Badge>}
                {a.twofa?.enabled && <Button size="sm" variant="ghost" disabled={!manage} onClick={() => regen(a)}><Icon name="key" size={14} /> Recovery codes</Button>}
                {a.twofa?.enabled
                  ? <Button size="sm" variant="ghost" disabled={!manage} onClick={() => turnOff(a)}><Icon name="lock" size={14} /> Disable</Button>
                  : <Button size="sm" variant="primary" disabled={!manage} onClick={() => startEnroll(a)}><Icon name="shield" size={14} /> Set up</Button>}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Security activity log */}
      <Card style={{ marginTop: '1.25rem' }}>
        <div className="row between" style={{ alignItems: 'center', marginBottom: '.7rem' }}>
          <div className="col gap-1" style={{ minWidth: 0 }}>
            <div className="fw-6" style={{ color: 'var(--ink)' }}>Recent security activity</div>
            <div className="t-sm muted">Sign-ins, 2FA changes, and recovery-code use. Your audit trail, always visible.</div>
          </div>
          {log.length > 0 && manage && (
            <Button size="sm" variant="ghost" onClick={() => { if (window.confirm('Clear the security activity log?')) { clearAuthLog(); toast('Activity log cleared'); } }}>Clear</Button>
          )}
        </div>
        {log.length === 0 ? (
          <div className="sec-empty"><Icon name="shield" size={22} /><span>No activity yet. Sign-ins and security changes will appear here.</span></div>
        ) : (
          <div className="col gap-1">
            {log.slice(0, 12).map(e => {
              const m = authEventMeta(e.type);
              return (
                <div key={e.id} className="sec-logrow">
                  <span className={`sec-log-ic tone-${m.tone}`}><Icon name={m.icon} size={15} /></span>
                  <span className="sec-log-label">{m.label}{e.type === 'signin' && e.method ? ` with ${methodLabel(e.method)}` : ''}</span>
                  {e.email && <span className="sec-log-email">{e.email}</span>}
                  <span className="sec-log-time">{timeAgo(e.at)}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <SecurityStyles />
    </div>
  );
}

function Toggle({ on, onChange, disabled }) {
  return (
    <button type="button" disabled={disabled} onClick={() => onChange(!on)} style={{ background: 'transparent', border: 'none', cursor: disabled ? 'default' : 'pointer', padding: 0, opacity: disabled ? .5 : 1 }} aria-pressed={on}>
      <span style={{ position: 'relative', display: 'block', width: 46, height: 26, borderRadius: 999, background: on ? 'var(--accent)' : 'var(--n-400, #98a1b0)', transition: 'background .2s' }}>
        <span style={{ position: 'absolute', top: 3, left: on ? 23 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.3)' }} />
      </span>
    </button>
  );
}

function SecurityStyles() {
  return (
    <style>{`
    .sec-enroll { display: flex; gap: 20px; align-items: flex-start; flex-wrap: wrap; }
    .sec-enroll-manual { flex: 1; min-width: 240px; }
    .sec-qr { flex: none; display: flex; flex-direction: column; align-items: center; gap: 6px; }
    .sec-qr img { border-radius: 12px; border: 1px solid var(--line); padding: 8px; background: #fff; }
    .sec-qr-ph { width: 168px; height: 168px; border-radius: 12px; border: 1px dashed var(--line-strong); display: grid; place-items: center; color: var(--n-500); background: var(--n-25); }
    .sec-low { color: var(--warn, #e8973a); font-weight: 700; }
    .sec-key { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; background: var(--n-25); border: 1px solid var(--line); border-radius: 12px; padding: 14px 16px; }
    .sec-key-label { font-size: 11.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: var(--n-600); }
    .sec-key-val { font-family: ui-monospace, Menlo, monospace; font-size: 18px; font-weight: 700; letter-spacing: .1em; color: var(--ink); flex: 1; min-width: 180px; }
    .sec-uri { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
    .sec-uri-code { flex: 1; min-width: 220px; font-family: ui-monospace, Menlo, monospace; font-size: 12px; color: var(--n-600); background: var(--n-25); border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .sec-code { border: 1px solid var(--line-strong); border-radius: 10px; padding: 10px 14px; font-size: 20px; font-family: ui-monospace, Menlo, monospace; letter-spacing: .3em; width: 150px; text-align: center; outline: none; color: var(--ink); background: var(--paper); }
    .sec-code:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(14,159,143,.15); }
    .sec-err { display: flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 600; color: var(--risk); margin-top: 10px; }
    .sec-recovery { display: flex; flex-wrap: wrap; gap: 8px; }
    .sec-recovery-code { font-family: ui-monospace, Menlo, monospace; font-size: 13.5px; font-weight: 700; color: var(--ink); background: var(--n-25); border: 1px dashed var(--line-strong); border-radius: 8px; padding: 7px 11px; }
    .sec-acct { border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; }
    .sec-empty { display: flex; align-items: center; gap: 10px; color: var(--n-500); font-size: 13.5px; padding: 14px; border: 1px dashed var(--line); border-radius: 12px; }
    .sec-empty svg { color: var(--n-400); }
    .sec-logrow { display: flex; align-items: center; gap: 10px; padding: 9px 4px; border-bottom: 1px solid var(--line); }
    .sec-logrow:last-child { border-bottom: none; }
    .sec-log-ic { width: 28px; height: 28px; flex: none; border-radius: 8px; display: grid; place-items: center; background: var(--n-25); color: var(--n-600); }
    .sec-log-ic.tone-ok { background: rgba(14,159,143,.12); color: var(--ok, #0e9f8f); }
    .sec-log-ic.tone-warn { background: rgba(232,151,58,.14); color: var(--warn, #e8973a); }
    .sec-log-label { font-size: 13.5px; font-weight: 600; color: var(--ink); }
    .sec-log-email { font-size: 12.5px; color: var(--n-600); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .sec-log-time { margin-left: auto; flex: none; font-size: 12px; color: var(--n-500); }
    `}</style>
  );
}
