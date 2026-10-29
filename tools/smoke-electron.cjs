// Run with `npm run smoke` after building the Hub. Uses isolated, disposable data.
const { app, BrowserWindow } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { registerIpc } = require('../src/main/ipc');
const { LeetCodeView } = require('../src/main/leetcode-view');

const data = fs.mkdtempSync(path.join(os.tmpdir(), 'dsa-smoke-'));
app.setPath('userData', data);
const timeout = setTimeout(() => { console.error('Electron smoke test timed out'); app.exit(1); }, 30000);
app.on('window-all-closed', () => {});
app.on('quit', () => {
  clearTimeout(timeout);
  try { fs.rmSync(data, { recursive: true, force: true }); } catch {}
});

app.whenReady().then(async () => {
  const errors = [];
  const win = new BrowserWindow({ show: false, webPreferences: {
    preload: path.resolve(__dirname, '../src/preload/index.js'),
    contextIsolation: true, nodeIntegration: false, sandbox: true,
  } });
  win.webContents.on('console-message', details => {
    if (details.level === 'error') errors.push(details.message);
  });
  win.webContents.on('render-process-gone', (_event, details) => errors.push(details.reason));
  const lc = new LeetCodeView({ send() {}, onUrl() {} });
  registerIpc({ win, lc, setLayout() { return 380; }, send() {}, view: 'hub' });

  async function waitFor(expression) {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await win.webContents.executeJavaScript(expression)) return;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    throw new Error(`Renderer did not become ready: ${expression}`);
  }

  await win.loadFile(path.resolve(__dirname, '../src/hub/index.html'));
  await waitFor('document.querySelectorAll("#root button").length > 0');
  assert.equal(await win.webContents.executeJavaScript('window.api.hubSave({ version: 1, smoke: true })'), true);
  assert.equal(await win.webContents.executeJavaScript('(async () => (await window.api.hubLoad()).smoke)()'), true);
  await win.loadFile(path.resolve(__dirname, '../src/renderer/index.html'));
  await waitFor('document.querySelectorAll("#app button").length > 0');
  assert.equal(await win.webContents.executeJavaScript('window.api.saveState({ version: 2, smoke: true })'), true);
  assert.equal(await win.webContents.executeJavaScript('(async () => (await window.api.loadState()).smoke)()'), true);
  assert.deepEqual(errors, []);
  console.log('Electron smoke passed: Hub, Practice, sandboxed preload, IPC and disk saves.');
  lc.wc.close();
  win.destroy();
  app.quit();
}).catch(error => { console.error(error); app.exit(1); });
