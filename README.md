# Interactive Writer Pro — modular offline-first project

The **original UI** (editor on the left, Dashboard on the right), mobile layouts, Markdown preview, stationery-style PDF export, source/style preview, local Writing Analysis and optional saved drafts are retained. Auto-save remains **off by default**. The editor includes the welcome placeholder.

## 1. Start the project

Requirements: Node.js 18+; a connection for the **one-time `npm install`** step.

```bash
cd Interactive_Writer_Pro_Project
npm install
npm start
```

Open **http://localhost:4173** on the same computer. `npm install` downloads `harper.js@2.4.0` and copies its distributable JS/WASM/Worker files to **`vendor/harper/`**. There are **no CDN requests** while running the page. Grammar Check is initialized only when you click the button. Writing is checked on-device; text is not sent to Harper servers.

On subsequent launches, just run `npm start`. Once installation is complete, the project can be copied to an offline computer (include `vendor/harper/`). For a **fully offline** ZIP after the installation, run `npm run package:offline` (needs Python 3); it creates `Interactive_Writer_Pro_Offline_Ready.zip` with the grammar runtime included. You can deploy its static files (excluding `node_modules` and `scripts`) on GitHub Pages or any static host. The local server is a convenience, not a backend.

**Important note about this ZIP:** This package was created in a network-restricted environment; npm registry access failed, so the **actual Harper binaries are not included** in the initial ZIP. This is why `npm install` is mandatory before Grammar Check can work. Everything else runs immediately using `npm start`. We are not representing this file as a complete offline Harper distribution.

### Optional: start without installing anything

If you already have Node.js, `npm start` works without `npm install`: the editor, PDF stationery, markdown previews and Writing Analysis work; Grammar Check will show a clear message explaining that Harper is missing.

## 2. Project tree

```text
Interactive_Writer_Pro_Project/
├── index.html                        UI and markup
├── css/
│   ├── app.css                       Original visual design and mobile CSS
│   └── editor.css                    CodeMirror editor CSS
├── js/
│   ├── app.js                        App controller, views, exports, settings
│   ├── analyzer.js                   Offline rule-based writing analysis
│   ├── grammar.js                    Lazy-loaded local Harper adapter
│   ├── stationery.js                 Letterhead SVG templates + thumbnails
│   └── vendor/markdown-editor.bundle.js  Embedded CodeMirror and marked
├── assets/stationery/previews/      Six preview images (WebP)
├── vendor/harper/                   Harper JS/WASM/Worker runtime after npm install
├── scripts/
│   ├── vendor-harper.mjs             npm postinstall copier
│   ├── serve.mjs                     Zero-dependency localhost static server
│   └── pack_offline.py               Creates a full offline ZIP after npm install
├── tests/project.test.mjs
├── package.json
└── README.md
```

## 3. Features and controls

- **Grammar:** Analyze → Check grammar. English only; AU/UK/US/CA in Settings. Runs only after an explicit click.
- **Writing Analysis:** Analyze; independent of Harper and works offline.
- **PDF:** Choose a letterhead Style, Preview thumbnails, PDF → Save as PDF; standard A4 paper.
- **Save:** manual Save button; auto-save switch in Settings is **off by default**.
- **Clear:** Clear canvas (preserves storage) / Clear storage (separate destructive action).
- **Mobile:** Edit and Preview switch automatically adapts to small screens.

## 4. Data / privacy

`npm install` fetches **code**, not your document. Harper runs locally in a browser Web Worker (LocalLinter fallback). The rest of the app remains local. Text is written to browser LocalStorage **only when you explicitly click Save or enable Auto-save**. Some preferences like theme and grammar dialect are stored locally independently. `Clear storage` removes the project's saved state for that browser origin.

Harper: https://github.com/Automattic/harper (Apache-2.0). CodeMirror 5 and marked are open-source tools already bundled in the original HTML; their license headers remain in `js/vendor/markdown-editor.bundle.js`.

## 5. Development and troubleshooting

```bash
npm run test
npm run setup:harper  # re-copy runtime after npm install
PORT=8080 npm start    # optional custom port
npm run package:offline  # create an offline ZIP after installing Harper
```

Do not double-click `index.html` as `file://` when using modules, Web Workers or WASM: modern browser security rules prevent reliable loading. Use the localhost server above. On mobile, serve with a LAN-accessible static host (or deploy to any static host); `scripts/serve.mjs` deliberately listens only on 127.0.0.1 for safety.

Harper is not a replacement for human proofreading and currently focuses on English.
