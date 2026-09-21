import { Card, StudySet, Direction, TestQuestion } from "./types";
import { shuffle, sample, progressFor } from "./srs";
import { uid } from "./storage";

export interface TestConfig {
  count: number;
  direction: Direction | "both";
  kinds: { mc: boolean; write: boolean; tf: boolean; match: boolean; cloze: boolean };
  /** Weight the test toward the cards you keep getting wrong. */
  focusWeak: boolean;
  starredOnly: boolean;
  instantFeedback: boolean;
}

export const DEFAULT_CONFIG: TestConfig = {
  count: 20,
  direction: "both",
  kinds: { mc: true, write: true, tf: true, match: true, cloze: true },
  focusWeak: true,
  starredOnly: false,
  instantFeedback: false,
};

function faceOf(card: Card, dir: Direction) {
  return dir === "es-en"
    ? { prompt: card.term, answer: card.def }
    : { prompt: card.def, answer: card.term };
}

function distractors(pool: Card[], card: Card, dir: Direction, n: number): string[] {
  const answerOf = (c: Card) => (dir === "es-en" ? c.def : c.term);
  const correct = answerOf(card);
  const others = pool.filter((c) => c.id !== card.id && answerOf(c) !== correct);
  const picked = sample(others, n).map(answerOf);
  // Pad with placeholders only if the set is tiny.
  while (picked.length < n) picked.push(["—", "no answer", "none of these"][picked.length] ?? "—");
  return picked;
}

export function buildTest(set: StudySet, cfg: TestConfig): TestQuestion[] {
  let pool = set.cards;
  if (cfg.starredOnly) {
    const starred = pool.filter((c) => c.starred);
    if (starred.length >= 2) pool = starred;
  }
  if (!pool.length) return [];

  const kinds = (Object.keys(cfg.kinds) as (keyof TestConfig["kinds"])[]).filter((k) => cfg.kinds[k]);
  if (!kinds.length) kinds.push("mc");

  // Pick which cards get asked.
  let ordered: Card[];
  if (cfg.focusWeak) {
    const scored = pool.map((c) => {
      const a = progressFor(set, c.id, "es-en");
      const b = progressFor(set, c.id, "en-es");
      const weakness = a.wrong + b.wrong + 1;
      const known = (a.box + b.box) / 2;
      return { c, score: weakness * 10 - known * 3 + Math.random() * 8 };
    });
    ordered = scored.sort((x, y) => y.score - x.score).map((s) => s.c);
  } else {
    ordered = shuffle(pool);
  }

  // Fill-in-the-blank can only use cards that carry a sentence.
  const clozePool = pool.filter((c) => c.cloze);
  const wantCloze = cfg.kinds.cloze && clozePool.length >= 4;

  const wantMatch = cfg.kinds.match && pool.length >= 8;
  const matchGroups = wantMatch ? Math.max(1, Math.floor(cfg.count / 10)) : 0;
  const matchCards = matchGroups * 4;
  const singleCount = Math.max(0, Math.min(cfg.count - matchGroups, ordered.length * 2));

  const questions: TestQuestion[] = [];
  const singleKinds = kinds.filter((k) => k !== "match" && k !== "cloze");
  if (!singleKinds.length && !wantCloze) singleKinds.push("mc");

  // Give fill-in-the-blank up to a third of the paper when it is switched on.
  const clozeCount = wantCloze
    ? Math.min(clozePool.length, Math.max(1, Math.round(cfg.count / 3)))
    : 0;
  if (clozeCount) {
    for (const card of sample(clozePool, clozeCount)) {
      questions.push({
        id: uid(), kind: "cloze", prompt: card.def, sentence: card.cloze,
        answer: card.term, cardId: card.id, note: "Completa la frase",
      });
    }
  }

  for (let i = 0; i < Math.max(0, singleCount - clozeCount) && singleKinds.length; i++) {
    const card = ordered[i % ordered.length];
    const dir: Direction =
      cfg.direction === "both" ? (i % 2 === 0 ? "es-en" : "en-es") : cfg.direction;
    const kind = singleKinds[i % singleKinds.length];
    const { prompt, answer } = faceOf(card, dir);

    if (kind === "mc") {
      const choices = shuffle([answer, ...distractors(pool, card, dir, 3)]);
      questions.push({ id: uid(), kind: "mc", prompt, answer, choices, cardId: card.id,
        note: dir === "es-en" ? "Choose the English meaning" : "Choose the Spanish term" });
    } else if (kind === "write") {
      questions.push({ id: uid(), kind: "write", prompt, answer, cardId: card.id,
        note: dir === "es-en" ? "Type the English meaning" : "Type the Spanish term" });
    } else if (kind === "tf") {
      const lie = Math.random() < 0.5;
      const shown = lie ? distractors(pool, card, dir, 1)[0] : answer;
      questions.push({ id: uid(), kind: "tf", prompt, answer: lie ? "false" : "true",
        shown, cardId: card.id, note: "Is this pairing correct?" });
    }
  }

  for (let g = 0; g < matchGroups; g++) {
    const group = sample(pool, Math.min(4, pool.length));
    if (group.length < 2) break;
    questions.push({
      id: uid(),
      kind: "match",
      prompt: "Match each Spanish term to its meaning",
      answer: "",
      pairs: group.map((c) => ({ left: c.term, right: c.def })),
      note: "Drag-free matching — tap a term, then tap its meaning",
    });
  }

  return shuffle(questions).slice(0, cfg.count);
}
