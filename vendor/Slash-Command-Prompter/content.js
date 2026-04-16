// 创建菜单元素
let menu = null;
let activeInput = null;
let promptsData = [];
let allPromptsData = []; // 存储所有提示词
let currentMode = { id: 'default', name: 'Mode' }; // 当前选中的模式
let selectedIndex = -1; // 当前选中的项目索引
let isMenuActive = false; // 跟踪菜单是否激活
let isRecentPaste = false; // 跟踪是否刚刚粘贴了内容
let lastInputTime = 0; // 上次输入的时间
const PASTE_COOLDOWN = 1000; // 粘贴后的冷却时间（毫秒）
let isMenuOpening = false; // 菜单是否正在显示过程中（用于处理Enter竞态）
let lastSelectionRange = null; // 记录富文本编辑器内最近的光标选区
let pendingEnterConfirm = false; // 在菜单加载期间按下回车时的延迟确认
let lastShowMenuAt = 0; // 最近一次 showMenu 的时间，用于抖动去重

// 加载提示词数据和当前模式
function loadPrompts() {
  chrome.storage.local.get(['prompts', 'currentMode'], (result) => {
    // 保存所有提示词
    allPromptsData = result.prompts || [];
    
    // 获取当前模式
    currentMode = result.currentMode || { id: 'default', name: 'Mode' };
    
    // 根据当前模式过滤提示词
    promptsData = allPromptsData.filter(p => (p.modeId || 'default') === currentMode.id);
    
    if (allPromptsData.length === 0) {
      chrome.storage.local.set({ prompts: [] });
    }
  });
}

// 创建提示词菜单
function createMenu() {
  if (menu) {
    return menu;
  }

  menu = document.createElement('div');
  menu.className = 'slash-prompt-menu';
  menu.style.cssText = `
    position: absolute;
    width: 300px;
    max-height: 240px; /* 限制最大高度，对应约6个菜单项 */
    background-color: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    z-index: 999999;
    display: none;
    font-family: Arial, sans-serif;
    font-size: 14px;
    overflow-y: auto; /* 添加垂直滚动条 */
    overflow-x: hidden;
    scrollbar-width: thin; /* Firefox 样式 */
    scrollbar-color: #bbb #f5f5f5; /* Firefox 滚动条颜色 */
    scroll-behavior: smooth; /* 添加平滑滚动效果 */
  `;
  
  // 添加WebKit滚动条样式
  const style = document.createElement('style');
  style.textContent = `
    .slash-prompt-menu::-webkit-scrollbar {
      width: 8px; /* 稍微加宽滚动条 */
    }
    .slash-prompt-menu::-webkit-scrollbar-track {
      background: #f5f5f5;
      border-radius: 4px;
    }
    .slash-prompt-menu::-webkit-scrollbar-thumb {
      background: #bbb;
      border-radius: 4px;
      border: 2px solid #f5f5f5; /* 添加边框使滚动条更美观 */
    }
    .slash-prompt-menu::-webkit-scrollbar-thumb:hover {
      background: #999;
    }
    .slash-prompt-item {
      transition: background-color 0.15s ease; /* 添加过渡效果 */
    }
  `;
  document.head.appendChild(style);
  
  // 添加更好的滚动体验
  menu.addEventListener('wheel', (e) => {
    // 阻止默认滚动行为
    e.preventDefault();
    
    // 自定义滚动距离，使滚动更流畅
    const scrollAmount = e.deltaY * 2.7; // 调整滚动速度为2.7，实现更快速的滚动
    menu.scrollTop += scrollAmount;
    
    // 添加短暂的滚动动画效果，增强视觉反馈
    menu.style.scrollBehavior = 'smooth';
    setTimeout(() => {
      menu.style.scrollBehavior = 'auto';
    }, 100);
  }, { passive: false });
  
  document.body.appendChild(menu);
  return menu;
}

