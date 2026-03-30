(function () {
  'use strict';

  if (window.__AISB_VOYAGER_SETTINGS_LOADED__) return;
  if (location.hostname !== 'gemini.google.com') return;
  window.__AISB_VOYAGER_SETTINGS_LOADED__ = true;

  const ROOT_ID = 'gvsp-root';
  const STYLE_ID = 'gvsp-style';

  const DEFAULTS = {
    gvFolderSpacing: 2,
    gvFolderTreeIndent: -8,
    geminiSidebarWidth: 312,
    geminiChatWidth: 70,
    geminiEditInputWidth: 60,
    geminiInputHeight: 58,
    gvSidebarAutoHide: false,
    gvSnowEffectEnabled: false,
    gvInputCollapseEnabled: false,
    universalInputCollapseEnabled: false,
    notebooklmSidebarHideEnabled: false,
    gvTabTitleUpdateEnabled: true,
    gvHideRecentsEnabled: false,
  };

  const SLIDERS = {
    gvFolderSpacing: { label: '文件夹间距', min: 0, max: 16, unit: 'px' },
    gvFolderTreeIndent: { label: '子文件缩进', min: -8, max: 32, unit: 'px' },
    geminiSidebarWidth: { label: '侧边栏宽度', min: 180, max: 540, unit: 'px' },
    geminiChatWidth: { label: '对话区域宽度', min: 30, max: 100, unit: '%' },
    geminiEditInputWidth: { label: '编辑输入框宽度', min: 30, max: 100, unit: '%' },
    geminiInputHeight: { label: '输入框高度', min: 30, max: 100, unit: 'px' },
  };

  const TOGGLES = {
    gvInputCollapseEnabled: { label: '启用输入框折叠 (Gemini)', hint: '输入框为空时自动折叠' },
    universalInputCollapseEnabled: { label: '启用输入框折叠 (所有AI)', hint: '在 NotebookLM、ChatGPT、Claude 等所有 AI 平台启用输入框折叠' },
    notebooklmSidebarHideEnabled: { label: '隐藏 NotebookLM 标签栏', hint: '隐藏顶部的来源/对话/Studio 标签，让内容区域更大' },
    gvTabTitleUpdateEnabled: { label: '标题同步', hint: '自动同步对话标题到时间轴' },
    gvSidebarAutoHide: { label: '侧边栏自动收起', hint: '鼠标离开时自动收起' },
    gvHideRecentsEnabled: { label: '隐藏最近对话', hint: '隐藏侧边栏的最近对话列表' },
    gvSnowEffectEnabled: { label: '飘雪效果', hint: '装饰性飘雪动画' },
  };

  let settings = { ...DEFAULTS };
  const controls = {};

  function storageGet(keys) {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync) {
        resolve({});
        return;
      }
      chrome.storage.sync.get(keys, resolve);
    });
  }

  function storageSet(items) {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync) {
        resolve();
        return;
      }
      chrome.storage.sync.set(items, resolve);
    });
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function toNumber(value, fallback) {
    const num = Number(value);
    return isNaN(num) ? fallback : num;
  }

  function sanitize(raw) {
    const next = { ...DEFAULTS, ...(raw || {}) };
    const sliderKeys = Object.keys(SLIDERS);
    
    for (const key of sliderKeys) {
      const meta = SLIDERS[key];
      next[key] = clamp(toNumber(next[key], DEFAULTS[key]), meta.min, meta.max);
    }

    for (const key of Object.keys(TOGGLES)) {
      next[key] = typeof next[key] === 'boolean' ? next[key] : DEFAULTS[key];
    }

    return next;
  }

  function applySettings() {
    if (settings.gvHideRecentsEnabled !== undefined) {
      const oldKey = 'gvToolsSettings';
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(oldKey, (result) => {
          const oldSettings = result[oldKey] || {};
          oldSettings.hideRecents = settings.gvHideRecentsEnabled;
          chrome.storage.local.set({ [oldKey]: oldSettings });
        });
      }
    }
  }

  function formatValue(key, value) {
    const meta = SLIDERS[key];
    return meta ? `${value}${meta.unit}` : String(value);
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
#${ROOT_ID} {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 2147483646;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  pointer-events: none;
}

#${ROOT_ID} * {
  box-sizing: border-box;
}

#${ROOT_ID} .gvsp-gear {
  pointer-events: auto;
  width: 52px;
  height: 52px;
  border: none;
  border-radius: 50%;
  background: #1f2937;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.3);
  transition: transform 180ms ease, box-shadow 180ms ease;
}

#${ROOT_ID} .gvsp-gear:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.4);
}

#${ROOT_ID} .gvsp-gear:active {
  transform: translateY(0) scale(0.98);
}

#${ROOT_ID}.open .gvsp-gear {
  transform: none;
}

#${ROOT_ID} .gvsp-gear img {
  width: 24px;
  height: 24px;
  object-fit: contain;
  display: block;
}

