// Safe bridge. Each page of the main window only receives the calls it uses.
const { contextBridge, ipcRenderer } = require("electron");

const inv = (ch) => (arg) => ipcRenderer.invoke(ch, arg);
const on = (ch) => (cb) => ipcRenderer.on(ch, (_e, data) => cb(data));

const HUB_KEYS = ["hubLoad", "hubSave", "loadState", "openPractice", "setReminders", "setTray", "onReminder", "onHubFocus", "onHubRoute", "onRemindersRefresh", "setSessionBusy", "updateStatus", "installUpdate", "onUpdateReady"];
const PRACTICE_KEYS = ["loadState", "saveState", "layout", "drag", "open", "home", "back", "url", "problemMeta", "cover", "resetCode", "setFocus", "authStatus", "loginBrowser", "loginContinue", "logout", "onUrl", "onBlocked", "onShortcut", "onAuthProgress", "onNeedLogin", "hubLoad", "hubSave", "openHub", "onAccepted", "focusWindow", "setSessionBusy"];

function keysFor(href) {
  const s = String(href || "");
  if (s.includes("/hub/index.html")) return HUB_KEYS.slice();
  if (s.includes("/renderer/index.html")) return PRACTICE_KEYS.slice();
  return [];
}

const ALL = {
  loadState: inv("state:load"),
  saveState: inv("state:save"),
  layout: inv("ui:layout"),
  drag: inv("ui:drag"),
  open: inv("lc:open"),
  home: inv("lc:home"),
  back: inv("lc:back"),
  url: inv("lc:url"),
  problemMeta: inv("lc:meta"),
  cover: inv("lc:cover"),
  resetCode: inv("lc:reset"),
  setFocus: inv("focus:set"),
  authStatus: inv("auth:status"),
  loginBrowser: inv("auth:browser"),
  loginContinue: inv("auth:continue"),
  logout: inv("auth:logout"),
  onUrl: on("lc-url"),
  onBlocked: on("blocked"),
  onShortcut: on("shortcut"),
  onAuthProgress: on("auth-progress"),
  onNeedLogin: on("need-login"),
  hubLoad: inv("hub:load"),
  hubSave: inv("hub:save"),
  openHub: (route) => ipcRenderer.invoke("view:open", { view: "hub", route }),
  openPractice: (opts) => ipcRenderer.invoke("view:open", { view: "practice", route: opts && opts.next ? "next" : undefined }),
  setReminders: inv("reminders:set"),
  setTray: inv("tray:set"),
  onReminder: on("hub-reminder"),
  onHubFocus: on("hub-focus"),
  onHubRoute: on("hub-route"),
  onRemindersRefresh: on("reminders-refresh"),
  onAccepted: on("accepted"),
  focusWindow: inv("window:focus"),
  setSessionBusy: inv("session:busy"),
  updateStatus: inv("update:status"),
  installUpdate: inv("update:install"),
  onUpdateReady: on("update-ready"),
};

const href = typeof location === "undefined" ? "" : location.href;
const api = {};
for (const key of keysFor(href)) api[key] = ALL[key];
contextBridge.exposeInMainWorld("api", api);
const dev = typeof process !== "undefined" && Array.isArray(process.argv) && process.argv.includes("--dsa-dev");
contextBridge.exposeInMainWorld("dsaDev", dev);

if (typeof module !== "undefined" && module.exports) module.exports = { keysFor, HUB_KEYS, PRACTICE_KEYS };
