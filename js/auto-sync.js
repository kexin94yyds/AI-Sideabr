/**
 * 自动同步模块 (已禁用 - 仅实现 Export 功能)
 * 将扩展数据自动同步到本地 sync-server
 * 
 * 使用方法:
 * 在 popup.js 或 background.js 中调用:
 * - AutoSync.syncHistory() - 同步历史记录
 * - AutoSync.syncFavorites() - 同步收藏
 * - AutoSync.syncAll() - 同步所有数据
 */

const AutoSync = (function() {
  const SYNC_SERVER_URL = 'http://localhost:3456';
  const HISTORY_KEY = 'aiLinkHistory';
  const FAVORITES_KEY = 'aiFavoriteLinks';
  const PROJECT_NAME = 'AI-Sidebar';

  let isServerAvailable = false;
  let lastCheckTime = 0;
  const CHECK_INTERVAL = 30000; // 30秒检查一次服务器状态

  /**
   * 检查同步服务器是否可用
   */
  async function checkServerAvailability() {
    const now = Date.now();
    if (now - lastCheckTime < CHECK_INTERVAL) {
      return isServerAvailable;
    }

    try {
      const response = await fetch(`${SYNC_SERVER_URL}/ping`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000) // 2秒超时
      });
      isServerAvailable = response.ok;
      lastCheckTime = now;
      return isServerAvailable;
    } catch (error) {
      isServerAvailable = false;
      lastCheckTime = now;
      return false;
    }
  }

  /**
   * 发送数据到同步服务器
   */
  async function sendToServer(endpoint, data) {
    try {
      const response = await fetch(`${SYNC_SERVER_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(5000) // 5秒超时
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const result = await response.json();
      return { success: true, ...result };
    } catch (error) {
      console.warn(`AutoSync: 无法连接到同步服务器 (${endpoint}):`, error.message);
      return { success: false, error: error.message };
    }
  }

  // 从同步服务器获取当前的数据（history/favorites）
  async function fetchRemoteData(name) {
    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const signal = controller ? AbortSignal.timeout(3000) : undefined;
      const res = await fetch(`${SYNC_SERVER_URL}/sync/${name}`, {
        method: 'GET',
        signal
      });
      if (!res.ok) throw new Error(`GET /sync/${name} -> ${res.status}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.warn(`AutoSync: 无法获取远端 ${name}:`, error.message || error);
      return [];
    }
  }

  function mergeEntries(remoteList, localList) {
    const map = new Map();
    const addAll = (arr) => {
      (arr || []).forEach((entry) => {
        if (!entry || !entry.url) return;
        const url = String(entry.url);
        const normalized = {
          url,
          provider: String(entry.provider || ''),
          title: String(entry.title || ''),
          time: Number(entry.time || Date.now())
        };
        const prev = map.get(url);
        if (!prev || (normalized.time || 0) >= (prev.time || 0)) {
          map.set(url, normalized);
        }
      });
    };
    addAll(remoteList);
    addAll(localList);
    return Array.from(map.values()).sort((a, b) => (b.time || 0) - (a.time || 0));
  }

  function isUsefulConversationTitle(title) {
    const value = String(title || '').trim();
    if (!value) return false;

    const normalized = value.toLowerCase();
    if (normalized.length < 4) return false;
    if (/^(new\s*chat|chatgpt|gemini|deepseek|claude|ai|conversation with gemini)$/i.test(normalized)) return false;
    if (/^(新聊天|新对话|最近|recent)$/i.test(value)) return false;
    return true;
  }

  function hasStableConversationUrl(url, provider) {
    try {
      const u = new URL(String(url || ''));
      if (provider === 'chatgpt') return /\/c\/[\w-]+/i.test(u.pathname);
      if (provider === 'gemini') return /\/app\/(?:conversation\/)?[^/?#]+/.test(u.pathname);
      if (provider === 'deepseek') return /\/(sessions|s)\/[^/?#]+/.test(u.pathname);
      if (provider === 'claude') return /\/chat\/[\w-]+/i.test(u.pathname);
      return Boolean(u.pathname && u.pathname !== '/');
    } catch (_) {
      return false;
    }
  }

  function isConversationReadyForMirror(conversation) {
    if (!conversation || !Array.isArray(conversation.messages) || conversation.messages.length === 0) return false;
    if (!isUsefulConversationTitle(conversation.title)) return false;
    if (!hasStableConversationUrl(conversation.url, conversation.provider)) return false;
    return true;
  }

  async function syncConversation(conversation) {
    try {
      if (!isConversationReadyForMirror(conversation)) {
        return { success: false, reason: 'conversation_not_ready' };
      }

      const available = await checkServerAvailability();
      if (!available) {
        return { success: false, reason: 'server_unavailable' };
      }

      return await sendToServer('/sync/conversations', {
        project: PROJECT_NAME,
        conversation: {
          ...conversation,
          project: PROJECT_NAME
        }
      });
    } catch (error) {
      console.warn('AutoSync: Conversation 同步失败:', error.message || error);
      return { success: false, error: error.message || String(error) };
    }
  }

  /**
   * 同步历史记录
   */
  async function syncHistory() {
    try {
      // 检查服务器是否可用
      const available = await checkServerAvailability();
      if (!available) {
        console.warn('AutoSync: History 同步跳过 - 服务器不可用');
        return { success: false, reason: 'server_unavailable' };
      }

      // 先获取远端数据（优先恢复）
      const remoteHistory = await fetchRemoteData('history');
      console.log(`AutoSync: 从服务器获取到 ${remoteHistory.length} 条历史记录`);

      // 获取本地历史数据
      let historyData = [];
      
      // 优先从 IndexedDB (HistoryDB) 读取
      if (typeof window !== 'undefined' && window.HistoryDB) {
        try {
          console.log('AutoSync: 从 IndexedDB 读取 History...');
          await window.HistoryDB.migrateFromStorageIfAny();
          historyData = await window.HistoryDB.getAll();
          console.log(`AutoSync: 从 IndexedDB 读取到 ${historyData.length} 条历史记录`);
        } catch (dbError) {
          console.warn('AutoSync: IndexedDB 读取失败，尝试降级到 chrome.storage:', dbError);
          // 降级到 chrome.storage.local
          if (typeof chrome !== 'undefined' && chrome.storage) {
            const res = await chrome.storage.local.get([HISTORY_KEY]);
            historyData = Array.isArray(res[HISTORY_KEY]) ? res[HISTORY_KEY] : [];
            console.log(`AutoSync: 从 chrome.storage 读取到 ${historyData.length} 条历史记录`);
          }
        }
      } else if (typeof chrome !== 'undefined' && chrome.storage) {
        // 如果没有 HistoryDB，直接使用 chrome.storage.local
        console.log('AutoSync: HistoryDB 不可用，从 chrome.storage 读取...');
        const res = await chrome.storage.local.get([HISTORY_KEY]);
        historyData = Array.isArray(res[HISTORY_KEY]) ? res[HISTORY_KEY] : [];
        console.log(`AutoSync: 从 chrome.storage 读取到 ${historyData.length} 条历史记录`);
      } else {
        console.warn('AutoSync: 无法读取 History - HistoryDB 和 chrome.storage 都不可用');
        // 如果本地存储不可用，但服务器有数据，直接使用服务器数据
        if (remoteHistory.length > 0) {
          console.log('AutoSync: 本地存储不可用，使用服务器数据');
          historyData = remoteHistory;
        } else {
          return { success: false, error: 'no_storage_available' };
        }
      }

      // 如果本地为空但服务器有数据，优先恢复服务器数据
      if (historyData.length === 0 && remoteHistory.length > 0) {
        console.log('AutoSync: 本地数据为空，从服务器恢复数据');
        historyData = remoteHistory;
      } else {
        // 合并本地和远端数据，避免覆盖
        historyData = mergeEntries(remoteHistory, historyData);
      }

      // 将合并后的数据写回本地（IndexedDB 或 chrome.storage）
      try {
        if (typeof window !== 'undefined' && window.HistoryDB && window.HistoryDB.replace) {
          await window.HistoryDB.replace(historyData);
        } else if (typeof chrome !== 'undefined' && chrome.storage) {
          await chrome.storage.local.set({ [HISTORY_KEY]: historyData });
        }
      } catch (e) {
        console.warn('AutoSync: 合并历史后写回本地失败:', e);
      }

      // 检查是否有数据
      if (!Array.isArray(historyData) || historyData.length === 0) {
        console.warn('AutoSync: History 数据为空，跳过同步');
        // 即使为空也发送，让服务器知道当前状态
        const result = await sendToServer('/sync/history', []);
        if (result.success) {
          console.log('AutoSync: History 同步成功 (0 条 - 空数据)');
        }
        return result;
      }

      // 格式化数据
      const formatted = historyData.map(entry => ({
        url: String(entry.url || ''),
        provider: String(entry.provider || ''),
        title: String(entry.title || ''),
        time: Number(entry.time || Date.now())
      }));

      console.log(`AutoSync: 准备同步 ${formatted.length} 条历史记录...`);

      // 发送到服务器
      const result = await sendToServer('/sync/history', formatted);
      if (result.success) {
        console.log(`AutoSync: History 同步成功 (${formatted.length} 条)`);
      } else {
        console.error('AutoSync: History 同步失败:', result.error || '未知错误');
      }
      return result;

    } catch (error) {
      console.error('AutoSync: History 同步失败:', error);
      console.error('AutoSync: 错误详情:', error.stack);
      return { success: false, error: error.message };
    }
  }

  /**
   * 同步收藏
   */
  async function syncFavorites() {
    try {
      // 检查服务器是否可用
      const available = await checkServerAvailability();
      if (!available) {
        return { success: false, reason: 'server_unavailable' };
      }

      // 先获取远端数据（优先恢复）
      const remoteFavorites = await fetchRemoteData('favorites');
      console.log(`AutoSync: 从服务器获取到 ${remoteFavorites.length} 条收藏`);

      // 获取本地收藏数据
      let favoritesData = [];
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const res = await chrome.storage.local.get([FAVORITES_KEY]);
        favoritesData = Array.isArray(res[FAVORITES_KEY]) ? res[FAVORITES_KEY] : [];
        console.log(`AutoSync: 从 chrome.storage 读取到 ${favoritesData.length} 条收藏`);
      }

      // 如果本地为空但服务器有数据，优先恢复服务器数据
      if (favoritesData.length === 0 && remoteFavorites.length > 0) {
        console.log('AutoSync: 本地收藏为空，从服务器恢复数据');
        favoritesData = remoteFavorites;
      } else {
        // 合并本地和远端数据
        favoritesData = mergeEntries(remoteFavorites, favoritesData);
      }

      try {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          await chrome.storage.local.set({ [FAVORITES_KEY]: favoritesData });
        }
      } catch (e) {
        console.warn('AutoSync: 合并收藏后写回本地失败:', e);
      }

      // 格式化数据
      const formatted = favoritesData.map(entry => ({
        url: String(entry.url || ''),
        provider: String(entry.provider || ''),
        title: String(entry.title || ''),
        time: Number(entry.time || Date.now())
      }));

      // 发送到服务器
      const result = await sendToServer('/sync/favorites', formatted);
      if (result.success) {
        console.log(`AutoSync: Favorites 同步成功 (${formatted.length} 条)`);
      }
      return result;

    } catch (error) {
      console.error('AutoSync: Favorites 同步失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 同步所有数据
   */
  async function syncAll() {
    const results = await Promise.all([
      syncHistory(),
      syncFavorites()
    ]);

    return {
      history: results[0],
      favorites: results[1],
      allSuccess: results.every(r => r.success)
    };
  }

  /**
   * 启用自动同步（监听数据变化）
   */
  function enableAutoSync() {
    console.log('AutoSync: 已启用自动同步');

    // 等待 HistoryDB 初始化后再进行初次同步
    async function waitForHistoryDBAndSync() {
      const maxWait = 5000; // 最多等待 5 秒
      const startTime = Date.now();
      
      while (Date.now() - startTime < maxWait) {
        if (typeof window !== 'undefined' && window.HistoryDB) {
          try {
            // 尝试调用一次确保完全初始化
            await window.HistoryDB.migrateFromStorageIfAny();
            console.log('AutoSync: HistoryDB 已就绪，开始初次同步');
            await syncAll();
            return;
          } catch (e) {
            // 继续等待
          }
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // 超时后仍然尝试同步（使用降级方案）
      console.warn('AutoSync: HistoryDB 初始化超时，使用降级方案进行初次同步');
      await syncAll();
    }

    // 定期同步（每分钟）
    setInterval(async () => {
      const available = await checkServerAvailability();
      if (available) {
        await syncAll();
      }
    }, 60000); // 60秒

    // 初次同步（等待 HistoryDB 初始化）
    waitForHistoryDBAndSync();
  }

  // 公开 API
  return {
    syncHistory,
    syncFavorites,
    syncConversation,
    syncAll,
    enableAutoSync,
    checkServerAvailability,
    isConversationReadyForMirror,
    isUsefulConversationTitle,
    hasStableConversationUrl
  };
})();

// 如果在浏览器环境中，暴露到全局
if (typeof window !== 'undefined') {
  window.AutoSync = AutoSync;
}
