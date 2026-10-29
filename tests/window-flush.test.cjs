const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const load = require("./load-main.cjs");

function loadWindow() {
  return load(path.resolve("src/main/window.js"), {
    electron: { app: {}, BrowserWindow: class {}, Menu: { setApplicationMenu() {} }, screen: { getAllDisplays: () => [] }, shell: {} },
    "./store": { read: () => null, write() {} },
    "./leetcode-view": { LeetCodeView: class {}, isLeetCode: () => false },
  });
}

test("openView flushes the open page before loading the next one", async () => {
  const { AppWindow } = loadWindow();
  const order = [];
  const self = {
    view: "practice", hubLoaded: false, mode: "workspace", sidebar: 380,
    win: {
      isDestroyed: () => false,
      loadFile: (file) => { order.push("load:" + file); },
      webContents: { isDestroyed: () => false, executeJavaScript: async (script) => { order.push(script.includes("__flushSaves") ? "flush" : script); } },
    },
    send() {}, layout() {},
    flushPage: AppWindow.prototype.flushPage,
  };
  await AppWindow.prototype.openView.call(self, "hub", "today");
  assert.deepEqual(order[0], "flush");
  assert.match(order[1], /hub/);
});

test("flushPage does nothing when the window is already gone", async () => {
  const { AppWindow } = loadWindow();
  let called = false;
  await AppWindow.prototype.flushPage.call({ win: { isDestroyed: () => true, webContents: { isDestroyed: () => false, executeJavaScript: async () => { called = true; } } } });
  assert.equal(called, false);
});
