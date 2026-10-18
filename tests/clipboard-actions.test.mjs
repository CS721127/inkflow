import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');
const ui = readFileSync('js/ui-layout.js', 'utf8');
const style = readFileSync('css/ui-polish.css', 'utf8');

test('Copy and Paste are accessible, compact actions in the existing writing toolbar', () => {
  assert.match(html, /id="copyTextButton"/);
  assert.match(html, /id="pasteTextButton"/);
  assert.match(html, /aria-label="Paste text at cursor"/);
  assert.match(style, /\.format-toolbar \.clipboard-action/);
});

test('clipboard actions support native mobile selection, CodeMirror and denied clipboard access', () => {
  assert.match(ui, /navigator\.clipboard\?\.writeText/);
  assert.match(ui, /navigator\.clipboard\?\.readText/);
  assert.match(ui, /lastNativeSelection/);
  assert.match(ui, /native\.setRangeText\(text,start,end,'end'\)/);
  assert.match(ui, /cm\.replaceSelection\(text,'around'\)/);
  assert.match(ui, /inAppClipboard/);
  assert.match(ui, /targetFile!==activeFileId/);
});
