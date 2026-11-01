// App entry: one window, one instance.
const { app } = require("electron");
const { migrateUserData } = require("./user-data");
const { AppWindow } = require("./window");
const { registerIpc } = require("./ipc");

const userData = migrateUserData(app.getPath("appData"));
app.setPath("userData", userData);
if (process.platform === "win32") app.setAppUserModelId("local.dsapractice");

let appWin = null;

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => appWin && appWin.focusExisting());
  app.whenReady().then(() => {
    appWin = new AppWindow();
    registerIpc(appWin);
  });
  let quitting = false;
  app.on("before-quit", (e) => {
    app.isQuitting = true;
    if (quitting || !appWin) return;
    e.preventDefault();
    quitting = true;
    Promise.resolve(appWin.flushPage()).finally(() => app.quit());
  });
  app.on("window-all-closed", () => app.quit());
}
