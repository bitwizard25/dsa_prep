// Controller: owns screen state, routes events to actions, and re-renders.
import { store, freshProfile } from "./core/state.js";
import * as P from "./core/practice.js";
import * as T from "./core/timer.js";
import * as Onb from "./screens/onboarding.js";
import * as Ws from "./screens/workspace.js";
import { parseImport, patternCounts, PATTERNS } from "./core/problems.js";
import { fmt, addDays } from "./core/dates.js";
import { silkUrl } from "./ui/silk.js";

// Silk textures, generated once.
document.documentElement.style.setProperty("--silk-hero", silkUrl({ seed: 4, ribbons: 3 }));
document.documentElement.style.setProperty("--silk-card", silkUrl({ seed: 9, ribbons: 2, sheen: 0.7 }));

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
};

// ---------- rendering + layout ----------
function render() {
  $app.innerHTML = (ctx.route === "onboarding" ? Onb.render(ctx) : Ws.render(ctx)) + confirmHtml();
  document.body.dataset.route = ctx.route;
  document.body.classList.toggle("collapsed", ctx.route === "workspace" && store.S.ui.collapsed);
}
function applyLayout() {
  const ui = store.S.ui, ws = ctx.route === "workspace";
  document.documentElement.style.setProperty("--sbw", ws ? (ui.collapsed ? 64 : ui.width) + "px" : "100%");
  api.layout({ mode: ws ? "workspace" : "onboarding", width: ui.width, collapsed: ui.collapsed });
}
function go(route) { ctx.route = route; applyLayout(); syncFocus(); render(); }

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
    queue: q.map((p) => p.slug), completed, planMode: d.planMode, targetDate: d.targetDate,
  };
  store.saveNow();
  return true;
}
// Plan changes made here (companies, hours, days) flow back to the Hub, so both sides plan from the same numbers.
const HUB_COMPANIES = ["google", "amazon", "microsoft", "meta", "flipkart", "uber", "servicenow"];
async function syncHub() {
  const hub = await api.hubLoad();
  if (!hub || !hub.goal) return;
  const p = store.S.profile;
  const ppd = Math.max(1, Math.round((p.hoursPerDay * 60) / 39));         // 39 min: the average problem at this app's mix
  hub.goal.problemsPerDay = ppd;
  hub.goal.daysPerWeek = +p.daysPerWeek || hub.goal.daysPerWeek;
  if ((p.sources || []).length === 1 && HUB_COMPANIES.includes(p.sources[0])) hub.goal.company = p.sources[0];
  const id = "practice:" + [(p.sources || []).join(","), p.hoursPerDay, p.daysPerWeek, p.queue.length, Date.now()].join("|");
  hub.dsaSetup = { ...(hub.dsaSetup || {}), id, problemsPerDay: ppd, sources: p.sources, hoursPerDay: p.hoursPerDay, daysPerWeek: p.daysPerWeek };
  p.problemsPerDay = ppd;                                                  // days hold this many problems, same as the Hub's number
  p.hubSetupId = id;                                                       // already applied here: don't re-apply it
  store.saveNow();
  await api.hubSave(hub);
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
      for (const p of P.planned()) { delete pr.status[p.slug]; delete pr.when[p.slug]; delete (pr.redo || {})[p.slug]; }
      const d = Onb.newDraft(); d.skipSolved = false; commitPlan(d);
      ctx.view = new Date(); render(); flash("Progress reset. The plan starts again from today.");
    } });
}
function eraseAll() {
  ask({ title: "Erase everything?", ok: "Erase everything", danger: true,
    body: "This can't be undone.",
    keeps: [[true, "your LeetCode login"], [false, "your plan, all solved marks, streak, notes and redo schedule"]],
    run: () => { store.reset(); editPlan(2); } });
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
  P.setMark(ctx.curSlug, st);
  flash(`Marked "${known.title}" as ${st === "a" ? "solved alone" : "needed help"}. Ctrl+Alt+N for the next one.`);
}
function toggleTimer() { T.toggle(); ctx.showFull = false; syncFocus(); render(); }

// One tap: open the next problem (unless you're already on an unsolved one) and start the focus timer.
function oneTapStart() {
  const onPlanned = P.planned().some((p) => p.slug === ctx.curSlug && !P.isDone(p.slug)) || P.redoDue().some((p) => p.slug === ctx.curSlug);
  if (!onPlanned) { const p = P.nextUnsolved(ctx.curSlug); if (p) { ctx.curSlug = p.slug; api.open(p.slug); beginAttempt(p.slug); } }
  if (!store.S.timer.running) T.toggle();
  ctx.showFull = false; syncFocus(); render();
}

