// Run with electron tests/electron-cover.cjs; uses no user profile or network.
const { app, BrowserWindow } = require('electron');
const assert = require('node:assert/strict');
const { coverScript } = require('../src/main/leetcode-view');

app.whenReady().then(async () => {
  const w = new BrowserWindow({ show: false });
  await w.loadURL('data:text/html,<textarea id="editor"></textarea>');
  const run = script => w.webContents.executeJavaScript(script);
  await run(coverScript(true));
  const blocked = await run(`(() => { const editor = document.getElementById('editor'); const e = new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: 'x' }); return !editor.dispatchEvent(e) && !!document.getElementById('__dsaCover'); })()`);
  assert.equal(blocked, true);
  await run(coverScript(false));
  const lifted = await run(`(() => { const editor = document.getElementById('editor'); const e = new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: 'x' }); return editor.dispatchEvent(e) && !document.getElementById('__dsaCover'); })()`);
  assert.equal(lifted, true);
  console.log('Electron cover: blocked while active, released after unlock.');
  app.exit(0);
}).catch(error => { console.error(error); app.exit(1); });
