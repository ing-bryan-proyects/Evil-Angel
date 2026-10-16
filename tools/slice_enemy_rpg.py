"""Corta las hojas de enemigos del Reino 2+ (vampiros, Pyrus, lobos mejorados…) en atlas del juego.

Estas hojas (images 66-77) son grandes (2752×1536), con un BORDE oscuro desgarrado, interior de papel
cuadriculado claro, una COLUMNA de etiquetas a la izquierda (IDLE/WALK/RUN/ATTACK1/ATTACK2/SPECIAL1/SPECIAL2)
y los fotogramas a su derecha. Aquí:

  1. se recorta el interior (dentro del borde) para que el relleno desde el borde funcione sobre papel claro;
  2. se quita el papel cuadriculado con bgremove.remove_bg (núcleo = píxeles oscuros o saturados);
  3. se corta la columna de etiquetas (texto) por la izquierda;
  4. se detectan las FILAS por los valles de la proyección horizontal y cada fila se parte en fotogramas por los
     huecos verticales (se conservan los componentes "figura"; los efectos pegados viajan con su fotograma).

Salida: assets/sprites/<id>.png|json con las animaciones idle/walk/run/attack1/attack2/s3a/s3b (las dos últimas
= special 1 y 2), en el mismo formato que leen Atlas.js / BattleStage / Scenes.

  python tools/slice_enemy_rpg.py draven
  python tools/slice_enemy_rpg.py --all
"""
import json, os, sys
import numpy as np
import cv2
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from bgremove import remove_bg
from sheets_config import IMAGES_DIR

OUT = os.path.join(HERE, "..", "assets", "sprites")
PREVIEW = os.path.join(HERE, "preview")
os.makedirs(PREVIEW, exist_ok=True)
TARGET_H = 42          # alto lógico de un enemigo grande del reino 2 (algo mayor que Abel=36)

ROWS7 = ["idle", "walk", "run", "attack1", "attack2", "s3a", "s3b"]
ROWS5 = ["idle", "walk", "run", "attack1", "attack2"]
SHEETS = {
    "draven":   dict(src="69", rows=ROWS7),
    "elara":    dict(src="68", rows=ROWS7),
    "valerius": dict(src="67", rows=ROWS7),
    "aurelia":  dict(src="66", rows=ROWS7),
    # lobos y gólem mejorados (mismo formato de hoja)
    "rufus2":   dict(src="76", rows=ROWS5),
    "shela2":   dict(src="74", rows=ROWS5),
    "pyrus2":   dict(src="72", rows=ROWS5),
    "skoll2":   dict(src="77", rows=ROWS5),
}


