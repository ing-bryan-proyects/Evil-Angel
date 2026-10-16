/**
 * Voice · inglés hablado (Listening) y retos de pronunciación (Speaking)
 * ---------------------------------------------------------------------
 *   speak(text, {rate, lang})     lee un texto en inglés con la voz del navegador (Web Speech API)
 *   cancel()                      corta lo que se esté leyendo
 *   listen({expect, timeout})     abre el micrófono y reconoce lo que dice el jugador;
 *                                 devuelve {heard, score, ok}. score = similitud 0–1 con lo esperado.
 *   supported                     { tts, stt } disponibilidad en este navegador
 *
 * Si el navegador no soporta reconocimiento de voz (Firefox, algunos iOS), los retos de
 * speaking se pueden saltar o repetir en modo «pronunciación asistida» (el juego dice la
 * frase y el jugador la repite sin evaluación).
 */

const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
const SR = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

export const supported = { tts: !!synth, stt: !!SR };
let enabled = true;
let voice = null;

function pickVoice() {
  if (!synth) return null;
  const vs = synth.getVoices();
  if (!vs.length) return null;
  const en = vs.filter((v) => /^en[-_]/i.test(v.lang));
  const pref = en.find((v) => /natural|google us|samantha|aria|jenny|zira|female/i.test(v.name)) || en.find((v) => /en[-_]US/i.test(v.lang)) || en[0];
  return pref || null;
}
if (synth) { synth.onvoiceschanged = () => { voice = pickVoice(); }; voice = pickVoice(); }

export function setVoiceEnabled(on) { enabled = !!on; if (!on) cancel(); }

export function speak(text, { rate = 0.92, pitch = 1, lang = "en-US", force = false } = {}) {
  if (!synth || (!enabled && !force) || !text) return Promise.resolve();
  return new Promise((resolve) => {
    try {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(String(text).replace(/\*|_/g, ""));
      u.lang = lang; u.rate = rate; u.pitch = pitch;
      if (!voice) voice = pickVoice();
      if (voice) u.voice = voice;
      u.onend = u.onerror = () => resolve();
      synth.speak(u);
      setTimeout(resolve, 12000);                         // por si el navegador nunca dispara onend
    } catch { resolve(); }
  });
}
export function cancel() { try { synth?.cancel(); } catch { /* sin voz */ } }

/** Similitud entre lo dicho y lo esperado (palabras en común, ignorando mayúsculas y puntuación). */
export function similarity(a, b) {
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9' ]/g, " ").split(/\s+/).filter(Boolean);
  const A = norm(a), B = norm(b);
  if (!B.length) return 0;
  let hit = 0;
  const pool = [...A];
  for (const w of B) { const i = pool.indexOf(w); if (i >= 0) { hit++; pool.splice(i, 1); } else if (pool.some((p) => lev(p, w) <= (w.length > 4 ? 1 : 0))) hit += 0.8; }
  return Math.min(1, hit / B.length);
}
function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/**
 * Escucha al jugador. Devuelve {heard, score, ok, unsupported?, error?}.
 *
 * El reconocedor de Chrome termina solo al primer silencio (y antes descartaba lo dicho): aquí se usa en modo
 * CONTINUO con resultados PARCIALES, se guarda la mejor transcripción vista y, si el navegador corta antes de
 * tiempo (onend / "no-speech"), se reinicia hasta agotar `timeout`. Así el jugador tiene margen para hablar y
 * nunca se pierde lo que dijo aunque haga una pausa.
 */
export function listen({ expect = "", timeout = 11000, lang = "en-US", pass = 0.7 } = {}) {
  if (!SR) return Promise.resolve({ heard: "", score: 0, ok: false, unsupported: true });
  return new Promise((resolve) => {
    let done = false, rec = null;
    const best = { heard: "", score: 0, ok: false };
    const t0 = Date.now();
    const finish = (r) => { if (done) return; done = true; try { rec && rec.stop(); } catch { /* ya parado */ } resolve(r); };
    const score = (txt) => { const s = similarity(txt, expect); if (s > best.score) { best.heard = txt; best.score = s; best.ok = s >= pass; } };
    const remaining = () => timeout - (Date.now() - t0);
    const restart = () => { if (done || remaining() < 600) { finish({ ...best }); return; } try { rec.start(); } catch { setTimeout(() => { if (!done) try { rec.start(); } catch { finish({ ...best }); } }, 180); } };
    const make = () => {
      rec = new SR();
      rec.lang = lang; rec.interimResults = true; rec.maxAlternatives = 5; rec.continuous = true;
      rec.onresult = (e) => {
        for (let i = e.resultIndex; i < e.results.length; i++) for (const a of [...e.results[i]]) score(a.transcript);
        if (best.ok) finish({ ...best });
      };
      rec.onerror = (e) => {
        if (e.error === "no-speech" || e.error === "aborted" || e.error === "network") { restart(); return; }
        finish(best.heard ? { ...best } : { heard: "", score: 0, ok: false, error: e.error });   // not-allowed / audio-capture: micrófono bloqueado
      };
      rec.onend = () => { if (!done) restart(); };
      try { rec.start(); } catch (err) { finish({ heard: "", score: 0, ok: false, error: String(err) }); }
    };
    make();
    setTimeout(() => finish({ ...best, error: best.heard ? undefined : "timeout" }), timeout);
  });
}
