"""Corta la hoja maestra "ABEL RPG" (images/64.jpg, fondo de rejilla AZUL) en los atlas del juego.

Esta hoja sustituye a todas las anteriores de Abel. Su contenido, por zonas:
  fila 1-2  idle y caminar en 3 vistas repetidas: frente (S), espalda (N) y perfil izquierdo (W).
            El RPG usa 4 direcciones; la derecha (E) es el perfil izquierdo reflejado.
  fila 3    carrera + dash (vista de perfil izquierdo, con estelas de velocidad)
  fila 4    nado (flotar + brazadas)
  centro    vuelo con alas, puñetazos, y ATAQUES ESPECIALES (aura de alas, espada de luz, columna de fuego)
  fila 9    daño / derribo / tropiezo
  fila 10   muerte, resurrección y ENTRAR POR LA PUERTA (3 fotogramas)

Salidas:
  abel_loco.png|json   idleS/N/W, walkS/N/W, runW, dashW   (overworld, lo lee CharMotion en modo 4-dir)
  abel.png|json        idle, run, swim, jump, fight + alias walk/attack1/attack2, hurt, die, door  (combate/retrato)
  abel_sp.png|json     fly, sp1 (alas), sp2 (espada), sp3 (fuego)   (cinemáticas de especiales, alta resolución)

Fondo: la rejilla es cian (verde y azul altos, rojo bajo); el pelo plateado es casi neutro (g-r pequeño),
así que se distingue por g-r / b-g y se rellena desde el borde (las celdas cian sí están conectadas).

  python tools/slice_abel_rpg.py            (todo)
  python tools/slice_abel_rpg.py loco       (solo overworld)
"""
import json, os, sys
import numpy as np
import cv2
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from sheets_config import IMAGES_DIR

OUT = os.path.join(HERE, "..", "assets", "sprites")
PREVIEW = os.path.join(HERE, "preview")
os.makedirs(PREVIEW, exist_ok=True)
SRC = "64"
TARGET_H = 36

# columnas (x0,x1) de cada fotograma de las filas 1 y 2 (9 por fila), medidas sobre la hoja
ROW_COLS = [(20, 62), (102, 144), (183, 225), (280, 322), (362, 405), (444, 486), (537, 580), (619, 661), (700, 742)]
ROW1_Y = (11, 116)
ROW2_Y = (118, 216)
# dirección de cada columna: S=frente, N=espalda, W=perfil izquierdo
COL_DIR = ["S", "N", "W", "S", "N", "W", "S", "N", "S"]


def remove_grid(img):
    """Quita el fondo de rejilla cian. Devuelve RGBA (uint8)."""
    rgb = np.array(img.convert("RGB")).astype(np.int16)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    seed = (((g - r) > 16) & ((b - g) > 10)).astype(np.uint8)
    num, lb, st, _ = cv2.connectedComponentsWithStats(seed, 8)
    border = set(np.unique(np.concatenate([lb[0], lb[-1], lb[:, 0], lb[:, -1]])))
    bg = np.isin(lb, [i for i in border if i > 0])
    core = (~bg).astype(np.uint8)
    core = cv2.morphologyEx(core, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
    # pela el halo cian claro del contorno (restos del borde de la rejilla)
    a = core.astype(bool)
    cool = ((g - r) > 8) & ((b - g) > 4)
    for _ in range(2):
        pad = np.pad(a, 1, constant_values=False)
        edge = a & ~(pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:])
        kill = edge & cool
        if not kill.any():
            break
        a &= ~kill
    # quita motas sueltas
    n2, l2, s2, _ = cv2.connectedComponentsWithStats(a.astype(np.uint8), 8)
    keep = np.zeros(n2, bool); keep[1:] = s2[1:, cv2.CC_STAT_AREA] >= 24
    a = keep[l2]
    return np.dstack([np.array(img.convert("RGB")), np.where(a, 255, 0).astype(np.uint8)])


def tight(arr):
    bb = Image.fromarray(arr[..., 3]).getbbox()
    return arr[bb[1]:bb[3], bb[0]:bb[2]] if bb else arr


