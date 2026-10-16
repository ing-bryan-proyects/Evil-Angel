/**
 * Background · Whispering Forest
 * ------------------------------
 * Genera el escenario de forma algorítmica con una semilla fija:
 *
 *   1. Capa de suelo (estática, horneada una vez): hierba verde oliva con
 *      manchas fundidas por dithering Bayer, sendero de tierra, matas, tréboles,
 *      motas de tierra, guijarros, flores y las sombras de los obstáculos.
 *   2. Obstáculos (props): árboles frondosos y rocas musgosas dibujados píxel a
 *      píxel. NO se hornean en el suelo, porque deben ordenarse por profundidad
 *      junto a Abel: el motor los recibe con getProps() y los mezcla con las entidades.
 *   3. Hitboxes: cada obstáculo guarda el rectángulo exacto de su base (tronco o
 *      roca). getObstacles() devuelve esa lista para las colisiones.
 */

const PALETTE = Object.freeze({
  grassDeep: "#4A6629", grassDark: "#5A7A31", grassBase: "#6B8E3A", grassLight: "#7FA046", grassHigh: "#97B957",
  vegDark: "#3D5823", dirtSpeck: "#8B6B42", dirtSpeck2: "#6A4F31",
  pathLight: "#D2B184", pathBase: "#BF9A6B", pathDark: "#A07C52", pathEdge: "#7E6142",
  pebble: "#B4AD9B", pebbleDark: "#6E6A5C",
  petal: "#EDE7D2", petalPink: "#E6A9B8", pollen: "#E2C25B",
  groundShadow: "rgba(28, 44, 14, 0.42)",
});

// Copa de los árboles: verdes más fríos y profundos que la hierba para que destaquen
const LEAVES = ["#22381A", "#2F4F23", "#3E6629", "#4F7F31", "#67993C", "#86B44D"]; // contorno → brillo
const BARK = { outline: "#2E1F14", shadow: "#4A3220", base: "#6B4A2E", light: "#8A6440" };
const STONE = ["#2A2925", "#3F3D38", "#5E5B53", "#7D7A70", "#9A968A", "#B9B5A7"];      // contorno → brillo
const MOSS = ["#3E5A24", "#5E8A36", "#7FA046"];

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((row) => row.map((v) => v / 16 - 0.5));

/** Generador pseudoaleatorio con semilla (mulberry32). */
function createRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Ruido de valor 2D con interpolación suave. */
function createValueNoise(rng, cell) {
  const cache = new Map();
  const corner = (cx, cy) => {
    const key = `${cx},${cy}`;
    if (!cache.has(key)) cache.set(key, rng());
    return cache.get(key);
  };
  const smooth = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const gx = x / cell, gy = y / cell;
    const x0 = Math.floor(gx), y0 = Math.floor(gy);
    const tx = smooth(gx - x0), ty = smooth(gy - y0);
    const top = corner(x0, y0) + (corner(x0 + 1, y0) - corner(x0, y0)) * tx;
    const bottom = corner(x0, y0 + 1) + (corner(x0 + 1, y0 + 1) - corner(x0, y0 + 1)) * tx;
    return top + (bottom - top) * ty;
  };
}

/** Crea un canvas pequeño y un helper para pintar píxeles en él. */
function pixelCanvas(w, h) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  const px = (color, x, y) => { ctx.fillStyle = color; ctx.fillRect(x, y, 1, 1); };
  return { canvas, ctx, px };
}

/* ======================================================================
   GENERADORES DE OBSTÁCULOS (píxel a píxel)
   ====================================================================== */

const TREE_W = 48, TREE_H = 60;

/**
 * Árbol frondoso estilo Potion Permit: copa redonda formada por varias masas,
 * sombreada por normal (luz arriba-izquierda) con dithering, festones de hojas
 * y contorno selectivo; tronco con raíces abiertas.
 * El punto base (pie del tronco) queda en (24, 59) del canvas.
 */
