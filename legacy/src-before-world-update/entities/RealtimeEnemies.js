/**
 * RealtimeEnemies · enemigos comunes con IA de persecución
 * -------------------------------------------------------
 * Karr y Sköll deambulan al azar; si Abel entra en su radio de alerta lo
 * persiguen. Al tocarlo muerden (con enfriamiento). Al recibir un golpe
 * retroceden aturdidos. Al morir se disuelven y sueltan botín.
 *
 * La lógica de golpear (palabra flotante + traducción) la orquesta el juego;
 * esta clase solo se mueve, recibe daño y avisa de su estado.
 */

export class Wolf {
  /**
   * @param {object} def   Entrada de ENEMIES (karr / skoll).
   * @param {number} x     Esquina superior izquierda del sprite (20×14).
   * @param {number} y
   * @param {number} id    Identificador estable dentro del mapa (para guardar partida).
   */
  constructor(def, x, y, id) {
    this.def = def;
    this.id = id;
    this.x = x;
    this.y = y;
    this.hp = def.hp;
    this.state = "wander";   // wander · chase · stunned · dying · dead
    this.dir = { x: Math.random() - 0.5, y: Math.random() - 0.5 };
    this.turnIn = 1 + Math.random() * 2;
    this.biteCooldown = 0;
    this.stun = 0;
    this.dieT = 0;
    this.hurtT = 0;
    this.flip = false;
    this.knock = { x: 0, y: 0 };
  }

  get alive() {
    return this.state !== "dying" && this.state !== "dead";
  }

  /** Caja de colisión en las patas. */
  box(x = this.x, y = this.y) {
    return { x: x + 2, y: y + 8, w: 16, h: 6 };
  }

  center() {
    return { x: this.x + 10, y: this.y + 9 };
  }

  /**
   * @param {number} dt
   * @param {{x:number,y:number}} target  Centro de Abel.
   * @param {(box:object)=>boolean} blocked  ¿Choca esta caja con el escenario?
   */
  update(dt, target, blocked) {
    this.biteCooldown = Math.max(0, this.biteCooldown - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
    if (this.state === "dying") {
      this.dieT += dt;
      if (this.dieT > 0.7) this.state = "dead";
      return;
    }
    if (this.state === "dead") return;

    const c = this.center();
    const dx = target.x - c.x, dy = target.y - c.y;
    const dist = Math.hypot(dx, dy);

    let vx = 0, vy = 0;
    if (this.state === "stunned") {
      this.stun -= dt;
      vx = this.knock.x; vy = this.knock.y;
      this.knock.x *= 0.85; this.knock.y *= 0.85;
      if (this.stun <= 0) this.state = "chase";
    } else if (dist < this.def.aggro) {
      this.state = "chase";
      vx = (dx / (dist || 1)) * this.def.speed;
      vy = (dy / (dist || 1)) * this.def.speed;
    } else {
      this.state = "wander";
      this.turnIn -= dt;
      if (this.turnIn <= 0) {
        const a = Math.random() * Math.PI * 2;
        const still = Math.random() < 0.3;
        this.dir = still ? { x: 0, y: 0 } : { x: Math.cos(a), y: Math.sin(a) };
        this.turnIn = 1 + Math.random() * 2.5;
      }
      vx = this.dir.x * this.def.speed * 0.45;
      vy = this.dir.y * this.def.speed * 0.45;
    }

    // Movimiento por ejes con colisión contra el escenario
    const nx = this.x + vx * dt;
    if (!blocked(this.box(nx, this.y))) this.x = nx; else this.dir.x *= -1;
    const ny = this.y + vy * dt;
    if (!blocked(this.box(this.x, ny))) this.y = ny; else this.dir.y *= -1;
    if (Math.abs(vx) > 1) this.flip = vx > 0;
    this.moving = Math.hypot(vx, vy) > 4;
  }

  /** Recibe un golpe: daño, retroceso y aturdimiento. Devuelve true si muere. */
  hit(damage, fromX, fromY) {
    if (!this.alive) return false;
    this.hp -= damage;
    this.hurtT = 0.4;
    const c = this.center();
    const d = Math.hypot(c.x - fromX, c.y - fromY) || 1;
    this.knock = { x: ((c.x - fromX) / d) * 160, y: ((c.y - fromY) / d) * 160 };
    this.state = "stunned";
    this.stun = 0.45;
    if (this.hp <= 0) {
      this.state = "dying";
      this.dieT = 0;
      return true;
    }
    return false;
  }

  /** ¿Puede morder ahora? (lo decide el juego al detectar contacto) */
  tryBite() {
    if (!this.alive || this.state === "stunned" || this.biteCooldown > 0) return false;
    this.biteCooldown = 1.2;
    return true;
  }
}
