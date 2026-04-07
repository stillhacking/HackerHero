/**
 * @fileoverview IndexedDB Database Layer for HackerHero
 *
 * All application data is persisted in the browser's IndexedDB.
 * This module exposes a `DB` object with Promise-based CRUD methods
 * for every entity type.  No network requests are ever made.
 *
 * Database name  : HackerHeroDB
 * Schema version : 7
 *
 * Object stores:
 *  ┌──────────────────┬────────────────────────────────────────────────────┐
 *  │ settings         │ key-value application settings                     │
 *  │ missions         │ red team operation records                         │
 *  │ zones            │ network zone definitions (per mission)             │
 *  │ assets           │ machines / applications (per zone, tree structure) │
 *  │ assetVersions    │ historical snapshots of asset state                │
 *  │ subitems         │ sub-items attached to assets (tree children)       │
 *  │ changelog        │ full audit log (per mission)                       │
 *  │ subitemVersions  │ historical snapshots of subitem state              │
 *  │ tickets          │ tickets linked to zones/assets/subitems            │
 *  │ ticketMessages   │ conversation messages inside tickets               │
 *  │ attachments      │ image attachments on assets / subitems / tickets   │
 *  └──────────────────┴────────────────────────────────────────────────────┘
 *
 * @module db
 */

const DB_NAME    = 'HackerHeroDB';
const DB_VERSION = 7;

/** Cached IDBDatabase instance */
let _db = null;

// ─────────────────────────────────────────────────────────────────────────────
//  OPEN / UPGRADE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Opens (or creates) the IndexedDB database.
 * Idempotent – returns the cached instance on subsequent calls.
 * @returns {Promise<IDBDatabase>}
 */
