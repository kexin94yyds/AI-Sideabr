# Chrome Web Store Submission Pack

Last updated: March 26, 2026

## Ready-to-submit basics

- Extension name: `AI Sidebar`
- Version: `0.0.1`
- Manifest version: `3`
- Primary category suggestion: `Productivity`
- Single purpose summary: Open supported AI websites in Chrome side panel and add optional page productivity tools.

## Recommended store description

AI Sidebar brings supported AI websites into Chrome's side panel so you can switch between assistants without leaving your current page. It also includes optional page-level tools for supported sites such as Gemini layout controls, quick access helpers, and workflow utilities.

## One-line short description

Use AI websites in Chrome side panel with optional productivity tools for supported pages.

## Privacy disclosure baseline

- User data is primarily stored locally in Chrome extension storage.
- Core functionality does not send browsing data to the developer's own servers.
- Third-party AI websites receive data directly from the user when those sites are used.
- Publish a support contact before submitting.

## Submission checklist

1. Upload the ZIP generated from `scripts/build-webstore-package.sh`.
2. Set the store name to `AI Sidebar`.
3. Paste the short description and full description.
4. Upload store screenshots and icons.
5. Link or paste the privacy policy from `PRIVACY_POLICY.md`.
6. Paste reviewer notes from `WEBSTORE_TEST_INSTRUCTIONS.md`.
7. Double-check the "single purpose" statement matches the listing.
8. Confirm all declared permissions are explained in the privacy and reviewer notes.

## High-risk review items

- Broad host access across many AI websites.
- Cookie and identity access.
- Declarative net request permissions used for compatibility behavior.
- Any feature that changes page layout or injects controls into third-party sites.

These items are defensible, but the listing and reviewer notes must explain them clearly and consistently.

## Before upload

1. Verify extension name, icon, and description are not placeholders.
2. Verify no local-only files are included in the ZIP.
3. Verify screenshots match the current UI.
4. Verify any optional remote sync or analytics claims are accurately disclosed.
