/**
 * Equipment · armas y equipo de Abel
 * ----------------------------------
 * El jugador compra equipo en la tienda, lo equipa/quita en el inventario (menú) y cambia sus estadísticas.
 * Ranuras: weapon (arma), armor (armadura), trinket (reliquia). Cada objeto tiene una RAREZA (color + potencia).
 *
 *   EQUIPMENT[id] = { id, name, nameEs, slot, kind, rarity, price, bonus:{atk,def,mag,hp,mp,crit,agi}, desc, descEs }
 *   drawEquipIcon(ctx, x, y, kind, color)   icono pixel-art para tienda/menú (16×16)
 *
 * Los `bonus` se suman a las estadísticas DERIVADAS de Progression (atk, magic, defense, maxHp, maxMp, crit, agility).
 */

export const SLOTS = [
  ["weapon", "Weapon", "Arma"],
  ["armor", "Armor", "Armadura"],
  ["trinket", "Relic", "Reliquia"],
];

export const RARITIES = {
  common: { id: "common", label: ["Common", "Común"], color: "#b8c0c8" },
  rare: { id: "rare", label: ["Rare", "Raro"], color: "#5aa0ff" },
  epic: { id: "epic", label: ["Epic", "Épico"], color: "#c06aff" },
  celestial: { id: "celestial", label: ["Celestial", "Celestial"], color: "#ffd86a" },
};

export const EQUIPMENT = Object.freeze({
  /* ---- Espadas (equilibradas: ataque + algo de crítico) ---- */
  swordIron: { id: "swordIron", name: "Iron Sword", nameEs: "Espada de hierro", slot: "weapon", kind: "sword", rarity: "common", price: 45, bonus: { atk: 6, crit: 0.03 }, desc: "A sturdy blade.", descEs: "Una hoja resistente." },
  swordSilver: { id: "swordSilver", name: "Silver Edge", nameEs: "Filo de plata", slot: "weapon", kind: "sword", rarity: "rare", price: 110, bonus: { atk: 12, crit: 0.05 }, desc: "Bites through fur and dark.", descEs: "Corta el pelaje y la oscuridad." },
  swordDawn: { id: "swordDawn", name: "Dawnbreaker", nameEs: "Rompealbas", slot: "weapon", kind: "sword", rarity: "epic", price: 230, bonus: { atk: 20, crit: 0.08, mag: 6 }, desc: "Glows at first light.", descEs: "Brilla con la primera luz." },
  /* ---- Arcos (ágiles: ataque + crítico alto) ---- */
  bowHunter: { id: "bowHunter", name: "Hunter's Bow", nameEs: "Arco del cazador", slot: "weapon", kind: "bow", rarity: "common", price: 50, bonus: { atk: 4, crit: 0.06, agi: 2 }, desc: "Light and swift.", descEs: "Ligero y veloz." },
  bowStorm: { id: "bowStorm", name: "Stormcaller Bow", nameEs: "Arco tormenta", slot: "weapon", kind: "bow", rarity: "rare", price: 120, bonus: { atk: 9, crit: 0.1, agi: 3 }, desc: "Arrows ride the wind.", descEs: "Las flechas cabalgan el viento." },
  bowSeraph: { id: "bowSeraph", name: "Seraph's Longbow", nameEs: "Arco largo del serafín", slot: "weapon", kind: "bow", rarity: "epic", price: 240, bonus: { atk: 15, crit: 0.14, agi: 4 }, desc: "Never misses the wicked.", descEs: "Nunca falla al malvado." },
  /* ---- Hachas (brutas: mucho ataque, sin crítico) ---- */
  axeWood: { id: "axeWood", name: "Woodcutter Axe", nameEs: "Hacha de leñador", slot: "weapon", kind: "axe", rarity: "common", price: 48, bonus: { atk: 8 }, desc: "Heavy and honest.", descEs: "Pesada y honesta." },
  axeWar: { id: "axeWar", name: "War Cleaver", nameEs: "Hendidora de guerra", slot: "weapon", kind: "axe", rarity: "rare", price: 125, bonus: { atk: 16, hp: 12 }, desc: "Cleaves through guard.", descEs: "Parte la guardia." },
  axeTitan: { id: "axeTitan", name: "Titan's Maul", nameEs: "Mazo del titán", slot: "weapon", kind: "axe", rarity: "epic", price: 250, bonus: { atk: 26, hp: 20 }, desc: "The ground trembles.", descEs: "La tierra tiembla." },
  /* ---- Armas celestiales (legendarias: ataque + magia + vida) ---- */
  bladeHalo: { id: "bladeHalo", name: "Halo Blade", nameEs: "Hoja de halo", slot: "weapon", kind: "celestial", rarity: "celestial", price: 420, bonus: { atk: 22, mag: 18, hp: 25, crit: 0.07 }, desc: "Forged from dawn itself.", descEs: "Forjada del alba misma." },
  spearLumen: { id: "spearLumen", name: "Lumen Spear", nameEs: "Lanza de Lumen", slot: "weapon", kind: "celestial", rarity: "celestial", price: 460, bonus: { atk: 18, mag: 26, mp: 25, crit: 0.06 }, desc: "A shard of the heavens.", descEs: "Una esquirla de los cielos." },
  /* ---- Armaduras ---- */
  robeAcolyte: { id: "robeAcolyte", name: "Acolyte Robe", nameEs: "Túnica de acólito", slot: "armor", kind: "robe", rarity: "common", price: 40, bonus: { def: 4, mp: 15 }, desc: "Woven with calm.", descEs: "Tejida con calma." },
  mailChain: { id: "mailChain", name: "Chainmail", nameEs: "Cota de malla", slot: "armor", kind: "plate", rarity: "rare", price: 130, bonus: { def: 10, hp: 30 }, desc: "Turns aside fangs.", descEs: "Desvía los colmillos." },
  plateDawn: { id: "plateDawn", name: "Dawnsteel Plate", nameEs: "Placa de acero del alba", slot: "armor", kind: "plate", rarity: "epic", price: 260, bonus: { def: 18, hp: 50 }, desc: "Light made solid.", descEs: "Luz hecha sólida." },
  mantleSeraph: { id: "mantleSeraph", name: "Seraph Mantle", nameEs: "Manto del serafín", slot: "armor", kind: "robe", rarity: "celestial", price: 400, bonus: { def: 14, mag: 16, hp: 40, mp: 30 }, desc: "Feathers of pure light.", descEs: "Plumas de luz pura." },
  /* ---- Reliquias (trinket) ---- */
  ringAgile: { id: "ringAgile", name: "Swift Ring", nameEs: "Anillo veloz", slot: "trinket", kind: "ring", rarity: "common", price: 55, bonus: { agi: 4, crit: 0.05 }, desc: "Quickens the hand.", descEs: "Agiliza la mano." },
  amuletSage: { id: "amuletSage", name: "Sage Amulet", nameEs: "Amuleto del sabio", slot: "trinket", kind: "amulet", rarity: "rare", price: 140, bonus: { mag: 12, mp: 25, wis: 2 }, desc: "Whispers answers.", descEs: "Susurra respuestas." },
  haloCrown: { id: "haloCrown", name: "Halo Crown", nameEs: "Corona de halo", slot: "trinket", kind: "halo", rarity: "celestial", price: 440, bonus: { atk: 8, mag: 14, def: 8, hp: 25, crit: 0.06 }, desc: "The light crowns its own.", descEs: "La luz corona a los suyos." },
});

