import { TenseKey, VerbEntry, StemChange } from "./types";
import { VERB_LIST, VERB_MAP } from "./verbs";

/* ------------------------------------------------------------------ *
 * Small helpers
 * ------------------------------------------------------------------ */

const VOWELS = "aeiouáéíóú";

/** Strip a reflexive pronoun so the stem logic sees a plain infinitive. */
function splitReflexive(inf: string): { base: string; reflexive: boolean } {
  if (/(ar|er|ir)se$/.test(inf)) return { base: inf.slice(0, -2), reflexive: true };
  return { base: inf, reflexive: false };
}

function ending(inf: string): "ar" | "er" | "ir" {
  // oír / reír / freír carry an accent on the infinitive ending.
  return inf.slice(-2).replace("í", "i") as "ar" | "er" | "ir";
}

function stemOf(inf: string): string {
  return inf.slice(0, -2);
}

/**
 * Apply a boot stem change to the LAST stressable vowel of the stem.
 * pensar -> piens, volver -> vuelv, pedir -> pid, jugar -> jueg.
 */
function applyStemChange(stem: string, change: StemChange): string {
  if (!change) return stem;
  const [from, to] = change.split(":");
  if (from === "accent") {
    // enviar -> envío, continuar -> continúo
    const target = to === "i" ? "i" : "u";
    const accented = to === "i" ? "í" : "ú";
    const idx = stem.lastIndexOf(target);
    if (idx === -1) return stem;
    return stem.slice(0, idx) + accented + stem.slice(idx + 1);
  }
  const idx = stem.lastIndexOf(from);
  if (idx === -1) return stem;
  return stem.slice(0, idx) + to + stem.slice(idx + 1);
}

/** Secondary change used by -ir verbs outside the boot: e->i, o->u. */
function weakenStem(stem: string, change: StemChange): string {
  if (change === "e:ie" || change === "e:i") return applyStemChange(stem, "e:i");
  if (change === "o:ue") return applyStemChange(stem, "o:u" as StemChange);
  return stem;
}

/** Spelling changes that protect the sound of the final consonant. */
function orthoBeforeE(stem: string): string {
  if (stem.endsWith("c")) return stem.slice(0, -1) + "qu"; // buscar -> busqué
  if (stem.endsWith("g")) return stem + "u"; // llegar -> llegué
  if (stem.endsWith("gu")) return stem.slice(0, -2) + "gü"; // averiguar -> averigüé
  if (stem.endsWith("z")) return stem.slice(0, -1) + "c"; // empezar -> empecé
  return stem;
}

function orthoBeforeAO(stem: string, inf: string): string {
  if (ending(inf) === "ar") return stem; // -ar verbs never change before o/a
  if (stem.endsWith("g")) return stem.slice(0, -1) + "j"; // coger -> cojo
  if (stem.endsWith("gu")) return stem.slice(0, -2) + "g"; // seguir -> sigo
  if (stem.endsWith("qu")) return stem.slice(0, -2) + "c"; // delinquir -> delinco
  if (stem.endsWith("c")) return stem.slice(0, -1) + "z"; // vencer -> venzo
  return stem;
}

function isVowel(ch: string) {
  return VOWELS.includes(ch);
}

/* ------------------------------------------------------------------ *
 * Endings
 * ------------------------------------------------------------------ */

const PRESENT_ENDINGS = {
  ar: ["o", "as", "a", "amos", "áis", "an"],
  er: ["o", "es", "e", "emos", "éis", "en"],
  ir: ["o", "es", "e", "imos", "ís", "en"],
};

const PRETERITE_ENDINGS = {
  ar: ["é", "aste", "ó", "amos", "asteis", "aron"],
  er: ["í", "iste", "ió", "imos", "isteis", "ieron"],
  ir: ["í", "iste", "ió", "imos", "isteis", "ieron"],
};

const STRONG_PRETERITE_ENDINGS = ["e", "iste", "o", "imos", "isteis", "ieron"];

const IMPERFECT_ENDINGS = {
  ar: ["aba", "abas", "aba", "ábamos", "abais", "aban"],
  er: ["ía", "ías", "ía", "íamos", "íais", "ían"],
  ir: ["ía", "ías", "ía", "íamos", "íais", "ían"],
};

const FUTURE_ENDINGS = ["é", "ás", "á", "emos", "éis", "án"];
const CONDITIONAL_ENDINGS = ["ía", "ías", "ía", "íamos", "íais", "ían"];

const SUBJ_ENDINGS = {
  ar: ["e", "es", "e", "emos", "éis", "en"],
  er: ["a", "as", "a", "amos", "áis", "an"],
  ir: ["a", "as", "a", "amos", "áis", "an"],
};

