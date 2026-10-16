/**
 * WorldBuilder · construye un mapa jugable completo a partir de su definición
 * --------------------------------------------------------------------------
 *   1. generateLayout()   ruta sinuosa aleatoria, lagos, montañas, casas, cráter
 *   2. paintTerrain()     suelo + rejilla de colisiones
 *   3. entidades clave    Unit-A.R.C., aliados, tienda, jefes, Gólem, puerta de salida
 *   4. escenario          muralla de árboles circular, ruinas, antorchas, troncos talados,
 *                         escombros, cajas… (muchos son destructibles)
 *   5. enemigos y botín   lobos repartidos por todo el disco, monedas y reliquias
 *   6. decoración         sombras, grietas, quemaduras, matas de hierba animadas
 *
 * También exporta drawObstacle() con todas las rutinas de dibujo de objetos del mundo.
 */

import { generateLayout } from "./MapGen.js";
import { paintTerrain, decorateGround } from "./Terrain.js";
import {
  mulberry32, makeLeafyTree, makeMossRock, makeRuinedHouse, makeRubble, makeFallenPillar, makeWallSegment, makeCrate,
  makeBarrel, makeBurntStump, makeFelledLog, makeStatue, makeArch, makeFence, makeTorchPost, makeWell, makeCart,
  makeReeds, makeLily,
} from "./Scenery.js";
import { GrassField, scatterGrass, drawTree, drawFlame, wind } from "./EnvironmentAnimation.js";
import { pickArt, pickHouse, kitHas, KITS } from "./Kits.js";
import { artBox, drawArt, artFrame, artCanvas } from "./ArtProps.js";
import { ATLAS } from "../graphics/Atlas.js";
import { PLANT_COLORS } from "./PropPhysics.js";
import { makeGround, hasGround } from "./GroundKit.js";
import { composeScenery, RAD } from "./SceneComposer.js";

/* ---------- Cajas de colisión por tipo (en los pies del objeto) ---------- */
const BOX = {
  pine:      (x, y) => ({ x: x - 5, y: y - 6, w: 10, h: 6 }),
  oak:       (x, y) => ({ x: x - 5, y: y - 6, w: 10, h: 6 }),
  dead:      (x, y) => ({ x: x - 4, y: y - 5, w: 8, h: 5 }),
  tomb:      (x, y) => ({ x: x - 7, y: y - 5, w: 14, h: 5 }),
  pillar:    (x, y) => ({ x: x - 8, y: y - 6, w: 16, h: 6 }),
  rock:      (x, y) => ({ x: x - 8, y: y - 5, w: 16, h: 5 }),
  rubble:    (x, y) => ({ x: x - 8, y: y - 5, w: 16, h: 5 }),
  bigrubble: (x, y) => ({ x: x - 12, y: y - 6, w: 24, h: 6 }),
  fallen:    (x, y) => ({ x: x - 16, y: y - 7, w: 32, h: 7 }),
  wall:      (x, y) => ({ x: x - 14, y: y - 6, w: 28, h: 6 }),
  crate:     (x, y) => ({ x: x - 6, y: y - 6, w: 12, h: 6 }),
  barrel:    (x, y) => ({ x: x - 5, y: y - 5, w: 10, h: 5 }),
  stump:     (x, y) => ({ x: x - 6, y: y - 5, w: 12, h: 5 }),
  statue:    (x, y) => ({ x: x - 7, y: y - 6, w: 14, h: 6 }),
  fence:     (x, y) => ({ x: x - 12, y: y - 4, w: 24, h: 4 }),
  torch:     (x, y) => ({ x: x - 3, y: y - 3, w: 6, h: 3 }),
  shrine:    (x, y) => ({ x: x - 8, y: y - 5, w: 16, h: 5 }),
  well:      (x, y) => ({ x: x - 9, y: y - 6, w: 18, h: 6 }),
  cart:      (x, y) => ({ x: x - 15, y: y - 6, w: 30, h: 6 }),
  crag:      (x, y) => ({ x: x - 16, y: y - 8, w: 32, h: 8 }),
};
const logBox = (x, y, vert) => (vert ? { x: x - 4, y: y - 30, w: 8, h: 30 } : { x: x - 16, y: y - 6, w: 32, h: 6 });
const archBoxes = (x, y) => [{ x: x - 19, y: y - 6, w: 10, h: 6 }, { x: x + 9, y: y - 6, w: 10, h: 6 }];

/** Obstáculos grandes que respetan una separación mayor al repartirse. */
const BIG = new Set(["pine", "oak", "pillar", "statue", "arch", "well", "cart", "dead", "crag"]);

const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/* ---------- Sprites compartidos (no dependen del mapa) ---------- */
let SPR = null;
export function getSprites() {
  if (SPR) return SPR;
  const r = mulberry32(777);
  SPR = {
    rubble: [makeRubble(r), makeRubble(r), makeRubble(r)],
    bigrubble: [makeRubble(r, true), makeRubble(r, true)],
    fallen: [makeFallenPillar(r), makeFallenPillar(r)],
    wall: [makeWallSegment(r), makeWallSegment(r)],
    crate: [makeCrate(r), makeCrate(r, true)],
    barrel: [makeBarrel()],
    stump: [makeBurntStump(r), makeBurntStump(r)],
    logH: [makeFelledLog(r, false), makeFelledLog(r, false)],
    logV: [makeFelledLog(r, true), makeFelledLog(r, true)],
    statue: [makeStatue(r)],
    arch: [makeArch(r)],
    torch: makeTorchPost(),
    fence: [makeFence(r), makeFence(r)],
    well: makeWell(r),
    cart: makeCart(r),
    reeds: [makeReeds(r), makeReeds(r), makeReeds(r)],
    lily: makeLily(),
  };
  return SPR;
}

/**
 * @param {object} def     definición del mapa (gen, pal, entidades por fracción de ruta…)
 * @param {object} deps    { ALLIES, BEASTS, GOLEM, ENEMIES, PRESENT_PERFECT_ORDER, renderWerewolfBig, Wolf,
 *                           generateLoot, world, PLAYER_W, PLAYER_H, shuffle }
 * @param {number} seed    semilla del layout (guardada en la partida)
 */
