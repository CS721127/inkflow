import { cp, readdir, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const src=resolve(root,'node_modules/harper.js/dist');
const dest=resolve(root,'vendor/harper');
try { await access(src); } catch {
  console.error('Harper package missing. Run npm install with a network connection.');
  process.exitCode=1;
  throw new Error('No node_modules/harper.js/dist');
}
for (const required of ['index.js','binaryInlined.js']) {
  try { await access(resolve(src,required)); } catch {
    throw new Error(`Unsupported Harper package layout: missing dist/${required}. Check your installed version.`);
  }
}
await cp(src,dest,{recursive:true,force:true});
for (const licence of ['LICENSE', 'LICENSE.md', 'LICENSE.txt']) {
  try { await access(resolve(root,'node_modules/harper.js',licence)); await cp(resolve(root,'node_modules/harper.js',licence),resolve(dest,licence)); break; } catch(_) {}
}
const files=await readdir(dest);
console.log('✓ Local Harper runtime installed in vendor/harper/ ('+files.length+' entries)');
