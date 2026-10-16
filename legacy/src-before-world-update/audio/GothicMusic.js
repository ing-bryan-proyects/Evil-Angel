/**
 * GothicMusic · música procedural mística para la exploración
 * ----------------------------------------------------------
 * Progresión en Re menor (Dm – B♭ – Gm – A) a 60 BPM:
 *   - Coro de órgano: tríadas con ataque y caída lentos, filtradas.
 *   - Bordón grave en la tónica de cada acorde.
 *   - Campana: notas sueltas de la escala con cola larga.
 * Todo se genera con WebAudio y se enruta a un nodo de volumen propio.
 */

const N = (semi) => 146.83 * Math.pow(2, semi / 12); // semitonos desde D3

const PROGRESSION = [
  { root: N(0),  chord: [0, 3, 7] },   // Dm
  { root: N(-4), chord: [-4, 0, 3] },  // B♭
  { root: N(-7), chord: [-7, -4, 0] }, // Gm
  { root: N(-5), chord: [-5, -1, 2] }, // A (dominante)
];
const BELL_SCALE = [12, 15, 17, 19, 22, 24, 27];
const BAR = 4; // segundos por acorde

export class GothicMusic {
  /**
   * @param {AudioContext} ac
   * @param {AudioNode} destination  Nodo de volumen de música.
   */
  constructor(ac, destination) {
    this.ac = ac;
    this.out = ac.createGain();
    this.out.gain.value = 0;
    // Filtro paso bajo: suaviza el órgano y le da carácter de iglesia lejana
    this.filter = ac.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.value = 1400;
    this.out.connect(this.filter).connect(destination);
    this.timer = null;
    this.bar = 0;
    this.next = 0;
  }

  get playing() {
    return this.timer !== null;
  }

  start() {
    if (this.timer) return;
    const now = this.ac.currentTime;
    this.out.gain.cancelScheduledValues(now);
    this.out.gain.setValueAtTime(this.out.gain.value, now);
    this.out.gain.linearRampToValueAtTime(1, now + 2.5);   // entrada suave
    this.next = now + 0.1;
    this.timer = setInterval(() => this.#schedule(), 250);
    this.#schedule();
  }

  stop(fade = 1.5) {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
    const now = this.ac.currentTime;
    this.out.gain.cancelScheduledValues(now);
    this.out.gain.setValueAtTime(this.out.gain.value, now);
    this.out.gain.linearRampToValueAtTime(0, now + fade);
  }

  #voice(freq, start, dur, type, vol, attack, release) {
    const ac = this.ac;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol, start + attack);
    g.gain.setValueAtTime(vol, start + Math.max(attack, dur - release));
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(g).connect(this.out);
    osc.start(start);
    osc.stop(start + dur + 0.05);
  }

  #schedule() {
    while (this.next < this.ac.currentTime + 1.2) {
      const t = this.next;
      const { root, chord } = PROGRESSION[this.bar % PROGRESSION.length];
      // Coro de órgano: dos registros por nota, ligeramente desafinados (chorus)
      for (const s of chord) {
        const f = N(s + 12);
        this.#voice(f, t, BAR + 0.6, "triangle", 0.035, 1.2, 1.4);
        this.#voice(f * 1.003, t, BAR + 0.6, "sawtooth", 0.008, 1.6, 1.6);
      }
      // Bordón grave
      this.#voice(root / 2, t, BAR + 0.4, "sine", 0.07, 0.8, 1.2);
      // Campanas: 1–3 notas sueltas por compás
      const bells = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < bells; i++) {
        const when = t + Math.random() * (BAR - 0.5);
        const semi = BELL_SCALE[Math.floor(Math.random() * BELL_SCALE.length)];
        this.#voice(N(semi + 12), when, 2.4, "sine", 0.03, 0.01, 2.2);
        this.#voice(N(semi + 24), when, 1.2, "sine", 0.008, 0.01, 1.1); // armónico metálico
      }
      this.bar++;
      this.next += BAR;
    }
  }
}
