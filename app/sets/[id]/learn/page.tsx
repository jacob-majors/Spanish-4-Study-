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
      <div style={{ maxWidth: "42rem" }}>
        <SetHeader set={set} mode="Aprender" />
        <div style={{ borderTop: "var(--rule-thick) solid var(--color-ink)", paddingTop: "var(--space-md)" }}>
          <h1 className="display" style={{ fontSize: "var(--text-xl)" }}>Nothing is due right now.</h1>
          <p className="muted measure" style={{ marginTop: "var(--space-xs)" }}>
            {stats?.mastered === stats?.total
              ? "You have mastered every term in this set. Spaced repetition will bring them back later."
              : "Come back in a bit, or run a practice test to push further."}
          </p>
          <div className="flex flex-wrap gap-3" style={{ marginTop: "var(--space-lg)" }}>
            <button className="btn btn-outline" onClick={() => setRound((r) => r + 1)}>Study anyway</button>
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
      <div style={{ maxWidth: "42rem" }}>
        <SetHeader set={set} mode="Aprender" />
        <div style={{ borderTop: "var(--rule-thick) solid var(--color-ink)", paddingTop: "var(--space-md)" }}>
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
            <span className="data tnum" style={{ fontSize: "var(--text-display)", lineHeight: 1, color: pct >= 80 ? "var(--color-good)" : "var(--color-accent)" }}>{pct}</span>
            <span className="tag" style={{ marginLeft: "auto" }}>{tally.right} right · {tally.wrong} missed</span>
          </div>
          <p className="muted measure" style={{ marginTop: "var(--space-md)", fontSize: "var(--text-sm)" }}>
            Terms you missed come back sooner; terms you nailed get pushed further out. Another round
            will look different.
          </p>
          <div className="flex flex-wrap gap-3" style={{ marginTop: "var(--space-lg)" }}>
            <button className="btn btn-primary" onClick={() => setRound((r) => r + 1)}>Next round</button>
            <Link href={`/sets/${set.id}/test`} className="btn btn-outline">Practice test</Link>
            <Link href={`/sets/${set.id}`} className="link label self-center">Back to set →</Link>
          </div>
        </div>
      </div>
    );
  }

  const prompt = step.dir === "es-en" ? step.card.term : step.card.def;
  const expected = step.dir === "es-en" ? step.card.def : step.card.term;

  return (
    <div style={{ maxWidth: "42rem" }}>
      <SetHeader set={set} mode="Aprender" />

      <div className="flex items-center gap-4" style={{ borderBottom: "var(--rule-hair) solid var(--color-rule)", paddingBottom: "var(--space-xs)" }}>
        <span className="data tnum tag">{idx + 1}/{queue.length}</span>
        <span className="flex-1"><ProgressBar value={(idx / queue.length) * 100} /></span>
        <span className="data tnum tag" style={{ color: "var(--color-good)" }}>{tally.right}</span>
        <span className="data tnum tag" style={{ color: "var(--color-accent)" }}>{tally.wrong}</span>
      </div>

      <div style={{ marginTop: "var(--space-2xl)" }}>
        <p className="label">
          {step.kind === "mc" ? "Elige la respuesta" : step.dir === "es-en" ? "Escribe en inglés" : "Escribe en español"}
        </p>
        <div className="flex items-baseline gap-2 flex-wrap" style={{ marginTop: "var(--space-xs)" }}>
          <h1 className="display" style={{ fontSize: "var(--text-2xl)" }}>{prompt}</h1>
          {step.dir === "es-en" && <SpeakButton text={step.card.term} />}
        </div>

        {step.kind === "mc" ? (
          <div className="grid gap-x-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 15rem), 1fr))", marginTop: "var(--space-xl)" }}>
            {choices.map((c, ci) => {
              const isCorrect = c === expected;
              const dimmed = !!feedback && !isCorrect;
              return (
                <button
                  key={c}
                  disabled={!!feedback}
                  onClick={() => submit(c)}
                  className="flex items-baseline gap-3 text-left"
                  style={{
                    paddingBlock: "var(--space-xs)", minHeight: 44,
                    borderTop: "var(--rule-hair) solid var(--color-rule)",
                    opacity: dimmed ? 0.45 : 1,
                    color: feedback && isCorrect ? "var(--color-good)" : "var(--color-ink)",
                  }}
                >
                  <span className="data shrink-0" style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>{"abcd"[ci] ?? "·"}</span>
                  <span>{c}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <form style={{ marginTop: "var(--space-xl)", maxWidth: "26rem" }} onSubmit={(e) => { e.preventDefault(); feedback ? advance() : submit(input); }}>
            <input
              ref={inputRef}
              className="field"
              style={{ fontSize: "var(--text-lg)" }}
              placeholder="…"
              aria-label="Your answer"
              value={input}
              disabled={!!feedback}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              onChange={(e) => setInput(e.target.value)}
            />
            {step.dir === "en-es" && !feedback && (
              <div style={{ marginTop: "var(--space-md)" }}>
                <AccentKeys onInsert={(ch) => { setInput((v) => v + ch); inputRef.current?.focus(); }} />
              </div>
            )}
            {!feedback && <button className="btn btn-primary" type="submit" style={{ marginTop: "var(--space-lg)" }}>Check</button>}
          </form>
        )}

        {feedback && (
          <div style={{ marginTop: "var(--space-xl)", borderTop: "var(--rule-thick) solid", borderColor: feedback.ok ? "var(--color-good)" : "var(--color-accent)", paddingTop: "var(--space-sm)" }}>
            <p className="flex items-baseline gap-2">
              <span className="data" aria-hidden="true" style={{ color: feedback.ok ? "var(--color-good)" : "var(--color-accent)" }}>
                {feedback.ok ? "✓" : "✗"}
              </span>
              <span className="label" style={{ color: feedback.ok ? "var(--color-good)" : "var(--color-accent)" }}>
                {feedback.ok ? "Correcto" : "Incorrecto"}
              </span>
              {!feedback.ok && <span style={{ fontSize: "var(--text-lg)" }}>{feedback.correct}</span>}
            </p>
            {feedback.message && <p className="muted" style={{ fontSize: "var(--text-sm)", marginTop: "var(--space-3xs)" }}>{feedback.message}</p>}
            <p className="tag" style={{ marginTop: "var(--space-xs)" }}>{step.card.term} — {step.card.def}</p>
            <button className="btn btn-primary" style={{ marginTop: "var(--space-lg)" }} onClick={advance} autoFocus>Continue</button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-4 items-center"
        style={{ marginTop: "var(--space-2xl)", borderTop: "var(--rule-hair) solid var(--color-rule)", paddingTop: "var(--space-md)" }}>
        <Toggle checked={audioOn} onChange={setAudioOn} label="Say the Spanish after each answer" />
        <span className="tag ml-auto">enter checks, enter again continues</span>
      </div>
    </div>
  );
}
