/* InkFlow — Harper adapter (local, lazy-loaded).
 * Harper is Apache-2.0, installed with npm install and copied to vendor/harper/.
 * No CDN requests and no text is sent to a server.
 */
window.WriterGrammar = (() => {
  let engine = null;
  let api = null;
  let preparing = null;
  const DIALECT = { american: 'American', british: 'British', australian: 'Australian', canadian: 'Canadian' };

  // Harper spans use Unicode scalar-value offsets; CodeMirror uses JS UTF-16 indices.
  function utf16Offsets(text) {
    const offsets = [0];
    for (const character of text) offsets.push(offsets[offsets.length - 1] + character.length);
    return offsets;
  }

  async function initialize(dialect) {
    if (engine) return engine;
    if (!preparing) {
      preparing = (async () => {
        let entry, wasm;
        try {
          [entry, wasm] = await Promise.all([
            import('../vendor/harper/index.js'),
            import('../vendor/harper/binaryInlined.js')
          ]);
        } catch (error) {
          throw new Error('Local Harper files are missing. Run npm install from the project folder to install Harper.', {cause:error});
        }
        api = entry;
        const chosen = entry.Dialect[DIALECT[dialect] || 'Australian'];
        let created;
        try {
          // Web Worker avoids blocking editing on desktop and mobile.
          created = new entry.WorkerLinter({ binary: wasm.binaryInlined, dialect: chosen });
          await created.setup();
          // Work around missing default rule activation on some Harper versions.
          if (typeof created.getDefaultLintConfig === 'function') await created.getDefaultLintConfig();
        } catch (workerError) {
          try { await created?.dispose(); } catch (_) {}
          // A browser without module Worker support can still lint on-device.
          created = new entry.LocalLinter({ binary: wasm.binaryInlined, dialect: chosen });
          await created.setup();
        }
        engine = created;
        return engine;
      })().catch(error => { preparing = null; throw error; });
    }
    return preparing;
  }

  async function check(text, dialect = 'australian') {
    const linter = await initialize(dialect);
    await linter.setDialect(api.Dialect[DIALECT[dialect] || 'Australian']);
    const raw = await linter.lint(text, { language: 'markdown', isolateEnglish: true });
    const utf16 = utf16Offsets(text);
    const findings = [];
    for (const lint of raw) {
      try {
        const span = lint.span();
        const a = utf16[Math.max(0, Math.min(span.start, utf16.length - 1))];
        const b = utf16[Math.max(0, Math.min(span.end, utf16.length - 1))];
        const suggestions = lint.suggestions().slice(0, 3).map(s => s.get_replacement_text());
        const original = text.slice(a, b);
        if (!original || findings.length >= 120) continue;
        findings.push({
          index: a, length: b - a, original,
          title: lint.lint_kind_pretty() || 'Grammar', detail: lint.message(),
          snippet: original, severity: 'review', category: 'grammar',
          replacements: [...new Set(suggestions)]
        });
      } catch (error) { console.warn('Skipped unrecognized Harper lint:', error); }
    }
    return findings;
  }

  async function dispose() {
    try { await engine?.dispose(); } finally { engine = null; api = null; preparing = null; }
  }
  return { check, dispose };
})();
