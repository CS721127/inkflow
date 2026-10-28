# Changelog

InkFlow tracks user-facing changes here. Earlier entries summarize saved development milestones; Git commits 1–12 are reconstructed from archived snapshots, rather than original commit timestamps.

## [1.6.0] — Mac app (2026-10-29)

- Add a standalone macOS application with native menus, app icon, keyboard shortcuts and drag-to-Applications installers for Apple Silicon and Intel.
- Bundle all editor assets, MathJax and Harper for offline use, with a sandboxed renderer and restricted local asset routing.
- Warn before discarding unsaved desktop work; keep manual Save and opt-in auto-save in separate application storage.
- Add desktop regression and runtime smoke tests, reproducible packaging, and a GitHub release workflow with checksums.

## Unreleased — Mobile A4 export and editor placeholder

- Add a direct, browser-local A4 PDF download (explicit PDF page dimensions) to bypass mobile print scaling.
- Keep native Print available on desktop. Direct downloads are rasterized, unlike native print.
- Remove the redundant “Start writing in Markdown” textarea placeholder while retaining the detailed welcome guide.
- Avoid upper-left Sakura artwork overlapping the document heading.


## [1.4.0] — UI refinement (2026-10-14)

- Refreshed the writing layout with a collapsible workspace sidebar and a minimal, two-step export flow.
- Moved document clearing to the editor's main action bar.
- Reduced editor and rendered-preview padding, and added an opt-in setting to show or hide desktop editor line numbers.
- Restored mobile Split view with vertically stacked panes and preserved native text selection.
- Expanded the empty editor guide without adding any content to actual documents.
- Kept PDF pagination, all twelve stationery styles, and the existing local-first storage controls.

## [1.4.0] — Release preparation (2026-10-13)

- Adopt the **InkFlow** project name throughout the public-facing application and documentation.
- Add publish-ready README, Chinese quick start, MIT license, third-party notices, contributing, privacy, security and deployment guides.
- Add repeatable static distribution command (`npm run build`) and GitHub CI checks.
- Keep editor behavior and the existing local browser storage keys unchanged to avoid invalidating older saved workspaces.

## [1.3.0] — Additional stationery styles

- Add sakura, botanical, grid notebook, coffee, night sky and geometric themes, for **12** PDF themes overall.
- Extend the style gallery with previews for new themes.

## [1.2.0] — PDF pagination

- Generate an independent A4 background per page for reliable multi-page print output.
- Improve splitting of long content, table pagination and MathJax printing.

## [1.1.0] — Math and workspace

- Add MathJax equations, full-screen preview and multiple open Markdown documents.
- Add JSON workspace export/restore.

## [1.0.0] — Core writer

- Markdown editor, preview, optional Harper grammar checking, local writing analysis, opt-in auto-save and stationery PDF export.

