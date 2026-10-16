/**
 * Curriculum · niveles de inglés (MCER) divididos en subniveles jugables
 * ----------------------------------------------------------------------
 * Cada nivel tiene tantos subniveles como exige su aprendizaje:
 *   A1 · 8   A2 · 8   B1 · 8   B1+ · 6   B2 · 8   B2+ · 6   C1 · 8
 * Cada subnivel es un mapa con su propio bioma, enemigos, objetivo y foco pedagógico:
 *   tags    gramática practicada (etiquetas de las frases por completar / ordenar)
 *   topics  vocabulario (temas de las palabras flotantes)
 * Se juegan A1 y A2 (16 mapas); B1 en adelante aparecen en el índice como «próximamente».
 *
 * Integración de las 4 destrezas en las mecánicas:
 *   Reading   frases por completar y ordenar oraciones en combate.
 *   Writing   ordenar oraciones (construir la frase palabra a palabra).
 *   Listening palabras y frases habladas: el golpe flotante «🔊 LISTEN» y el dictado en combate.
 *   Speaking  retos de pronunciación con micrófono en combate y en los Santuarios de la Voz.
 */

import { A1_WORDS, A1_TOPICS, A1_FILL, A1_ORDER } from "./Vocabulary.js";
import { A2_TOPICS, A2_FILL, A2_ORDER } from "./LessonsA2.js";

export const CEFR = Object.freeze([
  { id: "A1", name: "Beginner", es: "Principiante", count: 8, realm: 1 },
  { id: "A2", name: "Elementary", es: "Elemental", count: 8, realm: 1 },
  { id: "B1", name: "Intermediate", es: "Intermedio", count: 8, realm: 2 },
  { id: "B1+", name: "Intermediate+", es: "Intermedio alto", count: 6, realm: 2 },
  { id: "B2", name: "Upper-Intermediate", es: "Intermedio-avanzado", count: 8, realm: 3 },
  { id: "B2+", name: "Upper-Intermediate+", es: "Avanzado bajo", count: 6, realm: 3 },
  { id: "C1", name: "Advanced", es: "Avanzado", count: 8, realm: 4 },
]);

/** Foco de cada subnivel (todos los niveles; solo A1 y A2 son jugables todavía). */
const FOCUS = {
  "B1": ["Past simple vs continuous", "Present perfect vs past", "Future forms", "Relative clauses", "Passive voice", "First & second conditionals", "Reported speech basics", "B1 exam"],
  "B1+": ["Phrasal verbs I", "False friends I", "Used to / would", "Quantifiers & articles", "Gerunds & infinitives", "B1+ exam"],
  "B2": ["Third conditional", "Wish & if only", "Modals of deduction", "Advanced passive", "Reported speech", "Linking & contrast", "Participle clauses", "B2 exam"],
  "B2+": ["Phrasal verbs II", "Collocations", "Inversion basics", "Idioms I", "Nuance & register", "B2+ exam"],
  "C1": ["Mixed conditionals", "Inversion", "Cleft sentences", "Advanced idioms", "Discourse markers", "Subjunctive & formal style", "Nuance & irony", "C1 final exam"],
};

