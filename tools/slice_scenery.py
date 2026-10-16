"""Corta las hojas de escenarios con fondo de tablero (assets 35–53) en objetos sueltos.

Uso:  python tools/slice_scenery.py <id> [<id> ...]        (id = nombre del jpg sin extensión: 35, 36…)
      python tools/slice_scenery.py --all

Para cada hoja:
  1. detecta los dos grises del tablero y rellena el fondo desde el borde (+ bolsas encerradas con ambos tonos);
  2. enmascara las zonas de texto (rótulos blancos con borde negro);
  3. separa los objetos por componentes conexas (con una pequeña dilatación para unir sus partes);
  4. recorta cada objeto, lo reduce a la escala del juego y lo empaqueta en assets/sprites/sc<id>.png + .json
     (cada objeto se llama o<N>, anclado centro-abajo) y genera tools/preview/sc<id>.png con los números.
La asignación de roles (árbol, roca, muro…) se hace luego en src/world/ArtProps.js (KITS).
"""
import json, os, sys
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from sheets_config import IMAGES_DIR

OUT = os.path.join(HERE, "..", "assets", "sprites")
PREVIEW = os.path.join(HERE, "preview")
os.makedirs(OUT, exist_ok=True); os.makedirs(PREVIEW, exist_ok=True)

# escala de juego: las hojas de 1024 px traen objetos de ~70 px (árbol); las de 2752 px, ~260 px.
SCALE_BY_WIDTH = {1024: 0.6, 2752: 0.19}
SHADOW_SHEETS = {"52", "53", "34"}          # hojas de objetos orgánicos con sombra de suelo gris horneada
MAX_H, MAX_W = 92, 150          # tope de tamaño final (px de juego): los árboles gigantes y columnas no superan ~3 Abel


def board_levels(lum, sat):
    """Los dos tonos del tablero: picos del histograma de grises sin color en el borde de la imagen."""
    h, w = lum.shape
    ring = np.zeros_like(lum, dtype=bool)
    ring[:6, :] = ring[-6:, :] = True; ring[:, :6] = ring[:, -6:] = True
    m = ring & (sat < 12)
    vals = lum[m]
    hist = np.bincount(vals.astype(np.int64), minlength=256)
    hist = np.convolve(hist, np.ones(5), mode="same")
    l1 = int(np.argmax(hist))
    h2 = hist.copy(); h2[max(0, l1 - 22): l1 + 23] = 0
    l2 = int(np.argmax(h2))
    return l1, l2


