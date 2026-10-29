import test from "node:test";
import assert from "node:assert/strict";

test("saveNow writes the latest practice state and cancels the debounced save", async () => {
  const writes = [];
  globalThis.window = { api: { saveState: async (s) => { writes.push(JSON.parse(JSON.stringify(s))); return true; }, loadState: async () => null } };
  const { store } = await import("../src/renderer/core/state.js");
  store.S.profile = { ...store.S.profile, onboarded: true };
  store.save();
  assert.equal(writes.length, 0);
  store.S.profile.hoursPerDay = 4;
  await store.saveNow();
  assert.equal(writes.length, 1);
  assert.equal(writes[0].profile.hoursPerDay, 4);
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(writes.length, 1);
});
