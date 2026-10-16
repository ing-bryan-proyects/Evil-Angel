/**
 * TouchControls · mando virtual para Android e iOS
 * ------------------------------------------------
 * Joystick analógico flotante a la izquierda y botones de acción a la derecha
 * (golpe, especial, esquivar, interactuar) más un botón de pausa. Se conecta a
 * `controls` como acciones virtuales, de modo que el resto del juego no sabe si
 * se juega con teclado, mando o dedos.
 *
 *   - Multitáctil real con Pointer Events (stick y botones a la vez).
 *   - Se muestra solo en dispositivos táctiles (pointer: coarse) salvo que los
 *     ajustes digan lo contrario: "auto" · "on" · "off".
 *   - Respeta las zonas seguras (notch / barra de inicio de iOS) y vibra al tocar.
 *   - Aviso de "gira el dispositivo" en vertical.
 *   - Los mandos Bluetooth (MFi / Xbox / PlayStation) funcionan por Gamepad API
 *     en Safari (iOS 13+) y Chrome (Android) sin configuración extra.
 */

const CSS = `
#touch-ui { position: fixed; inset: 0; z-index: 30; pointer-events: none; display: none; touch-action: none;
  -webkit-touch-callout: none; -webkit-user-select: none; user-select: none; font-family: "Press Start 2P", monospace; }
#touch-ui.show { display: block; }
#touch-ui .t-stick { position: absolute; left: calc(18px + env(safe-area-inset-left)); bottom: calc(22px + env(safe-area-inset-bottom));
  width: 132px; height: 132px; border-radius: 50%; pointer-events: auto; touch-action: none;
  background: radial-gradient(circle, rgba(227,179,65,.10), rgba(10,6,18,.45) 70%); border: 2px solid rgba(227,179,65,.55); }
#touch-ui .t-knob { position: absolute; left: 50%; top: 50%; width: 56px; height: 56px; margin: -28px 0 0 -28px; border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #fbe7a1, #e3b341 60%, #9c7416); border: 2px solid #000; opacity: .9; transform: translate(0,0); }
#touch-ui .t-btn { position: absolute; width: 64px; height: 64px; border-radius: 50%; pointer-events: auto; touch-action: none;
  display: grid; place-items: center; color: #fbe7a1; font-size: 10px; letter-spacing: .04em; text-align: center; line-height: 1.3;
  background: rgba(10,6,18,.58); border: 2px solid rgba(227,179,65,.7); box-shadow: 0 0 0 2px rgba(0,0,0,.6); }
#touch-ui .t-btn.on { background: #e3b341; color: #1a1200; }
#touch-ui .t-btn small { display: block; font-size: 7px; opacity: .75; margin-top: 2px; }
#touch-ui .b-punch   { right: calc(96px + env(safe-area-inset-right)); bottom: calc(40px + env(safe-area-inset-bottom)); width: 72px; height: 72px; }
#touch-ui .b-special { right: calc(20px + env(safe-area-inset-right)); bottom: calc(98px + env(safe-area-inset-bottom)); }
#touch-ui .b-dash    { right: calc(20px + env(safe-area-inset-right)); bottom: calc(24px + env(safe-area-inset-bottom)); width: 54px; height: 54px; }
#touch-ui .b-interact{ right: calc(184px + env(safe-area-inset-right)); bottom: calc(34px + env(safe-area-inset-bottom)); width: 54px; height: 54px; }
#touch-ui .b-menu    { right: calc(168px + env(safe-area-inset-right)); top: calc(12px + env(safe-area-inset-top)); width: 44px; height: 44px; font-size: 14px; }
#rotate-hint { position: fixed; inset: 0; z-index: 120; display: none; place-items: center; text-align: center; background: #05030a;
  color: #fbe7a1; font-family: "Press Start 2P", monospace; font-size: 12px; line-height: 2; padding: 24px; }
#rotate-hint b { display: block; font-size: 38px; margin-bottom: 14px; animation: rot 2s ease-in-out infinite; }
@keyframes rot { 0%, 100% { transform: rotate(0); } 50% { transform: rotate(90deg); } }
@media (orientation: portrait) and (pointer: coarse) { body.touch-on #rotate-hint { display: grid; } }
body.touch-on #hud-stats { transform: scale(0.72); transform-origin: top right; }
body.touch-on #controls-hint { display: none; }
@media (max-height: 420px) { #touch-ui .t-stick { width: 112px; height: 112px; } #touch-ui .t-btn { transform: scale(.9); } }
`;

