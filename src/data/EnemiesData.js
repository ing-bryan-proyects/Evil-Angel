/**
 * EnemiesData · bestiario de Evil-Angel
 * -------------------------------------
 * Las 13 criaturas de la hoja de referencia, agrupadas por nivel de inglés (A1 → C1).
 *
 *   type "common" → enemigos comunes: deambulan por el mapa y persiguen a Abel en
 *                   tiempo real; se les golpea resolviendo palabras flotantes.
 *   type "boss"   → jefes: ubicación táctica o aparición aleatoria; al tocarlos
 *                   se congela el mapa y empieza la arena por turnos.
 *
 * `realm` indica el reino donde aparecen. En esta versión están activos los del
 * Reino 1 (Whispering Forest): Karr, Sköll, Rufus y Shela. El resto queda
 * definido para los reinos siguientes.
 */

import { A1_WORDS, A2_WORDS } from "./Vocabulary.js";

export const ENGLISH_LEVELS = Object.freeze(["A1", "A2", "B1", "B1+", "B2", "B2+", "C1"]);

export const ENEMIES = Object.freeze({
  /* ---------------- A1 · Bestias Mágicas (comunes, tiempo real) ---------------- */
  karr: {
    id: "karr", name: "Karr", title: "El lobo original", nameEs: "Karr",
    type: "common", level: "A1", realm: 1, combat: "realtime",
    mechanic: "Vocabulario rápido: sustantivos simples en ventanas de 3 segundos. Suelta monedas.",
    hp: 3, speed: 44, aggro: 110, bite: 6, window: 3.0, gold: [2, 4], lp: 6, element: "dark", windup: 0.5, worldScale: 1.45,
    pal: { body: "#3a3f52", shade: "#262a38", hi: "#5a6078", mane: "#2c3040", eye: "#ff3b3b", claw: "#d9d0e8" },
  },
  skoll: {
    id: "skoll", name: "Sköll", title: "Lobo de élite / cazador", nameEs: "Sköll",
    type: "common", level: "A1", realm: 1, combat: "realtime",
    mechanic: "Más rápido y resistente; ventana de 2,5 segundos. Suelta una gema.",
    hp: 4, speed: 56, aggro: 140, bite: 8, window: 2.5, gold: [4, 7], lp: 10, gem: true, element: "ice", windup: 0.42, worldScale: 1.6,
    pal: { body: "#dfe6ee", shade: "#a8b4c4", hi: "#ffffff", mane: "#8a6a48", eye: "#5ab8ff", claw: "#f0f0f0" },
  },

  karrAlpha: {
    id: "karrAlpha", name: "Alpha Karr", title: "Alfa de la jauría", nameEs: "Karr Alfa", type: "boss", level: "A1", realm: 1, combat: "turns", spawn: "random",
    mechanic: "Frases simples A1 por ordenar y completar.", hp: 110, atk: 14, lp: 55, gold: 30, aura: "#8a4dff", lv: 4, atlas: "karr", scenes: [], stageScale: 1.7, worldScale: 1.6,
    pal: { fur: "#2a2f40", furHi: "#4a5068", furSh: "#161a28", skin: "#5a4a5a", eye: "#ff3b3b", claw: "#e8e0d0", cloth: "#2a2a30" },
  },
  skollQueen: {
    id: "skollQueen", name: "Skoll Queen", title: "Reina de hielo", nameEs: "Reina Sköll", type: "boss", level: "A1", realm: 1, combat: "turns", spawn: "random",
    mechanic: "Examen A1: todas las estructuras básicas.", hp: 140, atk: 16, lp: 70, gold: 45, aura: "#7ad8ff", lv: 6, atlas: "skoll", scenes: [], stageScale: 1.8, worldScale: 1.6,
    pal: { fur: "#dfe6ee", furHi: "#ffffff", furSh: "#a8b4c4", skin: "#8aa0b4", eye: "#5ab8ff", claw: "#f0f0f0", cloth: "#4a5a70" },
  },
  ignis: {
    id: "ignis", name: "Ignis", title: "Espíritu de fuego", nameEs: "Ignis",
    type: "common", level: "A2", realm: 1, combat: "realtime",
    mechanic: "Esbirro de Pyrus: un espíritu de fuego que se lanza como un cometa. Vocabulario A2.",
    hp: 5, speed: 62, aggro: 150, bite: 10, window: 2.4, gold: [5, 9], lp: 14, gem: true, element: "fire", windup: 0.4, worldScale: 1.5,
    pal: { body: "#2a2230", shade: "#161018", hi: "#4a3a50", mane: "#ff7a1e", eye: "#ffd070", claw: "#ffc24a" },
  },

  /* ---------------- Enemigos marinos (lagos profundos, por turnos) ---------------- */
  nixie: {
    id: "nixie", name: "Nixie", title: "Espíritu del lago", nameEs: "Nixie", type: "marine", level: "A1", realm: 1, combat: "turns",
    mechanic: "Mora en lo profundo de los lagos. Responde en inglés para disipar su hechizo de agua.",
    hp: 70, atk: 11, lp: 30, gold: 22, aura: "#5fe0e0", lv: 3, marineVariant: 0, stageScale: 1.5, worldScale: 1.3,
  },
  merrow: {
    id: "merrow", name: "Merrow", title: "Leviatán abisal", nameEs: "Merrow", type: "marine", level: "A2", realm: 1, combat: "turns",
    mechanic: "Guardián de las aguas profundas. Ordena las frases para quebrar su corriente.",
    hp: 95, atk: 15, lp: 45, gold: 34, aura: "#9a7be0", lv: 6, marineVariant: 1, stageScale: 1.6, worldScale: 1.45,
  },

  /* ---------------- A2 · Hombres lobo (jefes, por turnos) ---------------- */
  rufus: {
    id: "rufus", name: "Rufus", title: "Hombre lobo", nameEs: "Rufus",
    type: "boss", level: "A2", realm: 1, combat: "turns", spawn: "random",
    mechanic: "Estructura oracional: ordenar frases en present perfect para romper su guardia.",
    hp: 120, atk: 16, lp: 70, gold: 40, aura: "#ff3b3b", lv: 6, atlas: "rufus", scenes: ["rufus_roar", "rufus_quake"], stageScale: 1.0,
    pal: { fur: "#2e3038", furHi: "#4a4e5c", furSh: "#1a1b22", skin: "#6e5a5a", eye: "#ff2a2a", claw: "#e8e0d0", cloth: "#2a2a30" },
  },
  shela: {
    id: "shela", name: "Shela", title: "Mujer loba", nameEs: "Shela",
    type: "boss", level: "A2", realm: 1, combat: "turns", spawn: "random",
    mechanic: "Estructura oracional en present perfect; sus cadenas castigan los errores.",
    hp: 110, atk: 18, lp: 70, gold: 40, aura: "#ff8a3a", lv: 6, atlas: "shela", scenes: ["shela_whirl", "shela_fury"], stageScale: 1.0,
    pal: { fur: "#5a3a26", furHi: "#7e5638", furSh: "#3a2416", skin: "#8a6a50", eye: "#ffb03a", claw: "#e8e0d0", cloth: "#4a3020", chain: "#9a9aa8" },
  },

  /* ---------------- B1 → C1 · Reinos siguientes (definidos, aún no activos) ---------------- */
  pyrus: {
    id: "pyrus", name: "Pyrus", title: "Gólem de fuego / obsidiana", nameEs: "Pyrus", type: "boss", level: "B1", realm: 2,
    combat: "turns", spawn: "random", mechanic: "Controla el clima del mapa; exige Past Simple / Past Continuous.",
    hp: 240, atk: 22, lp: 90, gold: 70, aura: "#ff7a1e", lv: 8, atlas: "pyrus", stageScale: 1.5, worldScale: 1.5,
  },
  draven: {
    id: "draven", name: "Draven", title: "Vampiro", nameEs: "Draven", type: "common", level: "B1", realm: 2,
    combat: "realtime", mechanic: "False friends: si eliges el falso amigo, absorbe tu maná.",
    hp: 6, speed: 60, aggro: 165, bite: 11, window: 2.8, gold: [9, 15], lp: 18, gem: true, element: "dark", windup: 0.44, worldScale: 1.2, atlas: "draven",
    pal: { body: "#2a1820", shade: "#160a10", hi: "#4a2838", mane: "#5a1020", eye: "#ff3b5a", claw: "#e0d0d8" },
  },
  elara: {
    id: "elara", name: "Elara", title: "Vampiresa", nameEs: "Elara", type: "common", level: "B1", realm: 2,
    combat: "realtime", mechanic: "False friends con ataques especiales a distancia.",
    hp: 6, speed: 56, aggro: 175, bite: 10, window: 3.0, gold: [10, 16], lp: 20, gem: true, element: "dark", windup: 0.46, worldScale: 1.15, atlas: "elara",
    pal: { body: "#241026", shade: "#130814", hi: "#3e2042", mane: "#4a1030", eye: "#c86aff", claw: "#e0d0e8" },
  },
  valerius: {
    id: "valerius", name: "Valerius", title: "Vampiro rey", nameEs: "Valerius", type: "boss", level: "B1", realm: 2,
    combat: "turns", spawn: "random", mechanic: "Modals & conditionals (would, should, must): sus definitivos drenan HP.",
    hp: 300, atk: 26, lp: 95, gold: 75, aura: "#c0506e", lv: 9, atlas: "valerius", stageScale: 1.2, worldScale: 1.3,
  },
  aurelia: {
    id: "aurelia", name: "Aurelia", title: "Vampiresa reina", nameEs: "Aurelia", type: "boss", level: "B1", realm: 2,
    combat: "turns", spawn: "random", mechanic: "Modals & conditionals con drenaje de vida.",
    hp: 290, atk: 27, lp: 100, gold: 80, aura: "#b84a86", lv: 10, atlas: "aurelia", stageScale: 1.2, worldScale: 1.3,
  },
  amon: {
    id: "amon", name: "Amon", title: "Bestia quimera", type: "common", level: "B2+", realm: 3,
    combat: "realtime", mechanic: "Phrasal verbs en movimiento: persigue a gran velocidad.", hp: 8, speed: 72,
  },
  grifos: {
    id: "grifos", name: "Grifos", title: "Grifo oscuro", type: "common", level: "B2+", realm: 3,
    combat: "realtime", mechanic: "Phrasal verbs con ataques en picado; exige evasión.", hp: 8, speed: 80,
  },
  malakar: {
    id: "malakar", name: "Malakar", title: "Ángel caído", type: "boss", level: "C1", realm: 4,
    combat: "turns", spawn: "fixed", mechanic: "Inversiones e idioms: los errores sutiles provocan contraataques devastadores.",
    hp: 420, atk: 32,
  },
  kayla: {
    id: "kayla", name: "Kayla", title: "Ángela caída", type: "boss", level: "C1", realm: 4,
    combat: "turns", spawn: "fixed", mechanic: "Inversiones e idioms en la batalla final.", hp: 420, atk: 32,
  },
});

