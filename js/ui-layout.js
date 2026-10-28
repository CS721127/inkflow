
(function(){
 const $=id=>document.getElementById(id),dashboard=$('writingDashboard'),toggle=$('dashboardToggle'),scrim=$('dashboardScrim'),native=$('nativeMobileEditor');
 function dashboardOpen(show){dashboard.hidden=!show;toggle.setAttribute('aria-expanded',String(show));scrim.hidden=!(show && innerWidth<=820);if(show && innerWidth<=820) native.blur();requestAnimationFrame(()=>cm.refresh());}
 const more=$('mobileMoreButton'),fileMore=$('fileMoreButton'),bar=$('mainToolbar'),fileBar=document.querySelector('.file-commands');
 more.addEventListener('click',()=>{const next=!bar.classList.contains('expanded');bar.classList.toggle('expanded',next);more.setAttribute('aria-expanded',String(next));more.textContent=next?'Less':'More';});
 fileMore.addEventListener('click',()=>{const next=!fileBar.classList.contains('expanded');fileBar.classList.toggle('expanded',next);fileMore.setAttribute('aria-expanded',String(next));fileMore.textContent=next?'Less':'File tools';});
 toggle.addEventListener('click',()=>dashboardOpen(dashboard.hidden));$('dashboardClose').addEventListener('click',()=>dashboardOpen(false));scrim.addEventListener('click',()=>dashboardOpen(false));
 $('analyzeButton').addEventListener('click',()=>dashboardOpen(true));
 document.addEventListener('keydown',e=>{if(e.key==='Escape' && !dashboard.hidden)dashboardOpen(false)});
 const mobile=()=>innerWidth<=820;
 let lastNativeSelection={start:0,end:0};
 const syncNative=()=>{if(native.value!==cm.getValue())native.value=cm.getValue()};
 cm.on('change',syncNative);syncNative();
 native.addEventListener('input',()=>{if(native.value!==cm.getValue()){cm.setValue(native.value);}});
 const remember=()=>lastNativeSelection={start:native.selectionStart,end:native.selectionEnd};
 ['select','keyup','mouseup','touchend','blur'].forEach(t=>native.addEventListener(t,remember));
 // The small Copy/Paste controls work with both CodeMirror and the native
 // mobile textarea. Selection is remembered before a toolbar tap blurs it.
 const copyButton=$('copyTextButton'),pasteButton=$('pasteTextButton');
 let inAppClipboard=null;
 for(const button of [copyButton,pasteButton]){
   button.addEventListener('pointerdown',()=>{if(mobile())remember()});
 }
 function copyFallback(text){
   const temporary=document.createElement('textarea');
   temporary.value=text;
   temporary.setAttribute('aria-hidden','true');
   temporary.setAttribute('readonly','');
   Object.assign(temporary.style,{position:'fixed',top:'0',left:'0',width:'1px',height:'1px',opacity:'0'});
   document.body.appendChild(temporary);
   temporary.focus();temporary.select();
   let copied=false;
   try{copied=document.execCommand('copy')}catch{}
   temporary.remove();
   return copied;
 }
 copyButton.addEventListener('click',async()=>{
   const onMobile=mobile();
   const {start,end}=lastNativeSelection;
   const selected=onMobile?native.value.slice(start,end):cm.getSelection();
   const text=selected||cm.getValue();
   if(!text){showMessage('Nothing to copy.');return;}
   inAppClipboard=text; // memory-only fallback, never saved or uploaded
   let copied=false;
   // Prefer the browser clipboard, with an older-browser fallback.
   // After a denied async permission request, execCommand may also fail.
   if(navigator.clipboard?.writeText){
     try{await navigator.clipboard.writeText(text);copied=true}catch{}
   }
   if(!copied)copied=copyFallback(text);
   if(onMobile){native.focus({preventScroll:true});native.setSelectionRange(start,end);remember();}
   else cm.focus();
   showMessage(copied?(selected?'Selection copied.':'Document copied.'):'Copied within InkFlow. System clipboard access was blocked.');
 });
 pasteButton.addEventListener('click',async()=>{
   const onMobile=mobile();
   const targetFile=activeFileId;
   const originalContent=cm.getValue();
   const range={...lastNativeSelection};
   let text=null,fromInternal=false;
   if(navigator.clipboard?.readText){
     try{text=await navigator.clipboard.readText()}catch{}
   }
   if(text===null && inAppClipboard!==null){text=inAppClipboard;fromInternal=true;}
   if(text===null){
     showMessage('Clipboard access blocked. Use long-press → Paste or Ctrl/Cmd+V.');
     if(onMobile)native.focus({preventScroll:true});else cm.focus();
     return;
   }
   if(targetFile!==activeFileId || cm.getValue()!==originalContent){showMessage('Document changed. Choose Paste again.');return;}
   if(!text){showMessage('Clipboard is empty.');return;}
   if(onMobile){
     if(grid.dataset.view==='preview')setView('edit');
     // An in-progress native selection should survive the toolbar tap.
     const start=Math.min(range.start,native.value.length),end=Math.min(range.end,native.value.length);
     native.setRangeText(text,start,end,'end');
     cm.setValue(native.value); // uses existing change/save/preview handlers
     const cursor=start+text.length;
     native.focus({preventScroll:true});native.setSelectionRange(cursor,cursor);remember();
   }else{
     if(grid.dataset.view==='preview')setView('edit');
     cm.replaceSelection(text,'around');cm.focus();
   }
   showMessage(fromInternal?'Pasted last InkFlow copy (clipboard permission unavailable).':'Pasted at cursor.');
 });
 const cmFormat=insertFormat;
 insertFormat=function(type){
  if(!mobile())return cmFormat(type);
  if(grid.dataset.view==='preview')setView('edit');
  const s=Math.min(lastNativeSelection.start,native.value.length),e=Math.min(lastNativeSelection.end,native.value.length);
  const chosen=native.value.slice(s,e);
  let insertion='',lead=0,placeholder='';
  const prefixes={heading:'## ',list:'- ',task:'- [ ] ',quote:'> '};
  if(type in prefixes){const lineStart=native.value.lastIndexOf('\n',s-1)+1;native.setRangeText(prefixes[type],lineStart,lineStart,'end');}
  else{
   if(type==='bold'){placeholder='bold text';insertion='**'+(chosen||placeholder)+'**';lead=2;}
   else if(type==='italic'){placeholder='italic text';insertion='*'+(chosen||placeholder)+'*';lead=1;}
   else if(type==='code'){placeholder='code';insertion='`'+(chosen||placeholder)+'`';lead=1;}
   else if(type==='math'){placeholder='x^2';insertion='$'+(chosen||placeholder)+'$';lead=1;}
   else if(type==='mathBlock'){placeholder='E = mc^2';insertion='\n$$\n'+(chosen||placeholder)+'\n$$\n';lead=4;}
   else if(type==='link'){placeholder='link text';insertion='['+(chosen||placeholder)+'](https://example.com)';lead=1;}
   native.setRangeText(insertion,s,e,'end');
   if(!chosen && placeholder)native.setSelectionRange(s+lead,s+lead+placeholder.length);
  }
  cm.setValue(native.value);native.focus({preventScroll:true});remember();
 };
 // Avoid overwriting an active mobile text selection when switching between views.
 const oldSetView=setView;
 setView=function(view,persist){oldSetView(view,persist);if(mobile()&&view==='edit')syncNative()};
 window.addEventListener('resize',()=>{syncNative();if(innerWidth>820)scrim.hidden=true;else scrim.hidden=dashboard.hidden;cm.refresh()});
 // Dashboard is the only changed default state. All other InkFlow feature entries stay in place.
 dashboardOpen(false);
})();



