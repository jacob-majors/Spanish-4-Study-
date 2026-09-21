"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAppData } from "@/lib/useData";
import { syncCurriculum } from "@/lib/curriculum";
import { statsFor } from "@/lib/srs";
import { exportAll, importAll } from "@/lib/storage";
import { CONJUGATION_DECKS, deckHref } from "@/lib/decks";
import { ProgressBar } from "@/components/ui";

const MODES = [
  ["flashcards", "Cards"],
  ["learn", "Learn"],
  ["write", "Write"],
  ["match", "Match"],
  ["test", "Test"],
] as const;

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
    a.download = `sa-espanol4-progreso-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onImportFile(file: File) {
    setMsg(importAll(await file.text()).message);
  }

  return (
    <div>
      <p className="label">Vocabulario</p>
      <div className="flex flex-wrap items-end gap-4" style={{ marginTop: "var(--space-xs)" }}>
        <h1 className="display" style={{ fontSize: "var(--text-2xl)" }}>Listas de la clase</h1>
        <input
          className="field ml-auto"
          style={{ maxWidth: "18rem", fontSize: "var(--text-sm)" }}
          placeholder="Search terms…"
          aria-label="Search sets and terms"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div style={{ marginTop: "var(--space-xl)" }}>
        {!data.sets.length ? (
          <p className="muted">Loading…</p>
        ) : (
          sets.map((s, i) => {
            const st = statsFor(s);
            return (
              <article
                key={s.id}
                style={{
                  borderTop: "var(--rule-hair) solid var(--color-rule)",
                  paddingBlock: "var(--space-lg)",
                }}
              >
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="data" style={{ color: "var(--color-muted)", fontSize: "var(--text-xs)" }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <Link href={`/sets/${s.id}`} className="display" style={{ fontSize: "var(--text-xl)", textDecoration: "none", color: "var(--color-ink)" }}>
                    {s.title}
                  </Link>
                  <span className="data tnum ml-auto" style={{ fontSize: "var(--text-sm)", color: "var(--color-ink-2)" }}>
                    {st.mastered}<span className="muted">/{st.total}</span>
                  </span>
                </div>

                {s.description && (
                  <p className="muted measure" style={{ fontSize: "var(--text-sm)", marginTop: "var(--space-xs)" }}>
                    {s.description}
                  </p>
                )}

                <div style={{ marginTop: "var(--space-sm)", maxWidth: "32rem" }}>
                  <ProgressBar value={st.percent} tone={st.percent >= 80 ? "good" : "accent"} />
                </div>

                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2" style={{ marginTop: "var(--space-sm)" }}>
                  {MODES.map(([slug, label]) => (
                    <Link key={slug} href={`/sets/${s.id}/${slug}`} className="link label" style={{ borderColor: "var(--color-rule-2)" }}>
                      {label}
                    </Link>
                  ))}
                  {st.dueNow > 0 && (
                    <span className="tag ml-auto" style={{ color: "var(--color-accent)" }}>
                      {st.dueNow} due
                    </span>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>

      <section style={{ marginTop: "var(--space-2xl)" }}>
        <h2 className="display" style={{ fontSize: "var(--text-xl)", borderBottom: "var(--rule-thick) solid var(--color-ink)", paddingBottom: "var(--space-xs)" }}>
          Barajas de conjugación
        </h2>
        {CONJUGATION_DECKS.map((d, i) => (
          <Link key={d.id} href={deckHref(d)} className="row" style={{ textDecoration: "none", color: "inherit" }}>
            <span className="data shrink-0" style={{ color: "var(--color-muted)", fontSize: "var(--text-xs)", width: "2ch" }}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="flex-1 min-w-0">
              <span className="display block" style={{ fontSize: "var(--text-lg)" }}>{d.name}</span>
              <span className="muted block" style={{ fontSize: "var(--text-sm)", marginTop: "var(--space-3xs)" }}>{d.description}</span>
            </span>
            <span className="tag shrink-0" aria-hidden="true">→</span>
          </Link>
        ))}
      </section>

      <section style={{ marginTop: "var(--space-2xl)" }}>
        <h2 className="label">Colofón</h2>
        <p className="muted measure" style={{ fontSize: "var(--text-sm)", marginTop: "var(--space-xs)" }}>
          Sets are generated from the class packets in <span className="data">data/curriculum.ts</span>.
          To add or change one, hand Claude the packet and push the result. Progress is matched by
          Spanish term, so updating a set never resets it.
        </p>
        <div className="flex flex-wrap gap-3 items-center" style={{ marginTop: "var(--space-md)" }}>
          <button onClick={download} className="btn btn-outline">Export my progress</button>
          <label className="btn btn-outline cursor-pointer">
            Restore a backup
            <input type="file" accept="application/json,.json" className="hidden"
              onChange={(e) => e.target.files?.[0] && onImportFile(e.target.files[0])} />
          </label>
          {msg && <span className="muted" style={{ fontSize: "var(--text-sm)" }}>{msg}</span>}
        </div>
      </section>
    </div>
  );
}
