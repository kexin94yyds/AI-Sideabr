/**
 * History Management UI
 */

let allConversations = [];
let filteredConversations = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadConversations();
  setupEventListeners();
});

// Load all conversations
async function loadConversations() {
  try {
    allConversations = await getAllConversations();
    filteredConversations = [...allConversations];
    renderConversations();
    updateStatistics();
  } catch (error) {
    console.error('Failed to load conversations:', error);
    showError('Failed to load conversations');
  }
}

// Setup event listeners
function setupEventListeners() {
  document.getElementById('searchInput').addEventListener('input', handleSearch);
  document.getElementById('providerFilter').addEventListener('change', handleFilter);
  document.getElementById('sortBy').addEventListener('change', handleSort);
  document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('importFile').click();
  });
  document.getElementById('importFile').addEventListener('change', handleImport);
  document.getElementById('exportAllBtn').addEventListener('click', exportAll);
  document.getElementById('clearAllBtn').addEventListener('click', clearAll);
}

// Handle search
function handleSearch(e) {
  const query = e.target.value.toLowerCase().trim();
  
  if (!query) {
    filteredConversations = [...allConversations];
  } else {
    filteredConversations = allConversations.filter(conv => 
      conv.title.toLowerCase().includes(query) ||
      conv.content.toLowerCase().includes(query) ||
      conv.notes.toLowerCase().includes(query) ||
      conv.tags.some(tag => tag.toLowerCase().includes(query))
    );
  }
  
  handleFilter();
}

// Handle filter
function handleFilter() {
  const provider = document.getElementById('providerFilter').value;
  
  if (provider) {
    filteredConversations = filteredConversations.filter(conv => 
      conv.provider === provider
    );
  }
  
  handleSort();
}

// Handle sort
function handleSort() {
  const sortBy = document.getElementById('sortBy').value;
  
  filteredConversations.sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return b.timestamp - a.timestamp;
      case 'oldest':
        return a.timestamp - b.timestamp;
      case 'title':
        return a.title.localeCompare(b.title);
      default:
        return 0;
    }
  });
  
  renderConversations();
}

