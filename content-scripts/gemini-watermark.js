(function () {
  'use strict';

  if (window.__AISB_GEMINI_WATERMARK_LOADED__) return;
  if (location.hostname !== 'gemini.google.com') return;
  window.__AISB_GEMINI_WATERMARK_LOADED__ = true;

  const core = window.__AISB_GEMINI__;
  if (!core) {
    console.error('[AISB Watermark] 缺少 gemini-common.js。');
    return;
  }

  const STYLE_ID = 'aisb-gemini-watermark-style';

  const state = {
    observer: null,
    bgCache: {
      48: null,
      96: null,
    },
    alphaCache: {
      48: null,
      96: null,
    },
  };

  function ensureStyles() {
    core.dom.ensureStyle(
      STYLE_ID,
      `
      .aisb-watermark-btn {
        position: absolute;
        top: 8px;
        right: 8px;
        z-index: 20;
        border: 1px solid rgba(229, 231, 235, 0.9);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        color: #1f2937;
        font-family: "Google Sans", Roboto, "Segoe UI", Arial, sans-serif;
        font-size: 12px;
        font-weight: 600;
        line-height: 1;
        padding: 7px 9px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
      }
      .aisb-watermark-btn:hover {
        background: rgba(0, 0, 0, 0.06);
        transform: translateY(-1px);
      }
      .aisb-watermark-btn[disabled] {
        cursor: progress;
        opacity: .68;
      }
      `,
    );
  }

  function calculateAlphaMap(bgCaptureImageData) {
    const { width, height, data } = bgCaptureImageData;
    const alphaMap = new Float32Array(width * height);

    for (let i = 0; i < alphaMap.length; i++) {
      const idx = i * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const maxChannel = Math.max(r, g, b);
      alphaMap[i] = maxChannel / 255.0;
    }

    return alphaMap;
  }

  function detectWatermarkConfig(imageWidth, imageHeight) {
    if (imageWidth > 1024 && imageHeight > 1024) {
      return {
        logoSize: 96,
        marginRight: 64,
        marginBottom: 64,
      };
    }

    return {
      logoSize: 48,
      marginRight: 32,
      marginBottom: 32,
    };
  }

  function calculateWatermarkPosition(imageWidth, imageHeight, config) {
    const { logoSize, marginRight, marginBottom } = config;

    return {
      x: imageWidth - marginRight - logoSize,
      y: imageHeight - marginBottom - logoSize,
      width: logoSize,
      height: logoSize,
    };
  }

  function removeWatermark(imageData, alphaMap, position) {
    const ALPHA_THRESHOLD = 0.002;
    const MAX_ALPHA = 0.99;
    const LOGO_VALUE = 255;

    const { x, y, width, height } = position;

    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const imgIdx = ((y + row) * imageData.width + (x + col)) * 4;
        const alphaIdx = row * width + col;

        let alpha = alphaMap[alphaIdx];
        if (alpha < ALPHA_THRESHOLD) continue;

        alpha = Math.min(alpha, MAX_ALPHA);
        const oneMinusAlpha = 1.0 - alpha;

        for (let c = 0; c < 3; c++) {
          const watermarked = imageData.data[imgIdx + c];
          const original = (watermarked - alpha * LOGO_VALUE) / oneMinusAlpha;
          imageData.data[imgIdx + c] = Math.max(0, Math.min(255, Math.round(original)));
        }
      }
    }
  }

  function replaceWithNormalSize(src) {
    return String(src || '').replace(/=s\d+(?=[-?#]|$)/, '=s0');
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = url;
    });
  }

  async function loadImageFromFetch(url) {
    const response = await fetch(url, { credentials: 'omit' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      const image = await loadImage(objectUrl);
      return image;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  async function getAlphaMap(size) {
    if (state.alphaCache[size]) {
      return state.alphaCache[size];
    }

    let bgImage = state.bgCache[size];
    if (!bgImage) {
      const filename = size === 96 ? 'bg_96.png' : 'bg_48.png';
      const path = chrome.runtime.getURL(`content-scripts/watermark-assets/${filename}`);
      bgImage = await loadImage(path);
      state.bgCache[size] = bgImage;
    }

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取 canvas 2d 上下文');

    ctx.drawImage(bgImage, 0, 0);
    const imageData = ctx.getImageData(0, 0, size, size);
    const alphaMap = calculateAlphaMap(imageData);
    state.alphaCache[size] = alphaMap;
    return alphaMap;
  }

  function canvasToBlob(canvas, type) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('canvas 导出失败'));
        },
        type || 'image/png',
        1,
      );
    });
  }

  async function removeWatermarkFromImage(image) {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取 canvas 上下文');

    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const config = detectWatermarkConfig(canvas.width, canvas.height);
    const position = calculateWatermarkPosition(canvas.width, canvas.height, config);
    const alphaMap = await getAlphaMap(config.logoSize);

    removeWatermark(imageData, alphaMap, position);
    ctx.putImageData(imageData, 0, 0);

    return canvas;
  }

  function createFilename() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `gemini-unwatermarked-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(
      d.getHours(),
    )}${pad(d.getMinutes())}${pad(d.getSeconds())}.png`;
  }

  async function processImageElement(img, button) {
    const originalSrc = img.getAttribute('src') || '';
    const fullSizeSrc = replaceWithNormalSize(originalSrc);

    button.disabled = true;
    button.textContent = '处理中...';

    try {
      let image = null;
      try {
        image = await loadImageFromFetch(fullSizeSrc);
      } catch (_) {
        image = await loadImage(fullSizeSrc);
      }

      const canvas = await removeWatermarkFromImage(image);
      const blob = await canvasToBlob(canvas, 'image/png');

      core.utils.downloadBlob(createFilename(), blob);

      // 同时替换页面预览图，便于用户继续操作无水印图。
      const previewUrl = URL.createObjectURL(blob);
      img.src = previewUrl;
      img.dataset.aisbWatermarkProcessed = '1';

      core.utils.toast('无水印图片已下载', 'success');
    } catch (error) {
      console.error('[AISB Watermark] 处理失败：', error);
      core.utils.toast('去水印失败，可能是跨域限制或图片格式不支持', 'error', 4200);
    } finally {
      button.disabled = false;
      button.textContent = '🍌 无水印下载';
    }
  }

  function findTargetImages() {
    const images = document.querySelectorAll('img[src*="googleusercontent.com"]');
    const result = [];

    images.forEach((img) => {
      if (!(img instanceof HTMLImageElement)) return;
      if (!img.isConnected) return;
      if (img.dataset.aisbWatermarkBound === '1') return;

      const inGeneratedContainer = img.closest('generated-image, .generated-image-container, figure, .image-container');
      if (!inGeneratedContainer) return;

      result.push(img);
    });

    return result;
  }

  function bindImageButton(img) {
    const container = img.closest('generated-image, .generated-image-container, figure, .image-container');
    if (!container || !(container instanceof HTMLElement)) return;

    img.dataset.aisbWatermarkBound = '1';

    const style = getComputedStyle(container).position;
    if (style === 'static') {
      container.style.position = 'relative';
    }

    if (container.querySelector('.aisb-watermark-btn')) {
      return;
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'aisb-watermark-btn';
    button.textContent = '🍌 无水印下载';
    button.title = '通过像素逆推算法去除 Gemini 水印并下载';

    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      void processImageElement(img, button);
    });

    container.appendChild(button);
  }

  function scan() {
    findTargetImages().forEach(bindImageButton);
  }

  function observeDom() {
    if (state.observer) {
      state.observer.disconnect();
      state.observer = null;
    }

    let timer = null;

    state.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && (mutation.addedNodes.length || mutation.removedNodes.length)) {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => {
            timer = null;
            scan();
          }, 120);
          break;
        }
      }
    });

    state.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  function bootstrap() {
    ensureStyles();
    scan();
    observeDom();

    core.module.register('watermark', {
      scan,
    });
  }

  bootstrap();
})();
