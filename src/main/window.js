// The app window: sidebar (our UI) on the left, LeetCode on the right.
// Two layouts: "onboarding" (our UI fills the window) and "workspace" (sidebar + LeetCode).
const path = require("path");
const { BrowserWindow, Menu, screen, app, shell } = require("electron");
const store = require("./store");
const { LeetCodeView, isLeetCode } = require("./leetcode-view");
const TOPBAR = 48;   // the shared top navigation bar above LeetCode

const SB_MIN = 300, SB_MAX = 560, SB_COLLAPSED = 64;
const clampW = (w) => Math.max(SB_MIN, Math.min(SB_MAX, Math.round(+w || 380)));

function onScreen(b) {
  if (!b) return false;
  return screen.getAllDisplays().some(({ workArea: a }) =>
    b.x < a.x + a.width && b.x + b.width > a.x && b.y < a.y + a.height && b.y + b.height > a.y);
}

class AppWindow {
  constructor() {
    this.prefs = store.read("window.json") || {};           // size, position, last problem, browser identity
    const ui = ((store.read("state.json") || {}).ui) || {};
    this.mode = "onboarding";
    this.view = "hub";              // "hub" (new home) or "practice" (the DSA app, unchanged)
    this.keepInTray = false;
    this.sidebar = ui.collapsed ? SB_COLLAPSED : clampW(ui.width);
    this.saveT = null;

    Menu.setApplicationMenu(null);
    const b = onScreen(this.prefs.bounds) ? this.prefs.bounds : { width: 1500, height: 950 };
    this.win = new BrowserWindow({
      ...b, minWidth: 1000, minHeight: 640, title: "DSA Practice", backgroundColor: "#0D0D0D", show: false,
      icon: path.join(__dirname, "assets", "icon-256.png"),
      webPreferences: { preload: path.join(__dirname, "..", "preload", "index.js"), contextIsolation: true, nodeIntegration: false, sandbox: true },
    });
    if (this.prefs.maximized) this.win.maximize();
    this.win.once("ready-to-show", () => this.win.show());
    this.win.webContents.on("did-finish-load", () => { this.hubLoaded = this.view === "hub"; });
    // Links in the Hub (videos, playlists) open in the normal browser, never inside the app.
    this.win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:\/\//.test(url)) shell.openExternal(url); return { action: "deny" }; });

    this.lc = new LeetCodeView({
      send: (ch, data) => this.send(ch, data),
      ua: this.prefs.ua,
      onUrl: (url) => { if (isLeetCode(url) && /\/problems\/[^/]+/.test(url)) { this.prefs.lastUrl = url; this.savePrefs(); } },
    });
    this.win.contentView.addChildView(this.lc.view);
    this.lc.view.setVisible(false);                           // hidden until the renderer picks a layout
    this.lc.load(this.prefs.lastUrl);                         // reopen the last problem
    this.openView("hub");                                     // the Hub is home; Practice is one click away

    const remember = () => {
      this.prefs.maximized = this.win.isMaximized();
      if (!this.prefs.maximized && !this.win.isMinimized()) this.prefs.bounds = this.win.getBounds();
      this.savePrefs();
    };
    this.win.on("resize", () => { this.layout(); remember(); });
    this.win.on("move", remember);
    this.win.on("close", (e) => {
      if (this.keepInTray && !app.isQuitting) { e.preventDefault(); this.win.hide(); return; }
      remember(); clearTimeout(this.saveT); store.write("window.json", this.prefs); });

    this.hookShortcuts(this.win.webContents);
    this.hookShortcuts(this.lc.wc);
  }

  /** Switch between the Hub and the practice app. The practice app is loaded exactly as before. */
  openView(view, route) {
    // Already on the Hub: switch screens inside the open page instead of reloading it (no unsaved state is lost).
    if (view !== "practice" && this.view === "hub" && this.hubLoaded) { this.send("hub-route", route || "today"); return "hub"; }
    this.hubLoaded = false;
    this.view = view === "practice" ? "practice" : "hub";
    if (this.view === "hub") {
      this.mode = "hub";
      this.layout();                                  // LeetCode panel hidden behind the Hub
      this.win.loadFile(path.join(__dirname, "..", "hub", "index.html"), route ? { hash: route } : undefined);
    } else {
      this.win.loadFile(path.join(__dirname, "..", "renderer", "index.html"), route ? { hash: route } : undefined);   // it sets its own layout on load
    }
    return this.view;
  }

  send(ch, data) { if (!this.win.isDestroyed()) this.win.webContents.send(ch, data); }
  savePrefs() { clearTimeout(this.saveT); this.saveT = setTimeout(() => store.write("window.json", this.prefs), 400); }

  setUA(ua) { this.prefs.ua = ua; this.savePrefs(); }

  /** mode: "onboarding" | "workspace" */
  setLayout({ mode, width, collapsed }) {
    this.mode = mode === "workspace" ? "workspace" : "onboarding";
    this.sidebar = collapsed ? SB_COLLAPSED : clampW(width);
    this.layout();
    return this.sidebar;
  }

  layout() {
    const [w, h] = this.win.getContentSize();
    const show = this.mode === "workspace";
    this.lc.view.setVisible(show);
    if (show) this.lc.view.setBounds({ x: this.sidebar, y: TOPBAR, width: Math.max(0, w - this.sidebar), height: Math.max(0, h - TOPBAR) });
  }

  // Ctrl+Alt shortcuts work wherever the cursor is, including LeetCode's code editor.
  hookShortcuts(wc) {
    const map = { p: "toggle", a: "alone", h: "help", n: "next", b: "sidebar" };
    wc.on("before-input-event", (e, input) => {
      if (input.type !== "keyDown" || !input.control || !input.alt || input.shift) return;
      const key = (input.key || "").toLowerCase();
      if (key === "s" && this.view === "practice") { e.preventDefault(); this.openView("hub"); return; }   // back to the study plan
      const action = map[key];
      if (action) { e.preventDefault(); this.send("shortcut", action); }
    });
  }

  focusExisting() { if (this.win.isMinimized()) this.win.restore(); this.win.show(); this.win.focus(); }
}

module.exports = { AppWindow };
