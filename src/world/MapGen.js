/**
 * MapGen · diseño procedural de mapas rectangulares
 * --------------------------------------------------
 * Genera el *layout* (datos puros, sin canvas) de un mapa rectangular que llena toda la pantalla
 * (solo el minimapa HUD es circular):
 *
 *   path      Ruta de salida sinuosa y aleatoria: en modo "crater" nace del cráter central
 *             y se enrosca hacia el borde (espiral); en modo "rim" cruza el interior rodeando
 *             el centro. Nunca es una línea recta. `path.at(u)` da puntos por fracción de longitud.
 *   start     Punto de inicio (centro del cráter o borde).
 *   exit      Punto de la puerta de salida (en el borde, ángulo aleatorio).
 *   lakes     Lagos orgánicos (el camino los cruza con un puente si coinciden).
 *   hills     Montañas escalonadas con escaleras: se puede subir y bajar.
 *   houses    Casas en ruinas junto al camino.
 *   crater    Cráter de impacto (nivel 1.1).
 *
 * Todo depende de una semilla: misma semilla → mismo mapa (para guardar/cargar partidas).
 */

import { mulberry32 } from "./Scenery.js";

const TAU = Math.PI * 2;
const norm = (a) => { a %= TAU; return a < 0 ? a + TAU : a; };

/* ---------------------------------------------------------------------- */
/* Ruta                                                                    */
/* ---------------------------------------------------------------------- */

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return {
    x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  };
}

class Path {
  constructor(points, widths) {
    this.pts = points;            // muestras a ~6 px de distancia: {x, y, s}
    this.length = points[points.length - 1].s;
    this.width = widths;          // semianchura base del camino
    // índice espacial por celdas de 48 px
    this.cell = 48;
    this.buckets = new Map();
    points.forEach((p, i) => {
      const k = ((p.x / this.cell) | 0) * 4096 + ((p.y / this.cell) | 0);
      let b = this.buckets.get(k);
      if (!b) this.buckets.set(k, (b = []));
      b.push(i);
    });
  }

  /** Punto a fracción u∈[0,1] de la longitud, con tangente y normal. */
  at(u) {
    const s = Math.max(0, Math.min(1, u)) * this.length;
    let lo = 0, hi = this.pts.length - 1;
    while (lo < hi - 1) { const mid = (lo + hi) >> 1; if (this.pts[mid].s <= s) lo = mid; else hi = mid; }
    const a = this.pts[lo], b = this.pts[Math.min(hi, this.pts.length - 1)];
    const k = b.s > a.s ? (s - a.s) / (b.s - a.s) : 0;
    const x = a.x + (b.x - a.x) * k, y = a.y + (b.y - a.y) * k;
    // tangente con una ventana mayor para que sea estable
    const p0 = this.pts[Math.max(0, lo - 3)], p1 = this.pts[Math.min(this.pts.length - 1, hi + 3)];
    let tx = p1.x - p0.x, ty = p1.y - p0.y;
    const l = Math.hypot(tx, ty) || 1;
    tx /= l; ty /= l;
    return { x, y, tx, ty, nx: -ty, ny: tx, s };
  }

  /** Distancia mínima a la ruta (Infinity si está a más de `max`) y fracción u del punto más cercano. */
  nearest(x, y, max = 96) {
    const r = Math.ceil(max / this.cell);
    const cx = (x / this.cell) | 0, cy = (y / this.cell) | 0;
    let best = Infinity, bi = -1;
    for (let j = cy - r; j <= cy + r; j++) for (let i = cx - r; i <= cx + r; i++) {
      const b = this.buckets.get(i * 4096 + j);
      if (!b) continue;
      for (const idx of b) {
        const p = this.pts[idx];
        const d = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
        if (d < best) { best = d; bi = idx; }
      }
    }
    return bi < 0 ? { d: Infinity, u: 0 } : { d: Math.sqrt(best), u: this.pts[bi].s / this.length };
  }

  /** ¿Hay camino a menos de `d` píxeles? */
  within(x, y, d) { return this.nearest(x, y, d).d < d; }
}

/**
 * Ruta de salida de un mapa RECTANGULAR (W×H): nace en un extremo y serpentea hasta el opuesto.
 * Las curvas son amplias y aleatorias (nunca una recta); se refleja al azar en X e Y para que
 * cada semilla recorra el mapa en una dirección distinta.
 */
