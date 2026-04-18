#!/usr/bin/env node
/**
 * 简单的本地同步服务器
 * 接收浏览器扩展的数据并写入 sync/*.json 文件
 * 
 * 使用方法:
 * 1. 运行: node sync-server.js
 * 2. 服务器会在 http://localhost:3456 监听
 * 3. 扩展会自动将数据发送到此服务器
 */

const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = 3456;
const SYNC_DIR = path.join(__dirname, 'sync');
const SYNC_CONFIG_PATH = path.join(SYNC_DIR, 'config.json');

// 确保 sync 目录存在
if (!fs.existsSync(SYNC_DIR)) {
  fs.mkdirSync(SYNC_DIR, { recursive: true });
}

function readSyncConfig() {
  try {
    if (!fs.existsSync(SYNC_CONFIG_PATH)) return {};
    const raw = fs.readFileSync(SYNC_CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    console.warn('⚠️ 读取 sync/config.json 失败，将使用默认配置:', error.message);
    return {};
  }
}

function getMarkdownBaseDir() {
  const config = readSyncConfig();
  const configured = process.env.AI_SIDEBAR_MARKDOWN_DIR || config.markdownBaseDir;
  return configured ? path.resolve(configured) : path.join(SYNC_DIR, 'markdown');
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function sanitizeFileName(value, fallback = 'untitled') {
  const normalized = String(value || '')
    .replace(/[\/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized || fallback;
}

function dateKeyFromTimestamp(ts) {
  const date = new Date(Number(ts) || Date.now());
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function timeKeyFromTimestamp(ts) {
  const date = new Date(Number(ts) || Date.now());
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function buildConversationBlockId(conversation) {
  const source = String(
    conversation.conversationId ||
    conversation.url ||
    `${conversation.provider || 'unknown'}:${conversation.title || ''}`
  );
  return crypto.createHash('sha1').update(source).digest('hex').slice(0, 12);
}

function formatConversationMessages(messages) {
  return (Array.isArray(messages) ? messages : [])
    .map((message) => {
      const role = String(message?.role || 'Unknown').trim() || 'Unknown';
      const content = String(message?.content || '').trim();
      if (!content) return '';
      return `### ${role}\n\n${content}`;
    })
    .filter(Boolean)
    .join('\n\n');
}

function formatProviderLabel(providerName) {
  const normalized = String(providerName || 'unknown').trim().toLowerCase();
  const labels = {
    chatgpt: 'ChatGPT',
    codex: 'ChatGPT Codex',
    gemini: 'Gemini',
    deepseek: 'DeepSeek',
    claude: 'Claude',
    perplexity: 'Perplexity',
    notebooklm: 'NotebookLM'
  };
  return labels[normalized] || (normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : 'Unknown');
}

function buildConversationBlock(projectName, conversation) {
  const blockId = buildConversationBlockId(conversation);
  const blockTime = timeKeyFromTimestamp(conversation.updatedAt || conversation.timestamp || Date.now());
  const providerName = String(conversation.provider || 'unknown').trim() || 'unknown';
  const providerLabel = formatProviderLabel(providerName);
  const title = String(conversation.title || '').trim() || 'Untitled';
  const url = String(conversation.url || '').trim();
  const messagesBody = formatConversationMessages(conversation.messages);
  const lines = [
    `<!-- AI_SIDEBAR_BLOCK:${blockId}:START -->`,
    `## ${blockTime} ${providerLabel} - ${title}`,
    '',
    `- URL: ${url || '-'}`,
    `- 标题: ${title}`,
    `- 消息数: ${Array.isArray(conversation.messages) ? conversation.messages.length : Number(conversation.messageCount || 0)}`,
    ''
  ];

  if (messagesBody) {
    lines.push(messagesBody, '');
  }

  lines.push(`<!-- AI_SIDEBAR_BLOCK:${blockId}:END -->`);
  return {
    blockId,
    content: lines.join('\n')
  };
}

function upsertConversationMarkdown(projectName, conversation) {
  const projectFileName = `${sanitizeFileName(projectName, 'AI-Sidebar')}.md`;
  const dateKey = dateKeyFromTimestamp(conversation.createdAt || conversation.timestamp || conversation.updatedAt || Date.now());
  const baseDir = getMarkdownBaseDir();
  const dayDir = path.join(baseDir, dateKey);
  const filePath = path.join(dayDir, projectFileName);
  const { blockId, content } = buildConversationBlock(projectName, conversation);
  const escapedBlockId = blockId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const blockPattern = new RegExp(`<!-- AI_SIDEBAR_BLOCK:${escapedBlockId}:START -->[\\s\\S]*?<!-- AI_SIDEBAR_BLOCK:${escapedBlockId}:END -->`, 'g');

  ensureDir(dayDir);

  let existing = '';
  if (fs.existsSync(filePath)) {
    existing = fs.readFileSync(filePath, 'utf8');
  }

  const header = `# ${sanitizeFileName(projectName, 'AI-Sidebar')}\n\n`;
  if (!existing.trim()) {
    fs.writeFileSync(filePath, `${header}${content}\n`, 'utf8');
    return { filePath, dateKey, blockId, created: true, updated: false };
  }

  let nextContent = existing;
  if (!existing.startsWith('# ')) {
    nextContent = `${header}${existing.trimStart()}`;
  }

  if (blockPattern.test(nextContent)) {
    nextContent = nextContent.replace(blockPattern, content);
    fs.writeFileSync(filePath, `${nextContent.trimEnd()}\n`, 'utf8');
    return { filePath, dateKey, blockId, created: false, updated: true };
  }

  nextContent = `${nextContent.trimEnd()}\n\n${content}\n`;
  fs.writeFileSync(filePath, nextContent, 'utf8');
  return { filePath, dateKey, blockId, created: true, updated: false };
}

const server = http.createServer((req, res) => {
  // 设置 CORS 头，允许扩展访问
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // GET /ping - 健康检查
  if (req.method === 'GET' && req.url === '/ping') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', message: 'Sync server is running' }));
    return;
  }

  // GET /sync/history - 获取历史记录
  if (req.method === 'GET' && req.url === '/sync/history') {
    try {
      const filePath = path.join(SYNC_DIR, 'history.json');
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(Array.isArray(data) ? data : []));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
      }
    } catch (error) {
      console.error('❌ 读取 History 失败:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  // GET /sync/favorites - 获取收藏
  if (req.method === 'GET' && req.url === '/sync/favorites') {
    try {
      const filePath = path.join(SYNC_DIR, 'favorites.json');
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(Array.isArray(data) ? data : []));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
      }
    } catch (error) {
      console.error('❌ 读取 Favorites 失败:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  // POST /sync/history - 同步历史记录
  if (req.method === 'POST' && req.url === '/sync/history') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const filePath = path.join(SYNC_DIR, 'history.json');
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`✅ History 已更新: ${data.length} 条记录`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, count: data.length }));
      } catch (error) {
        console.error('❌ History 同步失败:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });
    return;
  }

  // POST /sync/favorites - 同步收藏
  if (req.method === 'POST' && req.url === '/sync/favorites') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const filePath = path.join(SYNC_DIR, 'favorites.json');
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`⭐ Favorites 已更新: ${data.length} 条记录`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, count: data.length }));
      } catch (error) {
        console.error('❌ Favorites 同步失败:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });
    return;
  }

  // POST /sync/conversations - 同步完整会话到 Markdown
  if (req.method === 'POST' && req.url === '/sync/conversations') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}');
        const conversation = parsed && parsed.conversation ? parsed.conversation : null;
        const projectName = sanitizeFileName(parsed.project || conversation?.project || 'AI-Sidebar', 'AI-Sidebar');

        if (!conversation || !Array.isArray(conversation.messages) || conversation.messages.length === 0) {
          throw new Error('conversation.messages is required');
        }

        const result = upsertConversationMarkdown(projectName, conversation);
        console.log(`📝 Conversation Markdown 已同步: ${result.filePath}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          project: projectName,
          path: result.filePath,
          date: result.dateKey,
          blockId: result.blockId,
          created: result.created,
          updated: result.updated
        }));
      } catch (error) {
        console.error('❌ Conversation Markdown 同步失败:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });
    return;
  }

  // 404 - 未找到
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, 'localhost', () => {
  console.log(`🚀 同步服务器已启动: http://localhost:${PORT}`);
  console.log(`📁 同步目录: ${SYNC_DIR}`);
  console.log(`\n可用端点:`);
  console.log(`  - GET  /ping            - 健康检查`);
  console.log(`  - GET  /sync/history    - 获取历史记录`);
  console.log(`  - GET  /sync/favorites  - 获取收藏`);
  console.log(`  - POST /sync/history    - 同步历史记录`);
  console.log(`  - POST /sync/favorites  - 同步收藏`);
  console.log(`  - POST /sync/conversations - 同步完整会话 Markdown`);
  console.log(`📁 Markdown 目录: ${getMarkdownBaseDir()}`);
  console.log(`\n按 Ctrl+C 停止服务器\n`);
});

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n👋 正在关闭同步服务器...');
  server.close(() => {
    console.log('✅ 服务器已关闭');
    process.exit(0);
  });
});
