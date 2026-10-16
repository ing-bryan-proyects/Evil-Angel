/**
 * EnemySprites · pixel art procedural del bestiario (Reino 1)
 * ----------------------------------------------------------
 *   drawWolfSmall()       Karr y Sköll en el mapa (20×14, dos fotogramas de carrera).
 *   drawWerewolfSmall()   Rufus y Shela en el mapa (20×26, respiración y ojos encendidos).
 *   renderWerewolfBig()   Rufus y Shela en la arena por turnos (40×52, con detalle de pelaje).
 *
 * Contorno selectivo en tono oscuro del propio pelaje (nunca negro puro) y
 * luz desde arriba-izquierda, como el resto del juego.
 */

/** Lobo pequeño mirando a la izquierda (flip = mirando a la derecha). */
export function drawWolfSmall(c, x, y, t, pal, flip, running, hurt = false, armored = false) {
  c.save();
  c.translate(flip ? x + 20 : x, y);
  if (flip) c.scale(-1, 1);
  const P = (col, a, b, w, h) => { c.fillStyle = col; c.fillRect(a, b, w, h); };
  const k = running ? ((t * 10) | 0) % 2 : ((t * 2) | 0) % 2 === 0 ? 0 : 0;
  const bob = running && k ? -1 : 0;
  c.globalAlpha = 0.35; P("#000", 2, 13, 16, 2); c.globalAlpha = 1;
  if (hurt) c.globalAlpha = 0.55 + 0.45 * Math.sin(t * 40);
  const by = bob;
  P(pal.shade, 16, 3 + by, 3, 2); P(pal.mane, 18, 2 + by, 2, 2);                        // cola
  P(pal.shade, 6, 5 + by, 11, 5); P(pal.body, 6, 5 + by, 11, 4); P(pal.hi, 7, 5 + by, 8, 1); // lomo
  P(pal.mane, 8, 3 + by, 2, 2); P(pal.mane, 11, 2 + by, 2, 3); P(pal.mane, 14, 3 + by, 2, 2); // crin
  if (armored) { P(pal.mane, 9, 5 + by, 1, 5); P(pal.mane, 13, 5 + by, 1, 5); P("#c9a24a", 9, 7 + by, 1, 1); } // arnés de cuero
  P(pal.body, 1, 4 + by, 6, 5); P(pal.hi, 2, 4 + by, 3, 1); P(pal.body, 0, 6 + by, 2, 2);   // cabeza y hocico
  P(pal.shade, 3, 2 + by, 2, 2); P(pal.body, 5, 2 + by, 1, 2);                             // orejas
  P(pal.eye, 2, 5 + by, 2, 1);                                                              // ojo
  P("#f0e8ff", 0, 8 + by, 1, 1); P("#1a0e14", 1, 8 + by, 3, 1);                             // colmillo y boca
  // Patas: alternan al correr
  P(pal.shade, 6, 10, 2, 3 - k); P(pal.body, 9, 10, 2, 2 + k); P(pal.shade, 13, 10, 2, 2 + k); P(pal.body, 15, 10, 2, 3 - k);
  P(pal.claw, 6, 12 - k, 2, 1); P(pal.claw, 15, 12 - k, 2, 1);
  c.restore();
}

/* ---------- Hombres lobo ---------- */

const WEREWOLF_ROWS = [
  "...o..........o.....",
  "..oHo........oHo....",
  "..oFHo......oHFo....",
  "..oFFFooooooFFfo....",
  ".oFHFFFFFFFFFFffo...",
  ".oFHEEFFFFFFEEffo...",
  ".oFFFFFSSSSFFFffo...",
  "..oFFFSSooSSFffo....",
  "..ofFSCSCCSCSfo.....",
  "...ofFSSSSSFfo......",
  "ooofFFFFFFFFFFffooo.",
  "oFHFFHHHSSHHFFffFFo.",
  "oFHFFHSSSSSSHFfffFo.",
  "oFFoFFSSSSSSFFfoFfo.",
  "oFFoFFFSSSSFFffofFo.",
  "oFFooFFFFFFFFffoofo.",
  "oCCo.KKKKKKKKK.oCCo.",
  ".CC..KKKKKKKKK..CC..",
  ".....KKKK..KKKK.....",
  ".....oFFo..oFFo.....",
  ".....oFfo..oFfo.....",
  "....oFFfo..oFFfo....",
  "....ofFo....oFfo....",
  "....oFFo....oFFo....",
  "...oCCCo....oCCCo...",
  "....................",
];

