"use client";

import { StudySet } from "./types";
import { uid, load, update } from "./storage";

function mk(title: string, description: string, color: string, rows: [string, string][]): StudySet {
  return {
    id: uid(),
    title,
    description,
    color,
    cards: rows.map(([term, def]) => ({ id: uid(), term, def })),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    progress: {},
  };
}

const SUBJUNCTIVE: [string, string][] = [
  ["Espero que...", "I hope that... (Wish → subjunctive)"],
  ["Quiero que...", "I want that... (Want → subjunctive)"],
  ["Es importante que...", "It's important that... (Impersonal → subjunctive)"],
  ["Dudo que...", "I doubt that... (Doubt → subjunctive)"],
  ["No creo que...", "I don't think that... (Denial → subjunctive)"],
  ["Me alegra que...", "It makes me happy that... (Emotion → subjunctive)"],
  ["Ojalá que...", "Hopefully / I wish that... (always subjunctive)"],
  ["Recomiendo que...", "I recommend that... (Recommendation → subjunctive)"],
  ["Es posible que...", "It's possible that... (Doubt → subjunctive)"],
  ["Antes de que...", "Before... (always subjunctive)"],
  ["Para que...", "So that... (always subjunctive)"],
  ["A menos que...", "Unless... (always subjunctive)"],
  ["Con tal de que...", "Provided that... (always subjunctive)"],
  ["Sin que...", "Without... (always subjunctive)"],
  ["En caso de que...", "In case... (always subjunctive)"],
  ["Cuando (future)", "When — subjunctive only if the action hasn't happened yet"],
  ["Es cierto que...", "It's certain that... — indicative, not subjunctive"],
  ["Creo que...", "I think that... — indicative, not subjunctive"],
  ["Es obvio que...", "It's obvious that... — indicative, not subjunctive"],
  ["Sé que...", "I know that... — indicative, not subjunctive"],
];

const CONNECTORS: [string, string][] = [
  ["sin embargo", "however, nevertheless"],
  ["aunque", "although, even though"],
  ["por lo tanto", "therefore"],
  ["además", "in addition, besides"],
  ["por otro lado", "on the other hand"],
  ["en cambio", "on the other hand, instead"],
  ["a pesar de", "in spite of, despite"],
  ["debido a", "due to, because of"],
  ["ya que", "since, given that"],
  ["puesto que", "since, because"],
  ["por consiguiente", "consequently"],
  ["en resumen", "in summary"],
  ["en conclusión", "in conclusion"],
  ["por ejemplo", "for example"],
  ["es decir", "that is to say, in other words"],
  ["mientras tanto", "meanwhile"],
  ["de hecho", "in fact"],
  ["al fin y al cabo", "in the end, after all"],
  ["a medida que", "as, while"],
  ["tan pronto como", "as soon as"],
  ["siempre y cuando", "as long as"],
  ["por si acaso", "just in case"],
];

const CORE: [string, string][] = [
  ["el desarrollo", "development"],
  ["el desafío", "challenge"],
  ["el logro", "achievement"],
  ["la meta", "goal"],
  ["el apoyo", "support"],
  ["la amenaza", "threat"],
  ["el riesgo", "risk"],
  ["la ventaja", "advantage"],
  ["la desventaja", "disadvantage"],
  ["el aumento", "increase, rise"],
  ["la disminución", "decrease"],
  ["el medio ambiente", "the environment"],
  ["el calentamiento global", "global warming"],
  ["la contaminación", "pollution"],
  ["el reciclaje", "recycling"],
  ["la sequía", "drought"],
  ["los recursos naturales", "natural resources"],
  ["la ciudadanía", "citizenship"],
  ["la desigualdad", "inequality"],
  ["la pobreza", "poverty"],
  ["el bienestar", "well-being"],
  ["la inmigración", "immigration"],
  ["la frontera", "border"],
  ["los derechos humanos", "human rights"],
  ["la herencia cultural", "cultural heritage"],
  ["el orgullo", "pride"],
  ["la costumbre", "custom, habit"],
  ["el ocio", "leisure"],
  ["la red social", "social network"],
  ["la pantalla", "screen"],
  ["el noticiero", "news broadcast"],
  ["la encuesta", "survey, poll"],
  ["el propósito", "purpose"],
  ["el punto de vista", "point of view"],
  ["la investigación", "research"],
  ["el promedio", "average"],
  ["la sabiduría", "wisdom"],
  ["el esfuerzo", "effort"],
  ["la confianza", "trust, confidence"],
  ["el fracaso", "failure"],
];

export function seedIfEmpty(): boolean {
  const data = load();
  if (data.sets.length > 0) return false;
  update((d) => {
    d.sets = [
      mk("Spanish 4 — Core vocabulary", "Themed AP-style vocabulary: society, environment, culture.", "#6c5ce7", CORE),
      mk("Subjunctive triggers", "WEIRDO phrases, plus the indicative traps that look like triggers.", "#00c2a8", SUBJUNCTIVE),
      mk("Connectors & transitions", "The glue words that make essays and presentations sound fluent.", "#ffb020", CONNECTORS),
    ];
  });
  return true;
}
