import test from "node:test";
import assert from "node:assert/strict";
import { acceptToast } from "../src/renderer/core/practice.js";
import { syncPracticePlan } from "../src/renderer/core/hub-sync.js";

globalThis.window = { api: { saveState() {}, loadState: async () => null } };

test("accepted redo toasts match the schedule that was actually saved", () => {
  assert.equal(acceptToast("a", true, true), "Marked as solved alone. The next redo is further out.");
  assert.equal(acceptToast("a", true, false), "Marked as solved alone. That was the last redo.");
  assert.equal(acceptToast("a", false, false), "Marked as solved alone.");
  assert.match(acceptToast("h", true, true), /3 days/);
});

test("practice changes to problems per day, study days and company flow back, and stale values do not", () => {
  const hub = { version: 1, goal: { role: "sde1", company: "google", hoursPerDay: 4, daysPerWeek: 5, problemsPerDay: 3, startDate: "2026-10-01", targetDate: "2026-12-01", startTime: "09:00" }, dsaSetup: {} };
  const profile = { sources: ["amazon"], hoursPerDay: 2, daysPerWeek: 6, queue: ["two-sum"], problemsPerDay: 4 };
  const out = syncPracticePlan(hub, profile);
  assert.equal(out.hub.goal.company, "amazon");
  assert.equal(out.hub.goal.daysPerWeek, 6);
  assert.equal(out.hub.goal.problemsPerDay, 4);
  assert.equal(out.hub.goal.role, "sde1");
  assert.equal(out.hub.goal.startDate, "2026-10-01");
  assert.equal(out.hub.goal.hoursPerDay, 4);
  assert.equal(out.hub.dsaSetup.problemsPerDay, 4);
  assert.equal(out.hub.dsaSetup.daysPerWeek, 6);
  const stale = syncPracticePlan(hub, { sources: ["amazon", "meta"], hoursPerDay: 8, daysPerWeek: 0, queue: ["two-sum"], problemsPerDay: undefined });
  assert.equal(stale.hub.goal.company, "google");
  assert.equal(stale.hub.goal.daysPerWeek, 5);
  assert.equal(stale.hub.goal.problemsPerDay, 3);
  assert.equal(stale.profile.problemsPerDay, 3);
  assert.notEqual(stale.profile.problemsPerDay, Math.round((8 * 60) / 39));
});
