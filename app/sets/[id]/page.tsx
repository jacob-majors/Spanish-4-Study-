"use client";

import Link from "next/link";
import { useState } from "react";
import { useSet } from "@/lib/useSet";
import { statsFor, progressFor, MASTERED_BOX } from "@/lib/srs";
import { upsertSet } from "@/lib/storage";
import { Ring, ProgressBar, SpeakButton } from "@/components/ui";
import { NotFound } from "@/components/SetHeader";

const MODES = [
  { href: "flashcards", name: "Flashcards", desc: "Flip through with audio", icon: "▢" },
  { href: "learn", name: "Learn", desc: "Spaced repetition that adapts", icon: "◈" },
  { href: "write", name: "Write", desc: "Type it out, accents and all", icon: "✎" },
  { href: "match", name: "Match", desc: "Beat your best time", icon: "⧉" },
  { href: "test", name: "Practice test", desc: "Graded, mixed question types", icon: "✓" },
];

export default function SetPage() {
  const { set, ready } = useSet();
  const [showStarredOnly, setShowStarredOnly] = useState(false);

  if (!set) return ready ? <NotFound /> : null;
  const st = statsFor(set);
  const cards = showStarredOnly ? set.cards.filter((c) => c.starred) : set.cards;
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
    <div className="space-y-6">
      <div className="card-shell p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: set.color }} />
        <div className="flex flex-wrap items-start gap-5">
          <div className="flex-1 min-w-60">
            <h1 className="text-2xl font-bold">{set.title}</h1>
            {set.description && <p className="muted text-sm mt-1">{set.description}</p>}
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="chip">{st.total} terms</span>
              <span className="chip" style={{ color: "var(--good)" }}>{st.mastered} mastered</span>
              <span className="chip">{st.learning} learning</span>
              {st.dueNow > 0 && <span className="chip" style={{ color: "var(--warn)" }}>{st.dueNow} due for review</span>}
              {st.accuracy > 0 && <span className="chip">{st.accuracy}% accuracy</span>}
            </div>
          </div>
          <Ring value={st.percent} size={84} label="mastered" />
        </div>
        <div className="mt-4"><ProgressBar value={st.percent} tone={st.percent >= 80 ? "good" : "accent"} /></div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {MODES.map((m) => (
          <Link key={m.href} href={`/sets/${set.id}/${m.href}`}
            className="card-shell p-4 hover:-translate-y-0.5 transition-transform">
            <div className="text-xl" style={{ color: set.color }}>{m.icon}</div>
            <div className="font-semibold mt-1.5">{m.name}</div>
            <div className="text-xs muted mt-0.5">{m.desc}</div>
          </Link>
        ))}
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <h2 className="text-lg font-bold">Terms</h2>
          {starCount > 0 && (
            <button className="btn btn-ghost !py-1 !px-3 text-xs" onClick={() => setShowStarredOnly(!showStarredOnly)}>
              {showStarredOnly ? "Show all" : `Starred only (${starCount})`}
            </button>
          )}
          <Link href={`/sets/${set.id}/edit`} className="btn btn-outline !py-1 !px-3 text-xs ml-auto">Edit set</Link>
        </div>
        <div className="space-y-1.5">
          {cards.map((c) => {
            const p = progressFor(set, c.id, "es-en");
            const mastered = p.box >= MASTERED_BOX;
            return (
              <div key={c.id} className="card-shell px-4 py-3 flex items-center gap-3">
                <button onClick={() => toggleStar(c.id)} aria-label="Star term"
                  className="text-lg leading-none shrink-0"
                  style={{ color: c.starred ? "var(--warn)" : "var(--muted)", opacity: c.starred ? 1 : 0.45 }}>
                  ★
                </button>
                <div className="flex-1 grid sm:grid-cols-2 gap-1 sm:gap-4 min-w-0">
                  <div className="font-medium">{c.term}</div>
                  <div className="muted text-sm">{c.def}</div>
                </div>
                {mastered && <span className="chip shrink-0" style={{ color: "var(--good)" }}>mastered</span>}
                {!mastered && p.correct + p.wrong > 0 && (
                  <span className="chip shrink-0">{p.correct}/{p.correct + p.wrong}</span>
                )}
                <SpeakButton text={c.term} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
