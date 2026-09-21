import { CardProgress, StudySet, Direction, Card } from "./types";

/** Leitner intervals, in days, for boxes 0-5. */
const INTERVALS = [0, 0.007, 1, 3, 7, 21];
export const MASTERED_BOX = 5;

export function blankProgress(): CardProgress {
  return { box: 0, due: 0, correct: 0, wrong: 0, lastSeen: 0, streak: 0 };
}

export function keyOf(cardId: string, dir: Direction) {
  return `${cardId}:${dir}`;
}

export function progressFor(set: StudySet, cardId: string, dir: Direction): CardProgress {
  return set.progress[keyOf(cardId, dir)] ?? blankProgress();
}

export function applyAnswer(p: CardProgress, correct: boolean): CardProgress {
  const next = { ...p };
  next.lastSeen = Date.now();
  if (correct) {
    next.correct++;
    next.streak++;
    next.box = Math.min(MASTERED_BOX, p.box + 1);
  } else {
    next.wrong++;
    next.streak = 0;
    // A miss drops you back, but never all the way to zero once you've built a base.
    next.box = Math.max(0, p.box - 2);
  }
  next.due = Date.now() + INTERVALS[next.box] * 86_400_000;
  return next;
}

export interface SetStats {
  total: number;
  mastered: number;
  learning: number;
  notStarted: number;
  dueNow: number;
  accuracy: number;
  percent: number;
}

export function statsFor(set: StudySet, dir: Direction = "es-en"): SetStats {
  const now = Date.now();
  let mastered = 0, learning = 0, notStarted = 0, dueNow = 0, correct = 0, attempts = 0;
  for (const c of set.cards) {
    const p = progressFor(set, c.id, dir);
    correct += p.correct;
    attempts += p.correct + p.wrong;
    if (p.box >= MASTERED_BOX) mastered++;
    else if (p.box === 0 && p.correct + p.wrong === 0) notStarted++;
    else learning++;
    if (p.box < MASTERED_BOX && p.due <= now) dueNow++;
  }
  const total = set.cards.length;
  return {
    total,
    mastered,
    learning,
    notStarted,
    dueNow,
    accuracy: attempts ? Math.round((correct / attempts) * 100) : 0,
    percent: total ? Math.round((mastered / total) * 100) : 0,
  };
}

/**
 * Order cards for a Learn session: overdue first, then weakest, then new.
 * Cards you keep missing come back sooner than cards you have never seen.
 */
export function studyQueue(set: StudySet, dir: Direction, limit = 20): Card[] {
  const now = Date.now();
  const scored = set.cards.map((c) => {
    const p = progressFor(set, c.id, dir);
    const overdue = Math.max(0, now - p.due);
    let score = 0;
    if (p.box >= MASTERED_BOX && p.due > now) score = -1000; // parked
    else if (p.correct + p.wrong === 0) score = 50; // new
    else score = 100 - p.box * 15 + Math.min(50, overdue / 3_600_000) + p.wrong * 10;
    return { card: c, score };
  });
  return scored
    .filter((s) => s.score > -1000)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.card);
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sample<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}
