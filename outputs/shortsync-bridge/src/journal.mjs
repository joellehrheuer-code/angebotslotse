import { mkdir, open, readFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { fail } from './errors.mjs';

export const digest = value => createHash('sha256').update(value).digest('hex');

// A durable tombstone is created BEFORE any upstream write. If a process dies,
// a retry must be reconciled manually, never guessed to be safe to publish again.
export class Journal {
  constructor(dir) { this.dir = dir; }
  async putAsset(token, value) {
    await mkdir(this.dir, { recursive: true, mode: 0o700 });
    const h = await open(join(this.dir, 'asset-' + digest(token) + '.json'), 'wx', 0o600);
    try { await h.writeFile(JSON.stringify(value)); await h.sync(); } finally { await h.close(); }
  }
  async getAsset(token) {
    try { return JSON.parse(await readFile(join(this.dir, 'asset-' + digest(token) + '.json'), 'utf8')); }
    catch (e) { if (e.code === 'ENOENT') return null; fail(503, 'JOURNAL_UNAVAILABLE'); }
  }
  async lookup(key) {
    try { return JSON.parse(await readFile(join(this.dir, digest(key) + '.json'), 'utf8')); }
    catch (e) { if (e.code === 'ENOENT') return null; fail(503, 'JOURNAL_UNAVAILABLE'); }
  }
  async begin(key, fingerprint) {
    await mkdir(this.dir, { recursive: true, mode: 0o700 });
    const path = join(this.dir, digest(key) + '.json');
    let handle;
    try { handle = await open(path, 'wx', 0o600); }
    catch (e) {
      if (e.code !== 'EEXIST') throw e;
      let existing;
      try { existing = JSON.parse(await readFile(path, 'utf8')); }
      catch { fail(409, 'IDEMPOTENCY_RECONCILIATION_REQUIRED'); }
      if (existing.fingerprint !== fingerprint) fail(409, 'IDEMPOTENCY_CONFLICT');
      if (!existing.response) fail(409, 'IDEMPOTENCY_RECONCILIATION_REQUIRED');
      return { response: existing.response };
    }
    try { await handle.writeFile(JSON.stringify({ fingerprint, created_at: new Date().toISOString() })); await handle.sync(); }
    finally { await handle.close(); }
    return {
      finish: async response => {
        const tmp = path + '.' + randomUUID() + '.tmp';
        const out = await open(tmp, 'wx', 0o600);
        try { await out.writeFile(JSON.stringify({ fingerprint, response })); await out.sync(); }
        finally { await out.close(); }
        await rename(tmp, path);
      },
    };
  }
}
