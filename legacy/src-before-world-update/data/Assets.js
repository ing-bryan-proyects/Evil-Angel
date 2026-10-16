/**
 * Assets · recursos centralizados de Evil-Angel
 * ---------------------------------------------
 *   - LOGO : logotipo oficial (assets/logo.png) y sus referencias de diseño.
 *   - CAST : especificaciones de pixel art 16/32 bits del elenco completo, con
 *            paleta, matriz frontal 32×40 (o referencia a un sprite existente)
 *            y pose de la pantalla de título.
 *   - loadImage() : carga de imágenes con Promise.
 *
 * Las matrices usan una letra por píxel ("." = transparente). Cada personaje
 * tiene su propia paleta, así que la misma letra puede ser un color distinto.
 */

/* ======================================================================
   LOGOTIPO OFICIAL
   ====================================================================== */

export const LOGO = Object.freeze({
  src: "assets/logo.png",
  width: 955,
  height: 512,
  /** Referencias estéticas para recrearlo o adaptarlo (p. ej. a una versión pixelada). */
  design: {
    leftWing: "Ala oscura de plumas gris carbón con brasas rojas y grietas incandescentes: la caída.",
    rightWing: "Ala mecánica dorada de plumas metálicas con engranajes de latón: Unit-A.R.C. y la redención.",
    evil: "EVIL en letras de acero cromado con contorno rojo sangre y remaches.",
    angel: "ANGEL en serif dorado brillante con reflejos especulares.",
    emblem: "Cruz de hierro sobre un engranaje dorado entre ambas palabras.",
    palette: { steel: "#C9CED8", blood: "#B0182A", gold: "#E3B341", goldLight: "#FBE7A1", ember: "#FF6A1E" },
  },
});

/** Carga una imagen y resuelve cuando está lista. */
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    img.src = src;
  });
}

/* ======================================================================
   BLOQUES REUTILIZADOS
   ====================================================================== */

/** Cuerpo base (filas 18–39): camiseta de tirantes, sudadera atada, cargo y botas. */
const BODY_TANK_HOODIE = [
  ".............XQqqQX.............",
  ".........XkUvVkkkqVuUqX.........",
  ".......XKkUvVVVqqVVVuUqqX.......",
  ".......XKkUvVVVVVVuuuUqqX.......",
  ".......XKkUvVVVuVVuuuUqqX.......",
  ".......XkkUvVVVVVVVuuUqQX.......",
  ".......XkkUvVVVVVVVuuUqQX.......",
  ".......XkkNrRRRRRRRmmNqQX.......",
  "......XKkkNRRRmrrmRmmNqqqX......",
  "......XkkqNmRRmrrmRmMNqqQX......",
  ".......XXXNMmNrRRmNmMNXXX.......",
  "........NmMZaANRmNAzZMmN........",
  "........NMMZaAANmNAzZMMN........",
  ".........NMZaAAANAAzZMN.........",
  "..........NZaAAAzAAzZN..........",
  "...........ZaAAzZAAzZ...........",
  "..........ZaaAzzZaAzzZ..........",
  "..........ZzzzzZZzzzzZ..........",
  "..........xbBBx..xbBBx..........",
  ".........xbbBBx..xbBBBx.........",
  ".........xccccx..xccccx.........",
  ".........xxxxxx..xxxxxx.........",
];

/** Cabeza de picos (filas 0–17), compartida por Abel y Benny con paletas distintas. */
const HEAD_SPIKES = [
  ".............O.....O............",
  "............OWO...OhO....O......",
  "......O....OWhO..OhsO...OsO.....",
  "......OO...OWhhO.OhhsO.OhsO.....",
  ".......OO.OWhhhsOhhhsOOhhsO.....",
  "......OhWWhWhhhsshhhhsshssO.....",
  ".....OhWWhhhWhhhshhhhhshhssO....",
  "....OhWhhhhhhWhhhshhhhhshssdO...",
  "....OhhhhhshhhhhshhhhhshssddO...",
  "...OhhhhshhhshhhhshhhshssdddO...",
  "...OhhhshhshhshhhshhshssddddO...",
  "...OhhshssQhsQhhsQhsQssdsdddO...",
  "...OhhssdQpppQqssqQpppQdsdddO...",
  "...OhhssdkyggkkkkkkyggqdsdddO...",
  "...OhhhsdkYYYkkKkkkYYYqdddddO...",
  "....OhssdkkqkkkKqkkkqkqddddO....",
  ".....OhsddkkkkkQQkkkqqddddO.....",
  "......OsO..XkkkkkqqqX..OdO......",
];

