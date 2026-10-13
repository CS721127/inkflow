/* InkFlow · local writing analysis engine
 * No network calls, external APIs, storage, or dependencies.
 * English-style checks are suggestions, not grammar/spelling verification.
 * The source-offset contract allows a suggestion to select its exact Markdown span.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.WriterAnalyzer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const englishWord = /[A-Za-z]+(?:['’\-][A-Za-z]+)*|\d+(?:\.\d+)?/g;
  const hanCharacter = /\p{Script=Han}/gu;
  const linePattern = /[^\n]*(?:\n|$)/g;
  const fillerTerms = ['due to the fact that', 'at this point in time', 'in order to', 'kind of', 'sort of', 'a lot of', 'basically', 'literally', 'actually', 'really', 'very', 'just'];
  const passiveRegex = /\b(?:am|is|are|was|were|be|been|being|get|gets|got|getting)\s+(?:(?:\w+ly|not)\s+)?(?:\w+\s+){0,2}(?:[a-z]+(?:ed|en)|known|shown|written|given|made|taken|built|seen|found|done|said|sent)\b/gi;
  function countEnglish(text) { return (text.match(englishWord) || []).length; }
  function countHan(text) { return (text.match(hanCharacter) || []).length; }
  function mask(text) { return text.replace(/[^\r\n]/g, ' '); }
  function stripMarkup(source) {
    // Crucially, every character maintains its original index (including line breaks).
    let text = String(source);
    let fence = null;
    let result = '';
    const lineRx = new RegExp(linePattern.source, 'g');
    let m;
    while ((m = lineRx.exec(text)) && m[0]) {
      const line = m[0], body = line.replace(/\r?\n$/, '');
      const start = body.match(/^ {0,3}(`{3,}|~{3,})/);
      if (fence) {
        result += mask(line);
        if (new RegExp('^ {0,3}' + (fence.char === '`' ? '`' : '~') + '{' + fence.len + ',}\\s*$').test(body)) fence = null;
      } else if (start) {
        fence = { char: start[1][0], len: start[1].length, index: m.index };
        result += mask(line);
      } else if (/^\s*\|.*\|\s*$/.test(body) || /^\s*(?:[-*_]\s*){3,}$/.test(body)) {
        // Markdown tables and horizontal rules are not prose sentences.
        result += mask(line);
      } else {
        result += line;
      }
    }
    function hide(regex) { text = text.replace(regex, match => mask(match)); }
    text = result;
    hide(/`+[^`\n]*`+/g);                // inline code
    const codeMasked = text;
    hide(/<!--[^]*?-->/g);               // HTML comments
    hide(/<[^>\n]+>/g);                  // inline HTML
    // Keep visible link labels so writing metrics match what people read.
    text = text.replace(/(!?)\[([^\]\n]*)\]\(([^\n)]*)\)/g, (full, image, label) =>
      image ? mask(full) : ' ' + label + mask(full.slice(label.length + 1)));
    hide(/https?:\/\/[^\s<>]+/g);       // bare URLs
    text = text.replace(/^\s{0,3}(?:#{1,6}\s+|>\s*|[-*+]\s+|\d+[.)]\s+|[-*+] \[[ xX]\]\s+)/gm, x => mask(x));
    // Keep the actual words, not the formatting delimiters.
    text = text.replace(/(?:\*\*|__|~~)/g, x => mask(x));
    return {text, codeMasked, unclosedFence: fence};
  }
  function cleanSnippet(text, index, length) {
    const source = text.slice(Math.max(0, index), Math.min(text.length, index + Math.max(length, 1)));
    const shortened = source.replace(/\s+/g, ' ').trim();
    return shortened.length > 115 ? shortened.slice(0, 112) + '…' : shortened;
  }
  function analyze(source) {
    const raw = String(source || '');
    const normalized = stripMarkup(raw);
    const prose = normalized.text;
    const issues = [];
    const counters = {};
    function add(category, severity, title, detail, index, length, limit = 5) {
      const key = title;
      if ((counters[key] || 0) >= limit) return;
      counters[key] = (counters[key] || 0) + 1;
      const safeIndex = Math.min(Math.max(0, index || 0), raw.length);
      issues.push({category, severity, title, detail, index: safeIndex, length: Math.max(0, length || 0), snippet: cleanSnippet(raw, safeIndex, length || 1)});
    }
    const paragraphs = [];
    let current = null;
    let lineNo = 0;
    const headings = [];
    let pending = null;
    const rx = new RegExp(linePattern.source, 'g');
    let match;
    while ((match = rx.exec(prose)) && match[0]) {
      const pLine = match[0], rLine = raw.slice(match.index, match.index + match[0].length);
      const heading = rLine.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
      if (heading && !/^\s*$/.test(pLine)) headings.push({level: heading[1].length, index: match.index, title: heading[2].slice(0, 80)});
      const candidate = pLine.replace(/\s+$/, '');
      const isProse = /[A-Za-z\p{Script=Han}]/u.test(candidate) && !heading;
      if (isProse) {
        if (!current) current = {index: match.index, end: match.index + candidate.length};
        else current.end = match.index + candidate.length;
      } else if (current) { paragraphs.push(current);current = null; }
      lineNo++;
    }
    if (current) paragraphs.push(current);
    // Content with no full paragraphs (e.g. just one heading) still gets base stats.
    const en = countEnglish(prose), han = countHan(prose);
    const words = en + han; // Chinese uses Han characters as approximate word-like units.
    const sentenceUnits = [];
    for (const p of paragraphs) {
      const block = prose.slice(p.index, p.end);
      const sentenceRx = /[^.!?。！？]+(?:[.!?。！？]+|$)/g;
      let sentence;
      while ((sentence = sentenceRx.exec(block)) && sentence[0]) {
        const head = (sentence[0].match(/^\s*/) || [''])[0].length;
        const fragment = sentence[0].trim();
        if (!fragment) continue;
        const english = countEnglish(fragment), chinese = countHan(fragment);
        if (!english && !chinese) continue;
        const i = p.index + sentence.index + head;
        sentenceUnits.push({index:i, length:sentence[0].trimEnd().length-head, english, chinese});
        if (english >= 35) add('clarity','review','Long sentence',`${english} English words in one sentence. Consider splitting it into shorter statements.`,i,sentence[0].trimEnd().length-head,5);
        else if (chinese >= 75) add('clarity','review','Long Chinese sentence',`${chinese} Chinese characters without a full stop. A shorter sentence may be easier to follow.`,i,sentence[0].trimEnd().length-head,5);
      }
      const blockEn = countEnglish(block), blockHan = countHan(block);
      if (blockEn > 150 || blockHan > 240) add('clarity','review','Long paragraph',`This paragraph contains ${blockEn ? blockEn + ' English words' : ''}${blockEn && blockHan ? ' and ' : ''}${blockHan ? blockHan + ' Chinese characters' : ''}. Consider inserting a paragraph break.`,p.index,p.end-p.index,4);
    }
    // Style checks on prose only: code fences, links and URLs are masked above.
    let same;
    const dupRx = /\b([a-z]{2,})\s+\1\b/gi;
    while ((same = dupRx.exec(prose))) add('style','important','Repeated word',`“${same[1]} ${same[1]}” may be a typo.`,same.index,same[0].length,5);
    for (const phrase of fillerTerms) {
      const phraseRe = new RegExp('\\b' + phrase.replace(/\s+/g, '\\s+') + '\\b','gi');
      let hit, n = 0, first = null;
      while ((hit=phraseRe.exec(prose))) {n++;if (!first) first=hit;}
      if (first) add('style','note','Potential filler: '+phrase,`${n} occurrence${n > 1 ? 's' : ''}. Check whether the phrase adds meaning; context may justify keeping it.`,first.index,first[0].length,1);
    }
    let pass;
    while ((pass=passiveRegex.exec(prose))) add('style','note','Possible passive voice','Passive constructions can be appropriate. Check whether naming the actor would make this sentence clearer.',pass.index,pass[0].length,4);
    const emphatic = /[!?]{3,}/g;
    let noisy;
    while ((noisy=emphatic.exec(prose))) add('style','note','Repeated punctuation','Multiple exclamation or question marks may be distracting in formal writing.',noisy.index,noisy[0].length,3);
    // Markdown checks use the raw source to retain exact selectable offsets.
    if (normalized.unclosedFence) add('structure','important','Unclosed code block','Add a matching closing ``` or ~~~ line so subsequent Markdown renders correctly.',normalized.unclosedFence.index,3,1);
    for (let h = 1; h < headings.length; h++) {
      if (headings[h].level > headings[h - 1].level + 1) add('structure','review','Skipped heading level',`Heading goes from H${headings[h-1].level} to H${headings[h].level}. Consider using H${headings[h-1].level + 1} for a clearer outline.`,headings[h].index,headings[h].title.length+headings[h].level+1,4);
    }
    if (headings.length && !headings.some(h=>h.level===1)) add('structure','note','No H1 title','Your document uses headings but has no top-level # heading. Consider adding one if this is a standalone document.',headings[0].index,headings[0].title.length+headings[0].level+1,1);
    if (words > 320 && !headings.length) add('structure','note','Consider section headings','Long documents are easier to scan with a few descriptive Markdown headings.',0,Math.min(raw.length,100),1);
    const markdownLinks = /(!?)\[([^\]\n]*)\]\(([^)\n]*)\)/g;
    let link;
    while ((link = markdownLinks.exec(normalized.codeMasked))) {
      if (link[1] === '!' && !link[2].trim()) add('structure','review','Image needs alt text','Describe the image between ![ and ] for readers who use screen readers.',link.index,link[0].length,4);
      else if (link[1] !== '!' && (!link[2].trim() || !link[3].trim() || link[3].trim()==='#')) add('structure','review','Incomplete link','Check that both the link text and destination are present.',link.index,link[0].length,4);
      else if (/example\.com|your-url|insert-link-here/i.test(link[3])) add('structure','note','Placeholder link','Replace the example URL before publishing or sharing.',link.index,link[0].length,4);
    }
    let todo;
    const reminder = /\b(?:TODO|FIXME|TBD)\b/g;
    while ((todo=reminder.exec(prose))) add('structure','note','Draft reminder found','Check that this placeholder has been handled before sharing the document.',todo.index,todo[0].length,4);
    // Avoid overloading the original 300px-wide sidebar; report how many are displayed.
    const priority = {important:0,review:1,note:2};
    issues.sort((a,b)=>priority[a.severity]-priority[b.severity] || a.index-b.index);
    const displayed = issues.slice(0, 28);
    const checkedTasks = (raw.match(/^\s*[-*+]\s+\[[xX]\]\s/gm) || []).length;
    const uncheckedTasks = (raw.match(/^\s*[-*+]\s+\[ \]\s/gm) || []).length;
    const englishSentenceCount = sentenceUnits.filter(s=>s.english>0).length;
    const meanSentenceWords = englishSentenceCount ? Math.round(sentenceUnits.reduce((a,s)=>a+(s.english>0?s.english:0),0)/englishSentenceCount) : 0;
    const readingSeconds = en / 220 * 60 + han / 330 * 60;
    let language = 'English';
    if (han > 0 && en < 8) language = 'Chinese / CJK';
    else if (han > 0 && en > 0) language = 'Mixed';
    return {
      stats: {words,en,han,characters:raw.length,sentences:sentenceUnits.length,paragraphs:paragraphs.length,headings:headings.length,readingMinutes:Math.max(1,Math.ceil(readingSeconds / 60)),meanSentenceWords,language,checkedTasks,uncheckedTasks},
      issues:displayed, totalIssues:issues.length, omitted:Math.max(0, issues.length-displayed.length),
      // The analysis is wholly local and intentionally limited to rule-based cues.
      methodology:'Local rule-based suggestions only; not a grammar, meaning, or factual accuracy checker.'
    };
  }
  return {analyze, stripMarkup};
});
