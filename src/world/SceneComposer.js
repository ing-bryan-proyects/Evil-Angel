/**
 * SceneComposer · el escenario interior de cada mapa, compuesto como un lugar con historia
 * -----------------------------------------------------------------------------------------
 * En vez de esparcir objetos al azar por todo el disco (cosas puestas "por poner"), el mapa se compone en capas:
 *
 *   1. Un campo de ruido de baja frecuencia reparte el territorio en ARBOLEDAS densas y CLAROS abiertos; otro
 *      campo decide la especie dominante de cada zona (un robledal, un pinar, un matorral de árboles secos).
 *   2. ESCENAS con sentido (ruina de capilla, cementerio, campamento, tronco caído con su tocón, afloramiento de
 *      rocas, círculo de piedras, campo de cultivo, huerto, columnata, cristales…) se colocan en los claros, a
 *      distancia del camino, con espacio vacío alrededor para que se lean como un lugar y no como un montón.
 *   3. Los ÁRBOLES llenan las arboledas con separación según su especie; unos pocos solitarios rompen los claros;
 *      el camino se bordea de árboles solo donde hay bosque.
 *   4. El SOTOBOSQUE (matas y setas) crece al pie de los árboles, en prados y junto a troncos caídos, no suelto.
 *   5. La ORILLA de cada lago lleva rocas, juncos y algún tronco, solo en tramos.
 *
 * Recibe las herramientas del constructor (colocación con colisiones, reclamos de zona…) y devuelve la lista de
 * escenas colocadas (para pruebas y depuración).
 */
import { kitHas } from "./Kits.js";

/** Escenas por bioma (cantidades para un mapa de 2250×1500; se escalan con el área). */
const PROFILES = {
  forest: { share: 0.5, trees: { oak: 0.55, pine: 0.36, dead: 0.09 }, scenes: { chapel: 1, camp: 1, fallenTree: 3, outcrop: 2, meadow: 3, standing: 0 } },
  amber: { share: 0.3, trees: { oak: 0.62, pine: 0.28, dead: 0.1 }, scenes: { field: 3, camp: 1, fallenTree: 1, outcrop: 2, meadow: 1, chapel: 1 } },
  hollow: { share: 0.42, trees: { dead: 0.6, oak: 0.22, pine: 0.18 }, scenes: { graveyard: 3, chapel: 2, camp: 1, fallenTree: 2, outcrop: 1, standing: 1 } },
  marsh: { share: 0.4, trees: { dead: 0.42, oak: 0.34, pine: 0.24 }, scenes: { graveyard: 1, fallenTree: 3, outcrop: 2, camp: 1, meadow: 2, standing: 1, chapel: 1 } },
  peaks: { share: 0.85, trees: { pine: 0.62, dead: 0.22, oak: 0.16 }, scenes: { outcrop: 6, camp: 1, standing: 1, crystals: 3, fallenTree: 1, meadow: 3 } },
  sanctum: { share: 0.14, trees: { dead: 0.55, pine: 0.45 }, scenes: { court: 2, crystals: 4, statuary: 2, standing: 1, colonnade: 1 } },
};
/** Escenas extra por mapa concreto. */
const MAP_SCENES = { "A1.6": { orchard: 2, camp: 0 }, "A1.1": { camp: 1, fallenTree: 2 }, "A1.3": { field: 4 }, "A2.2": { field: 3, chapel: 2 } };

/** Si el kit del bioma no cubre un tipo, se sustituye por un pariente que sí (o se omite). */
const FALLBACK = { stump: "rock", log: "rock", tomb: "rubble", crag: "rock", wall: "rubble", statue: "pillar", pillar: "rubble", cart: "crate", barrel: "crate", mushroom: "plant", crystal: "rock", fence: null, crate: null, plant: null, rock: "rubble", rubble: null, bigrubble: "rubble", brazier: "torch", oak: "pine", pine: "oak" };

/** Radio libre que necesita cada tipo al colocarse. */
export const RAD = { oak: 11, pine: 9, dead: 9, crag: 16, rock: 8, log: 14, stump: 7, wall: 14, pillar: 8, tomb: 8, fence: 12, cart: 15, crate: 6, barrel: 5, rubble: 8, bigrubble: 11, statue: 8, crystal: 6, brazier: 6, torch: 4, plant: 4, mushroom: 3, well: 10 };
/** Separación mínima entre árboles de la misma zona según especie. */
const TREE_GAP = { oak: 46, pine: 30, dead: 36 };

