/**
 * Atlas · hojas de sprites recortadas (assets/sprites/<id>.png + .json)
 * ---------------------------------------------------------------------
 * Las hojas de personajes se procesan con tools/slice_sheets.py: se quita el fondo de papel,
 * se recorta cada fotograma y se empaqueta en un atlas con su punto de anclaje (los pies).
 *
 *   loadAtlas(id)               carga y cachea un atlas (imagen + meta)
 *   atlas.draw(ctx, anim, i, x, y, opts)   dibuja el fotograma i anclado por los pies en (x, y)
 *       opts: { flip, alpha, scale, flash (0..1 blanco), tint:{color,alpha}, rot }
 *   atlas.count(anim) / atlas.has(anim)
 *
 * Además, AtlasActor lleva la cuenta del tiempo de animación (bucle o disparo único).
 */

const cache = new Map();

export class Atlas {
  constructor(id, img, meta) {
    this.id = id; this.img = img; this.meta = meta; this.anims = meta.anims;
    this.height = meta.height;
    this.px = meta.px || 1;                                    // píxeles del atlas por píxel de juego (>1: alta resolución, se dibuja suavizado)
    this._white = null;
    this._tints = new Map();
  }
  has(anim) { return !!this.anims[anim]; }
  count(anim) { return this.anims[anim]?.length || 0; }
  frame(anim, i) { const a = this.anims[anim]; return a ? a[((i % a.length) + a.length) % a.length] : null; }

