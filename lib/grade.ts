/** Answer checking that is strict about the word and forgiving about the typing. */

const ACCENT_MAP: Record<string, string> = {
  á: "a", é: "e", í: "i", ó: "o", ú: "u", ü: "u", ñ: "n",
  Á: "a", É: "e", Í: "i", Ó: "o", Ú: "u", Ü: "u", Ñ: "n",
};

export function stripAccents(s: string): string {
  return s.replace(/[áéíóúüñÁÉÍÓÚÜÑ]/g, (c) => ACCENT_MAP[c] ?? c);
}

export function normalize(s: string): string {
  return stripAccents(s.trim().toLowerCase())
    .replace(/[¿?¡!.,;:"'`]/g, "")
    .replace(/\s+/g, " ");
}

/** Drop leading articles and "to " so "to run" matches "run". */
function core(s: string): string {
  return normalize(s)
    .replace(/^(to|the|a|an|el|la|los|las|un|una|unos|unas)\s+/g, "")
    .trim();
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  const cur = new Array(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur.slice();
  }
  return prev[n];
}

export type Verdict = "correct" | "accent" | "typo" | "wrong";

export interface GradeResult {
  verdict: Verdict;
  /** Counts as right for scoring purposes. */
  pass: boolean;
  message?: string;
  /** The accepted alternative that matched, when there was more than one. */
  matched?: string;
}

/**
 * Grade a typed answer. Accepted answers may be separated by "/" or "," in the
 * card definition, so "to leave / to go out" accepts either half.
 */
export function grade(
  input: string,
  expected: string,
  opts: { requireAccents?: boolean; allowTypos?: boolean } = {},
): GradeResult {
  const { requireAccents = false, allowTypos = true } = opts;
  const given = input.trim();
  if (!given) return { verdict: "wrong", pass: false };

  const alts = expected
    .split(/\s*[\/;]\s*|\s*,\s*(?![^(]*\))/)
    .map((a) => a.trim())
    .filter(Boolean);
  const candidates = alts.length ? alts : [expected];

  let best: GradeResult = { verdict: "wrong", pass: false };

  for (const alt of candidates) {
    // Exact, including accents and case.
    if (given.toLowerCase() === alt.trim().toLowerCase())
      return { verdict: "correct", pass: true, matched: alt };

    // Same letters, different accents.
    if (normalize(given) === normalize(alt)) {
      if (requireAccents) {
        best = {
          verdict: "accent",
          pass: false,
          message: `Watch the accents — it's "${alt}".`,
          matched: alt,
        };
        continue;
      }
      return { verdict: "accent", pass: true, message: `Close — the accents go: "${alt}"`, matched: alt };
    }

    // Ignore a leading "to"/article on either side.
    if (core(given) === core(alt) && core(alt).length > 0)
      return { verdict: "correct", pass: true, matched: alt };

    if (allowTypos) {
      const a = normalize(given), b = normalize(alt);
      const tolerance = b.length <= 4 ? 0 : b.length <= 8 ? 1 : 2;
      const d = levenshtein(a, b);
      if (d > 0 && d <= tolerance && best.verdict === "wrong") {
        best = {
          verdict: "typo",
          pass: true,
          message: `Typo — the answer is "${alt}".`,
          matched: alt,
        };
      }
    }
  }
  return best;
}

/** Grading for conjugation drills: accents always count. */
export function gradeConjugation(input: string, expected: string): GradeResult {
  const given = input.trim().toLowerCase().replace(/\s+/g, " ");
  const want = expected.trim().toLowerCase();
  if (given === want) return { verdict: "correct", pass: true };
  if (normalize(given) === normalize(want))
    return { verdict: "accent", pass: false, message: `Right word, wrong accents: ${expected}` };
  return { verdict: "wrong", pass: false };
}
