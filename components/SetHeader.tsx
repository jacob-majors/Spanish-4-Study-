"use client";

import Link from "next/link";
import { StudySet } from "@/lib/types";

export function SetHeader({ set, mode }: { set: StudySet; mode: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-5">
      <Link href={`/sets/${set.id}`} className="btn btn-ghost !py-1.5 !px-3 text-sm">← {set.title}</Link>
      <span className="chip">{mode}</span>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="card-shell p-10 text-center">
      <div className="text-lg font-semibold">That set is not here</div>
      <p className="muted text-sm mt-1.5">It may have been deleted, or saved in a different browser.</p>
      <Link href="/sets" className="btn btn-primary mt-5">Back to my sets</Link>
    </div>
  );
}
