/**
 * SpriteRenderer · animación direccional y sombreado avanzado
 * -----------------------------------------------------------
 * Dibuja personajes píxel a píxel a partir de matrices de color.
 *
 * Cada sprite registrado en SPRITES define:
 *   - palette / outlines / ramps : colores, contorno selectivo y rampas de luz.
 *   - directions : una matriz base por dirección (down, up, left) y la lista de
 *     operaciones que generan sus fotogramas de caminata. "right" se obtiene
 *     reflejando "left" en horizontal.
 *   - regions : franjas para la respiración (pelo y cabeza siguen al pecho).
 *
 * Los fotogramas se construyen y hornean bajo demanda y se guardan en caché:
 * cada frame del juego solo recorta y copia imágenes ya resueltas.
 */

const TRANSPARENT = ".";

/* ======================================================================
   MATRICES DE ABEL (32×40, luz arriba-izquierda)
   ====================================================================== */

const ABEL_DOWN = [
  ".............O.....O............", //  0 picos del pelo
  "............OWO...OhO....O......",
  "......O....OWhO..OhsO...OsO.....",
  "......OO...OWhhO.OhhsO.OhsO.....",
  ".......OO.OWhhhsOhhhsOOhhsO.....",
  "......OhWWhWhhhsshhhhsshssO.....", //  5 banda de brillo
  ".....OhWWhhhWhhhshhhhhshhssO....",
  "....OhWhhhhhhWhhhshhhhhshssdO...",
  "....OhhhhhshhhhhshhhhhshssddO...",
  "...OhhhhshhhshhhhshhhshssdddO...",
  "...OhhhshhshhshhhshhshssddddO...", // 10 flequillo
  "...OhhshssQhsQhhsQhsQssdsdddO...", //    sombra proyectada en la frente
  "...OhhssdQpppQqssqQpppQdsdddO...", //    párpados
  "...OhhssdkyggkkkkkkyggqdsdddO...", //    píxel blanco de brillo
  "...OhhhsdkYYYkkKkkkYYYqdddddO...",
  "....OhssdkkqkkkKqkkkqkqddddO....", // 15 nariz
  ".....OhsddkkkkkQQkkkqqddddO.....", //    boca seria
  "......OsO..XkkkkkqqqX..OdO......",
  ".............XQqqQX.............", //    cuello
  ".........XkUvVkkkqVuUqX.........", //    chaleco
  ".......XKkUvVVVqqVVVuUqqX.......", // 20
  ".......XKkUvVVVVVVuuuUqqX.......",
  ".......XKkUvVVVuVVuuuUqqX.......",
  ".......XkkUvVVVVVVVuuUqQX.......",
  ".......XkkUvVVVVVVVuuUqQX.......",
  ".......XkkNrRRRRRRRmmNqQX.......", // 25 sudadera atada
  "......XKkkNRRRmrrmRmmNqqqX......",
  "......XkkqNmRRmrrmRmMNqqQX......",
  ".......XXXNMmNrRRmNmMNXXX.......",
  "........NmMZaANRmNAzZMmN........", //    nudo y faldones
  "........NMMZaAANmNAzZMMN........", // 30
  ".........NMZaAAANAAzZMN.........",
  "..........NZaAAAzAAzZN..........",
  "...........ZaAAzZAAzZ...........",
  "..........ZaaAzzZaAzzZ..........",
  "..........ZzzzzZZzzzzZ..........", // 35
  "..........xbBBx..xbBBx..........", //    botas
  ".........xbbBBx..xbBBBx.........",
  ".........xccccx..xccccx.........",
  ".........xxxxxx..xxxxxx.........",
];