export function buildMap(def, deps, seed) {
  const { ALLIES, BEASTS, GOLEM, ENEMIES, PRESENT_PERFECT_ORDER, renderWerewolfBig, renderMarineBig, Wolf, generateLoot, world, PLAYER_W, PLAYER_H, shuffle } = deps;
  const rand = mulberry32((seed ^ 0x9e3779b9) >>> 0);
  const pal = def.pal;
  const L = generateLayout(def.gen, seed);
  const { R, cx, cy, path } = L;
  const inside = (x, y, m = 0) => L.inside(x, y, m);
  const randIn = (m) => ({ x: m + rand() * (L.W - 2 * m), y: m + rand() * (L.H - 2 * m) });
  const kitKey = def.art && KITS[def.art] ? def.art : null;
  const gcfg = kitKey ? KITS[kitKey].ground : null;
  const ground = gcfg && hasGround(gcfg.sheet) ? makeGround(gcfg, seed) : null;
  const T = paintTerrain(L, ground ? { ...pal, decorMul: 0.32 } : pal, rand, ground);
  const SP = getSprites();
  const defeated = world.defeated[def.id] || (world.defeated[def.id] = {});
  const taken = world.taken[def.id] || (world.taken[def.id] = {});
  const destroyed = (world.destroyed ||= {})[def.id] || (world.destroyed[def.id] = {});

  const mm = {
    def, id: def.id, W: L.W, H: L.H, R, cx, cy, pal, L, T, path, seed, art: def.art || null, inside,
    unlocked: false, barrierAlpha: 1, ground: T.canvas,
    obstacles: [], boxes: [], dynBoxes: [], beasts: [], arc: null, allies: [], shop: null, wildBosses: [], boss: null,
    movers: [], houses: [], decor: T.decor, lakes: L.lakes, hills: L.hills, waterSpots: T.waterSpots, emitters: [], lights: [],
    wolves: [], loot: [], summits: T.summits, sprites: SP, visibleTrees: [],
  };

  /* ---------- Índice espacial de cajas estáticas ---------- */
  const CELLB = 64;
  const bIndex = new Map();
  const indexBox = (b) => {
    for (let j = (b.y / CELLB) | 0; j <= ((b.y + b.h) / CELLB) | 0; j++) for (let i = (b.x / CELLB) | 0; i <= ((b.x + b.w) / CELLB) | 0; i++) {
      const k = i * 4096 + j;
      let a = bIndex.get(k);
      if (!a) bIndex.set(k, (a = []));
      a.push(b);
    }
  };
  mm.addBox = (b) => { mm.boxes.push(b); indexBox(b); return b; };
  mm.boxesNear = (b) => {
    const out = [];
    for (let j = ((b.y - 1) / CELLB) | 0; j <= ((b.y + b.h + 1) / CELLB) | 0; j++) for (let i = ((b.x - 1) / CELLB) | 0; i <= ((b.x + b.w + 1) / CELLB) | 0; i++) {
      const a = bIndex.get(i * 4096 + j);
      if (a) for (const q of a) if (!q.dead && !out.includes(q)) out.push(q);
    }
    return out;
  };
  /** Cajas que chocan con `b` (estáticas + dinámicas: robot, aliados, tienda, jefe, sello). */
  mm.hits = (b) => {
    const out = mm.boxesNear(b).filter((q) => overlap(b, q));
    for (const q of mm.dynBoxes()) if (overlap(b, q)) out.push(q);
    return out;
  };
  mm.blocked = (b) => T.blockedBox(b) || mm.hits(b).length > 0;
  mm.isFree = (x, y, r = 4) => !mm.blocked({ x: x - r, y: y - r, w: r * 2, h: r * 2 });
  mm.wolfBlocked = (b) => T.blockedBox(b) || !inside(b.x + b.w / 2, b.y + b.h / 2, 70) ||
    mm.boxesNear(b).some((q) => overlap(b, q)) || mm.dynBoxes().some((q) => overlap(b, q));
  mm.dynBoxes = () => {
    const list = [];
    if (mm.arc) list.push(mm.arc.box);
    for (const a of mm.allies) list.push(a.box);
    if (mm.shop) list.push(mm.shop.box);
    if (mm.boss && mm.boss.alive) list.push(mm.boss.box);
    if (!mm.unlocked && mm.gate) list.push(mm.gate.box);
    for (const o of mm.movers) if (o.mv) list.push(o.mv.box);
    return list;
  };

  /* ---------- Obstáculos ---------- */
  const claims = [];                 // zonas reservadas {x,y,r}
  const claim = (x, y, r) => claims.push({ x, y, r });
  const claimed = (x, y, r) => claims.some((c) => Math.hypot(c.x - x, c.y - y) < c.r + r);
  const bigPlaced = [];
  let nextId = 0;

  function addObstacle(type, bx, by, extra = {}) {
    bx = Math.round(bx); by = Math.round(by);
    const o = { id: nextId++, type, bx, by, v: extra.v ?? rand(), vert: !!extra.vert, ...extra };
    if (destroyed[o.id]) return null;
    const ent = extra.noArt || !kitKey ? null : pickArt(type, o.v, kitKey);     // sprite de la hoja del bioma, si el kit lo cubre
    if (ent) { o.sa = ent.a; o.spr = ent.n; o.sway = ent.sway; o.vert = false; }
    if (ent && type === "crag") {                                                // formaciones rocosas: se pueden escalar (subirse encima)
      const f = artFrame(ent.a, ent.n), px = (ATLAS[ent.a]?.px || 1);
      if (f && f.h / px >= 26) { o.climb = true; o.climbH = Math.min(30, Math.round(f.h / px * 0.66)); }
    }
    let boxes;
    if (ent) { const b = artBox(type, ent, bx, by); boxes = b ? [b] : []; }
    else if (type === "plant" || type === "mushroom") boxes = [];
    else if (type === "crystal" || type === "brazier") boxes = [{ x: bx - 5, y: by - 5, w: 10, h: 5 }];
    else if (type === "log") boxes = [logBox(bx, by, o.vert)];
    else if (type === "arch") boxes = archBoxes(bx, by);
    else boxes = [BOX[type](bx, by)];
    o.boxes = boxes;
    o.box = boxes[0] || { x: bx - 1, y: by - 1, w: 2, h: 2 };
    boxes.forEach((b) => { b.owner = o; mm.addBox(b); });
    if (type === "pine" || type === "oak" || type === "plant" || type === "mushroom") {
      const kl = kitKey && KITS[kitKey].leaf;
      o.leafCols = o.spr && PLANT_COLORS[o.spr] ? PLANT_COLORS[o.spr] : o.spr && kl ? kl : o.v < pal.purple ? pal.foliageAlt.slice(2) : pal.foliage.slice(2);
    }
    mm.obstacles.push(o);
    return o;
  }
  mm.removeObstacle = (o) => {
    o.dead = true;
    o.boxes.forEach((b) => { b.dead = true; });
    mm.obstacles = mm.obstacles.filter((q) => q !== o);
    destroyed[o.id] = true;
    mm.emitters = mm.emitters.filter((e) => e.owner !== o);
    mm.lights = mm.lights.filter((l) => l.owner !== o);
  };
  mm.obstaclesNear = (x, y, r) => mm.obstacles.filter((o) => Math.abs(o.bx - x) < r + 20 && Math.abs(o.by - y) < r + 20);

  const slopeOK = (x, y, r) => {
    for (const [dx, dy] of [[0, 0], [r, 0], [-r, 0], [0, -r * 0.6], [0, r * 0.4]]) if (T.blockedPx((x + dx) | 0, (y + dy) | 0)) return false;
    return true;
  };
  /** ¿Se puede colocar un objeto de radio r en (x, y)? */
  function canPlace(x, y, r, o = {}) {
    if (!inside(x, y, o.rim ? 20 : 78)) return false;
    if (!slopeOK(x, y, r)) return false;
    if (path.nearest(x, y, (o.pathClear ?? r + 24) + 6).d < (o.pathClear ?? r + 24)) return false;
    if (claimed(x, y, r)) return false;
    if (o.free !== false) {
      const b = { x: x - r, y: y - r * 0.6, w: r * 2, h: r * 0.8 };
      if (mm.boxesNear(b).some((q) => overlap(b, q))) return false;
    }
    return true;
  }
  /** Coloca un objeto buscando un sitio libre cerca de (x, y). */
  function placeNear(type, x, y, spread = 20, tries = 14, extra = {}) {
    for (let i = 0; i < tries; i++) {
      const px = x + (rand() - 0.5) * spread * 2 * (i / tries + 0.2), py = y + (rand() - 0.5) * spread * 2 * (i / tries + 0.2);
      if (canPlace(px, py, extra.r ?? 9, { pathClear: extra.pathClear ?? 14 })) return addObstacle(type, px, py, extra);
    }
    return null;
  }

  /* ---------- Inicio (cráter o borde) ---------- */
  const p0 = path.at(0.0);
  if (L.crater) {
    mm.start = { x: Math.round(L.crater.x - PLAYER_W / 2), y: Math.round(L.crater.y - PLAYER_H + 4) };
  } else {
    mm.start = { x: Math.round(p0.x - PLAYER_W / 2 + p0.tx * 10), y: Math.round(p0.y - PLAYER_H + 4 + p0.ty * 10) };
  }
  claim(mm.start.x + 8, mm.start.y + 16, 46);

  /* ---------- Cráter: anillo de escombros, árboles talados, tocones ardiendo ---------- */
  if (L.crater) {
    const cr = L.crater;
    claim(cr.x, cr.y, cr.r * 1.15);
    mm.emitters.push({ kind: "crater", x: cr.x, y: cr.y });
    mm.lights.push({ x: cr.x, y: cr.y, r: 62, a: 0.9, flick: 0.12, warm: true });
    const n = Math.round((Math.PI * 2 * cr.r) / 17);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + (rand() - 0.5) * 0.12;
      const d = Math.atan2(Math.sin(a - cr.gap), Math.cos(a - cr.gap));
      if (Math.abs(d) < 0.55) continue;                                 // hueco por donde nace el camino
      const rr = cr.r * (1.02 + (rand() - 0.5) * 0.08);
      const x = cr.x + Math.cos(a) * rr, y = cr.y + Math.sin(a) * rr * 0.9;
      addObstacle(rand() < 0.5 ? "rock" : rand() < 0.5 ? "rubble" : "bigrubble", x, y);
    }
    for (let k = 0; k < 9; k++) {                                       // troncos arrancados, caídos radialmente
      const a = rand() * Math.PI * 2, dist = cr.r * (1.35 + rand() * 1.1);
      const x = cr.x + Math.cos(a) * dist, y = cr.y + Math.sin(a) * dist * 0.9;
      if (canPlace(x, y, 14, { pathClear: 24 })) addObstacle("log", x, y, { variant: (rand() * 2) | 0 });
    }
    for (let k = 0; k < 9; k++) {                                       // tocones ardiendo
      const a = rand() * Math.PI * 2, dist = cr.r * (1.25 + rand() * 1.3);
      const x = cr.x + Math.cos(a) * dist, y = cr.y + Math.sin(a) * dist * 0.9;
      if (!canPlace(x, y, 8, { pathClear: 18 })) continue;
      const o = addObstacle("stump", x, y, { burning: rand() < 0.7 });
      if (o && o.burning) { mm.emitters.push({ kind: "fire", x: o.bx, y: o.by - 8, owner: o }); mm.lights.push({ x: o.bx, y: o.by - 8, r: 20, a: 0.55, flick: 0.2, warm: true, owner: o }); }
      else if (o) mm.emitters.push({ kind: "smolder", x: o.bx, y: o.by - 6, owner: o });
    }
    for (let k = 0; k < 8; k++) {
      const a = rand() * Math.PI * 2, dist = cr.r * (1.4 + rand() * 1.0);
      const x = cr.x + Math.cos(a) * dist, y = cr.y + Math.sin(a) * dist * 0.9;
      if (canPlace(x, y, 12, { pathClear: 22 })) addObstacle("rock", x, y);
    }
  }

  /* ---------- Casas en ruinas ---------- */
  L.houses.forEach((h0, hi) => {
    const art = kitKey ? pickHouse(kitKey, hi + ((rand() * 2) | 0)) : null;
    let sprite, house;
    if (art) {                                                            // casa dibujada a mano: un solo sprite (cuerpo completo)
      const f = artFrame(art.a, art.n), cvs = artCanvas(art);
      const ox = Math.round(h0.x + h0.w / 2 - f.w / 2), oy = Math.round(h0.y + h0.h - f.h + 2);
      const bw = Math.round(f.w * 0.84), bh = Math.min(34, Math.round(f.h * 0.3));
      sprite = { back: cvs, front: null, floor: null, w: f.w, h: f.h, art: true, backBase: f.h - 3, boxes: [{ x: Math.round((f.w - bw) / 2), y: f.h - bh - 2, w: bw, h: bh }] };
      house = { x: ox, y: oy, w: f.w, h: f.h, sprite, boxes: [] };
    } else {
      sprite = makeRuinedHouse(rand, h0.variant);
      house = { x: Math.round(h0.x + (h0.w - sprite.w) / 2), y: Math.round(h0.y + h0.h - sprite.h), w: sprite.w, h: sprite.h, sprite, boxes: [] };
    }
    for (const b of sprite.boxes) house.boxes.push(mm.addBox({ x: house.x + b.x, y: house.y + b.y, w: b.w, h: b.h }));
    mm.houses.push(house);
    claim(house.x + house.w / 2, house.y + house.h / 2, Math.max(52, house.w * 0.6));
    if (!art && h0.variant === 1) mm.emitters.push({ kind: "smolder", x: house.x + 14, y: house.y + 14 });
    // un barril, una caja y escombros al pie de la casa
    placeNear("barrel", house.x - 8, house.y + house.h - 6, 8, 8, { r: 6 });
    placeNear("crate", house.x + house.w + 10, house.y + house.h - 10, 8, 8, { r: 7 });
    placeNear("bigrubble", house.x + house.w + 12, house.y + 20, 10, 8, { r: 12 });
    if (rand() < 0.5) placeNear("fence", house.x - 20, house.y + house.h + 6, 10, 8, { r: 12 });
    if (rand() < 0.4) placeNear(rand() < 0.5 ? "cart" : "well", house.x + house.w / 2 + (rand() < 0.5 ? -60 : 60), house.y + house.h + 20, 14, 10, { r: 16 });
  });

  /* ---------- Puerta de salida con sello mágico ---------- */
  if (!def.noGate) {
    const e = path.at(1), ang = Math.atan2(e.ty, e.tx);
    const horiz = Math.abs(e.tx) > Math.abs(e.ty);
    const gx = Math.round(e.x), gy = Math.round(e.y);
    mm.gate = {
      x: gx, y: gy, tx: e.tx, ty: e.ty, ang, horiz,
      box: horiz ? { x: gx - 5, y: gy - 22, w: 10, h: 44 } : { x: gx - 22, y: gy - 5, w: 44, h: 10 },
    };
    claim(gx, gy, 52);
    const nx = -e.ty, ny = e.tx;
    for (const s of [-1, 1]) addObstacle("pillar", gx + nx * s * 29, gy + ny * s * 29 + 6, { gate: true });
    mm.lights.push({ x: gx, y: gy - 6, r: 70, a: 0.7, flick: 0.1, seal: true });
  }

  /* ---------- Entidades clave ---------- */
  const pathPt = (u) => path.at(u);
  // Unit-A.R.C.: sobre el camino, flanqueado por tumbas y un pilar
  if (def.arcU != null) {
    const p = pathPt(def.arcU), ax = Math.round(p.x - 8), ay = Math.round(p.y - 22);
    mm.arc = { x: ax, y: ay, box: { x: ax, y: ay + 16, w: 16, h: 7 } };
    claim(p.x, p.y, 50);
    for (const [s, off, type] of [[-1, 44, "tomb"], [1, 38, "tomb"], [1, 62, "pillar"]]) addObstacle(type, p.x + p.nx * s * off - p.tx * 22, p.y + p.ny * s * off - p.ty * 22);
  }
  // Aliados repartidos: alternan lados del camino a distinta distancia
  (def.allies || []).forEach((a, i) => {
    const p = pathPt(a.u);
    let ax = 0, ay = 0, ok = false;
    for (let k = 0; k < 18 && !ok; k++) {
      const side = (i + k) % 2 === 0 ? -1 : 1, off = 52 + rand() * 70 - k * 2;
      ax = Math.round(p.x + p.nx * side * off - 8); ay = Math.round(p.y + p.ny * side * off - 10);
      ok = mm.isFree(ax + 8, ay + 18, 10) && slopeOK(ax + 8, ay + 18, 8);
    }
    mm.allies.push({ ...(ALLIES[a.id] || { name: a.id }), id: a.id, x: ax, y: ay, box: { x: ax + 4, y: ay + 16, w: 8, h: 4 } });
    claim(ax + 8, ay + 16, 40);
  });
  // Tienda junto al camino
  if (def.shop) {
    const p = pathPt(def.shop.u);
    for (let k = 0; k < 24; k++) {
      const side = def.shop.below ? (p.ny >= 0 ? 1 : -1) * (k % 2 ? -1 : 1) : (k % 2 ? 1 : -1);
      const off = 56 + k * 3;
      const sx = Math.round(p.x + p.nx * side * off - 18), sy = Math.round(p.y + p.ny * side * off - 24);
      const box = { x: sx + 4, y: sy + 20, w: 28, h: 9 };
      if (!T.blockedBox({ x: sx, y: sy, w: 36, h: 32 }) && mm.boxesNear({ x: sx - 8, y: sy - 8, w: 52, h: 48 }).length === 0) {
        mm.shop = { x: sx, y: sy, box };
        claim(sx + 18, sy + 26, 46);
        mm.lights.push({ x: sx + 33, y: sy + 12, r: 40, a: 0.8, flick: 0.06, warm: true, shopLamp: true });
        break;
      }
    }
  }
  // Lairs de los jefes salvajes (Rufus y Shela): ruinas en 5 puntos, 2 ocupados al azar
  if (def.ruinSites) {
    for (const u of def.ruinSites) {
      const p = pathPt(u);
      claim(p.x, p.y, 54);
      for (const [s, along, off, type] of [[-1, -22, 34, "pillar"], [1, 28, 34, "pillar"], [-1, 18, 54, "tomb"], [1, -18, 56, "tomb"], [-1, -4, 22, "rubble"], [1, 6, 22, "bigrubble"], [1, -38, 30, "fallen"]]) {
        addObstacle(type, p.x + p.nx * s * off + p.tx * along, p.y + p.ny * s * off + p.ty * along + (type === "pillar" ? 4 : 0));
      }
      if (u !== def.ruinSites[0]) mm.lights.push({ x: p.x + p.nx * 20, y: p.y + p.ny * 20 - 12, r: 28, a: 0.45, flick: 0.2, warm: true });
    }
    const sites = shuffle(def.ruinSites.slice());
    mm.arenas = [];
    (def.wildBosses || []).forEach((kind, i) => {
      const p = pathPt(sites[i]);
      // Centro de la arena: a un lado del camino, dejando sitio para un recinto grande que dé hacia la senda
      let acx = 0, acy = 0;
      for (let k = 0; k < 24; k++) {
        const side = (rand() < 0.5 ? -1 : 1) * (k % 2 ? -1 : 1), off = 120 + k * 4;
        acx = Math.round(p.x + p.nx * side * off); acy = Math.round(p.y + p.ny * side * off);
        if (inside(acx, acy, 96)) break;
      }
      buildArena(acx, acy, p.x, p.y);                       // recinto imponente con entrada hacia el camino
      const e = ENEMIES[kind];
      const sx = acx - 10, sy = acy - 28;                   // el jefe aguarda en el pedestal, al fondo del recinto
      mm.wildBosses.push({
        kind, x: sx, y: sy, alive: !defeated[kind], wild: true, box: { x: sx + 4, y: sy + 20, w: 12, h: 6 },
        def: { ...e, scale: 1.12, orderBank: PRESENT_PERFECT_ORDER, renderBig: () => renderWerewolfBig(kind, e.pal) },
      });
      mm.arenas.push({ x: acx, y: acy, kind });
    });
  }

  /** Recinto de jefe: muros de templo/ruina en rectángulo con UNA entrada hacia (tox,toy), columnas en las esquinas,
   *  braseros encendidos, estatuas guardianas y un pedestal al fondo donde aguarda el jefe. Al mismo nivel gráfico. */
  function buildArena(cx, cy, tox, toy) {
    const HW = 80, HH = 64, STEP = 24;
    claim(cx, cy, 108);
    // lado de la entrada = cardinal más cercano al camino
    const dx = tox - cx, dy = toy - cy;
    const eX = Math.abs(dx) >= Math.abs(dy) ? Math.sign(dx) : 0;
    const eY = eX === 0 ? Math.sign(dy) : 0;
    const put = (type, x, y, ex = {}) => { if (inside(x, y, 10) && path.nearest(x, y, 20).d > 14) addObstacle(type, Math.round(x), Math.round(y), ex); };
    const onEntrance = (x, y) => (eX !== 0 && Math.sign(x - cx) === eX && Math.abs(y - cy) < 34) || (eY !== 0 && Math.sign(y - cy) === eY && Math.abs(x - cx) < 34);
    // muros perimetrales (dejando el hueco de entrada)
    for (let x = cx - HW; x <= cx + HW; x += STEP) { if (!onEntrance(x, cy - HH)) put("wall", x, cy - HH); if (!onEntrance(x, cy + HH)) put("wall", x, cy + HH); }
    for (let y = cy - HH + STEP; y <= cy + HH - STEP; y += STEP) { if (!onEntrance(cx - HW, y)) put("wall", cx - HW, y); if (!onEntrance(cx + HW, y)) put("wall", cx + HW, y); }
    // columnas en las esquinas
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) put("pillar", cx + sx * (HW - 6), cy + sy * (HH - 6));
    // estatuas guardianas y antorchas flanqueando el pedestal (al fondo, lado opuesto a la entrada)
    const backY = eY > 0 ? cy - HH + 24 : eY < 0 ? cy + HH - 24 : cy;
    const backX = eX > 0 ? cx - HW + 24 : eX < 0 ? cx + HW - 24 : cx;
    put("statue", backX - 34, backY); put("statue", backX + 34, backY);
    const torch = (x, y, r) => { const o = addObstacle("torch", Math.round(x), Math.round(y), { seed: rand() * 10 }); if (o) { mm.emitters.push({ kind: "fire", x: o.bx, y: o.by - 20, owner: o }); mm.lights.push({ x: o.bx, y: o.by - 20, r, a: 0.85, flick: 0.18, warm: true, owner: o }); } };
    torch(backX - 20, backY + 10, 52); torch(backX + 20, backY + 10, 52);         // antorchas flanqueando el pedestal
    // antorchas a cada lado de la entrada
    const entX = eX !== 0 ? cx + eX * HW : cx, entY = eY !== 0 ? cy + eY * HH : cy;
    for (const [ox, oy] of (eX !== 0 ? [[0, -26], [0, 26]] : [[-26, 0], [26, 0]])) torch(entX + ox - eX * 10, entY + oy - eY * 10, 46);
    mm.lights.push({ x: cx, y: cy, r: 90, a: 0.5, flick: 0.08, warm: true });   // resplandor central del recinto
  }
  // Gólem del Léxico: en el extremo de la ruta, con columnata
  if (def.boss) {
    const p = pathPt(def.boss.u ?? 1);
    const bx = Math.round(p.x - 28), by = Math.round(p.y - 56);
    mm.boss = { def: GOLEM, x: bx, y: by, alive: true, awake: false, box: { x: bx + 6, y: by + 44, w: 44, h: 16 } };
    claim(p.x, p.y, 130);
    for (const [ox, oy] of [[-46, 6], [-46, 96], [-100, 0], [-100, 102], [104, 10], [104, 92], [30, -40], [-30, -50]]) {
      const x = bx + 28 + ox, y = by + oy;
      if (!T.blockedPx(x | 0, y | 0)) addObstacle("pillar", x, y);
    }
  }
  // Santuario de la Voz (speaking): junto al camino, a mitad de ruta
  if (def.shrine) {
    for (let k = 0; k < 30; k++) {
      const p = pathPt(0.46 + (k % 5) * 0.015), side = k % 2 ? 1 : -1, off = 38 + Math.floor(k / 2) * 3;
      const x = p.x + p.nx * side * off, y = p.y + p.ny * side * off + 6;
      if (!canPlace(x, y, 10, { pathClear: 20 })) continue;
      const o = addObstacle("shrine", x, y, { seed: rand() * 10 });
      if (o) { mm.lights.push({ x: o.bx, y: o.by - 18, r: 46, a: 0.8, flick: 0.1, owner: o }); claim(x, y, 40); break; }
    }
  }
  // Antorchas góticas junto al camino
  const nTorch = def.torches ?? 0;
  for (let i = 0; i < nTorch; i++) {
    const p = pathPt(0.06 + (0.88 * (i + rand() * 0.4)) / Math.max(1, nTorch));
    const s = i % 2 ? 1 : -1, off = 21 + rand() * 4;
    const x = p.x + p.nx * s * off, y = p.y + p.ny * s * off;
    if (!canPlace(x, y, 5, { pathClear: 14 })) continue;
    const o = addObstacle("torch", x, y, { seed: rand() * 10 });
    if (o) { mm.lights.push({ x: o.bx, y: o.by - 20, r: 44, a: 0.85, flick: 0.18, warm: true, owner: o }); mm.emitters.push({ kind: "fire", x: o.bx, y: o.by - 20, owner: o }); }
  }

  /* ---------- Borde del mapa: franja de árboles y rocas con contorno irregular ---------- */
  const gateC = mm.gate || { x: -9999, y: -9999 };
  const rimTypes = def.rimMix || ((r) => (r < 0.55 ? "pine" : r < 0.9 ? "oak" : "dead"));
  {
    const edgeNoise = (u, k) => Math.sin(u * 0.011 + k * 1.7) * 14 + Math.sin(u * 0.037 + k * 4.1) * 7;
    const rows = [[44, 17, 6], [28, 15, 8], [64, 34, 12], [92, 52, 18]];
    rows.forEach(([base, step, jit], ri) => {
      for (const side of [0, 1, 2, 3]) {                                // arriba, derecha, abajo, izquierda
        const along = side % 2 === 0 ? L.W : L.H;
        for (let u = 14 + rand() * step; u < along - 14; u += step * (0.8 + rand() * 0.4)) {
          if (ri === 3 && rand() < 0.45) continue;                      // la fila exterior es más clara
          const inset = base + edgeNoise(u, side + ri * 3) + (rand() - 0.5) * jit;
          const x = side === 0 || side === 2 ? u : side === 1 ? L.W - inset : inset;
          const y = side === 1 || side === 3 ? u : side === 0 ? inset : L.H - inset;
          if (!inside(x, y, 14)) continue;
          if (Math.hypot(x - gateC.x, y - gateC.y) < 62) continue;
          if (path.nearest(x, y, 40).d < 26) continue;
          addObstacle(rimTypes(rand()), x, y);
        }
      }
    });
  }

  /* ---------- Interior: compuesto por escenas (bosque, claros, ruinas, campamentos…) ---------- */
  /** Efectos de un objeto recién colocado (luces y fuego de antorchas, braseros y cristales). */
  function afterAdd(o) {
    if (o.type === "torch") { mm.lights.push({ x: o.bx, y: o.by - 20, r: 44, a: 0.85, flick: 0.18, warm: true, owner: o }); mm.emitters.push({ kind: "fire", x: o.bx, y: o.by - 20, owner: o }); }
    else if (o.type === "brazier") { mm.emitters.push({ kind: "fire", x: o.bx, y: o.by - 44, owner: o }); mm.lights.push({ x: o.bx, y: o.by - 44, r: 46, a: 0.8, flick: 0.18, warm: true, owner: o }); }
    else if (o.type === "crystal") mm.lights.push({ x: o.bx, y: o.by - 12, r: 30, a: 0.5, flick: 0.08, warm: false, owner: o });
  }
  /** Coloca un objeto si hay sitio (colisiones, camino, reclamos) y le aplica sus efectos. */
  function addSmart(type, x, y, extra = {}, o = {}) {
    const r = o.r ?? RAD[type] ?? 8;
    if (!canPlace(x, y, r, { pathClear: o.pathClear ?? r + 14, free: o.free !== false })) return null;
    if (type === "torch") extra = { seed: rand() * 10, ...extra };
    if (type === "log" && extra.variant == null) extra = { ...extra, variant: (rand() * 2) | 0 };
    const ob = addObstacle(type, x, y, extra);
    if (ob) afterAdd(ob);
    return ob;
  }
  if (kitKey) {
    composeScenery({ def, kitKey, L, mm, rand, path, randIn, canPlace, claim, bigPlaced, addSmart });
  } else {
  const scatter = def.scatter || { pine: 0.22, oak: 0.2, dead: 0.06, rock: 0.14, tomb: 0.05, pillar: 0.04, rubble: 0.07, bigrubble: 0.04, crate: 0.03, barrel: 0.02, fence: 0.03, log: 0.03, stump: 0.02, wall: 0.04, fallen: 0.03, statue: 0.01 };
  const kinds = Object.keys(scatter).filter((k) => !kitKey || kitHas(kitKey, k)), weights = kinds.map((k) => scatter[k]);
  const wTotal = weights.reduce((a, b) => a + b, 0);
  const pick = () => { let r = rand() * wTotal; for (let i = 0; i < kinds.length; i++) { r -= weights[i]; if (r <= 0) return kinds[i]; } return kinds[0]; };
  const want = def.interior ?? 220;
  let placed = 0;
  for (let i = 0; i < want * 14 && placed < want; i++) {
    const q = randIn(100);
    const x = q.x, y = q.y;
    const type = pick();
    const big = BIG.has(type);
    if (type === "plant" || type === "mushroom") {                       // matas, trigo, flores y setas: sin colisión, en racimos
      if (!canPlace(x, y, 5, { pathClear: 10, free: false })) continue;
      const n = 1 + ((rand() * 3) | 0);
      for (let q = 0; q < n; q++) addObstacle(type, x + (rand() - 0.5) * 22, y + (rand() - 0.5) * 12);
      placed++;
      continue;
    }
    const r = big ? 12 : 8;
    if (!canPlace(x, y, r, { pathClear: big ? 30 : 20 })) continue;
    if (bigPlaced.some((q) => Math.hypot(q.x - x, q.y - y) < (big ? (type === "crag" ? 70 : 54) : 24))) continue;
    const extra = type === "log" ? { variant: (rand() * 2) | 0 } : {};
    const o = addObstacle(type, x, y, extra);
    if (!o) continue;
    if (big) bigPlaced.push({ x, y });
    placed++;
    if (type === "brazier") { mm.emitters.push({ kind: "fire", x: o.bx, y: o.by - 44, owner: o }); mm.lights.push({ x: o.bx, y: o.by - 44, r: 46, a: 0.8, flick: 0.18, warm: true, owner: o }); }
    if (type === "crystal") mm.lights.push({ x: o.bx, y: o.by - 12, r: 30, a: 0.5, flick: 0.08, warm: false, owner: o });
    if (type === "stump" && rand() < 0.6) { o.burning = true; mm.emitters.push({ kind: "fire", x: o.bx, y: o.by - 8, owner: o }); mm.lights.push({ x: o.bx, y: o.by - 8, r: 18, a: 0.5, flick: 0.2, warm: true, owner: o }); }
  }

  }

  /* ---------- Cimas de las montañas: árboles secos, rocas y un cofre en la cumbre ---------- */
  for (const hill of L.hills) {
    hill.tierInfo.forEach((info, ti) => {
      const nTop = Math.round(info.tier.r / 14);
      const inner = hill.tiers[ti + 1];
      let placedHere = 0;
      for (let k = 0; k < nTop * 8 && placedHere < nTop; k++) {
        const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * info.tier.r * 0.9;
        const x = hill.cx + Math.cos(a) * d, y = hill.cy + Math.sin(a) * d * 0.9;
        if (!info.inside(x, y)) continue;
        if (inner) { const dx = x - hill.cx, dy = y - hill.cy; if (dx * dx + dy * dy < (inner.radius(Math.atan2(dy, dx)) + 22) ** 2) continue; }
        if (hill.tierInfo.some((q) => q.tier.stair && Math.abs(x - q.tier.stair.x) < 24 && Math.abs(y - q.tier.stair.yb) < 34)) continue;
        if (!canPlace(x, y, 9, { pathClear: 0 })) continue;
        if (bigPlaced.some((q) => Math.hypot(q.x - x, q.y - y) < 34)) continue;
        const t = rand();
        const type = hill.snow ? (t < 0.4 ? "dead" : t < 0.8 ? "rock" : "rubble") : (t < 0.3 ? "pine" : t < 0.5 ? "dead" : t < 0.8 ? "rock" : "rubble");
        addObstacle(type, x, y);
        bigPlaced.push({ x, y });
        placedHere++;
      }
    });
    const sx = hill.cx, sy = hill.cy + 4;
    claim(sx, sy, 22);
    const torch = addObstacle("torch", sx - 18, sy + 2, { seed: rand() * 10 });
    if (torch) { mm.lights.push({ x: torch.bx, y: torch.by - 20, r: 44, a: 0.85, flick: 0.18, warm: true, owner: torch }); mm.emitters.push({ kind: "fire", x: torch.bx, y: torch.by - 20, owner: torch }); }
    const torch2 = addObstacle("torch", sx + 18, sy + 2, { seed: rand() * 10 });
    if (torch2) { mm.lights.push({ x: torch2.bx, y: torch2.by - 20, r: 44, a: 0.85, flick: 0.18, warm: true, owner: torch2 }); mm.emitters.push({ kind: "fire", x: torch2.bx, y: torch2.by - 20, owner: torch2 }); }
  }

  /* ---------- Árboles del anillo exterior: sprites por mapa ---------- */
  mm.trees = {
    main: Array.from({ length: 4 }, () => makeLeafyTree(rand, pal.foliage)),
    alt: Array.from({ length: 4 }, () => makeLeafyTree(rand, pal.foliageAlt)),
  };
  mm.rocks = Array.from({ length: 3 }, () => makeMossRock(rand));

  /* ---------- Lobos repartidos por todo el disco ---------- */
  const blockedAt = (box) => mm.wolfBlocked(box);
  (def.wolves || []).forEach((pack) => {
    for (let i = 0, made = 0; i < 1500 && made < pack.count; i++) {
      const q = randIn(130);
      const x = q.x, y = q.y;
      if (Math.hypot(x - mm.start.x, y - mm.start.y) < 190) continue;
      if (Math.hypot(x - gateC.x, y - gateC.y) < 110) continue;
      if (mm.wolves.some((o) => Math.hypot(o.x - x, o.y - y) < 80)) continue;
      const id = `${pack.kind}${made}`;
      const w = new Wolf(ENEMIES[pack.kind], Math.round(x), Math.round(y), id);
      if (blockedAt(w.box())) continue;
      made++;
      if (!defeated[id]) mm.wolves.push(w);
    }
  });

  /* ---------- Enemigos marinos en lo profundo de los lagos grandes ---------- */
  mm.marine = [];
  const marineKind = (def.sub?.level === "A2") ? "merrow" : "nixie";
  for (const lk of L.lakes) {
    if (lk.r < 72) continue;                                    // solo lagos con profundidad real
    lk.deep = lk.r * 0.42;                                      // radio de la zona profunda
    const n = lk.r > 112 ? 2 : 1;
    for (let i = 0, made = 0; i < 40 && made < n; i++) {
      const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * lk.deep * 0.9;
      const x = Math.round(lk.cx + Math.cos(a) * d), y = Math.round(lk.cy + Math.sin(a) * d);
      if (!T.waterAt(x, y)) continue;
      const id = `marine${lk.id}.${i}`;
      if (defeated[id]) { made++; continue; }
      const e = ENEMIES[marineKind];
      mm.marine.push({ id, kind: marineKind, x, y, hx: lk.cx, hy: lk.cy, lake: lk, deep: lk.deep, phase: rand() * 6.28, alive: true, flip: rand() < 0.5, vx: 0, vy: 0, cd: 0,
        def: { ...e, renderBig: () => renderMarineBig(e.marineVariant || 0) } });
      made++;
    }
  }

  /* ---------- Remolinos: el centro profundo de un lago lleva (nadando) al de otro, para salir por otro lado del mapa ---------- */
  mm.whirls = [];
  const deepLakes = L.lakes.filter((l) => l.deep);
  if (deepLakes.length >= 2) {
    for (let i = 0; i < deepLakes.length; i++) {
      const a = deepLakes[i], b = deepLakes[(i + 1) % deepLakes.length];
      mm.whirls.push({ x: Math.round(a.cx), y: Math.round(a.cy), tx: Math.round(b.cx), ty: Math.round(b.cy) });
    }
  }

  /* ---------- Botín: monedas y reliquias por todo el mapa, cofres en cimas y casas ---------- */
  mm.loot = def.loot ? generateLoot(mm, rand, def.loot).filter((it) => !taken[it.id]) : [];
  L.hills.forEach((h, i) => {
    const it = { id: `${def.id}:summit${i}`, kind: "relic", x: Math.round(h.cx), y: Math.round(h.cy - 6), phase: 0, summit: true };
    if (!taken[it.id]) mm.loot.push(it);
  });
  mm.houses.forEach((h, i) => {
    for (let k = 0; k < 4; k++) {
      const it = { id: `${def.id}:home${i}.${k}`, kind: k === 0 && i % 2 === 0 ? "relic" : "coin", x: h.x + 14 + Math.round(rand() * (h.w - 28)), y: h.y + 36 + Math.round(rand() * 14), phase: rand() * 6 };
      if (!taken[it.id]) mm.loot.push(it);
    }
  });

  /* ---------- Sigilos de alas (Abel puede volar desde ellos) y tesoros bajo el agua ---------- */
  mm.sigils = [];
  const addSigil = (x, y, why) => { if (T.blockedPx(x | 0, y | 0, 1) || mm.sigils.some((q) => Math.hypot(q.x - x, q.y - y) < 60)) return; mm.sigils.push({ x: Math.round(x), y: Math.round(y), why }); claim(x, y, 20); };
  { const p = pathPt(0.08); addSigil(p.x + p.nx * 30, p.y + p.ny * 30, "start"); }
  for (const h of L.hills) {                                       // junto al pie de cada montaña: volar a la cima
    const low = h.tierInfo[0].tier.stair;
    if (low) for (const [dx, dy] of [[-34, 26], [34, 26], [0, 40]]) { const x = low.x + dx, y = low.bottomY + dy; if (!T.blockedPx(x | 0, y | 0)) { addSigil(x, y, "summit"); break; } }
  }
  for (const lk of L.lakes) {                                      // en la orilla de cada lago: cruzarlo o llegar a su isla de perlas
    for (let k = 0; k < 24; k++) {
      const a = rand() * Math.PI * 2, rr = lk.radius(a) * 1.22;
      const x = lk.cx + Math.cos(a) * rr, y = lk.cy + Math.sin(a) * rr;
      if (!inside(x, y, 100) || T.blockedPx(x | 0, y | 0, 1) || path.nearest(x, y, 40).d < 22) continue;
      addSigil(x, y, "lake"); break;
    }
    // perlas bajo el agua: se recogen nadando
    for (let k = 0, n = 0; k < 120 && n < 5; k++) {
      const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * lk.radius(a) * 0.72;
      const x = lk.cx + Math.cos(a) * d, y = lk.cy + Math.sin(a) * d;
      if (!T.waterAt(x | 0, y | 0)) continue;
      const it = { id: `${def.id}:pearl${lk.id}.${n}`, kind: n === 0 ? "relic" : "coin", x: Math.round(x), y: Math.round(y), phase: rand() * 6, value: 6, water: true };
      n++;
      if (!taken[it.id]) mm.loot.push(it);
    }
  }

  /* ---------- Decoración del suelo y hierba animada ---------- */
  decorateGround(T, L, ground ? { ...pal, decorMul: 0.32 } : pal, rand, mm.obstacles, mm.houses);
  const field = new GrassField(scatterGrass(L, T, rand, def.grassSpacing ?? 34), pal.tuft);
  mm.grassField = field;
  mm.grass = field.patches;
  mm.grassNear = (x, y, r) => field.near(x, y, r);
  mm.grassTouch = (g) => field.touch(g);

  // Sombra de los árboles del anillo sobre el suelo ya estampada en decorateGround; luces fijas de las ruinas
  mm.mushrooms = [];
  for (let i = 0; i < 70; i++) {
    const o = mm.obstacles[(rand() * mm.obstacles.length) | 0];
    if (!o || o.by < 80) continue;
    mm.mushrooms.push({ x: o.bx + (rand() < 0.5 ? -8 : 7), y: o.by - 1, p: rand() * 6.28 });
  }
  return mm;
}