/* DOM layout adapter. Existing editing, PDF, analysis and storage handlers
   are preserved by MOVING nodes, not cloning/replacing them. */
(function(){
 'use strict';
 const $=(id)=>document.getElementById(id);
 const mk=(tag,cl,text)=>{const el=document.createElement(tag);if(cl)el.className=cl;if(text!=null)el.textContent=text;return el};
 const app=document.querySelector('.app-container');
 const main=document.querySelector('.main-content');
 const header=main.querySelector('.header-section');
 const top=header.querySelector('.top-row');
 const mainToolbar=$('mainToolbar');
 if(!app||!main||!top||!mainToolbar||!$('fileTabs'))return;
 const nav=mk('aside','ink-nav');nav.id='inkNav';nav.setAttribute('aria-label','Workspace navigation');
 const navHead=mk('div','ink-nav-header');navHead.append(top.querySelector('.inkflow-brand'));nav.append(navHead);
 const actionGroup=mk('section','nav-section');
 const navNew=$('newFileButton');navNew.textContent='＋  New document';actionGroup.append(navNew);
 const importButton=$('importButton');importButton.querySelector('.ui-button-label').textContent='Open local files';actionGroup.append(importButton);
 nav.append(actionGroup);
 const filesGroup=mk('section','nav-section nav-file-list');
 filesGroup.append(mk('div','nav-section-title','Your files'));filesGroup.append($('fileTabs'));
 nav.append(filesGroup);
 const imports=mk('section','nav-section');
 imports.append(mk('div','nav-section-title','Import'));
 const extras=mk('div','nav-extras');
 const addFiles=$('addFilesButton'),folder=$('importFolderButton');
 addFiles.textContent='Add more files';folder.textContent='Open a folder';
 extras.append(addFiles,folder);imports.append(extras);nav.append(imports);
 const workspace=mk('details','nav-advanced');
 const wsSummary=mk('summary',null,'Workspace tools');workspace.append(wsSummary);
 const advanced=mk('div','nav-advanced-content');
 const importWs=$('openWorkspaceButton'),exportWs=$('downloadWorkspaceButton');
 importWs.textContent='Restore workspace';exportWs.textContent='Back up workspace';
 advanced.append(importWs,exportWs);workspace.append(advanced);nav.append(workspace);
 const footer=mk('section','nav-footer');
 const settings=$('settingsButton'),theme=$('themeButton'),clear=$('clearActions');
 if(settings.querySelector('.ui-button-label'))settings.querySelector('.ui-button-label').textContent='Settings';
 if(theme.querySelector('.ui-button-label'))theme.querySelector('.ui-button-label').textContent='Appearance';
 footer.append(settings,theme);nav.append(footer);
 app.insertBefore(nav,main);
 // The old file strip still owns the two hidden <input type=file> elements.
 const strip=document.querySelector('.file-strip');if(strip)strip.style.display='none';
 const scrim=mk('div');scrim.id='inkNavScrim';scrim.setAttribute('aria-hidden','true');
 app.insertBefore(scrim,main);
 // Primary header controls for the active document.
 const navToggle=mk('button','secondary');navToggle.id='inkNavToggle';navToggle.type='button';
 navToggle.setAttribute('aria-label','Open file navigation');navToggle.setAttribute('aria-expanded','false');navToggle.setAttribute('aria-controls','inkNav');
 navToggle.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
 const docInfo=mk('div','doc-info');docInfo.append(mk('span','doc-path','Workspace / Current document'));
 docInfo.append($('filenameInput'),$('saveStatus'));
 const actions=mk('div','top-actions');
 const analyze=$('analyzeButton'),save=$('saveButton'),dashboard=$('dashboardToggle');
 actions.append(analyze,save,clear,dashboard);
 top.append(navToggle,docInfo,actions);
 // Editing controls are a clearly named section above the editor.
 const tools=main.querySelector('.editor-tools'),grid=$('editorGrid');
 for(const [selector,label] of [['.editor-pane','Markdown editor'],['.preview-pane','Rendered preview']]){
   const pane=grid.querySelector(selector);
   const heading=mk('div','pane-label',label);pane.insertBefore(heading,pane.firstChild);
 }
 // A permanent, visually discrete Export section below the editor. All older
 // export controls are present, with their old JS handlers intact.
 const exportPanel=mk('section','export-panel');exportPanel.setAttribute('aria-label','Export document');
 const exportTop=mk('div','export-panel-top');
 exportTop.append(mk('h3',null,'Export document'),mk('span','export-caption','Download text or create a styled PDF'));
 exportPanel.append(exportTop);
 const format=$('exportFormat'),style=$('exportStyle');
 const download=$('downloadButton'),pdf=$('pdfButton'),gallery=$('stylePreviewButton');
 const formatLabel=mk('span','export-mini-label','File type');
 const styleLabel=mk('span','export-mini-label','PDF style');
 if(download.querySelector('.ui-button-label'))download.querySelector('.ui-button-label').textContent='Download file';
 if(pdf.querySelector('.ui-button-label'))pdf.querySelector('.ui-button-label').textContent='Export PDF';
 if(gallery.querySelector('.ui-button-label'))gallery.querySelector('.ui-button-label').textContent='Browse styles';
 const fileGroup=mk('div','export-group export-file');
 fileGroup.append(formatLabel,format,download);
 const pdfGroup=mk('div','export-group export-pdf');
 pdfGroup.append(styleLabel,style,gallery,pdf);
 mainToolbar.append(fileGroup,pdfGroup);
 mainToolbar.classList.add('expanded');
 exportPanel.append(mainToolbar);main.append(exportPanel);
 // Keep title and all section accessibility landmarks explicit.
 const handler=()=>{const active=document.body.classList.toggle('nav-open');navToggle.setAttribute('aria-expanded',String(active))};
 navToggle.addEventListener('click',handler);
 const closeNav=()=>{document.body.classList.remove('nav-open');navToggle.setAttribute('aria-expanded','false')};
 scrim.addEventListener('click',closeNav);
 nav.addEventListener('click',e=>{
  if(e.target.closest('#fileTabs .file-tab-select,#newFileButton,#addFilesButton,#importButton,#importFolderButton,#openWorkspaceButton,#downloadWorkspaceButton'))closeNav();
 });
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closeNav()});
 // Avoid trapping desktop keyboard focus when the mobile drawer closes.
 window.addEventListener('resize',()=>{if(window.innerWidth>920)closeNav()});
 // Keep blank-state and tab switching controlled by the original application.
 document.body.classList.add('ink-clear-ui');
})();


