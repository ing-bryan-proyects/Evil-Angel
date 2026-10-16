/**
 * HUD · interfaz superpuesta
 * --------------------------
 * Réplica del HUD del Sub-nivel 1.1 original, dibujado a resolución de pantalla
 * encima del mundo ya ampliado (el texto queda nítido aunque el mundo sea de 320×180):
 *
 *   Arriba-izquierda : "SUB-LEVEL 1.1 · THE AWAKENING" + caja de objetivo
 *                      (fondo oscuro translúcido, borde dorado tenue, etiqueta OBJ,
 *                      texto en inglés y subtítulo en español).
 *   Arriba-derecha   : "HP 100/100" y "LP 0" en cajas con borde dorado.
 *   Abajo-derecha    : ayuda de controles.
 *
 * Fuentes: Press Start 2P (títulos e indicadores) y Pixelify Sans (texto), las
 * mismas del juego original. Si no cargan, se usa una monoespaciada.
 */

const COLORS = Object.freeze({
  gold: "#e3b341",
  goldLight: "#fbe7a1",
  goldDeep: "#9c7416",
  muted: "#a8935c",
  good: "#9dffcf",
  panel: "rgba(8, 5, 14, 0.7)",
  glow: "rgba(227, 179, 65, 0.55)",
});

const FONT_TITLE = '"Press Start 2P", "Courier New", monospace';
const FONT_BODY = '"Pixelify Sans", "Courier New", monospace';
const FLASH_TIME = 1.2; // segundos que destella la caja al cambiar el objetivo

export class HUD {
  constructor() {
    this.objectiveKey = "";
    this.flashUntil = 0;
  }

