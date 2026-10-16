/**
 * Scenery · arte procedural del escenario (pixel art pre-renderizado)
 * -------------------------------------------------------------------
 * Utilidades de ruido y semilla, y fábricas de sprites del mundo:
 *   árboles frondosos, rocas musgosas, casas en ruinas (capa trasera + delantera para
 *   ordenar bien a los personajes), escombros, pilares caídos, muros rotos, cajas,
 *   barriles, troncos talados, tocones quemados, estatuas decapitadas, arcos,
 *   antorchas, vallas, juncos, pozos y carros rotos.
 *
 * Todas las fábricas devuelven <canvas> con su base (pie) documentada. Luz desde
 * arriba-izquierda, contorno selectivo (nunca negro puro) y dithering Bayer 4×4.
 */

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const BAYER4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]].map((r) => r.map((v) => v / 16 - 0.5));

/** Hash entero 2D → [0,1) (rápido, sin tablas). */
export function hash2(ix, iy, seed = 0) {
  let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Ruido de valor 2D suave (celdas de `cell` píxeles). Sin asignaciones: apto para millones de llamadas. */
export function makeNoise(seed, cell) {
  const inv = 1 / cell;
  return (x, y) => {
    const gx = x * inv, gy = y * inv;
    const x0 = Math.floor(gx), y0 = Math.floor(gy);
    let tx = gx - x0, ty = gy - y0;
    tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
    const a = hash2(x0, y0, seed), b = hash2(x0 + 1, y0, seed), c = hash2(x0, y0 + 1, seed), d = hash2(x0 + 1, y0 + 1, seed);
    const top = a + (b - a) * tx;
    return top + (c + (d - c) * tx - top) * ty;
  };
}

export const BARK = { outline: "#2E1F14", shadow: "#4A3220", base: "#6B4A2E", light: "#8A6440" };
export const STONE = ["#2A2925", "#3F3D38", "#5E5B53", "#7D7A70", "#9A968A", "#B9B5A7"];
export const MOSS = ["#3E5A24", "#5E8A36", "#7FA046"];
export const SOOT = ["#0E0C0C", "#1C1818", "#2C2624", "#403632"];
export const EMBER = ["#5A1408", "#B03A12", "#FF7A1E", "#FFC24A", "#FFF1B8"];

function mk(w, h) {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const x = cv.getContext("2d");
  const px = (col, a, b) => { x.fillStyle = col; x.fillRect(a, b, 1, 1); };
  const rect = (col, a, b, ww, hh) => { x.fillStyle = col; x.fillRect(a, b, ww, hh); };
  return { cv, x, px, rect };
}

/* ======================================================================
   ÁRBOLES Y ROCAS (movidos desde index.html)
   ====================================================================== */

/**
 * Árbol frondoso 48×60. La base (pie del tronco) queda en (24, 59).
 * `leaves` = 6 tonos de follaje (contorno → luz).
 */
export function makeLeafyTree(rand, leaves) {
  const TW = 48, TH = 60, cx = 24;
  const { cv, px } = mk(TW, TH);
  const s = 0.88 + rand() * 0.2;
  const blobs = [
    { x: cx, y: 22, r: 15 * s }, { x: cx - 9 * s, y: 28, r: 10 * s }, { x: cx + 9 * s, y: 28, r: 10 * s },
    { x: cx - 3, y: 12, r: 10 * s }, { x: cx + 5, y: 15, r: 9 * s },
  ];
  const blobAt = (a, b) => {
    let best = null, depth = 0;
    for (const bl of blobs) { const d = bl.r - Math.hypot(a + 0.5 - bl.x, b + 0.5 - bl.y); if (d > depth) { depth = d; best = bl; } }
    return best;
  };
  const inside = (a, b) => blobAt(a, b) !== null;
  const base = TH - 1;
  for (let b = 32; b <= base; b++) {
    const flare = b >= base - 2 ? (b === base ? 3 : 2) : 0;
    const x0 = cx - 4 - flare, x1 = cx + 3 + flare;
    for (let a = x0; a <= x1; a++) {
      const t = (a - x0) / (x1 - x0);
      let col = t < 0.3 ? BARK.light : t < 0.7 ? BARK.base : BARK.shadow;
      if (b >= 38 && b < base - 2 && a > x0 && a < x1) {
        if ((a + Math.floor(b / 4)) % 3 === 0 && (b * 7 + a) % 5 !== 0) col = BARK.shadow;
        else if (t < 0.5 && (a * 3 + b) % 7 === 0) col = BARK.light;
      }
      if (b < 38) col = BARK.shadow;
      px(a === x0 || a === x1 || b === base ? BARK.outline : col, a, b);
    }
  }
  px(BARK.outline, cx - 1, base - 9); px(BARK.shadow, cx, base - 9); px(BARK.outline, cx, base - 8);
  for (let b = 0; b < TH; b++) for (let a = 0; a < TW; a++) {
    const bl = blobAt(a, b);
    if (!bl) continue;
    const nx = (a + 0.5 - bl.x) / bl.r, ny = (b + 0.5 - bl.y) / bl.r;
    const light = -(nx * 0.55 + ny * 0.85) * 0.5 + 0.55 - (b / 40) * 0.35 + BAYER4[b % 4][a % 4] * 0.18;
    let lv = light < 0.18 ? 1 : light < 0.36 ? 2 : light < 0.58 ? 3 : light < 0.78 ? 4 : 5;
    if (!inside(a - 1, b) || !inside(a + 1, b) || !inside(a, b - 1) || !inside(a, b + 1)) {
      const lit = (!inside(a, b - 1) || !inside(a - 1, b)) && inside(a, b + 1) && inside(a + 1, b);
      lv = lit ? 2 : 0;
    }
    px(leaves[lv], a, b);
  }
  for (let i = 0; i < 46; i++) {
    const a = 5 + Math.floor(rand() * (TW - 10)), b = 3 + Math.floor(rand() * 30);
    if (![[0, 0], [-1, 1], [0, 1], [1, 1], [0, -1], [-2, 1], [2, 1]].every(([dx, dy]) => inside(a + dx, b + dy))) continue;
    const litZone = b + (a - cx) * 0.6 < 20;
    const top = litZone ? 5 : 3, under = litZone ? 3 : 1;
    px(leaves[top], a - 1, b); px(leaves[top], a, b - 1); px(leaves[top], a + 1, b);
    px(leaves[under], a - 2, b + 1); px(leaves[under], a - 1, b + 1); px(leaves[under], a, b + 1);
    px(leaves[under], a + 1, b + 1); px(leaves[under], a + 2, b + 1);
  }
  for (let i = 0; i < 3; i++) {
    const a = 10 + Math.floor(rand() * 28), b = 12 + Math.floor(rand() * 16);
    if (inside(a, b) && inside(a + 1, b)) { px("#5A1E2E", a, b); px("#8E2E40", a + 1, b); }
  }
  return cv;
}

/** Roca musgosa angulosa 22×15. Base en (11, 14). */
export function makeMossRock(rand) {
  const RW = 22, RH = 15;
  const { cv, x } = mk(RW, RH);
  const j = () => Math.round((rand() - 0.5) * 2);
  const poly = [[1, 14], [1 + j(), 9], [4, 4 + j()], [9 + j(), 2], [15, 3 + j()], [19, 6], [21, 11 + j()], [20, 14]];
  const inPoly = (px0, py0) => {
    let inside = false;
    for (let i = 0, k = poly.length - 1; i < poly.length; k = i++) {
      const [xi, yi] = poly[i], [xk, yk] = poly[k];
      if ((yi > py0) !== (yk > py0) && px0 < ((xk - xi) * (py0 - yi)) / (yk - yi) + xi) inside = !inside;
    }
    return inside;
  };
  const inside = (a, b) => a >= 0 && b >= 0 && a < RW && b < RH && inPoly(a + 0.5, b + 0.5);
  const ridgeY = (a) => 5 + (a - 4) * 0.12 + (a > 13 ? (a - 13) * 0.35 : 0);
  const midX = 12 + j();
  for (let b = 0; b < RH; b++) for (let a = 0; a < RW; a++) {
    if (!inside(a, b)) continue;
    const d = BAYER4[b % 4][a % 4];
    let col;
    if (b < ridgeY(a) + d * 2) col = b < ridgeY(a) - 1 + d * 2 ? MOSS[a < midX ? 2 : 1] : MOSS[0];
    else if (a < midX + d * 1.5) col = b > RH - 4 ? STONE[3] : STONE[4];
    else col = b > RH - 4 ? STONE[1] : STONE[2];
    if (!inside(a - 1, b) || !inside(a + 1, b) || !inside(a, b - 1) || !inside(a, b + 1)) {
      const lit = (!inside(a, b - 1) || !inside(a - 1, b)) && inside(a, b + 1) && inside(a + 1, b);
      col = lit ? (b < ridgeY(a) + 1 ? MOSS[0] : STONE[2]) : STONE[0];
    }
    x.fillStyle = col;
    x.fillRect(a, b, 1, 1);
  }
  x.fillStyle = STONE[1];
  x.fillRect(midX + 2, 9, 1, 2); x.fillRect(midX + 3, 11, 1, 1); x.fillRect(5, 10, 2, 1);
  x.fillStyle = STONE[5];
  x.fillRect(midX - 1, Math.round(ridgeY(midX)) + 1, 1, 1);
  return cv;
}

/* ======================================================================
   RUINAS Y DESTRUCCIÓN
   ====================================================================== */

/** Ladrillo de piedra con juntas, con luz arriba-izquierda. */
function stoneFill(rect, x0, y0, w, h, rand, tone = 3, burnt = false) {
  const rows = Math.ceil(h / 4);
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * 4;
    for (let a = -off; a < w; a += 8) {
      const bw = Math.min(8, w - Math.max(0, a)), ax = Math.max(0, a);
      const t = Math.max(1, Math.min(4, tone + (rand() < 0.3 ? -1 : 0) + (rand() < 0.15 ? 1 : 0)));
      const col = burnt ? SOOT[Math.max(0, t - 1)] : STONE[t];
      rect(col, x0 + ax, y0 + r * 4, bw - 1, 3);
      rect(burnt ? SOOT[0] : STONE[Math.max(0, t - 2)], x0 + ax, y0 + r * 4 + 3, bw, 1); // junta inferior
      rect(burnt ? SOOT[0] : STONE[Math.max(0, t - 2)], x0 + ax + bw - 1, y0 + r * 4, 1, 4);
      if (rand() < 0.5) rect(burnt ? SOOT[3] : STONE[Math.min(5, t + 1)], x0 + ax, y0 + r * 4, Math.max(1, bw - 3), 1); // brillo superior
    }
  }
}

