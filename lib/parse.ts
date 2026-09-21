import { Card } from "./types";
import { uid } from "./storage";

export type Delimiter = "auto" | "tab" | "comma" | "dash" | "equals" | "colon" | "semicolon";

const DELIMS: Record<Exclude<Delimiter, "auto">, RegExp> = {
  tab: /\t+/,
  comma: /\s*,\s*/,
  dash: /\s+[-–—]\s+/,
  equals: /\s*=\s*/,
  colon: /\s*:\s*/,
  semicolon: /\s*;\s*/,
};

/** Guess which separator a pasted list uses by seeing which splits most lines cleanly. */
export function detectDelimiter(text: string): Exclude<Delimiter, "auto"> {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 40);
  if (!lines.length) return "tab";
  let best: Exclude<Delimiter, "auto"> = "tab";
  let bestScore = -1;
  for (const name of Object.keys(DELIMS) as Exclude<Delimiter, "auto">[]) {
    const re = DELIMS[name];
    const score = lines.filter((l) => {
      const parts = l.split(re);
      return parts.length === 2 && parts[0].trim() && parts[1].trim();
    }).length;
    if (score > bestScore) {
      bestScore = score;
      best = name;
    }
  }
  return best;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === "," || ch === "\t") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export interface ParseResult {
  cards: Card[];
  skipped: number;
  delimiter: string;
}

/**
 * Accepts anything a student is likely to have on hand: a Quizlet export, a
 * CSV or TSV file, a JSON array, or a plain "word - meaning" list.
 */
export function parseCards(text: string, delimiter: Delimiter = "auto", swap = false): ParseResult {
  const trimmed = text.trim();
  if (!trimmed) return { cards: [], skipped: 0, delimiter: "none" };

  // JSON array of {term, def} or [term, def] pairs
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const data = JSON.parse(trimmed);
      const arr = Array.isArray(data) ? data : data.cards ?? data.terms ?? [];
      const cards: Card[] = [];
      for (const row of arr) {
        let term = "", def = "";
        if (Array.isArray(row)) { term = String(row[0] ?? ""); def = String(row[1] ?? ""); }
        else if (row && typeof row === "object") {
          term = String(row.term ?? row.spanish ?? row.front ?? row.word ?? "");
          def = String(row.def ?? row.definition ?? row.english ?? row.back ?? row.meaning ?? "");
        }
        if (term && def) cards.push(makeCard(term, def, swap));
      }
      if (cards.length) return { cards, skipped: 0, delimiter: "JSON" };
    } catch {
      /* fall through to line parsing */
    }
  }

  const useCsv = delimiter === "auto" && /,|\t/.test(trimmed) && trimmed.includes('"');
  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const chosen = delimiter === "auto" ? detectDelimiter(trimmed) : delimiter;
  const re = DELIMS[chosen];

  const cards: Card[] = [];
  let skipped = 0;
  for (const line of lines) {
    let parts = useCsv ? splitCsvLine(line) : line.split(re);
    if (parts.length > 2) {
      // Extra columns join back onto the definition: "hablar, to speak, to talk"
      parts = [parts[0], parts.slice(1).join(", ")];
    }
    const [a, b] = parts.map((p) => (p ?? "").trim());
    if (!a || !b) { skipped++; continue; }
    if (/^(term|word|spanish|front)$/i.test(a)) continue; // header row
    cards.push(makeCard(a, b, swap));
  }
  return { cards, skipped, delimiter: chosen };
}

function makeCard(term: string, def: string, swap: boolean): Card {
  const t = swap ? def : term;
  const d = swap ? term : def;
  return { id: uid(), term: t.replace(/^"|"$/g, ""), def: d.replace(/^"|"$/g, "") };
}

export const SAMPLE_PASTE = `hablar\tto speak
la amistad\tfriendship
el desarrollo\tdevelopment
aunque\talthough
sin embargo\thowever`;
