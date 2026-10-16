/**
 * CharMotion · animación fluida y coherente para personajes con hojas de una sola vista lateral
 * ----------------------------------------------------------------------------------------------
 * Las hojas de sprites traen reposo, caminar, correr y ataques de perfil. Esta clase los convierte en
 * movimiento creíble en las 8 direcciones y en cada situación:
 *
 *   reposo    ping-pong lento con fundido entre fotogramas + respiración + gesto raro cada ~11 s
 *   caminar   el ciclo avanza según la velocidad real (sin patinar) · rebote de pasos · inclinación
 *   correr    ciclo largo, torso inclinado hacia delante
 *   nadar     brazadas (ciclo de correr, más lento), cuerpo inclinado y balanceo sobre el agua
 *   volar     piernas colgando, balanceo de ingravidez; avanzando se inclina y estira el ciclo de correr
 *   arriba/abajo  no hay arte frontal/trasera: se simula con la zancada, escala (acercarse/alejarse) y balanceo.
 *                 Si el atlas trae `walk_up`, `walk_down`, `idle_up`… se usan automáticamente.
 *
 * Personajes con hojas DIRECCIONALES de verdad (8 vistas dibujadas, p. ej. assets/sprites/abel_idledir.json,
 * cada una con sus propios fotogramas "S","SE","E","NE","N","NO","O","SO") pasan `dirAtlases: { idle, walk, run }`
 * en el constructor: en vez de espejar un único perfil, se elige la fila que de verdad mira hacia donde se
 * mueve o miró por última vez, sin aplicar el aplastado/inclinación de la vista de perfil (ya no hace falta).
 *
 * Uso:   const mo = new CharMotion(ATLAS.abel, { stride: 50 });
 *        mo.update(dt, { vx, vy, run, swim, fly });
 *        mo.draw(ctx, x, y, { flash, tint, alpha, scale });   // devuelve la pose usada
 */
const DIR8 = ["E", "SE", "S", "SW", "W", "NW", "N", "NE"];   // sector 0..7 según atan2(vy,vx) (y+ = abajo)
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const damp = (cur, target, k, dt) => cur + (target - cur) * (1 - Math.exp(-k * dt));

export class CharMotion {
  constructor(atlas, o = {}) {
    this.A = atlas;
    this.dirAtlases = o.dirAtlases || null;                // { idle, walk, run } → Atlas con filas "S","SE","E"…
    this.loco = o.loco || null;                            // atlas 4-dir (RPG): anims idle{S,N,W}, walk{S,N,W}, runW, dashW; la derecha (E) es W reflejado
    this.card = o.card ?? "S";                             // dirección cardinal actual (S/N/E/W), se conserva al pararse
    this.dir8 = o.dir8 ?? "S";
    this.extra = o.extra || {};                            // { swim: Atlas con anim "swim", fly: { atlas, anim, frames:[…] } } → hojas propias de nado y vuelo
    this.stride = o.stride ?? atlas.height * 1.4;          // px de juego por ciclo completo de caminar
    this.runStride = o.runStride ?? atlas.height * 2.3;
    this.t = Math.random() * 20;
    this.phase = 0; this.face = o.face ?? 1; this.vdir = 0;
    this.lean = 0; this.bob = 0; this.sy = 1; this.sway = 0;
    this.mode = "idle"; this.speed = 0; this.vx = 0; this.vy = 0;
    this.wasMoving = false; this.land = 0;
    this.flags = {};
  }

