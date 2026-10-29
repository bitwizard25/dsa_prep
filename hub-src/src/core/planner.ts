// The planning engine. Pure functions: the same goal always produces the same plan.
import { SUBJECTS, SUBJECT, ROLES, COMPANIES, LEVELS, type SubjectId, type Level, type Topic } from "./catalog";

// ---------- dates ("YYYY-MM-DD", Asia/Kolkata) ----------
// Calendar arithmetic uses the day string. "Today" and instants are read in IST, not the OS timezone.
const IST = "Asia/Kolkata";
export const parse = (s: string) => { const [y, m, d] = String(s || "").split("-").map(Number); return new Date(y, m - 1, d); };
export const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export function istParts(now: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: IST, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const num = (type: string) => Number(parts.find((p) => p.type === type)?.value || "0");
  let hour = num("hour");
  if (hour === 24) hour = 0;
  return { year: num("year"), month: num("month"), day: num("day"), hour, minute: num("minute") };
}
export const todayKey = (now: Date = new Date()) => { const p = istParts(now); return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`; };
export function instantKey(value?: string | Date | null): string {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? "" : todayKey(d);
}
export const istMinutes = (now: Date = new Date()) => { const p = istParts(now); return p.hour * 60 + p.minute; };
/** UTC milliseconds for midnight at the start of today's Kolkata date. */
export function istMidnightMs(now: Date = new Date()) {
  const [y, m, d] = todayKey(now).split("-").map(Number);
  return Date.UTC(y, m - 1, d) - (5 * 60 + 30) * 60 * 1000;
}
export function isValidDay(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(parse(s).getTime()) && fmt(parse(s)) === s;
}
export const daysBetween = (a: string, b: string) => Math.round((parse(b).getTime() - parse(a).getTime()) / 864e5);
export const isStudyDay = (d: Date, perWeek: number) => (perWeek >= 7 ? true : perWeek === 6 ? d.getDay() !== 0 : d.getDay() !== 0 && d.getDay() !== 6);

// ---------- types ----------
export interface Goal {
  role: string;
  company: string;
  level: Level;
  hoursPerDay: number;
  daysPerWeek: 5 | 6 | 7;
  startDate: string;
  targetDate: string;
  startTime: string;        // "09:00": when the first session of the day starts
  breakMin: number;         // break between sessions
  problemsPerDay?: number;  // DSA problems a day, chosen by the user; DSA time follows from it
  weights?: Partial<Record<SubjectId, number>>;   // "Customize plan" overrides
  skip?: SubjectId[];       // subjects left out on purpose
}

export interface SubjectAlloc {
  id: SubjectId;
  weight: number; adjust: number; need: number; priority: number; share: number;
  avgMin: number;           // average minutes a study day
  dailyMin: number;         // fixed daily block (0 if it rotates)
  rotating: boolean;
  topics: Topic[];          // topics included at the role's depth
  neededMin: number; budgetMin: number; coverage: number;
  allotted: Record<string, number>;   // topic id -> planned minutes
}

export interface Session {
  id: string;               // `${date}#${subject}`
  date: string;
  subject: SubjectId;
  minutes: number;
  topicId: string | null;   // planned topic (null = revision / interview practice)
  kind: "learn" | "practice" | "interview";
}

export interface Phase { id: string; name: string; start: string; end: string; summary: string; topics: { subject: SubjectId; topic: Topic }[] }
export interface Milestone { id: string; date: string; name: string; subject?: SubjectId }

export interface Plan {
  goal: Goal;
  dailyMin: number;
  subjects: SubjectAlloc[];
  rotatingMin: number;
  days: Session[][];        // one entry per study day
  studyDays: number;
  interviewStart: string | null;
  phases: Phase[];
  milestones: Milestone[];
  topicDates: Record<string, { start: string; end: string }>;
  why: string[];
  warnings: string[];
  dropped: { subject: SubjectId; topics: Topic[] }[];
}