/**
 * Traduce las claves de pelo genéricas (B base, L luz, S sombra, D sombra
 * profunda) a las del sprite (h, l, s, d), para no chocar con "B" de las botas.
 */
const hairKeys = (rows) => rows.map((r) => r.replace(/B/g, "h").replace(/L/g, "l").replace(/S/g, "s").replace(/D/g, "d"));

/* ======================================================================
   ARIA · coletas castañas, mirada decidida
   ====================================================================== */

const ARIA_HEAD = hairKeys([
  "................................",
  "......................OOOO......",
  "................................",
  "..OO...OBLLBBBBBBBBBBSSDO...OO..",
  ".OBBO.OBLBBBBBBBBBBBBBSSDO.OSSO.",
  "OBLBBOOBBBBBBBBBBBBBBBSSDOOSSDSO",
  "OBBBSOOBBLBBBBBBBBBBBBSSDDOSDDSO",
  "OBLBSOOBBBBSBBBBSBBBBBSSDDOSDDSO",
  "OBBBSOOBSBBSBBSBBBSBBBSSDDOSSDSO",
  "OBLBSOOBSBQBSQqQSBQBSQSDDDOSDDSO",
  "OBBSSOOBSQpppQkkkkQpppQSDDOSDDSO",
  ".OBSO.OBSkyYgkkKkkkyYgqSDDOOSDO.",
  ".OBSO.OBSkgYYkkKqkkgYYqSDDOODDO.",
  ".OBSO.OBSkkqkkkkkkkkqkkSDDOOSDO.",
  "..OO..OBSDkkkkkQQkkkkkqDDDO.OO..",
  "......OBSD.XkkkkkkqqX..DSO......",
  ".......OSO...XQqqQX...OSO.......",
  ".............XqqqqX.............",
]);

/* ======================================================================
   BENNY · pelo castaño en picos, sonrisa, chaleco rojo, bermudas
   ====================================================================== */

const BENNY_ROWS = [
  ...HEAD_SPIKES.slice(0, 16),
  ".....OhsddkkkkMiiMkkqqddddO.....", // sonrisa abierta
  "......OsO..XkkkMMkqqX..OdO......",
  ".............XQqqQX.............",
  ".........XkNrTTtTTrRNqX.........", // chaleco rojo abierto sobre camiseta negra
  ".......XKkNrRTTtTTTRmNqqX.......",
  ".......XKkNrRTTTTTTRmNqqX.......",
  ".......XKkNrRTTTTTTRmNqqX.......",
  ".......XkkNrRTTTTTTRmNqQX.......",
  ".......XkkNrRTTTTTTRmNqQX.......",
  ".......XGGNrRTTTTTTRmNGjX.......", // guantes sin dedos
  "......XGGjNRRTTTTTTRmNjGjX......",
  ".......XXXZaAAAAAAAAzZXXX.......", // bermudas cargo
  ".........ZaAAAzAAzAAAzZ.........",
  ".........ZZZZAAzzAAZZZZ.........",
  ".........ZaAzAzAzAzaAzZ.........",
  ".........ZaAzAAzZAAzAzZ.........",
  ".........ZzzzAAzZAAzzzZ.........",
  ".........ZaAAzzZZzAAzzZ.........",
  "..........XkkqX..XkkqX..........", // piernas
  "..........XkKqX..XkKqX..........",
  ".........xeeeEx..xeeeEx.........", // zapatillas
  "........xeffeEx..xeffeEx........",
  "........xccccccx.xccccccx.......",
  "........xxxxxxxx.xxxxxxxx.......",
];

/* ======================================================================
   MILEVA · melena rubia larga, chaqueta verde, sonrisa segura
   ====================================================================== */

