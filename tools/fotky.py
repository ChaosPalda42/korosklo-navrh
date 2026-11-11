"""Příprava fotek realizací pro web.

Ze `zdroje/fotky-ze-stareho-webu/NN-*.jpeg|png` udělá pro každý kód NN:

  src/assets/img/foto/NN-k-400.webp   karta  (ořez 3:2, 400 px)
  src/assets/img/foto/NN-k-800.webp   karta  (ořez 3:2, 800 px)
  src/assets/img/foto/NN-1200.webp    plná   (delší hrana 1200 px)
  src/assets/img/foto/NN-2000.webp    plná   (delší hrana 2000 px)

a `data/fotky.json` s rozměry, orientací a barvou pro placeholder.

Spuštění:  uv run --with pillow python tools/fotky.py
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from PIL import Image, ImageOps

KOREN = Path(__file__).resolve().parent.parent
ZDROJ = KOREN / "zdroje" / "fotky-ze-stareho-webu"
CIL = KOREN / "src" / "assets" / "img" / "foto"
SOUPIS = KOREN / "data" / "fotky.json"

KARTA_POMER = 3 / 2  # šířka ku výšce
KARTA_SIRKY = (400, 800)
PLNE_HRANY = (1200, 2000)
KVALITA = 82


def kod(cesta: Path) -> str | None:
    m = re.match(r"(\d{2})-", cesta.name)
    return m.group(1) if m else None


def orez_na_pomer(im: Image.Image, pomer: float) -> Image.Image:
    """Ořízne obrázek na daný poměr stran kolem středu (u výšky mírně nad střed,
    aby u interiérových fotek nevypadl strop)."""
    s, v = im.size
    if s / v > pomer:
        nova_s = round(v * pomer)
        levy = (s - nova_s) // 2
        return im.crop((levy, 0, levy + nova_s, v))
    nova_v = round(s / pomer)
    horni = round((v - nova_v) * 0.40)
    return im.crop((0, horni, s, horni + nova_v))


def prumerna_barva(im: Image.Image) -> str:
    maly = im.convert("RGB").resize((1, 1), Image.LANCZOS)
    r, g, b = maly.getpixel((0, 0))
    return f"#{r:02x}{g:02x}{b:02x}"


def zpracuj(cesta: Path) -> dict:
    k = kod(cesta)
    im = ImageOps.exif_transpose(Image.open(cesta)).convert("RGB")
    s, v = im.size

    for sirka in KARTA_SIRKY:
        karta = orez_na_pomer(im, KARTA_POMER)
        karta = karta.resize((sirka, round(sirka / KARTA_POMER)), Image.LANCZOS)
        karta.save(CIL / f"{k}-k-{sirka}.webp", "WEBP", quality=KVALITA, method=6)

    for hrana in PLNE_HRANY:
        plna = im.copy()
        plna.thumbnail((hrana, hrana), Image.LANCZOS)
        plna.save(CIL / f"{k}-{hrana}.webp", "WEBP", quality=KVALITA, method=6)

    return {
        "kod": k,
        "sirka": s,
        "vyska": v,
        "orientace": "na vysku" if v > s else "na sirku",
        "barva": prumerna_barva(im),
    }


def main() -> int:
    if not ZDROJ.is_dir():
        print(f"chybí {ZDROJ}", file=sys.stderr)
        return 1
    CIL.mkdir(parents=True, exist_ok=True)

    soubory = sorted(p for p in ZDROJ.iterdir() if kod(p) and p.suffix.lower() in {".jpeg", ".jpg", ".png"})
    soupis = {}
    for cesta in soubory:
        zaznam = zpracuj(cesta)
        soupis[zaznam["kod"]] = zaznam

    SOUPIS.write_text(json.dumps(soupis, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"zpracováno fotek: {len(soupis)} → {CIL.relative_to(KOREN)} ({len(soupis) * 4} souborů)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
