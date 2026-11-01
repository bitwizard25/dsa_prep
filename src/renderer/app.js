// Controller: owns screen state, routes events to actions, and re-renders.
import { store, freshProfile } from "./core/state.js";
import * as R from "./core/reasoning.js";
import * as A from "./core/attempts.js";
import * as P from "./core/practice.js";
import { syncPracticePlan, planOwnedByHub } from "./core/hub-sync.js";
import * as T from "./core/timer.js";
import * as Onb from "./screens/onboarding.js";
import * as Ws from "./screens/workspace.js";
import { parseImport, patternCounts, PATTERNS } from "./core/problems.js";
import { fmt, addDays, todayKey } from "./core/dates.js";
import { aboutInner } from "./ui/about.js";

const api = window.api;
const $app = document.getElementById("app");

const ctx = {
  route: "onboarding", step: 1, draft: null, importText: "", coSearch: "", pickMsg: "",
  tab: "today", view: new Date(), curSlug: "",
  authed: { signedIn: false },
  login: { busy: false, step: "", browser: "", error: "" },
  attempt: null,      // { slug, start, sawAt } for the problem currently open
  accepted: null,     // { slug, suggest: "a" | "h", mins } after LeetCode shows Accepted
  showFull: false,    // show the full list during a focus block
  confirm: null,      // { title, body, keeps[], ok, danger, run } for the in-app confirmation dialog
  flash: "",
  about: null,        // version, build stamp, and updater status from the main process
};
// In-progress tries for this session, keyed by slug. Leaving a problem must not wipe them.
const openAttempts = {};

// ---------- rendering + layout ----------
function render() {
  $app.innerHTML = (ctx.route === "onboarding" ? Onb.render(ctx) : Ws.render(ctx)) + confirmHtml();
  document.body.dataset.route = ctx.route;
  document.body.classList.toggle("collapsed", ctx.route === "workspace" && store.S.ui.collapsed);
  paintAbout();
  reportBusy();
}
function titleText() {
  const v = ctx.about && ctx.about.appVersion ? ` ${ctx.about.appVersion}` : "";
  return (store.S.timer.running ? T.mmss(T.left()) + " " : "") + "DSA Practice" + v;
}
function paintAbout() {
  const a = ctx.about;
  const ver = document.getElementById("appver");
  if (ver) {
    ver.textContent = a && a.appVersion ? `v${a.appVersion}` : "";
    ver.title = (a && a.buildLabel) || "Development build";
  }
  document.title = titleText();
  const box = document.getElementById("about");
  if (box) box.innerHTML = aboutInner(a);
}
let lastBusy = null;
function reportBusy() {
  const busy = gating() || (store.S.timer.running && store.S.timer.mode === "work");
  if (busy === lastBusy || typeof api.setSessionBusy !== "function") return;
  lastBusy = busy;
  api.setSessionBusy(busy).catch(() => {});
}
function applyLayout() {
  const ui = store.S.ui, ws = ctx.route === "workspace";
  document.documentElement.style.setProperty("--sbw", ws ? (ui.collapsed ? 64 : ui.width) + "px" : "100%");
  api.layout({ mode: ws ? "workspace" : "onboarding", width: ui.width, collapsed: ui.collapsed });
}
function go(route) { ctx.route = route; applyLayout(); syncFocus(); syncCover(); render(); }

let flashT;
function flash(msg) { ctx.flash = msg; render(); clearTimeout(flashT); flashT = setTimeout(() => { ctx.flash = ""; render(); }, 4000); }
const syncFocus = () => api.setFocus(ctx.route === "workspace" && T.inFocus());

// ---------- login ----------
const LOGIN_ERR = {
  "no-browser": "Couldn't find Chrome, Edge or Brave on this PC. Install one of them and try again.",
  closed: "The browser window was closed before the login finished. Try again.",
  "no-login": "No LeetCode login was found. Finish logging in before closing the browser window.",
  "still-open": "That browser is still running in the background. Close all its windows, then try again.",
  rejected: "The login was copied, but LeetCode didn't accept it. Try once more.",
  busy: "A login is already in progress.",
};
async function startLogin() {
  if (ctx.login.busy) return;
  ctx.login = { busy: true, step: "starting", browser: "", error: "" };
  render();
  const r = await api.loginBrowser();
  ctx.login.busy = false;
  if (r.ok) {
    ctx.authed = r;
    if (ctx.route === "onboarding") render();
    else flash(`Connected${r.username ? " as " + r.username : ""}.`);
    return;
  }
  ctx.login.error = LOGIN_ERR[r.error] || `Login failed (${r.detail || r.error}).`;
  if (ctx.route === "workspace") flash(ctx.login.error); else render();
}

