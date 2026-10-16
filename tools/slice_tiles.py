"""Corta la hoja «Tierras áridas y otoñales» en un atlas de objetos (assets/sprites/autumn.png + .json).

Cada objeto se recorta con una caja (coordenadas de la vista de 2000 px de ancho de la hoja original),
se le quita el fondo de papel cuadriculado y se reduce con alfa premultiplicado al tamaño del juego.
Anclaje: centro-abajo (la base del objeto). Los tiles de terreno se guardan en autumn_ground.png (tileables aproximados).

Uso: python tools/slice_tiles.py
"""
import json, os, sys
import numpy as np
import cv2
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from bgremove import remove_bg
from sheets_config import IMAGES_DIR

OUT = os.path.join(HERE, "..", "assets", "sprites")
PREVIEW = os.path.join(HERE, "preview")
SRC = Image.open(os.path.join(IMAGES_DIR, "34.jpg")).convert("RGB")
K = SRC.width / 2000.0                       # de la vista de 2000 px a la hoja original

# nombre: (x0, y0, x1, y1, escala)   escala = factor de reducción respecto a la hoja original
S = 0.27
OBJECTS = {
    # rocas y acantilados
    "rockMesa":   (20, 498, 295, 740, S),      "rockCrag":   (312, 530, 540, 740, S),
    "stoneA":     (558, 498, 658, 612, S),     "stoneB":     (562, 628, 660, 752, S),
    "plateau":    (893, 498, 1238, 748, S),
    "boulder":    (1258, 495, 1398, 625, S),   "pebbles":    (1408, 545, 1498, 625, S),
    "mossRock":   (1512, 492, 1652, 618, S),   "flatRock":   (1262, 658, 1394, 742, S),
    "mossSlab":   (1422, 622, 1648, 748, S),   "slab":       (1682, 498, 1972, 720, S),
    # vegetación
    "deadBushA":  (35, 865, 150, 968, S),      "deadBushB":  (168, 858, 268, 968, S),
    "fernA":      (288, 852, 392, 962, S),     "treeBig":    (418, 852, 610, 1052, S),
    "treeSmall":  (622, 858, 730, 968, S),     "deadBushC":  (752, 862, 862, 968, S),
    "wheatA":     (872, 848, 988, 972, S),     "grassOrange": (1008, 852, 1122, 968, S),
    "wheatB":     (1142, 838, 1242, 968, S),   "reedsRed":   (1262, 826, 1362, 968, S),
    "flowers":    (1412, 868, 1558, 968, S),   "flowerBush": (1568, 842, 1668, 938, S),
    "logA":       (1698, 812, 1828, 888, S),   "logBig":     (1532, 962, 1712, 1078, S),
    "rockCrow":   (1722, 888, 1918, 1042, S),  "rockStackS": (1842, 780, 1968, 872, S),
    "berryBush":  (38, 982, 152, 1092, S),     "dryBush":    (168, 982, 268, 1078, S),
    "fernB":      (285, 982, 392, 1062, S),
}
# texturas de suelo (tiles de 145 px en la vista de 2000)
GROUND = {
    "dirt":   (35, 100, 180, 245),   "crack":  (193, 100, 338, 245),  "dirtDark": (350, 100, 495, 245),
    "gold1":  (1030, 100, 1175, 245), "gold2": (1187, 100, 1332, 245), "gold3": (1345, 100, 1490, 245),
    "cracked": (35, 258, 180, 402),  "patch": (193, 258, 338, 402),
}

def premul_down(img, scale):
    a = np.array(img.convert("RGBA")).astype(np.float32)
    al = a[..., 3:4] / 255.0
    pm = np.concatenate([a[..., :3] * al, a[..., 3:4]], axis=2)
    h, w = a.shape[:2]
    nw, nh = max(1, round(w * scale)), max(1, round(h * scale))
    pm = cv2.resize(pm, (nw, nh), interpolation=cv2.INTER_AREA)
    alpha = pm[..., 3:4]
    rgb = np.where(alpha > 1, pm[..., :3] / np.maximum(alpha / 255.0, 1e-3), 0)
    out = np.concatenate([np.clip(rgb, 0, 255), np.where(alpha > 110, 255, 0)], axis=2).astype(np.uint8)   # alfa binaria: píxel art
    return Image.fromarray(out, "RGBA")

