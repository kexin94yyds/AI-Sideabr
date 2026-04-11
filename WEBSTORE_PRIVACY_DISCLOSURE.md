# Chrome Web Store Privacy Disclosure Draft

Last updated: April 11, 2026

## Dashboard field rewrite

Use the following wording in the Chrome Web Store Privacy form.

### Single purpose description

Paste this:

> Open supported AI websites in Chrome's side panel and provide closely related page helpers and user-triggered actions, such as sending selected text, capturing screenshots, exporting conversations, and opening the floating parallel AI panel.

### Permission justifications

Use these in the permission justification fields:

- `sidePanel`
  - `Required to display the extension UI in Chrome's side panel so users can access supported AI websites without leaving their current page.`
- `declarativeNetRequest`
  - `Used to adjust response headers on supported provider pages for embedding and compatibility in the side panel or related page helpers. It is not used for unrelated background traffic.`
- `declarativeNetRequestWithHostAccess`
  - `Used together with declarativeNetRequest on supported hosts so compatibility rules apply only where the side panel or related helper features require them.`
- `tabs`
  - `Used to read current tab context, open supported provider pages, and coordinate user-triggered actions between the active tab and the side panel.`
- `activeTab`
  - `Used only for user-triggered actions on the current page, such as sending selected text or a screenshot into the side panel.`
- `storage`
  - `Used to store settings, preferences, history, favorites, pending side panel payloads, and other locally saved extension state.`
- `cookies`
  - `Used to detect sign-in state on supported services and preserve supported compatibility behavior such as local backup and restore of Perplexity session cookies inside browser storage.`
- `scripting`
  - `Used to inject helper scripts on supported AI pages and, when the user explicitly opens the floating parallel panel, on the current page.`
- `contextMenus`
  - `Used to add the "Send to AI Sidebar" action to the browser context menu for selected text.`
- `Host permissions`
  - `Most host permissions are limited to supported AI and productivity websites where the extension provides side panel access or page-level helper features. The extension also requests optional runtime host permission for the current origin only when the user explicitly opens the floating parallel panel or approves another user-invoked cross-site action.`

### Remote code

- `Are you using remote code?`
  - `No, I am not using Remote code`
- `Justification`
  - `All extension logic is packaged inside the submitted extension. The extension may open third-party websites in iframes or tabs as web content, but it does not load or execute external JavaScript or Wasm inside privileged extension contexts.`

## Privacy policy URL

Use a public HTTPS URL in the dedicated dashboard field:

- `https://aibar.xin/privacy`

Do not leave this only in the description, support links, or reviewer notes.

## Recommended dashboard disclosures

### Does the item handle personal or sensitive user data?

`Yes`

### Data types to select

With the current codebase, select:

- `Authentication information`
- `Website content`
- `Web history`
- `Personal communications`
- `User activity`

Why `User activity` is included:

- The current implementation temporarily relays keyboard input and paste events from the active page into the side panel after a user-triggered action.
- If you remove that behavior before resubmission, revisit this checkbox decision.

### How the data is used

Use wording like this:

> AI Sidebar uses this data only for user-facing features. The extension opens supported AI websites in Chrome's side panel, detects sign-in state, injects page helpers on supported sites, stores settings, history, and favorites locally, supports user-triggered selection, screenshot, export, and floating panel actions, and may temporarily relay user input from the active page into the side panel when the user invokes that feature. Core functionality does not send this data to developer-operated remote servers.

### Data sale or unrelated transfer

- Sold to third parties: `No`
- Used or transferred for personalized advertising: `No`
- Used or transferred for creditworthiness or lending decisions: `No`
- Used or transferred for purposes unrelated to the extension's single purpose: `No`

## Reviewer note draft

> We fixed the privacy issue by adding a public privacy policy URL in the dedicated Chrome Web Store field and by aligning the privacy policy, dashboard disclosures, and extension behavior. The extension primarily stores data locally in the browser. It may process authentication information, supported website content, browsing history used for user-facing features, and user-triggered content such as saved/exported conversations, selections, and screenshots. The extension does not send core user data to developer-operated remote servers. Third-party AI providers receive user input directly when the user chooses to use those services. If a localhost sync service is running on the user's device, the extension may sync history and favorites only to that local service.

If you keep the current typing relay behavior, use this stronger version instead:

> We updated this item to align the extension behavior, the privacy policy, and the Chrome Web Store privacy disclosures. The extension primarily stores data locally in the browser. It may process authentication information, supported website content, browsing history used for user-facing features, user-triggered content such as saved or exported conversations, selections, and screenshots, and limited user activity when the user explicitly invokes the input relay feature that sends current-page input into the side panel. Core functionality does not send this data to developer-operated remote servers. Third-party AI providers receive user input directly when the user chooses to use those services. If a localhost sync service is running on the user's own device, the extension may sync history and favorites only to that local service.

## Submit in this order

1. Deploy the website project so the public URL `https://aibar.xin/privacy` shows the same text as the current privacy policy draft.
2. Open the public URL in an incognito window and verify it loads without login.
3. Upload the current package at `/Users/apple/gemini/AI-Sidebar /dist/ai-sidebar-chrome-webstore.zip`.
4. Paste the public URL into the dedicated `Privacy policy URL` field in the Chrome Web Store dashboard.
5. Complete the Privacy practices form using the answers in this file.
6. Paste the reviewer note draft into the reviewer comments field.
7. Double-check that the dashboard disclosures, the public privacy page, and the extension's actual behavior still match before clicking resubmit.
