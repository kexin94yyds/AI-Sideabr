/**
 * Enhanced Storage Manager using IndexedDB
 * Handles CRUD for full conversation data
 */

(function() {
  const DB_NAME = 'AISidebarFullDB';
  const STORE_NAME = 'conversations';
  const DB_VERSION = 1;
  
  let db = null;
  const mirrorTimers = new Map();
  const AISB_AUTOSAVE_DEBUG = true;
  const AISB_DEBUG_THROTTLE_MS = 2000;
  const aisbDebugLastLogAt = Object.create(null);

  function aisbAutosaveDebug(scope, payload = {}, throttleKey = scope, throttleMs = AISB_DEBUG_THROTTLE_MS) {
    if (!AISB_AUTOSAVE_DEBUG) return;
    const now = Date.now();
    const key = String(throttleKey || scope);
    if (throttleMs > 0 && aisbDebugLastLogAt[key] && now - aisbDebugLastLogAt[key] < throttleMs) return;
    aisbDebugLastLogAt[key] = now;
    try {
      console.info('[AISB autosave debug]', scope, payload);
    } catch (_) {}
  }

  function aisbConversationSummary(conversation) {
    const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
    return {
      provider: String(conversation?.provider || ''),
      title: String(conversation?.title || ''),
      url: String(conversation?.url || ''),
      conversationIdPresent: Boolean(String(conversation?.conversationId || '').trim()),
      messageCount: Number(conversation?.messageCount || messages.length || 0),
      lastRole: String(messages[messages.length - 1]?.role || ''),
      lastContentLength: String(messages[messages.length - 1]?.content || '').length
    };
  }

  function queueConversationMirror(conversation) {
    try {
      if (typeof window === 'undefined' || typeof window.AutoSync?.syncConversation !== 'function') {
        aisbAutosaveDebug('storage.mirror.skip', {
          reason: 'autosync_unavailable',
          conversation: aisbConversationSummary(conversation)
        }, `storage.mirror.skip:autosync_unavailable:${conversation?.provider}`, 5000);
        return;
      }

      const key = String(
        conversation?.conversationId ||
        conversation?.url ||
        `${conversation?.provider || 'unknown'}:${conversation?.title || ''}`
      );

      if (!key) return;
      clearTimeout(mirrorTimers.get(key));
      aisbAutosaveDebug('storage.mirror.queued', {
        key,
        conversation: aisbConversationSummary(conversation)
      }, `storage.mirror.queued:${key}`, 1000);

      const timer = setTimeout(async () => {
        mirrorTimers.delete(key);
        try {
          const result = await window.AutoSync.syncConversation(conversation);
          aisbAutosaveDebug('storage.mirror.result', {
            result,
            conversation: aisbConversationSummary(conversation)
          }, `storage.mirror.result:${key}`, 0);
          if (!result?.success) {
            console.warn('[AI Sidebar] Conversation markdown mirror skipped:', result);
          }
        } catch (error) {
          console.warn('[AI Sidebar] Conversation markdown mirror failed:', error);
          aisbAutosaveDebug('storage.mirror.failed', {
            error: error?.message || String(error),
            conversation: aisbConversationSummary(conversation)
          }, `storage.mirror.failed:${key}`, 0);
        }
      }, 400);

      mirrorTimers.set(key, timer);
    } catch (error) {
      console.warn('[AI Sidebar] queueConversationMirror failed:', error);
    }
  }

  async function openDb() {
    if (db) return db;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => {
        aisbAutosaveDebug('storage.db.open_failed', {
          dbName: DB_NAME,
          version: DB_VERSION,
          error: request.error?.message || String(request.error || '')
        }, 'storage.db.open_failed', 0);
        reject(request.error);
      };
      request.onupgradeneeded = (event) => {
        const d = event.target.result;
        if (!d.objectStoreNames.contains(STORE_NAME)) {
          const os = d.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
          os.createIndex('conversationId', 'conversationId', { unique: false });
          os.createIndex('provider', 'provider', { unique: false });
          os.createIndex('timestamp', 'timestamp', { unique: false });
          os.createIndex('title', 'title', { unique: false });
        }
      };
      request.onsuccess = () => {
        db = request.result;
        aisbAutosaveDebug('storage.db.opened', {
          dbName: DB_NAME,
          version: DB_VERSION
        }, 'storage.db.opened', 10000);
        resolve(db);
      };
    });
  }

  async function withStore(mode, fn) {
    const d = await openDb();
    return new Promise((resolve, reject) => {
      const tx = d.transaction([STORE_NAME], mode);
      const os = tx.objectStore(STORE_NAME);
      const res = fn(os, tx);
      tx.oncomplete = () => resolve(res);
      tx.onerror = () => reject(tx.error);
    });
  }

  window.ChatHistoryDB = {
    async getAll() {
      return withStore('readonly', (os) => new Promise((resolve, reject) => {
        const request = os.getAll();
        request.onsuccess = () => {
          const arr = request.result || [];
          arr.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          resolve(arr);
        };
        request.onerror = () => reject(request.error);
      }));
    },

    async add(conversation) {
      return withStore('readwrite', (os) => new Promise((resolve, reject) => {
        const data = {
          ...conversation,
          timestamp: conversation.timestamp || Date.now(),
          modifiedAt: Date.now()
        };
        const request = os.add(data);
        request.onsuccess = () => {
          aisbAutosaveDebug('storage.db.added', {
            id: request.result,
            conversation: aisbConversationSummary(data)
          }, `storage.db.added:${data.conversationId || data.url || request.result}`, 0);
          queueConversationMirror(data);
          resolve(request.result);
        };
        request.onerror = () => {
          aisbAutosaveDebug('storage.db.add_failed', {
            error: request.error?.message || String(request.error || ''),
            conversation: aisbConversationSummary(data)
          }, `storage.db.add_failed:${data.conversationId || data.url}`, 0);
          reject(request.error);
        };
      }));
    },

    async update(id, updates) {
      return withStore('readwrite', (os) => new Promise((resolve, reject) => {
        const getRequest = os.get(id);
        getRequest.onsuccess = () => {
          const existing = getRequest.result;
          if (!existing) return reject(new Error('Not found'));
          const updated = {
            ...existing,
            ...updates,
            createdAt: existing.createdAt || updates.createdAt || Date.now(),
            modifiedAt: Date.now()
          };
          const putRequest = os.put(updated);
          putRequest.onsuccess = () => {
            aisbAutosaveDebug('storage.db.updated', {
              id,
              conversation: aisbConversationSummary(updated)
            }, `storage.db.updated:${updated.conversationId || updated.url || id}`, 0);
            queueConversationMirror(updated);
            resolve(updated);
          };
          putRequest.onerror = () => {
            aisbAutosaveDebug('storage.db.update_failed', {
              id,
              error: putRequest.error?.message || String(putRequest.error || ''),
              conversation: aisbConversationSummary(updated)
            }, `storage.db.update_failed:${updated.conversationId || updated.url || id}`, 0);
            reject(putRequest.error);
          };
        };
        getRequest.onerror = () => reject(getRequest.error);
      }));
    },

    async get(id) {
      return withStore('readonly', (os) => new Promise((resolve, reject) => {
        const request = os.get(id);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      }));
    },

    async delete(id) {
      return withStore('readwrite', (os) => new Promise((resolve, reject) => {
        const request = os.delete(id);
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      }));
    },

    async clear() {
      return withStore('readwrite', (os) => new Promise((resolve, reject) => {
        const request = os.clear();
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      }));
    },

    async findByConversationId(conversationId) {
      if (!conversationId) return null;
      return withStore('readonly', (os) => new Promise((resolve, reject) => {
        const index = os.index('conversationId');
        const request = index.get(conversationId);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      }));
    },

    // Legacy support for older code calling saveConversation
    async saveConversation(data) {
      if (data.conversationId) {
        const existing = await this.findByConversationId(data.conversationId);
        if (existing) {
          aisbAutosaveDebug('storage.save.update_existing', {
            id: existing.id,
            conversation: aisbConversationSummary(data)
          }, `storage.save.update_existing:${data.conversationId}`, 0);
          return await this.update(existing.id, data);
        }
      }
      aisbAutosaveDebug('storage.save.add_new', {
        conversation: aisbConversationSummary(data)
      }, `storage.save.add_new:${data.conversationId || data.url || data.title}`, 0);
      return await this.add(data);
    }
  };

  // Global exports for content scripts
  if (typeof window !== 'undefined') {
    window.saveConversation = (data) => window.ChatHistoryDB.saveConversation(data);
    window.findDuplicate = (cid) => window.ChatHistoryDB.findByConversationId(cid);
    window.updateConversation = (id, updates) => window.ChatHistoryDB.update(id, updates);
  }
})();