/** Espalda: el pelo cubre la nuca y el faldón de la sudadera cae por detrás. */
const ABEL_UP = [
  ".............O.....O............",
  "............OWO...OhO....O......",
  "......O....OWhO..OhsO...OsO.....",
  "......OO...OWhhO.OhhsO.OhsO.....",
  ".......OO.OWhhhsOhhhsOOhhsO.....",
  "......OhWWhWhhhsshhhhsshssO.....",
  ".....OhWWhhhWhhhshhhhhshhssO....",
  "....OhWhhhhhhWhhhshhhhhshssdO...",
  "....OhhhhhshhhhhshhhhhshssddO...",
  "...OhhhhshhhshhhhshhhshssdddO...",
  "...OhhhshhshhshhhshhshssddddO...",
  "...OhhshsshhshhhshhshssdsdddO...", // 11 mechones de la nuca
  "...OhhsshhshhshhhsshhssdsdddO...",
  "...OhhshhshhshhhshhshhsdddddO...",
  "...OhhhshhsshhhshhsshhsdddddO...",
  "....OhsshhshhhshhshhsddddddO....", // 15
  ".....OhsshshhhshhshssdddddO.....",
  "......OsOOdshhhhhhssdOOsdO......", //    puntas de la nuca
  ".............XqqqqX.............", //    cuello
  ".........XkUvVVVVVVuUqX.........", //    espalda del chaleco
  ".......XKkUvVVVVVVVVuUqqX.......", // 20
  ".......XKkUvVVVVVVuuuUqqX.......",
  ".......XKkUvVVVuuVVuuUqqX.......", //    columna
  ".......XkkUvVVVVVVVuuUqQX.......",
  ".......XkkUvVVVVVVVuuUqQX.......",
  ".......XkkNrRRRRRRRmmNqQX.......", // 25 cinturón de la sudadera
  "......XKkkNRRRRRRRRmmNqqqX......",
  "......XkkqNrRRRRRRRmMNqqQX......",
  ".......XXXNrRRRmRRRmMNXXX.......",
  "........NrRRRmRRRRmRmmMN........", //    faldón trasero
  "........NrRRmRRRRmRRmMMN........", // 30
  ".........NRRmRRRmRRRmMN.........",
  "..........NMNZaAAzAZNMN.........",
  "...........ZaAAzZAAzZ...........",
  "..........ZaaAzzZaAzzZ..........",
  "..........ZzzzzZZzzzzZ..........", // 35
  "..........xbBBx..xbBBx..........",
  ".........xbbBBx..xbBBBx.........",
  ".........xccccx..xccccx.........",
  ".........xxxxxx..xxxxxx.........",
];

/** Perfil mirando a la izquierda: picos barridos hacia atrás, un ojo, nariz y brazo cercano. */
const ABEL_LEFT = [
  "..............O.....O...........",
  ".............OWO...OhO..O.......",
  "...........OWhO..OhhO..OsO......",
  "..........OWhhO.OhhsO.OhsO......",
  ".........OWhhhsOhhhsOOhhsOO.....",
  "........OhWhhhhshhhhsshhssdO....", //  5
  ".......OhWWhhhhhshhhhhshhssddO..",
  "......OhWhhhhhhhhshhhhshhsssddO.",
  "......OhhhhhhhhhshhhhshhssddddO.",
  ".....OhhhhhhhshhhhshhhshssdddO..",
  ".....OhhshhshhhshhhshhsssdddO...", // 10 flequillo
  "....OhsQqkshhhshhhshhssddddO....", //    sombra del flequillo en la frente
  "....XkkppQshhhshhhshhssdddddO...", //    párpado
  "....XkkygQshhhshhhshhssdddddO...", //    brillo blanco del ojo
  "...XKkkYYqshhhshhhshhssddddO....", //    nariz
  "....XkkkkqshhshhhshhssddddO.....", // 15
  "....XkQkkqssshhhshssddddO.......", //    boca
  ".....XkkqqXOsshhssdddO..........",
  ".........XqqQX..................", //    cuello
  "........XUvVVVVVVuUX............", //    hombro
  "........UvVkKkqVVuuU............", // 20 brazo cercano
  "........UvVkKkqVVuuU............",
  "........UvVkKkqVVuuU............",
  "........UvVkkkqVuuuU............",
  "........UvVkkkqVuuuU............",
  "........NrRkkkqRmmMN............", // 25 sudadera
  "........NRRkKkqRmMMN............", //    mano
  "........NmRXXXXRmMMN............",
  "........NMmNrRmNmMMN............", //    nudo lateral
  ".......NrmNZaAAzZNmMN...........", //    manga colgando y faldón
  ".......NmNZaAAAzZNmMN...........", // 30
  "........NNZaAAAzzZNMN...........",
  "..........ZaAAAzzZ..............",
  "..........ZaAAzZzZ..............",
  "..........ZaAAzZzzZ.............",
  "..........ZzzzzZzzZ.............", // 35
  ".........xbBBxxBBx..............",
  "........xbbBBBxBBBx.............",
  "........xccccccccx..............",
  "........xxxxxxxxxx..............",
];

