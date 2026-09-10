import { ApiError, fail, hashableId } from './errors.mjs';

const BASE = 'https://api.shortsync.app/v1';
const statusNames = new Set(['processing', 'ready', 'scheduled', 'published', 'failed', 'deleted', 'skipped_inactive_subscription', 'draft']);
const errorNames = new Set(['CONNECTION_TOKEN_EXPIRED', 'CONNECTION_INACTIVE', 'INVALID_PLATFORM', 'UNSUPPORTED_PLATFORM', 'INVALID_REQUEST', 'RATE_LIMIT_EXCEEDED', 'QUOTA_EXCEEDED', 'INSUFFICIENT_SCOPE', 'UPLOAD_NOT_READY']);
export function safePost(p, platform) {
  const status = statusNames.has(p?.status) ? p.status : 'unknown';
  return {
    platform,
    post_id: hashableId(p?.id) ? p.id : null,
    status,
    error: p?.error || ['failed', 'deleted', 'skipped_inactive_subscription', 'unknown'].includes(status)
      ? { code: errorNames.has(p?.error?.code) ? p.error.code : 'TARGET_NOT_SUCCESSFUL' } : null,
  };
}

async function boundedJson(response) {
  if (!response.ok) { await response.body?.cancel(); fail(502, `SHORTSYNC_HTTP_${response.status}`); }
  let length = 0;
  const chunks = [];
  for await (const chunk of response.body) {
    length += chunk.length;
    if (length > 1048576) fail(502, 'SHORTSYNC_RESPONSE_TOO_LARGE');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString()); }
  catch { fail(502, 'SHORTSYNC_INVALID_RESPONSE'); }
}

export class ShortSync {
  constructor({ apiKey, uploadHosts = [], dryRun = true, fetchImpl = fetch }) {
    this.apiKey = apiKey;
    this.uploadHosts = uploadHosts;
    this.fetch = fetchImpl;
    this.dryRun = dryRun;
  }
  async api(path, body, key) {
    if (body !== undefined && this.dryRun) fail(403, 'DRY_RUN_WRITE_BLOCKED');
    if (!this.apiKey) fail(503, 'SHORTSYNC_NOT_CONFIGURED');
    try {
      return await boundedJson(await this.fetch(BASE + path, {
        method: body === undefined ? 'GET' : 'POST',
        redirect: 'error', signal: AbortSignal.timeout(30000),
        headers: { Authorization: `Bearer ${this.apiKey}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(key ? { 'Idempotency-Key': key } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }));
    } catch (e) { if (e instanceof ApiError) throw e; fail(502, 'SHORTSYNC_NETWORK_ERROR'); }
  }
  async status() {
    const raw = await this.api('/me');
    const d = raw.data ?? raw;
    const q = d.quota?.requests;
    const number = n => Number.isFinite(n) && n >= 0 ? n : null;
    return {
      plan: ['creator', 'team'].includes(d.plan) ? d.plan : 'unknown',
      quota: { requests: { used: number(q?.used), limit: number(q?.limit), remaining: number(q?.remaining) },
        resets_at: typeof d.quota?.resets_at === 'string' && /^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(d.quota.resets_at) ? d.quota.resets_at : null },
      scopes: Array.isArray(d.scopes) ? d.scopes.filter(s => ['posts:read', 'posts:write', 'uploads:write', 'connections:read'].includes(s)) : [],
    };
  }
  async connections() {
    const result = [], seen = new Set();
    let cursor;
    for (let page = 0; page < 20; page++) {
      const r = await this.api('/connections?limit=100' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''));
      if (!Array.isArray(r.data)) fail(502, 'SHORTSYNC_INVALID_RESPONSE');
      result.push(...r.data);
      cursor = r.pagination?.next_cursor;
      if (cursor == null) return result;
      if (typeof cursor !== 'string' || cursor.length > 2048 || seen.has(cursor)) fail(502, 'SHORTSYNC_PAGINATION_ERROR');
      seen.add(cursor);
    }
    fail(502, 'SHORTSYNC_PAGINATION_LIMIT');
  }
  async upload(video, filename, mime) {
    if (this.dryRun) fail(403, 'DRY_RUN_WRITE_BLOCKED');
    if (!this.uploadHosts.length) fail(503, 'UPLOAD_HOSTS_NOT_CONFIGURED');
    const raw = await this.api('/uploads', { filename });
    const r = raw.data ?? raw;
    if (!hashableId(r.upload_id) || r.method !== 'PUT' || !r.required_headers || typeof r.required_headers !== 'object' || Array.isArray(r.required_headers)) fail(502, 'INVALID_UPLOAD_RESERVATION');
    let url;
    try { url = new URL(r.presigned_url); } catch { fail(502, 'UNSAFE_UPLOAD_URL'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.hash || (url.port && url.port !== '443') || !this.uploadHosts.includes(url.hostname)) fail(502, 'UNSAFE_UPLOAD_URL');
    const headers = { ...r.required_headers };
    for (const [name, value] of Object.entries(headers)) {
      if (typeof value !== 'string' || /[\r\n]/.test(value) || !/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name)) fail(502, 'INVALID_UPLOAD_HEADERS');
      if (['authorization', 'cookie', 'host', 'connection', 'transfer-encoding', 'content-length'].includes(name.toLowerCase())) fail(502, 'UNSAFE_UPLOAD_HEADERS');
    }
    const contentType = Object.keys(headers).find(h => h.toLowerCase() === 'content-type');
    // Never overwrite signed headers: fail on a contradictory MIME requirement.
    if (contentType && headers[contentType] !== mime) fail(502, 'UPLOAD_CONTENT_TYPE_CONFLICT');
    if (!contentType) headers['Content-Type'] = mime;
    try {
      const response = await this.fetch(url.href, { method: 'PUT', headers, body: video, redirect: 'error', signal: AbortSignal.timeout(120000) });
      await response.body?.cancel();
      if (!response.ok) fail(502, 'VIDEO_UPLOAD_FAILED');
    } catch (e) { if (e instanceof ApiError) throw e; fail(502, 'VIDEO_UPLOAD_NETWORK_ERROR'); }
    return r.upload_id;
  }
  async post(body, key, platform) {
    const result = await this.api('/posts', body, key);
    if (!Array.isArray(result.data) || result.data.length !== 1 || result.data[0]?.platform !== platform || !hashableId(result.data[0]?.id)) fail(502, 'SHORTSYNC_INVALID_POST_RESPONSE');
    return safePost(result.data[0], platform);
  }
  async getPost(id) {
    const r = await this.api('/posts/' + encodeURIComponent(id));
    const d = r.data ?? r;
    if (!['instagram', 'tiktok', 'youtube', 'snapchat'].includes(d.platform) || d.id !== id) fail(502, 'SHORTSYNC_INVALID_POST_RESPONSE');
    return safePost(d, d.platform);
  }
}
