"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSet } from "@/lib/useSet";
import { studyQueue, progressFor, applyAnswer, keyOf, sample, shuffle, statsFor } from "@/lib/srs";
import { upsertSet, touchStreak } from "@/lib/storage";
import { grade } from "@/lib/grade";
import { speak } from "@/lib/tts";
import { SetHeader, NotFound } from "@/components/SetHeader";
import { ProgressBar, AccentKeys, SpeakButton, Toggle } from "@/components/ui";
import { Card, Direction } from "@/lib/types";

type Step = { card: Card; dir: Direction; kind: "mc" | "write" };

export default function LearnPage() {
  const { set, ready } = useSet();
  const [queue, setQueue] = useState<Step[]>([]);
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<null | { ok: boolean; message?: string; correct: string }>(null);
  const [round, setRound] = useState(0);
  const [tally, setTally] = useState({ right: 0, wrong: 0 });
  const [audioOn, setAudioOn] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const stats = set ? statsFor(set) : null;

  // Build a round: overdue and weak cards first, harder question types as a card matures.
  useEffect(() => {
    if (!set) return;
    const cards = studyQueue(set, "es-en", 14);
    const steps: Step[] = cards.map((c) => {
      const p = progressFor(set, c.id, "es-en");
      const dir: Direction = p.box >= 2 ? "en-es" : "es-en";
      const kind = p.box >= 1 ? "write" : "mc";
      return { card: c, dir, kind };
    });
    setQueue(shuffle(steps));
    setIdx(0);
    setInput("");
    setFeedback(null);
    setTally({ right: 0, wrong: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set?.id, round]);

  useEffect(() => { touchStreak(); }, []);
  useEffect(() => { if (!feedback) inputRef.current?.focus(); }, [idx, feedback]);

  const step = queue[idx];

  const choices = useMemo(() => {
    if (!set || !step || step.kind !== "mc") return [];
    const answerOf = (c: Card) => (step.dir === "es-en" ? c.def : c.term);
    const correct = answerOf(step.card);
    const others = sample(set.cards.filter((c) => c.id !== step.card.id && answerOf(c) !== correct), 3).map(answerOf);
    return shuffle([correct, ...others]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set?.id, step?.card.id, step?.dir, step?.kind, idx]);

  if (!set) return ready ? <NotFound /> : null;

  if (!queue.length) {
    return (
      <div className="max-w-2xl mx-auto">
        <SetHeader set={set} mode="Learn" />
        <div className="card-shell p-10 text-center">
          <div className="text-lg font-semibold">Nothing is due right now.</div>
          <p className="muted text-sm mt-1.5">
            {stats?.mastered === stats?.total
              ? "You have mastered every term in this set. Spaced repetition will bring them back later."
              : "Come back in a bit, or run a practice test to push further."}
          </p>
          <div className="flex gap-2 justify-center mt-5">
            <button className="btn btn-ghost" onClick={() => setRound((r) => r + 1)}>Study anyway</button>
            <Link href={`/sets/${set.id}/test`} className="btn btn-primary">Practice test</Link>
          </div>
        </div>
      </div>
    );
  }

  const finished = idx >= queue.length;

  function submit(answer: string) {
    if (!set || !step || feedback) return;
    const expected = step.dir === "es-en" ? step.card.def : step.card.term;
    const res = step.kind === "mc"
      ? { pass: answer === expected, message: undefined as string | undefined }
      : grade(answer, expected, { allowTypos: true });

    const next = structuredClone(set);
    const k = keyOf(step.card.id, step.dir);
    next.progress[k] = applyAnswer(progressFor(set, step.card.id, step.dir), res.pass);
    next.updatedAt = Date.now();
    upsertSet(next);

    setTally((t) => ({ right: t.right + (res.pass ? 1 : 0), wrong: t.wrong + (res.pass ? 0 : 1) }));
    setFeedback({ ok: res.pass, message: res.message, correct: expected });
    if (audioOn) speak(step.card.term);
  }

  function advance() {
    setFeedback(null);
    setInput("");
    setIdx((n) => n + 1);
  }

  if (finished) {
    const pct = Math.round((tally.right / Math.max(1, tally.right + tally.wrong)) * 100);
    return (
      <div className="max-w-2xl mx-auto">
        <SetHeader set={set} mode="Learn" />
        <div className="card-shell p-8 text-center">
          <div className="text-4xl font-extrabold" style={{ color: pct >= 80 ? "var(--good)" : "var(--warn)" }}>{pct}%</div>
          <p className="muted mt-1">{tally.right} right, {tally.wrong} missed this round.</p>
          <p className="text-sm muted mt-3 max-w-sm mx-auto">
            Terms you missed come back sooner; terms you nailed get pushed further out. Another round
            will look different.
          </p>
          <div className="flex flex-wrap gap-2 justify-center mt-5">
            <button className="btn btn-primary" onClick={() => setRound((r) => r + 1)}>Next round</button>
            <Link href={`/sets/${set.id}/test`} className="btn btn-outline">Practice test</Link>
            <Link href={`/sets/${set.id}`} className="btn btn-ghost">Back to set</Link>
          </div>
        </div>
      </div>
    );
  }

  const prompt = step.dir === "es-en" ? step.card.term : step.card.def;
  const expected = step.dir === "es-en" ? step.card.def : step.card.term;

  return (
    <div className="max-w-2xl mx-auto">
      <SetHeader set={set} mode="Learn" />

      <div className="flex items-center gap-3 text-sm mb-4">
        <span className="muted">{idx + 1} / {queue.length}</span>
        <div className="flex-1"><ProgressBar value={(idx / queue.length) * 100} /></div>
        <span className="chip" style={{ color: "var(--good)" }}>{tally.right}</span>
        <span className="chip" style={{ color: "var(--bad)" }}>{tally.wrong}</span>
      </div>

      <div className="card-shell p-6">
        <div className="text-xs muted uppercase tracking-wider">
          {step.kind === "mc" ? "Pick the answer" : step.dir === "es-en" ? "Type the English" : "Type the Spanish"}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <div className="text-2xl md:text-3xl font-bold">{prompt}</div>
          {step.dir === "es-en" && <SpeakButton text={step.card.term} />}
        </div>

        {step.kind === "mc" ? (
          <div className="grid sm:grid-cols-2 gap-2 mt-6">
            {choices.map((c) => {
              const isCorrect = c === expected;
              const chosenWrong = !!feedback && !feedback.ok && !isCorrect;
              return (
                <button
                  key={c}
                  disabled={!!feedback}
                  onClick={() => submit(c)}
                  className="btn btn-outline !justify-start text-left !py-3"
                  style={feedback && isCorrect
                    ? { borderColor: "var(--good)", color: "var(--good)" }
                    : chosenWrong ? { opacity: 0.5 } : undefined}
                >
                  {c}
                </button>
              );
            })}
          </div>
        ) : (
          <form className="mt-6 space-y-3" onSubmit={(e) => { e.preventDefault(); feedback ? advance() : submit(input); }}>
            <input
              ref={inputRef}
              className="input text-lg"
              placeholder="Type your answer…"
              value={input}
              disabled={!!feedback}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              onChange={(e) => setInput(e.target.value)}
            />
            {step.dir === "en-es" && !feedback && (
              <AccentKeys onInsert={(ch) => { setInput((v) => v + ch); inputRef.current?.focus(); }} />
            )}
            {!feedback && <button className="btn btn-primary" type="submit">Check</button>}
          </form>
        )}

        {feedback && (
          <div className={`mt-5 rounded-xl p-4 pop ${feedback.ok ? "" : "shake"}`}
            style={{ background: "var(--surface-2)", borderLeft: `3px solid ${feedback.ok ? "var(--good)" : "var(--bad)"}` }}>
            <div className="font-semibold" style={{ color: feedback.ok ? "var(--good)" : "var(--bad)" }}>
              {feedback.ok ? "Correct" : "Not quite"}
            </div>
            <div className="text-sm mt-1">{feedback.message ?? <>Answer: <strong>{feedback.correct}</strong></>}</div>
            <div className="text-xs muted mt-1">{step.card.term} — {step.card.def}</div>
            <button className="btn btn-primary mt-3" onClick={advance} autoFocus>Continue →</button>
          </div>
        )}
      </div>

      <div className="card-shell p-4 mt-4 flex flex-wrap gap-5 items-center">
        <Toggle checked={audioOn} onChange={setAudioOn} label="Say the Spanish after each answer" />
        <span className="text-xs muted ml-auto">Enter checks, then Enter again continues</span>
      </div>
    </div>
  );
}