const MILEVA_ROWS = [
  ...hairKeys([
    ".........OOOOOOOOOOOO...........",
    ".......OOBLLLBBBBBBBSOO.........",
    "......OBLWLLBBBBBBBBBSSO........",
    ".....OBLWLBBBBBBBBBBBBSSO.......",
    "....OBLLBBBBBBBBBBBBBBSSDO......",
    "....OBLBBBBBBBBBBBBBBBSSDO......",
    "...OBLBBBBLBBBBBBBBBBBSSDDO.....",
    "...OBBBBLBBBSBBBBSBBBBSSDDO.....",
    "...OBBLBBBSBBBSBBBBSBBSSDDO.....",
    "...OBBSBSBSQqqqqqqqqqqQSDDO.....",
    "...OBBSBSkpppkkkkkkpppqSDDO.....",
    "...OBBSBSkyYgkkKkkkyYgqSDDO.....",
    "...OBBSBSkgYYkkKqkkgYYqSDDO.....",
    "...OBBSBSkkqkkkkkkkkqkqSDDO.....",
    "...OBBSBSkkkkkQkkQkkkqqSDDO.....",
    "...OBBSDS.XkkkkQQkkkqX.SDDO.....",
    "...OBBSDS....XQqqQX....SDDO.....",
    "...OBBSDS.....XqqX.....SDDO.....",
    "...OBS.NjJJJtTTTTTTJJnN.SDO.....",
    "...OBSNjJJJntTTTTTTTJnnNSDO.....",
    "...OBSNjJnJntTTTTTTTJnJnNSDO....",
    "...OBSNjJnJntTTTTTTTJnJnNSDO....",
    "...OBSNjJnJnTTTTTTTTJnJnNSDO....",
    "...OBSNjJnJntTTTTTTTJnJnNSDO....",
    "...OBSNjJnJntTTTTTTTJnJnNSDO....",
    "...OBSXKkqJntTTTTTTTJnkkqXSDO...",
    "....OS.XXXNnZaAAAAAzZnNXXX.DO...",
  ]),
  "..........ZaAAAzAAzzZ...........",
  "..........ZaAAAzAAzzZ...........",
  "..........ZaAAAzAAzzZ...........",
  "..........ZaAAzzZAAzZ...........",
  "..........ZaAAzZZAAzZ...........",
  "..........ZaAAzZZAAzZ...........",
  "...........ZaAAzZAAzZ...........",
  "..........ZaaAzzZaAzzZ..........",
  "..........ZzzzzZZzzzzZ..........",
  "..........xbBBx..xbBBx..........",
  ".........xbbBBx..xbBBBx.........",
  ".........xccccx..xccccx.........",
  ".........xxxxxx..xxxxxx.........",
];

/* ======================================================================
   CHLOE (hoja de personaje 02)
   ====================================================================== */
const CHLOE_PAL = {
  // cabello rosa: capas de magenta
  O: "#3A0838", D: "#6E0B5E", S: "#B3127A", B: "#F0389A", L: "#FF7AC0", "*": "#FFE4F2",
  // pañoleta y corazón
  g: "#3D3845", G: "#2A2630", j: "#18151C", H: "#FF5FA8", h: "#FFB3D6",
  // piel
  K: "#FFE0C4", k: "#F5BE96", q: "#D9906E", Q: "#A85D62", X: "#6E3442",
  // ojos, boca y tatuaje
  W: "#FFF6F0", y: "#FFD1E6", e: "#E0307A", E: "#8A1450", l: "#2A1020", M: "#5A1A2A",
  // chaleco, top y guantes
  v: "#46424D", V: "#2E2B33", u: "#1D1B22", U: "#0F0E13", r: "#7A2C50", R: "#5A1E3A", m: "#3A1026",
  // cinturón
  t: "#3B2F2A", T: "#C9CCD6",
  // pantalón beige
  a: "#EAD9B0", A: "#CDB685", z: "#A08A5C", Z: "#6E5C3A", P: "#3E3220",
  // botas
  b: "#4A4450", c: "#2E2A30", C: "#1A171C", x: "#100E12", f: "#D8304A", i: "#E8E2DA", I: "#A8A098",
};

