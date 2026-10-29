// First-run flow, full window: 1 Connect LeetCode, 2 Pick target, 3 Pick patterns, 4 Set schedule.
import { ICON } from "../ui/icons.js";
import { esc, monogram, diffPills } from "../ui/components.js";
import { SOURCES, buildSet, patternCounts, parseImport, PATTERNS, sourceName, DATA_DATE, ALL, isCompanyPlan, coverage } from "../core/problems.js";
import { summarize, hoursNeeded, COST } from "../core/plan.js";
import { store } from "../core/state.js";
import { todayKey, pretty, addDays, fmt } from "../core/dates.js";

const STEPS = [["Connect", ICON.user], ["Target", ICON.target], ["Patterns", ICON.layers], ["Schedule", ICON.clock]];

/** The full set for the draft's company and size, before the pattern filter. */
export const draftSet = (d) => buildSet(d.sources, { perPattern: d.perPattern, premium: d.premium, custom: d.custom });

/** Problems for the draft, after the pattern filter and the "skip solved" option. */
export function draftQueue(d) {
  const pats = new Set(d.patterns), solved = store.S.progress.status;
  return draftSet(d).filter((p) => pats.has(p.pattern) && !(d.skipSolved && solved[p.slug]));
}

export function newDraft() {
  const p = store.S.profile;
  const prev = (p.sources && p.sources.length ? p.sources : p.source ? [p.source] : [])
    .filter((id) => id === "custom" || SOURCES.some((s) => s.id === id));
  const known = prev.length > 0;
  return {
    sources: prev, custom: p.custom || [], patterns: known ? p.patterns.slice() : PATTERNS.slice(), skipSolved: true,
    perPattern: p.perPattern || 30, premium: !!p.premium,
    hoursPerDay: p.hoursPerDay || 3, daysPerWeek: p.daysPerWeek || 6,
    startDate: todayKey(), planMode: p.planMode || "hours",
    targetDate: p.targetDate || fmt(addDays(new Date(), 28)),
  };
}

// ---------- step 1 ----------
function stepConnect(ctx) {
  const L = ctx.login;
  const name = L.browser || "Chrome";
  let body;
  if (ctx.authed.signedIn) {
    body = `<div class="connected">
        <div class="okmark">${ICON.check}</div>
        <div><h3>Connected${ctx.authed.username ? ` as ${esc(ctx.authed.username)}` : ""}</h3>
        <p class="muted">Your LeetCode session is saved on this computer. You stay logged in for about 2 weeks.</p></div>
      </div>
      <div class="actions"><button class="cta" data-act="go" data-step="2">Continue ${ICON.fwd}</button></div>`;
  } else if (L.busy) {
    const s = L.step;
    const st = (n, label) => `<li class="${s === n ? "now" : (["browser", "reading", "importing"].indexOf(s) > ["browser", "reading", "importing"].indexOf(n) ? "done" : "")}"><span class="num">${ICON.check}</span>${label}</li>`;
    body = `<ol class="live">
        ${st("browser", `Log in on the ${esc(name)} window that just opened, then <b>close that window</b>`)}
        ${st("reading", "Reading your login")}
        ${st("importing", "Connecting the app")}
      </ol>
      ${s === "still-open" ? `<p class="warnline">The ${esc(name)} window is still open. Close it completely (the X in its corner), then press the button below.</p>` : ""}
      <div class="actions"><button class="ghost" data-act="login-continue">I logged in and closed the window</button></div>`;
  } else {
    body = `<div class="how">
        <div class="howstep"><span>1</span><p>We open LeetCode's login page in your <b>real Chrome or Edge</b>. The captcha works there.</p></div>
        <div class="howstep"><span>2</span><p>Log in any way you like: Google, GitHub or email. Then <b>close that window</b>.</p></div>
        <div class="howstep"><span>3</span><p>The app copies the login. Your password never touches this app.</p></div>
      </div>
      ${L.error ? `<p class="warnline">${esc(L.error)}</p>` : ""}
      <div class="actions">
        <button class="cta" data-act="login">${ICON.globe} Log in with my browser</button>
        <button class="textbtn" data-act="go" data-step="2">Skip for now</button>
      </div>`;
  }
  return `<header class="sh"><p class="eyebrow">Step 1 of 4</p><h2>Connect your LeetCode account</h2>
    <p class="lead">So problems open already logged in, with your submissions and progress.</p></header>${body}`;
}

