"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSet } from "@/lib/useSet";
import { upsertSet, uid, deleteSet } from "@/lib/storage";
import { parseCards } from "@/lib/parse";
import { SetHeader, NotFound } from "@/components/SetHeader";
import { Card } from "@/lib/types";

export default function EditPage() {
  const { set, ready } = useSet();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cards, setCards] = useState<Card[]>([]);
  const [bulk, setBulk] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!set) return;
    setTitle(set.title);
    setDescription(set.description ?? "");
    setCards(set.cards);
  }, [set?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!set) return ready ? <NotFound /> : null;

  function save() {
    if (!set) return;
    const clean = cards.filter((c) => c.term.trim() && c.def.trim());
    upsertSet({ ...set, title: title.trim() || "Untitled set", description: description.trim(), cards: clean, updatedAt: Date.now() });
    setCards(clean);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  function addBulk() {
    const { cards: parsed } = parseCards(bulk);
    if (!parsed.length) return;
    setCards([...cards, ...parsed]);
    setBulk("");
  }

  return (
    <div className="max-w-3xl mx-auto">
      <SetHeader set={set} mode="Edit" />

      <div className="card-shell p-5 space-y-3">
        <div>
          <label className="text-sm font-semibold">Title</label>
          <input className="input mt-1.5" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-semibold">Description</label>
          <input className="input mt-1.5" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </div>

      <div className="flex items-center gap-3 mt-5 mb-3">
        <h2 className="font-bold">{cards.length} terms</h2>
        <button className="btn btn-ghost !py-1 !px-3 text-xs ml-auto"
          onClick={() => setCards([...cards, { id: uid(), term: "", def: "" }])}>+ Add a row</button>
      </div>

      <div className="space-y-1.5">
        {cards.map((c, i) => (
          <div key={c.id} className="card-shell p-2.5 flex flex-wrap items-center gap-2">
            <span className="chip shrink-0">{i + 1}</span>
            <input className="input !py-1.5 flex-1 min-w-40" placeholder="Spanish" value={c.term}
              onChange={(e) => setCards(cards.map((x) => (x.id === c.id ? { ...x, term: e.target.value } : x)))} />
            <input className="input !py-1.5 flex-1 min-w-40" placeholder="English" value={c.def}
              onChange={(e) => setCards(cards.map((x) => (x.id === c.id ? { ...x, def: e.target.value } : x)))} />
            <button className="btn btn-ghost !p-2 !rounded-lg shrink-0" style={{ color: "var(--bad)" }}
              aria-label="Remove row" onClick={() => setCards(cards.filter((x) => x.id !== c.id))}>✕</button>
          </div>
        ))}
      </div>

      <div className="card-shell p-5 mt-5">
        <h3 className="font-bold">Paste in more terms</h3>
        <textarea className="input font-mono text-sm min-h-28 mt-2"
          placeholder={"la sequía\tdrought\nel bienestar\twell-being"}
          value={bulk} onChange={(e) => setBulk(e.target.value)} />
        <button className="btn btn-outline mt-2.5 text-sm" onClick={addBulk} disabled={!bulk.trim()}>
          Append to this set
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mt-5 sticky bottom-4">
        <button className="btn btn-primary" onClick={save}>{saved ? "Saved ✓" : "Save changes"}</button>
        <button className="btn btn-ghost" onClick={() => router.push(`/sets/${set.id}`)}>Done</button>
        <button className="btn btn-ghost ml-auto" style={{ color: "var(--bad)" }}
          onClick={() => {
            if (confirm(`Delete "${set.title}" and all of its progress?`)) { deleteSet(set.id); router.push("/sets"); }
          }}>Delete set</button>
      </div>
    </div>
  );
}