/* ======================================================================
   DIBUJO DE OBJETOS DEL MUNDO
   ====================================================================== */

function R(g, c, x, y, w, h) { g.fillStyle = c; g.fillRect(x, y, w, h); }

function drawDead(g, x, y, v) {
  const c = "#2a2030";
  R(g, c, x - 2, y - 34, 4, 34); R(g, "#3a2d40", x - 2, y - 34, 1, 34);
  R(g, c, x - 12, y - 26, 10, 2); R(g, c, x - 12, y - 32, 2, 6);
  R(g, c, x + 2, y - 20, 10, 2); R(g, c, x + 10, y - 26, 2, 6);
  R(g, c, x - 1, y - 42, 2, 8); R(g, c, x + 1, y - 38, 6, 2);
  R(g, c, x - 5, y - 2, 10, 2);
  if (v > 0.7) { R(g, "#0a0610", x + 8, y - 30, 4, 3); R(g, "#c33", x + 11, y - 30, 1, 1); }
}
function drawTomb(g, x, y) {
  R(g, "#5b5870", x - 6, y - 14, 12, 14); R(g, "#5b5870", x - 4, y - 16, 8, 2);
  R(g, "#44415a", x + 3, y - 14, 3, 14);
  R(g, "#2e2c3d", x - 1, y - 12, 2, 7); R(g, "#2e2c3d", x - 3, y - 10, 6, 2);
  R(g, "#2f4a33", x - 7, y - 2, 14, 2); R(g, "#3d5a3a", x - 6, y - 4, 3, 2);
}
function drawPillar(g, x, y) {
  R(g, "#4a4660", x - 6, y - 30, 12, 28); R(g, "#5d5878", x - 6, y - 30, 3, 28); R(g, "#38344a", x + 3, y - 30, 3, 28);
  R(g, "#38344a", x - 1, y - 28, 1, 24);
  R(g, "#4a4660", x - 6, y - 33, 4, 3); R(g, "#4a4660", x + 1, y - 35, 5, 5);
  R(g, "#38344a", x - 8, y - 4, 16, 4); R(g, "#4a4660", x - 8, y - 5, 16, 1);
  R(g, "#2f4a33", x - 6, y - 18, 2, 10); R(g, "#2f4a33", x - 4, y - 12, 2, 3);
}