  #white() {
    if (!this._white) {
      const c = document.createElement("canvas");
      c.width = this.img.width; c.height = this.img.height;
      const x = c.getContext("2d");
      x.drawImage(this.img, 0, 0);
      x.globalCompositeOperation = "source-in";
      x.fillStyle = "#ffffff";
      x.fillRect(0, 0, c.width, c.height);
      this._white = c;
    }
    return this._white;
  }
  #tinted(color) {
    let c = this._tints.get(color);
    if (!c) {
      c = document.createElement("canvas");
      c.width = this.img.width; c.height = this.img.height;
      const x = c.getContext("2d");
      x.drawImage(this.img, 0, 0);
      x.globalCompositeOperation = "source-in";
      x.fillStyle = color;
      x.fillRect(0, 0, c.width, c.height);
      this._tints.set(color, c);
    }
    return c;
  }

  /**
   * Secuencia de reposo estable: agrupa los fotogramas de `idle` por parecido de silueta (el más "central" y
   * sus vecinos forman la base; los diferentes —agacharse, gruñir, brazos abajo— son la ráfaga rara).
   */
  idleSeq(anim = "idle") {
    const key = "_seq_" + anim;
    if (this[key]) return this[key];
    const fr = this.anims[anim] || [], n = fr.length;
    if (n <= 2) return (this[key] = { base: fr.map((_, i) => i), rare: [] });
    const G = 14, sig = [];
    const cv = document.createElement("canvas"); cv.width = this.img.width; cv.height = this.img.height;
    let ctx = null;
    try { ctx = cv.getContext("2d", { willReadFrequently: true }); ctx.drawImage(this.img, 0, 0); } catch { ctx = null; }
    const maxW = Math.max(...fr.map((f) => f.w)), maxH = Math.max(...fr.map((f) => f.h));
    for (const f of fr) {
      const s = new Float32Array(G * G);
      if (ctx) {
        const g2 = document.createElement("canvas"); g2.width = G; g2.height = G;
        const x2 = g2.getContext("2d", { willReadFrequently: true });
        x2.imageSmoothingEnabled = true;
        // alineado por los pies en un lienzo común (maxW × maxH)
        x2.drawImage(this.img, f.x, f.y, f.w, f.h, ((maxW / 2 - f.ax) / maxW) * G, ((maxH - f.ay) / maxH) * G, (f.w / maxW) * G, (f.h / maxH) * G);
        const d = x2.getImageData(0, 0, G, G).data;
        for (let k = 0; k < G * G; k++) s[k] = d[k * 4 + 3] / 255;
      }
      sig.push(s);
    }
    const dist = (a, b) => { let t = 0; for (let k = 0; k < a.length; k++) t += Math.abs(a[k] - b[k]); return t; };
    const tot = sig.map((a, i) => sig.reduce((acc, b, j) => acc + (i === j ? 0 : dist(a, b)), 0));
    const med = tot.indexOf(Math.min(...tot));
    const dm = sig.map((a, i) => (i === med ? 0 : dist(a, sig[med])));
    const sorted = dm.slice().sort((a, b) => a - b), cut = Math.max(sorted[Math.floor(n / 2)] * 2.1, 1e-3);
    const base = [], rare = [];
    dm.forEach((d, i) => (d <= cut ? base : rare).push(i));
    if (base.length < 3) return (this[key] = { base: fr.map((_, i) => i), rare: [] });
    return (this[key] = { base, rare });
  }

  /** Pose de reposo en el instante `time` (s): fotogramas i→j con mezcla b (ping-pong suave + gesto raro cada ~11 s). */
  idlePose(time, fps = 4.2, anim = "idle") {
    const S = this.idleSeq(anim), base = S.base;
    const pp = (arr, k) => { const n = arr.length; if (n === 1) return arr[0]; const m = 2 * (n - 1); const r = ((k % m) + m) % m; return arr[r < n ? r : m - r]; };
    const sm = (u) => u * u * (3 - 2 * u);
    let P = 11 + (this.id.length % 5) * 1.3;
    const rareLen = S.rare.length ? S.rare.length * 0.55 + 1.0 : 0;
    const ph = time % P;
    if (rareLen && ph > P - rareLen) {                               // gesto raro: base → raros → base
      const seq = [base[0], ...S.rare, base[0]], f = ((ph - (P - rareLen)) / rareLen) * (seq.length - 1);
      const k = Math.min(seq.length - 2, Math.floor(f));
      return { i: seq[k], j: seq[k + 1], b: sm(f - k) };
    }
    const f = time * fps, k = Math.floor(f);
    return { i: pp(base, k), j: pp(base, k + 1), b: sm(f - k) };
  }

  /** Mezcla (fundido) de dos fotogramas: movimiento suave con pocos dibujos. */
  drawBlend(ctx, anim, i, j, b, x, y, o = {}) {
    const r = this.draw(ctx, anim, i, x, y, o);
    if (b > 0.03 && j !== i) this.draw(ctx, anim, j, x, y, { ...o, alpha: (o.alpha ?? 1) * b, flash: 0 });
    return r;
  }

  /** Dibuja anclado por los pies. `x` es el centro de los pies, `y` el suelo. */
  draw(ctx, anim, i, x, y, o = {}) {
    const f = this.frame(anim, i);
    if (!f) return null;
    const s = (o.scale || 1) / this.px, w = f.w * s, h = f.h * s;
    const xr = Math.round(x), yr = Math.round(y);
    const py = Math.round(y - f.ay * s);
    const prevA = ctx.globalAlpha;
    const A = o.alpha ?? 1;
    ctx.save();
    if (this.px > 1) { ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high"; }
    ctx.translate(xr, 0);                                       // el origen local x=0 es el ancla horizontal
    if (o.rot) { ctx.translate(0, yr); ctx.rotate(o.rot); ctx.translate(0, -yr); }
    if (o.flip) ctx.scale(-1, 1);
    const dx = Math.round(-f.ax * s);
    ctx.globalAlpha = prevA * A;
    ctx.drawImage(this.img, f.x, f.y, f.w, f.h, dx, py, w, h);
    if (o.tint) { ctx.globalAlpha = prevA * A * o.tint.alpha; ctx.drawImage(this.#tinted(o.tint.color), f.x, f.y, f.w, f.h, dx, py, w, h); }
    if (o.flash > 0) { ctx.globalAlpha = prevA * A * Math.min(1, o.flash); ctx.drawImage(this.#white(), f.x, f.y, f.w, f.h, dx, py, w, h); }
    ctx.restore();
    ctx.globalAlpha = prevA;
    return { x: xr + (o.flip ? -(w + dx) : dx), y: py, w, h };
  }
}

export function loadAtlas(id, base = "assets/sprites/") {
  if (cache.has(id)) return cache.get(id);
  const p = (async () => {
    const [img, meta] = await Promise.all([
      new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error("atlas " + id)); im.src = `${base}${id}.png`; }),
      fetch(`${base}${id}.json`).then((r) => r.json()),
    ]);
    return new Atlas(id, img, meta);
  })();
  cache.set(id, p);
  return p;
}

export const ATLAS = {};                                  // atlas ya cargados por id (síncrono tras preload)
export async function preloadAtlases(ids) {
  await Promise.all(ids.map(async (id) => { try { ATLAS[id] = await loadAtlas(id); } catch (e) { console.warn("sin atlas", id); } }));
}

/**
 * AtlasActor · reloj de animación de un personaje.
 *   play(anim, {loop, fps, hold})   cambia de animación (no reinicia si es la misma y ya está en bucle)
 *   frameIndex()                    fotograma actual
 *   finished                        true cuando un disparo único terminó
 */
export class AtlasActor {
  constructor(atlas, fps = 10) {
    this.seed = Math.random() * 30;
    this.atlas = atlas; this.anim = "idle"; this.t = Math.random() * 3; this.fps = fps; this.loop = true; this.finished = false; this.speed = 1;
  }
  play(anim, { loop = true, fps = null, restart = false, speed = 1 } = {}) {
    if (!this.atlas.has(anim)) anim = "idle";
    if (this.anim === anim && !restart && this.loop === loop) { this.speed = speed; return; }
    this.anim = anim; this.loop = loop; this.t = 0; this.finished = false; this.speed = speed;
    if (fps) this.fps = fps;
  }
  update(dt) { this.t += dt * this.fps * this.speed; if (!this.loop) { const n = this.atlas.count(this.anim); if (this.t >= n) { this.t = n - 0.001; this.finished = true; } } }
  frameIndex() { const n = this.atlas.count(this.anim); return n ? (this.loop ? Math.floor(this.t) % n : Math.min(n - 1, Math.floor(this.t))) : 0; }
  draw(ctx, x, y, o = {}) {
    if (this.anim === "idle" && this.loop && this.atlas.count("idle") > 2) {          // reposo: pingpong suave con fundido
      const p = this.atlas.idlePose(this.t / Math.max(1, this.fps) + this.seed, 4.2);
      const breath = 1 + Math.sin((this.t / Math.max(1, this.fps) + this.seed) * 2.0) * 0.012;
      ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(1, breath); ctx.translate(-Math.round(x), -Math.round(y));
      const r = this.atlas.drawBlend(ctx, "idle", p.i, p.j, p.b, x, y, o);
      ctx.restore();
      return r;
    }
    return this.atlas.draw(ctx, this.anim, this.frameIndex(), x, y, o);
  }
}
