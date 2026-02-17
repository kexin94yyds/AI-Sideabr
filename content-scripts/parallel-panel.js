// Parallel AI Panel - Content Script
// 注入到用户浏览的网页，提供并行 AI 聊天窗口

(function() {
  'use strict';

  // 防止重复注入
  if (window.__parallelAIPanelLoaded) return;
  window.__parallelAIPanelLoaded = true;

  // AI 提供商列表（与 popup.js 中的 PROVIDERS 保持一致）
  const PROVIDERS = {
    chatgpt: { label: 'ChatGPT', iframeUrl: 'https://chatgpt.com/chat' },
    codex: { label: 'ChatGPT Codex', iframeUrl: 'https://chatgpt.com/codex' },
    perplexity: { label: 'Perplexity', iframeUrl: 'https://www.perplexity.ai/' },
    genspark: { label: 'Genspark', iframeUrl: 'https://www.genspark.ai/agents?type=moa_chat' },
    tongyi: { label: '通义千问', iframeUrl: 'https://www.tongyi.com/' },
    doubao: { label: '豆包', iframeUrl: 'https://www.doubao.com/' },
    gemini: { label: 'Gemini', iframeUrl: 'https://gemini.google.com/app' },
    google: { label: 'Google AI', iframeUrl: 'https://www.google.com/search?udm=50' },
    aistudio: { label: 'AI Studio', iframeUrl: 'https://aistudio.google.com/apps' },
    claude: { label: 'Claude', iframeUrl: 'https://claude.ai' },
    deepseek: { label: 'DeepSeek', iframeUrl: 'https://chat.deepseek.com/' },
    grok: { label: 'Grok', iframeUrl: 'https://grok.com/' },
    notebooklm: { label: 'NotebookLM', iframeUrl: 'https://notebooklm.google.com/' },
    ima: { label: 'IMA', iframeUrl: 'https://ima.qq.com/' },
    kimi: { label: 'Kimi', iframeUrl: 'https://kimi.moonshot.cn/' },
    v0: { label: 'v0', iframeUrl: 'https://v0.dev/chat' },
    copilot: { label: 'GitHub Copilot', iframeUrl: 'https://github.com/copilot' },
    mistral: { label: 'Mistral', iframeUrl: 'https://chat.mistral.ai/' },
    cohere: { label: 'Cohere', iframeUrl: 'https://coral.cohere.com/' },
    huggingface: { label: 'HuggingChat', iframeUrl: 'https://huggingface.co/chat/' },
    metaai: { label: 'Meta AI', iframeUrl: 'https://www.meta.ai/' },
    zhipu: { label: '智谱清言', iframeUrl: 'https://chatglm.cn/' },
    minimax: { label: '海螺AI', iframeUrl: 'https://hailuoai.com/' }
  };

  // 面板状态
  let panels = [];
  let panelCounter = 0;
  let stylesInjected = false;

  // 注入样式
  function injectStyles() {
    if (stylesInjected) return;
    stylesInjected = true;

    const style = document.createElement('style');
    style.id = 'parallel-ai-panel-styles';
    style.textContent = `
      .parallel-ai-panel {
        position: fixed;
        top: 60px;
        left: 20px;
        width: 420px;
        height: 520px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
        z-index: 999999;
        display: none;
        flex-direction: column;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .parallel-ai-panel.visible { display: flex; }
      .parallel-ai-panel .panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        background: #f9fafb;
        color: #374151;
        border-radius: 12px 12px 0 0;
        border-bottom: 1px solid #e5e7eb;
      }
      .parallel-ai-panel .panel-title {
        font-size: 13px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .parallel-ai-panel .panel-actions {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .parallel-ai-panel .panel-btn {
        background: #e5e7eb;
        border: none;
        color: #374151;
        padding: 5px 10px;
        border-radius: 6px;
        font-size: 11px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .parallel-ai-panel .panel-btn:hover { background: #d1d5db; }
      .parallel-ai-panel .panel-btn.sync {
        background: rgba(52, 211, 153, 0.3);
        border-color: rgba(52, 211, 153, 0.5);
      }
      .parallel-ai-panel .panel-btn.sync:hover { background: rgba(52, 211, 153, 0.5); }
      .parallel-ai-panel .panel-select {
        background: white;
        color: #333;
        border: none;
        border-radius: 4px;
        font-size: 11px;
        padding: 5px 8px;
        cursor: pointer;
        outline: none;
        max-width: 120px;
      }
      .parallel-ai-panel .panel-btn.add {
        background: #e5e7eb;
        color: #374151;
        border: none;
        font-weight: 600;
        font-size: 14px;
        padding: 4px 10px;
      }
      .parallel-ai-panel .panel-btn.add:hover {
        background: #d1d5db;
        transform: scale(1.05);
      }
      .parallel-ai-panel .panel-btn.close {
        background: #e5e7eb;
        padding: 5px 8px;
        border: none;
      }
      .parallel-ai-panel .panel-btn.close:hover { background: #fecaca; color: #dc2626; }
      .parallel-ai-panel .panel-content {
        flex: 1;
        position: relative;
        background: #f8f9fa;
      }
      .parallel-ai-panel .panel-iframe {
        width: 100%;
        height: 100%;
        border: none;
      }
      .parallel-ai-panel .loading-overlay {
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(255, 255, 255, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 12px;
      }
      .parallel-ai-panel .loading-spinner {
        width: 32px;
        height: 32px;
        border: 3px solid #e8f0fe;
        border-top-color: #1a73e8;
        border-radius: 50%;
        animation: parallel-spin 1s linear infinite;
      }
      @keyframes parallel-spin { to { transform: rotate(360deg); } }
      .parallel-ai-panel .loading-text { font-size: 13px; color: #5f6368; }
      .parallel-ai-panel .drag-handle { cursor: move; user-select: none; }
      .parallel-ai-panel .resize-handle {
        position: absolute;
        bottom: 0; right: 0;
        width: 16px; height: 16px;
        cursor: se-resize;
        background: linear-gradient(135deg, transparent 50%, #ccc 50%);
        border-radius: 0 0 12px 0;
      }
      .parallel-ai-panel .panel-status {
        padding: 8px 16px;
        background: #f1f3f4;
        font-size: 11px;
        color: #5f6368;
        border-top: 1px solid #e8eaed;
      }
    `;
    document.head.appendChild(style);
  }

  // 获取下一个可用的窗口编号
  function getNextPanelNumber() {
    if (panels.length === 0) return 1;
    const usedNumbers = panels.map(p => p.number || 1);
    for (let i = 1; i <= 100; i++) {
      if (!usedNumbers.includes(i)) return i;
    }
    return panels.length + 1;
  }

  // 生成下拉选项 HTML
  function generateSelectOptions(selectedKey = 'chatgpt') {
    return Object.entries(PROVIDERS).map(([key, provider]) => {
      const selected = key === selectedKey ? 'selected' : '';
      return `<option value="${key}" ${selected}>${provider.label}</option>`;
    }).join('');
  }

  // 创建面板
  function createPanel(initialProvider = 'chatgpt') {
    injectStyles();
    
    const panelNumber = getNextPanelNumber();
    panelCounter++;
    const id = `pac-panel-${panelCounter}`;
    
    const panel = document.createElement('div');
    panel.id = id;
    panel.className = 'parallel-ai-panel';
    panel.style.top = (60 + (panels.length) * 30) + 'px';
    panel.style.left = (20 + (panels.length) * 30) + 'px';
    
    panel.innerHTML = `
      <div class="panel-header drag-handle">
        <span class="panel-title">💬 窗口 ${panelNumber}</span>
        <div class="panel-actions">
          <select class="panel-select" data-panel-id="${id}" title="选择 AI 平台">
            ${generateSelectOptions(initialProvider)}
          </select>
          <button class="panel-btn add" data-panel-id="${id}" title="新开窗口">+</button>
          <button class="panel-btn sync" data-panel-id="${id}" title="同步上下文到剪贴板">同步</button>
          <button class="panel-btn close" data-panel-id="${id}" title="关闭窗口">✕</button>
        </div>
      </div>
      <div class="panel-content">
        <div class="loading-overlay">
          <div class="loading-spinner"></div>
          <span class="loading-text">加载中...</span>
        </div>
        <iframe class="panel-iframe"></iframe>
      </div>
      <div class="panel-status">就绪</div>
      <div class="resize-handle"></div>
    `;

    document.body.appendChild(panel);
    panels.push({ id, element: panel, number: panelNumber, currentProvider: initialProvider });

    setupPanelEvents(panel);
    panel.classList.add('visible');
    loadAI(panel, initialProvider);
    
    return panel;
  }

  // 设置面板事件
  function setupPanelEvents(panel) {
    const closeBtn = panel.querySelector('.panel-btn.close');
    const syncBtn = panel.querySelector('.panel-btn.sync');
    const addBtn = panel.querySelector('.panel-btn.add');
    const selectEl = panel.querySelector('.panel-select');
    const header = panel.querySelector('.drag-handle');
    const resizeHandle = panel.querySelector('.resize-handle');

    // 平台选择变化
    selectEl.addEventListener('change', () => {
      loadAI(panel, selectEl.value);
    });

    // 新开窗口
    addBtn.addEventListener('click', () => {
      createPanel(selectEl.value);
    });

    // 关闭
    closeBtn.addEventListener('click', () => {
      closePanel(panel);
    });

    // 同步上下文
    syncBtn.addEventListener('click', () => {
      syncContext(panel);
    });

    // 拖拽功能
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };

    header.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT') return;
      isDragging = true;
      dragOffset.x = e.clientX - panel.offsetLeft;
      dragOffset.y = e.clientY - panel.offsetTop;
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      panel.style.left = (e.clientX - dragOffset.x) + 'px';
      panel.style.top = (e.clientY - dragOffset.y) + 'px';
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });

    // 调整大小
    let isResizing = false;
    let startSize = { w: 0, h: 0 };
    let startPos = { x: 0, y: 0 };

    resizeHandle.addEventListener('mousedown', (e) => {
      isResizing = true;
      startSize.w = panel.offsetWidth;
      startSize.h = panel.offsetHeight;
      startPos.x = e.clientX;
      startPos.y = e.clientY;
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      const newWidth = startSize.w + (e.clientX - startPos.x);
      const newHeight = startSize.h + (e.clientY - startPos.y);
      panel.style.width = Math.max(300, newWidth) + 'px';
      panel.style.height = Math.max(300, newHeight) + 'px';
    });

    document.addEventListener('mouseup', () => {
      isResizing = false;
    });
  }

  // 加载 AI
  function loadAI(panel, providerKey) {
    const iframe = panel.querySelector('.panel-iframe');
    const loading = panel.querySelector('.loading-overlay');
    const status = panel.querySelector('.panel-status');
    const provider = PROVIDERS[providerKey];

    if (!iframe || !provider) return;

    // 更新面板记录
    const panelData = panels.find(p => p.element === panel);
    if (panelData) panelData.currentProvider = providerKey;

    iframe.src = provider.iframeUrl;
    loading.style.display = 'flex';
    status.textContent = `正在加载 ${provider.label}...`;

    iframe.onload = () => {
      loading.style.display = 'none';
      status.textContent = `已连接到 ${provider.label}`;
    };

    iframe.onerror = () => {
      loading.style.display = 'none';
      status.textContent = '加载失败，请重试';
    };
  }

  // 关闭面板
  function closePanel(panel) {
    panel.classList.remove('visible');
    setTimeout(() => {
      panel.remove();
      panels = panels.filter(p => p.element !== panel);
    }, 200);
  }

  // 同步上下文（复制到剪贴板）
  function syncContext(panel) {
    const status = panel.querySelector('.panel-status');
    
    // 获取当前页面选中的文本
    const selectedText = window.getSelection().toString().trim();
    
    if (selectedText) {
      navigator.clipboard.writeText(selectedText).then(() => {
        status.textContent = `已复制选中文本 (${selectedText.length} 字符)`;
      }).catch(() => {
        status.textContent = '复制失败，请手动复制';
      });
    } else {
      status.textContent = '请先选中要同步的文本';
    }
  }

  // 切换面板显示
  function togglePanel(provider = 'chatgpt') {
    if (panels.length === 0) {
      // 使用传入的 provider 创建面板
      createPanel(provider);
      return true;
    } else {
      const anyVisible = panels.some(p => p.element.classList.contains('visible'));
      if (anyVisible) {
        panels.forEach(p => p.element.classList.remove('visible'));
        return false;
      } else {
        panels.forEach(p => p.element.classList.add('visible'));
        return true;
      }
    }
  }

  // 监听来自扩展的消息
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
      case 'toggleParallelPanel':
        // 使用传入的 provider，默认为 chatgpt
        const provider = request.provider || 'chatgpt';
        const isVisible = togglePanel(provider);
        sendResponse({ success: true, visible: isVisible, provider: provider });
        break;

      case 'createParallelPanel':
        const createProvider = request.provider || 'chatgpt';
        createPanel(createProvider);
        sendResponse({ success: true });
        break;

      case 'getParallelPanelStatus':
        sendResponse({ 
          success: true, 
          panelCount: panels.length,
          anyVisible: panels.some(p => p.element.classList.contains('visible'))
        });
        break;

      default:
        sendResponse({ success: false, message: '未知操作' });
    }
    return true;
  });

  console.log('[AI-Sidebar] Parallel Panel content script loaded');

})();
