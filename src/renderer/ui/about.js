// About block for the practice settings tab. The strings come from the main process.
import { esc } from "./components.js";

export function formatChecked(ms) {
  if (!ms) return "not yet";
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "not yet";
  return d.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** Inner HTML for #about. Every value is escaped. */
export function aboutInner(a) {
  if (!a) {
    return `<p class="muted">Version will appear when the app is ready.</p>
      <button class="btn sm" data-act="check-updates">Check for updates</button>`;
  }
  const ver = a.appVersion ? esc(a.appVersion) : "—";
  const avail = a.available && (a.phase === "downloading" || a.phase === "ready")
    ? `<p class="muted">Available ${esc(a.available)}</p>` : "";
  const detail = a.phase === "error" && a.detail ? `<p class="muted">${esc(a.detail)}</p>` : "";
  const restart = a.phase === "ready" && a.ready
    ? `<button class="btn primary sm" data-act="install-update">Restart now</button>` : "";
  return `<p>Version <b>${ver}</b></p>
    <p class="muted">${esc(a.buildLabel || "Development build")}</p>
    <p class="about-state" role="status">${esc(a.label || "Not checked yet")}</p>
    ${avail}${detail}
    <p class="muted">Last checked ${esc(formatChecked(a.lastCheckedAt))}</p>
    <div class="setbtns">${restart}<button class="btn sm" data-act="check-updates"${a.phase === "checking" ? " disabled" : ""}>Check for updates</button></div>`;
}
