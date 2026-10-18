import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const html=readFileSync('index.html','utf8');
const controller=readFileSync('js/ui-layout.js','utf8');
const download=readFileSync('js/pdf-download.js','utf8');
const css=readFileSync('css/ui-polish.css','utf8');

test('mobile editor has no duplicate placeholder and retains welcome guide',()=>{
  assert.match(html,/id="editorEmptyGuide"/);
  assert.doesNotMatch(html,/placeholder="Start writing in Markdown/);
  assert.match(html,/id="nativeMobileEditor" placeholder=""/);
});
test('mobile export downloads explicit A4 PDF without invoking print',()=>{
  assert.match(html,/js\/pdf-download\.js/);
  assert.match(controller,/id="downloadPdfButton"/);
  assert.match(controller,/InkFlowPdfDownload\.generate/);
  assert.match(download,/A4_PDF_WIDTH = 595\.275591/);
  assert.match(download,/A4_PDF_HEIGHT = 841\.889764/);
  assert.match(download,/\/MediaBox \[0 0/);
  assert.match(css,/@media\(max-width:650px\)/);
});
