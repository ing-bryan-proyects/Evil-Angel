import { SHOP_ITEMS } from "../world/Shop.js";

/**
 * GameMenu · menú de Start (en partida) y ajustes (pantalla de inicio)
 * -------------------------------------------------------------------
 * Vistas:  main · inventory · settings · save · load
 *   - Inventario: usar Pociones de vida / Tónicos de maná / Elixires.
 *   - Ajustes: volumen de música y de efectos (se guardan en localStorage).
 *   - Guardar / Cargar: tres ranuras con resumen (zona, LP, oro, fecha).
 *
 * Navegación: ratón, Tab / Enter, Esc para volver o cerrar.
 */

const CSS = `
#game-menu { position: fixed; inset: 0; z-index: 37; display: none; align-items: center; justify-content: center;
  background: rgba(4, 2, 10, 0.72); padding: 16px; font-family: "Pixelify Sans", monospace; }
#game-menu.show { display: flex; }
#game-menu .gm-card { width: min(520px, 100%); background: rgba(10, 6, 18, 0.96); border: 3px solid #e3b341;
  box-shadow: 0 0 0 3px #000, 0 0 40px rgba(227, 179, 65, 0.35); padding: 22px; color: #fbe7a1; }
#game-menu h2 { font-family: "Press Start 2P", monospace; font-size: 14px; letter-spacing: .14em; margin: 0 0 6px;
  text-shadow: 0 0 10px rgba(227, 179, 65, .55); }
#game-menu .gm-sub { color: #a8935c; font-size: 15px; margin-bottom: 16px; }
#game-menu .gm-list { display: grid; gap: 10px; }
#game-menu button { font-family: "Press Start 2P", monospace; font-size: 11px; letter-spacing: .08em; color: #fbe7a1;
  background: #1c1408; border: 2px solid #e3b341; padding: 13px 14px; cursor: pointer; text-align: left; }
#game-menu button:hover:not(:disabled), #game-menu button:focus-visible { background: #e3b341; color: #1a1200; outline: none; }
#game-menu button:disabled { opacity: .4; cursor: default; }
#game-menu .gm-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
#game-menu .gm-stats div { border: 1px dashed rgba(156, 116, 22, .6); padding: 8px 6px; font-size: 13px; color: #a8935c; text-align: center; }
#game-menu .gm-stats b { display: block; font-family: "Press Start 2P", monospace; font-size: 11px; color: #fbe7a1; margin-bottom: 4px; }
#game-menu .gm-row { display: grid; grid-template-columns: 1fr auto auto; gap: 12px; align-items: center;
  border: 2px solid #9c7416; padding: 10px 12px; background: #140e08; }
#game-menu .gm-row small { display: block; color: #a8935c; font-size: 13px; }
#game-menu .gm-row .n { font-family: "Press Start 2P", monospace; font-size: 10px; color: #a8935c; }
#game-menu label { display: grid; gap: 6px; font-size: 16px; }
#game-menu input[type=range] { width: 100%; accent-color: #e3b341; }
#game-menu .gm-msg { min-height: 1.3em; margin-top: 12px; color: #9dffcf; font-size: 15px; }
#game-menu .gm-back { margin-top: 16px; }
`;

const fmtDate = (ms) => new Date(ms).toLocaleString();

export class GameMenu {
  /**
   * @param {object} hooks
   * @param {() => object} hooks.getState         { hp, maxHp, mp, maxMp, gold, lp, inventory, zone }
   * @param {(id:string) => string} hooks.useItem  Devuelve un mensaje para mostrar.
   * @param {() => {music:number, sfx:number}} hooks.getSettings
   * @param {(key:string, value:number) => void} hooks.setSetting
   * @param {(slot:number) => boolean} hooks.save
   * @param {(slot:number) => boolean} hooks.load
   * @param {() => {slot:number, data:object|null}[]} hooks.listSlots
   * @param {() => void} hooks.onClose
   * @param {() => void} [hooks.onQuit]
   * @param {() => void} [hooks.onSound]
   */
  constructor(hooks) {
    this.hooks = hooks;
    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);
    this.el = document.createElement("div");
    this.el.id = "game-menu";
    this.el.setAttribute("role", "dialog");
    this.el.setAttribute("aria-modal", "true");
    document.body.appendChild(this.el);
    this.isOpen = false;
    this.view = "main";
    this.standalone = false; // true: solo ajustes / carga desde la pantalla de inicio
    window.addEventListener("keydown", (e) => {
      if (!this.isOpen || e.code !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (this.view === "main" || this.standalone) this.close(); else this.show("main");
    }, true);
  }

  /** Abre el menú completo (en partida). */
  open() {
    this.standalone = false;
    this.isOpen = true;
    this.el.classList.add("show");
    this.show("main");
  }

  /** Abre una sola vista (ajustes o carga) desde la pantalla de inicio. */
  openStandalone(view) {
    this.standalone = true;
    this.isOpen = true;
    this.el.classList.add("show");
    this.show(view);
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.el.classList.remove("show");
    this.hooks.onClose?.(this.standalone);
  }