def feet_anchor(arr):
    """Pies: centro de los píxeles oscuros de las botas en la franja baja; si no hay, centro inferior."""
    a = arr[..., 3] > 0
    lum = arr[..., :3].astype(np.int16).sum(2) // 3
    dark = a & (lum < 95)
    ys = np.where(dark.sum(1) >= 2)[0]
    if not len(ys):
        xs = np.where(a.any(0))[0]
        return (float((xs.min() + xs.max()) / 2) if len(xs) else arr.shape[1] / 2), float(arr.shape[0])
    yb = int(ys.max())
    band = dark[max(0, yb - max(5, arr.shape[0] // 12)): yb + 1]
    xs = np.where(band.any(0))[0]
    return float((xs.min() + xs.max()) / 2), float(yb + 1)


def grab(full, y0, y1, x0, x1):
    """Recorta una celda y la ajusta a su contenido (bbox del alfa)."""
    sub = full[y0:y1, max(0, x0):x1].copy()
    return tight(sub)


def figures(full, y0, y1, x0=0, x1=None, min_h=0.45, need_dark=True):
    """Devuelve los fotogramas de FIGURA de una banda, ignorando fragmentos de efectos (polvo, destellos, estelas):
    componentes altos (> min_h de la banda) con píxeles oscuros (botas/contorno). Ordenados por x."""
    x1 = full.shape[1] if x1 is None else x1
    band = full[y0:y1, x0:x1]
    a = (band[..., 3] > 0).astype(np.uint8)
    # une partes de una misma figura separadas por huecos finos (brazo extendido, etc.)
    a2 = cv2.morphologyEx(a, cv2.MORPH_CLOSE, np.ones((3, 9), np.uint8))
    n, lb, st, cen = cv2.connectedComponentsWithStats(a2, 8)
    H = y1 - y0
    lum = band[..., :3].astype(np.int16).sum(2) // 3
    out = []
    for i in range(1, n):
        x, y, w, h, ar = st[i]
        if h < min_h * H or ar < 200:
            continue
        mask = (lb == i)
        if need_dark and not ((lum < 70) & (band[..., 3] > 0) & mask).any():
            continue
        sub = band[y:y + h, x:x + w].copy()
        sub[..., 3] = np.where(mask[y:y + h, x:x + w], sub[..., 3], 0)
        out.append((x, tight(sub)))
    out.sort(key=lambda e: e[0])
    return [e[1] for e in out]


def cut_valleys(full, y0, y1, x0, x1, n):
    """Parte una banda horizontal [x0,x1) en n fotogramas por los valles de la proyección vertical."""
    band = (full[y0:y1, x0:x1, 3] > 0)
    proj = band.sum(0).astype(float)
    xs = np.where(proj > 0)[0]
    if not len(xs):
        return []
    xa, xb = int(xs.min()), int(xs.max()) + 1
    if n <= 1:
        return [grab(full, y0, y1, x0 + xa, x0 + xb)]
    pitch = (xb - xa) / n
    bounds = [xa] + [int(xa + k * pitch) for k in range(1, n)] + [xb]
    for k in range(1, n):
        c = bounds[k]; lo = max(xa + 2, int(c - pitch * 0.3)); hi = min(xb - 2, int(c + pitch * 0.3))
        if hi > lo:
            bounds[k] = lo + int(np.argmin(proj[lo:hi]))
    out = []
    for k in range(n):
        c = grab(full, y0, y1, x0 + bounds[k], x0 + bounds[k + 1])
        if c is not None and (c[..., 3] > 0).sum() > 40:
            out.append(c)
    return out


def pack(key, anims, px):
    """Empaqueta {anim: [arrays]} en un atlas PNG + JSON, con ancla en los pies."""
    items = []
    for name, fl in anims.items():
        for i, fr in enumerate(fl):
            ax, ay = feet_anchor(fr)
            items.append((name, i, fr, round(ax), round(ay)))
    maxw = 2048; x = y = shelf = 0; placed = []
    for name, i, fr, ax, ay in items:
        h, w = fr.shape[:2]
        if x + w + 2 > maxw:
            x = 0; y += shelf + 2; shelf = 0
        placed.append((name, i, fr, ax, ay, x, y)); x += w + 2; shelf = max(shelf, h)
    atlas = Image.new("RGBA", (maxw, y + shelf + 2), (0, 0, 0, 0))
    meta = {"id": key, "scale": 1.0, "height": TARGET_H, "px": round(px, 3), "anims": {}}
    for name, i, fr, ax, ay, px_, py_ in placed:
        atlas.paste(Image.fromarray(fr, "RGBA"), (px_, py_))
        meta["anims"].setdefault(name, []).append({"x": px_, "y": py_, "w": int(fr.shape[1]), "h": int(fr.shape[0]), "ax": ax, "ay": ay})
    atlas.save(os.path.join(OUT, f"{key}.png"), optimize=True)
    json.dump(meta, open(os.path.join(OUT, f"{key}.json"), "w", encoding="utf-8"), separators=(",", ":"))
    print(f"[{key}] OK atlas {atlas.size} px {meta['px']}  " + ", ".join(f"{k}:{len(v)}" for k, v in meta["anims"].items()))
    # contacto
    names = list(meta["anims"]); maxc = max(len(v) for v in meta["anims"].values())
    cell = 96
    sheet = Image.new("RGB", (cell * maxc, cell * len(names)), (60, 74, 58)); dr = ImageDraw.Draw(sheet)
    for ri, nm in enumerate(names):
        for ci, f in enumerate(meta["anims"][nm]):
            cr = atlas.crop((f["x"], f["y"], f["x"] + f["w"], f["y"] + f["h"]))
            z = min(1.0, (cell - 16) / max(f["w"], f["h"], 1))
            s2 = cr.resize((max(1, int(f["w"] * z)), max(1, int(f["h"] * z))), Image.NEAREST)
            sheet.paste(s2, (ci * cell + (cell - s2.width) // 2, ri * cell + cell - 4 - s2.height), s2)
            dr.text((ci * cell + 2, ri * cell + 1), f"{nm}{ci}", fill=(255, 255, 0))
    sheet.save(os.path.join(PREVIEW, f"{key}.png"))


def build_loco(full):
    # recorta cada celda de filas 1-2
    r1 = [grab(full, *ROW1_Y, x0, x1) for (x0, x1) in ROW_COLS]
    r2 = [grab(full, *ROW2_Y, x0, x1) for (x0, x1) in ROW_COLS]
    # altura de referencia (frente) para px
    hS = sorted(r1[i].shape[0] for i in range(9) if COL_DIR[i] == "S")
    ref_h = hS[len(hS) // 2]
    px = round(ref_h / TARGET_H, 3)
    # índices de columnas por dirección, en orden de aparición
    idxS = [i for i in range(9) if COL_DIR[i] == "S"]
    idxN = [i for i in range(9) if COL_DIR[i] == "N"]
    idxW = [i for i in range(9) if COL_DIR[i] == "W"]
    anims = {
        "idleS": [r1[idxS[0]]], "idleN": [r1[idxN[0]]], "idleW": [r1[idxW[0]]],
        "walkS": [r1[idxS[0]], r2[idxS[0]], r1[idxS[1]], r2[idxS[1]]],
        "walkN": [r1[idxN[0]], r2[idxN[0]], r1[idxN[1]], r2[idxN[1]]],
        "walkW": [r1[idxW[0]], r2[idxW[0]], r1[idxW[1]], r2[idxW[1]]],
    }
    # fila 3: carrera + dash (perfil izquierdo). Cols detectadas: 3 de carrera + 2 de dash fusionadas.
    run = cut_valleys(full, 220, 312, 18, 300, 3)                  # las 3 poses de carrera limpias
    dash = cut_valleys(full, 220, 312, 330, 700, 3)               # dash con estela: 3 fases
    anims["runW"] = run if len(run) >= 2 else anims["walkW"]
    anims["dashW"] = dash if len(dash) >= 2 else anims["runW"]
    pack("abel_loco", anims, px)


def build_abel(full):
    """Atlas de combate/retrato: idle (frente), swim, fight, hurt, die, door + alias."""
    r1 = [grab(full, *ROW1_Y, x0, x1) for (x0, x1) in ROW_COLS]
    hS = sorted(r1[i].shape[0] for i in range(9) if COL_DIR[i] == "S")
    px = round(hS[len(hS) // 2] / TARGET_H, 3)
    idleS = [r1[i] for i in range(9) if COL_DIR[i] == "S"][:3]
    # puñetazos (fila atk ~500-600): quedarnos solo con las figuras, no con las estelas/destellos sueltos
    fight = figures(full, 498, 602, 18, 600)
    hurt = figures(full, 825, 922, 14, 765)
    die = figures(full, 922, 1023, 14, 300, min_h=0.22)          # Abel tendido (ancho y bajo)
    door = figures(full, 922, 1023, 300, 600, min_h=0.4)          # entrar por la puerta (Abel + marco)
    anims = {"idle": idleS, "fight": fight, "hurt": hurt, "die": die, "door": door}
    # alias para el código existente
    anims["walk"] = anims["idle"]
    anims["run"] = anims["idle"]
    anims["attack1"] = fight[:5] if len(fight) >= 5 else fight
    anims["attack2"] = fight
    anims["idleback"] = [r1[i] for i in range(9) if COL_DIR[i] == "N"][:3]
    anims["jump"] = idleS
    pack("abel", anims, px)


def build_sp(full):
    """Especiales en alta resolución: fly (alas), sp1 aura, sp2 espada, sp3 fuego."""
    fly = cut_valleys(full, 394, 500, 180, 600, 3)               # vuelo con alas
    sp1 = cut_valleys(full, 600, 700, 11, 380, 3)                # aura de alas / carga
    sp2 = cut_valleys(full, 600, 700, 380, 600, 2)               # espada de luz
    sp3 = cut_valleys(full, 700, 820, 11, 600, 4)                # alas grandes / halo
    fire = cut_valleys(full, 600, 820, 600, 765, 1)              # columna de fuego
    hs = sorted(f.shape[0] for f in (sp1 or fly))
    px = round((hs[len(hs) // 2] if hs else 90) / TARGET_H, 3)
    anims = {"fly": fly, "sp1": sp1 + (fire or []), "sp2": sp2, "sp3": sp3}
    anims = {k: v for k, v in anims.items() if v}
    pack("abel_sp", anims, px)


if __name__ == "__main__":
    img = Image.open(os.path.join(IMAGES_DIR, f"{SRC}.jpg"))
    full = remove_grid(img)
    what = [a for a in sys.argv[1:] if not a.startswith("-")] or ["loco", "abel", "sp"]
    if "loco" in what:
        build_loco(full)
    if "abel" in what:
        build_abel(full)
    if "sp" in what:
        build_sp(full)
