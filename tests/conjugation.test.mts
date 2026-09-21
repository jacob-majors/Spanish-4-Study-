/**
 * Conjugation engine tests.
 *
 *   npx tsx tests/conjugation.test.mts
 *
 * Full-paradigm cases check every person; spot checks pin down one tricky form;
 * the sweep catches anything structurally broken across the whole verb table.
 */
import { conjugate } from "../lib/conjugation/engine";
import { VERB_LIST } from "../lib/conjugation/verbs";
import { TENSES, TenseKey } from "../lib/conjugation/types";

type Full = [string, TenseKey, string[]];
const paradigms: Full[] = [
  ["hablar","presente",["hablo","hablas","habla","hablamos","habláis","hablan"]],
  ["comer","presente",["como","comes","come","comemos","coméis","comen"]],
  ["vivir","presente",["vivo","vives","vive","vivimos","vivís","viven"]],
  ["ser","presente",["soy","eres","es","somos","sois","son"]],
  ["tener","presente",["tengo","tienes","tiene","tenemos","tenéis","tienen"]],
  ["pedir","presente",["pido","pides","pide","pedimos","pedís","piden"]],
  ["jugar","presente",["juego","juegas","juega","jugamos","jugáis","juegan"]],
  ["construir","presente",["construyo","construyes","construye","construimos","construís","construyen"]],
  ["seguir","presente",["sigo","sigues","sigue","seguimos","seguís","siguen"]],
  ["conocer","presente",["conozco","conoces","conoce","conocemos","conocéis","conocen"]],
  ["escoger","presente",["escojo","escoges","escoge","escogemos","escogéis","escogen"]],
  ["enviar","presente",["envío","envías","envía","enviamos","enviáis","envían"]],
  ["continuar","presente",["continúo","continúas","continúa","continuamos","continuáis","continúan"]],
  ["oír","presente",["oigo","oyes","oye","oímos","oís","oyen"]],
  ["levantarse","presente",["me levanto","te levantas","se levanta","nos levantamos","os levantáis","se levantan"]],

  ["hablar","preterito",["hablé","hablaste","habló","hablamos","hablasteis","hablaron"]],
  ["comer","preterito",["comí","comiste","comió","comimos","comisteis","comieron"]],
  ["buscar","preterito",["busqué","buscaste","buscó","buscamos","buscasteis","buscaron"]],
  ["llegar","preterito",["llegué","llegaste","llegó","llegamos","llegasteis","llegaron"]],
  ["empezar","preterito",["empecé","empezaste","empezó","empezamos","empezasteis","empezaron"]],
  ["leer","preterito",["leí","leíste","leyó","leímos","leísteis","leyeron"]],
  ["construir","preterito",["construí","construiste","construyó","construimos","construisteis","construyeron"]],
  ["pedir","preterito",["pedí","pediste","pidió","pedimos","pedisteis","pidieron"]],
  ["dormir","preterito",["dormí","dormiste","durmió","dormimos","dormisteis","durmieron"]],
  ["tener","preterito",["tuve","tuviste","tuvo","tuvimos","tuvisteis","tuvieron"]],
  ["decir","preterito",["dije","dijiste","dijo","dijimos","dijisteis","dijeron"]],
  ["hacer","preterito",["hice","hiciste","hizo","hicimos","hicisteis","hicieron"]],
  ["ir","preterito",["fui","fuiste","fue","fuimos","fuisteis","fueron"]],
  ["dar","preterito",["di","diste","dio","dimos","disteis","dieron"]],
  ["conducir","preterito",["conduje","condujiste","condujo","condujimos","condujisteis","condujeron"]],

  ["ser","imperfecto",["era","eras","era","éramos","erais","eran"]],
  ["ir","imperfecto",["iba","ibas","iba","íbamos","ibais","iban"]],
  ["ver","imperfecto",["veía","veías","veía","veíamos","veíais","veían"]],
  ["hablar","imperfecto",["hablaba","hablabas","hablaba","hablábamos","hablabais","hablaban"]],

  ["tener","futuro",["tendré","tendrás","tendrá","tendremos","tendréis","tendrán"]],
  ["hacer","futuro",["haré","harás","hará","haremos","haréis","harán"]],
  ["poder","condicional",["podría","podrías","podría","podríamos","podríais","podrían"]],

  ["hablar","subjPresente",["hable","hables","hable","hablemos","habléis","hablen"]],
  ["comer","subjPresente",["coma","comas","coma","comamos","comáis","coman"]],
  ["tener","subjPresente",["tenga","tengas","tenga","tengamos","tengáis","tengan"]],
  ["empezar","subjPresente",["empiece","empieces","empiece","empecemos","empecéis","empiecen"]],
  ["jugar","subjPresente",["juegue","juegues","juegue","juguemos","juguéis","jueguen"]],
  ["buscar","subjPresente",["busque","busques","busque","busquemos","busquéis","busquen"]],
  ["pedir","subjPresente",["pida","pidas","pida","pidamos","pidáis","pidan"]],
  ["dormir","subjPresente",["duerma","duermas","duerma","durmamos","durmáis","duerman"]],
  ["sentir","subjPresente",["sienta","sientas","sienta","sintamos","sintáis","sientan"]],
  ["ser","subjPresente",["sea","seas","sea","seamos","seáis","sean"]],
  ["ir","subjPresente",["vaya","vayas","vaya","vayamos","vayáis","vayan"]],
  ["conocer","subjPresente",["conozca","conozcas","conozca","conozcamos","conozcáis","conozcan"]],
  ["seguir","subjPresente",["siga","sigas","siga","sigamos","sigáis","sigan"]],
  ["escoger","subjPresente",["escoja","escojas","escoja","escojamos","escojáis","escojan"]],

  ["hablar","subjImperfecto",["hablara","hablaras","hablara","habláramos","hablarais","hablaran"]],
  ["comer","subjImperfecto",["comiera","comieras","comiera","comiéramos","comierais","comieran"]],
  ["tener","subjImperfecto",["tuviera","tuvieras","tuviera","tuviéramos","tuvierais","tuvieran"]],
  ["ir","subjImperfecto",["fuera","fueras","fuera","fuéramos","fuerais","fueran"]],
  ["decir","subjImperfectoSe",["dijese","dijeses","dijese","dijésemos","dijeseis","dijesen"]],

  ["escribir","participio",Array(6).fill("escrito")],
  ["leer","participio",Array(6).fill("leído")],
  ["volver","participio",Array(6).fill("vuelto")],
  ["hablar","gerundio",Array(6).fill("hablando")],
  ["pedir","gerundio",Array(6).fill("pidiendo")],
  ["dormir","gerundio",Array(6).fill("durmiendo")],
  ["leer","gerundio",Array(6).fill("leyendo")],
  ["ir","gerundio",Array(6).fill("yendo")],

  ["hablar","presentePerfecto",["he hablado","has hablado","ha hablado","hemos hablado","habéis hablado","han hablado"]],
  ["ver","pluscuamperfecto",["había visto","habías visto","había visto","habíamos visto","habíais visto","habían visto"]],
  ["hacer","subjPerfecto",["haya hecho","hayas hecho","haya hecho","hayamos hecho","hayáis hecho","hayan hecho"]],

  ["hablar","imperativoAfirmativo",["—","habla","hable","hablemos","hablad","hablen"]],
  ["hacer","imperativoAfirmativo",["—","haz","haga","hagamos","haced","hagan"]],
  ["ir","imperativoAfirmativo",["—","ve","vaya","vamos","id","vayan"]],
  ["ser","imperativoAfirmativo",["—","sé","sea","seamos","sed","sean"]],
  ["tener","imperativoAfirmativo",["—","ten","tenga","tengamos","tened","tengan"]],
  ["hablar","imperativoNegativo",["—","no hables","no hable","no hablemos","no habléis","no hablen"]],
  ["levantarse","imperativoAfirmativo",["—","levántate","levántese","levantémonos","levantaos","levántense"]],
  ["levantarse","imperativoNegativo",["—","no te levantes","no se levante","no nos levantemos","no os levantéis","no se levanten"]],
  ["levantarse","presentePerfecto",["me he levantado","te has levantado","se ha levantado","nos hemos levantado","os habéis levantado","se han levantado"]],
];

