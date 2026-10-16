import { SpriteRenderer } from "../graphics/SpriteRenderer.js";
import { renderArcCanvas } from "../graphics/ArcSprite.js";
import { CAST, LOGO, loadImage } from "../data/Assets.js";

/**
 * TitleScreen · pantalla de presentación
 * --------------------------------------
 * Escena nocturna en pixel art a 320×180 (mundo) + logotipo y menú a
 * resolución de pantalla:
 *
 *   - Cielo con tramado, estrellas, luna llena con halo y nubes que se desplazan.
 *   - Ciudad en ruinas en dos planos, chimeneas, incendios, humo y un reflector.
 *   - Suelo de escombros con grietas incandescentes y brasas que suben.
 *   - El elenco completo en primer plano, cada uno con su animación.
 *   - Logotipo oficial flotando con Math.sin.
 *   - Menú pixelado: START GAME / CONTROLS (↑ ↓ o W S para elegir, Enter para aceptar).
 *
 * Al empezar, llama a engine.beginGame(): el motor hace el fundido y carga el nivel.
 */

const W = 320, H = 180;
const GROUND_Y = 138;   // línea del horizonte del suelo
const FEET_Y = 152;     // donde apoya el elenco
const FONT = '"Press Start 2P", "Courier New", monospace';
const BODY_FONT = '"Pixelify Sans", "Courier New", monospace';

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((row) => row.map((v) => v / 16 - 0.5));

function createRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

const MENU = Object.freeze([
  { id: "start", label: "START GAME" },
  { id: "controls", label: "CONTROLS" },
]);

export class TitleScreen {
  /** @param {import("./Engine.js").Engine} engine */
  constructor(engine) {
    this.engine = engine;
    this.time = 0;
    this.menuIndex = 0;
    this.showControls = false;
    this.leaving = false;

    const rng = createRng(1984);
    this.sky = this.#paintSky(rng);
    this.clouds = this.#paintClouds(rng);
    const city = this.#paintCity(rng);
    this.city = city.canvas;
    this.fires = city.fires;
    this.ground = this.#paintGround(rng, this.fires);
    this.embers = [];
    this.rng = rng;

    this.cast = this.#bakeCast();

    // Logotipo oficial: si no carga, se dibuja una versión tipográfica
    this.logo = null;
    loadImage(LOGO.src).then((img) => { this.logo = img; }).catch(() => { this.logo = false; });
  }

  /* ---------- Entrada ---------- */

  /** @param {import("./InputHandler.js").InputHandler} input */
  handleInput(input) {
    if (this.leaving) return;
    const pressed = (...codes) => codes.some((c) => input.wasPressed(c));

    if (this.showControls) {
      if (pressed("Enter", "Escape", "Space", "NumpadEnter")) this.showControls = false;
      return;
    }
    if (pressed("ArrowUp", "KeyW", "ArrowLeft", "KeyA")) this.menuIndex = (this.menuIndex + MENU.length - 1) % MENU.length;
    if (pressed("ArrowDown", "KeyS", "ArrowRight", "KeyD")) this.menuIndex = (this.menuIndex + 1) % MENU.length;
    if (pressed("Enter", "Space", "NumpadEnter")) this.activate();
  }

  /** Ejecuta la opción seleccionada (también se llama al hacer clic). */
  activate() {
    if (this.leaving) return;
    if (this.showControls) { this.showControls = false; return; }
    const item = MENU[this.menuIndex];
    if (item.id === "controls") { this.showControls = true; return; }
    this.leaving = true;
    this.engine.beginGame();
  }

  /* ---------- Lógica ---------- */

  update(dt) {
    this.time += dt;
    // Brasas que suben desde los incendios
    if (this.embers.length < 70 && this.rng() < dt * 40) {
      const f = this.fires[(this.rng() * this.fires.length) | 0];
      this.embers.push({ x: f.x + (this.rng() - 0.5) * f.size * 2, y: f.y - 2, vx: (this.rng() - 0.3) * 8, vy: -10 - this.rng() * 16, life: 1.5 + this.rng() * 2, max: 3.5 });
    }
    for (const e of this.embers) {
      e.life -= dt;
      e.x += (e.vx + Math.sin(this.time * 2 + e.y * 0.1) * 4) * dt;
      e.y += e.vy * dt;
    }
    this.embers = this.embers.filter((e) => e.life > 0 && e.y > -4);
  }

