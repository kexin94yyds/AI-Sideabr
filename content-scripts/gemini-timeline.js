"use strict";
(() => {
  // ../gemini-voyager/src/core/types/common.ts
  var StorageKeys = {
    // Folder system
    FOLDER_DATA: "gvFolderData",
    FOLDER_DATA_AISTUDIO: "gvFolderDataAIStudio",
    // Timeline
    TIMELINE_SCROLL_MODE: "geminiTimelineScrollMode",
    TIMELINE_HIDE_CONTAINER: "geminiTimelineHideContainer",
    TIMELINE_DRAGGABLE: "geminiTimelineDraggable",
    TIMELINE_POSITION: "geminiTimelinePosition",
    TIMELINE_STARRED_MESSAGES: "geminiTimelineStarredMessages",
    TIMELINE_SHORTCUTS: "geminiTimelineShortcuts",
    // UI customization
    CHAT_WIDTH: "geminiChatWidth",
    // Prompt Manager
    PROMPT_ITEMS: "gvPromptItems",
    PROMPT_PANEL_LOCKED: "gvPromptPanelLocked",
    PROMPT_PANEL_POSITION: "gvPromptPanelPosition",
    PROMPT_TRIGGER_POSITION: "gvPromptTriggerPosition",
    PROMPT_CUSTOM_WEBSITES: "gvPromptCustomWebsites",
    // Global settings
    LANGUAGE: "language",
    FORMULA_COPY_FORMAT: "gvFormulaCopyFormat",
    // Input behavior
    CTRL_ENTER_SEND: "gvCtrlEnterSend",
    // Default Model
    DEFAULT_MODEL: "gvDefaultModel",
    // Folder filtering
    GV_FOLDER_FILTER_USER_ONLY: "gvFolderFilterUserOnly",
    // Sidebar behavior
    GV_SIDEBAR_AUTO_HIDE: "gvSidebarAutoHide",
    // Folder spacing
    GV_FOLDER_SPACING: "gvFolderSpacing",
    GV_AISTUDIO_FOLDER_SPACING: "gvAIStudioFolderSpacing",
    GV_FOLDER_TREE_INDENT: "gvFolderTreeIndent"
  };

  // ../gemini-voyager/src/core/services/KeyboardShortcutService.ts
  var DEFAULT_SHORTCUTS = {
    previous: {
      action: "timeline:previous",
      modifiers: [],
      key: "k"
    },
    next: {
      action: "timeline:next",
      modifiers: [],
      key: "j"
    }
  };
  var KeyboardShortcutService = class _KeyboardShortcutService {
    static instance = null;
    config;
    enabled = true;
    listeners = /* @__PURE__ */ new Set();
    keydownHandler = null;
    storageChangeHandler = null;
    constructor() {
      this.config = DEFAULT_SHORTCUTS;
    }
    /**
     * Get singleton instance (Factory Pattern)
     */
    static getInstance() {
      if (!_KeyboardShortcutService.instance) {
        _KeyboardShortcutService.instance = new _KeyboardShortcutService();
      }
      return _KeyboardShortcutService.instance;
    }
    /**
     * Initialize service: load config and attach listeners
     */
    async init() {
      await this.loadConfig();
      this.attachKeyboardListener();
      this.attachStorageListener();
    }
    /**
     * Load configuration from chrome storage
     */
    async loadConfig() {
      try {
        if (typeof chrome !== "undefined" && chrome.storage?.sync) {
          const result = await chrome.storage.sync.get(StorageKeys.TIMELINE_SHORTCUTS);
          const stored = result[StorageKeys.TIMELINE_SHORTCUTS];
          if (stored?.shortcuts) {
            this.config = this.validateConfig(stored.shortcuts) ? stored.shortcuts : DEFAULT_SHORTCUTS;
            this.enabled = stored.enabled ?? true;
          }
        } else {
          const stored = localStorage.getItem(StorageKeys.TIMELINE_SHORTCUTS);
          if (stored) {
            const parsed = JSON.parse(stored);
            this.config = this.validateConfig(parsed.shortcuts) ? parsed.shortcuts : DEFAULT_SHORTCUTS;
            this.enabled = parsed.enabled ?? true;
          }
        }
      } catch (error) {
        console.warn("[KeyboardShortcut] Failed to load config, using defaults:", error);
        this.config = DEFAULT_SHORTCUTS;
        this.enabled = true;
      }
    }
    /**
     * Save configuration to chrome storage
     */
    async saveConfig(config, enabled = this.enabled) {
      if (!this.validateConfig(config)) {
        throw new Error("Invalid shortcut configuration");
      }
      this.config = config;
      this.enabled = enabled;
      const storage = {
        shortcuts: config,
        enabled
      };
      try {
        if (typeof chrome !== "undefined" && chrome.storage?.sync) {
          await chrome.storage.sync.set({ [StorageKeys.TIMELINE_SHORTCUTS]: storage });
        } else {
          localStorage.setItem(StorageKeys.TIMELINE_SHORTCUTS, JSON.stringify(storage));
        }
      } catch (error) {
        console.error("[KeyboardShortcut] Failed to save config:", error);
        throw error;
      }
    }
    /**
     * Validate shortcut configuration
     */
    validateConfig(config) {
      try {
        return !!(config.previous && config.next && this.isValidShortcut(config.previous) && this.isValidShortcut(config.next));
      } catch {
        return false;
      }
    }
    /**
     * Validate individual shortcut
     */
    isValidShortcut(shortcut) {
      const validModifiers = ["Alt", "Ctrl", "Shift", "Meta"];
      return Array.isArray(shortcut.modifiers) && shortcut.modifiers.every((m) => validModifiers.includes(m)) && typeof shortcut.key === "string" && shortcut.key.length > 0;
    }
    /**
     * Attach keyboard event listener
     */
    attachKeyboardListener() {
      if (this.keydownHandler)
        return;
      this.keydownHandler = (event) => {
        if (!this.enabled)
          return;
        if (this.isTypingInInputField(event))
          return;
        const match = this.matchShortcut(event);
        if (match) {
          event.preventDefault();
          event.stopPropagation();
          this.notifyListeners(match.action, event);
        }
      };
      window.addEventListener("keydown", this.keydownHandler, { capture: true });
    }
    /**
     * Check if user is typing in an input field
     * Prevents shortcuts from interfering with text input
     */
    isTypingInInputField(event) {
      const target = event.target;
      if (!target)
        return false;
      const tagName = target.tagName.toLowerCase();
      const isEditable = target.isContentEditable;
      const isInput = tagName === "input" || tagName === "textarea" || tagName === "select";
      return isEditable || isInput;
    }
    /**
     * Attach storage change listener for cross-tab sync
     */
    attachStorageListener() {
      if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
        this.storageChangeHandler = (changes, areaName) => {
          if (areaName !== "sync")
            return;
          if (changes[StorageKeys.TIMELINE_SHORTCUTS]) {
            const newValue = changes[StorageKeys.TIMELINE_SHORTCUTS].newValue;
            if (newValue?.shortcuts) {
              this.config = this.validateConfig(newValue.shortcuts) ? newValue.shortcuts : DEFAULT_SHORTCUTS;
              this.enabled = newValue.enabled ?? true;
            }
          }
        };
        chrome.storage.onChanged.addListener(this.storageChangeHandler);
      }
    }
    /**
     * Match keyboard event to shortcut (Strategy Pattern)
     */
    matchShortcut(event) {
      const shortcuts = [
        { action: "timeline:previous", config: this.config.previous },
        { action: "timeline:next", config: this.config.next }
      ];
      for (const { action, config } of shortcuts) {
        if (this.isShortcutPressed(event, config)) {
          return { action, event };
        }
      }
      return null;
    }
    /**
     * Check if specific shortcut is pressed
     */
    isShortcutPressed(event, shortcut) {
      if (event.key !== shortcut.key)
        return false;
      const hasAlt = shortcut.modifiers.includes("Alt");
      const hasCtrl = shortcut.modifiers.includes("Ctrl");
      const hasShift = shortcut.modifiers.includes("Shift");
      const hasMeta = shortcut.modifiers.includes("Meta");
      return event.altKey === hasAlt && event.ctrlKey === hasCtrl && event.shiftKey === hasShift && event.metaKey === hasMeta;
    }
    /**
     * Notify all registered listeners (Observer Pattern)
     */
    notifyListeners(action, event) {
      this.listeners.forEach((callback) => {
        try {
          callback(action, event);
        } catch (error) {
          console.error("[KeyboardShortcut] Error in listener callback:", error);
        }
      });
    }
    /**
     * Register a shortcut callback
     */
    on(callback) {
      this.listeners.add(callback);
      return () => this.off(callback);
    }
    /**
     * Unregister a shortcut callback
     */
    off(callback) {
      this.listeners.delete(callback);
    }
    /**
     * Get current configuration
     */
    getConfig() {
      return {
        config: { ...this.config },
        enabled: this.enabled
      };
    }
    /**
     * Reset to default shortcuts
     */
    async resetToDefaults() {
      await this.saveConfig(DEFAULT_SHORTCUTS, true);
    }
    /**
     * Enable/disable shortcuts
     */
    async setEnabled(enabled) {
      this.enabled = enabled;
      await this.saveConfig(this.config, enabled);
    }
    /**
     * Format shortcut for display (e.g., "Alt + ↑" or "j")
     */
    formatShortcut(shortcut) {
      const keySymbols = {
        ArrowUp: "\u2191",
        ArrowDown: "\u2193",
        ArrowLeft: "\u2190",
        ArrowRight: "\u2192",
        " ": "Space",
        Enter: "\u23CE",
        Tab: "\u21E5",
        Backspace: "\u232B",
        Delete: "\u2326",
        Escape: "Esc"
      };
      const key = keySymbols[shortcut.key] || shortcut.key;
      if (shortcut.modifiers.length === 0) {
        return key;
      }
      const parts = [...shortcut.modifiers, key];
      return parts.join(" + ");
    }
    /**
     * Cleanup service
     */
    destroy() {
      if (this.keydownHandler) {
        window.removeEventListener("keydown", this.keydownHandler, { capture: true });
        this.keydownHandler = null;
      }
      if (this.storageChangeHandler && typeof chrome !== "undefined" && chrome.storage?.onChanged) {
        chrome.storage.onChanged.removeListener(this.storageChangeHandler);
        this.storageChangeHandler = null;
      }
      this.listeners.clear();
    }
  };
  var keyboardShortcutService = KeyboardShortcutService.getInstance();

  // shim:webextension-polyfill
  var api = typeof browser !== "undefined" && browser ? browser : typeof chrome !== "undefined" ? chrome : {};
  var webextension_polyfill_default = api;

  // ../gemini-voyager/src/utils/language.ts
  function normalizeLanguage(lang) {
    if (!lang)
      return "en";
    const lower = lang.toLowerCase();
    if (lower.startsWith("zh-tw") || lower.startsWith("zh_tw") || lower.startsWith("zh-hk") || lower.includes("hant"))
      return "zh_TW";
    if (lower.startsWith("zh"))
      return "zh";
    if (lower.startsWith("ja"))
      return "ja";
    if (lower.startsWith("fr"))
      return "fr";
    if (lower.startsWith("es"))
      return "es";
    if (lower.startsWith("pt"))
      return "pt";
    if (lower.startsWith("ar"))
      return "ar";
    if (lower.startsWith("ru"))
      return "ru";
    if (lower.startsWith("ko"))
      return "ko";
    return "en";
  }

  // ../gemini-voyager/src/locales/ar/messages.json
  var messages_default = {
    extName: {
      message: "Gemini Voyager",
      description: "Extension name"
    },
    extDescription: {
      message: "\u0639\u0632\u0632 \u062A\u062C\u0631\u0628\u0629 Gemini: \u062C\u062F\u0648\u0644 \u0632\u0645\u0646\u064A\u060C \u0645\u062C\u0644\u062F\u0627\u062A\u060C \u0645\u0637\u0627\u0644\u0628\u0627\u062A\u060C \u0648\u062A\u0635\u062F\u064A\u0631.",
      description: "Extension description"
    },
    scrollMode: {
      message: "\u0648\u0636\u0639 \u0627\u0644\u062A\u0645\u0631\u064A\u0631",
      description: "Scroll mode label"
    },
    flow: {
      message: "\u062A\u062F\u0641\u0642",
      description: "Flow mode"
    },
    jump: {
      message: "\u0642\u0641\u0632",
      description: "Jump mode"
    },
    hideOuterContainer: {
      message: "\u0625\u062E\u0641\u0627\u0621 \u0627\u0644\u062D\u0627\u0648\u064A\u0629 \u0627\u0644\u062E\u0627\u0631\u062C\u064A\u0629",
      description: "Hide outer container label"
    },
    draggableTimeline: {
      message: "\u062C\u062F\u0648\u0644 \u0632\u0645\u0646\u064A \u0642\u0627\u0628\u0644 \u0644\u0644\u0633\u062D\u0628",
      description: "Draggable Timeline label"
    },
    enableMarkerLevel: {
      message: "\u062A\u0645\u0643\u064A\u0646 \u0645\u0633\u062A\u0648\u064A\u0627\u062A \u0627\u0644\u0639\u0642\u062F\u0629",
      description: "Enable timeline node level feature"
    },
    enableMarkerLevelHint: {
      message: "\u0627\u0646\u0642\u0631 \u0628\u0632\u0631 \u0627\u0644\u0645\u0627\u0648\u0633 \u0627\u0644\u0623\u064A\u0645\u0646 \u0641\u0648\u0642 \u0639\u0642\u062F \u0627\u0644\u062C\u062F\u0648\u0644 \u0627\u0644\u0632\u0645\u0646\u064A \u0644\u062A\u0639\u064A\u064A\u0646 \u0645\u0633\u062A\u0648\u0627\u0647\u0627 \u0648\u0637\u064A \u0627\u0644\u0639\u0646\u0627\u0635\u0631 \u0627\u0644\u0641\u0631\u0639\u064A\u0629",
      description: "Node level feature hint"
    },
    experimentalLabel: {
      message: "\u062A\u062C\u0631\u064A\u0628\u064A",
      description: "Experimental feature label"
    },
    resetPosition: {
      message: "\u0625\u0639\u0627\u062F\u0629 \u062A\u0639\u064A\u064A\u0646 \u0627\u0644\u0645\u0648\u0636\u0639",
      description: "Reset Position button"
    },
    resetTimelinePosition: {
      message: "\u0625\u0639\u0627\u062F\u0629 \u062A\u0639\u064A\u064A\u0646 \u0645\u0648\u0636\u0639 \u0627\u0644\u062C\u062F\u0648\u0644 \u0627\u0644\u0632\u0645\u0646\u064A",
      description: "Reset timeline position button in timeline options"
    },
    language: {
      message: "\u0627\u0644\u0644\u063A\u0629",
      description: "Language label"
    },
    pm_title: {
      message: "Gemini Voyager",
      description: "Prompt Manager title"
    },
    pm_add: {
      message: "\u0625\u0636\u0627\u0641\u0629",
      description: "Add prompt button"
    },
    pm_search_placeholder: {
      message: "\u0627\u0644\u0628\u062D\u062B \u0641\u064A \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0627\u062A \u0623\u0648 \u0627\u0644\u0639\u0644\u0627\u0645\u0627\u062A",
      description: "Search placeholder"
    },
    pm_import: {
      message: "\u0627\u0633\u062A\u064A\u0631\u0627\u062F",
      description: "Import button"
    },
    pm_export: {
      message: "\u062A\u0635\u062F\u064A\u0631",
      description: "Export button"
    },
    pm_prompt_placeholder: {
      message: "\u0646\u0635 \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0629",
      description: "Prompt textarea placeholder"
    },
    pm_tags_placeholder: {
      message: "\u0627\u0644\u0639\u0644\u0627\u0645\u0627\u062A (\u0645\u0641\u0635\u0648\u0644\u0629 \u0628\u0641\u0648\u0627\u0635\u0644)",
      description: "Tags input placeholder"
    },
    pm_save: {
      message: "\u062D\u0641\u0638",
      description: "Save prompt"
    },
    pm_cancel: {
      message: "\u0625\u0644\u063A\u0627\u0621",
      description: "Cancel"
    },
    pm_all_tags: {
      message: "\u0627\u0644\u0643\u0644",
      description: "All tags chip"
    },
    pm_empty: {
      message: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u0637\u0627\u0644\u0628\u0627\u062A \u062D\u062A\u0649 \u0627\u0644\u0622\u0646",
      description: "Empty state"
    },
    pm_copy: {
      message: "\u0646\u0633\u062E",
      description: "Copy prompt"
    },
    pm_copied: {
      message: "\u062A\u0645 \u0627\u0644\u0646\u0633\u062E",
      description: "Copied notice"
    },
    pm_delete: {
      message: "\u062D\u0630\u0641",
      description: "Delete prompt"
    },
    pm_delete_confirm: {
      message: "\u0647\u0644 \u062A\u0631\u064A\u062F \u062D\u0630\u0641 \u0647\u0630\u0647 \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0629\u061F",
      description: "Delete confirm"
    },
    pm_lock: {
      message: "\u0642\u0641\u0644 \u0627\u0644\u0645\u0648\u0636\u0639",
      description: "Lock panel position"
    },
    pm_unlock: {
      message: "\u0641\u062A\u062D \u0627\u0644\u0645\u0648\u0636\u0639",
      description: "Unlock panel position"
    },
    pm_import_invalid: {
      message: "\u062A\u0646\u0633\u064A\u0642 \u0645\u0644\u0641 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D",
      description: "Import invalid"
    },
    pm_import_success: {
      message: "\u062A\u0645 \u0627\u0633\u062A\u064A\u0631\u0627\u062F {count} \u0645\u0637\u0627\u0644\u0628\u0629",
      description: "Import success"
    },
    pm_duplicate: {
      message: "\u062A\u0643\u0631\u0627\u0631 \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0629",
      description: "Duplicate on add"
    },
    pm_deleted: {
      message: "\u062A\u0645 \u0627\u0644\u062D\u0630\u0641",
      description: "Deleted notice"
    },
    pm_edit: {
      message: "\u062A\u0639\u062F\u064A\u0644",
      description: "Edit prompt"
    },
    pm_expand: {
      message: "\u062A\u0648\u0633\u064A\u0639",
      description: "Expand prompt text"
    },
    pm_collapse: {
      message: "\u0637\u064A",
      description: "Collapse prompt text"
    },
    pm_saved: {
      message: "\u062A\u0645 \u0627\u0644\u062D\u0641\u0638",
      description: "Saved notice"
    },
    pm_settings: {
      message: "\u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A",
      description: "Settings button"
    },
    pm_settings_tooltip: {
      message: "\u0641\u062A\u062D \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0627\u0645\u062A\u062F\u0627\u062F",
      description: "Settings button tooltip"
    },
    pm_settings_fallback: {
      message: "\u064A\u0631\u062C\u0649 \u0627\u0644\u0646\u0642\u0631 \u0641\u0648\u0642 \u0631\u0645\u0632 \u0627\u0644\u0627\u0645\u062A\u062F\u0627\u062F \u0641\u064A \u0634\u0631\u064A\u0637 \u0627\u0644\u0645\u062A\u0635\u0641\u062D \u0644\u0641\u062A\u062D \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A",
      description: "Settings open failed message"
    },
    pm_backup: {
      message: "\u0646\u0633\u062E \u0627\u062D\u062A\u064A\u0627\u0637\u064A \u0645\u062D\u0644\u064A",
      description: "Local backup button"
    },
    pm_backup_tooltip: {
      message: "\u0646\u0633\u062E \u0627\u062D\u062A\u064A\u0627\u0637\u064A \u0644\u0644\u0645\u0637\u0627\u0644\u0628\u0627\u062A \u0648\u0627\u0644\u0645\u062C\u0644\u062F\u0627\u062A \u0641\u064A \u0645\u062C\u0644\u062F \u0645\u062D\u062F\u062F \u0628\u062E\u062A\u0645 \u0632\u0645\u0646\u064A",
      description: "Backup button tooltip"
    },
    pm_backup_cancelled: {
      message: "\u062A\u0645 \u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0646\u0633\u062E \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A",
      description: "Backup cancelled hint"
    },
    pm_backup_error: {
      message: "\u2717 \u0641\u0634\u0644 \u0627\u0644\u0646\u0633\u062E \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A",
      description: "Backup failed hint"
    },
    pm_backup_hint_options: {
      message: "\u062A\u0645 \u062F\u0645\u062C \u0627\u0644\u0645\u064A\u0632\u0629 \u0641\u064A \u0645\u062F\u064A\u0631 \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0627\u062A \u0639\u0644\u0649 \u0635\u0641\u062D\u0629 Gemini.",
      description: "Backup hint in options page"
    },
    pm_backup_step1: {
      message: "\u0627\u0641\u062A\u062D \u0635\u0641\u062D\u0629 Gemini (gemini.google.com)",
      description: "Backup step 1"
    },
    pm_backup_step2: {
      message: "\u0627\u0646\u0642\u0631 \u0641\u0648\u0642 \u0631\u0645\u0632 \u0627\u0644\u0627\u0645\u062A\u062F\u0627\u062F \u0641\u064A \u0623\u0633\u0641\u0644 \u0627\u0644\u064A\u0645\u064A\u0646 \u0644\u0641\u062A\u062D \u0645\u062F\u064A\u0631 \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0627\u062A",
      description: "Backup step 2"
    },
    pm_backup_step3: {
      message: '\u0627\u0646\u0642\u0631 \u0641\u0648\u0642 \u0632\u0631 "\u{1F4BE} \u0646\u0633\u062E \u0627\u062D\u062A\u064A\u0627\u0637\u064A \u0645\u062D\u0644\u064A" \u0648\u062D\u062F\u062F \u0645\u062C\u0644\u062F \u0627\u0644\u0646\u0633\u062E \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A',
      description: "Backup step 3"
    },
    pm_backup_note: {
      message: "\u062A\u0634\u0645\u0644 \u0627\u0644\u0646\u0633\u062E \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629 \u062C\u0645\u064A\u0639 \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0627\u062A \u0648\u0627\u0644\u0645\u062C\u0644\u062F\u0627\u062A\u060C \u0648\u064A\u062A\u0645 \u062D\u0641\u0638\u0647\u0627 \u0641\u064A \u0645\u062C\u0644\u062F \u0628\u062E\u062A\u0645 \u0632\u0645\u0646\u064A (\u0627\u0644\u062A\u0646\u0633\u064A\u0642: backup-YYYYMMDD-HHMMSS)",
      description: "Backup feature note"
    },
    extensionVersion: {
      message: "\u0627\u0644\u0625\u0635\u062F\u0627\u0631",
      description: "Extension version label"
    },
    newVersionAvailable: {
      message: "\u064A\u062A\u0648\u0641\u0631 \u0625\u0635\u062F\u0627\u0631 \u062C\u062F\u064A\u062F",
      description: "Update reminder title"
    },
    currentVersionLabel: {
      message: "\u0627\u0644\u062D\u0627\u0644\u064A",
      description: "Label for current version number"
    },
    latestVersionLabel: {
      message: "\u0627\u0644\u0623\u062D\u062F\u062B",
      description: "Label for latest version number"
    },
    updateNow: {
      message: "\u062A\u062D\u062F\u064A\u062B",
      description: "CTA to update to latest version"
    },
    starProject: {
      message: "\u0627\u062F\u0639\u0645\u0646\u064A \u2B50",
      description: "Github callout"
    },
    officialDocs: {
      message: "\u0627\u0644\u0648\u062B\u0627\u0626\u0642 \u0627\u0644\u0631\u0633\u0645\u064A\u0629",
      description: "Official docs link"
    },
    exportChatJson: {
      message: "\u062A\u0635\u062F\u064A\u0631 \u0633\u062C\u0644 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629",
      description: "Tooltip for export button"
    },
    folder_title: {
      message: "\u0627\u0644\u0645\u062C\u0644\u062F\u0627\u062A",
      description: "Folder section title"
    },
    folder_create: {
      message: "\u0625\u0646\u0634\u0627\u0621 \u0645\u062C\u0644\u062F",
      description: "Create folder button tooltip"
    },
    folder_name_prompt: {
      message: "\u0623\u062F\u062E\u0644 \u0627\u0633\u0645 \u0627\u0644\u0645\u062C\u0644\u062F:",
      description: "Create folder name prompt"
    },
    folder_rename_prompt: {
      message: "\u0623\u062F\u062E\u0644 \u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u062C\u062F\u064A\u062F:",
      description: "Rename folder prompt"
    },
    folder_delete_confirm: {
      message: "\u0647\u0644 \u062A\u0631\u064A\u062F \u062D\u0630\u0641 \u0647\u0630\u0627 \u0627\u0644\u0645\u062C\u0644\u062F \u0648\u062C\u0645\u064A\u0639 \u0645\u062D\u062A\u0648\u064A\u0627\u062A\u0647\u061F",
      description: "Delete folder confirmation"
    },
    folder_create_subfolder: {
      message: "\u0625\u0646\u0634\u0627\u0621 \u0645\u062C\u0644\u062F \u0641\u0631\u0639\u064A",
      description: "Create subfolder menu item"
    },
    folder_rename: {
      message: "\u0625\u0639\u0627\u062F\u0629 \u062A\u0633\u0645\u064A\u0629",
      description: "Rename folder menu item"
    },
    folder_change_color: {
      message: "\u062A\u063A\u064A\u064A\u0631 \u0627\u0644\u0644\u0648\u0646",
      description: "Change folder color menu item"
    },
    folder_delete: {
      message: "\u062D\u0630\u0641",
      description: "Delete folder menu item"
    },
    folder_color_default: {
      message: "\u0627\u0641\u062A\u0631\u0627\u0636\u064A",
      description: "Default folder color name"
    },
    folder_color_red: {
      message: "\u0623\u062D\u0645\u0631",
      description: "Red folder color name"
    },
    folder_color_orange: {
      message: "\u0628\u0631\u062A\u0642\u0627\u0644\u064A",
      description: "Orange folder color name"
    },
    folder_color_yellow: {
      message: "\u0623\u0635\u0641\u0631",
      description: "Yellow folder color name"
    },
    folder_color_green: {
      message: "\u0623\u062E\u0636\u0631",
      description: "Green folder color name"
    },
    folder_color_blue: {
      message: "\u0623\u0632\u0631\u0642",
      description: "Blue folder color name"
    },
    folder_color_purple: {
      message: "\u0623\u0631\u062C\u0648\u0627\u0646\u064A",
      description: "Purple folder color name"
    },
    folder_color_pink: {
      message: "\u0648\u0631\u062F\u064A",
      description: "Pink folder color name"
    },
    folder_color_custom: {
      message: "\u0645\u062E\u0635\u0635",
      description: "Custom folder color name"
    },
    folder_empty: {
      message: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u062C\u0644\u062F\u0627\u062A \u062D\u062A\u0649 \u0627\u0644\u0622\u0646",
      description: "Empty state placeholder when no folders exist"
    },
    folder_pin: {
      message: "\u062A\u062B\u0628\u064A\u062A \u0627\u0644\u0645\u062C\u0644\u062F",
      description: "Pin folder menu item"
    },
    folder_unpin: {
      message: "\u0625\u0644\u063A\u0627\u0621 \u062A\u062B\u0628\u064A\u062A \u0627\u0644\u0645\u062C\u0644\u062F",
      description: "Unpin folder menu item"
    },
    folder_remove_conversation: {
      message: "\u0625\u0632\u0627\u0644\u0629 \u0645\u0646 \u0627\u0644\u0645\u062C\u0644\u062F",
      description: "Remove conversation button tooltip"
    },
    folder_remove_conversation_confirm: {
      message: '\u0647\u0644 \u062A\u0631\u064A\u062F \u0625\u0632\u0627\u0644\u0629 "{title}" \u0645\u0646 \u0647\u0630\u0627 \u0627\u0644\u0645\u062C\u0644\u062F\u061F',
      description: "Remove conversation confirmation"
    },
    conversation_more: {
      message: "\u062E\u064A\u0627\u0631\u0627\u062A \u0625\u0636\u0627\u0641\u064A\u0629",
      description: "Conversation more options button tooltip"
    },
    conversation_move_to_folder: {
      message: "\u0646\u0642\u0644 \u0625\u0644\u0649 \u0645\u062C\u0644\u062F",
      description: "Move conversation to folder menu item"
    },
    conversation_move_to_folder_title: {
      message: "\u0646\u0642\u0644 \u0625\u0644\u0649 \u0645\u062C\u0644\u062F",
      description: "Move conversation to folder dialog title"
    },
    chatWidth: {
      message: "\u0639\u0631\u0636 \u0627\u0644\u062F\u0631\u062F\u0634\u0629",
      description: "Chat width adjustment label"
    },
    chatWidthNarrow: {
      message: "\u0636\u064A\u0642",
      description: "Narrow chat width label"
    },
    chatWidthWide: {
      message: "\u0639\u0631\u064A\u0636",
      description: "Wide chat width label"
    },
    sidebarWidth: {
      message: "\u0639\u0631\u0636 \u0627\u0644\u0634\u0631\u064A\u0637 \u0627\u0644\u062C\u0627\u0646\u0628\u064A",
      description: "Sidebar width adjustment label"
    },
    sidebarWidthNarrow: {
      message: "\u0636\u064A\u0642",
      description: "Narrow sidebar width label"
    },
    sidebarWidthWide: {
      message: "\u0639\u0631\u064A\u0636",
      description: "Wide sidebar width label"
    },
    formula_copied: {
      message: "\u2713 \u062A\u0645 \u0646\u0633\u062E \u0627\u0644\u0635\u064A\u063A\u0629",
      description: "Formula copied success message"
    },
    formula_copy_failed: {
      message: "\u2717 \u0641\u0634\u0644 \u0627\u0644\u0646\u0633\u062E",
      description: "Formula copy failed message"
    },
    formulaCopyFormat: {
      message: "\u062A\u0646\u0633\u064A\u0642 \u0646\u0633\u062E \u0627\u0644\u0635\u064A\u063A\u0629",
      description: "Formula copy format setting label"
    },
    formulaCopyFormatLatex: {
      message: "LaTeX",
      description: "LaTeX format option"
    },
    formulaCopyFormatUnicodeMath: {
      message: "MathML (Word)",
      description: "Label for UnicodeMath formula copy format option"
    },
    formulaCopyFormatHint: {
      message: "\u0627\u062E\u062A\u0631 \u0627\u0644\u062A\u0646\u0633\u064A\u0642 \u0639\u0646\u062F \u0646\u0633\u062E \u0627\u0644\u0635\u064A\u063A \u0628\u0627\u0644\u0646\u0642\u0631",
      description: "Formula copy format hint"
    },
    formulaCopyFormatNoDollar: {
      message: "LaTeX (\u0628\u062F\u0648\u0646 \u0639\u0644\u0627\u0645\u0629 \u0627\u0644\u062F\u0648\u0644\u0627\u0631)",
      description: "LaTeX format option without dollar signs"
    },
    folder_filter_current_user: {
      message: "\u0639\u0632\u0644 \u0627\u0644\u062D\u0633\u0627\u0628",
      description: "Show only conversations from the current Google account"
    },
    folder_export: {
      message: "\u062A\u0635\u062F\u064A\u0631 \u0627\u0644\u0645\u062C\u0644\u062F\u0627\u062A",
      description: "Export folders button tooltip"
    },
    folder_import_export: {
      message: "\u0627\u0633\u062A\u064A\u0631\u0627\u062F/\u062A\u0635\u062F\u064A\u0631 \u0627\u0644\u0645\u062C\u0644\u062F\u0627\u062A",
      description: "Combined import/export button tooltip"
    },
    folder_cloud_upload: {
      message: "\u0631\u0641\u0639 \u0625\u0644\u0649 \u0627\u0644\u0633\u062D\u0627\u0628\u0629",
      description: "Cloud upload button tooltip"
    },
    folder_cloud_sync: {
      message: "\u0645\u0632\u0627\u0645\u0646\u0629 \u0645\u0646 \u0627\u0644\u0633\u062D\u0627\u0628\u0629",
      description: "Cloud sync button tooltip"
    },
    folder_import: {
      message: "\u0627\u0633\u062A\u064A\u0631\u0627\u062F \u0627\u0644\u0645\u062C\u0644\u062F\u0627\u062A",
      description: "Import folders button tooltip"
    },
    folder_import_title: {
      message: "\u0627\u0633\u062A\u064A\u0631\u0627\u062F \u062A\u0643\u0648\u064A\u0646 \u0627\u0644\u0645\u062C\u0644\u062F",
      description: "Import dialog title"
    },
    folder_import_strategy: {
      message: "\u0627\u0633\u062A\u0631\u0627\u062A\u064A\u062C\u064A\u0629 \u0627\u0644\u0627\u0633\u062A\u064A\u0631\u0627\u062F:",
      description: "Import strategy label"
    },
    folder_import_merge: {
      message: "\u062F\u0645\u062C \u0645\u0639 \u0627\u0644\u0645\u062C\u0644\u062F\u0627\u062A \u0627\u0644\u0645\u0648\u062C\u0648\u062F\u0629",
      description: "Merge import strategy"
    },
    folder_import_overwrite: {
      message: "\u0627\u0644\u0643\u062A\u0627\u0628\u0629 \u0641\u0648\u0642 \u0627\u0644\u0645\u062C\u0644\u062F\u0627\u062A \u0627\u0644\u0645\u0648\u062C\u0648\u062F\u0629",
      description: "Overwrite import strategy"
    },
    folder_import_select_file: {
      message: "\u062D\u062F\u062F \u0645\u0644\u0641 JSON \u0644\u0644\u0627\u0633\u062A\u064A\u0631\u0627\u062F",
      description: "Import file selection prompt"
    },
    folder_import_success: {
      message: "\u2713 \u062A\u0645 \u0627\u0633\u062A\u064A\u0631\u0627\u062F {folders} \u0645\u062C\u0644\u062F\u060C \u0648 {conversations} \u0645\u062D\u0627\u062F\u062B\u0629",
      description: "Import success message"
    },
    folder_import_success_skipped: {
      message: "\u2713 \u062A\u0645 \u0627\u0633\u062A\u064A\u0631\u0627\u062F {folders} \u0645\u062C\u0644\u062F\u060C \u0648 {conversations} \u0645\u062D\u0627\u062F\u062B\u0629 (\u062A\u0645 \u062A\u062E\u0637\u064A {skipped} \u0645\u0643\u0631\u0631)",
      description: "Import success with skipped message"
    },
    folder_import_error: {
      message: "\u2717 \u0641\u0634\u0644 \u0627\u0644\u0627\u0633\u062A\u064A\u0631\u0627\u062F: {error}",
      description: "Import error message"
    },
    folder_export_success: {
      message: "\u2713 \u062A\u0645 \u062A\u0635\u062F\u064A\u0631 \u0627\u0644\u0645\u062C\u0644\u062F\u0627\u062A \u0628\u0646\u062C\u0627\u062D",
      description: "Export success message"
    },
    folder_import_invalid_format: {
      message: "\u062A\u0646\u0633\u064A\u0642 \u0645\u0644\u0641 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D. \u064A\u0631\u062C\u0649 \u062A\u062D\u062F\u064A\u062F \u0645\u0644\u0641 \u062A\u0643\u0648\u064A\u0646 \u0645\u062C\u0644\u062F \u0635\u0627\u0644\u062D.",
      description: "Invalid format error"
    },
    folder_import_confirm_overwrite: {
      message: "\u0633\u064A\u0624\u062F\u064A \u0647\u0630\u0627 \u0625\u0644\u0649 \u0627\u0633\u062A\u0628\u062F\u0627\u0644 \u062C\u0645\u064A\u0639 \u0627\u0644\u0645\u062C\u0644\u062F\u0627\u062A \u0627\u0644\u0645\u0648\u062C\u0648\u062F\u0629. \u0633\u064A\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0646\u0633\u062E\u0629 \u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629. \u0645\u062A\u0627\u0628\u0639\u0629\u061F",
      description: "Overwrite confirmation"
    },
    export_dialog_title: {
      message: "\u062A\u0635\u062F\u064A\u0631 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629",
      description: "Export dialog title"
    },
    export_dialog_select: {
      message: "\u0627\u062E\u062A\u0631 \u062A\u0646\u0633\u064A\u0642 \u0627\u0644\u062A\u0635\u062F\u064A\u0631:",
      description: "Export format selection label"
    },
    export_dialog_warning: {
      message: "\u26A0\uFE0F \u0628\u0639\u062F \u0627\u0644\u0646\u0642\u0631 \u0639\u0644\u0649 \u062A\u0635\u062F\u064A\u0631\u060C \u0633\u064A\u0642\u0641\u0632 \u0627\u0644\u0646\u0638\u0627\u0645 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B \u0625\u0644\u0649 \u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u0627\u0644\u0623\u0648\u0644\u0649 \u0644\u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0628\u0627\u0644\u0643\u0627\u0645\u0644. \u064A\u0631\u062C\u0649 \u0639\u062F\u0645 \u0625\u062C\u0631\u0627\u0621 \u0623\u064A \u0639\u0645\u0644\u064A\u0627\u062A\u061B \u0633\u064A\u0633\u062A\u0645\u0631 \u0627\u0644\u062A\u0635\u062F\u064A\u0631 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B \u0628\u0639\u062F \u0627\u0644\u0642\u0641\u0632.",
      description: "Warning about auto-jump and loading completeness"
    },
    export_dialog_safari_cmdp_hint: {
      message: "\u0646\u0635\u064A\u062D\u0629 Safari: \u0627\u0646\u0642\u0631 \u0641\u0648\u0642 '\u062A\u0635\u062F\u064A\u0631' \u0623\u062F\u0646\u0627\u0647\u060C \u0648\u0627\u0646\u062A\u0638\u0631 \u0644\u062D\u0638\u0629\u060C \u062B\u0645 \u0627\u0636\u063A\u0637 \u0639\u0644\u0649 \u2318P \u0648\u0627\u062E\u062A\u0631 '\u062D\u0641\u0638 \u0628\u062A\u0646\u0633\u064A\u0642 PDF'.",
      description: "Safari-specific hint for PDF export"
    },
    export_toast_safari_pdf_ready: {
      message: "\u064A\u0645\u0643\u0646\u0643 \u0627\u0644\u0622\u0646 \u0627\u0644\u0636\u063A\u0637 \u0639\u0644\u0649 Command + P \u0644\u062A\u0635\u062F\u064A\u0631 \u0645\u0644\u0641 PDF.",
      description: "Safari-specific toast shown after PDF export is prepared"
    },
    export_dialog_safari_markdown_hint: {
      message: "\u062A\u0646\u0628\u064A\u0647: \u0628\u0633\u0628\u0628 \u0642\u064A\u0648\u062F Safari\u060C \u0644\u0627 \u064A\u0645\u0643\u0646 \u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0627\u0644\u0635\u0648\u0631 \u0645\u0646 \u0633\u062C\u0644 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629. \u0644\u0644\u062D\u0635\u0648\u0644 \u0639\u0644\u0649 \u062A\u0635\u062F\u064A\u0631 \u0643\u0627\u0645\u0644\u060C \u064A\u064F\u0646\u0635\u062D \u0628\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u062A\u0635\u062F\u064A\u0631 PDF.",
      description: "Warning about image references in Safari markdown export"
    },
    export_format_json_description: {
      message: "\u062A\u0646\u0633\u064A\u0642 \u0645\u0642\u0631\u0648\u0621 \u0622\u0644\u064A\u0627\u064B \u0644\u0644\u0645\u0637\u0648\u0631\u064A\u0646",
      description: "Description for JSON export format"
    },
    export_format_markdown_description: {
      message: "\u062A\u0646\u0633\u064A\u0642 \u0646\u0635\u064A \u0646\u0638\u064A\u0641 \u0648\u0645\u062D\u0645\u0648\u0644 (\u0645\u0648\u0635\u0649 \u0628\u0647)",
      description: "Description for Markdown export format"
    },
    export_format_pdf_description: {
      message: "\u062A\u0646\u0633\u064A\u0642 \u0645\u0646\u0627\u0633\u0628 \u0644\u0644\u0637\u0628\u0627\u0639\u0629 \u0639\u0628\u0631 \u062D\u0641\u0638 \u0628\u062A\u0646\u0633\u064A\u0642 PDF",
      description: "Description for PDF export format"
    },
    editInputWidth: {
      message: "\u0639\u0631\u0636 \u062D\u0642\u0644 \u0627\u0644\u062A\u062D\u0631\u064A\u0631",
      description: "Edit input width adjustment label"
    },
    editInputWidthNarrow: {
      message: "\u0636\u064A\u0642",
      description: "Narrow edit input width label"
    },
    editInputWidthWide: {
      message: "\u0639\u0631\u064A\u0636",
      description: "Wide edit input width label"
    },
    timelineOptions: {
      message: "\u062E\u064A\u0627\u0631\u0627\u062A \u0627\u0644\u062C\u062F\u0648\u0644 \u0627\u0644\u0632\u0645\u0646\u064A",
      description: "Timeline options section label"
    },
    folderOptions: {
      message: "\u062E\u064A\u0627\u0631\u0627\u062A \u0627\u0644\u0645\u062C\u0644\u062F",
      description: "Folder options section label"
    },
    enableFolderFeature: {
      message: "\u062A\u0645\u0643\u064A\u0646 \u0645\u064A\u0632\u0629 \u0627\u0644\u0645\u062C\u0644\u062F",
      description: "Enable or disable the folder feature"
    },
    hideArchivedConversations: {
      message: "\u0625\u062E\u0641\u0627\u0621 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0627\u062A \u0627\u0644\u0645\u0624\u0631\u0634\u0641\u0629",
      description: "Hide conversations that are in folders from the main list"
    },
    conversation_star: {
      message: "\u062A\u0645\u064A\u064A\u0632 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629 \u0628\u0646\u062C\u0645\u0629",
      description: "Star conversation button tooltip"
    },
    conversation_unstar: {
      message: "\u0625\u0632\u0627\u0644\u0629 \u0627\u0644\u0646\u062C\u0645\u0629 \u0645\u0646 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629",
      description: "Unstar conversation button tooltip"
    },
    conversation_untitled: {
      message: "\u0628\u062F\u0648\u0646 \u0639\u0646\u0648\u0627\u0646",
      description: "Fallback title for conversations without a name"
    },
    geminiOnlyNotice: {
      message: "\u064A\u0639\u0645\u0644 \u0639\u0644\u0649 Gemini (\u0628\u0645\u0627 \u0641\u064A \u0630\u0644\u0643 Enterprise) \u0648 AI Studio \u0628\u0634\u0643\u0644 \u0627\u0641\u062A\u0631\u0627\u0636\u064A. \u0623\u0636\u0641 \u0645\u0648\u0627\u0642\u0639 \u0623\u062E\u0631\u0649 \u0623\u062F\u0646\u0627\u0647 \u0644\u062A\u0645\u0643\u064A\u0646 \u0645\u062F\u064A\u0631 \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0627\u062A \u0647\u0646\u0627\u0643.",
      description: "Notice that defaults are limited to Gemini/AI Studio"
    },
    folderManager_dataLossWarning: {
      message: "\u26A0\uFE0F \u062A\u062D\u0630\u064A\u0631: \u0641\u0634\u0644 \u062A\u062D\u0645\u064A\u0644 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u062C\u0644\u062F. \u0631\u0628\u0645\u0627 \u062A\u0643\u0648\u0646 \u0645\u062C\u0644\u062F\u0627\u062A\u0643 \u062A\u0627\u0644\u0641\u0629. \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0648\u062D\u062F\u0629 \u062A\u062D\u0643\u0645 \u0627\u0644\u0645\u062A\u0635\u0641\u062D \u0644\u0644\u062D\u0635\u0648\u0644 \u0639\u0644\u0649 \u0627\u0644\u062A\u0641\u0627\u0635\u064A\u0644 \u0648\u0645\u062D\u0627\u0648\u0644\u0629 \u0627\u0644\u0627\u0633\u062A\u0639\u0627\u062F\u0629 \u0645\u0646 \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629 \u0625\u0630\u0627 \u0643\u0627\u0646\u062A \u0645\u062A\u0648\u0641\u0631\u0629.",
      description: "Warning shown when folder data fails to load"
    },
    backupOptions: {
      message: "\u0646\u0633\u062E \u0627\u062D\u062A\u064A\u0627\u0637\u064A \u062A\u0644\u0642\u0627\u0626\u064A",
      description: "Backup options section label"
    },
    backupEnabled: {
      message: "\u062A\u0645\u0643\u064A\u0646 \u0627\u0644\u0646\u0633\u062E \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A",
      description: "Enable auto backup toggle"
    },
    backupNow: {
      message: "\u0646\u0633\u062E \u0627\u062D\u062A\u064A\u0627\u0637\u064A \u0627\u0644\u0622\u0646",
      description: "Backup now button"
    },
    backupSelectFolder: {
      message: "\u062A\u062D\u062F\u064A\u062F \u0645\u062C\u0644\u062F \u0627\u0644\u0646\u0633\u062E \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A",
      description: "Select backup folder button"
    },
    backupFolderSelected: {
      message: "\u0645\u062C\u0644\u062F \u0627\u0644\u0646\u0633\u062E \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A: {folder}",
      description: "Shows selected backup folder"
    },
    backupIncludePrompts: {
      message: "\u062A\u0636\u0645\u064A\u0646 \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0627\u062A",
      description: "Include prompts in backup toggle"
    },
    backupIncludeFolders: {
      message: "\u062A\u0636\u0645\u064A\u0646 \u0627\u0644\u0645\u062C\u0644\u062F\u0627\u062A",
      description: "Include folders in backup toggle"
    },
    backupIntervalLabel: {
      message: "\u0641\u0627\u0635\u0644 \u0627\u0644\u0646\u0633\u062E \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A",
      description: "Backup interval label"
    },
    backupIntervalManual: {
      message: "\u064A\u062F\u0648\u064A \u0641\u0642\u0637",
      description: "Manual backup mode"
    },
    backupIntervalDaily: {
      message: "\u064A\u0648\u0645\u064A",
      description: "Daily backup interval"
    },
    backupIntervalWeekly: {
      message: "\u0623\u0633\u0628\u0648\u0639\u064A (7 \u0623\u064A\u0627\u0645)",
      description: "Weekly backup interval"
    },
    backupLastBackup: {
      message: "\u0622\u062E\u0631 \u0646\u0633\u062E \u0627\u062D\u062A\u064A\u0627\u0637\u064A: {time}",
      description: "Last backup timestamp"
    },
    backupNever: {
      message: "\u0623\u0628\u062F\u0627",
      description: "Never backed up"
    },
    backupSuccess: {
      message: "\u2713 \u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0646\u0633\u062E \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A: {prompts} \u0645\u0637\u0627\u0644\u0628\u0629\u060C {folders} \u0645\u062C\u0644\u062F\u060C {conversations} \u0645\u062D\u0627\u062F\u062B\u0629",
      description: "Backup success message"
    },
    backupError: {
      message: "\u2717 \u0641\u0634\u0644 \u0627\u0644\u0646\u0633\u062E \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A: {error}",
      description: "Backup error message"
    },
    backupNotSupported: {
      message: "\u26A0\uFE0F \u064A\u062A\u0637\u0644\u0628 \u0627\u0644\u0646\u0633\u062E \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A \u0645\u062A\u0635\u0641\u062D\u064B\u0627 \u062D\u062F\u064A\u062B\u064B\u0627 \u064A\u062F\u0639\u0645 File System Access API",
      description: "Browser not supported message"
    },
    backupSelectFolderFirst: {
      message: "\u064A\u0631\u062C\u0649 \u062A\u062D\u062F\u064A\u062F \u0645\u062C\u0644\u062F \u0646\u0633\u062E \u0627\u062D\u062A\u064A\u0627\u0637\u064A \u0623\u0648\u0644\u0627\u064B",
      description: "No folder selected warning"
    },
    backupUserCancelled: {
      message: "\u062A\u0645 \u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0646\u0633\u062E \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A",
      description: "User cancelled folder selection"
    },
    backupConfigSaved: {
      message: "\u2713 \u062A\u0645 \u062D\u0641\u0638 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0646\u0633\u062E \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A",
      description: "Config saved message"
    },
    backupPermissionDenied: {
      message: "\u26A0\uFE0F \u0644\u0627 \u064A\u0645\u0643\u0646 \u0627\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u062F\u0644\u064A\u0644. \u064A\u0631\u062C\u0649 \u0627\u062E\u062A\u064A\u0627\u0631 \u0645\u0648\u0642\u0639 \u0645\u062E\u062A\u0644\u0641 (\u0645\u062B\u0644 \u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0623\u0648 \u0627\u0644\u062A\u0646\u0632\u064A\u0644\u0627\u062A \u0623\u0648 \u0645\u062C\u0644\u062F \u0641\u064A \u0633\u0637\u062D \u0627\u0644\u0645\u0643\u062A\u0628)",
      description: "Permission denied for restricted directory"
    },
    backupConfigureInOptions: {
      message: "\u064A\u062A\u0637\u0644\u0628 \u062A\u0643\u0648\u064A\u0646 \u0627\u0644\u0646\u0633\u062E \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A \u0635\u0641\u062D\u0629 \u0627\u0644\u062E\u064A\u0627\u0631\u0627\u062A. \u0627\u0646\u0642\u0631 \u0641\u0648\u0642 \u0627\u0644\u0632\u0631 \u0623\u062F\u0646\u0627\u0647 \u0644\u0641\u062A\u062D\u0647\u0627 (\u0627\u0646\u0642\u0631 \u0641\u0648\u0642 \u0627\u0644\u0646\u0642\u0627\u0637 \u0627\u0644\u062B\u0644\u0627\u062B \u0628\u062C\u0648\u0627\u0631 \u0631\u0645\u0632 \u0627\u0644\u0627\u0645\u062A\u062F\u0627\u062F \u2190 \u062E\u064A\u0627\u0631\u0627\u062A).",
      description: "Backup configure in options page explanation"
    },
    openOptionsPage: {
      message: "\u0641\u062A\u062D \u0635\u0641\u062D\u0629 \u0627\u0644\u062E\u064A\u0627\u0631\u0627\u062A",
      description: "Open options page button"
    },
    optionsPageSubtitle: {
      message: "\u062E\u064A\u0627\u0631\u0627\u062A \u0627\u0644\u0627\u0645\u062A\u062F\u0627\u062F",
      description: "Options page subtitle"
    },
    optionsComingSoon: {
      message: "\u0627\u0644\u0645\u0632\u064A\u062F \u0645\u0646 \u0627\u0644\u062E\u064A\u0627\u0631\u0627\u062A \u0642\u0631\u064A\u0628\u064B\u0627...",
      description: "Options page placeholder text"
    },
    backupDataAccessNotice: {
      message: "\u0642\u064A\u0648\u062F \u0627\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A",
      description: "Backup data access limitation title"
    },
    backupDataAccessHint: {
      message: "\u0646\u0638\u0631\u064B\u0627 \u0644\u0642\u064A\u0648\u062F \u0623\u0645\u0627\u0646 \u0627\u0644\u0645\u062A\u0635\u0641\u062D\u060C \u0644\u0627 \u064A\u0645\u0643\u0646 \u0644\u0635\u0641\u062D\u0629 \u0627\u0644\u062E\u064A\u0627\u0631\u0627\u062A \u0647\u0630\u0647 \u0627\u0644\u0648\u0635\u0648\u0644 \u0645\u0628\u0627\u0634\u0631\u0629 \u0625\u0644\u0649 \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0627\u062A \u0648\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u062C\u0644\u062F \u0645\u0646 \u0635\u0641\u062D\u0627\u062A Gemini. \u064A\u0631\u062C\u0649 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0645\u062F\u064A\u0631 \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0627\u062A \u0648\u0645\u064A\u0632\u0627\u062A \u062A\u0635\u062F\u064A\u0631 \u0627\u0644\u0645\u062C\u0644\u062F \u0639\u0644\u0649 \u0635\u0641\u062D\u0629 Gemini \u0644\u0644\u0646\u0633\u062E \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A \u0627\u0644\u064A\u062F\u0648\u064A.",
      description: "Backup data access limitation explanation"
    },
    promptManagerOptions: {
      message: "\u0645\u062F\u064A\u0631 \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0627\u062A",
      description: "Prompt Manager options section label"
    },
    hidePromptManager: {
      message: "\u0625\u062E\u0641\u0627\u0621 \u0645\u062F\u064A\u0631 \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0627\u062A",
      description: "Hide the prompt manager floating ball"
    },
    hidePromptManagerHint: {
      message: "\u0625\u062E\u0641\u0627\u0621 \u0627\u0644\u0632\u0631 \u0627\u0644\u0639\u0627\u0626\u0645 \u0644\u0645\u062F\u064A\u0631 \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0627\u062A \u0639\u0644\u0649 \u0627\u0644\u0635\u0641\u062D\u0629",
      description: "Hint for hiding prompt manager feature"
    },
    customWebsites: {
      message: "\u0645\u0648\u0627\u0642\u0639 \u0645\u062E\u0635\u0635\u0629",
      description: "Custom websites for prompt manager"
    },
    customWebsitesPlaceholder: {
      message: "\u0623\u062F\u062E\u0644 \u0639\u0646\u0648\u0627\u0646 URL \u0644\u0644\u0645\u0648\u0642\u0639 (\u0645\u062B\u0644 chatgpt.com)",
      description: "Custom websites input placeholder"
    },
    customWebsitesHint: {
      message: "\u0623\u0636\u0641 \u0645\u0648\u0627\u0642\u0639 \u0627\u0644\u0648\u064A\u0628 \u0627\u0644\u062A\u064A \u062A\u0631\u064A\u062F \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0645\u062F\u064A\u0631 \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0627\u062A \u0641\u064A\u0647\u0627. \u0633\u064A\u062A\u0645 \u062A\u0646\u0634\u064A\u0637 \u0645\u062F\u064A\u0631 \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0627\u062A \u0641\u0642\u0637 \u0641\u064A \u0647\u0630\u0647 \u0627\u0644\u0645\u0648\u0627\u0642\u0639.",
      description: "Custom websites hint"
    },
    addWebsite: {
      message: "\u0625\u0636\u0627\u0641\u0629 \u0645\u0648\u0642\u0639 \u0648\u064A\u0628",
      description: "Add website button"
    },
    removeWebsite: {
      message: "\u0625\u0632\u0627\u0644\u0629",
      description: "Remove website button"
    },
    invalidUrl: {
      message: "\u062A\u0646\u0633\u064A\u0642 \u0639\u0646\u0648\u0627\u0646 URL \u063A\u064A\u0631 \u0635\u0627\u0644\u062D",
      description: "Invalid URL error message"
    },
    websiteAdded: {
      message: "\u062A\u0645\u062A \u0625\u0636\u0627\u0641\u0629 \u0645\u0648\u0642\u0639 \u0627\u0644\u0648\u064A\u0628",
      description: "Website added success message"
    },
    websiteRemoved: {
      message: "\u062A\u0645\u062A \u0625\u0632\u0627\u0644\u0629 \u0645\u0648\u0642\u0639 \u0627\u0644\u0648\u064A\u0628",
      description: "Website removed success message"
    },
    permissionDenied: {
      message: "\u062A\u0645 \u0631\u0641\u0636 \u0627\u0644\u0625\u0630\u0646. \u064A\u0631\u062C\u0649 \u0627\u0644\u0633\u0645\u0627\u062D \u0628\u0627\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0645\u0648\u0642\u0639 \u0627\u0644\u0648\u064A\u0628 \u0647\u0630\u0627.",
      description: "Permission denied error message"
    },
    permissionRequestFailed: {
      message: "\u0641\u0634\u0644 \u0637\u0644\u0628 \u0627\u0644\u0625\u0630\u0646. \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649 \u0623\u0648 \u0645\u0646\u062D \u0627\u0644\u0648\u0635\u0648\u0644 \u0641\u064A \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0627\u0645\u062A\u062F\u0627\u062F.",
      description: "Permission request failure message"
    },
    customWebsitesNote: {
      message: "\u0646\u0635\u064A\u062D\u0629: \u0633\u064A\u064F\u0637\u0644\u0628 \u0645\u0646\u0643 \u0627\u0644\u0633\u0645\u0627\u062D \u0628\u0627\u0644\u0648\u0635\u0648\u0644 \u0639\u0646\u062F \u0625\u0636\u0627\u0641\u0629 \u0645\u0648\u0642\u0639. \u0628\u0639\u062F \u0645\u0646\u062D \u0627\u0644\u0625\u0630\u0646\u060C \u0642\u0645 \u0628\u0625\u0639\u0627\u062F\u0629 \u062A\u062D\u0645\u064A\u0644 \u0647\u0630\u0627 \u0627\u0644\u0645\u0648\u0642\u0639 \u062D\u062A\u0649 \u064A\u062A\u0645\u0643\u0646 \u0645\u062F\u064A\u0631 \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0627\u062A \u0645\u0646 \u0627\u0644\u0628\u062F\u0621.",
      description: "Custom websites reload/permission note"
    },
    starredHistory: {
      message: "\u0627\u0644\u0633\u062C\u0644 \u0627\u0644\u0645\u0645\u064A\u0632 \u0628\u0646\u062C\u0645\u0629",
      description: "Starred history title"
    },
    viewStarredHistory: {
      message: "\u0639\u0631\u0636 \u0627\u0644\u0633\u062C\u0644 \u0627\u0644\u0645\u0645\u064A\u0632 \u0628\u0646\u062C\u0645\u0629",
      description: "View starred history button"
    },
    noStarredMessages: {
      message: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0631\u0633\u0627\u0626\u0644 \u0645\u0645\u064A\u0632\u0629 \u0628\u0646\u062C\u0645\u0629 \u062D\u062A\u0649 \u0627\u0644\u0622\u0646",
      description: "No starred messages placeholder"
    },
    removeFromStarred: {
      message: "\u0625\u0632\u0627\u0644\u0629 \u0645\u0646 \u0627\u0644\u0645\u0641\u0636\u0644\u0629",
      description: "Remove from starred tooltip"
    },
    justNow: {
      message: "\u0627\u0644\u0622\u0646",
      description: "Just now time label"
    },
    hoursAgo: {
      message: "\u0645\u0646\u0630 \u0633\u0627\u0639\u0627\u062A",
      description: "Hours ago label"
    },
    yesterday: {
      message: "\u0623\u0645\u0633",
      description: "Yesterday date label"
    },
    daysAgo: {
      message: "\u0645\u0646\u0630 \u0623\u064A\u0627\u0645",
      description: "Days ago label"
    },
    loading: {
      message: "\u062C\u0627\u0631\u064D \u0627\u0644\u062A\u062D\u0645\u064A\u0644...",
      description: "Loading message"
    },
    keyboardShortcuts: {
      message: "\u0627\u062E\u062A\u0635\u0627\u0631\u0627\u062A \u0644\u0648\u062D\u0629 \u0627\u0644\u0645\u0641\u0627\u062A\u064A\u062D",
      description: "Keyboard shortcuts section title"
    },
    enableShortcuts: {
      message: "\u062A\u0645\u0643\u064A\u0646 \u0627\u062E\u062A\u0635\u0627\u0631\u0627\u062A \u0644\u0648\u062D\u0629 \u0627\u0644\u0645\u0641\u0627\u062A\u064A\u062D",
      description: "Enable shortcuts toggle label"
    },
    previousNode: {
      message: "\u0627\u0644\u0639\u0642\u062F\u0629 \u0627\u0644\u0633\u0627\u0628\u0642\u0629",
      description: "Previous timeline node shortcut label"
    },
    nextNode: {
      message: "\u0627\u0644\u0639\u0642\u062F\u0629 \u0627\u0644\u062A\u0627\u0644\u064A\u0629",
      description: "Next timeline node shortcut label"
    },
    shortcutKey: {
      message: "\u0645\u0641\u062A\u0627\u062D",
      description: "Shortcut key label"
    },
    shortcutModifiers: {
      message: "\u0645\u0639\u062F\u0651\u0644\u0627\u062A",
      description: "Shortcut modifiers label"
    },
    resetShortcuts: {
      message: "\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u062A\u0639\u064A\u064A\u0646 \u0625\u0644\u0649 \u0627\u0644\u0627\u0641\u062A\u0631\u0627\u0636\u064A\u0627\u062A",
      description: "Reset shortcuts button"
    },
    shortcutsResetSuccess: {
      message: "\u062A\u0645\u062A \u0625\u0639\u0627\u062F\u0629 \u062A\u0639\u064A\u064A\u0646 \u0627\u0644\u0627\u062E\u062A\u0635\u0627\u0631\u0627\u062A",
      description: "Shortcuts reset success message"
    },
    shortcutsDescription: {
      message: "\u0627\u0644\u062A\u0646\u0642\u0644 \u0639\u0628\u0631 \u0639\u0642\u062F \u0627\u0644\u062C\u062F\u0648\u0644 \u0627\u0644\u0632\u0645\u0646\u064A \u0628\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u062E\u062A\u0635\u0627\u0631\u0627\u062A \u0644\u0648\u062D\u0629 \u0627\u0644\u0645\u0641\u0627\u062A\u064A\u062D",
      description: "Shortcuts description"
    },
    modifierNone: {
      message: "\u0644\u0627 \u0634\u064A\u0621",
      description: "No modifier key"
    },
    modifierAlt: {
      message: "Alt",
      description: "Alt modifier key"
    },
    modifierCtrl: {
      message: "Ctrl",
      description: "Ctrl modifier key"
    },
    modifierShift: {
      message: "Shift",
      description: "Shift modifier key"
    },
    modifierMeta: {
      message: "Cmd/Win",
      description: "Meta/Command/Windows modifier key"
    },
    cloudSync: {
      message: "\u0645\u0632\u0627\u0645\u0646\u0629 \u0633\u062D\u0627\u0628\u064A\u0629",
      description: "Cloud sync section title"
    },
    cloudSyncDescription: {
      message: "\u0645\u0632\u0627\u0645\u0646\u0629 \u0627\u0644\u0645\u062C\u0644\u062F\u0627\u062A \u0648\u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0627\u062A \u0645\u0639 Google Drive",
      description: "Cloud sync description"
    },
    syncModeDisabled: {
      message: "\u0645\u0639\u0637\u0644",
      description: "Sync mode disabled option"
    },
    syncModeManual: {
      message: "\u064A\u062F\u0648\u064A",
      description: "Sync mode manual option"
    },
    syncServerPort: {
      message: "\u0645\u0646\u0641\u0630 \u0627\u0644\u062E\u0627\u062F\u0645",
      description: "Port number for the sync server"
    },
    syncNow: {
      message: "\u0645\u0632\u0627\u0645\u0646\u0629 \u0627\u0644\u0622\u0646",
      description: "Sync now button"
    },
    lastSynced: {
      message: "\u0622\u062E\u0631 \u0645\u0632\u0627\u0645\u0646\u0629: {time}",
      description: "Last sync timestamp"
    },
    neverSynced: {
      message: "\u0644\u0645 \u062A\u062A\u0645 \u0627\u0644\u0645\u0632\u0627\u0645\u0646\u0629 \u0645\u0646 \u0642\u0628\u0644",
      description: "Never synced message"
    },
    lastUploaded: {
      message: "\u062A\u0645 \u0627\u0644\u0631\u0641\u0639: {time}",
      description: "Last upload timestamp"
    },
    neverUploaded: {
      message: "\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0631\u0641\u0639 \u0645\u0646 \u0642\u0628\u0644",
      description: "Never uploaded message"
    },
    syncSuccess: {
      message: "\u2713 \u062A\u0645\u062A \u0627\u0644\u0645\u0632\u0627\u0645\u0646\u0629 \u0628\u0646\u062C\u0627\u062D",
      description: "Sync success message"
    },
    syncError: {
      message: "\u2717 \u0641\u0634\u0644\u062A \u0627\u0644\u0645\u0632\u0627\u0645\u0646\u0629: {error}",
      description: "Sync error message"
    },
    syncInProgress: {
      message: "\u062C\u0627\u0631\u064D \u0627\u0644\u0645\u0632\u0627\u0645\u0646\u0629...",
      description: "Sync in progress message"
    },
    uploadInProgress: {
      message: "Uploading...",
      description: "Upload in progress message"
    },
    uploadSuccess: {
      message: "\u2713 Uploaded successfully",
      description: "Upload success message"
    },
    downloadInProgress: {
      message: "Downloading...",
      description: "Download in progress message"
    },
    downloadMergeSuccess: {
      message: "\u2713 Downloaded and merged",
      description: "Download and merge success message"
    },
    syncUpload: {
      message: "\u0631\u0641\u0639",
      description: "Upload button label"
    },
    syncMerge: {
      message: "\u062F\u0645\u062C",
      description: "Merge button label"
    },
    syncMode: {
      message: "\u0648\u0636\u0639 \u0627\u0644\u0645\u0632\u0627\u0645\u0646\u0629",
      description: "Sync mode label"
    },
    minutesAgo: {
      message: "\u0645\u0646\u0630 \u062F\u0642\u0627\u0626\u0642",
      description: "Minutes ago label"
    },
    syncNoData: {
      message: "\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0632\u0627\u0645\u0646\u0629 \u0641\u064A Drive",
      description: "Error message when no data is found in Drive"
    },
    syncUploadFailed: {
      message: "\u0641\u0634\u0644 \u0627\u0644\u0631\u0641\u0639",
      description: "Error message when upload fails"
    },
    syncDownloadFailed: {
      message: "\u0641\u0634\u0644 \u0627\u0644\u062A\u0646\u0632\u064A\u0644",
      description: "Error message when download fails"
    },
    syncAuthFailed: {
      message: "\u0641\u0634\u0644 \u0627\u0644\u0645\u0635\u0627\u062F\u0642\u0629",
      description: "Error message when authentication fails"
    },
    signOut: {
      message: "\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062E\u0631\u0648\u062C",
      description: "Sign out button"
    },
    signInWithGoogle: {
      message: "\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0628\u0627\u0633\u062A\u062E\u062F\u0627\u0645 Google",
      description: "Sign in with Google button"
    },
    nanobananaOptions: {
      message: "\u062E\u064A\u0627\u0631\u0627\u062A NanoBanana",
      description: "NanoBanana options section label"
    },
    enableNanobananaWatermarkRemover: {
      message: "\u0625\u0632\u0627\u0644\u0629 \u0639\u0644\u0627\u0645\u0629 NanoBanana \u0627\u0644\u0645\u0627\u0626\u064A\u0629",
      description: "Enable automatic watermark removal for NanoBanana images"
    },
    nanobananaWatermarkRemoverHint: {
      message: "\u064A\u0632\u064A\u0644 \u062A\u0644\u0642\u0627\u0626\u064A\u064B\u0627 \u0639\u0644\u0627\u0645\u0627\u062A Gemini \u0627\u0644\u0645\u0627\u0626\u064A\u0629 \u0627\u0644\u0645\u0631\u0626\u064A\u0629 \u0645\u0646 \u0627\u0644\u0635\u0648\u0631 \u0627\u0644\u062A\u064A \u062A\u0645 \u0625\u0646\u0634\u0627\u0624\u0647\u0627",
      description: "Watermark remover feature hint"
    },
    nanobananaDownloadTooltip: {
      message: "\u062A\u0646\u0632\u064A\u0644 \u0627\u0644\u0635\u0648\u0631\u0629 \u0628\u062F\u0648\u0646 \u0639\u0644\u0627\u0645\u0629 \u0645\u0627\u0626\u064A\u0629 (NanoBanana)",
      description: "Download button tooltip"
    },
    deepResearchDownload: {
      message: "\u062A\u0646\u0632\u064A\u0644 \u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u062A\u0641\u0643\u064A\u0631",
      description: "Deep Research download button text"
    },
    deepResearchDownloadTooltip: {
      message: "\u062A\u0646\u0632\u064A\u0644 \u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u062A\u0641\u0643\u064A\u0631 \u0628\u062A\u0646\u0633\u064A\u0642 Markdown",
      description: "Deep Research download button tooltip"
    },
    folder_uncategorized: {
      message: "\u063A\u064A\u0631 \u0645\u0635\u0646\u0641",
      description: "Label for root-level conversations not in any folder"
    },
    timelineLevelTitle: {
      message: "\u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u0639\u0642\u062F\u0629",
      description: "Title for timeline node level context menu"
    },
    timelineLevel1: {
      message: "\u0645\u0633\u062A\u0648\u0649 1",
      description: "Timeline node level 1 option"
    },
    timelineLevel2: {
      message: "\u0645\u0633\u062A\u0648\u0649 2",
      description: "Timeline node level 2 option"
    },
    timelineLevel3: {
      message: "\u0645\u0633\u062A\u0648\u0649 3",
      description: "Timeline node level 3 option"
    },
    timelineCollapse: {
      message: "\u0637\u064A",
      description: "Collapse children"
    },
    timelineExpand: {
      message: "\u062A\u0648\u0633\u064A\u0639",
      description: "Expand children"
    },
    timelinePreviewSearch: {
      message: "...\u0628\u062D\u062B",
      description: "Timeline preview panel search placeholder"
    },
    timelinePreviewNoResults: {
      message: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0646\u062A\u0627\u0626\u062C",
      description: "Timeline preview panel no search results"
    },
    timelinePreviewNoMessages: {
      message: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0631\u0633\u0627\u0626\u0644",
      description: "Timeline preview panel no messages"
    },
    quoteReply: {
      message: "\u0631\u062F \u0628\u0627\u0642\u062A\u0628\u0627\u0633",
      description: "Quote reply button text"
    },
    inputCollapseOptions: {
      message: "\u062E\u064A\u0627\u0631\u0627\u062A \u0627\u0644\u0625\u062F\u062E\u0627\u0644",
      description: "Input options section label"
    },
    enableInputCollapse: {
      message: "\u062A\u0645\u0643\u064A\u0646 \u0637\u064A \u0627\u0644\u0625\u062F\u062E\u0627\u0644",
      description: "Enable input collapse toggle label"
    },
    enableInputCollapseHint: {
      message: "\u0637\u064A \u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u0625\u062F\u062E\u0627\u0644 \u0639\u0646\u062F\u0645\u0627 \u062A\u0643\u0648\u0646 \u0641\u0627\u0631\u063A\u0629 \u0644\u0644\u062D\u0635\u0648\u0644 \u0639\u0644\u0649 \u0645\u0633\u0627\u062D\u0629 \u0642\u0631\u0627\u0621\u0629 \u0623\u0643\u0628\u0631",
      description: "Input collapse feature hint"
    },
    inputCollapsePlaceholder: {
      message: "\u0631\u0627\u0633\u0644 Gemini",
      description: "Placeholder text shown in collapsed input"
    },
    ctrlEnterSend: {
      message: "Ctrl+Enter \u0644\u0644\u0625\u0631\u0633\u0627\u0644",
      description: "Ctrl+Enter to send toggle label"
    },
    ctrlEnterSendHint: {
      message: "\u0627\u0636\u063A\u0637 Ctrl+Enter \u0644\u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0631\u0633\u0627\u0626\u0644\u060C Enter \u0644\u0625\u0636\u0627\u0641\u0629 \u0633\u0637\u0631 \u062C\u062F\u064A\u062F",
      description: "Ctrl+Enter to send feature hint"
    },
    batch_delete_confirm: {
      message: "\u0647\u0644 \u0623\u0646\u062A \u0645\u062A\u0623\u0643\u062F \u0645\u0646 \u0623\u0646\u0643 \u062A\u0631\u064A\u062F \u062D\u0630\u0641 {count} \u0645\u062D\u0627\u062F\u062B\u0629\u061F \u0644\u0627 \u064A\u0645\u0643\u0646 \u0627\u0644\u062A\u0631\u0627\u062C\u0639 \u0639\u0646 \u0647\u0630\u0627 \u0627\u0644\u0625\u062C\u0631\u0627\u0621.",
      description: "Batch delete confirmation message"
    },
    batch_delete_in_progress: {
      message: "\u062C\u0627\u0631\u064D \u0627\u0644\u062D\u0630\u0641... ({current}/{total})",
      description: "Batch delete progress message"
    },
    batch_delete_success: {
      message: "\u2713 \u062A\u0645 \u062D\u0630\u0641 {count} \u0645\u062D\u0627\u062F\u062B\u0629",
      description: "Batch delete success message"
    },
    batch_delete_partial: {
      message: "\u0627\u0643\u062A\u0645\u0644 \u0627\u0644\u062D\u0630\u0641: {success} \u0628\u0646\u062C\u0627\u062D\u060C {failed} \u0641\u0634\u0644",
      description: "Batch delete partial success message"
    },
    batch_delete_limit_reached: {
      message: "\u064A\u0645\u0643\u0646 \u062A\u062D\u062F\u064A\u062F {max} \u0645\u062D\u0627\u062F\u062B\u0629 \u0643\u062D\u062F \u0623\u0642\u0635\u0649 \u0641\u064A \u0648\u0642\u062A \u0648\u0627\u062D\u062F",
      description: "Batch delete limit warning"
    },
    batch_delete_button: {
      message: "\u062D\u0630\u0641 \u0627\u0644\u0645\u062D\u062F\u062F",
      description: "Batch delete button tooltip in multi-select mode"
    },
    batch_delete_match_patterns: {
      message: "delete,confirm,yes,ok,remove,\u062D\u0630\u0641,\u062A\u0623\u0643\u064A\u062F,\u0646\u0639\u0645,\u0645\u0648\u0627\u0641\u0642,\u0625\u0632\u0627\u0644\u0629",
      description: "Comma-separated list of keywords to match native delete/confirm buttons (case-insensitive)"
    },
    generalOptions: {
      message: "\u062E\u064A\u0627\u0631\u0627\u062A \u0639\u0627\u0645\u0629",
      description: "General options section label"
    },
    enableTabTitleUpdate: {
      message: "\u0645\u0632\u0627\u0645\u0646\u0629 \u0639\u0646\u0648\u0627\u0646 \u0639\u0644\u0627\u0645\u0629 \u0627\u0644\u062A\u0628\u0648\u064A\u0628 \u0645\u0639 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629",
      description: "Enable tab title sync toggle label"
    },
    enableTabTitleUpdateHint: {
      message: "\u062A\u062D\u062F\u064A\u062B \u0639\u0646\u0648\u0627\u0646 \u0639\u0644\u0627\u0645\u0629 \u062A\u0628\u0648\u064A\u0628 \u0627\u0644\u0645\u062A\u0635\u0641\u062D \u062A\u0644\u0642\u0627\u0626\u064A\u064B\u0627 \u0644\u0645\u0637\u0627\u0628\u0642\u0629 \u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629 \u0627\u0644\u062D\u0627\u0644\u064A\u0629",
      description: "Tab title sync feature hint"
    },
    enableMermaidRendering: {
      message: "\u062A\u0645\u0643\u064A\u0646 \u0639\u0631\u0636 \u0645\u062E\u0637\u0637\u0627\u062A Mermaid",
      description: "Enable Mermaid diagram rendering toggle label"
    },
    enableMermaidRenderingHint: {
      message: "\u0639\u0631\u0636 \u0645\u062E\u0637\u0637\u0627\u062A Mermaid \u062A\u0644\u0642\u0627\u0626\u064A\u064B\u0627 \u0641\u064A \u0643\u062A\u0644 \u0627\u0644\u062A\u0639\u0644\u064A\u0645\u0627\u062A \u0627\u0644\u0628\u0631\u0645\u062C\u064A\u0629",
      description: "Mermaid rendering feature hint"
    },
    enableQuoteReply: {
      message: "\u062A\u0645\u0643\u064A\u0646 \u0627\u0644\u0631\u062F \u0628\u0627\u0644\u0627\u0642\u062A\u0628\u0627\u0633",
      description: "Enable quote reply toggle label"
    },
    enableQuoteReplyHint: {
      message: "\u0625\u0638\u0647\u0627\u0631 \u0632\u0631 \u0639\u0627\u0626\u0645 \u0644\u0627\u0642\u062A\u0628\u0627\u0633 \u0627\u0644\u0646\u0635 \u0627\u0644\u0645\u062D\u062F\u062F \u0639\u0646\u062F \u062A\u062D\u062F\u064A\u062F \u0646\u0635 \u0641\u064A \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0627\u062A",
      description: "Quote reply feature hint"
    },
    contextSync: {
      message: "\u0645\u0632\u0627\u0645\u0646\u0629 \u0627\u0644\u0633\u064A\u0627\u0642",
      description: "Context Sync title"
    },
    contextSyncDescription: {
      message: "\u0645\u0632\u0627\u0645\u0646\u0629 \u0633\u064A\u0627\u0642 \u0627\u0644\u062F\u0631\u062F\u0634\u0629 \u0645\u0639 IDE \u0627\u0644\u0645\u062D\u0644\u064A \u0627\u0644\u062E\u0627\u0635 \u0628\u0643",
      description: "Context Sync description"
    },
    syncToIDE: {
      message: "\u0645\u0632\u0627\u0645\u0646\u0629 \u0645\u0639 IDE",
      description: "Sync to IDE button"
    },
    ideOnline: {
      message: "IDE \u0645\u062A\u0635\u0644",
      description: "IDE Online status"
    },
    ideOffline: {
      message: "IDE \u063A\u064A\u0631 \u0645\u062A\u0635\u0644",
      description: "IDE Offline status"
    },
    syncing: {
      message: "\u062C\u0627\u0631\u064D \u0627\u0644\u0645\u0632\u0627\u0645\u0646\u0629...",
      description: "Syncing status"
    },
    checkServer: {
      message: "\u064A\u0631\u062C\u0649 \u062A\u0634\u063A\u064A\u0644 \u062E\u0627\u062F\u0645 AI Sync \u0641\u064A VS Code",
      description: "Check server hint"
    },
    capturing: {
      message: "\u062C\u0627\u0631\u064D \u0627\u0644\u062A\u0642\u0627\u0637 \u0627\u0644\u062D\u0648\u0627\u0631...",
      description: "Capturing status"
    },
    syncedSuccess: {
      message: "\u062A\u0645\u062A \u0627\u0644\u0645\u0632\u0627\u0645\u0646\u0629 \u0628\u0646\u062C\u0627\u062D!",
      description: "Synced success message"
    },
    downloadingOriginal: {
      message: "\u062C\u0627\u0631\u064D \u062A\u0646\u0632\u064A\u0644 \u0627\u0644\u0635\u0648\u0631\u0629 \u0627\u0644\u0623\u0635\u0644\u064A\u0629",
      description: "Status when downloading original image"
    },
    downloadingOriginalLarge: {
      message: "\u062C\u0627\u0631\u064D \u062A\u0646\u0632\u064A\u0644 \u0627\u0644\u0635\u0648\u0631\u0629 \u0627\u0644\u0623\u0635\u0644\u064A\u0629 (\u0645\u0644\u0641 \u0643\u0628\u064A\u0631)",
      description: "Status when downloading large original image"
    },
    downloadLargeWarning: {
      message: "\u062A\u062D\u0630\u064A\u0631 \u0645\u0644\u0641 \u0643\u0628\u064A\u0631",
      description: "Warning shown for large downloads"
    },
    downloadProcessing: {
      message: "\u062C\u0627\u0631\u064D \u0645\u0639\u0627\u0644\u062C\u0629 \u0627\u0644\u0639\u0644\u0627\u0645\u0629 \u0627\u0644\u0645\u0627\u0626\u064A\u0629",
      description: "Status when processing watermark removal"
    },
    downloadSuccess: {
      message: "\u062C\u0627\u0631\u064D \u0627\u0644\u062A\u0646\u0632\u064A\u0644...",
      description: "Status when download starts"
    },
    downloadError: {
      message: "\u0641\u0634\u0644",
      description: "Status prefix when download fails"
    },
    recentsHide: {
      message: "\u0625\u062E\u0641\u0627\u0621 \u0627\u0644\u0639\u0646\u0627\u0635\u0631 \u0627\u0644\u0623\u062E\u064A\u0631\u0629",
      description: "\u062A\u0644\u0645\u064A\u062D \u0644\u0625\u062E\u0641\u0627\u0621 \u0642\u0633\u0645 \u0627\u0644\u0639\u0646\u0627\u0635\u0631 \u0627\u0644\u0623\u062E\u064A\u0631\u0629"
    },
    recentsShow: {
      message: "\u0625\u0638\u0647\u0627\u0631 \u0627\u0644\u0639\u0646\u0627\u0635\u0631 \u0627\u0644\u0623\u062E\u064A\u0631\u0629",
      description: "\u062A\u0644\u0645\u064A\u062D \u0644\u0625\u0638\u0647\u0627\u0631 \u0642\u0633\u0645 \u0627\u0644\u0639\u0646\u0627\u0635\u0631 \u0627\u0644\u0623\u062E\u064A\u0631\u0629"
    },
    gemsHide: {
      message: "\u0625\u062E\u0641\u0627\u0621 Gems",
      description: "\u062A\u0644\u0645\u064A\u062D \u0644\u0625\u062E\u0641\u0627\u0621 \u0642\u0633\u0645 \u0642\u0627\u0626\u0645\u0629 Gems"
    },
    gemsShow: {
      message: "\u0625\u0638\u0647\u0627\u0631 Gems",
      description: "\u062A\u0644\u0645\u064A\u062D \u0644\u0625\u0638\u0647\u0627\u0631 \u0642\u0633\u0645 \u0642\u0627\u0626\u0645\u0629 Gems"
    },
    setAsDefaultModel: {
      message: "Set as default model",
      description: "Tooltip for setting default model"
    },
    cancelDefaultModel: {
      message: "Cancel default model",
      description: "Tooltip for cancelling default model"
    },
    defaultModelSet: {
      message: "Default model set: $1",
      description: "Toast message when default model is set"
    },
    defaultModelCleared: {
      message: "Default model cleared",
      description: "Toast message when default model is cleared"
    },
    sidebarAutoHide: {
      message: "\u0625\u062E\u0641\u0627\u0621 \u0627\u0644\u0634\u0631\u064A\u0637 \u0627\u0644\u062C\u0627\u0646\u0628\u064A \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B",
      description: "Auto-hide sidebar toggle label"
    },
    sidebarAutoHideHint: {
      message: "\u0637\u064A \u0627\u0644\u0634\u0631\u064A\u0637 \u0627\u0644\u062C\u0627\u0646\u0628\u064A \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B \u0639\u0646\u062F \u0645\u063A\u0627\u062F\u0631\u0629 \u0627\u0644\u0645\u0627\u0648\u0633\u060C \u0648\u062A\u0648\u0633\u064A\u0639\u0647 \u0639\u0646\u062F \u0627\u0644\u062F\u062E\u0648\u0644",
      description: "Auto-hide sidebar feature hint"
    },
    folderSpacing: {
      message: "\u062A\u0628\u0627\u0639\u062F \u0627\u0644\u0645\u062C\u0644\u062F\u0627\u062A",
      description: "Folder spacing adjustment label"
    },
    folderSpacingCompact: {
      message: "\u0645\u0636\u063A\u0648\u0637",
      description: "Compact folder spacing label"
    },
    folderSpacingSpacious: {
      message: "\u0648\u0627\u0633\u0639",
      description: "Spacious folder spacing label"
    },
    folderTreeIndent: {
      message: "\u0625\u0632\u0627\u062D\u0629 \u0627\u0644\u0645\u062C\u0644\u062F\u0627\u062A \u0627\u0644\u0641\u0631\u0639\u064A\u0629",
      description: "Subfolder tree indentation adjustment label"
    },
    folderTreeIndentCompact: {
      message: "\u0623\u0636\u064A\u0642",
      description: "Narrow subfolder indentation label"
    },
    folderTreeIndentSpacious: {
      message: "\u0623\u0648\u0633\u0639",
      description: "Wide subfolder indentation label"
    },
    export_select_mode_select_all: {
      message: "Select all",
      description: "Selection mode select all toggle"
    },
    export_select_mode_count: {
      message: "Selected {count}",
      description: "Selection mode selected message count"
    },
    export_select_mode_toggle: {
      message: "Select message",
      description: "Selection mode per-message toggle tooltip"
    },
    export_select_mode_select_below: {
      message: "Select messages below",
      description: "Selection mode top-left button to select messages below current line"
    },
    export_select_mode_empty: {
      message: "Please select at least one message to export.",
      description: "Selection mode validation when nothing is selected"
    },
    export_format_image_description: {
      message: "\u0635\u0648\u0631\u0629 PNG \u0648\u0627\u062D\u062F\u0629\u060C \u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0645\u0634\u0627\u0631\u0643\u0629 \u0639\u0628\u0631 \u0627\u0644\u0647\u0627\u062A\u0641.",
      description: "Description for Image export format"
    },
    export_image_progress: {
      message: "Generating image...",
      description: "Progress message while generating image export"
    },
    deepResearchSaveReport: {
      message: "Save Report",
      description: "Deep Research save report button"
    },
    deepResearchSaveReportTooltip: {
      message: "Export this research report",
      description: "Deep Research save report tooltip"
    },
    export_fontsize_label: {
      message: "\u062D\u062C\u0645 \u0627\u0644\u062E\u0637",
      description: "Label for font size slider in export dialog"
    },
    export_fontsize_preview: {
      message: "\u0646\u0635 \u0639\u0631\u0628\u064A \u0644\u0645\u0639\u0627\u064A\u0646\u0629 \u062D\u062C\u0645 \u0627\u0644\u062E\u0637 \u0641\u064A \u0627\u0644\u062A\u0635\u062F\u064A\u0631.",
      description: "Preview text for font size slider in export dialog"
    },
    export_error_generic: {
      message: "\u0641\u0634\u0644 \u0627\u0644\u062A\u0635\u062F\u064A\u0631: {error}",
      description: "\u0631\u0633\u0627\u0644\u0629 \u0641\u0634\u0644 \u062A\u0635\u062F\u064A\u0631 \u0639\u0627\u0645\u0629 \u0645\u0639 \u0627\u0644\u0633\u0628\u0628 \u0627\u0644\u062A\u0641\u0635\u064A\u0644\u064A"
    },
    export_error_refresh_retry: {
      message: "\u0641\u0634\u0644 \u062A\u0635\u062F\u064A\u0631 \u0627\u0644\u0635\u0648\u0631\u0629 \u0628\u0633\u0628\u0628 \u0645\u0634\u0643\u0644\u0629 \u0641\u064A \u0627\u0644\u0634\u0628\u0643\u0629. \u064A\u064F\u0631\u062C\u0649 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0635\u0641\u062D\u0629 \u062B\u0645 \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629.",
      description: "\u0625\u0631\u0634\u0627\u062F \u064A\u0638\u0647\u0631 \u0639\u0646\u062F \u0641\u0634\u0644 \u062A\u062D\u0645\u064A\u0644 \u0645\u0624\u0642\u062A \u0623\u062B\u0646\u0627\u0621 \u062A\u0635\u062F\u064A\u0631 \u0627\u0644\u0635\u0648\u0631\u0629"
    },
    export_md_include_source_confirm: {
      message: "\u064A\u062D\u062A\u0648\u064A \u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u0645\u064F\u0635\u062F\u064E\u0651\u0631 \u0639\u0644\u0649 \u0635\u0648\u0631 \u0645\u0646 \u0646\u062A\u0627\u0626\u062C \u0627\u0644\u0628\u062D\u062B. \u0647\u0644 \u062A\u0631\u064A\u062F \u062A\u0636\u0645\u064A\u0646 \u0631\u0648\u0627\u0628\u0637 \u0645\u0635\u062F\u0631 \u0627\u0644\u0635\u0648\u0631 \u0641\u064A Markdown\u061F",
      description: "Confirm dialog when exporting markdown with web search images"
    },
    deepResearch_exportedAt: {
      message: "\u0648\u0642\u062A \u0627\u0644\u062A\u0635\u062F\u064A\u0631",
      description: "\u062A\u0633\u0645\u064A\u0629 \u0627\u0644\u0637\u0627\u0628\u0639 \u0627\u0644\u0632\u0645\u0646\u064A \u0644\u0644\u062A\u0635\u062F\u064A\u0631 \u0641\u064A Deep Research"
    },
    deepResearch_totalPhases: {
      message: "\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0645\u0631\u0627\u062D\u0644",
      description: "\u062A\u0633\u0645\u064A\u0629 \u0625\u062C\u0645\u0627\u0644\u064A \u0645\u0631\u0627\u062D\u0644 \u0627\u0644\u062A\u0641\u0643\u064A\u0631 \u0641\u064A Deep Research"
    },
    deepResearch_thinkingPhase: {
      message: "\u0645\u0631\u062D\u0644\u0629 \u0627\u0644\u062A\u0641\u0643\u064A\u0631",
      description: "\u0639\u0646\u0648\u0627\u0646 \u0645\u0631\u062D\u0644\u0629 \u0627\u0644\u062A\u0641\u0643\u064A\u0631 \u0641\u064A Deep Research"
    },
    deepResearch_researchedWebsites: {
      message: "\u0627\u0644\u0645\u0648\u0627\u0642\u0639 \u0627\u0644\u0645\u0628\u062D\u0648\u062B\u0629",
      description: "\u0639\u0646\u0648\u0627\u0646 \u0642\u0633\u0645 \u0627\u0644\u0645\u0648\u0627\u0642\u0639 \u0627\u0644\u0645\u0628\u062D\u0648\u062B\u0629 \u0641\u064A Deep Research"
    }
  };

  // ../gemini-voyager/src/locales/en/messages.json
  var messages_default2 = {
    extName: {
      message: "Gemini Voyager",
      description: "Extension name"
    },
    extDescription: {
      message: "Supercharge your Gemini experience: timeline, folders, prompt vault, and chat export.",
      description: "Extension description"
    },
    scrollMode: {
      message: "Scroll mode",
      description: "Scroll mode label"
    },
    flow: {
      message: "Flow",
      description: "Flow mode"
    },
    jump: {
      message: "Jump",
      description: "Jump mode"
    },
    hideOuterContainer: {
      message: "Hide outer container",
      description: "Hide outer container label"
    },
    draggableTimeline: {
      message: "Draggable Timeline",
      description: "Draggable Timeline label"
    },
    enableMarkerLevel: {
      message: "Enable Node Levels",
      description: "Enable timeline node level feature"
    },
    enableMarkerLevelHint: {
      message: "Right-click timeline nodes to set their level and collapse children",
      description: "Node level feature hint"
    },
    experimentalLabel: {
      message: "Experimental",
      description: "Experimental feature label"
    },
    resetPosition: {
      message: "Reset Position",
      description: "Reset Position button"
    },
    resetTimelinePosition: {
      message: "Reset Timeline Position",
      description: "Reset timeline position button in timeline options"
    },
    language: {
      message: "Language",
      description: "Language label"
    },
    pm_title: {
      message: "Gemini Voyager",
      description: "Prompt Manager title"
    },
    pm_add: {
      message: "Add",
      description: "Add prompt button"
    },
    pm_search_placeholder: {
      message: "Search prompts or tags",
      description: "Search placeholder"
    },
    pm_import: {
      message: "Import",
      description: "Import button"
    },
    pm_export: {
      message: "Export",
      description: "Export button"
    },
    pm_prompt_placeholder: {
      message: "Prompt text",
      description: "Prompt textarea placeholder"
    },
    pm_tags_placeholder: {
      message: "Tags (comma separated)",
      description: "Tags input placeholder"
    },
    pm_save: {
      message: "Save",
      description: "Save prompt"
    },
    pm_cancel: {
      message: "Cancel",
      description: "Cancel"
    },
    pm_all_tags: {
      message: "All",
      description: "All tags chip"
    },
    pm_empty: {
      message: "No prompts yet",
      description: "Empty state"
    },
    pm_copy: {
      message: "Copy",
      description: "Copy prompt"
    },
    pm_copied: {
      message: "Copied",
      description: "Copied notice"
    },
    pm_delete: {
      message: "Delete",
      description: "Delete prompt"
    },
    pm_delete_confirm: {
      message: "Delete this prompt?",
      description: "Delete confirm"
    },
    pm_lock: {
      message: "Lock position",
      description: "Lock panel position"
    },
    pm_unlock: {
      message: "Unlock position",
      description: "Unlock panel position"
    },
    pm_import_invalid: {
      message: "Invalid file format",
      description: "Import invalid"
    },
    pm_import_success: {
      message: "Imported {count} prompts",
      description: "Import success"
    },
    pm_duplicate: {
      message: "Duplicate prompt",
      description: "Duplicate on add"
    },
    pm_deleted: {
      message: "Deleted",
      description: "Deleted notice"
    },
    pm_edit: {
      message: "Edit",
      description: "Edit prompt"
    },
    pm_expand: {
      message: "Expand",
      description: "Expand prompt text"
    },
    pm_collapse: {
      message: "Collapse",
      description: "Collapse prompt text"
    },
    pm_saved: {
      message: "Saved",
      description: "Saved notice"
    },
    pm_settings: {
      message: "Settings",
      description: "Settings button"
    },
    pm_settings_tooltip: {
      message: "Open extension settings",
      description: "Settings button tooltip"
    },
    pm_settings_fallback: {
      message: "Please click the extension icon in the browser toolbar to open settings",
      description: "Settings open failed message"
    },
    pm_backup: {
      message: "Local Backup",
      description: "Local backup button"
    },
    pm_backup_tooltip: {
      message: "Backup prompts and folders to a timestamped folder",
      description: "Backup button tooltip"
    },
    pm_backup_cancelled: {
      message: "Backup cancelled",
      description: "Backup cancelled hint"
    },
    pm_backup_error: {
      message: "\u2717 Backup failed",
      description: "Backup failed hint"
    },
    pm_backup_hint_options: {
      message: "The feature is integrated into the Prompt Manager on the Gemini page.",
      description: "Backup hint in options page"
    },
    pm_backup_step1: {
      message: "Open the Gemini page (gemini.google.com)",
      description: "Backup step 1"
    },
    pm_backup_step2: {
      message: "Click the extension icon in the bottom-right to open Prompt Manager",
      description: "Backup step 2"
    },
    pm_backup_step3: {
      message: 'Click the "\u{1F4BE} Local Backup" button and select a backup folder',
      description: "Backup step 3"
    },
    pm_backup_note: {
      message: "Backups include all prompts and folders, saved in a timestamped folder (format: backup-YYYYMMDD-HHMMSS)",
      description: "Backup feature note"
    },
    extensionVersion: {
      message: "Version",
      description: "Extension version label"
    },
    newVersionAvailable: {
      message: "New version available",
      description: "Update reminder title"
    },
    currentVersionLabel: {
      message: "Current",
      description: "Label for current version number"
    },
    latestVersionLabel: {
      message: "Latest",
      description: "Label for latest version number"
    },
    updateNow: {
      message: "Update",
      description: "CTA to update to latest version"
    },
    starProject: {
      message: "Support me \u2B50",
      description: "Github callout"
    },
    officialDocs: {
      message: "Official Docs",
      description: "Official docs link"
    },
    exportChatJson: {
      message: "Export conversation history",
      description: "Tooltip for export button"
    },
    folder_title: {
      message: "Folders",
      description: "Folder section title"
    },
    folder_create: {
      message: "Create folder",
      description: "Create folder button tooltip"
    },
    folder_name_prompt: {
      message: "Enter folder name:",
      description: "Create folder name prompt"
    },
    folder_rename_prompt: {
      message: "Enter new name:",
      description: "Rename folder prompt"
    },
    folder_delete_confirm: {
      message: "Delete this folder and all its contents?",
      description: "Delete folder confirmation"
    },
    folder_create_subfolder: {
      message: "Create subfolder",
      description: "Create subfolder menu item"
    },
    folder_rename: {
      message: "Rename",
      description: "Rename folder menu item"
    },
    folder_change_color: {
      message: "Change Color",
      description: "Change folder color menu item"
    },
    folder_delete: {
      message: "Delete",
      description: "Delete folder menu item"
    },
    folder_color_default: {
      message: "Default",
      description: "Default folder color name"
    },
    folder_color_red: {
      message: "Red",
      description: "Red folder color name"
    },
    folder_color_orange: {
      message: "Orange",
      description: "Orange folder color name"
    },
    folder_color_yellow: {
      message: "Yellow",
      description: "Yellow folder color name"
    },
    folder_color_green: {
      message: "Green",
      description: "Green folder color name"
    },
    folder_color_blue: {
      message: "Blue",
      description: "Blue folder color name"
    },
    folder_color_purple: {
      message: "Purple",
      description: "Purple folder color name"
    },
    folder_color_pink: {
      message: "Pink",
      description: "Pink folder color name"
    },
    folder_color_custom: {
      message: "Custom",
      description: "Custom folder color name"
    },
    folder_empty: {
      message: "No folders yet",
      description: "Empty state placeholder when no folders exist"
    },
    folder_pin: {
      message: "Pin folder",
      description: "Pin folder menu item"
    },
    folder_unpin: {
      message: "Unpin folder",
      description: "Unpin folder menu item"
    },
    folder_remove_conversation: {
      message: "Remove from folder",
      description: "Remove conversation button tooltip"
    },
    folder_remove_conversation_confirm: {
      message: 'Remove "{title}" from this folder?',
      description: "Remove conversation confirmation"
    },
    conversation_more: {
      message: "More options",
      description: "Conversation more options button tooltip"
    },
    conversation_move_to_folder: {
      message: "Move to folder",
      description: "Move conversation to folder menu item"
    },
    conversation_move_to_folder_title: {
      message: "Move to folder",
      description: "Move conversation to folder dialog title"
    },
    chatWidth: {
      message: "Chat width",
      description: "Chat width adjustment label"
    },
    chatWidthNarrow: {
      message: "Narrow",
      description: "Narrow chat width label"
    },
    chatWidthWide: {
      message: "Wide",
      description: "Wide chat width label"
    },
    sidebarWidth: {
      message: "Sidebar width",
      description: "Sidebar width adjustment label"
    },
    sidebarWidthNarrow: {
      message: "Narrow",
      description: "Narrow sidebar width label"
    },
    sidebarWidthWide: {
      message: "Wide",
      description: "Wide sidebar width label"
    },
    formula_copied: {
      message: "\u2713 Formula copied",
      description: "Formula copied success message"
    },
    formula_copy_failed: {
      message: "\u2717 Failed to copy",
      description: "Formula copy failed message"
    },
    formulaCopyFormat: {
      message: "Formula copy format",
      description: "Formula copy format setting label"
    },
    formulaCopyFormatLatex: {
      message: "LaTeX",
      description: "LaTeX format option"
    },
    formulaCopyFormatUnicodeMath: {
      message: "MathML (Word)",
      description: "Label for MathML formula copy format option (formerly UnicodeMath)"
    },
    formulaCopyFormatHint: {
      message: "Choose the format when copying formulas by clicking",
      description: "Formula copy format hint"
    },
    formulaCopyFormatNoDollar: {
      message: "LaTeX (No Dollar Sign)",
      description: "LaTeX format option without dollar signs"
    },
    folder_filter_current_user: {
      message: "Account Isolation",
      description: "Show only conversations from the current Google account"
    },
    folder_export: {
      message: "Export folders",
      description: "Export folders button tooltip"
    },
    folder_import_export: {
      message: "Import/Export folders",
      description: "Combined import/export button tooltip"
    },
    folder_cloud_upload: {
      message: "Upload to Cloud",
      description: "Cloud upload button tooltip"
    },
    folder_cloud_sync: {
      message: "Sync from Cloud",
      description: "Cloud sync button tooltip"
    },
    folder_import: {
      message: "Import folders",
      description: "Import folders button tooltip"
    },
    folder_import_title: {
      message: "Import Folder Configuration",
      description: "Import dialog title"
    },
    folder_import_strategy: {
      message: "Import strategy:",
      description: "Import strategy label"
    },
    folder_import_merge: {
      message: "Merge with existing folders",
      description: "Merge import strategy"
    },
    folder_import_overwrite: {
      message: "Overwrite existing folders",
      description: "Overwrite import strategy"
    },
    folder_import_select_file: {
      message: "Select a JSON file to import",
      description: "Import file selection prompt"
    },
    folder_import_success: {
      message: "\u2713 Imported {folders} folders, {conversations} conversations",
      description: "Import success message"
    },
    folder_import_success_skipped: {
      message: "\u2713 Imported {folders} folders, {conversations} conversations ({skipped} duplicates skipped)",
      description: "Import success with skipped message"
    },
    folder_import_error: {
      message: "\u2717 Import failed: {error}",
      description: "Import error message"
    },
    folder_export_success: {
      message: "\u2713 Folders exported successfully",
      description: "Export success message"
    },
    folder_import_invalid_format: {
      message: "Invalid file format. Please select a valid folder configuration file.",
      description: "Invalid format error"
    },
    folder_import_confirm_overwrite: {
      message: "This will replace all existing folders. A backup will be created. Continue?",
      description: "Overwrite confirmation"
    },
    export_dialog_title: {
      message: "Export Conversation",
      description: "Export dialog title"
    },
    export_dialog_select: {
      message: "Choose export format:",
      description: "Export format selection label"
    },
    export_dialog_warning: {
      message: "\u26A0\uFE0F After clicking export, the system will auto-jump to the beginning to load all content. Please do not operate; export will continue automatically after the jump.",
      description: "Warning about auto-jump and loading completeness"
    },
    export_dialog_safari_cmdp_hint: {
      message: "Safari tip: Click 'Export' below, wait a moment, then press \u2318P and choose 'Save to PDF'.",
      description: "Safari-specific hint for PDF export"
    },
    export_toast_safari_pdf_ready: {
      message: "You can now press Command + P to export PDF.",
      description: "Safari-specific toast shown after PDF export is prepared"
    },
    export_dialog_safari_markdown_hint: {
      message: "Note: Due to Safari limitations, images in chat history cannot be extracted. For complete export, use PDF export.",
      description: "Warning about image references in Safari markdown export"
    },
    export_format_json_description: {
      message: "Machine-readable format for developers",
      description: "Description for JSON export format"
    },
    export_format_markdown_description: {
      message: "Clean, portable text format (recommended)",
      description: "Description for Markdown export format"
    },
    export_format_pdf_description: {
      message: "Print-friendly format via Save as PDF",
      description: "Description for PDF export format"
    },
    editInputWidth: {
      message: "Edit input width",
      description: "Edit input width adjustment label"
    },
    editInputWidthNarrow: {
      message: "Narrow",
      description: "Narrow edit input width label"
    },
    editInputWidthWide: {
      message: "Wide",
      description: "Wide edit input width label"
    },
    timelineOptions: {
      message: "Timeline Options",
      description: "Timeline options section label"
    },
    folderOptions: {
      message: "Folder Options",
      description: "Folder options section label"
    },
    enableFolderFeature: {
      message: "Enable folder feature",
      description: "Enable or disable the folder feature"
    },
    hideArchivedConversations: {
      message: "Hide archived conversations",
      description: "Hide conversations that are in folders from the main list"
    },
    conversation_star: {
      message: "Star conversation",
      description: "Star conversation button tooltip"
    },
    conversation_unstar: {
      message: "Unstar conversation",
      description: "Unstar conversation button tooltip"
    },
    conversation_untitled: {
      message: "Untitled",
      description: "Fallback title for conversations without a name"
    },
    geminiOnlyNotice: {
      message: "Runs on Gemini (including Enterprise) & AI Studio by default. Add other sites below to enable the Prompt Manager there.",
      description: "Notice that defaults are limited to Gemini/AI Studio"
    },
    folderManager_dataLossWarning: {
      message: "\u26A0\uFE0F Warning: Failed to load folder data. Your folders may have been corrupted. Please check the browser console for details and try restoring from backup if available.",
      description: "Warning shown when folder data fails to load"
    },
    backupOptions: {
      message: "Auto Backup",
      description: "Backup options section label"
    },
    backupEnabled: {
      message: "Enable auto backup",
      description: "Enable auto backup toggle"
    },
    backupNow: {
      message: "Backup Now",
      description: "Backup now button"
    },
    backupSelectFolder: {
      message: "Select Backup Folder",
      description: "Select backup folder button"
    },
    backupFolderSelected: {
      message: "Backup folder: {folder}",
      description: "Shows selected backup folder"
    },
    backupIncludePrompts: {
      message: "Include prompts",
      description: "Include prompts in backup toggle"
    },
    backupIncludeFolders: {
      message: "Include folders",
      description: "Include folders in backup toggle"
    },
    backupIntervalLabel: {
      message: "Backup interval",
      description: "Backup interval label"
    },
    backupIntervalManual: {
      message: "Manual only",
      description: "Manual backup mode"
    },
    backupIntervalDaily: {
      message: "Daily",
      description: "Daily backup interval"
    },
    backupIntervalWeekly: {
      message: "Weekly (7 days)",
      description: "Weekly backup interval"
    },
    backupLastBackup: {
      message: "Last backup: {time}",
      description: "Last backup timestamp"
    },
    backupNever: {
      message: "Never",
      description: "Never backed up"
    },
    backupSuccess: {
      message: "\u2713 Backup created: {prompts} prompts, {folders} folders, {conversations} conversations",
      description: "Backup success message"
    },
    backupError: {
      message: "\u2717 Backup failed: {error}",
      description: "Backup error message"
    },
    backupNotSupported: {
      message: "\u26A0\uFE0F Auto backup requires a modern browser with File System Access API support",
      description: "Browser not supported message"
    },
    backupSelectFolderFirst: {
      message: "Please select a backup folder first",
      description: "No folder selected warning"
    },
    backupUserCancelled: {
      message: "Backup cancelled",
      description: "User cancelled folder selection"
    },
    backupConfigSaved: {
      message: "\u2713 Backup settings saved",
      description: "Config saved message"
    },
    backupPermissionDenied: {
      message: "\u26A0\uFE0F Cannot access this directory. Please choose a different location (e.g., Documents, Downloads, or a folder in Desktop)",
      description: "Permission denied for restricted directory"
    },
    backupConfigureInOptions: {
      message: "Backup configuration requires the Options page. Click the button below to open it (click the three dots next to the extension icon \u2192 Options).",
      description: "Backup configure in options page explanation"
    },
    openOptionsPage: {
      message: "Open Options Page",
      description: "Open options page button"
    },
    optionsPageSubtitle: {
      message: "Extension Options",
      description: "Options page subtitle"
    },
    optionsComingSoon: {
      message: "More options coming soon...",
      description: "Options page placeholder text"
    },
    backupDataAccessNotice: {
      message: "Data Access Limitation",
      description: "Backup data access limitation title"
    },
    backupDataAccessHint: {
      message: "Due to browser security restrictions, this Options page cannot directly access prompts and folder data from Gemini pages. Please use the Prompt Manager and Folder Export features on the Gemini page for manual backups.",
      description: "Backup data access limitation explanation"
    },
    promptManagerOptions: {
      message: "Prompt Manager",
      description: "Prompt Manager options section label"
    },
    hidePromptManager: {
      message: "Hide Prompt Manager",
      description: "Hide the prompt manager floating ball"
    },
    hidePromptManagerHint: {
      message: "Hide the Prompt Manager floating ball on the page",
      description: "Hint for hiding prompt manager feature"
    },
    customWebsites: {
      message: "Custom websites",
      description: "Custom websites for prompt manager"
    },
    customWebsitesPlaceholder: {
      message: "Enter website URL (e.g., chatgpt.com)",
      description: "Custom websites input placeholder"
    },
    customWebsitesHint: {
      message: "Add websites where you want to use the Prompt Manager. Only the Prompt Manager will be activated on these sites.",
      description: "Custom websites hint"
    },
    addWebsite: {
      message: "Add website",
      description: "Add website button"
    },
    removeWebsite: {
      message: "Remove",
      description: "Remove website button"
    },
    invalidUrl: {
      message: "Invalid URL format",
      description: "Invalid URL error message"
    },
    websiteAdded: {
      message: "Website added",
      description: "Website added success message"
    },
    websiteRemoved: {
      message: "Website removed",
      description: "Website removed success message"
    },
    permissionDenied: {
      message: "Permission denied. Please allow access to this website.",
      description: "Permission denied error message"
    },
    permissionRequestFailed: {
      message: "Permission request failed. Please try again or grant access in the extension settings.",
      description: "Permission request failure message"
    },
    customWebsitesNote: {
      message: "Tip: You'll be asked to allow access when adding a site. After granting permission, reload that site so the Prompt Manager can start.",
      description: "Custom websites reload/permission note"
    },
    starredHistory: {
      message: "Starred History",
      description: "Starred history title"
    },
    viewStarredHistory: {
      message: "View Starred History",
      description: "View starred history button"
    },
    noStarredMessages: {
      message: "No starred messages yet",
      description: "No starred messages placeholder"
    },
    removeFromStarred: {
      message: "Remove from starred",
      description: "Remove from starred tooltip"
    },
    justNow: {
      message: "Just now",
      description: "Just now time label"
    },
    hoursAgo: {
      message: "hours ago",
      description: "Hours ago label"
    },
    yesterday: {
      message: "Yesterday",
      description: "Yesterday date label"
    },
    daysAgo: {
      message: "days ago",
      description: "Days ago label"
    },
    loading: {
      message: "Loading...",
      description: "Loading message"
    },
    keyboardShortcuts: {
      message: "Keyboard Shortcuts",
      description: "Keyboard shortcuts section title"
    },
    enableShortcuts: {
      message: "Enable keyboard shortcuts",
      description: "Enable shortcuts toggle label"
    },
    previousNode: {
      message: "Previous node",
      description: "Previous timeline node shortcut label"
    },
    nextNode: {
      message: "Next node",
      description: "Next timeline node shortcut label"
    },
    shortcutKey: {
      message: "Key",
      description: "Shortcut key label"
    },
    shortcutModifiers: {
      message: "Modifiers",
      description: "Shortcut modifiers label"
    },
    resetShortcuts: {
      message: "Reset to defaults",
      description: "Reset shortcuts button"
    },
    shortcutsResetSuccess: {
      message: "Shortcuts reset to defaults",
      description: "Shortcuts reset success message"
    },
    shortcutsDescription: {
      message: "Navigate timeline nodes using keyboard shortcuts",
      description: "Shortcuts description"
    },
    modifierNone: {
      message: "None",
      description: "No modifier key"
    },
    modifierAlt: {
      message: "Alt",
      description: "Alt modifier key"
    },
    modifierCtrl: {
      message: "Ctrl",
      description: "Ctrl modifier key"
    },
    modifierShift: {
      message: "Shift",
      description: "Shift modifier key"
    },
    modifierMeta: {
      message: "Cmd/Win",
      description: "Meta/Command/Windows modifier key"
    },
    cloudSync: {
      message: "Cloud Sync",
      description: "Cloud sync section title"
    },
    cloudSyncDescription: {
      message: "Sync folders and prompts to Google Drive",
      description: "Cloud sync description"
    },
    syncModeDisabled: {
      message: "Disabled",
      description: "Sync mode disabled option"
    },
    syncModeManual: {
      message: "Manual",
      description: "Sync mode manual option"
    },
    syncServerPort: {
      message: "Server Port",
      description: "Port number for the sync server"
    },
    syncNow: {
      message: "Sync Now",
      description: "Sync now button"
    },
    lastSynced: {
      message: "Last synced: {time}",
      description: "Last sync timestamp"
    },
    neverSynced: {
      message: "Never synced",
      description: "Never synced message"
    },
    lastUploaded: {
      message: "Uploaded: {time}",
      description: "Last upload timestamp"
    },
    neverUploaded: {
      message: "Never uploaded",
      description: "Never uploaded message"
    },
    syncSuccess: {
      message: "\u2713 Synced successfully",
      description: "Sync success message"
    },
    syncError: {
      message: "\u2717 Sync failed: {error}",
      description: "Sync error message"
    },
    syncInProgress: {
      message: "Syncing...",
      description: "Sync in progress message"
    },
    uploadInProgress: {
      message: "Uploading...",
      description: "Upload in progress message"
    },
    uploadSuccess: {
      message: "\u2713 Uploaded successfully",
      description: "Upload success message"
    },
    downloadInProgress: {
      message: "Downloading...",
      description: "Download in progress message"
    },
    downloadMergeSuccess: {
      message: "\u2713 Downloaded and merged",
      description: "Download and merge success message"
    },
    syncUpload: {
      message: "Upload",
      description: "Upload button label"
    },
    syncMerge: {
      message: "Download & Merge",
      description: "Merge button label"
    },
    syncMode: {
      message: "Sync Mode",
      description: "Sync mode label"
    },
    minutesAgo: {
      message: "minutes ago",
      description: "Minutes ago label"
    },
    syncNoData: {
      message: "No sync data found in Drive",
      description: "Error message when no data is found in Drive"
    },
    syncUploadFailed: {
      message: "Upload failed",
      description: "Error message when upload fails"
    },
    syncDownloadFailed: {
      message: "Download failed",
      description: "Error message when download fails"
    },
    syncAuthFailed: {
      message: "Authentication failed",
      description: "Error message when authentication fails"
    },
    signOut: {
      message: "Sign out",
      description: "Sign out button"
    },
    signInWithGoogle: {
      message: "Sign in with Google",
      description: "Sign in with Google button"
    },
    nanobananaOptions: {
      message: "NanoBanana Options",
      description: "NanoBanana options section label"
    },
    enableNanobananaWatermarkRemover: {
      message: "Remove NanoBanana watermark",
      description: "Enable automatic watermark removal for NanoBanana images"
    },
    nanobananaWatermarkRemoverHint: {
      message: "Automatically removes visible Gemini watermarks from generated images",
      description: "Watermark remover feature hint"
    },
    nanobananaDownloadTooltip: {
      message: "Download unwatermarked image (NanoBanana)",
      description: "Download button tooltip"
    },
    deepResearchDownload: {
      message: "Download thinking content",
      description: "Deep Research download button text"
    },
    deepResearchDownloadTooltip: {
      message: "Download thinking content as Markdown",
      description: "Deep Research download button tooltip"
    },
    folder_uncategorized: {
      message: "Uncategorized",
      description: "Label for root-level conversations not in any folder"
    },
    timelineLevelTitle: {
      message: "Node Level",
      description: "Title for timeline node level context menu"
    },
    timelineLevel1: {
      message: "Level 1",
      description: "Timeline node level 1 option"
    },
    timelineLevel2: {
      message: "Level 2",
      description: "Timeline node level 2 option"
    },
    timelineLevel3: {
      message: "Level 3",
      description: "Timeline node level 3 option"
    },
    timelineCollapse: {
      message: "Collapse",
      description: "Collapse children"
    },
    timelineExpand: {
      message: "Expand",
      description: "Expand children"
    },
    timelinePreviewSearch: {
      message: "Search...",
      description: "Timeline preview panel search placeholder"
    },
    timelinePreviewNoResults: {
      message: "No results",
      description: "Timeline preview panel no search results"
    },
    timelinePreviewNoMessages: {
      message: "No messages",
      description: "Timeline preview panel no messages"
    },
    quoteReply: {
      message: "Quote Reply",
      description: "Quote reply button text"
    },
    inputCollapseOptions: {
      message: "Input Options",
      description: "Input options section label"
    },
    enableInputCollapse: {
      message: "Enable input collapse",
      description: "Enable input collapse toggle label"
    },
    enableInputCollapseHint: {
      message: "Collapse the input area when empty to gain more reading space",
      description: "Input collapse feature hint"
    },
    inputCollapsePlaceholder: {
      message: "Message Gemini",
      description: "Placeholder text shown in collapsed input"
    },
    ctrlEnterSend: {
      message: "Ctrl+Enter to send",
      description: "Ctrl+Enter to send toggle label"
    },
    ctrlEnterSendHint: {
      message: "Press Ctrl+Enter to send messages, Enter to add a new line",
      description: "Ctrl+Enter to send feature hint"
    },
    batch_delete_confirm: {
      message: "Are you sure you want to delete {count} conversation(s)? This action cannot be undone.",
      description: "Batch delete confirmation message"
    },
    batch_delete_in_progress: {
      message: "Deleting... ({current}/{total})",
      description: "Batch delete progress message"
    },
    batch_delete_success: {
      message: "\u2713 Deleted {count} conversation(s)",
      description: "Batch delete success message"
    },
    batch_delete_partial: {
      message: "Deletion complete: {success} succeeded, {failed} failed",
      description: "Batch delete partial success message"
    },
    batch_delete_limit_reached: {
      message: "Maximum {max} conversations can be selected at once",
      description: "Batch delete limit warning"
    },
    batch_delete_button: {
      message: "Delete selected",
      description: "Batch delete button tooltip in multi-select mode"
    },
    batch_delete_match_patterns: {
      message: "delete,confirm,yes,ok,remove,\u5220\u9664,\u786E\u8BA4,\u786E\u5B9A,\u662F",
      description: "Comma-separated list of keywords to match native delete/confirm buttons (case-insensitive)"
    },
    generalOptions: {
      message: "General Options",
      description: "General options section label"
    },
    enableTabTitleUpdate: {
      message: "Sync tab title with conversation",
      description: "Enable tab title sync toggle label"
    },
    enableTabTitleUpdateHint: {
      message: "Automatically update the browser tab title to match the current conversation title",
      description: "Tab title sync feature hint"
    },
    enableMermaidRendering: {
      message: "Enable Mermaid diagram rendering",
      description: "Enable Mermaid diagram rendering toggle label"
    },
    enableMermaidRenderingHint: {
      message: "Automatically render Mermaid diagrams in code blocks",
      description: "Mermaid rendering feature hint"
    },
    enableQuoteReply: {
      message: "Enable quote reply",
      description: "Enable quote reply toggle label"
    },
    enableQuoteReplyHint: {
      message: "Show a floating button to quote selected text when text is selected in conversations",
      description: "Quote reply feature hint"
    },
    contextSync: {
      message: "Context Sync",
      description: "Context Sync title"
    },
    contextSyncDescription: {
      message: "Sync chat context to your local IDE",
      description: "Context Sync description"
    },
    syncToIDE: {
      message: "Sync to IDE",
      description: "Sync to IDE button"
    },
    ideOnline: {
      message: "IDE Online",
      description: "IDE Online status"
    },
    ideOffline: {
      message: "IDE Offline",
      description: "IDE Offline status"
    },
    syncing: {
      message: "Syncing...",
      description: "Syncing status"
    },
    checkServer: {
      message: "Please start AI Sync server in VS Code",
      description: "Check server hint"
    },
    capturing: {
      message: "Capturing dialogue...",
      description: "Capturing status"
    },
    syncedSuccess: {
      message: "Synced successfully!",
      description: "Synced success message"
    },
    downloadingOriginal: {
      message: "Downloading original image",
      description: "Status when downloading original image"
    },
    downloadingOriginalLarge: {
      message: "Downloading original image (large file)",
      description: "Status when downloading large original image"
    },
    downloadLargeWarning: {
      message: "Large file warning",
      description: "Warning shown for large downloads"
    },
    downloadProcessing: {
      message: "Processing watermark",
      description: "Status when processing watermark removal"
    },
    downloadSuccess: {
      message: "Downloading...",
      description: "Status when download starts"
    },
    downloadError: {
      message: "Failed",
      description: "Status prefix when download fails"
    },
    recentsHide: {
      message: "Hide recent items",
      description: "Tooltip for hiding recents preview section"
    },
    recentsShow: {
      message: "Show recent items",
      description: "Tooltip for showing recents preview section"
    },
    gemsHide: {
      message: "Hide Gems",
      description: "Tooltip for hiding Gems list section"
    },
    gemsShow: {
      message: "Show Gems",
      description: "Tooltip for showing Gems list section"
    },
    setAsDefaultModel: {
      message: "Set as default model",
      description: "Tooltip for setting default model"
    },
    cancelDefaultModel: {
      message: "Cancel default model",
      description: "Tooltip for cancelling default model"
    },
    defaultModelSet: {
      message: "Default model set: $1",
      description: "Toast message when default model is set"
    },
    defaultModelCleared: {
      message: "Default model cleared",
      description: "Toast message when default model is cleared"
    },
    sidebarAutoHide: {
      message: "Auto-hide sidebar",
      description: "Auto-hide sidebar toggle label"
    },
    sidebarAutoHideHint: {
      message: "Automatically collapse sidebar when mouse leaves, expand when mouse enters",
      description: "Auto-hide sidebar feature hint"
    },
    folderSpacing: {
      message: "Folder spacing",
      description: "Folder spacing adjustment label"
    },
    folderSpacingCompact: {
      message: "Compact",
      description: "Compact folder spacing label"
    },
    folderSpacingSpacious: {
      message: "Spacious",
      description: "Spacious folder spacing label"
    },
    folderTreeIndent: {
      message: "Subfolder indent",
      description: "Subfolder tree indentation adjustment label"
    },
    folderTreeIndentCompact: {
      message: "Narrow",
      description: "Narrow subfolder indentation label"
    },
    folderTreeIndentSpacious: {
      message: "Wide",
      description: "Wide subfolder indentation label"
    },
    export_select_mode_select_all: {
      message: "Select all",
      description: "Selection mode select all toggle"
    },
    export_select_mode_count: {
      message: "Selected {count}",
      description: "Selection mode selected message count"
    },
    export_select_mode_toggle: {
      message: "Select message",
      description: "Selection mode per-message toggle tooltip"
    },
    export_select_mode_select_below: {
      message: "Select messages below",
      description: "Selection mode top-left button to select messages below current line"
    },
    export_select_mode_empty: {
      message: "Please select at least one message to export.",
      description: "Selection mode validation when nothing is selected"
    },
    export_format_image_description: {
      message: "Single PNG image, great for mobile sharing.",
      description: "Description for Image export format"
    },
    export_image_progress: {
      message: "Generating image...",
      description: "Progress message while generating image export"
    },
    deepResearchSaveReport: {
      message: "Save Report",
      description: "Deep Research save report button"
    },
    deepResearchSaveReportTooltip: {
      message: "Export this research report",
      description: "Deep Research save report tooltip"
    },
    export_fontsize_label: {
      message: "Font Size",
      description: "Label for font size slider in export dialog"
    },
    export_fontsize_preview: {
      message: "The quick brown fox jumps over the lazy dog.",
      description: "Preview text for font size slider in export dialog"
    },
    export_error_generic: {
      message: "Export failed: {error}",
      description: "Generic export failure with detailed reason"
    },
    export_error_refresh_retry: {
      message: "Image export failed due to network issues. Please refresh the page and try again.",
      description: "Guidance shown when image export fails due to transient loading issues"
    },
    export_md_include_source_confirm: {
      message: "The exported content contains web search images. Include image source links in the Markdown?",
      description: "Confirm dialog when exporting markdown with web search images"
    },
    deepResearch_exportedAt: {
      message: "Exported At",
      description: "Deep Research export timestamp label"
    },
    deepResearch_totalPhases: {
      message: "Total Phases",
      description: "Deep Research total thinking phases label"
    },
    deepResearch_thinkingPhase: {
      message: "Thinking Phase",
      description: "Deep Research thinking phase header"
    },
    deepResearch_researchedWebsites: {
      message: "Researched Websites",
      description: "Deep Research researched websites section header"
    }
  };

  // ../gemini-voyager/src/locales/es/messages.json
  var messages_default3 = {
    extName: {
      message: "Gemini Voyager",
      description: "Extension name"
    },
    extDescription: {
      message: "Mejora tu experiencia Gemini: l\xEDnea de tiempo, carpetas, prompts y exportaci\xF3n.",
      description: "Extension description"
    },
    scrollMode: {
      message: "Modo desplazamiento",
      description: "Scroll mode label"
    },
    flow: {
      message: "Flujo",
      description: "Flow mode"
    },
    jump: {
      message: "Salto",
      description: "Jump mode"
    },
    hideOuterContainer: {
      message: "Ocultar contenedor exterior",
      description: "Hide outer container label"
    },
    draggableTimeline: {
      message: "L\xEDnea de tiempo arrastrable",
      description: "Draggable Timeline label"
    },
    enableMarkerLevel: {
      message: "Habilitar niveles de nodo",
      description: "Enable timeline node level feature"
    },
    enableMarkerLevelHint: {
      message: "Haz clic derecho en los nodos de la l\xEDnea de tiempo para establecer su nivel y contraer hijos",
      description: "Node level feature hint"
    },
    experimentalLabel: {
      message: "Experimental",
      description: "Experimental feature label"
    },
    resetPosition: {
      message: "Restablecer posici\xF3n",
      description: "Reset Position button"
    },
    resetTimelinePosition: {
      message: "Restablecer posici\xF3n de la l\xEDnea de tiempo",
      description: "Reset timeline position button in timeline options"
    },
    language: {
      message: "Idioma",
      description: "Language label"
    },
    pm_title: {
      message: "Gemini Voyager",
      description: "Prompt Manager title"
    },
    pm_add: {
      message: "A\xF1adir",
      description: "Add prompt button"
    },
    pm_search_placeholder: {
      message: "Buscar prompts o etiquetas",
      description: "Search placeholder"
    },
    pm_import: {
      message: "Importar",
      description: "Import button"
    },
    pm_export: {
      message: "Exportar",
      description: "Export button"
    },
    pm_prompt_placeholder: {
      message: "Texto del prompt",
      description: "Prompt textarea placeholder"
    },
    pm_tags_placeholder: {
      message: "Etiquetas (separadas por comas)",
      description: "Tags input placeholder"
    },
    pm_save: {
      message: "Guardar",
      description: "Save prompt"
    },
    pm_cancel: {
      message: "Cancelar",
      description: "Cancel"
    },
    pm_all_tags: {
      message: "Todo",
      description: "All tags chip"
    },
    pm_empty: {
      message: "No hay prompts todav\xEDa",
      description: "Empty state"
    },
    pm_copy: {
      message: "Copiar",
      description: "Copy prompt"
    },
    pm_copied: {
      message: "Copiado",
      description: "Copied notice"
    },
    pm_delete: {
      message: "Eliminar",
      description: "Delete prompt"
    },
    pm_delete_confirm: {
      message: "\xBFEliminar este prompt?",
      description: "Delete confirm"
    },
    pm_lock: {
      message: "Bloquear posici\xF3n",
      description: "Lock panel position"
    },
    pm_unlock: {
      message: "Desbloquear posici\xF3n",
      description: "Unlock panel position"
    },
    pm_import_invalid: {
      message: "Formato de archivo inv\xE1lido",
      description: "Import invalid"
    },
    pm_import_success: {
      message: "Importados {count} prompts",
      description: "Import success"
    },
    pm_duplicate: {
      message: "Duplicar prompt",
      description: "Duplicate on add"
    },
    pm_deleted: {
      message: "Eliminado",
      description: "Deleted notice"
    },
    pm_edit: {
      message: "Editar",
      description: "Edit prompt"
    },
    pm_expand: {
      message: "Expandir",
      description: "Expand prompt text"
    },
    pm_collapse: {
      message: "Contraer",
      description: "Collapse prompt text"
    },
    pm_saved: {
      message: "Guardado",
      description: "Saved notice"
    },
    pm_settings: {
      message: "Configuraci\xF3n",
      description: "Settings button"
    },
    pm_settings_tooltip: {
      message: "Abrir configuraci\xF3n de la extensi\xF3n",
      description: "Settings button tooltip"
    },
    pm_settings_fallback: {
      message: "Por favor, haz clic en el icono de la extensi\xF3n en la barra del navegador para abrir la configuraci\xF3n",
      description: "Settings open failed message"
    },
    pm_backup: {
      message: "Respaldo local",
      description: "Local backup button"
    },
    pm_backup_tooltip: {
      message: "Respaldar prompts y carpetas en una carpeta con marca de tiempo",
      description: "Backup button tooltip"
    },
    pm_backup_cancelled: {
      message: "Respaldo cancelado",
      description: "Backup cancelled hint"
    },
    pm_backup_error: {
      message: "\u2717 Error en el respaldo",
      description: "Backup failed hint"
    },
    pm_backup_hint_options: {
      message: "La funci\xF3n est\xE1 integrada en el Gestor de Prompts en la p\xE1gina de Gemini.",
      description: "Backup hint in options page"
    },
    pm_backup_step1: {
      message: "Abre la p\xE1gina de Gemini (gemini.google.com)",
      description: "Backup step 1"
    },
    pm_backup_step2: {
      message: "Haz clic en el icono de la extensi\xF3n en la parte inferior derecha para abrir el Gestor de Prompts",
      description: "Backup step 2"
    },
    pm_backup_step3: {
      message: 'Haz clic en el bot\xF3n "\u{1F4BE} Respaldo local" y selecciona una carpeta de respaldo',
      description: "Backup step 3"
    },
    pm_backup_note: {
      message: "Los respaldos incluyen todos los prompts y carpetas, guardados en una carpeta con marca de tiempo (formato: backup-YYYYMMDD-HHMMSS)",
      description: "Backup feature note"
    },
    extensionVersion: {
      message: "Versi\xF3n",
      description: "Extension version label"
    },
    newVersionAvailable: {
      message: "Nueva versi\xF3n disponible",
      description: "Update reminder title"
    },
    currentVersionLabel: {
      message: "Actual",
      description: "Label for current version number"
    },
    latestVersionLabel: {
      message: "\xDAltima",
      description: "Label for latest version number"
    },
    updateNow: {
      message: "Actualizar",
      description: "CTA to update to latest version"
    },
    starProject: {
      message: "Ap\xF3yame \u2B50",
      description: "Github callout"
    },
    officialDocs: {
      message: "Documentaci\xF3n",
      description: "Official docs link"
    },
    exportChatJson: {
      message: "Exportar historial de conversaci\xF3n",
      description: "Tooltip for export button"
    },
    folder_title: {
      message: "Carpetas",
      description: "Folder section title"
    },
    folder_create: {
      message: "Crear carpeta",
      description: "Create folder button tooltip"
    },
    folder_name_prompt: {
      message: "Introduce el nombre de la carpeta:",
      description: "Create folder name prompt"
    },
    folder_rename_prompt: {
      message: "Introduce el nuevo nombre:",
      description: "Rename folder prompt"
    },
    folder_delete_confirm: {
      message: "\xBFEliminar esta carpeta y todo su contenido?",
      description: "Delete folder confirmation"
    },
    folder_create_subfolder: {
      message: "Crear subcarpeta",
      description: "Create subfolder menu item"
    },
    folder_rename: {
      message: "Renombrar",
      description: "Rename folder menu item"
    },
    folder_change_color: {
      message: "Cambiar color",
      description: "Change folder color menu item"
    },
    folder_delete: {
      message: "Eliminar",
      description: "Delete folder menu item"
    },
    folder_color_default: {
      message: "Predeterminado",
      description: "Default folder color name"
    },
    folder_color_red: {
      message: "Rojo",
      description: "Red folder color name"
    },
    folder_color_orange: {
      message: "Naranja",
      description: "Orange folder color name"
    },
    folder_color_yellow: {
      message: "Amarillo",
      description: "Yellow folder color name"
    },
    folder_color_green: {
      message: "Verde",
      description: "Green folder color name"
    },
    folder_color_blue: {
      message: "Azul",
      description: "Blue folder color name"
    },
    folder_color_purple: {
      message: "Morado",
      description: "Purple folder color name"
    },
    folder_color_pink: {
      message: "Rosa",
      description: "Pink folder color name"
    },
    folder_color_custom: {
      message: "Personalizado",
      description: "Custom folder color name"
    },
    folder_empty: {
      message: "No hay carpetas",
      description: "Empty state placeholder when no folders exist"
    },
    folder_pin: {
      message: "Fijar carpeta",
      description: "Pin folder menu item"
    },
    folder_unpin: {
      message: "Desfijar carpeta",
      description: "Unpin folder menu item"
    },
    folder_remove_conversation: {
      message: "Eliminar de la carpeta",
      description: "Remove conversation button tooltip"
    },
    folder_remove_conversation_confirm: {
      message: '\xBFEliminar "{title}" de esta carpeta?',
      description: "Remove conversation confirmation"
    },
    conversation_more: {
      message: "M\xE1s opciones",
      description: "Conversation more options button tooltip"
    },
    conversation_move_to_folder: {
      message: "Mover a carpeta",
      description: "Move conversation to folder menu item"
    },
    conversation_move_to_folder_title: {
      message: "Mover a carpeta",
      description: "Move conversation to folder dialog title"
    },
    chatWidth: {
      message: "Ancho del chat",
      description: "Chat width adjustment label"
    },
    chatWidthNarrow: {
      message: "Estrecho",
      description: "Narrow chat width label"
    },
    chatWidthWide: {
      message: "Ancho",
      description: "Wide chat width label"
    },
    sidebarWidth: {
      message: "Ancho de la barra lateral",
      description: "Sidebar width adjustment label"
    },
    sidebarWidthNarrow: {
      message: "Estrecho",
      description: "Narrow sidebar width label"
    },
    sidebarWidthWide: {
      message: "Ancho",
      description: "Wide sidebar width label"
    },
    formula_copied: {
      message: "\u2713 F\xF3rmula copiada",
      description: "Formula copied success message"
    },
    formula_copy_failed: {
      message: "\u2717 Error al copiar",
      description: "Formula copy failed message"
    },
    formulaCopyFormat: {
      message: "Formato de copia de f\xF3rmula",
      description: "Formula copy format setting label"
    },
    formulaCopyFormatLatex: {
      message: "LaTeX",
      description: "LaTeX format option"
    },
    formulaCopyFormatUnicodeMath: {
      message: "MathML (Word)",
      description: "Label for UnicodeMath formula copy format option"
    },
    formulaCopyFormatHint: {
      message: "Elige el formato al copiar f\xF3rmulas haciendo clic",
      description: "Formula copy format hint"
    },
    formulaCopyFormatNoDollar: {
      message: "LaTeX (Sin signo de d\xF3lar)",
      description: "LaTeX format option without dollar signs"
    },
    folder_filter_current_user: {
      message: "Aislamiento de cuenta",
      description: "Show only conversations from the current Google account"
    },
    folder_export: {
      message: "Exportar carpetas",
      description: "Export folders button tooltip"
    },
    folder_import_export: {
      message: "Importar/Exportar carpetas",
      description: "Combined import/export button tooltip"
    },
    folder_cloud_upload: {
      message: "Subir a la nube",
      description: "Cloud upload button tooltip"
    },
    folder_cloud_sync: {
      message: "Sincronizar desde la nube",
      description: "Cloud sync button tooltip"
    },
    folder_import: {
      message: "Importar carpetas",
      description: "Import folders button tooltip"
    },
    folder_import_title: {
      message: "Importar Configuraci\xF3n de Carpetas",
      description: "Import dialog title"
    },
    folder_import_strategy: {
      message: "Estrategia de importaci\xF3n:",
      description: "Import strategy label"
    },
    folder_import_merge: {
      message: "Fusionar con carpetas existentes",
      description: "Merge import strategy"
    },
    folder_import_overwrite: {
      message: "Sobrescribir carpetas existentes",
      description: "Overwrite import strategy"
    },
    folder_import_select_file: {
      message: "Selecciona un archivo JSON para importar",
      description: "Import file selection prompt"
    },
    folder_import_success: {
      message: "\u2713 Importadas {folders} carpetas, {conversations} conversaciones",
      description: "Import success message"
    },
    folder_import_success_skipped: {
      message: "\u2713 Importadas {folders} carpetas, {conversations} conversaciones ({skipped} duplicados omitidos)",
      description: "Import success with skipped message"
    },
    folder_import_error: {
      message: "\u2717 Error en la importaci\xF3n: {error}",
      description: "Import error message"
    },
    folder_export_success: {
      message: "\u2713 Carpetas exportadas correctamente",
      description: "Export success message"
    },
    folder_import_invalid_format: {
      message: "Formato de archivo inv\xE1lido. Por favor selecciona un archivo de configuraci\xF3n de carpetas v\xE1lido.",
      description: "Invalid format error"
    },
    folder_import_confirm_overwrite: {
      message: "Esto reemplazar\xE1 todas las carpetas existentes. Se crear\xE1 una copia de seguridad. \xBFContinuar?",
      description: "Overwrite confirmation"
    },
    export_dialog_title: {
      message: "Exportar Conversaci\xF3n",
      description: "Export dialog title"
    },
    export_dialog_select: {
      message: "Elige formato de exportaci\xF3n:",
      description: "Export format selection label"
    },
    export_dialog_warning: {
      message: "\u26A0\uFE0F Tras hacer clic en exportar, el sistema saltar\xE1 autom\xE1ticamente al primer mensaje para cargar todo el contenido. Por favor, no realice ninguna acci\xF3n; la exportaci\xF3n continuar\xE1 autom\xE1ticamente tras el salto.",
      description: "Warning about auto-jump and loading completeness"
    },
    export_dialog_safari_cmdp_hint: {
      message: "Consejo para Safari: haz clic en 'Exportar' abajo, espera un momento, luego presiona \u2318P y elige 'Guardar como PDF'.",
      description: "Safari-specific hint for PDF export"
    },
    export_toast_safari_pdf_ready: {
      message: "Ahora puedes pulsar Command + P para exportar el PDF.",
      description: "Safari-specific toast shown after PDF export is prepared"
    },
    export_dialog_safari_markdown_hint: {
      message: "Aviso: debido a limitaciones de Safari, no se pueden extraer las im\xE1genes del historial del chat. Para una exportaci\xF3n completa, usa la exportaci\xF3n en PDF.",
      description: "Warning about image references in Safari markdown export"
    },
    export_format_json_description: {
      message: "Formato legible por m\xE1quina para desarrolladores",
      description: "Description for JSON export format"
    },
    export_format_markdown_description: {
      message: "Formato de texto limpio y port\xE1til (recomendado)",
      description: "Description for Markdown export format"
    },
    export_format_pdf_description: {
      message: "Formato apto para impresi\xF3n mediante Guardar como PDF",
      description: "Description for PDF export format"
    },
    editInputWidth: {
      message: "Ancho del campo de edici\xF3n",
      description: "Edit input width adjustment label"
    },
    editInputWidthNarrow: {
      message: "Estrecho",
      description: "Narrow edit input width label"
    },
    editInputWidthWide: {
      message: "Ancho",
      description: "Wide edit input width label"
    },
    timelineOptions: {
      message: "Opciones de L\xEDnea de Tiempo",
      description: "Timeline options section label"
    },
    folderOptions: {
      message: "Opciones de Carpetas",
      description: "Folder options section label"
    },
    enableFolderFeature: {
      message: "Habilitar funci\xF3n de carpetas",
      description: "Enable or disable the folder feature"
    },
    hideArchivedConversations: {
      message: "Ocultar conversaciones archivadas",
      description: "Hide conversations that are in folders from the main list"
    },
    conversation_star: {
      message: "Destacar conversaci\xF3n",
      description: "Star conversation button tooltip"
    },
    conversation_unstar: {
      message: "Quitar destacado de conversaci\xF3n",
      description: "Unstar conversation button tooltip"
    },
    conversation_untitled: {
      message: "Sin t\xEDtulo",
      description: "Fallback title for conversations without a name"
    },
    geminiOnlyNotice: {
      message: "Funciona en Gemini (incluyendo Enterprise) y AI Studio por defecto. A\xF1ade otros sitios abajo para habilitar el Gestor de Prompts all\xED.",
      description: "Notice that defaults are limited to Gemini/AI Studio"
    },
    folderManager_dataLossWarning: {
      message: "\u26A0\uFE0F Advertencia: Error al cargar datos de carpetas. Tus carpetas pueden estar corruptas. Por favor revisa la consola del navegador para m\xE1s detalles e intenta restaurar desde una copia de seguridad si est\xE1 disponible.",
      description: "Warning shown when folder data fails to load"
    },
    backupOptions: {
      message: "Respaldo Autom\xE1tico",
      description: "Backup options section label"
    },
    backupEnabled: {
      message: "Habilitar respaldo autom\xE1tico",
      description: "Enable auto backup toggle"
    },
    backupNow: {
      message: "Respaldar Ahora",
      description: "Backup now button"
    },
    backupSelectFolder: {
      message: "Seleccionar Carpeta de Respaldo",
      description: "Select backup folder button"
    },
    backupFolderSelected: {
      message: "Carpeta de respaldo: {folder}",
      description: "Shows selected backup folder"
    },
    backupIncludePrompts: {
      message: "Incluir prompts",
      description: "Include prompts in backup toggle"
    },
    backupIncludeFolders: {
      message: "Incluir carpetas",
      description: "Include folders in backup toggle"
    },
    backupIntervalLabel: {
      message: "Intervalo de respaldo",
      description: "Backup interval label"
    },
    backupIntervalManual: {
      message: "Solo manual",
      description: "Manual backup mode"
    },
    backupIntervalDaily: {
      message: "Diario",
      description: "Daily backup interval"
    },
    backupIntervalWeekly: {
      message: "Semanal (7 d\xEDas)",
      description: "Weekly backup interval"
    },
    backupLastBackup: {
      message: "\xDAltimo respaldo: {time}",
      description: "Last backup timestamp"
    },
    backupNever: {
      message: "Nunca",
      description: "Never backed up"
    },
    backupSuccess: {
      message: "\u2713 Respaldo creado: {prompts} prompts, {folders} carpetas, {conversations} conversaciones",
      description: "Backup success message"
    },
    backupError: {
      message: "\u2717 Error en el respaldo: {error}",
      description: "Backup error message"
    },
    backupNotSupported: {
      message: "\u26A0\uFE0F El respaldo autom\xE1tico requiere un navegador moderno con soporte para File System Access API",
      description: "Browser not supported message"
    },
    backupSelectFolderFirst: {
      message: "Por favor selecciona primero una carpeta de respaldo",
      description: "No folder selected warning"
    },
    backupUserCancelled: {
      message: "Respaldo cancelado",
      description: "User cancelled folder selection"
    },
    backupConfigSaved: {
      message: "\u2713 Configuraci\xF3n de respaldo guardada",
      description: "Config saved message"
    },
    backupPermissionDenied: {
      message: "\u26A0\uFE0F No se puede acceder a este directorio. Por favor elige una ubicaci\xF3n diferente (ej. Documentos, Descargas, o una carpeta en el Escritorio)",
      description: "Permission denied for restricted directory"
    },
    backupConfigureInOptions: {
      message: "La configuraci\xF3n de respaldo requiere la p\xE1gina de Opciones. Haz clic en el bot\xF3n de abajo para abrirla (clic en los tres puntos junto al icono de la extensi\xF3n \u2192 Opciones).",
      description: "Backup configure in options page explanation"
    },
    openOptionsPage: {
      message: "Abrir P\xE1gina de Opciones",
      description: "Open options page button"
    },
    optionsPageSubtitle: {
      message: "Opciones de la Extensi\xF3n",
      description: "Options page subtitle"
    },
    optionsComingSoon: {
      message: "M\xE1s opciones pr\xF3ximamente...",
      description: "Options page placeholder text"
    },
    backupDataAccessNotice: {
      message: "Limitaci\xF3n de Acceso a Datos",
      description: "Backup data access limitation title"
    },
    backupDataAccessHint: {
      message: "Debido a restricciones de seguridad del navegador, esta p\xE1gina de Opciones no puede acceder directamente a los prompts y datos de carpetas de las p\xE1ginas de Gemini. Por favor usa el Gestor de Prompts y las funciones de Exportaci\xF3n de Carpetas en la p\xE1gina de Gemini para respaldos manuales.",
      description: "Backup data access limitation explanation"
    },
    promptManagerOptions: {
      message: "Gestor de Prompts",
      description: "Prompt Manager options section label"
    },
    hidePromptManager: {
      message: "Ocultar Gestor de Prompts",
      description: "Hide the prompt manager floating ball"
    },
    hidePromptManagerHint: {
      message: "Ocultar el bot\xF3n flotante del Gestor de Prompts en la p\xE1gina",
      description: "Hint for hiding prompt manager feature"
    },
    customWebsites: {
      message: "Sitios web personalizados",
      description: "Custom websites for prompt manager"
    },
    customWebsitesPlaceholder: {
      message: "Introduce URL del sitio (ej. chatgpt.com)",
      description: "Custom websites input placeholder"
    },
    customWebsitesHint: {
      message: "A\xF1ade sitios web donde quieras usar el Gestor de Prompts. Solo el Gestor de Prompts se activar\xE1 en estos sitios.",
      description: "Custom websites hint"
    },
    addWebsite: {
      message: "A\xF1adir sitio web",
      description: "Add website button"
    },
    removeWebsite: {
      message: "Eliminar",
      description: "Remove website button"
    },
    invalidUrl: {
      message: "Formato de URL inv\xE1lido",
      description: "Invalid URL error message"
    },
    websiteAdded: {
      message: "Sitio web a\xF1adido",
      description: "Website added success message"
    },
    websiteRemoved: {
      message: "Sitio web eliminado",
      description: "Website removed success message"
    },
    permissionDenied: {
      message: "Permiso denegado. Por favor permite el acceso a este sitio web.",
      description: "Permission denied error message"
    },
    permissionRequestFailed: {
      message: "Solicitud de permiso fallida. Por favor intenta de nuevo o concede acceso en la configuraci\xF3n de la extensi\xF3n.",
      description: "Permission request failure message"
    },
    customWebsitesNote: {
      message: "Consejo: Se te pedir\xE1 permitir acceso al a\xF1adir un sitio. Despu\xE9s de conceder permiso, recarga ese sitio para que el Gestor de Prompts pueda iniciarse.",
      description: "Custom websites reload/permission note"
    },
    starredHistory: {
      message: "Historial Destacado",
      description: "Starred history title"
    },
    viewStarredHistory: {
      message: "Ver Historial Destacado",
      description: "View starred history button"
    },
    noStarredMessages: {
      message: "No hay mensajes destacados todav\xEDa",
      description: "No starred messages placeholder"
    },
    removeFromStarred: {
      message: "Quitar de destacados",
      description: "Remove from starred tooltip"
    },
    justNow: {
      message: "Justo ahora",
      description: "Just now time label"
    },
    hoursAgo: {
      message: "horas atr\xE1s",
      description: "Hours ago label"
    },
    yesterday: {
      message: "Ayer",
      description: "Yesterday date label"
    },
    daysAgo: {
      message: "d\xEDas atr\xE1s",
      description: "Days ago label"
    },
    loading: {
      message: "Cargando...",
      description: "Loading message"
    },
    keyboardShortcuts: {
      message: "Atajos de Teclado",
      description: "Keyboard shortcuts section title"
    },
    enableShortcuts: {
      message: "Habilitar atajos de teclado",
      description: "Enable shortcuts toggle label"
    },
    previousNode: {
      message: "Nodo anterior",
      description: "Previous timeline node shortcut label"
    },
    nextNode: {
      message: "Nodo siguiente",
      description: "Next timeline node shortcut label"
    },
    shortcutKey: {
      message: "Tecla",
      description: "Shortcut key label"
    },
    shortcutModifiers: {
      message: "Modificadores",
      description: "Shortcut modifiers label"
    },
    resetShortcuts: {
      message: "Restablecer a valores predeterminados",
      description: "Reset shortcuts button"
    },
    shortcutsResetSuccess: {
      message: "Atajos restablecidos",
      description: "Shortcuts reset success message"
    },
    shortcutsDescription: {
      message: "Navegar nodos de l\xEDnea de tiempo usando atajos de teclado",
      description: "Shortcuts description"
    },
    modifierNone: {
      message: "Ninguno",
      description: "No modifier key"
    },
    modifierAlt: {
      message: "Alt",
      description: "Alt modifier key"
    },
    modifierCtrl: {
      message: "Ctrl",
      description: "Ctrl modifier key"
    },
    modifierShift: {
      message: "May\xFAs",
      description: "Shift modifier key"
    },
    modifierMeta: {
      message: "Cmd/Win",
      description: "Meta/Command/Windows modifier key"
    },
    cloudSync: {
      message: "Sincronizaci\xF3n en Nube",
      description: "Cloud sync section title"
    },
    cloudSyncDescription: {
      message: "Sincronizar carpetas y prompts con Google Drive",
      description: "Cloud sync description"
    },
    syncModeDisabled: {
      message: "Desactivado",
      description: "Sync mode disabled option"
    },
    syncModeManual: {
      message: "Manual",
      description: "Sync mode manual option"
    },
    syncServerPort: {
      message: "Puerto del servidor",
      description: "Port number for the sync server"
    },
    syncNow: {
      message: "Sincronizar",
      description: "Sync now button"
    },
    lastSynced: {
      message: "\xDAltima sincr.: {time}",
      description: "Last sync timestamp"
    },
    neverSynced: {
      message: "Nunca sincronizado",
      description: "Never synced message"
    },
    lastUploaded: {
      message: "Subido: {time}",
      description: "Last upload timestamp"
    },
    neverUploaded: {
      message: "Nunca subido",
      description: "Never uploaded message"
    },
    syncSuccess: {
      message: "\u2713 Sincronizado correctamente",
      description: "Sync success message"
    },
    syncError: {
      message: "\u2717 Error de sincronizaci\xF3n: {error}",
      description: "Sync error message"
    },
    syncInProgress: {
      message: "Sincronizando...",
      description: "Sync in progress message"
    },
    uploadInProgress: {
      message: "Uploading...",
      description: "Upload in progress message"
    },
    uploadSuccess: {
      message: "\u2713 Uploaded successfully",
      description: "Upload success message"
    },
    downloadInProgress: {
      message: "Downloading...",
      description: "Download in progress message"
    },
    downloadMergeSuccess: {
      message: "\u2713 Downloaded and merged",
      description: "Download and merge success message"
    },
    syncUpload: {
      message: "Subir",
      description: "Upload button label"
    },
    syncMerge: {
      message: "Fusionar",
      description: "Merge button label"
    },
    syncMode: {
      message: "Modo sinc.",
      description: "Sync mode label"
    },
    minutesAgo: {
      message: "minutos atr\xE1s",
      description: "Minutes ago label"
    },
    syncNoData: {
      message: "No se encontraron datos de sincronizaci\xF3n en Drive",
      description: "Error message when no data is found in Drive"
    },
    syncUploadFailed: {
      message: "Error al subir",
      description: "Error message when upload fails"
    },
    syncDownloadFailed: {
      message: "Error al descargar",
      description: "Error message when download fails"
    },
    syncAuthFailed: {
      message: "Error de autenticaci\xF3n",
      description: "Error message when authentication fails"
    },
    signOut: {
      message: "Cerrar sesi\xF3n",
      description: "Sign out button"
    },
    signInWithGoogle: {
      message: "Iniciar sesi\xF3n con Google",
      description: "Sign in with Google button"
    },
    nanobananaOptions: {
      message: "Opciones de NanoBanana",
      description: "NanoBanana options section label"
    },
    enableNanobananaWatermarkRemover: {
      message: "Eliminar marca de agua de NanoBanana",
      description: "Enable automatic watermark removal for NanoBanana images"
    },
    nanobananaWatermarkRemoverHint: {
      message: "Elimina autom\xE1ticamente las marcas de agua de Gemini visibles en las im\xE1genes generadas",
      description: "Watermark remover feature hint"
    },
    nanobananaDownloadTooltip: {
      message: "Descargar imagen sin marca de agua (NanoBanana)",
      description: "Download button tooltip"
    },
    deepResearchDownload: {
      message: "Descargar contenido de pensamiento",
      description: "Deep Research download button text"
    },
    deepResearchDownloadTooltip: {
      message: "Descargar contenido de pensamiento como Markdown",
      description: "Deep Research download button tooltip"
    },
    folder_uncategorized: {
      message: "Sin categorizar",
      description: "Label for root-level conversations not in any folder"
    },
    timelineLevelTitle: {
      message: "Nivel de Nodo",
      description: "Title for timeline node level context menu"
    },
    timelineLevel1: {
      message: "Nivel 1",
      description: "Timeline node level 1 option"
    },
    timelineLevel2: {
      message: "Nivel 2",
      description: "Timeline node level 2 option"
    },
    timelineLevel3: {
      message: "Nivel 3",
      description: "Timeline node level 3 option"
    },
    timelineCollapse: {
      message: "Contraer",
      description: "Collapse children"
    },
    timelineExpand: {
      message: "Expandir",
      description: "Expand children"
    },
    timelinePreviewSearch: {
      message: "Buscar...",
      description: "Timeline preview panel search placeholder"
    },
    timelinePreviewNoResults: {
      message: "Sin resultados",
      description: "Timeline preview panel no search results"
    },
    timelinePreviewNoMessages: {
      message: "Sin mensajes",
      description: "Timeline preview panel no messages"
    },
    quoteReply: {
      message: "Responder cita",
      description: "Quote reply button text"
    },
    inputCollapseOptions: {
      message: "Opciones de entrada",
      description: "Input options section label"
    },
    enableInputCollapse: {
      message: "Habilitar contracci\xF3n de entrada",
      description: "Enable input collapse toggle label"
    },
    enableInputCollapseHint: {
      message: "Contrae el \xE1rea de entrada cuando est\xE1 vac\xEDa para ganar m\xE1s espacio de lectura",
      description: "Input collapse feature hint"
    },
    inputCollapsePlaceholder: {
      message: "Mensaje a Gemini",
      description: "Placeholder text shown in collapsed input"
    },
    ctrlEnterSend: {
      message: "Ctrl+Enter para enviar",
      description: "Ctrl+Enter to send toggle label"
    },
    ctrlEnterSendHint: {
      message: "Presiona Ctrl+Enter para enviar mensajes, Enter para agregar una nueva l\xEDnea",
      description: "Ctrl+Enter to send feature hint"
    },
    batch_delete_confirm: {
      message: "\xBFEst\xE1s seguro de que quieres eliminar {count} conversaci\xF3n(es)? Esta acci\xF3n no se puede deshacer.",
      description: "Batch delete confirmation message"
    },
    batch_delete_in_progress: {
      message: "Eliminando... ({current}/{total})",
      description: "Batch delete progress message"
    },
    batch_delete_success: {
      message: "\u2713 Eliminadas {count} conversaci\xF3n(es)",
      description: "Batch delete success message"
    },
    batch_delete_partial: {
      message: "Eliminaci\xF3n completa: {success} con \xE9xito, {failed} fallidos",
      description: "Batch delete partial success message"
    },
    batch_delete_limit_reached: {
      message: "M\xE1ximo {max} conversaciones pueden ser seleccionadas a la vez",
      description: "Batch delete limit warning"
    },
    batch_delete_button: {
      message: "Eliminar seleccionados",
      description: "Batch delete button tooltip in multi-select mode"
    },
    batch_delete_match_patterns: {
      message: "delete,confirm,yes,ok,remove,eliminar,confirmar,si,s\xED,aceptar,borrar",
      description: "Comma-separated list of keywords to match native delete/confirm buttons (case-insensitive)"
    },
    generalOptions: {
      message: "Opciones Generales",
      description: "General options section label"
    },
    enableTabTitleUpdate: {
      message: "Sincronizar t\xEDtulo de pesta\xF1a con conversaci\xF3n",
      description: "Enable tab title sync toggle label"
    },
    enableTabTitleUpdateHint: {
      message: "Actualiza autom\xE1ticamente el t\xEDtulo de la pesta\xF1a del navegador para que coincida con el t\xEDtulo de la conversaci\xF3n actual",
      description: "Tab title sync feature hint"
    },
    enableMermaidRendering: {
      message: "Habilitar renderizado de diagramas Mermaid",
      description: "Enable Mermaid diagram rendering toggle label"
    },
    enableMermaidRenderingHint: {
      message: "Renderiza autom\xE1ticamente diagramas Mermaid en bloques de c\xF3digo",
      description: "Mermaid rendering feature hint"
    },
    enableQuoteReply: {
      message: "Habilitar citar al responder",
      description: "Enable quote reply toggle label"
    },
    enableQuoteReplyHint: {
      message: "Muestra un bot\xF3n flotante para citar el texto seleccionado en las conversaciones",
      description: "Quote reply feature hint"
    },
    contextSync: {
      message: "Sincronizaci\xF3n de contexto",
      description: "Context Sync title"
    },
    contextSyncDescription: {
      message: "Sincroniza el contexto del chat con tu IDE local",
      description: "Context Sync description"
    },
    syncToIDE: {
      message: "Sincronizar con IDE",
      description: "Sync to IDE button"
    },
    ideOnline: {
      message: "IDE en l\xEDnea",
      description: "IDE Online status"
    },
    ideOffline: {
      message: "IDE fuera de l\xEDnea",
      description: "IDE Offline status"
    },
    syncing: {
      message: "Sincronizando...",
      description: "Syncing status"
    },
    checkServer: {
      message: "Por favor, inicia el servidor AI Sync en VS Code",
      description: "Check server hint"
    },
    capturing: {
      message: "Capturando di\xE1logo...",
      description: "Capturing status"
    },
    syncedSuccess: {
      message: "\xA1Sincronizado con \xE9xito!",
      description: "Synced success message"
    },
    downloadingOriginal: {
      message: "Descargando imagen original",
      description: "Status when downloading original image"
    },
    downloadingOriginalLarge: {
      message: "Descargando imagen original (archivo grande)",
      description: "Status when downloading large original image"
    },
    downloadLargeWarning: {
      message: "Advertencia de archivo grande",
      description: "Warning shown for large downloads"
    },
    downloadProcessing: {
      message: "Procesando marca de agua",
      description: "Status when processing watermark removal"
    },
    downloadSuccess: {
      message: "Descargando...",
      description: "Status when download starts"
    },
    downloadError: {
      message: "Error",
      description: "Status prefix when download fails"
    },
    recentsHide: {
      message: "Ocultar elementos recientes",
      description: "Tooltip para ocultar la secci\xF3n de elementos recientes"
    },
    recentsShow: {
      message: "Mostrar elementos recientes",
      description: "Tooltip para mostrar la secci\xF3n de elementos recientes"
    },
    gemsHide: {
      message: "Ocultar Gems",
      description: "Tooltip para ocultar la secci\xF3n de la lista de Gems"
    },
    gemsShow: {
      message: "Mostrar Gems",
      description: "Tooltip para mostrar la secci\xF3n de la lista de Gems"
    },
    setAsDefaultModel: {
      message: "Set as default model",
      description: "Tooltip for setting default model"
    },
    cancelDefaultModel: {
      message: "Cancel default model",
      description: "Tooltip for cancelling default model"
    },
    defaultModelSet: {
      message: "Default model set: $1",
      description: "Toast message when default model is set"
    },
    defaultModelCleared: {
      message: "Default model cleared",
      description: "Toast message when default model is cleared"
    },
    sidebarAutoHide: {
      message: "Ocultar barra lateral auto",
      description: "Auto-hide sidebar toggle label"
    },
    sidebarAutoHideHint: {
      message: "Contrae autom\xE1ticamente la barra lateral cuando el rat\xF3n sale, la expande cuando entra",
      description: "Auto-hide sidebar feature hint"
    },
    folderSpacing: {
      message: "Espaciado de carpetas",
      description: "Folder spacing adjustment label"
    },
    folderSpacingCompact: {
      message: "Compacto",
      description: "Compact folder spacing label"
    },
    folderSpacingSpacious: {
      message: "Espacioso",
      description: "Spacious folder spacing label"
    },
    folderTreeIndent: {
      message: "Sangr\xEDa de subcarpetas",
      description: "Subfolder tree indentation adjustment label"
    },
    folderTreeIndentCompact: {
      message: "Estrecha",
      description: "Narrow subfolder indentation label"
    },
    folderTreeIndentSpacious: {
      message: "Ancha",
      description: "Wide subfolder indentation label"
    },
    export_select_mode_select_all: {
      message: "Select all",
      description: "Selection mode select all toggle"
    },
    export_select_mode_count: {
      message: "Selected {count}",
      description: "Selection mode selected message count"
    },
    export_select_mode_toggle: {
      message: "Select message",
      description: "Selection mode per-message toggle tooltip"
    },
    export_select_mode_select_below: {
      message: "Select messages below",
      description: "Selection mode top-left button to select messages below current line"
    },
    export_select_mode_empty: {
      message: "Please select at least one message to export.",
      description: "Selection mode validation when nothing is selected"
    },
    export_format_image_description: {
      message: "Imagen PNG \xFAnica, ideal para compartir en m\xF3vil.",
      description: "Description for Image export format"
    },
    export_image_progress: {
      message: "Generating image...",
      description: "Progress message while generating image export"
    },
    deepResearchSaveReport: {
      message: "Save Report",
      description: "Deep Research save report button"
    },
    deepResearchSaveReportTooltip: {
      message: "Export this research report",
      description: "Deep Research save report tooltip"
    },
    export_fontsize_label: {
      message: "Tama\xF1o de fuente",
      description: "Label for font size slider in export dialog"
    },
    export_fontsize_preview: {
      message: "El veloz murci\xE9lago hind\xFA com\xEDa feliz cardillo y kiwi.",
      description: "Preview text for font size slider in export dialog"
    },
    export_error_generic: {
      message: "Error al exportar: {error}",
      description: "Mensaje gen\xE9rico de error de exportaci\xF3n con detalle"
    },
    export_error_refresh_retry: {
      message: "La exportaci\xF3n de imagen fall\xF3 por problemas de red. Actualiza la p\xE1gina y vuelve a intentarlo.",
      description: "Sugerencia para reintentar cuando falla temporalmente la carga en exportaci\xF3n de imagen"
    },
    export_md_include_source_confirm: {
      message: "El contenido exportado contiene im\xE1genes de b\xFAsqueda web. \xBFIncluir enlaces de origen de las im\xE1genes en el Markdown?",
      description: "Confirm dialog when exporting markdown with web search images"
    },
    deepResearch_exportedAt: {
      message: "Exportado el",
      description: "Etiqueta de marca de tiempo de exportaci\xF3n de Deep Research"
    },
    deepResearch_totalPhases: {
      message: "Fases totales",
      description: "Etiqueta del total de fases de pensamiento de Deep Research"
    },
    deepResearch_thinkingPhase: {
      message: "Fase de pensamiento",
      description: "Encabezado de fase de pensamiento de Deep Research"
    },
    deepResearch_researchedWebsites: {
      message: "Sitios web investigados",
      description: "Encabezado de secci\xF3n de sitios web investigados de Deep Research"
    }
  };

  // ../gemini-voyager/src/locales/fr/messages.json
  var messages_default4 = {
    extName: {
      message: "Gemini Voyager",
      description: "Extension name"
    },
    extDescription: {
      message: "Am\xE9liorez votre exp\xE9rience Gemini : chronologie, dossiers, prompts et export.",
      description: "Extension description"
    },
    scrollMode: {
      message: "Mode d\xE9filement",
      description: "Scroll mode label"
    },
    flow: {
      message: "Flux",
      description: "Flow mode"
    },
    jump: {
      message: "Saut",
      description: "Jump mode"
    },
    hideOuterContainer: {
      message: "Masquer le conteneur externe",
      description: "Hide outer container label"
    },
    draggableTimeline: {
      message: "Chronologie d\xE9pla\xE7able",
      description: "Draggable Timeline label"
    },
    enableMarkerLevel: {
      message: "Activer les niveaux de n\u0153uds",
      description: "Enable timeline node level feature"
    },
    enableMarkerLevelHint: {
      message: "Clic droit sur les n\u0153uds pour d\xE9finir leur niveau et r\xE9duire les enfants",
      description: "Node level feature hint"
    },
    experimentalLabel: {
      message: "Exp\xE9rimental",
      description: "Experimental feature label"
    },
    resetPosition: {
      message: "R\xE9initialiser la position",
      description: "Reset Position button"
    },
    resetTimelinePosition: {
      message: "R\xE9initialiser la position de la chronologie",
      description: "Reset timeline position button in timeline options"
    },
    language: {
      message: "Langue",
      description: "Language label"
    },
    pm_title: {
      message: "Gemini Voyager",
      description: "Prompt Manager title"
    },
    pm_add: {
      message: "Ajouter",
      description: "Add prompt button"
    },
    pm_search_placeholder: {
      message: "Rechercher des prompts ou tags",
      description: "Search placeholder"
    },
    pm_import: {
      message: "Importer",
      description: "Import button"
    },
    pm_export: {
      message: "Exporter",
      description: "Export button"
    },
    pm_prompt_placeholder: {
      message: "Texte du prompt",
      description: "Prompt textarea placeholder"
    },
    pm_tags_placeholder: {
      message: "Tags (s\xE9par\xE9s par des virgules)",
      description: "Tags input placeholder"
    },
    pm_save: {
      message: "Enregistrer",
      description: "Save prompt"
    },
    pm_cancel: {
      message: "Annuler",
      description: "Cancel"
    },
    pm_all_tags: {
      message: "Tous",
      description: "All tags chip"
    },
    pm_empty: {
      message: "Aucun prompt pour le moment",
      description: "Empty state"
    },
    pm_copy: {
      message: "Copier",
      description: "Copy prompt"
    },
    pm_copied: {
      message: "Copi\xE9",
      description: "Copied notice"
    },
    pm_delete: {
      message: "Supprimer",
      description: "Delete prompt"
    },
    pm_delete_confirm: {
      message: "Supprimer ce prompt ?",
      description: "Delete confirm"
    },
    pm_lock: {
      message: "Verrouiller la position",
      description: "Lock panel position"
    },
    pm_unlock: {
      message: "D\xE9verrouiller la position",
      description: "Unlock panel position"
    },
    pm_import_invalid: {
      message: "Format de fichier invalide",
      description: "Import invalid"
    },
    pm_import_success: {
      message: "{count} prompts import\xE9s",
      description: "Import success"
    },
    pm_duplicate: {
      message: "Dupliquer le prompt",
      description: "Duplicate on add"
    },
    pm_deleted: {
      message: "Supprim\xE9",
      description: "Deleted notice"
    },
    pm_edit: {
      message: "\xC9diter",
      description: "Edit prompt"
    },
    pm_expand: {
      message: "\xC9tendre",
      description: "Expand prompt text"
    },
    pm_collapse: {
      message: "R\xE9duire",
      description: "Collapse prompt text"
    },
    pm_saved: {
      message: "Enregistr\xE9",
      description: "Saved notice"
    },
    pm_settings: {
      message: "Param\xE8tres",
      description: "Settings button"
    },
    pm_settings_tooltip: {
      message: "Ouvrir les param\xE8tres de l'extension",
      description: "Settings button tooltip"
    },
    pm_settings_fallback: {
      message: "Veuillez cliquer sur l'ic\xF4ne de l'extension dans la barre d'outils pour ouvrir les param\xE8tres",
      description: "Settings open failed message"
    },
    pm_backup: {
      message: "Sauvegarde locale",
      description: "Local backup button"
    },
    pm_backup_tooltip: {
      message: "Sauvegarder les prompts et dossiers dans un dossier horodat\xE9",
      description: "Backup button tooltip"
    },
    pm_backup_cancelled: {
      message: "Sauvegarde annul\xE9e",
      description: "Backup cancelled hint"
    },
    pm_backup_error: {
      message: "\u2717 \xC9chec de la sauvegarde",
      description: "Backup failed hint"
    },
    pm_backup_hint_options: {
      message: "Cette fonctionnalit\xE9 est int\xE9gr\xE9e au gestionnaire de prompts sur la page Gemini.",
      description: "Backup hint in options page"
    },
    pm_backup_step1: {
      message: "Ouvrez la page Gemini (gemini.google.com)",
      description: "Backup step 1"
    },
    pm_backup_step2: {
      message: "Cliquez sur l'ic\xF4ne de l'extension en bas \xE0 droite pour ouvrir le gestionnaire",
      description: "Backup step 2"
    },
    pm_backup_step3: {
      message: 'Cliquez sur le bouton "\u{1F4BE} Sauvegarde locale" et s\xE9lectionnez un dossier',
      description: "Backup step 3"
    },
    pm_backup_note: {
      message: "Les sauvegardes incluent tous les prompts et dossiers (format : backup-YYYYMMDD-HHMMSS)",
      description: "Backup feature note"
    },
    extensionVersion: {
      message: "Version",
      description: "Extension version label"
    },
    newVersionAvailable: {
      message: "Nouvelle version disponible",
      description: "Update reminder title"
    },
    currentVersionLabel: {
      message: "Actuelle",
      description: "Label for current version number"
    },
    latestVersionLabel: {
      message: "Derni\xE8re",
      description: "Label for latest version number"
    },
    updateNow: {
      message: "Mettre \xE0 jour",
      description: "CTA to update to latest version"
    },
    starProject: {
      message: "Me soutenir \u2B50",
      description: "Github callout"
    },
    officialDocs: {
      message: "Documentation",
      description: "Official docs link"
    },
    exportChatJson: {
      message: "Exporter l'historique de la conversation",
      description: "Tooltip for export button"
    },
    folder_title: {
      message: "Dossiers",
      description: "Folder section title"
    },
    folder_create: {
      message: "Cr\xE9er un dossier",
      description: "Create folder button tooltip"
    },
    folder_name_prompt: {
      message: "Nom du dossier :",
      description: "Create folder name prompt"
    },
    folder_rename_prompt: {
      message: "Nouveau nom :",
      description: "Rename folder prompt"
    },
    folder_delete_confirm: {
      message: "Supprimer ce dossier et tout son contenu ?",
      description: "Delete folder confirmation"
    },
    folder_create_subfolder: {
      message: "Cr\xE9er un sous-dossier",
      description: "Create subfolder menu item"
    },
    folder_rename: {
      message: "Renommer",
      description: "Rename folder menu item"
    },
    folder_change_color: {
      message: "Changer la couleur",
      description: "Change folder color menu item"
    },
    folder_delete: {
      message: "Supprimer",
      description: "Delete folder menu item"
    },
    folder_color_default: {
      message: "D\xE9faut",
      description: "Default folder color name"
    },
    folder_color_red: {
      message: "Rouge",
      description: "Red folder color name"
    },
    folder_color_orange: {
      message: "Orange",
      description: "Orange folder color name"
    },
    folder_color_yellow: {
      message: "Jaune",
      description: "Yellow folder color name"
    },
    folder_color_green: {
      message: "Vert",
      description: "Green folder color name"
    },
    folder_color_blue: {
      message: "Bleu",
      description: "Blue folder color name"
    },
    folder_color_purple: {
      message: "Violet",
      description: "Purple folder color name"
    },
    folder_color_pink: {
      message: "Rose",
      description: "Pink folder color name"
    },
    folder_color_custom: {
      message: "Personnalis\xE9",
      description: "Custom folder color name"
    },
    folder_empty: {
      message: "Aucun dossier",
      description: "Empty state placeholder when no folders exist"
    },
    folder_pin: {
      message: "\xC9pingler le dossier",
      description: "Pin folder menu item"
    },
    folder_unpin: {
      message: "D\xE9tacher le dossier",
      description: "Unpin folder menu item"
    },
    folder_remove_conversation: {
      message: "Retirer du dossier",
      description: "Remove conversation button tooltip"
    },
    folder_remove_conversation_confirm: {
      message: 'Retirer "{title}" de ce dossier ?',
      description: "Remove conversation confirmation"
    },
    conversation_more: {
      message: "Plus d'options",
      description: "Conversation more options button tooltip"
    },
    conversation_move_to_folder: {
      message: "D\xE9placer vers un dossier",
      description: "Move conversation to folder menu item"
    },
    conversation_move_to_folder_title: {
      message: "D\xE9placer vers un dossier",
      description: "Move conversation to folder dialog title"
    },
    chatWidth: {
      message: "Largeur du chat",
      description: "Chat width adjustment label"
    },
    chatWidthNarrow: {
      message: "\xC9troit",
      description: "Narrow chat width label"
    },
    chatWidthWide: {
      message: "Large",
      description: "Wide chat width label"
    },
    sidebarWidth: {
      message: "Largeur barre lat\xE9rale",
      description: "Sidebar width adjustment label"
    },
    sidebarWidthNarrow: {
      message: "\xC9troite",
      description: "Narrow sidebar width label"
    },
    sidebarWidthWide: {
      message: "Large",
      description: "Wide sidebar width label"
    },
    formula_copied: {
      message: "\u2713 Formule copi\xE9e",
      description: "Formula copied success message"
    },
    formula_copy_failed: {
      message: "\u2717 \xC9chec de la copie",
      description: "Formula copy failed message"
    },
    formulaCopyFormat: {
      message: "Format de copie de formule",
      description: "Formula copy format setting label"
    },
    formulaCopyFormatLatex: {
      message: "LaTeX",
      description: "LaTeX format option"
    },
    formulaCopyFormatUnicodeMath: {
      message: "MathML (Word)",
      description: "Label for UnicodeMath formula copy format option"
    },
    formulaCopyFormatHint: {
      message: "Choisissez le format lors de la copie des formules par clic",
      description: "Formula copy format hint"
    },
    formulaCopyFormatNoDollar: {
      message: "LaTeX (Sans dollars)",
      description: "LaTeX format option without dollar signs"
    },
    folder_filter_current_user: {
      message: "Isolation de compte",
      description: "Show only conversations from the current Google account"
    },
    folder_export: {
      message: "Exporter dossiers",
      description: "Export folders button tooltip"
    },
    folder_import_export: {
      message: "Importer/Exporter dossiers",
      description: "Combined import/export button tooltip"
    },
    folder_cloud_upload: {
      message: "T\xE9l\xE9verser vers le cloud",
      description: "Cloud upload button tooltip"
    },
    folder_cloud_sync: {
      message: "Synchroniser depuis le cloud",
      description: "Cloud sync button tooltip"
    },
    folder_import: {
      message: "Importer dossiers",
      description: "Import folders button tooltip"
    },
    folder_import_title: {
      message: "Importer la configuration",
      description: "Import dialog title"
    },
    folder_import_strategy: {
      message: "Strat\xE9gie :",
      description: "Import strategy label"
    },
    folder_import_merge: {
      message: "Fusionner",
      description: "Merge import strategy"
    },
    folder_import_overwrite: {
      message: "\xC9craser",
      description: "Overwrite import strategy"
    },
    folder_import_select_file: {
      message: "S\xE9lectionner un fichier JSON",
      description: "Import file selection prompt"
    },
    folder_import_success: {
      message: "\u2713 {folders} dossiers, {conversations} discussions import\xE9s",
      description: "Import success message"
    },
    folder_import_success_skipped: {
      message: "\u2713 {folders} dossiers, {conversations} discussions import\xE9s ({skipped} ignor\xE9s)",
      description: "Import success with skipped message"
    },
    folder_import_error: {
      message: "\u2717 \xC9chec : {error}",
      description: "Import error message"
    },
    folder_export_success: {
      message: "\u2713 Dossiers export\xE9s avec succ\xE8s",
      description: "Export success message"
    },
    folder_import_invalid_format: {
      message: "Format invalide. Veuillez s\xE9lectionner un fichier de configuration valide.",
      description: "Invalid format error"
    },
    folder_import_confirm_overwrite: {
      message: "Ceci remplacera tous les dossiers existants. Une sauvegarde sera cr\xE9\xE9e. Continuer ?",
      description: "Overwrite confirmation"
    },
    export_dialog_title: {
      message: "Exporter la discussion",
      description: "Export dialog title"
    },
    export_dialog_select: {
      message: "Format d'export :",
      description: "Export format selection label"
    },
    export_dialog_warning: {
      message: "\u26A0\uFE0F Apr\xE8s avoir cliqu\xE9 sur exporter, le syst\xE8me sautera automatiquement au premier message pour charger tout le contenu. Veuillez ne pas effectuer d'op\xE9rations ; l'exportation continuera automatiquement apr\xE8s le saut.",
      description: "Warning about auto-jump and loading completeness"
    },
    export_dialog_safari_cmdp_hint: {
      message: "Astuce Safari : cliquez sur 'Exporter' ci-dessous, attendez un instant, puis appuyez sur \u2318P et choisissez 'Enregistrer au format PDF'.",
      description: "Safari-specific hint for PDF export"
    },
    export_toast_safari_pdf_ready: {
      message: "Vous pouvez maintenant appuyer sur Command + P pour exporter le PDF.",
      description: "Safari-specific toast shown after PDF export is prepared"
    },
    export_dialog_safari_markdown_hint: {
      message: "Remarque : en raison des limitations de Safari, les images de l'historique du chat ne peuvent pas \xEAtre extraites. Pour une exportation compl\xE8te, utilisez l'export PDF.",
      description: "Warning about image references in Safari markdown export"
    },
    export_format_json_description: {
      message: "Format lisible par machine pour les d\xE9veloppeurs",
      description: "Description for JSON export format"
    },
    export_format_markdown_description: {
      message: "Format texte propre et portable (recommand\xE9)",
      description: "Description for Markdown export format"
    },
    export_format_pdf_description: {
      message: "Format pr\xEAt pour l'impression via Enregistrer au format PDF",
      description: "Description for PDF export format"
    },
    editInputWidth: {
      message: "Largeur de l'\xE9diteur",
      description: "Edit input width adjustment label"
    },
    editInputWidthNarrow: {
      message: "\xC9troit",
      description: "Narrow edit input width label"
    },
    editInputWidthWide: {
      message: "Large",
      description: "Wide edit input width label"
    },
    timelineOptions: {
      message: "Options de la chronologie",
      description: "Timeline options section label"
    },
    folderOptions: {
      message: "Options des dossiers",
      description: "Folder options section label"
    },
    enableFolderFeature: {
      message: "Activer les dossiers",
      description: "Enable or disable the folder feature"
    },
    hideArchivedConversations: {
      message: "Masquer les discussions archiv\xE9es",
      description: "Hide conversations that are in folders from the main list"
    },
    conversation_star: {
      message: "Ajouter aux favoris",
      description: "Star conversation button tooltip"
    },
    conversation_unstar: {
      message: "Retirer des favoris",
      description: "Unstar conversation button tooltip"
    },
    conversation_untitled: {
      message: "Sans titre",
      description: "Fallback title for conversations without a name"
    },
    geminiOnlyNotice: {
      message: "Fonctionne sur Gemini (et Enterprise) & AI Studio par d\xE9faut. Ajoutez d'autres sites ci-dessous.",
      description: "Notice that defaults are limited to Gemini/AI Studio"
    },
    folderManager_dataLossWarning: {
      message: "\u26A0\uFE0F Attention : \xC9chec du chargement des donn\xE9es. Vos dossiers peuvent \xEAtre corrompus. V\xE9rifiez la console et essayez de restaurer une sauvegarde.",
      description: "Warning shown when folder data fails to load"
    },
    backupOptions: {
      message: "Sauvegarde auto",
      description: "Backup options section label"
    },
    backupEnabled: {
      message: "Activer",
      description: "Enable auto backup toggle"
    },
    backupNow: {
      message: "Sauvegarder",
      description: "Backup now button"
    },
    backupSelectFolder: {
      message: "Choisir dossier",
      description: "Select backup folder button"
    },
    backupFolderSelected: {
      message: "Dossier : {folder}",
      description: "Shows selected backup folder"
    },
    backupIncludePrompts: {
      message: "Prompts",
      description: "Include prompts in backup toggle"
    },
    backupIncludeFolders: {
      message: "Dossiers",
      description: "Include folders in backup toggle"
    },
    backupIntervalLabel: {
      message: "Intervalle",
      description: "Backup interval label"
    },
    backupIntervalManual: {
      message: "Manuel",
      description: "Manual backup mode"
    },
    backupIntervalDaily: {
      message: "Quotidien",
      description: "Daily backup interval"
    },
    backupIntervalWeekly: {
      message: "Hebdomadaire",
      description: "Weekly backup interval"
    },
    backupLastBackup: {
      message: "Derni\xE8re : {time}",
      description: "Last backup timestamp"
    },
    backupNever: {
      message: "Jamais",
      description: "Never backed up"
    },
    backupSuccess: {
      message: "\u2713 Sauvegarde : {prompts} prompts, {folders} dossiers",
      description: "Backup success message"
    },
    backupError: {
      message: "\u2717 \xC9chec : {error}",
      description: "Backup error message"
    },
    backupNotSupported: {
      message: "\u26A0\uFE0F API File System non support\xE9e",
      description: "Browser not supported message"
    },
    backupSelectFolderFirst: {
      message: "S\xE9lectionnez un dossier d'abord",
      description: "No folder selected warning"
    },
    backupUserCancelled: {
      message: "Annul\xE9",
      description: "User cancelled folder selection"
    },
    backupConfigSaved: {
      message: "\u2713 Param\xE8tres enregistr\xE9s",
      description: "Config saved message"
    },
    backupPermissionDenied: {
      message: "\u26A0\uFE0F Acc\xE8s refus\xE9. Changez d'emplacement.",
      description: "Permission denied for restricted directory"
    },
    backupConfigureInOptions: {
      message: "Configurez via la page Options.",
      description: "Backup configure in options page explanation"
    },
    openOptionsPage: {
      message: "Ouvrir Options",
      description: "Open options page button"
    },
    optionsPageSubtitle: {
      message: "Options",
      description: "Options page subtitle"
    },
    optionsComingSoon: {
      message: "Bient\xF4t...",
      description: "Options page placeholder text"
    },
    backupDataAccessNotice: {
      message: "Acc\xE8s limit\xE9",
      description: "Backup data access limitation title"
    },
    backupDataAccessHint: {
      message: "S\xE9curit\xE9 : cette page ne peut acc\xE9der aux donn\xE9es. Utilisez la page Gemini.",
      description: "Backup data access limitation explanation"
    },
    promptManagerOptions: {
      message: "Prompts",
      description: "Prompt Manager options section label"
    },
    hidePromptManager: {
      message: "Masquer",
      description: "Hide the prompt manager floating ball"
    },
    hidePromptManagerHint: {
      message: "Masquer le bouton flottant du gestionnaire",
      description: "Hint for hiding prompt manager feature"
    },
    customWebsites: {
      message: "Sites personnalis\xE9s",
      description: "Custom websites for prompt manager"
    },
    customWebsitesPlaceholder: {
      message: "URL (ex: chatgpt.com)",
      description: "Custom websites input placeholder"
    },
    customWebsitesHint: {
      message: "Activer le gestionnaire sur ces sites.",
      description: "Custom websites hint"
    },
    addWebsite: {
      message: "Ajouter",
      description: "Add website button"
    },
    removeWebsite: {
      message: "Retirer",
      description: "Remove website button"
    },
    invalidUrl: {
      message: "URL invalide",
      description: "Invalid URL error message"
    },
    websiteAdded: {
      message: "Site ajout\xE9",
      description: "Website added success message"
    },
    websiteRemoved: {
      message: "Site retir\xE9",
      description: "Website removed success message"
    },
    permissionDenied: {
      message: "Acc\xE8s refus\xE9. Autorisez-le.",
      description: "Permission denied error message"
    },
    permissionRequestFailed: {
      message: "\xC9chec demande. V\xE9rifiez les param\xE8tres.",
      description: "Permission request failure message"
    },
    customWebsitesNote: {
      message: "Note : rechargez le site apr\xE8s autorisation.",
      description: "Custom websites reload/permission note"
    },
    starredHistory: {
      message: "Favoris",
      description: "Starred history title"
    },
    viewStarredHistory: {
      message: "Voir les favoris",
      description: "View starred history button"
    },
    noStarredMessages: {
      message: "Aucun favori",
      description: "No starred messages placeholder"
    },
    removeFromStarred: {
      message: "Retirer",
      description: "Remove from starred tooltip"
    },
    justNow: {
      message: "\xC0 l'instant",
      description: "Just now time label"
    },
    hoursAgo: {
      message: "heures",
      description: "Hours ago label"
    },
    yesterday: {
      message: "Hier",
      description: "Yesterday date label"
    },
    daysAgo: {
      message: "jours",
      description: "Days ago label"
    },
    loading: {
      message: "Chargement...",
      description: "Loading message"
    },
    keyboardShortcuts: {
      message: "Raccourcis",
      description: "Keyboard shortcuts section title"
    },
    enableShortcuts: {
      message: "Activer les raccourcis",
      description: "Enable shortcuts toggle label"
    },
    previousNode: {
      message: "Pr\xE9c\xE9dent",
      description: "Previous timeline node shortcut label"
    },
    nextNode: {
      message: "Suivant",
      description: "Next timeline node shortcut label"
    },
    shortcutKey: {
      message: "Touche",
      description: "Shortcut key label"
    },
    shortcutModifiers: {
      message: "Modif.",
      description: "Shortcut modifiers label"
    },
    resetShortcuts: {
      message: "R\xE9initialiser",
      description: "Reset shortcuts button"
    },
    shortcutsResetSuccess: {
      message: "Raccourcis r\xE9initialis\xE9s",
      description: "Shortcuts reset success message"
    },
    shortcutsDescription: {
      message: "Navigation clavier dans la chronologie",
      description: "Shortcuts description"
    },
    modifierNone: {
      message: "Aucun",
      description: "No modifier key"
    },
    modifierAlt: {
      message: "Alt",
      description: "Alt modifier key"
    },
    modifierCtrl: {
      message: "Ctrl",
      description: "Ctrl modifier key"
    },
    modifierShift: {
      message: "Maj",
      description: "Shift modifier key"
    },
    modifierMeta: {
      message: "Cmd/Win",
      description: "Meta/Command/Windows modifier key"
    },
    cloudSync: {
      message: "Synchro Cloud",
      description: "Cloud sync section title"
    },
    cloudSyncDescription: {
      message: "Synchro dossiers & prompts sur Drive",
      description: "Cloud sync description"
    },
    syncModeDisabled: {
      message: "D\xE9sactiv\xE9",
      description: "Sync mode disabled option"
    },
    syncModeManual: {
      message: "Manuel",
      description: "Sync mode manual option"
    },
    syncServerPort: {
      message: "Port du serveur",
      description: "Port number for the sync server"
    },
    syncNow: {
      message: "Synchro",
      description: "Sync now button"
    },
    lastSynced: {
      message: "Synchro : {time}",
      description: "Last sync timestamp"
    },
    neverSynced: {
      message: "Jamais",
      description: "Never synced message"
    },
    lastUploaded: {
      message: "Upload : {time}",
      description: "Last upload timestamp"
    },
    neverUploaded: {
      message: "Jamais",
      description: "Never uploaded message"
    },
    syncSuccess: {
      message: "\u2713 Succ\xE8s",
      description: "Sync success message"
    },
    syncError: {
      message: "\u2717 \xC9chec : {error}",
      description: "Sync error message"
    },
    syncInProgress: {
      message: "Synchro...",
      description: "Sync in progress message"
    },
    uploadInProgress: {
      message: "Uploading...",
      description: "Upload in progress message"
    },
    uploadSuccess: {
      message: "\u2713 Uploaded successfully",
      description: "Upload success message"
    },
    downloadInProgress: {
      message: "Downloading...",
      description: "Download in progress message"
    },
    downloadMergeSuccess: {
      message: "\u2713 Downloaded and merged",
      description: "Download and merge success message"
    },
    syncUpload: {
      message: "Envoyer",
      description: "Upload button label"
    },
    syncMerge: {
      message: "R\xE9cup\xE9rer",
      description: "Merge button label"
    },
    syncMode: {
      message: "Mode",
      description: "Sync mode label"
    },
    minutesAgo: {
      message: "min.",
      description: "Minutes ago label"
    },
    syncNoData: {
      message: "Aucune donn\xE9e sur Drive",
      description: "Error message when no data is found in Drive"
    },
    syncUploadFailed: {
      message: "\xC9chec upload",
      description: "Error message when upload fails"
    },
    syncDownloadFailed: {
      message: "\xC9chec t\xE9l\xE9ch.",
      description: "Error message when download fails"
    },
    syncAuthFailed: {
      message: "\xC9chec auth.",
      description: "Error message when authentication fails"
    },
    signOut: {
      message: "D\xE9connexion",
      description: "Sign out button"
    },
    signInWithGoogle: {
      message: "Connexion Google",
      description: "Sign in with Google button"
    },
    nanobananaOptions: {
      message: "Options NanoBanana",
      description: "NanoBanana options section label"
    },
    enableNanobananaWatermarkRemover: {
      message: "Retirer le filigrane NanoBanana",
      description: "Enable automatic watermark removal for NanoBanana images"
    },
    nanobananaWatermarkRemoverHint: {
      message: "Retire automatiquement les filigranes visibles de Gemini sur les images",
      description: "Watermark remover feature hint"
    },
    nanobananaDownloadTooltip: {
      message: "T\xE9l\xE9charger l'image sans filigrane (NanoBanana)",
      description: "Download button tooltip"
    },
    deepResearchDownload: {
      message: "T\xE9l\xE9charger la r\xE9flexion",
      description: "Deep Research download button text"
    },
    deepResearchDownloadTooltip: {
      message: "T\xE9l\xE9charger le contenu de la r\xE9flexion en Markdown",
      description: "Deep Research download button tooltip"
    },
    folder_uncategorized: {
      message: "Non class\xE9",
      description: "Label for root-level conversations not in any folder"
    },
    timelineLevelTitle: {
      message: "Niveau du n\u0153ud",
      description: "Title for timeline node level context menu"
    },
    timelineLevel1: {
      message: "Niveau 1",
      description: "Timeline node level 1 option"
    },
    timelineLevel2: {
      message: "Niveau 2",
      description: "Timeline node level 2 option"
    },
    timelineLevel3: {
      message: "Niveau 3",
      description: "Timeline node level 3 option"
    },
    timelineCollapse: {
      message: "R\xE9duire",
      description: "Collapse children"
    },
    timelineExpand: {
      message: "\xC9tendre",
      description: "Expand children"
    },
    timelinePreviewSearch: {
      message: "Rechercher...",
      description: "Timeline preview panel search placeholder"
    },
    timelinePreviewNoResults: {
      message: "Aucun r\xE9sultat",
      description: "Timeline preview panel no search results"
    },
    timelinePreviewNoMessages: {
      message: "Aucun message",
      description: "Timeline preview panel no messages"
    },
    quoteReply: {
      message: "Citer et r\xE9pondre",
      description: "Quote reply button text"
    },
    inputCollapseOptions: {
      message: "Options de saisie",
      description: "Input options section label"
    },
    enableInputCollapse: {
      message: "Activer la r\xE9duction de l'entr\xE9e",
      description: "Enable input collapse toggle label"
    },
    enableInputCollapseHint: {
      message: "R\xE9duit la zone de saisie quand elle est vide pour gagner de l'espace",
      description: "Input collapse feature hint"
    },
    inputCollapsePlaceholder: {
      message: "Message \xE0 Gemini",
      description: "Placeholder text shown in collapsed input"
    },
    ctrlEnterSend: {
      message: "Ctrl+Entr\xE9e pour envoyer",
      description: "Ctrl+Enter to send toggle label"
    },
    ctrlEnterSendHint: {
      message: "Appuyez sur Ctrl+Entr\xE9e pour envoyer, Entr\xE9e pour un saut de ligne",
      description: "Ctrl+Enter to send feature hint"
    },
    batch_delete_confirm: {
      message: "Voulez-vous vraiment supprimer {count} discussion(s) ? Cette action est irr\xE9versible.",
      description: "Batch delete confirmation message"
    },
    batch_delete_in_progress: {
      message: "Suppression... ({current}/{total})",
      description: "Batch delete progress message"
    },
    batch_delete_success: {
      message: "\u2713 {count} discussion(s) supprim\xE9e(s)",
      description: "Batch delete success message"
    },
    batch_delete_partial: {
      message: "Suppression termin\xE9e : {success} succ\xE8s, {failed} \xE9checs",
      description: "Batch delete partial success message"
    },
    batch_delete_limit_reached: {
      message: "Maximum {max} discussions s\xE9lectionnables \xE0 la fois",
      description: "Batch delete limit warning"
    },
    batch_delete_button: {
      message: "Supprimer la s\xE9lection",
      description: "Batch delete button tooltip in multi-select mode"
    },
    batch_delete_match_patterns: {
      message: "delete,confirm,yes,ok,remove,supprimer,confirmer,oui,retirer,effacer",
      description: "Comma-separated list of keywords to match native delete/confirm buttons (case-insensitive)"
    },
    generalOptions: {
      message: "Options g\xE9n\xE9rales",
      description: "General options section label"
    },
    enableTabTitleUpdate: {
      message: "Synchroniser le titre de l'onglet",
      description: "Enable tab title sync toggle label"
    },
    enableTabTitleUpdateHint: {
      message: "Met \xE0 jour automatiquement le titre de l'onglet avec celui de la discussion",
      description: "Tab title sync feature hint"
    },
    enableMermaidRendering: {
      message: "Activer le rendu Mermaid",
      description: "Enable Mermaid diagram rendering toggle label"
    },
    enableMermaidRenderingHint: {
      message: "Affiche automatiquement les diagrammes Mermaid dans les blocs de code",
      description: "Mermaid rendering feature hint"
    },
    enableQuoteReply: {
      message: "Activer la citation",
      description: "Enable quote reply toggle label"
    },
    enableQuoteReplyHint: {
      message: "Affiche un bouton flottant pour citer le texte s\xE9lectionn\xE9 dans les conversations",
      description: "Quote reply feature hint"
    },
    contextSync: {
      message: "Synchro du contexte",
      description: "Context Sync title"
    },
    contextSyncDescription: {
      message: "Synchronisez le contexte du chat avec votre IDE local",
      description: "Context Sync description"
    },
    syncToIDE: {
      message: "Synchroniser vers l'IDE",
      description: "Sync to IDE button"
    },
    ideOnline: {
      message: "IDE en ligne",
      description: "IDE Online status"
    },
    ideOffline: {
      message: "IDE hors ligne",
      description: "IDE Offline status"
    },
    syncing: {
      message: "Synchronisation...",
      description: "Syncing status"
    },
    checkServer: {
      message: "Veuillez d\xE9marrer le serveur AI Sync dans VS Code",
      description: "Check server hint"
    },
    capturing: {
      message: "Capture du dialogue...",
      description: "Capturing status"
    },
    syncedSuccess: {
      message: "Synchronis\xE9 avec succ\xE8s !",
      description: "Synced success message"
    },
    downloadingOriginal: {
      message: "T\xE9l\xE9chargement de l'image originale",
      description: "Status when downloading original image"
    },
    downloadingOriginalLarge: {
      message: "T\xE9l\xE9chargement de l'image originale (fichier volumineux)",
      description: "Status when downloading large original image"
    },
    downloadLargeWarning: {
      message: "Avertissement fichier volumineux",
      description: "Warning shown for large downloads"
    },
    downloadProcessing: {
      message: "Traitement du filigrane",
      description: "Status when processing watermark removal"
    },
    downloadSuccess: {
      message: "T\xE9l\xE9chargement...",
      description: "Status when download starts"
    },
    downloadError: {
      message: "\xC9chec",
      description: "Status prefix when download fails"
    },
    recentsHide: {
      message: "Masquer les \xE9l\xE9ments r\xE9cents",
      description: "Info-bulle pour masquer la section des \xE9l\xE9ments r\xE9cents"
    },
    recentsShow: {
      message: "Afficher les \xE9l\xE9ments r\xE9cents",
      description: "Info-bulle pour afficher la section des \xE9l\xE9ments r\xE9cents"
    },
    gemsHide: {
      message: "Masquer les Gems",
      description: "Info-bulle pour masquer la section de la liste des Gems"
    },
    gemsShow: {
      message: "Afficher les Gems",
      description: "Info-bulle pour afficher la section de la liste des Gems"
    },
    setAsDefaultModel: {
      message: "Set as default model",
      description: "Tooltip for setting default model"
    },
    cancelDefaultModel: {
      message: "Cancel default model",
      description: "Tooltip for cancelling default model"
    },
    defaultModelSet: {
      message: "Default model set: $1",
      description: "Toast message when default model is set"
    },
    defaultModelCleared: {
      message: "Default model cleared",
      description: "Toast message when default model is cleared"
    },
    sidebarAutoHide: {
      message: "Masquer auto barre lat\xE9rale",
      description: "Auto-hide sidebar toggle label"
    },
    sidebarAutoHideHint: {
      message: "R\xE9duit automatiquement la barre lat\xE9rale quand la souris la quitte, l'\xE9tend quand elle y entre",
      description: "Auto-hide sidebar feature hint"
    },
    folderSpacing: {
      message: "Espacement des dossiers",
      description: "Folder spacing adjustment label"
    },
    folderSpacingCompact: {
      message: "Compact",
      description: "Compact folder spacing label"
    },
    folderSpacingSpacious: {
      message: "Spacieux",
      description: "Spacious folder spacing label"
    },
    folderTreeIndent: {
      message: "Retrait des sous-dossiers",
      description: "Subfolder tree indentation adjustment label"
    },
    folderTreeIndentCompact: {
      message: "\xC9troit",
      description: "Narrow subfolder indentation label"
    },
    folderTreeIndentSpacious: {
      message: "Large",
      description: "Wide subfolder indentation label"
    },
    export_select_mode_select_all: {
      message: "Select all",
      description: "Selection mode select all toggle"
    },
    export_select_mode_count: {
      message: "Selected {count}",
      description: "Selection mode selected message count"
    },
    export_select_mode_toggle: {
      message: "Select message",
      description: "Selection mode per-message toggle tooltip"
    },
    export_select_mode_select_below: {
      message: "Select messages below",
      description: "Selection mode top-left button to select messages below current line"
    },
    export_select_mode_empty: {
      message: "Please select at least one message to export.",
      description: "Selection mode validation when nothing is selected"
    },
    export_format_image_description: {
      message: "Image PNG unique, pratique pour le partage mobile.",
      description: "Description for Image export format"
    },
    export_image_progress: {
      message: "Generating image...",
      description: "Progress message while generating image export"
    },
    deepResearchSaveReport: {
      message: "Save Report",
      description: "Deep Research save report button"
    },
    deepResearchSaveReportTooltip: {
      message: "Export this research report",
      description: "Deep Research save report tooltip"
    },
    export_fontsize_label: {
      message: "Taille de police",
      description: "Label for font size slider in export dialog"
    },
    export_fontsize_preview: {
      message: "Le vif renard brun saute par-dessus le chien paresseux.",
      description: "Preview text for font size slider in export dialog"
    },
    export_error_generic: {
      message: "\xC9chec de l'exportation : {error}",
      description: "Message d'\xE9chec d'export avec raison d\xE9taill\xE9e"
    },
    export_error_refresh_retry: {
      message: "\xC9chec de l'exportation d'image en raison d'un probl\xE8me r\xE9seau. Veuillez actualiser la page puis r\xE9essayer.",
      description: "Conseil affich\xE9 en cas d'\xE9chec temporaire du chargement lors de l'export image"
    },
    export_md_include_source_confirm: {
      message: "Le contenu export\xE9 contient des images de recherche web. Inclure les liens source des images dans le Markdown ?",
      description: "Confirm dialog when exporting markdown with web search images"
    },
    deepResearch_exportedAt: {
      message: "Export\xE9 le",
      description: "\xC9tiquette d'horodatage de l'exportation de Deep Research"
    },
    deepResearch_totalPhases: {
      message: "Phases totales",
      description: "\xC9tiquette du nombre total de phases de r\xE9flexion de Deep Research"
    },
    deepResearch_thinkingPhase: {
      message: "Phase de r\xE9flexion",
      description: "En-t\xEAte de phase de r\xE9flexion de Deep Research"
    },
    deepResearch_researchedWebsites: {
      message: "Sites web consult\xE9s",
      description: "En-t\xEAte de section des sites web recherch\xE9s de Deep Research"
    }
  };

  // ../gemini-voyager/src/locales/ja/messages.json
  var messages_default5 = {
    extName: {
      message: "Gemini Voyager",
      description: "Extension name"
    },
    extDescription: {
      message: "\u30BF\u30A4\u30E0\u30E9\u30A4\u30F3\u30CA\u30D3\u30B2\u30FC\u30B7\u30E7\u30F3\u3001\u30D5\u30A9\u30EB\u30C0\u6574\u7406\u3001\u30D7\u30ED\u30F3\u30D7\u30C8\u30F4\u30A9\u30EB\u30C8\u3001\u30C1\u30E3\u30C3\u30C8\u306E\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u306A\u3069\u3067\u3001Gemini \u306E\u4F53\u9A13\u3092\u5F37\u5316\u3057\u307E\u3059\u3002",
      description: "Extension description"
    },
    scrollMode: {
      message: "\u30B9\u30AF\u30ED\u30FC\u30EB\u30E2\u30FC\u30C9",
      description: "Scroll mode label"
    },
    flow: {
      message: "\u30D5\u30ED\u30FC",
      description: "Flow mode"
    },
    jump: {
      message: "\u30B8\u30E3\u30F3\u30D7",
      description: "Jump mode"
    },
    hideOuterContainer: {
      message: "\u5916\u5074\u306E\u30B3\u30F3\u30C6\u30CA\u3092\u96A0\u3059",
      description: "Hide outer container label"
    },
    draggableTimeline: {
      message: "\u30C9\u30E9\u30C3\u30B0\u53EF\u80FD\u306A\u30BF\u30A4\u30E0\u30E9\u30A4\u30F3",
      description: "Draggable Timeline label"
    },
    enableMarkerLevel: {
      message: "\u30CE\u30FC\u30C9\u968E\u5C64\u3092\u6709\u52B9\u5316",
      description: "Enable timeline node level feature"
    },
    enableMarkerLevelHint: {
      message: "\u30BF\u30A4\u30E0\u30E9\u30A4\u30F3\u30CE\u30FC\u30C9\u3092\u53F3\u30AF\u30EA\u30C3\u30AF\u3057\u3066\u968E\u5C64\u3092\u8A2D\u5B9A\u3057\u3001\u5B50\u30CE\u30FC\u30C9\u3092\u6298\u308A\u305F\u305F\u307F\u307E\u3059",
      description: "Node level feature hint"
    },
    experimentalLabel: {
      message: "\u5B9F\u9A13\u7684",
      description: "Experimental feature label"
    },
    resetPosition: {
      message: "\u4F4D\u7F6E\u3092\u30EA\u30BB\u30C3\u30C8",
      description: "Reset Position button"
    },
    resetTimelinePosition: {
      message: "\u30BF\u30A4\u30E0\u30E9\u30A4\u30F3\u306E\u4F4D\u7F6E\u3092\u30EA\u30BB\u30C3\u30C8",
      description: "Reset timeline position button in timeline options"
    },
    language: {
      message: "\u8A00\u8A9E",
      description: "Language label"
    },
    pm_title: {
      message: "Gemini Voyager",
      description: "Prompt Manager title"
    },
    pm_add: {
      message: "\u8FFD\u52A0",
      description: "Add prompt button"
    },
    pm_search_placeholder: {
      message: "\u30D7\u30ED\u30F3\u30D7\u30C8\u307E\u305F\u306F\u30BF\u30B0\u3092\u691C\u7D22",
      description: "Search placeholder"
    },
    pm_import: {
      message: "\u30A4\u30F3\u30DD\u30FC\u30C8",
      description: "Import button"
    },
    pm_export: {
      message: "\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8",
      description: "Export button"
    },
    pm_prompt_placeholder: {
      message: "\u30D7\u30ED\u30F3\u30D7\u30C8\u306E\u30C6\u30AD\u30B9\u30C8",
      description: "Prompt textarea placeholder"
    },
    pm_tags_placeholder: {
      message: "\u30BF\u30B0 (\u30AB\u30F3\u30DE\u533A\u5207\u308A)",
      description: "Tags input placeholder"
    },
    pm_save: {
      message: "\u4FDD\u5B58",
      description: "Save prompt"
    },
    pm_cancel: {
      message: "\u30AD\u30E3\u30F3\u30BB\u30EB",
      description: "Cancel"
    },
    pm_all_tags: {
      message: "\u3059\u3079\u3066",
      description: "All tags chip"
    },
    pm_empty: {
      message: "\u307E\u3060\u30D7\u30ED\u30F3\u30D7\u30C8\u304C\u3042\u308A\u307E\u305B\u3093",
      description: "Empty state"
    },
    pm_copy: {
      message: "\u30B3\u30D4\u30FC",
      description: "Copy prompt"
    },
    pm_copied: {
      message: "\u30B3\u30D4\u30FC\u3057\u307E\u3057\u305F",
      description: "Copied notice"
    },
    pm_delete: {
      message: "\u524A\u9664",
      description: "Delete prompt"
    },
    pm_delete_confirm: {
      message: "\u3053\u306E\u30D7\u30ED\u30F3\u30D7\u30C8\u3092\u524A\u9664\u3057\u307E\u3059\u304B\uFF1F",
      description: "Delete confirm"
    },
    pm_lock: {
      message: "\u4F4D\u7F6E\u3092\u56FA\u5B9A",
      description: "Lock panel position"
    },
    pm_unlock: {
      message: "\u4F4D\u7F6E\u56FA\u5B9A\u3092\u89E3\u9664",
      description: "Unlock panel position"
    },
    pm_import_invalid: {
      message: "\u7121\u52B9\u306A\u30D5\u30A1\u30A4\u30EB\u5F62\u5F0F\u3067\u3059",
      description: "Import invalid"
    },
    pm_import_success: {
      message: "{count} \u4EF6\u306E\u30D7\u30ED\u30F3\u30D7\u30C8\u3092\u30A4\u30F3\u30DD\u30FC\u30C8\u3057\u307E\u3057\u305F",
      description: "Import success"
    },
    pm_duplicate: {
      message: "\u30D7\u30ED\u30F3\u30D7\u30C8\u3092\u8907\u88FD",
      description: "Duplicate on add"
    },
    pm_deleted: {
      message: "\u524A\u9664\u3057\u307E\u3057\u305F",
      description: "Deleted notice"
    },
    pm_edit: {
      message: "\u7DE8\u96C6",
      description: "Edit prompt"
    },
    pm_expand: {
      message: "\u5C55\u958B",
      description: "Expand prompt text"
    },
    pm_collapse: {
      message: "\u6298\u308A\u305F\u305F\u3080",
      description: "Collapse prompt text"
    },
    pm_saved: {
      message: "\u4FDD\u5B58\u3057\u307E\u3057\u305F",
      description: "Saved notice"
    },
    pm_settings: {
      message: "\u8A2D\u5B9A",
      description: "Settings button"
    },
    pm_settings_tooltip: {
      message: "\u62E1\u5F35\u6A5F\u80FD\u306E\u8A2D\u5B9A\u3092\u958B\u304F",
      description: "Settings button tooltip"
    },
    pm_settings_fallback: {
      message: "\u30D6\u30E9\u30A6\u30B6\u30C4\u30FC\u30EB\u30D0\u30FC\u306E\u62E1\u5F35\u6A5F\u80FD\u30A2\u30A4\u30B3\u30F3\u3092\u30AF\u30EA\u30C3\u30AF\u3057\u3066\u8A2D\u5B9A\u3092\u958B\u3044\u3066\u304F\u3060\u3055\u3044",
      description: "Settings open failed message"
    },
    pm_backup: {
      message: "\u30ED\u30FC\u30AB\u30EB\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7",
      description: "Local backup button"
    },
    pm_backup_tooltip: {
      message: "\u30D7\u30ED\u30F3\u30D7\u30C8\u3068\u30D5\u30A9\u30EB\u30C0\u3092\u30BF\u30A4\u30E0\u30B9\u30BF\u30F3\u30D7\u4ED8\u304D\u30D5\u30A9\u30EB\u30C0\u306B\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7",
      description: "Backup button tooltip"
    },
    pm_backup_cancelled: {
      message: "\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u3092\u30AD\u30E3\u30F3\u30BB\u30EB\u3057\u307E\u3057\u305F",
      description: "Backup cancelled hint"
    },
    pm_backup_error: {
      message: "\u2717 \u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u306B\u5931\u6557\u3057\u307E\u3057\u305F",
      description: "Backup failed hint"
    },
    pm_backup_hint_options: {
      message: "\u3053\u306E\u6A5F\u80FD\u306F Gemini \u30DA\u30FC\u30B8\u306E\u30D7\u30ED\u30F3\u30D7\u30C8\u30DE\u30CD\u30FC\u30B8\u30E3\u30FC\u306B\u7D71\u5408\u3055\u308C\u3066\u3044\u307E\u3059\u3002",
      description: "Backup hint in options page"
    },
    pm_backup_step1: {
      message: "Gemini \u306E\u30DA\u30FC\u30B8 (gemini.google.com) \u3092\u958B\u304D\u307E\u3059",
      description: "Backup step 1"
    },
    pm_backup_step2: {
      message: "\u53F3\u4E0B\u306E\u62E1\u5F35\u6A5F\u80FD\u30A2\u30A4\u30B3\u30F3\u3092\u30AF\u30EA\u30C3\u30AF\u3057\u3066\u30D7\u30ED\u30F3\u30D7\u30C8\u30DE\u30CD\u30FC\u30B8\u30E3\u30FC\u3092\u958B\u304D\u307E\u3059",
      description: "Backup step 2"
    },
    pm_backup_step3: {
      message: "\u300C\u{1F4BE} \u30ED\u30FC\u30AB\u30EB\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u300D\u30DC\u30BF\u30F3\u3092\u30AF\u30EA\u30C3\u30AF\u3057\u3001\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u5148\u30D5\u30A9\u30EB\u30C0\u3092\u9078\u629E\u3057\u307E\u3059",
      description: "Backup step 3"
    },
    pm_backup_note: {
      message: "\u3059\u3079\u3066\u306E\u30D7\u30ED\u30F3\u30D7\u30C8\u3068\u30D5\u30A9\u30EB\u30C0\u304C\u542B\u307E\u308C\u3001\u30BF\u30A4\u30E0\u30B9\u30BF\u30F3\u30D7\u4ED8\u304D\u306E\u30D5\u30A9\u30EB\u30C0\u306B\u4FDD\u5B58\u3055\u308C\u307E\u3059 (\u5F62\u5F0F\uFF1Abackup-YYYYMMDD-HHMMSS)",
      description: "Backup feature note"
    },
    extensionVersion: {
      message: "\u30D0\u30FC\u30B8\u30E7\u30F3",
      description: "Extension version label"
    },
    newVersionAvailable: {
      message: "\u65B0\u3057\u3044\u30D0\u30FC\u30B8\u30E7\u30F3\u304C\u5229\u7528\u53EF\u80FD\u3067\u3059",
      description: "Update reminder title"
    },
    currentVersionLabel: {
      message: "\u73FE\u5728\u306E\u30D0\u30FC\u30B8\u30E7\u30F3",
      description: "Label for current version number"
    },
    latestVersionLabel: {
      message: "\u6700\u65B0\u30D0\u30FC\u30B8\u30E7\u30F3",
      description: "Label for latest version number"
    },
    updateNow: {
      message: "\u66F4\u65B0\u3059\u308B",
      description: "CTA to update to latest version"
    },
    starProject: {
      message: "\u5FDC\u63F4\u3059\u308B \u2B50",
      description: "Github callout"
    },
    officialDocs: {
      message: "\u516C\u5F0F\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8",
      description: "Official docs link"
    },
    exportChatJson: {
      message: "\u4F1A\u8A71\u5C65\u6B74\u3092\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8",
      description: "Tooltip for export button"
    },
    folder_title: {
      message: "\u30D5\u30A9\u30EB\u30C0",
      description: "Folder section title"
    },
    folder_create: {
      message: "\u30D5\u30A9\u30EB\u30C0\u3092\u4F5C\u6210",
      description: "Create folder button tooltip"
    },
    folder_name_prompt: {
      message: "\u30D5\u30A9\u30EB\u30C0\u540D\u3092\u5165\u529B\uFF1A",
      description: "Create folder name prompt"
    },
    folder_rename_prompt: {
      message: "\u65B0\u3057\u3044\u540D\u524D\u3092\u5165\u529B\uFF1A",
      description: "Rename folder prompt"
    },
    folder_delete_confirm: {
      message: "\u3053\u306E\u30D5\u30A9\u30EB\u30C0\u3068\u305D\u306E\u4E2D\u8EAB\u3092\u3059\u3079\u3066\u524A\u9664\u3057\u307E\u3059\u304B\uFF1F",
      description: "Delete folder confirmation"
    },
    folder_create_subfolder: {
      message: "\u30B5\u30D6\u30D5\u30A9\u30EB\u30C0\u3092\u4F5C\u6210",
      description: "Create subfolder menu item"
    },
    folder_rename: {
      message: "\u540D\u524D\u3092\u5909\u66F4",
      description: "Rename folder menu item"
    },
    folder_change_color: {
      message: "\u8272\u3092\u5909\u66F4",
      description: "Change folder color menu item"
    },
    folder_delete: {
      message: "\u524A\u9664",
      description: "Delete folder menu item"
    },
    folder_color_default: {
      message: "\u30C7\u30D5\u30A9\u30EB\u30C8",
      description: "Default folder color name"
    },
    folder_color_red: {
      message: "\u8D64",
      description: "Red folder color name"
    },
    folder_color_orange: {
      message: "\u30AA\u30EC\u30F3\u30B8",
      description: "Orange folder color name"
    },
    folder_color_yellow: {
      message: "\u9EC4\u8272",
      description: "Yellow folder color name"
    },
    folder_color_green: {
      message: "\u7DD1",
      description: "Green folder color name"
    },
    folder_color_blue: {
      message: "\u9752",
      description: "Blue folder color name"
    },
    folder_color_purple: {
      message: "\u7D2B",
      description: "Purple folder color name"
    },
    folder_color_pink: {
      message: "\u30D4\u30F3\u30AF",
      description: "Pink folder color name"
    },
    folder_color_custom: {
      message: "\u30AB\u30B9\u30BF\u30E0",
      description: "Custom folder color name"
    },
    folder_empty: {
      message: "\u30D5\u30A9\u30EB\u30C0\u304C\u3042\u308A\u307E\u305B\u3093",
      description: "Empty state placeholder when no folders exist"
    },
    folder_pin: {
      message: "\u30D5\u30A9\u30EB\u30C0\u3092\u30D4\u30F3\u7559\u3081",
      description: "Pin folder menu item"
    },
    folder_unpin: {
      message: "\u30D4\u30F3\u7559\u3081\u3092\u89E3\u9664",
      description: "Unpin folder menu item"
    },
    folder_remove_conversation: {
      message: "\u30D5\u30A9\u30EB\u30C0\u304B\u3089\u524A\u9664",
      description: "Remove conversation button tooltip"
    },
    folder_remove_conversation_confirm: {
      message: "\u300C{title}\u300D\u3092\u3053\u306E\u30D5\u30A9\u30EB\u30C0\u304B\u3089\u524A\u9664\u3057\u307E\u3059\u304B\uFF1F",
      description: "Remove conversation confirmation"
    },
    conversation_more: {
      message: "\u305D\u306E\u4ED6\u306E\u30AA\u30D7\u30B7\u30E7\u30F3",
      description: "Conversation more options button tooltip"
    },
    conversation_move_to_folder: {
      message: "\u30D5\u30A9\u30EB\u30C0\u3078\u79FB\u52D5",
      description: "Move conversation to folder menu item"
    },
    conversation_move_to_folder_title: {
      message: "\u30D5\u30A9\u30EB\u30C0\u3078\u79FB\u52D5",
      description: "Move conversation to folder dialog title"
    },
    chatWidth: {
      message: "\u30C1\u30E3\u30C3\u30C8\u306E\u5E45",
      description: "Chat width adjustment label"
    },
    chatWidthNarrow: {
      message: "\u72ED\u3044",
      description: "Narrow chat width label"
    },
    chatWidthWide: {
      message: "\u5E83\u3044",
      description: "Wide chat width label"
    },
    sidebarWidth: {
      message: "\u30B5\u30A4\u30C9\u30D0\u30FC\u306E\u5E45",
      description: "Sidebar width adjustment label"
    },
    sidebarWidthNarrow: {
      message: "\u72ED\u3044",
      description: "Narrow sidebar width label"
    },
    sidebarWidthWide: {
      message: "\u5E83\u3044",
      description: "Wide sidebar width label"
    },
    formula_copied: {
      message: "\u2713 \u6570\u5F0F\u3092\u30B3\u30D4\u30FC\u3057\u307E\u3057\u305F",
      description: "Formula copied success message"
    },
    formula_copy_failed: {
      message: "\u2717 \u30B3\u30D4\u30FC\u306B\u5931\u6557\u3057\u307E\u3057\u305F",
      description: "Formula copy failed message"
    },
    formulaCopyFormat: {
      message: "\u6570\u5F0F\u30B3\u30D4\u30FC\u5F62\u5F0F",
      description: "Formula copy format setting label"
    },
    formulaCopyFormatLatex: {
      message: "LaTeX",
      description: "LaTeX format option"
    },
    formulaCopyFormatUnicodeMath: {
      message: "MathML (Word)",
      description: "Label for UnicodeMath formula copy format option"
    },
    formulaCopyFormatHint: {
      message: "\u6570\u5F0F\u3092\u30AF\u30EA\u30C3\u30AF\u3057\u3066\u30B3\u30D4\u30FC\u3059\u308B\u969B\u306E\u5F62\u5F0F\u3092\u9078\u629E\u3057\u307E\u3059",
      description: "Formula copy format hint"
    },
    formulaCopyFormatNoDollar: {
      message: "LaTeX (\u30C9\u30EB\u8A18\u53F7\u306A\u3057)",
      description: "LaTeX format option without dollar signs"
    },
    folder_filter_current_user: {
      message: "\u30A2\u30AB\u30A6\u30F3\u30C8\u9694\u96E2",
      description: "Show only conversations from the current Google account"
    },
    folder_export: {
      message: "\u30D5\u30A9\u30EB\u30C0\u3092\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8",
      description: "Export folders button tooltip"
    },
    folder_import_export: {
      message: "\u30D5\u30A9\u30EB\u30C0\u306E\u30A4\u30F3\u30DD\u30FC\u30C8/\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8",
      description: "Combined import/export button tooltip"
    },
    folder_cloud_upload: {
      message: "\u30AF\u30E9\u30A6\u30C9\u306B\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9",
      description: "Cloud upload button tooltip"
    },
    folder_cloud_sync: {
      message: "\u30AF\u30E9\u30A6\u30C9\u304B\u3089\u540C\u671F",
      description: "Cloud sync button tooltip"
    },
    folder_import: {
      message: "\u30D5\u30A9\u30EB\u30C0\u3092\u30A4\u30F3\u30DD\u30FC\u30C8",
      description: "Import folders button tooltip"
    },
    folder_import_title: {
      message: "\u30D5\u30A9\u30EB\u30C0\u8A2D\u5B9A\u306E\u30A4\u30F3\u30DD\u30FC\u30C8",
      description: "Import dialog title"
    },
    folder_import_strategy: {
      message: "\u30A4\u30F3\u30DD\u30FC\u30C8\u65B9\u6CD5\uFF1A",
      description: "Import strategy label"
    },
    folder_import_merge: {
      message: "\u65E2\u5B58\u306E\u30D5\u30A9\u30EB\u30C0\u3068\u7D71\u5408\u3059\u308B",
      description: "Merge import strategy"
    },
    folder_import_overwrite: {
      message: "\u65E2\u5B58\u306E\u30D5\u30A9\u30EB\u30C0\u3092\u4E0A\u66F8\u304D\u3059\u308B",
      description: "Overwrite import strategy"
    },
    folder_import_select_file: {
      message: "\u30A4\u30F3\u30DD\u30FC\u30C8\u3059\u308B JSON \u30D5\u30A1\u30A4\u30EB\u3092\u9078\u629E",
      description: "Import file selection prompt"
    },
    folder_import_success: {
      message: "\u2713 \u30D5\u30A9\u30EB\u30C0 {folders} \u4EF6\u3001\u4F1A\u8A71 {conversations} \u4EF6\u3092\u30A4\u30F3\u30DD\u30FC\u30C8\u3057\u307E\u3057\u305F",
      description: "Import success message"
    },
    folder_import_success_skipped: {
      message: "\u2713 \u30D5\u30A9\u30EB\u30C0 {folders} \u4EF6\u3001\u4F1A\u8A71 {conversations} \u4EF6\u3092\u30A4\u30F3\u30DD\u30FC\u30C8\u3057\u307E\u3057\u305F (\u91CD\u8907 {skipped} \u4EF6\u3092\u30B9\u30AD\u30C3\u30D7)",
      description: "Import success with skipped message"
    },
    folder_import_error: {
      message: "\u2717 \u30A4\u30F3\u30DD\u30FC\u30C8\u5931\u6557\uFF1A{error}",
      description: "Import error message"
    },
    folder_export_success: {
      message: "\u2713 \u30D5\u30A9\u30EB\u30C0\u3092\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u3057\u307E\u3057\u305F",
      description: "Export success message"
    },
    folder_import_invalid_format: {
      message: "\u7121\u52B9\u306A\u30D5\u30A1\u30A4\u30EB\u5F62\u5F0F\u3067\u3059\u3002\u6B63\u3057\u3044\u30D5\u30A9\u30EB\u30C0\u8A2D\u5B9A\u30D5\u30A1\u30A4\u30EB\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
      description: "Invalid format error"
    },
    folder_import_confirm_overwrite: {
      message: "\u65E2\u5B58\u306E\u30D5\u30A9\u30EB\u30C0\u69CB\u9020\u304C\u3059\u3079\u3066\u7F6E\u63DB\u3055\u308C\u307E\u3059\u3002\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u304C\u4F5C\u6210\u3055\u308C\u307E\u3059\u3002\u7D9A\u884C\u3057\u307E\u3059\u304B\uFF1F",
      description: "Overwrite confirmation"
    },
    export_dialog_title: {
      message: "\u4F1A\u8A71\u306E\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8",
      description: "Export dialog title"
    },
    export_dialog_select: {
      message: "\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u5F62\u5F0F\u3092\u9078\u629E\uFF1A",
      description: "Export format selection label"
    },
    export_dialog_warning: {
      message: "\u26A0\uFE0F \u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u958B\u59CB\u5F8C\u3001\u5168\u5185\u5BB9\u3092\u8AAD\u307F\u8FBC\u3080\u305F\u3081\u306B\u6700\u521D\u306E\u30E1\u30C3\u30BB\u30FC\u30B8\u3078\u81EA\u52D5\u79FB\u52D5\u3057\u307E\u3059\u3002\u79FB\u52D5\u4E2D\u306F\u4F55\u3082\u3057\u306A\u3044\u3067\u304F\u3060\u3055\u3044\u3002\u5B8C\u4E86\u5F8C\u3001\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u304C\u81EA\u52D5\u7684\u306B\u518D\u958B\u3055\u308C\u307E\u3059\u3002",
      description: "Warning about auto-jump and loading completeness"
    },
    export_dialog_safari_cmdp_hint: {
      message: "Safari \u306E\u30D2\u30F3\u30C8\uFF1A\u4E0B\u306E\u300C\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u300D\u3092\u9078\u629E\u3057\u3001\u5C11\u3057\u5F85\u3063\u3066\u304B\u3089 \u2318P \u3092\u62BC\u3057\u3066\u300CPDF \u3068\u3057\u3066\u4FDD\u5B58\u300D\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
      description: "Safari-specific hint for PDF export"
    },
    export_toast_safari_pdf_ready: {
      message: "\u4ECA\u3059\u3050 Command + P \u3092\u62BC\u3057\u3066 PDF \u3092\u66F8\u304D\u51FA\u305B\u307E\u3059\u3002",
      description: "Safari-specific toast shown after PDF export is prepared"
    },
    export_dialog_safari_markdown_hint: {
      message: "\u6CE8\u610F: Safari \u306E\u5236\u9650\u306B\u3088\u308A\u3001\u30C1\u30E3\u30C3\u30C8\u5C65\u6B74\u5185\u306E\u753B\u50CF\u306F\u62BD\u51FA\u3067\u304D\u307E\u305B\u3093\u3002\u5B8C\u5168\u306B\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u3059\u308B\u306B\u306F\u3001PDF \u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u3092\u4F7F\u7528\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
      description: "Warning about image references in Safari markdown export"
    },
    export_format_json_description: {
      message: "\u958B\u767A\u8005\u5411\u3051\u306E\u6A5F\u68B0\u53EF\u8AAD\u5F62\u5F0F",
      description: "Description for JSON export format"
    },
    export_format_markdown_description: {
      message: "\u30AF\u30EA\u30FC\u30F3\u3067\u6C4E\u7528\u6027\u306E\u9AD8\u3044\u30C6\u30AD\u30B9\u30C8\u5F62\u5F0F\uFF08\u63A8\u5968\uFF09",
      description: "Description for Markdown export format"
    },
    export_format_pdf_description: {
      message: "\u5370\u5237\u306B\u9069\u3057\u305F\u5F62\u5F0F\uFF08PDF \u3068\u3057\u3066\u4FDD\u5B58\uFF09",
      description: "Description for PDF export format"
    },
    editInputWidth: {
      message: "\u5165\u529B\u6B04\u306E\u5E45",
      description: "Edit input width adjustment label"
    },
    editInputWidthNarrow: {
      message: "\u72ED\u3044",
      description: "Narrow edit input width label"
    },
    editInputWidthWide: {
      message: "\u5E83\u3044",
      description: "Wide edit input width label"
    },
    timelineOptions: {
      message: "\u30BF\u30A4\u30E0\u30E9\u30A4\u30F3\u30AA\u30D7\u30B7\u30E7\u30F3",
      description: "Timeline options section label"
    },
    folderOptions: {
      message: "\u30D5\u30A9\u30EB\u30C0\u30AA\u30D7\u30B7\u30E7\u30F3",
      description: "Folder options section label"
    },
    enableFolderFeature: {
      message: "\u30D5\u30A9\u30EB\u30C0\u6A5F\u80FD\u3092\u6709\u52B9\u5316",
      description: "Enable or disable the folder feature"
    },
    hideArchivedConversations: {
      message: "\u30D5\u30A9\u30EB\u30C0\u306B\u5165\u308C\u305F\u4F1A\u8A71\u3092\u30E1\u30A4\u30F3\u30EA\u30B9\u30C8\u304B\u3089\u96A0\u3059",
      description: "Hide conversations that are in folders from the main list"
    },
    conversation_star: {
      message: "\u4F1A\u8A71\u306B\u30B9\u30BF\u30FC\u3092\u4ED8\u3051\u308B",
      description: "Star conversation button tooltip"
    },
    conversation_unstar: {
      message: "\u30B9\u30BF\u30FC\u3092\u5916\u3059",
      description: "Unstar conversation button tooltip"
    },
    conversation_untitled: {
      message: "\u7121\u984C",
      description: "Fallback title for conversations without a name"
    },
    geminiOnlyNotice: {
      message: "\u30C7\u30D5\u30A9\u30EB\u30C8\u3067\u306F Gemini\uFF08Enterprise \u7248\u542B\u3080\uFF09\u3068 AI Studio \u3067\u52D5\u4F5C\u3057\u307E\u3059\u3002\u4ED6\u306E\u30B5\u30A4\u30C8\u3067\u30D7\u30ED\u30F3\u30D7\u30C8\u30DE\u30CD\u30FC\u30B8\u30E3\u30FC\u3092\u4F7F\u7528\u3059\u308B\u306B\u306F\u3001\u4EE5\u4E0B\u3067\u8FFD\u52A0\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
      description: "Notice that defaults are limited to Gemini/AI Studio"
    },
    folderManager_dataLossWarning: {
      message: "\u26A0\uFE0F \u8B66\u544A\uFF1A\u30D5\u30A9\u30EB\u30C0\u30C7\u30FC\u30BF\u306E\u8AAD\u307F\u8FBC\u307F\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002\u30C7\u30FC\u30BF\u304C\u7834\u640D\u3057\u3066\u3044\u308B\u53EF\u80FD\u6027\u304C\u3042\u308A\u307E\u3059\u3002\u30D6\u30E9\u30A6\u30B6\u306E\u30B3\u30F3\u30BD\u30FC\u30EB\u3067\u8A73\u7D30\u3092\u78BA\u8A8D\u3057\u3001\u53EF\u80FD\u3067\u3042\u308C\u3070\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u304B\u3089\u5FA9\u5143\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
      description: "Warning shown when folder data fails to load"
    },
    backupOptions: {
      message: "\u81EA\u52D5\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7",
      description: "Backup options section label"
    },
    backupEnabled: {
      message: "\u81EA\u52D5\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u3092\u6709\u52B9\u5316",
      description: "Enable auto backup toggle"
    },
    backupNow: {
      message: "\u4ECA\u3059\u3050\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7",
      description: "Backup now button"
    },
    backupSelectFolder: {
      message: "\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u5148\u3092\u9078\u629E",
      description: "Select backup folder button"
    },
    backupFolderSelected: {
      message: "\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u30D5\u30A9\u30EB\u30C0\uFF1A{folder}",
      description: "Shows selected backup folder"
    },
    backupIncludePrompts: {
      message: "\u30D7\u30ED\u30F3\u30D7\u30C8\u3092\u542B\u3081\u308B",
      description: "Include prompts in backup toggle"
    },
    backupIncludeFolders: {
      message: "\u30D5\u30A9\u30EB\u30C0\u3092\u542B\u3081\u308B",
      description: "Include folders in backup toggle"
    },
    backupIntervalLabel: {
      message: "\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u9593\u9694",
      description: "Backup interval label"
    },
    backupIntervalManual: {
      message: "\u624B\u52D5\u306E\u307F",
      description: "Manual backup mode"
    },
    backupIntervalDaily: {
      message: "\u6BCE\u65E5",
      description: "Daily backup interval"
    },
    backupIntervalWeekly: {
      message: "\u6BCE\u9031 (7 \u65E5\u3054\u3068)",
      description: "Weekly backup interval"
    },
    backupLastBackup: {
      message: "\u524D\u56DE\u306E\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\uFF1A{time}",
      description: "Last backup timestamp"
    },
    backupNever: {
      message: "\u306A\u3057",
      description: "Never backed up"
    },
    backupSuccess: {
      message: "\u2713 \u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u5B8C\u4E86\uFF1A\u30D7\u30ED\u30F3\u30D7\u30C8 {prompts} \u4EF6\uFF0C\u30D5\u30A9\u30EB\u30C0 {folders} \u4EF6\uFF0C\u4F1A\u8A71 {conversations} \u4EF6",
      description: "Backup success message"
    },
    backupError: {
      message: "\u2717 \u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u5931\u6557\uFF1A{error}",
      description: "Backup error message"
    },
    backupNotSupported: {
      message: "\u26A0\uFE0F \u81EA\u52D5\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u306B\u306F File System Access API \u306B\u5BFE\u5FDC\u3057\u305F\u6700\u65B0\u306E\u30D6\u30E9\u30A6\u30B6\u304C\u5FC5\u8981\u3067\u3059",
      description: "Browser not supported message"
    },
    backupSelectFolderFirst: {
      message: "\u5148\u306B\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u30D5\u30A9\u30EB\u30C0\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044",
      description: "No folder selected warning"
    },
    backupUserCancelled: {
      message: "\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u3092\u30AD\u30E3\u30F3\u30BB\u30EB\u3057\u307E\u3057\u305F",
      description: "User cancelled folder selection"
    },
    backupConfigSaved: {
      message: "\u2713 \u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u8A2D\u5B9A\u3092\u4FDD\u5B58\u3057\u307E\u3057\u305F",
      description: "Config saved message"
    },
    backupPermissionDenied: {
      message: "\u26A0\uFE0F \u3053\u306E\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u306B\u306F\u30A2\u30AF\u30BB\u30B9\u3067\u304D\u307E\u305B\u3093\u3002\u5225\u306E\u5834\u6240\uFF08\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8\u3001\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u3001\u30C7\u30B9\u30AF\u30C8\u30C3\u30D7\u306A\u3069\uFF09\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
      description: "Permission denied for restricted directory"
    },
    backupConfigureInOptions: {
      message: "\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u306E\u8A2D\u5B9A\u306F\u30AA\u30D7\u30B7\u30E7\u30F3\u30DA\u30FC\u30B8\u3067\u884C\u3046\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059\u3002\u4E0B\u306E\u30DC\u30BF\u30F3\u3092\u30AF\u30EA\u30C3\u30AF\u3057\u3066\u958B\u3044\u3066\u304F\u3060\u3055\u3044\uFF08\u62E1\u5F35\u6A5F\u80FD\u30A2\u30A4\u30B3\u30F3\u6A2A\u306E 3 \u70B9\u30EA\u30FC\u30C0 \u2192 \u30AA\u30D7\u30B7\u30E7\u30F3\uFF09\u3002",
      description: "Backup configure in options page explanation"
    },
    openOptionsPage: {
      message: "\u30AA\u30D7\u30B7\u30E7\u30F3\u30DA\u30FC\u30B8\u3092\u958B\u304F",
      description: "Open options page button"
    },
    optionsPageSubtitle: {
      message: "\u62E1\u5F35\u6A5F\u80FD\u306E\u30AA\u30D7\u30B7\u30E7\u30F3",
      description: "Options page subtitle"
    },
    optionsComingSoon: {
      message: "\u3055\u3089\u306B\u591A\u304F\u306E\u30AA\u30D7\u30B7\u30E7\u30F3\u3092\u8FD1\u65E5\u8FFD\u52A0\u4E88\u5B9A\u3067\u3059...",
      description: "Options page placeholder text"
    },
    backupDataAccessNotice: {
      message: "\u30C7\u30FC\u30BF\u30A2\u30AF\u30BB\u30B9\u306E\u5236\u9650",
      description: "Backup data access limitation title"
    },
    backupDataAccessHint: {
      message: "\u30D6\u30E9\u30A6\u30B6\u306E\u30BB\u30AD\u30E5\u30EA\u30C6\u30A3\u5236\u9650\u306B\u3088\u308A\u3001\u3053\u306E\u30AA\u30D7\u30B7\u30E7\u30F3\u30DA\u30FC\u30B8\u304B\u3089\u306F Gemini \u30DA\u30FC\u30B8\u4E0A\u306E\u30D7\u30ED\u30F3\u30D7\u30C8\u3084\u30D5\u30A9\u30EB\u30C0\u30C7\u30FC\u30BF\u306B\u76F4\u63A5\u30A2\u30AF\u30BB\u30B9\u3067\u304D\u307E\u305B\u3093\u3002\u624B\u52D5\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u306B\u306F\u3001Gemini \u30DA\u30FC\u30B8\u4E0A\u306E\u30D7\u30ED\u30F3\u30D7\u30C8\u30DE\u30CD\u30FC\u30B8\u30E3\u30FC\u3068\u30D5\u30A9\u30EB\u30C0\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u6A5F\u80FD\u3092\u3054\u5229\u7528\u304F\u3060\u3055\u3044\u3002",
      description: "Backup data access limitation explanation"
    },
    promptManagerOptions: {
      message: "\u30D7\u30ED\u30F3\u30D7\u30C8\u30DE\u30CD\u30FC\u30B8\u30E3\u30FC",
      description: "Prompt Manager options section label"
    },
    hidePromptManager: {
      message: "\u30D7\u30ED\u30F3\u30D7\u30C8\u30DE\u30CD\u30FC\u30B8\u30E3\u30FC\u3092\u96A0\u3059",
      description: "Hide the prompt manager floating ball"
    },
    hidePromptManagerHint: {
      message: "\u30DA\u30FC\u30B8\u4E0A\u306E\u30D7\u30ED\u30F3\u30D7\u30C8\u30DE\u30CD\u30FC\u30B8\u30E3\u30FC\u306E\u30D5\u30ED\u30FC\u30C6\u30A3\u30F3\u30B0\u30A2\u30A4\u30B3\u30F3\u3092\u975E\u8868\u793A\u306B\u3057\u307E\u3059",
      description: "Hint for hiding prompt manager feature"
    },
    customWebsites: {
      message: "\u30AB\u30B9\u30BF\u30E0\u30A6\u30A7\u30D6\u30B5\u30A4\u30C8",
      description: "Custom websites for prompt manager"
    },
    customWebsitesPlaceholder: {
      message: "\u30A6\u30A7\u30D6\u30B5\u30A4\u30C8\u306E URL \u3092\u5165\u529B (\u4F8B\uFF1Achatgpt.com)",
      description: "Custom websites input placeholder"
    },
    customWebsitesHint: {
      message: "\u30D7\u30ED\u30F3\u30D7\u30C8\u30DE\u30CD\u30FC\u30B8\u30E3\u30FC\u3092\u4F7F\u7528\u3057\u305F\u3044\u30A6\u30A7\u30D6\u30B5\u30A4\u30C8\u3092\u8FFD\u52A0\u3057\u307E\u3059\u3002\u3053\u308C\u3089\u306E\u30B5\u30A4\u30C8\u3067\u306F\u30D7\u30ED\u30F3\u30D7\u30C8\u30DE\u30CD\u30FC\u30B8\u30E3\u30FC\u306E\u307F\u304C\u6709\u52B9\u306B\u306A\u308A\u307E\u3059\u3002",
      description: "Custom websites hint"
    },
    addWebsite: {
      message: "\u30A6\u30A7\u30D6\u30B5\u30A4\u30C8\u3092\u8FFD\u52A0",
      description: "Add website button"
    },
    removeWebsite: {
      message: "\u524A\u9664",
      description: "Remove website button"
    },
    invalidUrl: {
      message: "\u7121\u52B9\u306A URL \u5F62\u5F0F\u3067\u3059",
      description: "Invalid URL error message"
    },
    websiteAdded: {
      message: "\u30A6\u30A7\u30D6\u30B5\u30A4\u30C8\u3092\u8FFD\u52A0\u3057\u307E\u3057\u305F",
      description: "Website added success message"
    },
    websiteRemoved: {
      message: "\u30A6\u30A7\u30D6\u30B5\u30A4\u30C8\u3092\u524A\u9664\u3057\u307E\u3057\u305F",
      description: "Website removed success message"
    },
    permissionDenied: {
      message: "\u6A29\u9650\u304C\u62D2\u5426\u3055\u308C\u307E\u3057\u305F\u3002\u3053\u306E\u30A6\u30A7\u30D6\u30B5\u30A4\u30C8\u3078\u306E\u30A2\u30AF\u30BB\u30B9\u3092\u8A31\u53EF\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
      description: "Permission denied error message"
    },
    permissionRequestFailed: {
      message: "\u6A29\u9650\u306E\u30EA\u30AF\u30A8\u30B9\u30C8\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002\u3082\u3046\u4E00\u5EA6\u8A66\u3059\u304B\u3001\u62E1\u5F35\u6A5F\u80FD\u306E\u8A2D\u5B9A\u3067\u30A2\u30AF\u30BB\u30B9\u3092\u8A31\u53EF\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
      description: "Permission request failure message"
    },
    customWebsitesNote: {
      message: "\u30D2\u30F3\u30C8\uFF1A\u30B5\u30A4\u30C8\u3092\u8FFD\u52A0\u3059\u308B\u3068\u30A2\u30AF\u30BB\u30B9\u306E\u8A31\u53EF\u3092\u6C42\u3081\u3089\u308C\u307E\u3059\u3002\u8A31\u53EF\u3057\u305F\u5F8C\u3001\u30D7\u30ED\u30F3\u30D7\u30C8\u30DE\u30CD\u30FC\u30B8\u30E3\u30FC\u3092\u958B\u59CB\u3059\u308B\u306B\u306F\u305D\u306E\u30B5\u30A4\u30C8\u3092\u518D\u8AAD\u307F\u8FBC\u307F\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
      description: "Custom websites reload/permission note"
    },
    starredHistory: {
      message: "\u30B9\u30BF\u30FC\u4ED8\u304D\u5C65\u6B74",
      description: "Starred history title"
    },
    viewStarredHistory: {
      message: "\u30B9\u30BF\u30FC\u4ED8\u304D\u5C65\u6B74\u3092\u8868\u793A",
      description: "View starred history button"
    },
    noStarredMessages: {
      message: "\u30B9\u30BF\u30FC\u4ED8\u304D\u30E1\u30C3\u30BB\u30FC\u30B8\u306F\u307E\u3060\u3042\u308A\u307E\u305B\u3093",
      description: "No starred messages placeholder"
    },
    removeFromStarred: {
      message: "\u30B9\u30BF\u30FC\u3092\u5916\u3059",
      description: "Remove from starred tooltip"
    },
    justNow: {
      message: "\u305F\u3063\u305F\u4ECA",
      description: "Just now time label"
    },
    hoursAgo: {
      message: "\u6642\u9593\u524D",
      description: "Hours ago label"
    },
    yesterday: {
      message: "\u6628\u65E5",
      description: "Yesterday date label"
    },
    daysAgo: {
      message: "\u65E5\u524D",
      description: "Days ago label"
    },
    loading: {
      message: "\u8AAD\u307F\u8FBC\u307F\u4E2D...",
      description: "Loading message"
    },
    keyboardShortcuts: {
      message: "\u30AD\u30FC\u30DC\u30FC\u30C9\u30B7\u30E7\u30FC\u30C8\u30AB\u30C3\u30C8",
      description: "Keyboard shortcuts section title"
    },
    enableShortcuts: {
      message: "\u30AD\u30FC\u30DC\u30FC\u30C9\u30B7\u30E7\u30FC\u30C8\u30AB\u30C3\u30C8\u3092\u6709\u52B9\u5316",
      description: "Enable shortcuts toggle label"
    },
    previousNode: {
      message: "\u524D\u306E\u30CE\u30FC\u30C9\u3078",
      description: "Previous timeline node shortcut label"
    },
    nextNode: {
      message: "\u6B21\u306E\u30CE\u30FC\u30C9\u3078",
      description: "Next timeline node shortcut label"
    },
    shortcutKey: {
      message: "\u30AD\u30FC",
      description: "Shortcut key label"
    },
    shortcutModifiers: {
      message: "\u4FEE\u98FE\u30AD\u30FC",
      description: "Shortcut modifiers label"
    },
    resetShortcuts: {
      message: "\u30C7\u30D5\u30A9\u30EB\u30C8\u306B\u623B\u3059",
      description: "Reset shortcuts button"
    },
    shortcutsResetSuccess: {
      message: "\u30B7\u30E7\u30FC\u30C8\u30AB\u30C3\u30C8\u3092\u30C7\u30D5\u30A9\u30EB\u30C8\u306B\u623B\u3057\u307E\u3057\u305F",
      description: "Shortcuts reset success message"
    },
    shortcutsDescription: {
      message: "\u30AD\u30FC\u30DC\u30FC\u30C9\u30B7\u30E7\u30FC\u30C8\u30AB\u30C3\u30C8\u3092\u4F7F\u3063\u3066\u30BF\u30A4\u30E0\u30E9\u30A4\u30F3\u3092\u79FB\u52D5\u3057\u307E\u3059",
      description: "Shortcuts description"
    },
    modifierNone: {
      message: "\u306A\u3057",
      description: "No modifier key"
    },
    modifierAlt: {
      message: "Alt",
      description: "Alt modifier key"
    },
    modifierCtrl: {
      message: "Ctrl",
      description: "Ctrl modifier key"
    },
    modifierShift: {
      message: "Shift",
      description: "Shift modifier key"
    },
    modifierMeta: {
      message: "Cmd/Win",
      description: "Meta/Command/Windows modifier key"
    },
    cloudSync: {
      message: "\u30AF\u30E9\u30A6\u30C9\u540C\u671F",
      description: "Cloud sync section title"
    },
    cloudSyncDescription: {
      message: "\u30D5\u30A9\u30EB\u30C0\u3068\u30D7\u30ED\u30F3\u30D7\u30C8\u3092 Google \u30C9\u30E9\u30A4\u30D6\u306B\u540C\u671F\u3057\u307E\u3059",
      description: "Cloud sync description"
    },
    syncModeDisabled: {
      message: "\u7121\u52B9",
      description: "Sync mode disabled option"
    },
    syncModeManual: {
      message: "\u624B\u52D5",
      description: "Sync mode manual option"
    },
    syncServerPort: {
      message: "\u30B5\u30FC\u30D0\u30FC\u30DD\u30FC\u30C8",
      description: "Port number for the sync server"
    },
    syncNow: {
      message: "\u4ECA\u3059\u3050\u540C\u671F",
      description: "Sync now button"
    },
    lastSynced: {
      message: "\u6700\u7D42\u540C\u671F\uFF1A{time}",
      description: "Last sync timestamp"
    },
    neverSynced: {
      message: "\u672A\u540C\u671F",
      description: "Never synced message"
    },
    lastUploaded: {
      message: "\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\uFF1A{time}",
      description: "Last upload timestamp"
    },
    neverUploaded: {
      message: "\u672A\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9",
      description: "Never uploaded message"
    },
    syncSuccess: {
      message: "\u2713 \u540C\u671F\u306B\u6210\u529F\u3057\u307E\u3057\u305F",
      description: "Sync success message"
    },
    syncError: {
      message: "\u2717 \u540C\u671F\u306B\u5931\u6557\u3057\u307E\u3057\u305F\uFF1A{error}",
      description: "Sync error message"
    },
    syncInProgress: {
      message: "\u540C\u671F\u4E2D...",
      description: "Sync in progress message"
    },
    uploadInProgress: {
      message: "Uploading...",
      description: "Upload in progress message"
    },
    uploadSuccess: {
      message: "\u2713 Uploaded successfully",
      description: "Upload success message"
    },
    downloadInProgress: {
      message: "Downloading...",
      description: "Download in progress message"
    },
    downloadMergeSuccess: {
      message: "\u2713 Downloaded and merged",
      description: "Download and merge success message"
    },
    syncUpload: {
      message: "\u30C9\u30E9\u30A4\u30D6\u3078\u4FDD\u5B58",
      description: "Upload button label"
    },
    syncMerge: {
      message: "\u30C9\u30E9\u30A4\u30D6\u304B\u3089\u30DE\u30FC\u30B8",
      description: "Merge button label"
    },
    syncMode: {
      message: "\u540C\u671F\u30E2\u30FC\u30C9",
      description: "Sync mode label"
    },
    minutesAgo: {
      message: "\u5206\u524D",
      description: "Minutes ago label"
    },
    syncNoData: {
      message: "\u30C9\u30E9\u30A4\u30D6\u306B\u540C\u671F\u30C7\u30FC\u30BF\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093",
      description: "Error message when no data is found in Drive"
    },
    syncUploadFailed: {
      message: "\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u306B\u5931\u6557\u3057\u307E\u3057\u305F",
      description: "Error message when upload fails"
    },
    syncDownloadFailed: {
      message: "\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u306B\u5931\u6557\u3057\u307E\u3057\u305F",
      description: "Error message when download fails"
    },
    syncAuthFailed: {
      message: "\u8A8D\u8A3C\u306B\u5931\u6557\u3057\u307E\u3057\u305F",
      description: "Error message when authentication fails"
    },
    signOut: {
      message: "\u30B5\u30A4\u30F3\u30A2\u30A6\u30C8",
      description: "Sign out button"
    },
    signInWithGoogle: {
      message: "Google \u3067\u30B5\u30A4\u30F3\u30A4\u30F3",
      description: "Sign in with Google button"
    },
    nanobananaOptions: {
      message: "NanoBanana \u30AA\u30D7\u30B7\u30E7\u30F3",
      description: "NanoBanana options section label"
    },
    enableNanobananaWatermarkRemover: {
      message: "NanoBanana \u900F\u304B\u3057\u9664\u53BB",
      description: "Enable automatic watermark removal for NanoBanana images"
    },
    nanobananaWatermarkRemoverHint: {
      message: "\u751F\u6210\u3055\u308C\u305F\u753B\u50CF\u304B\u3089\u76EE\u306B\u898B\u3048\u308B Gemini \u306E\u900F\u304B\u3057\u3092\u81EA\u52D5\u7684\u306B\u9664\u53BB\u3057\u307E\u3059",
      description: "Watermark remover feature hint"
    },
    nanobananaDownloadTooltip: {
      message: "\u900F\u304B\u3057\u306A\u3057\u753B\u50CF\u3092\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9 (NanoBanana)",
      description: "Download button tooltip"
    },
    deepResearchDownload: {
      message: "\u601D\u8003\u5185\u5BB9\u3092\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9",
      description: "Deep Research download button text"
    },
    deepResearchDownloadTooltip: {
      message: "\u601D\u8003\u5185\u5BB9\u3092 Markdown \u5F62\u5F0F\u3067\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9",
      description: "Deep Research download button tooltip"
    },
    folder_uncategorized: {
      message: "\u672A\u5206\u985E",
      description: "Label for root-level conversations not in any folder"
    },
    timelineLevelTitle: {
      message: "\u30CE\u30FC\u30C9\u968E\u5C64",
      description: "Title for timeline node level context menu"
    },
    timelineLevel1: {
      message: "\u30EC\u30D9\u30EB 1",
      description: "Timeline node level 1 option"
    },
    timelineLevel2: {
      message: "\u30EC\u30D9\u30EB 2",
      description: "Timeline node level 2 option"
    },
    timelineLevel3: {
      message: "\u30EC\u30D9\u30EB 3",
      description: "Timeline node level 3 option"
    },
    timelineCollapse: {
      message: "\u6298\u308A\u305F\u305F\u3080",
      description: "Collapse children"
    },
    timelineExpand: {
      message: "\u5C55\u958B",
      description: "Expand children"
    },
    timelinePreviewSearch: {
      message: "\u691C\u7D22...",
      description: "Timeline preview panel search placeholder"
    },
    timelinePreviewNoResults: {
      message: "\u7D50\u679C\u306A\u3057",
      description: "Timeline preview panel no search results"
    },
    timelinePreviewNoMessages: {
      message: "\u30E1\u30C3\u30BB\u30FC\u30B8\u306A\u3057",
      description: "Timeline preview panel no messages"
    },
    quoteReply: {
      message: "\u5F15\u7528\u8FD4\u4FE1",
      description: "Quote reply button text"
    },
    inputCollapseOptions: {
      message: "\u5165\u529B\u30AA\u30D7\u30B7\u30E7\u30F3",
      description: "Input options section label"
    },
    enableInputCollapse: {
      message: "\u5165\u529B\u6B04\u306E\u81EA\u52D5\u975E\u8868\u793A\u3092\u6709\u52B9\u5316",
      description: "Enable input collapse toggle label"
    },
    enableInputCollapseHint: {
      message: "\u7A7A\u306E\u6642\u306B\u5165\u529B\u6B04\u3092\u6298\u308A\u305F\u305F\u307F\u3001\u5E83\u3044\u8AAD\u66F8\u30B9\u30DA\u30FC\u30B9\u3092\u78BA\u4FDD\u3057\u307E\u3059",
      description: "Input collapse feature hint"
    },
    inputCollapsePlaceholder: {
      message: "Gemini \u306B\u30E1\u30C3\u30BB\u30FC\u30B8\u3092\u9001\u4FE1",
      description: "Placeholder text shown in collapsed input"
    },
    ctrlEnterSend: {
      message: "Ctrl+Enter \u3067\u9001\u4FE1",
      description: "Ctrl+Enter to send toggle label"
    },
    ctrlEnterSendHint: {
      message: "Ctrl+Enter \u3067\u30E1\u30C3\u30BB\u30FC\u30B8\u3092\u9001\u4FE1\u3001Enter \u3067\u6539\u884C",
      description: "Ctrl+Enter to send feature hint"
    },
    batch_delete_confirm: {
      message: "{count} \u4EF6\u306E\u4F1A\u8A71\u3092\u524A\u9664\u3057\u3066\u3082\u3088\u308D\u3057\u3044\u3067\u3059\u304B\uFF1F\u3053\u306E\u64CD\u4F5C\u306F\u53D6\u308A\u6D88\u305B\u307E\u305B\u3093\u3002",
      description: "Batch delete confirmation message"
    },
    batch_delete_in_progress: {
      message: "\u524A\u9664\u4E2D... ({current}/{total})",
      description: "Batch delete progress message"
    },
    batch_delete_success: {
      message: "\u2713 {count} \u4EF6\u306E\u4F1A\u8A71\u3092\u524A\u9664\u3057\u307E\u3057\u305F",
      description: "Batch delete success message"
    },
    batch_delete_partial: {
      message: "\u524A\u9664\u5B8C\u4E86\uFF1A\u6210\u529F {success} \u4EF6\uFF0C\u5931\u6557 {failed} \u4EF6",
      description: "Batch delete partial success message"
    },
    batch_delete_limit_reached: {
      message: "\u4E00\u5EA6\u306B\u9078\u629E\u3067\u304D\u308B\u4F1A\u8A71\u306F\u6700\u5927 {max} \u4EF6\u3067\u3059",
      description: "Batch delete limit warning"
    },
    batch_delete_button: {
      message: "\u9078\u629E\u3057\u305F\u9805\u76EE\u3092\u524A\u9664",
      description: "Batch delete button tooltip in multi-select mode"
    },
    batch_delete_match_patterns: {
      message: "delete,confirm,yes,ok,remove\uFF0C\u524A\u9664\uFF0C\u78BA\u8A8D\uFF0C\u78BA\u5B9A\uFF0C\u306F\u3044",
      description: "Comma-separated list of keywords to match native delete/confirm buttons (case-insensitive)"
    },
    generalOptions: {
      message: "\u4E00\u822C\u30AA\u30D7\u30B7\u30E7\u30F3",
      description: "General options section label"
    },
    enableTabTitleUpdate: {
      message: "\u30BF\u30D6\u30BF\u30A4\u30C8\u30EB\u306E\u540C\u671F",
      description: "Enable tab title sync toggle label"
    },
    enableTabTitleUpdateHint: {
      message: "\u30D6\u30E9\u30A6\u30B6\u306E\u30BF\u30D6\u30BF\u30A4\u30C8\u30EB\u3092\u3001\u73FE\u5728\u306E\u4F1A\u8A71\u30BF\u30A4\u30C8\u30EB\u3068\u81EA\u52D5\u7684\u306B\u540C\u671F\u3057\u307E\u3059",
      description: "Tab title sync feature hint"
    },
    enableMermaidRendering: {
      message: "Mermaid \u56F3\u8868\u306E\u30EC\u30F3\u30C0\u30EA\u30F3\u30B0",
      description: "Enable Mermaid diagram rendering toggle label"
    },
    enableMermaidRenderingHint: {
      message: "\u30B3\u30FC\u30C9\u30D6\u30ED\u30C3\u30AF\u5185\u306E Mermaid \u30C0\u30A4\u30A2\u30B0\u30E9\u30E0\u3092\u81EA\u52D5\u7684\u306B\u30EC\u30F3\u30C0\u30EA\u30F3\u30B0\u3057\u307E\u3059",
      description: "Mermaid rendering feature hint"
    },
    enableQuoteReply: {
      message: "\u5F15\u7528\u8FD4\u4FE1\u3092\u6709\u52B9\u5316",
      description: "Enable quote reply toggle label"
    },
    enableQuoteReplyHint: {
      message: "\u4F1A\u8A71\u3067\u30C6\u30AD\u30B9\u30C8\u3092\u9078\u629E\u3057\u305F\u3068\u304D\u306B\u3001\u9078\u629E\u3057\u305F\u30C6\u30AD\u30B9\u30C8\u3092\u5F15\u7528\u3059\u308B\u30D5\u30ED\u30FC\u30C6\u30A3\u30F3\u30B0\u30DC\u30BF\u30F3\u3092\u8868\u793A\u3057\u307E\u3059",
      description: "Quote reply feature hint"
    },
    contextSync: {
      message: "\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8\u540C\u671F",
      description: "Context Sync title"
    },
    contextSyncDescription: {
      message: "\u30C1\u30E3\u30C3\u30C8\u306E\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8\u3092\u30ED\u30FC\u30AB\u30EB IDE \u306B\u540C\u671F\u3057\u307E\u3059",
      description: "Context Sync description"
    },
    syncToIDE: {
      message: "IDE \u306B\u540C\u671F",
      description: "Sync to IDE button"
    },
    ideOnline: {
      message: "IDE \u30AA\u30F3\u30E9\u30A4\u30F3",
      description: "IDE Online status"
    },
    ideOffline: {
      message: "IDE \u30AA\u30D5\u30E9\u30A4\u30F3",
      description: "IDE Offline status"
    },
    syncing: {
      message: "\u540C\u671F\u4E2D...",
      description: "Syncing status"
    },
    checkServer: {
      message: "VS Code \u3067 AI Sync \u30B5\u30FC\u30D0\u30FC\u3092\u8D77\u52D5\u3057\u3066\u304F\u3060\u3055\u3044",
      description: "Check server hint"
    },
    capturing: {
      message: "\u5BFE\u8A71\u3092\u30AD\u30E3\u30D7\u30C1\u30E3\u4E2D...",
      description: "Capturing status"
    },
    syncedSuccess: {
      message: "\u540C\u671F\u306B\u6210\u529F\u3057\u307E\u3057\u305F\uFF01",
      description: "Synced success message"
    },
    downloadingOriginal: {
      message: "\u5143\u753B\u50CF\u3092\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u4E2D",
      description: "Status when downloading original image"
    },
    downloadingOriginalLarge: {
      message: "\u5143\u753B\u50CF\u3092\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u4E2D\uFF08\u5927\u304D\u3044\u30D5\u30A1\u30A4\u30EB\uFF09",
      description: "Status when downloading large original image"
    },
    downloadLargeWarning: {
      message: "\u5927\u5BB9\u91CF\u30D5\u30A1\u30A4\u30EB\u8B66\u544A",
      description: "Warning shown for large downloads"
    },
    downloadProcessing: {
      message: "\u900F\u304B\u3057\u3092\u51E6\u7406\u4E2D",
      description: "Status when processing watermark removal"
    },
    downloadSuccess: {
      message: "\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u4E2D...",
      description: "Status when download starts"
    },
    downloadError: {
      message: "\u5931\u6557",
      description: "Status prefix when download fails"
    },
    recentsHide: {
      message: "\u6700\u8FD1\u306E\u9805\u76EE\u3092\u975E\u8868\u793A",
      description: "\u6700\u8FD1\u306E\u30D7\u30EC\u30D3\u30E5\u30FC\u30BB\u30AF\u30B7\u30E7\u30F3\u3092\u975E\u8868\u793A\u306B\u3059\u308B\u30C4\u30FC\u30EB\u30C1\u30C3\u30D7"
    },
    recentsShow: {
      message: "\u6700\u8FD1\u306E\u9805\u76EE\u3092\u8868\u793A",
      description: "\u6700\u8FD1\u306E\u30D7\u30EC\u30D3\u30E5\u30FC\u30BB\u30AF\u30B7\u30E7\u30F3\u3092\u8868\u793A\u3059\u308B\u30C4\u30FC\u30EB\u30C1\u30C3\u30D7"
    },
    gemsHide: {
      message: "Gems \u3092\u975E\u8868\u793A",
      description: "Gems \u30EA\u30B9\u30C8\u30BB\u30AF\u30B7\u30E7\u30F3\u3092\u975E\u8868\u793A\u306B\u3059\u308B\u30C4\u30FC\u30EB\u30C1\u30C3\u30D7"
    },
    gemsShow: {
      message: "Gems \u3092\u8868\u793A",
      description: "Gems \u30EA\u30B9\u30C8\u30BB\u30AF\u30B7\u30E7\u30F3\u3092\u8868\u793A\u3059\u308B\u30C4\u30FC\u30EB\u30C1\u30C3\u30D7"
    },
    setAsDefaultModel: {
      message: "Set as default model",
      description: "Tooltip for setting default model"
    },
    cancelDefaultModel: {
      message: "Cancel default model",
      description: "Tooltip for cancelling default model"
    },
    defaultModelSet: {
      message: "Default model set: $1",
      description: "Toast message when default model is set"
    },
    defaultModelCleared: {
      message: "Default model cleared",
      description: "Toast message when default model is cleared"
    },
    sidebarAutoHide: {
      message: "\u30B5\u30A4\u30C9\u30D0\u30FC\u81EA\u52D5\u975E\u8868\u793A",
      description: "\u30B5\u30A4\u30C9\u30D0\u30FC\u81EA\u52D5\u975E\u8868\u793A\u30C8\u30B0\u30EB\u30E9\u30D9\u30EB"
    },
    sidebarAutoHideHint: {
      message: "\u30DE\u30A6\u30B9\u304C\u96E2\u308C\u308B\u3068\u81EA\u52D5\u3067\u30B5\u30A4\u30C9\u30D0\u30FC\u3092\u6298\u308A\u305F\u305F\u307F\u3001\u30DE\u30A6\u30B9\u304C\u5165\u308B\u3068\u5C55\u958B\u3057\u307E\u3059",
      description: "\u30B5\u30A4\u30C9\u30D0\u30FC\u81EA\u52D5\u975E\u8868\u793A\u6A5F\u80FD\u306E\u30D2\u30F3\u30C8"
    },
    folderSpacing: {
      message: "\u30D5\u30A9\u30EB\u30C0\u9593\u9694",
      description: "\u30D5\u30A9\u30EB\u30C0\u9593\u9694\u8ABF\u6574\u30E9\u30D9\u30EB"
    },
    folderSpacingCompact: {
      message: "\u30B3\u30F3\u30D1\u30AF\u30C8",
      description: "\u30B3\u30F3\u30D1\u30AF\u30C8\u30D5\u30A9\u30EB\u30C0\u9593\u9694\u30E9\u30D9\u30EB"
    },
    folderSpacingSpacious: {
      message: "\u3086\u3063\u305F\u308A",
      description: "\u3086\u3063\u305F\u308A\u30D5\u30A9\u30EB\u30C0\u9593\u9694\u30E9\u30D9\u30EB"
    },
    folderTreeIndent: {
      message: "\u30B5\u30D6\u30D5\u30A9\u30EB\u30C0\u306E\u30A4\u30F3\u30C7\u30F3\u30C8",
      description: "\u30B5\u30D6\u30D5\u30A9\u30EB\u30C0\u968E\u5C64\u306E\u30A4\u30F3\u30C7\u30F3\u30C8\u8ABF\u6574\u30E9\u30D9\u30EB"
    },
    folderTreeIndentCompact: {
      message: "\u72ED\u3044",
      description: "\u72ED\u3044\u30B5\u30D6\u30D5\u30A9\u30EB\u30C0\u30A4\u30F3\u30C7\u30F3\u30C8\u30E9\u30D9\u30EB"
    },
    folderTreeIndentSpacious: {
      message: "\u5E83\u3044",
      description: "\u5E83\u3044\u30B5\u30D6\u30D5\u30A9\u30EB\u30C0\u30A4\u30F3\u30C7\u30F3\u30C8\u30E9\u30D9\u30EB"
    },
    export_select_mode_select_all: {
      message: "\u3059\u3079\u3066\u9078\u629E",
      description: "Selection mode select all toggle"
    },
    export_select_mode_count: {
      message: "{count}\u4EF6\u9078\u629E\u4E2D",
      description: "Selection mode selected message count"
    },
    export_select_mode_toggle: {
      message: "\u30E1\u30C3\u30BB\u30FC\u30B8\u3092\u9078\u629E",
      description: "Selection mode per-message toggle tooltip"
    },
    export_select_mode_select_below: {
      message: "\u4EE5\u4E0B\u306E\u30E1\u30C3\u30BB\u30FC\u30B8\u3092\u9078\u629E",
      description: "Selection mode top-left button to select messages below current line"
    },
    export_select_mode_empty: {
      message: "\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u3059\u308B\u30E1\u30C3\u30BB\u30FC\u30B8\u30921\u3064\u4EE5\u4E0A\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044",
      description: "Selection mode validation when nothing is selected"
    },
    export_format_image_description: {
      message: "\u30E2\u30D0\u30A4\u30EB\u5171\u6709\u306B\u4FBF\u5229\u306A\u5358\u4E00\u306EPNG\u753B\u50CF\u3002",
      description: "Description for Image export format"
    },
    export_image_progress: {
      message: "\u753B\u50CF\u3092\u751F\u6210\u4E2D...",
      description: "Progress message while generating image export"
    },
    deepResearchSaveReport: {
      message: "\u30EC\u30DD\u30FC\u30C8\u3092\u4FDD\u5B58",
      description: "Deep Research save report button"
    },
    deepResearchSaveReportTooltip: {
      message: "\u3053\u306E\u8ABF\u67FB\u30EC\u30DD\u30FC\u30C8\u3092\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8",
      description: "Deep Research save report tooltip"
    },
    export_fontsize_label: {
      message: "\u30D5\u30A9\u30F3\u30C8\u30B5\u30A4\u30BA",
      description: "Label for font size slider in export dialog"
    },
    export_fontsize_preview: {
      message: "\u543E\u8F29\u306F\u732B\u3067\u3042\u308B\u3002\u540D\u524D\u306F\u307E\u3060\u306A\u3044\u3002",
      description: "Preview text for font size slider in export dialog"
    },
    export_error_generic: {
      message: "\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u306B\u5931\u6557\u3057\u307E\u3057\u305F: {error}",
      description: "\u8A73\u7D30\u7406\u7531\u4ED8\u304D\u306E\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u5931\u6557\u30E1\u30C3\u30BB\u30FC\u30B8"
    },
    export_error_refresh_retry: {
      message: "\u30CD\u30C3\u30C8\u30EF\u30FC\u30AF\u306E\u554F\u984C\u306B\u3088\u308A\u753B\u50CF\u306E\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002\u30DA\u30FC\u30B8\u3092\u518D\u8AAD\u307F\u8FBC\u307F\u3057\u3066\u518D\u8A66\u884C\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
      description: "\u753B\u50CF\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u306E\u4E00\u6642\u7684\u306A\u8AAD\u307F\u8FBC\u307F\u5931\u6557\u6642\u306B\u8868\u793A\u3059\u308B\u518D\u8A66\u884C\u6848\u5185"
    },
    export_md_include_source_confirm: {
      message: "\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u3059\u308B\u30B3\u30F3\u30C6\u30F3\u30C4\u306B\u30A6\u30A7\u30D6\u691C\u7D22\u753B\u50CF\u304C\u542B\u307E\u308C\u3066\u3044\u307E\u3059\u3002Markdown\u306B\u753B\u50CF\u306E\u30BD\u30FC\u30B9\u30EA\u30F3\u30AF\u3092\u542B\u3081\u307E\u3059\u304B\uFF1F",
      description: "Confirm dialog when exporting markdown with web search images"
    },
    deepResearch_exportedAt: {
      message: "\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u65E5\u6642",
      description: "\u6DF1\u5C64\u7814\u7A76\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u30BF\u30A4\u30E0\u30B9\u30BF\u30F3\u30D7\u30E9\u30D9\u30EB"
    },
    deepResearch_totalPhases: {
      message: "\u7DCF\u601D\u8003\u30D5\u30A7\u30FC\u30BA",
      description: "\u6DF1\u5C64\u7814\u7A76\u306E\u7DCF\u601D\u8003\u30D5\u30A7\u30FC\u30BA\u30E9\u30D9\u30EB"
    },
    deepResearch_thinkingPhase: {
      message: "\u601D\u8003\u30D5\u30A7\u30FC\u30BA",
      description: "\u6DF1\u5C64\u7814\u7A76\u601D\u8003\u30D5\u30A7\u30FC\u30BA\u30D8\u30C3\u30C0\u30FC"
    },
    deepResearch_researchedWebsites: {
      message: "\u8ABF\u67FB\u6E08\u307F\u30B5\u30A4\u30C8",
      description: "\u6DF1\u5C64\u7814\u7A76\u306E\u8ABF\u67FB\u6E08\u307F\u30A6\u30A7\u30D6\u30B5\u30A4\u30C8\u30BB\u30AF\u30B7\u30E7\u30F3\u30D8\u30C3\u30C0\u30FC"
    }
  };

  // ../gemini-voyager/src/locales/ko/messages.json
  var messages_default6 = {
    extName: {
      message: "Gemini Voyager",
      description: "Extension name"
    },
    extDescription: {
      message: "\uD0C0\uC784\uB77C\uC778 \uD0D0\uC0C9, \uD3F4\uB354 \uAD00\uB9AC, \uD504\uB86C\uD504\uD2B8 \uC800\uC7A5\uC18C \uBC0F \uCC44\uD305 \uB0B4\uBCF4\uB0B4\uAE30 \uAE30\uB2A5\uC744 \uD1B5\uD574 Gemini \uD658\uACBD\uC744 \uAC15\uD654\uD558\uC138\uC694.",
      description: "Extension description"
    },
    scrollMode: {
      message: "\uC2A4\uD06C\uB864 \uBAA8\uB4DC",
      description: "Scroll mode label"
    },
    flow: {
      message: "\uD50C\uB85C\uC6B0",
      description: "Flow mode"
    },
    jump: {
      message: "\uC810\uD504",
      description: "Jump mode"
    },
    hideOuterContainer: {
      message: "\uC678\uBD80 \uCEE8\uD14C\uC774\uB108 \uC228\uAE30\uAE30",
      description: "Hide outer container label"
    },
    draggableTimeline: {
      message: "\uB4DC\uB798\uADF8 \uAC00\uB2A5\uD55C \uD0C0\uC784\uB77C\uC778",
      description: "Draggable Timeline label"
    },
    enableMarkerLevel: {
      message: "\uB178\uB4DC \uB808\uBCA8 \uD65C\uC131\uD654",
      description: "Enable timeline node level feature"
    },
    enableMarkerLevelHint: {
      message: "\uD0C0\uC784\uB77C\uC778 \uB178\uB4DC\uB97C \uC6B0\uD074\uB9AD\uD558\uC5EC \uB808\uBCA8\uC744 \uC124\uC815\uD558\uACE0 \uD558\uC704 \uB178\uB4DC\uB97C \uC811\uC744 \uC218 \uC788\uC2B5\uB2C8\uB2E4",
      description: "Node level feature hint"
    },
    experimentalLabel: {
      message: "\uC2E4\uD5D8\uC801",
      description: "Experimental feature label"
    },
    resetPosition: {
      message: "\uC704\uCE58 \uCD08\uAE30\uD654",
      description: "Reset Position button"
    },
    resetTimelinePosition: {
      message: "\uD0C0\uC784\uB77C\uC778 \uC704\uCE58 \uCD08\uAE30\uD654",
      description: "Reset timeline position button in timeline options"
    },
    language: {
      message: "\uC5B8\uC5B4",
      description: "Language label"
    },
    pm_title: {
      message: "Gemini Voyager",
      description: "Prompt Manager title"
    },
    pm_add: {
      message: "\uCD94\uAC00",
      description: "Add prompt button"
    },
    pm_search_placeholder: {
      message: "\uD504\uB86C\uD504\uD2B8 \uB610\uB294 \uD0DC\uADF8 \uAC80\uC0C9",
      description: "Search placeholder"
    },
    pm_import: {
      message: "\uAC00\uC838\uC624\uAE30",
      description: "Import button"
    },
    pm_export: {
      message: "\uB0B4\uBCF4\uB0B4\uAE30",
      description: "Export button"
    },
    pm_prompt_placeholder: {
      message: "\uD504\uB86C\uD504\uD2B8 \uD14D\uC2A4\uD2B8",
      description: "Prompt textarea placeholder"
    },
    pm_tags_placeholder: {
      message: "\uD0DC\uADF8 (\uC27C\uD45C\uB85C \uAD6C\uBD84)",
      description: "Tags input placeholder"
    },
    pm_save: {
      message: "\uC800\uC7A5",
      description: "Save prompt"
    },
    pm_cancel: {
      message: "\uCDE8\uC18C",
      description: "Cancel"
    },
    pm_all_tags: {
      message: "\uBAA8\uB450",
      description: "All tags chip"
    },
    pm_empty: {
      message: "\uD504\uB86C\uD504\uD2B8\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4",
      description: "Empty state"
    },
    pm_copy: {
      message: "\uBCF5\uC0AC",
      description: "Copy prompt"
    },
    pm_copied: {
      message: "\uBCF5\uC0AC\uB428",
      description: "Copied notice"
    },
    pm_delete: {
      message: "\uC0AD\uC81C",
      description: "Delete prompt"
    },
    pm_delete_confirm: {
      message: "\uC774 \uD504\uB86C\uD504\uD2B8\uB97C \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?",
      description: "Delete confirm"
    },
    pm_lock: {
      message: "\uC704\uCE58 \uACE0\uC815",
      description: "Lock panel position"
    },
    pm_unlock: {
      message: "\uC704\uCE58 \uACE0\uC815 \uD574\uC81C",
      description: "Unlock panel position"
    },
    pm_import_invalid: {
      message: "\uC720\uD6A8\uD558\uC9C0 \uC54A\uC740 \uD30C\uC77C \uD615\uC2DD",
      description: "Import invalid"
    },
    pm_import_success: {
      message: "{count}\uAC1C\uC758 \uD504\uB86C\uD504\uD2B8\uB97C \uAC00\uC838\uC654\uC2B5\uB2C8\uB2E4",
      description: "Import success"
    },
    pm_duplicate: {
      message: "\uC911\uBCF5 \uD504\uB86C\uD504\uD2B8",
      description: "Duplicate on add"
    },
    pm_deleted: {
      message: "\uC0AD\uC81C\uB428",
      description: "Deleted notice"
    },
    pm_edit: {
      message: "\uD3B8\uC9D1",
      description: "Edit prompt"
    },
    pm_expand: {
      message: "\uD3BC\uCE58\uAE30",
      description: "Expand prompt text"
    },
    pm_collapse: {
      message: "\uC811\uAE30",
      description: "Collapse prompt text"
    },
    pm_saved: {
      message: "\uC800\uC7A5\uB428",
      description: "Saved notice"
    },
    pm_settings: {
      message: "\uC124\uC815",
      description: "Settings button"
    },
    pm_settings_tooltip: {
      message: "\uD655\uC7A5 \uD504\uB85C\uADF8\uB7A8 \uC124\uC815 \uC5F4\uAE30",
      description: "Settings button tooltip"
    },
    pm_settings_fallback: {
      message: "\uBE0C\uB77C\uC6B0\uC800 \uD234\uBC14\uC758 \uD655\uC7A5 \uD504\uB85C\uADF8\uB7A8 \uC544\uC774\uCF58\uC744 \uD074\uB9AD\uD558\uC5EC \uC124\uC815\uC744 \uC5F4\uC5B4\uC8FC\uC138\uC694",
      description: "Settings open failed message"
    },
    pm_backup: {
      message: "\uB85C\uCEEC \uBC31\uC5C5",
      description: "Local backup button"
    },
    pm_backup_tooltip: {
      message: "\uD504\uB86C\uD504\uD2B8\uC640 \uD3F4\uB354\uB97C \uD0C0\uC784\uC2A4\uD0EC\uD504\uAC00 \uD3EC\uD568\uB41C \uD3F4\uB354\uB85C \uBC31\uC5C5\uD569\uB2C8\uB2E4",
      description: "Backup button tooltip"
    },
    pm_backup_cancelled: {
      message: "\uBC31\uC5C5 \uCDE8\uC18C\uB428",
      description: "Backup cancelled hint"
    },
    pm_backup_error: {
      message: "\u2717 \uBC31\uC5C5 \uC2E4\uD328",
      description: "Backup failed hint"
    },
    pm_backup_hint_options: {
      message: "\uC774 \uAE30\uB2A5\uC740 Gemini \uD398\uC774\uC9C0\uC758 \uD504\uB86C\uD504\uD2B8 \uAD00\uB9AC\uC790\uC5D0 \uD1B5\uD569\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4.",
      description: "Backup hint in options page"
    },
    pm_backup_step1: {
      message: "Gemini \uD398\uC774\uC9C0\uB97C \uC5FD\uB2C8\uB2E4 (gemini.google.com)",
      description: "Backup step 1"
    },
    pm_backup_step2: {
      message: "\uC6B0\uCE21 \uD558\uB2E8\uC758 \uD655\uC7A5 \uD504\uB85C\uADF8\uB7A8 \uC544\uC774\uCF58\uC744 \uD074\uB9AD\uD558\uC5EC \uD504\uB86C\uD504\uD2B8 \uAD00\uB9AC\uC790\uB97C \uC5FD\uB2C8\uB2E4",
      description: "Backup step 2"
    },
    pm_backup_step3: {
      message: '"\u{1F4BE} \uB85C\uCEEC \uBC31\uC5C5" \uBC84\uD2BC\uC744 \uD074\uB9AD\uD558\uACE0 \uBC31\uC5C5 \uD3F4\uB354\uB97C \uC120\uD0DD\uD569\uB2C8\uB2E4',
      description: "Backup step 3"
    },
    pm_backup_note: {
      message: "\uBC31\uC5C5\uC5D0\uB294 \uBAA8\uB4E0 \uD504\uB86C\uD504\uD2B8\uC640 \uD3F4\uB354\uAC00 \uD3EC\uD568\uB418\uBA70, \uD0C0\uC784\uC2A4\uD0EC\uD504 \uD3F4\uB354 \uD615\uC2DD(backup-YYYYMMDD-HHMMSS)\uC73C\uB85C \uC800\uC7A5\uB429\uB2C8\uB2E4",
      description: "Backup feature note"
    },
    extensionVersion: {
      message: "\uBC84\uC804",
      description: "Extension version label"
    },
    newVersionAvailable: {
      message: "\uC0C8 \uBC84\uC804 \uC0AC\uC6A9 \uAC00\uB2A5",
      description: "Update reminder title"
    },
    currentVersionLabel: {
      message: "\uD604\uC7AC",
      description: "Label for current version number"
    },
    latestVersionLabel: {
      message: "\uCD5C\uC2E0",
      description: "Label for latest version number"
    },
    updateNow: {
      message: "\uC5C5\uB370\uC774\uD2B8",
      description: "CTA to update to latest version"
    },
    starProject: {
      message: "\uC9C0\uC6D0\uD558\uAE30 \u2B50",
      description: "Github callout"
    },
    officialDocs: {
      message: "\uACF5\uC2DD \uBB38\uC11C",
      description: "Official docs link"
    },
    exportChatJson: {
      message: "\uB300\uD654 \uAE30\uB85D \uB0B4\uBCF4\uB0B4\uAE30",
      description: "Tooltip for export button"
    },
    folder_title: {
      message: "\uD3F4\uB354",
      description: "Folder section title"
    },
    folder_create: {
      message: "\uD3F4\uB354 \uC0DD\uC131",
      description: "Create folder button tooltip"
    },
    folder_name_prompt: {
      message: "\uD3F4\uB354 \uC774\uB984\uC744 \uC785\uB825\uD558\uC138\uC694:",
      description: "Create folder name prompt"
    },
    folder_rename_prompt: {
      message: "\uC0C8 \uC774\uB984\uC744 \uC785\uB825\uD558\uC138\uC694:",
      description: "Rename folder prompt"
    },
    folder_delete_confirm: {
      message: "\uC774 \uD3F4\uB354\uC640 \uBAA8\uB4E0 \uB0B4\uC6A9\uC744 \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?",
      description: "Delete folder confirmation"
    },
    folder_create_subfolder: {
      message: "\uD558\uC704 \uD3F4\uB354 \uC0DD\uC131",
      description: "Create subfolder menu item"
    },
    folder_rename: {
      message: "\uC774\uB984 \uBC14\uAFB8\uAE30",
      description: "Rename folder menu item"
    },
    folder_change_color: {
      message: "\uC0C9\uC0C1 \uBCC0\uACBD",
      description: "Change folder color menu item"
    },
    folder_delete: {
      message: "\uC0AD\uC81C",
      description: "Delete folder menu item"
    },
    folder_color_default: {
      message: "\uAE30\uBCF8",
      description: "Default folder color name"
    },
    folder_color_red: {
      message: "\uBE68\uAC04\uC0C9",
      description: "Red folder color name"
    },
    folder_color_orange: {
      message: "\uC624\uB80C\uC9C0\uC0C9",
      description: "Orange folder color name"
    },
    folder_color_yellow: {
      message: "\uB178\uB780\uC0C9",
      description: "Yellow folder color name"
    },
    folder_color_green: {
      message: "\uB179\uC0C9",
      description: "Green folder color name"
    },
    folder_color_blue: {
      message: "\uD30C\uB780\uC0C9",
      description: "Blue folder color name"
    },
    folder_color_purple: {
      message: "\uBCF4\uB77C\uC0C9",
      description: "Purple folder color name"
    },
    folder_color_pink: {
      message: "\uBD84\uD64D\uC0C9",
      description: "Pink folder color name"
    },
    folder_color_custom: {
      message: "\uC0AC\uC6A9\uC790 \uC9C0\uC815",
      description: "Custom folder color name"
    },
    folder_empty: {
      message: "\uD3F4\uB354\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4",
      description: "Empty state placeholder when no folders exist"
    },
    folder_pin: {
      message: "\uD3F4\uB354 \uACE0\uC815",
      description: "Pin folder menu item"
    },
    folder_unpin: {
      message: "\uD3F4\uB354 \uACE0\uC815 \uD574\uC81C",
      description: "Unpin folder menu item"
    },
    folder_remove_conversation: {
      message: "\uD3F4\uB354\uC5D0\uC11C \uC81C\uAC70",
      description: "Remove conversation button tooltip"
    },
    folder_remove_conversation_confirm: {
      message: '\uC774 \uD3F4\uB354\uC5D0\uC11C "{title}"\uC744(\uB97C) \uC81C\uAC70\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?',
      description: "Remove conversation confirmation"
    },
    conversation_more: {
      message: "\uCD94\uAC00 \uC635\uC158",
      description: "Conversation more options button tooltip"
    },
    conversation_move_to_folder: {
      message: "\uD3F4\uB354\uB85C \uC774\uB3D9",
      description: "Move conversation to folder menu item"
    },
    conversation_move_to_folder_title: {
      message: "\uD3F4\uB354\uB85C \uC774\uB3D9",
      description: "Move conversation to folder dialog title"
    },
    chatWidth: {
      message: "\uB300\uD654 \uB108\uBE44",
      description: "Chat width adjustment label"
    },
    chatWidthNarrow: {
      message: "\uC881\uAC8C",
      description: "Narrow chat width label"
    },
    chatWidthWide: {
      message: "\uB113\uAC8C",
      description: "Wide chat width label"
    },
    sidebarWidth: {
      message: "\uC0AC\uC774\uB4DC\uBC14 \uB108\uBE44",
      description: "Sidebar width adjustment label"
    },
    sidebarWidthNarrow: {
      message: "\uC881\uAC8C",
      description: "Narrow sidebar width label"
    },
    sidebarWidthWide: {
      message: "\uB113\uAC8C",
      description: "Wide sidebar width label"
    },
    formula_copied: {
      message: "\u2713 \uC218\uC2DD \uBCF5\uC0AC\uB428",
      description: "Formula copied success message"
    },
    formula_copy_failed: {
      message: "\u2717 \uBCF5\uC0AC \uC2E4\uD328",
      description: "Formula copy failed message"
    },
    formulaCopyFormat: {
      message: "\uC218\uC2DD \uBCF5\uC0AC \uD615\uC2DD",
      description: "Formula copy format setting label"
    },
    formulaCopyFormatLatex: {
      message: "LaTeX",
      description: "LaTeX format option"
    },
    formulaCopyFormatUnicodeMath: {
      message: "MathML (Word)",
      description: "Label for MathML formula copy format option (formerly UnicodeMath)"
    },
    formulaCopyFormatHint: {
      message: "\uC218\uC2DD\uC744 \uD074\uB9AD\uD558\uC5EC \uBCF5\uC0AC\uD560 \uB54C \uD615\uC2DD\uC744 \uC120\uD0DD\uD558\uC138\uC694",
      description: "Formula copy format hint"
    },
    formulaCopyFormatNoDollar: {
      message: "LaTeX (\uB2EC\uB7EC \uAE30\uD638 \uC5C6\uC74C)",
      description: "LaTeX format option without dollar signs"
    },
    folder_filter_current_user: {
      message: "\uACC4\uC815 \uBD84\uB9AC",
      description: "Show only conversations from the current Google account"
    },
    folder_export: {
      message: "\uD3F4\uB354 \uB0B4\uBCF4\uB0B4\uAE30",
      description: "Export folders button tooltip"
    },
    folder_import_export: {
      message: "\uD3F4\uB354 \uAC00\uC838\uC624\uAE30/\uB0B4\uBCF4\uB0B4\uAE30",
      description: "Combined import/export button tooltip"
    },
    folder_cloud_upload: {
      message: "\uD074\uB77C\uC6B0\uB4DC\uC5D0 \uC5C5\uB85C\uB4DC",
      description: "Cloud upload button tooltip"
    },
    folder_cloud_sync: {
      message: "\uD074\uB77C\uC6B0\uB4DC\uC5D0\uC11C \uB3D9\uAE30\uD654",
      description: "Cloud sync button tooltip"
    },
    folder_import: {
      message: "\uD3F4\uB354 \uAC00\uC838\uC624\uAE30",
      description: "Import folders button tooltip"
    },
    folder_import_title: {
      message: "\uD3F4\uB354 \uAD6C\uC131 \uAC00\uC838\uC624\uAE30",
      description: "Import dialog title"
    },
    folder_import_strategy: {
      message: "\uAC00\uC838\uC624\uAE30 \uC804\uB7B5:",
      description: "Import strategy label"
    },
    folder_import_merge: {
      message: "\uAE30\uC874 \uD3F4\uB354\uC640 \uBCD1\uD569",
      description: "Merge import strategy"
    },
    folder_import_overwrite: {
      message: "\uAE30\uC874 \uD3F4\uB354 \uB36E\uC5B4\uC4F0\uAE30",
      description: "Overwrite import strategy"
    },
    folder_import_select_file: {
      message: "\uAC00\uC838\uC62C JSON \uD30C\uC77C\uC744 \uC120\uD0DD\uD558\uC138\uC694",
      description: "Import file selection prompt"
    },
    folder_import_success: {
      message: "\u2713 {folders}\uAC1C\uC758 \uD3F4\uB354, {conversations}\uAC1C\uC758 \uB300\uD654\uB97C \uAC00\uC838\uC654\uC2B5\uB2C8\uB2E4",
      description: "Import success message"
    },
    folder_import_success_skipped: {
      message: "\u2713 {folders}\uAC1C\uC758 \uD3F4\uB354, {conversations}\uAC1C\uC758 \uB300\uD654\uB97C \uAC00\uC838\uC654\uC2B5\uB2C8\uB2E4 ({skipped}\uAC1C\uC758 \uC911\uBCF5 \uD56D\uBAA9 \uAC74\uB108\uB700)",
      description: "Import success with skipped message"
    },
    folder_import_error: {
      message: "\u2717 \uAC00\uC838\uC624\uAE30 \uC2E4\uD328: {error}",
      description: "Import error message"
    },
    folder_export_success: {
      message: "\u2713 \uD3F4\uB354\uB97C \uC131\uACF5\uC801\uC73C\uB85C \uB0B4\uBCF4\uB0C8\uC2B5\uB2C8\uB2E4",
      description: "Export success message"
    },
    folder_import_invalid_format: {
      message: "\uC720\uD6A8\uD558\uC9C0 \uC54A\uC740 \uD30C\uC77C \uD615\uC2DD\uC785\uB2C8\uB2E4. \uC62C\uBC14\uB978 \uD3F4\uB354 \uAD6C\uC131 \uD30C\uC77C\uC744 \uC120\uD0DD\uD558\uC138\uC694.",
      description: "Invalid format error"
    },
    folder_import_confirm_overwrite: {
      message: "\uBAA8\uB4E0 \uAE30\uC874 \uD3F4\uB354\uAC00 \uB300\uCCB4\uB429\uB2C8\uB2E4. \uBC31\uC5C5\uC774 \uC0DD\uC131\uB429\uB2C8\uB2E4. \uACC4\uC18D\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?",
      description: "Overwrite confirmation"
    },
    export_dialog_title: {
      message: "\uB300\uD654 \uB0B4\uBCF4\uB0B4\uAE30",
      description: "Export dialog title"
    },
    export_dialog_select: {
      message: "\uB0B4\uBCF4\uB0B4\uAE30 \uD615\uC2DD \uC120\uD0DD:",
      description: "Export format selection label"
    },
    export_dialog_warning: {
      message: "\u26A0\uFE0F \uB0B4\uBCF4\uB0B4\uAE30\uB97C \uD074\uB9AD\uD558\uBA74 \uBAA8\uB4E0 \uB0B4\uC6A9\uC744 \uBD88\uB7EC\uC624\uAE30 \uC704\uD574 \uCCAB \uBC88\uC9F8 \uBA54\uC2DC\uC9C0\uB85C \uC790\uB3D9 \uC774\uB3D9\uD569\uB2C8\uB2E4. \uC774\uB3D9 \uC911\uC5D0\uB294 \uC870\uC791\uD558\uC9C0 \uB9C8\uC2ED\uC2DC\uC624. \uC774\uB3D9\uC774 \uC644\uB8CC\uB418\uBA74 \uB0B4\uBCF4\uB0B4\uAE30\uAC00 \uC790\uB3D9\uC73C\uB85C \uACC4\uC18D\uB429\uB2C8\uB2E4.",
      description: "Warning about auto-jump and loading completeness"
    },
    export_dialog_safari_cmdp_hint: {
      message: "Safari \uD301: \uC544\uB798 '\uB0B4\uBCF4\uB0B4\uAE30'\uB97C \uD074\uB9AD\uD558\uACE0 \uC7A0\uC2DC \uAE30\uB2E4\uB9B0 \uB2E4\uC74C, \u2318P\uB97C \uB204\uB974\uACE0 'PDF\uB85C \uC800\uC7A5'\uC744 \uC120\uD0DD\uD558\uC138\uC694.",
      description: "Safari-specific hint for PDF export"
    },
    export_toast_safari_pdf_ready: {
      message: "\uC774\uC81C Command + P\uB97C \uB20C\uB7EC PDF\uB97C \uB0B4\uBCF4\uB0BC \uC218 \uC788\uC2B5\uB2C8\uB2E4.",
      description: "Safari-specific toast shown after PDF export is prepared"
    },
    export_dialog_safari_markdown_hint: {
      message: "\uC548\uB0B4: Safari \uC81C\uD55C\uC73C\uB85C \uC778\uD574 \uCC44\uD305 \uAE30\uB85D\uC758 \uC774\uBBF8\uC9C0\uB97C \uCD94\uCD9C\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uC804\uCCB4 \uB0B4\uBCF4\uB0B4\uAE30\uAC00 \uD544\uC694\uD558\uBA74 PDF \uB0B4\uBCF4\uB0B4\uAE30\uB97C \uC0AC\uC6A9\uD558\uC138\uC694.",
      description: "Warning about image references in Safari markdown export"
    },
    export_format_json_description: {
      message: "\uAC1C\uBC1C\uC790\uB97C \uC704\uD55C \uAE30\uACC4 \uD310\uB3C5 \uAC00\uB2A5 \uD615\uC2DD",
      description: "Description for JSON export format"
    },
    export_format_markdown_description: {
      message: "\uAE68\uB057\uD558\uACE0 \uC774\uC2DD \uAC00\uB2A5\uD55C \uD14D\uC2A4\uD2B8 \uD615\uC2DD (\uAD8C\uC7A5)",
      description: "Description for Markdown export format"
    },
    export_format_pdf_description: {
      message: "PDF\uB85C \uC800\uC7A5\uC744 \uD1B5\uD55C \uC778\uC1C4 \uCE5C\uD654\uC801 \uD615\uC2DD",
      description: "Description for PDF export format"
    },
    editInputWidth: {
      message: "\uD3B8\uC9D1 \uC785\uB825\uCC3D \uB108\uBE44",
      description: "Edit input width adjustment label"
    },
    editInputWidthNarrow: {
      message: "\uC881\uAC8C",
      description: "Narrow edit input width label"
    },
    editInputWidthWide: {
      message: "\uB113\uAC8C",
      description: "Wide edit input width label"
    },
    timelineOptions: {
      message: "\uD0C0\uC784\uB77C\uC778 \uC635\uC158",
      description: "Timeline options section label"
    },
    folderOptions: {
      message: "\uD3F4\uB354 \uC635\uC158",
      description: "Folder options section label"
    },
    enableFolderFeature: {
      message: "\uD3F4\uB354 \uAE30\uB2A5 \uD65C\uC131\uD654",
      description: "Enable or disable the folder feature"
    },
    hideArchivedConversations: {
      message: "\uBCF4\uAD00\uB41C \uB300\uD654 \uC228\uAE30\uAE30",
      description: "Hide conversations that are in folders from the main list"
    },
    conversation_star: {
      message: "\uB300\uD654 \uBCC4\uD45C \uD45C\uC2DC",
      description: "Star conversation button tooltip"
    },
    conversation_unstar: {
      message: "\uB300\uD654 \uBCC4\uD45C \uD574\uC81C",
      description: "Unstar conversation button tooltip"
    },
    conversation_untitled: {
      message: "\uC81C\uBAA9 \uC5C6\uC74C",
      description: "Fallback title for conversations without a name"
    },
    geminiOnlyNotice: {
      message: "\uAE30\uBCF8\uC801\uC73C\uB85C Gemini (Enterprise \uD3EC\uD568) \uBC0F AI Studio\uC5D0\uC11C \uC2E4\uD589\uB429\uB2C8\uB2E4. \uB2E4\uB978 \uC0AC\uC774\uD2B8\uC5D0\uC11C \uD504\uB86C\uD504\uD2B8 \uAD00\uB9AC\uC790\uB97C \uD65C\uC131\uD654\uD558\uB824\uBA74 \uC544\uB798\uC5D0 \uCD94\uAC00\uD558\uC138\uC694.",
      description: "Notice that defaults are limited to Gemini/AI Studio"
    },
    folderManager_dataLossWarning: {
      message: "\u26A0\uFE0F \uACBD\uACE0: \uD3F4\uB354 \uB370\uC774\uD130\uB97C \uB85C\uB4DC\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uD3F4\uB354\uAC00 \uC190\uC0C1\uB418\uC5C8\uC744 \uC218 \uC788\uC2B5\uB2C8\uB2E4. \uBE0C\uB77C\uC6B0\uC800 \uCF58\uC194\uC5D0\uC11C \uC790\uC138\uD55C \uB0B4\uC6A9\uC744 \uD655\uC778\uD558\uACE0 \uAC00\uB2A5\uD55C \uACBD\uC6B0 \uBC31\uC5C5\uC5D0\uC11C \uBCF5\uC6D0\uC744 \uC2DC\uB3C4\uD558\uC2ED\uC2DC\uC624.",
      description: "Warning shown when folder data fails to load"
    },
    backupOptions: {
      message: "\uC790\uB3D9 \uBC31\uC5C5",
      description: "Backup options section label"
    },
    backupEnabled: {
      message: "\uC790\uB3D9 \uBC31\uC5C5 \uD65C\uC131\uD654",
      description: "Enable auto backup toggle"
    },
    backupNow: {
      message: "\uC9C0\uAE08 \uBC31\uC5C5",
      description: "Backup now button"
    },
    backupSelectFolder: {
      message: "\uBC31\uC5C5 \uD3F4\uB354 \uC120\uD0DD",
      description: "Select backup folder button"
    },
    backupFolderSelected: {
      message: "\uBC31\uC5C5 \uD3F4\uB354: {folder}",
      description: "Shows selected backup folder"
    },
    backupIncludePrompts: {
      message: "\uD504\uB86C\uD504\uD2B8 \uD3EC\uD568",
      description: "Include prompts in backup toggle"
    },
    backupIncludeFolders: {
      message: "\uD3F4\uB354 \uD3EC\uD568",
      description: "Include folders in backup toggle"
    },
    backupIntervalLabel: {
      message: "\uBC31\uC5C5 \uAC04\uACA9",
      description: "Backup interval label"
    },
    backupIntervalManual: {
      message: "\uC218\uB3D9 \uC804\uC6A9",
      description: "Manual backup mode"
    },
    backupIntervalDaily: {
      message: "\uB9E4\uC77C",
      description: "Daily backup interval"
    },
    backupIntervalWeekly: {
      message: "\uB9E4\uC8FC (7\uC77C)",
      description: "Weekly backup interval"
    },
    backupLastBackup: {
      message: "\uB9C8\uC9C0\uB9C9 \uBC31\uC5C5: {time}",
      description: "Last backup timestamp"
    },
    backupNever: {
      message: "\uC548 \uD568",
      description: "Never backed up"
    },
    backupSuccess: {
      message: "\u2713 \uBC31\uC5C5 \uC0DD\uC131\uB428: {prompts}\uAC1C\uC758 \uD504\uB86C\uD504\uD2B8, {folders}\uAC1C\uC758 \uD3F4\uB354, {conversations}\uAC1C\uC758 \uB300\uD654",
      description: "Backup success message"
    },
    backupError: {
      message: "\u2717 \uBC31\uC5C5 \uC2E4\uD328: {error}",
      description: "Backup error message"
    },
    backupNotSupported: {
      message: "\u26A0\uFE0F \uC790\uB3D9 \uBC31\uC5C5\uC5D0\uB294 File System Access API\uB97C \uC9C0\uC6D0\uD558\uB294 \uCD5C\uC2E0 \uBE0C\uB77C\uC6B0\uC800\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4",
      description: "Browser not supported message"
    },
    backupSelectFolderFirst: {
      message: "\uBA3C\uC800 \uBC31\uC5C5 \uD3F4\uB354\uB97C \uC120\uD0DD\uD558\uC138\uC694",
      description: "No folder selected warning"
    },
    backupUserCancelled: {
      message: "\uBC31\uC5C5 \uCDE8\uC18C\uB428",
      description: "User cancelled folder selection"
    },
    backupConfigSaved: {
      message: "\u2713 \uBC31\uC5C5 \uC124\uC815 \uC800\uC7A5\uB428",
      description: "Config saved message"
    },
    backupPermissionDenied: {
      message: "\u26A0\uFE0F \uC774 \uB514\uB809\uD1A0\uB9AC\uC5D0 \uC561\uC138\uC2A4\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uB2E4\uB978 \uC704\uCE58\uB97C \uC120\uD0DD\uD558\uC138\uC694 (\uC608: \uBB38\uC11C, \uB2E4\uC6B4\uB85C\uB4DC \uB610\uB294 \uBC14\uD0D5 \uD654\uBA74\uC758 \uD3F4\uB354)",
      description: "Permission denied for restricted directory"
    },
    backupConfigureInOptions: {
      message: "\uBC31\uC5C5 \uAD6C\uC131\uC5D0\uB294 \uC635\uC158 \uD398\uC774\uC9C0\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4. \uC544\uB798 \uBC84\uD2BC\uC744 \uD074\uB9AD\uD558\uC5EC \uC5EC\uC138\uC694 (\uD655\uC7A5 \uD504\uB85C\uADF8\uB7A8 \uC544\uC774\uCF58 \uC606\uC758 \uC138 \uAC1C\uC758 \uC810 \uD074\uB9AD \u2192 \uC635\uC158).",
      description: "Backup configure in options page explanation"
    },
    openOptionsPage: {
      message: "\uC635\uC158 \uD398\uC774\uC9C0 \uC5F4\uAE30",
      description: "Open options page button"
    },
    optionsPageSubtitle: {
      message: "\uD655\uC7A5 \uD504\uB85C\uADF8\uB7A8 \uC635\uC158",
      description: "Options page subtitle"
    },
    optionsComingSoon: {
      message: "\uB354 \uB9CE\uC740 \uC635\uC158\uC774 \uACE7 \uCD94\uAC00\uB420 \uC608\uC815\uC785\uB2C8\uB2E4...",
      description: "Options page placeholder text"
    },
    backupDataAccessNotice: {
      message: "\uB370\uC774\uD130 \uC561\uC138\uC2A4 \uC81C\uD55C",
      description: "Backup data access limitation title"
    },
    backupDataAccessHint: {
      message: "\uBE0C\uB77C\uC6B0\uC800 \uBCF4\uC548 \uC81C\uD55C\uC73C\uB85C \uC778\uD574, \uC774 \uC635\uC158 \uD398\uC774\uC9C0\uB294 Gemini \uD398\uC774\uC9C0\uC758 \uD504\uB86C\uD504\uD2B8 \uBC0F \uD3F4\uB354 \uB370\uC774\uD130\uC5D0 \uC9C1\uC811 \uC561\uC138\uC2A4\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uC218\uB3D9 \uBC31\uC5C5\uC740 Gemini \uD398\uC774\uC9C0\uC758 \uD504\uB86C\uD504\uD2B8 \uAD00\uB9AC\uC790 \uBC0F \uD3F4\uB354 \uB0B4\uBCF4\uB0B4\uAE30 \uAE30\uB2A5\uC744 \uC0AC\uC6A9\uD558\uC2ED\uC2DC\uC624.",
      description: "Backup data access limitation explanation"
    },
    promptManagerOptions: {
      message: "\uD504\uB86C\uD504\uD2B8 \uAD00\uB9AC\uC790",
      description: "Prompt Manager options section label"
    },
    hidePromptManager: {
      message: "\uD504\uB86C\uD504\uD2B8 \uAD00\uB9AC\uC790 \uC228\uAE30\uAE30",
      description: "Hide the prompt manager floating ball"
    },
    hidePromptManagerHint: {
      message: "\uD398\uC774\uC9C0\uC758 \uD504\uB86C\uD504\uD2B8 \uAD00\uB9AC\uC790 \uD50C\uB85C\uD305 \uBCFC\uC744 \uC228\uAE41\uB2C8\uB2E4",
      description: "Hint for hiding prompt manager feature"
    },
    customWebsites: {
      message: "\uC0AC\uC6A9\uC790 \uC9C0\uC815 \uC6F9\uC0AC\uC774\uD2B8",
      description: "Custom websites for prompt manager"
    },
    customWebsitesPlaceholder: {
      message: "\uC6F9\uC0AC\uC774\uD2B8 URL \uC785\uB825 (\uC608: chatgpt.com)",
      description: "Custom websites input placeholder"
    },
    customWebsitesHint: {
      message: "\uD504\uB86C\uD504\uD2B8 \uAD00\uB9AC\uC790\uB97C \uC0AC\uC6A9\uD560 \uC6F9\uC0AC\uC774\uD2B8\uB97C \uCD94\uAC00\uD558\uC138\uC694. \uC774 \uC0AC\uC774\uD2B8\uB4E4\uC5D0\uC11C\uB294 \uD504\uB86C\uD504\uD2B8 \uAD00\uB9AC\uC790\uB9CC \uD65C\uC131\uD654\uB429\uB2C8\uB2E4.",
      description: "Custom websites hint"
    },
    addWebsite: {
      message: "\uC6F9\uC0AC\uC774\uD2B8 \uCD94\uAC00",
      description: "Add website button"
    },
    removeWebsite: {
      message: "\uC81C\uAC70",
      description: "Remove website button"
    },
    invalidUrl: {
      message: "\uC720\uD6A8\uD558\uC9C0 \uC54A\uC740 URL \uD615\uC2DD",
      description: "Invalid URL error message"
    },
    websiteAdded: {
      message: "\uC6F9\uC0AC\uC774\uD2B8 \uCD94\uAC00\uB428",
      description: "Website added success message"
    },
    websiteRemoved: {
      message: "\uC6F9\uC0AC\uC774\uD2B8 \uC81C\uAC70\uB428",
      description: "Website removed success message"
    },
    permissionDenied: {
      message: "\uAD8C\uD55C\uC774 \uAC70\uBD80\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uC774 \uC6F9\uC0AC\uC774\uD2B8\uC5D0 \uB300\uD55C \uC561\uC138\uC2A4\uB97C \uD5C8\uC6A9\uD558\uC138\uC694.",
      description: "Permission denied error message"
    },
    permissionRequestFailed: {
      message: "\uAD8C\uD55C \uC694\uCCAD\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uAC70\uB098 \uD655\uC7A5 \uD504\uB85C\uADF8\uB7A8 \uC124\uC815\uC5D0\uC11C \uC561\uC138\uC2A4 \uAD8C\uD55C\uC744 \uBD80\uC5EC\uD558\uC138\uC694.",
      description: "Permission request failure message"
    },
    customWebsitesNote: {
      message: "\uD301: \uC0AC\uC774\uD2B8\uB97C \uCD94\uAC00\uD560 \uB54C \uC561\uC138\uC2A4 \uD5C8\uC6A9 \uC694\uCCAD\uC744 \uBC1B\uAC8C \uB429\uB2C8\uB2E4. \uAD8C\uD55C \uBD80\uC5EC \uD6C4 \uC0AC\uC774\uD2B8\uB97C \uC0C8\uB85C \uACE0\uCE68\uD558\uBA74 \uD504\uB86C\uD504\uD2B8 \uAD00\uB9AC\uC790\uAC00 \uC2DC\uC791\uB429\uB2C8\uB2E4.",
      description: "Custom websites reload/permission note"
    },
    starredHistory: {
      message: "\uBCC4\uD45C \uD45C\uC2DC\uB41C \uAE30\uB85D",
      description: "Starred history title"
    },
    viewStarredHistory: {
      message: "\uBCC4\uD45C \uD45C\uC2DC\uB41C \uAE30\uB85D \uBCF4\uAE30",
      description: "View starred history button"
    },
    noStarredMessages: {
      message: "\uBCC4\uD45C \uD45C\uC2DC\uB41C \uBA54\uC2DC\uC9C0\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4",
      description: "No starred messages placeholder"
    },
    removeFromStarred: {
      message: "\uBCC4\uD45C \uC81C\uAC70",
      description: "Remove from starred tooltip"
    },
    justNow: {
      message: "\uBC29\uAE08 \uC804",
      description: "Just now time label"
    },
    hoursAgo: {
      message: "\uC2DC\uAC04 \uC804",
      description: "Hours ago label"
    },
    yesterday: {
      message: "\uC5B4\uC81C",
      description: "Yesterday date label"
    },
    daysAgo: {
      message: "\uC77C \uC804",
      description: "Days ago label"
    },
    loading: {
      message: "\uB85C\uB4DC \uC911...",
      description: "Loading message"
    },
    keyboardShortcuts: {
      message: "\uD0A4\uBCF4\uB4DC \uB2E8\uCD95\uD0A4",
      description: "Keyboard shortcuts section title"
    },
    enableShortcuts: {
      message: "\uD0A4\uBCF4\uB4DC \uB2E8\uCD95\uD0A4 \uD65C\uC131\uD654",
      description: "Enable shortcuts toggle label"
    },
    previousNode: {
      message: "\uC774\uC804 \uB178\uB4DC",
      description: "Previous timeline node shortcut label"
    },
    nextNode: {
      message: "\uB2E4\uC74C \uB178\uB4DC",
      description: "Next timeline node shortcut label"
    },
    shortcutKey: {
      message: "\uD0A4",
      description: "Shortcut key label"
    },
    shortcutModifiers: {
      message: "\uC218\uC815 \uD0A4",
      description: "Shortcut modifiers label"
    },
    resetShortcuts: {
      message: "\uAE30\uBCF8\uAC12\uC73C\uB85C \uCD08\uAE30\uD654",
      description: "Reset shortcuts button"
    },
    shortcutsResetSuccess: {
      message: "\uB2E8\uCD95\uD0A4\uAC00 \uAE30\uBCF8\uAC12\uC73C\uB85C \uCD08\uAE30\uD654\uB418\uC5C8\uC2B5\uB2C8\uB2E4",
      description: "Shortcuts reset success message"
    },
    shortcutsDescription: {
      message: "\uD0A4\uBCF4\uB4DC \uB2E8\uCD95\uD0A4\uB97C \uC0AC\uC6A9\uD558\uC5EC \uD0C0\uC784\uB77C\uC778 \uB178\uB4DC\uB97C \uD0D0\uC0C9\uD569\uB2C8\uB2E4",
      description: "Shortcuts description"
    },
    modifierNone: {
      message: "\uC5C6\uC74C",
      description: "No modifier key"
    },
    modifierAlt: {
      message: "Alt",
      description: "Alt modifier key"
    },
    modifierCtrl: {
      message: "Ctrl",
      description: "Ctrl modifier key"
    },
    modifierShift: {
      message: "Shift",
      description: "Shift modifier key"
    },
    modifierMeta: {
      message: "Cmd/Win",
      description: "Meta/Command/Windows modifier key"
    },
    cloudSync: {
      message: "\uD074\uB77C\uC6B0\uB4DC \uB3D9\uAE30\uD654",
      description: "Cloud sync section title"
    },
    cloudSyncDescription: {
      message: "\uD3F4\uB354\uC640 \uD504\uB86C\uD504\uD2B8\uB97C Google Drive\uC5D0 \uB3D9\uAE30\uD654\uD569\uB2C8\uB2E4",
      description: "Cloud sync description"
    },
    syncModeDisabled: {
      message: "\uBE44\uD65C\uC131\uD654",
      description: "Sync mode disabled option"
    },
    syncModeManual: {
      message: "\uC218\uB3D9",
      description: "Sync mode manual option"
    },
    syncServerPort: {
      message: "\uC11C\uBC84 \uD3EC\uD2B8",
      description: "Port number for the sync server"
    },
    syncNow: {
      message: "\uC9C0\uAE08 \uB3D9\uAE30\uD654",
      description: "Sync now button"
    },
    lastSynced: {
      message: "\uB9C8\uC9C0\uB9C9 \uB3D9\uAE30\uD654: {time}",
      description: "Last sync timestamp"
    },
    neverSynced: {
      message: "\uB3D9\uAE30\uD654\uB41C \uC801 \uC5C6\uC74C",
      description: "Never synced message"
    },
    lastUploaded: {
      message: "\uC5C5\uB85C\uB4DC\uB428: {time}",
      description: "Last upload timestamp"
    },
    neverUploaded: {
      message: "\uC5C5\uB85C\uB4DC\uB41C \uC801 \uC5C6\uC74C",
      description: "Never uploaded message"
    },
    syncSuccess: {
      message: "\u2713 \uC131\uACF5\uC801\uC73C\uB85C \uB3D9\uAE30\uD654\uB418\uC5C8\uC2B5\uB2C8\uB2E4",
      description: "Sync success message"
    },
    syncError: {
      message: "\u2717 \uB3D9\uAE30\uD654 \uC2E4\uD328: {error}",
      description: "Sync error message"
    },
    syncInProgress: {
      message: "\uB3D9\uAE30\uD654 \uC911...",
      description: "Sync in progress message"
    },
    uploadInProgress: {
      message: "Uploading...",
      description: "Upload in progress message"
    },
    uploadSuccess: {
      message: "\u2713 Uploaded successfully",
      description: "Upload success message"
    },
    downloadInProgress: {
      message: "Downloading...",
      description: "Download in progress message"
    },
    downloadMergeSuccess: {
      message: "\u2713 Downloaded and merged",
      description: "Download and merge success message"
    },
    syncUpload: {
      message: "\uC5C5\uB85C\uB4DC",
      description: "Upload button label"
    },
    syncMerge: {
      message: "\uB2E4\uC6B4\uB85C\uB4DC \uBC0F \uBCD1\uD569",
      description: "Merge button label"
    },
    syncMode: {
      message: "\uB3D9\uAE30\uD654 \uBAA8\uB4DC",
      description: "Sync mode label"
    },
    minutesAgo: {
      message: "\uBD84 \uC804",
      description: "Minutes ago label"
    },
    syncNoData: {
      message: "Drive\uC5D0\uC11C \uB3D9\uAE30\uD654 \uB370\uC774\uD130\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4",
      description: "Error message when no data is found in Drive"
    },
    syncUploadFailed: {
      message: "\uC5C5\uB85C\uB4DC \uC2E4\uD328",
      description: "Error message when upload fails"
    },
    syncDownloadFailed: {
      message: "\uB2E4\uC6B4\uB85C\uB4DC \uC2E4\uD328",
      description: "Error message when download fails"
    },
    syncAuthFailed: {
      message: "\uC778\uC99D \uC2E4\uD328",
      description: "Error message when authentication fails"
    },
    signOut: {
      message: "\uB85C\uADF8\uC544\uC6C3",
      description: "Sign out button"
    },
    signInWithGoogle: {
      message: "Google \uACC4\uC815\uC73C\uB85C \uB85C\uADF8\uC778",
      description: "Sign in with Google button"
    },
    nanobananaOptions: {
      message: "NanoBanana \uC635\uC158",
      description: "NanoBanana options section label"
    },
    enableNanobananaWatermarkRemover: {
      message: "NanoBanana \uC6CC\uD130\uB9C8\uD06C \uC81C\uAC70",
      description: "Enable automatic watermark removal for NanoBanana images"
    },
    nanobananaWatermarkRemoverHint: {
      message: "\uC0DD\uC131\uB41C \uC774\uBBF8\uC9C0\uC5D0\uC11C \uAC00\uC2DC\uC801\uC778 Gemini \uC6CC\uD130\uB9C8\uD06C\uB97C \uC790\uB3D9\uC73C\uB85C \uC81C\uAC70\uD569\uB2C8\uB2E4",
      description: "Watermark remover feature hint"
    },
    nanobananaDownloadTooltip: {
      message: "\uC6CC\uD130\uB9C8\uD06C \uC5C6\uB294 \uC774\uBBF8\uC9C0 \uB2E4\uC6B4\uB85C\uB4DC (NanoBanana)",
      description: "Download button tooltip"
    },
    deepResearchDownload: {
      message: "\uC0DD\uAC01 \uB0B4\uC6A9 \uB2E4\uC6B4\uB85C\uB4DC",
      description: "Deep Research download button text"
    },
    deepResearchDownloadTooltip: {
      message: "\uC0DD\uAC01 \uB0B4\uC6A9\uC744 Markdown\uC73C\uB85C \uB2E4\uC6B4\uB85C\uB4DC",
      description: "Deep Research download button tooltip"
    },
    folder_uncategorized: {
      message: "\uBBF8\uBD84\uB958",
      description: "Label for root-level conversations not in any folder"
    },
    timelineLevelTitle: {
      message: "\uB178\uB4DC \uB808\uBCA8",
      description: "Title for timeline node level context menu"
    },
    timelineLevel1: {
      message: "\uB808\uBCA8 1",
      description: "Timeline node level 1 option"
    },
    timelineLevel2: {
      message: "\uB808\uBCA8 2",
      description: "Timeline node level 2 option"
    },
    timelineLevel3: {
      message: "\uB808\uBCA8 3",
      description: "Timeline node level 3 option"
    },
    timelineCollapse: {
      message: "\uC811\uAE30",
      description: "Collapse children"
    },
    timelineExpand: {
      message: "\uD3BC\uCE58\uAE30",
      description: "Expand children"
    },
    timelinePreviewSearch: {
      message: "\uAC80\uC0C9...",
      description: "Timeline preview panel search placeholder"
    },
    timelinePreviewNoResults: {
      message: "\uACB0\uACFC \uC5C6\uC74C",
      description: "Timeline preview panel no search results"
    },
    timelinePreviewNoMessages: {
      message: "\uBA54\uC2DC\uC9C0 \uC5C6\uC74C",
      description: "Timeline preview panel no messages"
    },
    quoteReply: {
      message: "\uC778\uC6A9 \uB2F5\uC7A5",
      description: "Quote reply button text"
    },
    inputCollapseOptions: {
      message: "\uC785\uB825 \uC635\uC158",
      description: "Input options section label"
    },
    enableInputCollapse: {
      message: "\uC785\uB825\uCC3D \uC811\uAE30 \uD65C\uC131\uD654",
      description: "Enable input collapse toggle label"
    },
    enableInputCollapseHint: {
      message: "\uC785\uB825\uCC3D\uC774 \uBE44\uC5B4 \uC788\uC744 \uB54C \uC811\uC5B4\uC11C \uB354 \uB9CE\uC740 \uC77D\uAE30 \uACF5\uAC04\uC744 \uD655\uBCF4\uD569\uB2C8\uB2E4",
      description: "Input collapse feature hint"
    },
    inputCollapsePlaceholder: {
      message: "Gemini\uC5D0\uAC8C \uBA54\uC2DC\uC9C0 \uBCF4\uB0B4\uAE30",
      description: "Placeholder text shown in collapsed input"
    },
    ctrlEnterSend: {
      message: "Ctrl+Enter\uB85C \uC804\uC1A1",
      description: "Ctrl+Enter to send toggle label"
    },
    ctrlEnterSendHint: {
      message: "Ctrl+Enter\uB97C \uB20C\uB7EC \uBA54\uC2DC\uC9C0\uB97C \uC804\uC1A1\uD558\uACE0, Enter\uB85C \uC904\uBC14\uAFC8\uC744 \uD569\uB2C8\uB2E4",
      description: "Ctrl+Enter to send feature hint"
    },
    batch_delete_confirm: {
      message: "{count}\uAC1C\uC758 \uB300\uD654\uB97C \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C? \uC774 \uC791\uC5C5\uC740 \uB418\uB3CC\uB9B4 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.",
      description: "Batch delete confirmation message"
    },
    batch_delete_in_progress: {
      message: "\uC0AD\uC81C \uC911... ({current}/{total})",
      description: "Batch delete progress message"
    },
    batch_delete_success: {
      message: "\u2713 {count}\uAC1C\uC758 \uB300\uD654\uB97C \uC0AD\uC81C\uD588\uC2B5\uB2C8\uB2E4",
      description: "Batch delete success message"
    },
    batch_delete_partial: {
      message: "\uC0AD\uC81C \uC644\uB8CC: {success}\uAC1C \uC131\uACF5, {failed}\uAC1C \uC2E4\uD328",
      description: "Batch delete partial success message"
    },
    batch_delete_limit_reached: {
      message: "\uD55C \uBC88\uC5D0 \uCD5C\uB300 {max}\uAC1C\uC758 \uB300\uD654\uB9CC \uC120\uD0DD\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4",
      description: "Batch delete limit warning"
    },
    batch_delete_button: {
      message: "\uC120\uD0DD\uD55C \uD56D\uBAA9 \uC0AD\uC81C",
      description: "Batch delete button tooltip in multi-select mode"
    },
    batch_delete_match_patterns: {
      message: "delete,confirm,yes,ok,remove,\uC0AD\uC81C,\uD655\uC778,\uC608,\uD655\uC778,\uC81C\uAC70",
      description: "Comma-separated list of keywords to match native delete/confirm buttons (case-insensitive)"
    },
    generalOptions: {
      message: "\uC77C\uBC18 \uC635\uC158",
      description: "General options section label"
    },
    enableTabTitleUpdate: {
      message: "\uD0ED \uC81C\uBAA9\uC744 \uB300\uD654\uC640 \uB3D9\uAE30\uD654",
      description: "Enable tab title sync toggle label"
    },
    enableTabTitleUpdateHint: {
      message: "\uBE0C\uB77C\uC6B0\uC800 \uD0ED \uC81C\uBAA9\uC744 \uD604\uC7AC \uB300\uD654 \uC81C\uBAA9\uACFC \uC77C\uCE58\uD558\uB3C4\uB85D \uC790\uB3D9\uC73C\uB85C \uC5C5\uB370\uC774\uD2B8\uD569\uB2C8\uB2E4",
      description: "Tab title sync feature hint"
    },
    enableMermaidRendering: {
      message: "Mermaid \uB2E4\uC774\uC5B4\uADF8\uB7A8 \uB80C\uB354\uB9C1 \uD65C\uC131\uD654",
      description: "Enable Mermaid diagram rendering toggle label"
    },
    enableMermaidRenderingHint: {
      message: "\uCF54\uB4DC \uBE14\uB85D\uC5D0\uC11C Mermaid \uB2E4\uC774\uC5B4\uADF8\uB7A8\uC744 \uC790\uB3D9\uC73C\uB85C \uB80C\uB354\uB9C1\uD569\uB2C8\uB2E4",
      description: "Mermaid rendering feature hint"
    },
    enableQuoteReply: {
      message: "\uC778\uC6A9 \uB2F5\uC7A5 \uD65C\uC131\uD654",
      description: "Enable quote reply toggle label"
    },
    enableQuoteReplyHint: {
      message: "\uB300\uD654\uC5D0\uC11C \uD14D\uC2A4\uD2B8\uB97C \uC120\uD0DD\uD560 \uB54C \uC120\uD0DD\uD55C \uD14D\uC2A4\uD2B8\uB97C \uC778\uC6A9\uD560 \uC218 \uC788\uB294 \uD50C\uB85C\uD305 \uBC84\uD2BC\uC744 \uD45C\uC2DC\uD569\uB2C8\uB2E4",
      description: "Quote reply feature hint"
    },
    contextSync: {
      message: "\uCEE8\uD14D\uC2A4\uD2B8 \uB3D9\uAE30\uD654",
      description: "Context Sync title"
    },
    contextSyncDescription: {
      message: "\uB300\uD654 \uCEE8\uD14D\uC2A4\uD2B8\uB97C \uB85C\uCEEC IDE\uC640 \uB3D9\uAE30\uD654\uD569\uB2C8\uB2E4",
      description: "Context Sync description"
    },
    syncToIDE: {
      message: "IDE\uB85C \uB3D9\uAE30\uD654",
      description: "Sync to IDE button"
    },
    ideOnline: {
      message: "IDE \uC628\uB77C\uC778",
      description: "IDE Online status"
    },
    ideOffline: {
      message: "IDE \uC624\uD504\uB77C\uC778",
      description: "IDE Offline status"
    },
    syncing: {
      message: "\uB3D9\uAE30\uD654 \uC911...",
      description: "Syncing status"
    },
    checkServer: {
      message: "VS Code\uC5D0\uC11C AI Sync \uC11C\uBC84\uB97C \uC2DC\uC791\uD574 \uC8FC\uC138\uC694",
      description: "Check server hint"
    },
    capturing: {
      message: "\uB300\uD654 \uCEA1\uCC98 \uC911...",
      description: "Capturing status"
    },
    syncedSuccess: {
      message: "\uC131\uACF5\uC801\uC73C\uB85C \uB3D9\uAE30\uD654\uB418\uC5C8\uC2B5\uB2C8\uB2E4!",
      description: "Synced success message"
    },
    downloadingOriginal: {
      message: "\uC6D0\uBCF8 \uC774\uBBF8\uC9C0 \uB2E4\uC6B4\uB85C\uB4DC \uC911",
      description: "Status when downloading original image"
    },
    downloadingOriginalLarge: {
      message: "\uC6D0\uBCF8 \uC774\uBBF8\uC9C0 \uB2E4\uC6B4\uB85C\uB4DC \uC911 (\uB300\uC6A9\uB7C9 \uD30C\uC77C)",
      description: "Status when downloading large original image"
    },
    downloadLargeWarning: {
      message: "\uB300\uC6A9\uB7C9 \uD30C\uC77C \uACBD\uACE0",
      description: "Warning shown for large downloads"
    },
    downloadProcessing: {
      message: "\uC6CC\uD130\uB9C8\uD06C \uCC98\uB9AC \uC911",
      description: "Status when processing watermark removal"
    },
    downloadSuccess: {
      message: "\uB2E4\uC6B4\uB85C\uB4DC \uC911...",
      description: "Status when download starts"
    },
    downloadError: {
      message: "\uC2E4\uD328",
      description: "Status prefix when download fails"
    },
    recentsHide: {
      message: "\uCD5C\uADFC \uD56D\uBAA9 \uC228\uAE30\uAE30",
      description: "Tooltip for hiding recents preview section"
    },
    recentsShow: {
      message: "\uCD5C\uADFC \uD56D\uBAA9 \uD45C\uC2DC",
      description: "Tooltip for showing recents preview section"
    },
    gemsHide: {
      message: "Gem \uC228\uAE30\uAE30",
      description: "Tooltip for hiding Gems list section"
    },
    gemsShow: {
      message: "Gem \uD45C\uC2DC",
      description: "Tooltip for showing Gems list section"
    },
    setAsDefaultModel: {
      message: "\uAE30\uBCF8 \uBAA8\uB378\uB85C \uC124\uC815",
      description: "Tooltip for setting default model"
    },
    cancelDefaultModel: {
      message: "\uAE30\uBCF8 \uBAA8\uB378 \uCDE8\uC18C",
      description: "Tooltip for cancelling default model"
    },
    defaultModelSet: {
      message: "\uAE30\uBCF8 \uBAA8\uB378 \uC124\uC815\uB428: $1",
      description: "Toast message when default model is set"
    },
    defaultModelCleared: {
      message: "\uAE30\uBCF8 \uBAA8\uB378 \uD574\uC81C\uB428",
      description: "Toast message when default model is cleared"
    },
    sidebarAutoHide: {
      message: "\uC0AC\uC774\uB4DC\uBC14 \uC790\uB3D9 \uC228\uAE40",
      description: "Auto-hide sidebar toggle label"
    },
    sidebarAutoHideHint: {
      message: "\uB9C8\uC6B0\uC2A4\uAC00 \uBC97\uC5B4\uB098\uBA74 \uC0AC\uC774\uB4DC\uBC14\uB97C \uC790\uB3D9\uC73C\uB85C \uC811\uACE0, \uB9C8\uC6B0\uC2A4\uAC00 \uB4E4\uC5B4\uC624\uBA74 \uD3BC\uCE69\uB2C8\uB2E4",
      description: "Auto-hide sidebar feature hint"
    },
    folderSpacing: {
      message: "\uD3F4\uB354 \uAC04\uACA9",
      description: "Folder spacing adjustment label"
    },
    folderSpacingCompact: {
      message: "\uC881\uAC8C",
      description: "Compact folder spacing label"
    },
    folderSpacingSpacious: {
      message: "\uB113\uAC8C",
      description: "Spacious folder spacing label"
    },
    folderTreeIndent: {
      message: "\uD558\uC704 \uD3F4\uB354 \uB4E4\uC5EC\uC4F0\uAE30",
      description: "Subfolder tree indentation adjustment label"
    },
    folderTreeIndentCompact: {
      message: "\uC881\uAC8C",
      description: "Narrow subfolder indentation label"
    },
    folderTreeIndentSpacious: {
      message: "\uB113\uAC8C",
      description: "Wide subfolder indentation label"
    },
    export_select_mode_select_all: {
      message: "\uC804\uCCB4 \uC120\uD0DD",
      description: "Selection mode select all toggle"
    },
    export_select_mode_count: {
      message: "{count}\uAC1C \uC120\uD0DD\uB428",
      description: "Selection mode selected message count"
    },
    export_select_mode_toggle: {
      message: "\uBA54\uC2DC\uC9C0 \uC120\uD0DD",
      description: "Selection mode per-message toggle tooltip"
    },
    export_select_mode_select_below: {
      message: "\uC544\uB798 \uBA54\uC2DC\uC9C0 \uC120\uD0DD",
      description: "Selection mode top-left button to select messages below current line"
    },
    export_select_mode_empty: {
      message: "\uB0B4\uBCF4\uB0BC \uBA54\uC2DC\uC9C0\uB97C \uD558\uB098 \uC774\uC0C1 \uC120\uD0DD\uD558\uC138\uC694",
      description: "Selection mode validation when nothing is selected"
    },
    export_format_image_description: {
      message: "\uBAA8\uBC14\uC77C \uACF5\uC720\uC5D0 \uC801\uD569\uD55C \uB2E8\uC77C PNG \uC774\uBBF8\uC9C0.",
      description: "Description for Image export format"
    },
    export_image_progress: {
      message: "\uC774\uBBF8\uC9C0 \uC0DD\uC131 \uC911...",
      description: "Progress message while generating image export"
    },
    deepResearchSaveReport: {
      message: "\uBCF4\uACE0\uC11C \uC800\uC7A5",
      description: "Deep Research save report button"
    },
    deepResearchSaveReportTooltip: {
      message: "\uC774 \uC5F0\uAD6C \uBCF4\uACE0\uC11C \uB0B4\uBCF4\uB0B4\uAE30",
      description: "Deep Research save report tooltip"
    },
    export_fontsize_label: {
      message: "\uAE00\uAF34 \uD06C\uAE30",
      description: "Label for font size slider in export dialog"
    },
    export_fontsize_preview: {
      message: "\uB2E4\uB78C\uC950 \uD5CC \uCCC7\uBC14\uD034\uC5D0 \uD0C0\uACE0\uD30C.",
      description: "Preview text for font size slider in export dialog"
    },
    export_error_generic: {
      message: "\uB0B4\uBCF4\uB0B4\uAE30 \uC2E4\uD328: {error}",
      description: "\uC0C1\uC138 \uC6D0\uC778\uC744 \uD3EC\uD568\uD55C \uC77C\uBC18 \uB0B4\uBCF4\uB0B4\uAE30 \uC2E4\uD328 \uBA54\uC2DC\uC9C0"
    },
    export_error_refresh_retry: {
      message: "\uB124\uD2B8\uC6CC\uD06C \uBB38\uC81C\uB85C \uC774\uBBF8\uC9C0 \uB0B4\uBCF4\uB0B4\uAE30\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4. \uD398\uC774\uC9C0\uB97C \uC0C8\uB85C\uACE0\uCE68\uD55C \uB4A4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.",
      description: "\uC774\uBBF8\uC9C0 \uB0B4\uBCF4\uB0B4\uAE30\uC5D0\uC11C \uC77C\uC2DC\uC801 \uB85C\uB529 \uC2E4\uD328\uAC00 \uBC1C\uC0DD\uD588\uC744 \uB54C \uD45C\uC2DC\uB418\uB294 \uC548\uB0B4"
    },
    export_md_include_source_confirm: {
      message: "\uB0B4\uBCF4\uB0B4\uAE30 \uB0B4\uC6A9\uC5D0 \uC6F9 \uAC80\uC0C9 \uC774\uBBF8\uC9C0\uAC00 \uD3EC\uD568\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4. Markdown\uC5D0 \uC774\uBBF8\uC9C0 \uCD9C\uCC98 \uB9C1\uD06C\uB97C \uD3EC\uD568\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C\uFF1F",
      description: "Confirm dialog when exporting markdown with web search images"
    },
    deepResearch_exportedAt: {
      message: "\uB0B4\uBCF4\uB0B4\uAE30 \uC77C\uC2DC",
      description: "Deep Research \uB0B4\uBCF4\uB0B4\uAE30 \uD0C0\uC784\uC2A4\uD0EC\uD504 \uB808\uC774\uBE14"
    },
    deepResearch_totalPhases: {
      message: "\uCD1D \uB2E8\uACC4 \uC218",
      description: "Deep Research \uCD1D \uC0AC\uACE0 \uB2E8\uACC4 \uB808\uC774\uBE14"
    },
    deepResearch_thinkingPhase: {
      message: "\uC0AC\uACE0 \uB2E8\uACC4",
      description: "Deep Research \uC0AC\uACE0 \uB2E8\uACC4 \uD5E4\uB354"
    },
    deepResearch_researchedWebsites: {
      message: "\uC870\uC0AC\uD55C \uC6F9\uC0AC\uC774\uD2B8",
      description: "Deep Research \uC870\uC0AC\uD55C \uC6F9\uC0AC\uC774\uD2B8 \uC139\uC158 \uD5E4\uB354"
    }
  };

  // ../gemini-voyager/src/locales/pt/messages.json
  var messages_default7 = {
    extName: {
      message: "Gemini Voyager",
      description: "Extension name"
    },
    extDescription: {
      message: "Melhore sua experi\xEAncia Gemini: linha do tempo, pastas, prompts e exporta\xE7\xE3o.",
      description: "Extension description"
    },
    scrollMode: {
      message: "Modo de rolagem",
      description: "Scroll mode label"
    },
    flow: {
      message: "Fluxo",
      description: "Flow mode"
    },
    jump: {
      message: "Pulo",
      description: "Jump mode"
    },
    hideOuterContainer: {
      message: "Ocultar cont\xEAiner externo",
      description: "Hide outer container label"
    },
    draggableTimeline: {
      message: "Linha do tempo arrast\xE1vel",
      description: "Draggable Timeline label"
    },
    enableMarkerLevel: {
      message: "Habilitar n\xEDveis de n\xF3",
      description: "Enable timeline node level feature"
    },
    enableMarkerLevelHint: {
      message: "Clique com o bot\xE3o direito nos n\xF3s da linha do tempo para definir o n\xEDvel e recolher filhos",
      description: "Node level feature hint"
    },
    experimentalLabel: {
      message: "Experimental",
      description: "Experimental feature label"
    },
    resetPosition: {
      message: "Redefinir Posi\xE7\xE3o",
      description: "Reset Position button"
    },
    resetTimelinePosition: {
      message: "Redefinir Posi\xE7\xE3o da Linha do Tempo",
      description: "Reset timeline position button in timeline options"
    },
    language: {
      message: "Idioma",
      description: "Language label"
    },
    pm_title: {
      message: "Gemini Voyager",
      description: "Prompt Manager title"
    },
    pm_add: {
      message: "Adicionar",
      description: "Add prompt button"
    },
    pm_search_placeholder: {
      message: "Pesquisar prompts ou tags",
      description: "Search placeholder"
    },
    pm_import: {
      message: "Importar",
      description: "Import button"
    },
    pm_export: {
      message: "Exportar",
      description: "Export button"
    },
    pm_prompt_placeholder: {
      message: "Texto do prompt",
      description: "Prompt textarea placeholder"
    },
    pm_tags_placeholder: {
      message: "Tags (separadas por v\xEDrgula)",
      description: "Tags input placeholder"
    },
    pm_save: {
      message: "Salvar",
      description: "Save prompt"
    },
    pm_cancel: {
      message: "Cancelar",
      description: "Cancel"
    },
    pm_all_tags: {
      message: "Todos",
      description: "All tags chip"
    },
    pm_empty: {
      message: "Nenhum prompt ainda",
      description: "Empty state"
    },
    pm_copy: {
      message: "Copiar",
      description: "Copy prompt"
    },
    pm_copied: {
      message: "Copiado",
      description: "Copied notice"
    },
    pm_delete: {
      message: "Excluir",
      description: "Delete prompt"
    },
    pm_delete_confirm: {
      message: "Excluir este prompt?",
      description: "Delete confirm"
    },
    pm_lock: {
      message: "Bloquear posi\xE7\xE3o",
      description: "Lock panel position"
    },
    pm_unlock: {
      message: "Desbloquear posi\xE7\xE3o",
      description: "Unlock panel position"
    },
    pm_import_invalid: {
      message: "Formato de arquivo inv\xE1lido",
      description: "Import invalid"
    },
    pm_import_success: {
      message: "Importado(s) {count} prompt(s)",
      description: "Import success"
    },
    pm_duplicate: {
      message: "Duplicar prompt",
      description: "Duplicate on add"
    },
    pm_deleted: {
      message: "Exclu\xEDdo",
      description: "Deleted notice"
    },
    pm_edit: {
      message: "Editar",
      description: "Edit prompt"
    },
    pm_expand: {
      message: "Expandir",
      description: "Expand prompt text"
    },
    pm_collapse: {
      message: "Recolher",
      description: "Collapse prompt text"
    },
    pm_saved: {
      message: "Salvo",
      description: "Saved notice"
    },
    pm_settings: {
      message: "Configura\xE7\xF5es",
      description: "Settings button"
    },
    pm_settings_tooltip: {
      message: "Abrir configura\xE7\xF5es da extens\xE3o",
      description: "Settings button tooltip"
    },
    pm_settings_fallback: {
      message: "Clique no \xEDcone da extens\xE3o na barra do navegador para abrir as configura\xE7\xF5es",
      description: "Settings open failed message"
    },
    pm_backup: {
      message: "Backup Local",
      description: "Local backup button"
    },
    pm_backup_tooltip: {
      message: "Fazer backup de prompts e pastas em uma pasta com carimbo de data/hora",
      description: "Backup button tooltip"
    },
    pm_backup_cancelled: {
      message: "Backup cancelado",
      description: "Backup cancelled hint"
    },
    pm_backup_error: {
      message: "\u2717 Falha no backup",
      description: "Backup failed hint"
    },
    pm_backup_hint_options: {
      message: "O recurso est\xE1 integrado ao Gerenciador de Prompts na p\xE1gina do Gemini.",
      description: "Backup hint in options page"
    },
    pm_backup_step1: {
      message: "Abra a p\xE1gina do Gemini (gemini.google.com)",
      description: "Backup step 1"
    },
    pm_backup_step2: {
      message: "Clique no \xEDcone da extens\xE3o no canto inferior direito para abrir o Gerenciador de Prompts",
      description: "Backup step 2"
    },
    pm_backup_step3: {
      message: 'Clique no bot\xE3o "\u{1F4BE} Backup Local" e selecione uma pasta de backup',
      description: "Backup step 3"
    },
    pm_backup_note: {
      message: "Os backups incluem todos os prompts e pastas, salvos em uma pasta com carimbo de data/hora (formato: backup-YYYYMMDD-HHMMSS)",
      description: "Backup feature note"
    },
    extensionVersion: {
      message: "Vers\xE3o",
      description: "Extension version label"
    },
    newVersionAvailable: {
      message: "Nova vers\xE3o dispon\xEDvel",
      description: "Update reminder title"
    },
    currentVersionLabel: {
      message: "Atual",
      description: "Label for current version number"
    },
    latestVersionLabel: {
      message: "Mais recente",
      description: "Label for latest version number"
    },
    updateNow: {
      message: "Atualizar",
      description: "CTA to update to latest version"
    },
    starProject: {
      message: "Apoie-me \u2B50",
      description: "Github callout"
    },
    officialDocs: {
      message: "Documenta\xE7\xE3o Oficial",
      description: "Official docs link"
    },
    exportChatJson: {
      message: "Exportar hist\xF3rico da conversa",
      description: "Tooltip for export button"
    },
    folder_title: {
      message: "Pastas",
      description: "Folder section title"
    },
    folder_create: {
      message: "Criar pasta",
      description: "Create folder button tooltip"
    },
    folder_name_prompt: {
      message: "Digite o nome da pasta:",
      description: "Create folder name prompt"
    },
    folder_rename_prompt: {
      message: "Digite o novo nome:",
      description: "Rename folder prompt"
    },
    folder_delete_confirm: {
      message: "Excluir esta pasta e todo o seu conte\xFAdo?",
      description: "Delete folder confirmation"
    },
    folder_create_subfolder: {
      message: "Criar subpasta",
      description: "Create subfolder menu item"
    },
    folder_rename: {
      message: "Renomear",
      description: "Rename folder menu item"
    },
    folder_change_color: {
      message: "Alterar cor",
      description: "Change folder color menu item"
    },
    folder_delete: {
      message: "Excluir",
      description: "Delete folder menu item"
    },
    folder_color_default: {
      message: "Padr\xE3o",
      description: "Default folder color name"
    },
    folder_color_red: {
      message: "Vermelho",
      description: "Red folder color name"
    },
    folder_color_orange: {
      message: "Laranja",
      description: "Orange folder color name"
    },
    folder_color_yellow: {
      message: "Amarelo",
      description: "Yellow folder color name"
    },
    folder_color_green: {
      message: "Verde",
      description: "Green folder color name"
    },
    folder_color_blue: {
      message: "Azul",
      description: "Blue folder color name"
    },
    folder_color_purple: {
      message: "Roxo",
      description: "Purple folder color name"
    },
    folder_color_pink: {
      message: "Rosa",
      description: "Pink folder color name"
    },
    folder_color_custom: {
      message: "Personalizado",
      description: "Custom folder color name"
    },
    folder_empty: {
      message: "Nenhuma pasta ainda",
      description: "Empty state placeholder when no folders exist"
    },
    folder_pin: {
      message: "Fixar pasta",
      description: "Pin folder menu item"
    },
    folder_unpin: {
      message: "Desafixar pasta",
      description: "Unpin folder menu item"
    },
    folder_remove_conversation: {
      message: "Remover da pasta",
      description: "Remove conversation button tooltip"
    },
    folder_remove_conversation_confirm: {
      message: 'Remover "{title}" desta pasta?',
      description: "Remove conversation confirmation"
    },
    conversation_more: {
      message: "Mais op\xE7\xF5es",
      description: "Conversation more options button tooltip"
    },
    conversation_move_to_folder: {
      message: "Mover para pasta",
      description: "Move conversation to folder menu item"
    },
    conversation_move_to_folder_title: {
      message: "Mover para pasta",
      description: "Move conversation to folder dialog title"
    },
    chatWidth: {
      message: "Largura do chat",
      description: "Chat width adjustment label"
    },
    chatWidthNarrow: {
      message: "Estreita",
      description: "Narrow chat width label"
    },
    chatWidthWide: {
      message: "Larga",
      description: "Wide chat width label"
    },
    sidebarWidth: {
      message: "Largura da barra lateral",
      description: "Sidebar width adjustment label"
    },
    sidebarWidthNarrow: {
      message: "Estreita",
      description: "Narrow sidebar width label"
    },
    sidebarWidthWide: {
      message: "Larga",
      description: "Wide sidebar width label"
    },
    formula_copied: {
      message: "\u2713 F\xF3rmula copiada",
      description: "Formula copied success message"
    },
    formula_copy_failed: {
      message: "\u2717 Falha ao copiar",
      description: "Formula copy failed message"
    },
    formulaCopyFormat: {
      message: "Formato de c\xF3pia de f\xF3rmula",
      description: "Formula copy format setting label"
    },
    formulaCopyFormatLatex: {
      message: "LaTeX",
      description: "LaTeX format option"
    },
    formulaCopyFormatUnicodeMath: {
      message: "MathML (Word)",
      description: "Label for UnicodeMath formula copy format option"
    },
    formulaCopyFormatHint: {
      message: "Escolha o formato ao copiar f\xF3rmulas clicando",
      description: "Formula copy format hint"
    },
    formulaCopyFormatNoDollar: {
      message: "LaTeX (Sem cifr\xE3o)",
      description: "LaTeX format option without dollar signs"
    },
    folder_filter_current_user: {
      message: "Isolamento de conta",
      description: "Show only conversations from the current Google account"
    },
    folder_export: {
      message: "Exportar pastas",
      description: "Export folders button tooltip"
    },
    folder_import_export: {
      message: "Importar/Exportar pastas",
      description: "Combined import/export button tooltip"
    },
    folder_cloud_upload: {
      message: "Enviar para nuvem",
      description: "Cloud upload button tooltip"
    },
    folder_cloud_sync: {
      message: "Sincronizar da nuvem",
      description: "Cloud sync button tooltip"
    },
    folder_import: {
      message: "Importar pastas",
      description: "Import folders button tooltip"
    },
    folder_import_title: {
      message: "Importar Configura\xE7\xE3o de Pasta",
      description: "Import dialog title"
    },
    folder_import_strategy: {
      message: "Estrat\xE9gia de importa\xE7\xE3o:",
      description: "Import strategy label"
    },
    folder_import_merge: {
      message: "Mesclar com pastas existentes",
      description: "Merge import strategy"
    },
    folder_import_overwrite: {
      message: "Substituir pastas existentes",
      description: "Overwrite import strategy"
    },
    folder_import_select_file: {
      message: "Selecione um arquivo JSON para importar",
      description: "Import file selection prompt"
    },
    folder_import_success: {
      message: "\u2713 Importado(s) {folders} pasta(s), {conversations} conversa(s)",
      description: "Import success message"
    },
    folder_import_success_skipped: {
      message: "\u2713 Importado(s) {folders} pasta(s), {conversations} conversa(s) ({skipped} duplicatas ignoradas)",
      description: "Import success with skipped message"
    },
    folder_import_error: {
      message: "\u2717 Falha na importa\xE7\xE3o: {error}",
      description: "Import error message"
    },
    folder_export_success: {
      message: "\u2713 Pastas exportadas com sucesso",
      description: "Export success message"
    },
    folder_import_invalid_format: {
      message: "Formato de arquivo inv\xE1lido. Por favor, selecione um arquivo de configura\xE7\xE3o de pasta v\xE1lido.",
      description: "Invalid format error"
    },
    folder_import_confirm_overwrite: {
      message: "Isso substituir\xE1 todas as pastas existentes. Um backup ser\xE1 criado. Continuar?",
      description: "Overwrite confirmation"
    },
    export_dialog_title: {
      message: "Exportar Conversa",
      description: "Export dialog title"
    },
    export_dialog_select: {
      message: "Escolha o formato de exporta\xE7\xE3o:",
      description: "Export format selection label"
    },
    export_dialog_warning: {
      message: "\u26A0\uFE0F Ap\xF3s clicar em exportar, o sistema saltar\xE1 automaticamente para a primeira mensagem para carregar todo o conte\xFAdo. N\xE3o realize nenhuma opera\xE7\xE3o; a exporta\xE7\xE3o continuar\xE1 automaticamente ap\xF3s o salto.",
      description: "Warning about auto-jump and loading completeness"
    },
    export_dialog_safari_cmdp_hint: {
      message: "Dica Safari: Clique em 'Exportar' abaixo, aguarde um momento, depois pressione \u2318P e escolha 'Salvar como PDF'.",
      description: "Safari-specific hint for PDF export"
    },
    export_toast_safari_pdf_ready: {
      message: "Agora voc\xEA pode pressionar Command + P para exportar o PDF.",
      description: "Safari-specific toast shown after PDF export is prepared"
    },
    export_dialog_safari_markdown_hint: {
      message: "Aviso: devido \xE0s limita\xE7\xF5es do Safari, n\xE3o \xE9 poss\xEDvel extrair as imagens do hist\xF3rico de conversa. Para uma exporta\xE7\xE3o completa, use a exporta\xE7\xE3o em PDF.",
      description: "Warning about image references in Safari markdown export"
    },
    export_format_json_description: {
      message: "Formato leg\xEDvel por m\xE1quina para desenvolvedores",
      description: "Description for JSON export format"
    },
    export_format_markdown_description: {
      message: "Formato de texto limpo e port\xE1til (recomendado)",
      description: "Description for Markdown export format"
    },
    export_format_pdf_description: {
      message: "Formato amig\xE1vel para impress\xE3o via Salvar como PDF",
      description: "Description for PDF export format"
    },
    editInputWidth: {
      message: "Largura da entrada de edi\xE7\xE3o",
      description: "Edit input width adjustment label"
    },
    editInputWidthNarrow: {
      message: "Estreita",
      description: "Narrow edit input width label"
    },
    editInputWidthWide: {
      message: "Larga",
      description: "Wide edit input width label"
    },
    timelineOptions: {
      message: "Op\xE7\xF5es da Linha do Tempo",
      description: "Timeline options section label"
    },
    folderOptions: {
      message: "Op\xE7\xF5es de Pasta",
      description: "Folder options section label"
    },
    enableFolderFeature: {
      message: "Habilitar recurso de pasta",
      description: "Enable or disable the folder feature"
    },
    hideArchivedConversations: {
      message: "Ocultar conversas arquivadas",
      description: "Hide conversations that are in folders from the main list"
    },
    conversation_star: {
      message: "Favoritar conversa",
      description: "Star conversation button tooltip"
    },
    conversation_unstar: {
      message: "Desfavoritar conversa",
      description: "Unstar conversation button tooltip"
    },
    conversation_untitled: {
      message: "Sem t\xEDtulo",
      description: "Fallback title for conversations without a name"
    },
    geminiOnlyNotice: {
      message: "Funciona no Gemini (incluindo Enterprise) e AI Studio por padr\xE3o. Adicione outros sites abaixo para habilitar o Gerenciador de Prompts l\xE1.",
      description: "Notice that defaults are limited to Gemini/AI Studio"
    },
    folderManager_dataLossWarning: {
      message: "\u26A0\uFE0F Aviso: Falha ao carregar dados da pasta. Suas pastas podem ter sido corrompidas. Verifique o console do navegador para detalhes e tente restaurar do backup, se dispon\xEDvel.",
      description: "Warning shown when folder data fails to load"
    },
    backupOptions: {
      message: "Backup Autom\xE1tico",
      description: "Backup options section label"
    },
    backupEnabled: {
      message: "Habilitar backup autom\xE1tico",
      description: "Enable auto backup toggle"
    },
    backupNow: {
      message: "Fazer Backup Agora",
      description: "Backup now button"
    },
    backupSelectFolder: {
      message: "Selecionar Pasta de Backup",
      description: "Select backup folder button"
    },
    backupFolderSelected: {
      message: "Pasta de backup: {folder}",
      description: "Shows selected backup folder"
    },
    backupIncludePrompts: {
      message: "Incluir prompts",
      description: "Include prompts in backup toggle"
    },
    backupIncludeFolders: {
      message: "Incluir pastas",
      description: "Include folders in backup toggle"
    },
    backupIntervalLabel: {
      message: "Intervalo de backup",
      description: "Backup interval label"
    },
    backupIntervalManual: {
      message: "Apenas manual",
      description: "Manual backup mode"
    },
    backupIntervalDaily: {
      message: "Di\xE1rio",
      description: "Daily backup interval"
    },
    backupIntervalWeekly: {
      message: "Semanal (7 dias)",
      description: "Weekly backup interval"
    },
    backupLastBackup: {
      message: "\xDAltimo backup: {time}",
      description: "Last backup timestamp"
    },
    backupNever: {
      message: "Nunca",
      description: "Never backed up"
    },
    backupSuccess: {
      message: "\u2713 Backup criado: {prompts} prompts, {folders} pastas, {conversations} conversas",
      description: "Backup success message"
    },
    backupError: {
      message: "\u2717 Falha no backup: {error}",
      description: "Backup error message"
    },
    backupNotSupported: {
      message: "\u26A0\uFE0F O backup autom\xE1tico requer um navegador moderno com suporte \xE0 API File System Access",
      description: "Browser not supported message"
    },
    backupSelectFolderFirst: {
      message: "Selecione uma pasta de backup primeiro",
      description: "No folder selected warning"
    },
    backupUserCancelled: {
      message: "Backup cancelado",
      description: "User cancelled folder selection"
    },
    backupConfigSaved: {
      message: "\u2713 Configura\xE7\xF5es de backup salvas",
      description: "Config saved message"
    },
    backupPermissionDenied: {
      message: "\u26A0\uFE0F N\xE3o \xE9 poss\xEDvel acessar este diret\xF3rio. Escolha um local diferente (por exemplo, Documentos, Downloads ou uma pasta na \xC1rea de Trabalho)",
      description: "Permission denied for restricted directory"
    },
    backupConfigureInOptions: {
      message: "A configura\xE7\xE3o de backup requer a p\xE1gina de Op\xE7\xF5es. Clique no bot\xE3o abaixo para abri-la (clique nos tr\xEAs pontos ao lado do \xEDcone da extens\xE3o \u2192 Op\xE7\xF5es).",
      description: "Backup configure in options page explanation"
    },
    openOptionsPage: {
      message: "Abrir P\xE1gina de Op\xE7\xF5es",
      description: "Open options page button"
    },
    optionsPageSubtitle: {
      message: "Op\xE7\xF5es da Extens\xE3o",
      description: "Options page subtitle"
    },
    optionsComingSoon: {
      message: "Mais op\xE7\xF5es em breve...",
      description: "Options page placeholder text"
    },
    backupDataAccessNotice: {
      message: "Limita\xE7\xE3o de Acesso a Dados",
      description: "Backup data access limitation title"
    },
    backupDataAccessHint: {
      message: "Devido a restri\xE7\xF5es de seguran\xE7a do navegador, esta p\xE1gina de Op\xE7\xF5es n\xE3o pode acessar diretamente os prompts e dados de pasta das p\xE1ginas do Gemini. Use o Gerenciador de Prompts e os recursos de Exporta\xE7\xE3o de Pasta na p\xE1gina do Gemini para backups manuais.",
      description: "Backup data access limitation explanation"
    },
    promptManagerOptions: {
      message: "Gerenciador de Prompts",
      description: "Prompt Manager options section label"
    },
    hidePromptManager: {
      message: "Ocultar Gerenciador de Prompts",
      description: "Hide the prompt manager floating ball"
    },
    hidePromptManagerHint: {
      message: "Ocultar o bot\xE3o flutuante do Gerenciador de Prompts na p\xE1gina",
      description: "Hint for hiding prompt manager feature"
    },
    customWebsites: {
      message: "Sites personalizados",
      description: "Custom websites for prompt manager"
    },
    customWebsitesPlaceholder: {
      message: "Digite a URL do site (ex: chatgpt.com)",
      description: "Custom websites input placeholder"
    },
    customWebsitesHint: {
      message: "Adicione sites onde voc\xEA deseja usar o Gerenciador de Prompts. Apenas o Gerenciador de Prompts ser\xE1 ativado nesses sites.",
      description: "Custom websites hint"
    },
    addWebsite: {
      message: "Adicionar site",
      description: "Add website button"
    },
    removeWebsite: {
      message: "Remover",
      description: "Remove website button"
    },
    invalidUrl: {
      message: "Formato de URL inv\xE1lido",
      description: "Invalid URL error message"
    },
    websiteAdded: {
      message: "Site adicionado",
      description: "Website added success message"
    },
    websiteRemoved: {
      message: "Site removido",
      description: "Website removed success message"
    },
    permissionDenied: {
      message: "Permiss\xE3o negada. Por favor, permita o acesso a este site.",
      description: "Permission denied error message"
    },
    permissionRequestFailed: {
      message: "Solicita\xE7\xE3o de permiss\xE3o falhou. Tente novamente ou conceda acesso nas configura\xE7\xF5es da extens\xE3o.",
      description: "Permission request failure message"
    },
    customWebsitesNote: {
      message: "Dica: Voc\xEA ser\xE1 solicitado a permitir o acesso ao adicionar um site. Ap\xF3s conceder permiss\xE3o, recarregue esse site para que o Gerenciador de Prompts possa iniciar.",
      description: "Custom websites reload/permission note"
    },
    starredHistory: {
      message: "Hist\xF3rico Favorito",
      description: "Starred history title"
    },
    viewStarredHistory: {
      message: "Ver Hist\xF3rico Favorito",
      description: "View starred history button"
    },
    noStarredMessages: {
      message: "Nenhuma mensagem favorita ainda",
      description: "No starred messages placeholder"
    },
    removeFromStarred: {
      message: "Remover dos favoritos",
      description: "Remove from starred tooltip"
    },
    justNow: {
      message: "Agora mesmo",
      description: "Just now time label"
    },
    hoursAgo: {
      message: "horas atr\xE1s",
      description: "Hours ago label"
    },
    yesterday: {
      message: "Ontem",
      description: "Yesterday date label"
    },
    daysAgo: {
      message: "dias atr\xE1s",
      description: "Days ago label"
    },
    loading: {
      message: "Carregando...",
      description: "Loading message"
    },
    keyboardShortcuts: {
      message: "Atalhos de Teclado",
      description: "Keyboard shortcuts section title"
    },
    enableShortcuts: {
      message: "Habilitar atalhos de teclado",
      description: "Enable shortcuts toggle label"
    },
    previousNode: {
      message: "N\xF3 anterior",
      description: "Previous timeline node shortcut label"
    },
    nextNode: {
      message: "Pr\xF3ximo n\xF3",
      description: "Next timeline node shortcut label"
    },
    shortcutKey: {
      message: "Tecla",
      description: "Shortcut key label"
    },
    shortcutModifiers: {
      message: "Modificadores",
      description: "Shortcut modifiers label"
    },
    resetShortcuts: {
      message: "Redefinir para padr\xF5es",
      description: "Reset shortcuts button"
    },
    shortcutsResetSuccess: {
      message: "Atalhos redefinidos",
      description: "Shortcuts reset success message"
    },
    shortcutsDescription: {
      message: "Navegar pelos n\xF3s da linha do tempo usando atalhos de teclado",
      description: "Shortcuts description"
    },
    modifierNone: {
      message: "Nenhum",
      description: "No modifier key"
    },
    modifierAlt: {
      message: "Alt",
      description: "Alt modifier key"
    },
    modifierCtrl: {
      message: "Ctrl",
      description: "Ctrl modifier key"
    },
    modifierShift: {
      message: "Shift",
      description: "Shift modifier key"
    },
    modifierMeta: {
      message: "Cmd/Win",
      description: "Meta/Command/Windows modifier key"
    },
    cloudSync: {
      message: "Sincroniza\xE7\xE3o na Nuvem",
      description: "Cloud sync section title"
    },
    cloudSyncDescription: {
      message: "Sincronizar pastas e prompts com o Google Drive",
      description: "Cloud sync description"
    },
    syncModeDisabled: {
      message: "Desativado",
      description: "Sync mode disabled option"
    },
    syncModeManual: {
      message: "Manual",
      description: "Sync mode manual option"
    },
    syncServerPort: {
      message: "Porta do servidor",
      description: "Port number for the sync server"
    },
    syncNow: {
      message: "Sincronizar Agora",
      description: "Sync now button"
    },
    lastSynced: {
      message: "\xDAltima sincr.: {time}",
      description: "Last sync timestamp"
    },
    neverSynced: {
      message: "Nunca sincronizado",
      description: "Never synced message"
    },
    lastUploaded: {
      message: "Enviado: {time}",
      description: "Last upload timestamp"
    },
    neverUploaded: {
      message: "Nunca enviado",
      description: "Never uploaded message"
    },
    syncSuccess: {
      message: "\u2713 Sincronizado com sucesso",
      description: "Sync success message"
    },
    syncError: {
      message: "\u2717 Falha na sincroniza\xE7\xE3o: {error}",
      description: "Sync error message"
    },
    syncInProgress: {
      message: "Sincronizando...",
      description: "Sync in progress message"
    },
    uploadInProgress: {
      message: "Uploading...",
      description: "Upload in progress message"
    },
    uploadSuccess: {
      message: "\u2713 Uploaded successfully",
      description: "Upload success message"
    },
    downloadInProgress: {
      message: "Downloading...",
      description: "Download in progress message"
    },
    downloadMergeSuccess: {
      message: "\u2713 Downloaded and merged",
      description: "Download and merge success message"
    },
    syncUpload: {
      message: "Enviar",
      description: "Upload button label"
    },
    syncMerge: {
      message: "Mesclar",
      description: "Merge button label"
    },
    syncMode: {
      message: "Modo Sincr.",
      description: "Sync mode label"
    },
    minutesAgo: {
      message: "minutos atr\xE1s",
      description: "Minutes ago label"
    },
    syncNoData: {
      message: "Nenhum dado de sincroniza\xE7\xE3o encontrado no Drive",
      description: "Error message when no data is found in Drive"
    },
    syncUploadFailed: {
      message: "Falha no envio",
      description: "Error message when upload fails"
    },
    syncDownloadFailed: {
      message: "Falha no download",
      description: "Error message when download fails"
    },
    syncAuthFailed: {
      message: "Falha na autentica\xE7\xE3o",
      description: "Error message when authentication fails"
    },
    signOut: {
      message: "Sair",
      description: "Sign out button"
    },
    signInWithGoogle: {
      message: "Entrar com Google",
      description: "Sign in with Google button"
    },
    nanobananaOptions: {
      message: "Op\xE7\xF5es NanoBanana",
      description: "NanoBanana options section label"
    },
    enableNanobananaWatermarkRemover: {
      message: "Remover marca d'\xE1gua NanoBanana",
      description: "Enable automatic watermark removal for NanoBanana images"
    },
    nanobananaWatermarkRemoverHint: {
      message: "Remove automaticamente marcas d'\xE1gua do Gemini vis\xEDveis em imagens geradas",
      description: "Watermark remover feature hint"
    },
    nanobananaDownloadTooltip: {
      message: "Baixar imagem sem marca d'\xE1gua (NanoBanana)",
      description: "Download button tooltip"
    },
    deepResearchDownload: {
      message: "Baixar conte\xFAdo de pensamento",
      description: "Deep Research download button text"
    },
    deepResearchDownloadTooltip: {
      message: "Baixar conte\xFAdo de pensamento como Markdown",
      description: "Deep Research download button tooltip"
    },
    folder_uncategorized: {
      message: "Sem categoria",
      description: "Label for root-level conversations not in any folder"
    },
    timelineLevelTitle: {
      message: "N\xEDvel de N\xF3",
      description: "Title for timeline node level context menu"
    },
    timelineLevel1: {
      message: "N\xEDvel 1",
      description: "Timeline node level 1 option"
    },
    timelineLevel2: {
      message: "N\xEDvel 2",
      description: "Timeline node level 2 option"
    },
    timelineLevel3: {
      message: "N\xEDvel 3",
      description: "Timeline node level 3 option"
    },
    timelineCollapse: {
      message: "Recolher",
      description: "Collapse children"
    },
    timelineExpand: {
      message: "Expandir",
      description: "Expand children"
    },
    timelinePreviewSearch: {
      message: "Pesquisar...",
      description: "Timeline preview panel search placeholder"
    },
    timelinePreviewNoResults: {
      message: "Sem resultados",
      description: "Timeline preview panel no search results"
    },
    timelinePreviewNoMessages: {
      message: "Sem mensagens",
      description: "Timeline preview panel no messages"
    },
    quoteReply: {
      message: "Responder Cita\xE7\xE3o",
      description: "Quote reply button text"
    },
    inputCollapseOptions: {
      message: "Op\xE7\xF5es de entrada",
      description: "Input options section label"
    },
    enableInputCollapse: {
      message: "Habilitar contra\xE7\xE3o de entrada",
      description: "Enable input collapse toggle label"
    },
    enableInputCollapseHint: {
      message: "Contrai a \xE1rea de entrada quando vazia para ganhar mais espa\xE7o de leitura",
      description: "Input collapse feature hint"
    },
    inputCollapsePlaceholder: {
      message: "Mensagem para o Gemini",
      description: "Placeholder text shown in collapsed input"
    },
    ctrlEnterSend: {
      message: "Ctrl+Enter para enviar",
      description: "Ctrl+Enter to send toggle label"
    },
    ctrlEnterSendHint: {
      message: "Pressione Ctrl+Enter para enviar mensagens, Enter para nova linha",
      description: "Ctrl+Enter to send feature hint"
    },
    batch_delete_confirm: {
      message: "Tem certeza de que deseja excluir {count} conversa(s)? Esta a\xE7\xE3o n\xE3o pode ser desfeita.",
      description: "Batch delete confirmation message"
    },
    batch_delete_in_progress: {
      message: "Excluindo... ({current}/{total})",
      description: "Batch delete progress message"
    },
    batch_delete_success: {
      message: "\u2713 {count} conversa(s) exclu\xEDda(s)",
      description: "Batch delete success message"
    },
    batch_delete_partial: {
      message: "Exclus\xE3o conclu\xEDda: {success} com sucesso, {failed} falhas",
      description: "Batch delete partial success message"
    },
    batch_delete_limit_reached: {
      message: "No m\xE1ximo {max} conversas podem ser selecionadas de uma vez",
      description: "Batch delete limit warning"
    },
    batch_delete_button: {
      message: "Excluir selecionados",
      description: "Batch delete button tooltip in multi-select mode"
    },
    batch_delete_match_patterns: {
      message: "delete,confirm,yes,ok,remove,excluir,confirmar,sim,aceitar,apagar",
      description: "Comma-separated list of keywords to match native delete/confirm buttons (case-insensitive)"
    },
    generalOptions: {
      message: "Op\xE7\xF5es Gerais",
      description: "General options section label"
    },
    enableTabTitleUpdate: {
      message: "Sincronizar t\xEDtulo da guia com conversa",
      description: "Enable tab title sync toggle label"
    },
    enableTabTitleUpdateHint: {
      message: "Atualiza automaticamente o t\xEDtulo da guia do navegador para corresponder ao t\xEDtulo da conversa atual",
      description: "Tab title sync feature hint"
    },
    enableMermaidRendering: {
      message: "Habilitar renderiza\xE7\xE3o de diagramas Mermaid",
      description: "Enable Mermaid diagram rendering toggle label"
    },
    enableMermaidRenderingHint: {
      message: "Renderiza automaticamente diagramas Mermaid em blocos de c\xF3digo",
      description: "Mermaid rendering feature hint"
    },
    enableQuoteReply: {
      message: "Habilitar resposta com cita\xE7\xE3o",
      description: "Enable quote reply toggle label"
    },
    enableQuoteReplyHint: {
      message: "Mostra um bot\xE3o flutuante para citar o texto selecionado em conversas",
      description: "Quote reply feature hint"
    },
    contextSync: {
      message: "Sincroniza\xE7\xE3o de Contexto",
      description: "Context Sync title"
    },
    contextSyncDescription: {
      message: "Sincronize o contexto do chat com seu IDE local",
      description: "Context Sync description"
    },
    syncToIDE: {
      message: "Sincronizar com IDE",
      description: "Sync to IDE button"
    },
    ideOnline: {
      message: "IDE Online",
      description: "IDE Online status"
    },
    ideOffline: {
      message: "IDE Offline",
      description: "IDE Offline status"
    },
    syncing: {
      message: "Sincronizando...",
      description: "Syncing status"
    },
    checkServer: {
      message: "Por favor, inicie o servidor AI Sync no VS Code",
      description: "Check server hint"
    },
    capturing: {
      message: "Capturando di\xE1logo...",
      description: "Capturing status"
    },
    syncedSuccess: {
      message: "Sincronizado com sucesso!",
      description: "Synced success message"
    },
    downloadingOriginal: {
      message: "Baixando imagem original",
      description: "Status when downloading original image"
    },
    downloadingOriginalLarge: {
      message: "Baixando imagem original (arquivo grande)",
      description: "Status when downloading large original image"
    },
    downloadLargeWarning: {
      message: "Aviso de arquivo grande",
      description: "Warning shown for large downloads"
    },
    downloadProcessing: {
      message: "Processando marca d'\xE1gua",
      description: "Status when processing watermark removal"
    },
    downloadSuccess: {
      message: "Baixando...",
      description: "Status when download starts"
    },
    downloadError: {
      message: "Falha",
      description: "Status prefix when download fails"
    },
    recentsHide: {
      message: "Ocultar itens recentes",
      description: "Dica para ocultar a se\xE7\xE3o de itens recentes"
    },
    recentsShow: {
      message: "Mostrar itens recentes",
      description: "Dica para mostrar a se\xE7\xE3o de itens recentes"
    },
    gemsHide: {
      message: "Ocultar Gems",
      description: "Dica para ocultar a se\xE7\xE3o da lista de Gems"
    },
    gemsShow: {
      message: "Mostrar Gems",
      description: "Dica para mostrar a se\xE7\xE3o da lista de Gems"
    },
    setAsDefaultModel: {
      message: "Set as default model",
      description: "Tooltip for setting default model"
    },
    cancelDefaultModel: {
      message: "Cancel default model",
      description: "Tooltip for cancelling default model"
    },
    defaultModelSet: {
      message: "Default model set: $1",
      description: "Toast message when default model is set"
    },
    defaultModelCleared: {
      message: "Default model cleared",
      description: "Toast message when default model is cleared"
    },
    sidebarAutoHide: {
      message: "Ocultar barra lateral auto",
      description: "Auto-hide sidebar toggle label"
    },
    sidebarAutoHideHint: {
      message: "Contrai automaticamente a barra lateral quando o mouse sai, expande quando entra",
      description: "Auto-hide sidebar feature hint"
    },
    folderSpacing: {
      message: "Espa\xE7amento de pastas",
      description: "Folder spacing adjustment label"
    },
    folderSpacingCompact: {
      message: "Compacto",
      description: "Compact folder spacing label"
    },
    folderSpacingSpacious: {
      message: "Espa\xE7oso",
      description: "Spacious folder spacing label"
    },
    folderTreeIndent: {
      message: "Recuo de subpastas",
      description: "Subfolder tree indentation adjustment label"
    },
    folderTreeIndentCompact: {
      message: "Estreito",
      description: "Narrow subfolder indentation label"
    },
    folderTreeIndentSpacious: {
      message: "Largo",
      description: "Wide subfolder indentation label"
    },
    export_select_mode_select_all: {
      message: "Select all",
      description: "Selection mode select all toggle"
    },
    export_select_mode_count: {
      message: "Selected {count}",
      description: "Selection mode selected message count"
    },
    export_select_mode_toggle: {
      message: "Select message",
      description: "Selection mode per-message toggle tooltip"
    },
    export_select_mode_select_below: {
      message: "Select messages below",
      description: "Selection mode top-left button to select messages below current line"
    },
    export_select_mode_empty: {
      message: "Please select at least one message to export.",
      description: "Selection mode validation when nothing is selected"
    },
    export_format_image_description: {
      message: "Imagem PNG \xFAnica, ideal para compartilhamento no celular.",
      description: "Description for Image export format"
    },
    export_image_progress: {
      message: "Generating image...",
      description: "Progress message while generating image export"
    },
    deepResearchSaveReport: {
      message: "Save Report",
      description: "Deep Research save report button"
    },
    deepResearchSaveReportTooltip: {
      message: "Export this research report",
      description: "Deep Research save report tooltip"
    },
    export_fontsize_label: {
      message: "Tamanho da fonte",
      description: "Label for font size slider in export dialog"
    },
    export_fontsize_preview: {
      message: "A r\xE1pida raposa marrom salta sobre o c\xE3o pregui\xE7oso.",
      description: "Preview text for font size slider in export dialog"
    },
    export_error_generic: {
      message: "Falha na exporta\xE7\xE3o: {error}",
      description: "Mensagem gen\xE9rica de falha na exporta\xE7\xE3o com detalhe"
    },
    export_error_refresh_retry: {
      message: "A exporta\xE7\xE3o da imagem falhou devido a problemas de rede. Atualize a p\xE1gina e tente novamente.",
      description: "Orienta\xE7\xE3o exibida quando a exporta\xE7\xE3o de imagem falha por carregamento tempor\xE1rio"
    },
    export_md_include_source_confirm: {
      message: "O conte\xFAdo exportado cont\xE9m imagens de pesquisa na web. Incluir links de origem das imagens no Markdown?",
      description: "Confirm dialog when exporting markdown with web search images"
    },
    deepResearch_exportedAt: {
      message: "Exportado em",
      description: "Etiqueta de carimbo de data/hora de exporta\xE7\xE3o de Deep Research"
    },
    deepResearch_totalPhases: {
      message: "Fases totais",
      description: "Etiqueta do total de fases de pensamento de Deep Research"
    },
    deepResearch_thinkingPhase: {
      message: "Fase de pensamento",
      description: "Cabe\xE7alho de fase de pensamento de Deep Research"
    },
    deepResearch_researchedWebsites: {
      message: "Sites pesquisados",
      description: "Cabe\xE7alho de sec\xE7\xE3o de sites pesquisados de Deep Research"
    }
  };

  // ../gemini-voyager/src/locales/ru/messages.json
  var messages_default8 = {
    extName: {
      message: "Gemini Voyager",
      description: "Extension name"
    },
    extDescription: {
      message: "\u0423\u043B\u0443\u0447\u0448\u0438\u0442\u0435 \u043E\u043F\u044B\u0442 Gemini: \u0442\u0430\u0439\u043C\u043B\u0430\u0439\u043D, \u043F\u0430\u043F\u043A\u0438, \u043F\u0440\u043E\u043C\u043F\u0442\u044B \u0438 \u044D\u043A\u0441\u043F\u043E\u0440\u0442 \u0447\u0430\u0442\u043E\u0432.",
      description: "Extension description"
    },
    scrollMode: {
      message: "\u0420\u0435\u0436\u0438\u043C \u043F\u0440\u043E\u043A\u0440\u0443\u0442\u043A\u0438",
      description: "Scroll mode label"
    },
    flow: {
      message: "\u041F\u043E\u0442\u043E\u043A",
      description: "Flow mode"
    },
    jump: {
      message: "\u041F\u0440\u044B\u0436\u043E\u043A",
      description: "Jump mode"
    },
    hideOuterContainer: {
      message: "\u0421\u043A\u0440\u044B\u0442\u044C \u0432\u043D\u0435\u0448\u043D\u0438\u0439 \u043A\u043E\u043D\u0442\u0435\u0439\u043D\u0435\u0440",
      description: "Hide outer container label"
    },
    draggableTimeline: {
      message: "\u041F\u0435\u0440\u0435\u0442\u0430\u0441\u043A\u0438\u0432\u0430\u0435\u043C\u044B\u0439 \u0442\u0430\u0439\u043C\u043B\u0430\u0439\u043D",
      description: "Draggable Timeline label"
    },
    enableMarkerLevel: {
      message: "\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0443\u0440\u043E\u0432\u043D\u0438 \u0443\u0437\u043B\u043E\u0432",
      description: "Enable timeline node level feature"
    },
    enableMarkerLevelHint: {
      message: "\u0429\u0435\u043B\u043A\u043D\u0438\u0442\u0435 \u043F\u0440\u0430\u0432\u043E\u0439 \u043A\u043D\u043E\u043F\u043A\u043E\u0439 \u043C\u044B\u0448\u0438 \u043F\u043E \u0443\u0437\u043B\u0430\u043C \u0442\u0430\u0439\u043C\u043B\u0430\u0439\u043D\u0430, \u0447\u0442\u043E\u0431\u044B \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C \u0438\u0445 \u0443\u0440\u043E\u0432\u0435\u043D\u044C \u0438 \u0441\u0432\u0435\u0440\u043D\u0443\u0442\u044C \u0434\u043E\u0447\u0435\u0440\u043D\u0438\u0435 \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u044B",
      description: "Node level feature hint"
    },
    experimentalLabel: {
      message: "\u042D\u043A\u0441\u043F\u0435\u0440\u0438\u043C\u0435\u043D\u0442\u0430\u043B\u044C\u043D\u043E",
      description: "Experimental feature label"
    },
    resetPosition: {
      message: "\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C \u043F\u043E\u0437\u0438\u0446\u0438\u044E",
      description: "Reset Position button"
    },
    resetTimelinePosition: {
      message: "\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C \u043F\u043E\u0437\u0438\u0446\u0438\u044E \u0442\u0430\u0439\u043C\u043B\u0430\u0439\u043D\u0430",
      description: "Reset timeline position button in timeline options"
    },
    language: {
      message: "\u042F\u0437\u044B\u043A",
      description: "Language label"
    },
    pm_title: {
      message: "Gemini Voyager",
      description: "Prompt Manager title"
    },
    pm_add: {
      message: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C",
      description: "Add prompt button"
    },
    pm_search_placeholder: {
      message: "\u041F\u043E\u0438\u0441\u043A \u043F\u0440\u043E\u043C\u043F\u0442\u043E\u0432 \u0438\u043B\u0438 \u0442\u0435\u0433\u043E\u0432",
      description: "Search placeholder"
    },
    pm_import: {
      message: "\u0418\u043C\u043F\u043E\u0440\u0442",
      description: "Import button"
    },
    pm_export: {
      message: "\u042D\u043A\u0441\u043F\u043E\u0440\u0442",
      description: "Export button"
    },
    pm_prompt_placeholder: {
      message: "\u0422\u0435\u043A\u0441\u0442 \u043F\u0440\u043E\u043C\u043F\u0442\u0430",
      description: "Prompt textarea placeholder"
    },
    pm_tags_placeholder: {
      message: "\u0422\u0435\u0433\u0438 (\u0447\u0435\u0440\u0435\u0437 \u0437\u0430\u043F\u044F\u0442\u0443\u044E)",
      description: "Tags input placeholder"
    },
    pm_save: {
      message: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C",
      description: "Save prompt"
    },
    pm_cancel: {
      message: "\u041E\u0442\u043C\u0435\u043D\u0430",
      description: "Cancel"
    },
    pm_all_tags: {
      message: "\u0412\u0441\u0435",
      description: "All tags chip"
    },
    pm_empty: {
      message: "\u041F\u0440\u043E\u043C\u043F\u0442\u043E\u0432 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442",
      description: "Empty state"
    },
    pm_copy: {
      message: "\u041A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C",
      description: "Copy prompt"
    },
    pm_copied: {
      message: "\u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u043E",
      description: "Copied notice"
    },
    pm_delete: {
      message: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C",
      description: "Delete prompt"
    },
    pm_delete_confirm: {
      message: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u044D\u0442\u043E\u0442 \u043F\u0440\u043E\u043C\u043F\u0442?",
      description: "Delete confirm"
    },
    pm_lock: {
      message: "\u0417\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043F\u043E\u0437\u0438\u0446\u0438\u044E",
      description: "Lock panel position"
    },
    pm_unlock: {
      message: "\u0420\u0430\u0437\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043F\u043E\u0437\u0438\u0446\u0438\u044E",
      description: "Unlock panel position"
    },
    pm_import_invalid: {
      message: "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0444\u043E\u0440\u043C\u0430\u0442 \u0444\u0430\u0439\u043B\u0430",
      description: "Import invalid"
    },
    pm_import_success: {
      message: "\u0418\u043C\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u043E {count} \u043F\u0440\u043E\u043C\u043F\u0442\u043E\u0432",
      description: "Import success"
    },
    pm_duplicate: {
      message: "\u0414\u0443\u0431\u043B\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043F\u0440\u043E\u043C\u043F\u0442",
      description: "Duplicate on add"
    },
    pm_deleted: {
      message: "\u0423\u0434\u0430\u043B\u0435\u043D\u043E",
      description: "Deleted notice"
    },
    pm_edit: {
      message: "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C",
      description: "Edit prompt"
    },
    pm_expand: {
      message: "\u0420\u0430\u0437\u0432\u0435\u0440\u043D\u0443\u0442\u044C",
      description: "Expand prompt text"
    },
    pm_collapse: {
      message: "\u0421\u0432\u0435\u0440\u043D\u0443\u0442\u044C",
      description: "Collapse prompt text"
    },
    pm_saved: {
      message: "\u0421\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E",
      description: "Saved notice"
    },
    pm_settings: {
      message: "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438",
      description: "Settings button"
    },
    pm_settings_tooltip: {
      message: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u0438\u044F",
      description: "Settings button tooltip"
    },
    pm_settings_fallback: {
      message: "\u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \u043D\u0430 \u0437\u043D\u0430\u0447\u043E\u043A \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u0438\u044F \u043D\u0430 \u043F\u0430\u043D\u0435\u043B\u0438 \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u043E\u0432 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0430, \u0447\u0442\u043E\u0431\u044B \u043E\u0442\u043A\u0440\u044B\u0442\u044C \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438",
      description: "Settings open failed message"
    },
    pm_backup: {
      message: "\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u043E\u0435 \u0440\u0435\u0437\u0435\u0440\u0432\u043D\u043E\u0435 \u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435",
      description: "Local backup button"
    },
    pm_backup_tooltip: {
      message: "\u0420\u0435\u0437\u0435\u0440\u0432\u043D\u043E\u0435 \u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u043F\u0440\u043E\u043C\u043F\u0442\u043E\u0432 \u0438 \u043F\u0430\u043F\u043E\u043A \u0432 \u043F\u0430\u043F\u043A\u0443 \u0441 \u043E\u0442\u043C\u0435\u0442\u043A\u043E\u0439 \u0432\u0440\u0435\u043C\u0435\u043D\u0438",
      description: "Backup button tooltip"
    },
    pm_backup_cancelled: {
      message: "\u0420\u0435\u0437\u0435\u0440\u0432\u043D\u043E\u0435 \u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u043E\u0442\u043C\u0435\u043D\u0435\u043D\u043E",
      description: "Backup cancelled hint"
    },
    pm_backup_error: {
      message: "\u2717 \u041E\u0448\u0438\u0431\u043A\u0430 \u0440\u0435\u0437\u0435\u0440\u0432\u043D\u043E\u0433\u043E \u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F",
      description: "Backup failed hint"
    },
    pm_backup_hint_options: {
      message: "\u042D\u0442\u0430 \u0444\u0443\u043D\u043A\u0446\u0438\u044F \u0438\u043D\u0442\u0435\u0433\u0440\u0438\u0440\u043E\u0432\u0430\u043D\u0430 \u0432 \u041C\u0435\u043D\u0435\u0434\u0436\u0435\u0440 \u043F\u0440\u043E\u043C\u043F\u0442\u043E\u0432 \u043D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0435 Gemini.",
      description: "Backup hint in options page"
    },
    pm_backup_step1: {
      message: "\u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443 Gemini (gemini.google.com)",
      description: "Backup step 1"
    },
    pm_backup_step2: {
      message: "\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u043D\u0430 \u0437\u043D\u0430\u0447\u043E\u043A \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u0438\u044F \u0432 \u043F\u0440\u0430\u0432\u043E\u043C \u043D\u0438\u0436\u043D\u0435\u043C \u0443\u0433\u043B\u0443, \u0447\u0442\u043E\u0431\u044B \u043E\u0442\u043A\u0440\u044B\u0442\u044C \u041C\u0435\u043D\u0435\u0434\u0436\u0435\u0440 \u043F\u0440\u043E\u043C\u043F\u0442\u043E\u0432",
      description: "Backup step 2"
    },
    pm_backup_step3: {
      message: '\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u043A\u043D\u043E\u043F\u043A\u0443 "\u{1F4BE} \u041B\u043E\u043A\u0430\u043B\u044C\u043D\u043E\u0435 \u0440\u0435\u0437\u0435\u0440\u0432\u043D\u043E\u0435 \u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435" \u0438 \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043F\u0430\u043F\u043A\u0443 \u0434\u043B\u044F \u0440\u0435\u0437\u0435\u0440\u0432\u043D\u043E\u0433\u043E \u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F',
      description: "Backup step 3"
    },
    pm_backup_note: {
      message: "\u0420\u0435\u0437\u0435\u0440\u0432\u043D\u044B\u0435 \u043A\u043E\u043F\u0438\u0438 \u0432\u043A\u043B\u044E\u0447\u0430\u044E\u0442 \u0432\u0441\u0435 \u043F\u0440\u043E\u043C\u043F\u0442\u044B \u0438 \u043F\u0430\u043F\u043A\u0438, \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043D\u044B\u0435 \u0432 \u043F\u0430\u043F\u043A\u0435 \u0441 \u043E\u0442\u043C\u0435\u0442\u043A\u043E\u0439 \u0432\u0440\u0435\u043C\u0435\u043D\u0438 (\u0444\u043E\u0440\u043C\u0430\u0442: backup-YYYYMMDD-HHMMSS)",
      description: "Backup feature note"
    },
    extensionVersion: {
      message: "\u0412\u0435\u0440\u0441\u0438\u044F",
      description: "Extension version label"
    },
    newVersionAvailable: {
      message: "\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u0430 \u043D\u043E\u0432\u0430\u044F \u0432\u0435\u0440\u0441\u0438\u044F",
      description: "Update reminder title"
    },
    currentVersionLabel: {
      message: "\u0422\u0435\u043A\u0443\u0449\u0430\u044F",
      description: "Label for current version number"
    },
    latestVersionLabel: {
      message: "\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u044F\u044F",
      description: "Label for latest version number"
    },
    updateNow: {
      message: "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C",
      description: "CTA to update to latest version"
    },
    starProject: {
      message: "\u041F\u043E\u0434\u0434\u0435\u0440\u0436\u0430\u0442\u044C \u043C\u0435\u043D\u044F \u2B50",
      description: "Github callout"
    },
    officialDocs: {
      message: "\u041E\u0444\u0438\u0446\u0438\u0430\u043B\u044C\u043D\u0430\u044F \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0430\u0446\u0438\u044F",
      description: "Official docs link"
    },
    exportChatJson: {
      message: "\u042D\u043A\u0441\u043F\u043E\u0440\u0442 \u0438\u0441\u0442\u043E\u0440\u0438\u0438 \u0434\u0438\u0430\u043B\u043E\u0433\u0430",
      description: "Tooltip for export button"
    },
    folder_title: {
      message: "\u041F\u0430\u043F\u043A\u0438",
      description: "Folder section title"
    },
    folder_create: {
      message: "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u043F\u0430\u043F\u043A\u0443",
      description: "Create folder button tooltip"
    },
    folder_name_prompt: {
      message: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0438\u043C\u044F \u043F\u0430\u043F\u043A\u0438:",
      description: "Create folder name prompt"
    },
    folder_rename_prompt: {
      message: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043D\u043E\u0432\u043E\u0435 \u0438\u043C\u044F:",
      description: "Rename folder prompt"
    },
    folder_delete_confirm: {
      message: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u044D\u0442\u0443 \u043F\u0430\u043F\u043A\u0443 \u0438 \u0432\u0441\u0435 \u0435\u0451 \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u043C\u043E\u0435?",
      description: "Delete folder confirmation"
    },
    folder_create_subfolder: {
      message: "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u043F\u043E\u0434\u043F\u0430\u043F\u043A\u0443",
      description: "Create subfolder menu item"
    },
    folder_rename: {
      message: "\u041F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u0442\u044C",
      description: "Rename folder menu item"
    },
    folder_change_color: {
      message: "\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u0446\u0432\u0435\u0442",
      description: "Change folder color menu item"
    },
    folder_delete: {
      message: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C",
      description: "Delete folder menu item"
    },
    folder_color_default: {
      message: "\u041F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E",
      description: "Default folder color name"
    },
    folder_color_red: {
      message: "\u041A\u0440\u0430\u0441\u043D\u044B\u0439",
      description: "Red folder color name"
    },
    folder_color_orange: {
      message: "\u041E\u0440\u0430\u043D\u0436\u0435\u0432\u044B\u0439",
      description: "Orange folder color name"
    },
    folder_color_yellow: {
      message: "\u0416\u0435\u043B\u0442\u044B\u0439",
      description: "Yellow folder color name"
    },
    folder_color_green: {
      message: "\u0417\u0435\u043B\u0435\u043D\u044B\u0439",
      description: "Green folder color name"
    },
    folder_color_blue: {
      message: "\u0421\u0438\u043D\u0438\u0439",
      description: "Blue folder color name"
    },
    folder_color_purple: {
      message: "\u0424\u0438\u043E\u043B\u0435\u0442\u043E\u0432\u044B\u0439",
      description: "Purple folder color name"
    },
    folder_color_pink: {
      message: "\u0420\u043E\u0437\u043E\u0432\u044B\u0439",
      description: "Pink folder color name"
    },
    folder_color_custom: {
      message: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C\u0441\u043A\u0438\u0439",
      description: "Custom folder color name"
    },
    folder_empty: {
      message: "\u041F\u0430\u043F\u043E\u043A \u043F\u043E\u043A\u0430 \u043D\u0435\u0442",
      description: "Empty state placeholder when no folders exist"
    },
    folder_pin: {
      message: "\u0417\u0430\u043A\u0440\u0435\u043F\u0438\u0442\u044C \u043F\u0430\u043F\u043A\u0443",
      description: "Pin folder menu item"
    },
    folder_unpin: {
      message: "\u041E\u0442\u043A\u0440\u0435\u043F\u0438\u0442\u044C \u043F\u0430\u043F\u043A\u0443",
      description: "Unpin folder menu item"
    },
    folder_remove_conversation: {
      message: "\u0423\u0431\u0440\u0430\u0442\u044C \u0438\u0437 \u043F\u0430\u043F\u043A\u0438",
      description: "Remove conversation button tooltip"
    },
    folder_remove_conversation_confirm: {
      message: '\u0423\u0431\u0440\u0430\u0442\u044C "{title}" \u0438\u0437 \u044D\u0442\u043E\u0439 \u043F\u0430\u043F\u043A\u0438?',
      description: "Remove conversation confirmation"
    },
    conversation_more: {
      message: "\u0411\u043E\u043B\u044C\u0448\u0435 \u043E\u043F\u0446\u0438\u0439",
      description: "Conversation more options button tooltip"
    },
    conversation_move_to_folder: {
      message: "\u041F\u0435\u0440\u0435\u043C\u0435\u0441\u0442\u0438\u0442\u044C \u0432 \u043F\u0430\u043F\u043A\u0443",
      description: "Move conversation to folder menu item"
    },
    conversation_move_to_folder_title: {
      message: "\u041F\u0435\u0440\u0435\u043C\u0435\u0441\u0442\u0438\u0442\u044C \u0432 \u043F\u0430\u043F\u043A\u0443",
      description: "Move conversation to folder dialog title"
    },
    chatWidth: {
      message: "\u0428\u0438\u0440\u0438\u043D\u0430 \u0447\u0430\u0442\u0430",
      description: "Chat width adjustment label"
    },
    chatWidthNarrow: {
      message: "\u0423\u0437\u043A\u0430\u044F",
      description: "Narrow chat width label"
    },
    chatWidthWide: {
      message: "\u0428\u0438\u0440\u043E\u043A\u0430\u044F",
      description: "Wide chat width label"
    },
    sidebarWidth: {
      message: "\u0428\u0438\u0440\u0438\u043D\u0430 \u0431\u043E\u043A\u043E\u0432\u043E\u0439 \u043F\u0430\u043D\u0435\u043B\u0438",
      description: "Sidebar width adjustment label"
    },
    sidebarWidthNarrow: {
      message: "\u0423\u0437\u043A\u0430\u044F",
      description: "Narrow sidebar width label"
    },
    sidebarWidthWide: {
      message: "\u0428\u0438\u0440\u043E\u043A\u0430\u044F",
      description: "Wide sidebar width label"
    },
    formula_copied: {
      message: "\u2713 \u0424\u043E\u0440\u043C\u0443\u043B\u0430 \u0441\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u0430",
      description: "Formula copied success message"
    },
    formula_copy_failed: {
      message: "\u2717 \u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C",
      description: "Formula copy failed message"
    },
    formulaCopyFormat: {
      message: "\u0424\u043E\u0440\u043C\u0430\u0442 \u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F \u0444\u043E\u0440\u043C\u0443\u043B\u044B",
      description: "Formula copy format setting label"
    },
    formulaCopyFormatLatex: {
      message: "LaTeX",
      description: "LaTeX format option"
    },
    formulaCopyFormatUnicodeMath: {
      message: "MathML (Word)",
      description: "Label for MathML formula copy format option (formerly UnicodeMath)"
    },
    formulaCopyFormatHint: {
      message: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0444\u043E\u0440\u043C\u0430\u0442 \u043F\u0440\u0438 \u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0438 \u0444\u043E\u0440\u043C\u0443\u043B \u0449\u0435\u043B\u0447\u043A\u043E\u043C \u043C\u044B\u0448\u0438",
      description: "Formula copy format hint"
    },
    formulaCopyFormatNoDollar: {
      message: "LaTeX (\u0431\u0435\u0437 \u0437\u043D\u0430\u043A\u0430 \u0434\u043E\u043B\u043B\u0430\u0440\u0430)",
      description: "LaTeX format option without dollar signs"
    },
    folder_filter_current_user: {
      message: "\u0418\u0437\u043E\u043B\u044F\u0446\u0438\u044F \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u043E\u0432",
      description: "Show only conversations from the current Google account"
    },
    folder_export: {
      message: "\u042D\u043A\u0441\u043F\u043E\u0440\u0442 \u043F\u0430\u043F\u043E\u043A",
      description: "Export folders button tooltip"
    },
    folder_import_export: {
      message: "\u0418\u043C\u043F\u043E\u0440\u0442/\u042D\u043A\u0441\u043F\u043E\u0440\u0442 \u043F\u0430\u043F\u043E\u043A",
      description: "Combined import/export button tooltip"
    },
    folder_cloud_upload: {
      message: "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0432 \u043E\u0431\u043B\u0430\u043A\u043E",
      description: "Cloud upload button tooltip"
    },
    folder_cloud_sync: {
      message: "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0438\u0437 \u043E\u0431\u043B\u0430\u043A\u0430",
      description: "Cloud sync button tooltip"
    },
    folder_import: {
      message: "\u0418\u043C\u043F\u043E\u0440\u0442 \u043F\u0430\u043F\u043E\u043A",
      description: "Import folders button tooltip"
    },
    folder_import_title: {
      message: "\u0418\u043C\u043F\u043E\u0440\u0442 \u043A\u043E\u043D\u0444\u0438\u0433\u0443\u0440\u0430\u0446\u0438\u0438 \u043F\u0430\u043F\u043E\u043A",
      description: "Import dialog title"
    },
    folder_import_strategy: {
      message: "\u0421\u0442\u0440\u0430\u0442\u0435\u0433\u0438\u044F \u0438\u043C\u043F\u043E\u0440\u0442\u0430:",
      description: "Import strategy label"
    },
    folder_import_merge: {
      message: "\u041E\u0431\u044A\u0435\u0434\u0438\u043D\u0438\u0442\u044C \u0441 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u044E\u0449\u0438\u043C\u0438 \u043F\u0430\u043F\u043A\u0430\u043C\u0438",
      description: "Merge import strategy"
    },
    folder_import_overwrite: {
      message: "\u041F\u0435\u0440\u0435\u0437\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u044E\u0449\u0438\u0435 \u043F\u0430\u043F\u043A\u0438",
      description: "Overwrite import strategy"
    },
    folder_import_select_file: {
      message: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0444\u0430\u0439\u043B JSON \u0434\u043B\u044F \u0438\u043C\u043F\u043E\u0440\u0442\u0430",
      description: "Import file selection prompt"
    },
    folder_import_success: {
      message: "\u2713 \u0418\u043C\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u043E \u043F\u0430\u043F\u043E\u043A: {folders}, \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u043E\u0432: {conversations}",
      description: "Import success message"
    },
    folder_import_success_skipped: {
      message: "\u2713 \u0418\u043C\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u043E \u043F\u0430\u043F\u043E\u043A: {folders}, \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u043E\u0432: {conversations} ({skipped} \u0434\u0443\u0431\u043B\u0438\u043A\u0430\u0442\u043E\u0432 \u043F\u0440\u043E\u043F\u0443\u0449\u0435\u043D\u043E)",
      description: "Import success with skipped message"
    },
    folder_import_error: {
      message: "\u2717 \u041E\u0448\u0438\u0431\u043A\u0430 \u0438\u043C\u043F\u043E\u0440\u0442\u0430: {error}",
      description: "Import error message"
    },
    folder_export_success: {
      message: "\u2713 \u041F\u0430\u043F\u043A\u0438 \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u044B",
      description: "Export success message"
    },
    folder_import_invalid_format: {
      message: "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0444\u043E\u0440\u043C\u0430\u0442 \u0444\u0430\u0439\u043B\u0430. \u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u044B\u0439 \u0444\u0430\u0439\u043B \u043A\u043E\u043D\u0444\u0438\u0433\u0443\u0440\u0430\u0446\u0438\u0438 \u043F\u0430\u043F\u043E\u043A.",
      description: "Invalid format error"
    },
    folder_import_confirm_overwrite: {
      message: "\u042D\u0442\u043E \u0437\u0430\u043C\u0435\u043D\u0438\u0442 \u0432\u0441\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u044E\u0449\u0438\u0435 \u043F\u0430\u043F\u043A\u0438. \u0411\u0443\u0434\u0435\u0442 \u0441\u043E\u0437\u0434\u0430\u043D\u0430 \u0440\u0435\u0437\u0435\u0440\u0432\u043D\u0430\u044F \u043A\u043E\u043F\u0438\u044F. \u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C?",
      description: "Overwrite confirmation"
    },
    export_dialog_title: {
      message: "\u042D\u043A\u0441\u043F\u043E\u0440\u0442 \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u0430",
      description: "Export dialog title"
    },
    export_dialog_select: {
      message: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0444\u043E\u0440\u043C\u0430\u0442 \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u0430:",
      description: "Export format selection label"
    },
    export_dialog_warning: {
      message: "\u26A0\uFE0F \u041F\u043E\u0441\u043B\u0435 \u043D\u0430\u0436\u0430\u0442\u0438\u044F \u043D\u0430 \u044D\u043A\u0441\u043F\u043E\u0440\u0442 \u0441\u0438\u0441\u0442\u0435\u043C\u0430 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u043F\u0435\u0440\u0435\u0439\u0434\u0435\u0442 \u043A \u043F\u0435\u0440\u0432\u043E\u043C\u0443 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044E \u0434\u043B\u044F \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0432\u0441\u0435\u0433\u043E \u043A\u043E\u043D\u0442\u0435\u043D\u0442\u0430. \u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u043D\u0435 \u0441\u043E\u0432\u0435\u0440\u0448\u0430\u0439\u0442\u0435 \u043D\u0438\u043A\u0430\u043A\u0438\u0445 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0439; \u044D\u043A\u0441\u043F\u043E\u0440\u0442 \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u043F\u043E\u0441\u043B\u0435 \u043F\u0435\u0440\u0435\u0445\u043E\u0434\u0430.",
      description: "Warning about auto-jump and loading completeness"
    },
    export_dialog_safari_cmdp_hint: {
      message: "\u0421\u043E\u0432\u0435\u0442 \u0434\u043B\u044F Safari: \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u042D\u043A\u0441\u043F\u043E\u0440\u0442\xBB \u043D\u0438\u0436\u0435, \u043F\u043E\u0434\u043E\u0436\u0434\u0438\u0442\u0435 \u043D\u0435\u043C\u043D\u043E\u0433\u043E, \u0437\u0430\u0442\u0435\u043C \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \u2318P \u0438 \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \xAB\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u043A\u0430\u043A PDF\xBB.",
      description: "Safari-specific hint for PDF export"
    },
    export_toast_safari_pdf_ready: {
      message: "\u0422\u0435\u043F\u0435\u0440\u044C \u043C\u043E\u0436\u043D\u043E \u043D\u0430\u0436\u0430\u0442\u044C Command + P, \u0447\u0442\u043E\u0431\u044B \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C PDF.",
      description: "Safari-specific toast shown after PDF export is prepared"
    },
    export_dialog_safari_markdown_hint: {
      message: "\u041F\u0440\u0438\u043C\u0435\u0447\u0430\u043D\u0438\u0435: \u0438\u0437-\u0437\u0430 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u0439 Safari \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F \u0438\u0437 \u0438\u0441\u0442\u043E\u0440\u0438\u0438 \u0447\u0430\u0442\u0430 \u0438\u0437\u0432\u043B\u0435\u0447\u044C \u043D\u0435\u043B\u044C\u0437\u044F. \u0414\u043B\u044F \u043F\u043E\u043B\u043D\u043E\u0433\u043E \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u0430 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u044D\u043A\u0441\u043F\u043E\u0440\u0442 \u0432 PDF.",
      description: "Warning about image references in Safari markdown export"
    },
    export_format_json_description: {
      message: "\u041C\u0430\u0448\u0438\u043D\u043E\u0447\u0438\u0442\u0430\u0435\u043C\u044B\u0439 \u0444\u043E\u0440\u043C\u0430\u0442 \u0434\u043B\u044F \u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u0447\u0438\u043A\u043E\u0432",
      description: "Description for JSON export format"
    },
    export_format_markdown_description: {
      message: "\u0427\u0438\u0441\u0442\u044B\u0439 \u0442\u0435\u043A\u0441\u0442\u043E\u0432\u044B\u0439 \u0444\u043E\u0440\u043C\u0430\u0442 (\u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0443\u0435\u0442\u0441\u044F)",
      description: "Description for Markdown export format"
    },
    export_format_pdf_description: {
      message: "\u0424\u043E\u0440\u043C\u0430\u0442 \u0434\u043B\u044F \u043F\u0435\u0447\u0430\u0442\u0438 (\u0447\u0435\u0440\u0435\u0437 \u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u043A\u0430\u043A PDF)",
      description: "Description for PDF export format"
    },
    editInputWidth: {
      message: "\u0428\u0438\u0440\u0438\u043D\u0430 \u043F\u043E\u043B\u044F \u0432\u0432\u043E\u0434\u0430",
      description: "Edit input width adjustment label"
    },
    editInputWidthNarrow: {
      message: "\u0423\u0437\u043A\u0430\u044F",
      description: "Narrow edit input width label"
    },
    editInputWidthWide: {
      message: "\u0428\u0438\u0440\u043E\u043A\u0430\u044F",
      description: "Wide edit input width label"
    },
    timelineOptions: {
      message: "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0442\u0430\u0439\u043C\u043B\u0430\u0439\u043D\u0430",
      description: "Timeline options section label"
    },
    folderOptions: {
      message: "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u043F\u0430\u043F\u043E\u043A",
      description: "Folder options section label"
    },
    enableFolderFeature: {
      message: "\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0444\u0443\u043D\u043A\u0446\u0438\u044E \u043F\u0430\u043F\u043E\u043A",
      description: "Enable or disable the folder feature"
    },
    hideArchivedConversations: {
      message: "\u0421\u043A\u0440\u044B\u0442\u044C \u0430\u0440\u0445\u0438\u0432\u043D\u044B\u0435 \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u044B",
      description: "Hide conversations that are in folders from the main list"
    },
    conversation_star: {
      message: "\u041F\u043E\u043C\u0435\u0442\u0438\u0442\u044C \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440",
      description: "Star conversation button tooltip"
    },
    conversation_unstar: {
      message: "\u0421\u043D\u044F\u0442\u044C \u043F\u043E\u043C\u0435\u0442\u043A\u0443",
      description: "Unstar conversation button tooltip"
    },
    conversation_untitled: {
      message: "\u0411\u0435\u0437 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044F",
      description: "Fallback title for conversations without a name"
    },
    geminiOnlyNotice: {
      message: "\u0420\u0430\u0431\u043E\u0442\u0430\u0435\u0442 \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E \u0432 Gemini (\u0432\u043A\u043B\u044E\u0447\u0430\u044F Enterprise) \u0438 AI Studio. \u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0434\u0440\u0443\u0433\u0438\u0435 \u0441\u0430\u0439\u0442\u044B \u043D\u0438\u0436\u0435, \u0447\u0442\u043E\u0431\u044B \u0432\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0442\u0430\u043C \u041C\u0435\u043D\u0435\u0434\u0436\u0435\u0440 \u043F\u0440\u043E\u043C\u043F\u0442\u043E\u0432.",
      description: "Notice that defaults are limited to Gemini/AI Studio"
    },
    folderManager_dataLossWarning: {
      message: "\u26A0\uFE0F \u0412\u043D\u0438\u043C\u0430\u043D\u0438\u0435: \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0434\u0430\u043D\u043D\u044B\u0435 \u043F\u0430\u043F\u043E\u043A. \u0412\u0430\u0448\u0438 \u043F\u0430\u043F\u043A\u0438 \u043C\u043E\u0433\u0443\u0442 \u0431\u044B\u0442\u044C \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0435\u043D\u044B. \u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043A\u043E\u043D\u0441\u043E\u043B\u044C \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0430 \u0434\u043B\u044F \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u044F \u043F\u043E\u0434\u0440\u043E\u0431\u043D\u043E\u0439 \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u0438 \u0438 \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0432\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C \u0438\u0437 \u0440\u0435\u0437\u0435\u0440\u0432\u043D\u043E\u0439 \u043A\u043E\u043F\u0438\u0438, \u0435\u0441\u043B\u0438 \u043E\u043D\u0430 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430.",
      description: "Warning shown when folder data fails to load"
    },
    backupOptions: {
      message: "\u0410\u0432\u0442\u043E-\u0440\u0435\u0437\u0435\u0440\u0432\u043D\u043E\u0435 \u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435",
      description: "Backup options section label"
    },
    backupEnabled: {
      message: "\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0430\u0432\u0442\u043E-\u0431\u044D\u043A\u0430\u043F",
      description: "Enable auto backup toggle"
    },
    backupNow: {
      message: "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0431\u044D\u043A\u0430\u043F \u0441\u0435\u0439\u0447\u0430\u0441",
      description: "Backup now button"
    },
    backupSelectFolder: {
      message: "\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u043F\u0430\u043F\u043A\u0443 \u0434\u043B\u044F \u0431\u044D\u043A\u0430\u043F\u0430",
      description: "Select backup folder button"
    },
    backupFolderSelected: {
      message: "\u041F\u0430\u043F\u043A\u0430 \u0434\u043B\u044F \u0431\u044D\u043A\u0430\u043F\u0430: {folder}",
      description: "Shows selected backup folder"
    },
    backupIncludePrompts: {
      message: "\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u043F\u0440\u043E\u043C\u043F\u0442\u044B",
      description: "Include prompts in backup toggle"
    },
    backupIncludeFolders: {
      message: "\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u043F\u0430\u043F\u043A\u0438",
      description: "Include folders in backup toggle"
    },
    backupIntervalLabel: {
      message: "\u0418\u043D\u0442\u0435\u0440\u0432\u0430\u043B \u0431\u044D\u043A\u0430\u043F\u0430",
      description: "Backup interval label"
    },
    backupIntervalManual: {
      message: "\u0422\u043E\u043B\u044C\u043A\u043E \u0432\u0440\u0443\u0447\u043D\u0443\u044E",
      description: "Manual backup mode"
    },
    backupIntervalDaily: {
      message: "\u0415\u0436\u0435\u0434\u043D\u0435\u0432\u043D\u043E",
      description: "Daily backup interval"
    },
    backupIntervalWeekly: {
      message: "\u0415\u0436\u0435\u043D\u0435\u0434\u0435\u043B\u044C\u043D\u043E (7 \u0434\u043D\u0435\u0439)",
      description: "Weekly backup interval"
    },
    backupLastBackup: {
      message: "\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0439 \u0431\u044D\u043A\u0430\u043F: {time}",
      description: "Last backup timestamp"
    },
    backupNever: {
      message: "\u041D\u0438\u043A\u043E\u0433\u0434\u0430",
      description: "Never backed up"
    },
    backupSuccess: {
      message: "\u2713 \u0411\u044D\u043A\u0430\u043F \u0441\u043E\u0437\u0434\u0430\u043D: {prompts} \u043F\u0440\u043E\u043C\u043F\u0442\u043E\u0432, {folders} \u043F\u0430\u043F\u043E\u043A, {conversations} \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u043E\u0432",
      description: "Backup success message"
    },
    backupError: {
      message: "\u2717 \u041E\u0448\u0438\u0431\u043A\u0430 \u0431\u044D\u043A\u0430\u043F\u0430: {error}",
      description: "Backup error message"
    },
    backupNotSupported: {
      message: "\u26A0\uFE0F \u0410\u0432\u0442\u043E-\u0431\u044D\u043A\u0430\u043F \u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u0441\u043E\u0432\u0440\u0435\u043C\u0435\u043D\u043D\u044B\u0439 \u0431\u0440\u0430\u0443\u0437\u0435\u0440 \u0441 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u043E\u0439 File System Access API",
      description: "Browser not supported message"
    },
    backupSelectFolderFirst: {
      message: "\u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043F\u0430\u043F\u043A\u0443 \u0434\u043B\u044F \u0431\u044D\u043A\u0430\u043F\u0430",
      description: "No folder selected warning"
    },
    backupUserCancelled: {
      message: "\u0411\u044D\u043A\u0430\u043F \u043E\u0442\u043C\u0435\u043D\u0435\u043D",
      description: "User cancelled folder selection"
    },
    backupConfigSaved: {
      message: "\u2713 \u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0431\u044D\u043A\u0430\u043F\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u044B",
      description: "Config saved message"
    },
    backupPermissionDenied: {
      message: "\u26A0\uFE0F \u041D\u0435\u0442 \u0434\u043E\u0441\u0442\u0443\u043F\u0430 \u043A \u044D\u0442\u043E\u0439 \u0434\u0438\u0440\u0435\u043A\u0442\u043E\u0440\u0438\u0438. \u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0434\u0440\u0443\u0433\u043E\u0435 \u043C\u0435\u0441\u0442\u043E (\u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440, \u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u044B, \u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0438\u043B\u0438 \u043F\u0430\u043F\u043A\u0443 \u043D\u0430 \u0420\u0430\u0431\u043E\u0447\u0435\u043C \u0441\u0442\u043E\u043B\u0435)",
      description: "Permission denied for restricted directory"
    },
    backupConfigureInOptions: {
      message: "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430 \u0431\u044D\u043A\u0430\u043F\u0430 \u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B \u041E\u043F\u0446\u0438\u0439. \u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u043A\u043D\u043E\u043F\u043A\u0443 \u043D\u0438\u0436\u0435, \u0447\u0442\u043E\u0431\u044B \u043E\u0442\u043A\u0440\u044B\u0442\u044C \u0435\u0451 (\u043D\u0430\u0436\u043C\u0438\u0442\u0435 \u0442\u0440\u0438 \u0442\u043E\u0447\u043A\u0438 \u0440\u044F\u0434\u043E\u043C \u0441\u043E \u0437\u043D\u0430\u0447\u043A\u043E\u043C \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u0438\u044F \u2192 \u041E\u043F\u0446\u0438\u0438).",
      description: "Backup configure in options page explanation"
    },
    openOptionsPage: {
      message: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443 \u041E\u043F\u0446\u0438\u0439",
      description: "Open options page button"
    },
    optionsPageSubtitle: {
      message: "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u0438\u044F",
      description: "Options page subtitle"
    },
    optionsComingSoon: {
      message: "\u0411\u043E\u043B\u044C\u0448\u0435 \u043E\u043F\u0446\u0438\u0439 \u0441\u043A\u043E\u0440\u043E...",
      description: "Options page placeholder text"
    },
    backupDataAccessNotice: {
      message: "\u041E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u0435 \u0434\u043E\u0441\u0442\u0443\u043F\u0430 \u043A \u0434\u0430\u043D\u043D\u044B\u043C",
      description: "Backup data access limitation title"
    },
    backupDataAccessHint: {
      message: "\u0418\u0437-\u0437\u0430 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u0439 \u0431\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u043E\u0441\u0442\u0438 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0430 \u044D\u0442\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0430 \u041E\u043F\u0446\u0438\u0439 \u043D\u0435 \u043C\u043E\u0436\u0435\u0442 \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u043F\u0440\u044F\u043C\u043E\u0439 \u0434\u043E\u0441\u0442\u0443\u043F \u043A \u043F\u0440\u043E\u043C\u043F\u0442\u0430\u043C \u0438 \u043F\u0430\u043F\u043A\u0430\u043C \u0441\u043E \u0441\u0442\u0440\u0430\u043D\u0438\u0446 Gemini. \u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u0444\u0443\u043D\u043A\u0446\u0438\u0438 \u041C\u0435\u043D\u0435\u0434\u0436\u0435\u0440\u0430 \u043F\u0440\u043E\u043C\u043F\u0442\u043E\u0432 \u0438 \u042D\u043A\u0441\u043F\u043E\u0440\u0442\u0430 \u043F\u0430\u043F\u043E\u043A \u043D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0435 Gemini \u0434\u043B\u044F \u0440\u0443\u0447\u043D\u043E\u0433\u043E \u0440\u0435\u0437\u0435\u0440\u0432\u043D\u043E\u0433\u043E \u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F.",
      description: "Backup data access limitation explanation"
    },
    promptManagerOptions: {
      message: "\u041C\u0435\u043D\u0435\u0434\u0436\u0435\u0440 \u043F\u0440\u043E\u043C\u043F\u0442\u043E\u0432",
      description: "Prompt Manager options section label"
    },
    hidePromptManager: {
      message: "\u0421\u043A\u0440\u044B\u0442\u044C \u041C\u0435\u043D\u0435\u0434\u0436\u0435\u0440 \u043F\u0440\u043E\u043C\u043F\u0442\u043E\u0432",
      description: "Hide the prompt manager floating ball"
    },
    hidePromptManagerHint: {
      message: "\u0421\u043A\u0440\u044B\u0442\u044C \u043F\u043B\u0430\u0432\u0430\u044E\u0449\u0443\u044E \u043A\u043D\u043E\u043F\u043A\u0443 \u041C\u0435\u043D\u0435\u0434\u0436\u0435\u0440\u0430 \u043F\u0440\u043E\u043C\u043F\u0442\u043E\u0432 \u043D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0435",
      description: "Hint for hiding prompt manager feature"
    },
    customWebsites: {
      message: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C\u0441\u043A\u0438\u0435 \u0441\u0430\u0439\u0442\u044B",
      description: "Custom websites for prompt manager"
    },
    customWebsitesPlaceholder: {
      message: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 URL \u0441\u0430\u0439\u0442\u0430 (\u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440, chatgpt.com)",
      description: "Custom websites input placeholder"
    },
    customWebsitesHint: {
      message: "\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0441\u0430\u0439\u0442\u044B, \u043D\u0430 \u043A\u043E\u0442\u043E\u0440\u044B\u0445 \u0432\u044B \u0445\u043E\u0442\u0438\u0442\u0435 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C \u041C\u0435\u043D\u0435\u0434\u0436\u0435\u0440 \u043F\u0440\u043E\u043C\u043F\u0442\u043E\u0432. \u0422\u043E\u043B\u044C\u043A\u043E \u041C\u0435\u043D\u0435\u0434\u0436\u0435\u0440 \u043F\u0440\u043E\u043C\u043F\u0442\u043E\u0432 \u0431\u0443\u0434\u0435\u0442 \u0430\u043A\u0442\u0438\u0432\u0438\u0440\u043E\u0432\u0430\u043D \u043D\u0430 \u044D\u0442\u0438\u0445 \u0441\u0430\u0439\u0442\u0430\u0445.",
      description: "Custom websites hint"
    },
    addWebsite: {
      message: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0441\u0430\u0439\u0442",
      description: "Add website button"
    },
    removeWebsite: {
      message: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C",
      description: "Remove website button"
    },
    invalidUrl: {
      message: "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0444\u043E\u0440\u043C\u0430\u0442 URL",
      description: "Invalid URL error message"
    },
    websiteAdded: {
      message: "\u0421\u0430\u0439\u0442 \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D",
      description: "Website added success message"
    },
    websiteRemoved: {
      message: "\u0421\u0430\u0439\u0442 \u0443\u0434\u0430\u043B\u0435\u043D",
      description: "Website removed success message"
    },
    permissionDenied: {
      message: "\u0412 \u0434\u043E\u0441\u0442\u0443\u043F\u0435 \u043E\u0442\u043A\u0430\u0437\u0430\u043D\u043E. \u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u0440\u0430\u0437\u0440\u0435\u0448\u0438\u0442\u0435 \u0434\u043E\u0441\u0442\u0443\u043F \u043A \u044D\u0442\u043E\u043C\u0443 \u0441\u0430\u0439\u0442\u0443.",
      description: "Permission denied error message"
    },
    permissionRequestFailed: {
      message: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u043F\u0440\u043E\u0441\u0438\u0442\u044C \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u0435. \u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0441\u043D\u043E\u0432\u0430 \u0438\u043B\u0438 \u043F\u0440\u0435\u0434\u043E\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u0434\u043E\u0441\u0442\u0443\u043F \u0432 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430\u0445 \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u0438\u044F.",
      description: "Permission request failure message"
    },
    customWebsitesNote: {
      message: "\u0421\u043E\u0432\u0435\u0442: \u0412\u0430\u0441 \u043F\u043E\u043F\u0440\u043E\u0441\u044F\u0442 \u0440\u0430\u0437\u0440\u0435\u0448\u0438\u0442\u044C \u0434\u043E\u0441\u0442\u0443\u043F \u043F\u0440\u0438 \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0438\u0438 \u0441\u0430\u0439\u0442\u0430. \u041F\u043E\u0441\u043B\u0435 \u043F\u0440\u0435\u0434\u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u0438\u044F \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u044F \u043F\u0435\u0440\u0435\u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u044D\u0442\u043E\u0442 \u0441\u0430\u0439\u0442, \u0447\u0442\u043E\u0431\u044B \u041C\u0435\u043D\u0435\u0434\u0436\u0435\u0440 \u043F\u0440\u043E\u043C\u043F\u0442\u043E\u0432 \u043C\u043E\u0433 \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C\u0441\u044F.",
      description: "Custom websites reload/permission note"
    },
    starredHistory: {
      message: "\u0418\u0437\u0431\u0440\u0430\u043D\u043D\u0430\u044F \u0438\u0441\u0442\u043E\u0440\u0438\u044F",
      description: "Starred history title"
    },
    viewStarredHistory: {
      message: "\u041F\u0440\u043E\u0441\u043C\u043E\u0442\u0440 \u0438\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u0439 \u0438\u0441\u0442\u043E\u0440\u0438\u0438",
      description: "View starred history button"
    },
    noStarredMessages: {
      message: "\u041D\u0435\u0442 \u0438\u0437\u0431\u0440\u0430\u043D\u043D\u044B\u0445 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0439",
      description: "No starred messages placeholder"
    },
    removeFromStarred: {
      message: "\u0423\u0431\u0440\u0430\u0442\u044C \u0438\u0437 \u0438\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u0433\u043E",
      description: "Remove from starred tooltip"
    },
    justNow: {
      message: "\u0422\u043E\u043B\u044C\u043A\u043E \u0447\u0442\u043E",
      description: "Just now time label"
    },
    hoursAgo: {
      message: "\u0447. \u043D\u0430\u0437\u0430\u0434",
      description: "Hours ago label"
    },
    yesterday: {
      message: "\u0412\u0447\u0435\u0440\u0430",
      description: "Yesterday date label"
    },
    daysAgo: {
      message: "\u0434\u043D. \u043D\u0430\u0437\u0430\u0434",
      description: "Days ago label"
    },
    loading: {
      message: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430...",
      description: "Loading message"
    },
    keyboardShortcuts: {
      message: "\u0413\u043E\u0440\u044F\u0447\u0438\u0435 \u043A\u043B\u0430\u0432\u0438\u0448\u0438",
      description: "Keyboard shortcuts section title"
    },
    enableShortcuts: {
      message: "\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0433\u043E\u0440\u044F\u0447\u0438\u0435 \u043A\u043B\u0430\u0432\u0438\u0448\u0438",
      description: "Enable shortcuts toggle label"
    },
    previousNode: {
      message: "\u041F\u0440\u0435\u0434\u044B\u0434\u0443\u0449\u0438\u0439 \u0443\u0437\u0435\u043B",
      description: "Previous timeline node shortcut label"
    },
    nextNode: {
      message: "\u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0439 \u0443\u0437\u0435\u043B",
      description: "Next timeline node shortcut label"
    },
    shortcutKey: {
      message: "\u041A\u043B\u0430\u0432\u0438\u0448\u0430",
      description: "Shortcut key label"
    },
    shortcutModifiers: {
      message: "\u041C\u043E\u0434\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440\u044B",
      description: "Shortcut modifiers label"
    },
    resetShortcuts: {
      message: "\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E",
      description: "Reset shortcuts button"
    },
    shortcutsResetSuccess: {
      message: "\u0413\u043E\u0440\u044F\u0447\u0438\u0435 \u043A\u043B\u0430\u0432\u0438\u0448\u0438 \u0441\u0431\u0440\u043E\u0448\u0435\u043D\u044B",
      description: "Shortcuts reset success message"
    },
    shortcutsDescription: {
      message: "\u041D\u0430\u0432\u0438\u0433\u0430\u0446\u0438\u044F \u043F\u043E \u0443\u0437\u043B\u0430\u043C \u0442\u0430\u0439\u043C\u043B\u0430\u0439\u043D\u0430 \u0441 \u043F\u043E\u043C\u043E\u0449\u044C\u044E \u043A\u043B\u0430\u0432\u0438\u0430\u0442\u0443\u0440\u044B",
      description: "Shortcuts description"
    },
    modifierNone: {
      message: "\u041D\u0435\u0442",
      description: "No modifier key"
    },
    modifierAlt: {
      message: "Alt",
      description: "Alt modifier key"
    },
    modifierCtrl: {
      message: "Ctrl",
      description: "Ctrl modifier key"
    },
    modifierShift: {
      message: "Shift",
      description: "Shift modifier key"
    },
    modifierMeta: {
      message: "Cmd/Win",
      description: "Meta/Command/Windows modifier key"
    },
    cloudSync: {
      message: "\u041E\u0431\u043B\u0430\u0447\u043D\u0430\u044F \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F",
      description: "Cloud sync section title"
    },
    cloudSyncDescription: {
      message: "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F \u043F\u0430\u043F\u043E\u043A \u0438 \u043F\u0440\u043E\u043C\u043F\u0442\u043E\u0432 \u0441 Google Drive",
      description: "Cloud sync description"
    },
    syncModeDisabled: {
      message: "\u041E\u0442\u043A\u043B\u044E\u0447\u0435\u043D\u043E",
      description: "Sync mode disabled option"
    },
    syncModeManual: {
      message: "\u0412\u0440\u0443\u0447\u043D\u0443\u044E",
      description: "Sync mode manual option"
    },
    syncServerPort: {
      message: "\u041F\u043E\u0440\u0442 \u0441\u0435\u0440\u0432\u0435\u0440\u0430",
      description: "Port number for the sync server"
    },
    syncNow: {
      message: "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0441\u0435\u0439\u0447\u0430\u0441",
      description: "Sync now button"
    },
    lastSynced: {
      message: "\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u044F\u044F \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F: {time}",
      description: "Last sync timestamp"
    },
    neverSynced: {
      message: "\u041D\u0438\u043A\u043E\u0433\u0434\u0430 \u043D\u0435 \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u043B\u043E\u0441\u044C",
      description: "Never synced message"
    },
    lastUploaded: {
      message: "\u0417\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043E: {time}",
      description: "Last upload timestamp"
    },
    neverUploaded: {
      message: "\u041D\u0438\u043A\u043E\u0433\u0434\u0430 \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0430\u043B\u043E\u0441\u044C",
      description: "Never uploaded message"
    },
    syncSuccess: {
      message: "\u2713 \u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F \u0443\u0441\u043F\u0435\u0448\u043D\u0430",
      description: "Sync success message"
    },
    syncError: {
      message: "\u2717 \u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u0438: {error}",
      description: "Sync error message"
    },
    syncInProgress: {
      message: "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F...",
      description: "Sync in progress message"
    },
    uploadInProgress: {
      message: "Uploading...",
      description: "Upload in progress message"
    },
    uploadSuccess: {
      message: "\u2713 Uploaded successfully",
      description: "Upload success message"
    },
    downloadInProgress: {
      message: "Downloading...",
      description: "Download in progress message"
    },
    downloadMergeSuccess: {
      message: "\u2713 Downloaded and merged",
      description: "Download and merge success message"
    },
    syncUpload: {
      message: "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C",
      description: "Upload button label"
    },
    syncMerge: {
      message: "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F",
      description: "Merge button label"
    },
    syncMode: {
      message: "\u0420\u0435\u0436\u0438\u043C \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u0438",
      description: "Sync mode label"
    },
    minutesAgo: {
      message: "\u043C\u0438\u043D. \u043D\u0430\u0437\u0430\u0434",
      description: "Minutes ago label"
    },
    syncNoData: {
      message: "\u0414\u0430\u043D\u043D\u044B\u0435 \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u0438 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B \u0432 Drive",
      description: "Error message when no data is found in Drive"
    },
    syncUploadFailed: {
      message: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u043D\u0435 \u0443\u0434\u0430\u043B\u0430\u0441\u044C",
      description: "Error message when upload fails"
    },
    syncDownloadFailed: {
      message: "\u0421\u043A\u0430\u0447\u0438\u0432\u0430\u043D\u0438\u0435 \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C",
      description: "Error message when download fails"
    },
    syncAuthFailed: {
      message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0430\u0443\u0442\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0446\u0438\u0438",
      description: "Error message when authentication fails"
    },
    signOut: {
      message: "\u0412\u044B\u0439\u0442\u0438",
      description: "Sign out button"
    },
    signInWithGoogle: {
      message: "\u0412\u043E\u0439\u0442\u0438 \u0447\u0435\u0440\u0435\u0437 Google",
      description: "Sign in with Google button"
    },
    nanobananaOptions: {
      message: "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 NanoBanana",
      description: "NanoBanana options section label"
    },
    enableNanobananaWatermarkRemover: {
      message: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0432\u043E\u0434\u044F\u043D\u043E\u0439 \u0437\u043D\u0430\u043A NanoBanana",
      description: "Enable automatic watermark removal for NanoBanana images"
    },
    nanobananaWatermarkRemoverHint: {
      message: "\u0410\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u0443\u0434\u0430\u043B\u044F\u0435\u0442 \u0432\u0438\u0434\u0438\u043C\u044B\u0435 \u0432\u043E\u0434\u044F\u043D\u044B\u0435 \u0437\u043D\u0430\u043A\u0438 Gemini \u0441 \u0441\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0445 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0439",
      description: "Watermark remover feature hint"
    },
    nanobananaDownloadTooltip: {
      message: "\u0421\u043A\u0430\u0447\u0430\u0442\u044C \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 \u0431\u0435\u0437 \u0432\u043E\u0434\u044F\u043D\u043E\u0433\u043E \u0437\u043D\u0430\u043A\u0430 (NanoBanana)",
      description: "Download button tooltip"
    },
    deepResearchDownload: {
      message: "\u0421\u043A\u0430\u0447\u0430\u0442\u044C \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u043C\u043E\u0435 \u043C\u044B\u0441\u043B\u0435\u0439",
      description: "Deep Research download button text"
    },
    deepResearchDownloadTooltip: {
      message: "\u0421\u043A\u0430\u0447\u0430\u0442\u044C \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u043C\u043E\u0435 \u043C\u044B\u0441\u043B\u0435\u0439 \u043A\u0430\u043A Markdown",
      description: "Deep Research download button tooltip"
    },
    folder_uncategorized: {
      message: "\u0411\u0435\u0437 \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u0438",
      description: "Label for root-level conversations not in any folder"
    },
    timelineLevelTitle: {
      message: "\u0423\u0440\u043E\u0432\u0435\u043D\u044C \u0443\u0437\u043B\u0430",
      description: "Title for timeline node level context menu"
    },
    timelineLevel1: {
      message: "\u0423\u0440\u043E\u0432\u0435\u043D\u044C 1",
      description: "Timeline node level 1 option"
    },
    timelineLevel2: {
      message: "\u0423\u0440\u043E\u0432\u0435\u043D\u044C 2",
      description: "Timeline node level 2 option"
    },
    timelineLevel3: {
      message: "\u0423\u0440\u043E\u0432\u0435\u043D\u044C 3",
      description: "Timeline node level 3 option"
    },
    timelineCollapse: {
      message: "\u0421\u0432\u0435\u0440\u043D\u0443\u0442\u044C",
      description: "Collapse children"
    },
    timelineExpand: {
      message: "\u0420\u0430\u0437\u0432\u0435\u0440\u043D\u0443\u0442\u044C",
      description: "Expand children"
    },
    timelinePreviewSearch: {
      message: "\u041F\u043E\u0438\u0441\u043A...",
      description: "Timeline preview panel search placeholder"
    },
    timelinePreviewNoResults: {
      message: "\u041D\u0435\u0442 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u043E\u0432",
      description: "Timeline preview panel no search results"
    },
    timelinePreviewNoMessages: {
      message: "\u041D\u0435\u0442 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0439",
      description: "Timeline preview panel no messages"
    },
    quoteReply: {
      message: "\u0426\u0438\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C",
      description: "Quote reply button text"
    },
    inputCollapseOptions: {
      message: "\u041F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u044B \u0432\u0432\u043E\u0434\u0430",
      description: "Input options section label"
    },
    enableInputCollapse: {
      message: "\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0441\u0432\u043E\u0440\u0430\u0447\u0438\u0432\u0430\u043D\u0438\u0435 \u0432\u0432\u043E\u0434\u0430",
      description: "Enable input collapse toggle label"
    },
    enableInputCollapseHint: {
      message: "\u0421\u0432\u043E\u0440\u0430\u0447\u0438\u0432\u0430\u0442\u044C \u043F\u043E\u043B\u0435 \u0432\u0432\u043E\u0434\u0430, \u043A\u043E\u0433\u0434\u0430 \u043E\u043D\u043E \u043F\u0443\u0441\u0442\u043E\u0435, \u0434\u043B\u044F \u0443\u0432\u0435\u043B\u0438\u0447\u0435\u043D\u0438\u044F \u043F\u0440\u043E\u0441\u0442\u0440\u0430\u043D\u0441\u0442\u0432\u0430 \u0434\u043B\u044F \u0447\u0442\u0435\u043D\u0438\u044F",
      description: "Input collapse feature hint"
    },
    inputCollapsePlaceholder: {
      message: "\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 Gemini",
      description: "Placeholder text shown in collapsed input"
    },
    ctrlEnterSend: {
      message: "Ctrl+Enter \u0434\u043B\u044F \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0438",
      description: "Ctrl+Enter to send toggle label"
    },
    ctrlEnterSendHint: {
      message: "\u041D\u0430\u0436\u043C\u0438\u0442\u0435 Ctrl+Enter \u0434\u043B\u044F \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0438 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0439, Enter \u0434\u043B\u044F \u043D\u043E\u0432\u043E\u0439 \u0441\u0442\u0440\u043E\u043A\u0438",
      description: "Ctrl+Enter to send feature hint"
    },
    batch_delete_confirm: {
      message: "\u0412\u044B \u0443\u0432\u0435\u0440\u0435\u043D\u044B, \u0447\u0442\u043E \u0445\u043E\u0442\u0438\u0442\u0435 \u0443\u0434\u0430\u043B\u0438\u0442\u044C {count} \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440(\u043E\u0432)? \u042D\u0442\u043E \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u043D\u0435\u043B\u044C\u0437\u044F \u043E\u0442\u043C\u0435\u043D\u0438\u0442\u044C.",
      description: "Batch delete confirmation message"
    },
    batch_delete_in_progress: {
      message: "\u0423\u0434\u0430\u043B\u0435\u043D\u0438\u0435... ({current}/{total})",
      description: "Batch delete progress message"
    },
    batch_delete_success: {
      message: "\u2713 \u0423\u0434\u0430\u043B\u0435\u043D\u043E {count} \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440(\u043E\u0432)",
      description: "Batch delete success message"
    },
    batch_delete_partial: {
      message: "\u0423\u0434\u0430\u043B\u0435\u043D\u0438\u0435 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u043E: {success} \u0443\u0441\u043F\u0435\u0448\u043D\u043E, {failed} \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C",
      description: "Batch delete partial success message"
    },
    batch_delete_limit_reached: {
      message: "\u041C\u0430\u043A\u0441\u0438\u043C\u0443\u043C {max} \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u043E\u0432 \u043C\u043E\u0436\u0435\u0442 \u0431\u044B\u0442\u044C \u0432\u044B\u0431\u0440\u0430\u043D\u043E \u0437\u0430 \u0440\u0430\u0437",
      description: "Batch delete limit warning"
    },
    batch_delete_button: {
      message: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u0435",
      description: "Batch delete button tooltip in multi-select mode"
    },
    batch_delete_match_patterns: {
      message: "delete,confirm,yes,ok,remove,\u0443\u0434\u0430\u043B\u0438\u0442\u044C,\u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C,\u0434\u0430,\u043E\u043A,\u0443\u0431\u0440\u0430\u0442\u044C",
      description: "Comma-separated list of keywords to match native delete/confirm buttons (case-insensitive)"
    },
    generalOptions: {
      message: "\u041E\u0431\u0449\u0438\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438",
      description: "General options section label"
    },
    enableTabTitleUpdate: {
      message: "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u0432\u043A\u043B\u0430\u0434\u043A\u0438 \u0441 \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u043E\u043C",
      description: "Enable tab title sync toggle label"
    },
    enableTabTitleUpdateHint: {
      message: "\u0410\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u043E\u0431\u043D\u043E\u0432\u043B\u044F\u0442\u044C \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u0432\u043A\u043B\u0430\u0434\u043A\u0438 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0430 \u0432 \u0441\u043E\u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u0438 \u0441 \u0442\u0435\u043A\u0443\u0449\u0438\u043C \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u043E\u043C \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u0430",
      description: "Tab title sync feature hint"
    },
    enableMermaidRendering: {
      message: "\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0440\u0435\u043D\u0434\u0435\u0440\u0438\u043D\u0433 \u0434\u0438\u0430\u0433\u0440\u0430\u043C\u043C Mermaid",
      description: "Enable Mermaid diagram rendering toggle label"
    },
    enableMermaidRenderingHint: {
      message: "\u0410\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u0440\u0435\u043D\u0434\u0435\u0440\u0438\u0442\u044C \u0434\u0438\u0430\u0433\u0440\u0430\u043C\u043C\u044B Mermaid \u0432 \u0431\u043B\u043E\u043A\u0430\u0445 \u043A\u043E\u0434\u0430",
      description: "Mermaid rendering feature hint"
    },
    enableQuoteReply: {
      message: "\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u043E\u0442\u0432\u0435\u0442 \u0441 \u0446\u0438\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435\u043C",
      description: "Enable quote reply toggle label"
    },
    enableQuoteReplyHint: {
      message: "\u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u043F\u043B\u0430\u0432\u0430\u044E\u0449\u0443\u044E \u043A\u043D\u043E\u043F\u043A\u0443 \u0434\u043B\u044F \u0446\u0438\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F \u0432\u044B\u0434\u0435\u043B\u0435\u043D\u043D\u043E\u0433\u043E \u0442\u0435\u043A\u0441\u0442\u0430 \u043F\u0440\u0438 \u0432\u044B\u0434\u0435\u043B\u0435\u043D\u0438\u0438 \u0442\u0435\u043A\u0441\u0442\u0430 \u0432 \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u0430\u0445",
      description: "Quote reply feature hint"
    },
    contextSync: {
      message: "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F \u043A\u043E\u043D\u0442\u0435\u043A\u0441\u0442\u0430",
      description: "Context Sync title"
    },
    contextSyncDescription: {
      message: "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u0443\u0439\u0442\u0435 \u043A\u043E\u043D\u0442\u0435\u043A\u0441\u0442 \u0447\u0430\u0442\u0430 \u0441 \u0432\u0430\u0448\u0435\u0439 \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E\u0439 IDE",
      description: "Context Sync description"
    },
    syncToIDE: {
      message: "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0441 IDE",
      description: "Sync to IDE button"
    },
    ideOnline: {
      message: "IDE \u041E\u043D\u043B\u0430\u0439\u043D",
      description: "IDE Online status"
    },
    ideOffline: {
      message: "IDE \u041E\u0444\u0444\u043B\u0430\u0439\u043D",
      description: "IDE Offline status"
    },
    syncing: {
      message: "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F...",
      description: "Syncing status"
    },
    checkServer: {
      message: "\u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0435 \u0441\u0435\u0440\u0432\u0435\u0440 AI Sync \u0432 VS Code",
      description: "Check server hint"
    },
    capturing: {
      message: "\u0417\u0430\u0445\u0432\u0430\u0442 \u0434\u0438\u0430\u043B\u043E\u0433\u0430...",
      description: "Capturing status"
    },
    syncedSuccess: {
      message: "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u043D\u043E \u0443\u0441\u043F\u0435\u0448\u043D\u043E!",
      description: "Synced success message"
    },
    downloadingOriginal: {
      message: "\u0421\u043A\u0430\u0447\u0438\u0432\u0430\u043D\u0438\u0435 \u043E\u0440\u0438\u0433\u0438\u043D\u0430\u043B\u044C\u043D\u043E\u0433\u043E \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F",
      description: "Status when downloading original image"
    },
    downloadingOriginalLarge: {
      message: "\u0421\u043A\u0430\u0447\u0438\u0432\u0430\u043D\u0438\u0435 \u043E\u0440\u0438\u0433\u0438\u043D\u0430\u043B\u044C\u043D\u043E\u0433\u043E \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F (\u0431\u043E\u043B\u044C\u0448\u043E\u0439 \u0444\u0430\u0439\u043B)",
      description: "Status when downloading large original image"
    },
    downloadLargeWarning: {
      message: "\u041F\u0440\u0435\u0434\u0443\u043F\u0440\u0435\u0436\u0434\u0435\u043D\u0438\u0435 \u043E \u0431\u043E\u043B\u044C\u0448\u043E\u043C \u0444\u0430\u0439\u043B\u0435",
      description: "Warning shown for large downloads"
    },
    downloadProcessing: {
      message: "\u041E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0430 \u0432\u043E\u0434\u044F\u043D\u043E\u0433\u043E \u0437\u043D\u0430\u043A\u0430",
      description: "Status when processing watermark removal"
    },
    downloadSuccess: {
      message: "\u0421\u043A\u0430\u0447\u0438\u0432\u0430\u043D\u0438\u0435...",
      description: "Status when download starts"
    },
    downloadError: {
      message: "\u041E\u0448\u0438\u0431\u043A\u0430",
      description: "Status prefix when download fails"
    },
    recentsHide: {
      message: "\u0421\u043A\u0440\u044B\u0442\u044C \u043D\u0435\u0434\u0430\u0432\u043D\u0438\u0435 \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u044B",
      description: "\u041F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0430 \u0434\u043B\u044F \u0441\u043A\u0440\u044B\u0442\u0438\u044F \u0440\u0430\u0437\u0434\u0435\u043B\u0430 \u043D\u0435\u0434\u0430\u0432\u043D\u0438\u0445 \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432"
    },
    recentsShow: {
      message: "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u043D\u0435\u0434\u0430\u0432\u043D\u0438\u0435 \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u044B",
      description: "\u041F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0430 \u0434\u043B\u044F \u043E\u0442\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F \u0440\u0430\u0437\u0434\u0435\u043B\u0430 \u043D\u0435\u0434\u0430\u0432\u043D\u0438\u0445 \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432"
    },
    gemsHide: {
      message: "\u0421\u043A\u0440\u044B\u0442\u044C Gems",
      description: "\u041F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0430 \u0434\u043B\u044F \u0441\u043A\u0440\u044B\u0442\u0438\u044F \u0440\u0430\u0437\u0434\u0435\u043B\u0430 \u0441\u043F\u0438\u0441\u043A\u0430 Gems"
    },
    gemsShow: {
      message: "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C Gems",
      description: "\u041F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0430 \u0434\u043B\u044F \u043E\u0442\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F \u0440\u0430\u0437\u0434\u0435\u043B\u0430 \u0441\u043F\u0438\u0441\u043A\u0430 Gems"
    },
    setAsDefaultModel: {
      message: "Set as default model",
      description: "Tooltip for setting default model"
    },
    cancelDefaultModel: {
      message: "Cancel default model",
      description: "Tooltip for cancelling default model"
    },
    defaultModelSet: {
      message: "Default model set: $1",
      description: "Toast message when default model is set"
    },
    defaultModelCleared: {
      message: "Default model cleared",
      description: "Toast message when default model is cleared"
    },
    sidebarAutoHide: {
      message: "\u0410\u0432\u0442\u043E-\u0441\u043A\u0440\u044B\u0442\u0438\u0435 \u0431\u043E\u043A\u043E\u0432\u043E\u0439 \u043F\u0430\u043D\u0435\u043B\u0438",
      description: "Auto-hide sidebar toggle label"
    },
    sidebarAutoHideHint: {
      message: "\u0410\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u0441\u0432\u043E\u0440\u0430\u0447\u0438\u0432\u0430\u0442\u044C \u0431\u043E\u043A\u043E\u0432\u0443\u044E \u043F\u0430\u043D\u0435\u043B\u044C \u043F\u0440\u0438 \u0443\u0445\u043E\u0434\u0435 \u043C\u044B\u0448\u0438, \u0440\u0430\u0437\u0432\u043E\u0440\u0430\u0447\u0438\u0432\u0430\u0442\u044C \u043F\u0440\u0438 \u043D\u0430\u0432\u0435\u0434\u0435\u043D\u0438\u0438",
      description: "Auto-hide sidebar feature hint"
    },
    folderSpacing: {
      message: "\u0420\u0430\u0441\u0441\u0442\u043E\u044F\u043D\u0438\u0435 \u043C\u0435\u0436\u0434\u0443 \u043F\u0430\u043F\u043A\u0430\u043C\u0438",
      description: "Folder spacing adjustment label"
    },
    folderSpacingCompact: {
      message: "\u041A\u043E\u043C\u043F\u0430\u043A\u0442\u043D\u043E",
      description: "Compact folder spacing label"
    },
    folderSpacingSpacious: {
      message: "\u041F\u0440\u043E\u0441\u0442\u043E\u0440\u043D\u043E",
      description: "Spacious folder spacing label"
    },
    folderTreeIndent: {
      message: "\u041E\u0442\u0441\u0442\u0443\u043F \u043F\u043E\u0434\u043F\u0430\u043F\u043E\u043A",
      description: "Subfolder tree indentation adjustment label"
    },
    folderTreeIndentCompact: {
      message: "\u0423\u0437\u043A\u0438\u0439",
      description: "Narrow subfolder indentation label"
    },
    folderTreeIndentSpacious: {
      message: "\u0428\u0438\u0440\u043E\u043A\u0438\u0439",
      description: "Wide subfolder indentation label"
    },
    export_select_mode_select_all: {
      message: "Select all",
      description: "Selection mode select all toggle"
    },
    export_select_mode_count: {
      message: "Selected {count}",
      description: "Selection mode selected message count"
    },
    export_select_mode_toggle: {
      message: "Select message",
      description: "Selection mode per-message toggle tooltip"
    },
    export_select_mode_select_below: {
      message: "Select messages below",
      description: "Selection mode top-left button to select messages below current line"
    },
    export_select_mode_empty: {
      message: "Please select at least one message to export.",
      description: "Selection mode validation when nothing is selected"
    },
    export_format_image_description: {
      message: "\u041E\u0434\u0438\u043D PNG-\u0444\u0430\u0439\u043B, \u0443\u0434\u043E\u0431\u043D\u043E \u0434\u043B\u044F \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0438 \u0441 \u043C\u043E\u0431\u0438\u043B\u044C\u043D\u043E\u0433\u043E.",
      description: "Description for Image export format"
    },
    export_image_progress: {
      message: "Generating image...",
      description: "Progress message while generating image export"
    },
    deepResearchSaveReport: {
      message: "Save Report",
      description: "Deep Research save report button"
    },
    deepResearchSaveReportTooltip: {
      message: "Export this research report",
      description: "Deep Research save report tooltip"
    },
    export_fontsize_label: {
      message: "\u0420\u0430\u0437\u043C\u0435\u0440 \u0448\u0440\u0438\u0444\u0442\u0430",
      description: "Label for font size slider in export dialog"
    },
    export_fontsize_preview: {
      message: "\u0421\u044A\u0435\u0448\u044C \u0435\u0449\u0451 \u044D\u0442\u0438\u0445 \u043C\u044F\u0433\u043A\u0438\u0445 \u0444\u0440\u0430\u043D\u0446\u0443\u0437\u0441\u043A\u0438\u0445 \u0431\u0443\u043B\u043E\u043A, \u0434\u0430 \u0432\u044B\u043F\u0435\u0439 \u0447\u0430\u044E.",
      description: "Preview text for font size slider in export dialog"
    },
    export_error_generic: {
      message: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C: {error}",
      description: "\u041E\u0431\u0449\u0435\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 \u043E\u0431 \u043E\u0448\u0438\u0431\u043A\u0435 \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u0430 \u0441 \u043F\u043E\u0434\u0440\u043E\u0431\u043D\u043E\u0439 \u043F\u0440\u0438\u0447\u0438\u043D\u043E\u0439"
    },
    export_error_refresh_retry: {
      message: "\u042D\u043A\u0441\u043F\u043E\u0440\u0442 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F \u043D\u0435 \u0443\u0434\u0430\u043B\u0441\u044F \u0438\u0437-\u0437\u0430 \u043F\u0440\u043E\u0431\u043B\u0435\u043C \u0441 \u0441\u0435\u0442\u044C\u044E. \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443 \u0438 \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0441\u043D\u043E\u0432\u0430.",
      description: "\u041F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0430 \u043F\u0440\u0438 \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E\u0439 \u043E\u0448\u0438\u0431\u043A\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0432\u043E \u0432\u0440\u0435\u043C\u044F \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u0430 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F"
    },
    export_md_include_source_confirm: {
      message: "\u042D\u043A\u0441\u043F\u043E\u0440\u0442\u0438\u0440\u0443\u0435\u043C\u044B\u0439 \u043A\u043E\u043D\u0442\u0435\u043D\u0442 \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u0442 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F \u0438\u0437 \u0432\u0435\u0431-\u043F\u043E\u0438\u0441\u043A\u0430. \u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0441\u0441\u044B\u043B\u043A\u0438 \u043D\u0430 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0438 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0439 \u0432 Markdown?",
      description: "Confirm dialog when exporting markdown with web search images"
    },
    deepResearch_exportedAt: {
      message: "\u042D\u043A\u0441\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u043E",
      description: "\u041C\u0435\u0442\u043A\u0430 \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E\u0439 \u043C\u0435\u0442\u043A\u0438 \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u0430 Deep Research"
    },
    deepResearch_totalPhases: {
      message: "\u0412\u0441\u0435\u0433\u043E \u0444\u0430\u0437",
      description: "\u041C\u0435\u0442\u043A\u0430 \u043E\u0431\u0449\u0435\u0433\u043E \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u0430 \u0444\u0430\u0437 \u0440\u0430\u0437\u043C\u044B\u0448\u043B\u0435\u043D\u0438\u044F Deep Research"
    },
    deepResearch_thinkingPhase: {
      message: "\u0424\u0430\u0437\u0430 \u0440\u0430\u0437\u043C\u044B\u0448\u043B\u0435\u043D\u0438\u044F",
      description: "\u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u0444\u0430\u0437\u044B \u0440\u0430\u0437\u043C\u044B\u0448\u043B\u0435\u043D\u0438\u044F Deep Research"
    },
    deepResearch_researchedWebsites: {
      message: "\u0418\u0441\u0441\u043B\u0435\u0434\u043E\u0432\u0430\u043D\u043D\u044B\u0435 \u0441\u0430\u0439\u0442\u044B",
      description: "\u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u0440\u0430\u0437\u0434\u0435\u043B\u0430 \u0438\u0441\u0441\u043B\u0435\u0434\u043E\u0432\u0430\u043D\u043D\u044B\u0445 \u0441\u0430\u0439\u0442\u043E\u0432 Deep Research"
    }
  };

  // ../gemini-voyager/src/locales/zh/messages.json
  var messages_default9 = {
    extName: {
      message: "Gemini Voyager",
      description: "\u6269\u5C55\u7A0B\u5E8F\u540D\u79F0"
    },
    extDescription: {
      message: "\u901A\u8FC7\u65F6\u95F4\u7EBF\u5BFC\u822A\u3001\u6587\u4EF6\u5939\u7EC4\u7EC7\u3001\u6307\u4EE4\u5B9D\u5E93\u548C\u5BF9\u8BDD\u5BFC\u51FA\u529F\u80FD\uFF0C\u5168\u9762\u63D0\u5347\u60A8\u7684 Gemini \u4F7F\u7528\u4F53\u9A8C\u3002",
      description: "\u6269\u5C55\u7A0B\u5E8F\u63CF\u8FF0"
    },
    scrollMode: {
      message: "\u6EDA\u52A8\u6A21\u5F0F",
      description: "\u6EDA\u52A8\u6A21\u5F0F\u6807\u7B7E"
    },
    flow: {
      message: "\u6D41\u52A8",
      description: "\u6D41\u52A8\u6A21\u5F0F"
    },
    jump: {
      message: "\u8DF3\u8DC3",
      description: "\u8DF3\u8DC3\u6A21\u5F0F"
    },
    hideOuterContainer: {
      message: "\u9690\u85CF\u5916\u90E8\u5BB9\u5668",
      description: "\u9690\u85CF\u5916\u90E8\u5BB9\u5668\u6807\u7B7E"
    },
    draggableTimeline: {
      message: "\u53EF\u62D6\u62FD\u65F6\u95F4\u7EBF",
      description: "\u53EF\u62D6\u62FD\u65F6\u95F4\u7EBF\u6807\u7B7E"
    },
    enableMarkerLevel: {
      message: "\u542F\u7528\u8282\u70B9\u5C42\u7EA7",
      description: "\u542F\u7528\u65F6\u95F4\u7EBF\u8282\u70B9\u5C42\u7EA7\u529F\u80FD"
    },
    enableMarkerLevelHint: {
      message: "\u53F3\u952E\u70B9\u51FB\u65F6\u95F4\u7EBF\u8282\u70B9\u53EF\u8BBE\u7F6E\u5176\u5C42\u7EA7\u548C\u6298\u53E0\u5B50\u8282\u70B9",
      description: "\u8282\u70B9\u5C42\u7EA7\u529F\u80FD\u63D0\u793A"
    },
    experimentalLabel: {
      message: "\u5B9E\u9A8C\u6027",
      description: "\u5B9E\u9A8C\u6027\u529F\u80FD\u6807\u7B7E"
    },
    resetPosition: {
      message: "\u91CD\u7F6E\u4F4D\u7F6E",
      description: "\u91CD\u7F6E\u4F4D\u7F6E\u6309\u94AE"
    },
    resetTimelinePosition: {
      message: "\u91CD\u7F6E\u65F6\u95F4\u7EBF\u4F4D\u7F6E",
      description: "\u91CD\u7F6E\u65F6\u95F4\u7EBF\u4F4D\u7F6E\u6309\u94AE\uFF08\u5728\u65F6\u95F4\u7EBF\u9009\u9879\u4E2D\uFF09"
    },
    language: {
      message: "\u8BED\u8A00",
      description: "\u8BED\u8A00\u6807\u7B7E"
    },
    pm_title: {
      message: "Gemini Voyager",
      description: "\u9762\u677F\u6807\u9898"
    },
    pm_add: {
      message: "\u65B0\u589E",
      description: "\u65B0\u589E prompt \u6309\u94AE"
    },
    pm_search_placeholder: {
      message: "\u641C\u7D22 prompt \u6216\u6807\u7B7E",
      description: "\u641C\u7D22\u5360\u4F4D\u7B26"
    },
    pm_import: {
      message: "\u5BFC\u5165",
      description: "\u5BFC\u5165\u6309\u94AE"
    },
    pm_export: {
      message: "\u5BFC\u51FA",
      description: "\u5BFC\u51FA\u6309\u94AE"
    },
    pm_prompt_placeholder: {
      message: "Prompt \u6587\u672C",
      description: "Prompt \u8F93\u5165\u5360\u4F4D\u7B26"
    },
    pm_tags_placeholder: {
      message: "\u6807\u7B7E\uFF08\u9017\u53F7\u5206\u9694\uFF09",
      description: "\u6807\u7B7E\u8F93\u5165\u5360\u4F4D\u7B26"
    },
    pm_save: {
      message: "\u4FDD\u5B58",
      description: "\u4FDD\u5B58"
    },
    pm_cancel: {
      message: "\u53D6\u6D88",
      description: "\u53D6\u6D88"
    },
    pm_all_tags: {
      message: "\u5168\u90E8",
      description: "\u5168\u90E8\u6807\u7B7E"
    },
    pm_empty: {
      message: "\u6682\u65E0 prompt",
      description: "\u7A7A\u72B6\u6001"
    },
    pm_copy: {
      message: "\u590D\u5236",
      description: "\u590D\u5236 prompt"
    },
    pm_copied: {
      message: "\u5DF2\u590D\u5236",
      description: "\u590D\u5236\u6210\u529F"
    },
    pm_delete: {
      message: "\u5220\u9664",
      description: "\u5220\u9664 prompt"
    },
    pm_delete_confirm: {
      message: "\u786E\u5B9A\u5220\u9664\u8BE5 prompt \u5417\uFF1F",
      description: "\u5220\u9664\u786E\u8BA4"
    },
    pm_lock: {
      message: "\u9501\u5B9A\u4F4D\u7F6E",
      description: "\u9501\u5B9A\u9762\u677F\u4F4D\u7F6E"
    },
    pm_unlock: {
      message: "\u53D6\u6D88\u9501\u5B9A",
      description: "\u53D6\u6D88\u9501\u5B9A\u9762\u677F\u4F4D\u7F6E"
    },
    pm_import_invalid: {
      message: "\u6587\u4EF6\u683C\u5F0F\u4E0D\u6B63\u786E",
      description: "\u5BFC\u5165\u5931\u8D25"
    },
    pm_import_success: {
      message: "\u5DF2\u5BFC\u5165 {count} \u6761",
      description: "\u5BFC\u5165\u6210\u529F"
    },
    pm_duplicate: {
      message: "\u91CD\u590D\u7684 prompt",
      description: "\u65B0\u589E\u91CD\u590D"
    },
    pm_deleted: {
      message: "\u5DF2\u5220\u9664",
      description: "\u5220\u9664\u63D0\u793A"
    },
    pm_edit: {
      message: "\u7F16\u8F91",
      description: "\u7F16\u8F91 prompt"
    },
    pm_expand: {
      message: "\u5C55\u5F00",
      description: "\u5C55\u5F00\u63D0\u793A\u8BCD\u6587\u672C"
    },
    pm_collapse: {
      message: "\u6536\u8D77",
      description: "\u6536\u8D77\u63D0\u793A\u8BCD\u6587\u672C"
    },
    pm_saved: {
      message: "\u5DF2\u4FDD\u5B58",
      description: "\u4FDD\u5B58\u63D0\u793A"
    },
    pm_settings: {
      message: "\u8BBE\u7F6E",
      description: "\u8BBE\u7F6E\u6309\u94AE"
    },
    pm_settings_tooltip: {
      message: "\u8C03\u6574\u6269\u5C55\u8BBE\u7F6E",
      description: "\u8BBE\u7F6E\u6309\u94AE\u63D0\u793A"
    },
    pm_settings_fallback: {
      message: "\u8BF7\u70B9\u51FB\u6D4F\u89C8\u5668\u5DE5\u5177\u680F\u4E2D\u7684\u6269\u5C55\u56FE\u6807\u6253\u5F00\u8BBE\u7F6E",
      description: "\u8BBE\u7F6E\u6253\u5F00\u5931\u8D25\u63D0\u793A"
    },
    pm_backup: {
      message: "\u672C\u5730\u5907\u4EFD",
      description: "\u672C\u5730\u5907\u4EFD\u6309\u94AE"
    },
    pm_backup_tooltip: {
      message: "\u5C06\u63D0\u793A\u8BCD\u548C\u6587\u4EF6\u5939\u5907\u4EFD\u5230\u5E26\u65F6\u95F4\u6233\u7684\u6587\u4EF6\u5939",
      description: "\u5907\u4EFD\u6309\u94AE\u63D0\u793A"
    },
    pm_backup_cancelled: {
      message: "\u5907\u4EFD\u5DF2\u53D6\u6D88",
      description: "\u5907\u4EFD\u53D6\u6D88\u63D0\u793A"
    },
    pm_backup_error: {
      message: "\u2717 \u5907\u4EFD\u5931\u8D25",
      description: "\u5907\u4EFD\u5931\u8D25\u63D0\u793A"
    },
    pm_backup_hint_options: {
      message: "\u529F\u80FD\u5DF2\u96C6\u6210\u5728 Gemini \u9875\u9762\u7684\u63D0\u793A\u8BCD\u7BA1\u7406\u5668\u4E2D\u3002",
      description: "\u9009\u9879\u9875\u9762\u7684\u5907\u4EFD\u8BF4\u660E"
    },
    pm_backup_step1: {
      message: "\u6253\u5F00 Gemini \u9875\u9762\uFF08gemini.google.com\uFF09",
      description: "\u5907\u4EFD\u6B65\u9AA4 1"
    },
    pm_backup_step2: {
      message: "\u70B9\u51FB\u53F3\u4E0B\u89D2\u7684\u6269\u5C55\u56FE\u6807\u6253\u5F00\u63D0\u793A\u8BCD\u7BA1\u7406\u5668",
      description: "\u5907\u4EFD\u6B65\u9AA4 2"
    },
    pm_backup_step3: {
      message: '\u70B9\u51FB "\u{1F4BE} \u672C\u5730\u5907\u4EFD" \u6309\u94AE\uFF0C\u9009\u62E9\u5907\u4EFD\u6587\u4EF6\u5939',
      description: "\u5907\u4EFD\u6B65\u9AA4 3"
    },
    pm_backup_note: {
      message: "\u5907\u4EFD\u5C06\u5305\u542B\u6240\u6709\u63D0\u793A\u8BCD\u548C\u6587\u4EF6\u5939\uFF0C\u5E76\u4FDD\u5B58\u5728\u5E26\u65F6\u95F4\u6233\u7684\u6587\u4EF6\u5939\u4E2D\uFF08\u683C\u5F0F\uFF1Abackup-YYYYMMDD-HHMMSS\uFF09",
      description: "\u5907\u4EFD\u529F\u80FD\u8BF4\u660E"
    },
    extensionVersion: {
      message: "\u7248\u672C",
      description: "\u6269\u5C55\u7248\u672C\u6807\u7B7E"
    },
    newVersionAvailable: {
      message: "\u53D1\u73B0\u65B0\u7248\u672C",
      description: "\u66F4\u65B0\u63D0\u9192\u6807\u9898"
    },
    currentVersionLabel: {
      message: "\u5F53\u524D",
      description: "\u5F53\u524D\u7248\u672C\u53F7\u6807\u7B7E"
    },
    latestVersionLabel: {
      message: "\u6700\u65B0",
      description: "\u6700\u65B0\u7248\u672C\u53F7\u6807\u7B7E"
    },
    updateNow: {
      message: "\u7ACB\u5373\u66F4\u65B0",
      description: "\u8DF3\u8F6C\u66F4\u65B0 CTA"
    },
    starProject: {
      message: "\u4E3A\u9879\u76EE\u70B9\u4EAE \u2B50\uFE0F",
      description: "Github \u5F15\u5BFC"
    },
    officialDocs: {
      message: "\u5B98\u65B9\u6587\u6863",
      description: "Official docs link"
    },
    exportChatJson: {
      message: "\u5BFC\u51FA\u5BF9\u8BDD\u8BB0\u5F55",
      description: "\u5BFC\u51FA\u6309\u94AE\u63D0\u793A"
    },
    folder_title: {
      message: "\u6587\u4EF6\u5939",
      description: "\u6587\u4EF6\u5939\u533A\u57DF\u6807\u9898"
    },
    folder_create: {
      message: "\u521B\u5EFA\u6587\u4EF6\u5939",
      description: "\u521B\u5EFA\u6587\u4EF6\u5939\u6309\u94AE\u63D0\u793A"
    },
    folder_name_prompt: {
      message: "\u8F93\u5165\u6587\u4EF6\u5939\u540D\u79F0\uFF1A",
      description: "\u521B\u5EFA\u6587\u4EF6\u5939\u540D\u79F0\u63D0\u793A"
    },
    folder_rename_prompt: {
      message: "\u8F93\u5165\u65B0\u540D\u79F0\uFF1A",
      description: "\u91CD\u547D\u540D\u6587\u4EF6\u5939\u63D0\u793A"
    },
    folder_delete_confirm: {
      message: "\u786E\u5B9A\u5220\u9664\u6B64\u6587\u4EF6\u5939\u53CA\u5176\u6240\u6709\u5185\u5BB9\u5417\uFF1F",
      description: "\u5220\u9664\u6587\u4EF6\u5939\u786E\u8BA4"
    },
    folder_create_subfolder: {
      message: "\u521B\u5EFA\u5B50\u6587\u4EF6\u5939",
      description: "\u521B\u5EFA\u5B50\u6587\u4EF6\u5939\u83DC\u5355\u9879"
    },
    folder_rename: {
      message: "\u91CD\u547D\u540D",
      description: "\u91CD\u547D\u540D\u6587\u4EF6\u5939\u83DC\u5355\u9879"
    },
    folder_change_color: {
      message: "\u66F4\u6539\u989C\u8272",
      description: "\u66F4\u6539\u6587\u4EF6\u5939\u989C\u8272\u83DC\u5355\u9879"
    },
    folder_delete: {
      message: "\u5220\u9664",
      description: "\u5220\u9664\u6587\u4EF6\u5939\u83DC\u5355\u9879"
    },
    folder_color_default: {
      message: "\u9ED8\u8BA4",
      description: "\u9ED8\u8BA4\u6587\u4EF6\u5939\u989C\u8272\u540D\u79F0"
    },
    folder_color_red: {
      message: "\u7EA2\u8272\uFF08\u7D27\u6025\uFF09",
      description: "\u7EA2\u8272\u6587\u4EF6\u5939\u989C\u8272\u540D\u79F0"
    },
    folder_color_orange: {
      message: "\u6A59\u8272\uFF08\u9AD8\u4F18\u5148\u7EA7\uFF09",
      description: "\u6A59\u8272\u6587\u4EF6\u5939\u989C\u8272\u540D\u79F0"
    },
    folder_color_yellow: {
      message: "\u9EC4\u8272\uFF08\u9700\u6CE8\u610F\uFF09",
      description: "\u9EC4\u8272\u6587\u4EF6\u5939\u989C\u8272\u540D\u79F0"
    },
    folder_color_green: {
      message: "\u7EFF\u8272\uFF08\u5DF2\u5B8C\u6210\uFF09",
      description: "\u7EFF\u8272\u6587\u4EF6\u5939\u989C\u8272\u540D\u79F0"
    },
    folder_color_blue: {
      message: "\u84DD\u8272\uFF08\u53C2\u8003\uFF09",
      description: "\u84DD\u8272\u6587\u4EF6\u5939\u989C\u8272\u540D\u79F0"
    },
    folder_color_purple: {
      message: "\u7D2B\u8272\uFF08\u521B\u610F\uFF09",
      description: "\u7D2B\u8272\u6587\u4EF6\u5939\u989C\u8272\u540D\u79F0"
    },
    folder_color_pink: {
      message: "\u7C89\u8272\uFF08\u4E2A\u4EBA\uFF09",
      description: "\u7C89\u8272\u6587\u4EF6\u5939\u989C\u8272\u540D\u79F0"
    },
    folder_color_custom: {
      message: "\u81EA\u5B9A\u4E49",
      description: "\u81EA\u5B9A\u4E49\u6587\u4EF6\u5939\u989C\u8272\u540D\u79F0"
    },
    folder_empty: {
      message: "\u6682\u65E0\u6587\u4EF6\u5939",
      description: "\u6CA1\u6709\u6587\u4EF6\u5939\u65F6\u663E\u793A\u7684\u5360\u4F4D\u63D0\u793A"
    },
    folder_pin: {
      message: "\u7F6E\u9876\u6587\u4EF6\u5939",
      description: "\u7F6E\u9876\u6587\u4EF6\u5939\u83DC\u5355\u9879"
    },
    folder_unpin: {
      message: "\u53D6\u6D88\u7F6E\u9876",
      description: "\u53D6\u6D88\u7F6E\u9876\u6587\u4EF6\u5939\u83DC\u5355\u9879"
    },
    folder_remove_conversation: {
      message: "\u4ECE\u6587\u4EF6\u5939\u4E2D\u79FB\u9664",
      description: "\u79FB\u9664\u5BF9\u8BDD\u6309\u94AE\u63D0\u793A"
    },
    folder_remove_conversation_confirm: {
      message: "\u4ECE\u6B64\u6587\u4EF6\u5939\u4E2D\u79FB\u9664\u300C{title}\u300D\uFF1F",
      description: "\u79FB\u9664\u5BF9\u8BDD\u786E\u8BA4"
    },
    conversation_more: {
      message: "\u66F4\u591A\u9009\u9879",
      description: "\u5BF9\u8BDD\u66F4\u591A\u9009\u9879\u6309\u94AE\u63D0\u793A"
    },
    conversation_move_to_folder: {
      message: "\u79FB\u52A8\u5230\u6587\u4EF6\u5939",
      description: "\u79FB\u52A8\u5BF9\u8BDD\u5230\u6587\u4EF6\u5939\u83DC\u5355\u9879"
    },
    conversation_move_to_folder_title: {
      message: "\u79FB\u52A8\u5230\u6587\u4EF6\u5939",
      description: "\u79FB\u52A8\u5BF9\u8BDD\u5230\u6587\u4EF6\u5939\u5BF9\u8BDD\u6846\u6807\u9898"
    },
    chatWidth: {
      message: "\u5BF9\u8BDD\u533A\u57DF\u5BBD\u5EA6",
      description: "\u5BF9\u8BDD\u533A\u57DF\u5BBD\u5EA6\u8C03\u6574\u6807\u7B7E"
    },
    chatWidthNarrow: {
      message: "\u7A84",
      description: "\u7A84\u5BF9\u8BDD\u533A\u57DF\u5BBD\u5EA6\u6807\u7B7E"
    },
    chatWidthWide: {
      message: "\u5BBD",
      description: "\u5BBD\u5BF9\u8BDD\u533A\u57DF\u5BBD\u5EA6\u6807\u7B7E"
    },
    sidebarWidth: {
      message: "\u4FA7\u8FB9\u680F\u5BBD\u5EA6",
      description: "\u4FA7\u8FB9\u680F\u5BBD\u5EA6\u8C03\u8282\u6807\u7B7E"
    },
    sidebarWidthNarrow: {
      message: "\u7A84",
      description: "\u4FA7\u8FB9\u680F\u53D8\u7A84\u6807\u7B7E"
    },
    sidebarWidthWide: {
      message: "\u5BBD",
      description: "\u4FA7\u8FB9\u680F\u53D8\u5BBD\u6807\u7B7E"
    },
    formula_copied: {
      message: "\u2713 \u516C\u5F0F\u5DF2\u590D\u5236",
      description: "\u516C\u5F0F\u590D\u5236\u6210\u529F\u6D88\u606F"
    },
    formula_copy_failed: {
      message: "\u2717 \u590D\u5236\u5931\u8D25",
      description: "\u516C\u5F0F\u590D\u5236\u5931\u8D25\u6D88\u606F"
    },
    formulaCopyFormat: {
      message: "\u516C\u5F0F\u590D\u5236\u683C\u5F0F",
      description: "\u516C\u5F0F\u590D\u5236\u683C\u5F0F\u8BBE\u7F6E\u6807\u7B7E"
    },
    formulaCopyFormatLatex: {
      message: "LaTeX",
      description: "LaTeX \u683C\u5F0F\u9009\u9879"
    },
    formulaCopyFormatUnicodeMath: {
      message: "MathML (Word)",
      description: "Label for UnicodeMath formula copy format option"
    },
    formulaCopyFormatHint: {
      message: "\u9009\u62E9\u70B9\u51FB\u516C\u5F0F\u65F6\u590D\u5236\u7684\u683C\u5F0F",
      description: "\u516C\u5F0F\u590D\u5236\u683C\u5F0F\u63D0\u793A"
    },
    formulaCopyFormatNoDollar: {
      message: "LaTeX (\u7EAF\u6587\u672C\uFF0C\u65E0 $ \u7B26\u53F7)",
      description: "LaTeX \u683C\u5F0F\u9009\u9879\uFF0C\u65E0\u7F8E\u5143\u7B26\u53F7"
    },
    folder_filter_current_user: {
      message: "\u8D26\u53F7\u9694\u79BB\u6A21\u5F0F",
      description: "Show only conversations from the current Google account"
    },
    folder_export: {
      message: "\u5BFC\u51FA\u6587\u4EF6\u5939",
      description: "\u5BFC\u51FA\u6587\u4EF6\u5939\u6309\u94AE\u63D0\u793A"
    },
    folder_import_export: {
      message: "\u5BFC\u5165/\u5BFC\u51FA\u6587\u4EF6\u5939",
      description: "\u5408\u5E76\u7684\u5BFC\u5165\u5BFC\u51FA\u6309\u94AE\u63D0\u793A"
    },
    folder_cloud_upload: {
      message: "\u4E0A\u4F20\u5230\u4E91\u7AEF",
      description: "\u4E91\u4E0A\u4F20\u6309\u94AE\u63D0\u793A"
    },
    folder_cloud_sync: {
      message: "\u4ECE\u4E91\u7AEF\u540C\u6B65",
      description: "\u4E91\u540C\u6B65\u6309\u94AE\u63D0\u793A"
    },
    folder_import: {
      message: "\u5BFC\u5165\u6587\u4EF6\u5939",
      description: "\u5BFC\u5165\u6587\u4EF6\u5939\u6309\u94AE\u63D0\u793A"
    },
    folder_import_title: {
      message: "\u5BFC\u5165\u6587\u4EF6\u5939\u914D\u7F6E",
      description: "\u5BFC\u5165\u5BF9\u8BDD\u6846\u6807\u9898"
    },
    folder_import_strategy: {
      message: "\u5BFC\u5165\u7B56\u7565\uFF1A",
      description: "\u5BFC\u5165\u7B56\u7565\u6807\u7B7E"
    },
    folder_import_merge: {
      message: "\u4E0E\u73B0\u6709\u6587\u4EF6\u5939\u5408\u5E76",
      description: "\u5408\u5E76\u5BFC\u5165\u7B56\u7565"
    },
    folder_import_overwrite: {
      message: "\u8986\u76D6\u73B0\u6709\u6587\u4EF6\u5939",
      description: "\u8986\u76D6\u5BFC\u5165\u7B56\u7565"
    },
    folder_import_select_file: {
      message: "\u9009\u62E9\u8981\u5BFC\u5165\u7684 JSON \u6587\u4EF6",
      description: "\u5BFC\u5165\u6587\u4EF6\u9009\u62E9\u63D0\u793A"
    },
    folder_import_success: {
      message: "\u2713 \u5DF2\u5BFC\u5165 {folders} \u4E2A\u6587\u4EF6\u5939\uFF0C{conversations} \u4E2A\u5BF9\u8BDD",
      description: "\u5BFC\u5165\u6210\u529F\u6D88\u606F"
    },
    folder_import_success_skipped: {
      message: "\u2713 \u5DF2\u5BFC\u5165 {folders} \u4E2A\u6587\u4EF6\u5939\uFF0C{conversations} \u4E2A\u5BF9\u8BDD\uFF08\u8DF3\u8FC7 {skipped} \u4E2A\u91CD\u590D\u9879\uFF09",
      description: "\u5BFC\u5165\u6210\u529F\u5E76\u8DF3\u8FC7\u91CD\u590D\u9879\u6D88\u606F"
    },
    folder_import_error: {
      message: "\u2717 \u5BFC\u5165\u5931\u8D25\uFF1A{error}",
      description: "\u5BFC\u5165\u9519\u8BEF\u6D88\u606F"
    },
    folder_export_success: {
      message: "\u2713 \u6587\u4EF6\u5939\u5BFC\u51FA\u6210\u529F",
      description: "\u5BFC\u51FA\u6210\u529F\u6D88\u606F"
    },
    folder_import_invalid_format: {
      message: "\u6587\u4EF6\u683C\u5F0F\u65E0\u6548\u3002\u8BF7\u9009\u62E9\u6709\u6548\u7684\u6587\u4EF6\u5939\u914D\u7F6E\u6587\u4EF6\u3002",
      description: "\u65E0\u6548\u683C\u5F0F\u9519\u8BEF"
    },
    folder_import_confirm_overwrite: {
      message: "\u8FD9\u5C06\u66FF\u6362\u6240\u6709\u73B0\u6709\u6587\u4EF6\u5939\u3002\u7CFB\u7EDF\u5C06\u521B\u5EFA\u5907\u4EFD\u3002\u662F\u5426\u7EE7\u7EED\uFF1F",
      description: "\u8986\u76D6\u786E\u8BA4"
    },
    export_dialog_title: {
      message: "\u5BFC\u51FA\u5BF9\u8BDD",
      description: "\u5BFC\u51FA\u5BF9\u8BDD\u6846\u6807\u9898"
    },
    export_dialog_select: {
      message: "\u9009\u62E9\u5BFC\u51FA\u683C\u5F0F\uFF1A",
      description: "\u5BFC\u51FA\u683C\u5F0F\u9009\u62E9\u6807\u7B7E"
    },
    export_dialog_warning: {
      message: "\u26A0\uFE0F \u70B9\u51FB\u5BFC\u51FA\u540E\uFF0C\u7CFB\u7EDF\u5C06\u81EA\u52A8\u8DF3\u8F6C\u81F3\u9996\u6761\u6D88\u606F\u4EE5\u52A0\u8F7D\u5B8C\u6574\u5185\u5BB9\u3002\u5728\u6B64\u671F\u95F4\u8BF7\u52FF\u64CD\u4F5C\uFF0C\u8DF3\u8F6C\u5B8C\u6210\u540E\u5C06\u81EA\u52A8\u7EE7\u7EED\u5BFC\u51FA\u3002",
      description: "\u5173\u4E8E\u5185\u5BB9\u5B8C\u6574\u6027\u548C\u81EA\u52A8\u8DF3\u8F6C\u7684\u63D0\u793A"
    },
    export_dialog_safari_cmdp_hint: {
      message: "Safari \u63D0\u793A\uFF1A\u8BF7\u5148\u70B9\u51FB\u4E0B\u65B9\u201C\u5BFC\u51FA\u201D\u6309\u94AE\uFF0C\u7A0D\u7B49\u7247\u523B\uFF0C\u518D\u6309 \u2318P \u9009\u62E9\u201C\u4FDD\u5B58\u4E3A PDF\u201D\u3002",
      description: "Safari \u4E0B PDF \u5BFC\u51FA\u7684\u63D0\u793A"
    },
    export_toast_safari_pdf_ready: {
      message: "\u73B0\u5728\u53EF\u4EE5\u6309 Command + P \u5BFC\u51FA PDF\u3002",
      description: "Safari \u4E2D\u5B8C\u6210\u5BFC\u51FA\u51C6\u5907\u540E\u7684\u63D0\u793A"
    },
    export_dialog_safari_markdown_hint: {
      message: "\u63D0\u9192\uFF1A\u7531\u4E8ESafari\u9650\u5236\uFF0C\u65E0\u6CD5\u63D0\u53D6\u804A\u5929\u8BB0\u5F55\u4E2D\u7684\u56FE\u7247\uFF0C\u5982\u9700\u5B8C\u6574\u5BFC\u51FA\uFF0C\u5EFA\u8BAE\u4F7F\u7528PDF\u5BFC\u51FA",
      description: "\u5173\u4E8E Safari Markdown \u5BFC\u51FA\u65E0\u6CD5\u63D0\u53D6\u56FE\u7247\u7684\u8B66\u544A"
    },
    export_format_json_description: {
      message: "\u5F00\u53D1\u8005\u4F7F\u7528\u7684\u673A\u5668\u53EF\u8BFB\u683C\u5F0F",
      description: "JSON \u5BFC\u51FA\u683C\u5F0F\u63CF\u8FF0"
    },
    export_format_markdown_description: {
      message: "\u6E05\u6670\u4FBF\u643A\u7684\u6587\u672C\u683C\u5F0F\uFF08\u63A8\u8350\uFF09",
      description: "Markdown \u5BFC\u51FA\u683C\u5F0F\u63CF\u8FF0"
    },
    export_format_pdf_description: {
      message: "\u9002\u5408\u6253\u5370\u7684\u683C\u5F0F\uFF08\u901A\u8FC7\u4FDD\u5B58\u4E3A PDF\uFF09",
      description: "PDF \u5BFC\u51FA\u683C\u5F0F\u63CF\u8FF0"
    },
    editInputWidth: {
      message: "\u7F16\u8F91\u8F93\u5165\u6846\u5BBD\u5EA6",
      description: "\u7F16\u8F91\u8F93\u5165\u6846\u5BBD\u5EA6\u8C03\u6574\u6807\u7B7E"
    },
    editInputWidthNarrow: {
      message: "\u7A84",
      description: "\u7A84\u7F16\u8F91\u8F93\u5165\u6846\u5BBD\u5EA6\u6807\u7B7E"
    },
    editInputWidthWide: {
      message: "\u5BBD",
      description: "\u5BBD\u7F16\u8F91\u8F93\u5165\u6846\u5BBD\u5EA6\u6807\u7B7E"
    },
    timelineOptions: {
      message: "\u65F6\u95F4\u7EBF\u9009\u9879",
      description: "\u65F6\u95F4\u7EBF\u9009\u9879\u533A\u57DF\u6807\u7B7E"
    },
    folderOptions: {
      message: "\u6587\u4EF6\u5939\u9009\u9879",
      description: "\u6587\u4EF6\u5939\u9009\u9879\u533A\u57DF\u6807\u7B7E"
    },
    enableFolderFeature: {
      message: "\u542F\u7528\u6587\u4EF6\u5939\u529F\u80FD",
      description: "\u542F\u7528\u6216\u7981\u7528\u6587\u4EF6\u5939\u529F\u80FD"
    },
    hideArchivedConversations: {
      message: "\u9690\u85CF\u5DF2\u5F52\u6863\u5BF9\u8BDD",
      description: "\u4ECE\u4E3B\u5217\u8868\u9690\u85CF\u5DF2\u6DFB\u52A0\u5230\u6587\u4EF6\u5939\u7684\u5BF9\u8BDD"
    },
    conversation_star: {
      message: "\u661F\u6807\u5BF9\u8BDD",
      description: "\u661F\u6807\u5BF9\u8BDD\u6309\u94AE\u63D0\u793A"
    },
    conversation_unstar: {
      message: "\u53D6\u6D88\u661F\u6807",
      description: "\u53D6\u6D88\u661F\u6807\u5BF9\u8BDD\u6309\u94AE\u63D0\u793A"
    },
    conversation_untitled: {
      message: "\u672A\u547D\u540D",
      description: "\u65E0\u6807\u9898\u5BF9\u8BDD\u7684\u56DE\u9000\u6807\u9898"
    },
    geminiOnlyNotice: {
      message: "\u9ED8\u8BA4\u4EC5\u5728 Gemini\uFF08\u542B\u4F01\u4E1A\u7248\uFF09\u548C AI Studio \u751F\u6548\u3002\u60F3\u5728\u5176\u4ED6\u7F51\u7AD9\u7528\u63D0\u793A\u8BCD\u7BA1\u7406\u5668\uFF0C\u8BF7\u5728\u4E0B\u65B9\u6DFB\u52A0\u5E76\u6388\u6743\u3002",
      description: "\u63D0\u793A\u9ED8\u8BA4\u8303\u56F4\u4E3A Gemini/AI Studio"
    },
    folderManager_dataLossWarning: {
      message: "\u26A0\uFE0F \u8B66\u544A\uFF1A\u65E0\u6CD5\u52A0\u8F7D\u6587\u4EF6\u5939\u6570\u636E\u3002\u60A8\u7684\u6587\u4EF6\u5939\u53EF\u80FD\u5DF2\u635F\u574F\u3002\u8BF7\u68C0\u67E5\u6D4F\u89C8\u5668\u63A7\u5236\u53F0\u4EE5\u83B7\u53D6\u8BE6\u7EC6\u4FE1\u606F\uFF0C\u5E76\u5728\u53EF\u7528\u65F6\u5C1D\u8BD5\u4ECE\u5907\u4EFD\u6062\u590D\u3002",
      description: "\u6587\u4EF6\u5939\u6570\u636E\u52A0\u8F7D\u5931\u8D25\u65F6\u663E\u793A\u7684\u8B66\u544A"
    },
    backupOptions: {
      message: "\u81EA\u52A8\u5907\u4EFD",
      description: "\u5907\u4EFD\u9009\u9879\u533A\u57DF\u6807\u7B7E"
    },
    backupEnabled: {
      message: "\u542F\u7528\u81EA\u52A8\u5907\u4EFD",
      description: "\u542F\u7528\u81EA\u52A8\u5907\u4EFD\u5F00\u5173"
    },
    backupNow: {
      message: "\u7ACB\u5373\u5907\u4EFD",
      description: "\u7ACB\u5373\u5907\u4EFD\u6309\u94AE"
    },
    backupSelectFolder: {
      message: "\u9009\u62E9\u5907\u4EFD\u6587\u4EF6\u5939",
      description: "\u9009\u62E9\u5907\u4EFD\u6587\u4EF6\u5939\u6309\u94AE"
    },
    backupFolderSelected: {
      message: "\u5907\u4EFD\u6587\u4EF6\u5939\uFF1A{folder}",
      description: "\u663E\u793A\u5DF2\u9009\u62E9\u7684\u5907\u4EFD\u6587\u4EF6\u5939"
    },
    backupIncludePrompts: {
      message: "\u5305\u542B\u63D0\u793A\u8BCD",
      description: "\u5907\u4EFD\u4E2D\u5305\u542B\u63D0\u793A\u8BCD\u5F00\u5173"
    },
    backupIncludeFolders: {
      message: "\u5305\u542B\u6587\u4EF6\u5939",
      description: "\u5907\u4EFD\u4E2D\u5305\u542B\u6587\u4EF6\u5939\u5F00\u5173"
    },
    backupIntervalLabel: {
      message: "\u5907\u4EFD\u95F4\u9694",
      description: "\u5907\u4EFD\u95F4\u9694\u6807\u7B7E"
    },
    backupIntervalManual: {
      message: "\u4EC5\u624B\u52A8",
      description: "\u624B\u52A8\u5907\u4EFD\u6A21\u5F0F"
    },
    backupIntervalDaily: {
      message: "\u6BCF\u5929",
      description: "\u6BCF\u5929\u5907\u4EFD\u95F4\u9694"
    },
    backupIntervalWeekly: {
      message: "\u6BCF\u5468\uFF087 \u5929\uFF09",
      description: "\u6BCF\u5468\u5907\u4EFD\u95F4\u9694"
    },
    backupLastBackup: {
      message: "\u4E0A\u6B21\u5907\u4EFD\uFF1A{time}",
      description: "\u4E0A\u6B21\u5907\u4EFD\u65F6\u95F4\u6233"
    },
    backupNever: {
      message: "\u4ECE\u672A",
      description: "\u4ECE\u672A\u5907\u4EFD\u8FC7"
    },
    backupSuccess: {
      message: "\u2713 \u5907\u4EFD\u521B\u5EFA\u6210\u529F\uFF1A{prompts} \u4E2A\u63D0\u793A\u8BCD\u3001{folders} \u4E2A\u6587\u4EF6\u5939\u3001{conversations} \u4E2A\u5BF9\u8BDD",
      description: "\u5907\u4EFD\u6210\u529F\u6D88\u606F"
    },
    backupError: {
      message: "\u2717 \u5907\u4EFD\u5931\u8D25\uFF1A{error}",
      description: "\u5907\u4EFD\u9519\u8BEF\u6D88\u606F"
    },
    backupNotSupported: {
      message: "\u26A0\uFE0F \u81EA\u52A8\u5907\u4EFD\u9700\u8981\u652F\u6301\u6587\u4EF6\u7CFB\u7EDF\u8BBF\u95EE API \u7684\u73B0\u4EE3\u6D4F\u89C8\u5668",
      description: "\u6D4F\u89C8\u5668\u4E0D\u652F\u6301\u6D88\u606F"
    },
    backupSelectFolderFirst: {
      message: "\u8BF7\u5148\u9009\u62E9\u5907\u4EFD\u6587\u4EF6\u5939",
      description: "\u672A\u9009\u62E9\u6587\u4EF6\u5939\u8B66\u544A"
    },
    backupUserCancelled: {
      message: "\u5907\u4EFD\u5DF2\u53D6\u6D88",
      description: "\u7528\u6237\u53D6\u6D88\u6587\u4EF6\u5939\u9009\u62E9"
    },
    backupConfigSaved: {
      message: "\u2713 \u5907\u4EFD\u8BBE\u7F6E\u5DF2\u4FDD\u5B58",
      description: "\u914D\u7F6E\u4FDD\u5B58\u6D88\u606F"
    },
    backupPermissionDenied: {
      message: "\u26A0\uFE0F \u65E0\u6CD5\u8BBF\u95EE\u6B64\u76EE\u5F55\u3002\u8BF7\u9009\u62E9\u5176\u4ED6\u4F4D\u7F6E\uFF08\u4F8B\u5982\uFF1A\u6587\u6863\u3001\u4E0B\u8F7D\uFF0C\u6216\u684C\u9762\u4E2D\u7684\u81EA\u5B9A\u4E49\u6587\u4EF6\u5939\uFF09",
      description: "\u53D7\u9650\u76EE\u5F55\u6743\u9650\u88AB\u62D2\u7EDD"
    },
    backupConfigureInOptions: {
      message: "\u5907\u4EFD\u529F\u80FD\u9700\u8981\u5728\u9009\u9879\u9875\u9762\u4E2D\u914D\u7F6E\u3002\u70B9\u51FB\u4E0B\u65B9\u6309\u94AE\u6253\u5F00\u9009\u9879\u9875\u9762\uFF08\u70B9\u51FB\u6269\u5C55\u56FE\u6807\u65C1\u7684\u4E09\u4E2A\u70B9 \u2192 \u9009\u9879\uFF09\u3002",
      description: "\u5907\u4EFD\u914D\u7F6E\u5728\u9009\u9879\u9875\u9762\u7684\u8BF4\u660E"
    },
    openOptionsPage: {
      message: "\u6253\u5F00\u9009\u9879\u9875\u9762",
      description: "\u6253\u5F00\u9009\u9879\u9875\u9762\u6309\u94AE"
    },
    optionsPageSubtitle: {
      message: "\u6269\u5C55\u9009\u9879",
      description: "\u9009\u9879\u9875\u526F\u6807\u9898"
    },
    optionsComingSoon: {
      message: "\u66F4\u591A\u9009\u9879\u5373\u5C06\u4E0A\u7EBF...",
      description: "\u9009\u9879\u9875\u5360\u4F4D\u63D0\u793A"
    },
    backupDataAccessNotice: {
      message: "\u6570\u636E\u8BBF\u95EE\u9650\u5236",
      description: "\u5907\u4EFD\u6570\u636E\u8BBF\u95EE\u9650\u5236\u6807\u9898"
    },
    backupDataAccessHint: {
      message: "\u7531\u4E8E\u6D4F\u89C8\u5668\u5B89\u5168\u9650\u5236\uFF0C\u9009\u9879\u9875\u9762\u65E0\u6CD5\u76F4\u63A5\u8BFB\u53D6 Gemini \u9875\u9762\u7684\u63D0\u793A\u8BCD\u548C\u6587\u4EF6\u5939\u6570\u636E\u3002\u5EFA\u8BAE\u4F7F\u7528 Gemini \u9875\u9762\u4E0A\u7684\u63D0\u793A\u8BCD\u7BA1\u7406\u5668\u548C\u6587\u4EF6\u5939\u5BFC\u51FA\u529F\u80FD\u8FDB\u884C\u624B\u52A8\u5907\u4EFD\u3002",
      description: "\u5907\u4EFD\u6570\u636E\u8BBF\u95EE\u9650\u5236\u8BF4\u660E"
    },
    promptManagerOptions: {
      message: "\u63D0\u793A\u8BCD\u7BA1\u7406\u5668",
      description: "\u63D0\u793A\u8BCD\u7BA1\u7406\u5668\u9009\u9879\u533A\u57DF\u6807\u7B7E"
    },
    hidePromptManager: {
      message: "\u9690\u85CF\u63D0\u793A\u8BCD\u7BA1\u7406\u5668",
      description: "\u9690\u85CF\u63D0\u793A\u8BCD\u7BA1\u7406\u5668\u60AC\u6D6E\u7403"
    },
    hidePromptManagerHint: {
      message: "\u9690\u85CF\u9875\u9762\u4E0A\u7684\u63D0\u793A\u8BCD\u7BA1\u7406\u5668\u60AC\u6D6E\u7403",
      description: "\u9690\u85CF\u63D0\u793A\u8BCD\u7BA1\u7406\u5668\u529F\u80FD\u63D0\u793A"
    },
    customWebsites: {
      message: "\u81EA\u5B9A\u4E49\u7F51\u7AD9",
      description: "\u63D0\u793A\u8BCD\u7BA1\u7406\u5668\u7684\u81EA\u5B9A\u4E49\u7F51\u7AD9"
    },
    customWebsitesPlaceholder: {
      message: "\u8F93\u5165\u7F51\u7AD9 URL\uFF08\u4F8B\u5982\uFF1Achatgpt.com\uFF09",
      description: "\u81EA\u5B9A\u4E49\u7F51\u7AD9\u8F93\u5165\u5360\u4F4D\u7B26"
    },
    customWebsitesHint: {
      message: "\u6DFB\u52A0\u60A8\u60F3\u8981\u4F7F\u7528\u63D0\u793A\u8BCD\u7BA1\u7406\u5668\u7684\u7F51\u7AD9\u3002\u8FD9\u4E9B\u7F51\u7AD9\u4E0A\u53EA\u4F1A\u6FC0\u6D3B\u63D0\u793A\u8BCD\u7BA1\u7406\u5668\u529F\u80FD\u3002",
      description: "\u81EA\u5B9A\u4E49\u7F51\u7AD9\u63D0\u793A"
    },
    addWebsite: {
      message: "\u6DFB\u52A0\u7F51\u7AD9",
      description: "\u6DFB\u52A0\u7F51\u7AD9\u6309\u94AE"
    },
    removeWebsite: {
      message: "\u79FB\u9664",
      description: "\u79FB\u9664\u7F51\u7AD9\u6309\u94AE"
    },
    invalidUrl: {
      message: "URL \u683C\u5F0F\u65E0\u6548",
      description: "\u65E0\u6548 URL \u9519\u8BEF\u6D88\u606F"
    },
    websiteAdded: {
      message: "\u7F51\u7AD9\u5DF2\u6DFB\u52A0",
      description: "\u7F51\u7AD9\u6DFB\u52A0\u6210\u529F\u6D88\u606F"
    },
    websiteRemoved: {
      message: "\u7F51\u7AD9\u5DF2\u79FB\u9664",
      description: "\u7F51\u7AD9\u79FB\u9664\u6210\u529F\u6D88\u606F"
    },
    permissionDenied: {
      message: "\u6743\u9650\u88AB\u62D2\u7EDD\u3002\u8BF7\u5141\u8BB8\u8BBF\u95EE\u6B64\u7F51\u7AD9\u3002",
      description: "\u6743\u9650\u88AB\u62D2\u7EDD\u9519\u8BEF\u6D88\u606F"
    },
    permissionRequestFailed: {
      message: "\u8BF7\u6C42\u6743\u9650\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5\u6216\u5728\u6269\u5C55\u8BBE\u7F6E\u4E2D\u624B\u52A8\u6388\u6743\u3002",
      description: "\u8BF7\u6C42\u6743\u9650\u5931\u8D25\u6D88\u606F"
    },
    customWebsitesNote: {
      message: "\u63D0\u793A\uFF1A\u6DFB\u52A0\u7F51\u7AD9\u65F6\u4F1A\u5F39\u51FA\u6388\u6743\uFF0C\u8BF7\u5148\u5141\u8BB8\uFF0C\u518D\u5237\u65B0\u8BE5\u7AD9\u70B9\u5373\u53EF\u542F\u7528\u63D0\u793A\u8BCD\u7BA1\u7406\u5668\u3002",
      description: "\u81EA\u5B9A\u4E49\u7F51\u7AD9\u91CD\u65B0\u52A0\u8F7D/\u6743\u9650\u63D0\u793A"
    },
    starredHistory: {
      message: "\u661F\u6807\u5386\u53F2",
      description: "\u661F\u6807\u5386\u53F2\u6807\u9898"
    },
    viewStarredHistory: {
      message: "\u67E5\u770B\u661F\u6807\u5386\u53F2",
      description: "\u67E5\u770B\u661F\u6807\u5386\u53F2\u6309\u94AE"
    },
    noStarredMessages: {
      message: "\u6682\u65E0\u661F\u6807\u6D88\u606F",
      description: "\u65E0\u661F\u6807\u6D88\u606F\u5360\u4F4D\u7B26"
    },
    removeFromStarred: {
      message: "\u53D6\u6D88\u661F\u6807",
      description: "\u53D6\u6D88\u661F\u6807\u63D0\u793A"
    },
    justNow: {
      message: "\u521A\u521A",
      description: "\u521A\u521A\u65F6\u95F4\u6807\u7B7E"
    },
    hoursAgo: {
      message: "\u5C0F\u65F6\u524D",
      description: "\u5C0F\u65F6\u524D\u6807\u7B7E"
    },
    yesterday: {
      message: "\u6628\u5929",
      description: "\u6628\u5929\u65E5\u671F\u6807\u7B7E"
    },
    daysAgo: {
      message: "\u5929\u524D",
      description: "\u5929\u524D\u6807\u7B7E"
    },
    loading: {
      message: "\u52A0\u8F7D\u4E2D...",
      description: "\u52A0\u8F7D\u6D88\u606F"
    },
    keyboardShortcuts: {
      message: "\u952E\u76D8\u5FEB\u6377\u952E",
      description: "\u952E\u76D8\u5FEB\u6377\u952E\u90E8\u5206\u6807\u9898"
    },
    enableShortcuts: {
      message: "\u542F\u7528\u952E\u76D8\u5FEB\u6377\u952E",
      description: "\u542F\u7528\u5FEB\u6377\u952E\u5F00\u5173\u6807\u7B7E"
    },
    previousNode: {
      message: "\u4E0A\u4E00\u4E2A\u8282\u70B9",
      description: "\u4E0A\u4E00\u4E2A\u65F6\u95F4\u7EBF\u8282\u70B9\u5FEB\u6377\u952E\u6807\u7B7E"
    },
    nextNode: {
      message: "\u4E0B\u4E00\u4E2A\u8282\u70B9",
      description: "\u4E0B\u4E00\u4E2A\u65F6\u95F4\u7EBF\u8282\u70B9\u5FEB\u6377\u952E\u6807\u7B7E"
    },
    shortcutKey: {
      message: "\u6309\u952E",
      description: "\u5FEB\u6377\u952E\u6309\u952E\u6807\u7B7E"
    },
    shortcutModifiers: {
      message: "\u4FEE\u9970\u952E",
      description: "\u5FEB\u6377\u952E\u4FEE\u9970\u952E\u6807\u7B7E"
    },
    resetShortcuts: {
      message: "\u6062\u590D\u9ED8\u8BA4",
      description: "\u91CD\u7F6E\u5FEB\u6377\u952E\u6309\u94AE"
    },
    shortcutsResetSuccess: {
      message: "\u5FEB\u6377\u952E\u5DF2\u6062\u590D\u9ED8\u8BA4\u8BBE\u7F6E",
      description: "\u5FEB\u6377\u952E\u91CD\u7F6E\u6210\u529F\u6D88\u606F"
    },
    shortcutsDescription: {
      message: "\u4F7F\u7528\u952E\u76D8\u5FEB\u6377\u952E\u5BFC\u822A\u65F6\u95F4\u7EBF\u8282\u70B9",
      description: "\u5FEB\u6377\u952E\u63CF\u8FF0"
    },
    modifierNone: {
      message: "\u65E0",
      description: "\u65E0\u4FEE\u9970\u952E"
    },
    modifierAlt: {
      message: "Alt",
      description: "Alt \u4FEE\u9970\u952E"
    },
    modifierCtrl: {
      message: "Ctrl",
      description: "Ctrl \u4FEE\u9970\u952E"
    },
    modifierShift: {
      message: "Shift",
      description: "Shift \u4FEE\u9970\u952E"
    },
    modifierMeta: {
      message: "Cmd/Win",
      description: "Meta/Command/Windows \u4FEE\u9970\u952E"
    },
    cloudSync: {
      message: "\u4E91\u540C\u6B65",
      description: "\u4E91\u540C\u6B65\u533A\u57DF\u6807\u9898"
    },
    cloudSyncDescription: {
      message: "\u5C06\u6587\u4EF6\u5939\u548C\u63D0\u793A\u8BCD\u540C\u6B65\u5230 Google Drive",
      description: "\u4E91\u540C\u6B65\u63CF\u8FF0"
    },
    syncModeDisabled: {
      message: "\u5DF2\u7981\u7528",
      description: "\u540C\u6B65\u6A21\u5F0F\u7981\u7528\u9009\u9879"
    },
    syncModeManual: {
      message: "\u624B\u52A8",
      description: "\u540C\u6B65\u6A21\u5F0F\u624B\u52A8\u9009\u9879"
    },
    syncServerPort: {
      message: "\u670D\u52A1\u7AEF\u53E3",
      description: "\u540C\u6B65\u670D\u52A1\u7AEF\u53E3\u53F7"
    },
    syncNow: {
      message: "\u7ACB\u5373\u540C\u6B65",
      description: "\u7ACB\u5373\u540C\u6B65\u6309\u94AE"
    },
    lastSynced: {
      message: "\u4E0A\u6B21\u540C\u6B65\uFF1A{time}",
      description: "\u4E0A\u6B21\u540C\u6B65\u65F6\u95F4\u6233"
    },
    neverSynced: {
      message: "\u4ECE\u672A\u540C\u6B65",
      description: "\u4ECE\u672A\u540C\u6B65\u6D88\u606F"
    },
    lastUploaded: {
      message: "\u4E0A\u6B21\u4E0A\u4F20\uFF1A{time}",
      description: "\u4E0A\u6B21\u4E0A\u4F20\u65F6\u95F4\u6233"
    },
    neverUploaded: {
      message: "\u4ECE\u672A\u4E0A\u4F20",
      description: "\u4ECE\u672A\u4E0A\u4F20\u6D88\u606F"
    },
    syncSuccess: {
      message: "\u2713 \u540C\u6B65\u6210\u529F",
      description: "\u540C\u6B65\u6210\u529F\u6D88\u606F"
    },
    syncError: {
      message: "\u2717 \u540C\u6B65\u5931\u8D25\uFF1A{error}",
      description: "\u540C\u6B65\u9519\u8BEF\u6D88\u606F"
    },
    syncInProgress: {
      message: "\u540C\u6B65\u4E2D...",
      description: "\u540C\u6B65\u8FDB\u884C\u4E2D\u6D88\u606F"
    },
    uploadInProgress: {
      message: "\u4E0A\u4F20\u4E2D...",
      description: "\u4E0A\u4F20\u8FDB\u884C\u4E2D\u6D88\u606F"
    },
    uploadSuccess: {
      message: "\u2713 \u4E0A\u4F20\u6210\u529F",
      description: "\u4E0A\u4F20\u6210\u529F\u6D88\u606F"
    },
    downloadInProgress: {
      message: "\u4E0B\u8F7D\u4E2D...",
      description: "\u4E0B\u8F7D\u8FDB\u884C\u4E2D\u6D88\u606F"
    },
    downloadMergeSuccess: {
      message: "\u2713 \u4E0B\u8F7D\u5408\u5E76\u6210\u529F",
      description: "\u4E0B\u8F7D\u5408\u5E76\u6210\u529F\u6D88\u606F"
    },
    syncUpload: {
      message: "\u4E0A\u4F20\u5230\u4E91\u7AEF",
      description: "\u4E0A\u4F20\u5230\u4E91\u7AEF\u6309\u94AE"
    },
    syncMerge: {
      message: "\u4ECE\u4E91\u7AEF\u4E0B\u8F7D\u5408\u5E76",
      description: "\u540C\u6B65\uFF08\u5408\u5E76\uFF09\u6309\u94AE"
    },
    syncMode: {
      message: "\u540C\u6B65\u6A21\u5F0F",
      description: "\u540C\u6B65\u6A21\u5F0F\u6807\u7B7E"
    },
    minutesAgo: {
      message: "\u5206\u949F\u524D",
      description: "\u5206\u949F\u524D\u6807\u7B7E"
    },
    syncNoData: {
      message: "\u672A\u5728\u4E91\u7AEF\u627E\u5230\u540C\u6B65\u6570\u636E",
      description: "Error message when no data is found in Drive"
    },
    syncUploadFailed: {
      message: "\u4E0A\u4F20\u5931\u8D25",
      description: "Error message when upload fails"
    },
    syncDownloadFailed: {
      message: "\u4E0B\u8F7D\u5931\u8D25",
      description: "Error message when download fails"
    },
    syncAuthFailed: {
      message: "\u8BA4\u8BC1\u5931\u8D25",
      description: "Error message when authentication fails"
    },
    signOut: {
      message: "\u9000\u51FA\u767B\u5F55",
      description: "\u9000\u51FA\u767B\u5F55\u6309\u94AE"
    },
    signInWithGoogle: {
      message: "\u4F7F\u7528 Google \u767B\u5F55",
      description: "\u4F7F\u7528 Google \u767B\u5F55\u6309\u94AE"
    },
    nanobananaOptions: {
      message: "NanoBanana \u9009\u9879",
      description: "NanoBanana options section label"
    },
    enableNanobananaWatermarkRemover: {
      message: "\u53BB\u9664 NanoBanana \u6C34\u5370",
      description: "\u542F\u7528\u81EA\u52A8\u53BB\u9664\u751F\u6210\u56FE\u7247\u6C34\u5370\u529F\u80FD"
    },
    nanobananaWatermarkRemoverHint: {
      message: "\u81EA\u52A8\u79FB\u9664 Gemini \u751F\u6210\u56FE\u7247\u4E0A\u7684\u53EF\u89C1\u6C34\u5370",
      description: "\u6C34\u5370\u53BB\u9664\u529F\u80FD\u63D0\u793A"
    },
    nanobananaDownloadTooltip: {
      message: "\u4E0B\u8F7D\u65E0\u6C34\u5370\u56FE\u7247 (NanoBanana)",
      description: "Download button tooltip"
    },
    deepResearchDownload: {
      message: "\u4E0B\u8F7D Thinking \u5185\u5BB9",
      description: "Deep Research download button text"
    },
    deepResearchDownloadTooltip: {
      message: "\u5C06 Thinking \u5185\u5BB9\u5BFC\u51FA\u4E3A Markdown \u6587\u4EF6",
      description: "Deep Research download button tooltip"
    },
    folder_uncategorized: {
      message: "\u672A\u5206\u7C7B",
      description: "\u6839\u76EE\u5F55\u4E0B\u672A\u5206\u7C7B\u5BF9\u8BDD\u7684\u6807\u7B7E"
    },
    timelineLevelTitle: {
      message: "\u8282\u70B9\u5C42\u7EA7",
      description: "\u65F6\u95F4\u7EBF\u8282\u70B9\u5C42\u7EA7\u53F3\u952E\u83DC\u5355\u6807\u9898"
    },
    timelineLevel1: {
      message: "\u4E00\u7EA7",
      description: "\u65F6\u95F4\u7EBF\u8282\u70B9\u4E00\u7EA7\u9009\u9879"
    },
    timelineLevel2: {
      message: "\u4E8C\u7EA7",
      description: "\u65F6\u95F4\u7EBF\u8282\u70B9\u4E8C\u7EA7\u9009\u9879"
    },
    timelineLevel3: {
      message: "\u4E09\u7EA7",
      description: "\u65F6\u95F4\u7EBF\u8282\u70B9\u4E09\u7EA7\u9009\u9879"
    },
    timelineCollapse: {
      message: "\u6536\u8D77",
      description: "\u6536\u8D77\u5B50\u8282\u70B9"
    },
    timelineExpand: {
      message: "\u5C55\u5F00",
      description: "\u5C55\u5F00\u5B50\u8282\u70B9"
    },
    timelinePreviewSearch: {
      message: "\u641C\u7D22...",
      description: "Timeline preview panel search placeholder"
    },
    timelinePreviewNoResults: {
      message: "\u65E0\u7ED3\u679C",
      description: "Timeline preview panel no search results"
    },
    timelinePreviewNoMessages: {
      message: "\u6682\u65E0\u6D88\u606F",
      description: "Timeline preview panel no messages"
    },
    quoteReply: {
      message: "\u5F15\u7528\u56DE\u590D",
      description: "\u5F15\u7528\u56DE\u590D\u6309\u94AE\u6587\u672C"
    },
    inputCollapseOptions: {
      message: "\u8F93\u5165\u9009\u9879",
      description: "\u8F93\u5165\u9009\u9879\u533A\u57DF\u6807\u7B7E"
    },
    enableInputCollapse: {
      message: "\u542F\u7528\u8F93\u5165\u6846\u6298\u53E0",
      description: "\u542F\u7528\u8F93\u5165\u6846\u6298\u53E0\u5F00\u5173\u6807\u7B7E"
    },
    enableInputCollapseHint: {
      message: "\u8F93\u5165\u6846\u4E3A\u7A7A\u65F6\u81EA\u52A8\u6298\u53E0\uFF0C\u83B7\u5F97\u66F4\u591A\u9605\u8BFB\u7A7A\u95F4",
      description: "\u8F93\u5165\u6846\u6298\u53E0\u529F\u80FD\u63D0\u793A"
    },
    inputCollapsePlaceholder: {
      message: "\u7ED9 Gemini \u53D1\u6D88\u606F",
      description: "\u6298\u53E0\u8F93\u5165\u6846\u65F6\u663E\u793A\u7684\u5360\u4F4D\u7B26\u6587\u672C"
    },
    ctrlEnterSend: {
      message: "Ctrl+Enter \u53D1\u9001",
      description: "Ctrl+Enter \u53D1\u9001\u5F00\u5173\u6807\u7B7E"
    },
    ctrlEnterSendHint: {
      message: "\u6309 Ctrl+Enter \u53D1\u9001\u6D88\u606F\uFF0CEnter \u952E\u4EC5\u6362\u884C",
      description: "Ctrl+Enter \u53D1\u9001\u529F\u80FD\u63D0\u793A"
    },
    batch_delete_confirm: {
      message: "\u786E\u5B9A\u8981\u5220\u9664 {count} \u4E2A\u4F1A\u8BDD\u5417\uFF1F\u6B64\u64CD\u4F5C\u65E0\u6CD5\u64A4\u9500\u3002",
      description: "\u6279\u91CF\u5220\u9664\u786E\u8BA4\u6D88\u606F"
    },
    batch_delete_in_progress: {
      message: "\u6B63\u5728\u5220\u9664... ({current}/{total})",
      description: "\u6279\u91CF\u5220\u9664\u8FDB\u5EA6\u6D88\u606F"
    },
    batch_delete_success: {
      message: "\u2713 \u5DF2\u5220\u9664 {count} \u4E2A\u4F1A\u8BDD",
      description: "\u6279\u91CF\u5220\u9664\u6210\u529F\u6D88\u606F"
    },
    batch_delete_partial: {
      message: "\u5220\u9664\u5B8C\u6210\uFF1A{success} \u4E2A\u6210\u529F\uFF0C{failed} \u4E2A\u5931\u8D25",
      description: "\u6279\u91CF\u5220\u9664\u90E8\u5206\u6210\u529F\u6D88\u606F"
    },
    batch_delete_limit_reached: {
      message: "\u4E00\u6B21\u6700\u591A\u53EF\u9009\u62E9 {max} \u4E2A\u4F1A\u8BDD",
      description: "\u6279\u91CF\u5220\u9664\u6570\u91CF\u9650\u5236\u8B66\u544A"
    },
    batch_delete_button: {
      message: "\u5220\u9664\u6240\u9009",
      description: "\u591A\u9009\u6A21\u5F0F\u4E0B\u7684\u6279\u91CF\u5220\u9664\u6309\u94AE\u63D0\u793A"
    },
    batch_delete_match_patterns: {
      message: "\u5220\u9664,\u786E\u8BA4,\u786E\u5B9A,\u662F,delete,confirm,yes,ok,remove",
      description: "\u5339\u914D\u539F\u751F\u5220\u9664/\u786E\u8BA4\u6309\u94AE\u7684\u5173\u952E\u8BCD\u5217\u8868\uFF08\u9017\u53F7\u5206\u9694\uFF09"
    },
    generalOptions: {
      message: "\u901A\u7528\u9009\u9879",
      description: "\u901A\u7528\u9009\u9879\u533A\u57DF\u6807\u7B7E"
    },
    enableTabTitleUpdate: {
      message: "\u540C\u6B65\u6807\u7B7E\u9875\u6807\u9898\u4E0E\u5BF9\u8BDD",
      description: "\u542F\u7528\u6807\u7B7E\u9875\u6807\u9898\u540C\u6B65\u5F00\u5173\u6807\u7B7E"
    },
    enableTabTitleUpdateHint: {
      message: "\u81EA\u52A8\u5C06\u6D4F\u89C8\u5668\u6807\u7B7E\u9875\u6807\u9898\u66F4\u65B0\u4E3A\u5F53\u524D\u5BF9\u8BDD\u7684\u6807\u9898",
      description: "\u6807\u7B7E\u9875\u6807\u9898\u540C\u6B65\u529F\u80FD\u63D0\u793A"
    },
    enableMermaidRendering: {
      message: "\u542F\u7528 Mermaid \u56FE\u8868\u6E32\u67D3",
      description: "\u542F\u7528 Mermaid \u56FE\u8868\u6E32\u67D3\u5F00\u5173\u6807\u7B7E"
    },
    enableMermaidRenderingHint: {
      message: "\u81EA\u52A8\u5C06\u4EE3\u7801\u5757\u4E2D\u7684 Mermaid \u4EE3\u7801\u6E32\u67D3\u4E3A\u56FE\u8868",
      description: "Mermaid \u6E32\u67D3\u529F\u80FD\u63D0\u793A"
    },
    enableQuoteReply: {
      message: "\u542F\u7528\u5F15\u7528\u56DE\u590D",
      description: "\u542F\u7528\u5F15\u7528\u56DE\u590D\u5F00\u5173\u6807\u7B7E"
    },
    enableQuoteReplyHint: {
      message: "\u5728\u5BF9\u8BDD\u4E2D\u9009\u4E2D\u6587\u5B57\u65F6\u663E\u793A\u60AC\u6D6E\u6309\u94AE\uFF0C\u7528\u4E8E\u5F15\u7528\u6240\u9009\u5185\u5BB9",
      description: "\u5F15\u7528\u56DE\u590D\u529F\u80FD\u63D0\u793A"
    },
    contextSync: {
      message: "\u4E0A\u4E0B\u6587\u540C\u6B65",
      description: "\u4E0A\u4E0B\u6587\u540C\u6B65\u6807\u9898"
    },
    contextSyncDescription: {
      message: "\u5C06\u5BF9\u8BDD\u4E0A\u4E0B\u6587\u540C\u6B65\u5230\u672C\u5730 IDE",
      description: "\u4E0A\u4E0B\u6587\u540C\u6B65\u63CF\u8FF0"
    },
    syncToIDE: {
      message: "\u540C\u6B65\u5230 IDE",
      description: "\u540C\u6B65\u5230 IDE \u6309\u94AE"
    },
    ideOnline: {
      message: "IDE \u5728\u7EBF",
      description: "IDE \u5728\u7EBF\u72B6\u6001"
    },
    ideOffline: {
      message: "IDE \u79BB\u7EBF",
      description: "IDE \u79BB\u7EBF\u72B6\u6001"
    },
    syncing: {
      message: "\u540C\u6B65\u4E2D...",
      description: "\u540C\u6B65\u4E2D\u72B6\u6001"
    },
    checkServer: {
      message: "\u8BF7\u5728 VS Code \u4E2D\u542F\u52A8 AI Sync \u670D\u52A1\u5668",
      description: "\u68C0\u67E5\u670D\u52A1\u5668\u63D0\u793A"
    },
    capturing: {
      message: "\u6B63\u5728\u83B7\u53D6\u5BF9\u8BDD...",
      description: "\u83B7\u53D6\u5BF9\u8BDD\u72B6\u6001"
    },
    syncedSuccess: {
      message: "\u540C\u6B65\u6210\u529F\uFF01",
      description: "\u540C\u6B65\u6210\u529F\u6D88\u606F"
    },
    downloadingOriginal: {
      message: "\u6B63\u5728\u4E0B\u8F7D\u539F\u59CB\u56FE\u7247",
      description: "\u4E0B\u8F7D\u539F\u59CB\u56FE\u7247\u65F6\u7684\u72B6\u6001"
    },
    downloadingOriginalLarge: {
      message: "\u6B63\u5728\u4E0B\u8F7D\u539F\u59CB\u56FE\u7247\uFF08\u5927\u6587\u4EF6\uFF09",
      description: "\u4E0B\u8F7D\u8F83\u5927\u539F\u59CB\u56FE\u7247\u65F6\u7684\u72B6\u6001"
    },
    downloadLargeWarning: {
      message: "\u5927\u6587\u4EF6\u8B66\u544A",
      description: "\u5927\u6587\u4EF6\u4E0B\u8F7D\u63D0\u793A"
    },
    downloadProcessing: {
      message: "\u6B63\u5728\u5904\u7406\u6C34\u5370\u4E2D",
      description: "\u5904\u7406\u6C34\u5370\u65F6\u7684\u72B6\u6001"
    },
    downloadSuccess: {
      message: "\u6B63\u5728\u4E0B\u8F7D",
      description: "\u5F00\u59CB\u4E0B\u8F7D\u65F6\u7684\u72B6\u6001"
    },
    downloadError: {
      message: "\u5931\u8D25",
      description: "\u4E0B\u8F7D\u5931\u8D25\u65F6\u7684\u72B6\u6001\u524D\u7F00"
    },
    recentsHide: {
      message: "\u9690\u85CF\u6700\u8FD1\u9879\u76EE",
      description: "\u9690\u85CF\u6700\u8FD1\u9884\u89C8\u533A\u57DF\u7684\u63D0\u793A"
    },
    recentsShow: {
      message: "\u663E\u793A\u6700\u8FD1\u9879\u76EE",
      description: "\u663E\u793A\u6700\u8FD1\u9884\u89C8\u533A\u57DF\u7684\u63D0\u793A"
    },
    gemsHide: {
      message: "\u9690\u85CF Gems",
      description: "\u9690\u85CF Gems \u5217\u8868\u533A\u57DF\u7684\u63D0\u793A"
    },
    gemsShow: {
      message: "\u663E\u793A Gems",
      description: "\u663E\u793A Gems \u5217\u8868\u533A\u57DF\u7684\u63D0\u793A"
    },
    setAsDefaultModel: {
      message: "\u8BBE\u4E3A\u65B0\u5BF9\u8BDD\u7684\u9ED8\u8BA4\u6A21\u578B",
      description: "Tooltip for setting default model"
    },
    cancelDefaultModel: {
      message: "\u53D6\u6D88\u9ED8\u8BA4\u6A21\u578B",
      description: "Tooltip for cancelling default model"
    },
    defaultModelSet: {
      message: "\u5DF2\u8BBE\u7F6E\u9ED8\u8BA4\u6A21\u578B\uFF1A$1",
      description: "Toast message when default model is set"
    },
    defaultModelCleared: {
      message: "\u5DF2\u53D6\u6D88\u9ED8\u8BA4\u6A21\u578B",
      description: "Toast message when default model is cleared"
    },
    sidebarAutoHide: {
      message: "\u4FA7\u8FB9\u680F\u81EA\u52A8\u6536\u8D77",
      description: "\u4FA7\u8FB9\u680F\u81EA\u52A8\u6536\u8D77\u5F00\u5173\u6807\u7B7E"
    },
    sidebarAutoHideHint: {
      message: "\u9F20\u6807\u79BB\u5F00\u65F6\u81EA\u52A8\u6536\u8D77\u4FA7\u8FB9\u680F\uFF0C\u9F20\u6807\u8FDB\u5165\u65F6\u5C55\u5F00",
      description: "\u4FA7\u8FB9\u680F\u81EA\u52A8\u6536\u8D77\u529F\u80FD\u63D0\u793A"
    },
    folderSpacing: {
      message: "\u6587\u4EF6\u5939\u95F4\u8DDD",
      description: "\u6587\u4EF6\u5939\u95F4\u8DDD\u8C03\u8282\u6807\u7B7E"
    },
    folderSpacingCompact: {
      message: "\u7D27\u51D1",
      description: "\u7D27\u51D1\u6587\u4EF6\u5939\u95F4\u8DDD\u6807\u7B7E"
    },
    folderSpacingSpacious: {
      message: "\u5BBD\u677E",
      description: "\u5BBD\u677E\u6587\u4EF6\u5939\u95F4\u8DDD\u6807\u7B7E"
    },
    folderTreeIndent: {
      message: "\u5B50\u6587\u4EF6\u5939\u7F29\u8FDB",
      description: "\u5B50\u6587\u4EF6\u5939\u6811\u5F62\u7F29\u8FDB\u8C03\u8282\u6807\u7B7E"
    },
    folderTreeIndentCompact: {
      message: "\u66F4\u7A84",
      description: "\u8F83\u7A84\u7684\u5B50\u6587\u4EF6\u5939\u7F29\u8FDB\u6807\u7B7E"
    },
    folderTreeIndentSpacious: {
      message: "\u66F4\u5BBD",
      description: "\u8F83\u5BBD\u7684\u5B50\u6587\u4EF6\u5939\u7F29\u8FDB\u6807\u7B7E"
    },
    export_select_mode_select_all: {
      message: "\u5168\u9009",
      description: "Selection mode select all toggle"
    },
    export_select_mode_count: {
      message: "\u5DF2\u9009\u62E9 {count} \u6761",
      description: "Selection mode selected message count"
    },
    export_select_mode_toggle: {
      message: "\u9009\u62E9\u6D88\u606F",
      description: "Selection mode per-message toggle tooltip"
    },
    export_select_mode_select_below: {
      message: "\u9009\u62E9\u4E0B\u65B9\u6D88\u606F",
      description: "Selection mode top-left button to select messages below current line"
    },
    export_select_mode_empty: {
      message: "\u8BF7\u81F3\u5C11\u9009\u62E9\u4E00\u6761\u6D88\u606F\u8FDB\u884C\u5BFC\u51FA",
      description: "Selection mode validation when nothing is selected"
    },
    export_format_image_description: {
      message: "\u5355\u5F20PNG\u56FE\u7247\uFF0C\u4FBF\u4E8E\u79FB\u52A8\u7AEF\u5206\u4EAB\u3002",
      description: "Description for Image export format"
    },
    export_image_progress: {
      message: "\u6B63\u5728\u751F\u6210\u56FE\u7247...",
      description: "Progress message while generating image export"
    },
    deepResearchSaveReport: {
      message: "\u4FDD\u5B58\u62A5\u544A",
      description: "Deep Research save report button"
    },
    deepResearchSaveReportTooltip: {
      message: "\u5BFC\u51FA\u6B64\u7814\u7A76\u62A5\u544A",
      description: "Deep Research save report tooltip"
    },
    export_fontsize_label: {
      message: "\u5B57\u4F53\u5927\u5C0F",
      description: "Label for font size slider in export dialog"
    },
    export_fontsize_preview: {
      message: "\u5929\u5730\u7384\u9EC4\uFF0C\u5B87\u5B99\u6D2A\u8352\u3002\u65E5\u6708\u76C8\u6603\uFF0C\u8FB0\u5BBF\u5217\u5F20\u3002",
      description: "Preview text for font size slider in export dialog"
    },
    export_error_generic: {
      message: "\u5BFC\u51FA\u5931\u8D25\uFF1A{error}",
      description: "\u5E26\u5177\u4F53\u539F\u56E0\u7684\u5BFC\u51FA\u5931\u8D25\u63D0\u793A"
    },
    export_error_refresh_retry: {
      message: "\u56E0\u7F51\u7EDC\u539F\u56E0\uFF0C\u56FE\u7247\u5BFC\u51FA\u5931\u8D25\uFF0C\u8BF7\u5237\u65B0\u9875\u9762\u540E\u91CD\u8BD5\u3002",
      description: "\u56FE\u7247\u5BFC\u51FA\u9047\u5230\u77AC\u65F6\u52A0\u8F7D\u5931\u8D25\u65F6\u7684\u5237\u65B0\u91CD\u8BD5\u63D0\u793A"
    },
    export_md_include_source_confirm: {
      message: "\u5C0E\u51FA\u5167\u5BB9\u5305\u542B\u7DB2\u8DEF\u641C\u5C0B\u5716\u7247\u3002\u662F\u5426\u5728 Markdown \u4E2D\u5305\u542B\u5716\u7247\u4F86\u6E90\u9023\u7D50\uFF1F",
      description: "Confirm dialog when exporting markdown with web search images"
    },
    deepResearch_exportedAt: {
      message: "\u5BFC\u51FA\u65F6\u95F4",
      description: "\u6DF1\u5EA6\u7814\u7A76\u5BFC\u51FA\u65F6\u95F4\u6233\u6807\u7B7E"
    },
    deepResearch_totalPhases: {
      message: "\u603B\u601D\u8003\u9636\u6BB5",
      description: "\u6DF1\u5EA6\u7814\u7A76\u603B\u601D\u8003\u9636\u6BB5\u6807\u7B7E"
    },
    deepResearch_thinkingPhase: {
      message: "\u601D\u8003\u9636\u6BB5",
      description: "\u6DF1\u5EA6\u7814\u7A76\u601D\u8003\u9636\u6BB5\u6807\u9898"
    },
    deepResearch_researchedWebsites: {
      message: "\u7814\u7A76\u7F51\u7AD9",
      description: "\u6DF1\u5EA6\u7814\u7A76\u5DF2\u7814\u7A76\u7F51\u7AD9\u7AE0\u8282\u6807\u9898"
    }
  };

  // ../gemini-voyager/src/locales/zh_TW/messages.json
  var messages_default10 = {
    extName: {
      message: "Gemini Voyager",
      description: "\u64F4\u5145\u529F\u80FD\u540D\u7A31"
    },
    extDescription: {
      message: "\u900F\u904E\u6642\u9593\u8EF8\u5C0E\u89BD\u3001\u8CC7\u6599\u593E\u7BA1\u7406\u3001\u63D0\u793A\u8A5E\u5EAB\u548C\u5C0D\u8A71\u532F\u51FA\u529F\u80FD\uFF0C\u5168\u9762\u63D0\u5347\u60A8\u7684 Gemini \u4F7F\u7528\u9AD4\u9A57\u3002",
      description: "\u64F4\u5145\u529F\u80FD\u63CF\u8FF0"
    },
    scrollMode: {
      message: "\u6372\u52D5\u6A21\u5F0F",
      description: "\u6372\u52D5\u6A21\u5F0F\u6A19\u7C64"
    },
    flow: {
      message: "\u6D41\u52D5",
      description: "\u6D41\u52D5\u6A21\u5F0F"
    },
    jump: {
      message: "\u8DF3\u8E8D",
      description: "\u8DF3\u8E8D\u6A21\u5F0F"
    },
    hideOuterContainer: {
      message: "\u96B1\u85CF\u5916\u90E8\u5BB9\u5668",
      description: "\u96B1\u85CF\u5916\u90E8\u5BB9\u5668\u6A19\u7C64"
    },
    draggableTimeline: {
      message: "\u53EF\u62D6\u66F3\u6642\u9593\u8EF8",
      description: "\u53EF\u62D6\u66F3\u6642\u9593\u8EF8\u6A19\u7C64"
    },
    enableMarkerLevel: {
      message: "\u555F\u7528\u7BC0\u9EDE\u5C64\u7D1A",
      description: "\u555F\u7528\u6642\u9593\u8EF8\u7BC0\u9EDE\u5C64\u7D1A\u529F\u80FD"
    },
    enableMarkerLevelHint: {
      message: "\u53F3\u9375\u9EDE\u64CA\u6642\u9593\u8EF8\u7BC0\u9EDE\u53EF\u8A2D\u5B9A\u5176\u5C64\u7D1A\u548C\u6298\u758A\u5B50\u7BC0\u9EDE",
      description: "\u7BC0\u9EDE\u5C64\u7D1A\u529F\u80FD\u63D0\u793A"
    },
    experimentalLabel: {
      message: "\u5BE6\u9A57\u6027",
      description: "\u5BE6\u9A57\u6027\u529F\u80FD\u6A19\u7C64"
    },
    resetPosition: {
      message: "\u91CD\u8A2D\u4F4D\u7F6E",
      description: "\u91CD\u8A2D\u4F4D\u7F6E\u6309\u9215"
    },
    resetTimelinePosition: {
      message: "\u91CD\u8A2D\u6642\u9593\u8EF8\u4F4D\u7F6E",
      description: "\u91CD\u8A2D\u6642\u9593\u8EF8\u4F4D\u7F6E\u6309\u9215\uFF08\u5728\u6642\u9593\u8EF8\u9078\u9805\u4E2D\uFF09"
    },
    language: {
      message: "\u8A9E\u8A00",
      description: "\u8A9E\u8A00\u6A19\u7C64"
    },
    pm_title: {
      message: "Gemini Voyager",
      description: "\u9762\u677F\u6A19\u984C"
    },
    pm_add: {
      message: "\u65B0\u589E",
      description: "\u65B0\u589E prompt \u6309\u9215"
    },
    pm_search_placeholder: {
      message: "\u641C\u5C0B prompt \u6216\u6A19\u7C64",
      description: "\u641C\u5C0B\u4F54\u4F4D\u7B26"
    },
    pm_import: {
      message: "\u532F\u5165",
      description: "\u532F\u5165\u6309\u9215"
    },
    pm_export: {
      message: "\u532F\u51FA",
      description: "\u532F\u51FA\u6309\u9215"
    },
    pm_prompt_placeholder: {
      message: "Prompt \u6587\u5B57",
      description: "Prompt \u8F38\u5165\u4F54\u4F4D\u7B26"
    },
    pm_tags_placeholder: {
      message: "\u6A19\u7C64\uFF08\u9017\u865F\u5206\u9694\uFF09",
      description: "\u6A19\u7C64\u8F38\u5165\u4F54\u4F4D\u7B26"
    },
    pm_save: {
      message: "\u5132\u5B58",
      description: "\u5132\u5B58"
    },
    pm_cancel: {
      message: "\u53D6\u6D88",
      description: "\u53D6\u6D88"
    },
    pm_all_tags: {
      message: "\u5168\u90E8",
      description: "\u5168\u90E8\u6A19\u7C64"
    },
    pm_empty: {
      message: "\u66AB\u7121 prompt",
      description: "\u7A7A\u72C0\u614B"
    },
    pm_copy: {
      message: "\u8907\u88FD",
      description: "\u8907\u88FD prompt"
    },
    pm_copied: {
      message: "\u5DF2\u8907\u88FD",
      description: "\u8907\u88FD\u6210\u529F"
    },
    pm_delete: {
      message: "\u522A\u9664",
      description: "\u522A\u9664 prompt"
    },
    pm_delete_confirm: {
      message: "\u78BA\u5B9A\u522A\u9664\u8A72 prompt \u55CE\uFF1F",
      description: "\u522A\u9664\u78BA\u8A8D"
    },
    pm_lock: {
      message: "\u9396\u5B9A\u4F4D\u7F6E",
      description: "\u9396\u5B9A\u9762\u677F\u4F4D\u7F6E"
    },
    pm_unlock: {
      message: "\u53D6\u6D88\u9396\u5B9A",
      description: "\u53D6\u6D88\u9396\u5B9A\u9762\u677F\u4F4D\u7F6E"
    },
    pm_import_invalid: {
      message: "\u6A94\u6848\u683C\u5F0F\u4E0D\u6B63\u78BA",
      description: "\u532F\u5165\u5931\u6557"
    },
    pm_import_success: {
      message: "\u5DF2\u532F\u5165 {count} \u689D",
      description: "\u532F\u5165\u6210\u529F"
    },
    pm_duplicate: {
      message: "\u91CD\u8907\u7684 prompt",
      description: "\u65B0\u589E\u91CD\u8907"
    },
    pm_deleted: {
      message: "\u5DF2\u522A\u9664",
      description: "\u522A\u9664\u63D0\u793A"
    },
    pm_edit: {
      message: "\u7DE8\u8F2F",
      description: "\u7DE8\u8F2F prompt"
    },
    pm_expand: {
      message: "\u5C55\u958B",
      description: "\u5C55\u958B\u63D0\u793A\u8A5E\u6587\u5B57"
    },
    pm_collapse: {
      message: "\u6536\u8D77",
      description: "\u6536\u8D77\u63D0\u793A\u8A5E\u6587\u5B57"
    },
    pm_saved: {
      message: "\u5DF2\u5132\u5B58",
      description: "\u5132\u5B58\u63D0\u793A"
    },
    pm_settings: {
      message: "\u8A2D\u5B9A",
      description: "\u8A2D\u5B9A\u6309\u9215"
    },
    pm_settings_tooltip: {
      message: "\u8ABF\u6574\u64F4\u5145\u529F\u80FD\u8A2D\u5B9A",
      description: "\u8A2D\u5B9A\u6309\u9215\u63D0\u793A"
    },
    pm_settings_fallback: {
      message: "\u8ACB\u9EDE\u64CA\u700F\u89BD\u5668\u5DE5\u5177\u5217\u4E2D\u7684\u64F4\u5145\u529F\u80FD\u5716\u793A\u958B\u555F\u8A2D\u5B9A",
      description: "\u8A2D\u5B9A\u958B\u555F\u5931\u6557\u63D0\u793A"
    },
    pm_backup: {
      message: "\u672C\u6A5F\u5099\u4EFD",
      description: "\u672C\u6A5F\u5099\u4EFD\u6309\u9215"
    },
    pm_backup_tooltip: {
      message: "\u5C07\u63D0\u793A\u8A5E\u548C\u8CC7\u6599\u593E\u5099\u4EFD\u5230\u5E36\u6642\u9593\u6233\u8A18\u7684\u8CC7\u6599\u593E",
      description: "\u5099\u4EFD\u6309\u9215\u63D0\u793A"
    },
    pm_backup_cancelled: {
      message: "\u5099\u4EFD\u5DF2\u53D6\u6D88",
      description: "\u5099\u4EFD\u53D6\u6D88\u63D0\u793A"
    },
    pm_backup_error: {
      message: "\u2717 \u5099\u4EFD\u5931\u6557",
      description: "\u5099\u4EFD\u5931\u6557\u63D0\u793A"
    },
    pm_backup_hint_options: {
      message: "\u529F\u80FD\u5DF2\u6574\u5408\u5728 Gemini \u9801\u9762\u7684\u63D0\u793A\u8A5E\u7BA1\u7406\u5668\u4E2D\u3002",
      description: "\u9078\u9805\u9801\u9762\u7684\u5099\u4EFD\u8AAA\u660E"
    },
    pm_backup_step1: {
      message: "\u958B\u555F Gemini \u9801\u9762\uFF08gemini.google.com\uFF09",
      description: "\u5099\u4EFD\u6B65\u9A5F 1"
    },
    pm_backup_step2: {
      message: "\u9EDE\u64CA\u53F3\u4E0B\u89D2\u7684\u64F4\u5145\u529F\u80FD\u5716\u793A\u958B\u555F\u63D0\u793A\u8A5E\u7BA1\u7406\u5668",
      description: "\u5099\u4EFD\u6B65\u9A5F 2"
    },
    pm_backup_step3: {
      message: '\u9EDE\u64CA "\u{1F4BE} \u672C\u6A5F\u5099\u4EFD" \u6309\u9215\uFF0C\u9078\u64C7\u5099\u4EFD\u8CC7\u6599\u593E',
      description: "\u5099\u4EFD\u6B65\u9A5F 3"
    },
    pm_backup_note: {
      message: "\u5099\u4EFD\u5C07\u5305\u542B\u6240\u6709\u63D0\u793A\u8A5E\u548C\u8CC7\u6599\u593E\uFF0C\u4E26\u5132\u5B58\u5728\u5E36\u6642\u9593\u6233\u8A18\u7684\u8CC7\u6599\u593E\u4E2D\uFF08\u683C\u5F0F\uFF1Abackup-YYYYMMDD-HHMMSS\uFF09",
      description: "\u5099\u4EFD\u529F\u80FD\u8AAA\u660E"
    },
    extensionVersion: {
      message: "\u7248\u672C",
      description: "\u64F4\u5145\u529F\u80FD\u7248\u672C\u6A19\u7C64"
    },
    newVersionAvailable: {
      message: "\u767C\u73FE\u65B0\u7248\u672C",
      description: "\u66F4\u65B0\u63D0\u9192\u6A19\u984C"
    },
    currentVersionLabel: {
      message: "\u76EE\u524D",
      description: "\u76EE\u524D\u7248\u672C\u865F\u6A19\u7C64"
    },
    latestVersionLabel: {
      message: "\u6700\u65B0",
      description: "\u6700\u65B0\u7248\u672C\u865F\u6A19\u7C64"
    },
    updateNow: {
      message: "\u7ACB\u5373\u66F4\u65B0",
      description: "\u8DF3\u8F49\u66F4\u65B0 CTA"
    },
    starProject: {
      message: "\u70BA\u5C08\u6848\u9EDE\u4EAE \u2B50\uFE0F",
      description: "Github \u5F15\u5C0E"
    },
    officialDocs: {
      message: "\u5B98\u65B9\u6587\u4EF6",
      description: "Official docs link"
    },
    exportChatJson: {
      message: "\u532F\u51FA\u5C0D\u8A71\u8A18\u9304",
      description: "\u532F\u51FA\u6309\u9215\u63D0\u793A"
    },
    folder_title: {
      message: "\u8CC7\u6599\u593E",
      description: "\u8CC7\u6599\u593E\u5340\u57DF\u6A19\u984C"
    },
    folder_create: {
      message: "\u5EFA\u7ACB\u8CC7\u6599\u593E",
      description: "\u5EFA\u7ACB\u8CC7\u6599\u593E\u6309\u9215\u63D0\u793A"
    },
    folder_name_prompt: {
      message: "\u8F38\u5165\u8CC7\u6599\u593E\u540D\u7A31\uFF1A",
      description: "\u5EFA\u7ACB\u8CC7\u6599\u593E\u540D\u7A31\u63D0\u793A"
    },
    folder_rename_prompt: {
      message: "\u8F38\u5165\u65B0\u540D\u7A31\uFF1A",
      description: "\u91CD\u65B0\u547D\u540D\u8CC7\u6599\u593E\u63D0\u793A"
    },
    folder_delete_confirm: {
      message: "\u78BA\u5B9A\u522A\u9664\u6B64\u8CC7\u6599\u593E\u53CA\u5176\u6240\u6709\u5167\u5BB9\u55CE\uFF1F",
      description: "\u522A\u9664\u8CC7\u6599\u593E\u78BA\u8A8D"
    },
    folder_create_subfolder: {
      message: "\u5EFA\u7ACB\u5B50\u8CC7\u6599\u593E",
      description: "\u5EFA\u7ACB\u5B50\u8CC7\u6599\u593E\u9078\u55AE\u9805\u76EE"
    },
    folder_rename: {
      message: "\u91CD\u65B0\u547D\u540D",
      description: "\u91CD\u65B0\u547D\u540D\u8CC7\u6599\u593E\u9078\u55AE\u9805\u76EE"
    },
    folder_delete: {
      message: "\u522A\u9664",
      description: "\u522A\u9664\u8CC7\u6599\u593E\u9078\u55AE\u9805\u76EE"
    },
    folder_empty: {
      message: "\u66AB\u7121\u8CC7\u6599\u593E",
      description: "\u6C92\u6709\u8CC7\u6599\u593E\u6642\u986F\u793A\u7684\u4F54\u4F4D\u63D0\u793A"
    },
    folder_pin: {
      message: "\u7F6E\u9802\u8CC7\u6599\u593E",
      description: "\u7F6E\u9802\u8CC7\u6599\u593E\u9078\u55AE\u9805\u76EE"
    },
    folder_unpin: {
      message: "\u53D6\u6D88\u7F6E\u9802",
      description: "\u53D6\u6D88\u7F6E\u9802\u8CC7\u6599\u593E\u9078\u55AE\u9805\u76EE"
    },
    folder_remove_conversation: {
      message: "\u5F9E\u8CC7\u6599\u593E\u4E2D\u79FB\u9664",
      description: "\u79FB\u9664\u5C0D\u8A71\u6309\u9215\u63D0\u793A"
    },
    folder_remove_conversation_confirm: {
      message: "\u5F9E\u6B64\u8CC7\u6599\u593E\u4E2D\u79FB\u9664\u300C{title}\u300D\uFF1F",
      description: "\u79FB\u9664\u5C0D\u8A71\u78BA\u8A8D"
    },
    conversation_more: {
      message: "\u66F4\u591A\u9078\u9805",
      description: "\u5C0D\u8A71\u66F4\u591A\u9078\u9805\u6309\u9215\u63D0\u793A"
    },
    conversation_move_to_folder: {
      message: "\u79FB\u52D5\u5230\u8CC7\u6599\u593E",
      description: "\u79FB\u52D5\u5C0D\u8A71\u5230\u8CC7\u6599\u593E\u9078\u55AE\u9805\u76EE"
    },
    conversation_move_to_folder_title: {
      message: "\u79FB\u52D5\u5230\u8CC7\u6599\u593E",
      description: "\u79FB\u52D5\u5C0D\u8A71\u5230\u8CC7\u6599\u593E\u5C0D\u8A71\u6846\u6A19\u984C"
    },
    chatWidth: {
      message: "\u5C0D\u8A71\u5340\u57DF\u5BEC\u5EA6",
      description: "\u5C0D\u8A71\u5340\u57DF\u5BEC\u5EA6\u8ABF\u6574\u6A19\u7C64"
    },
    chatWidthNarrow: {
      message: "\u7A84",
      description: "\u7A84\u5C0D\u8A71\u5340\u57DF\u5BEC\u5EA6\u6A19\u7C64"
    },
    chatWidthWide: {
      message: "\u5BEC",
      description: "\u5BEC\u5C0D\u8A71\u5340\u57DF\u5BEC\u5EA6\u6A19\u7C64"
    },
    sidebarWidth: {
      message: "\u5074\u908A\u6B04\u5BEC\u5EA6",
      description: "\u5074\u908A\u6B04\u5BEC\u5EA6\u8ABF\u7BC0\u6A19\u7C64"
    },
    sidebarWidthNarrow: {
      message: "\u7A84",
      description: "\u5074\u908A\u6B04\u8B8A\u7A84\u6A19\u7C64"
    },
    sidebarWidthWide: {
      message: "\u5BEC",
      description: "\u5074\u908A\u6B04\u8B8A\u5BEC\u6A19\u7C64"
    },
    formula_copied: {
      message: "\u2713 \u516C\u5F0F\u5DF2\u8907\u88FD",
      description: "\u516C\u5F0F\u8907\u88FD\u6210\u529F\u8A0A\u606F"
    },
    formula_copy_failed: {
      message: "\u2717 \u8907\u88FD\u5931\u6557",
      description: "\u516C\u5F0F\u8907\u88FD\u5931\u6557\u8A0A\u606F"
    },
    formulaCopyFormat: {
      message: "\u516C\u5F0F\u8907\u88FD\u683C\u5F0F",
      description: "\u516C\u5F0F\u8907\u88FD\u683C\u5F0F\u8A2D\u5B9A\u6A19\u7C64"
    },
    formulaCopyFormatLatex: {
      message: "LaTeX",
      description: "LaTeX \u683C\u5F0F\u9078\u9805"
    },
    formulaCopyFormatUnicodeMath: {
      message: "MathML (Word)",
      description: "Label for MathML formula copy format option (formerly UnicodeMath)"
    },
    formulaCopyFormatHint: {
      message: "\u9078\u64C7\u9EDE\u64CA\u516C\u5F0F\u6642\u8907\u88FD\u7684\u683C\u5F0F",
      description: "\u516C\u5F0F\u8907\u88FD\u683C\u5F0F\u63D0\u793A"
    },
    formulaCopyFormatNoDollar: {
      message: "LaTeX (\u7D14\u6587\u5B57\uFF0C\u7121 $ \u7B26\u865F)",
      description: "LaTeX \u683C\u5F0F\u9078\u9805\uFF0C\u7121\u7F8E\u5143\u7B26\u865F"
    },
    folder_filter_current_user: {
      message: "\u5E33\u865F\u9694\u96E2\u6A21\u5F0F",
      description: "Show only conversations from the current Google account"
    },
    folder_export: {
      message: "\u532F\u51FA\u8CC7\u6599\u593E",
      description: "\u532F\u51FA\u8CC7\u6599\u593E\u6309\u9215\u63D0\u793A"
    },
    folder_import_export: {
      message: "\u532F\u5165/\u532F\u51FA\u8CC7\u6599\u593E",
      description: "\u5408\u4F75\u7684\u532F\u5165\u532F\u51FA\u6309\u9215\u63D0\u793A"
    },
    folder_cloud_upload: {
      message: "\u4E0A\u50B3\u5230\u96F2\u7AEF",
      description: "\u96F2\u7AEF\u4E0A\u50B3\u6309\u9215\u63D0\u793A"
    },
    folder_cloud_sync: {
      message: "\u5F9E\u96F2\u7AEF\u540C\u6B65",
      description: "\u96F2\u7AEF\u540C\u6B65\u6309\u9215\u63D0\u793A"
    },
    folder_import: {
      message: "\u532F\u5165\u8CC7\u6599\u593E",
      description: "\u532F\u5165\u8CC7\u6599\u593E\u6309\u9215\u63D0\u793A"
    },
    folder_import_title: {
      message: "\u532F\u5165\u8CC7\u6599\u593E\u8A2D\u5B9A",
      description: "\u532F\u5165\u5C0D\u8A71\u6846\u6A19\u984C"
    },
    folder_import_strategy: {
      message: "\u532F\u5165\u7B56\u7565\uFF1A",
      description: "\u532F\u5165\u7B56\u7565\u6A19\u7C64"
    },
    folder_import_merge: {
      message: "\u8207\u73FE\u6709\u8CC7\u6599\u593E\u5408\u4F75",
      description: "\u5408\u4F75\u532F\u5165\u7B56\u7565"
    },
    folder_import_overwrite: {
      message: "\u8986\u84CB\u73FE\u6709\u8CC7\u6599\u593E",
      description: "\u8986\u84CB\u532F\u5165\u7B56\u7565"
    },
    folder_import_select_file: {
      message: "\u9078\u64C7\u8981\u532F\u5165\u7684 JSON \u6A94\u6848",
      description: "\u532F\u5165\u6A94\u6848\u9078\u64C7\u63D0\u793A"
    },
    folder_import_success: {
      message: "\u2713 \u5DF2\u532F\u5165 {folders} \u500B\u8CC7\u6599\u593E\uFF0C{conversations} \u500B\u5C0D\u8A71",
      description: "\u532F\u5165\u6210\u529F\u8A0A\u606F"
    },
    folder_import_success_skipped: {
      message: "\u2713 \u5DF2\u532F\u5165 {folders} \u500B\u8CC7\u6599\u593E\uFF0C{conversations} \u500B\u5C0D\u8A71\uFF08\u7565\u904E {skipped} \u500B\u91CD\u8907\u9805\uFF09",
      description: "\u532F\u5165\u6210\u529F\u4E26\u7565\u904E\u91CD\u8907\u9805\u8A0A\u606F"
    },
    folder_import_error: {
      message: "\u2717 \u532F\u5165\u5931\u6557\uFF1A{error}",
      description: "\u532F\u5165\u932F\u8AA4\u8A0A\u606F"
    },
    folder_export_success: {
      message: "\u2713 \u8CC7\u6599\u593E\u532F\u51FA\u6210\u529F",
      description: "\u532F\u51FA\u6210\u529F\u8A0A\u606F"
    },
    folder_import_invalid_format: {
      message: "\u6A94\u6848\u683C\u5F0F\u7121\u6548\u3002\u8ACB\u9078\u64C7\u6709\u6548\u7684\u8CC7\u6599\u593E\u8A2D\u5B9A\u6A94\u3002",
      description: "\u7121\u6548\u683C\u5F0F\u932F\u8AA4"
    },
    folder_import_confirm_overwrite: {
      message: "\u9019\u5C07\u53D6\u4EE3\u6240\u6709\u73FE\u6709\u8CC7\u6599\u593E\u3002\u7CFB\u7D71\u5C07\u5EFA\u7ACB\u5099\u4EFD\u3002\u662F\u5426\u7E7C\u7E8C\uFF1F",
      description: "\u8986\u84CB\u78BA\u8A8D"
    },
    export_dialog_title: {
      message: "\u532F\u51FA\u5C0D\u8A71",
      description: "\u532F\u51FA\u5C0D\u8A71\u6846\u6A19\u984C"
    },
    export_dialog_select: {
      message: "\u9078\u64C7\u532F\u51FA\u683C\u5F0F\uFF1A",
      description: "\u532F\u51FA\u683C\u5F0F\u9078\u64C7\u6A19\u7C64"
    },
    export_dialog_warning: {
      message: "\u26A0\uFE0F \u9EDE\u64CA\u532F\u51FA\u5F8C\uFF0C\u7CFB\u7D71\u5C07\u81EA\u52D5\u8DF3\u8F49\u81F3\u9996\u5247\u8A0A\u606F\u4EE5\u8F09\u5165\u5B8C\u6574\u5167\u5BB9\u3002\u5728\u6B64\u671F\u9593\u8ACB\u52FF\u64CD\u4F5C\uFF0C\u8DF3\u8F49\u5B8C\u6210\u5F8C\u5C07\u81EA\u52D5\u7E7C\u7E8C\u532F\u51FA\u3002",
      description: "\u95DC\u65BC\u5167\u5BB9\u5B8C\u6574\u6027\u548C\u81EA\u52D5\u8DF3\u8F49\u7684\u63D0\u793A"
    },
    export_dialog_safari_cmdp_hint: {
      message: "Safari \u63D0\u793A\uFF1A\u8ACB\u5148\u9EDE\u9078\u4E0B\u65B9\u300C\u532F\u51FA\u300D\u6309\u9215\uFF0C\u7A0D\u7B49\u7247\u523B\uFF0C\u518D\u6309 \u2318P \u9078\u64C7\u300C\u5132\u5B58\u70BA PDF\u300D\u3002",
      description: "Safari \u4E0B PDF \u532F\u51FA\u7684\u63D0\u793A"
    },
    export_toast_safari_pdf_ready: {
      message: "\u73FE\u5728\u53EF\u4EE5\u6309 Command + P \u532F\u51FA PDF\u3002",
      description: "Safari \u4E2D\u5B8C\u6210\u532F\u51FA\u6E96\u5099\u5F8C\u7684\u63D0\u793A"
    },
    export_dialog_safari_markdown_hint: {
      message: "\u63D0\u9192\uFF1A\u7531\u65BCSafari\u9650\u5236\uFF0C\u7121\u6CD5\u63D0\u53D6\u804A\u5929\u8A18\u9304\u4E2D\u7684\u5716\u7247\uFF0C\u5982\u9700\u5B8C\u6574\u532F\u51FA\uFF0C\u5EFA\u8B70\u4F7F\u7528PDF\u532F\u51FA",
      description: "\u95DC\u65BC Safari Markdown \u532F\u51FA\u7121\u6CD5\u63D0\u53D6\u5716\u7247\u7684\u8B66\u544A"
    },
    export_format_json_description: {
      message: "\u958B\u767C\u8005\u4F7F\u7528\u7684\u6A5F\u5668\u53EF\u8B80\u683C\u5F0F",
      description: "JSON \u532F\u51FA\u683C\u5F0F\u63CF\u8FF0"
    },
    export_format_markdown_description: {
      message: "\u6E05\u6670\u4FBF\u651C\u7684\u6587\u5B57\u683C\u5F0F\uFF08\u63A8\u85A6\uFF09",
      description: "Markdown \u532F\u51FA\u683C\u5F0F\u63CF\u8FF0"
    },
    export_format_pdf_description: {
      message: "\u9069\u5408\u5217\u5370\u7684\u683C\u5F0F\uFF08\u900F\u904E\u53E6\u5B58\u70BA PDF\uFF09",
      description: "PDF \u532F\u51FA\u683C\u5F0F\u63CF\u8FF0"
    },
    editInputWidth: {
      message: "\u7DE8\u8F2F\u8F38\u5165\u6846\u5BEC\u5EA6",
      description: "\u7DE8\u8F2F\u8F38\u5165\u6846\u5BEC\u5EA6\u8ABF\u6574\u6A19\u7C64"
    },
    editInputWidthNarrow: {
      message: "\u7A84",
      description: "\u7A84\u7DE8\u8F2F\u8F38\u5165\u6846\u5BEC\u5EA6\u6A19\u7C64"
    },
    editInputWidthWide: {
      message: "\u5BEC",
      description: "\u5BEC\u7DE8\u8F2F\u8F38\u5165\u6846\u5BEC\u5EA6\u6A19\u7C64"
    },
    timelineOptions: {
      message: "\u6642\u9593\u8EF8\u9078\u9805",
      description: "\u6642\u9593\u8EF8\u9078\u9805\u5340\u57DF\u6A19\u7C64"
    },
    folderOptions: {
      message: "\u8CC7\u6599\u593E\u9078\u9805",
      description: "\u8CC7\u6599\u593E\u9078\u9805\u5340\u57DF\u6A19\u7C64"
    },
    enableFolderFeature: {
      message: "\u555F\u7528\u8CC7\u6599\u593E\u529F\u80FD",
      description: "\u555F\u7528\u6216\u505C\u7528\u8CC7\u6599\u593E\u529F\u80FD"
    },
    hideArchivedConversations: {
      message: "\u96B1\u85CF\u5DF2\u6B78\u6A94\u5C0D\u8A71",
      description: "\u5F9E\u4E3B\u6E05\u55AE\u96B1\u85CF\u5DF2\u65B0\u589E\u5230\u8CC7\u6599\u593E\u7684\u5C0D\u8A71"
    },
    conversation_star: {
      message: "\u661F\u865F\u6A19\u8A18\u5C0D\u8A71",
      description: "\u661F\u865F\u6A19\u8A18\u5C0D\u8A71\u6309\u9215\u63D0\u793A"
    },
    conversation_unstar: {
      message: "\u53D6\u6D88\u661F\u865F\u6A19\u8A18",
      description: "\u53D6\u6D88\u661F\u865F\u6A19\u8A18\u5C0D\u8A71\u6309\u9215\u63D0\u793A"
    },
    conversation_untitled: {
      message: "\u672A\u547D\u540D",
      description: "\u7121\u6A19\u984C\u5C0D\u8A71\u7684\u5099\u7528\u6A19\u984C"
    },
    geminiOnlyNotice: {
      message: "\u9810\u8A2D\u50C5\u5728 Gemini\uFF08\u542B\u4F01\u696D\u7248\uFF09\u548C AI Studio \u751F\u6548\u3002\u60F3\u5728\u5176\u4ED6\u7DB2\u7AD9\u4F7F\u7528\u63D0\u793A\u8A5E\u7BA1\u7406\u5668\uFF0C\u8ACB\u5728\u4E0B\u65B9\u65B0\u589E\u4E26\u6388\u6B0A\u3002",
      description: "\u63D0\u793A\u9810\u8A2D\u7BC4\u570D\u70BA Gemini/AI Studio"
    },
    folderManager_dataLossWarning: {
      message: "\u26A0\uFE0F \u8B66\u544A\uFF1A\u7121\u6CD5\u8F09\u5165\u8CC7\u6599\u593E\u8CC7\u6599\u3002\u60A8\u7684\u8CC7\u6599\u593E\u53EF\u80FD\u5DF2\u640D\u58DE\u3002\u8ACB\u6AA2\u67E5\u700F\u89BD\u5668\u4E3B\u63A7\u53F0\u4EE5\u53D6\u5F97\u8A73\u7D30\u8CC7\u8A0A\uFF0C\u4E26\u5728\u53EF\u7528\u6642\u5617\u8A66\u5F9E\u5099\u4EFD\u9084\u539F\u3002",
      description: "\u8CC7\u6599\u593E\u8CC7\u6599\u8F09\u5165\u5931\u6557\u6642\u986F\u793A\u7684\u8B66\u544A"
    },
    backupOptions: {
      message: "\u81EA\u52D5\u5099\u4EFD",
      description: "\u5099\u4EFD\u9078\u9805\u5340\u57DF\u6A19\u7C64"
    },
    backupEnabled: {
      message: "\u555F\u7528\u81EA\u52D5\u5099\u4EFD",
      description: "\u555F\u7528\u81EA\u52D5\u5099\u4EFD\u958B\u95DC"
    },
    backupNow: {
      message: "\u7ACB\u5373\u5099\u4EFD",
      description: "\u7ACB\u5373\u5099\u4EFD\u6309\u9215"
    },
    backupSelectFolder: {
      message: "\u9078\u64C7\u5099\u4EFD\u8CC7\u6599\u593E",
      description: "\u9078\u64C7\u5099\u4EFD\u8CC7\u6599\u593E\u6309\u9215"
    },
    backupFolderSelected: {
      message: "\u5099\u4EFD\u8CC7\u6599\u593E\uFF1A{folder}",
      description: "\u986F\u793A\u5DF2\u9078\u64C7\u7684\u5099\u4EFD\u8CC7\u6599\u593E"
    },
    backupIncludePrompts: {
      message: "\u5305\u542B\u63D0\u793A\u8A5E",
      description: "\u5099\u4EFD\u4E2D\u5305\u542B\u63D0\u793A\u8A5E\u958B\u95DC"
    },
    backupIncludeFolders: {
      message: "\u5305\u542B\u8CC7\u6599\u593E",
      description: "\u5099\u4EFD\u4E2D\u5305\u542B\u8CC7\u6599\u593E\u958B\u95DC"
    },
    backupIntervalLabel: {
      message: "\u5099\u4EFD\u9593\u9694",
      description: "\u5099\u4EFD\u9593\u9694\u6A19\u7C64"
    },
    backupIntervalManual: {
      message: "\u50C5\u624B\u52D5",
      description: "\u624B\u52D5\u5099\u4EFD\u6A21\u5F0F"
    },
    backupIntervalDaily: {
      message: "\u6BCF\u5929",
      description: "\u6BCF\u5929\u5099\u4EFD\u9593\u9694"
    },
    backupIntervalWeekly: {
      message: "\u6BCF\u9031\uFF087 \u5929\uFF09",
      description: "\u6BCF\u9031\u5099\u4EFD\u9593\u9694"
    },
    backupLastBackup: {
      message: "\u4E0A\u6B21\u5099\u4EFD\uFF1A{time}",
      description: "\u4E0A\u6B21\u5099\u4EFD\u6642\u9593\u6233\u8A18"
    },
    backupNever: {
      message: "\u5F9E\u672A",
      description: "\u5F9E\u672A\u5099\u4EFD\u904E"
    },
    backupSuccess: {
      message: "\u2713 \u5099\u4EFD\u5EFA\u7ACB\u6210\u529F\uFF1A{prompts} \u500B\u63D0\u793A\u8A5E\u3001{folders} \u500B\u8CC7\u6599\u593E\u3001{conversations} \u500B\u5C0D\u8A71",
      description: "\u5099\u4EFD\u6210\u529F\u8A0A\u606F"
    },
    backupError: {
      message: "\u2717 \u5099\u4EFD\u5931\u6557\uFF1A{error}",
      description: "\u5099\u4EFD\u932F\u8AA4\u8A0A\u606F"
    },
    backupNotSupported: {
      message: "\u26A0\uFE0F \u81EA\u52D5\u5099\u4EFD\u9700\u8981\u652F\u63F4\u6A94\u6848\u7CFB\u7D71\u5B58\u53D6 API \u7684\u73FE\u4EE3\u700F\u89BD\u5668",
      description: "\u700F\u89BD\u5668\u4E0D\u652F\u63F4\u8A0A\u606F"
    },
    backupSelectFolderFirst: {
      message: "\u8ACB\u5148\u9078\u64C7\u5099\u4EFD\u8CC7\u6599\u593E",
      description: "\u672A\u9078\u64C7\u8CC7\u6599\u593E\u8B66\u544A"
    },
    backupUserCancelled: {
      message: "\u5099\u4EFD\u5DF2\u53D6\u6D88",
      description: "\u4F7F\u7528\u8005\u53D6\u6D88\u8CC7\u6599\u593E\u9078\u64C7"
    },
    backupConfigSaved: {
      message: "\u2713 \u5099\u4EFD\u8A2D\u5B9A\u5DF2\u5132\u5B58",
      description: "\u8A2D\u5B9A\u5132\u5B58\u8A0A\u606F"
    },
    backupPermissionDenied: {
      message: "\u26A0\uFE0F \u7121\u6CD5\u5B58\u53D6\u6B64\u76EE\u9304\u3002\u8ACB\u9078\u64C7\u5176\u4ED6\u4F4D\u7F6E\uFF08\u4F8B\u5982\uFF1A\u6587\u4EF6\u3001\u4E0B\u8F09\uFF0C\u6216\u684C\u9762\u4E2D\u7684\u81EA\u8A02\u8CC7\u6599\u593E\uFF09",
      description: "\u53D7\u9650\u76EE\u9304\u6B0A\u9650\u88AB\u62D2\u7D55"
    },
    backupConfigureInOptions: {
      message: "\u5099\u4EFD\u529F\u80FD\u9700\u8981\u5728\u9078\u9805\u9801\u9762\u4E2D\u8A2D\u5B9A\u3002\u9EDE\u64CA\u4E0B\u65B9\u6309\u9215\u958B\u555F\u9078\u9805\u9801\u9762\uFF08\u9EDE\u64CA\u64F4\u5145\u529F\u80FD\u5716\u793A\u65C1\u7684\u4E09\u500B\u9EDE \u2192 \u9078\u9805\uFF09\u3002",
      description: "\u5099\u4EFD\u8A2D\u5B9A\u5728\u9078\u9805\u9801\u9762\u7684\u8AAA\u660E"
    },
    openOptionsPage: {
      message: "\u958B\u555F\u9078\u9805\u9801\u9762",
      description: "\u958B\u555F\u9078\u9805\u9801\u9762\u6309\u9215"
    },
    optionsPageSubtitle: {
      message: "\u64F4\u5145\u529F\u80FD\u9078\u9805",
      description: "\u9078\u9805\u9801\u9762\u526F\u6A19\u984C"
    },
    optionsComingSoon: {
      message: "\u66F4\u591A\u9078\u9805\u5373\u5C07\u63A8\u51FA...",
      description: "\u9078\u9805\u9801\u9762\u4F54\u4F4D\u63D0\u793A"
    },
    backupDataAccessNotice: {
      message: "\u8CC7\u6599\u5B58\u53D6\u9650\u5236",
      description: "\u5099\u4EFD\u8CC7\u6599\u5B58\u53D6\u9650\u5236\u6A19\u984C"
    },
    backupDataAccessHint: {
      message: "\u7531\u65BC\u700F\u89BD\u5668\u5B89\u5168\u9650\u5236\uFF0C\u9078\u9805\u9801\u9762\u7121\u6CD5\u76F4\u63A5\u8B80\u53D6 Gemini \u9801\u9762\u7684\u63D0\u793A\u8A5E\u548C\u8CC7\u6599\u593E\u8CC7\u6599\u3002\u5EFA\u8B70\u4F7F\u7528 Gemini \u9801\u9762\u4E0A\u7684\u63D0\u793A\u8A5E\u7BA1\u7406\u5668\u548C\u8CC7\u6599\u593E\u532F\u51FA\u529F\u80FD\u9032\u884C\u624B\u52D5\u5099\u4EFD\u3002",
      description: "\u5099\u4EFD\u8CC7\u6599\u5B58\u53D6\u9650\u5236\u8AAA\u660E"
    },
    promptManagerOptions: {
      message: "\u63D0\u793A\u8A5E\u7BA1\u7406\u5668",
      description: "\u63D0\u793A\u8A5E\u7BA1\u7406\u5668\u9078\u9805\u5340\u57DF\u6A19\u7C64"
    },
    hidePromptManager: {
      message: "\u96B1\u85CF\u63D0\u793A\u8A5E\u7BA1\u7406\u5668",
      description: "\u96B1\u85CF\u63D0\u793A\u8A5E\u7BA1\u7406\u5668\u61F8\u6D6E\u7403"
    },
    hidePromptManagerHint: {
      message: "\u96B1\u85CF\u9801\u9762\u4E0A\u7684\u63D0\u793A\u8A5E\u7BA1\u7406\u5668\u61F8\u6D6E\u7403",
      description: "\u96B1\u85CF\u63D0\u793A\u8A5E\u7BA1\u7406\u5668\u529F\u80FD\u63D0\u793A"
    },
    customWebsites: {
      message: "\u81EA\u8A02\u7DB2\u7AD9",
      description: "\u63D0\u793A\u8A5E\u7BA1\u7406\u5668\u7684\u81EA\u8A02\u7DB2\u7AD9"
    },
    customWebsitesPlaceholder: {
      message: "\u8F38\u5165\u7DB2\u7AD9 URL\uFF08\u4F8B\u5982\uFF1Achatgpt.com\uFF09",
      description: "\u81EA\u8A02\u7DB2\u7AD9\u8F38\u5165\u4F54\u4F4D\u7B26"
    },
    customWebsitesHint: {
      message: "\u65B0\u589E\u60A8\u60F3\u8981\u4F7F\u7528\u63D0\u793A\u8A5E\u7BA1\u7406\u5668\u7684\u7DB2\u7AD9\u3002\u9019\u4E9B\u7DB2\u7AD9\u4E0A\u53EA\u6703\u555F\u7528\u63D0\u793A\u8A5E\u7BA1\u7406\u5668\u529F\u80FD\u3002",
      description: "\u81EA\u8A02\u7DB2\u7AD9\u63D0\u793A"
    },
    addWebsite: {
      message: "\u65B0\u589E\u7DB2\u7AD9",
      description: "\u65B0\u589E\u7DB2\u7AD9\u6309\u9215"
    },
    removeWebsite: {
      message: "\u79FB\u9664",
      description: "\u79FB\u9664\u7DB2\u7AD9\u6309\u9215"
    },
    invalidUrl: {
      message: "URL \u683C\u5F0F\u7121\u6548",
      description: "\u7121\u6548 URL \u932F\u8AA4\u8A0A\u606F"
    },
    websiteAdded: {
      message: "\u7DB2\u7AD9\u5DF2\u65B0\u589E",
      description: "\u7DB2\u7AD9\u65B0\u589E\u6210\u529F\u8A0A\u606F"
    },
    websiteRemoved: {
      message: "\u7DB2\u7AD9\u5DF2\u79FB\u9664",
      description: "\u7DB2\u7AD9\u79FB\u9664\u6210\u529F\u8A0A\u606F"
    },
    permissionDenied: {
      message: "\u6B0A\u9650\u88AB\u62D2\u7D55\u3002\u8ACB\u5141\u8A31\u5B58\u53D6\u6B64\u7DB2\u7AD9\u3002",
      description: "\u6B0A\u9650\u88AB\u62D2\u7D55\u932F\u8AA4\u8A0A\u606F"
    },
    permissionRequestFailed: {
      message: "\u8981\u6C42\u6B0A\u9650\u5931\u6557\uFF0C\u8ACB\u91CD\u8A66\u6216\u5728\u64F4\u5145\u529F\u80FD\u8A2D\u5B9A\u4E2D\u624B\u52D5\u6388\u6B0A\u3002",
      description: "\u8981\u6C42\u6B0A\u9650\u5931\u6557\u8A0A\u606F"
    },
    customWebsitesNote: {
      message: "\u63D0\u793A\uFF1A\u65B0\u589E\u7DB2\u7AD9\u6642\u6703\u5F48\u51FA\u6388\u6B0A\uFF0C\u8ACB\u5148\u5141\u8A31\uFF0C\u518D\u91CD\u65B0\u6574\u7406\u8A72\u7DB2\u7AD9\u5373\u53EF\u555F\u7528\u63D0\u793A\u8A5E\u7BA1\u7406\u5668\u3002",
      description: "\u81EA\u8A02\u7DB2\u7AD9\u91CD\u65B0\u8F09\u5165/\u6B0A\u9650\u63D0\u793A"
    },
    starredHistory: {
      message: "\u661F\u865F\u6A19\u8A18\u6B77\u53F2",
      description: "\u661F\u865F\u6A19\u8A18\u6B77\u53F2\u6A19\u984C"
    },
    viewStarredHistory: {
      message: "\u6AA2\u8996\u661F\u865F\u6A19\u8A18\u6B77\u53F2",
      description: "\u6AA2\u8996\u661F\u865F\u6A19\u8A18\u6B77\u53F2\u6309\u9215"
    },
    noStarredMessages: {
      message: "\u66AB\u7121\u661F\u865F\u6A19\u8A18\u8A0A\u606F",
      description: "\u7121\u661F\u865F\u6A19\u8A18\u8A0A\u606F\u4F54\u4F4D\u7B26"
    },
    removeFromStarred: {
      message: "\u53D6\u6D88\u661F\u865F\u6A19\u8A18",
      description: "\u53D6\u6D88\u661F\u865F\u6A19\u8A18\u63D0\u793A"
    },
    justNow: {
      message: "\u525B\u525B",
      description: "\u525B\u525B\u6642\u9593\u6A19\u7C64"
    },
    hoursAgo: {
      message: "\u5C0F\u6642\u524D",
      description: "\u5C0F\u6642\u524D\u6A19\u7C64"
    },
    yesterday: {
      message: "\u6628\u5929",
      description: "\u6628\u5929\u65E5\u671F\u6A19\u7C64"
    },
    daysAgo: {
      message: "\u5929\u524D",
      description: "\u5929\u524D\u6A19\u7C64"
    },
    loading: {
      message: "\u8F09\u5165\u4E2D...",
      description: "\u8F09\u5165\u8A0A\u606F"
    },
    keyboardShortcuts: {
      message: "\u9375\u76E4\u5FEB\u901F\u9375",
      description: "\u9375\u76E4\u5FEB\u901F\u9375\u5340\u6BB5\u6A19\u984C"
    },
    enableShortcuts: {
      message: "\u555F\u7528\u9375\u76E4\u5FEB\u901F\u9375",
      description: "\u555F\u7528\u5FEB\u901F\u9375\u958B\u95DC\u6A19\u7C64"
    },
    previousNode: {
      message: "\u4E0A\u4E00\u500B\u7BC0\u9EDE",
      description: "\u4E0A\u4E00\u500B\u6642\u9593\u8EF8\u7BC0\u9EDE\u5FEB\u901F\u9375\u6A19\u7C64"
    },
    nextNode: {
      message: "\u4E0B\u4E00\u500B\u7BC0\u9EDE",
      description: "\u4E0B\u4E00\u500B\u6642\u9593\u8EF8\u7BC0\u9EDE\u5FEB\u901F\u9375\u6A19\u7C64"
    },
    shortcutKey: {
      message: "\u6309\u9375",
      description: "\u5FEB\u901F\u9375\u6309\u9375\u6A19\u7C64"
    },
    shortcutModifiers: {
      message: "\u4FEE\u98FE\u9375",
      description: "\u5FEB\u901F\u9375\u4FEE\u98FE\u9375\u6A19\u7C64"
    },
    resetShortcuts: {
      message: "\u6062\u5FA9\u9810\u8A2D",
      description: "\u91CD\u8A2D\u5FEB\u901F\u9375\u6309\u9215"
    },
    shortcutsResetSuccess: {
      message: "\u5FEB\u901F\u9375\u5DF2\u6062\u5FA9\u9810\u8A2D\u8A2D\u5B9A",
      description: "\u5FEB\u901F\u9375\u91CD\u8A2D\u6210\u529F\u8A0A\u606F"
    },
    shortcutsDescription: {
      message: "\u4F7F\u7528\u9375\u76E4\u5FEB\u901F\u9375\u5C0E\u89BD\u6642\u9593\u8EF8\u7BC0\u9EDE",
      description: "\u5FEB\u901F\u9375\u63CF\u8FF0"
    },
    modifierNone: {
      message: "\u7121",
      description: "\u7121\u4FEE\u98FE\u9375"
    },
    modifierAlt: {
      message: "Alt",
      description: "Alt \u4FEE\u98FE\u9375"
    },
    modifierCtrl: {
      message: "Ctrl",
      description: "Ctrl \u4FEE\u98FE\u9375"
    },
    modifierShift: {
      message: "Shift",
      description: "Shift \u4FEE\u98FE\u9375"
    },
    modifierMeta: {
      message: "Cmd/Win",
      description: "Meta/Command/Windows \u4FEE\u98FE\u9375"
    },
    cloudSync: {
      message: "\u96F2\u7AEF\u540C\u6B65",
      description: "\u96F2\u7AEF\u540C\u6B65\u5340\u57DF\u6A19\u984C"
    },
    cloudSyncDescription: {
      message: "\u5C07\u8CC7\u6599\u593E\u548C\u63D0\u793A\u8A5E\u540C\u6B65\u5230 Google Drive",
      description: "\u96F2\u7AEF\u540C\u6B65\u63CF\u8FF0"
    },
    syncModeDisabled: {
      message: "\u5DF2\u505C\u7528",
      description: "\u540C\u6B65\u6A21\u5F0F\u505C\u7528\u9078\u9805"
    },
    syncModeManual: {
      message: "\u624B\u52D5",
      description: "\u540C\u6B65\u6A21\u5F0F\u624B\u52D5\u9078\u9805"
    },
    syncServerPort: {
      message: "\u670D\u52D9\u57E0\u865F",
      description: "\u540C\u6B65\u670D\u52D9\u57E0\u865F"
    },
    syncNow: {
      message: "\u7ACB\u5373\u540C\u6B65",
      description: "\u7ACB\u5373\u540C\u6B65\u6309\u9215"
    },
    lastSynced: {
      message: "\u4E0A\u6B21\u540C\u6B65\uFF1A{time}",
      description: "\u4E0A\u6B21\u540C\u6B65\u6642\u9593\u6233\u8A18"
    },
    neverSynced: {
      message: "\u5F9E\u672A\u540C\u6B65",
      description: "\u5F9E\u672A\u540C\u6B65\u8A0A\u606F"
    },
    lastUploaded: {
      message: "\u4E0A\u6B21\u4E0A\u50B3\uFF1A{time}",
      description: "\u4E0A\u6B21\u4E0A\u50B3\u6642\u9593\u6233\u8A18"
    },
    neverUploaded: {
      message: "\u5F9E\u672A\u4E0A\u50B3",
      description: "\u5F9E\u672A\u4E0A\u50B3\u8A0A\u606F"
    },
    syncSuccess: {
      message: "\u2713 \u540C\u6B65\u6210\u529F",
      description: "\u540C\u6B65\u6210\u529F\u8A0A\u606F"
    },
    syncError: {
      message: "\u2717 \u540C\u6B65\u5931\u6557\uFF1A{error}",
      description: "\u540C\u6B65\u932F\u8AA4\u8A0A\u606F"
    },
    syncInProgress: {
      message: "\u540C\u6B65\u4E2D...",
      description: "\u540C\u6B65\u9032\u884C\u4E2D\u8A0A\u606F"
    },
    uploadInProgress: {
      message: "\u4E0A\u50B3\u4E2D...",
      description: "\u4E0A\u50B3\u9032\u884C\u4E2D\u8A0A\u606F"
    },
    uploadSuccess: {
      message: "\u2713 \u4E0A\u50B3\u6210\u529F",
      description: "\u4E0A\u50B3\u6210\u529F\u8A0A\u606F"
    },
    downloadInProgress: {
      message: "\u4E0B\u8F09\u4E2D...",
      description: "\u4E0B\u8F09\u9032\u884C\u4E2D\u8A0A\u606F"
    },
    downloadMergeSuccess: {
      message: "\u2713 \u4E0B\u8F09\u5408\u4F75\u6210\u529F",
      description: "\u4E0B\u8F09\u5408\u4F75\u6210\u529F\u8A0A\u606F"
    },
    syncUpload: {
      message: "\u4E0A\u50B3\u5230\u96F2\u7AEF",
      description: "\u4E0A\u50B3\u5230\u96F2\u7AEF\u6309\u9215"
    },
    syncMerge: {
      message: "\u5F9E\u96F2\u7AEF\u4E0B\u8F09\u5408\u4F75",
      description: "\u540C\u6B65\uFF08\u5408\u4F75\uFF09\u6309\u9215"
    },
    syncMode: {
      message: "\u540C\u6B65\u6A21\u5F0F",
      description: "\u540C\u6B65\u6A21\u5F0F\u6A19\u7C64"
    },
    minutesAgo: {
      message: "\u5206\u9418\u524D",
      description: "\u5206\u9418\u524D\u6A19\u7C64"
    },
    syncNoData: {
      message: "\u672A\u5728\u96F2\u7AEF\u627E\u5230\u540C\u6B65\u8CC7\u6599",
      description: "Error message when no data is found in Drive"
    },
    syncUploadFailed: {
      message: "\u4E0A\u50B3\u5931\u6557",
      description: "Error message when upload fails"
    },
    syncDownloadFailed: {
      message: "\u4E0B\u8F09\u5931\u6557",
      description: "Error message when download fails"
    },
    syncAuthFailed: {
      message: "\u8A8D\u8B49\u5931\u6557",
      description: "Error message when authentication fails"
    },
    signOut: {
      message: "\u767B\u51FA",
      description: "\u767B\u51FA\u6309\u9215"
    },
    signInWithGoogle: {
      message: "\u4F7F\u7528 Google \u767B\u5165",
      description: "\u4F7F\u7528 Google \u767B\u5165\u6309\u9215"
    },
    nanobananaOptions: {
      message: "NanoBanana \u9078\u9805",
      description: "NanoBanana options section label"
    },
    enableNanobananaWatermarkRemover: {
      message: "\u79FB\u9664 NanoBanana \u6D6E\u6C34\u5370",
      description: "\u555F\u7528\u81EA\u52D5\u79FB\u9664\u751F\u6210\u5716\u7247\u6D6E\u6C34\u5370\u529F\u80FD"
    },
    nanobananaWatermarkRemoverHint: {
      message: "\u81EA\u52D5\u79FB\u9664 Gemini \u751F\u6210\u5716\u7247\u4E0A\u7684\u53EF\u898B\u6D6E\u6C34\u5370",
      description: "\u6D6E\u6C34\u5370\u79FB\u9664\u529F\u80FD\u63D0\u793A"
    },
    nanobananaDownloadTooltip: {
      message: "\u4E0B\u8F09\u7121\u6D6E\u6C34\u5370\u5716\u7247 (NanoBanana)",
      description: "Download button tooltip"
    },
    deepResearchDownload: {
      message: "\u4E0B\u8F09 Thinking \u5167\u5BB9",
      description: "Deep Research download button text"
    },
    deepResearchDownloadTooltip: {
      message: "\u5C07 Thinking \u5167\u5BB9\u532F\u51FA\u70BA Markdown \u6A94\u6848",
      description: "Deep Research download button tooltip"
    },
    folder_uncategorized: {
      message: "\u672A\u5206\u985E",
      description: "\u6839\u76EE\u9304\u4E0B\u672A\u5206\u985E\u5C0D\u8A71\u7684\u6A19\u7C64"
    },
    timelineLevelTitle: {
      message: "\u7BC0\u9EDE\u5C64\u7D1A",
      description: "\u6642\u9593\u8EF8\u7BC0\u9EDE\u5C64\u7D1A\u53F3\u9375\u9078\u55AE\u6A19\u984C"
    },
    timelineLevel1: {
      message: "\u4E00\u7D1A",
      description: "\u6642\u9593\u8EF8\u7BC0\u9EDE\u4E00\u7D1A\u9078\u9805"
    },
    timelineLevel2: {
      message: "\u4E8C\u7D1A",
      description: "\u6642\u9593\u8EF8\u7BC0\u9EDE\u4E8C\u7D1A\u9078\u9805"
    },
    timelineLevel3: {
      message: "\u4E09\u7D1A",
      description: "\u6642\u9593\u8EF8\u7BC0\u9EDE\u4E09\u7D1A\u9078\u9805"
    },
    timelineCollapse: {
      message: "\u6536\u8D77",
      description: "\u6536\u8D77\u5B50\u7BC0\u9EDE"
    },
    timelineExpand: {
      message: "\u5C55\u958B",
      description: "\u5C55\u958B\u5B50\u7BC0\u9EDE"
    },
    timelinePreviewSearch: {
      message: "\u641C\u5C0B...",
      description: "Timeline preview panel search placeholder"
    },
    timelinePreviewNoResults: {
      message: "\u7121\u7D50\u679C",
      description: "Timeline preview panel no search results"
    },
    timelinePreviewNoMessages: {
      message: "\u66AB\u7121\u8A0A\u606F",
      description: "Timeline preview panel no messages"
    },
    quoteReply: {
      message: "\u5F15\u7528\u56DE\u8986",
      description: "\u5F15\u7528\u56DE\u8986\u6309\u9215\u6587\u5B57"
    },
    inputCollapseOptions: {
      message: "\u8F38\u5165\u9078\u9805",
      description: "\u8F38\u5165\u9078\u9805\u5340\u57DF\u6A19\u7C64"
    },
    enableInputCollapse: {
      message: "\u555F\u7528\u8F38\u5165\u6846\u647A\u758A",
      description: "\u555F\u7528\u8F38\u5165\u6846\u647A\u758A\u958B\u95DC\u6A19\u7C64"
    },
    enableInputCollapseHint: {
      message: "\u8F38\u5165\u6846\u70BA\u7A7A\u6642\u81EA\u52D5\u647A\u758A\uFF0C\u7372\u5F97\u66F4\u591A\u95B1\u8B80\u7A7A\u9593",
      description: "\u8F38\u5165\u6846\u647A\u758A\u529F\u80FD\u63D0\u793A"
    },
    inputCollapsePlaceholder: {
      message: "\u50B3\u9001\u8A0A\u606F\u7D66 Gemini",
      description: "\u647A\u758A\u8F38\u5165\u6846\u6642\u986F\u793A\u7684\u4F54\u4F4D\u7B26\u6587\u5B57"
    },
    ctrlEnterSend: {
      message: "Ctrl+Enter \u50B3\u9001",
      description: "Ctrl+Enter \u50B3\u9001\u958B\u95DC\u6A19\u7C64"
    },
    ctrlEnterSendHint: {
      message: "\u6309 Ctrl+Enter \u50B3\u9001\u8A0A\u606F\uFF0CEnter \u9375\u50C5\u63DB\u884C",
      description: "Ctrl+Enter \u50B3\u9001\u529F\u80FD\u63D0\u793A"
    },
    batch_delete_confirm: {
      message: "\u78BA\u5B9A\u8981\u522A\u9664 {count} \u500B\u5C0D\u8A71\u55CE\uFF1F\u6B64\u64CD\u4F5C\u7121\u6CD5\u5FA9\u539F\u3002",
      description: "\u6279\u6B21\u522A\u9664\u78BA\u8A8D\u8A0A\u606F"
    },
    batch_delete_in_progress: {
      message: "\u6B63\u5728\u522A\u9664... ({current}/{total})",
      description: "\u6279\u6B21\u522A\u9664\u9032\u5EA6\u8A0A\u606F"
    },
    batch_delete_success: {
      message: "\u2713 \u5DF2\u522A\u9664 {count} \u500B\u5C0D\u8A71",
      description: "\u6279\u6B21\u522A\u9664\u6210\u529F\u8A0A\u606F"
    },
    batch_delete_partial: {
      message: "\u522A\u9664\u5B8C\u6210\uFF1A{success} \u500B\u6210\u529F\uFF0C{failed} \u500B\u5931\u6557",
      description: "\u6279\u6B21\u522A\u9664\u90E8\u5206\u6210\u529F\u8A0A\u606F"
    },
    batch_delete_limit_reached: {
      message: "\u4E00\u6B21\u6700\u591A\u53EF\u9078\u64C7 {max} \u500B\u5C0D\u8A71",
      description: "\u6279\u6B21\u522A\u9664\u6578\u91CF\u9650\u5236\u8B66\u544A"
    },
    batch_delete_button: {
      message: "\u522A\u9664\u6240\u9078",
      description: "\u591A\u9078\u6A21\u5F0F\u4E0B\u7684\u6279\u6B21\u522A\u9664\u6309\u9215\u63D0\u793A"
    },
    batch_delete_match_patterns: {
      message: "\u522A\u9664,\u78BA\u8A8D,\u78BA\u5B9A,\u662F,delete,confirm,yes,ok,remove",
      description: "\u7B26\u5408\u539F\u751F\u522A\u9664/\u78BA\u8A8D\u6309\u9215\u7684\u95DC\u9375\u5B57\u6E05\u55AE\uFF08\u9017\u865F\u5206\u9694\uFF09"
    },
    generalOptions: {
      message: "\u4E00\u822C\u9078\u9805",
      description: "\u4E00\u822C\u9078\u9805\u5340\u57DF\u6A19\u7C64"
    },
    enableTabTitleUpdate: {
      message: "\u540C\u6B65\u5206\u9801\u6A19\u984C\u8207\u5C0D\u8A71",
      description: "\u555F\u7528\u5206\u9801\u6A19\u984C\u540C\u6B65\u958B\u95DC\u6A19\u7C64"
    },
    enableTabTitleUpdateHint: {
      message: "\u81EA\u52D5\u5C07\u700F\u89BD\u5668\u5206\u9801\u6A19\u984C\u66F4\u65B0\u70BA\u76EE\u524D\u5C0D\u8A71\u7684\u6A19\u984C",
      description: "\u5206\u9801\u6A19\u984C\u540C\u6B65\u529F\u80FD\u63D0\u793A"
    },
    enableMermaidRendering: {
      message: "\u555F\u7528 Mermaid \u5716\u8868\u8F49\u8B6F",
      description: "\u555F\u7528 Mermaid \u5716\u8868\u8F49\u8B6F\u958B\u95DC\u6A19\u7C64"
    },
    enableMermaidRenderingHint: {
      message: "\u81EA\u52D5\u5C07\u7A0B\u5F0F\u78BC\u5340\u584A\u4E2D\u7684 Mermaid \u7A0B\u5F0F\u78BC\u8F49\u8B6F\u70BA\u5716\u8868",
      description: "Mermaid \u8F49\u8B6F\u529F\u80FD\u63D0\u793A"
    },
    enableQuoteReply: {
      message: "\u555F\u7528\u5F15\u7528\u56DE\u8986",
      description: "\u555F\u7528\u5F15\u7528\u56DE\u8986\u958B\u95DC\u6A19\u7C64"
    },
    enableQuoteReplyHint: {
      message: "\u5728\u5C0D\u8A71\u4E2D\u9078\u53D6\u6587\u5B57\u6642\u986F\u793A\u61F8\u6D6E\u6309\u9215\uFF0C\u7528\u65BC\u5F15\u7528\u6240\u9078\u5167\u5BB9",
      description: "\u5F15\u7528\u56DE\u8986\u529F\u80FD\u63D0\u793A"
    },
    contextSync: {
      message: "\u4E0A\u4E0B\u6587\u540C\u6B65",
      description: "\u4E0A\u4E0B\u6587\u540C\u6B65\u6A19\u984C"
    },
    contextSyncDescription: {
      message: "\u5C07\u5C0D\u8A71\u4E0A\u4E0B\u6587\u540C\u6B65\u5230\u672C\u6A5F IDE",
      description: "\u4E0A\u4E0B\u6587\u540C\u6B65\u63CF\u8FF0"
    },
    syncToIDE: {
      message: "\u540C\u6B65\u5230 IDE",
      description: "\u540C\u6B65\u5230 IDE \u6309\u9215"
    },
    ideOnline: {
      message: "IDE \u7DDA\u4E0A",
      description: "IDE \u7DDA\u4E0A\u72C0\u614B"
    },
    ideOffline: {
      message: "IDE \u96E2\u7DDA",
      description: "IDE \u96E2\u7DDA\u72C0\u614B"
    },
    syncing: {
      message: "\u540C\u6B65\u4E2D...",
      description: "\u540C\u6B65\u4E2D\u72C0\u614B"
    },
    checkServer: {
      message: "\u8ACB\u5728 VS Code \u4E2D\u555F\u52D5 AI Sync \u4F3A\u670D\u5668",
      description: "\u6AA2\u67E5\u4F3A\u670D\u5668\u63D0\u793A"
    },
    capturing: {
      message: "\u6B63\u5728\u53D6\u5F97\u5C0D\u8A71...",
      description: "\u53D6\u5F97\u5C0D\u8A71\u72C0\u614B"
    },
    syncedSuccess: {
      message: "\u540C\u6B65\u6210\u529F\uFF01",
      description: "\u540C\u6B65\u6210\u529F\u8A0A\u606F"
    },
    folder_change_color: {
      message: "\u66F4\u6539\u984F\u8272",
      description: "Change folder color tooltip"
    },
    folder_color_default: {
      message: "\u9810\u8A2D",
      description: "Default folder color"
    },
    folder_color_red: {
      message: "\u7D05\u8272",
      description: "Red folder color"
    },
    folder_color_orange: {
      message: "\u6A59\u8272",
      description: "Orange folder color"
    },
    folder_color_yellow: {
      message: "\u9EC3\u8272",
      description: "Yellow folder color"
    },
    folder_color_green: {
      message: "\u7DA0\u8272",
      description: "Green folder color"
    },
    folder_color_blue: {
      message: "\u85CD\u8272",
      description: "Blue folder color"
    },
    folder_color_purple: {
      message: "\u7D2B\u8272",
      description: "Purple folder color"
    },
    folder_color_pink: {
      message: "\u7C89\u7D05\u8272",
      description: "\u7C89\u7D05\u8272\u8CC7\u6599\u593E\u984F\u8272\u540D\u7A31"
    },
    folder_color_custom: {
      message: "\u81EA\u5B9A\u7FA9",
      description: "\u81EA\u5B9A\u7FA9\u8CC7\u6599\u593E\u984F\u8272\u540D\u7A31"
    },
    downloadingOriginal: {
      message: "\u6B63\u5728\u4E0B\u8F09\u539F\u59CB\u5716\u7247",
      description: "\u4E0B\u8F09\u539F\u59CB\u5716\u7247\u6642\u7684\u72C0\u614B"
    },
    downloadingOriginalLarge: {
      message: "\u6B63\u5728\u4E0B\u8F09\u539F\u59CB\u5716\u7247\uFF08\u5927\u6A94\u6848\uFF09",
      description: "\u4E0B\u8F09\u8F03\u5927\u539F\u59CB\u5716\u7247\u6642\u7684\u72C0\u614B"
    },
    downloadLargeWarning: {
      message: "\u5927\u6A94\u6848\u8B66\u544A",
      description: "\u5927\u6A94\u6848\u4E0B\u8F09\u63D0\u793A"
    },
    downloadProcessing: {
      message: "\u6B63\u5728\u8655\u7406\u6D6E\u6C34\u5370\u4E2D",
      description: "\u8655\u7406\u6D6E\u6C34\u5370\u6642\u7684\u72C0\u614B"
    },
    downloadSuccess: {
      message: "\u6B63\u5728\u4E0B\u8F09",
      description: "\u958B\u59CB\u4E0B\u8F09\u6642\u7684\u72C0\u614B"
    },
    downloadError: {
      message: "\u5931\u6557",
      description: "\u4E0B\u8F09\u5931\u6557\u6642\u7684\u72C0\u614B\u524D\u7F6E"
    },
    recentsHide: {
      message: "\u96B1\u85CF\u6700\u8FD1\u9805\u76EE",
      description: "\u96B1\u85CF\u6700\u8FD1\u9810\u89BD\u5340\u57DF\u7684\u63D0\u793A"
    },
    recentsShow: {
      message: "\u986F\u793A\u6700\u8FD1\u9805\u76EE",
      description: "\u986F\u793A\u6700\u8FD1\u9810\u89BD\u5340\u57DF\u7684\u63D0\u793A"
    },
    gemsHide: {
      message: "\u96B1\u85CF Gems",
      description: "\u96B1\u85CF Gems \u5217\u8868\u5340\u57DF\u7684\u63D0\u793A"
    },
    gemsShow: {
      message: "\u986F\u793A Gems",
      description: "\u986F\u793A Gems \u5217\u8868\u5340\u57DF\u7684\u63D0\u793A"
    },
    setAsDefaultModel: {
      message: "\u8A2D\u70BA\u65B0\u5C0D\u8A71\u7684\u9810\u8A2D\u6A21\u578B",
      description: "Tooltip for setting default model"
    },
    cancelDefaultModel: {
      message: "\u53D6\u6D88\u9810\u8A2D\u6A21\u578B",
      description: "Tooltip for cancelling default model"
    },
    defaultModelSet: {
      message: "\u5DF2\u8A2D\u5B9A\u9810\u8A2D\u6A21\u578B\uFF1A$1",
      description: "Toast message when default model is set"
    },
    defaultModelCleared: {
      message: "\u5DF2\u53D6\u6D88\u9810\u8A2D\u6A21\u578B",
      description: "Toast message when default model is cleared"
    },
    sidebarAutoHide: {
      message: "\u5074\u908A\u6B04\u81EA\u52D5\u6536\u8D77",
      description: "\u5074\u908A\u6B04\u81EA\u52D5\u6536\u8D77\u958B\u95DC\u6A19\u7C64"
    },
    sidebarAutoHideHint: {
      message: "\u6ED1\u9F20\u96E2\u958B\u6642\u81EA\u52D5\u6536\u8D77\u5074\u908A\u6B04\uFF0C\u6ED1\u9F20\u9032\u5165\u6642\u5C55\u958B",
      description: "\u5074\u908A\u6B04\u81EA\u52D5\u6536\u8D77\u529F\u80FD\u63D0\u793A"
    },
    folderSpacing: {
      message: "\u8CC7\u6599\u593E\u9593\u8DDD",
      description: "\u8CC7\u6599\u593E\u9593\u8DDD\u8ABF\u7BC0\u6A19\u7C64"
    },
    folderSpacingCompact: {
      message: "\u7DCA\u6E4A",
      description: "\u7DCA\u6E4A\u8CC7\u6599\u593E\u9593\u8DDD\u6A19\u7C64"
    },
    folderSpacingSpacious: {
      message: "\u5BEC\u9B06",
      description: "\u5BEC\u9B06\u8CC7\u6599\u593E\u9593\u8DDD\u6A19\u7C64"
    },
    folderTreeIndent: {
      message: "\u5B50\u8CC7\u6599\u593E\u7E2E\u6392",
      description: "\u5B50\u8CC7\u6599\u593E\u6A39\u72C0\u7E2E\u6392\u8ABF\u6574\u6A19\u7C64"
    },
    folderTreeIndentCompact: {
      message: "\u66F4\u7A84",
      description: "\u8F03\u7A84\u7684\u5B50\u8CC7\u6599\u593E\u7E2E\u6392\u6A19\u7C64"
    },
    folderTreeIndentSpacious: {
      message: "\u66F4\u5BEC",
      description: "\u8F03\u5BEC\u7684\u5B50\u8CC7\u6599\u593E\u7E2E\u6392\u6A19\u7C64"
    },
    export_select_mode_select_all: {
      message: "\u5168\u9078",
      description: "Selection mode select all toggle"
    },
    export_select_mode_count: {
      message: "\u5DF2\u9078\u64C7 {count} \u689D",
      description: "Selection mode selected message count"
    },
    export_select_mode_toggle: {
      message: "\u9078\u64C7\u8A0A\u606F",
      description: "Selection mode per-message toggle tooltip"
    },
    export_select_mode_select_below: {
      message: "\u9078\u64C7\u4E0B\u65B9\u8A0A\u606F",
      description: "Selection mode top-left button to select messages below current line"
    },
    export_select_mode_empty: {
      message: "\u8ACB\u81F3\u5C11\u9078\u64C7\u4E00\u689D\u8A0A\u606F\u9032\u884C\u532F\u51FA",
      description: "Selection mode validation when nothing is selected"
    },
    export_format_image_description: {
      message: "\u55AE\u5F35PNG\u5716\u7247\uFF0C\u4FBF\u65BC\u884C\u52D5\u7AEF\u5206\u4EAB\u3002",
      description: "Description for Image export format"
    },
    export_image_progress: {
      message: "\u6B63\u5728\u7522\u751F\u5716\u7247...",
      description: "Progress message while generating image export"
    },
    deepResearchSaveReport: {
      message: "\u5132\u5B58\u5831\u544A",
      description: "Deep Research save report button"
    },
    deepResearchSaveReportTooltip: {
      message: "\u532F\u51FA\u6B64\u7814\u7A76\u5831\u544A",
      description: "Deep Research save report tooltip"
    },
    export_fontsize_label: {
      message: "\u5B57\u9AD4\u5927\u5C0F",
      description: "Label for font size slider in export dialog"
    },
    export_fontsize_preview: {
      message: "\u5929\u5730\u7384\u9EC3\uFF0C\u5B87\u5B99\u6D2A\u8352\u3002\u65E5\u6708\u76C8\u6603\uFF0C\u8FB0\u5BBF\u5217\u5F35\u3002",
      description: "Preview text for font size slider in export dialog"
    },
    export_error_generic: {
      message: "\u532F\u51FA\u5931\u6557\uFF1A{error}",
      description: "\u9644\u5E36\u5177\u9AD4\u539F\u56E0\u7684\u532F\u51FA\u5931\u6557\u63D0\u793A"
    },
    export_error_refresh_retry: {
      message: "\u56E0\u7DB2\u8DEF\u539F\u56E0\uFF0C\u5716\u7247\u532F\u51FA\u5931\u6557\uFF0C\u8ACB\u91CD\u65B0\u6574\u7406\u9801\u9762\u5F8C\u91CD\u8A66\u3002",
      description: "\u5716\u7247\u532F\u51FA\u9047\u5230\u66AB\u6642\u6027\u8F09\u5165\u5931\u6557\u6642\u7684\u91CD\u65B0\u6574\u7406\u63D0\u793A"
    },
    export_md_include_source_confirm: {
      message: "\u532F\u51FA\u5167\u5BB9\u5305\u542B\u7DB2\u8DEF\u641C\u5C0B\u5716\u7247\u3002\u662F\u5426\u5728 Markdown \u4E2D\u5305\u542B\u5716\u7247\u4F86\u6E90\u9023\u7D50\uFF1F",
      description: "Confirm dialog when exporting markdown with web search images"
    },
    deepResearch_exportedAt: {
      message: "\u532F\u51FA\u6642\u9593",
      description: "\u6DF1\u5EA6\u7814\u7A76\u532F\u51FA\u6642\u9593\u6233\u6A19\u7C64"
    },
    deepResearch_totalPhases: {
      message: "\u7E3D\u601D\u8003\u968E\u6BB5",
      description: "\u6DF1\u5EA6\u7814\u7A76\u7E3D\u601D\u8003\u968E\u6BB5\u6A19\u7C64"
    },
    deepResearch_thinkingPhase: {
      message: "\u601D\u8003\u968E\u6BB5",
      description: "\u6DF1\u5EA6\u7814\u7A76\u601D\u8003\u968E\u6BB5\u6A19\u984C"
    },
    deepResearch_researchedWebsites: {
      message: "\u7814\u7A76\u7DB2\u7AD9",
      description: "\u6DF1\u5EA6\u7814\u7A76\u5DF2\u7814\u7A76\u7DB2\u7AD9\u7AE0\u7BC0\u6A19\u984C"
    }
  };

  // ../gemini-voyager/src/utils/translations.ts
  var rawMessagesByLanguage = {
    en: messages_default2,
    zh: messages_default9,
    zh_TW: messages_default10,
    ja: messages_default5,
    fr: messages_default4,
    es: messages_default3,
    pt: messages_default7,
    ar: messages_default,
    ru: messages_default8,
    ko: messages_default6
  };
  function extractTranslations(raw) {
    const out = {};
    for (const key of Object.keys(raw)) {
      out[key] = raw[key].message;
    }
    return out;
  }
  var TRANSLATIONS = {
    en: extractTranslations(rawMessagesByLanguage.en),
    zh: extractTranslations(rawMessagesByLanguage.zh),
    zh_TW: extractTranslations(rawMessagesByLanguage.zh_TW),
    ja: extractTranslations(rawMessagesByLanguage.ja),
    fr: extractTranslations(rawMessagesByLanguage.fr),
    es: extractTranslations(rawMessagesByLanguage.es),
    pt: extractTranslations(rawMessagesByLanguage.pt),
    ar: extractTranslations(rawMessagesByLanguage.ar),
    ru: extractTranslations(rawMessagesByLanguage.ru),
    ko: extractTranslations(rawMessagesByLanguage.ko)
  };

  // ../gemini-voyager/src/utils/i18n.ts
  var readStorageValue = async (area) => {
    try {
      const storageArea = webextension_polyfill_default.storage?.[area];
      if (storageArea?.get) {
        const result = await storageArea.get(StorageKeys.LANGUAGE);
        if (result && typeof result === "object") {
          return result[StorageKeys.LANGUAGE];
        }
      }
    } catch {
    }
    try {
      const chromeStorage = chrome?.storage?.[area];
      if (!chromeStorage?.get)
        return null;
      return await new Promise((resolve) => {
        chromeStorage.get(StorageKeys.LANGUAGE, (result) => {
          if (result && typeof result === "object") {
            resolve(result[StorageKeys.LANGUAGE]);
          } else {
            resolve(null);
          }
        });
      });
    } catch {
      return null;
    }
  };
  var getStoredLanguage = async () => {
    const syncValue = await readStorageValue("sync");
    if (typeof syncValue === "string")
      return syncValue;
    const localValue = await readStorageValue("local");
    if (typeof localValue === "string")
      return localValue;
    return null;
  };
  async function getCurrentLanguage() {
    const stored = await getStoredLanguage();
    if (typeof stored === "string") {
      return normalizeLanguage(stored);
    }
    try {
      const browserLang = webextension_polyfill_default.i18n.getUILanguage();
      return normalizeLanguage(browserLang);
    } catch {
      return "en";
    }
  }
  var cachedLanguage = null;
  function getTranslationSync(key) {
    const language = cachedLanguage || "en";
    return TRANSLATIONS[language][key] ?? TRANSLATIONS.en[key] ?? key;
  }
  async function initI18n() {
    cachedLanguage = await getCurrentLanguage();
    webextension_polyfill_default.storage.onChanged.addListener((changes, areaName) => {
      const next = changes[StorageKeys.LANGUAGE]?.newValue;
      if ((areaName === "sync" || areaName === "local") && typeof next === "string") {
        cachedLanguage = normalizeLanguage(next);
      }
    });
  }

  // ../gemini-voyager/src/pages/content/timeline/EventBus.ts
  var EventBus = class _EventBus {
    static instance;
    listeners = /* @__PURE__ */ new Map();
    constructor() {
    }
    /**
     * Singleton pattern: Get EventBus instance
     */
    static getInstance() {
      if (!_EventBus.instance) {
        _EventBus.instance = new _EventBus();
      }
      return _EventBus.instance;
    }
    /**
     * Subscribe to an event
     */
    on(event, callback) {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, /* @__PURE__ */ new Set());
      }
      this.listeners.get(event).add(callback);
      return () => this.off(event, callback);
    }
    /**
     * Unsubscribe from an event
     */
    off(event, callback) {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(event);
        }
      }
    }
    /**
     * Emit an event
     */
    emit(event, data) {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        callbacks.forEach((callback) => {
          try {
            callback(data);
          } catch (error) {
            console.error(`[EventBus] Error in ${event} listener:`, error);
          }
        });
      }
    }
    /**
     * Clear all listeners (useful for cleanup)
     */
    clear() {
      this.listeners.clear();
    }
    /**
     * Get listener count for debugging
     */
    getListenerCount(event) {
      if (event) {
        return this.listeners.get(event)?.size || 0;
      }
      let total = 0;
      this.listeners.forEach((callbacks) => {
        total += callbacks.size;
      });
      return total;
    }
  };
  var eventBus = EventBus.getInstance();

  // ../gemini-voyager/src/pages/content/timeline/StarredMessagesService.ts
  var StarredMessagesService = class {
    /**
     * Send message to background script and wait for response
     */
    static async sendMessage(type, payload) {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type, payload }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (!response || !response.ok) {
            reject(new Error(response?.error || "Operation failed"));
            return;
          }
          resolve(response);
        });
      });
    }
    /**
     * Get all starred messages from storage
     */
    static async getAllStarredMessages() {
      try {
        const response = await this.sendMessage(
          "gv.starred.getAll"
        );
        return response.data || { messages: {} };
      } catch (error) {
        console.error("[StarredMessagesService] Failed to get starred messages:", error);
        return { messages: {} };
      }
    }
    /**
     * Get starred messages for a specific conversation
     */
    static async getStarredMessagesForConversation(conversationId) {
      try {
        const response = await this.sendMessage(
          "gv.starred.getForConversation",
          { conversationId }
        );
        return response.messages || [];
      } catch (error) {
        console.error("[StarredMessagesService] Failed to get starred messages:", error);
        return [];
      }
    }
    /**
     * Add a starred message - delegated to background script
     */
    static async addStarredMessage(message) {
      try {
        const response = await this.sendMessage(
          "gv.starred.add",
          message
        );
        if (response.added) {
          eventBus.emit("starred:added", {
            conversationId: message.conversationId,
            turnId: message.turnId
          });
          this.updateLegacyStorage(message.conversationId, message.turnId, "add");
        }
      } catch (error) {
        console.error("[StarredMessagesService] Failed to add starred message:", error);
      }
    }
    /**
     * Remove a starred message - delegated to background script
     */
    static async removeStarredMessage(conversationId, turnId) {
      try {
        const response = await this.sendMessage(
          "gv.starred.remove",
          { conversationId, turnId }
        );
        if (response.removed) {
          eventBus.emit("starred:removed", {
            conversationId,
            turnId
          });
          this.updateLegacyStorage(conversationId, turnId, "remove");
        }
      } catch (error) {
        console.error("[StarredMessagesService] Failed to remove starred message:", error);
      }
    }
    /**
     * Update legacy localStorage format for backward compatibility
     * This ensures TimelineManager's storage event listener works
     */
    static updateLegacyStorage(conversationId, turnId, action) {
      try {
        const key = `geminiTimelineStars:${conversationId}`;
        const raw = localStorage.getItem(key);
        let ids = [];
        if (raw) {
          try {
            ids = JSON.parse(raw);
            if (!Array.isArray(ids))
              ids = [];
          } catch {
            ids = [];
          }
        }
        if (action === "add") {
          if (!ids.includes(turnId)) {
            ids.push(turnId);
          }
        } else {
          ids = ids.filter((id) => id !== turnId);
        }
        localStorage.setItem(key, JSON.stringify(ids));
      } catch (error) {
        console.debug("[StarredMessagesService] Failed to update legacy storage:", error);
      }
    }
    /**
     * Check if a message is starred
     */
    static async isMessageStarred(conversationId, turnId) {
      const messages = await this.getStarredMessagesForConversation(conversationId);
      return messages.some((m) => m.turnId === turnId);
    }
    /**
     * Get all starred messages sorted by timestamp (newest first)
     */
    static async getAllStarredMessagesSorted() {
      const data = await this.getAllStarredMessages();
      const allMessages = [];
      Object.values(data.messages).forEach((messages) => {
        allMessages.push(...messages);
      });
      return allMessages.sort((a, b) => b.starredAt - a.starredAt);
    }
  };

  // ../gemini-voyager/src/pages/content/timeline/TimelinePreviewPanel.ts
  var SEARCH_DEBOUNCE_MS = 200;
  var LIST_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`;
  var TimelinePreviewPanel = class {
    constructor(anchorElement) {
      this.anchorElement = anchorElement;
    }
    panelEl = null;
    listEl = null;
    searchInput = null;
    toggleBtn = null;
    _isOpen = false;
    markers = [];
    filteredMarkers = [];
    activeTurnId = null;
    searchQuery = "";
    searchDebounceTimer = null;
    onNavigate = null;
    onSearchChange = null;
    onDocumentPointerDown = null;
    onKeyDown = null;
    onWindowResize = null;
    onStorageChanged = null;
    get isOpen() {
      return this._isOpen;
    }
    init(onNavigate, onSearchChange) {
      this.onNavigate = onNavigate;
      this.onSearchChange = onSearchChange ?? null;
      this.createDOM();
      this.positionToggle();
      this.setupEventListeners();
    }
    updateMarkers(markers) {
      if (this.markersEqual(markers))
        return;
      this.markers = markers;
      this.applyFilter();
    }
    updateActiveTurn(turnId) {
      if (this.activeTurnId === turnId)
        return;
      this.activeTurnId = turnId;
      if (!this._isOpen || !this.listEl)
        return;
      this.updateActiveHighlight();
      this.scrollActiveIntoView();
    }
    toggle() {
      if (this._isOpen) {
        this.close();
      } else {
        this.open();
      }
    }
    open() {
      if (this._isOpen || !this.panelEl)
        return;
      this._isOpen = true;
      this.renderList();
      this.positionPanel();
      this.panelEl.classList.add("visible");
      this.toggleBtn?.classList.add("active");
      this.scrollActiveIntoView();
    }
    close() {
      if (!this._isOpen || !this.panelEl)
        return;
      this._isOpen = false;
      this.panelEl.classList.remove("visible");
      this.toggleBtn?.classList.remove("active");
      if (this.searchInput) {
        this.searchInput.value = "";
        this.searchQuery = "";
        this.filteredMarkers = this.markers;
      }
      this.onSearchChange?.("");
    }
    destroy() {
      if (this.searchDebounceTimer) {
        clearTimeout(this.searchDebounceTimer);
        this.searchDebounceTimer = null;
      }
      if (this.onDocumentPointerDown) {
        document.removeEventListener("pointerdown", this.onDocumentPointerDown);
        this.onDocumentPointerDown = null;
      }
      if (this.onKeyDown) {
        document.removeEventListener("keydown", this.onKeyDown);
        this.onKeyDown = null;
      }
      if (this.onWindowResize) {
        window.removeEventListener("resize", this.onWindowResize);
        this.onWindowResize = null;
      }
      if (this.onStorageChanged) {
        webextension_polyfill_default.storage.onChanged.removeListener(this.onStorageChanged);
        this.onStorageChanged = null;
      }
      this.toggleBtn?.remove();
      this.panelEl?.remove();
      this.toggleBtn = null;
      this.panelEl = null;
      this.listEl = null;
      this.searchInput = null;
      this.onSearchChange?.("");
      this.onNavigate = null;
      this.onSearchChange = null;
      this.markers = [];
      this.filteredMarkers = [];
    }
    createDOM() {
      this.toggleBtn = document.createElement("button");
      this.toggleBtn.className = "timeline-preview-toggle";
      this.toggleBtn.setAttribute("aria-label", "Toggle preview panel");
      this.toggleBtn.innerHTML = LIST_ICON_SVG;
      this.toggleBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggle();
      });
      document.body.appendChild(this.toggleBtn);
      this.panelEl = document.createElement("div");
      this.panelEl.className = "timeline-preview-panel";
      const searchWrapper = document.createElement("div");
      searchWrapper.className = "timeline-preview-search";
      this.searchInput = document.createElement("input");
      this.searchInput.type = "text";
      this.searchInput.placeholder = getTranslationSync("timelinePreviewSearch");
      this.searchInput.addEventListener("input", () => {
        this.handleSearchInput();
      });
      searchWrapper.appendChild(this.searchInput);
      this.panelEl.appendChild(searchWrapper);
      this.listEl = document.createElement("div");
      this.listEl.className = "timeline-preview-list";
      this.setupScrollIsolation();
      this.panelEl.appendChild(this.listEl);
      document.body.appendChild(this.panelEl);
    }
    setupEventListeners() {
      this.onDocumentPointerDown = (e) => {
        if (!this._isOpen)
          return;
        const target = e.target;
        if (this.panelEl?.contains(target) || this.toggleBtn?.contains(target))
          return;
        this.close();
      };
      document.addEventListener("pointerdown", this.onDocumentPointerDown);
      this.onKeyDown = (e) => {
        if (!this._isOpen)
          return;
        if (e.key === "Escape") {
          e.stopPropagation();
          this.close();
        }
      };
      document.addEventListener("keydown", this.onKeyDown);
      this.onWindowResize = () => {
        this.positionToggle();
        if (this._isOpen)
          this.positionPanel();
      };
      window.addEventListener("resize", this.onWindowResize);
      this.onStorageChanged = (changes, areaName) => {
        if ((areaName === "sync" || areaName === "local") && changes[StorageKeys.LANGUAGE]) {
          this.updateTranslatedText();
        }
      };
      webextension_polyfill_default.storage.onChanged.addListener(this.onStorageChanged);
    }
    updateTranslatedText() {
      if (this.searchInput) {
        this.searchInput.placeholder = getTranslationSync("timelinePreviewSearch");
      }
      if (this._isOpen) {
        this.renderList();
      }
    }
    setupScrollIsolation() {
      if (!this.listEl)
        return;
      this.listEl.addEventListener(
        "wheel",
        (e) => {
          e.stopPropagation();
          const { scrollTop, scrollHeight, clientHeight } = this.listEl;
          const atTop = scrollTop <= 0 && e.deltaY < 0;
          const atBottom = scrollTop + clientHeight >= scrollHeight - 1 && e.deltaY > 0;
          if (atTop || atBottom) {
            e.preventDefault();
          }
        },
        { passive: false }
      );
    }
    /** Position the toggle button to the left of the timeline bar, vertically centered. */
    positionToggle() {
      if (!this.toggleBtn)
        return;
      const barRect = this.anchorElement.getBoundingClientRect();
      const btnSize = 24;
      const gap = 4;
      this.toggleBtn.style.left = `${Math.round(barRect.left - btnSize - gap)}px`;
      this.toggleBtn.style.top = `${Math.round(barRect.top + barRect.height / 2 - btnSize / 2)}px`;
    }
    positionPanel() {
      if (!this.panelEl)
        return;
      const barRect = this.anchorElement.getBoundingClientRect();
      const panelWidth = 320;
      const gap = 12;
      const maxHeight = Math.min(500, window.innerHeight * 0.7);
      const barCenterY = barRect.top + barRect.height / 2;
      let left = barRect.left - panelWidth - gap;
      if (left < 8)
        left = 8;
      this.panelEl.style.maxHeight = `${Math.round(maxHeight)}px`;
      this.panelEl.style.left = `${Math.round(left)}px`;
      const panelHeight = this.panelEl.offsetHeight || maxHeight;
      let top = barCenterY - panelHeight / 2;
      top = Math.max(8, Math.min(top, window.innerHeight - panelHeight - 8));
      this.panelEl.style.top = `${Math.round(top)}px`;
    }
    applyFilter() {
      if (!this.searchQuery) {
        this.filteredMarkers = this.markers;
      } else {
        const q = this.searchQuery.toLowerCase();
        this.filteredMarkers = this.markers.filter((m) => m.summary.toLowerCase().includes(q));
      }
      if (this._isOpen) {
        this.renderList();
      }
      this.onSearchChange?.(this.searchQuery);
    }
    handleSearchInput() {
      if (this.searchDebounceTimer) {
        clearTimeout(this.searchDebounceTimer);
      }
      this.searchDebounceTimer = window.setTimeout(() => {
        this.searchDebounceTimer = null;
        this.searchQuery = this.searchInput?.value.trim() ?? "";
        this.applyFilter();
      }, SEARCH_DEBOUNCE_MS);
    }
    renderList() {
      if (!this.listEl)
        return;
      this.listEl.textContent = "";
      if (this.filteredMarkers.length === 0) {
        const empty = document.createElement("div");
        empty.className = "timeline-preview-empty";
        empty.textContent = this.searchQuery ? getTranslationSync("timelinePreviewNoResults") : getTranslationSync("timelinePreviewNoMessages");
        this.listEl.appendChild(empty);
        return;
      }
      const fragment = document.createDocumentFragment();
      for (const marker of this.filteredMarkers) {
        fragment.appendChild(this.createItem(marker));
      }
      this.listEl.appendChild(fragment);
    }
    createItem(marker) {
      const item = document.createElement("div");
      item.className = "timeline-preview-item";
      item.dataset.turnId = marker.id;
      if (marker.starred) {
        item.classList.add("starred");
      }
      if (marker.id === this.activeTurnId) {
        item.classList.add("active");
      }
      const indexLabel = document.createElement("span");
      indexLabel.className = "timeline-preview-index";
      indexLabel.textContent = `${marker.index + 1}`;
      item.appendChild(indexLabel);
      const text = document.createElement("span");
      text.className = "timeline-preview-text";
      const displayText = this.truncateText(marker.summary, 80);
      if (this.searchQuery) {
        this.appendHighlighted(text, displayText, this.searchQuery);
      } else {
        text.textContent = displayText;
      }
      item.appendChild(text);
      item.addEventListener("click", () => {
        this.onNavigate?.(marker.id, marker.index);
      });
      return item;
    }
    /** Split text around case-insensitive query matches and wrap each match in <mark>. */
    appendHighlighted(container, text, query) {
      const lowerText = text.toLowerCase();
      const lowerQuery = query.toLowerCase();
      let cursor = 0;
      let idx = lowerText.indexOf(lowerQuery, cursor);
      while (idx !== -1) {
        if (idx > cursor) {
          container.appendChild(document.createTextNode(text.slice(cursor, idx)));
        }
        const mark = document.createElement("mark");
        mark.className = "timeline-preview-highlight";
        mark.textContent = text.slice(idx, idx + query.length);
        container.appendChild(mark);
        cursor = idx + query.length;
        idx = lowerText.indexOf(lowerQuery, cursor);
      }
      if (cursor < text.length) {
        container.appendChild(document.createTextNode(text.slice(cursor)));
      }
    }
    truncateText(text, maxLen) {
      if (text.length <= maxLen)
        return text;
      return text.slice(0, maxLen - 1) + "\u2026";
    }
    updateActiveHighlight() {
      if (!this.listEl)
        return;
      const items = this.listEl.querySelectorAll(".timeline-preview-item");
      items.forEach((item) => {
        const el = item;
        el.classList.toggle("active", el.dataset.turnId === this.activeTurnId);
      });
    }
    scrollActiveIntoView() {
      if (!this.listEl || !this.activeTurnId)
        return;
      const activeItem = this.listEl.querySelector(
        ".timeline-preview-item.active"
      );
      activeItem?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
    }
    markersEqual(newMarkers) {
      if (newMarkers.length !== this.markers.length)
        return false;
      for (let i = 0; i < newMarkers.length; i++) {
        const a = this.markers[i];
        const b = newMarkers[i];
        if (a.id !== b.id || a.summary !== b.summary || a.starred !== b.starred)
          return false;
      }
      return true;
    }
  };

  // ../gemini-voyager/src/pages/content/timeline/manager.ts
  function hashString(input) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  }
  var TURN_LABEL_PREFIXES = /^[\u200B\u200C\u200D\u200E\u200F\uFEFF]*(?:you said|you wrote|user message|your prompt|you asked)[:\s]*/i;
  var TimelineManager = class _TimelineManager {
    scrollContainer = null;
    conversationContainer = null;
    markers = [];
    activeTurnId = null;
    ui = { timelineBar: null, tooltip: null };
    isScrolling = false;
    mutationObserver = null;
    resizeObserver = null;
    intersectionObserver = null;
    visibleUserTurns = /* @__PURE__ */ new Set();
    onTimelineBarClick = null;
    onScroll = null;
    onTimelineWheel = null;
    onWindowResize = null;
    onTimelineBarOver = null;
    onTimelineBarOut = null;
    scrollRafId = null;
    lastActiveChangeTime = 0;
    minActiveChangeInterval = 120;
    pendingActiveId = null;
    activeChangeTimer = null;
    tooltipHideDelay = 100;
    scrollMode = "flow";
    hideContainer = false;
    runnerRing = null;
    flowAnimating = false;
    tooltipHideTimer = null;
    measureEl = null;
    measureCanvas = null;
    measureCtx = null;
    showRafId = null;
    scale = 1;
    contentHeight = 0;
    yPositions = [];
    markerTops = [];
    visibleRange = { start: 0, end: -1 };
    firstUserTurnOffset = 0;
    contentSpanPx = 1;
    usePixelTop = false;
    _cssVarTopSupported = null;
    sliderDragging = false;
    sliderFadeTimer = null;
    sliderFadeDelay = 1e3;
    sliderAlwaysVisible = false;
    onSliderDown = null;
    onSliderMove = null;
    onSliderUp = null;
    sliderStartClientY = 0;
    sliderStartTop = 0;
    markersVersion = 0;
    resizeIdleTimer = null;
    resizeIdleDelay = 140;
    resizeIdleRICId = null;
    onVisualViewportResize = null;
    zeroTurnsTimer = null;
    onStorage = null;
    onChromeStorageChanged = null;
    starred = /* @__PURE__ */ new Set();
    markerMap = /* @__PURE__ */ new Map();
    conversationId = null;
    userTurnSelector = "";
    assistantTurnSelector = "";
    markerLevels = /* @__PURE__ */ new Map();
    collapsedMarkers = /* @__PURE__ */ new Set();
    markerLevelEnabled = false;
    contextMenu = null;
    onContextMenu = null;
    onDocumentClick = null;
    onPointerDown = null;
    onPointerMove = null;
    onPointerUp = null;
    onPointerCancel = null;
    onPointerLeave = null;
    pressTargetDot = null;
    pressStartPos = null;
    longPressTimer = null;
    longPressTriggered = false;
    suppressClickUntil = 0;
    longPressDuration = 550;
    longPressMoveTolerance = 6;
    onBarEnter = null;
    onBarLeave = null;
    onSliderEnter = null;
    onSliderLeave = null;
    draggable = false;
    barDragging = false;
    barStartPos = { x: 0, y: 0 };
    barStartOffset = { x: 0, y: 0 };
    onBarPointerDown = null;
    onBarPointerMove = null;
    onBarPointerUp = null;
    eventBusUnsubscribers = [];
    shortcutUnsubscribe = null;
    navigationQueue = [];
    isNavigating = false;
    previewPanel = null;
    async init() {
      await initI18n();
      const ok = await this.findCriticalElements();
      if (!ok)
        return;
      this.injectTimelineUI();
      this.setupEventListeners();
      this.setupObservers();
      this.conversationId = this.computeConversationId();
      await this.loadStars();
      await this.syncStarredFromService();
      this.loadMarkerLevels();
      this.loadCollapsedMarkers();
      this.recalculateAndRenderMarkers();
      this.handleStarredMessageNavigation();
      await this.initKeyboardShortcuts();
      try {
        const g = globalThis;
        const defaults = {
          geminiTimelineScrollMode: "flow",
          geminiTimelineHideContainer: false,
          geminiTimelineDraggable: false,
          geminiTimelineMarkerLevel: false,
          geminiTimelinePosition: null
        };
        let res = null;
        if (g.chrome?.storage?.sync || g.browser?.storage?.sync) {
          res = await new Promise((resolve) => {
            if (g.chrome?.storage?.sync?.get) {
              g.chrome.storage.sync.get(defaults, (items) => {
                if (g.chrome.runtime.lastError) {
                  console.error(
                    `[Timeline] chrome.storage.get failed: ${g.chrome.runtime.lastError.message}`
                  );
                  resolve(null);
                } else {
                  resolve(items);
                }
              });
            } else {
              g.browser.storage.sync.get(defaults).then(resolve).catch((error) => {
                console.error(`[Timeline] browser.storage.get failed: ${error.message}`);
                resolve(null);
              });
            }
          });
        } else {
          const saved = localStorage.getItem("geminiTimelineScrollMode");
          if (saved === "flow" || saved === "jump")
            res = { geminiTimelineScrollMode: saved };
        }
        const m = res?.geminiTimelineScrollMode;
        if (m === "flow" || m === "jump")
          this.scrollMode = m;
        this.hideContainer = !!res?.geminiTimelineHideContainer;
        this.applyContainerVisibility();
        this.toggleDraggable(!!res?.geminiTimelineDraggable);
        this.toggleMarkerLevel(!!res?.geminiTimelineMarkerLevel);
        const position = res?.geminiTimelinePosition;
        if (position) {
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          if (position.version === 2 && position.topPercent !== void 0 && position.leftPercent !== void 0) {
            const top = position.topPercent / 100 * viewportHeight;
            const left = position.leftPercent / 100 * viewportWidth;
            this.applyPosition(top, left);
          } else if (position.top !== void 0 && position.left !== void 0) {
            this.applyPosition(position.top, position.left);
            const migratedPosition = {
              version: 2,
              topPercent: position.top / viewportHeight * 100,
              leftPercent: position.left / viewportWidth * 100
            };
            (g.chrome?.storage?.sync || g.browser?.storage?.sync)?.set?.({
              geminiTimelinePosition: migratedPosition
            });
          }
        }
        try {
          const onChanged = g.chrome?.storage?.onChanged || g.browser?.storage?.onChanged;
          if (onChanged) {
            onChanged.addListener((changes, area) => {
              if (area !== "sync")
                return;
              if (changes?.geminiTimelineScrollMode) {
                const n = changes.geminiTimelineScrollMode.newValue;
                if (n === "flow" || n === "jump")
                  this.scrollMode = n;
              }
              if (changes?.geminiTimelineHideContainer) {
                this.hideContainer = !!changes.geminiTimelineHideContainer.newValue;
                this.applyContainerVisibility();
              }
              if (changes?.geminiTimelineDraggable) {
                this.toggleDraggable(!!changes.geminiTimelineDraggable.newValue);
              }
              if (changes?.geminiTimelineMarkerLevel) {
                this.toggleMarkerLevel(!!changes.geminiTimelineMarkerLevel.newValue);
              }
              if (changes?.geminiTimelinePosition && !changes.geminiTimelinePosition.newValue) {
                if (this.ui.timelineBar) {
                  this.ui.timelineBar.style.top = "";
                  this.ui.timelineBar.style.left = "";
                }
              }
            });
          }
        } catch {
        }
      } catch (err) {
        console.error("[Timeline] Init storage error:", err);
      }
    }
    computeElementTopsInScrollContainer(elements) {
      if (!this.scrollContainer || elements.length === 0)
        return [];
      const containerRect = this.scrollContainer.getBoundingClientRect();
      const scrollTop = this.scrollContainer.scrollTop;
      const first = elements[0];
      const firstOffsetParent = first.offsetParent;
      const firstOffsetTop = first.offsetTop;
      const firstTop = first.getBoundingClientRect().top - containerRect.top + scrollTop;
      const sameOffsetParent = firstOffsetParent !== null && elements.every((el) => el.offsetParent === firstOffsetParent);
      const tops = elements.map((el) => {
        if (sameOffsetParent) {
          return firstTop + (el.offsetTop - firstOffsetTop);
        }
        return el.getBoundingClientRect().top - containerRect.top + scrollTop;
      });
      for (let i = 1; i < tops.length; i++) {
        if (tops[i] < tops[i - 1])
          return [];
      }
      return tops;
    }
    updateIntersectionObserverTargetsFromMarkers() {
      if (!this.intersectionObserver)
        return;
      this.intersectionObserver.disconnect();
      this.markers.forEach((m) => this.intersectionObserver.observe(m.element));
    }
    applyContainerVisibility() {
      if (!this.ui.timelineBar)
        return;
      this.ui.timelineBar.classList.toggle("timeline-no-container", !!this.hideContainer);
    }
    computeConversationId() {
      const raw = `${location.host}${location.pathname}${location.search}`;
      return `gemini:${hashString(raw)}`;
    }
    /**
     * DRY helper: Get storage key for starred messages
     */
    getStarsStorageKey() {
      return this.conversationId ? `geminiTimelineStars:${this.conversationId}` : null;
    }
    /**
     * DRY helper: Safe localStorage getItem with try-catch
     */
    safeLocalStorageGet(key) {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.warn("[Timeline] Failed to read from localStorage:", error);
        return null;
      }
    }
    /**
     * DRY helper: Safe localStorage setItem with try-catch
     */
    safeLocalStorageSet(key, value) {
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (error) {
        console.warn("[Timeline] Failed to write to localStorage:", error);
        return false;
      }
    }
    areStarredSetsEqual(a, b) {
      if (a.size !== b.size)
        return false;
      for (const value of a) {
        if (!b.has(value))
          return false;
      }
      return true;
    }
    applyStarredIdSet(nextSet, persistLocal = true) {
      if (this.areStarredSetsEqual(this.starred, nextSet))
        return;
      this.starred = new Set(nextSet);
      if (persistLocal)
        this.saveStars();
      for (const marker of this.markers) {
        const want = this.starred.has(marker.id);
        if (marker.starred !== want) {
          marker.starred = want;
          if (marker.dotElement) {
            marker.dotElement.classList.toggle("starred", want);
            marker.dotElement.setAttribute("aria-pressed", want ? "true" : "false");
          }
        }
      }
      if (this.ui.tooltip?.classList.contains("visible")) {
        const currentDot = this.ui.timelineBar?.querySelector(
          ".timeline-dot:hover, .timeline-dot:focus"
        );
        if (currentDot)
          this.refreshTooltipForDot(currentDot);
      }
    }
    applySharedStarredData(data) {
      if (!this.conversationId)
        return;
      const rawMessages = data?.messages?.[this.conversationId];
      const conversationMessages = Array.isArray(rawMessages) ? rawMessages : [];
      const nextSet = new Set(conversationMessages.map((message) => String(message.turnId)));
      this.applyStarredIdSet(nextSet);
    }
    async syncStarredFromService() {
      if (!this.conversationId)
        return;
      try {
        const messages = await StarredMessagesService.getStarredMessagesForConversation(
          this.conversationId
        );
        const nextSet = new Set(messages.map((message) => String(message.turnId)));
        this.applyStarredIdSet(nextSet);
      } catch (error) {
        console.warn("[Timeline] Failed to sync starred messages from shared storage:", error);
      }
    }
    getConversationTitle() {
      const getText = (el) => {
        const text = el?.textContent?.trim();
        return text && text.length > 0 ? text : null;
      };
      try {
        const selected = document.querySelector(
          ".gv-folder-conversation-selected .gv-conversation-title"
        );
        const title = getText(selected);
        if (title)
          return title;
      } catch (error) {
        console.debug("[Timeline] Failed to get title from selected folder conversation:", error);
      }
      const titleElement = document.querySelector("title");
      if (titleElement) {
        const title = titleElement.textContent?.trim();
        if (title && title !== "Gemini" && title !== "Google Gemini" && title !== "Google AI Studio" && !title.startsWith("Gemini -") && !title.startsWith("Google AI Studio -") && title.length > 0) {
          return title;
        }
      }
      try {
        const selectors = [
          // Gemini sidebar active conversation
          "mat-list-item.mdc-list-item--activated [mat-line]",
          'mat-list-item[aria-current="page"] [mat-line]',
          // AI Studio active conversation
          ".conversation-list-item.active .conversation-title",
          ".active-conversation .title"
        ];
        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent) {
            const text = element.textContent.trim();
            if (text && text.length > 0 && text !== "New chat") {
              return text;
            }
          }
        }
      } catch (error) {
        console.debug("[Timeline] Failed to get title from sidebar:", error);
      }
      const firstMarker = this.markers[0];
      if (firstMarker && firstMarker.summary) {
        const preview = firstMarker.summary.slice(0, 50);
        return preview.length < firstMarker.summary.length ? `${preview}...` : preview;
      }
      try {
        const urlPath = window.location.pathname;
        const match = urlPath.match(/\/app\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
          return `Conversation ${match[1].slice(0, 8)}...`;
        }
      } catch (error) {
        console.debug("[Timeline] Failed to extract from URL:", error);
      }
      return "Untitled Conversation";
    }
    waitForElement(selector, timeoutMs = 5e3) {
      return new Promise((resolve) => {
        const found = document.querySelector(selector);
        if (found)
          return resolve(found);
        const obs = new MutationObserver(() => {
          const el = document.querySelector(selector);
          if (el) {
            try {
              obs.disconnect();
            } catch {
            }
            resolve(el);
          }
        });
        try {
          obs.observe(document.body, { childList: true, subtree: true });
        } catch {
        }
        if (timeoutMs > 0) {
          setTimeout(() => {
            try {
              obs.disconnect();
            } catch {
            }
            resolve(null);
          }, timeoutMs);
        }
      });
    }
    waitForAnyElement(selectors, timeoutMs = 5e3) {
      return new Promise((resolve) => {
        for (const selector of selectors) {
          const found = document.querySelector(selector);
          if (found)
            return resolve({ element: found, selector });
        }
        const obs = new MutationObserver(() => {
          for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el) {
              try {
                obs.disconnect();
              } catch {
              }
              resolve({ element: el, selector });
              return;
            }
          }
        });
        try {
          obs.observe(document.body, { childList: true, subtree: true });
        } catch {
        }
        if (timeoutMs > 0) {
          setTimeout(() => {
            try {
              obs.disconnect();
            } catch {
            }
            resolve(null);
          }, timeoutMs);
        }
      });
    }
    getTimelineBars() {
      const bars = [];
      if (this.ui.timelineBar)
        bars.push(this.ui.timelineBar);
      if (this.ui.leftTimelineBar)
        bars.push(this.ui.leftTimelineBar);
      return bars;
    }
    async findCriticalElements() {
      const configured = this.getConfiguredUserTurnSelector();
      let userOverride = "";
      let autoDetected = "";
      try {
        userOverride = localStorage.getItem("geminiTimelineUserTurnSelector") || "";
        autoDetected = localStorage.getItem("geminiTimelineUserTurnSelectorAuto") || "";
      } catch {
      }
      const defaultCandidates = [
        // Angular-based Gemini UI user bubble (primary)
        ".user-query-bubble-with-background",
        // Angular containers (fallbacks if bubble selector changes)
        ".user-query-bubble-container",
        ".user-query-container",
        "user-query-content .user-query-bubble-with-background",
        // Attribute-based fallbacks for other Gemini variants
        'div[aria-label="User message"]',
        'article[data-author="user"]',
        'article[data-turn="user"]',
        '[data-message-author-role="user"]',
        'div[role="listitem"][data-user="true"]'
      ];
      let candidates = [...defaultCandidates];
      if (userOverride.length) {
        candidates = [userOverride, ...defaultCandidates.filter((s) => s !== userOverride)];
      } else {
        const cached = autoDetected || configured;
        if (cached && !candidates.includes(cached))
          candidates.push(cached);
      }
      let firstTurn = null;
      let matchedSelector = "";
      const found = await this.waitForAnyElement(candidates, 4e3);
      if (found) {
        firstTurn = found.element;
        matchedSelector = found.selector;
        this.userTurnSelector = matchedSelector;
      }
      if (!firstTurn) {
        this.conversationContainer = document.querySelector("main") || document.body;
        this.userTurnSelector = defaultCandidates.join(",");
      } else {
        const looksAngularUserQuery = /user-query/i.test(matchedSelector || "");
        if (userOverride && matchedSelector === userOverride || looksAngularUserQuery) {
          this.conversationContainer = document.querySelector("main") || document.body;
        } else {
          const parent = firstTurn.parentElement;
          if (!parent)
            return false;
          this.conversationContainer = parent;
        }
        if (!userOverride && matchedSelector) {
          try {
            localStorage.setItem("geminiTimelineUserTurnSelectorAuto", matchedSelector);
          } catch {
          }
        }
        if (userOverride && matchedSelector && matchedSelector !== userOverride) {
          try {
            localStorage.removeItem("geminiTimelineUserTurnSelector");
          } catch {
          }
        }
      }
      let p = firstTurn || this.conversationContainer;
      while (p && p !== document.body) {
        const st = getComputedStyle(p);
        if (st.overflowY === "auto" || st.overflowY === "scroll") {
          this.scrollContainer = p;
          break;
        }
        p = p.parentElement;
      }
      if (!this.scrollContainer)
        this.scrollContainer = document.scrollingElement || document.documentElement || document.body;
      return true;
    }
    getConfiguredUserTurnSelector() {
      try {
        const user = localStorage.getItem("geminiTimelineUserTurnSelector");
        if (user && typeof user === "string")
          return user;
        const auto = localStorage.getItem("geminiTimelineUserTurnSelectorAuto");
        return auto && typeof auto === "string" ? auto : "";
      } catch {
        return "";
      }
    }
    injectTimelineUI() {
      let bar = document.querySelector(".gemini-timeline-bar");
      if (!bar) {
        bar = document.createElement("div");
        bar.className = "gemini-timeline-bar";
        document.body.appendChild(bar);
      }
      this.ui.timelineBar = bar;
      let track = bar.querySelector(".timeline-track");
      if (!track) {
        track = document.createElement("div");
        track.className = "timeline-track";
        bar.appendChild(track);
      }
      let content = track.querySelector(".timeline-track-content");
      if (!content) {
        content = document.createElement("div");
        content.className = "timeline-track-content";
        track.appendChild(content);
      }
      this.ui.track = track;
      this.ui.trackContent = content;
      let slider = document.querySelector(".timeline-left-slider");
      if (!slider) {
        slider = document.createElement("div");
        slider.className = "timeline-left-slider";
        const handle = document.createElement("div");
        handle.className = "timeline-left-handle";
        slider.appendChild(handle);
        document.body.appendChild(slider);
      }
      this.ui.slider = slider;
      this.ui.sliderHandle = slider.querySelector(".timeline-left-handle");
      if (!this.ui.tooltip) {
        const tip = document.createElement("div");
        tip.className = "timeline-tooltip";
        tip.id = "gemini-timeline-tooltip";
        document.body.appendChild(tip);
        this.ui.tooltip = tip;
        if (!this.measureEl) {
          const m = document.createElement("div");
          m.setAttribute("aria-hidden", "true");
          Object.assign(m.style, {
            position: "fixed",
            left: "-9999px",
            top: "0",
            visibility: "hidden",
            pointerEvents: "none"
          });
          const cs = getComputedStyle(tip);
          Object.assign(m.style, {
            backgroundColor: cs.backgroundColor,
            color: cs.color,
            fontFamily: cs.fontFamily,
            fontSize: cs.fontSize,
            lineHeight: cs.lineHeight,
            padding: cs.padding,
            border: cs.border,
            borderRadius: cs.borderRadius,
            whiteSpace: "normal",
            wordBreak: "break-word",
            maxWidth: "none",
            display: "block"
          });
          document.body.appendChild(m);
          this.measureEl = m;
        }
        if (!this.measureCanvas) {
          this.measureCanvas = document.createElement("canvas");
          this.measureCtx = this.measureCanvas.getContext("2d");
        }
      }
      if (!this.previewPanel && this.ui.timelineBar) {
        this.previewPanel = new TimelinePreviewPanel(this.ui.timelineBar);
        this.previewPanel.init(
          (turnId, index) => {
            const marker = this.markers[index];
            if (!marker?.element)
              return;
            const fromIdx = this.getActiveIndex();
            const dur = this.computeFlowDuration(fromIdx, index);
            if (this.scrollMode === "flow" && fromIdx >= 0 && index >= 0 && fromIdx !== index) {
              this.activeTurnId = null;
              this.updateActiveDotUI();
              this.startRunner(fromIdx, index, dur);
            }
            this.smoothScrollTo(marker.element, dur);
          },
          (query) => this.highlightSearchInDOM(query)
        );
      }
    }
    updateIntersectionObserverTargets() {
      if (!this.intersectionObserver || !this.conversationContainer || !this.userTurnSelector)
        return;
      this.intersectionObserver.disconnect();
      this.visibleUserTurns.clear();
      const nodeList = this.conversationContainer.querySelectorAll(this.userTurnSelector);
      const topLevel = this.filterTopLevel(Array.from(nodeList));
      topLevel.forEach((el) => this.intersectionObserver.observe(el));
    }
    normalizeText(text) {
      try {
        if (!text)
          return "";
        const collapsed = String(text).replace(/\s+/g, " ").trim();
        return collapsed.replace(TURN_LABEL_PREFIXES, "");
      } catch {
        return "";
      }
    }
    /**
     * Performance-optimized filter to remove nested elements.
     * Sorts elements by depth first, which can prune the search space in the average case.
     * Worst-case complexity: O(n²), but average case is improved over naive implementation.
     */
    filterTopLevel(elements) {
      const arr = elements.map((e) => e);
      if (arr.length === 0)
        return arr;
      const descendants = /* @__PURE__ */ new Set();
      const sorted = arr.slice().sort((a, b) => {
        let aDepth = 0, bDepth = 0;
        let node = a;
        while (node.parentElement) {
          aDepth++;
          node = node.parentElement;
        }
        node = b;
        while (node.parentElement) {
          bDepth++;
          node = node.parentElement;
        }
        return aDepth - bDepth;
      });
      for (let i = 0; i < sorted.length; i++) {
        const el = sorted[i];
        for (let j = 0; j < i; j++) {
          if (sorted[j].contains(el)) {
            descendants.add(el);
            break;
          }
        }
      }
      return arr.filter((el) => !descendants.has(el));
    }
    /**
     * Performance-optimized deduplication with cached text normalization
     */
    dedupeByTextAndOffset(elements, firstTurnOffset) {
      const seen = /* @__PURE__ */ new Set();
      const out = [];
      const normalizedCache = /* @__PURE__ */ new Map();
      for (const el of elements) {
        let normalizedText = normalizedCache.get(el);
        if (normalizedText === void 0) {
          normalizedText = this.normalizeText(el.textContent || "");
          normalizedCache.set(el, normalizedText);
        }
        const offsetFromStart = (el.offsetTop || 0) - firstTurnOffset;
        const key = `${normalizedText}|${Math.round(offsetFromStart)}`;
        if (seen.has(key))
          continue;
        seen.add(key);
        out.push(el);
      }
      return out;
    }
    getCSSVarNumber(el, name, fallback) {
      const v = getComputedStyle(el).getPropertyValue(name).trim();
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : fallback;
    }
    getTrackPadding() {
      return this.ui.timelineBar ? this.getCSSVarNumber(this.ui.timelineBar, "--timeline-track-padding", 12) : 12;
    }
    getMinGap() {
      return this.ui.timelineBar ? this.getCSSVarNumber(this.ui.timelineBar, "--timeline-min-gap", 12) : 12;
    }
    ensureTurnId(el, index) {
      const asEl = el;
      let id = asEl.dataset && asEl.dataset.turnId || "";
      if (!id) {
        const basis = this.normalizeText(asEl.textContent || "") || `user-${index}`;
        id = `u-${hashString(basis)}`;
        try {
          asEl.dataset.turnId = id;
        } catch {
        }
      }
      return id;
    }
    detectCssVarTopSupport(pad, usableC) {
      try {
        const test = document.createElement("button");
        test.className = "timeline-dot";
        test.style.visibility = "hidden";
        test.setAttribute("aria-hidden", "true");
        test.style.setProperty("--n", "0.5");
        this.ui.trackContent.appendChild(test);
        const cs = getComputedStyle(test);
        const px = parseFloat(cs.top || "");
        test.remove();
        const expected = pad + 0.5 * usableC;
        return Number.isFinite(px) && Math.abs(px - expected) <= 2;
      } catch {
        return false;
      }
    }
    updateTimelineGeometry() {
      if (!this.ui.timelineBar || !this.ui.trackContent)
        return;
      const H = this.ui.timelineBar.clientHeight || 0;
      const pad = this.getTrackPadding();
      const minGap = this.getMinGap();
      const N = this.markers.length;
      const hiddenIndices = this.getHiddenMarkerIndices();
      const visibleCount = N - hiddenIndices.size;
      const desired = Math.max(
        H,
        visibleCount > 0 ? 2 * pad + Math.max(0, visibleCount - 1) * minGap : H
      );
      this.contentHeight = Math.ceil(desired);
      this.scale = H > 0 ? this.contentHeight / H : 1;
      this.ui.trackContent.style.height = `${this.contentHeight}px`;
      const usableC = Math.max(1, this.contentHeight - 2 * pad);
      const { desiredY } = this.calculateCollapsedPositions(hiddenIndices, pad, usableC);
      const gapMultipliers = new Array(N).fill(1);
      const adjusted = this.applyMinGapWithHidden(
        desiredY,
        pad,
        pad + usableC,
        minGap,
        hiddenIndices,
        gapMultipliers
      );
      this.yPositions = adjusted;
      for (let i = 0; i < N; i++) {
        if (hiddenIndices.has(i)) {
          this.markers[i].n = -1;
          continue;
        }
        const top = adjusted[i];
        const n = (top - pad) / usableC;
        this.markers[i].n = Math.max(0, Math.min(1, n));
        const dot = this.markers[i].dotElement;
        if (dot && !this.usePixelTop) {
          dot.style.setProperty("--n", String(this.markers[i].n));
        }
      }
      if (this._cssVarTopSupported === null) {
        this._cssVarTopSupported = this.detectCssVarTopSupport(pad, usableC);
        this.usePixelTop = !this._cssVarTopSupported;
      }
      this.updateSlider();
      const barH = this.ui.timelineBar.clientHeight || 0;
      this.sliderAlwaysVisible = this.contentHeight > barH + 1;
      if (this.sliderAlwaysVisible)
        this.showSlider();
    }
    /* Apply minimum gap between visible markers, skipping hidden ones */
    applyMinGapWithHidden(positions, minTop, maxTop, gap, hiddenIndices, gapMultipliers) {
      const n = positions.length;
      if (n === 0)
        return positions;
      const out = positions.slice();
      let prevVisibleIdx = -1;
      for (let i = 0; i < n; i++) {
        if (hiddenIndices.has(i))
          continue;
        if (prevVisibleIdx === -1) {
          out[i] = Math.max(minTop, Math.min(positions[i], maxTop));
        } else {
          const currentGap = gap * gapMultipliers[i];
          const minAllowed = out[prevVisibleIdx] + currentGap;
          out[i] = Math.max(positions[i], minAllowed);
        }
        prevVisibleIdx = i;
      }
      let lastVisibleIdx = -1;
      for (let i = n - 1; i >= 0; i--) {
        if (!hiddenIndices.has(i)) {
          lastVisibleIdx = i;
          break;
        }
      }
      if (lastVisibleIdx >= 0 && out[lastVisibleIdx] > maxTop) {
        out[lastVisibleIdx] = maxTop;
        let nextVisibleIdx = lastVisibleIdx;
        for (let i = lastVisibleIdx - 1; i >= 0; i--) {
          if (hiddenIndices.has(i))
            continue;
          const currentGap = gap * gapMultipliers[nextVisibleIdx];
          const maxAllowed = out[nextVisibleIdx] - currentGap;
          out[i] = Math.min(out[i], maxAllowed);
          nextVisibleIdx = i;
        }
      }
      for (let i = 0; i < n; i++) {
        if (hiddenIndices.has(i))
          continue;
        if (out[i] < minTop)
          out[i] = minTop;
        if (out[i] > maxTop)
          out[i] = maxTop;
      }
      return out;
    }
    applyMinGap(positions, minTop, maxTop, gap) {
      const n = positions.length;
      if (n === 0)
        return positions;
      const out = positions.slice();
      out[0] = Math.max(minTop, Math.min(positions[0], maxTop));
      for (let i = 1; i < n; i++) {
        const minAllowed = out[i - 1] + gap;
        out[i] = Math.max(positions[i], minAllowed);
      }
      if (out[n - 1] > maxTop) {
        out[n - 1] = maxTop;
        for (let i = n - 2; i >= 0; i--) {
          const maxAllowed = out[i + 1] - gap;
          out[i] = Math.min(out[i], maxAllowed);
        }
        if (out[0] < minTop) {
          out[0] = minTop;
          for (let i = 1; i < n; i++) {
            const minAllowed = out[i - 1] + gap;
            out[i] = Math.max(out[i], minAllowed);
          }
        }
      }
      for (let i = 0; i < n; i++) {
        if (out[i] < minTop)
          out[i] = minTop;
        if (out[i] > maxTop)
          out[i] = maxTop;
      }
      return out;
    }
    recalculateAndRenderMarkers = () => {
      if (!this.conversationContainer || !this.ui.timelineBar || !this.scrollContainer || !this.userTurnSelector)
        return;
      const userTurnNodeList = this.conversationContainer.querySelectorAll(this.userTurnSelector);
      this.visibleRange = { start: 0, end: -1 };
      if (userTurnNodeList.length === 0) {
        if (!this.zeroTurnsTimer) {
          this.zeroTurnsTimer = window.setTimeout(() => {
            this.zeroTurnsTimer = null;
            this.recalculateAndRenderMarkers();
          }, 200);
        }
        return;
      }
      if (this.zeroTurnsTimer) {
        clearTimeout(this.zeroTurnsTimer);
        this.zeroTurnsTimer = null;
      }
      (this.ui.trackContent || this.ui.timelineBar).querySelectorAll(".timeline-dot").forEach((n) => n.remove());
      let allEls = Array.from(userTurnNodeList);
      allEls = this.filterTopLevel(allEls);
      if (allEls.length === 0)
        return;
      const firstTurnOffset = allEls[0].offsetTop;
      allEls = this.dedupeByTextAndOffset(allEls, firstTurnOffset);
      this.markerTops = this.computeElementTopsInScrollContainer(allEls);
      let contentSpan;
      if (allEls.length < 2) {
        contentSpan = 1;
      } else {
        const lastTurnOffset = allEls[allEls.length - 1].offsetTop;
        contentSpan = lastTurnOffset - firstTurnOffset;
      }
      if (contentSpan <= 0)
        contentSpan = 1;
      this.firstUserTurnOffset = firstTurnOffset;
      this.contentSpanPx = contentSpan;
      this.markerMap.clear();
      this.markers = Array.from(allEls).map((el, idx) => {
        const element = el;
        const offsetFromStart = element.offsetTop - firstTurnOffset;
        let n = offsetFromStart / contentSpan;
        n = Math.max(0, Math.min(1, n));
        const id = this.ensureTurnId(element, idx);
        const m = {
          id,
          element,
          summary: this.normalizeText(element.textContent || ""),
          n,
          baseN: n,
          dotElement: null,
          starred: this.starred.has(id)
        };
        this.markerMap.set(id, m);
        return m;
      });
      this.markersVersion++;
      this.updateTimelineGeometry();
      if (!this.activeTurnId && this.markers.length > 0)
        this.activeTurnId = this.markers[this.markers.length - 1].id;
      this.updateIntersectionObserverTargetsFromMarkers();
      this.syncTimelineTrackToMain();
      this.updateVirtualRangeAndRender();
      this.updateActiveDotUI();
      this.scheduleScrollSync();
      this.previewPanel?.updateMarkers(
        this.markers.map((m, i) => ({ id: m.id, summary: m.summary, index: i, starred: m.starred }))
      );
    };
    setupObservers() {
      this.mutationObserver = new MutationObserver(() => {
        this.debouncedRecalc();
      });
      if (this.conversationContainer)
        this.mutationObserver.observe(this.conversationContainer, { childList: true, subtree: true });
      this.resizeObserver = new ResizeObserver(() => {
        this.updateTimelineGeometry();
        this.syncTimelineTrackToMain();
        this.updateVirtualRangeAndRender();
      });
      if (this.ui.timelineBar)
        this.resizeObserver.observe(this.ui.timelineBar);
      this.intersectionObserver = new IntersectionObserver(
        () => {
          this.scheduleScrollSync();
        },
        { root: this.scrollContainer, threshold: 0.1, rootMargin: "-40% 0px -59% 0px" }
      );
    }
    setupEventListeners() {
      this.onTimelineBarClick = (e) => {
        const dot = e.target.closest(".timeline-dot");
        if (!dot)
          return;
        const now = Date.now();
        if (now < (this.suppressClickUntil || 0)) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        const indexStr = dot.dataset.markerIndex;
        let targetElement = null;
        let toIdx = -1;
        if (indexStr) {
          toIdx = parseInt(indexStr, 10);
          const marker = this.markers[toIdx];
          if (marker) {
            targetElement = marker.element;
          }
        }
        if (!targetElement) {
          const targetId = dot.dataset.targetTurnId;
          targetElement = this.conversationContainer.querySelector(
            `[data-turn-id="${targetId}"]`
          ) || this.markers.find((m) => m.id === targetId)?.element || null;
          toIdx = this.markers.findIndex((m) => m.id === targetId);
        }
        if (targetElement) {
          const fromIdx = this.getActiveIndex();
          const dur = this.computeFlowDuration(fromIdx, toIdx);
          if (this.scrollMode === "flow" && fromIdx >= 0 && toIdx >= 0 && fromIdx !== toIdx) {
            this.activeTurnId = null;
            this.updateActiveDotUI();
            this.startRunner(fromIdx, toIdx, dur);
          }
          this.smoothScrollTo(targetElement, dur);
        }
      };
      this.ui.timelineBar.addEventListener("click", this.onTimelineBarClick);
      this.onScroll = () => this.scheduleScrollSync();
      this.scrollContainer.addEventListener("scroll", this.onScroll, { passive: true });
      this.onTimelineWheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY || 0;
        this.scrollContainer.scrollTop += delta;
        this.scheduleScrollSync();
        this.showSlider();
      };
      this.ui.timelineBar.addEventListener("wheel", this.onTimelineWheel, { passive: false });
      this.onTimelineBarOver = (e) => {
        const dot = e.target.closest(".timeline-dot");
        if (dot)
          this.showTooltipForDot(dot);
      };
      this.onTimelineBarOut = (e) => {
        const fromDot = e.target.closest(".timeline-dot");
        const toDot = e.relatedTarget?.closest?.(".timeline-dot");
        if (fromDot && !toDot)
          this.hideTooltip();
      };
      this.ui.timelineBar.addEventListener("mouseover", this.onTimelineBarOver);
      this.ui.timelineBar.addEventListener("mouseout", this.onTimelineBarOut);
      this.onContextMenu = (ev) => {
        if (!this.markerLevelEnabled)
          return;
        const dot = ev.target.closest(".timeline-dot");
        if (!dot)
          return;
        ev.preventDefault();
        ev.stopPropagation();
        this.showContextMenu(dot, ev.clientX, ev.clientY);
      };
      this.ui.timelineBar.addEventListener("contextmenu", this.onContextMenu);
      this.onDocumentClick = (ev) => {
        if (this.contextMenu && !this.contextMenu.contains(ev.target)) {
          this.hideContextMenu();
        }
      };
      document.addEventListener("click", this.onDocumentClick);
      this.onPointerDown = (ev) => {
        const dot = ev.target.closest(".timeline-dot");
        if (!dot)
          return;
        if (typeof ev.button === "number" && ev.button !== 0)
          return;
        this.cancelLongPress();
        this.pressTargetDot = dot;
        this.pressStartPos = { x: ev.clientX, y: ev.clientY };
        dot.classList.add("holding");
        this.longPressTriggered = false;
        this.longPressTimer = window.setTimeout(() => {
          this.longPressTimer = null;
          if (!this.pressTargetDot)
            return;
          const id = this.pressTargetDot.dataset.targetTurnId;
          this.toggleStar(id);
          this.longPressTriggered = true;
          this.suppressClickUntil = Date.now() + 350;
          this.refreshTooltipForDot(this.pressTargetDot);
          this.pressTargetDot.classList.remove("holding");
        }, this.longPressDuration);
      };
      this.onPointerMove = (ev) => {
        if (!this.pressTargetDot || !this.pressStartPos)
          return;
        const dx = ev.clientX - this.pressStartPos.x;
        const dy = ev.clientY - this.pressStartPos.y;
        if (dx * dx + dy * dy > this.longPressMoveTolerance * this.longPressMoveTolerance)
          this.cancelLongPress();
      };
      this.onPointerUp = () => this.cancelLongPress();
      this.onPointerCancel = () => this.cancelLongPress();
      this.onPointerLeave = (ev) => {
        const dot = ev.target.closest(".timeline-dot");
        if (dot && dot === this.pressTargetDot)
          this.cancelLongPress();
      };
      this.ui.timelineBar.addEventListener("pointerdown", this.onPointerDown);
      window.addEventListener("pointermove", this.onPointerMove, { passive: true });
      window.addEventListener("pointerup", this.onPointerUp, { passive: true });
      window.addEventListener("pointercancel", this.onPointerCancel, { passive: true });
      this.ui.timelineBar.addEventListener("pointerleave", this.onPointerLeave);
      this.onWindowResize = () => {
        if (this.ui.tooltip?.classList.contains("visible")) {
          const activeDot = this.ui.timelineBar.querySelector(
            ".timeline-dot:hover, .timeline-dot:focus"
          );
          if (activeDot)
            this.refreshTooltipForDot(activeDot);
        }
        this.updateTimelineGeometry();
        this.syncTimelineTrackToMain();
        this.updateVirtualRangeAndRender();
        this.reapplyPosition();
      };
      window.addEventListener("resize", this.onWindowResize);
      if (window.visualViewport) {
        this.onVisualViewportResize = () => {
          this.updateTimelineGeometry();
          this.syncTimelineTrackToMain();
          this.updateVirtualRangeAndRender();
          this.reapplyPosition();
        };
        window.visualViewport.addEventListener("resize", this.onVisualViewportResize);
      }
      this.onSliderDown = (ev) => {
        if (!this.ui.sliderHandle)
          return;
        try {
          this.ui.sliderHandle.setPointerCapture(ev.pointerId);
        } catch {
        }
        this.sliderDragging = true;
        this.showSlider();
        this.sliderStartClientY = ev.clientY;
        const rect = this.ui.sliderHandle.getBoundingClientRect();
        this.sliderStartTop = rect.top;
        this.onSliderMove = (e) => this.handleSliderDrag(e);
        this.onSliderUp = (e) => this.endSliderDrag(e);
        window.addEventListener("pointermove", this.onSliderMove);
        window.addEventListener("pointerup", this.onSliderUp, { once: true });
      };
      this.ui.sliderHandle?.addEventListener("pointerdown", this.onSliderDown);
      this.onBarEnter = () => this.showSlider();
      this.onBarLeave = () => this.hideSliderDeferred();
      this.onSliderEnter = () => this.showSlider();
      this.onSliderLeave = () => this.hideSliderDeferred();
      this.ui.timelineBar.addEventListener("pointerenter", this.onBarEnter);
      this.ui.timelineBar.addEventListener("pointerleave", this.onBarLeave);
      this.ui.slider?.addEventListener("pointerenter", this.onSliderEnter);
      this.ui.slider?.addEventListener("pointerleave", this.onSliderLeave);
      this.onBarPointerDown = (ev) => {
        if (ev.target.closest(".timeline-dot, .timeline-thumb")) {
          return;
        }
        this.barDragging = true;
        this.barStartPos = { x: ev.clientX, y: ev.clientY };
        const rect = this.ui.timelineBar.getBoundingClientRect();
        this.barStartOffset = { x: rect.left, y: rect.top };
        this.ui.timelineBar.setPointerCapture(ev.pointerId);
        this.onBarPointerMove = (e) => this.handleBarDrag(e);
        this.onBarPointerUp = (e) => this.endBarDrag(e);
        window.addEventListener("pointermove", this.onBarPointerMove);
        window.addEventListener("pointerup", this.onBarPointerUp, { once: true });
      };
      this.onStorage = (e) => {
        if (!e || e.storageArea !== localStorage)
          return;
        const expectedKey = this.getStarsStorageKey();
        if (!expectedKey || e.key !== expectedKey)
          return;
        let nextArr = [];
        try {
          nextArr = JSON.parse(e.newValue || "[]") || [];
        } catch {
          nextArr = [];
        }
        const nextSet = new Set(nextArr.map(String));
        this.applyStarredIdSet(nextSet, false);
      };
      window.addEventListener("storage", this.onStorage);
      if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
        this.onChromeStorageChanged = (changes, areaName) => {
          if (areaName !== "local")
            return;
          const starredChange = changes[StorageKeys.TIMELINE_STARRED_MESSAGES];
          if (!starredChange)
            return;
          this.applySharedStarredData(starredChange.newValue);
        };
        chrome.storage.onChanged.addListener(this.onChromeStorageChanged);
      }
      this.eventBusUnsubscribers.push(
        eventBus.on("starred:removed", ({ conversationId, turnId }) => {
          if (conversationId !== this.conversationId)
            return;
          if (this.starred.has(turnId)) {
            this.starred.delete(turnId);
            this.saveStars();
            const marker = this.markerMap.get(turnId);
            if (marker && marker.dotElement) {
              marker.starred = false;
              marker.dotElement.classList.remove("starred");
              marker.dotElement.setAttribute("aria-pressed", "false");
            }
            console.log("[Timeline] Starred removed via EventBus:", turnId);
          }
        })
      );
      this.eventBusUnsubscribers.push(
        eventBus.on("starred:added", ({ conversationId, turnId }) => {
          if (conversationId !== this.conversationId)
            return;
          if (!this.starred.has(turnId)) {
            this.starred.add(turnId);
            this.saveStars();
            const marker = this.markerMap.get(turnId);
            if (marker && marker.dotElement) {
              marker.starred = true;
              marker.dotElement.classList.add("starred");
              marker.dotElement.setAttribute("aria-pressed", "true");
            }
            console.log("[Timeline] Starred added via EventBus:", turnId);
          }
        })
      );
    }
    smoothScrollTo(targetElement, duration = 600) {
      const containerRect = this.scrollContainer.getBoundingClientRect();
      const targetRect = targetElement.getBoundingClientRect();
      const targetPosition = targetRect.top - containerRect.top + this.scrollContainer.scrollTop;
      const startPosition = this.scrollContainer.scrollTop;
      const distance = targetPosition - startPosition;
      let startTime = null;
      if (this.scrollMode === "jump") {
        this.scrollContainer.scrollTop = targetPosition;
        return;
      }
      const animation = (currentTime) => {
        this.isScrolling = true;
        if (startTime === null)
          startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        const run = this.easeInOutQuad(timeElapsed, startPosition, distance, duration);
        this.scrollContainer.scrollTop = run;
        if (timeElapsed < duration) {
          requestAnimationFrame(animation);
        } else {
          this.scrollContainer.scrollTop = targetPosition;
          this.isScrolling = false;
        }
      };
      requestAnimationFrame(animation);
    }
    easeInOutQuad(t, b, c, d) {
      const spring = (() => {
        try {
          return localStorage.getItem("geminiTimelineSpring") || "ios";
        } catch {
          return "ios";
        }
      })();
      const clamp = (x) => Math.max(0, Math.min(1, x));
      const u = clamp(t / d);
      if (spring === "snappy") {
        const s2 = 1.15;
        const x = u < 0.6 ? u / 0.6 : 1 + (0.6 - u) * 0.15;
        return b + c * clamp(x * s2 - (s2 - 1));
      }
      if (spring === "gentle") {
        return b + c * (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
      }
      const k1 = 0.42, k2 = 0.58;
      const s = u * u * (3 - 2 * u);
      const mix = (a, b2, m) => a + (b2 - a) * m;
      const shaped = mix(Math.pow(u, k1), Math.pow(u, k2), 0.5) * 0.15 + s * 0.85;
      return b + c * clamp(shaped);
    }
    updateActiveDotUI() {
      this.markers.forEach((marker) => {
        marker.dotElement?.classList.toggle("active", marker.id === this.activeTurnId);
      });
      this.previewPanel?.updateActiveTurn(this.activeTurnId);
    }
    static SEARCH_HIGHLIGHT_CLASS = "timeline-search-highlight";
    clearSearchHighlights() {
      const cls = _TimelineManager.SEARCH_HIGHLIGHT_CLASS;
      const marks = this.conversationContainer?.querySelectorAll(`mark.${cls}`);
      if (!marks)
        return;
      marks.forEach((mark) => {
        const parent = mark.parentNode;
        if (!parent)
          return;
        parent.replaceChild(document.createTextNode(mark.textContent || ""), mark);
        parent.normalize();
      });
    }
    highlightSearchInDOM(query) {
      this.clearSearchHighlights();
      if (!query || !this.conversationContainer)
        return;
      const lowerQuery = query.toLowerCase();
      for (const marker of this.markers) {
        if (!marker.element)
          continue;
        const walker = document.createTreeWalker(marker.element, NodeFilter.SHOW_TEXT);
        const matches = [];
        let node;
        while (node = walker.nextNode()) {
          const idx = node.textContent?.toLowerCase().indexOf(lowerQuery) ?? -1;
          if (idx !== -1)
            matches.push({ node, index: idx });
        }
        for (let i = matches.length - 1; i >= 0; i--) {
          const { node: textNode, index: matchIdx } = matches[i];
          const after = textNode.splitText(matchIdx + query.length);
          const matchText = textNode.splitText(matchIdx);
          const mark = document.createElement("mark");
          mark.className = _TimelineManager.SEARCH_HIGHLIGHT_CLASS;
          mark.textContent = matchText.textContent;
          matchText.parentNode.replaceChild(mark, matchText);
        }
      }
    }
    /**
     * Optimized debounce delay: reduced from 350ms to 200ms for better responsiveness
     * while still preventing excessive recalculations during rapid DOM changes
     */
    debouncedRecalc = this.debounce(() => this.recalculateAndRenderMarkers(), 200);
    debounce(func, delay) {
      let timeout = null;
      return (...args) => {
        if (timeout)
          clearTimeout(timeout);
        timeout = window.setTimeout(() => func.apply(this, args), delay);
      };
    }
    getActiveIndex() {
      if (!this.activeTurnId)
        return -1;
      return this.markers.findIndex((m) => m.id === this.activeTurnId);
    }
    getFlowDurationMs() {
      try {
        const d = parseInt(localStorage.getItem("geminiTimelineFlowDurationMs") || "650", 10);
        return Math.max(300, Math.min(1800, Number.isFinite(d) ? d : 650));
      } catch {
        return 650;
      }
    }
    computeFlowDuration(fromIdx, toIdx) {
      const base = this.getFlowDurationMs();
      if (fromIdx < 0 || toIdx < 0)
        return base;
      const span = Math.abs(this.yPositions[toIdx] - this.yPositions[fromIdx]);
      const H = Math.max(1, this.ui.timelineBar?.clientHeight || 1);
      const scale = Math.max(0.6, Math.min(1.6, span / H));
      return Math.round(base * scale);
    }
    ensureRunnerRing() {
      if (!this.ui.trackContent)
        return;
      if (!this.runnerRing) {
        const ring = document.createElement("div");
        ring.className = "timeline-runner-ring";
        Object.assign(ring.style, {
          position: "absolute",
          left: "50%",
          width: "20px",
          height: "20px",
          transform: "translate(-50%, -50%)",
          borderRadius: "9999px",
          boxShadow: "0 0 0 2px var(--timeline-dot-active-color), 0 0 12px rgba(59,130,246,.45)",
          background: "transparent",
          pointerEvents: "none",
          zIndex: "4",
          opacity: "0",
          transition: "opacity 120ms ease"
        });
        this.ui.trackContent.appendChild(ring);
        this.runnerRing = ring;
      }
    }
    startRunner(fromIdx, toIdx, duration) {
      this.ensureRunnerRing();
      if (!this.runnerRing)
        return;
      const y1 = Math.round(this.yPositions[fromIdx]);
      const y2 = Math.round(this.yPositions[toIdx]);
      const t0 = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
      this.runnerRing.style.opacity = "1";
      const animate = () => {
        const now = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
        const t = Math.min(1, (now - t0) / Math.max(1, duration));
        const spring = (() => {
          try {
            return localStorage.getItem("geminiTimelineSpring") || "ios";
          } catch {
            return "ios";
          }
        })();
        let eased;
        if (spring === "snappy")
          eased = Math.min(1, t + 0.08 * Math.sin(t * 8));
        else if (spring === "gentle")
          eased = t * t * (3 - 2 * t);
        else
          eased = t * t * (3 - 2 * t) * 0.85 + t * 0.15;
        const y = Math.round(y1 + (y2 - y1) * eased);
        if (this.runnerRing) {
          this.runnerRing.style.top = `${y}px`;
        }
        if (t < 1) {
          this.flowAnimating = true;
          requestAnimationFrame(animate);
        } else {
          this.flowAnimating = false;
          if (this.runnerRing) {
            this.runnerRing.style.opacity = "0";
          }
        }
      };
      animate();
    }
    truncateToThreeLines(text, targetWidth) {
      if (!this.measureEl || !this.ui.tooltip)
        return { text, height: 0 };
      const tip = this.ui.tooltip;
      const lineH = this.getCSSVarNumber(tip, "--timeline-tooltip-lh", 18);
      const padY = this.getCSSVarNumber(tip, "--timeline-tooltip-pad-y", 10);
      const borderW = this.getCSSVarNumber(tip, "--timeline-tooltip-border-w", 1);
      const maxH = Math.round(3 * lineH + 2 * padY + 2 * borderW);
      const ell = "\u2026";
      const el = this.measureEl;
      el.style.width = `${Math.max(0, Math.floor(targetWidth))}px`;
      el.textContent = String(text || "").replace(/\s+/g, " ").trim();
      let h = el.offsetHeight;
      if (h <= maxH)
        return { text: el.textContent, height: h };
      const raw = el.textContent;
      let lo = 0, hi = raw.length, ans = 0;
      while (lo <= hi) {
        const mid = lo + hi >> 1;
        el.textContent = raw.slice(0, mid).trimEnd() + ell;
        h = el.offsetHeight;
        if (h <= maxH) {
          ans = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      const out = ans >= raw.length ? raw : raw.slice(0, ans).trimEnd() + ell;
      el.textContent = out;
      h = el.offsetHeight;
      return { text: out, height: Math.min(h, maxH) };
    }
    computePlacementInfo(dot) {
      const tip = this.ui.tooltip || document.body;
      const dotRect = dot.getBoundingClientRect();
      const vw = window.innerWidth;
      const arrowOut = this.getCSSVarNumber(tip, "--timeline-tooltip-arrow-outside", 6);
      const baseGap = this.getCSSVarNumber(tip, "--timeline-tooltip-gap-visual", 12);
      const boxGap = this.getCSSVarNumber(tip, "--timeline-tooltip-gap-box", 8);
      const gap = baseGap + Math.max(0, arrowOut) + Math.max(0, boxGap);
      const viewportPad = 8;
      const maxW = this.getCSSVarNumber(tip, "--timeline-tooltip-max", 288);
      const minW = 160;
      const leftAvail = Math.max(0, dotRect.left - gap - viewportPad);
      const rightAvail = Math.max(0, vw - dotRect.right - gap - viewportPad);
      let placement = rightAvail > leftAvail ? "right" : "left";
      let avail = placement === "right" ? rightAvail : leftAvail;
      const tiers = [280, 240, 200, 160];
      const hardMax = Math.max(minW, Math.min(maxW, Math.floor(avail)));
      let width = tiers.find((t) => t <= hardMax) || Math.max(minW, Math.min(hardMax, 160));
      if (width < minW && placement === "left" && rightAvail > leftAvail) {
        placement = "right";
        avail = rightAvail;
        const hardMax2 = Math.max(minW, Math.min(maxW, Math.floor(avail)));
        width = tiers.find((t) => t <= hardMax2) || Math.max(120, Math.min(hardMax2, minW));
      } else if (width < minW && placement === "right" && leftAvail >= rightAvail) {
        placement = "left";
        avail = leftAvail;
        const hardMax2 = Math.max(minW, Math.min(maxW, Math.floor(avail)));
        width = tiers.find((t) => t <= hardMax2) || Math.max(120, Math.min(hardMax2, minW));
      }
      width = Math.max(120, Math.min(width, maxW));
      return { placement, width };
    }
    showTooltipForDot(dot) {
      if (!this.ui.tooltip)
        return;
      if (this.previewPanel?.isOpen)
        return;
      if (this.tooltipHideTimer) {
        clearTimeout(this.tooltipHideTimer);
        this.tooltipHideTimer = null;
      }
      const tip = this.ui.tooltip;
      tip.classList.remove("visible");
      let fullText = (dot.getAttribute("aria-label") || "").trim();
      const id = dot.dataset.targetTurnId;
      if (id && this.starred.has(id))
        fullText = `\u2605 ${fullText}`;
      const p = this.computePlacementInfo(dot);
      const layout = this.truncateToThreeLines(fullText, p.width);
      tip.textContent = layout.text;
      this.placeTooltipAt(dot, p.placement, p.width, layout.height);
      tip.setAttribute("aria-hidden", "false");
      if (this.showRafId !== null) {
        cancelAnimationFrame(this.showRafId);
        this.showRafId = null;
      }
      this.showRafId = requestAnimationFrame(() => {
        this.showRafId = null;
        tip.classList.add("visible");
      });
    }
    placeTooltipAt(dot, placement, width, height) {
      if (!this.ui.tooltip)
        return;
      const tip = this.ui.tooltip;
      const dotRect = dot.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const arrowOut = this.getCSSVarNumber(tip, "--timeline-tooltip-arrow-outside", 6);
      const baseGap = this.getCSSVarNumber(tip, "--timeline-tooltip-gap-visual", 12);
      const boxGap = this.getCSSVarNumber(tip, "--timeline-tooltip-gap-box", 8);
      const gap = baseGap + Math.max(0, arrowOut) + Math.max(0, boxGap);
      const viewportPad = 8;
      let left;
      if (placement === "left") {
        left = Math.round(dotRect.left - gap - width);
        if (left < viewportPad) {
          const altLeft = Math.round(dotRect.right + gap);
          if (altLeft + width <= vw - viewportPad) {
            placement = "right";
            left = altLeft;
          } else {
            const fitWidth = Math.max(120, vw - viewportPad - altLeft);
            left = altLeft;
            width = fitWidth;
          }
        }
      } else {
        left = Math.round(dotRect.right + gap);
        if (left + width > vw - viewportPad) {
          const altLeft = Math.round(dotRect.left - gap - width);
          if (altLeft >= viewportPad) {
            placement = "left";
            left = altLeft;
          } else {
            const fitWidth = Math.max(120, vw - viewportPad - left);
            width = fitWidth;
          }
        }
      }
      tip.style.width = `${Math.floor(width)}px`;
      const autoH = !height || height <= 0 ? tip.offsetHeight : height;
      let top = Math.round(dotRect.top + dotRect.height / 2 - autoH / 2);
      top = Math.max(viewportPad, Math.min(vh - height - viewportPad, top));
      tip.style.left = `${left}px`;
      tip.style.top = `${top}px`;
      tip.setAttribute("data-placement", placement);
    }
    refreshTooltipForDot(dot) {
      if (!this.ui.tooltip)
        return;
      const tip = this.ui.tooltip;
      if (!tip.classList.contains("visible"))
        return;
      let fullText = (dot.getAttribute("aria-label") || "").trim();
      const id = dot.dataset.targetTurnId;
      if (id && this.starred.has(id))
        fullText = `\u2605 ${fullText}`;
      const p = this.computePlacementInfo(dot);
      const layout = this.truncateToThreeLines(fullText, p.width);
      tip.textContent = layout.text;
      this.placeTooltipAt(dot, p.placement, p.width, layout.height);
    }
    scheduleScrollSync() {
      if (this.scrollRafId !== null)
        return;
      this.scrollRafId = requestAnimationFrame(() => {
        this.scrollRafId = null;
        this.syncTimelineTrackToMain();
        this.updateVirtualRangeAndRender();
        this.computeActiveByScroll();
        this.updateSlider();
      });
    }
    computeActiveByScroll() {
      if (this.isScrolling || !this.scrollContainer || this.markers.length === 0)
        return;
      const scrollTop = this.scrollContainer.scrollTop;
      const ref = scrollTop + this.scrollContainer.clientHeight * 0.45;
      let activeId = this.markers[0].id;
      if (this.markerTops.length === this.markers.length && this.markerTops.length > 0) {
        const idx = Math.max(
          0,
          Math.min(this.markers.length - 1, this.upperBound(this.markerTops, ref))
        );
        activeId = this.markers[idx].id;
      } else {
        const containerRect = this.scrollContainer.getBoundingClientRect();
        for (let i = 0; i < this.markers.length; i++) {
          const m = this.markers[i];
          const top = m.element.getBoundingClientRect().top - containerRect.top + scrollTop;
          if (top <= ref)
            activeId = m.id;
          else
            break;
        }
      }
      if (this.activeTurnId !== activeId) {
        const now = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
        const since = now - this.lastActiveChangeTime;
        if (since < this.minActiveChangeInterval) {
          this.pendingActiveId = activeId;
          if (!this.activeChangeTimer) {
            const delay = Math.max(this.minActiveChangeInterval - since, 0);
            this.activeChangeTimer = window.setTimeout(() => {
              this.activeChangeTimer = null;
              if (this.pendingActiveId && this.pendingActiveId !== this.activeTurnId) {
                this.activeTurnId = this.pendingActiveId;
                this.updateActiveDotUI();
                this.lastActiveChangeTime = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
              }
              this.pendingActiveId = null;
            }, delay);
          }
        } else {
          this.activeTurnId = activeId;
          this.updateActiveDotUI();
          this.lastActiveChangeTime = now;
        }
      }
    }
    syncTimelineTrackToMain() {
      if (this.sliderDragging)
        return;
      if (!this.ui.track || !this.scrollContainer || !this.contentHeight)
        return;
      const scrollTop = this.scrollContainer.scrollTop;
      const ref = scrollTop + this.scrollContainer.clientHeight * 0.45;
      const span = Math.max(1, this.contentSpanPx || 1);
      const r = Math.max(0, Math.min(1, (ref - (this.firstUserTurnOffset || 0)) / span));
      const maxScroll = Math.max(0, this.contentHeight - (this.ui.track.clientHeight || 0));
      const target = Math.round(r * maxScroll);
      if (Math.abs((this.ui.track.scrollTop || 0) - target) > 1)
        this.ui.track.scrollTop = target;
    }
    lowerBound(arr, x) {
      let lo = 0, hi = arr.length;
      while (lo < hi) {
        const mid = lo + hi >> 1;
        if (arr[mid] < x)
          lo = mid + 1;
        else
          hi = mid;
      }
      return lo;
    }
    upperBound(arr, x) {
      let lo = 0, hi = arr.length;
      while (lo < hi) {
        const mid = lo + hi >> 1;
        if (arr[mid] <= x)
          lo = mid + 1;
        else
          hi = mid;
      }
      return lo - 1;
    }
    updateVirtualRangeAndRender() {
      const localVersion = this.markersVersion;
      if (!this.ui.track || !this.ui.trackContent || this.markers.length === 0)
        return;
      const st = this.ui.track.scrollTop || 0;
      const vh = this.ui.track.clientHeight || 0;
      const buffer = Math.max(100, vh);
      const minY = st - buffer;
      const maxY = st + vh + buffer;
      const start = this.lowerBound(this.yPositions, minY);
      const end = Math.max(start - 1, this.upperBound(this.yPositions, maxY));
      const hiddenIndices = this.getHiddenMarkerIndices();
      let prevStart = this.visibleRange.start;
      let prevEnd = this.visibleRange.end;
      const len = this.markers.length;
      if (len > 0) {
        prevStart = Math.max(0, Math.min(prevStart, len - 1));
        prevEnd = Math.max(-1, Math.min(prevEnd, len - 1));
      }
      if (prevEnd >= prevStart) {
        for (let i = prevStart; i < Math.min(start, prevEnd + 1); i++) {
          const m = this.markers[i];
          if (m && m.dotElement) {
            m.dotElement.remove();
            m.dotElement = null;
          }
        }
        for (let i = Math.max(end + 1, prevStart); i <= prevEnd; i++) {
          const m = this.markers[i];
          if (m && m.dotElement) {
            m.dotElement.remove();
            m.dotElement = null;
          }
        }
      } else {
        (this.ui.trackContent || this.ui.timelineBar).querySelectorAll(".timeline-dot").forEach((n) => n.remove());
        this.markers.forEach((m) => {
          m.dotElement = null;
        });
      }
      const frag = document.createDocumentFragment();
      for (let i = start; i <= end; i++) {
        const marker = this.markers[i];
        if (!marker)
          continue;
        if (hiddenIndices.has(i)) {
          if (marker.dotElement) {
            marker.dotElement.remove();
            marker.dotElement = null;
          }
          continue;
        }
        const isCollapsed = this.isMarkerCollapsed(marker.id);
        if (!marker.dotElement) {
          const dot = document.createElement("button");
          dot.className = "timeline-dot";
          dot.dataset.targetTurnId = marker.id;
          dot.dataset.markerIndex = String(i);
          dot.setAttribute("aria-label", marker.summary);
          dot.setAttribute("tabindex", "0");
          dot.setAttribute("aria-describedby", "gemini-timeline-tooltip");
          dot.style.setProperty("--n", String(marker.n || 0));
          if (this.usePixelTop)
            dot.style.top = `${Math.round(this.yPositions[i])}px`;
          dot.classList.toggle("active", marker.id === this.activeTurnId);
          dot.classList.toggle("starred", !!marker.starred);
          dot.classList.toggle("collapsed", isCollapsed);
          dot.setAttribute("aria-pressed", marker.starred ? "true" : "false");
          dot.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
          const level = this.getMarkerLevel(marker.id);
          dot.setAttribute("data-level", String(level));
          marker.dotElement = dot;
          frag.appendChild(dot);
        } else {
          marker.dotElement.dataset.markerIndex = String(i);
          marker.dotElement.style.setProperty("--n", String(marker.n || 0));
          if (this.usePixelTop)
            marker.dotElement.style.top = `${Math.round(this.yPositions[i])}px`;
          marker.dotElement.classList.toggle("starred", !!marker.starred);
          marker.dotElement.classList.toggle("collapsed", isCollapsed);
          marker.dotElement.setAttribute("aria-pressed", marker.starred ? "true" : "false");
          marker.dotElement.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
          const level = this.getMarkerLevel(marker.id);
          marker.dotElement.setAttribute("data-level", String(level));
        }
      }
      if (localVersion !== this.markersVersion)
        return;
      if (frag.childNodes.length)
        this.ui.trackContent.appendChild(frag);
      this.visibleRange = { start, end };
      this.updateSlider();
    }
    updateSlider() {
      if (!this.ui.slider || !this.ui.sliderHandle)
        return;
      if (!this.contentHeight || !this.ui.timelineBar || !this.ui.track)
        return;
      const barRect = this.ui.timelineBar.getBoundingClientRect();
      const barH = barRect.height || 0;
      const pad = this.getTrackPadding();
      const innerH = Math.max(0, barH - 2 * pad);
      if (this.contentHeight <= barH + 1 || innerH <= 0) {
        this.sliderAlwaysVisible = false;
        this.ui.slider.classList.remove("visible");
        this.ui.slider.style.opacity = "";
        return;
      }
      this.sliderAlwaysVisible = true;
      const railLen = Math.max(120, Math.min(240, Math.floor(barH * 0.45)));
      const railTop = Math.round(barRect.top + pad + (innerH - railLen) / 2);
      const railLeftGap = 8;
      const sliderWidth = 12;
      const left = Math.round(barRect.left - railLeftGap - sliderWidth);
      this.ui.slider.style.left = `${left}px`;
      this.ui.slider.style.top = `${railTop}px`;
      this.ui.slider.style.height = `${railLen}px`;
      const handleH = 22;
      const maxTop = Math.max(0, railLen - handleH);
      const range = Math.max(1, this.contentHeight - barH);
      const st = this.ui.track.scrollTop || 0;
      const r = Math.max(0, Math.min(1, st / range));
      const top = Math.round(r * maxTop);
      this.ui.sliderHandle.style.height = `${handleH}px`;
      this.ui.sliderHandle.style.top = `${top}px`;
      this.ui.slider.classList.add("visible");
      this.ui.slider.style.opacity = "";
    }
    showSlider() {
      if (!this.ui.slider)
        return;
      this.ui.slider.classList.add("visible");
      if (this.sliderFadeTimer) {
        clearTimeout(this.sliderFadeTimer);
        this.sliderFadeTimer = null;
      }
      this.updateSlider();
    }
    hideSliderDeferred() {
      if (this.sliderDragging || this.sliderAlwaysVisible)
        return;
      if (this.sliderFadeTimer)
        clearTimeout(this.sliderFadeTimer);
      this.sliderFadeTimer = window.setTimeout(() => {
        this.sliderFadeTimer = null;
        this.ui.slider?.classList.remove("visible");
      }, this.sliderFadeDelay);
    }
    handleSliderDrag(e) {
      if (!this.sliderDragging || !this.ui.timelineBar || !this.ui.track)
        return;
      const barRect = this.ui.timelineBar.getBoundingClientRect();
      const barH = barRect.height || 0;
      const railLen = parseFloat(this.ui.slider.style.height || "0") || Math.max(120, Math.min(240, Math.floor(barH * 0.45)));
      const handleH = this.ui.sliderHandle.getBoundingClientRect().height || 22;
      const maxTop = Math.max(0, railLen - handleH);
      const delta = e.clientY - this.sliderStartClientY;
      let top = Math.max(
        0,
        Math.min(maxTop, this.sliderStartTop + delta - (parseFloat(this.ui.slider.style.top) || 0))
      );
      const r = maxTop > 0 ? top / maxTop : 0;
      const range = Math.max(1, this.contentHeight - barH);
      this.ui.track.scrollTop = Math.round(r * range);
      this.updateVirtualRangeAndRender();
      this.showSlider();
      this.updateSlider();
    }
    endSliderDrag(_e) {
      this.sliderDragging = false;
      try {
        window.removeEventListener("pointermove", this.onSliderMove);
      } catch {
      }
      this.onSliderMove = null;
      this.onSliderUp = null;
      this.hideSliderDeferred();
    }
    toggleDraggable(enabled) {
      this.draggable = enabled;
      if (!this.ui.timelineBar || !this.onBarPointerDown)
        return;
      if (this.draggable) {
        this.ui.timelineBar.addEventListener("pointerdown", this.onBarPointerDown);
        this.ui.timelineBar.style.cursor = "move";
      } else {
        this.ui.timelineBar.removeEventListener("pointerdown", this.onBarPointerDown);
        this.ui.timelineBar.style.cursor = "default";
      }
    }
    toggleMarkerLevel(enabled) {
      this.markerLevelEnabled = enabled;
      if (!enabled) {
        this.hideContextMenu();
      }
      this.updateTimelineGeometry();
      this.updateVirtualRangeAndRender();
    }
    handleBarDrag(e) {
      if (!this.barDragging)
        return;
      const dx = e.clientX - this.barStartPos.x;
      const dy = e.clientY - this.barStartPos.y;
      this.ui.timelineBar.style.left = `${this.barStartOffset.x + dx}px`;
      this.ui.timelineBar.style.top = `${this.barStartOffset.y + dy}px`;
    }
    endBarDrag(_e) {
      this.barDragging = false;
      this.savePosition();
      window.removeEventListener("pointermove", this.onBarPointerMove);
    }
    savePosition() {
      if (!this.ui.timelineBar)
        return;
      const rect = this.ui.timelineBar.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const position = {
        version: 2,
        topPercent: rect.top / viewportHeight * 100,
        leftPercent: rect.left / viewportWidth * 100
      };
      const g = globalThis;
      if (g.chrome?.storage?.sync?.set) {
        g.chrome.storage.sync.set({ geminiTimelinePosition: position });
      } else if (g.browser?.storage?.sync?.set) {
        g.browser.storage.sync.set({ geminiTimelinePosition: position });
      }
    }
    /**
     * Apply position with boundary checks to keep timeline visible
     */
    applyPosition(top, left) {
      if (!this.ui.timelineBar)
        return;
      const barWidth = this.ui.timelineBar.offsetWidth || 24;
      const barHeight = this.ui.timelineBar.offsetHeight || 100;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const padding = 10;
      const clampedTop = Math.max(padding, Math.min(top, viewportHeight - barHeight - padding));
      const clampedLeft = Math.max(padding, Math.min(left, viewportWidth - barWidth - padding));
      this.ui.timelineBar.style.top = `${clampedTop}px`;
      this.ui.timelineBar.style.left = `${clampedLeft}px`;
    }
    /**
     * Reapply position from storage (for window resize)
     */
    async reapplyPosition() {
      if (!this.ui.timelineBar)
        return;
      const g = globalThis;
      if (!g.chrome?.storage?.sync && !g.browser?.storage?.sync)
        return;
      let res = null;
      try {
        res = await new Promise((resolve) => {
          if (g.chrome?.storage?.sync?.get) {
            g.chrome.storage.sync.get(["geminiTimelinePosition"], (items) => {
              if (g.chrome.runtime?.lastError) {
                console.error(
                  `[Timeline] chrome.storage.get failed: ${g.chrome.runtime.lastError.message}`
                );
                resolve(null);
              } else {
                resolve(items);
              }
            });
          } else {
            g.browser.storage.sync.get(["geminiTimelinePosition"]).then(resolve).catch((error) => {
              console.error(`[Timeline] browser.storage.get failed: ${error.message}`);
              resolve(null);
            });
          }
        });
      } catch (error) {
        console.error("[Timeline] reapplyPosition storage access failed:", error);
        return;
      }
      const position = res?.geminiTimelinePosition;
      if (!position)
        return;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      if (position.version === 2 && position.topPercent !== void 0 && position.leftPercent !== void 0) {
        const top = position.topPercent / 100 * viewportHeight;
        const left = position.leftPercent / 100 * viewportWidth;
        this.applyPosition(top, left);
      } else if (position.top !== void 0 && position.left !== void 0) {
        this.applyPosition(position.top, position.left);
      }
    }
    hideTooltip(immediate = false) {
      if (!this.ui.tooltip)
        return;
      const doHide = () => {
        this.ui.tooltip.classList.remove("visible");
        this.ui.tooltip.setAttribute("aria-hidden", "true");
        this.tooltipHideTimer = null;
      };
      if (immediate)
        return doHide();
      if (this.tooltipHideTimer)
        clearTimeout(this.tooltipHideTimer);
      this.tooltipHideTimer = window.setTimeout(doHide, this.tooltipHideDelay);
    }
    async toggleStar(turnId) {
      const id = String(turnId || "");
      if (!id)
        return;
      const wasStarred = this.starred.has(id);
      if (wasStarred) {
        this.starred.delete(id);
      } else {
        this.starred.add(id);
      }
      this.saveStars();
      if (wasStarred) {
        await StarredMessagesService.removeStarredMessage(this.conversationId, id);
      } else {
        const m = this.markerMap.get(id);
        if (m) {
          const conversationTitle = this.getConversationTitle();
          const message = {
            turnId: id,
            content: m.summary,
            conversationId: this.conversationId,
            conversationUrl: window.location.href,
            conversationTitle,
            starredAt: Date.now()
          };
          await StarredMessagesService.addStarredMessage(message);
        }
      }
      const isStarredNow = this.starred.has(id);
      this.markers.forEach((m) => {
        if (m.id === id) {
          m.starred = isStarredNow;
          if (m.dotElement) {
            m.dotElement.classList.toggle("starred", isStarredNow);
            m.dotElement.setAttribute("aria-pressed", isStarredNow ? "true" : "false");
            this.refreshTooltipForDot(m.dotElement);
          }
        }
      });
    }
    /**
     * Save starred messages to localStorage using DRY helper
     */
    saveStars() {
      const key = this.getStarsStorageKey();
      if (!key)
        return;
      this.safeLocalStorageSet(key, JSON.stringify(Array.from(this.starred)));
    }
    /**
     * Load starred messages from localStorage using DRY helper
     */
    async loadStars() {
      this.starred.clear();
      const key = this.getStarsStorageKey();
      if (!key)
        return;
      const raw = this.safeLocalStorageGet(key);
      if (!raw)
        return;
      try {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          arr.forEach((id) => this.starred.add(String(id)));
        }
      } catch (error) {
        console.warn("[Timeline] Failed to parse starred messages:", error);
      }
    }
    // ===== Marker Level Methods =====
    getLevelsStorageKey() {
      return this.conversationId ? `geminiTimelineLevels:${this.conversationId}` : null;
    }
    /* Load marker levels from localStorage */
    loadMarkerLevels() {
      this.markerLevels.clear();
      const key = this.getLevelsStorageKey();
      if (!key)
        return;
      const raw = this.safeLocalStorageGet(key);
      if (!raw)
        return;
      try {
        const obj = JSON.parse(raw);
        if (obj && typeof obj === "object") {
          Object.entries(obj).forEach(([turnId, level]) => {
            if (typeof level === "number" && level >= 1 && level <= 4) {
              this.markerLevels.set(turnId, level);
            }
          });
        }
      } catch (error) {
        console.warn("[Timeline] Failed to parse marker levels:", error);
      }
    }
    /* Save marker levels to localStorage */
    saveMarkerLevels() {
      const key = this.getLevelsStorageKey();
      if (!key)
        return;
      const obj = {};
      this.markerLevels.forEach((level, turnId) => {
        obj[turnId] = level;
      });
      this.safeLocalStorageSet(key, JSON.stringify(obj));
    }
    // ===== Collapsed Markers Methods =====
    getCollapsedStorageKey() {
      return this.conversationId ? `geminiTimelineCollapsed:${this.conversationId}` : null;
    }
    loadCollapsedMarkers() {
      this.collapsedMarkers.clear();
      const key = this.getCollapsedStorageKey();
      if (!key)
        return;
      const raw = this.safeLocalStorageGet(key);
      if (!raw)
        return;
      try {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          arr.forEach((id) => this.collapsedMarkers.add(String(id)));
        }
      } catch (error) {
        console.warn("[Timeline] Failed to parse collapsed markers:", error);
      }
    }
    saveCollapsedMarkers() {
      const key = this.getCollapsedStorageKey();
      if (!key)
        return;
      this.safeLocalStorageSet(key, JSON.stringify(Array.from(this.collapsedMarkers)));
    }
    isMarkerCollapsed(turnId) {
      return this.collapsedMarkers.has(turnId);
    }
    toggleCollapse(turnId) {
      if (this.collapsedMarkers.has(turnId)) {
        this.collapsedMarkers.delete(turnId);
      } else {
        this.collapsedMarkers.add(turnId);
      }
      this.saveCollapsedMarkers();
      this.updateTimelineGeometry();
      this.updateVirtualRangeAndRender();
    }
    getHiddenMarkerIndices() {
      const hidden = /* @__PURE__ */ new Set();
      if (!this.markerLevelEnabled) {
        return hidden;
      }
      for (let i = 0; i < this.markers.length; i++) {
        if (hidden.has(i))
          continue;
        const marker = this.markers[i];
        const level = this.getMarkerLevel(marker.id);
        if (this.collapsedMarkers.has(marker.id)) {
          for (let j = i + 1; j < this.markers.length; j++) {
            const nextMarker = this.markers[j];
            const nextLevel = this.getMarkerLevel(nextMarker.id);
            if (nextLevel <= level) {
              break;
            }
            hidden.add(j);
          }
        }
      }
      return hidden;
    }
    calculateEffectiveBaseN(markerIndex, hiddenIndices) {
      const marker = this.markers[markerIndex];
      if (!marker)
        return 0;
      const baseN = marker.baseN ?? marker.n ?? 0;
      if (!this.collapsedMarkers.has(marker.id)) {
        return baseN;
      }
      const level = this.getMarkerLevel(marker.id);
      let childContribution = 0;
      for (let j = markerIndex + 1; j < this.markers.length; j++) {
        const nextMarker = this.markers[j];
        const nextLevel = this.getMarkerLevel(nextMarker.id);
        if (nextLevel <= level) {
          break;
        }
        const childBaseN = nextMarker.baseN ?? nextMarker.n ?? 0;
        const prevBaseN = j > 0 ? this.markers[j - 1].baseN ?? this.markers[j - 1].n ?? 0 : 0;
        const childLength = childBaseN - prevBaseN;
        const levelDiff = nextLevel - level;
        childContribution += childLength * Math.pow(0.5, levelDiff);
      }
      return baseN + childContribution;
    }
    calculateCollapsedPositions(hiddenIndices, pad, usableC) {
      const N = this.markers.length;
      const desiredY = new Array(N).fill(-1);
      const effectiveBaseNs = new Array(N).fill(0);
      const visibleMarkers = [];
      for (let i = 0; i < N; i++) {
        if (hiddenIndices.has(i))
          continue;
        const effectiveN = this.calculateEffectiveBaseN(i, hiddenIndices);
        effectiveBaseNs[i] = effectiveN;
        visibleMarkers.push({ index: i, effectiveN });
      }
      visibleMarkers.sort((a, b) => a.effectiveN - b.effectiveN);
      if (visibleMarkers.length === 0) {
        return { desiredY, effectiveBaseNs };
      }
      const minEffectiveN = visibleMarkers[0].effectiveN;
      const maxEffectiveN = visibleMarkers[visibleMarkers.length - 1].effectiveN;
      const effectiveRange = maxEffectiveN - minEffectiveN;
      for (const vm of visibleMarkers) {
        let normalizedN;
        if (effectiveRange > 0) {
          normalizedN = (vm.effectiveN - minEffectiveN) / effectiveRange;
        } else {
          normalizedN = visibleMarkers.indexOf(vm) / Math.max(1, visibleMarkers.length - 1);
        }
        desiredY[vm.index] = pad + normalizedN * usableC;
      }
      return { desiredY, effectiveBaseNs };
    }
    /**
     * Check if a marker can be collapsed (has lower-level children)
     */
    canCollapseMarker(turnId) {
      const markerIndex = this.markers.findIndex((m) => m.id === turnId);
      if (markerIndex < 0 || markerIndex >= this.markers.length - 1)
        return false;
      const level = this.getMarkerLevel(turnId);
      const nextMarker = this.markers[markerIndex + 1];
      if (!nextMarker)
        return false;
      const nextLevel = this.getMarkerLevel(nextMarker.id);
      return nextLevel > level;
    }
    getMarkerLevel(turnId) {
      return this.markerLevels.get(turnId) || 1;
    }
    setMarkerLevel(turnId, level) {
      if (level === 1) {
        this.markerLevels.delete(turnId);
      } else {
        this.markerLevels.set(turnId, level);
      }
      this.saveMarkerLevels();
      this.markers.forEach((marker) => {
        if (marker.id === turnId && marker.dotElement) {
          marker.dotElement.setAttribute("data-level", String(level));
        }
      });
    }
    showContextMenu(dot, x, y) {
      this.hideContextMenu();
      const turnId = dot.dataset.targetTurnId;
      if (!turnId)
        return;
      const currentLevel = this.getMarkerLevel(turnId);
      const isCollapsed = this.isMarkerCollapsed(turnId);
      const canCollapse = this.canCollapseMarker(turnId);
      const menu = document.createElement("div");
      menu.className = "timeline-context-menu";
      const title = document.createElement("div");
      title.className = "timeline-context-menu-title";
      title.textContent = getTranslationSync("timelineLevelTitle");
      menu.appendChild(title);
      const levels = [
        { level: 1, label: getTranslationSync("timelineLevel1") },
        { level: 2, label: getTranslationSync("timelineLevel2") },
        { level: 3, label: getTranslationSync("timelineLevel3") }
      ];
      levels.forEach(({ level, label }) => {
        const item = document.createElement("button");
        item.className = "timeline-context-menu-item";
        if (level === currentLevel) {
          item.classList.add("active");
        }
        item.setAttribute("data-level", String(level));
        const indicator = document.createElement("span");
        indicator.className = "level-indicator";
        const dotEl = document.createElement("span");
        dotEl.className = "level-dot";
        indicator.appendChild(dotEl);
        item.appendChild(indicator);
        const labelSpan = document.createElement("span");
        labelSpan.textContent = label;
        item.appendChild(labelSpan);
        if (level === currentLevel) {
          const check = document.createElement("span");
          check.className = "check-icon";
          check.textContent = "\u2713";
          item.appendChild(check);
        }
        item.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.setMarkerLevel(turnId, level);
          this.hideContextMenu();
        });
        menu.appendChild(item);
      });
      if (canCollapse || isCollapsed) {
        const separator = document.createElement("div");
        separator.className = "timeline-context-menu-separator";
        menu.appendChild(separator);
        const collapseItem = document.createElement("button");
        collapseItem.className = "timeline-context-menu-item collapse-item";
        const icon = document.createElement("span");
        icon.className = "collapse-icon";
        icon.textContent = isCollapsed ? "\u25B6" : "\u25BC";
        collapseItem.appendChild(icon);
        const collapseLabel = document.createElement("span");
        collapseLabel.textContent = isCollapsed ? getTranslationSync("timelineExpand") : getTranslationSync("timelineCollapse");
        collapseItem.appendChild(collapseLabel);
        collapseItem.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.toggleCollapse(turnId);
          this.hideContextMenu();
        });
        menu.appendChild(collapseItem);
      }
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      document.body.appendChild(menu);
      this.contextMenu = menu;
      const menuWidth = menu.offsetWidth;
      const menuHeight = menu.offsetHeight;
      let left = x;
      let top = y;
      if (left + menuWidth > vw - 10) {
        left = vw - menuWidth - 10;
      }
      if (top + menuHeight > vh - 10) {
        top = vh - menuHeight - 10;
      }
      menu.style.left = `${left}px`;
      menu.style.top = `${top}px`;
      document.body.appendChild(menu);
      this.contextMenu = menu;
    }
    hideContextMenu() {
      if (this.contextMenu) {
        this.contextMenu.remove();
        this.contextMenu = null;
      }
    }
    cancelLongPress() {
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
      if (this.pressTargetDot) {
        this.pressTargetDot.classList.remove("holding");
      }
      this.pressTargetDot = null;
      this.pressStartPos = null;
      this.longPressTriggered = false;
    }
    /**
     * Initialize keyboard shortcuts for timeline navigation
     */
    async initKeyboardShortcuts() {
      try {
        await keyboardShortcutService.init();
        this.shortcutUnsubscribe = keyboardShortcutService.on((action, event) => {
          if (action === "timeline:previous") {
            this.enqueueNavigation("previous", event.repeat);
          } else if (action === "timeline:next") {
            this.enqueueNavigation("next", event.repeat);
          }
        });
      } catch (error) {
        console.warn("[Timeline] Failed to initialize keyboard shortcuts:", error);
      }
    }
    /**
     * Enqueue navigation action (supports rapid key presses)
     */
    enqueueNavigation(direction, isRepeat = false) {
      if (isRepeat && this.navigationQueue.length > 0) {
        return;
      }
      if (this.navigationQueue.length >= 3) {
        return;
      }
      if (!this.canEnqueueNavigation(direction)) {
        return;
      }
      this.navigationQueue.push(direction);
      this.processNavigationQueue();
    }
    canEnqueueNavigation(direction) {
      if (this.markers.length === 0)
        return false;
      const currentIndex = this.getActiveIndex();
      if (currentIndex < 0)
        return true;
      const isAtStart = currentIndex === 0;
      const isAtEnd = currentIndex === this.markers.length - 1;
      const isBoundaryBlocked = direction === "previous" && isAtStart || direction === "next" && isAtEnd;
      if (!isBoundaryBlocked)
        return true;
      return this.shouldAttemptRefreshForNavigation();
    }
    shouldAttemptRefreshForNavigation() {
      if (!this.userTurnSelector)
        return false;
      const documentCount = document.querySelectorAll(this.userTurnSelector).length;
      const containersDisconnected = (this.conversationContainer ? !this.conversationContainer.isConnected : true) || (this.scrollContainer ? !this.scrollContainer.isConnected : true);
      return containersDisconnected || documentCount > this.markers.length;
    }
    /**
     * Process navigation queue (one at a time)
     */
    async processNavigationQueue() {
      if (this.isNavigating || this.navigationQueue.length === 0)
        return;
      this.isNavigating = true;
      const direction = this.navigationQueue.shift();
      if (direction === "previous") {
        await this.navigateToPreviousNode();
      } else {
        await this.navigateToNextNode();
      }
      this.isNavigating = false;
      if (this.navigationQueue.length > 0) {
        this.processNavigationQueue();
      }
    }
    /**
     * Perform navigation to a target node
     * Shared logic for previous/next navigation
     */
    async performNodeNavigation(targetIndex, currentIndex) {
      if (targetIndex < 0 || targetIndex >= this.markers.length)
        return;
      if (this.activeChangeTimer) {
        clearTimeout(this.activeChangeTimer);
        this.activeChangeTimer = null;
        this.pendingActiveId = null;
      }
      const targetMarker = this.markers[targetIndex];
      if (!targetMarker?.element)
        return;
      if (this.scrollMode === "flow" && currentIndex >= 0) {
        const duration = this.computeFlowDuration(currentIndex, targetIndex);
        this.startRunner(currentIndex, targetIndex, duration);
        this.smoothScrollTo(targetMarker.element, duration);
        await new Promise((resolve) => setTimeout(resolve, duration));
      } else {
        this.smoothScrollTo(targetMarker.element, 0);
      }
      this.activeTurnId = targetMarker.id;
      this.updateActiveDotUI();
    }
    /**
     * Navigate to previous timeline node (k or custom shortcut)
     */
    async navigateToPreviousNode() {
      if (this.markers.length === 0)
        return;
      this.maybeRefreshMarkersForNavigation("previous");
      const currentIndex = this.getActiveIndex();
      const targetIndex = currentIndex <= 0 ? 0 : currentIndex - 1;
      await this.performNodeNavigation(targetIndex, currentIndex);
    }
    /**
     * Navigate to next timeline node (j or custom shortcut)
     */
    async navigateToNextNode() {
      if (this.markers.length === 0)
        return;
      this.maybeRefreshMarkersForNavigation("next");
      const currentIndex = this.getActiveIndex();
      const targetIndex = currentIndex < 0 ? 0 : Math.min(currentIndex + 1, this.markers.length - 1);
      await this.performNodeNavigation(targetIndex, currentIndex);
    }
    maybeRefreshMarkersForNavigation(direction) {
      if (!this.userTurnSelector)
        return;
      const currentIndex = this.getActiveIndex();
      const isAtStart = currentIndex === 0;
      const isAtEnd = currentIndex >= 0 && currentIndex === this.markers.length - 1;
      const shouldAttemptRefresh = direction === "previous" && isAtStart || direction === "next" && isAtEnd;
      if (!shouldAttemptRefresh)
        return;
      if (!this.shouldAttemptRefreshForNavigation())
        return;
      const refreshed = this.refreshCriticalElementsFromDocument();
      if (!refreshed)
        return;
      this.recalculateAndRenderMarkers();
    }
    refreshCriticalElementsFromDocument() {
      if (!this.userTurnSelector)
        return false;
      const firstTurn = document.querySelector(this.userTurnSelector);
      if (!firstTurn)
        return false;
      const nextConversationContainer = document.querySelector("main") || document.body;
      this.conversationContainer = nextConversationContainer;
      let nextScrollContainer = null;
      let p = firstTurn;
      while (p && p !== document.body) {
        const st = getComputedStyle(p);
        if (st.overflowY === "auto" || st.overflowY === "scroll") {
          nextScrollContainer = p;
          break;
        }
        p = p.parentElement;
      }
      if (!nextScrollContainer) {
        nextScrollContainer = document.scrollingElement || document.documentElement || document.body;
      }
      const scrollContainerChanged = this.scrollContainer !== nextScrollContainer;
      if (scrollContainerChanged) {
        if (this.scrollContainer && this.onScroll) {
          try {
            this.scrollContainer.removeEventListener("scroll", this.onScroll);
          } catch {
          }
        }
        this.scrollContainer = nextScrollContainer;
        if (this.scrollContainer && this.onScroll) {
          this.scrollContainer.addEventListener("scroll", this.onScroll, { passive: true });
        }
      }
      if (this.mutationObserver && this.conversationContainer) {
        try {
          this.mutationObserver.disconnect();
          this.mutationObserver.observe(this.conversationContainer, {
            childList: true,
            subtree: true
          });
        } catch {
        }
      }
      if (this.intersectionObserver && this.scrollContainer) {
        try {
          this.intersectionObserver.disconnect();
          this.intersectionObserver = new IntersectionObserver(
            () => {
              this.scheduleScrollSync();
            },
            { root: this.scrollContainer, threshold: 0.1, rootMargin: "-40% 0px -59% 0px" }
          );
        } catch {
        }
      }
      return true;
    }
    /**
     * Handle starred message navigation with optimized performance
     * Strategy: Quick check if markers ready, otherwise retry with exponential backoff
     */
    handleStarredMessageNavigation() {
      try {
        const hash = window.location.hash;
        if (!hash.startsWith("#gv-turn-"))
          return;
        const turnId = hash.replace("#gv-turn-", "");
        if (!turnId)
          return;
        console.log("[Timeline] Handling starred message navigation, turnId:", turnId);
        let attempts = 0;
        const maxAttempts = 20;
        const checkAndScroll = () => {
          if (this.markers.length === 0)
            return false;
          const marker = this.markerMap.get(turnId);
          if (marker && marker.element) {
            console.log("[Timeline] Found target marker, scrolling");
            setTimeout(() => {
              this.smoothScrollTo(marker.element, 800);
              setTimeout(() => {
                window.history.replaceState(
                  null,
                  "",
                  window.location.pathname + window.location.search
                );
              }, 900);
            }, 100);
            return true;
          }
          return false;
        };
        const retry = () => {
          if (checkAndScroll())
            return;
          attempts++;
          if (attempts >= maxAttempts) {
            console.warn("[Timeline] Failed to find starred message");
            window.history.replaceState(null, "", window.location.pathname + window.location.search);
            return;
          }
          const delay = Math.min(attempts * 100, 300);
          setTimeout(retry, delay);
        };
        if (this.markers.length > 0) {
          if (checkAndScroll())
            return;
        }
        setTimeout(retry, 200);
      } catch (error) {
        console.error("[Timeline] Failed to handle starred message navigation:", error);
      }
    }
    destroy() {
      if (this.shortcutUnsubscribe) {
        try {
          this.shortcutUnsubscribe();
          this.shortcutUnsubscribe = null;
        } catch (error) {
          console.error("[Timeline] Failed to unsubscribe from keyboard shortcuts:", error);
        }
      }
      this.navigationQueue = [];
      this.isNavigating = false;
      this.eventBusUnsubscribers.forEach((unsubscribe) => {
        try {
          unsubscribe();
        } catch (error) {
          console.error("[Timeline] Failed to unsubscribe from EventBus:", error);
        }
      });
      this.eventBusUnsubscribers = [];
      try {
        this.toggleDraggable(false);
      } catch {
      }
      try {
        if (this.onBarPointerMove)
          window.removeEventListener("pointermove", this.onBarPointerMove);
      } catch {
      }
      try {
        if (this.onBarPointerUp)
          window.removeEventListener("pointerup", this.onBarPointerUp);
      } catch {
      }
      try {
        this.mutationObserver?.disconnect();
      } catch {
      }
      try {
        this.resizeObserver?.disconnect();
      } catch {
      }
      try {
        this.intersectionObserver?.disconnect();
      } catch {
      }
      this.visibleUserTurns.clear();
      if (this.ui.timelineBar && this.onTimelineBarClick) {
        try {
          this.ui.timelineBar.removeEventListener("click", this.onTimelineBarClick);
        } catch {
        }
      }
      try {
        window.removeEventListener("storage", this.onStorage);
      } catch {
      }
      if (this.onChromeStorageChanged && typeof chrome !== "undefined" && chrome.storage?.onChanged) {
        try {
          chrome.storage.onChanged.removeListener(this.onChromeStorageChanged);
        } catch {
        }
        this.onChromeStorageChanged = null;
      }
      this.hideContextMenu();
      try {
        this.ui.timelineBar?.removeEventListener("contextmenu", this.onContextMenu);
      } catch {
      }
      try {
        document.removeEventListener("click", this.onDocumentClick);
      } catch {
      }
      try {
        this.ui.timelineBar?.removeEventListener("pointerdown", this.onPointerDown);
      } catch {
      }
      try {
        window.removeEventListener("pointermove", this.onPointerMove);
      } catch {
      }
      try {
        window.removeEventListener("pointerup", this.onPointerUp);
      } catch {
      }
      try {
        window.removeEventListener("pointercancel", this.onPointerCancel);
      } catch {
      }
      try {
        this.ui.timelineBar?.removeEventListener("pointerleave", this.onPointerLeave);
      } catch {
      }
      if (this.scrollContainer && this.onScroll) {
        try {
          this.scrollContainer.removeEventListener("scroll", this.onScroll);
        } catch {
        }
      }
      if (this.ui.timelineBar) {
        try {
          this.ui.timelineBar.removeEventListener("wheel", this.onTimelineWheel);
        } catch {
        }
        try {
          this.ui.timelineBar.removeEventListener("pointerenter", this.onBarEnter);
        } catch {
        }
        try {
          this.ui.timelineBar.removeEventListener("pointerleave", this.onBarLeave);
        } catch {
        }
        try {
          this.ui.slider?.removeEventListener("pointerenter", this.onSliderEnter);
        } catch {
        }
        try {
          this.ui.slider?.removeEventListener("pointerleave", this.onSliderLeave);
        } catch {
        }
      }
      try {
        this.ui.sliderHandle?.removeEventListener("pointerdown", this.onSliderDown);
      } catch {
      }
      try {
        window.removeEventListener("resize", this.onWindowResize);
      } catch {
      }
      if (this.onVisualViewportResize && window.visualViewport) {
        try {
          window.visualViewport.removeEventListener("resize", this.onVisualViewportResize);
        } catch {
        }
        this.onVisualViewportResize = null;
      }
      if (this.scrollRafId !== null) {
        try {
          cancelAnimationFrame(this.scrollRafId);
        } catch {
        }
        this.scrollRafId = null;
      }
      try {
        this.ui.timelineBar?.remove();
      } catch {
      }
      try {
        this.ui.tooltip?.remove();
      } catch {
      }
      try {
        this.measureEl?.remove();
      } catch {
      }
      try {
        if (this.ui.slider) {
          this.ui.slider.style.pointerEvents = "none";
          this.ui.slider.remove();
        }
        const stray = document.querySelector(".timeline-left-slider");
        if (stray) {
          stray.style.pointerEvents = "none";
          stray.remove();
        }
      } catch {
      }
      this.ui.slider = null;
      this.ui.sliderHandle = null;
      this.clearSearchHighlights();
      this.previewPanel?.destroy();
      this.previewPanel = null;
      this.ui = { timelineBar: null, tooltip: null };
      this.markers = [];
      this.markerTops = [];
      this.activeTurnId = null;
      this.scrollContainer = null;
      this.conversationContainer = null;
      if (this.activeChangeTimer) {
        clearTimeout(this.activeChangeTimer);
        this.activeChangeTimer = null;
      }
      if (this.tooltipHideTimer) {
        clearTimeout(this.tooltipHideTimer);
        this.tooltipHideTimer = null;
      }
      if (this.resizeIdleTimer) {
        clearTimeout(this.resizeIdleTimer);
        this.resizeIdleTimer = null;
      }
      try {
        if (this.resizeIdleRICId && window.cancelIdleCallback) {
          window.cancelIdleCallback(this.resizeIdleRICId);
          this.resizeIdleRICId = null;
        }
      } catch {
      }
      if (this.sliderFadeTimer) {
        clearTimeout(this.sliderFadeTimer);
        this.sliderFadeTimer = null;
      }
      this.pendingActiveId = null;
    }
  };

  // ../gemini-voyager/src/pages/content/timeline/index.ts
  function isGeminiConversationRoute(pathname = location.pathname) {
    return /^\/(?:u\/\d+\/)?(app|gem)(\/|$)/.test(pathname);
  }
  var timelineManagerInstance = null;
  var currentUrl = location.href;
  var currentPathAndSearch = location.pathname + location.search;
  var routeCheckIntervalId = null;
  var routeListenersAttached = false;
  var activeObservers = [];
  var cleanupHandlers = [];
  var historyPatched = false;
  var originalPushState = null;
  var originalReplaceState = null;
  function initializeTimeline() {
    if (timelineManagerInstance) {
      try {
        timelineManagerInstance.destroy();
      } catch {
      }
      timelineManagerInstance = null;
    }
    try {
      document.querySelectorAll(".gemini-timeline-bar").forEach((el) => el.remove());
    } catch {
    }
    try {
      document.querySelector(".timeline-left-slider")?.remove();
    } catch {
    }
    try {
      document.getElementById("gemini-timeline-tooltip")?.remove();
    } catch {
    }
    timelineManagerInstance = new TimelineManager();
    timelineManagerInstance.init().catch((err) => console.error("Timeline initialization failed:", err));
  }
  var urlChangeTimer = null;
  function handleUrlChange() {
    if (location.href === currentUrl)
      return;
    const newPathAndSearch = location.pathname + location.search;
    const pathChanged = newPathAndSearch !== currentPathAndSearch;
    currentUrl = location.href;
    if (!pathChanged) {
      console.log("[Timeline] Only hash changed, keeping existing timeline");
      return;
    }
    currentPathAndSearch = newPathAndSearch;
    if (urlChangeTimer) {
      clearTimeout(urlChangeTimer);
      urlChangeTimer = null;
    }
    if (isGeminiConversationRoute()) {
      console.log("[Timeline] URL changed to conversation route, scheduling initialization");
      urlChangeTimer = window.setTimeout(() => {
        console.log("[Timeline] Initializing timeline after URL change");
        initializeTimeline();
        urlChangeTimer = null;
      }, 500);
    } else {
      console.log("[Timeline] URL changed to non-conversation route, cleaning up");
      if (timelineManagerInstance) {
        try {
          timelineManagerInstance.destroy();
        } catch {
        }
        timelineManagerInstance = null;
      }
      try {
        document.querySelectorAll(".gemini-timeline-bar").forEach((el) => el.remove());
      } catch {
      }
      try {
        document.querySelector(".timeline-left-slider")?.remove();
      } catch {
      }
      try {
        document.getElementById("gemini-timeline-tooltip")?.remove();
      } catch {
      }
    }
  }
  function patchHistoryOnce() {
    if (historyPatched)
      return;
    try {
      originalPushState = history.pushState;
      originalReplaceState = history.replaceState;
      history.pushState = (...args) => {
        originalPushState?.apply(history, args);
        handleUrlChange();
      };
      history.replaceState = (...args) => {
        originalReplaceState?.apply(history, args);
        handleUrlChange();
      };
      historyPatched = true;
      cleanupHandlers.push(() => {
        if (!historyPatched)
          return;
        if (originalPushState)
          history.pushState = originalPushState;
        if (originalReplaceState)
          history.replaceState = originalReplaceState;
        historyPatched = false;
        originalPushState = null;
        originalReplaceState = null;
      });
    } catch (e) {
      console.warn("[Timeline] Failed to patch history API:", e);
    }
  }
  function attachRouteListenersOnce() {
    if (routeListenersAttached)
      return;
    routeListenersAttached = true;
    patchHistoryOnce();
    window.addEventListener("popstate", handleUrlChange);
    window.addEventListener("hashchange", handleUrlChange);
    routeCheckIntervalId = window.setInterval(() => {
      if (location.href !== currentUrl)
        handleUrlChange();
    }, 800);
    cleanupHandlers.push(() => {
      window.removeEventListener("popstate", handleUrlChange);
      window.removeEventListener("hashchange", handleUrlChange);
    });
  }
  function cleanup() {
    if (urlChangeTimer) {
      clearTimeout(urlChangeTimer);
      urlChangeTimer = null;
    }
    activeObservers.forEach((observer) => {
      try {
        observer.disconnect();
      } catch (e) {
        console.error("[Gemini Voyager] Failed to disconnect observer during cleanup:", e);
      }
    });
    activeObservers = [];
    if (routeCheckIntervalId !== null) {
      clearInterval(routeCheckIntervalId);
      routeCheckIntervalId = null;
    }
    cleanupHandlers.forEach((handler) => {
      try {
        handler();
      } catch (e) {
        console.error("[Gemini Voyager] Failed to run cleanup handler:", e);
      }
    });
    cleanupHandlers = [];
    routeListenersAttached = false;
  }
  function startTimeline() {
    const setup = () => {
      attachRouteListenersOnce();
      if (isGeminiConversationRoute() && !timelineManagerInstance) {
        initializeTimeline();
      }
    };
    if (document.body) {
      setup();
    } else {
      const initialObserver = new MutationObserver(() => {
        if (!document.body)
          return;
        initialObserver.disconnect();
        activeObservers = activeObservers.filter((obs) => obs !== initialObserver);
        setup();
      });
      activeObservers.push(initialObserver);
      initialObserver.observe(document.documentElement || document.body, {
        childList: true,
        subtree: true
      });
    }
    window.addEventListener("beforeunload", cleanup, { once: true });
    if (typeof chrome !== "undefined" && chrome.runtime) {
      chrome.runtime.onSuspend?.addListener?.(cleanup);
    }
  }

  // ../gemini-voyager/aisb-timeline-entry.ts
  var TIMELINE_STYLE_ID = "aisb-gemini-timeline-style";
  var TIMELINE_CSS = "/* Gemini-like timeline styling with CSS variables and theme awareness */\n:root {\n  --timeline-dot-color: #94a3b8;\n  --timeline-dot-active-color: #3b82f6;\n  --timeline-star-color: #f59e0b;\n  --timeline-tooltip-bg: #ffffff;\n  --timeline-tooltip-text: #0f172a;\n  --timeline-tooltip-border: #e2e8f0;\n  --timeline-tooltip-radius: 12px;\n  --timeline-tooltip-shadow: 0 8px 28px rgba(2, 8, 23, 0.16), 0 2px 6px rgba(2, 8, 23, 0.08);\n  --timeline-tooltip-lh: 18px;\n  --timeline-tooltip-pad-y: 10px;\n  --timeline-tooltip-pad-x: 12px;\n  --timeline-tooltip-border-w: 1px;\n  --timeline-tooltip-arrow-size: 8px;\n  --timeline-tooltip-arrow-outside: 4px;\n  --timeline-tooltip-anim-in: 140ms cubic-bezier(0.2, 0.8, 0.2, 1);\n  --timeline-tooltip-anim-out: 100ms linear;\n  --timeline-bar-bg: rgba(248, 250, 252, 0.85);\n  --timeline-dot-size: 12px;\n  --timeline-active-ring: 3px;\n  --timeline-track-padding: 16px;\n  --timeline-tooltip-max: 288px;\n  --timeline-min-gap: 24px;\n  --timeline-hit-size: 30px;\n  --timeline-tooltip-gap-visual: 8px;\n  --timeline-tooltip-gap-box: 4px;\n  --timeline-hold-ms: 550ms;\n}\n\n@media (prefers-color-scheme: dark) {\n  :root {\n    --timeline-dot-color: #475569;\n    --timeline-dot-active-color: #60a5fa;\n    --timeline-star-color: #f59e0b;\n    --timeline-tooltip-bg: #0b1220;\n    --timeline-tooltip-text: #e2e8f0;\n    --timeline-tooltip-border: #1f2937;\n    --timeline-bar-bg: rgba(2, 6, 23, 0.72);\n  }\n}\n\n/* Gemini theme support - Overrides system preferences on Gemini site */\n.theme-host.dark-theme {\n  --timeline-dot-color: #475569;\n  --timeline-dot-active-color: #60a5fa;\n  --timeline-star-color: #f59e0b;\n  --timeline-tooltip-bg: #0b1220;\n  --timeline-tooltip-text: #e2e8f0;\n  --timeline-tooltip-border: #1f2937;\n  --timeline-bar-bg: rgba(2, 6, 23, 0.72);\n}\n\n.theme-host.light-theme {\n  --timeline-dot-color: #94a3b8;\n  --timeline-dot-active-color: #3b82f6;\n  --timeline-star-color: #f59e0b;\n  --timeline-tooltip-bg: #ffffff;\n  --timeline-tooltip-text: #0f172a;\n  --timeline-tooltip-border: #e2e8f0;\n  --timeline-bar-bg: rgba(248, 250, 252, 0.85);\n}\n\n/* Gemini theme hosts */\n.theme-host.dark-theme .gemini-timeline-bar:not(.timeline-no-container) {\n  background-color: rgba(2, 6, 23, 0.72);\n  backdrop-filter: blur(4px);\n  -webkit-backdrop-filter: blur(4px);\n}\n\n.theme-host.light-theme .gemini-timeline-bar:not(.timeline-no-container) {\n  background-color: rgba(248, 250, 252, 0.85);\n  backdrop-filter: blur(4px);\n  -webkit-backdrop-filter: blur(4px);\n}\n\n.gemini-timeline-bar {\n  position: fixed;\n  top: 60px;\n  right: 15px;\n  width: 24px;\n  height: calc(100vh - 100px);\n  z-index: 2147483646;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  border-radius: 10px;\n  background-color: var(--timeline-bar-bg);\n  backdrop-filter: blur(4px);\n  -webkit-backdrop-filter: blur(4px);\n  transition: background-color 0.3s ease;\n  overflow: visible;\n  contain: layout;\n}\n.gemini-timeline-bar.timeline-right {\n  right: 15px;\n  left: auto;\n}\n\n.gemini-timeline-bar.timeline-left {\n  left: 15px;\n  right: auto;\n}\n\n\n.timeline-track {\n  position: relative;\n  width: 100%;\n  height: 100%;\n  overflow-y: auto;\n  overflow-x: visible;\n  background: transparent;\n  padding-left: 2px;\n  padding-right: 2px;\n}\n\n.timeline-track-content {\n  position: relative;\n  width: 100%;\n  height: 100%;\n}\n\n.timeline-dot {\n  position: absolute;\n  left: 50%;\n  top: calc(\n    var(--timeline-track-padding) + (100% - 2 * var(--timeline-track-padding)) * var(--n, 0)\n  );\n  transform: translate(-50%, -50%);\n  width: var(--timeline-hit-size);\n  height: var(--timeline-hit-size);\n  background: transparent;\n  border: none;\n  cursor: pointer;\n  padding: 0;\n}\n\n.timeline-dot::after {\n  content: '';\n  position: absolute;\n  left: 50%;\n  top: 50%;\n  width: var(--timeline-dot-size);\n  height: var(--timeline-dot-size);\n  transform: translate(-50%, -50%);\n  border-radius: 50%;\n  background-color: var(--timeline-dot-color);\n  transition:\n    transform 0.15s ease,\n    box-shadow 0.15s ease;\n}\n\n/* true punch-through: remove filled dot and draw only inner stroke to make host page visible */\nhtml.dark .timeline-track,\n[data-theme='dark'] .timeline-track,\n[data-color-scheme='dark'] .timeline-track {\n  background: transparent;\n}\n\nhtml.dark .timeline-dot:not(.active):not(.starred)::after,\n[data-theme='dark'] .timeline-dot:not(.active):not(.starred)::after,\n[data-color-scheme='dark'] .timeline-dot:not(.active):not(.starred)::after {\n  background: #000;\n  box-shadow: none;\n}\n\n.timeline-dot:hover::after {\n  transform: translate(-50%, -50%) scale(1.15);\n}\n\n.timeline-dot:focus-visible::after {\n  box-shadow: 0 0 6px var(--timeline-dot-active-color);\n}\n\n.timeline-dot.active::after {\n  box-shadow:\n    0 0 0 var(--timeline-active-ring) var(--timeline-dot-active-color),\n    0 0 10px rgba(59, 130, 246, 0.45);\n}\n\n.timeline-dot.starred::after {\n  background-color: var(--timeline-star-color);\n}\n\n/* ===== Timeline Marker Levels (shape-based: circle, triangle, square) ===== */\n.timeline-dot[data-level='1']::after {\n  width: var(--timeline-dot-size);\n  height: var(--timeline-dot-size);\n  border-radius: 50%;\n  clip-path: none;\n}\n\n.timeline-dot[data-level='2']::after {\n  width: var(--timeline-dot-size);\n  height: var(--timeline-dot-size);\n  border-radius: 50%;\n  clip-path: none;\n}\n\n.timeline-dot[data-level='3']::after {\n  width: var(--timeline-dot-size);\n  height: var(--timeline-dot-size);\n  border-radius: 50%;\n  clip-path: none;\n}\n\n/* ===== Timeline Context Menu ===== */\n.timeline-context-menu {\n  position: fixed;\n  background-color: var(--timeline-tooltip-bg);\n  border: 1px solid var(--timeline-tooltip-border);\n  border-radius: 8px;\n  box-shadow: var(--timeline-tooltip-shadow);\n  padding: 4px 0;\n  z-index: 2147483647;\n  min-width: 160px;\n  animation: timeline-menu-in 0.12s ease-out;\n}\n\n@keyframes timeline-menu-in {\n  from {\n    opacity: 0;\n    transform: scale(0.95);\n  }\n\n  to {\n    opacity: 1;\n    transform: scale(1);\n  }\n}\n\n.timeline-context-menu-title {\n  padding: 8px 12px 4px 12px;\n  font-size: 11px;\n  font-weight: 600;\n  color: var(--timeline-tooltip-text);\n  opacity: 0.6;\n  text-transform: uppercase;\n  letter-spacing: 0.5px;\n  border-bottom: 1px solid var(--timeline-tooltip-border);\n  margin-bottom: 4px;\n}\n\n.timeline-context-menu-item {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  width: 100%;\n  padding: 8px 12px;\n  border: none;\n  background: transparent;\n  color: var(--timeline-tooltip-text);\n  font-size: 13px;\n  cursor: pointer;\n  text-align: left;\n  transition: background-color 0.1s ease;\n}\n\n.timeline-context-menu-item:hover {\n  background-color: var(--timeline-dot-active-color);\n}\n\n.timeline-context-menu-item.active {\n  background-color: var(--timeline-dot-active-color);\n  font-weight: 500;\n}\n\n.timeline-context-menu-item .level-indicator {\n  width: 16px;\n  height: 16px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n}\n\n.timeline-context-menu-item .level-dot {\n  width: 10px;\n  height: 10px;\n  background-color: var(--timeline-dot-color);\n}\n\n/* Level 1: Circle */\n.timeline-context-menu-item[data-level='1'] .level-dot {\n  border-radius: 50%;\n  clip-path: none;\n}\n\n/* Level 2: Square */\n.timeline-context-menu-item[data-level='2'] .level-dot {\n  border-radius: 0;\n  clip-path: none;\n}\n\n/* Level 3: Triangle */\n.timeline-context-menu-item[data-level='3'] .level-dot {\n  border-radius: 0;\n  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);\n}\n\n.timeline-context-menu-item .check-icon {\n  margin-left: auto;\n  color: var(--timeline-dot-active-color);\n  font-size: 14px;\n}\n\n/* Context menu separator */\n.timeline-context-menu-separator {\n  height: 1px;\n  background-color: var(--timeline-tooltip-border);\n  margin: 4px 0;\n}\n\n/* Collapse menu item */\n.timeline-context-menu-item.collapse-item {\n  margin-top: 2px;\n}\n\n.timeline-context-menu-item .collapse-icon {\n  font-size: 12px;\n  color: var(--timeline-dot-color);\n  transition: transform 0.2s ease;\n}\n\n/* Collapsed dot style - visual indicator */\n.timeline-dot.collapsed::before {\n  content: '';\n  position: absolute;\n  left: 50%;\n  top: 50%;\n  width: calc(var(--timeline-dot-size) + 10px);\n  height: calc(var(--timeline-dot-size) + 10px);\n  transform: translate(-50%, -50%);\n  border-radius: 50%;\n  border: 2px dashed var(--timeline-dot-active-color);\n  opacity: 0.5;\n  pointer-events: none;\n}\n\n.timeline-dot.holding::before {\n  content: '';\n  position: absolute;\n  left: 50%;\n  top: 50%;\n  width: calc(var(--timeline-dot-size) + 8px);\n  height: calc(var(--timeline-dot-size) + 8px);\n  transform: translate(-50%, -50%);\n  border-radius: 50%;\n  box-shadow: 0 0 0 2px var(--timeline-dot-active-color) inset;\n  opacity: 0.15;\n  animation: timeline-hold-fade var(--timeline-hold-ms) linear forwards;\n  pointer-events: none;\n}\n\n@keyframes timeline-hold-fade {\n  from {\n    opacity: 0.15;\n  }\n\n  to {\n    opacity: 0.85;\n  }\n}\n\n.timeline-tooltip {\n  position: fixed;\n  max-width: var(--timeline-tooltip-max);\n  background-color: var(--timeline-tooltip-bg);\n  color: var(--timeline-tooltip-text);\n  padding: var(--timeline-tooltip-pad-y) var(--timeline-tooltip-pad-x);\n  border-radius: var(--timeline-tooltip-radius);\n  border: var(--timeline-tooltip-border-w) solid var(--timeline-tooltip-border);\n  font-size: 13px;\n  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;\n  line-height: var(--timeline-tooltip-lh);\n  max-height: calc(\n    3 * var(--timeline-tooltip-lh) + 2 * var(--timeline-tooltip-pad-y) + 2 *\n      var(--timeline-tooltip-border-w)\n  );\n  box-shadow: var(--timeline-tooltip-shadow);\n  pointer-events: none;\n  z-index: 2147483647;\n  display: -webkit-box;\n  -webkit-line-clamp: 3;\n  line-clamp: 3;\n  -webkit-box-orient: vertical;\n  overflow: hidden;\n  word-break: break-word;\n  opacity: 0;\n  will-change: opacity, transform;\n  transition: opacity var(--timeline-tooltip-anim-in);\n}\n\n.timeline-tooltip.visible {\n  opacity: 1;\n  animation: timeline-tooltip-in var(--timeline-tooltip-anim-in);\n}\n\n@media (prefers-reduced-motion: reduce) {\n  .timeline-tooltip,\n  .timeline-tooltip.visible {\n    transition: opacity 120ms linear;\n    transform: none !important;\n  }\n}\n\n.timeline-tooltip[data-placement='left'] {\n  transform-origin: right center;\n}\n\n.timeline-tooltip[data-placement='right'] {\n  transform-origin: left center;\n}\n\n@keyframes timeline-tooltip-in {\n  from {\n    transform: scale(0.96);\n  }\n\n  to {\n    transform: scale(1);\n  }\n}\n\n.timeline-tooltip::after {\n  content: '';\n  position: absolute;\n  width: var(--timeline-tooltip-arrow-size);\n  height: var(--timeline-tooltip-arrow-size);\n  background: var(--timeline-tooltip-bg);\n  border: var(--timeline-tooltip-border-w) solid var(--timeline-tooltip-border);\n  transform: rotate(45deg);\n}\n\n.timeline-tooltip[data-placement='left']::after {\n  right: calc(-1 * var(--timeline-tooltip-arrow-outside));\n  top: 50%;\n  transform: translateY(-50%) rotate(45deg);\n  border-left: none;\n  border-bottom: none;\n}\n\n.timeline-tooltip[data-placement='right']::after {\n  left: calc(-1 * var(--timeline-tooltip-arrow-outside));\n  top: 50%;\n  transform: translateY(-50%) rotate(45deg);\n  border-right: none;\n  border-top: none;\n}\n\n.timeline-track::-webkit-scrollbar {\n  width: 0;\n  height: 0;\n}\n\n.timeline-track {\n  scrollbar-width: none;\n}\n\n.timeline-left-slider {\n  position: fixed;\n  top: 0;\n  width: 12px;\n  height: 160px;\n  opacity: 0;\n  transition: opacity 180ms ease;\n  z-index: 2147483646;\n  pointer-events: none;\n}\n\n.timeline-left-slider.visible {\n  opacity: 1;\n  pointer-events: auto;\n}\n\n.timeline-left-slider::before {\n  content: '';\n  position: absolute;\n  left: 5px;\n  top: 0;\n  bottom: 0;\n  width: 2px;\n  background: rgba(0, 0, 0, 0.08);\n  border-radius: 9999px;\n}\n\nhtml.dark .timeline-left-slider::before {\n  background: rgba(255, 255, 255, 0.1);\n}\n\n.timeline-left-handle {\n  position: absolute;\n  left: 2px;\n  width: 8px;\n  height: 22px;\n  background: rgba(16, 163, 127, 0.28);\n  border-radius: 9999px;\n  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);\n  pointer-events: auto;\n  cursor: grab;\n  transition: background-color 120ms ease;\n}\n\n.timeline-left-handle:hover {\n  background: rgba(16, 163, 127, 0.45);\n}\n\n.timeline-left-handle:active {\n  cursor: grabbing;\n}\n\n.timeline-runner-ring {\n  will-change: top, opacity;\n}\n\n.gemini-timeline-bar.timeline-no-container {\n  background-color: transparent !important;\n  backdrop-filter: none !important;\n  -webkit-backdrop-filter: none !important;\n  box-shadow: none;\n  contain: none;\n}\n\n/* \u2500\u2500 Timeline Preview Panel \u2500\u2500 */\n\n.timeline-preview-toggle {\n  position: fixed;\n  width: 24px;\n  height: 24px;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  background: var(--timeline-bar-bg);\n  border: 1px solid var(--timeline-tooltip-border);\n  cursor: pointer;\n  padding: 0;\n  color: var(--timeline-dot-color);\n  border-radius: 6px;\n  transition:\n    color 0.15s ease,\n    background-color 0.15s ease,\n    opacity 0.15s ease;\n  z-index: 2147483646;\n  opacity: 0;\n}\n.gemini-timeline-bar:hover ~ .timeline-preview-toggle,\n.timeline-preview-toggle:hover,\n.timeline-preview-toggle.active {\n  opacity: 1;\n}\n.timeline-preview-toggle:hover {\n  color: var(--timeline-dot-active-color);\n  background-color: var(--timeline-tooltip-bg);\n}\n.timeline-preview-toggle.active {\n  color: var(--timeline-dot-active-color);\n  background-color: var(--timeline-tooltip-bg);\n}\n\n.timeline-preview-panel {\n  position: fixed;\n  width: 320px;\n  background-color: var(--timeline-tooltip-bg);\n  border: 1px solid var(--timeline-tooltip-border);\n  border-radius: var(--timeline-tooltip-radius);\n  box-shadow: var(--timeline-tooltip-shadow);\n  z-index: 2147483645;\n  display: flex;\n  flex-direction: column;\n  opacity: 0;\n  transform: scale(0.96) translateX(8px);\n  transition:\n    opacity var(--timeline-tooltip-anim-in),\n    transform var(--timeline-tooltip-anim-in);\n  pointer-events: none;\n  overflow: hidden;\n}\n.timeline-preview-panel.visible {\n  opacity: 1;\n  transform: scale(1) translateX(0);\n  pointer-events: auto;\n}\n\n.timeline-preview-search {\n  padding: 8px 10px;\n  border-bottom: 1px solid var(--timeline-tooltip-border);\n  flex-shrink: 0;\n}\n.timeline-preview-search input {\n  width: 100%;\n  box-sizing: border-box;\n  border: 1px solid var(--timeline-tooltip-border);\n  border-radius: 6px;\n  padding: 5px 8px;\n  font-size: 13px;\n  line-height: 1.4;\n  background: transparent;\n  color: var(--timeline-tooltip-text);\n  outline: none;\n  transition: border-color 0.15s ease;\n}\n.timeline-preview-search input::placeholder {\n  color: var(--timeline-dot-color);\n  opacity: 0.7;\n}\n.timeline-preview-search input:focus {\n  border-color: var(--timeline-dot-active-color);\n}\n\n.timeline-preview-list {\n  flex: 1;\n  overflow-y: auto;\n  overscroll-behavior: contain;\n  padding: 4px 0;\n  max-height: calc(100% - 42px);\n}\n\n.timeline-preview-item {\n  padding: 6px 10px 6px 6px;\n  cursor: pointer;\n  color: var(--timeline-tooltip-text);\n  font-size: 13px;\n  line-height: 1.4;\n  border-left: 3px solid transparent;\n  display: flex;\n  align-items: baseline;\n  gap: 0px;\n  transition: background-color 0.1s ease;\n}\n.timeline-preview-item:hover {\n  background-color: rgba(59, 130, 246, 0.08);\n}\n.timeline-preview-item.active {\n  border-left-color: var(--timeline-dot-active-color);\n  background-color: rgba(59, 130, 246, 0.1);\n}\n.timeline-preview-item.starred .timeline-preview-index::after {\n  content: ' \\2605';\n  color: var(--timeline-star-color);\n  font-size: 11px;\n}\n\n.timeline-preview-index {\n  flex-shrink: 0;\n  font-size: 11px;\n  color: var(--timeline-dot-color);\n  min-width: 14px;\n  text-align: left;\n}\n\n.timeline-preview-text {\n  flex: 1;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.timeline-preview-empty {\n  padding: 16px 12px;\n  text-align: center;\n  color: var(--timeline-dot-color);\n  font-size: 13px;\n}\n\n/* Search highlights \u2014 preview panel */\n.timeline-preview-highlight {\n  background-color: rgba(59, 130, 246, 0.2);\n  color: inherit;\n  border-radius: 2px;\n  padding: 0;\n  pointer-events: none;\n}\n\n/* Search highlights \u2014 SPA conversation page */\nmark.timeline-search-highlight {\n  background-color: oklch(0.7227 0.192 149.5793 / 0.25);\n  color: inherit;\n  border-radius: 2px;\n  padding: 0;\n}\n\n/* Dark theme adjustments for preview panel */\n.theme-host.dark-theme .timeline-preview-panel {\n  background-color: rgba(11, 18, 32, 0.95);\n  backdrop-filter: blur(8px);\n  -webkit-backdrop-filter: blur(8px);\n}\n.theme-host.dark-theme .timeline-preview-item:hover {\n  background-color: rgba(96, 165, 250, 0.08);\n}\n.theme-host.dark-theme .timeline-preview-item.active {\n  background-color: rgba(96, 165, 250, 0.12);\n}\n.theme-host.dark-theme .timeline-preview-highlight {\n  background-color: rgba(96, 165, 250, 0.25);\n}\n.theme-host.dark-theme mark.timeline-search-highlight {\n  background-color: oklch(0.7729 0.1535 163.2231 / 0.3);\n}\n\n.theme-host.light-theme .timeline-preview-panel {\n  background-color: rgba(255, 255, 255, 0.95);\n  backdrop-filter: blur(8px);\n  -webkit-backdrop-filter: blur(8px);\n}\n\n";
  var ensureTimelineStyles = () => {
    if (document.getElementById(TIMELINE_STYLE_ID))
      return;
    const style = document.createElement("style");
    style.id = TIMELINE_STYLE_ID;
    style.textContent = TIMELINE_CSS;
    document.head.appendChild(style);
  };
  if (location.hostname === "gemini.google.com") {
    if (!window.__AISB_GEMINI_TIMELINE_LOADED__) {
      window.__AISB_GEMINI_TIMELINE_LOADED__ = true;
      ensureTimelineStyles();
      startTimeline();
    }
  }
})();
