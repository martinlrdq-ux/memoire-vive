"""Dessine l'icône de l'app (une clé dorée sur fond indigo) aux tailles iOS et PWA."""
import pathlib
from PIL import Image, ImageDraw

OUT = pathlib.Path(__file__).resolve().parent.parent / "icons"
S = 1024
img = Image.new("RGB", (S, S))
d = ImageDraw.Draw(img)
top, bottom = (74, 58, 200), (36, 28, 104)
for y in range(S):
    t = y / S
    d.line([(0, y), (S, y)], fill=tuple(int(top[i] * (1 - t) + bottom[i] * t) for i in range(3)))
for x, y, r in [(170, 190, 10), (820, 160, 7), (880, 360, 5), (140, 800, 6), (860, 840, 9), (300, 110, 4)]:
    d.ellipse([x - r, y - r, x + r, y + r], fill=(255, 236, 170))
gold, dark = (247, 196, 72), (205, 148, 30)
cx, cy = 400, 420
d.ellipse([cx - 190, cy - 190, cx + 190, cy + 190], fill=gold)
d.ellipse([cx - 80, cy - 80, cx + 80, cy + 80], fill=bottom)
d.polygon([(cx + 120, cy + 90), (cx + 170, cy + 40), (cx + 480, cy + 350), (cx + 430, cy + 400)], fill=gold)
for k in (0, 1):
    bx, by = cx + 330 + k * 90, cy + 250 + k * 90
    d.polygon([(bx, by), (bx + 40, by - 40), (bx + 130, by + 50), (bx + 90, by + 90)], fill=dark)
d.ellipse([cx - 150, cy - 160, cx - 70, cy - 80], fill=(255, 226, 140))
for size in (180, 192, 512):
    img.resize((size, size), Image.LANCZOS).save(OUT / f"icon-{size}.png", optimize=True)
print("icônes écrites dans", OUT)
