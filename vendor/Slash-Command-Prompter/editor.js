// DOM元素
const editorForm = document.getElementById('editor-form');
const editorTitle = document.getElementById('editor-title');
const promptIdInput = document.getElementById('prompt-id');
const promptNameInput = document.getElementById('prompt-name');
const promptContentInput = document.getElementById('prompt-content');
const saveButton = document.getElementById('save-button');
const cancelButton = document.getElementById('cancel-button');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  // 检查URL参数是否包含edit=true
  const urlParams = new URLSearchParams(window.location.search);
  const isEditing = urlParams.get('edit') === 'true';
  
  if (isEditing) {
    editorTitle.textContent = '编辑提示词';
    
    // 从存储获取正在编辑的提示词ID
    chrome.storage.local.get(['editingPromptId', 'prompts'], (result) => {
      const editingId = result.editingPromptId;
      const prompts = result.prompts || [];
      const prompt = prompts.find(p => p.id === editingId);
      
      if (prompt) {
        // 填充表单数据
        promptIdInput.value = prompt.id;
        promptNameInput.value = prompt.name;
        promptContentInput.value = prompt.content;
      }
    });
  } else {
    editorTitle.textContent = '添加提示词';
    promptIdInput.value = '';
  }
  
  // 添加事件监听器
  editorForm.addEventListener('submit', savePrompt);
  cancelButton.addEventListener('click', closeWindow);
});

// 保存提示词
function savePrompt(e) {
  e.preventDefault();
  
  const name = promptNameInput.value.trim();
  const content = promptContentInput.value.trim();
  
  if (!name || !content) {
    alert('请填写提示词名称和内容');
    return;
  }
  
  chrome.storage.local.get('prompts', (result) => {
    let prompts = result.prompts || [];
    const promptId = promptIdInput.value;
    
    if (promptId) {
      // 编辑现有提示词
      const index = prompts.findIndex(p => p.id === promptId);
      if (index !== -1) {
        prompts[index] = { id: promptId, name, content };
      }
    } else {
      // 添加新提示词
      const newId = 'prompt-' + Date.now();
      prompts.push({ id: newId, name, content });
    }
    
    chrome.storage.local.set({ prompts: prompts }, () => {
      // 清除editingPromptId
      chrome.storage.local.remove('editingPromptId');
      
      // 关闭窗口
      closeWindow();
    });
  });
}

// 关闭窗口
function closeWindow() {
  window.close();
} 