/** Definición de los subniveles jugables. `biome`: clave de paleta en index.html. */
export const SUBLEVELS = Object.freeze([
  /* ---------------------------- A1 ---------------------------- */
  { id: "A1.1", level: "A1", n: 1, name: "The Awakening", es: "El Despertar", biome: "forest", R: 1000, start: "crater", focus: "Greetings and the verb to be", focusEs: "Saludos y el verbo to be",
    tags: ["tobe", "articles"], topics: ["family", "body", "colors"], lakes: [{ r: [70, 105] }], hills: [{ tiers: 2, r: [112, 128] }], houses: [{ u: 0.46, n: 2 }],
    enemies: [{ kind: "karr", count: 9 }], goal: { type: "puzzle" }, allies: [{ id: "aria", u: 0.2 }], shop: 0.27, arcU: 0.82, torches: 0, darkness: 0.38, interior: 250, loot: [46, 5] },
  { id: "A1.2", level: "A1", n: 2, name: "Whispering Brook", es: "El Arroyo Susurrante", biome: "forest", R: 1000, focus: "Have / has and plurals", focusEs: "Have / has y plurales",
    tags: ["have", "plurals", "tobe"], topics: ["animals", "nature"], lakes: [{ r: [80, 115], bridge: true }, { r: [60, 85] }], hills: [], houses: [{ u: 0.4, n: 1 }],
    enemies: [{ kind: "karr", count: 9 }, { kind: "skoll", count: 2 }], goal: { type: "kills", n: 8 }, allies: [{ id: "benny", u: 0.3 }], shop: 0.5, torches: 6, darkness: 0.45, interior: 260, loot: [48, 5] },
  { id: "A1.3", level: "A1", n: 3, name: "Amber Fields", es: "Campos Ámbar", biome: "amber", R: 1050, focus: "Present simple: every day", focusEs: "Presente simple: cada día",
    tags: ["present", "there", "articles"], topics: ["food", "house"], lakes: [{ r: [60, 90] }], hills: [], houses: [{ u: 0.3, n: 2 }, { u: 0.7, n: 2 }],
    enemies: [{ kind: "karr", count: 8 }, { kind: "skoll", count: 4 }], goal: { type: "kills", n: 10 }, allies: [{ id: "mileva", u: 0.35 }], shop: 0.55, torches: 8, darkness: 0.4, interior: 280, loot: [52, 5] },
  { id: "A1.4", level: "A1", n: 4, name: "Howling Hollow", es: "El Hueco Aullante", biome: "hollow", R: 1100, focus: "Places, this/that and prepositions", focusEs: "Lugares, this/that y preposiciones",
    tags: ["preps", "demo", "there"], topics: ["places", "things"], lakes: [{ r: [80, 115] }], hills: [{ tiers: 2, r: [114, 132] }], houses: [{ u: 0.3, n: 2 }, { u: 0.74, n: 1 }],
    enemies: [{ kind: "karr", count: 6 }, { kind: "skoll", count: 5 }], goal: { type: "boss", bosses: ["karrAlpha"] }, ruinSites: [0.3, 0.5, 0.7], torches: 14, darkness: 0.75, interior: 300, loot: [50, 6] },
  { id: "A1.5", level: "A1", n: 5, name: "The Drowned Hamlet", es: "La Aldea Anegada", biome: "marsh", R: 1150, focus: "Questions and can / can't", focusEs: "Preguntas y can / can't",
    tags: ["wh", "can", "imper"], topics: ["school", "verbs"], lakes: [{ r: [95, 135], bridge: true }, { r: [75, 105] }, { r: [60, 85] }], hills: [], houses: [{ u: 0.22, n: 2 }, { u: 0.5, n: 3 }, { u: 0.78, n: 2 }],
    enemies: [{ kind: "karr", count: 7 }, { kind: "skoll", count: 7 }], goal: { type: "kills", n: 10 }, allies: [{ id: "chloe", u: 0.3 }], shop: 0.4, torches: 12, darkness: 0.58, interior: 280, loot: [56, 6] },
  { id: "A1.6", level: "A1", n: 6, name: "Lantern Orchard", es: "El Huerto de los Faroles", biome: "forest", R: 1100, focus: "Adjectives, colors and comparisons", focusEs: "Adjetivos, colores y comparaciones",
    tags: ["adj", "imper", "likes"], topics: ["colors", "adjectives"], lakes: [{ r: [60, 90] }], hills: [{ tiers: 2, r: [110, 126] }], houses: [{ u: 0.5, n: 2 }],
    enemies: [{ kind: "karr", count: 6 }, { kind: "skoll", count: 8 }], goal: { type: "kills", n: 12 }, shop: 0.35, torches: 18, darkness: 0.62, interior: 300, loot: [56, 6] },
  { id: "A1.7", level: "A1", n: 7, name: "Stormspine Foothills", es: "Las Faldas de la Tormenta", biome: "peaks", R: 1200, focus: "Likes, time and numbers", focusEs: "Gustos, la hora y los números",
    tags: ["likes", "preps", "vocab"], topics: ["time", "numbers"], lakes: [{ r: [60, 90] }], hills: [{ tiers: 3, r: [165, 180], snow: true }, { tiers: 2, r: [114, 130], snow: true }], houses: [{ u: 0.55, n: 1 }],
    enemies: [{ kind: "skoll", count: 10 }, { kind: "karr", count: 3 }, { kind: "ignis", count: 4 }], goal: { type: "summit" }, torches: 14, darkness: 0.6, interior: 300, loot: [60, 6] },
  { id: "A1.8", level: "A1", n: 8, name: "The Wolf King's Den", es: "La Guarida del Rey Lobo", biome: "hollow", R: 1150, focus: "A1 exam: everything together", focusEs: "Examen A1: todo junto",
    tags: ["tobe", "have", "present", "can", "wh", "preps", "adj", "likes", "vocab"], topics: ["animals", "nature", "family", "food", "places", "verbs"], lakes: [{ r: [70, 100] }], hills: [], houses: [{ u: 0.4, n: 2 }],
    enemies: [{ kind: "skoll", count: 9 }, { kind: "karr", count: 6 }], goal: { type: "boss", bosses: ["skollQueen"] }, ruinSites: [0.25, 0.45, 0.65, 0.85], torches: 16, darkness: 0.8, interior: 320, loot: [60, 6] },

  /* ---------------------------- A2 ---------------------------- */
  { id: "A2.1", level: "A2", n: 1, name: "Misty Crossing", es: "El Cruce Brumoso", biome: "marsh", R: 1150, focus: "Past simple: regular verbs", focusEs: "Pasado simple: verbos regulares",
    tags: ["pastReg"], topics: ["travel", "weather"], lakes: [{ r: [95, 135], bridge: true }, { r: [70, 100] }], hills: [], houses: [{ u: 0.35, n: 2 }],
    enemies: [{ kind: "skoll", count: 8 }, { kind: "karr", count: 4 }, { kind: "ignis", count: 3 }], goal: { type: "kills", n: 12 }, shop: 0.4, torches: 10, darkness: 0.62, interior: 280, loot: [56, 6] },
  { id: "A2.2", level: "A2", n: 2, name: "Harvest Ruins", es: "Ruinas de la Cosecha", biome: "amber", R: 1200, focus: "Past simple: irregular verbs", focusEs: "Pasado simple: verbos irregulares",
    tags: ["pastIrr", "pastReg"], topics: ["town", "jobs"], lakes: [{ r: [60, 90] }], hills: [{ tiers: 2, r: [114, 130] }], houses: [{ u: 0.3, n: 3 }, { u: 0.7, n: 2 }],
    enemies: [{ kind: "skoll", count: 8 }, { kind: "ignis", count: 5 }], goal: { type: "kills", n: 12 }, shop: 0.5, torches: 10, darkness: 0.5, interior: 300, loot: [60, 6] },
  { id: "A2.3", level: "A2", n: 3, name: "Ashen Village", es: "La Aldea de Ceniza", biome: "hollow", R: 1150, focus: "The future: will and going to", focusEs: "El futuro: will y going to",
    tags: ["future", "pastIrr"], topics: ["shopping", "feelings"], lakes: [], hills: [], houses: [{ u: 0.2, n: 3 }, { u: 0.5, n: 3 }, { u: 0.8, n: 2 }],
    enemies: [{ kind: "skoll", count: 7 }, { kind: "ignis", count: 7 }], goal: { type: "kills", n: 14 }, shop: 0.45, torches: 14, darkness: 0.72, interior: 300, loot: [62, 6] },
  { id: "A2.4", level: "A2", n: 4, name: "Chains of the Pack", es: "Las Cadenas de la Manada", biome: "hollow", R: 1250, focus: "Present perfect: Rufus and Shela", focusEs: "Present perfect: Rufus y Shela",
    tags: ["presPerf"], topics: ["adventure", "nature2"], lakes: [{ r: [80, 115] }], hills: [{ tiers: 2, r: [114, 132] }], houses: [{ u: 0.3, n: 2 }, { u: 0.74, n: 2 }],
    enemies: [{ kind: "skoll", count: 6 }, { kind: "karr", count: 4 }, { kind: "ignis", count: 4 }], goal: { type: "boss", bosses: ["rufus", "shela"] }, ruinSites: [0.2, 0.36, 0.52, 0.68, 0.84], torches: 16, darkness: 0.8, interior: 300, loot: [62, 6] },
  { id: "A2.5", level: "A2", n: 5, name: "Frostspine Pass", es: "El Paso Espinaescarcha", biome: "peaks", R: 1250, focus: "Comparatives and superlatives", focusEs: "Comparativos y superlativos",
    tags: ["compare", "presPerf"], topics: ["health", "time2"], lakes: [{ r: [60, 90] }], hills: [{ tiers: 3, r: [165, 185], snow: true }, { tiers: 2, r: [114, 130], snow: true }], houses: [{ u: 0.55, n: 1 }],
    enemies: [{ kind: "skoll", count: 12 }, { kind: "ignis", count: 5 }], goal: { type: "summit" }, torches: 14, darkness: 0.58, interior: 310, loot: [62, 6] },
  { id: "A2.6", level: "A2", n: 6, name: "Crimson Woods", es: "Bosques Carmesí", biome: "forest", R: 1200, focus: "Modal verbs: must, should, can", focusEs: "Verbos modales: must, should, can",
    tags: ["modals", "compare"], topics: ["jobs", "adventure"], lakes: [{ r: [70, 100] }], hills: [{ tiers: 2, r: [110, 126] }], houses: [{ u: 0.45, n: 2 }],
    enemies: [{ kind: "skoll", count: 9 }, { kind: "ignis", count: 8 }, { kind: "karr", count: 4 }], goal: { type: "kills", n: 16 }, shop: 0.3, torches: 16, darkness: 0.72, interior: 320, loot: [64, 6] },
  { id: "A2.7", level: "A2", n: 7, name: "The Sunken Library", es: "La Biblioteca Hundida", biome: "marsh", R: 1200, focus: "Conditionals, linkers and quantity", focusEs: "Condicionales, conectores y cantidades",
    tags: ["cond", "quant", "modals"], topics: ["town", "time2", "nature2"], lakes: [{ r: [95, 135], bridge: true }, { r: [75, 105] }, { r: [60, 85] }], hills: [], houses: [{ u: 0.25, n: 3 }, { u: 0.55, n: 3 }, { u: 0.8, n: 1 }],
    enemies: [{ kind: "skoll", count: 9 }, { kind: "ignis", count: 8 }], goal: { type: "kills", n: 14 }, shop: 0.5, torches: 14, darkness: 0.62, interior: 300, loot: [64, 6] },
  { id: "A2.8", level: "A2", n: 8, name: "The Lexicon Sanctum", es: "El Santuario del Léxico", biome: "sanctum", R: 900, focus: "A2 exam: the Lexicon Golem", focusEs: "Examen A2: el Gólem del Léxico",
    tags: ["pastReg", "pastIrr", "future", "presPerf", "compare", "modals", "cond", "quant"], topics: ["adventure", "town", "jobs"], lakes: [], hills: [], houses: [], reverse: true,
    enemies: [], goal: { type: "golem" }, torches: 14, darkness: 0.66, interior: 150, loot: [20, 3] },
]);

