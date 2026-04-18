# Native Messaging Setup

AI Sidebar now supports writing Markdown mirrors through a native host, so users no longer need to manually start `sync-server`.

## 1. Find the extension ID

1. Open `chrome://extensions`
2. Enable developer mode
3. Copy the ID of your unpacked `AI Sidebar` extension

## 2. Install the native host manifest

Chrome on macOS:

```bash
node scripts/install-native-host.cjs --browser=chrome --extension-id=<YOUR_EXTENSION_ID>
```

Edge on macOS:

```bash
node scripts/install-native-host.cjs --browser=edge --extension-id=<YOUR_EXTENSION_ID>
```

Chromium on macOS:

```bash
node scripts/install-native-host.cjs --browser=chromium --extension-id=<YOUR_EXTENSION_ID>
```

## 3. Output directory priority

By default, the native host now reuses RI/Relearn's `exportLocalPath` from:

```text
~/Library/Application Support/replace-information/config.json
```

Mirrored AI Sidebar conversations are written under:

```text
<exportLocalPath>/AI-Sidebar/YYYY-MM-DD/AI-Sidebar.md
```

If you want AI Sidebar to use a different directory, you can still override it with `sync/config.json`.

## 4. Optional: override the Markdown output directory

Create `sync/config.json`:

```json
{
  "markdownBaseDir": "/absolute/path/to/your/knowledge-base"
}
```

If no config is provided, Markdown files default to:

```text
<RI exportLocalPath>/AI-Sidebar/YYYY-MM-DD/AI-Sidebar.md
```

If RI/Relearn is not installed or has no `exportLocalPath`, AI Sidebar falls back to:

```text
sync/markdown/YYYY-MM-DD/AI-Sidebar.md
```

## 5. Reload the extension

After installing the host manifest, reload the unpacked extension from `chrome://extensions`.

Once reloaded, AI Sidebar will try the native host first. The old localhost sync server remains only as a fallback path.