function makeTree(rng) {
  const { canvas, px } = pixelCanvas(TREE_W, TREE_H);
  const s = 0.88 + rng() * 0.2;
  const cx = 24;
  const blobs = [
    { x: cx, y: 22, r: 15 * s },
    { x: cx - 9 * s, y: 28, r: 10 * s },
    { x: cx + 9 * s, y: 28, r: 10 * s },
    { x: cx - 3, y: 12, r: 10 * s },
    { x: cx + 5, y: 15, r: 9 * s },
  ];
  // La masa dominante de cada píxel decide su normal
  const blobAt = (x, y) => {
    let best = null, bestDepth = 0;
    for (const b of blobs) {
      const depth = b.r - Math.hypot(x + 0.5 - b.x, y + 0.5 - b.y);
      if (depth > bestDepth) { bestDepth = depth; best = b; }
    }
    return best;
  };

  // --- Tronco y raíces ---
  const trunkTop = 32, base = TREE_H - 1;
  for (let y = trunkTop; y <= base; y++) {
    const flare = y >= base - 2 ? (y === base ? 3 : 2) : 0; // raíces que se abren
    const x0 = cx - 4 - flare, x1 = cx + 3 + flare;
    for (let x = x0; x <= x1; x++) {
      const edge = x === x0 || x === x1 || y === base;
      const t = (x - x0) / (x1 - x0);
      let c = t < 0.3 ? BARK.light : t < 0.7 ? BARK.base : BARK.shadow;
      if (y < trunkTop + 6) c = BARK.shadow;          // sombra que proyecta la copa
      px(edge ? BARK.outline : c, x, y);
    }
  }
  px(BARK.shadow, cx - 1, base - 6); px(BARK.shadow, cx, base - 5);   // veta de la corteza

  // --- Copa ---
  const inside = (x, y) => blobAt(x, y) !== null;
  for (let y = 0; y < TREE_H; y++) {
    for (let x = 0; x < TREE_W; x++) {
      const b = blobAt(x, y);
      if (!b) continue;
      const nx = (x + 0.5 - b.x) / b.r, ny = (y + 0.5 - b.y) / b.r;
      // Luz por normal + oscurecimiento hacia la base de la copa + tramado
      let light = -(nx * 0.55 + ny * 0.85) * 0.5 + 0.55 - (y / 40) * 0.35 + BAYER[y % 4][x % 4] * 0.18;
      let level = light < 0.18 ? 1 : light < 0.36 ? 2 : light < 0.58 ? 3 : light < 0.78 ? 4 : 5;

      const exposed = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      if (exposed) {
        const litEdge = (!inside(x, y - 1) || !inside(x - 1, y)) && inside(x, y + 1) && inside(x + 1, y);
        level = litEdge ? 2 : 0;                          // contorno selectivo
      }
      px(LEAVES[level], x, y);
    }
  }
  // Festones de hojas: pequeños arcos con brillo arriba y sombra debajo
  for (let i = 0; i < 26; i++) {
    const x = 6 + Math.floor(rng() * (TREE_W - 12)), y = 4 + Math.floor(rng() * 28);
    if (![[0, 0], [-1, 1], [0, 1], [1, 1], [0, -1]].every(([dx, dy]) => inside(x + dx, y + dy) && inside(x + dx - 1, y + dy) && inside(x + dx + 1, y + dy))) continue;
    const shade = y < 18 && x < cx + 4 ? 2 : 1;
    px(LEAVES[shade], x - 1, y + 1); px(LEAVES[shade], x, y + 1); px(LEAVES[shade], x + 1, y + 1);
    px(LEAVES[y < 20 ? 5 : 4], x, y);
  }
  // Algunas bayas oscuras como en la referencia
  for (let i = 0; i < 3; i++) {
    const x = 10 + Math.floor(rng() * 28), y = 12 + Math.floor(rng() * 16);
    if (inside(x, y) && inside(x + 1, y)) { px("#5A1E2E", x, y); px("#8E2E40", x + 1, y); }
  }

  // Extensión real de la copa (para el desvanecido cuando Abel pasa por detrás)
  let top = TREE_H, left = TREE_W, right = 0, bottom = 0;
  for (let y = 0; y < TREE_H; y++) for (let x = 0; x < TREE_W; x++) {
    if (!inside(x, y)) continue;
    top = Math.min(top, y); bottom = Math.max(bottom, y); left = Math.min(left, x); right = Math.max(right, x);
  }
  return { canvas, base: { x: cx, y: base }, canopy: { x: left, y: top, width: right - left + 1, height: bottom - top + 1 } };
}