const HABER: Record<string, string[]> = {
  presente: ["he", "has", "ha", "hemos", "habéis", "han"],
  imperfecto: ["había", "habías", "había", "habíamos", "habíais", "habían"],
  futuro: ["habré", "habrás", "habrá", "habremos", "habréis", "habrán"],
  condicional: ["habría", "habrías", "habría", "habríamos", "habríais", "habrían"],
  subjPresente: ["haya", "hayas", "haya", "hayamos", "hayáis", "hayan"],
  subjImperfecto: ["hubiera", "hubieras", "hubiera", "hubiéramos", "hubierais", "hubieran"],
};

/* ------------------------------------------------------------------ *
 * Reflexive pronoun placement
 * ------------------------------------------------------------------ */

const REFLEXIVE_PRONOUNS = ["me", "te", "se", "nos", "os", "se"];

/** Add a written accent so a command keeps its original stress when a pronoun attaches. */
function accentForPronoun(word: string): string {
  // Find the stressed vowel: for words ending in a vowel/n/s stress falls on the
  // penultimate syllable, which is what we need to mark once a syllable is added.
  if (/[áéíóú]/.test(word)) return word;
  const syllableVowels: number[] = [];
  for (let i = 0; i < word.length; i++) {
    if (isVowel(word[i])) {
      // skip the second half of a diphthong
      if (i > 0 && isVowel(word[i - 1]) && "iu".includes(word[i])) continue;
      if (i > 0 && isVowel(word[i - 1]) && "iu".includes(word[i - 1])) {
        syllableVowels[syllableVowels.length - 1] = i;
        continue;
      }
      syllableVowels.push(i);
    }
  }
  if (syllableVowels.length < 2) return word;
  const last = word[word.length - 1];
  const idx =
    isVowel(last) || last === "n" || last === "s"
      ? syllableVowels[syllableVowels.length - 2]
      : syllableVowels[syllableVowels.length - 1];
  const map: Record<string, string> = { a: "á", e: "é", i: "í", o: "ó", u: "ú" };
  return word.slice(0, idx) + (map[word[idx]] ?? word[idx]) + word.slice(idx + 1);
}

/* ------------------------------------------------------------------ *
 * Core builders
 * ------------------------------------------------------------------ */

function presente(v: VerbEntry, inf: string): string[] {
  const end = ending(inf);
  const stem = stemOf(inf);
  const boot = applyStemChange(stem, v.stem ?? null);
  const out = PRESENT_ENDINGS[end].map((e, i) => {
    const useBoot = i !== 3 && i !== 4;
    let s = useBoot ? boot : stem;
    // -uir verbs insert y everywhere but nosotros/vosotros (construyo)
    if (/uir$/.test(inf) && !/guir$/.test(inf) && useBoot) s = s + "y";
    if (i === 0) s = orthoBeforeAO(s, inf);
    return s + e;
  });
  if (v.yo) out[0] = v.yo;
  return out;
}

function preteriteStemForms(v: VerbEntry, inf: string): string[] | null {
  if (!v.preteriteStem) return null;
  const stem = v.preteriteStem;
  const jStem = stem.endsWith("j");
  return STRONG_PRETERITE_ENDINGS.map((e, i) => {
    if (i === 5 && jStem) return stem + "eron";
    return stem + e;
  });
}

function preterito(v: VerbEntry, inf: string): string[] {
  const strong = preteriteStemForms(v, inf);
  if (strong) return strong;

  const end = ending(inf);
  const stem = stemOf(inf);
  const isIr = end === "ir";
  const vowelStem = stem.length > 0 && isVowel(stem[stem.length - 1]) && !/guir$|quir$/.test(inf);

  return PRETERITE_ENDINGS[end].map((e, i) => {
    let s = stem;
    let suffix = e;

    if (i === 0 && end === "ar") s = orthoBeforeE(s);

    // -ir boot verbs weaken in the third persons: pidió, durmieron
    if (isIr && v.stem && (i === 2 || i === 5)) s = weakenStem(stem, v.stem);

    if (vowelStem && (end === "er" || end === "ir")) {
      // leer -> leí, leíste, leyó, leímos, leísteis, leyeron
      const uStem = stem.endsWith("u"); // construir: no accent marks
      if (i === 2) suffix = "yó";
      else if (i === 5) suffix = "yeron";
      else if (!uStem && (i === 0 || i === 1 || i === 3 || i === 4)) {
        suffix = suffix.replace(/^i/, "í").replace(/^í/, "í");
        if (i === 1) suffix = "íste";
        if (i === 3) suffix = "ímos";
        if (i === 4) suffix = "ísteis";
      }
    } else if (/(ñ|ll)$/.test(s) && (i === 2 || i === 5)) {
      // gruñir -> gruñó, gruñeron ; bullir -> bulló, bulleron
      suffix = suffix.replace(/^i/, "");
    }

    return s + suffix;
  });
}

