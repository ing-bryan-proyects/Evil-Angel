"""Repara los sprites de escenario de las hojas de origen: (1) copas de árbol recortadas y (2) PROPORCIONES.

(1) Repara las copas de árbol recortadas en la hoja de origen (los robles de sc48 salen con la parte de arriba cortada
en línea recta: el generador de la hoja los metió en celdas más bajas que su copa).

Para cada árbol de la lista se añade por arriba una cúpula de hojas: el contorno es una semielipse con bordes
irregulares (ruido de racimos de hojas) y el relleno se toma de las filas altas de la propia copa, así que el color y
la textura continúan sin juntas. Los fotogramas corregidos se añaden al final del atlas y las entradas del JSON apuntan
a ellos (el resto del atlas queda intacto). Idempotente: parte siempre de la copia original (assets/sprites/_orig).

(2) Escala: Abel mide 36 px; los árboles y casas de las hojas estaban dibujados a su propia escala (una casa de 86 px
con una puerta de ~28 px: Abel parecía un gigante junto a ella). Aquí se reescalan árboles (×1.2–1.35) y casas (×1.5)
para que la puerta supere a Abel y los árboles lo dominen; se reescala con LANCZOS sobre alfa premultiplicado y un
leve enfoque para mantener la nitidez del pixel art.

  python tools/fix_canopies.py
"""
import json, os, shutil
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SPR = os.path.join(HERE, "..", "assets", "sprites")
ORIG = os.path.join(SPR, "_orig")
TREES = {"sc48": ["o4", "o5", "o6"]}
# atlas -> {sprite: factor}
SCALE = {
    "sc48": {"o4": 1.3, "o5": 1.3, "o6": 1.3, "o27": 1.15},
    "sc49": {"o20": 1.35, "o21": 1.35},
    "sc52": {"o23": 1.25, "o24": 1.35, "o25": 1.35},
    "sc47": {"o9": 1.15, "o10": 1.15},
    "sc46": {"o30": 1.15, "o31": 1.15},
    "autumn": {"treeBig": 1.3, "treeSmall": 1.35},
    "sc40": {"o11": 1.5, "o12": 1.5},
    "sc39": {"o11": 1.45, "o12": 1.45},
}
CAP = 15                                   # alto de la cúpula añadida (px de atlas)


def hnoise(i, s):
    h = (i * 374761393 + s * 668265263) & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((h ^ (h >> 16)) & 0xFFFF) / 65535.0


def smooth_noise(x, s, period=5.0):
    i = int(np.floor(x / period)); f = x / period - i
    f = f * f * (3 - 2 * f)
    return hnoise(i, s) * (1 - f) + hnoise(i + 1, s) * f


