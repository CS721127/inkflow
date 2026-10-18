/* InkFlow mobile-safe A4 PDF download.
 * Pages are painted at their measured A4 size and placed inside a PDF with an
 * explicit /MediaBox. Unlike window.print(), no mobile paper-size/scale heuristics
 * are involved. Entirely local, no CDN or server-side conversion.
 * The PDF pages are rasterized for portability; use Print for selectable text. */
(function(global){
 'use strict';
 const A4_PDF_WIDTH = 595.275591;
 const A4_PDF_HEIGHT = 841.889764;
 const PIXELS_PER_MM = 96/25.4;
 const width=210*PIXELS_PER_MM, height=297*PIXELS_PER_MM;
 const encoder = new TextEncoder();
 const safeFonts = new Set();
 function pdfBytes(text){return encoder.encode(text);}
 function imageFromURL(url){
  return new Promise((resolve,reject)=>{
   const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Could not draw image'));
   image.src=url;
  });
 }
 function svgData(svg,size){
  const element=svg.cloneNode(true);
  element.setAttribute('xmlns','http://www.w3.org/2000/svg');
  // Explicit intrinsic dimensions are required when an inline SVG is drawn
  // into a canvas (otherwise some browsers paint a blank image).
  element.setAttribute('width',String(Math.max(1,size.w)));
  element.setAttribute('height',String(Math.max(1,size.h)));
  return URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(element)],{type:'image/svg+xml;charset=utf-8'}));
 }
 function localRect(el,pageRect){
  const r=el.getBoundingClientRect();return {x:r.left-pageRect.left,y:r.top-pageRect.top,w:r.width,h:r.height};
 }
 function inView(el){
  const s=getComputedStyle(el);return s.display!=='none' && Number(s.opacity)!==0;
 }
 function validColor(c){return c && !/^(transparent|rgba\(0,\s*0,\s*0,\s*0\))$/.test(c);}
 function paintRect(ctx,r,color){if(!validColor(color)||r.w<=0||r.h<=0)return;ctx.fillStyle=color;ctx.fillRect(r.x,r.y,r.w,r.h);}
 function paintRule(ctx,r,color,thickness=1){ctx.fillStyle=color;ctx.fillRect(r.x,r.y,Math.max(r.w,1),Math.max(thickness,1));}
 function paintChrome(ctx,sheet,sr){
  const root=sheet.querySelector('.pdf-flow');if(!root)return;
  const paintedTags=new Set(['PRE','CODE','BLOCKQUOTE','TABLE','THEAD','TH','TD','TR','HR','INPUT']);
  for(const el of [root,...root.querySelectorAll('*')]){
   if(!paintedTags.has(el.tagName)||!inView(el))continue;
   const s=getComputedStyle(el),r=localRect(el,sr);
   if(['PRE','BLOCKQUOTE','TH','TD'].includes(el.tagName)){
    paintRect(ctx,r,s.backgroundColor);
   }
   if(el.tagName==='HR')paintRule(ctx,{...r,y:r.y+Math.max(0,r.h/2)},s.borderTopColor||'#d1d5db',1);
   if(['TD','TH','TABLE'].includes(el.tagName)){
    ctx.strokeStyle=s.borderTopColor && s.borderTopStyle!=='none'?s.borderTopColor:'#dedede';
    ctx.lineWidth=0.7;ctx.strokeRect(r.x+0.35,r.y+0.35,Math.max(0,r.w-0.7),Math.max(0,r.h-0.7));
   }
   if(el.tagName==='BLOCKQUOTE'){
    ctx.fillStyle=s.borderLeftColor||'#d1d5db';ctx.fillRect(r.x,r.y,3,r.h);
   }
   if(el.tagName==='INPUT'&&el.type==='checkbox'){
    ctx.strokeStyle='#6b7280';ctx.lineWidth=1;ctx.strokeRect(r.x,r.y,Math.max(r.w,9),Math.max(r.h,9));
    if(el.checked){ctx.fillStyle='#333';ctx.font='12px sans-serif';ctx.fillText('✓',r.x,r.y-1);}
   }
  }
  // List markers are CSS-generated and do not exist as DOM text nodes.
  for(const li of root.querySelectorAll('li')){
   const s=getComputedStyle(li),r=localRect(li,sr),parent=li.parentElement;
   if(!parent||s.listStyleType==='none'||li.querySelector('input[type=checkbox]'))continue;
   if(parent.tagName==='UL'){
    ctx.fillStyle='#444';ctx.beginPath();ctx.arc(r.x-10,r.y+9,2,0,Math.PI*2);ctx.fill();
   }else if(parent.tagName==='OL'){
    const index=Array.prototype.indexOf.call(parent.children,li)+(parseInt(parent.getAttribute('start')||'1',10)||1);
    ctx.fillStyle='#444';ctx.font='13px Georgia,serif';ctx.textAlign='right';ctx.fillText(index+'.',r.x-5,r.y+2);ctx.textAlign='left';
   }
  }
 }
 function textNodes(root){
  const nodes=[];const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  while(walker.nextNode()){
   const node=walker.currentNode;const parent=node.parentElement;
   if(!parent||!node.nodeValue.trim()||!inView(parent))continue;
   if(parent.closest('svg,mjx-container,.iwp-math'))continue;
   nodes.push(node);
  }
  return nodes;
 }
 function paintText(ctx,sheet,sr){
  const root=sheet.querySelector('.pdf-flow');if(!root)return;
  const range=document.createRange();ctx.textBaseline='top';
  for(const node of textNodes(root)){
   const text=node.nodeValue,parent=node.parentElement,style=getComputedStyle(parent);
   const fontSize=parseFloat(style.fontSize)||14;
   ctx.font=[style.fontStyle,style.fontWeight,fontSize+'px',style.fontFamily].join(' ');
   ctx.fillStyle=style.color||'#2b2930';
   const chars=Array.from(text), offsets=[0];for(const c of chars)offsets.push(offsets.at(-1)+c.length);
   for(let i=0;i<chars.length;i++){
    const c=chars[i];if(!c.trim()||c==='\u200b')continue;
    range.setStart(node,offsets[i]);range.setEnd(node,offsets[i+1]);
    const r=range.getBoundingClientRect();if(!r.width||!r.height)continue;
    const x=r.left-sr.left, y=r.top-sr.top;
    if(x>=-1&&y>=-1&&x<width+1&&y<height+1)ctx.fillText(c,x,y+(r.height-fontSize)*.12);
   }
  }
  range.detach?.();
 }
 async function paintImage(ctx,node,sr){
  try{
   const r=localRect(node,sr);if(r.w<=0||r.h<=0)return;
   let image,url;
   if(node.tagName.toLowerCase()==='svg'){
    url=svgData(node,r);try{image=await imageFromURL(url);}finally{URL.revokeObjectURL(url);}
   }else if(node.tagName.toLowerCase()==='img'){
    if(!node.complete||!node.naturalWidth)return;
    // Cross-origin images without CORS headers would taint the page canvas.
    // Skip them instead of breaking the entire download.
    try{
      const src=new URL(node.currentSrc||node.src,document.baseURI);
      if(!['data:','blob:'].includes(src.protocol)&&src.origin!==location.origin)return;
    }catch{return;}
    image=node;
   }else return;
   ctx.drawImage(image,r.x,r.y,r.w,r.h);
  }catch(err){console.warn('Skipping an unrenderable image in mobile PDF:',err);}
 }
 async function paintPage(sheet,{resolution=1.65}={}){
  const pixelRatio=Math.min(Math.max(resolution,1),2);
  const canvas=document.createElement('canvas');
  canvas.width=Math.round(width*pixelRatio);canvas.height=Math.round(height*pixelRatio);
  const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('Canvas unavailable');
  ctx.setTransform(canvas.width/width,0,0,canvas.height/height,0,0);
  ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);
  const sr=sheet.getBoundingClientRect();
  const art=sheet.querySelector('.pdf-sheet-art svg');if(art)await paintImage(ctx,art,sr);
  paintChrome(ctx,sheet,sr);paintText(ctx,sheet,sr);
  const flow=sheet.querySelector('.pdf-flow');
  if(flow){
   // MathJax emits inline SVGs. HTML images are painted after prose.
   const graphics=flow.querySelectorAll('svg,img');
   for(const graphic of graphics){
    if(graphic.closest('svg')!==null && graphic.tagName.toLowerCase()!=='svg')continue;
    await paintImage(ctx,graphic,sr);
   }
  }
  const data=canvas.toDataURL('image/jpeg',.90);
  canvas.width=canvas.height=0;
  const binary=atob(data.slice(data.indexOf(',')+1));
  const bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  return {bytes,w:Math.round(width*pixelRatio),h:Math.round(height*pixelRatio)};
 }
 function createPDF(images){
  const objects=[];
  function reserve(){objects.push(null);return objects.length;}
  function set(id,parts){objects[id-1]=parts;}
  const catalog=reserve(),tree=reserve(),pageIDs=[];
  for(const im of images){
   const picture=reserve(),stream=reserve(),page=reserve();pageIDs.push(page);
   set(picture,[pdfBytes(`<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.bytes.length} >>\nstream\n`),im.bytes,pdfBytes('\nendstream')]);
   const command=`q ${A4_PDF_WIDTH} 0 0 ${A4_PDF_HEIGHT} 0 0 cm /Im0 Do Q\n`;
   set(stream,[pdfBytes(`<< /Length ${command.length} >>\nstream\n${command}endstream`)]);
   set(page,[pdfBytes(`<< /Type /Page /Parent ${tree} 0 R /MediaBox [0 0 ${A4_PDF_WIDTH} ${A4_PDF_HEIGHT}] /Resources << /XObject << /Im0 ${picture} 0 R >> >> /Contents ${stream} 0 R >>`)]);
  }
  set(tree,[pdfBytes(`<< /Type /Pages /Kids [${pageIDs.map(p=>p+' 0 R').join(' ')}] /Count ${pageIDs.length} >>`)]);
  set(catalog,[pdfBytes(`<< /Type /Catalog /Pages ${tree} 0 R >>`)]);
  const parts=[pdfBytes('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')],offsets=[0];let offset=parts[0].length;
  for(let i=0;i<objects.length;i++){
   offsets.push(offset);
   for(const part of [pdfBytes(`${i+1} 0 obj\n`),...objects[i],pdfBytes('\nendobj\n')]){parts.push(part);offset+=part.length;}
  }
  const xref=offset;
  parts.push(pdfBytes(`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`));
  for(const start of offsets.slice(1))parts.push(pdfBytes(String(start).padStart(10,'0')+' 00000 n \n'));
  parts.push(pdfBytes(`trailer\n<< /Size ${objects.length+1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`));
  return new Blob(parts,{type:'application/pdf'});
 }
 async function generate(container,options={}){
  const sheets=Array.from(container.querySelectorAll(':scope > .pdf-sheet'));
  if(!sheets.length)throw new Error('Preview pages have not been prepared yet');
  const images=[];
  for(let i=0;i<sheets.length;i++){
   options.onProgress?.(i+1,sheets.length);
   images.push(await paintPage(sheets[i],options));
   // Avoid blocking iOS Safari's main thread continuously for multi-page docs.
   if((i+1)%2===0)await new Promise(resolve=>setTimeout(resolve,0));
  }
  return createPDF(images);
 }
 function download(blob,filename){
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');link.href=url;link.download=filename;
  document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),45000);
 }
 global.InkFlowPdfDownload={generate,download,pageSize:[A4_PDF_WIDTH,A4_PDF_HEIGHT]};
})(window);
