(function () {
  'use strict';

  if (window.__AISB_GEMINI_FILE_UPLOAD_LOADED__) return;
  if (location.hostname !== 'gemini.google.com') return;
  window.__AISB_GEMINI_FILE_UPLOAD_LOADED__ = true;

  const core = window.__AISB_GEMINI__;
  if (!core) {
    console.error('[AISB FileUpload] 缺少 gemini-common.js。');
    return;
  }

  const DRAG_IDLE_MS = 200;
  const HIGHLIGHT_CLASS = 'aisb-file-upload-highlight';
  const STATUS_ID = 'aisb-file-upload-status';
  const DROP_ZONE_ID = 'aisb-file-drop-zone';
  const DROP_OVERLAY_ID = 'aisb-file-drop-overlay';

  const state = {
    dragging: false,
    dragIdleTimer: null,
    highlightedTarget: null,
    statusElement: null,
    lastStatusText: '',
    dropZoneElement: null,
    dropOverlayElement: null,
  };

  function ensureStyles() {
    core.dom.ensureStyle(
      'aisb-file-upload-style',
      `
      .${HIGHLIGHT_CLASS} {
        outline: 2px dashed var(--gem-sys-color-primary, #1a73e8) !important;
        outline-offset: 4px !important;
        background: rgba(26, 115, 232, 0.05) !important;
        transition: all 0.2s ease !important;
      }
      #${STATUS_ID} {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 2147483646;
        background: var(--gem-sys-color-surface-container-high, rgba(255,255,255,0.95));
        color: var(--gem-sys-color-on-surface, #1f1f1f);
        border: 1px solid var(--gem-sys-color-outline-variant, rgba(0,0,0,0.12));
        border-radius: 12px;
        padding: 16px 24px;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.2s ease;
      }
      #${STATUS_ID}.visible {
        opacity: 1;
      }
      #${STATUS_ID}.progress {
        border-color: var(--gem-sys-color-primary, #1a73e8);
        color: var(--gem-sys-color-primary, #1a73e8);
      }
      #${STATUS_ID}.success {
        border-color: var(--gem-sys-color-tertiary, #0d652d);
        color: var(--gem-sys-color-tertiary, #0d652d);
      }
      #${STATUS_ID}.warn {
        border-color: var(--gem-sys-color-error, #b3261e);
        color: var(--gem-sys-color-error, #b3261e);
      }
      #${STATUS_ID}.error {
        border-color: var(--gem-sys-color-error, #b3261e);
        color: var(--gem-sys-color-error, #b3261e);
      }
      html.dark #${STATUS_ID},
      [data-theme='dark'] #${STATUS_ID},
      [data-color-scheme='dark'] #${STATUS_ID} {
        background: rgba(30,30,30,0.95);
        color: #e3e3e3;
      }
      #${DROP_ZONE_ID} {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 2147483645;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.2s ease;
      }
      #${DROP_ZONE_ID}.active {
        opacity: 1;
        pointer-events: all;
      }
      #${DROP_OVERLAY_ID} {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(26, 115, 232, 0.08);
        border: 3px dashed var(--gem-sys-color-primary, #1a73e8);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        font-weight: 500;
        color: var(--gem-sys-color-primary, #1a73e8);
        user-select: none;
      }
      html.dark #${DROP_OVERLAY_ID},
      [data-theme='dark'] #${DROP_OVERLAY_ID},
      [data-color-scheme='dark'] #${DROP_OVERLAY_ID} {
        background: rgba(138, 180, 248, 0.12);
        border-color: #8ab4f8;
        color: #8ab4f8;
      }
      `,
    );
  }

  function getStatusElement() {
    if (!state.statusElement || !state.statusElement.isConnected) {
      let el = document.getElementById(STATUS_ID);
      if (!el) {
        el = document.createElement('div');
        el.id = STATUS_ID;
        document.body.appendChild(el);
      }
      state.statusElement = el;
    }
    return state.statusElement;
  }

  function showStatus(text, type = 'progress', opts = {}) {
    const el = getStatusElement();
    el.textContent = text;
    el.className = `visible ${type}`;
    state.lastStatusText = text;

    if (!opts.sticky && opts.duration) {
      setTimeout(() => hideStatus(0), opts.duration);
    }
  }

  function hideStatus(delay = 0) {
    const el = state.statusElement;
    if (!el) return;
    if (delay > 0) {
      setTimeout(() => {
        el.classList.remove('visible');
      }, delay);
    } else {
      el.classList.remove('visible');
    }
  }

  function getDropZoneElement() {
    if (!state.dropZoneElement || !state.dropZoneElement.isConnected) {
      let el = document.getElementById(DROP_ZONE_ID);
      if (!el) {
        el = document.createElement('div');
        el.id = DROP_ZONE_ID;
        const overlay = document.createElement('div');
        overlay.id = DROP_OVERLAY_ID;
        overlay.textContent = '拖放文件到此处上传';
        el.appendChild(overlay);
        document.body.appendChild(el);
      }
      state.dropZoneElement = el;
    }
    return state.dropZoneElement;
  }

  function showDropZone() {
    const el = getDropZoneElement();
    el.classList.add('active');
  }

  function hideDropZone() {
    const el = state.dropZoneElement;
    if (el) {
      el.classList.remove('active');
    }
  }

  function hasFilePayload(event) {
    if (!event || !event.dataTransfer) return false;
    const types = event.dataTransfer.types;
    if (!types) return false;
    return Array.from(types).includes('Files');
  }

  function getEventTargetNode(event) {
    return event && event.target instanceof Node ? event.target : null;
  }

  function inAisbArea(node) {
    if (!(node instanceof Node)) return false;
    let current = node;
    while (current && current !== document.body) {
      if (current.id && /^aisb-/.test(current.id)) return true;
      if (current.className && typeof current.className === 'string') {
        if (/aisb-|gemini-folder-|timeline-/.test(current.className)) return true;
      }
      current = current.parentElement;
    }
    return false;
  }

  function findComposerElement() {
    const candidates = [
      document.querySelector('rich-textarea'),
      document.querySelector('[contenteditable="true"]'),
      document.querySelector('textarea'),
      document.querySelector('[role="textbox"]'),
      document.querySelector('.input-area'),
      document.querySelector('.composer'),
    ];
    return candidates.find((el) => el && el.isConnected) || null;
  }

  function resolveHighlightTarget(sourceNode) {
    if (!sourceNode || !(sourceNode instanceof Node)) return null;
    let current = sourceNode;
    while (current && current !== document.body) {
      if (current.matches && current.matches('rich-textarea, [contenteditable="true"], textarea, [role="textbox"]')) {
        return current;
      }
      current = current.parentElement;
    }
    const composer = findComposerElement();
    return composer || null;
  }

  function applyHighlight(target) {
    if (state.highlightedTarget === target) return;
    clearHighlight();
    if (target && target.classList) {
      target.classList.add(HIGHLIGHT_CLASS);
      state.highlightedTarget = target;
    }
  }

  function clearHighlight() {
    if (state.highlightedTarget && state.highlightedTarget.classList) {
      state.highlightedTarget.classList.remove(HIGHLIGHT_CLASS);
    }
    state.highlightedTarget = null;
  }

  function filterByAccept(files, acceptAttr) {
    if (!acceptAttr || typeof acceptAttr !== 'string') {
      return { accepted: files, rejected: [] };
    }
    const patterns = acceptAttr.split(',').map((s) => s.trim().toLowerCase());
    const accepted = [];
    const rejected = [];
    for (const file of files) {
      const ext = file.name.includes('.') ? '.' + file.name.split('.').pop().toLowerCase() : '';
      const mime = (file.type || '').toLowerCase();
      const match = patterns.some((pat) => {
        if (pat === ext) return true;
        if (pat.endsWith('/*')) {
          const prefix = pat.slice(0, -2);
          return mime.startsWith(prefix);
        }
        return pat === mime;
      });
      if (match) {
        accepted.push(file);
      } else {
        rejected.push(file);
      }
    }
    return { accepted, rejected };
  }

  function isVisible(el) {
    if (!el || !el.isConnected) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function findNativeFileInput(root = document) {
    const candidates = Array.from(root.querySelectorAll('input[type="file"]')).filter(
      (input) => input.isConnected && !input.disabled,
    );
    if (!candidates.length) return null;

    const scoreInput = (input) => {
      let score = 0;
      if (input.multiple) score += 1;
      if (input.accept && input.accept.includes('image')) score += 1;
      if (isVisible(input)) score += 2;
      return score;
    };

    candidates.sort((a, b) => scoreInput(b) - scoreInput(a));
    return candidates[0] || null;
  }

  function dispatchFileInput(input, files) {
    if (!(input instanceof HTMLInputElement)) return false;
    if (!Array.isArray(files) || !files.length) return false;

    try {
      const dt = new DataTransfer();
      const total = files.length;
      files.forEach((file, index) => {
        dt.items.add(file);
        showStatus(`准备上传 ${index + 1}/${total}：${file.name}`, 'progress', { sticky: true });
      });
      input.files = dt.files;
      input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
      return true;
    } catch (error) {
      console.warn('[AISB FileUpload] input 上传触发失败:', error);
      return false;
    }
  }

  function dispatchSyntheticDrop(target, files) {
    if (!(target instanceof EventTarget)) return false;
    if (!Array.isArray(files) || !files.length) return false;
    try {
      const dt = new DataTransfer();
      files.forEach((file) => dt.items.add(file));
      for (const type of ['dragenter', 'dragover', 'drop']) {
        const event = new DragEvent(type, {
          bubbles: true,
          cancelable: true,
          composed: true,
          dataTransfer: dt,
        });
        target.dispatchEvent(event);
      }
      return true;
    } catch (error) {
      console.warn('[AISB FileUpload] 合成 drop 失败:', error);
      return false;
    }
  }

  async function handleDroppedFiles(rawFiles, sourceTarget) {
    const files = Array.from(rawFiles || []).filter((file) => file instanceof File);
    if (!files.length) {
      showStatus('未检测到有效文件', 'warn');
      hideStatus(1700);
      return;
    }

    const preferredRoot = resolveHighlightTarget(sourceTarget) || resolveHighlightTarget(findComposerElement());
    const input = findNativeFileInput(preferredRoot || document);

    let uploaded = false;
    let accepted = files;
    let rejected = [];

    if (input) {
      const filtered = filterByAccept(files, input.accept);
      accepted = filtered.accepted;
      rejected = filtered.rejected;
      if (accepted.length) {
        uploaded = dispatchFileInput(input, accepted);
      }
    }

    if (!uploaded) {
      const dropTarget =
        preferredRoot ||
        findComposerElement() ||
        document.querySelector('main, [role="main"]') ||
        document.body;
      uploaded = dispatchSyntheticDrop(dropTarget, files);
      accepted = files;
      rejected = [];
    }

    if (uploaded) {
      const detail = rejected.length
        ? `已提交 ${accepted.length} 个文件，跳过 ${rejected.length} 个不匹配类型文件`
        : `已提交 ${accepted.length} 个文件，等待 Gemini 上传`;
      showStatus(detail, rejected.length ? 'warn' : 'success', { duration: 3400 });
      core.utils.toast(detail, rejected.length ? 'warn' : 'success', 3200);
      return;
    }

    showStatus('上传失败：未找到 Gemini 上传入口', 'error', { duration: 4200 });
    core.utils.toast('文件上传失败：未找到 Gemini 上传入口', 'error', 4200);
  }

  function scheduleDragIdle() {
    if (state.dragIdleTimer) {
      clearTimeout(state.dragIdleTimer);
      state.dragIdleTimer = null;
    }
    state.dragIdleTimer = setTimeout(() => {
      state.dragIdleTimer = null;
      state.dragging = false;
      clearHighlight();
      hideDropZone();
      hideStatus(120);
    }, DRAG_IDLE_MS);
  }

  function enterDrag(sourceNode) {
    const target = resolveHighlightTarget(sourceNode);
    if (target) applyHighlight(target);
    state.dragging = true;
    showDropZone();
    showStatus('松开以上传文件', 'progress', { sticky: true });
  }

  function onDragEnter(event) {
    if (!hasFilePayload(event)) return;
    const node = getEventTargetNode(event);
    if (node && inAisbArea(node)) return;
    enterDrag(node);
  }

  function onDragOver(event) {
    if (!hasFilePayload(event)) return;
    const node = getEventTargetNode(event);
    if (node && inAisbArea(node)) return;

    event.preventDefault();
    event.stopPropagation();
    try {
      event.dataTransfer.dropEffect = 'copy';
    } catch (_) {}

    enterDrag(node);
    scheduleDragIdle();
  }

  function onDragLeave(event) {
    if (!state.dragging) return;
    if (event.target === document.body || event.target === document.documentElement) {
      scheduleDragIdle();
    }
  }

  function onDrop(event) {
    if (!hasFilePayload(event)) return;
    const node = getEventTargetNode(event);
    if (node && inAisbArea(node)) return;

    event.preventDefault();
    event.stopPropagation();

    if (state.dragIdleTimer) {
      clearTimeout(state.dragIdleTimer);
      state.dragIdleTimer = null;
    }

    state.dragging = false;
    clearHighlight();
    hideDropZone();
    showStatus('正在提交文件到 Gemini…', 'progress', { sticky: true });
    void handleDroppedFiles(event.dataTransfer && event.dataTransfer.files, node);
  }

  function onWindowBlur() {
    if (!state.dragging) return;
    state.dragging = false;
    clearHighlight();
    hideDropZone();
    hideStatus(0);
  }

  function bootstrap() {
    ensureStyles();

    document.addEventListener('dragenter', onDragEnter, true);
    document.addEventListener('dragover', onDragOver, true);
    document.addEventListener('dragleave', onDragLeave, true);
    document.addEventListener('drop', onDrop, true);
    window.addEventListener('blur', onWindowBlur, true);

    core.route.onChange(() => {
      state.dragging = false;
      clearHighlight();
      hideDropZone();
      hideStatus(0);
    });

    core.module.register('fileUpload', {
      uploadFiles: async (fileList) => {
        const list = Array.from(fileList || []).filter((file) => file instanceof File);
        await handleDroppedFiles(list, findComposerElement());
      },
      getLastStatus: () => state.lastStatusText,
    });
  }

  try {
    bootstrap();
  } catch (error) {
    console.error('[AISB FileUpload] 初始化失败:', error);
    core.utils.toast('文件拖放模块初始化失败，请刷新重试', 'error', 4200);
  }
})();