/** Shela: melena larga por la espalda y cadenas en las muñecas. */
function shelaRows() {
  return WEREWOLF_ROWS.map((row, r) => {
    const chars = row.split("");
    if (r >= 3 && r <= 12) {
      if (chars[0] === ".") chars[0] = "M";
      if (chars[17] === ".") chars[17] = "M";
      if (r >= 5 && chars[18] === ".") chars[18] = "M";
    }
    if (r === 16) { chars[1] = "L"; chars[2] = "L"; chars[16] = "L"; chars[17] = "L"; }
    return chars.join("");
  });
}

function paletteFor(pal) {
  return {
    o: pal.furSh === "#1a1b22" ? "#0e0f14" : "#22140c", F: pal.fur, f: pal.furSh, H: pal.furHi,
    E: pal.eye, S: pal.skin, C: pal.claw, K: pal.cloth, L: pal.chain || "#9a9aa8", M: pal.furSh,
  };
}

const cache = new Map();

/** Hombre lobo pequeño (mapa). Respira 1 px y los ojos laten. */
export function drawWerewolfSmall(c, x, y, t, kind, pal) {
  const key = `${kind}:small`;
  if (!cache.has(key)) {
    const rows = kind === "shela" ? shelaRows() : WEREWOLF_ROWS;
    const cv = document.createElement("canvas");
    cv.width = 20; cv.height = 26;
    const g = cv.getContext("2d");
    const P = paletteFor(pal);
    rows.forEach((row, ry) => [...row].forEach((ch, rx) => {
      if (ch === "." || ch === "E") return; // los ojos se dibujan aparte para que brillen
      g.fillStyle = P[ch];
      g.fillRect(rx, ry, 1, 1);
    }));
    cache.set(key, cv);
  }
  const breathe = Math.sin(t * 2.4) > 0.2 ? -1 : 0;
  c.globalAlpha = 0.4; c.fillStyle = "#000"; c.fillRect(x + 3, y + 24, 14, 2); c.globalAlpha = 1;
  const img = cache.get(key);
  c.drawImage(img, 0, 0, 20, 18, x, y + breathe, 20, 18);
  if (breathe) c.drawImage(img, 0, 17, 20, 1, x, y + 17, 20, 1);
  c.drawImage(img, 0, 18, 20, 8, x, y + 18, 20, 8);
  // Ojos encendidos
  c.globalAlpha = 0.65 + 0.35 * Math.sin(t * 5);
  c.fillStyle = pal.eye;
  c.fillRect(x + 4, y + 5 + breathe, 2, 1);
  c.fillRect(x + 12, y + 5 + breathe, 2, 1);
  c.globalAlpha = 1;
}

/**
 * Hombre lobo grande (arena por turnos): la matriz a ×2 con micro-sombreado
 * de pelaje en cada bloque (brillo arriba-izquierda, sombra abajo-derecha).
 */
export function renderWerewolfBig(kind, pal) {
  const key = `${kind}:big`;
  if (cache.has(key)) return cache.get(key);
  const rows = kind === "shela" ? shelaRows() : WEREWOLF_ROWS;
  const P = paletteFor(pal);
  const cv = document.createElement("canvas");
  cv.width = 40; cv.height = 52;
  const g = cv.getContext("2d");
  const px = (col, a, b) => { g.fillStyle = col; g.fillRect(a, b, 1, 1); };
  rows.forEach((row, ry) => [...row].forEach((ch, rx) => {
    if (ch === ".") return;
    const X = rx * 2, Y = ry * 2;
    const base = P[ch];
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) px(base, X + dx, Y + dy);
    if (ch === "F" || ch === "M") {
      if ((rx + ry) % 2 === 0) px(P.H, X, Y);            // mechones claros
      if ((rx * 3 + ry) % 4 === 0) px(P.f, X + 1, Y + 1); // mechones oscuros
    }
    if (ch === "E") { px("#ffffff", X, Y); }              // brillo del ojo
    if (ch === "C") { px("#ffffff", X, Y); }
  }));
  cache.set(key, cv);
  return cv;
}
