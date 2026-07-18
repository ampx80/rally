// ============================================================
// ARDOVO MIGRATION LIB (shared, server-only)
// Provider metadata + record normalizers for the "migrate straight
// from Salesforce / HubSpot" flow, plus the sealed-cookie helpers
// that carry a short-lived access token between the OAuth callback
// and the pull endpoint WITHOUT ever exposing it to client JS or a
// URL. Additive + env-gated: nothing here runs unless the source's
// client env (SALESFORCE_CLIENT_ID / HUBSPOT_CLIENT_ID + secret) is
// set. Normalizers emit Ardovo field KEYS so pulled records flow
// through the exact same importer.autoMap + importer.runImport path
// a CSV upload uses. NO em-dash / en-dash anywhere.
// ============================================================
import crypto from 'node:crypto';

export const SF_API_VERSION = 'v59.0';

// Strip protocol / path so a website becomes a bare domain (Ardovo's
// company.domain shape). Best-effort; returns '' on junk.
function bareDomain(raw) {
  if (!raw) return '';
  let s = String(raw).trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  s = s.split(/[/?#]/)[0];
  return s.toLowerCase();
}

function joinLoc(...parts) {
  return parts.map(p => (p == null ? '' : String(p).trim())).filter(Boolean).join(', ');
}

// ------------------------------------------------------------
// Provider registry. Each object declares how to fetch it and how to
// turn one raw provider record into a Ardovo-keyed row. Object ids
// match Ardovo importer object ids (contact / company / deal / lead).
// ------------------------------------------------------------
export const PROVIDERS = {
  salesforce: {
    id: 'salesforce',
    label: 'Salesforce',
    clientIdEnv: 'SALESFORCE_CLIENT_ID',
    clientSecretEnv: 'SALESFORCE_CLIENT_SECRET',
    // login.salesforce.com for prod, test.salesforce.com for sandbox.
    loginHost: () => (process.env.SALESFORCE_LOGIN_URL || 'login.salesforce.com').replace(/^https?:\/\//, '').replace(/\/+$/, ''),
    scope: () => process.env.SALESFORCE_SCOPES || 'api refresh_token offline_access',
    objects: {
      contact: {
        label: 'Contacts',
        soql: 'SELECT Id, FirstName, LastName, Email, Phone, Title FROM Contact',
        fields: [
          { key: 'firstName', label: 'First name' }, { key: 'lastName', label: 'Last name' },
          { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' }, { key: 'title', label: 'Title' },
        ],
        normalize: (r) => ({
          firstName: r.FirstName || '', lastName: r.LastName || '',
          email: r.Email || '', phone: r.Phone || '', title: r.Title || '',
        }),
      },
      company: {
        label: 'Accounts',
        soql: 'SELECT Id, Name, Website, Industry, NumberOfEmployees, BillingCity, BillingCountry FROM Account',
        fields: [
          { key: 'name', label: 'Name' }, { key: 'domain', label: 'Domain' }, { key: 'industry', label: 'Industry' },
          { key: 'size', label: 'Size' }, { key: 'location', label: 'Location' },
        ],
        normalize: (r) => ({
          name: r.Name || '', domain: bareDomain(r.Website),
          industry: r.Industry || '', size: r.NumberOfEmployees != null ? String(r.NumberOfEmployees) : '',
          location: joinLoc(r.BillingCity, r.BillingCountry),
        }),
      },
      deal: {
        label: 'Opportunities',
        soql: 'SELECT Id, Name, Amount, StageName, CloseDate FROM Opportunity',
        fields: [
          { key: 'name', label: 'Name' }, { key: 'value', label: 'Value' },
          { key: 'stage', label: 'Stage' }, { key: 'closeDate', label: 'Close date' },
        ],
        normalize: (r) => ({
          name: r.Name || '', value: r.Amount != null ? String(r.Amount) : '',
          stage: r.StageName || '', closeDate: r.CloseDate || '',
        }),
      },
      lead: {
        label: 'Leads',
        soql: 'SELECT Id, FirstName, LastName, Company, Title, Email FROM Lead',
        fields: [
          { key: 'firstName', label: 'First name' }, { key: 'lastName', label: 'Last name' },
          { key: 'company', label: 'Company' }, { key: 'title', label: 'Title' }, { key: 'email', label: 'Email' },
        ],
        normalize: (r) => ({
          firstName: r.FirstName || '', lastName: r.LastName || '', company: r.Company || '',
          title: r.Title || '', email: r.Email || '',
        }),
      },
    },
  },

  hubspot: {
    id: 'hubspot',
    label: 'HubSpot',
    clientIdEnv: 'HUBSPOT_CLIENT_ID',
    clientSecretEnv: 'HUBSPOT_CLIENT_SECRET',
    scope: () => process.env.HUBSPOT_SCOPES || 'crm.objects.contacts.read crm.objects.companies.read crm.objects.deals.read',
    objects: {
      contact: {
        label: 'Contacts',
        hsObject: 'contacts',
        hsProps: ['firstname', 'lastname', 'email', 'phone', 'jobtitle'],
        fields: [
          { key: 'firstName', label: 'First name' }, { key: 'lastName', label: 'Last name' },
          { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' }, { key: 'title', label: 'Title' },
        ],
        normalize: (r) => {
          const p = r.properties || {};
          return { firstName: p.firstname || '', lastName: p.lastname || '', email: p.email || '', phone: p.phone || '', title: p.jobtitle || '' };
        },
      },
      company: {
        label: 'Companies',
        hsObject: 'companies',
        hsProps: ['name', 'domain', 'industry', 'numberofemployees', 'city', 'country'],
        fields: [
          { key: 'name', label: 'Name' }, { key: 'domain', label: 'Domain' }, { key: 'industry', label: 'Industry' },
          { key: 'size', label: 'Size' }, { key: 'location', label: 'Location' },
        ],
        normalize: (r) => {
          const p = r.properties || {};
          return { name: p.name || '', domain: bareDomain(p.domain), industry: p.industry || '', size: p.numberofemployees || '', location: joinLoc(p.city, p.country) };
        },
      },
      deal: {
        label: 'Deals',
        hsObject: 'deals',
        hsProps: ['dealname', 'amount', 'dealstage', 'closedate'],
        fields: [
          { key: 'name', label: 'Name' }, { key: 'value', label: 'Value' },
          { key: 'stage', label: 'Stage' }, { key: 'closeDate', label: 'Close date' },
        ],
        normalize: (r) => {
          const p = r.properties || {};
          return { name: p.dealname || '', value: p.amount || '', stage: p.dealstage || '', closeDate: (p.closedate || '').slice(0, 10) };
        },
      },
    },
  },
};

export function getProvider(source) {
  return PROVIDERS[String(source || '').toLowerCase()] || null;
}

// A source is "configured" when both its client id AND secret are set.
export function isConfigured(source) {
  const p = getProvider(source);
  if (!p) return false;
  return Boolean(process.env[p.clientIdEnv] && process.env[p.clientSecretEnv]);
}

// The list of object ids this source can migrate (for the UI).
export function sourceObjectMeta(source) {
  const p = getProvider(source);
  if (!p) return [];
  return Object.entries(p.objects).map(([id, o]) => ({ id, label: o.label, fields: o.fields }));
}

// ------------------------------------------------------------
// Sealed token cookie. AES-256-GCM, key derived from the source's
// OAuth client secret (always present when configured), so the token
// blob in the browser cookie is opaque and useless off-server. The
// cookie is httpOnly + Secure + SameSite=Lax so client JS never sees
// it and it never rides in a URL.
// ------------------------------------------------------------
function keyFor(source) {
  const p = getProvider(source);
  const secret = (p && process.env[p.clientSecretEnv]) || 'rally-migrate-fallback-key';
  return crypto.createHash('sha256').update(String(secret) + '::rally-migrate').digest();
}

export function cookieName(source) {
  return source === 'salesforce' ? 'rl_mig_sf' : source === 'hubspot' ? 'rl_mig_hs' : 'rl_mig';
}

export function sealToken(source, payload) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyFor(source), iv);
  const ct = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString('base64url');
}

export function openToken(source, value) {
  try {
    const buf = Buffer.from(String(value || ''), 'base64url');
    if (buf.length < 29) return null;
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const ct = buf.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyFor(source), iv);
    decipher.setAuthTag(tag);
    const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
    const obj = JSON.parse(pt.toString('utf8'));
    if (obj && obj.exp && Date.now() > obj.exp) return null; // expired
    return obj;
  } catch {
    return null;
  }
}

// Build a Set-Cookie header value for the sealed token (or a clearing one).
export function setTokenCookie(source, sealed, maxAgeSec = 3600) {
  const name = cookieName(source);
  if (sealed == null) {
    return `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
  }
  return `${name}=${sealed}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSec}`;
}

// Read one cookie value out of a raw Cookie header.
export function readCookie(req, name) {
  const raw = (req.headers && req.headers.cookie) || '';
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    if (k === name) return part.slice(idx + 1).trim();
  }
  return null;
}

// Resolve the deployed origin from proxy headers (same trick oauth-* uses).
export function originOf(req) {
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}