const ROCK_W = 22, ROCK_H = 15;

/**
 * Roca musgosa: elipse con base plana sombreada por normal; el musgo crece en
 * la parte superior (donde cae la lluvia) con borde tramado.
 * El punto base queda en (11, 14) del canvas.
 */
function makeRock(rng) {
  const { canvas, px } = pixelCanvas(ROCK_W, ROCK_H);
  const rx = 8 + rng() * 2, ry = 5.5 + rng() * 1.2;
  const cx = 11, cy = ROCK_H - 1 - ry * 0.85;
  const inside = (x, y) => y <= ROCK_H - 1 && ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;

  for (let y = 0; y < ROCK_H; y++) {
    for (let x = 0; x < ROCK_W; x++) {
      if (!inside(x, y)) continue;
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
      const exposed = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1) || y === ROCK_H - 1;
      const light = -(nx * 0.6 + ny * 0.8) * 0.5 + 0.5 + BAYER[y % 4][x % 4] * 0.16;
      let color = STONE[light < 0.25 ? 1 : light < 0.45 ? 2 : light < 0.65 ? 3 : light < 0.82 ? 4 : 5];

      // Musgo en la parte superior, con borde irregular por dithering
      const mossLine = -0.15 + BAYER[y % 4][x % 4] * 0.5;
      if (ny < mossLine) color = MOSS[light > 0.7 ? 2 : light > 0.45 ? 1 : 0];

      if (exposed) {
        const litEdge = (!inside(x, y - 1) || !inside(x - 1, y)) && inside(x, y + 1) && inside(x + 1, y);
        color = litEdge ? (ny < mossLine ? MOSS[0] : STONE[1]) : STONE[0];
      }
      px(color, x, y);
    }
  }
  // Grieta y un par de guijarros sueltos de la propia roca
  px(STONE[1], cx + 2, cy); px(STONE[1], cx + 3, cy + 1); px(STONE[1], cx + 3, cy + 2);
  return { canvas, base: { x: cx, y: ROCK_H - 1 } };
}

/* ======================================================================
   BACKGROUND
   ====================================================================== */

export class Background {
  /**
   * @param {number} width   Ancho del mapa en píxeles lógicos.
   * @param {number} height  Alto del mapa.
   * @param {number} [seed]
   */
  constructor(width, height, seed = 2026) {
    this.width = width;
    this.height = height;

    /** Punto de aparición de Abel (esquina superior izquierda de su sprite 32×40). */
    this.spawnPoint = {
      x: Math.round(width / 2 - 16),
      y: Math.round(this.pathCenter(width / 2) - 52),
    };

    /** Puntos base (pies) donde aparecen los NPC; se mantienen libres de obstáculos. */
    this.npcSpawns = {
      arc: { x: Math.round(width * 0.8), y: Math.round(this.pathCenter(width * 0.8) - 17) },
    };

    /** Obstáculos dibujables, ordenables por profundidad. */
    this.props = [];
    /** Hitboxes de colisión: { x, y, width, height } en coordenadas del mapa. */
    this.obstacles = [];

    const rng = createRng(seed);
    this.#placeProps(rng);

    this.ground = document.createElement("canvas");
    this.ground.width = width;
    this.ground.height = height;
    this.#paintGround(rng);

    // --- Atmósfera nocturna ---
    this.time = 0;
    this.darkness = document.createElement("canvas");     // capa de oscuridad con huecos de luz
    this.darkness.width = width;
    this.darkness.height = height;
    this.tint = document.createElement("canvas");         // tinte azul-violeta, también con huecos de luz
    this.tint.width = width;
    this.tint.height = height;
    this.vignette = this.#makeVignette();
    /** Fuegos fatuos: violetas y verdes, como en el bosque original. */
    this.wisps = Array.from({ length: 34 }, () => ({
      x: rng() * width, y: rng() * height, phase: rng() * Math.PI * 2,
      color: rng() < 0.55 ? "#b98cff" : "#8fffc4",
    }));
  }