/** Piernas abiertas en perfil (zancada), filas 32–39. */
const SIDE_STRIDE = [
  ".........ZaAAAzzzZ..............",
  "........ZaAAzZZzzzZ.............",
  ".......ZaAAzZ..ZzzzZ............",
  ".......ZzzzZ....ZzzZ............",
  "......xbBBx.....xBBx............",
  ".....xbbBBx.....xBBBx...........",
  ".....xccccx.....xcccx...........",
  ".....xxxxxx.....xxxxx...........",
];

/* ======================================================================
   REGISTRO DE SPRITES
   ====================================================================== */

/** Operaciones de caminata compartidas por frente y espalda. */
const FRONT_WALK = [
  // Paso A: pierna izquierda levantada 1 px y mano derecha adelantada
  [
    { type: "shift", x0: 9, x1: 15, y0: 33, y1: 39, dx: 0, dy: -1 },
    { type: "shift", x0: 22, x1: 25, y0: 25, y1: 28, dx: 0, dy: -1 },
  ],
  // Paso B: pierna derecha levantada y mano izquierda adelantada
  [
    { type: "shift", x0: 16, x1: 23, y0: 33, y1: 39, dx: 0, dy: -1 },
    { type: "shift", x0: 6, x1: 9, y0: 25, y1: 28, dx: 0, dy: -1 },
  ],
];

export const SPRITES = Object.freeze({
  abel: {
    width: 32,
    height: 40,
    palette: {
      // Cabello blanco: blancos fríos con sombras gris-azuladas abajo
      W: "#F7F9FF", h: "#DDE3F0", s: "#A9B3CC", d: "#6F7A99", O: "#3E4563",
      // Piel
      K: "#FFE3C8", k: "#F2C29E", q: "#D48F72", Q: "#A8616A", X: "#6E3A45",
      // Ojos dorados con píxel blanco de brillo
      y: "#FFFFFF", Y: "#F5C542", g: "#C7861E", p: "#5A2E1A",
      // Chaleco oscuro
      v: "#5A5F73", V: "#3A3D4D", u: "#262833", U: "#15161D",
      // Sudadera roja
      r: "#F2665A", R: "#C9303A", m: "#8E1E35", M: "#5E1230", N: "#3F0A24",
      // Pantalón y botas
      a: "#A7ADB8", A: "#7E8492", z: "#5A5F6C", Z: "#33363F",
      b: "#4A4A55", B: "#2E2E38", x: "#17171E", c: "#8A8A96",
    },
    outlines: { O: "d", X: "q", U: "u", N: "m", Z: "z", x: "B" },
    ramps: [["u", "V", "v"], ["M", "m", "R", "r"], ["q", "k", "K"]],
    lightRows: [19, 31],
    regions: [
      { name: "hair",  from: 0,  to: 10, delay: 0.22, breathes: true },
      { name: "head",  from: 11, to: 18, delay: 0.12, breathes: true },
      { name: "torso", from: 19, to: 28, delay: 0,    breathes: true },
      { name: "legs",  from: 29, to: 39, delay: 0,    breathes: false },
    ],
    directions: {
      down: { pixels: ABEL_DOWN, walk: FRONT_WALK },
      up: { pixels: ABEL_UP, walk: FRONT_WALK },
      left: {
        pixels: ABEL_LEFT,
        walk: [
          // Paso A: zancada y brazo adelantado (hacia la izquierda)
          [{ type: "rows", from: 32, rows: SIDE_STRIDE }, { type: "shift", x0: 11, x1: 14, y0: 20, y1: 27, dx: -1, dy: 0, fill: "V" }],
          // Paso B: zancada y brazo atrasado
          [{ type: "rows", from: 32, rows: SIDE_STRIDE }, { type: "shift", x0: 11, x1: 14, y0: 20, y1: 27, dx: 1, dy: 0, fill: "V" }],
        ],
      },
      right: { mirrorOf: "left" },
    },
  },
});

/** Ciclo de caminata: 0 = de pie (pasada), 1 = paso A, 2 = paso B. */
export const WALK_CYCLE = Object.freeze([0, 1, 0, 2]);