// ---------- plan ----------
// Save a draft as the active plan. Problems in it that you already solved are kept as "completed" so stats stay whole.
function commitPlan(d) {
  const q = Onb.draftQueue(d);
  if (!q.length) return false;
  const pats = new Set(d.patterns), solved = store.S.progress.status;
  const completed = d.skipSolved ? Onb.draftSet(d).filter((p) => pats.has(p.pattern) && solved[p.slug]).map((p) => p.slug) : [];
  Onb.summaryHtml(d);   // recompute hoursPerDay when planning by date
  const custom = d.sources[0] === "custom" ? d.custom.map(({ n, slug, d: df, pi, pattern, title }) => ({ n, slug, d: df, pi, pattern, title })) : [];
  store.S.profile = {
    onboarded: true, dataVersion: 2, source: d.sources[0], sources: d.sources, custom, patterns: d.patterns, perPattern: d.perPattern, premium: d.premium,
    hoursPerDay: d.hoursPerDay, daysPerWeek: +d.daysPerWeek, startDate: d.startDate,
    problemsPerDay: Number.isFinite(+d.problemsPerDay) && +d.problemsPerDay > 0 ? Math.floor(+d.problemsPerDay) : 0,
    queue: q.map((p) => p.slug), completed, planMode: d.planMode, targetDate: d.targetDate,
  };
  store.saveNow();
  return true;
}
// The practice plan is noted on the Hub. The Hub goal (company, dates, problems a day) stays as the user set it.
async function syncHub() {
  const hub = await api.hubLoad();
  const synced = syncPracticePlan(hub, store.S.profile);
  store.S.profile.hubOwned = synced.owned;
  if (!synced.changed) return;
  store.S.profile = synced.profile;
  store.saveNow();
  await api.hubSave(synced.hub);
}
function finishOnboarding() {
  if (!commitPlan(ctx.draft)) return;
  syncHub();
  ctx.tab = "today"; ctx.view = new Date();
  go("workspace");
}

// ---------- plan management ----------
function editPlan(step) { ctx.draft = Onb.newDraft(); ctx.step = step; go("onboarding"); }

function ask(c) { ctx.confirm = c; render(); setTimeout(() => document.querySelector("[data-act=confirm-no]")?.focus(), 0); }
function confirmHtml() {
  const c = ctx.confirm;
  if (!c) return "";
  return `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="mtitle"><div class="mbox">
    <h3 id="mtitle">${c.title}</h3><p>${c.body}</p>
    ${c.keeps ? `<ul class="keeps">${c.keeps.map(([ok, t]) => `<li class="${ok ? "kept" : "gone"}">${ok ? "Kept" : "Removed"}: ${t}</li>`).join("")}</ul>` : ""}
    <div class="mrow"><button class="ghost" data-act="confirm-no">Cancel</button><button class="cta ${c.danger ? "danger" : ""}" data-act="confirm-yes">${c.ok}</button></div>
  </div></div>`;
}

function newPlan() {
  ask({ title: "Start a new plan?", ok: "Start new plan",
    body: "You'll pick companies, patterns and hours again.",
    keeps: [[true, "every problem you've solved, your streak, notes and redo schedule"], [false, "the current plan and its schedule"]],
    run: () => { const ui = store.S.ui; store.S.profile = freshProfile(); store.S.ui = ui; store.saveNow(); editPlan(2); } });
}
function resetPlanProgress() {
  const n = P.planned().filter((p) => P.isDone(p.slug)).length;
  ask({ title: "Reset this plan's progress?", ok: "Reset progress", danger: true,
    body: `Clears the marks on ${n} problem${n === 1 ? "" : "s"} in this plan and restarts it from today.`,
    keeps: [[true, "the same companies, patterns and hours"], [true, "your streak and notes"], [false, "Alone / Help marks and redos for this plan's problems"]],
    run: () => {
      const pr = store.S.progress;
      for (const p of P.planned()) {
        delete pr.status[p.slug]; delete pr.when[p.slug]; delete (pr.redo || {})[p.slug]; delete (pr.attempts || {})[p.slug];
        delete (pr.solutionSeen || {})[p.slug]; delete (pr.open || {})[p.slug]; A.dropAttempt(openAttempts, p.slug);
      }
      if (ctx.attempt) { ctx.attempt = null; beginAttempt(ctx.curSlug); }
      const d = Onb.newDraft(); d.skipSolved = false; commitPlan(d);
      ctx.view = new Date(); render(); flash("Progress reset. The plan starts again from today.");
    } });
}
function eraseAll() {
  ask({ title: "Erase everything?", ok: "Erase everything", danger: true,
    body: "This can't be undone.",
    keeps: [[true, "your LeetCode login"], [false, "your plan, all solved marks, streak, notes and redo schedule"]],
    run: () => { A.clearAttempts(openAttempts); ctx.attempt = null; store.reset(); editPlan(2); } });
}
const setPatterns = () => patternCounts(Onb.draftSet(ctx.draft)).map((c) => c.name);
// Companies can be combined (up to 3). "All companies" and "My own list" stand alone.
function selectSource(id) {
  const d = ctx.draft, single = id === "general" || id === "custom";
  let s = d.sources.filter((x) => x !== "general" && x !== "custom");
  ctx.pickMsg = "";
  if (single) s = d.sources[0] === id ? [] : [id];
  else if (s.includes(id)) s = s.filter((x) => x !== id);
  else if (s.length >= 3) { ctx.pickMsg = "Up to 3 companies. More than that and the plan stops being specific to any of them."; return; }
  else s = [...s, id];
  d.sources = s;
  d.patterns = setPatterns();   // default: every pattern
}

