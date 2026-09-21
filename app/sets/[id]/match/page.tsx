"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSet } from "@/lib/useSet";
import { sample, shuffle } from "@/lib/srs";
import { touchStreak } from "@/lib/storage";
import { useLocalState } from "@/components/ui";
import { SetHeader, NotFound } from "@/components/SetHeader";

interface Tile { id: string; cardId: string; text: string; side: "term" | "def" }

const SIZES = [6, 8, 12];

export default function MatchPage() {
  const { set, ready } = useSet();
  const [size, setSize] = useState(6);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [selected, setSelected] = useState<Tile | null>(null);
  const [cleared, setCleared] = useState<Set<string>>(new Set());
  const [wrongPair, setWrongPair] = useState<string[]>([]);
  const [ms, setMs] = useState(0);
  const [running, setRunning] = useState(false);
  const [best, setBest] = useLocalState<number | null>(`verbo.match.best`, null);
  const [misses, setMisses] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  function deal(n = size) {
    if (!set) return;
    const picked = sample(set.cards, Math.min(n, set.cards.length));
    const next: Tile[] = [];
    picked.forEach((c) => {
      next.push({ id: c.id + ":t", cardId: c.id, text: c.term, side: "term" });
      next.push({ id: c.id + ":d", cardId: c.id, text: c.def, side: "def" });
    });
    setTiles(shuffle(next));
    setCleared(new Set());
    setSelected(null);
    setMisses(0);
    setMs(0);
    setRunning(true);
  }

  useEffect(() => { if (set) deal(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [set?.id, size]);
  useEffect(() => { touchStreak(); }, []);

  useEffect(() => {
    if (!running) return;
    timer.current = setInterval(() => setMs((v) => v + 100), 100);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [running]);

  const total = tiles.length / 2;
  const won = total > 0 && cleared.size === total;

  useEffect(() => {
    if (!won) return;
    setRunning(false);
    const score = ms + misses * 1000; // a miss costs a second
    if (best === null || score < best) setBest(score);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [won]);

  if (!set) return ready ? <NotFound /> : null;
  if (set.cards.length < 3)
    return <div><SetHeader set={set} mode="Match" /><div className="card-shell p-10 text-center muted">Add at least 3 terms to play Match.</div></div>;

  function pick(t: Tile) {
    if (cleared.has(t.cardId) || wrongPair.length) return;
    if (!selected) { setSelected(t); return; }
    if (selected.id === t.id) { setSelected(null); return; }
    if (selected.cardId === t.cardId && selected.side !== t.side) {
      setCleared((c) => new Set([...c, t.cardId]));
      setSelected(null);
    } else {
      setMisses((m) => m + 1);
      setWrongPair([selected.id, t.id]);
      setTimeout(() => { setWrongPair([]); setSelected(null); }, 420);
    }
  }

  const secs = (n: number) => (n / 1000).toFixed(1) + "s";

  return (
    <div className="max-w-4xl mx-auto">
      <SetHeader set={set} mode="Match" />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="text-2xl font-bold tabular-nums" style={{ color: won ? "var(--good)" : undefined }}>{secs(ms)}</div>
        <span className="chip">{cleared.size} / {total} pairs</span>
        {misses > 0 && <span className="chip" style={{ color: "var(--bad)" }}>{misses} miss{misses === 1 ? "" : "es"}</span>}
        {best !== null && <span className="chip">best {secs(best)}</span>}
        <div className="ml-auto flex gap-1.5">
          {SIZES.map((n) => (
            <button key={n} onClick={() => setSize(n)} disabled={n > set.cards.length}
              className="btn btn-ghost !py-1 !px-2.5 text-xs"
              style={size === n ? { background: "var(--accent)", color: "#fff" } : undefined}>
              {n} pairs
            </button>
          ))}
          <button className="btn btn-outline !py-1 !px-2.5 text-xs" onClick={() => deal()}>Restart</button>
        </div>
      </div>

      {won ? (
        <div className="card-shell p-8 text-center">
          <div className="text-4xl font-extrabold" style={{ color: "var(--good)" }}>{secs(ms)}</div>
          <p className="muted mt-1">
            All {total} pairs matched{misses ? ` with ${misses} miss${misses === 1 ? "" : "es"}` : " with a clean sweep"}.
          </p>
          {best !== null && ms + misses * 1000 <= best && <p className="mt-2 font-semibold" style={{ color: "var(--warn)" }}>New personal best.</p>}
          <div className="flex flex-wrap gap-2 justify-center mt-5">
            <button className="btn btn-primary" onClick={() => deal()}>Play again</button>
            <Link href={`/sets/${set.id}/test`} className="btn btn-outline">Practice test</Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {tiles.map((t) => {
            const isCleared = cleared.has(t.cardId);
            const isSelected = selected?.id === t.id;
            const isWrong = wrongPair.includes(t.id);
            return (
              <button
                key={t.id}
                onClick={() => pick(t)}
                disabled={isCleared}
                className={`card-shell p-3 min-h-20 text-sm font-medium grid place-items-center text-center transition-all ${isWrong ? "shake" : ""}`}
                style={{
                  opacity: isCleared ? 0 : 1,
                  pointerEvents: isCleared ? "none" : "auto",
                  borderColor: isWrong ? "var(--bad)" : isSelected ? "var(--accent)" : "var(--border)",
                  background: isSelected ? "color-mix(in srgb, var(--accent) 18%, var(--surface))" : "var(--surface)",
                  transform: isSelected ? "scale(0.97)" : undefined,
                }}
              >
                {t.text}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