  /**
   * @param {CanvasRenderingContext2D} ctx  Contexto del canvas visible (píxeles de pantalla).
   * @param {object} state
   * @param {string} state.title
   * @param {{en: string, es: string}} state.objective
   * @param {number} state.hp
   * @param {number} state.maxHp
   * @param {number} state.lp
   * @param {number} time  Segundos desde el arranque.
   */
  render(ctx, state, time) {
    // Escala de la interfaz respecto al diseño original (1280 px de ancho)
    const ui = Math.max(0.75, ctx.canvas.width / 1280);
    const m = Math.round(16 * ui); // margen exterior

    // Destello cuando cambia el objetivo
    const key = state.objective.en;
    if (key !== this.objectiveKey) {
      if (this.objectiveKey) this.flashUntil = time + FLASH_TIME;
      this.objectiveKey = key;
    }
    const flash = Math.max(0, (this.flashUntil - time) / FLASH_TIME);

    ctx.save();
    ctx.textBaseline = "top";

    // --- Título del nivel ---
    const titleSize = Math.round(11 * ui);
    ctx.font = `${titleSize}px ${FONT_TITLE}`;
    if (ctx.letterSpacing !== undefined) ctx.letterSpacing = `${(0.15 * titleSize).toFixed(1)}px`;
    this.#glowText(ctx, state.title, m, m, COLORS.goldLight, ui);

    // --- Caja de objetivo ---
    const boxY = m + titleSize + Math.round(10 * ui);
    const pad = { x: Math.round(12 * ui), y: Math.round(8 * ui) };
    const bodySize = Math.round(17 * ui);
    const subSize = Math.round(14.5 * ui);
    const labelSize = Math.round(8 * ui);
    const maxBoxW = Math.round(430 * ui);

    ctx.font = `${labelSize}px ${FONT_TITLE}`;
    const labelW = ctx.measureText("OBJ").width + Math.round(8 * ui);
    if (ctx.letterSpacing !== undefined) ctx.letterSpacing = "0px";

    ctx.font = `${bodySize}px ${FONT_BODY}`;
    const enLines = this.#wrap(ctx, state.objective.en, maxBoxW - pad.x * 2 - labelW);
    ctx.font = `${subSize}px ${FONT_BODY}`;
    const esLines = this.#wrap(ctx, state.objective.es, maxBoxW - pad.x * 2);

    const lineH = Math.round(bodySize * 1.25), subH = Math.round(subSize * 1.25);
    ctx.font = `${bodySize}px ${FONT_BODY}`;
    const enW = Math.max(...enLines.map((l) => ctx.measureText(l).width)) + labelW;
    ctx.font = `${subSize}px ${FONT_BODY}`;
    const esW = Math.max(...esLines.map((l) => ctx.measureText(l).width));
    const boxW = Math.min(maxBoxW, Math.ceil(Math.max(enW, esW) + pad.x * 2));
    const boxH = pad.y * 2 + enLines.length * lineH + Math.round(3 * ui) + esLines.length * subH;

    const border = flash > 0 ? COLORS.goldLight : COLORS.goldDeep;
    if (flash > 0) { ctx.shadowColor = COLORS.gold; ctx.shadowBlur = 18 * ui * flash; }
    this.#panel(ctx, m, boxY, boxW, boxH, border, ui);
    ctx.shadowBlur = 0;

    let ty = boxY + pad.y;
    ctx.font = `${labelSize}px ${FONT_TITLE}`;
    ctx.fillStyle = COLORS.gold;
    ctx.fillText("OBJ", m + pad.x, ty + Math.round((bodySize - labelSize) / 2));
    ctx.font = `${bodySize}px ${FONT_BODY}`;
    ctx.fillStyle = COLORS.goldLight;
    enLines.forEach((line, i) => ctx.fillText(line, m + pad.x + labelW, ty + i * lineH));
    ty += enLines.length * lineH + Math.round(3 * ui);
    ctx.font = `${subSize}px ${FONT_BODY}`;
    ctx.fillStyle = COLORS.muted;
    esLines.forEach((line, i) => ctx.fillText(line, m + pad.x, ty + i * subH));

    // --- Indicadores HP / LP (arriba-derecha) ---
    const statSize = Math.round(10 * ui);
    ctx.font = `${statSize}px ${FONT_TITLE}`;
    if (ctx.letterSpacing !== undefined) ctx.letterSpacing = `${(0.1 * statSize).toFixed(1)}px`;
    const stats = [
      { text: `LP ${state.lp}`, color: COLORS.good },
      { text: `HP ${state.hp}/${state.maxHp}`, color: state.hp / state.maxHp <= 0.3 ? "#ff7a5a" : COLORS.goldLight },
    ];
    let right = ctx.canvas.width - m;
    const sPad = { x: Math.round(10 * ui), y: Math.round(7 * ui) };
    for (const s of stats) {
      const w = Math.ceil(ctx.measureText(s.text).width) + sPad.x * 2;
      const h = statSize + sPad.y * 2;
      right -= w;
      this.#panel(ctx, right, m, w, h, COLORS.goldDeep, ui);
      ctx.fillStyle = "#000";
      ctx.fillText(s.text, right + sPad.x + 1, m + sPad.y + 1);
      ctx.fillStyle = s.color;
      ctx.fillText(s.text, right + sPad.x, m + sPad.y);
      right -= Math.round(10 * ui);
    }

    // --- Ayuda de controles (abajo-derecha) ---
    const hintSize = Math.round(8 * ui);
    ctx.font = `${hintSize}px ${FONT_TITLE}`;
    if (ctx.letterSpacing !== undefined) ctx.letterSpacing = `${(0.12 * hintSize).toFixed(1)}px`;
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    // Press Start 2P no incluye ← →: se escribe "ARROWS"
    const hint = "WASD / ARROWS · MOVE";
    ctx.fillStyle = "#000";
    ctx.fillText(hint, ctx.canvas.width - m + 1, ctx.canvas.height - m + 1);
    ctx.fillStyle = COLORS.goldDeep;
    ctx.fillText(hint, ctx.canvas.width - m, ctx.canvas.height - m);

    ctx.restore();
  }

  /** Caja translúcida con borde de 2 px (escalado). */
  #panel(ctx, x, y, w, h, border, ui) {
    const b = Math.max(1, Math.round(2 * ui));
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = border;
    ctx.fillRect(x, y, w, b);
    ctx.fillRect(x, y + h - b, w, b);
    ctx.fillRect(x, y, b, h);
    ctx.fillRect(x + w - b, y, b, h);
  }

  /** Texto dorado con resplandor y sombra negra desplazada, como el título original. */
  #glowText(ctx, text, x, y, color, ui) {
    const off = Math.max(1, Math.round(2 * ui));
    ctx.fillStyle = "#000";
    ctx.fillText(text, x + off, y + off);
    ctx.shadowColor = COLORS.glow;
    ctx.shadowBlur = 8 * ui;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.shadowBlur = 0;
  }

  /** Corta un texto en líneas que quepan en maxWidth. */
  #wrap(ctx, text, maxWidth) {
    const words = text.split(" ");
    const lines = [];
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; }
      else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }
}