function openNext() {
  const p = P.nextUnsolved(ctx.curSlug);
  if (!p) { flash("Everything planned up to today is done. Rest, or start tomorrow's list."); return; }
  ctx.curSlug = p.slug; beginAttempt(p.slug); api.open(p.slug); render();
}
function markCurrent(st) {
  const known = P.planned().find((p) => p.slug === ctx.curSlug);
  if (!known) { flash("Open a problem from your plan first."); return; }
  const block = R.manualMarkBlock(store.S.progress, ctx.curSlug, gating());
  if (block) { flash(block); return; }
  if (!commitAttempt(ctx.curSlug, buildRecord(attemptFor(ctx.curSlug), st, { accepted: false, manual: true }, ctx.curSlug))) return;
  P.setMark(ctx.curSlug, st);
  reopen(ctx.curSlug);
  flash(`Marked "${known.title}" as ${st === "a" ? "solved alone" : "needed help"}. Ctrl+Alt+N for the next one.`);
}
function toggleTimer() { if (gating() && !store.S.timer.running) { flash("Finish Think-first or skip it before starting the timer."); return; } T.toggle(); ctx.showFull = false; syncFocus(); render(); }

// One tap: open the next problem (unless you're already on an unsolved one) and start the focus timer.
function oneTapStart() {
  const onPlanned = P.planned().some((p) => p.slug === ctx.curSlug && !P.isDone(p.slug)) || P.redoDue().some((p) => p.slug === ctx.curSlug);
  if (!onPlanned) { const p = P.nextUnsolved(ctx.curSlug); if (p) { ctx.curSlug = p.slug; api.open(p.slug); beginAttempt(p.slug); } }
  if (!store.S.timer.running && !gating()) T.toggle();
  ctx.showFull = false; syncFocus(); render();
}

const needsGate = (slug) => (P.planned().some(p => p.slug === slug) && !P.isDone(slug)) || P.redoDue().some(p => p.slug === slug);
const gating = () => !!(ctx.route === "workspace" && ctx.attempt?.slug === ctx.curSlug && ctx.attempt.gate && !ctx.attempt.unlocked);
function syncCover() { api.cover(gating()).catch(() => {}); }
function solutionSeenMap() { return store.S.progress.solutionSeen || (store.S.progress.solutionSeen = {}); }
function beginAttempt(slug) {
  if (!slug) return;
  const seen = solutionSeenMap();
  if (ctx.attempt?.slug === slug) {
    if (seen[slug] && !ctx.attempt.sawAt) ctx.attempt.sawAt = seen[slug];
    return;
  }
  if (ctx.attempt) A.stashAttempt(openAttempts, ctx.attempt);
  const gate = needsGate(slug);
  const disk = (store.S.progress.open || {})[slug] || null;
  const { attempt } = A.resolveAttempt(openAttempts, seen, slug, () => ({
    slug, start: Date.now(), sawAt: null, gate, unlocked: !gate, unlockedAt: gate ? null : Date.now(),
    think: { version: 2, step: 1, skipped: false, exampleResult: "", exampleTyped: "", complexity: "", brute: "", bruteComplexity: "", waste: "", fix: "", pattern: null, patternTries: 0, patternCorrect: false, patternUnconfirmed: false, chainTries: 0, chainCorrect: false, bruteFits: false, contradiction: false, edges: [], gateStarted: Date.now(), gateMs: 0, finalComplexity: "", selfGrade: "", missed: "", complexityWarning: "" }, facts: null, nudge: "", explain: null,
  }), disk, gate);
  ctx.attempt = attempt;
  const locked = attempt.gate && !attempt.unlocked;
  if (locked && store.S.ui.collapsed) { store.S.ui.collapsed = false; store.save(); applyLayout(); }
  syncCover();
  if (locked && !attempt.facts) loadFacts(attempt);
}
async function loadFacts(attempt) {
  const primary = P.problemOf(attempt.slug)?.pi ?? -1;
  let meta = null;
  try { meta = await api.problemMeta(attempt.slug); } catch {}
  if (ctx.attempt !== attempt) return;
  const c = R.parseConstraints(meta?.content || "");
  const known = Number.isInteger(primary) && primary >= 0 && primary < PATTERNS.length;
  const tags = meta?.tags || [];
  attempt.facts = { n: c.n, lines: c.lines, tags, example: R.parseExample(meta?.content || ""), accepted: R.acceptedPatterns(known ? primary : -1, tags), live: !!meta, unverifiable: !known };
  if (attempt.think?.version === 2 && !attempt.think.gateStarted) attempt.think.gateStarted = Date.now();
  if (document.activeElement?.dataset?.think) return; // do not erase text while typing
  render();
}
function unlock() {
  const a = ctx.attempt;
  const redo = P.redoDue().some((p) => p.slug === a.slug);
  a.unlocked = true; a.unlockedAt = Date.now(); a.nudge = "";
  syncCover();
  if (redo) api.resetCode?.().catch(() => {});
  // A break stays a break. Starting focus here would hide the redo insight behind the timer.
  if (!store.S.timer.running && store.S.timer.mode !== "break") T.toggle();
  persistOpen(true);
  syncFocus(); render();
}
function attemptFor(slug) {
  if (ctx.attempt?.slug === slug) return ctx.attempt;
  const saved = openAttempts[slug];
  return saved && !saved.recorded ? saved : null;
}
function buildRecord(a, result, { accepted, manual, explain = null }, slug = a?.slug) {
  const seen = slug && store.S.progress.solutionSeen?.[slug];
  return { at: todayKey(), think: a?.gate ? { ...a.think } : null, n: a?.facts?.n ?? null, tags: a?.facts?.tags || [],
    sawSolution: !!(a?.sawAt || seen), accepted: !!accepted, explain, result, manual: !!manual };
}
// Writing the attempt down ends that try. The solution flag must not leak into the next one.
function commitAttempt(slug, rec) {
  if (rec?.manual && !R.canManualMark(store.S.progress, slug)) return false;
  if (ctx.attempt?.slug === slug) ctx.attempt.recorded = true;
  A.dropAttempt(openAttempts, slug);
  if (store.S.progress.solutionSeen) delete store.S.progress.solutionSeen[slug];
  if (store.S.progress.open) delete store.S.progress.open[slug];
  P.recordAttempt(slug, rec);
  return true;
}
function persistOpen(immediate = false) {
  const slug = ctx.attempt?.slug;
  if (!slug || ctx.attempt.recorded) return;
  const open = store.S.progress.open || (store.S.progress.open = {});
  if (ctx.accepted?.slug === slug) ctx.attempt.explain = { why: ctx.accepted.why || "", insight: ctx.accepted.insight || "" };
  const draft = A.draftFrom(ctx.attempt, ctx.attempt.explain);
  if (draft) open[slug] = draft; else delete open[slug];
  if (ctx.attempt.sawAt) solutionSeenMap()[slug] = ctx.attempt.sawAt;
  if (immediate) store.saveNow(); else store.save();
}
// Call after the mark or redo schedule has been updated, so the next try sees the new status.
function reopen(slug) {
  if (ctx.curSlug !== slug) return;
  ctx.attempt = null;
  beginAttempt(slug);
}
const attemptMins = () => (ctx.attempt ? Math.max(0, Math.round((Date.now() - ctx.attempt.start) / 60000)) : 0);
function toggleSidebar() { if (gating() && !store.S.ui.collapsed) { flash("Finish Think-first before collapsing the sidebar."); return; } store.S.ui.collapsed = !store.S.ui.collapsed; store.save(); applyLayout(); render(); }

