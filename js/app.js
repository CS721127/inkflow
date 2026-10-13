'use strict';
const $ = (id) => document.getElementById(id);
const filenameInput = $('filenameInput');
const fileInput = $('fileInput');
const preview = $('preview');
const printArea = $('print-area');
const recBox = $('recommendations');
const saveStatus = $('saveStatus');
const grid = $('editorGrid');
const isMobile = () => window.matchMedia('(max-width: 820px)').matches;
const store = {
  read(key) { try { return localStorage.getItem(key); } catch { return null; } },
  write(key,value) { try { localStorage.setItem(key,value);return true; } catch { return false; } },
  remove(key) { try {localStorage.removeItem(key);}catch{} }
};

// CodeMirror powers the editing experience (bundled locally for offline use).
const cm = CodeMirror.fromTextArea($('editor'), {
 mode: {name:'markdown',highlightFormatting:true,taskLists:true,strikethrough:true,fencedCodeBlocks:true},
 lineNumbers:true,lineWrapping:true,styleActiveLine:false,matchBrackets:true,
 autoCloseBrackets:true,indentUnit:2,tabSize:2,indentWithTabs:false,
 inputStyle:'textarea',viewportMargin:12,
 extraKeys: {
  'Ctrl-Space':(ed)=>openHints(ed),
  'Ctrl-S':()=>saveData(true), 'Cmd-S':()=>saveData(true),
  'Ctrl-B':()=>insertFormat('bold'),'Cmd-B':()=>insertFormat('bold'),
  'Ctrl-I':()=>insertFormat('italic'),'Cmd-I':()=>insertFormat('italic'),
  'Ctrl-K':()=>insertFormat('link'),'Cmd-K':()=>insertFormat('link'),
  'Enter':'newlineAndIndentContinueMarkdownList',
  'Tab':(ed)=>ed.somethingSelected()?ed.indentSelection('add'):ed.execCommand('insertSoftTab')
 }
});

