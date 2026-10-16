/**
 * RealtimeEnemies · enemigos comunes con IA y ataque telegrafiado
 * ---------------------------------------------------------------
 * Ciclo de combate de Karr / Sköll / brasas de Pyrus:
 *
 *   wander   patrulla su territorio (vuelve a su guarida si se aleja), olfatea y descansa; la manada se mueve junta
 *   alert    ve a Abel (o un compañero lo ve): se detiene un instante con las orejas arriba
 *   chase    lo persigue (galope), rodeándolo por un flanco distinto al de sus compañeros; tras morder le da vueltas
 *            a distancia (acecho) hasta que puede volver a embestir
 *   windup   se agacha y absorbe energía (oscuridad / hielo / fuego): TELEGRAFÍA el ataque,
 *            dando tiempo a esquivar con el dash
 *   lunge    salta hacia donde estaba Abel; solo aquí puede morder
 *   recover  se sacude y queda expuesto
 *   stunned  al recibir un golpe: destello blanco y retroceso decelerado
 *   dying    cae de costado y se disuelve
 *
 * La lógica de golpear (palabra flotante + traducción) la orquesta el juego;
 * esta clase solo se mueve, recibe daño y expone su estado para dibujarlo.
 */

export class Wolf {
  /**
   * @param {object} def   Entrada de ENEMIES (karr / skoll …).
   * @param {number} x     Esquina superior izquierda del sprite (20×14).
   * @param {number} y
   * @param {number|string} id  Identificador estable dentro del mapa (para guardar partida).
   */
  constructor(def, x, y, id) {
    this.def = def;
    this.id = id;
    this.x = x;
    this.y = y;
    this.hp = def.hp;
    this.state = "wander";
    this.stateT = 0;
    this.dir = { x: Math.random() - 0.5, y: Math.random() - 0.5 };
    this.turnIn = 1 + Math.random() * 2;
    this.biteCooldown = 0;
    this.stun = 0;
    this.dieT = 0;
    this.hurtT = 0;
    this.flip = false;
    this.knock = { x: 0, y: 0 };
    this.seed = Math.random() * 20;
    this.lock = { x: 0, y: 0 };
    this.bitten = false;
    this.moving = false;
    this.run = false;
    this.element = def.element || "dark";
    this.home = { x, y };                                   // guarida: de aquí no se aleja más de ~190 px
    this.dest = null;                                       // punto al que pasea
    this.pause = Math.random() * 2;                         // descanso (olfatea) antes de moverse
    this.flank = Math.random() < 0.5 ? -1 : 1;              // por qué lado rodea a Abel
    this.avx = 0; this.avy = 0;
  }

  get alive() {
    return this.state !== "dying" && this.state !== "dead";
  }

  /** 0..1 mientras carga el ataque (para el aura del sprite). */
  get charge() {
    return this.state === "windup" ? Math.min(1, this.stateT / this.windupTime) : 0;
  }
  get windupTime() { return this.def.windup ?? 0.45; }

  /** Caja de colisión en las patas. */
  box(x = this.x, y = this.y) {
    return { x: x + 2, y: y + 8, w: 16, h: 6 };
  }

  center() {
    return { x: this.x + 10, y: this.y + 9 };
  }

  #go(state) { this.state = state; this.stateT = 0; }

