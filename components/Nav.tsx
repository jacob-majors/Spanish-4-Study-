"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/sets", label: "My sets" },
  { href: "/conjugate", label: "Conjugation" },
  { href: "/tables", label: "Verb tables" },
  { href: "/progress", label: "Progress" },
];

function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    const saved = (localStorage.getItem("verbo.theme") as "dark" | "light") || "dark";
    setTheme(saved);
    document.documentElement.dataset.theme = saved;
  }, []);
  const flip = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem("verbo.theme", next);
  };
  return (
    <button onClick={flip} className="btn btn-ghost !p-2 !rounded-lg" aria-label="Toggle theme" title="Toggle theme">
      {theme === "dark" ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      )}
    </button>
  );
}

export default function Nav() {
  const path = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl" style={{ background: "color-mix(in srgb, var(--bg) 82%, transparent)", borderBottom: "1px solid var(--border)" }}>
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg shrink-0">
          <span className="grid place-items-center w-7 h-7 rounded-lg text-white text-sm" style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}>V</span>
          <span>Verbo</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-4">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={active(l.href)
                ? { background: "var(--surface-2)", color: "var(--text)" }
                : { color: "var(--muted)" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link href="/sets/new" className="btn btn-primary !py-1.5 !px-3 text-sm">+ New set</Link>
          <ThemeToggle />
          <button className="md:hidden btn btn-ghost !p-2 !rounded-lg" onClick={() => setOpen(!open)} aria-label="Menu">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
          </button>
        </div>
      </div>

      {open && (
        <nav className="md:hidden px-4 pb-3 flex flex-col gap-1" style={{ borderTop: "1px solid var(--border)" }}>
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
              className="px-3 py-2 rounded-lg text-sm font-medium"
              style={active(l.href) ? { background: "var(--surface-2)" } : { color: "var(--muted)" }}>
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