  /** Avanza las animaciones ambientales. */
  update(dt) {
    this.time += dt;
  }

  /** Centro vertical del sendero en una columna dada. */
  pathCenter(x) {
    return this.height * 0.72 + Math.sin(x / 46) * 10 + Math.sin(x / 17) * 3;
  }

  /** Lista de hitboxes para consultar en cada frame. */
  getObstacles() {
    return this.obstacles;
  }

  /** Árboles y rocas para mezclarlos con las entidades en el orden de profundidad. */
  getProps() {
    return this.props;
  }

  /* ---------- Colocación de obstáculos ---------- */

  #placeProps(rng) {
    const { width: W, height: H } = this;
    const spawnFeet = { x: this.spawnPoint.x + 16, y: this.spawnPoint.y + 38 };
    const placed = [];

    const canPlace = (x, y, spacing, pathMargin) => {
      if (Math.abs(y - this.pathCenter(x)) < pathMargin) return false;          // el sendero queda libre
      if (Math.hypot(x - spawnFeet.x, y - spawnFeet.y) < 36) return false;       // Abel aparece en zona despejada
      if (Object.values(this.npcSpawns).some((n) => Math.hypot(x - n.x, y - n.y) < 34)) return false;
      return placed.every((p) => Math.hypot(p.x - x, p.y - y) >= Math.max(spacing, p.spacing));
    };

    const addTree = (x, y) => {
      const t = makeTree(rng);
      const ox = Math.round(x - t.base.x), oy = Math.round(y - t.base.y);
      const hitbox = { x: ox + t.base.x - 5, y: oy + t.base.y - 4, width: 10, height: 5 };
      this.props.push({
        kind: "tree", canvas: t.canvas, x: ox, y: oy, sortY: oy + t.base.y + 1, hitbox,
        canopy: { x: ox + t.canopy.x, y: oy + t.canopy.y, width: t.canopy.width, height: t.canopy.height },
      });
      this.obstacles.push(hitbox);
      placed.push({ x, y, spacing: 30 });
    };

    const addRock = (x, y) => {
      const r = makeRock(rng);
      const ox = Math.round(x - r.base.x), oy = Math.round(y - r.base.y);
      const hitbox = { x: ox + 3, y: oy + ROCK_H - 6, width: ROCK_W - 6, height: 6 };
      this.props.push({ kind: "rock", canvas: r.canvas, x: ox, y: oy, sortY: oy + ROCK_H, hitbox, canopy: null });
      this.obstacles.push(hitbox);
      placed.push({ x, y, spacing: 18 });
    };

