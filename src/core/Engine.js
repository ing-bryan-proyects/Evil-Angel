import { SpriteRenderer } from "../graphics/SpriteRenderer.js";
import { Background } from "../world/Background.js";
import { Player, intersects } from "../entities/Player.js";
import { NPC } from "../entities/NPC.js";
import { InputHandler } from "./InputHandler.js";
import { HUD } from "../ui/HUD.js";

/**
 * Engine · núcleo unificado
 * -------------------------
 * Un único bucle a 60 FPS (requestAnimationFrame + paso fijo) que gestiona dos modos:
 *
 *   "title" → la escena que se le entregue con showTitle() (TitleScreen).
 *   "level" → exploración del Sub-Level 1.1 con Abel, Unit-A.R.C. y el HUD.
 *
 * Al llamar a beginGame() (lo hace TitleScreen) se ejecuta la transición:
 *   fundido a negro → tarjeta "Entering Sub-level 1.1" → carga del nivel → fundido de entrada.
 *
 * Doble resolución: el mundo se dibuja en un búfer de 320×180 y se amplía al
 * canvas con un factor entero de píxeles de dispositivo; logotipo, menú y HUD
 * se dibujan después a resolución de pantalla para que el texto sea nítido.
 */

export const LOGICAL_WIDTH = 320;
export const LOGICAL_HEIGHT = 180;
const STEP = 1 / 60;
const MAX_FRAME_TIME = 0.25;
const CANOPY_FADE = 0.55;

/** Duraciones de la transición título → nivel (segundos). */
const FADE_OUT = 0.8, CARD_TIME = 2.2, FADE_IN = 1.0;

/** Datos del nivel inicial: textos del HUD y de la tarjeta de entrada. */
const LEVEL = Object.freeze({
  id: "1.1",
  name: "The Awakening",
  title: "SUB-LEVEL 1.1 · THE AWAKENING",
  objectives: {
    find: { en: "Find the source of the metallic humming.", es: "Encuentra el origen del zumbido metálico." },
    found: { en: "You found Unit-A.R.C. Its language core is damaged.", es: "Has encontrado a Unit-A.R.C. Su núcleo de lenguaje está dañado." },
  },
});

const FONT = '"Press Start 2P", "Courier New", monospace';