def trim(img):
    bb = img.getchannel("A").point(lambda v: 255 if v else 0).getbbox()
    return img.crop(bb) if bb else img

def main():
    frames, tiles = {}, []
    for name, (x0, y0, x1, y1, sc) in OBJECTS.items():
        crop = SRC.crop((int(x0 * K), int(y0 * K), int(x1 * K), int(y1 * K)))
        cut = remove_bg(crop, dark=92, sat_min=70, halo_passes=2, min_area=60, holes=False, close_iter=2)
        # restos de papel dentro del objeto (huecos entre ramas): píxeles casi blancos y sin color
        arr = np.array(cut); rgb = arr[..., :3].astype(np.int16)
        lum = rgb.sum(axis=2) // 3; sat = rgb.max(axis=2) - rgb.min(axis=2)
        paper = ((rgb[..., 0] >= 198) & (rgb[..., 2] >= 148) & (lum > 170)) if name not in ("flowers", "flowerBush") else (lum > 215) & (sat < 22)
        arr[..., 3] = np.where(paper, 0, arr[..., 3]); cut = Image.fromarray(arr, "RGBA")
        # quedarse con la componente mayor + las cercanas (sombras sueltas fuera)
        al = np.array(cut.getchannel("A"))
        n, lab, st, _ = cv2.connectedComponentsWithStats((al > 0).astype(np.uint8), connectivity=8)
        if n > 1:
            big = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
            keep = np.zeros(n, bool); keep[big] = True
            bx0, by0, bw, bh = st[big, :4]
            for i in range(1, n):
                if i != big and st[i, cv2.CC_STAT_AREA] >= 150:
                    cx, cy = st[i, 0] + st[i, 2] / 2, st[i, 1] + st[i, 3] / 2
                    if bx0 - 40 < cx < bx0 + bw + 40 and by0 - 40 < cy < by0 + bh + 40: keep[i] = True
            arr = np.array(cut); arr[..., 3] = np.where(keep[lab], arr[..., 3], 0)
            cut = Image.fromarray(arr, "RGBA")
        small = trim(premul_down(cut, sc))
        frames[name] = small
    # empaquetado en filas
    PAD, ROW_W = 2, 640
    x = y = rowh = 0; pos = {}
    for name, im in sorted(frames.items(), key=lambda kv: -kv[1].height):
        if x + im.width + PAD > ROW_W: x = 0; y += rowh + PAD; rowh = 0
        pos[name] = (x, y); x += im.width + PAD; rowh = max(rowh, im.height)
    atlas = Image.new("RGBA", (ROW_W, y + rowh + PAD), (0, 0, 0, 0))
    meta = {"id": "autumn", "scale": 1, "height": 0, "anims": {}}
    for name, im in frames.items():
        px, py = pos[name]; atlas.alpha_composite(im, (px, py))
        meta["anims"][name] = [{"x": px, "y": py, "w": im.width, "h": im.height, "ax": im.width // 2, "ay": im.height - 1}]
    atlas.save(os.path.join(OUT, "autumn.png"), optimize=True)
    json.dump(meta, open(os.path.join(OUT, "autumn.json"), "w"), separators=(",", ":"))
    print("objetos:", len(frames), "atlas:", atlas.size)
    # vista previa
    prev = Image.new("RGBA", (atlas.width * 3, atlas.height * 3), (90, 110, 70, 255))
    prev.alpha_composite(atlas.resize((atlas.width * 3, atlas.height * 3), Image.NEAREST)); prev.save(os.path.join(PREVIEW, "autumn.png"))
    # suelo: tiles recortados a 48×48 (un poco hacia dentro para evitar los bordes blancos de la hoja)
    gw = []
    for name, (x0, y0, x1, y1) in GROUND.items():
        t = SRC.crop((int((x0 + 6) * K), int((y0 + 6) * K), int((x1 - 6) * K), int((y1 - 6) * K))).resize((48, 48), Image.LANCZOS)
        gw.append(t)
    g = Image.new("RGB", (48 * len(gw), 48))
    for i, t in enumerate(gw): g.paste(t, (i * 48, 0))
    g.save(os.path.join(OUT, "autumn_ground.png"), optimize=True)
    json.dump({"tiles": list(GROUND.keys()), "size": 48}, open(os.path.join(OUT, "autumn_ground.json"), "w"))
    for name, im in frames.items(): print(f"  {name:12s} {im.width}x{im.height}")

main()
