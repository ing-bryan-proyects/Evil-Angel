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
  const free = (x, y) => {
    const box = { x: x - 3, y: y - 3, w: 6, h: 6 };
    return !mm.boxes.some((b) => box.x < b.x + b.w && box.x + box.w > b.x && box.y < b.y + b.h && box.y + box.h > b.y);
  };
  let id = 0;
  for (let i = 0; i < 2000 && items.length < coins + relics; i++) {
    const relic = items.filter((it) => it.kind === "relic").length < relics && rand() < 0.15;
    // Repartidos por todo el mapa (no solo junto al sendero), separados entre sí
    const x = 80 + rand() * (mm.W - 200);
    const y = 80 + rand() * (mm.H - 140);
    if (y < 70 || y > mm.H - 50 || !free(x, y)) continue;
    if (items.some((it) => Math.hypot(it.x - x, it.y - y) < (relic ? 120 : 34))) continue;
    if (!relic && items.filter((it) => it.kind === "coin").length >= coins) continue;
    items.push({ id: `${mm.id}:${id++}`, kind: relic ? "relic" : "coin", x: Math.round(x), y: Math.round(y), phase: rand() * 6.28, taken: false });
  }
  return items;
}

/** Moneda que gira (ancho variable) o reliquia con brillo pulsante. */
export function drawLoot(c, it, t) {
  const x = it.x, y = it.y + Math.round(Math.sin(t * 3 + it.phase));
  if (it.kind === "coin") {
    const w = [4, 3, 1, 3][((t * 8 + it.phase * 3) | 0) % 4];
    c.fillStyle = "rgba(0,0,0,0.35)"; c.fillRect(it.x - 2, it.y + 3, 4, 1);
    c.fillStyle = "#8a5a10"; c.fillRect(x - (w >> 1), y - 2, w, 4);
    c.fillStyle = "#e3b341"; c.fillRect(x - (w >> 1), y - 2, Math.max(1, w - 1), 3);
    if (w > 1) { c.fillStyle = "#fff3b0"; c.fillRect(x - (w >> 1), y - 2, 1, 1); }
  } else {
    // Reliquia: cáliz pequeño con gema
    c.fillStyle = "rgba(0,0,0,0.35)"; c.fillRect(it.x - 3, it.y + 4, 6, 1);
    c.fillStyle = "#9c7416"; c.fillRect(x - 2, y + 1, 4, 2); c.fillRect(x - 1, y - 1, 2, 2);
    c.fillStyle = "#e3b341"; c.fillRect(x - 3, y - 4, 6, 3); c.fillRect(x - 2, y - 1, 1, 1);
    c.fillStyle = "#b8ffea"; c.fillRect(x - 1, y - 4, 2, 2);
    c.fillStyle = "#ffffff"; c.fillRect(x - 1, y - 4, 1, 1);
  }
}

/**
 * Puesto de pociones (36×30): toldo a rayas, mostrador con frascos y un
 * mercader encapuchado con farol. Base en (x + 18, y + 30).
 */
