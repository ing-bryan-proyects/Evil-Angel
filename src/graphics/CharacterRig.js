/**
 * CharacterRig · personajes 16×20 por capas y partes
 * --------------------------------------------------
 * Convierte matrices de caracteres (pixel art) en un "rig" ligero:
 *
 *   partes     cabeza (filas 0–9) · torso (10–15) · piernas (16–19) con desplazamiento
 *              propio → respiración con retardo, rebote al caminar, inclinación, agachado.
 *   capas      pelo y ropa se duplican desplazados ±1 px para ondear con el viento
 *              sin recalcular el sprite.
 *   piernas    variantes de zancada (halfA, A, halfB, B, wideA, wideB…) para un ciclo de
 *              8 fotogramas.
 *   brazos     overlays procedurales por pose: guardia, golpes del combo, carga con los
 *              brazos arriba, brazos abiertos, aleteo al recibir daño y brazos atrás.
 *   efectos    destello blanco puro, tinte con mezcla alfa, rotación de caída.
 *
 * La pose la calcula FighterAnim (SpriteRenderer.js); aquí solo se dibuja.
 */

import { FACING } from "./SpriteRenderer.js";

const W = 16, H = 20;

/** Matriz de caracteres → canvas con contorno selectivo (el borde que mira a la luz baja al tono de sombra). */
export function bakeRows(rows, pal, lit = {}) {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const x = c.getContext("2d");
  const at = (cx, cy) => (cy < 0 || cy >= rows.length || cx < 0 || cx >= W ? "." : rows[cy][cx]);
  rows.forEach((row, ry) => {
    for (let cx = 0; cx < row.length; cx++) {
      let ch = row[cx];
      if (ch === ".") continue;
      if (lit[ch] && (at(cx, ry - 1) === "." || at(cx - 1, ry) === ".") && at(cx, ry + 1) !== "." && at(cx + 1, ry) !== ".") ch = lit[ch];
      x.fillStyle = pal[ch];
      x.fillRect(cx, ry, 1, 1);
    }
  });
  return c;
}

/** Capa con los píxeles de `pred` desplazados `s` px (solo sobre huecos transparentes). */
function shiftLayer(rows, base, pred, s) {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const x = c.getContext("2d");
  const img = base.getContext("2d").getImageData(0, 0, W, H).data;
  rows.forEach((row, ry) => {
    for (let cx = 0; cx < W; cx++) {
      const ch = row[cx];
      if (ch === "." || !pred(ch, cx, ry)) continue;
      const tx = cx + s;
      if (tx < 0 || tx >= W || row[tx] !== ".") continue;
      const p = (ry * W + cx) * 4;
      x.fillStyle = `rgb(${img[p]},${img[p + 1]},${img[p + 2]})`;
      x.fillRect(tx, ry, 1, 1);
    }
  });
  return c;
}

const tmp = document.createElement("canvas");
tmp.width = 40; tmp.height = 40;
const tctx = tmp.getContext("2d");

export class CharacterRig {
  /**
   * @param {object} def
   * @param {Object<string,string[]>} def.views    { down, up?, right? } matrices 16×20
   * @param {Object<string,string>} def.pal
   * @param {Object<string,string>} def.lit
   * @param {Object<string,Object<string,string[]>>} [def.legVariants]   por vista: { A, B, halfA, halfB, wideA, wideB }
   * @param {{rows:number[], hair:string, cloth:string}} [def.layers]
   * @param {Object<string,string>} def.colors     sleeve, sleeveHi, sleeveDk, skin, skinDk, outline
   * @param {{rows:number[], cols:number[], skin:string}} [def.eyes]
   */
  constructor(def) {
    this.def = def;
    this.colors = def.colors;
    this.eyes = def.eyes;
    this.views = {};
    for (const [name, rows] of Object.entries(def.views)) {
      const base = bakeRows(rows, def.pal, def.lit);
      const legs = { stand: base };
      for (const [k, vrows] of Object.entries(def.legVariants?.[name] || {})) legs[k] = bakeRows(vrows, def.pal, def.lit);
      const L = def.layers || {};
      const hairPred = (ch, x, y) => (L.hair || "").includes(ch) && y >= (L.hairRows?.[0] ?? 0) && y <= (L.hairRows?.[1] ?? 9) && (y <= 2 || x <= 3 || x >= 12);
      const clothPred = (ch, x, y) => (L.cloth || "").includes(ch) && y >= (L.clothRows?.[0] ?? 13) && y <= (L.clothRows?.[1] ?? 15);
      this.views[name] = {
        base, legs,
        hair: { "-1": shiftLayer(rows, base, hairPred, -1), 1: shiftLayer(rows, base, hairPred, 1) },
        cloth: { "-1": shiftLayer(rows, base, clothPred, -1), 1: shiftLayer(rows, base, clothPred, 1) },
      };
    }
  }