/** Grietas por etapas sobre un objeto de piedra/madera (centro cx,cy; semianchura w). */
function drawCracks(g, o, cx, cy, w, h) {
  const n = (o.cracks || 0) * 4 + 2;
  g.fillStyle = "#120e18";
  let seed = (o.id * 7919 + 13) | 0;
  const rnd = () => { seed = (Math.imul(seed, 1103515245) + 12345) | 0; return ((seed >>> 8) & 0xffff) / 65536; };
  for (let k = 0; k < n; k++) {
    let x = cx + (rnd() - 0.5) * w, y = cy - h * rnd();
    const dir = rnd() < 0.5 ? -1 : 1, len = 3 + ((rnd() * 5) | 0);
    for (let s = 0; s < len; s++) { g.fillRect(Math.round(x), Math.round(y), 1, 1); x += dir * (rnd() < 0.6 ? 1 : 0); y += 1; }
  }
}

const SPRITE_KEYS = {
  rubble: (S, o) => [S.rubble[(o.v * 7 | 0) % 3], 10, 9],
  bigrubble: (S, o) => [S.bigrubble[(o.v * 7 | 0) % 2], 15, 14],
  fallen: (S, o) => [S.fallen[(o.v * 7 | 0) % 2], 18, 13],
  wall: (S, o) => [S.wall[(o.v * 7 | 0) % 2], 15, 23],
  crate: (S, o) => [S.crate[o.v < 0.3 ? 1 : 0], 7, 13],
  barrel: (S) => [S.barrel[0], 6, 14],
  stump: (S, o) => [S.stump[(o.v * 7 | 0) % 2], 8, 11],
  statue: (S) => [S.statue[0], 9, 33],
  arch: (S) => [S.arch[0], 22, 35],
  fence: (S, o) => [S.fence[(o.v * 7 | 0) % 2], 13, 11],
  well: (S) => [S.well, 11, 21],
  cart: (S) => [S.cart, 17, 17],
  torch: (S) => [S.torch, 4, 21],
};