/**
 * Casa en ruinas. Devuelve dos capas para ordenar bien a los personajes:
 *   back  (pared trasera, paredes laterales, vigas)   → se ordena con la base de la pared trasera.
 *   front (escombros delanteros, marco de puerta)     → se ordena con la base del sprite.
 *   floor (suelo interior, para pintar en el terreno).
 * Tamaño 72×62. Pared trasera: filas 4–30. Suelo: x 6–66, y 30–54. Puerta: x 27–45.
 */
export function makeRuinedHouse(rand, variant = 0) {
  const W = 72, H = 62;
  const back = mk(W, H), front = mk(W, H), floor = mk(W, H);
  const burnt = variant === 1, mossy = variant === 2;
  const tone = burnt ? 2 : 3;

  // Paredes: alturas irregulares (borde roto)
  const topBack = (i) => 6 + Math.round(2 * Math.sin(i * 0.7) + (rand() < 0.22 ? 3 : 0) + (i > 52 ? (i - 52) * 0.5 : 0) * (variant === 2 ? 1 : 0));
  stoneFill(back.rect, 0, 4, W, 30, rand, tone, burnt);
  // recorte superior dentado
  back.x.globalCompositeOperation = "destination-out";
  for (let i = 0; i < W; i++) back.x.fillRect(i, 0, 1, topBack(i) - 1);
  // huecos de ventanas rotas
  for (const wx of [16, 46]) {
    back.x.fillRect(wx, 12, 9, 10);
  }
  back.x.globalCompositeOperation = "source-over";
  for (const wx of [16, 46]) {
    back.rect(burnt ? SOOT[0] : STONE[0], wx - 1, 11, 11, 1); back.rect(burnt ? SOOT[0] : STONE[0], wx - 1, 22, 11, 1);
    back.rect(BARK.outline, wx - 1, 11, 1, 12); back.rect(BARK.outline, wx + 9, 11, 1, 12);
    back.rect("#0b0912", wx, 12, 9, 10);
    back.rect("#15121e", wx, 12, 9, 2);
    if (rand() < 0.6) { back.rect(BARK.shadow, wx + 3, 12, 1, 10); back.rect(BARK.base, wx + 4, 12, 1, 5); } // listón roto
  }
  // zócalo de la pared trasera (donde apoyan los pies)
  back.rect(burnt ? SOOT[1] : STONE[1], 0, 30, W, 4);
  back.rect(burnt ? SOOT[2] : STONE[2], 0, 30, W, 1);

  // Paredes laterales: columnas de piedra que bajan hasta el frente, rotas a distinta altura
  const sideTop = (side) => (side ? 18 + Math.round(rand() * 8) : 14 + Math.round(rand() * 6));
  for (const side of [0, 1]) {
    const x0 = side ? W - 7 : 0, top = sideTop(side), bottom = 56;
    stoneFill(back.rect, x0, top, 7, bottom - top, rand, tone, burnt);
    back.rect(burnt ? SOOT[3] : STONE[5], x0, top, 7, 1);
    back.rect(burnt ? SOOT[0] : STONE[0], side ? x0 + 6 : x0, top, 1, bottom - top);
    // piedras sueltas arrancadas
    for (let i = 0; i < 3; i++) back.rect(STONE[2 + (i % 2)], x0 + (side ? -2 - i : 7 + i), 52 + (i % 2) * 2, 3, 2);
  }
  // Musgo y enredaderas (variante 2) o hollín (variante 1). Una sola lectura de píxeles (no una por píxel).
  const solidMask = (burnt || mossy) ? back.x.getImageData(0, 0, W, H).data : null;
  const isSolid = (a, b) => solidMask[(b * W + a) * 4 + 3] !== 0;
  if (mossy) {
    for (let i = 0; i < 90; i++) {
      const a = Math.floor(rand() * W), b = 5 + Math.floor(rand() * 28);
      if (!isSolid(a, b)) continue;
      back.px(MOSS[(rand() * 3) | 0], a, b);
      if (rand() < 0.4) back.px(MOSS[1], a, b + 1);
    }
    for (const vx of [8, 29, 58]) for (let k = 0; k < 14; k++) back.px(k % 3 ? MOSS[0] : MOSS[2], vx + (k % 2), 6 + k);
  }
  if (burnt) {
    for (let i = 0; i < 140; i++) {
      const a = Math.floor(rand() * W), b = 5 + Math.floor(rand() * 30);
      if (!isSolid(a, b)) continue;
      back.px(SOOT[(rand() * 3) | 0], a, b);
    }
  }
  // Viga diagonal caída: del borde superior de la pared trasera al suelo
  const beam = (x0, y0, x1, y1, th) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= n; i++) {
      const a = Math.round(x0 + ((x1 - x0) * i) / n), b = Math.round(y0 + ((y1 - y0) * i) / n);
      back.rect(BARK.outline, a - 1, b - 1, th + 2, th + 2);
    }
    for (let i = 0; i <= n; i++) {
      const a = Math.round(x0 + ((x1 - x0) * i) / n), b = Math.round(y0 + ((y1 - y0) * i) / n);
      back.rect(burnt ? SOOT[2] : BARK.base, a, b, th, th);
      back.px(burnt ? SOOT[3] : BARK.light, a, b);
      if (i % 5 === 2) back.px(burnt ? EMBER[1] : BARK.shadow, a + th - 1, b + th - 1);
    }
  };
  beam(18, 9, 40, 44, 2);
  if (variant !== 2) beam(58, 12, 46, 38, 2);
  beam(30, 8, 62, 10, 2);       // viga del tejado casi horizontal, medio quebrada
  back.rect("#0b0912", 44, 8, 3, 3);

  // ---- Suelo (para estampar en el terreno): tablones oscuros con huecos ----
  for (let b = 30; b < 56; b++) for (let a = 7; a < W - 7; a++) {
    const plank = Math.floor((a - 7) / 8);
    const col = burnt ? SOOT[(plank + b) % 2 ? 1 : 2] : (plank % 2 ? "#4a3322" : "#3e2a1c");
    floor.px(col, a, b);
    if ((a - 7) % 8 === 0) floor.px("#1d130c", a, b);
    if (b % 7 === 0 && (a + b) % 5 < 3) floor.px("#2a1c12", a, b);
  }
  for (let i = 0; i < 6; i++) { // tablones podridos / agujeros al sótano
    const a = 10 + Math.floor(rand() * 48), b = 34 + Math.floor(rand() * 18);
    floor.rect("#0b0912", a, b, 3 + Math.floor(rand() * 4), 2 + Math.floor(rand() * 2));
  }
  // ---- Frente: escombros bajos con hueco de puerta (x 27–45) ----
  const rubbleRun = (x0, x1) => {
    for (let a = x0; a < x1; a++) {
      const h = 3 + Math.round(2 * Math.sin(a * 0.9) + rand() * 2);
      for (let k = 0; k < h; k++) front.px(STONE[1 + ((a + k) % 3)], a, 56 - k + 4);
      front.px(STONE[4], a, 60 - h + 1);
    }
  };
  rubbleRun(0, 26); rubbleRun(46, W);
  // Marco de puerta: dos jambas y dintel roto
  for (const dx of [25, 45]) { front.rect(BARK.outline, dx, 40, 3, 22); front.rect(BARK.base, dx + 1, 40, 1, 21); front.rect(BARK.light, dx + 1, 40, 1, 4); }
  front.rect(BARK.outline, 25, 40, 12, 3); front.rect(BARK.shadow, 26, 41, 10, 1);
  front.rect("#0b0912", 28, 43, 4, 1);
  // Piedras sueltas delante
  for (let i = 0; i < 5; i++) {
    const a = Math.floor(rand() * (W - 6)), b = 58 + (i % 2);
    front.rect(STONE[2], a, b, 4, 2); front.rect(STONE[4], a, b, 2, 1); front.rect(STONE[0], a + 1, b + 2 > 61 ? 61 : b + 2, 3, 1);
  }
  return {
    back: back.cv, front: front.cv, floor: floor.cv, w: W, h: H, variant,
    // cajas de colisión relativas al origen del sprite
    boxes: [
      { x: 0, y: 28, w: W, h: 7 },            // pared trasera
      { x: 0, y: 28, w: 7, h: 30 },           // lateral izquierda
      { x: W - 7, y: 28, w: 7, h: 30 },       // lateral derecha
      { x: 0, y: 54, w: 26, h: 6 },           // escombros frontales
      { x: 46, y: 54, w: W - 46, h: 6 },
    ],
    door: { x: 26, w: 20 },
    backBase: 34,
  };
}

