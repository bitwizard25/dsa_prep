const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const load = require('./load-main.cjs');

test('privileged IPC accepts only the main app frame and bundled pages', () => {
  const handlers = new Map();
  let writes = 0;
  const wc = { mainFrame: {} };
  const ipc = load(path.resolve('src/main/ipc.js'), {
    electron: { ipcMain: { handle: (name, fn) => handlers.set(name, fn) } },
    './store': { read: () => null, write: () => { writes++; } },
    './browser-login': {},
    './reminders': { Reminders: class {} },
    './tray': { TrayControl: class { set() {} } },
  });
  ipc.registerIpc({ lc: {}, win: { webContents: wc, on() {} } });
  const save = handlers.get('state:save');
  wc.mainFrame.url = pathToFileURL(path.resolve('src/hub/index.html')).href + '#today';
  assert.equal(save({ sender: wc, senderFrame: wc.mainFrame }, {}), true);
  assert.equal(writes, 1);
  for (const event of [
    { sender: {}, senderFrame: wc.mainFrame },
    { sender: wc, senderFrame: { url: wc.mainFrame.url } },
    { sender: wc, senderFrame: null },
  ]) assert.throws(() => save(event, {}), /unauthorized/i);
  wc.mainFrame.url = 'https://leetcode.com/problems/two-sum/';
  assert.throws(() => save({ sender: wc, senderFrame: wc.mainFrame }, {}), /unauthorized/i);
  assert.equal(writes, 1);
});