/* InkFlow UI refinement — uses original editor, workspace and A4 pagination engine. */
(function(){
'use strict';
const $ = id => document.getElementById(id);
const mk = (tag,cls,text) => {const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
const nav=$('inkNav'),navToggle=$('inkNavToggle'),files=$('fileTabs'),top=document.querySelector('.top-row'),panel=document.querySelector('.export-panel');
if(!nav||!navToggle||!files||!panel)return;
// Branding: intentionally wordmark-only.
nav.querySelectorAll('.brand-mark').forEach(el=>el.remove());
// Desktop workspace defaults to open. Mobile starts closed to preserve writing space.
const mobileNav=()=>window.innerWidth<=920;
const syncNav=()=>{
 const isOpen=mobileNav()?document.body.classList.contains('nav-open'):!document.body.classList.contains('nav-collapsed');
 navToggle.setAttribute('aria-expanded',String(isOpen));
 navToggle.setAttribute('aria-label',isOpen?'Hide file sidebar':'Show file sidebar');
};
const closeOldNav=()=>{document.body.classList.remove('nav-open');syncNav()};
const toggleNav=()=>{if(mobileNav())document.body.classList.toggle('nav-open');else document.body.classList.toggle('nav-collapsed');syncNav()};
// Capture phase replaces the old mobile-only toggle without changing its node.
navToggle.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();toggleNav()},true);
const collapse=mk('button','secondary','‹');collapse.type='button';collapse.id='navCollapseButton';collapse.title='Collapse sidebar';collapse.setAttribute('aria-label','Collapse sidebar');
nav.querySelector('.ink-nav-header').append(collapse);
collapse.addEventListener('click',()=>{if(mobileNav())closeOldNav();else {document.body.classList.add('nav-collapsed');syncNav();navToggle.focus()}});
window.addEventListener('resize',syncNav);syncNav();
// Do not duplicate breadcrumb text above the document name.
document.querySelectorAll('.doc-info .doc-path').forEach(el=>el.remove());
// Direct renaming within the sidebar, both double-click and explicit pencil action.
const pencil='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4l11-11a2.2 2.2 0 0 0-4-4L4 16v4z"/><path d="m13.5 6.5 4 4"/></svg>';
function activateRename(tab) {
 const row=tab.closest('.file-tab');if(!row||row.querySelector('.file-tab-input'))return;
 const all=Array.from(files.querySelectorAll('.file-tab'));
 const index=all.indexOf(row);
 if(index<0 || index>=openFiles.length)return;
 const doc=openFiles[index];const original=doc.name;
 const input=mk('input','file-tab-input');input.type='text';input.value=original;input.setAttribute('aria-label','Rename '+original);
 // Replace the visible name itself, rather than inserting a second control.
 // CSS on .file-tab-select uses display overrides, so `hidden` was not sufficient.
 const button=row.querySelector('.file-tab-select');
 if(!button)return;
 row.classList.add('is-renaming');
 button.replaceWith(input);
 let done=false;
 const finish=save=>{
  if(done)return;done=true;
  if(save){const proposed=input.value.trim();if(proposed && proposed!==original){
   // Switching synchronizes the central editor before renaming this file.
   if(activeFileId!==doc.id)openFile(doc.id);
   $('filenameInput').value=proposed;
   $('filenameInput').dispatchEvent(new Event('input',{bubbles:true}));
  }}
  renderFileTabs();
 };
 input.addEventListener('click',e=>e.stopPropagation());
 input.addEventListener('pointerdown',e=>e.stopPropagation());
 input.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();finish(true)}if(e.key==='Escape'){e.preventDefault();finish(false)}});
 input.addEventListener('blur',()=>finish(true));
 input.focus();input.select();
}
function decorateTabs(){
 files.querySelectorAll('.file-tab').forEach(row=>{
  if(row.querySelector('.file-tab-rename'))return;
  const btn=mk('button','file-tab-rename');btn.type='button';btn.innerHTML=pencil;btn.title='Rename this file';btn.setAttribute('aria-label','Rename file');
  const closer=row.querySelector('.file-tab-close');row.insertBefore(btn,closer);
  btn.addEventListener('click',e=>{e.stopPropagation();activateRename(btn)});
  const tab=row.querySelector('.file-tab-select');tab?.addEventListener('dblclick',e=>{e.preventDefault();activateRename(tab)});
 });
}
new MutationObserver(decorateTabs).observe(files,{childList:true,subtree:false});decorateTabs();
// Compact formatting tools and view controls retain their own, independent surfaces.
const editorTools=document.querySelector('.editor-tools');
if(editorTools){editorTools.setAttribute('aria-label','Writing controls');}
// Export: only two choices in the writing screen.
const exportTitle=panel.querySelector('.export-panel-top h3');if(exportTitle)exportTitle.textContent='Export';
const oldToolbar=$('mainToolbar');
const format=$('exportFormat'),download=$('downloadButton'),style=$('exportStyle');
const legacyPdf=$('pdfButton'),legacyGallery=$('stylePreviewButton');
const choices=mk('div','export-chooser');
const sourceChoice=mk('button','export-option');sourceChoice.type='button';sourceChoice.id='exportSourceChoice';sourceChoice.setAttribute('aria-pressed','true');
sourceChoice.innerHTML='<span>Source file<small>Markdown or plain text</small></span><span class="option-arrow" aria-hidden="true">⌄</span>';
const pdfChoice=mk('button','export-option');pdfChoice.type='button';pdfChoice.id='exportPdfChoice';pdfChoice.setAttribute('aria-pressed','false');
pdfChoice.innerHTML='<span>PDF document<small>Styled A4 pages</small></span><span class="option-arrow" aria-hidden="true">→</span>';
choices.append(sourceChoice,pdfChoice);
const sourceDetails=mk('div','export-source-details');sourceDetails.id='sourceExportDetails';
const fmtLabel=mk('label',null,'Format');fmtLabel.htmlFor='exportFormat';
if(download.querySelector('.ui-button-label'))download.querySelector('.ui-button-label').textContent='Download file';
sourceDetails.append(fmtLabel,format,download);
const panelTop=panel.querySelector('.export-panel-top');panelTop.after(choices,sourceDetails);
oldToolbar.hidden=true;
sourceChoice.addEventListener('click',()=>{
 const next=sourceDetails.hidden;sourceDetails.hidden=!next;sourceChoice.setAttribute('aria-pressed',String(next));
 sourceChoice.querySelector('.option-arrow').textContent=next?'⌄':'›';
});
// PDF flow is a second full-viewport screen within the same offline HTML document.
const route=mk('section');route.id='pdfWorkflow';route.setAttribute('aria-label','PDF export workspace');route.innerHTML=`
 <div class="pdf-route-topbar">
  <div class="pdf-route-left"><button type="button" class="secondary" id="pdfBackButton">← Back</button>
   <div class="pdf-route-title"><strong>Export as PDF</strong><span id="pdfDocumentName">Document</span></div></div>
  <div class="pdf-route-actions"><button type="button" id="downloadPdfButton" disabled>Download A4 PDF</button><button type="button" class="secondary" id="printPdfButton" disabled>Print</button></div>
 </div>
 <div class="pdf-route-body">
  <aside class="pdf-route-controls">
   <div><h2>Paper style</h2><p>Choose a design for every page of your document.</p>
     <div class="pdf-selected-thumb"><img id="pdfSelectedPhoto" alt="Selected stationery design"><div><span id="pdfSelectedName">Plain</span><small>Applied to all A4 pages</small></div></div>
   </div>
   <div class="pdf-style-picker"><label for="exportStyle">Selected style</label>
    <button class="secondary" type="button" id="browsePdfStyles" aria-expanded="false">Browse styles</button></div>
   <div id="pdfGallery" aria-label="Available PDF styles"></div>
   <div class="pdf-controls-foot">A4 · 210 × 297 mm<br>Each page has its own background. Use the print dialog to save a PDF.</div>
  </aside>
  <section class="pdf-route-preview" aria-label="PDF page preview">
   <div class="pdf-preview-heading">Page preview <span id="pdfPageCount">Preparing…</span></div>
   <div id="pdfLoading" role="status">Preparing document preview…</div>
   <div id="pdfPreviewPages" class="pdf-paginated"></div>
  </section>
 </div>`;
