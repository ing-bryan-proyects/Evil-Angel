/**
 * Kits · qué sprites de las hojas de escenarios llenan cada papel en cada bioma
 * -----------------------------------------------------------------------------
 * Las hojas (assets 35–53) se cortan con tools/slice_scenery.py en assets/sprites/sc<N>.png|json:
 * cada objeto se llama o<N> (ver tools/preview/sc<N>.png con los números) y las baldosas de suelo
 * quedan en sc<N>_ground.png (tira de 48×48).
 *
 *   sc48 Bosque susurrante      sc49 Ruinas antiguas      sc46 Cementerio olvidado   sc47 Páramo de las almas
 *   sc52 Desfiladero            sc53 Tierras otoñales     sc50 Templo de las sombras sc39 Montañas
 *   sc40 Aldea en ruinas        sc41 Forja infernal       sc42 Catacumbas            sc43/44 Abismo
 *   sc45 Castillo vampírico     sc51 Interior del volcán  sc35–38 ciudad moderna inundada (reservadas)
 *
 * Cada papel es una lista de entradas "sc48.o4" o ["sc48.o4", { sway, w }] (w = peso al sortear).
 * Los papeles se corresponden con los tipos de obstáculo del mapa (pine, oak, dead, rock, crag, log, stump,
 * plant, mushroom, crystal, tomb, pillar, statue, wall, fence, rubble, bigrubble, crate, barrel, cart, brazier).
 * Un tipo sin papel en el kit usa el dibujo procedural antiguo.
 */
import { ATLAS } from "../graphics/Atlas.js";

/** Papeles comunes (ruinas y utillaje) que cualquier bioma puede usar si su kit no los define. */
const COMMON = {
  crate: ["sc39.o26", "sc40.o18"],
  barrel: ["sc39.o17"],
  cart: ["sc40.o17", "sc39.o16"],
  fence: ["sc40.o36"],
  pillar: ["sc40.o6", "sc40.o7", "sc40.o8", "sc49.o7", "sc49.o8"],
  wall: ["sc49.o5", "sc49.o6", "sc40.o5"],
  statue: ["sc40.o21", "sc40.o30"],
  rubble: ["sc49.o24", "sc47.o38", "sc40.o37"],
  bigrubble: ["sc49.o10", "sc49.o24"],
  rock: ["sc49.o23", "sc47.o36"],
};

const SWAY = { grass: 3.4, fern: 3.0, bush: 1.1, flower: 2.4, thorn: 0.8 };

