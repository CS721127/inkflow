import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { assetPath, isExternalURL, APP_URL } = require('../desktop/security.cjs');

test('desktop serves only bundled public assets', () => {
  assert.equal(assetPath(APP_URL, '/bundle'), '/bundle/index.html');
  assert.equal(assetPath('inkflow://app/js/app.js', '/bundle'), '/bundle/js/app.js');
  assert.equal(assetPath('inkflow://app/vendor/harper/index.js', '/bundle'), '/bundle/vendor/harper/index.js');
  for (const url of [
    'inkflow://other/index.html', 'https://app/index.html',
    'inkflow://app/package.json', 'inkflow://app/desktop/main.cjs',
    'inkflow://app/js/%2e%2e%2f%2e%2e%2fsecret',
    'inkflow://app/js/..%2fdesktop/main.cjs',
    'inkflow://app/js/%00.js', 'inkflow://app/js/%ZZ',
    'inkflow://app/js/..%5c..%5csecret',
  ]) assert.equal(assetPath(url, '/bundle'), null, url);
});

test('desktop opens only safe web and email links externally', () => {
  for (const url of ['https://example.com/a', 'http://example.com', 'mailto:writer@example.com']) {
    assert.equal(isExternalURL(url), true, url);
  }
  for (const url of ['file:///etc/passwd', 'javascript:alert(1)', 'inkflow://app/', 'tel:123', 'bad url']) {
    assert.equal(isExternalURL(url), false, url);
  }
});
