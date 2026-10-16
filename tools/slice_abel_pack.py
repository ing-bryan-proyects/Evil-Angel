"""Corta las hojas de movimientos y combate de Abel (una sola vista, fondo de tablero) en atlas del juego.

  python tools/slice_abel_pack.py            (genera todo)
  python tools/slice_abel_pack.py abel       (solo la hoja base: reposo, correr, nadar, saltar, pelear, volar)
  python tools/slice_abel_pack.py abel_sp    (solo la hoja de alta resolución: volar + ataques especiales 1, 2 y 3)

Salida: assets/sprites/abel.png|json y assets/sprites/abel_sp.png|json. Los fotogramas se guardan a RESOLUCIÓN
NATIVA de la hoja (sin remuestrear) y el atlas declara `px` (píxeles del atlas por píxel de juego): el juego los
dibuja reducidos con suavizado, así que la nitidez es la de la hoja original y no la de un reescalado previo.

Cada componente conexa se asigna a su fila por el centro vertical (las filas pueden tocarse), se agrupa por huecos
horizontales en fotogramas y los restos sueltos del tablero se descartan.
"""
import json, os, sys
import numpy as np
import cv2
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from bgremove import remove_bg_checker, _dominant_grays, peel_checker
from sheets_config import IMAGES_DIR

OUT = os.path.join(HERE, "..", "assets", "sprites")
PREVIEW = os.path.join(HERE, "preview")
os.makedirs(PREVIEW, exist_ok=True)
TARGET_H = 36                 # altura lógica de Abel en el mapa (como el resto de personajes)

# ---------- descripción de cada hoja ----------
# rows: (nombre, y0, y1) · label_x: los componentes cuyo centro queda a su izquierda son rótulos de texto
PACKS = {
    "abel": dict(
        src="61", label_x=216, ymax=538, tol=30, gap=4, ref_row="idle",
        rows=[("idle", 0, 82), ("idleback", 82, 153), ("run", 153, 219), ("swim", 219, 263), ("jump", 263, 346), ("fight", 346, 444), ("fly", 444, 540)],
        row_label_x={"fly": 150}, skip=("fly",), clean_bottom_light=("idle", "idleback", "run", "jump", "fight"),                    # el vuelo bueno es el de la hoja de alta resolución (abel_sp)
        expect={"swim": 8, "fight": 8},                   # filas cuyos fotogramas se tocan por los efectos: reparto uniforme ajustado al valle
        row_scale={"fight": 0.77},                        # la fila de combate está dibujada ~30 % más grande que el reposo (cabeza 43 px vs 32): se iguala
    ),
    "abel_sp": dict(
        src="62", label_x=596, ymax=1456, tol=30, gap=8, ref_row="sp1", ref_frame=0,
        rows=[("fly", 0, 360), ("sp1", 360, 690), ("sp2", 690, 1010), ("sp3", 1010, 1456)],
        row_label_x={"fly": 572},
        # cortes entre fotogramas (px de la hoja original, medidos en la vista previa): los efectos de unos tocan a los vecinos
        cuts={"fly": [747, 954, 1150, 1410, 1640, 1851, 2236, 2497],
              "sp1": [764, 980, 1303, 1633, 1830, 2098, 2336, 2546],
              "sp2": [798, 1053, 1307, 1610, 1977, 2360],
              "sp3": [800, 1028, 1307, 1527]},
    ),
}


def defringe(arr, passes=2):
    a = arr[..., 3] > 0
    r, g, b = arr[..., 0].astype(np.int16), arr[..., 1].astype(np.int16), arr[..., 2].astype(np.int16)
    lum = (r + g + b) // 3; sat = np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)
    light = (lum > 168) & (sat < 36)
    for _ in range(passes):
        pad = np.pad(a, 1, constant_values=False)
        edge = a & ~(pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:])
        kill = edge & light
        if not kill.any(): break
        a = a & ~kill
    out = arr.copy(); out[..., 3] = np.where(a, out[..., 3], 0)
    return out


