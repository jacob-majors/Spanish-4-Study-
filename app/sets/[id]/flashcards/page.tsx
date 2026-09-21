"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSet } from "@/lib/useSet";
import { shuffle } from "@/lib/srs";
import { upsertSet, touchStreak } from "@/lib/storage";
import { speak } from "@/lib/tts";
import { SetHeader, NotFound } from "@/components/SetHeader";
import { ProgressBar, SpeakButton, Toggle } from "@/components/ui";
import { Card } from "@/lib/types";

export default function FlashcardsPage() {
  const { set, ready } = useSet();
  const [order, setOrder] = useState<Card[]>([]);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [spanishFirst, setSpanishFirst] = useState(true);
  const [autoAudio, setAutoAudio] = useState(false);
  const [starredOnly, setStarredOnly] = useState(false);

  const pool = set ? (starredOnly ? set.cards.filter((c) => c.starred) : set.cards) : [];

  useEffect(() => {
    setOrder(pool);
    setI(0);
    setFlipped(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set?.id, starredOnly, set?.cards.length]);

  useEffect(() => { touchStreak(); }, []);

  const card = order[i];

  const go = useCallback((d: number) => {
    setFlipped(false);
    setI((n) => Math.min(order.length - 1, Math.max(0, n + d)));
  }, [order.length]);

  useEffect(() => {
    if (autoAudio && card) speak(card.term);
  }, [i, autoAudio, card]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); setFlipped((f) => !f); }
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key.toLowerCase() === "s" && card) speak(card.term);
      else if (e.key.toLowerCase() === "f" && card && set) {
        const next = structuredClone(set);
        const c = next.cards.find((x) => x.id === card.id);
        if (c) c.starred = !c.starred;
        upsertSet(next);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, card, set]);

  if (!set) return ready ? <NotFound /> : null;

  if (!order.length) {
    return (
      <div>
        <SetHeader set={set} mode="Flashcards" />
        <div style={{ borderTop: "var(--rule-thick) solid var(--color-ink)", paddingTop: "var(--space-md)" }}>
          <p className="muted">{starredOnly ? "You have not marked any terms yet." : "This set has no terms."}</p>
          {starredOnly && <button className="btn btn-primary" style={{ marginTop: "var(--space-md)" }} onClick={() => setStarredOnly(false)}>Show all terms</button>}
        </div>
      </div>
    );
  }

  const front = spanishFirst ? card.term : card.def;
  const back = spanishFirst ? card.def : card.term;
  const done = i === order.length - 1;

  return (
    <div style={{ maxWidth: "44rem" }}>
      <SetHeader set={set} mode="Flashcards" />

      <div className="flex items-center gap-4" style={{ marginBottom: "var(--space-lg)" }}>
        <span className="data tnum tag">{i + 1}/{order.length}</span>
        <span className="flex-1"><ProgressBar value={((i + 1) / order.length) * 100} /></span>
        <button className="link label" onClick={() => { setOrder(shuffle(order)); setI(0); setFlipped(false); }}>
          Shuffle
        </button>
      </div>

      <div className="flip-scene cursor-pointer select-none"
        style={{ height: "min(58vh, 24rem)" }}
        onClick={() => setFlipped(!flipped)}>
        <div className={`flip-inner ${flipped ? "flipped" : ""}`}>
          <div className="flip-face"
            style={{ border: "var(--rule-hair) solid var(--color-rule-2)", background: "var(--color-paper)", padding: "var(--space-lg)" }}>
            <div className="text-center">
              <p className="label">{spanishFirst ? "Español" : "Inglés"}</p>
              <p className="display" style={{ fontSize: "var(--text-2xl)", marginTop: "var(--space-sm)", overflowWrap: "anywhere" }}>{front}</p>
              <p className="tag" style={{ marginTop: "var(--space-xl)" }}>Click or press Space to turn</p>
            </div>
          </div>
          <div className="flip-face flip-back"
            style={{ border: "var(--rule-hair) solid var(--color-accent)", background: "var(--color-paper-2)", padding: "var(--space-lg)" }}>
            <div className="text-center">
              <p className="label">{spanishFirst ? "Inglés" : "Español"}</p>
              <p className="display" style={{ fontSize: "var(--text-2xl)", marginTop: "var(--space-sm)", overflowWrap: "anywhere" }}>{back}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3" style={{ marginTop: "var(--space-lg)" }}>
        <button className="btn btn-outline" onClick={() => go(-1)} disabled={i === 0}>← Back</button>
        <SpeakButton text={card.term} />
        <button
          className="btn btn-quiet data"
          aria-label={card.starred ? "Unmark term" : "Mark term"}
          aria-pressed={!!card.starred}
          style={{ color: card.starred ? "var(--color-accent)" : "var(--color-muted)" }}
          onClick={() => {
            const next = structuredClone(set);
            const c = next.cards.find((x) => x.id === card.id);
            if (c) c.starred = !c.starred;
            upsertSet(next);
          }}
        >{card.starred ? "●" : "○"}</button>
        <button className="btn btn-primary" onClick={() => go(1)} disabled={done}>Next →</button>
      </div>

      {done && (
        <div className="text-center" style={{ marginTop: "var(--space-xl)", borderTop: "var(--rule-hair) solid var(--color-rule)", paddingTop: "var(--space-md)" }}>
          <p className="muted">That is the whole stack.</p>
          <div className="flex flex-wrap gap-3 justify-center" style={{ marginTop: "var(--space-md)" }}>
            <button className="btn btn-outline" onClick={() => { setOrder(shuffle(order)); setI(0); setFlipped(false); }}>Shuffle and repeat</button>
            <Link href={`/sets/${set.id}/learn`} className="btn btn-primary">Move on to Learn</Link>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-x-6 gap-y-2 items-center"
        style={{ marginTop: "var(--space-2xl)", borderTop: "var(--rule-hair) solid var(--color-rule)", paddingTop: "var(--space-md)" }}>
        <Toggle checked={spanishFirst} onChange={setSpanishFirst} label="Spanish first" />
        <Toggle checked={autoAudio} onChange={setAutoAudio} label="Read aloud" />
        <Toggle checked={starredOnly} onChange={setStarredOnly} label="Marked only" />
        <span className="tag ml-auto">space turn · ←/→ move · s speak · f mark</span>
      </div>
    </div>
  );
}