export class Engine {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });

    this.world = document.createElement("canvas");
    this.world.width = LOGICAL_WIDTH;
    this.world.height = LOGICAL_HEIGHT;
    this.wctx = this.world.getContext("2d", { alpha: false });
    this.wctx.imageSmoothingEnabled = false;

    this.input = new InputHandler();
    this.mode = "boot";
    this.title = null;
    this.level = null;           // se crea al empezar la partida
    this.transition = null;      // { phase: "out" | "card" | "in", t }
    this.time = 0;
    this.showHitboxes = false;

    this.accumulator = 0;
    this.lastTime = 0;
    this.running = false;

    this.loop = this.loop.bind(this);
    this.resize = this.resize.bind(this);
    window.addEventListener("resize", this.resize);
    // Clic o toque: equivale a Enter en la pantalla de título
    canvas.addEventListener("pointerdown", () => { if (this.mode === "title") this.title?.activate(); });
    this.resize();
  }

  /* ---------- Ciclo de vida ---------- */

  /** Muestra una escena de título (objeto con handleInput, update, renderWorld, renderScreen, activate). */
  showTitle(titleScene) {
    this.title = titleScene;
    this.mode = "title";
    this.start();
  }

  /** Señal de la pantalla de título: empezar la partida con transición. */
  beginGame() {
    if (this.transition || this.mode !== "title") return;
    this.transition = { phase: "out", t: 0 };
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const availW = (window.innerWidth - 48) * dpr;
    const availH = (window.innerHeight - 48) * dpr;
    this.scale = Math.max(1, Math.floor(Math.min(availW / LOGICAL_WIDTH, availH / LOGICAL_HEIGHT)));
    this.canvas.width = LOGICAL_WIDTH * this.scale;
    this.canvas.height = LOGICAL_HEIGHT * this.scale;
    this.canvas.style.width = `${this.canvas.width / dpr}px`;
    this.canvas.style.height = `${this.canvas.height / dpr}px`;
    this.ctx.imageSmoothingEnabled = false;
  }

  /* ---------- Nivel ---------- */

  /** Crea el Sub-Level 1.1: bosque nocturno, Abel, Unit-A.R.C. y HUD. */
  startLevel() {
    const background = new Background(LOGICAL_WIDTH, LOGICAL_HEIGHT);
    const spawn = background.spawnPoint;
    const arcBase = background.npcSpawns.arc;
    const player = new Player(spawn.x, spawn.y);
    const npcs = [NPC.createArc(arcBase.x, arcBase.y)];
    this.level = {
      data: LEVEL,
      renderer: new SpriteRenderer(this.wctx),
      background,
      player,
      npcs,
      entities: [player, ...npcs],
      hud: new HUD(),
      objective: LEVEL.objectives.find,
      bounds: { width: LOGICAL_WIDTH, height: LOGICAL_HEIGHT },
      time: 0,
    };
    this.mode = "level";
  }

  getObstacles() {
    const L = this.level;
    return [...L.background.getObstacles(), ...L.npcs.map((n) => n.getHitbox())];
  }

  /* ---------- Bucle ---------- */

  /** @param {DOMHighResTimeStamp} now */
  loop(now) {
    if (!this.running) return;
    const frameTime = Math.min(Math.max(0, now - this.lastTime) / 1000, MAX_FRAME_TIME);
    this.accumulator += frameTime;
    this.lastTime = now;

    // Entradas de una sola pulsación (una vez por frame)
    if (!this.transition) {
      if (this.mode === "title") this.title.handleInput(this.input);
      if (this.mode === "level" && this.input.wasPressed("KeyH")) this.showHitboxes = !this.showHitboxes;
    }
    this.input.endFrame();

    while (this.accumulator >= STEP) {
      this.update(STEP);
      this.accumulator -= STEP;
    }
    this.render();
    requestAnimationFrame(this.loop);
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    this.#updateTransition(dt);

    if (this.mode === "title") {
      this.title.update(dt);
    } else if (this.mode === "level") {
      const L = this.level;
      L.time += dt;
      L.background.update(dt);
      for (const npc of L.npcs) npc.update(dt);
      // Abel no se mueve mientras dura la transición
      if (!this.transition) L.player.update(this.input, this.getObstacles(), dt, L.bounds);
      else L.player.update({ getAxis: () => ({ x: 0, y: 0 }), latestDirection: () => null }, [], dt);

      const feet = L.player.getHitbox();
      const arc = L.npcs[0];
      if (L.objective === LEVEL.objectives.find && arc.distanceTo(feet.x + feet.width / 2, feet.y + feet.height / 2) < 26) {
        L.objective = LEVEL.objectives.found;
      }
    }
  }

  #updateTransition(dt) {
    const tr = this.transition;
    if (!tr) return;
    tr.t += dt;
    if (tr.phase === "out" && tr.t >= FADE_OUT) {
      this.startLevel();                 // se genera tras el negro: no se ve el corte
      Object.assign(tr, { phase: "card", t: 0 });
    } else if (tr.phase === "card" && tr.t >= CARD_TIME) {
      Object.assign(tr, { phase: "in", t: 0 });
    } else if (tr.phase === "in" && tr.t >= FADE_IN) {
      this.transition = null;
    }
  }

  /* ---------- Dibujo ---------- */

  render() {
    const { ctx } = this;
    if (this.mode === "title") {
      this.title.renderWorld(this.wctx);
      this.#present();
      this.title.renderScreen(ctx);
    } else if (this.mode === "level") {
      this.#renderLevelWorld();
      this.#present();
      const L = this.level;
      L.hud.render(ctx, {
        title: L.data.title,
        objective: L.objective,
        hp: L.player.hp,
        maxHp: L.player.maxHp,
        lp: L.player.lp,
      }, L.time);
    }
    this.#renderTransition();
  }

  /** Amplía el búfer del mundo al canvas visible con escala entera. */
  #present() {
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(this.world, 0, 0, this.canvas.width, this.canvas.height);
  }

  #renderLevelWorld() {
    const L = this.level;
    const { wctx } = this;
    L.renderer.clear();
    L.background.render(wctx);

    // Y-sorting de props y entidades por la base
    const drawables = [
      ...L.background.getProps().map((prop) => ({ sortY: prop.sortY, draw: () => this.#drawProp(prop) })),
      ...L.entities.map((e) => ({ sortY: e.sortY, draw: () => e.render(L.renderer) })),
    ];
    drawables.sort((a, b) => a.sortY - b.sortY);
    for (const d of drawables) d.draw();

    const c = L.player.center;
    const lights = [{ x: c.x, y: c.y, radius: 74 + Math.sin(L.time * 2.3) * 2 }];
    for (const npc of L.npcs) {
      const l = npc.getLight();
      if (l) lights.push(l);
    }
    L.background.renderNight(wctx, lights);

    if (this.showHitboxes) this.#drawHitboxes();
  }

  #drawProp(prop) {
    const { wctx } = this;
    const player = this.level.player;
    const behind = prop.canopy && player.sortY < prop.sortY &&
      intersects({ x: player.x + 6, y: player.y, width: player.width - 12, height: player.height - 4 }, prop.canopy);
    if (behind) wctx.globalAlpha = CANOPY_FADE;
    wctx.drawImage(prop.canvas, prop.x, prop.y);
    wctx.globalAlpha = 1;
  }

  #drawHitboxes() {
    const { wctx } = this;
    const outline = (r, color) => {
      wctx.fillStyle = color;
      const x = Math.round(r.x), y = Math.round(r.y), w = Math.round(r.width), h = Math.round(r.height);
      wctx.fillRect(x, y, w, 1); wctx.fillRect(x, y + h - 1, w, 1);
      wctx.fillRect(x, y, 1, h); wctx.fillRect(x + w - 1, y, 1, h);
    };
    for (const o of this.getObstacles()) outline(o, "#ff4a4a");
    outline(this.level.player.getHitbox(), "#3ef0ff");
  }

  /** Fundido a negro y tarjeta "Entering Sub-level 1.1: The Awakening". */
  #renderTransition() {
    const tr = this.transition;
    // Aparición inicial de la pantalla de título desde negro
    let alpha = this.mode === "title" && !tr ? Math.max(0, 1 - this.time / 1.0) : 0;
    if (tr) alpha = tr.phase === "out" ? tr.t / FADE_OUT : tr.phase === "card" ? 1 : 1 - tr.t / FADE_IN;
    if (alpha <= 0) return;

    const { ctx } = this;
    const cw = this.canvas.width, ch = this.canvas.height;
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, cw, ch);

    if (tr && tr.phase === "card") {
      const a = Math.min(1, tr.t / 0.5) * Math.min(1, (CARD_TIME - tr.t) / 0.4);
      const float = Math.sin(tr.t * 2.2) * ch * 0.012;
      const fs = Math.max(10, Math.round(ch * 0.04));
      ctx.globalAlpha = Math.max(0, a);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `${Math.round(fs * 0.45)}px ${FONT}`;
      ctx.fillStyle = "#9c7416";
      ctx.fillText(`— SUB-LEVEL ${LEVEL.id} —`, cw / 2, ch * 0.4);
      ctx.font = `${fs}px ${FONT}`;
      ctx.shadowColor = "rgba(227, 179, 65, 0.55)";
      ctx.shadowBlur = fs * 0.6;
      ctx.fillStyle = "#fbe7a1";
      ctx.fillText(`Entering Sub-level ${LEVEL.id}:`, cw / 2, ch * 0.5 + float);
      ctx.fillStyle = "#e3b341";
      ctx.fillText(LEVEL.name, cw / 2, ch * 0.5 + fs * 1.7 + float);
    }
    ctx.restore();
  }
}