export const KITS = {
  forest: {
    leaf: ["#2c6a3c", "#4c8e32", "#86c23c", "#b6e25a"],
    atlases: ["sc48", "sc49", "sc47", "sc40", "sc39"],
    oak: ["sc48.o4", "sc48.o5", "sc48.o6"],
    pine: ["sc49.o21", "sc49.o20", "sc48.o5"],
    dead: ["sc47.o9", "sc47.o10", "sc48.o27"],
    crag: ["sc48.o9"],
    log: ["sc48.o7", "sc48.o8"],
    stump: ["sc48.o22"],
    plant: [["sc48.o11", { sway: SWAY.bush }], ["sc48.o12", { sway: SWAY.fern }], ["sc48.o13", { sway: SWAY.fern }], ["sc48.o25", { sway: SWAY.fern }],
            ["sc48.o24", { sway: SWAY.bush }], ["sc49.o11", { sway: SWAY.grass }], ["sc49.o12", { sway: SWAY.flower, w: 0.6 }]],
    mushroom: ["sc48.o14", "sc48.o15", "sc48.o16"],
    houses: ["sc40.o11", "sc40.o12"],
    statue: ["sc48.o21", "sc40.o21"],
    ground: { sheet: "sc48", base: [3, 13, 14], accent: [0, 1, 12, 11], accentRate: 0.05, path: [10, 11] },
  },
  amber: {
    leaf: ["#f0b040", "#d8802a", "#a8501a", "#ffe080"],
    atlases: ["autumn", "sc40", "sc39", "sc49"],
    oak: ["autumn.treeBig", "autumn.treeSmall", "autumn.treeBig"],
    pine: ["autumn.treeSmall", "autumn.treeBig"],
    dead: ["autumn.deadBushA", "autumn.deadBushB", "autumn.deadBushC", "autumn.dryBush"],
    rock: ["autumn.stoneA", "autumn.stoneB", "autumn.boulder", "autumn.flatRock", "autumn.mossRock", "autumn.rockStackS", "autumn.pebbles"],
    crag: ["autumn.rockMesa", "autumn.rockCrag", "autumn.slab", "autumn.mossSlab", "autumn.rockCrow"],
    log: ["autumn.logA", "autumn.logBig"],
    plant: [["autumn.wheatA", { sway: SWAY.grass }], ["autumn.wheatB", { sway: SWAY.grass }], ["autumn.grassOrange", { sway: SWAY.grass }],
            ["autumn.reedsRed", { sway: SWAY.grass }], ["autumn.fernA", { sway: SWAY.fern }], ["autumn.fernB", { sway: SWAY.fern }],
            ["autumn.flowers", { sway: SWAY.flower }], ["autumn.flowerBush", { sway: SWAY.flower }], ["autumn.berryBush", { sway: SWAY.bush }]],
    houses: ["sc40.o11", "sc40.o12"],
    ground: { sheet: "sc53", base: [6, 7, 8, 7], accent: [10, 10, 9], accentRate: 0.06, path: [0, 1, 2] },
  },
  hollow: {
    leaf: ["#4a3a2a", "#6a5a3a", "#8a8a6a", "#2a2438"],
    atlases: ["sc46", "sc47", "sc49", "sc40", "sc39"],
    oak: ["sc46.o30", "sc46.o31", "sc47.o9"],
    pine: ["sc46.o30", "sc46.o31", "sc47.o10"],
    dead: ["sc47.o9", "sc47.o10", "sc46.o31", "sc47.o37"],
    rock: ["sc47.o36", "sc49.o23"],
    crag: ["sc47.o13", "sc47.o14"],
    log: ["sc47.o11", "sc47.o12"],
    stump: ["sc47.o39"],
    tomb: ["sc46.o7", "sc46.o8", "sc46.o9", "sc46.o10", "sc46.o14", "sc46.o15", "sc46.o16", "sc47.o8", "sc47.o16"],
    statue: ["sc46.o19", "sc46.o18", "sc40.o21"],
    pillar: ["sc47.o7", "sc47.o15", "sc40.o6", "sc40.o8"],
    wall: ["sc46.o5", "sc46.o6", "sc46.o17", "sc49.o6"],
    fence: ["sc46.o4", "sc46.o11", "sc46.o20", "sc46.o21"],
    plant: [["sc47.o18", { sway: SWAY.bush }], ["sc47.o19", { sway: SWAY.fern }], ["sc47.o20", { sway: SWAY.fern }], ["sc47.o33", { sway: SWAY.fern }],
            ["sc47.o34", { sway: SWAY.fern }], ["sc46.o33", { sway: SWAY.bush }], ["sc47.o32", { sway: SWAY.thorn }], ["sc46.o29", { sway: SWAY.thorn, w: 0.5 }]],
    mushroom: ["sc47.o21", "sc47.o22", "sc47.o23"],
    rubble: ["sc47.o38", "sc46.o35"],
    houses: ["sc40.o11", "sc40.o12"],
    ground: { sheet: "sc46", base: [0, 1, 9, 12, 11], accent: [6, 16, 3, 15, 10], accentRate: 0.04, path: [11, 12], bright: 1.4 },
  },
  marsh: {
    leaf: ["#4a5a3a", "#6a7a4a", "#8a6a9a", "#3a2a48"],
    atlases: ["sc47", "sc46", "sc49", "sc40", "sc48"],
    oak: ["sc47.o9", "sc47.o10", "sc46.o31"],
    pine: ["sc46.o30", "sc47.o10"],
    dead: ["sc47.o9", "sc47.o10", "sc47.o37", "sc47.o35"],
    rock: ["sc47.o36", "sc49.o23"],
    crag: ["sc47.o13", "sc47.o14"],
    log: ["sc47.o11", "sc47.o12"],
    stump: ["sc47.o39", "sc48.o22"],
    tomb: ["sc47.o8", "sc47.o16", "sc46.o9", "sc46.o10"],
    pillar: ["sc47.o7", "sc47.o15", "sc40.o6"],
    plant: [["sc47.o18", { sway: SWAY.bush }], ["sc47.o19", { sway: SWAY.fern }], ["sc47.o20", { sway: SWAY.fern }], ["sc47.o33", { sway: SWAY.fern }],
            ["sc47.o34", { sway: SWAY.fern }], ["sc47.o32", { sway: SWAY.thorn }], ["sc47.o37", { sway: SWAY.thorn, w: 0.4 }]],
    mushroom: ["sc47.o21", "sc47.o22", "sc47.o23"],
    rubble: ["sc47.o38"],
    houses: ["sc40.o11", "sc40.o12"],
    ground: { sheet: "sc47", base: [0, 9, 1, 13, 10], accent: [4, 11, 12, 2, 3], accentRate: 0.05, path: [9, 2], bright: 1.3 },
  },
  peaks: {
    leaf: ["#2a5a3a", "#3a7a4a", "#8aa86a", "#b8c88a"],
    atlases: ["sc52", "sc49", "sc39", "sc53", "sc48"],
    oak: ["sc52.o23", "sc52.o24", "sc52.o25"],
    pine: ["sc49.o21", "sc52.o24", "sc52.o25", "sc49.o20"],
    dead: ["sc52.o26", "sc47.o9", "sc49.o19"],
    rock: ["sc52.o2", "sc52.o7", "sc52.o1", "sc52.o8"],
    crag: ["sc52.o3", "sc52.o4", "sc52.o9", "sc52.o10", "sc52.o5"],
    log: ["autumn.logA", "sc48.o7"],
    stump: ["sc48.o22"],
    plant: [["sc52.o12", { sway: SWAY.fern }], ["sc52.o13", { sway: SWAY.fern }], ["sc52.o14", { sway: SWAY.bush }], ["sc52.o15", { sway: SWAY.bush }],
            ["sc52.o16", { sway: SWAY.bush }], ["sc52.o21", { sway: SWAY.flower }], ["sc52.o20", { sway: SWAY.flower }]],
    crystal: ["sc39.o31"],
    statue: ["sc39.o28", "sc39.o29", "sc39.o30"],
    pillar: ["sc39.o9", "sc40.o6"],
    houses: ["sc39.o11", "sc39.o12"],
    ground: { sheet: "sc52", base: [0, 1, 2, 10, 1], accent: [5, 15], accentRate: 0.07, path: [1, 0], bright: 1.12 },
  },
  vampire: {                                             // Reino 2: castillo vampírico (sc45) + ruinas (sc49) + templo (sc50)
    leaf: ["#5a1020", "#8a1e30", "#3a0a14", "#b83a4a"],
    atlases: ["sc45", "sc49", "sc50", "sc40"],
    wall: ["sc45.o8", "sc45.o9", "sc45.o6", "sc45.o7", "sc49.o5", "sc49.o6"],
    pillar: ["sc45.o13", "sc49.o7", "sc49.o8", "sc50.o10"],
    tomb: ["sc45.o0", "sc45.o1", "sc45.o2", "sc45.o23"],
    statue: ["sc45.o24", "sc45.o25", "sc45.o15"],
    dead: ["sc45.o24", "sc45.o27"],
    rubble: ["sc45.o27", "sc45.o28", "sc45.o30", "sc49.o24"],
    bigrubble: ["sc45.o6", "sc49.o10"],
    rock: ["sc49.o23", "sc45.o7"],
    crag: ["sc49.o4"],
    fence: ["sc45.o26", "sc45.o29", "sc45.o4", "sc45.o5"],
    brazier: ["sc45.o16", "sc45.o17"],
    crystal: ["sc45.o12", "sc45.o11"],
    plant: [["sc50.o18", { sway: SWAY.thorn }], ["sc45.o30", { sway: 0.4 }]],
    houses: ["sc45.o10"],
    ground: { sheet: "sc45", base: [0, 1, 4, 11, 12], accent: [3, 9, 10], accentRate: 0.08, path: [11, 12], bright: 1.15 },
  },
  sanctum: {
    leaf: ["#5a3a8a", "#8a5ad8", "#3a2a5a", "#b88aff"],
    atlases: ["sc50", "sc49", "sc40"],
    oak: ["sc50.o25"],
    pine: ["sc50.o25"],
    dead: ["sc50.o25", "sc50.o18"],
    pillar: ["sc50.o10", "sc50.o11", "sc50.o12", "sc50.o13"],
    statue: ["sc50.o14"],
    wall: ["sc50.o7", "sc50.o8", "sc50.o0", "sc50.o1", "sc50.o4", "sc50.o5", "sc50.o6"],
    crystal: ["sc50.o15", "sc50.o16", "sc50.o23"],
    plant: [["sc50.o18", { sway: SWAY.thorn }], ["sc50.o24", { sway: SWAY.flower }], ["sc50.o17", { sway: SWAY.fern, w: 0.5 }]],
    brazier: ["sc50.o21", "sc50.o22"],
    rubble: ["sc49.o24"],
    ground: { sheet: "sc50", base: [10, 11, 12, 1, 0], accent: [13, 14, 5, 6, 7], accentRate: 0.06, path: [0, 1], bright: 1.3 },
  },
};

