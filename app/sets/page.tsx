"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAppData } from "@/lib/useData";
import { syncCurriculum } from "@/lib/curriculum";
import { statsFor } from "@/lib/srs";
import { exportAll, importAll } from "@/lib/storage";
import { CONJUGATION_DECKS, deckHref } from "@/lib/decks";
import { Ring, ProgressBar } from "@/components/ui";

export default function SetsPage() {
  const data = useAppData();
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => { syncCurriculum(); }, []);

  const sets = data.sets.filter(
    (s) =>
      s.title.toLowerCase().includes(q.toLowerCase()) ||
      s.cards.some((c) => (c.term + c.def).toLowerCase().includes(q.toLowerCase())),
  );

  function download() {
    const blob = new Blob([exportAll()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sa-spanish4-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onImportFile(file: File) {
    setMsg(importAll(await file.text()).message);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Vocabulary</h1>
        <input
          className="input !w-64 ml-auto"
          placeholder="Search sets and terms…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {!data.sets.length ? (
        <div className="card-shell p-8 text-center muted text-sm">Loading your sets…</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sets.map((s) => {
            const st = statsFor(s);
            return (
              <div key={s.id} className="card-shell p-4 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1" style={{ background: s.color }} />
                <Link href={`/sets/${s.id}`} className="flex items-start gap-3 flex-1 mt-1">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{s.title}</div>
                    {s.description && <div className="text-xs muted mt-0.5 line-clamp-3">{s.description}</div>}
                    <div className="text-xs muted mt-1.5">
                      {st.total} terms · {st.mastered} mastered{st.dueNow ? ` · ${st.dueNow} due` : ""}
                    </div>
                  </div>
                  <Ring value={st.percent} size={52} />
                </Link>
                <div className="mt-3"><ProgressBar value={st.percent} tone={st.percent >= 80 ? "good" : "accent"} /></div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <Link href={`/sets/${s.id}/learn`} className="btn btn-ghost !py-1 !px-2.5 text-xs">Learn</Link>
                  <Link href={`/sets/${s.id}/flashcards`} className="btn btn-ghost !py-1 !px-2.5 text-xs">Cards</Link>
                  <Link href={`/sets/${s.id}/write`} className="btn btn-ghost !py-1 !px-2.5 text-xs">Write</Link>
                  <Link href={`/sets/${s.id}/match`} className="btn btn-ghost !py-1 !px-2.5 text-xs">Match</Link>
                  <Link href={`/sets/${s.id}/test`} className="btn btn-ghost !py-1 !px-2.5 text-xs">Test</Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <section>
        <h2 className="text-lg font-bold mb-3">Conjugation decks</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {CONJUGATION_DECKS.map((d) => (
            <Link key={d.id} href={deckHref(d)} className="card-shell p-4 relative overflow-hidden hover:-translate-y-0.5 transition-transform">
              <div className="absolute top-0 left-0 right-0 h-1" style={{ background: d.color }} />
              <div className="font-semibold mt-1">{d.name}</div>
              <div className="text-xs muted mt-1">{d.description}</div>
            </Link>
          ))}
        </div>
      </section>

      <div className="card-shell p-5">
        <h2 className="font-bold">Where these come from</h2>
        <p className="muted text-sm mt-1">
          Sets are generated from the class packets in <code>data/curriculum.ts</code>. To add or
          change one, hand Claude the packet and push the result — it appears here on the next
          deploy. Your progress is matched by Spanish term, so updating a set never resets it.
        </p>
        <div className="flex flex-wrap gap-2 mt-4 items-center">
          <button onClick={download} className="btn btn-outline text-sm">Export my progress</button>
          <label className="btn btn-outline text-sm cursor-pointer">
            Restore from a backup
            <input type="file" accept="application/json,.json" className="hidden"
              onChange={(e) => e.target.files?.[0] && onImportFile(e.target.files[0])} />
          </label>
          {msg && <span className="text-sm muted">{msg}</span>}
        </div>
      </div>
    </div>
  );
}
