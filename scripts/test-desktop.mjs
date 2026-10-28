import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const userData = await mkdtemp(join(tmpdir(), 'inkflow-smoke-'));
const env = { ...process.env, INKFLOW_SMOKE_TEST: '1', INKFLOW_SMOKE_USER_DATA: userData,
  INKFLOW_SMOKE_OUTPUT: resolve('desktop-smoke-output') };
delete env.ELECTRON_RUN_AS_NODE;
try {
  const child = spawn(require('electron'), ['.'], { env, stdio: 'inherit' });
  const timeout = setTimeout(() => child.kill('SIGKILL'), 120_000);
  process.exitCode = await new Promise((done, reject) => {
    child.once('error', reject);
    child.once('exit', code => done(code ?? 1));
  }).finally(() => clearTimeout(timeout));
} finally {
  await rm(userData, { recursive: true, force: true });
}
