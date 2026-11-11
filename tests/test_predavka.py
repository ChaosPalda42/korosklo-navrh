"""Brána na předávku: co o ukázce tvrdíme, musí být pravda.

`data/demo/CO-JE-VYMYSLENE.md` jde klientce do ruky. Tenhle test čte čísla
a slíby z toho dokumentu a porovnává je se zdrojem pravdy — s daty
a s kódem. Když se data změní a dokument ne (nebo naopak), brána zčervená.

Nic se tu neopisuje z textu: každé tvrzení má vedle sebe výpočet.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
PREDAVKA = ROOT / "data" / "demo" / "CO-JE-VYMYSLENE.md"

SLOVY = {
    "jeden": 1, "jedna": 1, "dva": 2, "dvě": 2, "tři": 3, "čtyři": 4,
    "pět": 5, "šest": 6, "sedm": 7, "osm": 8, "devět": 9, "deset": 10,
    "jedenáct": 11, "dvanáct": 12,
}


def nacti(cesta: str) -> object:
    return json.loads((ROOT / "data" / cesta).read_text(encoding="utf8"))


@pytest.fixture(scope="module")
def text() -> str:
    assert PREDAVKA.exists(), f"chybí předávka {PREDAVKA}"
    return PREDAVKA.read_text(encoding="utf8")


def cislo(text: str, vzor: str) -> int:
    """Vytáhne z předávky jedno číslo (číslicí nebo slovem) podle vzoru."""
    nalez = re.search(vzor, text)
    assert nalez, f"v předávce chybí tvrzení podle vzoru {vzor!r}"
    kus = nalez.group(1).strip().lower()
    if kus.isdigit():
        return int(kus)
    assert kus in SLOVY, f"neznámé číslo slovem: {kus!r}"
    return SLOVY[kus]


# --------------------------------------------------------------- počty


def pocty() -> dict[str, tuple[str, int]]:
    """{jméno tvrzení: (regulární výraz do předávky, skutečnost z dat)}"""
    sklad = nacti("demo/sklad.json")
    return {
        "fotky realizací": (r"(\d+) fotek je z galerie", len(nacti("fotky.json"))),
        "texty služeb": (r"Texty služeb\*\* — všech (\d+|\w+),", len(nacti("sluzby.json"))),
        "odstavce o nás": (r"(\d+|\w+) odstavců?, doslova", len(nacti("texty.json")["oNas"]["odstavce"])),
        "poptávky": (r"Všech (\d+) poptávek", len(nacti("demo/poptavky.json"))),
        "klienti": (r"\*\*(\d+) klientů\*\*", len(nacti("demo/klienti.json"))),
        "nabídky": (r"\*\*(\d+) cenových nabídek\*\*", len(nacti("demo/nabidky.json"))),
        "zakázky": (r"\*\*(\d+) zakázky\*\*", len(nacti("demo/zakazky.json"))),
        "skladové karty": (r"\*\*(\d+) skladových karet\*\*", len(sklad["karty"])),
        "pohyby na skladě": (r"a (\d+) pohybů na skladě", len(sklad["pohyby"])),
        "faktury": (r"\*\*(\d+) faktur\*\*", len(nacti("demo/faktury.json"))),
    }


@pytest.mark.parametrize("jmeno", list(pocty()))
def test_pocty_v_predavce_odpovidaji_datum(text: str, jmeno: str) -> None:
    vzor, skutecnost = pocty()[jmeno]
    assert cislo(text, vzor) == skutecnost, (
        f"předávka tvrdí jiný počet, než je v datech ({jmeno}): "
        f"skutečnost {skutecnost}"
    )


def test_udaje_firmy_jsou_z_dat(text: str) -> None:
    """IČ, DIČ a adresa v předávce musí být ty, co jdou na web."""
    site = nacti("site.json")
    for pole in ("ic", "dic"):
        assert site[pole] in text, f"předávka neuvádí {pole} ze site.json"
    adresa = site["adresa"]
    for pole in ("ulice", "psc", "mesto"):
        assert str(adresa[pole]) in text, (
            f"předávka neuvádí část adresy ze site.json ({pole})"
        )


def test_den_ukazky_souhlasi_s_sestavenim(text: str) -> None:
    """Datum v předávce = DNES v build.mjs (ukázka je postavená k tomu dni)."""
    build = (ROOT / "build.mjs").read_text(encoding="utf8")
    nalez = re.search(r'const DNES = "(\d{4})-(\d{2})-(\d{2})"', build)
    assert nalez, "v build.mjs není const DNES"
    r, m, d = (int(x) for x in nalez.groups())
    cekane = f"{d}. {m}. {r}"
    assert cekane in text, f"předávka má jiný den ukázky než build.mjs ({cekane})"


# ------------------------------------------------- slib „nic se neukládá“

UKLADANI = (
    "localStorage",
    "sessionStorage",
    "indexedDB",
    "XMLHttpRequest",
    "sendBeacon",
    "document.cookie",
    "fetch(",
)


def prohledatelne() -> list[Path]:
    return sorted(
        [*(ROOT / "src" / "assets").glob("*.js"), *(ROOT / "src" / "templates").glob("*.mjs")]
    )


def test_predavka_slibuje_ze_se_nic_neuklada(text: str) -> None:
    assert "Nic se neukládá" in text, "předávka ten slib neobsahuje — brána by neměla co hlídat"


@pytest.mark.parametrize("soubor", prohledatelne(), ids=lambda p: p.name)
def test_nic_v_kodu_data_neuklada(soubor: Path) -> None:
    obsah = soubor.read_text(encoding="utf8")
    nalezy = [jmeno for jmeno in UKLADANI if jmeno in obsah]
    assert not nalezy, (
        f"{soubor.relative_to(ROOT)} používá {', '.join(nalezy)} — "
        "předávka přitom slibuje, že se nic neukládá a nic se neposílá"
    )


def test_prihlaseni_nic_nekontroluje(text: str) -> None:
    """Formulář přihlášení jen přejde na nástěnku — žádná kontrola."""
    assert "Přihlášení do administrace nic nekontroluje" in text
    admin = (ROOT / "src" / "templates" / "admin.mjs").read_text(encoding="utf8")
    nalez = re.search(r'<form action="([^"]+)" method="get">', admin)
    assert nalez, "v admin.mjs není formulář přihlášení s action=…"
    assert nalez.group(1).endswith(".html"), "přihlášení míří jinam než na stránku ukázky"


def test_poptavkovy_formular_nic_neodesila(text: str) -> None:
    assert "neposílá e-mail" in text
    web = (ROOT / "src" / "templates" / "web.mjs").read_text(encoding="utf8")
    nalez = re.search(r"<form[^>]*data-poptavka[^>]*>", web)
    assert nalez, "v web.mjs není poptávkový formulář s data-poptavka"
    assert "action=" not in nalez.group(0), "poptávkový formulář má action — v ukázce nic neodchází"
    skript = (ROOT / "src" / "assets" / "web.js").read_text(encoding="utf8")
    assert "e.preventDefault()" in skript, "odeslání formuláře se nezastavuje"


# ------------------------------------------- co je záměrně vynechané

@pytest.mark.parametrize("co", ["konfigurátor", "chatbot"])
def test_vynechane_veci_v_ukazce_nejsou(text: str, co: str) -> None:
    """Předávka říká, že konfigurátor a chatbot v zadání nejsou — ať tam
    opravdu nejsou. Hledá se v kódu, ne ve vlastním textu předávky."""
    assert co in text.lower(), f"předávka nezmiňuje {co}"
    koren = co[:7].lower()  # konfigu / chatbot — bez koncovek a diakritiky
    for soubor in prohledatelne():
        obsah = soubor.read_text(encoding="utf8").lower()
        assert koren not in obsah, (
            f"{soubor.relative_to(ROOT)} zmiňuje {co}, ale předávka ho vylučuje"
        )


def test_web_je_jen_cesky(text: str) -> None:
    assert "jen česky" in text
    for jmeno in ("layout.mjs", "admin-layout.mjs"):
        obsah = (ROOT / "src" / "templates" / jmeno).read_text(encoding="utf8")
        jazyky = set(re.findall(r'<html lang="([a-z-]+)"', obsah))
        assert jazyky == {"cs"}, f"{jmeno} hlásí jazyky {sorted(jazyky)}"


def test_seznam_stranek_nema_druhy_jazyk() -> None:
    """Žádná stránka v sestavení nemíří do jazykové podsložky (/en/, /de/)."""
    build = (ROOT / "build.mjs").read_text(encoding="utf8")
    cesty = re.findall(r'\["([^"]+\.html)"', build) + re.findall(r'`([^`]+\.html)`', build)
    spatne = [c for c in cesty if re.match(r"^(en|de|sk|pl)/", c)]
    assert not spatne, f"sestavení staví stránky v jiném jazyce: {spatne}"