/* ---------- Escenas: [tipo, dx, dy, extra?] relativos al centro (y+ = abajo). `s` espeja en x. ---------- */
const SCENES = {
  camp: (r) => [["torch", 0, 0], ["stump", -26, 10], ["stump", 24, 12], ["stump", 2, -24], ["crate", 40, -8], ["barrel", 50, 6], ["cart", -56, -10], ["rubble", 14, 26]],
  fallenTree: (r) => [["log", 0, 0, { variant: (r() * 2) | 0 }], ["stump", -52, 6], ["mushroom", 18, 8], ["plant", -20, 10], ["plant", 36, 6], ["rock", 54, 12], ["mushroom", -34, 16]],
  outcrop: () => [["crag", 0, 0], ["rock", -36, 8], ["rock", 32, 10], ["rock", 8, 24], ["plant", -20, 20], ["plant", 46, 0], ["plant", -50, 2]],
  chapel: () => [["wall", -28, 0], ["wall", 30, 6], ["pillar", -58, 12], ["pillar", 60, -2], ["pillar", 2, -32], ["rubble", -4, 16], ["bigrubble", 42, 22], ["rubble", -48, -16], ["statue", 0, -12], ["plant", 22, 20]],
  graveyard: () => [["tomb", -32, 0], ["tomb", 0, 0], ["tomb", 32, 0], ["tomb", -32, 26], ["tomb", 0, 26], ["tomb", 32, 26], ["fence", 0, -34], ["fence", -58, -6], ["fence", 58, -6], ["statue", 0, -52], ["dead", 74, -18], ["plant", -62, 30], ["plant", 62, 34]],
  standing: () => { const out = []; for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + 0.3; out.push(["pillar", Math.cos(a) * 46, Math.sin(a) * 30]); } out.push(["rubble", 8, 4], ["rubble", -50, 40], ["statue", 0, -6]); return out; },
  meadow: (r) => { const out = []; for (let k = 0; k < 10; k++) { const a = r() * 6.283, d = Math.sqrt(r()) * 46; out.push(["plant", Math.cos(a) * d, Math.sin(a) * d * 0.7]); } out.push(["mushroom", 10, 6], ["mushroom", -22, -8]); return out; },
  field: (r) => { const out = []; const wheat = () => ({ v: (0.01 + r() * 0.3) / 977 }); for (let j = 0; j < 4; j++) for (let i = 0; i < 8; i++) out.push(["plant", (i - 3.5) * 13, j * 16 - 24, wheat()]); out.push(["fence", -30, 46], ["fence", 0, 46], ["fence", 30, 46], ["fence", -64, 6]); return out; },
  orchard: () => { const out = []; for (let j = 0; j < 3; j++) for (let i = 0; i < 5; i++) out.push(["oak", (i - 2) * 56, (j - 1) * 50 + (i % 2 ? 8 : 0)]); out.push(["torch", -90, -10], ["torch", 90, -10], ["torch", -90, 50], ["torch", 90, 50]); return out; },
  crystals: () => [["crystal", 0, 0], ["crystal", -17, 7], ["crystal", 15, 9], ["rock", 30, 16], ["rock", -34, 14]],
  statuary: () => [["statue", 0, 0], ["pillar", -42, 6], ["pillar", 42, 6], ["brazier", -22, 24], ["brazier", 22, 24], ["rubble", 0, 30]],
  court: () => [["wall", -40, 0], ["wall", 0, -6], ["wall", 40, 0], ["pillar", -70, 20], ["pillar", 70, 20], ["brazier", -26, 30], ["brazier", 26, 30], ["rubble", 0, 24], ["crystal", 56, 38]],
};
/** Radio que ocupa cada escena (reclamo y separación) y si prefiere claro (c) o arboleda (g). */
const SCENE_INFO = {
  camp: { r: 62, want: "c", dMin: 80, dMax: 360 }, fallenTree: { r: 64, want: "g", dMin: 60, dMax: 420 }, outcrop: { r: 54, want: "a", dMin: 70, dMax: 420 },
  chapel: { r: 78, want: "c", dMin: 90, dMax: 360 }, graveyard: { r: 82, want: "c", dMin: 90, dMax: 380 }, standing: { r: 66, want: "c", dMin: 90, dMax: 420 },
  meadow: { r: 58, want: "c", dMin: 60, dMax: 420 }, field: { r: 70, want: "c", dMin: 80, dMax: 380 }, orchard: { r: 125, want: "c", dMin: 100, dMax: 400 },
  crystals: { r: 40, want: "a", dMin: 60, dMax: 420 }, statuary: { r: 58, want: "c", dMin: 80, dMax: 400 }, court: { r: 90, want: "c", dMin: 90, dMax: 400 },
};

