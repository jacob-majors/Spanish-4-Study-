export interface Card {
  id: string;
  term: string; // Spanish
  def: string; // English
  hint?: string;
  starred?: boolean;
}

/** Leitner-style scheduling state, stored per card per direction. */
export interface CardProgress {
  box: number; // 0 = new, 5 = mastered
  due: number; // epoch ms
  correct: number;
  wrong: number;
  lastSeen: number;
  streak: number;
}

export interface StudySet {
  id: string;
  title: string;
  description?: string;
  cards: Card[];
  createdAt: number;
  updatedAt: number;
  color: string;
  /** Progress keyed by `${cardId}:${direction}` */
  progress: Record<string, CardProgress>;
}

export type Direction = "es-en" | "en-es";

export interface TestQuestion {
  id: string;
  kind: "mc" | "write" | "tf" | "match";
  prompt: string;
  answer: string;
  choices?: string[];
  /** For true/false: what was shown as the proposed answer. */
  shown?: string;
  pairs?: { left: string; right: string }[];
  cardId?: string;
  note?: string;
}

export interface TestResult {
  setId: string;
  setTitle: string;
  takenAt: number;
  score: number;
  total: number;
  durationMs: number;
  missed: { prompt: string; yours: string; correct: string }[];
}

export interface DrillResult {
  takenAt: number;
  score: number;
  total: number;
  durationMs: number;
  tenses: string[];
  label: string;
  missed: { prompt: string; yours: string; correct: string }[];
}

export interface AppData {
  sets: StudySet[];
  tests: TestResult[];
  drills: DrillResult[];
  streak: { count: number; lastDay: string };
  version: number;
}