export function drawMerchant(c, x, y, t) {
  const P = (col, a, b, w, h) => { c.fillStyle = col; c.fillRect(x + a, y + b, w, h); };
  P("rgba(0,0,0,0.38)", 2, 28, 32, 3);
  // Postes y toldo a rayas
  P("#3a2416", 2, 6, 2, 22); P("#3a2416", 32, 6, 2, 22);
  for (let i = 0; i < 9; i++) P(i % 2 ? "#e8e0c8" : "#8e1e35", 1 + i * 4, 3, 4, 4);
  P("#5e1230", 1, 7, 34, 1);
  for (let i = 0; i < 9; i++) P(i % 2 ? "#c8c0a8" : "#6e1428", 2 + i * 4, 8, 2, 1); // festón
  // Mercader encapuchado tras el mostrador
  P("#2a2240", 13, 10, 10, 10); P("#3a3058", 14, 10, 4, 9); P("#1a1428", 21, 11, 2, 9);
  P("#120c1c", 15, 12, 6, 4); P("#ffd86a", 16, 14, 1, 1); P("#ffd86a", 19, 14, 1, 1);  // ojos bajo la capucha
  // Mostrador
  P("#5a3a22", 4, 19, 28, 9); P("#7a5432", 4, 19, 28, 2); P("#3a2416", 4, 26, 28, 2);
  // Frascos de pociones
  const bottles = [["#ff4a5a", 7], ["#4a9aff", 12], ["#ffd86a", 23], ["#ff4a5a", 27]];
  for (const [col, bx] of bottles) {
    P("#e8e0f0", bx, 15, 2, 1); P(col, bx - 1, 16, 4, 3); P("#ffffff", bx - 1, 16, 1, 1);
  }
  // Farol con luz parpadeante
  const flick = 0.75 + 0.25 * Math.sin(t * 9) * Math.sin(t * 3.7);
  P("#2a2a30", 31, 9, 4, 1); P("#3a3a44", 31, 10, 4, 5);
  c.globalAlpha = flick; P("#ffcf5a", 32, 11, 2, 3); c.globalAlpha = 1;
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
#shop-ui .rows { display: grid; gap: 10px; }
#shop-ui .row { display: grid; grid-template-columns: 22px 1fr auto auto; gap: 12px; align-items: center;
  border: 2px solid #9c7416; padding: 10px 12px; background: #140e08; }
#shop-ui .row i { width: 14px; height: 18px; display: block; border: 2px solid #000; }
#shop-ui .row b { display: block; font-size: 16px; }
#shop-ui .row small { color: #a8935c; font-size: 13px; }
#shop-ui .row .own { font-family: "Press Start 2P", monospace; font-size: 9px; color: #a8935c; }
#shop-ui button { font-family: "Press Start 2P", monospace; font-size: 10px; color: #fbe7a1; background: #1c1408;
  border: 2px solid #e3b341; padding: 10px 12px; cursor: pointer; }
#shop-ui button:hover:not(:disabled), #shop-ui button:focus-visible { background: #e3b341; color: #1a1200; outline: none; }
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
    this.onKey = (e) => {
      if (!this.isOpen) return;
      if (["Escape", "KeyE"].includes(e.code)) {
        e.preventDefault();
        e.stopImmediatePropagation(); // que la misma tecla no abra después el menú del juego
        this.close();
      }
    };
    window.addEventListener("keydown", this.onKey, true);
  }

  open() {
    this.isOpen = true;
    this.render("");
    this.el.classList.add("show");
    setTimeout(() => this.el.querySelector("button")?.focus(), 50);
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.el.classList.remove("show");
    this.hooks.onClose();
  }

  render(msg) {
    const { gold, inventory } = this.hooks.getState();
    this.el.innerHTML = `
      <div class="shop-card">
        <h2>✦ POTION STALL</h2>
        <div class="sub">«Light is not free, little angel.» · «La luz no es gratis, angelito.»</div>
        <div class="gold">◆ ${gold} GOLD</div>
        <div class="rows">
          ${Object.values(SHOP_ITEMS).map((it) => `
            <div class="row">
              <i style="background:${it.color}"></i>
              <span><b>${it.name}</b><small>${it.nameEs} · ${[it.hp ? `+${it.hp} HP` : "", it.mp ? `+${it.mp} MP` : ""].filter(Boolean).join(" · ")}</small></span>
              <span class="own">×${inventory[it.id] || 0}</span>
              <button type="button" data-buy="${it.id}" ${gold < it.price ? "disabled" : ""}>${it.price} ◆</button>
            </div>`).join("")}
        </div>
        <div class="foot"><span class="msg">${msg}</span><button type="button" data-close>LEAVE (E)</button></div>
      </div>`;
    this.el.querySelectorAll("[data-buy]").forEach((b) => b.addEventListener("click", () => {
      const it = SHOP_ITEMS[b.dataset.buy];
      const ok = this.hooks.buy(it.id);
      this.hooks.onSound?.(ok);
      this.render(ok ? `✔ ${it.name} · ${it.nameEs}` : "✖ Not enough gold · Oro insuficiente");
      this.el.querySelector(`[data-buy="${it.id}"]`)?.focus();
    }));
    this.el.querySelector("[data-close]").addEventListener("click", () => this.close());
  }
}
