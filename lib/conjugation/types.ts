export type Person = 0 | 1 | 2 | 3 | 4 | 5;

export const PERSON_LABELS = [
  "yo",
  "tú",
  "él / ella / Ud.",
  "nosotros",
  "vosotros",
  "ellos / Uds.",
] as const;

export const PERSON_SHORT = ["yo", "tú", "él", "nos.", "vos.", "ellos"] as const;

export type TenseKey =
  | "presente"
  | "preterito"
  | "imperfecto"
  | "futuro"
  | "condicional"
  | "presentePerfecto"
  | "pluscuamperfecto"
  | "futuroPerfecto"
  | "condicionalPerfecto"
  | "subjPresente"
  | "subjImperfecto"
  | "subjImperfectoSe"
  | "subjPerfecto"
  | "subjPluscuamperfecto"
  | "imperativoAfirmativo"
  | "imperativoNegativo"
  | "gerundio"
  | "participio";

export interface TenseMeta {
  key: TenseKey;
  name: string;
  english: string;
  mood: "Indicativo" | "Subjuntivo" | "Imperativo" | "Formas impersonales";
  /** Rough ordering of when a US Spanish curriculum teaches it. */
  level: 1 | 2 | 3 | 4;
  /** Tenses with only one form (gerundio / participio). */
  single?: boolean;
  example: string;
}

export const TENSES: TenseMeta[] = [
  { key: "presente", name: "Presente", english: "I speak / I do speak", mood: "Indicativo", level: 1, example: "hablo" },
  { key: "preterito", name: "Pretérito", english: "I spoke", mood: "Indicativo", level: 2, example: "hablé" },
  { key: "imperfecto", name: "Imperfecto", english: "I used to speak / I was speaking", mood: "Indicativo", level: 2, example: "hablaba" },
  { key: "futuro", name: "Futuro", english: "I will speak", mood: "Indicativo", level: 2, example: "hablaré" },
  { key: "condicional", name: "Condicional", english: "I would speak", mood: "Indicativo", level: 3, example: "hablaría" },
  { key: "presentePerfecto", name: "Presente perfecto", english: "I have spoken", mood: "Indicativo", level: 3, example: "he hablado" },
  { key: "pluscuamperfecto", name: "Pluscuamperfecto", english: "I had spoken", mood: "Indicativo", level: 3, example: "había hablado" },
  { key: "futuroPerfecto", name: "Futuro perfecto", english: "I will have spoken", mood: "Indicativo", level: 4, example: "habré hablado" },
  { key: "condicionalPerfecto", name: "Condicional perfecto", english: "I would have spoken", mood: "Indicativo", level: 4, example: "habría hablado" },
  { key: "subjPresente", name: "Presente de subjuntivo", english: "(that) I speak", mood: "Subjuntivo", level: 3, example: "hable" },
  { key: "subjImperfecto", name: "Imperfecto de subjuntivo (-ra)", english: "(that) I spoke", mood: "Subjuntivo", level: 4, example: "hablara" },
  { key: "subjImperfectoSe", name: "Imperfecto de subjuntivo (-se)", english: "(that) I spoke", mood: "Subjuntivo", level: 4, example: "hablase" },
  { key: "subjPerfecto", name: "Perfecto de subjuntivo", english: "(that) I have spoken", mood: "Subjuntivo", level: 4, example: "haya hablado" },
  { key: "subjPluscuamperfecto", name: "Pluscuamperfecto de subjuntivo", english: "(that) I had spoken", mood: "Subjuntivo", level: 4, example: "hubiera hablado" },
  { key: "imperativoAfirmativo", name: "Imperativo afirmativo", english: "Speak!", mood: "Imperativo", level: 3, example: "habla" },
  { key: "imperativoNegativo", name: "Imperativo negativo", english: "Don't speak!", mood: "Imperativo", level: 3, example: "no hables" },
  { key: "gerundio", name: "Gerundio", english: "speaking", mood: "Formas impersonales", level: 2, single: true, example: "hablando" },
  { key: "participio", name: "Participio", english: "spoken", mood: "Formas impersonales", level: 2, single: true, example: "hablado" },
];

export const TENSE_BY_KEY: Record<TenseKey, TenseMeta> = Object.fromEntries(
  TENSES.map((t) => [t.key, t]),
) as Record<TenseKey, TenseMeta>;

/**
 * The tenses the app actually offers — what SA Spanish 4 covers.
 *
 * The engine still conjugates all 18 (and the tests still check them), so
 * adding a tense back is a one-line change here: drop its key into this list
 * and it reappears in the drill and the verb tables.
 */
export const ACTIVE_TENSE_KEYS: TenseKey[] = [
  "presente",
  "preterito",
  "imperfecto",
  "condicional",
];

export const ACTIVE_TENSES: TenseMeta[] = ACTIVE_TENSE_KEYS.map((k) => TENSE_BY_KEY[k]);

export type StemChange =
  | "e:ie"
  | "o:ue"
  | "e:i"
  | "u:ue"
  | "i:ie"
  | "accent:i"
  | "accent:u"
  | null;

export interface VerbEntry {
  infinitive: string;
  english: string;
  /** Boot / stem change in the present. */
  stem?: StemChange;
  /** Irregular first-person singular present, e.g. "tengo". */
  yo?: string;
  /** Irregular stem used by future + conditional, e.g. "tendr". */
  futureStem?: string;
  /** Strong (unaccented) preterite stem, e.g. "tuv". */
  preteriteStem?: string;
  /** Irregular past participle, e.g. "escrito". */
  participio?: string;
  /** Irregular gerund, e.g. "diciendo". */
  gerundio?: string;
  /** Irregular affirmative tú command, e.g. "ten". */
  tuCommand?: string;
  /** Fully irregular forms that override everything else. */
  forms?: Partial<Record<TenseKey, string[]>>;
  /** Reflexive verbs carry the pronoun in the infinitive. */
  reflexive?: boolean;
  tags?: string[];
}