/** Montón de escombros (variantes pequeña y grande). Base en (w/2, h-1). */
export function makeRubble(rand, big = false) {
  const w = big ? 30 : 20, h = big ? 15 : 10;
  const { cv, px, rect } = mk(w, h);
  const n = big ? 26 : 14;
  for (let i = 0; i < n; i++) {
    const ww = 3 + Math.floor(rand() * (big ? 6 : 4)), hh = 2 + Math.floor(rand() * 3);
    const a = Math.floor((w - ww) * (0.5 + (rand() - 0.5) * (1 - (i / n) * 0.55)));
    const b = h - hh - Math.floor((i / n) * (h - 3) * rand());
    const t = 1 + Math.floor(rand() * 3);
    rect(STONE[0], a - 1, b - 1, ww + 2, hh + 2);
    rect(STONE[t], a, b, ww, hh);
    rect(STONE[Math.min(5, t + 2)], a, b, Math.max(1, ww - 1), 1);
    if (rand() < 0.4) rect(STONE[0], a + ww - 1, b + 1, 1, hh - 1);
  }
  if (big && rand() < 0.7) { rect(BARK.outline, 6, h - 5, 14, 2); rect(BARK.base, 6, h - 5, 13, 1); }   // tabla rota
  for (let i = 0; i < (big ? 5 : 2); i++) px(MOSS[(rand() * 3) | 0], 2 + Math.floor(rand() * (w - 4)), h - 2 - Math.floor(rand() * 3));
  return cv;
}

