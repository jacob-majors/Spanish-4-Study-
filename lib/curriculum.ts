"use client";

import { CURRICULUM_SETS, EXAMS } from "@/data/curriculum";
import { ExamPlan } from "./curriculumTypes";
import { load, update } from "./storage";
import { StudySet, Card } from "./types";

/** Deterministic id from the term, so progress survives a regenerated set. */
function stableId(seed: string): string {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/**
 * Bring the repo's curriculum sets into the local store.
 *
 * A set already in the store keeps its progress: cards are matched by a hash of
 * the Spanish term, so adding, removing or reordering terms in data/curriculum.ts
 * never resets what you have learned.
 */
export function syncCurriculum(): void {
  update((d) => {
    // Every set in the app comes from data/curriculum.ts, so anything left over
    // from an earlier version of that file is dropped.
    const live = new Set(CURRICULUM_SETS.map((c) => c.id));
    const titles = new Map(CURRICULUM_SETS.map((c) => [c.title, c.id]));
    d.sets = d.sets.filter((s) => {
      if (s.sourceId) return live.has(s.sourceId);
      return titles.has(s.title);
    });

    for (const cs of CURRICULUM_SETS) {
      const cards: Card[] = cs.rows.map(([term, def, cloze]) => ({
        id: stableId(cs.id + "|" + term),
        term,
        def,
        ...(cloze ? { cloze } : {}),
      }));

      // Match on sourceId, or adopt an identically-titled set from before
      // curriculum sync existed rather than creating a duplicate.
      let existing = d.sets.find((s) => s.sourceId === cs.id);
      if (!existing) {
        const byTitle = d.sets.find((s) => !s.sourceId && s.title === cs.title);
        if (byTitle) {
          byTitle.sourceId = cs.id;
          existing = byTitle;
        }
      }

      if (!existing) {
        d.sets.push({
          id: cs.id,
          sourceId: cs.id,
          title: cs.title,
          description: cs.description,
          color: cs.color ?? "#6c5ce7",
          cards,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          progress: {},
        });
        continue;
      }

      // Carry progress over from the old card ids where the term is unchanged.
      const oldIdByTerm = new Map(existing.cards.map((c) => [c.term, c.id]));
      const remapped: StudySet["progress"] = {};
      for (const c of cards) {
        const oldId = oldIdByTerm.get(c.term);
        if (!oldId) continue;
        for (const dir of ["es-en", "en-es"] as const) {
          const p = existing.progress[`${oldId}:${dir}`];
          if (p) remapped[`${c.id}:${dir}`] = p;
        }
      }
      // Keep starred terms starred.
      const starredTerms = new Set(existing.cards.filter((c) => c.starred).map((c) => c.term));
      existing.title = cs.title;
      existing.description = cs.description;
      existing.color = cs.color ?? existing.color;
      existing.cards = cards.map((c) => (starredTerms.has(c.term) ? { ...c, starred: true } : c));
      existing.progress = remapped;
      existing.updatedAt = Date.now();
    }
  });
}

export function curriculumExams(): ExamPlan[] {
  return EXAMS;
}

/** Repo exams plus any you added by hand in the app, soonest first. */
export function allExams(): ExamPlan[] {
  const local = load().customExams ?? [];
  const seen = new Set<string>();
  return [...EXAMS, ...local]
    .filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function examById(id: string): ExamPlan | undefined {
  return allExams().find((e) => e.id === id);
}

export function isCurriculumExam(id: string): boolean {
  return EXAMS.some((e) => e.id === id);
}

export function saveCustomExam(exam: ExamPlan) {
  update((d) => {
    d.customExams = d.customExams ?? [];
    const i = d.customExams.findIndex((e) => e.id === exam.id);
    if (i >= 0) d.customExams[i] = exam;
    else d.customExams.push(exam);
  });
}

export function deleteCustomExam(id: string) {
  update((d) => {
    d.customExams = (d.customExams ?? []).filter((e) => e.id !== id);
  });
}

/** Whole days from today until the exam. Negative once it has passed. */
export function daysUntil(isoDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, day] = isoDate.split("-").map(Number);
  const target = new Date(y, (m ?? 1) - 1, day ?? 1);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function formatExamDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function countdownLabel(isoDate: string): string {
  const n = daysUntil(isoDate);
  if (n < 0) return `${Math.abs(n)} day${Math.abs(n) === 1 ? "" : "s"} ago`;
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  return `In ${n} days`;
}
