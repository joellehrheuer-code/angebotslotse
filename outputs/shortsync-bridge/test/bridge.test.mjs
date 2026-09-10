import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../src/app.mjs';
import { ShortSync } from '../src/shortsync.mjs';
import { Journal } from '../src/journal.mjs';
import { UpstashJournal } from '../src/upstash.mjs';
import { configuration } from '../src/config.mjs';

// All outgoing ShortSync/storage calls use this injected transport. A real
// fetch is used ONLY to access an ephemeral loopback HTTP server under test.
const TOKEN = 'test-only-auth-token-not-a-real-secret-123456';
const KEY = 'test-only-shortsync-key';
const all = ['instagram', 'tiktok', 'youtube', 'snapchat'];
function box(type, content) { const h = Buffer.alloc(8); h.writeUInt32BE(content.length + 8); h.write(type, 4); return Buffer.concat([h, content]); }
const video = Buffer.concat([box('ftyp', Buffer.from('isom\0\0\0\0isommp42')), box('moov', box('trak', box('mdia', box('hdlr', Buffer.from('\0\0\0\0\0\0\0\0vide'))))), box('mdat', Buffer.from('fixture-media-payload'))]);
function form(options = {}) {
  const f = new FormData();
  f.set('video', new Blob([options.bytes ?? video], { type: options.mime ?? 'video/mp4' }), options.filename ?? 'video.mp4');
  f.set('platforms', JSON.stringify(options.platforms ?? all));
  f.set('youtube_title', 'Test title');
  for (const [key, value] of Object.entries(options.fields ?? {})) f.set(key, value);
  return f;
}
function mock(options = {}) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url: String(url), ...init });
    const path = new URL(url).pathname;
    const json = (data, status = 200) => new Response(JSON.stringify(data), { status });
    if (new URL(url).hostname === 'storage.example.test') return new Response('', { status: options.putStatus ?? 200 });
    assert.equal(new URL(url).origin, 'https://api.shortsync.app');
    assert.equal(init.headers.Authorization, 'Bearer ' + KEY);
    if (path === '/v1/me') return json({ plan: 'team', prefix: KEY, token: KEY, scopes: ['posts:read', 'secret'], quota: { requests: { used: 2, limit: 100, remaining: 98, token: KEY }, resets_at: '2026-10-01T00:00:00.000Z' } });
    if (path === '/v1/connections') {
      if (options.pagination && !String(url).includes('cursor=')) return json({ data: [], pagination: { next_cursor: 'next' } });
      return json({ data: options.connections ?? all.map(p => ({ id: 'con_' + p, platform: p, status: 'active', display_name: 'account', token: KEY })), pagination: { next_cursor: null } });
    }
    if (path === '/v1/uploads') return json({ upload_id: 'upload_123', method: 'PUT', presigned_url: options.url ?? 'https://storage.example.test/video?signed=1', required_headers: options.headers ?? { 'x-amz-meta-test': 'exact-value' } });
    if (path === '/v1/posts') {
      const body = JSON.parse(init.body), p = body.targets[0].connection_id.slice(4);
      if (p === options.networkError) throw new Error(KEY);
      if (p === options.reject) return json({ error: { message: KEY } }, 400);
      return json({ data: [{ id: 'post_' + p, platform: p, status: p === options.fail ? 'failed' : options.status ?? 'processing', error: p === options.fail ? { code: 'CONNECTION_TOKEN_EXPIRED', message: KEY } : null }] }, 201);
    }
    if (path === '/v1/posts/post_tiktok') return json({ id: 'post_tiktok', platform: 'tiktok', status: 'published' });
    throw new Error('Unexpected outbound request');
  };
  return { calls, shortsync: new ShortSync({ apiKey: KEY, dryRun: false, uploadHosts: ['storage.example.test'], fetchImpl }) };
}
async function fixture(t, options = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'shortsync-test-'));
  const m = mock(options);
  const config = { authToken: TOKEN, dryRun: false, liveEnabled: true, dataDir: dir, shortsync: m.shortsync, ...options.config };
  const server = createApp(config);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await rm(dir, { recursive: true, force: true }); });
  const url = 'http://127.0.0.1:' + server.address().port;
  const request = (path, init = {}) => fetch(url + path, { ...init, headers: { Authorization: 'Bearer ' + TOKEN, ...init.headers } });
  const publish = (body = form(), key = 'unique-request-key-1234') => request('/publish', { method: 'POST', headers: { 'Idempotency-Key': key }, body });
  return { ...m, dir, config, request, publish, url };
}

