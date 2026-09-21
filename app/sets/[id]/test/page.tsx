"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSet } from "@/lib/useSet";
import { buildTest, TestConfig, DEFAULT_CONFIG } from "@/lib/testgen";
import { grade } from "@/lib/grade";
import { recordTest, upsertSet } from "@/lib/storage";
import { progressFor, applyAnswer, keyOf } from "@/lib/srs";
import { speak } from "@/lib/tts";
import { SetHeader, NotFound } from "@/components/SetHeader";
import { ProgressBar, AccentKeys, Toggle, SpeakButton } from "@/components/ui";
import { TestQuestion } from "@/lib/types";

type Answers = Record<string, string | Record<string, string>>;

export default function TestPage() {
  const { set, ready } = useSet();
  const [cfg, setCfg] = useState<TestConfig>(DEFAULT_CONFIG);
  const [questions, setQuestions] = useState<TestQuestion[] | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [submitted, setSubmitted] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!questions || submitted) return;
    const t = setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => clearInterval(t);
  }, [questions, submitted, startedAt]);

  const graded = useMemo(() => {
    if (!questions || !submitted) return null;
    let score = 0;
    let total = 0;
    const detail = questions.map((q) => {
      if (q.kind === "match" && q.pairs) {
        const given = (answers[q.id] as Record<string, string>) ?? {};
        const rows = q.pairs.map((p) => ({
          left: p.left,
          want: p.right,
          got: given[p.left] ?? "",
          ok: (given[p.left] ?? "") === p.right,
        }));
        const okCount = rows.filter((r) => r.ok).length;
        score += okCount;
        total += q.pairs.length;
        return { q, rows, ok: okCount === q.pairs.length, yours: "", correct: "" };
      }
      total += 1;
      const given = String(answers[q.id] ?? "");
      let ok = false;
      if (q.kind === "write") ok = grade(given, q.answer, { allowTypos: true }).pass;
      else ok = given.trim().toLowerCase() === q.answer.trim().toLowerCase();
      if (ok) score += 1;
      return {
        q, rows: null as null | { left: string; want: string; got: string; ok: boolean }[],
        ok, yours: given, correct: q.kind === "tf" ? q.answer : q.answer,
      };
    });
    return { score, total, detail };
  }, [questions, submitted, answers]);

  // Write the results into card progress once, at grading time.
  useEffect(() => {
    if (!graded || !set) return;
    const next = structuredClone(set);
    graded.detail.forEach((d) => {
      if (!d.q.cardId) return;
      const dir = d.q.note?.includes("Spanish") ? "en-es" : "es-en";
      const k = keyOf(d.q.cardId, dir);
      next.progress[k] = applyAnswer(progressFor(set, d.q.cardId, dir), d.ok);
    });
    next.updatedAt = Date.now();
    upsertSet(next);
    recordTest({
      setId: set.id,
      setTitle: set.title,
      takenAt: Date.now(),
      score: graded.score,
      total: graded.total,
      durationMs: elapsed,
      missed: graded.detail.filter((d) => !d.ok).slice(0, 50).map((d) => ({
        prompt: d.q.prompt,
        yours: typeof d.yours === "string" ? d.yours : "",
        correct: d.q.kind === "match" ? (d.rows ?? []).map((r) => `${r.left} = ${r.want}`).join("; ") : d.correct,
      })),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graded]);

  if (!set) return ready ? <NotFound /> : null;

  function start() {
    if (!set) return;
    const qs = buildTest(set, cfg);
    setQuestions(qs);
    setAnswers({});
    setSubmitted(false);
    setStartedAt(Date.now());
    setElapsed(0);
    window.scrollTo({ top: 0 });
  }

  function retakeMissed() {
    if (!graded) return;
    const missedCards = new Set(graded.detail.filter((d) => !d.ok).map((d) => d.q.cardId).filter(Boolean) as string[]);
    if (!set || !missedCards.size) return start();
    const subset = { ...set, cards: set.cards.filter((c) => missedCards.has(c.id)) };
    setQuestions(buildTest(subset, { ...cfg, count: Math.max(4, missedCards.size * 2), focusWeak: false }));
    setAnswers({}); setSubmitted(false); setStartedAt(Date.now()); setElapsed(0);
    window.scrollTo({ top: 0 });
  }

  /* ---------------- setup screen ---------------- */
  if (!questions) {
    const maxQ = Math.min(60, Math.max(5, set.cards.length * 2));
    return (
      <div className="max-w-2xl mx-auto">
        <SetHeader set={set} mode="Practice test" />
        <div className="card-shell p-6 space-y-5">
          <div>
            <h1 className="text-xl font-bold">Build your test</h1>
            <p className="muted text-sm mt-1">
              Mixed question types, graded at the end, with a full answer key and a one-click retake
              of everything you missed.
            </p>
          </div>

          <div>
            <label className="text-sm font-semibold flex justify-between">
              <span>Questions</span><span className="muted">{cfg.count}</span>
            </label>
            <input type="range" min={5} max={maxQ} step={1} value={Math.min(cfg.count, maxQ)}
              className="w-full mt-2 accent-[var(--accent)]"
              onChange={(e) => setCfg({ ...cfg, count: Number(e.target.value) })} />
          </div>

          <div>
            <div className="text-sm font-semibold mb-2">Question types</div>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {([
                ["mc", "Multiple choice"],
                ["write", "Written answer"],
                ["tf", "True / false"],
                ["match", "Matching"],
              ] as const).map(([k, label]) => (
                <Toggle key={k} checked={cfg.kinds[k]} label={label}
                  onChange={(v) => setCfg({ ...cfg, kinds: { ...cfg.kinds, [k]: v } })} />
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold mb-2">Direction</div>
            <div className="flex gap-1.5">
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

  /* ---------------- results ---------------- */
  if (submitted && graded) {
    const pct = Math.round((graded.score / Math.max(1, graded.total)) * 100);
    const letter = pct >= 93 ? "A" : pct >= 90 ? "A−" : pct >= 87 ? "B+" : pct >= 83 ? "B" : pct >= 80 ? "B−" : pct >= 77 ? "C+" : pct >= 73 ? "C" : pct >= 70 ? "C−" : pct >= 60 ? "D" : "F";
    const tone = pct >= 80 ? "var(--good)" : pct >= 70 ? "var(--warn)" : "var(--bad)";
    return (
      <div className="max-w-3xl mx-auto">
        <SetHeader set={set} mode="Results" />
        <div className="card-shell p-8 text-center">
          <div className="text-5xl font-extrabold" style={{ color: tone }}>{pct}%</div>
          <div className="text-xl font-bold mt-1" style={{ color: tone }}>{letter}</div>
          <p className="muted mt-2">
            {graded.score} of {graded.total} correct in {Math.round(elapsed / 1000)}s
          </p>
          {graded.total !== questions.length && (
            <p className="text-xs muted mt-1">Each matching pair is graded separately.</p>
          )}
          <div className="flex flex-wrap gap-2 justify-center mt-5">
            {graded.score < graded.total && <button className="btn btn-primary" onClick={retakeMissed}>Retake just what I missed</button>}
            <button className="btn btn-outline" onClick={() => setQuestions(null)}>New test</button>
            <Link href={`/sets/${set.id}`} className="btn btn-ghost">Back to set</Link>
          </div>
        </div>

        <h2 className="text-lg font-bold mt-6 mb-3">Answer key</h2>
        <div className="space-y-2.5">
          {graded.detail.map((d, i) => (
            <div key={d.q.id} className="card-shell p-4"
              style={{ borderLeft: `3px solid ${d.ok ? "var(--good)" : "var(--bad)"}` }}>
              <div className="flex items-start gap-2">
                <span className="chip shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">
                    {d.q.kind === "tf" ? `${d.q.prompt} = ${d.q.shown}` : d.q.prompt}
                  </div>
                  {d.rows ? (
                    <div className="mt-2 space-y-1 text-sm">
                      {d.rows.map((r) => (
                        <div key={r.left} style={{ color: r.ok ? "var(--good)" : "var(--bad)" }}>
                          {r.left} → {r.got || "(blank)"} {!r.ok && <span className="muted">· correct: {r.want}</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm mt-1">
                      <span style={{ color: d.ok ? "var(--good)" : "var(--bad)" }}>
                        Your answer: {d.yours || "(blank)"}
                      </span>
                      {!d.ok && <span className="muted"> · correct: <strong>{d.correct}</strong></span>}
                    </div>
                  )}
                </div>
                <span className="shrink-0 font-bold" style={{ color: d.ok ? "var(--good)" : "var(--bad)" }}>{d.ok ? "✓" : "✗"}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ---------------- taking the test ---------------- */
  const answered = questions.filter((q) =>
    q.kind === "match"
      ? Object.keys((answers[q.id] as Record<string, string>) ?? {}).length === (q.pairs?.length ?? 0)
      : !!answers[q.id],
  ).length;

  return (
    <div className="max-w-3xl mx-auto">
      <SetHeader set={set} mode="Practice test" />

      <div className="sticky top-14 z-30 -mx-4 px-4 py-2.5 mb-4 backdrop-blur-xl"
        style={{ background: "color-mix(in srgb, var(--bg) 88%, transparent)", borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3 text-sm">
          <span className="muted tabular-nums">{answered} / {questions.length}</span>
          <div className="flex-1"><ProgressBar value={(answered / questions.length) * 100} /></div>
          <span className="muted tabular-nums">{Math.floor(elapsed / 60000)}:{String(Math.floor(elapsed / 1000) % 60).padStart(2, "0")}</span>
        </div>
      </div>

      <div className="space-y-3">
        {questions.map((q, i) => (
          <QuestionCard key={q.id} q={q} n={i + 1}
            value={answers[q.id]}
            onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} />
        ))}
      </div>

      <div className="card-shell p-5 mt-5 flex flex-wrap items-center gap-3">
        <div className="text-sm muted">
          {answered < questions.length
            ? `${questions.length - answered} question${questions.length - answered === 1 ? "" : "s"} still blank.`
            : "Everything answered."}
        </div>
        <button className="btn btn-primary ml-auto"
          onClick={() => {
            if (answered < questions.length && !confirm("Submit with blank answers?")) return;
            setSubmitted(true);
            window.scrollTo({ top: 0 });
          }}>
          Submit and grade
        </button>
      </div>
    </div>
  );
}

function QuestionCard({ q, n, value, onChange }: {
  q: TestQuestion; n: number;
  value: string | Record<string, string> | undefined;
  onChange: (v: string | Record<string, string>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  if (q.kind === "match" && q.pairs) {
    const given = (value as Record<string, string>) ?? {};
    const options = q.pairs.map((p) => p.right);
    return (
      <div className="card-shell p-4">
        <div className="flex items-start gap-2">
          <span className="chip shrink-0">{n}</span>
          <div className="flex-1">
            <div className="font-medium">{q.prompt}</div>
            <div className="space-y-2 mt-3">
              {q.pairs.map((p) => (
                <div key={p.left} className="flex flex-wrap items-center gap-2">
                  <span className="font-medium min-w-36">{p.left}</span>
                  <select className="input !w-auto !py-1.5 text-sm flex-1 min-w-48"
                    value={given[p.left] ?? ""}
                    onChange={(e) => onChange({ ...given, [p.left]: e.target.value })}>
                    <option value="">— choose —</option>
                    {options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card-shell p-4">
      <div className="flex items-start gap-2">
        <span className="chip shrink-0">{n}</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs muted">{q.note}</div>
          <div className="font-medium text-lg mt-0.5 flex items-center gap-2 flex-wrap">
            {q.kind === "tf" ? (
              <span><strong>{q.prompt}</strong> <span className="muted">means</span> <strong>{q.shown}</strong></span>
            ) : q.prompt}
            {q.note?.includes("English meaning") && <SpeakButton text={q.prompt} />}
          </div>

          {q.kind === "mc" && (
            <div className="grid sm:grid-cols-2 gap-2 mt-3">
              {q.choices?.map((c) => (
                <button key={c} onClick={() => onChange(c)}
                  className="btn btn-outline !justify-start text-left !py-2.5 text-sm"
                  style={value === c ? { borderColor: "var(--accent)", background: "color-mix(in srgb, var(--accent) 15%, transparent)" } : undefined}>
                  {c}
                </button>
              ))}
            </div>
          )}

          {q.kind === "tf" && (
            <div className="flex gap-2 mt-3">
              {["true", "false"].map((v) => (
                <button key={v} onClick={() => onChange(v)}
                  className="btn btn-outline !px-6 capitalize"
                  style={value === v ? { borderColor: "var(--accent)", background: "color-mix(in srgb, var(--accent) 15%, transparent)" } : undefined}>
                  {v}
                </button>
              ))}
            </div>
          )}

          {q.kind === "write" && (
            <div className="mt-3 space-y-2">
              <input ref={inputRef} className="input" placeholder="Your answer…"
                value={(value as string) ?? ""} autoComplete="off" spellCheck={false}
                onChange={(e) => onChange(e.target.value)} />
              {q.note?.includes("Spanish term") && (
                <AccentKeys onInsert={(ch) => { onChange(((value as string) ?? "") + ch); inputRef.current?.focus(); }} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
