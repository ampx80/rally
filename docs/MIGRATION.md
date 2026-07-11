# Live CRM migration (Salesforce + HubSpot)

Rally can pull `accounts / contacts / deals` (and Salesforce `leads`) straight
from a source CRM over its API, in addition to the CSV upload path. The API
pull and the CSV upload converge on the SAME importer, so pulled records dedupe,
map onto the field registry, and write through the store exactly like a CSV row.

The whole feature is **additive and env-gated**. With no source client env set,
the endpoints return `{ configured: false }` and the panel shows a "set up API
keys or use CSV" fallback. The CSV import path is never touched.

## Pieces

| File | Role |
| --- | --- |
| `api/migrate-start.js` | `GET /api/migrate-start?source=salesforce\|hubspot` -> provider consent URL, or `{ configured:false, message }`. |
| `api/migrate-callback.js` | OAuth redirect target. Exchanges the code, seals the access token into a short-lived httpOnly cookie, redirects to `/import?migrate=1&source=..&status=connected`. |
| `api/migrate-pull.js` | `GET /api/migrate-pull?source=..&object=contact\|company\|deal\|lead` -> normalized Rally-keyed records (paginated + bounded). |
| `api/_lib-migrate.js` | Provider registry, record normalizers, sealed-cookie helpers. Server only. |
| `src/lib/migrate.js` | Browser helpers: `connectSource`, `pullObjects`, `importPulled`, source metadata + pre-maps. Reuses `importer.autoMap` + `importer.runImport`. |
| `src/components/migrate/MigratePanel.jsx` | Connect -> pick object -> preview -> import UI for the Import page. |

## OAuth apps to create

### Salesforce (Connected App)
1. Setup -> App Manager -> New Connected App.
2. Enable OAuth Settings. Callback URL: `https://<your-rally-domain>/api/migrate-callback?source=salesforce`.
3. Scopes: `api`, `refresh_token` (offline access). Rally requests `api refresh_token offline_access` by default.
4. Copy the Consumer Key + Consumer Secret.

### HubSpot (Public/Private App)
1. HubSpot developer account -> Create app.
2. Auth tab. Redirect URL: `https://<your-rally-domain>/api/migrate-callback?source=hubspot`.
3. Scopes: `crm.objects.contacts.read`, `crm.objects.companies.read`, `crm.objects.deals.read`.
4. Copy the Client ID + Client Secret.

## Environment variables (Vercel)

| Var | Required | Notes |
| --- | --- | --- |
| `SALESFORCE_CLIENT_ID` | Salesforce | Connected App consumer key. |
| `SALESFORCE_CLIENT_SECRET` | Salesforce | Consumer secret. Also derives the token-cookie encryption key. |
| `SALESFORCE_LOGIN_URL` | optional | `login.salesforce.com` (default) or `test.salesforce.com` for a sandbox. |
| `SALESFORCE_SCOPES` | optional | Override the requested scope string. |
| `HUBSPOT_CLIENT_ID` | HubSpot | App client id. |
| `HUBSPOT_CLIENT_SECRET` | HubSpot | Client secret. Also derives the token-cookie encryption key. |
| `HUBSPOT_SCOPES` | optional | Override the requested scope string (must match the app config). |

A source is "configured" only when BOTH its client id AND secret are present.

## Object mappings (provider field -> Rally field key)

### Salesforce
| Rally object | SObject | Mapping |
| --- | --- | --- |
| contact | Contact | FirstName->firstName, LastName->lastName, Email->email, Phone->phone, Title->title |
| company | Account | Name->name, Website->domain (bare host), Industry->industry, NumberOfEmployees->size, BillingCity+BillingCountry->location |
| deal | Opportunity | Name->name, Amount->value, StageName->stage, CloseDate->closeDate |
| lead | Lead | FirstName->firstName, LastName->lastName, Company->company, Title->title, Email->email |

### HubSpot
| Rally object | HS object | Mapping |
| --- | --- | --- |
| contact | contacts | firstname->firstName, lastname->lastName, email->email, phone->phone, jobtitle->title |
| company | companies | name->name, domain->domain, industry->industry, numberofemployees->size, city+country->location |
| deal | deals | dealname->name, amount->value, dealstage->stage, closedate->closeDate |

Records come back keyed by Rally field keys, so `importer.autoMap` resolves them
to an identity mapping and `importer.runImport` writes them with the normal
dedupe (contacts/leads on email, companies/deals on name).

## Limits (best-effort by design)

- Paginated: Salesforce follows `nextRecordsUrl`; HubSpot follows `paging.next.after`.
- Bounded: max 20 pages, max ~2000 records per pull, page size 100. `hasMore:true`
  is returned when more remain; run the pull again after importing to continue.
- On any provider/API error the pull returns `{ error }` with the records it has
  (or none) instead of a 500, so the wizard never hard-fails.
- The access token rides in an AES-256-GCM sealed, httpOnly, Secure, SameSite=Lax
  cookie keyed off the OAuth client secret. It is never exposed to client JS or a
  URL, and it expires in ~55 minutes. Tokens are not persisted server-side (a
  Supabase-vault refresh-token store is a future follow-up, same as `oauth-callback.js`).

## Wiring into the Import page

`src/pages/ImportData.jsx` is intentionally untouched. To surface the panel, add
one import and render `<MigratePanel />` as a sibling card. See the report /
"Wiring" section for the exact two-line diff.
