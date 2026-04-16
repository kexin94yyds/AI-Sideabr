/**
 * Enhanced Storage Manager using IndexedDB
 * Handles CRUD for full conversation data
 */

(function() {
  const DB_NAME = 'AISidebarFullDB';
  const STORE_NAME = 'conversations';
  const DB_VERSION = 1;
  
  let db = null;

  async function openDb() {
    if (db) return db;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
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
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }));
    },

    async update(id, updates) {
      return withStore('readwrite', (os) => new Promise((resolve, reject) => {
        const getRequest = os.get(id);
        getRequest.onsuccess = () => {
          const existing = getRequest.result;
          if (!existing) return reject(new Error('Not found'));
          const updated = { ...existing, ...updates, modifiedAt: Date.now() };
          const putRequest = os.put(updated);
          putRequest.onsuccess = () => resolve(updated);
          putRequest.onerror = () => reject(putRequest.error);
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
          return await this.update(existing.id, data);
        }
      }
      return await this.add(data);
    }
  };

  // Global exports for content scripts
  if (typeof window !== 'undefined') {
    window.saveConversation = (data) => window.ChatHistoryDB.saveConversation(data);
    window.findDuplicate = (cid) => window.ChatHistoryDB.findByConversationId(cid);
  }
})();