function makePath(rand, W, H, mode, toCenter) {
  const margin = 96;
  const flipX = rand() < 0.5, flipY = rand() < 0.5;
  const ctrl = [];
  const x0 = mode === "crater" ? W * 0.16 : margin + 14;
  const x1 = toCenter ? W * 0.62 : W - margin - 14;
  const n = 8;
  const amp = H * (0.2 + rand() * 0.12), mid = H * (0.42 + rand() * 0.16);
  const ph = rand() * TAU, per = 1.1 + rand() * 0.95;
  const yMin = margin + 70, yMax = H - margin - 70;
  for (let k = 0; k <= n; k++) {
    const t = k / n, inner = k > 0 && k < n;
    const x = x0 + (x1 - x0) * t + (inner ? (rand() - 0.5) * W * 0.04 : 0);
    let y = mid + Math.sin(ph + per * TAU * t) * amp + (inner ? (rand() - 0.5) * H * 0.07 : 0);
    y = Math.max(yMin, Math.min(yMax, y));
    ctrl.push({ x: flipX ? W - x : x, y: flipY ? H - y : y });
  }
  const start = ctrl[0];
  // Interpolación Catmull-Rom con puntos fantasma en los extremos
  const P = [ctrl[0], ...ctrl, ctrl[ctrl.length - 1]];
  const dense = [];
  for (let i = 1; i < P.length - 2; i++) for (let k = 0; k < 14; k++) dense.push(catmull(P[i - 1], P[i], P[i + 1], P[i + 2], k / 14));
  dense.push(ctrl[ctrl.length - 1]);
  // Remuestreo uniforme a 6 px y meandro lateral suave (cero en los extremos)
  const raw = [{ ...dense[0], s: 0 }];
  let acc = 0, next = 6;
  for (let i = 1; i < dense.length; i++) {
    const seg = Math.hypot(dense[i].x - dense[i - 1].x, dense[i].y - dense[i - 1].y);
    while (acc + seg >= next) {
      const k = (next - acc) / seg;
      raw.push({ x: dense[i - 1].x + (dense[i].x - dense[i - 1].x) * k, y: dense[i - 1].y + (dense[i].y - dense[i - 1].y) * k, s: next });
      next += 6;
    }
    acc += seg;
  }
  const total = raw[raw.length - 1].s;
  const f1 = 0.018 + rand() * 0.012, f2 = 0.05 + rand() * 0.03, ph1 = rand() * TAU, ph2 = rand() * TAU;
  const A1 = 13 + rand() * 9, A2 = 4 + rand() * 4;
  const pts = raw.map((p, i) => {
    const q = raw[Math.min(raw.length - 1, i + 1)], o = raw[Math.max(0, i - 1)];
    let tx = q.x - o.x, ty = q.y - o.y; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    const taper = Math.min(1, p.s / 90, (total - p.s) / 90);
    const m = (Math.sin(p.s * f1 + ph1) * A1 + Math.sin(p.s * f2 + ph2) * A2) * taper;
    const x = Math.max(70, Math.min(W - 70, p.x - ty * m)), y = Math.max(70, Math.min(H - 70, p.y + tx * m));
    return { x, y, s: p.s };
  });
  // recalcula s con la longitud real tras el meandro
  let s = 0;
  pts[0].s = 0;
  for (let i = 1; i < pts.length; i++) { s += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); pts[i].s = s; }
  return { pts, start: pts[0], exitPt: pts[pts.length - 1], flipX, flipY };
}

/* ---------------------------------------------------------------------- */
/* Formas orgánicas                                                        */
/* ---------------------------------------------------------------------- */

/** Función radio(θ) con armónicos aleatorios. */
function blob(rand, r, amp = 0.16) {
  const h = [1, 2, 3, 5].map((k) => ({ k, a: (rand() - 0.5) * 2 * amp / Math.sqrt(k), p: rand() * TAU }));
  const radius = (th) => { let f = 1; for (const q of h) f += q.a * Math.sin(q.k * th + q.p); return r * f; };
  return { r, radius, harm: h };
}

/* ---------------------------------------------------------------------- */
/* Generación del layout                                                   */
/* ---------------------------------------------------------------------- */

/**
 * @param {object} gen  Parámetros del nivel:
 *   R, start:"crater"|"rim", startAngle?,
 *   lakes: [{ r:[min,max], bridge?:boolean }], hills: [{ tiers, r:[min,max] }],
 *   houses: [{ u, n, variants? }]
 * @param {number} seed
 */