  toggle() {
    if (this.isOpen) this.close(); else this.open();
  }

  show(view, msg = "") {
    this.view = view;
    const s = this.hooks.getState?.() || {};
    const back = this.standalone ? `<button class="gm-back" data-close>CLOSE</button>` : `<button class="gm-back" data-view="main">BACK</button>`;
    let html = "";

    if (view === "main") {
      html = `<h2>✦ MENU</h2><div class="gm-sub">${s.zone || ""}</div>
        <div class="gm-stats">
          <div><b>${s.hp}/${s.maxHp}</b>HP</div><div><b>${s.mp}/${s.maxMp}</b>MP</div>
          <div><b>${s.gold}</b>Gold · Oro</div><div><b>${s.lp}</b>LP</div>
        </div>
        <div class="gm-list">
          <button data-close>RESUME · CONTINUAR</button>
          <button data-view="inventory">INVENTORY · INVENTARIO</button>
          <button data-view="settings">SETTINGS · AJUSTES</button>
          <button data-view="save">SAVE · GUARDAR</button>
          <button data-view="load">LOAD · CARGAR</button>
          ${this.hooks.onQuit ? `<button data-quit>QUIT TO TITLE · SALIR</button>` : ""}
        </div>`;
    } else if (view === "inventory") {
      const inv = s.inventory || {};
      html = `<h2>✦ INVENTORY</h2><div class="gm-sub">Inventario · usa tus consumibles</div>
        <div class="gm-list">${Object.values(SHOP_ITEMS).map((it) => `
          <div class="gm-row"><span>${it.name}<small>${it.nameEs} · ${[it.hp ? `+${it.hp} HP` : "", it.mp ? `+${it.mp} MP` : ""].filter(Boolean).join(" · ")}</small></span>
          <span class="n">×${inv[it.id] || 0}</span>
          <button data-use="${it.id}" ${(inv[it.id] || 0) < 1 ? "disabled" : ""}>USE</button></div>`).join("")}
        </div><div class="gm-msg">${msg}</div>${back}`;
    } else if (view === "settings") {
      const st = this.hooks.getSettings();
      html = `<h2>✦ SETTINGS</h2><div class="gm-sub">Ajustes de audio · música gótica procedural</div>
        <div class="gm-list">
          <label>Music · Música <input type="range" id="gm-music" min="0" max="100" value="${Math.round(st.music * 100)}"></label>
          <label>Effects · Efectos <input type="range" id="gm-sfx" min="0" max="100" value="${Math.round(st.sfx * 100)}"></label>
        </div>${back}`;
    } else if (view === "save" || view === "load") {
      const slots = this.hooks.listSlots();
      html = `<h2>✦ ${view === "save" ? "SAVE GAME" : "LOAD GAME"}</h2>
        <div class="gm-sub">${view === "save" ? "Guardar partida" : "Cargar partida"} · 3 ranuras</div>
        <div class="gm-list">${slots.map(({ slot, data }) => `
          <div class="gm-row"><span>SLOT ${slot}<small>${data ? `${data.zone} · LP ${data.stats.lp} · ◆ ${data.stats.gold} · ${fmtDate(data.savedAt)}` : "— vacía · empty —"}</small></span>
          <span></span>
          <button data-slot="${slot}" ${view === "load" && !data ? "disabled" : ""}>${view === "save" ? "SAVE" : "LOAD"}</button></div>`).join("")}
        </div><div class="gm-msg">${msg}</div>${back}`;
    }

    this.el.innerHTML = `<div class="gm-card">${html}</div>`;
    this.#wire(view);
    setTimeout(() => this.el.querySelector("button:not(:disabled), input")?.focus(), 30);
  }

  #wire(view) {
    const q = (sel) => this.el.querySelectorAll(sel);
    q("[data-close]").forEach((b) => b.addEventListener("click", () => this.close()));
    q("[data-view]").forEach((b) => b.addEventListener("click", () => { this.hooks.onSound?.(); this.show(b.dataset.view); }));
    q("[data-quit]").forEach((b) => b.addEventListener("click", () => { this.close(); this.hooks.onQuit(); }));
    q("[data-use]").forEach((b) => b.addEventListener("click", () => this.show("inventory", this.hooks.useItem(b.dataset.use))));
    q("[data-slot]").forEach((b) => b.addEventListener("click", () => {
      const slot = +b.dataset.slot;
      if (view === "save") {
        this.show("save", this.hooks.save(slot) ? `✔ Saved in slot ${slot} · Guardado` : "✖ Storage unavailable · Sin almacenamiento");
      } else if (this.hooks.load(slot)) {
        this.close();
      } else {
        this.show("load", "✖ Could not load · No se pudo cargar");
      }
    }));
    const music = this.el.querySelector("#gm-music"), sfx = this.el.querySelector("#gm-sfx");
    music?.addEventListener("input", () => this.hooks.setSetting("music", music.value / 100));
    sfx?.addEventListener("input", () => this.hooks.setSetting("sfx", sfx.value / 100));
    sfx?.addEventListener("change", () => this.hooks.onSound?.());
  }
}