function advanceThink(a) {
  const t = a.think, f = a.facts;
  if (!f) { a.nudge = "Still reading the problem. You can skip."; render(); return; }
  const step = t.step || 1;
  a.nudge = "";
  if (step <= 1) {
    if (!f.example) { a.nudge = "Work an example by hand, or skip."; render(); return; }
    if (R.outputsMatch(t.exampleTyped, f.example.output)) t.exampleResult = "correct";
    else { t.exampleResult = "misunderstood"; a.nudge = `Output is ${f.example.output}. You can continue; this try can't count as solved alone.`; }
    t.step = 2;
  } else if (step === 2) {
    if (!R.COMPLEXITIES.includes(t.complexity)) { a.nudge = "Pick a target complexity."; render(); return; }
    const slow = R.fitsBudget(t.complexity, f.n) === "too-slow";
    t.complexityWarning = slow ? `With n up to ${f.n.toLocaleString("en-IN")}, ${t.complexity} may be too slow. Consider ${R.budgetFor(f.n)} or better.` : "";
    t.step = 3;
  } else if (step === 3) {
    if (!R.wordsOk(t.brute, 2)) { a.nudge = "Describe the brute force in a few words."; render(); return; }
    if (!R.COMPLEXITIES.includes(t.bruteComplexity)) { a.nudge = "Pick the brute-force complexity."; render(); return; }
    const j = R.judgeBrute(t.complexity, t.bruteComplexity, f.n);
    t.bruteFits = j.bruteFits; t.contradiction = j.contradiction;
    if (j.contradiction && !t.contradictionSeen) { t.contradictionSeen = true; a.nudge = "That brute force is faster than the target you picked. Check both, then continue."; render(); return; }
    if (j.bruteFits) { t.chainCorrect = true; t.chainTries = 1; t.patternCorrect = true; t.patternTries = 1; t.step = 6; }
    else t.step = 4;
  } else if (step === 4) {
    if (!t.waste) { a.nudge = "Pick the waste."; render(); return; }
    t.step = 5;
  } else if (step === 5) {
    if (!t.fix) { a.nudge = "Pick the fix."; render(); return; }
    const j = R.judgeChain(t.waste, t.fix, f.tags);
    t.chainTries = (t.chainTries || 0) + 1;
    t.chainCorrect = j.chainCorrect && t.chainTries === 1;
    t.pattern = j.patterns[0] ?? t.pattern;
    t.patternTries = t.chainTries;
    t.patternCorrect = !!j.chainCorrect;
    if (!j.chainCorrect && t.chainTries === 1) {
      a.nudge = j.unverifiable
        ? "No specific tag to check this chain against. You can continue; it can't count as solved alone."
        : j.fixMatches ? "That fix doesn't match this problem's tags. The first try is the one that counts."
        : "That fix doesn't match the waste. The first try is the one that counts.";
      persistOpen(); render(); return;
    }
    t.step = 6;
  }
  persistOpen(); render();
}

