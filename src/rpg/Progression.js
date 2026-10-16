/**
 * Progression · niveles, estadísticas por raza, habilidades especiales
 * --------------------------------------------------------------------
 *   RACES        Multiplicadores por raza (Abel es un arcángel: mucha magia y sabiduría).
 *   STATS        VIT (vida) · STR (fuerza) · MAG (poder mágico y maná) · DEF (defensa)
 *                AGI (velocidad, esquiva y críticos) · WIS (sabiduría: más tiempo para responder
 *                y más experiencia por lección). Aprender inglés también hace más fuerte a Abel.
 *   SPECIALS     Ataques especiales: se aprenden por nivel (o al unirse un aliado), y cada uno puede
 *                subir de nivel (1–5) gastando Puntos de Habilidad. El tope depende del nivel del héroe.
 *   Progression  Estado del héroe + reparto de puntos + serialización para guardar partida.
 */
import { EQUIPMENT } from "./Equipment.js";

export const RACES = Object.freeze({
  archangel: { id: "archangel", name: "Archangel", es: "Arcángel", hp: 1.0, mp: 1.35, str: 0.95, mag: 1.35, def: 0.9, agi: 1.05, wis: 1.3,
    perk: "Flies with radiant wings · Vuela con alas radiantes", growth: ["mag", "wis", "agi"] },
  human:     { id: "human", name: "Human", es: "Humano", hp: 1.1, mp: 1.0, str: 1.1, mag: 1.0, def: 1.0, agi: 1.0, wis: 1.0, perk: "Balanced · Equilibrado", growth: ["vit", "str", "def"] },
  android:   { id: "android", name: "Android", es: "Androide", hp: 1.25, mp: 0.85, str: 1.0, mag: 0.9, def: 1.3, agi: 0.9, wis: 1.1, perk: "Armored chassis · Chasis blindado", growth: ["vit", "def", "wis"] },
});

export const STATS = Object.freeze([
  { id: "vit", label: "VIT", name: "Vitality", es: "Vitalidad", desc: "+8 HP per point · +8 HP por punto" },
  { id: "str", label: "STR", name: "Strength", es: "Fuerza", desc: "Physical damage · Daño físico" },
  { id: "mag", label: "MAG", name: "Magic", es: "Magia", desc: "Special damage and +3 MP · Daño especial y +3 MP" },
  { id: "def", label: "DEF", name: "Defense", es: "Defensa", desc: "Reduces damage taken · Reduce el daño recibido" },
  { id: "agi", label: "AGI", name: "Agility", es: "Agilidad", desc: "Crits, dodge and dash · Críticos, esquiva y dash" },
  { id: "wis", label: "WIS", name: "Wisdom", es: "Sabiduría", desc: "+0.3 s to answer, +XP · +0,3 s para responder y +XP" },
]);

export const MAX_LEVEL = 40;
export const MAX_SPECIAL_LEVEL = 5;

/** XP necesaria para pasar del nivel `lv` al siguiente. */
export const xpToNext = (lv) => Math.round(35 * Math.pow(lv, 1.55));
/** Tope de nivel de un especial según el nivel del héroe: 1 hasta Lv.3, 2 hasta Lv.6… */
export const specialCap = (heroLevel) => Math.min(MAX_SPECIAL_LEVEL, 1 + Math.floor((heroLevel - 1) / 3));
/** Coste en Puntos de Habilidad de subir de `lv` a `lv+1`. */
export const upgradeCost = (lv) => lv;

/**
 * Definición de los ataques especiales (los guiones de escena están en combat/Scenes.js).
 *   owner     "abel" o el aliado que ayuda
 *   unlock    nivel de Abel que lo desbloquea (los asistentes se desbloquean al unirse el aliado)
 *   mp / bond coste de maná (Abel) o de cargas de vínculo (asistentes)
 *   tier      dificultad de la pregunta de inglés: A1 (fácil) · A2 (difícil)
 *   power     daño base [mín, máx] al nivel 1 del especial
 */
