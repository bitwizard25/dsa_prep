// A short quiz for one topic. Options are shuffled every attempt so the answer's position never gives it away.
import { useMemo, useState } from "preact/hooks";
import { QUIZ, type Q } from "../data/quizzes";
import { update } from "../store";
import { todayKey } from "../core/planner";
import { Button, Icon } from "./kit";

const shuffle = <T,>(a: T[]) => { const x = a.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };
export const hasQuiz = (topicId: string | null | undefined) => !!(topicId && QUIZ[topicId]);

export function Quiz({ topicId, onDone }: { topicId: string; onDone?: (score: number, total: number) => void }) {
  const qs = useMemo(() => shuffle(QUIZ[topicId] || []).map(([q, opts, a, why]: Q) => {
    const order = shuffle(opts.map((_, i) => i));
    return { q, opts: order.map((i) => opts[i]), answer: order.indexOf(a), why };
  }), [topicId]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  if (!qs.length) return null;

  if (done) {
    const ratio = score / qs.length;
    return <div class="quiz">
      <p class="eyebrow">Quiz result</p>
      <h3 class="quiz-score">{score} of {qs.length}</h3>
      <p class="muted">{ratio >= 0.75 ? "Solid. This topic counts as learned in your progress." : "Worth another look. It will come back for revision, and you can retake the quiz any time."}</p>
    </div>;
  }
  const cur = qs[i];
  const choose = (k: number) => { if (picked !== null) return; setPicked(k); if (k === cur.answer) setScore(score + 1); };
  const next = () => {
    if (i + 1 < qs.length) { setI(i + 1); setPicked(null); return; }
    const final = score;
    update((s) => { ((s.progress.quiz ||= {})[topicId] ||= []).push({ date: todayKey(), score: final, total: qs.length }); });
    setDone(true); onDone?.(final, qs.length);
  };
  return <div class="quiz" aria-live="polite">
    <p class="eyebrow">Question {i + 1} of {qs.length}</p>
    <p class="quiz-q">{cur.q}</p>
    <div class="quiz-opts">{cur.opts.map((o, k) => {
      const state = picked === null ? "" : k === cur.answer ? "right" : k === picked ? "wrong" : "dim";
      return <button class={`quiz-opt ${state}`} disabled={picked !== null} onClick={() => choose(k)}>
        <span class="qo-mark" aria-hidden="true">{state === "right" ? "✓" : state === "wrong" ? "✕" : String.fromCharCode(65 + k)}</span>{o}
        {state === "right" && <span class="sr-only"> (correct answer)</span>}{state === "wrong" && <span class="sr-only"> (your answer, incorrect)</span>}</button>;
    })}</div>
    {picked !== null && <div class="quiz-why"><b>{picked === cur.answer ? "Correct." : "Not quite."}</b> {cur.why}</div>}
    {picked !== null && <div class="row"><Button kind="primary" onClick={next}>{i + 1 < qs.length ? <>Next question <Icon.arrow /></> : "See result"}</Button></div>}
  </div>;
}
