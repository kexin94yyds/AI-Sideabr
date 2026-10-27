/** Conversation history UI backed by the side panel's IndexedDB store. */

let allConversations = [];
let filteredConversations = [];

document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await loadConversations();
});

function getHistoryDb() {
  const db = window.ChatHistoryDB;
  if (!db) throw new Error('Conversation storage is unavailable');
  return db;
}

function findConversation(id) {
  return allConversations.find((conversation) => String(conversation.id) === String(id));
}

function getMessageCount(conversation) {
  return Array.isArray(conversation?.messages)
    ? conversation.messages.length
    : Number(conversation?.messageCount || 0);
}

function getConversationKey(conversation) {
  const conversationId = String(conversation?.conversationId || '').trim();
  if (conversationId) return `conversation:${conversationId}`;
  const provider = String(conversation?.provider || '').trim().toLowerCase();
  const url = String(conversation?.url || '').trim();
  if (url) return `url:${provider}:${url}`;
  return `fallback:${provider}:${String(conversation?.title || '').trim()}:${Number(conversation?.timestamp || 0)}`;
}

async function loadConversations() {
  try {
    allConversations = await getHistoryDb().getAll();
    applyFiltersAndSort();
    updateStatistics();
  } catch (error) {
    console.error('Failed to load conversations:', error);
    const container = document.getElementById('conversationList');
    if (!container) return;
    const message = document.createElement('div');
    message.className = 'empty-state';
    message.textContent = `Failed to load conversations: ${error?.message || 'Unknown error'}`;
    container.replaceChildren(message);
  }
}

function setupEventListeners() {
  document.getElementById('searchInput')?.addEventListener('input', applyFiltersAndSort);
  document.getElementById('providerFilter')?.addEventListener('change', applyFiltersAndSort);
  document.getElementById('sortBy')?.addEventListener('change', applyFiltersAndSort);
  document.getElementById('importBtn')?.addEventListener('click', () => document.getElementById('importFile')?.click());
  document.getElementById('importFile')?.addEventListener('change', handleImport);
  document.getElementById('exportAllBtn')?.addEventListener('click', exportAll);
  document.getElementById('clearAllBtn')?.addEventListener('click', clearAll);
  document.getElementById('closeViewModal')?.addEventListener('click', closeModal);
  document.getElementById('conversationList')?.addEventListener('click', handleConversationAction);
  window.addEventListener('click', (event) => {
    const modal = document.getElementById('viewModal');
    if (event.target === modal) closeModal();
  });
}

function applyFiltersAndSort() {
  const query = String(document.getElementById('searchInput')?.value || '').toLowerCase().trim();
  const provider = String(document.getElementById('providerFilter')?.value || '');
  const sortBy = String(document.getElementById('sortBy')?.value || 'newest');

  filteredConversations = allConversations.filter((conversation) => {
    const tags = Array.isArray(conversation?.tags) ? conversation.tags : [];
    const matchesQuery = !query || [conversation?.title, conversation?.content, conversation?.notes, ...tags]
      .some((value) => String(value || '').toLowerCase().includes(query));
    const matchesProvider = !provider || String(conversation?.provider || '') === provider;
    return matchesQuery && matchesProvider;
  });
  filteredConversations.sort((a, b) => {
    if (sortBy === 'oldest') return Number(a?.timestamp || 0) - Number(b?.timestamp || 0);
    if (sortBy === 'title') return String(a?.title || '').localeCompare(String(b?.title || ''));
    return Number(b?.timestamp || 0) - Number(a?.timestamp || 0);
  });
  renderConversations();
}

function createProviderBadge(provider) {
  const value = String(provider || 'unknown');
  const badge = document.createElement('span');
  const safeClass = value.toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'unknown';
  badge.className = `provider-badge provider-${safeClass}`;
  badge.textContent = value;
  return badge;
}

function createMetaItem(content) {
  const item = document.createElement('span');
  item.className = 'meta-item';
  if (content instanceof Node) item.appendChild(content);
  else item.textContent = String(content || '');
  return item;
}

function createActionButton(label, className, action, id) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `${className} btn-small`;
  button.dataset.action = action;
  button.dataset.id = String(id);
  button.textContent = label;
  return button;
}