function openDatabase() {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onerror   = () => reject(req.error);
    req.onsuccess = () => { _db = req.result; resolve(_db); };

    req.onupgradeneeded = (event) => {
      const db = event.target.result;

      // ── settings ──────────────────────────────────────────────────────────
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }

      // ── missions ──────────────────────────────────────────────────────────
      if (!db.objectStoreNames.contains('missions')) {
        const s = db.createObjectStore('missions', { keyPath: 'id' });
        s.createIndex('by-codename',   'codename',   { unique: false });
        s.createIndex('by-created',    'createdAt',  { unique: false });
      }

      // ── zones ─────────────────────────────────────────────────────────────
      if (!db.objectStoreNames.contains('zones')) {
        const s = db.createObjectStore('zones', { keyPath: 'id' });
        s.createIndex('by-mission',    'missionId',  { unique: false });
      }

      // ── assets ────────────────────────────────────────────────────────────
      if (!db.objectStoreNames.contains('assets')) {
        const s = db.createObjectStore('assets', { keyPath: 'id' });
        s.createIndex('by-mission',    'missionId',  { unique: false });
        s.createIndex('by-zone',       'zoneIds',    { unique: false, multiEntry: true });
        s.createIndex('by-parent',     'parentId',   { unique: false });
      }

      // ── assetVersions ─────────────────────────────────────────────────────
      if (!db.objectStoreNames.contains('assetVersions')) {
        const s = db.createObjectStore('assetVersions', { keyPath: 'id' });
        s.createIndex('by-asset',      'assetId',    { unique: false });
        s.createIndex('by-timestamp',  'timestamp',  { unique: false });
      }

      // ── subitems ──────────────────────────────────────────────────────────
      if (!db.objectStoreNames.contains('subitems')) {
        const s = db.createObjectStore('subitems', { keyPath: 'id' });
        s.createIndex('by-asset',      'assetId',    { unique: false });
        s.createIndex('by-parent',     'parentId',   { unique: false });
      }

      // ── changelog ─────────────────────────────────────────────────────────
      if (!db.objectStoreNames.contains('changelog')) {
        const s = db.createObjectStore('changelog', { keyPath: 'id' });
        s.createIndex('by-mission',    'missionId',  { unique: false });
        s.createIndex('by-timestamp',  'timestamp',  { unique: false });
      }

      // ── subitemVersions (v2) ──────────────────────────────────────────────
      if (!db.objectStoreNames.contains('subitemVersions')) {
        const s = db.createObjectStore('subitemVersions', { keyPath: 'id' });
        s.createIndex('by-subitem',    'subitemId',  { unique: false });
        s.createIndex('by-timestamp',  'timestamp',  { unique: false });
      }
      // ── tickets (v3) ─────────────────────────────────────────────────
      if (!db.objectStoreNames.contains('tickets')) {
        const s = db.createObjectStore('tickets', { keyPath: 'id' });
        s.createIndex('by-mission',    'missionId',  { unique: false });
        s.createIndex('by-ref',        'refId',      { unique: false });
      }

      // ── ticketMessages (v3) ──────────────────────────────────────────
      if (!db.objectStoreNames.contains('ticketMessages')) {
        const s = db.createObjectStore('ticketMessages', { keyPath: 'id' });
        s.createIndex('by-ticket',     'ticketId',   { unique: false });
      }

      // ── attachments (v4) ────────────────────────────────────────────
      if (!db.objectStoreNames.contains('attachments')) {
        const s = db.createObjectStore('attachments', { keyPath: 'id' });
        s.createIndex('by-ref', 'refId', { unique: false });
        s.createIndex('by-mission', 'missionId', { unique: false });
      }

      // ── intelligence (v5) ─────────────────────────────────────────────
      if (!db.objectStoreNames.contains('intelligence')) {
        const s = db.createObjectStore('intelligence', { keyPath: 'id' });
        s.createIndex('by-mission', 'missionId', { unique: false });
        s.createIndex('by-type',    'type',      { unique: false });
      }

      // ── v7 migration: assets zoneId → zoneIds (multi-zone), safe version ────
      if (event.oldVersion > 0 && event.oldVersion < 7 && db.objectStoreNames.contains('assets')) {
        const store = event.target.transaction.objectStore('assets');
        // Recreate by-zone index as multiEntry on zoneIds array
        if (store.indexNames.contains('by-zone')) store.deleteIndex('by-zone');
        store.createIndex('by-zone', 'zoneIds', { unique: false, multiEntry: true });
        // Lazy cursor migration: zoneId (string) → zoneIds (array)
        const req = store.openCursor();
        req.onerror = (e) => { e.stopPropagation(); console.warn('[DB v7] cursor open error', e.target.error); };
        req.onsuccess = (ev) => {
          const cursor = ev.target.result;
          if (!cursor) return;
          const rec = cursor.value;
          if (!Array.isArray(rec.zoneIds)) {
            const updated = Object.assign({}, rec, { zoneIds: rec.zoneId ? [rec.zoneId] : [] });
            delete updated.zoneId;
            const upd = cursor.update(updated);
            upd.onerror = (e) => { e.stopPropagation(); console.warn('[DB v7] update error for', rec.id, e.target.error); };
          }
          cursor.continue();
        };
      }
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wraps an IDBRequest in a Promise.
 * @param {IDBRequest} req
 * @returns {Promise<any>}
 */
function wrap(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

/**
 * Returns all records from a store.
 * @param {string} storeName
 * @returns {Promise<any[]>}
 */
async function getAll(storeName) {
  const db = await openDatabase();
  const tx = db.transaction(storeName, 'readonly');
  return wrap(tx.objectStore(storeName).getAll());
}

/**
 * Returns records from an index matching a value.
 * @param {string} storeName
 * @param {string} indexName
 * @param {IDBValidKey} value
 * @returns {Promise<any[]>}
 */
async function getAllByIndex(storeName, indexName, value) {
  const db = await openDatabase();
  const tx = db.transaction(storeName, 'readonly');
  return wrap(tx.objectStore(storeName).index(indexName).getAll(value));
}

/**
 * Gets a single record by primary key.
 * @param {string} storeName
 * @param {IDBValidKey} id
 * @returns {Promise<any|undefined>}
 */
async function getOne(storeName, id) {
  const db = await openDatabase();
  const tx = db.transaction(storeName, 'readonly');
  return wrap(tx.objectStore(storeName).get(id));
}

/**
 * Puts (insert or replace) a record into a store.
 * @param {string} storeName
 * @param {object} record
 * @returns {Promise<IDBValidKey>} The stored key
 */
async function putOne(storeName, record) {
  const db = await openDatabase();
  const tx = db.transaction(storeName, 'readwrite');
  return wrap(tx.objectStore(storeName).put(record));
}

/**
 * Deletes a record by primary key.
 * @param {string} storeName
 * @param {IDBValidKey} id
 * @returns {Promise<void>}
 */
async function deleteOne(storeName, id) {
  const db = await openDatabase();
  const tx = db.transaction(storeName, 'readwrite');
  return wrap(tx.objectStore(storeName).delete(id));
}

/**
 * Deletes all records matching an index value.
 * @param {string} storeName
 * @param {string} indexName
 * @param {IDBValidKey} value
 * @returns {Promise<void>}
 */
async function deleteByIndex(storeName, indexName, value) {
  const records = await getAllByIndex(storeName, indexName, value);
  for (const r of records) {
    await deleteOne(storeName, r.id);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

export const DB = {

  // ── SETTINGS ─────────────────────────────────────────────────────────────

  /** @param {string} key @returns {Promise<any>} */
  async getSetting(key) {
    const record = await getOne('settings', key);
    return record ? record.value : undefined;
  },

  /** @param {string} key @param {*} value @returns {Promise<void>} */
  async setSetting(key, value) {
    await putOne('settings', { key, value });
  },

  // ── MISSIONS ─────────────────────────────────────────────────────────────

  /** @returns {Promise<Mission[]>} All missions, newest first */
  async getAllMissions() {
    const all = await getAll('missions');
    return all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  /** @param {string} id @returns {Promise<Mission|undefined>} */
  async getMission(id) {
    return getOne('missions', id);
  },

  /** @param {Mission} mission @returns {Promise<void>} */
  async saveMission(mission) {
    await putOne('missions', mission);
  },

  /**
   * Deletes a mission and ALL associated data (zones, assets, subitems,
   * assetVersions, changelog entries).
   * @param {string} missionId
   * @returns {Promise<void>}
   */
  async deleteMission(missionId) {
    // Cascade delete assets and their sub-items / versions / attachments
    const assets = await getAllByIndex('assets', 'by-mission', missionId);
    for (const asset of assets) {
      const subs = await getAllByIndex('subitems', 'by-asset', asset.id);
      for (const sub of subs) {
        await deleteByIndex('subitemVersions', 'by-subitem', sub.id);
        await deleteByIndex('attachments', 'by-ref', sub.id);
      }
      await deleteByIndex('subitems',      'by-asset',   asset.id);
      await deleteByIndex('assetVersions', 'by-asset',   asset.id);
      await deleteByIndex('attachments',   'by-ref',     asset.id);
      await deleteOne('assets', asset.id);
    }
    // Delete zone attachments
    const zones = await getAllByIndex('zones', 'by-mission', missionId);
    for (const zone of zones) {
      await deleteByIndex('attachments', 'by-ref', zone.id);
    }
    // Delete tickets, their messages, and their attachments
    const tickets = await getAllByIndex('tickets', 'by-mission', missionId);
    for (const ticket of tickets) {
      const msgs = await getAllByIndex('ticketMessages', 'by-ticket', ticket.id);
      for (const m of msgs) {
        await deleteByIndex('attachments', 'by-ref', m.id);
        await deleteOne('ticketMessages', m.id);
      }
      await deleteByIndex('attachments', 'by-ref', ticket.id);
      await deleteOne('tickets', ticket.id);
    }
    await deleteByIndex('zones',        'by-mission', missionId);
    await deleteByIndex('changelog',    'by-mission', missionId);
    await deleteByIndex('intelligence', 'by-mission', missionId);
    await deleteOne('missions', missionId);
  },

  // ── ZONES ────────────────────────────────────────────────────────────────

  /** @param {string} missionId @returns {Promise<Zone[]>} */
  async getZonesByMission(missionId) {
    return getAllByIndex('zones', 'by-mission', missionId);
  },

  /** @param {string} id @returns {Promise<Zone|undefined>} */
  async getZone(id) {
    return getOne('zones', id);
  },

  /** @param {Zone} zone @returns {Promise<void>} */
  async saveZone(zone) {
    await putOne('zones', zone);
  },

  /**
   * Deletes a zone.  For each asset in the zone:
   *  - If the asset belongs to OTHER zones too → just remove this zone from
   *    its `zoneIds` array (asset survives).
   *  - If this was the asset's ONLY zone → fully cascade-delete the asset,
   *    its children, subitems, versions, and attachments.
   * @param {string} id  Zone ID to delete
   * @returns {Promise<void>}
   */
  async deleteZone(id) {
    const assets = await getAllByIndex('assets', 'by-zone', id);
    for (const asset of assets) {
      const remaining = (asset.zoneIds || []).filter(zid => zid !== id);
      if (remaining.length > 0) {
        // Asset belongs to other zones — just detach from this one
        asset.zoneIds = remaining;
        await putOne('assets', asset);
      } else {
        // This was the only zone — full cascade delete
        await DB.deleteAsset(asset.id);
      }
    }
    await deleteByIndex('attachments', 'by-ref', id);
    await deleteOne('zones', id);
  },

  // ── ASSETS ───────────────────────────────────────────────────────────────

  /** @param {string} missionId @returns {Promise<Asset[]>} */
  async getAssetsByMission(missionId) {
    return getAllByIndex('assets', 'by-mission', missionId);
  },

  /** @param {string} zoneId @returns {Promise<Asset[]>} */
  async getAssetsByZone(zoneId) {
    return getAllByIndex('assets', 'by-zone', zoneId);
  },

  /** @param {string} parentId @returns {Promise<Asset[]>} */
  async getAssetChildren(parentId) {
    return getAllByIndex('assets', 'by-parent', parentId);
  },

  /** @param {string} id @returns {Promise<Asset|undefined>} */
  async getAsset(id) {
    return getOne('assets', id);
  },

  /** @param {Asset} asset @returns {Promise<void>} */
  async saveAsset(asset) {
    await putOne('assets', asset);
  },

  /**
   * Recursively deletes an asset and all its descendants, sub-items,
   * versions, and attachments.
   * @param {string} id
   * @returns {Promise<void>}
   */
  async deleteAsset(id) {
    // Delete children recursively
    const children = await getAllByIndex('assets', 'by-parent', id);
    for (const child of children) {
      await DB.deleteAsset(child.id);
    }
    // Delete subitems, their version histories, and their attachments
    const subs = await getAllByIndex('subitems', 'by-asset', id);
    for (const sub of subs) {
      await deleteByIndex('subitemVersions', 'by-subitem', sub.id);
      await deleteByIndex('attachments', 'by-ref', sub.id);
    }
    await deleteByIndex('subitems',      'by-asset', id);
    await deleteByIndex('assetVersions', 'by-asset', id);
    await deleteByIndex('attachments',   'by-ref',   id);
    await deleteOne('assets', id);
  },

  // ── SUBITEMS ─────────────────────────────────────────────────────────────

  /** @param {string} assetId @returns {Promise<Subitem[]>} */
  async getSubitemsByAsset(assetId) {
    return getAllByIndex('subitems', 'by-asset', assetId);
  },

  /** @param {string} id @returns {Promise<Subitem|undefined>} */
  async getSubitem(id) {
    return getOne('subitems', id);
  },

  /** @param {Subitem} subitem @returns {Promise<void>} */
  async saveSubitem(subitem) {
    await putOne('subitems', subitem);
  },

  /** @param {string} id @returns {Promise<void>} */
  async deleteSubitem(id) {
    await deleteByIndex('subitemVersions', 'by-subitem', id);
    await deleteOne('subitems', id);
  },

  // ── SUBITEM VERSIONS ─────────────────────────────────────────────────────

  /** @param {string} subitemId @returns {Promise<SubitemVersion[]>} newest first */
  async getSubitemVersions(subitemId) {
    const versions = await getAllByIndex('subitemVersions', 'by-subitem', subitemId);
    return versions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  },

  /** @param {SubitemVersion} version @returns {Promise<void>} */
  async saveSubitemVersion(version) {
    await putOne('subitemVersions', version);
  },

  // ── ASSET VERSIONS ───────────────────────────────────────────────────────

  /** @param {string} assetId @returns {Promise<AssetVersion[]>} */
  async getVersionsByAsset(assetId) {
    const versions = await getAllByIndex('assetVersions', 'by-asset', assetId);
    return versions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  },

  /** @param {AssetVersion} version @returns {Promise<void>} */
  async saveAssetVersion(version) {
    await putOne('assetVersions', version);
  },

  // ── CHANGELOG ────────────────────────────────────────────────────────────

  /**
   * Returns changelog entries for a mission, newest first.
   * @param {string} missionId
   * @returns {Promise<ChangelogEntry[]>}
   */
  async getChangelogByMission(missionId) {
    const entries = await getAllByIndex('changelog', 'by-mission', missionId);
    return entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  },

  /** @param {ChangelogEntry} entry @returns {Promise<void>} */
  async saveChangelogEntry(entry) {
    await putOne('changelog', entry);
  },

  /** @param {string} id @returns {Promise<void>} */
  async deleteChangelogEntry(id) {
    await deleteOne('changelog', id);
  },

  // ── TICKETS ─────────────────────────────────────────────────────────

  async getTicket(id) {
    return getOne('tickets', id);
  },

  async getTicketsByMission(missionId) {
    const tickets = await getAllByIndex('tickets', 'by-mission', missionId);
    return tickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async getTicketsByRef(refId) {
    return getAllByIndex('tickets', 'by-ref', refId);
  },

  async saveTicket(ticket) {
    await putOne('tickets', ticket);
  },

  /**
   * Deletes a ticket, its messages, and all associated attachments.
   * @param {string} id  Ticket ID
   * @returns {Promise<void>}
   */
  async deleteTicket(id) {
    // Delete messages and their attachments
    const msgs = await getAllByIndex('ticketMessages', 'by-ticket', id);
    for (const m of msgs) {
      await deleteByIndex('attachments', 'by-ref', m.id);
      await deleteOne('ticketMessages', m.id);
    }
    // Delete ticket-level attachments and the ticket itself
    await deleteByIndex('attachments', 'by-ref', id);
    await deleteOne('tickets', id);
  },

  // ── TICKET MESSAGES ─────────────────────────────────────────────────

  async getMessagesByTicket(ticketId) {
    const msgs = await getAllByIndex('ticketMessages', 'by-ticket', ticketId);
    return msgs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  },

  async saveTicketMessage(msg) {
    await putOne('ticketMessages', msg);
  },

  async deleteTicketMessage(id) {
    await deleteOne('ticketMessages', id);
  },

  // ── ATTACHMENTS ──────────────────────────────────────────────────────

  /** @param {string} refId @returns {Promise<Attachment[]>} sorted by createdAt asc */
  async getAttachmentsByRef(refId) {
    const atts = await getAllByIndex('attachments', 'by-ref', refId);
    return atts.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  },

  /** @param {string} missionId @returns {Promise<Attachment[]>} */
  async getAttachmentsByMission(missionId) {
    return getAllByIndex('attachments', 'by-mission', missionId);
  },

  /** @param {string} id @returns {Promise<Attachment|undefined>} */
  async getAttachment(id) {
    return getOne('attachments', id);
  },

  /** @param {Attachment} attachment @returns {Promise<void>} */
  async saveAttachment(attachment) {
    await putOne('attachments', attachment);
  },

  /** @param {string} id @returns {Promise<void>} */
  async deleteAttachment(id) {
    await deleteOne('attachments', id);
  },

  /** @param {string} refId @returns {Promise<void>} */
  async deleteAttachmentsByRef(refId) {
    await deleteByIndex('attachments', 'by-ref', refId);
  },

  // ── INTELLIGENCE (v5) ────────────────────────────────────────────────────

  /**
   * Upserts an intelligence record (login_event, connection, host, route).
   * @param {object} record
   * @returns {Promise<void>}
   */
  async saveIntelRecord(record) {
    await putOne('intelligence', record);
  },

  /**
   * Returns all intelligence records for a mission.
   * @param {string} missionId
   * @returns {Promise<object[]>}
   */
  async getIntelByMission(missionId) {
    return getAllByIndex('intelligence', 'by-mission', missionId);
  },

  /**
   * Returns intelligence records of a given type for a mission.
   * @param {string} missionId
   * @param {string} type  'login_event' | 'connection' | 'host' | 'route'
   * @returns {Promise<object[]>}
   */
  async getIntelByType(missionId, type) {
    const all = await getAllByIndex('intelligence', 'by-mission', missionId);
    return all.filter((r) => r.type === type);
  },

  /** @param {string} id @returns {Promise<void>} */
  async deleteIntelRecord(id) {
    await deleteOne('intelligence', id);
  },

  /** Delete all intelligence records for a mission. @param {string} missionId */
  async deleteIntelByMission(missionId) {
    await deleteByIndex('intelligence', 'by-mission', missionId);
  },

  // ── BULK / IMPORT-EXPORT ─────────────────────────────────────────────────

  /**
   * Completely destroys and recreates the IndexedDB database.
   * All data across all missions is permanently deleted.
   * The database is automatically recreated with empty stores on next access.
   * @returns {Promise<void>}
   */
  async resetDatabase() {
    // Close the cached connection before deleting
    if (_db) {
      _db.close();
      _db = null;
    }
    return new Promise((resolve, reject) => {
      const req = indexedDB.deleteDatabase(DB_NAME);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
      req.onblocked = () => {
        // Force close and retry
        console.warn('[HackerHeroDB] deleteDatabase blocked, retrying…');
        setTimeout(() => resolve(), 500);
      };
    });
  },

  /**
   * Exports all data for a mission into a plain JS object.
   * @param {string} missionId
   * @returns {Promise<MissionExport>}
   */
  async exportMissionData(missionId) {
    const [mission, zones, assets, changelog] = await Promise.all([
      DB.getMission(missionId),
      DB.getZonesByMission(missionId),
      DB.getAssetsByMission(missionId),
      DB.getChangelogByMission(missionId),
    ]);

    // Gather subitems and versions for every asset
    const subitems = [];
    const versions = [];
    const subitemVersions_export = [];
    for (const asset of assets) {
      const subs = await DB.getSubitemsByAsset(asset.id);
      const vers = await DB.getVersionsByAsset(asset.id);
      // Strip merge-conflict metadata from exported subitems
      subitems.push(...subs.map(s => { const c = { ...s }; delete c.mergeConflict; return c; }));
      versions.push(...vers);
      for (const sub of subs) {
        const sv = await DB.getSubitemVersions(sub.id);
        subitemVersions_export.push(...sv);
      }
    }

    // Gather tickets and messages
    const tickets = await DB.getTicketsByMission(missionId);
    const ticketMessages = [];
    for (const t of tickets) {
      const msgs = await DB.getMessagesByTicket(t.id);
      ticketMessages.push(...msgs);
    }

    // Gather all attachments for this mission
    const attachments = await DB.getAttachmentsByMission(missionId);

    return {
      exportVersion: 2,
      exportedAt: new Date().toISOString(),
      mission, zones, assets, subitems, versions,
      subitemVersions: subitemVersions_export,
      changelog, tickets, ticketMessages, attachments,
    };
  },

  /**
   * Imports a full MissionExport object.
   * If a mission with the same codename already exists the user is warned via
   * the returned conflict flag – the caller decides what to do.
   * @param {MissionExport} data
   * @param {string} [importAs]  Optional override for mission codename
   * @returns {Promise<{missionId: string}>}
   */
  async importMissionData(data, importAs) {
    const { generateId, now, sanitizeImportedData, validateMissionExport } = await import('./utils.js');

    // ── Validate shape before importing ──────────────────────────────────
    const error = validateMissionExport(data);
    if (error) throw new Error(error);

    // ── Sanitize all strings to prevent stored-XSS ──────────────────────
    data = sanitizeImportedData(data);

    const missionId = generateId();

    // Remap old IDs → new IDs so there are no collisions with existing data
    const idMap = new Map();
    const remap = (oldId) => {
      if (!idMap.has(oldId)) idMap.set(oldId, generateId());
      return idMap.get(oldId);
    };

    // Mission
    const mission = {
      ...data.mission,
      id:        missionId,
      codename:  importAs || data.mission.codename,
      createdAt: now(),
      importedAt: now(),
      originalId: data.mission.id,
    };
    idMap.set(data.mission.id, missionId);
    await DB.saveMission(mission);

    // Zones
    for (const zone of (data.zones || [])) {
      const newZone = { ...zone, id: remap(zone.id), missionId };
      await DB.saveZone(newZone);
    }

    // Assets
    for (const asset of (data.assets || [])) {
      // Support both legacy zoneId and new zoneIds format
      let zoneIds;
      if (Array.isArray(asset.zoneIds)) {
        zoneIds = asset.zoneIds.map(zid => remap(zid));
      } else if (asset.zoneId) {
        zoneIds = [remap(asset.zoneId)];
      } else {
        zoneIds = [];
      }
      const newAsset = {
        ...asset,
        id:       remap(asset.id),
        missionId,
        zoneIds,
        parentId: asset.parentId ? remap(asset.parentId) : null,
      };
      delete newAsset.zoneId;
      await DB.saveAsset(newAsset);
    }

    // Subitems
    for (const sub of (data.subitems || [])) {
      const newSub = {
        ...sub,
        id: remap(sub.id),
        assetId: remap(sub.assetId),
        parentId: sub.parentId ? remap(sub.parentId) : null,
      };
      await DB.saveSubitem(newSub);
    }

    // ── Remap IDs inside snapshot / state objects ─────────────────────
    const remapState = (state) => {
      if (!state || typeof state !== 'object') return state;
      const s = { ...state };
      if (s.id)        s.id        = remap(s.id);
      if (s.missionId) s.missionId = missionId;
      if (s.parentId)  s.parentId  = remap(s.parentId);
      if (s.assetId)   s.assetId   = remap(s.assetId);
      if (s.refId)     s.refId     = remap(s.refId);
      if (s.ticketId)  s.ticketId  = remap(s.ticketId);
      if (s.zoneId)    s.zoneId    = remap(s.zoneId);
      if (Array.isArray(s.zoneIds)) s.zoneIds = s.zoneIds.map(z => remap(z));
      return s;
    };

    // Asset Versions
    for (const ver of (data.versions || [])) {
      const newVer = { ...ver, id: generateId(), assetId: remap(ver.assetId) };
      if (newVer.state) newVer.state = remapState(newVer.state);
      await DB.saveAssetVersion(newVer);
    }

    // Subitem Versions
    for (const ver of (data.subitemVersions || [])) {
      const newVer = { ...ver, id: generateId(), subitemId: remap(ver.subitemId) };
      if (newVer.state) newVer.state = remapState(newVer.state);
      await DB.saveSubitemVersion(newVer);
    }

    // Changelog – remap entity references so navigation & revert work
    for (const entry of (data.changelog || [])) {
      const newEntry = {
        ...entry,
        id: generateId(),
        missionId,
        entityId: entry.entityId ? remap(entry.entityId) : entry.entityId,
        previousState: remapState(entry.previousState),
        newState: remapState(entry.newState),
      };
      await DB.saveChangelogEntry(newEntry);
    }

    // Tickets
    for (const ticket of (data.tickets || [])) {
      const newTicket = {
        ...ticket,
        id: remap(ticket.id),
        missionId,
        refId: ticket.refId ? remap(ticket.refId) : null,
      };
      await DB.saveTicket(newTicket);
    }

    // Ticket messages
    for (const msg of (data.ticketMessages || [])) {
      const newMsg = { ...msg, id: generateId(), ticketId: remap(msg.ticketId) };
      await DB.saveTicketMessage(newMsg);
    }

    // Attachments
    for (const att of (data.attachments || [])) {
      const newAtt = {
        ...att,
        id: generateId(),
        missionId,
        refId: att.refId ? remap(att.refId) : null,
      };
      await DB.saveAttachment(newAtt);
    }

    return { missionId };
  },

  /**
   * Merges imported data into an existing mission.
   * Matching strategy: zones by name, assets by (name+ip) within zone,
   * subitems by name within asset, tickets by title.
   * NEW items are added.  Existing items are UPDATED if the source is newer
   * (compared by updatedAt / createdAt timestamps).
   * @param {string} existingMissionId
   * @param {MissionExport} data
   * @param {string} [sourceName]  Human-readable label for the source operation (shown in changelog)
   * @returns {Promise<{zones:number,zonesUp:number,assets:number,assetsUp:number,subitems:number,subitemsUp:number,conflicts:number,tickets:number,ticketsUp:number,changelog:number}>}
   */
  async mergeMissionData(existingMissionId, data, sourceName = '') {
    const { generateId, now, sanitizeImportedData, validateMissionExport } = await import('./utils.js');

    const error = validateMissionExport(data);
    if (error) throw new Error(error);
    data = sanitizeImportedData(data);

    const stats = { zones: 0, zonesUp: 0, assets: 0, assetsUp: 0, subitems: 0, subitemsUp: 0, conflicts: 0, tickets: 0, ticketsUp: 0, changelog: 0 };
    const _now = now();
    const _mergeFrom = sourceName ? `from "${sourceName}"` : 'via merge';

    /** Write a changelog entry attributed to the merge operation */
    const _addMergeLog = async (action, entityType, entityId, entityName, description, prev = null, next = null) => {
      await DB.saveChangelogEntry({
        id: generateId(),
        missionId: existingMissionId,
        timestamp: _now,
        operator: '🔀 merge',
        source: 'merge',
        sourceOperation: sourceName || '',
        action, entityType, entityId, entityName,
        description, previousState: prev, newState: next,
      });
    };

    /** Return true if src timestamp is strictly after dst */
    const isNewer = (src, dst) => {
      const ts = (o) => o?.updatedAt || o?.createdAt || '';
      return ts(src) > ts(dst);
    };

    /** True if both have been edited (different updatedAt and both after createdAt) */
    const bothEdited = (src, dst) => {
      const ts = (o) => o?.updatedAt || '';
      return ts(src) && ts(dst) && ts(src) !== ts(dst);
    };

    // ── Load existing data for matching ──────────────────────────────────
    const existingMission = await DB.getMission(existingMissionId);
    const existingZones   = await DB.getZonesByMission(existingMissionId);
    const existingAssets  = await DB.getAssetsByMission(existingMissionId);
    const existingTickets = await DB.getTicketsByMission(existingMissionId);

    const zoneByName  = new Map(existingZones.map(z => [z.name?.toLowerCase(), z]));
    const assetKey    = (a) => `${(a.name || '').toLowerCase()}||${(a.ip || '').toLowerCase()}`;
    const assetByKey  = new Map(existingAssets.map(a => [assetKey(a), a]));
    const ticketByTitle = new Map(existingTickets.map(t => [t.title?.toLowerCase(), t]));

    // Build a map from imported IDs → real IDs (existing or newly created)
    const idMap = new Map();
    const remap = (oldId) => {
      if (!idMap.has(oldId)) idMap.set(oldId, generateId());
      return idMap.get(oldId);
    };

    // Map the original mission ID to the existing one
    idMap.set(data.mission.id, existingMissionId);

    // ── Merge mission details ────────────────────────────────────────────
    {
      const src = data.mission;
      const dst = existingMission;
      const srcNewer = isNewer(src, dst);

      // targets: union by name
      const targetNames = new Set((dst.targets || []).map(t => t.name?.toLowerCase()));
      const mergedTargets = [...(dst.targets || [])];
      for (const t of (src.targets || [])) {
        if (!targetNames.has(t.name?.toLowerCase())) {
          mergedTargets.push(t);
          targetNames.add(t.name?.toLowerCase());
        }
      }

      // objectives: union by text
      const objTexts = new Set((dst.objectives || []).map(o => o.text?.toLowerCase()));
      const mergedObjectives = [...(dst.objectives || [])];
      for (const o of (src.objectives || [])) {
        if (!objTexts.has(o.text?.toLowerCase())) {
          mergedObjectives.push(o);
          objTexts.add(o.text?.toLowerCase());
        }
      }

      const updated = {
        ...dst,
        targets:    mergedTargets,
        objectives: mergedObjectives,
        // newest-wins for text fields
        context:  srcNewer ? (src.context  ?? dst.context)  : dst.context,
        timezone: srcNewer ? (src.timezone ?? dst.timezone) : dst.timezone,
        // codename is identity — never overwrite from source
        codename: dst.codename,
        status:   srcNewer ? (src.status   || dst.status)   : dst.status,
        // preserve creation metadata
        id:        existingMissionId,
        createdAt: dst.createdAt,
        createdBy: dst.createdBy,
        updatedAt: srcNewer ? src.updatedAt : dst.updatedAt,
        updatedBy: srcNewer ? src.updatedBy : dst.updatedBy,
      };

      const changed = (
        updated.context  !== dst.context  ||
        updated.timezone !== dst.timezone ||
        updated.status   !== dst.status   ||
        mergedTargets.length    !== (dst.targets    || []).length ||
        mergedObjectives.length !== (dst.objectives || []).length
      );

      if (changed) {
        await DB.saveMission(updated);
        await _addMergeLog(
          'update', 'mission', existingMissionId, updated.codename,
          `Updated mission details ${_mergeFrom}`,
          dst, updated
        );
      }
    }
    for (const zone of (data.zones || [])) {
      const match = zoneByName.get(zone.name?.toLowerCase());
      if (match) {
        idMap.set(zone.id, match.id);
        // Update existing zone if source is newer
        if (isNewer(zone, match)) {
          const updated = { ...match, ...zone, id: match.id, missionId: existingMissionId };
          await DB.saveZone(updated);
          await _addMergeLog('update', 'zone', match.id, zone.name, `Updated zone "${zone.name}" ${_mergeFrom}`, match, updated);
          zoneByName.set(zone.name?.toLowerCase(), updated);
          stats.zonesUp++;
        }
      } else {
        const newId = remap(zone.id);
        const created = { ...zone, id: newId, missionId: existingMissionId };
        await DB.saveZone(created);
        await _addMergeLog('create', 'zone', newId, zone.name, `Created zone "${zone.name}" ${_mergeFrom}`, null, created);
        stats.zones++;
        zoneByName.set(zone.name?.toLowerCase(), created);
      }
    }

    // ── Helper: remap zoneIds for an imported asset ───────────────────────
    const remapZoneIds = (asset) => {
      if (Array.isArray(asset.zoneIds)) {
        return asset.zoneIds.map(zid => idMap.get(zid) || remap(zid));
      } else if (asset.zoneId) {
        return [idMap.get(asset.zoneId) || remap(asset.zoneId)];
      }
      return [];
    };

    // ── Merge assets ─────────────────────────────────────────────────────
    for (const asset of (data.assets || [])) {
      const key = assetKey(asset);
      const match = assetByKey.get(key);
      if (match) {
        idMap.set(asset.id, match.id);
        // Always merge properties: union statuses, OR isKey, newest wins for rest
        const zoneIds = remapZoneIds(asset);
        const srcStatuses = Array.isArray(asset.statuses) ? asset.statuses : [];
        const dstStatuses = Array.isArray(match.statuses) ? match.statuses : [];
        const mergedStatuses = [...new Set([...dstStatuses, ...srcStatuses])];
        const winner = isNewer(match, asset) ? match : asset;
        // Snapshot the current state before modifying
        await DB.saveAssetVersion({
          id: generateId(), assetId: match.id, timestamp: _now,
          operator: 'merge', state: { ...match },
        });
        const updated = {
          ...match,
          description: winner.description ?? match.description,
          icon:        winner.icon ?? match.icon,
          type:        winner.type || match.type,
          isKey:       !!(asset.isKey || match.isKey),
          statuses:    mergedStatuses,
          zoneIds:     [...new Set([...(match.zoneIds || []), ...zoneIds])],
          parentId:    asset.parentId ? (idMap.get(asset.parentId) || remap(asset.parentId)) : match.parentId,
          updatedAt:   _now,
          updatedBy:   'merge',
          id:          match.id,
          missionId:   existingMissionId,
          name:        match.name,
          createdAt:   match.createdAt,
          createdBy:   match.createdBy,
        };
        delete updated.zoneId;
        await DB.saveAsset(updated);
        await _addMergeLog('update', 'asset', match.id, match.name, `Updated asset "${match.name}" ${_mergeFrom}`, match, updated);
        assetByKey.set(key, updated);
        stats.assetsUp++;
      } else {
        const newId = remap(asset.id);
        const zoneIds = remapZoneIds(asset);
        const newAsset = {
          ...asset,
          id: newId,
          missionId: existingMissionId,
          zoneIds,
          parentId: asset.parentId ? (idMap.get(asset.parentId) || remap(asset.parentId)) : null,
        };
        delete newAsset.zoneId;
        await DB.saveAsset(newAsset);
        await _addMergeLog('create', 'asset', newId, asset.name, `Created asset "${asset.name}" ${_mergeFrom}`, null, newAsset);
        stats.assets++;
        assetByKey.set(key, newAsset);
      }
    }

    // ── Merge subitems ───────────────────────────────────────────────────
    // Build lookup: existing subitems indexed by (assetId + name)
    const existingSubitems = [];
    for (const asset of existingAssets) {
      const subs = await DB.getSubitemsByAsset(asset.id);
      existingSubitems.push(...subs);
    }
    // Also load subitems for newly created assets (they won't have any yet,
    // but the map helps for assets that matched and already had subitems)
    const subKey = (s) => `${s.assetId}||${(s.name || '').toLowerCase()}`;
    const subByKey = new Map(existingSubitems.map(s => [subKey(s), s]));

    for (const sub of (data.subitems || [])) {
      const mappedAssetId = idMap.get(sub.assetId) || remap(sub.assetId);
      const key = `${mappedAssetId}||${(sub.name || '').toLowerCase()}`;
      const match = subByKey.get(key);
      if (match) {
        idMap.set(sub.id, match.id);
        const srcContent = (sub.content || '').trim();
        const dstContent = (match.content || '').trim();
        const contentDiffers = srcContent !== dstContent;

        if (contentDiffers) {
          // Snapshot current target state as a version
          await DB.saveSubitemVersion({
            id: generateId(), subitemId: match.id, timestamp: _now,
            operator: 'merge (pre-merge target)',
            state: { ...match },
          });

          // Determine winner and loser.
          // Source wins by default (tie → source) because the user explicitly
          // chose to import/merge these changes into the target.
          const targetIsNewer = isNewer(match, sub);
          const winner = targetIsNewer ? match : sub;
          const loser  = targetIsNewer ? sub : match;
          const srcWins = !targetIsNewer;

          // Merge statuses (union)
          const srcSt = Array.isArray(sub.statuses) ? sub.statuses : [];
          const dstSt = Array.isArray(match.statuses) ? match.statuses : [];
          const mergedStatuses = [...new Set([...dstSt, ...srcSt])];

          // Both modified → conflict
          const isConflict = bothEdited(sub, match);

          const updated = {
            ...match,
            content:    winner.content,
            parsedType: winner.parsedType ?? match.parsedType,
            parsedData: winner.parsedData ?? match.parsedData,
            icon:       winner.icon ?? match.icon,
            statuses:   mergedStatuses,
            parentId:   sub.parentId ? (idMap.get(sub.parentId) || remap(sub.parentId)) : match.parentId,
            updatedAt:  _now,
            updatedBy:  'merge',
            id:         match.id,
            assetId:    mappedAssetId,
            createdAt:  match.createdAt,
            createdBy:  match.createdBy,
          };

          if (isConflict) {
            // Store the losing version for conflict resolution
            updated.mergeConflict = {
              content:   loser.content,
              operator:  loser.updatedBy || loser.createdBy || '?',
              timestamp: loser.updatedAt || loser.createdAt || '',
              winner:    srcWins ? 'source' : 'target',
            };
            stats.conflicts++;
          } else {
            // Clean up any previous conflict flag
            delete updated.mergeConflict;
          }

          await DB.saveSubitem(updated);

          // Also snapshot the merge result as a version
          await DB.saveSubitemVersion({
            id: generateId(), subitemId: match.id, timestamp: _now,
            operator: `merge${isConflict ? ' (conflict — newest wins)' : ''}`,
            state: { ...updated },
          });

          const conflictSuffix = isConflict ? ' ⚠️ conflict' : '';
          await _addMergeLog(
            'update', 'subitem', match.id, sub.name,
            `Updated data item "${sub.name}" ${_mergeFrom}${conflictSuffix}`,
            match, updated
          );

          subByKey.set(key, updated);
          stats.subitemsUp++;
        } else {
          // Same content — just merge statuses if needed
          const srcSt = Array.isArray(sub.statuses) ? sub.statuses : [];
          const dstSt = Array.isArray(match.statuses) ? match.statuses : [];
          const merged = [...new Set([...dstSt, ...srcSt])];
          if (merged.length !== dstSt.length || !merged.every(s => dstSt.includes(s))) {
            const updated = { ...match, statuses: merged, updatedAt: _now, updatedBy: 'merge' };
            delete updated.mergeConflict;
            await DB.saveSubitem(updated);
            subByKey.set(key, updated);
            stats.subitemsUp++;
          }
        }
      } else {
        const newId = remap(sub.id);
        const newSub = {
          ...sub,
          id: newId,
          assetId: mappedAssetId,
          parentId: sub.parentId ? (idMap.get(sub.parentId) || remap(sub.parentId)) : null,
        };
        await DB.saveSubitem(newSub);
        await _addMergeLog('create', 'subitem', newId, sub.name, `Created data item "${sub.name}" ${_mergeFrom}`, null, newSub);
        stats.subitems++;
        subByKey.set(key, newSub);
      }
    }

    // ── Remap IDs inside snapshot / state objects ─────────────────────
    const remapState = (state) => {
      if (!state || typeof state !== 'object') return state;
      const s = { ...state };
      if (s.id)        s.id        = idMap.get(s.id) || s.id;
      if (s.missionId) s.missionId = existingMissionId;
      if (s.parentId)  s.parentId  = idMap.get(s.parentId) || s.parentId;
      if (s.assetId)   s.assetId   = idMap.get(s.assetId) || s.assetId;
      if (s.refId)     s.refId     = idMap.get(s.refId) || s.refId;
      if (s.ticketId)  s.ticketId  = idMap.get(s.ticketId) || s.ticketId;
      if (s.zoneId)    s.zoneId    = idMap.get(s.zoneId) || s.zoneId;
      if (Array.isArray(s.zoneIds)) s.zoneIds = s.zoneIds.map(z => idMap.get(z) || z);
      return s;
    };

    // ── Merge asset versions (always add — they are snapshots) ───────────
    for (const ver of (data.versions || [])) {
      const mappedAssetId = idMap.get(ver.assetId);
      if (!mappedAssetId) continue;
      const newVer = { ...ver, id: generateId(), assetId: mappedAssetId };
      if (newVer.state) newVer.state = remapState(newVer.state);
      await DB.saveAssetVersion(newVer);
    }

    // ── Merge subitem versions ───────────────────────────────────────────
    for (const ver of (data.subitemVersions || [])) {
      const mappedSubId = idMap.get(ver.subitemId);
      if (!mappedSubId) continue;
      const newVer = { ...ver, id: generateId(), subitemId: mappedSubId };
      if (newVer.state) newVer.state = remapState(newVer.state);
      await DB.saveSubitemVersion(newVer);
    }

    // ── Merge tickets ────────────────────────────────────────────────────
    for (const ticket of (data.tickets || [])) {
      const match = ticketByTitle.get(ticket.title?.toLowerCase());
      if (match) {
        idMap.set(ticket.id, match.id);
        // Update existing ticket if source is newer
        if (isNewer(ticket, match)) {
          const updated = {
            ...match,
            ...ticket,
            id: match.id,
            missionId: existingMissionId,
            refId: ticket.refId ? (idMap.get(ticket.refId) || remap(ticket.refId)) : match.refId,
            createdAt: match.createdAt,
            createdBy: match.createdBy,
          };
          await DB.saveTicket(updated);
          await _addMergeLog('update', 'ticket', match.id, ticket.title, `Updated ticket "${ticket.title}" ${_mergeFrom}`, match, updated);
          ticketByTitle.set(ticket.title?.toLowerCase(), updated);
          stats.ticketsUp++;
        }
      } else {
        const newId = remap(ticket.id);
        const newTicket = {
          ...ticket,
          id: newId,
          missionId: existingMissionId,
          refId: ticket.refId ? (idMap.get(ticket.refId) || remap(ticket.refId)) : null,
        };
        await DB.saveTicket(newTicket);
        await _addMergeLog('create', 'ticket', newId, ticket.title, `Created ticket "${ticket.title}" ${_mergeFrom}`, null, newTicket);
        stats.tickets++;
        ticketByTitle.set(ticket.title?.toLowerCase(), newTicket);
      }
    }

    // ── Merge ticket messages ────────────────────────────────────────────
    for (const msg of (data.ticketMessages || [])) {
      const mappedTicketId = idMap.get(msg.ticketId);
      if (!mappedTicketId) continue;
      // Add messages for all mapped tickets (new and existing)
      // Use a new ID to avoid collisions with existing messages
      await DB.saveTicketMessage({ ...msg, id: generateId(), ticketId: mappedTicketId });
    }

    // ── Merge changelog (always add new entries) ─────────────────────────
    for (const entry of (data.changelog || [])) {
      const newEntry = {
        ...entry,
        id: generateId(),
        missionId: existingMissionId,
        sourceOperation: sourceName || '',
        entityId: entry.entityId ? (idMap.get(entry.entityId) || entry.entityId) : entry.entityId,
        previousState: remapState(entry.previousState),
        newState: remapState(entry.newState),
      };
      await DB.saveChangelogEntry(newEntry);
      stats.changelog++;
    }

    // ── Merge attachments ────────────────────────────────────────────────
    for (const att of (data.attachments || [])) {
      const mappedRefId = att.refId ? (idMap.get(att.refId) || att.refId) : null;
      await DB.saveAttachment({
        ...att,
        id: generateId(),
        missionId: existingMissionId,
        refId: mappedRefId,
      });
    }

    // ── Summary changelog entry ──────────────────────────────────────────
    const summaryParts = [];
    if (stats.zones || stats.zonesUp)       summaryParts.push(`${stats.zones} zones (+${stats.zonesUp} updated)`);
    if (stats.assets || stats.assetsUp)     summaryParts.push(`${stats.assets} assets (+${stats.assetsUp} updated)`);
    if (stats.subitems || stats.subitemsUp) summaryParts.push(`${stats.subitems} data (+${stats.subitemsUp} updated)`);
    if (stats.tickets || stats.ticketsUp)   summaryParts.push(`${stats.tickets} tickets (+${stats.ticketsUp} updated)`);
    if (stats.conflicts)                     summaryParts.push(`${stats.conflicts} conflicts`);
    await DB.saveChangelogEntry({
      id: generateId(),
      missionId: existingMissionId,
      timestamp: _now,
      operator: '🔀 merge',
      source: 'merge',
      sourceOperation: sourceName || '',
      action: 'merge',
      entityType: 'mission',
      entityId: existingMissionId,
      entityName: sourceName || '?',
      description: `Merge ${_mergeFrom}: ${summaryParts.join(', ') || 'no changes'}${stats.conflicts ? ' ⚠️' : ''}`,
      previousState: null,
      newState: null,
    });

    return stats;
  },

};

// ─────────────────────────────────────────────────────────────────────────────
//  JSDoc Type Definitions (for IDE autocompletion)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} Mission
 * @property {string}   id
 * @property {string}   codename
 * @property {string}   context       - Free-text context / notes
 * @property {Target[]} targets
 * @property {Objective[]} objectives
 * @property {string}   createdAt     - ISO string
 * @property {string}   createdBy     - Operator name
 * @property {string}   updatedAt     - ISO string
 * @property {string}   updatedBy     - Operator name
 */

/**
 * @typedef {Object} Target
 * @property {string} id
 * @property {string} name  - Company name, IP, domain, …
 * @property {string} [type]
 */

/**
 * @typedef {Object} Objective
 * @property {string} id
 * @property {string} text
 * @property {'pending'|'in-progress'|'achieved'|'dropped'} status
 * @property {string} createdAt
 * @property {string} createdBy
 */

/**
 * @typedef {Object} Zone
 * @property {string} id
 * @property {string} missionId
 * @property {string} name
 * @property {string} [description]
 * @property {string} [color]        - CSS color for the map
 * @property {number} [mapX]         - X position on the network map
 * @property {number} [mapY]         - Y position on the network map
 * @property {string} createdAt
 * @property {string} createdBy
 */

/**
 * @typedef {Object} Asset
 * @property {string}  id
 * @property {string}  missionId
 * @property {string[]} zoneIds     - Array of zone IDs this asset belongs to
 * @property {string|null} parentId  - null for root assets within a zone
 * @property {'machine'|'application'|'service'|'credential'|'finding'|'other'} type
 * @property {string}  name
 * @property {string}  [description]
 * @property {boolean} isKey         - Whether to show on the key-assets map view
 * @property {string}  createdAt
 * @property {string}  createdBy
 * @property {string}  updatedAt
 * @property {string}  updatedBy
 */

/**
 * @typedef {Object} Subitem
 * @property {string} id
 * @property {string} assetId
 * @property {string|null} parentId
 * @property {string} name
 * @property {string} content        - Raw pasted / typed content
 * @property {string} [parsedType]   - Parser name used (e.g. 'ip_addr')
 * @property {Object} [parsedData]   - Structured result from parser
 * @property {string} createdAt
 * @property {string} createdBy
 */

/**
 * @typedef {Object} AssetVersion
 * @property {string} id
 * @property {string} assetId
 * @property {string} timestamp
 * @property {string} operator
 * @property {Asset}  state          - Full snapshot of the asset at this point
 */

/**
 * @typedef {Object} ChangelogEntry
 * @property {string}  id
 * @property {string}  missionId
 * @property {string}  timestamp
 * @property {string}  operator
 * @property {'create'|'update'|'delete'} action
 * @property {string}  entityType    - 'mission'|'zone'|'asset'|'subitem'|'objective'|'target'
 * @property {string}  entityId
 * @property {string}  entityName
 * @property {string}  description   - Human-readable summary
 * @property {*|null}  previousState - Full object snapshot before change
 * @property {*|null}  newState      - Full object snapshot after change
 */

/**
 * @typedef {Object} Attachment
 * @property {string} id
 * @property {string} missionId
 * @property {string} refType        - 'asset' | 'subitem' | 'ticket'
 * @property {string} refId          - ID of the parent entity
 * @property {string} fileName       - Original file name
 * @property {string} mimeType       - e.g. 'image/png'
 * @property {string} dataUrl        - Base64 data URL of the image
 * @property {string} thumbnailUrl   - Smaller base64 data URL for thumbnails
 * @property {number} size           - File size in bytes
 * @property {string} createdAt      - ISO string
 * @property {string} createdBy      - Operator name
 */

/**
 * @typedef {Object} MissionExport
 * @property {number}          exportVersion
 * @property {string}          exportedAt
 * @property {Mission}         mission
 * @property {Zone[]}          zones
 * @property {Asset[]}         assets
 * @property {Subitem[]}       subitems
 * @property {AssetVersion[]}  versions
 * @property {ChangelogEntry[]} changelog
 */
