"""Post-process generated brand PNGs:
  - Make the off-white background transparent (alpha based on luminance).
  - Save *-transparent.png variants while keeping originals.
Run:
  python -m scripts.transparentize_brand_logos
"""
from pathlib import Path
from PIL import Image

OUT_DIR = Path("/app/frontend/public/brand")

# Anything brighter than this luminance becomes transparent.
# Off-white paper ~ luminance 235+. Pure ink ~ 0. Edges feather between.
LUM_HI = 235  # fully transparent
LUM_LO = 80   # fully opaque


def transparentize(src: Path, dst: Path) -> None:
    im = Image.open(src).convert("RGBA")
    pixels = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, _ = pixels[x, y]
            lum = (r * 0.299 + g * 0.587 + b * 0.114)
            if lum >= LUM_HI:
                alpha = 0
            elif lum <= LUM_LO:
                alpha = 255
            else:
                # smooth fall-off so anti-aliased edges keep softness
                t = (LUM_HI - lum) / (LUM_HI - LUM_LO)
                alpha = int(255 * t)
            # Force ink pixels to pure black for crisp branding
            if alpha == 255:
                pixels[x, y] = (0, 0, 0, 255)
            else:
                pixels[x, y] = (0, 0, 0, alpha)
    im.save(dst, optimize=True)
    print(f"saved {dst} ({dst.stat().st_size} bytes)")


def main() -> None:
    for name in ("lusorae-wordmark.png", "lusorae-L.png"):
        src = OUT_DIR / name
        dst = OUT_DIR / name.replace(".png", "-transparent.png")
        transparentize(src, dst)


if __name__ == "__main__":
    main()
