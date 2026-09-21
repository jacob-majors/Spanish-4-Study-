"use client";

import React, { useEffect, useState } from "react";
import { speak } from "@/lib/tts";

/**
 * A mastery bar, set as a ruled measure rather than a rounded pill.
 * The accent fills only the learned portion, so it stays well under 5%.
 */
export function ProgressBar({ value, tone = "accent" }: { value: number; tone?: "accent" | "good" }) {
  const color = tone === "good" ? "var(--color-good)" : "var(--color-accent)";
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      style={{ height: 3, background: "var(--color-rule)", width: "100%" }}
      role="presentation"
    >
      <div style={{ height: "100%", width: `${pct}%`, background: color }} />
    </div>
  );
}

/** A percentage set as data, with a rule beneath it. Replaces the donut ring. */
export function Figure({ value, caption }: { value: number; caption?: string }) {
  return (
    <div className="text-right shrink-0">
      <div className="data tnum" style={{ fontSize: "var(--text-lg)", lineHeight: 1, color: "var(--color-ink)" }}>
        {Math.round(value)}
        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>%</span>
      </div>
      {caption && <div className="label" style={{ marginTop: "var(--space-3xs)" }}>{caption}</div>}
    </div>
  );
}

export function SpeakButton({ text, className = "" }: { text: string; className?: string }) {
  return (
    <button
      type="button"
      aria-label={`Listen to ${text}`}
      title="Listen"
      onClick={(e) => { e.stopPropagation(); speak(text); }}
      className={`btn btn-quiet ${className}`}
      style={{ minHeight: 36, padding: "var(--space-2xs) var(--space-xs)" }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      </svg>
    </button>
  );
}

const ACCENTS = ["á", "é", "í", "ó", "ú", "ñ", "ü", "¿", "¡"];

/** Click-to-insert accent row, for a US keyboard. */
export function AccentKeys({ onInsert }: { onInsert: (ch: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {ACCENTS.map((a) => (
        <button
          key={a}
          type="button"
          aria-label={`Insert ${a}`}
          onMouseDown={(e) => { e.preventDefault(); onInsert(a); }}
          className="data"
          style={{
            minWidth: 36, minHeight: 36,
            border: "var(--rule-hair) solid var(--color-rule)",
            background: "var(--color-paper)",
            color: "var(--color-ink-2)",
            fontSize: "var(--text-sm)",
            cursor: "pointer",
          }}
        >
          {a}
        </button>
      ))}
    </div>
  );
}

/** A labelled figure in a ruled strip. */
export function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div style={{ borderTop: "var(--rule-thick) solid var(--color-ink)", paddingTop: "var(--space-xs)" }}>
      <div className="label">{label}</div>
      <div className="data tnum" style={{ fontSize: "var(--text-xl)", lineHeight: 1.1, marginTop: "var(--space-2xs)" }}>{value}</div>
      {sub && <div className="muted" style={{ fontSize: "var(--text-xs)", marginTop: "var(--space-3xs)" }}>{sub}</div>}
    </div>
  );
}

export function Empty({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div style={{ borderTop: "var(--rule-thick) solid var(--color-ink)", paddingTop: "var(--space-md)" }}>
      <h2 className="display" style={{ fontSize: "var(--text-xl)" }}>{title}</h2>
      <p className="muted measure" style={{ marginTop: "var(--space-xs)" }}>{body}</p>
      {action && <div style={{ marginTop: "var(--space-md)" }}>{action}</div>}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-baseline gap-2 text-left"
      style={{ fontSize: "var(--text-sm)", color: "var(--color-ink)", minHeight: 36 }}
      aria-pressed={checked}
    >
      <span
        aria-hidden="true"
        className="data shrink-0 grid place-items-center"
        style={{
          width: 16, height: 16,
          border: `var(--rule-hair) solid ${checked ? "var(--color-accent)" : "var(--color-rule-2)"}`,
          background: checked ? "var(--color-accent)" : "transparent",
          color: "var(--color-accent-ink)",
          fontSize: 11, lineHeight: 1,
          transform: "translateY(2px)",
        }}
      >
        {checked ? "×" : ""}
      </span>
      <span>{label}</span>
    </button>
  );
}

/** A selectable option in a ruled option row — replaces the pill-chip filter. */
export function Choice({ on, children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { on: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      {...rest}
      className="data"
      style={{
        fontSize: "var(--text-xs)",
        padding: "var(--space-2xs) var(--space-sm)",
        minHeight: 36,
        cursor: "pointer",
        background: on ? "var(--color-ink)" : "transparent",
        color: on ? "var(--color-paper)" : "var(--color-ink-2)",
        border: `var(--rule-hair) solid ${on ? "var(--color-ink)" : "var(--color-rule-2)"}`,
        ...rest.style,
      }}
    >
      {children}
    </button>
  );
}

export function useLocalState<T>(key: string, initial: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(initial);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setV(JSON.parse(raw));
    } catch { /* first run */ }
  }, [key]);
  const set = (next: T) => {
    setV(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* private mode */ }
  };
  return [v, set];
}