test('health is public and contains no secrets', async t => {
  const f = await fixture(t);
  assert.deepEqual(await (await fetch(f.url + '/health')).json(), { status: 'ok' });
  assert.equal(f.calls.length, 0);
});
test('authentication and CORS block before upstream calls', async t => {
  const f = await fixture(t);
  for (const path of ['/shortsync/status', '/shortsync/connections', '/publish']) assert.equal((await fetch(f.url + path)).status, 401);
  assert.equal((await f.request('/shortsync/status', { headers: { Origin: 'https://evil.example' } })).status, 403);
  assert.equal(f.calls.length, 0);
});
test('safe identity and connection projection with pagination', async t => {
  const f = await fixture(t, { pagination: true });
  const s = await (await f.request('/shortsync/status')).json();
  assert.equal(s.quota.requests.remaining, 98);
  assert.equal(s.plan, 'team');
  assert.ok(!JSON.stringify(s).includes(KEY));
  const c = await (await f.request('/shortsync/connections')).json();
  assert.equal(c.data.length, 4);
  assert.deepEqual(Object.keys(c.data[0]), ['platform', 'display_name', 'status']);
  assert.equal(f.calls.filter(c => c.url.includes('/connections')).length, 2);
});
test('live mode defaults to blocked and never reserves an upload', async t => {
  const f = await fixture(t, { config: { liveEnabled: false } });
  assert.equal((await f.publish()).status, 403);
  assert.equal(f.calls.length, 0);
});
test('multipart, MIME, magic bytes, size and field validation', async t => {
  const f = await fixture(t, { config: { maxVideoBytes: 1024 } });
  for (const [body, status] of [
    [form({ mime: 'text/plain' }), 415], [form({ bytes: Buffer.from('not a video') }), 415],
    [form({ bytes: Buffer.alloc(1025) }), 413], [form({ platforms: ['twitter'] }), 400],
    [form({ platforms: ['tiktok', 'tiktok'] }), 400], [form({ fields: { video_url: 'https://evil.test' } }), 400],
    [form({ fields: { youtube_title: '' } }), 400], [form({ fields: { youtube_notify_subscribers: 'yes' } }), 400],
    [form({ fields: { snapchat_caption: 'x'.repeat(161) } }), 400],
    [form({ fields: { publish_mode: 'scheduled', scheduled_for: 'invalid' } }), 400],
  ]) assert.equal((await f.publish(body)).status, status);
  assert.equal((await f.request('/publish', { method: 'POST', body: form() })).status, 400);
  assert.equal(f.calls.length, 0);
});
test('mixed target failure is not claimed as published', async t => {
  const f = await fixture(t, { fail: 'tiktok' });
  const r = await f.publish();
  assert.equal(r.status, 207);
  const b = await r.json();
  assert.equal(b.all_published, false);
  assert.equal(b.results.find(r => r.platform === 'tiktok').error.code, 'CONNECTION_TOKEN_EXPIRED');
  assert.ok(!JSON.stringify(b).includes(KEY));
  assert.equal(f.calls.filter(c => new URL(c.url).pathname === '/v1/posts').length, 4);
});
test('Snapchat request rejection leaves other targets processing', async t => {
  const f = await fixture(t, { reject: 'snapchat' });
  const b = await (await f.publish()).json();
  assert.equal(b.results.find(r => r.platform === 'snapchat').status, 'rejected');
  assert.equal(b.results.filter(r => r.status === 'processing').length, 3);
});
test('transport uncertainty is explicit and not retried', async t => {
  const f = await fixture(t, { networkError: 'snapchat' });
  const b = await (await f.publish()).json();
  assert.equal(b.results.find(r => r.platform === 'snapchat').status, 'unknown');
  assert.equal(f.calls.filter(c => new URL(c.url).pathname === '/v1/posts').length, 4);
});
test('upload header preservation, sanitized filename and platform payloads', async t => {
  const f = await fixture(t);
  const response = await f.publish(form({ filename: '../weird video.mp4', fields: { first_comment: 'Hi', youtube_notify_subscribers: 'true', tiktok_privacy_level: 'PUBLIC_TO_EVERYONE' } }));
  assert.equal(response.status, 202);
  const put = f.calls.find(c => c.method === 'PUT');
  assert.deepEqual(put.headers, { 'x-amz-meta-test': 'exact-value', 'Content-Type': 'video/mp4' });
  assert.equal(put.redirect, 'error');
  assert.equal(JSON.parse(f.calls.find(c => new URL(c.url).pathname === '/v1/uploads').body).filename, 'weird_video.mp4');
  const posts = f.calls.filter(c => new URL(c.url).pathname === '/v1/posts');
  assert.equal(new Set(posts.map(c => c.headers['Idempotency-Key'])).size, 4);
  const target = p => JSON.parse(posts.find(c => c.body.includes('con_' + p)).body).targets[0];
  assert.deepEqual(target('snapchat'), { caption: '', connection_id: 'con_snapchat' });
  assert.deepEqual(target('youtube').platform_options.youtube, { privacy_status: 'public', made_for_kids: false, notify_subscribers: true });
  assert.equal(target('instagram').platform_options.instagram.story_only, false);
  assert.equal(target('tiktok').platform_options.tiktok.privacy_level, 'PUBLIC_TO_EVERYONE');
  assert.ok((await readdir(f.dir)).every(name => name.endsWith('.json')));
});
test('idempotency replay survives a new app and rejects changed payload', async t => {
  const f = await fixture(t);
  const first = await (await f.publish()).json();
  const count = f.calls.length;
  assert.deepEqual(await (await f.publish()).json(), first);
  assert.equal(f.calls.length, count);
  assert.equal((await f.publish(form({ fields: { tiktok_caption: 'changed' } }))).status, 409);
  const second = createApp(f.config);
  await new Promise(resolve => second.listen(0, '127.0.0.1', resolve));
  t.after(() => { second.closeAllConnections(); second.close(); });
  const replay = await fetch('http://127.0.0.1:' + second.address().port + '/publish', { method: 'POST', headers: { Authorization: 'Bearer ' + TOKEN, 'Idempotency-Key': 'unique-request-key-1234' }, body: form() });
  assert.deepEqual(await replay.json(), first);
  assert.equal(f.calls.length, count);
});
test('journal blocks concurrent and crash retries without writes', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'shortsync-journal-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const j = new Journal(dir);
  await j.begin('key', 'fingerprint');
  await assert.rejects(() => new Journal(dir).begin('key', 'fingerprint'), { code: 'IDEMPOTENCY_RECONCILIATION_REQUIRED' });
  await assert.rejects(() => j.begin('key', 'different'), { code: 'IDEMPOTENCY_CONFLICT' });
});
test('missing and ambiguous connections produce per-target errors', async t => {
  const f = await fixture(t, { connections: [{ id: 'con_a', platform: 'tiktok', status: 'active' }, { id: 'con_b', platform: 'tiktok', status: 'active' }] });
  const b = await (await f.publish()).json();
  assert.equal(b.results.find(r => r.platform === 'tiktok').error.code, 'AMBIGUOUS_CONNECTION');
  assert.equal(b.results.find(r => r.platform === 'snapchat').error.code, 'NO_ACTIVE_CONNECTION');
  assert.ok(!f.calls.some(c => c.method === 'POST'));
});
test('unsafe signed URLs and conflicting signed MIME cannot publish', async t => {
  for (const options of [{ url: 'http://storage.example.test/x' }, { url: 'https://127.0.0.1/x' }, { url: 'https://evil.test/x' }, { headers: { 'Content-Type': 'text/plain' } }, { headers: { Authorization: 'secret' } }, { putStatus: 500 }]) {
    const m = mock(options);
    await assert.rejects(() => m.shortsync.upload(video, 'video.mp4', 'video/mp4'));
    assert.ok(!m.calls.some(c => new URL(c.url).pathname === '/v1/posts'));
  }
});
test('rate limit counts authentication failures', async t => {
  const f = await fixture(t, { config: { rateLimit: 1 } });
  assert.equal((await fetch(f.url + '/shortsync/status')).status, 401);
  const r = await f.request('/shortsync/status');
  assert.equal(r.status, 429);
  assert.equal(r.headers.get('retry-after'), '60');
});
test('scheduled and draft modes plus later post status', async t => {
  const f = await fixture(t, { status: 'scheduled' });
  const scheduled = new Date(Date.now() + 3600000).toISOString();
  assert.equal((await f.publish(form({ fields: { publish_mode: 'scheduled', scheduled_for: scheduled } }))).status, 202);
  const body = JSON.parse(f.calls.find(c => new URL(c.url).pathname === '/v1/posts').body);
  assert.equal(body.scheduled_for, scheduled);
  assert.equal(body.publish_mode, 'scheduled');
  assert.equal((await f.publish(form({ fields: { publish_mode: 'draft' } }), 'another-draft-key-1234')).status, 202);
  assert.equal((await (await f.request('/shortsync/posts/post_tiktok')).json()).status, 'published');
});

