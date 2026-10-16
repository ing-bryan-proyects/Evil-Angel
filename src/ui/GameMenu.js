import { SHOP_ITEMS } from "../world/Shop.js";
import { EQUIPMENT, RARITIES, SLOTS, drawEquipIcon, bonusText } from "../rpg/Equipment.js";
import { controls, ACTIONS, keyLabel, padLabel, DEFAULT_BINDINGS } from "../core/Controls.js";
import { ATLAS } from "../graphics/Atlas.js";
import { STATS, SPECIALS, RACES, MAX_SPECIAL_LEVEL, specialCap, upgradeCost, xpToNext, allyName } from "../rpg/Progression.js";

/**
 * GameMenu · menú de pausa (en partida) y ajustes (pantalla de inicio)
 * -------------------------------------------------------------------
 * Diseño gótico en dos columnas: a la izquierda la ficha de Abel (retrato animado, nivel, barras)
 * y la navegación; a la derecha el panel de la vista activa.
 *
 *   STATUS    nivel, experiencia, raza y estadísticas: reparte los puntos a tu gusto
 *   SKILLS    ataques especiales: nivel de cada uno, mejora con Puntos de Habilidad (tope por nivel)
 *   PARTY     aliados que se han unido, su vínculo y sus ataques de asistencia
 *   BAG       inventario: usar consumibles
 *   SETTINGS  AUDIO · GAME · DISPLAY · KEYBOARD · MOUSE · GAMEPAD (botones personalizables)
 *   CONTROLS  controles actuales · SAVE / LOAD · QUIT
 *
 * Todo se maneja con ratón, teclado (flechas/WASD + Enter/Esc), mando (cruceta/stick, A/B, LB/RB) o toque.
 */

