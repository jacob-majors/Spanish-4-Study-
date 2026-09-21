import { ExamPlan } from "./curriculumTypes";
import { StudySet, TestQuestion, Direction, Card } from "./types";
import { shuffle, sample } from "./srs";
import { uid } from "./storage";
import { conjugate } from "./conjugation/engine";
import { VERB_LIST, VERB_MAP } from "./conjugation/verbs";
import { TENSE_BY_KEY, PERSON_LABELS, VerbEntry } from "./conjugation/types";

/** Persons worth drilling — vosotros is excluded unless a packet asks for it. */
const DRILL_PERSONS = [0, 1, 2, 3, 5];

function answerOf(c: Card, dir: Direction) {
  return dir === "es-en" ? c.def : c.term;
}
function promptOf(c: Card, dir: Direction) {
  return dir === "es-en" ? c.term : c.def;
}

function distractors(pool: Card[], card: Card, dir: Direction, n: number): string[] {
  const correct = answerOf(card, dir);
  const others = pool.filter((c) => c.id !== card.id && answerOf(c, dir) !== correct);
  const picked = sample(others, n).map((c) => answerOf(c, dir));
  while (picked.length < n) picked.push("—");
  return picked;
}

function verbsForExam(exam: ExamPlan): VerbEntry[] {
  const named = exam.verbs.map((v) => VERB_MAP[v]).filter(Boolean);
  if (named.length) return named;
  return VERB_LIST.filter((v) => v.tags?.includes("top"));
}

function conjugationQuestions(exam: ExamPlan, count: number): TestQuestion[] {
  if (!count || !exam.tenses.length) return [];
  const verbs = verbsForExam(exam);
  if (!verbs.length) return [];

  const out: TestQuestion[] = [];
  const used = new Set<string>();
  let guard = 0;
  while (out.length < count && guard++ < count * 40) {
    const verb = verbs[Math.floor(Math.random() * verbs.length)];
    const tense = exam.tenses[Math.floor(Math.random() * exam.tenses.length)];
    const meta = TENSE_BY_KEY[tense];
    const person = meta.single ? 0 : DRILL_PERSONS[Math.floor(Math.random() * DRILL_PERSONS.length)];
    const answer = conjugate(verb, tense)[person];
    if (!answer || answer === "—") continue;

    const key = `${verb.infinitive}|${tense}|${person}`;
    if (used.has(key)) continue;
    used.add(key);

    out.push({
      id: uid(),
      kind: "conj",
      prompt: verb.infinitive,
      subPrompt: meta.single ? meta.name : `${meta.name} · ${PERSON_LABELS[person]}`,
      answer,
      strict: true,
      note: verb.english,
    });
  }
  return out;
}

/**
 * Build a mock exam that mirrors the real one: the vocabulary comes from the
 * sets the packet covers, the conjugation items come from the tenses and verbs
 * it names, and the mix of question types follows exam.sections.
 */
export function buildMockExam(exam: ExamPlan, sets: StudySet[]): TestQuestion[] {
  const pool: Card[] = sets.flatMap((s) => s.cards);
  const questions: TestQuestion[] = [];

  for (const section of exam.sections) {
    const n = section.count;
    if (n <= 0) continue;

    if (section.kind === "conj") {
      questions.push(...conjugationQuestions(exam, n));
      continue;
    }
    if (!pool.length) continue;

    if (section.kind === "match") {
      const groups = Math.max(1, Math.ceil(n / 4));
      for (let g = 0; g < groups; g++) {
        const group = sample(pool, Math.min(4, pool.length));
        if (group.length < 2) break;
        questions.push({
          id: uid(),
          kind: "match",
          prompt: "Match each Spanish term to its meaning",
          answer: "",
          pairs: group.map((c) => ({ left: c.term, right: c.def })),
          note: "Matching",
        });
      }
      continue;
    }

    const cards = sample(pool, Math.min(n, pool.length));
    // Top up by repeating cards when the section asks for more than the pool holds.
    while (cards.length < n && pool.length) cards.push(pool[cards.length % pool.length]);

    cards.slice(0, n).forEach((card, i) => {
      const dir: Direction = i % 2 === 0 ? "es-en" : "en-es";
      const prompt = promptOf(card, dir);
      const answer = answerOf(card, dir);

      if (section.kind === "mc") {
        questions.push({
          id: uid(), kind: "mc", prompt, answer, cardId: card.id,
          choices: shuffle([answer, ...distractors(pool, card, dir, 3)]),
          note: dir === "es-en" ? "Choose the English meaning" : "Choose the Spanish term",
        });
      } else if (section.kind === "write") {
        questions.push({
          id: uid(), kind: "write", prompt, answer, cardId: card.id,
          note: dir === "es-en" ? "Type the English meaning" : "Type the Spanish term",
        });
      } else if (section.kind === "tf") {
        const lie = Math.random() < 0.5;
        questions.push({
          id: uid(), kind: "tf", prompt,
          answer: lie ? "false" : "true",
          shown: lie ? distractors(pool, card, dir, 1)[0] : answer,
          cardId: card.id, note: "Is this pairing correct?",
        });
      }
    });
  }

  return questions;
}

/** Default section mix when a packet does not describe the format. */
export function defaultSections(hasVocab: boolean, hasConj: boolean) {
  const sections = [];
  if (hasVocab) {
    sections.push({ kind: "mc" as const, count: 10, label: "Vocabulary, multiple choice" });
    sections.push({ kind: "write" as const, count: 6, label: "Vocabulary, written" });
    sections.push({ kind: "match" as const, count: 8, label: "Matching" });
  }
  if (hasConj) sections.push({ kind: "conj" as const, count: 12, label: "Verb conjugation" });
  return sections;
}
