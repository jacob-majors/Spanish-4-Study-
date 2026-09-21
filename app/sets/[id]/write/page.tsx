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
  if (!queue.length) return <div><SetHeader set={set} mode="Write" /><div className="card-shell p-10 text-center muted">This set has no terms.</div></div>;

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
      <div className="max-w-2xl mx-auto">
        <SetHeader set={set} mode="Write" />
        <div className="card-shell p-8 text-center">
          <div className="text-4xl font-extrabold" style={{ color: pct >= 80 ? "var(--good)" : "var(--warn)" }}>{pct}%</div>
          <p className="muted mt-1">{right} of {queue.length} spelled correctly.</p>
          <div className="flex flex-wrap gap-2 justify-center mt-5">
            {missed.length > 0 && <button className="btn btn-primary" onClick={retryMissed}>Redo the {missed.length} you missed</button>}
            <button className="btn btn-outline" onClick={() => setRound((r) => r + 1)}>Start over</button>
            <Link href={`/sets/${set.id}`} className="btn btn-ghost">Back to set</Link>
          </div>
        </div>
        {missed.length > 0 && (
          <div className="card-shell p-5 mt-4">
            <h3 className="font-bold mb-3">What you missed</h3>
            <div className="space-y-2">
              {missed.map((m, i) => (
                <div key={i} className="text-sm rounded-lg p-3" style={{ background: "var(--surface-2)" }}>
                  <div className="font-medium">{dir === "es-en" ? m.card.term : m.card.def}</div>
                  <div className="mt-1" style={{ color: "var(--bad)" }}>You wrote: {m.yours || "(blank)"}</div>
                  <div style={{ color: "var(--good)" }}>Correct: {dir === "es-en" ? m.card.def : m.card.term}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const prompt = dir === "es-en" ? card.term : card.def;

  return (
    <div className="max-w-2xl mx-auto">
      <SetHeader set={set} mode="Write" />

      <div className="flex items-center gap-3 text-sm mb-4">
        <span className="muted">{idx + 1} / {queue.length}</span>
        <div className="flex-1"><ProgressBar value={(idx / queue.length) * 100} /></div>
        <span className="chip" style={{ color: "var(--good)" }}>{right} right</span>
      </div>

      <div className="card-shell p-6">
        <div className="text-xs muted uppercase tracking-wider">
          {dir === "es-en" ? "Write the English" : "Write the Spanish"}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <div className="text-2xl md:text-3xl font-bold">{prompt}</div>
          {dir === "es-en" && <SpeakButton text={card.term} />}
        </div>
        {card.hint && <div className="text-sm muted mt-2">Hint: {card.hint}</div>}

        <form className="mt-6 space-y-3" onSubmit={(e) => { e.preventDefault(); fb ? next() : check(); }}>
          <input
            ref={inputRef}
            className="input text-lg"
            placeholder="Type your answer…"
            value={input}
            disabled={!!fb}
            autoComplete="off" autoCapitalize="off" spellCheck={false}
            onChange={(e) => setInput(e.target.value)}
          />
          {dir === "en-es" && !fb && (
            <AccentKeys onInsert={(ch) => { setInput((v) => v + ch); inputRef.current?.focus(); }} />
          )}
          {!fb && <button className="btn btn-primary" type="submit">Check</button>}
        </form>

        {fb && (
          <div className={`mt-5 rounded-xl p-4 pop ${fb.ok ? "" : "shake"}`}
            style={{ background: "var(--surface-2)", borderLeft: `3px solid ${fb.ok ? "var(--good)" : "var(--bad)"}` }}>
            <div className="font-semibold" style={{ color: fb.ok ? "var(--good)" : "var(--bad)" }}>
              {fb.ok ? "Correct" : "Not quite"}
            </div>
            <div className="text-sm mt-1">{fb.message ?? <>Answer: <strong>{fb.correct}</strong></>}</div>
            <button className="btn btn-primary mt-3" onClick={next} autoFocus>Continue →</button>
          </div>
        )}
      </div>

      <div className="card-shell p-4 mt-4 flex flex-wrap gap-5 items-center">
        <Toggle checked={dir === "en-es"} onChange={(v) => setDir(v ? "en-es" : "es-en")} label="Write in Spanish" />
        <Toggle checked={strictAccents} onChange={setStrictAccents} label="Accents must be right" />
      </div>
    </div>
  );
}
