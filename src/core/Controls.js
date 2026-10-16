/**
 * Controls · entrada unificada (teclado, ratón, mando y táctil)
 * -------------------------------------------------------------
 * Una sola fuente de verdad para todo el juego:
 *
 *   ACCIONES   up/down/left/right · punch · special · dash · interact · menu · ans1-3
 *   DISPOSITIVOS  keyboard · mouse · pad (Gamepad API, mapeo "standard") · virtual (táctil)
 *   Cada acción admite DOS asignaciones por dispositivo (principal y alternativa),
 *   personalizables desde Ajustes y guardadas en localStorage.
 *
 *   isDown(a) / pressed(a) / axis()   estado del mundo, consultado una vez por frame.
 *   UI: navegación de menús con flechas / WASD / cruceta / stick y confirmar/volver.
 *       Cada overlay registra un "scope" (pushScope); el scope superior recibe la navegación.
 *
 * El bucle de sondeo del mando es propio (empieza al cargar la página), de modo que
 * el mando también funciona en la pantalla de inicio y en los ajustes.
 *
 * Teclas de seguridad (no se pueden quitar): Esc / START siempre abren el menú o
 * vuelven atrás; Enter / Espacio / A siempre confirman en menús.
 */

export const ACTIONS = Object.freeze([
  { id: "up",       label: "Move up",          es: "Arriba",             group: "move" },
  { id: "down",     label: "Move down",        es: "Abajo",              group: "move" },
  { id: "left",     label: "Move left",        es: "Izquierda",          group: "move" },
  { id: "right",    label: "Move right",       es: "Derecha",            group: "move" },
  { id: "punch",    label: "Punch",            es: "Golpe",              group: "combat" },
  { id: "special",  label: "Holy burst",       es: "Ataque especial",    group: "combat" },
  { id: "dash",     label: "Dash",             es: "Esquivar",           group: "combat" },
  { id: "run",      label: "Run (hold)",       es: "Correr (mantener)",  group: "move" },
  { id: "jump",     label: "Jump",             es: "Saltar",             group: "move" },
  { id: "interact", label: "Interact / talk",  es: "Interactuar",        group: "world" },
  { id: "menu",     label: "Pause menu",       es: "Menú de pausa",      group: "world" },
  { id: "ans1",     label: "Answer 1",         es: "Respuesta 1",        group: "words" },
  { id: "ans2",     label: "Answer 2",         es: "Respuesta 2",        group: "words" },
  { id: "ans3",     label: "Answer 3",         es: "Respuesta 3",        group: "words" },
]);

export const DEFAULT_BINDINGS = Object.freeze({
  keyboard: {
    up: ["KeyW", "ArrowUp"], down: ["KeyS", "ArrowDown"], left: ["KeyA", "ArrowLeft"], right: ["KeyD", "ArrowRight"],
    punch: ["KeyJ", "KeyZ"], special: ["KeyK", "KeyX"], dash: ["KeyL"],
    interact: ["KeyE", "Enter"], menu: ["Escape", "KeyP"],
    run: ["ShiftLeft", "ShiftRight"], jump: ["Space"],
    ans1: ["Digit1", "Numpad1"], ans2: ["Digit2", "Numpad2"], ans3: ["Digit3", "Numpad3"],
  },
  mouse: {
    up: [], down: [], left: [], right: [],
    punch: ["Mouse0"], special: ["Mouse2"], dash: ["Mouse1"], interact: [], menu: [],
    run: [], jump: [],
    ans1: [], ans2: [], ans3: [],
  },
  pad: {
    up: [12], down: [13], left: [14], right: [15],
    punch: [2, 7], special: [3, 6], dash: [5], interact: [0], menu: [9],
    run: [10], jump: [1],
    ans1: [0], ans2: [1], ans3: [2],
  },
});