// ---------- actions ----------
const actions = {
  // onboarding
  login: startLogin,
  "login-continue": () => api.loginContinue(),
  go: (el) => { const s = +el.dataset.step; if (s >= 1 && s <= 4) { ctx.step = s; render(); } },
  source: (el) => { selectSource(el.dataset.id); render(); },
  "use-import": () => {
    const list = parseImport(ctx.importText);
    if (!list.length) return;
    ctx.draft.custom = list; ctx.draft.sources = ["custom"]; ctx.draft.patterns = setPatterns(); ctx.step = 3; render();
  },
  pat: (el) => {
    const n = el.dataset.name, s = new Set(ctx.draft.patterns);
    s.has(n) ? s.delete(n) : s.add(n);
    ctx.draft.patterns = setPatterns().filter((x) => s.has(x));
    render();
  },
  "pat-all": () => { ctx.draft.patterns = setPatterns(); render(); },
  per: (el) => { ctx.draft.perPattern = +el.dataset.v; render(); },
  "pat-none": () => { ctx.draft.patterns = []; render(); },
  set: (el) => {
    const d = ctx.draft, k = el.dataset.k, v = el.dataset.v;
    if (k === "planMode" && v !== d.planMode) {
      if (v === "date") d.hoursManual = d.hoursPerDay;              // remember the user's own hours
      else if (d.hoursManual) d.hoursPerDay = d.hoursManual;        // and restore them when switching back
    }
    d[k] = k === "daysPerWeek" || k === "problemsPerDay" ? +v : v;
    if (k === "problemsPerDay") d.hoursPerDay = Math.max(0.5, Math.round((+v * 39 / 60) * 2) / 2);
    render();
  },
  finish: finishOnboarding,
  "cancel-plan": () => go("workspace"),

  // workspace
  open: (el) => { ctx.curSlug = el.dataset.slug; beginAttempt(el.dataset.slug); api.open(el.dataset.slug); render(); },
  mark: (el) => { const slug = el.dataset.slug, st = el.dataset.st;
    const block = R.manualMarkBlock(store.S.progress, slug, gating() && slug === ctx.curSlug);
    if (block) { flash(block); return; }
    const recording = P.status(slug) !== st;
    if (recording && !commitAttempt(slug, buildRecord(attemptFor(slug), st, { accepted: false, manual: true }, slug))) return;
    P.mark(slug, st);
    if (recording) reopen(slug);
    render(); },
  "think-hand": () => { const a = ctx.attempt; if (!a || !gating() || a.think.version !== 2) return; a.think.exampleResult = "unverified"; a.think.step = 2; a.nudge = ""; persistOpen(); render(); },
  "think-next": () => { const a = ctx.attempt; if (!a || !gating() || a.think.version !== 2) return; advanceThink(a); },
  "think-unlock": () => { const a = ctx.attempt; if (!a || !gating()) return;
    if (a.think.version === 2) {
      if ((a.think.edges || []).length < 2) { a.nudge = "Tick at least two edge cases."; render(); return; }
      a.think.gateMs = R.gateElapsed(a.think); a.nudge = ""; unlock(); return;
    }
    if (!a.facts) { a.nudge = "Checking problem details. You can also skip this step."; render(); return; }
    const { problems, patternRight, warning, unverifiable } = R.checkThink(a.think, a.facts);
    if (problems.length) { a.nudge = problems[0]; render(); return; }
    a.think.complexityWarning = warning || "";   // advisory only: a slow guess does not keep the editor locked
    if (unverifiable) { a.think.unverifiable = true; a.think.patternTries = 1; a.think.patternCorrect = false; unlock(); return; }
    a.think.patternTries++; a.think.patternCorrect = patternRight === true;
    if (patternRight === false && a.think.patternTries < 2) { a.nudge = "That pattern may not fit. Re-read the constraints and your brute force."; render(); return; }
    if (patternRight !== true) a.think.patternUnconfirmed = true;
    unlock(); },
  "think-skip": () => { if (!gating()) return; const t = ctx.attempt.think; t.skipped = true; if (t.version === 2) t.gateMs = R.gateElapsed(t); unlock(); },
  next: openNext,
  timer: toggleTimer,
  start: oneTapStart,
  "mark-cur": (el) => { markCurrent(el.dataset.st); },
  grade: (el) => { if (!ctx.accepted) return; ctx.accepted.selfGrade = el.dataset.v; render(); },
  "hub-plan": () => { store.saveNow(); api.openHub("plan"); },
  "accept-mark": (el) => { const a = ctx.accepted, st = el.dataset.st; if (!a) return;
    const own = attemptFor(a.slug);
    const v2 = own?.think?.version === 2;
    let explain;
    if (v2) {
      if (!a.selfGrade) { flash("Pick how close you were to the editorial."); return; }
      if (!R.COMPLEXITIES.includes(a.finalComplexity)) { flash("Pick the complexity of the code you submitted."); return; }
      if (a.selfGrade !== "matched" && !R.wordsOk(a.missed, 2)) { flash("Write one line on what you missed."); return; }
      own.think.finalComplexity = a.finalComplexity;
      own.think.selfGrade = a.selfGrade;
      own.think.missed = (a.missed || "").trim();
      explain = { why: a.finalComplexity, insight: a.selfGrade === "matched" ? "Matched the editorial." : own.think.missed };
    } else {
      if (!R.wordsOk(a.insight)) { flash("Write the key insight in a few words first."); return; }
      explain = { why: (a.why || "").trim(), insight: a.insight.trim() };
    }
    const elig = R.eligibility(buildRecord(own, st, { accepted: true, manual: false, explain }, a.slug));
    if (st === "a" && !elig.alone) { flash(elig.reasons[0] || "This one counts as needed help."); return; }
    const wasDue = !!(store.S.progress.redo?.[a.slug] && store.S.progress.redo[a.slug].due <= todayKey());
    if (!commitAttempt(a.slug, buildRecord(own, st, { accepted: true, manual: false, explain }, a.slug))) return;
    P.acceptResult(a.slug, st);
    const remains = !!store.S.progress.redo?.[a.slug];
    reopen(a.slug);
    ctx.accepted = null; flash(P.acceptToast(st, wasDue, remains)); },
  "accept-dismiss": () => { ctx.accepted = null; render(); },
  redo: (el) => { const slug = el.dataset.slug;
    const block = R.manualMarkBlock(store.S.progress, slug, gating() && slug === ctx.curSlug);
    if (block) { flash(block); return; }
    if (!commitAttempt(slug, buildRecord(attemptFor(slug), el.dataset.ok === "1" ? "a" : "h", { accepted: false, manual: true }, slug))) return;
    P.redoResult(slug, el.dataset.ok === "1"); reopen(slug); flash(el.dataset.ok === "1" ? "Nice. Next redo is scheduled further out." : "No problem. It comes back in 3 days."); },
  replan: () => { P.replan(); ctx.view = new Date(); flash("Re-planned from today. Your finish date moved, nothing was lost."); },
  "show-full": () => { ctx.showFull = true; render(); },
  "timer-reset": () => { T.reset(); syncFocus(); render(); },
  "timer-skip": () => { T.reset(); syncFocus(); render(); },
  energy: (el) => { P.dayLog().energy.push(+el.dataset.v); store.S.askEnergy = false; store.save(); render(); },
  tab: (el) => { ctx.tab = el.dataset.tab; render(); },
  day: (el) => { const d = +el.dataset.d; ctx.view = d === 0 ? new Date() : addDays(ctx.view, d); render(); },
  sidebar: toggleSidebar,
  "lc-back": () => api.back(),
  "lc-home": () => api.home(),
  hub: () => { store.saveNow(); api.openHub(); },
  "change-plan": () => editPlan(2),
  "plan-hours": () => editPlan(4),
  "plan-new": newPlan,
  "plan-reset": resetPlanProgress,
  "erase-all": eraseAll,
  "confirm-yes": () => { const c = ctx.confirm; ctx.confirm = null; c && c.run(); },
  "confirm-no": () => { ctx.confirm = null; render(); },
  logout: async () => { await api.logout(); ctx.authed = { signedIn: false }; render(); },
  "check-updates": async (el) => {
    if (typeof api.checkForUpdates !== "function") return;
    el.disabled = true;
    try { await api.checkForUpdates(); } catch { /* the status line shows the failure */ }
    try { ctx.about = await api.updateStatus(); } catch { /* keep the last status */ }
    paintAbout();
  },
  "install-update": async () => {
    store.saveNow();
    const r = await api.installUpdate();
    if (r && r.ok === false && r.reason === "busy" && ctx.about) {
      ctx.about = { ...ctx.about, ready: false, label: "Update ready. It installs after this session." };
      paintAbout();
    }
  },
};

