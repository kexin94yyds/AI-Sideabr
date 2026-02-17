// 公共工具函数 - 减少代码冗余
// 这个文件包含了项目中重复使用的工具函数

/**
 * 通用的DOM操作工具
 */
const DOMUtils = {
  // 创建元素并设置属性
  createElement: (tag, attributes = {}, textContent = '') => {
    const element = document.createElement(tag);
    Object.assign(element, attributes);
    if (textContent) element.textContent = textContent;
    return element;
  },

  // 安全地添加事件监听器
  addEventListener: (element, event, handler, options = {}) => {
    if (element && typeof handler === 'function') {
      element.addEventListener(event, handler, options);
    }
  },

  // 批量设置样式
  setStyles: (element, styles) => {
    if (element && styles) {
      Object.assign(element.style, styles);
    }
  }
};

/**
 * 通用的存储操作工具
 */
const StorageUtils = {
  // 安全地获取存储数据
  async get(key, defaultValue = null) {
    try {
      const result = await chrome.storage.local.get([key]);
      return result[key] !== undefined ? result[key] : defaultValue;
    } catch (error) {
      console.error('Storage get error:', error);
      return defaultValue;
    }
  },

  // 安全地设置存储数据
  async set(data) {
    try {
      await chrome.storage.local.set(data);
      return true;
    } catch (error) {
      console.error('Storage set error:', error);
      return false;
    }
  },

  // 批量操作
  async batch(operations) {
    try {
      const results = await Promise.all(operations);
      return results;
    } catch (error) {
      console.error('Storage batch error:', error);
      return [];
    }
  }
};

/**
 * 通用的URL处理工具
 */
const URLUtils = {
  // 标准化URL
  normalize: (url) => {
    try {
      const urlObj = new URL(url);
      urlObj.hash = '';
      urlObj.hostname = urlObj.hostname.toLowerCase();
      return urlObj.toString();
    } catch {
      return String(url);
    }
  },

  // 提取域名
  getDomain: (url) => {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  },

  // 检查URL是否有效
  isValid: (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
};

/**
 * 通用的错误处理工具
 */
const ErrorUtils = {
  // 统一错误处理
  handle: (error, context = '') => {
    const message = error?.message || String(error);
    console.error(`[AISidebar] ${context}:`, message);
    return { error: true, message };
  },

  // 创建用户友好的错误消息
  createUserMessage: (error, fallback = '操作失败') => {
    if (error?.message?.includes('network')) return '网络连接失败，请检查网络';
    if (error?.message?.includes('permission')) return '权限不足，请检查扩展权限';
    if (error?.message?.includes('quota')) return '存储空间不足';
    return fallback;
  }
};

/**
 * 通用的调试工具
 */
const DebugUtils = {
  // 条件调试日志
  log: (condition, ...args) => {
    if (condition) {
      console.log('[AISidebar]', ...args);
    }
  },

  // 性能计时
  time: (label) => {
    console.time(`[AISidebar] ${label}`);
    return () => console.timeEnd(`[AISidebar] ${label}`);
  },

  // 内存使用检查
  checkMemory: () => {
    if (performance.memory) {
      const memory = performance.memory;
      console.log('[AISidebar] Memory:', {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + 'MB',
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024) + 'MB',
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + 'MB'
      });
    }
  }
};

/**
 * 通用的动画工具
 */
const AnimationUtils = {
  // 淡入动画
  fadeIn: (element, duration = 200) => {
    if (!element) return;
    element.style.opacity = '0';
    element.style.display = 'block';
    
    let start = null;
    const animate = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      element.style.opacity = progress;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  },

  // 淡出动画
  fadeOut: (element, duration = 200) => {
    if (!element) return;
    
    let start = null;
    const animate = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      element.style.opacity = 1 - progress;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        element.style.display = 'none';
      }
    };
    requestAnimationFrame(animate);
  }
};

/**
 * 通用的验证工具
 */
const ValidationUtils = {
  // 验证提供商配置
  validateProvider: (provider) => {
    const required = ['label', 'icon', 'baseUrl', 'iframeUrl'];
    return required.every(key => provider && provider[key]);
  },

  // 验证URL历史记录
  validateHistoryEntry: (entry) => {
    return entry && 
           typeof entry.url === 'string' && 
           URLUtils.isValid(entry.url) &&
           typeof entry.timestamp === 'number';
  }
};

// 导出所有工具
window.AISidebarUtils = {
  DOMUtils,
  StorageUtils,
  URLUtils,
  ErrorUtils,
  DebugUtils,
  AnimationUtils,
  ValidationUtils
};