export const equipList = () => Object.values(EQUIPMENT);
export const rarityColor = (id) => RARITIES[EQUIPMENT[id]?.rarity]?.color || "#b8c0c8";

/** Resumen legible del bonus de un objeto (p. ej. "+12 ATK · +5% CRIT"). */
const STAT_LABEL = { atk: "ATK", def: "DEF", mag: "MAG", hp: "HP", mp: "MP", agi: "AGI", wis: "WIS", crit: "CRIT" };
export function bonusText(bonus) {
  return Object.entries(bonus).map(([k, v]) => k === "crit" ? `+${Math.round(v * 100)}% ${STAT_LABEL.crit}` : `+${v} ${STAT_LABEL[k] || k.toUpperCase()}`).join(" · ");
}

/** Icono pixel-art 16×16 del tipo de equipo, teñido con el color de la rareza. */
export function drawEquipIcon(c, x, y, kind, color) {
  const P = (col, a, b, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(x + a, y + b, w, h); };
  const dk = "#2a2018", steel = "#c8d0d8", steelHi = "#eef2f6", wood = "#7a5432";
  if (kind === "sword" || kind === "celestial") {
    const blade = kind === "celestial" ? color : steel;
    P(dk, 7, 1, 3, 11); P(blade, 8, 2, 1, 9); P(steelHi, 8, 2, 1, 4);     // hoja
    P("#9c7416", 5, 11, 7, 1); P(wood, 7, 12, 3, 3);                        // guarda y mango
    if (kind === "celestial") { P("#fff", 8, 1, 1, 1); P(color, 6, 11, 1, 1); P(color, 10, 11, 1, 1); }
  } else if (kind === "axe") {
    P(wood, 7, 2, 2, 12);                                                    // mango
    P(dk, 3, 2, 6, 6); P(steel, 4, 3, 5, 4); P(steelHi, 5, 3, 3, 1); P(steel, 9, 4, 2, 2);  // cabeza
  } else if (kind === "bow") {
    c.strokeStyle = color === "#b8c0c8" ? wood : color; c.lineWidth = 1;
    c.beginPath(); c.arc(x + 6, y + 8, 6, -1.1, 1.1); c.stroke();           // arco
    P("#e8e0c8", 10, 2, 1, 12);                                             // cuerda
    P(steelHi, 3, 7, 6, 1);                                                 // flecha
  } else if (kind === "robe" || kind === "plate") {
    P(color, 5, 3, 6, 2); P(color, 4, 5, 8, 8); P(dk, 4, 5, 8, 8);
    P(color, 5, 6, 6, 6); P(steelHi, 6, 6, 1, 5); if (kind === "plate") { P("#000", 7, 6, 2, 6); }
  } else {                                                                   // ring / amulet / halo
    c.strokeStyle = color; c.lineWidth = 2; c.beginPath(); c.arc(x + 8, y + 8, 4, 0, 6.3); c.stroke();
    P("#fff", 7, 3, 2, 2); if (kind === "halo") { P(color, 3, 8, 10, 1); }
  }
}