const round15 = (m: number) => Math.max(15, Math.round(m / 15) * 15);

/** Average minutes per DSA problem at the practice app's mix (25% Easy 20 min, 55% Medium 40, 20% Hard 60). */
export const MIN_PER_PROBLEM = 0.25 * 20 + 0.55 * 40 + 0.2 * 60;   // 39
export const dsaMinutesFor = (problems: number) => round15(problems * MIN_PER_PROBLEM);
/** Minutes the other subjects need at the very least, so a day is never DSA-only by accident. */
export const MIN_OTHERS = 60;

/** All study dates from start to target (inclusive). */
export function studyDates(goal: Goal): string[] {
  if (!isValidDay(goal.startDate) || !isValidDay(goal.targetDate) || goal.startDate > goal.targetDate) return [];
  const out: string[] = [];
  let guard = 0;
  for (let d = parse(goal.startDate); fmt(d) <= goal.targetDate; d = addDays(d, 1)) {
    if (++guard > 20000) break;
    if (Number.isNaN(d.getTime())) break;
    if (isStudyDay(d, goal.daysPerWeek)) out.push(fmt(d));
  }
  return out;
}

/**
 * Allocation: priority = role weight × company adjustment × (0.5 + need), need = 1 − mastery.
 * Subjects with at least 10% of the time get a fixed daily block; smaller ones share a rotating slot.
 */
export function allocate(goal: Goal, mastery: Partial<Record<SubjectId, number>> = {}): { subjects: SubjectAlloc[]; rotatingMin: number; dailyMin: number } {
  const role = ROLES.find((r) => r.id === goal.role) || ROLES[0];
  const company = COMPANIES.find((c) => c.id === goal.company) || COMPANIES[COMPANIES.length - 1];
  const base = LEVELS.find((l) => l.id === goal.level)?.mastery ?? 0.35;
  const allIds = SUBJECTS.map((s) => s.id).filter((id) => !(goal.skip || []).includes(id));
  const fullDay = Math.round(goal.hoursPerDay * 60);
  const dsaFixed = goal.problemsPerDay && allIds.includes("dsa") ? Math.min(fullDay, dsaMinutesFor(goal.problemsPerDay)) : 0;
  const ids = dsaFixed ? allIds.filter((id) => id !== "dsa") : allIds;
  const dailyMin = fullDay - dsaFixed;   // minutes the shared allocation below works with

  const rows = ids.map((id) => {
    const weight = goal.weights?.[id] ?? role.weights[id];
    const adjust = company.adjust[id] ?? 1;
    const need = 1 - (mastery[id] ?? base);
    return { id, weight, adjust, need, priority: weight * adjust * (0.5 + need) };
  });
  const total = rows.reduce((s, r) => s + r.priority, 0) || 1;

  const withShare = rows.map((r) => ({ ...r, share: r.priority / total }));
  // Own daily block only if it's at least 10% of the whole day and at least 30 minutes; smaller subjects rotate.
  const ownBlock = (r: { share: number }) => (r.share * dailyMin) / fullDay >= 0.1 && r.share * dailyMin >= 22.5;   // rounds to a 30-minute block
  const fixed = withShare.filter(ownBlock);
  const small = withShare.filter((r) => !ownBlock(r));
  const dailyBlocks: Record<string, number> = {};
  for (const r of fixed) dailyBlocks[r.id] = Math.max(30, round15(r.share * dailyMin));
  let used = Object.values(dailyBlocks).reduce((a, b) => a + b, 0);
  let rotatingMin = small.length ? dailyMin - used : 0;
  // Keep the rotating slot at least 30 minutes by trimming the largest block; drop it if the day is too short.
  while (small.length && rotatingMin < 30) {
    const big = fixed.sort((a, b) => dailyBlocks[b.id] - dailyBlocks[a.id])[0];
    if (!big || dailyBlocks[big.id] <= 30) break;
    dailyBlocks[big.id] -= 15; rotatingMin += 15;
  }
  // Fixed blocks may round past the day: trim the largest until it fits.
  used = Object.values(dailyBlocks).reduce((a, b) => a + b, 0);
  while (used + Math.max(0, rotatingMin) > dailyMin && fixed.length) {
    const big = fixed.sort((a, b) => dailyBlocks[b.id] - dailyBlocks[a.id])[0];
    if (dailyBlocks[big.id] <= 30) break;
    dailyBlocks[big.id] -= 15; used -= 15;
  }
  rotatingMin = small.length ? Math.max(0, dailyMin - used) : 0;
  let smallShare = small.reduce((s, r) => s + r.share, 0) || 1;

  if (dsaFixed) {   // DSA follows the problem count; every share is re-expressed against the full day
    for (const r of withShare) r.share = (r.share * dailyMin) / fullDay;
    smallShare = small.reduce((s, r) => s + r.share, 0) || 1;
    const role2 = ROLES.find((r) => r.id === goal.role) || ROLES[0];
    withShare.push({ id: "dsa", weight: role2.weights.dsa, adjust: company.adjust.dsa ?? 1, need: 1 - (mastery.dsa ?? base), priority: Infinity, share: dsaFixed / fullDay });
    dailyBlocks.dsa = dsaFixed;
  }
  const subjects: SubjectAlloc[] = withShare.map((r) => {
    const rotating = small.includes(r as any);
    const avgMin = rotating ? (rotatingMin * r.share) / smallShare : dailyBlocks[r.id];
    const topics = SUBJECT[r.id].topics.filter((tp) => tp.level <= role.depth[r.id]);
    return { ...r, rotating, avgMin, dailyMin: rotating ? 0 : dailyBlocks[r.id], topics, neededMin: topics.reduce((s, tp) => s + tp.hours * 60, 0), budgetMin: 0, coverage: 1, allotted: {} };
  });
  return { subjects, rotatingMin, dailyMin: fullDay };
}

