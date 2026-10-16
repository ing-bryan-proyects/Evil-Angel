"""Quita el fondo de papel cuadriculado de las hojas de sprites (azul claro o crema).

Método: el "núcleo" del sprite son los píxeles oscuros o saturados (contornos, ropa, pelo…).
El fondo es todo lo que NO es núcleo y se conecta con el borde (papel + cuadrícula + huecos abiertos).
Lo que queda encerrado por el contorno (pelaje blanco, brillos) se conserva.
"""
import numpy as np
import cv2
from PIL import Image

def remove_bg(img, dark=105, sat_min=88, halo_passes=2, min_area=30, holes=True, hole_tol=9, hole_area=36, close_iter=1):
    rgb = np.array(img.convert("RGB"))
    r, g, b = rgb[..., 0].astype(np.int16), rgb[..., 1].astype(np.int16), rgb[..., 2].astype(np.int16)
    mx = np.maximum(np.maximum(r, g), b); mn = np.minimum(np.minimum(r, g), b)
    lum = (r + g + b) // 3
    core = ((lum < dark) | ((mx - mn) > sat_min)).astype(np.uint8)
    # cierra huecos de 1 px del contorno
    closed = cv2.dilate(core, np.ones((3, 3), np.uint8), iterations=close_iter)
    free = (closed == 0).astype(np.uint8)
    n, lab = cv2.connectedComponents(free, connectivity=4)
    border = np.unique(np.concatenate([lab[0, :], lab[-1, :], lab[:, 0], lab[:, -1]]))
    bg = np.isin(lab, border[border > 0]) & (free > 0)
    sprite = ~bg
    if close_iter > 1:                                          # la dilatación grande deja un anillo de papel fuera del contorno: se recorta
        core_b = core.astype(bool)
        near1 = cv2.dilate(core, np.ones((3, 3), np.uint8), iterations=1).astype(bool)
        inner = cv2.erode(sprite.astype(np.uint8), np.ones((3, 3), np.uint8), iterations=close_iter).astype(bool)
        ring = sprite & ~inner
        sprite = sprite & (inner | (ring & near1))
        del core_b
    # halo claro pegado al fondo (restos de JPEG): se va pelando
    light = (lum > 190) & ((mx - mn) < 55)
    for _ in range(halo_passes):
        inner = cv2.erode(sprite.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool)
        edge = sprite & ~inner
        sprite = sprite & ~(edge & light)
    # huecos de papel plano encerrados por el contorno (entre brazo y torso…): color ≈ papel y sin textura
    if holes:
        paper_med = np.median(rgb[bg].reshape(-1, 3), axis=0) if bg.any() else np.array([232, 240, 240])
        flat = (np.abs(rgb.astype(np.int16) - paper_med.astype(np.int16)).max(axis=2) <= hole_tol) & sprite
        n2, lab2, st2, _ = cv2.connectedComponentsWithStats(flat.astype(np.uint8), connectivity=4)
        for i in range(1, n2):
            if st2[i, cv2.CC_STAT_AREA] >= hole_area: sprite[lab2 == i] = False
    # quita motas sueltas
    n, lab, stats, _ = cv2.connectedComponentsWithStats(sprite.astype(np.uint8), connectivity=8)
    keep = np.zeros(n, dtype=bool)
    keep[1:] = stats[1:, cv2.CC_STAT_AREA] >= min_area
    sprite = keep[lab]
    alpha = np.where(sprite, 255, 0).astype(np.uint8)
    return Image.fromarray(np.dstack([rgb, alpha]), "RGBA")


