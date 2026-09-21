"use client";

import { useState } from "react";
import { useSet } from "@/lib/useSet";
import { buildTest, TestConfig, DEFAULT_CONFIG } from "@/lib/testgen";
import { recordTest, upsertSet } from "@/lib/storage";
import { progressFor, applyAnswer, keyOf } from "@/lib/srs";
import { SetHeader, NotFound } from "@/components/SetHeader";
import { Toggle } from "@/components/ui";
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
      <div className="max-w-3xl mx-auto">
        <SetHeader set={set} mode="Practice test" />
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
    <div className="max-w-2xl mx-auto">
      <SetHeader set={set} mode="Practice test" />
      <div className="card-shell p-6 space-y-5">
        <div>
          <h1 className="text-xl font-bold">Build your test</h1>
          <p className="muted text-sm mt-1">
            Mixed question types, graded at the end, with a full answer key and a one-click retake of
            everything you missed.
          </p>
        </div>

        <div>
          <label className="text-sm font-semibold flex justify-between">
            <span>Questions</span><span className="muted">{Math.min(cfg.count, maxQ)}</span>
          </label>
          <input type="range" min={5} max={maxQ} step={1} value={Math.min(cfg.count, maxQ)}
            className="w-full mt-2 accent-[var(--accent)]"
            onChange={(e) => setCfg({ ...cfg, count: Number(e.target.value) })} />
        </div>

        <div>
          <div className="text-sm font-semibold mb-2">Question types</div>
          <div className="grid sm:grid-cols-2 gap-2.5">
            {([["mc", "Multiple choice"], ["write", "Written answer"], ["tf", "True / false"], ["match", "Matching"]] as const).map(([k, label]) => (
              <Toggle key={k} checked={cfg.kinds[k]} label={label}
                onChange={(v) => setCfg({ ...cfg, kinds: { ...cfg.kinds, [k]: v } })} />
            ))}
          </div>
        </div>

        <div>
          <div className="text-sm font-semibold mb-2">Direction</div>
          <div className="flex flex-wrap gap-1.5">
            {([["both", "Both ways"], ["es-en", "Spanish → English"], ["en-es", "English → Spanish"]] as const).map(([v, label]) => (
              <button key={v} onClick={() => setCfg({ ...cfg, direction: v })}
                className="btn btn-ghost !py-1.5 !px-3 text-xs"
                style={cfg.direction === v ? { background: "var(--accent)", color: "#fff" } : undefined}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2.5">
          <Toggle checked={cfg.focusWeak} onChange={(v) => setCfg({ ...cfg, focusWeak: v })}
            label="Weight the test toward terms I keep missing" />
          <Toggle checked={cfg.starredOnly} onChange={(v) => setCfg({ ...cfg, starredOnly: v })}
            label="Starred terms only" />
        </div>

        <button className="btn btn-primary w-full" onClick={start}>Start test</button>
      </div>
    </div>
  );
}