  /** st: { vx, vy (px/s), run (correr sostenido), dashing (esquiva), jumping/jumpFrac (salto), swim, fly, hover, face?: ±1 } */
  update(dt, st = {}) {
    dt = Math.min(dt, 0.05);
    this.t += dt;
    const sp = Math.hypot(st.vx || 0, st.vy || 0);
    const moving = sp > 6;
    this.speed = sp; this.vx = st.vx || 0; this.vy = st.vy || 0;
    this.flags = st;
    if (st.face) this.face = st.face;
    else if (moving && Math.abs(st.vx) > Math.abs(st.vy) * 0.3) this.face = st.vx >= 0 ? 1 : -1;
    this.vdir = moving && Math.abs(st.vy) > Math.abs(st.vx) * 0.8 ? Math.sign(st.vy) : 0;
    if (this.dirAtlases && moving) {                        // hojas de 8 vistas: la dirección sigue el movimiento real
      const sector = Math.round(Math.atan2(st.vy, st.vx) / (Math.PI / 4));
      this.dir8 = DIR8[((sector % 8) + 8) % 8];
    }
    if (this.loco && moving) {                              // RPG de 4 direcciones: la cardinal más cercana (horizontal si empatan)
      this.card = Math.abs(st.vx) >= Math.abs(st.vy) ? (st.vx >= 0 ? "E" : "W") : (st.vy >= 0 ? "S" : "N");
    }

    // modo y ciclo
    let mode = "idle";
    if (st.jumping) mode = "jump";                          // disparo único: no pisa el resto del estado de zancada
    else if (st.fly) mode = moving ? "fly" : "hover";
    else if (st.swim) mode = moving ? "swim" : "tread";
    else if (moving) mode = st.dashing ? "dash" : st.run ? "run" : "walk";
    else if (st.guard) mode = "guard";
    this.mode = mode;
    const A = this.A;
    if (mode === "walk") this.phase += (dt * sp) / this.stride;
    else if (mode === "run" || mode === "dash") this.phase += (dt * sp) / this.runStride;
    else if (mode === "swim") this.phase += dt * (0.9 + sp / 90);
    else if (mode === "fly") this.phase += dt * (0.7 + sp / 140);
    else if (mode === "tread") this.phase += dt * 0.35;
    else if (mode !== "jump") this.phase = damp(this.phase, Math.round(this.phase), 6, dt);   // al parar, el ciclo se asienta
    this.phase %= 1000;
    if (mode === "jump") { this.lean = 0; this.bob = 0; this.sway = 0; return; }   // el salto no usa inclinación/rebote de zancada (lo lleva el llamante)

    // inclinación, rebote y escala (suavizados)
    const dir = this.face;
    const leanT = mode === "run" || mode === "dash" ? 0.13 : mode === "swim" ? (this.extra.swim ? 0.02 : 0.34) : mode === "fly" ? (this.extra.fly ? 0.04 : 0.3) : mode === "walk" ? 0.035 : 0;
    this.lean = damp(this.lean, leanT * dir * (this.vdir ? 0.55 : 1), 9, dt);
    const stepW = Math.abs(Math.sin(this.phase * TAU * 2));
    const bobT = mode === "walk" ? -stepW * (this.vdir ? 1.3 : 0.8) : mode === "run" || mode === "dash" ? -stepW * 1.4 : mode === "swim" ? Math.sin(this.phase * TAU) * 0.8 : mode === "tread" ? Math.sin(this.t * 2.2) * 0.9 : mode === "guard" ? Math.sin(this.t * 7.5) * 0.7 : mode === "hover" ? Math.sin(this.t * 2.6) * 1.8 : mode === "fly" ? Math.sin(this.t * 3.1) * 1.2 : 0;
    this.bob = damp(this.bob, bobT, 22, dt);
    const swayT = mode === "hover" ? Math.sin(this.t * 1.4) * 0.05 : mode === "tread" ? Math.sin(this.t * 1.9) * 0.04 : mode === "walk" || mode === "run" || mode === "dash" ? Math.sin(this.phase * TAU) * 0.018 : 0;
    this.sway = damp(this.sway, swayT, 10, dt);
    // acercarse (abajo) / alejarse (arriba): ligero cambio de escala vertical y horizontal
    const syT = 1 + this.vdir * 0.028 + (moving ? 0 : Math.sin(this.t * 1.9) * 0.012);
    this.sy = damp(this.sy, syT, 8, dt);
    // aterrizaje/frenada: pequeña compresión al detenerse
    if (this.wasMoving && !moving) this.land = 1;
    this.land = Math.max(0, this.land - dt * 4.5);
    this.wasMoving = moving;
  }

