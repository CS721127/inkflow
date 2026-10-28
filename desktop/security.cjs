const path = require('node:path');

const APP_URL = 'inkflow://app/';
const PUBLIC_ASSETS = /^(?:index\.html|(?:css|js|assets|vendor)\/[^\0\\]+)$/;

function assetPath(input, root) {
  try {
    const url = new URL(input);
    if (url.protocol !== 'inkflow:' || url.host !== 'app') return null;
    const name = decodeURIComponent(url.pathname.slice(1)) || 'index.html';
    if (!PUBLIC_ASSETS.test(name) || name.split('/').includes('..')) return null;
    const file = path.resolve(root, name);
    return file.startsWith(path.resolve(root) + path.sep) ? file : null;
  } catch {
    return null;
  }
}

function isExternalURL(input) {
  try { return ['https:', 'http:', 'mailto:'].includes(new URL(input).protocol); }
  catch { return false; }
}

module.exports = { APP_URL, assetPath, isExternalURL };
