import { controls } from "../core/Controls.js";
import { EQUIPMENT, RARITIES, drawEquipIcon, bonusText } from "../rpg/Equipment.js";

/**
 * Shop · economía del mapa
 * ------------------------
 *   SHOP_ITEMS        Catálogo de consumibles.
 *   generateLoot()    Monedas y reliquias repartidas por el mapa con semilla fija.
 *   drawLoot()        Moneda giratoria / reliquia brillante en pixel art.
 *   drawMerchant()    Puesto de pociones con su mercader encapuchado.
 *   Shop              Interfaz de compra (DOM) con estética gótica dorada.
 */

export const SHOP_ITEMS = Object.freeze({
  hpPotion: { id: "hpPotion", name: "Healing Draught", nameEs: "Poción de vida", price: 15, hp: 40, color: "#ff4a5a" },
  mpPotion: { id: "mpPotion", name: "Mana Tonic", nameEs: "Tónico de maná", price: 12, mp: 30, color: "#4a9aff" },
  elixir:   { id: "elixir", name: "Seraph Elixir", nameEs: "Elixir del serafín", price: 40, hp: 100, mp: 60, color: "#ffd86a" },
});

/**
 * Reparte botín por zonas transitables del mapa.
 * @param {object} mm        Mapa construido (W, H, pathY, boxes).
 * @param {() => number} rand
 * @param {{coins:number, relics:number}} counts
 */
export function generateLoot(mm, rand, { coins = 26, relics = 3 } = {}) {
  const items = [];
  let id = 0;
  for (let i = 0; i < 6000 && items.length < coins + relics; i++) {
    const relic = items.filter((it) => it.kind === "relic").length < relics && rand() < 0.1;
    // Repartidos por todo el disco (no solo junto al sendero), separados entre sí
    const x = 110 + rand() * (mm.W - 220), y = 110 + rand() * (mm.H - 220);
    if (!mm.isFree(x, y, 3)) continue;
    if (items.some((it) => Math.hypot(it.x - x, it.y - y) < (relic ? 140 : 40))) continue;
    if (!relic && items.filter((it) => it.kind === "coin").length >= coins) continue;
    items.push({ id: `${mm.id}:${id++}`, kind: relic ? "relic" : "coin", x: Math.round(x), y: Math.round(y), phase: rand() * 6.28, taken: false });
  }
  return items;
}

