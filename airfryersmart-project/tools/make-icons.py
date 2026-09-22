#!/usr/bin/env python3
"""Generate AirFryerSmart PWA icons + OG image (PIL, no external assets)."""
import math
from PIL import Image, ImageDraw, ImageFont

OUT = "assets/img"

def rounded_rect_mask(size, radius):
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return m

def flame_points(cx, cy, scale, n=64, rotation=0.0):
    """Teardrop/cardioid-ish flame silhouette."""
    pts = []
    for i in range(n):
        t = 2 * math.pi * i / n
        r = (1 + math.sin(t)) * scale  # cardioid -> flame-like
        x = cx + r * math.cos(t + rotation)
        y = cy + r * math.sin(t + rotation) * 1.15
        pts.append((x, y))
    return pts

def make_icon(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    bg = Image.new("RGBA", (size, size), (234, 88, 12, 255))   # #ea580c
    img.paste(bg, (0, 0), rounded_rect_mask(size, int(size * 0.22)))
    d = ImageDraw.Draw(img)
    # white flame
    s = size * 0.21
    pts = flame_points(size * 0.5, size * 0.52, s, rotation=math.pi * 0.5)
    d.polygon(pts, fill=(255, 255, 255, 255))
    # inner orange flame (depth)
    pts2 = flame_points(size * 0.5, size * 0.56, s * 0.62, rotation=math.pi * 0.5)
    d.polygon(pts2, fill=(234, 88, 12, 255))
    # tip accent
    return img

def make_og():
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), (254, 243, 232))  # light orange-tinted bg
    d = ImageDraw.Draw(img)
    # gradient band bottom
    for y in range(H // 2, H):
        f = (y - H // 2) / (H / 2)
        c = (int(234 - 50 * f), int(88 + 40 * f), int(12 + 20 * f))
        d.line([(0, y), (W, y)], fill=c)
    # big flame watermark
    pts = flame_points(W * 0.82, H * 0.52, 150, rotation=math.pi * 0.5)
    d.polygon(pts, fill=(254, 215, 170, 255))
    # title
    def font(size):
        for p in ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                  "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf"]:
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
        return ImageFont.load_default()
    f_title = font(88)
    f_sub = font(40)
    d.text((90, 120), "AirFryerSmart", font=f_title, fill=(124, 45, 18))
    d.text((94, 250), "Oven  →  Air Fryer  in one click", font=f_sub, fill=(67, 20, 7))
    d.text((94, 330), "Tested times for 51 foods  ·  brand calibration  ·  free", font=f_sub, fill=(124, 45, 18))
    d.text((94, 520), "airfryersmart.com", font=f_sub, fill=(255, 255, 255))
    return img

make_icon(192).save(f"{OUT}/icon-192.png")
make_icon(512).save(f"{OUT}/icon-512.png")
make_og().save(f"{OUT}/og-default.png")
print("icons + og done")

# favicon.svg (hand-written)
svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#ea580c"/>
  <path d="M32 10 C40 22 48 28 48 38 C48 47 41 54 32 54 C23 54 16 47 16 38 C16 28 24 22 32 10 Z" fill="#fff"/>
  <path d="M32 24 C36 31 40 34 40 40 C40 45 36 48 32 48 C28 48 24 45 24 40 C24 34 28 31 32 24 Z" fill="#ea580c"/>
</svg>'''
open(f"{OUT}/favicon.svg", "w").write(svg)
print("favicon done")
