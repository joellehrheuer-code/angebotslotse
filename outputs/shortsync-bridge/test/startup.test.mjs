import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

test('npm start command boots with Render environment and public healthz', { timeout: 15000 }, async t => {
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.scripts.start, 'node src/server.mjs');
  const token = 'startup-test-placeholder-not-a-real-secret';
  // Execute exactly the command npm start resolves to, in a clean environment.
  const child = spawn(process.execPath, ['src/server.mjs'], {
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    env: { AUTH_TOKEN: token, DRY_RUN: 'true', RENDER: 'true', PORT: '0' },
    windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  const stopped = once(child, 'close');
  t.after(async () => { if (child.exitCode === null) child.kill(); await stopped; });
  const port = await new Promise((resolve, reject) => {
    let output = '';
    child.on('error', reject);
    child.on('exit', () => reject(new Error('server exited before readiness')));
    child.stdout.on('data', data => {
      output += data;
      const match = /port=(\d+); dry_run=true/.exec(output);
      if (match) resolve(match[1]);
    });
  });
  const url = 'http://127.0.0.1:' + port;
  const health = await fetch(url + '/healthz');
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: 'ok' });
  const state = await fetch(url + '/bridge/status', { headers: { Authorization: 'Bearer ' + token } });
  assert.equal((await state.json()).dry_run, true);
  assert.equal((await fetch(url + '/publish', { method: 'POST' })).status, 401);
});