/** Moneda dorada que gira con brillo, o trofeo/reliquia radiante con gema y destellos. */
export function drawLoot(c, it, t) {
  const R = (col, a, b, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(Math.round(a), Math.round(b), w, h); };
  const x = it.x, y = it.y + Math.round(Math.sin(t * 3 + it.phase) * 1.2);   // flota
  if (it.kind === "coin") {
    // sombra que late con el giro
    const phase = (t * 3.4 + it.phase * 2) % (Math.PI * 2);
    const w = Math.max(1, Math.round(Math.abs(Math.cos(phase)) * 5) + 1);     // anchura según el giro (canto ↔ cara)
    const edge = Math.abs(Math.cos(phase)) < 0.28;                            // casi de canto
    c.globalAlpha = 0.3; R("#000", it.x - 3, it.y + 4, 6, 1); c.globalAlpha = 1;
    const x0 = x - (w >> 1);
    if (edge) {                                                               // de canto: una línea dorada fina
      R("#9c7416", x0, y - 4, Math.max(1, w), 8); R("#ffe07a", x0, y - 3, Math.max(1, w), 1);
    } else {
      R("#8a5a10", x0, y - 5, w, 10);                                         // borde oscuro
      R("#e3b341", x0, y - 4, w, 8);                                          // cuerpo dorado
      R("#ffe07a", x0, y - 4, w, 2);                                          // luz superior
      R("#a8780f", x0, y + 2, w, 2);                                          // sombra inferior
      if (w >= 4) { R("#8a5a10", x + (w >> 1) - 2, y - 2, 1, 4); R("#fff6d0", x0 + 1, y - 3, 1, 1); }  // emboque central + brillo
    }
    // destello que barre + chispa ocasional
    const sp = (t * 2 + it.phase) % 2.2;
    if (sp < 0.5) { c.globalAlpha = 1 - sp * 2; R("#ffffff", x0 + Math.round(sp * w * 2) - 1, y - 4, 1, 2); c.globalAlpha = 1; }
    if (((t * 2 + it.phase * 5) | 0) % 7 === 0) { R("#fff6d0", x + 3, y - 6, 1, 1); R("#fff6d0", x + 2, y - 5, 1, 1); }
  } else {
    // Trofeo/reliquia: copa dorada con gema radiante, aura pulsante y destellos
    const glow = 0.55 + 0.45 * Math.sin(t * 3 + it.phase);
    c.globalAlpha = 0.3; R("#000", it.x - 4, it.y + 5, 8, 1); c.globalAlpha = 1;
    // aura
    c.save(); c.globalCompositeOperation = "lighter"; c.globalAlpha = 0.18 + 0.14 * glow;
    const g = c.createRadialGradient(x, y - 2, 1, x, y - 2, 11);
    g.addColorStop(0, "#ffe9a0"); g.addColorStop(1, "rgba(255,233,160,0)"); c.fillStyle = g; c.fillRect(x - 11, y - 13, 22, 22);
    c.restore();
    // pie y copa
    R("#9c7416", x - 3, y + 4, 6, 1); R("#b8860f", x - 2, y + 2, 4, 2); R("#8a5a10", x - 1, y - 1, 2, 3);
    R("#9c7416", x - 5, y - 5, 10, 2); R("#e3b341", x - 4, y - 5, 8, 2);     // copa superior
    R("#c9981f", x - 4, y - 3, 8, 3); R("#ffe07a", x - 4, y - 5, 2, 5);      // cuerpo + luz izquierda
    R("#8a5a10", x + 3, y - 4, 1, 4);                                        // asa/sombra derecha
    // gema central radiante
    R("#2aa0c0", x - 1, y - 4, 2, 3); R("#b8ffea", x - 1, y - 4, 1, 2); R("#ffffff", x - 1, y - 4, 1, 1);
    // corona de destellos
    const k = (t * 1.5 + it.phase);
    for (let i = 0; i < 4; i++) { const a = k + i * 1.57, r = 6 + glow * 2; if (((i + (t * 2 | 0)) % 2) === 0) R("#fff6d0", x + Math.round(Math.cos(a) * r), y - 2 + Math.round(Math.sin(a) * r), 1, 1); }
  }
}

/**
 * Puesto de pociones (36×30): toldo a rayas, mostrador con frascos y un
 * mercader encapuchado con farol. Base en (x + 18, y + 30).
 */
export function drawMerchant(c, x, y, t) {
  const P = (col, a, b, w, h) => { c.fillStyle = col; c.fillRect(x + a, y + b, w, h); };
  const breath = Math.sin(t * 2.1) > 0.35 ? -1 : 0;                 // el mercader respira
  const blink = (t % 4.3) < 0.13;
  P("rgba(0,0,0,0.38)", 2, 28, 32, 3);
  // Postes y toldo a rayas (el festón se mece con la brisa)
  const sway = Math.sin(t * 1.3) > 0.8 ? 1 : 0;
  P("#3a2416", 2, 6, 2, 22); P("#3a2416", 32, 6, 2, 22);
  for (let i = 0; i < 9; i++) P(i % 2 ? "#e8e0c8" : "#8e1e35", 1 + i * 4, 3, 4, 4);
  P("#5e1230", 1, 7, 34, 1);
  for (let i = 0; i < 9; i++) P(i % 2 ? "#c8c0a8" : "#6e1428", 2 + i * 4 + (i % 3 === 0 ? sway : 0), 8, 2, 1 + (i % 2 && sway ? 1 : 0));
  // Mercader encapuchado tras el mostrador
  P("#2a2240", 13, 10 + breath, 10, 10 - breath); P("#3a3058", 14, 10 + breath, 4, 9 - breath); P("#1a1428", 21, 11 + breath, 2, 9 - breath);
  P("#120c1c", 15, 12 + breath, 6, 4);
  if (!blink) { P("#ffd86a", 16, 14 + breath, 1, 1); P("#ffd86a", 19, 14 + breath, 1, 1); }                  // ojos bajo la capucha
  // Mostrador y manos que cuentan monedas: una moneda salta de mano en mano
  const k = ((t * 3) % 3) | 0;
  P("#5a3a22", 4, 19, 28, 9); P("#7a5432", 4, 19, 28, 2); P("#3a2416", 4, 26, 28, 2);
  P("#d8b090", 11 + k * 4, 18, 2, 1);
  P("#e3b341", 12 + k * 4, 17 - (k === 1 ? 1 : 0), 1, 1);
  // Frascos de pociones: burbujas que suben
  const bottles = [["#ff4a5a", 7], ["#4a9aff", 12], ["#ffd86a", 23], ["#ff4a5a", 27]];
  bottles.forEach(([col, bx], i) => {
    P("#e8e0f0", bx, 15, 2, 1); P(col, bx - 1, 16, 4, 3); P("#ffffff", bx - 1, 16, 1, 1);
    const bub = (t * 1.6 + i * 0.37) % 1;
    if (bub < 0.5) P("#ffffff", bx + (i % 2), 15 - Math.round(bub * 6), 1, 1);
  });
  // Farol con luz parpadeante que se balancea
  const lx = Math.round(Math.sin(t * 1.8));
  const flick = 0.75 + 0.25 * Math.sin(t * 9) * Math.sin(t * 3.7);
  P("#2a2a30", 31 + lx, 9, 4, 1); P("#3a3a44", 31 + lx, 10, 4, 5);
  c.globalAlpha = flick; P("#ffcf5a", 32 + lx, 11, 2, 3); c.globalAlpha = 1;
}

