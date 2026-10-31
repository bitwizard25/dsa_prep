// Today: what now, why, what's next, and am I on track. Plus the session view it opens.
import { useEffect, useState } from "preact/hooks";
import { SUBJECT, ROLES, COMPANIES } from "../core/catalog";
import { clock, parse, todayKey, priorityOf, daysBetween, buildPlan, dsaMinutesFor, MIN_PER_PROBLEM, MIN_OTHERS, type Plan } from "../core/planner";
import { dsaSetupFor } from "../core/dsa-setup";
import { SUBJECTS } from "../core/catalog";
import { today, recommend, sessionLabel, subjectReadiness, overallReadiness, pace, currentTopic, mustDo, type TodayItem } from "../core/progress";
import type { DsaSummary } from "../core/practice-bridge";
import { update, getState, saveNow, type HubState } from "../store";
import { api } from "../api";
import { Button, Icon, Bar, Section, pct, score, hm, toast } from "../ui/kit";
import { TopicResources } from "../ui/Resources";
import { Quiz, hasQuiz } from "../ui/Quiz";
import { startHere, fitNote } from "../core/resources";

export interface Ctx { hub: HubState; plan: Plan; dsa?: DsaSummary; go: (r: string, arg?: any) => void }

const greeting = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };

export function goalName(plan: Plan) {
  const r = ROLES.find((x) => x.id === plan.goal.role)?.name, c = COMPANIES.find((x) => x.id === plan.goal.company);
  return `${c && c.id !== "other" ? c.name + " " : ""}${r}`;
}

/** Starting a session: DSA runs in the practice app; everything else in the Hub's session view. */
export function startSession(ctx: Ctx, item: { id: string; subject: string; minutes: number }) {
  const t = today(getState(), ctx.plan).find((i) => i.id === item.id);
  if (t?.locked) { toast({ title: "Finish your must-do first", body: "Today's plan opens once the carried-over work is done." }); ctx.go("today"); return; }
  update((s) => { s.progress.sessions[item.id] = { status: "active", minutes: 0, startedAt: Date.now() }; });
  if (item.subject === "dsa") saveNow().then(() => api.openPractice({ next: true }));
  else ctx.go("session", item.id);
}

