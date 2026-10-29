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

test("syncing the practice plan does not overwrite the Hub goal and keeps problems per day", () => {
  const hub = { version: 1, goal: { role: "sde1", company: "google", hoursPerDay: 4, daysPerWeek: 5, problemsPerDay: 3, startDate: "2026-10-01", targetDate: "2026-12-01" }, dsaSetup: {} };
  const profile = { sources: ["amazon"], hoursPerDay: 2, daysPerWeek: 6, queue: ["two-sum"], problemsPerDay: 3 };
  const out = syncPracticePlan(hub, profile);
  assert.equal(out.hub.goal, hub.goal);
  assert.equal(out.hub.goal.company, "google");
  assert.equal(out.hub.goal.problemsPerDay, 3);
  assert.equal(out.hub.dsaSetup.problemsPerDay, 3);
  assert.equal(out.profile.problemsPerDay, 3);
  const hoursOnly = syncPracticePlan(hub, { ...profile, hoursPerDay: 8, problemsPerDay: undefined });
  assert.equal(hoursOnly.profile.problemsPerDay, 3);
  assert.notEqual(hoursOnly.profile.problemsPerDay, Math.round((8 * 60) / 39));
});
