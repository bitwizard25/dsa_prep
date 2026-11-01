// Plan Mode: four questions, sensible defaults, "Customize plan" for power users, then the generated plan.
import { useMemo, useState } from "preact/hooks";
import { ROLES, COMPANIES, LEVELS, SUBJECTS, SUBJECT, type SubjectId } from "../core/catalog";
import { buildPlan, fmt, addDays, todayKey, parse, type Goal, priorityOf, dsaMinutesFor, MIN_PER_PROBLEM, MIN_OTHERS } from "../core/planner";
import { Button, Icon, Steps, Bar, hm, howOften } from "../ui/kit";
import { silkBackdrop, welcomeSilk } from "../ui/silk";

const DURATIONS = [["30 days", 30], ["60 days", 60], ["90 days", 90], ["6 months", 182]] as const;
const HOURS = [2, 4, 6, 8];

export function defaultGoal(): Goal {
  return { role: "sde1", company: "amazon", level: "intermediate", hoursPerDay: 4, daysPerWeek: 6,
    startDate: todayKey(), targetDate: fmt(addDays(new Date(), 90)), startTime: "09:00", breakMin: 15, problemsPerDay: 4 };
}

export function PlanMode({ initial, onDone, onCancel, versionMark, versionTitle }: { initial: Goal | null; onDone: (g: Goal) => void; onCancel?: () => void; versionMark?: string; versionTitle?: string }) {
  const [g, setG] = useState<Goal>(initial ? { ...initial } : defaultGoal());
  const [step, setStep] = useState(0);              // 0-3 questions, 4 building, 5 result
  const [custom, setCustom] = useState(false);
  const [fixShown, setFixShown] = useState(false);
  const ppd = g.problemsPerDay || 4;
  const dsaMin = dsaMinutesFor(ppd), dayMin = Math.round(g.hoursPerDay * 60);
  const othersOn = SUBJECTS.some((s) => s.id !== "dsa" && !(g.skip || []).includes(s.id));
  const overflow = dsaMin > dayMin - (othersOn ? MIN_OTHERS : 0);
  const longerDay = Math.ceil((dsaMin + (othersOn ? MIN_OTHERS : 0)) / 30) / 2;
  const fewer = Math.max(1, Math.floor((dayMin - (othersOn ? MIN_OTHERS : 0)) / MIN_PER_PROBLEM));
  const N = 5;                                          // questions; then building (N), then result (N + 1)
  const set = (patch: Partial<Goal>) => setG({ ...g, ...patch });
  const plan = useMemo(() => (step === N + 1 ? buildPlan(g) : null), [step, g]);
  const days = Math.round((parse(g.targetDate).getTime() - parse(g.startDate).getTime()) / 864e5);

  const questions = [
    { title: "What are you preparing for?", body: (
      <div class="choices">{ROLES.map((r) => <button class={`choice ${g.role === r.id ? "on" : ""}`} aria-pressed={g.role === r.id} onClick={() => set({ role: r.id })}>{r.name}</button>)}</div>) },
    { title: "Where are you targeting?", body: (
      <div class="choices">{COMPANIES.map((c) => <button class={`choice ${g.company === c.id ? "on" : ""}`} aria-pressed={g.company === c.id} onClick={() => set({ company: c.id })}>{c.name}</button>)}</div>) },
    { title: "How much time can you give each day?", body: (<>
      <div class="choices">{HOURS.map((h) => <button class={`choice ${g.hoursPerDay === h ? "on" : ""}`} aria-pressed={g.hoursPerDay === h} onClick={() => set({ hoursPerDay: h })}>{h} hours</button>)}
        <label class="choice input">Custom <input type="number" min="0.5" max="16" step="0.5" value={g.hoursPerDay} onInput={(e) => { const v = +(e.target as HTMLInputElement).value; if (v > 0) set({ hoursPerDay: v }); }} aria-label="Hours per day" /> h</label></div>
      <p class="hint">Any amount works. The plan is sized to it, and tells you honestly what fits.</p></>) },
    { title: "How many DSA problems a day?", body: (<>
      <div class="choices">{[2, 3, 4, 5, 6, 8].map((n) => <button class={`choice ${ppd === n ? "on" : ""}`} aria-pressed={ppd === n} onClick={() => { set({ problemsPerDay: n }); setFixShown(false); }}>{n}</button>)}
        <label class="choice input">Custom <input type="number" min="1" max="30" value={ppd} onInput={(e) => { const v = Math.round(+(e.target as HTMLInputElement).value); if (v > 0) { set({ problemsPerDay: v }); setFixShown(false); } }} aria-label="Problems per day" /></label></div>
      <p class="hint">{ppd} problems take about {hm(dsaMin)} a day. {overflow ? "" : `The other subjects share the remaining ${hm(dayMin - dsaMin)}.`}</p>
      {overflow && <div class={`fit ${fixShown ? "shake" : ""}`} role="alert">
        <p><b>{ppd} problems need about {hm(dsaMin)}</b>{othersOn ? `, which leaves less than an hour for your other subjects` : `, more than your ${g.hoursPerDay} h`}.</p>
        <div class="row"><Button kind="primary" size="sm" onClick={() => { set({ hoursPerDay: longerDay }); setFixShown(false); }}>Make my day {longerDay} h</Button>
          <Button size="sm" onClick={() => { set({ problemsPerDay: fewer }); setFixShown(false); }}>Lower to {fewer} problems</Button></div>
      </div>}</>) },
    { title: "When do you want to be ready?", body: (<>
      <div class="choices">{DURATIONS.map(([l, d]) => { const date = fmt(addDays(parse(g.startDate), d)); return <button class={`choice ${g.targetDate === date ? "on" : ""}`} aria-pressed={g.targetDate === date} onClick={() => set({ targetDate: date })}>{l}</button>; })}
        <label class="choice input">Date <input type="date" value={g.targetDate} min={fmt(addDays(new Date(), 7))} onInput={(e) => { const v = (e.target as HTMLInputElement).value; if (v) set({ targetDate: v }); }} aria-label="Target date" /></label></div>
      <p class="hint">{days} days from today.</p></>) },
  ];

  const ver = versionMark ? <p class="pm-ver" title={versionTitle}>{versionMark}</p> : null;
  if (step === N) return (
    <div class="planmode center"><div class="pm-card narrow">
      <h1 class="title">Building your preparation plan</h1>
      <Steps steps={["Reading your target role", "Weighing what the company emphasises", "Prioritising subjects and topics", "Creating your roadmap and timetable"]} onDone={() => setStep(N + 1)} />
    </div>{ver}</div>);

  if (step === N + 1 && plan) {
    const ranked = plan.subjects.slice().sort((a, b) => b.share - a.share);
    return (
      <div class="planmode"><div class="pm-card wide">
        <p class="eyebrow">Your plan</p>
        <h1 class="title">{ROLES.find((r) => r.id === g.role)?.name}{g.company !== "other" ? ` at ${COMPANIES.find((c) => c.id === g.company)?.name}` : ""}</h1>
        <p class="lede">{plan.studyDays} study days, {g.hoursPerDay} h a day, ready by {parse(g.targetDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}.</p>
        <div class="why"><h2>Why this plan</h2>{plan.why.map((w) => <p>{w}</p>)}
          {plan.warnings.map((w) => <p class="warn">{w}</p>)}
          <p class="calm">You don't need to configure anything else.</p></div>
        <p class="dsa-line">DSA: <b>{ppd} problems a day</b>, about {hm(dsaMin)}. Your practice app is set up with {COMPANIES.find((c) => c.id === g.company && c.id !== "startup" && c.id !== "other")?.name || "the most-asked"} problems to match. You can still change its companies and patterns from its plan menu.</p>
        <h2 class="sub">Your day</h2>
        <ul class="alloc">{ranked.map((s) => (
          <li><span class="name">{SUBJECT[s.id].short}</span><Bar value={s.share / ranked[0].share} label={`${SUBJECT[s.id].short} share`} />
            <span class="mins">{s.rotating ? howOften(s.avgMin, plan.rotatingMin) : `${hm(s.dailyMin)} a day`}</span><span class={`prio p-${priorityOf(s).toLowerCase()}`}>{priorityOf(s)}</span></li>))}</ul>
        <details class="more"><summary>View phases and details</summary>
          <ol class="phases-mini">{plan.phases.map((ph) => <li><b>{ph.name}</b><span>{parse(ph.start).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} to {parse(ph.end).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span><small>{ph.summary}</small></li>)}</ol>
        </details>
        <div class="row between">
          <Button kind="quiet" onClick={() => setStep(N - 1)}><Icon.back /> Change answers</Button>
          <Button kind="primary" size="lg" onClick={() => onDone(g)}>Start preparing <Icon.arrow /></Button>
        </div>
      </div>{ver}</div>);
  }

  const q = questions[step];
  const welcome = step === 0;
  return (
    <div class={`planmode center${welcome ? " welcome" : ""}`} style={welcome ? { backgroundImage: silkBackdrop(welcomeSilk()) } : undefined}><div class="pm-card">
      <div class="pm-top">
        <span class="stepno">Step {step + 1} of {N}</span>
        <div class="dots" aria-hidden="true">{questions.map((_, i) => <i class={i <= step ? "on" : ""} />)}</div>
        {onCancel && <button class="iconbtn" aria-label="Close plan mode" onClick={onCancel}><Icon.close /></button>}
      </div>
      <h1 class="title">{q.title}</h1>
      {q.body}
      {step === N - 1 && (
        <div class="customize">
          <button class="linkbtn" aria-expanded={custom} onClick={() => setCustom(!custom)}>Customize plan <Icon.chevron /></button>
          {custom && <div class="custom-body">
            <div class="field"><span>Experience level</span><div class="seg">{LEVELS.map((l) => <button class={g.level === l.id ? "on" : ""} title={l.blurb} onClick={() => set({ level: l.id })}>{l.name}</button>)}</div></div>
            <div class="field"><span>Study days a week</span><div class="seg">{([5, 6, 7] as const).map((d) => <button class={g.daysPerWeek === d ? "on" : ""} onClick={() => set({ daysPerWeek: d })}>{d === 5 ? "5, weekdays" : d === 6 ? "6, Sunday off" : "7"}</button>)}</div></div>
            <div class="row">
              <label class="field"><span>First session starts</span><input type="time" value={g.startTime} onInput={(e) => set({ startTime: (e.target as HTMLInputElement).value || "09:00" })} /></label>
              <label class="field"><span>Break between sessions</span><select value={g.breakMin} onChange={(e) => set({ breakMin: +(e.target as HTMLSelectElement).value })}>{[0, 10, 15, 30].map((m) => <option value={m}>{m} min</option>)}</select></label>
            </div>
            <div class="field"><span>Subjects and their weight</span>
              <ul class="weights">{SUBJECTS.map((s) => {
                const role = ROLES.find((r) => r.id === g.role)!;
                const on = !(g.skip || []).includes(s.id);
                const w = g.weights?.[s.id] ?? role.weights[s.id];
                return <li class={on ? "" : "off"}>
                  <label class="check"><input type="checkbox" checked={on} onChange={() => set({ skip: on ? [...(g.skip || []), s.id] : (g.skip || []).filter((x) => x !== s.id) })} />{s.short}</label>
                  <input type="range" min="1" max="50" value={w} disabled={!on} aria-label={`${s.short} weight`} onInput={(e) => set({ weights: { ...(g.weights || {}), [s.id]: +(e.target as HTMLInputElement).value } as Record<SubjectId, number> })} />
                  <span class="w">{w}</span></li>;
              })}</ul>
              <p class="hint">Weights start from the role's profile. Higher means more of your day.</p></div>
          </div>}
        </div>)}
      <div class="row between">
        {step > 0 ? <Button kind="quiet" onClick={() => setStep(step - 1)}><Icon.back /> Back</Button> : <span />}
        {step < N - 1 ? <Button kind="primary" onClick={() => { if (step === 3 && overflow) { setFixShown(true); return; } setStep(step + 1); }}>Continue <Icon.arrow /></Button>
          : <Button kind="primary" size="lg" onClick={() => (overflow ? (setStep(3), setFixShown(true)) : setStep(N))}>Build my plan <Icon.arrow /></Button>}
      </div>
    </div>{ver}</div>);
}
