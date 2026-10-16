"""Corta las hojas de sprites en fotogramas y genera atlas PNG + JSON para el juego.

Uso:  python tools/slice_sheets.py <id> [<id> ...]      (sin argumentos: todas)
      python tools/slice_sheets.py rufus --preview      (solo guarda la vista previa con las cajas)

Cada hoja se describe en SHEETS: imagen de origen, zona útil (fracciones), filas con nombre y nº de fotogramas.
Los fotogramas se agrupan por componentes conexas + fusión por distancia hasta cuadrar el nº esperado.
"""
import json, os, sys
import numpy as np
import cv2
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from bgremove import remove_bg, remove_bg_checker
from sheets_config import SHEETS, IMAGES_DIR

PX = 2.4          # resolución interna del atlas respecto al tamaño de juego: los fotogramas se guardan casi a su tamaño original
OUT = os.path.join(HERE, "..", "assets", "sprites")
PREVIEW = os.path.join(HERE, "preview")
os.makedirs(OUT, exist_ok=True); os.makedirs(PREVIEW, exist_ok=True)

def components(alpha, min_area=25):
    n, lab, stats, cent = cv2.connectedComponentsWithStats((alpha > 0).astype(np.uint8), connectivity=8)
    comps = []
    for i in range(1, n):
        x, y, w, h, a = stats[i]
        if a >= min_area:
            comps.append(dict(id=i, x=int(x), y=int(y), w=int(w), h=int(h), area=int(a)))
    return comps, lab

def find_rows(comps, H, min_gap):
    """Bandas horizontales (y0,y1) separadas por huecos ≥ min_gap."""
    occ = np.zeros(H + 1, dtype=bool)
    for c in comps: occ[c["y"]:c["y"] + c["h"]] = True
    bands, start = [], None
    gap = 0
    for y in range(H + 1):
        if occ[y]:
            if start is None: start = y
            gap = 0; last = y
        elif start is not None:
            gap += 1
            if gap >= min_gap:
                bands.append((start, last)); start = None
    if start is not None: bands.append((start, last))
    return bands

