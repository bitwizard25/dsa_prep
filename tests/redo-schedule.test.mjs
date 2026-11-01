import test from "node:test";
import assert from "node:assert/strict";
import { store } from "../src/renderer/core/state.js";
import { mark, setMark, redoResult } from "../src/renderer/core/practice.js";
import { todayKey, fmt, addDays, parse } from "../src/renderer/core/dates.js";

globalThis.window = { api: { saveState() {}, loadState: async () => null } };
const plus = (n) => fmt(addDays(parse(todayKey()), n));

test("help keeps an existing redo stage, toggling off keeps the redo, and a bad stage does not become NaN", () => {
  store.S.progress = { status: {}, when: {}, redo: {}, attempts: {}, solutionSeen: {}, open: {} };
  setMark("two-sum", "h");
  store.S.progress.redo["two-sum"] = { due: plus(10), stage: 1 };
  setMark("two-sum", "h");
  assert.equal(store.S.progress.redo["two-sum"].stage, 1);
  assert.equal(store.S.progress.redo["two-sum"].due, plus(10));
  mark("two-sum", "h");
  assert.equal(store.S.progress.status["two-sum"], undefined);
  assert.equal(store.S.progress.redo["two-sum"].stage, 1);
  store.S.progress.status["two-sum"] = "h";
  store.S.progress.redo["two-sum"].stage = NaN;
  redoResult("two-sum", true);
  assert.equal(store.S.progress.redo["two-sum"].stage, 1);
  assert.equal(Number.isNaN(store.S.progress.redo["two-sum"].stage), false);
});