const CHLOE_ROWS = [
  "..........O....O....O...........",
  ".....O...OLO..OBO..OBO...O......",
  ".....OO..OLBO.OBBO.OBSO.OO......",
  "......OBOOLBBOOBBSOOBSSOOBO.....",
  ".....OBBLLB*BBBBBBSSBBBSSSBO....",
  "....OBL*LBBBBBLBBBBBSBDBSSDSO...",
  "...OBLLBBBBLL*BBBBBBSBBSSDDSO...",
  "...OBLjggggggHHgHHgggggggjjSDO..",
  "...OBBjGGGGGGHhHHHGGGGGGGjjSDO..",
  "...OBSjjjjjjjjHHHjjjjjjjjjjDDO..",
  "...OBSBL*SBBLBBSBBLBSBBSSSDDDO..",
  "...OBSBSDQSQqqSQqSQqqSQDSDSDDO..",
  "...OL*BBDkkSSSkkkkSSSkqDSBSDDO..",
  "...OBSBBDkllllkkkkllllqDSBSDDO..",
  "...OBSLBDkWyEWkKkkWyEWqDSBSDDO..",
  "...OBSBSDkWeeWkKqkWeeWqDSDSDDO..",
  "...OBSSDDkkkkkMWWMkXkkqDSDSDDO..",
  "...OBLDDSDXkkkkMMkXXXXDSDDSDDO..",
  "....OBSDDS...XQqqQX...SDDSDO....",
  "....OBSD.XkUvVkkkqVuUqX.DSDO....",
  "...OLSDXKkUvVrRRRRmVuUqqXDSDO...",
  "...OBSDXKkUvVrRRRRmVuUqqXDSDO...",
  "...OBSDXKkUvVmmmmmmVuUqqXDSDO...",
  "...OB*DXkkUvVkKkkqqVuUqQXDSDO...",
  "...OBSDXkkUvVkkkQkqVuUqQXDSDO...",
  "...OBSXVVuUvVkkkkqqVuUVuuXSDO...",
  "....OSXkKutttttTTtttttukqXDO....",
  ".....OXXXPaaAAAAAAAzzzPXXXO.....",
  ".........PaAAAzAAzAAAzP.........",
  ".........PZZZAAzzAAZZZP.........",
  ".........PaAzAzAzAzaAzP.........",
  ".........PaAzzAAzAzaAzP.........",
  ".........PzzzAAAzAAzzzP.........",
  ".........PaAAzAAzAAzzzP.........",
  ".........PAazzAAzAazzzP.........",
  "........PaAAzzAzzAAzzzZP........",
  ".........xcCCfx..xcCCfx.........",
  "........xbbcCCx..xbcCCCx........",
  "........xiiiiIx..xiiiiIx........",
  "........xxxxxxx..xxxxxxx........",
];

/* ======================================================================
   ELENCO
   ====================================================================== */

/**
 * Especificaciones del elenco. `pose` define la animación en la pantalla de
 * título: `bob` (px de respiración), `hop` (salto, px), `phase` (desfase) y
 * `aura` (resplandor dorado alrededor del personaje).
 */
