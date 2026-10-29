// Every request the UI can make. The UI has no other access to Electron or Node.
const { ipcMain } = require("electron");
const path = require("path");
const { pathToFileURL } = require("url");
const store = require("./store");
const login = require("./browser-login");
const { Reminders } = require("./reminders");
const { TrayControl } = require("./tray");

function registerIpc(appWin) {
  const lc = appWin.lc;
  const pages = new Set(["hub", "renderer"].map(dir =>
    pathToFileURL(path.join(__dirname, "..", dir, "index.html")).href));
  const h = (ch, fn) => ipcMain.handle(ch, (event, arg) => {
    const wc = appWin.win.webContents;
    const frame = event.senderFrame;
    if (event.sender !== wc || !frame || frame !== wc.mainFrame || !pages.has(frame.url.split(/[?#]/)[0])) {
      throw new Error("Unauthorized IPC sender");
    }
    return fn(arg);
  });

  // progress data
  h("state:load", () => store.read("state.json"));
  h("state:save", (s) => { store.write("state.json", s); return true; });

  // layout
  h("ui:layout", (opts) => appWin.setLayout(opts || {}));
  h("ui:drag", (dragging) => { lc.view.setVisible(!dragging && appWin.mode === "workspace"); return true; });

  // LeetCode panel
  h("lc:open", (slug) => lc.open(slug));
  h("lc:home", () => lc.home());
  h("lc:back", () => lc.back());
  h("lc:url", () => lc.url());
  h("focus:set", (on) => lc.setFocus(on));

  // login
  h("auth:status", () => lc.authStatus());
  h("auth:continue", () => {
    const ok = login.confirmClosed();
    if (!ok) appWin.send("auth-progress", { step: "still-open" });
    return ok;
  });
  h("auth:browser", async () => {
    const r = await login.run((p) => appWin.send("auth-progress", p));
    if (!r.ok) return r;
    appWin.send("auth-progress", { step: "importing" });
    await lc.importCookies(r.cookies, r.ua);
    if (r.ua) appWin.setUA(r.ua);
    await lc.reloadAndWait();
    const st = await lc.authStatus();
    return { ok: st.signedIn, error: st.signedIn ? null : "rejected", ...st };
  });
  h("auth:logout", async () => { await lc.logout(); login.forget(); return true; });

  // ---------- Hub (added; nothing above changes) ----------
  const reminders = new Reminders(appWin);
  const tray = new TrayControl(appWin);
  tray.set(!!((store.read("hub.json") || {}).settings || {}).tray);
  h("hub:load", () => store.read("hub.json"));
  h("hub:save", (s) => { store.write("hub.json", s); return true; });
  h("view:open", (v) => (typeof v === "string" ? appWin.openView(v) : appWin.openView(v.view, v.route)));
  h("reminders:set", (items) => reminders.set(items));
  h("tray:set", (on) => tray.set(on));
  appWin.win.on("focus", () => { if (appWin.view === "hub") appWin.send("hub-focus"); });
}

module.exports = { registerIpc };
