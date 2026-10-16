import { SPRITES, WALK_CYCLE } from "../graphics/SpriteRenderer.js";

/**
 * Player · Abel
 * -------------
 * Física y estado del protagonista: posición, dirección, hitbox en los pies,
 * estadísticas (HP / LP) y temporizadores de animación. Le dice al
 * SpriteRenderer qué dirección, fotograma y variante de luz pintar.
 *
 * Estados: "idle" (respira) · "walk" (ciclo de 4 tiempos con 3 fotogramas).
 */

const BREATH_PERIOD = 2.6;    // s por ciclo de respiración
const INHALE_THRESHOLD = 0.3; // parte alta de la onda: pecho 1 px arriba
const WALK_FPS = 8;           // tiempos de caminata por segundo

/** Intersección entre rectángulos {x, y, width, height}. */
export function intersects(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export class Player {
  /**
   * @param {number} x  Esquina superior izquierda del sprite (píxeles lógicos).
   * @param {number} y
   */
  constructor(x, y) {
    this.spriteName = "abel";
    const def = SPRITES[this.spriteName];

    this.x = x;
    this.y = y;
    this.width = def.width;   // 32
    this.height = def.height; // 40

    /** Velocidad en píxeles lógicos por segundo. */
    this.speed = 64;
    /** Hitbox reducida a la base de las botas: el cuerpo puede pasar por detrás de las copas. */
    this.hitbox = { xOffset: 9, yOffset: 35, width: 14, height: 5 };

    /** Dirección a la que mira: "down" | "up" | "left" | "right". */
    this.direction = "down";
    this.state = "idle";

    // Estadísticas que muestra el HUD
    this.maxHp = 100;
    this.hp = 100;
    this.lp = 0;

    this.idleTimer = 0;
    this.walkTimer = 0;
  }

  /** Y de la base de los pies: decide el orden de profundidad. */
  get sortY() {
    return this.y + this.height;
  }

  /** Centro aproximado del pecho (para la luz que rodea a Abel). */
  get center() {
    return { x: this.x + this.width / 2, y: this.y + this.height * 0.45 };
  }

  getHitbox(x = this.x, y = this.y) {
    const h = this.hitbox;
    return { x: x + h.xOffset, y: y + h.yOffset, width: h.width, height: h.height };
  }

  collidesAt(x, y, obstacles, bounds) {
    const box = this.getHitbox(x, y);
    if (bounds && (box.x < 0 || box.y < 0 || box.x + box.width > bounds.width || box.y + box.height > bounds.height)) return true;
    return obstacles.some((o) => intersects(box, o));
  }

  /**
   * @param {import("../core/InputHandler.js").InputHandler} input
   * @param {{x:number,y:number,width:number,height:number}[]} obstacles
   * @param {number} [dt=1/60]
   * @param {{width:number,height:number}} [bounds]
   */
  update(input, obstacles, dt = 1 / 60, bounds) {
    // La dirección cambia en cuanto se pulsa la tecla, aunque haya un obstáculo delante
    const latest = input.latestDirection();
    if (latest) this.direction = latest;

    const { x: ax, y: ay } = input.getAxis();
    const moving = ax !== 0 || ay !== 0;

    if (moving) {
      const len = Math.hypot(ax, ay);
      const dx = (ax / len) * this.speed * dt;
      const dy = (ay / len) * this.speed * dt;
      // Cada eje por separado: si choca en uno, se desliza por el otro
      if (dx !== 0 && !this.collidesAt(this.x + dx, this.y, obstacles, bounds)) this.x += dx;
      if (dy !== 0 && !this.collidesAt(this.x, this.y + dy, obstacles, bounds)) this.y += dy;
      this.walkTimer += dt;
    } else {
      this.walkTimer = 0;
    }

    this.state = moving ? "walk" : "idle";
    this.idleTimer += dt;
  }

  static breathOffset(time) {
    return Math.sin((time / BREATH_PERIOD) * Math.PI * 2) > INHALE_THRESHOLD ? -1 : 0;
  }

  /** Tiempo del ciclo de caminata (0–3). */
  get walkBeat() {
    return Math.floor(this.walkTimer * WALK_FPS) % WALK_CYCLE.length;
  }

  /** Fotograma a pintar: 0 en reposo, o el que toque del ciclo de caminata. */
  get frame() {
    return this.state === "walk" ? WALK_CYCLE[this.walkBeat] : 0;
  }

  /** ¿Pecho elevado? En reposo depende de la respiración; caminando, sube en las pasadas. */
  get lifted() {
    return this.state === "walk" ? this.frame === 0 : Player.breathOffset(this.idleTimer) < 0;
  }

  get regions() {
    const walking = this.state === "walk";
    const passing = walking && this.frame === 0;
    return SPRITES[this.spriteName].regions.map((r) => {
      let offset = 0;
      if (r.breathes) offset = walking ? (passing ? -1 : 0) : Player.breathOffset(this.idleTimer - r.delay);
      return { from: r.from, to: r.to, offset };
    });
  }

  /** @param {import("../graphics/SpriteRenderer.js").SpriteRenderer} renderer */
  render(renderer) {
    const lifted = this.lifted;
    renderer.drawShadow(this.x + this.width / 2, this.y + this.height - 1, lifted ? 9 : 10, 2);
    renderer.drawSprite(
      this.spriteName,
      { direction: this.direction, frame: this.frame, variant: lifted ? "inhale" : "exhale" },
      this.x, this.y, this.regions,
    );
  }
}