  /**
   * Dibuja el personaje con una pose de FighterAnim.
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} dir  "down" | "up" | "left" | "right"
   */
  draw(ctx, dir, pose, x, y) {
    const flip = dir === "left";
    const view = this.views[dir === "left" ? "right" : dir] || this.views.down;
    const px = Math.round(x + pose.bodyDx), py = Math.round(y + pose.bodyDy);
    const complex = pose.flash > 0 || pose.tint || pose.rot;
    ctx.save();
    if (pose.alpha < 1) ctx.globalAlpha *= pose.alpha;
    if (!complex) {
      this.#compose(ctx, view, dir, pose, px, py, flip);
    } else {
      tctx.clearRect(0, 0, 40, 40);
      this.#compose(tctx, view, dir, pose, 12, 12, flip);
      if (pose.tint) {
        tctx.globalCompositeOperation = "source-atop";
        tctx.globalAlpha = pose.tint.alpha;
        tctx.fillStyle = pose.tint.color;
        tctx.fillRect(0, 0, 40, 40);
        tctx.globalAlpha = 1;
      }
      if (pose.flash > 0) {
        tctx.globalCompositeOperation = "source-atop";
        tctx.globalAlpha = Math.min(1, pose.flash);
        tctx.fillStyle = "#ffffff";
        tctx.fillRect(0, 0, 40, 40);
        tctx.globalAlpha = 1;
      }
      tctx.globalCompositeOperation = "source-over";
      if (pose.rot) {
        ctx.translate(px + 8, py + 19);
        ctx.rotate(pose.rot);
        ctx.translate(-(px + 8), -(py + 19));
      }
      ctx.drawImage(tmp, px - 12, py - 12);
    }
    ctx.restore();
  }

