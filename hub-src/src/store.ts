// Hub state: one object, saved through the main process. Kept separate from the practice app's state.json.
import { useEffect, useState } from "preact/hooks";
import { api } from "./api";
import type { Goal } from "./core/planner";

export interface TopicProgress { minutes: number; ratings: number[]; done?: boolean }
export interface SessionRecord { status: "active" | "done" | "skipped"; minutes: number; rating?: number; startedAt?: number; topicId?: string | null }
export interface HubState {
  version: 1;
  goal: Goal | null;
  dsaSetup?: import("./core/dsa-setup").DsaSetup | null;   // read by the practice app on its next start
  createdAt?: string;
  progress: { topics: Record<string, TopicProgress>; sessions: Record<string, SessionRecord>; quiz?: Record<string, { date: string; score: number; total: number }[]>; revision?: Record<string, { due: string; topicId: string }> };
  settings: { reminders: boolean; tray: boolean; mustDoAll?: boolean };
}

export const emptyState = (): HubState => ({
  version: 1, goal: null,
  progress: { topics: {}, sessions: {} },
  settings: { reminders: true, tray: false },
});

// A tiny global store: components subscribe; updates save to disk (debounced).
let state: HubState = emptyState();
const subs = new Set<() => void>();
let saveTimer: any;
export const getState = () => state;
export function update(fn: (s: HubState) => void) {
  fn(state);
  state = { ...state };
  subs.forEach((f) => f());
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => api.hubSave(state), 250);
}
/** Save right now (used before leaving the Hub, so nothing is lost to the debounce). */
export function saveNow() { clearTimeout(saveTimer); return api.hubSave(state); }
export async function loadState() {
  const raw = await api.hubLoad();
  const base = emptyState();
  state = raw && raw.version === 1 ? { ...base, ...raw, progress: { ...base.progress, ...raw.progress }, settings: { ...base.settings, ...raw.settings } } : base;
  subs.forEach((f) => f());
  return state;
}
export function useHub(): HubState {
  const [, set] = useState(0);
  useEffect(() => { const f = () => set((n) => n + 1); subs.add(f); return () => { subs.delete(f); }; }, []);
  return state;
}
