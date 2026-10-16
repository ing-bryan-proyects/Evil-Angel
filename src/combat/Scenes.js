/**
 * Scenes · guion de los ataques especiales (cinemáticas de combate)
 * -----------------------------------------------------------------
 * Cada escena es una lista de «pasos»: tiras de fotogramas de los atlas de especiales
 * (abel_sp, aria_sp…) que se reproducen a mayor tamaño sobre el combatiente, con título,
 * barras de cine, rayos, zoom de cámara, proyectiles y un instante de impacto.
 *
 *   SCENES[id] = { who, atlas, title:[nombre, subtítulo], color, zoom, cam, rays, steps:[…] }
 *   step: { anim, frames?, fps, scale?, dx?, dy?, impact?: n (fotograma que dispara el daño),
 *           projectile?: color, shake?, flash?, slowmo?: [escala, seg], hideActor? }
 *
 * playScene(stage, id, {onImpact, sfx}) devuelve una promesa que se resuelve al terminar.
 */

export const SCENES = {
  /* ------------------------- Abel (arcángel) ------------------------- */
  abel_holy: { who: "hero", base: true, color: "#fff3c0", zoom: 1.0, steps: [] },       // ataque básico: lo resuelve Combat con su animación base
  // abel_sp (hoja 64): fly 3, sp1 4 (aura, puño, dardos de luz, columna de fuego), sp2 2 (carga, espada de luz), sp3 4 (alas grandes)
  abel_celestial: {
    who: "hero", atlas: "abel_sp", title: ["CELESTIAL WRATH", "Ira Celestial"], color: "#ffd86a", zoom: 1.35, cam: [140, 118], rays: true,
    steps: [
      { anim: "sp3", frames: [0, 1, 2], fps: 8, scale: 1.1, flash: "#fff3c0", sfx: "charge" },                 // alas doradas que se abren
      { anim: "sp1", frames: [0, 1], fps: 8, scale: 1.3 },                                                      // aura y puño que carga
      { anim: "sp1", frames: [2, 3], fps: 7, scale: 1.3, projectile: "#ffe9a0", impact: 1, shake: 0.9, slowmo: [0.4, 0.35], sfx: "beam" },   // dardos de luz + columna de fuego
      { anim: "sp3", frames: [3], fps: 6, scale: 1.2, hold: 0.25 },
    ],
  },
  abel_sword: {
    who: "hero", atlas: "abel_sp", title: ["SWORD OF LIGHT", "Espada de Luz"], color: "#cfeaff", zoom: 1.4, cam: [150, 112], rays: true,
    steps: [
      { anim: "sp2", frames: [0], fps: 4, scale: 1.3, flash: "#e8f6ff", sfx: "charge" },
      { anim: "sp2", frames: [1], fps: 7, scale: 1.3, sfx: "slash", projectile: "#9fd8ff" },
      { anim: "sp2", frames: [1], fps: 8, scale: 1.3, impact: 0, shake: 1, flash: "#ffffff", slowmo: [0.35, 0.4], hold: 0.2 },
    ],
  },

  /* ------------------------- Aria ------------------------- */
  aria_ice: {
    who: "hero", ally: "aria", atlas: "aria_sp", title: ["ICE STORM", "Tormenta de Hielo · Aria"], color: "#bfe8ff", zoom: 1.2, cam: [175, 118], rays: false,
    steps: [
      { anim: "s3a", fps: 10, scale: 1.15, dx: -26, sfx: "charge" },
      { anim: "s3b", fps: 7, scale: 1.15, dx: -26, impact: 3, shake: 0.9, flash: "#e8f8ff", sfx: "ice", hold: 0.3 },
    ],
  },
  aria_water: {
    who: "hero", ally: "aria", atlas: "aria_sp", title: ["WATER TORRENT", "Torrente de Agua · Aria"], color: "#7ad8ff", zoom: 1.2, cam: [175, 118],
    steps: [
      { anim: "s4b", fps: 9, scale: 1.15, dx: -26, impact: 6, shake: 0.8, sfx: "water" },
      { anim: "s4c", fps: 8, scale: 1.15, dx: -26, impact: 2, shake: 1, flash: "#d8f4ff", hold: 0.2 },
    ],
  },

  /* ------------------------- Benny ------------------------- */
  benny_meteor: {
    who: "hero", ally: "benny", atlas: "benny_sp", title: ["METEOR IMPACT", "Impacto Meteórico · Benny"], color: "#ff9a3a", zoom: 1.2, cam: [180, 112],
    steps: [
      { anim: "s3", fps: 9, scale: 1.15, dx: -30, impact: 7, shake: 1, flash: "#ffd070", sfx: "fire", slowmo: [0.5, 0.3], hold: 0.3 },
    ],
  },
  benny_tornado: {
    who: "hero", ally: "benny", atlas: "benny_sp", title: ["FIRE TORNADO", "Tornado Ígneo · Benny"], color: "#ff7a1e", zoom: 1.25, cam: [175, 118],
    steps: [
      { anim: "s4b", fps: 8, scale: 1.15, dx: -26, impact: 4, shake: 0.9, flash: "#ffd070", sfx: "fire", hold: 0.25 },
    ],
  },

  /* ------------------------- Mileva ------------------------- */
  mileva_fury: {
    who: "hero", ally: "mileva", atlas: "mileva_sp", title: ["SEISMIC FURY", "Furia Sísmica · Mileva"], color: "#9bd85a", zoom: 1.2, cam: [175, 120],
    steps: [
      { anim: "s3a", frames: [0, 1, 2, 3, 4], fps: 9, scale: 1.15, dx: -26, sfx: "charge" },
      { anim: "s3b", frames: [0], fps: 3, scale: 1.15, dx: -26, impact: 0, shake: 1, flash: "#e8ffb0", sfx: "quake", hold: 0.4 },
    ],
  },
  mileva_fissure: {
    who: "hero", ally: "mileva", atlas: "mileva_sp", title: ["EARTH FISSURE", "Fisura Terrestre · Mileva"], color: "#c8f070", zoom: 1.2, cam: [185, 120],
    steps: [
      { anim: "s4a", frames: [0, 1, 2, 3, 4, 5], fps: 9, scale: 1.15, dx: -26 },
      { anim: "s4b", fps: 5, scale: 1.15, dx: -26, impact: 1, shake: 1, flash: "#f0ffc0", sfx: "quake", hold: 0.3 },
    ],
  },

  /* ------------------------- Chloe ------------------------- */
  chloe_hearts: {
    who: "hero", ally: "chloe", atlas: "chloe_sp", title: ["CORRUPT HEARTS", "Furia de Corazones · Chloe"], color: "#ff6ab8", zoom: 1.2, cam: [175, 118],
    steps: [
      { anim: "s3a", fps: 10, scale: 1.15, dx: -26, sfx: "charge" },
      { anim: "s3b", fps: 8, scale: 1.15, dx: -26, impact: 2, shake: 0.9, flash: "#ffc0e8", hold: 0.3 },
    ],
  },
  chloe_spin: {
    who: "hero", ally: "chloe", atlas: "chloe_sp", title: ["SEISMIC SPIN", "Giro Sísmico · Chloe"], color: "#ff9a6a", zoom: 1.2, cam: [180, 118],
    steps: [{ anim: "s4", fps: 8, scale: 1.15, dx: -26, impact: 5, shake: 1, flash: "#ffe0b0", hold: 0.3 }],
  },

  /* ------------------------- Unit-A.R.C. ------------------------- */
  arc_artillery: {
    who: "hero", ally: "arc", atlas: "arc_sp", title: ["ARTILLERY MODE", "Modo Artillería · A.R.C."], color: "#ffcf5a", zoom: 1.2, cam: [180, 118],
    steps: [
      { anim: "s3a", fps: 9, scale: 1.15, dx: -26, sfx: "charge" },
      { anim: "s3b", fps: 8, scale: 1.15, dx: -26, impact: 5, shake: 1, flash: "#ffe9a0", hold: 0.25 },
    ],
  },
  arc_shock: {
    who: "hero", ally: "arc", atlas: "arc_sp", title: ["SHOCK DISCHARGE", "Descarga de Choque · A.R.C."], color: "#7ad0ff", zoom: 1.2, cam: [180, 120],
    steps: [
      { anim: "s4a", fps: 9, scale: 1.15, dx: -26 },
      { anim: "s4b", fps: 6, scale: 1.15, dx: -26, impact: 3, shake: 1, flash: "#d0f0ff", sfx: "shock", hold: 0.25 },
    ],
  },

  /* ------------------------- Enemigos ------------------------- */
  rufus_roar: {
    who: "foe", atlas: "rufus_sp", title: ["SHOCKWAVE ROAR", "Rugido de Onda Expansiva"], color: "#ff5a3a", zoom: 1.25, cam: [190, 118],
    steps: [
      { anim: "s1a", fps: 8, scale: 1.0, sfx: "growl" },
      { anim: "s1b", fps: 7, scale: 1.0, impact: 3, shake: 1, flash: "#ffb090", sfx: "roar", hold: 0.2 },
    ],
  },
  rufus_quake: {
    who: "foe", atlas: "rufus_sp", title: ["CHAIN QUAKE", "Asalto Sísmico con Cadenas"], color: "#ff4a4a", zoom: 1.25, cam: [190, 118],
    steps: [{ anim: "s2", fps: 4, scale: 1.0, impact: 1, shake: 1, flash: "#ffb0a0", sfx: "quake", hold: 0.3 }],
  },
  shela_whirl: {
    who: "foe", atlas: "shela_sp", title: ["SAVAGE WHIRL", "Torbellino Salvaje"], color: "#ff7a3a", zoom: 1.25, cam: [190, 118],
    steps: [
      { anim: "s1a", fps: 9, scale: 1.0, sfx: "growl" },
      { anim: "s1b", fps: 9, scale: 1.0, impact: 2, shake: 0.9, flash: "#ffc090", hold: 0.2 },
    ],
  },
  shela_fury: {
    who: "foe", atlas: "shela_sp", title: ["HUNTER FURY", "Furia Cazadora"], color: "#ff5a2a", zoom: 1.25, cam: [190, 118],
    steps: [
      { anim: "s2a", fps: 9, scale: 1.0, sfx: "growl" },
      { anim: "s2b", fps: 9, scale: 1.0 },
      { anim: "s2c", fps: 7, scale: 1.0, impact: 3, shake: 1, flash: "#ffc0a0", sfx: "claw", hold: 0.2 },
    ],
  },
};

