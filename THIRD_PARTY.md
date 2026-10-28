# Third-party notices

InkFlow includes or optionally installs the following independently licensed dependencies. The project MIT license does **not** replace the original third-party licenses or copyright notices.

| Component | Where it is used | License | Distribution status |
|---|---|---|---|
| CodeMirror 5 | `js/vendor/markdown-editor.bundle.js` | MIT | Bundled; original header retained |
| marked | `js/vendor/markdown-editor.bundle.js` | MIT | Bundled |
| MathJax 3.2.1 | `vendor/mathjax/` | Apache-2.0 | Bundled, with `vendor/mathjax/LICENSE.txt` |
| Harper (`harper.js@2.4.0`) | `vendor/harper/` | Apache-2.0 | **Not** in the original ZIP; npm install downloads/copies runtime |
| Electron | Mac desktop runtime | MIT plus Chromium/Node and other upstream notices | Bundled in Mac app with `LICENSE.electron.txt` and `LICENSES.chromium.html` |
| electron-builder | Mac packaging tool, development only | MIT | Installed from the locked npm dependency tree |

Official projects: [CodeMirror](https://codemirror.net/), [marked](https://marked.js.org/), [MathJax](https://www.mathjax.org/), [Harper](https://github.com/Automattic/harper).

When redistributing a fully offline build, include the bundled licenses and upstream notices. Harper's package and license are obtained by `npm install` before `npm run package:offline`. The Mac release includes Harper and its upstream notices; do not assume the grammar engine is present in a source-only archive.