export const CAST = Object.freeze([
  {
    id: "aria", name: "Aria", role: "Luchadora del Reino 1",
    look: "Coletas castañas, camiseta de tirantes gris, chaqueta roja atada a la cintura, cargo gris y botas.",
    palette: {
      O: "#3A2016", d: "#5C3622", s: "#7E4C2E", h: "#A0663A", l: "#C4874E", W: "#E6AE7A",
      K: "#FFE0C4", k: "#F0BC94", q: "#D08C6A", Q: "#A45A60", X: "#6A3440",
      y: "#FFFFFF", Y: "#B8763E", g: "#7A4426", p: "#3A1E12",
      v: "#5A5A62", V: "#3A3A42", u: "#26262C", U: "#141418",
      r: "#F2665A", R: "#C9303A", m: "#8E1E35", M: "#5E1230", N: "#3F0A24",
      a: "#A7ADB8", A: "#7E8492", z: "#5A5F6C", Z: "#33363F",
      b: "#6E6A62", B: "#4A4740", x: "#1E1C18", c: "#9A968C",
    },
    outlines: { O: "d", X: "q", U: "u", N: "m", Z: "z", x: "B" },
    pixels: [...ARIA_HEAD, ...BODY_TANK_HOODIE],
    pose: { bob: 1, hop: 0, phase: 0.4, aura: null },
  },
  {
    id: "abel", name: "Abel", role: "Serafín caído · protagonista",
    look: "Cabello blanco en picos con sombras gris-azuladas, ojos dorados, chaleco oscuro y sudadera roja atada. Aura dorada de la Palabra Sagrada.",
    sprite: "abel", // usa la matriz direccional de SpriteRenderer (vista frontal)
    pose: { bob: 1, hop: 0, phase: 0, aura: "#FFD86A" },
  },
  {
    id: "benny", name: "Benny", role: "Puños de fuego",
    look: "Pelo castaño en picos, gran sonrisa, chaleco rojo sobre camiseta negra, guantes sin dedos, bermudas cargo y zapatillas.",
    palette: {
      O: "#3A1E10", W: "#E09A5A", h: "#B8703A", s: "#8A4E26", d: "#5E3218",
      K: "#FFE0C4", k: "#F0BC94", q: "#D08C6A", Q: "#A45A60", X: "#6A3440",
      y: "#FFFFFF", Y: "#C8843C", g: "#8A5226", p: "#3A1E10", M: "#5A1A2A", i: "#FFF6F0",
      r: "#F2665A", R: "#C9303A", m: "#8E1E35", N: "#3F0A24",
      t: "#3A3A44", T: "#22222A", G: "#4A3A2E", j: "#2E2219",
      a: "#EAD9B0", A: "#CDB685", z: "#A08A5C", Z: "#6E5C3A",
      e: "#F2F0EA", E: "#B8B4AA", f: "#D8304A", c: "#8A8A96", x: "#1A1A1E",
    },
    outlines: { O: "d", X: "q", N: "m", Z: "z" },
    pixels: BENNY_ROWS,
    pose: { bob: 0, hop: 4, phase: 0.2, aura: null },
  },
  {
    id: "chloe", name: "Chloe", role: "Punk del cabello rosa",
    look: "Melena rosa en capas magenta, pañoleta con corazón, chaleco negro sobre top, cargo beige y botas con franja roja.",
    palette: CHLOE_PAL,
    outlines: { O: "D", X: "q", U: "u", P: "Z", x: "C" },
    pixels: CHLOE_ROWS,
    pose: { bob: 1, hop: 0, phase: 0.7, aura: null },
  },
  {
    id: "mileva", name: "Mileva", role: "Estratega",
    look: "Melena rubia larga, chaqueta verde abierta sobre top negro, pantalón negro y botas marrones.",
    palette: {
      O: "#5A3A10", d: "#8A6420", s: "#C09A3A", h: "#E8C860", l: "#F8E08A", W: "#FFF6C8",
      K: "#FFE6CE", k: "#F6C9A4", q: "#DA9C7A", Q: "#B06A68", X: "#74404A",
      y: "#FFFFFF", Y: "#5A9AD8", g: "#2E5A9A", p: "#2A1E30",
      j: "#7E9A56", J: "#56763C", n: "#34502A", N: "#182410", t: "#3A3A44", T: "#222228",
      a: "#4A4A56", A: "#2E2E38", z: "#1E1E26", Z: "#0E0E12",
      b: "#8A5A36", B: "#5E3A20", x: "#2A1A0E", c: "#6E5A44",
    },
    outlines: { O: "d", X: "q", N: "n", Z: "z", x: "B" },
    pixels: MILEVA_ROWS,
    pose: { bob: 1, hop: 0, phase: 0.55, aura: null },
  },
  {
    id: "arc", name: "Unit-A.R.C.", role: "Robot guía",
    look: "Cuerpo de cobre gastado con pátina y óxido por dithering, ojo central con degradado circular iluminado desde dentro.",
    sprite: "arc", // usa ArcSprite (32×48)
    pose: { bob: 0, hop: 0, phase: 0, aura: null },
  },
]);