export const SPECIALS = Object.freeze({
  holyWord:     { id: "holyWord", owner: "abel", name: "Holy Word", es: "Palabra Sagrada", mp: 0, unlock: 1, tier: "A1", power: [17, 23], scene: "abel_holy", color: "#fbe7a1", desc: "A word of light flies at the enemy. · Una palabra de luz vuela hacia el enemigo." },
  celestial:    { id: "celestial", owner: "abel", name: "Celestial Wrath", es: "Ira Celestial", mp: 18, unlock: 2, tier: "A2", power: [34, 42], scene: "abel_celestial", color: "#ffd86a", desc: "Golden wings and a beam of dawn. · Alas doradas y un rayo del alba." },
  sword:        { id: "sword", owner: "abel", name: "Sword of Light", es: "Espada de Luz", mp: 28, unlock: 5, tier: "A2", power: [50, 62], scene: "abel_sword", color: "#fff0a0", desc: "A blade of pure light cuts the dark. · Una hoja de luz pura corta la oscuridad." },
  ariaIce:      { id: "ariaIce", owner: "aria", assist: true, name: "Ice Storm", es: "Tormenta de Hielo", bond: 1, tier: "A1", power: [30, 38], scene: "aria_ice", color: "#bfe8ff", desc: "Aria raises a field of ice. · Aria levanta un campo de hielo." },
  ariaWater:    { id: "ariaWater", owner: "aria", assist: true, name: "Water Torrent", es: "Torrente de Agua", bond: 2, tier: "A2", power: [46, 56], scene: "aria_water", color: "#7ad8ff", desc: "A great wave crashes down. · Una gran ola rompe sobre el enemigo." },
  bennyMeteor:  { id: "bennyMeteor", owner: "benny", assist: true, name: "Meteor Impact", es: "Impacto Meteórico", bond: 1, tier: "A1", power: [32, 40], scene: "benny_meteor", color: "#ff9a3a", desc: "Benny falls like a burning star. · Benny cae como una estrella ardiente." },
  bennyTornado: { id: "bennyTornado", owner: "benny", assist: true, name: "Fire Tornado", es: "Tornado Ígneo", bond: 2, tier: "A2", power: [46, 58], scene: "benny_tornado", color: "#ff7a1e", desc: "A spiral of flames. · Una espiral de llamas." },
  milevaFury:   { id: "milevaFury", owner: "mileva", assist: true, name: "Seismic Fury", es: "Furia Sísmica", bond: 1, tier: "A1", power: [30, 38], scene: "mileva_fury", color: "#9bd85a", desc: "Mileva splits the ground. · Mileva abre la tierra." },
  milevaFissure:{ id: "milevaFissure", owner: "mileva", assist: true, name: "Earth Fissure", es: "Fisura Terrestre", bond: 2, tier: "A2", power: [44, 56], scene: "mileva_fissure", color: "#c8f070", desc: "A burst of green energy. · Una explosión de energía verde." },
  chloeHearts:  { id: "chloeHearts", owner: "chloe", assist: true, name: "Corrupt Hearts", es: "Furia de Corazones", bond: 1, tier: "A1", power: [32, 40], scene: "chloe_hearts", color: "#ff6ab8", desc: "A storm of pink flames. · Una tormenta de llamas rosas." },
  chloeSpin:    { id: "chloeSpin", owner: "chloe", assist: true, name: "Seismic Spin", es: "Giro Sísmico", bond: 2, tier: "A2", power: [46, 58], scene: "chloe_spin", color: "#ff9a6a", desc: "A spinning kick that shakes the earth. · Una patada giratoria que sacude la tierra." },
  arcArtillery: { id: "arcArtillery", owner: "arc", assist: true, name: "Artillery Mode", es: "Modo Artillería", bond: 1, tier: "A1", power: [34, 42], scene: "arc_artillery", color: "#ffcf5a", desc: "A rocket from Unit-A.R.C. · Un cohete de Unit-A.R.C." },
  arcShock:     { id: "arcShock", owner: "arc", assist: true, name: "Shock Discharge", es: "Descarga de Choque", bond: 2, tier: "A2", power: [46, 58], scene: "arc_shock", color: "#7ad0ff", desc: "A dome of lightning. · Una cúpula de relámpagos." },
});