document.body.append(route);
const picker=route.querySelector('.pdf-style-picker');picker.insertBefore(style,$('browsePdfStyles'));
legacyPdf.hidden=true;legacyGallery.hidden=true;
const styleNames={classic:'Plain',ruled:'Ruled paper',vintage:'Vintage letter',floral:'Floral letter',kawaii:'Cute cartoon',sky:'Sky & clouds',sakura:'Sakura blossom',botanical:'Sage botanical',grid:'Graph notebook',coffee:'Cozy coffee',night:'Moonlit stars',geometric:'Pastel geometric'};
const gallery=$('pdfGallery'),previewPages=$('pdfPreviewPages'),loading=$('pdfLoading'),print=$('printPdfButton'),downloadPDF=$('downloadPdfButton');
let buildSeq=0,requestTimer=0;
// Inline SVG thumbnails keep this UI demo truly self-contained.
function templateThumbnail(id){
 const ink=id==='night'?'#eeeaf6':'#736f68';
 const base=stationeryArt[id] || '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 297"><rect width="210" height="297" fill="#ffffff"/></svg>';
 const sample='<g fill="'+ink+'" opacity=".50"><rect x="41" y="47" width="70" height="3" rx="1.5"/><rect x="41" y="61" width="127" height="1.8" rx=".9"/><rect x="41" y="73" width="117" height="1.8" rx=".9"/><rect x="41" y="85" width="126" height="1.8" rx=".9"/><rect x="41" y="97" width="89" height="1.8" rx=".9"/></g>';
 return 'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(base.replace(/<\/svg>\s*$/i,sample+'</svg>'));
}
for(const [id,name] of Object.entries(styleNames)){
 const b=mk('button','pdf-style-tile');b.type='button';b.dataset.style=id;b.setAttribute('aria-label','Use '+name+' style');
 const photo=mk('img');photo.src=templateThumbnail(id);photo.alt=name+' sample';photo.loading='lazy';
 const label=mk('span',null,name);b.append(photo,label);
 b.addEventListener('click',()=>{style.value=id;style.dispatchEvent(new Event('change',{bubbles:true}));});gallery.append(b);
}
function paintStyle(){
 const current=style.value;
 $('pdfSelectedPhoto').src=templateThumbnail(current);
 $('pdfSelectedName').textContent=styleNames[current]||current;
 gallery.querySelectorAll('.pdf-style-tile').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.style===current)));
}
function closePDF(){document.body.classList.remove('pdf-workflow-open');gallery.classList.remove('open');$('browsePdfStyles').setAttribute('aria-expanded','false');sourceChoice.setAttribute('aria-pressed',String(!sourceDetails.hidden));pdfChoice.setAttribute('aria-pressed','false');$('browsePdfStyles').textContent='Browse styles';navToggle.focus();requestAnimationFrame(()=>cm.refresh())}
$('pdfBackButton').addEventListener('click',closePDF);
$('browsePdfStyles').addEventListener('click',()=>{const shown=gallery.classList.toggle('open');$('browsePdfStyles').setAttribute('aria-expanded',String(shown));$('browsePdfStyles').textContent=shown?'Hide styles':'Browse styles';});
const pagePxW=210/25.4*96,pagePxH=297/25.4*96;
function renderSheets(){
 const all=Array.from($('print-area').querySelectorAll(':scope > .pdf-sheet'));
 const displayWidth=Math.max(200,Math.min(pagePxW,route.querySelector('.pdf-route-preview').clientWidth-34));
 const scale=displayWidth/pagePxW;
 previewPages.replaceChildren();
 all.forEach(sheet=>{
  const frame=mk('div','pdf-page-frame');frame.style.width=(pagePxW*scale)+'px';frame.style.height=(pagePxH*scale)+'px';
  const inner=mk('div','pdf-page-inner');inner.style.width=pagePxW+'px';inner.style.height=pagePxH+'px';inner.style.transform='scale('+scale+')';
  inner.append(sheet.cloneNode(true));frame.append(inner);previewPages.append(frame);
 });
 $('pdfPageCount').textContent=all.length+' page'+(all.length===1?'':'s')+' · A4';
}
async function preparePDF(){
 const seq=++buildSeq;
 print.disabled=true;downloadPDF.disabled=true;loading.hidden=false;loading.textContent='Preparing document preview…';
 try {
  updatePreview();
  await WriterMath.ready();
  if(seq!==buildSeq)return;
  if(document.fonts?.ready)await document.fonts.ready;
  // Give browser content images a chance to settle before pagination.
  await Promise.all(Array.from(preview.querySelectorAll('img')).map(img=>img.complete?Promise.resolve():new Promise(resolve=>{
   img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true});setTimeout(resolve,2400);
  })));
  if(seq!==buildSeq)return;
  const input=cm.getValue();
  const result=WriterPdfPages.build($('print-area'),{
   style:style.value,title:$('filenameInput').value.trim()||'Untitled Document',
   hasHeading:/^\s*#\s+/.test(input),html:input.trim()?preview.innerHTML:'',stationery:stationeryArt
  });
  if(seq!==buildSeq)return;
  renderSheets();loading.hidden=true;print.disabled=false;downloadPDF.disabled=false;
  if(result.warnings)loading.textContent='Some oversized content might not fit within one page.';
 } catch(err){console.error(err);loading.hidden=false;loading.textContent='Unable to generate preview: '+err.message;}
}
function openPDF(){
 sourceChoice.setAttribute('aria-pressed','false');pdfChoice.setAttribute('aria-pressed','true');
 $('pdfDocumentName').textContent=$('filenameInput').value.trim()||'Untitled Document';
 document.body.classList.add('pdf-workflow-open');paintStyle();preparePDF();
}
pdfChoice.addEventListener('click',openPDF);
style.addEventListener('change',()=>{paintStyle();if(document.body.classList.contains('pdf-workflow-open')){
 clearTimeout(requestTimer);requestTimer=setTimeout(preparePDF,75);
}});
// Fully prepared sheets are printed synchronously from a direct user gesture.
print.addEventListener('click',()=>{if(!print.disabled)window.print()});
// Downloading an actual PDF avoids WebKit's native print page-size heuristics.
// Each generated page has a fixed A4 MediaBox (595.28 x 841.89 PDF points).
downloadPDF.addEventListener('click',async()=>{
 if(downloadPDF.disabled||!window.InkFlowPdfDownload)return;
 downloadPDF.disabled=true;print.disabled=true;
 const oldText=downloadPDF.textContent;
 try{
  const pdf=await InkFlowPdfDownload.generate($('print-area'),{
   onProgress:(page,total)=>{downloadPDF.textContent='Creating '+page+'/'+total+'…';}
  });
  const base=($('filenameInput').value.trim()||'InkFlow Document').replace(/[\\/:*?"<>|\x00-\x1F]/g,'_').replace(/\.pdf$/i,'');
  InkFlowPdfDownload.download(pdf,base+'.pdf');
 }catch(error){
  console.error('Direct A4 PDF download failed',error);
  loading.hidden=false;
  loading.textContent='Direct PDF download failed. You can still try Print on a computer. '+error.message;
 }finally{
  downloadPDF.textContent=oldText;
  downloadPDF.disabled=false;print.disabled=false;
 }
});
window.addEventListener('resize',()=>{if(document.body.classList.contains('pdf-workflow-open') && !print.disabled)renderSheets()});
document.addEventListener('keydown',e=>{if(e.key==='Escape' && document.body.classList.contains('pdf-workflow-open')){e.preventDefault();closePDF();}},true);
// Keep browser and desktop window titles consistent.
document.title='InkFlow — Markdown Workspace';
})();

