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

/* ======================================================================
   LOBOS (Karr, Sköll, brasas de Pyrus) — dibujo esquelético con muchas fases
   ----------------------------------------------------------------------
   Estados que entiende drawWolf():
     idle      respira, mueve la cola y las orejas, a veces olfatea
     trot      paseo de 4 patas en diagonal
     run       galope: cuerpo que se estira y se encoge, cola recta
     alert     se detiene con las orejas arriba al ver a Abel
     windup    se agacha, gruñe y absorbe energía (carga elemental: oscuridad / hielo / fuego)
     lunge     salta con el cuerpo estirado y la mandíbula abierta
     recover   se sacude tras el mordisco
     stunned   retroceso con destello blanco
     dying     cae de costado y se desvanece
   ====================================================================== */

const wcv = document.createElement("canvas");
wcv.width = 40; wcv.height = 30;
const wx = wcv.getContext("2d");

const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

/**
 * @param {CanvasRenderingContext2D} c
 * @param {object} st { t, pal, flip, state, stateT, moving, run, hurt(0..1), charge(0..1), element, armored, seed, die(0..1) }
 */
export function drawWolf(c, x, y, st) {
  const { t, pal, flip } = st;
  const state = st.state || (st.moving ? (st.run ? "run" : "trot") : "idle");
  const seed = st.seed || 0;
  wx.clearRect(0, 0, 40, 30);
  const P = (col, a, b, w, h) => { wx.fillStyle = col; wx.fillRect(a + 6, b + 8, w, h); };   // origen del lobo en (6, 8)

  const running = state === "run" || state === "chase";
  const gait = state === "run" ? 11 : state === "trot" ? 6 : 0;
  const ph = t * gait + seed * 3;
  const sw = Math.sin(ph), sw2 = Math.sin(ph + Math.PI);
  let by = 0, stretch = 0, crouch = 0, headDy = 0, headDx = 0, jaw = 0, tailUp = 0, earBack = 0, bodyDx = 0;

  if (state === "run") { by = Math.sin(ph * 2) > 0.3 ? -1 : 0; stretch = Math.sin(ph) > 0.4 ? 1 : 0; earBack = 1; tailUp = -1; headDy = 1; }
  else if (state === "trot") { by = Math.sin(ph * 2) > 0.6 ? -1 : 0; }
  else if (state === "alert") { headDy = -1; earBack = -1; tailUp = 1; }
  else if (state === "windup") { crouch = 2; headDy = 2; headDx = -1; earBack = 1; tailUp = 1; jaw = 0; }
  else if (state === "lunge") { stretch = 3; by = -2; headDx = -2; jaw = 2; earBack = 1; tailUp = -1; bodyDx = -1; }
  else if (state === "recover") { by = 0; headDy = Math.sin(t * 30) > 0 ? 1 : 0; headDx = Math.sin(t * 30) > 0 ? 1 : -1; }
  else if (state === "stunned") { by = 1; headDy = 1; earBack = 1; }
  else {                                         // idle: respira y olfatea de vez en cuando
    const sniff = hash(Math.floor(t / 2.4) + seed) < 0.35 && (t % 2.4) < 1.0;
    if (sniff) headDy = 1 + (Math.sin(t * 14) > 0 ? 1 : 0);
    by = Math.sin(t * 2.2 + seed) > 0.55 ? -1 : 0;
  }
  by += crouch;
  const wag = Math.sin(t * (state === "idle" ? 2.6 : state === "windup" ? 18 : state === "run" ? 14 : 6) + seed);
  const earFlick = hash(Math.floor(t * 1.7) + seed * 5) < 0.18 && (t * 1.7 % 1) < 0.25 ? 1 : 0;

  // sombra ya la dibuja el juego; aquí solo el animal (mirando a la izquierda)
  const dying = st.die > 0;
  // cola: 3 segmentos que ondulan
  const tx = 16 + stretch + bodyDx;
  P(pal.shade, tx, 3 + by + tailUp + Math.round(wag * 0.9), 3, 2);
  P(pal.mane, tx + 2, 2 + by + tailUp * 2 + Math.round(wag * 1.4), 2, 2);
  if (state === "run") P(pal.mane, tx + 3, 2 + by + tailUp * 2 + Math.round(wag * 1.6), 1, 1);
  // lomo
  const bx0 = 6 + bodyDx, bw = 11 + stretch;
  P(pal.shade, bx0, 5 + by, bw, 5); P(pal.body, bx0, 5 + by, bw, 4); P(pal.hi, bx0 + 1, 5 + by, Math.max(4, bw - 3), 1);
  // pecho/vientre más claro
  P(pal.shade, bx0 + 1, 9 + by, bw - 2, 1);
  // crin (se eriza al cargar / correr)
  const mane = Math.round((state === "windup" ? 1 : 0) + (running ? 0 : 0) + (st.charge || 0));
  P(pal.mane, 8 + bodyDx, 3 + by - mane, 2, 2 + mane); P(pal.mane, 11 + bodyDx, 2 + by - mane, 2, 3 + mane); P(pal.mane, 14 + bodyDx, 3 + by - mane, 2, 2 + mane);
  if (st.armored) { P(pal.mane, 9 + bodyDx, 5 + by, 1, 5); P(pal.mane, 13 + bodyDx, 5 + by, 1, 5); P("#c9a24a", 9 + bodyDx, 7 + by, 1, 1); }
  // patas: 4 con dos segmentos
  const legs = [[6, sw], [9, sw2], [13, sw2], [15, sw]];
  legs.forEach(([lx, s], i) => {
    const front = i < 2;
    let dx = 0, lift = 0, len = 3;
    if (gait) { dx = Math.round(s * (state === "run" ? 3 : 1.6)); lift = s > 0.2 ? (state === "run" ? 2 : 1) : 0; }
    if (state === "windup") { len = front ? 2 : 3; dx = front ? -1 : 1; }
    if (state === "lunge") { dx = front ? -2 : 2; len = 2; }
    if (state === "alert") dx = front ? -1 : 0;
    const xx = lx + dx + (front ? bodyDx : bodyDx + stretch * (i >= 2 ? 1 : 0));
    const top = 10 + by + (crouch ? 0 : 0), h = Math.max(1, len - lift + (crouch ? 0 : 0));
    P(front ? pal.shade : pal.body, xx, top, 2, Math.max(1, Math.min(h, 4 - crouch + (by < 0 ? 1 : 0))));
    P(pal.claw, xx, top + Math.max(1, Math.min(h, 4 - crouch + (by < 0 ? 1 : 0))) - 1, 2, 1);
  });
  // cabeza y hocico
  const hx = 1 + headDx + bodyDx, hy = 4 + by + headDy;
  P(pal.body, hx, hy, 6, 5); P(pal.hi, hx + 1, hy, 3, 1); P(pal.body, hx - 1, hy + 2 + (jaw ? 0 : 0), 2, 2);
  // orejas
  const eo = earBack > 0 ? 1 : 0;
  P(pal.shade, hx + 2 + earFlick, hy - 2 + eo - (earBack < 0 ? 1 : 0), 2, 2); P(pal.body, hx + 4, hy - 2 + eo - (earBack < 0 ? 1 : 0), 1, 2);
  // ojo (brilla más al cargar)
  P(pal.eye, hx + 1, hy + 1, 2, 1);
  // boca: cerrada o abierta (mandíbula inferior baja)
  if (jaw) { P("#1a0e14", hx - 1, hy + 4, 4, jaw); P("#f0e8ff", hx - 1, hy + 4, 1, 1); P("#f0e8ff", hx + 2, hy + 4, 1, 1); P(pal.shade, hx, hy + 4 + jaw, 4, 1); }
  else { P("#f0e8ff", hx - 1, hy + 4, 1, 1); P("#1a0e14", hx, hy + 4, 3, 1); }

  // los esbirros de Pyrus arden siempre: llamas pixeladas que bailan sobre el lomo
  if ((st.element || "") === "fire" && !dying) {
    for (let i = 0; i < 5; i++) {
      const f = Math.sin(t * 12 + i * 1.9 + seed) * 0.5 + 0.5;
      wx.globalAlpha = 0.55 + f * 0.4;
      P(i % 2 ? "#ffc24a" : "#ff7a1e", 7 + i * 2 + bodyDx, 3 + by - Math.round(f * 3) - (state === "windup" ? 2 : 0), 1, 2 + Math.round(f * 2));
    }
    wx.globalAlpha = 1;
  }
  // carga de energía elemental (oscuridad / hielo / fuego)
  const k = st.charge || 0;
  if (k > 0) {
    const el = st.element || "dark";
    const n = Math.round(4 + k * 8);
    for (let i = 0; i < n; i++) {
      const a = hash(i * 7.3 + Math.floor(t * 9) + seed), b = hash(i * 3.1 + Math.floor(t * 9) * 1.7);
      const col = el === "fire" ? (a < 0.4 ? "#ff7a1e" : a < 0.75 ? "#ffc24a" : "#fff1b8") : el === "ice" ? (a < 0.5 ? "#bfe8ff" : "#ffffff") : (a < 0.5 ? "#8a4dff" : "#3a1e6a");
      wx.globalAlpha = 0.35 + 0.5 * k * b;
      P(col, 4 + Math.floor(a * 14), 2 + by - Math.floor(b * 8 * k) + (el === "fire" ? -1 : 0), 1, 1 + (b > 0.8 ? 1 : 0));
    }
    wx.globalAlpha = 1;
    P(el === "fire" ? "#ffc24a" : el === "ice" ? "#e8f8ff" : "#ff5a8a", hx + 1, hy + 1, 2, 1);
  }

  // destello blanco de impacto
  if (st.hurt > 0) {
    wx.globalCompositeOperation = "source-atop";
    wx.globalAlpha = Math.min(1, st.hurt);
    wx.fillStyle = "#ffffff";
    wx.fillRect(0, 0, 40, 30);
    wx.globalAlpha = 1;
    wx.globalCompositeOperation = "source-over";
  }

  c.save();
  if (dying) c.globalAlpha *= Math.max(0, 1 - Math.max(0, st.die - 0.4) / 0.6);
  if (flip) { c.translate(Math.round(x) + 20, Math.round(y)); c.scale(-1, 1); } else c.translate(Math.round(x), Math.round(y));
  if (dying) {                                         // cae de costado
    const kk = Math.min(1, st.die / 0.4);
    c.translate(10, 14); c.rotate((Math.PI / 2) * kk * 0.9); c.translate(-10, -14);
  }
  c.drawImage(wcv, -6, -8);
  c.restore();
}

