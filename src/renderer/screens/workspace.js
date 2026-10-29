// Main practice view: the sidebar next to LeetCode.
import { ICON } from "../ui/icons.js";
import { esc, bar, problemList, diffPills } from "../ui/components.js";
import { store } from "../core/state.js";
import * as P from "../core/practice.js";
import * as T from "../core/timer.js";
import * as R from "../core/reasoning.js";
import { sourceName, patternCounts, DATA_DATE, PATTERNS } from "../core/problems.js";
import { pretty, todayKey, fmt, addDays, diffDays } from "../core/dates.js";

const srcName = () => sourceName(store.S.profile.sources);

// The plan name in the header is the way into every plan action.
function planMenu() {
  const lo = P.leftovers().length;
  return `<details class="planmenu"><summary class="chip" title="Plan options">${esc(srcName())}<span class="caret">${ICON.fwd}</span></summary>
    <div class="pop">
      <button data-act="change-plan">${ICON.target}<span><b>Edit companies & patterns</b><small>Keeps everything you've solved</small></span></button>
      <button data-act="plan-hours">${ICON.clock}<span><b>Adjust hours & days</b><small>Same problems, new schedule</small></span></button>
      ${lo ? `<button data-act="replan">${ICON.next}<span><b>Re-plan from today</b><small>Move ${lo} leftover${lo === 1 ? "" : "s"} forward</small></span></button>` : ""}
      <hr>
      <button data-act="plan-new">${ICON.spark}<span><b>Start a new plan</b><small>Solved history stays</small></span></button>
      <button data-act="plan-reset" class="warn">${ICON.back}<span><b>Reset this plan's progress</b><small>Clears marks, restarts from today</small></span></button>
    </div></details>`;
}

function timerBar() {
  const L = P.dayLog(), m = T.mode(), t = store.S.timer;
  const label = m === "break" ? "Break" : m === "focus" ? (T.inFocus() ? "Focus, lock on" : "Focus") : "Ready";
  const preset = `${store.S.pomo.work}-${store.S.pomo.brk}`;
  return `<section class="tbar m-${m}" aria-label="Focus timer">
    <div class="mring"><svg viewBox="0 0 200 200" aria-hidden="true">
      <defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#EF4444"/><stop offset="1" stop-color="#991B1B"/></linearGradient></defs>
      <circle class="track" cx="100" cy="100" r="88"/>
      <circle class="prog" id="ring" cx="100" cy="100" r="88" stroke-dasharray="${T.RING.toFixed(1)}" stroke-dashoffset="${T.ringOffset().toFixed(1)}"/></svg></div>
    <div class="tinfo"><span class="clock" id="clock">${T.mmss(T.left())}</span>
      <span class="tlabel">${label}, ${L.pomos} block${L.pomos === 1 ? "" : "s"} today</span></div>
    ${!t.running && t.mode === "work"
      ? `<button class="play wide" data-act="start" title="Opens your next problem and starts the timer (Ctrl+Alt+P)">${ICON.play}Start</button>`
      : `<button class="play" data-act="timer" aria-label="${t.running ? "Pause" : "Resume"} timer" title="Start / pause (Ctrl+Alt+P)">${t.running ? ICON.pause : ICON.play}</button>`}
    <details class="tmore"><summary aria-label="Timer options" title="Timer options">${ICON.dots}</summary>
      <div class="pop">
        <button class="ghost" data-act="${t.mode === "break" ? "timer-skip" : "timer-reset"}">${t.mode === "break" ? "Skip break" : "Reset timer"}</button>
        <label class="field"><span>Length</span><select id="preset">
          ${[["25-5", "25 min focus, 5 break"], ["45-10", "45 min focus, 10 break"], ["50-10", "50 min focus, 10 break"]]
            .map(([v, l]) => `<option value="${v}" ${preset === v ? "selected" : ""}>${l}</option>`).join("")}
        </select></label>
      </div></details>
  </section>`;
}

function tracker() {
  const st = P.stats();
  const pace = st.behind ? `<span class="bad">${st.behind} behind</span>` : st.ahead ? `<span class="good">+${st.ahead} ahead</span>` : `<span class="good">on track</span>`;
  const today = st.todayTotal ? `<span><b>${st.todayDone}</b>/${st.todayTotal} today</span>` : `<span class="muted">Rest day</span>`;
  return `<div class="tracker">
    <div class="trow"><span class="streak">${ICON.flame}<b>${P.streak()}</b> day streak</span>${today}${pace}</div>
    <div class="overall">${bar(st.alone, st.help, st.total)}<span>${st.done}/${st.total}</span></div>
  </div>`;
}

