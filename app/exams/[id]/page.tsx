"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAppData } from "@/lib/useData";
import { examById, syncCurriculum, countdownLabel, formatExamDate, daysUntil } from "@/lib/curriculum";
import { TENSE_BY_KEY } from "@/lib/conjugation/types";
import { statsFor } from "@/lib/srs";
import { useLocalState, ProgressBar } from "@/components/ui";

export default function ExamPage() {
  const params = useParams();
  const id = String(params?.id ?? "");
  const data = useAppData();
  const [ready, setReady] = useState(false);
  const [checked, setChecked] = useLocalState<string[]>(`sa.exam.${id}.topics`, []);

  useEffect(() => { syncCurriculum(); setReady(true); }, []);

  const exam = ready ? examById(id) : undefined;

  if (!ready) return <p className="muted">Loading…</p>;
  if (!exam) {
    return (
      <div style={{ borderTop: "var(--rule-thick) solid var(--color-ink)", paddingTop: "var(--space-md)" }}>
        <h1 className="display" style={{ fontSize: "var(--text-xl)" }}>That test is not here</h1>
        <p className="muted measure" style={{ marginTop: "var(--space-xs)" }}>
          It may have been renamed or removed from the curriculum file.
        </p>
        <Link href="/exams" className="btn btn-primary" style={{ marginTop: "var(--space-md)" }}>Back to tests</Link>
      </div>
    );
  }

  const sets = data.sets.filter((s) => exam.setIds.includes(s.sourceId ?? s.id));
  const days = daysUntil(exam.date);
  const tone = days < 0 ? "var(--muted)" : days <= 2 ? "var(--warn)" : "var(--accent)";
  const drillHref = `/conjugate?tenses=${exam.tenses.join(",")}${exam.verbs.length ? `&verbs=${encodeURIComponent(exam.verbs.join(","))}` : "&group=all"}`;

  const toggle = (t: string) =>
    setChecked(checked.includes(t) ? checked.filter((x) => x !== t) : [...checked, t]);

  return (
    <div>
      <Link href="/exams" className="label" style={{ textDecoration: "none" }}>← Exámenes</Link>

      <header style={{ marginTop: "var(--space-md)", borderTop: "var(--rule-thick) solid var(--color-ink)", paddingTop: "var(--space-sm)" }}>
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <h1 className="display flex-1" style={{ fontSize: "var(--text-2xl)", minWidth: "min(100%, 16rem)" }}>{exam.title}</h1>
          <span className="data" style={{ fontSize: "var(--text-lg)", color: tone }}>{countdownLabel(exam.date)}</span>
        </div>
        <p className="tag" style={{ marginTop: "var(--space-xs)" }}>{formatExamDate(exam.date)}</p>
        {exam.format && <p className="measure" style={{ marginTop: "var(--space-sm)" }}>{exam.format}</p>}
        {exam.source && <p className="tag" style={{ marginTop: "var(--space-xs)" }}>From: {exam.source}</p>}

        <div className="flex flex-wrap gap-3" style={{ marginTop: "var(--space-lg)" }}>
          <Link href={`/exams/${exam.id}/mock`} className="btn btn-primary">Take the mock exam</Link>
          {exam.tenses.length > 0 && <Link href={drillHref} className="btn btn-outline">Drill these tenses</Link>}
          {sets[0] && <Link href={`/sets/${sets[0].id}/learn`} className="link label self-center">Study the vocabulary →</Link>}
        </div>
      </header>

      {exam.topics.length > 0 && (
        <section style={{ marginTop: "var(--space-2xl)" }}>
          <h2 className="display" style={{ fontSize: "var(--text-xl)", borderBottom: "var(--rule-thick) solid var(--color-ink)", paddingBottom: "var(--space-xs)" }}>
            Temario
          </h2>
          <p className="tag" style={{ marginTop: "var(--space-xs)" }}>Tick things off as you get through them.</p>
          <div style={{ marginTop: "var(--space-sm)" }}>
            {exam.topics.map((t) => {
              const on = checked.includes(t);
              return (
                <button key={t} onClick={() => toggle(t)} aria-pressed={on}
                  className="flex items-baseline gap-3 w-full text-left"
                  style={{ padding: "var(--space-xs) 0", borderTop: "var(--rule-hair) solid var(--color-rule)", minHeight: 40 }}>
                  <span className="data shrink-0 grid place-items-center" aria-hidden="true"
                    style={{
                      width: 16, height: 16, transform: "translateY(2px)", fontSize: 11, lineHeight: 1,
                      border: `var(--rule-hair) solid ${on ? "var(--color-good)" : "var(--color-rule-2)"}`,
                      background: on ? "var(--color-good)" : "transparent",
                      color: "var(--color-paper)",
                    }}>
                    {on ? "×" : ""}
                  </span>
                  <span style={{ fontSize: "var(--text-sm)", textDecoration: on ? "line-through" : "none", color: on ? "var(--color-muted)" : "var(--color-ink)" }}>{t}</span>
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: "var(--space-md)", maxWidth: "32rem" }}>
            <ProgressBar value={(checked.length / exam.topics.length) * 100} tone="good" />
          </div>
        </section>
      )}

      {sets.length > 0 && (
        <section style={{ marginTop: "var(--space-2xl)" }}>
          <h2 className="display" style={{ fontSize: "var(--text-xl)", borderBottom: "var(--rule-thick) solid var(--color-ink)", paddingBottom: "var(--space-xs)" }}>
            Vocabulario del examen
          </h2>
          {sets.map((s) => {
            const st = statsFor(s);
            return (
              <Link key={s.id} href={`/sets/${s.id}`} className="row" style={{ textDecoration: "none", color: "inherit" }}>
                <span className="flex-1 min-w-0">
                  <span className="display block" style={{ fontSize: "var(--text-lg)" }}>{s.title}</span>
                  <span className="tag block" style={{ marginTop: "var(--space-3xs)" }}>
                    {st.total} terms · {st.mastered} mastered{st.dueNow ? ` · ${st.dueNow} due` : ""}
                  </span>
                </span>
                <span className="data tnum shrink-0" style={{ fontSize: "var(--text-sm)", color: "var(--color-ink-2)" }}>{st.percent}%</span>
              </Link>
            );
          })}
        </section>
      )}

      {exam.tenses.length > 0 && (
        <section style={{ marginTop: "var(--space-2xl)" }}>
          <h2 className="display" style={{ fontSize: "var(--text-xl)", borderBottom: "var(--rule-thick) solid var(--color-ink)", paddingBottom: "var(--space-xs)" }}>
            Tiempos verbales
          </h2>
          <div className="flex flex-wrap gap-x-5 gap-y-1" style={{ marginTop: "var(--space-sm)" }}>
            {exam.tenses.map((t) => (
              <span key={t} className="data" style={{ fontSize: "var(--text-sm)" }}>{TENSE_BY_KEY[t]?.name ?? t}</span>
            ))}
          </div>
          {exam.verbs.length > 0 && (
            <>
              <p className="label" style={{ marginTop: "var(--space-lg)" }}>Verbs named in the packet</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1" style={{ marginTop: "var(--space-xs)" }}>
                {exam.verbs.map((v) => (
                  <Link key={v} href={`/tables?verb=${encodeURIComponent(v)}`} className="link data" style={{ fontSize: "var(--text-sm)" }}>{v}</Link>
                ))}
              </div>
            </>
          )}
          <Link href={drillHref} className="btn btn-primary" style={{ marginTop: "var(--space-lg)" }}>Start the drill</Link>
        </section>
      )}

      {exam.notes && exam.notes.length > 0 && (
        <section style={{ marginTop: "var(--space-2xl)" }}>
          <h2 className="display" style={{ fontSize: "var(--text-xl)", borderBottom: "var(--rule-thick) solid var(--color-ink)", paddingBottom: "var(--space-xs)" }}>
            Apuntes
          </h2>
          {exam.notes.map((n) => (
            <div key={n.heading} style={{ borderTop: "var(--rule-hair) solid var(--color-rule)", paddingBlock: "var(--space-md)" }}>
              <h3 className="display" style={{ fontSize: "var(--text-lg)" }}>{n.heading}</h3>
              <p className="muted measure" style={{ fontSize: "var(--text-sm)", marginTop: "var(--space-2xs)", whiteSpace: "pre-wrap" }}>{n.body}</p>
            </div>
          ))}
        </section>
      )}

      {exam.plan && exam.plan.length > 0 && (
        <section style={{ marginTop: "var(--space-2xl)" }}>
          <h2 className="display" style={{ fontSize: "var(--text-xl)", borderBottom: "var(--rule-thick) solid var(--color-ink)", paddingBottom: "var(--space-xs)" }}>
            Plan de estudio
          </h2>
          <div>
            {[...exam.plan].sort((a, b) => b.daysBefore - a.daysBefore).map((t, i) => {
              const done = days >= 0 && days < t.daysBefore;
              return (
                <div key={i} className="flex flex-wrap items-baseline gap-x-4 gap-y-1"
                  style={{
                    opacity: done ? 0.5 : 1,
                    borderTop: "var(--rule-hair) solid var(--color-rule)",
                    paddingBlock: "var(--space-sm)",
                    paddingLeft: days === t.daysBefore ? "var(--space-sm)" : 0,
                    borderLeft: days === t.daysBefore ? "var(--rule-thick) solid var(--color-accent)" : undefined,
                  }}>
                  <span className="label shrink-0" style={{ minWidth: "9rem" }}>
                    {t.daysBefore === 0 ? "Exam day" : `${t.daysBefore} day${t.daysBefore === 1 ? "" : "s"} before`}
                  </span>
                  <span className="flex-1" style={{ fontSize: "var(--text-sm)", minWidth: "min(100%, 12rem)" }}>{t.task}</span>
                  {t.href && <Link href={t.href} className="link label shrink-0">Go →</Link>}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