document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-act]");
  if (!el || el.disabled) return;
  if (!el.closest(".tmore, .planmenu")) document.querySelectorAll("details.tmore[open], details.planmenu[open]").forEach((x) => x.removeAttribute("open"));
  const fn = actions[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el); }
});

// Escape closes the dialog or an open menu.
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (ctx.confirm) { ctx.confirm = null; render(); return; }
  document.querySelectorAll("details.tmore[open], details.planmenu[open]").forEach((x) => x.removeAttribute("open"));
});
// Clicking outside a menu closes it.
document.addEventListener("mousedown", (e) => {
  if (!e.target.closest(".tmore, .planmenu")) document.querySelectorAll("details.tmore[open], details.planmenu[open]").forEach((x) => x.removeAttribute("open"));
});

document.addEventListener("input", (e) => {
  const t = e.target;
  if (t.dataset?.think && ctx.attempt && t.tagName !== "SELECT") { ctx.attempt.think[t.dataset.think] = t.value; persistOpen(); }
  if (t.id === "exMissed" && ctx.accepted) { ctx.accepted.missed = t.value; persistOpen(); }
  if (t.id === "exWhy" && ctx.accepted) { ctx.accepted.why = t.value; persistOpen(); }
  if (t.id === "exInsight" && ctx.accepted) { ctx.accepted.insight = t.value; persistOpen(); }
  if (t.id === "import") { ctx.importText = t.value; const n = parseImport(t.value).length; const s = t.parentElement.querySelector(".muted"); if (s) s.textContent = `${n} problems recognised`; const b = t.parentElement.querySelector("[data-act=use-import]"); if (b) b.disabled = !n; }
  if (t.id === "hours") {                       // live update without re-rendering (keeps the slider dragging)
    ctx.draft.hoursPerDay = ctx.draft.hoursManual = +t.value;
    document.getElementById("hoursOut").textContent = t.value + " h";
    document.getElementById("summary").innerHTML = Onb.summaryHtml(ctx.draft);
  }
  if (t.id === "note") { P.dayLog().note = t.value; store.save(); }
  if (t.id === "coSearch") {                     // filter company cards in place
    ctx.coSearch = t.value;
    const q = t.value.trim().toLowerCase();
    document.querySelectorAll(".grid.co .pick").forEach((c) => { c.hidden = q && !c.dataset.name.includes(q); });
  }
});