def _dominant_grays(rgb, n=2):
    """Los `n` tonos de gris más frecuentes de la imagen (el tablero de ajedrez), ignorando negros y colores:
    se muestrea toda la imagen (no solo el borde: algunas hojas traen barras negras de título abajo)."""
    r = rgb.astype(np.int16)
    sat = r.max(axis=2) - r.min(axis=2)
    lum = r.sum(axis=2) // 3
    ok = (sat < 14) & (lum > 90) & (lum < 235)
    px = r[ok]
    if len(px) < 50: px = r.reshape(-1, 3)
    q = (px // 8 * 8)
    uniq, counts = np.unique(q.reshape(-1, 3), axis=0, return_counts=True)
    order = np.argsort(-counts)
    out = []
    for i in order:
        c = uniq[i] + 4
        if all(np.abs(c.astype(int) - o.astype(int)).max() > 24 for o in out):
            out.append(c)
        if len(out) >= n: break
    while len(out) < n: out.append(out[-1] if out else np.array([200, 200, 200]))
    return out


def remove_bg_checker(img, colors=None, dark=100, sat_min=18, tol=24, min_area=16, close_iter=3):
    """Quita un fondo de tablero de ajedrez (dos tonos de gris) alrededor de personajes de contorno oscuro.

    Las casillas de distinto tono sí son vecinas entre sí, así que el mismo relleno desde el borde que sirve
    para el papel liso funciona aquí; lo que lo rompía era el umbral de color (esta paleta es apagada: un
    píxel con apenas 18 de saturación ya es "color" de Abel). Se cierran los huecos del contorno con una
    dilatación de `close_iter` para que el pelo blanco (del mismo gris claro que una casilla) quede dentro.
    Después se borran los cuadritos grises, lisos y rectangulares que se pegaron al personaje (sombra de
    casilla bajo las botas, entre las piernas…).
    """
    base = remove_bg(img, dark=dark, sat_min=sat_min, halo_passes=0, holes=False, close_iter=close_iter, min_area=min_area)
    arr = np.array(base)
    a = arr[..., 3] > 0
    rgb = arr[..., :3].astype(np.int16)
    lum = rgb.sum(axis=2) // 3; sat = rgb.max(axis=2) - rgb.min(axis=2)
    g = (a & (sat < 12) & (lum > 120) & (lum < 218)).astype(np.uint8)
    g = cv2.morphologyEx(g, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(g, connectivity=4)
    for i in range(1, n):
        x, y, w, h, ar = st[i]
        if ar < 30 or ar < 0.72 * w * h: continue
        if lum[lab == i].std() > 10: continue
        m = cv2.dilate((lab == i).astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool) & a
        arr[m, 3] = 0
    # quita motas sueltas que hayan quedado
    n, lab, st, _ = cv2.connectedComponentsWithStats((arr[..., 3] > 0).astype(np.uint8), connectivity=8)
    keep = np.zeros(n, bool); keep[1:] = st[1:, cv2.CC_STAT_AREA] >= min_area
    arr[..., 3] = np.where(keep[lab], 255, 0)
    return Image.fromarray(arr, "RGBA")


def remove_bg_checker_board(img, colors=None, dark=100, sat_min=18, tol=24, min_area=16):
    """Variante por color puro (sin relleno desde el borde) para hojas cuyos personajes se solapan en vertical:
    cada píxel claro, sin color y cercano a uno de los dos tonos del tablero es fondo. Protege el núcleo (contorno
    oscuro y colores) igual que remove_bg. Sirve cuando el pelo blanco es más claro que ambas casillas (hojas 55–58)."""
    rgb = np.array(img.convert("RGB")).astype(np.int16)
    mx = rgb.max(axis=2); mn = rgb.min(axis=2)
    sat = mx - mn
    lum = rgb.sum(axis=2) // 3
    core = (lum < dark) | (sat > sat_min)
    c1, c2 = colors if colors else _dominant_grays(rgb, 2)
    d1 = np.abs(rgb - np.array(c1)).sum(axis=2)
    d2 = np.abs(rgb - np.array(c2)).sum(axis=2)
    bg = ~core & ((d1 <= tol) | (d2 <= tol))
    sprite = ~bg
    near_gray = ~core & ((d1 <= tol * 1.6) | (d2 <= tol * 1.6))
    for _ in range(2):
        inner = cv2.erode(sprite.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool)
        edge = sprite & ~inner
        sprite = sprite & ~(edge & near_gray)
    sprite = cv2.morphologyEx(sprite.astype(np.uint8), cv2.MORPH_OPEN, np.ones((2, 2), np.uint8)).astype(bool)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(sprite.astype(np.uint8), connectivity=8)
    keep = np.zeros(n, dtype=bool)
    keep[1:] = stats[1:, cv2.CC_STAT_AREA] >= min_area
    sprite = keep[lab]
    alpha = np.where(sprite, 255, 0).astype(np.uint8)
    return Image.fromarray(np.dstack([np.array(img.convert("RGB")), alpha]), "RGBA")


def peel_checker(arr, tones, passes=16, tol=40, sat_max=11):
    """Pela desde el contorno hacia dentro los píxeles grises con el tono de una casilla del tablero (el halo y los
    cuadritos pegados). Solo come píxeles de borde y sin color, así que el pelo blanco-lavanda (más claro y con
    matiz) y el contorno oscuro quedan intactos."""
    a = arr[..., 3] > 0
    rgb = arr[..., :3].astype(np.int16)
    sat = rgb.max(axis=2) - rgb.min(axis=2)
    like = np.zeros(a.shape, bool)
    for t in tones: like |= np.abs(rgb - np.array(t, np.int16)).sum(axis=2) <= tol
    like &= sat <= sat_max
    for _ in range(passes):
        pad = np.pad(a, 1, constant_values=False)
        edge = a & ~(pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:])
        kill = edge & like
        if not kill.any(): break
        a &= ~kill
    out = arr.copy(); out[..., 3] = np.where(a, out[..., 3], 0)
    return out
