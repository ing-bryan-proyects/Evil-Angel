/**
 * BattleStage · escenario de combate tipo Pokémon / JRPG lateral
 * --------------------------------------------------------------
 * Dibuja en un canvas lógico de 320×180 (ampliado con escala entera) a los dos combatientes con
 * sus hojas de sprites animadas, sombras, ambiente flotante y todos los efectos de combate:
 *
 *   play(who, anim)            animación en bucle (idle, walk, run, attack1, attack2…)
 *   melee(who, opts)           carga contra el rival, golpea y vuelve (con estela)
 *   hit(who, opts)             destello blanco + retroceso decelerado + chispas
 *   scene(fn)                  ATAQUE ESPECIAL «tipo escena»: barras de cine, oscurecimiento,
 *                              zoom de cámara, título, tiras de fotogramas de los sprites
 *                              especiales a mayor tamaño, haces de luz, temblor, destellos y
 *                              cámara lenta. `fn(S)` recibe el director de la escena.
 *   screenPos(who)             coordenadas CSS de un combatiente (para números de daño y anclas)
 *
 * Los personajes miran a la derecha en sus hojas; el enemigo se refleja.
 */

import { ATLAS, AtlasActor } from "../graphics/Atlas.js";
import { ParticleSystem } from "../graphics/ParticleSystem.js";