function note(ctx) {
  const L = P.dayLog(), en = P.energy();
  if (ctx.login.busy) return `<div class="note"><b>Logging in through ${esc(ctx.login.browser || "your browser")}</b>
      <p class="muted">Log in on that window, then close it. The app picks it up automatically.</p>
      <button class="ghost sm" data-act="login-continue">I logged in and closed it</button></div>`;
  if (ctx.accepted) {
    const a = ctx.accepted, p = P.planned().find((x) => x.slug === a.slug) || P.problemOf(a.slug) || { title: a.slug };
    const blocked = a.blocked || [];
    return `<div class="note accepted"><b>Accepted: ${esc(p.title)}${a.mins ? ` in ${a.mins} min` : ""}</b>
      ${ctx.flash ? `<p class="think-nudge" role="status">${esc(ctx.flash)}</p>` : ""}
      <label class="ex"><span>Why does it work? <small>(optional)</small></span><textarea id="exWhy" rows="2">${esc(a.why)}</textarea></label>
      <label class="ex"><span>Key insight <small>(you'll see this on the redo)</small></span><textarea id="exInsight" rows="2">${esc(a.insight)}</textarea></label>
      ${blocked.length ? `<p class="think-nudge" role="status">Counts as Help: ${esc(blocked.join(", ").toLowerCase())}.</p>` : ""}
      <div class="row"><button class="btn ${blocked.length ? "" : "primary"} sm" data-act="accept-mark" data-st="a" ${blocked.length ? "disabled" : ""}>Solved alone</button>
      <button class="btn ${blocked.length ? "primary" : ""} sm" data-act="accept-mark" data-st="h">Needed help</button>
      <button class="textbtn" data-act="accept-dismiss">Not now</button></div></div>`;
  }

  if (store.S.askEnergy) return `<div class="note ask"><span>Energy right now?</span><div class="energy">${[1, 2, 3, 4, 5].map((n) => `<button data-act="energy" data-v="${n}" aria-label="Energy ${n} of 5">${n}</button>`).join("")}</div><small>1 drained, 5 sharp</small></div>`;
  if (ctx.flash) return `<div class="note">${esc(ctx.flash)}</div>`;
  if (!ctx.authed.signedIn) return `<div class="note warn split"><span><b>Not connected to LeetCode.</b></span><button class="btn primary sm" data-act="login">Log in</button></div>`;
  if (en.lowTwice) return `<div class="note warn">Energy low twice in a row. Switch to easy problems or the redo list, or stop for today.</div>`;
  if (L.pomos >= 6) return `<div class="note warn">${L.pomos} focus blocks today. Review only, then stop.</div>`;
  if (P.missedYesterday()) return `<div class="note warn">You missed yesterday. Never miss twice: 1 block and 2 problems at least.</div>`;
  if (store.S.timer.mode === "break") return `<div class="note calm">${esc(T.BREAK_TIPS[L.pomos % T.BREAK_TIPS.length])}</div>`;
  return "";
}

