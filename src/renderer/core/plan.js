// The schedule engine. Pure functions: same inputs always give the same plan.
import { parse, addDays, fmt, diffDays, isValidDay } from "./dates.js";

/** Minutes per problem, including reading, attempting and a short review. */
export const COST = { E: 20, M: 40, H: 60 };
const cost = (p) => COST[p.d] || 40;

export function isStudyDay(date, daysPerWeek) {
  const w = date.getDay();               // 0 = Sunday
  if (daysPerWeek >= 7) return true;
  if (daysPerWeek === 6) return w !== 0;
  return w !== 0 && w !== 6;
}
const nextStudyDay = (date, dpw) => {
  let d = date, n = 0;
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null;
  while (!isStudyDay(d, dpw)) { if (++n > 14) return null; d = addDays(d, 1); }
  return d;
};

/**
 * Pack the queue into days. Each day holds as many problems as fit in hoursPerDay.
 * A day always gets at least one problem, even if it is longer than the budget.
 */
/** Everything schedule() reads: settings, start date, and each problem's identity and difficulty. */
export function scheduleCacheKey(profile, queue) {
  const p = profile || {};
  const items = (queue || []).map((x) => `${x.slug || x.n || ""}:${x.d || ""}`).join(",");
  return [p.hoursPerDay, p.daysPerWeek, p.startDate, p.problemsPerDay || 0, items].join("|");
}

/** A usable daily count, or 0 for time-based packing. Bad values never throw. */
export function problemCount(n) {
  if (n == null || n === false || n === "") return 0;
  const x = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(x) || x < 1) return 0;
  return Math.min(100, Math.floor(x));
}

export function schedule(queue, { hoursPerDay, daysPerWeek, startDate, problemsPerDay }) {
  const perDay = problemCount(problemsPerDay);
  const cap = Math.max(20, (Number(hoursPerDay) > 0 ? Number(hoursPerDay) : 1) * 60);
  const days = [];
  if (!queue.length || !isValidDay(startDate)) return days;
  // Plans set up from the Hub carry a problem count chosen by the user: exactly that many a day.
  if (perDay > 0) {
    let date = nextStudyDay(parse(startDate), daysPerWeek);
    for (let i = 0; i < queue.length; i += perDay) {
      const items = queue.slice(i, i + perDay);
      days.push({ date: fmt(date), items, minutes: items.reduce((s, p) => s + cost(p), 0) });
      date = nextStudyDay(addDays(date, 1), daysPerWeek);
    }
    return days;
  }
  let date = nextStudyDay(parse(startDate), daysPerWeek);
  let cur = { date: fmt(date), items: [], minutes: 0 };
  days.push(cur);
  for (const p of queue) {
    if (cur.items.length && cur.minutes + cost(p) > cap) {
      date = nextStudyDay(addDays(date, 1), daysPerWeek);
      cur = { date: fmt(date), items: [], minutes: 0 };
      days.push(cur);
    }
    cur.items.push(p);
    cur.minutes += cost(p);
  }
  return days;
}

export const totalMinutes = (queue) => queue.reduce((s, p) => s + cost(p), 0);

export function countStudyDays(startDate, endDate, daysPerWeek) {
  let n = 0;
  for (let d = parse(startDate); diffDays(d, parse(endDate)) <= 0; d = addDays(d, 1)) if (isStudyDay(d, daysPerWeek)) n++;
  return n;
}

/** Hours per day needed to finish by endDate, rounded up to the next half hour. */
export function hoursNeeded(queue, startDate, endDate, daysPerWeek) {
  const days = countStudyDays(startDate, endDate, daysPerWeek);
  if (days <= 0) return null;
  // An average alone underestimates the budget when whole problems do not fit.
  // Find the smallest half-hour budget that the actual packing engine can use.
  let low = Math.max(1, Math.ceil(totalMinutes(queue) / days / 30));
  let high = Math.max(low, Math.ceil(totalMinutes(queue) / 30));
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (schedule(queue, { hoursPerDay: mid / 2, daysPerWeek, startDate }).length <= days) high = mid;
    else low = mid + 1;
  }
  return low / 2;
}

/** Summary numbers for the plan screen. */
export function summarize(queue, cfg) {
  const days = schedule(queue, cfg);
  const mins = totalMinutes(queue);
  return {
    problems: queue.length,
    hours: Math.round(mins / 6) / 10,
    days: days.length,
    perDay: days.length ? Math.round((queue.length / days.length) * 10) / 10 : 0,
    finish: days.length ? days[days.length - 1].date : cfg.startDate,
    mix: { E: queue.filter((p) => p.d === "E").length, M: queue.filter((p) => p.d === "M").length, H: queue.filter((p) => p.d === "H").length },
  };
}
