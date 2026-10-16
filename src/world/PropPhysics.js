/**
 * PropPhysics · cada objeto del escenario se comporta según su material y forma
 * ------------------------------------------------------------------------------
 *   barril   rueda lejos (poca fricción), rebota y gira; se rompe si choca a mucha velocidad
 *   caja     se desliza y se detiene enseguida (mucha fricción), cabecea y se astilla contra las paredes
 *   tronco   pesado: rueda despacio, casi no rebota y aguanta mucho
 *   pilar    se desploma entero en la dirección del golpe (rotación acelerada) y revienta al caer
 *   estatua  igual que el pilar, pero más lenta y pesada; deja una nube de polvo enorme
 *   agua     los objetos que caen a un lago frenan en seco y levantan salpicaduras
 *
 * Los objetos empujados salen del índice estático de colisiones y pasan a `map.movers`
 * (que cuenta como obstáculo dinámico) hasta que se detienen y vuelven a quedar fijos.
 */
export const PLANT_COLORS = {
  wheatA: ["#e8b84a", "#f0d070", "#c88a2a"], wheatB: ["#d8803a", "#e8b84a", "#a8501a"], grassOrange: ["#e8a030", "#f0c050", "#c8702a"],
  reedsRed: ["#c83a2a", "#a02420", "#e0603a"], fernA: ["#d8902a", "#e8b84a", "#a8601a"], fernB: ["#6a8a3a", "#d87a3a", "#a8601a"],
  flowers: ["#e8a0c0", "#f0e0a0", "#6a8a3a"], flowerBush: ["#e8a0c0", "#6a8a3a", "#f0d0e0"], berryBush: ["#3a6a2a", "#c83a2a", "#2a4a1a"],
  deadBushA: ["#8a5a3a", "#6a3a2a"], deadBushB: ["#8a5a3a", "#6a3a2a"], deadBushC: ["#8a5a3a", "#6a3a2a"], dryBush: ["#c8902a", "#a8601a", "#e8b84a"],
  treeBig: ["#f0b040", "#d8802a", "#a8501a", "#ffe080"], treeSmall: ["#f0b040", "#d8802a", "#a8501a"],
};

const PROP_SPEC = {
  barrel: { mass: 1.0, fric: 0.75, rest: 0.55, roll: true, push: 160, breakV: 130, hop: 0.34, chips: ["#8A6440", "#6B4A2E", "#A07C52", "#4A3220"] },
  crate:  { mass: 1.8, fric: 5.5,  rest: 0.12, roll: false, push: 112, breakV: 92,  hop: 0.18, chips: ["#A07C52", "#8A6440", "#C9A56A", "#6B4A2E"] },
  log:    { mass: 3.4, fric: 1.9,  rest: 0.22, roll: true, wobble: true, push: 78,  breakV: 200, hop: 0.08, chips: ["#6B4A2E", "#4A3220", "#8A6440"] },
};
export const KICKABLE = new Set(Object.keys(PROP_SPEC));
export const TOPPLE = new Set(["pillar", "statue", "tomb"]);

