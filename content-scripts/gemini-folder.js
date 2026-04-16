(function () {
  'use strict';

  if (window.__AISB_GEMINI_FOLDER_LOADED__) return;
  if (location.hostname !== 'gemini.google.com') return;
  window.__AISB_GEMINI_FOLDER_LOADED__ = true;

  const core = window.__AISB_GEMINI__;
  if (!core) {
    console.error('[AISB Folder] 缺少 gemini-common.js，模块无法初始化。');
    return;
  }

  const STORAGE_KEY = 'gvFolderData';
  const SETTINGS_KEY = 'gvFolderSettings';
  const LEGACY_STORAGE_KEYS = ['aisbGeminiFolderData'];
  const EXPORT_FORMAT = 'aisb-gemini.folders.v1';
  const PANEL_ID = 'aisb-gemini-folder-panel';
  const STYLE_ID = 'aisb-gemini-folder-style';
  const DRAG_MIME = 'application/x-aisb-gemini-folder';

  const COLOR_PRESETS = [
    { id: 'default', color: '#6b7280', label: '默认灰' },
    { id: 'red', color: '#ef4444', label: '红色' },
    { id: 'orange', color: '#f97316', label: '橙色' },
    { id: 'yellow', color: '#eab308', label: '黄色' },
    { id: 'green', color: '#22c55e', label: '绿色' },
    { id: 'blue', color: '#3b82f6', label: '蓝色' },
    { id: 'purple', color: '#a855f7', label: '紫色' },
    { id: 'pink', color: '#ec4899', label: '粉色' },
  ];

  const state = {
    loaded: false,
    data: createEmptyData(),
    settings: {
      currentAccountOnly: true,
      search: '',
      bulkMode: false,
      autoExpandOnSearch: true,
      panelCollapsed: false,
    },
    currentAccountId: core.getCurrentAccountId(),
    selectedKeys: new Set(),
    dragState: {
      activeFolderId: null,
      activeConversation: null,
      sourceFolderId: null,
      dropPosition: null,
    },
    ui: {
      panel: null,
      list: null,
      searchInput: null,
      status: null,
      bulkBar: null,
      accountBadge: null,
      importInput: null,
      contextMenu: null,
      moveDialog: null,
    },
    sidebar: {
      container: null,
      recentSection: null,
      observer: null,
      rootObserver: null,
      rebalanceTimer: null,
    },
  };

  function now() {
    return Date.now();
  }

  function createFolderId() {
    return core.uid('fld');
  }

  function createEmptyData() {
    return {
      schemaVersion: 2,
      format: EXPORT_FORMAT,
      folders: [],
      folderContents: {},
      meta: {
        createdAt: now(),
        updatedAt: now(),
      },
    };
  }

  function normalizeFolderColor(color) {
    if (!color || typeof color !== 'string') return 'default';
    const value = color.trim().toLowerCase();
    if (!value) return 'default';
    if (value.startsWith('#')) return value;
    const found = COLOR_PRESETS.find((item) => item.id === value);
    return found ? found.id : 'default';
  }

  function getFolderColorValue(colorId) {
    if (!colorId || colorId === 'default') {
      return COLOR_PRESETS[0].color;
    }
    if (colorId.startsWith('#')) return colorId;
    const found = COLOR_PRESETS.find((item) => item.id === colorId);
    return found ? found.color : COLOR_PRESETS[0].color;
  }

  function sanitizeFolderName(name) {
    return String(name || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function sanitizeConversationTitle(title) {
    return String(title || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function getFolderMap() {
    const map = Object.create(null);
    for (const folder of state.data.folders) {
      map[folder.id] = folder;
    }
    return map;
  }

  function ensureFolderContent(folderId) {
    if (!state.data.folderContents[folderId]) {
      state.data.folderContents[folderId] = [];
    }
    return state.data.folderContents[folderId];
  }

  function normalizeConversation(raw, fallbackAccountId) {
    if (!raw || typeof raw !== 'object') return null;
    const conversationId =
      typeof raw.conversationId === 'string' && raw.conversationId.trim()
        ? raw.conversationId.trim()
        : '';
    if (!conversationId) return null;

    const title = sanitizeConversationTitle(raw.title || raw.name || '未命名会话') || '未命名会话';
    const url = typeof raw.url === 'string' ? raw.url : core.dom.buildConversationUrlById(conversationId);
    const sortIndex = Number.isFinite(Number(raw.sortIndex)) ? Number(raw.sortIndex) : now();

    return {
      conversationId,
      title,
      url,
      addedAt: Number.isFinite(Number(raw.addedAt)) ? Number(raw.addedAt) : now(),
      lastOpenedAt: Number.isFinite(Number(raw.lastOpenedAt)) ? Number(raw.lastOpenedAt) : undefined,
      updatedAt: Number.isFinite(Number(raw.updatedAt)) ? Number(raw.updatedAt) : now(),
      starred: Boolean(raw.starred),
      customTitle: Boolean(raw.customTitle),
      isGem: Boolean(raw.isGem),
      gemId: typeof raw.gemId === 'string' ? raw.gemId : undefined,
      accountId:
        typeof raw.accountId === 'string' && raw.accountId.trim()
          ? raw.accountId.trim()
          : fallbackAccountId || state.currentAccountId,
      sortIndex,
    };
  }

  function normalizeFolder(raw, fallbackAccountId) {
    if (!raw || typeof raw !== 'object') return null;
    const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : createFolderId();
    const name = sanitizeFolderName(raw.name || raw.title || '未命名文件夹') || '未命名文件夹';

    return {
      id,
      name,
      parentId: typeof raw.parentId === 'string' && raw.parentId.trim() ? raw.parentId.trim() : null,
      isExpanded: raw.isExpanded !== false,
      pinned: Boolean(raw.pinned),
      color: normalizeFolderColor(raw.color),
      createdAt: Number.isFinite(Number(raw.createdAt)) ? Number(raw.createdAt) : now(),
      updatedAt: Number.isFinite(Number(raw.updatedAt)) ? Number(raw.updatedAt) : now(),
      sortIndex: Number.isFinite(Number(raw.sortIndex)) ? Number(raw.sortIndex) : now(),
      accountId:
        typeof raw.accountId === 'string' && raw.accountId.trim()
          ? raw.accountId.trim()
          : fallbackAccountId || state.currentAccountId,
    };
  }

  function normalizeData(rawData) {
    const output = createEmptyData();
    if (!rawData || typeof rawData !== 'object') {
      return output;
    }

    // 兼容两种导入结构：1) {data:{...}} 2) 直接对象。
    const source =
      rawData.data && typeof rawData.data === 'object' && (rawData.data.folders || rawData.data.folderContents)
        ? rawData.data
        : rawData;

    const inputFolders = Array.isArray(source.folders) ? source.folders : [];
    const inputContents = source.folderContents && typeof source.folderContents === 'object' ? source.folderContents : {};

    const folderMap = Object.create(null);
    for (const item of inputFolders) {
      const folder = normalizeFolder(item, state.currentAccountId);
      if (!folder) continue;
      if (folderMap[folder.id]) continue;
      folderMap[folder.id] = folder;
      output.folders.push(folder);
    }

    // 修复父级关系并限制为两级结构。
    for (const folder of output.folders) {
      if (!folder.parentId) continue;
      const parent = folderMap[folder.parentId];
      if (!parent) {
        folder.parentId = null;
        continue;
      }
      if (parent.parentId) {
        // 超过两级时自动提升为顶级。
        folder.parentId = null;
      }
    }

    // 防循环保护。
    const seenChain = new Set();
    for (const folder of output.folders) {
      seenChain.clear();
      let current = folder;
      while (current && current.parentId) {
        if (seenChain.has(current.id)) {
          folder.parentId = null;
          break;
        }
        seenChain.add(current.id);
        current = folderMap[current.parentId] || null;
      }
    }

    for (const folder of output.folders) {
      const rawList = Array.isArray(inputContents[folder.id]) ? inputContents[folder.id] : [];
      const list = [];
      const dedupe = new Set();
      for (const rawConversation of rawList) {
        const conversation = normalizeConversation(rawConversation, folder.accountId);
        if (!conversation) continue;
        if (dedupe.has(conversation.conversationId)) continue;
        dedupe.add(conversation.conversationId);
        list.push(conversation);
      }

      list.sort((a, b) => {
        const pa = Number(a.sortIndex || a.updatedAt || a.addedAt || 0);
        const pb = Number(b.sortIndex || b.updatedAt || b.addedAt || 0);
        return pa - pb;
      });
      output.folderContents[folder.id] = list;
    }

    output.folders.sort((a, b) => {
      if (a.parentId !== b.parentId) {
        if (!a.parentId) return -1;
        if (!b.parentId) return 1;
      }
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      const ai = Number(a.sortIndex || a.updatedAt || 0);
      const bi = Number(b.sortIndex || b.updatedAt || 0);
      if (ai !== bi) return ai - bi;
      return a.name.localeCompare(b.name, 'zh-CN');
    });

    output.meta = {
      createdAt: Number.isFinite(Number(source.meta && source.meta.createdAt))
        ? Number(source.meta.createdAt)
        : now(),
      updatedAt: now(),
    };

    return output;
  }

  function getStoragePayload() {
    return {
      schemaVersion: 2,
      format: EXPORT_FORMAT,
      data: {
        folders: state.data.folders,
        folderContents: state.data.folderContents,
        meta: state.data.meta,
      },
      exportedAt: new Date().toISOString(),
      version: 'ai-sidebar-sr8',
    };
  }

  async function loadSettings() {
    const saved = await core.storage.get(SETTINGS_KEY, null);
    if (saved && typeof saved === 'object') {
      state.settings.currentAccountOnly = saved.currentAccountOnly !== false;
      state.settings.search = typeof saved.search === 'string' ? saved.search : '';
      state.settings.bulkMode = Boolean(saved.bulkMode);
      state.settings.autoExpandOnSearch = saved.autoExpandOnSearch !== false;
      state.settings.panelCollapsed = Boolean(saved.panelCollapsed);
    }
  }

  async function saveSettings() {
    await core.storage.set(SETTINGS_KEY, {
      currentAccountOnly: state.settings.currentAccountOnly,
      search: state.settings.search,
      bulkMode: state.settings.bulkMode,
      autoExpandOnSearch: state.settings.autoExpandOnSearch,
      panelCollapsed: state.settings.panelCollapsed,
    });
  }

  async function loadData() {
    let raw = await core.storage.get(STORAGE_KEY, null);

    if (!raw) {
      // 兼容历史 key。
      for (const legacyKey of LEGACY_STORAGE_KEYS) {
        const legacy = await core.storage.get(legacyKey, null);
        if (legacy) {
          raw = legacy;
          break;
        }
      }
    }

    state.data = normalizeData(raw);
    state.loaded = true;
  }

  async function saveData() {
    state.data.meta.updatedAt = now();
    const normalized = normalizeData(state.data);
    state.data = normalized;
    await core.storage.set(STORAGE_KEY, normalized);
    core.events.emit('folder:data-updated', {
      updatedAt: state.data.meta.updatedAt,
      folderCount: state.data.folders.length,
    });
  }

  function setStatus(message, type, duration) {
    if (!state.ui.status) return;
    state.ui.status.textContent = message || '';
    state.ui.status.className = `aisb-folder-status ${type || ''}`;

    if (state.ui.statusTimer) {
      clearTimeout(state.ui.statusTimer);
      state.ui.statusTimer = null;
    }

    if (message) {
      state.ui.statusTimer = setTimeout(() => {
        if (!state.ui.status) return;
        state.ui.status.textContent = '';
        state.ui.status.className = 'aisb-folder-status';
      }, Number(duration) > 0 ? Number(duration) : 3200);
    }
  }

  function getVisibleFolderIds() {
    const all = [];
    const map = getFolderMap();
    const query = state.settings.search.trim().toLowerCase();

    function folderMatches(folder) {
      if (state.settings.currentAccountOnly && folder.accountId !== state.currentAccountId) {
        return false;
      }

      if (!query) return true;
      if (folder.name.toLowerCase().includes(query)) return true;

      const conversations = ensureFolderContent(folder.id);
      for (const conversation of conversations) {
        if (conversation.title.toLowerCase().includes(query)) return true;
      }

      const children = state.data.folders.filter((item) => item.parentId === folder.id);
      for (const child of children) {
        if (folderMatches(child)) return true;
      }

      return false;
    }

    for (const folder of state.data.folders) {
      if (!folderMatches(folder)) continue;

      if (folder.parentId) {
        const parent = map[folder.parentId];
        if (parent && folderMatches(parent)) {
          all.push(folder.id);
        }
      } else {
        all.push(folder.id);
      }
    }

    return new Set(all);
  }

  function getRootFolders() {
    const visibleSet = getVisibleFolderIds();
    return state.data.folders
      .filter((folder) => !folder.parentId && visibleSet.has(folder.id))
      .sort(sortFolder);
  }

  function getChildFolders(parentId) {
    const visibleSet = getVisibleFolderIds();
    return state.data.folders
      .filter((folder) => folder.parentId === parentId && visibleSet.has(folder.id))
      .sort(sortFolder);
  }

  function sortFolder(a, b) {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    const ai = Number(a.sortIndex || a.updatedAt || 0);
    const bi = Number(b.sortIndex || b.updatedAt || 0);
    if (ai !== bi) return ai - bi;
    return a.name.localeCompare(b.name, 'zh-CN');
  }

  function sortConversation(a, b) {
    const ai = Number(a.sortIndex || a.updatedAt || a.addedAt || 0);
    const bi = Number(b.sortIndex || b.updatedAt || b.addedAt || 0);
    if (ai !== bi) return ai - bi;
    return (a.title || '').localeCompare(b.title || '', 'zh-CN');
  }

  function getFolderLevel(folderId) {
    const folder = state.data.folders.find((item) => item.id === folderId);
    if (!folder) return 0;
    if (!folder.parentId) return 0;
    return 1;
  }

  function canMoveFolderInside(sourceFolderId, targetFolderId) {
    if (!sourceFolderId || !targetFolderId || sourceFolderId === targetFolderId) {
      return false;
    }
    const source = state.data.folders.find((item) => item.id === sourceFolderId);
    const target = state.data.folders.find((item) => item.id === targetFolderId);
    if (!source || !target) return false;

    // 只能挂到顶级文件夹下面，保证两级结构。
    if (target.parentId) return false;

    // 防止循环。
    let current = target;
    while (current) {
      if (current.id === source.id) return false;
      if (!current.parentId) break;
      current = state.data.folders.find((item) => item.id === current.parentId);
    }

    // 若 source 已有子文件夹，不允许再下沉，避免出现三级。
    const sourceChildren = state.data.folders.some((item) => item.parentId === source.id);
    if (sourceChildren) return false;

    return true;
  }

  function isConversationVisible(conversation) {
    if (!conversation) return false;
    if (!state.settings.currentAccountOnly) return true;
    return conversation.accountId === state.currentAccountId;
  }

  function createButton(text, className, title, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = text;
    if (title) button.title = title;
    if (typeof onClick === 'function') button.addEventListener('click', onClick);
    return button;
  }

  function showContextMenu(items, clientX, clientY) {
    closeContextMenu();

    const menu = document.createElement('div');
    menu.className = 'aisb-folder-context-menu';

    for (const item of items) {
      if (item.type === 'separator') {
        const separator = document.createElement('div');
        separator.className = 'aisb-folder-menu-separator';
        menu.appendChild(separator);
        continue;
      }

      const button = document.createElement('button');
      button.type = 'button';
      button.className = `aisb-folder-menu-item ${item.danger ? 'danger' : ''}`;
      button.textContent = item.label;
      if (item.disabled) {
        button.disabled = true;
      }
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        closeContextMenu();
        if (!item.disabled && typeof item.onClick === 'function') {
          item.onClick();
        }
      });
      menu.appendChild(button);
    }

    document.body.appendChild(menu);
    state.ui.contextMenu = menu;

    const margin = 8;
    const rect = menu.getBoundingClientRect();
    let left = clientX;
    let top = clientY;
    if (left + rect.width + margin > window.innerWidth) {
      left = window.innerWidth - rect.width - margin;
    }
    if (top + rect.height + margin > window.innerHeight) {
      top = window.innerHeight - rect.height - margin;
    }

    menu.style.left = `${Math.max(margin, left)}px`;
    menu.style.top = `${Math.max(margin, top)}px`;

    setTimeout(() => {
      document.addEventListener('click', closeContextMenu, { once: true });
    }, 0);
  }

  function closeContextMenu() {
    if (state.ui.contextMenu && state.ui.contextMenu.parentElement) {
      state.ui.contextMenu.parentElement.removeChild(state.ui.contextMenu);
    }
    state.ui.contextMenu = null;
  }

  function showMoveDialog(onConfirm) {
    closeMoveDialog();

    const overlay = document.createElement('div');
    overlay.className = 'aisb-folder-dialog-overlay';

    const dialog = document.createElement('div');
    dialog.className = 'aisb-folder-dialog';

    const title = document.createElement('h3');
    title.className = 'aisb-folder-dialog-title';
    title.textContent = '选择目标文件夹';

    const list = document.createElement('div');
    list.className = 'aisb-folder-dialog-list';

    const rootFolders = getRootFolders();
    let selectedFolderId = rootFolders.length ? rootFolders[0].id : null;

    for (const folder of rootFolders) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'aisb-folder-dialog-item';
      item.textContent = folder.name;
      item.dataset.folderId = folder.id;
      if (selectedFolderId === folder.id) {
        item.classList.add('active');
      }
      item.addEventListener('click', () => {
        selectedFolderId = folder.id;
        list.querySelectorAll('.aisb-folder-dialog-item').forEach((el) => el.classList.remove('active'));
        item.classList.add('active');
      });
      list.appendChild(item);

      const children = getChildFolders(folder.id);
      for (const child of children) {
        const childItem = document.createElement('button');
        childItem.type = 'button';
        childItem.className = 'aisb-folder-dialog-item is-child';
        childItem.textContent = `└ ${child.name}`;
        childItem.dataset.folderId = child.id;
        childItem.addEventListener('click', () => {
          selectedFolderId = child.id;
          list.querySelectorAll('.aisb-folder-dialog-item').forEach((el) => el.classList.remove('active'));
          childItem.classList.add('active');
        });
        list.appendChild(childItem);
      }
    }

    if (!list.childElementCount) {
      const empty = document.createElement('div');
      empty.className = 'aisb-folder-dialog-empty';
      empty.textContent = '请先创建文件夹';
      list.appendChild(empty);
    }

    const actions = document.createElement('div');
    actions.className = 'aisb-folder-dialog-actions';

    const cancelButton = createButton('取消', 'aisb-folder-dialog-btn', '', closeMoveDialog);
    const confirmButton = createButton('移动', 'aisb-folder-dialog-btn primary', '', () => {
      if (!selectedFolderId) {
        setStatus('未选择目标文件夹', 'warn');
        return;
      }
      closeMoveDialog();
      onConfirm(selectedFolderId);
    });

    actions.appendChild(cancelButton);
    actions.appendChild(confirmButton);

    dialog.appendChild(title);
    dialog.appendChild(list);
    dialog.appendChild(actions);
    overlay.appendChild(dialog);

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) closeMoveDialog();
    });

    document.body.appendChild(overlay);
    state.ui.moveDialog = overlay;
  }

  function closeMoveDialog() {
    if (state.ui.moveDialog && state.ui.moveDialog.parentElement) {
      state.ui.moveDialog.parentElement.removeChild(state.ui.moveDialog);
    }
    state.ui.moveDialog = null;
  }

  function ensureStyles() {
    core.dom.ensureStyle(
      STYLE_ID,
      `
      #${PANEL_ID} {
        margin: 8px 0 12px;
        border: 1px solid #e5e7eb;
        border-radius: 14px;
        background: #ffffff;
        color: #1f2937;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        animation: aisb-gm-fade-up 200ms ease;
      }
      #${PANEL_ID} * { box-sizing: border-box; }
      #${PANEL_ID} .aisb-folder-header {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 8px;
        padding: 10px;
        border-bottom: 1px solid #e5e7eb;
        background: #ffffff;
      }
      #${PANEL_ID} .aisb-folder-title-wrap {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      #${PANEL_ID} .aisb-folder-collapse-btn {
        border: none;
        background: transparent;
        color: #6b7280;
        font-size: 14px;
        padding: 0;
        width: 20px;
        height: 20px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background-color 150ms, transform 150ms;
      }
      #${PANEL_ID} .aisb-folder-collapse-btn:hover {
        background: rgba(0, 0, 0, 0.05);
      }
      #${PANEL_ID} .aisb-folder-title {
        font-size: 14px;
        font-weight: 600;
        color: #1f2937;
      }
      #${PANEL_ID}.collapsed .aisb-folder-search-row,
      #${PANEL_ID}.collapsed .aisb-folder-status,
      #${PANEL_ID}.collapsed .aisb-folder-list,
      #${PANEL_ID}.collapsed .aisb-folder-bulkbar {
        display: none !important;
      }
      #${PANEL_ID} .aisb-folder-account {
        font-size: 12px;
        color: #6b7280;
        background: rgba(0, 0, 0, 0.06);
        border-radius: 999px;
        padding: 2px 8px;
      }
      #${PANEL_ID} .aisb-folder-actions {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      #${PANEL_ID} .aisb-folder-btn {
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        background: transparent;
        font-size: 12px;
        color: #1f2937;
        font-weight: 500;
        cursor: pointer;
        padding: 6px 8px;
        line-height: 1;
        transition: all 0.2s ease;
      }
      #${PANEL_ID} .aisb-folder-btn:hover {
        background: rgba(0, 0, 0, 0.05);
        border-color: rgba(0, 0, 0, 0.2);
      }
      #${PANEL_ID} .aisb-folder-btn:focus-visible {
        outline: 2px solid rgba(26, 115, 232, 0.45);
        outline-offset: 2px;
      }
      #${PANEL_ID} .aisb-folder-btn.active {
        background: #e0e7ff;
        border-color: rgba(59, 130, 246, 0.6);
        color: #1e40af;
      }
      #${PANEL_ID} .aisb-folder-search-row {
        padding: 8px 10px;
        border-bottom: 1px solid #e5e7eb;
      }
      #${PANEL_ID} .aisb-folder-search {
        width: 100%;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        font-size: 13px;
        padding: 7px 9px;
        background: #ffffff;
        color: #1f2937;
      }
      #${PANEL_ID} .aisb-folder-search:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
        outline: none;
      }
      #${PANEL_ID} .aisb-folder-status {
        min-height: 18px;
        padding: 4px 10px 0;
        font-size: 12px;
        color: #22c55e;
      }
      #${PANEL_ID} .aisb-folder-status.error { color: #ef4444; }
      #${PANEL_ID} .aisb-folder-status.warn { color: #f59e0b; }
      #${PANEL_ID} .aisb-folder-bulkbar {
        display: none;
        align-items: center;
        gap: 6px;
        padding: 8px 10px;
        background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
        border-top: 1px solid #10b981;
        border-bottom: 1px solid #10b981;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08), 0 0 0 1px #10b981;
      }
      #${PANEL_ID} .aisb-folder-bulkbar.active { display: flex; }
      #${PANEL_ID} .aisb-folder-bulk-label {
        font-size: 12px;
        color: #1f2937;
        margin-right: auto;
      }
      #${PANEL_ID} .aisb-folder-list {
        max-height: min(55vh, 560px);
        overflow: auto;
        padding: 8px;
      }
      #${PANEL_ID} .aisb-folder-empty {
        padding: 10px 8px;
        font-size: 13px;
        color: #6b7280;
      }
      #${PANEL_ID} .aisb-folder-item {
        border: 1px solid transparent;
        border-radius: 8px;
        margin-bottom: 6px;
        overflow: hidden;
        transition: border-color 200ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1);
      }
      #${PANEL_ID} .aisb-folder-item:hover {
        border-color: #e5e7eb;
      }
      #${PANEL_ID} .aisb-folder-item.dragover-before {
        box-shadow: inset 0 2px 0 #3b82f6;
      }
      #${PANEL_ID} .aisb-folder-item.dragover-after {
        box-shadow: inset 0 -2px 0 #3b82f6;
      }
      #${PANEL_ID} .aisb-folder-item.dragover-inside {
        outline: 1px dashed rgba(59, 130, 246, 0.64);
        background: rgba(59, 130, 246, 0.10);
      }
      #${PANEL_ID} .aisb-folder-row {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 7px 8px;
        border-radius: 8px;
        background: transparent;
        border: 1px solid transparent;
        transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1), background-color 200ms cubic-bezier(0.4, 0, 0.2, 1);
      }
      #${PANEL_ID} .aisb-folder-row.level-1 {
        margin-left: 16px;
      }
      #${PANEL_ID} .aisb-folder-row:hover {
        background: #f3f4f6;
        transform: none;
      }
      #${PANEL_ID} .aisb-folder-row.aisb-folder-dragover {
        background: rgba(59, 130, 246, 0.12);
        outline: 2px dashed rgba(59, 130, 246, 0.64);
        outline-offset: -1px;
      }
      #${PANEL_ID} .aisb-folder-toggle {
        border: none;
        width: 16px;
        background: transparent;
        color: #6b7280;
        font-size: 13px;
        padding: 0;
        cursor: pointer;
      }
      #${PANEL_ID} .aisb-folder-color {
        width: 13px;
        height: 13px;
        border-radius: 4px;
        border: 1px solid rgba(209, 213, 219, 0.72);
        cursor: pointer;
        flex: 0 0 13px;
      }
      #${PANEL_ID} .aisb-folder-name {
        flex: 1;
        min-width: 0;
        font-size: 13px;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        cursor: default;
      }
      #${PANEL_ID} .aisb-folder-meta {
        font-size: 12px;
        color: #6b7280;
      }
      #${PANEL_ID} .aisb-folder-menu-btn {
        border: none;
        background: transparent;
        color: #6b7280;
        border-radius: 6px;
        padding: 2px 5px;
        cursor: pointer;
      }
      #${PANEL_ID} .aisb-folder-menu-btn:hover {
        background: rgba(0, 0, 0, 0.06);
        color: #1f2937;
      }
      #${PANEL_ID} .aisb-folder-content {
        display: grid;
        grid-template-rows: 1fr;
        transition: grid-template-rows 220ms cubic-bezier(0.4, 0, 0.2, 1), opacity 220ms cubic-bezier(0.4, 0, 0.2, 1);
        opacity: 1;
      }
      #${PANEL_ID} .aisb-folder-content.collapsed {
        grid-template-rows: 0fr;
        opacity: 0;
      }
      #${PANEL_ID} .aisb-folder-content-inner {
        min-height: 0;
        overflow: hidden;
        padding: 0 0 4px;
      }
      #${PANEL_ID} .aisb-folder-conversation {
        display: flex;
        align-items: center;
        gap: 6px;
        margin: 4px 0 0 24px;
        border-radius: 8px;
        padding: 6px 7px;
        background: transparent;
        border: 1px solid transparent;
        font-size: 13px;
        transition: background-color 200ms cubic-bezier(0.4, 0, 0.2, 1), border-color 200ms cubic-bezier(0.4, 0, 0.2, 1);
      }
      #${PANEL_ID} .aisb-folder-conversation.level-1 {
        margin-left: 40px;
      }
      #${PANEL_ID} .aisb-folder-conversation:hover {
        background: #f3f4f6;
        border-color: rgba(0, 0, 0, 0.08);
      }
      #${PANEL_ID} .aisb-folder-conversation.dragover {
        outline: 1px dashed rgba(59, 130, 246, 0.70);
        background: rgba(59, 130, 246, 0.12);
      }
      #${PANEL_ID} .aisb-folder-conv-check,
      #${PANEL_ID} .aisb-folder-folder-check {
        display: none;
      }
      #${PANEL_ID}.bulk-mode .aisb-folder-conv-check,
      #${PANEL_ID}.bulk-mode .aisb-folder-folder-check {
        display: inline-flex;
      }
      #${PANEL_ID} .aisb-folder-conversation-title {
        flex: 1;
        min-width: 0;
        color: inherit;
        text-decoration: none;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      #${PANEL_ID} .aisb-folder-conversation-title:hover {
        text-decoration: underline;
      }
      #${PANEL_ID} .aisb-folder-conversation-actions {
        display: flex;
        gap: 4px;
      }
      #${PANEL_ID} .aisb-folder-mini-btn {
        border: none;
        border-radius: 6px;
        background: transparent;
        color: #1f2937;
        padding: 2px 4px;
        cursor: pointer;
        font-size: 12px;
      }
      #${PANEL_ID} .aisb-folder-mini-btn:hover {
        background: rgba(0, 0, 0, 0.05);
      }
      .aisb-folder-context-menu {
        position: fixed;
        z-index: 2147483646;
        min-width: 180px;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        background: #ffffff;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        padding: 4px;
        animation: aisb-gm-fade-up 150ms ease-out;
      }
      .aisb-folder-menu-item {
        width: 100%;
        text-align: left;
        border: none;
        border-radius: 4px;
        background: transparent;
        padding: 8px 12px;
        font-size: 14px;
        cursor: pointer;
        color: #1f2937;
        transition: background-color 0.2s ease;
      }
      .aisb-folder-menu-item:hover {
        background: #f3f4f6;
      }
      .aisb-folder-menu-item.danger {
        color: #ef4444;
      }
      .aisb-folder-menu-separator {
        border-top: 1px solid #e5e7eb;
        margin: 4px 0;
      }
      .aisb-folder-color-picker {
        position: fixed;
        z-index: 2147483646;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        background: #ffffff;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        padding: 12px;
        animation: aisb-gm-fade-up 150ms ease-out;
      }
      .aisb-folder-color-grid {
        display: grid;
        grid-template-columns: repeat(4, 36px);
        gap: 8px;
      }
      .aisb-folder-color-item {
        width: 36px;
        height: 36px;
        border-radius: 8px;
        border: 2px solid transparent;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }
      .aisb-folder-color-item:hover {
        transform: scale(1.1);
        border-color: #1f2937;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      }
      .aisb-folder-color-custom {
        width: 100%;
        margin-top: 8px;
      }
      .aisb-folder-dialog-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 2147483645;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: aisb-gm-fade 200ms cubic-bezier(0.4, 0, 0.2, 1);
      }
      .aisb-folder-dialog {
        width: min(420px, calc(100vw - 24px));
        max-height: min(70vh, 560px);
        background: #ffffff;
        border-radius: 12px;
        border: 1px solid #e5e7eb;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        flex-direction: column;
        animation: aisb-gm-fade-up 200ms ease-out;
      }
      .aisb-folder-dialog-title {
        margin: 0;
        padding: 12px 14px 8px;
        font-size: 16px;
      }
      .aisb-folder-dialog-list {
        padding: 6px 14px 12px;
        overflow: auto;
        max-height: min(46vh, 380px);
      }
      .aisb-folder-dialog-empty {
        color: #6b7280;
        font-size: 13px;
        padding: 10px 4px;
      }
      .aisb-folder-dialog-item {
        width: 100%;
        text-align: left;
        border: none;
        border-radius: 6px;
        background: transparent;
        padding: 10px 12px;
        font-size: 14px;
        margin-bottom: 6px;
        cursor: pointer;
        transition: background-color 0.2s;
      }
      .aisb-folder-dialog-item:hover {
        background: #f3f4f6;
      }
      .aisb-folder-dialog-item.is-child { margin-left: 12px; width: calc(100% - 12px); }
      .aisb-folder-dialog-item.active {
        border: 1px solid rgba(59, 130, 246, 0.6);
        background: #e0e7ff;
        color: #1e40af;
      }
      .aisb-folder-dialog-actions {
        padding: 10px 14px 14px;
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }
      .aisb-folder-dialog-btn {
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        background: transparent;
        color: #1f2937;
        padding: 7px 12px;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .aisb-folder-dialog-btn:hover {
        background: rgba(0, 0, 0, 0.05);
        border-color: rgba(0, 0, 0, 0.2);
      }
      .aisb-folder-dialog-btn.primary {
        border-color: #1a73e8;
        color: #ffffff;
        background: #1a73e8;
      }
      [data-test-id="conversation"].aisb-folder-draggable { cursor: grab; }
      [data-test-id="conversation"].aisb-folder-dragging { opacity: .56; }
      [data-test-id="conversation"].aisb-folder-native-selected {
        outline: none;
        box-shadow: inset 3px 0 0 #34d399;
        background: linear-gradient(to right, rgba(16, 185, 129, 0.12) 0%, transparent 100%);
      }

      /* 深色模式：系统偏好 */
      @media (prefers-color-scheme: dark) {
        #${PANEL_ID} {
          border-color: #374151;
          background: #1f2937;
          color: #e5e7eb;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        }
        #${PANEL_ID} .aisb-folder-header,
        #${PANEL_ID} .aisb-folder-search-row {
          border-bottom-color: #374151;
          background: #1f2937;
        }
        #${PANEL_ID} .aisb-folder-account,
        #${PANEL_ID} .aisb-folder-empty,
        #${PANEL_ID} .aisb-folder-meta,
        #${PANEL_ID} .aisb-folder-dialog-empty {
          color: #9ca3af;
        }
        #${PANEL_ID} .aisb-folder-account {
          background: rgba(255, 255, 255, 0.08);
        }
        #${PANEL_ID} .aisb-folder-btn,
        #${PANEL_ID} .aisb-folder-search,
        #${PANEL_ID} .aisb-folder-dialog-btn {
          border-color: rgba(255, 255, 255, 0.12);
          color: #e5e7eb;
        }
        #${PANEL_ID} .aisb-folder-search {
          background: rgba(31, 41, 55, 0.6);
        }
        #${PANEL_ID} .aisb-folder-btn:hover,
        #${PANEL_ID} .aisb-folder-dialog-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.2);
        }
        #${PANEL_ID} .aisb-folder-btn.active {
          background: #1e40af;
          border-color: #60a5fa;
          color: #dbeafe;
        }
        #${PANEL_ID} .aisb-folder-bulkbar {
          background: linear-gradient(135deg, #065f46 0%, #064e3b 100%);
          border-top-color: #10b981;
          border-bottom-color: #10b981;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.1), 0 2px 4px rgba(0, 0, 0, 0.2), 0 0 0 1px #10b981;
        }
        #${PANEL_ID} .aisb-folder-bulk-label {
          color: #e5e7eb;
        }
        #${PANEL_ID} .aisb-folder-item:hover {
          border-color: #374151;
        }
        #${PANEL_ID} .aisb-folder-row:hover,
        #${PANEL_ID} .aisb-folder-conversation:hover {
          background: #374151;
          border-color: rgba(255, 255, 255, 0.12);
        }
        #${PANEL_ID} .aisb-folder-menu-btn,
        #${PANEL_ID} .aisb-folder-mini-btn,
        #${PANEL_ID} .aisb-folder-toggle {
          color: #9ca3af;
        }
        #${PANEL_ID} .aisb-folder-menu-btn:hover,
        #${PANEL_ID} .aisb-folder-mini-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #e5e7eb;
        }
        #${PANEL_ID} .aisb-folder-item.dragover-inside,
        #${PANEL_ID} .aisb-folder-conversation.dragover {
          background: #1e3a8a;
          outline-color: #60a5fa;
        }
        .aisb-folder-context-menu,
        .aisb-folder-color-picker,
        .aisb-folder-dialog {
          background: #1f2937;
          border-color: #374151;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        }
        .aisb-folder-menu-separator {
          border-top-color: #374151;
        }
        .aisb-folder-menu-item {
          color: #e5e7eb;
        }
        .aisb-folder-menu-item:hover {
          background: #374151;
        }
        .aisb-folder-color-item:hover {
          border-color: #e5e7eb;
        }
        .aisb-folder-dialog-title {
          color: #e5e7eb;
          border-bottom: 1px solid #374151;
        }
        .aisb-folder-dialog-item {
          color: #e5e7eb;
        }
        .aisb-folder-dialog-item:hover {
          background: #374151;
        }
        .aisb-folder-dialog-item.active {
          border-color: #60a5fa;
          background: #1e40af;
          color: #dbeafe;
        }
        .aisb-folder-dialog-btn.primary {
          border-color: #60a5fa;
          background: #1e40af;
          color: #dbeafe;
        }
        [data-test-id="conversation"].aisb-folder-native-selected {
          box-shadow: inset 3px 0 0 #6ee7b7;
          background: linear-gradient(to right, rgba(16, 185, 129, 0.10) 0%, transparent 100%);
        }
      }

      /* 深色模式：显式主题类与属性 */
      html.dark-theme #${PANEL_ID},
      body.dark-theme #${PANEL_ID},
      html[data-theme="dark"] #${PANEL_ID},
      body[data-theme="dark"] #${PANEL_ID} {
        border-color: #374151;
        background: #1f2937;
        color: #e5e7eb;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      }
      html.dark-theme #${PANEL_ID} .aisb-folder-header,
      body.dark-theme #${PANEL_ID} .aisb-folder-header,
      html[data-theme="dark"] #${PANEL_ID} .aisb-folder-header,
      body[data-theme="dark"] #${PANEL_ID} .aisb-folder-header,
      html.dark-theme #${PANEL_ID} .aisb-folder-search-row,
      body.dark-theme #${PANEL_ID} .aisb-folder-search-row,
      html[data-theme="dark"] #${PANEL_ID} .aisb-folder-search-row,
      body[data-theme="dark"] #${PANEL_ID} .aisb-folder-search-row {
        border-bottom-color: #374151;
        background: #1f2937;
      }
      html.dark-theme #${PANEL_ID} .aisb-folder-account,
      body.dark-theme #${PANEL_ID} .aisb-folder-account,
      html[data-theme="dark"] #${PANEL_ID} .aisb-folder-account,
      body[data-theme="dark"] #${PANEL_ID} .aisb-folder-account,
      html.dark-theme #${PANEL_ID} .aisb-folder-empty,
      body.dark-theme #${PANEL_ID} .aisb-folder-empty,
      html[data-theme="dark"] #${PANEL_ID} .aisb-folder-empty,
      body[data-theme="dark"] #${PANEL_ID} .aisb-folder-empty,
      html.dark-theme #${PANEL_ID} .aisb-folder-meta,
      body.dark-theme #${PANEL_ID} .aisb-folder-meta,
      html[data-theme="dark"] #${PANEL_ID} .aisb-folder-meta,
      body[data-theme="dark"] #${PANEL_ID} .aisb-folder-meta,
      html.dark-theme #${PANEL_ID} .aisb-folder-dialog-empty,
      body.dark-theme #${PANEL_ID} .aisb-folder-dialog-empty,
      html[data-theme="dark"] #${PANEL_ID} .aisb-folder-dialog-empty,
      body[data-theme="dark"] #${PANEL_ID} .aisb-folder-dialog-empty {
        color: #9ca3af;
      }
      html.dark-theme #${PANEL_ID} .aisb-folder-account,
      body.dark-theme #${PANEL_ID} .aisb-folder-account,
      html[data-theme="dark"] #${PANEL_ID} .aisb-folder-account,
      body[data-theme="dark"] #${PANEL_ID} .aisb-folder-account {
        background: rgba(255, 255, 255, 0.08);
      }
      html.dark-theme #${PANEL_ID} .aisb-folder-btn,
      body.dark-theme #${PANEL_ID} .aisb-folder-btn,
      html[data-theme="dark"] #${PANEL_ID} .aisb-folder-btn,
      body[data-theme="dark"] #${PANEL_ID} .aisb-folder-btn,
      html.dark-theme #${PANEL_ID} .aisb-folder-search,
      body.dark-theme #${PANEL_ID} .aisb-folder-search,
      html[data-theme="dark"] #${PANEL_ID} .aisb-folder-search,
      body[data-theme="dark"] #${PANEL_ID} .aisb-folder-search,
      html.dark-theme #${PANEL_ID} .aisb-folder-dialog-btn,
      body.dark-theme #${PANEL_ID} .aisb-folder-dialog-btn,
      html[data-theme="dark"] #${PANEL_ID} .aisb-folder-dialog-btn,
      body[data-theme="dark"] #${PANEL_ID} .aisb-folder-dialog-btn {
        border-color: rgba(255, 255, 255, 0.12);
        color: #e5e7eb;
      }
      html.dark-theme #${PANEL_ID} .aisb-folder-search,
      body.dark-theme #${PANEL_ID} .aisb-folder-search,
      html[data-theme="dark"] #${PANEL_ID} .aisb-folder-search,
      body[data-theme="dark"] #${PANEL_ID} .aisb-folder-search {
        background: rgba(31, 41, 55, 0.6);
      }
      html.dark-theme #${PANEL_ID} .aisb-folder-btn:hover,
      body.dark-theme #${PANEL_ID} .aisb-folder-btn:hover,
      html[data-theme="dark"] #${PANEL_ID} .aisb-folder-btn:hover,
      body[data-theme="dark"] #${PANEL_ID} .aisb-folder-btn:hover,
      html.dark-theme #${PANEL_ID} .aisb-folder-dialog-btn:hover,
      body.dark-theme #${PANEL_ID} .aisb-folder-dialog-btn:hover,
      html[data-theme="dark"] #${PANEL_ID} .aisb-folder-dialog-btn:hover,
      body[data-theme="dark"] #${PANEL_ID} .aisb-folder-dialog-btn:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.2);
      }
      html.dark-theme #${PANEL_ID} .aisb-folder-btn.active,
      body.dark-theme #${PANEL_ID} .aisb-folder-btn.active,
      html[data-theme="dark"] #${PANEL_ID} .aisb-folder-btn.active,
      body[data-theme="dark"] #${PANEL_ID} .aisb-folder-btn.active {
        background: #1e40af;
        border-color: #60a5fa;
        color: #dbeafe;
      }
      html.dark-theme #${PANEL_ID} .aisb-folder-bulkbar,
      body.dark-theme #${PANEL_ID} .aisb-folder-bulkbar,
      html[data-theme="dark"] #${PANEL_ID} .aisb-folder-bulkbar,
      body[data-theme="dark"] #${PANEL_ID} .aisb-folder-bulkbar {
        background: linear-gradient(135deg, #065f46 0%, #064e3b 100%);
        border-top-color: #10b981;
        border-bottom-color: #10b981;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.1), 0 2px 4px rgba(0, 0, 0, 0.2), 0 0 0 1px #10b981;
      }
      html.dark-theme #${PANEL_ID} .aisb-folder-bulk-label,
      body.dark-theme #${PANEL_ID} .aisb-folder-bulk-label,
      html[data-theme="dark"] #${PANEL_ID} .aisb-folder-bulk-label,
      body[data-theme="dark"] #${PANEL_ID} .aisb-folder-bulk-label {
        color: #e5e7eb;
      }
      html.dark-theme #${PANEL_ID} .aisb-folder-item:hover,
      body.dark-theme #${PANEL_ID} .aisb-folder-item:hover,
      html[data-theme="dark"] #${PANEL_ID} .aisb-folder-item:hover,
      body[data-theme="dark"] #${PANEL_ID} .aisb-folder-item:hover {
        border-color: #374151;
      }
      html.dark-theme #${PANEL_ID} .aisb-folder-row:hover,
      body.dark-theme #${PANEL_ID} .aisb-folder-row:hover,
      html[data-theme="dark"] #${PANEL_ID} .aisb-folder-row:hover,
      body[data-theme="dark"] #${PANEL_ID} .aisb-folder-row:hover,
      html.dark-theme #${PANEL_ID} .aisb-folder-conversation:hover,
      body.dark-theme #${PANEL_ID} .aisb-folder-conversation:hover,
      html[data-theme="dark"] #${PANEL_ID} .aisb-folder-conversation:hover,
      body[data-theme="dark"] #${PANEL_ID} .aisb-folder-conversation:hover {
        background: #374151;
        border-color: rgba(255, 255, 255, 0.12);
      }
      html.dark-theme #${PANEL_ID} .aisb-folder-menu-btn,
      body.dark-theme #${PANEL_ID} .aisb-folder-menu-btn,
      html[data-theme="dark"] #${PANEL_ID} .aisb-folder-menu-btn,
      body[data-theme="dark"] #${PANEL_ID} .aisb-folder-menu-btn,
      html.dark-theme #${PANEL_ID} .aisb-folder-mini-btn,
      body.dark-theme #${PANEL_ID} .aisb-folder-mini-btn,
      html[data-theme="dark"] #${PANEL_ID} .aisb-folder-mini-btn,
      body[data-theme="dark"] #${PANEL_ID} .aisb-folder-mini-btn,
      html.dark-theme #${PANEL_ID} .aisb-folder-toggle,
      body.dark-theme #${PANEL_ID} .aisb-folder-toggle,
      html[data-theme="dark"] #${PANEL_ID} .aisb-folder-toggle,
      body[data-theme="dark"] #${PANEL_ID} .aisb-folder-toggle {
        color: #9ca3af;
      }
      html.dark-theme #${PANEL_ID} .aisb-folder-menu-btn:hover,
      body.dark-theme #${PANEL_ID} .aisb-folder-menu-btn:hover,
      html[data-theme="dark"] #${PANEL_ID} .aisb-folder-menu-btn:hover,
      body[data-theme="dark"] #${PANEL_ID} .aisb-folder-menu-btn:hover,
      html.dark-theme #${PANEL_ID} .aisb-folder-mini-btn:hover,
      body.dark-theme #${PANEL_ID} .aisb-folder-mini-btn:hover,
      html[data-theme="dark"] #${PANEL_ID} .aisb-folder-mini-btn:hover,
      body[data-theme="dark"] #${PANEL_ID} .aisb-folder-mini-btn:hover {
        background: rgba(255, 255, 255, 0.08);
        color: #e5e7eb;
      }
      html.dark-theme #${PANEL_ID} .aisb-folder-item.dragover-inside,
      body.dark-theme #${PANEL_ID} .aisb-folder-item.dragover-inside,
      html[data-theme="dark"] #${PANEL_ID} .aisb-folder-item.dragover-inside,
      body[data-theme="dark"] #${PANEL_ID} .aisb-folder-item.dragover-inside,
      html.dark-theme #${PANEL_ID} .aisb-folder-conversation.dragover,
      body.dark-theme #${PANEL_ID} .aisb-folder-conversation.dragover,
      html[data-theme="dark"] #${PANEL_ID} .aisb-folder-conversation.dragover,
      body[data-theme="dark"] #${PANEL_ID} .aisb-folder-conversation.dragover {
        background: #1e3a8a;
        outline-color: #60a5fa;
      }
      html.dark-theme .aisb-folder-context-menu,
      body.dark-theme .aisb-folder-context-menu,
      html[data-theme="dark"] .aisb-folder-context-menu,
      body[data-theme="dark"] .aisb-folder-context-menu,
      html.dark-theme .aisb-folder-color-picker,
      body.dark-theme .aisb-folder-color-picker,
      html[data-theme="dark"] .aisb-folder-color-picker,
      body[data-theme="dark"] .aisb-folder-color-picker,
      html.dark-theme .aisb-folder-dialog,
      body.dark-theme .aisb-folder-dialog,
      html[data-theme="dark"] .aisb-folder-dialog,
      body[data-theme="dark"] .aisb-folder-dialog {
        background: #1f2937;
        border-color: #374151;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      }
      html.dark-theme .aisb-folder-menu-separator,
      body.dark-theme .aisb-folder-menu-separator,
      html[data-theme="dark"] .aisb-folder-menu-separator,
      body[data-theme="dark"] .aisb-folder-menu-separator {
        border-top-color: #374151;
      }
      html.dark-theme .aisb-folder-menu-item,
      body.dark-theme .aisb-folder-menu-item,
      html[data-theme="dark"] .aisb-folder-menu-item,
      body[data-theme="dark"] .aisb-folder-menu-item {
        color: #e5e7eb;
      }
      html.dark-theme .aisb-folder-menu-item:hover,
      body.dark-theme .aisb-folder-menu-item:hover,
      html[data-theme="dark"] .aisb-folder-menu-item:hover,
      body[data-theme="dark"] .aisb-folder-menu-item:hover {
        background: #374151;
      }
      html.dark-theme .aisb-folder-color-item:hover,
      body.dark-theme .aisb-folder-color-item:hover,
      html[data-theme="dark"] .aisb-folder-color-item:hover,
      body[data-theme="dark"] .aisb-folder-color-item:hover {
        border-color: #e5e7eb;
      }
      html.dark-theme .aisb-folder-dialog-title,
      body.dark-theme .aisb-folder-dialog-title,
      html[data-theme="dark"] .aisb-folder-dialog-title,
      body[data-theme="dark"] .aisb-folder-dialog-title {
        color: #e5e7eb;
        border-bottom: 1px solid #374151;
      }
      html.dark-theme .aisb-folder-dialog-item,
      body.dark-theme .aisb-folder-dialog-item,
      html[data-theme="dark"] .aisb-folder-dialog-item,
      body[data-theme="dark"] .aisb-folder-dialog-item {
        color: #e5e7eb;
      }
      html.dark-theme .aisb-folder-dialog-item:hover,
      body.dark-theme .aisb-folder-dialog-item:hover,
      html[data-theme="dark"] .aisb-folder-dialog-item:hover,
      body[data-theme="dark"] .aisb-folder-dialog-item:hover {
        background: #374151;
      }
      html.dark-theme .aisb-folder-dialog-item.active,
      body.dark-theme .aisb-folder-dialog-item.active,
      html[data-theme="dark"] .aisb-folder-dialog-item.active,
      body[data-theme="dark"] .aisb-folder-dialog-item.active {
        border-color: #60a5fa;
        background: #1e40af;
        color: #dbeafe;
      }
      html.dark-theme .aisb-folder-dialog-btn.primary,
      body.dark-theme .aisb-folder-dialog-btn.primary,
      html[data-theme="dark"] .aisb-folder-dialog-btn.primary,
      body[data-theme="dark"] .aisb-folder-dialog-btn.primary {
        border-color: #60a5fa;
        background: #1e40af;
        color: #dbeafe;
      }
      html.dark-theme [data-test-id="conversation"].aisb-folder-native-selected,
      body.dark-theme [data-test-id="conversation"].aisb-folder-native-selected,
      html[data-theme="dark"] [data-test-id="conversation"].aisb-folder-native-selected,
      body[data-theme="dark"] [data-test-id="conversation"].aisb-folder-native-selected {
        box-shadow: inset 3px 0 0 #6ee7b7;
        background: linear-gradient(to right, rgba(16, 185, 129, 0.10) 0%, transparent 100%);
      }

      @media (max-width: 1180px) {
        #${PANEL_ID} .aisb-folder-actions {
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        #${PANEL_ID} .aisb-folder-btn {
          padding: 6px 7px;
        }
      }
      @media (max-width: 900px) {
        #${PANEL_ID} .aisb-folder-list {
          max-height: min(48vh, 480px);
        }
      }
      `,
    );
  }

  function closeColorPicker() {
    const picker = document.querySelector('.aisb-folder-color-picker');
    if (picker) picker.remove();
  }

  function showColorPicker(folder, anchorRect) {
    closeColorPicker();

    const picker = document.createElement('div');
    picker.className = 'aisb-folder-color-picker';

    const grid = document.createElement('div');
    grid.className = 'aisb-folder-color-grid';

    for (const preset of COLOR_PRESETS) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'aisb-folder-color-item';
      item.title = preset.label;
      item.style.background = preset.color;
      item.addEventListener('click', async () => {
        folder.color = preset.id;
        folder.updatedAt = now();
        await saveData();
        renderFolderList();
        closeColorPicker();
        setStatus('已更新文件夹颜色', 'success');
      });
      grid.appendChild(item);
    }

    const custom = document.createElement('input');
    custom.type = 'color';
    custom.className = 'aisb-folder-color-custom';
    custom.value = /^#[0-9a-f]{6}$/i.test(folder.color || '')
      ? folder.color
      : getFolderColorValue(folder.color);
    custom.addEventListener('input', async () => {
      folder.color = custom.value;
      folder.updatedAt = now();
      await saveData();
      renderFolderList();
    });

    picker.appendChild(grid);
    picker.appendChild(custom);
    document.body.appendChild(picker);

    const rect = picker.getBoundingClientRect();
    const margin = 8;
    let left = anchorRect.left;
    let top = anchorRect.bottom + 6;
    if (left + rect.width + margin > window.innerWidth) {
      left = window.innerWidth - rect.width - margin;
    }
    if (top + rect.height + margin > window.innerHeight) {
      top = anchorRect.top - rect.height - 6;
    }
    picker.style.left = `${Math.max(margin, left)}px`;
    picker.style.top = `${Math.max(margin, top)}px`;

    const closeOnce = (event) => {
      if (!picker.contains(event.target)) {
        closeColorPicker();
        document.removeEventListener('click', closeOnce, true);
      }
    };
    setTimeout(() => {
      document.addEventListener('click', closeOnce, true);
    }, 0);
  }

  async function handleCreateFolder(parentId) {
    const name = sanitizeFolderName(prompt(parentId ? '输入子文件夹名称' : '输入文件夹名称'));
    if (!name) return;

    const level = parentId ? 1 : 0;
    if (level > 1) {
      setStatus('仅支持两级文件夹结构', 'warn');
      return;
    }

    const duplicated = state.data.folders.some((folder) => {
      if (state.settings.currentAccountOnly && folder.accountId !== state.currentAccountId) return false;
      if ((folder.parentId || null) !== (parentId || null)) return false;
      return folder.name.toLowerCase() === name.toLowerCase();
    });

    if (duplicated) {
      setStatus('同级下已存在同名文件夹', 'error');
      return;
    }

    const folder = {
      id: createFolderId(),
      name,
      parentId: parentId || null,
      isExpanded: true,
      pinned: false,
      color: 'default',
      createdAt: now(),
      updatedAt: now(),
      sortIndex: now(),
      accountId: state.currentAccountId,
    };

    state.data.folders.push(folder);
    state.data.folderContents[folder.id] = [];
    await saveData();
    renderFolderList();
    setStatus(parentId ? '子文件夹创建成功' : '文件夹创建成功', 'success');
  }

  async function renameFolder(folder) {
    const name = sanitizeFolderName(prompt('重命名文件夹', folder.name));
    if (!name || name === folder.name) return;
    folder.name = name;
    folder.updatedAt = now();
    await saveData();
    renderFolderList();
    setStatus('文件夹已重命名', 'success');
  }

  async function deleteFolder(folder) {
    const childFolders = state.data.folders.filter((item) => item.parentId === folder.id);
    const conversationCount = ensureFolderContent(folder.id).length;
    const childConversationCount = childFolders.reduce((sum, child) => sum + ensureFolderContent(child.id).length, 0);
    const total = conversationCount + childConversationCount;

    const ok = confirm(
      childFolders.length
        ? `删除“${folder.name}”及其 ${childFolders.length} 个子文件夹？将移除 ${total} 条会话映射。`
        : `删除文件夹“${folder.name}”？将移除 ${total} 条会话映射。`,
    );
    if (!ok) return;

    const removeIds = new Set([folder.id, ...childFolders.map((item) => item.id)]);
    state.data.folders = state.data.folders.filter((item) => !removeIds.has(item.id));
    for (const folderId of removeIds) {
      delete state.data.folderContents[folderId];
    }

    await saveData();
    renderFolderList();
    setStatus('文件夹已删除', 'success');
  }

  async function toggleFolderExpanded(folder) {
    folder.isExpanded = !folder.isExpanded;
    folder.updatedAt = now();
    await saveData();
    renderFolderList();
  }

  function attachFolderContextMenu(rowElement, folder, level) {
    rowElement.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      event.stopPropagation();

      showContextMenu(
        [
          {
            label: '重命名',
            onClick: () => renameFolder(folder),
          },
          {
            label: folder.pinned ? '取消置顶' : '置顶',
            onClick: async () => {
              folder.pinned = !folder.pinned;
              folder.updatedAt = now();
              await saveData();
              renderFolderList();
              setStatus(folder.pinned ? '已置顶文件夹' : '已取消置顶', 'success');
            },
          },
          {
            label: level === 0 ? '新建子文件夹' : '提升为顶级',
            onClick: async () => {
              if (level === 0) {
                await handleCreateFolder(folder.id);
              } else {
                folder.parentId = null;
                folder.updatedAt = now();
                await saveData();
                renderFolderList();
              }
            },
          },
          {
            label: '颜色设置',
            onClick: () => {
              const rect = rowElement.getBoundingClientRect();
              showColorPicker(folder, rect);
            },
          },
          { type: 'separator' },
          {
            label: '删除文件夹',
            danger: true,
            onClick: () => {
              void deleteFolder(folder);
            },
          },
        ],
        event.clientX,
        event.clientY,
      );
    });
  }

  function createFolderRow(folder, level) {
    const row = document.createElement('div');
    row.className = `aisb-folder-row level-${level}`;
    row.dataset.folderId = folder.id;
    row.draggable = true;

    const folderCheckbox = document.createElement('input');
    folderCheckbox.type = 'checkbox';
    folderCheckbox.className = 'aisb-folder-folder-check';
    folderCheckbox.title = '选中该文件夹内全部会话';
    folderCheckbox.addEventListener('change', () => {
      const list = ensureFolderContent(folder.id).filter(isConversationVisible);
      if (folderCheckbox.checked) {
        for (const item of list) {
          state.selectedKeys.add(`${folder.id}::${item.conversationId}`);
        }
      } else {
        for (const item of list) {
          state.selectedKeys.delete(`${folder.id}::${item.conversationId}`);
        }
      }
      updateBulkBar();
      renderFolderList();
    });

    const hasChildren = getChildFolders(folder.id).length > 0;
    const conversationCount = ensureFolderContent(folder.id).filter(isConversationVisible).length;

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'aisb-folder-toggle';
    toggle.textContent = folder.isExpanded ? '▾' : '▸';
    toggle.title = folder.isExpanded ? '收起' : '展开';
    toggle.addEventListener('click', (event) => {
      event.stopPropagation();
      void toggleFolderExpanded(folder);
    });

    if (!hasChildren && conversationCount === 0) {
      toggle.style.opacity = '0.45';
    }

    const color = document.createElement('button');
    color.type = 'button';
    color.className = 'aisb-folder-color';
    color.style.background = getFolderColorValue(folder.color);
    color.title = '点击修改颜色';
    color.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const rect = color.getBoundingClientRect();
      showColorPicker(folder, rect);
    });

    const name = document.createElement('span');
    name.className = 'aisb-folder-name';
    name.textContent = folder.name;
    name.title = '双击重命名';
    name.addEventListener('dblclick', () => {
      void renameFolder(folder);
    });

    const meta = document.createElement('span');
    meta.className = 'aisb-folder-meta';
    meta.textContent = `${conversationCount}`;

    const menu = document.createElement('button');
    menu.type = 'button';
    menu.className = 'aisb-folder-menu-btn';
    menu.textContent = '⋯';
    menu.title = '更多操作';
    menu.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const rect = menu.getBoundingClientRect();
      showContextMenu(
        [
          {
            label: '重命名',
            onClick: () => renameFolder(folder),
          },
          {
            label: level === 0 ? '新建子文件夹' : '提升为顶级',
            onClick: async () => {
              if (level === 0) {
                await handleCreateFolder(folder.id);
              } else {
                folder.parentId = null;
                folder.updatedAt = now();
                await saveData();
                renderFolderList();
              }
            },
          },
          {
            label: '批量选择本文件夹会话',
            onClick: () => {
              state.settings.bulkMode = true;
              const conversations = ensureFolderContent(folder.id).filter(isConversationVisible);
              for (const conversation of conversations) {
                state.selectedKeys.add(`${folder.id}::${conversation.conversationId}`);
              }
              updateBulkBar();
              renderFolderList();
              void saveSettings();
            },
          },
          { type: 'separator' },
          {
            label: '删除文件夹',
            danger: true,
            onClick: () => {
              void deleteFolder(folder);
            },
          },
        ],
        rect.left,
        rect.bottom + 4,
      );
    });

    row.appendChild(folderCheckbox);
    row.appendChild(toggle);
    row.appendChild(color);
    row.appendChild(name);
    row.appendChild(meta);
    row.appendChild(menu);

    attachFolderContextMenu(row, folder, level);
    bindFolderDragEvents(row, folder);
    bindConversationDropToFolder(row, folder.id);

    return row;
  }

  function createConversationRow(folder, conversation, level) {
    const row = document.createElement('div');
    row.className = `aisb-folder-conversation level-${level}`;
    row.dataset.folderId = folder.id;
    row.dataset.conversationId = conversation.conversationId;
    row.draggable = true;

    const key = `${folder.id}::${conversation.conversationId}`;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'aisb-folder-conv-check';
    checkbox.checked = state.selectedKeys.has(key);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) state.selectedKeys.add(key);
      else state.selectedKeys.delete(key);
      updateBulkBar();
    });

    const link = document.createElement('a');
    link.className = 'aisb-folder-conversation-title';
    link.textContent = conversation.title || '未命名会话';
    link.href = conversation.url || '#';
    link.title = conversation.title || '';
    if (!conversation.url) {
      link.addEventListener('click', (event) => event.preventDefault());
    } else {
      link.addEventListener('click', () => {
        conversation.lastOpenedAt = now();
        conversation.updatedAt = now();
        void saveData();
      });
    }

    const actions = document.createElement('div');
    actions.className = 'aisb-folder-conversation-actions';

    const starButton = document.createElement('button');
    starButton.type = 'button';
    starButton.className = 'aisb-folder-mini-btn';
    starButton.title = conversation.starred ? '取消星标' : '星标';
    starButton.textContent = conversation.starred ? '★' : '☆';
    starButton.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      conversation.starred = !conversation.starred;
      conversation.updatedAt = now();
      await saveData();
      renderFolderList();
    });

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'aisb-folder-mini-btn';
    removeButton.title = '移除';
    removeButton.textContent = '移除';
    removeButton.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      removeConversationFromFolder(folder.id, conversation.conversationId);
      await saveData();
      renderFolderList();
      setStatus('已从文件夹移除会话', 'success');
    });

    actions.appendChild(starButton);
    actions.appendChild(removeButton);

    row.appendChild(checkbox);
    row.appendChild(link);
    row.appendChild(actions);

    row.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      event.stopPropagation();
      showContextMenu(
        [
          {
            label: conversation.starred ? '取消星标' : '设为星标',
            onClick: async () => {
              conversation.starred = !conversation.starred;
              conversation.updatedAt = now();
              await saveData();
              renderFolderList();
            },
          },
          {
            label: '重命名会话标题',
            onClick: async () => {
              const next = sanitizeConversationTitle(prompt('重命名会话标题', conversation.title));
              if (!next || next === conversation.title) return;
              conversation.title = next;
              conversation.customTitle = true;
              conversation.updatedAt = now();
              await saveData();
              renderFolderList();
              setStatus('会话标题已更新', 'success');
            },
          },
          {
            label: '移动到文件夹...',
            onClick: () => {
              showMoveDialog(async (targetFolderId) => {
                await addConversationToFolder(targetFolderId, conversation, folder.id);
                renderFolderList();
                setStatus('会话已移动', 'success');
              });
            },
          },
          { type: 'separator' },
          {
            label: '移除',
            danger: true,
            onClick: async () => {
              removeConversationFromFolder(folder.id, conversation.conversationId);
              await saveData();
              renderFolderList();
            },
          },
        ],
        event.clientX,
        event.clientY,
      );
    });

    bindConversationDragEvents(row, folder.id, conversation);
    bindConversationReorderDrop(row, folder.id, conversation.conversationId);

    return row;
  }

  function createFolderElement(folder, level) {
    const item = document.createElement('div');
    item.className = 'aisb-folder-item';
    item.dataset.folderId = folder.id;

    const row = createFolderRow(folder, level);
    item.appendChild(row);

    const content = document.createElement('div');
    content.className = `aisb-folder-content ${folder.isExpanded || (state.settings.search && state.settings.autoExpandOnSearch) ? '' : 'collapsed'}`;

    const contentInner = document.createElement('div');
    contentInner.className = 'aisb-folder-content-inner';

    const children = getChildFolders(folder.id);
    if (level === 0) {
      for (const child of children) {
        contentInner.appendChild(createFolderElement(child, 1));
      }
    }

    let conversations = ensureFolderContent(folder.id)
      .filter(isConversationVisible)
      .sort(sortConversation);

    const searchQuery = state.settings.search.trim().toLowerCase();
    if (searchQuery) {
      conversations = conversations.filter((item) => (item.title || '').toLowerCase().includes(searchQuery));
    }

    for (const conversation of conversations) {
      contentInner.appendChild(createConversationRow(folder, conversation, level));
    }

    if (!children.length && !conversations.length) {
      const empty = document.createElement('div');
      empty.className = 'aisb-folder-empty';
      empty.textContent = level === 0 ? '拖拽会话到这里，或新建子文件夹' : '拖拽会话到这里';
      contentInner.appendChild(empty);
    }

    content.appendChild(contentInner);
    item.appendChild(content);

    return item;
  }

  function renderFolderList() {
    const list = state.ui.list;
    if (!list) return;

    list.innerHTML = '';

    if (state.ui.panel) {
      state.ui.panel.classList.toggle('bulk-mode', Boolean(state.settings.bulkMode));
    }

    const roots = getRootFolders();
    if (!roots.length) {
      const empty = document.createElement('div');
      empty.className = 'aisb-folder-empty';
      empty.textContent = state.settings.search
        ? '没有匹配结果，试试其他关键词'
        : '暂无文件夹，点击“新建”开始整理会话。';
      list.appendChild(empty);
      return;
    }

    for (const folder of roots) {
      list.appendChild(createFolderElement(folder, 0));
    }
  }

  function updateBulkBar() {
    if (!state.ui.bulkBar) return;

    const active = Boolean(state.settings.bulkMode);
    state.ui.bulkBar.classList.toggle('active', active);

    const label = state.ui.bulkBar.querySelector('.aisb-folder-bulk-label');
    if (label) {
      label.textContent = `已选择 ${state.selectedKeys.size} 项`;
    }
  }

  function parseDragPayload(event) {
    if (!event.dataTransfer) return null;
    
    console.log('[AISB Folder] parseDragPayload called');
    
    const candidates = [
      event.dataTransfer.getData(DRAG_MIME),
      event.dataTransfer.getData('application/json'),
      event.dataTransfer.getData('text/plain'),
      event.dataTransfer.getData('text/uri-list'),
      event.dataTransfer.getData('text/x-moz-url'),
      event.dataTransfer.getData('URL'),
    ];

    for (const raw of candidates) {
      if (!raw) continue;
      
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          if (parsed.type === 'conversation' && parsed.conversationId) {
            return parsed;
          }
          if (parsed.type === 'folder' && parsed.folderId) {
            return parsed;
          }
          if (parsed.conversation) {
            return parsed;
          }
        }
      } catch (_) {
      }
      
      const trimmed = String(raw).trim();
      if (trimmed.includes('gemini.google.com/app/') || trimmed.includes('gemini.google.com/gem/')) {
        const appMatch = trimmed.match(/\/app\/([^\/?#\s]+)/);
        const gemMatch = trimmed.match(/\/gem\/[^/]+\/([^\/?#\s]+)/);
        const conversationId = appMatch?.[1] || gemMatch?.[1];
        
        if (conversationId) {
          const lines = trimmed.split('\n');
          const title = lines.length > 1 ? lines[1].trim() : 'Untitled';
          
          return {
            type: 'conversation',
            conversationId: conversationId,
            title: title,
            url: trimmed.split('\n')[0],
          };
        }
      }
    }
    
    return null;
  }

  function clearFolderDropClasses() {
    const panel = state.ui.panel;
    if (!panel) return;
    panel
      .querySelectorAll('.aisb-folder-item.dragover-before, .aisb-folder-item.dragover-after, .aisb-folder-item.dragover-inside')
      .forEach((el) => {
        el.classList.remove('dragover-before', 'dragover-after', 'dragover-inside');
      });
  }

  function bindFolderDragEvents(row, folder) {
    row.addEventListener('dragstart', (event) => {
      if (!event.dataTransfer) return;
      state.dragState.activeFolderId = folder.id;
      state.dragState.activeConversation = null;
      state.dragState.sourceFolderId = null;
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData(
        DRAG_MIME,
        JSON.stringify({
          type: 'folder',
          folderId: folder.id,
        }),
      );
      event.dataTransfer.setData('text/plain', folder.name);
    });

    row.addEventListener('dragend', () => {
      clearFolderDropClasses();
      state.dragState.activeFolderId = null;
      state.dragState.dropPosition = null;
    });

    row.addEventListener('dragover', (event) => {
      const payload = parseDragPayload(event);
      if (!payload) return;
      event.preventDefault();

      clearFolderDropClasses();
      const folderItem = row.closest('.aisb-folder-item');
      if (!folderItem) return;

      if (payload.type === 'folder') {
        const rect = row.getBoundingClientRect();
        const offset = event.clientY - rect.top;
        const ratio = rect.height ? offset / rect.height : 0.5;

        let dropClass = 'dragover-inside';
        let dropPosition = 'inside';
        if (ratio < 0.3) {
          dropClass = 'dragover-before';
          dropPosition = 'before';
        } else if (ratio > 0.7) {
          dropClass = 'dragover-after';
          dropPosition = 'after';
        }
        folderItem.classList.add(dropClass);
        state.dragState.dropPosition = dropPosition;
      } else if (payload.type === 'conversation') {
        folderItem.classList.add('dragover-inside');
        state.dragState.dropPosition = 'inside';
      }
    });

    row.addEventListener('dragleave', (event) => {
      if (!row.contains(event.relatedTarget)) {
        clearFolderDropClasses();
      }
    });

    row.addEventListener('drop', async (event) => {
      const payload = parseDragPayload(event);
      if (!payload) return;
      event.preventDefault();

      clearFolderDropClasses();

      if (payload.type === 'folder') {
        await handleFolderDrop(payload.folderId, folder.id, state.dragState.dropPosition || 'inside');
        return;
      }

      if (payload.type === 'conversation' && payload.conversation) {
        await addConversationToFolder(folder.id, payload.conversation, payload.sourceFolderId || null);
        renderFolderList();
        setStatus('会话已移动到目标文件夹', 'success');
      }
    });
  }

  async function handleFolderDrop(sourceFolderId, targetFolderId, dropPosition) {
    if (!sourceFolderId || !targetFolderId || sourceFolderId === targetFolderId) {
      return;
    }

    const source = state.data.folders.find((item) => item.id === sourceFolderId);
    const target = state.data.folders.find((item) => item.id === targetFolderId);
    if (!source || !target) return;

    if (dropPosition === 'inside') {
      if (!canMoveFolderInside(source.id, target.id)) {
        setStatus('该拖拽会导致超过两级或形成循环，已阻止', 'warn');
        return;
      }
      source.parentId = target.id;
      source.sortIndex = now();
    } else {
      // before/after: 与目标同级重排。
      source.parentId = target.parentId || null;
      const siblings = state.data.folders
        .filter((item) => (item.parentId || null) === (target.parentId || null) && item.id !== source.id)
        .sort(sortFolder);

      const next = [];
      for (const sibling of siblings) {
        if (dropPosition === 'before' && sibling.id === target.id) {
          next.push(source);
        }
        next.push(sibling);
        if (dropPosition === 'after' && sibling.id === target.id) {
          next.push(source);
        }
      }
      if (!next.some((item) => item.id === source.id)) {
        next.push(source);
      }
      next.forEach((item, index) => {
        item.sortIndex = index + 1;
        item.updatedAt = now();
      });
    }

    source.updatedAt = now();
    await saveData();
    renderFolderList();
    setStatus('文件夹顺序已更新', 'success');
  }

  function bindConversationDragEvents(row, sourceFolderId, conversation) {
    row.addEventListener('dragstart', (event) => {
      if (!event.dataTransfer) return;
      state.dragState.activeFolderId = null;
      state.dragState.activeConversation = conversation;
      state.dragState.sourceFolderId = sourceFolderId;
      event.dataTransfer.effectAllowed = 'move';
      
      const dragData = {
        type: 'conversation',
        conversationId: conversation.conversationId,
        title: conversation.title,
        url: conversation.url,
        sourceFolderId,
        conversation,
      };
      
      const jsonPayload = JSON.stringify(dragData);
      event.dataTransfer.setData(DRAG_MIME, jsonPayload);
      event.dataTransfer.setData('application/json', jsonPayload);
      event.dataTransfer.setData('text/plain', conversation.title || conversation.conversationId);
      
      if (conversation.url) {
        event.dataTransfer.setData('text/uri-list', conversation.url);
        event.dataTransfer.setData('text/x-moz-url', `${conversation.url}\n${conversation.title || ''}`);
        event.dataTransfer.setData('URL', conversation.url);
      }
    });

    row.addEventListener('dragend', () => {
      row.classList.remove('dragover');
      state.dragState.activeConversation = null;
      state.dragState.sourceFolderId = null;
    });
  }

  function bindConversationReorderDrop(row, folderId, targetConversationId) {
    row.addEventListener('dragover', (event) => {
      const payload = parseDragPayload(event);
      if (!payload || payload.type !== 'conversation') return;
      if (payload.sourceFolderId !== folderId) return;
      event.preventDefault();
      row.classList.add('dragover');
    });

    row.addEventListener('dragleave', () => {
      row.classList.remove('dragover');
    });

    row.addEventListener('drop', async (event) => {
      const payload = parseDragPayload(event);
      if (!payload || payload.type !== 'conversation') return;
      if (payload.sourceFolderId !== folderId) return;
      event.preventDefault();
      row.classList.remove('dragover');

      const list = ensureFolderContent(folderId);
      const sourceIndex = list.findIndex((item) => item.conversationId === payload.conversation.conversationId);
      const targetIndex = list.findIndex((item) => item.conversationId === targetConversationId);
      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;

      const [moved] = list.splice(sourceIndex, 1);
      list.splice(targetIndex, 0, moved);
      list.forEach((item, index) => {
        item.sortIndex = index + 1;
        item.updatedAt = now();
      });

      await saveData();
      renderFolderList();
      setStatus('会话顺序已调整', 'success');
    });
  }

  function bindConversationDropToFolder(element, folderId) {
    let dragEnterCounter = 0;

    element.addEventListener('dragenter', (event) => {
      const payload = parseDragPayload(event);
      if (!payload || payload.type !== 'conversation') return;
      event.preventDefault();
      event.stopPropagation();
      dragEnterCounter++;
      element.classList.add('aisb-folder-dragover');
    });

    element.addEventListener('dragleave', (event) => {
      dragEnterCounter--;
      if (dragEnterCounter === 0) {
        element.classList.remove('aisb-folder-dragover');
      }
    });

    element.addEventListener('dragover', (event) => {
      const payload = parseDragPayload(event);
      if (!payload || payload.type !== 'conversation') return;
      event.preventDefault();
    });

    element.addEventListener('drop', async (event) => {
      const payload = parseDragPayload(event);
      if (!payload || payload.type !== 'conversation') return;
      event.preventDefault();
      
      dragEnterCounter = 0;
      element.classList.remove('aisb-folder-dragover');

      const conversation = payload.conversation || {
        conversationId: payload.conversationId,
        title: payload.title,
        url: payload.url,
      };

      if (!conversation.conversationId) return;

      await addConversationToFolder(folderId, conversation, payload.sourceFolderId || null);
      renderFolderList();
      setStatus('会话已放入文件夹', 'success');
    });
  }

  function removeConversationFromFolder(folderId, conversationId) {
    const list = ensureFolderContent(folderId);
    state.data.folderContents[folderId] = list.filter((item) => item.conversationId !== conversationId);
    state.selectedKeys.delete(`${folderId}::${conversationId}`);
  }

  async function addConversationToFolder(folderId, rawConversation, sourceFolderId) {
    const targetFolder = state.data.folders.find((item) => item.id === folderId);
    if (!targetFolder) return;

    const conversation = normalizeConversation(rawConversation, targetFolder.accountId);
    if (!conversation) return;

    const targetList = ensureFolderContent(folderId);
    const existingIndex = targetList.findIndex((item) => item.conversationId === conversation.conversationId);

    if (existingIndex >= 0) {
      targetList[existingIndex] = {
        ...targetList[existingIndex],
        ...conversation,
        updatedAt: now(),
      };
    } else {
      targetList.push({
        ...conversation,
        sortIndex: now(),
      });
    }

    if (sourceFolderId && sourceFolderId !== folderId) {
      removeConversationFromFolder(sourceFolderId, conversation.conversationId);
    }

    targetFolder.updatedAt = now();
    targetList.sort(sortConversation);

    await saveData();
  }

  function buildExportFilename() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `gemini-folders-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(
      d.getHours(),
    )}${pad(d.getMinutes())}${pad(d.getSeconds())}.json`;
  }

  function buildExportPayload(scope) {
    const mode = scope || 'all';
    if (mode === 'all') {
      return getStoragePayload();
    }

    const accountId = state.currentAccountId;
    const folders = state.data.folders.filter((folder) => folder.accountId === accountId);
    const folderContents = {};
    for (const folder of folders) {
      folderContents[folder.id] = ensureFolderContent(folder.id).filter(
        (conversation) => conversation.accountId === accountId,
      );
    }

    return {
      schemaVersion: 2,
      format: EXPORT_FORMAT,
      exportedAt: new Date().toISOString(),
      version: 'ai-sidebar-sr8',
      accountId,
      data: {
        folders,
        folderContents,
        meta: {
          createdAt: state.data.meta.createdAt,
          updatedAt: now(),
        },
      },
    };
  }

  function validateImportPayload(payload) {
    if (!payload || typeof payload !== 'object') {
      return { ok: false, error: '文件内容不是有效 JSON 对象' };
    }

    const format = typeof payload.format === 'string' ? payload.format : '';
    if (format && format !== EXPORT_FORMAT) {
      return {
        ok: false,
        error: `不支持的导入格式：${format}`,
      };
    }

    if (payload.data && typeof payload.data === 'object') {
      const hasFolders = Array.isArray(payload.data.folders);
      const hasContents = payload.data.folderContents && typeof payload.data.folderContents === 'object';
      if (!hasFolders || !hasContents) {
        return { ok: false, error: 'data 字段缺少 folders 或 folderContents' };
      }
      return {
        ok: true,
        data: payload.data,
      };
    }

    if (Array.isArray(payload.folders) && payload.folderContents && typeof payload.folderContents === 'object') {
      return {
        ok: true,
        data: payload,
      };
    }

    return { ok: false, error: '未识别到 folders / folderContents 字段' };
  }

  function mergeImportedData(importedData) {
    const incoming = normalizeData(importedData);
    const merged = normalizeData(state.data);

    const existingFolderIds = new Set(merged.folders.map((item) => item.id));
    const folderIdRemap = Object.create(null);
    let folderAdded = 0;
    let conversationAdded = 0;

    for (const folder of incoming.folders) {
      let nextFolderId = folder.id;
      if (existingFolderIds.has(nextFolderId)) {
        nextFolderId = createFolderId();
      }
      existingFolderIds.add(nextFolderId);
      folderIdRemap[folder.id] = nextFolderId;

      const copy = {
        ...folder,
        id: nextFolderId,
        parentId: folder.parentId && folderIdRemap[folder.parentId] ? folderIdRemap[folder.parentId] : folder.parentId,
      };

      merged.folders.push(copy);
      merged.folderContents[copy.id] = [];
      folderAdded += 1;
    }

    // 二次修正 parentId，确保映射后依旧合法。
    const mergedFolderMap = Object.create(null);
    for (const folder of merged.folders) {
      mergedFolderMap[folder.id] = folder;
    }
    for (const folder of merged.folders) {
      if (!folder.parentId) continue;
      if (!mergedFolderMap[folder.parentId]) {
        folder.parentId = null;
      } else if (mergedFolderMap[folder.parentId].parentId) {
        folder.parentId = null;
      }
    }

    for (const [oldFolderId, list] of Object.entries(incoming.folderContents || {})) {
      const targetFolderId = folderIdRemap[oldFolderId] || oldFolderId;
      if (!merged.folderContents[targetFolderId]) {
        merged.folderContents[targetFolderId] = [];
      }

      const currentSet = new Set(merged.folderContents[targetFolderId].map((item) => item.conversationId));
      for (const rawConversation of list || []) {
        const normalizedConversation = normalizeConversation(rawConversation, state.currentAccountId);
        if (!normalizedConversation) continue;
        if (currentSet.has(normalizedConversation.conversationId)) continue;
        merged.folderContents[targetFolderId].push(normalizedConversation);
        currentSet.add(normalizedConversation.conversationId);
        conversationAdded += 1;
      }
    }

    merged.folders.sort(sortFolder);
    for (const folderId of Object.keys(merged.folderContents)) {
      merged.folderContents[folderId].sort(sortConversation);
    }

    state.data = normalizeData(merged);
    return { folderAdded, conversationAdded };
  }

  async function handleImport(file) {
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = core.safeParseJSON(text, null);
      const validation = validateImportPayload(parsed);
      if (!validation.ok) {
        setStatus(`导入失败：${validation.error}`, 'error', 5000);
        return;
      }

      const stats = mergeImportedData(validation.data);
      await saveData();
      renderFolderList();
      setStatus(
        `导入完成：新增 ${stats.folderAdded} 个文件夹，${stats.conversationAdded} 条会话`,
        'success',
        5000,
      );
    } catch (error) {
      console.error('[AISB Folder] 导入失败：', error);
      setStatus('导入失败：文件内容无法解析', 'error', 5000);
    }
  }

  function bindNativeConversationDrag(element) {
    if (!(element instanceof HTMLElement)) return;
    if (element.dataset.aisbFolderDragBound === '1') return;

    element.dataset.aisbFolderDragBound = '1';
    element.classList.add('aisb-folder-draggable');
    element.draggable = true;

    element.addEventListener('dragstart', (event) => {
      const conversation = core.dom.extractConversationFromElement(element);
      if (!conversation || !event.dataTransfer) {
        event.preventDefault();
        return;
      }

      state.dragState.activeConversation = conversation;
      state.dragState.sourceFolderId = null;
      event.dataTransfer.effectAllowed = 'copyMove';
      
      const dragData = {
        type: 'conversation',
        conversationId: conversation.conversationId,
        title: conversation.title,
        url: conversation.url,
        sourceFolderId: null,
        conversation,
      };
      
      const jsonPayload = JSON.stringify(dragData);
      event.dataTransfer.setData(DRAG_MIME, jsonPayload);
      event.dataTransfer.setData('application/json', jsonPayload);
      event.dataTransfer.setData('text/plain', conversation.title || conversation.conversationId);
      
      if (conversation.url) {
        event.dataTransfer.setData('text/uri-list', conversation.url);
        event.dataTransfer.setData('text/x-moz-url', `${conversation.url}\n${conversation.title || ''}`);
        event.dataTransfer.setData('URL', conversation.url);
      }
      
      element.classList.add('aisb-folder-dragging');
    });

    element.addEventListener('dragend', () => {
      element.classList.remove('aisb-folder-dragging');
    });

    // 右键菜单：从原生会话快速移动到文件夹。
    element.addEventListener('contextmenu', (event) => {
      const conversation = core.dom.extractConversationFromElement(element);
      if (!conversation) return;

      const items = [];
      const roots = getRootFolders();
      if (!roots.length) {
        items.push({
          label: '先创建文件夹',
          disabled: true,
        });
      } else {
        for (const folder of roots) {
          items.push({
            label: `移动到：${folder.name}`,
            onClick: () => {
              void addConversationToFolder(folder.id, conversation, null).then(() => {
                renderFolderList();
                setStatus(`已移动到 ${folder.name}`, 'success');
              });
            },
          });

          const children = getChildFolders(folder.id);
          for (const child of children) {
            items.push({
              label: `移动到：${folder.name} / ${child.name}`,
              onClick: () => {
                void addConversationToFolder(child.id, conversation, null).then(() => {
                  renderFolderList();
                  setStatus(`已移动到 ${child.name}`, 'success');
                });
              },
            });
          }
        }
      }

      items.push({ type: 'separator' });
      items.push({
        label: '新建文件夹并移动',
        onClick: async () => {
          const name = sanitizeFolderName(prompt('新文件夹名称'));
          if (!name) return;
          const folder = {
            id: createFolderId(),
            name,
            parentId: null,
            isExpanded: true,
            pinned: false,
            color: 'default',
            createdAt: now(),
            updatedAt: now(),
            sortIndex: now(),
            accountId: state.currentAccountId,
          };
          state.data.folders.push(folder);
          state.data.folderContents[folder.id] = [];
          await addConversationToFolder(folder.id, conversation, null);
          await saveData();
          renderFolderList();
          setStatus('已创建文件夹并完成移动', 'success');
        },
      });

      showContextMenu(items, event.clientX, event.clientY);
    });
  }

  function bindNativeConversations() {
    if (!state.sidebar.container) return;
    const nodes = state.sidebar.container.querySelectorAll('[data-test-id="conversation"]');
    nodes.forEach(bindNativeConversationDrag);
  }

  function enterBulkMode() {
    state.settings.bulkMode = true;
    updateBulkBar();
    renderFolderList();
    void saveSettings();
  }

  function applyPanelCollapsedState() {
    if (!state.ui.panel || !state.ui.collapseBtn) return;
    const collapsed = Boolean(state.settings.panelCollapsed);
    state.ui.panel.classList.toggle('collapsed', collapsed);
    state.ui.collapseBtn.textContent = collapsed ? '▸' : '▾';
    state.ui.collapseBtn.title = collapsed ? '展开' : '折叠';
    state.ui.collapseBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  }

  async function togglePanelCollapsed() {
    state.settings.panelCollapsed = !state.settings.panelCollapsed;
    applyPanelCollapsedState();
    await saveSettings();
  }

  function exitBulkMode() {
    state.settings.bulkMode = false;
    state.selectedKeys.clear();
    updateBulkBar();
    renderFolderList();
    void saveSettings();
  }

  async function bulkMoveSelected() {
    if (!state.selectedKeys.size) {
      setStatus('请先选择会话', 'warn');
      return;
    }
    showMoveDialog(async (targetFolderId) => {
      const entries = Array.from(state.selectedKeys);
      for (const key of entries) {
        const [folderId, conversationId] = key.split('::');
        const sourceList = ensureFolderContent(folderId);
        const conversation = sourceList.find((item) => item.conversationId === conversationId);
        if (!conversation) continue;
        await addConversationToFolder(targetFolderId, conversation, folderId);
      }
      state.selectedKeys.clear();
      await saveData();
      renderFolderList();
      updateBulkBar();
      setStatus('批量移动完成', 'success');
    });
  }

  async function bulkRemoveSelected() {
    if (!state.selectedKeys.size) {
      setStatus('请先选择会话', 'warn');
      return;
    }

    const ok = confirm(`确认移除选中的 ${state.selectedKeys.size} 条会话映射？`);
    if (!ok) return;

    for (const key of Array.from(state.selectedKeys)) {
      const [folderId, conversationId] = key.split('::');
      removeConversationFromFolder(folderId, conversationId);
    }

    state.selectedKeys.clear();
    await saveData();
    renderFolderList();
    updateBulkBar();
    setStatus('批量移除已完成', 'success');
  }

  function createPanel() {
    const refs = state.sidebar;
    if (!refs.recentSection || !refs.recentSection.parentElement) {
      return null;
    }

    const panel = document.createElement('section');
    panel.id = PANEL_ID;

    const header = document.createElement('div');
    header.className = 'aisb-folder-header';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'aisb-folder-title-wrap';

    const collapseBtn = document.createElement('button');
    collapseBtn.type = 'button';
    collapseBtn.className = 'aisb-folder-collapse-btn';
    collapseBtn.textContent = '▾';
    collapseBtn.title = '折叠/展开';
    collapseBtn.setAttribute('aria-expanded', 'true');
    state.ui.collapseBtn = collapseBtn;
    
    const title = document.createElement('span');
    title.className = 'aisb-folder-title';
    title.textContent = '文件夹';

    const accountBadge = document.createElement('span');
    accountBadge.className = 'aisb-folder-account';
    accountBadge.textContent = `/u/${state.currentAccountId}`;

    titleWrap.appendChild(collapseBtn);
    titleWrap.appendChild(title);
    titleWrap.appendChild(accountBadge);
    
    collapseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      void togglePanelCollapsed();
    });

    const actions = document.createElement('div');
    actions.className = 'aisb-folder-actions';

    const newButton = createButton('+ 新建', 'aisb-folder-btn', '新建文件夹', () => {
      void handleCreateFolder(null);
    });

    actions.appendChild(newButton);

    header.appendChild(titleWrap);
    header.appendChild(actions);

    const searchRow = document.createElement('div');
    searchRow.className = 'aisb-folder-search-row';

    const search = document.createElement('input');
    search.type = 'search';
    search.className = 'aisb-folder-search';
    search.placeholder = '搜索文件夹 / 会话';
    search.value = state.settings.search || '';
    search.addEventListener('input', () => {
      state.settings.search = search.value.trim();
      void saveSettings();
      renderFolderList();
    });

    searchRow.appendChild(search);

    const status = document.createElement('div');
    status.className = 'aisb-folder-status';

    const bulkBar = document.createElement('div');
    bulkBar.className = `aisb-folder-bulkbar ${state.settings.bulkMode ? 'active' : ''}`;

    const bulkLabel = document.createElement('div');
    bulkLabel.className = 'aisb-folder-bulk-label';
    bulkLabel.textContent = `已选择 ${state.selectedKeys.size} 项`;

    const bulkMove = createButton('移动到...', 'aisb-folder-btn', '', () => {
      void bulkMoveSelected();
    });

    const bulkDelete = createButton('移除选中', 'aisb-folder-btn', '', () => {
      void bulkRemoveSelected();
    });

    const bulkExit = createButton('退出', 'aisb-folder-btn', '', () => {
      exitBulkMode();
    });

    bulkBar.appendChild(bulkLabel);
    bulkBar.appendChild(bulkMove);
    bulkBar.appendChild(bulkDelete);
    bulkBar.appendChild(bulkExit);

    const list = document.createElement('div');
    list.className = 'aisb-folder-list';

    const importInput = document.createElement('input');
    importInput.type = 'file';
    importInput.accept = '.json,application/json';
    importInput.style.display = 'none';
    importInput.addEventListener('change', async () => {
      const file = importInput.files && importInput.files[0];
      if (!file) return;
      await handleImport(file);
      importInput.value = '';
    });

    panel.appendChild(header);
    panel.appendChild(searchRow);
    panel.appendChild(status);
    panel.appendChild(bulkBar);
    panel.appendChild(list);
    panel.appendChild(importInput);

    refs.recentSection.parentElement.insertBefore(panel, refs.recentSection);

    state.ui.panel = panel;
    state.ui.list = list;
    state.ui.searchInput = search;
    state.ui.status = status;
    state.ui.bulkBar = bulkBar;
    state.ui.accountBadge = accountBadge;
    state.ui.importInput = importInput;

    updateBulkBar();
    applyPanelCollapsedState();
    return panel;
  }

  function unmountPanel() {
    closeContextMenu();
    closeColorPicker();
    closeMoveDialog();
    if (state.ui.panel && state.ui.panel.parentElement) {
      state.ui.panel.parentElement.removeChild(state.ui.panel);
    }
    state.ui.panel = null;
    state.ui.list = null;
    state.ui.searchInput = null;
    state.ui.status = null;
    state.ui.bulkBar = null;
    state.ui.accountBadge = null;
    state.ui.importInput = null;
  }

  function findSidebar() {
    const refs = core.dom.getGeminiSidebarRefs();
    if (!refs) return false;
    state.sidebar.container = refs.sidebar;
    state.sidebar.recentSection = refs.recentSection;
    return Boolean(state.sidebar.container && state.sidebar.recentSection);
  }

  function scheduleMount(delay) {
    if (state.sidebar.rebalanceTimer) {
      clearTimeout(state.sidebar.rebalanceTimer);
      state.sidebar.rebalanceTimer = null;
    }
    state.sidebar.rebalanceTimer = setTimeout(() => {
      state.sidebar.rebalanceTimer = null;
      void mountOrRefresh();
    }, Number(delay) > 0 ? Number(delay) : 250);
  }

  function observeSidebarMutations() {
    if (!state.sidebar.container) return;
    if (state.sidebar.observer) {
      state.sidebar.observer.disconnect();
      state.sidebar.observer = null;
    }

    state.sidebar.observer = new MutationObserver(() => {
      bindNativeConversations();
      if (state.ui.panel && !document.body.contains(state.ui.panel)) {
        scheduleMount(200);
      }
    });

    state.sidebar.observer.observe(state.sidebar.container, {
      childList: true,
      subtree: true,
    });
  }

  function observeRootMutations() {
    if (state.sidebar.rootObserver) return;

    state.sidebar.rootObserver = new MutationObserver(() => {
      const refs = core.dom.getGeminiSidebarRefs();
      if (!refs || !refs.sidebar || !refs.recentSection) return;
      const sidebarChanged =
        refs.sidebar !== state.sidebar.container || refs.recentSection !== state.sidebar.recentSection;
      const panelMissing = !state.ui.panel || !document.body.contains(state.ui.panel);
      if (sidebarChanged || panelMissing) {
        scheduleMount(280);
      }
    });

    state.sidebar.rootObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  async function mountOrRefresh() {
    if (!findSidebar()) return false;

    ensureStyles();

    unmountPanel();
    createPanel();
    renderFolderList();
    bindNativeConversations();
    observeSidebarMutations();
    observeRootMutations();

    if (state.ui.accountBadge) {
      state.ui.accountBadge.textContent = `/u/${state.currentAccountId}`;
    }

    return true;
  }

  function bindRouteSync() {
    core.route.onChange(() => {
      const nextAccountId = core.getCurrentAccountId();
      const accountChanged = nextAccountId !== state.currentAccountId;
      state.currentAccountId = nextAccountId;

      if (accountChanged && state.ui.accountBadge) {
        state.ui.accountBadge.textContent = `/u/${state.currentAccountId}`;
        if (state.settings.currentAccountOnly) {
          renderFolderList();
        }
      }

      scheduleMount(360);
    });
  }

  function bindStorageChangeSync() {
    try {
      if (!chrome.storage || !chrome.storage.onChanged) return;
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'local') return;
        if (changes[STORAGE_KEY]) {
          state.data = normalizeData(changes[STORAGE_KEY].newValue || createEmptyData());
          renderFolderList();
        }
      });
    } catch (_) {}
  }

  function bindPanelShortcuts() {
    document.addEventListener('keydown', (event) => {
      if (!state.ui.panel) return;
      if (event.key === 'Escape') {
        closeContextMenu();
        closeColorPicker();
        closeMoveDialog();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'f') {
        const insidePanel = state.ui.panel.contains(document.activeElement);
        if (insidePanel && state.ui.searchInput) {
          event.preventDefault();
          state.ui.searchInput.focus();
          state.ui.searchInput.select();
        }
      }
    });
  }

  async function bootstrap() {
    await loadSettings();
    await loadData();

    // 初始挂载：等待左栏出现后注入。
    let retries = 0;
    const timer = setInterval(() => {
      retries += 1;
      void mountOrRefresh().then((mounted) => {
        if (!mounted) {
          if (retries > 120) {
            clearInterval(timer);
            core.utils.toast('文件夹模块初始化超时，稍后自动重试', 'warn');
          }
          return;
        }

        clearInterval(timer);
        setStatus('文件夹模块已启用', 'success', 1800);
      });
    }, 360);

    bindRouteSync();
    bindStorageChangeSync();
    bindPanelShortcuts();

    core.module.register('folder', {
      getData: () => normalizeData(state.data),
      setData: async (nextData) => {
        state.data = normalizeData(nextData);
        await saveData();
        renderFolderList();
      },
      exportData: (scope) => buildExportPayload(scope || 'all'),
      importData: async (payload) => {
        const validation = validateImportPayload(payload);
        if (!validation.ok) {
          throw new Error(validation.error || '无效导入数据');
        }
        const stats = mergeImportedData(validation.data);
        await saveData();
        renderFolderList();
        return stats;
      },
      addConversationToFolder: async (folderId, conversation, sourceFolderId) => {
        await addConversationToFolder(folderId, conversation, sourceFolderId || null);
        renderFolderList();
      },
      getCurrentAccountId: () => state.currentAccountId,
    });
  }

  bootstrap().catch((error) => {
    console.error('[AISB Folder] 初始化失败：', error);
    core.utils.toast('文件夹模块初始化失败，请刷新页面重试', 'error', 4500);
  });
})();
