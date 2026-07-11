// Invite-teammates step. A friendly email chip entry: type an address, press
// Enter or comma to add it, click x to remove. Validates loosely and dedupes.
// Controlled via `emails` + `onChange`. This is demo-grade capture (no email is
// actually sent from the wizard); it records intent for the checklist and a
// future team-invite API. NO em-dash / en-dash.
import React, { useState } from 'react';
import { Icon } from '../icons.jsx';
import { Button } from '../UI.jsx';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function InviteTeam({ emails = [], onChange }) {
  const [draft, setDraft] = useState('');
  const [err, setErr] = useState('');

  const add = (raw) => {
    const parts = String(raw).split(/[,\s]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
    if (!parts.length) return;
    const bad = parts.find(p => !EMAIL_RE.test(p));
    if (bad) { setErr(`"${bad}" is not a valid email.`); return; }
    setErr('');
    const next = Array.from(new Set([...emails, ...parts]));
    onChange?.(next);
    setDraft('');
  };

  const remove = (e) => onChange?.(emails.filter(x => x !== e));

  const onKey = (ev) => {
    if (ev.key === 'Enter' || ev.key === ',') { ev.preventDefault(); add(draft); }
    else if (ev.key === 'Backspace' && !draft && emails.length) { remove(emails[emails.length - 1]); }
  };

  return (
    <div className="col gap-2" style={{ marginTop: '1.3rem' }}>
      <div className="ob-invite-row">
        <input
          className="input"
          value={draft}
          onChange={(e) => { setDraft(e.target.value); setErr(''); }}
          onKeyDown={onKey}
          onBlur={() => draft && add(draft)}
          placeholder="teammate@company.com"
          type="email"
          autoComplete="off"
          spellCheck={false}
          style={{ flex: 1 }}
        />
        <Button variant="ghost" onClick={() => add(draft)} disabled={!draft.trim()}>
          <Icon name="plus" size={16} /> Add
        </Button>
      </div>
      {err && <div className="t-sm" style={{ color: 'var(--risk)' }}>{err}</div>}

      {emails.length > 0 && (
        <div className="row gap-2 wrap" style={{ marginTop: '.35rem' }}>
          {emails.map(e => (
            <span key={e} className="ob-chip">
              <Icon name="mail" size={13} /> {e}
              <button onClick={() => remove(e)} aria-label={`Remove ${e}`}><Icon name="x" size={13} /></button>
            </span>
          ))}
        </div>
      )}

      <div className="row gap-2" style={{ marginTop: '.4rem', color: 'var(--n-600)' }}>
        <Icon name="users" size={15} />
        <span className="t-sm">
          {emails.length === 0
            ? 'Add a few teammates now, or invite them later from Team settings.'
            : `${emails.length} teammate${emails.length === 1 ? '' : 's'} ready to invite.`}
        </span>
      </div>
    </div>
  );
}