def cap_top(fr, seed):
    h, w = fr.shape[:2]
    fr = fr.copy()
    fr[0:2, :, :3] = fr[2:4, :, :3]                  # las 2 primeras filas traen el halo claro del corte: se igualan a las de debajo
    top = fr[0, :, 3] > 0
    xs = np.where(top)[0]
    if len(xs) < w * 0.4: return fr, 0
    a, b = int(xs.min()), int(xs.max())
    c, half = (a + b) / 2.0, (b - a + 1) / 2.0
    out = np.zeros((h + CAP, w, 4), np.uint8); out[CAP:] = fr
    # altura de la cúpula en cada columna (semielipse con racimos de hojas)
    for x in range(a, b + 1):
        u = (x - c) / half
        base = CAP * np.sqrt(max(0.0, 1 - u * u))
        bump = 1 + 0.55 * (smooth_noise(x, seed) - 0.5) + 0.3 * (smooth_noise(x * 1.9, seed + 7, 2.6) - 0.5)
        hh = int(round(base * bump))
        for d in range(1, hh + 1):
            y = CAP - d
            if y < 0: break
            # relleno: reflejo de las filas altas de la copa (continuidad exacta en la costura, hojas con forma natural)
            sy = min(h - 1, d + 1 + (1 if d > 8 else 0))
            sx = int(np.clip(x + ((d // 3) * 7 % 9) - 4, 0, w - 1))                # rompe la simetría del reflejo
            px = fr[sy, sx].copy()
            if px[3] == 0:
                px = fr[min(h - 1, sy + 3), x].copy()
            if px[3] == 0: px = fr[min(h - 1, sy + 6), int(np.clip(x + 3, 0, w - 1))].copy()
            px[3] = 255
            out[y, x] = px
    # contorno: oscurece 1 px del borde nuevo para imitar el sombreado de las hojas del borde original
    alpha = out[..., 3] > 0
    pad = np.pad(alpha, 1, constant_values=False)
    edge = alpha & ~(pad[:-2, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:])
    edge[CAP + 2:] = False
    out[..., :3][edge] = (out[..., :3][edge].astype(np.float32) * 0.78).astype(np.uint8)
    return out, CAP


def scale_frame(fr, k):
    """Reescala RGBA con alfa premultiplicado (sin halos) y un leve enfoque."""
    h, w = fr.shape[:2]
    nw, nh = max(1, round(w * k)), max(1, round(h * k))
    a = fr[..., 3:4].astype(np.float32) / 255.0
    pm = np.dstack([fr[..., :3].astype(np.float32) * a, a * 255.0]).clip(0, 255).astype(np.uint8)
    im = Image.fromarray(pm, "RGBA").resize((nw, nh), Image.LANCZOS)
    arr = np.array(im).astype(np.float32)
    al = arr[..., 3:4] / 255.0
    rgb = np.where(al > 0.02, arr[..., :3] / np.maximum(al, 0.02), 0).clip(0, 255)
    out = Image.fromarray(np.dstack([rgb, arr[..., 3:4]]).astype(np.uint8), "RGBA")
    rgb_img = out.convert("RGB").filter(ImageFilter.UnsharpMask(radius=0.7, percent=70, threshold=2))
    res = np.array(rgb_img)
    return np.dstack([res, np.where(arr[..., 3] > 96, 255, (arr[..., 3] * 2).clip(0, 255)).astype(np.uint8)])


def main():
    os.makedirs(ORIG, exist_ok=True)
    for atlas in sorted(set(TREES) | set(SCALE)):
        for ext in ("png", "json"):
            o = os.path.join(ORIG, f"{atlas}.{ext}")
            if not os.path.exists(o): shutil.copy(os.path.join(SPR, f"{atlas}.{ext}"), o)
        img = Image.open(os.path.join(ORIG, f"{atlas}.png")).convert("RGBA")
        meta = json.load(open(os.path.join(ORIG, f"{atlas}.json"), encoding="utf-8"))
        arr = np.array(img)
        names = list(dict.fromkeys(list(TREES.get(atlas, [])) + list(SCALE.get(atlas, {}))))
        fixed = []
        for k, n in enumerate(names):
            f = meta["anims"][n][0]
            fr = arr[f["y"]:f["y"] + f["h"], f["x"]:f["x"] + f["w"]].copy()
            ax, ay = f["ax"], f["ay"]
            if n in TREES.get(atlas, []):
                fr, add = cap_top(fr, 11 + k * 17); ay += add
            kk = SCALE.get(atlas, {}).get(n, 1.0)
            if abs(kk - 1) > 0.01:
                fr = scale_frame(fr, kk); ax, ay = ax * kk, ay * kk
            fixed.append((n, f, fr, int(round(ax)), int(round(ay))))
        H0 = img.height
        # franjas (máx. 2048 px de ancho) al final del atlas con los fotogramas corregidos
        placed = []; x = y = shelf = 0
        for n, f, fr, ax, ay in fixed:
            if x + fr.shape[1] + 2 > max(img.width, 2048): x = 0; y += shelf + 2; shelf = 0
            placed.append((n, fr, ax, ay, x, y)); x += fr.shape[1] + 2; shelf = max(shelf, fr.shape[0])
        W = max(img.width, max(p[4] + p[1].shape[1] for p in placed))
        out = Image.new("RGBA", (W, H0 + y + shelf + 4), (0, 0, 0, 0)); out.paste(img, (0, 0))
        for n, fr, ax, ay, px, py in placed:
            out.paste(Image.fromarray(fr, "RGBA"), (px, H0 + 2 + py))
            meta["anims"][n][0] = {"x": px, "y": H0 + 2 + py, "w": int(fr.shape[1]), "h": int(fr.shape[0]), "ax": ax, "ay": ay}
        out.save(os.path.join(SPR, f"{atlas}.png"), optimize=True)
        json.dump(meta, open(os.path.join(SPR, f"{atlas}.json"), "w", encoding="utf-8"), separators=(",", ":"))
        print(atlas, "corregidos:", ", ".join(f"{n}×{SCALE.get(atlas, {}).get(n, 1)}" + ("+copa" if n in TREES.get(atlas, []) else "") for n in names))
        # contacto antes/después
        wsum = sum(f["w"] + fr.shape[1] + 24 for n, f, fr, _, _ in fixed); hmax = max(max(f["h"], fr.shape[0]) for n, f, fr, _, _ in fixed)
        cmp = Image.new("RGBA", (wsum, hmax + 6), (60, 78, 58, 255)); cx = 0
        for n, f, fr, _, _ in fixed:
            cmp.alpha_composite(Image.fromarray(arr[f["y"]:f["y"] + f["h"], f["x"]:f["x"] + f["w"]], "RGBA"), (cx, hmax + 3 - f["h"])); cx += f["w"] + 12
            cmp.alpha_composite(Image.fromarray(fr, "RGBA"), (cx, hmax + 3 - fr.shape[0])); cx += fr.shape[1] + 12
        cmp.save(os.path.join(HERE, "preview", f"fix_props_{atlas}.png"))


if __name__ == "__main__":
    main()
