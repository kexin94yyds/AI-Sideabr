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
const fs = require('fs');
const path = require('path');
const {
  SYNC_DIR,
  getMarkdownBaseDir,
  sanitizeFileName,
  upsertConversationMarkdown
} = require('./conversation-markdown.cjs');

const PORT = 3456;
const MAX_REQUEST_BYTES = 10 * 1024 * 1024;
const EXPECTED_EXTENSION_ID = String(process.env.AI_SIDEBAR_EXTENSION_ID || '').trim();
const ALLOWED_HOSTS = new Set([
  `localhost:${PORT}`,
  `127.0.0.1:${PORT}`,
  `[::1]:${PORT}`
]);

if (EXPECTED_EXTENSION_ID && !/^[a-p]{32}$/.test(EXPECTED_EXTENSION_ID)) {
  throw new Error('AI_SIDEBAR_EXTENSION_ID must be a 32-character Chrome extension ID');
}

function getAllowedExtensionOrigin(req) {
  const origin = String(req.headers.origin || '').trim();
  if (!origin) return '';

  const match = /^chrome-extension:\/\/([a-p]{32})$/.exec(origin);
  if (!match) return null;
  if (EXPECTED_EXTENSION_ID && match[1] !== EXPECTED_EXTENSION_ID) return null;
  return origin;
}

function authorizeRequest(req, res) {
  const host = String(req.headers.host || '').toLowerCase();
  const allowedOrigin = getAllowedExtensionOrigin(req);
  if (!ALLOWED_HOSTS.has(host) || allowedOrigin === null) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Forbidden' }));
    return false;
  }

  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.headers['access-control-request-private-network'] === 'true') {
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
  }
  return true;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let bytes = 0;
    let settled = false;

    req.on('data', (chunk) => {
      if (settled) return;
      bytes += chunk.length;
      if (bytes > MAX_REQUEST_BYTES) {
        settled = true;
        const error = new Error('Request body too large');
        error.statusCode = 413;
        reject(error);
        return;
      }
      body += chunk;
    });
    req.on('end', () => {
      if (settled) return;
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (error) {
        error.statusCode = 400;
        reject(error);
      }
    });
    req.on('error', (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    });
  });
}

function writeJsonAtomic(filePath, data) {
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(tempPath, filePath);
  } finally {
    try {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    } catch (_) {}
  }
}

function sendRequestError(res, error, label) {
  console.error(`❌ ${label}:`, error);
  const statusCode = Number(error?.statusCode) || 500;
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: false, error: statusCode >= 500 ? 'Internal server error' : error.message }));
}

// 确保 sync 目录存在
if (!fs.existsSync(SYNC_DIR)) {
  fs.mkdirSync(SYNC_DIR, { recursive: true });
}

function createSyncServer() {
  return http.createServer(async (req, res) => {
    if (!authorizeRequest(req, res)) return;

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
      try {
        const data = await readJsonBody(req);
        if (!Array.isArray(data)) {
          const error = new Error('History payload must be an array');
          error.statusCode = 400;
          throw error;
        }
        const filePath = path.join(SYNC_DIR, 'history.json');
        writeJsonAtomic(filePath, data);
        console.log(`✅ History 已更新: ${data.length} 条记录`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, count: data.length }));
      } catch (error) {
        sendRequestError(res, error, 'History 同步失败');
      }
      return;
    }

    // POST /sync/favorites - 同步收藏
    if (req.method === 'POST' && req.url === '/sync/favorites') {
      try {
        const data = await readJsonBody(req);
        if (!Array.isArray(data)) {
          const error = new Error('Favorites payload must be an array');
          error.statusCode = 400;
          throw error;
        }
        const filePath = path.join(SYNC_DIR, 'favorites.json');
        writeJsonAtomic(filePath, data);
        console.log(`⭐ Favorites 已更新: ${data.length} 条记录`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, count: data.length }));
      } catch (error) {
        sendRequestError(res, error, 'Favorites 同步失败');
      }
      return;
    }

    // POST /sync/conversations - 同步完整会话到 Markdown
    if (req.method === 'POST' && req.url === '/sync/conversations') {
      try {
        const parsed = await readJsonBody(req);
        const conversation = parsed && parsed.conversation ? parsed.conversation : null;
        const projectName = sanitizeFileName(parsed.project || conversation?.project || 'AI-Sidebar', 'AI-Sidebar');

        if (!conversation || !Array.isArray(conversation.messages) || conversation.messages.length === 0) {
          const error = new Error('conversation.messages is required');
          error.statusCode = 400;
          throw error;
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
        sendRequestError(res, error, 'Conversation Markdown 同步失败');
      }
      return;
    }

    // 404 - 未找到
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });
}

if (require.main === module) {
  const server = createSyncServer();
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
}

module.exports = { createSyncServer };