export const HEROES = Object.freeze({
  abel:   { id: "abel", name: "Abel", title: "Fallen Seraph · Serafín caído", race: "archangel", base: { vit: 8, str: 7, mag: 10, def: 6, agi: 8, wis: 9 } },
});

const ALLY_NAMES = { aria: "Aria", benny: "Benny", mileva: "Mileva", chloe: "Chloe", arc: "Unit-A.R.C." };
export const allyName = (id) => ALLY_NAMES[id] || id;

export class Progression {
  constructor(id = "abel") {
    this.id = id;
    const h = HEROES[id];
    this.race = RACES[h.race];
    this.level = 1; this.xp = 0;
    this.points = 0;                       // puntos de estadística sin repartir
    this.skillPoints = 0;                  // puntos de habilidad
    this.stats = { ...h.base };
    this.equipped = { weapon: null, armor: null, trinket: null };   // id de EQUIPMENT en cada ranura (o null)
    this.spLevels = { holyWord: 1 };       // nivel de cada especial aprendido
    this.party = new Set();                // aliados que se han unido
    this.bond = 0;                         // cargas de vínculo (0–3)
    this.pending = [];                     // avisos de subida de nivel / nuevo ataque
  }

  /* ---------- equipo ---------- */
  /** Suma del `bonus[key]` de todas las piezas equipadas. */
  gear(key) { let s = 0; for (const id of Object.values(this.equipped)) { const it = id && EQUIPMENT[id]; if (it && it.bonus[key]) s += it.bonus[key]; } return s; }
  equip(id) { const it = EQUIPMENT[id]; if (!it) return false; this.equipped[it.slot] = id; return true; }
  unequip(slot) { if (slot in this.equipped) this.equipped[slot] = null; }

  /* ---------- derivados (incluyen los bonos del equipo) ---------- */
  get maxHp() { return Math.round(60 + this.stats.vit * 8 * this.race.hp + (this.level - 1) * 4 + this.gear("hp")); }
  get maxMp() { return Math.round(30 + this.stats.mag * 3 * this.race.mp + this.stats.wis * 1.5 + this.gear("mp") + this.gear("wis") * 1.5); }
  get atk() { return this.stats.str * this.race.str + this.gear("atk"); }
  get magic() { return this.stats.mag * this.race.mag + this.gear("mag"); }
  get defense() { return this.stats.def * this.race.def + this.gear("def"); }
  get agility() { return this.stats.agi * this.race.agi + this.gear("agi"); }
  get critChance() { return Math.min(0.6, 0.04 + this.agility * 0.008 + this.gear("crit")); }
  get timeBonus() { return (this.stats.wis + this.gear("wis")) * this.race.wis * 0.3; }           // segundos extra para responder
  get xpNext() { return xpToNext(this.level); }
  get specialCap() { return specialCap(this.level); }

  /** Reducción de daño por defensa (cada punto de DEF quita ~2,2 %, máx. 60 %). */
  mitigate(raw) { return Math.max(1, Math.round(raw * (1 - Math.min(0.6, this.defense * 0.022)))); }
  /** Daño de un ataque básico físico (explorador en tiempo real): multiplicador. */
  get strikePower() { return 1 + (this.atk - 7) * 0.05; }

  /** Daño de un especial según su nivel, MAG y un tirón aleatorio (con posibilidad de crítico). */
  specialDamage(id, { swift = false, rng = Math.random } = {}) {
    const sp = SPECIALS[id];
    const lv = this.spLevels[id] || 1;
    const [lo, hi] = sp.power;
    let d = lo + (hi - lo) * rng();
    d *= 1 + 0.32 * (lv - 1);
    d *= 1 + (this.magic - 10) * 0.025 + (sp.id === "holyWord" ? (this.atk - 7) * 0.02 : 0);
    if (swift) d *= 1.25;
    const crit = rng() < this.critChance;
    if (crit) d *= 1.5;
    return { dmg: Math.max(1, Math.round(d)), crit };
  }

