// Turns recorded activity into topic mastery, subject readiness, pace and today's recommendation.
import { SUBJECT, type SubjectId } from "./catalog";
import { timetable, todayKey, instantKey, istMinutes, fmt, parse, addDays, type Plan, type Session, type SubjectAlloc } from "./planner";
import { dsaMastery, type DsaSummary } from "./practice-bridge";
import type { HubState } from "../store";

const RATING = [0, 0.4, 0.7, 1];   // self-rating after a session: 1 shaky, 2 okay, 3 solid

/** Latest quiz score for a topic, 0 to 1, or null if never taken. */
export function latestQuiz(hub: HubState, topicId: string): number | null {
  const r = hub.progress.quiz?.[topicId];
  return r && r.length ? r[r.length - 1].score / r[r.length - 1].total : null;
}
/** Days with any real study: a finished Hub session, or practice activity read from the practice app. */
export function activeDays(hub: HubState, dsa?: DsaSummary): Set<string> {
  const days = new Set<string>(dsa?.activeDays || []);
  for (const [id, r] of Object.entries(hub.progress.sessions)) if (r.status === "done") days.add(id.split("#")[0]);
  for (const list of Object.values(hub.progress.quiz || {})) for (const q of list) days.add(q.date);
  return days;
}
export function streakOf(days: Set<string>, now = new Date()) {
  const shift = (key: string, n: number) => fmt(addDays(parse(key), n));
  let key = todayKey(now);
  if (!days.has(key)) key = shift(key, -1);
  let n = 0;
  while (days.has(key) && n < 10000) { n++; key = shift(key, -1); }
  return n;
}

export function topicMastery(hub: HubState, plan: Plan, s: SubjectAlloc, topicId: string, dsa?: DsaSummary): number {
  if (s.id === "dsa" && dsa) {
    const name = s.topics.find((t) => t.id === topicId)?.name;
    const m = dsaMastery(name ? dsa.patterns[name] : undefined);
    if (m !== null) return m;
  }
  const p = hub.progress.topics[topicId] || { minutes: 0, ratings: [] };
  const allotted = s.allotted[topicId] || 60;
  const completion = p.done ? 1 : Math.min(1, p.minutes / allotted);
  const quiz = latestQuiz(hub, topicId);
  if (quiz !== null) return completion * 0.4 + quiz * 0.6;     // a real answer beats a self-rating
  if (!p.minutes && !p.done) return 0;
  const rated = p.ratings.length ? p.ratings.reduce((a, r) => a + RATING[r], 0) / p.ratings.length : null;
  return rated === null ? completion * 0.6 : completion * 0.6 + rated * 0.4;
}

export const isTopicDone = (hub: HubState, plan: Plan, s: SubjectAlloc, topicId: string, dsa?: DsaSummary) =>
  !!hub.progress.topics[topicId]?.done || (hub.progress.topics[topicId]?.minutes || 0) >= (s.allotted[topicId] || Infinity) || topicMastery(hub, plan, s, topicId, dsa) >= 0.8;

/** The topic to work on now: the first one in order that isn't done. */
export function currentTopic(hub: HubState, plan: Plan, subject: SubjectId, dsa?: DsaSummary) {
  const s = plan.subjects.find((x) => x.id === subject);
  if (!s) return null;
  return s.topics.find((t) => !isTopicDone(hub, plan, s, t.id, dsa)) || null;
}

export function subjectReadiness(hub: HubState, plan: Plan, s: SubjectAlloc, dsa?: DsaSummary) {
  const total = s.topics.reduce((a, t) => a + t.hours, 0) || 1;
  return s.topics.reduce((a, t) => a + t.hours * topicMastery(hub, plan, s, t.id, dsa), 0) / total;
}
export function overallReadiness(hub: HubState, plan: Plan, dsa?: DsaSummary) {
  const w = plan.subjects.reduce((a, s) => a + s.share, 0) || 1;
  return plan.subjects.reduce((a, s) => a + s.share * subjectReadiness(hub, plan, s, dsa), 0) / w;
}

/** Days ahead (+) or behind (−) per subject: planned minutes before today vs minutes actually done. */
export function pace(hub: HubState, plan: Plan) {
  const t = todayKey();
  const out: Record<string, number> = {};
  for (const s of plan.subjects) {
    let planned = 0, done = 0;
    for (const day of plan.days) for (const x of day) if (x.subject === s.id && x.date < t) planned += x.minutes;
    for (const [id, r] of Object.entries(hub.progress.sessions)) if (id.endsWith(`#${s.id}`) && r.status === "done") done += r.minutes;
    out[s.id] = s.avgMin ? Math.round((done - planned) / s.avgMin) : 0;
  }
  return out;
}

