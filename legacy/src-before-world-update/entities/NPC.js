import { renderArcCanvas, ARC_W, ARC_H, EYE } from "../graphics/ArcSprite.js";

/**
 * NPC
 * ---
 * Personaje no jugable inmóvil con hitbox en la base, orden de profundidad y
 * una fuente de luz propia para la capa nocturna.
 *
 * Por ahora solo Unit-A.R.C., el origen del "zumbido metálico" del Sub-nivel 1.1.
 */
export class NPC {
  /**
   * @param {object} options
   * @param {string} options.id
   * @param {string} options.name
   * @param {number} options.x  Esquina superior izquierda del sprite.
   * @param {number} options.y
   * @param {HTMLCanvasElement} options.canvas  Sprite ya horneado.
   * @param {{xOffset:number,yOffset:number,width:number,height:number}} options.hitbox
   * @param {{x:number,y:number,radius:number,color:string}|null} [options.light]  Luz relativa al sprite.
   */
  constructor({ id, name, x, y, canvas, hitbox, light = null }) {
    this.id = id;
    this.name = name;
    this.x = x;
    this.y = y;
    this.canvas = canvas;
    this.width = canvas.width;
    this.height = canvas.height;
    this.hitbox = hitbox;
    this.light = light;
    this.time = 0;
  }

  get sortY() {
    return this.y + this.height;
  }

  getHitbox() {
    const h = this.hitbox;
    return { x: this.x + h.xOffset, y: this.y + h.yOffset, width: h.width, height: h.height };
  }

  /** Luz en coordenadas del mapa, con un leve parpadeo eléctrico. */
  getLight() {
    if (!this.light) return null;
    const flicker = Math.sin(this.time * 9) * 0.6 + (Math.sin(this.time * 23) > 0.9 ? -3 : 0);
    return { x: this.x + this.light.x, y: this.y + this.light.y, radius: this.light.radius + flicker, color: this.light.color };
  }

  /** Distancia del centro de su base a un punto (para disparadores de proximidad). */
  distanceTo(px, py) {
    const hb = this.getHitbox();
    return Math.hypot(px - (hb.x + hb.width / 2), py - (hb.y + hb.height / 2));
  }

  update(dt) {
    this.time += dt;
  }

  /** @param {import("../graphics/SpriteRenderer.js").SpriteRenderer} renderer */
  render(renderer) {
    renderer.drawShadow(this.x + this.width / 2, this.y + this.height - 1, 12, 2);
    renderer.ctx.drawImage(this.canvas, Math.round(this.x), Math.round(this.y));
  }

  /** Fábrica de Unit-A.R.C. con su base apoyada en (baseX, baseY). */
  static createArc(baseX, baseY) {
    return new NPC({
      id: "arc",
      name: "Unit-A.R.C.",
      x: Math.round(baseX - ARC_W / 2),
      y: Math.round(baseY - ARC_H),
      canvas: renderArcCanvas(),
      hitbox: { xOffset: 6, yOffset: ARC_H - 6, width: ARC_W - 12, height: 6 },
      light: { x: EYE.cx, y: EYE.cy, radius: 34, color: "rgba(255, 150, 60, 0.22)" },
    });
  }
}
