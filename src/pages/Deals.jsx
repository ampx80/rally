// Deals pipeline. Two synchronized views over the same book of open + closed
// deals: a drag-to-move Kanban board and a dense sortable data grid with
// inline value editing and bulk win/lose actions. New-deal modal is driven
// either by the "New deal" button or the ?new=1 query param (top bar links here).
import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  useStore, getDeals, getCompany, getCompanies, getUsers, userName,
  moveDealStage, updateDeal, createDeal, stageById,
  pipelineValue, openDeals, OPEN_STAGES,
} from '../lib/store.js';
import {
  Button, Card, Badge, Avatar, SectionHeader, Field, Input, Select, Modal,
  moneyK, monthDay, relTime, useToast,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import { celebrate } from '../lib/celebrate.js';
import KanbanBoard from '../components/KanbanBoard.jsx';
import DataTable from '../components/DataTable.jsx';

const STAGE_COLOR = {
  lead: '#8b93a4', qualified: '#2563a8', discovery: '#5b4bf5',
  proposal: '#b3721a', negotiation: '#0ea5a3', won: '#1a7f52', lost: '#c0392b',
};

function StageBadge({ stageId }) {
  const st = stageById(stageId);
  return (
    <Badge>
      <span className="dot" style={{ background: STAGE_COLOR[stageId] || 'var(--n-400)' }} />
      {st?.name || stageId}
    </Badge>
  );
}

const emptyDraft = () => ({
  name: '', companyId: '', value: '', stage: 'lead',
  closeDate: '', ownerId: '',
});

export default function Deals() {
  useStore();
  const nav = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState('board'); // 'board' | 'table'
  const [modalOpen, setModalOpen] = useState(params.get('new') === '1');
  const [draft, setDraft] = useState(emptyDraft);

  const deals = getDeals();
  const open = openDeals();

  const openModal = () => { setDraft(emptyDraft()); setModalOpen(true); };
  const closeModal = () => {
    setModalOpen(false);
    if (params.get('new')) { const p = new URLSearchParams(params); p.delete('new'); setParams(p, { replace: true }); }
  };

  const submit = () => {
    const r = createDeal({
      name: draft.name,
      companyId: draft.companyId || null,
      value: draft.value,
      stage: draft.stage,
      closeDate: draft.closeDate ? new Date(draft.closeDate).toISOString() : undefined,
      ownerId: draft.ownerId || undefined,
    });
    if (r.error) return toast(r.message, 'risk');
    closeModal();
    toast('Deal created');
    nav(`/deals/${r.deal.id}`);
  };

  const columns = [
    {
      key: 'name', header: 'Deal', width: '24%',
      value: (d) => d.name,
      render: (d) => (
        <Link to={`/deals/${d.id}`} className="fw-6" style={{ color: 'var(--ink)' }} onClick={e => e.stopPropagation()}>
          {d.name}
        </Link>
      ),
    },
    {
      key: 'company', header: 'Company', sortable: true,
      value: (d) => getCompany(d.companyId)?.name || '',
      sortValue: (d) => getCompany(d.companyId)?.name || '',
      render: (d) => {
        const co = getCompany(d.companyId);
        return co
          ? <Link to={`/companies/${co.id}`} className="link" onClick={e => e.stopPropagation()}>{co.name}</Link>
          : <span className="muted">-</span>;
      },
    },
    {
      key: 'stage', header: 'Stage',
      value: (d) => stageById(d.stage)?.name || d.stage,
      sortValue: (d) => stageById(d.stage)?.order ?? 99,
      render: (d) => <StageBadge stageId={d.stage} />,
    },
    {
      key: 'value', header: 'Value', align: 'right', editable: true,
      sortValue: (d) => d.value,
      render: (d) => <span className="tnum fw-6">{moneyK(d.value)}</span>,
    },
    {
      key: 'probability', header: 'Probability', align: 'right',
      sortValue: (d) => d.probability,
      render: (d) => <span className="tnum muted">{d.probability}%</span>,
    },
    {
      key: 'closeDate', header: 'Close', align: 'right',
      sortValue: (d) => new Date(d.closeDate),
      render: (d) => <span className="tnum" title={monthDay(d.closeDate)}>{relTime(d.closeDate)}</span>,
    },
    {
      key: 'owner', header: 'Owner',
      value: (d) => userName(d.ownerId),
      sortValue: (d) => userName(d.ownerId),
      render: (d) => (
        <span className="row gap-1" style={{ minWidth: 0 }}>
          <Avatar name={userName(d.ownerId)} size={24} />
          <span className="clip t-sm">{userName(d.ownerId)}</span>
        </span>
      ),
    },
  ];

  const bulkActions = [
    { label: 'Mark won', onClick: (ids) => { ids.forEach(id => moveDealStage(id, 'won')); celebrate(); toast(`${ids.length} marked won!`); } },
    { label: 'Mark lost', onClick: (ids) => { ids.forEach(id => moveDealStage(id, 'lost')); toast(`${ids.length} marked lost`); } },
  ];

  const viewBtn = (key, icon, label) => (
    <button
      onClick={() => setView(key)}
      className={`btn btn-sm ${view === key ? 'btn-primary' : 'btn-ghost'}`}
      aria-pressed={view === key}
    >
      <Icon name={icon} size={16} /> {label}
    </button>
  );

  return (
    <div className="fade-up">
      <SectionHeader
        title="Deals"
        sub={`${moneyK(pipelineValue())} open pipeline across ${open.length} deal${open.length === 1 ? '' : 's'}`}
        action={
          <>
            <div className="row gap-1" style={{ background: 'var(--n-50)', padding: 3, borderRadius: 'var(--r-sm)', border: '1px solid var(--line)' }}>
              {viewBtn('board', 'grid', 'Board')}
              {viewBtn('table', 'list', 'Table')}
            </div>
            <Button variant="primary" size="sm" onClick={openModal}>
              <Icon name="plus" size={16} /> New deal
            </Button>
          </>
        }
      />

      {view === 'board' ? (
        <KanbanBoard
          deals={deals}
          companyName={(id) => getCompany(id)?.name || '-'}
          ownerName={userName}
          onMove={(dealId, stageId) => {
            const r = moveDealStage(dealId, stageId);
            if (!r.error && stageId === 'won') celebrate();
            toast(r.error ? r.message : (stageId === 'won' ? 'Deal won! ' : 'Deal moved to ') + stageById(stageId).name, r.error ? 'risk' : 'ok');
          }}
        />
      ) : (
        <DataTable
          columns={columns}
          rows={deals}
          getId={(d) => d.id}
          onRowClick={(d) => nav(`/deals/${d.id}`)}
          searchable
          searchKeys={['name', 'company', 'stage', 'owner']}
          initialSort={{ key: 'value', dir: 'desc' }}
          bulkActions={bulkActions}
          onEdit={(row, key, val) => {
            if (key === 'value') {
              const r = updateDeal(row.id, { value: Number(val) });
              if (r.error) toast(r.message, 'risk');
            }
          }}
        />
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title="New deal"
        footer={
          <>
            <Button variant="ghost" onClick={closeModal}>Cancel</Button>
            <Button variant="primary" onClick={submit}>Create deal</Button>
          </>
        }
      >
        <div className="col gap-3">
          <Field label="Deal name">
            <Input
              autoFocus
              placeholder="Acme Corp - Platform rollout"
              value={draft.name}
              onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && submit()}
            />
          </Field>
          <Field label="Company">
            <Select value={draft.companyId} onChange={e => setDraft(d => ({ ...d, companyId: e.target.value }))}>
              <option value="">Select a company</option>
              {getCompanies().map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <div className="row gap-2" style={{ alignItems: 'flex-start' }}>
            <Field label="Value (USD)">
              <Input
                type="number" min="0" step="1000" placeholder="120000"
                value={draft.value}
                onChange={e => setDraft(d => ({ ...d, value: e.target.value }))}
              />
            </Field>
            <Field label="Stage">
              <Select value={draft.stage} onChange={e => setDraft(d => ({ ...d, stage: e.target.value }))}>
                {OPEN_STAGES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
          </div>
          <div className="row gap-2" style={{ alignItems: 'flex-start' }}>
            <Field label="Expected close">
              <Input type="date" value={draft.closeDate} onChange={e => setDraft(d => ({ ...d, closeDate: e.target.value }))} />
            </Field>
            <Field label="Owner">
              <Select value={draft.ownerId} onChange={e => setDraft(d => ({ ...d, ownerId: e.target.value }))}>
                <option value="">Auto (company owner)</option>
                {getUsers().map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </Select>
            </Field>
          </div>
        </div>
      </Modal>
    </div>
  );
}
