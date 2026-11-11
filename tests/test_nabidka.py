"""Akceptační test C-002 — src/lib/nabidka.mjs (počty v cenové nabídce)."""
from __future__ import annotations

import pytest


@pytest.fixture()
def js():
    from tests.jsmod import run_js

    def call(body, **args):
        return run_js("nabidka.mjs", body, args=args)

    return call


POLOZKY = [
    {"nazev": "Kalené sklo ESG 8 mm čiré", "mnozstvi": 3.2, "jednotka": "m²", "cena": 2450, "dph": 21},
    {"nazev": "Nerezové bodové terče", "mnozstvi": 8, "jednotka": "ks", "cena": 890, "dph": 21},
    {"nazev": "Montáž", "mnozstvi": 6, "jednotka": "h", "cena": 650, "dph": 21},
    {"nazev": "Doprava Plzeň a okolí", "mnozstvi": 1, "jednotka": "–", "cena": 900, "dph": 21},
]


# ------------------------------------------------------------ jedna položka

def test_polozka_celkem(js):
    assert js("out(m.polozkaCelkem(A.p));", p={"mnozstvi": 3.2, "cena": 2450}) == 7840
    assert js("out(m.polozkaCelkem(A.p));", p={"mnozstvi": 1, "cena": 900}) == 900


def test_polozka_se_slevou(js):
    assert js("out(m.polozkaCelkem(A.p));", p={"mnozstvi": 2, "cena": 1000, "sleva": 10}) == 1800
    assert js("out(m.polozkaCelkem(A.p));", p={"mnozstvi": 1, "cena": 999, "sleva": 33}) == 669.33


def test_polozka_bez_mnozstvi_je_nula(js):
    assert js("out(m.polozkaCelkem(A.p));", p={"cena": 500}) == 0
    assert js("out(m.polozkaCelkem(A.p));", p={"mnozstvi": 2}) == 0


# ------------------------------------------------------------------ souhrn

def test_souhrn_sectene_hodnoty(js):
    s = js("out(m.souhrn(A.n));", n={"polozky": POLOZKY})
    # 7840 + 7120 + 3900 + 900
    assert s["bezDph"] == 19760
    assert s["danCelkem"] == 4149.6
    assert s["sDphPresne"] == 23909.6
    assert s["celkem"] == 23910
    assert s["zaokrouhleni"] == 0.4


def test_souhrn_rozpad_podle_sazeb(js):
    polozky = [
        {"mnozstvi": 1, "cena": 1000, "dph": 21},
        {"mnozstvi": 1, "cena": 500, "dph": 12},
        {"mnozstvi": 2, "cena": 250, "dph": 21},
    ]
    s = js("out(m.souhrn(A.n));", n={"polozky": polozky})
    assert s["dph"] == [
        {"sazba": 21, "zaklad": 1500, "dan": 315},
        {"sazba": 12, "zaklad": 500, "dan": 60},
    ]
    assert s["bezDph"] == 2000
    assert s["danCelkem"] == 375


def test_souhrn_bez_zaokrouhleni(js):
    s = js("out(m.souhrn(A.n));", n={"polozky": POLOZKY, "zaokrouhlit": False})
    assert s["celkem"] == 23909.6
    assert s["zaokrouhleni"] == 0


def test_souhrn_prazdne_nabidky(js):
    s = js("out(m.souhrn(A.n));", n={"polozky": []})
    assert s["bezDph"] == 0
    assert s["danCelkem"] == 0
    assert s["celkem"] == 0
    assert s["dph"] == []


def test_souhrn_neplatce_dph(js):
    s = js("out(m.souhrn(A.n));", n={"polozky": POLOZKY, "platceDph": False})
    assert s["danCelkem"] == 0
    assert s["dph"] == []
    assert s["celkem"] == 19760


def test_souhrn_nemeni_vstup(js):
    stejne = js(
        "const kopie = JSON.parse(JSON.stringify(A.n)); m.souhrn(A.n);"
        " out(JSON.stringify(A.n) === JSON.stringify(kopie));",
        n={"polozky": POLOZKY},
    )
    assert stejne is True


# --------------------------------------------------------------- platnost

def test_platnost_do(js):
    assert js('out(m.platnostDo("2026-11-11", 5));') == "2026-11-16"
    assert js('out(m.platnostDo("2026-12-30", 5));') == "2027-01-04"


def test_stav_platnosti(js):
    def st(platnost, dnes="2026-11-11"):
        return js("out(m.stavPlatnosti(A.n, A.dnes));", n={"platnostDo": platnost}, dnes=dnes)

    assert st("2026-11-20") == "plati"
    assert st("2026-11-13") == "konci"
    assert st("2026-11-12") == "konci"
    assert st("2026-11-11") == "konci"
    assert st("2026-11-10") == "prosla"
    assert st("2026-01-01") == "prosla"


def test_stav_platnosti_bez_data(js):
    assert js("out(m.stavPlatnosti(A.n, A.dnes));", n={}, dnes="2026-11-11") == "plati"


# ------------------------------------------------------------------ čísla

def test_dalsi_cislo(js):
    cisla = ["2026-0001", "2026-0007", "2025-0012"]
    assert js("out(m.dalsiCislo(A.c, 2026));", c=cisla) == "2026-0008"
    assert js("out(m.dalsiCislo(A.c, 2025));", c=cisla) == "2025-0013"
    assert js("out(m.dalsiCislo(A.c, 2027));", c=cisla) == "2027-0001"
    assert js("out(m.dalsiCislo([], 2026));") == "2026-0001"


def test_dalsi_cislo_ignoruje_nesmysly(js):
    cisla = ["2026-0003", "nabidka-x", "", "2026-abc"]
    assert js("out(m.dalsiCislo(A.c, 2026));", c=cisla) == "2026-0004"
