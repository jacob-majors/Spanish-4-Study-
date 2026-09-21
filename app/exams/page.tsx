"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { allExams, syncCurriculum, countdownLabel, formatExamDate, daysUntil } from "@/lib/curriculum";
import { ExamPlan } from "@/lib/curriculumTypes";

const EXAMPLE = `Unit 5 exam, Thursday October 9.
Covers the health + body vocab, preterite vs
imperfect, and the present subjunctive.
Format: 20 matching, 15 fill-in conjugation,
10 multiple choice.

[attach the review packet]`;

export default function ExamsPage() {
  const [ready, setReady] = useState(false);
  useEffect(() => { syncCurriculum(); setReady(true); }, []);

  const exams = ready ? allExams() : [];
  const upcoming = exams.filter((e) => daysUntil(e.date) >= 0);
  const past = exams.filter((e) => daysUntil(e.date) < 0).reverse();

  return (
    <div>
      <p className="label">Exámenes</p>
      <h1 className="display" style={{ fontSize: "var(--text-2xl)", marginTop: "var(--space-xs)" }}>
        Calendario
      </h1>
      <p className="muted measure" style={{ marginTop: "var(--space-sm)" }}>
        Every test prepared from a packet, with a countdown, a topic checklist, and a mock exam built
        to match the real format.
      </p>

      {!ready ? (
        <p className="muted" style={{ marginTop: "var(--space-xl)" }}>Loading…</p>
      ) : !exams.length ? (
        <section style={{ marginTop: "var(--space-2xl)", borderTop: "var(--rule-thick) solid var(--color-ink)", paddingTop: "var(--space-md)" }}>
          <h2 className="display" style={{ fontSize: "var(--text-xl)" }}>Nothing on the calendar</h2>
          <p className="muted measure" style={{ marginTop: "var(--space-xs)" }}>
            Hand Claude the details and the review packet in chat. The vocabulary and the exam plan
            get written into <span className="data">data/curriculum.ts</span>; push, and the test
            shows up here with study material already built.
          </p>
          <p className="label" style={{ marginTop: "var(--space-lg)" }}>What to send</p>
          <pre
            className="data measure"
            style={{
              marginTop: "var(--space-xs)",
              whiteSpace: "pre-wrap",
              fontSize: "var(--text-xs)",
              lineHeight: 1.8,
              color: "var(--color-ink-2)",
              borderLeft: "var(--rule-thick) solid var(--color-rule-2)",
              paddingLeft: "var(--space-md)",
            }}
          >
            {EXAMPLE}
          </pre>
          <p className="muted measure" style={{ fontSize: "var(--text-sm)", marginTop: "var(--space-md)" }}>
            A photo of the study guide, a PDF, a Quizlet export or just a list of topics all work.
            Anything missing gets a sensible default.
          </p>
        </section>
      ) : (
        <>
          {upcoming.length > 0 && (
            <ExamList title="Próximos" exams={upcoming} />
          )}
          {past.length > 0 && (
            <div style={{ opacity: 0.6 }}>
              <ExamList title="Pasados" exams={past} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ExamList({ title, exams }: { title: string; exams: ExamPlan[] }) {
  return (
    <section style={{ marginTop: "var(--space-2xl)" }}>
      <h2 className="display" style={{ fontSize: "var(--text-xl)", borderBottom: "var(--rule-thick) solid var(--color-ink)", paddingBottom: "var(--space-xs)" }}>
        {title}
      </h2>
      {exams.map((e, i) => {
        const d = daysUntil(e.date);
        return (
          <Link key={e.id} href={`/exams/${e.id}`} className="row" style={{ textDecoration: "none", color: "inherit", alignItems: "flex-start" }}>
            <span className="data shrink-0" style={{ color: "var(--color-muted)", fontSize: "var(--text-xs)", width: "2ch", paddingTop: "var(--space-2xs)" }}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="flex-1 min-w-0">
              <span className="display block" style={{ fontSize: "var(--text-lg)" }}>{e.title}</span>
              <span className="tag block" style={{ marginTop: "var(--space-3xs)" }}>
                {formatExamDate(e.date)}{e.format ? ` · ${e.format}` : ""}
              </span>
              {e.topics.length > 0 && (
                <span className="muted block" style={{ fontSize: "var(--text-sm)", marginTop: "var(--space-2xs)" }}>
                  {e.topics.slice(0, 4).join(" · ")}
                  {e.topics.length > 4 && ` · +${e.topics.length - 4}`}
                </span>
              )}
            </span>
            <span
              className="data shrink-0 text-right"
              style={{ fontSize: "var(--text-sm)", paddingTop: "var(--space-2xs)", color: d < 0 ? "var(--color-muted)" : d <= 2 ? "var(--color-accent)" : "var(--color-ink-2)" }}
            >
              {countdownLabel(e.date)}
            </span>
          </Link>
        );
      })}
    </section>
  );
}
