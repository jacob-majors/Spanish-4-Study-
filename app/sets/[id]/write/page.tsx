"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSet } from "@/lib/useSet";
import { shuffle, progressFor, applyAnswer, keyOf } from "@/lib/srs";
import { upsertSet, touchStreak } from "@/lib/storage";
import { grade } from "@/lib/grade";
import { speak } from "@/lib/tts";
import { SetHeader, NotFound } from "@/components/SetHeader";
import { ProgressBar, AccentKeys, SpeakButton, Toggle } from "@/components/ui";
import { Card, Direction } from "@/lib/types";

export default function WritePage() {
  const { set, ready } = useSet();
  const [dir, setDir] = useState<Direction>("en-es");
  const [strictAccents, setStrictAccents] = useState(true);
  const [queue, setQueue] = useState<Card[]>([]);
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [fb, setFb] = useState<null | { ok: boolean; message?: string; correct: string }>(null);
  const [missed, setMissed] = useState<{ card: Card; yours: string }[]>([]);
  const [right, setRight] = useState(0);
  const [round, setRound] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!set) return;
    setQueue(shuffle(set.cards));
    setIdx(0); setInput(""); setFb(null); setMissed([]); setRight(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set?.id, round, dir]);

  useEffect(() => { touchStreak(); }, []);
  useEffect(() => { if (!fb) inputRef.current?.focus(); }, [idx, fb]);

  if (!set) return ready ? <NotFound /> : null;
  if (!queue.length) return <div><SetHeader set={set} mode="Escribir" /><p className="muted">This set has no terms.</p></div>;

  const card = queue[idx];
  const done = idx >= queue.length;

  function check() {
    if (!set || fb || !card) return;
    const expected = dir === "es-en" ? card.def : card.term;
    const res = grade(input, expected, {
      requireAccents: dir === "en-es" && strictAccents,
      allowTypos: dir === "es-en",
    });
    const next = structuredClone(set);
    const k = keyOf(card.id, dir);
    next.progress[k] = applyAnswer(progressFor(set, card.id, dir), res.pass);
    next.updatedAt = Date.now();
    upsertSet(next);

    if (res.pass) setRight((r) => r + 1);
    else setMissed((m) => [...m, { card, yours: input }]);
    setFb({ ok: res.pass, message: res.message, correct: expected });
    if (dir === "en-es") speak(card.term);
  }

  function next() { setFb(null); setInput(""); setIdx((n) => n + 1); }

  function retryMissed() {
    setQueue(missed.map((m) => m.card));
    setMissed([]); setRight(0); setIdx(0); setInput(""); setFb(null);
  }

  if (done) {
    const pct = Math.round((right / queue.length) * 100);
    return (
      <div style={{ maxWidth: "42rem" }}>
        <SetHeader set={set} mode="Escribir" />
        <div style={{ borderTop: "var(--rule-thick) solid var(--color-ink)", paddingTop: "var(--space-md)" }}>
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
            <span className="data tnum" style={{ fontSize: "var(--text-display)", lineHeight: 1, color: pct >= 80 ? "var(--color-good)" : "var(--color-accent)" }}>{pct}</span>
            <span className="tag" style={{ marginLeft: "auto" }}>{right} of {queue.length} spelled correctly</span>
          </div>
          <div className="flex flex-wrap gap-3" style={{ marginTop: "var(--space-lg)" }}>
            {missed.length > 0 && <button className="btn btn-primary" onClick={retryMissed}>Redo the {missed.length} you missed</button>}
            <button className="btn btn-outline" onClick={() => setRound((r) => r + 1)}>Start over</button>
            <Link href={`/sets/${set.id}`} className="link label self-center">Back to set →</Link>
          </div>
        </div>
        {missed.length > 0 && (
          <section style={{ marginTop: "var(--space-2xl)" }}>
            <h2 className="display" style={{ fontSize: "var(--text-xl)", borderBottom: "var(--rule-thick) solid var(--color-ink)", paddingBottom: "var(--space-xs)" }}>
              Errores
            </h2>
            <table className="sheet" style={{ marginTop: "var(--space-xs)" }}>
              <thead>
                <tr><th>Prompt</th><th>Tu respuesta</th><th style={{ textAlign: "right" }}>Correcta</th></tr>
              </thead>
              <tbody>
                {missed.map((m, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: "var(--text-sm)" }}>{dir === "es-en" ? m.card.term : m.card.def}</td>
                    <td style={{ fontSize: "var(--text-sm)", color: "var(--color-accent)" }}>{m.yours || "—"}</td>
                    <td style={{ fontSize: "var(--text-sm)", textAlign: "right", color: "var(--color-good)" }}>{dir === "es-en" ? m.card.def : m.card.term}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    );
  }

  const prompt = dir === "es-en" ? card.term : card.def;

  return (
    <div style={{ maxWidth: "42rem" }}>
      <SetHeader set={set} mode="Escribir" />

      <div className="flex items-center gap-4" style={{ borderBottom: "var(--rule-hair) solid var(--color-rule)", paddingBottom: "var(--space-xs)" }}>
        <span className="data tnum tag">{idx + 1}/{queue.length}</span>
        <span className="flex-1"><ProgressBar value={(idx / queue.length) * 100} /></span>
        <span className="data tnum tag" style={{ color: "var(--color-good)" }}>{right}</span>
      </div>

      <div style={{ marginTop: "var(--space-2xl)" }}>
        <p className="label">{dir === "es-en" ? "Escribe en inglés" : "Escribe en español"}</p>
        <div className="flex items-baseline gap-2 flex-wrap" style={{ marginTop: "var(--space-xs)" }}>
          <h1 className="display" style={{ fontSize: "var(--text-2xl)" }}>{prompt}</h1>
          {dir === "es-en" && <SpeakButton text={card.term} />}
        </div>
        {card.hint && <p className="tag" style={{ marginTop: "var(--space-xs)" }}>Hint: {card.hint}</p>}

        <form style={{ marginTop: "var(--space-xl)", maxWidth: "26rem" }} onSubmit={(e) => { e.preventDefault(); fb ? next() : check(); }}>
          <input
            ref={inputRef}
            className="field"
            style={{ fontSize: "var(--text-lg)" }}
            placeholder="…"
            aria-label="Your answer"
            value={input}
            disabled={!!fb}
            autoComplete="off" autoCapitalize="off" spellCheck={false}
            onChange={(e) => setInput(e.target.value)}
          />
          {dir === "en-es" && !fb && (
            <div style={{ marginTop: "var(--space-md)" }}>
              <AccentKeys onInsert={(ch) => { setInput((v) => v + ch); inputRef.current?.focus(); }} />
            </div>
          )}
          {!fb && <button className="btn btn-primary" type="submit" style={{ marginTop: "var(--space-lg)" }}>Check</button>}
        </form>

        {fb && (
          <div style={{ marginTop: "var(--space-xl)", borderTop: "var(--rule-thick) solid", borderColor: fb.ok ? "var(--color-good)" : "var(--color-accent)", paddingTop: "var(--space-sm)" }}>
            <p className="flex items-baseline gap-2">
              <span className="data" aria-hidden="true" style={{ color: fb.ok ? "var(--color-good)" : "var(--color-accent)" }}>{fb.ok ? "✓" : "✗"}</span>
              <span className="label" style={{ color: fb.ok ? "var(--color-good)" : "var(--color-accent)" }}>{fb.ok ? "Correcto" : "Incorrecto"}</span>
              {!fb.ok && <span style={{ fontSize: "var(--text-lg)" }}>{fb.correct}</span>}
            </p>
            {fb.message && <p className="muted" style={{ fontSize: "var(--text-sm)", marginTop: "var(--space-3xs)" }}>{fb.message}</p>}
            <button className="btn btn-primary" style={{ marginTop: "var(--space-lg)" }} onClick={next} autoFocus>Continue</button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2 items-center"
        style={{ marginTop: "var(--space-2xl)", borderTop: "var(--rule-hair) solid var(--color-rule)", paddingTop: "var(--space-md)" }}>
        <Toggle checked={dir === "en-es"} onChange={(v) => setDir(v ? "en-es" : "es-en")} label="Write in Spanish" />
        <Toggle checked={strictAccents} onChange={setStrictAccents} label="Accents must be right" />
      </div>
    </div>
  );
}
