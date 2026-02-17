document.addEventListener('DOMContentLoaded', function() {
  // DOM元素
  const searchInput = document.getElementById('search-input');
  const promptsList = document.getElementById('prompts-list');
  const exportButton = document.getElementById('export-button');
  const importButton = document.getElementById('import-button');
  const editorView = document.getElementById('editor-view');
  const listView = document.getElementById('list-view');
  const promptEditor = document.getElementById('prompt-editor');
  const cancelButton = document.getElementById('cancel-button');
  
  // Mode相关元素
  const modeDropdown = document.getElementById('mode-dropdown');
  const modeButton = document.getElementById('mode-button');
  const modeText = document.getElementById('mode-text');
  const modeDropdownContent = document.getElementById('mode-dropdown-content');
  const addModeItem = document.getElementById('add-mode-item');
  const addModeText = document.getElementById('add-mode-text');
  
  // Mode状态
  let currentMode = { id: 'default', name: 'Mode' };
  let modes = [{ id: 'default', name: 'Mode' }];
  let isAddingMode = false;

  // Popup 键盘导航状态
  let listItems = [];
  let selectedIndex = -1;

  function updateSelection(nextIndex) {
    if (!listItems.length) {
      selectedIndex = -1;
      return;
    }
    // 环绕
    const max = listItems.length - 1;
    if (nextIndex < 0) nextIndex = max;
    if (nextIndex > max) nextIndex = 0;
    selectedIndex = nextIndex;
    listItems.forEach((el, i) => {
      if (i === selectedIndex) {
        el.classList.add('selected');
        // 确保可见
        el.scrollIntoView({ block: 'nearest' });
      } else {
        el.classList.remove('selected');
      }
    });
  }

  function collectListItems() {
    listItems = Array.from(promptsList.querySelectorAll('.prompt-item'));
    // 默认选中第一项
    selectedIndex = listItems.length ? 0 : -1;
    updateSelection(selectedIndex);
    // 鼠标悬停联动
    listItems.forEach((el, i) => {
      el.addEventListener('mouseenter', () => updateSelection(i));
    });
  }
  
  // 处理捐赠链接点击
  const donateLink = document.querySelector('.donate-container a');
  if (donateLink) {
    donateLink.addEventListener('click', function(e) {
      e.preventDefault();
      chrome.tabs.create({ url: 'donate.html' });
    });
  }
  
  // 导入对话框相关元素和变量
  let importDialog = null;
  let importTextarea = null;
  let importButton2 = null;
  let cancelImportButton = null;
  let deleteAllButton = null;

  // 初始化
  function init() {
    loadModes();
    loadPrompts();
    // 进入时聚焦搜索框，便于直接输入
    if (searchInput) {
      try { searchInput.focus(); } catch (_) {}
    }
  }

  // 加载模式
  function loadModes() {
    chrome.storage.local.get(['modes', 'currentMode'], function(data) {
      modes = data.modes || [{ id: 'default', name: 'Mode' }];
      currentMode = data.currentMode || { id: 'default', name: 'Mode' };
      updateModeDisplay();
      renderModeDropdown();
    });
  }

  // 更新模式显示
  function updateModeDisplay() {
    const displayName = currentMode.name.length > 10 
      ? currentMode.name.substring(0, 10) + '...' 
      : currentMode.name;
    modeText.textContent = displayName;
  }

  // 渲染模式下拉菜单
  function renderModeDropdown() {
    // 清空现有内容，保留Add Mode项
    modeDropdownContent.innerHTML = '';
    
    // 添加Add Mode项
    const addModeDiv = document.createElement('div');
    addModeDiv.className = 'mode-dropdown-item add-mode-item';
    addModeDiv.id = 'add-mode-item';
    addModeDiv.innerHTML = '<span id="add-mode-text">+ Add Mode</span>';
    modeDropdownContent.appendChild(addModeDiv);
    
    // 添加现有模式
    modes.forEach((mode, index) => {
      const modeDiv = document.createElement('div');
      modeDiv.className = 'mode-dropdown-item';
      modeDiv.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        position: relative;
      `;
      
      // 添加上移按钮
      const pinButton = document.createElement('div');
      pinButton.style.cssText = `
        position: absolute;
        left: 5px;
        width: 20px;
        height: 20px;
        display: none;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: #999;
        font-size: 16px;
        transition: color 0.2s;
      `;
      pinButton.innerHTML = '⬆︎';
      pinButton.addEventListener('click', function(e) {
        e.stopPropagation();
        pinMode(mode.id);
      });
      
      // 添加悬停效果
      pinButton.addEventListener('mouseenter', () => {
        pinButton.style.color = '#1890ff';
      });
      pinButton.addEventListener('mouseleave', () => {
        pinButton.style.color = '#999';
      });
      
      // 创建模式信息区域
      const modeInfo = document.createElement('div');
      modeInfo.style.cssText = `
        flex-grow: 1;
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        margin-left: 10px;
      `;
      modeInfo.innerHTML = `
        <span title="${mode.name}" style="font-size: 16px; font-weight: bold;">${mode.name.length > 10 ? mode.name.substring(0, 10) + '...' : mode.name}</span>
        ${currentMode.id === mode.id ? '<span class="selected-indicator">✓</span>' : ''}
      `;
      modeInfo.addEventListener('click', (e) => {
        e.stopPropagation();
        switchMode(mode);
      });
      
      // 创建按钮容器（对所有模式显示）
      const buttonsDiv = document.createElement('div');
      buttonsDiv.style.cssText = `
        display: flex;
        gap: 8px;
        opacity: 0;
        transition: opacity 0.2s;
      `;
      
      // 编辑按钮
      const editBtn = document.createElement('button');
      editBtn.textContent = '编辑';
      editBtn.style.cssText = `
        background-color: #4285f4;
        color: white;
        border: none;
        border-radius: 6px;
        padding: 8px 12px;
        cursor: pointer;
        font-size: 14px;
      `;
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        editMode(mode);
      });
      
      // 删除按钮
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '删除';
      deleteBtn.style.cssText = `
        background-color: #f44336;
        color: white;
        border: none;
        border-radius: 6px;
        padding: 8px 12px;
        cursor: pointer;
        font-size: 14px;
      `;
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteMode(mode);
      });
      
      buttonsDiv.appendChild(editBtn);
      buttonsDiv.appendChild(deleteBtn);
      
      // 添加悬停效果
      modeDiv.addEventListener('mouseenter', () => {
        buttonsDiv.style.opacity = '1';
        if (index > 0) { // 只有非第一个项目才显示上移按钮
          pinButton.style.display = 'flex';
        }
      });
      modeDiv.addEventListener('mouseleave', () => {
        buttonsDiv.style.opacity = '0';
        pinButton.style.display = 'none';
      });
      
      modeDiv.appendChild(pinButton);
      modeDiv.appendChild(modeInfo);
      modeDiv.appendChild(buttonsDiv);
      
      modeDropdownContent.appendChild(modeDiv);
    });
    
    // 重新绑定Add Mode事件
    const newAddModeItem = document.getElementById('add-mode-item');
    if (newAddModeItem) {
      newAddModeItem.addEventListener('click', handleAddModeClick);
    }
  }

  // 加载和显示提示词
  function loadPrompts() {
    chrome.storage.local.get('prompts', function(data) {
      const prompts = data.prompts || [];
      const filteredPrompts = prompts.filter(p => (p.modeId || 'default') === currentMode.id);
      displayPrompts(filteredPrompts);
    });
  }

  // 显示提示词列表
  function displayPrompts(prompts, searchTerm = '') {
    promptsList.innerHTML = '';
    
    const filteredPrompts = searchTerm 
      ? prompts.filter(p => 
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
          p.content.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : prompts;
    
    filteredPrompts.forEach(function(prompt, index) {
      const promptItem = document.createElement('div');
      promptItem.className = 'prompt-item';
      promptItem.dataset.index = String(index);
      promptItem.dataset.content = prompt.content;
      
      // 添加上移按钮
      const pinButton = document.createElement('div');
      pinButton.className = 'pinned-button';
      pinButton.innerHTML = '⬆︎';
      pinButton.addEventListener('click', function(e) {
        e.stopPropagation();
        pinPrompt(prompt.id);
      });
      
      const promptInfo = document.createElement('div');
      promptInfo.className = 'prompt-info';
      promptInfo.style.cursor = 'pointer';
      
      const promptName = document.createElement('div');
      promptName.className = 'prompt-name';
      promptName.textContent = prompt.name;
      
      const promptContent = document.createElement('div');
      promptContent.className = 'prompt-content';
      promptContent.textContent = prompt.content;
      
      promptInfo.appendChild(promptName);
      promptInfo.appendChild(promptContent);
      
      // 添加点击事件，模拟斜杠命令菜单的Enter键功能
      promptInfo.addEventListener('click', function() {
        // 复制到剪贴板
        copyToClipboard(prompt.content);
        // 向background发送消息，请求插入提示词
        chrome.runtime.sendMessage({
          action: 'insertPrompt',
          content: prompt.content
        }, function(response) {
          // 关闭popup
          window.close();
        });
      });
      
      const buttons = document.createElement('div');
      buttons.className = 'buttons';
      
      // 添加复制按钮
      const copyButton = document.createElement('button');
      copyButton.className = 'button';
      copyButton.textContent = '复制';
      copyButton.addEventListener('click', function(e) {
        e.stopPropagation();
        copyToClipboard(prompt.content);
      });
      
      const editButton = document.createElement('button');
      editButton.className = 'button';
      editButton.textContent = '编辑';
      editButton.addEventListener('click', function(e) {
        e.stopPropagation();
        editPrompt(prompt);
      });
      
      const deleteButton = document.createElement('button');
      deleteButton.className = 'button';
      deleteButton.textContent = '删除';
      deleteButton.addEventListener('click', function(e) {
        e.stopPropagation();
        deletePrompt(prompt.id);
      });
      
      buttons.appendChild(copyButton);
      buttons.appendChild(editButton);
      buttons.appendChild(deleteButton);
      
      promptItem.appendChild(pinButton);
      promptItem.appendChild(promptInfo);
      promptItem.appendChild(buttons);
      
      // 添加鼠标悬停事件以显示/隐藏置顶按钮
      promptItem.addEventListener('mouseenter', function() {
        // 只有在当前模式中非第一个项目才显示上移按钮
        // 这里的index就是在过滤后数组中的索引，直接使用即可
        if (index > 0) {
          pinButton.style.display = 'flex';
        }
      });
      
      promptItem.addEventListener('mouseleave', function() {
        pinButton.style.display = 'none';
      });
      
      promptsList.appendChild(promptItem);
    });

    // 渲染完收集可选项
    collectListItems();
  }

  // Mode下拉菜单事件
  modeButton.addEventListener('click', function(e) {
    e.stopPropagation();
    modeDropdown.classList.toggle('active');
  });

  // 点击外部关闭下拉菜单
  document.addEventListener('click', function(e) {
    if (!modeDropdown.contains(e.target)) {
      modeDropdown.classList.remove('active');
      cancelAddMode();
    }
  });

  // 处理Add Mode点击
  function handleAddModeClick(e) {
    e.stopPropagation();
    if (!isAddingMode) {
      showAddModeInput();
    }
  }

  // 显示添加模式输入框
  function showAddModeInput() {
    isAddingMode = true;
    const addModeItem = document.getElementById('add-mode-item');
    addModeItem.innerHTML = `
      <div class="add-mode-input">
        <input type="text" id="new-mode-input" placeholder="模式名称 (≤10字符)" maxlength="10" />
        <button id="save-mode-btn">保存</button>
      </div>
    `;
    
    const input = document.getElementById('new-mode-input');
    const saveBtn = document.getElementById('save-mode-btn');
    
    input.focus();
    
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        saveNewMode();
      } else if (e.key === 'Escape') {
        cancelAddMode();
      }
    });
    
    saveBtn.addEventListener('click', saveNewMode);
  }

  // 保存新模式
  function saveNewMode() {
    const input = document.getElementById('new-mode-input');
    const name = input.value.trim();
    
    if (name && name.length <= 10) {
      const newMode = {
        id: Date.now().toString(),
        name: name
      };
      
      modes.push(newMode);
      currentMode = newMode;
      
      // 保存到storage
      chrome.storage.local.set({
        modes: modes,
        currentMode: currentMode
      }, function() {
        updateModeDisplay();
        renderModeDropdown();
        loadPrompts();
        modeDropdown.classList.remove('active');
        showToast('模式已添加');
      });
    }
    
    cancelAddMode();
  }

  // 取消添加模式
  function cancelAddMode() {
    if (isAddingMode) {
      isAddingMode = false;
      renderModeDropdown();
    }
  }

  // 切换模式
  function switchMode(mode) {
    currentMode = mode;
    chrome.storage.local.set({ currentMode: currentMode }, function() {
      updateModeDisplay();
      renderModeDropdown();
      loadPrompts();
      modeDropdown.classList.remove('active');
    });
  }

  // 编辑模式
  function editMode(mode) {
    // 找到要编辑的模式元素 - 排除add-mode-item
    const modeItems = document.querySelectorAll('.mode-dropdown-item:not(.add-mode-item)');
    let targetModeItem = null;
    
    modeItems.forEach(item => {
      const span = item.querySelector('span[title]');
      if (span && span.getAttribute('title') === mode.name) {
        targetModeItem = item;
      }
    });
    
    if (!targetModeItem) return;
    
    // 找到modeInfo元素 - 包含模式名称和选中标识的div
    const modeInfo = targetModeItem.querySelector('div[style*="flex-grow: 1"]') || 
                     targetModeItem.querySelector('div[style*="margin-left: 10px"]') ||
                     targetModeItem.children[1]; // 第二个子元素通常是modeInfo
    
    if (!modeInfo) return;
    
    const originalContent = modeInfo.innerHTML;
    
    // 创建编辑输入框
    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.value = mode.name;
    editInput.maxLength = 10;
    
    // 动态计算宽度，基于文字长度但不超过可用空间
    const textWidth = Math.max(mode.name.length * 12, 60); // 每个字符约12px
    const maxWidth = 120; // 最大宽度限制
    const inputWidth = Math.min(textWidth, maxWidth);
    
    editInput.style.cssText = `
      font-size: 16px;
      font-weight: bold;
      border: 1px solid #4285f4;
      border-radius: 3px;
      padding: 2px 4px;
      outline: none;
      width: ${inputWidth}px;
      background-color: white;
      box-sizing: border-box;
      margin: 0;
    `;
    
    // 创建一个容器来保持布局
    const editContainer = document.createElement('div');
    editContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
    `;
    
    // 添加输入框
    editContainer.appendChild(editInput);
    
    // 如果是当前选中的模式，保持选中标识
    if (currentMode.id === mode.id) {
      const checkmark = document.createElement('span');
      checkmark.className = 'selected-indicator';
      checkmark.textContent = '✓';
      editContainer.appendChild(checkmark);
    }
    
    // 替换内容为编辑界面
    modeInfo.innerHTML = '';
    modeInfo.appendChild(editContainer);
    
    // 聚焦并选中文本
    editInput.focus();
    editInput.select();
    
    // 保存功能
    function saveEdit() {
      const newName = editInput.value.trim();
      if (newName && newName.length <= 10 && newName !== mode.name) {
        // 更新模式数组
        const modeIndex = modes.findIndex(m => m.id === mode.id);
        if (modeIndex !== -1) {
          modes[modeIndex].name = newName;
          
          // 如果编辑的是当前模式，也更新当前模式
          if (currentMode.id === mode.id) {
            currentMode.name = newName;
          }
          
          // 保存到storage
          chrome.storage.local.set({
            modes: modes,
            currentMode: currentMode
          }, function() {
            updateModeDisplay();
            renderModeDropdown();
            showToast(`模式 "${newName}" 已更新`);
          });
        }
      } else if (newName === mode.name || !newName) {
        // 恢复原内容
        modeInfo.innerHTML = originalContent;
      } else {
        // 恢复原内容
        modeInfo.innerHTML = originalContent;
      }
    }
    
    // 取消功能
    function cancelEdit() {
      modeInfo.innerHTML = originalContent;
    }
    
    // 事件监听
    editInput.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        saveEdit();
      } else if (e.key === 'Escape') {
        cancelEdit();
      }
    });
    
    // 点击其他地方时取消编辑
    const clickOutsideHandler = (e) => {
      if (!targetModeItem.contains(e.target)) {
        cancelEdit();
        document.removeEventListener('click', clickOutsideHandler);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', clickOutsideHandler);
    }, 100);
  }

  // 删除模式
  function deleteMode(mode) {
    // 检查是否是最后一个模式
    if (modes.length <= 1) {
      showToast('至少需要保留一个模式');
      return;
    }
    
    if (confirm(`确定要删除模式 "${mode.name}" 吗？\n注意：该模式下的所有提示词也会被删除！`)) {
      // 如果删除的是当前选中的模式，切换到其他模式
      if (currentMode.id === mode.id) {
        // 找到第一个不是当前模式的模式
        const otherMode = modes.find(m => m.id !== mode.id);
        if (otherMode) {
          currentMode = otherMode;
        }
      }
      
      // 从模式数组中删除
      modes = modes.filter(m => m.id !== mode.id);
      
      // 删除该模式下的所有提示词
      chrome.storage.local.get('prompts', function(data) {
        const prompts = data.prompts || [];
        const updatedPrompts = prompts.filter(p => (p.modeId || 'default') !== mode.id);
        
        // 保存更新后的数据
        chrome.storage.local.set({
          modes: modes,
          currentMode: currentMode,
          prompts: updatedPrompts
        }, function() {
          updateModeDisplay();
          renderModeDropdown();
          loadPrompts();
          showToast(`模式 "${mode.name}" 及其相关提示词已删除`);
        });
      });
    }
  }

  // 编辑提示词
  function editPrompt(prompt) {
    document.getElementById('editor-title').textContent = '';
    document.getElementById('prompt-id').value = prompt.id;
    document.getElementById('prompt-mode-id').value = prompt.modeId || currentMode.id;
    document.getElementById('prompt-name').value = prompt.name;
    document.getElementById('prompt-content').value = prompt.content;
    
    listView.classList.remove('active');
    editorView.classList.add('active');
  }

  // 保存提示词
  promptEditor.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const id = document.getElementById('prompt-id').value;
    const modeId = document.getElementById('prompt-mode-id').value || currentMode.id;
    const name = document.getElementById('prompt-name').value.trim();
    const content = document.getElementById('prompt-content').value.trim();
    
    if (!name || !content) {
      showToast('名称和内容不能为空');
      return;
    }
    
    chrome.storage.local.get('prompts', function(data) {
      let prompts = data.prompts || [];
      
      if (id) {
        // 更新现有提示词
        const index = prompts.findIndex(p => p.id === id);
        if (index !== -1) {
          prompts[index] = { id, name, content, modeId };
        }
      } else {
        // 添加新提示词
        const newId = Date.now().toString();
        prompts.push({ id: newId, name, content, modeId: currentMode.id });
      }
      
      chrome.storage.local.set({ prompts: prompts }, function() {
        showToast('提示词已保存');
        listView.classList.add('active');
        editorView.classList.remove('active');
        loadPrompts();
      });
    });
  });

  // 删除提示词
  function deletePrompt(id) {
    if (confirm('确定要删除这个提示词吗？')) {
      chrome.storage.local.get('prompts', function(data) {
        const prompts = data.prompts || [];
        const updatedPrompts = prompts.filter(p => p.id !== id);
        
        chrome.storage.local.set({ prompts: updatedPrompts }, function() {
          showToast('提示词已删除');
          loadPrompts();
        });
      });
    }
  }

  // 取消编辑
  cancelButton.addEventListener('click', function() {
    listView.classList.add('active');
    editorView.classList.remove('active');
  });

  // 搜索功能
  searchInput.addEventListener('input', function() {
    const searchTerm = this.value.trim();
    chrome.storage.local.get('prompts', function(data) {
      const prompts = data.prompts || [];
      displayPrompts(prompts, searchTerm);
    });
  });

  // 导出功能
  exportButton.addEventListener('click', function() {
    chrome.storage.local.get('prompts', function(data) {
      const prompts = data.prompts || [];
      // 只导出当前模式下的提示词
      const filteredPrompts = prompts.filter(p => (p.modeId || 'default') === currentMode.id);
      
      if (filteredPrompts.length === 0) {
        showToast('当前模式下没有提示词可以导出');
        return;
      }
      
      let exportText = '';
      filteredPrompts.forEach(prompt => {
        exportText += prompt.name + '\n' + prompt.content + '\n\n';
      });
      
      const blob = new Blob([exportText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `prompts_${currentMode.name}_export.txt`;
      a.click();
      
      URL.revokeObjectURL(url);
      showToast(`已导出 "${currentMode.name}" 模式下的 ${filteredPrompts.length} 个提示词`);
    });
  });

  // 创建导入对话框
  function createImportDialog() {
    if (importDialog) {
      return;
    }
    
    importDialog = document.createElement('div');
    importDialog.style.position = 'fixed';
    importDialog.style.top = '0';
    importDialog.style.left = '0';
    importDialog.style.width = '100%';
    importDialog.style.height = '100%';
    importDialog.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    importDialog.style.display = 'flex';
    importDialog.style.justifyContent = 'center';
    importDialog.style.alignItems = 'center';
    importDialog.style.zIndex = '1000';
    
    const dialogContent = document.createElement('div');
    dialogContent.style.width = '90%';
    dialogContent.style.maxWidth = '550px';
    dialogContent.style.backgroundColor = 'white';
    dialogContent.style.borderRadius = '8px';
    dialogContent.style.padding = '20px';
    dialogContent.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
    dialogContent.style.maxHeight = '90vh';
    dialogContent.style.overflowY = 'auto';
    
    const title = document.createElement('h2');
    title.textContent = '';
    title.style.margin = '0 0 15px 0';
    
    const instructions = document.createElement('p');
    instructions.textContent = '';
    instructions.style.marginBottom = '15px';
    
    importTextarea = document.createElement('textarea');
    importTextarea.style.width = '100%';
    importTextarea.style.height = '200px';
    importTextarea.style.padding = '10px';
    importTextarea.style.borderRadius = '4px';
    importTextarea.style.border = '1px solid #ddd';
    importTextarea.style.marginBottom = '15px';
    importTextarea.style.resize = 'vertical';
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'flex-end';
    buttonContainer.style.gap = '10px';
    buttonContainer.style.marginBottom = '10px';
    buttonContainer.style.flexWrap = 'wrap';
    
    // 删除当前模式按钮
    deleteAllButton = document.createElement('button');
    deleteAllButton.textContent = '清空';
    deleteAllButton.style.padding = '10px 15px';
    deleteAllButton.style.backgroundColor = '#f44336';
    deleteAllButton.style.color = 'white';
    deleteAllButton.style.border = 'none';
    deleteAllButton.style.borderRadius = '4px';
    deleteAllButton.style.cursor = 'pointer';
    deleteAllButton.style.margin = '5px';
    
    cancelImportButton = document.createElement('button');
    cancelImportButton.textContent = '取消';
    cancelImportButton.style.padding = '10px 15px';
    cancelImportButton.style.backgroundColor = '#f1f1f1';
    cancelImportButton.style.color = '#333';
    cancelImportButton.style.border = 'none';
    cancelImportButton.style.borderRadius = '4px';
    cancelImportButton.style.cursor = 'pointer';
    cancelImportButton.style.margin = '5px';
    
    importButton2 = document.createElement('button');
    importButton2.textContent = '导入';
    importButton2.style.padding = '10px 15px';
    importButton2.style.backgroundColor = '#4285f4';
    importButton2.style.color = 'white';
    importButton2.style.border = 'none';
    importButton2.style.borderRadius = '4px';
    importButton2.style.cursor = 'pointer';
    importButton2.style.margin = '5px';
    
    buttonContainer.appendChild(deleteAllButton);
    buttonContainer.appendChild(cancelImportButton);
    buttonContainer.appendChild(importButton2);
    
    dialogContent.appendChild(title);
    dialogContent.appendChild(instructions);
    dialogContent.appendChild(importTextarea);
    dialogContent.appendChild(buttonContainer);
    
    importDialog.appendChild(dialogContent);
    document.body.appendChild(importDialog);
    
    // 添加事件监听器
    cancelImportButton.addEventListener('click', hideImportDialog);
    importButton2.addEventListener('click', importPrompts);
    deleteAllButton.addEventListener('click', deleteAllPrompts);
  }

  // 显示导入对话框
  function showImportDialog() {
    createImportDialog();
    importDialog.style.display = 'flex';
    importTextarea.value = '';
    // 防止在导入对话框内的键盘事件冒泡到全局（例如全局的 Enter 监听导致弹窗关闭）
    // 不阻止默认行为，这样 Enter/Shift+Enter 在 textarea 里仍然是正常换行
    if (importTextarea && !importTextarea.__bubbleStopped) {
      importTextarea.addEventListener('keydown', (e) => {
        e.stopPropagation();
      });
      // 标记避免重复绑定
      importTextarea.__bubbleStopped = true;
    }

    // 添加示例文本作为placeholder
    importTextarea.placeholder = '示例：\nTitle(1)\nPrompts(1)\n\nTitle(2)\nPrompts(2)\n\n注意：\n请输入文本内容，每个提示词之间用空行分隔';
  }

  // 隐藏导入对话框
  function hideImportDialog() {
    if (importDialog) {
      importDialog.style.display = 'none';
    }
  }

  // 导入提示词
  function importPrompts() {
    const text = importTextarea.value.trim();
    if (!text) {
      showToast('请输入提示词内容');
      return;
    }
    
    // 按空行分割提示词
    const promptTexts = text.split(/\n\s*\n/);
    const newPrompts = [];
    
    let invalidCount = 0;
    
    promptTexts.forEach(promptText => {
      const lines = promptText.trim().split('\n');
      if (lines.length >= 2) {
        const name = lines[0].trim();
        const content = lines.slice(1).join('\n').trim();
        
        if (name && content) {
          newPrompts.push({
            id: Date.now() + '-' + newPrompts.length,
            name: name,
            content: content,
            modeId: currentMode.id
          });
        } else {
          invalidCount++;
        }
      } else {
        invalidCount++;
      }
    });
    
    if (newPrompts.length === 0) {
      showToast('没有有效的提示词可以导入');
      return;
    }
    
    chrome.storage.local.get('prompts', function(data) {
      const existingPrompts = data.prompts || [];
      const updatedPrompts = existingPrompts.concat(newPrompts);
      
      chrome.storage.local.set({ prompts: updatedPrompts }, function() {
        hideImportDialog();
        loadPrompts();
        
        const message = `成功导入 ${newPrompts.length} 个提示词` + 
                       (invalidCount > 0 ? `，${invalidCount} 个格式无效被忽略` : '');
        showToast(message);
      });
    });
  }

  // 删除当前模式的所有提示词
  function deleteAllPrompts() {
    if (confirm(`确定要删除 "${currentMode.name}" 模式下的所有提示词吗？此操作不可恢复！`)) {
      chrome.storage.local.get('prompts', function(data) {
        const prompts = data.prompts || [];
        // 只保留非当前模式的提示词
        const updatedPrompts = prompts.filter(p => (p.modeId || 'default') !== currentMode.id);
        
        chrome.storage.local.set({ prompts: updatedPrompts }, function() {
          hideImportDialog();
          loadPrompts();
          showToast(`"${currentMode.name}" 模式下的提示词已全部删除`);
        });
      });
    }
  }

  // 显示消息提示
  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(function() {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.5s';
      
      setTimeout(function() {
        document.body.removeChild(toast);
      }, 500);
    }, 3000);
  }

  // 添加导入按钮样式
  function styleImportButton() {
    importButton.style.padding = '10px 15px';
    importButton.style.backgroundColor = '#4285f4';
    importButton.style.color = 'white';
    importButton.style.textAlign = 'center';
    importButton.style.border = 'none';
    importButton.style.borderRadius = '8px';
    importButton.style.cursor = 'pointer';
    importButton.style.fontSize = '14px';
  }

  // 导入提示词按钮事件
  importButton.addEventListener('click', showImportDialog);

  // 添加复制到剪贴板功能
  function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
      .then(() => {
        showToast('已复制到剪贴板');
      })
      .catch(err => {
        console.error('复制失败:', err);
        showToast('复制失败');
      });
  }

  // 上移提示词功能
  function pinPrompt(id) {
    chrome.storage.local.get('prompts', function(data) {
      const prompts = data.prompts || [];
      
      // 获取当前模式的所有提示词及其在全局数组中的索引
      const currentModePrompts = [];
      prompts.forEach((prompt, index) => {
        if ((prompt.modeId || 'default') === currentMode.id) {
          currentModePrompts.push({ prompt, globalIndex: index });
        }
      });
      
      // 找到要上移的提示词在当前模式中的位置
      const currentModeIndex = currentModePrompts.findIndex(item => item.prompt.id === id);
      
      // 检查是否可以上移（不是当前模式的第一个）
      if (currentModeIndex > 0) {
        const currentItem = currentModePrompts[currentModeIndex];
        const previousItem = currentModePrompts[currentModeIndex - 1];
        
        // 在全局数组中交换这两个提示词的位置
        const temp = prompts[currentItem.globalIndex];
        prompts[currentItem.globalIndex] = prompts[previousItem.globalIndex];
        prompts[previousItem.globalIndex] = temp;
        
        chrome.storage.local.set({ prompts: prompts }, function() {
          showToast('提示词已上移');
          loadPrompts();
        });
      } else {
        // 如果已经是当前模式的第一个，给出提示
        showToast('已经是当前模式的第一个提示词');
      }
    });
  }

  // 上移模式功能
  function pinMode(id) {
    const index = modes.findIndex(m => m.id === id);
    
    if (index > 0) {
      // 交换当前模式与上一个模式的位置
      const temp = modes[index];
      modes[index] = modes[index - 1];
      modes[index - 1] = temp;
      
      chrome.storage.local.set({ modes: modes }, function() {
        showToast('模式已上移');
        renderModeDropdown();
      });
    }
  }

  // 全局搜索结果显示
  function displayGlobalSearchResults(prompts, searchTerm) {
    promptsList.innerHTML = '';
    
    // 搜索所有提示词
    const searchResults = prompts.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (searchResults.length === 0) {
      const noResultsDiv = document.createElement('div');
      noResultsDiv.style.cssText = `
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100px;
        color: #999;
        font-size: 16px;
      `;
      noResultsDiv.textContent = '没有找到匹配的提示词';
      promptsList.appendChild(noResultsDiv);
      return;
    }
    
    searchResults.forEach(function(prompt, index) {
      const promptItem = document.createElement('div');
      promptItem.className = 'prompt-item';
    promptItem.dataset.index = String(index);
    promptItem.dataset.content = prompt.content;
      
      const promptInfo = document.createElement('div');
      promptInfo.className = 'prompt-info';
      promptInfo.style.cursor = 'pointer';
      
      const promptName = document.createElement('div');
      promptName.className = 'prompt-name';
      promptName.textContent = prompt.name;
      
      // 添加模式标签
      const modeTag = document.createElement('div');
      const modeName = modes.find(m => m.id === (prompt.modeId || 'default'))?.name || 'Mode';
      modeTag.style.cssText = `
        display: inline-block;
        background-color: #e8f0fe;
        color: #1a73e8;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 12px;
        margin-left: 8px;
        vertical-align: middle;
      `;
      modeTag.textContent = modeName;
      
      const nameContainer = document.createElement('div');
      nameContainer.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
      `;
      nameContainer.appendChild(promptName);
      nameContainer.appendChild(modeTag);
      
      const promptContent = document.createElement('div');
      promptContent.className = 'prompt-content';
      promptContent.textContent = prompt.content;
      
      promptInfo.appendChild(nameContainer);
      promptInfo.appendChild(promptContent);
      
      // 添加点击事件
      promptInfo.addEventListener('click', function() {
        chrome.runtime.sendMessage({
          action: 'insertPrompt',
          content: prompt.content
        }, function(response) {
          window.close();
        });
      });
      
      const buttons = document.createElement('div');
      buttons.className = 'buttons';
      
      // 复制按钮
      const copyButton = document.createElement('button');
      copyButton.className = 'button';
      copyButton.textContent = '复制';
      copyButton.addEventListener('click', function(e) {
        e.stopPropagation();
        copyToClipboard(prompt.content);
      });
      
      // 编辑按钮
      const editButton = document.createElement('button');
      editButton.className = 'button';
      editButton.textContent = '编辑';
      editButton.addEventListener('click', function(e) {
        e.stopPropagation();
        editPrompt(prompt);
      });
      
      // 删除按钮
      const deleteButton = document.createElement('button');
      deleteButton.className = 'button';
      deleteButton.textContent = '删除';
      deleteButton.addEventListener('click', function(e) {
        e.stopPropagation();
        deletePrompt(prompt.id);
      });
      
      buttons.appendChild(copyButton);
      buttons.appendChild(editButton);
      buttons.appendChild(deleteButton);
      
      promptItem.appendChild(promptInfo);
      promptItem.appendChild(buttons);
      
      promptsList.appendChild(promptItem);
    });

    // 渲染完收集可选项
    collectListItems();
  }

  // 搜索功能 - 全局搜索
  searchInput.addEventListener('input', function() {
    const searchTerm = this.value.trim();
    if (searchTerm) {
      // 全局搜索所有模式的提示词
      chrome.storage.local.get('prompts', function(data) {
        const prompts = data.prompts || [];
        displayGlobalSearchResults(prompts, searchTerm);
      });
    } else {
      // 如果搜索框为空，显示当前模式的提示词
      loadPrompts();
    }
  });

  // 键盘导航：在输入框聚焦时也能上下左右选择，Enter 确认插入
  document.addEventListener('keydown', function(e) {
    // 只有列表视图活动时才处理
    if (!listView.classList.contains('active')) return;

    // 如果导入对话框处于显示状态，则不处理全局键盘导航/回车
    if (importDialog && importDialog.style && importDialog.style.display === 'flex') {
      return;
    }

    const isArrow = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key);
    if (isArrow && document.activeElement === searchInput) {
      e.preventDefault();
    }

    if (!listItems.length) return;

    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowLeft':
        updateSelection(selectedIndex - 1);
        break;
      case 'ArrowDown':
      case 'ArrowRight':
        updateSelection(selectedIndex + 1);
        break;
      case 'Enter':
        // 当焦点在输入框或列表上，按 Enter 插入选中提示词
        if (selectedIndex >= 0 && selectedIndex < listItems.length) {
          const el = listItems[selectedIndex];
          const content = el.dataset.content || '';
          if (content) {
            // 先复制到剪贴板，再发送插入消息
            try { navigator.clipboard.writeText(content); } catch (_) {}
            chrome.runtime.sendMessage({
              action: 'insertPrompt',
              content
            }, function() { window.close(); });
            e.preventDefault();
          }
        }
        break;
      default:
        return;
    }
  });

  // （撤回）不在弹窗里处理键盘导航/Enter，保持原行为

  // 初始化
  styleImportButton();
  init();
});
