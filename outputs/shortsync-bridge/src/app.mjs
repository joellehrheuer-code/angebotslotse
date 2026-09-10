import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { ApiError, fail, hashableId } from './errors.mjs';
import { Journal } from './journal.mjs';
import { validate, validateVideo, platforms } from './validation.mjs';
import { Publisher, validateKey } from './publisher.mjs';

function authenticated(header, token) {
  const actual = Buffer.from(header ?? '');
  const expected = Buffer.from('Bearer ' + token);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createApp({ authToken, dryRun = true, liveEnabled = false, maxVideoBytes = 26214400, rateLimit = 20, dataDir = './data', journal: providedJournal, shortsync }) {
  if (typeof authToken !== 'string' || authToken.length < 32) throw new Error('AUTH_TOKEN must have at least 32 characters');
  if (!Number.isSafeInteger(maxVideoBytes) || maxVideoBytes < 1 || maxVideoBytes > 26214400) throw new Error('MAX_VIDEO_BYTES must be 1..26214400');
  if (!Number.isSafeInteger(rateLimit) || rateLimit < 1 || rateLimit > 1000) throw new Error('RATE_LIMIT_PER_MINUTE must be 1..1000');
  const journal = providedJournal ?? new Journal(dataDir);
  const publisher = new Publisher({ shortsync, journal, dryRun, liveEnabled });
  let busy = false, window = 0, attempts = 0;
  const server = createServer(async (req, res) => {
    const send = (status, body) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...(status === 429 ? { 'Retry-After': '60' } : {}) });
      // Final defense against upstream fields echoing either configured secret.
      let json = JSON.stringify(body);
      for (const secret of [authToken, shortsync.apiKey, journal.token]) if (secret) json = json.split(JSON.stringify(secret).slice(1, -1)).join('[REDACTED]');
      res.end(json);
    };
    let ownsSlot = false;
    try {
      const path = req.url;
      if (req.method === 'GET' && ['/health', '/healthz'].includes(path)) return send(200, { status: 'ok' });
      // Global bucket intentionally also limits unauthenticated attempts and is
      // independent of spoofable proxy/IP headers. One private-user instance.
      const now = Math.floor(Date.now() / 60000);
      if (now !== window) { window = now; attempts = 0; }
      if (++attempts > rateLimit) fail(429, 'RATE_LIMITED');
      if (req.headers.origin) fail(403, 'CORS_ORIGIN_DENIED');
      if (!authenticated(req.headers.authorization, authToken)) fail(401, 'UNAUTHORIZED');
      if (req.method === 'GET' && path === '/bridge/status') return send(200, { dry_run: dryRun, live_enabled: !dryRun && liveEnabled, max_video_bytes: maxVideoBytes });
      if (req.method === 'GET' && path?.startsWith('/requests/')) return send(200, await publisher.result(path.slice('/requests/'.length)));
      if (req.method === 'GET' && path === '/shortsync/status') return send(200, await shortsync.status());
      if (req.method === 'GET' && path === '/shortsync/connections') {
        const rows = await shortsync.connections();
        return send(200, { data: rows.map(c => ({ platform: platforms.includes(c.platform) ? c.platform : 'other', display_name: typeof c.display_name === 'string' ? c.display_name.slice(0, 200) : null, status: ['active', 'token_expired', 'refresh_failed', 'needs_reconnect', 'rate_limited'].includes(c.status) ? c.status : 'unknown' })) });
      }
      if (req.method === 'GET' && path?.startsWith('/shortsync/posts/')) {
        const id = path.slice('/shortsync/posts/'.length);
        if (!hashableId(id)) fail(400, 'POST_ID_INVALID');
        return send(200, await shortsync.getPost(id));
      }
      if (req.method !== 'POST' || !['/publish', '/uploads'].includes(path)) fail(404, 'NOT_FOUND');
      publisher.checkEnabled();
      const key = path === '/publish' ? validateKey(req.headers['idempotency-key']) : null;
      const contentType = req.headers['content-type'];
      if (path === '/publish' && contentType?.split(';')[0].trim().toLowerCase() === 'application/json') {
        if (req.headers['content-encoding']) fail(415, 'ENCODING_UNSUPPORTED');
        if (busy) fail(429, 'UPLOAD_BUSY');
        busy = ownsSlot = true;
        let size = 0; const parts = [];
        for await (const part of req.iterator({ destroyOnReturn: false })) {
          size += part.length;
          if (size > 65536) fail(413, 'REQUEST_TOO_LARGE');
          parts.push(part);
        }
        let body;
        try { body = JSON.parse(Buffer.concat(parts).toString()); } catch { fail(400, 'JSON_INVALID'); }
        const response = await publisher.publish(await publisher.fromToken(body), key);
        return send(response.status, response.body);
      }
      if (!contentType?.toLowerCase().startsWith('multipart/form-data;')) fail(415, 'MULTIPART_REQUIRED');
      if (req.headers['content-encoding']) fail(415, 'ENCODING_UNSUPPORTED');
      if (busy) fail(429, 'UPLOAD_BUSY');
      busy = ownsSlot = true;
      const totalLimit = maxVideoBytes + 65536;
      if (Number(req.headers['content-length']) > totalLimit) fail(413, 'REQUEST_TOO_LARGE');
      const chunks = [];
      let length = 0;
      for await (const chunk of req.iterator({ destroyOnReturn: false })) {
        length += chunk.length;
        if (length > totalLimit) fail(413, 'REQUEST_TOO_LARGE');
        chunks.push(chunk);
      }
      let form;
      const multipart = Buffer.concat(chunks);
      const boundary = /boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(contentType);
      if (!boundary || (boundary[1] ?? boundary[2]).length > 70) fail(400, 'MULTIPART_INVALID');
      const delimiter = Buffer.from('--' + (boundary[1] ?? boundary[2]));
      let parts = 0, offset = 0;
      while ((offset = multipart.indexOf(delimiter, offset)) !== -1) {
        if (++parts > 32) fail(400, 'TOO_MANY_PARTS');
        offset += delimiter.length;
      }
      try { form = await new Request('http://localhost/publish', { method: 'POST', headers: { 'Content-Type': contentType }, body: multipart }).formData(); }
      catch { fail(400, 'MULTIPART_INVALID'); }
      chunks.length = 0;
      if (path === '/uploads') {
        if ([...form.keys()].length !== 1 || !form.has('video')) fail(400, 'VIDEO_ONLY_REQUIRED');
        return send(201, await publisher.stage(await validateVideo(form.get('video'), maxVideoBytes)));
      }
      const item = await validate(form, maxVideoBytes);
      const response = await publisher.publish(item, key);
      return send(response.status, response.body);
    } catch (e) {
      send(e instanceof ApiError ? e.status : 500, { error: { code: e instanceof ApiError ? e.code : 'INTERNAL_ERROR' } });
    } finally {
      if (ownsSlot) busy = false;
      // No videos are written to disk. Resume discarded bodies so clients don't
      // hold a socket indefinitely; server request and idle timeouts still apply.
      if (!req.complete) { res.shouldKeepAlive = false; req.resume(); }
    }
  });
  server.requestTimeout = 120000;
  server.headersTimeout = 15000;
  server.setTimeout(150000, socket => socket.destroy());
  server.maxConnections = 32;
  return server;
}