export function generateLayout(gen, seed) {
  const rand = mulberry32(seed >>> 0);
  const R = gen.R;                                          // tamaño nominal del nivel (escala del mapa)
  const W = Math.round(R * 2.25), H = Math.round(R * 1.5), cx = W / 2, cy = H / 2;
  const mode = gen.start || "rim";
  const pr = makePath(rand, W, H, mode, !!gen.reverse);
  const path = new Path(pr.pts, 11);
  const inside = (x, y, m = 0) => x > m && y > m && x < W - m && y < H - m;
  const L = {
    R: Math.min(W, H) / 2, W, H, cx, cy, seed, mode, path,
    start: { x: pr.start.x, y: pr.start.y },
    exit: { x: pr.exitPt.x, y: pr.exitPt.y },
    lakes: [], hills: [], houses: [], crater: null, reserved: [],
  };
  L.exitAngle = Math.atan2(L.exit.y - cy, L.exit.x - cx);
  const end = path.at(1);
  L.exitDir = { x: end.tx, y: end.ty };

  const farFromPath = (x, y, r) => path.nearest(x, y, r + 8).d > r;
  const inDisc = inside;                                    // alias heredado: ahora es un rectángulo
  const randIn = (m) => ({ x: m + rand() * Math.max(1, W - 2 * m), y: m + rand() * Math.max(1, H - 2 * m) });
  const freeOfFeatures = (x, y, r) =>
    L.lakes.every((l) => Math.hypot(x - l.cx, y - l.cy) > l.r * 1.25 + r) &&
    L.hills.every((h) => Math.hypot(x - h.cx, y - h.cy) > h.tiers[0].r * 1.2 + r) &&
    L.houses.every((h) => x + r < h.x - 14 || x - r > h.x + h.w + 14 || y + r < h.y - 14 || y - r > h.y + h.h + 14);

  // ---- Cráter de impacto ----
  if (mode === "crater") {
    const cr = 56 + rand() * 12;
    const tan = path.at(0.01);
    L.crater = { x: L.start.x, y: L.start.y + 6, r: cr, gap: Math.atan2(tan.ty, tan.tx) };
    L.reserved.push({ x: L.crater.x - cr - 40, y: L.crater.y - cr - 40, w: (cr + 40) * 2, h: (cr + 40) * 2, tag: "crater" });
  }

  // ---- Lagos ----
  for (const spec of gen.lakes || []) {
    for (let tries = 0; tries < 160; tries++) {
      const r = spec.r[0] + rand() * (spec.r[1] - spec.r[0]);
      let x, y;
      if (spec.bridge) {                            // el camino cruza por el borde del lago: puente
        const u = 0.3 + rand() * 0.4, p = path.at(u), side = rand() < 0.5 ? -1 : 1;
        const off = r * (0.55 + rand() * 0.25);
        x = p.x + p.nx * side * off; y = p.y + p.ny * side * off;
      } else {
        const q = randIn(r * 1.3 + 90);
        x = q.x; y = q.y;
      }
      if (!inside(x, y, r * 1.3 + 90)) continue;
      if (Math.hypot(x - L.start.x, y - L.start.y) < r + 140) continue;
      if (Math.hypot(x - L.exit.x, y - L.exit.y) < r + 120) continue;
      if (!spec.bridge && !farFromPath(x, y, r * 1.2 + 30)) continue;
      if (spec.bridge && path.nearest(x, y, r).d < 10) continue;      // que no se coma el camino entero
      if (L.lakes.some((l) => Math.hypot(x - l.cx, y - l.cy) < l.r + r + 50)) continue;
      const b = blob(rand, r, 0.17);
      L.lakes.push({ cx: x, cy: y, r, radius: b.radius, harm: b.harm, bridge: !!spec.bridge, id: L.lakes.length });
      break;
    }
  }

  // ---- Montañas escalonadas con escaleras ----
  const H_STEP = 14;                                      // altura visible de cada acantilado
  for (const spec of gen.hills || []) {
    for (let tries = 0; tries < 200; tries++) {
      const r0 = spec.r[0] + rand() * (spec.r[1] - spec.r[0]);
      const q = randIn(r0 * 1.3 + 110);
      const x = q.x, y = q.y;
      if (Math.hypot(x - L.start.x, y - L.start.y) < r0 + 150) continue;
      if (Math.hypot(x - L.exit.x, y - L.exit.y) < r0 + 130) continue;
      if (!farFromPath(x, y, r0 * 1.2 + 40 + H_STEP)) continue;
      if (L.lakes.some((l) => Math.hypot(x - l.cx, y - l.cy) < l.r * 1.3 + r0 * 1.2 + 24)) continue;
      if (L.hills.some((h) => Math.hypot(x - h.cx, y - h.cy) < h.tiers[0].r * 1.3 + r0 * 1.3 + 30)) continue;
      const n = spec.tiers || 2;
      const tiers = [];
      let stairSide = rand() < 0.5 ? -1 : 1;
      for (let t = 0; t < n; t++) {
        const r = r0 * (1 - (t * (0.62 / Math.max(1, n - 0.6)))) - (t ? 6 : 0);
        const rr = t === 0 ? r0 : Math.max(34, Math.min(r, tiers[t - 1].r - (H_STEP + 48)));
        const b = blob(rand, rr, 0.06);
        tiers.push({ r: rr, radius: b.radius, harm: b.harm, stairSide, stairOff: 0.28 + rand() * 0.3, h: H_STEP });
        stairSide *= -1;                                      // las escaleras alternan: hay que rodear la montaña
      }
      const hill = { cx: x, cy: y, tiers, snow: !!spec.snow, id: L.hills.length };
      L.hills.push(hill);
      // zona reservada: toda la montaña + un pasillo bajo cada escalera
      const R0 = r0 * 1.2 + H_STEP;
      L.reserved.push({ x: x - R0, y: y - R0, w: R0 * 2, h: R0 * 2 + 30, tag: "hill" });
      break;
    }
  }

  // ---- Casas en ruinas junto al camino ----
  const HW = 150, HH = 112;                                              // huella reservada de una casa (los sprites de casa miden hasta ~158×129)
  for (const spec of gen.houses || []) {
    const n = spec.n || 1;
    for (let i = 0; i < n; i++) {
      for (let tries = 0; tries < 160; tries++) {
        const u = Math.max(0.08, Math.min(0.9, spec.u + (i - (n - 1) / 2) * (0.035 + rand() * 0.03) + (rand() - 0.5) * 0.02));
        const p = path.at(u), side = rand() < 0.5 ? -1 : 1;
        const off = 78 + rand() * 56;                                       // las casas ya tienen escala real (puerta mayor que Abel): más sitio
        const hx = Math.round(p.x + p.nx * side * off - HW / 2), hy = Math.round(p.y + p.ny * side * off - HH / 2);
        const house = { x: hx, y: hy, w: HW, h: HH, variant: Math.floor(rand() * 3), u };
        const cxh = hx + HW / 2, cyh = hy + HH / 2;
        if (!inDisc(cxh, cyh, 150)) continue;
        // ni encima del camino, ni de lagos, montañas, cráter, otras casas
        let ok = true;
        for (let sx = 0; sx <= HW && ok; sx += 25) for (let sy = 0; sy <= HH; sy += 22) {
          if (path.nearest(hx + sx, hy + sy, 28).d < 30) { ok = false; break; }
        }
        if (!ok) continue;
        if (!freeOfFeatures(cxh, cyh, 62)) continue;
        if (L.crater && Math.hypot(cxh - L.crater.x, cyh - L.crater.y) < L.crater.r + 110) continue;
        if (Math.hypot(cxh - L.exit.x, cyh - L.exit.y) < 150) continue;
        L.houses.push(house);
        L.reserved.push({ x: hx - 10, y: hy - 10, w: HW + 20, h: HH + 20, tag: "house" });
        break;
      }
    }
  }

  L.rand = rand;
  L.util = { farFromPath, inDisc, inside, randIn, freeOfFeatures, H_STEP };
  L.inside = inside;
  return L;
}

/* ---------------------------------------------------------------------- */
/* Consultas geométricas reutilizables                                     */
/* ---------------------------------------------------------------------- */

export function inBlob(shape, cx, cy, x, y) {
  const dx = x - cx, dy = y - cy;
  return dx * dx + dy * dy < shape.radius(Math.atan2(dy, dx)) ** 2;
}

/** Posición (x,y) sobre la ruta a fracción u, desplazada `off` px a lo largo de la normal. */
export function onPath(L, u, off = 0) {
  const p = L.path.at(u);
  return { x: p.x + p.nx * off, y: p.y + p.ny * off, p };
}
