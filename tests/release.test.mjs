import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const content = async (file) => readFile(resolve(root, file), 'utf8');

test('InkFlow branding and package metadata', async () => {
  const html = await content('index.html');
  const packageJson = JSON.parse(await content('package.json'));
  assert.match(html, /<title>InkFlow/);
  assert.match(html, /Welcome to InkFlow/);
  assert.equal(packageJson.name, 'inkflow');
  assert.equal(packageJson.version, '1.6.0');
  assert.equal(packageJson.private, true);
});

test('release documentation and legal notices are present', async () => {
  for (const file of ['README.md','LICENSE','CHANGELOG.md','CONTRIBUTING.md','PRIVACY.md','SECURITY.md','THIRD_PARTY.md','docs/DEPLOYMENT.md']) {
    assert.ok((await stat(resolve(root,file))).size > 200,file);
  }
  assert.match(await content('README.md'), /Harper/);
  assert.match(await content('THIRD_PARTY.md'), /MathJax/);
});