/** Reproduce una escena: devuelve una promesa que se resuelve al terminar. */
export async function playScene(stage, id, { onImpact, sfx = {}, hurtWho } = {}) {
  const cfg = SCENES[id];
  if (!cfg || !cfg.atlas) { onImpact?.(); return; }
  let impacted = false;
  const impact = () => { if (impacted) return; impacted = true; onImpact?.(); };
  await stage.scene(async (S) => {
    S.title(cfg.title[0], cfg.title[1], cfg.color);
    if (cfg.rays) S.rays(cfg.color);
    S.cam({ x: cfg.cam?.[0] ?? 160, y: cfg.cam?.[1] ?? 112, zoom: (cfg.zoom || 1.2) * 0.8 }, 0.45);
    const hideActing = !cfg.ally;                                      // en los asistentes, Abel sigue en pantalla
    const actor = cfg.who === "foe" ? stage.foe : stage.hero;
    const base = actor.scale * (cfg.zoomMul || 1), ref = cfg.steps[0].scale || 1;
    for (const [si, step] of cfg.steps.entries()) {
      if (step.flash) S.flash(step.flash, 0.6);
      if (step.sfx) sfx[step.sfx]?.();
      const done = S.strip({ atlas: cfg.atlas, anim: step.anim, frames: step.frames, fps: step.fps, at: cfg.who === "foe" ? "foe" : "hero", dx: step.dx || 0, dy: step.dy || 0,
        scale: base * (step.scale || 1) / ref, hideActor: hideActing, hold: step.hold || 0, shadow: true,
        onFrame: (i) => { if (step.impact != null && i === step.impact) { impact(); if (step.shake) S.shake(step.shake); if (step.slowmo) S.slowmo(step.slowmo[0], step.slowmo[1]); } } });
      if (step.projectile) {
        const A = stage.hero, B = stage.foe;
        S.travel({ from: { x: (cfg.who === "foe" ? B.x : A.x) + (cfg.who === "foe" ? -14 : 14), y: A.y - 22 }, to: { x: (cfg.who === "foe" ? A.x : B.x), y: B.y - 20 }, dur: 0.42, color: step.projectile, arc: 8 });
      }
      await done;
    }
    impact();                                                          // por si el fotograma de impacto no llegó a ejecutarse
    void actor;
  }, { who: cfg.who });
}
