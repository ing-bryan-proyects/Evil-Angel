/**
 * IntroCinematic · la historia de Abel en 8 escenas animadas
 * ----------------------------------------------------------
 * Un lienzo lógico de 320×180 (píxel art, ampliado con nearest-neighbor) donde se dibujan
 * escenas con paralaje, partículas y los atlas de personajes del juego. Debajo, subtítulos
 * bilingües (inglés grande · español pequeño) con efecto de máquina de escribir.
 *
 *   1 Las puertas del alba      5 La caída (siete noches)
 *   2 La pregunta prohibida     6 El impacto
 *   3 El Consejo de los Siete   7 El despertar en el bosque
 *   4 Las alas rotas            8 La elección (y el título)
 *
 *   const cine = new IntroCinematic({ host, atlas: ATLAS, fx: (name) => {}, onDone });
 *   cine.start();   cine.skip();   cine.seek(sceneIndex, seconds)   // seek: solo para pruebas
 */
import { ParticleSystem, KIND } from "../graphics/ParticleSystem.js";
import { drawWings, WING_GOLD, WING_DULL } from "../graphics/Wings.js";

const W = 320, H = 180, TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
const easeOut = (t) => { t = clamp(t); return 1 - (1 - t) ** 3; };
const easeIn = (t) => { t = clamp(t); return t * t * t; };
const seg = (t, a, b) => clamp((t - a) / (b - a));           // progreso de t dentro de [a,b]

function rng(seed) {
  return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixc = (a, b, t) => { const A = hex(a), B = hex(b); return `rgb(${Math.round(lerp(A[0], B[0], t))},${Math.round(lerp(A[1], B[1], t))},${Math.round(lerp(A[2], B[2], t))})`; };
function stopsAt(stops, p) {
  p = clamp(p);
  for (let i = 1; i < stops.length; i++) if (p <= stops[i][0]) return mixc(stops[i - 1][1], stops[i][1], (p - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0] || 1));
  return mixc(stops[stops.length - 1][1], stops[stops.length - 1][1], 0);
}
/** Cielo en bandas de 3 px (aspecto de píxel art). */
function bandSky(c, stops, y0 = 0, y1 = H, step = 3) {
  for (let y = y0; y < y1; y += step) { c.fillStyle = stopsAt(stops, (y - y0) / (y1 - y0)); c.fillRect(0, y, W, step + 1); }
}
const mk = (w, h) => { const cv = document.createElement("canvas"); cv.width = w; cv.height = h; const g = cv.getContext("2d"); g.imageSmoothingEnabled = false; return [cv, g]; };

/* ---------------- Tiras pre-dibujadas (nubes, árboles) ---------------- */
function cloudStrip(seed, top, bot, n = 14, w = 480, h = 56) {
  const r = rng(seed), [cv, g] = mk(w, h);
  for (let i = 0; i < n; i++) {
    const cx = r() * w, cy = h * 0.5 + (r() - 0.5) * h * 0.4, rw = 18 + r() * 34, rh = 5 + r() * 9;
    for (const ox of [-w, 0, w]) for (let y = -rh; y <= rh; y += 2) {
      const f = Math.sqrt(1 - (y / rh) ** 2), hw = rw * f;
      g.fillStyle = y < -rh * 0.2 ? top : bot;
      g.fillRect(Math.round(cx + ox - hw), Math.round(cy + y), Math.round(hw * 2), 2);
    }
  }
  return cv;
}
function treeStrip(seed, color, minH, maxH, rim = null, w = 480) {
  const r = rng(seed), [cv, g] = mk(w, maxH + 6);
  let x = -10;
  while (x < w + 10) {
    const h = minH + r() * (maxH - minH), tw = 10 + r() * 12, round = r() < 0.3;
    for (const ox of [-w, 0, w]) {
      g.fillStyle = color;
      g.fillRect(Math.round(x + ox - 1), cv.height - 8, 2, 8);
      if (round) { for (let y = 0; y < h * 0.7; y += 2) { const f = Math.sin((y / (h * 0.7)) * Math.PI) ** 0.7; g.fillRect(Math.round(x + ox - tw * f * 0.7), cv.height - h + y, Math.round(tw * f * 1.4), 2); } }
      else { for (let y = 0; y < h; y += 2) { const f = (y / h) * 0.5 + 0.08; g.fillRect(Math.round(x + ox - tw * f), cv.height - h + y, Math.round(tw * f * 2), 2); } }
      if (rim) { g.fillStyle = rim; g.fillRect(Math.round(x + ox - 1), cv.height - h, 2, 2); }
    }
    x += tw * (0.55 + r() * 0.5);
  }
  return cv;
}
function drawStrip(c, strip, x, y, alpha = 1) {
  const w = strip.width, ox = ((x % w) + w) % w;
  c.globalAlpha = alpha;
  c.drawImage(strip, -ox, y); c.drawImage(strip, w - ox, y);
  if (w - ox < W) c.drawImage(strip, 2 * w - ox, y);
  c.globalAlpha = 1;
}