#${ROOT_ID} .gvsp-panel {
  pointer-events: auto;
  position: absolute;
  right: 0;
  bottom: 66px;
  width: 360px;
  max-width: calc(100vw - 32px);
  max-height: min(78vh, 620px);
  overflow: auto;
  padding: 20px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  color: #1f2937;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.2);
  opacity: 0;
  transform: translateY(8px) scale(0.98);
  transform-origin: right bottom;
  transition: opacity 180ms ease, transform 180ms ease;
  pointer-events: none;
}

#${ROOT_ID}.open .gvsp-panel {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}

#${ROOT_ID} .gvsp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

#${ROOT_ID} .gvsp-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

#${ROOT_ID} .gvsp-close {
  border: 1px solid rgba(0, 0, 0, 0.1);
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(243, 244, 246, 0.8);
  color: #6b7280;
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
  transition: all 150ms ease;
}

#${ROOT_ID} .gvsp-close:hover {
  color: #111827;
  background: rgba(229, 231, 235, 1);
}

#${ROOT_ID} .gvsp-list {
  display: grid;
  gap: 16px;
}

#${ROOT_ID} .gvsp-item {
  display: grid;
  gap: 8px;
}

#${ROOT_ID} .gvsp-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

#${ROOT_ID} .gvsp-label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

#${ROOT_ID} .gvsp-hint {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 2px;
  line-height: 1.3;
}

#${ROOT_ID} .gvsp-value {
  font-size: 13px;
  color: #6b7280;
  font-variant-numeric: tabular-nums;
}

#${ROOT_ID} .gvsp-slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #e5e7eb;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
}

#${ROOT_ID} .gvsp-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #2563eb;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.3);
  transition: transform 120ms ease;
}

#${ROOT_ID} .gvsp-slider::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}

#${ROOT_ID} .gvsp-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 50%;
  background: #2563eb;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.3);
  transition: transform 120ms ease;
}

#${ROOT_ID} .gvsp-slider::-moz-range-thumb:hover {
  transform: scale(1.15);
}

#${ROOT_ID} .gvsp-toggle-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

#${ROOT_ID} .gvsp-switch {
  position: relative;
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background: #d1d5db;
  cursor: pointer;
  transition: background 200ms ease;
}

#${ROOT_ID} .gvsp-switch.on {
  background: #2563eb;
}

#${ROOT_ID} .gvsp-switch-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: transform 200ms ease;
}

#${ROOT_ID} .gvsp-switch.on .gvsp-switch-thumb {
  transform: translateX(20px);
}

#${ROOT_ID} .gvsp-footer {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  font-size: 12px;
  color: #9ca3af;
  text-align: center;
}

