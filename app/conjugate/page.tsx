"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { conjugate } from "@/lib/conjugation/engine";
import { VERB_LIST, VERB_GROUPS, VERB_MAP } from "@/lib/conjugation/verbs";
import { TENSES, TENSE_BY_KEY, TenseKey, PERSON_LABELS, VerbEntry } from "@/lib/conjugation/types";
import { gradeConjugation } from "@/lib/grade";
import { shuffle } from "@/lib/srs";
import { recordDrill } from "@/lib/storage";
import { speak } from "@/lib/tts";
import { AccentKeys, ProgressBar, Toggle, useLocalState } from "@/components/ui";

interface Prompt { verb: VerbEntry; tense: TenseKey; person: number; answer: string }

const DEFAULT_TENSES: TenseKey[] = ["presente", "preterito", "imperfecto"];

export default function ConjugatePage() {
  const [group, setGroup] = useLocalState<string>("verbo.drill.group", "top");
  const [tenses, setTenses] = useLocalState<TenseKey[]>("verbo.drill.tenses", DEFAULT_TENSES);
  const [people, setPeople] = useLocalState<number[]>("verbo.drill.people", [0, 1, 2, 3, 5]);
  const [length, setLength] = useLocalState<number>("verbo.drill.length", 20);
  const [customVerbs, setCustomVerbs] = useLocalState<string[]>("verbo.drill.custom", []);
  const [useCustom, setUseCustom] = useState(false);
  const [showEnglish, setShowEnglish] = useLocalState<boolean>("verbo.drill.english", true);

  const [prompts, setPrompts] = useState<Prompt[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [fb, setFb] = useState<null | { ok: boolean; message?: string; answer: string }>(null);
  const [right, setRight] = useState(0);
  const [missed, setMissed] = useState<{ prompt: string; yours: string; correct: string }[]>([]);
  const [startedAt, setStartedAt] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

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
      yours: input || "(blank)", correct: cur.answer,
    }]);
    setFb({ ok: res.pass, message: res.message, answer: cur.answer });
    speak(cur.answer);
  }

  function next() { setFb(null); setInput(""); setIdx((n) => n + 1); }

  /* ---------------- setup ---------------- */
  if (!prompts) {
    return (
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Conjugation drill</h1>
          <p className="muted text-sm mt-1">
            {VERB_LIST.length} verbs across {TENSES.length} tenses. Pick what your test covers and drill
            only that.
          </p>
        </div>

        <div className="card-shell p-5 space-y-4">
          <div>
            <div className="text-sm font-semibold mb-2">Which verbs</div>
            <div className="flex flex-wrap gap-1.5">
              {VERB_GROUPS.map((g) => (
                <button key={g.id} title={g.description}
                  onClick={() => { setGroup(g.id); setUseCustom(false); }}
                  className="btn btn-ghost !py-1.5 !px-3 text-xs"
                  style={!useCustom && group === g.id ? { background: "var(--accent)", color: "#fff" } : undefined}>
                  {g.name}
                </button>
              ))}
              <button onClick={() => setUseCustom(true)} className="btn btn-ghost !py-1.5 !px-3 text-xs"
                style={useCustom ? { background: "var(--accent)", color: "#fff" } : undefined}>
                Choose my own{customVerbs.length ? ` (${customVerbs.length})` : ""}
              </button>
            </div>
            <p className="text-xs muted mt-2">
              {useCustom
                ? `${customVerbs.length} verb${customVerbs.length === 1 ? "" : "s"} selected.`
                : `${groupVerbs.length} verbs — ${VERB_GROUPS.find((g) => g.id === group)?.description}`}
            </p>
            {useCustom && <VerbPicker selected={customVerbs} onChange={setCustomVerbs} />}
          </div>

          <div>
            <div className="text-sm font-semibold mb-2">Tenses</div>
            {["Indicativo", "Subjuntivo", "Imperativo", "Formas impersonales"].map((mood) => (
              <div key={mood} className="mb-2.5">
                <div className="text-xs muted mb-1.5">{mood}</div>
                <div className="flex flex-wrap gap-1.5">
                  {TENSES.filter((t) => t.mood === mood).map((t) => {
                    const on = tenses.includes(t.key);
                    return (
                      <button key={t.key} title={`${t.english} — e.g. ${t.example}`}
                        onClick={() => setTenses(on ? tenses.filter((x) => x !== t.key) : [...tenses, t.key])}
                        className="btn btn-ghost !py-1.5 !px-3 text-xs"
                        style={on ? { background: "var(--accent)", color: "#fff" } : undefined}>
                        {t.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="flex gap-2 mt-1">
              <button className="text-xs accent font-semibold" onClick={() => setTenses(TENSES.map((t) => t.key))}>Select all</button>
              <button className="text-xs muted font-semibold" onClick={() => setTenses([])}>Clear</button>
              <button className="text-xs accent font-semibold" onClick={() => setTenses(DEFAULT_TENSES)}>Just the basics</button>
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold mb-2">Subjects</div>
            <div className="flex flex-wrap gap-1.5">
              {PERSON_LABELS.map((p, i) => {
                const on = people.includes(i);
                return (
                  <button key={p} onClick={() => setPeople(on ? people.filter((x) => x !== i) : [...people, i].sort())}
                    className="btn btn-ghost !py-1.5 !px-3 text-xs"
                    style={on ? { background: "var(--accent)", color: "#fff" } : undefined}>
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold flex justify-between"><span>Questions</span><span className="muted">{length}</span></label>
            <input type="range" min={5} max={60} value={length} className="w-full mt-2 accent-[var(--accent)]"
              onChange={(e) => setLength(Number(e.target.value))} />
          </div>

          <Toggle checked={showEnglish} onChange={setShowEnglish} label="Show the English meaning in the prompt" />

          <button className="btn btn-primary w-full" onClick={build} disabled={!tenses.length}>
            {tenses.length ? `Start ${length}-question drill` : "Pick at least one tense"}
          </button>
        </div>

        <p className="text-sm muted">
          Want to look something up instead? <Link href="/tables" className="accent font-semibold">Browse full verb tables →</Link>
        </p>
      </div>
    );
  }

  /* ---------------- results ---------------- */
  if (finished) {
    const pct = Math.round((right / prompts.length) * 100);
    const tone = pct >= 80 ? "var(--good)" : pct >= 70 ? "var(--warn)" : "var(--bad)";
    return (
      <div className="max-w-3xl mx-auto">
        <div className="card-shell p-8 text-center">
          <div className="text-5xl font-extrabold" style={{ color: tone }}>{pct}%</div>
          <p className="muted mt-2">{right} of {prompts.length} correct in {Math.round((Date.now() - startedAt) / 1000)}s</p>
          <div className="flex flex-wrap gap-2 justify-center mt-5">
            {missed.length > 0 && (
              <button className="btn btn-primary" onClick={() => {
                const redo = prompts.filter((p) => missed.some((m) => m.correct === p.answer));
                setPrompts(shuffle(redo)); setIdx(0); setRight(0); setMissed([]); setInput(""); setFb(null); setStartedAt(Date.now());
              }}>Redo the {missed.length} I missed</button>
            )}
            <button className="btn btn-outline" onClick={build}>New drill, same settings</button>
            <button className="btn btn-ghost" onClick={() => setPrompts(null)}>Change settings</button>
          </div>
        </div>

        {missed.length > 0 && (
          <div className="card-shell p-5 mt-4">
            <h3 className="font-bold mb-3">What you missed</h3>
            <div className="space-y-2">
              {missed.map((m, i) => (
                <div key={i} className="text-sm rounded-lg p-3" style={{ background: "var(--surface-2)" }}>
                  <div className="font-medium">{m.prompt}</div>
                  <div style={{ color: "var(--bad)" }}>You wrote: {m.yours}</div>
                  <div style={{ color: "var(--good)" }}>Correct: {m.correct}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ---------------- drilling ---------------- */
  const meta = TENSE_BY_KEY[cur!.tense];
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 text-sm mb-4">
        <button className="btn btn-ghost !py-1 !px-3 text-xs" onClick={() => setPrompts(null)}>← Settings</button>
        <span className="muted">{idx + 1} / {prompts.length}</span>
        <div className="flex-1"><ProgressBar value={(idx / prompts.length) * 100} /></div>
        <span className="chip" style={{ color: "var(--good)" }}>{right}</span>
      </div>

      <div className="card-shell p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip">{meta.name}</span>
          <span className="chip">{meta.english}</span>
          {cur!.verb.tags?.filter((t) => t !== "top").map((t) => <span key={t} className="chip">{t}</span>)}
        </div>

        <div className="mt-4">
          <div className="text-3xl font-bold">{cur!.verb.infinitive}</div>
          {showEnglish && <div className="muted text-sm mt-0.5">{cur!.verb.english}</div>}
        </div>

        <div className="mt-5 flex items-baseline gap-3 flex-wrap">
          <span className="text-xl font-semibold" style={{ color: "var(--accent)" }}>
            {meta.single ? meta.name.toLowerCase() : PERSON_LABELS[cur!.person]}
          </span>
          <span className="muted">→</span>
        </div>

        <form className="mt-3 space-y-3" onSubmit={(e) => { e.preventDefault(); fb ? next() : check(); }}>
          <input ref={inputRef} className="input text-lg" placeholder="Type the conjugation…"
            value={input} disabled={!!fb} autoComplete="off" autoCapitalize="off" spellCheck={false}
            onChange={(e) => setInput(e.target.value)} />
          {!fb && <AccentKeys onInsert={(ch) => { setInput((v) => v + ch); inputRef.current?.focus(); }} />}
          {!fb && <button className="btn btn-primary" type="submit">Check</button>}
        </form>

        {fb && (
          <div className={`mt-5 rounded-xl p-4 pop ${fb.ok ? "" : "shake"}`}
            style={{ background: "var(--surface-2)", borderLeft: `3px solid ${fb.ok ? "var(--good)" : "var(--bad)"}` }}>
            <div className="font-semibold" style={{ color: fb.ok ? "var(--good)" : "var(--bad)" }}>
              {fb.ok ? "Correct" : "Not quite"}
            </div>
            <div className="text-sm mt-1">{fb.message ?? <>Answer: <strong>{fb.answer}</strong></>}</div>

            {!fb.ok && (
              <div className="mt-3">
                <div className="text-xs muted mb-1.5">Full {meta.name.toLowerCase()} of {cur!.verb.infinitive}</div>
                <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  {conjugate(cur!.verb, cur!.tense).map((f, i) => (
                    <div key={i} className="flex justify-between gap-2" style={{ opacity: i === cur!.person ? 1 : 0.65 }}>
                      <span className="muted">{PERSON_LABELS[i]}</span>
                      <span className="font-medium" style={i === cur!.person ? { color: "var(--good)" } : undefined}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-3">
              <button className="btn btn-primary" onClick={next} autoFocus>Continue →</button>
              <Link href={`/tables?verb=${encodeURIComponent(cur!.verb.infinitive)}`} className="btn btn-ghost text-sm">See every tense</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function VerbPicker({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  const [q, setQ] = useState("");
  const list = VERB_LIST.filter(
    (v) => v.infinitive.includes(q.toLowerCase()) || v.english.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <div className="mt-3 rounded-xl p-3" style={{ background: "var(--surface-2)" }}>
      <div className="flex gap-2">
        <input className="input !py-1.5 text-sm" placeholder="Search verbs…" value={q} onChange={(e) => setQ(e.target.value)} />
        {selected.length > 0 && <button className="btn btn-ghost !py-1.5 !px-3 text-xs" onClick={() => onChange([])}>Clear</button>}
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2.5 max-h-56 overflow-auto">
        {list.map((v) => {
          const on = selected.includes(v.infinitive);
          return (
            <button key={v.infinitive} title={v.english}
              onClick={() => onChange(on ? selected.filter((x) => x !== v.infinitive) : [...selected, v.infinitive])}
              className="btn btn-ghost !py-1 !px-2.5 text-xs"
              style={on ? { background: "var(--accent)", color: "#fff" } : undefined}>
              {v.infinitive}
            </button>
          );
        })}
      </div>
    </div>
  );
}