/* ======================================================================
   INTERFAZ DE LA TIENDA
   ====================================================================== */

const CSS = `
#shop-ui { position: fixed; inset: 0; z-index: 36; display: none; align-items: center; justify-content: center;
  background: rgba(4, 2, 10, 0.68); padding: 16px; font-family: "Pixelify Sans", monospace; }
#shop-ui.show { display: flex; }
#shop-ui .shop-card { width: min(560px, 100%); background: rgba(10, 6, 18, 0.95); border: 3px solid #e3b341;
  box-shadow: 0 0 0 3px #000, 0 0 40px rgba(227, 179, 65, 0.35); padding: 20px; color: #fbe7a1; }
#shop-ui h2 { font-family: "Press Start 2P", monospace; font-size: 13px; letter-spacing: .12em; margin: 0 0 4px; }
#shop-ui .sub { color: #a8935c; font-size: 15px; margin-bottom: 14px; }
#shop-ui .gold { font-family: "Press Start 2P", monospace; font-size: 11px; color: #ffd86a; margin-bottom: 14px; }
#shop-ui .shop-tabs { display: flex; gap: 8px; margin-bottom: 12px; }
#shop-ui .shop-tabs button { flex: 1; }
#shop-ui .shop-tabs button.cur { background: #e3b341; color: #1a1200; }
#shop-ui .rows { display: grid; gap: 10px; max-height: 52vh; overflow-y: auto; }
#shop-ui .row.gear canvas.eq-ic { width: 20px; height: 20px; image-rendering: pixelated; }
#shop-ui .row { display: grid; grid-template-columns: 22px 1fr auto auto; gap: 12px; align-items: center;
  border: 2px solid #9c7416; padding: 10px 12px; background: #140e08; }
#shop-ui .row i { width: 14px; height: 18px; display: block; border: 2px solid #000; }
#shop-ui .row b { display: block; font-size: 16px; }
#shop-ui .row small { color: #a8935c; font-size: 13px; }
#shop-ui .row .own { font-family: "Press Start 2P", monospace; font-size: 9px; color: #a8935c; }
#shop-ui button { font-family: "Press Start 2P", monospace; font-size: 10px; color: #fbe7a1; background: #1c1408;
  border: 2px solid #e3b341; padding: 10px 12px; cursor: pointer; }
#shop-ui button:hover:not(:disabled), #shop-ui button:focus-visible, #shop-ui button:focus { background: #e3b341; color: #1a1200; outline: none; }
#shop-ui button:disabled { opacity: .4; cursor: default; }
#shop-ui .foot { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; gap: 10px; }
#shop-ui .msg { font-size: 15px; color: #9dffcf; min-height: 1.2em; }
`;

