# Rally Data Layer

An additive abstraction that lets Rally run local-first today and flip to
Supabase-backed, multi-tenant persistence with a single environment flag, with
no page rewrites. It is 100% no-op-safe: when Supabase is not configured, the
app behaves exactly as it does now.

## Why

Every page today reads and writes the local-first stores directly
(`src/lib/store.js`, `src/lib/store-ext.js`). That is great for a demo but
couples every page to one backend. The data layer inserts a thin, uniform
adapter between pages and storage. Pages ask an adapter for data; the adapter
decides where the data lives. Flip one flag and the same pages read from
Supabase instead of localStorage.

## The pieces

```
src/lib/data-layer/
  adapter.js           Interface + shared query helpers (matchesWhere, applyQuery)
  local-adapter.js     Wraps store.js + store-ext.js. Default. Identical to today.
  supabase-adapter.js  Org-scoped Supabase CRUD + realtime. Used only when configured.
  index.js             getDataLayer() flag selection + useData() React hook
src/lib/supabase-browser.js   Lazy, guarded browser client (shared, never built at import)
```

Nothing in the existing app imports the data layer yet. It is inert until a
page opts in.

## The adapter interface

Every backend implements the same six methods. All are async and resolve to a
uniform `{ data, error }` shape (on success `error` is `null`; on failure
`data` is `null` and `error` is `{ code, message }`).

```js
list(entity, query)       // -> { data: Row[], error }
get(entity, id)           // -> { data: Row,   error }
create(entity, patch)     // -> { data: Row,   error }
update(entity, id, patch) // -> { data: Row,   error }
remove(entity, id)        // -> { data,        error }
subscribe(fn)             // -> unsubscribe()
```

`entity` is one of the canonical names in `adapter.js` `ENTITIES`:
`users, companies, contacts, deals, activities, leads, products, quotes,
invoices, campaigns, sequences, tickets, workflows`.

`query` is an optional portable object, identical across both backends:

```js
{
  where:   { ownerId: 'u_1', status: ['open', 'won'] }, // equality; array = IN
  orderBy: 'closeDate',
  dir:     'asc' | 'desc',   // default 'asc'
  limit:   50,
}
```

The LocalAdapter runs the query in memory; the SupabaseAdapter translates the
same object into `.eq` / `.in` / `.order` / `.limit`. Write a query once, it
works on both.

## The flag

The adapter is chosen once, by `getDataLayer()`:

```
VITE_DATA_BACKEND === 'supabase'  AND  Supabase client configured
  -> SupabaseAdapter
otherwise
  -> LocalAdapter  (the default, unchanged behavior)
```

Both conditions are required. If the flag says `supabase` but the client is not
configured, the layer logs one warning and falls back to local, so a
misconfiguration never breaks the app.

### Environment variables

| Variable                 | Purpose                                              | Default |
| ------------------------ | ---------------------------------------------------- | ------- |
| `VITE_DATA_BACKEND`      | `supabase` to opt in; anything else stays local      | local   |
| `VITE_SUPABASE_URL`      | Supabase project URL (public)                        | unset   |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (public)                           | unset   |
| `VITE_RALLY_ORG_ID`      | Tenant id stamped on every row and every query       | default |

With none of these set (the current state), Rally runs local-first exactly as
before.

## The React hook

`useData(entity, query)` is what pages adopt. It stays live in both backends:
locally through the existing store pub/sub, remotely through Supabase realtime.

```js
import { useData } from '../lib/data-layer';

const { data, loading, error, refresh, create, update, remove } =
  useData('deals', { where: { status: 'open' }, orderBy: 'value', dir: 'desc' });
```

- `data` is always an array (the list result).
- `loading` is true until the first list resolves.
- `create/update/remove` are bound to the entity and return `{ data, error }`.

## Multi-tenant model (Supabase backend)

- Tables are `rally_<entity>` (`rally_companies`, `rally_deals`, ...).
- Every row carries `org_id`. Every read filters on it; every insert stamps it;
  `org_id` is never patchable through `update`.
- `remove` is a hard delete scoped to the org.
- Realtime: one channel per session fans out row changes to all `useData`
  subscribers, which re-list automatically.
- Column shape: the local seed uses camelCase fields (`companyId`, `closeDate`).
  Define the Supabase columns to match the field names the pages already send,
  or add a mapping layer in `supabase-adapter.js`. This is the one migration
  detail to settle before turning the flag on in production.

## Migrating one page (worked example: Deals)

The goal is to swap direct store calls for the data layer without changing what
the user sees. Do it one page at a time; unmigrated pages keep working.

Today `src/pages/Deals.jsx` does:

```js
import { useStore, getDeals, createDeal, updateDeal, moveDealStage } from '../lib/store.js';

useStore();
const deals = getDeals();
const r = createDeal({ ... });
updateDeal(row.id, { value: Number(val) });
```

Step 1 - add the hook alongside the existing imports (do not remove anything
yet):

```js
import { useData } from '../lib/data-layer';
```

Step 2 - replace the read. Swap `useStore()` + `getDeals()` for one hook call:

```js
const { data: deals, create, update } = useData('deals');
```

`deals` is now an array sourced from the active backend. Everything downstream
(`applyView(deals, ...)`, the Kanban board, the table) is unchanged because the
row shape is identical.

Step 3 - replace the writes:

```js
// was: const r = createDeal({ name, companyId, value, stage, closeDate, ownerId });
const r = await create({ name, companyId, value, stage, closeDate, ownerId });
if (r.error) return toast(r.error.message, 'risk');

// was: updateDeal(row.id, { value: Number(val) });
const u = await update(row.id, { value: Number(val) });
if (u.error) toast(u.error.message, 'risk');
```

Note the error shape changes from `r.message` to `r.error.message`.

Step 4 - domain-specific writers that have no data-layer equivalent yet (for
example `moveDealStage`, which also writes a system activity) can keep calling
the store directly for now, or move to `update('deals', id, { stage, ... })`
once the Supabase schema handles the side effects. Mixing is safe: local store
writes still reach `useData` through the shared pub/sub.

Step 5 - verify locally with the flag off (default). The page should behave
identically. Then set `VITE_DATA_BACKEND=supabase` plus the Supabase env vars in
a preview deploy to exercise the remote path.

## Adopt incrementally, safely

- Start with a read-heavy page (Deals, Contacts, Companies).
- Migrate reads first, then writes.
- Leave complex domain writers (stage moves, audit-logged patches) on the store
  until the remote schema covers their side effects.
- No page is required to migrate; the data layer and the direct-store pages
  coexist because both share the same underlying local stores.

## Guarantees

- No existing file was modified (`store.js`, `store-ext.js`, `App.jsx`,
  `index.css`, `package.json`, `vercel.json` are untouched).
- With Supabase unconfigured, every code path resolves through the LocalAdapter;
  nothing here touches the network or throws at import time.
- ASCII only, no em-dash or en-dash, per Rally house rules.
