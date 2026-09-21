"use client";

import { useState } from "react";
import { useSet } from "@/lib/useSet";
import { buildTest, TestConfig, DEFAULT_CONFIG } from "@/lib/testgen";
import { recordTest, upsertSet } from "@/lib/storage";
import { progressFor, applyAnswer, keyOf } from "@/lib/srs";
import { SetHeader, NotFound } from "@/components/SetHeader";
import { Toggle, Choice } from "@/components/ui";
import TestRunner, { GradedResult } from "@/components/TestRunner";
import { TestQuestion } from "@/lib/types";

export default function TestPage() {
  const { set, ready } = useSet();
  const [cfg, setCfg] = useState<TestConfig>(DEFAULT_CONFIG);
  const [questions, setQuestions] = useState<TestQuestion[] | null>(null);

  if (!set) return ready ? <NotFound /> : null;

  function start() {
    if (!set) return;
    setQuestions(buildTest(set, cfg));
    window.scrollTo({ top: 0 });
  }

  function onGraded(r: GradedResult) {
    if (!set) return;
    const next = structuredClone(set);
    for (const d of r.detail) {
      if (!d.q.cardId) continue;
      const dir = d.q.note?.includes("Spanish") ? "en-es" : "es-en";
      next.progress[keyOf(d.q.cardId, dir)] = applyAnswer(progressFor(set, d.q.cardId, dir), d.ok);
    }
    next.updatedAt = Date.now();
    upsertSet(next);
    recordTest({
      setId: set.id,
      setTitle: set.title,
      takenAt: Date.now(),
      score: r.score,
      total: r.total,
      durationMs: r.durationMs,
      missed: r.detail.filter((d) => !d.ok).slice(0, 50).map((d) => ({
        prompt: d.q.prompt,
        yours: d.yours,
        correct: d.q.kind === "match" ? (d.rows ?? []).map((x) => `${x.left} = ${x.want}`).join("; ") : d.correct,
      })),
    });
  }

  if (questions) {
    return (
      <div style={{ maxWidth: "46rem" }}>
        <SetHeader set={set} mode="Examen de práctica" />
        <TestRunner
          questions={questions}
          onGraded={onGraded}
          onNewTest={() => setQuestions(null)}
          backHref={`/sets/${set.id}`}
          backLabel="Back to set"
        />
      </div>
    );
  }

  const maxQ = Math.min(60, Math.max(5, set.cards.length * 2));
  return (
    <div style={{ maxWidth: "42rem" }}>
      <SetHeader set={set} mode="Examen de práctica" />

      <h1 className="display" style={{ fontSize: "var(--text-2xl)" }}>Preparar el examen</h1>
      <p className="muted measure" style={{ marginTop: "var(--space-sm)" }}>
        Mixed question types, graded at the end, with a full answer key and a one-click retake of
        everything you missed.
      </p>

      <Field label="Preguntas" note={String(Math.min(cfg.count, maxQ))}>
        <input type="range" min={5} max={maxQ} step={1} value={Math.min(cfg.count, maxQ)}
          aria-label="Number of questions"
          style={{ width: "100%", maxWidth: "26rem", accentColor: "var(--color-accent)" }}
          onChange={(e) => setCfg({ ...cfg, count: Number(e.target.value) })} />
      </Field>

      <Field label="Tipos de pregunta">
        <div className="grid gap-x-8 gap-y-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 13rem), 1fr))" }}>
          {([
            ["cloze", "Fill in the blank"],
            ["mc", "Multiple choice"],
            ["write", "Written answer"],
            ["tf", "True / false"],
            ["match", "Matching"],
          ] as const).map(([k, label]) => (
            <Toggle key={k} checked={cfg.kinds[k]} label={label}
              onChange={(v) => setCfg({ ...cfg, kinds: { ...cfg.kinds, [k]: v } })} />
          ))}
        </div>
      </Field>

      <Field label="Dirección">
        <div className="flex flex-wrap gap-2">
          {([["both", "Both ways"], ["es-en", "Español → Inglés"], ["en-es", "Inglés → Español"]] as const).map(([v, label]) => (
            <Choice key={v} on={cfg.direction === v} onClick={() => setCfg({ ...cfg, direction: v })}>
              {label}
            </Choice>
          ))}
        </div>
      </Field>

      <Field label="Opciones">
        <div className="flex flex-col gap-2">
          <Toggle checked={cfg.focusWeak} onChange={(v) => setCfg({ ...cfg, focusWeak: v })}
            label="Weight the test toward terms I keep missing" />
          <Toggle checked={cfg.starredOnly} onChange={(v) => setCfg({ ...cfg, starredOnly: v })}
            label="Marked terms only" />
        </div>
      </Field>

      <button className="btn btn-primary" style={{ marginTop: "var(--space-xl)" }} onClick={start}>Start test</button>
    </div>
  );
}

/** A labelled block in the setup sheet. Label above, control beneath. */
function Field({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: "var(--space-xl)", borderTop: "var(--rule-hair) solid var(--color-rule)", paddingTop: "var(--space-md)" }}>
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h2 className="label">{label}</h2>
        {note && <span className="tag">{note}</span>}
      </div>
      <div style={{ marginTop: "var(--space-sm)" }}>{children}</div>
    </section>
  );
}
