import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchJsonWithTimeout } from '../src/lib/fetch-json.mjs';

test('account feed returns JSON and preserves no-store', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (_url, options) => {
      assert.equal(options.cache, 'no-store');
      assert.ok(options.signal instanceof AbortSignal);
      return { ok:true, json:async()=>({offers:[]}) };
    };
    assert.deepEqual(await fetchJsonWithTimeout('https://example.test', {cache:'no-store'}), {offers:[]});
  } finally { globalThis.fetch = original; }
});

test('account feed aborts a stalled body without retrying', async () => {
  const original = globalThis.fetch;
  let requests = 0, aborted = false;
  try {
    globalThis.fetch = async (_url, {signal}) => {
      requests++;
      return {ok:true,json:()=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>{
        aborted = true;
        reject(new Error('body aborted'));
      }))};
    };
    await assert.rejects(fetchJsonWithTimeout('https://example.test', {timeoutMs:10}), /dauert zu lange/);
    assert.equal(aborted, true);
    assert.equal(requests, 1);
  } finally { globalThis.fetch = original; }
});

test('account feed rejects an HTTP error without parsing its body', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async()=>({ok:false,json:()=>{throw new Error('must not parse');}});
    await assert.rejects(fetchJsonWithTimeout('https://example.test'), /Daten konnten/);
  } finally { globalThis.fetch = original; }
});