/* ======================================================================
   NÚCLEO COMPARTIDO DEL JUEGO PRINCIPAL (index.html)
   ----------------------------------------------------------------------
   FixedTimestep   Bucle a 60 FPS: la simulación avanza en pasos fijos de 1/60 s (acumulador)
                   y se dibuja una vez por frame del navegador. Así la física de los fragmentos,
                   el balanceo de la vegetación y los personajes llevan siempre el mismo ritmo,
                   aunque el monitor sea de 144 Hz o haya un tirón.
   YSortLayer      Capa de ordenación por profundidad: personajes, árboles, casas, rocas y
                   fragmentos de destrucción entran en la misma lista y se pintan por su base
                   (y), de modo que nada se solapa mal.
   AtmosphereTint  Filtro gótico del clima del mapa: cuando Abel se acerca a un jefe (Rufus,
                   Shela o el Gólem) el entorno se enfría y se tiñe de carmesí, se desatura y
                   el borde de la pantalla late; el HUD y el minimapa reciben el aviso.
   ====================================================================== */

export class FixedTimestep {
  /**
   * @param {{update:(dt:number,t:number)=>void, render:(t:number,alpha:number)=>void, step?:number, maxSteps?:number}} o
   */
  constructor({ update, render, step = 1 / 60, maxSteps = 5 }) {
    this.update = update; this.render = render; this.step = step; this.maxSteps = maxSteps;
    this.acc = 0; this.last = 0; this.time = 0; this.running = false; this.fps = 60; this.stepsThisFrame = 0;
    this.frame = this.frame.bind(this);
  }
  start() { if (this.running) return; this.running = true; requestAnimationFrame(this.frame); }
  stop() { this.running = false; }
  frame(ts) {
    if (!this.running) return;
    const dt = this.last ? Math.min(0.25, (ts - this.last) / 1000) : 0;
    this.last = ts;
    this.acc += dt;
    let n = 0;
    while (this.acc >= this.step && n < this.maxSteps) { this.time += this.step; this.update(this.step, this.time); this.acc -= this.step; n++; }
    if (n === this.maxSteps) this.acc = 0;                 // no intentar recuperar tirones largos
    this.stepsThisFrame = n;
    if (dt > 0) this.fps += (1 / dt - this.fps) * 0.05;
    this.render(this.time, this.acc / this.step);
    requestAnimationFrame(this.frame);
  }
}