// Render conversations
function renderConversations() {
  const listContainer = document.getElementById('conversationList');
  
  if (filteredConversations.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <h3>No conversations found</h3>
        <p>Start by saving a conversation from the extension popup</p>
      </div>
    `;
    return;
  }
  
  listContainer.innerHTML = filteredConversations.map(conv => `
    <div class="conversation-item" data-id="${conv.id}">
      <div class="conversation-header">
        <div style="flex: 1;">
          <div class="conversation-title">
            <button class="favorite-btn ${conv.isFavorite ? 'active' : ''}" 
                    onclick="toggleFavorite('${conv.id}')">
              ${conv.isFavorite ? '⭐' : '☆'}
            </button>
            ${escapeHtml(conv.title)}
          </div>
          <div class="conversation-meta">
            <span class="meta-item">
              <span class="provider-badge provider-${conv.provider}">${conv.provider}</span>
            </span>
            <span class="meta-item">📅 ${formatDate(conv.timestamp)}</span>
            <span class="meta-item">💬 ${conv.messageCount} messages</span>
            ${conv.tags.length > 0 ? `<span class="meta-item">🏷️ ${conv.tags.join(', ')}</span>` : ''}
          </div>
        </div>
      </div>
      
      <div class="conversation-actions">
        <button class="btn-primary btn-small" onclick="viewConversation('${conv.id}')">
          👁️ View
        </button>
        <button class="btn-secondary btn-small" onclick="exportConversation('${conv.id}', 'markdown')">
          📝 Export MD
        </button>
        <button class="btn-secondary btn-small" onclick="exportConversation('${conv.id}', 'json')">
          📦 Export JSON
        </button>
        <button class="btn-secondary btn-small" onclick="editConversation('${conv.id}')">
          ✏️ Edit
        </button>
        <button class="btn-danger btn-small" onclick="deleteConversation('${conv.id}')">
          🗑️ Delete
        </button>
      </div>
    </div>
  `).join('');
}

// Update statistics
async function updateStatistics() {
  const stats = await getStatistics();
  
  document.getElementById('statTotal').textContent = stats.total;
  document.getElementById('statFavorites').textContent = stats.favorites;
  document.getElementById('statMessages').textContent = stats.totalMessages;
  document.getElementById('statStorage').textContent = `${stats.storageSizeKB} KB`;
}

// Toggle favorite
async function toggleFavorite(id) {
  try {
    const conv = allConversations.find(c => c.id === id);
    if (!conv) return;
    
    await updateConversation(id, { isFavorite: !conv.isFavorite });
    await loadConversations();
  } catch (error) {
    console.error('Failed to toggle favorite:', error);
    showError('Failed to update favorite status');
  }
}

// View conversation
function viewConversation(id) {
  const conv = allConversations.find(c => c.id === id);
  if (!conv) return;
  
  document.getElementById('modalTitle').textContent = conv.title;
  
  // Render messages
  let content = `
    <div style="margin-bottom: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 6px;">
      <div style="margin-bottom: 10px;">
        <strong>Provider:</strong> <span class="provider-badge provider-${conv.provider}">${conv.provider}</span>
      </div>
      <div style="margin-bottom: 10px;">
        <strong>Date:</strong> ${formatDate(conv.timestamp)}
      </div>
      <div style="margin-bottom: 10px;">
        <strong>Messages:</strong> ${conv.messageCount}
      </div>
      ${conv.url ? `<div style="margin-bottom: 10px;"><strong>Source:</strong> <a href="${conv.url}" target="_blank">${conv.url}</a></div>` : ''}
      ${conv.notes ? `<div><strong>Notes:</strong> ${escapeHtml(conv.notes)}</div>` : ''}
    </div>
  `;
  
  if (conv.messages && Array.isArray(conv.messages)) {
    content += conv.messages.map(msg => `
      <div style="margin-bottom: 20px; padding: 15px; background-color: ${msg.role === 'User' ? '#e3f2fd' : '#f5f5f5'}; border-radius: 6px;">
        <div style="font-weight: 600; margin-bottom: 10px; color: ${msg.role === 'User' ? '#1976d2' : '#666'};">
          ${msg.role}
        </div>
        <div style="white-space: pre-wrap; line-height: 1.6;">
          ${escapeHtml(msg.content)}
        </div>
      </div>
    `).join('');
  } else {
    content += `<div style="white-space: pre-wrap; line-height: 1.6;">${escapeHtml(conv.content)}</div>`;
  }
  
  document.getElementById('modalContent').innerHTML = content;
  document.getElementById('viewModal').style.display = 'block';
}

// Close modal
function closeModal() {
  document.getElementById('viewModal').style.display = 'none';
}

// Click outside modal to close
window.onclick = function(event) {
  const modal = document.getElementById('viewModal');
  if (event.target === modal) {
    closeModal();
  }
}

// Export conversation
async function exportConversation(id, format) {
  const conv = allConversations.find(c => c.id === id);
  if (!conv) return;
  
  try {
    let content, filename, mimeType;
    
    if (format === 'markdown') {
      content = generateMarkdown(conv);
      filename = `${conv.title.toLowerCase().replace(/\s+/g, '_')}.md`;
      mimeType = 'text/markdown';
    } else if (format === 'json') {
      content = JSON.stringify({
        version: '1.0',
        exportDate: new Date().toISOString(),
        ...conv
      }, null, 2);
      filename = `${conv.title.toLowerCase().replace(/\s+/g, '_')}.json`;
      mimeType = 'application/json';
    }
    
    downloadFile(filename, content, mimeType);
    showSuccess(`Exported: ${conv.title}`);
  } catch (error) {
    console.error('Export failed:', error);
    showError('Export failed');
  }
}

// Generate Markdown from conversation
function generateMarkdown(conv) {
  let md = `# ${conv.title}\n\n`;
  md += `> **Provider:** ${conv.provider}\n`;
  md += `> **Date:** ${formatDate(conv.timestamp)}\n`;
  if (conv.url) {
    md += `> **Source:** [${conv.url}](${conv.url})\n`;
  }
  md += `\n---\n\n`;
  
  if (conv.notes) {
    md += `**Notes:** ${conv.notes}\n\n---\n\n`;
  }
  
  if (conv.messages && Array.isArray(conv.messages)) {
    conv.messages.forEach(msg => {
      md += `### ${msg.role}\n\n${msg.content}\n\n---\n\n`;
    });
  } else {
    md += conv.content;
  }
  
  return md;
}

// Edit conversation
function editConversation(id) {
  const conv = allConversations.find(c => c.id === id);
  if (!conv) return;
  
  const newTitle = prompt('Edit title:', conv.title);
  if (newTitle && newTitle.trim()) {
    updateConversation(id, { title: newTitle.trim() })
      .then(() => {
        loadConversations();
        showSuccess('Title updated');
      })
      .catch(error => {
        console.error('Failed to update title:', error);
        showError('Failed to update title');
      });
  }
}

// Delete conversation
async function deleteConversation(id) {
  const conv = allConversations.find(c => c.id === id);
  if (!conv) return;
  
  if (confirm(`Delete conversation "${conv.title}"?\n\nThis action cannot be undone.`)) {
    try {
      await window.deleteConversation(id);
      await loadConversations();
      showSuccess('Conversation deleted');
    } catch (error) {
      console.error('Failed to delete:', error);
      showError('Failed to delete conversation');
    }
  }
}

// Handle import
async function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    
    // Validate data structure
    if (!data.version) {
      throw new Error('Invalid export file: missing version field');
    }
    
    if (!data.conversations || !Array.isArray(data.conversations)) {
      throw new Error('Invalid export file: conversations must be an array');
    }
    
    // Show import preview
    const confirmMsg = `Import ${data.conversations.length} conversations?\n\n` +
      `Export Date: ${data.exportDate ? new Date(data.exportDate).toLocaleString() : 'Unknown'}\n` +
      `Version: ${data.version}\n\n` +
      `Duplicate conversations will be skipped.\n` +
      `Continue?`;
    
    if (!confirm(confirmMsg)) {
      e.target.value = '';
      return;
    }
    
    // Choose merge strategy
    const mergeStrategy = confirm(
      'Update existing conversations?\n\n' +
      'Click OK to UPDATE duplicates\n' +
      'Click Cancel to SKIP duplicates'
    ) ? 'update' : 'skip';
    
    // Import data
    const results = await importData(data, mergeStrategy);
    
    // Show results
    let message = `Import complete!\n\n`;
    message += `✓ Imported: ${results.imported}\n`;
    message += `⊘ Skipped: ${results.skipped}\n`;
    if (results.updated > 0) {
      message += `↻ Updated: ${results.updated}\n`;
    }
    if (results.errors.length > 0) {
      message += `✗ Errors: ${results.errors.length}\n\n`;
      message += `First error: ${results.errors[0].error}`;
    }
    
    alert(message);
    
    // Reload conversations
    await loadConversations();
    
  } catch (error) {
    console.error('Import failed:', error);
    showError(`Import failed: ${error.message}`);
  } finally {
    e.target.value = '';
  }
}