const CSS = `
#game-menu { position: fixed; inset: 0; z-index: 37; display: none; align-items: center; justify-content: center;
  background: radial-gradient(ellipse at 50% 40%, rgba(40, 20, 70, .55), rgba(4, 2, 10, .92) 70%); padding: 12px; font-family: "Pixelify Sans", monospace; }
#game-menu.show { display: flex; }
#game-menu .gm-shell { width: min(960px, 100%); max-height: calc(100dvh - 24px); display: grid; grid-template-columns: 270px 1fr; gap: 0;
  background: linear-gradient(180deg, rgba(16, 9, 28, .98), rgba(8, 5, 16, .98)); border: 3px solid #e3b341;
  box-shadow: 0 0 0 3px #000, 0 0 0 6px #5a4410, 0 0 60px rgba(227, 179, 65, .28), inset 0 0 60px rgba(90, 40, 140, .18); position: relative; color: #fbe7a1; }
#game-menu .gm-shell::before, #game-menu .gm-shell::after { content: "✦"; position: absolute; top: -13px; font-size: 18px; color: #e3b341; text-shadow: 0 0 10px #e3b341; }
#game-menu .gm-shell::before { left: 14px; } #game-menu .gm-shell::after { right: 14px; }
#game-menu.solo .gm-shell { grid-template-columns: 1fr; width: min(680px, 100%); }
#game-menu.solo .gm-side { display: none; }
#game-menu .gm-side { border-right: 3px solid #5a4410; padding: 16px 14px; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; background: linear-gradient(180deg, rgba(60, 30, 100, .16), transparent 55%); }
#game-menu .gm-hero { text-align: center; }
#game-menu .gm-portrait { width: 132px; height: 132px; margin: 0 auto 8px; border: 3px solid #e3b341; background: radial-gradient(circle at 50% 70%, #3a2466, #120a22 75%); box-shadow: 0 0 0 3px #000, 0 0 22px rgba(138, 77, 255, .4); image-rendering: pixelated; display: block; }
#game-menu .gm-name { font-family: "Press Start 2P", monospace; font-size: 13px; letter-spacing: .14em; text-shadow: 0 0 10px rgba(227, 179, 65, .6); }
#game-menu .gm-title { color: #a8935c; font-size: 14px; margin-top: 4px; }
#game-menu .gm-bars { display: grid; gap: 5px; margin-top: 10px; font-family: "Press Start 2P", monospace; font-size: 7px; letter-spacing: .08em; text-align: left; }
#game-menu .gm-bar { position: relative; height: 13px; background: #140c10; border: 2px solid #000; box-shadow: 0 0 0 1px #9c7416; overflow: hidden; }
#game-menu .gm-bar i { position: absolute; inset: 0 auto 0 0; }
#game-menu .gm-bar span { position: relative; padding-left: 5px; line-height: 9px; color: #fff; text-shadow: 1px 1px 0 #000; }
#game-menu .gm-bar.hp i { background: linear-gradient(180deg, #ff8a9a, #d42a4a 60%, #8a1028); }
#game-menu .gm-bar.mp i { background: linear-gradient(180deg, #9ac8ff, #3a7ae0 60%, #1a3a8a); }
#game-menu .gm-bar.xp i { background: linear-gradient(90deg, #9dffcf, #fbe7a1); }
#game-menu .gm-chips { display: flex; gap: 6px; margin-top: 8px; font-family: "Press Start 2P", monospace; font-size: 8px; }
#game-menu .gm-chips span { flex: 1; border: 1px dashed rgba(156, 116, 22, .7); padding: 6px 4px; text-align: center; }
#game-menu .gm-nav { display: grid; gap: 6px; margin-top: 4px; }
#game-menu .gm-main { padding: 18px 20px; overflow-y: auto; min-height: 420px; }
#game-menu h2 { font-family: "Press Start 2P", monospace; font-size: 14px; letter-spacing: .14em; margin: 0 0 4px; text-shadow: 0 0 10px rgba(227, 179, 65, .55); }
#game-menu .gm-sub { color: #a8935c; font-size: 15px; margin-bottom: 14px; }
#game-menu .gm-list { display: grid; gap: 8px; }
#game-menu button { font-family: "Press Start 2P", monospace; font-size: 10px; letter-spacing: .06em; color: #fbe7a1;
  background: #1c1408; border: 2px solid #e3b341; padding: 11px 12px; cursor: pointer; text-align: left; transition: background .12s, transform .1s; }
#game-menu button:hover:not(:disabled), #game-menu button:focus-visible, #game-menu button:focus { background: #e3b341; color: #1a1200; outline: none; transform: translateX(3px); }
#game-menu button:disabled { opacity: .4; cursor: default; }
#game-menu .gm-nav button { display: flex; align-items: center; gap: 10px; font-size: 9px; padding: 9px 10px; }
#game-menu .gm-nav button b { width: 16px; text-align: center; font-size: 11px; font-weight: normal; }
#game-menu .gm-nav button.cur { background: #3a2a08; border-color: #fbe7a1; box-shadow: inset 0 0 14px rgba(227, 179, 65, .35); }
#game-menu .gm-nav button.cur:focus, #game-menu .gm-nav button.cur:hover { background: #e3b341; }
#game-menu .gm-row { display: grid; grid-template-columns: 1fr auto auto; gap: 10px; align-items: center; border: 2px solid #9c7416; padding: 8px 10px; background: #140e08; }
#game-menu .gm-row small { display: block; color: #a8935c; font-size: 13px; font-family: "Pixelify Sans", monospace; letter-spacing: 0; margin-top: 2px; }
#game-menu .gm-row .n { font-family: "Press Start 2P", monospace; font-size: 10px; color: #a8935c; }
#game-menu .gm-sub2 { font-family: "Press Start 2P", monospace; font-size: 10px; color: #9dffcf; letter-spacing: .08em; margin: 14px 0 8px; }
#game-menu .gm-row.eqslot { grid-template-columns: 22px 1fr auto; }
#game-menu .gm-row canvas.eq-ic { width: 18px; height: 18px; image-rendering: pixelated; }
#game-menu .gm-row:has(canvas.eq-ic) { grid-template-columns: 22px 1fr auto; }
#game-menu .gm-tabs { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
#game-menu .gm-tabs button { padding: 9px 10px; font-size: 9px; text-align: center; }
#game-menu .gm-tabs button.cur { background: #e3b341; color: #1a1200; }
#game-menu label.gm-slider { display: grid; grid-template-columns: 1fr 52px; gap: 6px 10px; font-size: 16px; border: 2px solid #9c7416; padding: 8px 10px; background: #140e08; }
#game-menu label.gm-slider input { grid-column: 1 / -1; width: 100%; accent-color: #e3b341; height: 22px; }
#game-menu label.gm-slider output { font-family: "Press Start 2P", monospace; font-size: 10px; text-align: right; color: #fbe7a1; }
#game-menu input[type=range]:focus { outline: 2px solid #fbe7a1; outline-offset: 2px; }
#game-menu .gm-opt { display: grid; grid-template-columns: 1fr auto; gap: 10px; align-items: center; border: 2px solid #9c7416; padding: 8px 10px; background: #140e08; font-size: 16px; }
#game-menu .gm-opt small { display: block; color: #a8935c; font-size: 13px; }
#game-menu .gm-opt button { min-width: 112px; text-align: center; }
#game-menu .gm-bind { display: grid; grid-template-columns: 1fr 118px 118px; gap: 8px; align-items: center; border: 2px solid #5a4410; padding: 6px 8px; background: #140e08; font-size: 16px; }
#game-menu .gm-bind small { display: block; color: #a8935c; font-size: 13px; }
#game-menu .gm-bind button { text-align: center; padding: 10px 6px; font-size: 9px; }
#game-menu .gm-bind button.capturing { background: #7a3cff; color: #fff; border-color: #d9b3ff; animation: gmblink .6s steps(2) infinite; }
@keyframes gmblink { 50% { opacity: .55; } }
#game-menu .gm-note { color: #a8935c; font-size: 14px; margin: 4px 0 10px; line-height: 1.35; }
#game-menu .gm-pad { display: inline-block; padding: 3px 8px; border: 1px solid #9c7416; margin-bottom: 8px; font-size: 13px; }
#game-menu .gm-pad.ok { color: #9dffcf; border-color: #4fbf8c; }
#game-menu .gm-msg { min-height: 1.3em; margin-top: 10px; color: #9dffcf; font-size: 15px; }
#game-menu .gm-back { margin-top: 14px; }
#game-menu .gm-foot { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px; }
#game-menu .gm-help { display: grid; grid-template-columns: auto 1fr; gap: 6px 14px; font-size: 16px; }
#game-menu .gm-help b { font-family: "Press Start 2P", monospace; font-size: 9px; color: #fbe7a1; font-weight: normal; }
/* STATUS */
#game-menu .gm-stat { display: grid; grid-template-columns: 54px 1fr 34px 40px; gap: 10px; align-items: center; border: 2px solid #5a4410; padding: 6px 10px; background: #140e08; }
#game-menu .gm-stat b { font-family: "Press Start 2P", monospace; font-size: 10px; font-weight: normal; color: #ffd86a; }
#game-menu .gm-stat span.d { font-size: 14px; color: #a8935c; line-height: 1.15; }
#game-menu .gm-stat em { font-style: normal; font-family: "Press Start 2P", monospace; font-size: 12px; text-align: right; }
#game-menu .gm-stat button { padding: 7px 0; text-align: center; font-size: 12px; }
#game-menu .gm-lvl { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; font-family: "Press Start 2P", monospace; font-size: 11px; }
#game-menu .gm-lvl .big { font-size: 22px; color: #fff6d0; text-shadow: 0 0 12px rgba(227, 179, 65, .7); }
#game-menu .gm-pts { color: #9dffcf; font-family: "Press Start 2P", monospace; font-size: 10px; margin: 6px 0 10px; animation: gmblink 1.2s steps(2) infinite; }
#game-menu .gm-derived { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 12px; }
#game-menu .gm-derived div { border: 1px dashed rgba(156, 116, 22, .7); padding: 7px 4px; text-align: center; font-size: 13px; color: #a8935c; }
#game-menu .gm-derived b { display: block; font-family: "Press Start 2P", monospace; font-size: 10px; color: #fbe7a1; margin-bottom: 4px; font-weight: normal; }
/* LEVELS */
#game-menu .gm-lvhead { margin: 14px 0 6px; font-family: "Press Start 2P", monospace; font-size: 10px; color: #ffd86a; letter-spacing: .08em; }
#game-menu .gm-lvhead span { color: #9dffcf; margin-left: 8px; }
/* SKILLS / PARTY */
#game-menu .gm-skill { display: grid; grid-template-columns: 8px 1fr auto; gap: 12px; align-items: center; border: 2px solid #9c7416; padding: 9px 12px; background: #140e08; }
#game-menu .gm-skill i { width: 8px; align-self: stretch; }
#game-menu .gm-skill b { display: block; font-family: "Press Start 2P", monospace; font-size: 10px; font-weight: normal; letter-spacing: .06em; }
#game-menu .gm-skill small { display: block; color: #a8935c; font-size: 14px; margin-top: 3px; font-family: "Pixelify Sans", monospace; letter-spacing: 0; }
#game-menu .gm-skill .pips { color: #ffd86a; letter-spacing: 2px; font-size: 12px; margin-top: 4px; }
#game-menu .gm-skill.locked { opacity: .5; border-style: dashed; }
#game-menu .gm-skill button { padding: 9px 10px; text-align: center; min-width: 118px; }
#game-menu .gm-cap { margin-bottom: 10px; color: #9ad0ff; font-size: 14px; }
#game-menu .gm-ally { display: grid; grid-template-columns: 52px 1fr; gap: 12px; border: 2px solid #9c7416; padding: 8px 10px; background: #140e08; align-items: center; }
#game-menu .gm-ally canvas { width: 52px; height: 52px; image-rendering: pixelated; background: radial-gradient(circle at 50% 70%, #3a2466, #120a22 80%); border: 2px solid #5a4410; }
#game-menu .gm-ally.off { opacity: .45; }
@media (max-width: 760px) {
  #game-menu .gm-shell { grid-template-columns: 1fr; overflow-y: auto; }
  #game-menu .gm-side { border-right: 0; border-bottom: 3px solid #5a4410; flex-direction: row; flex-wrap: wrap; }
  #game-menu .gm-hero { flex: 1 1 100%; display: grid; grid-template-columns: 96px 1fr; gap: 10px; text-align: left; align-items: center; }
  #game-menu .gm-portrait { width: 96px; height: 96px; margin: 0; }
  #game-menu .gm-nav { grid-template-columns: repeat(3, 1fr); width: 100%; }
  #game-menu .gm-bind { grid-template-columns: 1fr 88px 88px; }
  #game-menu .gm-derived { grid-template-columns: repeat(2, 1fr); }
}
`;

