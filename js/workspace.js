/* Session-level multi-file model. No disk write without user's Save/Download. */
'use strict';
const WriterWorkspace = (() => {
 let nextId=0;
 const create = (name='Untitled Document',content='') => ({id:'f'+(++nextId),name:String(name).slice(0,260),content:String(content),dirty:false});
 function validName(name){return typeof name==='string' && name.trim().length>0 ? name.trim().slice(0,260) : 'Untitled Document';}
 function hydrate(payload){
   if(!payload||payload.version!==2||!Array.isArray(payload.files))return null;
   if(payload.files.length<1 || payload.files.length>100)return null;
   const files=payload.files.map(file=>{
     if(!file||typeof file.content!=='string'||file.content.length>4_000_000)return null;
     return create(validName(file.name),file.content);
   });
   if(files.some(file=>!file))return null;
   return {files,activeIndex:Number.isInteger(payload.activeIndex)?Math.max(0,Math.min(files.length-1,payload.activeIndex)):0};
 }
 function serialize(files,activeId){
   return JSON.stringify({version:2,activeIndex:Math.max(0,files.findIndex(doc=>doc.id===activeId)),files:files.map(doc=>({name:doc.name,content:doc.content}))});
 }
 return {create,hydrate,serialize,validName};
})();
