/**
 * Terrain · pintado del suelo del mapa rectangular y rejilla de colisiones
 * ---------------------------------------------------------------------
 * Pinta el suelo completo en un único canvas escribiendo directamente en un búfer
 * Uint32 (millones de píxeles en milisegundos):
 *
 *   hierba con manchas (ruido en dos octavas + dithering Bayer), oscurecida hacia el borde
 *   muro de roca fuera del disco
 *   lagos: orilla de arena, espuma, tres profundidades con dithering
 *   camino de tierra con luz arriba y sombra abajo (puentes de madera al cruzar lagos)
 *   cráter de impacto: núcleo de brasas, tierra quemada con grietas, anillo elevado, hierba chamuscada
 *   montañas escalonadas: caras de acantilado con estratos, cumbre plana, escaleras
 *
 * Y construye `grid` (celdas de 4 px): 1 = agua, 2 = acantilado/borde, 4 = vacío fuera del disco.
 * Una celda con cualquier bit activo es intransitable. Las escaleras y el camino la abren.
 */

import { BAYER4, makeNoise, STONE, MOSS, BARK } from "./Scenery.js";

export const CELL = 4;
export const F_WATER = 1, F_CLIFF = 2, F_VOID = 4;

const hex32 = (h) => {
  const n = parseInt(h.slice(1), 16);
  return (255 << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | (n >> 16);
};
const mix32 = (a, b, t) => {
  const ar = a & 255, ag = (a >> 8) & 255, ab = (a >> 16) & 255, br = b & 255, bg = (b >> 8) & 255, bb = (b >> 16) & 255;
  return (255 << 24) | (Math.round(ab + (bb - ab) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ar + (br - ar) * t);
};

export const DEFAULT_WATER = { sand: ["#b8a878", "#d4c490"], foam: "#e6f0ee", bands: ["#4a9ab8", "#2e7aa0", "#1f5a86", "#163f66"], glint: "#cfe8ff" };

/**
 * @param {object} L    layout de MapGen
 * @param {object} pal  paleta del mapa (bands, pathTones, water, hill…)
 * @param {() => number} rand
 */
export function paintTerrain(L, pal, rand, ground = null) {
  const { W, H } = L;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d");
  const img = ctx.createImageData(W, H);
  const buf = new Uint32Array(img.data.buffer);
  const gw = Math.ceil(W / CELL), gh = Math.ceil(H / CELL);
  const grid = new Uint8Array(gw * gh);
  const seed = L.seed | 0;

  const bands = pal.bands.map(hex32);
  const limits = [0.3, 0.43, 0.66, 0.8, Infinity];
  const rock = ["#07050d", "#0d0a16", "#150f22", "#1e1530", "#2a1d40"].map(hex32);
  const broad = makeNoise(seed + 1, 38), fine = makeNoise(seed + 2, 9), grain = makeNoise(seed + 3, 3), pathNoise = makeNoise(seed + 4, 14);
  const wat = { ...DEFAULT_WATER, ...(pal.water || {}) };

  const mark = (x, y, f) => { if (x >= 0 && y >= 0 && x < W && y < H) grid[(y >> 2) * gw + (x >> 2)] |= f; };
  const clearFlag = (x0, y0, x1, y1, f) => {
    for (let gy = y0 >> 2; gy <= y1 >> 2; gy++) for (let gx = x0 >> 2; gx <= x1 >> 2; gx++) if (gx >= 0 && gy >= 0 && gx < gw && gy < gh) grid[gy * gw + gx] &= ~f;
  };
  const span = (y, x0, x1, col) => {
    if (y < 0 || y >= H) return;
    x0 = Math.max(0, x0 | 0); x1 = Math.min(W - 1, x1 | 0);
    if (x1 >= x0) buf.fill(col, y * W + x0, y * W + x1 + 1);
  };

  /* ---- 1. Hierba / roca ---- */
  const EDGE = 26, FADE = 150;                              // franja de roca oscura en el borde y oscurecimiento progresivo
  if (ground) {                                             // suelo con las baldosas de la hoja del bioma
    ground.paint(buf, W, H, {
      edge: EDGE, fade: FADE, noise: (x, y) => broad(x, y) * 0.6 + fine(x, y) * 0.4, patch: makeNoise(seed + 11, 140), seam: fine,
      rock: (x, y) => { const n = broad(x, y) * 0.6 + fine(x, y) * 0.3 + (y % 37 < 3 ? 0.12 : 0) + BAYER4[y & 3][x & 3] * 0.12; return rock[Math.max(0, Math.min(4, (n * 5.2) | 0))]; },
    });
  } else
  for (let y = 0; y < H; y++) {
    const ey = Math.min(y, H - 1 - y);
    for (let x = 0; x < W; x++) {
      const e = Math.min(ey, x, W - 1 - x);
      const bay = BAYER4[y & 3][x & 3];
      if (e < EDGE) {
        const n = broad(x, y) * 0.6 + fine(x, y) * 0.3 + (y % 37 < 3 ? 0.12 : 0) + bay * 0.12;
        buf[y * W + x] = rock[Math.max(0, Math.min(4, (n * 5.2) | 0))];
        continue;
      }
      let n = broad(x, y) * 0.7 + fine(x, y) * 0.3 + bay * 0.07;
      if (e < FADE) n -= ((FADE - e) / FADE) * 0.32;
      let i = 0;
      while (n >= limits[i]) i++;
      buf[y * W + x] = bands[i];
    }
  }
  // celdas fuera del terreno jugable (borde del rectángulo)
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
    const x = gx * CELL + 2, y = gy * CELL + 2;
    if (Math.min(x, y, W - x, H - y) < 36) grid[gy * gw + gx] |= F_VOID;
  }

  /* ---- 2. Lagos ---- */
  const sand = wat.sand.map(hex32), foam = hex32(wat.foam), wb = wat.bands.map(hex32);
  const deepCore = mix32(wb[3], 0xff000000, 0.5);             // centro abisal del lago (zona profunda donde se nada y acechan los enemigos marinos)
  const waterSpots = [];
  const decor = [];
  for (const lk of L.lakes) {
    const maxR = lk.r * 1.45;
    const x0 = Math.max(0, (lk.cx - maxR) | 0), x1 = Math.min(W - 1, (lk.cx + maxR) | 0);
    const y0 = Math.max(0, (lk.cy - maxR) | 0), y1 = Math.min(H - 1, (lk.cy + maxR) | 0);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const dx = x - lk.cx, dy = y - lk.cy;
      const rr = lk.radius(Math.atan2(dy, dx));
      const t = Math.sqrt(dx * dx + dy * dy) / rr;
      if (t > 1.16) continue;
      const bay = BAYER4[y & 3][x & 3];
      if (t >= 1) {                                    // orilla de arena y barro
        const k = (t - 1) / 0.16 + bay * 0.5 + fine(x, y) * 0.3;
        if (k < 0.78) buf[y * W + x] = k < 0.34 ? sand[1] : sand[0];
        continue;
      }
      let col;
      if (t > 0.93) col = foam;
      else if (t > 0.8 + bay * 0.05) col = wb[0];
      else if (t > 0.56 + bay * 0.06) col = wb[1];
      else if (t > 0.34 + bay * 0.05) col = wb[2];
      else if (t > 0.2 + bay * 0.05) col = wb[3];
      else col = deepCore;                                    // núcleo profundo: casi negro-azulado
      // ondas: líneas horizontales algo más claras / oscuras
      const w = fine(x * 0.45, y * 1.9);
      if (t < 0.93 && w > 0.74 && (x + y) % 3 === 0) col = mix32(col, 0xffffffff, 0.12);
      else if (t < 0.93 && w < 0.2 && (x + y) % 4 === 0) col = mix32(col, 0xff000000, 0.18);
      buf[y * W + x] = col;
      if (t < 0.95) mark(x, y, F_WATER);
      if (t < 0.9 && x % 5 === 0 && y % 5 === 0 && rand() < 0.1) waterSpots.push({ x, y, p: rand() * 6.28 });
    }
    // juncos y nenúfares en la orilla
    for (let i = 0; i < Math.round(lk.r / 9); i++) {
      const a = rand() * 6.28, rr = lk.radius(a);
      decor.push({ type: "reeds", x: Math.round(lk.cx + Math.cos(a) * rr * (1.0 + rand() * 0.07)), y: Math.round(lk.cy + Math.sin(a) * rr * (1.0 + rand() * 0.07)), p: rand() * 6.28, v: rand() });
    }
    for (let i = 0; i < Math.round(lk.r / 12); i++) {
      const a = rand() * 6.28, rr = lk.radius(a) * (0.55 + rand() * 0.34);
      decor.push({ type: "lily", x: Math.round(lk.cx + Math.cos(a) * rr), y: Math.round(lk.cy + Math.sin(a) * rr), p: rand() * 6.28, v: rand() });
    }
  }

  /* ---- 3. Camino de tierra ---- */
  const [pEdge, pDark, pBase, pLight] = pal.pathTones.map(hex32);
  const ptex = ground ? ground.pathTex : null;
  const pEdgeC = ptex ? ptex.edge[(24 * 48 + 24)] : pEdge;
  const spanT = (y, x0, x1, tex) => {                       // franja con la textura de tierra (alineada al mundo)
    if (y < 0 || y >= H) return;
    x0 = Math.max(0, x0 | 0); x1 = Math.min(W - 1, x1 | 0);
    const row = (y % 48) * 48;
    for (let x = x0; x <= x1; x++) buf[y * W + x] = tex[row + (x % 48)];
  };
  const bridgeSamples = [];
  const lakeT = (x, y) => {
    let best = 9;
    for (const lk of L.lakes) {
      const dx = x - lk.cx, dy = y - lk.cy;
      if (Math.abs(dx) > lk.r * 1.6 || Math.abs(dy) > lk.r * 1.6) continue;
      best = Math.min(best, Math.sqrt(dx * dx + dy * dy) / lk.radius(Math.atan2(dy, dx)));
    }
    return best;
  };
  const pts = L.path.pts;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const steps = 3;
    for (let k = 0; k < steps; k++) {
      const x = a.x + ((b.x - a.x) * k) / steps, y = a.y + ((b.y - a.y) * k) / steps;
      const taper = Math.min(1, a.s / 40 + 0.35);
      const h = (10 + pathNoise(x, y) * 5.5) * taper;
      const inLake = lakeT(x, y) < 1.04;
      if (inLake && k === 0 && i % 2 === 0) bridgeSamples.push({ x, y, tx: b.x - a.x, ty: b.y - a.y });
      const ix = x | 0, iy = y | 0;
      for (let dy = -Math.ceil(h + 2); dy <= Math.ceil(h + 2); dy++) {
        const yy = iy + dy;
        const he = Math.sqrt(Math.max(0, (h + 2) * (h + 2) - dy * dy));
        const hd = Math.abs(dy) <= h ? Math.sqrt(h * h - dy * dy) : -1;
        if (hd >= 0) {                                    // borde irregular con dithering (con suelo de hoja: sin punteado, solo la franja oscura)
          if (!ptex) {
          for (let xx = Math.ceil(-he); xx < -hd; xx++) if (BAYER4[yy & 3][(ix + xx) & 3] < -0.05 + (1 - (-xx - hd) / 2) * 0.45) { if (yy >= 0 && yy < H && ix + xx >= 0 && ix + xx < W) buf[yy * W + ix + xx] = pEdgeC; }
          for (let xx = Math.floor(hd) + 1; xx <= he; xx++) if (BAYER4[yy & 3][(ix + xx) & 3] < -0.05 + (1 - (xx - hd) / 2) * 0.45) { if (yy >= 0 && yy < H && ix + xx >= 0 && ix + xx < W) buf[yy * W + ix + xx] = pEdgeC; }
          }
          if (ptex) spanT(yy, ix - hd, ix + hd, ptex.dark); else span(yy, ix - hd, ix + hd, pDark);
        }
        const by = dy - 1; const hb = Math.abs(by) <= h - 2.5 ? Math.sqrt((h - 2.5) * (h - 2.5) - by * by) : -1;
        if (hb >= 0) { if (ptex) spanT(yy, ix - hb, ix + hb, ptex.base); else span(yy, ix - hb, ix + hb, pBase); }
        const ly = dy + 2.5; const hl = Math.abs(ly) <= h - 5 ? Math.sqrt((h - 5) * (h - 5) - ly * ly) : -1;
        if (hl >= 0) { if (ptex) spanT(yy, ix - hl, ix + hl, ptex.light); else span(yy, ix - hl, ix + hl, pLight); }
      }
      // el camino abre la rejilla (aunque cruce un lago: puente)
      clearFlag(ix - h + 1, iy - h + 1, ix + h - 1, iy + h - 1, F_WATER);
    }
  }
  for (let i = 0; i < pts.length; i += 2) {                         // guijarros del camino
    const p = pts[i];
    const x = p.x + (rand() - 0.5) * 18, y = p.y + (rand() - 0.5) * 18;
    if (lakeT(x, y) < 1.05) continue;
    const c = rand() < 0.5 ? hex32(pal.pebble[0]) : pEdge;
    span(y | 0, x, x + (rand() * 2 | 0), c);
  }

  /* ---- 4. Cráter ---- */
  if (L.crater) paintCrater(L.crater);
  function paintCrater(cr) {
    const maxR = cr.r * 1.8;
    const ash = ["#120a08", "#1c120e", "#2a1c14", "#3a281c", "#4a3424"].map(hex32);
    const ember = ["#3a0e06", "#7a2a10", "#c8501a", "#ff8a2a", "#ffd070"].map(hex32);
    const mud = ["#3a281c", "#54382a", "#7a5438", "#a07a50"].map(hex32);
    const crackN = makeNoise(seed + 9, 11);
    for (let y = Math.max(0, (cr.y - maxR) | 0); y <= Math.min(H - 1, (cr.y + maxR) | 0); y++) {
      for (let x = Math.max(0, (cr.x - maxR) | 0); x <= Math.min(W - 1, (cr.x + maxR) | 0); x++) {
        const dx = x - cr.x, dy = y - cr.y, d = Math.sqrt(dx * dx + dy * dy), t = d / cr.r;
        if (t > 1.8) continue;
        const bay = BAYER4[y & 3][x & 3], th = Math.atan2(dy, dx);
        const wob = 1 + crackN(x, y) * 0.18 - 0.09;
        const tt = t / wob;
        const idx = y * W + x;
        if (tt < 0.28) {                                              // núcleo de brasas
          const e = crackN(x * 1.7, y * 1.7) + bay * 0.2 - tt * 0.9;
          buf[idx] = ember[Math.max(0, Math.min(4, ((e + 0.2) * 5) | 0))];
        } else if (tt < 0.84) {                                       // tierra quemada con grietas radiales
          const ang = Math.sin(th * 9 + crackN(x, y) * 5) ;
          let col = ash[Math.max(0, Math.min(3, ((fine(x, y) + bay * 0.2) * 3.2) | 0))];
          if (ang > 0.86 && tt < 0.74) col = ember[1 + ((x + y) & 1)];
          else if (ang < -0.9) col = ash[0];
          // luz desde arriba-izquierda sobre la pendiente interior
          if (tt > 0.6 && dx + dy > 0) col = mix32(col, 0xff000000, 0.28);
          buf[idx] = col;
        } else if (tt < 1.02) {                                       // anillo elevado
          const lit = dx + dy < 0;
          const k = Math.max(0, Math.min(3, ((lit ? 0.62 : 0.2) + grain(x, y) * 0.4 + bay * 0.2) * 3.5 | 0));
          buf[idx] = mud[k];
          mark(x, y, 0);
        } else {                                                      // hierba chamuscada que se desvanece
          const f = Math.max(0, 1 - (tt - 1.02) / 0.78);
          if (rand() < f * 0.55 + (BAYER4[y & 3][x & 3] + 0.5) * f * 0.3) {
            const cur = buf[idx];
            buf[idx] = mix32(cur, ash[(grain(x, y) * 3) | 0], 0.55 + f * 0.4);
          }
          // estrías de impacto: rayos oscuros que salen del cráter
          if (Math.sin(th * 14 + crackN(x * 0.4, y * 0.4) * 6) > 0.97 && tt < 1.32) buf[idx] = ash[0];
        }
      }
    }
  }

  /* ---- 5. Montañas escalonadas ---- */
  const stairRects = [];
  const summits = [];
  const topPal = (hill, t) => {
    if (hill.snow) return t >= 1 ? ["#bcd0e6", "#d8e6f4", "#eef6ff", "#ffffff"] : ["#7e90a8", "#98aac2", "#b4c4d8", "#d0def0"];
    return t === 0 ? ["#6a7a48", "#7d8c58", "#909e68", "#a3b078"] : ["#7a8068", "#8c927a", "#a0a68c", "#b4baa0"];
  };
  const facePal = (hill) => (hill.snow ? ["#2c3a52", "#4a5c78", "#6a7e9c", "#8aa0c0", "#a8bcd8"] : STONE.slice(0, 5));
  for (const hill of L.hills) {
    hill.tierInfo = [];
    hill.tiers.forEach((tier, ti) => {
      const mr = tier.r * 1.35;
      const x0 = Math.max(0, (hill.cx - mr) | 0), x1 = Math.min(W - 1, (hill.cx + mr) | 0);
      const inside = (x, y) => { const dx = x - hill.cx, dy = y - hill.cy; return dx * dx + dy * dy < tier.radius(Math.atan2(dy, dx)) ** 2; };
      // límites por columna
      const top = new Int32Array(x1 - x0 + 1).fill(-1), bot = new Int32Array(x1 - x0 + 1).fill(-1);
      for (let x = x0; x <= x1; x++) {
        for (let y = Math.max(0, (hill.cy - mr) | 0); y <= Math.min(H - 1, (hill.cy + mr) | 0); y++) if (inside(x, y)) { if (top[x - x0] < 0) top[x - x0] = y; bot[x - x0] = y; }
      }
      const fp = facePal(hill).map(hex32), tp = topPal(hill, ti).map(hex32);
      const Hh = tier.h;
      // caras de acantilado (bajo la mitad inferior de la silueta)
      for (let x = x0; x <= x1; x++) {
        const b = bot[x - x0];
        if (b < 0) continue;
        for (let k = 1; k <= Hh; k++) {
          const y = b + k;
          if (y >= H) break;
          const strata = fine(x * 0.7, y * 0.22 + ti * 7);
          let idx = k < 2 ? 4 : k > Hh - 3 ? 1 : strata > 0.62 ? 3 : strata > 0.36 ? 2 : 1;
          if (BAYER4[y & 3][x & 3] > 0.3 && idx > 1) idx--;
          if (hill.snow && k < 4 && fine(x, 3) > 0.35) idx = 4;
          if (grain(x * 2, y) > 0.82) idx = Math.max(0, idx - 1);
          buf[y * W + x] = fp[idx];
          mark(x, y, F_CLIFF);
        }
        buf[(b + Hh) * W + x] = fp[0];
        for (let k = 1; k <= 4; k++) {                               // sombra proyectada al pie del acantilado
          const y = b + Hh + k;
          if (y < H) buf[y * W + x] = mix32(buf[y * W + x], 0xff000000, 0.38 - k * 0.07);
        }
      }
      // cumbre plana
      for (let y = Math.max(0, (hill.cy - mr) | 0); y <= Math.min(H - 1, (hill.cy + mr) | 0); y++) for (let x = x0; x <= x1; x++) {
        if (!inside(x, y)) continue;
        const n = broad(x, y) * 0.6 + fine(x, y) * 0.4 + BAYER4[y & 3][x & 3] * 0.14;
        let col = tp[Math.max(0, Math.min(3, (n * 4.2) | 0))];
        if (!hill.snow && ti > 0 && grain(x, y) > 0.78) col = fp[2];             // piedras sueltas en los pisos altos
        // borde: labio iluminado al norte/oeste, sombra al sur/este
        const nb = !inside(x - 1, y) || !inside(x, y - 1), sb = !inside(x + 1, y) || !inside(x, y + 1);
        const rim = !inside(x - 3, y) || !inside(x + 3, y) || !inside(x, y - 3) || !inside(x, y + 3);
        const ao = !inside(x - 3, y) || !inside(x + 3, y) || !inside(x, y - 3) || !inside(x, y + 3);
        if (ao) col = mix32(col, 0xff000000, 0.22);
        if (nb) col = hill.snow ? hex32("#ffffff") : hex32("#c4d890");
        else if (sb) col = fp[0];
        buf[y * W + x] = col;
        if (rim) mark(x, y, F_CLIFF);                 // el borde de la cumbre no se pisa
      }
      hill.tierInfo.push({ x0, x1, top, bot, inside, ti, tier, fp, tp, Hh });
    });
  }
  // Escaleras (después de pintar todo para que no las tape un piso superior)
  for (const hill of L.hills) {
    hill.tierInfo.forEach((info) => {
      const { x0, bot, tier, fp, Hh, ti } = info;
      const sx = Math.round(hill.cx + tier.stairSide * tier.stairOff * tier.r);
      const col = bot[sx - x0] >= 0 ? sx : Math.round(hill.cx);
      const yb = bot[col - x0];
      const rect = { x: col - 9, y: yb - 5, w: 18, h: Hh + 9 };
      tier.stair = { x: col, yb, rect, bottomY: yb + Hh + 4 };
      stairRects.push(rect);
      // peldaños: franjas horizontales claras/oscuras con barandas de roca
      for (let y = rect.y; y < rect.y + rect.h; y++) for (let x = rect.x; x < rect.x + rect.w; x++) {
        const edge = x < rect.x + 2 || x >= rect.x + rect.w - 2;
        const k = (y - rect.y) % 3;
        let c = edge ? fp[edge && x === rect.x ? 0 : 2] : k === 0 ? hex32(hill.snow ? "#dfe8f4" : "#a89678") : k === 1 ? hex32(hill.snow ? "#b4c4d8" : "#7e6e56") : hex32(hill.snow ? "#8aa0c0" : "#54483a");
        if (y < yb - 1 && !edge) c = hex32(hill.snow ? "#dfe8f4" : "#8a7a60");
        if (y >= 0 && y < H && x >= 0 && x < W) buf[y * W + x] = c;
      }
      clearFlag(rect.x + 2, rect.y, rect.x + rect.w - 3, rect.y + rect.h + 2, F_CLIFF);
      void ti;
    });
    const top = hill.tierInfo[hill.tierInfo.length - 1].tier;
    summits.push({ x: hill.cx, y: hill.cy - Math.round(top.r * 0.1), hill });
    hill.summit = { x: hill.cx, y: hill.cy };
  }

  ctx.putImageData(img, 0, 0);

  const blockedPx = (x, y, ignore = 0) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return true;
    return (grid[(y >> 2) * gw + (x >> 2)] & ~ignore) !== 0;
  };
  /** ¿Hay agua bajo este punto? (para nadar) */
  const waterAt = (x, y) => x >= 0 && y >= 0 && x < W && y < H && (grid[(y >> 2) * gw + (x >> 2)] & F_WATER) !== 0;
  /** ¿Choca la caja con agua / acantilado / vacío? */
  const blockedBox = (b, ignore = 0) => {
    const gx0 = Math.max(0, b.x >> 2), gx1 = Math.min(gw - 1, (b.x + b.w - 0.01) >> 2);
    const gy0 = Math.max(0, b.y >> 2), gy1 = Math.min(gh - 1, (b.y + b.h - 0.01) >> 2);
    if (b.x < 0 || b.y < 0 || b.x + b.w > W || b.y + b.h > H) return true;
    for (let gy = gy0; gy <= gy1; gy++) for (let gx = gx0; gx <= gx1; gx++) if (grid[gy * gw + gx] & ~ignore) return true;
    return false;
  };

  return { canvas: cv, ctx, W, H, grid, gw, gh, cell: CELL, blockedPx, blockedBox, waterAt, waterSpots, decor, bridgeSamples, stairRects, summits, noise: { broad, fine, grain } };
}