def remove_checker(img, tol=11):
    rgb = np.array(img.convert("RGB")).astype(np.int16)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    lum = (r + g + b) // 3
    sat = np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)
    l1, l2 = board_levels(lum, sat)
    like = (sat < 13) & ((np.abs(lum - l1) <= tol) | (np.abs(lum - l2) <= tol))
    # pequeño cierre para que las juntas entre cuadros (JPEG) no corten el relleno
    like_c = cv2.morphologyEx(like.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8)).astype(bool)
    n, lab, st, _ = cv2.connectedComponentsWithStats(like_c.astype(np.uint8), connectivity=4)
    bg = np.zeros(like.shape, dtype=bool)
    H, W = like.shape
    for i in range(1, n):
        x, y, w, h, a = st[i]
        touches = x == 0 or y == 0 or x + w >= W or y + h >= H
        if touches:
            bg |= lab == i
        elif a >= 90:                                   # bolsa encerrada (hueco de un arco…): solo si tiene ambos tonos
            comp = lab == i
            f1 = (np.abs(lum[comp] - l1) <= tol).mean(); f2 = (np.abs(lum[comp] - l2) <= tol).mean()
            if f1 > 0.22 and f2 > 0.22: bg |= comp
        if not touches and a >= 28:                     # una casilla suelta del tablero: rectángulo plano y pequeño
            fs = W / 1024
            if 6 * fs <= w <= 26 * fs and 6 * fs <= h <= 26 * fs and a >= 0.9 * w * h:
                bg |= lab == i
    alpha = (~bg).astype(np.uint8) * 255
    alpha = cv2.morphologyEx(alpha, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
    rgba = np.dstack([np.array(img.convert("RGB")), alpha])
    return Image.fromarray(rgba, "RGBA"), (l1, l2)


def text_mask(img_rgb):
    """Zonas de texto: bandas con muchos píxeles blancos puros (rótulos); devuelve rectángulos."""
    a = np.array(img_rgb.convert("RGB")).astype(np.int16)
    lum = a.sum(axis=2) // 3; sat = a.max(axis=2) - a.min(axis=2)
    white = (lum >= 246) & (sat < 8)
    H, W = white.shape
    rows = white.sum(axis=1)
    thr = max(10, W // 70)
    rects = []
    y = 0
    while y < H:
        if rows[y] >= thr:
            y0 = y
            while y < H and (rows[y] >= thr or (y + 1 < H and rows[y + 1] >= thr) or (y + 2 < H and rows[y + 2] >= thr)): y += 1
            y1 = y
            if y1 - y0 >= 5:
                band = white[y0:y1]
                xs = np.where(band.any(axis=0))[0]
                if len(xs): rects.append((int(xs.min()) - 6, y0 - 6, int(xs.max()) + 6, y1 + 6))
        y += 1
    return rects


def defringe(arr, passes=2):
    """Quita el halo claro del tablero en el borde del sprite (píxeles del borde, claros y sin color)."""
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


def bake_shadow(arr):
    """Las hojas traen sombras grises de suelo pegadas a la base del objeto (mezcladas con el tablero):
    las zonas grises planas de la franja inferior conectadas al borde de abajo pasan a sombra oscura translúcida."""
    h, w = arr.shape[:2]
    if h < 10 or w < 8: return arr
    a = arr[..., 3] > 0
    rgb = arr[..., :3].astype(np.float32)
    lum = rgb.mean(axis=2); sat = rgb.max(axis=2) - rgb.min(axis=2)
    gx = np.abs(np.diff(lum, axis=1, prepend=lum[:, :1])); gy = np.abs(np.diff(lum, axis=0, prepend=lum[:1]))
    cand = a & (sat < 20) & (lum > 50) & (lum < 232)                  # gris neutro: solo puede ser sombra o halo (el resto es marrón/verde/naranja)
    cand[: int(h * 0.35)] = False                                   # solo la mitad inferior
    n, lab, st, _ = cv2.connectedComponentsWithStats(cand.astype(np.uint8), connectivity=8)
    out = arr.copy()
    for i in range(1, n):
        x, y, ww, hh, ar = st[i]
        if ar < 14: continue
        if y + hh < h - 2 and not (lab[min(h - 1, y + hh), x:x + ww] > 0).any(): pass
        sel = lab == i
        out[sel, 0] = 8; out[sel, 1] = 6; out[sel, 2] = 14
        out[sel, 3] = 96
    return out


def slice_sheet(sid):
    path = os.path.join(IMAGES_DIR, f"{sid}.jpg")
    img = Image.open(path).convert("RGB")
    W, H = img.size
    scale = SCALE_BY_WIDTH.get(W, 0.85 * 1024 / W)
    rgba, levels = remove_checker(img)
    a = np.array(rgba)[..., 3]
    f = W / 1024
    # rótulos: bandas de filas sin color (letras negras/blancas) de poca altura; se borran los grupos de letras
    rgbt = np.array(img).astype(np.int16)
    lumt = rgbt.sum(axis=2) // 3; satt = rgbt.max(axis=2) - rgbt.min(axis=2)
    nb = a > 0
    low = (satt < 18) & nb
    ext = ((lumt <= 42) | (lumt >= 214)) & low
    cnt = nb.sum(axis=1); lcnt = low.sum(axis=1)
    qual = (cnt >= 60) & (lcnt >= 0.9 * np.maximum(cnt, 1))
    y = 0
    while y < H:
        if qual[y]:
            y0 = y
            while y < H and (qual[y] or (y + 1 < H and qual[y + 1])): y += 1
            if 11 * f <= y - y0 <= 32 * f:
                cols = np.where(low[y0:y].any(axis=0))[0]
                if len(cols):
                    start = prev = cols[0]
                    for xx in list(cols[1:]) + [None]:
                        if xx is None or xx - prev > 22 * f:
                            blk_a = nb[y0:y, start:prev + 1]
                            if blk_a.sum() > 0 and ext[y0:y, start:prev + 1].sum() / blk_a.sum() >= 0.40:
                                a[max(0, y0 - 2): y + 2, max(0, int(start) - 3): int(prev) + 4] = 0
                            start = xx
                        if xx is not None: prev = xx
        y += 1
    # casillas del tablero que quedaron pegadas a un objeto: manchas grises planas y rectangulares
    rgb0 = np.array(img).astype(np.int16)
    lum0 = rgb0.sum(axis=2) // 3; sat0 = rgb0.max(axis=2) - rgb0.min(axis=2)
    gry = ((sat0 < 14) & (lum0 > 110) & (lum0 < 235) & (a > 0)).astype(np.uint8)
    ng, labg, stg, _ = cv2.connectedComponentsWithStats(gry, connectivity=8)
    for i in range(1, ng):
        x, y, w, h, ar = stg[i]
        if ar >= 36 * f * f and ar >= 0.8 * w * h and lum0[labg == i].std() < 12 and 120 < lum0[labg == i].mean() < 225:
            a[labg == i] = 0
    # tiles de suelo planos (cuadrados): se recortan aparte y se sacan de la máscara de objetos
    tiles = []
    opened = cv2.morphologyEx((a > 0).astype(np.uint8), cv2.MORPH_OPEN, np.ones((max(3, int(18 * f)), max(3, int(18 * f))), np.uint8))
    nt, labt, stt, _ = cv2.connectedComponentsWithStats(opened, connectivity=4)
    for i in range(1, nt):
        x, y, w, h, area = stt[i]
        if 50 * f <= w <= 100 * f and 50 * f <= h <= 100 * f and abs(w - h) <= 0.14 * max(w, h) and area >= 0.86 * w * h:
            op = a[y:y + h, x:x + w] > 0                       # bordes rectos y sólidos (un arbusto redondo no los tiene)
            q = max(2, int(4 * f))
            edges = [op[q, :].mean(), op[-1 - q, :].mean(), op[:, q].mean(), op[:, -1 - q].mean()]
            if min(edges) >= 0.9: tiles.append((int(x), int(y), int(w), int(h)))
    for (x, y, w, h) in tiles:
        m = max(2, int(3 * f))
        a[max(0, y - m): y + h + m, max(0, x - m): x + w + m] = 0
    # quitar motas pequeñas y letras de los rótulos (componentes bajos y casi negros)
    rgb_i = np.array(img).astype(np.int16)
    lum_i = rgb_i.sum(axis=2) // 3; sat_i = rgb_i.max(axis=2) - rgb_i.min(axis=2)
    dark = (lum_i <= 26) & (sat_i <= 14)
    n, lab, st, _ = cv2.connectedComponentsWithStats((a > 0).astype(np.uint8), connectivity=8)
    keep = np.zeros(n, bool)
    for i in range(1, n):
        x, y, w, h, area = st[i]
        if area < max(24, int(W * W / 2.2e5 * 3)): continue
        if h < 24 * f: continue                                           # letras y motas
        if area < 1100 * f * f:                                           # restos grises del tablero (sin color y de tono medio)
            sel0 = lab[y:y + h, x:x + w] == i
            if sat_i[y:y + h, x:x + w][sel0].mean() < 9 and 105 < lum_i[y:y + h, x:x + w][sel0].mean() < 235: continue
        if h < 34 * f and w < 70 * f:
            sel = lab[y:y + h, x:x + w] == i
            if dark[y:y + h, x:x + w][sel].mean() > 0.36: continue         # letra grande de rótulo
        keep[i] = True
    a = np.where(keep[lab], 255, 0).astype(np.uint8)
    rgba_arr = np.array(rgba); rgba_arr[..., 3] = a
    # objetos = componentes de la máscara dilatada
    k = max(3, int(W / 300))
    dil = cv2.dilate((a > 0).astype(np.uint8), np.ones((k, k), np.uint8), iterations=1)
    n2, lab2, st2, _ = cv2.connectedComponentsWithStats(dil, connectivity=8)
    objs = []
    for i in range(1, n2):
        x, y, w, h, area = st2[i]
        if w < 10 * f or h < 10 * f: continue
        sub = a[y:y + h, x:x + w] > 0
        if sub.sum() < max(60, int(W * W / 2.2e5 * 12)): continue
        objs.append(dict(x=int(x), y=int(y), w=int(w), h=int(h)))
    # orden de lectura: por filas (bandas de ~80 px de la hoja de 1024) y luego por x
    band = 70 * W / 1024
    objs.sort(key=lambda o: (int((o["y"] + o["h"]) // band), o["x"]))
    prev = Image.new("RGB", (W, H), (255, 0, 255)); prev.paste(Image.fromarray(rgba_arr, "RGBA"), (0, 0), Image.fromarray(rgba_arr, "RGBA"))
    dr = ImageDraw.Draw(prev)
    frames = []
    for idx, o in enumerate(objs):
        x, y, w, h = o["x"], o["y"], o["w"], o["h"]
        crop = Image.fromarray(rgba_arr[y:y + h, x:x + w], "RGBA")
        # solo píxeles de esta componente (evita restos vecinos)
        m = (lab2[y:y + h, x:x + w] == (lab2[y + h // 2, x + w // 2] if lab2[y + h // 2, x + w // 2] else 0))
        comp_id = None
        for yy in range(y, y + h, max(1, h // 8)):
            for xx in range(x, x + w, max(1, w // 8)):
                if lab2[yy, xx]: comp_id = lab2[yy, xx]; break
            if comp_id: break
        if comp_id:
            mask = lab2[y:y + h, x:x + w] == comp_id
            arr = np.array(crop); arr[..., 3] = np.where(mask, arr[..., 3], 0)
            # fuera trocitos de rótulo pegados al objeto: componentes diminutos frente al principal
            nc, lc, sc_, _ = cv2.connectedComponentsWithStats((arr[..., 3] > 0).astype(np.uint8), connectivity=8)
            if nc > 2:
                big = sc_[1:, cv2.CC_STAT_AREA].max()
                for j in range(1, nc):
                    if sc_[j, cv2.CC_STAT_AREA] < 0.08 * big: arr[lc == j, 3] = 0
            sub_rgb = rgb_i[y:y + h, x:x + w]
            lm = sub_rgb.sum(axis=2) // 3; sm_ = sub_rgb.max(axis=2) - sub_rgb.min(axis=2)
            opq = arr[..., 3] > 0
            if opq.any() and h < 44 * f and ((lm <= 26) & (sm_ <= 14) & opq).sum() / opq.sum() > 0.30: continue      # es solo texto
            crop = Image.fromarray(arr, "RGBA")
        sc_obj = scale
        if h * sc_obj > MAX_H: sc_obj = MAX_H / h
        if w * sc_obj > MAX_W: sc_obj = MAX_W / w
        nw, nh = max(1, round(w * sc_obj)), max(1, round(h * sc_obj))
        pm = crop.convert("RGBa").resize((nw, nh), Image.LANCZOS).convert("RGBA")
        arr = np.array(pm); arr[..., 3] = np.where(arr[..., 3] > 110, 255, 0)
        arr = defringe(arr, 2)
        if sid in SHADOW_SHEETS: arr = bake_shadow(arr)
        sm = Image.fromarray(arr, "RGBA")
        bb = sm.getchannel("A").getbbox()
        if not bb: continue
        sm = sm.crop(bb)
        frames.append((idx, sm))
        dr.rectangle([x, y, x + w, y + h], outline=(255, 255, 0), width=1)
        dr.text((x + 2, y + 1), str(idx), fill=(255, 255, 0))
    prev.save(os.path.join(PREVIEW, f"sc{sid}_src.png"))
    # tiles de suelo: tira de 48×48 (recorte interior del cuadrado)
    gt = []
    for (x, y, w, h) in sorted(tiles, key=lambda t: (int(t[1] // (60 * f)), t[0])):
        m = max(3, int(5 * f))
        cr = img.crop((x + m, y + m, x + w - m, y + h - m))
        gt.append(cr.resize((48, 48), Image.LANCZOS))
    if gt:
        strip = Image.new("RGB", (48 * len(gt), 48))
        for i, t in enumerate(gt): strip.paste(t, (i * 48, 0))
        strip.save(os.path.join(OUT, f"sc{sid}_ground.png"), optimize=True)
        json.dump({"tiles": len(gt), "size": 48}, open(os.path.join(OUT, f"sc{sid}_ground.json"), "w"))
    # empaquetado
    ROW_W = 1024
    x = y = rowh = 0; pos = {}
    for idx, im in sorted(frames, key=lambda f: -f[1].height):
        if x + im.width + 2 > ROW_W: x = 0; y += rowh + 2; rowh = 0
        pos[idx] = (x, y); x += im.width + 2; rowh = max(rowh, im.height)
    atlas = Image.new("RGBA", (ROW_W, y + rowh + 2), (0, 0, 0, 0))
    meta = {"id": f"sc{sid}", "scale": scale, "height": 0, "px": 1, "anims": {}}
    for idx, im in frames:
        px, py = pos[idx]; atlas.alpha_composite(im, (px, py))
        meta["anims"][f"o{idx}"] = [{"x": px, "y": py, "w": im.width, "h": im.height, "ax": im.width // 2, "ay": im.height - 1}]
    atlas.save(os.path.join(OUT, f"sc{sid}.png"), optimize=True)
    json.dump(meta, open(os.path.join(OUT, f"sc{sid}.json"), "w"), separators=(",", ":"))
    # contacto numerado
    cell = 170
    cols = 8
    rows = (len(frames) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * cell, rows * cell), (88, 104, 78))
    d2 = ImageDraw.Draw(sheet)
    for n_, (idx, im) in enumerate(frames):
        cx, cy = (n_ % cols) * cell, (n_ // cols) * cell
        mx = max(im.width, im.height)
        z = min(1.0, (cell - 22) / mx) if mx > cell - 22 else (2.0 if mx * 2 <= cell - 22 else 1.0)
        s2 = im.resize((max(1, int(im.width * z)), max(1, int(im.height * z))), Image.NEAREST) if z != 1 else im
        sheet.paste(s2, (cx + (cell - s2.width) // 2, cy + cell - 18 - s2.height), s2)
        d2.rectangle([cx, cy, cx + cell - 1, cy + cell - 1], outline=(70, 86, 62))
        d2.text((cx + 4, cy + cell - 13), f"o{idx}  {im.width}x{im.height}", fill=(255, 255, 0))
    sheet.save(os.path.join(PREVIEW, f"sc{sid}.png"))
    print(f"[sc{sid}] {W}x{H} niveles={levels} escala={scale:.2f} objetos={len(frames)} tiles_suelo={len(gt)} atlas={atlas.size}")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    ids = [str(i) for i in range(35, 54)] if "--all" in sys.argv else args
    for sid in ids:
        slice_sheet(sid)
