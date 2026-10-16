/**
 * EnvironmentAnimation · entornos vivos
 * -------------------------------------
 * El escenario respira:
 *   Wind          Temporizador global de viento: ráfagas lentas + ondas que viajan por el mapa.
 *   drawTree()    Árboles que se mecen: la copa se desplaza en franjas (más arriba, más amplitud)
 *                 y se agita con fuerza cuando recibe un impacto (`o.shake`).
 *   GrassField    Matas de hierba musgosa con balanceo propio; se aplastan al pasar Abel o los
 *                 enemigos, y se queman con el fuego / Holy Burst.
 *   drawFlame()   Fuego pixelado oscilante (antorchas góticas, hogueras, tocones, cráter).
 *   AmbientFX     Esporas de luz a la deriva, luciérnagas, hojas que caen, brasas y humo del cráter,
 *                 ondas y chapoteos en los lagos.
 *   drawWater()   Reflejos pixelados intermitentes sobre el agua.
 *
 * Todo se dibuja solo dentro de la cámara y reutiliza el ParticleSystem (sin basura por frame).
 */

import { KIND } from "../graphics/ParticleSystem.js";

const TAU = Math.PI * 2;

/* ======================================================================
   Viento
   ====================================================================== */
export class Wind {
  constructor() { this.t = 0; this.strength = 0.5; this.gust = 0; }
  update(t) {
    this.t = t;
    this.strength = 0.5 + 0.28 * Math.sin(t * 0.21) + 0.14 * Math.sin(t * 0.57 + 1.3);
    this.gust = Math.max(0, Math.sin(t * 0.33) + 0.55 * Math.sin(t * 0.87 + 2.1) - 0.55);
  }
  /** Desplazamiento de balanceo en [-1.4, 1.4] para un punto del mundo (onda que viaja). */
  sway(x, y, seed = 0) {
    return (Math.sin(x * 0.011 + y * 0.007 - this.t * (1.2 + this.strength * 0.8) + seed) * (0.35 + this.strength * 0.65)) + this.gust * 0.85;
  }
  /** Fuerza lateral para partículas (hojas, esporas). */
  push() { return (this.strength - 0.3) * 0.8 + this.gust * 1.2; }
}
export const wind = new Wind();

/* ======================================================================
   Árboles
   ====================================================================== */
const SLICE = 5;

/**
 * Dibuja un árbol 48×60 (base en 24,59) con balanceo por franjas.
 * @param {object} o  obstáculo (bx, by, v, shake, shakeT)
 */
export function drawTree(ctx, img, o, amp = 2.4) {
  const bx = o.bx - 24, by = o.by - 59;
  let s = wind.sway(o.bx, o.by, o.v * 6) * amp;
  let shake = 0;
  if (o.shake > 0.02) shake = Math.sin(wind.t * 30 + o.v * 9) * 2.6 * o.shake;
  s += shake;
  if (Math.abs(s) < 0.45) { ctx.drawImage(img, bx, by); return; }
  const h = img.height;
  for (let r = 0; r < h; r += SLICE) {
    const sh = Math.min(SLICE, h - r);
    const k = (h - 1 - (r + sh / 2)) / (h - 1);                 // 1 en la copa, 0 en el tronco
    const off = Math.round(s * Math.pow(Math.max(0, k - 0.12) / 0.88, 1.6));
    ctx.drawImage(img, 0, r, img.width, sh, bx + off, by + r, img.width, sh);
  }
}

/** Avanza el temblor de los objetos golpeados. */
export function updateShakes(list, dt) {
  for (const o of list) {
    if (o.shake > 0) { o.shake = Math.max(0, o.shake - dt * 1.3); }
    if (o.hit > 0) o.hit = Math.max(0, o.hit - dt);
  }
}

/* ======================================================================
   Hierba musgosa
   ====================================================================== */
