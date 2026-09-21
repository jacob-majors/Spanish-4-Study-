"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { TestQuestion } from "@/lib/types";
import { grade, gradeConjugation } from "@/lib/grade";
import { shuffle } from "@/lib/srs";
import { ProgressBar, AccentKeys, SpeakButton } from "@/components/ui";

export interface GradedDetail {
  q: TestQuestion;
  ok: boolean;
  yours: string;
  correct: string;
  rows: { left: string; want: string; got: string; ok: boolean }[] | null;
}

export interface GradedResult {
  score: number;
  total: number;
  durationMs: number;
  detail: GradedDetail[];
}

type Answers = Record<string, string | Record<string, string>>;

export function letterFor(pct: number) {
  return pct >= 93 ? "A" : pct >= 90 ? "A−" : pct >= 87 ? "B+" : pct >= 83 ? "B"
    : pct >= 80 ? "B−" : pct >= 77 ? "C+" : pct >= 73 ? "C" : pct >= 70 ? "C−"
    : pct >= 60 ? "D" : "F";
}

export default function TestRunner({
  questions,
  onGraded,
  onNewTest,
  newTestLabel = "New test",
  backHref,
  backLabel = "Back",
}: {
  questions: TestQuestion[];
  onGraded?: (r: GradedResult) => void;
  onNewTest?: () => void;
  newTestLabel?: string;
  backHref?: string;
  backLabel?: string;
}) {
  const [items, setItems] = useState(questions);
  const [answers, setAnswers] = useState<Answers>({});
  const [submitted, setSubmitted] = useState(false);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const reported = useRef<GradedResult | null>(null);

  useEffect(() => {
    setItems(questions);
    setAnswers({});
    setSubmitted(false);
    setStartedAt(Date.now());
    setElapsed(0);
    reported.current = null;
  }, [questions]);

  useEffect(() => {
    if (submitted) return;
    const t = setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => clearInterval(t);
  }, [submitted, startedAt]);

  const graded: GradedResult | null = useMemo(() => {
    if (!submitted) return null;
    let score = 0;
    let total = 0;
    const detail: GradedDetail[] = items.map((q) => {
      if (q.kind === "match" && q.pairs) {
        const given = (answers[q.id] as Record<string, string>) ?? {};
        const rows = q.pairs.map((p) => ({
          left: p.left, want: p.right, got: given[p.left] ?? "",
          ok: (given[p.left] ?? "") === p.right,
        }));
        const okCount = rows.filter((r) => r.ok).length;
        score += okCount;
        total += q.pairs.length;
        return { q, rows, ok: okCount === q.pairs.length, yours: "", correct: "" };
      }
      total += 1;
      const given = String(answers[q.id] ?? "");
      let ok: boolean;
      if (q.kind === "conj") ok = gradeConjugation(given, q.answer).pass;
      else if (q.kind === "write") ok = grade(given, q.answer, { allowTypos: true }).pass;
      else ok = given.trim().toLowerCase() === q.answer.trim().toLowerCase();
      if (ok) score += 1;
      return { q, rows: null, ok, yours: given, correct: q.answer };
    });
    return { score, total, durationMs: elapsed, detail };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted, items, answers]);

  useEffect(() => {
    if (!graded || reported.current === graded) return;
    reported.current = graded;
    onGraded?.(graded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graded]);

  /* ---------------- results ---------------- */
  if (submitted && graded) {
    const pct = Math.round((graded.score / Math.max(1, graded.total)) * 100);
    const tone = pct >= 80 ? "var(--good)" : pct >= 70 ? "var(--warn)" : "var(--bad)";
    const missedQs = graded.detail.filter((d) => !d.ok).map((d) => d.q);
    return (
      <div>
        <div className="card-shell p-8 text-center">
          <div className="text-5xl font-extrabold" style={{ color: tone }}>{pct}%</div>
          <div className="text-xl font-bold mt-1" style={{ color: tone }}>{letterFor(pct)}</div>
          <p className="muted mt-2">
            {graded.score} of {graded.total} correct in {Math.round(elapsed / 1000)}s
          </p>
          {graded.total !== items.length && (
            <p className="text-xs muted mt-1">Each matching pair is graded separately.</p>
          )}
          <div className="flex flex-wrap gap-2 justify-center mt-5">
            {missedQs.length > 0 && (
              <button className="btn btn-primary" onClick={() => {
                setItems(shuffle(missedQs));
                setAnswers({}); setSubmitted(false); setStartedAt(Date.now()); setElapsed(0);
                reported.current = null;
                window.scrollTo({ top: 0 });
              }}>
                Redo the {missedQs.length} I missed
              </button>
            )}
            {onNewTest && <button className="btn btn-outline" onClick={onNewTest}>{newTestLabel}</button>}
            {backHref && <Link href={backHref} className="btn btn-ghost">{backLabel}</Link>}
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
                    {d.q.kind === "tf"
                      ? `${d.q.prompt} = ${d.q.shown}`
                      : d.q.kind === "conj"
                        ? `${d.q.prompt} — ${d.q.subPrompt}`
                        : d.q.prompt}
                  </div>
                  {d.rows ? (
                    <div className="mt-2 space-y-1 text-sm">
                      {d.rows.map((r) => (
                        <div key={r.left} style={{ color: r.ok ? "var(--good)" : "var(--bad)" }}>
                          {r.left} → {r.got || "(blank)"}
                          {!r.ok && <span className="muted"> · correct: {r.want}</span>}
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
                <span className="shrink-0 font-bold" style={{ color: d.ok ? "var(--good)" : "var(--bad)" }}>
                  {d.ok ? "✓" : "✗"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ---------------- taking ---------------- */
  const answered = items.filter((q) =>
    q.kind === "match"
      ? Object.keys((answers[q.id] as Record<string, string>) ?? {}).length === (q.pairs?.length ?? 0)
      : !!answers[q.id],
  ).length;

  return (
    <div>
      <div className="sticky top-14 z-30 -mx-4 px-4 py-2.5 mb-4 backdrop-blur-xl"
        style={{ background: "color-mix(in srgb, var(--bg) 88%, transparent)", borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3 text-sm">
          <span className="muted tabular-nums">{answered} / {items.length}</span>
          <div className="flex-1"><ProgressBar value={(answered / Math.max(1, items.length)) * 100} /></div>
          <span className="muted tabular-nums">
            {Math.floor(elapsed / 60000)}:{String(Math.floor(elapsed / 1000) % 60).padStart(2, "0")}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((q, i) => (
          <QuestionCard key={q.id} q={q} n={i + 1} value={answers[q.id]}
            onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} />
        ))}
      </div>

      <div className="card-shell p-5 mt-5 flex flex-wrap items-center gap-3">
        <div className="text-sm muted">
          {answered < items.length
            ? `${items.length - answered} question${items.length - answered === 1 ? "" : "s"} still blank.`
            : "Everything answered."}
        </div>
        <button className="btn btn-primary ml-auto" onClick={() => {
          if (answered < items.length && !confirm("Submit with blank answers?")) return;
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
          <div className="text-xs muted">{q.kind === "conj" ? q.subPrompt : q.note}</div>
          <div className="font-medium text-lg mt-0.5 flex items-center gap-2 flex-wrap">
            {q.kind === "tf" ? (
              <span><strong>{q.prompt}</strong> <span className="muted">means</span> <strong>{q.shown}</strong></span>
            ) : q.prompt}
            {q.kind === "conj" && q.note && <span className="text-sm muted font-normal">({q.note})</span>}
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

          {(q.kind === "write" || q.kind === "conj") && (
            <div className="mt-3 space-y-2">
              <input ref={inputRef} className="input" placeholder={q.kind === "conj" ? "Conjugate it…" : "Your answer…"}
                value={(value as string) ?? ""} autoComplete="off" spellCheck={false}
                onChange={(e) => onChange(e.target.value)} />
              {(q.kind === "conj" || q.note?.includes("Spanish term")) && (
                <AccentKeys onInsert={(ch) => { onChange(((value as string) ?? "") + ch); inputRef.current?.focus(); }} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