/** Dibuja un obstáculo del mapa (con balanceo, temblor por impacto y grietas). */
export function drawObstacle(g, o, mm, t) {
  if (o.fall) {                                            // pilar o estatua desplomándose: gira sobre su base
    const f = o.fall; o.fall = null;
    g.save(); g.translate(o.bx, o.by); g.rotate(f.dir * f.ang); g.translate(-o.bx, -o.by);
    drawObstacle(g, o, mm, t);
    g.restore(); o.fall = f; return;
  }
  if (o.spr) { drawArtObstacle(g, o, mm, t); return; }
  if ((o.type === "barrel" || o.type === "crate") && (o.mv || o.rot)) { drawTumbling(g, o, mm); return; }
  const shk = o.shake > 0 && o.type !== "pine" && o.type !== "oak" ? Math.round(Math.sin(t * 50 + o.id) * 1.5 * Math.min(1, o.shake)) : 0;
  const x = o.bx + shk, y = o.by;
  switch (o.type) {
    case "pine": case "oak": {
      const set = o.v < mm.pal.purple ? mm.trees.alt : mm.trees.main;
      drawTree(g, set[Math.floor(o.v * 977) % set.length], o);
      return;
    }
    case "rock": if (!o.spr) g.drawImage(mm.rocks[Math.floor(o.v * 977) % mm.rocks.length], x - 11, y - 14); break;
    case "shrine": drawShrine(g, o, t); return;
    case "dead": drawDead(g, x, y, o.v); break;
    case "tomb": drawTomb(g, x, y); break;
    case "pillar": drawPillar(g, x, y); break;
    case "log": {
      const S = mm.sprites, img = (o.vert ? S.logV : S.logH)[(o.variant || 0) % 2];
      if (o.vert) g.drawImage(img, x - 5, y - 33); else g.drawImage(img, x - 18, y - 10);
      break;
    }
    default: {
      const k = SPRITE_KEYS[o.type];
      if (!k) return;
      const [img, ox, oy] = k(mm.sprites, o);
      g.drawImage(img, x - ox, y - oy);
      if (o.type === "stump" && o.burning) drawFlame(g, x, y - 9, t, o.v * 9, 0.9);
      if (o.type === "torch") drawFlame(g, x, y - 19, t, o.seed || 0, 1);
    }
  }
  if (o.type === "shrine") drawShrine(g, o, t);
  if (o.cracks) {
    const big = o.type === "pillar" || o.type === "wall" || o.type === "statue" || o.type === "fallen";
    drawCracks(g, o, x, y - (big ? 14 : 5), big ? 10 : 8, big ? 24 : 9);
  }
  if (o.hit > 0) {                                         // destello blanco al recibir un golpe
    g.globalAlpha = Math.min(0.55, o.hit * 3);
    g.globalCompositeOperation = "lighter";
    R(g, "#ffffff", x - 5, y - (o.type === "pillar" ? 24 : 8), 10, o.type === "pillar" ? 22 : 7);
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
  }
}

