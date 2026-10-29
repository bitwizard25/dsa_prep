const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const load = require('./load-main.cjs');

function setup() {
  const wc = new EventEmitter();
  wc.getURL = () => wc.url;
  wc.url = 'https://leetcode.com/problems/two-sum/';
  wc.setWindowOpenHandler = () => {};
  wc.executeJavaScript = async script => { wc.scripts.push(script); return wc.result; };
  wc.scripts = [];
  const session = { fromPartition: () => ({ setUserAgent() {}, getUserAgent: () => 'Chrome' }) };
  const { LeetCodeView, coverScript } = load(path.resolve('src/main/leetcode-view.js'), {
    electron: { session, WebContentsView: class { constructor() { this.webContents = wc; } }, shell: {} },
  });
  return { wc, view: new LeetCodeView({ send() {}, onUrl() {} }), coverScript };
}

test('problem metadata rejects invalid slugs and non-LeetCode origins', async () => {
  const { view, wc } = setup();
  assert.equal(await view.problemMeta('../evil'), null);
  wc.url = 'https://example.com';
  assert.equal(await view.problemMeta('two-sum'), null);
  assert.equal(wc.scripts.length, 0);
});

test('problem metadata returns only expected fields and handles rejected requests', async () => {
  const { view, wc } = setup();
  wc.result = { content: '<p>Constraints:</p>', topicTags: [{ name: 'Array' }] };
  assert.equal(JSON.stringify(await view.problemMeta('two-sum')), JSON.stringify({ content: '<p>Constraints:</p>', tags: ['Array'] }));
  wc.executeJavaScript = () => Promise.reject(new Error('offline'));
  assert.equal(await view.problemMeta('two-sum'), null);
});

test('a stalled metadata request times out', async () => {
  const { view, wc } = setup();
  wc.executeJavaScript = () => new Promise(() => {});
  const start = Date.now();
  assert.equal(await view.problemMeta('two-sum'), null);
  assert.ok(Date.now() - start < 7000);
});

test('cover follows navigation and stops being reapplied after unlock', async () => {
  const { view, wc, coverScript } = setup();
  assert.equal(typeof coverScript, 'function');
  assert.equal(view.setCover(true), true);
  wc.emit('did-navigate-in-page', {}, wc.url);
  assert.equal(wc.scripts.length, 2);
  assert.equal(view.setCover(false), false);
  const length = wc.scripts.length;
  wc.emit('did-navigate-in-page', {}, wc.url);
  assert.equal(wc.scripts.length, length);
});
