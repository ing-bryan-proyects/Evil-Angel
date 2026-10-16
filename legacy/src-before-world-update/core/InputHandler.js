/**
 * InputHandler
 * ------------
 * Registro del teclado: qué teclas están pulsadas ahora mismo y qué teclas se
 * han pulsado en este frame. Traduce WASD y las flechas a cuatro acciones
 * (up, down, left, right) y expone los ejes de movimiento X e Y.
 *
 * Se guardan los CÓDIGOS físicos (KeyW, ArrowUp…), no las acciones: así, si el
 * jugador mantiene A y suelta ←, el personaje sigue yendo a la izquierda.
 */

const KEY_MAP = Object.freeze({
  KeyW: "up", ArrowUp: "up",
  KeyS: "down", ArrowDown: "down",
  KeyA: "left", ArrowLeft: "left",
  KeyD: "right", ArrowRight: "right",
});

export class InputHandler {
  /** @param {Window|HTMLElement} [target=window] */
  constructor(target = window) {
    this.target = target;
    /** Códigos de las teclas mantenidas. */
    this.held = new Set();
    /** Códigos pulsados desde el último endFrame() (para acciones de una sola vez). */
    this.pressedThisFrame = new Set();
    /** Acciones de dirección en orden de pulsación; la última es la más reciente. */
    this.directionOrder = [];

    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onBlur = this.onBlur.bind(this);

    target.addEventListener("keydown", this.onKeyDown);
    target.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
  }

  /** @param {KeyboardEvent} e */
  onKeyDown(e) {
    const action = KEY_MAP[e.code];
    if (action) {
      e.preventDefault(); // las flechas no deben desplazar la página
      if (!e.repeat) {
        this.directionOrder = this.directionOrder.filter((a) => a !== action);
        this.directionOrder.push(action);
      }
    }
    if (!e.repeat) this.pressedThisFrame.add(e.code);
    this.held.add(e.code);
  }

  /** @param {KeyboardEvent} e */
  onKeyUp(e) {
    this.held.delete(e.code);
    const action = KEY_MAP[e.code];
    if (action && !this.isDown(action)) this.directionOrder = this.directionOrder.filter((a) => a !== action);
  }

  /** Al perder el foco el navegador no envía keyup: soltamos todo para que Abel no siga andando solo. */
  onBlur() {
    this.held.clear();
    this.directionOrder = [];
  }

  /**
   * Última dirección pulsada que sigue mantenida ("up" | "down" | "left" | "right"),
   * o null si no hay ninguna. Decide hacia dónde mira el personaje al instante.
   */
  latestDirection() {
    for (let i = this.directionOrder.length - 1; i >= 0; i--) {
      if (this.isDown(this.directionOrder[i])) return this.directionOrder[i];
    }
    return null;
  }

  /**
   * ¿Está activa una acción?
   * @param {"up"|"down"|"left"|"right"} action
   */
  isDown(action) {
    for (const code of this.held) if (KEY_MAP[code] === action) return true;
    return false;
  }

  /** Eje horizontal: -1 izquierda, 0 nada (o ambas), 1 derecha. */
  get axisX() {
    return (this.isDown("right") ? 1 : 0) - (this.isDown("left") ? 1 : 0);
  }

  /** Eje vertical: -1 arriba, 0 nada (o ambas), 1 abajo. */
  get axisY() {
    return (this.isDown("down") ? 1 : 0) - (this.isDown("up") ? 1 : 0);
  }

  /** @returns {{x: number, y: number}} */
  getAxis() {
    return { x: this.axisX, y: this.axisY };
  }

  /** ¿Hay movimiento en algún eje? */
  isMoving() {
    return this.axisX !== 0 || this.axisY !== 0;
  }

  /**
   * ¿Se pulsó esta tecla en este frame? (útil para interruptores como depuración).
   * @param {string} code  Código físico, p. ej. "KeyH".
   */
  wasPressed(code) {
    return this.pressedThisFrame.has(code);
  }

  /** Llamar una vez por frame, después de procesar las acciones de una sola vez. */
  endFrame() {
    this.pressedThisFrame.clear();
  }

  /** Quita los listeners (por si se reinicia el motor). */
  destroy() {
    this.target.removeEventListener("keydown", this.onKeyDown);
    this.target.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
  }
}

/* ======================================================================
   GamepadInput · mando físico (Gamepad API, mapeo "standard")
   ----------------------------------------------------------------------
   Se consulta una vez por frame con poll(). Devuelve el eje del joystick
   izquierdo (con zona muerta, o la cruceta si se usa) y los botones
   pulsados en este frame. Convive con el teclado: el juego suma ambos.

     A (0)  → golpe / confirmar      B (1) → ataque especial / cancelar
     X (2)  → golpe                  Y (3) → ataque especial
     START (9) → menú                Cruceta (12–15) → movimiento
   ====================================================================== */

const PAD_BUTTONS = Object.freeze({ 0: "A", 1: "B", 2: "X", 3: "Y", 8: "SELECT", 9: "START", 12: "UP", 13: "DOWN", 14: "LEFT", 15: "RIGHT" });
const DEADZONE = 0.25;

export class GamepadInput {
  constructor() {
    this.prev = new Set();
    this.connected = false;
    window.addEventListener("gamepadconnected", () => { this.connected = true; });
    window.addEventListener("gamepaddisconnected", () => { this.connected = false; });
  }

  /** @returns {{x:number, y:number, held:Set<string>, pressed:Set<string>, active:boolean}} */
  poll() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = [...pads].find((p) => p && p.connected);
    const held = new Set();
    let x = 0, y = 0;
    if (pad) {
      const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
      if (Math.hypot(ax, ay) > DEADZONE) { x = ax; y = ay; }
      pad.buttons.forEach((b, i) => { if (b.pressed && PAD_BUTTONS[i]) held.add(PAD_BUTTONS[i]); });
      if (held.has("LEFT")) x = -1;
      if (held.has("RIGHT")) x = 1;
      if (held.has("UP")) y = -1;
      if (held.has("DOWN")) y = 1;
    }
    const pressed = new Set([...held].filter((b) => !this.prev.has(b)));
    this.prev = held;
    return { x, y, held, pressed, active: !!pad };
  }
}
