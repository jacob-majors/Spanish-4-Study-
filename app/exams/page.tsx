"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { allExams, syncCurriculum, countdownLabel, formatExamDate, daysUntil } from "@/lib/curriculum";
import { ExamPlan } from "@/lib/curriculumTypes";

const EXAMPLE = `Hey Claude — here's my next test.

  Unit 5 exam, Thursday October 9.
  It covers the final-exam vocab packet (health + body),
  preterite vs imperfect, and the present subjunctive.
  Format: 20 matching, 15 fill-in conjugation, 10 multiple choice.

[attach the review packet / study guide]`;

export default function ExamsPage() {
  const [ready, setReady] = useState(false);
  useEffect(() => { syncCurriculum(); setReady(true); }, []);

  const exams = ready ? allExams() : [];
  const upcoming = exams.filter((e) => daysUntil(e.date) >= 0);
  const past = exams.filter((e) => daysUntil(e.date) < 0).reverse();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tests</h1>
        <p className="muted text-sm mt-1">
          Every test Claude has prepped from a packet, with a countdown, a topic checklist and a
          mock exam built to match the real format.
        </p>
      </div>

      {!ready ? (
        <div className="card-shell p-8 text-center muted text-sm">Loading…</div>
      ) : !exams.length ? (
        <div className="card-shell p-6">
          <h2 className="font-bold text-lg">No tests loaded yet</h2>
          <p className="muted text-sm mt-1.5 max-w-2xl">
            Hand Claude the details and the review packet in chat. Claude writes the vocabulary and
            the exam plan into <code>data/curriculum.ts</code>, you push, and the test shows up here
            with study material already built.
          </p>
          <div className="mt-4">
            <div className="text-xs muted uppercase tracking-wide mb-1.5">What to send</div>
            <pre className="rounded-xl p-4 text-xs overflow-auto whitespace-pre-wrap"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>{EXAMPLE}</pre>
          </div>
          <p className="muted text-xs mt-3">
            A photo of the study guide, a PDF, a Quizlet export or just a list of topics all work.
            Anything missing gets a sensible default.
          </p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-lg font-bold mb-3">Coming up</h2>
              <div className="space-y-2.5">
                {upcoming.map((e) => <ExamCard key={e.id} exam={e} />)}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="text-lg font-bold mb-3">Past</h2>
              <div className="space-y-2.5 opacity-70">
                {past.map((e) => <ExamCard key={e.id} exam={e} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function ExamCard({ exam }: { exam: ExamPlan }) {
  const d = daysUntil(exam.date);
  const tone = d < 0 ? "var(--muted)" : d <= 2 ? "var(--warn)" : "var(--accent)";
  return (
    <Link href={`/exams/${exam.id}`} className="card-shell p-5 flex flex-wrap items-center gap-4 hover:-translate-y-0.5 transition-transform">
      <div className="flex-1 min-w-48">
        <div className="font-semibold text-lg">{exam.title}</div>
        <div className="text-sm muted mt-0.5">{formatExamDate(exam.date)}{exam.format ? ` · ${exam.format}` : ""}</div>
        {exam.topics.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {exam.topics.slice(0, 5).map((t) => <span key={t} className="chip">{t}</span>)}
            {exam.topics.length > 5 && <span className="chip">+{exam.topics.length - 5}</span>}
          </div>
        )}
      </div>
      <div className="text-xl font-extrabold text-right" style={{ color: tone }}>{countdownLabel(exam.date)}</div>
    </Link>
  );
}
