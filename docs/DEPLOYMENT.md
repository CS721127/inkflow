# Deploy InkFlow (static hosting)

InkFlow needs only a **static HTTP server**, not an API, database or Node.js process in production.

## Create deployable files

From the project root:

```bash
npm install          # one-time: include optional Harper runtime in deployment
npm test
npm run build
```

This writes a **`dist/`** folder containing `index.html`, CSS, JS, local MathJax, stationery images and (when installed) Harper runtime. There are **no CDN dependencies** at runtime. If you skip `npm install`, the site still works but Grammar Check remains unavailable.

The output can be uploaded to GitHub Pages, Netlify, Cloudflare Pages, S3 or any static host. Upload the **contents** of `dist/`, not the project root's `node_modules/`, tests or internal build scripts.

## GitHub Pages

1. Push InkFlow to your own GitHub repository.
2. On a computer with Node.js, run `npm install && npm run build`.
3. Deploy the contents of `dist/` using your preferred GitHub Pages workflow (Actions artifact or publish branch).
4. In repository **Settings → Pages**, enable the deployment method you selected.
5. Visit the Pages URL and test Markdown preview, math, PDF and Grammar Check.

InkFlow references local resources with relative paths and can be hosted under a project subdirectory (`https://USERNAME.github.io/REPO/`). Do not deploy `node_modules/`.

For automated CI, `.github/workflows/ci.yml` checks `npm test` and the static build. It deliberately **does not automatically publish your site**; choose when and where to deploy.

## Local testing

```bash
npm start
```

Opens at `http://localhost:4173`. This server binds to 127.0.0.1 only, so another device on your Wi-Fi cannot access it. To test on a phone, deploy to a static host or use a deliberately configured LAN server on a trusted network. School/university Wi-Fi networks may block peer-to-peer traffic.

## PDF printing

InkFlow builds independent A4 SVG stationery backgrounds for each page. Most desktop Chromium printing works well. Browser print dialogs can override print settings; in particular, iPhone Safari still requires manual device-level verification. If your browser exposes print options, use A4 and the default/100% scale without extra printer margins.