def interior(img):
    """Recorta el interior del papel quitando el borde oscuro desgarrado (busca el rectángulo claro central)."""
    rgb = np.array(img.convert("RGB")).astype(np.int16)
    lum = rgb.sum(2) // 3
    light = lum > 150
    H, W = lum.shape
    colf = light[H // 4:3 * H // 4].mean(0)        # columnas claras en la franja central
    rowf = light[:, W // 4:3 * W // 4].mean(1)
    xs = np.where(colf > 0.5)[0]; ys = np.where(rowf > 0.5)[0]
    x0 = int(xs.min()) + 6 if len(xs) else 0; x1 = (int(xs.max()) - 6) if len(xs) else W
    y0 = int(ys.min()) + 6 if len(ys) else 0; y1 = (int(ys.max()) - 6) if len(ys) else H
    return img.crop((x0, y0, x1, y1))


def label_x(core):
    """x donde acaba la columna de etiquetas: el primer valle ancho de contenido tras el bloque de texto izquierdo."""
    col = core.sum(0)
    W = len(col)
    # el texto ocupa el ~25% izquierdo; busca el primer tramo vacío largo después de x=W*0.12
    empty = col < 3
    run = 0
    for x in range(int(W * 0.12), int(W * 0.4)):
        if empty[x]:
            run += 1
            if run > W * 0.03:
                return x
        else:
            run = 0
    return int(W * 0.26)


def row_bands(core, x0):
    """Filas por los valles de la proyección horizontal del área de fotogramas (umbral alto: los sprites son altos
    y las estelas no deben fundir filas contiguas)."""
    band = core[:, x0:]
    proj = (band > 0).sum(1).astype(float)
    H = len(proj)
    thr = max(6, proj.max() * 0.28)
    on = proj > thr
    runs = []; s = None
    for y in range(H + 1):
        v = on[y] if y < H else False
        if v and s is None: s = y
        if not v and s is not None:
            if y - s > H * 0.035: runs.append([s, y])
            s = None
    merged = []
    for r in runs:
        if merged and r[0] - merged[-1][1] < H * 0.008: merged[-1][1] = r[1]
        else: merged.append(r)
    # expande cada banda a sus píxeles reales (los extremos quedan por debajo del umbral)
    low = proj > max(3, proj.max() * 0.06)
    for r in merged:
        while r[0] > 0 and low[r[0] - 1]: r[0] -= 1
        while r[1] < H and low[r[1]]: r[1] += 1
    return merged


def frames_in_row(arr, y0, y1, x0):
    band = arr[y0:y1, x0:]
    a = (band[..., 3] > 0).astype(np.uint8)
    a = cv2.morphologyEx(a, cv2.MORPH_CLOSE, np.ones((3, 7), np.uint8))
    proj = a.sum(0)
    on = proj > 2
    runs = []; s = None
    for x in range(len(on) + 1):
        v = on[x] if x < len(on) else False
        if v and s is None: s = x
        if not v and s is not None:
            if runs and s - runs[-1][1] < 10: runs[-1][1] = x
            else: runs.append([s, x])
            s = None
    cand = []
    H = y1 - y0
    for a0, b0 in runs:
        sub_mask = band[:, a0:b0, 3] > 0
        ys = np.where(sub_mask.any(1))[0]
        if not len(ys) or sub_mask.sum() < 200: continue
        sub = band[ys.min():ys.max() + 1, a0:b0].copy()
        bb = Image.fromarray(sub[..., 3]).getbbox()
        if bb: cand.append(sub[bb[1]:bb[3], bb[0]:bb[2]])
    if not cand: return []
    # descarta fragmentos (restos del título/borde): área muy pequeña frente a la mediana, o tiras finas
    areas = sorted((c[..., 3] > 0).sum() for c in cand)
    med = areas[len(areas) // 2]
    out = []
    for c in cand:
        a = (c[..., 3] > 0).sum(); hh, ww = c.shape[:2]
        if a < 0.2 * med: continue
        if min(hh, ww) < 6 or max(hh, ww) / max(1, min(hh, ww)) > 9: continue
        out.append(c)
    return out


def feet_anchor(a):
    alpha = a[..., 3] > 0
    ys = np.where(alpha.any(1))[0]
    if not len(ys): return a.shape[1] / 2, a.shape[0]
    yb = int(ys.max()); band = alpha[max(0, yb - 6):yb + 1]
    xs = np.where(band.any(0))[0]
    return (float((xs.min() + xs.max()) / 2) if len(xs) else a.shape[1] / 2), float(yb + 1)


def build(key):
    cfg = SHEETS[key]
    img = interior(Image.open(os.path.join(IMAGES_DIR, f"{cfg['src']}.jpg")))
    rgba = remove_bg(img, dark=120, sat_min=60, halo_passes=2, holes=True, close_iter=2, min_area=80)
    arr = np.array(rgba)
    core = arr[..., 3] > 0
    lx = label_x(core.astype(int))
    arr[:, :lx, 3] = 0
    core = arr[..., 3] > 0
    bands = row_bands(core.astype(int), 0)
    names = cfg["rows"]
    anims = {}
    for i, (y0, y1) in enumerate(bands[:len(names)]):
        fr = frames_in_row(arr, y0, y1, 0)
        if fr: anims[names[i]] = fr
    if not anims:
        print(f"[{key}] sin fotogramas"); return
    # px: alto de referencia de la fila idle
    ref = anims.get("idle") or next(iter(anims.values()))
    hs = sorted(f.shape[0] for f in ref); ref_h = hs[len(hs) // 2]
    px = round(ref_h / TARGET_H, 3)
    # empaquetar
    items = [(n, i, f) for n, fl in anims.items() for i, f in enumerate(fl)]
    maxw = 4096; x = y = shelf = 0; placed = []
    for n, i, f in items:
        h, w = f.shape[:2]
        if x + w + 2 > maxw: x = 0; y += shelf + 2; shelf = 0
        placed.append((n, f, x, y)); x += w + 2; shelf = max(shelf, h)
    atlas = Image.new("RGBA", (maxw, y + shelf + 2), (0, 0, 0, 0))
    meta = {"id": key, "scale": 1.0, "height": TARGET_H, "px": px, "anims": {}}
    for n, f, px_, py_ in placed:
        atlas.paste(Image.fromarray(f, "RGBA"), (px_, py_))
        ax, ay = feet_anchor(f)
        meta["anims"].setdefault(n, []).append({"x": px_, "y": py_, "w": int(f.shape[1]), "h": int(f.shape[0]), "ax": round(ax), "ay": round(ay)})
    atlas.save(os.path.join(OUT, f"{key}.png"), optimize=True)
    json.dump(meta, open(os.path.join(OUT, f"{key}.json"), "w", encoding="utf-8"), separators=(",", ":"))
    print(f"[{key}] OK px {px}  " + ", ".join(f"{k}:{len(v)}" for k, v in meta["anims"].items()))
    # contacto
    cell = 110; maxc = max(len(v) for v in meta["anims"].values()); nr = len(meta["anims"])
    sheet = Image.new("RGB", (cell * maxc, cell * nr), (40, 44, 54)); d = ImageDraw.Draw(sheet)
    for ri, (nm, fl) in enumerate(meta["anims"].items()):
        for ci, f in enumerate(fl):
            cr = atlas.crop((f["x"], f["y"], f["x"] + f["w"], f["y"] + f["h"]))
            z = min(1.0, (cell - 16) / max(f["w"], f["h"], 1))
            s2 = cr.resize((max(1, int(f["w"] * z)), max(1, int(f["h"] * z))), Image.LANCZOS)
            sheet.paste(s2, (ci * cell + (cell - s2.width) // 2, ri * cell + cell - 4 - s2.height), s2)
            d.text((ci * cell + 2, ri * cell + 1), f"{nm}{ci}", fill=(255, 220, 120))
    sheet.save(os.path.join(PREVIEW, f"{key}.png"))


if __name__ == "__main__":
    keys = list(SHEETS) if "--all" in sys.argv else [a for a in sys.argv[1:] if not a.startswith("-")]
    for k in keys:
        if k in SHEETS: build(k)
        else: print("desconocido:", k)