function beginAttempt(slug) {
  if (!slug || (ctx.attempt && ctx.attempt.slug === slug)) return;
  ctx.attempt = { slug, start: Date.now(), sawAt: null };
}
const attemptMins = () => (ctx.attempt ? Math.max(0, Math.round((Date.now() - ctx.attempt.start) / 60000)) : 0);
function toggleSidebar() { store.S.ui.collapsed = !store.S.ui.collapsed; store.save(); applyLayout(); render(); }

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
    d[k] = k === "daysPerWeek" ? +v : v;
    render();
  },
  finish: finishOnboarding,
  "cancel-plan": () => go("workspace"),

  // workspace
  open: (el) => { ctx.curSlug = el.dataset.slug; beginAttempt(el.dataset.slug); api.open(el.dataset.slug); render(); },
  mark: (el) => { P.mark(el.dataset.slug, el.dataset.st); render(); },
  next: openNext,
  timer: toggleTimer,
  start: oneTapStart,
  "mark-cur": (el) => { markCurrent(el.dataset.st); },
  "accept-mark": (el) => { P.setMark(ctx.accepted.slug, el.dataset.st); ctx.accepted = null; flash(el.dataset.st === "a" ? "Marked as solved alone." : "Marked as needed help. It comes back for a redo in 3 days."); },
  "accept-dismiss": () => { ctx.accepted = null; render(); },
  redo: (el) => { P.redoResult(el.dataset.slug, el.dataset.ok === "1"); flash(el.dataset.ok === "1" ? "Nice. Next redo is scheduled further out." : "No problem. It comes back in 3 days."); },
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
  hub: () => api.openHub(),
  "change-plan": () => editPlan(2),
  "plan-hours": () => editPlan(4),
  "plan-new": newPlan,
  "plan-reset": resetPlanProgress,
  "erase-all": eraseAll,
  "confirm-yes": () => { const c = ctx.confirm; ctx.confirm = null; c && c.run(); },
  "confirm-no": () => { ctx.confirm = null; render(); },
  logout: async () => { await api.logout(); ctx.authed = { signedIn: false }; render(); },
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
  // Opening the editorial or community solutions: note it, and warn if it's early.
  if (slug && /\/problems\/[^/]+\/(editorial|solutions)(\/|$|\?)/.test(u) && ctx.attempt && ctx.attempt.slug === slug && !ctx.attempt.sawAt) {
    ctx.attempt.sawAt = Date.now();
    const mins = attemptMins();
    if (P.planned().some((p) => p.slug === slug)) flash(mins < 30
      ? `Solution opened after ${mins} min. Try 30 min alone first. If you read on, this one counts as "Help".`
      : `Solution opened after ${mins} min. Fair. Read the approach only, then code it yourself.`);
  }
  const typing = ["TEXTAREA", "INPUT"].includes((document.activeElement || {}).tagName);
  if (slug !== ctx.curSlug) { ctx.curSlug = slug; if (ctx.route === "workspace" && !typing) render(); }
  const a = await api.authStatus();
  if (a.signedIn !== ctx.authed.signedIn) { ctx.authed = a; if (!typing) render(); }
});
api.onAccepted((slug) => {
  const p = P.planned().find((x) => x.slug === slug);
  if (!p || P.isDone(slug) || ctx.route !== "workspace") return;
  const saw = ctx.attempt && ctx.attempt.slug === slug && ctx.attempt.sawAt;
  ctx.accepted = { slug, suggest: saw ? "h" : "a", mins: ctx.attempt && ctx.attempt.slug === slug ? attemptMins() : 0 };
  render();
});
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
    try { new Notification("DSA Practice", { body: msg }); } catch {}
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
  document.title = (store.S.timer.running ? T.mmss(T.left()) + " " : "") + "DSA Practice";
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
  if (b) api.openHub(b.dataset.hub);
});

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
  if (setup && setup.id !== store.S.profile.hubSetupId) {
    const d = Onb.newDraft();
    Object.assign(d, { sources: setup.sources, patterns: setup.patterns, perPattern: setup.perPattern, hoursPerDay: setup.hoursPerDay,
      daysPerWeek: setup.daysPerWeek, startDate: setup.startDate, targetDate: setup.targetDate, planMode: "hours", skipSolved: true });
    if (commitPlan(d)) { store.S.profile.hubSetupId = setup.id; store.S.profile.problemsPerDay = setup.problemsPerDay; store.saveNow(); ctx.tab = "today"; }
  }
  // Plans made before the company dataset (dataVersion 2) are rebuilt; progress is kept.
  if (store.S.profile.onboarded && store.S.profile.dataVersion === 2) {
    // Started from the Hub's DSA session: open the first unsolved problem (leftovers first, then today's).
    if (location.hash === "#next") { const p = P.nextUnsolved(""); if (p) { ctx.curSlug = p.slug; beginAttempt(p.slug); api.open(p.slug); } }
    go("workspace");
  }
  else { ctx.draft = Onb.newDraft(); ctx.step = ctx.authed.signedIn ? 2 : 1; go("onboarding"); }
})();

window.__dsa = { ctx, store, render };   // handy for debugging in DevTools