  /** Elige animación y fotogramas según el modo. Devuelve { atlas, anim, i, j, b, dir }. */
  pose() {
    const A = this.A, dirKey = this.vdir > 0 ? "_down" : this.vdir < 0 ? "_up" : "";
    const pick = (name) => (dirKey && A.has(name + dirKey) ? name + dirKey : name);
    const loopFrame = (atlas, anim) => { const n = atlas.count(anim); const fp = ((this.phase % 1) + 1) % 1 * n; return { atlas, anim, i: Math.floor(fp) % n, j: (Math.floor(fp) + 1) % n, b: 0 }; };
    // hoja de 8 vistas de verdad para este modo (idle/run/dash/salto…): usa la fila que mira hacia this.dir8.
    // El salto es un disparo único (no un bucle): el fotograma sale directo de la fracción ya recorrida (jumpFrac),
    // no de la fase de zancada. Las demás solo se dibujan con un fotograma nítido (sin mezclar dos a la vez:
    // con fotogramas recién recortados de hojas nuevas, mezclar dos siluetas que no encajan pixel a pixel
    // se ve como una doble exposición en vez de un movimiento suave).
    const X0 = this.extra;
    // Hoja RPG de 4 direcciones: se elige idle/walk/run/dash según la cardinal; la derecha (E) usa el perfil izquierdo reflejado.
    // El vuelo/flotar se dibujan con su hoja propia (extra.fly); el nado reutiliza la locomoción recortada a la cintura.
    const skipLoco = (this.mode === "fly" || this.mode === "hover") && X0.fly;
    if (this.loco && !skipLoco) {
      // El perfil lateral de la hoja 64 mira a la DERECHA; se refleja para ir a la izquierda. Frente (S) y espalda (N) no se reflejan.
      const L = this.loco, side = this.card === "E" || this.card === "W", flip = this.card === "W", base = side ? "W" : this.card;
      const has = (n) => L.has(n);
      let anim;
      if (this.mode === "run") anim = has("run" + base) ? "run" + base : (has("runW") && base === "W") ? "runW" : "walk" + base;
      else if (this.mode === "dash") anim = has("dash" + base) ? "dash" + base : has("dashW") && base === "W" ? "dashW" : has("run" + base) ? "run" + base : "walk" + base;
      else if (this.mode === "walk" || this.mode === "jump" || this.mode === "swim" || this.mode === "fly") anim = "walk" + base;
      else anim = "idle" + base;
      if (!has(anim)) anim = has("idle" + base) ? "idle" + base : "idleS";
      const n = L.count(anim);
      if (this.mode === "jump") { const i = Math.max(0, Math.min(n - 1, Math.floor((this.flags.jumpFrac || 0) * n))); return { atlas: L, anim, i, j: i, b: 0, dir: true, flip }; }
      if (this.mode === "idle" || this.mode === "guard" || this.mode === "tread" || n <= 1) return { atlas: L, anim, i: 0, j: 0, b: 0, dir: true, flip };
      const fp = (((this.phase % 1) + 1) % 1) * n;
      return { atlas: L, anim, i: Math.floor(fp) % n, j: (Math.floor(fp) + 1) % n, b: 0, dir: true, flip };
    }
    const dkey = this.mode === "guard" || this.mode === "hover" || this.mode === "tread" ? "idle" : this.mode;
    const DA = this.dirAtlases && this.dirAtlases[dkey];
    if (DA && DA.has(this.dir8)) {
      if (dkey === "jump") {
        const n = DA.count(this.dir8), i = Math.max(0, Math.min(n - 1, Math.floor((this.flags.jumpFrac || 0) * n)));
        return { atlas: DA, anim: this.dir8, i, j: i, b: 0, dir: true };
      }
      if (dkey === "idle") {
        const p = DA.idlePose(this.t, this.mode === "guard" ? 6 : this.mode === "hover" ? 3.2 : this.mode === "tread" ? 3.6 : 4.2, this.dir8);
        const i = p.b > 0.5 ? p.j : p.i;                        // fotograma nítido más cercano, sin mezcla (ver nota arriba)
        return { atlas: DA, anim: this.dir8, i, j: i, b: 0, dir: true };
      }
      return { ...loopFrame(DA, this.dir8), dir: true };
    }
    const X = this.extra;
    if (X.swim && (this.mode === "swim" || this.mode === "tread") && X.swim.has("swim")) return loopFrame(X.swim, "swim");
    if (X.fly && this.mode === "fly" && X.fly.atlas.has(X.fly.anim)) {              // vuelo con hoja propia: se recorre una selección de fotogramas
      const fr = X.fly.frames, k = Math.floor(((this.phase % 1) + 1) % 1 * fr.length) % fr.length;
      return { atlas: X.fly.atlas, anim: X.fly.anim, i: fr[k], j: fr[(k + 1) % fr.length], b: 0 };
    }
    switch (this.mode) {
      case "walk": return loopFrame(A, pick("walk"));
      case "run": case "dash": return loopFrame(A, A.has("run") ? pick("run") : pick("walk"));
      case "swim": case "fly": return loopFrame(A, A.has("run") ? "run" : "walk");
      case "hover": case "tread": case "idle": default: {
        const p = A.idlePose(this.t, this.mode === "guard" ? 6 : this.mode === "hover" ? 3.2 : this.mode === "tread" ? 3.6 : 4.2, pick("idle"));
        return { atlas: A, anim: A.has(pick("idle")) ? pick("idle") : "idle", i: p.i, j: p.j, b: p.b };
      }
    }
  }

