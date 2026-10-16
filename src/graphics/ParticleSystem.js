/**
 * ParticleSystem · partículas con física y destrucción del escenario
 * ------------------------------------------------------------------
 * ParticleSystem
 *   Estructura de arrays (SoA, Float32Array) con capacidad fija y reciclaje: no genera
 *   basura ni asignaciones por frame, así que las explosiones de píxeles no provocan
 *   tirones. Cada partícula tiene posición (x, y) + altura z, velocidad en los tres ejes,
 *   gravedad, fricción del aire, rebote en el suelo y rozamiento al rodar.
 *   El dibujado agrupa por (color, aditivo, nivel de alfa) con una ordenación por conteo:
 *   un solo cambio de fillStyle por grupo en lugar de uno por partícula.
 *   También gestiona anillos de onda expansiva.
 *
 * ImpactReactor
 *   Conecta los ataques (puño, especial Holy Burst, mordiscos…) con el entorno:
 *     · la hierba se aplasta (golpe) o se quema (especial / fuego),
 *     · los árboles se agitan violentamente y sueltan hojas pixeladas,
 *     · las rocas, tumbas, pilares, muros, cajas y barriles se agrietan por etapas y
 *       finalmente estallan en fragmentos con trayectorias parabólicas independientes
 *       (fuerza, gravedad, fricción y rebote), dejando escombros en el suelo.
 */

import { PropPhysics, KICKABLE, TOPPLE, PLANT_COLORS } from "../world/PropPhysics.js";

const TAU = Math.PI * 2;

export const KIND = Object.freeze({ PIXEL: 0, LEAF: 1, SMOKE: 2, SPARK: 3 });

export class ParticleSystem {
  /** @param {number} [capacity] máximo de partículas vivas simultáneas */
  constructor(capacity = 3200) {
    this.cap = capacity;
    this.n = 0;
    this.quality = 1;                       // 0.35 low · 0.7 medium · 1 high (escala los emisores)
    const f = () => new Float32Array(capacity);
    this.x = f(); this.y = f(); this.z = f(); this.vx = f(); this.vy = f(); this.vz = f();
    this.life = f(); this.max = f(); this.size = f(); this.grav = f(); this.drag = f(); this.bounce = f();
    this.flut = f(); this.phase = f(); this.grow = f();
    this.col = new Uint16Array(capacity);
    this.kind = new Uint8Array(capacity);
    this.add = new Uint8Array(capacity);
    this.palette = [];
    this.palIndex = new Map();
    this.order = new Uint16Array(capacity);
    this.keys = new Uint16Array(capacity);
    this.counts = new Uint32Array(4096);
    this.rings = [];
    this.t = 0;
  }

  setQuality(q) { this.quality = q === "low" ? 0.35 : q === "medium" ? 0.7 : 1; }

  /** Índice de color (se registra la primera vez). */
  c(css) {
    let i = this.palIndex.get(css);
    if (i === undefined) { if (this.palette.length >= 250) return 0; i = this.palette.length; this.palette.push(css); this.palIndex.set(css, i); }
    return i;
  }

  /** Número de partículas a emitir según la calidad. */
  q(n) { return Math.max(1, Math.round(n * this.quality)); }

  spawn(x, y, z, vx, vy, vz, life, color, o = {}) {
    let i = this.n;
    if (i >= this.cap) i = (Math.random() * this.cap) | 0;       // saturado: pisa una al azar
    else this.n++;
    this.x[i] = x; this.y[i] = y; this.z[i] = z; this.vx[i] = vx; this.vy[i] = vy; this.vz[i] = vz;
    this.life[i] = life; this.max[i] = life;
    this.size[i] = o.size ?? 1; this.grav[i] = o.grav ?? 0; this.drag[i] = o.drag ?? 0; this.bounce[i] = o.bounce ?? 0;
    this.flut[i] = o.flutter ?? 0; this.phase[i] = o.phase ?? Math.random() * TAU; this.grow[i] = o.grow ?? 0;
    this.col[i] = typeof color === "number" ? color : this.c(color);
    this.kind[i] = o.kind ?? KIND.PIXEL;
    this.add[i] = o.additive ? 1 : 0;
    return i;
  }

