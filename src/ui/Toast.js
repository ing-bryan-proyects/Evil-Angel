/**
 * Toast · avisos breves en pantalla ("Mando conectado", "Partida guardada"…).
 */
let host = null;

export function toast(text, ms = 2200) {
  if (!host) {
    host = document.createElement("div");
    host.id = "toast-host";
    Object.assign(host.style, {
      position: "fixed", left: "50%", top: "14px", transform: "translateX(-50%)", zIndex: "99",
      display: "grid", gap: "6px", pointerEvents: "none", fontFamily: '"Press Start 2P", monospace',
    });
    document.body.appendChild(host);
  }
  const t = document.createElement("div");
  t.textContent = text;
  Object.assign(t.style, {
    background: "rgba(10,6,18,.94)", border: "2px solid #e3b341", color: "#fbe7a1", padding: "9px 14px", fontSize: "10px",
    letterSpacing: ".08em", boxShadow: "0 0 18px rgba(227,179,65,.35)", opacity: "0", transition: "opacity .25s",
    textAlign: "center", maxWidth: "86vw",
  });
  host.appendChild(t);
  requestAnimationFrame(() => (t.style.opacity = "1"));
  setTimeout(() => { t.style.opacity = "0"; setTimeout(() => t.remove(), 300); }, ms);
}