/** Barril/caja rodando o deslizándose: sombra en el suelo, salto (z) y giro sobre su centro. */
function drawTumbling(g, o, mm) {
  const k = SPRITE_KEYS[o.type]; if (!k) return;
  const [img, ox, oy] = k(mm.sprites, o);
  const z = o.z || 0;
  g.globalAlpha = Math.max(0.12, 0.38 - z * 0.02); R(g, "#000", o.bx - 6, o.by - 1, 12, 2); g.globalAlpha = 1;
  g.save();
  g.translate(Math.round(o.bx - ox + img.width / 2), Math.round(o.by - oy + img.height / 2 - z));
  g.rotate(o.rot || 0);
  g.drawImage(img, -img.width / 2, -img.height / 2);
  g.restore();
}

/**
 * Copas y casas altas: si Abel queda DETRÁS (sus pies más arriba que la base del objeto) y su silueta cae dentro del sprite,
 * el objeto se vuelve translúcido con suavidad para no esconderlo. Devuelve el alfa a usar (1 = opaco).
 * `mm.focus` = {x, y} pies de Abel (lo fija el bucle de dibujo cada fotograma).
 */
export function seeThrough(o, mm, f) {
  const fo = mm.focus;
  let target = 0;
  if (fo && f && fo.y < o.by - 3) {
    const x0 = o.bx - f.ax, y0 = o.by - f.ay;
    if (fo.x + 8 > x0 && fo.x - 8 < x0 + f.w && fo.y > y0 && fo.y - 36 < y0 + f.h) target = 1;
  }
  o.fade = (o.fade || 0) + (target - (o.fade || 0)) * 0.16;
  if (o.fade < 0.02) { o.fade = 0; return 1; }
  return 1 - 0.55 * o.fade;
}

