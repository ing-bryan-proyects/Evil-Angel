/**
 * SaveSystem · guardado de partidas y ajustes con localStorage
 * -----------------------------------------------------------
 * Tres ranuras de partida y un registro de ajustes (volúmenes). Todas las
 * operaciones toleran que localStorage no esté disponible (modo privado).
 */

const SLOT_KEY = (n) => `evil-angel:save:${n}`;
const SETTINGS_KEY = "evil-angel:settings";
export const SLOT_COUNT = 3;

function read(key) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}

export const SaveSystem = {
  /** Guarda una partida en la ranura n (1–3). */
  save(n, data) {
    return write(SLOT_KEY(n), { ...data, savedAt: Date.now(), version: 1 });
  },
  load(n) {
    return read(SLOT_KEY(n));
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
    return { music: 0.6, sfx: 0.8, ...(read(SETTINGS_KEY) || {}) };
  },
  saveSettings(s) {
    write(SETTINGS_KEY, s);
  },
};
