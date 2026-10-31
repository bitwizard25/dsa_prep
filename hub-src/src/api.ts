// The bridge to the Electron main process (see src/preload/index.js). Hub code never touches Electron directly.
export interface ReminderItem { id: string; title: string; topic: string; start: number; end: number; next: string | null }
interface Api {
  hubLoad(): Promise<any>;
  hubSave(state: any): Promise<boolean>;
  loadState(): Promise<any>;                     // the practice app's state, read-only here
  openPractice(opts?: { next?: boolean }): Promise<void>;
  setReminders(items: ReminderItem[]): Promise<boolean>;
  setTray(on: boolean): Promise<boolean>;
  onReminder(cb: (r: { kind: string; title: string; body: string }) => void): void;
  onHubFocus(cb: () => void): void;
  onHubRoute(cb: (route: string) => void): void;
  onRemindersRefresh(cb: () => void): void;
  setSessionBusy(on: boolean): Promise<boolean>;
  updateStatus(): Promise<{ ready: boolean; version: string }>;
  installUpdate(): Promise<{ ok: boolean; reason?: string }>;
  onUpdateReady(cb: (info: { version: string }) => void): void;
}
declare global { interface Window { api: Api } }
export const api = window.api;
