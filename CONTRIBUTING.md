# Contributing to InkFlow

Thanks for improving InkFlow. Contributions to accessibility, browser compatibility, Markdown/MathJax quality, security and PDF pagination are especially welcome.

## Set up

1. Fork or clone the repository; use **Node.js 18+**.
2. Run `npm start` to use the editor at `http://localhost:4173`.
3. Run `npm install` if your change involves optional Harper grammar integration.
4. Run `npm test` and `npm run build` before opening a pull request.

## Pull requests

- Open one focused pull request per feature or fix, with a clear explanation and steps to reproduce.
- Keep the original responsive UI style unless a design change is intentional and discussed.
- Include regression tests when changing analysis, math rendering, saving, workspace behavior or pagination.
- For CSS/PDF changes, verify desktop and mobile layouts; print/PDF validation in real browsers remains important.
- Do not commit `node_modules/`, `dist/`, user documents, or machine-local settings.
- Avoid new CDN calls or changes that silently upload user documents. Prefer local, lazy-loaded code.

## Code organization

- `js/app.js` coordinates UI state and events; specialized logic lives in neighboring modules.
- `js/pdf-pages.js` and `css/pdf-pages.css` control physical PDF pages; maintain a separate background for each A4 page.
- `js/stationery*.js` and `assets/stationery/` define export themes.
- `js/grammar.js` must work when Harper is absent: keep the explicit user-facing fallback.

## License contributions

By contributing, you agree that your contribution can be distributed under the project's MIT license. Only submit code, artwork and text that you have rights to contribute. Keep required third-party copyright/license notices.
