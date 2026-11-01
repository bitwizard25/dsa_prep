// Practice logic: today's list, leftovers, next problem, marking, streaks, energy.
import * as R from "./reasoning.js";
import { store } from "./state.js";
import { BY_SLUG } from "./problems.js";
import { schedule, scheduleCacheKey } from "./plan.js";
import { parse, fmt, addDays, diffDays, todayKey } from "./dates.js";

const S = () => store.S;
let cache = { key: "", days: [] };

/** The queue saved with the plan, as problem objects. */
export function queue() {
  const custom = new Map((S().profile.custom || []).map((p) => [p.slug, p]));
  return S().profile.queue.map((slug) => BY_SLUG.get(slug) || custom.get(slug)).filter(Boolean);
}

export function days() {
  const p = S().profile;
  const q = queue();
  const key = scheduleCacheKey(p, q);
  if (cache.key !== key) cache = { key, days: schedule(q, p) };
  return cache.days;
}

export const status = (slug) => S().progress.status[slug] || "";
export const isDone = (slug) => !!status(slug);

export function dayIndexFor(date) {
  const k = fmt(date), ds = days();
  const i = ds.findIndex((d) => d.date === k);
  return i;
}

/** Index of today's plan day, or the last plan day before today. -1 if the plan hasn't started. */
export function currentDayIndex() {
  const ds = days(), t = todayKey();
  let idx = -1;
  ds.forEach((d, i) => { if (d.date <= t) idx = i; });
  return idx;
}

export function leftovers() {
  const t = todayKey();
  return days().filter((d) => d.date < t).flatMap((d) => d.items).filter((p) => !isDone(p.slug));
}

export const redoList = () => redoAll();

export function nextUnsolved(currentSlug) {
  const t = todayKey();
  let c = days().filter((d) => d.date <= t).flatMap((d) => d.items).filter((p) => !isDone(p.slug));
  if (!c.length) c = redoDue();                                                       // then redos that are due
  if (!c.length) c = (days().find((d) => d.date > t) || { items: [] }).items.filter((p) => !isDone(p.slug));
  if (!c.length) return null;
  const i = c.findIndex((p) => p.slug === currentSlug);
  return i >= 0 ? c[(i + 1) % c.length] : c[0];
}

// ----- marking + spaced redo -----
// A problem solved with help comes back from a blank editor after 3, 10 and 30 days.
const REDO_GAPS = [3, 10, 30];
const redos = () => S().progress.redo || (S().progress.redo = {});
const dueIn = (days) => fmt(addDays(parse(todayKey()), days));
function stageOf(r) {
  const n = Number(r && r.stage);
  return Number.isInteger(n) && n >= 0 ? Math.min(n, REDO_GAPS.length - 1) : 0;
}

function apply(slug, st) {
  const pr = S().progress;
  pr.status[slug] = st; pr.when[slug] = todayKey();
  if (st === "h") {
    const prev = redos()[slug];
    if (!prev) redos()[slug] = { due: dueIn(REDO_GAPS[0]), stage: 0 };
    else prev.stage = stageOf(prev);
  } else delete redos()[slug];
}
export function mark(slug, st) {
  const pr = S().progress;
  if (pr.status[slug] === st) { delete pr.status[slug]; delete pr.when[slug]; }
  else apply(slug, st);
  store.save();
}
export function setMark(slug, st) { apply(slug, st); store.save(); }

/** Result of a redo attempt: solved alone moves it to the next gap (done after the last); stuck restarts the cycle. */
export function redoResult(slug, ok) {
  const r = redos()[slug];
  if (!r) return;
  const stage = stageOf(r);
  if (ok) {
    if (stage >= REDO_GAPS.length - 1) delete redos()[slug];
    else { r.stage = stage + 1; r.due = dueIn(REDO_GAPS[stage + 1]); }
  } else { r.stage = 0; r.due = dueIn(REDO_GAPS[0]); }
  store.save();
}

/** Toast after the Accepted card, matching what the redo schedule actually did. */
export function acceptToast(st, wasDue, redoRemains) {
  if (st === "a" && wasDue && redoRemains) return "Marked as solved alone. The next redo is further out.";
  if (st === "a" && wasDue) return "Marked as solved alone. That was the last redo.";
  if (st === "a") return "Marked as solved alone.";
  return "Marked as needed help. It comes back in 3 days.";
}