  /**
   * Dibuja. (x, y) = pies. Aplica rebote, inclinación, balanceo y escala. `o.flip` reemplaza al giro automático.
   * Devuelve la pose para que el llamante pueda ajustar (p. ej. recortar al nadar).
   */
  draw(ctx, x, y, o = {}) {
    const p = this.pose(), A = p.atlas || this.A;
    const xr = Math.round(x), yr = Math.round(y + this.bob);
    const sc = (o.scale || 1);
    if (p.dir) {                                     // hoja direccional: ya mira hacia el lado correcto (salvo E, que refleja W)
      const opts = { scale: sc, flash: o.flash, tint: o.tint, alpha: o.alpha, rot: (o.rot || 0), flip: o.flip ?? p.flip ?? false };
      if (p.b > 0.03 && p.j !== p.i) A.drawBlend(ctx, p.anim, p.i, p.j, p.b, xr, yr, opts); else A.draw(ctx, p.anim, p.i, xr, yr, opts);
      return p;
    }
    const flip = o.flip ?? this.face < 0;
    const sy = this.sy * (1 - this.land * 0.05) * (1 + Math.sin(this.t * 1.9) * (this.mode === "idle" ? 0.006 : 0));
    ctx.save();
    ctx.translate(xr, yr); ctx.scale((1 + (1 - sy) * 0.4) * (this.vdir ? 0.93 : 1), sy); ctx.translate(-xr, -yr);       // de frente/de espaldas el cuerpo se ve más estrecho
    const away = this.vdir < 0 && !o.tint;                                                                           // de espaldas: algo más oscuro
    const opts = { flip, scale: sc, flash: o.flash, tint: away ? { color: "#0a0614", alpha: 0.18 } : o.tint, alpha: o.alpha, rot: this.lean + this.sway + (o.rot || 0) };
    if (p.b > 0.03 && p.j !== p.i) A.drawBlend(ctx, p.anim, p.i, p.j, p.b, xr, yr, opts); else A.draw(ctx, p.anim, p.i, xr, yr, opts);
    ctx.restore();
    return p;
  }
}