/* ======================================================================
   Decoración del suelo (se pinta después de colocar los obstáculos)
   ====================================================================== */

/**
 * @param {object} T     resultado de paintTerrain
 * @param {object} L     layout
 * @param {object} pal
 * @param {() => number} rand
 * @param {object[]} obstacles  para proyectar sus sombras
 */
export function decorateGround(T, L, pal, rand, obstacles, houses = []) {
  const c = T.ctx, { W, H } = T;
  const px = (col, x, y, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(x | 0, y | 0, w, h); };
  const free = (x, y) => !T.blockedPx(x | 0, y | 0) && L.path.nearest(x, y, 16).d > 14;
  const inside = (x, y) => L.inside(x, y, 40);

  // Suelo interior de las casas
  for (const h of houses) if (h.sprite.floor) c.drawImage(h.sprite.floor, h.x, h.y);

  // Puentes: tablones perpendiculares a la ruta con barandillas
  const planks = [BARK.base, BARK.light, BARK.shadow];
  let lastK = -99;
  T.bridgeSamples.forEach((s, i) => {
    const l = Math.hypot(s.tx, s.ty) || 1, tx = s.tx / l, ty = s.ty / l, nx = -ty, ny = tx;
    if (i - lastK < 1) return;
    lastK = i;
    for (let k = -13; k <= 13; k++) {
      const x = s.x + nx * k, y = s.y + ny * k;
      px(planks[(i + (k > 0 ? 1 : 0)) % 3], x - 1, y - 1, 3, 3);
    }
    px(BARK.outline, s.x + nx * 13.5 - 1, s.y + ny * 13.5 - 1, 2, 2);
    px(BARK.outline, s.x - nx * 13.5 - 1, s.y - ny * 13.5 - 1, 2, 2);
    if (i % 5 === 0) for (const sg of [-1, 1]) { px(BARK.shadow, s.x + nx * sg * 14 - 1, s.y + ny * sg * 14 - 5, 2, 7); px(BARK.light, s.x + nx * sg * 14 - 1, s.y + ny * sg * 14 - 5, 1, 2); }
  });

  // Matas oscuras, flores, guijarros, hojas
  const [tDeep, tDark, tLight, tHigh] = pal.tuft;
  const area = L.W * L.H * 0.95 * (pal.decorMul ?? 1);
  for (let i = 0; i < area / 160; i++) {
    const x = 2 + rand() * (W - 4), y = 3 + rand() * (H - 4);
    if (!inside(x, y) || !free(x, y)) continue;
    px(tDeep, x, y); px(tDark, x - 1, y); px(tDark, x + 1, y);
    px(tLight, x - 2, y - 1); px(tLight, x + 2, y - 1); px(tLight, x, y - 1); px(tHigh, x, y - 2);
  }
  for (let i = 0; i < area / 700; i++) {
    const x = rand() * W, y = rand() * H;
    if (!inside(x, y) || !free(x, y)) continue;
    px(tDeep, x, y, 2, 1); px(tDeep, x + 1, y - 1); px(tDeep, x - 1, y + 1, 2, 1);
  }
  for (let i = 0; i < area / 55; i++) {
    const x = rand() * W, y = rand() * H;
    if (!inside(x, y) || !free(x, y)) continue;
    px(rand() < 0.6 ? "#8B6B42" : "#6A4F31", x, y, rand() < 0.25 ? 2 : 1, 1);
  }
  for (let i = 0; i < area / 1000; i++) {
    const x = rand() * W, y = rand() * H;
    if (!inside(x, y) || !free(x, y)) continue;
    px("#B4AD9B", x, y, 2, 1); px("#6E6A5C", x + 1, y + 1, 2, 1);
  }
  if (!pal.noFlowers) for (let i = 0; i < area / 1800; i++) {
    const x = 2 + rand() * (W - 4), y = 2 + rand() * (H - 4);
    if (!inside(x, y) || !free(x, y)) continue;
    const petal = rand() < 0.7 ? "#EDE7D2" : "#E6A9B8";
    px(petal, x - 1, y); px(petal, x + 1, y); px(petal, x, y - 1); px(petal, x, y + 1); px("#E2C25B", x, y);
  }
  for (let i = 0; i < area / 900; i++) {
    const x = rand() * W, y = rand() * H;
    if (!inside(x, y) || !free(x, y)) continue;
    px(rand() < 0.5 ? pal.leaves[0] : pal.leaves[1], x, y, 2, 1);
  }

  // Sombras de árboles, rocas, casas y montañas
  c.fillStyle = "rgba(20, 30, 10, 0.4)";
  for (const o of obstacles) {
    const big = o.type === "pine" || o.type === "oak";
    if (!big && !["rock", "statue", "arch", "pillar", "tomb"].includes(o.type)) continue;
    const rx = big ? 22 : o.type === "arch" ? 20 : 10, ry = big ? 5 : 2;
    for (let dy = -ry; dy <= ry; dy++) {
      const half = Math.round(rx * Math.sqrt(1 - (dy * dy) / ((ry + 0.5) * (ry + 0.5))));
      c.fillRect(Math.round(o.bx - half + 2), Math.round(o.by - 2 + dy), half * 2, 1);
    }
  }
  c.fillStyle = "rgba(10, 8, 20, 0.42)";
  for (const h of houses) c.fillRect(h.x + 4, h.y + h.h - 3, h.w + 4, 4);

  // Estampas de destrucción: grietas, marcas de quemadura, huesos…
  const scorch = (x, y, r) => {
    for (let k = 0; k < r * 5; k++) {
      const a = rand() * 6.28, d = Math.sqrt(rand()) * r;
      px(rand() < 0.5 ? "#120c0a" : "#1e1612", x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6, 1 + (rand() * 2 | 0), 1);
    }
  };
  for (let i = 0; i < (pal.scorch ?? 24); i++) {
    const x = rand() * W, y = rand() * H;
    if (inside(x, y) && free(x, y)) scorch(x, y, 5 + rand() * 9);
  }
  for (let i = 0; i < (pal.cracks ?? 40); i++) {              // grietas del suelo
    let x = rand() * W, y = rand() * H;
    if (!inside(x, y) || !free(x, y)) continue;
    let a = rand() * 6.28;
    const n = 6 + (rand() * 10 | 0);
    for (let k = 0; k < n; k++) { px("#0e0a10", x, y); a += (rand() - 0.5) * 1.1; x += Math.cos(a) * 1.4; y += Math.sin(a) * 1.4 * 0.7; }
  }

  if (pal.tiles) {                                              // calzada de losas con runas
    const pts = L.path.pts;
    for (let i = 0; i < pts.length; i += 2) {
      const p = pts[i];
      c.fillStyle = "#1a1820";
      c.fillRect(p.x - 14, p.y, 28, 1);
      if (rand() < 0.18) { c.fillStyle = "#5a1a22"; c.fillRect(p.x + 5, p.y - 7, 2, 1); c.fillRect(p.x + 5, p.y - 6, 1, 2); }
    }
    for (let i = 0; i < 70; i++) {
      const x = rand() * W | 0, y = rand() * H | 0;
      if (!inside(x, y) || !free(x, y)) continue;
      c.fillStyle = "#2a2733";
      c.fillRect(x, y, 3, 1); c.fillRect(x + 1, y, 1, 4); c.fillRect(x + 5, y, 1, 4); c.fillRect(x + 5, y + 3, 3, 1);
    }
  }
  if (pal.bones) {
    for (let i = 0; i < area / 55000; i++) {
      const x = rand() * W | 0, y = rand() * H | 0;
      if (!inside(x, y) || !free(x, y)) continue;
      c.fillStyle = "#cfc6b8";
      c.fillRect(x, y, 4, 1); c.fillRect(x - 1, y - 1, 1, 3); c.fillRect(x + 4, y - 1, 1, 3);
    }
    for (let i = 0; i < area / 100000; i++) {
      const x = rand() * W | 0, y = rand() * H | 0;
      if (!inside(x, y) || !free(x, y)) continue;
      c.fillStyle = "#0e0812";
      for (let k = 0; k < 3; k++) for (let s = 0; s < 6; s++) c.fillRect(x + k * 3 + s, y + s, 1, 1);
    }
  }
  return { scorch };
}

