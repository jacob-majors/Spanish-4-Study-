"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAppData } from "@/lib/useData";
import { examById, syncCurriculum, countdownLabel, formatExamDate, daysUntil } from "@/lib/curriculum";
import { TENSE_BY_KEY } from "@/lib/conjugation/types";
import { statsFor } from "@/lib/srs";
import { useLocalState, ProgressBar, Ring } from "@/components/ui";

export default function ExamPage() {
  const params = useParams();
  const id = String(params?.id ?? "");
  const data = useAppData();
  const [ready, setReady] = useState(false);
  const [checked, setChecked] = useLocalState<string[]>(`sa.exam.${id}.topics`, []);

  useEffect(() => { syncCurriculum(); setReady(true); }, []);

  const exam = ready ? examById(id) : undefined;

  if (!ready) return <div className="card-shell p-10 text-center muted">Loading…</div>;
  if (!exam) {
    return (
      <div className="card-shell p-10 text-center">
        <div className="text-lg font-semibold">That test is not here</div>
        <p className="muted text-sm mt-1.5">It may have been renamed or removed from the curriculum file.</p>
        <Link href="/exams" className="btn btn-primary mt-5">Back to tests</Link>
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
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/exams" className="btn btn-ghost !py-1.5 !px-3 text-sm">← Tests</Link>
      </div>

      <div className="card-shell p-6">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex-1 min-w-48">
            <h1 className="text-2xl font-bold">{exam.title}</h1>
            <div className="muted text-sm mt-1">{formatExamDate(exam.date)}</div>
            {exam.format && <div className="text-sm mt-2">{exam.format}</div>}
            {exam.source && <div className="text-xs muted mt-2">From: {exam.source}</div>}
          </div>
          <div className="text-2xl font-extrabold" style={{ color: tone }}>{countdownLabel(exam.date)}</div>
        </div>

        <div className="flex flex-wrap gap-2 mt-5">
          <Link href={`/exams/${exam.id}/mock`} className="btn btn-primary">Take the mock exam</Link>
          {exam.tenses.length > 0 && <Link href={drillHref} className="btn btn-outline">Drill these tenses</Link>}
          {sets[0] && <Link href={`/sets/${sets[0].id}/learn`} className="btn btn-ghost">Study the vocabulary</Link>}
        </div>
      </div>

      {exam.topics.length > 0 && (
        <section className="card-shell p-5">
          <h2 className="font-bold">What it covers</h2>
          <p className="text-xs muted mt-0.5">Tick things off as you get through them.</p>
          <div className="mt-3 space-y-1.5">
            {exam.topics.map((t) => {
              const on = checked.includes(t);
              return (
                <button key={t} onClick={() => toggle(t)}
                  className="flex items-start gap-2.5 w-full text-left rounded-lg px-2.5 py-2 transition-colors"
                  style={{ background: on ? "color-mix(in srgb, var(--good) 12%, transparent)" : "transparent" }}>
                  <span className="grid place-items-center w-4 h-4 rounded shrink-0 mt-0.5 text-[10px] font-bold"
                    style={{ border: `1.5px solid ${on ? "var(--good)" : "var(--border)"}`, background: on ? "var(--good)" : "transparent", color: "#fff" }}>
                    {on ? "✓" : ""}
                  </span>
                  <span className="text-sm" style={{ textDecoration: on ? "line-through" : "none", opacity: on ? 0.6 : 1 }}>{t}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-3"><ProgressBar value={(checked.length / exam.topics.length) * 100} tone="good" /></div>
        </section>
      )}

      {sets.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-3">Vocabulary on this test</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {sets.map((s) => {
              const st = statsFor(s);
              return (
                <Link key={s.id} href={`/sets/${s.id}`} className="card-shell p-4 flex items-center gap-3">
                  <Ring value={st.percent} size={48} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{s.title}</div>
                    <div className="text-xs muted">{st.total} terms · {st.mastered} mastered{st.dueNow ? ` · ${st.dueNow} due` : ""}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {exam.tenses.length > 0 && (
        <section className="card-shell p-5">
          <h2 className="font-bold">Tenses on this test</h2>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {exam.tenses.map((t) => (
              <span key={t} className="chip">{TENSE_BY_KEY[t]?.name ?? t}</span>
            ))}
          </div>
          {exam.verbs.length > 0 && (
            <>
              <div className="text-xs muted uppercase tracking-wide mt-4 mb-1.5">Verbs named in the packet</div>
              <div className="flex flex-wrap gap-1.5">
                {exam.verbs.map((v) => (
                  <Link key={v} href={`/tables?verb=${encodeURIComponent(v)}`} className="chip hover:underline">{v}</Link>
                ))}
              </div>
            </>
          )}
          <Link href={drillHref} className="btn btn-primary mt-4 text-sm">Start the drill</Link>
        </section>
      )}

      {exam.notes && exam.notes.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-3">Study sheet</h2>
          <div className="space-y-2.5">
            {exam.notes.map((n) => (
              <div key={n.heading} className="card-shell p-4">
                <div className="font-semibold">{n.heading}</div>
                <p className="text-sm muted mt-1 whitespace-pre-wrap">{n.body}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {exam.plan && exam.plan.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-3">Plan</h2>
          <div className="space-y-2">
            {[...exam.plan].sort((a, b) => b.daysBefore - a.daysBefore).map((t, i) => {
              const done = days >= 0 && days < t.daysBefore;
              return (
                <div key={i} className="card-shell p-3.5 flex items-center gap-3"
                  style={{ opacity: done ? 0.55 : 1, borderLeft: days === t.daysBefore ? "3px solid var(--accent)" : undefined }}>
                  <span className="chip shrink-0">
                    {t.daysBefore === 0 ? "Exam day" : `${t.daysBefore} day${t.daysBefore === 1 ? "" : "s"} before`}
                  </span>
                  <span className="text-sm flex-1">{t.task}</span>
                  {t.href && <Link href={t.href} className="btn btn-ghost !py-1 !px-2.5 text-xs shrink-0">Go</Link>}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