/* Editor preferences: line numbers are independently configurable from autosave. */
(function(){
 'use strict';
 const toggle=document.getElementById('lineNumbersToggle');
 if(!toggle || typeof cm==='undefined')return;
 const key='writer_pad_show_line_numbers';
 const load=()=>{try{return localStorage.getItem(key)!=='false'}catch{return true}};
 const apply=visible=>{cm.setOption('lineNumbers',visible);toggle.checked=visible;requestAnimationFrame(()=>cm.refresh())};
 apply(load());
 toggle.addEventListener('change',()=>{const on=toggle.checked;apply(on);try{localStorage.setItem(key,String(on))}catch{}});
 const clear=document.getElementById('clearStorageButton');
 clear?.addEventListener('click',()=>apply(true));
})();
/* Keep the empty-document guide aligned to the actual first character in
   CodeMirror.  The line-number gutter changes width and must never overlay it. */
(function(){
 const guide=document.getElementById('editorEmptyGuide');
 if(!guide)return;
 const align=()=>{
  if(typeof cm==='undefined')return;
  if(window.innerWidth<=820){
   guide.style.removeProperty('--inkflow-guide-left');
   return;
  }
  const host=guide.parentElement;
  if(!host)return;
  const x=cm.charCoords({line:0,ch:0},'window').left;
  const inset=Math.max(10,Math.ceil(x-host.getBoundingClientRect().left));
  guide.style.setProperty('--inkflow-guide-left',inset+'px');
 };
 // ResizeObserver covers sidebar collapse and the editor/view layout changes.
 if(typeof ResizeObserver!=='undefined')new ResizeObserver(align).observe(guide.parentElement);
 cm.on('refresh',align);
 cm.on('change',()=>requestAnimationFrame(align));
 window.addEventListener('resize',align);
 requestAnimationFrame(align);
 guide.addEventListener('click',()=>{
  const mobile=document.getElementById('nativeMobileEditor');
  if(window.innerWidth<=820)mobile?.focus({preventScroll:true});
  else cm.focus();
 });
})();
