// Connected mailboxes: validation, default handling, upsert, remove, test.
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getMailboxes, getDefaultMailbox, addMailbox, setDefaultMailbox,
  updateMailbox, removeMailbox, testMailbox, providerMeta,
  PROVIDERS, SMTP_PRESETS,
} from '../lib/mailboxes.js';

beforeEach(() => {
  // No resetMailboxes() is exported and jsdom localStorage is non-durable here,
  // so wipe the in-memory rows left by a prior test to isolate each case.
  for (const m of [...getMailboxes()]) removeMailbox(m.id);
});

describe('provider metadata', () => {
  it('exposes google, microsoft, smtp and falls back to smtp for unknowns', () => {
    expect(Object.keys(PROVIDERS)).toEqual(expect.arrayContaining(['google', 'microsoft', 'smtp']));
    expect(providerMeta('google').oauth).toBe(true);
    expect(providerMeta('smtp').oauth).toBe(false);
    expect(providerMeta('nope').id).toBe('smtp');
  });
  it('ships common SMTP presets', () => {
    expect(SMTP_PRESETS.find(p => p.id === 'gmail').host).toBe('smtp.gmail.com');
  });
});

describe('addMailbox validation', () => {
  it('rejects an invalid email', () => {
    expect(addMailbox({ provider: 'google', email: 'not-an-email' }).error).toBe('email');
  });
  it('requires host, port and username for SMTP', () => {
    expect(addMailbox({ provider: 'smtp', email: 'a@b.com' }).error).toBe('host');
    expect(addMailbox({ provider: 'smtp', email: 'a@b.com', smtp: { host: 'h' } }).error).toBe('port');
    expect(addMailbox({ provider: 'smtp', email: 'a@b.com', smtp: { host: 'h', port: 587 } }).error).toBe('username');
  });
  it('masks the SMTP password before persisting', () => {
    const r = addMailbox({ provider: 'smtp', email: 'a@b.com', smtp: { host: 'h', port: 587, username: 'u', password: 'secret' } });
    expect(r.mailbox.smtp.password).toBe('********');
  });
});

describe('default handling', () => {
  it('the first connected mailbox becomes the default', () => {
    const r = addMailbox({ provider: 'google', email: 'first@x.com' });
    expect(r.mailbox.isDefault).toBe(true);
    expect(getDefaultMailbox().id).toBe(r.mailbox.id);
  });
  it('a second mailbox is not default', () => {
    addMailbox({ provider: 'google', email: 'first@x.com' });
    const second = addMailbox({ provider: 'microsoft', email: 'second@x.com' });
    expect(second.mailbox.isDefault).toBe(false);
  });
  it('setDefaultMailbox moves the default flag exclusively', () => {
    const a = addMailbox({ provider: 'google', email: 'a@x.com' }).mailbox;
    const b = addMailbox({ provider: 'microsoft', email: 'b@x.com' }).mailbox;
    setDefaultMailbox(b.id);
    const boxes = getMailboxes();
    expect(boxes.find(m => m.id === b.id).isDefault).toBe(true);
    expect(boxes.filter(m => m.isDefault)).toHaveLength(1);
    expect(boxes.find(m => m.id === a.id).isDefault).toBe(false);
  });
});

describe('upsert + remove', () => {
  it('re-adding the same email+provider upserts rather than duplicating', () => {
    const first = addMailbox({ provider: 'google', email: 'dup@x.com', displayName: 'One' });
    const again = addMailbox({ provider: 'google', email: 'dup@x.com', displayName: 'Two' });
    expect(again.mailbox.id).toBe(first.mailbox.id);
    expect(getMailboxes()).toHaveLength(1);
    expect(again.mailbox.displayName).toBe('Two');
  });
  it('removing the default promotes another mailbox to default', () => {
    const a = addMailbox({ provider: 'google', email: 'a@x.com' }).mailbox;
    addMailbox({ provider: 'microsoft', email: 'b@x.com' });
    removeMailbox(a.id);
    expect(getMailboxes()).toHaveLength(1);
    expect(getDefaultMailbox().isDefault).toBe(true);
  });
  it('updateMailbox patches a field', () => {
    const a = addMailbox({ provider: 'google', email: 'a@x.com' }).mailbox;
    updateMailbox(a.id, { status: 'error' });
    expect(getMailboxes()[0].status).toBe('error');
  });
});

describe('testMailbox', () => {
  it('fails for a missing mailbox', () => {
    expect(testMailbox('mb_missing').ok).toBe(false);
  });
  it('passes for a connected OAuth mailbox and stamps lastSyncAt', () => {
    const a = addMailbox({ provider: 'google', email: 'a@x.com' }).mailbox;
    const res = testMailbox(a.id);
    expect(res.ok).toBe(true);
    expect(getMailboxes()[0].lastSyncAt).toBeTruthy();
  });
});
