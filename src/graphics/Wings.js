/**
 * Wings · alas de plumas para Abel (cinemática de la caída y vuelo en el mapa)
 * ---------------------------------------------------------------------------
 * drawWings(ctx, x, y, open, flap, len, pal, broken)
 *   (x, y)  hombros de Abel · open 0..1 (cerradas→desplegadas) · flap 0..1 (aleteo)
 *   len     envergadura de la pluma más larga (px) · pal [claro, medio, contorno]
 *   broken  0..1: fracción de plumas que faltan y desorden (alas quebradas)
 * Cada ala son 8 plumas en abanico, dibujadas de la más larga (atrás) a la más corta (delante).
 */
export const WING_GOLD = ["#fff6d0", "#ffe9a0", "#c8923a"];
export const WING_DULL = ["#d8cfae", "#c8b880", "#6a4a1a"];

export function drawWings(c, x, y, open = 1, flap = 0.5, len = 30, pal = WING_GOLD, broken = 0) {
  const lift = (0.35 + 0.65 * flap) * open;
  c.lineJoin = "round";
  for (const side of [-1, 1]) {
    for (let i = 0; i < 8; i++) {
      if (broken && ((i * 53 + (side + 2) * 17) % 8) / 8 < broken) continue;
      const a = -0.85 + i * 0.17 - lift * 0.45 + (broken ? Math.sin(i * 2.1) * broken * 0.5 : 0);
      const l = (len - i * len * 0.085) * (0.45 + 0.55 * open) * (1 - broken * 0.3);
      const bx = x + side * 2, by = y + i * 0.7;
      const tx = bx + side * Math.cos(a) * l, ty = by + Math.sin(a) * l + (1 - lift) * 7;
      const nx = -(ty - by) / l, ny = (tx - bx) / l;
      const w = Math.max(2.2, len * 0.15 - i * len * 0.012);                   // ancho de la pluma
      const mx = (bx + tx) / 2, my = (by + ty) / 2;
      c.beginPath();
      c.moveTo(bx, by);
      c.quadraticCurveTo(mx + nx * w * 1.5, my + ny * w * 1.5, tx, ty);
      c.quadraticCurveTo(mx - nx * w * 1.5, my - ny * w * 1.5, bx, by);
      c.fillStyle = i % 2 ? pal[1] : pal[0]; c.fill();
      c.strokeStyle = pal[2]; c.lineWidth = 0.8; c.stroke();
      c.strokeStyle = pal[0]; c.lineWidth = 0.6; c.globalAlpha = 0.8;
      c.beginPath(); c.moveTo(bx, by); c.lineTo(mx + (tx - mx) * 0.7, my + (ty - my) * 0.7); c.stroke(); c.globalAlpha = 1;      // raquis
    }
  }
}
