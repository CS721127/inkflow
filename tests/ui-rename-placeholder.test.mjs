import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';

const ui = readFileSync(new URL('../js/ui-layout.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/ui-polish.css', import.meta.url), 'utf8');

test('sidebar rename replaces the existing label rather than adding an adjacent input', () => {
  assert.match(ui, /button\.replaceWith\(input\)/);
  assert.doesNotMatch(ui, /button\.hidden\s*=\s*true/);
  assert.match(css, /\.file-tab\.is-renaming\s+\.file-tab-rename\s*\{display:none/);
});

test('welcome guide aligns to the CodeMirror caret and responds to gutter changes', () => {
  assert.match(ui, /cm\.charCoords\(\{line:0,ch:0\},'window'\)/);
  assert.match(ui, /cm\.on\('refresh',align\)/);
  assert.match(css, /left:var\(--inkflow-guide-left/);
  assert.match(css, /max-width:820px\)/);
});
