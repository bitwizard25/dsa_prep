// Optional tray icon: when on, closing the window hides it so reminders keep running.
const path = require("path");
const { Tray, Menu, nativeImage, app } = require("electron");

class TrayControl {
  constructor(appWin, onRestart) { this.appWin = appWin; this.onRestart = onRestart; this.tray = null; this.update = null; }
  menu() {
    const items = [];
    if (this.update) {
      items.push({
        label: this.update.busy ? "Update ready — restarts after this session" : "Update ready, restart now",
        enabled: !this.update.busy,
        click: () => { if (!this.update.busy && this.onRestart) this.onRestart(); },
      });
      items.push({ type: "separator" });
    }
    items.push(
      { label: "Open Hub", click: () => { this.appWin.focusExisting(); this.appWin.openView("hub"); } },
      { label: "Open practice", click: () => { this.appWin.focusExisting(); this.appWin.openView("practice"); } },
      { type: "separator" },
      { label: "Quit", click: () => { app.isQuitting = true; app.quit(); } },
    );
    return Menu.buildFromTemplate(items);
  }
  set(on) {
    this.appWin.keepInTray = !!on;
    if (on && !this.tray) {
      const iconFile = process.platform === "win32" ? "icon.ico" : "icon-32.png";
      this.tray = new Tray(nativeImage.createFromPath(path.join(__dirname, "assets", iconFile)));
      this.tray.setToolTip("DSA Practice");
      this.tray.setContextMenu(this.menu());
      this.tray.on("click", () => this.appWin.focusExisting());
    } else if (!on && this.tray) { this.tray.destroy(); this.tray = null; }
    return !!this.tray;
  }
  /** info is { version, busy } while a download is waiting, or null. */
  setUpdateReady(info) {
    this.update = info && info.version ? info : null;
    if (this.tray) this.tray.setContextMenu(this.menu());
  }
}

module.exports = { TrayControl };
