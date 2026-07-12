// Studio - the generation suite gallery. Saved proposals + documents as
// animated cards, plus a "New from template" row (Blank, Sales proposal,
// One-pager, QBR) that creates a doc and drops you into the builder. Every
// card shows a live mini-thumbnail of the doc's cover so the wall reads like
// a real design surface. All data flows through store-docs (useDocs).
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocs, getDocs, createDoc, deleteDoc, TEMPLATES } from '../lib/store-docs.js';
import { getDeals, getDeal, getCompany } from '../lib/store.js';
import { Button, Card, Badge, Modal, Field, Input, Select, EmptyState, useToast, relTime, GradientText } from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import SignatureRequestModal from '../components/esign/SignatureRequestModal.jsx';

export default function Studio() {
  const nav = useNavigate();
  const toast = useToast();
  useDocs();
  const docs = getDocs();

  const [pick, setPick] = useState(null);   // template key awaiting a name + optional deal
  const [name, setName] = useState('');
  const [dealId, setDealId] = useState('');
  const [confirmDel, setConfirmDel] = useState(null);
  const [signDoc, setSignDoc] = useState(null);   // doc awaiting a signature request

  const deals = getDeals().filter(d => d.status === 'open');

  const openTemplate = (key) => {
    const tpl = TEMPLATES.find(t => t.key === key);
    setPick(key);
    setName('');
    setDealId('');
  };

  const create = () => {
    const { doc } = createDoc({ name: name.trim() || undefined, template: pick, dealId: dealId || null });
    setPick(null);
    toast('Document created.');
    nav(`/studio/${doc.id}`);
  };

  const remove = (id) => {
    deleteDoc(id);
    setConfirmDel(null);
    toast('Document deleted.');
  };

  return (
    <div className="rl-page col gap-4 page-in">
      <StudioStyles />

      {/* hero */}
      <div className="st-hero">
        <div className="col gap-2" style={{ minWidth: 0 }}>
          <div className="eyebrow">Generation suite</div>
          <h1 style={{ margin: 0 }}>Document <GradientText>Studio</GradientText></h1>
          <p className="muted" style={{ margin: 0, maxWidth: 560, fontSize: '1.05rem' }}>
            Build proposals, one-pagers, and QBRs that pull live CRM data. Drag blocks, bind a deal, export a beautiful PDF.
          </p>
        </div>
        <div className="st-hero-art" aria-hidden="true">
          <span className="st-float f1"><Icon name="fileText" size={22} /></span>
          <span className="st-float f2"><Icon name="dollar" size={22} /></span>
          <span className="st-float f3"><Icon name="layers" size={22} /></span>
        </div>
      </div>

      {/* new from template */}
      <div className="col gap-2">
        <div className="row between" style={{ alignItems: 'baseline' }}>
          <h3 style={{ margin: 0 }}>New from template</h3>
          <span className="t-sm muted">Pick a starting point</span>
        </div>
        <div className="st-templates stagger">
          {TEMPLATES.map(t => (
            <button key={t.key} className="st-tpl card card-hover" onClick={() => openTemplate(t.key)}>
              <div className="st-tpl-thumb" style={{ background: `linear-gradient(135deg, ${t.accent}, ${t.accent}cc)` }}>
                <span className="st-tpl-lines">
                  <i style={{ width: '60%' }} /><i style={{ width: '85%' }} /><i style={{ width: '40%' }} />
                </span>
                <span className="st-tpl-icon"><Icon name={t.icon} size={20} /></span>
              </div>
              <div className="col gap-1" style={{ padding: '.9rem 1rem 1rem' }}>
                <strong>{t.name}</strong>
                <span className="t-sm muted">{t.blurb}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* saved docs */}
      <div className="col gap-2">
        <div className="row between" style={{ alignItems: 'baseline' }}>
          <h3 style={{ margin: 0 }}>Your documents</h3>
          <span className="t-sm muted">{docs.length} saved</span>
        </div>

        {docs.length === 0 ? (
          <Card><EmptyState icon="📄" title="No documents yet" body="Start from a template above to build your first proposal." /></Card>
        ) : (
          <div className="st-docs stagger">
            {docs.map(d => {
              const deal = d.dealId ? getDeal(d.dealId) : null;
              const co = deal ? getCompany(deal.companyId) : null;
              const cover = d.blocks.find(b => b.type === 'cover')?.config || {};
              const blockCount = d.blocks.length;
              return (
                <Card key={d.id} pad={false} className="st-doc" hover onClick={() => nav(`/studio/${d.id}`)}>
                  <div className="st-doc-cover" style={{ background: `linear-gradient(135deg, ${d.accent}, ${d.accent}bb 75%, ${d.accent}88)` }}>
                    <div className="st-doc-cover-eyebrow">{cover.eyebrow || 'Document'}</div>
                    <div className="st-doc-cover-title">{cover.title || d.name}</div>
                    <div className="st-doc-cover-mark"><Icon name="zap" size={13} fill="currentColor" stroke={0} /> Rally</div>
                  </div>
                  <div className="col gap-1" style={{ padding: '.9rem 1rem 1rem' }}>
                    <div className="row between" style={{ gap: '.5rem' }}>
                      <strong className="clip" style={{ minWidth: 0 }}>{d.name}</strong>
                      <div className="row gap-1" style={{ flex: 'none' }}>
                        <button className="reveal btn btn-quiet btn-sm" title="Send for signature"
                          onClick={(e) => { e.stopPropagation(); setSignDoc(d); }}>
                          <Icon name="send" size={15} />
                        </button>
                        <button className="st-doc-del reveal btn btn-quiet btn-sm" title="Delete"
                          onClick={(e) => { e.stopPropagation(); setConfirmDel(d); }}>
                          <Icon name="trash" size={15} />
                        </button>
                      </div>
                    </div>
                    <div className="row gap-1 wrap" style={{ alignItems: 'center' }}>
                      {co && <Badge tone="accent">{co.name}</Badge>}
                      <span className="t-xs muted">{blockCount} block{blockCount !== 1 ? 's' : ''}</span>
                      <span className="t-xs muted">- edited {relTime(d.updatedAt || d.createdAt)}</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* create modal */}
      {pick && (
        <Modal open onClose={() => setPick(null)} width={520}
          title={`New ${TEMPLATES.find(t => t.key === pick)?.name || 'document'}`}
          footer={
            <>
              <Button variant="quiet" onClick={() => setPick(null)}>Cancel</Button>
              <Button variant="accent" onClick={create}><Icon name="plus" size={16} /> Create + edit</Button>
            </>
          }>
          <div className="col gap-3">
            <Field label="Document name" hint="Leave blank for a smart default.">
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Vertex Robotics - Platform Proposal" autoFocus />
            </Field>
            <Field label="Link to a deal" hint="Binds pricing tables to the deal's live line items.">
              <Select value={dealId} onChange={e => setDealId(e.target.value)}>
                <option value="">No deal (manual pricing)</option>
                {deals.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            </Field>
          </div>
        </Modal>
      )}

      {/* delete confirm */}
      {confirmDel && (
        <Modal open onClose={() => setConfirmDel(null)} width={440} title="Delete document?"
          footer={
            <>
              <Button variant="quiet" onClick={() => setConfirmDel(null)}>Cancel</Button>
              <Button variant="danger" onClick={() => remove(confirmDel.id)}><Icon name="trash" size={16} /> Delete</Button>
            </>
          }>
          <p style={{ margin: 0 }}>Delete <strong>{confirmDel.name}</strong>? This cannot be undone.</p>
        </Modal>
      )}

      {/* send-for-signature modal (self-contained sender flow) */}
      {signDoc && (
        <SignatureRequestModal
          doc={signDoc}
          open
          onClose={() => setSignDoc(null)}
        />
      )}
    </div>
  );
}

function StudioStyles() {
  return (
    <style>{`
      .st-hero { display: flex; justify-content: space-between; gap: 1.5rem; align-items: center;
        padding: 1.75rem 2rem; border-radius: var(--r-xl); overflow: hidden; position: relative;
        background: linear-gradient(120deg, var(--paper), var(--n-25)); border: 1px solid var(--line); box-shadow: var(--shadow-sm); }
      .st-hero-art { position: relative; width: 180px; height: 120px; flex: none; }
      .st-float { position: absolute; width: 52px; height: 52px; border-radius: 14px; display: grid; place-items: center;
        color: #fff; box-shadow: var(--shadow-md); }
      .st-float.f1 { top: 8px; right: 96px; background: linear-gradient(135deg, #6d5cf7, #4a3ce0); animation: floaty 4s ease-in-out infinite; }
      .st-float.f2 { top: 44px; right: 34px; background: linear-gradient(135deg, #0ea5a3, #0b7f7d); animation: floaty 4.6s ease-in-out infinite .4s; }
      .st-float.f3 { top: 4px; right: 8px; background: linear-gradient(135deg, #a855f7, #8b3fd4); animation: floaty 5.2s ease-in-out infinite .8s; }
      @media (max-width: 760px) { .st-hero-art { display: none; } }

      .st-templates { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.1rem; }
      @media (max-width: 900px) { .st-templates { grid-template-columns: repeat(2, 1fr) !important; } }
      .st-tpl { text-align: left; padding: 0; overflow: hidden; cursor: pointer; border: 1px solid var(--line); background: var(--paper); }
      .st-tpl-thumb { height: 108px; position: relative; display: flex; align-items: flex-end; padding: 1rem; overflow: hidden; }
      .st-tpl-lines { display: flex; flex-direction: column; gap: 6px; width: 100%; }
      .st-tpl-lines i { display: block; height: 7px; border-radius: 999px; background: rgba(255,255,255,.55); }
      .st-tpl-icon { position: absolute; top: 12px; right: 12px; width: 38px; height: 38px; border-radius: 10px;
        display: grid; place-items: center; background: rgba(255,255,255,.22); color: #fff; backdrop-filter: blur(4px); }

      .st-docs { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1.15rem; }
      .st-doc { overflow: hidden; cursor: pointer; }
      .st-doc-cover { height: 150px; padding: 1.15rem 1.25rem; position: relative; color: #fff; display: flex; flex-direction: column; justify-content: flex-end; }
      .st-doc-cover-eyebrow { position: absolute; top: 1rem; left: 1.25rem; font-size: .64rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: rgba(255,255,255,.82); }
      .st-doc-cover-title { font-size: 1.2rem; font-weight: 800; letter-spacing: -.02em; line-height: 1.15;
        display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      .st-doc-cover-mark { position: absolute; top: 1rem; right: 1.25rem; display: inline-flex; align-items: center; gap: .3rem; font-size: .72rem; font-weight: 800; color: rgba(255,255,255,.9); }
      .st-doc-del { color: var(--n-600); flex: none; }
      .st-doc-del:hover { color: var(--risk); }
    `}</style>
  );
}
