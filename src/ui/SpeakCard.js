/**
 * SpeakCard · reto de pronunciación (Speaking)
 * --------------------------------------------
 * Muestra una frase en inglés (con traducción), permite escucharla (🔊) y repetirla con el micrófono (🎤).
 * La voz del jugador se reconoce con la Web Speech API y se puntúa de 0 a 100 %.
 *   ≥ 70 %  → superado    ·    si el navegador no soporta micrófono: modo «asistido» (leer en voz alta y confirmar).
 *
 *   const r = await runSpeakCard(container, { phrase, es, limitMs, title });
 *   r = { ok, score, heard, assisted, skipped }
 *
 * El contenedor se vacía y se rellena; las teclas: R = escuchar, Espacio/Enter = hablar, Esc = saltar.
 */

import { speak, listen, supported, cancel } from "../audio/Voice.js";

export function runSpeakCard(container, { phrase, es = "", limitMs = 26000, title = "SAY IT! · ¡DILO!", pass = 0.7 } = {}) {
  return new Promise((resolve) => {
    const assisted = !supported.stt;
    container.innerHTML = `
      <div class="sc-title">🎤 ${title}</div>
      <div class="sc-phrase">${phrase}</div>
      <div class="sc-es">${es}</div>
      <div class="sc-row">
        <button type="button" data-sc="hear">🔊 HEAR (R)</button>
        <button type="button" data-sc="talk" class="main">${assisted ? "✔ I SAID IT" : "🎤 SPEAK"}</button>
        <button type="button" data-sc="skip">SKIP</button>
      </div>
      <div class="sc-meter"><i></i></div>
      <div class="sc-status">${assisted ? "Microphone not available · Read it aloud, then confirm. · Micrófono no disponible: léelo en voz alta y confirma." : "Press SPEAK and say the sentence clearly. · Pulsa HABLAR y di la frase."}</div>`;
    const $ = (s) => container.querySelector(s);
    const status = $(".sc-status"), meter = $(".sc-meter i"), talk = $('[data-sc="talk"]');
    let busy = false, done = false;
    const finish = (r) => { if (done) return; done = true; cancel(); window.removeEventListener("keydown", onKey, true); resolve(r); };
    // Sin temporizador: la tarjeta espera a que el jugador pulse HABLAR y diga la frase; solo termina al acertar o al saltar (sin presión de tiempo).
    const hear = () => speak(phrase, { rate: 0.85, force: true });
    const say = async () => {
      if (busy || done) return;
      if (assisted) { finish({ ok: true, score: 0.7, heard: phrase, assisted: true }); return; }
      cancel();                                               // corta cualquier locución del 🔊 para que el micro no se oiga a sí mismo
      await new Promise((r) => setTimeout(r, 120));
      busy = true; talk.classList.add("rec"); talk.textContent = "● LISTENING…"; status.textContent = "Listening… speak now · Escuchando… habla ahora";
      const r = await listen({ expect: phrase, pass, timeout: 15000 });
      busy = false; talk.classList.remove("rec"); talk.textContent = "🎤 SPEAK AGAIN · HABLAR OTRA VEZ";
      if (r.unsupported) { status.textContent = "No microphone · Sin micrófono. Press I SAID IT to continue."; talk.textContent = "✔ I SAID IT"; talk.onclick = () => finish({ ok: true, score: 0.7, heard: phrase, assisted: true }); return; }
      meter.style.width = Math.round(r.score * 100) + "%";
      meter.style.background = r.ok ? "linear-gradient(90deg,#4fbf8c,#9dffcf)" : "linear-gradient(90deg,#ff4d6a,#ffb07a)";
      if (r.ok) { status.innerHTML = `✔ ${Math.round(r.score * 100)}% · <b>“${r.heard}”</b> · ¡Muy bien!`; setTimeout(() => finish({ ...r, ok: true }), 900); }
      else { status.innerHTML = r.heard ? `✖ ${Math.round(r.score * 100)}% · I heard: “${r.heard}” — press SPEAK to try again · pulsa HABLAR para reintentar` : `✖ I could not hear you — press SPEAK and speak clearly · pulsa HABLAR y habla claro.`; }
    };
    $('[data-sc="hear"]').addEventListener("click", hear);
    talk.addEventListener("click", say);
    $('[data-sc="skip"]').addEventListener("click", () => finish({ ok: false, score: 0, heard: "", skipped: true }));
    const onKey = (e) => {
      if (e.code === "KeyR") { e.preventDefault(); e.stopImmediatePropagation(); hear(); }
      else if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); e.stopImmediatePropagation(); say(); }
      else if (e.code === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); $('[data-sc="skip"]').click(); }
    };
    window.addEventListener("keydown", onKey, true);
    setTimeout(hear, 350);
    setTimeout(() => talk.focus({ preventScroll: true }), 80);
  });
}

export const SPEAK_CSS = `
.sc-title { font-family: "Press Start 2P", monospace; font-size: 12px; letter-spacing: .12em; color: #ffd86a; text-shadow: 0 0 10px rgba(227,179,65,.55); margin-bottom: 12px; }
.sc-phrase { font-family: "Pixelify Sans", monospace; font-size: clamp(20px, 3.4vw, 30px); color: #fff6d0; line-height: 1.25; margin: 6px 0; text-shadow: 0 0 10px rgba(227,179,65,.4); }
.sc-es { color: #a8935c; font-size: 17px; margin-bottom: 14px; }
.sc-row { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
.sc-row button { font-family: "Press Start 2P", monospace; font-size: 10px; color: #fbe7a1; background: #1c1408; border: 2px solid #e3b341; padding: 11px 13px; cursor: pointer; }
.sc-row button:hover, .sc-row button:focus { background: #e3b341; color: #1a1200; outline: none; }
.sc-row button.main { border-color: #9dffcf; }
.sc-row button.rec { background: #7a1a2a; color: #fff; border-color: #ff6a8a; animation: gmblink .6s steps(2) infinite; }
.sc-meter { height: 8px; background: #140c10; border: 1px solid #000; box-shadow: 0 0 0 1px #9c7416; margin: 14px 0 8px; }
.sc-meter i { display: block; height: 100%; width: 0; transition: width .4s; }
.sc-status { min-height: 2.4em; color: #9dffcf; font-size: 15px; line-height: 1.3; }
`;