export class Shop {
  /**
   * @param {object} hooks
   * @param {() => {gold:number, inventory:object}} hooks.getState
   * @param {(itemId:string) => boolean} hooks.buy  Devuelve true si la compra se hizo.
   * @param {() => void} hooks.onClose
   * @param {() => void} [hooks.onSound]
   */
  constructor(hooks) {
    this.hooks = hooks;
    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);
    this.el = document.createElement("div");
    this.el.id = "shop-ui";
    this.el.setAttribute("role", "dialog");
    this.el.setAttribute("aria-modal", "true");
    document.body.appendChild(this.el);
    this.isOpen = false;
    this.scope = null;
  }

  open() {
    this.isOpen = true;
    this.tab = this.tab || "potions";
    this.render("");
    this.el.classList.add("show");
    this.scope = controls.pushScope({ el: this.el, keyMap: { KeyE: "back" }, onBack: () => this.close(), onStart: () => this.close() });
    setTimeout(() => this.el.querySelector("button:not(:disabled)")?.focus(), 50);
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.el.classList.remove("show");
    if (this.scope) { controls.popScope(this.scope); this.scope = null; }
    this.hooks.onClose();
  }

  render(msg) {
    const { gold, inventory, equipped = {} } = this.hooks.getState();
    const gear = this.tab === "gear";
    const potionRow = (it) => `
      <div class="row">
        <i style="background:${it.color}"></i>
        <span><b>${it.name}</b><small>${it.nameEs} · ${[it.hp ? `+${it.hp} HP` : "", it.mp ? `+${it.mp} MP` : ""].filter(Boolean).join(" · ")}</small></span>
        <span class="own">×${inventory[it.id] || 0}</span>
        <button type="button" data-buy="${it.id}" ${gold < it.price ? "disabled" : ""}>${it.price} ◆</button>
      </div>`;
    const gearRow = (it) => {
      const owned = !!inventory[it.id], eq = Object.values(equipped).includes(it.id), r = RARITIES[it.rarity];
      return `
      <div class="row gear" style="border-color:${r.color}88">
        <canvas class="eq-ic" width="16" height="16" data-ic="${it.kind}" data-col="${r.color}"></canvas>
        <span><b style="color:${r.color}">${it.name}</b><small>${it.nameEs} · <span style="color:${r.color}">${r.label[1]}</span> · ${bonusText(it.bonus)}</small></span>
        <span class="own">${eq ? "EQUIP." : owned ? "✔" : ""}</span>
        <button type="button" data-buy="${it.id}" ${owned || gold < it.price ? "disabled" : ""}>${owned ? "OWNED" : it.price + " ◆"}</button>
      </div>`;
    };
    this.el.innerHTML = `
      <div class="shop-card">
        <h2>✦ ${gear ? "ARMORY · ARMERÍA" : "POTION STALL"}</h2>
        <div class="sub">«Light is not free, little angel.» · «La luz no es gratis, angelito.»</div>
        <div class="gold">◆ ${gold} GOLD</div>
        <div class="shop-tabs">
          <button type="button" data-tab="potions" class="${gear ? "" : "cur"}">POTIONS · POCIONES</button>
          <button type="button" data-tab="gear" class="${gear ? "cur" : ""}">GEAR · EQUIPO</button>
        </div>
        <div class="rows">
          ${gear ? Object.values(EQUIPMENT).map(gearRow).join("") : Object.values(SHOP_ITEMS).map(potionRow).join("")}
        </div>
        <div class="foot"><span class="msg">${msg}</span><button type="button" data-close>LEAVE (E)</button></div>
      </div>`;
    this.el.querySelectorAll("canvas[data-ic]").forEach((cv) => drawEquipIcon(cv.getContext("2d"), 0, 0, cv.dataset.ic, cv.dataset.col));
    this.el.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => { this.tab = b.dataset.tab; this.render(""); this.el.querySelector(`[data-tab="${this.tab}"]`)?.focus(); }));
    this.el.querySelectorAll("[data-buy]").forEach((b) => b.addEventListener("click", () => {
      const it = SHOP_ITEMS[b.dataset.buy] || EQUIPMENT[b.dataset.buy];
      const ok = this.hooks.buy(it.id);
      this.hooks.onSound?.(ok);
      this.render(ok ? `✔ ${it.name} · ${it.nameEs}${EQUIPMENT[it.id] ? " — equip it in the BAG · equípalo en OBJETOS" : ""}` : "✖ Not enough gold · Oro insuficiente");
      (this.el.querySelector(`[data-buy="${it.id}"]:not(:disabled)`) || this.el.querySelector("[data-close]"))?.focus();
    }));
    this.el.querySelector("[data-close]").addEventListener("click", () => this.close());
  }
}
