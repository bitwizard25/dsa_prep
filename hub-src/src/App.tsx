// The Hub shell: left rail, header with the goal, and the screens.
import { useEffect, useMemo, useState } from "preact/hooks";
import { buildPlan, todayKey, timetable, clock, parse, localMidnightMs } from "./core/planner";
import { SUBJECT } from "./core/catalog";
import { summarizeDsa, type DsaSummary } from "./core/practice-bridge";
import { dsaSetupFor } from "./core/dsa-setup";
import { today, sessionLabel, setDsaTruth, practiceLocked } from "./core/progress";
import { useHub, update, emptyState, getState, saveNow } from "./store";
import { api, type ReminderItem } from "./api";
import { Icon, Toasts, toast, Empty, Button } from "./ui/kit";
import { PlanMode } from "./screens/PlanMode";
import { TodayScreen, SessionScreen, CompleteScreen, goalName, startSession } from "./screens/Today";
import { RoadmapScreen, SubjectsScreen, ProgressScreen, SettingsScreen, QuizScreen } from "./screens/Pages";

const NAV = [["today", "Today"], ["roadmap", "Roadmap"], ["subjects", "Subjects"], ["practice", "Practice"], ["progress", "Progress"]] as const;
const START = (location.hash.slice(1) || "today").split("?")[0];

export function App() {
  const hub = useHub();
  const [route, setRoute] = useState<{ name: string; arg?: any }>({ name: START });
  const [planMode, setPlanMode] = useState(START === "plan");
  const [dsa, setDsa] = useState<DsaSummary | undefined>();
  const [reminderTick, setReminderTick] = useState(0);
  const plan = useMemo(() => (hub.goal ? buildPlan(hub.goal) : null), [hub.goal]);
  const go = (name: string, arg?: any) => {
    if (name === "practice") {
      if (plan && practiceLocked(hub, plan)) { toast({ title: "Finish your must-do first", body: "Practice opens once the carried-over work is done." }); return; }
      saveNow().then(() => api.openPractice());
      return;
    }
    setRoute({ name, arg }); document.querySelector("main")?.scrollTo(0, 0);
  };

  // DSA progress comes from the practice app's own data; refresh whenever the Hub comes back into view.
  const refreshDsa = () => api.loadState().then((raw) => { const d = summarizeDsa(raw, todayKey()); setDsaTruth(d); setDsa(d); });
  useEffect(() => { refreshDsa(); api.onHubFocus(refreshDsa); api.onHubRoute((r) => { if (r === "plan") { setPlanMode(true); return; } setPlanMode(false); go(r); }); api.onRemindersRefresh?.(() => setReminderTick((n) => n + 1)); }, []);

  // A downloaded update may restart only when this page is not in the middle of a session.
  useEffect(() => { api.setSessionBusy(route.name === "session" || route.name === "quiz"); }, [route.name]);
  useEffect(() => {
    let shown = false;
    const show = () => {
      if (shown) return;
      shown = true;
      toast({
        title: "Update ready", body: "Restart now?", sticky: true,
        action: { label: "Restart now", run: () => { saveNow().then(() => api.installUpdate()).then((r) => { if (r && r.ok === false && r.reason === "busy") { shown = false; toast({ title: "Update ready", body: "It will install after this session.", sticky: true }); } }); } },
      });
    };
    api.updateStatus().then((s) => { if (s && s.ready) show(); }).catch(() => {});
    api.onUpdateReady(() => show());
  }, []);

  // Reminders: hand today's remaining sessions to the main process, which shows system notifications.
  useEffect(() => {
    if (!plan) return;
    const items = today(hub, plan);
    const base = localMidnightMs();
    const list: ReminderItem[] = !hub.settings.reminders ? [] : items.filter((i) => i.state === "upcoming" || i.state === "current").map((i, k, arr) => ({
      id: i.id, title: SUBJECT[i.subject].short, topic: sessionLabel(hub, plan, i, dsa),
      start: base + i.startMin * 60000, end: base + i.endMin * 60000,
      next: arr[k + 1] ? `${SUBJECT[arr[k + 1].subject].short} at ${clock(arr[k + 1].startMin)}` : null,
    }));
    api.setReminders(list);
  }, [plan, hub.progress.sessions, hub.settings.reminders, dsa, reminderTick]);

  // In-app copy of each reminder, with a Start button when it's a session start.
  useEffect(() => api.onReminder((r) => {
    const st = getState(); const p = st.goal ? buildPlan(st.goal) : null;
    const item = p ? timetable(p, todayKey()).find((s) => r.kind === "start" && `${SUBJECT[s.subject].short}` === r.title) : undefined;
    toast({ title: r.title, body: r.body, action: item && p ? { label: "Start", run: () => startSession({ hub: st, plan: p, dsa, go }, item) } : undefined });
  }), []);

  if (!hub.goal || planMode) {
    return <><PlanMode initial={hub.goal} onCancel={hub.goal ? () => setPlanMode(false) : undefined}
      onDone={(g) => { update((s) => { s.goal = g; s.createdAt ||= new Date().toISOString(); s.dsaSetup = dsaSetupFor(g, buildPlan(g)); }); setPlanMode(false); go("today"); toast({ title: "Your plan is ready", body: "Today shows what to do first." }); }} /><Toasts /></>;
  }
  if (!plan) return null;
  const ctx = { hub, plan, dsa, go };
  const screen = (() => {
    switch (route.name) {
      case "roadmap": return <RoadmapScreen {...ctx} />;
      case "subjects": return <SubjectsScreen {...ctx} />;
      case "progress": return <ProgressScreen {...ctx} />;
      case "settings": return <SettingsScreen ctx={ctx} onEditPlan={() => setPlanMode(true)} onReset={() => { update((s) => Object.assign(s, emptyState())); go("today"); }} />;
      case "session": return <SessionScreen ctx={ctx} id={route.arg} />;
      case "quiz": return <QuizScreen ctx={ctx} topicId={route.arg} />;
      case "complete": return <CompleteScreen ctx={ctx} id={route.arg} />;
      default: return <TodayScreen {...ctx} />;
    }
  })();
  const active = ["session", "complete"].includes(route.name) ? "today" : route.name === "quiz" ? "subjects" : route.name;

  return <div class="shell">
    <header class="topnav">
      <img class="tn-logo" src="./icon.png" alt="" />
      <nav class="tn-tabs" aria-label="Main">{NAV.map(([id, label]) => <button class={active === id ? "on" : ""} aria-current={active === id ? "page" : undefined} onClick={() => go(id)}>{label}</button>)}</nav>
      <span class="grow" />
      <button class="goal" onClick={() => setPlanMode(true)} title="Edit your goal and plan">{goalName(plan)}<small>ready by {parse(plan.goal.targetDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</small></button>
      <button class={`tn-icon ${active === "settings" ? "on" : ""}`} aria-label="Settings" title="Settings" onClick={() => go("settings")}><Icon.settings /></button>
    </header>
    <main>{screen}</main>
    <Toasts />
  </div>;
}

export function Boot({ ready }: { ready: boolean }) {
  return ready ? <App /> : <div class="boot"><Empty title="Loading your preparation" body="One moment." /></div>;
}
