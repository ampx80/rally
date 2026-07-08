// Campaigns. The marketing surface of Rally: multi-channel programs with the
// full funnel (sent -> opened -> clicked -> leads -> revenue influenced). KPI
// row, a revenue-by-channel mix breakdown, and a dense sortable table. New
// campaign is a light modal stub for now (functionality lands later).
import React, { useMemo, useState } from 'react';
import {
  useExt, getCampaigns, campaignRevenue, campaignLeads,
} from '../lib/store-ext.js';
import {
  Button, Card, Badge, SectionHeader, Field, Input, Select, Modal,
  StatCard, ProgressBar, moneyK, relTime, useToast,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';
import DataTable from '../components/DataTable.jsx';

const CHANNELS = ['ABM', 'Email', 'Paid ads', 'Webinar', 'Event', 'Partner'];

const STATUS_TONE = { active: 'ok', scheduled: 'info', completed: 'default', draft: 'warn' };

const pct = (num, den) => (den > 0 ? (num / den) * 100 : 0);
const fmtPct = (v) => `${v.toFixed(1)}%`;

// A deterministic plausible spark from a seed number (so the KPI sparks look
// alive and varied without any extra stored series). Rising by default.
function spark(seed, len = 12, rise = 1) {
  const out = [];
  let v = 40 + (seed % 30);
  for (let i = 0; i < len; i++) {
    const wobble = ((seed * (i + 3)) % 17) - 8;
    v = Math.max(6, v + wobble + rise * 3);
    out.push(Math.round(v));
  }
  return out;
}

export default function Campaigns() {
  useExt();
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState({ name: '', channel: 'Email' });

  const campaigns = getCampaigns();

  const stats = useMemo(() => {
    const revenue = campaignRevenue();
    const leads = campaignLeads();
    const active = campaigns.filter(c => c.status === 'active').length;
    const rates = campaigns.filter(c => c.sent > 0).map(c => pct(c.opened, c.sent));
    const avgOpen = rates.length ? rates.reduce((s, r) => s + r, 0) / rates.length : 0;
    return { revenue, leads, active, avgOpen };
  }, [campaigns]);

  // Revenue grouped by channel for the mix card, sorted desc.
  const channelMix = useMemo(() => {
    const by = new Map();
    for (const c of campaigns) by.set(c.channel, (by.get(c.channel) || 0) + c.revenue);
    const rows = [...by.entries()].map(([channel, revenue]) => ({ channel, revenue }));
    rows.sort((a, b) => b.revenue - a.revenue);
    const top = rows[0]?.revenue || 1;
    return rows.map(r => ({ ...r, share: pct(r.revenue, top) }));
  }, [campaigns]);

  const submit = () => {
    if (!draft.name.trim()) return toast('Name your campaign', 'risk');
    setModalOpen(false);
    setDraft({ name: '', channel: 'Email' });
    toast('Campaign created');
  };

  const columns = [
    {
      key: 'name', header: 'Campaign', width: '22%',
      value: (c) => c.name,
      render: (c) => <span className="fw-6" style={{ color: 'var(--ink)' }}>{c.name}</span>,
    },
    {
      key: 'channel', header: 'Channel',
      value: (c) => c.channel,
      render: (c) => <Badge>{c.channel}</Badge>,
    },
    {
      key: 'status', header: 'Status',
      value: (c) => c.status,
      render: (c) => <Badge tone={STATUS_TONE[c.status] || 'default'}>{c.status}</Badge>,
    },
    {
      key: 'sent', header: 'Sent', align: 'right',
      sortValue: (c) => c.sent,
      render: (c) => <span className="tnum muted">{c.sent.toLocaleString()}</span>,
    },
    {
      key: 'open', header: 'Open rate', width: 140,
      sortValue: (c) => pct(c.opened, c.sent),
      render: (c) => {
        const v = pct(c.opened, c.sent);
        return (
          <div className="col gap-1" style={{ minWidth: 96 }}>
            <span className="tnum fw-6 t-sm">{fmtPct(v)}</span>
            <ProgressBar value={v} height={5} />
          </div>
        );
      },
    },
    {
      key: 'click', header: 'Click rate', align: 'right',
      sortValue: (c) => pct(c.clicked, c.opened),
      render: (c) => <span className="tnum muted">{fmtPct(pct(c.clicked, c.opened))}</span>,
    },
    {
      key: 'leads', header: 'Leads', align: 'right',
      sortValue: (c) => c.leads,
      render: (c) => <span className="tnum fw-6">{c.leads.toLocaleString()}</span>,
    },
    {
      key: 'revenue', header: 'Revenue', align: 'right',
      sortValue: (c) => c.revenue,
      render: (c) => <span className="tnum fw-6" style={{ color: 'var(--accent-600)' }}>{moneyK(c.revenue)}</span>,
    },
    {
      key: 'startAt', header: 'Started', align: 'right',
      sortValue: (c) => new Date(c.startAt),
      render: (c) => <span className="tnum muted" title={new Date(c.startAt).toLocaleDateString()}>{relTime(c.startAt)}</span>,
    },
  ];

  return (
    <div className="fade-up">
      <SectionHeader
        title="Campaigns"
        sub={`${campaigns.length} programs driving pipeline across ${channelMix.length} channels`}
        action={
          <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
            <Icon name="plus" size={16} /> New campaign
          </Button>
        }
      />

      <div className="grid stagger" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', marginBottom: '1.25rem' }}>
        <StatCard
          label="Revenue influenced" value={stats.revenue} format={moneyK}
          trend={18} icon={<Icon name="megaphone" size={18} />}
          spark={spark(3, 12, 1.2)}
        />
        <StatCard
          label="Leads generated" value={stats.leads}
          trend={11} icon={<Icon name="target" size={18} />}
          spark={spark(7, 12, 1)} accent="#0ea5a3" sparkColor="#0ea5a3"
        />
        <StatCard
          label="Active campaigns" value={stats.active}
          sub="running now" icon={<Icon name="bolt" size={18} />}
          spark={spark(5, 12, 0.4)}
        />
        <StatCard
          label="Avg open rate" value={Number(stats.avgOpen.toFixed(1))} format={(n) => `${n.toFixed(1)}%`}
          trend={4} icon={<Icon name="mail" size={18} />}
          spark={spark(2, 12, 0.6)} accent="#e0752d" sparkColor="#e0752d"
        />
      </div>

      <Card className="fade-up" style={{ marginBottom: '1.25rem' }}>
        <div className="row between" style={{ marginBottom: '1rem' }}>
          <div className="col gap-1" style={{ minWidth: 0 }}>
            <h4 style={{ margin: 0 }}>Channel mix</h4>
            <div className="muted t-sm">Revenue influenced by channel</div>
          </div>
          <span style={{ color: 'var(--accent-600)' }}><Icon name="layers" size={20} /></span>
        </div>
        <div className="col gap-3">
          {channelMix.map(ch => (
            <div key={ch.channel} className="row gap-3" style={{ alignItems: 'center' }}>
              <div className="fw-6 t-sm" style={{ width: 96, flex: 'none' }}>{ch.channel}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <ProgressBar value={ch.share} height={10} />
              </div>
              <div className="tnum fw-6 t-sm" style={{ width: 64, textAlign: 'right', flex: 'none', color: 'var(--accent-600)' }}>
                {moneyK(ch.revenue)}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <DataTable
        columns={columns}
        rows={campaigns}
        getId={(c) => c.id}
        searchable
        searchKeys={['name', 'channel']}
        initialSort={{ key: 'revenue', dir: 'desc' }}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New campaign"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={submit}>Create campaign</Button>
          </>
        }
      >
        <div className="col gap-3">
          <Field label="Campaign name">
            <Input
              autoFocus
              placeholder="Q4 Enterprise ABM"
              value={draft.name}
              onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && submit()}
            />
          </Field>
          <Field label="Channel">
            <Select value={draft.channel} onChange={e => setDraft(d => ({ ...d, channel: e.target.value }))}>
              {CHANNELS.map(ch => <option key={ch} value={ch}>{ch}</option>)}
            </Select>
          </Field>
        </div>
      </Modal>
    </div>
  );
}