  update(dt, wind = 0) {
    this.t += dt;
    const t = this.t;
    let i = 0;
    while (i < this.n) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) {                                    // elimina intercambiando con la última
        const l = --this.n;
        if (i !== l) this.#move(l, i);
        continue;
      }
      if (this.drag[i]) { const k = Math.exp(-this.drag[i] * dt); this.vx[i] *= k; this.vy[i] *= k; }
      this.vz[i] -= this.grav[i] * dt;
      this.z[i] += this.vz[i] * dt;
      if (this.z[i] < 0) {
        this.z[i] = 0;
        if (this.bounce[i] > 0 && Math.abs(this.vz[i]) > 14) this.vz[i] = -this.vz[i] * this.bounce[i];
        else this.vz[i] = 0;
        this.vx[i] *= 0.82; this.vy[i] *= 0.82;                   // rozamiento al rodar
      }
      let fx = 0;
      if (this.flut[i]) fx = Math.sin(t * 3.2 + this.phase[i]) * this.flut[i] + wind * 8 * (this.kind[i] === KIND.LEAF ? 1 : 0.4);
      this.x[i] += (this.vx[i] + fx) * dt;
      this.y[i] += this.vy[i] * dt;
      i++;
    }
  }

  #move(from, to) {
    const A = [this.x, this.y, this.z, this.vx, this.vy, this.vz, this.life, this.max, this.size, this.grav, this.drag, this.bounce, this.flut, this.phase, this.grow, this.col, this.kind, this.add];
    for (const a of A) a[to] = a[from];
  }

  /**
   * Dibuja en coordenadas de mundo (el contexto ya trae la transformación de cámara).
   * @param {{x:number,y:number,w:number,h:number}} view  rectángulo visible en mundo
   * @param {boolean} additive  true: solo las aditivas · false: solo las normales
   */
  draw(ctx, view, additive) {
    const n = this.n;
    if (!n) return;
    const NC = Math.min(this.palette.length, 256);
    const K = NC * 8;
    const counts = this.counts;
    counts.fill(0, 0, K + 1);
    let m = 0;
    for (let i = 0; i < n; i++) {
      if ((this.add[i] === 1) !== additive) continue;
      const sy = this.y[i] - this.z[i];
      if (this.x[i] < view.x - 4 || this.x[i] > view.x + view.w + 4 || sy < view.y - 4 || sy > view.y + view.h + 4) continue;
      const a = Math.min(3, Math.floor((this.life[i] / this.max[i]) * 4));
      const key = this.col[i] * 4 + a;
      this.keys[m] = key; this.order[m] = i;
      counts[key + 1]++;
      m++;
    }
    if (!m) return;
    for (let k = 1; k <= K; k++) counts[k] += counts[k - 1];
    const sorted = this.sortedTmp || (this.sortedTmp = new Uint16Array(this.cap));
    for (let j = 0; j < m; j++) sorted[counts[this.keys[j]]++] = this.order[j];
    let lastKey = -1;
    ctx.globalCompositeOperation = additive ? "lighter" : "source-over";
    for (let j = 0; j < m; j++) {
      const i = sorted[j];
      const a = Math.min(3, Math.floor((this.life[i] / this.max[i]) * 4));
      const key = this.col[i] * 4 + a;
      if (key !== lastKey) {
        lastKey = key;
        ctx.fillStyle = this.palette[this.col[i]];
        ctx.globalAlpha = (a + 1) / 4;
      }
      const k = this.kind[i];
      let s = this.size[i];
      const px = Math.round(this.x[i]), py = Math.round(this.y[i] - this.z[i]);
      if (k === KIND.SMOKE) { s += this.grow[i] * (1 - this.life[i] / this.max[i]); const r = Math.round(s); ctx.fillRect(px - (r >> 1), py - (r >> 1), r, r); }
      else if (k === KIND.LEAF) { const flip = Math.sin(this.t * 5 + this.phase[i]) > 0; ctx.fillRect(px, py, flip ? 2 : 1, flip ? 1 : 2); }
      else if (k === KIND.SPARK) { ctx.fillRect(px, py, 1, 1); ctx.fillRect(Math.round(px - this.vx[i] * 0.03), Math.round(py - this.vy[i] * 0.03 + this.vz[i] * 0.03), 1, 1); }
      else ctx.fillRect(px, py, s, s);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  /* ---------------- Anillos de onda expansiva ---------------- */
  ring(x, y, r0, r1, dur, color, additive = true, thick = 1) { this.rings.push({ x, y, r0, r1, t: 0, dur, color, additive, thick }); }

  updateRings(dt) {
    for (const r of this.rings) r.t += dt;
    this.rings = this.rings.filter((r) => r.t < r.dur);
  }

  drawRings(ctx) {
    for (const r of this.rings) {
      const p = r.t / r.dur, rad = r.r0 + (r.r1 - r.r0) * (1 - (1 - p) * (1 - p));
      ctx.globalAlpha = 1 - p;
      ctx.globalCompositeOperation = r.additive ? "lighter" : "source-over";
      ctx.fillStyle = r.color;
      const steps = Math.max(16, Math.round(rad * 1.6));
      for (let k = 0; k < steps; k++) {
        const a = (k / steps) * TAU;
        ctx.fillRect(Math.round(r.x + Math.cos(a) * rad), Math.round(r.y + Math.sin(a) * rad * 0.62), r.thick, r.thick);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  clear() { this.n = 0; this.rings.length = 0; }

  /* ---------------- Emisores de uso común ---------------- */

  /** Estallido radial de chispas/píxeles (compatible con el antiguo burstAt). */
  burst(x, y, n, colors, speed = 60, o = {}) {
    n = this.q(n);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, v = (0.3 + Math.random()) * speed;
      this.spawn(x, y, o.z ?? 4, Math.cos(a) * v, Math.sin(a) * v * 0.6, (o.up ?? 30) * (0.4 + Math.random()),
        0.4 + Math.random() * 0.6, colors[(Math.random() * colors.length) | 0], { grav: o.grav ?? 220, bounce: o.bounce ?? 0.3, drag: 0.5, additive: o.additive ?? true, kind: o.kind ?? KIND.SPARK });
    }
  }

  /** Fragmentos sólidos que salen disparados desde (x,y) alejándose del origen del impacto. */
  debris(x, y, colors, n, force = 80, o = {}) {
    n = this.q(n);
    const ox = o.fromX ?? x, oy = o.fromY ?? y;
    for (let i = 0; i < n; i++) {
      let dx = x - ox + (Math.random() - 0.5) * 6, dy = y - oy + (Math.random() - 0.5) * 6;
      const d = Math.hypot(dx, dy) || 1;
      dx /= d; dy /= d;
      const f = force * (0.45 + Math.random() * 0.95);
      this.spawn(x + (Math.random() - 0.5) * (o.spread ?? 8), y + (Math.random() - 0.5) * (o.spread ?? 8) * 0.5, o.z ?? 6,
        dx * f + (Math.random() - 0.5) * force * 0.5, dy * f * 0.55 + (Math.random() - 0.5) * force * 0.3, 60 + Math.random() * force * 1.3,
        1.1 + Math.random() * 1.4, colors[(Math.random() * colors.length) | 0],
        { size: Math.random() < (o.chunky ?? 0.25) ? 3 : Math.random() < 0.5 ? 2 : 1, grav: o.grav ?? 360, bounce: 0.38, drag: 0.35 });
    }
  }

  /** Nube de polvo / humo que se hincha y se desvanece. */
  dust(x, y, n, color = "#8a8272", o = {}) {
    n = this.q(n);
    for (let i = 0; i < n; i++) {
      this.spawn(x + (Math.random() - 0.5) * 8, y + (Math.random() - 0.5) * 4, 2 + Math.random() * 4,
        (Math.random() - 0.5) * 22, (Math.random() - 0.5) * 8, 6 + Math.random() * 16,
        0.5 + Math.random() * 0.7, color, { size: 2, grow: o.grow ?? 5, kind: KIND.SMOKE, drag: 1.4, grav: -2 });
    }
  }

  /** Hojas pixeladas que caen revoloteando desde una copa. */
  leaves(x, y, z, n, colors) {
    n = this.q(n);
    for (let i = 0; i < n; i++) {
      this.spawn(x + (Math.random() - 0.5) * 26, y + (Math.random() - 0.5) * 8, z + Math.random() * 14,
        (Math.random() - 0.5) * 24, (Math.random() - 0.5) * 6, 8 + Math.random() * 20,
        1.6 + Math.random() * 1.8, colors[(Math.random() * colors.length) | 0],
        { kind: KIND.LEAF, grav: 22, drag: 1.2, flutter: 10 + Math.random() * 10, bounce: 0 });
    }
  }

  /** Brasas que suben (fuego, antorchas, hierba ardiendo). */
  embers(x, y, n, spread = 6, o = {}) {
    n = this.q(n);
    const cols = o.colors ?? ["#ff7a1e", "#ffc24a", "#fff1b8", "#b03a12"];
    for (let i = 0; i < n; i++) {
      this.spawn(x + (Math.random() - 0.5) * spread, y + (Math.random() - 0.5) * 2, o.z ?? 3, (Math.random() - 0.5) * 10, 0, 18 + Math.random() * 26,
        0.6 + Math.random() * 0.9, cols[(Math.random() * cols.length) | 0], { additive: true, grav: -6, drag: 0.8, flutter: 5, kind: KIND.SPARK });
    }
  }

  /** Humo oscuro que sube. */
  smoke(x, y, n, o = {}) {
    n = this.q(n);
    for (let i = 0; i < n; i++) {
      this.spawn(x + (Math.random() - 0.5) * (o.spread ?? 6), y, o.z ?? 6, (Math.random() - 0.5) * 6, 0, 10 + Math.random() * 10,
        1.4 + Math.random() * 1.2, o.color ?? "#2a2426", { size: 3, grow: 6, kind: KIND.SMOKE, grav: -3, drag: 0.6, flutter: 4 });
    }
  }
}

/* ======================================================================
   ImpactReactor
   ====================================================================== */

/** Material y resistencia de cada objeto destructible. */
export const DESTRUCTIBLE = Object.freeze({
  rock:      { hp: 6, mat: "stone", loot: 0.14 },
  tomb:      { hp: 3, mat: "stone", loot: 0.2 },
  pillar:    { hp: 5, mat: "stone", loot: 0.1, big: true },
  rubble:    { hp: 1, mat: "stone" },
  bigrubble: { hp: 2, mat: "stone" },
  fallen:    { hp: 4, mat: "stone", big: true },
  wall:      { hp: 5, mat: "stone", big: true },
  statue:    { hp: 6, mat: "stone", loot: 0.5, big: true },
  crate:     { hp: 1, mat: "wood", loot: 0.5 },
  barrel:    { hp: 1, mat: "wood", loot: 0.4 },
  fence:     { hp: 1, mat: "wood" },
  log:       { hp: 3, mat: "wood" },
  stump:     { hp: 2, mat: "ash" },
  dead:      { hp: 3, mat: "wood", loot: 0.05 },
  crag:      { hp: 14, mat: "rock", loot: 0.35, big: true },
  plant:     { hp: 1, mat: "leaf", loot: 0.06, cut: true },
  mushroom:  { hp: 1, mat: "leaf", loot: 0.1, cut: true },
  crystal:   { hp: 3, mat: "crystal", loot: 0.7 },
  brazier:   { hp: 4, mat: "ash", big: true, loot: 0.2 },
  cart:      { hp: 3, mat: "wood", big: true, loot: 0.3 },
});

const MATS = {
  stone: ["#7D7A70", "#9A968A", "#5E5B53", "#B9B5A7", "#3F3D38"],
  wood: ["#8A6440", "#6B4A2E", "#4A3220", "#A07C52"],
  ash: ["#2C2624", "#1C1818", "#403632", "#FF7A1E"],
  rock: ["#5a4636", "#3a2a22", "#7a6450", "#2a1c18", "#8a7a68"],
  leaf: ["#e8b84a", "#d8802a", "#a8501a"],
  crystal: ["#e0b0ff", "#a86aff", "#7a3ad8", "#ffffff", "#5ad0ff"],
};
const LEAF_FALLBACK = ["#2C6A3C", "#4C8E32", "#86C23C", "#B6E25A"];

export class ImpactReactor {
  /**
   * @param {ParticleSystem} ps
   * @param {object} world
   * @param {() => object} world.map                        mapa activo (obstacles, grass, …)
   * @param {(o:object) => void} world.removeObstacle       quita el objeto del mapa y de las colisiones
   * @param {(x:number,y:number,n:number) => void} world.dropLoot
   * @param {(x:number,y:number,r:number,holy:boolean) => void} world.scorch    estampa quemadura en el suelo
   * @param {(x:number,y:number) => void} world.rubble      estampa escombros en el suelo
   * @param {(amount:number) => void} [world.shake]
   * @param {object} [world.sfx]                            { crack, shatter, rustle }
   */
  constructor(ps, world) { this.ps = ps; this.w = world; this.props = new PropPhysics(this); }

  spec(type) { return DESTRUCTIBLE[type]; }
  /** Avanza la física de objetos (rodando, cayendo, ardiendo). */
  update(dt) { this.props.update(dt); }

  /**
   * Onda de impacto.
   * @param {{x:number,y:number,radius:number,power:number,element?:string}} b
   *   element: "punch" | "holy" | "fire" | "dark" | "bite"
   */
  blast({ x, y, radius, power, element = "punch" }) {
    const m = this.w.map();
    if (!m) return;
    const ps = this.ps;
    const holy = element === "holy", fire = element === "fire" || holy;
    const strong = power >= 1.5;

    // ---- Hierba: se aplasta (golpe) o se quema (especial / fuego) ----
    if (m.grass) {
      const r2 = radius * radius;
      for (const g of m.grassNear(x, y, radius)) {
        const dx = g.x - x, dy = g.y - y, d2 = dx * dx + dy * dy;
        if (d2 > r2 || g.burnt) continue;
        const d = Math.sqrt(d2) || 1;
        g.flat = 1; g.lean = dx / d; m.grassTouch?.(g);
        if (fire && d2 < r2 * 0.75) {
          g.burn = 1; m.grassTouch?.(g);
          if (Math.random() < 0.6) ps.embers(g.x, g.y, 1, 4, { colors: holy ? ["#fff1b8", "#e3b341", "#ffffff"] : undefined });
        } else if (Math.random() < 0.3) {
          ps.spawn(g.x, g.y, 1, dx / d * 24, dy / d * 10, 22 + Math.random() * 20, 0.5 + Math.random() * 0.4, g.col ?? "#7FA046", { grav: 200, bounce: 0.2, drag: 1 });
        }
      }
    }

    // ---- Árboles y objetos destructibles ----
    let shook = 0, broke = 0;
    for (const o of m.obstaclesNear(x, y, radius + 24)) {
      const oy = o.by - 6, d = Math.hypot(o.bx - x, oy - y);
      if (d > radius + 14) continue;
      const fall = Math.max(0.2, 1 - d / (radius + 14));
      if (o.fall) continue;
      if (o.type === "plant" || o.type === "mushroom") { this.hitPlant(o, x, y, power, fire, holy, d, radius); continue; }
      if (o.type === "pine" || o.type === "oak") {
        const before = o.shake || 0;
        o.shake = Math.min(2.4, Math.max(before, (0.8 + power * 0.7) * fall));
        o.shakeT = 0;
        if (before < 0.4 || strong) {
          const cols = o.leafCols || LEAF_FALLBACK;
          ps.leaves(o.bx, o.by - 22, 24, 3 + Math.round(power * 5 * fall), cols);
          shook++;
        }
        continue;
      }
      const spec = DESTRUCTIBLE[o.type];
      if (!spec) continue;
      o.hit = 0.18;                                           // destello de impacto
      if (KICKABLE.has(o.type) && power < 1.5 && !holy) {     // barril, caja, tronco: salen rodando o deslizándose
        o.dmg = (o.dmg || 0) + power * 0.4;
        if (o.dmg >= spec.hp) { this.shatter(o, spec, x, y); broke++; } else this.props.kick(o, x, y, power);
        continue;
      }
      o.dmg = (o.dmg || 0) + power * (0.55 + fall) * (holy ? 1.5 : 1);
      o.shake = 1;
      if (TOPPLE.has(o.type) && o.dmg >= spec.hp * 0.5 && power >= 1) { this.props.topple(o, x, y); continue; }   // pilares y estatuas se desploman
      const stage = Math.min(2, Math.floor((o.dmg / spec.hp) * 3));
      if (o.dmg >= spec.hp) { this.shatter(o, spec, x, y); broke++; }
      else if (stage > (o.cracks || 0)) {
        o.cracks = stage;
        const sx = o.bx, sy = o.by - (spec.big ? 14 : 5);
        ps.debris(sx, sy, MATS[spec.mat], 5 + stage * 3, 55, { fromX: x, fromY: y, z: 8 });
        this.w.sfx?.crack?.();
      }
    }
    if (shook) this.w.sfx?.rustle?.();

    // ---- Efectos propios del ataque ----
    if (strong) {
      ps.ring(x, y, 4, radius * 0.9, 0.38, holy ? "#fbe7a1" : "#ffffff", true, 1);
      if (holy) ps.ring(x, y, 2, radius * 0.6, 0.5, "#e3b341", true, 1);
    }
    ps.dust(x, y, strong ? 8 : 4, holy ? "#cfc08a" : "#8a8272");
    if (fire && strong) this.w.scorch?.(x, y, radius * 0.45, holy);
    this.w.shake?.(Math.min(1, power * 0.25 + broke * 0.2));
  }

  /** Plantas: se agitan; con un golpe fuerte se cortan soltando motas; con fuego arden hasta quedar en ceniza. */
  hitPlant(o, x, y, power, fire, holy, d, radius) {
    const ps = this.ps;
    const cols = PLANT_COLORS[o.spr] || o.leafCols || LEAF_FALLBACK;
    o.shake = Math.min(2, 0.9 + power * 0.5); o.hit = 0.1;
    if (o.type === "mushroom") {                              // las setas se aplastan y sueltan una nube de esporas
      if (o.squash >= 1) return;
      o.squash = 1;
      for (let i = 0; i < ps.q(16); i++) ps.spawn(o.bx + (Math.random() - 0.5) * 10, o.by - 8, 4 + Math.random() * 6, (Math.random() - 0.5) * 36, (Math.random() - 0.5) * 12, 14 + Math.random() * 26, 1.1 + Math.random() * 0.8,
        cols[(Math.random() * cols.length) | 0], { additive: true, kind: 3, grav: -6, drag: 0.9, flutter: 8 });
      ps.dust(o.bx, o.by - 4, 3, "#cfc0d8");
      this.w.sfx?.rustle?.();
      return;
    }
    const dx = o.bx - x, dy = (o.by - 6) - y, dd = Math.hypot(dx, dy) || 1;
    if (fire && !o.burn) {
      o.burn = 1; o.cut = true; this.props.ignite(o);
      ps.embers(o.bx, o.by - 6, 5, 8, { colors: holy ? ["#fff1b8", "#e3b341", "#ffffff"] : undefined });
      return;
    }
    if (o.cut) return;
    if (power >= 1 || d < radius * 0.55) {
      o.cut = true;
      const n = ps.q(10);
      for (let i = 0; i < n; i++) {                           // motas y granos que salen disparados con trayectoria parabólica
        ps.spawn(o.bx + (Math.random() - 0.5) * 8, o.by - 8 - Math.random() * 8, 6 + Math.random() * 10,
          (dx / dd) * (20 + Math.random() * 40) + (Math.random() - 0.5) * 24, (dy / dd) * 10 + (Math.random() - 0.5) * 8, 40 + Math.random() * 50,
          0.8 + Math.random() * 0.8, cols[(Math.random() * cols.length) | 0], { grav: 260, bounce: 0.25, drag: 0.5, size: Math.random() < 0.3 ? 2 : 1 });
      }
      ps.leaves(o.bx, o.by - 10, 10, 3, cols);
      this.w.sfx?.rustle?.();
      if (Math.random() < 0.07) this.w.dropLoot?.(o.bx, o.by, 1);
    }
  }

  /** Estalla un objeto: fragmentos parabólicos + polvo + escombros en el suelo; puede soltar monedas. */
  shatter(o, spec, fx, fy) {
    const ps = this.ps;
    const big = !!spec.big;
    const x = o.bx, y = o.by - (big ? 14 : 5);
    ps.debris(x, y, MATS[spec.mat], big ? 34 : spec.hp > 1 ? 22 : 14, big ? 120 : 90, { fromX: fx, fromY: fy, z: big ? 18 : 8, spread: big ? 14 : 8, chunky: big ? 0.45 : 0.25 });
    ps.dust(x, o.by - 2, big ? 9 : 5, spec.mat === "wood" ? "#6b5a42" : spec.mat === "ash" ? "#3a3030" : "#8a8272", { grow: big ? 8 : 5 });
    if (spec.mat === "ash") ps.embers(x, o.by - 4, 8, 6);
    if (spec.mat === "crystal") {                             // cristal: esquirlas luminosas, destello y anillo
      ps.burst(x, y - 4, 26, ["#ffffff", "#e0b0ff", "#a86aff", "#5ad0ff"], 120, { up: 100, grav: 260 });
      ps.ring(x, o.by - 4, 3, 30, 0.45, "#e0b0ff", true, 2);
    }
    ps.ring(x, o.by, 2, big ? 26 : 16, 0.32, "#cfc8b0", false, 1);
    this.w.rubble?.(x, o.by, spec.mat === "wood" ? 0 : big ? 12 : 7, spec.mat);
    this.w.removeObstacle?.(o);
    this.w.sfx?.shatter?.(big);
    if (spec.loot && Math.random() < spec.loot) this.w.dropLoot?.(x, o.by, 1 + ((Math.random() * 2) | 0));
    this.w.shake?.(big ? 0.6 : 0.3);
  }
}
