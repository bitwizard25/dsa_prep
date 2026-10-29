// Safe bridge: the UI can only call these functions.
const { contextBridge, ipcRenderer } = require("electron");
const inv = (ch) => (arg) => ipcRenderer.invoke(ch, arg);
const on = (ch) => (cb) => ipcRenderer.on(ch, (_e, data) => cb(data));

contextBridge.exposeInMainWorld("api", {
  loadState: inv("state:load"),
  saveState: inv("state:save"),
  layout: inv("ui:layout"),
  drag: inv("ui:drag"),
  open: inv("lc:open"),
  home: inv("lc:home"),
  back: inv("lc:back"),
  url: inv("lc:url"),
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
  // Hub (added)
  hubLoad: inv("hub:load"),
  hubSave: inv("hub:save"),
  openHub: (route) => ipcRenderer.invoke("view:open", { view: "hub", route }),
  openPractice: (opts) => ipcRenderer.invoke("view:open", { view: "practice", route: opts && opts.next ? "next" : undefined }),
  setReminders: inv("reminders:set"),
  setTray: inv("tray:set"),
  onReminder: on("hub-reminder"),
  onHubFocus: on("hub-focus"),
  onHubRoute: on("hub-route"),
  onAccepted: on("accepted"),
});
