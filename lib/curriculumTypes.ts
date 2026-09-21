import { TenseKey } from "./conjugation/types";

/**
 * Content that lives in the repo rather than in the browser: vocabulary sets
 * and exam plans built from the review packets you hand over. Editing
 * data/curriculum.ts and reloading updates the app, and your progress on any
 * term you have already studied carries across the update.
 */
export interface CurriculumSet {
  /** Stable id — never change it once a set has been studied. */
  id: string;
  title: string;
  description?: string;
  color?: string;
  /** [Spanish, English] */
  rows: [string, string][];
}

export type QuestionKind = "mc" | "write" | "tf" | "match" | "conj";

export interface ExamSection {
  kind: QuestionKind;
  count: number;
  /** "Vocab matching, 20 items" — shown on the exam page. */
  label?: string;
}

export interface StudyTask {
  /** Days before the exam this belongs to: 0 = exam day, 1 = the day before. */
  daysBefore: number;
  task: string;
  href?: string;
}

export interface ExamPlan {
  id: string;
  title: string;
  /** ISO date, e.g. "2026-10-03". */
  date: string;
  /** Anything the packet says about how it will be graded or formatted. */
  format?: string;
  /** Topic checklist — the things the packet says will be covered. */
  topics: string[];
  /** Curriculum set ids this exam draws on. */
  setIds: string[];
  /** Tenses the exam covers, for the drill preset and the mock exam. */
  tenses: TenseKey[];
  /** Specific verbs named by the packet. Empty means "use the common verbs". */
  verbs: string[];
  /** Shape of the mock exam. */
  sections: ExamSection[];
  /** Grammar notes worth re-reading — rendered as a study sheet. */
  notes?: { heading: string; body: string }[];
  plan?: StudyTask[];
  /** Where this came from, e.g. "Unit 4 review packet, handed out 9/15". */
  source?: string;
}