/** Compatibilidad con la firma antigua. */
export function drawWolfSmall(c, x, y, t, pal, flip, running, hurt = false, armored = false) {
  drawWolf(c, x, y, { t, pal, flip, moving: running, run: running, hurt: hurt ? 0.6 : 0, armored });
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

/**
 * Hombre lobo pequeño (mapa), animado por partes: cabeza con retardo, torso que respira, brazos que
 * se balancean y flexionan las garras, cambio de apoyo en las piernas y gruñido al acercarse Abel.
 * @param {{near?:number, charge?:number, hurt?:number}} [st]
 */
export function drawWerewolfSmall(c, x, y, t, kind, pal, st = {}) {
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
  const img = cache.get(key);
  const near = st.near || 0, charge = st.charge || 0;
  const b = Math.sin(t * 2.4);
  const torsoDy = b > 0.2 ? -1 : 0;
  const headDy = (Math.sin(t * 2.4 - 0.9) > 0.2 ? -1 : 0) - (near > 0 ? 1 : 0);
  const headDx = near > 0 ? (Math.sin(t * 32) > 0 ? 1 : 0) : 0;
  const armDy = Math.sin(t * 2.4 + 0.7) > 0.3 ? -1 : 0;
  const armDx = near > 0 ? 1 : 0;
  const step = (t % 3.6) < 0.45 ? 1 : 0;
  const flash = st.hurt > 0;
  c.globalAlpha = 0.4; c.fillStyle = "#000"; c.fillRect(x + 3, y + 24, 14, 2); c.globalAlpha = 1;
  const D = (sx, sy, sw, sh, dx, dy) => c.drawImage(img, sx, sy, sw, sh, x + sx + dx, y + sy + dy, sw, sh);
  // piernas (cambio de apoyo cada pocos segundos)
  D(0, 18, 20, 8, 0, 0);
  if (step) { c.clearRect(x + 4, y + 18, 6, 8); D(4, 18, 6, 8, 0, 0); c.clearRect(x + 4, y + 18, 6, 1); D(4, 18, 6, 7, 0, -1); }
  // torso y brazos
  D(4, 10, 12, 8, step, torsoDy);
  D(0, 10, 4, 8, -armDx, armDy);
  D(16, 10, 4, 8, armDx, armDy);
  if (torsoDy < 0) D(4, 17, 12, 1, step, 0);
  // cabeza
  D(0, 0, 20, 10, headDx, headDy + torsoDy * 0);
  // ojos encendidos: laten y arden más al gruñir / cargar
  c.globalAlpha = Math.min(1, 0.65 + 0.35 * Math.sin(t * 5) + near * 0.3 + charge * 0.4);
  c.fillStyle = pal.eye;
  c.fillRect(x + 4 + headDx, y + 5 + headDy, 2, 1);
  c.fillRect(x + 12 + headDx, y + 5 + headDy, 2, 1);
  if (near > 0 || charge > 0) { c.globalAlpha *= 0.35; c.fillRect(x + 3 + headDx, y + 4 + headDy, 4, 3); c.fillRect(x + 11 + headDx, y + 4 + headDy, 4, 3); }
  c.globalAlpha = 1;
  if (flash) {
    c.globalAlpha = Math.min(0.9, st.hurt);
    c.globalCompositeOperation = "lighter";
    c.fillStyle = "#ffffff";
    c.fillRect(x, y, 20, 26);
    c.globalCompositeOperation = "source-over";
    c.globalAlpha = 1;
  }
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


/* ======================================================================
   ENEMIGOS MARINOS (lagos profundos): leviatán/ahogado espectral.
   renderMarineBig(variant) → canvas para el combate; drawMarineSmall → silueta sobre el agua.
   ====================================================================== */
const MARINE_PAL = [
  { body: "#1e4a52", bodyHi: "#2f6e74", bodyDk: "#102c34", fin: "#143a46", eye: "#7ff0ff", maw: "#0a1820", skin: "#9fd0c8", scar: "#5fd0c0" }, // nixie (verde-azul)
  { body: "#2a2c58", bodyHi: "#454a86", bodyDk: "#161733", fin: "#1b1d40", eye: "#b78bff", maw: "#0a0818", skin: "#b8aed8", scar: "#9a7be0" }, // abisal (violeta)
];
export function renderMarineBig(variant = 0) {
  const key = `marine:${variant}`;
  if (cache.has(key)) return cache.get(key);
  const P = MARINE_PAL[variant % MARINE_PAL.length];
  const cv = document.createElement("canvas"); cv.width = 48; cv.height = 56;
  const g = cv.getContext("2d");
  const cx = 24;
  // cuerpo serpenteante que emerge del agua
  g.lineCap = "round"; g.lineJoin = "round";
  g.strokeStyle = P.bodyDk; g.lineWidth = 15;
  g.beginPath(); g.moveTo(cx + 9, 55); g.quadraticCurveTo(cx - 13, 46, cx - 4, 32); g.quadraticCurveTo(cx + 5, 20, cx, 12); g.stroke();
  g.strokeStyle = P.body; g.lineWidth = 11;
  g.beginPath(); g.moveTo(cx + 9, 55); g.quadraticCurveTo(cx - 13, 46, cx - 4, 32); g.quadraticCurveTo(cx + 5, 20, cx, 12); g.stroke();
  g.strokeStyle = P.bodyHi; g.lineWidth = 4;
  g.beginPath(); g.moveTo(cx + 7, 52); g.quadraticCurveTo(cx - 9, 44, cx - 2, 31); g.quadraticCurveTo(cx + 5, 21, cx, 14); g.stroke();
  // aletas dorsales dentadas
  g.fillStyle = P.fin;
  for (const [fx, fy, s] of [[cx - 6, 30, 7], [cx - 1, 22, 6], [cx + 2, 15, 5]]) { g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx - s, fy - s); g.lineTo(fx + 1, fy - 2); g.closePath(); g.fill(); }
  // cabeza
  g.fillStyle = P.body; g.beginPath(); g.ellipse(cx, 11, 10, 9, 0, 0, 7); g.fill();
  g.fillStyle = P.skin; g.beginPath(); g.ellipse(cx + 1, 11, 7, 7, 0, 0, 7); g.fill();
  // fauces
  g.fillStyle = P.maw; g.beginPath(); g.ellipse(cx + 1, 15, 4, 3, 0, 0, 7); g.fill();
  g.fillStyle = "#fff"; for (let i = -3; i <= 3; i += 2) { g.fillRect(cx + 1 + i, 13, 1, 2); g.fillRect(cx + 1 + i, 16, 1, 2); }
  // aletas laterales como brazos
  g.strokeStyle = P.fin; g.lineWidth = 3;
  g.beginPath(); g.moveTo(cx - 6, 12); g.lineTo(cx - 14, 16); g.lineTo(cx - 12, 22); g.stroke();
  g.beginPath(); g.moveTo(cx + 8, 12); g.lineTo(cx + 16, 15); g.lineTo(cx + 14, 21); g.stroke();
  // ojos brillantes
  g.fillStyle = P.eye; g.shadowColor = P.eye; g.shadowBlur = 5;
  g.beginPath(); g.arc(cx - 3, 9, 1.8, 0, 7); g.arc(cx + 5, 9, 1.8, 0, 7); g.fill();
  g.shadowBlur = 0; g.fillStyle = "#fff"; g.fillRect(cx - 4, 8, 1, 1); g.fillRect(cx + 4, 8, 1, 1);
  cache.set(key, cv);
  return cv;
}
/** Silueta del enemigo marino sobre el agua (cuerpo medio sumergido + estela). */
export function drawMarineSmall(g, x, y, t, variant = 0, flip = false, aggro = false) {
  const P = MARINE_PAL[variant % MARINE_PAL.length];
  const s = flip ? -1 : 1;
  const bob = Math.sin(t * 2.2 + x * 0.1) * 1.2;
  g.save(); g.translate(Math.round(x), Math.round(y + bob)); g.scale(s, 1);
  // lomo que asoma
  g.fillStyle = P.bodyDk; g.beginPath(); g.ellipse(0, 2, 11, 4.5, 0, 0, 7); g.fill();
  g.fillStyle = P.body; g.beginPath(); g.ellipse(-1, 1, 9, 3.4, 0, 0, 7); g.fill();
  // aleta dorsal
  g.fillStyle = P.fin; g.beginPath(); g.moveTo(-2, -1); g.lineTo(-6, -8); g.lineTo(2, -2); g.closePath(); g.fill();
  // cabeza + ojo
  g.fillStyle = P.body; g.beginPath(); g.ellipse(7, 0, 4.5, 3.5, 0, 0, 7); g.fill();
  g.fillStyle = P.eye; if (aggro) { g.shadowColor = P.eye; g.shadowBlur = 5; }
  g.beginPath(); g.arc(8, -1, 1.2, 0, 7); g.fill(); g.shadowBlur = 0;
  g.restore();
  // estela en la superficie
  g.globalAlpha = 0.5; g.fillStyle = "#cfe8ff";
  g.fillRect(Math.round(x - 10 * s), Math.round(y + 4), 1, 1); g.fillRect(Math.round(x - 14 * s), Math.round(y + 5 + bob), 1, 1);
  g.globalAlpha = 1;
}