const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export class PropPhysics {
  /** @param {object} reactor  ImpactReactor (aporta ps, mundo y shatter) */
  constructor(reactor) { this.r = reactor; this.falling = []; this.burning = []; }

  get map() { return this.r.w.map(); }

  /* ---------------- Empujones ---------------- */
  /** Un golpe de intensidad `power` desde (fx,fy) empuja el objeto. Devuelve true si lo movió. */
  kick(o, fx, fy, power) {
    const spec = PROP_SPEC[o.type]; if (!spec) return false;
    const m = this.map;
    let dx = o.bx - fx, dy = (o.by - 4) - fy;
    const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const v = (spec.push * (0.55 + 0.45 * Math.min(2, power))) / Math.sqrt(spec.mass);
    if (!o.mv) this.#start(o, m);
    const mv = o.mv;
    mv.vx += dx * v; mv.vy += dy * v * 0.8; mv.vz = Math.max(mv.vz, v * spec.hop * 0.9);
    mv.w += (dx >= 0 ? 1 : -1) * v * 0.05 * (spec.roll ? 1 : 0.25);
    this.r.ps.dust(o.bx, o.by - 2, 3, "#8a8272");
    this.r.w.sfx?.crack?.();
    return true;
  }

  #start(o, m) {
    const spec = PROP_SPEC[o.type];
    for (const b of o.boxes) b.dead = true;                      // sale del índice estático
    const b0 = o.boxes[0] || { x: o.bx - 5, y: o.by - 5, w: 10, h: 5 };
    const box = { x: b0.x, y: b0.y, w: b0.w, h: b0.h, owner: o, mover: true };
    o.mv = { vx: 0, vy: 0, vz: 0, z: 0, w: 0, rot: o.rot || 0, box, spec, t: 0, wet: false };
    o.boxes = [box]; o.box = box;
    (m.movers || (m.movers = [])).push(o);
  }

  /* ---------------- Derribos ---------------- */
  topple(o, fx, fy) {
    if (o.fall) return;
    for (const b of o.boxes) b.dead = true;                       // deja de bloquear mientras cae
    const heavy = o.type === "statue";
    o.fall = { dir: o.bx >= fx ? 1 : -1, ang: 0, w: heavy ? 0.35 : 0.6, g: heavy ? 4.2 : 7.5, heavy };
    this.falling.push(o);
    this.r.w.sfx?.crack?.();
    this.r.ps.dust(o.bx, o.by - 2, 5, "#8a8272");
  }

  /* ---------------- Fuego en plantas ---------------- */
  ignite(o) { if (!this.burning.includes(o)) this.burning.push(o); }

  /* ---------------- Simulación ---------------- */
  update(dt) {
    const m = this.map; if (!m) return;
    const ps = this.r.ps;
    // plantas ardiendo: brasas y ceniza
    for (let i = this.burning.length - 1; i >= 0; i--) {
      const o = this.burning[i];
      o.burn = Math.max(0, (o.burn || 0) - dt * 0.4);
      if (Math.random() < 0.5) ps.embers(o.bx, o.by - 4, 1, 5);
      if (o.burn <= 0) this.burning.splice(i, 1);
    }
    // pilares y estatuas cayendo
    for (let i = this.falling.length - 1; i >= 0; i--) {
      const o = this.falling[i], f = o.fall;
      if (o.dead) { this.falling.splice(i, 1); continue; }
      f.w += f.g * (0.4 + f.ang) * dt;
      f.ang += f.w * dt;
      if (o.type === "tomb" && f.ang > 1.3) {                    // la lápida cae y se queda tumbada (no revienta)
        this.falling.splice(i, 1);
        o.lying = true; o.rot = f.dir * 1.32; o.fall = null;
        ps.dust(o.bx + f.dir * 10, o.by, 6, "#8a8272", { grow: 7 });
        ps.ring(o.bx + f.dir * 10, o.by, 3, 24, 0.4, "#cfc8b0", false, 1);
        this.r.w.shake?.(0.5); this.r.w.sfx?.crack?.();
        continue;
      }
      if (f.ang > 1.38) {                                        // impacto contra el suelo
        this.falling.splice(i, 1);
        const spec = this.r.spec(o.type);
        const tipX = o.bx + f.dir * (f.heavy ? 26 : 22);
        this.r.shatter(o, spec, o.bx - f.dir * 20, o.by);
        ps.debris(tipX, o.by - 2, ["#5d5878", "#4a4660", "#38344a", "#7a7698"], f.heavy ? 40 : 28, 120, { fromX: o.bx, fromY: o.by, z: 6, spread: 16, chunky: 0.5 });
        ps.dust(tipX, o.by, f.heavy ? 14 : 9, "#8a8272", { grow: 11 });
        ps.ring(tipX, o.by, 4, f.heavy ? 70 : 48, 0.55, "#cfc8b0", false, 2);
        this.r.w.shake?.(f.heavy ? 1 : 0.8);
        this.r.w.sfx?.shatter?.(true);
      }
    }
    // objetos rodando / deslizando
    const movers = m.movers;
    if (movers && movers.length) for (let i = movers.length - 1; i >= 0; i--) this.#stepMover(movers[i], dt, i, m);
  }

  free(o, box, m) {
    if (m.T.blockedBox(box, 1)) return false;                     // el agua (bit 1) no bloquea: se flota
    if (Math.hypot(box.x + box.w / 2 - m.cx, box.y + box.h / 2 - m.cy) > m.R - 70) return false;
    for (const q of m.boxesNear(box)) if (q !== box && q.owner !== o && overlap(box, q)) return false;
    for (const q of m.dynBoxes()) if (q !== box && q.owner !== o && overlap(box, q)) return false;
    return true;
  }

  #stepMover(o, dt, idx, m) {
    if (o.dead || !o.mv) { m.movers.splice(idx, 1); return; }      // reventado por otro golpe mientras rodaba
    const mv = o.mv, spec = mv.spec, ps = this.r.ps;
    mv.t += dt;
    const cx = o.bx, cy = o.by;
    const wet = m.T.waterAt(cx | 0, (cy - 2) | 0);
    if (wet !== mv.wet) { mv.wet = wet; ps.ring(cx, cy, 2, 16, 0.6, "#cfe8ff", false, 1); for (let k = 0; k < 8; k++) ps.spawn(cx, cy, 2, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 12, 40 + Math.random() * 40, 0.7, "#e6f0ee", { grav: 200 }); this.r.w.sfx?.rustle?.(); }
    const fric = spec.fric * (wet ? 3.2 : 1);
    const k = Math.exp(-fric * dt);
    mv.vx *= k; mv.vy *= k;
    // movimiento por ejes con rebote
    const steps = Math.max(1, Math.ceil(Math.hypot(mv.vx, mv.vy) * dt / 3));
    for (let s = 0; s < steps; s++) {
      for (const axis of ["x", "y"]) {
        const v = axis === "x" ? mv.vx : mv.vy;
        if (!v) continue;
        const nx = axis === "x" ? o.bx + (v * dt) / steps : o.bx, ny = axis === "y" ? o.by + (v * dt) / steps : o.by;
        const probe = { x: mv.box.x + (nx - o.bx), y: mv.box.y + (ny - o.by), w: mv.box.w, h: mv.box.h };
        if (this.free(o, probe, m)) { o.bx = nx; o.by = ny; mv.box.x = probe.x; mv.box.y = probe.y; }
        else {
          const speed = Math.hypot(mv.vx, mv.vy);
          if (axis === "x") mv.vx = -mv.vx * spec.rest; else mv.vy = -mv.vy * spec.rest;
          mv.w *= -0.6;
          if (speed > 40) {
            mv.vz = Math.max(mv.vz, speed * spec.hop);
            ps.debris(o.bx, o.by - 5, spec.chips, 4 + ((speed / 30) | 0), 40 + speed * 0.3, { fromX: o.bx - (axis === "x" ? Math.sign(v) * 6 : 0), fromY: o.by - (axis === "y" ? Math.sign(v) * 6 : 0), z: 6 });
            this.r.w.sfx?.crack?.();
          }
          if (speed > spec.breakV) { this.#break(o, m, idx); return; }
        }
      }
    }
    // saltitos y giro
    mv.vz -= 520 * dt; mv.z += mv.vz * dt;
    if (mv.z < 0) { mv.z = 0; if (mv.vz < -30) { mv.vz = -mv.vz * 0.4 * (spec.rest + 0.2); ps.dust(o.bx, o.by, 1, "#8a8272"); } else mv.vz = 0; }
    mv.rot += mv.w * dt; mv.w *= Math.exp(-(spec.roll ? 0.5 : 4) * dt);
    if (!spec.roll) mv.rot *= Math.exp(-6 * dt);                  // la caja vuelve a quedar derecha
    o.rot = spec.wobble ? Math.sin(mv.t * 14) * Math.min(0.1, Math.hypot(mv.vx, mv.vy) * 0.0014) : mv.rot; o.z = spec.wobble ? 0 : mv.z;
    if (Math.hypot(mv.vx, mv.vy) > 30 && mv.z < 1.5 && Math.random() < 0.3) ps.dust(o.bx, o.by - 1, 1, wet ? "#cfe8ff" : "#8a8272");
    // ¿ha parado? vuelve a ser un obstáculo fijo
    if (Math.hypot(mv.vx, mv.vy) < 8 && mv.z < 0.5) this.#settle(o, m, idx);
  }

  #settle(o, m, idx) {
    const mv = o.mv;
    m.movers.splice(idx, 1);
    mv.box.dead = true;
    const b = { x: mv.box.x, y: mv.box.y, w: mv.box.w, h: mv.box.h, owner: o };
    m.addBox(b);
    o.boxes = [b]; o.box = b;
    if (!mv.spec.roll || mv.spec.wobble) o.rot = 0;
    o.mv = null; o.z = 0;
  }

  #break(o, m, idx) {
    m.movers.splice(idx, 1);
    o.mv.box.dead = true;
    o.boxes = [];
    this.r.shatter(o, this.r.spec(o.type), o.bx, o.by);
    o.mv = null;
  }
}
