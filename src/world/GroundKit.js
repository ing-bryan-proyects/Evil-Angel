/**
 * GroundKit · suelo del mapa pintado con las baldosas de las hojas de escenarios
 * -------------------------------------------------------------------------------
 * Cada hoja trae una tira de baldosas de 48×48 (assets/sprites/sc<N>_ground.png). El suelo se rellena con
 * dos capas de baldosas desplazadas medio lado y mezcladas con una ventana suave, de modo que no se
 * ven las juntas. Las baldosas "de acento" (hojarasca, raíces, hierba seca…) salen con una probabilidad
 * baja y por manchas, no al azar, para que el suelo tenga zonas. Una variación de brillo de gran escala
 * (ruido) rompe la repetición. El camino usa la baldosa de tierra del bioma.
 *
 *   await loadGroundSheets(["sc48", …])     carga las tiras
 *   const gk = makeGround(cfg, seed)         cfg = KITS[biome].ground
 *   gk.paint(buf, W, H, { edge, fade, rock, noise })   rellena un Uint32Array ABGR
 *   gk.pathTex                               {base, dark, edge, light}: Uint32Array(48*48) cada una
 */
const TS = 48;
const strips = new Map();                       // sheet → { tiles: Uint32Array[] }

export async function loadGroundSheets(ids, base = "assets/sprites/") {
  await Promise.all(ids.map(async (id) => {
    if (strips.has(id)) return;
    try {
      const img = new Image();
      img.src = `${base}${id}_ground.png`;
      await img.decode();
      const cv = document.createElement("canvas"); cv.width = img.width; cv.height = img.height;
      const g = cv.getContext("2d", { willReadFrequently: true }); g.drawImage(img, 0, 0);
      const n = Math.floor(img.width / TS), tiles = [];
      for (let i = 0; i < n; i++) tiles.push(new Uint32Array(g.getImageData(i * TS, 0, TS, TS).data.buffer.slice(0)));
      strips.set(id, { tiles });
    } catch { /* sin suelo de hoja: se usa el procedural */ }
  }));
}

export const hasGround = (id) => strips.has(id);

function hash(x, y, s) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 2246822519)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const mul32 = (c, k) => {
  const r = Math.min(255, ((c & 255) * k) | 0), g = Math.min(255, (((c >>> 8) & 255) * k) | 0), b = Math.min(255, (((c >>> 16) & 255) * k) | 0);
  return (0xff000000 | (b << 16) | (g << 8) | r) >>> 0;
};

