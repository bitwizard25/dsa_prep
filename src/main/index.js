// App entry: one window, one instance.
const { app, net, Notification } = require("electron");
const { migrateUserData } = require("./user-data");
const { AppWindow } = require("./window");
const { registerIpc } = require("./ipc");
const { startUpdater } = require("./updater");

const userData = migrateUserData(app.getPath("appData"));
app.setPath("userData", userData);
if (process.platform === "win32") app.setAppUserModelId("local.dsapractice");

let appWin = null;
let updater = null;

function showUpdateNote() {
  try {
    if (!Notification.isSupported()) return;
    const note = new Notification({ title: "Update ready", body: "Restart now?", silent: true });
    note.on("click", () => { if (updater) updater.requestRestart(); });
    note.show();
  } catch { /* a missing notification service must not affect the app */ }
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => appWin && appWin.focusExisting());
  app.whenReady().then(() => {
    appWin = new AppWindow();
    const bridge = {};
    updater = startUpdater({
      isPackaged: app.isPackaged,
      appVersion: app.getVersion(),
      isOnline: () => { try { return net.isOnline(); } catch { return false; } },
      userData: app.getPath("userData"),
      flush: () => appWin.flushPage(),
      onStatus: (info) => { if (appWin) appWin.send("update-status", info); },
      onNotify: (info) => {
        if (info.ready) appWin.send("update-ready", { version: info.version || "" });
        if (bridge.tray) bridge.tray.setUpdateReady(info.ready || info.busy ? { version: info.version, busy: !info.ready } : null);
        if (info.announce) showUpdateNote();
      },
    });
    registerIpc(appWin, updater, bridge);
    appWin.win.webContents.on("did-finish-load", () => {
      if (appWin.view === "hub" && updater) updater.notifyIfIdle();
    });
    updater.schedule();
  });
  let quitting = false;
  app.on("before-quit", (e) => {
    app.isQuitting = true;
    // Restart now already flushed and is handing the process to the installer.
    if (updater && updater.isInstalling()) return;
    if (quitting || !appWin) return;
    e.preventDefault();
    quitting = true;
    // Saves land before the quit event, which is when electron-updater's
    // autoInstallOnAppQuit runs the NSIS installer silently (/S).
    Promise.resolve(appWin.flushPage()).finally(() => app.quit());
  });
  app.on("window-all-closed", () => app.quit());
}
