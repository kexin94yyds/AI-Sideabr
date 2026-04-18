const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SYNC_DIR = path.join(REPO_ROOT, 'sync');
const SYNC_CONFIG_PATH = path.join(SYNC_DIR, 'config.json');
const RI_EXPORT_SUBDIR = 'AI-Sidebar';
const RI_CONFIG_CANDIDATES = [
  path.join(process.env.HOME || '', 'Library', 'Application Support', 'replace-information', 'config.json'),
  path.join(process.env.HOME || '', 'Library', 'Application Support', 'relearn', 'config.json')
].filter(Boolean);

function readJsonFile(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (error) {
    console.warn(`⚠️ 读取 JSON 配置失败 (${filePath}):`, error.message);
    return null;
  }
}

function readSyncConfig(syncDir = SYNC_DIR) {
  const configPath = path.join(syncDir, 'config.json');
  const config = readJsonFile(configPath);
  if (config) return config;
  if (fs.existsSync(configPath)) {
    console.warn('⚠️ 读取 sync/config.json 失败，将使用默认配置');
  }
  return {};
}

function getRiExportConfig() {
  for (const configPath of RI_CONFIG_CANDIDATES) {
    const config = readJsonFile(configPath);
    const exportLocalPath = String(config?.exportLocalPath || '').trim();
    if (!exportLocalPath) continue;
    return {
      configPath,
      exportLocalPath: path.resolve(exportLocalPath),
      markdownBaseDir: path.resolve(exportLocalPath, RI_EXPORT_SUBDIR)
    };
  }

  return null;
}

function getMarkdownBaseDirDetails(options = {}) {
  const syncDir = options.syncDir || SYNC_DIR;
  const config = readSyncConfig(syncDir);
  const explicitBaseDir = options.baseDir || process.env.AI_SIDEBAR_MARKDOWN_DIR || config.markdownBaseDir;
  if (explicitBaseDir) {
    return {
      baseDir: path.resolve(explicitBaseDir),
      source: options.baseDir ? 'options' : process.env.AI_SIDEBAR_MARKDOWN_DIR ? 'env' : 'sync-config'
    };
  }

  const riConfig = getRiExportConfig();
  if (riConfig) {
    return {
      baseDir: riConfig.markdownBaseDir,
      source: 'ri-export-local-path',
      riConfigPath: riConfig.configPath,
      riExportLocalPath: riConfig.exportLocalPath
    };
  }

  return {
    baseDir: path.join(syncDir, 'markdown'),
    source: 'default'
  };
}

function getMarkdownBaseDir(options = {}) {
  return getMarkdownBaseDirDetails(options).baseDir;
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

function findExistingConversationFile(dayDir, blockId, legacyTitle) {
  if (!fs.existsSync(dayDir)) return null;

  const markerStart = `<!-- AI_SIDEBAR_BLOCK:${blockId}:START -->`;
  for (const entry of fs.readdirSync(dayDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    const candidatePath = path.join(dayDir, entry.name);
    try {
      const content = fs.readFileSync(candidatePath, 'utf8');
      if (content.includes(markerStart)) {
        return candidatePath;
      }
    } catch (_) {}
  }

  if (legacyTitle) {
    const legacyPath = path.join(dayDir, `${legacyTitle}.md`);
    if (fs.existsSync(legacyPath)) {
      return legacyPath;
    }
  }

  return null;
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

function isNotebookLmNoiseMessage(content) {
  const value = String(content || '').replace(/\s+/g, ' ').trim();
  if (!value) return true;
  if (value === 'Loading' || value === '(1)') return true;
  return /Processing material|Chat history is now saved across sessions|Jump to bottom|Light mode|Dark mode|Device theme|Good response|Bad response|Generate an AI|Generate reports based on your sources|Infinite Curiosity|Click to open citation details/i.test(value);
}

function looksLikeNotebookLmQuestion(content) {
  const value = String(content || '').replace(/\s+/g, ' ').trim();
  if (!value || value.length > 140) return false;
  return /[?？]$/.test(value) || /^(为什么|怎么|如何|它是怎么|达芬奇|莱昂纳多)/.test(value);
}

function normalizeNotebookLmMessages(messages) {
  const cleaned = [];

  for (const raw of Array.isArray(messages) ? messages : []) {
    const role = String(raw?.role || '').trim() || 'Assistant';
    const content = String(raw?.content || '').trim();
    if (!content || isNotebookLmNoiseMessage(content)) continue;

    const prev = cleaned[cleaned.length - 1];
    if (prev && prev.content === content) continue;

    cleaned.push({ role, content });
  }

  return cleaned.map((message, index, arr) => {
    const next = arr[index + 1];
    if (
      message.role === 'Assistant' &&
      looksLikeNotebookLmQuestion(message.content) &&
      next &&
      next.role === 'Assistant' &&
      next.content.length > Math.max(message.content.length * 2, 160)
    ) {
      return { role: 'User', content: message.content };
    }

    return message;
  });
}

function normalizeConversationForMarkdown(conversation) {
  const provider = String(conversation?.provider || '').trim().toLowerCase();
  if (provider !== 'notebooklm') return conversation;

  const nextMessages = normalizeNotebookLmMessages(conversation.messages);
  return {
    ...conversation,
    messages: nextMessages,
    messageCount: nextMessages.length
  };
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

function getConversationDocumentTitle(projectName, conversation) {
  return sanitizeFileName(
    String(conversation?.title || '').trim() || projectName,
    'AI-Sidebar'
  );
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
  conversation = normalizeConversationForMarkdown(conversation);
  const baseDir = getMarkdownBaseDir(options);
  const documentTitle = getConversationDocumentTitle(projectName, conversation);
  const dateKey = dateKeyFromTimestamp(conversation.createdAt || conversation.timestamp || conversation.updatedAt || Date.now());
  const dayDir = path.join(baseDir, dateKey);
  const { blockId, content } = buildConversationBlock(projectName, conversation);
  const existingFilePath = findExistingConversationFile(dayDir, blockId, documentTitle);
  const projectFileName = `${blockId}-${documentTitle}.md`;
  const filePath = existingFilePath || path.join(dayDir, projectFileName);
  const escapedBlockId = blockId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const blockPattern = new RegExp(`<!-- AI_SIDEBAR_BLOCK:${escapedBlockId}:START -->[\\s\\S]*?<!-- AI_SIDEBAR_BLOCK:${escapedBlockId}:END -->`, 'g');

  ensureDir(dayDir);

  let existing = '';
  if (fs.existsSync(filePath)) {
    existing = fs.readFileSync(filePath, 'utf8');
  }

  const header = `# ${documentTitle}\n\n`;
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
  RI_CONFIG_CANDIDATES,
  RI_EXPORT_SUBDIR,
  SYNC_DIR,
  SYNC_CONFIG_PATH,
  getMarkdownBaseDirDetails,
  getRiExportConfig,
  readSyncConfig,
  getMarkdownBaseDir,
  sanitizeFileName,
  upsertConversationMarkdown
};