/** Estampa una marca de quemadura / grieta en el suelo durante el juego (destrucción dinámica). */
export function stampScorch(T, x, y, r, rand, holy = false) {
  const c = T.ctx;
  for (let k = 0; k < r * 6; k++) {
    const a = rand() * 6.28, d = Math.sqrt(rand()) * r;
    const px = Math.round(x + Math.cos(a) * d), py = Math.round(y + Math.sin(a) * d * 0.65);
    if (T.blockedPx(px, py)) continue;
    c.fillStyle = holy ? (rand() < 0.2 ? "#e3b341" : rand() < 0.5 ? "#2a2218" : "#3a3020") : rand() < 0.5 ? "#120c0a" : "#1e1612";
    c.fillRect(px, py, 1 + (rand() * 2 | 0), 1);
  }
}

/** Estampa un montón de escombros pequeño en el suelo (restos de una roca o pilar destruidos). */
export function stampRubble(T, x, y, rand, spread = 9) {
  const c = T.ctx;
  for (let k = 0; k < spread * 2; k++) {
    const px = Math.round(x + (rand() - 0.5) * spread * 2), py = Math.round(y + (rand() - 0.5) * spread);
    c.fillStyle = STONE[1 + ((rand() * 3) | 0)];
    c.fillRect(px, py, 1 + (rand() * 2 | 0), 1 + (rand() < 0.3 ? 1 : 0));
    if (rand() < 0.3) { c.fillStyle = STONE[5]; c.fillRect(px, py, 1, 1); }
  }
}

export { MOSS };
