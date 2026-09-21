"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { parseCards, Delimiter, SAMPLE_PASTE } from "@/lib/parse";
import { upsertSet, uid } from "@/lib/storage";
import { Toggle } from "@/components/ui";

const COLORS = ["#6c5ce7", "#00c2a8", "#ffb020", "#ff5a6a", "#29d391", "#4aa8ff"];

const DELIM_OPTIONS: { value: Delimiter; label: string }[] = [
  { value: "auto", label: "Detect automatically" },
  { value: "tab", label: "Tab  (Quizlet export)" },
  { value: "comma", label: "Comma  (CSV)" },
  { value: "dash", label: "Dash  word - meaning" },
  { value: "equals", label: "Equals  word = meaning" },
  { value: "colon", label: "Colon  word: meaning" },
  { value: "semicolon", label: "Semicolon  word; meaning" },
];

export default function NewSetPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [raw, setRaw] = useState("");
  const [delimiter, setDelimiter] = useState<Delimiter>("auto");
  const [swap, setSwap] = useState(false);
  const [color, setColor] = useState(COLORS[0]);
  const [fileName, setFileName] = useState("");

  const parsed = useMemo(() => parseCards(raw, delimiter, swap), [raw, delimiter, swap]);

  async function onFile(file: File) {
    const text = await file.text();
    setRaw(text);
    setFileName(file.name);
    if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
  }

  function create() {
    if (!parsed.cards.length) return;
    const id = uid();
    upsertSet({
      id,
      title: title.trim() || "Untitled set",
      description: description.trim(),
      cards: parsed.cards,
      color,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      progress: {},
    });
    router.push(`/sets/${id}`);
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">New study set</h1>
        <p className="muted text-sm mt-1">
          Paste a list, drop in a file, or type terms by hand. Spanish on the left, English on the right.
        </p>
      </div>

      <div className="card-shell p-5 space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-semibold">Title</label>
            <input className="input mt-1.5" placeholder="Unit 3 — El medio ambiente" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-semibold">Description <span className="muted font-normal">(optional)</span></label>
            <input className="input mt-1.5" placeholder="Chapter 3 vocab + subjunctive triggers" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold">Color</label>
          <div className="flex gap-2 mt-1.5">
            {COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)} aria-label={`Color ${c}`}
                className="w-7 h-7 rounded-full transition-transform"
                style={{ background: c, outline: color === c ? "2px solid var(--text)" : "none", outlineOffset: 2 }} />
            ))}
          </div>
        </div>
      </div>

      <div className="card-shell p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-bold">Your terms</h2>
          <label className="btn btn-outline text-sm cursor-pointer ml-auto">
            Upload .csv / .txt / .tsv / .json
            <input type="file" accept=".csv,.txt,.tsv,.json,text/plain,text/csv,application/json"
              className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          </label>
          <button className="btn btn-ghost text-sm" onClick={() => setRaw(SAMPLE_PASTE)}>Use an example</button>
        </div>
        {fileName && <p className="text-xs muted">Loaded <strong>{fileName}</strong>.</p>}

        <textarea
          className="input font-mono text-sm min-h-56"
          placeholder={"hablar\tto speak\nla amistad\tfriendship\n\nQuizlet export, CSV, JSON, or one pair per line."}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
        />

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm muted">Separator</span>
            <select className="input !w-auto !py-1.5 text-sm" value={delimiter} onChange={(e) => setDelimiter(e.target.value as Delimiter)}>
              {DELIM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <Toggle checked={swap} onChange={setSwap} label="Swap sides (English is on the left)" />
        </div>

        <div className="rounded-xl p-3" style={{ background: "var(--surface-2)" }}>
          <div className="text-sm font-semibold flex items-center gap-2">
            Preview
            <span className="chip">{parsed.cards.length} term{parsed.cards.length === 1 ? "" : "s"}</span>
            {parsed.skipped > 0 && <span className="chip" style={{ color: "var(--warn)" }}>{parsed.skipped} line(s) skipped</span>}
            {raw.trim() && <span className="chip">split on {parsed.delimiter}</span>}
          </div>
          {parsed.cards.length ? (
            <div className="mt-2.5 max-h-56 overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-xs muted">
                  <tr><th className="text-left font-medium pb-1.5">Spanish</th><th className="text-left font-medium pb-1.5">English</th></tr>
                </thead>
                <tbody>
                  {parsed.cards.slice(0, 50).map((c) => (
                    <tr key={c.id} style={{ borderTop: "1px solid var(--border)" }}>
                      <td className="py-1.5 pr-3">{c.term}</td>
                      <td className="py-1.5 muted">{c.def}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsed.cards.length > 50 && <p className="text-xs muted mt-2">…and {parsed.cards.length - 50} more.</p>}
            </div>
          ) : (
            <p className="text-sm muted mt-1.5">
              Nothing parsed yet. Each line needs a term and a meaning — try another separator if your
              list looks right but nothing shows up.
            </p>
          )}
        </div>

        <button className="btn btn-primary w-full md:w-auto" disabled={!parsed.cards.length} onClick={create}>
          Create set with {parsed.cards.length} term{parsed.cards.length === 1 ? "" : "s"}
        </button>
      </div>
    </div>
  );
}