/** Nombres legibles de las teclas / botones. */
export function keyLabel(code) {
  if (!code) return "—";
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Numpad")) return "NUM " + code.slice(6).replace("Enter", "ENT");
  if (code.startsWith("Mouse")) return ["LEFT CLICK", "MIDDLE CLICK", "RIGHT CLICK", "MOUSE 4", "MOUSE 5"][+code.slice(5)] || code.toUpperCase();
  const map = {
    ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→", Space: "SPACE", Enter: "ENTER", Escape: "ESC",
    ShiftLeft: "L-SHIFT", ShiftRight: "R-SHIFT", ControlLeft: "L-CTRL", ControlRight: "R-CTRL", AltLeft: "L-ALT", AltRight: "R-ALT",
    Tab: "TAB", Backspace: "BKSP", Backquote: "`", Minus: "-", Equal: "=", BracketLeft: "[", BracketRight: "]",
    Semicolon: ";", Quote: "'", Comma: ",", Period: ".", Slash: "/", Backslash: "\\", CapsLock: "CAPS",
  };
  return map[code] || code.toUpperCase();
}

const PAD_NAMES = ["A", "B", "X", "Y", "LB", "RB", "LT", "RT", "SELECT", "START", "L3", "R3", "D-UP", "D-DOWN", "D-LEFT", "D-RIGHT", "HOME"];
export const padLabel = (i) => (i == null ? "—" : PAD_NAMES[i] ?? `BTN ${i}`);

const STORE_KEY = "evil-angel:controls";
const SEL = 'button, input:not([type="hidden"]), select, textarea, a[href], [tabindex]:not([tabindex="-1"]), [data-nav]';
const UI_KEYS = Object.freeze({
  ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
  KeyW: "up", KeyS: "down", KeyA: "left", KeyD: "right",
  Enter: "confirm", NumpadEnter: "confirm", Space: "confirm",
  Escape: "back", Backspace: "back",
  PageUp: "prevtab", PageDown: "nexttab", BracketLeft: "prevtab", BracketRight: "nexttab",
});

const clone = (o) => JSON.parse(JSON.stringify(o));