const TABS = [["audio", "AUDIO"], ["game", "GAME"], ["display", "DISPLAY"], ["keyboard", "KEYBOARD"], ["mouse", "MOUSE"], ["pad", "GAMEPAD"]];
const NAV = [
  ["status", "STATUS", "ESTADO", "★"], ["skills", "SKILLS", "HABILIDADES", "⚔"], ["party", "PARTY", "GRUPO", "♥"], ["levels", "LEVELS", "NIVELES", "▦"], ["inventory", "BAG", "OBJETOS", "◆"],
  ["settings", "SETTINGS", "AJUSTES", "⚙"], ["help", "CONTROLS", "CONTROLES", "⌨"], ["save", "SAVE", "GUARDAR", "▼"], ["load", "LOAD", "CARGAR", "▲"],
];
const CYCLES = { difficulty: ["easy", "normal", "hard"], particles: ["low", "medium", "high"], touch: ["auto", "on", "off"] };
const fmtDate = (ms) => new Date(ms).toLocaleString();
const pct = (v) => Math.round(v * 100);
const ALLY_ORDER = ["aria", "benny", "mileva", "chloe", "arc"];

export class GameMenu {
  /**
   * @param {object} hooks
   * @param {() => object} hooks.getState       { hp, maxHp, mp, maxMp, gold, lp, inventory, zone }
   * @param {() => import("../rpg/Progression.js").Progression} hooks.getProg
   * @param {(id:string) => string} hooks.useItem
   * @param {() => object} hooks.getSettings
   * @param {(key:string, value:any) => void} hooks.setSetting
   * @param {(slot:number) => boolean} hooks.save
   * @param {(slot:number) => boolean} hooks.load
   * @param {() => {slot:number, data:object|null}[]} hooks.listSlots
   * @param {() => void} hooks.onClose  @param {() => void} [hooks.onQuit]  @param {() => void} [hooks.onSound]  @param {() => void} [hooks.onFullscreen]
   * @param {() => void} [hooks.onChange]       tras repartir puntos o mejorar (refresca el HUD)
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
    this.view = "status";
    this.tab = "audio";
    this.standalone = false;
    this.scope = null;
    this.portraitTimer = null;
  }

  #enter() {
    this.isOpen = true;
    this.el.classList.add("show");
    this.el.classList.toggle("solo", this.standalone);
    if (!this.scope) {
      this.scope = controls.pushScope({
        el: this.el,
        onBack: () => this.back(),
        onStart: () => { if (controls.capturing) controls.cancelCapture(); else this.close(); },
        onTab: (d) => {
          if (this.view === "settings") this.setTab(TABS[(TABS.findIndex(([k]) => k === this.tab) + d + TABS.length) % TABS.length][0]);
          else if (!this.standalone) { const i = NAV.findIndex(([k]) => k === this.view); this.show(NAV[(i + d + NAV.length) % NAV.length][0]); }
        },
      });
    }
  }

  back() {
    if (controls.capturing) { controls.cancelCapture(); return; }
    this.close();
  }

  /** Abre el menú completo (en partida). */
  open(view = "status") {
    this.standalone = false;
    this.#enter();
    this.show(view);
  }
  /** Abre una sola vista (ajustes o carga) desde la pantalla de inicio. */
  openStandalone(view) {
    this.standalone = true;
    this.#enter();
    this.show(view);
  }
  close() {
    if (!this.isOpen) return;
    controls.cancelCapture();
    clearInterval(this.portraitTimer);
    this.isOpen = false;
    this.el.classList.remove("show");
    if (this.scope) { controls.popScope(this.scope); this.scope = null; }
    this.hooks.onClose?.(this.standalone);
  }
  toggle() { if (this.isOpen) this.close(); else this.open(); }
  setTab(tab) { controls.cancelCapture(); this.tab = tab; this.show("settings", "", `[data-tab="${tab}"]`); }

