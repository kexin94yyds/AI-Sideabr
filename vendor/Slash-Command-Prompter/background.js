// background.js - 用于消息传递和管理扩展状态

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'insertPrompt') {
    // 将消息转发给当前活动标签页的content script
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs && tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'insertPrompt',
          content: message.content
        });
      }
    });
  }
}); 