test('only confirmed published results yield all_published', async t => {
  const f = await fixture(t, { status: 'published' });
  const r = await f.publish();
  assert.equal(r.status, 200);
  assert.equal((await r.json()).all_published, true);
});
test('unknown upstream status cannot become success', async t => {
  const f = await fixture(t, { status: 'new-undocumented-status' });
  const r = await f.publish();
  assert.equal(r.status, 207);
  assert.equal((await r.json()).all_published, false);
});
test('MOV is accepted with QuickTime brand and MIME', async t => {
  const f = await fixture(t);
  const mov = Buffer.from(video);
  mov.write('qt  ', 8);
  assert.equal((await f.publish(form({ bytes: mov, mime: 'video/quicktime', filename: 'clip.mov' }))).status, 202);
});
test('oversized raw bodies and excessive multipart parts are rejected', async t => {
  const f = await fixture(t, { config: { maxVideoBytes: 1024 } });
  const headers = { 'Idempotency-Key': 'large-body-test-key', 'Content-Type': 'multipart/form-data; boundary=abc' };
  assert.equal((await f.request('/publish', { method: 'POST', headers, body: Buffer.alloc(70000) })).status, 413);
  const body = ('--abc\r\nContent-Disposition: form-data; name="x"\r\n\r\na\r\n').repeat(33) + '--abc--\r\n';
  assert.equal((await f.request('/publish', { method: 'POST', headers, body })).status, 400);
  assert.equal(f.calls.length, 0);
});
test('past schedule cannot write to ShortSync', async t => {
  const f = await fixture(t);
  assert.equal((await f.publish(form({ fields: { publish_mode: 'scheduled', scheduled_for: '2000-01-01T00:00:00Z' } }))).status, 400);
  assert.equal(f.calls.length, 0);
});
test('missing API key and malformed upstream JSON fail safely', async () => {
  await assert.rejects(() => new ShortSync({}).status(), { code: 'SHORTSYNC_NOT_CONFIGURED' });
  await assert.rejects(() => new ShortSync({ apiKey: KEY, fetchImpl: async () => new Response('not json') }).status(), { code: 'SHORTSYNC_INVALID_RESPONSE' });
});

