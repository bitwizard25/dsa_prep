// Every request the UI can make. The UI has no other access to Electron or Node.
const { ipcMain } = require("electron");
const path = require("path");
const { pathToFileURL } = require("url");
const store = require("./store");
const V = require("./validate");
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
  h("state:save", (s) => { store.write("state.json", V.statePayload(s)); return true; });

  // layout
  h("ui:layout", (opts) => appWin.setLayout(V.layoutPayload(opts)));
  h("ui:drag", (dragging) => { lc.view.setVisible(V.boolPayload(dragging) && appWin.mode === "workspace"); return true; });

  // LeetCode panel
  h("lc:open", (slug) => lc.open(V.slugPayload(slug)));
  h("lc:home", () => lc.home());
  h("lc:back", () => lc.back());
  h("lc:url", () => lc.url());
  h("lc:meta", (slug) => lc.problemMeta(V.slugPayload(slug)));
  h("lc:cover", (on) => lc.setCover(!!on));
  h("lc:reset", () => (lc.resetStarter ? lc.resetStarter() : false));
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
  h("hub:save", (s) => { store.write("hub.json", V.hubPayload(s)); return true; });
  h("view:open", (v) => { const o = V.viewPayload(v); return appWin.openView(o.view, o.route); });
  h("reminders:set", (items) => reminders.set(V.remindersPayload(items)));
  h("tray:set", (on) => tray.set(V.boolPayload(on)));
  h("window:focus", () => { appWin.focusExisting(); return true; });
  appWin.win.on("focus", () => { if (appWin.view === "hub") appWin.send("hub-focus"); });
}

module.exports = { registerIpc };