/** Enemigos agrupados por nivel de inglés. */
export function enemiesByLevel(level) {
  return Object.values(ENEMIES).filter((e) => e.level === level);
}

/** Enemigos activos en un reino, separados en comunes y jefes. */
export function enemiesForRealm(realm) {
  const list = Object.values(ENEMIES).filter((e) => e.realm === realm);
  return { common: list.filter((e) => e.type === "common"), bosses: list.filter((e) => e.type === "boss") };
}

/* ======================================================================
   BANCOS PEDAGÓGICOS
   ====================================================================== */

/** Palabras para los golpes en tiempo real (A1: más de 480 palabras por temas; A2: repaso). */
export const WORD_BANK = Object.freeze({ A1: A1_WORDS, A2: A2_WORDS });

/**
 * Frases en present perfect para Rufus y Shela: hay que ordenar las palabras.
 * `words` está en el orden correcto; el combate las baraja.
 */
export const PRESENT_PERFECT_ORDER = Object.freeze([
  { words: ["I", "have", "seen", "the", "moon"], es: "He visto la luna." },
  { words: ["She", "has", "lost", "her", "chains"], es: "Ella ha perdido sus cadenas." },
  { words: ["We", "have", "crossed", "the", "river"], es: "Hemos cruzado el río." },
  { words: ["The", "wolves", "have", "found", "us"], es: "Los lobos nos han encontrado." },
  { words: ["He", "has", "broken", "the", "seal"], es: "Él ha roto el sello." },
  { words: ["Have", "you", "ever", "flown", "?"], es: "¿Alguna vez has volado?" },
  { words: ["They", "have", "not", "slept", "tonight"], es: "No han dormido esta noche." },
  { words: ["Abel", "has", "already", "eaten"], es: "Abel ya ha comido." },
  { words: ["It", "has", "rained", "all", "day"], es: "Ha llovido todo el día." },
  { words: ["Has", "she", "opened", "the", "door", "?"], es: "¿Ha abierto ella la puerta?" },
]);
