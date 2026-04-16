# Troubleshooting Guide

This document records common issues encountered during development and their solutions.

## Table of Contents
- [NotebookLM Title Capture](#notebooklm-title-capture)

---

## NotebookLM Title Capture

### Problem
When starring/favoriting NotebookLM pages, the extension was not capturing the real-time project title. Instead, it was falling back to generic titles like "NotebookLM" or "Untitled" from standard heading elements or OpenGraph meta tags.

**Example:**
- Expected: "Google AI Studio: The Ultimate Vibe Coding Platform"
- Actual: "NotebookLM" or generic fallback

### Root Cause
NotebookLM uses an Angular-based UI with dynamically rendered components. The project title is stored in a specific Angular Material component structure:

```html
<editable-project-title>
  <div class="title">
    <div class="title-label">
      <span class="title-label-inner mat-title-large">
        Google AI Studio: The Ultimate Vibe Coding Platform
      </span>
    </div>
    <input class="title-input mat-title-large" style="width: 524px;">
  </div>
</editable-project-title>
```

The original implementation only checked standard heading elements (`h1`, `h2`) and OpenGraph meta tags, which don't contain the dynamically updated project title.

### Solution
Enhanced the `resolveNotebookLMTitle()` function in `content-scripts/url-sync.js` with:

1. **Multiple selector strategies with priority order:**
   ```javascript
   // Priority 1: .title-label-inner (real-time project title)
   const titleInner = deepFind(document, (el) => {
     if (!el || !el.classList) return false;
     return Array.from(el.classList).some(c => c === 'title-label-inner');
   });
   
   // Priority 2: mat-title-large spans in title containers
   // Priority 3: editable-project-title custom elements
   // Priority 4: input.title-input with values
   // Priority 5: Standard heading elements (h1, h2)
   // Priority 6: OpenGraph meta tags (fallback)
   ```

2. **Deep DOM traversal:**
   - Used the existing `deepFind()` BFS utility to traverse Angular's component structure
   - Handles shadow DOM and dynamically generated content

3. **Real-time change detection:**
   ```javascript
   // NotebookLM-specific title observer
   if (location.origin === 'https://notebooklm.google.com') {
     const observeNotebookLMTitle = () => {
       const titleInner = deepFind(document, (el) => {
         return el.classList && Array.from(el.classList).some(c => c === 'title-label-inner');
       });
       if (titleInner) {
         const moTitle = new MutationObserver(() => send(false, 'notebooklm-title-change'));
         moTitle.observe(titleInner, { subtree: true, characterData: true, childList: true });
         return true;
       }
       return false;
     };
     // Retry mechanism for Angular app initialization delays
     if (!observeNotebookLMTitle()) {
       setTimeout(() => observeNotebookLMTitle(), 500);
     }
   }
   ```

4. **Retry mechanism:**
   - Immediate attempt on script load
   - 500ms retry (for Angular bootstrapping)
   - 2000ms final retry (for slow networks)
   - Continuous monitoring via MutationObserver on body element

### Files Changed
- `content-scripts/url-sync.js`: Enhanced `resolveNotebookLMTitle()` function and added NotebookLM-specific DOM observer

### Testing
To verify the fix:
1. Load extension in Chrome (`chrome://extensions/`)
2. Open NotebookLM project in the side panel
3. Enable debug logging: `localStorage.setItem('insidebar_debug', '1')` in DevTools console
4. Star/favorite the current page
5. Check History panel - title should show the actual project name
6. Check console logs for `[insidebar][url-sync] notebooklm.title.titleInner`

### Prevention
For future provider integrations with dynamic/SPA frameworks:

1. **Inspect the actual DOM structure** using Chrome DevTools:
   - Right-click → Inspect Element
   - Look for framework-specific patterns (Angular: `ng-*`, React: `data-reactid`, Vue: `v-*`)

2. **Use `deepFind()` for complex DOM structures:**
   - Handles shadow DOM and nested components
   - More reliable than `querySelector` for SPAs

3. **Implement retry mechanisms:**
   - SPA frameworks often render asynchronously
   - Use timeouts and MutationObservers

4. **Add debug logging:**
   - Use `dbg()` helper for each extraction strategy
   - Makes troubleshooting much easier

5. **Create priority chains:**
   - Try most specific selectors first (framework components)
   - Fall back to generic selectors (h1, og:title)
   - Always have a last-resort fallback

### Related Code Patterns
Similar title extraction logic exists for:
- **Gemini**: Multiple strategies for conversation titles
- **ChatGPT**: Session-based title extraction
- **DeepSeek**: Navigation-aware title detection

Refer to these implementations when adding new providers.

---

## Template for New Issues

When documenting new issues, use this template:

### Problem
[Brief description of the issue]

### Root Cause
[Technical explanation of why the problem occurred]

### Solution
[Detailed solution with code examples]

### Files Changed
[List of modified files]

### Testing
[How to verify the fix]

### Prevention
[Guidelines to avoid similar issues in the future]