    // Hilera de árboles en el borde superior: enmarca el claro
    for (let x = 6; x < W; x += 30 + rng() * 14) {
      const y = 22 + rng() * 14;
      if (canPlace(x, y, 26, 20)) addTree(x, y);
    }
    // Árboles sueltos por el claro
    for (let i = 0; i < 400 && this.props.length < 14; i++) {
      const x = 10 + rng() * (W - 20), y = 50 + rng() * (H - 46);
      if (canPlace(x, y, 30, 22)) addTree(x, y);
    }
    // Rocas musgosas
    let rocks = 0;
    for (let i = 0; i < 400 && rocks < 7; i++) {
      const x = 12 + rng() * (W - 24), y = 30 + rng() * (H - 34);
      if (canPlace(x, y, 18, 16)) { addRock(x, y); rocks++; }
    }
  }

  /* ---------- Capa de suelo ---------- */

  #paintGround(rng) {
    const ctx = this.ground.getContext("2d");
    const { width: W, height: H } = this;
    const px = (color, x, y, w = 1, h = 1) => { ctx.fillStyle = color; ctx.fillRect(x | 0, y | 0, w, h); };

    // 1. Manchas de tono de la hierba fundidas con dithering ordenado
    const broad = createValueNoise(rng, 38);
    const fine = createValueNoise(rng, 9);
    const pathNoise = createValueNoise(rng, 14);
    const bands = [[0.3, PALETTE.grassDeep], [0.43, PALETTE.grassDark], [0.66, PALETTE.grassBase], [0.8, PALETTE.grassLight], [Infinity, PALETTE.grassHigh]];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const n = broad(x, y) * 0.7 + fine(x, y) * 0.3 + BAYER[y % 4][x % 4] * 0.07;
        px(bands.find(([limit]) => n < limit)[1], x, y);
      }
    }

    // 2. Sendero de tierra con borde tramado
    for (let x = 0; x < W; x++) {
      const center = this.pathCenter(x);
      for (let y = 0; y < H; y++) {
        const half = 9 + pathNoise(x, y) * 7;
        const d = Math.abs(y - center) - half;
        const dither = BAYER[y % 4][x % 4];
        if (d < -3) {
          const t = (y - (center - half)) / (half * 2) + dither * 0.15;
          px(t < 0.3 ? PALETTE.pathLight : t < 0.78 ? PALETTE.pathBase : PALETTE.pathDark, x, y);
        } else if (d < -1.5) px(PALETTE.pathDark, x, y);
        else if (d < 0.5 + dither * 1.5) px(PALETTE.pathEdge, x, y);
      }
    }
    const onPath = (x, y) => Math.abs(y - this.pathCenter(x)) < 12;

    // 3. Detalles orgánicos
    for (let i = 0; i < 150; i++) {                       // matas de hierba
      const x = 2 + rng() * (W - 4), y = 3 + rng() * (H - 4);
      if (onPath(x, y)) continue;
      px(PALETTE.vegDark, x, y);
      px(PALETTE.grassDark, x - 1, y); px(PALETTE.grassDark, x + 1, y);
      px(PALETTE.grassLight, x - 2, y - 1); px(PALETTE.grassLight, x + 2, y - 1);
      px(PALETTE.grassHigh, x, y - 2); px(PALETTE.grassLight, x, y - 1);
    }
    for (let i = 0; i < 40; i++) {                        // tréboles oscuros
      const x = rng() * W, y = rng() * H;
      if (onPath(x, y)) continue;
      px(PALETTE.vegDark, x, y, 2, 1); px(PALETTE.vegDark, x + 1, y - 1); px(PALETTE.vegDark, x - 1, y + 1, 2, 1);
      px(PALETTE.grassBase, x, y - 1);
    }
    for (let i = 0; i < 130; i++) {                       // motas de tierra
      const x = rng() * W, y = rng() * H;
      px(rng() < 0.6 ? PALETTE.dirtSpeck : PALETTE.dirtSpeck2, x, y, rng() < 0.25 ? 2 : 1, 1);
    }
    for (let i = 0; i < 26; i++) {                        // guijarros
      const x = rng() * (W - 3), y = rng() * (H - 2);
      px(PALETTE.pebble, x, y, 2, 1); px(PALETTE.pebbleDark, x + 1, y + 1, 2, 1);
    }
    for (let i = 0; i < 16; i++) {                        // flores diminutas
      const x = 2 + rng() * (W - 4), y = 2 + rng() * (H - 4);
      if (onPath(x, y)) continue;
      const petal = rng() < 0.7 ? PALETTE.petal : PALETTE.petalPink;
      px(petal, x - 1, y); px(petal, x + 1, y); px(petal, x, y - 1); px(petal, x, y + 1);
      px(PALETTE.pollen, x, y); px(PALETTE.vegDark, x, y + 2);
    }

    // 4. Sombras de los obstáculos sobre el suelo (no se ordenan: siempre debajo)
    ctx.fillStyle = PALETTE.groundShadow;
    for (const p of this.props) {
      const bx = p.hitbox.x + p.hitbox.width / 2;
      const by = p.hitbox.y + p.hitbox.height - 1;
      const rx = p.kind === "tree" ? 17 : 10, ry = p.kind === "tree" ? 4 : 2;
      for (let dy = -ry; dy <= ry; dy++) {
        const half = Math.round(rx * Math.sqrt(1 - (dy * dy) / ((ry + 0.5) * (ry + 0.5))));
        ctx.fillRect(Math.round(bx - half + 2), Math.round(by + dy), half * 2, 1);
      }
    }
  }

  /** Dibuja la capa de suelo (los obstáculos los dibuja el motor en orden de profundidad). */
  render(ctx) {
    ctx.drawImage(this.ground, 0, 0);
  }

  /* ---------- Noche gótica ---------- */

  /**
   * Rellena una capa con un color y le abre huecos de luz en anillos duros
   * (cada anillo es un escalón de opacidad, sin degradado suave).
   */
  #layerWithHoles(canvas, fill, lights) {
    const { width: W, height: H } = this;
    const c = canvas.getContext("2d");
    c.globalCompositeOperation = "source-over";
    c.clearRect(0, 0, W, H);
    c.fillStyle = fill;
    c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = "destination-out";
    for (const light of lights) {
      const r = Math.max(4, light.radius);
      const g = c.createRadialGradient(light.x, light.y, 0, light.x, light.y, r);
      g.addColorStop(0, "rgba(0,0,0,1)");
      g.addColorStop(0.42, "rgba(0,0,0,1)");
      g.addColorStop(0.42, "rgba(0,0,0,0.72)");
      g.addColorStop(0.66, "rgba(0,0,0,0.72)");
      g.addColorStop(0.66, "rgba(0,0,0,0.42)");
      g.addColorStop(0.86, "rgba(0,0,0,0.42)");
      g.addColorStop(0.86, "rgba(0,0,0,0.16)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = g;
      c.fillRect(light.x - r, light.y - r, r * 2, r * 2);
    }
    return canvas;
  }

  /** Viñeta precalculada en anillos con dithering (sin degradados suaves: estética pixel). */
  #makeVignette() {
    const { width: W, height: H } = this;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#05020c";
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const dx = (x - W / 2) / (W / 2), dy = (y - H / 2) / (H / 2);
        const d = Math.hypot(dx * 0.85, dy) + BAYER[y % 4][x % 4] * 0.12;
        const alpha = d > 1.08 ? 0.55 : d > 0.96 ? 0.35 : d > 0.84 ? 0.18 : 0;
        if (alpha) { ctx.globalAlpha = alpha; ctx.fillRect(x, y, 1, 1); }
      }
    }
    return canvas;
  }

  /**
   * Aplica la atmósfera nocturna sobre el mundo ya dibujado:
   *   1. Multiplicación de color azul-violeta (la noche "tiñe" todo el bosque).
   *   2. Oscuridad con huecos de luz en anillos duros alrededor de cada fuente.
   *   3. Brillo aditivo: color de las luces y fuegos fatuos.
   *   4. Viñeta tramada.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {{x:number, y:number, radius:number, color?:string}[]} lights
   */
  renderNight(ctx, lights) {
    const { width: W, height: H, time } = this;

    // 1. Tinte nocturno por multiplicación. Las luces abren huecos en el tinte:
    //    dentro del círculo los colores reales (el pelo blanco de Abel) se conservan.
    const t = this.#layerWithHoles(this.tint, "#7d7cc4", lights);
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.drawImage(t, 0, 0);
    ctx.restore();

    // 2. Oscuridad con luz en bandas (cada anillo es un escalón, como en el pixel art)
    ctx.drawImage(this.#layerWithHoles(this.darkness, "rgba(6, 2, 18, 0.58)", lights), 0, 0);

    // 3. Brillo aditivo
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const light of lights) {
      if (!light.color) continue;
      const r = light.radius * 0.7;
      const g = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, r);
      g.addColorStop(0, light.color);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(light.x - r, light.y - r, r * 2, r * 2);
    }
    for (const w of this.wisps) {
      const x = Math.round(w.x + Math.sin(time * 0.4 + w.phase) * 14);
      const y = Math.round(w.y + Math.cos(time * 0.3 + w.phase * 1.3) * 8);
      const a = 0.5 + 0.5 * Math.sin(time * 2 + w.phase);
      ctx.fillStyle = w.color;
      ctx.globalAlpha = a * 0.25;
      ctx.fillRect(x - 1, y - 1, 3, 3);
      ctx.globalAlpha = a;
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.restore();

    // 4. Viñeta
    ctx.drawImage(this.vignette, 0, 0);
  }
}
