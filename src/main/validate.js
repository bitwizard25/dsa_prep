// Checks on data the renderer sends over IPC. Reject the wrong shape before it is stored or acted on.
const MAX_JSON = 1_500_000;
const SLUG = /^[a-z0-9-]{1,120}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

const isObj = (v) => !!v && typeof v === "object" && !Array.isArray(v);
function sizeOk(v) {
  const json = JSON.stringify(v);
  if (json === undefined || json.length > MAX_JSON) throw new Error("Payload too large");
  return v;
}

const STATE_KEYS = new Set(["version", "profile", "progress", "log", "pomo", "timer", "askEnergy", "focusBlock", "ui", "tomorrow"]);
const HUB_KEYS = new Set(["version", "goal", "dsaSetup", "createdAt", "progress", "settings"]);

function knownKeys(v, allowed) {
  if (!isObj(v)) throw new Error("Expected an object");
  for (const k of Object.keys(v)) if (!allowed.has(k)) throw new Error("Unexpected field");
  return sizeOk(v);
}

function statePayload(v) {
  const s = knownKeys(v, STATE_KEYS);
  if (s.version !== undefined && typeof s.version !== "number") throw new Error("Invalid version");
  return s;
}
function hubPayload(v) {
  const s = knownKeys(v, HUB_KEYS);
  if (s.version !== undefined && s.version !== 1) throw new Error("Invalid version");
  return s;
}
function layoutPayload(v) {
  const o = v && typeof v === "object" ? v : {};
  const mode = o.mode === "workspace" ? "workspace" : "onboarding";
  const width = Number(o.width);
  const collapsed = !!o.collapsed;
  if (!Number.isFinite(width)) throw new Error("Invalid width");
  return { mode, width: Math.max(200, Math.min(800, width)), collapsed };
}
function slugPayload(v) {
  if (typeof v !== "string" || !SLUG.test(v)) throw new Error("Invalid problem");
  return v;
}
function viewPayload(v) {
  if (typeof v === "string") return v === "practice" ? { view: "practice" } : { view: "hub" };
  if (!isObj(v)) throw new Error("Invalid view");
  const view = v.view === "practice" ? "practice" : "hub";
  const route = v.route === undefined || v.route === null ? undefined : String(v.route);
  if (route && (route.length > 40 || !/^[a-z0-9-]+$/.test(route))) throw new Error("Invalid route");
  return route ? { view, route } : { view };
}
function remindersPayload(v) {
  if (!Array.isArray(v) || v.length > 40) throw new Error("Invalid reminders");
  return v.map((it) => {
    if (!isObj(it)) throw new Error("Invalid reminder");
    const start = Number(it.start), end = Number(it.end);
    if (!Number.isFinite(start) || !Number.isFinite(end)) throw new Error("Invalid reminder time");
    return {
      id: String(it.id || "").slice(0, 80),
      title: String(it.title || "").slice(0, 80),
      topic: String(it.topic || "").slice(0, 200),
      start, end,
      next: it.next == null ? null : String(it.next).slice(0, 120),
    };
  });
}
function boolPayload(v) { return !!v; }

module.exports = { statePayload, hubPayload, layoutPayload, slugPayload, viewPayload, remindersPayload, boolPayload, DAY, MAX_JSON };
