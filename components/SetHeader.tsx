"use client";

import Link from "next/link";
import { StudySet } from "@/lib/types";

/** Worksheet running head: where you are, one rule, nothing else. */
export function SetHeader({ set, mode }: { set: StudySet; mode: string }) {
  return (
    <div
      className="flex flex-wrap items-baseline gap-x-3 gap-y-1"
      style={{
        borderBottom: "var(--rule-hair) solid var(--color-rule)",
        paddingBottom: "var(--space-xs)",
        marginBottom: "var(--space-xl)",
      }}
    >
      {/* Never wraps: the title truncates rather than breaking the affordance. */}
      <Link
        href={`/sets/${set.id}`}
        className="label"
        title={set.title}
        style={{
          textDecoration: "none",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: "min(100%, 22rem)",
        }}
      >
        ← {set.title}
      </Link>
      <span className="label ml-auto" style={{ color: "var(--color-accent)" }}>{mode}</span>
    </div>
  );
}

export function NotFound() {
  return (
    <div style={{ borderTop: "var(--rule-thick) solid var(--color-ink)", paddingTop: "var(--space-md)" }}>
      <h1 className="display" style={{ fontSize: "var(--text-xl)" }}>That set is not here</h1>
      <p className="muted measure" style={{ marginTop: "var(--space-xs)" }}>
        It may have been renamed, or saved in a different browser.
      </p>
      <Link href="/sets" className="btn btn-primary" style={{ marginTop: "var(--space-md)" }}>
        Back to vocabulary
      </Link>
    </div>
  );
}
