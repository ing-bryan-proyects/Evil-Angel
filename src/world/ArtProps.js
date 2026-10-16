/**
 * ArtProps · dibujo y colisión de los sprites de escenografía (hojas de escenarios)
 * ----------------------------------------------------------------------------------
 * Los kits (Kits.js) deciden qué sprite lleva cada obstáculo (`o.sa` atlas, `o.spr` nombre). Aquí:
 *
 *   artFrame(atlas, name)            fotograma de un sprite
 *   artBox(type, ent, x, y)          caja de colisión según el tipo y el tamaño del sprite
 *   drawArt(g, o, t, opt)            dibuja con balanceo por franjas (la copa se mueve más que la base),
 *                                    temblor, giro, salto, aplastado y destello de impacto
 *   artCanvas(ent)                   copia el sprite a un canvas (casas, minimapa)
 */
import { ATLAS } from "../graphics/Atlas.js";
import { wind } from "./EnvironmentAnimation.js";

export const artFrame = (atlas, name) => ATLAS[atlas]?.frame(name, 0) || null;

const clamp = (a, lo, hi) => Math.max(lo, Math.min(hi, a));

/**
 * Ancho REAL de la base del sprite (huella sobre el suelo): mide los píxeles opacos de la franja inferior,
 * cacheado por sprite. Así la caja de colisión coincide con el tronco/piedra que se ve y no se "atraviesa".
 * `band` = fracción de la altura, desde abajo, que cuenta como base.
 */
const footCache = new Map();
export function footWidth(ent, band = 0.14) {
  const key = `${ent.a}.${ent.n}.${band}`;
  if (footCache.has(key)) return footCache.get(key);
  const f = artFrame(ent.a, ent.n); const A = ATLAS[ent.a];
  if (!f || !A?.img) return null;
  let w = Math.round(f.w * 0.5);
  try {
    const h = Math.max(3, Math.round(f.h * band));
    const cv = document.createElement("canvas"); cv.width = f.w; cv.height = h;
    const g = cv.getContext("2d", { willReadFrequently: true }); g.imageSmoothingEnabled = false;
    g.drawImage(A.img, f.x, f.y + f.h - h, f.w, h, 0, 0, f.w, h);
    const d = g.getImageData(0, 0, f.w, h).data;
    let lo = f.w, hi = 0;
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < f.w; xx++) if (d[(yy * f.w + xx) * 4 + 3] > 40) { if (xx < lo) lo = xx; if (xx > hi) hi = xx; }
    if (hi >= lo) w = hi - lo + 1;
  } catch { /* sin canvas: ancho aproximado */ }
  w = Math.round(w / (A.px || 1));                              // de px de atlas a px de juego
  footCache.set(key, w);
  return w;
}

/**
 * Caja de colisión (en los pies) según el tipo y la HUELLA real del sprite. null = se atraviesa.
 * Los objetos sólidos ocupan el ancho de su base y una altura algo mayor, para que no se les atraviese por el lado
 * ni en diagonal. Árboles/pilares/estatuas usan la anchura del tronco/pedestal (base estrecha), no la de la copa.
 */
export function artBox(type, ent, x, y) {
  const f = artFrame(ent.a, ent.n); if (!f) return null;
  const fw = footWidth(ent) || Math.round(f.w * 0.5);          // ancho real de la base (px de juego)
  const BOX = {                                                // [fracción de la huella, mínimo, máximo, alto]
    rock: [0.86, 10, 40, 7], crag: [0.9, 24, 96, 11], log: [0.96, 20, 120, 7],
    oak: [0.78, 12, 34, 8], pine: [0.74, 10, 30, 8], dead: [0.72, 8, 26, 6], stump: [0.9, 10, 28, 6],
    tomb: [0.86, 12, 48, 7], pillar: [0.82, 10, 30, 8], statue: [0.82, 12, 40, 8],
    wall: [0.94, 18, 120, 8], fence: [0.96, 14, 80, 5],
    crate: [0.9, 8, 34, 7], barrel: [0.84, 8, 24, 7], cart: [0.9, 16, 56, 7],
    rubble: [0.82, 10, 44, 6], bigrubble: [0.84, 12, 52, 7], crystal: [0.7, 8, 24, 6], brazier: [0.7, 8, 22, 6],
  };
  const spec = BOX[type]; if (!spec) return null;              // plantas y setas: se atraviesan
  const [frac, mn, mx, h] = spec;
  const w = Math.round(clamp(fw * frac, mn, mx));
  return { x: x - (w >> 1), y: y - h, w, h };
}