/** Ruido de valor de baja frecuencia (dos octavas), 0..1 aprox. */
function makeNoise(seed, scale) {
  const h = (ix, iy) => { let n = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 2246822519)) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  const sm = (t) => t * t * (3 - 2 * t);
  const v = (x, y) => { const ix = Math.floor(x), iy = Math.floor(y), fx = sm(x - ix), fy = sm(y - iy); const a = h(ix, iy), b = h(ix + 1, iy), c = h(ix, iy + 1), d = h(ix + 1, iy + 1); return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy; };
  return (x, y) => 0.68 * v(x / scale, y / scale) + 0.32 * v(x / (scale * 0.45) + 17, y / (scale * 0.45) + 9);
}
const smoothstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/**
 * @param {object} E  { def, kitKey, L, mm, rand, path, randIn, canPlace, claim, bigPlaced, addSmart }
 */
export function composeScenery(E) {
  const { def, kitKey, L, mm, rand, path, randIn, canPlace, claim, bigPlaced, addSmart } = E;
  const prof = PROFILES[kitKey] || PROFILES.forest;
  const area = Math.max(0.6, Math.min(1.6, (L.W * L.H) / (2250 * 1500)));
  const dens = makeNoise(((rand() * 1e9) | 0) ^ 0x51ed, 300);
  const spec = makeNoise(((rand() * 1e9) | 0) ^ 0x9a3, 260);
  // cuantiles del ruido, para umbrales independientes de su distribución
  const samples = []; for (let i = 0; i < 1500; i++) samples.push(dens(rand() * L.W, rand() * L.H)); samples.sort((a, b) => a - b);
  const Q = (p) => samples[Math.min(samples.length - 1, Math.floor(p * samples.length))];
  const q35 = Q(0.35), q50 = Q(0.5), q58 = Q(0.58), q80 = Q(0.8);
  const ok = (t) => t === "torch" || kitHas(kitKey, t);
  const resolve = (t) => { let k = t, guard = 0; while (k && !ok(k) && guard++ < 4) k = FALLBACK[k]; return k && ok(k) ? k : null; };
  const placed = [];                                         // escenas colocadas {kind,x,y,r}
  const occl = [];                                           // zonas que la copa de un árbol situado al sur taparía: ahí no se plantan árboles
  const inOccl = (x, y) => occl.some((z) => x > z.x0 && x < z.x1 && y > z.y0 && y < z.y1);
  const out = { scenes: placed, trees: 0 };

  /* ---------- 2. Escenas ---------- */
  function findSpot(info) {
    for (let i = 0; i < 140; i++) {
      const q = randIn(130);
      const n = dens(q.x, q.y);
      if (info.want === "c" && n > q58) continue;           // claro
      if (info.want === "g" && n < q50) continue;           // dentro de arboleda
      const dn = path.nearest(q.x, q.y, info.dMax + 20).d;
      if (dn < info.dMin || dn > info.dMax) continue;
      if (placed.some((p) => Math.hypot(p.x - q.x, p.y - q.y) < p.r + info.r + 30)) continue;
      if (!canPlace(q.x, q.y, Math.min(info.r * 0.6, 40), { pathClear: info.dMin - 12, free: true })) continue;
      return q;
    }
    return null;
  }
  function build(kind) {
    const info = SCENE_INFO[kind]; if (!info) return false;
    const q = findSpot(info); if (!q) return false;
    const els = SCENES[kind](rand);
    const mir = rand() < 0.5 ? -1 : 1;
    let n = 0;
    for (const [t0, dx, dy, ex] of els) {
      const t = resolve(t0); if (!t) continue;
      if (addSmart(t, q.x + dx * mir, q.y + dy, { ...(ex || {}) }, { pathClear: 14, free: t !== "plant" && t !== "mushroom" })) n++;
    }
    if (n < Math.max(3, els.length * 0.4)) return false;    // escena que se quedó sin piezas: no cuenta (los objetos sueltos que sí entraron se quedan)
    claim(q.x, q.y, info.r);
    occl.push({ x0: q.x - info.r - 36, x1: q.x + info.r + 36, y0: q.y - 10, y1: q.y + info.r + 80 });
    placed.push({ kind, x: Math.round(q.x), y: Math.round(q.y), r: info.r });
    return true;
  }
  const want = { ...prof.scenes, ...(MAP_SCENES[def.id] || {}) };
  const order = ["orchard", "chapel", "graveyard", "court", "field", "standing", "statuary", "camp", "outcrop", "crystals", "fallenTree", "meadow"];
  for (const kind of order) {
    const n = Math.round((want[kind] || 0) * (kind === "orchard" ? 1 : area));
    for (let i = 0, ok2 = 0; i < n * 3 && ok2 < n; i++) if (build(kind)) ok2++;
  }
  // columnata a ambos lados del camino (santuario)
  if (want.colonnade) {
    const u0 = 0.12 + rand() * 0.1, len = path.length;
    for (let s = -1; s <= 1; s += 2) for (let u = u0; u < u0 + 0.5; u += 78 / len) {
      const p = path.at(Math.min(1, u));
      const t = resolve(((u * 1000) | 0) % 5 === 0 ? "wall" : "pillar");
      if (t) addSmart(t, p.x + p.nx * s * 56, p.y + p.ny * s * 56 + 4, {}, { pathClear: 30 });
    }
  }

  /* ---------- 3. Árboles: arboledas y claros ---------- */
  const speciesAt = (x, y) => {
    // la especie dominante cambia por zonas; un 22 % se sale de ella para que no sea un monocultivo
    let t = spec(x, y);
    if (rand() < 0.22) t = rand();
    let acc = 0;
    const entries = Object.entries(prof.trees);
    const tot = entries.reduce((a, [, w]) => a + w, 0);
    for (const [k, w] of entries) { acc += w / tot; if (t <= acc) return k; }
    return entries[0][0];
  };
  const trees = [];
  const nTrees = Math.round(def.interior * prof.share * (0.85 + 0.15 * area));
  for (let i = 0; i < nTrees * 60 && trees.length < nTrees; i++) {
    const q = randIn(100);
    if (inOccl(q.x, q.y)) continue;
    const n = dens(q.x, q.y);
    const pAcc = 0.03 + 0.97 * smoothstep(q50, q80, n);      // arboleda donde el ruido es alto; un goteo de árboles sueltos en los claros
    if (rand() > pAcc) continue;
    const t = resolve(speciesAt(q.x, q.y)); if (!t) continue;
    const gap = TREE_GAP[t] ?? 36;
    if (trees.some((o) => { const dx = o.x - q.x, dy = (o.y - q.y) * 1.25; return dx * dx + dy * dy < Math.max(gap, o.gap) * Math.max(gap, o.gap) * 0.7; })) continue;
    const o = addSmart(t, q.x, q.y, {}, { pathClear: 34 });
    if (!o) continue;
    trees.push({ x: q.x, y: q.y, gap, t });
    bigPlaced.push({ x: q.x, y: q.y });
  }
  // el camino se bordea de árboles solo donde hay bosque
  for (let d = 90; d < path.length - 90; d += 54) {
    if (rand() > 0.34) continue;
    const p = path.at(d / path.length), s = rand() < 0.5 ? -1 : 1, off = 46 + rand() * 20;
    const x = p.x + p.nx * s * off, y = p.y + p.ny * s * off;
    if (dens(x, y) < q35 || inOccl(x, y)) continue;
    const t = resolve(speciesAt(x, y)); if (!t) continue;
    const gap = TREE_GAP[t] ?? 36;
    if (trees.some((o) => Math.hypot(o.x - x, (o.y - y) * 1.25) < gap * 0.8)) continue;
    if (addSmart(t, x, y, {}, { pathClear: 30 })) trees.push({ x, y, gap, t });
  }
  out.trees = trees.length;

  /* ---------- 4. Sotobosque: matas y setas al pie de los árboles ---------- */
  const plant = resolve("plant"), mush = resolve("mushroom");
  for (const o of trees) {
    if (plant && rand() < 0.3) addSmart(plant, o.x + (rand() - 0.5) * 44, o.y + 7 + rand() * 12, {}, { pathClear: 12, free: false });
    if (mush && mush !== plant && rand() < 0.09 && (o.t === "oak" || o.t === "dead")) addSmart(mush, o.x + (rand() < 0.5 ? -9 : 10), o.y + 1, {}, { pathClear: 12, free: false });
  }

  /* ---------- 5. Orilla de los lagos ---------- */
  for (const lk of L.lakes || []) {
    const arcs = 2 + ((rand() * 2) | 0);
    for (let k = 0; k < arcs; k++) {
      const a0 = rand() * Math.PI * 2, span = 0.55 + rand() * 0.5;
      for (let j = 0; j < 6; j++) {
        const a = a0 + (j / 5) * span, rr = lk.radius(a) * (1.1 + rand() * 0.1);
        const x = lk.cx + Math.cos(a) * rr, y = lk.cy + Math.sin(a) * rr;
        const r = rand();
        const t = resolve(r < 0.34 ? "rock" : r < 0.46 && j === 2 ? "log" : "plant");
        if (t) addSmart(t, x, y, t === "log" ? { variant: (rand() * 2) | 0 } : {}, { pathClear: 14, free: t !== "plant" });
      }
    }
  }
  mm.scenes = placed;
  return out;
}