def split_to(groups, n_expected, proj):
    # fotogramas pegados: divide el grupo más ancho por su valle de proyección vertical hasta llegar a n_expected
    guard = 0
    while len(groups) < n_expected and guard < 40 and proj is not None:
        guard += 1
        widths = [G["x1"] - G["x0"] for G in groups]
        span = max(G["x1"] for G in groups) - min(G["x0"] for G in groups)
        pitch = min(np.median(sorted(widths)[: max(1, len(widths) // 2 + 1)]) or 1, span / n_expected * 1.15) if len(groups) > 1 else span / n_expected
        i = int(np.argmax(widths))
        G = groups[i]
        if widths[i] < pitch * 1.45: break
        k = max(2, round(widths[i] / pitch))
        # el corte ideal es a 1/k del ancho: busca el valle más vacío en ±25 % del paso
        cut_ideal = G["x0"] + widths[i] / k
        lo, hi = int(cut_ideal - pitch * 0.3), int(cut_ideal + pitch * 0.3)
        lo = max(lo, G["x0"] + 4); hi = min(hi, G["x1"] - 4)
        if hi <= lo: break
        cut = lo + int(np.argmin(proj[lo:hi + 1]))
        left = [c for c in G["comps"] if c["x"] + c["w"] / 2 < cut]
        right = [c for c in G["comps"] if c["x"] + c["w"] / 2 >= cut]
        if not left or not right: break
        def mk(cs): return dict(x0=min(c["x"] for c in cs), x1=max(c["x"] + c["w"] for c in cs), y0=min(c["y"] for c in cs), y1=max(c["y"] + c["h"] for c in cs), comps=cs, split=cut)
        groups[i:i + 1] = [mk(left), mk(right)]
    return groups

def cluster_frames(comps, n_expected, gap_max=120, proj=None, gap_fixed=14):
    """Fusiona componentes por cercanía horizontal hasta tener n_expected grupos (o el valor más cercano)."""
    if not comps: return [], 0
    comps = sorted(comps, key=lambda c: c["x"])
    def build(g):
        groups = []
        for c in comps:
            if groups and c["x"] <= groups[-1]["x1"] + g:
                G = groups[-1]; G["x1"] = max(G["x1"], c["x"] + c["w"]); G["x0"] = min(G["x0"], c["x"])
                G["y0"] = min(G["y0"], c["y"]); G["y1"] = max(G["y1"], c["y"] + c["h"]); G["comps"].append(c)
            else:
                groups.append(dict(x0=c["x"], x1=c["x"] + c["w"], y0=c["y"], y1=c["y"] + c["h"], comps=[c]))
        return groups
    if n_expected is None:
        groups = build(gap_fixed)
        return groups, gap_fixed
    best = None
    for g in range(0, gap_max):
        groups = build(g)
        d = abs(len(groups) - n_expected)
        if best is None or d < best[0]: best = (d, g, groups)
        if len(groups) <= n_expected: break
    groups, g = best[2], best[1]
    groups = split_to(groups, n_expected, proj)
    return groups, g

def defringe(arr, passes=2):
    """Quita el contorno claro de papel que queda fuera de la línea oscura del dibujo: píxeles del borde,
    claros y sin color, se eliminan capa a capa (el pelo blanco queda protegido por su contorno gris)."""
    a = arr[..., 3] >= 100
    r, g, b = arr[..., 0].astype(np.int16), arr[..., 1].astype(np.int16), arr[..., 2].astype(np.int16)
    lum = (r + g + b) // 3; sat = np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)
    light = (lum > 150) & (sat < 55)
    for _ in range(passes):
        pad = np.pad(a, 1, constant_values=False)
        edge = a & ~(pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:])
        kill = edge & light
        if not kill.any(): break
        a = a & ~kill
    out = arr.copy()
    out[..., 3] = np.where(a, out[..., 3], 0)
    return out

def process(key, cfg, preview_only=False):
    src = Image.open(os.path.join(IMAGES_DIR, cfg["src"] + ".jpg")).convert("RGB")
    W, H = src.size
    cx0, cy0, cx1, cy1 = cfg["crop"]
    box = (int(cx0 * W), int(cy0 * H), int(cx1 * W), int(cy1 * H))
    crop = src.crop(box)
    bg_fn = remove_bg_checker if cfg.get("bg_mode") == "checker" else remove_bg
    rgba = bg_fn(crop, **cfg.get("bg", {}))
    alpha = np.array(rgba)[..., 3]
    comps, lab = components(alpha, cfg.get("min_area", 25))
    colproj = (alpha > 0).astype(np.int32)
    bands = (cfg.get("ybands") or cfg.get("ybands_abs")) and None or find_rows([c for c in comps if c["area"] >= cfg.get("min_comp", 700)], crop.size[1], cfg.get("row_gap", 10))
    if cfg.get("ybands_abs"):                       # fracciones de la altura de la imagen completa
        bands = [(max(0, int(a * H) - box[1]), min(crop.size[1] - 1, int(b * H) - box[1])) for a, b in cfg["ybands_abs"]]
    elif cfg.get("ybands"):
        bands = [(int(a * crop.size[1]), int(b * crop.size[1])) for a, b in cfg["ybands"]]
    rows_cfg = cfg["rows"]
    print(f"[{key}] bandas detectadas: {len(bands)} (esperadas {len(rows_cfg)})", [(a, b) for a, b in bands])
    frames = []   # (anim, idx, bbox en crop, fx?)
    prev = Image.new("RGB", crop.size, (255, 0, 255)); prev.paste(rgba, (0, 0), rgba)
    dr = ImageDraw.Draw(prev)
    colors = [(255,255,0),(0,255,255),(0,255,0),(255,128,0),(255,255,255),(255,0,0),(0,128,255)]
    for ri, rc in enumerate(rows_cfg):
        if ri >= len(bands): break
        name, n = rc[0], rc[1]
        rgap = rc[2] if len(rc) > 2 else cfg.get("gap_fixed", 14)
        if n == 0: n = None
        y0, y1 = bands[ri]
        in_band = [c for c in comps if y0 - 2 <= c["y"] + c["h"] / 2 <= y1 + 2]
        min_comp = cfg.get("min_comp", 700)
        rc_comps = [c for c in in_band if c["area"] >= min_comp]
        small = [c for c in in_band if c["area"] < min_comp]
        uniform = len(rc) > 3 and rc[3] == "u"
        if uniform and n:
            xs0 = min(c["x"] for c in rc_comps); xs1 = max(c["x"] + c["w"] for c in rc_comps)
            cw = (xs1 - xs0) / n
            buckets = [[] for _ in range(n)]
            for c in rc_comps:
                buckets[min(n - 1, int((c["x"] + c["w"] / 2 - xs0) / cw))].append(c)
            groups = [dict(x0=min(c["x"] for c in cs), x1=max(c["x"] + c["w"] for c in cs), y0=min(c["y"] for c in cs), y1=max(c["y"] + c["h"] for c in cs), comps=cs) for cs in buckets if cs]
            g = 0
        else:
          groups, g = cluster_frames(rc_comps, n, cfg.get("gap_max", 120), proj=colproj[y0:y1 + 1].sum(axis=0), gap_fixed=rgap)
        if n is not None and "ybands_abs" not in cfg and groups:      # hojas base: todo fotograma contiene al héroe → descarta restos de rótulos y motas
            mh = max(G["y1"] - G["y0"] for G in groups)
            groups = [G for G in groups if (G["y1"] - G["y0"]) >= 0.45 * mh]
            ars = sorted(sum(c["area"] for c in G["comps"]) for G in groups)
            med_a = ars[len(ars) // 2]
            groups = [G for G in groups if sum(c["area"] for c in G["comps"]) >= 0.3 * med_a]
        if n is not None and len(groups) < n:
            groups = split_to(groups, n, colproj[y0:y1 + 1].sum(axis=0))
        if n is not None:                     # grupos sobrantes (motas, esquinas del marco): se descartan los de menor área
            while len(groups) > n:
                areas = [sum(c["area"] for c in G["comps"]) for G in groups]
                groups.pop(int(np.argmin(areas)))
        for c in small:                       # chispas y motas: se pegan al fotograma que las contiene (±16 px)
            cxm, cym = c["x"] + c["w"] / 2, c["y"] + c["h"] / 2
            for G in groups:
                if G["x0"] - 16 <= cxm <= G["x1"] + 16 and G["y0"] - 16 <= cym <= G["y1"] + 16:
                    G["comps"].append(c); G["x0"] = min(G["x0"], c["x"]); G["x1"] = max(G["x1"], c["x"] + c["w"])
                    G["y0"] = min(G["y0"], c["y"]); G["y1"] = max(G["y1"], c["y"] + c["h"]); break
        if n is not None and len(groups) != n: print(f"   ! fila {ri} '{name}': {len(groups)} fotogramas (esperados {n}), gap={g}")
        for fi, G in enumerate(groups):
            dr.rectangle([G["x0"], G["y0"], G["x1"], G["y1"]], outline=colors[ri % len(colors)], width=2)
            dr.text((G["x0"] + 3, G["y0"] + 2), f"{name[:3]}{fi}", fill=colors[ri % len(colors)])
            frames.append(dict(anim=name, idx=fi, x0=G["x0"], y0=G["y0"], x1=G["x1"], y1=G["y1"], comps=G["comps"]))
    prev.thumbnail((2000, 1200)); prev.save(os.path.join(PREVIEW, f"{key}.png"))
    if preview_only: return

    # escala: altura mediana del primer reposo → altura objetivo
    idle = [f for f in frames if f["anim"] == cfg.get("scale_anim", "idle")] or frames
    hs = sorted(f["y1"] - f["y0"] for f in idle)
    ref_h = hs[len(hs) // 2]
    if cfg.get("scale_first", "ybands_abs" in cfg):        # especiales: el primer fotograma es el héroe en reposo
        first = frames[0]; ref_h = first["y1"] - first["y0"]
    scale = cfg["height"] * PX / ref_h
    out_frames = {}
    atlas_items = []
    arr = np.array(rgba)
    for f in frames:
        sub = rgba.crop((f["x0"], f["y0"], f["x1"], f["y1"]))
        # solo píxeles de las componentes del grupo (evita restos vecinos)
        sub_lab = lab[f["y0"]:f["y1"], f["x0"]:f["x1"]]
        ids = {c["id"] for c in f["comps"]}
        if f["anim"] in ("idle", "walk", "run") and "ybands_abs" not in cfg and len(f["comps"]) > 1:
            # restos sueltos fuera del cuerpo (esquinas del marco de la hoja, motas): fuera del bbox del cuerpo y pequeños
            main = max(f["comps"], key=lambda c: c["area"])
            for c in list(f["comps"]):
                if c is main or c["area"] >= 0.18 * main["area"]: continue
                ccx, ccy = c["x"] + c["w"] / 2, c["y"] + c["h"] / 2
                if not (main["x"] - 6 <= ccx <= main["x"] + main["w"] + 6 and main["y"] - 6 <= ccy <= main["y"] + main["h"] + 6):
                    ids.discard(c["id"])
        m = np.isin(sub_lab, list(ids))
        a = np.array(sub); a[..., 3] = np.where(m, a[..., 3], 0); sub = Image.fromarray(a, "RGBA")
        # ancla = pies: centro de los píxeles oscuros (contornos de botas/patas) en la franja inferior; ay = su fila más baja
        sa = np.array(sub)
        lum = sa[..., :3].astype(np.int16).sum(axis=2) // 3
        dark = (sa[..., 3] > 0) & (lum < cfg.get("feet_dark", 120))
        rowsum = dark.sum(axis=1)
        ys = np.where(rowsum >= max(2, sub.width // 40))[0]
        if len(ys):
            yb = int(ys.max()); band = dark[max(0, yb - max(6, sub.height // 7)): yb + 1]
            xs = np.where(band.any(axis=0))[0]
            ax = float((xs.min() + xs.max()) / 2) if len(xs) else sub.width / 2
            ay = float(yb + 1); fxonly = False
            fxonly = False
        else:
            ax, ay, fxonly = 0.0, float(sub.height), True       # solo efectos: anclado abajo-izquierda
        nw, nh = max(1, round(sub.width * scale)), max(1, round(sub.height * scale))
        # remuestreo con alfa premultiplicado (sin halos del papel) y borde suave pero ceñido: se dibuja con suavizado
        pm = sub.convert("RGBa").resize((nw, nh), Image.LANCZOS).convert("RGBA")
        arr = np.array(pm).astype(np.float32)
        arr[..., 3] = np.clip((arr[..., 3] - 60.0) * (255.0 / 150.0), 0, 255)
        if not fxonly: arr = defringe(arr, cfg.get("fringe", 2))
        sub = Image.fromarray(arr.astype(np.uint8), "RGBA")
        ax_s, ay_s = round(ax * scale), round(ay * scale)
        bb = sub.getchannel("A").point(lambda v: 255 if v > 0 else 0).getbbox()          # recorta el margen transparente
        if bb and bb != (0, 0, sub.width, sub.height):
            sub = sub.crop(bb); ax_s -= bb[0]; ay_s -= bb[1]
        atlas_items.append((f["anim"], f["idx"], sub, ax_s, ay_s, fxonly))
    # baseline por animación: usa la mediana de ay-h para que los pies no salten dentro de una fila
    # empaquetado en estantes
    maxw = 2048; x = y = shelf_h = 0; placed = []
    for anim, idx, im, ax, ay, fo in atlas_items:
        if x + im.width + 2 > maxw: x = 0; y += shelf_h + 2; shelf_h = 0
        placed.append((anim, idx, im, ax, ay, fo, x, y)); x += im.width + 2; shelf_h = max(shelf_h, im.height)
    atlas = Image.new("RGBA", (maxw, y + shelf_h + 2), (0, 0, 0, 0))
    meta = {"id": key, "scale": scale, "height": cfg["height"], "px": PX, "anims": {}}
    for anim, idx, im, ax, ay, fo, px, py in placed:
        atlas.paste(im, (px, py))
        d = dict(x=px, y=py, w=im.width, h=im.height, ax=ax, ay=ay)
        if fo: d['fx'] = 1
        meta["anims"].setdefault(anim, []).append(d)
    atlas.save(os.path.join(OUT, f"{key}.png"), optimize=True)
    with open(os.path.join(OUT, f"{key}.json"), "w", encoding="utf-8") as fh: json.dump(meta, fh, separators=(",", ":"))
    print(f"[{key}] OK  escala {scale:.3f}  atlas {atlas.size}  anims: " + ", ".join(f"{k}:{len(v)}" for k, v in meta["anims"].items()))

if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    preview = "--preview" in sys.argv
    for key in (args or SHEETS.keys()):
        process(key, SHEETS[key], preview)