/** Copia un sprite a un canvas propio (para casas y piezas grandes). */
export function artCanvas(ent) {
  const f = artFrame(ent.a, ent.n); if (!f) return null;
  const c = document.createElement("canvas"); c.width = f.w; c.height = f.h;
  const g = c.getContext("2d"); g.imageSmoothingEnabled = false;
  g.drawImage(ATLAS[ent.a].img, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
  return c;
}

/**
 * Dibuja el sprite del obstáculo `o` (o.sa atlas, o.spr nombre) anclado en (o.bx, o.by).
 * opt: { amp (px de balanceo), k (potencia de la curva), cut (0..1: recorta desde arriba), squash (0..1: aplasta en vertical),
 *        rigidSway (true: el árbol entero se inclina como un bloque rígido, sin ondular por franjas —
 *                   así un tronco de madera no se comba como si fuera una hoja), rot,
 *        pivotY (px sobre la base alrededor de los que gira), ox, oy, alpha, flash }
 */
export function drawArt(g, o, t, opt = {}) {
  const A = ATLAS[o.sa]; if (!A || !o.spr) return;
  const f = A.frame(o.spr, 0); if (!f) return;
  const x = (opt.ox || 0) + o.bx, y = (opt.oy || 0) + o.by + 1;
  let s = 0;
  const amp = opt.amp ?? 0;
  if (amp) s = wind.sway(o.bx, o.by, o.v * 6) * amp;
  if (o.shake > 0.02 && !opt.rigidSway && opt.canopy == null) s += Math.sin(wind.t * 30 + o.v * 9) * 2.4 * o.shake;   // tronco rígido / copa: el impacto lo lleva `ox`, no se comba la silueta
  if (o.push) s += o.push;
  const img = A.img;
  const top = Math.round((opt.cut || 0) * f.h);                // plantas cortadas: solo queda la base
  const hh = f.h - top;
  const sq = opt.squash ? 1 - opt.squash * 0.7 : 1;            // setas aplastadas
  const rigidRot = opt.rigidSway ? clamp(s / Math.max(24, f.h * 1.4), -0.09, 0.09) : 0;   // inclinación de todo el tronco, no una onda
  g.save();
  if (opt.rot || sq !== 1 || rigidRot) {
    const py = o.by - (opt.pivotY || 0);
    g.translate(o.bx, py); if (opt.rot || rigidRot) g.rotate((opt.rot || 0) + rigidRot); if (sq !== 1) g.scale(1 + (1 - sq) * 0.5, sq); g.translate(-o.bx, -py);
  }
  if (opt.alpha != null) g.globalAlpha = opt.alpha;
  const dx0 = x - f.ax, dy0 = y - f.ay - 1;
  if (opt.rigidSway || Math.abs(s) < 0.4 || !amp) {
    g.drawImage(img, f.x, f.y + top, f.w, hh, dx0, dy0 + top, f.w, hh);
  } else {
    // En un árbol SOLO se mueven la copa y las ramas, nunca el tronco: `canopy` = fracción de altura (desde la base)
    // que es tronco y queda fija; por encima, la copa se desplaza más cuanto más arriba, según el viento.
    const canopy = opt.canopy;
    const SL = 2;
    for (let r = top; r < f.h; r += SL) {
      const sh = Math.min(SL, f.h - r);
      const k = (f.h - 1 - (r + sh / 2)) / (f.h - 1);           // 1 arriba, 0 en la base
      let w;
      if (canopy != null) w = Math.pow(clamp((k - canopy) / Math.max(0.05, 1 - canopy), 0, 1), 1.3);   // tronco fijo, copa creciente
      else w = Math.pow(Math.max(0, k - 0.1) / 0.9, opt.k ?? 1.5);                                      // plantas/arbustos: ondulan enteros
      const off = Math.round(s * w);
      g.drawImage(img, f.x, f.y + r, f.w, sh, dx0 + off, dy0 + r, f.w, sh);
    }
  }
  if (opt.flash > 0) {                                        // destello aditivo al recibir un golpe
    g.globalCompositeOperation = "lighter"; g.globalAlpha = Math.min(0.6, opt.flash);
    g.drawImage(img, f.x, f.y + top, f.w, hh, dx0, dy0 + top, f.w, hh);
  }
  g.restore();
}
