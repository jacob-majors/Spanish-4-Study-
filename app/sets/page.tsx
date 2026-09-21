"use client";

import Link from "next/link";
import { useState } from "react";
import { useAppData } from "@/lib/useData";
import { statsFor } from "@/lib/srs";
import { deleteSet, exportAll, importAll } from "@/lib/storage";
import { Ring, ProgressBar, Empty } from "@/components/ui";

export default function SetsPage() {
  const data = useAppData();
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");

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
    a.download = `verbo-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onImportFile(file: File) {
    const res = importAll(await file.text());
    setMsg(res.message);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">My sets</h1>
        <div className="ml-auto flex flex-wrap gap-2">
          <input
            className="input !w-56"
            placeholder="Search sets and terms…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Link href="/sets/new" className="btn btn-primary">+ New set</Link>
        </div>
      </div>

      {!data.sets.length ? (
        <Empty
          title="No study sets yet"
          body="Paste a vocab list from your teacher, upload a CSV, or import a Quizlet export. Anything with a term and a meaning works."
          action={<Link href="/sets/new" className="btn btn-primary">Create a set</Link>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sets.map((s) => {
            const st = statsFor(s);
            return (
              <div key={s.id} className="card-shell p-4 flex flex-col">
                <Link href={`/sets/${s.id}`} className="flex items-start gap-3 flex-1">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{s.title}</div>
                    {s.description && <div className="text-xs muted mt-0.5 line-clamp-2">{s.description}</div>}
                    <div className="text-xs muted mt-1.5">
                      {st.total} terms · {st.mastered} mastered{st.dueNow ? ` · ${st.dueNow} due` : ""}
                    </div>
                  </div>
                  <Ring value={st.percent} size={52} />
                </Link>
                <div className="mt-3"><ProgressBar value={st.percent} tone={st.percent >= 80 ? "good" : "accent"} /></div>
                <div className="flex gap-1.5 mt-3">
                  <Link href={`/sets/${s.id}/learn`} className="btn btn-ghost !py-1 !px-2.5 text-xs">Learn</Link>
                  <Link href={`/sets/${s.id}/test`} className="btn btn-ghost !py-1 !px-2.5 text-xs">Test</Link>
                  <Link href={`/sets/${s.id}/edit`} className="btn btn-ghost !py-1 !px-2.5 text-xs">Edit</Link>
                  <button
                    className="btn btn-ghost !py-1 !px-2.5 text-xs ml-auto"
                    style={{ color: "var(--bad)" }}
                    onClick={() => {
                      if (confirm(`Delete "${s.title}" and its progress? This cannot be undone.`)) deleteSet(s.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="card-shell p-5">
        <h2 className="font-bold">Backup</h2>
        <p className="muted text-sm mt-1">
          Your sets and progress live in this browser only. Export a file to move them to another
          computer or to keep a copy.
        </p>
        <div className="flex flex-wrap gap-2 mt-4 items-center">
          <button onClick={download} className="btn btn-outline text-sm">Export everything</button>
          <label className="btn btn-outline text-sm cursor-pointer">
            Import a backup
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onImportFile(e.target.files[0])}
            />
          </label>
          {msg && <span className="text-sm muted">{msg}</span>}
        </div>
      </div>
    </div>
  );
}
