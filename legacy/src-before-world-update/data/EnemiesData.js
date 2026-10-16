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

export const ENGLISH_LEVELS = Object.freeze(["A1", "A2", "B1", "B1+", "B2", "B2+", "C1"]);

export const ENEMIES = Object.freeze({
  /* ---------------- A1 · Bestias Mágicas (comunes, tiempo real) ---------------- */
  karr: {
    id: "karr", name: "Karr", title: "El lobo original", nameEs: "Karr",
    type: "common", level: "A1", realm: 1, combat: "realtime",
    mechanic: "Vocabulario rápido: sustantivos simples en ventanas de 3 segundos. Suelta monedas.",
    hp: 3, speed: 44, aggro: 110, bite: 6, window: 3.0, gold: [2, 4], lp: 6,
    pal: { body: "#3a3f52", shade: "#262a38", hi: "#5a6078", mane: "#2c3040", eye: "#ff3b3b", claw: "#d9d0e8" },
  },
  skoll: {
    id: "skoll", name: "Sköll", title: "Lobo de élite / cazador", nameEs: "Sköll",
    type: "common", level: "A1", realm: 1, combat: "realtime",
    mechanic: "Más rápido y resistente; ventana de 2,5 segundos. Suelta una gema.",
    hp: 4, speed: 56, aggro: 140, bite: 8, window: 2.5, gold: [4, 7], lp: 10, gem: true,
    pal: { body: "#dfe6ee", shade: "#a8b4c4", hi: "#ffffff", mane: "#8a6a48", eye: "#5ab8ff", claw: "#f0f0f0" },
  },

  /* ---------------- A2 · Hombres lobo (jefes, por turnos) ---------------- */
  rufus: {
    id: "rufus", name: "Rufus", title: "Hombre lobo", nameEs: "Rufus",
    type: "boss", level: "A2", realm: 1, combat: "turns", spawn: "random",
    mechanic: "Estructura oracional: ordenar frases en present perfect para romper su guardia.",
    hp: 120, atk: 16, lp: 70, gold: 40, aura: "#ff3b3b", lv: 6,
    pal: { fur: "#2e3038", furHi: "#4a4e5c", furSh: "#1a1b22", skin: "#6e5a5a", eye: "#ff2a2a", claw: "#e8e0d0", cloth: "#2a2a30" },
  },
  shela: {
    id: "shela", name: "Shela", title: "Mujer loba", nameEs: "Shela",
    type: "boss", level: "A2", realm: 1, combat: "turns", spawn: "random",
    mechanic: "Estructura oracional en present perfect; sus cadenas castigan los errores.",
    hp: 110, atk: 18, lp: 70, gold: 40, aura: "#ff8a3a", lv: 6,
    pal: { fur: "#5a3a26", furHi: "#7e5638", furSh: "#3a2416", skin: "#8a6a50", eye: "#ffb03a", claw: "#e8e0d0", cloth: "#4a3020", chain: "#9a9aa8" },
  },

  /* ---------------- B1 → C1 · Reinos siguientes (definidos, aún no activos) ---------------- */
  pyrus: {
    id: "pyrus", name: "Pyrus", title: "Gólem de fuego / obsidiana", type: "boss", level: "B1", realm: 2,
    combat: "turns", spawn: "random", mechanic: "Controla el clima del mapa; exige Past Simple / Past Continuous.",
    hp: 240, atk: 22,
  },
  draven: {
    id: "draven", name: "Draven", title: "Vampiro", type: "common", level: "B1+", realm: 2,
    combat: "realtime", mechanic: "False friends: si eliges el falso amigo, absorbe tu maná.", hp: 6, speed: 60,
  },
  elara: {
    id: "elara", name: "Elara", title: "Vampiresa", type: "common", level: "B1+", realm: 2,
    combat: "realtime", mechanic: "False friends con ataques especiales a distancia.", hp: 6, speed: 58,
  },
  valerius: {
    id: "valerius", name: "Valerius", title: "Vampiro rey", type: "boss", level: "B2", realm: 2,
    combat: "turns", spawn: "fixed", mechanic: "Modals & conditionals (would, should, must): sus definitivos drenan HP.",
    hp: 300, atk: 26,
  },
  aurelia: {
    id: "aurelia", name: "Aurelia", title: "Vampiresa reina", type: "boss", level: "B2", realm: 2,
    combat: "turns", spawn: "fixed", mechanic: "Modals & conditionals con drenaje de vida.", hp: 290, atk: 27,
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

/** Sustantivos A1 para los golpes en tiempo real: palabra en inglés → traducción. */
export const WORD_BANK = Object.freeze({
  A1: [
    ["wolf", "lobo"], ["tree", "árbol"], ["moon", "luna"], ["stone", "piedra"], ["river", "río"],
    ["fire", "fuego"], ["sword", "espada"], ["night", "noche"], ["light", "luz"], ["bird", "pájaro"],
    ["house", "casa"], ["water", "agua"], ["bread", "pan"], ["star", "estrella"], ["door", "puerta"],
    ["key", "llave"], ["book", "libro"], ["wing", "ala"], ["heart", "corazón"], ["road", "camino"],
    ["forest", "bosque"], ["sky", "cielo"], ["hand", "mano"], ["eye", "ojo"], ["gold", "oro"],
  ],
  A2: [
    ["shield", "escudo"], ["bridge", "puente"], ["castle", "castillo"], ["coin", "moneda"], ["shadow", "sombra"],
    ["candle", "vela"], ["feather", "pluma"], ["mountain", "montaña"], ["storm", "tormenta"], ["hunter", "cazador"],
  ],
});

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
