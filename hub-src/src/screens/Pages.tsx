// Roadmap, Subjects, Practice, Progress and Settings.
import { useState } from "preact/hooks";
import { SUBJECT, type SubjectId } from "../core/catalog";
import { parse, todayKey, daysBetween, priorityOf, fmt } from "../core/planner";
import { today, recommend, subjectReadiness, overallReadiness, pace, currentTopic, topicMastery, isTopicDone } from "../core/progress";
import { update } from "../store";
import { api } from "../api";
import { Button, Icon, Bar, Section, Empty, pct, score, howOften, hm, Confirm } from "../ui/kit";
import { startSession, type Ctx } from "./Today";
import { videosFor, courseFor, readingFor, subjectReading, CREDITS } from "../core/resources";
import { hasQuiz, Quiz } from "../ui/Quiz";
import { latestQuiz, activeDays, streakOf } from "../core/progress";
import { SUBJECT as SUBJ } from "../core/catalog";
import { dsaMastery } from "../core/practice-bridge";

const d = (s: string) => parse(s).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export function RoadmapScreen(ctx: Ctx) {
  const { hub, plan, dsa } = ctx;
  const t = todayKey();
  const rec = recommend(today(hub, plan));
  return <div class="screen roadmap">
    <header class="page-head row between"><div>
      <h1 class="title">Roadmap</h1>
      <p class="lede">{plan.phases.length} phases to {d(plan.goal.targetDate)}. Topics move forward as you finish them.</p></div>
      {rec && <Button kind="primary" onClick={() => startSession(ctx, rec)}><Icon.play /> Continue roadmap</Button>}
    </header>
    <ol class="phases">{plan.phases.map((ph) => {
      const state = t > ph.end ? "past" : t >= ph.start ? "now" : "next";
      const bySubject = new Map<SubjectId, typeof ph.topics>();
      ph.topics.forEach((x) => bySubject.set(x.subject, [...(bySubject.get(x.subject) || []), x]));
      return <li class={`phase ${state}`}>
        <div class="ph-head"><span class="ph-mark" aria-hidden="true" /><div><h2>{ph.name}</h2><span class="muted">{d(ph.start)} to {d(ph.end)}{state === "now" ? ", you are here" : ""}</span></div></div>
        <p>{ph.summary}</p>
        {ph.topics.length ? <div class="ph-topics">{[...bySubject.entries()].map(([sid, list]) => {
          const s = plan.subjects.find((x) => x.id === sid)!;
          return <div class="ph-subject"><b>{SUBJECT[sid].short}</b><ul>{list.map(({ topic }) => <li class={isTopicDone(hub, plan, s, topic.id, dsa) ? "done" : ""}>{isTopicDone(hub, plan, s, topic.id, dsa) ? "✓ " : ""}{topic.name}</li>)}</ul></div>;
        })}</div> : <p class="muted">Mock interviews, timed practice and revision of your weakest topics.</p>}
      </li>;
    })}</ol>
    <Section title="Milestones">
      <ul class="milestones">{plan.milestones.filter((m, i, a) => m.name !== "Mock interview" || a.findIndex((x) => x.name === "Mock interview") === i || m.date >= t).slice(0, 12).map((m) => (
        <li class={m.date < t ? "past" : ""}><span>{d(m.date)}</span><b>{m.name}</b><span class="muted">{m.date >= t ? `${daysBetween(t, m.date)} days` : "passed"}</span></li>))}</ul>
    </Section>
  </div>;
}

