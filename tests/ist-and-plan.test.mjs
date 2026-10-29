import test from "node:test";
import assert from "node:assert/strict";
import { todayKey, instantKey, isValidDay } from "../src/renderer/core/dates.js";
import { schedule } from "../src/renderer/core/plan.js";
import { build } from "../hub-src/node_modules/esbuild/lib/main.js";

test("today follows Asia/Kolkata, including an ISO timestamp", () => {
  assert.equal(todayKey(new Date("2026-10-29T18:29:00Z")), "2026-10-29");
  assert.equal(todayKey(new Date("2026-10-29T18:30:00Z")), "2026-10-30");
  assert.equal(instantKey("2026-10-29T18:30:00.000Z"), "2026-10-30");
  assert.equal(instantKey("2026-10-29"), "2026-10-29");
  assert.equal(isValidDay("2026-02-31"), false);
  assert.equal(isValidDay("2026-10-29"), true);
});

test("an invalid start date does not hang the practice scheduler", () => {
  const start = Date.now();
  assert.deepEqual(schedule([{ d: "E" }], { hoursPerDay: 1, daysPerWeek: 5, startDate: "not-a-date" }), []);
  assert.deepEqual(schedule([{ d: "E" }], { hoursPerDay: 1, daysPerWeek: 5, startDate: "2026-02-31" }), []);
  assert.ok(Date.now() - start < 1000);
});

async function bundle(entry) {
  const { outputFiles } = await build({ entryPoints: [entry], bundle: true, platform: "node", format: "esm", write: false });
  return import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].contents).toString("base64")}`);
}

const goal = (over = {}) => ({
  role: "sde1", company: "amazon", level: "beginner", hoursPerDay: 2, daysPerWeek: 7,
  startDate: "2026-10-29", targetDate: "2026-11-05", startTime: "09:00", breakMin: 10, problemsPerDay: 2,
  ...over,
});

test("buildPlan survives zero or one subject and an invalid start date", async () => {
  const { buildPlan, studyDates, todayKey: hubToday, instantKey: hubInstant } = await bundle("hub-src/src/core/planner.ts");
  const started = Date.now();
  assert.deepEqual(studyDates(goal({ startDate: "bad", targetDate: "2026-11-05" })), []);
  assert.deepEqual(studyDates(goal({ startDate: "2026-13-40" })), []);
  assert.ok(Date.now() - started < 1000);
  assert.doesNotThrow(() => buildPlan(goal({ skip: ["dsa", "oops", "os", "dbms", "cn", "lld", "sd"] })));
  const one = buildPlan(goal({ skip: ["oops", "os", "dbms", "cn", "lld", "sd"] }));
  assert.equal(one.subjects.length, 1);
  assert.match(one.why.join(" "), /DSA/);
  assert.equal(hubToday(new Date("2026-10-29T18:30:00Z")), "2026-10-30");
  assert.equal(hubInstant("2026-10-29T20:00:00Z"), "2026-10-30");
});

test("must-do uses that day's leftovers, and manual solves are not solo today", async () => {
  const bridge = await bundle("hub-src/src/core/practice-bridge.ts");
  const progress = await bundle("hub-src/src/core/progress.ts");
  const planner = await bundle("hub-src/src/core/planner.ts");
  const { summarizeDsa } = bridge;
  const { mustDo, finished, setDsaTruth, practiceLocked } = progress;
  const { todayKey: hubToday, addDays, fmt, parse } = planner;
  const raw = {
    version: 2,
    profile: { onboarded: true, sources: ["amazon"], queue: ["two-sum", "valid-parentheses"], completed: [], hoursPerDay: 2, daysPerWeek: 7, startDate: "2026-10-27", problemsPerDay: 1 },
    progress: {
      status: { "two-sum": "a", "valid-parentheses": "a" },
      when: { "two-sum": "2026-10-29", "valid-parentheses": "2026-10-29" },
      attempts: {
        "two-sum": [{ result: "a", manual: true, accepted: false, sawSolution: false, explain: null, think: null }],
        "valid-parentheses": [{ result: "a", manual: false, accepted: true, sawSolution: false, explain: { insight: "use a hash map" }, think: { patternTries: 1, patternCorrect: true, skipped: false } }],
      },
    },
  };
  const summary = summarizeDsa(raw, "2026-10-29");
  assert.equal(summary.soloToday, 1);
  assert.ok(summary.leftByDate);

  const t = hubToday();
  const day = (n) => fmt(addDays(parse(t), n));
  const plan = {
    goal: { startDate: day(-3), startTime: "09:00", breakMin: 10, targetDate: day(2) },
    dailyMin: 80,
    subjects: [],
    days: [day(-2), day(-1), t].map((date) => [{ id: `${date}#dsa`, date, subject: "dsa", minutes: 40, topicId: null, kind: "practice" }]),
  };
  const hubState = { createdAt: "2020-01-01T00:00:00.000Z", settings: {}, progress: { sessions: {}, topics: {} }, goal: plan.goal, version: 1 };
  setDsaTruth({ ...summary, hasPlan: true, leftovers: 1, leftByDate: { [day(-2)]: 1 }, todayTotal: 1, todayLeft: 1 });
  const open = mustDo(hubState, plan);
  assert.deepEqual(open.items.map((s) => s.date), [day(-2)]);
  assert.equal(finished(hubState, `${day(-2)}#dsa`), false);
  assert.equal(finished(hubState, `${day(-1)}#dsa`), true);
  assert.equal(practiceLocked(hubState, plan), true);
  setDsaTruth({ ...summary, hasPlan: true, leftovers: 0, leftByDate: {}, todayTotal: 1, todayLeft: 1 });
  assert.equal(practiceLocked(hubState, plan), false);
});
