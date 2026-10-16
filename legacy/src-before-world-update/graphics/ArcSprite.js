/**
 * ArcSprite · Unit-A.R.C.
 * -----------------------
 * Robot de cobre gastado (32×48) construido por piezas y sombreado por reglas:
 * cilindros con dithering de transición, pátina verde dispersa, óxido en el lado
 * en sombra, arañazos brillantes, remaches y un ojo con degradado circular de
 * píxeles iluminado desde dentro. Mismo diseño que la hoja de personaje 02.
 */
export const ARC_W = 32, ARC_H = 48;
const RAMP = {
  copper: { 1: "#FFD9A0", 2: "#E8A25E", 3: "#B86B3A", 4: "#7E4527", 5: "#4A2618", o: "#2A140E" },
  steel:  { 1: "#B9BFCC", 2: "#8B92A1", 3: "#5E6472", 4: "#3E434E", 5: "#262931", o: "#15171C" },
};
const PATINA = { light: "#7FBFA0", base: "#4F8C78", dark: "#2F5A50" };
const RUST = { base: "#8E3B1E", dark: "#5E2414" };
const LENS = ["#FFF1B8", "#FFC24A", "#FF8A2A", "#D8501E", "#7A1E0A", "#2A0A06"]; // núcleo → borde
const LENS_STOPS = [0.22, 0.4, 0.58, 0.74, 0.88, 1.0];

const ARC_PARTS = [
  // [tipo, x, y, w, h, material, sombreado]
  ["rect", 3, 1, 9, 2, "copper", "flat", "rotorL"],
  ["rect", 20, 1, 9, 2, "copper", "flat", "rotorR"],
  ["rect", 7, 3, 1, 3, "steel", "flat", "mastL"],
  ["rect", 24, 3, 1, 3, "steel", "flat", "mastR"],
  ["rect", 6, 5, 20, 15, "copper", "cyl", "head", 4],
  ["rect", 4, 10, 2, 5, "steel", "cyl", "earL"],
  ["rect", 26, 10, 2, 5, "steel", "cyl", "earR"],
  ["rect", 12, 20, 8, 2, "steel", "cyl", "neck"],
  ["rect", 10, 37, 5, 7, "copper", "cyl", "legL"],
  ["rect", 17, 37, 5, 7, "copper", "cyl", "legR"],
  ["rect", 10, 35, 12, 3, "steel", "cyl", "pelvis"],
  ["rect", 5, 22, 22, 13, "copper", "cyl", "torso", 3],
  ["rect", 2, 27, 4, 6, "steel", "cyl", "armL"],
  ["rect", 26, 27, 4, 6, "steel", "cyl", "armR"],
  ["circle", 4.5, 24.5, 3.2, 0, "copper", "sphere", "shoulderL"],
  ["circle", 27.5, 24.5, 3.2, 0, "copper", "sphere", "shoulderR"],
  ["rect", 1, 33, 6, 7, "copper", "cyl", "foreL", 2],
  ["rect", 25, 33, 6, 7, "copper", "cyl", "foreR", 2],
  ["rect", 1, 40, 2, 3, "steel", "flat", "clawL1"],
  ["rect", 4, 40, 2, 3, "steel", "flat", "clawL2"],
  ["rect", 25, 40, 2, 3, "steel", "flat", "clawR1"],
  ["rect", 28, 40, 2, 3, "steel", "flat", "clawR2"],
  ["rect", 7, 44, 8, 4, "copper", "cyl", "footL", 2],
  ["rect", 17, 44, 8, 4, "copper", "cyl", "footR", 2],
];
export const EYE = { cx: 16, cy: 12.5, r: 5, rim: 6.6 };
const CORE = { cx: 16, cy: 28.5, r: 2.2, rim: 3.4 };

