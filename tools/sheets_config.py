"""Descripción de cada hoja de sprites: origen, zona útil y filas (nombre, nº de fotogramas)."""
IMAGES_DIR = "C:/Users/Usuario/AppData/Local/Temp/claude/c--Users-Usuario-Documents-Evil-Angel/94476187-9f71-414b-8bda-3df3697f7f1a/images"

BASE5 = lambda i, w, r, a1, a2: [("idle", i), ("walk", w), ("run", r), ("attack1", a1), ("attack2", a2)]

SHEETS = {
    # ---- héroes y aliados (hojas base) ----
    # "abel" y "abel_sp" ya no se generan aquí: ahora salen de tools/slice_abel_pack.py (hojas 61 y 62)
    "aria":   dict(src="27", crop=(0.215, 0.03, 0.99, 0.93), height=36, rows=BASE5(8, 10, 9, 8, 8)),
    "benny":  dict(src="31", crop=(0.185, 0.03, 0.99, 0.93), height=34, rows=BASE5(8, 11, 10, 7, 6)),
    "mileva": dict(src="28", crop=(0.185, 0.03, 0.99, 0.93), height=36, rows=BASE5(10, 11, 10, 7, 6)),
    "chloe":  dict(src="29", crop=(0.185, 0.03, 0.99, 0.93), height=36, rows=BASE5(10, 11, 10, 7, 7)),
    "arc":    dict(src="30", crop=(0.13, 0.03, 0.99, 0.93), height=34, rows=BASE5(9, 12, 10, 8, 8)),
    # ---- bestias ----
    "karr":   dict(src="33", crop=(0.115, 0.03, 0.99, 0.93), height=26, rows=BASE5(8, 7, 7, 6, 6)),
    "skoll":  dict(src="26", crop=(0.16, 0.03, 0.99, 0.93), height=30, bg=dict(holes=False, halo_passes=0), rows=BASE5(6, 6, 6, 6, 6)),
    "rufus":  dict(src="25", crop=(0.18, 0.03, 0.985, 0.925), height=52, rows=BASE5(8, 10, 6, 7, 6)),
    "shela":  dict(src="23", crop=(0.155, 0.03, 0.99, 0.90), height=52, rows=BASE5(8, 10, 8, 8, 7)),
    "pyrus":  dict(src="15", crop=(0.18, 0.03, 0.99, 0.93), height=62, rows=BASE5(8, 9, 9, 7, 7)),
    "ignis":  dict(src="13", crop=(0.21, 0.02, 0.99, 0.87), height=28, rows=BASE5(9, 9, 5, 7, 6), min_comp=200),
}



# ---- Abel: hojas direccionales (8 vistas x 10 fotogramas, fondo de tablero de ajedrez) ----
_DIR_BANDS = [(0.0105, 0.1202), (0.1202, 0.2299), (0.2299, 0.3396), (0.3396, 0.4493), (0.4493, 0.559), (0.559, 0.6687), (0.6687, 0.7784), (0.7784, 0.8881)]
_DIR_ROWS = [('S', 10), ('SE', 10), ('E', 10), ('NE', 10), ('N', 10), ('NO', 10), ('O', 10), ('SO', 10)]
_ABEL_DIR = dict(crop=(0.0, 0.0, 1.0, 1.0), height=36, scale_anim="S", scale_first=False,
                bg_mode="checker", bg=dict(),
                min_comp=120, min_area=10, gap_fixed=6, gap_max=40, ybands_abs=_DIR_BANDS, rows=_DIR_ROWS)
SHEETS.update({
    "abel_idledir2": dict(src="58", **_ABEL_DIR),
})

# ---- ataques especiales: filas con n=0 → fotogramas detectados por separación (los FX anchos cuentan como un fotograma) ----
SPEC = dict(feet_dark=110, gap_fixed=22, min_comp=260)
SHEETS.update({
    "aria_sp":   dict(src="19", crop=(0.235, 0.0, 1.0, 1.0), height=36, ybands_abs=[(0.036, 0.215), (0.225, 0.395), (0.40, 0.565), (0.572, 0.735), (0.74, 0.88)],
                      rows=[("s3a", 0), ("s3b", 0), ("s4a", 0), ("s4b", 0), ("s4c", 0)], **SPEC),
    "benny_sp":  dict(src="20", crop=(0.185, 0.0, 1.0, 1.0), height=34, ybands_abs=[(0.06, 0.42), (0.425, 0.60), (0.61, 0.82)],
                      rows=[("s3", 9), ("s4a", 10), ("s4b", 7)], **SPEC),
    "mileva_sp": dict(src="16", crop=(0.185, 0.0, 1.0, 1.0), height=36, ybands_abs=[(0.05, 0.235), (0.23, 0.43), (0.45, 0.64), (0.655, 0.90)],
                      rows=[("s3a", 0), ("s3b", 0), ("s4a", 0), ("s4b", 0)], **SPEC),
    "chloe_sp":  dict(src="18", crop=(0.185, 0.0, 1.0, 1.0), height=36, ybands_abs=[(0.012, 0.236), (0.254, 0.434), (0.47, 0.93)],
                      rows=[("s3a", 9), ("s3b", 0), ("s4", 7)], **SPEC),
    "arc_sp":    dict(src="17", crop=(0.215, 0.0, 1.0, 1.0), height=34, ybands_abs=[(0.036, 0.233), (0.233, 0.42), (0.43, 0.62), (0.62, 0.84)],
                      rows=[("s3a", 9), ("s3b", 9), ("s4a", 9), ("s4b", 7)], **SPEC),
    "rufus_sp":  dict(src="24", crop=(0.185, 0.0, 1.0, 1.0), height=52, ybands_abs=[(0.05, 0.22), (0.25, 0.45), (0.47, 0.90)],
                      rows=[("s1a", 0), ("s1b", 0), ("s2", 0)], **SPEC),
    "shela_sp":  dict(src="22", crop=(0.165, 0.0, 1.0, 1.0), height=52, ybands_abs=[(0.06, 0.23), (0.235, 0.41), (0.42, 0.585), (0.59, 0.72), (0.735, 0.89)],
                      rows=[("s1a", 0), ("s1b", 0), ("s2a", 0), ("s2b", 0), ("s2c", 0)], **SPEC),
    "pyrus_sp":  dict(src="14", crop=(0.18, 0.0, 1.0, 1.0), height=62, ybands_abs=[(0.036, 0.38), (0.40, 0.92)],
                      rows=[("ult1", 0), ("ult2", 0)], **SPEC),
})