export class TouchControls {
  /** @param {import("../core/Controls.js").Controls} controls */
  constructor(controls) {
    this.controls = controls;
    this.mode = "auto";
    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    this.root = document.createElement("div");
    this.root.id = "touch-ui";
    this.root.innerHTML = `
      <div class="t-stick"><div class="t-knob"></div></div>
      <div class="t-btn b-punch" data-act="punch">PUNCH<small>J</small></div>
      <div class="t-btn b-special" data-act="special">HOLY<small>K</small></div>
      <div class="t-btn b-dash" data-act="dash">DASH</div>
      <div class="t-btn b-interact" data-act="interact">TALK</div>
      <div class="t-btn b-menu" data-act="menu">❚❚</div>`;
    document.body.appendChild(this.root);

    const hint = document.createElement("div");
    hint.id = "rotate-hint";
    hint.innerHTML = `<div><b>⟳</b>ROTATE YOUR DEVICE<br><span style="font-size:9px;color:#a8935c">Gira el dispositivo</span></div>`;
    document.body.appendChild(hint);

    this.stick = this.root.querySelector(".t-stick");
    this.knob = this.root.querySelector(".t-knob");
    this.stickPointer = null;
    this.#wireStick();
    this.root.querySelectorAll(".t-btn").forEach((b) => this.#wireButton(b));
    this.touchSeen = false;
    if (matchMedia("(pointer: coarse)").matches) this.controls.lastDevice = "touch";
    window.addEventListener("pointerdown", (e) => { if (e.pointerType === "touch") { this.touchSeen = true; this.#autoShow(); } }, { passive: true });
    this.#autoShow();
    // En iOS/Android evita el zoom por doble toque y el desplazamiento elástico
    document.addEventListener("gesturestart", (e) => e.preventDefault());
    document.addEventListener("touchmove", (e) => { if (e.target.closest("#touch-ui, #game")) e.preventDefault(); }, { passive: false });
  }

  setMode(mode) { this.mode = mode; this.#autoShow(); }

  /** Dispositivo realmente táctil: puntero grueso (móvil/tableta) o un toque ya detectado (no basta con tener pantalla táctil). */
  #isTouchDevice() {
    return matchMedia("(pointer: coarse)").matches || this.touchSeen;
  }

  /** Reevalúa si hay que mostrar el mando (se llama cada frame; solo toca el DOM si cambia). */
  refresh() { this.#autoShow(); }

  #autoShow() {
    const c = this.controls;
    const on = this.mode === "on" || (this.mode === "auto" && this.#isTouchDevice() && !c.padConnected && c.lastDevice !== "keyboard" && c.lastDevice !== "pad");
    if (on === this._on) return;
    this._on = on;
    this.root.classList.toggle("show", on);
    document.body.classList.toggle("touch-on", on);
  }

  /** Oculta el mando táctil mientras hay un menú abierto (los menús se tocan directamente). */
  setSuspended(s) { this.root.style.visibility = s ? "hidden" : "visible"; }

  #wireStick() {
    const R = 46; // recorrido máximo del pomo
    const move = (e) => {
      const r = this.stick.getBoundingClientRect();
      let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy);
      const k = d > R ? R / d : 1;
      dx *= k; dy *= k;
      this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
      const m = Math.min(1, d / R);
      const dead = 0.18;
      if (m < dead) this.controls.setVirtualAxis(0, 0);
      else this.controls.setVirtualAxis((dx / R) / Math.max(m, 0.001) * m, (dy / R) / Math.max(m, 0.001) * m);
    };
    this.stick.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      this.stick.setPointerCapture(e.pointerId);
      this.stickPointer = e.pointerId;
      move(e);
    });
    this.stick.addEventListener("pointermove", (e) => { if (e.pointerId === this.stickPointer) move(e); });
    const end = (e) => {
      if (e.pointerId !== this.stickPointer) return;
      this.stickPointer = null;
      this.knob.style.transform = "translate(0,0)";
      this.controls.setVirtualAxis(0, 0);
    };
    this.stick.addEventListener("pointerup", end);
    this.stick.addEventListener("pointercancel", end);
  }

  #wireButton(btn) {
    const act = btn.dataset.act;
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      btn.setPointerCapture(e.pointerId);
      btn.classList.add("on");
      this.controls.setVirtual(act, true);
      navigator.vibrate?.(8);
    });
    const up = () => { btn.classList.remove("on"); this.controls.setVirtual(act, false); };
    btn.addEventListener("pointerup", up);
    btn.addEventListener("pointercancel", up);
    btn.addEventListener("lostpointercapture", up);
  }
}
