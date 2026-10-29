const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const load = require('./load-main.cjs');

test('focusing from a reminder shows a window hidden in the tray', () => {
  const { AppWindow } = load(path.resolve('src/main/window.js'), {
    electron: {}, './store': {}, './leetcode-view': {},
  });
  const calls = [];
  AppWindow.prototype.focusExisting.call({ win: {
    isMinimized: () => false, show: () => calls.push('show'), focus: () => calls.push('focus'),
  } });
  assert.deepEqual(calls, ['show', 'focus']);
});

test('LeetCode navigation only trusts HTTPS on the exact domain or its subdomains', () => {
  const { isLeetCode } = load(path.resolve('src/main/leetcode-view.js'), { electron: {} });
  assert.equal(isLeetCode('https://leetcode.com/problems/two-sum/'), true);
  assert.equal(isLeetCode('https://www.leetcode.com/problemset/'), true);
  for (const url of ['http://leetcode.com/', 'ftp://leetcode.com/', 'https://leetcode.com.evil.test/', 'https://evil.test/?leetcode.com', 'invalid']) {
    assert.equal(isLeetCode(url), false, url);
  }
});
