/**
 * SaveSystem · guardado de partidas y ajustes con localStorage
 * -----------------------------------------------------------
 * Tres ranuras de partida y un registro de ajustes (volúmenes). Todas las
 * operaciones toleran que localStorage no esté disponible (modo privado).
 */

const SLOT_KEY = (n) => `evil-angel:save:${n}`;
const SETTINGS_KEY = "evil-angel:settings";
export const SLOT_COUNT = 3;

/** Ajustes por defecto (audio, juego, pantalla y mando). */
export const DEFAULT_SETTINGS = Object.freeze({
  master: 1, music: 0.6, sfx: 0.8,                    // audio
  difficulty: "normal", subtitles: true, hints: true, // juego
  voice: true, speaking: false,                       // listening y speaking
  shake: true, flashes: true, particles: "high",      // efectos
  minimap: true, minimapSize: "medium", coords: true, touch: "auto",         // pantalla y táctil
  vibration: true, deadzone: 0.25,                    // mando
});

function read(key) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}

export const SaveSystem = {
  /** Guarda una partida en la ranura n (1–3). */
  save(n, data) {
    return write(SLOT_KEY(n), { ...data, savedAt: Date.now(), version: 3 });
  },
  load(n) {
    const d = read(SLOT_KEY(n));
    return d && typeof d === "object" && d.stats && d.stats.maxHp ? d : null;     // ignora guardados corruptos
  },
  remove(n) {
    try { localStorage.removeItem(SLOT_KEY(n)); } catch { /* sin almacenamiento */ }
  },
  /** Resumen de las tres ranuras (null si están vacías). */
  list() {
    return Array.from({ length: SLOT_COUNT }, (_, i) => ({ slot: i + 1, data: read(SLOT_KEY(i + 1)) }));
  },
  /** Ranura guardada más reciente, o null. */
  latest() {
    return this.list().filter((s) => s.data).sort((a, b) => b.data.savedAt - a.data.savedAt)[0] || null;
  },
  settings() {
    return { ...DEFAULT_SETTINGS, ...(read(SETTINGS_KEY) || {}) };
  },
  saveSettings(s) {
    write(SETTINGS_KEY, s);
  },
};