export class GrassField {
  /**
   * @param {{x:number,y:number}[]} patches
   * @param {string[]} tuft  [profundo, oscuro, claro, brillo]
   */
  constructor(patches, tuft) {
    this.patches = patches.map((p) => ({ x: p.x, y: p.y, s: p.s, flat: 0, lean: 0, burn: 0, burnt: false, h: 3 + ((p.s * 4) | 0), col: tuft[2 + (p.s > 0.5 ? 1 : 0)] }));
    this.tuft = tuft;
    this.cell = 48;
    this.index = new Map();
    for (const g of this.patches) {
      const k = `${(g.x / this.cell) | 0},${(g.y / this.cell) | 0}`;
      let b = this.index.get(k);
      if (!b) this.index.set(k, (b = []));
      b.push(g);
    }
    this.active = new Set();                               // matas con estado (aplastadas / ardiendo)
  }

  near(x, y, r) {
    const out = [];
    const c = this.cell;
    for (let j = ((y - r) / c) | 0; j <= ((y + r) / c) | 0; j++) for (let i = ((x - r) / c) | 0; i <= ((x + r) / c) | 0; i++) {
      const b = this.index.get(`${i},${j}`);
      if (b) for (const g of b) out.push(g);
    }
    return out;
  }

  /** Aplasta la hierba en un radio (pisadas). */
  trample(x, y, r, lean = 0) {
    for (const g of this.near(x, y, r)) {
      if (g.burnt) continue;
      const dx = g.x - x, dy = g.y - y;
      if (dx * dx + dy * dy < r * r) { g.flat = Math.max(g.flat, 0.85); g.lean = dx >= 0 ? 1 : -1; this.active.add(g); }
    }
  }

  update(dt) {
    for (const g of this.active) {
      if (g.burn > 0) { g.burn -= dt * 0.55; if (g.burn <= 0) { g.burn = 0; g.burnt = true; } }
      else if (!g.burnt && g.flat > 0) { g.flat -= dt * 0.35; }
      if (g.flat <= 0 && g.burn <= 0) { g.flat = 0; this.active.delete(g); }
    }
  }

  /** Registra las matas tocadas por una explosión (para que se animen). */
  touch(g) { this.active.add(g); }

  draw(ctx, view, t) {
    const [deep, dark, , high] = this.tuft;
    const c = this.cell;
    const R = (col, x, y, w, h) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
    for (let j = ((view.y - 8) / c) | 0; j <= ((view.y + view.h + 8) / c) | 0; j++) for (let i = ((view.x - 8) / c) | 0; i <= ((view.x + view.w + 8) / c) | 0; i++) {
      const b = this.index.get(`${i},${j}`);
      if (!b) continue;
      for (const g of b) {
        const gx = Math.round(g.x), gy = Math.round(g.y);
        if (g.burnt) { R("#1a1412", gx - 2, gy - 1, 1, 1); R("#2a201c", gx, gy - 2, 1, 2); R("#1a1412", gx + 2, gy - 1, 1, 1); continue; }
        const sw = wind.sway(g.x, g.y, g.s * 3);
        const flat = g.flat;
        const hh = Math.max(1, Math.round(g.h * (1 - flat * 0.72)));
        const lean = Math.round(sw * (hh * 0.55) * (1 - flat) + g.lean * flat * 2.6);
        R(dark, gx - 1, gy, 3, 1);                                       // base
        for (let k = -1; k <= 1; k++) {
          const bh = hh - (k === 0 ? 0 : 1);
          if (bh <= 0) continue;
          const off = Math.round(lean * (bh / hh));
          R(k === 0 ? g.col : dark, gx + k * 2 + off, gy - bh, 1, bh);
          if (k === 0) R(high, gx + off, gy - bh, 1, 1);
        }
        R(deep, gx - 2, gy, 1, 1);
        if (g.burn > 0) {                                                // brasas sobre la mata ardiendo
          const f = Math.sin(t * 22 + g.s * 40) > 0;
          R(f ? "#ff7a1e" : "#ffc24a", gx - 1, gy - 2, 1, 1);
          R("#b03a12", gx + 1, gy - 1, 1, 1);
          if (f) R("#fff1b8", gx, gy - 3, 1, 1);
        }
      }
    }
  }
}