  #compose(c, view, dir, pose, ox, oy, flip) {
    c.save();
    if (flip) { c.translate(ox + W, oy); c.scale(-1, 1); } else c.translate(ox, oy);
    const base = view.base, legs = view.legs[pose.legs] || base;
    // piernas
    c.drawImage(legs, 0, 16, W, 4, pose.legsDx, 16 + pose.legsDy, W, 4);
    // torso (si sube, estira la última fila para no dejar hueco)
    for (let gy = 16 + pose.torsoDy; gy < 16 + Math.max(0, pose.legsDy) && pose.torsoDy < 0; gy++) c.drawImage(base, 0, 15, W, 1, pose.torsoDx, gy, W, 1);
    c.drawImage(base, 0, 10, W, 6, pose.torsoDx, 10 + pose.torsoDy, W, 6);
    if (pose.torsoDy < 0) c.drawImage(base, 0, 15, W, 1, pose.torsoDx, 15, W, 1);
    // cabeza (si queda más arriba que el torso, estira la fila 9)
    for (let gy = 10 + pose.headDy; gy < 10 + pose.torsoDy; gy++) c.drawImage(base, 0, 9, W, 1, pose.headDx, gy, W, 1);
    c.drawImage(base, 0, 0, W, 10, pose.headDx, pose.headDy, W, 10);
    // capas de viento: pelo (con la cabeza) y ropa (con el torso)
    if (pose.hair) c.drawImage(view.hair[pose.hair], 0, 0, W, 10, pose.headDx, pose.headDy, W, 10);
    if (pose.cloth) c.drawImage(view.cloth[pose.cloth], 0, 10, W, 6, pose.torsoDx, 10 + pose.torsoDy, W, 6);
    // parpadeo: párpados cerrados sobre los ojos
    if (pose.blink && this.eyes && dir !== "up") {
      c.fillStyle = this.colors.skinDk;
      const [r0, r1] = this.eyes.rows;
      const cols = dir === "down" ? this.eyes.cols : this.eyes.sideCols || [];
      for (const cx of cols) { c.fillRect(cx + pose.headDx, r0 + pose.headDy, 1, 1); c.fillStyle = this.colors.outline; c.fillRect(cx + pose.headDx, r1 + pose.headDy, 1, 1); c.fillStyle = this.colors.skinDk; }
    }
    if (pose.arms) this.#arms(c, pose.arms, dir === "left" ? "right" : dir, pose.torsoDx, pose.torsoDy);
    c.restore();
  }

  /* ---------------- Brazos y puños ---------------- */
  #arms(c, a, view, dx, dy) {
    const C = this.colors;
    const R = (col, x, y, w, h) => { c.fillStyle = col; c.fillRect(x + dx, y + dy, w, h); };
    const fist = (x, y) => {                       // puño 4×4 con contorno
      R(C.outline, x + 1, y, 2, 1); R(C.outline, x, y + 1, 1, 2); R(C.outline, x + 3, y + 1, 1, 2); R(C.outline, x + 1, y + 3, 2, 1);
      R(C.skin, x + 1, y + 1, 2, 1); R(C.skin, x + 1, y + 2, 2, 1); R(C.skinDk, x + 2, y + 2, 1, 1); R("#ffffff", x + 1, y + 1, 1, 1);
    };
    const armH = (x, y, len, rev = false) => {       // brazo horizontal 2px (luz arriba)
      for (let i = 0; i < len; i++) { const xx = rev ? x - i : x + i; R(C.sleeveHi, xx, y, 1, 1); R(C.sleeveDk, xx, y + 1, 1, 1); }
    };
    const armV = (x, y, len, up = true) => {         // brazo vertical 2px
      for (let i = 0; i < len; i++) { const yy = up ? y - i : y + i; R(C.sleeveHi, x, yy, 1, 1); R(C.sleeve, x + 1, yy, 1, 1); }
    };
    const t = a.type;
    if (t === "wave") {                                  // saludo: el brazo derecho (de Abel/aliados) sube y la mano oscila
      const k = a.k || 0;
      armV(12, 13, 4); R(C.outline, 11 + k, 5, 4, 1); R(C.skin, 11 + k, 6, 4, 3); R(C.skinDk, 11 + k, 8, 4, 1); R("#ffffff", 12 + k, 6, 1, 1);
      return;
    }
    if (view === "right") {
      if (t === "guard") { armH(9, 11, 2); fist(11, 10); armH(5, 12, 2); R(C.skinDk, 4, 12, 1, 1); }
      else if (t === "punch") {
        if (a.phase === "wind") { armH(9, 12, 2, true); fist(5, 11); }
        else if (a.n === 2) { // gancho
          R(C.sleeve, 10, 12, 1, 1); R(C.sleeveHi, 11, 11, 1, 1); R(C.sleeveDk, 11, 12, 1, 1); armH(12, 10, 1); fist(12, a.phase === "strike" ? 6 : 8);
        } else { const yy = a.side ? 12 : 11, len = a.phase === "strike" ? 3 : 2; armH(10, yy, len); fist(10 + len, yy - 1); }
      } else if (t === "raised") { armV(9, 11, 4); fist(8, 4); armV(5, 11, 4); fist(4, 4); }
      else if (t === "spread") { armH(11, 11, 3); fist(14, 10); armH(4, 11, 3, true); fist(-1, 10); }
      else if (t === "flail") { armH(11, 13, 2); R(C.skin, 13, 15, 1, 1); armH(4, 13, 2, true); R(C.skin, 2, 15, 1, 1); }
      else if (t === "back") { armH(8, 12, 3, true); R(C.skin, 4, 13, 2, 1); }
    } else {
      // vista frontal (down) o trasera (up): hombros en x = 3 y x = 12
      const up = view === "up";
      if (t === "guard") { armV(2, 13, 3); fist(1, 8); armV(12, 13, 3); fist(11, 8); }
      else if (t === "punch") {
        const sx = a.side ? 2 : 12;
        if (up) {
          if (a.phase === "wind") { armV(sx, 12, 2); fist(sx - 1, 8); }
          else { armV(sx, 11, a.phase === "strike" ? 5 : 3); fist(sx - 1, a.phase === "strike" ? 2 : 4); }
        } else if (a.phase === "wind") { armV(sx, 11, 2, false); fist(sx - 1, 13); }
        else if (a.n === 2) { armV(sx, 12, 2); fist(sx - 1, a.phase === "strike" ? 6 : 8); }
        else { armV(sx, 11, 3, false); fist(sx - (a.phase === "strike" ? 2 : 1), a.phase === "strike" ? 14 : 13); if (a.phase === "strike") { R("#ffffff", sx + 1, 18, 1, 1); } }
      } else if (t === "raised") { armV(2, 11, 5); fist(1, 3); armV(12, 11, 5); fist(11, 3); }
      else if (t === "spread") { armH(11, 11, 4); fist(15, 10); armH(4, 11, 4, true); fist(-3, 10); }
      else if (t === "flail") { armV(1, 13, 3, false); R(C.skin, 0, 16, 2, 1); armV(13, 13, 3, false); R(C.skin, 14, 16, 2, 1); }
      else if (t === "back") { armV(2, 14, 3); R(C.skin, 1, 11, 2, 1); armV(12, 14, 3); R(C.skin, 13, 11, 2, 1); }
    }
  }
}

export { FACING };
