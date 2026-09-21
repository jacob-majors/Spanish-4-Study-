"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { conjugate } from "@/lib/conjugation/engine";
import { VERB_LIST } from "@/lib/conjugation/verbs";
import { ACTIVE_TENSES, PERSON_LABELS, TenseKey } from "@/lib/conjugation/types";
import { SpeakButton } from "@/components/ui";

function Tables() {
  const params = useSearchParams();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(params.get("verb") ?? "tener");

  const verb = VERB_LIST.find((v) => v.infinitive === active) ?? VERB_LIST[0];
  const results = q
    ? VERB_LIST.filter(
        (v) => v.infinitive.includes(q.toLowerCase()) || v.english.toLowerCase().includes(q.toLowerCase()),
      ).slice(0, 48)
    : [];

  return (
    <div>
      <p className="label">Tablas de verbos</p>
      <div className="flex flex-wrap items-end gap-4" style={{ marginTop: "var(--space-xs)" }}>
        <h1 className="display" style={{ fontSize: "var(--text-2xl)" }}>Referencia</h1>
        <Link href="/conjugate" className="link label ml-auto">Drill these instead →</Link>
      </div>

      <input
        className="field"
        style={{ marginTop: "var(--space-lg)", maxWidth: "26rem" }}
        placeholder={`Search ${VERB_LIST.length} verbs — “salir”, “to leave”…`}
        aria-label="Search verbs"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {results.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1" style={{ marginTop: "var(--space-sm)", maxHeight: "9rem", overflow: "auto" }}>
          {results.map((v) => (
            <button key={v.infinitive} onClick={() => { setActive(v.infinitive); setQ(""); }}
              title={v.english} className="link data" style={{ fontSize: "var(--text-sm)", cursor: "pointer" }}>
              {v.infinitive}
            </button>
          ))}
        </div>
      )}

      {/* Entry head — the way a dictionary sets a headword. */}
      <header style={{ marginTop: "var(--space-2xl)", borderTop: "var(--rule-thick) solid var(--color-ink)", paddingTop: "var(--space-sm)" }}>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="display" style={{ fontSize: "var(--text-3xl)" }}>{verb.infinitive}</h2>
          <SpeakButton text={verb.infinitive} />
          <span className="muted" style={{ fontSize: "var(--text-lg)" }}>{verb.english}</span>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1" style={{ marginTop: "var(--space-sm)" }}>
          {verb.tags?.map((t) => <span key={t} className="tag">{t}</span>)}
        </div>
      </header>

      <section style={{ marginTop: "var(--space-xl)" }}>
        <h3 className="label" style={{ borderBottom: "var(--rule-hair) solid var(--color-rule-2)", paddingBottom: "var(--space-2xs)" }}>
          Indicativo
        </h3>
        <div
          className="grid gap-x-10 gap-y-6"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 17rem), 1fr))", marginTop: "var(--space-md)" }}
        >
          {ACTIVE_TENSES.map((t) => (
            <TenseTable key={t.key} verb={verb.infinitive} tense={t.key} name={t.name} english={t.english} />
          ))}
        </div>
      </section>
    </div>
  );
}

function TenseTable({ verb, tense, name, english }: { verb: string; tense: TenseKey; name: string; english: string }) {
  const forms = conjugate(verb, tense);
  return (
    <div style={{ minWidth: 0 }}>
      {/* Fixed height keeps every table in the grid starting on the same line. */}
      <div
        className="flex items-baseline justify-between gap-3"
        style={{
          borderBottom: "var(--rule-hair) solid var(--color-rule-2)",
          paddingBottom: "var(--space-3xs)",
          minHeight: "2.6rem",
          alignItems: "flex-end",
        }}
      >
        <span className="display" style={{ fontSize: "var(--text-md)" }}>{name}</span>
        <span className="tag" style={{ textAlign: "right", maxWidth: "55%" }}>{english}</span>
      </div>
      <table className="sheet" style={{ marginTop: "var(--space-2xs)" }}>
        <tbody>
          {PERSON_LABELS.map((p, i) => (
            <tr key={p}>
              <td className="muted" style={{ fontSize: "var(--text-xs)", width: "45%" }}>{p}</td>
              <td className="data" style={{ textAlign: "right", fontSize: "var(--text-sm)" }}>{forms[i]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function TablesPage() {
  return (
    <Suspense fallback={<p className="muted">Loading verbs…</p>}>
      <Tables />
    </Suspense>
  );
}
