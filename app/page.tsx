"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAppData } from "@/lib/useData";
import { seedIfEmpty } from "@/lib/seed";
import { statsFor } from "@/lib/srs";
import { Ring, Stat, ProgressBar } from "@/components/ui";

export default function Home() {
  const data = useAppData();
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (seedIfEmpty()) setSeeded(true);
  }, []);

  const allStats = data.sets.map((s) => ({ set: s, st: statsFor(s) }));
  const totalCards = allStats.reduce((n, a) => n + a.st.total, 0);
  const totalMastered = allStats.reduce((n, a) => n + a.st.mastered, 0);
  const dueNow = allStats.reduce((n, a) => n + a.st.dueNow, 0);
  const overall = totalCards ? Math.round((totalMastered / totalCards) * 100) : 0;
  const lastTest = data.tests[0];
  const lastDrill = data.drills[0];

  return (
    <div className="space-y-8">
      <section className="card-shell p-6 md:p-8 relative overflow-hidden">
        <div
          className="absolute -top-24 -right-16 w-72 h-72 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
        />
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
          Get an A in Spanish 4.
        </h1>
        <p className="muted mt-2 max-w-xl">
          Upload any vocab list and drill it with flashcards, spaced repetition, and real practice
          tests — plus a full conjugation trainer covering every tense you will be graded on.
        </p>
        <div className="flex flex-wrap gap-2.5 mt-5">
          <Link href="/sets/new" className="btn btn-primary">Upload a vocab list</Link>
          <Link href="/conjugate" className="btn btn-outline">Start a conjugation drill</Link>
          {dueNow > 0 && data.sets[0] && (
            <Link href={`/sets/${allStats.sort((a, b) => b.st.dueNow - a.st.dueNow)[0].set.id}/learn`} className="btn btn-ghost">
              Review {dueNow} due card{dueNow === 1 ? "" : "s"}
            </Link>
          )}
        </div>
        {seeded && (
          <p className="text-xs muted mt-4">
            Three starter sets are loaded so you can try everything right away — delete them any time.
          </p>
        )}
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Day streak" value={data.streak.count} sub={data.streak.count ? "Keep it going" : "Study today to start"} />
        <Stat label="Terms" value={totalCards} sub={`${data.sets.length} set${data.sets.length === 1 ? "" : "s"}`} />
        <Stat label="Mastered" value={`${totalMastered}`} sub={`${overall}% overall`} />
        <Stat label="Due now" value={dueNow} sub={dueNow ? "Review beats rereading" : "All caught up"} />
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Your sets</h2>
          <Link href="/sets" className="text-sm accent font-semibold">View all →</Link>
        </div>
        {!data.sets.length ? (
          <div className="card-shell p-8 text-center">
            <p className="muted text-sm">No sets yet.</p>
            <Link href="/sets/new" className="btn btn-primary mt-4">Create your first set</Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {allStats.slice(0, 6).map(({ set, st }) => (
              <Link key={set.id} href={`/sets/${set.id}`} className="card-shell p-4 hover:-translate-y-0.5 transition-transform">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{set.title}</div>
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

      <section className="grid md:grid-cols-2 gap-4">
        <div className="card-shell p-5">
          <h3 className="font-bold">Conjugation trainer</h3>
          <p className="muted text-sm mt-1">
            186 verbs × 18 tenses, including the subjunctive, the perfect tenses and commands.
            Pick your verbs and tenses, drill them, and see the full table on every miss.
          </p>
          <div className="flex gap-2 mt-4">
            <Link href="/conjugate" className="btn btn-primary text-sm">Drill verbs</Link>
            <Link href="/tables" className="btn btn-outline text-sm">Browse tables</Link>
          </div>
          {lastDrill && (
            <p className="text-xs muted mt-3">
              Last drill: {lastDrill.score}/{lastDrill.total} on {lastDrill.label}
            </p>
          )}
        </div>
        <div className="card-shell p-5">
          <h3 className="font-bold">Practice tests</h3>
          <p className="muted text-sm mt-1">
            Build a graded test from any set — multiple choice, written answers, true/false and
            matching — then retake only what you missed.
          </p>
          <div className="flex gap-2 mt-4">
            {data.sets[0] ? (
              <Link href={`/sets/${data.sets[0].id}/test`} className="btn btn-primary text-sm">Take a test</Link>
            ) : (
              <Link href="/sets/new" className="btn btn-primary text-sm">Add a set first</Link>
            )}
            <Link href="/progress" className="btn btn-outline text-sm">See scores</Link>
          </div>
          {lastTest && (
            <p className="text-xs muted mt-3">
              Last test: {lastTest.score}/{lastTest.total} on {lastTest.setTitle}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
