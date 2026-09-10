import { randomBytes } from 'node:crypto';
import { ApiError, fail, hashableId } from './errors.mjs';
import { digest } from './journal.mjs';
import { validateContent } from './validation.mjs';

export function validateKey(key) {
  if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{16,128}$/.test(key)) fail(400, 'IDEMPOTENCY_KEY_REQUIRED');
  return key;
}
export class Publisher {
  constructor({ shortsync, journal, dryRun = true, liveEnabled = false }) {
    Object.assign(this, { shortsync, journal, dryRun, liveEnabled });
  }
  checkEnabled() { if (!this.dryRun && !this.liveEnabled) fail(403, 'LIVE_PUBLISH_DISABLED'); }
  async stage(asset) {
    this.checkEnabled();
    const token = randomBytes(32).toString('hex');
    const uploadId = this.dryRun ? null : await this.shortsync.upload(asset.video, asset.filename, asset.mime);
    const value = { uploadId, dryRun: this.dryRun, contentHash: digest(asset.video), filename: asset.filename, mime: asset.mime, expiresAt: Date.now() + 86400000 };
    await this.journal.putAsset(token, value);
    return { upload_token: token, dry_run: this.dryRun, expires_at: new Date(value.expiresAt).toISOString() };
  }
  async fromToken(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.upload_token !== 'string' || !/^[a-f0-9]{64}$/.test(body.upload_token)) fail(400, 'UPLOAD_TOKEN_INVALID');
    const { upload_token, ...fields } = body;
    const content = validateContent(fields);
    const asset = await this.journal.getAsset(upload_token);
    if (!asset || asset.expiresAt <= Date.now()) fail(410, 'UPLOAD_TOKEN_EXPIRED');
    if (asset.dryRun !== this.dryRun) fail(409, 'UPLOAD_MODE_MISMATCH');
    return { ...asset, ...content };
  }
  async result(key) {
    const existing = await this.journal.lookup(validateKey(key));
    if (!existing) fail(404, 'REQUEST_NOT_FOUND');
    if (!existing.response) return { status: 'unknown_or_processing', error: { code: 'IDEMPOTENCY_RECONCILIATION_REQUIRED' } };
    return existing.response.body;
  }
  async publish(item, key) {
    this.checkEnabled(); validateKey(key);
    const { video, uploadId, contentHash, dryRun, expiresAt, ...metadata } = item;
    if (this.dryRun) {
      if (item.mode === 'scheduled' && Date.parse(item.scheduled_for) <= Date.now()) fail(400, 'SCHEDULE_MUST_BE_FUTURE');
      return { status: 200, body: { dry_run: true, all_published: false, has_errors: false,
        connection_validation: 'not_performed', results: item.targets.map(r => ({ platform: r.platform, post_id: null, status: 'dry_run', error: null })),
        preview: { publish_mode: item.mode, scheduled_for: item.scheduled_for, targets: item.targets } } };
    }
    const fingerprint = digest(JSON.stringify(metadata) + (contentHash ?? digest(video)));
    const transaction = await this.journal.begin(key, fingerprint);
    if (transaction.response) return transaction.response;
    let response;
    try {
      if (item.mode === 'scheduled' && Date.parse(item.scheduled_for) <= Date.now()) fail(400, 'SCHEDULE_MUST_BE_FUTURE');
      const connections = await this.shortsync.connections();
      const resolved = item.targets.map(({ platform, target }) => {
        const matches = connections.filter(c => c.platform === platform && c.status === 'active');
        return matches.length === 1 && hashableId(matches[0].id)
          ? { platform, target: { ...target, connection_id: matches[0].id } }
          : { platform, error: { code: matches.length > 1 ? 'AMBIGUOUS_CONNECTION' : 'NO_ACTIVE_CONNECTION' } };
      });
      const id = resolved.some(r => !r.error) ? (uploadId ?? await this.shortsync.upload(video, item.filename, item.mime)) : null;
      const results = [];
      for (const row of resolved) {
        if (row.error) { results.push({ platform: row.platform, post_id: null, status: 'failed', error: row.error }); continue; }
        const body = { upload_id: id, publish_mode: item.mode, targets: [row.target], ...(item.scheduled_for ? { scheduled_for: item.scheduled_for } : {}) };
        try { results.push(await this.shortsync.post(body, digest(key + ':' + row.platform), row.platform)); }
        catch (e) {
          const rejected = e instanceof ApiError && /^SHORTSYNC_HTTP_4\d\d$/.test(e.code);
          results.push({ platform: row.platform, post_id: null, status: rejected ? 'rejected' : 'unknown', error: { code: e instanceof ApiError ? e.code : 'UPSTREAM_RESULT_UNKNOWN' } });
        }
      }
      const allPublished = results.every(r => r.status === 'published' && !r.error);
      const hasErrors = results.some(r => r.error);
      response = { status: hasErrors ? 207 : allPublished ? 200 : 202, body: { dry_run: false, all_published: allPublished, has_errors: hasErrors, results } };
    } catch (e) {
      response = { status: e instanceof ApiError ? e.status : 500, body: { error: { code: e instanceof ApiError ? e.code : 'INTERNAL_ERROR' } } };
    }
    await transaction.finish(response);
    return response;
  }
}