document.addEventListener("change", (e) => {
  const t = e.target;
  if (t.dataset?.think && ctx.attempt && t.tagName === "SELECT") {
    ctx.attempt.think[t.dataset.think] = t.dataset.think === "pattern" ? (t.value === "" ? null : +t.value) : t.value;
    persistOpen();
    if (t.dataset.think === "complexity" || t.dataset.think === "bruteComplexity") render();
  }
  if (t.dataset?.edge && ctx.attempt?.think) {
    const edges = new Set(ctx.attempt.think.edges || []);
    t.checked ? edges.add(t.dataset.edge) : edges.delete(t.dataset.edge);
    ctx.attempt.think.edges = [...edges];
    persistOpen();
  }
  if (t.id === "finalCx" && ctx.accepted) {
    ctx.accepted.finalComplexity = t.value;
    const n = ctx.attempt?.facts?.n;
    ctx.accepted.finalWarn = R.fitsBudget(t.value, n) === "too-slow" ? `With n up to ${Number(n).toLocaleString("en-IN")}, ${t.value} may be too slow.` : "";
    render();
  }
  if (t.id === "targetDate" && t.value) { ctx.draft.targetDate = t.value; render(); }
  if (t.id === "startDate" && t.value) { ctx.draft.startDate = t.value; render(); }
  if (t.id === "skipSolved") { ctx.draft.skipSolved = t.checked; render(); }
  if (t.id === "premium") { ctx.draft.premium = t.checked; render(); }
  if (t.id === "preset") { const [w, b] = t.value.split("-").map(Number); T.setPreset(w, b); render(); }
  if (t.id === "focusBlock") { store.S.focusBlock = t.checked; store.save(); syncFocus(); render(); }
  if (t.id === "tTime") { store.S.tomorrow.time = t.value; store.save(); }
  if (t.id === "tPlace") { store.S.tomorrow.place = t.value; store.save(); }
});

