// Simple IndexedDB-backed history store for links
// Mirrors the in-file array API used earlier but persists in IDB with pruning.

(function () {
  const DB_NAME = 'AISidebarDB';
  const STORE = 'history';
  const DB_VERSION = 1;
  const MAX_ENTRIES = 3000; // hard cap; oldest are pruned

  let db = null;

  function openDb() {
    if (db) return Promise.resolve(db);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onerror = () => reject(req.error);
      req.onupgradeneeded = (e) => {
        const d = e.target.result;
        if (!d.objectStoreNames.contains(STORE)) {
          const os = d.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
          os.createIndex('url', 'url', { unique: true });
          os.createIndex('provider', 'provider', { unique: false });
          os.createIndex('time', 'time', { unique: false });
        }
      };
      req.onsuccess = () => { db = req.result; resolve(db); };
    });
  }

  async function withStore(mode, fn) {
    const d = await openDb();
    return new Promise((resolve, reject) => {
      const tx = d.transaction([STORE], mode);
      const os = tx.objectStore(STORE);
      const res = fn(os, tx);
      tx.oncomplete = () => resolve(res);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('aborted'));
    });
  }

  async function getAll() {
    return withStore('readonly', (os) => new Promise((resolve, reject) => {
      const req = os.getAll();
      req.onsuccess = () => {
        const arr = Array.isArray(req.result) ? req.result.slice() : [];
        // Sort newest first
        arr.sort((a,b)=> (b.time||0)-(a.time||0));
        resolve(arr.map(({id, ...rest}) => rest));
      };
      req.onerror = () => reject(req.error);
    }));
  }

  async function clearAll() {
    return withStore('readwrite', (os) => os.clear());
  }

  async function replace(list) {
    // Replace full contents with provided array of entries
    await clearAll();
    if (!Array.isArray(list) || list.length === 0) return [];
    // Dedup by url, keep newest first
    const seen = new Set();
    const trimmed = [];
    for (const it of list.sort((a,b)=> (b.time||0)-(a.time||0))) {
      if (!it || !it.url || seen.has(it.url)) continue;
      seen.add(it.url);
      trimmed.push({
        url: String(it.url),
        provider: String(it.provider || ''),
        title: String(it.title || ''),
        time: Number(it.time || Date.now())
      });
      if (trimmed.length >= MAX_ENTRIES) break;
    }
    await withStore('readwrite', (os) => {
      trimmed.forEach(e => os.put(e));
    });
    return getAll();
  }

  async function add(entry) {
    if (!entry || !entry.url) return getAll();
    const e = {
      url: String(entry.url),
      provider: String(entry.provider || ''),
      title: String(entry.title || ''),
      time: Number(entry.time || Date.now())
    };
    // Upsert by url: delete existing first, then add to keep newest time ordering
    await withStore('readwrite', (os, tx) => new Promise((resolve, reject) => {
      const idx = os.index('url');
      const q = idx.getKey(e.url);
      q.onsuccess = () => {
        const key = q.result;
        const put = () => os.put(e);
        if (key !== undefined) {
          const del = os.delete(key);
          del.onsuccess = put;
          del.onerror = () => reject(del.error);
        } else {
          put();
        }
      };
      q.onerror = () => reject(q.error);
    }));
    // Enforce cap: if above MAX_ENTRIES, prune oldest
    await pruneIfNeeded();
    return getAll();
  }

  async function pruneIfNeeded() {
    return withStore('readwrite', (os, tx) => new Promise((resolve, reject) => {
      const req = os.getAllKeys();
      req.onsuccess = () => {
        const keys = req.result || [];
        if (keys.length <= MAX_ENTRIES) return resolve();
        // Delete oldest by time: fetch all, sort by time asc
        const allReq = os.getAll();
        allReq.onsuccess = () => {
          const items = (allReq.result || []).sort((a,b)=> (a.time||0)-(b.time||0));
          const over = Math.max(0, items.length - MAX_ENTRIES);
          for (let i=0;i<over;i++) {
            os.delete(items[i].id);
          }
          resolve();
        };
        allReq.onerror = () => reject(allReq.error);
      };
      req.onerror = () => reject(req.error);
    }));
  }

  async function removeByUrl(url) {
    if (!url) return;

    // Normalize URL for robust matching (ignore fragments, sort query params, lowercase host)
    const normalize = (uStr) => {
      try {
        const u = new URL(String(uStr));
        // Drop hash, lowercase hostname, keep protocol and port
        u.hash = '';
        u.hostname = u.hostname.toLowerCase();
        // Sort query params for stable comparison
        if (u.search && u.search.length > 1) {
          const sp = new URLSearchParams(u.search);
          const sorted = new URLSearchParams();
          Array.from(sp.keys()).sort().forEach(k => {
            const vals = sp.getAll(k);
            vals.sort().forEach(v => sorted.append(k, v));
          });
          u.search = sorted.toString() ? `?${sorted.toString()}` : '';
        }
        // Remove trailing slash on root path only ("/" -> "")
        if (u.pathname === '/') u.pathname = '';
        return u.toString();
      } catch (_) {
        // Fallback to string as-is
        return String(uStr);
      }
    };

    const targetNorm = normalize(url);

    return withStore('readwrite', (os) => new Promise((resolve, reject) => {
      try {
        const idx = os.index('url');
        const q = idx.getKey(url);
        q.onsuccess = () => {
          const key = q.result;
          if (key !== undefined) {
            const del = os.delete(key);
            del.onsuccess = () => resolve();
            del.onerror = () => reject(del.error);
            return;
          }
          // Fallback: scan all and delete normalized matches (entity/param order/fragment differences)
          const all = os.getAll();
          all.onsuccess = () => {
            const arr = all.result || [];
            const toDelete = arr
              .filter(e => e && (String(e.url) === String(url) || normalize(e.url) === targetNorm))
              .map(e => e.id);
            if (toDelete.length === 0) return resolve();
            toDelete.forEach(id => os.delete(id));
            resolve();
          };
          all.onerror = () => reject(all.error);
        };
        q.onerror = () => {
          // If index query fails, attempt fallback delete by full scan with normalization
          const all = os.getAll();
          all.onsuccess = () => {
            const arr = all.result || [];
            const toDelete = arr
              .filter(e => e && (String(e.url) === String(url) || normalize(e.url) === targetNorm))
              .map(e => e.id);
            if (toDelete.length === 0) return resolve();
            toDelete.forEach(id => os.delete(id));
            resolve();
          };
          all.onerror = () => reject(all.error);
        };
      } catch (e) {
        reject(e);
      }
    }));
  }

  // One-time migration from chrome.storage.local array if present
  async function migrateFromStorageIfAny() {
    try {
      const { historyMigratedV1 } = await chrome.storage.local.get(['historyMigratedV1']);
      if (historyMigratedV1) return;
      const res = await chrome.storage.local.get(['aiLinkHistory']);
      const list = Array.isArray(res.aiLinkHistory) ? res.aiLinkHistory : [];
      if (list.length) {
        await replace(list);
      }
      await chrome.storage.local.set({ historyMigratedV1: true });
      // Optionally clear the old key to reclaim storage
      try { await chrome.storage.local.remove(['aiLinkHistory']); } catch (_) {}
    } catch (_) {}
  }

  window.HistoryDB = {
    getAll,
    add,
    replace,
    clearAll,
    removeByUrl,
    migrateFromStorageIfAny
  };
})();