function imperfecto(v: VerbEntry, inf: string): string[] {
  return IMPERFECT_ENDINGS[ending(inf)].map((e) => stemOf(inf) + e);
}

function futuro(v: VerbEntry, inf: string): string[] {
  const base = v.futureStem ?? inf;
  return FUTURE_ENDINGS.map((e) => base + e);
}

function condicional(v: VerbEntry, inf: string): string[] {
  const base = v.futureStem ?? inf;
  return CONDITIONAL_ENDINGS.map((e) => base + e);
}

function subjPresente(v: VerbEntry, inf: string): string[] {
  const end = ending(inf);
  const stem = stemOf(inf);
  const boot = applyStemChange(stem, v.stem ?? null);
  // An irregular yo form carries into the whole subjunctive: tengo -> tenga,
  // conozco -> conozcamos. A plain boot change does not (empiezo -> empecemos).
  const derived = v.yo && v.yo.endsWith("o") ? v.yo.slice(0, -1) : stem;
  const useDerived = derived !== stem && derived !== boot;

  return SUBJ_ENDINGS[end].map((e, i) => {
    const inBoot = i !== 3 && i !== 4;
    let s: string;
    if (useDerived) {
      s = derived;
    } else if (inBoot) {
      s = boot;
    } else if (end === "ir" && v.stem) {
      s = weakenStem(stem, v.stem); // pidamos, durmamos, sintamos
    } else {
      s = stem;
    }
    // spelling guards apply to the whole paradigm
    s = end === "ar" ? orthoBeforeE(s) : useDerived ? s : orthoBeforeAO(s, inf);
    return s + e;
  });
}

function subjImperfecto(v: VerbEntry, inf: string, variant: "ra" | "se"): string[] {
  const third = resolve(v, inf, "preterito")[5];
  const base = third.replace(/ron$/, "");
  const suffixes =
    variant === "ra"
      ? ["ra", "ras", "ra", "ramos", "rais", "ran"]
      : ["se", "ses", "se", "semos", "seis", "sen"];
  return suffixes.map((s, i) => {
    if (i === 3) {
      // accent the vowel before the ending: habláramos, comiéramos
      const m = /([aeiou])([^aeiou]*)$/.exec(base);
      if (m) {
        const map: Record<string, string> = { a: "á", e: "é", i: "í", o: "ó", u: "ú" };
        const idx = m.index;
        return base.slice(0, idx) + map[m[1]] + base.slice(idx + 1) + s;
      }
    }
    return base + s;
  });
}

function gerundio(v: VerbEntry, inf: string): string {
  if (v.gerundio) return v.gerundio;
  const end = ending(inf);
  const stem = stemOf(inf);
  if (end === "ar") return stem + "ando";
  let s = stem;
  if (end === "ir" && v.stem) s = weakenStem(stem, v.stem);
  if (s.length && isVowel(s[s.length - 1]) && !/guir$|quir$/.test(inf)) return s + "yendo";
  if (/(ñ|ll)$/.test(s)) return s + "endo";
  return s + "iendo";
}

function participio(v: VerbEntry, inf: string): string {
  if (v.participio) return v.participio;
  const end = ending(inf);
  const stem = stemOf(inf);
  if (end === "ar") return stem + "ado";
  if (stem.length && isVowel(stem[stem.length - 1]) && !/guir$|quir$/.test(inf)) {
    return stem + "ído"; // leído, traído, oído
  }
  return stem + "ido";
}

function compound(haberKey: string, part: string): string[] {
  return HABER[haberKey].map((h) => `${h} ${part}`);
}

function imperativoAfirmativo(v: VerbEntry, inf: string): string[] {
  const pres = resolve(v, inf, "presente");
  const subj = resolve(v, inf, "subjPresente");
  const tu = v.tuCommand ?? pres[2];
  const vosotros = stemOf(inf) + (ending(inf) === "ir" ? "id" : ending(inf) === "er" ? "ed" : "ad");
  const nosotros = inf === "ir" ? "vamos" : subj[3];
  return ["—", tu, subj[2], nosotros, vosotros, subj[5]];
}

function imperativoNegativo(v: VerbEntry, inf: string): string[] {
  const subj = resolve(v, inf, "subjPresente");
  return ["—", `no ${subj[1]}`, `no ${subj[2]}`, `no ${subj[3]}`, `no ${subj[4]}`, `no ${subj[5]}`];
}

/* ------------------------------------------------------------------ *
 * Reflexive wrapping
 * ------------------------------------------------------------------ */