// ---------- events from the main process ----------
api.onAuthProgress((p) => {
  if (p.browser) ctx.login.browser = p.browser;
  ctx.login.step = p.step;
  render();
});
api.onNeedLogin(() => {
  if (ctx.login.busy || ctx.authed.signedIn) return;
  api.home();
  if (ctx.route === "workspace") { flash("LeetCode's own login can't work inside the app. Opening your browser instead."); startLogin(); }
});
api.onUrl(async (u) => {
  const m = u.match(/leetcode\.com\/problems\/([^/?#]+)/);
  const slug = m ? m[1] : "";
  if (slug) beginAttempt(slug);
  if (!slug) api.cover(false).catch(() => {});
  // Opening the editorial or community solutions: note it, and warn if it's early.
  if (slug && /\/problems\/[^/]+\/(editorial|solutions)(\/|$|\?)/.test(u) && ctx.attempt && ctx.attempt.slug === slug && !ctx.attempt.sawAt && !(ctx.accepted && ctx.accepted.slug === slug)) {
    ctx.attempt.sawAt = Date.now();
    if (A.markSolutionSeen(solutionSeenMap(), slug, ctx.attempt.sawAt)) persistOpen(true);
    const mins = attemptMins();
    if (P.planned().some((p) => p.slug === slug)) flash(mins < 30
      ? `Solution opened after ${mins} min. Try 30 min alone first. If you read on, this one counts as "Help".`
      : `Solution opened after ${mins} min. Fair. Read the approach only, then code it yourself.`);
  }
  const typing = ["TEXTAREA", "INPUT"].includes((document.activeElement || {}).tagName);
  if (slug !== ctx.curSlug) { ctx.curSlug = slug; syncCover(); if (ctx.route === "workspace" && !typing) render(); }
  const a = await api.authStatus();
  if (a.signedIn !== ctx.authed.signedIn) { ctx.authed = a; if (!typing) render(); }
});
function onAccepted(slug) {
  const redo = P.redoDue().some(p => p.slug === slug);
  const p = P.planned().find(x => x.slug === slug) || P.redoDue().find(x => x.slug === slug);
  if (!p || (P.isDone(slug) && !redo) || ctx.route !== "workspace") return;
  const own = attemptFor(slug);
  const prior = own?.explain || store.S.progress.open?.[slug]?.explain || { why: "", insight: "" };
  const elig = R.eligibility(buildRecord(own, "a", { accepted: true, manual: false, explain: { why: (prior.why || "").trim(), insight: (prior.insight || "").trim() } }, slug));
  const blocked = elig.reasons.filter((r) => !/key insight|editorial self-grade/i.test(r));
  ctx.accepted = { slug, suggest: blocked.length ? "h" : "a", mins: own ? attemptMins() : 0, elig, blocked, why: prior.why || "", insight: prior.insight || "" }; render();
}
api.onAccepted(onAccepted);
api.onBlocked((u) => { let h = u; try { h = new URL(u).hostname; } catch {} flash(`Blocked ${h} during your focus block.`); });
api.onShortcut((a) => {
  if (ctx.route !== "workspace") return;
  ({ toggle: () => (store.S.timer.running || store.S.timer.mode === "break" ? toggleTimer() : oneTapStart()), alone: () => markCurrent("a"), help: () => markCurrent("h"), next: openNext, sidebar: toggleSidebar })[a]?.();
});

// ---------- timer loop ----------
setInterval(() => {
  const ev = T.tick();
  if (ev) {
    T.beep();
    const msg = { break: "Focus block done. Take your break.", "long-break": "4 blocks done. Take a long 20 minute break.", work: "Break over. Start the next block." }[ev];
    try { const n = new Notification("DSA Practice", { body: msg }); n.onclick = () => api.focusWindow?.(); } catch {}
    syncFocus(); render(); return;
  }
  const c = document.getElementById("clock");
  if (c) c.textContent = T.mmss(T.left());
  const ab = document.getElementById("aloneBar");
  if (ab && ctx.attempt) {
    const mins = Math.floor((Date.now() - ctx.attempt.start) / 60000);
    ab.style.width = Math.min(100, (mins / 30) * 100) + "%";
    const at = document.getElementById("aloneTxt");
    if (at) at.textContent = mins < 30 ? `${mins} min alone. Solution unlocks guilt-free at 30.` : `${mins} min. Stuck? Read the approach only, then code it yourself.`;
  }
  const r = document.getElementById("ring");
  if (r) r.setAttribute("stroke-dashoffset", T.ringOffset().toFixed(1));
  const gc = document.getElementById("gateClock");
  const think = ctx.attempt?.think;
  if (gc && think?.version === 2 && think.gateStarted && !ctx.attempt.unlocked) {
    gc.textContent = String(Math.floor(R.gateElapsed(think) / 60000)).padStart(2, "0") + ":" + String(Math.floor(R.gateElapsed(think) / 1000) % 60).padStart(2, "0");
    if (R.gateStuck(think) && !think.stuckShown) { think.stuckShown = true; render(); return; }
  }
  document.title = titleText();
}, 1000);

// ---------- sidebar resize ----------
const drag = document.getElementById("drag");
drag.addEventListener("mousedown", (e) => {
  if (ctx.route !== "workspace") return;
  e.preventDefault(); api.drag(true); document.body.classList.add("dragging");
  let raf = 0;
  const move = (ev) => {
    store.S.ui.width = Math.max(300, Math.min(560, ev.clientX));
    document.documentElement.style.setProperty("--sbw", store.S.ui.width + "px");
    if (!raf) raf = requestAnimationFrame(() => { raf = 0; api.layout({ mode: "workspace", width: store.S.ui.width, collapsed: false }); });
  };
  const up = () => {
    document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up);
    document.body.classList.remove("dragging");
    api.layout({ mode: "workspace", width: store.S.ui.width, collapsed: false }).then(() => api.drag(false));
    store.save();
  };
  document.addEventListener("mousemove", move); document.addEventListener("mouseup", up);
});
drag.addEventListener("dblclick", () => { store.S.ui.width = 380; store.save(); applyLayout(); });

// ---------- shared top bar: the other tabs open in the Hub ----------
document.getElementById("topnav")?.addEventListener("click", (e) => {
  const b = e.target.closest("[data-hub]");
  if (b) { store.saveNow(); api.openHub(b.dataset.hub); }
});

window.__flushSaves = () => store.saveNow();

// ---------- start ----------
(async () => {
  await store.load();
  ctx.authed = await api.authStatus();
  const u = await api.url();
  const m = (u || "").match(/leetcode\.com\/problems\/([^/?#]+)/);
  ctx.curSlug = m ? m[1] : "";
  beginAttempt(ctx.curSlug);
  // The Hub's Plan Mode leaves a setup note; build that plan here with this app's own engine (solved problems are kept).
  const hub = await api.hubLoad?.();
  if (hub) P.setHubDays([
    ...Object.entries(hub.progress?.sessions || {}).filter(([, r]) => r.status === "done").map(([id]) => id.split("#")[0]),
    ...Object.values(hub.progress?.quiz || {}).flat().map((q) => q.date),
  ]);
  const setup = hub && hub.dsaSetup;
  if (setup && setup.id && setup.id !== store.S.profile.hubSetupId && !String(setup.id).startsWith("practice:")) {
    const d = Onb.newDraft();
    Object.assign(d, { sources: setup.sources, patterns: setup.patterns, perPattern: setup.perPattern, hoursPerDay: setup.hoursPerDay,
      daysPerWeek: setup.daysPerWeek, startDate: setup.startDate, targetDate: setup.targetDate, planMode: "hours", skipSolved: true });
    if (commitPlan(d)) { store.S.profile.hubSetupId = setup.id; store.S.profile.problemsPerDay = setup.problemsPerDay; ctx.tab = "today"; }
  }
  store.S.profile.hubOwned = planOwnedByHub(hub);
  // Plans made before the company dataset (dataVersion 2) are rebuilt; progress is kept.
  if (store.S.profile.onboarded && store.S.profile.dataVersion === 2) {
    // Started from the Hub's DSA session: open the first unsolved problem (leftovers first, then today's).
    if (location.hash === "#next") { const p = P.nextUnsolved(""); if (p) { ctx.curSlug = p.slug; beginAttempt(p.slug); api.open(p.slug); } }
    ctx.attempt = null; beginAttempt(ctx.curSlug);
    go("workspace");
  }
  else { ctx.draft = Onb.newDraft(); ctx.step = ctx.authed.signedIn ? 2 : 1; go("onboarding"); }
})();

if (window.dsaDev) window.__dsa = { ctx, store, render };   // dev and tests only; packaged builds leave this unset
api.updateStatus?.().then((s) => { ctx.about = s; paintAbout(); }).catch(() => {});
api.onUpdateStatus?.((s) => { ctx.about = s; paintAbout(); });
