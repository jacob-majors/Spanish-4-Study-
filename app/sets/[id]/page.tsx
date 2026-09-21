"use client";

import Link from "next/link";
import { useState } from "react";
import { useSet } from "@/lib/useSet";
import { statsFor, progressFor, MASTERED_BOX } from "@/lib/srs";
import { upsertSet } from "@/lib/storage";
import { ProgressBar, SpeakButton } from "@/components/ui";
import { NotFound } from "@/components/SetHeader";

const MODES = [
  { href: "flashcards", name: "Fichas", desc: "Flip through with audio" },
  { href: "learn", name: "Aprender", desc: "Spaced repetition that adapts" },
  { href: "write", name: "Escribir", desc: "Type it out, accents and all" },
  { href: "match", name: "Emparejar", desc: "Beat your best time" },
  { href: "test", name: "Examen", desc: "Graded, mixed question types" },
];

export default function SetPage() {
  const { set, ready } = useSet();
  const [starredOnly, setStarredOnly] = useState(false);

  if (!set) return ready ? <NotFound /> : null;
  const st = statsFor(set);
  const cards = starredOnly ? set.cards.filter((c) => c.starred) : set.cards;
  const starCount = set.cards.filter((c) => c.starred).length;

  function toggleStar(cardId: string) {
    if (!set) return;
    const next = structuredClone(set);
    const c = next.cards.find((x) => x.id === cardId);
    if (c) c.starred = !c.starred;
    next.updatedAt = Date.now();
    upsertSet(next);
  }

  return (
    <div>
      {/* Catalogue masthead: title, then the counts as a spec strip. */}
      <p className="label">Lista de vocabulario</p>
      <h1 className="display measure" style={{ fontSize: "var(--text-2xl)", marginTop: "var(--space-xs)" }}>
        {set.title}
      </h1>
      {set.description && (
        <p className="muted measure" style={{ marginTop: "var(--space-sm)" }}>{set.description}</p>
      )}

      <dl
        className="grid gap-x-8 gap-y-3"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(7rem, 1fr))",
          marginTop: "var(--space-lg)",
          borderTop: "var(--rule-thick) solid var(--color-ink)",
          paddingTop: "var(--space-sm)",
        }}
      >
        {([
          ["Términos", st.total, undefined],
          ["Dominados", st.mastered, "good"],
          ["Aprendiendo", st.learning, undefined],
          ["Para repasar", st.dueNow, st.dueNow ? "accent" : undefined],
          ["Acierto", st.accuracy ? `${st.accuracy}%` : "—", undefined],
        ] as const).map(([label, value, tone]) => (
          <div key={label}>
            <dt className="label">{label}</dt>
            <dd
              className="data tnum"
              style={{
                fontSize: "var(--text-lg)",
                marginTop: 2,
                color: tone === "good" ? "var(--color-good)" : tone === "accent" ? "var(--color-accent)" : "var(--color-ink)",
              }}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <div style={{ marginTop: "var(--space-md)", maxWidth: "40rem" }}>
        <ProgressBar value={st.percent} tone={st.percent >= 80 ? "good" : "accent"} />
      </div>

      {/* Modes as a ruled list — not five identical icon tiles. */}
      <section style={{ marginTop: "var(--space-2xl)" }}>
        <h2 className="display" style={{ fontSize: "var(--text-xl)", borderBottom: "var(--rule-thick) solid var(--color-ink)", paddingBottom: "var(--space-xs)" }}>
          Cómo estudiarla
        </h2>
        {MODES.map((m, i) => (
          <Link key={m.href} href={`/sets/${set.id}/${m.href}`} className="row" style={{ textDecoration: "none", color: "inherit" }}>
            <span className="data shrink-0" style={{ color: "var(--color-muted)", fontSize: "var(--text-xs)", width: "2ch" }}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="display flex-1" style={{ fontSize: "var(--text-lg)" }}>{m.name}</span>
            <span className="muted hidden sm:block" style={{ fontSize: "var(--text-sm)" }}>{m.desc}</span>
            <span className="tag shrink-0" aria-hidden="true">→</span>
          </Link>
        ))}
      </section>

      {/* The inventory itself, as a ruled table. */}
      <section style={{ marginTop: "var(--space-2xl)" }}>
        <div
          className="flex flex-wrap items-baseline gap-x-3 gap-y-1"
          style={{ borderBottom: "var(--rule-thick) solid var(--color-ink)", paddingBottom: "var(--space-xs)" }}
        >
          <h2 className="display" style={{ fontSize: "var(--text-xl)" }}>Términos</h2>
          {starCount > 0 && (
            <button className="label ml-auto" onClick={() => setStarredOnly(!starredOnly)}
              style={{ color: "var(--color-accent)", cursor: "pointer" }}>
              {starredOnly ? "Show all" : `Marked only (${starCount})`}
            </button>
          )}
        </div>

        <table className="sheet" style={{ marginTop: "var(--space-xs)" }}>
          <thead>
            <tr>
              <th style={{ width: "3ch" }}>#</th>
              <th style={{ width: "2ch" }}><span className="sr-only">Marked</span></th>
              <th>Español</th>
              <th>Inglés</th>
              <th style={{ width: "6ch", textAlign: "right" }}>Nivel</th>
              <th style={{ width: "3ch" }}><span className="sr-only">Audio</span></th>
            </tr>
          </thead>
          <tbody>
            {cards.map((c, i) => {
              const p = progressFor(set, c.id, "es-en");
              const mastered = p.box >= MASTERED_BOX;
              const seen = p.correct + p.wrong > 0;
              return (
                <tr key={c.id}>
                  <td className="data" style={{ color: "var(--color-muted)", fontSize: "var(--text-xs)" }}>
                    {String(i + 1).padStart(2, "0")}
                  </td>
                  <td>
                    <button onClick={() => toggleStar(c.id)}
                      aria-label={c.starred ? `Unmark ${c.term}` : `Mark ${c.term}`}
                      aria-pressed={!!c.starred}
                      style={{
                        cursor: "pointer", lineHeight: 1, fontSize: "var(--text-sm)",
                        color: c.starred ? "var(--color-accent)" : "var(--color-rule-2)",
                      }}>
                      {c.starred ? "●" : "○"}
                    </button>
                  </td>
                  <td style={{ fontWeight: 500 }}>{c.term}</td>
                  <td className="muted">{c.def}</td>
                  <td className="data tnum" style={{ textAlign: "right", fontSize: "var(--text-xs)", color: mastered ? "var(--color-good)" : "var(--color-muted)" }}>
                    {mastered ? "✓" : seen ? `${p.correct}/${p.correct + p.wrong}` : "—"}
                  </td>
                  <td><SpeakButton text={c.term} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