/** Reparte matas por el disco jugable evitando agua, acantilados y el centro del camino. */
export function scatterGrass(L, T, rand, spacing = 34) {
  const out = [];
  for (let y = 40; y < L.H - 40; y += spacing) for (let x = 40; x < L.W - 40; x += spacing) {
    const px = x + (rand() - 0.5) * spacing, py = y + (rand() - 0.5) * spacing;
    if (!L.inside(px, py, 60)) continue;
    if (T.blockedPx(px | 0, py | 0)) continue;
    if (L.path.nearest(px, py, 9).d < 8) continue;
    out.push({ x: Math.round(px), y: Math.round(py), s: rand() });
  }
  return out;
}

/* ======================================================================
   Fuego pixelado
   ====================================================================== */
/**
 * Llama oscilante de 7 filas (antorcha / hoguera). (x, y) es la base de la llama.
 */
export function drawFlame(ctx, x, y, t, seed = 0, s = 1) {
  const f = t * 11 + seed * 7;
  const rows = [
    ["#B03A12", 5], ["#FF7A1E", 5], ["#FF7A1E", 4], ["#FFC24A", 3], ["#FFC24A", 3], ["#FFF1B8", 2], ["#FFC24A", 1],
  ];
  const flick = Math.sin(f) * 0.5 + Math.sin(f * 2.3 + 1) * 0.5;
  const hgt = rows.length + (flick > 0.35 ? 1 : 0) - (flick < -0.6 ? 1 : 0);
  for (let i = 0; i < hgt; i++) {
    const [col, w0] = rows[Math.min(i, rows.length - 1)];
    const w = Math.max(1, Math.round(w0 * s - (i === hgt - 1 && hgt > 6 ? 1 : 0)));
    const sway = Math.round(Math.sin(f + i * 0.7) * (i * 0.28));
    ctx.fillStyle = col;
    ctx.fillRect(Math.round(x - w / 2 + sway), Math.round(y - i * s), w, Math.ceil(s));
  }
  if (flick > 0.7) { ctx.fillStyle = "#FFF1B8"; ctx.fillRect(Math.round(x + Math.sin(f * 3) * 2), Math.round(y - hgt * s - 1), 1, 1); }
}

/* ======================================================================
   Agua con reflejos intermitentes
   ====================================================================== */
export function drawWater(ctx, spots, view, t, glint = "#cfe8ff") {
  for (const s of spots) {
    if (s.x < view.x - 6 || s.x > view.x + view.w + 6 || s.y < view.y - 4 || s.y > view.y + view.h + 4) continue;
    const a = Math.sin(t * 1.9 + s.p) + Math.sin(t * 0.7 + s.p * 2.1) * 0.6;
    if (a > 0.9) {
      const w = a > 1.35 ? 4 : 3;
      ctx.fillStyle = glint;
      ctx.fillRect(Math.round(s.x + Math.sin(t * 0.8 + s.p) * 2), s.y, w, 1);
      if (a > 1.35) { ctx.fillStyle = "#ffffff"; ctx.fillRect(Math.round(s.x + 1 + Math.sin(t * 0.8 + s.p) * 2), s.y, 1, 1); }
    } else if (a < -1.1) {
      ctx.fillStyle = "rgba(10,30,60,0.35)";
      ctx.fillRect(s.x, s.y, 3, 1);
    }
  }
}

/* ======================================================================
   Efectos ambientales (esporas, luciérnagas, hojas, brasas, ondas)
   ====================================================================== */
export class AmbientFX {
  /** @param {import("../graphics/ParticleSystem.js").ParticleSystem} ps */
  constructor(ps) { this.ps = ps; this.sporeT = 0; this.leafT = 0; this.emitT = 0; this.rippleT = 0; }

