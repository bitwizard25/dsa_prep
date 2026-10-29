// App entry: one window, one instance.
const { app } = require("electron");
const { AppWindow } = require("./window");
const { registerIpc } = require("./ipc");

let appWin = null;

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => appWin && appWin.focusExisting());
  app.whenReady().then(() => {
    appWin = new AppWindow();
    registerIpc(appWin);
  });
  app.on("before-quit", () => { app.isQuitting = true; });
  app.on("window-all-closed", () => app.quit());
}