export const SUB_BY_ID = Object.freeze(Object.fromEntries(SUBLEVELS.map((s) => [s.id, s])));
export const SUB_ORDER = Object.freeze(SUBLEVELS.map((s) => s.id));
export const nextSub = (id) => SUB_ORDER[SUB_ORDER.indexOf(id) + 1] || null;

/** Índice completo de todos los niveles y subniveles (los no jugables salen bloqueados). */
export function syllabus() {
  return CEFR.map((lv) => ({
    ...lv,
    subs: Array.from({ length: lv.count }, (_, i) => {
      const id = `${lv.id}.${i + 1}`;
      const real = SUB_BY_ID[id];
      return real ? { id, name: real.name, es: real.es, focus: real.focus, focusEs: real.focusEs, playable: true }
        : { id, name: FOCUS[lv.id]?.[i] || `${lv.id} · ${i + 1}`, es: "", focus: FOCUS[lv.id]?.[i] || "", focusEs: "", playable: false };
    }),
  }));
}

/* ======================================================================
   BANCOS Y SELECCIÓN DE PREGUNTAS
   ====================================================================== */
const rnd = (n) => Math.floor(Math.random() * n);
const pick = (a) => a[rnd(a.length)];
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const TOPICS = { ...A1_TOPICS, ...A2_TOPICS };
const cache = new Map();