// Placeholder only: never entered into CodeMirror, saved, analyzed or exported.
const editorEmptyGuide = $('editorEmptyGuide');
function syncEditorEmptyGuide(){
  editorEmptyGuide.hidden = cm.getValue().length !== 0;
}
cm.on('change', syncEditorEmptyGuide);
const starter = ''; // Match the original blank editor when no draft exists.
const shortcuts = [
 {label:'Heading 1',text:'# ',triggers:['#']},
 {label:'Heading 2',text:'## ',triggers:['#']},
 {label:'Heading 3',text:'### ',triggers:['#']},
 {label:'Bullet list',text:'- ',triggers:['-']},
 {label:'Numbered list',text:'1. ',triggers:['1']},
 {label:'Task list',text:'- [ ] ',triggers:['-','[']},
 {label:'Blockquote',text:'> ',triggers:['>']},
 {label:'Code block',text:'```\n\n```',triggers:['`']},
 {label:'Bold',text:'**bold**',triggers:['*']},
 {label:'Italic',text:'*italic*',triggers:['*']},
 {label:'Link',text:'[label](https://example.com)',triggers:['[']},
 {label:'Image',text:'![alt text](https://example.com/image.png)',triggers:['!']},
 {label:'Horizontal rule',text:'---\n',triggers:['-']},
 {label:'Table',text:'| Column A | Column B |\n| --- | --- |\n| Value | Value |',triggers:['|']}
];
function openHints(ed=cm,automatic=false){
 if (ed.state.completionActive) return;
 const cursor=ed.getCursor();
 const line=ed.getLine(cursor.line).slice(0,cursor.ch);
 const tokenMatch=line.match(/(?:^|\s)([#>!*`\[|\-]{1,3})$/);
 const symbol=tokenMatch?.[1]||'';
 if(automatic && (!symbol || line.length>8)) return;
 const start=symbol? cursor.ch-symbol.length : cursor.ch;
 const from=CodeMirror.Pos(cursor.line,start), to=cursor;
 const options=shortcuts.filter(s=>!automatic || s.triggers.includes(symbol.slice(0,1)));
 const list=options.map(s=>({text:s.text,displayText:s.label+'   '+s.text.split('\n')[0],hint:(cmInstance)=>{
   cmInstance.replaceRange(s.text,from,to);
   if(s.label==='Bold'||s.label==='Italic'||s.label==='Link'){
     const marker=s.label==='Bold'?'bold':s.label==='Italic'?'italic':'label';
     const at=s.text.indexOf(marker);cmInstance.setSelection(CodeMirror.Pos(from.line,from.ch+at),CodeMirror.Pos(from.line,from.ch+at+marker.length));
   }
 }}));
 ed.showHint({hint:()=>({list,from,to}),completeSingle:false,closeOnUnfocus:true});
}
let completionTimer;
cm.on('inputRead',(ed,change)=>{
 if(change.origin!=='+input') return;
 if(!change.text || change.text.length!==1 || change.text[0].length!==1) return;
 if(!'#[!>`-*|'.includes(change.text[0])) return;
 clearTimeout(completionTimer);
 completionTimer=setTimeout(()=>{if(ed.hasFocus())openHints(ed,true)},160);
});
function insertFormat(type){
 if(isMobile() && grid.dataset.view==='preview')setView('edit');
 const selected=cm.getSelection();
 const placeholders={bold:'bold text',italic:'italic text',link:'link text',code:'code'};
 let inserted='',selectFrom=0,selectLen=0;
 if(type==='bold') {inserted='**'+(selected||placeholders.bold)+'**';selectFrom=2;selectLen=(selected||placeholders.bold).length;}
 if(type==='italic'){inserted='*'+(selected||placeholders.italic)+'*';selectFrom=1;selectLen=(selected||placeholders.italic).length;}
 if(type==='code'){inserted='`'+(selected||placeholders.code)+'`';selectFrom=1;selectLen=(selected||placeholders.code).length;}
 if(type==='link'){inserted='['+(selected||placeholders.link)+'](https://example.com)';selectFrom=1;selectLen=(selected||placeholders.link).length;}
 if(['heading','list','task','quote'].includes(type)){
   const prefix={heading:'## ',list:'- ',task:'- [ ] ',quote:'> '}[type];
   const pos=cm.getCursor('from');
   cm.replaceRange(prefix,CodeMirror.Pos(pos.line,0));
   cm.focus();return;
 }
 const from=cm.getCursor('from');
 cm.replaceSelection(inserted,'around');
 if(!selected){
  const start=CodeMirror.Pos(from.line,from.ch+selectFrom);
  cm.setSelection(start,CodeMirror.Pos(start.line,start.ch+selectLen));
 }
 cm.focus();
}

// Render into inert markup and strip HTML / URLs not needed for Markdown.
function escapeHtml(v){return String(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
const allowedTags = new Set('h1 h2 h3 h4 h5 h6 p br hr strong em b i s del sub sup code pre blockquote ul ol li a img table thead tbody tfoot tr th td input div span'.split(' '));
const forbiddenTags = new Set('script style iframe object embed svg math form video audio template link meta base noscript canvas'.split(' '));
function validURL(url,forImage=false){
 const value=(url||'').trim();
 if(!value||/[\u0000-\u001f]/.test(value)) return false;
 if(value.startsWith('//'))return false;
 if(/^(https?:\/\/)/i.test(value))return true;
 if(!forImage && /^mailto:/i.test(value))return true;
 return !/^[a-z][a-z\d+.-]*:/i.test(value) && !value.startsWith('\\\\');
}
function safeHTML(html){
 const template=document.createElement('template');template.innerHTML=html;
 // Preserve parsed safe attributes in a first pass, before stripping attributes.
 function scrub(node){
  for(const child of Array.from(node.children)){
   const tag=child.tagName.toLowerCase();
   if(forbiddenTags.has(tag)){child.remove();continue;}
   const href=child.getAttribute('href'),src=child.getAttribute('src'),alt=child.getAttribute('alt');
   const checked=child.hasAttribute('checked'),type=child.getAttribute('type');
   const language=(child.getAttribute('class')||'').match(/\blanguage-[a-z\d+_-]+\b/i)?.[0];
   const align=child.getAttribute('align');
   for(const attr of Array.from(child.attributes))child.removeAttribute(attr.name);
   if(tag==='a' && href && validURL(href)){child.setAttribute('href',href);child.setAttribute('target','_blank');child.setAttribute('rel','noopener noreferrer');}
   if(tag==='img'){
    if(src && validURL(src,true)){child.setAttribute('src',src);child.setAttribute('alt',alt||'');child.setAttribute('loading','lazy');}
    else {child.replaceWith(document.createTextNode(alt||''));continue;}
   }
   if(tag==='input'){
     if(type!=='checkbox'){child.remove();continue;}
     child.setAttribute('type','checkbox');child.setAttribute('disabled','');
     if(checked)child.setAttribute('checked','');
   }
   if(tag==='code' && language)child.className=language;
   if(['th','td'].includes(tag) && /^(left|center|right)$/.test(align||''))child.setAttribute('align',align);
   scrub(child);
   if(!allowedTags.has(tag))child.replaceWith(...Array.from(child.childNodes));
  }
  for(const child of Array.from(node.childNodes))if(child.nodeType===Node.COMMENT_NODE)child.remove();
 }
 scrub(template.content);
 return template.innerHTML;
}
marked.setOptions({gfm:true,breaks:false,headerIds:false,mangle:false});
function renderMarkdown(text){
 try{return safeHTML(marked.parse(text,{gfm:true}));}
 catch(error){console.error(error);return '<p>'+escapeHtml(text).replace(/\n/g,'<br>')+'</p>';}
}
let lastRenderedText=null;
function updatePreview(){
 const text=cm.getValue();
 if(text===lastRenderedText)return;
 lastRenderedText=text;
 preview.innerHTML=text.trim()?renderMarkdown(text):'<p class="empty-preview">Your rendered Markdown appears here.</p>';
}
function setView(view,persist=true){
 if(isMobile() && view==='split')view='edit';
 grid.dataset.view=view;
 document.querySelectorAll('[data-view]').forEach(button=>{
  if(button.tagName==='BUTTON')button.setAttribute('aria-pressed',String(button.dataset.view===view));
 });
 if(persist)store.write('writer_pad_view',view);
 if(view!=='edit') updatePreview();
 requestAnimationFrame(()=>cm.refresh());
}
function updateStats(){
 const text=cm.getValue();
 const words=(text.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu)||[]).length;
 $('wordCount').textContent=words.toLocaleString();
 $('charCount').textContent=text.length.toLocaleString();
}
function showMessage(message){
 document.querySelector('.toast')?.remove();
 const toast=document.createElement('div');toast.className='toast';toast.setAttribute('role','status');toast.textContent=message;document.body.appendChild(toast);
 setTimeout(()=>toast.remove(),2500);
}
let autosaveTimer,previewTimer;
let autoSaveEnabled = store.read('writer_pad_autosave') === 'true';
let initializing = true;
let suppressAutoSave = false;
function saveData(manual=false){
 clearTimeout(autosaveTimer);
 const a=store.write('writer_pad_text',cm.getValue());
 const b=store.write('writer_pad_name',filenameInput.value);
 saveStatus.textContent=a&&b?'Saved locally':'Unable to save locally';
 if(manual)showMessage(a&&b?'Saved to this device.':'Storage unavailable — download your file to keep it.');
}
function queueAutoSave(){
 clearTimeout(autosaveTimer);
 if(initializing || suppressAutoSave)return;
 if(!autoSaveEnabled){saveStatus.textContent='Unsaved · autosave off';return;}
 saveStatus.textContent='Saving…';
 autosaveTimer=setTimeout(()=>saveData(false),650);
}
function onEdit(){
 updateStats();
 queueAutoSave();
 clearTimeout(previewTimer);previewTimer=setTimeout(updatePreview,130);
}
cm.on('change',onEdit);
filenameInput.addEventListener('input',queueAutoSave);
function downloadFile(){
 const format=$('exportFormat').value;
 const name=(filenameInput.value.trim()||'Untitled Document').replace(/[\\/<>:"|?*\u0000-\u001f]/g,'_').replace(/\.(md|txt)$/i,'');
 const blob=new Blob([cm.getValue()],{type:format==='md'?'text/markdown;charset=utf-8':'text/plain;charset=utf-8'});
 const anchor=document.createElement('a');anchor.href=URL.createObjectURL(blob);anchor.download=name+'.'+format;
 document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(anchor.href),2000);
 showMessage('Downloaded '+name+'.'+format);
}

// Self-contained, vector stationery sheets: foreground SVGs ensure decorative
// elements are printed even when browser "background graphics" is disabled.
function applyStationeryStyle(){
 const picker = $('exportStyle');
 const chosen = (picker && stationeryArt[picker.value]) ? picker.value : 'classic';
 const fancy = chosen !== 'classic' && chosen !== 'ruled';
 // Classic and notebook retain the original comfortable margins. Fancy
 // stationery reserves a little more room for corner illustrations.
 const top = fancy ? 27 : 18;
 const horizontal = chosen === 'ruled' ? 33 : (fancy ? 23 : 19);
 const bottom = fancy ? 31 : 18;
 $('paperStyle').textContent = chosen === 'classic'
  ? '@media print { @page {size:A4; margin:18mm 19mm} }'
  : '@media print { @page {size:A4; margin:0} '+
    '#print-area {padding:'+top+'mm '+horizontal+'mm '+bottom+'mm !important;'+
    'box-decoration-break:clone;-webkit-box-decoration-break:clone} '+
    '#print-area .paper-art {top:0 !important;left:0 !important} }';
 return chosen;
}

async function exportPDF(){
 const text=cm.getValue();
 if(!text.trim()){showMessage('Nothing to export.');return;}
 updatePreview();
 const title=filenameInput.value.trim()||'Untitled Document';
 const hasTitle=/^\s*#\s+/.test(text);
 printArea.innerHTML=(hasTitle?'':'<div class="print-title">'+escapeHtml(title)+'</div>')+'<article class="markdown-body">'+preview.innerHTML+'</article>';
 printArea.querySelectorAll('img').forEach(img=>{img.loading='eager';});
 const chosen = applyStationeryStyle();
 if(chosen !== 'classic') {
  const graphic = document.createElement('div');
  graphic.className = 'paper-art';
  graphic.setAttribute('aria-hidden', 'true');
  const artImage = document.createElement('img');
  artImage.alt='';
  artImage.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(stationeryArt[chosen]);
  graphic.append(artImage);
  printArea.prepend(graphic);
  try { await artImage.decode(); } catch (error) { console.warn('Stationery illustration not ready',error); }
 }
 printArea.dataset.stationery=chosen;
 // Native printing keeps Markdown text selectable; the stationery is a vector layer.
 window.print();
}
function clearEditor(){
 closeClearMenu();
 if(!cm.getValue().trim()) {showMessage('Canvas is already blank.');return;}
 if(!confirm('Clear the current canvas? Locally saved drafts will be kept.'))return;
 clearTimeout(autosaveTimer);
 suppressAutoSave=true;
 try {cm.setValue('');}finally{suppressAutoSave=false;}
 clearTimeout(autosaveTimer);
 saveStatus.textContent='Blank canvas · not saved';
 cm.focus();showMessage('Canvas cleared. Saved local draft was kept.');
}
function clearStorage(){
 closeClearMenu();
 if(!confirm('Delete this writer’s locally saved draft and settings from this browser? The text currently in your editor will stay open. This cannot be undone.'))return;
 clearTimeout(autosaveTimer);
 try {
  for(const key of Object.keys(localStorage))if(key.startsWith('writer_pad_'))localStorage.removeItem(key);
 }catch(error){showMessage('Cannot clear browser storage.');return;}
 autoSaveEnabled=false;
 $('autosaveToggle').checked=false;
 $('grammarDialect').value='australian';
 saveStatus.textContent='Storage cleared · autosave off';
 showMessage('Local storage cleared. Current canvas remains open.');
}
function closeClearMenu(){
 $('clearMenu').hidden=true;
 $('clearButton').setAttribute('aria-expanded','false');
}
// Connect the pure rule-based analyzer to the existing sidebar and CodeMirror.
// Nothing here writes to storage or sends data across the network.
let analysisHasRun = false;
let analysisReport = null;
let analysisFilter = 'all';
let analysisTimer = null;
let locateMarker = null;
let grammarResults = [];
let grammarSnapshot = null;
let grammarState = 'idle'; // idle | loading | done | stale | error
let grammarMessage = 'Optional English grammar & spelling check (Harper).';
let grammarSequence = 0;
const ANALYSIS_CATEGORIES = { all:'All', clarity:'Clarity', style:'Style', structure:'Structure', grammar:'Grammar' };
const ANALYSIS_PRIORITY = { important:'Check', review:'Review', note:'Tip' };
function analysisNode(tag, className, text) {
 const element = document.createElement(tag);
 if (className) element.className = className;
 if (text !== undefined) element.textContent = String(text);
 return element;
}
function allFindings() {
 // Avoid presenting stale grammar suggestions after an edit or dialect change.
 return analysisReport ? [...analysisReport.issues, ...(grammarSnapshot === cm.getValue() ? grammarResults : [])] : [];
}
async function grammarCheck() {
 const text = cm.getValue();
 if (!text.trim()) {showMessage('Write something to check first.');return;}
 if (!analysisHasRun) analyzeText(true);
 const sequence=++grammarSequence;
 grammarState='loading';
 grammarMessage='Loading local Harper / checking grammar on this device…';
 grammarSnapshot=null;grammarResults=[];
 showAnalysis();
 try {
  // Opt-in: downloads the WASM library once and checks text within this browser.
  const found=await WriterGrammar.check(text,$('grammarDialect').value);
  if(sequence!==grammarSequence) return;
  if(text!==cm.getValue()) {
   grammarState='stale';grammarMessage='Document changed while checking. Choose Recheck grammar.';
  } else {
   grammarSnapshot=text;
   grammarResults=found;
   grammarState='done';
   grammarMessage=found.length ? found.length+' possible grammar or spelling issues · English only.' : 'No English grammar issues detected. This does not guarantee error-free writing.';
  }
 } catch(error) {
  if(sequence!==grammarSequence)return;
  grammarResults=[];grammarSnapshot=null;
  grammarState='error';
  grammarMessage='Local Harper is unavailable. Run npm install in the project folder, then reload this page. Writing Analysis still works.';
  console.warn('Harper grammar check unavailable:',error);
 }
 showAnalysis();
}
function applyGrammarFix(finding,replaceWith){
 const current=cm.getValue();
 if(grammarSnapshot!==current || current.slice(finding.index,finding.index+finding.length)!==finding.original) {
  grammarState='stale';grammarMessage='Document changed; recheck grammar before applying a suggestion.';
  showAnalysis();return;
 }
 const from=cm.posFromIndex(finding.index);
 const to=cm.posFromIndex(finding.index+finding.length);
 cm.replaceRange(replaceWith,from,to,'+grammar-fix');
 cm.focus();cm.setCursor(cm.posFromIndex(finding.index+replaceWith.length));
 grammarState='stale';grammarSnapshot=null;grammarResults=[];
 grammarMessage='Correction applied. Recheck grammar for updated suggestions.';
 showAnalysis();
}
function focusFinding(finding) {
 if (isMobile()) setView('edit', false);
 else if (grid.dataset.view === 'preview') setView('edit', false);
 const from = cm.posFromIndex(finding.index);
 const to = cm.posFromIndex(finding.index + finding.length);
 cm.focus();
 cm.setSelection(from,to);
 cm.scrollIntoView({from,to}, 110);
 if (locateMarker) { locateMarker.clear();locateMarker=null; }
 if (finding.length) {
  locateMarker = cm.markText(from,to,{className:'analysis-locate-mark'});
  const marker=locateMarker;
  setTimeout(()=>{marker.clear();if(locateMarker===marker)locateMarker=null;},2200);
 }
 if (isMobile()) {
  const host=document.querySelector('.editor-pane');
  host?.scrollIntoView({behavior:'smooth',block:'center'});
 }
}
function showAnalysis() {
 if(!analysisReport) return;
 const result = analysisReport;
 const stats = result.stats;
 recBox.replaceChildren();
 const top = analysisNode('div','analysis-topline');
 top.append(analysisNode('strong',null,'Draft overview'), analysisNode('span','analysis-private','⌁ On-device'));
 recBox.append(top);
 const metrics = analysisNode('div','analysis-metrics');
 const statValues = [
  [stats.readingMinutes+' min','Reading time'],
  [String(stats.sentences),'Sentences'],
  [String(stats.paragraphs),'Paragraphs'],
  [String(stats.headings),'Headings']
 ];
 for(const [value,label] of statValues) {
  const cell=analysisNode('div','analysis-metric');
  cell.append(analysisNode('strong',null,value),analysisNode('small',null,label));
  metrics.append(cell);
 }
 recBox.append(metrics);
 const detail=analysisNode('p','analysis-detail');
 detail.textContent = stats.language+(stats.meanSentenceWords?` · ~${stats.meanSentenceWords} English words per sentence`:'')+
   (stats.uncheckedTasks?` · ${stats.uncheckedTasks} open task${stats.uncheckedTasks===1?'':'s'}`:'');
  recBox.append(detail);
  const grammarPanel=analysisNode('div','grammar-controls');
  const grammarHeading=analysisNode('div','grammar-controls-head');
  grammarHeading.append(analysisNode('strong',null,'Grammar & spelling · Harper'));
  const grammarButton=analysisNode('button','secondary grammar-run',grammarState==='loading'?'Checking…':(grammarState==='done'?'↻ Recheck grammar':'✓ Check grammar'));
  grammarButton.type='button';grammarButton.disabled=grammarState==='loading';
  grammarButton.addEventListener('click',grammarCheck);
  grammarHeading.append(grammarButton);grammarPanel.append(grammarHeading);
  const status=analysisNode('p','grammar-status'+(grammarState==='error'||grammarState==='stale'?' grammar-warn':''), grammarMessage);
  status.setAttribute('aria-live','polite');grammarPanel.append(status);
  recBox.append(grammarPanel);
  const findings=allFindings();
  const toolbar=analysisNode('div','analysis-filter-row');
 toolbar.append(analysisNode('strong',null,'Findings ('+findings.length+')'));
 const filter=analysisNode('select','analysis-filter');
 filter.setAttribute('aria-label','Filter writing suggestions');
 for(const [id,label] of Object.entries(ANALYSIS_CATEGORIES)){
  const option=document.createElement('option');option.value=id;
  const count=id==='all'?findings.length:findings.filter(i=>i.category===id).length;
  option.textContent=label+(id==='all'?'':' · '+count);
  if(id===analysisFilter)option.selected=true;
  filter.append(option);
 }
 filter.addEventListener('change',()=>{analysisFilter=filter.value;showAnalysis();});
 toolbar.append(filter);recBox.append(toolbar);
 const visible = findings.filter(i=>analysisFilter==='all'||i.category===analysisFilter);
 if(!visible.length){
  const positive=analysisNode('div','suggestion-card good analysis-empty',analysisFilter==='all'?'No common patterns flagged in this draft.':'No '+ANALYSIS_CATEGORIES[analysisFilter].toLowerCase()+' suggestions for this draft.');
  recBox.append(positive);
 }
 for(const finding of visible){
  const card=analysisNode('section','suggestion-card analysis-issue'+(finding.severity==='important'?' bad':''));
  const row=analysisNode('div','analysis-issue-top');
  row.append(analysisNode('strong',null,finding.title),analysisNode('span','analysis-priority',ANALYSIS_PRIORITY[finding.severity]));
  card.append(row);
  card.append(analysisNode('p','analysis-advice',finding.detail));
  if(finding.snippet)card.append(analysisNode('div','analysis-excerpt','“'+finding.snippet+'”'));
  const locate=analysisNode('button','secondary analysis-jump','↗ Locate in editor');
  locate.type='button';
  locate.setAttribute('aria-label','Locate '+finding.title+' in editor');
  locate.addEventListener('click',()=>focusFinding(finding));
  card.append(locate);
   if(finding.category==='grammar' && finding.replacements?.length){
    const fixRow=analysisNode('div','grammar-fixes');
    fixRow.append(analysisNode('span',null,'Suggestions:'));
    finding.replacements.forEach(replacement=>{
      const label=replacement ? 'Apply “'+replacement.slice(0,36)+(replacement.length>36?'…':'')+'”' : 'Remove';
      const fix=analysisNode('button','secondary',label);
      fix.type='button';fix.addEventListener('click',()=>applyGrammarFix(finding,replacement));
      fixRow.append(fix);
    });
    card.append(fixRow);
   }
   recBox.append(card);
 }
 if(result.omitted)recBox.append(analysisNode('p','analysis-detail',result.omitted+' additional suggestions omitted to keep the list manageable.'));
 recBox.append(analysisNode('p','analysis-disclaimer',result.methodology+' Chinese text is counted by characters for approximate reading time.'));
}
function analyzeText(silent = false){
 const text=cm.getValue();
 if(!text.trim()){
  analysisHasRun=false;analysisReport=null;grammarSnapshot=null;grammarResults=[];grammarState='idle';
   recBox.replaceChildren(analysisNode('p','analysis-detail','Write something to analyze.'));
  if(!silent)showMessage('Enter some text first.');
  return;
 }
 analysisHasRun=true;
 analysisReport=WriterAnalyzer.analyze(text);
 showAnalysis();
 if(!silent){
  showMessage('Analysis complete · all checks run on this device.');
  if(isMobile())document.querySelector('.sidebar')?.scrollIntoView({behavior:'smooth',block:'start'});
 }
}
function scheduleAnalysisRefresh() {
 if(grammarSnapshot!==null && grammarSnapshot!==cm.getValue()){
  grammarSnapshot=null;grammarResults=[];grammarState='stale';
  grammarMessage='Document changed. Recheck grammar for up-to-date suggestions.';
 }
 if(!analysisHasRun) return;
 clearTimeout(analysisTimer);
 analysisTimer=setTimeout(()=>analyzeText(true),650);
}
cm.on('change',scheduleAnalysisRefresh);

fileInput.addEventListener('change',async(event)=>{
 const file=event.target.files[0];if(!file)return;
 try {
  const text=await file.text();
  if(cm.getValue().trim() && !confirm('Replace the current document with "'+file.name+'"?'))return;
  filenameInput.value=file.name.replace(/\.(txt|md)$/i,'');cm.setValue(text);setView('edit');cm.focus();showMessage('Imported '+file.name+(autoSaveEnabled?'':' · not saved locally'));
 }catch(error){showMessage('Unable to read the selected file.');console.error(error);}
 finally{fileInput.value='';}
});
$('importButton').addEventListener('click',()=>fileInput.click());
$('saveButton').addEventListener('click',()=>saveData(true));
$('downloadButton').addEventListener('click',downloadFile);
$('pdfButton').addEventListener('click',exportPDF);
$('exportStyle').addEventListener('change', () => { store.write('writer_pad_export_style', $('exportStyle').value); });

const stylePreviewDialog = $('stylePreviewDialog');
const stylePreviewNames = {
 classic:'Plain', ruled:'Ruled paper', vintage:'Vintage letter',
 floral:'Floral letter', kawaii:'Cute cartoon', sky:'Sky & clouds'
};
function updateStylePreviewCards(){
 stylePreviewDialog.querySelectorAll('.style-preview-card').forEach(card=>{
  card.setAttribute('aria-pressed',String(card.dataset.paperStyle===$('exportStyle').value));
 });
}
function buildStylePreview(){
 const gallery=$('stylePreviewGallery');
 if(gallery.children.length){updateStylePreviewCards();return;}
 for(const [id,label] of Object.entries(stylePreviewNames)){
  const card=document.createElement('button');
  card.type='button';card.className='style-preview-card';card.dataset.paperStyle=id;
  card.setAttribute('aria-label','Select '+label+' PDF style');
  const img=document.createElement('img');img.alt=label+' PDF template example';
  img.loading='lazy';img.decoding='async';img.src=stationeryPreviewPhotos[id];
  const caption=document.createElement('span');caption.className='style-preview-label';
  const name=document.createElement('span');name.textContent=label;
  const check=document.createElement('span');check.textContent='✓';check.className='style-preview-check';check.setAttribute('aria-hidden','true');
  caption.append(name,check);card.append(img,caption);
  card.addEventListener('click',()=>{
   $('exportStyle').value=id;
   store.write('writer_pad_export_style',id);
   stylePreviewDialog.close();
   showMessage('PDF style: '+label);
  });
  gallery.append(card);
 }
 updateStylePreviewCards();
}
$('stylePreviewButton').addEventListener('click',()=>{
 buildStylePreview();
 if(typeof stylePreviewDialog.showModal==='function')stylePreviewDialog.showModal();
 else stylePreviewDialog.setAttribute('open','');
});
$('closeStylePreview').addEventListener('click',()=>stylePreviewDialog.close());
stylePreviewDialog.addEventListener('click',(event)=>{
 // Clicking the dimmed backdrop closes the gallery.
 if(event.target===stylePreviewDialog)stylePreviewDialog.close();
});
stylePreviewDialog.addEventListener('close',()=>{ $('stylePreviewButton').focus(); });

$('clearButton').addEventListener('click',(event)=>{
 event.stopPropagation();
 const menu=$('clearMenu');menu.hidden=!menu.hidden;
 $('clearButton').setAttribute('aria-expanded',String(!menu.hidden));
});
$('clearMenu').addEventListener('click',event=>event.stopPropagation());
$('clearCanvasButton').addEventListener('click',clearEditor);
$('clearStorageButton').addEventListener('click',clearStorage);
document.addEventListener('click',(event)=>{
 if(!$('clearActions').contains(event.target))closeClearMenu();
});
document.addEventListener('keydown',(event)=>{
 if(event.key==='Escape')closeClearMenu();
});
const settingsDialog=$('settingsDialog');
$('settingsButton').addEventListener('click',()=>{
 $('autosaveToggle').checked=autoSaveEnabled;
 closeClearMenu();
 settingsDialog.showModal();
});
$('closeSettings').addEventListener('click',()=>settingsDialog.close());
settingsDialog.addEventListener('click',(event)=>{
 if(event.target===settingsDialog)settingsDialog.close();
});
settingsDialog.addEventListener('close',()=>$('settingsButton').focus());
$('autosaveToggle').addEventListener('change',event=>{
 autoSaveEnabled=event.target.checked;
 store.write('writer_pad_autosave',String(autoSaveEnabled));
 clearTimeout(autosaveTimer);
 if(autoSaveEnabled){
  saveStatus.textContent='Saving…';
  autosaveTimer=setTimeout(()=>saveData(false),200);
 }else{
  saveStatus.textContent='Autosave off';
 }
 showMessage('Auto-save '+(autoSaveEnabled?'enabled':'disabled'));
});
$('grammarDialect').addEventListener('change',()=>{
 store.write('writer_pad_grammar_dialect',$('grammarDialect').value);
 ++grammarSequence; // Invalidate any in-flight lint run for the old dialect.
 if(grammarState==='done'||grammarState==='loading'){
  grammarState='stale';grammarSnapshot=null;grammarResults=[];
  grammarMessage='English dialect changed. Recheck grammar to update suggestions.';
  if(analysisHasRun)showAnalysis();
 }
});
$('analyzeButton').addEventListener('click',analyzeText);
$('themeButton').addEventListener('click',()=>{
 document.body.classList.toggle('dark-mode');store.write('writer_pad_theme',document.body.classList.contains('dark-mode')?'dark':'light');cm.refresh();
});
document.querySelectorAll('.format-toolbar [data-insert]').forEach(button=>button.addEventListener('click',()=>insertFormat(button.dataset.insert)));
document.querySelectorAll('.segmented [data-view]').forEach(button=>button.addEventListener('click',()=>setView(button.dataset.view)));
window.addEventListener('keydown',(event)=>{
 if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='s'){event.preventDefault();saveData(true);}
});
let wasMobile=isMobile();
window.addEventListener('resize',()=>{
 const now=isMobile();if(now!==wasMobile){wasMobile=now;if(now&&grid.dataset.view==='split')setView('edit');}
 cm.refresh();
});
function initialize(){
 initializing=true;
 const savedText=store.read('writer_pad_text');
 const savedName=store.read('writer_pad_name');
 if(savedText!==null)cm.setValue(savedText);else cm.setValue(starter);
 if(savedName!==null)filenameInput.value=savedName;
 if(store.read('writer_pad_theme')==='dark')document.body.classList.add('dark-mode');
 const storedDialect=store.read('writer_pad_grammar_dialect');
 if(['american','british','australian','canadian'].includes(storedDialect)) $('grammarDialect').value=storedDialect;
 if(store.read('writer_pad_export_style') && $('exportStyle').querySelector('[value="'+store.read('writer_pad_export_style')+'"]')) $('exportStyle').value=store.read('writer_pad_export_style');
 setView(isMobile()?'edit':(store.read('writer_pad_view')||'edit'),false);
 updatePreview();updateStats();
 saveStatus.textContent=savedText!==null?'Draft restored · '+(autoSaveEnabled?'autosave on':'autosave off'):(autoSaveEnabled?'Ready · autosave on':'Ready · autosave off');
 $('autosaveToggle').checked=autoSaveEnabled;
 initializing=false;
 cm.refresh();
}
initialize();
syncEditorEmptyGuide();