export class YSortLayer {
  constructor() { this.items = []; }
  begin() { this.items.length = 0; }
  add(by, type, ref) { this.items.push({ by, type, ref }); }
  /** Ordena por profundidad (estable) y llama a draw(item) para cada elemento. */
  flush(draw) {
    const arr = this.items;
    arr.forEach((it, i) => { it.i = i; });
    arr.sort((a, b) => a.by - b.by || a.i - b.i);
    for (const it of arr) draw(it);
  }
}

export class AtmosphereTint {
  constructor() { this.k = 0; this.target = 0; this.pulse = 0; this.onChange = null; this._on = false; }
  setTarget(v) { this.target = Math.max(0, Math.min(1, v)); }
  update(dt) {
    this.k += (this.target - this.k) * Math.min(1, dt * 2.4);
    this.pulse += dt;
    const on = this.k > 0.3;
    if (on !== this._on) { this._on = on; this.onChange?.(on, this.k); }
  }
  /** Dibuja sobre el lienzo ya compuesto (en píxeles de pantalla). */
  draw(ctx, w, h) {
    const k = this.k;
    if (k < 0.02) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "saturation";             // desatura el entorno
    ctx.globalAlpha = 0.45 * k;
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "multiply";               // filtro carmesí-violeta gótico
    ctx.globalAlpha = 0.5 * k;
    ctx.fillStyle = "#b86a9a";
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";
    const beat = 0.7 + 0.3 * Math.sin(this.pulse * 3.2);
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
    g.addColorStop(0, "rgba(60,0,20,0)");
    g.addColorStop(1, `rgba(90,0,30,${0.55 * k * beat})`);
    ctx.globalAlpha = 1;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}
