"use client";

import { AppData, StudySet, TestResult, DrillResult } from "./types";

const KEY = "verbo.data.v1";

export const EMPTY: AppData = {
  sets: [],
  tests: [],
  drills: [],
  streak: { count: 0, lastDay: "" },
  version: 1,
};

const listeners = new Set<() => void>();
let cache: AppData | null = null;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function load(): AppData {
  if (cache) return cache;
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? { ...EMPTY, ...JSON.parse(raw) } : { ...EMPTY };
  } catch {
    cache = { ...EMPTY };
  }
  return cache!;
}

export function save(data: AppData) {
  cache = data;
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Could not save progress", e);
  }
  listeners.forEach((l) => l());
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function update(fn: (d: AppData) => AppData | void) {
  const data = structuredClone(load());
  const next = fn(data) ?? data;
  save(next);
  return next;
}

/** Record that the user studied today, keeping the day-streak counter honest. */
export function touchStreak() {
  update((d) => {
    const today = todayKey();
    if (d.streak.lastDay === today) return;
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    d.streak = {
      count: d.streak.lastDay === yesterday ? d.streak.count + 1 : 1,
      lastDay: today,
    };
  });
}

export function upsertSet(set: StudySet) {
  update((d) => {
    const i = d.sets.findIndex((s) => s.id === set.id);
    if (i >= 0) d.sets[i] = set;
    else d.sets.unshift(set);
  });
}

export function deleteSet(id: string) {
  update((d) => {
    d.sets = d.sets.filter((s) => s.id !== id);
  });
}

export function getSet(id: string): StudySet | undefined {
  return load().sets.find((s) => s.id === id);
}

export function recordTest(r: TestResult) {
  update((d) => {
    d.tests.unshift(r);
    d.tests = d.tests.slice(0, 100);
  });
  touchStreak();
}

export function recordDrill(r: DrillResult) {
  update((d) => {
    d.drills.unshift(r);
    d.drills = d.drills.slice(0, 100);
  });
  touchStreak();
}

export function exportAll(): string {
  return JSON.stringify(load(), null, 2);
}

export function importAll(json: string): { ok: boolean; message: string } {
  try {
    const parsed = JSON.parse(json);
    if (!parsed || !Array.isArray(parsed.sets)) return { ok: false, message: "That file has no study sets in it." };
    save({ ...EMPTY, ...parsed });
    return { ok: true, message: `Imported ${parsed.sets.length} set(s).` };
  } catch {
    return { ok: false, message: "That is not valid JSON." };
  }
}

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}
