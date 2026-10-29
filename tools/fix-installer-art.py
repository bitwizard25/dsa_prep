# Repaints the broken text lines in the installer artwork (originals in build-assets/original/) and exports NSIS BMPs.
# Usage: python3 tools/fix-installer-art.py 2.1
import sys, os
from PIL import Image, ImageDraw, ImageFont
VER = sys.argv[1] if len(sys.argv) > 1 else "2.0"
D = os.path.join(os.path.dirname(__file__), "..", "build-assets")
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

def find_text(im, x0, x1, y0, y1, delta):
    g = im.convert("L"); hits = []
    for y in range(y0, y1):
        for x in range(x0, x1):
            ref = min(g.getpixel((x, max(0, y - 6))), g.getpixel((x, min(im.height - 1, y + 6))))
            if g.getpixel((x, y)) - ref > delta: hits.append((x, y))
    xs = [h[0] for h in hits]; ys = [h[1] for h in hits]
    return min(xs), max(xs), min(ys), max(ys)

def repaint(im, box, text, color, cx=None, size=7):
    x0, y0, x1, y1 = box; px = im.load()
    for x in range(x0, x1 + 1):   # fill from the rows above and below so the background gradient survives
        top, bot = px[x, y0 - 1], px[x, y1 + 1]
        for y in range(y0, y1 + 1):
            t = (y - y0 + 1) / (y1 - y0 + 2)
            px[x, y] = tuple(round(top[i] * (1 - t) + bot[i] * t) for i in range(3))
    S = 4; f = ImageFont.truetype(FONT, size * S)
    layer = Image.new("L", (f.getbbox(text)[2] + 8 * S, (y1 - y0 + 3) * S), 0)
    ImageDraw.Draw(layer).text((4 * S, 0), text, font=f, fill=255)
    layer = layer.resize((layer.width // S, layer.height // S), Image.LANCZOS)
    im.paste(Image.new("RGB", layer.size, color), ((cx - layer.width // 2) if cx is not None else x0 - 4, y0 - 1), layer)

h = Image.open(os.path.join(D, "original", "installerHeader.jpg")).convert("RGB")
b = find_text(h, 6, 92, 35, 46, 28)
repaint(h, (b[0] - 1, b[2] - 1, b[1] + 1, b[3] + 1), f"v{VER} \u2022 LOCAL ENGINE", (150, 148, 140))
s = Image.open(os.path.join(D, "original", "installerSidebar.jpg")).convert("RGB")
b = find_text(s, 10, 155, 270, 292, 22)
repaint(s, (b[0] - 2, b[2] - 1, b[1] + 2, b[3] + 1), "100% PRIVATE \u2022 LOCAL STORAGE", (128, 126, 120), cx=(b[0] + b[1]) // 2)
for im, name in ((h, "installerHeader"), (s, "installerSidebar")):
    im.save(os.path.join(D, name + ".bmp")); im.save(os.path.join(D, name + "-fixed.png"))
print("installer art for v" + VER)
