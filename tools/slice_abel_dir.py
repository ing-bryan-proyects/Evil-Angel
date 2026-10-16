"""Corta las hojas direccionales de Abel (idle / run / dash / jump, hojas 58/57/56/55) en atlas listos para el juego.

OJO con la estructura real de estas hojas (generadas por IA): los rótulos de la izquierda prometen 8 filas × 10
fotogramas, pero lo dibujado son 5 FILAS de ~9 fotogramas, de alturas distintas (la fila frontal mide ~82 px y las
de perfil/espalda ~102 px). Cortar en 8 bandas iguales partía a Abel por la cintura. Aquí las filas se localizan por
sus valles horizontales y se interpretan así:

    fila 1 = S (de frente)   fila 2 = SE (3/4 frontal derecha)   fila 3 = E (perfil derecho)
    fila 4 = N (de espalda)  fila 5 = O (perfil izquierdo)

y se completan las 8 direcciones que lee CharMotion ("S","SE","E","NE","N","NO","O","SO"):
    NE ← E,  NO ← O,  SO ← SE reflejado.
Cada fila se reescala para que Abel mida lo mismo en todas (sin saltos de tamaño al girar), el fondo de tablero se
quita con el relleno desde el borde de bgremove.remove_bg_checker y, en idle, se descartan los fotogramas en que
Abel mira hacia el lado contrario al de su fila (el tablero de IA mezcla poses de frente y de espalda en la misma
fila; si no, Abel "se daría la vuelta solo" estando quieto).

Uso:  python tools/slice_abel_dir.py <modo> [<modo> ...]      (modo = idle | run | dash | jump)
      python tools/slice_abel_dir.py --all
"""
import json, os, sys
import numpy as np
import cv2
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from bgremove import remove_bg_checker, remove_bg_checker_board, _dominant_grays, peel_checker
from slice_abel_pack import defringe, kill_checker_blocks, drop_stragglers, feet_anchor
from sheets_config import IMAGES_DIR

OUT = os.path.join(HERE, "..", "assets", "sprites")
PREVIEW = os.path.join(HERE, "preview")
os.makedirs(OUT, exist_ok=True); os.makedirs(PREVIEW, exist_ok=True)

LABEL_X = 296                       # a la izquierda solo hay rótulos
Y_END = 516                         # por debajo, el título de la hoja
CUTS = [95, 178, 287, 402]          # fronteras nominales entre las 5 filas (se ajustan al valle más cercano)
ROW_DIR = ["S", "SE", "E", "N", "O"]
DIRS = ["S", "SE", "E", "NE", "N", "NO", "O", "SO"]
TARGET_H = 36                       # alto lógico de Abel en el juego
REF_H = 82                          # alto nativo de la fila frontal (S) tras normalizar -> px = REF_H / TARGET_H

MODES = {"idle": "58", "run": "57", "dash": "56", "jump": "55"}
# Método de quitar el fondo por hoja: en 57/58 el pelo es más claro que las casillas y el relleno desde el borde va bien;
# en 55/56 el pelo casi no tiene contorno oscuro y es del mismo gris que una casilla: el relleno se colaba y lo vaciaba,
# así que ahí se quita solo lo que coincide en color con las dos casillas.
METHOD = {"idle": "flood", "run": "flood", "dash": "flood", "jump": "flood"}
SAT_MIN = {"idle": 18, "run": 18, "dash": 8, "jump": 8}      # 55/56: el pelo es lavanda (azul-rojo ~ 12) y el tablero neutro (<= 4): el matiz lo distingue


def skin_ratio(arr):
    """Fracción de píxeles de piel (naranja claro) en el 45 % superior del fotograma: sin cara (espalda) ≈ 0."""
    h = max(1, int(arr.shape[0] * 0.45))
    top = arr[:h]
    a = top[..., 3] > 0
    r, g, b = top[..., 0].astype(int), top[..., 1].astype(int), top[..., 2].astype(int)
    skin = a & (r > 170) & (r - b > 50) & (g > 110) & (r - g < 90)
    return skin.sum() / max(1, a.sum())


def _snap_row(hproj, y, win=9):
    lo, hi = max(1, y - win), min(len(hproj) - 1, y + win + 1)
    return lo + int(np.argmin(hproj[lo:hi]))