  /**
   * @param {object} m    mapa activo: { emitters, obstacles, lakes, pal }
   * @param {{x,y,w,h}} view
   */
  update(dt, t, view, m, pal) {
    const ps = this.ps, q = ps.quality;
    // Esporas de luz / luciérnagas: nacen dentro de la vista y derivan despacio
    this.sporeT -= dt;
    if (this.sporeT <= 0) {
      this.sporeT = 0.16 / q;
      const col = pal.wisps[Math.random() < 0.6 ? 0 : 1];
      ps.spawn(view.x + Math.random() * view.w, view.y + Math.random() * view.h, 2 + Math.random() * 14,
        (Math.random() - 0.3) * 3 + wind.push() * 3, -1 - Math.random() * 3, 1 + Math.random() * 3, 5 + Math.random() * 5, col,
        { additive: true, flutter: 6, grav: -0.4, drag: 0.1, kind: KIND.SPARK, size: 1 });
    }
    // Hojas que se sueltan de los árboles visibles
    this.leafT -= dt;
    if (this.leafT <= 0) {
      this.leafT = (0.9 - Math.min(0.5, wind.strength * 0.5 + wind.gust * 0.3)) / q;
      const trees = m.visibleTrees;
      if (trees && trees.length) {
        const o = trees[(Math.random() * trees.length) | 0];
        ps.spawn(o.bx + (Math.random() - 0.5) * 24, o.by - 30 + Math.random() * 12, 20 + Math.random() * 10,
          2 + wind.push() * 10, 1, 6, 2.5 + Math.random() * 2, (o.leafCols || ["#4C8E32", "#86C23C"])[(Math.random() * 3) | 0] || "#4C8E32",
          { kind: KIND.LEAF, grav: 14, drag: 1.2, flutter: 12, bounce: 0 });
      }
    }
    // Emisores fijos: cráter, tocones y antorchas
    this.emitT -= dt;
    if (this.emitT <= 0) {
      this.emitT = 0.09 / q;
      for (const e of m.emitters || []) {
        if (e.x < view.x - 30 || e.x > view.x + view.w + 30 || e.y < view.y - 50 || e.y > view.y + view.h + 30) continue;
        if (e.kind === "crater") {
          if (Math.random() < 0.7) ps.embers(e.x + (Math.random() - 0.5) * 34, e.y + (Math.random() - 0.5) * 18, 1, 4, { z: 2 });
          if (Math.random() < 0.28) ps.smoke(e.x + (Math.random() - 0.5) * 26, e.y + (Math.random() - 0.5) * 10, 1, { z: 6, spread: 10 });
        } else if (e.kind === "fire") {
          if (Math.random() < 0.5) ps.embers(e.x, e.y - 6, 1, 3, { z: 4 });
          if (Math.random() < 0.12) ps.smoke(e.x, e.y - 8, 1, { z: 8, spread: 3 });
        } else if (e.kind === "smolder") {
          if (Math.random() < 0.25) ps.smoke(e.x, e.y - 3, 1, { z: 4, spread: 4, color: "#3a3234" });
        }
      }
    }
    // Ondas y chapoteos en los lagos visibles
    this.rippleT -= dt;
    if (this.rippleT <= 0) {
      this.rippleT = 0.7 + Math.random() * 0.9;
      for (const lk of m.lakes || []) {
        if (lk.cx + lk.r < view.x || lk.cx - lk.r > view.x + view.w || lk.cy + lk.r < view.y || lk.cy - lk.r > view.y + view.h) continue;
        const a = Math.random() * TAU, d = Math.sqrt(Math.random()) * lk.r * 0.75;
        const x = lk.cx + Math.cos(a) * d, y = lk.cy + Math.sin(a) * d;
        ps.ring(x, y, 1, 7 + Math.random() * 6, 1.3, "#cfe8ff", false, 1);
        if (Math.random() < 0.22) {                      // un pez salta
          for (let i = 0; i < 6; i++) ps.spawn(x, y, 1, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 6, 30 + Math.random() * 30, 0.6, "#e6f0ee", { grav: 160, bounce: 0 });
          ps.ring(x, y, 1, 10, 0.8, "#ffffff", false, 1);
        }
      }
    }
  }
}
