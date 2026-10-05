import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app = fs.readFileSync('public/app.js', 'utf8');
const intake = app.slice(app.indexOf('  const postIntake ='), app.indexOf('  const setStatus='));

test('hanging intake aborts and releases its timer without repeating a submission', async () => {
  let abort, cleared = false, requests = 0;
  const context = vm.createContext({AbortController, INTAKE_ENDPOINT:'https://example.test',
    setTimeout:fn => { abort = fn; return 1; },
    clearTimeout:() => { cleared = true; },
    fetch:(_url, {signal}) => { requests++; return new Promise((_resolve,reject) => signal.addEventListener('abort', () => reject(new Error('aborted')))); }
  });
  const pending = vm.runInContext(`${intake}\npostIntake({kind:'report'})`, context);
  abort();
  await assert.rejects(pending, /aborted/);
  assert.equal(cleared,true);
  assert.equal(requests,1);
});

test('PWA activation preserves other applications caches', async () => {
  const handlers = {}, deleted = [];
  const context = vm.createContext({URL,
    self:{registration:{scope:'https://example.test/angebotslotse/'},location:{origin:'https://example.test'},addEventListener:(name,fn)=>{handlers[name]=fn;},clients:{claim:async()=>{}}},
    clients:{}, caches:{keys:async()=>['other-app-v1','angebotslotse-shell-v15','angebotslotse-shell-v16'],delete:async key=>{deleted.push(key);}}
  });
  vm.runInContext(fs.readFileSync('public/sw.js','utf8'),context);
  let completion;
  handlers.activate({waitUntil:value=>{completion=value;}});
  await completion;
  assert.deepEqual(deleted,['angebotslotse-shell-v15']);
});

test('cached images keep their delayed background refresh alive', async () => {
  const handlers = {}, cached = {cached:true}, saved = [];
  let resolveNetwork, lifetime, response;
  const context = vm.createContext({URL,
    self:{registration:{scope:'https://example.test/angebotslotse/'},location:{origin:'https://example.test'},addEventListener:(name,fn)=>{handlers[name]=fn;}},
    clients:{}, fetch:()=>new Promise(resolve=>{resolveNetwork=resolve;}),
    caches:{match:async()=>cached,open:async()=>({put:async(request,copy)=>saved.push(copy)})}
  });
  vm.runInContext(fs.readFileSync('public/sw.js','utf8'),context);
  handlers.fetch({request:{method:'GET',url:'https://example.test/image.jpg',destination:'image'},
    waitUntil:value=>{lifetime=value;},respondWith:value=>{response=value;}});
  assert.ok(lifetime,'refresh lifetime must be registered synchronously');
  assert.equal(await response,cached);
  assert.equal(saved.length,0);
  resolveNetwork({ok:true,clone:()=>({fresh:true})});
  await lifetime;
  assert.equal(saved.length,1);
  assert.equal(saved[0].fresh,true);
});