type Spot = [string, TenseKey, number, string];
const spots: Spot[] = [
  ["vestirse","imperativoAfirmativo",1,"vístete"],
  ["divertirse","imperativoAfirmativo",1,"diviértete"],
  ["sentarse","imperativoAfirmativo",1,"siéntate"],
  ["acostarse","imperativoAfirmativo",1,"acuéstate"],
  ["lavarse","imperativoAfirmativo",1,"lávate"],
  ["irse","imperativoAfirmativo",1,"vete"],
  ["ponerse","imperativoAfirmativo",1,"ponte"],
  ["levantarse","imperativoAfirmativo",4,"levantaos"],
  ["hacer","imperativoNegativo",1,"no hagas"],
  ["saber","presente",0,"sé"],
  ["saber","preterito",0,"supe"],
  ["caber","presente",0,"quepo"],
  ["traer","preterito",5,"trajeron"],
  ["oír","gerundio",0,"oyendo"],
  ["reír","preterito",2,"rió"],
  ["oler","presente",0,"huelo"],
  ["morir","participio",0,"muerto"],
  ["freír","participio",0,"frito"],
  ["freír","preterito",5,"frieron"],
  ["elegir","presente",0,"elijo"],
  ["vencer","presente",0,"venzo"],
  ["dormirse","presente",0,"me duermo"],
  ["dormirse","preterito",2,"se durmió"],
  ["quejarse","subjPresente",0,"me queje"],
  ["conducir","subjPresente",0,"conduzca"],
  ["valer","futuro",0,"valdré"],
  ["querer","condicional",0,"querría"],
  ["ver","presentePerfecto",0,"he visto"],
  ["abrir","participio",0,"abierto"],
  ["gustar","presente",2,"gusta"],

  // Verbs added from the SA Spanish 4 packets
  ["volar","presente",0,"vuelo"],
  ["herir","preterito",2,"hirió"],
  ["hervir","presente",2,"hierve"],
  ["hervir","gerundio",0,"hirviendo"],
  ["juzgar","preterito",0,"juzgué"],
  ["juzgar","subjPresente",0,"juzgue"],
  ["machacar","preterito",0,"machaqué"],
  ["agregar","subjPresente",3,"agreguemos"],
  ["fortalecer","presente",0,"fortalezco"],
  ["fortalecer","subjPresente",0,"fortalezca"],
  ["reducir","preterito",5,"redujeron"],
  ["caerse","presente",0,"me caigo"],
  ["caerse","preterito",2,"se cayó"],
  ["secarse","preterito",0,"me sequé"],
  ["relajarse","imperativoAfirmativo",1,"relájate"],
  ["enojarse","imperativoNegativo",1,"no te enojes"],
  ["toser","presente",0,"toso"],
  ["combatir","presente",3,"combatimos"],
];