/** Obstáculo con sprite del atlas: cada tipo se mueve a su manera (material, peso y forma). */
function drawArtObstacle(g, o, mm, t) {
  const type = o.type;
  const hit = o.hit > 0 ? o.hit * 3 : 0;
  const rigid = type !== "oak" && type !== "pine" && type !== "plant" && type !== "dead" && type !== "mushroom";
  const shk = o.shake > 0 && rigid ? Math.round(Math.sin(t * 50 + o.id) * 1.4 * Math.min(1, o.shake)) : 0;
  const f = artFrame(o.sa, o.spr);
  switch (type) {
    case "oak": case "pine": {                                          // el tronco queda fijo; solo la copa y las ramas se mecen con el viento
      const tsh = o.shake > 0.02 ? Math.round(Math.sin(t * 48 + o.id) * 1.6 * Math.min(1, o.shake)) : 0;   // sacudida breve del árbol al recibir un golpe
      drawArt(g, o, t, { amp: 3.4, canopy: 0.5, ox: tsh, flash: hit, alpha: seeThrough(o, mm, f) }); break;
    }
    case "dead": {                                                      // árbol seco: ramas desnudas, mecen poco
      const tsh = o.shake > 0.02 ? Math.round(Math.sin(t * 48 + o.id) * 1.4 * Math.min(1, o.shake)) : 0;
      drawArt(g, o, t, { amp: 1.6, canopy: 0.42, ox: tsh, flash: hit, alpha: seeThrough(o, mm, f) }); break;
    }
    case "plant": {
      const pp = mm.pp;                                               // la hierba alta se aparta al pasar
      o.push = 0;
      if (pp) { const dx = o.bx - pp.x, dy = o.by - pp.y, d2 = dx * dx + dy * dy; if (d2 < 196) o.push = (dx >= 0 ? 1 : -1) * (1 - Math.sqrt(d2) / 14) * 3.2; }
      const amp = o.sway ?? 3.0;
      if (o.burn > 0) { drawArt(g, o, t, { amp: 0.5, cut: o.cut ? 0.6 : 0.1 * (1 - o.burn), alpha: 0.6 + 0.4 * o.burn }); break; }
      drawArt(g, o, t, { amp: o.cut ? 0 : amp, k: 1.2, cut: o.cut ? 0.62 : 0, flash: hit });
      break;
    }
    case "mushroom":
      drawArt(g, o, t, { squash: o.squash ? 0.8 : 0, flash: hit }); break;
    case "crystal": {
      drawArt(g, o, t, { ox: shk, flash: hit + 0.1 + 0.08 * Math.sin(t * 2.4 + o.id) });
      if (Math.random() < 0.012) mm.sparkle?.(o.bx + (Math.random() - 0.5) * 8, o.by - (f ? f.h * 0.6 : 12));
      break;
    }
    case "crag": case "rock":
      drawArt(g, o, t, { ox: shk, flash: hit });
      if (o.cracks) drawCracks(g, o, o.bx + shk, o.by - 10, type === "crag" ? 18 : 8, type === "crag" ? 34 : 10);
      break;
    case "log":
      drawArt(g, o, t, { ox: shk, flash: hit, rot: o.rot || 0, oy: o.z ? -o.z : 0, pivotY: 4 });
      if (o.cracks) drawCracks(g, o, o.bx + shk, o.by - 6, 12, 8);
      break;
    case "barrel": case "crate": case "cart": {                        // ruedan o se deslizan: sombra en el suelo, salto y giro sobre el centro
      const z = o.z || 0, hh = f ? f.h : 12;
      if (z > 0.2 || o.mv) { g.globalAlpha = Math.max(0.12, 0.34 - z * 0.02); R(g, "#000", o.bx - (f ? f.w * 0.3 : 6), o.by - 1, f ? f.w * 0.6 : 12, 2); g.globalAlpha = 1; }
      drawArt(g, o, t, { ox: shk, flash: hit, rot: o.rot || 0, oy: o.z ? -o.z : 0, pivotY: hh / 2 });
      break;
    }
    case "tomb":
      drawArt(g, o, t, { ox: shk, flash: hit, rot: o.rot || 0, pivotY: 2 });
      if (o.cracks && !o.lying) drawCracks(g, o, o.bx + shk, o.by - 8, 6, 14);
      break;
    case "pillar": case "statue": case "wall": case "brazier": case "fence": case "rubble": case "bigrubble": case "stump":
      drawArt(g, o, t, { ox: shk, flash: hit });
      if (o.cracks) { const big = type === "pillar" || type === "wall" || type === "statue"; drawCracks(g, o, o.bx + shk, o.by - (big ? 14 : 6), big ? 9 : 7, big ? 28 : 10); }
      break;
    default:
      drawArt(g, o, t, { ox: shk, flash: hit });
  }
}