/** Builds the whole plan: day-by-day sessions, topic dates, phases, milestones and the explanation. */
export function buildPlan(goal: Goal, mastery: Partial<Record<SubjectId, number>> = {}): Plan {
  const { subjects, rotatingMin, dailyMin } = allocate(goal, mastery);
  const dates = studyDates(goal);
  const n = dates.length;
  // The last 20% of a plan becomes Interview Mode (only when the plan is long enough to have one).
  const interviewFrom = n >= 15 ? Math.floor(n * 0.8) : n;
  const learnDays = interviewFrom;

  // Each subject's topic budget, scaled to the time it actually gets before Interview Mode.
  // Short on time: leave out the most advanced topics first, so the rest get real depth (never below the basics).
  const dropped: { subject: SubjectId; topics: Topic[] }[] = [];
  for (const s of subjects) {
    s.budgetMin = s.avgMin * learnDays;
    const out: Topic[] = [];
    while (s.neededMin && s.budgetMin / s.neededMin < 0.7 && s.topics.some((tp) => tp.level > 1)) {
      const maxLevel = Math.max(...s.topics.map((tp) => tp.level));
      const last = s.topics.filter((tp) => tp.level === maxLevel).at(-1)!;
      s.topics = s.topics.filter((tp) => tp !== last);
      s.neededMin -= last.hours * 60;
      out.push(last);
    }
    if (out.length) dropped.push({ subject: s.id, topics: out.reverse() });
  }
  for (const s of subjects) {
    const scale = s.neededMin ? s.budgetMin / s.neededMin : 1;
    s.coverage = Math.min(1, scale);
    const use = Math.min(scale, 1.5);    // extra time beyond 1.5× becomes revision and practice
    for (const tp of s.topics) s.allotted[tp.id] = Math.max(20, Math.round(tp.hours * 60 * use));
  }

  // Walk the days, filling each subject's block from its topic queue.
  const remaining: Record<string, number> = {};
  const pointer: Record<string, number> = {};
  const topicDates: Plan["topicDates"] = {};
  for (const s of subjects) { pointer[s.id] = 0; for (const tp of s.topics) remaining[tp.id] = s.allotted[tp.id]; }
  const rot = subjects.filter((s) => s.rotating);
  const credit: Record<string, number> = Object.fromEntries(rot.map((s) => [s.id, 0]));
  const days: Session[][] = [];

  dates.forEach((date, i) => {
    const sessions: Session[] = [];
    const interview = i >= interviewFrom;
    const add = (s: SubjectAlloc, minutes: number) => {
      if (minutes <= 0) return;
      let topicId: string | null = null;
      let kind: Session["kind"] = interview ? "interview" : "practice";
      if (!interview) {
        let left = minutes;
        while (left > 0 && pointer[s.id] < s.topics.length) {
          const tp = s.topics[pointer[s.id]];
          if (!topicId) topicId = tp.id;
          const take = Math.min(left, remaining[tp.id]);
          remaining[tp.id] -= take; left -= take;
          topicDates[tp.id] ||= { start: date, end: date };
          topicDates[tp.id].end = date;
          if (remaining[tp.id] <= 0) pointer[s.id]++;
        }
        if (topicId) kind = "learn";
      }
      sessions.push({ id: `${date}#${s.id}`, date, subject: s.id, minutes, topicId, kind });
    };
    for (const s of subjects.filter((x) => !x.rotating).sort((a, b) => b.priority - a.priority)) add(s, s.dailyMin);
    if (rot.length && rotatingMin > 0) {
      // Weighted round robin: each rotating subject earns credit by its share; the highest credit gets today's slot.
      for (const s of rot) credit[s.id] += s.share;
      const pick = rot.slice().sort((a, b) => credit[b.id] - credit[a.id])[0];
      credit[pick.id] -= rot.reduce((t, s) => t + s.share, 0);
      add(pick, rotatingMin);
    }
    days.push(sessions);
  });

  // Phases by time: Foundations, Core, Advanced, Interview.
  const at = (f: number) => dates[Math.min(n - 1, Math.max(0, Math.floor(n * f)))] || goal.startDate;
  const phaseDefs: [string, string, number, number, string][] = n >= 15
    ? [["foundations", "Foundations", 0, 0.25, "Basics of every subject, easier problem patterns."],
       ["core", "Core interview topics", 0.25, 0.55, "The topics most interviews are built on."],
       ["advanced", "Advanced preparation", 0.55, 0.8, "Harder patterns, design depth, advanced fundamentals."],
       ["interview", "Interview mode", 0.8, 1, "Timed practice, mocks, revision of weak areas."]]
    : [["sprint", "Sprint", 0, 1, "A short plan: core topics only, in priority order."]];
  const phases: Phase[] = phaseDefs.map(([id, name, a, b, summary], k) => {
    const start = at(a), end = k === phaseDefs.length - 1 ? dates[n - 1] || goal.targetDate : dates[Math.max(0, Math.floor(n * b) - 1)];
    const topics = subjects.flatMap((s) => s.topics.filter((tp) => topicDates[tp.id] && topicDates[tp.id].start >= start && topicDates[tp.id].start <= end).map((tp) => ({ subject: s.id, topic: tp })));
    return { id, name, start, end, summary, topics };
  });

  const milestones: Milestone[] = [];
  for (const s of subjects) {
    const last = s.topics.filter((tp) => topicDates[tp.id]).at(-1);
    if (last) milestones.push({ id: `ms-${s.id}`, date: topicDates[last.id].end, name: `All ${SUBJECT[s.id].short} topics covered`, subject: s.id });
  }
  if (interviewFrom < n) {
    for (let i = interviewFrom; i < n; i += 5) milestones.push({ id: `mock-${i}`, date: dates[i], name: "Mock interview" });
  }
  milestones.push({ id: "ready", date: dates[n - 1] || goal.targetDate, name: "Interview ready" });
  milestones.sort((a, b) => (a.date < b.date ? -1 : 1));

  // Why this plan, written from the numbers above.
  const role = ROLES.find((r) => r.id === goal.role) || ROLES[0];
  const company = COMPANIES.find((c) => c.id === goal.company);
  const ranked = subjects.slice().sort((a, b) => b.share - a.share);
  const weeks = Math.max(1, Math.round(daysBetween(goal.startDate, goal.targetDate) / 7));
  const weightLine = ranked.length >= 2
    ? `${SUBJECT[ranked[0].id].short} and ${SUBJECT[ranked[1].id].short} get the most time because they carry the most weight for ${role.name}${company && Object.keys(company.adjust).length ? `, adjusted for ${company.name}` : ""}.`
    : ranked.length === 1
      ? `${SUBJECT[ranked[0].id].short} gets the time in this plan.`
      : "No subjects are in this plan yet.";
  const why = [
    `Your target is ${role.name}${company && company.id !== "other" ? ` at ${company.name}` : ""}, with ${goal.hoursPerDay} h a day for ${weeks} week${weeks === 1 ? "" : "s"}.`,
    weightLine,
    rot.length ? `${rot.map((s) => SUBJECT[s.id].short).join(", ")} share a rotating ${rotatingMin}-minute slot, so every subject keeps moving without crowding the day.` : `Every subject gets its own daily block.`,
    interviewFrom < n ? `The last ${n - interviewFrom} study days are Interview mode: timed practice, mocks and revision.` : `The plan is too short for a separate Interview mode, so it covers core topics only.`,
  ];
  const warnings: string[] = [];
  const droppedCount = dropped.reduce((t, d) => t + d.topics.length, 0);
  if (droppedCount) {
    why.push(`To give the rest real depth, ${droppedCount} advanced topic${droppedCount === 1 ? " is" : "s are"} left out for now (${dropped.map((d) => `${SUBJECT[d.subject].short} ${d.topics.length}`).join(", ")}). More hours or a later date brings them back.`);
  }
  const thin = subjects.filter((s) => s.coverage < 0.8);
  if (thin.length) {
    const need = Math.ceil(Math.max(...thin.map((s) => s.neededMin / Math.max(1, learnDays) - s.avgMin)) / 60 * 2) / 2;
    warnings.push(`At this pace ${thin.map((s) => `${SUBJECT[s.id].short} covers ${Math.round(s.coverage * 100)}%`).join(", ")} of its topics in full depth. About ${need} more hour${need === 1 ? "" : "s"} a day, or a later date, would cover everything.`);
  }
  if (goal.hoursPerDay > 8) warnings.push("More than 8 hours a day rarely lasts. Plan rest days, or the schedule will slip.");

  return { goal, dailyMin, subjects, rotatingMin, days, studyDays: n, interviewStart: interviewFrom < n ? dates[interviewFrom] : null, phases, milestones, topicDates, why, warnings, dropped };
}

/** Sessions for a date with clock times, from the goal's start time and break length. */
export function timetable(plan: Plan, date: string): (Session & { startMin: number; endMin: number })[] {
  const i = plan.days.findIndex((d) => d[0]?.date === date);
  if (i < 0) return [];
  const [h, m] = plan.goal.startTime.split(":").map(Number);
  let clock = h * 60 + m;
  return plan.days[i].map((s) => { const startMin = clock; clock += s.minutes; const r = { ...s, startMin, endMin: clock }; clock += plan.goal.breakMin; return r; });
}

export const clock = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
export const priorityOf = (s: SubjectAlloc) => (s.share >= 0.25 ? "High" : s.share >= 0.1 ? "Medium" : "Low");
