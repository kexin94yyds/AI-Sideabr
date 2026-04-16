(function () {
  'use strict';

  if (window.__AISB_GEMINI_MERMAID_LOADED__) return;
  if (location.hostname !== 'gemini.google.com') return;
  window.__AISB_GEMINI_MERMAID_LOADED__ = true;

  const core = window.__AISB_GEMINI__;
  if (!core) {
    console.error('[AISB Mermaid] 缺少 gemini-common.js。');
    return;
  }

  const STORAGE_KEY = 'gvMermaidSettings';
  const STYLE_ID = 'aisb-gemini-mermaid-style';

  const state = {
    settings: {
      version: '11.12.2',
      defaultMode: 'diagram',
      enabled: true,
    },
    observer: null,
    scanTimer: null,
  };

  function ensureStyles() {
    core.dom.ensureStyle(
      STYLE_ID,
      `
      .aisb-mermaid-wrapper {
        position: relative;
      }
      .aisb-mermaid-toolbar {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        border: 1px solid rgba(229, 231, 235, 0.9);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.94);
        backdrop-filter: blur(10px);
        padding: 4px;
        margin-bottom: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
      }
      .aisb-mermaid-toolbar button {
        border: none;
        border-radius: 6px;
        background: transparent;
        color: #6b7280;
        font-size: 12px;
        font-weight: 600;
        line-height: 1;
        padding: 5px 9px;
        cursor: pointer;
      }
      .aisb-mermaid-toolbar button:hover {
        background: rgba(0, 0, 0, 0.06);
        color: #1f2937;
      }
      .aisb-mermaid-toolbar button.active {
        background: #dbeafe;
        color: #1e3a8a;
      }
      .aisb-mermaid-diagram {
        border: 1px solid rgba(229, 231, 235, 0.9);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.96);
        backdrop-filter: blur(10px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
        padding: 11px;
        overflow: auto;
        text-align: center;
        animation: aisb-gm-fade-up 200ms cubic-bezier(0.4, 0, 0.2, 1);
      }
      .aisb-mermaid-diagram img {
        max-width: 100%;
        border-radius: 6px;
      }
      .aisb-mermaid-error {
        font-size: 13px;
        color: #ef4444;
        text-align: left;
      }
      .aisb-mermaid-hint {
        font-size: 12px;
        color: #6b7280;
        text-align: left;
        margin-top: 6px;
      }
      .aisb-mermaid-code-hidden {
        display: none !important;
      }
      `,
    );
  }

  function normalizeCode(text) {
    return String(text || '')
      .replace(/\u00a0/g, ' ')
      .replace(/\r\n/g, '\n')
      .trim();
  }

  function isMermaidCode(code) {
    const text = normalizeCode(code);
    if (!text) return false;
    if (text.length < 20) return false;

    const keywords = [
      'graph',
      'flowchart',
      'sequenceDiagram',
      'classDiagram',
      'stateDiagram',
      'erDiagram',
      'gantt',
      'pie',
      'gitGraph',
      'journey',
      'mindmap',
      'timeline',
      'zenuml',
      'quadrantChart',
      'requirementDiagram',
      'sankey',
      'C4Context',
      'C4Container',
      'C4Component',
      'xychart',
      'block',
      'packet',
      'architecture',
      'kanban',
      'radar',
      'treemap',
    ];

    const firstLine = text.split('\n')[0].trim();
    const startsWithKeyword =
      firstLine.startsWith('%%') ||
      keywords.some((keyword) => firstLine.toLowerCase().startsWith(keyword.toLowerCase()));

    if (!startsWithKeyword) return false;

    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
    return lines.length >= 2;
  }

  function encodeMermaidCode(code) {
    // mermaid.ink 支持 base64 编码的语法字符串。
    const utf8 = encodeURIComponent(code)
      .replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(Number(`0x${p1}`)));
    return btoa(utf8);
  }

  function getMermaidInkUrl(code, version) {
    const encoded = encodeMermaidCode(code);
    const dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = dark ? 'dark' : 'default';
    const ver = version || '11.12.2';
    return `https://mermaid.ink/svg/${encoded}?theme=${theme}&version=${encodeURIComponent(ver)}`;
  }

  async function loadSettings() {
    const settings = await core.storage.get(STORAGE_KEY, null);
    if (settings && typeof settings === 'object') {
      state.settings.version =
        settings.version === '9.2.2' || settings.version === '11.12.2'
          ? settings.version
          : '11.12.2';
      state.settings.defaultMode = settings.defaultMode === 'code' ? 'code' : 'diagram';
      state.settings.enabled = settings.enabled !== false;
    }
  }

  async function saveSettings() {
    await core.storage.set(STORAGE_KEY, {
      version: state.settings.version,
      defaultMode: state.settings.defaultMode,
      enabled: state.settings.enabled,
    });
  }

  function toggleView(wrapper, mode) {
    const codeBlock = wrapper.querySelector('[data-aisb-mermaid-code="1"]');
    const diagram = wrapper.querySelector('.aisb-mermaid-diagram');

    if (!codeBlock || !diagram) return;

    const showCode = mode === 'code';
    codeBlock.classList.toggle('aisb-mermaid-code-hidden', !showCode);
    diagram.style.display = showCode ? 'none' : 'block';

    wrapper.querySelectorAll('.aisb-mermaid-toolbar button[data-mode]').forEach((button) => {
      button.classList.toggle('active', button.getAttribute('data-mode') === mode);
    });
  }

  function updateVersionButtons(wrapper) {
    wrapper.querySelectorAll('.aisb-mermaid-toolbar button[data-version]').forEach((button) => {
      button.classList.toggle('active', button.getAttribute('data-version') === state.settings.version);
    });
  }

  function renderDiagram(container, code) {
    container.innerHTML = '';

    const img = document.createElement('img');
    img.alt = 'Mermaid diagram';
    img.src = getMermaidInkUrl(code, state.settings.version);

    img.addEventListener('error', () => {
      container.innerHTML = '';
      const error = document.createElement('div');
      error.className = 'aisb-mermaid-error';
      error.textContent = 'Mermaid 渲染失败，建议切换版本后重试。';

      const hint = document.createElement('div');
      hint.className = 'aisb-mermaid-hint';
      hint.textContent =
        '当前使用远程渲染通道（mermaid.ink），若公司网络限制外链可切换到“代码”查看。';

      container.appendChild(error);
      container.appendChild(hint);
    });

    container.appendChild(img);
  }

  function buildWrapper(codeElement, codeText) {
    const pre = codeElement.closest('pre');
    const host = pre || codeElement;

    if (host.dataset.aisbMermaidWrapped === '1') {
      return;
    }

    host.dataset.aisbMermaidWrapped = '1';
    codeElement.dataset.aisbMermaidCode = '1';

    const wrapper = document.createElement('div');
    wrapper.className = 'aisb-mermaid-wrapper';

    const toolbar = document.createElement('div');
    toolbar.className = 'aisb-mermaid-toolbar';

    const diagramBtn = document.createElement('button');
    diagramBtn.type = 'button';
    diagramBtn.textContent = '图表';
    diagramBtn.dataset.mode = 'diagram';
    diagramBtn.addEventListener('click', () => {
      state.settings.defaultMode = 'diagram';
      void saveSettings();
      toggleView(wrapper, 'diagram');
    });

    const codeBtn = document.createElement('button');
    codeBtn.type = 'button';
    codeBtn.textContent = '代码';
    codeBtn.dataset.mode = 'code';
    codeBtn.addEventListener('click', () => {
      state.settings.defaultMode = 'code';
      void saveSettings();
      toggleView(wrapper, 'code');
    });

    const version11Btn = document.createElement('button');
    version11Btn.type = 'button';
    version11Btn.textContent = 'v11.12.2';
    version11Btn.dataset.version = '11.12.2';
    version11Btn.addEventListener('click', () => {
      state.settings.version = '11.12.2';
      void saveSettings();
      updateVersionButtons(wrapper);
      renderDiagram(diagram, codeText);
    });

    const version9Btn = document.createElement('button');
    version9Btn.type = 'button';
    version9Btn.textContent = 'v9.2.2';
    version9Btn.dataset.version = '9.2.2';
    version9Btn.addEventListener('click', () => {
      state.settings.version = '9.2.2';
      void saveSettings();
      updateVersionButtons(wrapper);
      renderDiagram(diagram, codeText);
    });

    toolbar.appendChild(diagramBtn);
    toolbar.appendChild(codeBtn);
    toolbar.appendChild(version11Btn);
    toolbar.appendChild(version9Btn);

    const diagram = document.createElement('div');
    diagram.className = 'aisb-mermaid-diagram';

    renderDiagram(diagram, codeText);

    host.parentNode.insertBefore(wrapper, host);
    wrapper.appendChild(toolbar);
    wrapper.appendChild(diagram);
    wrapper.appendChild(host);

    updateVersionButtons(wrapper);
    toggleView(wrapper, state.settings.defaultMode);
  }

  function scanOnce() {
    if (!state.settings.enabled) return;

    const candidates = document.querySelectorAll('pre code, code.language-mermaid, code.lang-mermaid');
    candidates.forEach((codeElement) => {
      if (!(codeElement instanceof HTMLElement)) return;
      if (codeElement.closest('#aisb-gemini-folder-panel')) return;
      if (codeElement.dataset.aisbMermaidProcessed === '1') return;

      const codeText = normalizeCode(codeElement.innerText || codeElement.textContent || '');
      if (!isMermaidCode(codeText)) return;

      codeElement.dataset.aisbMermaidProcessed = '1';
      buildWrapper(codeElement, codeText);
    });
  }

  function scheduleScan() {
    if (state.scanTimer) {
      clearTimeout(state.scanTimer);
      state.scanTimer = null;
    }
    state.scanTimer = setTimeout(() => {
      state.scanTimer = null;
      scanOnce();
    }, 160);
  }

  function observeDom() {
    if (state.observer) {
      state.observer.disconnect();
      state.observer = null;
    }

    state.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && (mutation.addedNodes.length || mutation.removedNodes.length)) {
          scheduleScan();
          break;
        }
      }
    });

    state.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  async function bootstrap() {
    ensureStyles();
    await loadSettings();
    scanOnce();
    observeDom();

    core.module.register('mermaid', {
      scan: scanOnce,
      setEnabled: async (enabled) => {
        state.settings.enabled = Boolean(enabled);
        await saveSettings();
        if (state.settings.enabled) {
          scanOnce();
        }
      },
      setVersion: async (version) => {
        if (version !== '9.2.2' && version !== '11.12.2') return;
        state.settings.version = version;
        await saveSettings();
        scanOnce();
      },
      getSettings: () => ({ ...state.settings }),
    });
  }

  bootstrap().catch((error) => {
    console.error('[AISB Mermaid] 初始化失败：', error);
  });
})();