/** Mazos del subnivel: palabras, frases por completar, oraciones por ordenar y repaso de subniveles anteriores. */
export function decks(sub) {
  if (cache.has(sub.id)) return cache.get(sub.id);
  const isA2 = sub.level === "A2";
  const words = [...new Map(sub.topics.flatMap((t) => TOPICS[t] || []).map((p) => [p[0], p])).values()];
  const fillPool = (tags) => [...A1_FILL, ...A2_FILL].filter((f) => tags.includes(f.tag));
  const orderPool = (tags) => [...A1_ORDER.map((o, i) => ({ ...o, tag: "a1o", i })), ...A2_ORDER].filter((o) => tags.includes(o.tag) || (o.tag === "a1o" && !isA2 && o.i % 8 <= sub.n));
  // repaso: contenido de subniveles anteriores del mismo nivel y, en A2, un poco de A1
  const prev = SUBLEVELS.filter((s) => s.level === sub.level && s.n < sub.n).flatMap((s) => s.tags);
  const reviewTags = [...new Set([...prev, ...(isA2 ? ["tobe", "present", "can"] : [])])];
  const d = {
    words: words.length >= 6 ? words : A1_WORDS,
    fill: fillPool(sub.tags),
    review: fillPool(reviewTags.length ? reviewTags : sub.tags),
    order: orderPool(sub.tags),
    orderReview: orderPool([...sub.tags, ...reviewTags, "a1o"]),
  };
  if (d.fill.length < 6) d.fill = fillPool(sub.tags.concat(["vocab", "tobe"]));
  cache.set(sub.id, d);
  return d;
}

