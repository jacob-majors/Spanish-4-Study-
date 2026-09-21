"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useAppData } from "@/lib/useData";
import { examById, syncCurriculum } from "@/lib/curriculum";
import { buildMockExam } from "@/lib/mockexam";
import { recordTest, upsertSet } from "@/lib/storage";
import { progressFor, applyAnswer, keyOf } from "@/lib/srs";
import TestRunner, { GradedResult } from "@/components/TestRunner";

export default function MockExamPage() {
  const params = useParams();
  const id = String(params?.id ?? "");
  const data = useAppData();
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => { syncCurriculum(); setReady(true); }, []);

  const exam = ready ? examById(id) : undefined;
  const sets = data.sets.filter((s) => exam?.setIds.includes(s.sourceId ?? s.id));

  const questions = useMemo(
    () => (exam ? buildMockExam(exam, sets) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exam?.id, sets.map((s) => s.id).join(","), attempt],
  );

  if (!ready) return <p className="muted">Building your mock exam…</p>;
  if (!exam) {
    return (
      <div style={{ borderTop: "var(--rule-thick) solid var(--color-ink)", paddingTop: "var(--space-md)" }}>
        <h1 className="display" style={{ fontSize: "var(--text-xl)" }}>That test is not here</h1>
        <Link href="/exams" className="btn btn-primary" style={{ marginTop: "var(--space-md)" }}>Back to tests</Link>
      </div>
    );
  }

  function onGraded(r: GradedResult) {
    if (!exam) return;
    // Vocabulary questions feed back into spaced repetition; conjugation items
    // are not tied to a card, so they only affect the recorded score.
    for (const s of sets) {
      const next = structuredClone(s);
      let touched = false;
      for (const d of r.detail) {
        if (!d.q.cardId || !s.cards.some((c) => c.id === d.q.cardId)) continue;
        const dir = d.q.note?.includes("Spanish") ? "en-es" : "es-en";
        next.progress[keyOf(d.q.cardId, dir)] = applyAnswer(progressFor(s, d.q.cardId, dir), d.ok);
        touched = true;
      }
      if (touched) { next.updatedAt = Date.now(); upsertSet(next); }
    }
    recordTest({
      setId: exam.id,
      examId: exam.id,
      setTitle: `${exam.title} (mock)`,
      takenAt: Date.now(),
      score: r.score,
      total: r.total,
      durationMs: r.durationMs,
      missed: r.detail.filter((d) => !d.ok).slice(0, 60).map((d) => ({
        prompt: d.q.kind === "conj" ? `${d.q.prompt} · ${d.q.subPrompt}` : d.q.prompt,
        yours: d.yours,
        correct: d.q.kind === "match" ? (d.rows ?? []).map((x) => `${x.left} = ${x.want}`).join("; ") : d.correct,
      })),
    });
  }

  if (!questions.length) {
    return (
      <div style={{ maxWidth: "46rem" }}>
        <Link href={`/exams/${exam.id}`} className="label" style={{ textDecoration: "none" }}>← {exam.title}</Link>
        <div style={{ marginTop: "var(--space-md)", borderTop: "var(--rule-thick) solid var(--color-ink)", paddingTop: "var(--space-md)" }}>
          <h1 className="display" style={{ fontSize: "var(--text-xl)" }}>Nothing to build a mock exam from</h1>
          <p className="muted measure" style={{ marginTop: "var(--space-xs)" }}>
            This test has no vocabulary sets and no tenses attached to it yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "46rem" }}>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1"
        style={{ borderBottom: "var(--rule-hair) solid var(--color-rule)", paddingBottom: "var(--space-xs)", marginBottom: "var(--space-lg)" }}>
        <Link href={`/exams/${exam.id}`} className="label" style={{ textDecoration: "none" }}>← {exam.title}</Link>
        <span className="label ml-auto" style={{ color: "var(--color-accent)" }}>Examen simulado</span>
        <span className="tag">{questions.length} preguntas</span>
      </div>
      <TestRunner
        questions={questions}
        onGraded={onGraded}
        onNewTest={() => setAttempt((a) => a + 1)}
        newTestLabel="Fresh mock exam"
        backHref={`/exams/${exam.id}`}
        backLabel="Back to the test page"
      />
    </div>
  );
}