const LW = 320, LH = 180;
const ease = {
  linear: (t) => t,
  out: (t) => 1 - Math.pow(1 - t, 3),
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  in: (t) => t * t * t,
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class BattleStage {
  /** @param {HTMLCanvasElement} canvas  @param {(who:string, el:{x:number,y:number,w:number,h:number})=>void} [onAnchor] */
  constructor(canvas, onAnchor) {
    this.canvas = canvas; this.g = canvas.getContext("2d");
    this.onAnchor = onAnchor;
    this.ps = new ParticleSystem(1800);
    this.running = false; this.t = 0; this.last = 0; this.k = 4; this.ox = 0; this.oy = 0; this.timeScale = 1;
    this.hero = this.#actor(92, 136); this.foe = this.#actor(232, 136);
    this.foe.flip = true;
    this.strips = []; this.rays = []; this.texts = [];
    this.cam = { x: LW / 2, y: LH / 2, zoom: 1 };
    this.fx = { bars: 0, barsTarget: 0, dim: 0, dimTarget: 0, flash: 0, flashColor: "#fff", shake: 0, title: null, vignette: 0 };
    this.bg = { motes: Array.from({ length: 34 }, () => ({ x: Math.random() * LW, y: Math.random() * LH, v: 4 + Math.random() * 10, p: Math.random() * 6.28 })) };
    this.frame = this.frame.bind(this);
  }

  #actor(x, y) {
    return { x, y, home: { x, y }, actor: null, atlas: null, canvas: null, scale: 1, flip: false, flash: 0, alpha: 1, rot: 0, tint: null, visible: true, bobT: Math.random() * 6, offX: 0, offY: 0, anim: "idle", hold: null };
  }

  /* ---------------- configuración ---------------- */
  setHero(atlasId) { const a = ATLAS[atlasId]; this.hero.atlas = a; this.hero.actor = new AtlasActor(a, 9); this.hero.canvas = null; this.reset(this.hero); }
  /** @param {{atlas?:string, canvas?:HTMLCanvasElement, scale?:number}} def */
  setFoe(def) {
    const f = this.foe;
    f.scale = def.scale || 1;
    if (def.atlas && ATLAS[def.atlas]) { f.atlas = ATLAS[def.atlas]; f.actor = new AtlasActor(f.atlas, 8); f.canvas = null; }
    else { f.atlas = null; f.actor = null; f.canvas = def.canvas || null; }
    f.flip = true; f.groundOffset = def.groundOffset || 0;
    this.reset(f);
  }
  reset(a) { a.x = a.home.x; a.y = a.home.y; a.offX = a.offY = 0; a.flash = 0; a.alpha = 1; a.rot = 0; a.tint = null; a.visible = true; a.hold = null; if (a.actor) a.actor.play("idle"); }
  resize() {
    const w = window.innerWidth, h = window.innerHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(w * dpr); this.canvas.height = Math.floor(h * dpr);
    this.dpr = dpr;
    this.k = Math.max(1, Math.floor(Math.min(this.canvas.width / LW, this.canvas.height / LH) * 4) / 4);
    this.ox = Math.floor((this.canvas.width - LW * this.k) / 2); this.oy = Math.floor((this.canvas.height - LH * this.k) / 2);
  }
  start() { if (this.running) return; this.running = true; this.last = 0; this.resize(); requestAnimationFrame(this.frame); }
  stop() { this.running = false; this.strips.length = 0; this.fx.bars = this.fx.barsTarget = 0; this.fx.dim = this.fx.dimTarget = 0; this.cam = { x: LW / 2, y: LH / 2, zoom: 1 }; this.ps.clear(); }

  /** Posición CSS (px de ventana) del centro del cuerpo de un combatiente. */
  screenPos(who) {
    const a = who === "hero" ? this.hero : this.foe;
    const hgt = (a.atlas ? a.atlas.height : a.canvas ? a.canvas.height : 36) * a.scale;
    const lx = a.x, ly = a.y - hgt * 0.55;
    const z = this.cam.zoom, cx = (lx - this.cam.x) * z + LW / 2, cy = (ly - this.cam.y) * z + LH / 2;
    return { x: (this.ox + cx * this.k) / this.dpr, y: (this.oy + cy * this.k) / this.dpr, w: 40 * this.k / this.dpr, h: hgt * z * this.k / this.dpr };
  }

  /* ---------------- animación de los combatientes ---------------- */
  play(who, anim, o = {}) { const a = who === "hero" ? this.hero : this.foe; if (a.actor) a.actor.play(anim, o); a.anim = anim; }
  /** Reproduce una animación una vez y vuelve a reposo; resuelve al terminar. */
  async once(who, anim, o = {}) {
    const a = who === "hero" ? this.hero : this.foe;
    if (!a.actor || !a.atlas.has(anim)) return;
    a.actor.play(anim, { loop: false, fps: o.fps || 12, restart: true });
    await new Promise((res) => { const iv = setInterval(() => { if (a.actor.finished || !this.running) { clearInterval(iv); res(); } }, 16); });
    if (!o.hold) a.actor.play("idle");
  }
  tween(obj, props, dur, fn = ease.out) {
    return new Promise((res) => {
      const from = {}; for (const k in props) from[k] = obj[k];
      const t0 = this.t;
      const step = () => {
        if (!this.running) return res();
        const p = Math.min(1, (this.t - t0) / Math.max(0.001, dur));
        for (const k in props) obj[k] = from[k] + (props[k] - from[k]) * fn(p);
        if (p >= 1) res(); else requestAnimationFrame(step);
      };
      step();
    });
  }

  /** Carga contra el rival, golpea (onHit en el fotograma de impacto) y regresa. */
  async melee(who, { anim = "attack1", onHit, speed = 0.18, stop = 40 } = {}) {
    const a = who === "hero" ? this.hero : this.foe, b = who === "hero" ? this.foe : this.hero;
    const dir = b.x > a.x ? 1 : -1;
    const toX = b.home.x - dir * stop;
    this.play(who, "run", { fps: 16 });
    this.#trail(a, 0.22);
    await this.tween(a, { x: toX }, speed, ease.in);
    this.play(who, anim, { loop: false, fps: 14, restart: true });
    const n = a.atlas ? a.atlas.count(anim) : 6;
    await sleep((n * 0.42 / 14) * 1000);
    onHit?.();
    await sleep((n * 0.58 / 14) * 1000);
    this.play(who, "run", { fps: 14 }); a.flipBack = true;
    const f0 = a.flip; a.flip = !f0;
    await this.tween(a, { x: a.home.x }, speed * 1.3, ease.out);
    a.flip = f0;
    this.play(who, "idle");
  }
  #trail(a, dur) { a.trailUntil = this.t + dur; }

  /** Impacto: destello blanco, retroceso decelerado, chispas y polvo. */
  hit(who, { dmg = 1, knock = 10, dur = 0.3, color = "#fff6d0" } = {}) {
    const a = who === "hero" ? this.hero : this.foe;
    const dir = who === "hero" ? -1 : 1;
    a.flash = 1;
    a.offX = 0; this.tween(a, { offX: dir * knock }, dur * 0.35, ease.out).then(() => this.tween(a, { offX: 0 }, dur * 0.65, ease.inOut));
    const hgt = (a.atlas ? a.atlas.height : a.canvas ? a.canvas.height : 36) * a.scale;
    this.ps.burst(a.x + a.offX, a.y - hgt * 0.5, 26, [color, "#ffffff", "#ffd86a"], 70, { up: 40, z: hgt * 0.4 });
    this.ps.dust(a.x, a.y - 2, 5, "#8a8272");
    this.fx.shake = Math.max(this.fx.shake, Math.min(1, 0.35 + dmg / 80));
  }
  shake(a = 0.6) { this.fx.shake = Math.max(this.fx.shake, a); }
  flash(color = "#ffffff", a = 1) { this.fx.flash = a; this.fx.flashColor = color; }

  /* ---------------- escenas de ataques especiales ---------------- */
  /**
   * Ejecuta un ataque especial como una escena. `fn` recibe el director S:
   *   S.bars(true)  S.dim(0.5)  S.title("NOMBRE","subtítulo")  S.cam({x,y,zoom}, dur)  S.shake(.7)
   *   S.flash(color)  S.slowmo(0.35, 0.4)  S.wait(ms)  S.rays(color)  S.who('hero'|'foe')
   *   S.strip({atlas, anim, frames, fps, at, dx, dy, scale, flip, fxDx, hideActor})  → Promise
   *   S.travel({from, to, dur, draw})  → Promise   (proyectil / rayo)
   *   S.hit('foe'|'hero', opts)   S.burst(...)
   */
  async scene(fn, { who = "hero" } = {}) {
    const S = this.#director(who);
    this.fx.barsTarget = 1; this.fx.dimTarget = 0.55;
    await sleep(260);
    try { await fn(S); } finally {
      this.fx.barsTarget = 0; this.fx.dimTarget = 0; this.fx.title = null;
      await this.#camTo({ x: LW / 2, y: LH / 2, zoom: 1 }, 0.35);
      this.hero.visible = true; this.foe.visible = true; this.rays.length = 0;
      this.timeScale = 1;
      await sleep(180);
    }
  }
  #camTo(c, dur) { return this.tween(this.cam, { x: c.x ?? this.cam.x, y: c.y ?? this.cam.y, zoom: c.zoom ?? this.cam.zoom }, dur, ease.inOut); }

  #director(whoActs) {
    const st = this;
    const A = whoActs === "hero" ? st.hero : st.foe, B = whoActs === "hero" ? st.foe : st.hero;
    const S = {
      stage: st, actor: A, target: B, acts: whoActs,
      wait: (ms) => sleep(ms),
      bars: (on) => { st.fx.barsTarget = on ? 1 : 0; },
      dim: (a) => { st.fx.dimTarget = a; },
      title: (text, sub = "", color = "#ffd86a") => { st.fx.title = { text, sub, color, t0: st.t }; },
      cam: (c, dur = 0.4) => st.#camTo(c, dur),
      shake: (a = 0.6) => st.shake(a),
      flash: (c, a) => st.flash(c, a),
      slowmo: async (scale, secs) => { st.timeScale = scale; await sleep(secs * 1000 * scale); st.timeScale = 1; },
      rays: (color = "#fff3c0") => { st.rays.push({ color, t0: st.t, x: A.x, y: A.y - 20 }); },
      hit: (who, o) => st.hit(who, o),
      burst: (x, y, n, cols, sp, o) => st.ps.burst(x, y, n, cols, sp, o),
      ps: st.ps,
      pos: (who) => { const a = who === "hero" ? st.hero : who === "foe" ? st.foe : null; return a ? { x: a.x, y: a.y } : { x: LW / 2, y: st.hero.y }; },
      hide: (who, on = true) => { (who === "hero" ? st.hero : st.foe).visible = !on; },
      /** Tira de fotogramas de un atlas de especiales, anclada a un combatiente. */
      strip: (o) => new Promise((res) => {
        const atlas = ATLAS[o.atlas];
        if (!atlas) return res();
        const frames = o.frames || Array.from({ length: atlas.count(o.anim) }, (_, i) => i);
        const anchor = typeof o.at === "string" ? (o.at === "hero" ? st.hero : o.at === "foe" ? st.foe : A) : null;
        const s = { atlas, anim: o.anim, frames, fps: o.fps || 10, t: 0, anchor, x: o.at?.[0], y: o.at?.[1], dx: o.dx || 0, dy: o.dy || 0, scale: o.scale || 1, flip: o.flip ?? (anchor === st.foe),
          fxDx: o.fxDx ?? 12, alpha: o.alpha ?? 1, tint: o.tint, done: res, hold: o.hold || 0, onFrame: o.onFrame, lastFrame: -1, additive: !!o.additive, shadow: o.shadow !== false };
        if (o.hideActor && anchor) anchor.visible = false;
        s.restore = () => { if (o.hideActor && anchor) anchor.visible = true; };
        st.strips.push(s);
      }),
      /** Proyectil que viaja de un punto a otro (draw recibe ctx, x, y, p). */
      travel: ({ from, to, dur = 0.5, draw, trail = 6, color = "#fff3c0", arc = 0 }) => new Promise((res) => {
        const t0 = st.t;
        const proj = { t0, dur, from, to, draw, trail, color, arc, done: res };
        st.strips.push({ proj });
      }),
    };
    return S;
  }

  /* ---------------- bucle ---------------- */
  frame(ts) {
    if (!this.running) return;
    const raw = this.last ? Math.min(0.05, (ts - this.last) / 1000) : 0;
    this.last = ts;
    const dt = raw * this.timeScale;
    this.t += raw;                                     // el reloj de los tweens no se frena (usa tiempo real)
    this.#update(dt, raw);
    this.#draw(dt);
    requestAnimationFrame(this.frame);
  }

  #update(dt, raw) {
    for (const a of [this.hero, this.foe]) {
      if (a.actor) a.actor.update(dt);
      a.bobT += dt;
      a.flash = Math.max(0, a.flash - raw * 5);
    }
    this.ps.update(dt, 0); this.ps.updateRings(dt);
    for (const m of this.bg.motes) { m.y -= m.v * dt; m.x += Math.sin(this.t + m.p) * 4 * dt; if (m.y < -4) { m.y = LH + 4; m.x = Math.random() * LW; } }
    const f = this.fx;
    f.bars += (f.barsTarget - f.bars) * Math.min(1, raw * 9);
    f.dim += (f.dimTarget - f.dim) * Math.min(1, raw * 7);
    f.flash = Math.max(0, f.flash - raw * 3.2);
    f.shake = Math.max(0, f.shake - raw * 2.4);
    // tiras
    for (const s of this.strips) {
      if (s.proj) {
        const p = Math.min(1, (this.t - s.proj.t0) / s.proj.dur);
        if (p >= 1 && !s.proj.finished) { s.proj.finished = true; s.proj.done(); }
        continue;
      }
      s.t += dt * s.fps;
      const n = s.frames.length;
      const i = Math.min(n - 1, Math.floor(s.t));
      if (i !== s.lastFrame) { s.lastFrame = i; s.onFrame?.(i); }
      if (s.t >= n + s.hold * s.fps && !s.finished) { s.finished = true; s.restore(); s.done(); }
    }
    this.strips = this.strips.filter((s) => (s.proj ? !s.proj.finished || this.t - s.proj.t0 < s.proj.dur + 0.3 : !s.finished || s.t < s.frames.length + s.hold * s.fps + 0.3));
    this.rays = this.rays.filter((r) => this.t - r.t0 < 1.4);
  }

  #actorHeight(a) { return (a.atlas ? a.atlas.height : a.canvas ? a.canvas.height : 36) * a.scale; }

  #drawActor(g, a, who, t) {
    if (!a.visible) return;
    const bob = a.atlas ? 0 : Math.round(Math.sin(a.bobT * 1.6) * 1.2);
    const x = Math.round(a.x + a.offX), y = Math.round(a.y + a.offY + (a.groundOffset || 0));
    // sombra
    const w = 14 * Math.max(1, a.scale) + (a.canvas ? 10 : 0);
    g.globalAlpha = 0.35 * a.alpha; g.fillStyle = "#000";
    for (let dy = -2; dy <= 2; dy++) { const hw = Math.round(w * Math.sqrt(1 - (dy * dy) / 7.5)); g.fillRect(x - hw, y + dy, hw * 2, 1); }
    g.globalAlpha = 1;
    // estela de carga
    if (a.trailUntil > this.t && a.atlas) {
      for (let i = 1; i <= 3; i++) a.atlas.draw(g, a.actor.anim, a.actor.frameIndex(), x - (a.flip ? -1 : 1) * i * 9, y, { flip: a.flip, alpha: 0.25 / i, scale: a.scale, tint: { color: "#bfe8ff", alpha: 0.6 } });
    }
    if (a.atlas) a.actor.draw(g, x, y + bob, { flip: a.flip, flash: a.flash, alpha: a.alpha, scale: a.scale, rot: a.rot, tint: a.tint });      // reposo con fundido entre fotogramas
    else if (a.canvas) {
      g.save(); g.globalAlpha = a.alpha; g.translate(x, y + bob);
      if (a.rot) g.rotate(a.rot);
      g.drawImage(a.canvas, -a.canvas.width / 2 * a.scale, -a.canvas.height * a.scale, a.canvas.width * a.scale, a.canvas.height * a.scale);
      if (a.flash > 0) { g.globalAlpha = a.flash * a.alpha; g.globalCompositeOperation = "lighter"; g.drawImage(a.canvas, -a.canvas.width / 2 * a.scale, -a.canvas.height * a.scale, a.canvas.width * a.scale, a.canvas.height * a.scale); }
      g.restore();
      if (a.onDraw) a.onDraw(g, x, y + bob, a.canvas.height * a.scale, a);
    }
    void who; void t;
  }

  #drawStrip(g, s) {
    if (s.proj) {
      const P = s.proj, p = Math.min(1, (this.t - P.t0) / P.dur);
      const x = P.from.x + (P.to.x - P.from.x) * p, y = P.from.y + (P.to.y - P.from.y) * p - Math.sin(p * Math.PI) * P.arc;
      if (p < 1) { P.draw ? P.draw(g, x, y, p) : this.#orb(g, x, y, P.color); for (let i = 0; i < 2; i++) this.ps.spawn(x, y, 0, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 12, 0, 0.35, P.color, { additive: true, kind: 3 }); }
      return;
    }
    const i = Math.min(s.frames.length - 1, Math.floor(s.t));
    const fi = s.frames[i], f = s.atlas.frame(s.anim, fi);
    if (!f) return;
    let x, y;
    if (s.anchor) { x = s.anchor.x + s.anchor.offX + s.dx * (s.flip ? -1 : 1); y = s.anchor.y + s.dy; }
    else { x = s.x + s.dx; y = s.y + s.dy; }
    if (f.fx) x += (s.flip ? -1 : 1) * s.fxDx;
    const fade = s.finished ? Math.max(0, 1 - (s.t - s.frames.length) / 0.3) : 1;
    if (s.shadow && !f.fx) { g.globalAlpha = 0.3 * s.alpha; g.fillStyle = "#000"; g.fillRect(Math.round(x) - 8, Math.round(y) - 1, 16, 2); g.globalAlpha = 1; }
    if (s.additive) g.globalCompositeOperation = "lighter";
    s.atlas.draw(g, s.anim, fi, x, y, { flip: s.flip, scale: s.scale, alpha: s.alpha * fade, tint: s.tint });
    g.globalCompositeOperation = "source-over";
  }
  #orb(g, x, y, color) {
    const r = 9;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, "#ffffff"); gr.addColorStop(0.35, color); gr.addColorStop(1, "rgba(255,200,80,0)");
    g.globalCompositeOperation = "lighter"; g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.globalCompositeOperation = "source-over";
  }

  #draw(dt) {
    const g = this.g, c = this.canvas;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, c.width, c.height);
    g.imageSmoothingEnabled = false;
    const k = this.k;
    let shx = 0, shy = 0;
    if (this.fx.shake > 0.02) { shx = (Math.random() - 0.5) * this.fx.shake * 5; shy = (Math.random() - 0.5) * this.fx.shake * 5; }
    // cámara: transformación del mundo lógico
    const z = this.cam.zoom;
    g.setTransform(k * z, 0, 0, k * z, this.ox + (LW / 2 - this.cam.x * z) * k + shx * k, this.oy + (LH / 2 - this.cam.y * z) * k + shy * k);

    // motas ambientales (detrás)
    g.globalCompositeOperation = "lighter";
    for (const m of this.bg.motes) { g.globalAlpha = 0.25 + 0.2 * Math.sin(this.t * 2 + m.p); g.fillStyle = "#b98cff"; g.fillRect(Math.round(m.x), Math.round(m.y), 1, 1); }
    g.globalAlpha = 1; g.globalCompositeOperation = "source-over";

    // oscurecimiento del escenario (no de los actores de la escena)
    // actores y tiras ordenados por profundidad (y)
    const drawables = [];
    drawables.push({ y: this.hero.y, fn: () => this.#drawActor(g, this.hero, "hero", dt) });
    drawables.push({ y: this.foe.y, fn: () => this.#drawActor(g, this.foe, "foe", dt) });
    for (const s of this.strips) drawables.push({ y: (s.anchor ? s.anchor.y : s.y || 130) + 1, fn: () => this.#drawStrip(g, s) });
    drawables.sort((a, b) => a.y - b.y);
    for (const d of drawables) d.fn();

    this.ps.draw(g, { x: -20, y: -20, w: LW + 40, h: LH + 40 }, false);
    this.ps.drawRings(g);
    this.ps.draw(g, { x: -20, y: -20, w: LW + 40, h: LH + 40 }, true);

    // rayos de luz de la escena
    for (const r of this.rays) {
      const p = (this.t - r.t0) / 1.4, a = Math.sin(Math.min(1, p) * Math.PI) * 0.5;
      g.globalCompositeOperation = "lighter"; g.globalAlpha = a; g.fillStyle = r.color;
      for (let i = 0; i < 9; i++) {
        const ang = (i / 9) * Math.PI * 2 + this.t * 0.4, len = 120;
        g.beginPath(); g.moveTo(r.x, r.y); g.lineTo(r.x + Math.cos(ang - 0.05) * len, r.y + Math.sin(ang - 0.05) * len); g.lineTo(r.x + Math.cos(ang + 0.05) * len, r.y + Math.sin(ang + 0.05) * len); g.closePath(); g.fill();
      }
      g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
    }

    // anclas DOM para los efectos antiguos y los números de daño
    if (this.onAnchor) { this.onAnchor("hero", this.screenPos("hero")); this.onAnchor("foe", this.screenPos("foe")); }

    // ---- overlays a pantalla completa ----
    g.setTransform(1, 0, 0, 1, 0, 0);
    const f = this.fx;
    if (f.dim > 0.01) {                               // viñeta oscura que deja ver a los actores (se dibuja DEBAJO con 'destination-over')
      g.globalCompositeOperation = "destination-over";
      g.fillStyle = `rgba(4,2,12,${f.dim})`; g.fillRect(0, 0, c.width, c.height);
      g.globalCompositeOperation = "source-over";
    }
    if (f.bars > 0.01) {
      const bh = Math.round(c.height * 0.11 * f.bars);
      g.fillStyle = "#000"; g.fillRect(0, 0, c.width, bh); g.fillRect(0, c.height - bh, c.width, bh);
    }
    if (f.title) {
      const p = Math.min(1, (this.t - f.title.t0) / 0.5), out = Math.max(0, 1 - (this.t - f.title.t0 - 1.7) / 0.4);
      const a = Math.min(p, out);
      if (a > 0) {
        const fs = Math.round(c.height * 0.045);
        g.globalAlpha = a; g.textAlign = "center";
        g.font = `${fs}px "Press Start 2P", monospace`;
        g.fillStyle = "#000"; g.fillText(f.title.text, c.width / 2 + 3, c.height * 0.2 + 3);
        g.shadowColor = f.title.color; g.shadowBlur = 18; g.fillStyle = f.title.color; g.fillText(f.title.text, c.width / 2 - (1 - p) * 40, c.height * 0.2); g.shadowBlur = 0;
        g.font = `${Math.round(fs * 0.5)}px "Press Start 2P", monospace`; g.fillStyle = "#fff6d0";
        g.fillText(f.title.sub, c.width / 2 + (1 - p) * 40, c.height * 0.2 + fs * 1.2);
        g.globalAlpha = 1;
      }
    }
    if (f.flash > 0.01) { g.globalAlpha = Math.min(1, f.flash); g.fillStyle = f.flashColor; g.fillRect(0, 0, c.width, c.height); g.globalAlpha = 1; }
  }
}
