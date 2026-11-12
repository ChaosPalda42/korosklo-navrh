"""Brána na prokliky mezi doklady: z nabídky i z faktury musí být vidět,
ke které zakázce to patří — a musí tam vést odkaz.

Netvrdí se to opisem ze šablony: stránky se opravdu sestaví a hledá se
v hotovém HTML. Zdroj pravdy jsou data v `data/demo/`.
"""
from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
CRM = "administrace/crm"


def nacti(jmeno: str) -> list[dict]:
    return json.loads((ROOT / "data" / "demo" / jmeno).read_text(encoding="utf8"))


ZAKAZKY = nacti("zakazky.json")
NABIDKY = nacti("nabidky.json")
FAKTURY = nacti("faktury.json")


@pytest.fixture(scope="module")
def web() -> Path:
    """Sestavený web. Staví se tady, ať brána nezávisí na tom, kdy kdo stavěl."""
    hotovo = subprocess.run(
        ["node", "build.mjs"], cwd=ROOT, capture_output=True, text=True, check=False,
    )
    assert hotovo.returncode == 0, f"sestavení spadlo: {hotovo.stderr[-400:]}"
    out = ROOT / "out" / "web"
    assert (out / CRM / "zakazky.html").exists(), "sestavení nevyrobilo stránku zakázek"
    return out


def stranka(web: Path, cesta: str) -> str:
    p = web / CRM / cesta
    assert p.exists(), f"chybí sestavená stránka {cesta}"
    return p.read_text(encoding="utf8")


def zakazka_nabidky(cislo: str) -> dict | None:
    return next((z for z in ZAKAZKY if z.get("nabidka") == cislo), None)


def test_zakazky_maji_terc_odkazu(web: Path) -> None:
    """Každý řádek zakázky nese svoje id, aby na něj šlo odkázat."""
    html = stranka(web, "zakazky.html")
    ids = re.findall(r'<details class="rozbal"[^>]*\sid="([^"]+)"', html)
    assert sorted(ids) == sorted(z["id"] for z in ZAKAZKY), (
        f"řádky zakázek nesou id {sorted(ids)}"
    )
    assert len(ids) == len(set(ids)), "dvě zakázky mají stejné id"


@pytest.mark.parametrize("n", NABIDKY, ids=lambda n: n["cislo"])
def test_z_nabidky_je_videt_zakazka(web: Path, n: dict) -> None:
    """Nabídka, ze které vznikla zakázka, na ni musí odkazovat."""
    z = zakazka_nabidky(n["cislo"])
    html = stranka(web, f"nabidka-{n['cislo']}.html")
    if z is None:
        assert "zakazky.html#" not in html, (
            f"nabídka {n['cislo']} odkazuje na zakázku, ale žádná z ní nevznikla"
        )
        return
    assert f'zakazky.html#{z["id"]}"' in html, (
        f"nabídka {n['cislo']} neodkazuje na zakázku {z['id']}"
    )
    assert z["id"] in html, f"na nabídce {n['cislo']} není vidět číslo zakázky"


@pytest.mark.parametrize("f", FAKTURY, ids=lambda f: f["cislo"])
def test_z_faktury_je_videt_zakazka(web: Path, f: dict) -> None:
    """Faktura vedle nabídky ukazuje i zakázku — proklik jde dál, ne jen zpět."""
    html = stranka(web, f"faktura-{f['cislo']}.html")
    nabidka = f.get("zNabidky")
    if not nabidka:
        return
    assert f'nabidka-{nabidka}.html"' in html, (
        f"faktura {f['cislo']} neodkazuje na nabídku {nabidka}"
    )
    z = zakazka_nabidky(nabidka)
    if z is None:
        return
    assert f'zakazky.html#{z["id"]}"' in html, (
        f"faktura {f['cislo']} neodkazuje na zakázku {z['id']}"
    )


@pytest.mark.parametrize("n", NABIDKY, ids=lambda n: n["cislo"])
def test_z_nabidky_je_videt_faktura(web: Path, n: dict) -> None:
    """Když z nabídky vznikla faktura, je na nabídce odkaz na její doklad."""
    f = next((x for x in FAKTURY if x.get("zNabidky") == n["cislo"]), None)
    html = stranka(web, f"nabidka-{n['cislo']}.html")
    if f is None:
        assert "faktura-" not in html, (
            f"nabídka {n['cislo']} odkazuje na doklad faktury, která z ní nevznikla"
        )
        return
    assert f'faktura-{f["cislo"]}.html"' in html, (
        f"nabídka {n['cislo']} neodkazuje na fakturu {f['cislo']}"
    )


def test_seznam_nabidek_ukazuje_zakazku(web: Path) -> None:
    """I v seznamu nabídek je u nabídky vidět, do které zakázky se proměnila."""
    html = stranka(web, "nabidky.html")
    for n in NABIDKY:
        z = zakazka_nabidky(n["cislo"])
        if z is None:
            continue
        assert f'zakazky.html#{z["id"]}"' in html, (
            f"v seznamu nabídek chybí proklik z {n['cislo']} na zakázku {z['id']}"
        )