@media (prefers-color-scheme: dark) {
  #${ROOT_ID} .gvsp-panel {
    background: rgba(31, 41, 55, 0.95);
    color: #e5e7eb;
  }
  
  #${ROOT_ID} .gvsp-header {
    border-bottom-color: rgba(255, 255, 255, 0.1);
  }
  
  #${ROOT_ID} .gvsp-title {
    color: #f9fafb;
  }
  
  #${ROOT_ID} .gvsp-close {
    border-color: rgba(255, 255, 255, 0.1);
    background: rgba(55, 65, 81, 0.8);
    color: #9ca3af;
  }
  
  #${ROOT_ID} .gvsp-close:hover {
    color: #f9fafb;
    background: rgba(75, 85, 99, 1);
  }
  
  #${ROOT_ID} .gvsp-label {
    color: #d1d5db;
  }
  
  #${ROOT_ID} .gvsp-hint {
    color: #6b7280;
  }
  
  #${ROOT_ID} .gvsp-value {
    color: #9ca3af;
  }
  
  #${ROOT_ID} .gvsp-slider {
    background: #4b5563;
  }
  
  #${ROOT_ID} .gvsp-switch {
    background: #4b5563;
  }
  
  #${ROOT_ID} .gvsp-footer {
    border-top-color: rgba(255, 255, 255, 0.1);
    color: #6b7280;
  }
}
    `;

    document.head.appendChild(style);
  }

  function createSliderControl(key, meta) {
    const item = document.createElement('div');
    item.className = 'gvsp-item';

    const header = document.createElement('div');
    header.className = 'gvsp-item-header';

    const label = document.createElement('label');
    label.className = 'gvsp-label';
    label.textContent = meta.label;

    const valueSpan = document.createElement('span');
    valueSpan.className = 'gvsp-value';

    header.append(label, valueSpan);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'gvsp-slider';
    slider.min = String(meta.min);
    slider.max = String(meta.max);
    slider.step = '1';

    slider.addEventListener('input', () => {
      const value = parseInt(slider.value, 10);
      settings[key] = value;
      valueSpan.textContent = formatValue(key, value);
      void storageSet({ [key]: value });
    });

    item.append(header, slider);

    return {
      element: item,
      update: (value) => {
        slider.value = String(value);
        valueSpan.textContent = formatValue(key, value);
      },
    };
  }

  function createToggleControl(key, meta) {
    const item = document.createElement('div');
    item.className = 'gvsp-item';

    const wrap = document.createElement('div');
    wrap.className = 'gvsp-toggle-wrap';

    const labelWrap = document.createElement('div');
    labelWrap.style.flex = '1';
    labelWrap.style.cursor = 'pointer';

    const label = document.createElement('div');
    label.className = 'gvsp-label';
    label.textContent = meta.label;

    labelWrap.appendChild(label);

    if (meta.hint) {
      const hint = document.createElement('div');
      hint.className = 'gvsp-hint';
      hint.textContent = meta.hint;
      labelWrap.appendChild(hint);
    }

    const switchEl = document.createElement('div');
    switchEl.className = 'gvsp-switch';

    const thumb = document.createElement('div');
    thumb.className = 'gvsp-switch-thumb';
    switchEl.appendChild(thumb);

    const toggle = () => {
      const nextValue = !settings[key];
      settings[key] = nextValue;
      switchEl.classList.toggle('on', nextValue);
      void storageSet({ [key]: nextValue });
      applySettings();
    };

    labelWrap.addEventListener('click', toggle);
    switchEl.addEventListener('click', toggle);

    wrap.append(labelWrap, switchEl);
    item.appendChild(wrap);

    return {
      element: item,
      update: (value) => {
        switchEl.classList.toggle('on', !!value);
      },
    };
  }

  function syncControls() {
    for (const key of Object.keys(controls)) {
      const control = controls[key];
      const value = settings[key];
      if (control && control.update) {
        control.update(value);
      }
    }
  }

  function attachStorageListener() {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.onChanged) {
      return;
    }

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'sync') return;

      for (const key of Object.keys(changes)) {
        if (key in settings) {
          const newValue = changes[key].newValue;
          settings[key] = newValue;
          const control = controls[key];
          if (control && control.update) {
            control.update(newValue);
          }
        }
      }
    });
  }

  function buildUI() {
    const root = document.createElement('div');
    root.id = ROOT_ID;
    const gearIconUrl = chrome.runtime.getURL('images/voyager-settings-ai-white.png');

    const gear = document.createElement('button');
    gear.type = 'button';
    gear.className = 'gvsp-gear';
    gear.setAttribute('aria-label', 'Open Voyager settings');
    gear.setAttribute('aria-expanded', 'false');
    gear.innerHTML = `<img src="${gearIconUrl}" alt="" aria-hidden="true">`;

    const panel = document.createElement('aside');
    panel.className = 'gvsp-panel';
    panel.setAttribute('aria-hidden', 'true');

    const header = document.createElement('div');
    header.className = 'gvsp-header';

    const title = document.createElement('h3');
    title.className = 'gvsp-title';
    title.textContent = 'Sidecar Settings';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'gvsp-close';
    closeBtn.setAttribute('aria-label', 'Close settings');
    closeBtn.textContent = '×';

    header.append(title, closeBtn);

    const list = document.createElement('div');
    list.className = 'gvsp-list';

    const sliderKeys = Object.keys(SLIDERS);
    for (const key of sliderKeys) {
      const control = createSliderControl(key, SLIDERS[key]);
      controls[key] = control;
      list.appendChild(control.element);
    }

    for (const key of Object.keys(TOGGLES)) {
      const control = createToggleControl(key, TOGGLES[key]);
      controls[key] = control;
      list.appendChild(control.element);
    }

    const footer = document.createElement('div');
    footer.className = 'gvsp-footer';
    footer.textContent = 'Changes are saved instantly';

    panel.append(header, list, footer);
    root.append(gear, panel);
    document.body.appendChild(root);

    let isOpen = false;

    function setOpen(nextOpen) {
      isOpen = !!nextOpen;
      root.classList.toggle('open', isOpen);
      gear.setAttribute('aria-expanded', String(isOpen));
      panel.setAttribute('aria-hidden', String(!isOpen));
    }

    gear.addEventListener('click', (event) => {
      event.stopPropagation();
      setOpen(!isOpen);
    });

    closeBtn.addEventListener('click', () => setOpen(false));

    document.addEventListener('pointerdown', (event) => {
      if (!isOpen) return;
      if (root.contains(event.target)) return;
      setOpen(false);
    }, true);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isOpen) {
        setOpen(false);
      }
    });
  }

  async function init() {
    if (!document.body) return;
    if (document.getElementById(ROOT_ID)) return;

    injectStyles();
    buildUI();

    const knownKeys = Object.keys(DEFAULTS);
    const stored = await storageGet(knownKeys);
    settings = sanitize(stored);

    syncControls();
    applySettings();
    attachStorageListener();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    void init();
  }
})();
