import { fail, ApiError } from './errors.mjs';
import { digest } from './journal.mjs';

// Only small metadata goes to Redis. Videos and presigned URLs never do.
// No TTL on publishing tombstones; eviction MUST remain disabled.
export class UpstashJournal {
  constructor({ url, token, fetchImpl = fetch }) {
    const endpoint = new URL(url);
    if (endpoint.protocol !== 'https:' || !endpoint.hostname.endsWith('.upstash.io') || endpoint.username || endpoint.password || endpoint.search || endpoint.hash || (endpoint.port && endpoint.port !== '443') || endpoint.pathname !== '/' || !token) throw new Error('Invalid Upstash configuration');
    this.url = endpoint.href;
    this.token = token;
    this.fetch = fetchImpl;
  }
  async command(args) {
    try {
      const response = await this.fetch(this.url, { method: 'POST', headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(args), redirect: 'error', signal: AbortSignal.timeout(10000) });
      if (!response.ok) { await response.body?.cancel(); fail(503, 'JOURNAL_UNAVAILABLE'); }
      const chunks = []; let size = 0;
      for await (const chunk of response.body) {
        size += chunk.length;
        if (size > 65536) fail(503, 'JOURNAL_INVALID_RESPONSE');
        chunks.push(chunk);
      }
      const body = JSON.parse(Buffer.concat(chunks).toString());
      if (body.error || !Object.hasOwn(body, 'result')) fail(503, 'JOURNAL_UNAVAILABLE');
      return body.result;
    } catch (e) { if (e instanceof ApiError) throw e; fail(503, 'JOURNAL_UNAVAILABLE'); }
  }
  async lookup(key) {
    const raw = await this.command(['GET', 'shortsync:request:' + digest(key)]);
    if (raw === null) return null;
    try { return JSON.parse(raw); } catch { fail(503, 'JOURNAL_INVALID_RESPONSE'); }
  }
  async begin(key, fingerprint) {
    const redisKey = 'shortsync:request:' + digest(key);
    const initial = JSON.stringify({ fingerprint, created_at: new Date().toISOString() });
    const claimed = await this.command(['SET', redisKey, initial, 'NX']);
    if (claimed !== 'OK') {
      if (claimed !== null) fail(503, 'JOURNAL_INVALID_RESPONSE');
      const existing = await this.lookup(key);
      if (!existing) fail(409, 'IDEMPOTENCY_RECONCILIATION_REQUIRED');
      if (existing.fingerprint !== fingerprint) fail(409, 'IDEMPOTENCY_CONFLICT');
      if (!existing.response) fail(409, 'IDEMPOTENCY_RECONCILIATION_REQUIRED');
      return { response: existing.response };
    }
    return { finish: async response => {
      // Atomic compare-and-set: do not recreate a missing claim or overwrite a
      // different owner after data loss or operator intervention.
      const script = "if redis.call('GET', KEYS[1]) == ARGV[1] then redis.call('SET', KEYS[1], ARGV[2]); return 1 else return 0 end";
      const result = await this.command(['EVAL', script, '1', redisKey, initial, JSON.stringify({ fingerprint, response })]);
      if (result !== 1) fail(503, 'JOURNAL_COMMIT_FAILED');
    } };
  }
  async putAsset(token, value) {
    const result = await this.command(['SET', 'shortsync:asset:' + digest(token), JSON.stringify(value), 'EX', '86400', 'NX']);
    if (result !== 'OK') fail(503, 'ASSET_STORE_FAILED');
  }
  async getAsset(token) {
    const raw = await this.command(['GET', 'shortsync:asset:' + digest(token)]);
    if (raw === null) return null;
    try { return JSON.parse(raw); } catch { fail(503, 'JOURNAL_INVALID_RESPONSE'); }
  }
}
