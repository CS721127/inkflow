import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync('index.html','utf8');
const app=readFileSync('js/app.js','utf8');
const pages=readFileSync('js/pdf-pages.js','utf8');
const css=readFileSync('css/pdf-pages.css','utf8');
test('every A4 page carries its own stationery drawing',()=>{
 assert.match(html,/js\/pdf-pages\.js/);
 assert.match(html,/css\/pdf-pages\.css/);
 assert.match(pages,/sheet\.append\(art\)/);
 assert.match(pages,/while\(pending\.length\)/);
 assert.match(css,/@page\s*\{\s*size:\s*A4 portrait;\s*margin:\s*0/);
});
test('export uses explicit sheets and awaits math',()=>{
 assert.match(app,/WriterPdfPages\.build/);
 assert.match(app,/await WriterMath\.ready\(\)/);
 assert.doesNotMatch(app,/position:fixed.*paper-art/);
});