/** Pilar caído (34×13), tumbado en horizontal. Base en (17, 12). */
export function makeFallenPillar(rand) {
  const { cv, px, rect } = mk(36, 14);
  rect(STONE[0], 1, 3, 30, 10);
  for (let a = 2; a < 30; a++) {
    rect(STONE[4], a, 4, 1, 2); rect(STONE[3], a, 6, 1, 2); rect(STONE[2], a, 8, 1, 2); rect(STONE[1], a, 10, 1, 2);
  }
  // capitel roto en el extremo izquierdo y fuste partido a la derecha
  rect(STONE[0], 0, 1, 6, 12); rect(STONE[3], 1, 2, 4, 3); rect(STONE[2], 1, 5, 4, 5); rect(STONE[1], 1, 10, 4, 2);
  for (let k = 0; k < 6; k++) { rect(STONE[0], 30 + (k % 3), 3 + k * 2, 3, 2); rect(STONE[1], 31 - (k % 2), 4 + k * 2, 3, 1); }
  for (let a = 8; a < 28; a += 6) rect(STONE[1], a, 4, 1, 9);                 // juntas del fuste
  px(STONE[5], 4, 4); px(STONE[5], 10, 4);
  for (let i = 0; i < 8; i++) px(MOSS[(rand() * 3) | 0], 4 + Math.floor(rand() * 24), 3 + Math.floor(rand() * 2));
  rect("rgba(0,0,0,0.3)", 1, 13, 32, 1);
  return cv;
}

