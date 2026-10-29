// App state: one object, saved to disk through the main process. Includes migration from v0.x.
import { todayKey } from "./dates.js";
import { BY_NUM } from "./problems.js";

export const freshProfile = () => DEFAULT().profile;
const DEFAULT = () => ({
  version: 2,
  profile: { onboarded: false, dataVersion: 0, source: null, sources: [], custom: [], patterns: [], perPattern: 30, premium: false, completed: [], hoursPerDay: 3, daysPerWeek: 6, startDate: todayKey(), queue: [], planMode: "hours", targetDate: "" },
  progress: { status: {}, when: {}, redo: {}, attempts: {}, solutionSeen: {} },   // redo: slug -> { due, stage } (spaced repetition)   // status keyed by problem slug: "a" (alone) | "h" (help)   // solutionSeen: slug -> time the solution was opened on the current try
  log: {},                              // per day: { pomos, energy[], note }
  pomo: { work: 45, brk: 10 },
  timer: null,
  askEnergy: false,
  focusBlock: true,
  ui: { width: 380, collapsed: false },
  tomorrow: { time: "", place: "" },
});

let saveT;
export const store = {
  S: DEFAULT(),
  async load() {
    const raw = await window.api.loadState();
    this.S = migrate(raw);
    this.S.progress.attempts ||= {};
    this.S.progress.solutionSeen ||= {};
    if (!this.S.timer) this.S.timer = { mode: "work", left: this.S.pomo.work * 60, running: false, endsAt: 0 };
    return this.S;
  },
  save() { clearTimeout(saveT); saveT = setTimeout(() => window.api.saveState(this.S), 250); },
  saveNow() { clearTimeout(saveT); return window.api.saveState(this.S); },
  reset() { this.S = DEFAULT(); this.S.timer = { mode: "work", left: this.S.pomo.work * 60, running: false, endsAt: 0 }; this.saveNow(); },
};

function migrate(raw) {
  const S = DEFAULT();
  if (!raw) return S;
  if (raw.version === 2) {
    const m = deepMerge(S, raw);
    if (!m.profile.sources.length && m.profile.source) m.profile.sources = [m.profile.source];   // single-company plans from 1.1
    return m;
  }
  // v0.x: status was keyed by problem number. Keep progress, streak and settings; ask for a new plan.
  for (const [n, st] of Object.entries(raw.status || {})) {
    const p = BY_NUM.get(n);
    if (p) { S.progress.status[p.slug] = st; if (raw.when && raw.when[n]) S.progress.when[p.slug] = raw.when[n]; }
  }
  for (const k of ["log", "pomo", "timer", "askEnergy", "focusBlock", "ui"]) if (raw[k] !== undefined) S[k] = raw[k];
  if (raw.plan) S.tomorrow = raw.plan;
  return S;
}

function deepMerge(base, over) {
  for (const [k, v] of Object.entries(over || {})) {
    if (v && typeof v === "object" && !Array.isArray(v) && base[k] && typeof base[k] === "object" && !Array.isArray(base[k])) deepMerge(base[k], v);
    else base[k] = v;
  }
  return base;
}