export function makeGround(cfg, seed = 1) {
  const S = strips.get(cfg.sheet);
  if (!S) return null;
  // las baldosas base se acercan al color medio del conjunto (canal a canal, 70 %): así las celdas contiguas no se notan como cuadros de otro tono
  const meanOf = (t) => { let r = 0, g = 0, b = 0, n = 0; for (let i = 0; i < t.length; i += 7) { r += t[i] & 255; g += (t[i] >>> 8) & 255; b += (t[i] >>> 16) & 255; n++; } return [r / n, g / n, b / n]; };
  const mulRGB = (c, kr, kg, kb) => (0xff000000 | (Math.min(255, (((c >>> 16) & 255) * kb) | 0) << 16) | (Math.min(255, (((c >>> 8) & 255) * kg) | 0) << 8) | Math.min(255, ((c & 255) * kr) | 0)) >>> 0;
  const T = S.tiles.slice();
  if (cfg.base?.length > 1) {
    const ms = cfg.base.map((i) => meanOf(S.tiles[i % S.tiles.length]));
    const target = [0, 1, 2].map((ch) => ms.reduce((a, m) => a + m[ch], 0) / ms.length);
    cfg.base.forEach((i, k) => {
      const f = ms[k].map((m, ch) => 1 + (Math.max(0.74, Math.min(1.34, target[ch] / Math.max(1, m))) - 1) * 0.7);
      if (f.some((v) => Math.abs(v - 1) > 0.02)) T[i % T.length] = Uint32Array.from(S.tiles[i % S.tiles.length], (c) => mulRGB(c, f[0], f[1], f[2]));
    });
  }
  const pickFrom = (list, h) => T[list[Math.min(list.length - 1, Math.floor(h * list.length))] % T.length];
  const base = cfg.base, accent = cfg.accent || [], rate = cfg.accentRate ?? 0.15;

  /** Baldosa (con giro/espejo) de la celda (cx, cy) de una capa. */
  const layerTile = (cx, cy, layer, list, salt) => {
    const h = hash(cx, cy, seed + layer * 7919 + salt);
    const f = (h * 8) | 0;
    return { tile: pickFrom(list, hash(cx, cy, seed + 17 + salt)), fx: f & 1, fy: (f >> 1) & 1, tr: (f >> 2) & 1 };
  };
  const sample = (lt, u, v) => {
    if (lt.tr) { const t = u; u = v; v = t; }
    if (lt.fx) u = TS - 1 - u;
    if (lt.fy) v = TS - 1 - v;
    return lt.tile[v * TS + u];
  };

  // textura del camino: baldosa de tierra del bioma y sus tonos de borde
  const pt = pickFrom(cfg.path || base, 0.3);
  const pb = cfg.bright ?? 1;
  const pathTex = { base: Uint32Array.from(pt, (c) => mul32(c, pb)), dark: Uint32Array.from(pt, (c) => mul32(c, 0.74 * pb)), edge: Uint32Array.from(pt, (c) => mul32(c, 0.5 * pb)), light: Uint32Array.from(pt, (c) => mul32(c, 1.14 * pb)) };

  /**
   * Pinta todo el lienzo. opts: { edge: px de roca oscura en el borde, fade: px de oscurecimiento progresivo,
   *   rock: (x,y)→color del borde, noise: (x,y)→0..1 de gran escala (brillo),
   *   patch: (x,y)→0..1 de escala media (dónde van las manchas de acento), seam: (x,y)→0..1 fino (juntas orgánicas) }.
   */
  function paint(buf, W, H, opts = {}) {
    const F = 19;                                                        // ancho de la zona de mezcla entre capas
    const edge = opts.edge ?? 26, fade = opts.fade ?? 150, noise = opts.noise, patch = opts.patch, seam = opts.seam, bright = cfg.bright ?? 1;
    const cellsX = Math.ceil(W / TS) + 2, cellsY = Math.ceil(H / TS) + 2;
    const mk = (layer, list, salt) => { const a = new Array(cellsX * cellsY); for (let cy = 0; cy < cellsY; cy++) for (let cx = 0; cx < cellsX; cx++) a[cy * cellsX + cx] = layerTile(cx, cy, layer, list, salt); return a; };
    const B1 = mk(0, base, 0), B2 = mk(1, base, 0);
    const A1 = accent.length ? mk(0, accent, 313) : null, A2 = accent.length ? mk(1, accent, 313) : null;
    // umbral del ruido de manchas: el cuantil (1 - rate) de su distribución
    let thr = 2;
    if (patch && A1) {
      const v = [];
      for (let i = 0; i < 3000; i++) v.push(patch(((i * 7919) % W), ((i * 104729) % H)));
      v.sort((a, b) => a - b); thr = v[Math.floor(v.length * (1 - rate))];
    }
    const mix = (c1, c2, w) => {
      const r = ((c1 & 255) * (1 - w) + (c2 & 255) * w) | 0, g = (((c1 >>> 8) & 255) * (1 - w) + ((c2 >>> 8) & 255) * w) | 0, b = (((c1 >>> 16) & 255) * (1 - w) + ((c2 >>> 16) & 255) * w) | 0;
      return 0xff000000 | (b << 16) | (g << 8) | r;
    };
    const smooth = (t) => { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };
    for (let y = 0; y < H; y++) {
      const ey = Math.min(y, H - 1 - y);
      const cy1 = (y / TS) | 0, v1 = y - cy1 * TS, y2 = y + (TS >> 1), cy2 = (y2 / TS) | 0, v2 = y2 - cy2 * TS;
      for (let x = 0; x < W; x++) {
        const e = Math.min(ey, x, W - 1 - x);
        if (e < edge) { buf[y * W + x] = opts.rock ? opts.rock(x, y) : 0xff140a0d; continue; }
        const cx1 = (x / TS) | 0, u1 = x - cx1 * TS, x2 = x + (TS >> 1), cx2 = (x2 / TS) | 0, u2 = x2 - cx2 * TS;
        const d = Math.min(u1, TS - 1 - u1, v1, TS - 1 - v1);            // distancia a la junta de la capa 1
        // peso de la capa 2: 1 en la junta, 0 a F px; el ruido fino deshace la línea recta
        const ww = d < F ? smooth((1 - d / F) * 1.5 - 0.25 + ((seam ? seam(x, y) : 0.5) - 0.5) * 1.3) : 0;
        const ci = cy1 * cellsX + cx1, cj = cy2 * cellsX + cx2;
        let c = sample(B1[ci], u1, v1);
        if (ww > 0.01) c = mix(c, sample(B2[cj], u2, v2), ww);
        if (A1) {
          const pn = patch(x, y);
          if (pn > thr - 0.05) {
            const wa = smooth((pn - (thr - 0.05)) / 0.1);
            if (wa > 0.02) {
              let ca = sample(A1[ci], u1, v1);
              if (ww > 0.01) ca = mix(ca, sample(A2[cj], u2, v2), ww);
              c = mix(c, ca, wa);
            }
          }
        }
        // variación de brillo de gran escala + oscurecimiento hacia el borde del mapa
        let k = (noise ? 0.84 + noise(x, y) * 0.3 : 1) * bright;
        if (e < fade) k *= 1 - ((fade - e) / fade) * 0.45;
        buf[y * W + x] = k > 0.995 && k < 1.005 ? c : mul32(c, k);
      }
    }
  }
  return { paint, pathTex, tile: pickFrom(base, 0.2) };
}
