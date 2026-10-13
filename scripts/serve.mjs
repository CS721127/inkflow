/* Dependency-free local static server. Only binds to localhost. */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8',
  '.json':'application/json','.wasm':'application/wasm','.webp':'image/webp',
  '.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2'};
const port=Number(process.env.PORT || 4173);
createServer(async (req,res)=>{
  try {
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const path=resolve(root,'.'+pathname);
    if (!(path===root||path.startsWith(root+sep)) || pathname.startsWith('/node_modules/')) {res.writeHead(403);res.end('Forbidden');return;}
    let full=path;
    if((await stat(path)).isDirectory()) full=join(path,'index.html');
    const contents=await readFile(full);
    res.writeHead(200,{'Content-Type':mime[extname(full)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});
    res.end(contents);
  } catch {res.writeHead(404);res.end('Not Found');}
}).listen(port,'127.0.0.1',()=>console.log(`Writer running at http://localhost:${port}`));
