"""Dessine l'icône de Kikory (un hibou brun sur fond ambre) aux tailles iOS et PWA."""
import pathlib
from PIL import Image, ImageDraw

OUT = pathlib.Path(__file__).resolve().parent.parent / "icons"
AMBER, BROWN, CREAM, DARK = (239, 159, 39), (133, 79, 11), (250, 238, 218), (65, 36, 2)


def owl(scale=1.0, S=4096):
    """Le hibou dans une grille de 100 unités ; `scale` < 1 le resserre au centre (icône masquable)."""
    img = Image.new("RGB", (S, S), AMBER)
    d = ImageDraw.Draw(img)
    u = S / 100
    P = lambda x, y: ((50 + (x - 50) * scale) * u, (50 + (y - 50) * scale) * u)
    R = lambda r: r * scale * u

    def disc(cx, cy, rx, ry, fill):
        x, y = P(cx, cy)
        d.ellipse([x - R(rx), y - R(ry), x + R(rx), y + R(ry)], fill=fill)

    d.polygon([P(18, 40), P(26, 14), P(42, 30)], fill=BROWN)
    d.polygon([P(82, 40), P(74, 14), P(58, 30)], fill=BROWN)
    disc(50, 56, 34, 31, BROWN)
    for cx, px in ((37, 38), (63, 62)):
        disc(cx, 52, 13, 13, CREAM)
        disc(px, 53, 6, 6, DARK)
    d.polygon([P(45, 65), P(55, 65), P(50, 74)], fill=AMBER)
    return img


full = owl()
for size in (180, 192, 512):
    full.resize((size, size), Image.LANCZOS).save(OUT / f"icon-{size}.png", optimize=True)
# Android rogne les icônes masquables en cercle : le hibou doit tenir dans la zone sûre centrale.
owl(0.78).resize((512, 512), Image.LANCZOS).save(OUT / "icon-maskable-512.png", optimize=True)
print("icônes écrites dans", OUT)