/** Muro roto 30×24. Base en (15, 23). */
export function makeWallSegment(rand) {
  const w = 30, h = 24;
  const { cv, x, rect, px } = mk(w, h);
  stoneFill(rect, 0, 4, w, 20, rand, 3);
  x.globalCompositeOperation = "destination-out";
  for (let i = 0; i < w; i++) x.fillRect(i, 0, 1, 4 + Math.round(5 * Math.abs(Math.sin(i * 0.55 + rand())) + (i > 20 ? (i - 20) * 0.7 : 0)));
  x.globalCompositeOperation = "source-over";
  rect(STONE[1], 0, 20, w, 4);
  for (let i = 0; i < 12; i++) px(MOSS[(rand() * 3) | 0], Math.floor(rand() * w), 8 + Math.floor(rand() * 12));
  return cv;
}

/** Caja de madera 14×14. Base en (7, 13). */
export function makeCrate(rand, broken = false) {
  const { cv, px, rect } = mk(14, 14);
  rect(BARK.outline, 0, 1, 14, 13);
  rect(BARK.base, 1, 2, 12, 11);
  rect(BARK.light, 1, 2, 12, 2);
  rect(BARK.shadow, 1, 11, 12, 2);
  rect(BARK.shadow, 6, 2, 2, 11);                                   // tablas
  for (let i = 0; i < 2; i++) { rect(BARK.outline, 1 + i * 11, 2, 1, 11); }
  px("#9a9aa8", 2, 3); px("#9a9aa8", 11, 3); px("#9a9aa8", 2, 11); px("#9a9aa8", 11, 11);   // clavos
  if (broken) { rect("rgba(0,0,0,0)", 8, 1, 6, 4); cv.getContext("2d").clearRect(9, 1, 5, 3); }
  return cv;
}

