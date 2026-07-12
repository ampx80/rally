// ============================================================
// RALLY CONNECTOR  (abstract base class - the contract)
// Every real integration extends this. The base wires the parts
// that are the SAME for all connectors - status + connect/disconnect
// go through connections.js, inbound identity goes through
// resolve-link.js, and the "via <app>" provenance stamp is produced
// one canonical way - and leaves the app-specific parts (sync,
// handleWebhook, mapRecord) as clearly-marked NotImplemented seams.
//
// No concrete connectors ship yet (by design): this is the shape
// they slot into. A connector is constructed from a registry
// descriptor, so `new Connector(integrationById('tango'))` already
// knows its events + fields.
//
// SECURITY: connect() forwards its metadata straight to
// connections.connect(), which sanitizes secrets out before any
// persistence. Real credential exchange happens server-side; a
// concrete connect() override should hit a server route, then call
// super.connect(nonSecretMeta) to record the local status.
//
// SUPABASE: subclasses call server routes; the base's status writes
// map to rally_connections rows.
// ============================================================
import { integrationById } from './registry.js';
import { connect as connConnect, disconnect as connDisconnect, beginConnecting, setConnectionError, connectionStatus } from './connections.js';
import { resolve as resolveIdentity } from './resolve-link.js';

class NotImplemented extends Error {
  constructor(method, id) {
    super(`Connector.${method} not implemented for "${id}". A concrete connector must override it.`);
    this.name = 'NotImplemented';
    this.method = method;
    this.connectorId = id;
  }
}

export class Connector {
  // Accepts a descriptor object OR an integration id string.
  constructor(descriptor) {
    const d = typeof descriptor === 'string' ? integrationById(descriptor) : descriptor;
    if (!d || !d.id) throw new Error('Connector requires a valid registry descriptor.');
    this.descriptor = d;
    this.id = d.id;
  }

  /* ---------- status (shared) ---------- */
  get status() { return connectionStatus(this.id); }
  isConnected() { return this.status === 'connected'; }

  /* ---------- lifecycle (shared defaults; override for real auth) ----------
     Base connect() is optimistic-then-committed against connections.js and
     performs NO network I/O. A real connector overrides this to exchange
     credentials with a server route, then calls super.connect(safeMeta). */
  async connect(metadata = {}) {
    beginConnecting(this.id, metadata);
    try {
      return connConnect(this.id, metadata); // secrets stripped inside
    } catch (err) {
      setConnectionError(this.id, err?.message || 'Connect failed');
      throw err;
    }
  }

  async disconnect() {
    return connDisconnect(this.id);
  }

  /* ---------- identity (shared) ----------
     Resolve an external actor to Rally ids via resolve-link.js. Subclasses
     use this inside handleWebhook to decide where an event lands. */
  resolveIdentity({ email, domain, name } = {}) {
    return resolveIdentity({ email, domain, name });
  }

  /* ---------- provenance (shared) ----------
     The canonical passthrough a connector attaches to any record it writes,
     so the timeline can render a "via <app>" chip and an open-in-source link.
     Feed the return value straight into createActivity(...) once the store's
     passthrough edit lands (see the ActivityTimeline wiring note). */
  via(externalId, externalUrl) {
    return {
      source: this.id,
      externalId: externalId != null ? String(externalId) : null,
      externalUrl: externalUrl || null,
    };
  }

  /* ---------- app-specific seams (must override) ---------- */

  // Pull records from the source app into Rally.
  // Expected return: { imported, linked, unlinked } counts.
  async sync() { throw new NotImplemented('sync', this.id); }

  // Handle one inbound webhook payload from the source app.
  // Expected: resolve identity, map the record, write an activity/record,
  // or park it via resolve-link.addUnlinked when unmatched.
  handleWebhook(/* payload */) { throw new NotImplemented('handleWebhook', this.id); }

  // Normalize one external record into a Rally-shaped object
  // (e.g. an activity draft { type, subject, ...this.via(id, url) }).
  mapRecord(/* externalRecord */) { throw new NotImplemented('mapRecord', this.id); }
}

export { NotImplemented };

// Factory: build a base connector from an id/descriptor. Concrete connectors
// will register themselves here later; for now every id resolves to the base
// contract so callers can introspect events/fields without a subclass.
export function makeConnector(idOrDescriptor) {
  return new Connector(idOrDescriptor);
}