  /* ---------- Dibujo del mundo (320×180) ---------- */

  /** @param {CanvasRenderingContext2D} ctx */
  renderWorld(ctx) {
    const t = this.time;
    ctx.drawImage(this.sky, 0, 0);

    // Nubes que se desplazan despacio (dos copias para el bucle continuo)
    const cx = -((t * 3) % this.clouds.width);
    ctx.drawImage(this.clouds, Math.round(cx), 10);
    ctx.drawImage(this.clouds, Math.round(cx + this.clouds.width), 10);

    // Reflector que barre el cielo
    const ang = -1.42 + Math.sin(t * 0.35) * 0.32;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = "rgba(170, 185, 255, 0.09)";
    ctx.beginPath();
    ctx.moveTo(58, 104);
    ctx.lineTo(58 + Math.cos(ang - 0.07) * 260, 104 + Math.sin(ang - 0.07) * 260);
    ctx.lineTo(58 + Math.cos(ang + 0.07) * 260, 104 + Math.sin(ang + 0.07) * 260);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.drawImage(this.city, 0, 0);
    ctx.drawImage(this.ground, 0, 0);

    // Incendios animados con su resplandor
    for (const f of this.fires) this.#drawFire(ctx, f, t);

    // Elenco: ordenado de izquierda a derecha, con sombras y animación propia
    for (const member of this.cast) this.#drawMember(ctx, member, t);

    // Brasas (aditivas)
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const e of this.embers) {
      const a = Math.min(1, e.life / 1.2);
      ctx.globalAlpha = a;
      ctx.fillStyle = e.life > 2 ? "#ffd26a" : "#ff7a2a";
      ctx.fillRect(Math.round(e.x), Math.round(e.y), 1, 1);
    }
    ctx.restore();
  }

  /* ---------- Dibujo a resolución de pantalla: logotipo, menú, controles ---------- */

  /** @param {CanvasRenderingContext2D} ctx */
  renderScreen(ctx) {
    const cw = ctx.canvas.width, ch = ctx.canvas.height;
    const t = this.time;
    const intro = Math.min(1, t / 1.2); // aparición inicial

    // Logotipo oficial con flotación suave
    const logoW = Math.round(cw * 0.5);
    const logoH = Math.round(logoW * (LOGO.height / LOGO.width));
    const float = Math.sin(t * 1.4) * ch * 0.01;
    const lx = Math.round((cw - logoW) / 2);
    const ly = Math.round(ch * 0.03 + float + (1 - intro) * -ch * 0.04);
    ctx.save();
    ctx.globalAlpha = intro;
    if (this.logo) {
      ctx.imageSmoothingEnabled = true;
      ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
      ctx.shadowBlur = ch * 0.03;
      ctx.shadowOffsetY = ch * 0.012;
      ctx.drawImage(this.logo, lx, ly, logoW, logoH);
    } else if (this.logo === false) {
      this.#fallbackLogo(ctx, cw / 2, ly + logoH * 0.5, logoW);
    }
    ctx.restore();

    // Menú
    const fs = Math.max(9, Math.round(ch * 0.024));
    const panelH = Math.round(fs * 4.4);
    const panelY = ch - panelH - Math.round(ch * 0.018);
    ctx.save();
    ctx.globalAlpha = Math.min(1, Math.max(0, (t - 0.6) / 0.8));
    ctx.font = `${fs}px ${FONT}`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    const gap = fs * 3;
    const widths = MENU.map((m) => ctx.measureText(m.label).width);
    const total = widths.reduce((a, b) => a + b, 0) + gap * (MENU.length - 1);
    const panelW = Math.round(total + fs * 6);
    const px = Math.round((cw - panelW) / 2);
    this.#panel(ctx, px, panelY, panelW, panelH, Math.max(1, Math.round(ch / 270)));

    let x = (cw - total) / 2;
    const rowY = panelY + panelH * 0.36;
    MENU.forEach((m, i) => {
      const w = widths[i];
      const selected = i === this.menuIndex;
      const center = x + w / 2;
      if (selected) {
        const nudge = Math.round(Math.sin(t * 6) * fs * 0.15);
        ctx.fillStyle = "#fbe7a1";
        ctx.fillText(">", x - fs * 1.3 + nudge, rowY);
        ctx.fillText("<", x + w + fs * 1.3 - nudge, rowY);
      }
      ctx.fillStyle = "#000";
      ctx.fillText(m.label, center + 2, rowY + 2);
      ctx.fillStyle = selected ? "#fbe7a1" : "#8c7a52";
      if (selected) { ctx.shadowColor = "rgba(227, 179, 65, 0.7)"; ctx.shadowBlur = fs * 0.8; }
      ctx.fillText(m.label, center, rowY);
      ctx.shadowBlur = 0;
      x += w + gap;
    });

    // "[ PRESS ENTER TO START ]" parpadeante
    const blink = Math.sin(t * 4) > -0.2;
    if (blink) {
      ctx.font = `${Math.round(fs * 0.7)}px ${FONT}`;
      ctx.fillStyle = "#e3b341";
      ctx.fillText(this.menuIndex === 0 ? "[ PRESS ENTER TO START ]" : "[ PRESS ENTER ]", cw / 2, panelY + panelH * 0.74);
    }
    ctx.restore();

    if (this.showControls) this.#drawControls(ctx, cw, ch, fs);
  }

  /* ---------- Piezas de la escena ---------- */

  #paintSky(rng) {
    const c = makeCanvas(W, H);
    const ctx = c.getContext("2d");
    const bands = ["#060a1c", "#0a0f26", "#0e1530", "#131c3c", "#19244a", "#212e58", "#2a3866", "#344372"];
    for (let y = 0; y < GROUND_Y; y++) {
      for (let x = 0; x < W; x++) {
        const v = (y / GROUND_Y) * bands.length + BAYER[y % 4][x % 4] * 0.9;
        ctx.fillStyle = bands[Math.max(0, Math.min(bands.length - 1, Math.floor(v)))];
        ctx.fillRect(x, y, 1, 1);
      }
    }
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = rng() < 0.8 ? "#8a93c8" : "#e8ecff";
      ctx.fillRect((rng() * W) | 0, (rng() * 80) | 0, 1, 1);
    }
    // Luna llena con halo tramado
    const mx = 264, my = 32, r = 15;
    for (let y = my - r - 16; y <= my + r + 16; y++) {
      for (let x = mx - r - 16; x <= mx + r + 16; x++) {
        const d = Math.hypot(x + 0.5 - mx, y + 0.5 - my);
        const dither = BAYER[((y % 4) + 4) % 4][((x % 4) + 4) % 4];
        if (d <= r) {
          const edge = d > r - 1.5;
          let col = edge ? "#c9d0f0" : "#eef1ff";
          if (x + 0.5 - mx > r * 0.35 && !edge) col = "#dde2f8"; // terminador suave
          ctx.fillStyle = col;
          ctx.fillRect(x, y, 1, 1);
        } else if (d < r + 16 && dither < 0.45 - (d - r) / 16) {
          ctx.fillStyle = d < r + 6 ? "#5a6aa8" : "#3a4a86";
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
    for (const [x, y, w, h] of [[257, 26, 4, 3], [266, 36, 5, 3], [260, 38, 2, 2], [268, 25, 2, 2], [254, 33, 2, 2]]) {
      ctx.fillStyle = "#c2c8e6";
      ctx.fillRect(x, y, w, h);
    }
    return c;
  }

  #paintClouds(rng) {
    const c = makeCanvas(W * 2, 70);
    const ctx = c.getContext("2d");
    const blobs = [];
    for (let i = 0; i < 26; i++) blobs.push({ x: rng() * W * 2, y: 18 + rng() * 34, rx: 18 + rng() * 34, ry: 5 + rng() * 9 });
    const inside = (x, y) => blobs.some((b) => {
      const dx = x - b.x, dxw = Math.min(Math.abs(dx), W * 2 - Math.abs(dx)); // continuo al envolver
      return (dxw / b.rx) ** 2 + ((y - b.y) / b.ry) ** 2 <= 1;
    });
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) {
        if (!inside(x, y)) continue;
        const top = !inside(x, y - 1), top2 = !inside(x, y - 2);
        const col = top ? "#5a6698" : top2 ? "#3e4a7a" : (y + BAYER[y % 4][x % 4] * 6) > 40 ? "#141a36" : "#1c2446";
        ctx.fillStyle = col;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    return c;
  }

  #paintCity(rng) {
    const c = makeCanvas(W, H);
    const ctx = c.getContext("2d");
    const fires = [];
    const P = (col, x, y, w, h) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };

    // Plano lejano: siluetas con techos rotos
    for (let x = -4; x < W; x += 10 + ((rng() * 14) | 0)) {
      const w = 10 + ((rng() * 16) | 0), top = 72 + ((rng() * 36) | 0);
      P("#141a38", x, top, w, GROUND_Y - top);
      for (let k = 0; k < w; k += 2) if (rng() < 0.4) P("#141a38", x + k, top - 1 - ((rng() * 4) | 0), 2, 4);
      for (let wy = top + 4; wy < GROUND_Y - 4; wy += 5) for (let wx = x + 2; wx < x + w - 2; wx += 4) if (rng() < 0.12) P("#2a3466", wx, wy, 1, 2);
    }
    // Plano cercano
    const near = "#0b0f24", nearHi = "#1a2044";
    const building = (x, w, top, broken) => {
      P(near, x, top, w, GROUND_Y - top);
      P(nearHi, x, top, 1, GROUND_Y - top);                    // borde lunar
      if (broken) for (let k = 0; k < w; k++) P(near, x + k, top - ((Math.sin(k * 1.7 + x) * 3 + 3) | 0), 1, 6);
      for (let wy = top + 5; wy < GROUND_Y - 6; wy += 6) {
        for (let wx = x + 2; wx < x + w - 2; wx += 4) {
          const r = rng();
          if (r < 0.08) P("#ff9a3c", wx, wy, 2, 2);
          else if (r < 0.14) P("#5a2a1e", wx, wy, 2, 2);
          else if (r < 0.3) P("#161c3c", wx, wy, 2, 2);
        }
      }
    };
    // Fábrica con chimeneas a la izquierda
    building(4, 44, 98, false);
    P(near, 10, 52, 6, 46); P(nearHi, 10, 52, 1, 46);
    P(near, 22, 62, 5, 36); P(nearHi, 22, 62, 1, 36);
    P(near, 34, 70, 4, 28);
    fires.push({ x: 13, y: 52, size: 3, smoke: true }, { x: 40, y: 98, size: 4 });
    building(56, 26, 108, true);
    building(86, 18, 92, true);
    building(150, 22, 104, true);
    building(176, 30, 86, true);
    fires.push({ x: 190, y: 86, size: 5 });
    building(214, 20, 110, true);
    // Rascacielos partido a la derecha
    building(266, 34, 58, true);
    for (let k = 0; k < 14; k++) P("#060914", 266 + 18 + k, 58 + k * 2, 16 - k, 3);  // tajo diagonal
    building(240, 22, 100, false);
    fires.push({ x: 283, y: 64, size: 5, smoke: true }, { x: 248, y: 100, size: 3 });
    return { canvas: c, fires };
  }

  #paintGround(rng, fires) {
    const c = makeCanvas(W, H);
    const ctx = c.getContext("2d");
    const P = (col, x, y, w, h) => { ctx.fillStyle = col; ctx.fillRect(x | 0, y | 0, w, h); };
    for (let y = GROUND_Y; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const v = (y - GROUND_Y) / (H - GROUND_Y) + BAYER[y % 4][x % 4] * 0.25;
        P(v < 0.3 ? "#241c26" : v < 0.65 ? "#1c1520" : "#150f18", x, y, 1, 1);
      }
    }
    // Escombros con luz de luna arriba y sombra abajo
    for (let i = 0; i < 70; i++) {
      const x = rng() * W, y = GROUND_Y - 3 + rng() * (H - GROUND_Y);
      const w = 3 + ((rng() * 10) | 0), h = 2 + ((rng() * 4) | 0);
      P("#2e2632", x, y, w, h);
      P("#4a3e4e", x, y, w, 1);
      P("#0e0a10", x + 1, y + h, w, 1);
    }
    // Grietas incandescentes
    for (let i = 0; i < 7; i++) {
      let x = rng() * W, y = GROUND_Y + 6 + rng() * 32;
      for (let k = 0; k < 18; k++) {
        P(k % 3 === 0 ? "#ffb43c" : "#d24a14", x, y, 1, 1);
        x += rng() < 0.5 ? 1 : 2;
        y += rng() < 0.5 ? 0 : rng() < 0.5 ? 1 : -1;
      }
    }
    // Hogueras en el suelo, a los lados y delante
    for (const [x, y, s] of [[8, 172, 7], [306, 168, 8], [118, 176, 4], [210, 178, 5], [60, 150, 4], [262, 152, 4]]) fires.push({ x, y, size: s });
    return c;
  }

  #drawFire(ctx, f, t) {
    // Resplandor
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const r = f.size * 4.5 + Math.sin(t * 9 + f.x) * 1.2;
    const g = ctx.createRadialGradient(f.x, f.y - f.size, 0, f.x, f.y - f.size, r);
    g.addColorStop(0, "rgba(255, 120, 40, 0.35)");
    g.addColorStop(1, "rgba(255, 80, 20, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(f.x - r, f.y - f.size - r, r * 2, r * 2);
    ctx.restore();
    // Llamas: columnas de altura cambiante, del núcleo claro al borde rojo
    for (let dx = -f.size; dx <= f.size; dx++) {
      const k = 1 - Math.abs(dx) / (f.size + 1);
      const h = Math.max(1, Math.round(f.size * 2.2 * k * (0.7 + 0.3 * Math.sin(t * 11 + dx * 1.9 + f.x))));
      for (let dy = 0; dy < h; dy++) {
        const p = dy / h;
        ctx.fillStyle = p < 0.25 && k > 0.5 ? "#ffef9a" : p < 0.55 ? "#ffb43c" : p < 0.85 ? "#ff6a1e" : "#c02a10";
        ctx.fillRect(Math.round(f.x + dx), Math.round(f.y - dy), 1, 1);
      }
    }
    // Humo
    if (f.smoke) {
      for (let i = 0; i < 6; i++) {
        const p = ((t * 0.25 + i / 6) % 1);
        ctx.globalAlpha = 0.35 * (1 - p);
        ctx.fillStyle = "#3a3448";
        const s = 3 + p * 8;
        ctx.fillRect(Math.round(f.x - s / 2 + p * 14), Math.round(f.y - f.size * 2 - p * 34), Math.round(s), Math.round(s * 0.7));
      }
      ctx.globalAlpha = 1;
    }
  }

  #bakeCast() {
    const renderer = new SpriteRenderer(null);
    const slots = [40, 86, 133, 182, 230, 279]; // centros en X, de izquierda a derecha
    return CAST.map((member, i) => {
      let canvas;
      if (member.sprite === "abel") canvas = renderer.getSprite("abel", "down", 0, "exhale").canvas;
      else if (member.sprite === "arc") canvas = renderArcCanvas();
      else canvas = SpriteRenderer.bake({ width: 32, height: 40, palette: member.palette, outlines: member.outlines }, member.pixels, "exhale").canvas;
      return { ...member, canvas: TitleScreen.#rimLight(canvas), cx: slots[i] };
    });
  }

  /**
   * Contraluz cálido de los incendios: tiñe de naranja la parte baja del
   * sprite solo donde hay píxeles (source-atop respeta la transparencia).
   */
  static #rimLight(src) {
    const c = makeCanvas(src.width, src.height);
    const ctx = c.getContext("2d");
    ctx.drawImage(src, 0, 0);
    ctx.globalCompositeOperation = "source-atop";
    const g = ctx.createLinearGradient(0, src.height * 0.55, 0, src.height);
    g.addColorStop(0, "rgba(255, 110, 40, 0)");
    g.addColorStop(1, "rgba(255, 110, 40, 0.22)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, src.width, src.height);
    return c;
  }

  #drawMember(ctx, m, t) {
    const { pose } = m;
    const phase = (t + pose.phase * 2.6) * Math.PI * 2;
    const bob = pose.bob ? (Math.sin(phase / 2.6) > 0.3 ? -pose.bob : 0) : 0;
    const hop = pose.hop ? -Math.round(Math.abs(Math.sin(t * 3.2)) * pose.hop) : 0;
    const x = Math.round(m.cx - m.canvas.width / 2);
    const y = Math.round(FEET_Y - m.canvas.height + bob + hop);

    // Sombra en el suelo (se encoge al saltar)
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    const sw = 11 + hop / 2;
    for (let dy = -1; dy <= 1; dy++) ctx.fillRect(Math.round(m.cx - sw + Math.abs(dy) * 3), FEET_Y + dy, Math.round((sw - Math.abs(dy) * 3) * 2), 1);

    // Aura dorada de Abel
    if (pose.aura) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const pulse = 0.5 + 0.5 * Math.sin(t * 3);
      const g = ctx.createRadialGradient(m.cx, y + 24, 0, m.cx, y + 24, 30);
      g.addColorStop(0, `rgba(255, 216, 106, ${0.32 + pulse * 0.12})`);
      g.addColorStop(1, "rgba(255, 216, 106, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(m.cx - 30, y - 6, 60, 60);
      // Chispas de la Palabra Sagrada alrededor de las manos
      for (let i = 0; i < 8; i++) {
        const a = t * 2.4 + i * 0.785;
        const hx = i % 2 ? x + 7 : x + 24, hy = y + 27;
        ctx.fillStyle = i % 3 ? "#fff3b0" : "#ffd86a";
        ctx.fillRect(Math.round(hx + Math.cos(a) * 4), Math.round(hy + Math.sin(a * 1.3) * 3), 1, 1);
      }
      ctx.restore();
    }

    ctx.drawImage(m.canvas, x, y);
  }

  #panel(ctx, x, y, w, h, b) {
    ctx.fillStyle = "rgba(8, 5, 14, 0.78)";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#9c7416";
    ctx.fillRect(x, y, w, b); ctx.fillRect(x, y + h - b, w, b);
    ctx.fillRect(x, y, b, h); ctx.fillRect(x + w - b, y, b, h);
  }

  #drawControls(ctx, cw, ch, fs) {
    const lines = [
      ["MOVE", "WASD / ARROWS"],
      ["CONFIRM", "ENTER / SPACE"],
      ["HITBOXES", "H"],
    ];
    const w = Math.round(cw * 0.46), h = Math.round(fs * (lines.length * 2.2 + 5));
    const x = Math.round((cw - w) / 2), y = Math.round((ch - h) / 2);
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(0, 0, cw, ch);
    this.#panel(ctx, x, y, w, h, Math.max(1, Math.round(ch / 270)));
    ctx.textBaseline = "middle";
    ctx.font = `${fs}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillStyle = "#fbe7a1";
    ctx.fillText("CONTROLS", cw / 2, y + fs * 1.8);
    ctx.font = `${Math.round(fs * 0.8)}px ${FONT}`;
    lines.forEach(([k, v], i) => {
      const ly = y + fs * (4 + i * 2.2);
      ctx.textAlign = "left";
      ctx.fillStyle = "#e3b341";
      ctx.fillText(k, x + fs * 2, ly);
      ctx.textAlign = "right";
      ctx.fillStyle = "#fbe7a1";
      ctx.fillText(v, x + w - fs * 2, ly);
    });
    ctx.textAlign = "center";
    ctx.font = `${Math.round(fs * 0.85)}px ${BODY_FONT}`;
    ctx.fillStyle = "#a8935c";
    ctx.fillText("Enter para volver · Enter to go back", cw / 2, y + h - fs * 1.3);
    ctx.restore();
  }

  /** Logotipo tipográfico de reserva si assets/logo.png no está disponible. */
  #fallbackLogo(ctx, cx, cy, w) {
    const s = w / 10;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${Math.round(s * 1.4)}px ${FONT}`;
    ctx.lineWidth = s * 0.18;
    ctx.strokeStyle = "#b0182a";
    ctx.strokeText("EVIL", cx, cy - s);
    ctx.fillStyle = "#c9ced8";
    ctx.fillText("EVIL", cx, cy - s);
    const g = ctx.createLinearGradient(0, cy, 0, cy + s * 1.6);
    g.addColorStop(0, "#fbe7a1");
    g.addColorStop(1, "#9c7416");
    ctx.fillStyle = g;
    ctx.fillText("ANGEL", cx, cy + s * 0.9);
  }
}