  /**
   * @param {number} dt
   * @param {{x:number,y:number}} target  Centro de Abel.
   * @param {(box:object)=>boolean} blocked  ¿Choca esta caja con el escenario?
   * @param {Wolf[]} [mates]  Resto de la manada del mapa (para avisarse, no apelotonarse y pasear juntos).
   */
  update(dt, target, blocked, mates = []) {
    this.biteCooldown = Math.max(0, this.biteCooldown - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.stateT += dt;
    if (this.state === "dying") {
      this.dieT += dt;
      if (this.dieT > 0.8) this.state = "dead";
      return;
    }
    if (this.state === "dead") return;

    const c = this.center();
    const dx = target.x - c.x, dy = target.y - c.y;
    const dist = Math.hypot(dx, dy);
    const ux = dx / (dist || 1), uy = dy / (dist || 1);
    let vx = 0, vy = 0;
    this.run = false;

    switch (this.state) {
      case "stunned":
        vx = this.knock.x; vy = this.knock.y;
        const k = Math.exp(-7 * dt);
        this.knock.x *= k; this.knock.y *= k;               // retroceso decelerado
        this.stun -= dt;
        if (this.stun <= 0) this.#go("chase");
        break;
      case "alert":
        this.flip = dx > 0;
        if (this.stateT > 0.38) this.#go("chase");
        break;
      case "windup":
        this.flip = dx > 0;
        this.lock = { x: ux, y: uy };
        if (this.stateT >= this.windupTime) { this.#go("lunge"); this.bitten = false; }
        break;
      case "lunge": {
        const sp = this.def.speed * 4.4 * (1 - this.stateT / 0.3 * 0.4);
        vx = this.lock.x * sp; vy = this.lock.y * sp;
        this.run = true;
        if (this.stateT >= 0.24) { this.#go("recover"); this.biteCooldown = 0.9; }
        break;
      }
      case "recover":
        if (this.stateT > 0.5) this.#go(dist < this.def.aggro ? "chase" : "wander");
        break;
      case "chase": {
        if (dist > this.def.aggro * 1.7) { this.#go("wander"); break; }
        this.run = true;
        if (dist < 30 && this.biteCooldown <= 0) { this.#go("windup"); break; }
        let dxu = ux, dyu = uy, sp = this.def.speed;
        if (dist < 64 && this.biteCooldown > 0) {            // acecho: da vueltas a distancia hasta poder embestir otra vez
          const keep = dist < 42 ? -0.35 : dist > 54 ? 0.35 : 0;
          dxu = -uy * this.flank + ux * keep; dyu = ux * this.flank + uy * keep; sp *= 0.62;
        } else if (dist > 46) {                              // acercamiento por el flanco propio: dos lobos no llegan por el mismo lado
          const ang = this.flank * 0.6 * Math.min(1, Math.max(0, (dist - 46) / 120));
          const ca = Math.cos(ang), sa = Math.sin(ang);
          dxu = ux * ca - uy * sa; dyu = ux * sa + uy * ca;
        }
        for (const o of mates) {                             // separación de la manada
          if (o === this || !o.alive) continue;
          const ox = this.x - o.x, oy = this.y - o.y, od = Math.hypot(ox, oy);
          if (od > 0 && od < 26) { dxu += (ox / od) * (26 - od) / 26 * 0.9; dyu += (oy / od) * (26 - od) / 26 * 0.9; }
        }
        const l = Math.hypot(dxu, dyu) || 1;
        vx = (dxu / l) * sp; vy = (dyu / l) * sp;
        break;
      }
      default: {                                              // wander: patrulla su territorio, olfatea, descansa
        if (dist < this.def.aggro) { this.#go("alert"); this.flip = dx > 0; break; }
        if (dist < this.def.aggro * 2.2 && mates.some((o) => o !== this && o.alive && (o.state === "alert" || o.state === "chase" || o.state === "windup" || o.state === "lunge") && Math.hypot(o.x - this.x, o.y - this.y) < 170)) {
          this.#go("alert"); this.flip = dx > 0; this.stateT = -Math.random() * 0.25; break;      // la alarma se contagia, con un pequeño retraso
        }
        if (this.pause > 0) { this.pause -= dt; break; }
        const far = Math.hypot(this.x - this.home.x, this.y - this.home.y) > 190;
        if (!this.dest || far) {
          // la manada pasea junta: el de menor id entre los que andan cerca (≤260 px) hace de guía y los demás lo siguen
          let lead = this;
          for (const o of mates) if (o.alive && o.state === "wander" && String(o.id) < String(lead.id) && Math.hypot(o.x - this.x, o.y - this.y) < 260) lead = o;
          const base = far || lead === this ? this.home : { x: lead.x, y: lead.y };
          const a = Math.random() * Math.PI * 2, r = (lead !== this ? 45 : 30) + Math.random() * 80;
          this.dest = { x: base.x + Math.cos(a) * r, y: base.y + Math.sin(a) * r * 0.75 };
        }
        const ddx = this.dest.x - this.x, ddy = this.dest.y - this.y, dd = Math.hypot(ddx, ddy);
        if (dd < 8 || this.stateT > 7) { this.dest = null; this.pause = 0.9 + Math.random() * 2.8; this.stateT = 0; break; }
        vx = (ddx / dd) * this.def.speed * 0.42; vy = (ddy / dd) * this.def.speed * 0.42;
      }
    }

    // Movimiento por ejes con colisión contra el escenario
    const ox0 = this.x, oy0 = this.y;
    const nx = this.x + vx * dt;
    if (!blocked(this.box(nx, this.y))) this.x = nx; else { this.dir.x *= -1; this.dest = null; if (this.state === "lunge") this.lock.x = 0; }
    const ny = this.y + vy * dt;
    if (!blocked(this.box(this.x, ny))) this.y = ny; else { this.dir.y *= -1; this.dest = null; if (this.state === "lunge") this.lock.y = 0; }
    if (Math.abs(vx) > 1 && this.state !== "stunned") this.flip = vx > 0;
    this.moving = Math.hypot(vx, vy) > 4 && this.state !== "stunned";
    this.avx = (this.x - ox0) / Math.max(dt, 1e-3); this.avy = (this.y - oy0) / Math.max(dt, 1e-3);     // velocidad real (el ciclo de patas la sigue)
  }

  /** Recibe un golpe: daño, retroceso y aturdimiento. Devuelve true si muere. */
  hit(damage, fromX, fromY) {
    if (!this.alive) return false;
    this.hp -= damage;
    this.hurtT = 0.2;
    const c = this.center();
    const d = Math.hypot(c.x - fromX, c.y - fromY) || 1;
    this.knock = { x: ((c.x - fromX) / d) * 190, y: ((c.y - fromY) / d) * 190 };
    this.#go("stunned");
    this.stun = 0.5;
    if (this.hp <= 0) {
      this.#go("dying");
      this.dieT = 0;
      return true;
    }
    return false;
  }

  /** ¿Muerde ahora? Solo durante el salto y una vez por salto. */
  tryBite() {
    if (this.state !== "lunge" || this.bitten) return false;
    this.bitten = true;
    return true;
  }

  /** Estado para drawWolf(). */
  drawState(t) {
    const st = { t, pal: this.def.pal, flip: this.flip, seed: this.seed, element: this.element, armored: this.def.id === "skoll", hurt: Math.min(1, this.hurtT / 0.2), charge: this.charge };
    if (this.state === "dying") { st.die = this.dieT; st.state = "stunned"; return st; }
    if (this.state === "wander") st.state = this.moving ? "trot" : "idle";
    else if (this.state === "chase") st.state = "run";
    else st.state = this.state;
    return st;
  }
}
