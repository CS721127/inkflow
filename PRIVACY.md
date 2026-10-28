# Privacy and local storage

InkFlow is a **client-side Markdown writing application**. It has no account system or server-side document storage, and it does not send document text to any grammar-checking API.

## What stays local

- The editor and Markdown renderer run in your browser.
- Writing Analysis uses local heuristic rules.
- When installed, Harper performs English grammar/spelling checks locally through browser JS/WASM (with a Web Worker when supported).
- MathJax and stationery design files are served from the same local/static site.
- Imported files are processed in the browser; edits do not overwrite disk originals.

## Browser storage

- **Auto-save is disabled by default.** Manually pressing Save or enabling auto-save stores your current workspace in browser LocalStorage.
- Theme, dialect and some UI preferences may be stored even when auto-save is disabled.
- **Clear canvas** removes content from the current editing view; **Clear storage** removes the app's saved LocalStorage state for the current origin. Download files/backups before clearing.
- Browser storage is origin-specific: opening the site from a different host/port/device does not share documents automatically.
- For compatibility with saved workspaces from earlier versions, internal storage keys retain the `writer_pad_` prefix.

## Dependencies and hosting

The Mac app bundles the editor, MathJax and Harper and processes documents locally. Its workspace and settings are stored separately from your browser, in InkFlow's application data under `~/Library/Application Support/InkFlow`. The app does not add analytics, document uploads or automatic update requests. External document images can still contact their specified hosts, and clicking external links opens your default browser. Export workspace before clearing app storage or migrating to another device.

A one-time `npm install` downloads Harper's executable files from npm; **it does not submit your documents**. If InkFlow is deployed by someone else, their web host necessarily receives ordinary requests for static files and may maintain standard access logs. The source project itself does not include analytics or an account backend.

## Limits

No client-side app can guarantee privacy against browser extensions, malware, a compromised device or an untrusted hosting origin. Use a host you trust, review downloaded scripts, and keep your own backups.