/** Dibuja juncos (balanceo con el viento) y nenúfares de las orillas. */
export function drawDecor(g, d, mm, t) {
  const S = mm.sprites;
  if (d.type === "lily") {
    g.drawImage(S.lily, d.x - 4, Math.round(d.y - 2 + Math.sin(t * 1.4 + d.p) * 0.7));
  } else {
    const sw = wind.sway(d.x, d.y, d.p);
    const img = S.reeds[(d.v * 3 | 0) % 3];
    // dos franjas: la punta se mece, la base no
    g.drawImage(img, 0, 0, 12, 7, d.x - 6 + Math.round(sw * 1.2), d.y - 13, 12, 7);
    g.drawImage(img, 0, 7, 12, 7, d.x - 6, d.y - 6, 12, 7);
  }
}

/** Sello mágico del extremo del camino: aro rúnico vertical/horizontal que late y echa chispas. */
export function drawSeal(g, gate, t, alpha) {
  if (alpha <= 0) return;
  const b = gate.box;
  g.globalAlpha = alpha * 0.22;
  R(g, "#7a3cff", b.x, b.y, b.w, b.h);
  g.globalAlpha = alpha;
  if (gate.horiz) {
    for (let y = b.y; y < b.y + b.h; y += 3) {
      const o = Math.sin(t * 4 + y * 0.15) * 2;
      R(g, ((y / 3) | 0) % 5 === 0 ? "#f0d0ff" : "#9a5cff", Math.round(b.x + 3 + o), y, 3, 2);
    }
    for (let k = 0; k < 6; k++) R(g, "#ffe9ff", b.x + 4, b.y + ((k * 23 + t * 24) % b.h) | 0, 2, 4);
  } else {
    for (let x = b.x; x < b.x + b.w; x += 3) {
      const o = Math.sin(t * 4 + x * 0.15) * 2;
      R(g, ((x / 3) | 0) % 5 === 0 ? "#f0d0ff" : "#9a5cff", x, Math.round(b.y + 3 + o), 2, 3);
    }
    for (let k = 0; k < 6; k++) R(g, "#ffe9ff", b.x + ((k * 23 + t * 24) % b.w) | 0, b.y + 4, 4, 2);
  }
  g.globalAlpha = 1;
}


/** Santuario de la Voz: altar de piedra con un cristal azul que late y runas flotantes (apagado cuando ya se usó). */
function drawShrine(g, o, t) {
  const x = o.bx, y = o.by, used = !!o.used;
  const pulse = used ? 0.2 : 0.55 + 0.45 * Math.sin(t * 2.6 + o.seed);
  R(g, "rgba(0,0,0,0.35)", x - 11, y - 2, 22, 3);
  R(g, "#2e2c3d", x - 10, y - 8, 20, 8); R(g, "#4a4660", x - 9, y - 9, 18, 6); R(g, "#5d5878", x - 9, y - 9, 18, 1);
  R(g, "#38344a", x - 6, y - 20, 12, 12); R(g, "#4a4660", x - 6, y - 21, 12, 3); R(g, "#5d5878", x - 5, y - 20, 3, 11);
  const c = used ? "#3a4a5a" : "#9ad0ff";
  g.globalAlpha = 0.5 + pulse * 0.5;
  R(g, c, x - 2, y - 30 - Math.round(Math.sin(t * 2 + o.seed) * 1.5), 4, 8);
  R(g, used ? "#5a6a7a" : "#ffffff", x - 1, y - 29 - Math.round(Math.sin(t * 2 + o.seed) * 1.5), 1, 3);
  g.globalAlpha = 1;
  for (let i = 0; i < 3; i++) {                           // runas que giran alrededor
    const a = t * 1.3 + i * 2.09 + o.seed;
    g.globalAlpha = used ? 0.2 : 0.8;
    R(g, "#9ad0ff", Math.round(x + Math.cos(a) * 10), Math.round(y - 22 + Math.sin(a) * 4), 1, 2);
  }
  g.globalAlpha = 1;
}
