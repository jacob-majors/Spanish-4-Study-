"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useAppData } from "@/lib/useData";
import { syncCurriculum } from "@/lib/curriculum";
import { statsFor } from "@/lib/srs";
import { Stat, ProgressBar, Empty } from "@/components/ui";

function when(ts: number) {
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(ts).toLocaleDateString();
}

const toneFor = (pct: number) =>
  pct >= 80 ? "var(--color-good)" : pct >= 70 ? "var(--color-ink)" : "var(--color-accent)";

export default function ProgressPage() {
  const data = useAppData();
  useEffect(() => { syncCurriculum(); }, []);

  const rows = data.sets.map((s) => ({ set: s, st: statsFor(s) }));
  const totalCards = rows.reduce((n, r) => n + r.st.total, 0);
  const mastered = rows.reduce((n, r) => n + r.st.mastered, 0);
  const testAvg = data.tests.length
    ? Math.round((data.tests.reduce((n, t) => n + t.score / Math.max(1, t.total), 0) / data.tests.length) * 100)
    : 0;
  const drillAvg = data.drills.length
    ? Math.round((data.drills.reduce((n, t) => n + t.score / Math.max(1, t.total), 0) / data.drills.length) * 100)
    : 0;

  if (!data.sets.length && !data.tests.length && !data.drills.length) {
    return (
      <Empty
        title="Nothing tracked yet"
        body="Study some vocabulary or run a conjugation drill and your scores will show up here."
        action={<Link href="/sets" className="btn btn-primary">Go to vocabulary</Link>}
      />
    );
  }

  return (
    <div>
      <p className="label">Progreso</p>
      <h1 className="display" style={{ fontSize: "var(--text-2xl)", marginTop: "var(--space-xs)" }}>
        Cuaderno de notas
      </h1>

      <div
        className="grid gap-x-8 gap-y-5"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 9rem), 1fr))", marginTop: "var(--space-xl)" }}
      >
        <Stat label="Racha" value={data.streak.count} sub={data.streak.count ? "days running" : "study today to start"} />
        <Stat label="Dominados" value={`${mastered}/${totalCards}`} sub="terms" />
        <Stat label="Media de exámenes" value={data.tests.length ? `${testAvg}%` : "—"} sub={`${data.tests.length} taken`} />
        <Stat label="Media de drills" value={data.drills.length ? `${drillAvg}%` : "—"} sub={`${data.drills.length} run`} />
      </div>

      {rows.length > 0 && (
        <section style={{ marginTop: "var(--space-2xl)" }}>
          <h2 className="display" style={{ fontSize: "var(--text-xl)", borderBottom: "var(--rule-thick) solid var(--color-ink)", paddingBottom: "var(--space-xs)" }}>
            Por lista
          </h2>
          {rows.map(({ set, st }) => (
            <Link key={set.id} href={`/sets/${set.id}`} className="row" style={{ textDecoration: "none", color: "inherit", alignItems: "flex-start" }}>
              <span className="flex-1 min-w-0">
                <span className="display block" style={{ fontSize: "var(--text-lg)" }}>{set.title}</span>
                <span className="tag block" style={{ marginTop: "var(--space-3xs)" }}>
                  {st.mastered} mastered · {st.learning} learning · {st.notStarted} untouched
                  {st.accuracy > 0 && ` · ${st.accuracy}% accuracy`}
                </span>
                <span className="block" style={{ marginTop: "var(--space-xs)", maxWidth: "30rem" }}>
                  <ProgressBar value={st.percent} tone={st.percent >= 80 ? "good" : "accent"} />
                </span>
              </span>
              <span className="data tnum shrink-0" style={{ fontSize: "var(--text-sm)", color: "var(--color-ink-2)" }}>{st.percent}%</span>
            </Link>
          ))}
        </section>
      )}

      <div className="grid gap-x-10 gap-y-8" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 20rem), 1fr))", marginTop: "var(--space-2xl)" }}>
        <section>
          <h2 className="display" style={{ fontSize: "var(--text-lg)", borderBottom: "var(--rule-hair) solid var(--color-rule-2)", paddingBottom: "var(--space-2xs)" }}>
            Exámenes recientes
          </h2>
          {!data.tests.length ? (
            <p className="muted" style={{ fontSize: "var(--text-sm)", marginTop: "var(--space-sm)" }}>No tests taken yet.</p>
          ) : (
            <table className="sheet" style={{ marginTop: "var(--space-xs)" }}>
              <tbody>
                {data.tests.slice(0, 8).map((t, i) => {
                  const pct = Math.round((t.score / Math.max(1, t.total)) * 100);
                  return (
                    <tr key={i}>
                      <td className="data tnum" style={{ width: "4ch", color: toneFor(pct) }}>{pct}%</td>
                      <td>{t.setTitle}</td>
                      <td className="tag" style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        {t.score}/{t.total} · {when(t.takenAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        <section>
          <h2 className="display" style={{ fontSize: "var(--text-lg)", borderBottom: "var(--rule-hair) solid var(--color-rule-2)", paddingBottom: "var(--space-2xs)" }}>
            Drills recientes
          </h2>
          {!data.drills.length ? (
            <p className="muted" style={{ fontSize: "var(--text-sm)", marginTop: "var(--space-sm)" }}>No conjugation drills yet.</p>
          ) : (
            <table className="sheet" style={{ marginTop: "var(--space-xs)" }}>
              <tbody>
                {data.drills.slice(0, 8).map((d, i) => {
                  const pct = Math.round((d.score / Math.max(1, d.total)) * 100);
                  return (
                    <tr key={i}>
                      <td className="data tnum" style={{ width: "4ch", color: toneFor(pct) }}>{pct}%</td>
                      <td>
                        {d.label}
                        <span className="tag block">{d.tenses.join(", ")}</span>
                      </td>
                      <td className="tag" style={{ textAlign: "right", whiteSpace: "nowrap" }}>{when(d.takenAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