export function SubjectsScreen(ctx: Ctx) {
  const { hub, plan, dsa } = ctx;
  const [open, setOpen] = useState<SubjectId | null>(null);
  const items = today(hub, plan);
  return <div class="screen subjects">
    <header class="page-head"><h1 class="title">Subjects</h1><p class="lede">Each subject's topics, in the order the plan covers them.</p></header>
    <ul class="subject-list">{plan.subjects.slice().sort((a, b) => b.share - a.share).map((s) => {
      const r = subjectReadiness(hub, plan, s, dsa), cur = currentTopic(hub, plan, s.id, dsa);
      const todays = items.find((i) => i.subject === s.id && i.state !== "done");
      const isOpen = open === s.id;
      return <li class={`subject ${isOpen ? "open" : ""}`}>
        <button class="subject-head" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : s.id)}>
          <span class="s-name"><b>{SUBJECT[s.id].name}</b><small>{cur ? `Now: ${cur.name}` : "All topics covered"}</small></span>
          <span class="s-time">{s.rotating ? howOften(s.avgMin, plan.rotatingMin) : `${hm(s.dailyMin)} a day`}</span>
          <span class="s-bar"><Bar value={r} label={`${SUBJECT[s.id].short} readiness`} /></span><b class={`s-pct ${r < 0.005 ? "ns" : ""}`}>{score(r)}</b><Icon.chevron />
        </button>
        {isOpen && <div class="subject-body">
          <div class="row between"><span class="muted">{priorityOf(s)} priority, {s.topics.length} topics, {Math.round(s.coverage * 100)}% depth at your pace</span>
            <Button kind="primary" size="sm" onClick={() => startSession(ctx, todays || { id: `${todayKey()}#${s.id}#extra-${Date.now()}`, subject: s.id, minutes: 45 })}><Icon.play /> {todays ? "Start today's session" : "Start an extra session"}</Button></div>
          <ol class="topics">{s.topics.map((tp) => {
            const m = topicMastery(hub, plan, s, tp.id, dsa), done = isTopicDone(hub, plan, s, tp.id, dsa), dt = plan.topicDates[tp.id];
            return <li class={done ? "done" : cur?.id === tp.id ? "current" : ""}>
              <span class="t-mark" aria-hidden="true">{done ? "✓" : cur?.id === tp.id ? "→" : "○"}</span>
              <span class="t-name">{tp.name}<small>{["", "Foundation", "Core", "Advanced"][tp.level]}{dt ? `, planned ${d(dt.start)}` : ""}{videosFor(tp.id).length ? `, ${videosFor(tp.id).length} video${videosFor(tp.id).length === 1 ? "" : "s"}` : ""}{readingFor(tp.id).length ? `, ${readingFor(tp.id).length} to read` : ""}</small></span>
              <span class="t-bar"><Bar value={m} tone={done ? "good" : "accent"} label={`${tp.name} mastery`} /></span><span class="t-pct">{m < 0.005 ? "" : pct(m)}</span>
              <span class="t-quiz">{hasQuiz(tp.id) ? <button class="linkbtn" onClick={() => ctx.go("quiz", tp.id)} title="Take the quiz">{latestQuiz(hub, tp.id) === null ? "Quiz" : `Quiz ${Math.round(latestQuiz(hub, tp.id)! * 4)}/4`}</button> : null}</span>
            </li>;
          })}</ol>
          {subjectReading(s.id).length > 0 && <p class="hint">Notes and guides: {subjectReading(s.id).map((n, i) => <>{i ? ", " : ""}<a href={n.url} target="_blank" rel="noopener">{n.title}</a> ({n.source})</>)}.</p>}
          {courseFor(s.id) && <p class="hint">Full course: <a href={courseFor(s.id)!.url} target="_blank" rel="noopener">{courseFor(s.id)!.title}</a>, {courseFor(s.id)!.channel}, {courseFor(s.id)!.length}.</p>}
          {plan.dropped.find((x) => x.subject === s.id) && <p class="hint">Left out at your current pace: {plan.dropped.find((x) => x.subject === s.id)!.topics.map((x) => x.name).join(", ")}.</p>}
        </div>}
      </li>;
    })}</ul>
  </div>;
}

export function PracticeScreen(ctx: Ctx) {
  const { dsa } = ctx;
  const pats = dsa ? Object.values(dsa.patterns).filter((p) => p.planned || p.alone || p.help) : [];
  return <div class="screen practice">
    <header class="page-head"><h1 class="title">Practice</h1><p class="lede">Where you solve. Your DSA practice app runs here exactly as before.</p></header>
    <div class="hero">
      <p class="eyebrow">DSA practice</p>
      <h2 class="hero-title">{dsa?.hasPlan ? `Your ${dsa.source.split(" + ").map((x) => x[0].toUpperCase() + x.slice(1)).join(" + ")} problem plan` : "Set up your company problem plan"}</h2>
      <p class="hero-meta">{dsa?.hasPlan ? <><b>{dsa.doneToday}</b><span>solved today</span><b>{dsa.soloToday}</b><span>on your own</span></> : <span>LeetCode inside the app, company problem sets, focus timer, spaced redo.</span>}</p>
      <div class="row"><Button kind="primary" size="lg" onClick={() => api.openPractice()}><Icon.play /> Solve next problem</Button></div>
    </div>
    {pats.length > 0 && <Section title="DSA patterns from your practice">
      <ul class="mini-bars wide">{pats.map((p) => { const v = dsaMastery(p) || 0; return <li><span>{p.name}</span><Bar value={v} label={p.name} /><b>{p.alone + p.help}/{p.planned || "-"}</b></li>; })}</ul>
    </Section>}
    <Section title="Quizzes and mock interviews">
      <Empty title="Coming in the next update" body="Short quizzes for OOPS, OS, DBMS and CN, and mock rounds for LLD and System Design. Until then, sessions use a guided learn, practise, review checklist." />
    </Section>
  </div>;
}

