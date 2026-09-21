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
        <div className="card-shell p-10 text-center">
          <p className="muted">{starredOnly ? "You have not starred any terms yet." : "This set has no terms."}</p>
          {starredOnly && <button className="btn btn-primary mt-4" onClick={() => setStarredOnly(false)}>Show all terms</button>}
        </div>
      </div>
    );
  }

  const front = spanishFirst ? card.term : card.def;
  const back = spanishFirst ? card.def : card.term;
  const done = i === order.length - 1;

  return (
    <div className="max-w-3xl mx-auto">
      <SetHeader set={set} mode="Flashcards" />

      <div className="flex items-center gap-3 text-sm mb-3">
        <span className="muted">{i + 1} / {order.length}</span>
        <div className="flex-1"><ProgressBar value={((i + 1) / order.length) * 100} /></div>
        <button className="btn btn-ghost !py-1 !px-2.5 text-xs" onClick={() => { setOrder(shuffle(order)); setI(0); setFlipped(false); }}>
          Shuffle
        </button>
      </div>

      <div className="flip-scene h-72 md:h-96 cursor-pointer select-none" onClick={() => setFlipped(!flipped)}>
        <div className={`flip-inner ${flipped ? "flipped" : ""}`}>
          <div className="flip-face card-shell p-8">
            <div className="text-center">
              <div className="text-xs muted uppercase tracking-wider mb-3">{spanishFirst ? "Spanish" : "English"}</div>
              <div className="text-3xl md:text-4xl font-bold">{front}</div>
              <div className="text-xs muted mt-6">Click or press Space to flip</div>
            </div>
          </div>
          <div className="flip-face flip-back card-shell p-8" style={{ borderColor: set.color }}>
            <div className="text-center">
              <div className="text-xs muted uppercase tracking-wider mb-3">{spanishFirst ? "English" : "Spanish"}</div>
              <div className="text-3xl md:text-4xl font-bold">{back}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 mt-4">
        <button className="btn btn-ghost" onClick={() => go(-1)} disabled={i === 0}>← Back</button>
        <SpeakButton text={card.term} />
        <button
          className="btn btn-ghost !p-2 !rounded-lg"
          aria-label="Star term"
          style={{ color: card.starred ? "var(--warn)" : "var(--muted)" }}
          onClick={() => {
            const next = structuredClone(set);
            const c = next.cards.find((x) => x.id === card.id);
            if (c) c.starred = !c.starred;
            upsertSet(next);
          }}
        >★</button>
        <button className="btn btn-primary" onClick={() => go(1)} disabled={done}>Next →</button>
      </div>

      {done && (
        <div className="card-shell p-5 mt-4 text-center">
          <p className="font-semibold">That is the whole stack.</p>
          <div className="flex flex-wrap gap-2 justify-center mt-3">
            <button className="btn btn-ghost" onClick={() => { setOrder(shuffle(order)); setI(0); setFlipped(false); }}>Shuffle and repeat</button>
            <Link href={`/sets/${set.id}/learn`} className="btn btn-primary">Move on to Learn</Link>
          </div>
        </div>
      )}

      <div className="card-shell p-4 mt-4 flex flex-wrap gap-5">
        <Toggle checked={spanishFirst} onChange={setSpanishFirst} label="Spanish side first" />
        <Toggle checked={autoAudio} onChange={setAutoAudio} label="Read each card aloud" />
        <Toggle checked={starredOnly} onChange={setStarredOnly} label="Starred terms only" />
        <span className="text-xs muted ml-auto self-center">Space flip · ←/→ move · S speak · F star</span>
      </div>
    </div>
  );
}
