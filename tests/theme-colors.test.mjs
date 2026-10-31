// The palette is one colour per meaning, and gold is never a button.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/renderer/styles/app.css", import.meta.url), "utf8");
const hub = readFileSync(new URL("../hub-src/src/styles.css", import.meta.url), "utf8");
const practice = readFileSync(new URL("../src/renderer/app.js", import.meta.url), "utf8");
const plan = readFileSync(new URL("../hub-src/src/screens/PlanMode.tsx", import.meta.url), "utf8");
const today = readFileSync(new URL("../hub-src/src/screens/Today.tsx", import.meta.url), "utf8");

function rules(css) {
  const out = [];
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) out.push([m[1], m[2]]);
  return out;
}

test("tokens: sage, gold, amber and slate-blue, with gold renamed off --gold", () => {
  for (const css of [app, hub]) {
    assert.match(css, /--accent:\s*#8FC1A9/i);
    assert.match(css, /--earned:\s*#D4AF37/i);
    assert.match(css, /--attention:\s*#D9B36C/i);
    assert.match(css, /--help:\s*#8FA8CC/i);
    assert.doesNotMatch(css, /--gold\s*:/);
  }
  assert.match(app, /--easy:\s*#00B8A3/i);
  assert.match(app, /--med:\s*#FFC01E/i);
  assert.match(app, /--hard:\s*#FF5C7A/i);
});

test("gold is not the fill of a button or the current-step control", () => {
  const buttonish = /\.btn|\.cta|\.play|\.nextsm|button\.on|\.choice\.on|\.seg button/;
  for (const css of [app, hub]) {
    for (const [sel, body] of rules(css)) {
      if (buttonish.test(sel) && /--earned/.test(body)) assert.fail(`gold on a control: ${sel.trim()}`);
    }
  }
});

test("silk is not generated for the practice screens, only the welcome and a milestone today", () => {
  assert.doesNotMatch(practice, /silk/);
  assert.match(plan, /welcomeSilk/);
  assert.match(plan, /step === 0/);
  assert.match(today, /milestoneSilk/);
  assert.match(today, /m\.date === t/);
});