export function ProgressScreen(ctx: Ctx) {
  const { hub, plan, dsa } = ctx;
  const overall = overallReadiness(hub, plan, dsa);
  const p = pace(hub, plan);
  const t = todayKey();
  const week = Object.entries(hub.progress.sessions).filter(([id, r]) => r.status === "done" && daysBetween(id.split("#")[0], t) < 7).reduce((a, [, r]) => a + r.minutes, 0);
  const streak = streakOf(activeDays(hub, dsa));
  const quizzed = Object.keys(hub.progress.quiz || {}).length;
  return <div class="screen progress">
    <header class="page-head"><h1 class="title">Progress</h1><p class="lede">Built from your sessions, self-ratings and DSA practice results.</p></header>
    <div class="stats3">
      <div><span class="eyebrow">Overall readiness</span><b class="num">{quizzed || overall >= 0.005 ? pct(overall) : "Not started"}</b><small>{!quizzed && overall < 0.005 ? "Your first session starts it" : quizzed ? `From practice and ${quizzed} quiz${quizzed === 1 ? "" : "zes"}` : "Estimate until you take a quiz"}</small></div>
      <div><span class="eyebrow">This week</span><b class="num">{hm(week)}</b><small>studied in the Hub</small></div>
      <div><span class="eyebrow">Streak</span><b class="num">{streak} day{streak === 1 ? "" : "s"}</b><small>any session, problem or focus block</small></div>
    </div>
    <Section title="By subject">
      <ul class="readiness">{plan.subjects.slice().sort((a, b) => b.share - a.share).map((s) => {
        const r = subjectReadiness(hub, plan, s, dsa), pc = p[s.id];
        return <li><span class="r-name">{SUBJECT[s.id].short}</span><Bar value={r} tone={r >= 0.7 ? "good" : "accent"} label={`${SUBJECT[s.id].short} readiness`} /><b class={r < 0.005 ? "ns" : ""}>{score(r)}</b>
          <span class={pc <= -2 ? "warn-t" : "muted"}>{pc <= -2 ? `${-pc} days behind` : pc >= 2 ? `${pc} days ahead` : "on pace"}</span></li>;
      })}</ul>
    </Section>
    <details class="more"><summary>How these numbers are calculated</summary>
      <p>DSA comes from your practice app. Recorded Think-first solves without opening the solution count fully; other alone marks count half, and help counts a quarter. For OOPS, OS, DBMS and CN, a topic's latest quiz score counts 60% and study time against its planned time 40%. Before you take a topic's quiz, your self-rating after sessions stands in for it. LLD and System Design use time and self-rating until mock rounds arrive.</p>
    </details>
  </div>;
}

export function SettingsScreen({ ctx, onEditPlan, onReset }: { ctx: Ctx; onEditPlan: () => void; onReset: () => void }) {
  const { hub } = ctx;
  const [confirm, setConfirm] = useState(false);
  return <div class="screen settings">
    <header class="page-head"><h1 class="title">Settings</h1></header>
    <Section title="Reminders">
      <label class="toggle"><input type="checkbox" checked={hub.settings.reminders} onChange={() => update((s) => { s.settings.reminders = !s.settings.reminders; })} /><span class="sw" /><span><b>Session reminders</b><small>10 minutes before, at the start and at the end of each session</small></span></label>
      <label class="toggle"><input type="checkbox" checked={hub.settings.tray} onChange={() => { update((s) => { s.settings.tray = !s.settings.tray; }); api.setTray(!hub.settings.tray); }} /><span class="sw" /><span><b>Keep running in the tray</b><small>Closing the window keeps reminders going. Quit from the tray icon.</small></span></label>
    </Section>
    <Section title="Plan">
      <div class="row"><Button onClick={onEditPlan}>Edit goal and hours</Button><Button kind="danger" onClick={() => setConfirm(true)}>Start over</Button></div>
      <p class="hint">Your DSA practice app keeps its own plan and settings; nothing here changes them.</p>
    </Section>
    <Section title="Sources and credits">
      <p class="hint">Videos open on YouTube; reading opens on the original site. Nothing from these sources is copied into the app.</p>
      <ul class="credits">{CREDITS.map((c) => <li><a href={c.url} target="_blank" rel="noopener">{c.source}</a><span>{c.license}</span></li>)}
        <li><span>Videos</span><span>take U forward (Striver), Coder Army, Gaurav Sen, Kunal Kushwaha, Love Babbar & Lakshya, Gate Smashers</span></li></ul>
    </Section>
    {confirm && <Confirm title="Start over?" body="Clears the Hub's goal, sessions and topic progress. Your DSA practice app and its progress are not touched." ok="Start over" danger onOk={() => { setConfirm(false); onReset(); }} onCancel={() => setConfirm(false)} />}
  </div>;
}

/** A topic quiz on its own screen, opened from Subjects. */
export function QuizScreen({ ctx, topicId }: { ctx: Ctx; topicId: string }) {
  const sub = Object.values(SUBJ).find((x) => x.topics.some((t) => t.id === topicId));
  const t = sub?.topics.find((x) => x.id === topicId);
  return <div class="screen quizscreen">
    <button class="linkbtn back" onClick={() => ctx.go("subjects")}><Icon.back /> Subjects</button>
    <p class="eyebrow">{sub?.name}</p>
    <h1 class="title">{t?.name}</h1>
    <p class="lede">4 questions. Each answer shows why, so a quiz is also a quick revision.</p>
    <Quiz topicId={topicId} />
    <div class="row"><Button kind="quiet" onClick={() => ctx.go("subjects")}>Back to Subjects</Button></div>
  </div>;
}