/* ---------------- Figura del Consejo ---------------- */
function drawElder(c, x, y, h, t, i, lit) {
  const sway = Math.sin(t * 1.3 + i) * 0.8;
  c.fillStyle = "#1a1230";                                           // alas plegadas
  for (const s of [-1, 1]) {
    c.beginPath(); c.moveTo(x + s * 3, y - h * 0.78); c.quadraticCurveTo(x + s * h * 0.46, y - h * 0.9, x + s * h * 0.26 + sway, y - h * 0.04); c.lineTo(x + s * 2, y - h * 0.2); c.closePath(); c.fill();
    c.strokeStyle = "#3a2a5e"; c.lineWidth = 0.7;
    for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(x + s * 4, y - h * (0.75 - k * 0.12)); c.lineTo(x + s * h * (0.1 + k * 0.05) + sway * (k / 3), y - h * (0.2 - k * 0.02)); c.stroke(); }
  }
  c.fillStyle = "#2a1f4a";                                           // túnica
  c.beginPath(); c.moveTo(x - h * 0.1, y - h * 0.76); c.lineTo(x + h * 0.1, y - h * 0.76); c.lineTo(x + h * 0.21 + sway * 0.4, y); c.lineTo(x - h * 0.21 + sway * 0.4, y); c.closePath(); c.fill();
  c.fillStyle = "#4a3a7a"; c.fillRect(Math.round(x - h * 0.02), Math.round(y - h * 0.7), 1, Math.round(h * 0.68));      // pliegue iluminado
  c.fillStyle = "#e3b341"; c.fillRect(Math.round(x - h * 0.1), Math.round(y - h * 0.5), Math.round(h * 0.2), 1);        // cinturón
  c.fillStyle = "#150f2a"; c.beginPath(); c.arc(x, y - h * 0.8, h * 0.105, Math.PI * 0.95, Math.PI * 0.05 + TAU); c.lineTo(x + h * 0.08, y - h * 0.72); c.lineTo(x - h * 0.08, y - h * 0.72); c.closePath(); c.fill();   // capucha
  c.fillStyle = "#050308"; c.fillRect(Math.round(x - h * 0.06), Math.round(y - h * 0.82), Math.round(h * 0.12), Math.round(h * 0.09));        // rostro en sombra
  c.fillStyle = lit ? "#ff5a4a" : "#dff4ff";                                                                                       // ojos
  c.fillRect(Math.round(x - h * 0.04), Math.round(y - h * 0.79), 2, 1); c.fillRect(Math.round(x + h * 0.02), Math.round(y - h * 0.79), 2, 1);
  c.strokeStyle = "#e3b341"; c.lineWidth = 1;                                                                                      // halo
  c.beginPath(); c.ellipse(x, y - h * 0.97, h * 0.13, h * 0.04, 0, 0, TAU); c.stroke();
}

/* ======================================================================
   Escenas
   ====================================================================== */
const SCENES = [
  { chapter: "I · THE GATES OF DAWN", dur: 9.5,
    en: "There was a time when Abel guarded the gates of dawn, the most radiant among the angels of the Celestial Choir.",
    es: "Hubo un tiempo en que Abel custodiaba las puertas del alba, el más luminoso entre los ángeles del Coro Celeste." },
  { chapter: "II · THE FORBIDDEN QUESTION", dur: 7.5,
    en: "But a forbidden question took root in his heart: why must the light obey without question?",
    es: "Pero una pregunta prohibida germinó en su corazón: ¿por qué la luz debe obedecer sin preguntar?" },
  { chapter: "III · THE COUNCIL OF SEVEN", dur: 8.5,
    en: "For daring to doubt, the Council of Seven branded him a traitor.",
    es: "Por atreverse a dudar, el Consejo de los Siete lo juzgó traidor." },
  { chapter: "IV · BROKEN WINGS", dur: 8,
    en: "His wings were broken, and his name was erased from the eternal hymns.",
    es: "Sus alas fueron quebradas y su nombre, borrado de los cantos eternos." },
  { chapter: "V · SEVEN NIGHTS", dur: 9,
    en: "Abel fell for seven nights, burning like a wounded star...",
    es: "Abel cayó durante siete noches, ardiendo como una estrella herida..." },
  { chapter: "VI · THE CRASH", dur: 7,
    en: "...until he crashed into the heart of the Whispering Forest, where the trees remember every sin.",
    es: "...hasta estrellarse en el corazón del Whispering Forest, donde los árboles recuerdan cada pecado." },
  { chapter: "VII · THE AWAKENING", dur: 9.5,
    en: "There, among ancient roots and a mist of ash, something awoke beside him... a darkness that already knew his name.",
    es: "Allí, entre raíces antiguas y niebla de ceniza, algo despertó junto a él... una oscuridad que ya conocía su nombre." },
  { chapter: "VIII · THE CHOICE", dur: 10,
    en: "Now Abel must choose: reclaim his lost grace... or embrace the power that whispers to him from the gloom.",
    es: "Ahora Abel debe elegir: recuperar la gracia perdida... o abrazar el poder que le susurra desde la penumbra." },
];

export class IntroCinematic {
  constructor({ host, atlas, fx = () => {}, onDone = () => {}, lang = "both" }) {
    this.host = host; this.atlas = atlas; this.fx = fx; this.onDone = onDone;
    this.cv = document.createElement("canvas");
    this.cv.width = W; this.cv.height = H; this.cv.id = "cine-canvas";
    this.c = this.cv.getContext("2d"); this.c.imageSmoothingEnabled = false;
    this.cap = document.createElement("div"); this.cap.id = "cine-cap";
    this.cap.innerHTML = `<div class="cc-chapter"></div><div class="cc-en"></div><div class="cc-es"></div><div class="cc-dots"></div>`;
    this.capChapter = this.cap.querySelector(".cc-chapter"); this.capEn = this.cap.querySelector(".cc-en"); this.capEs = this.cap.querySelector(".cc-es");
    this.dots = this.cap.querySelector(".cc-dots");
    this.dots.innerHTML = SCENES.map(() => "<i></i>").join("");
    host.append(this.cv, this.cap);
    host.classList.add("cine");
    this.ps = new ParticleSystem(1800);
    this.scene = 0; this.t = 0; this.global = 0; this.running = false; this.done = false;
    this.shakeT = 0; this.shakeA = 0; this.flashA = 0; this.flashCol = "#fff";
    this.fired = new Set();
    this.assets = {
      clouds: [cloudStrip(11, "#fff0d0", "#f0a888"), cloudStrip(12, "#ffd9a8", "#c8708a"), cloudStrip(13, "#a85a7a", "#5a3a6a")],
      night: [cloudStrip(21, "#4a4a7a", "#2a2850"), cloudStrip(22, "#2e2a58", "#1a1838")],
      trees: [treeStrip(31, "#06100c", 40, 80, "#0c1c16"), treeStrip(32, "#0a1812", 30, 56, "#122820"), treeStrip(33, "#102418", 22, 40, "#1c3a2a")],
      stars: this.#stars(),
    };
    this.onVis = () => { this.last = performance.now(); };
    document.addEventListener("visibilitychange", this.onVis);
  }

