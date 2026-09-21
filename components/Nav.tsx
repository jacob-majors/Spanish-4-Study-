"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "/exams", label: "Tests" },
  { href: "/sets", label: "Vocabulario" },
  { href: "/conjugate", label: "Conjugación" },
  { href: "/tables", label: "Tablas" },
  { href: "/progress", label: "Progreso" },
];

function ThemeToggle() {
  const [night, setNight] = useState(false);

  useEffect(() => {
    setNight(document.documentElement.dataset.theme === "night");
  }, []);

  function flip() {
    const next = !night;
    setNight(next);
    if (next) document.documentElement.dataset.theme = "night";
    else delete document.documentElement.dataset.theme;
    try {
      localStorage.setItem("sa.theme", next ? "night" : "paper");
    } catch {
      /* private mode */
    }
  }

  return (
    <button onClick={flip} className="btn btn-quiet label" style={{ minHeight: 36 }}
      aria-pressed={night} title={night ? "Switch to paper" : "Switch to night"}>
      {night ? "Paper" : "Night"}
    </button>
  );
}

export default function Nav() {
  const path = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const active = (href: string) => path.startsWith(href);

  return (
    <header style={{ background: "var(--color-paper)" }}>
      <div
        className="mx-auto w-full flex items-baseline gap-4"
        style={{
          maxWidth: "74rem",
          paddingInline: "var(--page-gutter)",
          paddingBlock: "var(--space-md)",
        }}
      >
        {/* Wordmark hard-left. No gradient mark, no icon tile. */}
        <Link href="/" className="shrink-0" style={{ textDecoration: "none", color: "var(--color-ink)" }}>
          <span className="display" style={{ fontSize: "var(--text-lg)", fontWeight: 700 }}>
            SA Español 4
          </span>
        </Link>

        {/* A masthead index, not a navbar: the middle stays empty and the
            destinations read as one middot-separated line, hard-right. */}
        <nav className="hidden md:flex items-baseline ml-auto" aria-label="Primary">
          {LINKS.map((l, i) => (
            <span key={l.href} className="flex items-baseline">
              {i > 0 && <span className="label" aria-hidden="true" style={{ paddingInline: "var(--space-xs)", opacity: 0.5 }}>·</span>}
              <Link
                href={l.href}
                className="label"
                aria-current={active(l.href) ? "page" : undefined}
                style={{
                  textDecoration: "none",
                  color: active(l.href) ? "var(--color-accent)" : "var(--color-muted)",
                  borderBottom: active(l.href)
                    ? "var(--rule-thick) solid var(--color-accent)"
                    : "var(--rule-thick) solid transparent",
                  paddingBottom: "var(--space-3xs)",
                  whiteSpace: "nowrap",
                }}
              >
                {l.label}
              </Link>
            </span>
          ))}
          <span style={{ paddingInline: "var(--space-md)" }}><ThemeToggle /></span>
        </nav>

        <div className="md:hidden ml-auto flex items-center gap-1">
          <ThemeToggle />
          <button className="btn btn-quiet label" onClick={() => setOpen(!open)}
            aria-expanded={open} aria-label="Menu" style={{ minHeight: 36 }}>
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </div>

      {/* Double rule — the masthead signature. */}
      <div aria-hidden="true" className="mx-auto w-full" style={{ maxWidth: "74rem", paddingInline: "var(--page-gutter)" }}>
        <div style={{
          borderTop: "var(--rule-thick) solid var(--color-ink)",
          borderBottom: "var(--rule-hair) solid var(--color-rule-2)",
          height: 4,
        }} />
      </div>

      {open && (
        <nav
          className="md:hidden"
          aria-label="Primary"
          style={{ borderTop: "var(--rule-hair) solid var(--color-rule)" }}
        >
          <div className="mx-auto w-full" style={{ maxWidth: "74rem", paddingInline: "var(--page-gutter)" }}>
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="label block"
                style={{
                  textDecoration: "none",
                  padding: "var(--space-sm) 0",
                  borderTop: "var(--rule-hair) solid var(--color-rule)",
                  color: active(l.href) ? "var(--color-accent)" : "var(--color-ink-2)",
                }}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
