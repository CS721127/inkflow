import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const html=readFileSync('index.html','utf8');
const app=readFileSync('js/app.js','utf8');
test('math bundled locally and not via CDN',()=>{assert.ok(existsSync('vendor/mathjax/tex-svg-full.js'));assert.ok(existsSync('vendor/mathjax/output/svg/fonts/tex.js'));assert.match(html,/js\/math\.js/);assert.match(app,/WriterMath\.install/);});
test('workspace UI includes local multi-file and fullscreen controls',()=>{for(const id of ['fileTabs','folderInput','downloadWorkspaceButton','fullscreenButton','exitFullscreenButton'])assert.ok(html.includes('id="'+id+'"'));assert.match(html,/id="fileInput"[^>]*multiple/);});
test('autosave default remains opt in',()=>{assert.match(app,/writer_pad_autosave'\) === 'true'/);});