function wrapReflexive(forms: string[], tense: TenseKey): string[] {
  if (tense === "gerundio" || tense === "participio") return forms;

  if (tense === "imperativoAfirmativo") {
    return forms.map((f, i) => {
      if (i === 0 || f === "—") return "—";
      let pron = REFLEXIVE_PRONOUNS[i];
      let word = f;
      if (i === 3) word = word.replace(/s$/, ""); // sentémonos
      if (i === 4) {
        word = word.replace(/d$/, ""); // sentaos
        pron = "os";
        return word + pron;
      }
      const joined = word + pron;
      return joined.length > word.length + 1 || word.split(/[aeiouáéíóú]/).length > 2
        ? accentForPronoun(word) + pron
        : joined;
    });
  }

  if (tense === "imperativoNegativo") {
    return forms.map((f, i) => {
      if (i === 0 || f === "—") return "—";
      return f.replace(/^no /, `no ${REFLEXIVE_PRONOUNS[i]} `);
    });
  }

  return forms.map((f, i) => `${REFLEXIVE_PRONOUNS[i]} ${f}`);
}

/* ------------------------------------------------------------------ *
 * Public API
 * ------------------------------------------------------------------ */

/** Apply the rules for one tense, ignoring any per-verb overrides. */
function computeRaw(v: VerbEntry, inf: string, tense: TenseKey): string[] {
  let forms: string[];
  switch (tense) {
    case "presente":
      forms = presente(v, inf);
      break;
    case "preterito":
      forms = preterito(v, inf);
      break;
    case "imperfecto":
      forms = imperfecto(v, inf);
      break;
    case "futuro":
      forms = futuro(v, inf);
      break;
    case "condicional":
      forms = condicional(v, inf);
      break;
    case "subjPresente":
      forms = subjPresente(v, inf);
      break;
    case "subjImperfecto":
      forms = subjImperfecto(v, inf, "ra");
      break;
    case "subjImperfectoSe":
      forms = subjImperfecto(v, inf, "se");
      break;
    case "presentePerfecto":
      forms = compound("presente", participio(v, inf));
      break;
    case "pluscuamperfecto":
      forms = compound("imperfecto", participio(v, inf));
      break;
    case "futuroPerfecto":
      forms = compound("futuro", participio(v, inf));
      break;
    case "condicionalPerfecto":
      forms = compound("condicional", participio(v, inf));
      break;
    case "subjPerfecto":
      forms = compound("subjPresente", participio(v, inf));
      break;
    case "subjPluscuamperfecto":
      forms = compound("subjImperfecto", participio(v, inf));
      break;
    case "imperativoAfirmativo":
      forms = imperativoAfirmativo(v, inf);
      break;
    case "imperativoNegativo":
      forms = imperativoNegativo(v, inf);
      break;
    case "gerundio":
      forms = Array(6).fill(gerundio(v, inf));
      break;
    case "participio":
      forms = Array(6).fill(participio(v, inf));
      break;
    default:
      forms = Array(6).fill("");
  }
  return forms;
}

/**
 * The rule output with the verb table's overrides layered on top. Tenses that
 * are built from other tenses (the imperative, the imperfect subjunctive) call
 * this so they inherit irregular forms such as "fueron" -> "fuera".
 */
function resolve(v: VerbEntry, inf: string, tense: TenseKey): string[] {
  const override = v.forms?.[tense];
  if (override && override.length === 6 && override.every(Boolean)) return override.slice();
  const forms = computeRaw(v, inf, tense);
  if (override) override.forEach((val, i) => { if (val) forms[i] = val; });
  return forms;
}

export function conjugate(verb: VerbEntry | string, tense: TenseKey): string[] {
  const v: VerbEntry =
    typeof verb === "string" ? VERB_MAP[verb] ?? { infinitive: verb, english: "" } : verb;

  const { base, reflexive } = splitReflexive(v.infinitive);
  const isReflexive = v.reflexive ?? reflexive;
  const inf = isReflexive && v.infinitive.endsWith("se") ? v.infinitive.slice(0, -2) : base;

  const forms = resolve(v, inf, tense);

  // Reflexive verbs carry their pronoun: "me levanto", "levántate", "me he levantado".
  return isReflexive ? wrapReflexive(forms, tense) : forms;
}

export function conjugateOne(verb: VerbEntry | string, tense: TenseKey, person: number): string {
  return conjugate(verb, tense)[person] ?? "";
}

export function fullTable(verb: VerbEntry | string, tenses: TenseKey[]) {
  return tenses.map((t) => ({ tense: t, forms: conjugate(verb, t) }));
}

export { VERB_LIST, VERB_MAP };
