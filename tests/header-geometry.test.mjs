import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('public/app.js', 'utf8');
const start = source.indexOf('// Measure the header');
const end = source.indexOf('const menuLabel', start);
const setup = (header, observerAvailable = true) => {
  const values = new Map();
  const listeners = new Map();
  let observed;
  let notify;
  const context = {
    siteHeader: header,
    getComputedStyle: () => ({ top: header.top }),
    document: { documentElement: { style: { setProperty: (key, value) => values.set(key, value) } } },
    addEventListener: (event, callback) => listeners.set(event, callback),
  };
  if (observerAvailable) context.ResizeObserver = class {
    constructor(callback) { notify = callback; }
    observe(element) { observed = element; }
  };
  vm.runInNewContext(source.slice(start, end), context);
  return { values, listeners, notify, observed };
};

test('mobile overlay moves below a header enlarged by wrapped text', () => {
  const header = { top: '30px', offsetHeight: 112 };
  const state = setup(header);
  assert.equal(state.observed, header);
  assert.equal(state.values.get('--header-overlay-top'), '142px');
  header.offsetHeight = 190;
  state.notify();
  assert.equal(state.values.get('--header-overlay-top'), '220px');
});

test('viewport changes update header placement without ResizeObserver', () => {
  const header = { top: '32px', offsetHeight: 126 };
  const state = setup(header, false);
  header.top = '30px';
  header.offsetHeight = 110;
  state.listeners.get('resize')();
  assert.equal(state.values.get('--header-overlay-top'), '140px');
});

test('pages without a header do not create an overlay position', () => {
  assert.equal(setup(null).values.size, 0);
});
