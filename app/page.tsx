"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAppData } from "@/lib/useData";
import { syncCurriculum, allExams, countdownLabel, formatExamDate, daysUntil } from "@/lib/curriculum";
import { statsFor } from "@/lib/srs";
import { CONJUGATION_DECKS, deckHref } from "@/lib/decks";
import { Ring, ProgressBar } from "@/components/ui";

export default function Home() {
  const data = useAppData();
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    syncCurriculum();
    setSynced(true);
  }, []);

  const rows = data.sets.map((s) => ({ set: s, st: statsFor(s) }));
  const exams = synced ? allExams().filter((e) => daysUntil(e.date) >= 0) : [];
  const next = exams[0];

  return (
    <div className="space-y-8">
      <section className="card-shell p-6 md:p-8 relative overflow-hidden">
        <div
          className="absolute -top-24 -right-16 w-72 h-72 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
        />
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">SA Spanish 4</h1>
        <p className="muted mt-2 max-w-xl">
          Your class vocabulary and a full conjugation trainer in one place. Everything here is built
          from the packets — study it, drill it, then take a practice test on it.
        </p>
        <div className="flex flex-wrap gap-2.5 mt-5">
          {rows[0] && <Link href={`/sets/${rows[0].set.id}/learn`} className="btn btn-primary">Study vocabulary</Link>}
          <Link href="/conjugate" className="btn btn-outline">Conjugation drill</Link>
          {next && <Link href={`/exams/${next.id}`} className="btn btn-ghost">Prep for {next.title}</Link>}
        </div>
      </section>

      {next && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">Next test</h2>
            <Link href="/exams" className="text-sm accent font-semibold">All tests →</Link>
          </div>
          <Link href={`/exams/${next.id}`} className="card-shell p-5 flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-48">
              <div className="font-semibold text-lg">{next.title}</div>
              <div className="text-sm muted mt-0.5">{formatExamDate(next.date)}</div>
              {next.topics.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {next.topics.slice(0, 4).map((t) => <span key={t} className="chip">{t}</span>)}
                  {next.topics.length > 4 && <span className="chip">+{next.topics.length - 4} more</span>}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-2xl font-extrabold" style={{ color: daysUntil(next.date) <= 2 ? "var(--warn)" : "var(--accent)" }}>
                {countdownLabel(next.date)}
              </div>
            </div>
          </Link>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Vocabulary</h2>
          <Link href="/sets" className="text-sm accent font-semibold">View all →</Link>
        </div>
        {!rows.length ? (
          <div className="card-shell p-8 text-center muted text-sm">Loading your sets…</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {rows.map(({ set, st }) => (
              <Link key={set.id} href={`/sets/${set.id}`} className="card-shell p-4 hover:-translate-y-0.5 transition-transform">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{set.title}</div>
                    <div className="text-xs muted mt-0.5">{st.total} terms · {st.mastered} mastered</div>
                  </div>
                  <Ring value={st.percent} size={52} />
                </div>
                <div className="mt-3"><ProgressBar value={st.percent} tone={st.percent >= 80 ? "good" : "accent"} /></div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Conjugation</h2>
          <Link href="/tables" className="text-sm accent font-semibold">Verb tables →</Link>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          {CONJUGATION_DECKS.map((d) => (
            <Link key={d.id} href={deckHref(d)} className="card-shell p-4 hover:-translate-y-0.5 transition-transform relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1" style={{ background: d.color }} />
              <div className="font-semibold mt-1">{d.name}</div>
              <div className="text-xs muted mt-1">{d.description}</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