/** Tres opciones de traducción para una palabra (la correcta + 2 distractores del mismo banco). */
export function wordOptions(sub, pair = null) {
  const d = decks(sub);
  const p = pair || pick(d.words);
  const wrong = shuffle(d.words.filter((q) => q[0] !== p[0] && q[1] !== p[1])).slice(0, 2).map((q) => q[1]);
  const options = shuffle([p[1], ...wrong]);
  return { word: p[0], es: p[1], options, answer: options.indexOf(p[1]) };
}

/** Opciones de palabras en inglés para una pregunta de escucha: la palabra oída y 2 parecidas. */
export function listenOptions(sub) {
  const d = decks(sub);
  const p = pick(d.words);
  const near = shuffle(d.words.filter((q) => q[0] !== p[0])).slice(0, 2).map((q) => q[0]);
  const options = shuffle([p[0], ...near]);
  return { say: p[0], es: p[1], options, answer: options.indexOf(p[0]) };
}

/**
 * Pregunta del combate por turnos según el nivel de dificultad del ataque:
 *   tier "A1" (básico): frase por completar o dictado.   tier "A2" (especial): ordenar oración o repaso.
 * Devuelve un objeto con `type`: fill | order | listen | speak.
 */
export function combatQuestion(sub, tier, { voice = true, speaking = false, useCount = 0 } = {}) {
  const d = decks(sub);
  const r = Math.random();
  if (speaking && tier === "A1" && useCount % 3 === 2) {
    const o = pick(d.order.length ? d.order : A1_ORDER);
    const phrase = o.words.join(" ").replace(/ \?$/, "?").replace(/ \./g, ".");
    return { type: "speak", phrase, es: o.es, limit: 26000 };
  }
  if (tier === "A1") {
    if (voice && r < 0.28) {
      const o = pick(d.order.length ? d.order : A1_ORDER);
      const sentence = o.words.join(" ").replace(/ \?$/, "?");
      const others = shuffle((d.order.length > 3 ? d.order : A1_ORDER).filter((x) => x !== o)).slice(0, 2).map((x) => x.words.join(" ").replace(/ \?$/, "?"));
      const options = shuffle([sentence, ...others]);
      return { type: "listen", say: sentence, es: o.es, o: options, a: options.indexOf(sentence), ex: `Escuchaste: «${sentence}» = ${o.es}` };
    }
    return pick(d.fill);
  }
  if (r < 0.62 && d.order.length) {
    const it = pick(d.order);
    return { type: "order", words: it.words, es: it.es, pp: !!it.pp, hint: it.pp ? "Order the words in the present perfect" : "Order the words · build the sentence", note: it.pp ? "Present perfect: have/has + participio." : "Sujeto + verbo + complemento.", limit: 20000 + it.words.length * 1500 };
  }
  return pick(d.review.length ? d.review : d.fill);
}

/**
 * Golpe en tiempo real: palabra a traducir, frase por completar o palabra para escuchar.
 * Devuelve {kind:"word"|"fill"|"listen", word, options, answer, say?, explain?}.
 */
export function strikeChallenge(sub, { voice = true, hard = false } = {}) {
  const d = decks(sub);
  const r = Math.random();
  if (voice && r < 0.2) { const l = listenOptions(sub); return { kind: "listen", word: "🔊 ?", say: l.say, options: l.options, answer: l.answer, es: l.es }; }
  if (r < (hard ? 0.5 : 0.36) && d.fill.length) {
    const f = pick(d.fill), options = shuffle(f.o.slice());
    return { kind: "fill", word: f.q, options, answer: options.indexOf(f.o[f.a]), explain: f.ex };
  }
  const w = wordOptions(sub);
  return { kind: "word", word: w.word, options: w.options, answer: w.answer, es: w.es };
}

/** Frases para los Santuarios de la Voz (speaking en el mapa). */
export function shrinePhrase(sub) {
  const d = decks(sub);
  const o = pick(d.order.length ? d.order : A1_ORDER);
  return { phrase: o.words.join(" ").replace(/ \?$/, "?"), es: o.es };
}
