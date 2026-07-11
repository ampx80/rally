// ============================================================
// RALLY DATA LAYER - LOCAL ADAPTER
// ------------------------------------------------------------
// Wraps the EXISTING local-first stores (store.js + store-ext.js)
// without changing them. Reads delegate to the store getters;
// writes delegate to the store's validated writers; so the same
// localStorage keys (rally_state_v1, rally_ext_v1) and the same
// pub/sub drive everything. Behavior is identical to today - this
// adapter adds an addressing layer, not new state.
//
// Reactivity: the local stores publish a brand-new state object on
// every commit. useData() (see index.js) subscribes to that via the
// existing useStore()/useExt() hooks, so React re-renders and
// re-reads. The adapter's own subscribe() additionally fans out
// after any write routed THROUGH the adapter, which keeps non-hook
// consumers (and the Supabase realtime shape) consistent.
// ============================================================
import {
  getUsers, getUser,
  getCompanies, getCompany, createCompany, updateCompany,
  getContacts, getContact, createContact, updateContact,
  getDeals, getDeal, createDeal, updateDeal,
  getActivities, getActivity, createActivity, updateActivity,
} from '../store.js';
import {
  getLeads, createLead, updateLead,
  getProducts,
  getQuotes, createQuote, updateQuote,
  getInvoices, updateInvoice,
  getCampaigns,
  getSequences,
  getTickets, updateTicket,
  getWorkflows,
} from '../store-ext.js';
import { DataAdapter, applyQuery, ok, fail, fromWriter, isEntity } from './adapter.js';

// Per-entity handler table. `key` is the property the store writer
// returns the record under (createCompany -> { company }). A missing
// verb (for example remove, or create on a read-only entity) is
// reported as an unsupported error rather than silently succeeding.
const H = {
  users: {
    all: getUsers,
    one: (id) => getUser(id),
  },
  companies: {
    all: getCompanies,
    one: (id) => getCompany(id),
    create: createCompany, update: updateCompany, key: 'company',
  },
  contacts: {
    all: getContacts,
    one: (id) => getContact(id),
    create: createContact, update: updateContact, key: 'contact',
  },
  deals: {
    all: getDeals,
    one: (id) => getDeal(id),
    create: createDeal, update: updateDeal, key: 'deal',
  },
  activities: {
    all: getActivities,
    one: (id) => getActivity(id),
    create: createActivity, update: updateActivity, key: 'activity',
  },
  leads: {
    all: getLeads,
    create: createLead, update: updateLead, key: 'lead',
  },
  products: {
    all: getProducts,
  },
  quotes: {
    all: getQuotes,
    create: createQuote, update: updateQuote, key: 'quote',
  },
  invoices: {
    all: getInvoices,
    update: updateInvoice, key: 'invoice',
  },
  campaigns: {
    all: getCampaigns,
  },
  sequences: {
    all: getSequences,
  },
  tickets: {
    all: getTickets,
    update: updateTicket, key: 'ticket',
  },
  workflows: {
    all: getWorkflows,
  },
};

function handler(entity) {
  if (!isEntity(entity) || !H[entity]) return null;
  return H[entity];
}

// Fallback single-record lookup for entities whose store exposes no
// dedicated getX(id): scan the list for a matching id.
function findById(h, id) {
  if (h.one) return h.one(id);
  const list = h.all ? h.all() : [];
  return list.find((r) => r && r.id === id) || null;
}

export class LocalAdapter extends DataAdapter {
  constructor() {
    super('local');
    this._subs = new Set();
  }

  _emit() {
    this._subs.forEach((fn) => {
      try { fn(); } catch { /* subscriber threw; ignore */ }
    });
  }

  async list(entity, query) {
    const h = handler(entity);
    if (!h || !h.all) return fail('unknown_entity', `Unknown entity "${entity}".`);
    return ok(applyQuery(h.all(), query));
  }

  async get(entity, id) {
    const h = handler(entity);
    if (!h) return fail('unknown_entity', `Unknown entity "${entity}".`);
    const rec = findById(h, id);
    return rec ? ok(rec) : fail('not_found', `${entity} ${id} not found.`);
  }

  async create(entity, patch) {
    const h = handler(entity);
    if (!h) return fail('unknown_entity', `Unknown entity "${entity}".`);
    if (!h.create) return fail('unsupported', `Local backend cannot create ${entity}.`);
    const res = fromWriter(h.create(patch || {}), h.key);
    if (!res.error) this._emit();
    return res;
  }

  async update(entity, id, patch) {
    const h = handler(entity);
    if (!h) return fail('unknown_entity', `Unknown entity "${entity}".`);
    if (!h.update) return fail('unsupported', `Local backend cannot update ${entity}.`);
    const res = fromWriter(h.update(id, patch || {}), h.key);
    if (!res.error) this._emit();
    return res;
  }

  // The local stores intentionally have no hard-delete (matching the
  // demo's append-only behavior today). Delete lights up under the
  // Supabase backend. Reporting unsupported keeps the abstraction
  // honest instead of faking a no-op success.
  async remove(entity, id) {
    const h = handler(entity);
    if (!h) return fail('unknown_entity', `Unknown entity "${entity}".`);
    return fail('unsupported', `Local backend does not support deleting ${entity}. Enable the Supabase backend for hard delete.`);
  }

  // Fires after any write routed through this adapter. Note: mutations
  // made by calling store.js writers directly still reach React through
  // useStore()/useExt(); useData() subscribes to both paths.
  subscribe(fn) {
    if (typeof fn !== 'function') return () => {};
    this._subs.add(fn);
    return () => this._subs.delete(fn);
  }
}

let _instance = null;
export function getLocalAdapter() {
  if (!_instance) _instance = new LocalAdapter();
  return _instance;
}