/** Barril 12×15. Base en (6, 14). */
export function makeBarrel() {
  const { cv, px, rect } = mk(12, 15);
  rect(BARK.outline, 1, 0, 10, 15);
  rect(BARK.base, 2, 1, 8, 13);
  rect(BARK.light, 2, 1, 3, 13);
  rect(BARK.shadow, 8, 1, 2, 13);
  for (const y of [3, 11]) { rect("#4a4a55", 1, y, 10, 2); rect("#7a7a88", 2, y, 8, 1); }
  rect(BARK.outline, 2, 0, 8, 1);
  px("#1b130c", 5, 1); px("#1b130c", 6, 1);
  return cv;
}

/** Tocón quemado 16×12 (la llama se dibuja aparte). Base en (8, 11). */
export function makeBurntStump(rand) {
  const { cv, px, rect } = mk(16, 12);
  rect(SOOT[0], 1, 3, 14, 9);
  rect(SOOT[1], 2, 4, 12, 7);
  rect(SOOT[2], 2, 4, 4, 7);
  rect("#3a2a24", 4, 3, 8, 3);
  rect(SOOT[0], 5, 3, 6, 1);
  for (let i = 0; i < 9; i++) px(EMBER[(rand() * 2) | 0], 3 + Math.floor(rand() * 10), 6 + Math.floor(rand() * 5));
  px(EMBER[3], 7, 4); px(EMBER[2], 9, 4);
  for (let k = 0; k < 4; k++) rect(SOOT[0], 1 + k * 4, 11, 3, 1);
  return cv;
}

