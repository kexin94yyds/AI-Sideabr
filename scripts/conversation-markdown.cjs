const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SYNC_DIR = path.join(REPO_ROOT, 'sync');
const SYNC_CONFIG_PATH = path.join(SYNC_DIR, 'config.json');

function readSyncConfig(syncDir = SYNC_DIR) {
  const configPath = path.join(syncDir, 'config.json');
  try {
    if (!fs.existsSync(configPath)) return {};
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    console.warn('⚠️ 读取 sync/config.json 失败，将使用默认配置:', error.message);
    return {};
  }
}

function getMarkdownBaseDir(options = {}) {
  const syncDir = options.syncDir || SYNC_DIR;
  const config = readSyncConfig(syncDir);
  const configured = options.baseDir || process.env.AI_SIDEBAR_MARKDOWN_DIR || config.markdownBaseDir;
  return configured ? path.resolve(configured) : path.join(syncDir, 'markdown');
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

function upsertConversationMarkdown(projectName, conversation, options = {}) {
  const baseDir = getMarkdownBaseDir(options);
  const projectFileName = `${sanitizeFileName(projectName, 'AI-Sidebar')}.md`;
  const dateKey = dateKeyFromTimestamp(conversation.createdAt || conversation.timestamp || conversation.updatedAt || Date.now());
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

module.exports = {
  REPO_ROOT,
  SYNC_DIR,
  SYNC_CONFIG_PATH,
  readSyncConfig,
  getMarkdownBaseDir,
  sanitizeFileName,
  upsertConversationMarkdown
};