// 复制文本到剪贴板
function copyToClipboard(text) {
  navigator.clipboard.writeText(text)
    .then(() => {
      // 显示复制成功的提示
      const toast = document.createElement('div');
      toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 8px 16px;
        background-color: #333;
        color: white;
        border-radius: 4px;
        z-index: 10001;
        font-family: Arial, sans-serif;
        font-size: 14px;
      `;
      toast.textContent = '已复制到剪贴板';
      document.body.appendChild(toast);
      
      // 2秒后移除提示
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 2000);
    })
    .catch(err => {
      console.error('复制失败:', err);
    });
}

// 更新菜单显示
function updateMenuDisplay() {
  if (!menu || promptsData.length === 0) return;
  
  // 清空菜单内容
  menu.innerHTML = '';
  
  // 记住之前的滚动位置
  const scrollTop = menu.scrollTop || 0;
  
  // 我们现在显示所有提示词，而不是限制数量，因为有了滚动条
  for (let i = 0; i < promptsData.length; i++) {
    const prompt = promptsData[i];
    
    const item = document.createElement('div');
    item.className = 'slash-prompt-item';
    item.dataset.index = i;
    item.style.cssText = `
      padding: 10px 12px; /* 增加内边距使条目更易点击 */
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #eee;
      background-color: ${i === selectedIndex ? '#f0f7ff' : 'transparent'};
      cursor: pointer;
    `;
    
    // 提示词信息区域
    const infoDiv = document.createElement('div');
    infoDiv.className = 'prompt-info';
    infoDiv.style.cssText = `
      flex-grow: 1;
      font-weight: bold;
    `;
    infoDiv.textContent = prompt.name;
    
    // 复制按钮
    const copyButton = document.createElement('button');
    copyButton.textContent = '复制';
    copyButton.style.cssText = `
      background-color: #1a73e8;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 5px 10px; /* 增加按钮大小 */
      cursor: pointer;
      font-size: 12px;
      margin-right: 10px;
      transition: background-color 0.2s; /* 添加过渡效果 */
    `;
    
    // 添加悬停效果
    copyButton.addEventListener('mouseenter', () => {
      copyButton.style.backgroundColor = '#0d5bbd';
    });
    
    copyButton.addEventListener('mouseleave', () => {
      copyButton.style.backgroundColor = '#1a73e8';
    });
    
    // 整个菜单项的点击事件
    item.addEventListener('click', function(e) {
      // 先选中该项
      selectItem(parseInt(this.dataset.index));
      // 执行插入操作
      if (confirmSelection()) {
        // 确保点击后隐藏菜单
        hideMenu();
      }
    });
    
    // 添加鼠标悬停事件
    item.addEventListener('mouseenter', () => {
      selectItem(i);
    });
    
    // 复制按钮点击事件
    copyButton.addEventListener('click', (e) => {
      e.stopPropagation(); // 防止触发item的点击事件
      copyToClipboard(prompt.content);
      hideMenu();
    });
    
    // 添加双击事件，使用户可以双击直接插入
    item.addEventListener('dblclick', (e) => {
      selectItem(parseInt(item.dataset.index));
      confirmSelection();
    });
    
    // 组装DOM结构
    item.appendChild(infoDiv);
    item.appendChild(copyButton);
    menu.appendChild(item);
  }
  
  // 恢复滚动位置
  menu.scrollTop = scrollTop;
}

// 显示菜单
function showMenu(input) {
  if (!menu) {
    menu = createMenu();
  }
  // 抖动去重：短时间内避免重复打开同一个菜单
  const now = Date.now();
  if (isMenuActive && (now - lastShowMenuAt) < 120) {
    return;
  }
  
  // 检查当前网站
  const isPerplexity = window.location.href.includes('perplexity.ai');
  const isChatGPT = window.location.href.includes('chatgpt.com');
  
  // 重新加载当前模式的提示词
  loadPrompts();

  // 进入菜单打开阶段，提前标记，降低回车竞态导致的丢失
  isMenuOpening = true;
  // 提前设置默认选中，允许用户快速按Enter
  if (selectedIndex < 0) selectedIndex = 0;
  isMenuActive = true;
  lastShowMenuAt = now;

  // 记录当前富文本编辑器的选区，便于点击菜单后恢复
  try {
    const editorRoot = resolveEditorRoot(input);
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const r = sel.getRangeAt(0);
      if (editorRoot && editorRoot.contains(r.startContainer)) {
        lastSelectionRange = r.cloneRange();
      }
    }
  } catch (_) {}

  // 等待加载完成后再显示
  setTimeout(() => {
    // 确保有默认选项
    if (selectedIndex < 0) selectedIndex = 0;

    // 更新菜单显示
    updateMenuDisplay();
    
    // 定位菜单到斜杠位置
    positionMenu(input);

    // 对于Perplexity和ChatGPT使用不同的显示策略  
    if (isPerplexity || isChatGPT) {
      // 确保菜单被添加到DOM
      if (!document.body.contains(menu)) {
        document.body.appendChild(menu);
      }
      
      // 显示菜单
      menu.style.display = 'block';
      menu.style.zIndex = '999999'; // 使用极高的z-index确保可见
      
      // 尝试多次显示以确保不被其他元素覆盖
      let showAttempts = 0;
      const ensureVisible = () => {
        // 如果菜单在这段时间被关闭，不再强制显示
        if (!isMenuActive || menu.style.display === 'none') return;
        if (showAttempts < 5) {
          menu.style.display = 'block';
          // 确保菜单处于最顶层
          document.body.appendChild(menu);
          showAttempts++;
          setTimeout(ensureVisible, 100);
        }
      };
      ensureVisible();
    } else {
      // 标准显示逻辑
      menu.style.display = 'block';
    }
    
    isMenuActive = true;
    isMenuOpening = false;

    // 如果期间有回车确认请求，优先执行一次
    if (pendingEnterConfirm) {
      pendingEnterConfirm = false;
      if (promptsData.length > 0 && (selectedIndex < 0 || selectedIndex >= promptsData.length)) {
        selectedIndex = 0;
      }
      // 直接尝试确认选择
      confirmSelection();
    }
    
    // 阻止输入字段的默认自动完成
    if (input.autocomplete) {
      input.dataset.originalAutocomplete = input.autocomplete;
      input.autocomplete = 'off';
    }
  }, 100); // 给Chrome storage一些时间来加载数据
}

// 选中菜单项
function selectItem(index) {
  // 确保索引在有效范围内
  if (index < 0 || index >= promptsData.length) {
    return;
  }
  
  // 更新选中索引
  selectedIndex = index;
  
  // 确保选中项可见（滚动到视图）
  setTimeout(() => {
    const selectedItem = menu.querySelector(`[data-index="${index}"]`);
    if (selectedItem) {
      // 使用block: 'nearest'让滚动更自然
      selectedItem.scrollIntoView({ 
        block: 'nearest', 
        behavior: 'auto'
      });
      
      // 高亮显示选中项
      document.querySelectorAll('.slash-prompt-item').forEach(item => {
        if (parseInt(item.dataset.index) === index) {
          item.style.backgroundColor = '#f0f7ff';
        } else {
          item.style.backgroundColor = 'transparent';
        }
      });
    }
  }, 0);
}

// 向上移动选择
function selectPrevious() {
  if (selectedIndex > 0) {
    selectItem(selectedIndex - 1);
  } else {
    // 循环到最后一项
    selectItem(promptsData.length - 1);
  }
}

// 向下移动选择
function selectNext() {
  if (selectedIndex < promptsData.length - 1) {
    selectItem(selectedIndex + 1);
  } else {
    // 循环到第一项
    selectItem(0);
  }
}

// 确认选择
function confirmSelection() {
  // 确保菜单处于激活或即将显示状态，并且有选中的项目
  if (((!menu || menu.style.display === 'none') && !isMenuActive && !isMenuOpening) || selectedIndex < 0) {
    return false;
  }
  
  // 确保选中索引在有效范围内
  if (selectedIndex >= promptsData.length) {
    return false;
  }
  
  // 确保有活动的输入框
  if (!activeInput || !document.contains(activeInput)) {
    // 尝试回退查找当前编辑器
    activeInput = getActiveEditableFallback();
    if (!activeInput) {
      return false;
    }
  }
  
  // 插入选中的提示词
  insertPrompt(activeInput, promptsData[selectedIndex].content);
  return true;
}

// 判断元素是否为可编辑输入/编辑器
function isEditableElement(el) {
  if (!el || !(el instanceof Element)) return false;
  if (el.tagName === 'TEXTAREA') return true;
  if (el.tagName === 'INPUT' && (el.type === 'text' || el.type === 'search' || el.type === 'email' || el.type === 'url')) return true;
  if (el.isContentEditable) return true;
  if (el.getAttribute && (el.getAttribute('role') === 'textbox')) return true;
  if (el.classList && (el.classList.contains('ProseMirror') || el.classList.contains('ql-editor'))) return true;
  if (typeof el.matches === 'function' && el.matches('[data-slate-editor], [data-slate-editor="true"]')) return true;
  return false;
}

// 解析并返回富文本编辑器的根节点（如Slate/ProseMirror）
function resolveEditorRoot(el) {
  if (!el || !(el instanceof Element)) return el;
  const slateRoot = el.closest && (el.closest('[data-slate-editor]') || el.closest('[data-slate-editor="true"]'));
  if (slateRoot) return slateRoot;
  return el;
}

// 返回实际可编辑的叶节点（contenteditable=true 的元素）
function getEditableLeaf(el) {
  if (!el || !(el instanceof Element)) return el;
  if (el.isContentEditable) return el;
  try {
    const leaf = el.querySelector('[contenteditable="true"]');
    return leaf || el;
  } catch (_) {
    return el;
  }
}

// 将光标放置于元素文本末尾
function placeCursorAtEnd(el) {
  try {
    const sel = window.getSelection();
    if (!sel) return;
    const range = document.createRange();
    let node = el;
    // 找到最后一个文本节点
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
    let last = null, n;
    while ((n = walker.nextNode())) last = n;
    if (last) {
      range.setStart(last, last.textContent ? last.textContent.length : 0);
    } else {
      range.setStart(el, el.childNodes ? el.childNodes.length : 0);
    }
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  } catch (_) {}
}

// 触发 beforeinput:insertText（供 Slate/Perplexity 使用）
function dispatchBeforeInputInsert(el, text) {
  try {
    const evt = new InputEvent('beforeinput', {
      inputType: 'insertText',
      data: text,
      bubbles: true,
      cancelable: true,
      composed: true
    });
    el.dispatchEvent(evt);
  } catch (_) {}
}

// 回退查找当前活动编辑器（用于Perplexity等场景）
function getActiveEditableFallback() {
  let el = document.activeElement;
  if (isEditableElement(el)) return resolveEditorRoot(el);
  // 尝试查找页面中最有可能的编辑器
  const candidates = [
    '[data-slate-editor]','[data-slate-editor="true"]','[contenteditable="true"]','[role="textbox"]',
    '.ProseMirror','.ql-editor','textarea','input[type="text"]','input[type="search"]'
  ];
  for (const sel of candidates) {
    try {
      const found = document.querySelector(sel);
      if (found) return resolveEditorRoot(found);
    } catch (_) {}
  }
  return null;
}

// 定位菜单
function positionMenu(input) {
  const inputRect = input.getBoundingClientRect();
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  
  // 菜单高度固定为240px（在createMenu中设置的max-height）
  const menuHeight = 240;
  
  // 获取菜单宽度，默认为300px
  const menuWidth = 300;
  
  // 检查当前网站
  const isPerplexity = window.location.href.includes('perplexity.ai');
  
  // 检查是否是ChatGPT的特殊输入框
  const isChatGPTInput = input.getAttribute('role') === 'textbox' || 
                         input.classList.contains('ProseMirror') || 
                         input.classList.contains('text-input') || // 新版ChatGPT可能使用的类
                         input.hasAttribute('data-id') || // 新版ChatGPT可能使用的属性
                         (input.parentElement && input.parentElement.classList.contains('text-input-container')); // 新版ChatGPT父元素类
  
  let slashPosition = inputRect.left; // 默认位置
  let slashTop = inputRect.top; // 默认顶部位置
  
  // 确定斜杠位置
  if (isPerplexity) {
    // Perplexity特殊处理
    console.log("Perplexity特殊菜单定位");
    
    // 固定定位到输入框的正上方，无需计算斜杠位置
    slashPosition = inputRect.left + 10; // 稍微偏移，避免完全贴边
    
    // 设置菜单位置，确保始终可见
    menu.style.left = (slashPosition + scrollLeft) + 'px';
    menu.style.top = (inputRect.top + scrollTop - menuHeight - 10) + 'px';
    menu.style.zIndex = '99999'; // 确保最高层级
    
    // 修复Perplexity上的特殊渲染问题
    setTimeout(() => {
      document.body.appendChild(menu); // 重新添加到DOM
      menu.style.display = 'block';
      console.log("强制显示菜单");
    }, 10);
    
    return; // 跳过后续处理
  } else if (isChatGPTInput) {
    // ChatGPT特殊处理 - 获取当前光标位置
    try {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        // 查找斜杠位置
        let textContent = range.startContainer.textContent || '';
        let slashPos = -1;
        
        // 从当前光标位置向前查找斜杠
        for (let i = range.startOffset - 1; i >= 0; i--) {
          if (textContent[i] === '/') {
            slashPos = i;
            break;
          }
        }
        
        if (slashPos >= 0) {
          // 创建一个临时范围来获取斜杠位置
          const tempRange = document.createRange();
          tempRange.setStart(range.startContainer, slashPos);
          tempRange.setEnd(range.startContainer, slashPos + 1);
          const slashRect = tempRange.getBoundingClientRect();
          
          if (slashRect.left > 0) {
            slashPosition = slashRect.left;
            slashTop = slashRect.top;
          }
        }
      }
    } catch (e) {
      console.error('获取ChatGPT光标位置时出错:', e);
    }
  } else {
    // 标准输入框 - 计算光标位置
    if (typeof input.selectionStart === 'number') {
      // 寻找最近的斜杠位置
      const cursorPosition = input.selectionStart;
      const inputValue = input.value || '';
      let slashPos = -1;
      
      // 从当前光标位置向前查找斜杠
      for (let i = cursorPosition - 1; i >= 0; i--) {
        if (inputValue[i] === '/') {
          slashPos = i;
          break;
        }
      }
      
      if (slashPos >= 0) {
        // 计算斜杠位置的X坐标
        const textBeforeSlash = inputValue.substring(0, slashPos);
        const slashOffset = getTextWidth(textBeforeSlash, input);
        slashPosition = inputRect.left + slashOffset;
      }
    }
  }
  
  // 设置菜单位置，放在斜杠的正上方，增加偏移量确保不挡住斜杠
  const verticalOffset = 10; // 输入框上方的间距，确保不挡住斜杠
  menu.style.left = (slashPosition + scrollLeft) + 'px';
  menu.style.top = (slashTop + scrollTop - menuHeight - verticalOffset) + 'px';
  
  // 确保菜单不超出屏幕
  setTimeout(() => {
    const menuRect = menu.getBoundingClientRect();
    
    // 处理水平方向溢出
    if (menuRect.right > window.innerWidth) {
      menu.style.left = (window.innerWidth - menuRect.width - 10 + scrollLeft) + 'px';
    }
    if (menuRect.left < 0) {
      menu.style.left = (scrollLeft + 10) + 'px';
    }
    
    // 如果菜单会超出屏幕顶部，则调整到输入框下方
    if (menuRect.top < 0) {
      if (isChatGPTInput) {
        // ChatGPT输入框特殊处理 - 放在输入框上方更远的位置或下方
        const spaceAbove = slashTop;
        const spaceBelow = window.innerHeight - (slashTop + 20);
        
        if (spaceBelow > menuHeight + 10) {
          // 如果下方空间充足，放在下方
          menu.style.top = (slashTop + scrollTop + 20) + 'px';
        } else if (spaceAbove > menuHeight + 50) {
          // 如果上方空间更大，放在更上方
          menu.style.top = (slashTop + scrollTop - menuHeight - 50) + 'px';
        } else {
          // 如果都不够，尽量放在视窗中间
          menu.style.top = (scrollTop + Math.max(50, window.innerHeight / 2 - menuHeight / 2)) + 'px';
        }
      } else {
        // 标准输入框处理
        menu.style.top = (slashTop + scrollTop + 20) + 'px'; // 放到下方
      }
    }
  }, 0);
}

// 获取文本宽度的辅助函数
function getTextWidth(text, element) {
  const canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement("canvas"));
  const context = canvas.getContext("2d");
  const style = window.getComputedStyle(element);
  
  context.font = style.font;
  return context.measureText(text).width;
}

// 隐藏菜单
function hideMenu() {
  if (menu) {
    menu.style.display = 'none';
    isMenuActive = false;
    isMenuOpening = false;
    pendingEnterConfirm = false;
    selectedIndex = -1;
    
    // 隐藏背景(如果有)
    const backdrop = document.getElementById('slash-prompt-backdrop');
    if (backdrop) {
      backdrop.style.display = 'none';
    }
    
    // 恢复输入字段的原始自动完成设置
    if (activeInput && activeInput.dataset.originalAutocomplete) {
      activeInput.autocomplete = activeInput.dataset.originalAutocomplete;
      delete activeInput.dataset.originalAutocomplete;
    }
  }
}

/**
 * 在 ChatGPT 富文本或普通输入框里插入提示词
 * @param {HTMLElement} input  当前活动的输入框（ProseMirror 节点或 textarea/input）
 * @param {string} content    要插入的提示词
 */
function insertPrompt(input, content) {
  // 添加空格的提示词内容
  const contentWithSpace = content + ' ';
  
  // 将“富文本”统一识别：ChatGPT/Perplexity/通用 contenteditable/富文本编辑器
  const editorRoot = resolveEditorRoot(input);
  const isRichTextInput = (
    editorRoot.isContentEditable === true ||
    editorRoot.getAttribute('contenteditable') === 'true' ||
    editorRoot.getAttribute('role') === 'textbox' ||
    editorRoot.classList.contains('ProseMirror') ||
    editorRoot.classList.contains('ql-editor') ||
    // Slate (Perplexity) 容器
    !!(typeof editorRoot.closest === 'function' && editorRoot.closest('[data-slate-editor]'))
  );

  if (isRichTextInput) {
    // —— 富文本分支（包含Perplexity与ChatGPT）——
    const editable = getEditableLeaf(editorRoot);
    editable.focus();

    const sel = window.getSelection();
    // 优先恢复之前的选区（点击菜单后焦点丢失的情况）
    try {
      if (lastSelectionRange && editable.contains(lastSelectionRange.startContainer)) {
        sel.removeAllRanges();
        sel.addRange(lastSelectionRange);
      } else {
        // 如果没有记录，退化为把光标移到末尾
        placeCursorAtEnd(editable);
      }
    } catch (_) {}

    if (!sel || !sel.rangeCount) {
      // 无法获取选区则直接插入到末尾
      try {
        // 优先触发 beforeinput，让编辑器自行接管
        dispatchBeforeInputInsert(editable, contentWithSpace);
        document.execCommand('insertText', false, contentWithSpace);
      } catch (_) {}
      // 触发输入事件
      editable.dispatchEvent(new Event('input', { bubbles: true }));
      setTimeout(hideMenu, 10);
      return;
    }

    let range = sel.getRangeAt(0);

    // 尝试将选区扩展到光标前一个字符（如果是'/'则替换它）
    const expandSelectionToSlash = () => {
      let container = range.startContainer;
      let offset = range.startOffset;

      // 如果当前容器不是文本节点，尝试找到离光标最近的文本节点
      if (container.nodeType !== Node.TEXT_NODE) {
        const walker = document.createTreeWalker(
          editable,
          NodeFilter.SHOW_TEXT,
          null,
          false
        );
        let node, prev = null;
        while ((node = walker.nextNode())) {
          if (node === range.startContainer) break;
          prev = node;
        }
        if (prev) {
          container = prev;
          offset = container.textContent ? container.textContent.length : 0;
        }
      }

      if (container.nodeType === Node.TEXT_NODE) {
        const text = container.textContent || '';
        const prevIndex = Math.max(0, Math.min(offset - 1, text.length - 1));
        if (text[prevIndex] === '/') {
          const slashRange = document.createRange();
          slashRange.setStart(container, prevIndex);
          slashRange.setEnd(container, prevIndex + 1);
          sel.removeAllRanges();
          sel.addRange(slashRange);
          return true;
        }
      }

      // 跨节点情况：在整个输入区域内查找离光标最近的斜杠
      try {
        const walker = document.createTreeWalker(
      editable,
          NodeFilter.SHOW_TEXT,
          null,
          false
        );
        let node, lastTextBeforeCaret = null, passedCaret = false;
        while ((node = walker.nextNode())) {
          if (node === range.startContainer) {
            passedCaret = true;
            // 在当前文本节点内，检查光标前字符
            const t = node.textContent || '';
            const idx = Math.max(0, Math.min(range.startOffset - 1, t.length - 1));
            if (t[idx] === '/') {
              const slashRange = document.createRange();
              slashRange.setStart(node, idx);
              slashRange.setEnd(node, idx + 1);
              sel.removeAllRanges();
              sel.addRange(slashRange);
              return true;
            }
          } else if (!passedCaret) {
            lastTextBeforeCaret = node;
          } else {
            break;
          }
        }
        if (lastTextBeforeCaret) {
          const t = lastTextBeforeCaret.textContent || '';
          if (t.endsWith('/')) {
            const slashRange = document.createRange();
            slashRange.setStart(lastTextBeforeCaret, t.length - 1);
            slashRange.setEnd(lastTextBeforeCaret, t.length);
            sel.removeAllRanges();
            sel.addRange(slashRange);
            return true;
          }
        }
      } catch (_) {}
      return false;
    };

    // 若能选中斜杠则替换，否则直接插入
    expandSelectionToSlash();
    try {
      // 先试着让编辑器通过 beforeinput 接收
      dispatchBeforeInputInsert(editable, contentWithSpace);
      document.execCommand('insertText', false, contentWithSpace);
    } catch (_) {
      // Fallback: 直接把文本节点插入到当前选区
      const textNode = document.createTextNode(contentWithSpace);
      range.deleteContents();
      range.insertNode(textNode);
      // 移动光标到插入内容之后
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      sel.removeAllRanges();
      sel.addRange(range);
    }

    // 保持焦点并触发输入事件（Slate/Perplexity 依赖这一步）
    setTimeout(() => {
      editable.focus();
      editable.dispatchEvent(new Event('input', { bubbles: true }));
      // 清理一次已使用的记录选区
      lastSelectionRange = null;
    }, 0);

  } else {
    // —— 普通 input / textarea 分支 ——
    const start = input.selectionStart;
    const val = input.value;

    // 找到光标前最后一个斜杠
    const pos = val.lastIndexOf('/', start - 1);
    if (pos >= 0) {
      // 用提示词替换那个斜杠（包含空格）
      input.value = val.slice(0, pos) + contentWithSpace + val.slice(pos + 1);
      // 光标移到内容末尾（包含空格的位置）
      const newPos = pos + contentWithSpace.length;
      input.setSelectionRange(newPos, newPos);
    } else {
      // 如果没找到斜杠，就直接在光标处插入（包含空格）
      input.setRangeText(contentWithSpace, start, start, 'end');
    }

    // 确保输入框保持焦点
    input.focus();

    // 通知页面内容已更新
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // 最后隐藏菜单 - 延迟一点执行，防止隐藏菜单导致光标丢失
  setTimeout(() => {
    hideMenu();
  }, 10);
}

// 监听输入事件
function handleInput(e) {
  const input = e.target;
  
  // 检查是否是问号键输入 (shift+/)
  if (e.inputType === 'insertText' && e.data === '?') {
    // 如果菜单是显示状态，隐藏菜单并允许问号输入
    if (isMenuActive) {
      hideMenu();
    }
    return; // 允许问号正常输入
  }
  
  // 检查是否是粘贴行为或其他批量输入
  if (e.inputType === 'insertFromPaste' || 
      e.inputType === 'insertFromDrop' || 
      e.inputType === 'insertCompositionText' ||
      e.inputType === 'insertFromYank') {
    isRecentPaste = true;
    lastInputTime = Date.now();
    hideMenu(); // 粘贴时隐藏菜单
    return;
  }
  
  // 如果是最近粘贴后的操作，完全忽略
  if (isRecentPaste && Date.now() - lastInputTime < PASTE_COOLDOWN) {
    return;
  }
  
  // 只处理真正的单字符文本输入，且必须是斜杠
  if (e.inputType === 'insertText' && e.data === '/' && !e.isComposing) {
    activeInput = input;
    showMenu(input);
    
    // 阻止浏览器的默认自动完成弹出
    e.stopPropagation();
  } else if (isMenuActive) {
    // 如果菜单已显示，检查文本中是否还有斜杠
    const text = input.value || input.textContent || input.innerText || '';
    if (!text.includes('/')) {
      hideMenu();
    }
  }
}

// 检查和监听ChatGPT输入框
function monitorChatGPTInputs() {
  // 检测当前网站
  const isPerplexity = window.location.href.includes('perplexity.ai');
  const isChatGPT = window.location.href.includes('chatgpt.com');
  
  // 检测浏览器
  const isEdge = navigator.userAgent.includes('Edg');
  
  // 可能的选择器列表
  let selectors = [
    '[role="textbox"]',
    '.ProseMirror',
    '[data-slate-editor="true"]',
    '[contenteditable="true"]',
    '.ql-editor',
    'div[aria-label*="query"]', 
    'div[aria-label*="message"]', 
    'div[aria-label*="prompt"]',
    // 添加新版ChatGPT可能使用的选择器
    '.text-input',
    '[data-id]',
    '.text-input-container > *',
    '[placeholder]',
    'div.relative > [contenteditable]',
    'form div[class*="textbox"]',
    '#prompt-textarea'
  ];
  
  // Perplexity特殊选择器
  if (isPerplexity) {
    // 添加更多Perplexity特定的选择器
    selectors = selectors.concat([
      'div.relative[data-slate-editor="true"]',
      '[data-slate-node="element"]',
      '[contenteditable="true"]',
      '.slate-editor',
      'div[placeholder*="Ask"]',
      'div[class*="editor"]',
      'div[class*="input"]',
      // 尝试捕获任何可编辑区域
      '*:not(input):not(select):not(textarea)[contenteditable]'
    ]);
  }
  
  // 查找所有可能的输入框
  const possibleInputs = [];
  selectors.forEach(selector => {
    try {
      document.querySelectorAll(selector).forEach(el => possibleInputs.push(el));
    } catch (e) {
      console.error("选择器错误:", selector, e);
    }
  });
  
  // 去重
  const uniqueInputs = Array.from(new Set(possibleInputs));
  
  uniqueInputs.forEach(input => {
    if (!input.dataset.slashPromptEnabled) {
      input.dataset.slashPromptEnabled = 'true';
      
      // 添加全局粘贴事件监听器
      input.addEventListener('paste', () => {
        isRecentPaste = true;
        lastInputTime = Date.now();
        hideMenu(); // 粘贴时隐藏菜单
      });
      
      // 1. 输入事件监听 - 只监听真正的斜杠字符输入
      input.addEventListener('input', (e) => {
        // 首先标记当前活动输入框
        activeInput = input;
        
        // 检查问号输入
        if (e.inputType === 'insertText' && e.data === '?') {
          if (isMenuActive) {
            hideMenu();
          }
          return;
        }
        
        // 检查是否是粘贴操作或拖放操作
        if (e.inputType === 'insertFromPaste' || 
            e.inputType === 'insertFromDrop' || 
            e.inputType === 'insertCompositionText' ||
            e.inputType === 'insertFromYank') {
          isRecentPaste = true;
          lastInputTime = Date.now();
          hideMenu(); // 粘贴时隐藏菜单
          return;
        }
        
        // 如果是最近粘贴后的操作，完全忽略
        if (isRecentPaste && Date.now() - lastInputTime < PASTE_COOLDOWN) {
          return;
        }
        
        // 只处理单个字符的真实文本输入，且必须是斜杠字符
        if (e.inputType === 'insertText' && e.data === '/' && !e.isComposing) {
          // 验证这确实是用户手动输入的斜杠
          showMenu(input);
        } else if (isMenuActive) {
          // 如果菜单已显示，检查文本中是否还有斜杠
          const text = input.value || input.textContent || input.innerText || '';
          if (!text.includes('/')) {
            hideMenu();
          }
        }
      });
      
      // 2. 键盘事件监听 - 只在按下斜杠键时记录，不直接触发菜单
      input.addEventListener('keydown', (e) => {
        // 精确匹配斜杠键，忽略问号(shift+/)
        if ((e.key === '/' && !e.shiftKey) || 
            (e.key === 'Slash' && !e.shiftKey) || 
            (e.keyCode === 191 && !e.shiftKey)) {
          // 标记当前活动输入框
          activeInput = input;
          
          // 如果粘贴状态还在冷却期，忽略
          if (isRecentPaste && Date.now() - lastInputTime < PASTE_COOLDOWN) {
            return;
          }
          
          // 不在这里显示菜单，让input事件来处理
          // 这样可以避免重复触发和粘贴冲突
        }
      });
      
      // 特殊处理：Perplexity监控 - 简化逻辑，避免误触发
      if (isPerplexity) {
        input.addEventListener('focus', () => {
          // 记录当前活动输入框
          activeInput = input;
        });
        
        // 移除粘贴后自动显示菜单的逻辑，避免误触发
        // 只依赖正常的输入检测机制
      }
      
      // 3. 使用MutationObserver监控内容变化 - 仅作为备用检测
      try {
        const observer = new MutationObserver((mutations) => {
          // 如果是最近粘贴后的操作，完全忽略
          if (isRecentPaste && Date.now() - lastInputTime < PASTE_COOLDOWN) {
            return;
          }
          
          // 只监控单字符变化，避免大量文本变化时误触发
          for (const mutation of mutations) {
            if (mutation.type === 'characterData' && mutation.oldValue) {
              const oldLength = mutation.oldValue.length;
              const newLength = mutation.target.textContent ? mutation.target.textContent.length : 0;
              const lengthDiff = Math.abs(newLength - oldLength);
              
              // 只处理单字符变化（长度差为1）
              if (lengthDiff === 1 && newLength > oldLength) {
                const text = mutation.target.textContent || '';
                // 检查最后一个字符是否是斜杠
                if (text.endsWith('/')) {
                  activeInput = input;
                  showMenu(input);
                  return;
                }
              }
            }
          }
        });
        
        observer.observe(input, { 
          characterData: true,
          subtree: true,
          characterDataOldValue: true
        });
        
        // 存储observer以便稍后清理
        input.slashPromptObserver = observer;
      } catch (e) {
        console.error("无法为输入框添加MutationObserver:", e);
      }
    }
  });
  
  // 如果在Perplexity上，添加全局按键监听 - 简化逻辑
  if (isPerplexity && !window.perplexityKeyListenerAdded) {
    window.perplexityKeyListenerAdded = true;
    
    document.addEventListener('keypress', (e) => {
      if (e.key === '/' && !e.shiftKey && e.isTrusted) {
        // 如果是粘贴冷却期内，忽略
        if (isRecentPaste && Date.now() - lastInputTime < PASTE_COOLDOWN) {
          return;
        }
        
        // 找到当前焦点元素
        const focusedElement = document.activeElement;
        if (focusedElement && focusedElement.isContentEditable) {
          activeInput = focusedElement;
          // 延迟检查，确保斜杠已经被输入
          setTimeout(() => {
            const text = focusedElement.textContent || focusedElement.innerText || '';
            if (text.endsWith('/')) {
              showMenu(focusedElement);
            }
          }, 10);
        }
      }
    }, true);
  }
  
  return uniqueInputs.length > 0;
}

// 监听点击事件（关闭菜单）
function handleDocumentClick(e) {
  if (menu && !menu.contains(e.target) && e.target !== activeInput) {
    hideMenu();
  }
}

// 监听按键事件
function handleKeyDown(e) {
  // 如果用户输入问号，允许正常输入而不触发任何菜单动作
  if (e.key === '?' || (e.key === '/' && e.shiftKey) || e.keyCode === 191 && e.shiftKey) {
    // 如果菜单已显示，则隐藏菜单
    if (isMenuActive) {
      hideMenu();
    }
    return; // 允许问号正常输入
  }

  // 如果菜单没有显示，也不是正在显示过程，则不处理按键
  if ((!menu || menu.style.display === 'none') && !isMenuActive && !isMenuOpening) {
    return;
  }
  
  // 如果菜单显示中，处理特殊按键
  switch (e.key) {
    case 'ArrowUp':
    case 'w':
    case 'W':
      selectPrevious();
      e.preventDefault();
      e.stopPropagation();
      break;
    case 'ArrowDown':
    case 's':
    case 'S':
      selectNext();
      e.preventDefault();
      e.stopPropagation();
      break;
    case 'Enter':
      // 菜单仍在打开阶段或数据未加载完，延迟一次确认
      if (isMenuOpening || promptsData.length === 0) {
        pendingEnterConfirm = true;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      // 如果还未选中任何项，则默认选中第一项
      if ((selectedIndex < 0 || selectedIndex >= promptsData.length) && promptsData.length > 0) {
        selectedIndex = 0;
      }
      if (promptsData.length > 0 && confirmSelection()) {
        e.preventDefault();
        e.stopPropagation(); // 阻止事件冒泡
      } else {
        // 如果没有可选项目，隐藏菜单但不阻止默认行为
        hideMenu();
      }
      break;
    case 'Escape':
      hideMenu();
      e.preventDefault();
      e.stopPropagation();
      break;
    case 'Tab':
      // 阻止Tab键的默认行为，避免失去焦点
      if (isMenuActive) {
        e.preventDefault();
        e.stopPropagation();
        selectNext(); // 可选：使用Tab键进行导航
      }
      break;
    case 'c':
      // 按c键复制当前选中的提示词
      if (isMenuActive && e.ctrlKey && selectedIndex >= 0 && selectedIndex < promptsData.length) {
        copyToClipboard(promptsData[selectedIndex].content);
        e.preventDefault();
        e.stopPropagation();
      }
      break;
  }
}

// 监听自动完成事件，阻止当我们的菜单激活时
function handleAutocompleteEvents(e) {
  if (isMenuActive) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
}

// 初始化
function init() {
  loadPrompts();
  createMenu();
  
  // 检测浏览器
  const isEdge = navigator.userAgent.includes('Edg');
  
  // 检测当前网站
  const isPerplexity = window.location.href.includes('perplexity.ai');
  const isChatGPT = window.location.href.includes('chatgpt.com');
  
  // 监听输入框事件
  document.addEventListener('input', (e) => {
    // 包括ChatGPT和其他网站的输入框
    if (e.target.tagName === 'TEXTAREA' || 
        (e.target.tagName === 'INPUT' && (e.target.type === 'text' || e.target.type === 'search'))) {
      handleInput(e);
    }
  }, true);
  
  // 特别为AI聊天网站添加更强的输入框监听
  let aiChatMonitoringActive = false;
  
  // 初始检查
  setTimeout(() => {
    aiChatMonitoringActive = monitorChatGPTInputs();
    
    // 设置更积极的定期检查
    const inputCheckInterval = setInterval(() => {
      const foundInputs = monitorChatGPTInputs();
      if (foundInputs) {
        aiChatMonitoringActive = true;
      }
    }, 1000); // 每秒检查一次
    
    // 特别处理Perplexity和Edge
    if (isPerplexity || isEdge) {
      // 添加文档级键盘事件监听（避免重复注册）
      if (!window.slashKeypressAdded) {
        window.slashKeypressAdded = true;
        document.addEventListener('keypress', (e) => {
          if (e.key === '/' && document.activeElement) {
            setTimeout(() => {
              if (document.activeElement) {
                activeInput = document.activeElement;
                showMenu(activeInput);
              }
            }, 10);
          }
        }, true);
      }
      
      // Perplexity网站特殊处理
      if (isPerplexity) {
        // 监控整个页面的变化，以便在交互区域出现时立即监控
        const bodyObserver = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
              setTimeout(monitorChatGPTInputs, 10);
              break;
            }
          }
        });
        
        bodyObserver.observe(document.body, { 
          childList: true, 
          subtree: true
        });
        
        // 点击后特别检查
        document.addEventListener('click', () => {
          setTimeout(monitorChatGPTInputs, 10);
        }, true);
      }
    }
    
    // 5分钟后降低检查频率
    setTimeout(() => {
      clearInterval(inputCheckInterval);
      
      // 页面可见时才进行低频率检查
      const lowFreqInterval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          monitorChatGPTInputs();
        }
      }, 5000); // 每5秒检查一次
      
      // 监听页面可见性变化，页面变为可见时立即检查
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          monitorChatGPTInputs();
        }
      });
      
      // 监听点击事件，点击后可能会出现新的输入框
      document.addEventListener('click', () => {
        setTimeout(monitorChatGPTInputs, 500);
      });
      
      // 监听DOM变化
      const bodyObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            // 有新节点添加，检查是否包含输入框
            setTimeout(monitorChatGPTInputs, 100);
            break;
          }
        }
      });
      
      bodyObserver.observe(document.body, { 
        childList: true, 
        subtree: true
      });
    }, 300000); // 5分钟后
  }, 1000);
  
  // 监听点击事件
  document.addEventListener('mousedown', handleDocumentClick);

  // 捕获焦点变更，稳定记录当前活动编辑器（修复Perplexity丢失activeInput）
  document.addEventListener('focusin', (e) => {
    const t = e.target;
    if (isEditableElement(t)) {
      activeInput = resolveEditorRoot(t);
    }
  }, true);
  
  // 监听按键事件 - 使用捕获阶段以确保我们的处理优先于其他处理程序
  document.addEventListener('keydown', handleKeyDown, true);
  
  // 监听全局的斜杠按键 - 作为备用触发方式（避免重复注册）
  if (!window.slashKeydownAdded) {
    window.slashKeydownAdded = true;
    document.addEventListener('keydown', (e) => {
      // 过滤掉问号键（Shift+/）
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        return; // 不处理问号输入
      }
      
      if ((e.key === '/' || e.key === 'Slash' || (e.keyCode === 191 && !e.shiftKey)) && document.activeElement) {
        const activeElement = document.activeElement;
        
        if (activeElement.tagName === 'TEXTAREA' || 
            activeElement.tagName === 'INPUT' ||
            activeElement.getAttribute('role') === 'textbox' ||
            activeElement.getAttribute('contenteditable') === 'true' ||
            activeElement.classList.contains('ProseMirror') ||
            activeElement.classList.contains('ql-editor') ||
            // 添加新版ChatGPT输入框识别
            activeElement.classList.contains('text-input') ||
            activeElement.hasAttribute('data-id') ||
            activeElement.hasAttribute('placeholder') ||
            activeElement.id === 'prompt-textarea' ||
            (activeElement.parentElement && activeElement.parentElement.classList.contains('text-input-container')) ||
            (activeElement.parentElement && activeElement.parentElement.classList.contains('relative'))) {
          
          // 立即标记当前活动元素
          activeInput = activeElement;
          
          // 等待字符输入后显示菜单
          setTimeout(() => {
            showMenu(activeElement);
          }, 10);
        }
      }
    }, true);
  }
  
  // 阻止可能干扰的事件
  document.addEventListener('search', handleAutocompleteEvents, true);
  document.addEventListener('autocomplete', handleAutocompleteEvents, true);
  document.addEventListener('focusout', (e) => {
    if (isMenuActive && e.target === activeInput) {
      // 延迟隐藏菜单，以防点击菜单项导致输入框失去焦点
      setTimeout(() => {
        if (!document.activeElement || !menu.contains(document.activeElement)) {
          hideMenu();
        }
      }, 100);
    }
  });
  
  // 添加样式表以防止AutoFill或其他浏览器功能
  const style = document.createElement('style');
  style.textContent = `
    input.slash-prompt-active::-webkit-calendar-picker-indicator,
    input.slash-prompt-active::-webkit-list-button,
    input.slash-prompt-active::-webkit-inner-spin-button,
    input.slash-prompt-active::-webkit-search-cancel-button,
    input.slash-prompt-active::-webkit-search-results-button,
    input.slash-prompt-active::-webkit-search-results-decoration {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
  
  // 监听存储变化事件
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.prompts || changes.currentMode) {
      // 重新加载提示词和模式
      loadPrompts();
    }
  });
  
  // 添加全局粘贴事件监听器
  document.addEventListener('paste', () => {
    isRecentPaste = true;
    lastInputTime = Date.now();
    hideMenu(); // 粘贴时隐藏菜单
  }, true);
  
  // 每隔一段时间重置粘贴状态
  setInterval(() => {
    if (isRecentPaste && Date.now() - lastInputTime > PASTE_COOLDOWN) {
      isRecentPaste = false;
    }
  }, 500);
  
  // 添加调试工具
  window.slashPromptDebug = {
    // 启用日志记录 - 在 Perplexity 默认开启，方便排查
    enableLogging: isPerplexity ? true : false,
    
    // 检查输入框
    checkInputs: monitorChatGPTInputs,
    
    // 手动显示菜单
    showMenu: () => {
      const activeElement = document.activeElement;
      if (activeElement) {
        activeInput = activeElement;
        showMenu(activeElement);
        return "已手动显示菜单";
      }
      return "没有活动输入框";
    },
    
    // 强制激活
    forceActivate: () => {
      // 查找页面上可能的输入框并强制激活
      const inputs = [
        ...document.querySelectorAll('[role="textbox"]'),
        ...document.querySelectorAll('.ProseMirror'),
        ...document.querySelectorAll('[contenteditable="true"]'),
        ...document.querySelectorAll('.ql-editor'),
        ...document.querySelectorAll('textarea'),
        ...document.querySelectorAll('input[type="text"]')
      ];
      
      if (inputs.length > 0) {
        const input = inputs[0]; // 使用第一个找到的输入框
        activeInput = input;
        showMenu(input);
        return `已强制激活 ${inputs.length} 个输入框中的第一个`;
      }
      return "找不到可激活的输入框";
    },
    
    // 记录编辑器信息
    logEditorInfo: () => {
      const editors = document.querySelectorAll('[contenteditable="true"], [role="textbox"], .ProseMirror, .ql-editor');
      console.log(`找到 ${editors.length} 个编辑器`);
      
      editors.forEach((editor, i) => {
        console.log(`编辑器 ${i+1}:`, {
          tagName: editor.tagName,
          className: editor.className,
          id: editor.id,
          role: editor.getAttribute('role'),
          contentEditable: editor.getAttribute('contenteditable'),
          textContent: (editor.textContent || '').substring(0, 20) + '...',
          value: editor.value
        });
      });
      
      return `已记录 ${editors.length} 个编辑器信息到控制台`;
    },
    
    // 切换日志
    toggleLogging: () => {
      window.slashPromptDebug.enableLogging = !window.slashPromptDebug.enableLogging;
      return `日志记录已${window.slashPromptDebug.enableLogging ? '启用' : '禁用'}`;
    }
  };
}

