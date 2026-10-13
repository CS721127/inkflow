/* Paginated, on-device PDF print builder. Each A4 sheet has its own SVG paper artwork.
 * Splits long paragraphs and code blocks rather than letting a single fixed SVG
 * float across native print pages (a common mobile browser failure).
 * No network requests or PDF rasterization are involved. */
'use strict';
const WriterPdfPages = (() => {
  const MAX_PAGES = 350;
  const TOLERANCE = 1.0; // CSS px; allow browser rounding at physical mm edges.
  const getMargins = style => {
    const fancy = !['classic','ruled'].includes(style);
    return {top:fancy?27:18, bottom:fancy?31:18,
            left:['ruled','grid'].includes(style)?33:(fancy?23:19),
            right:style==='ruled'?18:(fancy?23:19)};
  };

  function build(target,{style='classic',title='',hasHeading=false,html='',stationery={}}={}) {
    const margins=getMargins(style);
    target.innerHTML='';
    target.classList.add('pdf-paginated');
    target.dataset.stationery=style;
    const source=document.createElement('div');
    if(!hasHeading){
      const header=document.createElement('div');
      header.className='print-title';header.textContent=title||'Untitled Document';
      source.append(header);
    }
    const parsed=document.createElement('div');parsed.innerHTML=html;
    source.append(...Array.from(parsed.childNodes));
    let page=null;
    const pages=[];
    function createPage(){
      if(pages.length>=MAX_PAGES)throw new Error('Document exceeds '+MAX_PAGES+' pages.');
      const sheet=document.createElement('section');
      sheet.className='pdf-sheet';
      sheet.style.setProperty('--pdf-top',margins.top+'mm');
      sheet.style.setProperty('--pdf-bottom',margins.bottom+'mm');
      sheet.style.setProperty('--pdf-left',margins.left+'mm');
      sheet.style.setProperty('--pdf-right',margins.right+'mm');
      sheet.setAttribute('aria-label','PDF page '+(pages.length+1));
      if(style!=='classic' && stationery[style]) {
        const art=document.createElement('div');art.className='pdf-sheet-art';
        // This SVG is owned by the project, not user-supplied Markdown.
        art.innerHTML=stationery[style];
        sheet.append(art);
      }
      const inner=document.createElement('div');inner.className='pdf-sheet-inner';
      const flow=document.createElement('article');flow.className='markdown-body pdf-flow';
      inner.append(flow);sheet.append(inner);target.append(sheet);
      page={sheet,inner,flow};pages.push(page);
      return page;
    }
    function fits(){
      return page.flow.getBoundingClientRect().height <= page.inner.getBoundingClientRect().height+TOLERANCE;
    }
    function tryPlace(node){
      page.flow.append(node);
      if(fits())return true;
      node.remove();return false;
    }
    const hasContent=()=>page.flow.childNodes.length>0;
    const makeListSplit=(original,prefixCount)=>{
      const top=original.cloneNode(false),rest=original.cloneNode(false);
      const nodes=Array.from(original.children);
      nodes.slice(0,prefixCount).forEach(node=>top.append(node.cloneNode(true)));
      nodes.slice(prefixCount).forEach(node=>rest.append(node.cloneNode(true)));
      if(original.tagName==='OL'){
        const start=Number(original.getAttribute('start')||'1')||1;
        rest.setAttribute('start',String(start+prefixCount));
      }
      return [top,rest];
    };
    function fitSplitList(node){
      const count=node.children.length;
      if(count<=1)return null;
      let lo=1,hi=count-1,best=0;
      while(lo<=hi){
        const mid=(lo+hi)>>1;
        const [first]=makeListSplit(node,mid);
        if(tryPlace(first)){first.remove();best=mid;lo=mid+1;}
        else hi=mid-1;
      }
      return best?makeListSplit(node,best):null;
    }
    function splitPre(node){
      const code=node.querySelector('code');
      const sourceText=code?code.textContent:node.textContent;
      const lines=sourceText.split('\n');
      if(lines.length<2)return null;
      function make(text){const pre=node.cloneNode(false);if(code){const copy=code.cloneNode(false);copy.textContent=text;pre.append(copy);}else pre.textContent=text;return pre;}
      let lo=1,hi=lines.length-1,best=0;
      while(lo<=hi){
        const mid=(lo+hi)>>1;
        const first=make(lines.slice(0,mid).join('\n'));
        if(tryPlace(first)){first.remove();best=mid;lo=mid+1;}
        else hi=mid-1;
      }
      return best?[make(lines.slice(0,best).join('\n')),make(lines.slice(best).join('\n'))]:null;
    }
    function splitTable(node){
      // Repeat the table header on every resulting print sheet.
      const allRows=Array.from(node.querySelectorAll('tbody > tr'));
      if(allRows.length<2)return null;
      const repeatRows=number=>{
        const t=node.cloneNode(true);
        t.querySelectorAll('tbody').forEach(b=>b.replaceChildren());
        const tbody=t.querySelector('tbody');
        if(tbody)allRows.slice(0,number).forEach(r=>tbody.append(r.cloneNode(true)));
        return t;
      };
      let lo=1,hi=allRows.length-1,best=0;
      while(lo<=hi){
        const mid=(lo+hi)>>1,first=repeatRows(mid);
        if(tryPlace(first)){first.remove();best=mid;lo=mid+1;}
        else hi=mid-1;
      }
      if(!best)return null;
      const tail=node.cloneNode(true);
      tail.querySelectorAll('tbody').forEach(b=>b.replaceChildren());
      const body=tail.querySelector('tbody');
      allRows.slice(best).forEach(r=>body.append(r.cloneNode(true)));
      return [repeatRows(best),tail];
    }
    function splitText(node){
      // Clone by DOM Range so **bold**, inline math, links, etc. keep their markup.
      // Skip text within SVG: MathJax equations are atomic blocks, not split text.
      const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT,{acceptNode(n){
        const parent=n.parentElement;
        if(parent?.closest('svg,math,script,style'))return NodeFilter.FILTER_REJECT;
        return n.nodeValue.length?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;
      }});
      const textNodes=[];let total=0;
      while(walker.nextNode()){
        const n=walker.currentNode;textNodes.push({n,begin:total,len:n.nodeValue.length});total+=n.nodeValue.length;
      }
      if(total<2)return null;
      const partsAt=pos=>{
        let part=textNodes[textNodes.length-1],offset=part.len;
        for(const entry of textNodes){
          if(pos<=entry.begin+entry.len){part=entry;offset=pos-entry.begin;break;}
        }
        const before=document.createRange();before.selectNodeContents(node);before.setEnd(part.n,offset);
        const after=document.createRange();after.selectNodeContents(node);after.setStart(part.n,offset);
        const head=node.cloneNode(false);head.append(before.cloneContents());
        const tail=node.cloneNode(false);tail.append(after.cloneContents());
        before.detach?.();after.detach?.();
        return [head,tail];
      };
      let lo=1,hi=total-1,best=0;
      while(lo<=hi){
        const mid=Math.floor((lo+hi)/2),[head]=partsAt(mid);
        if(tryPlace(head)){head.remove();best=mid;lo=mid+1;}
        else hi=mid-1;
      }
      if(!best)return null;
      // Prefer a nearby word boundary without sacrificing too much available space.
      let split=best;
      for(let back=1;back<=Math.min(20,best-1);back++){
        const offset=best-back;
        const sourceNode=textNodes.find(e=>offset>e.begin && offset<=e.begin+e.len);
        if(sourceNode && /[\s,.;:!?，。；：、]/.test(sourceNode.n.nodeValue[offset-sourceNode.begin-1])){
          if(offset>=Math.floor(best*.90)){split=offset;break;}
        }
      }
      return partsAt(split);
    }
    function splitNode(node){
      const name=node.nodeName;
      if(name==='UL'||name==='OL')return fitSplitList(node)||splitText(node);
      if(name==='PRE')return splitPre(node)||splitText(node);
      if(name==='TABLE')return splitTable(node)||splitText(node);
      return splitText(node);
    }
    createPage();
    const sourceNodes=Array.from(source.children);
    // Avoid huge page counts for empty documents, and preserve all Markdown content.
    const pending=[...sourceNodes];
    while(pending.length){
      const node=pending.shift();
      if(tryPlace(node))continue;
      if(hasContent()){
        // Fit a useful portion of a long paragraph on the current sheet.
        // If a heading precedes it, retain the heading only if some of its
        // text can travel with the heading onto this page.
        const available=page.inner.getBoundingClientRect().height-page.flow.getBoundingClientRect().height;
        if(available>110){
          const fragments=splitNode(node);
          if(fragments && tryPlace(fragments[0])){
            createPage();pending.unshift(fragments[1]);continue;
          }
        }
        // Not enough space even for a portion: move a trailing heading with
        // this block to the next sheet rather than orphaning it.
        const last=page.flow.lastElementChild;
        if(last && /^H[1-6]$/.test(last.tagName)){
          last.remove();createPage();pending.unshift(node);pending.unshift(last);continue;
        }
        createPage();pending.unshift(node);continue;
      }
      const pair=splitNode(node);
      if(pair){
        const [head,tail]=pair;
        if(tryPlace(head)){
          if(tail.textContent.trim()||tail.querySelector('img,svg,hr,input')){
            createPage();pending.unshift(tail);
          }
          continue;
        }
      }
      // Unsplittable vector or image: constrain inside the page instead of
      // emitting a clipped duplicate or an infinite page loop.
      node.classList.add('pdf-oversize-node');
      page.flow.append(node);
      console.warn('PDF: oversized unsplittable block on page',pages.length,node.tagName);
      createPage();
    }
    if(pages.length>1 && !pages.at(-1).flow.childNodes.length){
      const last=pages.pop();last.sheet.remove();
    }
    return {pageCount:pages.length, warnings:pages.filter(p=>p.flow.querySelector('.pdf-oversize-node')).length};
  }
  return {build};
})();