/** ¿Qué atlas necesita este bioma? (para precargar) */
export const kitAtlases = (key) => KITS[key]?.atlases || [];
export const allKitAtlases = () => [...new Set(Object.values(KITS).flatMap((k) => k.atlases || []))];
export const allGroundSheets = () => [...new Set(Object.values(KITS).map((k) => k.ground?.sheet).filter(Boolean))];

const parse = (e) => {
  const [id, opts] = Array.isArray(e) ? e : [e, null];
  const dot = id.indexOf(".");
  return { a: id.slice(0, dot), n: id.slice(dot + 1), ...(opts || {}) };
};
const cache = new Map();
function list(kitKey, role) {
  const k = `${kitKey}/${role}`;
  if (cache.has(k)) return cache.get(k);
  const kit = KITS[kitKey];
  let src = kit?.[role];
  if (!src && (role === "pine" || role === "oak")) src = kit?.oak || kit?.pine;
  if (!src && kit && role in COMMON) src = COMMON[role];
  const out = src ? src.map(parse).filter((e) => ATLAS[e.a]?.has(e.n)) : null;
  cache.set(k, out && out.length ? out : null);
  return cache.get(k);
}

/** Papel (rol) de arte que le corresponde a cada tipo de obstáculo del mapa. */
const ROLE = { pine: "pine", oak: "oak", dead: "dead", rock: "rock", crag: "crag", log: "log", stump: "stump", plant: "plant", mushroom: "mushroom", crystal: "crystal",
  tomb: "tomb", pillar: "pillar", statue: "statue", wall: "wall", fence: "fence", rubble: "rubble", bigrubble: "bigrubble", crate: "crate", barrel: "barrel", cart: "cart", brazier: "brazier" };

/** Elige un sprite para un obstáculo: { a: atlas, n: nombre, sway? } o null si el kit no lo cubre. */
export function pickArt(type, v, kitKey) {
  if (!kitKey || !KITS[kitKey]) return null;
  const role = ROLE[type];
  if (!role) return null;
  const l = list(kitKey, role);
  if (!l) return null;
  let total = 0;
  for (const e of l) total += e.w ?? 1;
  let r = ((v * 977) % 1) * total;
  for (const e of l) { r -= e.w ?? 1; if (r <= 0) return e; }
  return l[0];
}

/** Sprites de casa del kit (puede ser null). */
export function pickHouse(kitKey, i) {
  const l = KITS[kitKey]?.houses?.map(parse).filter((e) => ATLAS[e.a]?.has(e.n));
  return l && l.length ? l[i % l.length] : null;
}

/** Los tipos que el kit puede dibujar con arte (para no repartir tipos sin sprite). */
export function kitHas(kitKey, type) { return !!pickArt(type, 0.3, kitKey); }

export function resetKitCache() { cache.clear(); }