let pass = 0, total = 0;
const fails: string[] = [];

for (const [inf, tense, expect] of paradigms) {
  total++;
  const got = conjugate(inf, tense);
  if (got.length === 6 && got.every((g, i) => g === expect[i])) pass++;
  else fails.push(`${inf} / ${tense}\n   got:  ${got.join(", ")}\n   want: ${expect.join(", ")}`);
}

for (const [inf, tense, i, want] of spots) {
  total++;
  const got = conjugate(inf, tense)[i];
  if (got === want) pass++;
  else fails.push(`${inf} / ${tense} [${i}]  got "${got}"  want "${want}"`);
}

const broken: string[] = [];
for (const v of VERB_LIST) {
  for (const t of TENSES) {
    conjugate(v, t.key).forEach((f, i) => {
      if (f === "—") return;
      if (!f || /undefined|NaN/.test(f) || f.length < 2) broken.push(`${v.infinitive}/${t.key}[${i}] = "${f}"`);
    });
  }
}

console.log(`${pass}/${total} assertions passed`);
console.log(`sweep: ${VERB_LIST.length} verbs x ${TENSES.length} tenses, ${broken.length} structural problems`);
if (fails.length) console.log("\nFAILURES:\n" + fails.join("\n"));
if (broken.length) console.log("\nBROKEN:\n" + broken.slice(0, 40).join("\n"));
if (fails.length || broken.length) process.exit(1);
