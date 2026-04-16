(function () {
  'use strict';

  if (window.__AISB_GEMINI_CLOUD_SYNC_LOADED__) return;
  if (location.hostname !== 'gemini.google.com') return;
  window.__AISB_GEMINI_CLOUD_SYNC_LOADED__ = true;

  const core = window.__AISB_GEMINI__;
  if (!core) {
    console.error('[AISB CloudSync] 缺少 gemini-common.js。');
    return;
  }

  const STYLE_ID = 'aisb-gemini-cloud-sync-style';
  const WRAP_ID = 'aisb-gemini-cloud-sync-wrap';
  const SYNC_META_KEY = 'gvCloudSyncMeta';
  const CHUNK_KEY_PREFIX = 'gvCloudSyncChunk_';
  const MAX_CHUNK_SIZE = 7000;

  const state = {
    sidebarTimer: null,
    sidebarObserver: null,
    ui: {
      wrap: null,
      panel: null,
      status: null,
    },
  };

  function ensureStyles() {
    core.dom.ensureStyle(
      STYLE_ID,
      `
      #${WRAP_ID} {
        position: relative;
        z-index: 1;
        width: 100%;
        margin: 8px 0 12px;
      }
      #${WRAP_ID} .aisb-cloud-trigger {
        width: 100%;
        border: 1px solid rgba(229, 231, 235, 0.9);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.95);
        color: #1f2937;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
        backdrop-filter: blur(10px);
        font-size: 12px;
        font-weight: 600;
        padding: 8px 12px;
        cursor: pointer;
      }
      #${WRAP_ID} .aisb-cloud-trigger:hover {
        background: rgba(0, 0, 0, 0.06);
      }
      #${WRAP_ID} .aisb-cloud-panel {
        margin-top: 8px;
        width: 100%;
        border: 1px solid rgba(229, 231, 235, 0.9);
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.97);
        backdrop-filter: blur(12px);
        box-shadow: 0 10px 28px rgba(0, 0, 0, 0.16);
        padding: 9px;
        display: none;
      }
      #${WRAP_ID} .aisb-cloud-panel.open {
        display: block;
        animation: aisb-gm-fade-up 200ms cubic-bezier(0.4, 0, 0.2, 1);
      }
      #${WRAP_ID} .aisb-cloud-title {
        margin: 0 0 6px;
        font-size: 13px;
        color: #6b7280;
      }
      #${WRAP_ID} .aisb-cloud-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 7px;
      }
      #${WRAP_ID} .aisb-cloud-btn {
        border: 1px solid rgba(229, 231, 235, 0.9);
        border-radius: 8px;
        background: #ffffff;
        color: #6b7280;
        font-size: 12px;
        font-weight: 600;
        padding: 8px;
        cursor: pointer;
      }
      #${WRAP_ID} .aisb-cloud-btn:hover {
        background: rgba(0, 0, 0, 0.06);
        color: #1f2937;
      }
      #${WRAP_ID} .aisb-cloud-status {
        margin-top: 8px;
        min-height: 16px;
        font-size: 12px;
        color: #22c55e;
      }
      #${WRAP_ID} .aisb-cloud-status.error { color: #ef4444; }
      #${WRAP_ID} .aisb-cloud-status.warn { color: #f59e0b; }
      #${WRAP_ID} .aisb-cloud-note {
        margin-top: 6px;
        font-size: 12px;
        color: #6b7280;
        line-height: 1.4;
      }
      @media (prefers-color-scheme: dark) {
        #${WRAP_ID} .aisb-cloud-trigger {
          border-color: rgba(75, 85, 99, 0.9);
          background: rgba(31, 41, 55, 0.92);
          color: #e5e7eb;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.45);
        }
        #${WRAP_ID} .aisb-cloud-trigger:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        #${WRAP_ID} .aisb-cloud-panel {
          border-color: rgba(75, 85, 99, 0.9);
          background: rgba(17, 24, 39, 0.95);
          box-shadow: 0 16px 32px rgba(0, 0, 0, 0.52);
        }
        #${WRAP_ID} .aisb-cloud-title,
        #${WRAP_ID} .aisb-cloud-note {
          color: #9ca3af;
        }
        #${WRAP_ID} .aisb-cloud-btn {
          border-color: rgba(75, 85, 99, 0.9);
          background: rgba(31, 41, 55, 0.88);
          color: #d1d5db;
        }
        #${WRAP_ID} .aisb-cloud-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #f3f4f6;
        }
        #${WRAP_ID} .aisb-cloud-status {
          color: #4ade80;
        }
        #${WRAP_ID} .aisb-cloud-status.error { color: #f87171; }
        #${WRAP_ID} .aisb-cloud-status.warn { color: #fbbf24; }
      }
      `,
    );
  }

  function ensureWrapMountedInSidebar() {
    if (!state.ui.wrap) return false;
    return core.dom.mountInGeminiSidebar(state.ui.wrap, { beforeRecent: true });
  }

  function scheduleSidebarRemount(delay) {
    if (state.sidebarTimer) {
      clearTimeout(state.sidebarTimer);
      state.sidebarTimer = null;
    }
    state.sidebarTimer = setTimeout(() => {
      state.sidebarTimer = null;
      ensureWrapMountedInSidebar();
    }, Number(delay) > 0 ? Number(delay) : 220);
  }

  function watchSidebarLifecycle() {
    if (state.sidebarObserver) {
      state.sidebarObserver.disconnect();
      state.sidebarObserver = null;
    }

    state.sidebarObserver = new MutationObserver(() => {
      if (!state.ui.wrap) return;
      if (!state.ui.wrap.isConnected) {
        scheduleSidebarRemount(120);
      }
    });

    state.sidebarObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  function setStatus(message, type) {
    if (!state.ui.status) return;
    state.ui.status.textContent = message || '';
    state.ui.status.className = `aisb-cloud-status ${type || ''}`;
  }

  function getSyncStorageArea() {
    try {
      if (chrome && chrome.storage && chrome.storage.sync) {
        return chrome.storage.sync;
      }
    } catch (_) {}
    return null;
  }

  function syncGet(keys) {
    const area = getSyncStorageArea();
    if (!area) return Promise.resolve({});
    return new Promise((resolve) => {
      try {
        area.get(keys, (result) => resolve(result || {}));
      } catch (_) {
        resolve({});
      }
    });
  }

  function syncSet(payload) {
    const area = getSyncStorageArea();
    if (!area) return Promise.resolve(false);
    return new Promise((resolve) => {
      try {
        area.set(payload, () => resolve(true));
      } catch (_) {
        resolve(false);
      }
    });
  }

  function syncRemove(keys) {
    const area = getSyncStorageArea();
    if (!area) return Promise.resolve(false);
    return new Promise((resolve) => {
      try {
        area.remove(keys, () => resolve(true));
      } catch (_) {
        resolve(false);
      }
    });
  }

  async function collectPayload() {
    const folder = core.module.get('folder');
    const prompt = core.module.get('prompt');
    const tools = core.module.get('tools');

    const payload = {
      format: 'gemini-voyager.cloud-sync.v1',
      exportedAt: new Date().toISOString(),
      sourceUrl: location.href,
      accountId: core.getCurrentAccountId(),
      data: {
        folders: folder && folder.exportData ? folder.exportData('all') : null,
        prompts: prompt && prompt.exportData ? prompt.exportData() : null,
        tools: tools && tools.getSettings ? tools.getSettings() : null,
      },
    };

    return payload;
  }

  function splitIntoChunks(text, maxChunkSize) {
    const chunks = [];
    let cursor = 0;
    const size = Math.max(1024, maxChunkSize || MAX_CHUNK_SIZE);
    while (cursor < text.length) {
      chunks.push(text.slice(cursor, cursor + size));
      cursor += size;
    }
    return chunks;
  }

  async function uploadToCloud() {
    setStatus('正在打包本地数据...', '');

    const payload = await collectPayload();
    const serialized = JSON.stringify(payload);
    const chunks = splitIntoChunks(serialized, MAX_CHUNK_SIZE);

    const oldMeta = await syncGet(SYNC_META_KEY);
    const oldChunkCount = oldMeta && oldMeta[SYNC_META_KEY] ? Number(oldMeta[SYNC_META_KEY].chunkCount || 0) : 0;

    const removeKeys = [];
    for (let i = 0; i < oldChunkCount; i++) {
      removeKeys.push(`${CHUNK_KEY_PREFIX}${i}`);
    }
    if (removeKeys.length) {
      await syncRemove(removeKeys);
    }

    const setPayload = {};
    chunks.forEach((chunk, index) => {
      setPayload[`${CHUNK_KEY_PREFIX}${index}`] = chunk;
    });

    setPayload[SYNC_META_KEY] = {
      chunkCount: chunks.length,
      updatedAt: new Date().toISOString(),
      byteLength: serialized.length,
      version: 1,
    };

    const ok = await syncSet(setPayload);
    if (!ok) {
      setStatus('上传失败：无法写入 chrome.storage.sync', 'error');
      return;
    }

    setStatus(`上传完成：${chunks.length} 分片，${serialized.length} 字符`, '');
    core.utils.toast('云同步上传成功', 'success');
  }

  async function downloadFromCloud() {
    setStatus('正在下载云端数据...', '');

    const metaResult = await syncGet(SYNC_META_KEY);
    const meta = metaResult && metaResult[SYNC_META_KEY] ? metaResult[SYNC_META_KEY] : null;

    if (!meta || !meta.chunkCount) {
      setStatus('云端暂无同步数据', 'warn');
      return null;
    }

    const keys = [];
    for (let i = 0; i < meta.chunkCount; i++) {
      keys.push(`${CHUNK_KEY_PREFIX}${i}`);
    }

    const chunkData = await syncGet(keys);
    const chunks = [];
    for (let i = 0; i < meta.chunkCount; i++) {
      const value = chunkData[`${CHUNK_KEY_PREFIX}${i}`];
      if (typeof value !== 'string') {
        setStatus(`云端数据分片缺失：${i + 1}/${meta.chunkCount}`, 'error');
        return null;
      }
      chunks.push(value);
    }

    const text = chunks.join('');
    try {
      const payload = JSON.parse(text);
      setStatus(`下载完成（更新于 ${meta.updatedAt || '未知时间'}）`, '');
      return payload;
    } catch (error) {
      console.error('[AISB CloudSync] 解析失败：', error);
      setStatus('下载失败：云端 JSON 解析错误', 'error');
      return null;
    }
  }

  async function mergeCloudData() {
    const payload = await downloadFromCloud();
    if (!payload || !payload.data) return;

    const folder = core.module.get('folder');
    const prompt = core.module.get('prompt');

    try {
      if (folder && folder.importData && payload.data.folders) {
        await folder.importData(payload.data.folders);
      }

      if (prompt && prompt.importData && payload.data.prompts) {
        await prompt.importData(payload.data.prompts);
      }

      if (payload.data.tools) {
        await core.storage.set('gvToolsSettings', payload.data.tools);
      }

      setStatus('合并完成：文件夹/提示词已更新', '');
      core.utils.toast('云同步下载并合并完成', 'success');
    } catch (error) {
      console.error('[AISB CloudSync] 合并失败：', error);
      setStatus('合并失败，请查看控制台错误', 'error');
    }
  }

  async function downloadPackage() {
    const payload = await downloadFromCloud();
    if (!payload) return;

    core.utils.downloadText(
      `cloud-sync-backup-${Date.now()}.json`,
      JSON.stringify(payload, null, 2),
      'application/json',
    );
    core.utils.toast('云端备份已下载', 'success');
  }

  function mount() {
    ensureStyles();

    const wrap = document.createElement('section');
    wrap.id = WRAP_ID;

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'aisb-cloud-trigger';
    trigger.textContent = '云同步';

    const panel = document.createElement('div');
    panel.className = 'aisb-cloud-panel';

    const title = document.createElement('h3');
    title.className = 'aisb-cloud-title';
    title.textContent = 'Cloud Sync（Chrome 账号同步）';

    const actions = document.createElement('div');
    actions.className = 'aisb-cloud-actions';

    const uploadBtn = document.createElement('button');
    uploadBtn.type = 'button';
    uploadBtn.className = 'aisb-cloud-btn';
    uploadBtn.textContent = '上传到云端';
    uploadBtn.addEventListener('click', () => {
      void uploadToCloud();
    });

    const mergeBtn = document.createElement('button');
    mergeBtn.type = 'button';
    mergeBtn.className = 'aisb-cloud-btn';
    mergeBtn.textContent = '下载并合并';
    mergeBtn.addEventListener('click', () => {
      void mergeCloudData();
    });

    const pullBtn = document.createElement('button');
    pullBtn.type = 'button';
    pullBtn.className = 'aisb-cloud-btn';
    pullBtn.textContent = '仅下载备份';
    pullBtn.addEventListener('click', () => {
      void downloadPackage();
    });

    const hideBtn = document.createElement('button');
    hideBtn.type = 'button';
    hideBtn.className = 'aisb-cloud-btn';
    hideBtn.textContent = '关闭';
    hideBtn.addEventListener('click', () => {
      panel.classList.remove('open');
    });

    const status = document.createElement('div');
    status.className = 'aisb-cloud-status';

    const note = document.createElement('div');
    note.className = 'aisb-cloud-note';
    note.textContent = '说明：使用 chrome.storage.sync 进行跨设备同步，容量有限，建议定期导出本地备份。';

    actions.appendChild(uploadBtn);
    actions.appendChild(mergeBtn);
    actions.appendChild(pullBtn);
    actions.appendChild(hideBtn);

    panel.appendChild(title);
    panel.appendChild(actions);
    panel.appendChild(status);
    panel.appendChild(note);

    trigger.addEventListener('click', (event) => {
      event.stopPropagation();
      panel.classList.toggle('open');
    });

    wrap.appendChild(trigger);
    wrap.appendChild(panel);

    state.ui.wrap = wrap;
    state.ui.panel = panel;
    state.ui.status = status;

    document.addEventListener('click', (event) => {
      if (!wrap.contains(event.target)) {
        panel.classList.remove('open');
      }
    });

    return ensureWrapMountedInSidebar();
  }

  function bootstrap() {
    const mounted = mount();
    watchSidebarLifecycle();

    if (!mounted) {
      let retries = 0;
      const timer = setInterval(() => {
        retries += 1;
        if (ensureWrapMountedInSidebar() || retries > 80) {
          clearInterval(timer);
        }
      }, 320);
    }

    core.route.onChange(() => {
      scheduleSidebarRemount(260);
    });

    core.module.register('cloudSync', {
      uploadToCloud,
      mergeCloudData,
      downloadFromCloud,
    });
  }

  bootstrap();
})();
