// src/components/outreach/DraftWithAI.jsx
//
// A reusable "Draft with AI" button + review modal. Drop it next to any
// compose surface that has a contact and/or deal in hand. It gathers context
// from the records you pass, asks Rook (via src/lib/outreach.js -> the
// /api/outreach-draft endpoint) for a personalized draft in the rep voice,
// and lets the rep pick a tone, add a one-line instruction, regenerate, edit,
// then Use or Copy the result.
//
//   <DraftWithAI contact={c} onUse={(draft) => setBody(draft.body)} />
//   <DraftWithAI deal={deal} company={company} contact={primaryContact}
//                channel="email" onUse={(draft) => {...}} />
//
// Props:
//   contact, deal, company   Ardovo records (any subset). Deal-first if both.
//   sender                   defaults to getCurrentUser()
//   channel                  'email' | 'message'   (default 'email')
//   goal                     optional one-liner ("follow up after the demo")
//   onUse(draft)             called with { subject?, body } when the rep clicks
//                            "Use this draft". If omitted, Use copies instead.
//   label, variant, size     button styling (defaults: 'Draft with AI','accent','sm')
//
// Additive + self-contained: never mutates the store, safe without any env
// (the endpoint returns a deterministic template offline). ASCII only.

import React, { useEffect, useRef, useState } from 'react';
import { Button, Modal, Field, Input, Textarea, Badge, useToast } from '../UI.jsx';
import { Icon } from '../icons.jsx';
import { getCurrentUser } from '../../lib/store.js';
import { draftOutreach, contextFromContact, contextFromDeal, TONES } from '../../lib/outreach.js';

export default function DraftWithAI({
  contact, deal, company, sender,
  channel = 'email', goal = '',
  onUse, label = 'Draft with AI',
  variant = 'accent', size = 'sm',
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [tone, setTone] = useState('warm');
  const [instructions, setInstructions] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState(null);
  const genSeq = useRef(0);          // guards against out-of-order responses
  const isEmail = channel !== 'message';

  const buildContext = () => {
    const snd = sender || getCurrentUser() || undefined;
    if (deal) return contextFromDeal(deal, { company, contact, sender: snd, goal });
    return contextFromContact(contact || {}, { company, deal, sender: snd, goal });
  };

  const generate = async (nextTone = tone) => {
    const seq = ++genSeq.current;
    setLoading(true);
    const res = await draftOutreach({
      channel, tone: nextTone, context: buildContext(), instructions: instructions.trim(),
    });
    if (seq !== genSeq.current) return;   // a newer request already won
    const d = res?.draft || {};
    setSubject(d.subject || '');
    setBodyText(d.body || '');
    setSource(res?.source || null);
    setLoading(false);
  };

  // Auto-draft the first time the modal opens (if nothing is drafted yet).
  useEffect(() => {
    if (open && !bodyText && !loading) generate(tone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const pickTone = (t) => { setTone(t); generate(t); };

  const composed = isEmail && subject ? `Subject: ${subject}\n\n${bodyText}` : bodyText;
  const copy = async () => {
    try { await navigator.clipboard.writeText(composed); toast('Draft copied to clipboard'); }
    catch { toast('Copy failed - select the text manually', 'warn'); }
  };
  const use = () => {
    if (typeof onUse === 'function') {
      onUse(isEmail ? { subject, body: bodyText } : { body: bodyText });
      toast('Draft added');
      setOpen(false);
    } else {
      copy();
    }
  };

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        <Icon name="sparkles" size={15} /> {label}
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Draft with AI"
        width={640}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
            <Button variant="quiet" onClick={copy} disabled={loading || !bodyText}>
              <Icon name="copy" size={15} /> Copy
            </Button>
            <Button variant="primary" onClick={use} disabled={loading || !bodyText}>
              <Icon name="check" size={16} /> {onUse ? 'Use this draft' : 'Use (copy)'}
            </Button>
          </>
        }
      >
        <div className="col gap-3">
          {/* Tone chips */}
          <Field label="Tone">
            <div className="row gap-1 wrap">
              {TONES.map(t => {
                const on = t.key === tone;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => pickTone(t.key)}
                    disabled={loading}
                    className="btn btn-sm"
                    style={{
                      background: on ? 'var(--accent)' : 'var(--n-100)',
                      color: on ? '#fff' : 'var(--n-600)',
                      fontWeight: on ? 700 : 600,
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </Field>

          {/* Optional steer + regenerate */}
          <Field label="Add an instruction" hint="Optional. Steer the next draft, e.g. mention the pilot pricing.">
            <div className="row gap-1">
              <Input
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                placeholder="Optional instruction..."
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); generate(tone); } }}
                style={{ flex: 1 }}
              />
              <Button variant="ghost" onClick={() => generate(tone)} disabled={loading}>
                <Icon name="rotateCcw" size={15} /> {loading ? 'Drafting...' : 'Regenerate'}
              </Button>
            </div>
          </Field>

          {/* Draft */}
          {isEmail && (
            <Field label="Subject">
              <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder={loading ? 'Drafting...' : 'Subject line'} />
            </Field>
          )}
          <Field label={isEmail ? 'Body' : 'Message'} hint="Edit anything before you use it.">
            <Textarea
              value={bodyText}
              onChange={e => setBodyText(e.target.value)}
              rows={isEmail ? 14 : 6}
              placeholder={loading ? 'Rook is drafting...' : 'Your draft will appear here.'}
              style={{ fontFamily: 'var(--font-body)', lineHeight: 1.55, resize: 'vertical' }}
            />
          </Field>

          {source === 'fallback' && (
            <div className="t-xs muted row gap-1" style={{ alignItems: 'center' }}>
              <Badge tone="default">Template</Badge>
              AI drafting is not connected yet, so this is a personalized template. Edit it and it is ready to send.
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
