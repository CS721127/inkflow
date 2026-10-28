InkFlow is now a standalone Mac app. Write Markdown, preview equations, check grammar locally, and export styled A4 PDFs without a browser, account or internet connection.

- Native Mac menus and shortcuts: New (⌘N), Open (⌘O), Save workspace (⌘S), Export source (⇧⌘S), Export PDF (⌘P), and Settings (⌘,).
- Bundled MathJax, Harper grammar engine and all 12 PDF stationery styles.
- Separate application storage, opt-in auto-save, and a native warning before discarding unsaved writing.
- Sandboxed editor with Node access disabled and external links opening in your browser.

### Download and install

Requires **macOS 13 Ventura or later**.

| Your Mac | Download |
| --- | --- |
| Apple Silicon (M1, M2, M3, M4 and later) | `InkFlow-<version>-mac-arm64.dmg` |
| Intel | `InkFlow-<version>-mac-x64.dmg` |

Open the DMG, then drag **InkFlow** into **Applications**. ZIP archives are also included. Use `SHA256SUMS.txt` to verify your download if needed.

**This release is ad-hoc signed and is not Apple Developer ID signed or notarized.** If macOS blocks the app, attempt to open it, then approve InkFlow under **System Settings → Privacy & Security → Open Anyway**. Keep Gatekeeper enabled.

Save stores your workspace in this app on your Mac. To move existing browser documents into the Mac app, use **Export workspace** in the browser, then **Import workspace** in InkFlow. Use source downloads or workspace backups to keep portable copies of your writing.

Both Mac architectures pass the regression tests and offline desktop smoke test before release. The smoke test covers editing, local math and grammar, saving/restoring, source downloads, A4 PDF export and native print-to-PDF.
