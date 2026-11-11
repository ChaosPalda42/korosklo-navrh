"""Akceptační test C-004 — src/lib/faktura.mjs (faktury z nabídek)."""
from __future__ import annotations

import pytest


@pytest.fixture()
def js():
    from tests.jsmod import run_js

    def call(body, **args):
        return run_js("faktura.mjs", body, args=args)

    return call


NABIDKA = {
    "cislo": "2026-0042",
    "zakaznik": {"jmeno": "Jan Dvořák", "ulice": "Sadová 12", "psc": "326 00", "mesto": "Plzeň"},
    "polozky": [
        {"nazev": "Kalené sklo ESG 8 mm", "mnozstvi": 3.2, "jednotka": "m²", "cena": 2450, "dph": 21},
        {"nazev": "Montáž", "mnozstvi": 6, "jednotka": "h", "cena": 650, "dph": 21},
    ],
}


# ------------------------------------------------------------- z nabídky

def test_z_nabidky_prenese_udaje(js):
    f = js(
        "out(m.zNabidky(A.n, A.o));",
        n=NABIDKA, o={"cislo": "2026-0115", "vystaveno": "2026-11-11"},
    )
    assert f["cislo"] == "2026-0115"
    assert f["zNabidky"] == "2026-0042"
    assert f["zakaznik"]["jmeno"] == "Jan Dvořák"
    assert len(f["polozky"]) == 2
    assert f["stav"] == "navrh"
    assert f["vystaveno"] == "2026-11-11"


def test_z_nabidky_vychozi_splatnost_14_dnu(js):
    f = js("out(m.zNabidky(A.n, A.o));", n=NABIDKA, o={"cislo": "2026-0115", "vystaveno": "2026-11-11"})
    assert f["splatnost"] == "2026-11-25"


def test_z_nabidky_vlastni_splatnost(js):
    f = js(
        "out(m.zNabidky(A.n, A.o));",
        n=NABIDKA, o={"cislo": "2026-0115", "vystaveno": "2026-11-11", "splatnostDnu": 30},
    )
    assert f["splatnost"] == "2026-12-11"


def test_z_nabidky_nemeni_nabidku(js):
    stejna = js(
        "const kopie = JSON.parse(JSON.stringify(A.n));"
        " const f = m.zNabidky(A.n, A.o);"
        " f.polozky[0].nazev = 'jine';"
        " out(JSON.stringify(A.n) === JSON.stringify(kopie));",
        n=NABIDKA, o={"cislo": "2026-0115", "vystaveno": "2026-11-11"},
    )
    assert stejna is True


# ------------------------------------------------------- variabilní symbol

def test_variabilni_symbol(js):
    assert js('out(m.variabilniSymbol("2026-0115"));') == "20260115"
    assert js('out(m.variabilniSymbol("F-2026/42"));') == "202642"
    assert js('out(m.variabilniSymbol("123456789012345"));') == "6789012345"
    assert js('out(m.variabilniSymbol("bez cisel"));') == ""


# ------------------------------------------------------------------- stav

def test_stav_faktury(js):
    def st(stav, splatnost, dnes="2026-11-11"):
        return js("out(m.stavFaktury(A.f, A.dnes));", f={"stav": stav, "splatnost": splatnost}, dnes=dnes)

    assert st("navrh", "2026-11-25") == "navrh"
    assert st("zaplacena", "2026-01-01") == "zaplacena"
    assert st("vystavena", "2026-11-25") == "vystavena"
    assert st("vystavena", "2026-11-11") == "vystavena"
    assert st("vystavena", "2026-11-10") == "po-splatnosti"


def test_dnu_po_splatnosti(js):
    def d(splatnost, dnes="2026-11-11"):
        return js("out(m.dnuPoSplatnosti(A.f, A.dnes));", f={"stav": "vystavena", "splatnost": splatnost}, dnes=dnes)

    assert d("2026-11-01") == 10
    assert d("2026-11-11") == 0
    assert d("2026-11-25") == 0


def test_dnu_po_splatnosti_u_zaplacene_je_nula(js):
    assert js(
        "out(m.dnuPoSplatnosti(A.f, A.dnes));",
        f={"stav": "zaplacena", "splatnost": "2026-01-01"}, dnes="2026-11-11",
    ) == 0


# ---------------------------------------------------------------- přehled

FAKTURY = [
    {"cislo": "2026-0110", "stav": "zaplacena", "splatnost": "2026-10-20", "celkem": 48000},
    {"cislo": "2026-0111", "stav": "vystavena", "splatnost": "2026-11-01", "celkem": 23910},
    {"cislo": "2026-0112", "stav": "vystavena", "splatnost": "2026-11-25", "celkem": 61500},
    {"cislo": "2026-0113", "stav": "navrh", "splatnost": "2026-11-30", "celkem": 12000},
]


def test_prehled_sectene(js):
    p = js("out(m.prehled(A.f, A.dnes));", f=FAKTURY, dnes="2026-11-11")
    assert p["zaplaceno"] == 48000
    assert p["nezaplaceno"] == 85410
    assert p["poSplatnosti"] == 23910
    assert p["pocty"] == {"navrh": 1, "vystavena": 1, "po-splatnosti": 1, "zaplacena": 1}


def test_prehled_prazdny(js):
    p = js("out(m.prehled([], A.dnes));", dnes="2026-11-11")
    assert p["zaplaceno"] == 0
    assert p["nezaplaceno"] == 0
    assert p["poSplatnosti"] == 0
    assert p["pocty"] == {"navrh": 0, "vystavena": 0, "po-splatnosti": 0, "zaplacena": 0}