/** Tronco talado 36×11 (horizontal) o 11×34 (vertical). Base en el centro-abajo. */
export function makeFelledLog(rand, vertical = false) {
  const L = 34, T = 10;
  const { cv, rect, px } = mk(vertical ? T + 1 : L + 2, vertical ? L : T + 1);
  if (!vertical) {
    rect(BARK.outline, 0, 1, L + 2, T);
    for (let a = 1; a < L + 1; a++) { rect(BARK.light, a, 2, 1, 2); rect(BARK.base, a, 4, 1, 3); rect(BARK.shadow, a, 7, 1, 3); }
    for (let a = 4; a < L; a += 5) px(BARK.outline, a, 3 + (a % 3) * 2);
    rect("#d8b878", 0, 2, 2, T - 2); rect("#a88650", 1, 3, 1, T - 4); px(BARK.outline, 0, 5);                  // corte
    for (let k = 0; k < 3; k++) rect(BARK.outline, 8 + k * 9, 0, 2, 2);                                         // muñones de ramas
  } else {
    rect(BARK.outline, 0, 0, T + 1, L);
    for (let b = 1; b < L - 1; b++) { rect(BARK.light, 1, b, 2, 1); rect(BARK.base, 3, b, 3, 1); rect(BARK.shadow, 6, b, 3, 1); }
    rect("#d8b878", 1, 0, T - 1, 3); rect("#a88650", 2, 1, T - 3, 1);
  }
  for (let i = 0; i < 6; i++) px(MOSS[(rand() * 3) | 0], 2 + Math.floor(rand() * (cv.width - 4)), 2 + Math.floor(rand() * (cv.height - 4)));
  return cv;
}

/** Estatua sin cabeza 18×34. Base en (9, 33). */
export function makeStatue(rand) {
  const { cv, px, rect, x } = mk(18, 34);
  rect(STONE[0], 1, 28, 16, 6); rect(STONE[2], 2, 28, 14, 4); rect(STONE[4], 2, 28, 14, 1); rect(STONE[1], 2, 31, 14, 2); // peana
  rect(STONE[0], 4, 8, 10, 21); rect(STONE[3], 5, 9, 4, 19); rect(STONE[2], 9, 9, 4, 19); rect(STONE[1], 12, 9, 1, 19); // cuerpo
  rect(STONE[0], 2, 10, 3, 12); rect(STONE[2], 3, 11, 1, 10); rect(STONE[0], 13, 10, 3, 6); rect(STONE[2], 14, 11, 1, 4); // brazos (uno roto)
  rect(STONE[4], 6, 9, 5, 1); rect(STONE[1], 6, 18, 6, 1); rect(STONE[1], 7, 22, 1, 6); rect(STONE[1], 10, 22, 1, 6);     // pliegues
  for (let k = 0; k < 6; k++) px(STONE[k % 3], 6 + k, 7 + (k % 2));                                                    // cuello roto
  rect(STONE[0], 5, 7, 8, 1);
  for (let i = 0; i < 6; i++) px(MOSS[(rand() * 3) | 0], 4 + Math.floor(rand() * 10), 10 + Math.floor(rand() * 18));
  return cv;
}

/** Arco en ruinas 44×36: dos pilares y medio arco. Base en (22, 35). */
export function makeArch(rand) {
  const { cv, px, rect, x } = mk(44, 36);
  const pillar = (x0) => {
    rect(STONE[0], x0, 6, 9, 30); rect(STONE[4], x0 + 1, 6, 3, 29); rect(STONE[3], x0 + 4, 6, 3, 29); rect(STONE[1], x0 + 7, 6, 1, 29);
    rect(STONE[0], x0 - 1, 32, 11, 4); rect(STONE[2], x0, 32, 9, 3); rect(STONE[4], x0, 32, 9, 1);
    for (const y of [14, 22]) rect(STONE[1], x0 + 1, y, 7, 1);
  };
  pillar(2); pillar(33);
  // dovelas del arco: solo conservada la mitad izquierda
  for (let i = 0; i < 20; i++) {
    const a = 11 + i, ang = (i / 20) * Math.PI, b = 7 - Math.round(Math.sin(ang) * 6) + 6;
    if (a < 24 + rand() * 3) { rect(STONE[0], a, b - 1, 1, 6); rect(STONE[(i % 3) + 2], a, b, 1, 4); }
  }
  for (let k = 0; k < 7; k++) { px(STONE[2], 24 + k, 6 + (k % 3)); }
  for (let i = 0; i < 10; i++) px(MOSS[(rand() * 3) | 0], 3 + Math.floor(rand() * 38), 8 + Math.floor(rand() * 24));
  return cv;
}