function renderConversations() {
  const container = document.getElementById('conversationList');
  if (!container) return;
  container.replaceChildren();
  if (filteredConversations.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    const icon = document.createElement('div');
    icon.className = 'empty-state-icon';
    icon.textContent = '📭';
    const heading = document.createElement('h3');
    heading.textContent = 'No conversations found';
    const text = document.createElement('p');
    text.textContent = 'Start by saving a conversation from the extension popup';
    empty.append(icon, heading, text);
    container.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const conversation of filteredConversations) {
    const item = document.createElement('article');
    item.className = 'conversation-item';
    item.dataset.id = String(conversation.id);
    const header = document.createElement('div');
    header.className = 'conversation-header';
    const headerBody = document.createElement('div');
    headerBody.style.flex = '1';
    const title = document.createElement('div');
    title.className = 'conversation-title';
    const favorite = createActionButton(
      conversation.isFavorite ? '⭐' : '☆',
      `favorite-btn${conversation.isFavorite ? ' active' : ''}`,
      'favorite',
      conversation.id
    );
    const titleText = document.createElement('span');
    titleText.textContent = String(conversation.title || 'Untitled');
    title.append(favorite, titleText);

    const meta = document.createElement('div');
    meta.className = 'conversation-meta';
    meta.append(
      createMetaItem(createProviderBadge(conversation.provider)),
      createMetaItem(`📅 ${formatDate(conversation.timestamp)}`),
      createMetaItem(`💬 ${getMessageCount(conversation)} messages`)
    );
    const tags = Array.isArray(conversation.tags) ? conversation.tags : [];
    if (tags.length > 0) meta.appendChild(createMetaItem(`🏷️ ${tags.join(', ')}`));
    headerBody.append(title, meta);
    header.appendChild(headerBody);

    const actions = document.createElement('div');
    actions.className = 'conversation-actions';
    actions.append(
      createActionButton('👁️ View', 'btn-primary', 'view', conversation.id),
      createActionButton('📝 Export MD', 'btn-secondary', 'export-markdown', conversation.id),
      createActionButton('📦 Export JSON', 'btn-secondary', 'export-json', conversation.id),
      createActionButton('✏️ Edit', 'btn-secondary', 'edit', conversation.id),
      createActionButton('🗑️ Delete', 'btn-danger', 'delete', conversation.id)
    );
    item.append(header, actions);
    fragment.appendChild(item);
  }
  container.appendChild(fragment);
}

async function updateStatistics() {
  const favorites = allConversations.filter((conversation) => Boolean(conversation?.isFavorite)).length;
  const totalMessages = allConversations.reduce((total, conversation) => total + getMessageCount(conversation), 0);
  const storageSizeKB = Math.max(0, Math.round(new Blob([JSON.stringify(allConversations)]).size / 1024));
  document.getElementById('statTotal').textContent = String(allConversations.length);
  document.getElementById('statFavorites').textContent = String(favorites);
  document.getElementById('statMessages').textContent = String(totalMessages);
  document.getElementById('statStorage').textContent = `${storageSizeKB} KB`;
}

async function handleConversationAction(event) {
  const button = event.target.closest('button[data-action][data-id]');
  if (!button) return;
  const { action, id } = button.dataset;
  try {
    if (action === 'favorite') await toggleFavorite(id);
    if (action === 'view') viewConversation(id);
    if (action === 'export-markdown') exportConversation(id, 'markdown');
    if (action === 'export-json') exportConversation(id, 'json');
    if (action === 'edit') await editConversation(id);
    if (action === 'delete') await deleteConversationById(id);
  } catch (error) {
    console.error(`Conversation action failed (${action}):`, error);
    showError(error?.message || 'Conversation action failed');
  }
}

async function toggleFavorite(id) {
  const conversation = findConversation(id);
  if (!conversation) return;
  await getHistoryDb().update(conversation.id, { isFavorite: !conversation.isFavorite });
  await loadConversations();
}

function appendInfoRow(parent, label, value) {
  const row = document.createElement('div');
  row.style.marginBottom = '10px';
  const strong = document.createElement('strong');
  strong.textContent = `${label}: `;
  row.appendChild(strong);
  if (value instanceof Node) row.appendChild(value);
  else row.appendChild(document.createTextNode(String(value || '')));
  parent.appendChild(row);
}

function safeHttpUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
  } catch (_) {
    return '';
  }
}

function viewConversation(id) {
  const conversation = findConversation(id);
  if (!conversation) return;
  document.getElementById('modalTitle').textContent = String(conversation.title || 'Untitled');
  const modalContent = document.getElementById('modalContent');
  modalContent.replaceChildren();

  const info = document.createElement('div');
  info.style.cssText = 'margin-bottom:20px;padding:15px;background-color:#f8f9fa;border-radius:6px';
  appendInfoRow(info, 'Provider', createProviderBadge(conversation.provider));
  appendInfoRow(info, 'Date', formatDate(conversation.timestamp));
  appendInfoRow(info, 'Messages', getMessageCount(conversation));
  const sourceUrl = safeHttpUrl(conversation.url);
  if (sourceUrl) {
    const link = document.createElement('a');
    link.href = sourceUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = sourceUrl;
    appendInfoRow(info, 'Source', link);
  }
  if (conversation.notes) appendInfoRow(info, 'Notes', conversation.notes);
  modalContent.appendChild(info);

  const messages = Array.isArray(conversation.messages) ? conversation.messages : null;
  if (messages) {
    for (const message of messages) {
      const block = document.createElement('div');
      const isUser = String(message?.role || '').toLowerCase() === 'user';
      block.style.cssText = `margin-bottom:20px;padding:15px;background-color:${isUser ? '#e3f2fd' : '#f5f5f5'};border-radius:6px`;
      const role = document.createElement('div');
      role.style.cssText = `font-weight:600;margin-bottom:10px;color:${isUser ? '#1976d2' : '#666'}`;
      role.textContent = String(message?.role || 'Unknown');
      const content = document.createElement('div');
      content.style.cssText = 'white-space:pre-wrap;line-height:1.6';
      content.textContent = String(message?.content || '');
      block.append(role, content);
      modalContent.appendChild(block);
    }
  } else {
    const content = document.createElement('div');
    content.style.cssText = 'white-space:pre-wrap;line-height:1.6';
    content.textContent = String(conversation.content || '');
    modalContent.appendChild(content);
  }
  document.getElementById('viewModal').style.display = 'block';
}

function closeModal() {
  const modal = document.getElementById('viewModal');
  if (modal) modal.style.display = 'none';
}

function exportConversation(id, format) {
  const conversation = findConversation(id);
  if (!conversation) return;
  const isMarkdown = format === 'markdown';
  const content = isMarkdown
    ? generateMarkdown(conversation)
    : JSON.stringify({ version: '1.0', exportDate: new Date().toISOString(), ...conversation }, null, 2);
  const baseName = String(conversation.title || 'conversation').toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff_-]+/gi, '_').replace(/^_+|_+$/g, '') || 'conversation';
  downloadFile(`${baseName}.${isMarkdown ? 'md' : 'json'}`, content, isMarkdown ? 'text/markdown' : 'application/json');
  showSuccess(`Exported: ${conversation.title || 'Untitled'}`);
}

function generateMarkdown(conversation) {
  let markdown = `# ${conversation.title || 'Untitled'}\n\n`;
  markdown += `> **Provider:** ${conversation.provider || 'unknown'}\n`;
  markdown += `> **Date:** ${formatDate(conversation.timestamp)}\n`;
  if (conversation.url) markdown += `> **Source:** ${conversation.url}\n`;
  markdown += '\n---\n\n';
  if (conversation.notes) markdown += `**Notes:** ${conversation.notes}\n\n---\n\n`;
  if (Array.isArray(conversation.messages)) {
    for (const message of conversation.messages) {
      markdown += `### ${message?.role || 'Unknown'}\n\n${message?.content || ''}\n\n---\n\n`;
    }
  } else {
    markdown += String(conversation.content || '');
  }
  return markdown;
}

async function editConversation(id) {
  const conversation = findConversation(id);
  if (!conversation) return;
  const newTitle = prompt('Edit title:', conversation.title || '');
  if (!newTitle?.trim()) return;
  await getHistoryDb().update(conversation.id, { title: newTitle.trim() });
  await loadConversations();
  showSuccess('Title updated');
}