/* ======================================================================
   CONSTRUCCIÓN DE FOTOGRAMAS
   ====================================================================== */

/** Aplica operaciones de animación sobre una matriz y devuelve una nueva. */
function applyOps(rows, ops) {
  const grid = rows.map((r) => r.split(""));
  const H = grid.length, W = grid[0].length;
  for (const op of ops) {
    if (op.type === "rows") {
      op.rows.forEach((row, i) => { grid[op.from + i] = row.split(""); });
    } else if (op.type === "shift") {
      // Copia el bloque, lo borra (o lo rellena) y lo pega desplazado
      const block = [];
      for (let y = op.y0; y <= op.y1; y++) for (let x = op.x0; x <= op.x1; x++) {
        if (grid[y][x] !== TRANSPARENT) block.push([x, y, grid[y][x]]);
      }
      for (const [x, y] of block) grid[y][x] = op.fill ?? TRANSPARENT;
      for (const [x, y, ch] of block) {
        const nx = x + op.dx, ny = y + op.dy;
        if (nx >= 0 && ny >= 0 && nx < W && ny < H) grid[ny][nx] = ch;
      }
    }
  }
  return grid.map((r) => r.join(""));
}

/** "#RRGGBB" → [r, g, b] */
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export class SpriteRenderer {
  /** @param {CanvasRenderingContext2D} ctx  Contexto del mundo (resolución lógica). */
  constructor(ctx) {
    this.ctx = ctx;
    this.frameCache = new Map(); // "nombre:dirección:frame" → matriz de filas
    this.bakeCache = new Map();  // "nombre:dirección:frame:variante" → imagen
  }

  clear(color = "#07040c") {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
  }

  /**
   * Matriz de un fotograma concreto.
   * @param {string} name
   * @param {"down"|"up"|"left"|"right"} direction
   * @param {number} frame  0 = base, 1 = paso A, 2 = paso B.
   */
  getFrameRows(name, direction, frame) {
    const key = `${name}:${direction}:${frame}`;
    if (this.frameCache.has(key)) return this.frameCache.get(key);

    const def = SPRITES[name];
    const dir = def.directions[direction];
    let rows;
    if (dir.mirrorOf) {
      rows = this.getFrameRows(name, dir.mirrorOf, frame).map((r) => [...r].reverse().join(""));
    } else {
      rows = frame === 0 ? dir.pixels : applyOps(dir.pixels, dir.walk[frame - 1]);
    }
    this.frameCache.set(key, rows);
    return rows;
  }

  /** Imagen horneada de un fotograma con su variante de luz. */
  getSprite(name, direction, frame, variant) {
    const key = `${name}:${direction}:${frame}:${variant}`;
    if (!this.bakeCache.has(key)) {
      this.bakeCache.set(key, SpriteRenderer.bake(SPRITES[name], this.getFrameRows(name, direction, frame), variant));
    }
    return this.bakeCache.get(key);
  }

  /**
   * Resuelve una matriz en un canvas nativo con contorno selectivo e
   * iluminación por variante ("inhale" recalcula la luz del traje al subir el pecho).
   */
  static bake(def, pixels, variant) {
    const { width: W, height: H, palette, outlines = {}, ramps = [], lightRows } = def;
    const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? TRANSPARENT : pixels[y][x]);

    const rampOf = new Map();
    ramps.forEach((ramp, ri) => ramp.forEach((k, i) => rampOf.set(k, [ri, i])));
    const sameRamp = (a, b) => rampOf.has(a) && rampOf.has(b) && rampOf.get(a)[0] === rampOf.get(b)[0];
    const isLitEdge = (x, y) =>
      (at(x, y - 1) === TRANSPARENT || at(x - 1, y) === TRANSPARENT) && at(x, y + 1) !== TRANSPARENT && at(x + 1, y) !== TRANSPARENT;

    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    const image = ctx.createImageData(W, H);

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let key = pixels[y][x];
        if (key === TRANSPARENT) continue;

        if (outlines[key] && isLitEdge(x, y)) key = outlines[key];

        if (variant === "inhale" && lightRows && y >= lightRows[0] && y <= lightRows[1] && rampOf.has(key)) {
          const [ri, i] = rampOf.get(key);
          const ramp = ramps[ri];
          if (!sameRamp(key, at(x, y - 1)) && x < W * 0.6) key = ramp[Math.min(ramp.length - 1, i + 1)];
          else if (!sameRamp(key, at(x, y + 1))) key = ramp[Math.max(0, i - 1)];
        }

        const color = palette[key];
        if (!color) throw new Error(`SpriteRenderer: clave "${key}" desconocida en (${x}, ${y})`);
        const [r, g, b] = hexToRgb(color);
        const p = (y * W + x) * 4;
        image.data[p] = r;
        image.data[p + 1] = g;
        image.data[p + 2] = b;
        image.data[p + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
    return { canvas, width: W, height: H };
  }

  /**
   * Dibuja un sprite por franjas con su desplazamiento (respiración / rebote).
   * @param {string} name
   * @param {{direction: string, frame: number, variant: string}} pose
   * @param {number} x
   * @param {number} y
   * @param {{from:number, to:number, offset:number}[]} regions  De arriba abajo.
   */
  drawSprite(name, pose, x, y, regions) {
    const sprite = this.getSprite(name, pose.direction, pose.frame, pose.variant);
    const { ctx } = this;
    const px = Math.round(x), py = Math.round(y), w = sprite.width;

    for (let i = regions.length - 1; i >= 0; i--) {
      const r = regions[i];
      const rows = r.to - r.from + 1;
      ctx.drawImage(sprite.canvas, 0, r.from, w, rows, px, py + r.from + r.offset, w, rows);
      const below = regions[i + 1];
      if (below && below.offset > r.offset) {
        for (let k = r.offset + 1; k <= below.offset; k++) {
          ctx.drawImage(sprite.canvas, 0, r.to, w, 1, px, py + r.to + k, w, 1);
        }
      }
    }
  }

  /** Sombra de contacto pixelada. */
  drawShadow(cx, cy, rx, ry, color = "rgba(10, 14, 6, 0.5)") {
    const { ctx } = this;
    ctx.fillStyle = color;
    for (let dy = -ry; dy <= ry; dy++) {
      const half = Math.round(rx * Math.sqrt(1 - (dy * dy) / ((ry + 0.5) * (ry + 0.5))));
      ctx.fillRect(Math.round(cx - half), Math.round(cy + dy), half * 2, 1);
    }
  }
}