// Before the editor opens: four questions, answered while reading the statement on the left.
function thinkPanel(ctx) {
  const a = ctx.attempt, t = a.think, f = a.facts;
  const prob = P.problemOf(a.slug) || { title: a.slug };
  const budget = f && f.n ? `n up to ${f.n.toLocaleString("en-IN")}: aim for ${R.budgetFor(f.n)} or better.` : f ? "Constraints unavailable: read them in the problem statement." : "Reading the constraints…";
  const warning = f ? R.checkThink(t, f).warning : "";
  const sel = (k, opts, cur, ph) => `<select data-think="${k}" aria-label="${ph}"><option value="">${ph}</option>${opts.map(([v, l]) => `<option value="${v}" ${String(cur) === String(v) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
  return `<div class="think" aria-live="polite">
    <span class="eyebrow">Think first</span>
    <h2>${esc(prob.title)}</h2>
    <p class="muted">The editor opens once you've reasoned it out.</p>
    ${f && f.unverifiable ? `<p class="think-warn" role="status">This problem isn't in the checked set. You can still do Think-first, but it can't count as solved alone.</p>` : ""}
    <label><b>1. Constraints and target</b><small>${esc(budget)}</small>${sel("complexity", R.COMPLEXITIES.map((c) => [c, c]), t.complexity, "Time complexity you're aiming for")}</label>
    <label><b>2. Brute force</b><small>The simplest thing that works, and its cost.</small><textarea data-think="brute" rows="2">${esc(t.brute)}</textarea></label>
    <label><b>3. What it wastes</b><small>The work it repeats or throws away.</small><textarea data-think="waste" rows="2">${esc(t.waste)}</textarea></label>
    <label><b>4. Pattern</b><small>Which of the 14 removes that waste?</small>${sel("pattern", PATTERNS.map((p, i) => [i, p]), t.pattern === null ? "" : t.pattern, "Pick a pattern")}</label>
    ${warning ? `<p class="think-warn" role="status">${esc(warning)}</p>` : ""}
    ${a.nudge ? `<p class="think-nudge" role="alert">${esc(a.nudge)}</p>` : ""}
    <div class="row"><button class="btn primary" data-act="think-unlock">Unlock editor</button></div>
    <button class="textbtn" data-act="think-skip">Skip Think-first (won't count as solved alone)</button>
  </div>`;
}

// ---------- tabs ----------
// During a focus block: only the current problem, how long you've been on it, and what's next.
function focusPanel(ctx) {
  const all = P.planned(), cur = all.find((p) => p.slug === ctx.curSlug) || P.redoDue().find((p) => p.slug === ctx.curSlug);
  const next = P.nextUnsolved(ctx.curSlug);
  const mins = ctx.attempt && ctx.attempt.slug === ctx.curSlug ? Math.floor((Date.now() - ctx.attempt.start) / 60000) : 0;
  const pct = Math.min(100, (mins / 30) * 100);
  const curHtml = cur ? `<div class="focuscard">
      <span class="eyebrow">Now solving</span>
      <h2>${esc(cur.title)}</h2>
      <p class="meta"><span class="t-${cur.d}">${({ E: "Easy", M: "Medium", H: "Hard" })[cur.d] || ""}</span>, ${esc(cur.pattern || "")}</p>
      ${ctx.attempt?.slug === cur.slug && ctx.attempt.gate && !ctx.attempt.think.skipped && ctx.attempt.think.complexity ? `<p class="myplan"><b>Your plan:</b> ${esc(ctx.attempt.think.complexity)}, ${esc(PATTERNS[ctx.attempt.think.pattern] || "")}</p>` : ""}
      <div class="alone"><div class="abar"><i id="aloneBar" style="width:${pct}%"></i></div>
        <span id="aloneTxt">${mins < 30 ? `${mins} min alone. Solution unlocks guilt-free at 30.` : `${mins} min. Stuck? Read the approach only, then code it yourself.`}</span></div>
      <div class="row"><button class="btn primary sm" data-act="mark-cur" data-st="a">Solved alone</button><button class="btn sm" data-act="mark-cur" data-st="h">Needed help</button></div>
    </div>` : `<div class="focuscard empty"><p>Open a problem from your plan, or press Next.</p></div>`;
  return `${curHtml}
    ${next ? `<button class="upnext" data-act="next"><span class="eyebrow">Up next</span><b>${esc(next.title)}</b><span class="t-${next.d}">${({ E: "Easy", M: "Medium", H: "Hard" })[next.d] || ""}</span>${ICON.fwd}</button>` : ""}
    <button class="textbtn" data-act="show-full">Show today's full list</button>`;
}

function redoRow(p, curSlug) {
  return `<li class="item redo ${p.slug === curSlug ? "cur" : ""}"><span class="dot d-${p.d}"></span>
    <div class="body"><button class="link" data-act="open" data-slug="${p.slug}">${esc(p.title)}</button>
      <span class="meta">Redo ${p.redo.stage + 1} of ${P.REDO_STAGES}, from a blank editor</span></div>
    <div class="seg"><button class="a" data-act="redo" data-slug="${p.slug}" data-ok="1" title="Solved it alone this time">Got it</button>
      <button class="h" data-act="redo" data-slug="${p.slug}" data-ok="0" title="Still needed help">Stuck</button></div></li>`;
}

function tabToday(ctx) {
  if (T.inFocus() && !ctx.showFull && fmt(ctx.view) === todayKey()) return focusPanel(ctx);
  const ds = P.days(), t = todayKey();
  const viewKey = fmt(ctx.view), isToday = viewKey === t;
  const day = ds.find((d) => d.date === viewKey);
  let h = "";
  if (isToday) {
    const lo = P.leftovers();
    if (lo.length) h += `<div class="replan"><div><b>${lo.length} left from earlier days</b><span>Move them forward instead of stacking them on today.</span></div>
      <button class="btn primary sm" data-act="replan">Re-plan from today</button></div>
      <details class="leftover"><summary>Show them <span class="count">${lo.length}</span></summary>${problemList(lo, ctx.curSlug)}</details>`;
    const due = P.redoDue();
    if (due.length) h += `<details class="redobox" open><summary>Redo today <span class="count">${due.length}</span></summary><ul class="list">${due.map((p) => redoRow(p, ctx.curSlug)).join("")}</ul></details>`;
  }
  const idx = day ? ds.indexOf(day) : -1;
  const title = isToday ? "Today" : pretty(ctx.view);
  let sub;
  if (day) sub = `Day ${idx + 1} of ${ds.length}: ${esc([...new Set(day.items.map((p) => p.pattern))].join(" + "))}`;
  else if (ds.length && viewKey < ds[0].date) sub = "Before your plan starts";
  else if (ds.length && viewKey > ds[ds.length - 1].date) sub = "After your plan ends";
  else sub = "Rest day";
  h += `<div class="dayhead">
    <button class="icon sm" data-act="day" data-d="-1" aria-label="Previous day">${ICON.back}</button>
    <div class="dtitle"><h2>${title}</h2><span>${sub}</span></div>
    <button class="icon sm" data-act="day" data-d="1" aria-label="Next day">${ICON.fwd}</button>
    ${isToday ? `<button class="nextsm" data-act="next" title="Next unsolved (Ctrl+Alt+N)">${ICON.next}Next</button>` : `<button class="nextsm" data-act="day" data-d="0">Today</button>`}
  </div>`;
  if (day) {
    const a = day.items.filter((p) => P.status(p.slug) === "a").length, hp = day.items.filter((p) => P.status(p.slug) === "h").length;
    h += `<div class="progrow">${bar(a, hp, day.items.length)}<span>${a + hp}/${day.items.length}</span><span class="mins">${Math.round(day.minutes / 6) / 10} h</span></div>${problemList(day.items, ctx.curSlug)}`;
  } else h += `<p class="empty">${sub === "Rest day" ? "Rest day. Review the redo list if you want, then rest properly." : "No problems scheduled for this day."}</p>`;
  return h;
}

function tabPlan() {
  const p = store.S.profile, st = P.stats(), q = P.planned();
  const counts = patternCounts(q);
  const next7 = P.days().filter((d) => d.date >= todayKey()).slice(0, 7);
  return `<div class="plancard">
      <div class="pc-top"><span class="chip">${esc(srcName())}</span>
        <span class="row"><button class="btn sm" data-act="plan-hours">Adjust hours</button><button class="btn primary sm" data-act="change-plan">Edit plan</button></span></div>
      <div class="pc-grid">
        <div><b>${st.finish ? pretty(st.finish) : "-"}</b><span>finish date</span></div>
        <div><b>${p.hoursPerDay} h</b><span>per day</span></div>
        <div><b>${p.daysPerWeek}</b><span>days a week</span></div>
        <div><b class="${st.pace >= 0 ? "good" : "bad"}">${st.pace > 0 ? "+" + st.pace : st.pace}</b><span>${st.pace < 0 ? "behind" : st.pace > 0 ? "ahead" : "on track"}</span></div>
      </div></div>
    <h3 class="sub">Next 7 study days</h3>
    <div class="week">${next7.map((d) => `<div class="wd ${d.date === todayKey() ? "now" : ""}"><span>${pretty(d.date, { weekday: "short" })}</span><b>${d.items.length}</b><small>${Math.round(d.minutes / 6) / 10}h</small></div>`).join("") || `<p class="empty">Plan complete.</p>`}</div>
    <h3 class="sub">Patterns</h3>
    ${counts.map((c) => {
      const items = q.filter((x) => x.pattern === c.name);
      const a = items.filter((x) => P.status(x.slug) === "a").length, h = items.filter((x) => P.status(x.slug) === "h").length;
      return `<div class="patline"><div class="pl-top"><b>${esc(c.name)}</b><span>${a + h}/${c.total}</span></div>${bar(a, h, c.total)}${diffPills(c)}</div>`;
    }).join("")}
    <div class="resetrow"><button class="textbtn" data-act="plan-new">Start a new plan</button><button class="textbtn warn" data-act="plan-reset">Reset this plan's progress</button></div>
    <p class="legend"><i class="a"></i>solved alone <i class="h"></i>needed help <i class="dotl"></i>asked in the last 3 months</p>
    ${store.S.profile.sources.length > 1 ? `<p class="muted">Company names on a problem mean only those companies ask it. No name means all of your companies do.</p>` : ""}`;
}

function tabRedo(ctx) {
  const all = P.redoAll(), t = todayKey();
  if (!all.length) return `<p class="empty">Nothing to redo. Problems you mark "Needed help" come back here after 3, 10 and 30 days.</p>`;
  return `<p class="muted">Each problem you needed help on comes back after 3, 10 and 30 days. Solve it from a blank editor; "Got it" moves it to the next gap.</p>
    <ul class="list">${all.map((p) => p.redo.due <= t ? redoRow(p, ctx.curSlug)
      : `<li class="item later"><span class="dot d-${p.d}"></span><div class="body"><button class="link" data-act="open" data-slug="${p.slug}">${esc(p.title)}</button>
         <span class="meta">Redo ${p.redo.stage + 1} of ${P.REDO_STAGES} on ${pretty(p.redo.due)}</span></div></li>`).join("")}</ul>`;
}

function tabLog() {
  const L = P.dayLog(), tm = store.S.tomorrow;
  return `<label class="field"><span>What did you learn today, and which problem starts tomorrow?</span><textarea id="note">${esc(L.note)}</textarea></label>
    <div class="row2"><label class="field"><span>Tomorrow I start at</span><input type="time" id="tTime" value="${esc(tm.time)}"></label>
      <label class="field"><span>at</span><input type="text" id="tPlace" placeholder="my desk" value="${esc(tm.place)}"></label></div>
    <h3 class="sub">Rules that keep you consistent</h3>
    <ol class="tips">
      <li><b>Decide the start the night before.</b> No morning debate.</li>
      <li><b>Hardest work first.</b> New problems in your first 2 blocks.</li>
      <li><b>30 minutes alone</b> before any solution. Mark "Help" honestly.</li>
      <li><b>Minimum day:</b> 1 block and 2 problems on bad days. Never zero.</li>
      <li><b>Never miss twice in a row.</b></li>
      <li><b>Breaks away from screens.</b> Scrolling is not rest.</li>
      <li><b>Two low energy scores:</b> stop or switch to easy work.</li>
      <li><b>Protect sleep.</b> That's when learning is stored.</li>
    </ol>`;
}

function tabSettings(ctx) {
  const a = ctx.authed;
  return `<h3 class="sub">LeetCode account</h3>
    <div class="acct ${a.signedIn ? "ok" : "no"}">${a.signedIn ? ICON.check : ICON.user}<span>${a.signedIn ? `Connected${a.username ? ` as <b>${esc(a.username)}</b>` : ""}` : "Not connected"}</span>
      ${a.signedIn ? `<button class="btn sm" data-act="logout">Log out</button>` : `<button class="btn primary sm" data-act="login">Log in</button>`}</div>
    <h3 class="sub">Focus</h3>
    <label class="check"><input type="checkbox" id="focusBlock" ${store.S.focusBlock ? "checked" : ""}> Block non-LeetCode sites during focus blocks</label>
    <h3 class="sub">Keyboard shortcuts</h3>
    <ul class="keys">
      <li><kbd>Ctrl Alt P</kbd>Start or pause the timer</li>
      <li><kbd>Ctrl Alt A</kbd>Mark the open problem "Alone"</li>
      <li><kbd>Ctrl Alt H</kbd>Mark the open problem "Help"</li>
      <li><kbd>Ctrl Alt N</kbd>Open the next unsolved problem</li>
      <li><kbd>Ctrl Alt B</kbd>Collapse or expand the sidebar</li>
      <li><kbd>Ctrl Alt S</kbd>Back to your study plan</li>
    </ul>
    <p class="muted">Drag the sidebar's right edge to resize. Double-click it to reset.</p>
    <h3 class="sub">Data</h3>
    <p class="muted">Company tags: LeetCode, as of ${DATA_DATE}. The list is not updated from the network. Your plan: ${store.S.profile.perPattern || "-"} problems per pattern${store.S.profile.premium ? ", Premium included" : ""}.</p>
    <p class="muted">The editor cover is only a reminder. It does not prove you solved a problem alone.</p>
    <h3 class="sub">Plan</h3>
    <div class="setbtns">
      <button class="btn sm" data-act="change-plan">Edit companies & patterns</button>
      <button class="btn sm" data-act="plan-hours">Adjust hours & days</button>
      <button class="btn sm" data-act="plan-new">Start a new plan</button>
      <button class="btn sm" data-act="plan-reset">Reset this plan's progress</button>
    </div>
    <h3 class="sub">Danger zone</h3>
    <button class="btn danger sm" data-act="erase-all">Erase everything</button>`;
}

const TABS = [["today", "Problems"], ["plan", "Plan"], ["redo", "Redo"], ["log", "Log"], ["settings", "Settings"]];

// Shown after unlock, outside the focus panel, so a break (or a paused timer) cannot hide it.
function reviewNotes(ctx) {
  const a = ctx.attempt;
  if (!a || a.slug !== ctx.curSlug || !a.unlocked) return "";
  const warn = a.think && a.think.complexityWarning;
  const text = P.lastInsight(a.slug);
  if (!warn && !text) return "";
  return `<div class="review-notes">
    ${warn ? `<p class="think-warn" role="status">${esc(warn)}</p>` : ""}
    ${text ? `<details class="insight" open><summary>Your insight from last time</summary><p>${esc(text)}</p></details>` : ""}
  </div>`;
}

export function render(ctx) {
  if (store.S.ui.collapsed) return renderMini(ctx);
  const di = P.currentDayIndex(), ds = P.days();
  const day = di >= 0 ? ds[di] : null;
  const pattern = day ? [...new Set(day.items.map((p) => p.pattern))][0] : "Your plan";
  const redoN = P.redoDue().length;
  const gatingNow = ctx.attempt && ctx.attempt.gate && !ctx.attempt.unlocked && ctx.attempt.slug === ctx.curSlug;
  const content = gatingNow ? thinkPanel(ctx) : { today: tabToday, plan: tabPlan, redo: tabRedo, log: tabLog, settings: tabSettings }[ctx.tab](ctx);
  return `<div class="ws">
    <header class="top">
      <div class="hgroup">${planMenu()}<h1>${esc(pattern)}</h1></div>
      <div class="navbtns">
        <button class="icon" data-act="lc-back" aria-label="Back in LeetCode" title="Back">${ICON.back}</button>
        <button class="icon" data-act="lc-home" aria-label="LeetCode problem list" title="Problem list">${ICON.list}</button>
        <button class="icon" data-act="sidebar" aria-label="Collapse sidebar" title="Collapse (Ctrl+Alt+B)">${ICON.panel}</button>
      </div>
    </header>
    ${timerBar()}
    ${tracker()}
    ${note(ctx)}
    ${reviewNotes(ctx)}
    <nav class="tabs" role="tablist">${TABS.map(([k, l]) => `<button role="tab" aria-selected="${ctx.tab === k}" class="${ctx.tab === k ? "on" : ""}" data-act="tab" data-tab="${k}">${l}${k === "redo" && redoN ? `<i>${redoN}</i>` : ""}</button>`).join("")}</nav>
    <div class="panel">${content}</div>
  </div>`;
}

function renderMini(ctx) {
  const m = T.mode(), t = store.S.timer;
  const alert = ctx.flash || store.S.askEnergy || !ctx.authed.signedIn;
  return `<div class="mini m-${m}">
    <button class="icon" data-act="sidebar" aria-label="Expand sidebar" title="Expand (Ctrl+Alt+B)">${ICON.panel}</button>
    <span class="mini-mode">${m === "break" ? "Break" : m === "focus" ? "Focus" : "Ready"}</span>
    <span class="mini-clock" id="clock">${T.mmss(T.left())}</span>
    <button class="play" data-act="timer" aria-label="${t.running ? "Pause" : "Start"} timer">${t.running ? ICON.pause : ICON.play}</button>
    <button class="icon" data-act="next" aria-label="Next unsolved problem" title="Next unsolved (Ctrl+Alt+N)">${ICON.next}</button>
    <span class="mini-stat"><b>${P.doneOn(todayKey())}</b>today</span>
    <span class="mini-stat"><b>${P.streak()}</b>streak</span>
    ${alert ? `<button class="mini-alert" data-act="sidebar" title="Something needs your attention">!</button>` : ""}
  </div>`;
}
