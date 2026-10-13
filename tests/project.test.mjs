import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
test('local project references and UI preserved',async()=>{
  const h=await readFile(resolve(root,'index.html'),'utf8');
  const g=await readFile(resolve(root,'js/grammar.js'),'utf8');
  const main=await readFile(resolve(root,'js/app.js'),'utf8');
  assert.ok(h.includes('Dashboard'));
  assert.ok(h.includes('autosaveToggle'));
  assert.ok(h.includes('Grammar'));
  assert.ok(main.includes('stationeryPreviewPhotos'));
  assert.ok(g.includes('../vendor/harper/index.js'));
  assert.ok(g.includes('../vendor/harper/binaryInlined.js'));
  assert.ok(!/https?:\/\/[^\s'"`]+harper/i.test(g));
  assert.ok(!/https?:\/\/[^\s'"`]+harper/i.test(h));
  for(const p of ['css/editor.css','css/app.css','js/vendor/markdown-editor.bundle.js','js/analyzer.js','js/app.js','js/grammar.js','js/stationery.js'])
    assert.ok((await stat(resolve(root,p))).size>200,p);
});
