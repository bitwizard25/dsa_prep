// Pomodoro timer. Persists in state so it survives restarts.
import { store } from "./state.js";
import { dayLog } from "./practice.js";

const T = () => store.S.timer;
const W = () => store.S.pomo.work * 60, B = () => store.S.pomo.brk * 60;
export const RING = 2 * Math.PI * 88;

export const left = () => (T().running ? Math.max(0, Math.ceil((T().endsAt - Date.now()) / 1000)) : T().left);
export const total = () => T().total || (T().mode === "work" ? W() : B());
export const ringOffset = () => RING * (1 - left() / total());
export const mmss = (s) => String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
export const mode = () => (T().mode === "break" ? "break" : T().running ? "focus" : "idle");
export const inFocus = () => store.S.focusBlock && T().running && T().mode === "work";

export const BREAK_TIPS = [
  "Stand up and walk around. Phone face down.",
  "Drink a full glass of water.",
  "Look at something far away for 20 seconds.",
  "Say out loud how you solved the last problem.",
  "Stretch your neck, shoulders and wrists.",
  "Close your eyes and breathe slowly for a minute.",
];

export function toggle() {
  const t = T();
  if (t.running) { t.left = left(); t.running = false; }
  else { t.endsAt = Date.now() + t.left * 1000; t.running = true; }
  store.save();
}
export function reset() { const t = T(); t.mode = "work"; t.left = W(); t.running = false; delete t.total; store.save(); }
export function setPreset(work, brk) {
  store.S.pomo = { work, brk };
  if (!T().running) { T().left = T().mode === "work" ? W() : B(); delete T().total; }
  store.save();
}

/** Called every second. Returns an event name when a phase ends, else null. */
export function tick() {
  const t = T();
  if (!t.running || Date.now() < t.endsAt) return null;
  if (t.mode === "work") {
    const L = dayLog(); L.pomos++; store.S.askEnergy = true;
    const long = L.pomos % 4 === 0;
    t.mode = "break"; t.left = long ? Math.max(B(), 20 * 60) : B(); t.total = t.left;
    t.endsAt = Date.now() + t.left * 1000; t.running = true;
    store.save();
    return long ? "long-break" : "break";
  }
  t.mode = "work"; t.left = W(); t.running = false; delete t.total;
  store.save();
  return "work";
}

export function beep() {
  try {
    const a = new AudioContext();
    [0, 0.35, 0.7].forEach((s) => {
      const o = a.createOscillator(), g = a.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(a.destination);
      g.gain.setValueAtTime(0.2, a.currentTime + s);
      g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + s + 0.3);
      o.start(a.currentTime + s); o.stop(a.currentTime + s + 0.3);
    });
  } catch {}
}