// ---------- step 2 ----------
function stepTarget(ctx) {
  const d = ctx.draft;
  const card = (s) => {
    const on = d.sources.includes(s.id);
    return `<button class="pick ${on ? "on" : ""}" data-act="source" data-id="${s.id}" data-name="${esc(s.name.toLowerCase())}" aria-pressed="${on}">
      <span class="mono ${s.kind}">${s.kind === "general" ? ICON.globe : monogram(s.name)}</span>
      <span class="pt"><b>${esc(s.name)}</b><small>${s.kind === "general" ? "Most asked overall" : `${s.count.toLocaleString("en-IN")} tagged`}${s.recent ? `<em>${s.recent} recent</em>` : ""}</small></span>
      ${on ? `<span class="tick">${ICON.check}</span>` : ""}</button>`;
  };
  const parsed = ctx.importText ? parseImport(ctx.importText) : [];
  const customOn = d.sources[0] === "custom";
  const nCo = d.sources.filter((id) => id !== "general" && id !== "custom").length;
  const companies = SOURCES.filter((s) => s.kind === "company");
  return `<header class="sh"><p class="eyebrow">Step 2 of 4</p><h2>Which companies are you preparing for?</h2>
    <p class="lead">Pick up to 3. Problems asked by all of them come first, then the most frequent and most recently asked.</p></header>
    <div class="searchrow"><input id="coSearch" type="search" placeholder="Search ${companies.length} companies" autocomplete="off" value="${esc(ctx.coSearch || "")}">
      <span class="muted">${nCo ? `<b class="picked">${nCo} of 3 selected</b>` : `"recent" = asked in the last 3 months`}</span></div>
    ${ctx.pickMsg ? `<p class="warnline">${esc(ctx.pickMsg)}</p>` : ""}
    <div class="grid co">
      ${card(SOURCES[0])}
      ${companies.map(card).join("")}
      <button class="pick ${customOn ? "on" : ""}" data-act="source" data-id="custom" data-name="import my own list" aria-pressed="${customOn}">
        <span class="mono import">${ICON.upload}</span>
        <span class="pt"><b>My own list</b><small>${d.custom.length ? d.custom.length + " problems" : "Paste links"}</small></span>
        ${customOn ? `<span class="tick">${ICON.check}</span>` : ""}</button>
    </div>
    ${customOn ? `<div class="importbox">
        <textarea id="import" placeholder="https://leetcode.com/problems/two-sum/&#10;lru-cache&#10;200" spellcheck="false">${esc(ctx.importText)}</textarea>
        <div class="row"><span class="muted">${parsed.length} problems recognised</span>
        <button class="ghost" data-act="use-import" ${parsed.length ? "" : "disabled"}>Use this list</button></div></div>` : ""}
    <p class="fineprint">Company data: LeetCode company tags as of ${DATA_DATE}, from the public liquidslr/leetcode-company-wise-problems dataset.</p>
    <div class="actions">
      <button class="textbtn" data-act="go" data-step="1">${ICON.back} Back</button>
      <button class="cta" data-act="go" data-step="3" ${d.sources.length && (!customOn || d.custom.length) ? "" : "disabled"}>Continue ${ICON.fwd}</button>
    </div>`;
}

