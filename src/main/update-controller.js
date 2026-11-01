// Drives electron-updater. The updater object is injected so tests can fake it.
const { CHECK_EVERY_MS, STARTUP_DELAY_MS, shouldCheck, restartDecision } = require("./update-policy");
const { presentAbout, safeDetail, showVersion } = require("./about-view");

const silentLog = { info() {}, warn() {}, error() {}, debug() {} };

function clampPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function createUpdateController(opts) {
  const everyMs = opts.everyMs || CHECK_EVERY_MS;
  const startupDelayMs = opts.startupDelayMs || STARTUP_DELAY_MS;
  const updater = opts.autoUpdater;
  const about = opts.about || { appVersion: "", commit: null, builtAt: null };
  let lastCheckAt = 0;
  let downloaded = false;
  let version = "";
  let busy = false;
  let announced = false;
  let installing = false;
  let phase = opts.isPackaged ? "idle" : "dev";
  let percent = null;
  let available = "";
  let detail = "";

  updater.autoDownload = true;
  updater.autoInstallOnAppQuit = true;
  updater.disableWebInstaller = true;
  updater.allowPrerelease = false;
  if ("logger" in updater) updater.logger = silentLog;
  updater.setFeedURL({ provider: "github", owner: opts.feed.owner, repo: opts.feed.repo });

  function snapshot() {
    return presentAbout({
      ready: downloaded && !busy,
      version,
      phase,
      percent,
      available,
      lastCheckedAt: lastCheckAt || null,
      detail,
    }, about);
  }

  function touch() {
    if (typeof opts.onStatus === "function") opts.onStatus(snapshot());
  }

  function emit() {
    touch();
    if (!downloaded || typeof opts.onNotify !== "function") return;
    const ready = !busy;
    const announce = ready && !announced;
    if (announce) announced = true;
    opts.onNotify({ version, ready, busy: !ready, announce });
  }

  updater.on("error", (err) => {
    if (downloaded) return;
    phase = "error";
    detail = safeDetail(err);
    percent = null;
    touch();
  });
  updater.on("checking-for-update", () => {
    phase = "checking";
    detail = "";
    touch();
  });
  updater.on("update-available", (info) => {
    available = showVersion(info && info.version) || available;
    phase = "downloading";
    if (percent == null) percent = 0;
    detail = "";
    touch();
  });
  updater.on("download-progress", (p) => {
    phase = "downloading";
    const next = clampPercent(p && p.percent);
    if (next != null) percent = next;
    touch();
  });
  updater.on("update-not-available", () => {
    if (downloaded) {
      phase = "ready";
      percent = 100;
    } else {
      phase = "uptodate";
      percent = null;
      available = "";
    }
    detail = "";
    touch();
  });
  updater.on("update-downloaded", (info) => {
    downloaded = true;
    version = showVersion(info && info.version) || available;
    available = version || available;
    phase = "ready";
    percent = 100;
    detail = "";
    emit();
  });

  async function check(now = Date.now(), extra = {}) {
    const online = !!opts.isOnline();
    const force = !!(extra && extra.force);
    if (!opts.isPackaged) {
      phase = "dev";
      touch();
      return { checked: false, reason: "dev" };
    }
    if (!online) {
      if (!downloaded) phase = "offline";
      touch();
      return { checked: false, reason: "offline" };
    }
    if (!force && !shouldCheck({ packaged: true, online: true, now, lastCheckAt, everyMs })) {
      return { checked: false, reason: "recent" };
    }
    const hadDownload = downloaded;
    lastCheckAt = now;
    phase = "checking";
    detail = "";
    touch();
    try {
      await updater.checkForUpdates();
      if (phase === "checking") {
        phase = hadDownload ? "ready" : "uptodate";
        touch();
      }
      return { checked: true };
    } catch {
      if (hadDownload) phase = "ready";
      else {
        phase = "error";
        if (!detail) detail = "Could not reach GitHub";
      }
      touch();
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

  function status() { return snapshot(); }

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
