# InkFlow for macOS

## Delivery contract

Package the existing editor as a standalone, local-first Mac application. Ship version 1.6.0 for Apple Silicon and Intel through this repository's GitHub Releases. Keep the website and its existing development commands working.

The desktop shell uses Electron with a sandboxed renderer, no Node access from documents, a restricted local asset protocol, and native File/Edit/View/Window menus. All editor assets, MathJax and Harper ship inside the app. Saved workspaces live in InkFlow's own application storage and do not share browser storage. Save remains explicit and auto-save remains opt-in. Closing a window with unsaved work asks before discarding it.

## Implementation and checks

1. Add the local desktop shell and test asset routing, external URL restrictions and unsaved-work protection.
2. Package both Mac architectures with an app icon and drag-to-Applications installer.
3. Run the existing regression suite, dependency audit, static build and a real Electron smoke test covering editing, saving/restoring, math, grammar and PDF/source export.
4. Publish a version tag and GitHub release with installers, archives, checksums and installation notes. Future version tags rebuild both architectures in GitHub Actions.

Desktop source lives in `desktop/`, build helpers in `scripts/`, regression tests in `tests/`, and release automation in `.github/workflows/`. Use the existing two-space JavaScript style, CommonJS for Electron entry points, and Node's built-in test runner. No secrets or signing credentials belong in source control. This release is ad-hoc signed, not Apple notarized; installation notes must say so.

## Commands

```sh
npm ci --ignore-scripts
npm run setup:harper
node node_modules/electron/install.js
npm test
npm run build
npm run desktop
npm run test:desktop
npm run build:mac
```

## Installation

Download the DMG matching your Mac from [GitHub Releases](https://github.com/CS721127/inkflow/releases/latest), open it, and drag InkFlow to Applications. Choose `arm64` for Apple Silicon (M-series) or `x64` for Intel. macOS 13 or later is required.

This initial release is not signed with an Apple Developer ID or notarized. If macOS blocks it, attempt to open InkFlow, then use **System Settings → Privacy & Security → Open Anyway** to approve this downloaded app. Do not disable Gatekeeper globally. ZIP archives are also available.

Use Save (⌘S) to store a workspace on this Mac. Download source files or Export workspace for portable backups. Browser workspaces can be transferred with Export workspace → Import workspace. Uninstalling the application does not delete its saved workspace in `~/Library/Application Support/InkFlow`.

## Release and rollback

Run all checks, set `package.json` to the intended version, and push the matching `v<version>` tag. The macOS release workflow builds and smoke-tests both architectures, verifies ad-hoc signatures, creates a draft release, uploads checksums and installers, then publishes it. electron-builder applies an ad-hoc signature; this does not provide Apple verification. Review and adjust the signing configuration before introducing Developer ID credentials.

If a release has a blocking issue, mark it as a prerelease and direct users to the previous version; publish a fixed version with a new tag. Never overwrite an already published installer. Keep portable workspace backups before downgrading.

Implementation references: [Electron security](https://www.electronjs.org/docs/latest/tutorial/security), [custom protocols](https://www.electronjs.org/docs/latest/api/protocol), [macOS packaging](https://www.electron.build/mac/), and [GitHub runner architectures](https://docs.github.com/en/actions/reference/runners/github-hosted-runners).
