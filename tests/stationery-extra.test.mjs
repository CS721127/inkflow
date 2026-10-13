import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const ids=['sakura','botanical','grid','coffee','night','geometric'];
const html=readFileSync('index.html','utf8');
const app=readFileSync('js/app.js','utf8');
const extra=readFileSync('js/stationery-extra.js','utf8');
const pdf=readFileSync('js/pdf-pages.js','utf8');
test('six additional styles available for PDF and gallery',()=>{
 assert.match(html,/js\/stationery-extra\.js/);
 for(const id of ids){
  assert.match(html,new RegExp('value="'+id+'"'));
  assert.ok(extra.includes('"'+id+'"'));
  assert.ok(app.includes(id+":'"));
  assert.ok(existsSync('assets/stationery/previews/'+id+'.webp'));
  assert.ok(existsSync('assets/stationery/art/'+id+'.svg'));
 }
});
test('style backgrounds remain vector per-sheet, with graph-paper safe margin',()=>{
 assert.match(pdf,/sheet\.append\(art\)/);
 assert.match(pdf,/\['ruled','grid'\]/);
 assert.doesNotMatch(extra,/(cdn\.|data:image)/);
});