// Export all
async function exportAll() {
  try {
    const data = await exportAllData();
    const content = JSON.stringify(data, null, 2);
    const filename = `ai-chat-export-${Date.now()}.json`;
    downloadFile(filename, content, 'application/json');
    showSuccess(`Exported ${data.conversations.length} conversations`);
  } catch (error) {
    console.error('Export all failed:', error);
    showError('Export failed');
  }
}

// Clear all
async function clearAll() {
  if (confirm(`Delete ALL conversations?\n\nThis will delete ${allConversations.length} conversations.\n\nThis action cannot be undone!`)) {
    if (confirm('Are you absolutely sure? This is your last chance!')) {
      try {
        await clearAllConversations();
        await loadConversations();
        showSuccess('All conversations cleared');
      } catch (error) {
        console.error('Clear all failed:', error);
        showError('Failed to clear conversations');
      }
    }
  }
}

// Helper: Download file
function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Helper: Format date
function formatDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Helper: Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Helper: Show success message
function showSuccess(message) {
  alert(`✓ ${message}`);
}

// Helper: Show error message
function showError(message) {
  alert(`✗ ${message}`);
}

// Make functions global for inline onclick
window.toggleFavorite = toggleFavorite;
window.viewConversation = viewConversation;
window.closeModal = closeModal;
window.exportConversation = exportConversation;
window.editConversation = editConversation;
window.deleteConversation = deleteConversation;
