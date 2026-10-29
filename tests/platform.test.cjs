const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const load = require("./load-main.cjs");

test("the main window only navigates to the two app pages", () => {
  const { allowAppNavigation } = load(path.resolve("src/main/window.js"), {
    electron: { app: {}, BrowserWindow: class {}, Menu: { setApplicationMenu() {} }, screen: { getAllDisplays: () => [] }, shell: {} },
    "./store": { read: () => null, write() {} },
    "./leetcode-view": { LeetCodeView: class {}, isLeetCode: () => false },
  });
  assert.equal(allowAppNavigation("file:///app/src/hub/index.html"), true);
  assert.equal(allowAppNavigation("file:///app/src/renderer/index.html#next"), true);
  assert.equal(allowAppNavigation("https://leetcode.com/problems/two-sum/"), false);
  assert.equal(allowAppNavigation("file:///tmp/evil.html"), false);
});

test("the preload gives the Hub and practice pages different calls", () => {
  const { keysFor } = load(path.resolve("src/preload/index.js"), {
    electron: { contextBridge: { exposeInMainWorld() {} }, ipcRenderer: { invoke() {}, on() {} } },
  });
  const hub = keysFor("file:///app/src/hub/index.html");
  const practice = keysFor("file:///app/src/renderer/index.html");
  assert.equal(hub.includes("loginBrowser"), false);
  assert.equal(hub.includes("setReminders"), true);
  assert.equal(practice.includes("setTray"), false);
  assert.equal(practice.includes("loginBrowser"), true);
  assert.equal(keysFor("https://evil.test/").length, 0);
});

test("old data folders are copied into dsa-practice and left in place", () => {
  const { migrateUserData } = load(path.resolve("src/main/user-data.js"), {});
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dsa-data-"));
  fs.mkdirSync(path.join(root, "DSA Practice"));
  fs.writeFileSync(path.join(root, "DSA Practice", "state.json"), '{"from":"old"}');
  fs.writeFileSync(path.join(root, "DSA Practice", "keep.txt"), "still here");
  const target = migrateUserData(root);
  assert.equal(path.basename(target), "dsa-practice");
  assert.equal(fs.readFileSync(path.join(target, "state.json"), "utf8"), '{"from":"old"}');
  assert.equal(fs.existsSync(path.join(root, "DSA Practice", "state.json")), true);
  fs.writeFileSync(path.join(target, "state.json"), '{"from":"new"}');
  migrateUserData(root);
  assert.equal(fs.readFileSync(path.join(target, "state.json"), "utf8"), '{"from":"new"}');
});

test("atomic rename retries EPERM and EBUSY, and fails fast on other errors", () => {
  const { renameWithRetry, retryRename } = load(path.resolve("src/main/store.js"), { electron: { app: { getPath: () => os.tmpdir() } } });
  let tries = 0;
  retryRename(() => { tries++; if (tries < 3) { const e = new Error("busy"); e.code = "EPERM"; throw e; } }, "a", "b");
  assert.equal(tries, 3);
  assert.throws(() => retryRename(() => { const e = new Error("no"); e.code = "ENOENT"; throw e; }, "a", "b"), /no/);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dsa-rename-"));
  fs.writeFileSync(path.join(dir, "from.txt"), "ok");
  renameWithRetry(path.join(dir, "from.txt"), path.join(dir, "to.txt"));
  assert.equal(fs.readFileSync(path.join(dir, "to.txt"), "utf8"), "ok");
});

test("reminders roll to the next Asia/Kolkata midnight", () => {
  const { nextIstMidnight } = load(path.resolve("src/main/reminders.js"), {
    electron: { Notification: class {}, powerMonitor: { on() {} } },
  });
  const evening = Date.parse("2026-10-29T18:00:00Z");
  assert.equal(new Date(nextIstMidnight(evening)).toISOString(), "2026-10-29T18:30:00.000Z");
  const justAfter = Date.parse("2026-10-29T18:30:00Z");
  assert.equal(nextIstMidnight(justAfter) - justAfter, 24 * 60 * 60 * 1000);
});

test("IPC rejects unexpected state fields and bad problem slugs", () => {
  const handlers = new Map();
  const wc = { mainFrame: { url: require("node:url").pathToFileURL(path.resolve("src/renderer/index.html")).href } };
  const ipc = load(path.resolve("src/main/ipc.js"), {
    electron: { ipcMain: { handle: (name, fn) => handlers.set(name, fn) } },
    "./store": { read: () => null, write() {} },
    "./browser-login": {},
    "./reminders": { Reminders: class { set() { return 0; } } },
    "./tray": { TrayControl: class { set() {} } },
    "./validate": require(path.resolve("src/main/validate.js")),
  });
  ipc.registerIpc({ lc: { open() { return false; } }, win: { webContents: wc, on() {} }, focusExisting() {}, mode: "workspace" });
  const event = { sender: wc, senderFrame: wc.mainFrame };
  assert.throws(() => handlers.get("state:save")(event, { stolen: true }), /unexpected/i);
  assert.throws(() => handlers.get("lc:open")(event, "../evil"), /problem/i);
  assert.equal(handlers.get("state:save")(event, { version: 2 }), true);
});

test("the editor cover says it is only a reminder", () => {
  const { coverScript } = load(path.resolve("src/main/leetcode-view.js"), { electron: {} });
  const script = coverScript(true);
  assert.match(script, /only a reminder/);
  assert.equal(script.includes("prove you"), false);
});