export class Controls extends EventTarget {
  constructor() {
    super();
    this.bindings = clone(DEFAULT_BINDINGS);
    this.load();
    this.settings = { deadzone: 0.25, vibration: true };

    this.keysHeld = new Set();        // teclas y botones de ratón (Mouse0…)
    this.latch = new Set();           // acciones pulsadas desde el último update()
    this.edge = new Set();            // acciones recién pulsadas en este frame
    this.virtual = new Set();         // acciones mantenidas por los botones táctiles
    this.virtualAxis = { x: 0, y: 0 };
    this.padHeld = new Set();
    this.padPrev = new Set();
    this.padAxis = { x: 0, y: 0 };
    this.padConnected = false;
    this.padId = "";
    this.lastDevice = "keyboard";     // para mostrar las pistas correctas
    this.scopes = [];
    this.capturing = null;
    this.uiRepeat = { dir: null, t: 0, n: 0 };
    this.frame = 0;

    window.addEventListener("keydown", (e) => this.#onKeyDown(e), true);
    window.addEventListener("keyup", (e) => this.#onKeyUp(e), true);
    window.addEventListener("blur", () => { this.keysHeld.clear(); this.virtual.clear(); });
    window.addEventListener("mousedown", (e) => this.#onMouseDown(e), true);
    window.addEventListener("mouseup", (e) => { this.keysHeld.delete("Mouse" + e.button); }, true);
    window.addEventListener("contextmenu", (e) => { if (e.target.closest?.("#game, #game-root")) e.preventDefault(); });
    window.addEventListener("gamepadconnected", (e) => { this.padConnected = true; this.padId = e.gamepad.id; this.dispatchEvent(new CustomEvent("padchange", { detail: { connected: true, id: e.gamepad.id } })); });
    window.addEventListener("gamepaddisconnected", () => { this.padConnected = false; this.padHeld.clear(); this.dispatchEvent(new CustomEvent("padchange", { detail: { connected: false } })); });
    window.addEventListener("pointerdown", (e) => { this.pointerType = e.pointerType; if (e.pointerType === "touch") this.lastDevice = "touch"; }, true);

    const loop = () => { this.update(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  /* ---------------- Persistencia ---------------- */
  load() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
      if (!raw) return;
      for (const dev of Object.keys(DEFAULT_BINDINGS)) {
        for (const a of ACTIONS) if (Array.isArray(raw[dev]?.[a.id])) this.bindings[dev][a.id] = raw[dev][a.id].slice(0, 2);
      }
    } catch { /* sin almacenamiento */ }
  }
  save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(this.bindings)); } catch { /* ignorar */ }
  }
  resetDevice(device) {
    this.bindings[device] = clone(DEFAULT_BINDINGS[device]);
    this.save();
  }
  /** Asigna `code` al hueco `slot` (0/1) de la acción; quita ese código de otras acciones del mismo dispositivo. */
  rebind(device, action, slot, code) {
    const table = this.bindings[device];
    for (const a of ACTIONS) if (a.id !== action) table[a.id] = table[a.id].filter((c) => c !== code);
    const list = table[action].slice();
    if (slot < list.length) list[slot] = code; else list.push(code);
    table[action] = [...new Set(list)];
    this.save();
  }
  clearBinding(device, action, slot) {
    const list = this.bindings[device][action].slice();
    list.splice(slot, 1);
    this.bindings[device][action] = list;
    this.save();
  }

  /* ---------------- Consulta de acciones ---------------- */
  #codesDown(device, action, held) {
    return this.bindings[device][action].some((c) => held.has(c));
  }
  isDown(action) {
    if (this.virtual.has(action)) return true;
    if (this.#codesDown("keyboard", action, this.keysHeld)) return true;
    if (this.#codesDown("mouse", action, this.keysHeld)) return true;
    if (this.#codesDown("pad", action, this.padHeld)) return true;
    if (action === "menu" && (this.keysHeld.has("Escape") || this.padHeld.has(9))) return true;
    return false;
  }
  pressed(action) { return this.edge.has(action); }

  /** Vector de movimiento: digital (teclas, cruceta, táctil) o analógico (stick); `mag` en 0–1. */
  axis() {
    const dx = (this.isDown("right") ? 1 : 0) - (this.isDown("left") ? 1 : 0);
    const dy = (this.isDown("down") ? 1 : 0) - (this.isDown("up") ? 1 : 0);
    if (dx || dy) { const l = Math.hypot(dx, dy); return { x: dx / l, y: dy / l, mag: 1 }; }
    const a = this.virtualAxis.x || this.virtualAxis.y ? this.virtualAxis : this.padAxis;
    const m = Math.min(1, Math.hypot(a.x, a.y));
    return m > 0 ? { x: a.x / m, y: a.y / m, mag: m } : { x: 0, y: 0, mag: 0 };
  }
  anyMovement() { const a = this.axis(); return a.mag > 0; }

  /** Texto corto con la primera asignación de cada acción del dispositivo en uso. */
  label(action) {
    const dev = this.lastDevice === "pad" ? "pad" : this.lastDevice === "touch" ? "keyboard" : "keyboard";
    if (dev === "pad") return padLabel(this.bindings.pad[action][0]);
    const k = this.bindings.keyboard[action][0] || this.bindings.mouse[action][0];
    return keyLabel(k);
  }
  hintText() {
    const L = (a) => this.label(a);
    if (this.lastDevice === "touch") return "STICK MOVE · A PUNCH · B SPECIAL · DASH · ⏸ MENU";
    if (this.lastDevice === "pad") return `STICK MOVE · ${L("punch")} PUNCH · ${L("special")} SPECIAL · ${L("dash")} DASH · ${L("interact")} TALK · ${L("menu")} MENU`;
    return `${L("up")}${L("left")}${L("down")}${L("right")} MOVE · ${L("punch")} PUNCH · ${L("special")} SPECIAL · ${L("dash")} DASH · ${L("interact")} TALK · ESC MENU`;
  }

  /** Botones táctiles: mantienen / sueltan acciones virtuales. */
  setVirtual(action, down) {
    if (down) { if (!this.virtual.has(action)) this.latch.add(action); this.virtual.add(action); this.lastDevice = "touch"; }
    else this.virtual.delete(action);
  }
  setVirtualAxis(x, y) { this.virtualAxis = { x, y }; if (x || y) this.lastDevice = "touch"; }

  /** Vibración háptica (mando o móvil), si está activada. */
  rumble(ms = 120, strong = 0.6, weak = 0.3) {
    if (!this.settings.vibration) return;
    try {
      const pad = [...(navigator.getGamepads?.() || [])].find((p) => p && p.connected);
      const act = pad?.vibrationActuator;
      if (act && this.lastDevice === "pad") act.playEffect?.("dual-rumble", { duration: ms, strongMagnitude: strong, weakMagnitude: weak });
      else if (this.lastDevice === "touch") navigator.vibrate?.(Math.min(ms, 60));
    } catch { /* no soportado */ }
  }

  /* ---------------- Captura para reasignar botones ---------------- */
  /** Espera la siguiente tecla / clic / botón del mando. Resuelve con el código, "" (borrar) o null (cancelar). */
  capture(device) {
    return new Promise((resolve) => { this.capturing = { device, resolve }; });
  }
  cancelCapture() { if (this.capturing) { this.capturing.resolve(null); this.capturing = null; } }

  /* ---------------- Scopes de interfaz ---------------- */
  /**
   * Registra un overlay navegable. El scope superior recibe la navegación.
   * @param {{el:HTMLElement, onBack?:()=>void, onStart?:()=>void, onTab?:(d:number)=>void, onConfirm?:(el:Element)=>boolean|void}} scope
   * @returns {object} el mismo scope (para pasarlo a popScope)
   */
  pushScope(scope) {
    this.scopes.push(scope);
    scope.hover = (e) => {
      const b = e.target.closest?.(SEL);
      if (b && scope.el.contains(b) && !b.disabled && b !== document.activeElement && !b.matches("input, select")) b.focus({ preventScroll: true });
    };
    scope.el.addEventListener("mouseover", scope.hover);
    this.lastDevice = this.lastDevice === "touch" ? "touch" : this.lastDevice;
    return scope;
  }
  popScope(scope) {
    const i = this.scopes.indexOf(scope);
    if (i >= 0) { this.scopes.splice(i, 1); scope.el.removeEventListener("mouseover", scope.hover); }
  }
  get uiActive() { return this.scopes.length > 0; }
  get topScope() { return this.scopes[this.scopes.length - 1] || null; }

  focusFirst(scope = this.topScope) {
    const list = this.#focusables(scope);
    if (list.length && !list.includes(document.activeElement)) list[0].focus({ preventScroll: true });
  }

  #focusables(scope) {
    if (!scope) return [];
    return [...scope.el.querySelectorAll(SEL)].filter((e) => {
      if (e.disabled || e.getAttribute("aria-hidden") === "true") return false;
      const r = e.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return false;
      const cs = getComputedStyle(e);
      return cs.visibility !== "hidden" && cs.display !== "none" && cs.pointerEvents !== "none";
    });
  }

  /** Despacha un comando de interfaz: up/down/left/right/confirm/back/start/prevtab/nexttab. */
  ui(cmd, source = "keyboard") {
    this.dispatchEvent(new CustomEvent("ui", { detail: { cmd, source } }));
    const scope = this.topScope;
    if (!scope) return false;
    if (cmd === "back") { scope.onBack?.(); return true; }
    if (cmd === "start") { (scope.onStart || scope.onBack)?.(); return true; }
    if (cmd === "prevtab" || cmd === "nexttab") { scope.onTab?.(cmd === "prevtab" ? -1 : 1); return true; }
    if (cmd === "confirm" && scope.onConfirm?.(document.activeElement) === true) return true;
    const list = this.#focusables(scope);
    let active = document.activeElement;
    if (!list.includes(active)) {
      if (list.length) list[0].focus({ preventScroll: true });
      return true;
    }
    if (cmd === "confirm") {
      if (active.matches('input[type="range"]')) return true;
      if (active.matches("select")) return true;
      active.click();
      return true;
    }
    // Elementos con navegación propia (fichas del puzle): la flecha se les reenvía como tecla
    if (active.matches("[data-nav-native]") && (cmd === "left" || cmd === "right")) {
      active.dispatchEvent(new KeyboardEvent("keydown", { key: cmd === "left" ? "ArrowLeft" : "ArrowRight", code: cmd === "left" ? "ArrowLeft" : "ArrowRight", bubbles: true, cancelable: true }));
      return true;
    }
    if (active.matches("[data-cycle]") && (cmd === "left" || cmd === "right")) {
      active.dispatchEvent(new CustomEvent("cycle", { detail: { dir: cmd === "left" ? -1 : 1 } }));
      return true;
    }
    if (active.matches('input[type="range"]') && (cmd === "left" || cmd === "right")) {
      const step = Number(active.step) || (Number(active.max) - Number(active.min)) / 20 || 1;
      active.value = String(Math.max(Number(active.min), Math.min(Number(active.max), Number(active.value) + (cmd === "right" ? step : -step))));
      active.dispatchEvent(new Event("input", { bubbles: true }));
      active.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
    if (active.matches("select") && (cmd === "left" || cmd === "right")) {
      const n = active.options.length;
      active.selectedIndex = (active.selectedIndex + (cmd === "right" ? 1 : -1) + n) % n;
      active.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
    const next = this.#spatial(active, list, cmd);
    if (next) next.focus({ preventScroll: true });
    return true;
  }

  #spatial(active, list, dir) {
    const r0 = active.getBoundingClientRect();
    const c0 = { x: r0.left + r0.width / 2, y: r0.top + r0.height / 2 };
    let best = null, bestCost = Infinity;
    for (const el of list) {
      if (el === active) continue;
      const r = el.getBoundingClientRect();
      const dx = r.left + r.width / 2 - c0.x, dy = r.top + r.height / 2 - c0.y;
      let main, cross, overlap;
      if (dir === "down") { main = dy; cross = Math.abs(dx); overlap = Math.min(r.right, r0.right) - Math.max(r.left, r0.left) > 4; if (r.top + 2 < r0.bottom && dy < r0.height * 0.5) continue; }
      else if (dir === "up") { main = -dy; cross = Math.abs(dx); overlap = Math.min(r.right, r0.right) - Math.max(r.left, r0.left) > 4; if (r.bottom - 2 > r0.top && -dy < r0.height * 0.5) continue; }
      else if (dir === "right") { main = dx; cross = Math.abs(dy); overlap = Math.min(r.bottom, r0.bottom) - Math.max(r.top, r0.top) > 4; if (r.left + 2 < r0.right && dx < r0.width * 0.5) continue; }
      else { main = -dx; cross = Math.abs(dy); overlap = Math.min(r.bottom, r0.bottom) - Math.max(r.top, r0.top) > 4; if (r.right - 2 > r0.left && -dx < r0.width * 0.5) continue; }
      if (main <= 1) continue;
      // Los elementos que se solapan en el eje transversal (misma fila / misma columna) tienen prioridad
      const cost = overlap ? main : main + cross * 2.6 + 60;
      if (cost < bestCost) { bestCost = cost; best = el; }
    }
    if (best) return best;
    // Sin candidato: envolver en vertical (primero/último), nada en horizontal
    if (dir === "down" || dir === "up") {
      const sorted = list.slice().sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
      return dir === "down" ? sorted[0] : sorted[sorted.length - 1];
    }
    return null;
  }

  /* ---------------- Eventos de entrada ---------------- */
  #isTyping(e) {
    const t = e.target;
    return t && (t.tagName === "TEXTAREA" || (t.tagName === "INPUT" && !["range", "checkbox", "button", "radio"].includes(t.type)));
  }

  #onKeyDown(e) {
    if (!e.isTrusted) return;                       // eventos sintéticos (p. ej. flechas reenviadas a las fichas del puzle)
    if (this.capturing && this.capturing.device !== "pad") {
      if (this.capturing.device === "keyboard") {
        e.preventDefault(); e.stopImmediatePropagation();
        if (e.repeat) return;
        const c = this.capturing; this.capturing = null;
        c.resolve(e.code === "Escape" ? null : e.code === "Backspace" ? "" : e.code);
      } else if (this.capturing.device === "mouse" && e.code === "Escape") {
        e.preventDefault(); e.stopImmediatePropagation();
        const c = this.capturing; this.capturing = null; c.resolve(null);
      }
      return;
    }
    if (this.#isTyping(e)) return;
    this.lastDevice = "keyboard";
    this.keysHeld.add(e.code);
    if (!e.repeat && !this.scopes.length) {      // con un menú abierto, las teclas no son acciones de juego
      for (const a of ACTIONS) if (this.bindings.keyboard[a.id].includes(e.code)) this.latch.add(a.id);
      if (e.code === "Escape") this.latch.add("menu");
    }

    // Navegación de menús (solo si hay un overlay activo)
    if (this.scopes.length) {
      const cmd = this.topScope.keyMap?.[e.code] ?? UI_KEYS[e.code];
      if (cmd) {
        const active = document.activeElement;
        // las fichas arrastrables del puzle gestionan sus propias flechas con su listener
        if (active?.matches?.("[data-nav-native]") && (cmd === "left" || cmd === "right") && e.code.startsWith("Arrow")) return;
        e.preventDefault(); e.stopImmediatePropagation();
        if (e.repeat && cmd === "confirm") return;
        if (e.repeat && (cmd === "back")) return;
        this.ui(cmd, "keyboard");
      }
    }
  }

  #onKeyUp(e) {
    this.keysHeld.delete(e.code);
  }

  #onMouseDown(e) {
    if (this.capturing?.device === "mouse") {
      e.preventDefault(); e.stopImmediatePropagation();
      const c = this.capturing; this.capturing = null;
      c.resolve("Mouse" + e.button);
      return;
    }
    if (this.pointerType === "touch") return;               // los toques generan un mousedown de compatibilidad: no es el ratón
    // Solo cuenta como entrada de juego si se pulsa sobre el mundo (no sobre la interfaz)
    const inWorld = e.target.id === "game" || e.target === document.body || e.target.id === "game-root" || e.target.id === "vignette";
    if (!inWorld || this.scopes.length) return;
    this.lastDevice = "keyboard";
    const code = "Mouse" + e.button;
    this.keysHeld.add(code);
    for (const a of ACTIONS) if (this.bindings.mouse[a.id].includes(code)) this.latch.add(a.id);
    if (e.button === 1) e.preventDefault();
  }

