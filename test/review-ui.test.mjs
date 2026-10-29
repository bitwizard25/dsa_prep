import test from "node:test";
import assert from "node:assert/strict";
import { store } from "../src/renderer/core/state.js";
import * as Ws from "../src/renderer/screens/workspace.js";
import { todayKey } from "../src/renderer/core/dates.js";
import { PATTERNS } from "../src/renderer/data/dataset.js";

const INSIGHT = "use a hash map for the complement";

function baseState() {
  store.S.ui = { width: 380, collapsed: false };
  store.S.focusBlock = true;
  store.S.askEnergy = false;
  store.S.pomo = { work: 25, brk: 5 };
  store.S.log = {};
  store.S.tomorrow = { time: "", place: "" };
  store.S.profile = {
    onboarded: true, dataVersion: 2, sources: ["amazon"], custom: [], patterns: [], perPattern: 30, premium: false,
    completed: [], hoursPerDay: 2, daysPerWeek: 7, startDate: todayKey(), queue: ["two-sum"], planMode: "hours", targetDate: "",
  };
  store.S.progress = {
    status: { "two-sum": "h" }, when: { "two-sum": "2026-10-01" },
    redo: { "two-sum": { due: todayKey(), stage: 0 } },
    attempts: { "two-sum": [{ explain: { insight: INSIGHT }, result: "h" }] },
    solutionSeen: {},
  };
}

function ctx(over = {}) {
  return {
    route: "workspace", tab: "today", view: new Date(), curSlug: "two-sum",
    authed: { signedIn: true }, login: { busy: false, step: "", browser: "", error: "" },
    accepted: null, showFull: false, confirm: null, flash: "",
    attempt: {
      slug: "two-sum", start: Date.now() - 60000, sawAt: null, gate: true, unlocked: true,
      think: { complexity: "O(n)", brute: "check every pair of numbers", waste: "repeats the scan", pattern: 0, patternTries: 1, patternCorrect: true, skipped: false, complexityWarning: "" },
      facts: { n: 1e5, lines: [], tags: [], accepted: [0], live: true }, nudge: "",
    },
    ...over,
  };
}

test("the redo insight stays visible when the timer is on a break", () => {
  baseState();
  store.S.timer = { mode: "break", left: 120, running: true, endsAt: Date.now() + 120000, total: 300 };
  const html = Ws.render(ctx());
  assert.match(html, /Break/);
  assert.match(html, new RegExp(INSIGHT));
  assert.match(html, /class="insight"/);
  assert.doesNotMatch(html, /class="focuscard"/);
});

test("the redo insight is also visible during a focus block", () => {
  baseState();
  store.S.timer = { mode: "work", left: 1000, running: true, endsAt: Date.now() + 1000000, total: 1500 };
  const html = Ws.render(ctx());
  assert.match(html, /class="focuscard"/);
  assert.match(html, new RegExp(INSIGHT));
});

test("the insight stays hidden until the editor is unlocked", () => {
  baseState();
  store.S.timer = { mode: "break", left: 120, running: true, endsAt: Date.now() + 120000, total: 300 };
  const locked = ctx();
  locked.attempt.unlocked = false;
  const html = Ws.render(locked);
  assert.match(html, /class="think"/);
  assert.doesNotMatch(html, new RegExp(INSIGHT));
});

test("a slow complexity estimate is a warning and the unlock button stays available", () => {
  baseState();
  store.S.timer = { mode: "work", left: 1500, running: false, endsAt: 0 };
  const locked = ctx();
  locked.attempt.unlocked = false;
  locked.attempt.think.complexity = "O(n^2)";
  locked.attempt.think.pattern = PATTERNS.indexOf("Arrays & Hashing");
  const html = Ws.render(locked);
  assert.match(html, /too slow/);
  assert.match(html, /data-act="think-unlock"/);
  assert.doesNotMatch(html, /think-unlock"[^>]*disabled/);
});