export type TodayItem = Session & {
  startMin: number; endMin: number;
  state: "done" | "active" | "current" | "late" | "upcoming" | "must";
  locked?: boolean;      // today's session waiting behind must-do work
  fromDate?: string;     // for must-do: the day it was planned
};

// The practice app is the truth for DSA: the App sets this whenever it reads the practice data.
let DSA: DsaSummary | undefined;
export const setDsaTruth = (d: DsaSummary | undefined) => { DSA = d; };

/** A session is finished when recorded as done; a DSA session when the practice app's problems for it are all marked. */
export function finished(hub: HubState, id: string) {
  if (id.endsWith("#dsa") && DSA?.hasPlan) {
    const date = id.split("#")[0], t = todayKey();
    if (date < t) return !(DSA.leftByDate && DSA.leftByDate[date] > 0);   // this day only, not every past day
    if (date === t && DSA.todayTotal > 0) return DSA.todayLeft === 0;   // today: every problem of today marked
    if (date > t) return false;
    // No problems scheduled today (interview mode, or the queue is finished): the session's own record decides.
  }
  return hub.progress.sessions[id]?.status === "done";
}

/**
 * Must do first: sessions from earlier study days that were never completed, oldest first.
 * Capped at one day's worth unless the user turned the cap off; the rest wait for the next days.
 */
export function mustDo(hub: HubState, plan: Plan) {
  const t = todayKey();
  const since = instantKey(hub.createdAt) || plan.goal.startDate;   // Kolkata day the plan was created, not the UTC date of the timestamp
  const open = plan.days.flat().filter((s) => s.date < t && s.date >= since && !finished(hub, s.id));
  if (hub.settings.mustDoAll) return { items: open, waiting: 0 };
  const items: Session[] = [];
  let used = 0;
  for (const s of open) { if (items.length && used + s.minutes > plan.dailyMin) break; items.push(s); used += s.minutes; }
  return { items, waiting: open.length - items.length };
}

export function practiceLocked(hub: HubState, plan: Plan) {
  return today(hub, plan).some((i) => i.subject === "dsa" && i.locked);
}

export function today(hub: HubState, plan: Plan, now = new Date()): TodayItem[] {
  const mins = istMinutes(now);
  const [h, m] = plan.goal.startTime.split(":").map(Number);
  const must = mustDo(hub, plan).items;
  // Must-do work goes first, at the day's start time; today's sessions shift later by the same amount.
  let clock = h * 60 + m;
  const mustItems: TodayItem[] = must.map((s) => {
    const it: TodayItem = { ...s, startMin: clock, endMin: clock + s.minutes, fromDate: s.date, state: hub.progress.sessions[s.id]?.status === "active" ? "active" : "must" };
    clock += s.minutes + plan.goal.breakMin;
    return it;
  });
  const shift = clock - (h * 60 + m);
  const locked = must.length > 0;
  const rest: TodayItem[] = timetable(plan, todayKey()).map((s) => {
    const rec = hub.progress.sessions[s.id];
    const startMin = s.startMin + shift, endMin = s.endMin + shift;
    const state: TodayItem["state"] = finished(hub, s.id) ? "done" : rec?.status === "active" ? "active"
      : mins >= endMin ? "late" : mins >= startMin ? "current" : "upcoming";
    return { ...s, startMin, endMin, state, locked: locked && state !== "done" && state !== "active" };
  });
  return [...mustItems, ...rest];
}

/** One clear next action: anything in progress, then must-do work, then now, next, and what's still open today. */
export function recommend(items: TodayItem[]) {
  return items.find((i) => i.state === "active") || items.find((i) => i.state === "must")
    || items.find((i) => i.state === "current") || items.find((i) => i.state === "upcoming") || items.find((i) => i.state === "late") || null;
}

export function sessionLabel(hub: HubState, plan: Plan, s: Session, dsa?: DsaSummary) {
  const d = dsa || DSA;
  if (s.subject === "dsa" && d?.hasPlan && s.kind !== "interview") {
    if (s.date < todayKey()) { const n = d.leftByDate?.[s.date] || 0; return `${n} leftover problem${n === 1 ? "" : "s"}`; }
    if (d.todayTotal) {
      const shown = d.todayTitles.slice(0, 2).join(", ");
      return `${d.todayPatterns.join(" + ")}: ${shown}${d.todayTotal > 2 ? `, +${d.todayTotal - 2} more` : ""}`;
    }
  }
  if (s.kind === "interview") return s.subject === "dsa" ? "Timed problems and mixed review" : s.subject === "sd" || s.subject === "lld" ? "Mock round and revision" : "Revision of weak topics";
  const t = currentTopic(hub, plan, s.subject, dsa);
  return t ? t.name : "Revision and practice";
}
export const subjectName = (id: SubjectId) => SUBJECT[id].short;