function hash(x, y, s = 1) {
  let n = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  n = (n ^ (n >>> 13)) * 1274126177;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

// Devuelve una matriz 32x48 de colores (o null) según opciones de técnica
export function buildArc({ dither = true, wear = true, lens = true, outline = "lit" } = {}) {
  const id = Array.from({ length: ARC_H }, () => Array(ARC_W).fill(-1));
  const info = Array.from({ length: ARC_H }, () => Array(ARC_W).fill(null));
  ARC_PARTS.forEach((p, i) => {
    const [type, x0, y0, w, h] = p;
    for (let y = 0; y < ARC_H; y++) for (let x = 0; x < ARC_W; x++) {
      let inside;
      if (type === "rect") {
        inside = x >= x0 && x < x0 + w && y >= y0 && y < y0 + h;
        const rad = p[8] || 0;
        if (inside && rad) { // esquina redondeada
          const inX = x < x0 + rad || x > x0 + w - 1 - rad, inY = y < y0 + rad || y > y0 + h - 1 - rad;
          if (inX && inY) {
            const cx = x < x0 + rad ? x0 + rad : x0 + w - 1 - rad;
            const cy = y < y0 + rad ? y0 + rad : y0 + h - 1 - rad;
            if (Math.hypot(x - cx, y - cy) > rad + 0.3) inside = false;
          }
        }
      }
      else inside = Math.hypot(x + 0.5 - x0, y + 0.5 - y0) <= w;
      if (!inside) continue;
      id[y][x] = i;
      info[y][x] = { part: i, u: 0, v: 0 };
      if (type === "rect") { info[y][x].u = w > 1 ? (x - x0) / (w - 1) : 0.4; info[y][x].v = h > 1 ? (y - y0) / (h - 1) : 0.5; }
      else { info[y][x].u = (x + 0.5 - (x0 - w)) / (2 * w); info[y][x].v = (y + 0.5 - (y0 - w)) / (2 * w); }
    }
  });
  const filled = (x, y) => x >= 0 && y >= 0 && x < ARC_W && y < ARC_H && id[y][x] >= 0;
  const out = Array.from({ length: ARC_H }, () => Array(ARC_W).fill(null));
  const tag = Array.from({ length: ARC_H }, () => Array(ARC_W).fill(""));

  for (let y = 0; y < ARC_H; y++) for (let x = 0; x < ARC_W; x++) {
    const k = id[y][x];
    if (k < 0) continue;
    const [type, x0, y0, w, h, mat, shade] = ARC_PARTS[k];
    const R = RAMP[mat];
    const { u, v } = info[y][x];
    let level, dpair = null;
    if (shade === "cyl") {
      if (u < 0.12) level = 1; else if (u < 0.28) level = 2; else if (u < 0.37) dpair = [2, 3];
      else if (u < 0.6) level = 3; else if (u < 0.7) dpair = [3, 4]; else if (u < 0.88) level = 4; else level = 5;
    } else if (shade === "sphere") {
      const d = Math.hypot(x + 0.5 - (x0 - w * 0.35), y + 0.5 - (y0 - w * 0.35)) / (w * 1.35);
      if (d < 0.22) level = 1; else if (d < 0.42) level = 2; else if (d < 0.52) dpair = [2, 3];
      else if (d < 0.72) level = 3; else if (d < 0.82) dpair = [3, 4]; else if (d < 0.97) level = 4; else level = 5;
    } else {
      level = v < 0.5 ? 2 : 3;
    }
    if (dpair) {
      tag[y][x] = "dither";
      level = dither ? ((x + y) % 2 ? dpair[0] : dpair[1]) : (u < 0.5 ? dpair[0] : dpair[1]);
    }
    // borde superior iluminado e inferior oscurecido
    if (type === "rect" && shade === "cyl") {
      if (!filled(x, y - 1) || id[y - 1][x] !== k) level = Math.max(1, level - 1);
      if (!filled(x, y + 1) || id[y + 1][x] !== k) level = Math.min(5, level + 1);
    }
    let col = R[level];

    // anillos de segmentación en brazos de acero y cuello
    if (/arm|neck/.test(ARC_PARTS[k][7]) && (y - y0) % 2 === 1) col = R[Math.min(5, level + 1)];

    // contorno selectivo
    const exposed = [[0, -1], [-1, 0], [1, 0], [0, 1]].some(([dx, dy]) => !filled(x + dx, y + dy));
    const behind = [[0, -1], [-1, 0], [1, 0], [0, 1]].some(([dx, dy]) => filled(x + dx, y + dy) && id[y + dy][x + dx] < k);
    if (exposed) {
      const lit = (!filled(x, y - 1) || !filled(x - 1, y)) && filled(x, y + 1) && filled(x + 1, y);
      col = outline === "black" ? "#000000" : outline === "lit" && lit ? R[4] : R.o;
      tag[y][x] = "outline";
    } else if (behind) {
      col = outline === "black" ? "#000000" : R[5];
      tag[y][x] = "seam";
    }

    // desgaste: pátina verde (dithering disperso) y óxido en el lado en sombra
    if (wear && mat === "copper" && tag[y][x] !== "outline") {
      const hv = hash(x, y);
      const lower = v > 0.82 ? 0.55 : v > 0.66 ? 0.28 : 0;   // el agua se acumula abajo
      const nearSeam = tag[y][x] === "seam" ? 0.35 : 0;
      if (hv < Math.max(lower, nearSeam)) {
        col = level <= 2 ? PATINA.light : level === 3 ? PATINA.base : PATINA.dark;
        tag[y][x] = "patina";
      }
      if (u > 0.68 && ["head", "torso"].includes(ARC_PARTS[k][7])) {
        const spots = [[22, 8], [21, 16], [23, 31], [20, 25]];
        for (const [sx, sy] of spots) {
          const d = Math.hypot(x - sx, y - sy);
          if (d < 1.2 || (d < 2.2 && (x + y) % 2 === 0)) { col = d < 1.2 ? RUST.dark : RUST.base; tag[y][x] = "rust"; }
        }
      }
    }
    out[y][x] = col;
  }

  // arañazos brillantes (metal gastado) y remaches
  if (wear) {
    for (const [x, y] of [[9, 24], [10, 25], [11, 26], [8, 30], [9, 31], [13, 7], [14, 7]]) { out[y][x] = RAMP.copper[1]; tag[y][x] = "scratch"; }
  }
  for (const [x, y] of [[7, 7], [24, 7], [7, 17], [24, 17], [7, 24], [24, 24], [7, 32], [24, 32]]) {
    out[y][x] = RAMP.copper[1]; tag[y][x] = "rivet";
    if (out[y + 1] && out[y + 1][x + 1]) out[y + 1][x + 1] = RAMP.copper[5];
  }
  // rejilla de la boca
  for (let x = 11; x <= 20; x++) { out[18][x] = x % 2 ? RAMP.steel[5] : RAMP.steel[3]; tag[18][x] = "grille"; }

  // lentes: ojo central y núcleo del pecho
  for (const L of [EYE, CORE]) {
    for (let y = 0; y < ARC_H; y++) for (let x = 0; x < ARC_W; x++) {
      const d = Math.hypot(x + 0.5 - L.cx, y + 0.5 - L.cy);
      if (d > L.rim) continue;
      if (d > L.r) { // carcasa: anillo de cobre iluminado arriba-izquierda
        const ang = Math.atan2(y + 0.5 - L.cy, x + 0.5 - L.cx);
        const lightness = Math.cos(ang + Math.PI * 0.75); // 1 = arriba-izquierda
        const lv = lightness > 0.55 ? 2 : lightness > -0.1 ? 3 : lightness > -0.6 ? 4 : 5;
        out[y][x] = outline === "black" && d > L.rim - 0.9 ? "#000000" : RAMP.copper[lv];
        tag[y][x] = "housing";
        continue;
      }
      const t = d / L.r;
      let idx = LENS_STOPS.findIndex((s) => t <= s);
      if (!lens) idx = t < 0.5 ? 2 : 4;
      out[y][x] = LENS[idx];
      tag[y][x] = "lens" + idx;
    }
    if (lens) { // reflejo especular arriba-izquierda y media luna inferior
      const s = L === EYE ? [[13, 9, "#FFFFFF"], [14, 9, "#FFF8E8"], [13, 10, "#FFF8E8"], [18, 15, "#FFB070"], [19, 14, "#FFB070"], [17, 16, "#E8803A"]]
                          : [[15, 27, "#FFFFFF"]];
      for (const [x, y, c] of s) { out[y][x] = c; tag[y][x] = "glint"; }
    }
  }
  return { px: out, tag };
}

/** Hornea el sprite completo en un canvas nativo de 32×48. */
export function renderArcCanvas(options = {}) {
  const { px } = buildArc(options);
  const canvas = document.createElement("canvas");
  canvas.width = ARC_W;
  canvas.height = ARC_H;
  const ctx = canvas.getContext("2d");
  for (let y = 0; y < ARC_H; y++) for (let x = 0; x < ARC_W; x++) {
    if (!px[y][x]) continue;
    ctx.fillStyle = px[y][x];
    ctx.fillRect(x, y, 1, 1);
  }
  return canvas;
}