export function TodayScreen(ctx: Ctx) {
  const { hub, plan, dsa } = ctx;
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 30000); return () => clearInterval(t); }, []);
  const items = today(hub, plan);
  const rec = recommend(items);
  const waiting = mustDo(hub, plan).waiting;
  const t = todayKey();
  const dayIndex = plan.days.findIndex((d) => d[0]?.date >= t);
  const week = Math.max(1, Math.ceil((daysBetween(plan.goal.startDate, t) + 1) / 7));
  const weeks = Math.max(1, Math.ceil((daysBetween(plan.goal.startDate, plan.goal.targetDate) + 1) / 7));
  const p = pace(hub, plan);
  // Carried-over work is already handled by "Must do first", so say that calmly; "behind" only counts daily subjects.
  const carried = items.filter((i) => i.fromDate && i.state !== "done").length + waiting;
  const behind = Object.entries(p).filter(([id, d]) => d <= -2 && !plan.subjects.find((s) => s.id === id)?.rotating).sort((a, b) => a[1] - b[1]);
  const status = carried ? `${carried} session${carried === 1 ? "" : "s"} carried over` : behind.length ? `${SUBJECT[behind[0][0] as keyof typeof SUBJECT].short} is ${-behind[0][1]} days behind` : "On track";
  const nextMs = plan.milestones.find((m) => m.date >= t);
  const elapsed = Math.min(1, Math.max(0, daysBetween(plan.goal.startDate, t) / Math.max(1, daysBetween(plan.goal.startDate, plan.goal.targetDate))));
  const ranked = plan.subjects.slice().sort((a, b) => b.share - a.share).slice(0, 4);

  return <div class="screen today">
    <header class="page-head">
      <p class="eyebrow">{greeting()}</p>
      <h1 class="title">Your {goalName(plan)} preparation</h1>
      <p class="lede">Week {Math.min(week, weeks)} of {weeks}, <span class={carried ? "must-t" : behind.length ? "warn-t" : "good-t"}>{status}</span></p>
    </header>

    <FitNotice plan={plan} />
    {rec ? <Hero ctx={ctx} item={rec} next={items.slice(items.indexOf(rec) + 1).find((i) => i.state === "must" || i.state === "upcoming" || i.state === "current" || i.state === "late") || null} />
      : <div class="hero quiet">
          <p class="eyebrow">{items.length ? "Today's plan is done" : "Rest day"}</p>
          <h2 class="hero-title">{items.length ? "Nicely done. Rest properly." : "No sessions today."}</h2>
          <p class="lede">{(() => { const nd = plan.days.find((d) => d[0]?.date > t); return nd ? `Next session: ${parse(nd[0].date).toLocaleDateString("en-IN", { weekday: "long" })} at ${plan.goal.startTime}, ${SUBJECT[nd[0].subject].short}.` : "Your plan is complete."; })()}</p>
        </div>}

    <div class="cols">
      <Section title="Today's plan">
        {items.length ? <ol class="timeline">{items.map((i, k) => <>
          {k === 0 && i.fromDate && <li class="tl-group must-g">Must do first<span>{waiting ? `${waiting} more carried to the next days` : "carried over, so nothing gets skipped"}</span></li>}
          {!i.fromDate && k > 0 && items[k - 1].fromDate && <li class="tl-group">Today<span>opens after the must-do</span></li>}
          <li class={`tl ${i.state} ${i.locked ? "locked" : ""}`} key={i.id}>
            <span class="tl-time">{clock(i.startMin)}</span>
            <span class="tl-mark" aria-hidden="true">{i.state === "done" ? "✓" : i.locked ? "·" : i.state === "current" || i.state === "active" ? "→" : i.state === "must" ? "◆" : "○"}</span>
            <span class="tl-body"><b>{SUBJECT[i.subject].short}</b><span>{sessionLabel(hub, plan, i, dsa)}{i.fromDate ? `, from ${parse(i.fromDate).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}` : ""}</span></span>
            <span class="tl-meta">{i.state === "done" ? "Done" : i.state === "active" ? "In progress" : i.state === "current" && !i.locked ? "Now" : i.state === "late" && !i.locked ? "Not done yet" : hm(i.minutes)}</span>
          </li></>)}</ol> : <p class="muted">Nothing scheduled today.</p>}
      </Section>

      <div>
        <Section title="Your progress" action={<button class="linkbtn" onClick={() => ctx.go("progress")}>All subjects</button>}>
          <ul class="mini-bars">{ranked.map((s) => { const r = subjectReadiness(hub, plan, s, dsa); return <li><span>{SUBJECT[s.id].short}</span><Bar value={r} label={`${SUBJECT[s.id].short} readiness`} /><b class={r < 0.005 ? "ns" : ""}>{score(r)}</b></li>; })}</ul>
        </Section>
        <Section title="Roadmap" action={<button class="linkbtn" onClick={() => ctx.go("roadmap")}>Open</button>}>
          <div class="road"><Bar value={elapsed} label="Time through the plan" /><span>{dayIndex >= 0 ? `Day ${dayIndex + 1} of ${plan.studyDays}` : "Plan complete"}</span></div>
          {nextMs && <div class="milestone"><span class="eyebrow">Next milestone</span><b>{nextMs.name}</b><span>{Math.max(0, daysBetween(t, nextMs.date))} days remaining</span></div>}
          <p class="fine">Overall readiness, estimated: <b>{score(overallReadiness(hub, plan, dsa))}</b></p>
        </Section>
      </div>
    </div>
  </div>;
}

