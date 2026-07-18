// Duplicates - Ardovo's duplicate management + merge inbox (route /duplicates,
// Admin group). Ardovo only dedupes on IMPORT today; this is the HubSpot /
// Salesforce "Manage duplicates" tool for the records that already live in the
// book. It surfaces scored, grouped potential duplicates (contacts + companies)
// and gives a real merge: pick a master, review a side-by-side compare, and
// fold the duplicates in - blank master fields fill from the duplicate, and its
// activities / deals / associations move to the master through the existing
// store writers. A Dismiss action marks a group "not a duplicate" so it stops
// surfacing. All detection is read-only; the only mutation is an explicit merge.
// ASCII hyphens only. NO em-dash / en-dash.
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useStore, getCompany, userName,
} from '../lib/store.js';
import {
  useDedupe, findDuplicates, dedupeSummary,
  suggestMaster, mergePreview, mergeGroup, recordRefs,
  dismissGroup, getDismissed, restoreDismissed,
  tierMeta, recordLabel,
} from '../lib/dedupe.js';
import {
  Button, Card, Badge, SectionHeader, Segmented, Modal,
  StatCard, EmptyState, Avatar, HealthDot, useToast, relTime,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import Reveal from '../components/motion/Reveal.jsx';

const OBJECT_META = {
  contact: { label: 'Contacts', icon: 'users', plural: 'contacts', link: (id) => `/contacts/${id}` },
  company: { label: 'Companies', icon: 'building', plural: 'companies', link: (id) => `/companies/${id}` },
};

// Which record fields the compare table renders per object type. `fill` marks a
// field the merge will copy into a blank master (matches dedupe.js merge logic).
const FIELDS = {
  contact: [
    { key: 'email', label: 'Email', fill: 'email', get: (r) => r.email },
    { key: 'title', label: 'Title', fill: 'title', get: (r) => r.title },
    { key: 'company', label: 'Company', fill: 'companyId', get: (r) => getCompany(r.companyId)?.name || '', blank: (r) => !r.companyId },
    { key: 'phone', label: 'Phone', fill: 'phone', get: (r) => r.phone },
    { key: 'owner', label: 'Owner', get: (r) => userName(r.ownerId) },
  ],
  company: [
    { key: 'domain', label: 'Domain', fill: 'domain', get: (r) => r.domain },
    { key: 'industry', label: 'Industry', fill: 'industry', get: (r) => r.industry },
    { key: 'size', label: 'Size', fill: 'size', get: (r) => r.size },
    { key: 'location', label: 'Location', fill: 'location', get: (r) => r.location },
    { key: 'owner', label: 'Owner', get: (r) => userName(r.ownerId) },
  ],
};

const isBlankVal = (v) => v == null || v === '';

/* ------------------------------------------------------------
   One record column inside a group compare.
   ------------------------------------------------------------ */
function RecordColumn({ objectType, record, isMaster, masterRecord, onChooseMaster }) {
  const meta = OBJECT_META[objectType];
  const refs = recordRefs(objectType, record.id);
  const name = recordLabel(objectType, record);
  const refChips = objectType === 'company'
    ? [['contacts', refs.contacts], ['deals', refs.deals], ['activities', refs.activities], ['links', refs.associations]]
    : [['deals', refs.deals], ['activities', refs.activities], ['links', refs.associations]];
  return (
    <div className="col gap-2" style={{
      flex: '1 1 250px', minWidth: 230, borderRadius: 'var(--r-md)',
      border: `1.5px solid ${isMaster ? 'var(--accent)' : 'var(--line)'}`,
      background: isMaster ? 'color-mix(in srgb, var(--accent) 7%, var(--paper))' : 'var(--paper)',
      padding: '.9rem', position: 'relative', transition: 'border-color .15s, background .15s',
    }}>
      <label className="row gap-2" style={{ alignItems: 'center', cursor: 'pointer' }}>
        <input type="radio" checked={isMaster} onChange={onChooseMaster}
          style={{ accentColor: 'var(--accent)', width: 16, height: 16, flex: 'none' }} />
        {objectType === 'company'
          ? <span style={{ flex: 'none' }}><HealthDot health={record.health} /></span>
          : <Avatar name={name} size={30} />}
        <span className="col" style={{ minWidth: 0, lineHeight: 1.15 }}>
          <Link to={meta.link(record.id)} className="link fw-7 clip" style={{ fontSize: '.98rem' }} onClick={(e) => e.stopPropagation()}>{name}</Link>
          <span className="t-xs muted">{isMaster ? 'Master - kept' : 'Will merge in + be removed'}</span>
        </span>
      </label>

      <div className="col gap-1" style={{ borderTop: '1px solid var(--line)', paddingTop: '.55rem' }}>
        {FIELDS[objectType].map(f => {
          const val = f.get(record);
          const blank = f.blank ? f.blank(record) : isBlankVal(val);
          // On a duplicate column, flag values that will fill a blank on the master.
          const masterBlank = f.fill && masterRecord && (() => {
            const mf = FIELDS[objectType].find(x => x.key === f.key);
            const mv = mf.get(masterRecord);
            return mf.blank ? mf.blank(masterRecord) : isBlankVal(mv);
          })();
          const fillsMaster = !isMaster && f.fill && !blank && masterBlank;
          return (
            <div key={f.key} className="row between gap-2" style={{ alignItems: 'baseline' }}>
              <span className="t-xs muted" style={{ flex: 'none' }}>{f.label}</span>
              <span className="t-sm clip row gap-1" style={{ textAlign: 'right', justifyContent: 'flex-end', color: blank ? 'var(--n-500)' : 'var(--ink)', fontWeight: blank ? 400 : 600 }}>
                {fillsMaster && <Icon name="arrowLeft" size={12} style={{ color: 'var(--ok)' }} />}
                <span className="clip">{blank ? '-' : val}</span>
              </span>
            </div>
          );
        })}
      </div>

      <div className="row gap-1 wrap" style={{ marginTop: 'auto', paddingTop: '.3rem' }}>
        {refChips.map(([lbl, n]) => (
          <span key={lbl} className="t-xs muted row gap-1" style={{ alignItems: 'center' }}>
            <Badge className="t-xs">{n}</Badge>{lbl}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------
   One duplicate group.
   ------------------------------------------------------------ */
function GroupCard({ group, masterId, onChooseMaster, onMerge, onDismiss, delay }) {
  const meta = OBJECT_META[group.objectType];
  const tier = tierMeta(group.tier);
  const scoreTone = group.score >= 90 ? 'accent' : group.score >= 75 ? 'warn' : 'info';
  return (
    <Reveal delay={delay}>
      <Card>
        <div className="row between wrap gap-2" style={{ alignItems: 'flex-start', marginBottom: '.85rem' }}>
          <div className="col gap-1" style={{ minWidth: 0 }}>
            <div className="row gap-2 wrap" style={{ alignItems: 'center' }}>
              <span className="row gap-1" style={{ alignItems: 'center', color: 'var(--accent-600)' }}>
                <Icon name={meta.icon} size={16} />
                <span className="fw-7" style={{ color: 'var(--ink)' }}>{group.members.length} possible {group.members.length > 2 ? 'duplicates' : 'duplicate'}</span>
              </span>
              <Badge tone={tier.tone}>{tier.label}</Badge>
              <Badge tone={scoreTone}>{group.score}% match</Badge>
            </div>
            <div className="row gap-1 wrap" style={{ marginTop: 2 }}>
              {group.reasons.map((r, i) => (
                <span key={i} className="t-xs" style={{ padding: '.1rem .5rem', borderRadius: 999, background: 'var(--n-100)', color: 'var(--n-600)', fontWeight: 600 }}>{r}</span>
              ))}
            </div>
          </div>
          <div className="row gap-1" style={{ flex: 'none' }}>
            <Button variant="ghost" size="sm" onClick={onDismiss} title="Not a duplicate">
              <Icon name="x" size={15} /> Not a duplicate
            </Button>
            <Button variant="primary" size="sm" onClick={onMerge}>
              <Icon name="merge" size={15} /> Merge
            </Button>
          </div>
        </div>

        <div className="row gap-2 wrap" style={{ alignItems: 'stretch' }}>
          {group.members.map(m => (
            <RecordColumn key={m.id} objectType={group.objectType} record={m}
              masterRecord={group.members.find(x => x.id === masterId)}
              isMaster={m.id === masterId} onChooseMaster={() => onChooseMaster(m.id)} />
          ))}
        </div>
      </Card>
    </Reveal>
  );
}

/* ------------------------------------------------------------
   Merge confirm modal - shows exactly what will happen.
   ------------------------------------------------------------ */
function MergeModal({ group, masterId, onClose, onConfirm }) {
  if (!group) return null;
  const dupIds = group.memberIds.filter(id => id !== masterId);
  const pv = mergePreview(group.objectType, masterId, dupIds);
  const masterName = recordLabel(group.objectType, pv?.master);
  const moved = [];
  if (pv) {
    if (pv.contacts) moved.push(`${pv.contacts} contact${pv.contacts === 1 ? '' : 's'}`);
    if (pv.deals) moved.push(`${pv.deals} deal${pv.deals === 1 ? '' : 's'}`);
    if (pv.activities) moved.push(`${pv.activities} activit${pv.activities === 1 ? 'y' : 'ies'}`);
    if (pv.associations) moved.push(`${pv.associations} link${pv.associations === 1 ? '' : 's'}`);
  }
  return (
    <Modal open={!!group} onClose={onClose} title="Confirm merge" width={520}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={onConfirm}><Icon name="merge" size={16} /> Merge {dupIds.length} record{dupIds.length === 1 ? '' : 's'}</Button>
        </>
      }>
      <div className="col gap-3">
        <div className="row gap-2" style={{ alignItems: 'center' }}>
          <span className="row center" style={{ width: 38, height: 38, borderRadius: 10, background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent-600)', flex: 'none' }}>
            <Icon name="merge" size={20} />
          </span>
          <div className="col" style={{ minWidth: 0 }}>
            <span className="fw-7 clip">Keep {masterName}</span>
            <span className="t-sm muted">as the single surviving record</span>
          </div>
        </div>
        <ul className="col gap-2" style={{ margin: 0, paddingLeft: '1.1rem' }}>
          <li className="t-sm">Fills <b>{pv?.fieldsFilled.length || 0}</b> blank field{(pv?.fieldsFilled.length || 0) === 1 ? '' : 's'} on the master{pv?.fieldsFilled.length ? ` (${pv.fieldsFilled.join(', ')})` : ''}</li>
          <li className="t-sm">Moves {moved.length ? moved.join(', ') : 'no related records'} onto the master</li>
          <li className="t-sm">Removes <b>{dupIds.length}</b> duplicate record{dupIds.length === 1 ? '' : 's'}</li>
        </ul>
        <div className="t-xs muted" style={{ padding: '.6rem .75rem', background: 'var(--n-100)', borderRadius: 'var(--r-sm)' }}>
          Related records are re-pointed to the master through Ardovo's normal writers, so history, activity timelines and reports stay intact.
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------
   Dismissed drawer
   ------------------------------------------------------------ */
function DismissedList({ onRestore }) {
  useStore();
  const dismissed = getDismissed();
  const [open, setOpen] = useState(false);
  if (!dismissed.length) return null;
  return (
    <Card>
      <button type="button" className="row between" style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }} onClick={() => setOpen(o => !o)}>
        <span className="row gap-2" style={{ alignItems: 'center' }}>
          <Icon name="eyeOff" size={16} style={{ color: 'var(--n-600)' }} />
          <span className="fw-6">Dismissed as not duplicates</span>
          <Badge>{dismissed.length}</Badge>
        </span>
        <Icon name="chevronDown" size={16} style={{ transform: open ? 'none' : 'rotate(-90deg)', transition: 'transform .15s', color: 'var(--n-600)' }} />
      </button>
      {open && (
        <div className="col gap-1" style={{ marginTop: '.8rem' }}>
          {dismissed.map(d => (
            <div key={d.key} className="row between gap-2" style={{ padding: '.5rem .1rem', borderTop: '1px solid var(--line)' }}>
              <span className="t-sm muted clip">
                <Icon name={OBJECT_META[d.objectType]?.icon || 'box'} size={13} /> {d.memberIds.length} {OBJECT_META[d.objectType]?.plural || 'records'} - dismissed {relTime(d.at)}
              </span>
              <Button variant="quiet" size="sm" onClick={() => onRestore(d.key)}><Icon name="rotateCcw" size={14} /> Restore</Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------
   Page
   ------------------------------------------------------------ */
export default function Duplicates() {
  useStore();     // re-derive groups on any book mutation (incl. after merge)
  useDedupe();    // re-render on dismiss / restore
  const toast = useToast();
  const [objectType, setObjectType] = useState('contact');
  const [masters, setMasters] = useState({});          // groupId -> chosen masterId
  const [confirm, setConfirm] = useState(null);        // { group, masterId }

  // Cheap enough to recompute each render (small book); re-runs on any store
  // mutation because this component subscribes via useStore().
  const summary = dedupeSummary();
  const groups = findDuplicates(objectType);

  const masterFor = (g) => masters[g.id] || suggestMaster(g.objectType, g.members);
  const chooseMaster = (g, id) => setMasters(prev => ({ ...prev, [g.id]: id }));

  const doMerge = (g) => setConfirm({ group: g, masterId: masterFor(g) });
  const confirmMerge = () => {
    const { group, masterId } = confirm;
    const r = mergeGroup(group.objectType, masterId, group.memberIds);
    setConfirm(null);
    if (r.error) { toast(r.message || 'Merge failed', 'risk'); return; }
    const m = r.moved;
    const parts = [];
    if (m.contacts) parts.push(`${m.contacts} contacts`);
    if (m.deals) parts.push(`${m.deals} deals`);
    if (m.activities) parts.push(`${m.activities} activities`);
    if (m.associations) parts.push(`${m.associations} links`);
    toast(`Merged ${m.removed} record${m.removed === 1 ? '' : 's'}${parts.length ? ' - moved ' + parts.join(', ') : ''}`);
  };
  const doDismiss = (g) => { dismissGroup(g); toast('Marked as not a duplicate'); };
  const onRestore = (key) => { restoreDismissed(key); toast('Restored to the inbox'); };

  return (
    <div className="col gap-3 fade-up">
      <SectionHeader
        title="Duplicates"
        sub="Find and merge duplicate records already in your book - keep one master, move everything else onto it"
      />

      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
        <StatCard label="Duplicate groups" value={summary.totalGroups} sub="awaiting review" icon={<Icon name="merge" size={18} />} />
        <StatCard label="Contact groups" value={summary.contactGroups} sub={`${summary.contactDupRecords} mergeable`} icon={<Icon name="users" size={18} />} accent="#0ea5a3" />
        <StatCard label="Company groups" value={summary.companyGroups} sub={`${summary.companyDupRecords} mergeable`} icon={<Icon name="building" size={18} />} accent="#e0752d" />
        <StatCard label="Records to reclaim" value={summary.mergeable} sub="removed on merge" icon={<Icon name="trash" size={18} />} accent="#c0392b" />
      </div>

      <div className="row between wrap gap-2" style={{ alignItems: 'center' }}>
        <Segmented
          options={[
            { value: 'contact', label: `Contacts (${summary.contactGroups})` },
            { value: 'company', label: `Companies (${summary.companyGroups})` },
          ]}
          value={objectType}
          onChange={setObjectType}
        />
        <span className="t-sm muted">{groups.length} group{groups.length === 1 ? '' : 's'} in {OBJECT_META[objectType].label.toLowerCase()}</span>
      </div>

      {groups.length === 0 ? (
        <Card>
          <EmptyState
            icon="✨"
            title={`No ${OBJECT_META[objectType].label.toLowerCase()} duplicates to review`}
            body="Ardovo scored your book and found nothing likely-duplicate here. New matches will appear as records are added or imported."
          />
        </Card>
      ) : (
        <div className="col gap-3">
          {groups.map((g, i) => (
            <GroupCard
              key={g.id}
              group={g}
              masterId={masterFor(g)}
              onChooseMaster={(id) => chooseMaster(g, id)}
              onMerge={() => doMerge(g)}
              onDismiss={() => doDismiss(g)}
              delay={Math.min(i * 40, 240)}
            />
          ))}
        </div>
      )}

      <DismissedList onRestore={onRestore} />

      <MergeModal
        group={confirm?.group}
        masterId={confirm?.masterId}
        onClose={() => setConfirm(null)}
        onConfirm={confirmMerge}
      />
    </div>
  );
}