// ---------- step 3 ----------
// Honest coverage: how much of each company's own most-asked list the combined plan contains.
function coverageNote(d, set) {
  const cov = coverage(d.sources, set, d);
  if (cov.length < 2) return "";
  const low = cov.filter((c) => c.pct < 70), thin = cov.filter((c) => c.reported < 300);
  let verdict = low.length
    ? `The plan leans toward the others for ${esc(low.map((c) => c.name).join(" and "))}. Use 40 per pattern, or a separate plan later.`
    : cov.every((c) => c.pct >= 85) ? `One plan covers all of them well.`
    : `One plan covers most of each company's core problems. The rest are less frequent ones; 40 per pattern closes most of the gap.`;
  if (thin.length) verdict += ` ${esc(thin.map((c) => c.name).join(" and "))} ${thin.length > 1 ? "have" : "has"} few reported problems, so treat that list as a rough guide.`;
  return `<div class="coverage">
    <div class="covs">${cov.map((c) => `<div class="cov ${c.pct >= 85 ? "hi" : c.pct >= 70 ? "mid" : "lo"}"><b>${c.pct}%</b><span>of ${esc(c.name)}'s most asked</span><small>${c.reported.toLocaleString("en-IN")} reported</small></div>`).join("")}</div>
    <p>${verdict} Companies also ask unseen variants, so the patterns matter more than the exact list.</p></div>`;
}

function stepPatterns(ctx) {
  const d = ctx.draft;
  const set = draftSet(d);
  const counts = patternCounts(set, d.sources);
  const sel = new Set(d.patterns);
  const q = draftQueue(d);
  const solvedSkipped = set.filter((p) => sel.has(p.pattern) && store.S.progress.status[p.slug]).length;
  const isCo = isCompanyPlan(d.sources), multi = d.sources.length > 1;
  const premiumCount = ALL.filter((p) => p.premium).length;
  const seg = (v) => `<button class="${d.perPattern === v ? "on" : ""}" data-act="per" data-v="${v}">${v}</button>`;
  return `<header class="sh"><p class="eyebrow">Step 3 of 4</p><h2>Build your ${esc(sourceName(d.sources))} set</h2>
    <p class="lead">Every pattern gets the same number of problems, mixed about 25% easy, 55% medium, 20% hard, ordered easy to hard.</p></header>
    ${multi ? coverageNote(d, set) : ""}
    ${d.sources[0] !== "custom" ? `<div class="setcontrols">
      <div class="field"><span>Problems per pattern</span><div class="segment small">${seg(20)}${seg(30)}${seg(40)}</div></div>
      <label class="toggle"><input type="checkbox" id="premium" ${d.premium ? "checked" : ""}><span class="sw"></span>
        <span><b>I have LeetCode Premium</b><small>${d.premium ? "Including" : "Hiding"} ${premiumCount} Premium-only problems</small></span></label>
    </div>` : ""}
    <div class="patbar"><span><b>${q.length}</b> problems in ${sel.size} patterns</span>
      <span class="row"><button class="textbtn" data-act="pat-all">Select all</button><button class="textbtn" data-act="pat-none">Clear</button></span></div>
    <div class="patgrid">${counts.map((c, i) => `
      <button class="patrow ${sel.has(c.name) ? "on" : ""}" data-act="pat" data-name="${esc(c.name)}" aria-pressed="${sel.has(c.name)}">
        <span class="box">${sel.has(c.name) ? ICON.check : ""}</span>
        <span class="idx">${String(i + 1).padStart(2, "0")}</span>
        <span class="pn">${esc(c.name)}${isCo ? `<small>${multi ? `${c.all} asked by all, ${c.company - c.all} by some` : `${c.company} from ${esc(sourceName(d.sources))}`}${c.total - c.company ? `, ${c.total - c.company} core` : ""}</small>` : ""}</span>
        ${diffPills(c)}
        <span class="ct">${c.total}</span>
      </button>`).join("")}</div>
    ${solvedSkipped ? `<label class="check"><input type="checkbox" id="skipSolved" ${d.skipSolved ? "checked" : ""}> Skip the ${solvedSkipped} problems I've already solved</label>` : ""}
    <div class="actions">
      <button class="textbtn" data-act="go" data-step="2">${ICON.back} Back</button>
      <button class="cta" data-act="go" data-step="4" ${q.length ? "" : "disabled"}>Continue ${ICON.fwd}</button>
    </div>`;
}

// ---------- step 4 ----------
export function summaryHtml(d) {
  const q = draftQueue(d);
  if (d.planMode === "date") {
    let h = hoursNeeded(q, d.startDate, d.targetDate, d.daysPerWeek);
    if (h) {
      // Problems can't be split across days, so step up until the plan really ends by the target date.
      while (h < 12 && summarize(q, { ...d, hoursPerDay: h }).finish > d.targetDate) h += 0.5;
      d.hoursPerDay = h;
    }
  }
  const s = summarize(q, d);
  const heavy = d.hoursPerDay > 7;
  const tot = s.problems || 1;
  return `<div class="bigstats">
      <div><b>${s.problems}</b><span>problems</span></div>
      <div><b>${s.days}</b><span>study days</span></div>
      <div><b>${s.perDay}</b><span>per day, avg</span></div>
      <div><b>${s.hours}</b><span>hours total</span></div>
    </div>
    <div class="finish"><span>You finish on</span><b>${pretty(s.finish, { weekday: "long", day: "numeric", month: "long" })}</b></div>
    <div class="mix"><i class="e" style="flex:${s.mix.E}"></i><i class="m" style="flex:${s.mix.M}"></i><i class="h" style="flex:${s.mix.H}"></i></div>
    <p class="muted mixlabel">${s.mix.E} easy, ${s.mix.M} medium, ${s.mix.H} hard. Time per problem: ${COST.E}, ${COST.M} and ${COST.H} minutes including review.</p>
    ${d.planMode === "date" ? `<p class="callout">To finish by then you need about <b>${d.hoursPerDay} hours</b> a day.</p>` : ""}
    ${heavy ? `<p class="warnline">More than 7 hours a day rarely lasts beyond a week. Consider a later finish date.</p>` : ""}
    ${s.problems / tot && s.days > 0 && s.days < 5 ? `<p class="warnline">Very short plan. Fine for a quick revision, too fast for learning new patterns.</p>` : ""}`;
}

function stepSchedule(ctx) {
  const d = ctx.draft;
  const seg = (name, val, label) => `<button class="${String(d[name]) === String(val) ? "on" : ""}" data-act="set" data-k="${name}" data-v="${val}">${label}</button>`;
  return `<header class="sh"><p class="eyebrow">Step 4 of 4</p><h2>How much time do you have?</h2>
    <p class="lead">Your daily list is sized to your hours. Change it any time from the Plan tab.</p></header>
    <div class="two">
      <div class="controls">
        <div class="segment wide">${seg("planMode", "hours", "I have X hours a day")}${seg("planMode", "date", "Finish by a date")}</div>
        ${d.planMode === "hours" ? `
          <label class="field"><span>Hours per day</span>
            <div class="slider"><input type="range" id="hours" min="0.5" max="10" step="0.5" value="${d.hoursPerDay}"><output id="hoursOut">${d.hoursPerDay} h</output></div></label>`
        : `<label class="field"><span>Finish by</span><input type="date" id="targetDate" value="${d.targetDate}" min="${todayKey()}"></label>`}
        <div class="field"><span>Study days per week</span>
          <div class="segment">${seg("daysPerWeek", 5, "5, weekdays")}${seg("daysPerWeek", 6, "6, Sunday off")}${seg("daysPerWeek", 7, "7")}</div></div>
        <label class="field"><span>Start date</span><input type="date" id="startDate" value="${d.startDate}"></label>
      </div>
      <div class="summary" id="summary">${summaryHtml(d)}</div>
    </div>
    <div class="actions">
      <button class="textbtn" data-act="go" data-step="3">${ICON.back} Back</button>
      <button class="cta" data-act="finish">Start practicing ${ICON.fwd}</button>
    </div>`;
}

export function render(ctx) {
  const step = ctx.step;
  const content = [stepConnect, stepTarget, stepPatterns, stepSchedule][step - 1](ctx);
  const changing = store.S.profile.onboarded;
  return `<div class="onb">
    <div class="brand"><span class="logo">${ICON.spark}</span><b>DSA Practice</b>
      ${changing ? `<button class="ghost right" data-act="cancel-plan">${ICON.back} Back to practice, no changes</button>` : ""}</div>
    <ol class="stepper">${STEPS.map(([label, icon], i) => {
      const n = i + 1, cls = n === step ? "now" : n < step ? "done" : "";
      return `<li class="${cls}"><button data-act="go" data-step="${n}" ${n > step ? "disabled" : ""}><span class="si">${n < step ? ICON.check : icon}</span>${label}</button></li>`;
    }).join("")}</ol>
    <section class="card step${step}">${content}</section>
  </div>`;
}

export { PATTERNS };
