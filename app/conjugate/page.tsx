"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { conjugate } from "@/lib/conjugation/engine";
import { VERB_LIST, VERB_GROUPS, VERB_MAP } from "@/lib/conjugation/verbs";
import { ACTIVE_TENSES, ACTIVE_TENSE_KEYS, TENSE_BY_KEY, TenseKey, PERSON_LABELS, VerbEntry } from "@/lib/conjugation/types";
import { gradeConjugation } from "@/lib/grade";
import { shuffle } from "@/lib/srs";
import { recordDrill } from "@/lib/storage";
import { speak } from "@/lib/tts";
import { AccentKeys, ProgressBar, Toggle, Choice, useLocalState } from "@/components/ui";

interface Prompt { verb: VerbEntry; tense: TenseKey; person: number; answer: string }

const DEFAULT_TENSES: TenseKey[] = ["presente", "preterito", "imperfecto"];

function ConjugateInner() {
  const [group, setGroup] = useLocalState<string>("sa.drill.group", "top");
  const [tenses, setTenses] = useLocalState<TenseKey[]>("sa.drill.tenses", DEFAULT_TENSES);
  const [people, setPeople] = useLocalState<number[]>("sa.drill.people", [0, 1, 2, 3, 5]);
  const [length, setLength] = useLocalState<number>("sa.drill.length", 20);
  const [customVerbs, setCustomVerbs] = useLocalState<string[]>("sa.drill.custom", []);
  const [useCustom, setUseCustom] = useState(false);
  const [showEnglish, setShowEnglish] = useLocalState<boolean>("sa.drill.english", true);

  const [prompts, setPrompts] = useState<Prompt[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [fb, setFb] = useState<null | { ok: boolean; message?: string; answer: string }>(null);
  const [right, setRight] = useState(0);
  const [missed, setMissed] = useState<{ prompt: string; yours: string; correct: string }[]>([]);
  const [startedAt, setStartedAt] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // A tense list saved before the app was narrowed to four tenses can still
  // hold keys that are no longer offered; drop them rather than drilling them.
  useEffect(() => {
    const clean = tenses.filter((t) => ACTIVE_TENSE_KEYS.includes(t));
    if (clean.length !== tenses.length) setTenses(clean.length ? clean : DEFAULT_TENSES);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenses.join(",")]);

  const search = useSearchParams();
  useEffect(() => {
    const g = search.get("group");
    const t = search.get("tenses");
    const v = search.get("verbs");
    const n = search.get("n");
    if (v) {
      const list = v.split(",").map((x) => x.trim()).filter((x) => VERB_MAP[x]);
      if (list.length) { setCustomVerbs(list); setUseCustom(true); }
    } else if (g && VERB_GROUPS.some((x) => x.id === g)) {
      setGroup(g);
      setUseCustom(false);
    }
    if (t) {
      const valid = (t.split(",").map((x) => x.trim()) as TenseKey[]).filter((x) =>
        ACTIVE_TENSE_KEYS.includes(x),
      );
      if (valid.length) setTenses(valid);
    }
    if (n && Number(n) > 0) setLength(Math.min(60, Math.max(5, Number(n))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const groupVerbs = useMemo(() => {
    if (useCustom && customVerbs.length) return customVerbs.map((v) => VERB_MAP[v]).filter(Boolean);
    const g = VERB_GROUPS.find((x) => x.id === group) ?? VERB_GROUPS[0];
    return VERB_LIST.filter(g.filter);
  }, [group, useCustom, customVerbs]);

  useEffect(() => { if (!fb) inputRef.current?.focus(); }, [idx, fb, prompts]);

  function build() {
    const usableTenses = tenses.length ? tenses : DEFAULT_TENSES;
    const verbs = groupVerbs.length ? groupVerbs : VERB_LIST;
    const out: Prompt[] = [];
    let guard = 0;
    while (out.length < length && guard++ < length * 40) {
      const verb = verbs[Math.floor(Math.random() * verbs.length)];
      const tense = usableTenses[Math.floor(Math.random() * usableTenses.length)];
      const single = TENSE_BY_KEY[tense].single;
      const pool = single ? [0] : (people.length ? people : [0, 1, 2, 3, 5]);
      const person = pool[Math.floor(Math.random() * pool.length)];
      const answer = conjugate(verb, tense)[person];
      if (!answer || answer === "—") continue;
      if (out.some((p) => p.verb.infinitive === verb.infinitive && p.tense === tense && p.person === person)) continue;
      out.push({ verb, tense, person, answer });
    }
    setPrompts(shuffle(out));
    setIdx(0); setInput(""); setFb(null); setRight(0); setMissed([]);
    setStartedAt(Date.now());
  }

  const cur = prompts?.[idx];
  const finished = !!prompts && idx >= prompts.length;

  useEffect(() => {
    if (!finished || !prompts) return;
    recordDrill({
      takenAt: Date.now(),
      score: right,
      total: prompts.length,
      durationMs: Date.now() - startedAt,
      tenses: tenses.map((t) => TENSE_BY_KEY[t].name),
      label: `${useCustom && customVerbs.length ? "my verbs" : (VERB_GROUPS.find((g) => g.id === group)?.name ?? "verbs")} · ${tenses.length} tense${tenses.length === 1 ? "" : "s"}`,
      missed,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  function check() {
    if (!cur || fb) return;
    const res = gradeConjugation(input, cur.answer);
    if (res.pass) setRight((r) => r + 1);
    else setMissed((m) => [...m, {
      prompt: `${cur.verb.infinitive} · ${TENSE_BY_KEY[cur.tense].name} · ${PERSON_LABELS[cur.person]}`,
      yours: input || "—", correct: cur.answer,
    }]);
    setFb({ ok: res.pass, message: res.message, answer: cur.answer });
    speak(cur.answer);
  }

  function next() { setFb(null); setInput(""); setIdx((n) => n + 1); }

  /* ------------------------- setup ------------------------- */
  if (!prompts) {
    return (
      <div>
        <p className="label">Conjugación</p>
        <h1 className="display" style={{ fontSize: "var(--text-2xl)", marginTop: "var(--space-xs)" }}>
          Preparar un drill
        </h1>
        <p className="muted measure" style={{ marginTop: "var(--space-sm)" }}>
          {VERB_LIST.length} verbs across the four tenses the class covers. Set it to exactly what
          your test asks for and drill only that.
        </p>

        <Field label="Verbos" note={
          useCustom
            ? `${customVerbs.length} selected`
            : `${groupVerbs.length} verbs — ${VERB_GROUPS.find((g) => g.id === group)?.description}`
        }>
          <div className="flex flex-wrap gap-2">
            {VERB_GROUPS.map((g) => (
              <Choice key={g.id} title={g.description} on={!useCustom && group === g.id}
                onClick={() => { setGroup(g.id); setUseCustom(false); }}>
                {g.name}
              </Choice>
            ))}
            <Choice on={useCustom} onClick={() => setUseCustom(true)}>
              Elegir yo{customVerbs.length ? ` (${customVerbs.length})` : ""}
            </Choice>
          </div>
          {useCustom && <VerbPicker selected={customVerbs} onChange={setCustomVerbs} />}
        </Field>

        <Field label="Tiempos">
          <div className="flex flex-wrap gap-2">
            {ACTIVE_TENSES.map((t) => (
              <Choice key={t.key} title={`${t.english} — e.g. ${t.example}`} on={tenses.includes(t.key)}
                onClick={() => setTenses(tenses.includes(t.key) ? tenses.filter((x) => x !== t.key) : [...tenses, t.key])}>
                {t.name}
              </Choice>
            ))}
          </div>
          <div className="flex flex-wrap gap-4" style={{ marginTop: "var(--space-md)" }}>
            <button className="link label" onClick={() => setTenses(ACTIVE_TENSE_KEYS)}>Select all</button>
            <button className="link label" onClick={() => setTenses([])}>Clear</button>
          </div>
        </Field>

        <Field label="Sujetos">
          <div className="flex flex-wrap gap-2">
            {PERSON_LABELS.map((p, i) => (
              <Choice key={p} on={people.includes(i)}
                onClick={() => setPeople(people.includes(i) ? people.filter((x) => x !== i) : [...people, i].sort())}>
                {p}
              </Choice>
            ))}
          </div>
        </Field>

        <Field label="Preguntas" note={String(length)}>
          <input type="range" min={5} max={60} value={length} aria-label="Number of questions"
            style={{ width: "100%", maxWidth: "26rem", accentColor: "var(--color-accent)" }}
            onChange={(e) => setLength(Number(e.target.value))} />
        </Field>

        <div style={{ borderTop: "var(--rule-hair) solid var(--color-rule)", paddingTop: "var(--space-md)" }}>
          <Toggle checked={showEnglish} onChange={setShowEnglish} label="Show the English meaning in the prompt" />
        </div>

        <div className="flex flex-wrap items-center gap-4" style={{ marginTop: "var(--space-xl)" }}>
          <button className="btn btn-primary" onClick={build} disabled={!tenses.length}>
            {tenses.length ? `Start ${length}-question drill` : "Pick at least one tense"}
          </button>
          <Link href="/tables" className="link label">Look something up instead →</Link>
        </div>
      </div>
    );
  }

  /* ------------------------- results ------------------------- */
  if (finished) {
    const pct = Math.round((right / prompts.length) * 100);
    const tone = pct >= 80 ? "var(--color-good)" : pct >= 70 ? "var(--color-ink)" : "var(--color-accent)";
    return (
      <div>
        <div style={{ borderTop: "var(--rule-thick) solid var(--color-ink)", paddingTop: "var(--space-md)" }}>
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
            <span className="data tnum" style={{ fontSize: "var(--text-display)", lineHeight: 1, color: tone }}>{pct}</span>
            <span className="tag" style={{ marginLeft: "auto" }}>
              {right}/{prompts.length} correct · {Math.round((Date.now() - startedAt) / 1000)}s
            </span>
          </div>
          <div className="flex flex-wrap gap-3" style={{ marginTop: "var(--space-lg)" }}>
            {missed.length > 0 && (
              <button className="btn btn-primary" onClick={() => {
                const redo = prompts.filter((p) => missed.some((m) => m.correct === p.answer));
                setPrompts(shuffle(redo)); setIdx(0); setRight(0); setMissed([]); setInput(""); setFb(null); setStartedAt(Date.now());
              }}>Redo the {missed.length} I missed</button>
            )}
            <button className="btn btn-outline" onClick={build}>New drill, same settings</button>
            <button className="link label self-center" onClick={() => setPrompts(null)}>Change settings →</button>
          </div>
        </div>

        {missed.length > 0 && (
          <section style={{ marginTop: "var(--space-2xl)" }}>
            <h2 className="display" style={{ fontSize: "var(--text-xl)", borderBottom: "var(--rule-thick) solid var(--color-ink)", paddingBottom: "var(--space-xs)" }}>
              Errores
            </h2>
            <table className="sheet" style={{ marginTop: "var(--space-xs)" }}>
              <thead>
                <tr><th>Prompt</th><th>Tu respuesta</th><th style={{ textAlign: "right" }}>Correcta</th></tr>
              </thead>
              <tbody>
                {missed.map((m, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: "var(--text-sm)" }}>{m.prompt}</td>
                    <td className="data" style={{ fontSize: "var(--text-sm)", color: "var(--color-accent)" }}>{m.yours}</td>
                    <td className="data" style={{ fontSize: "var(--text-sm)", textAlign: "right", color: "var(--color-good)" }}>{m.correct}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    );
  }

  /* ------------------------- drilling ------------------------- */
  const meta = TENSE_BY_KEY[cur!.tense];
  return (
    <div style={{ maxWidth: "44rem" }}>
      <div className="flex items-center gap-4" style={{ borderBottom: "var(--rule-hair) solid var(--color-rule)", paddingBottom: "var(--space-xs)" }}>
        <button className="label" onClick={() => setPrompts(null)}>← Ajustes</button>
        <span className="data tnum tag">{idx + 1}/{prompts.length}</span>
        <span className="flex-1"><ProgressBar value={(idx / prompts.length) * 100} /></span>
        <span className="data tnum tag" style={{ color: "var(--color-good)" }}>{right}</span>
      </div>

      {/* The prompt is the largest thing on the page. */}
      <div style={{ marginTop: "var(--space-2xl)" }}>
        <p className="label">
          {meta.name} · {meta.single ? "forma única" : PERSON_LABELS[cur!.person]}
        </p>
        <h1 className="display" style={{ fontSize: "var(--text-3xl)", marginTop: "var(--space-xs)" }}>
          {cur!.verb.infinitive}
        </h1>
        {showEnglish && <p className="muted" style={{ marginTop: "var(--space-3xs)" }}>{cur!.verb.english}</p>}
      </div>

      <form style={{ marginTop: "var(--space-xl)" }} onSubmit={(e) => { e.preventDefault(); fb ? next() : check(); }}>
        <input ref={inputRef} className="field data"
          style={{ fontSize: "var(--text-xl)" }}
          placeholder="…"
          aria-label={`Conjugate ${cur!.verb.infinitive} in ${meta.name}`}
          value={input} disabled={!!fb} autoComplete="off" autoCapitalize="off" spellCheck={false}
          onChange={(e) => setInput(e.target.value)} />
        {!fb && (
          <>
            <div style={{ marginTop: "var(--space-md)" }}>
              <AccentKeys onInsert={(ch) => { setInput((v) => v + ch); inputRef.current?.focus(); }} />
            </div>
            <button className="btn btn-primary" type="submit" style={{ marginTop: "var(--space-lg)" }}>Check</button>
          </>
        )}
      </form>

      {fb && (
        <div style={{ marginTop: "var(--space-lg)", borderTop: "var(--rule-thick) solid", borderColor: fb.ok ? "var(--color-good)" : "var(--color-accent)", paddingTop: "var(--space-sm)" }}>
          <p className="flex items-baseline gap-2">
            <span className="data" style={{ color: fb.ok ? "var(--color-good)" : "var(--color-accent)" }} aria-hidden="true">
              {fb.ok ? "✓" : "✗"}
            </span>
            <span className="label" style={{ color: fb.ok ? "var(--color-good)" : "var(--color-accent)" }}>
              {fb.ok ? "Correcto" : "Incorrecto"}
            </span>
            {!fb.ok && <span className="data" style={{ fontSize: "var(--text-lg)" }}>{fb.answer}</span>}
          </p>
          {fb.message && <p className="muted" style={{ fontSize: "var(--text-sm)", marginTop: "var(--space-3xs)" }}>{fb.message}</p>}

          {!fb.ok && (
            <table className="sheet" style={{ marginTop: "var(--space-md)", maxWidth: "26rem" }}>
              <thead>
                <tr><th colSpan={2}>{meta.name} · {cur!.verb.infinitive}</th></tr>
              </thead>
              <tbody>
                {conjugate(cur!.verb, cur!.tense).map((f, i) => (
                  <tr key={i}>
                    <td className="muted" style={{ fontSize: "var(--text-xs)" }}>{PERSON_LABELS[i]}</td>
                    <td className="data" style={{
                      textAlign: "right", fontSize: "var(--text-sm)",
                      color: i === cur!.person ? "var(--color-good)" : "var(--color-ink-2)",
                      fontWeight: i === cur!.person ? 500 : 400,
                    }}>{f}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="flex flex-wrap gap-4 items-center" style={{ marginTop: "var(--space-lg)" }}>
            <button className="btn btn-primary" onClick={next} autoFocus>Continue</button>
            <Link href={`/tables?verb=${encodeURIComponent(cur!.verb.infinitive)}`} className="link label">
              Every tense →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

/** A labelled block in the setup sheet. Label above, control beneath. */
function Field({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: "var(--space-xl)", borderTop: "var(--rule-hair) solid var(--color-rule)", paddingTop: "var(--space-md)" }}>
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h2 className="label">{label}</h2>
        {note && <span className="tag">{note}</span>}
      </div>
      <div style={{ marginTop: "var(--space-sm)" }}>{children}</div>
    </section>
  );
}

function VerbPicker({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  const [q, setQ] = useState("");
  const list = VERB_LIST.filter(
    (v) => v.infinitive.includes(q.toLowerCase()) || v.english.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <div style={{ marginTop: "var(--space-md)", borderLeft: "var(--rule-thick) solid var(--color-rule)", paddingLeft: "var(--space-md)" }}>
      <div className="flex flex-wrap gap-3 items-baseline">
        <input className="field" style={{ maxWidth: "18rem", fontSize: "var(--text-sm)" }}
          placeholder="Search verbs…" aria-label="Search verbs" value={q} onChange={(e) => setQ(e.target.value)} />
        {selected.length > 0 && <button className="link label" onClick={() => onChange([])}>Clear</button>}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1" style={{ marginTop: "var(--space-sm)", maxHeight: "12rem", overflow: "auto" }}>
        {list.map((v) => {
          const on = selected.includes(v.infinitive);
          return (
            <button key={v.infinitive} title={v.english} aria-pressed={on}
              onClick={() => onChange(on ? selected.filter((x) => x !== v.infinitive) : [...selected, v.infinitive])}
              className="data" style={{
                fontSize: "var(--text-sm)", cursor: "pointer", minHeight: 32,
                color: on ? "var(--color-accent)" : "var(--color-ink-2)",
                borderBottom: `var(--rule-hair) solid ${on ? "var(--color-accent)" : "transparent"}`,
              }}>
              {v.infinitive}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ConjugatePage() {
  return (
    <Suspense fallback={<p className="muted">Loading the drill…</p>}>
      <ConjugateInner />
    </Suspense>
  );
}