  #stars() {
    const r = rng(7), [cv, g] = mk(W, 110);
    for (let i = 0; i < 90; i++) { g.fillStyle = r() < 0.2 ? "#ffffff" : "#8a9ac8"; g.fillRect((r() * W) | 0, (r() * 110) | 0, 1, 1); }
    return cv;
  }

  start() {
    this.running = true; this.last = performance.now();
    this.#enter(0);
    const loop = (now) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
      this.#tick(dt);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  /** Salta a una escena (pruebas). */
  seek(i, t = 0) { this.#enter(i); this.t = t; this.fired.clear(); }

  skip() { if (this.done) return; this.#finish(); }

  #enter(i) {
    this.scene = i; this.t = 0; this.fired.clear(); this.ps.clear();
    const s = SCENES[i];
    this.capChapter.textContent = s.chapter;
    this.capEn.textContent = ""; this.capEs.textContent = ""; this.capEs.style.opacity = 0;
    [...this.dots.children].forEach((d, k) => d.className = k < i ? "on" : k === i ? "now" : "");
    this.shakeA = 0; this.flashA = 0;
  }

  #finish() {
    if (this.done) return;
    this.done = true; this.running = false;
    cancelAnimationFrame(this.raf);
    document.removeEventListener("visibilitychange", this.onVis);
    this.onDone();
  }

  destroy() { this.running = false; cancelAnimationFrame(this.raf); document.removeEventListener("visibilitychange", this.onVis); this.cv.remove(); this.cap.remove(); this.host.classList.remove("cine"); }

  #once(key, at, fn) { if (this.t >= at && !this.fired.has(key)) { this.fired.add(key); fn(); } }
  #shake(a, d = 0.6) { this.shakeA = a; this.shakeT = d; this.shakeD = d; }
  #flash(a = 1, col = "#ffffff") { this.flashA = a; this.flashCol = col; }

  #tick(dt) {
    const s = SCENES[this.scene];
    this.t += dt; this.global += dt;
    this.ps.update(dt, 0); this.ps.updateRings(dt);
    if (this.shakeT > 0) this.shakeT -= dt;
    this.flashA = Math.max(0, this.flashA - dt * 1.6);
    if (this.t >= s.dur) {
      if (this.scene >= SCENES.length - 1) { this.#finish(); return; }
      this.#enter(this.scene + 1);
    }
    this.#caption(SCENES[this.scene]);
    this.#render();
  }

  #caption(s) {
    const p = seg(this.t, 0.8, s.dur * 0.62);
    const n = Math.floor(s.en.length * p);
    if (this.capEn.textContent.length !== n) this.capEn.textContent = s.en.slice(0, n);
    if (this.capEs.textContent !== s.es) this.capEs.textContent = s.es;
    this.capEs.style.opacity = clamp(seg(this.t, s.dur * 0.2, s.dur * 0.5));
    const fade = Math.min(seg(this.t, 0, 0.5), 1 - seg(this.t, s.dur - 0.5, s.dur));
    this.cap.style.opacity = fade;
  }

  /* ---------------- Utilidades de dibujo ---------------- */
  #abel(anim, x, y, o = {}) {
    const a = this.atlas.abel; if (!a) return;
    const n = a.count(anim) || 1, fps = o.fps || 8;
    a.draw(this.c, anim, Math.floor(this.t * fps), x, y, o);
  }
  #char(id, anim, x, y, o = {}) {
    const a = this.atlas[id]; if (!a) return;
    const n = a.count(anim) || 1;
    a.draw(this.c, anim, Math.floor((this.t + (o.off || 0)) * (o.fps || 8)), x, y, o);
  }
  #ground(y, c1, c2) { const c = this.c; c.fillStyle = c1; c.fillRect(0, y, W, H - y); c.fillStyle = c2; for (let x = 0; x < W; x += 6) c.fillRect(x, y, 3, 1); }
  #vignette(a = 0.6) {
    const c = this.c, g = c.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(0,0,0,${a})`);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
  #rays(x, y, t, col, n = 12, len = 260, alpha = 0.12, spin = 0.12) {
    const c = this.c; c.globalCompositeOperation = "lighter"; c.fillStyle = col; c.globalAlpha = alpha;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + t * spin, w = 0.05 + 0.02 * Math.sin(t + i);
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a - w) * len, y + Math.sin(a - w) * len); c.lineTo(x + Math.cos(a + w) * len, y + Math.sin(a + w) * len); c.closePath(); c.fill();
    }
    c.globalAlpha = 1; c.globalCompositeOperation = "source-over";
  }
  #glow(x, y, r, col, a = 0.5) {
    const c = this.c, g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col); g.addColorStop(1, "rgba(0,0,0,0)");
    c.globalCompositeOperation = "lighter"; c.globalAlpha = a; c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
    c.globalAlpha = 1; c.globalCompositeOperation = "source-over";
  }
  #text(txt, x, y, size, col, a = 1, align = "center") {
    const c = this.c; c.save(); c.globalAlpha = a; c.font = `${size}px "Press Start 2P", monospace`; c.textAlign = align; c.textBaseline = "middle";
    c.fillStyle = "#000"; c.fillText(txt, x + 1, y + 1); c.fillStyle = col; c.fillText(txt, x, y); c.restore();
  }
  #feathers(x, y, n, spread = 30, cols = ["#fff6d0", "#ffe9a0", "#ffffff"]) {
    for (let i = 0; i < n; i++) this.ps.spawn(x + (Math.random() - 0.5) * spread, y + (Math.random() - 0.5) * 10, 60 + Math.random() * 30,
      (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 10, 20 + Math.random() * 30, 2 + Math.random() * 2.5, cols[(Math.random() * cols.length) | 0],
      { kind: KIND.LEAF, grav: 14, drag: 1.1, flutter: 14 + Math.random() * 10, size: 1 });
  }
  #particles() {
    const view = { x: 0, y: 0, w: W, h: H };
    this.ps.draw(this.c, view, false); this.ps.draw(this.c, view, true); this.ps.drawRings(this.c);
  }

  /* ---------------- Render principal ---------------- */
  #render() {
    const c = this.c, sc = SCENES[this.scene], t = this.t, k = t / sc.dur;
    c.save();
    c.imageSmoothingEnabled = false;
    c.fillStyle = "#000"; c.fillRect(0, 0, W, H);
    // temblor de cámara
    if (this.shakeT > 0) { const m = (this.shakeT / (this.shakeD || 1)) * this.shakeA; c.translate(Math.round((Math.random() - 0.5) * m * 2), Math.round((Math.random() - 0.5) * m * 2)); }
    [this.#s1, this.#s2, this.#s3, this.#s4, this.#s5, this.#s6, this.#s7, this.#s8][this.scene].call(this, c, t, k);
    c.restore();
    if (this.flashA > 0) { c.globalAlpha = Math.min(1, this.flashA); c.fillStyle = this.flashCol; c.fillRect(0, 0, W, H); c.globalAlpha = 1; }
    // entrada y salida en negro
    const f = Math.min(seg(t, 0, 0.7), 1 - seg(t, sc.dur - 0.6, sc.dur));
    if (f < 1) { c.globalAlpha = 1 - f; c.fillStyle = "#000"; c.fillRect(0, 0, W, H); c.globalAlpha = 1; }
  }

  /* ---------- 1 · Las puertas del alba ---------- */
  #s1(c, t, k) {
    const zoom = 1 + k * 0.1;
    c.save(); c.translate(W / 2, 112); c.scale(zoom, zoom); c.translate(-W / 2, -112);
    bandSky(c, [[0, "#3a3070"], [0.35, "#c8607a"], [0.7, "#ffb070"], [1, "#ffe6a0"]], 0, 150);
    this.#glow(160, 100, 120, "#ffdc90", 0.7);
    this.#rays(160, 100, t, "#fff0b0", 14, 320, 0.1);
    c.fillStyle = "#fff6c8"; c.beginPath(); c.arc(160, 100, 30, 0, TAU); c.fill();              // sol
    c.fillStyle = "#ffe08a"; c.beginPath(); c.arc(160, 100, 24, 0, TAU); c.fill();
    drawStrip(c, this.assets.clouds[2], t * 3, 70, 0.55);
    drawStrip(c, this.assets.clouds[1], t * 6, 92, 0.8);
    // la Puerta del Alba: aro dorado con runas giratorias
    c.save(); c.translate(160, 92); c.scale(1, 1);
    c.strokeStyle = "#e3b341"; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 66, 0, TAU); c.stroke();
    c.strokeStyle = "#fbe7a1"; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, 61, 0, TAU); c.stroke();
    c.rotate(t * 0.15); c.fillStyle = "#fff6d0";
    for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU; c.fillRect(Math.round(Math.cos(a) * 63.5) - 1, Math.round(Math.sin(a) * 63.5) - 1, i % 3 ? 2 : 3, i % 3 ? 2 : 3); }
    c.restore();
    // pilares de mármol
    for (const px of [62, 258]) {
      c.fillStyle = "#e8dcc0"; c.fillRect(px - 9, 36, 18, 112); c.fillStyle = "#c8b890"; c.fillRect(px + 3, 36, 6, 112); c.fillStyle = "#fff6e0"; c.fillRect(px - 9, 36, 3, 112);
      c.fillStyle = "#d8a84a"; c.fillRect(px - 12, 32, 24, 6); c.fillRect(px - 12, 146, 24, 6);
      c.fillStyle = "#b8a878"; for (let y = 44; y < 140; y += 8) c.fillRect(px - 5, y, 1, 5);
    }
    // plataforma y escalones
    c.fillStyle = "#f4ead0"; c.fillRect(0, 150, W, 30); c.fillStyle = "#d8c8a0"; c.fillRect(0, 150, W, 2); c.fillStyle = "#c8b890"; c.fillRect(0, 160, W, 2); c.fillRect(0, 172, W, 2);
    c.restore();
    drawStrip(c, this.assets.clouds[0], t * 10, 146, 0.9);
    // Abel con las alas desplegadas, de guardia
    const flap = 0.5 + 0.18 * Math.sin(t * 2.2);
    c.save(); c.translate(0, 0);
    this.#glow(160, 108, 46, "#ffe9a0", 0.35);
    drawWings(c, 160, 102, 1, flap, 64);
    this.#abel("idle", 160, 150, { scale: 2, fps: 7 });
    c.restore();
    if (Math.random() < 0.18) this.#feathers(160, 100, 1, 120);
    this.#particles();
    this.#vignette(0.45);
  }

  /* ---------- 2 · La pregunta prohibida ---------- */
  #s2(c, t, k) {
    const dark = smooth(k);
    bandSky(c, [[0, mixc("#2a2060", "#0a0614", dark)], [0.5, mixc("#a8506a", "#2a1030", dark)], [1, mixc("#ffc080", "#4a1a24", dark)]], 0, 160);
    drawStrip(c, this.assets.clouds[2], t * 4, 90, 0.5 * (1 - dark * 0.6));
    drawStrip(c, this.assets.clouds[1], t * 7, 110, 0.7 * (1 - dark * 0.6));
    c.fillStyle = mixc("#f4ead0", "#2a2030", dark * 0.7); c.fillRect(0, 150, W, 30);
    const zoom = lerp(1.0, 1.18, smooth(k)); c.save(); c.translate(160, 150); c.scale(zoom, zoom); c.translate(-160, -150);
    drawWings(c, 160, 102, 0.9, 0.35 + 0.1 * Math.sin(t * 1.6), 54, WING_DULL);
    this.#abel("idle", 160, 150, { scale: 2, fps: 7, tint: { color: "#2a1030", alpha: dark * 0.45 } });
    c.restore();
    // el signo de interrogación nace sobre su cabeza y se expande en ondas
    const p = seg(t, 1.2, 3.2);
    if (p > 0) {
      const y = 38 - Math.sin(t * 2) * 2 - easeOut(p) * 4;
      this.#glow(160, y + 4, 36 * easeOut(p), "#ffd86a", 0.6);
      this.#text("?", 160, y, 34, "#fff0b0", easeOut(p));
      if (Math.random() < 0.06 + 0.1 * p) this.ps.ring(160, y + 6, 4, 70, 1.6, "#ffd86a", true, 1);
    }
    this.#once("ring", 1.2, () => { this.ps.ring(160, 46, 3, 90, 1.4, "#fff0b0", true, 2); this.fx("chime"); });
    if (dark > 0.4 && Math.random() < 0.3) this.ps.spawn(Math.random() * W, 120 + Math.random() * 30, 0, (Math.random() - 0.5) * 8, 0, 14, 2, "#ff5a6a", { kind: KIND.SPARK, additive: true, flutter: 6 });
    this.#particles();
    this.#vignette(0.35 + dark * 0.4);
  }

  /* ---------- 3 · El Consejo de los Siete ---------- */
  #s3(c, t, k) {
    bandSky(c, [[0, "#0a0614"], [0.6, "#1a1030"], [1, "#2a1a48"]], 0, H);
    // arcos de la sala
    c.fillStyle = "#120a22"; for (let i = 0; i < 6; i++) { const x = 24 + i * 54; c.fillRect(x, 20, 10, 110); c.fillStyle = "#1c1236"; c.fillRect(x, 20, 3, 110); c.fillStyle = "#120a22"; }
    this.#glow(160, 20, 150, "#6a4aa0", 0.3);
    // suelo con círculo de juicio
    c.fillStyle = "#0e0818"; c.fillRect(0, 118, W, 62);
    c.save(); c.translate(160, 148); c.scale(1, 0.28);
    c.strokeStyle = "#e3b341"; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 120, 0, TAU); c.stroke();
    c.lineWidth = 1; c.beginPath(); c.arc(0, 0, 100, 0, TAU); c.stroke(); c.rotate(t * 0.2);
    c.fillStyle = "#fbe7a1"; for (let i = 0; i < 28; i++) { const a = (i / 28) * TAU; c.fillRect(Math.cos(a) * 110 - 2, Math.sin(a) * 110 - 2, 4, 4); }
    c.restore();
    // los siete, en semicírculo
    const angry = smooth(seg(t, 3, 5.5));
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (0.12 + (i / 6) * 0.76), x = 160 - Math.cos(a) * 128, y = 124 + (Math.sin(a) - 1) * 10 - Math.sin(a) * 6 * (i === 3 ? 1 : 0.5);
      const hh = i === 3 ? 74 : 64 + (i % 2) * 4;
      this.#glow(x, y - hh * 0.97, 14, angry > 0.5 ? "#ff6a4a" : "#ffd86a", 0.45);
      drawElder(c, x, y, hh, t, i, angry > 0.5);
    }
    // haces de juicio hacia Abel
    const bx = 160, by = 128;
    c.globalCompositeOperation = "lighter";
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (0.12 + (i / 6) * 0.76), x = 160 - Math.cos(a) * 128, y = 124 - (i === 3 ? 74 : 66) * 0.95;
      const on = clamp(seg(t, 1 + i * 0.25, 2.6 + i * 0.25)) * (0.55 + 0.45 * Math.sin(t * 5 + i));
      const g = c.createLinearGradient(x, y, bx, by); const col = angry > 0.5 ? "255,90,70" : "255,220,140";
      g.addColorStop(0, `rgba(${col},${0.6 * on})`); g.addColorStop(1, `rgba(${col},${0.05 * on})`);
      c.strokeStyle = g; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.lineTo(bx, by); c.stroke();
    }
    c.globalCompositeOperation = "source-over";
    // Abel de pie ante el tribunal (alas aún intactas)
    const shake = angry * Math.sin(t * 40) * 0.6;
    drawWings(c, 160 + shake, 120, 0.8, 0.3, 40, WING_DULL);
    this.#abel("idle", 160 + shake, 158, { scale: 1.6, fps: 6, tint: { color: "#ff3a2a", alpha: angry * 0.28 } });
    this.#once("verdict", 5.4, () => { this.#flash(0.7, "#ff3a2a"); this.#shake(3, 0.5); this.fx("boom"); });
    if (t > 5.4) this.#text("TRAITOR", 160, 40 + Math.sin(t * 30) * (t < 6.2 ? 1 : 0), 16, "#ff5a4a", smooth(seg(t, 5.4, 5.9)) * (1 - seg(t, 7.5, 8.2)));
    this.#particles();
    this.#vignette(0.55);
  }

  /* ---------- 4 · Las alas rotas ---------- */
  #s4(c, t, k) {
    const broke = 2.4;
    bandSky(c, [[0, "#000000"], [1, "#100a1c"]], 0, H);
    this.#rays(160, -20, t, "#fff0b0", 6, 260, 0.08 * (t < broke ? 1 : Math.max(0, 1 - (t - broke) * 0.6)), 0.06);
    this.#glow(160, 100, 100, "#ffe9a0", t < broke ? 0.35 : 0.1);
    c.fillStyle = "#0a0614"; c.fillRect(0, 150, W, 30);
    const pre = t < broke, kneel = smooth(seg(t, broke, broke + 0.8));
    // temblor previo a la rotura
    const tremble = pre ? seg(t, 0.8, broke) * 1.8 : 0;
    const ox = Math.sin(t * 60) * tremble;
    const broken = pre ? seg(t, 1.2, broke) * 0.25 : 1;
    if (t < broke + 1.2) drawWings(c, 160 + ox, 94, pre ? 1 : 0.6 * (1 - seg(t, broke, broke + 1.2)), 0.5 + 0.2 * Math.sin(t * 3), 70, WING_GOLD, broken);
    c.save(); c.translate(160, 156); c.scale(1, 1 - kneel * 0.14); c.translate(-160, -156);
    this.#abel("idle", 160 + ox, 156, { scale: 2.6, fps: 6, flash: pre ? 0 : Math.max(0, 1 - (t - broke) * 2.2), tint: pre ? null : { color: "#2a1030", alpha: 0.2 * kneel } });
    c.restore();
    this.#once("crack", 1.3, () => { this.fx("crack"); this.#shake(1.5, 0.4); });
    this.#once("break", broke, () => {
      this.#flash(1, "#ffffff"); this.#shake(6, 0.9); this.fx("shatter");
      this.#feathers(160, 100, 70, 110, ["#fff6d0", "#ffe9a0", "#ffffff", "#d8a84a"]);
      this.ps.burst(160, 94, 80, ["#fff6d0", "#ffd86a", "#ffffff"], 120, { up: 80, grav: 120 });
      this.ps.ring(160, 110, 6, 140, 1.0, "#ffffff", true, 2);
      this.ps.ring(160, 110, 6, 90, 0.8, "#ffd86a", true, 1);
    });
    if (t > broke) {                                              // luz que se escapa hacia arriba
      if (Math.random() < 0.7) this.ps.spawn(150 + Math.random() * 20, 130, 4, (Math.random() - 0.5) * 8, 0, 18 + Math.random() * 30, 1.8, "#ffe9a0", { kind: KIND.SPARK, additive: true, grav: -10, flutter: 8 });
    }
    if (t > 5.4) { this.#text("ABEL", 160, 34, 12, "#d8cfae", clamp(seg(t, 5.4, 6)) * (1 - seg(t, 6.6, 7.2))); }
    if (t > 6.5) { c.fillStyle = "#000"; c.globalAlpha = seg(t, 6.2, 7.2); c.fillRect(0, 10, W, 40); c.globalAlpha = 1; }
    if (t > 5.4 && t < 7.4) {                                     // el nombre se borra
      const p = seg(t, 5.9, 7.2); c.fillStyle = "#000";
      c.fillRect(120, 28, Math.round(80 * p), 12);
    }
    this.#particles();
    this.#vignette(0.6);
  }

  /* ---------- 5 · La caída (siete noches) ---------- */
  #s5(c, t, k) {
    const night = Math.min(6, Math.floor(t / 1.25)), nk = clamp(t / 8.5);
    bandSky(c, [[0, mixc("#3a3070", "#02010a", nk)], [0.6, mixc("#c8607a", "#2a0a24", nk)], [1, mixc("#ffc080", "#7a1a10", nk * 0.9)]], 0, H);
    if (nk > 0.3) { c.globalAlpha = clamp((nk - 0.3) * 1.5); c.drawImage(this.assets.stars, 0, 10); c.globalAlpha = 1; }
    // nubes que suben a toda velocidad (efecto de caída)
    const spd = 160 + t * 30;
    for (let L = 0; L < 3; L++) {
      const strip = this.assets.clouds[L] || this.assets.clouds[0], tint = nk;
      for (let j = 0; j < 4; j++) {
        const y = (((j * 56 + (-t * spd * (0.6 + L * 0.5)) % 224) + 224) % 224) - 40;
        c.globalAlpha = 0.5 * (1 - tint * 0.7); c.drawImage(strip, ((j * 97 + L * 150) % 480), 0, W, 56, 0, y, W, 56 * (1 + L * 0.3));
      }
    }
    c.globalAlpha = 1;
    // estela de aire
    c.globalCompositeOperation = "lighter"; c.fillStyle = "rgba(255,255,255,0.18)";
    for (let i = 0; i < 24; i++) { const x = (i * 53 + 17) % W, y = (((i * 71) - t * 520) % 200 + 200) % 200 - 10; c.fillRect(x, y, 1, 14 + (i % 3) * 8); }
    c.globalCompositeOperation = "source-over";
    // Abel cayendo: da vueltas envuelto en fuego
    const ax = 160 + Math.sin(t * 1.4) * 34, ay = 96 + Math.sin(t * 2.1) * 8, rot = t * 2.6 + 1;
    this.#glow(ax, ay, 46, "#ff7a1e", 0.55 + 0.2 * Math.sin(t * 12));
    c.save(); c.translate(ax, ay - 18); c.rotate(rot); c.translate(-ax, -(ay - 18));
    this.#abel("attack1", ax, ay, { scale: 1.8, fps: 5, tint: { color: "#ff7a1e", alpha: 0.45 + 0.2 * Math.sin(t * 14) } });
    c.restore();
    if (Math.random() < 0.9) this.ps.embers(ax, ay - 20, 3, 14, { z: 0, colors: ["#ff7a1e", "#ffc24a", "#fff1b8", "#ff3a1e"] });
    for (let i = 0; i < 2; i++) this.ps.spawn(ax + (Math.random() - 0.5) * 10, ay - 20, 0, (Math.random() - 0.5) * 14, -90 - Math.random() * 60, 0, 0.8, ["#ff7a1e", "#ffd060", "#ff3a1e"][(Math.random() * 3) | 0], { additive: true, kind: KIND.SPARK, size: 2 });
    this.#particles();
    // contador de noches
    const ro = ["I", "II", "III", "IV", "V", "VI", "VII"];
    this.#text(`NIGHT ${ro[night]}`, 160, 28, 12, "#fbe7a1", 0.9);
    c.fillStyle = "#fbe7a1";
    for (let i = 0; i < 7; i++) { c.globalAlpha = i <= night ? 1 : 0.25; c.fillRect(124 + i * 12, 40, 6, 3); }
    c.globalAlpha = 1;
    this.#once("whoosh", 0.2, () => this.fx("whoosh"));
    this.#vignette(0.55);
  }

  /* ---------- 6 · El impacto ---------- */
  #s6(c, t, k) {
    const hit = 2.1;
    bandSky(c, [[0, "#02010a"], [0.6, "#14102a"], [1, "#2a1a30"]], 0, 130);
    c.drawImage(this.assets.stars, 0, 10);
    c.fillStyle = "#e8e6d8"; c.beginPath(); c.arc(256, 40, 12, 0, TAU); c.fill(); c.fillStyle = "#c8c6b8"; c.beginPath(); c.arc(252, 36, 4, 0, TAU); c.fill();
    const sh = t > hit ? Math.sin((t - hit) * 40) * Math.max(0, 1 - (t - hit) * 1.4) * 2 : 0;       // el bosque se sacude
    drawStrip(c, this.assets.trees[0], t * -2 + sh, 90);
    drawStrip(c, this.assets.trees[1], t * -4 + sh * 1.5, 100);
    this.#ground(128, "#0a1410", "#16281e");
    drawStrip(c, this.assets.trees[2], t * -7 + sh * 2, 112);
    this.#ground(136, "#0e1a12", "#1c3426");
    // cráter que se abre
    const cr = easeOut(seg(t, hit, hit + 0.8));
    if (cr > 0) {
      const cx = 170, cy = 152;
      c.fillStyle = "#20140c"; c.beginPath(); c.ellipse(cx, cy, 70 * cr, 17 * cr, 0, 0, TAU); c.fill();
      c.fillStyle = "#0a0604"; c.beginPath(); c.ellipse(cx, cy + 1, 56 * cr, 12 * cr, 0, 0, TAU); c.fill();
      c.strokeStyle = "#ff7a1e"; c.lineWidth = 1; c.globalAlpha = 0.6 + 0.3 * Math.sin(t * 8); c.beginPath(); c.ellipse(cx, cy, 64 * cr, 15 * cr, 0, 0, TAU); c.stroke(); c.globalAlpha = 1;
      this.#glow(cx, cy, 90 * cr, "#ff7a1e", 0.35);
      if (Math.random() < 0.5) this.ps.embers(cx + (Math.random() - 0.5) * 100, cy, 1, 4, { z: 2 });
      if (Math.random() < 0.18) this.ps.smoke(cx + (Math.random() - 0.5) * 60, cy, 1, { color: "#2a2426", spread: 10, z: 4 });
    }
    // descenso diagonal en llamas
    if (t < hit) {
      const p = t / hit, ax = lerp(20, 170, easeIn(p) * 0.85 + p * 0.15), ay = lerp(-30, 152, easeIn(p) * 0.9 + p * 0.1);
      this.#glow(ax, ay - 14, 60, "#ff7a1e", 0.8);
      c.save(); c.translate(ax, ay - 16); c.rotate(0.9 + t * 3); c.translate(-ax, -(ay - 16));
      this.#abel("attack1", ax, ay, { scale: 1.7, fps: 5, tint: { color: "#ff7a1e", alpha: 0.55 } });
      c.restore();
      this.ps.embers(ax, ay - 16, 5, 10, { z: 0 });
      for (let i = 0; i < 3; i++) this.ps.spawn(ax, ay - 16, 0, -60 - Math.random() * 60, -50 - Math.random() * 50, 0, 0.7, ["#ff7a1e", "#ffd060", "#ff3a1e"][(Math.random() * 3) | 0], { additive: true, kind: KIND.SPARK, size: 2 });
    }
    this.#once("impact", hit, () => {
      this.#flash(1, "#ffffff"); this.#shake(9, 1.4); this.fx("crash");
      this.ps.debris(170, 150, ["#3a2814", "#5a4026", "#2a1c10", "#6a5030", "#1c120a"], 120, 150, { z: 8, spread: 40, grav: 340, chunky: 0.4 });
      this.ps.burst(170, 150, 90, ["#ffd060", "#ff7a1e", "#ffffff"], 160, { up: 120, grav: 260 });
      this.ps.dust(170, 150, 60, "#4a4034", { grow: 10 });
      for (let i = 0; i < 4; i++) this.ps.ring(170, 152, 4, 120 + i * 34, 0.9 + i * 0.15, i % 2 ? "#ffd060" : "#ffffff", true, 2);
    });
    // las hojas caen de los árboles tras el impacto
    if (t > hit && Math.random() < 0.5) this.ps.leaves(Math.random() * W, 90, 60, 1, ["#2a4a2a", "#1c3a20", "#3a5a2a"]);
    this.#particles();
    this.#vignette(0.5);
  }

  /* ---------- 7 · El despertar ---------- */
  #s7(c, t, k) {
    bandSky(c, [[0, "#04030c"], [0.55, "#0c1224"], [1, "#16221e"]], 0, 130);
    c.drawImage(this.assets.stars, 0, 10);
    drawStrip(c, this.assets.night[0], t * 1.5, 60, 0.35);
    c.fillStyle = "#cfd8e8"; c.beginPath(); c.arc(70, 36, 10, 0, TAU); c.fill(); this.#glow(70, 36, 40, "#8aa0d8", 0.3);
    drawStrip(c, this.assets.trees[0], Math.sin(t * 0.6) * 2, 82);
    drawStrip(c, this.assets.night[1], t * 3, 98, 0.35);
    drawStrip(c, this.assets.trees[1], Math.sin(t * 0.8 + 1) * 3, 96);
    this.#ground(128, "#0a1410", "#16281e");
    // ojos en la oscuridad
    const eyes = [[40, 112], [96, 118], [226, 108], [284, 120], [262, 96], [14, 100]];
    eyes.forEach(([x, y], i) => {
      const on = clamp(seg(t, 3.5 + i * 0.5, 4.2 + i * 0.5)) * (Math.sin(t * 2 + i * 3) > -0.85 ? 1 : 0);
      if (on) { c.fillStyle = "#ff3a3a"; c.globalAlpha = on; c.fillRect(x, y, 2, 1); c.fillRect(x + 5, y, 2, 1); c.globalAlpha = 1; this.#glow(x + 3, y, 6, "#ff3a3a", 0.35 * on); }
    });
    // cráter humeante
    const cx = 160, cy = 150;
    c.fillStyle = "#1c120a"; c.beginPath(); c.ellipse(cx, cy, 78, 18, 0, 0, TAU); c.fill();
    c.fillStyle = "#080503"; c.beginPath(); c.ellipse(cx, cy + 1, 62, 13, 0, 0, TAU); c.fill();
    c.strokeStyle = "#ff7a1e"; c.globalAlpha = 0.45 + 0.2 * Math.sin(t * 5); c.beginPath(); c.ellipse(cx, cy, 70, 16, 0, 0, TAU); c.stroke(); c.globalAlpha = 1;
    this.#glow(cx, cy, 100, "#ff7a1e", 0.25);
    if (Math.random() < 0.4) this.ps.embers(cx + (Math.random() - 0.5) * 100, cy, 1, 4, { z: 2 });
    if (Math.random() < 0.12) this.ps.smoke(cx + (Math.random() - 0.5) * 60, cy, 1, { color: "#3a3436", spread: 10, z: 4 });
    if (Math.random() < 0.2) this.ps.spawn(Math.random() * W, 110 + Math.random() * 40, 0, (Math.random() - 0.5) * 6, 0, 6 + Math.random() * 8, 3, ["#ffcf7a", "#9dffcf"][(Math.random() * 2) | 0], { kind: KIND.SPARK, additive: true, flutter: 8 });
    // Abel yace y se incorpora
    const rise = easeOut(seg(t, 1.5, 4.2));
    const rot = lerp(Math.PI / 2, 0, rise), yy = lerp(158, 148, rise);
    c.save(); c.translate(cx, yy - 12); c.rotate(rot); c.translate(-cx, -(yy - 12));
    this.#abel("idle", cx, yy, { scale: 1.9, fps: rise < 1 ? 4 : 7, tint: { color: "#0a0614", alpha: 0.2 * (1 - rise) } });
    c.restore();
    if (t < 1.5) { c.fillStyle = "#000"; c.globalAlpha = 0.5 * (1 - seg(t, 0.4, 1.5)); c.fillRect(0, 0, W, H); c.globalAlpha = 1; }
    // un lobo de la oscuridad asoma en la cresta
    const wolf = easeOut(seg(t, 6, 7.4));
    if (wolf > 0) {
      c.save(); c.globalAlpha = wolf;
      this.#char("karr", "idle", 262 + (1 - wolf) * 20, 122, { scale: 1.4, flip: true, tint: { color: "#05030a", alpha: 0.75 }, fps: 6 });
      c.fillStyle = "#ff3a3a"; c.fillRect(250, 108, 2, 1); c.fillRect(254, 108, 2, 1);
      c.restore();
      this.#glow(252, 108, 10, "#ff3a3a", 0.5 * wolf);
    }
    // niebla de ceniza en primer plano
    drawStrip(c, this.assets.night[1], -t * 6, 128, 0.3);
    this.#particles();
    this.#vignette(0.65);
  }

  /* ---------- 8 · La elección ---------- */
  #s8(c, t, k) {
    const reveal = (i) => easeOut(seg(t, 4 + i * 0.7, 5 + i * 0.7));
    bandSky(c, [[0, "#04030c"], [0.5, "#0c1224"], [1, "#16221e"]], 0, 140);
    // izquierda: gracia (luz dorada) · derecha: poder (sombra violeta)
    c.save(); c.beginPath(); c.rect(0, 0, W / 2, H); c.clip();
    this.#glow(70, 80, 150, "#ffd86a", 0.45); this.#rays(60, 60, t, "#ffe9a0", 10, 220, 0.12, 0.15);
    c.restore();
    c.save(); c.beginPath(); c.rect(W / 2, 0, W / 2, H); c.clip();
    this.#glow(250, 90, 150, "#7a2ad8", 0.5); this.#rays(262, 70, -t, "#a86aff", 10, 220, 0.12, 0.15);
    c.restore();
    drawStrip(c, this.assets.trees[0], 0, 84, 0.9);
    drawStrip(c, this.assets.trees[1], 0, 98, 0.9);
    this.#ground(130, "#0a1410", "#16281e");
    drawStrip(c, this.assets.night[1], t * 5, 120, 0.3);
    // compañeros: siluetas que se revelan
    const crew = [["arc", 86, 142], ["chloe", 108, 138], ["aria", 214, 138], ["mileva", 236, 142], ["benny", 258, 138]];
    crew.forEach(([id, x, y], i) => {
      const r = reveal(i);
      this.#char(id, "idle", x, y, { scale: 1.5, flip: x > 160, off: i * 0.31, fps: 7, tint: { color: "#05030a", alpha: 0.88 * (1 - r) }, flash: Math.max(0, 1 - Math.abs(t - (4.15 + i * 0.7)) * 5) * 0.8 });
      if (r > 0 && r < 1) this.#glow(x, y - 20, 24, "#ffe9a0", 0.5 * (1 - r));
    });
    // Abel, en el centro, sin alas
    this.#abel("idle", 160, 150, { scale: 2.1, fps: 7 });
    this.#glow(160, 126, 40, t < 6 ? "#ffffff" : "#ffd86a", 0.15);
    if (Math.random() < 0.3) this.ps.spawn(40 + Math.random() * 60, 140, 0, 0, 0, 14 + Math.random() * 10, 3, "#ffe9a0", { kind: KIND.SPARK, additive: true, flutter: 6 });
    if (Math.random() < 0.3) this.ps.spawn(220 + Math.random() * 70, 140, 0, 0, 0, 14 + Math.random() * 10, 3, "#a86aff", { kind: KIND.SPARK, additive: true, flutter: 6 });
    this.#particles();
    // título
    const tp = easeOut(seg(t, 6.6, 8.4));
    if (tp > 0) {
      this.#glow(160, 44, 110 * tp, "#ffd86a", 0.4 * tp);
      const sc = lerp(1.25, 1, tp);
      c.save(); c.translate(160, 44); c.scale(sc, sc);
      this.#text("EVIL-ANGEL", 0, 0, 22, "#fbe7a1", tp);
      c.restore();
      this.#text("LEARN ENGLISH · SURVIVE THE FOREST", 160, 66, 6, "#c8b070", tp * 0.9);
    }
    this.#vignette(0.55);
  }
}

export const INTRO_CSS = `
  #intro.cine { --cap-h: clamp(132px, 27vh, 224px); perspective: none; -webkit-mask-image: none; mask-image: none; background: #000; }
  #intro.cine #crawl-plane { display: none; }
  #cine-canvas { position: absolute; left: 0; top: 0; width: 100%; height: calc(100% - var(--cap-h)); object-fit: contain; image-rendering: pixelated; image-rendering: crisp-edges; background: #000; }
  #cine-cap { position: absolute; left: 0; right: 0; bottom: 0; height: var(--cap-h); display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; pointer-events: none;
    padding: 8px max(16px, 4vw); background: linear-gradient(180deg, #07040e 0%, #05030a 100%); border-top: 2px solid #3a2e12; box-shadow: 0 -12px 24px rgba(0,0,0,0.6); }
  #cine-cap .cc-chapter { font-family: "Press Start 2P", monospace; font-size: clamp(8px, 1.4vw, 12px); letter-spacing: 0.18em; color: #9c7416; margin-bottom: 6px; text-shadow: 0 0 8px rgba(227,179,65,0.4); }
  #cine-cap .cc-en { font-family: "Pixelify Sans", "Press Start 2P", monospace; font-weight: 600; font-size: clamp(15px, 2.7vw, 27px); line-height: 1.3; color: #fbe7a1; min-height: 2.6em; max-width: 900px; text-shadow: 0 0 8px rgba(227,179,65,0.5), 0 2px 0 #000; }
  #cine-cap .cc-es { font-family: "Pixelify Sans", monospace; font-size: clamp(11px, 1.8vw, 17px); line-height: 1.3; color: #a8935c; margin-top: 2px; min-height: 2.6em; max-width: 900px; transition: opacity 0.4s; }
  #cine-cap .cc-dots { display: flex; gap: 6px; justify-content: center; margin-top: 4px; }
  #cine-cap .cc-dots i { width: 14px; height: 3px; background: #3a2e12; }
  #cine-cap .cc-dots i.on { background: #9c7416; }
  #cine-cap .cc-dots i.now { background: #fbe7a1; box-shadow: 0 0 6px rgba(251,231,161,0.8); }
  #intro.cine ~ #skip-hint, #skip-hint { z-index: 5; }
`;