/* ======================================================================
   ÁRBOL DE ESTADOS DE COMBATE E IMPACTO (juego principal, sprites 16×20)
   ----------------------------------------------------------------------
   FighterAnim es una máquina de estados que devuelve, cada frame, una *pose*
   (desplazamientos por partes del cuerpo, balanceo de pelo y ropa, destello
   blanco, tinte de carga…). El dibujado lo hace CharacterRig.drawRig().

     idle     Respiración con retardo cabeza→pecho y parpadeo; pelo y ropa al viento.
     guard    Postura de guardia dinámica (combat idle): bombeo rítmico, piernas abiertas,
              puños arriba; pelo y ropa reaccionan al viento.
     walk     Ciclo de 8 fotogramas con rebote del torso y pelo/ropa a contramarcha.
     punch    Combo de 3 golpes (jab, cruzado, gancho): preparación → impacto → recuperación.
     charge   Carga de habilidad: agachado, brazos arriba, tinte celestial parpadeante y aura.
     release  Liberación de la Ráfaga Sagrada: brazos abiertos y destello.
     hurt     Impacto/retroceso: destello BLANCO puro, inclinación hacia atrás; el
              desplazamiento decelerado lo aplica el juego con easeOutCubic.
     dash     Esquiva: inclinación hacia delante, zancada abierta.
     die      Caída: rota 90° y se desvanece.
   ====================================================================== */

export const easeOutCubic = (t) => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
export const FACING = Object.freeze({ right: [1, 0], left: [-1, 0], down: [0, 1], up: [0, -1] });

const silCache = new WeakMap();
/** Silueta de color plano (para destellos blancos). Cacheada por imagen y color. */
export function silhouette(img, color = "#ffffff") {
  let m = silCache.get(img);
  if (!m) silCache.set(img, (m = new Map()));
  let s = m.get(color);
  if (!s) {
    s = document.createElement("canvas");
    s.width = img.width; s.height = img.height;
    const c = s.getContext("2d");
    c.drawImage(img, 0, 0);
    c.globalCompositeOperation = "source-in";
    c.fillStyle = color;
    c.fillRect(0, 0, s.width, s.height);
    m.set(color, s);
  }
  return s;
}

