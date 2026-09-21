"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAppData } from "./useData";
import { StudySet } from "./types";

/**
 * Sets live in localStorage, so the server cannot know whether one exists.
 * `ready` stays false through hydration and flips after mount, which keeps the
 * first client render identical to the server's and avoids a hydration mismatch.
 */
export function useSet(): { set: StudySet | undefined; id: string; ready: boolean } {
  const params = useParams();
  const id = String(params?.id ?? "");
  const data = useAppData();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return { set: data.sets.find((s) => s.id === id), id, ready };
}
