import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const layout=readFileSync(new URL('../js/ui-layout.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../css/ui-polish.css',import.meta.url),'utf8');
test('refined desktop and mobile UI preserves essential controls',()=>{
 for(const id of ['dashboardToggle','nativeMobileEditor','editorEmptyGuide','clearActions','lineNumbersToggle','stylePreviewButton','pdfButton','fileTabs','importFolderButton','fullscreenButton','grammarDialect'])assert.match(html,new RegExp(`id="${id}"`));
 assert.match(layout,/actions\.append\(analyze,save,clear,dashboard\)/);
 assert.doesNotMatch(layout,/footer\.append\(settings,theme,clear\)/);
 assert.doesNotMatch(layout,/work-top-title','Write/);
 assert.match(layout,/cm\.setOption\('lineNumbers',visible\)/);
 assert.match(css,/\.editor-grid\[data-view="split"\]/);
});
test('welcome guide covers all user actions without becoming actual source',()=>{
 for(const label of ['Welcome to InkFlow','Analyze writing','Multiple files','Source file','PDF document','Auto-save'])assert.ok(html.includes(label),`missing ${label}`);
 assert.match(html,/id="editorEmptyGuide"/);
});