// 自定义日志函数，仅在调试模式启用时输出
function log(...args) {
  if (window.slashPromptDebug && window.slashPromptDebug.enableLogging) {
    console.log(...args);
  }
}

// Add toast notification functionality
function showToast(message, duration = 3000) {
  // Create toast element if it doesn't exist
  let toast = document.getElementById('slash-command-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'slash-command-toast';
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    toast.style.color = 'white';
    toast.style.padding = '8px 16px';
    toast.style.borderRadius = '4px';
    toast.style.zIndex = '10000';
    toast.style.fontSize = '14px';
    toast.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease-in-out';
    document.body.appendChild(toast);
  }

  // Set message and display toast
  toast.textContent = message;
  toast.style.opacity = '1';

  // Hide toast after duration
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toast.parentNode) {
        document.body.removeChild(toast);
      }
    }, 300);
  }, duration);
}

// 启动
init();

// 添加消息监听器，接收来自popup的插入提示词请求
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'insertPrompt' && message.content) {
    // 查找当前聚焦的输入框
    let targetInput = document.activeElement;
    
    // 检查元素是否是输入框
    const isInputElement = targetInput && (
      targetInput.tagName === 'TEXTAREA' || 
      targetInput.tagName === 'INPUT' || 
      targetInput.isContentEditable || 
      targetInput.getAttribute('role') === 'textbox' ||
      targetInput.classList.contains('ProseMirror') ||
      targetInput.classList.contains('ql-editor')
    );
    
    if (isInputElement) {
      // 将当前输入框设为活动输入框
      activeInput = targetInput;
      
      // 直接插入内容，不需要替换斜杠
      if (targetInput.isContentEditable || targetInput.getAttribute('role') === 'textbox' || targetInput.classList.contains('ProseMirror')) {
        // 富文本编辑器
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          
          // 创建文本节点并插入
          const textNode = document.createTextNode(message.content);
          range.deleteContents();
          range.insertNode(textNode);
          
          // 移动光标到插入内容之后
          range.setStartAfter(textNode);
          range.setEndAfter(textNode);
          selection.removeAllRanges();
          selection.addRange(range);
          
          // 触发输入事件
          targetInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      } else {
        // 普通输入框
        const cursorPosition = targetInput.selectionStart;
        const value = targetInput.value;
        
        // 在光标位置插入内容
        const newValue = value.substring(0, cursorPosition) + 
                         message.content + 
                         value.substring(cursorPosition);
        
        targetInput.value = newValue;
        
        // 设置光标位置
        const newPosition = cursorPosition + message.content.length;
        targetInput.selectionStart = newPosition;
        targetInput.selectionEnd = newPosition;
        
        // 触发输入事件
        targetInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      // 显示成功提示
      showToast('提示词已插入');
    } else {
      // 找不到合适的输入框，显示错误提示
      showToast('未找到活动的输入框');
    }
  }
});
