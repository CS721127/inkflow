const assert = require('node:assert/strict');
const { mkdir, writeFile, readFile } = require('node:fs/promises');
const path = require('node:path');
const { once } = require('node:events');
const { Menu } = require('electron');

exports.run = async function run(win) {
  const out = process.env.INKFLOW_SMOKE_OUTPUT;
  await mkdir(out, { recursive: true });
  const wc = win.webContents;
  const evaluate = code => wc.executeJavaScript(code, true);
  const errors = [];
  wc.on('console-message', details => {
    if (details.level === 'error') errors.push(details.message);
  });
  wc.session.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (_details, callback) => callback({ cancel: true }));
  assert.equal(await evaluate('typeof require'), 'undefined');
  assert.equal(await evaluate('typeof process'), 'undefined');
  assert.equal(await evaluate('document.getElementById("autosaveToggle").checked'), false);
  assert.equal(await evaluate('document.title'), 'InkFlow — Markdown Workspace');
  console.log('✓ Sandboxed editor loaded offline; auto-save is opt-in');

  const source = '# A calmer place to write\n\nInkFlow runs entirely on your Mac.\n\nThe equation $x^2 + y^2 = z^2$ renders locally.\n\nThis are a test sentence.\n\n- Markdown preview\n- Local grammar checks\n- A4 PDF exports';
  await evaluate(`cm.setValue(${JSON.stringify(source)}); filenameInput.value = 'InkFlow Smoke Test'; markCurrentFileEdited(); updatePreview(); setView('split', false);`);
  assert.equal(await evaluate(`!window.dispatchEvent(new Event('beforeunload', {cancelable: true}))`), true);
  await evaluate('WriterMath.ready()');
  assert.ok(await evaluate('document.querySelectorAll(".iwp-math mjx-container").length > 0'));
  const grammar = await evaluate('WriterGrammar.check(cm.getValue(), "australian")');
  assert.ok(grammar.length > 0);
  console.log('✓ Editing, unsaved-work protection, MathJax and local Harper grammar');

  const fileMenu = Menu.getApplicationMenu().items.find(item => item.label === 'File').submenu;
  fileMenu.items.find(item => item.label === 'Save Workspace').click();
  assert.equal(await evaluate(`!window.dispatchEvent(new Event('beforeunload', {cancelable: true}))`), false);
  const loaded = once(wc, 'did-finish-load');
  wc.reload();
  await loaded;
  assert.equal(await evaluate('cm.getValue()'), source);
  assert.equal(await evaluate('filenameInput.value'), 'InkFlow Smoke Test');
  await evaluate('setView("split", false); WriterMath.ready()');
  await writeFile(path.join(out, 'InkFlow-macOS.png'), (await wc.capturePage()).toPNG());
  console.log('✓ Native Save menu and saved workspace restored after reload');

  async function download(filename, trigger) {
    const finished = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Export timed out: ' + filename)), 15_000);
      wc.session.once('will-download', (_event, item) => {
        item.setSavePath(path.join(out, filename));
        item.once('done', (_done, state) => {
          clearTimeout(timeout);
          if (state === 'completed') resolve();
          else reject(new Error('Export failed: ' + state));
        });
      });
    });
    await trigger();
    await finished;
    return readFile(path.join(out, filename));
  }
  const exported = await download('source.md', () => evaluate('document.getElementById("exportFormat").value="md"; downloadFile()'));
  assert.equal(exported.toString(), source);
  await evaluate('document.getElementById("exportStyle").value="botanical"');
  fileMenu.items.find(item => item.label === 'Export PDF…').click();
  await evaluate(`new Promise((resolve, reject) => {
    const started = Date.now();
    const poll = setInterval(() => {
      if (!document.getElementById('downloadPdfButton').disabled) { clearInterval(poll); resolve(); }
      else if (Date.now() - started > 15000) { clearInterval(poll); reject(new Error('PDF preview did not load')); }
    }, 50);
  })`);
  const pdf = await download('document.pdf', () => evaluate('document.getElementById("downloadPdfButton").click()'));
  assert.equal(pdf.subarray(0, 8).toString(), '%PDF-1.4');
  assert.ok(pdf.length > 1000);
  const nativePdf = await wc.printToPDF({ pageSize: 'A4', printBackground: true });
  assert.ok(nativePdf.length > 1000);
  await writeFile(path.join(out, 'native-print.pdf'), nativePdf);
  await evaluate('document.getElementById("pdfBackButton").click()');
  console.log('✓ Source download, A4 PDF download and native print-to-PDF');

  await evaluate('cm.setValue("Unsaved again")');
  assert.equal(await evaluate(`!window.dispatchEvent(new Event('beforeunload', {cancelable: true}))`), true);
  await evaluate('document.getElementById("autosaveToggle").click()');
  await evaluate('new Promise(resolve => setTimeout(resolve, 900))');
  assert.equal(await evaluate(`!window.dispatchEvent(new Event('beforeunload', {cancelable: true}))`), false);
  assert.deepEqual(errors, []);
  console.log('✓ Auto-save clears the unsaved flag; no renderer errors');
  console.log('InkFlow desktop smoke test passed.');
};