  /* ---------------- Sondeo del mando (1 vez por frame) ---------------- */
  #pollPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = [...pads].find((p) => p && p.connected);
    this.padPrev = this.padHeld;
    this.padHeld = new Set();
    this.padAxis = { x: 0, y: 0 };
    if (!pad) { this.padConnected = false; return null; }
    if (!this.padConnected) { this.padConnected = true; this.padId = pad.id; }
    pad.buttons.forEach((b, i) => { if (b.pressed || b.value > 0.55) this.padHeld.add(i); });
    const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
    const m = Math.hypot(ax, ay), dz = this.settings.deadzone;
    if (m > dz) {
      const k = (m - dz) / (1 - dz) / m;
      this.padAxis = { x: ax * k, y: ay * k };
    }
    return pad;
  }

  update() {
    this.frame++;
    const uiWas = this.scopes.length > 0;
    const pad = this.#pollPad();
    this.edge = new Set(this.latch);
    this.latch.clear();

    // Reasignación de botones del mando
    if (this.capturing?.device === "pad") {
      for (const b of this.padHeld) {
        if (!this.padPrev.has(b)) {
          const c = this.capturing; this.capturing = null;
          c.resolve(b);
          this.padPrev = new Set(this.padHeld);
          return;
        }
      }
      return;
    }

    if (pad) {
      for (const b of this.padHeld) {
        if (this.padPrev.has(b)) continue;
        this.lastDevice = "pad";
        if (uiWas) continue;                       // con un menú abierto, el mando solo navega
        for (const a of ACTIONS) if (this.bindings.pad[a.id].includes(b)) this.edge.add(a.id);
        if (b === 9) this.edge.add("menu");
      }
      if (this.padAxis.x || this.padAxis.y) this.lastDevice = "pad";
    }

    // Comandos de interfaz del mando (con repetición al mantener)
    if (pad) {
      const dirNow = this.#padDir();
      const U = this.uiRepeat;
      if (dirNow !== U.dir) { U.dir = dirNow; U.t = 0; U.n = 0; if (dirNow) this.ui(dirNow, "pad"); }
      else if (dirNow) {
        U.t += 1 / 60;
        const wait = U.n === 0 ? 0.38 : 0.11;
        if (U.t >= wait) { U.t = 0; U.n++; this.ui(dirNow, "pad"); }
      }
      const newly = (b) => this.padHeld.has(b) && !this.padPrev.has(b);
      if (newly(0)) this.ui("confirm", "pad");
      if (newly(1)) this.ui("back", "pad");
      if (newly(9)) this.ui("start", "pad");
      if (newly(4)) this.ui("prevtab", "pad");
      if (newly(5)) this.ui("nexttab", "pad");
    }
  }

  #padDir() {
    const h = this.padHeld, a = this.padAxis;
    if (h.has(12)) return "up";
    if (h.has(13)) return "down";
    if (h.has(14)) return "left";
    if (h.has(15)) return "right";
    const m = Math.hypot(a.x, a.y);
    if (m > 0.55) return Math.abs(a.x) > Math.abs(a.y) ? (a.x > 0 ? "right" : "left") : (a.y > 0 ? "down" : "up");
    return null;
  }
}

export const controls = new Controls();