  /* ---------------- estructura ---------------- */
  #side(s, P) {
    const h = (v, m) => Math.max(0, Math.min(100, (v / m) * 100));
    return `<aside class="gm-side">
      <div class="gm-hero">
        <canvas class="gm-portrait" id="gm-portrait" width="44" height="44"></canvas>
        <div>
          <div class="gm-name">ABEL</div>
          <div class="gm-title">${P.race.es} · LV ${P.level}</div>
          <div class="gm-bars">
            <div class="gm-bar hp"><i style="width:${h(s.hp, s.maxHp)}%"></i><span>HP ${s.hp}/${s.maxHp}</span></div>
            <div class="gm-bar mp"><i style="width:${h(s.mp, s.maxMp)}%"></i><span>MP ${s.mp}/${s.maxMp}</span></div>
            <div class="gm-bar xp"><i style="width:${P.level >= 40 ? 100 : h(P.xp, P.xpNext)}%"></i><span>XP ${P.xp}/${P.xpNext}</span></div>
          </div>
          <div class="gm-chips"><span>◆ ${s.gold}</span><span>LP ${s.lp}</span></div>
        </div>
      </div>
      <nav class="gm-nav">
        <button data-close><b>▶</b>RESUME · CONTINUAR</button>
        ${NAV.map(([k, n, es, ic]) => `<button data-view="${k}" class="${k === this.view ? "cur" : ""}"><b>${ic}</b>${n}</button>`).join("")}
        ${this.hooks.onQuit ? `<button data-quit><b>✕</b>QUIT · SALIR</button>` : ""}
      </nav>
    </aside>`;
  }

  show(view, msg = "", focusSel = "") {
    this.view = view;
    const s = this.hooks.getState?.() || {};
    const P = this.hooks.getProg?.();
    let body = "";
    if (view === "status") body = this.#statusBody(P);
    else if (view === "skills") body = this.#skillsBody(P);
    else if (view === "party") body = this.#partyBody(P);
    else if (view === "levels") body = this.#levelsBody();
    else if (view === "inventory") body = this.#bagBody(s, msg);
    else if (view === "settings") body = `<h2>✦ SETTINGS</h2><div class="gm-sub">Ajustes · LB / RB cambian de pestaña</div>
        <div class="gm-tabs">${TABS.map(([k, n]) => `<button data-tab="${k}" class="${k === this.tab ? "cur" : ""}">${n}</button>`).join("")}</div>
        ${this.#settingsBody()}<div class="gm-msg">${msg}</div>`;
    else if (view === "help") body = `<h2>✦ CONTROLS</h2><div class="gm-sub">Controles actuales · cámbialos en Settings</div>${this.#helpBody()}`;
    else if (view === "save" || view === "load") body = this.#slotsBody(view, msg);

    const solo = this.standalone;
    const close = solo ? `<button class="gm-back" data-close>CLOSE · CERRAR</button>` : "";
    this.el.innerHTML = `<div class="gm-shell">${solo || !P ? "" : this.#side(s, P)}<section class="gm-main">${body}${close}</section></div>`;
    this.#wire(view);
    this.#startPortrait();
    const focus = () => {
      const target = (focusSel && this.el.querySelector(focusSel)) || this.el.querySelector(solo ? ".gm-main button:not(:disabled), .gm-main input" : `.gm-nav [data-view="${view}"]`) || this.el.querySelector("button:not(:disabled)");
      target?.focus({ preventScroll: true });
    };
    focus();
    setTimeout(focus, 30);
  }

  #startPortrait() {
    clearInterval(this.portraitTimer);
    const draw = () => {
      const c = this.el.querySelector("#gm-portrait");
      if (!c || !ATLAS.abel) return;
      const g = c.getContext("2d");
      g.imageSmoothingEnabled = false;
      g.clearRect(0, 0, c.width, c.height);
      const A = ATLAS.abel, i = Math.floor(performance.now() / 130) % A.count("idle");
      A.draw(g, "idle", i, 22, 42, { scale: 1.1 });
    };
    draw();
    this.portraitTimer = setInterval(draw, 130);
  }

  /* ---------------- STATUS ---------------- */
  #statusBody(P) {
    const race = P.race;
    const rows = STATS.map((st) => {
      const v = P.stats[st.id];
      return `<div class="gm-stat"><b>${st.label}</b><span class="d">${st.name} · ${st.es}<br>${st.desc}</span><em>${v}</em>
        <button data-alloc="${st.id}" ${P.points < 1 ? "disabled" : ""} aria-label="Add point to ${st.name}">+</button></div>`;
    }).join("");
    return `<h2>★ STATUS</h2><div class="gm-sub">${race.name} · ${race.es} — ${race.perk}</div>
      <div class="gm-lvl"><span>LEVEL</span><span class="big">${P.level}</span><span style="color:#a8935c">XP ${P.xp} / ${P.level >= 40 ? "MAX" : P.xpNext}</span></div>
      <div class="gm-pts">${P.points ? `★ ${P.points} STAT POINTS TO SPEND · puntos por repartir` : "No free points · sube de nivel para ganar más"}</div>
      <div class="gm-list">${rows}</div>
      <div class="gm-derived">
        <div><b>${P.maxHp}</b>MAX HP</div><div><b>${P.maxMp}</b>MAX MP</div><div><b>${P.atk.toFixed(1)}</b>ATTACK</div>
        <div><b>${P.magic.toFixed(1)}</b>MAGIC</div><div><b>${P.defense.toFixed(1)}</b>DEFENSE</div><div><b>${Math.round(P.critChance * 100)}%</b>CRIT</div>
      </div>
      <div class="gm-note" style="margin-top:10px">Wisdom gives you +${P.timeBonus.toFixed(1)} s to answer every English question. · La sabiduría te da más tiempo para responder.</div>`;
  }

  /* ---------------- SKILLS ---------------- */
  #skillsBody(P) {
    const cap = P.specialCap;
    const rowFor = (sp) => {
      const lv = P.spLevels[sp.id] || 0;
      const owner = sp.owner === "abel" ? "Abel" : allyName(sp.owner);
      if (!lv) {
        const why = sp.assist ? `Meet ${owner} · Encuentra a ${owner}` : `Learns at hero Lv.${sp.unlock} · Nivel ${sp.unlock}`;
        return `<div class="gm-skill locked"><i style="background:#555"></i><div><b>${sp.name}</b><small>${sp.es} · ${owner}</small><small>🔒 ${why}</small></div><span></span></div>`;
      }
      const c = P.canUpgrade(sp.id);
      const pips = "●".repeat(lv) + "○".repeat(MAX_SPECIAL_LEVEL - lv);
      const cost = sp.assist ? `BOND ${"◆".repeat(sp.bond)}` : sp.mp ? `${sp.mp} MP` : "FREE";
      return `<div class="gm-skill"><i style="background:${sp.color}"></i><div><b>${sp.name} <span style="color:#a8935c">· ${owner}</span></b><small>${sp.es} — ${sp.desc}</small>
        <div class="pips">${pips} <span style="color:#a8935c;font-size:11px;letter-spacing:0">Lv.${lv}/${MAX_SPECIAL_LEVEL} · ${cost} · ${sp.tier} question</span></div></div>
        <button data-upgrade="${sp.id}" ${c.ok ? "" : "disabled"}>${lv >= MAX_SPECIAL_LEVEL ? "MAX" : c.ok ? `UPGRADE · ${c.why}` : c.why}</button></div>`;
    };
    const abel = Object.values(SPECIALS).filter((s) => s.owner === "abel").map(rowFor).join("");
    const allies = ALLY_ORDER.map((a) => Object.values(SPECIALS).filter((s) => s.owner === a).map(rowFor).join("")).join("");
    return `<h2>⚔ SKILLS</h2><div class="gm-sub">Ataques especiales · cada uno sube hasta Lv.${MAX_SPECIAL_LEVEL}</div>
      <div class="gm-cap">SKILL POINTS: <b style="color:#9dffcf">${P.skillPoints}</b> · special level cap now <b>${cap}</b> (hero Lv.${P.level}) — raise your hero level to unlock higher special levels.</div>
      <div class="gm-list">${abel}${allies}</div>`;
  }

  /* ---------------- PARTY ---------------- */
  #partyBody(P) {
    const rows = ALLY_ORDER.map((id) => {
      const joined = P.party.has(id);
      const sps = Object.values(SPECIALS).filter((s) => s.owner === id);
      return `<div class="gm-ally ${joined ? "" : "off"}"><canvas data-ally="${id}" width="26" height="26"></canvas>
        <div><b style="font-family:'Press Start 2P',monospace;font-size:10px;font-weight:normal">${allyName(id).toUpperCase()}</b>
        <div style="color:#a8935c;font-size:14px;margin-top:3px">${joined ? "In the party · En el grupo" : "Not met yet · Aún no la conoces"}</div>
        <div style="font-size:14px;margin-top:3px">${sps.map((s) => `<span style="color:${joined ? s.color : "#666"}">${s.name} (${P.spLevels[s.id] || "—"})</span>`).join(" · ")}</div></div></div>`;
    }).join("");
    return `<h2>♥ PARTY</h2><div class="gm-sub">Aliados · sus ataques se invocan en combate con el vínculo (◆)</div>
      <div class="gm-note">Answer correctly to charge BOND. Spend it on an ally's assist from the SPECIAL menu. · Acierta preguntas para cargar el vínculo y gástalo en una asistencia.</div>
      <div class="gm-list">${rows}</div>`;
  }

  /* ---------------- LEVELS: temario completo de inglés ---------------- */
  #levelsBody() {
    const sy = this.hooks.getSyllabus?.();
    if (!sy) return "<h2>▦ LEVELS</h2>";
    const groups = sy.levels.map((lv) => {
      const rows = lv.subs.map((sb) => {
        const done = !!sy.done[sb.id], cur = sb.id === sy.current;
        const state = !sb.playable ? "🔒" : done ? "✔" : cur ? "►" : "·";
        const travel = sb.playable && (done || cur) && !cur ? `<button data-travel="${sb.id}">GO · IR</button>` : `<span class="n">${!sb.playable ? "SOON" : cur ? "HERE" : ""}</span>`;
        return `<div class="gm-row" style="grid-template-columns:24px 1fr auto;${sb.playable ? "" : "opacity:.45"}"><span class="n">${state}</span>
          <span>${sb.id} · ${sb.name}${sb.es ? ` <span style="color:#a8935c">· ${sb.es}</span>` : ""}<small>${sb.focus}${sb.focusEs ? " · " + sb.focusEs : ""}</small></span>${travel}</div>`;
      }).join("");
      const doneN = lv.subs.filter((sb) => sy.done[sb.id]).length;
      return `<div class="gm-lvhead"><b>${lv.id}</b> ${lv.name} · ${lv.es} <span>${doneN}/${lv.subs.length}</span></div><div class="gm-list">${rows}</div>`;
    }).join("");
    return `<h2>▦ LEVELS</h2><div class="gm-sub">Currículo de inglés MCER · cada nivel se divide en subniveles con gramática, vocabulario, listening y speaking</div>${groups}`;
  }

  /* ---------------- BAG ---------------- */
  #bagBody(s, msg) {
    const inv = s.inventory || {};
    const P = this.hooks.getProg?.();
    const eq = P ? P.equipped : { weapon: null, armor: null, trinket: null };
    const slotRow = ([slot, en, es]) => {
      const id = eq[slot], it = id && EQUIPMENT[id], r = it && RARITIES[it.rarity];
      return `<div class="gm-row eqslot">
        <canvas class="eq-ic" width="16" height="16" ${it ? `data-ic="${it.kind}" data-col="${r.color}"` : ""}></canvas>
        <span>${en} · ${es}<small>${it ? `<span style="color:${r.color}">${it.name}</span> · ${bonusText(it.bonus)}` : "— empty · vacío —"}</small></span>
        <button data-unequip="${slot}" ${it ? "" : "disabled"}>UNEQUIP</button></div>`;
    };
    const owned = Object.keys(inv).filter((id) => EQUIPMENT[id] && inv[id] > 0 && !Object.values(eq).includes(id));
    const gearRow = (id) => {
      const it = EQUIPMENT[id], r = RARITIES[it.rarity];
      return `<div class="gm-row"><canvas class="eq-ic" width="16" height="16" data-ic="${it.kind}" data-col="${r.color}"></canvas>
        <span><b style="color:${r.color}">${it.name}</b><small>${it.nameEs} · ${bonusText(it.bonus)}</small></span>
        <button data-equip="${id}">EQUIP</button></div>`;
    };
    return `<h2>◆ BAG</h2><div class="gm-sub">Inventario · usa consumibles y equipa tu equipo</div>
      <div class="gm-list">${Object.values(SHOP_ITEMS).map((it) => `
        <div class="gm-row"><span>${it.name}<small>${it.nameEs} · ${[it.hp ? `+${it.hp} HP` : "", it.mp ? `+${it.mp} MP` : ""].filter(Boolean).join(" · ")}</small></span>
        <span class="n">×${inv[it.id] || 0}</span>
        <button data-use="${it.id}" ${(inv[it.id] || 0) < 1 ? "disabled" : ""}>USE</button></div>`).join("")}</div>
      <div class="gm-sub2">⚔ EQUIPMENT · EQUIPO</div>
      <div class="gm-list">${SLOTS.map(slotRow).join("")}</div>
      ${owned.length ? `<div class="gm-sub2">🎒 OWNED · EN LA MOCHILA</div><div class="gm-list">${owned.map(gearRow).join("")}</div>` : ""}
      <div class="gm-msg">${msg}</div>`;
  }

  /* ---------------- GUARDAR / CARGAR ---------------- */
  #slotsBody(view, msg) {
    const slots = this.hooks.listSlots();
    return `<h2>${view === "save" ? "▼ SAVE GAME" : "▲ LOAD GAME"}</h2>
      <div class="gm-sub">${view === "save" ? "Guardar partida" : "Cargar partida"} · 3 ranuras</div>
      <div class="gm-list">${slots.map(({ slot, data }) => `
        <div class="gm-row"><span>SLOT ${slot}<small>${data ? `${data.zone} · LV ${data.prog?.level ?? 1} · LP ${data.stats.lp} · ◆ ${data.stats.gold} · ${fmtDate(data.savedAt)}` : "— vacía · empty —"}</small></span>
        <span></span>
        <button data-slot="${slot}" ${view === "load" && !data ? "disabled" : ""}>${view === "save" ? "SAVE" : "LOAD"}</button></div>`).join("")}
      </div><div class="gm-msg">${msg}</div>`;
  }

  /* ---------------- Ajustes ---------------- */
  #settingsBody() {
    const st = this.hooks.getSettings();
    const slider = (key, label, es) => `<label class="gm-slider"><span>${label} · ${es}</span><output>${pct(st[key])}%</output>
      <input type="range" data-slider="${key}" min="0" max="100" step="5" value="${pct(st[key])}"></label>`;
    const toggle = (key, label, es) => `<div class="gm-opt"><span>${label}<small>${es}</small></span>
      <button data-toggle="${key}">${st[key] ? "ON" : "OFF"}</button></div>`;
    const cycle = (key, label, es) => `<div class="gm-opt"><span>${label}<small>${es}</small></span>
      <button data-cycle="${key}">${String(st[key]).toUpperCase()}</button></div>`;

    if (this.tab === "audio") return `<div class="gm-list">${slider("master", "Master volume", "Volumen general")}${slider("music", "Music", "Música")}${slider("sfx", "Effects", "Efectos")}</div>`;
    if (this.tab === "game") return `<div class="gm-list">
        ${cycle("difficulty", "Difficulty", "Dificultad: tiempo para responder (easy ×1.4 · hard ×0.75)")}
        ${toggle("subtitles", "Spanish subtitles", "Subtítulos en español en los diálogos")}
        ${toggle("hints", "Control hints", "Pistas de controles en pantalla")}
        ${toggle("voice", "Spoken English (listening)", "Lee en voz alta frases y palabras")}
        ${toggle("speaking", "Speaking challenges (microphone)", "Retos de pronunciación con el micrófono")}
      </div>`;
    if (this.tab === "display") return `<div class="gm-list">
        ${toggle("shake", "Screen shake", "Sacudida de pantalla en los impactos")}
        ${toggle("flashes", "Flashes", "Destellos blancos (desactívalos si te molestan)")}
        ${cycle("particles", "Particles", "Calidad de partículas y destrucción")}
        ${toggle("minimap", "Minimap", "Mapa circular de ubicación")}
        ${toggle("coords", "Coordinates", "Mostrar coordenadas")}
        ${cycle("touch", "Touch controls", "Mando táctil (Android / iOS): auto · on · off")}
        ${document.fullscreenEnabled ? `<div class="gm-opt"><span>Fullscreen<small>Pantalla completa</small></span><button data-fullscreen>${document.fullscreenElement ? "EXIT" : "ENTER"}</button></div>` : ""}
      </div>`;
    const dev = this.tab === "pad" ? "pad" : this.tab;
    const nameOf = (c) => (dev === "pad" ? padLabel(c) : keyLabel(c));
    const rows = ACTIONS.filter((a) => dev !== "mouse" || ["punch", "special", "dash", "interact", "menu"].includes(a.id)).map((a) => {
      const list = controls.bindings[dev][a.id];
      return `<div class="gm-bind"><span>${a.label}<small>${a.es}</small></span>
        ${[0, 1].map((i) => `<button data-bind="${dev}:${a.id}:${i}">${list[i] != null ? nameOf(list[i]) : "—"}</button>`).join("")}</div>`;
    }).join("");
    let extra = "";
    if (dev === "pad") {
      const st2 = this.hooks.getSettings();
      extra = `<span class="gm-pad ${controls.padConnected ? "ok" : ""}">${controls.padConnected ? "🎮 " + controls.padId.slice(0, 48) : "🎮 No gamepad detected · Pulsa un botón del mando"}</span>
        <div class="gm-list" style="margin-bottom:8px">
          <label class="gm-slider"><span>Stick deadzone · Zona muerta</span><output>${pct(st2.deadzone)}%</output>
          <input type="range" data-slider="deadzone" min="5" max="60" step="5" value="${pct(st2.deadzone)}"></label>
          ${toggle("vibration", "Vibration", "Vibración del mando y del móvil")}
        </div>`;
    }
    const note = dev === "keyboard"
      ? "Selecciona una casilla y pulsa la tecla nueva · Esc cancela · Retroceso borra. Esc siempre abre el menú."
      : dev === "mouse" ? "Selecciona una casilla y haz clic con el botón del ratón que quieras (izq., central, der., laterales)."
        : "Selecciona una casilla y pulsa el botón del mando. START siempre abre el menú; A confirma en los menús.";
    return `${extra}<div class="gm-note">${note}</div><div class="gm-list">${rows}</div>
      <div class="gm-foot"><button data-reset="${dev}">RESET TO DEFAULT · RESTAURAR</button></div>`;
  }

  #helpBody() {
    const kb = (a) => controls.bindings.keyboard[a].map(keyLabel).join(" / ") || "—";
    const ms = (a) => controls.bindings.mouse[a].map(keyLabel).join(" / ");
    const pd = (a) => controls.bindings.pad[a].map(padLabel).join(" / ") || "—";
    const rows = ACTIONS.filter((a) => !a.id.startsWith("ans")).map((a) =>
      `<b>${a.label.toUpperCase()}</b><span>${kb(a.id)}${ms(a.id) ? " · " + ms(a.id) : ""} · 🎮 ${pd(a.id)}</span>`).join("");
    return `<div class="gm-help">${rows}<b>ANSWER WORDS</b><span>${kb("ans1")} ${kb("ans2")} ${kb("ans3")} · 🎮 ${pd("ans1")} ${pd("ans2")} ${pd("ans3")}</span>
      <b>MENUS</b><span>Arrows / stick / D-pad · Enter / A confirm · Esc / B back · LB/RB tabs</span></div>`;
  }

  #wire(view) {
    const q = (sel) => this.el.querySelectorAll(sel);
    q("[data-close]").forEach((b) => b.addEventListener("click", () => this.close()));
    q("[data-view]").forEach((b) => b.addEventListener("click", () => { this.hooks.onSound?.(); this.show(b.dataset.view); }));
    q("[data-quit]").forEach((b) => b.addEventListener("click", () => { this.close(); this.hooks.onQuit(); }));
    q("[data-use]").forEach((b) => b.addEventListener("click", () => this.show("inventory", this.hooks.useItem(b.dataset.use), `[data-use="${b.dataset.use}"]:not(:disabled)`)));
    q("canvas[data-ic]").forEach((cv) => drawEquipIcon(cv.getContext("2d"), 0, 0, cv.dataset.ic, cv.dataset.col));
    q("[data-equip]").forEach((b) => b.addEventListener("click", () => { const m = this.hooks.equip?.(b.dataset.equip); this.hooks.onSound?.(); this.show("inventory", m || ""); }));
    q("[data-unequip]").forEach((b) => b.addEventListener("click", () => { const m = this.hooks.unequip?.(b.dataset.unequip); this.hooks.onSound?.(); this.show("inventory", m || ""); }));
    q("[data-tab]").forEach((b) => b.addEventListener("click", () => { this.hooks.onSound?.(); this.setTab(b.dataset.tab); }));
    q("[data-travel]").forEach((b) => b.addEventListener("click", () => this.hooks.travel?.(b.dataset.travel)));
    q("[data-alloc]").forEach((b) => b.addEventListener("click", () => {
      const P = this.hooks.getProg();
      if (P.allocate(b.dataset.alloc)) { this.hooks.onChange?.(); this.hooks.onSound?.(); }
      this.show("status", "", P.points > 0 ? `[data-alloc="${b.dataset.alloc}"]` : `.gm-nav [data-view="status"]`);
    }));
    q("[data-upgrade]").forEach((b) => b.addEventListener("click", () => {
      const P = this.hooks.getProg();
      if (P.upgrade(b.dataset.upgrade)) { this.hooks.onChange?.(); this.hooks.onSound?.(); }
      this.show("skills", "", `[data-upgrade="${b.dataset.upgrade}"]:not(:disabled), .gm-nav [data-view="skills"]`);
    }));
    q("canvas[data-ally]").forEach((c) => {
      const A = ATLAS[c.dataset.ally];
      if (!A) return;
      const g = c.getContext("2d"); g.imageSmoothingEnabled = false;
      const f = A.frame("idle", 0), sh = Math.round(f.h * 0.55), sw = Math.min(f.w, 26), k = Math.min(26 / sw, 26 / sh);
      const dw = Math.round(sw * k), dh = Math.round(sh * k);
      g.drawImage(A.img, f.x + Math.round((f.w - sw) / 2), f.y, sw, sh, Math.round((26 - dw) / 2), 26 - dh, dw, dh);
    });
    q("[data-slot]").forEach((b) => b.addEventListener("click", () => {
      const slot = +b.dataset.slot;
      if (view === "save") this.show("save", this.hooks.save(slot) ? `✔ Saved in slot ${slot} · Guardado` : "✖ Storage unavailable · Sin almacenamiento");
      else if (this.hooks.load(slot)) this.close();
      else this.show("load", "✖ Could not load · No se pudo cargar");
    }));

    q("[data-slider]").forEach((inp) => {
      const out = inp.parentElement.querySelector("output");
      inp.addEventListener("input", () => { out.textContent = inp.value + "%"; this.hooks.setSetting(inp.dataset.slider, inp.value / 100); });
      inp.addEventListener("change", () => this.hooks.onSound?.());
    });
    q("[data-toggle]").forEach((b) => b.addEventListener("click", () => {
      const k = b.dataset.toggle;
      this.hooks.setSetting(k, !this.hooks.getSettings()[k]);
      this.hooks.onSound?.();
      this.show("settings", "", `[data-toggle="${k}"]`);
    }));
    q("[data-cycle]").forEach((b) => {
      const step = (dir) => {
        const k = b.dataset.cycle, list = CYCLES[k], cur = list.indexOf(this.hooks.getSettings()[k]);
        this.hooks.setSetting(k, list[(cur + dir + list.length) % list.length]);
        this.hooks.onSound?.();
        this.show("settings", "", `[data-cycle="${k}"]`);
      };
      b.addEventListener("click", () => step(1));
      b.addEventListener("cycle", (e) => step(e.detail.dir));
    });
    q("[data-fullscreen]").forEach((b) => b.addEventListener("click", () => { this.hooks.onFullscreen?.(); setTimeout(() => this.show("settings", "", "[data-fullscreen]"), 250); }));
    q("[data-bind]").forEach((b) => b.addEventListener("click", async () => {
      const [dev, action, slot] = b.dataset.bind.split(":");
      if (controls.capturing) controls.cancelCapture();
      b.classList.add("capturing");
      b.textContent = dev === "pad" ? "PRESS BUTTON…" : dev === "mouse" ? "CLICK…" : "PRESS KEY…";
      const timer = dev === "pad" ? setTimeout(() => controls.cancelCapture(), 7000) : null;
      const code = await controls.capture(dev);
      clearTimeout(timer);
      if (!this.isOpen) return;
      if (code === "") controls.clearBinding(dev, action, +slot);
      else if (code !== null) controls.rebind(dev, action, +slot, code);
      this.hooks.onSound?.();
      this.show("settings", code === null ? "Cancelled · Cancelado" : "✔ Saved · Guardado", `[data-bind="${b.dataset.bind}"]`);
    }));
    q("[data-reset]").forEach((b) => b.addEventListener("click", () => {
      controls.resetDevice(b.dataset.reset);
      this.hooks.onSound?.();
      this.show("settings", "✔ Defaults restored · Valores por defecto", "[data-reset]");
    }));
  }
}

export { DEFAULT_BINDINGS, RACES, specialCap, upgradeCost, xpToNext };