/** Valla rota 26×12. Base en (13, 11). */
export function makeFence(rand) {
  const { cv, rect } = mk(26, 12);
  for (const px0 of [1, 11, 22]) {
    const h = 8 + Math.floor(rand() * 3);
    rect(BARK.outline, px0, 11 - h, 3, h + 1); rect(BARK.base, px0 + 1, 11 - h + 1, 1, h - 1); rect(BARK.light, px0 + 1, 11 - h + 1, 1, 2);
  }
  rect(BARK.outline, 0, 4, 14, 3); rect(BARK.base, 1, 4, 12, 1); rect(BARK.shadow, 1, 6, 12, 1);
  rect(BARK.outline, 16, 7, 9, 2); rect(BARK.shadow, 16, 8, 9, 1);
  return cv;
}

/** Antorcha de pie 8×22 (sin llama). Base en (4, 21); la llama nace en (4, 4). */
export function makeTorchPost() {
  const { cv, px, rect } = mk(8, 22);
  rect(BARK.outline, 3, 6, 3, 16); rect(BARK.base, 4, 6, 1, 15); rect(BARK.light, 4, 7, 1, 3);
  rect("#4a4a55", 1, 4, 6, 3); rect("#7a7a88", 2, 4, 4, 1); rect("#2a2a32", 1, 6, 6, 1);
  rect(STONE[1], 1, 20, 6, 2); rect(STONE[3], 2, 20, 4, 1);
  return cv;
}

/** Pozo derruido 22×22. Base en (11, 21). */
export function makeWell(rand) {
  const { cv, px, rect } = mk(22, 22);
  rect(STONE[0], 2, 10, 18, 12); stoneFill(rect, 3, 11, 16, 10, rand, 3);
  rect("#0b0912", 5, 8, 12, 5); rect("#1b2236", 6, 9, 10, 3); rect(STONE[5], 4, 9, 14, 1);
  rect(BARK.outline, 2, 1, 2, 12); rect(BARK.base, 3, 1, 1, 11); rect(BARK.outline, 18, 3, 2, 10); rect(BARK.base, 18, 4, 1, 9);
  rect(BARK.outline, 2, 1, 10, 2);                       // viga rota
  px(BARK.light, 3, 1);
  return cv;
}

/** Carro roto 34×18. Base en (17, 17). */
export function makeCart(rand) {
  const { cv, px, rect } = mk(34, 18);
  rect(BARK.outline, 3, 5, 26, 9); rect(BARK.base, 4, 6, 24, 6); rect(BARK.light, 4, 6, 24, 1); rect(BARK.shadow, 4, 11, 24, 2);
  for (const a of [10, 16, 22]) rect(BARK.shadow, a, 6, 1, 6);
  for (let k = 0; k < 6; k++) rect(BARK.outline, 28 + k, 2 + k, 2, 2);                // lanza rota
  // rueda entera y rueda caída
  const wheel = (cx, cy, r) => {
    for (let d = 0; d < 28; d++) { const a = (d / 28) * 6.28; px(BARK.outline, Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r)); }
    for (let d = 0; d < 4; d++) { const a = d * 0.79; for (let k = 0; k < r; k++) px(BARK.base, Math.round(cx + Math.cos(a) * k), Math.round(cy + Math.sin(a) * k)); }
    px("#7a7a88", cx, cy);
  };
  wheel(9, 13, 4); rect(BARK.outline, 22, 14, 9, 3); rect(BARK.base, 23, 15, 7, 1);
  return cv;
}

/** Grupo de juncos para orillas 12×14 (se dibujan animados con balanceo). Base en (6, 13). */
export function makeReeds(rand) {
  const { cv, px, rect } = mk(12, 14);
  for (let i = 0; i < 6; i++) {
    const a = 1 + i * 2, h = 7 + Math.floor(rand() * 6);
    for (let k = 0; k < h; k++) px(k > h - 4 ? "#7a6a3a" : k % 3 ? "#4C8E32" : "#2C6A3C", a + (k > h - 3 ? (i % 2 ? 1 : -1) : 0), 13 - k);
    if (rand() < 0.6) { rect("#5a3a22", a, 13 - h, 1, 3); px("#8a6440", a, 13 - h); }     // espiga
  }
  return cv;
}

/** Hoja de nenúfar 7×4. */
export function makeLily() {
  const { cv, px, rect } = mk(8, 5);
  rect("#2C6A3C", 1, 1, 6, 3); rect("#4C8E32", 2, 1, 4, 2); px("#86C23C", 3, 1); px("#1c4a40", 5, 2); px("#0e2a20", 4, 3);
  px("#f0b0c8", 3, 0); px("#fff", 4, 0);
  return cv;
}
