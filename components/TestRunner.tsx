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

const n2 = (i: number) => String(i + 1).padStart(2, "0");

export default function TestRunner({
  questions, onGraded, onNewTest, newTestLabel = "New test", backHref, backLabel = "Back",
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
      else if (q.kind === "write" || q.kind === "cloze")
        // Typed answers are graded leniently: a leading article is optional
        // ("esquina" for "la esquina") and a one-character slip still counts.
        ok = grade(given, q.answer, { allowTypos: true }).pass;
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

  /* ------------------------- results ------------------------- */
  if (submitted && graded) {
    const pct = Math.round((graded.score / Math.max(1, graded.total)) * 100);
    const tone = pct >= 80 ? "var(--color-good)" : pct >= 70 ? "var(--color-ink)" : "var(--color-accent)";
    const missedQs = graded.detail.filter((d) => !d.ok).map((d) => d.q);
    return (
      <div>
        {/* The grade, set the way a paper comes back: a figure and a letter. */}
        <div style={{ borderTop: "var(--rule-thick) solid var(--color-ink)", paddingTop: "var(--space-md)" }}>
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
            <span className="data tnum" style={{ fontSize: "var(--text-display)", lineHeight: 1, color: tone }}>{pct}</span>
            <span className="display" style={{ fontSize: "var(--text-2xl)", color: tone }}>{letterFor(pct)}</span>
            <span className="tag" style={{ marginLeft: "auto" }}>
              {graded.score}/{graded.total} correct · {Math.round(elapsed / 1000)}s
            </span>
          </div>
          {graded.total !== items.length && (
            <p className="tag" style={{ marginTop: "var(--space-xs)" }}>Each matching pair is graded separately.</p>
          )}
          <div className="flex flex-wrap gap-3 items-center" style={{ marginTop: "var(--space-lg)" }}>
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
            {backHref && <Link href={backHref} className="link label">{backLabel} →</Link>}
          </div>
        </div>

        <h2 className="display" style={{ fontSize: "var(--text-xl)", marginTop: "var(--space-2xl)", borderBottom: "var(--rule-thick) solid var(--color-ink)", paddingBottom: "var(--space-xs)" }}>
          Clave de respuestas
        </h2>
        <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {graded.detail.map((d, i) => (
            <li key={d.q.id} className="flex gap-4" style={{ borderTop: "var(--rule-hair) solid var(--color-rule)", paddingBlock: "var(--space-sm)" }}>
              <span className="data shrink-0" style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", paddingTop: 4, width: "2ch" }}>{n2(i)}</span>
              <div className="flex-1 min-w-0">
                <div style={{ fontWeight: 500 }}>
                  {d.q.kind === "tf"
                    ? <>{d.q.prompt} <span className="muted">=</span> {d.q.shown}</>
                    : d.q.kind === "conj"
                      ? <><span className="display" style={{ fontSize: "var(--text-lg)" }}>{d.q.prompt}</span> <span className="tag">{d.q.subPrompt}</span></>
                      : d.q.kind === "cloze"
                        ? <>{(d.q.sentence ?? "").split("___")[0]}<span className="data" style={{ color: d.ok ? "var(--color-good)" : "var(--color-accent)" }}>{d.yours || "______"}</span>{(d.q.sentence ?? "").split("___")[1]}</>
                        : d.q.prompt}
                </div>
                {d.rows ? (
                  <table className="sheet" style={{ marginTop: "var(--space-2xs)" }}>
                    <tbody>
                      {d.rows.map((r) => (
                        <tr key={r.left}>
                          <td style={{ fontSize: "var(--text-sm)" }}>{r.left}</td>
                          <td style={{ fontSize: "var(--text-sm)", color: r.ok ? "var(--color-good)" : "var(--color-accent)" }}>
                            {r.got || "—"}
                          </td>
                          <td className="tag" style={{ textAlign: "right" }}>{r.ok ? "" : r.want}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ fontSize: "var(--text-sm)", marginTop: 2 }}>
                    <span style={{ color: d.ok ? "var(--color-good)" : "var(--color-accent)" }}>{d.yours || "—"}</span>
                    {!d.ok && <span className="muted"> · correct: <span className="data" style={{ color: "var(--color-ink)" }}>{d.correct}</span></span>}
                  </div>
                )}
              </div>
              <span className="shrink-0 data" aria-label={d.ok ? "Correct" : "Incorrect"}
                style={{ color: d.ok ? "var(--color-good)" : "var(--color-accent)", paddingTop: 2 }}>
                {d.ok ? "✓" : "✗"}
              </span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  /* ------------------------- taking ------------------------- */
  const answered = items.filter((q) =>
    q.kind === "match"
      ? Object.keys((answers[q.id] as Record<string, string>) ?? {}).length === (q.pairs?.length ?? 0)
      : !!answers[q.id],
  ).length;

  return (
    <div>
      <div
        className="sticky z-10"
        style={{
          top: 0,
          background: "var(--color-paper)",
          borderBottom: "var(--rule-hair) solid var(--color-rule-2)",
          paddingBlock: "var(--space-xs)",
          marginBottom: "var(--space-lg)",
        }}
      >
        <div className="flex items-center gap-4">
          <span className="data tnum tag">{answered}/{items.length}</span>
          <span className="flex-1"><ProgressBar value={(answered / Math.max(1, items.length)) * 100} /></span>
          <span className="data tnum tag">
            {Math.floor(elapsed / 60000)}:{String(Math.floor(elapsed / 1000) % 60).padStart(2, "0")}
          </span>
        </div>
      </div>

      <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {items.map((q, i) => (
          <QuestionRow key={q.id} q={q} n={i} value={answers[q.id]}
            onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} />
        ))}
      </ol>

      <div
        className="flex flex-wrap items-center gap-4"
        style={{ borderTop: "var(--rule-thick) solid var(--color-ink)", paddingTop: "var(--space-md)", marginTop: "var(--space-md)" }}
      >
        <span className="muted" style={{ fontSize: "var(--text-sm)" }}>
          {answered < items.length
            ? `${items.length - answered} question${items.length - answered === 1 ? "" : "s"} still blank.`
            : "Everything answered."}
        </span>
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

function QuestionRow({ q, n, value, onChange }: {
  q: TestQuestion; n: number;
  value: string | Record<string, string> | undefined;
  onChange: (v: string | Record<string, string>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const num = <span className="data shrink-0" style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", paddingTop: 6, width: "2ch" }}>{n2(n)}</span>;

  if (q.kind === "match" && q.pairs) {
    const given = (value as Record<string, string>) ?? {};
    const options = q.pairs.map((p) => p.right);
    return (
      <li className="flex gap-4" style={{ borderTop: "var(--rule-hair) solid var(--color-rule)", paddingBlock: "var(--space-md)" }}>
        {num}
        <div className="flex-1 min-w-0">
          <p className="label">Empareja</p>
          <table className="sheet" style={{ marginTop: "var(--space-xs)" }}>
            <tbody>
              {q.pairs.map((p) => (
                <tr key={p.left}>
                  <td style={{ fontWeight: 500, width: "45%" }}>{p.left}</td>
                  <td>
                    <select className="field-box" aria-label={`Meaning of ${p.left}`}
                      value={given[p.left] ?? ""}
                      onChange={(e) => onChange({ ...given, [p.left]: e.target.value })}>
                      <option value="">—</option>
                      {options.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </li>
    );
  }

  if (q.kind === "cloze") {
    const [before, after] = (q.sentence ?? "___").split("___");
    const typed = String(value ?? "");
    return (
      <li className="flex gap-4" style={{ borderTop: "var(--rule-hair) solid var(--color-rule)", paddingBlock: "var(--space-md)" }}>
        {num}
        <div className="flex-1 min-w-0">
          <p className="label">Completa la frase — {q.prompt}</p>
          {/* The blank sits inside the sentence, the way it does on the paper. */}
          <p style={{ fontSize: "var(--text-lg)", lineHeight: 2.2, marginTop: "var(--space-2xs)" }}>
            {before}
            <input
              ref={inputRef}
              className="data"
              aria-label={`Fill in the blank: ${q.prompt}`}
              value={typed}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              onChange={(e) => onChange(e.target.value)}
              style={{
                width: `${Math.max(10, typed.length + 3)}ch`,
                maxWidth: "100%",
                background: "transparent",
                border: 0,
                borderBottom: "var(--rule-thick) solid var(--color-rule-2)",
                borderRadius: 0,
                padding: "0 var(--space-3xs)",
                color: "var(--color-accent)",
                fontSize: "var(--text-md)",
                outline: "none",
                textAlign: "center",
              }}
            />
            {after}
          </p>
          <div style={{ marginTop: "var(--space-xs)" }}>
            <AccentKeys onInsert={(ch) => { onChange(typed + ch); inputRef.current?.focus(); }} />
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="flex gap-4" style={{ borderTop: "var(--rule-hair) solid var(--color-rule)", paddingBlock: "var(--space-md)" }}>
      {num}
      <div className="flex-1 min-w-0">
        <p className="label">{q.kind === "conj" ? q.subPrompt : q.note}</p>
        <div className="flex items-baseline gap-2 flex-wrap" style={{ marginTop: 2 }}>
          {q.kind === "tf" ? (
            <span style={{ fontSize: "var(--text-lg)" }}>
              <strong style={{ fontWeight: 500 }}>{q.prompt}</strong> <span className="muted">means</span>{" "}
              <strong style={{ fontWeight: 500 }}>{q.shown}</strong>
            </span>
          ) : (
            <span className="display" style={{ fontSize: "var(--text-xl)" }}>{q.prompt}</span>
          )}
          {q.kind === "conj" && q.note && <span className="muted" style={{ fontSize: "var(--text-sm)" }}>({q.note})</span>}
          {q.note?.includes("English meaning") && <SpeakButton text={q.prompt} />}
        </div>

        {q.kind === "mc" && (
          <div className="grid gap-x-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 14rem), 1fr))", marginTop: "var(--space-xs)" }}>
            {q.choices?.map((c, ci) => {
              const on = value === c;
              return (
                <button key={c} onClick={() => onChange(c)} aria-pressed={on}
                  className="flex items-baseline gap-3 text-left"
                  style={{ paddingBlock: "var(--space-2xs)", minHeight: 40, color: on ? "var(--color-ink)" : "var(--color-ink-2)" }}>
                  <span className="data shrink-0" style={{
                    fontSize: "var(--text-xs)", width: "1.6em", textAlign: "center",
                    border: `var(--rule-hair) solid ${on ? "var(--color-ink)" : "var(--color-rule-2)"}`,
                    background: on ? "var(--color-ink)" : "transparent",
                    color: on ? "var(--color-paper)" : "var(--color-muted)",
                  }}>
                    {"abcd"[ci] ?? "·"}
                  </span>
                  <span style={{ fontSize: "var(--text-sm)" }}>{c}</span>
                </button>
              );
            })}
          </div>
        )}

        {q.kind === "tf" && (
          <div className="flex gap-6" style={{ marginTop: "var(--space-xs)" }}>
            {["true", "false"].map((v) => {
              const on = value === v;
              return (
                <button key={v} onClick={() => onChange(v)} aria-pressed={on}
                  className="flex items-baseline gap-2 capitalize"
                  style={{ minHeight: 40, color: on ? "var(--color-ink)" : "var(--color-ink-2)", fontSize: "var(--text-sm)" }}>
                  <span className="data shrink-0" aria-hidden="true" style={{
                    width: 14, height: 14, transform: "translateY(2px)",
                    border: `var(--rule-hair) solid ${on ? "var(--color-ink)" : "var(--color-rule-2)"}`,
                    background: on ? "var(--color-ink)" : "transparent",
                  }} />
                  {v}
                </button>
              );
            })}
          </div>
        )}

        {(q.kind === "write" || q.kind === "conj") && (
          <div style={{ marginTop: "var(--space-xs)", maxWidth: "26rem" }}>
            <input ref={inputRef} className={`field ${q.kind === "conj" ? "data" : ""}`}
              placeholder={q.kind === "conj" ? "conjugate…" : "answer…"}
              value={(value as string) ?? ""} autoComplete="off" spellCheck={false}
              aria-label={q.kind === "conj" ? `Conjugate ${q.prompt}` : q.note}
              onChange={(e) => onChange(e.target.value)} />
            {(q.kind === "conj" || q.note?.includes("Spanish term")) && (
              <div style={{ marginTop: "var(--space-xs)" }}>
                <AccentKeys onInsert={(ch) => { onChange(((value as string) ?? "") + ch); inputRef.current?.focus(); }} />
              </div>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
