/* Local MathJax integration. No CDN. Math is extracted before the Markdown sanitizer,
 * then rendered into inert text placeholders after sanitized markup is inserted. */
'use strict';
const WriterMath = (() => {
 const entries = [];
 const signature = 'IWP' + Math.random().toString(36).slice(2).toUpperCase() + 'MATH';
 const sourceRegex = new RegExp(signature + '(\\d+)END', 'g');
 let loader = null;
 let rendering = Promise.resolve();
 let currentVersion = 0;
 const delimiter = (display,tex) => (display ? '\\[' + tex + '\\]' : '\\(' + tex + '\\)');
 const slot = (tex,display) => {
   const i=entries.push({tex,display})-1;
   return signature+i+'END';
 };
 const trimTex = text => String(text||'').trim();
 function install(marked) {
   marked.use({extensions:[
     {name:'mathBlock',level:'block',start(src) {const match=/(^|\n)[ \t]{0,3}(?:\$\$|\\\[)/.exec(src);return match ? match.index+(match[1]?1:0) : undefined;},
      tokenizer(src) {
        let m=/^[ \t]{0,3}\$\$[ \t]*\n([\s\S]*?)\n[ \t]{0,3}\$\$[ \t]*(?:\n|$)/.exec(src);
        if(!m) m=/^[ \t]{0,3}\\\[[ \t]*\n([\s\S]*?)\n[ \t]{0,3}\\\][ \t]*(?:\n|$)/.exec(src);
        if(!m) m=/^[ \t]{0,3}\$\$([^\n]+?)\$\$[ \t]*(?:\n|$)/.exec(src);
        if(!m) m=/^[ \t]{0,3}\\\[([^\n]+?)\\\][ \t]*(?:\n|$)/.exec(src);
        if(m && trimTex(m[1]))return {type:'mathBlock',raw:m[0],tex:trimTex(m[1])};
      },renderer(token) {return '<div>'+slot(token.tex,true)+'</div>\n';}},
     {name:'mathInline',level:'inline',start(src) {const a=src.indexOf('$'),b=src.indexOf('\\('),c=src.indexOf('\\[');const xs=[a,b,c].filter(v=>v>=0);return xs.length?Math.min(...xs):undefined;},
      tokenizer(src) {
        let m=/^\$\$([^\n]+?)\$\$/.exec(src);
        if(m && trimTex(m[1])) return {type:'mathInline',raw:m[0],tex:m[1],display:true};
        m=/^\\\[([^\n]+?)\\\]/.exec(src);
        if(m && trimTex(m[1])) return {type:'mathInline',raw:m[0],tex:m[1],display:true};
        m=/^\\\(([^\n]+?)\\\)/.exec(src);
        if(m && trimTex(m[1])) return {type:'mathInline',raw:m[0],tex:m[1],display:false};
        m=/^\$((?:\\.|[^\\$\n])+?)\$(?!\$)/.exec(src);
        if(m && !/^\s|\s$/.test(m[1]) && /[^\d.,\s]/.test(m[1])) return {type:'mathInline',raw:m[0],tex:m[1],display:false};
      },renderer(token) {return slot(token.tex,token.display);}}
   ]});
 }
 function begin() {entries.length=0;}
 function mount(root) {
   // Replace only text nodes containing our random, generated markers.
   const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
   const matching=[];
   while(walker.nextNode()) {
    const node=walker.currentNode;
    if(node.parentElement?.closest('pre,code,script,style'))continue;
    if(node.nodeValue.includes(signature)) matching.push(node);
   }
   for(const node of matching){
    const frag=document.createDocumentFragment();let last=0,match;
    sourceRegex.lastIndex=0;
    while((match=sourceRegex.exec(node.nodeValue))){
     if(match.index>last)frag.append(document.createTextNode(node.nodeValue.slice(last,match.index)));
     const item=entries[+match[1]];
     if(item){const holder=document.createElement(item.display?'div':'span');holder.className='iwp-math '+(item.display?'iwp-display-math':'iwp-inline-math');holder.textContent=delimiter(item.display,item.tex);frag.append(holder);}
     else frag.append(document.createTextNode(match[0]));
     last=match.index+match[0].length;
    }
    if(last<node.nodeValue.length)frag.append(document.createTextNode(node.nodeValue.slice(last)));
    node.replaceWith(frag);
   }
   return Boolean(root.querySelector('.iwp-math'));
 }
 function load() {
  if(window.MathJax?.typesetPromise)return Promise.resolve(window.MathJax);
  if(loader)return loader;
  // MathJax's default fonts are provided inside vendor/mathjax.
  window.MathJax={
    loader:{paths:{mathjax:new URL('./vendor/mathjax',document.baseURI).href}},
    tex:{packages:['base','ams','newcommand','boldsymbol','noerrors','noundefined'],inlineMath:[['\\(','\\)']],displayMath:[['\\[','\\]']],processEscapes:true},
    svg:{fontCache:'local'},
    startup:{typeset:false}
  };
  loader=new Promise((resolve,reject)=>{
   const script=document.createElement('script');script.src='vendor/mathjax/tex-svg-full.js';script.async=true;
   script.onload=()=>{
    Promise.resolve(window.MathJax?.startup?.promise).then(()=>resolve(window.MathJax),reject);
   };
   script.onerror=()=>reject(new Error('Local MathJax runtime is missing.'));
   document.head.append(script);
  }).catch(err=>{loader=null;throw err;});
  return loader;
 }
 function typeset(element){
   if(!element.querySelector('.iwp-math'))return Promise.resolve();
   const v=++currentVersion;
   rendering=rendering.catch(()=>{}).then(async()=>{
     const engine=await load();
     if(!element.isConnected||v!==currentVersion)return;
     await engine.typesetPromise([element]);
   }).catch(error=>{
    console.error('Math render failed',error);
   });
   return rendering;
 }
 function ready(){return rendering.catch(()=>{});}
 return {install,begin,mount,typeset,ready};
})();
