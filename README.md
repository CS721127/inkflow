# Interactive Writer Pro — modular offline-first project

The **original UI** (editor on the left, Dashboard on the right), mobile layouts, Markdown preview, stationery-style PDF export, source/style preview, local Writing Analysis and optional saved drafts are retained. Auto-save remains **off by default**. The editor includes the welcome placeholder.

## 1. Start the project

Requirements: Node.js 18+; a connection for the **one-time `npm install`** step.

```bash
cd Interactive_Writer_Pro_Expanded_Styles
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
Interactive_Writer_Pro_Expanded_Styles/
├── index.html                        UI and markup
├── css/
│   ├── app.css                       Original visual design and mobile CSS
│   └── editor.css                    CodeMirror editor CSS
├── js/
│   ├── app.js                        App controller, views, exports, settings
│   ├── analyzer.js                   Offline rule-based writing analysis
│   ├── grammar.js                    Lazy-loaded local Harper adapter
│   ├── stationery.js                 Six original SVG stationery templates + thumbnails
│   ├── stationery-extra.js           Six additional vector stationery themes
│   └── vendor/markdown-editor.bundle.js  Embedded CodeMirror and marked
├── assets/stationery/previews/      12 preview images (WebP)
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


## 6. New in v1.1 — Math, fullscreen and local multi-file workspace

- **Offline LaTeX maths:** Bundled **MathJax** (Apache-2.0), with `$x^2$` or `\(x^2\)` inline, `$$` on separate lines or `\[...\]` for display equations. The first equation lazily loads MathJax from `vendor/mathjax/` without contacting a CDN. Maths also appear in printed/PDF Markdown. Use the ∑ buttons in the formatting toolbar.
- **Full-screen preview:** Click **⛶ Fullscreen** near Edit/Split/Preview, and **Esc** or **✕ Close** to return. Uses an overlay for Safari/iOS support, no Fullscreen API permission required.
- **Local multi-file:** Import multiple `.md`, `.markdown`, `.txt` files, or select **Folder** on desktop to load Markdown files from a folder. The file strip allows switching and closing documents. Changes in each tab remain in memory during the session; auto-save still defaults to OFF. Download downloads the **current file**, while **↓ Workspace** exports a JSON backup containing all open files, and **↑ Workspace** restores it. The normal **Save** button saves the whole workspace in browser LocalStorage.
- Relative image paths cannot be read from the user's disk without permission; reference images served with the site or use public URLs. **Folder** import does not grant ongoing disk access and does not write files back to the directory. Changes are exported via downloads.
- For multi-file sessions, memory-only tabs do not persist across reloads unless you clicked **Save**, enabled auto-save, or downloaded a workspace backup.
- **Grammar runtime:** Harper still requires the initial `npm install` as explained above. MathJax, unlike Harper, is included in the ZIP already.

Example:

```markdown
# Equations
Inline: $E=mc^2$

$$
\int_0^1 x^2\, dx=\frac13
$$
```

## 7. PDF pagination fix (v1.2)

The old export used one `position:fixed` 210 × 297 mm illustration for the entire document. Some print engines (especially mobile browsers) printed that illustration only on page 1 or positioned its corners outside the paper.

**Fixed:** `js/pdf-pages.js` constructs explicit A4 sheets. Each page gets its own full-sheet SVG decoration, while its text flows inside safe stationery-specific margins. Long paragraphs and code blocks can split across sheets; tables repeat their header as rows paginate. `css/pdf-pages.css` controls the physical page geometry (`@page` A4, zero outer printer margins). The PDF still uses the native browser print interface, so text remains selectable and formulas are rendered with bundled MathJax.

On mobile choose **PDF** → browser **Save as PDF**, and select **A4**, 100%/default scale and no additional margins when those options appear. On Safari/iOS the print/share panel may expose fewer controls; the browser or a physical printer can override the requested paper size. The fix has been tested with Chromium at desktop and 320–390px mobile viewports, but native iOS Safari print needs device confirmation.

Regression test: `npm test`. Source is 100% client-side and all twelve stationery styles use the same pagination system. No additional dependency or CDN was added.

## 8. Six extra export styles (v1.3)

The Style menu and Preview gallery now include **twelve** A4 styles in total. The six new original vector themes are:

| Style | Appearance |
|---|---|
| Sakura blossom | Pale blush paper, delicate cherry blossoms and falling petals |
| Sage botanical | Sage-green plant illustrations and double botanical border |
| Graph notebook | Pale-blue five-millimetre grid, left binder holes and margin |
| Cozy coffee | Warm cream letterhead, coffee beans and a cup in the footer |
| Moonlit stars | Night-blue astronomy header/footer and small gold constellations |
| Pastel geometric | Clean contemporary colored shapes and understated geometry |

All six use `js/stationery-extra.js` plus source SVGs in `assets/stationery/art/`. The original six were not modified. The new preview thumbnails (`assets/stationery/previews/*.webp`) are generated locally by running `python3 scripts/generate-stationery-extras.py` (requires Python + Pillow + CairoSVG for regeneration; these packages are **not** needed by end users). The printing/export implementation is unchanged from v1.2: an independent vector illustration per physical A4 sheet with safe inner margins. `npm test` checks the available styles and assets; the actual long-document export was tested in Chromium at 390px mobile width and 1440px desktop width. Native Safari print remains device-dependent.
