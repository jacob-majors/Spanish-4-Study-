"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSet } from "@/lib/useSet";
import { sample, shuffle } from "@/lib/srs";
import { touchStreak } from "@/lib/storage";
import { useLocalState, Choice } from "@/components/ui";
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
    return <div><SetHeader set={set} mode="Emparejar" /><p className="muted">Add at least 3 terms to play Match.</p></div>;

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
    <div>
      <SetHeader set={set} mode="Emparejar" />

      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2"
        style={{ borderBottom: "var(--rule-hair) solid var(--color-rule)", paddingBottom: "var(--space-xs)" }}>
        <span className="data tnum" style={{ fontSize: "var(--text-xl)", color: won ? "var(--color-good)" : "var(--color-ink)" }}>{secs(ms)}</span>
        <span className="tag">{cleared.size}/{total} pairs</span>
        {misses > 0 && <span className="tag" style={{ color: "var(--color-accent)" }}>{misses} miss{misses === 1 ? "" : "es"}</span>}
        {best !== null && <span className="tag">best {secs(best)}</span>}
        <div className="ml-auto flex flex-wrap gap-2">
          {SIZES.map((n) => (
            <Choice key={n} on={size === n} disabled={n > set.cards.length} onClick={() => setSize(n)}>
              {n}
            </Choice>
          ))}
          <button className="link label self-center" onClick={() => deal()}>Restart</button>
        </div>
      </div>

      {won ? (
        <div style={{ marginTop: "var(--space-2xl)", borderTop: "var(--rule-thick) solid var(--color-ink)", paddingTop: "var(--space-md)" }}>
          <div className="data tnum" style={{ fontSize: "var(--text-display)", lineHeight: 1, color: "var(--color-good)" }}>{secs(ms)}</div>
          <p className="muted" style={{ marginTop: "var(--space-xs)" }}>
            All {total} pairs matched{misses ? ` with ${misses} miss${misses === 1 ? "" : "es"}` : " with a clean sweep"}.
          </p>
          {best !== null && ms + misses * 1000 <= best && (
            <p className="label" style={{ marginTop: "var(--space-xs)", color: "var(--color-accent)" }}>New personal best.</p>
          )}
          <div className="flex flex-wrap gap-3" style={{ marginTop: "var(--space-lg)" }}>
            <button className="btn btn-primary" onClick={() => deal()}>Play again</button>
            <Link href={`/sets/${set.id}/test`} className="btn btn-outline">Practice test</Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-px" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 11rem), 1fr))", background: "var(--color-rule)", marginTop: "var(--space-lg)", border: "var(--rule-hair) solid var(--color-rule)" }}>
          {tiles.map((t) => {
            const isCleared = cleared.has(t.cardId);
            const isSelected = selected?.id === t.id;
            const isWrong = wrongPair.includes(t.id);
            return (
              <button
                key={t.id}
                onClick={() => pick(t)}
                disabled={isCleared}
                aria-pressed={isSelected}
                className="grid place-items-center text-center"
                style={{
                  minHeight: "5.5rem",
                  padding: "var(--space-sm)",
                  fontSize: "var(--text-sm)",
                  visibility: isCleared ? "hidden" : "visible",
                  background: isSelected ? "var(--color-ink)" : isWrong ? "var(--color-paper-3)" : "var(--color-paper)",
                  color: isSelected ? "var(--color-paper)" : isWrong ? "var(--color-accent)" : "var(--color-ink)",
                  transition: "background var(--dur-micro) var(--ease-out), color var(--dur-micro) var(--ease-out)",
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
