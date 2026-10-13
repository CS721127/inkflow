# Third-party software

- CodeMirror 5 (MIT) and marked (MIT): embedded under `js/vendor/markdown-editor.bundle.js`, originally provided in the user's source HTML. See license comments in the JS file.
- Harper (`harper.js`, Apache-2.0): optional English grammar engine installed with `npm install`, then copied into `vendor/harper`. See https://github.com/Automattic/harper. No Harper binaries were downloaded or copied into this initial ZIP.

This package must not be described as bundling Harper until `npm install` successfully populates `vendor/harper/`.
