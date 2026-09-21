"use client";

import Link from "next/link";
import { useAppData } from "@/lib/useData";
import { statsFor } from "@/lib/srs";
import { Stat, ProgressBar, Ring, Empty } from "@/components/ui";

function when(ts: number) {
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(ts).toLocaleDateString();
}

export default function ProgressPage() {
  const data = useAppData();
  const rows = data.sets.map((s) => ({ set: s, st: statsFor(s) }));
  const totalCards = rows.reduce((n, r) => n + r.st.total, 0);
  const mastered = rows.reduce((n, r) => n + r.st.mastered, 0);
  const testAvg = data.tests.length
    ? Math.round(data.tests.reduce((n, t) => n + t.score / Math.max(1, t.total), 0) / data.tests.length * 100)
    : 0;
  const drillAvg = data.drills.length
    ? Math.round(data.drills.reduce((n, t) => n + t.score / Math.max(1, t.total), 0) / data.drills.length * 100)
    : 0;

  if (!data.sets.length && !data.tests.length && !data.drills.length) {
    return <Empty title="Nothing tracked yet" body="Study some vocabulary or run a conjugation drill and your scores will show up here."
      action={<Link href="/sets" className="btn btn-primary">Go to vocabulary</Link>} />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Progress</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Day streak" value={data.streak.count} />
        <Stat label="Terms mastered" value={`${mastered}/${totalCards}`} />
        <Stat label="Test average" value={data.tests.length ? `${testAvg}%` : "—"} sub={`${data.tests.length} taken`} />
        <Stat label="Drill average" value={data.drills.length ? `${drillAvg}%` : "—"} sub={`${data.drills.length} run`} />
      </div>

      {rows.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-3">By set</h2>
          <div className="space-y-2">
            {rows.map(({ set, st }) => (
              <Link key={set.id} href={`/sets/${set.id}`} className="card-shell p-4 flex items-center gap-4">
                <Ring value={st.percent} size={48} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{set.title}</div>
                  <div className="text-xs muted mt-0.5">
                    {st.mastered} mastered · {st.learning} learning · {st.notStarted} untouched
                    {st.accuracy > 0 && ` · ${st.accuracy}% accuracy`}
                  </div>
                  <div className="mt-2"><ProgressBar value={st.percent} tone={st.percent >= 80 ? "good" : "accent"} /></div>
                </div>
                {st.dueNow > 0 && <span className="chip shrink-0" style={{ color: "var(--warn)" }}>{st.dueNow} due</span>}
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <section>
          <h2 className="text-lg font-bold mb-3">Recent tests</h2>
          {!data.tests.length ? (
            <div className="card-shell p-6 text-sm muted">No tests taken yet.</div>
          ) : (
            <div className="space-y-2">
              {data.tests.slice(0, 8).map((t, i) => {
                const pct = Math.round((t.score / Math.max(1, t.total)) * 100);
                return (
                  <div key={i} className="card-shell p-3.5 flex items-center gap-3">
                    <div className="text-lg font-bold tabular-nums w-14"
                      style={{ color: pct >= 80 ? "var(--good)" : pct >= 70 ? "var(--warn)" : "var(--bad)" }}>{pct}%</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{t.setTitle}</div>
                      <div className="text-xs muted">{t.score}/{t.total} · {when(t.takenAt)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-bold mb-3">Recent drills</h2>
          {!data.drills.length ? (
            <div className="card-shell p-6 text-sm muted">No conjugation drills yet.</div>
          ) : (
            <div className="space-y-2">
              {data.drills.slice(0, 8).map((d, i) => {
                const pct = Math.round((d.score / Math.max(1, d.total)) * 100);
                return (
                  <div key={i} className="card-shell p-3.5 flex items-center gap-3">
                    <div className="text-lg font-bold tabular-nums w-14"
                      style={{ color: pct >= 80 ? "var(--good)" : pct >= 70 ? "var(--warn)" : "var(--bad)" }}>{pct}%</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{d.label}</div>
                      <div className="text-xs muted truncate">{d.tenses.join(", ")} · {when(d.takenAt)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
