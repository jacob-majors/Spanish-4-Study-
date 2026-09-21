"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { conjugate } from "@/lib/conjugation/engine";
import { VERB_LIST } from "@/lib/conjugation/verbs";
import { TENSES, PERSON_LABELS, TenseKey } from "@/lib/conjugation/types";
import { SpeakButton } from "@/components/ui";

const MOODS = ["Indicativo", "Subjuntivo", "Imperativo", "Formas impersonales"] as const;

function Tables() {
  const params = useSearchParams();
  const initial = params.get("verb") ?? "tener";
  const [q, setQ] = useState("");
  const [active, setActive] = useState(initial);

  const verb = VERB_LIST.find((v) => v.infinitive === active) ?? VERB_LIST[0];
  const results = q
    ? VERB_LIST.filter((v) => v.infinitive.includes(q.toLowerCase()) || v.english.toLowerCase().includes(q.toLowerCase())).slice(0, 40)
    : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Verb tables</h1>
        <Link href="/conjugate" className="btn btn-primary text-sm ml-auto">Drill these instead</Link>
      </div>

      <div className="card-shell p-4">
        <input className="input" placeholder={`Search ${VERB_LIST.length} verbs — "salir", "to leave"…`}
          value={q} onChange={(e) => setQ(e.target.value)} />
        {results.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3 max-h-40 overflow-auto">
            {results.map((v) => (
              <button key={v.infinitive} onClick={() => { setActive(v.infinitive); setQ(""); }} title={v.english}
                className="btn btn-ghost !py-1 !px-2.5 text-xs">{v.infinitive}</button>
            ))}
          </div>
        )}
      </div>

      <div className="card-shell p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <div className="text-2xl font-bold flex items-center gap-2">
              {verb.infinitive}
              <SpeakButton text={verb.infinitive} />
            </div>
            <div className="muted text-sm">{verb.english}</div>
          </div>
          <div className="flex flex-wrap gap-1.5 ml-auto">
            {verb.tags?.map((t) => <span key={t} className="chip">{t}</span>)}
          </div>
        </div>
        <div className="flex flex-wrap gap-4 mt-4 text-sm">
          <div><span className="muted">gerundio</span> <strong className="ml-1.5">{conjugate(verb, "gerundio")[0]}</strong></div>
          <div><span className="muted">participio</span> <strong className="ml-1.5">{conjugate(verb, "participio")[0]}</strong></div>
        </div>
      </div>

      {MOODS.map((mood) => {
        const tenses = TENSES.filter((t) => t.mood === mood && !t.single);
        if (!tenses.length) return null;
        return (
          <section key={mood}>
            <h2 className="text-lg font-bold mb-2.5">{mood}</h2>
            <div className="grid md:grid-cols-2 gap-3">
              {tenses.map((t) => (
                <TenseCard key={t.key} verb={verb.infinitive} tense={t.key} name={t.name} english={t.english} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function TenseCard({ verb, tense, name, english }: { verb: string; tense: TenseKey; name: string; english: string }) {
  const forms = conjugate(verb, tense);
  return (
    <div className="card-shell p-4">
      <div className="flex items-baseline justify-between gap-2">
        <div className="font-semibold">{name}</div>
        <div className="text-xs muted">{english}</div>
      </div>
      <div className="mt-2.5 space-y-1 text-sm">
        {PERSON_LABELS.map((p, i) => (
          <div key={p} className="flex justify-between gap-3 py-0.5" style={{ borderBottom: i < 5 ? "1px solid var(--border)" : undefined }}>
            <span className="muted">{p}</span>
            <span className="font-medium text-right">{forms[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TablesPage() {
  return (
    <Suspense fallback={<div className="muted">Loading verbs…</div>}>
      <Tables />
    </Suspense>
  );
}
