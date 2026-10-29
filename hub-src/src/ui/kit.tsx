// Shared UI pieces. Every screen is built from these so the Hub feels like one product.
import type { ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";

const P = (d: string) => <path d={d} />;
export const Icon = {
  today: () => <svg viewBox="0 0 24 24" aria-hidden="true">{P("M4 6h16M4 12h10M4 18h7")}<circle cx="18" cy="16" r="3" /></svg>,
  roadmap: () => <svg viewBox="0 0 24 24" aria-hidden="true">{P("M5 19c4-1 3-6 7-7s3-6 7-7")}<circle cx="5" cy="19" r="2" /><circle cx="19" cy="5" r="2" /></svg>,
  subjects: () => <svg viewBox="0 0 24 24" aria-hidden="true">{P("M4 5h7v14H4zM13 5h7v14h-7z")}</svg>,
  practice: () => <svg viewBox="0 0 24 24" aria-hidden="true">{P("M8 8l-4 4 4 4M16 8l4 4-4 4M13 6l-2 12")}</svg>,
  progress: () => <svg viewBox="0 0 24 24" aria-hidden="true">{P("M5 19V11M12 19V5M19 19v-6")}</svg>,
  settings: () => <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" />{P("M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1")}</svg>,
  play: () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z" class="fill" /></svg>,
  check: () => <svg viewBox="0 0 24 24" aria-hidden="true">{P("M5 12.5l4.5 4.5L19 7.5")}</svg>,
  arrow: () => <svg viewBox="0 0 24 24" aria-hidden="true">{P("M5 12h14M13 6l6 6-6 6")}</svg>,
  back: () => <svg viewBox="0 0 24 24" aria-hidden="true">{P("M15 5l-7 7 7 7")}</svg>,
  chevron: () => <svg viewBox="0 0 24 24" aria-hidden="true">{P("M6 9l6 6 6-6")}</svg>,
  bell: () => <svg viewBox="0 0 24 24" aria-hidden="true">{P("M6 16V11a6 6 0 0112 0v5l2 2H4zM10 21h4")}</svg>,
  close: () => <svg viewBox="0 0 24 24" aria-hidden="true">{P("M6 6l12 12M18 6L6 18")}</svg>,
};

type BtnProps = { kind?: "primary" | "secondary" | "quiet" | "danger"; size?: "sm" | "md" | "lg"; onClick?: () => void; disabled?: boolean; children: ComponentChildren; title?: string; type?: string };
export const Button = ({ kind = "secondary", size = "md", children, ...rest }: BtnProps) =>
  <button class={`btn ${kind} ${size}`} {...(rest as any)}>{children}</button>;

export const Bar = ({ value, label, tone = "accent" }: { value: number; label?: string; tone?: "accent" | "good" | "warn" | "muted" }) => (
  <div class={`bar ${tone}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)} aria-label={label}>
    <i style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
  </div>
);

export const Section = ({ title, action, children }: { title: string; action?: ComponentChildren; children: ComponentChildren }) => (
  <section class="section"><header><h2>{title}</h2>{action}</header>{children}</section>
);

export const Empty = ({ title, body, action }: { title: string; body: string; action?: ComponentChildren }) => (
  <div class="empty"><h3>{title}</h3><p>{body}</p>{action}</div>
);

export const pct = (v: number) => `${Math.round(v * 100)}%`;
/** Progress in words when there is none yet: "Not started" reads better than a wall of 0%. */
export const score = (v: number) => (v < 0.005 ? "Not started" : `${Math.round(v * 100)}%`);
/** How often a rotating subject comes up, in plain words. */
export const howOften = (avgMin: number, slotMin: number) => {
  const every = Math.max(2, Math.round(slotMin / Math.max(1, avgMin)));
  return `${hm(slotMin)}, every ${every === 2 ? "other" : every === 3 ? "3rd" : `${every}th`} study day`;
};
export const hm = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ""}` : `${min} min`);

/** Steps shown while something is being prepared, so the wait reads as work, not a blank screen. */
export function Steps({ steps, onDone, ms = 380 }: { steps: string[]; onDone: () => void; ms?: number }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (i >= steps.length) { onDone(); return; }
    const t = setTimeout(() => setI(i + 1), ms);
    return () => clearTimeout(t);
  }, [i]);
  return <ol class="steps" aria-live="polite">{steps.map((s, k) => <li class={k < i ? "done" : k === i ? "now" : ""}>{k < i ? <Icon.check /> : <span class="dot" />}{s}</li>)}</ol>;
}

// ---------- toasts ----------
type Toast = { id: number; title: string; body?: string; action?: { label: string; run: () => void } };
let push: (t: Omit<Toast, "id">) => void = () => {};
export const toast = (t: Omit<Toast, "id">) => push(t);
export function Toasts() {
  const [items, setItems] = useState<Toast[]>([]);
  push = (t) => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x.slice(-2), { ...t, id }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 9000);
  };
  return <div class="toasts" role="status" aria-live="polite">{items.map((t) => (
    <div class="toast" key={t.id}>
      <div><b>{t.title}</b>{t.body && <p>{t.body}</p>}</div>
      {t.action && <Button kind="primary" size="sm" onClick={() => { t.action!.run(); setItems((x) => x.filter((i) => i.id !== t.id)); }}>{t.action.label}</Button>}
      <button class="iconbtn" aria-label="Dismiss" onClick={() => setItems((x) => x.filter((i) => i.id !== t.id))}><Icon.close /></button>
    </div>))}</div>;
}

// ---------- confirm dialog ----------
export function Confirm({ title, body, ok, danger, onOk, onCancel }: { title: string; body: string; ok: string; danger?: boolean; onOk: () => void; onCancel: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    addEventListener("keydown", k);
    (document.querySelector(".modal .btn.secondary") as HTMLElement)?.focus();
    return () => removeEventListener("keydown", k);
  }, []);
  return <div class="modal" role="dialog" aria-modal="true" aria-labelledby="dlg-t"><div class="dialog">
    <h3 id="dlg-t">{title}</h3><p>{body}</p>
    <div class="row end"><Button onClick={onCancel}>Cancel</Button><Button kind={danger ? "danger" : "primary"} onClick={onOk}>{ok}</Button></div>
  </div></div>;
}