  /* ---------- progreso ---------- */
  gainXp(n) {
    n = Math.round(n * (1 + (this.stats.wis * this.race.wis - 9) * 0.015));
    this.xp += n;
    let ups = 0;
    while (this.level < MAX_LEVEL && this.xp >= this.xpNext) {
      this.xp -= this.xpNext; this.level++; ups++;
      this.points += 3;
      if (this.level % 2 === 0) this.skillPoints += 1;
      for (const g of this.race.growth) this.stats[g] += 1;                  // crecimiento propio de la raza
      for (const sp of Object.values(SPECIALS)) {
        if (sp.owner === this.id && !sp.assist && sp.unlock === this.level && !this.spLevels[sp.id]) {
          this.spLevels[sp.id] = 1;
          this.pending.push({ type: "learn", id: sp.id });
        }
      }
      this.pending.push({ type: "level", level: this.level });
    }
    if (this.level >= MAX_LEVEL) this.xp = 0;
    return { gained: n, ups };
  }
  /** Asigna un punto libre a una estadística. */
  allocate(stat) {
    if (this.points < 1 || !(stat in this.stats)) return false;
    this.stats[stat]++; this.points--;
    return true;
  }
  /** ¿Se puede subir este especial? Devuelve {ok, why}. */
  canUpgrade(id) {
    const lv = this.spLevels[id];
    if (!lv) return { ok: false, why: "Not learned" };
    if (lv >= MAX_SPECIAL_LEVEL) return { ok: false, why: "MAX" };
    if (lv >= this.specialCap) return { ok: false, why: `Needs hero Lv.${1 + 3 * lv}` };
    if (this.skillPoints < upgradeCost(lv)) return { ok: false, why: `${upgradeCost(lv)} SP` };
    return { ok: true, why: `${upgradeCost(lv)} SP` };
  }
  upgrade(id) {
    const c = this.canUpgrade(id);
    if (!c.ok) return false;
    this.skillPoints -= upgradeCost(this.spLevels[id]);
    this.spLevels[id]++;
    return true;
  }
  /** Un aliado se une al grupo: aprende sus asistencias (nivel 1). */
  join(allyId) {
    if (this.party.has(allyId)) return false;
    this.party.add(allyId);
    for (const sp of Object.values(SPECIALS)) if (sp.owner === allyId && !this.spLevels[sp.id]) this.spLevels[sp.id] = 1;
    return true;
  }
  /** Especiales disponibles para el menú de combate, ordenados: Abel primero. */
  available() {
    return Object.values(SPECIALS).filter((sp) => this.spLevels[sp.id] && sp.id !== "holyWord");
  }
  addBond(n = 1) { this.bond = Math.min(3, this.bond + n); }

  /* ---------- guardado ---------- */
  toJSON() {
    return { id: this.id, level: this.level, xp: this.xp, points: this.points, skillPoints: this.skillPoints, stats: this.stats, spLevels: this.spLevels, party: [...this.party], bond: this.bond, equipped: this.equipped };
  }
  static from(d) {
    const p = new Progression(d?.id || "abel");
    if (!d) return p;
    p.level = d.level ?? 1; p.xp = d.xp ?? 0; p.points = d.points ?? 0; p.skillPoints = d.skillPoints ?? 0;
    p.stats = { ...p.stats, ...(d.stats || {}) }; p.spLevels = { holyWord: 1, ...(d.spLevels || {}) };
    p.party = new Set(d.party || []); p.bond = d.bond ?? 0;
    p.equipped = { weapon: null, armor: null, trinket: null, ...(d.equipped || {}) };
    return p;
  }
}
