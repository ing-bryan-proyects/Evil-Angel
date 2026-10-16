"""Hoja de contacto de TODOS los sprites que usa cada kit de bioma (para auditar recortes, restos grises, etc.).
   python tools/kit_audit.py            -> tools/preview/kit_<bioma>.png"""
import json, os, re, sys
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
SPR = os.path.join(HERE, "..", "assets", "sprites")
PREV = os.path.join(HERE, "preview")
src = open(os.path.join(HERE, "..", "src", "world", "Kits.js"), encoding="utf-8").read()

def kits():
    out = {}
    m = re.search(r"export const KITS = \{(.*)\n\};", src, re.S)
    body = m.group(1)
    for km in re.finditer(r"\n  (\w+): \{(.*?)\n  \},", body, re.S):
        roles = {}
        for rm in re.finditer(r"\n    (\w+): \[(.*?)\](?=,?\n)", km.group(2), re.S):
            ids = re.findall(r'"((?:sc\d+|autumn)\.[A-Za-z0-9_]+)"', rm.group(2))
            if ids: roles[rm.group(1)] = ids
        out[km.group(1)] = roles
    # papeles comunes
    cm = re.search(r"const COMMON = \{(.*?)\n\};", src, re.S)
    common = {}
    for rm in re.finditer(r"\n  (\w+): \[(.*?)\]", cm.group(1), re.S):
        common[rm.group(1)] = re.findall(r'"((?:sc\d+|autumn)\.[A-Za-z0-9_]+)"', rm.group(2))
    return out, common

atl = {}
def get(a):
    if a not in atl:
        atl[a] = (Image.open(os.path.join(SPR, a + ".png")).convert("RGBA"), json.load(open(os.path.join(SPR, a + ".json"))))
    return atl[a]

def sprite(eid):
    a, n = eid.split(".", 1)
    im, meta = get(a)
    fr = meta["anims"].get(n)
    if not fr: return None, 1
    f = fr[0]
    return im.crop((f["x"], f["y"], f["x"] + f["w"], f["y"] + f["h"])), meta.get("px", 1)

K, common = kits()
only = sys.argv[1:] 
for name, roles in K.items():
    if only and name not in only: continue
    for r, ids in common.items(): roles.setdefault(r, ids)
    items = [(r, i) for r, ids in roles.items() if r not in ("leaf", "atlases", "ground") for i in ids]
    cell = 150; cols = 9; rows = (len(items) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * cell, rows * cell), (60, 78, 58)); d = ImageDraw.Draw(sheet)
    for k, (r, eid) in enumerate(items):
        im, px = sprite(eid)
        cx, cy = (k % cols) * cell, (k // cols) * cell
        d.text((cx + 2, cy + 1), f"{r}", fill=(255, 255, 0)); d.text((cx + 2, cy + cell - 11), eid, fill=(180, 255, 255))
        if im is None: d.text((cx + 40, cy + 60), "MISSING", fill=(255, 0, 0)); continue
        z = min(1.0, (cell - 26) / max(im.width, im.height))
        im2 = im.resize((max(1, int(im.width * z)), max(1, int(im.height * z))), Image.LANCZOS)
        sheet.paste(im2, (cx + (cell - im2.width) // 2, cy + cell - 14 - im2.height), im2)
    sheet.save(os.path.join(PREV, f"kit_{name}.png"))
    print(name, len(items), sheet.size)