const WALK8 = [
  // [piernas, rebote del torso]
  ["halfA", 0], ["A", -1], ["halfA", 0], ["stand", 0], ["halfB", 0], ["B", -1], ["halfB", 0], ["stand", 0],
];

export class FighterAnim {
  constructor() {
    this.clock = Math.random() * 10;
    this.walkT = 0;
    this.moving = false;
    this.guard = false;
    this.wind = 0;
    this.speed = 1;
    this.punchN = 0;       // golpe del combo (0..2)
    this.punchT = 0;       // >0 mientras dura el golpe
    this.comboAt = -9;
    this.hurtT = 0;
    this.dashT = 0;
    this.charge = 0;       // 0 = sin cargar; >0 segundos cargando
    this.releaseT = 0;
    this.dieT = -1;
    this.blinkT = 2 + Math.random() * 3;
    this.blink = 0;
    this.dir = "down";
  }

  /** @param {"punch"|"charge"|"release"|"cancel"|"hurt"|"dash"|"die"|"revive"} name */
  trigger(name, d = {}) {
    if (name === "punch") {
      this.punchN = (this.clock - this.comboAt < 0.9) ? (this.punchN + 1) % 3 : 0;
      this.comboAt = this.clock;
      this.punchT = 0.26;
    } else if (name === "charge") { this.charge = 0.0001; }
    else if (name === "release") { this.charge = 0; this.releaseT = 0.3; }
    else if (name === "cancel") { this.charge = 0; }
    else if (name === "hurt") { this.hurtT = 0.42; this.charge = 0; this.punchT = 0; }
    else if (name === "dash") { this.dashT = d.t ?? 0.2; }
    else if (name === "die") { this.dieT = 0; }
    else if (name === "revive") { this.dieT = -1; this.hurtT = 0; }
  }