function Hero({ ctx, item, next }: { ctx: Ctx; item: TodayItem; next: TodayItem | null }) {
  const { hub, plan, dsa } = ctx;
  const s = plan.subjects.find((x) => x.id === item.subject)!;
  const topic = sessionLabel(hub, plan, item, dsa);
  const active = hub.progress.sessions[item.id]?.status === "active";
  const role = ROLES.find((r) => r.id === plan.goal.role)?.name;
  const why = item.fromDate ? `Carried over from ${parse(item.fromDate).toLocaleDateString("en-IN", { weekday: "long" })}, so nothing gets skipped. Today's plan opens after this.`
    : item.kind === "interview" ? "Interview mode: practise under real conditions." : `Required for your ${role} roadmap.`;
  return <div class={`hero ${item.state}`}>
    <p class="eyebrow">{active ? "In progress" : item.state === "must" ? "Must do first" : item.state === "current" ? "Current session" : item.state === "late" ? "Still open today" : `Up next at ${clock(item.startMin)}`}</p>
    <h2 class="hero-title">{SUBJECT[item.subject].short}: {topic}</h2>
    <p class="hero-meta"><b>{hm(item.minutes)}</b><span class={`prio p-${priorityOf(s).toLowerCase()}`}>{priorityOf(s)} priority</span></p>
    <p class="why-line">{why} {item.subject === "dsa" ? (ctx.dsa?.hasPlan ? `Opens your next problem in the practice app. This session completes by itself once ${item.fromDate ? "your leftovers are" : `today's ${ctx.dsa.todayTotal} problems are`} marked.` : "Runs in your practice app.") : ""}</p>
    {(() => { const tp = item.kind === "learn" ? currentTopic(hub, plan, item.subject, dsa) : null; const v = tp ? startHere(tp.id, item.minutes) : undefined;
      return v ? <p class="start-here"><Icon.play /><span>Start here: <b>{v.title}</b>, {v.channel.replace(/\s*\(.*\)/, "")}, {v.minutes} min{fitNote(v, item.minutes)}</span></p> : null; })()}
    <div class="row">
      {active ? <>
        <Button kind="primary" size="lg" onClick={() => (item.subject === "dsa" ? saveNow().then(() => api.openPractice({ next: true })) : ctx.go("session", item.id))}><Icon.play /> Continue session</Button>
        {(item.subject !== "dsa" || !ctx.dsa?.hasPlan || (!item.fromDate && !ctx.dsa.todayTotal)) && <Button onClick={() => ctx.go("complete", item.id)}>Complete</Button>}
      </> : <>
        <Button kind="primary" size="lg" onClick={() => startSession(ctx, item)}><Icon.play /> Start session</Button>
      </>}
    </div>
    {next && <p class="next-line">Then {SUBJECT[next.subject].short}, {sessionLabel(hub, plan, next, dsa)} at {clock(next.startMin)}</p>}
  </div>;
}

// ---------- session view ----------
const GUIDE: Record<string, [string, string][]> = {
  concept: [["Learn", "Read or watch one good explanation of the topic. Write the key idea in your own words."], ["Practice", "Answer the classic interview questions on it out loud, without notes."], ["Review", "Note what you couldn't explain. That is next session's starting point."]],
  design: [["Learn", "Study the concept or a reference design. Sketch the components and how they talk."], ["Practice", "Design it yourself from a blank page in 30 minutes: requirements, API, data, scale."], ["Review", "Compare with a reference. List one trade-off you missed."]],
  coding: [["Learn", "Review the pattern's idea."], ["Practice", "Solve problems in the practice app."], ["Review", "Mark each problem honestly."]],
};

export function SessionScreen({ ctx, id }: { ctx: Ctx; id: string }) {
  const { hub, plan, dsa } = ctx;
  const rec = hub.progress.sessions[id];
  const [date, subject] = id.split("#") as [string, any];
  const planned = plan.days.flat().find((s) => s.id === id);
  const minutes = planned?.minutes || 45;
  const topic = planned ? sessionLabel(hub, plan, planned, dsa) : currentTopic(hub, plan, subject, dsa)?.name || "Revision";
  const [now, setNow] = useState(Date.now());
  const [done, setDone] = useState<boolean[]>([false, false, false]);
  const [quizOpen, setQuizOpen] = useState(false);
  const topicId = currentTopic(hub, plan, subject, dsa)?.id || null;
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const elapsed = rec?.startedAt ? Math.floor((now - rec.startedAt) / 1000) : 0;
  const steps = GUIDE[SUBJECT[subject as keyof typeof SUBJECT].kind];
  const progress = Math.min(1, elapsed / 60 / minutes);
  return <div class="screen session">
    <button class="linkbtn back" onClick={() => ctx.go("today")}><Icon.back /> Today</button>
    <p class="eyebrow">{SUBJECT[subject as keyof typeof SUBJECT].name}</p>
    <h1 class="title">{topic}</h1>
    <p class="lede">{hm(minutes)} session{date !== todayKey() ? `, from ${date}` : ""}</p>
    <div class="session-clock"><span class="big">{String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}</span><Bar value={progress} label="Session progress" /><span class="muted">{pct(progress)} of planned time</span></div>
    <ol class="session-steps">{steps.map(([name, text], i) => (
      <li class={done[i] ? "done" : done.slice(0, i).every(Boolean) ? "now" : ""}>
        <label><input type="checkbox" checked={done[i]} onChange={() => setDone(done.map((d, k) => (k === i ? !d : d)))} /><b>{i + 1}. {name}</b></label><p>{text}</p>
        {i === 0 && <TopicResources subject={subject} topicId={topicId} minutes={minutes} />}
        {i === 2 && hasQuiz(topicId) && (quizOpen ? <Quiz topicId={topicId!} onDone={() => setDone(done.map((d, k) => (k === 2 ? true : d)))} />
          : <div class="row"><Button size="sm" onClick={() => setQuizOpen(true)}>Take the 4-question quiz</Button><span class="muted">Your score counts toward this topic's progress.</span></div>)}</li>))}</ol>
    <div class="row"><Button kind="primary" size="lg" onClick={() => ctx.go("complete", id)}><Icon.check /> Complete session</Button></div>
  </div>;
}

/** Finishing a session: minutes, a quick self-rating, and whether the topic is done. */
export function CompleteScreen({ ctx, id }: { ctx: Ctx; id: string }) {
  const { hub, plan, dsa } = ctx;
  const rec = hub.progress.sessions[id];
  const subject = id.split("#")[1] as any;
  const planned = plan.days.flat().find((s) => s.id === id);
  const startedMin = rec?.startedAt ? Math.round((Date.now() - rec.startedAt) / 60000) : planned?.minutes || 45;
  const [mins, setMins] = useState(Math.max(5, Math.min(startedMin, (planned?.minutes || 45) + 60)));
  const [rating, setRating] = useState(0);
  const [topicDone, setTopicDone] = useState(false);
  const topic = currentTopic(hub, plan, subject, dsa);
  const save = () => {
    update((s) => {
      s.progress.sessions[id] = { status: "done", minutes: mins, rating: rating || undefined, topicId: topic?.id || null };
      if (topic && subject !== "dsa") {
        const tp = (s.progress.topics[topic.id] ||= { minutes: 0, ratings: [] });
        tp.minutes += mins;
        if (rating) tp.ratings.push(rating);
        if (topicDone) tp.done = true;
      }
    });
    const after = recommend(today(getState(), plan));
    toast({ title: "Session complete", body: after ? `Next: ${SUBJECT[after.subject].short} at ${clock(after.startMin)}` : "That's today's plan done." });
    ctx.go("today");
  };
  return <div class="screen complete">
    <h1 class="title">How did it go?</h1>
    <p class="lede">{SUBJECT[subject as keyof typeof SUBJECT].short}{topic ? `: ${topic.name}` : ""}</p>
    <label class="field narrow"><span>Minutes you actually studied</span><input type="number" min="5" max="600" value={mins} onInput={(e) => setMins(+(e.target as HTMLInputElement).value || 0)} /></label>
    {subject !== "dsa" && <>
      <div class="field"><span>How well do you know it now?</span>
        <div class="seg big">{[[1, "Shaky"], [2, "Okay"], [3, "Solid"]].map(([v, l]) => <button class={rating === v ? "on" : ""} aria-pressed={rating === v} onClick={() => setRating(v as number)}>{l}</button>)}</div></div>
      {topic && <label class="check"><input type="checkbox" checked={topicDone} onChange={() => setTopicDone(!topicDone)} /> I'm done with "{topic.name}", move to the next topic</label>}
    </>}
    {subject === "dsa" && <p class="hint">Problem results come from your practice app automatically.</p>}
    <div class="row"><Button kind="quiet" onClick={() => ctx.go("today")}>Cancel</Button><Button kind="primary" size="lg" onClick={save}>Save and continue</Button></div>
  </div>;
}

/** When the problem count no longer fits the day (for example after changing hours in the practice app), offer the two fixes. */
function FitNotice({ plan }: { plan: Plan }) {
  const g = plan.goal;
  if (!g.problemsPerDay) return null;
  const others = SUBJECTS.some((s) => s.id !== "dsa" && !(g.skip || []).includes(s.id)) ? MIN_OTHERS : 0;
  const dsaMin = dsaMinutesFor(g.problemsPerDay), day = Math.round(g.hoursPerDay * 60);
  if (dsaMin <= day - others) return null;
  const longer = Math.ceil((dsaMin + others) / 30) / 2;
  const fewer = Math.max(1, Math.floor((day - others) / MIN_PER_PROBLEM));
  const apply = (patch: Partial<typeof g>) => update((s) => { s.goal = { ...s.goal!, ...patch }; s.dsaSetup = dsaSetupFor(s.goal!, buildPlan(s.goal!)); });
  return <div class="fit notice" role="alert">
    <p><b>{g.problemsPerDay} problems a day need about {hm(dsaMin)}</b>, but your day is {g.hoursPerDay} h{others ? ", leaving no time for your other subjects" : ""}.</p>
    <div class="row"><Button kind="primary" size="sm" onClick={() => apply({ hoursPerDay: longer })}>Make my day {longer} h</Button>
      <Button size="sm" onClick={() => apply({ problemsPerDay: fewer })}>Lower to {fewer} problems</Button></div>
  </div>;
}