test('healthz is public even when auth rate limit is exhausted', async t => {
  const f = await fixture(t, { config: { rateLimit: 1 } });
  await fetch(f.url + '/publish');
  await fetch(f.url + '/publish');
  const response = await fetch(f.url + '/healthz');
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });
  assert.equal(f.calls.length, 0);
});
test('dry run overrides live switch in immediate, scheduled and draft modes', async t => {
  const f = await fixture(t, { config: { dryRun: true, liveEnabled: true } });
  for (const mode of ['immediate', 'scheduled', 'draft']) {
    const fields = { publish_mode: mode, ...(mode === 'scheduled' ? { scheduled_for: new Date(Date.now() + 3600000).toISOString() } : {}) };
    const response = await f.publish(form({ fields }));
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.dry_run, true);
    assert.equal(body.all_published, false);
    assert.ok(body.results.every(r => r.status === 'dry_run' && r.post_id === null));
  }
  assert.equal(f.calls.length, 0);
  assert.deepEqual(await readdir(f.dir), []);
});
test('ShortSync itself blocks writes when dry run is enabled or unspecified', async () => {
  const client = new ShortSync({ apiKey: KEY, fetchImpl: async () => assert.fail('network must not be called') });
  await assert.rejects(() => client.api('/posts', {}), { code: 'DRY_RUN_WRITE_BLOCKED' });
  await assert.rejects(() => client.api('/uploads', {}), { code: 'DRY_RUN_WRITE_BLOCKED' });
  await assert.rejects(() => client.upload(video, 'video.mp4', 'video/mp4'), { code: 'DRY_RUN_WRITE_BLOCKED' });
});
test('staged dry-run video can use JSON publish without outbound traffic', async t => {
  const f = await fixture(t, { config: { dryRun: true } });
  const upload = form();
  upload.delete('platforms'); upload.delete('youtube_title');
  const response = await f.request('/uploads', { method: 'POST', body: upload });
  assert.equal(response.status, 201);
  const staged = await response.json();
  assert.equal(staged.dry_run, true);
  const result = await f.request('/publish', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'staged-test-key-12345' }, body: JSON.stringify({ upload_token: staged.upload_token, platforms: ['snapchat'], snapchat_caption: 'Hi' }) });
  assert.equal(result.status, 200);
  assert.equal((await result.json()).dry_run, true);
  assert.equal(f.calls.length, 0);
});
test('staged mock live upload is reused and results can be queried', async t => {
  const f = await fixture(t);
  const upload = form(); upload.delete('platforms'); upload.delete('youtube_title');
  const staged = await (await f.request('/uploads', { method: 'POST', body: upload })).json();
  const request = () => f.request('/publish', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'staged-live-key-12345' }, body: JSON.stringify({ upload_token: staged.upload_token, platforms: ['snapchat'] }) });
  assert.equal((await request()).status, 202);
  const count = f.calls.length;
  assert.equal((await request()).status, 202);
  assert.equal(f.calls.length, count);
  assert.equal(f.calls.filter(c => c.method === 'PUT').length, 1);
  assert.equal((await (await f.request('/requests/staged-live-key-12345')).json()).results[0].platform, 'snapchat');
});
test('unknown, expired and mode-incompatible upload references are rejected', async t => {
  const f = await fixture(t);
  const journal = new Journal(f.dir);
  const request = token => f.request('/publish', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'invalid-asset-key-123' }, body: JSON.stringify({ upload_token: token, platforms: ['tiktok'] }) });
  assert.equal((await request('a'.repeat(64))).status, 410);
  await journal.putAsset('b'.repeat(64), { dryRun: false, expiresAt: 0 });
  assert.equal((await request('b'.repeat(64))).status, 410);
  await journal.putAsset('c'.repeat(64), { dryRun: true, expiresAt: Date.now() + 60000 });
  assert.equal((await request('c'.repeat(64))).status, 409);
  assert.equal(f.calls.length, 0);
});
test('Render configuration binds publicly, uses PORT and defaults to dry run', () => {
  const c = configuration({ RENDER: 'true', PORT: '10000', AUTH_TOKEN: TOKEN });
  assert.equal(c.port, 10000);
  assert.equal(c.host, '0.0.0.0');
  assert.equal(c.app.dryRun, true);
  assert.throws(() => configuration({ DRY_RUN: 'False' }));
  assert.throws(() => configuration({ PORT: 'bad' }));
  assert.throws(() => configuration({ RENDER: 'true', DRY_RUN: 'false', LIVE_PUBLISH_ENABLED: 'true' }));
  assert.throws(() => configuration({ JOURNAL_BACKEND: 'upstash' }));
});
function redisMock() {
  const values = new Map(), commands = [];
  const fetchImpl = async (url, init) => {
    assert.equal(url, 'https://test.upstash.io/');
    assert.equal(init.redirect, 'error');
    const args = JSON.parse(init.body); commands.push(args);
    let result;
    if (args[0] === 'GET') result = values.get(args[1]) ?? null;
    else if (args[0] === 'SET') {
      result = args.includes('NX') && values.has(args[1]) ? null : 'OK';
      if (result) values.set(args[1], args[2]);
    } else if (args[0] === 'EVAL') {
      result = values.get(args[3]) === args[4] ? 1 : 0;
      if (result) values.set(args[3], args[5]);
    } else assert.fail('unexpected Redis command');
    return new Response(JSON.stringify({ result }));
  };
  return { values, commands, make: () => new UpstashJournal({ url: 'https://test.upstash.io', token: 'test-only-redis-placeholder', fetchImpl }) };
}
test('Upstash journal atomically claims, survives app changes and replays', async () => {
  const mock = redisMock();
  const claim = await mock.make().begin('key', 'fingerprint');
  await assert.rejects(() => mock.make().begin('key', 'fingerprint'), { code: 'IDEMPOTENCY_RECONCILIATION_REQUIRED' });
  await assert.rejects(() => mock.make().begin('key', 'different'), { code: 'IDEMPOTENCY_CONFLICT' });
  const response = { status: 202, body: { all_published: false } };
  await claim.finish(response);
  assert.deepEqual((await mock.make().begin('key', 'fingerprint')).response, response);
  assert.ok(mock.commands.filter(c => c[0] === 'SET').every(c => !c.includes('EX')));
  await mock.make().putAsset('asset', { expiresAt: 123 });
  assert.deepEqual(await mock.make().getAsset('asset'), { expiresAt: 123 });
});
test('Upstash outage and failed commits fail closed', async t => {
  const broken = new UpstashJournal({ url: 'https://test.upstash.io', token: 'placeholder', fetchImpl: async () => new Response('secret', { status: 500 }) });
  const f = await fixture(t, { config: { journal: broken } });
  assert.equal((await f.publish()).status, 503);
  assert.equal(f.calls.length, 0);
  const mock = redisMock();
  const claim = await mock.make().begin('key', 'fp');
  mock.values.clear();
  await assert.rejects(() => claim.finish({}), { code: 'JOURNAL_COMMIT_FAILED' });
  assert.throws(() => new UpstashJournal({ url: 'http://test.upstash.io', token: 'x' }));
  assert.throws(() => new UpstashJournal({ url: 'https://evil.test', token: 'x' }));
});