  /** @param {{moving:boolean, speed?:number, guard?:boolean, wind?:number, dir?:string}} i */
  update(dt, i) {
    this.clock += dt;
    this.moving = !!i.moving; this.guard = !!i.guard; this.wind = i.wind ?? 0; this.speed = i.speed ?? 1; this.dir = i.dir ?? this.dir;
    if (this.moving) this.walkT += dt * (0.7 + 0.3 * this.speed); else this.walkT = 0;
    this.punchT = Math.max(0, this.punchT - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.dashT = Math.max(0, this.dashT - dt);
    this.releaseT = Math.max(0, this.releaseT - dt);
    if (this.charge > 0) this.charge += dt;
    if (this.dieT >= 0) this.dieT += dt;
    this.blinkT -= dt;
    if (this.blinkT <= 0) { this.blink = 0.12; this.blinkT = 2.2 + Math.random() * 3.4; }
    this.blink = Math.max(0, this.blink - dt);
  }

  get stateName() {
    if (this.dieT >= 0) return "die";
    if (this.hurtT > 0) return "hurt";
    if (this.releaseT > 0) return "release";
    if (this.charge > 0) return "charge";
    if (this.punchT > 0) return "punch";
    if (this.dashT > 0) return "dash";
    if (this.moving) return "walk";
    if (this.guard) return "guard";
    return "idle";
  }

  /** Pose para el frame actual. */
  pose() {
    const dir = this.dir, [fx, fy] = FACING[dir];
    const st = this.stateName;
    const p = {
      state: st, legs: "stand", legsDy: 0, legsDx: 0, torsoDy: 0, torsoDx: 0, headDy: 0, headDx: 0, bodyDx: 0, bodyDy: 0,
      hair: 0, cloth: 0, flash: 0, tint: null, arms: null, rot: 0, alpha: 1, aura: 0, blink: this.blink > 0,
    };
    const c = this.clock;
    // Viento: el pelo y la ropa siguen la brisa; al caminar se arrastran hacia atrás
    const w = this.wind;
    let hair = w > 0.55 ? 1 : w < -0.55 ? -1 : 0;
    let cloth = w + Math.sin(c * 2.2 + 1.2) * 0.35 > 0.6 ? 1 : w + Math.sin(c * 2.2 + 1.2) * 0.35 < -0.6 ? -1 : 0;
    if (this.moving || st === "dash") {
      hair = fx !== 0 ? -fx : (Math.sin(c * 9) > 0.2 ? 1 : 0);
      cloth = fx !== 0 ? -fx : 0;
    }
    p.hair = hair; p.cloth = cloth;

    if (st === "idle") {
      const b = Math.sin(c * 2.1);
      p.torsoDy = b > 0.45 ? -1 : 0;
      p.headDy = Math.sin(c * 2.1 - 0.9) > 0.5 ? -1 : 0;
    } else if (st === "guard") {
      const s = Math.sin(c * 8.4);
      p.legs = s > 0 ? "wideA" : "wideB";
      p.torsoDy = s > 0.2 ? 1 : 0;
      p.headDy = s > 0.2 ? 1 : 0;
      p.arms = { type: "guard" };
    } else if (st === "walk") {
      const idx = Math.floor(this.walkT * 11) % 8;
      const [legs, bob] = WALK8[idx];
      p.legs = legs; p.torsoDy = bob; p.headDy = bob && idx % 2 === 1 ? -1 : 0;
      p.torsoDx = fx !== 0 ? (idx === 1 || idx === 5 ? fx : 0) : 0;
    } else if (st === "punch") {
      const k = 1 - this.punchT / 0.26;                 // 0..1
      const phase = k < 0.2 ? "wind" : k < 0.55 ? "strike" : "recover";
      p.arms = { type: "punch", n: this.punchN, phase, side: this.punchN % 2 };
      p.legs = "wideA";
      p.bodyDx = Math.round(fx * (phase === "strike" ? 2 : phase === "wind" ? -1 : 1));
      p.bodyDy = Math.round(fy * (phase === "strike" ? 2 : phase === "wind" ? -1 : 1)) - (this.punchN === 2 && phase === "strike" ? 1 : 0);
      p.torsoDx = Math.round(fx * (phase === "strike" ? 1 : 0));
      p.headDx = Math.round(fx * (phase === "strike" ? 1 : 0));
      p.torsoDy = phase === "wind" ? 1 : 0;
    } else if (st === "charge") {
      const s = Math.sin(c * 26);
      p.torsoDy = 1; p.headDy = 1; p.legs = "wideA";
      p.arms = { type: "raised" };
      p.bodyDx = s > 0.85 ? 1 : s < -0.85 ? -1 : 0;
      const pulse = 0.2 + 0.2 * (Math.sin(c * 18) * 0.5 + 0.5);
      p.tint = { color: "#fff3c0", alpha: Math.min(0.55, pulse + this.charge * 0.25) };
      p.aura = Math.min(1, this.charge / 0.5);
    } else if (st === "release") {
      const k = 1 - this.releaseT / 0.3;
      p.arms = { type: "spread" };
      p.bodyDy = k < 0.5 ? -2 : -1;
      p.legs = "wideB";
      p.tint = { color: "#ffffff", alpha: 0.6 * (1 - k) };
      p.aura = 1 - k;
    } else if (st === "hurt") {
      const k = 1 - this.hurtT / 0.42;
      p.flash = k < 0.14 ? 1 : Math.max(0, 1 - (k - 0.14) / 0.2) * 0.7;          // blanco puro al principio, luego se desvanece
      p.torsoDx = -fx; p.headDx = -fx * 2; p.headDy = k < 0.5 ? -1 : 0;
      p.arms = { type: "flail" };
      p.legs = "wideA";
      p.blink = true;
    } else if (st === "dash") {
      p.torsoDx = fx; p.headDx = fx * 2; p.headDy = fy > 0 ? 1 : 0; p.torsoDy = fy > 0 ? 1 : 0;
      p.legs = Math.floor(c * 30) % 2 ? "wideA" : "wideB";
      p.bodyDx = fx; p.bodyDy = fy;
      p.arms = { type: "back" };
    } else if (st === "die") {
      const k = Math.min(1, this.dieT / 0.5);
      p.rot = -Math.PI / 2 * easeOutCubic(k) * (fx >= 0 ? 1 : -1);
      p.alpha = this.dieT < 0.7 ? 1 : Math.max(0, 1 - (this.dieT - 0.7) / 0.35);
      p.flash = Math.sin(this.dieT * 40) > 0.4 ? 0.5 : 0;
      p.blink = true; p.arms = { type: "flail" };
    }
    return p;
  }
}
