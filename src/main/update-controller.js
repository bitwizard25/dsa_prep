// Drives electron-updater. The updater object is injected so tests can fake it.
const { CHECK_EVERY_MS, STARTUP_DELAY_MS, shouldCheck, restartDecision } = require("./update-policy");

const silentLog = { info() {}, warn() {}, error() {}, debug() {} };

function createUpdateController(opts) {
  const everyMs = opts.everyMs || CHECK_EVERY_MS;
  const startupDelayMs = opts.startupDelayMs || STARTUP_DELAY_MS;
  const updater = opts.autoUpdater;
  let lastCheckAt = 0;
  let downloaded = false;
  let version = "";
  let busy = false;
  let announced = false;
  let installing = false;

  updater.autoDownload = true;
  updater.autoInstallOnAppQuit = true;
  updater.disableWebInstaller = true;
  updater.allowPrerelease = false;
  if ("logger" in updater) updater.logger = silentLog;
  updater.setFeedURL({ provider: "github", owner: opts.feed.owner, repo: opts.feed.repo });
  updater.on("error", () => {});
  updater.on("update-downloaded", (info) => {
    downloaded = true;
    version = (info && info.version) || "";
    emit();
  });

  function emit() {
    if (!downloaded || typeof opts.onNotify !== "function") return;
    const ready = !busy;
    const announce = ready && !announced;
    if (announce) announced = true;
    opts.onNotify({ version, ready, busy: !ready, announce });
  }

  async function check(now = Date.now()) {
    const online = !!opts.isOnline();
    if (!shouldCheck({ packaged: !!opts.isPackaged, online, now, lastCheckAt, everyMs })) {
      return { checked: false, reason: !opts.isPackaged ? "dev" : !online ? "offline" : "recent" };
    }
    lastCheckAt = now;
    try {
      await updater.checkForUpdates();
      return { checked: true };
    } catch {
      return { checked: false, reason: "error" };
    }
  }

  function schedule(timers = global) {
    if (!opts.isPackaged) return null;
    const st = timers.setTimeout || setTimeout;
    const si = timers.setInterval || setInterval;
    const start = st(() => { check(); }, startupDelayMs);
    const timer = si(() => { check(); }, everyMs);
    return { start, timer };
  }

  function setBusy(next) {
    const was = busy;
    busy = !!next;
    if (downloaded && was !== busy) emit();
  }

  function notifyIfIdle() { if (downloaded) emit(); }

  function status() { return { ready: downloaded && !busy, version }; }

  function isInstalling() { return installing; }

  async function requestRestart() {
    const decision = restartDecision({ downloaded, sessionBusy: busy });
    if (decision !== "install") return { ok: false, reason: decision === "defer" ? "busy" : "none" };
    try { await opts.flush(); } catch { /* a failed flush must not block the already-saved copy */ }
    installing = true;
    try {
      updater.quitAndInstall(true, true);
    } catch {
      installing = false;
      return { ok: false, reason: "error" };
    }
    return { ok: true };
  }

  return { check, schedule, setBusy, notifyIfIdle, status, requestRestart, isInstalling, feed: opts.feed };
}

module.exports = { createUpdateController };
