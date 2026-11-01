// Plain text for the About section. No network and no Electron.
const VERSION = /^[0-9A-Za-z.+-]{1,40}$/;

function showVersion(value) {
  const s = String(value || "").trim();
  return VERSION.test(s) ? s : "";
}

function formatBuiltAt(iso) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const d = new Date(t);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function validCommit(value) {
  const s = String(value || "").trim().toLowerCase();
  return /^[0-9a-f]{7,40}$/.test(s) ? s.slice(0, 7) : null;
}

/** What About shows under the version. A missing stamp is a development build. */
function buildLabel(info) {
  const commit = validCommit(info && info.commit);
  const when = formatBuiltAt(info && info.builtAt);
  if (commit && when) return `${commit} · ${when}`;
  if (commit) return commit;
  return "Development build";
}

/** One line for the updater. Wording stays stable so the UI and tests share it. */
function updateLabel(state) {
  const phase = state && state.phase;
  if (phase === "ready" && state.ready) return "Update ready, restart to install";
  if (phase === "ready") return "Update ready. It installs after this session.";
  if (phase === "downloading") {
    const n = state.percent;
    return Number.isFinite(n) ? `Downloading ${n}%` : "Downloading";
  }
  if (phase === "checking") return "Checking";
  if (phase === "uptodate") return "Up to date";
  if (phase === "offline") return "Offline";
  if (phase === "error") return "Error";
  if (phase === "dev") return "Not checked in a development build";
  return "Not checked yet";
}

/** A short error for the screen. Tokens, secrets, and URLs never pass through. */
function safeDetail(err) {
  const msg = String((err && (err.message || err)) || "");
  if (!msg || /token|authorization|bearer|ghp_|github_pat_|private[_-]?key|secret/i.test(msg)) return "Could not reach GitHub";
  if (/ENOTFOUND|ETIMEDOUT|ECONN|EAI_AGAIN|offline|network|getaddrinfo|ERR_|timed?\s*out|timeout/i.test(msg)) return "Could not reach GitHub";
  const clean = msg.replace(/https?:\/\/\S+/gi, "").replace(/\s+/g, " ").trim();
  if (!clean) return "Could not reach GitHub";
  return clean.slice(0, 140);
}

function presentAbout(state, about) {
  const src = state || {};
  const info = about || {};
  const phase = src.phase || "idle";
  const percent = Number.isFinite(src.percent) ? src.percent : null;
  const view = {
    ready: !!src.ready,
    version: showVersion(src.version),
    phase,
    percent,
    available: showVersion(src.available),
    lastCheckedAt: src.lastCheckedAt || null,
    detail: phase === "error" ? (src.detail || "Could not reach GitHub") : "",
    appVersion: showVersion(info.appVersion),
    commit: validCommit(info.commit),
    builtAt: formatBuiltAt(info.builtAt) ? info.builtAt : null,
  };
  view.label = updateLabel(view);
  view.buildLabel = buildLabel(info);
  return view;
}

module.exports = {
  showVersion, formatBuiltAt, validCommit, buildLabel, updateLabel, safeDetail, presentAbout,
};