/**
 * Result from the Accepted card.
 * A redo that is due keeps its schedule. Solved alone also changes Help ('h') to Alone ('a')
 * so the Hub can count a verified solve. Needed help leaves the Help mark in place.
 * A problem that is not on a due redo is marked the usual way.
 */
export function acceptResult(slug, st) {
  const entry = redos()[slug];
  const due = !!(entry && entry.due <= todayKey());
  if (due) {
    const pr = S().progress;
    if (st === "a") {
      pr.status[slug] = "a";
      pr.when[slug] = todayKey();
    } else if (st === "h") {
      pr.status[slug] = "h";
    }
    redoResult(slug, st === "a");
    return;
  }
  setMark(slug, st);
}
export const problemOf = (slug) => BY_SLUG.get(slug) || (S().profile.custom || []).find((p) => p.slug === slug);
export const redoDue = () => Object.entries(redos()).filter(([, r]) => r.due <= todayKey()).map(([slug, r]) => ({ ...problemOf(slug), redo: r })).filter((p) => p.slug);
export const redoAll = () => Object.entries(redos()).sort((a, b) => (a[1].due < b[1].due ? -1 : 1)).map(([slug, r]) => ({ ...problemOf(slug), redo: r })).filter((p) => p.slug);
export const REDO_STAGES = REDO_GAPS.length;

// ----- re-plan: unsolved problems move forward from today; solved ones are kept as completed -----
export function replan() {
  const p = S().profile, q = queue();
  p.completed = [...new Set([...(p.completed || []), ...q.filter((x) => isDone(x.slug)).map((x) => x.slug)])];
  p.queue = q.filter((x) => !isDone(x.slug)).map((x) => x.slug);
  p.startDate = todayKey();
  store.save();
}
/** Everything in the plan, including problems completed before a re-plan. */
export const planned = () => [...(S().profile.completed || []).map(problemOf).filter(Boolean), ...queue()];

// ----- habits -----
export const dayLog = (k = todayKey()) => S().log[k] || (S().log[k] = { pomos: 0, energy: [], note: "" });
export const doneOn = (k) => Object.values(S().progress.when).filter((v) => v === k).length;
// Study days from the Hub (finished sessions, quizzes), so both screens share one streak.
let hubDays = new Set();
export const setHubDays = (days) => { hubDays = new Set(days || []); };
const active = (k) => doneOn(k) > 0 || ((S().log[k] || {}).pomos || 0) > 0 || hubDays.has(k);
const dayShift = (key, n) => fmt(addDays(parse(key), n));
export function streak() {
  let key = todayKey();
  if (!active(key)) key = dayShift(key, -1);
  let c = 0;
  while (active(key) && c < 10000) { c++; key = dayShift(key, -1); }
  return c;
}
export const missedYesterday = () => {
  const any = Object.keys(S().progress.when).length > 0 || Object.keys(S().log).some(active);
  return any && !active(dayShift(todayKey(), -1)) && !active(todayKey());
};
export function energy() {
  const e = dayLog().energy;
  return {
    avg: e.length ? (e.reduce((a, b) => a + b, 0) / e.length).toFixed(1) : "–",
    lowTwice: e.length >= 2 && e[e.length - 1] <= 2 && e[e.length - 2] <= 2,
  };
}

export function stats() {
  const q = planned(), ds = days(), t = todayKey();
  const a = q.filter((p) => status(p.slug) === "a").length, h = q.filter((p) => status(p.slug) === "h").length;
  const behind = leftovers().length;                                                    // unsolved from past days
  const ahead = ds.filter((d) => d.date > t).flatMap((d) => d.items).filter((p) => isDone(p.slug)).length;
  const today = ds.find((d) => d.date === t);
  return {
    total: q.length, alone: a, help: h, done: a + h, behind, ahead,
    pace: behind ? -behind : ahead,
    todayDone: today ? today.items.filter((p) => isDone(p.slug)).length : 0,
    todayTotal: today ? today.items.length : 0,
    finish: ds.length ? ds[ds.length - 1].date : null,
  };
}

export { parse, diffDays };

export function recordAttempt(slug, rec) { R.recordAttempt(S().progress, slug, rec); store.save(); }
export function lastInsight(slug) { const list = S().progress.attempts?.[slug] || []; for (let i = list.length - 1; i >= 0; i--) if (list[i].explain?.insight) return list[i].explain.insight; return ""; }