async function deleteConversationById(id) {
  const conversation = findConversation(id);
  if (!conversation) return;
  if (!confirm(`Delete conversation "${conversation.title || 'Untitled'}"?\n\nThis action cannot be undone.`)) return;
  await getHistoryDb().delete(conversation.id);
  await loadConversations();
  showSuccess('Conversation deleted');
}

function normalizeImportedConversation(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Conversation must be an object');
  const conversation = { ...raw };
  delete conversation.id;
  conversation.title = String(conversation.title || 'Untitled');
  conversation.provider = String(conversation.provider || 'unknown');
  conversation.timestamp = Number(conversation.timestamp || conversation.createdAt || Date.now());
  if (conversation.messages != null && !Array.isArray(conversation.messages)) {
    throw new Error('messages must be an array');
  }
  return conversation;
}

async function importConversationsData(data, mergeStrategy) {
  const db = getHistoryDb();
  const existing = await db.getAll();
  const byKey = new Map(existing.map((conversation) => [getConversationKey(conversation), conversation]));
  const results = { imported: 0, skipped: 0, updated: 0, errors: [] };

  for (let index = 0; index < data.conversations.length; index += 1) {
    try {
      const conversation = normalizeImportedConversation(data.conversations[index]);
      const key = getConversationKey(conversation);
      const duplicate = byKey.get(key);
      if (duplicate) {
        if (mergeStrategy === 'update') {
          const updated = await db.update(duplicate.id, conversation);
          byKey.set(key, updated);
          results.updated += 1;
        } else {
          results.skipped += 1;
        }
        continue;
      }

      const id = await db.add(conversation);
      byKey.set(key, { ...conversation, id });
      results.imported += 1;
    } catch (error) {
      results.errors.push({ index, error: error?.message || String(error) });
    }
  }
  return results;
}

async function handleImport(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!data?.version) throw new Error('Invalid export file: missing version field');
    if (!Array.isArray(data.conversations)) {
      throw new Error('Invalid export file: conversations must be an array');
    }

    const confirmMessage = `Import ${data.conversations.length} conversations?\n\n` +
      `Export Date: ${data.exportDate ? new Date(data.exportDate).toLocaleString() : 'Unknown'}\n` +
      `Version: ${data.version}\n\nDuplicate conversations will be skipped.\nContinue?`;
    if (!confirm(confirmMessage)) return;
    const mergeStrategy = confirm(
      'Update existing conversations?\n\nClick OK to UPDATE duplicates\nClick Cancel to SKIP duplicates'
    ) ? 'update' : 'skip';
    const results = await importConversationsData(data, mergeStrategy);

    let message = `Import complete!\n\n✓ Imported: ${results.imported}\n⊘ Skipped: ${results.skipped}\n`;
    if (results.updated > 0) message += `↻ Updated: ${results.updated}\n`;
    if (results.errors.length > 0) {
      message += `✗ Errors: ${results.errors.length}\n\nFirst error: ${results.errors[0].error}`;
    }
    alert(message);
    await loadConversations();
  } catch (error) {
    console.error('Import failed:', error);
    showError(`Import failed: ${error.message}`);
  } finally {
    event.target.value = '';
  }
}

async function exportAll() {
  try {
    const conversations = await getHistoryDb().getAll();
    const data = { version: '1.0', exportDate: new Date().toISOString(), conversations };
    downloadFile(`ai-chat-export-${Date.now()}.json`, JSON.stringify(data, null, 2), 'application/json');
    showSuccess(`Exported ${conversations.length} conversations`);
  } catch (error) {
    console.error('Export all failed:', error);
    showError('Export failed');
  }
}

async function clearAll() {
  if (!confirm(`Delete ALL conversations?\n\nThis will delete ${allConversations.length} conversations.\n\nThis action cannot be undone!`)) return;
  if (!confirm('Are you absolutely sure? This is your last chance!')) return;
  try {
    await getHistoryDb().clear();
    await loadConversations();
    showSuccess('All conversations cleared');
  } catch (error) {
    console.error('Clear all failed:', error);
    showError('Failed to clear conversations');
  }
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function formatDate(timestamp) {
  const date = new Date(Number(timestamp || 0));
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function showSuccess(message) {
  alert(`✓ ${message}`);
}

function showError(message) {
  alert(`✗ ${message}`);
}