def kill_checker_blocks(arr):
    """Quita cuadritos del tablero que quedaron pegados al personaje: regiones grises y lisas (poco color,
    brillo medio y casi sin variación) — enteras si son rectangulares (también las de dos tonos del tablero) y,
    en el tercio de abajo, también las irregulares (casilla entre las piernas / bajo las botas). El pelo, con
    contorno y sombreado, no cumple esas condiciones a la vez."""
    a = arr[..., 3] > 0
    H, W = a.shape
    rgb = arr[..., :3].astype(np.int16)
    lum = rgb.sum(axis=2) // 3; sat = rgb.max(axis=2) - rgb.min(axis=2)
    g = (a & (sat < 12) & (lum > 115) & (lum < 218)).astype(np.uint8)
    g = cv2.morphologyEx(g, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(g, connectivity=4)
    out = arr.copy()
    for i in range(1, n):
        x, y, w, h, ar = st[i]
        if ar < 12: continue
        vals = lum[lab == i]
        fill = ar / float(w * h)
        low = y + h > H * 0.62                                    # parte baja del fotograma (suelo)
        rect_one = fill >= 0.72 and vals.std() <= 10 and ar >= 30
        rect_two = fill >= 0.8 and ar >= 150 and vals.std() <= 28 and sat[lab == i].max() < 14      # varias casillas de tonos distintos
        irregular_low = low and vals.std() <= 22 and ar <= 0.07 * H * W
        if not (rect_one or rect_two or irregular_low): continue
        m = cv2.dilate((lab == i).astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool) & a
        out[m, 3] = 0
    return out


def drop_stragglers(arr, f2=1.0):
    """Quita trozos sueltos lejos del cuerpo (restos de la fila vecina o del tablero) y rellena los agujeros
    diminutos del pelo (huecos del contorno por los que se veía el fondo)."""
    a = (arr[..., 3] > 0).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(a, connectivity=8)
    if n > 2:
        main = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
        mx, my, mw, mh = st[main, :4]
        m = max(6, int(0.12 * max(mw, mh)))
        for i in range(1, n):
            if i == main: continue
            x, y, w, h, ar = st[i]
            near = x < mx + mw + m and x + w > mx - m and y < my + mh + m and y + h > my - m
            below = y >= my + mh - 2                                   # asoma por debajo del cuerpo: cabeza de la fila de abajo
            if (below or not near) and ar < 0.35 * st[main, cv2.CC_STAT_AREA]:
                arr[lab == i, 3] = 0
    # agujeros pequeños rodeados de personaje: relleno por inpainting
    solid = (arr[..., 3] > 0).astype(np.uint8)
    inv = 1 - solid
    n2, lab2, st2, _ = cv2.connectedComponentsWithStats(inv, connectivity=4)
    H, W = solid.shape
    holes = np.zeros_like(solid)
    for i in range(1, n2):
        x, y, w, h, ar = st2[i]
        touches = x == 0 or y == 0 or x + w >= W or y + h >= H
        if not touches and ar <= max(40, 0.004 * H * W):
            holes[lab2 == i] = 1
    if holes.any():
        rgb = cv2.inpaint(np.ascontiguousarray(arr[..., :3]), (cv2.dilate(holes, np.ones((3, 3), np.uint8)) * 255).astype(np.uint8), 3, cv2.INPAINT_TELEA)
        arr[..., :3] = np.where(holes[..., None] > 0, rgb, arr[..., :3])
        arr[..., 3] = np.where(holes > 0, 255, arr[..., 3])
    return arr


def feet_anchor(arr):
    """Pies: centro de los píxeles oscuros de las botas en la franja más baja; si no hay (solo efectos) → None."""
    a = arr[..., 3] > 0
    lum = arr[..., :3].astype(np.int16).sum(axis=2) // 3
    dark = a & (lum < 95)
    ys = np.where(dark.sum(axis=1) >= 2)[0]
    if not len(ys): return None
    yb = int(ys.max())
    band = dark[max(0, yb - max(6, arr.shape[0] // 14)): yb + 1]
    xs = np.where(band.any(axis=0))[0]
    return float((xs.min() + xs.max()) / 2), float(yb + 1)


def _snap(proj, x, win):
    """Mueve un corte al valle (mínimo de la proyección vertical) más cercano dentro de ±win."""
    lo, hi = max(1, int(x - win)), min(len(proj) - 1, int(x + win) + 1)
    if hi <= lo: return int(x)
    return lo + int(np.argmin(proj[lo:hi]))


def build(key):
    cfg = PACKS[key]
    img = Image.open(os.path.join(IMAGES_DIR, f"{cfg['src']}.jpg")).convert("RGB")
    W, H = img.size
    rgba = remove_bg_checker(img, tol=cfg["tol"], min_area=40)
    tones = _dominant_grays(np.array(img), 2)
    arr = np.array(rgba)
    alpha = arr[..., 3] > 0
    n, lab, st, cen = cv2.connectedComponentsWithStats(alpha.astype(np.uint8), connectivity=8)
    bands = cfg["rows"]
    rgbi = arr[..., :3].astype(np.int16); lumi = rgbi.sum(axis=2) // 3; sati = rgbi.max(axis=2) - rgbi.min(axis=2)
    f2 = (W / 1024.0) ** 2
    keep = np.zeros(n, bool)
    rowof = {}
    for i in range(1, n):
        x, y, w, h, ar = st[i]
        cx, cy = cen[i]
        if y >= cfg["ymax"] or ar < 24 * f2: continue
        sel = lab[y:y + h, x:x + w] == i
        # resto gris plano del tablero (cuadrito suelto): poco color, brillo medio y sin textura
        if ar < 900 * f2 and sati[y:y + h, x:x + w][sel].mean() < 14 and 100 < lumi[y:y + h, x:x + w][sel].mean() < 235 and lumi[y:y + h, x:x + w][sel].std() < 22: continue
        best = max(bands, key=lambda b: max(0, min(y + h, b[2]) - max(y, b[1])))
        if cx < cfg.get("row_label_x", {}).get(best[0], cfg["label_x"]): continue            # rótulo de texto
        keep[i] = True
        rowof[i] = best[0]
    kmask = keep[lab]

    frames = {}
    for name, y0, y1 in bands:
        y1 = min(y1, cfg["ymax"])
        if name in cfg.get("skip", ()): continue
        band = kmask[y0:y1].copy()
        band[:, :int(cfg.get("row_label_x", {}).get(name, cfg["label_x"]))] = False       # corte duro: ahí solo hay texto
        proj = band.sum(axis=0).astype(int)
        xs = np.where(proj > 0)[0]
        if not len(xs): continue
        xa, xb = int(xs.min()), int(xs.max()) + 1
        cuts = cfg.get("cuts", {}).get(name)
        exp = cfg.get("expect", {}).get(name)
        if cuts is not None:
            bounds = [xa] + [_snap(proj, c, 8 * (W / 1024.0)) for c in cuts] + [xb]
        elif exp:
            pitch = (xb - xa) / exp
            bounds = [xa] + [_snap(proj, xa + k * pitch, pitch * 0.28) for k in range(1, exp)] + [xb]
        else:                                                         # automático: tramos separados por huecos
            runs = []; s0 = None
            for x in range(len(proj) + 1):
                v = proj[x] > 0 if x < len(proj) else False
                if v and s0 is None: s0 = x
                if not v and s0 is not None:
                    if runs and s0 - runs[-1][1] <= cfg["gap"]: runs[-1][1] = x
                    else: runs.append([s0, x])
                    s0 = None
            areas = [int(band[:, a_:b_].sum()) for a_, b_ in runs]
            med = sorted(areas)[len(areas) // 2]
            runs = [r for r, ar in zip(runs, areas) if ar >= 0.14 * med]
            bounds = [runs[0][0]] + [(runs[k][1] + runs[k + 1][0]) // 2 for k in range(len(runs) - 1)] + [runs[-1][1]]
        out = []
        for k in range(len(bounds) - 1):
            x0, x1 = bounds[k], bounds[k + 1]
            sub_mask = band[:, x0:x1]
            ys = np.where(sub_mask.any(axis=1))[0]
            if not len(ys) or sub_mask.sum() < 60 * f2: continue
            sub = arr[y0 + ys.min():y0 + ys.max() + 1, x0:x1].copy()
            sub[..., 3] = np.where(sub_mask[ys.min():ys.max() + 1], 255, 0)
            bb = Image.fromarray(sub[..., 3]).getbbox()
            if not bb: continue
            sub = drop_stragglers(kill_checker_blocks(peel_checker(defringe(sub[bb[1]:bb[3], bb[0]:bb[2]], 2), tones, passes=6, tol=34)), f2)
            bb2 = Image.fromarray(sub[..., 3]).getbbox()
            if not bb2: continue
            sub = sub[bb2[1]:bb2[3], bb2[0]:bb2[2]]
            if name in cfg.get("clean_bottom_light", ()):
                hh = sub.shape[0]; zone = slice(int(hh * 0.9), hh)
                lum_ = sub[zone, :, :3].astype(np.int16).sum(axis=2) // 3
                sat_ = sub[zone, :, :3].astype(np.int16).max(axis=2) - sub[zone, :, :3].astype(np.int16).min(axis=2)
                sub[zone, :, 3] = np.where((lum_ > 165) & (sat_ < 40), 0, sub[zone, :, 3])
                bb3 = Image.fromarray(sub[..., 3]).getbbox()
                if bb3: sub = sub[bb3[1]:bb3[3], bb3[0]:bb3[2]]
            out.append(sub)
        frames[name] = out
        print(f"  [{key}] {name}: {len(out)} fotogramas")
    return frames, cfg


def pack(key, frames, cfg, extra_alias=None):
    # escala: no se remuestrea; px = alto nativo de referencia / alto lógico
    ref = frames[cfg["ref_row"]]
    rf = ref[cfg.get("ref_frame", None)] if "ref_frame" in cfg else None
    if rf is not None: ref_h = rf.shape[0]
    else: ref_h = sorted(f.shape[0] for f in ref)[len(ref) // 2]
    px = round(ref_h / TARGET_H, 3)
    for name, k in cfg.get("row_scale", {}).items():                  # filas dibujadas a otra escala que la de referencia
        res = []
        for fr in frames.get(name, []):
            w, h = max(1, round(fr.shape[1] * k)), max(1, round(fr.shape[0] * k))
            rgb = cv2.resize(np.ascontiguousarray(fr[..., :3]), (w, h), interpolation=cv2.INTER_AREA)
            a = cv2.resize(np.ascontiguousarray(fr[..., 3]), (w, h), interpolation=cv2.INTER_AREA)
            res.append(np.dstack([rgb, np.where(a > 127, 255, 0).astype(np.uint8)]))
        frames[name] = res
    items = []
    anims = {}
    for name, fl in frames.items():
        for idx, fr in enumerate(fl):
            a = feet_anchor(fr)
            fx = a is None
            ax, ay = (0.0, float(fr.shape[0])) if fx else a
            items.append((name, idx, fr, int(round(ax)), int(round(ay)), fx))
    maxw = 4096; x = y = shelf = 0; placed = []
    for name, idx, fr, ax, ay, fx in items:
        h, w = fr.shape[:2]
        if x + w + 2 > maxw: x = 0; y += shelf + 2; shelf = 0
        placed.append((name, idx, fr, ax, ay, fx, x, y)); x += w + 2; shelf = max(shelf, h)
    atlas = Image.new("RGBA", (maxw, y + shelf + 2), (0, 0, 0, 0))
    for name, idx, fr, ax, ay, fx, px_, py_ in placed:
        atlas.paste(Image.fromarray(fr, "RGBA"), (px_, py_))
        d = dict(x=px_, y=py_, w=int(fr.shape[1]), h=int(fr.shape[0]), ax=ax, ay=ay)
        if fx: d["fx"] = 1
        anims.setdefault(name, []).append(d)
    for new, (old, idxs) in (extra_alias or {}).items():            # alias: otra animación compuesta con fotogramas de otra
        if old in anims: anims[new] = [anims[old][i] for i in idxs if i < len(anims[old])]
    meta = {"id": key, "scale": 1.0, "height": TARGET_H, "px": px, "anims": anims}
    atlas.save(os.path.join(OUT, f"{key}.png"), optimize=True)
    json.dump(meta, open(os.path.join(OUT, f"{key}.json"), "w", encoding="utf-8"), separators=(",", ":"))
    print(f"[{key}] OK atlas {atlas.size} px={px} anims: " + ", ".join(f"{k}:{len(v)}" for k, v in anims.items()))
    # contacto
    names = list(anims.keys()); maxc = max(len(v) for v in anims.values())
    cell = 110
    sheet = Image.new("RGB", (cell * maxc, cell * len(names)), (70, 86, 62)); dr = ImageDraw.Draw(sheet)
    for ri, nm in enumerate(names):
        for ci, f in enumerate(anims[nm]):
            cr = atlas.crop((f["x"], f["y"], f["x"] + f["w"], f["y"] + f["h"]))
            z = min(1.0, (cell - 14) / max(f["w"], f["h"], 1))
            s2 = cr.resize((max(1, int(f["w"] * z)), max(1, int(f["h"] * z))), Image.LANCZOS)
            sheet.paste(s2, (ci * cell + (cell - s2.width) // 2, ri * cell + cell - 4 - s2.height), s2)
            dr.text((ci * cell + 2, ri * cell + 1), f"{nm}{ci}", fill=(255, 255, 0))
    sheet.save(os.path.join(PREVIEW, f"{key}.png"))


if __name__ == "__main__":
    keys = [a for a in sys.argv[1:] if not a.startswith("--")] or list(PACKS)
    for k in keys:
        frames, cfg = build(k)
        alias = None
        if k == "abel":
            alias = {"walk": ("run", list(range(0, 10))),
                     "attack1": ("fight", [0, 1, 2, 3, 7]),
                     "attack2": ("fight", [0, 1, 2, 4, 5, 6, 7])}
        pack(k, frames, cfg, alias)