def slice_mode(mode):
    img = Image.open(os.path.join(IMAGES_DIR, f"{MODES[mode]}.jpg")).convert("RGB")
    W, H = img.size
    if METHOD[mode] == "flood": arr = np.array(remove_bg_checker(img, min_area=40, sat_min=SAT_MIN[mode]))
    else: arr = np.array(remove_bg_checker_board(img, tol=34, min_area=40))
    tones = _dominant_grays(np.array(img), 2)
    mask = arr[..., 3] > 0
    mask[:, :LABEL_X] = False
    mask[Y_END:, :] = False
    # fotogramas sueltos de tablero (cuadritos grises lisos) antes de cortar
    hproj = mask.sum(axis=1)
    cuts = [0] + [_snap_row(hproj, c) for c in CUTS] + [Y_END]
    rows = {}
    for ri, name in enumerate(ROW_DIR):
        y0, y1 = cuts[ri], cuts[ri + 1]
        band = mask[y0:y1]
        proj = band.sum(axis=0)
        runs = []; s0 = None
        for x in range(len(proj) + 1):
            v = proj[x] > 0 if x < len(proj) else False
            if v and s0 is None: s0 = x
            if not v and s0 is not None:
                if runs and s0 - runs[-1][1] <= 3: runs[-1][1] = x
                else: runs.append([s0, x])
                s0 = None
        areas = [int(band[:, a:b].sum()) for a, b in runs]
        med = sorted(areas)[len(areas) // 2]
        runs = [r for r, ar in zip(runs, areas) if ar >= 0.45 * med]       # fuera restos / estelas sueltas
        frames = []
        for (x0, x1) in runs:
            sub_mask = band[:, x0:x1]
            ys = np.where(sub_mask.any(axis=1))[0]
            sub = arr[y0 + ys.min():y0 + ys.max() + 1, x0:x1].copy()
            sub[..., 3] = np.where(sub_mask[ys.min():ys.max() + 1], 255, 0)
            sub = drop_stragglers(kill_checker_blocks(peel_checker(defringe(sub, 2), tones)))
            bb = Image.fromarray(sub[..., 3]).getbbox()
            if not bb: continue
            frames.append(sub[bb[1]:bb[3], bb[0]:bb[2]])
        rows[name] = frames
    return rows


def pick_facing(rows, mode):
    """Descarta fotogramas que miran al lado contrario del de su fila (solo hace falta en idle)."""
    if mode != "idle": return rows
    out = {}
    for name, frames in rows.items():
        sk = [skin_ratio(f) for f in frames]
        want_face = name != "N"
        keep = [f for f, s in zip(frames, sk) if (s > 0.035) == want_face]
        out[name] = keep if len(keep) >= 3 else frames
        print(f"    {name}: {len(frames)} -> {len(out[name])} (piel {', '.join(f'{s:.2f}' for s in sk)})")
    return out


DROP_FIRST = {"run": ("E", "O")}          # el primer fotograma de esas filas es una pose de pie, no parte del ciclo de carrera


def normalize(rows):
    """Reescala cada fila para que la mediana de alturas sea REF_H (Abel mide lo mismo girando)."""
    out = {}
    for name, frames in rows.items():
        hs = sorted(f.shape[0] for f in frames)
        med = hs[len(hs) // 2]
        k = REF_H / float(med)
        res = []
        for f in frames:
            if abs(k - 1) < 0.02: res.append(f); continue
            w, h = max(1, round(f.shape[1] * k)), max(1, round(f.shape[0] * k))
            # el alfa se reescala aparte y se vuelve a binarizar (bordes limpios, sin halo)
            rgb = cv2.resize(np.ascontiguousarray(f[..., :3]), (w, h), interpolation=cv2.INTER_AREA)
            a = cv2.resize(np.ascontiguousarray(f[..., 3]), (w, h), interpolation=cv2.INTER_AREA)
            res.append(np.dstack([rgb, np.where(a > 127, 255, 0).astype(np.uint8)]))
        out[name] = res
        print(f"    {name}: mediana {med} px -> ×{k:.2f}")
    return out


def full_dirs(rows):
    """5 filas -> 8 direcciones; devuelve {dir: [(array, espejado)]}."""
    mapping = {"S": ("S", False), "SE": ("SE", False), "E": ("E", False), "NE": ("E", False),
               "N": ("N", False), "NO": ("O", False), "O": ("O", False), "SO": ("SE", True)}
    return {d: [(f, mir) for f in rows[src]] for d, (src, mir) in mapping.items()}


def build(mode):
    print(f"[{mode}] hoja {MODES[mode]}")
    # La hoja de dash (56) está llena de estelas rojas/blancas que funden las poses vecinas en fotogramas dobles; los
    # fotogramas limpios de la carrera (57) con los efectos del propio juego (rastro, polvo) quedan mucho mejor.
    rows = slice_mode("run" if mode == "dash" else mode)
    for n, f in rows.items(): print(f"   fila {n}: {len(f)} fotogramas")
    for n in DROP_FIRST.get("run" if mode == "dash" else mode, ()): rows[n] = rows[n][1:]
    rows = pick_facing(rows, mode)
    rows = normalize(rows)
    dirs = full_dirs(rows)

    # empaquetado en estantes (las direcciones que comparten fila apuntan al mismo recorte)
    maxw = 2048; x = y = shelf_h = 0
    placed = {}                                  # (fila, idx, espejado) -> (x, y, w, h, ax, ay)
    items = []
    for d in DIRS:
        src = {"S": "S", "SE": "SE", "E": "E", "NE": "E", "N": "N", "NO": "O", "O": "O", "SO": "SE"}[d]
        mir = d == "SO"
        for idx, (f, _) in enumerate(dirs[d]):
            key = (src, idx, mir)
            if key in placed: continue
            fa = f[:, ::-1].copy() if mir else f
            ft = feet_anchor(fa)
            ax, ay = ft if ft else (fa.shape[1] / 2.0, float(fa.shape[0]))
            im = Image.fromarray(fa, "RGBA")
            if x + im.width + 2 > maxw: x = 0; y += shelf_h + 2; shelf_h = 0
            placed[key] = (x, y, im, round(ax), round(ay))
            x += im.width + 2; shelf_h = max(shelf_h, im.height)
            items.append(key)
    atlas = Image.new("RGBA", (maxw, y + shelf_h + 2), (0, 0, 0, 0))
    for key, (px, py, im, ax, ay) in placed.items(): atlas.paste(im, (px, py))
    meta = {"id": f"abel_{mode}dir", "scale": 1.0, "height": TARGET_H, "px": round(REF_H / TARGET_H, 3), "anims": {}}
    for d in DIRS:
        src = {"S": "S", "SE": "SE", "E": "E", "NE": "E", "N": "N", "NO": "O", "O": "O", "SO": "SE"}[d]
        mir = d == "SO"
        for idx in range(len(dirs[d])):
            px, py, im, ax, ay = placed[(src, idx, mir)]
            meta["anims"].setdefault(d, []).append({"x": px, "y": py, "w": im.width, "h": im.height, "ax": ax, "ay": ay})
    key = f"abel_{mode}dir"
    atlas.save(os.path.join(OUT, f"{key}.png"), optimize=True)
    json.dump(meta, open(os.path.join(OUT, f"{key}.json"), "w", encoding="utf-8"), separators=(",", ":"))
    print(f"[{key}] OK atlas {atlas.size} px {meta['px']}  " + ", ".join(f"{d}:{len(meta['anims'][d])}" for d in DIRS))

    # contacto: fila = dirección, columna = fotograma; marca el ancla
    cell = 100
    maxc = max(len(v) for v in meta["anims"].values())
    sheet = Image.new("RGB", (cell * maxc, cell * 8), (70, 86, 62))
    dr = ImageDraw.Draw(sheet)
    for ri, d in enumerate(DIRS):
        for ci, f in enumerate(meta["anims"][d]):
            crop = atlas.crop((f["x"], f["y"], f["x"] + f["w"], f["y"] + f["h"]))
            cx, cy = ci * cell, ri * cell
            ox, oy = cx + cell // 2 - f["ax"], cy + cell - 6 - f["ay"]
            sheet.paste(crop, (ox, oy), crop)
            dr.line([(cx + cell // 2 - 3, cy + cell - 6), (cx + cell // 2 + 3, cy + cell - 6)], fill=(255, 0, 0))
            dr.text((cx + 2, cy + 1), f"{d}{ci}", fill=(255, 255, 0))
    sheet.save(os.path.join(PREVIEW, f"{key}.png"))


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    modes = list(MODES) if "--all" in sys.argv else args
    for m in modes:
        if m not in MODES: print(f"modo desconocido: {m}"); continue
        build(m)
