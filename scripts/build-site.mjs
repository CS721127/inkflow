// Dependency-free static distribution builder. Does not install dependencies.
import { rm, mkdir, cp, copyFile, access } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'dist');
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const name of ['index.html', 'css', 'js', 'assets', 'vendor']) {
  await cp(join(root, name), join(out, name), { recursive: true });
}
await copyFile(join(root, 'LICENSE'), join(out, 'LICENSE'));
await copyFile(join(root, 'THIRD_PARTY.md'), join(out, 'THIRD_PARTY.md'));
await (await import('node:fs/promises')).writeFile(join(out,'.nojekyll'), '');
const harper = join(out, 'vendor', 'harper', 'index.js');
try {
  await access(harper);
  console.log('InkFlow: Harper runtime included in dist/.');
} catch {
  console.warn('InkFlow: optional Harper runtime missing; run npm install before building for Grammar Check.');
}
console.log('InkFlow: static distribution ready at dist/');
