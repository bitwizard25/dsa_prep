// Optional tray icon: when on, closing the window hides it so reminders keep running.
const path = require("path");
const { Tray, Menu, nativeImage, app } = require("electron");

class TrayControl {
  constructor(appWin) { this.appWin = appWin; this.tray = null; }
  set(on) {
    this.appWin.keepInTray = !!on;
    if (on && !this.tray) {
      this.tray = new Tray(nativeImage.createFromPath(path.join(__dirname, "assets", "icon-32.png")));
      this.tray.setToolTip("DSA Practice");
      this.tray.setContextMenu(Menu.buildFromTemplate([
        { label: "Open Hub", click: () => { this.appWin.focusExisting(); this.appWin.openView("hub"); } },
        { label: "Open practice", click: () => { this.appWin.focusExisting(); this.appWin.openView("practice"); } },
        { type: "separator" },
        { label: "Quit", click: () => { app.isQuitting = true; app.quit(); } },
      ]));
      this.tray.on("click", () => this.appWin.focusExisting());
    } else if (!on && this.tray) { this.tray.destroy(); this.tray = null; }
    return !!this.tray;
  }
}

module.exports = { TrayControl };
