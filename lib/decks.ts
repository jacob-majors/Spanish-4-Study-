/**
 * Conjugation decks — the Conjuguemos side of the app. Each one is a preset
 * for the drill rather than a vocabulary set, so they live here instead of in
 * the study-set store.
 */
export interface ConjugationDeck {
  id: string;
  name: string;
  description: string;
  /** Matches a VERB_GROUPS id in lib/conjugation/verbs.ts. */
  group: string;
  color: string;
}

export const CONJUGATION_DECKS: ConjugationDeck[] = [
  {
    id: "regular",
    name: "Regular verbs",
    description: "Straight -ar, -er and -ir verbs. Learn the endings cold before anything else.",
    group: "regular",
    color: "#29d391",
  },
  {
    id: "irregular",
    name: "Irregular verbs",
    description: "ser, ir, hacer, decir, tener, poder — the ones that break the rules.",
    group: "irregular",
    color: "#ff5a6a",
  },
  {
    id: "all",
    name: "All verbs",
    description: "Everything in the library, regular and irregular mixed together.",
    group: "all",
    color: "#6c5ce7",
  },
];

export function deckHref(deck: ConjugationDeck) {
  return `/conjugate?group=${deck.group}`;
}
