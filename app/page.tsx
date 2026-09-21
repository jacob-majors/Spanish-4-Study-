"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAppData } from "@/lib/useData";
import { syncCurriculum, allExams, countdownLabel, formatExamDate, daysUntil } from "@/lib/curriculum";
import { statsFor } from "@/lib/srs";
import { CONJUGATION_DECKS, deckHref } from "@/lib/decks";
import { ProgressBar } from "@/components/ui";

const n2 = (i: number) => String(i + 1).padStart(2, "0");

export default function Home() {
  const data = useAppData();
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    syncCurriculum();
    setSynced(true);
  }, []);

  const rows = data.sets.map((s) => ({ set: s, st: statsFor(s) }));
  const exams = synced ? allExams().filter((e) => daysUntil(e.date) >= 0) : [];
  const due = rows.reduce((n, r) => n + r.st.dueNow, 0);

  return (
    <div>
      {/* Index-First opening: a label and one sentence. No hero, no display slab. */}
      <p className="label">Índice · SA Español 4</p>
      <p className="measure" style={{ marginTop: "var(--space-xs)", color: "var(--color-ink-2)" }}>
        Everything in this book comes from the class packets. Study the vocabulary, drill the verbs,
        then sit a practice test on it.
        {due > 0 && (
          <>
            {" "}
            <span className="data" style={{ color: "var(--color-accent)" }}>
              {due} {due === 1 ? "term is" : "terms are"} due for review.
            </span>
          </>
        )}
      </p>

      {exams.length > 0 && (
        <Section title="Próximos exámenes">
          {exams.map((e, i) => (
            <Link key={e.id} href={`/exams/${e.id}`} className="row" style={{ textDecoration: "none", color: "inherit" }}>
              <span className="data shrink-0" style={{ color: "var(--color-muted)", fontSize: "var(--text-xs)", width: "2ch" }}>{n2(i)}</span>
              <span className="flex-1 min-w-0">
                <span className="display block" style={{ fontSize: "var(--text-lg)" }}>{e.title}</span>
                <span className="tag block" style={{ marginTop: "var(--space-3xs)" }}>{formatExamDate(e.date)}</span>
              </span>
              <span
                className="data shrink-0 text-right"
                style={{ fontSize: "var(--text-sm)", color: daysUntil(e.date) <= 2 ? "var(--color-accent)" : "var(--color-ink-2)" }}
              >
                {countdownLabel(e.date)}
              </span>
            </Link>
          ))}
        </Section>
      )}

      <Section title="Vocabulario" href="/sets" hrefLabel="All vocabulary">
        {!rows.length ? (
          <p className="muted" style={{ paddingTop: "var(--space-sm)" }}>Loading…</p>
        ) : (
          rows.map(({ set, st }, i) => (
            <Link key={set.id} href={`/sets/${set.id}`} className="row" style={{ textDecoration: "none", color: "inherit" }}>
              <span className="data shrink-0" style={{ color: "var(--color-muted)", fontSize: "var(--text-xs)", width: "2ch" }}>{n2(i)}</span>
              <span className="flex-1 min-w-0">
                <span className="display block" style={{ fontSize: "var(--text-lg)" }}>{set.title}</span>
                <span className="tag block" style={{ marginTop: "var(--space-3xs)" }}>
                  {st.total} terms · {st.mastered} mastered{st.dueNow ? ` · ${st.dueNow} due` : ""}
                </span>
                <span className="block" style={{ marginTop: "var(--space-xs)", maxWidth: "22rem" }}>
                  <ProgressBar value={st.percent} tone={st.percent >= 80 ? "good" : "accent"} />
                </span>
              </span>
              <span className="data tnum shrink-0" style={{ fontSize: "var(--text-sm)", color: "var(--color-ink-2)" }}>
                {st.percent}%
              </span>
            </Link>
          ))
        )}
      </Section>

      <Section title="Conjugación" href="/tables" hrefLabel="Verb tables">
        {CONJUGATION_DECKS.map((d, i) => (
          <Link key={d.id} href={deckHref(d)} className="row" style={{ textDecoration: "none", color: "inherit" }}>
            <span className="data shrink-0" style={{ color: "var(--color-muted)", fontSize: "var(--text-xs)", width: "2ch" }}>{n2(i)}</span>
            <span className="flex-1 min-w-0">
              <span className="display block" style={{ fontSize: "var(--text-lg)" }}>{d.name}</span>
              <span className="muted block" style={{ fontSize: "var(--text-sm)", marginTop: "var(--space-3xs)" }}>{d.description}</span>
            </span>
            <span className="tag shrink-0" aria-hidden="true">→</span>
          </Link>
        ))}
      </Section>
    </div>
  );
}

/**
 * A section head that stacks: heading, count, optional link — all left-flush
 * above the rows it introduces. No eyebrow in the left margin.
 */
function Section({
  title, href, hrefLabel, children,
}: {
  title: string; href?: string; hrefLabel?: string; children: React.ReactNode;
}) {
  return (
    <section style={{ marginTop: "var(--space-2xl)" }}>
      <div
        className="flex flex-wrap items-baseline gap-x-4 gap-y-1"
        style={{ borderBottom: "var(--rule-thick) solid var(--color-ink)", paddingBottom: "var(--space-xs)" }}
      >
        <h2 className="display" style={{ fontSize: "var(--text-xl)" }}>{title}</h2>
        {href && (
          <Link href={href} className="label ml-auto" style={{ textDecoration: "none", color: "var(--color-accent)", whiteSpace: "nowrap" }}>
            {hrefLabel} →
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
