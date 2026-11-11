"""Akceptační test C-003 — src/lib/sklad.mjs (skladová evidence)."""
from __future__ import annotations

import pytest


@pytest.fixture()
def js():
    from tests.jsmod import run_js

    def call(body, **args):
        return run_js("sklad.mjs", body, args=args)

    return call


KARTA = {
    "kod": "ESG-08-CIRE",
    "nazev": "Kalené sklo ESG 8 mm čiré",
    "jednotka": "m²",
    "naSklade": 42.5,
    "rezervovano": 12,
    "limit": 15,
    "cena": 1180,
}

KARTY = [
    dict(KARTA),
    {"kod": "VSG-442", "nazev": "Vrstvené VSG 4.4.2", "jednotka": "m²",
     "naSklade": 18, "rezervovano": 16, "limit": 10, "cena": 1420},
    {"kod": "TERC-304", "nazev": "Nerezový terč AISI 304", "jednotka": "ks",
     "naSklade": 120, "rezervovano": 0, "limit": 40, "cena": 890},
    {"kod": "ZRC-04", "nazev": "Zrcadlo 4 mm", "jednotka": "m²",
     "naSklade": 3, "rezervovano": 0, "limit": 8, "cena": 760},
]


# -------------------------------------------------------------- stav karty

def test_stav_karty(js):
    s = js("out(m.stavKarty(A.k));", k=KARTA)
    assert s == {"naSklade": 42.5, "rezervovano": 12, "volne": 30.5}


def test_stav_karty_bez_hodnot(js):
    s = js("out(m.stavKarty(A.k));", k={"kod": "X"})
    assert s == {"naSklade": 0, "rezervovano": 0, "volne": 0}


# ------------------------------------------------------------------ pohyby

def test_prijem_pricte(js):
    k = js("out(m.pohybem(A.k, A.p));", k=KARTA, p={"druh": "prijem", "mnozstvi": 7.5})
    assert k["naSklade"] == 50
    assert k["rezervovano"] == 12


def test_vydej_odecte_i_z_rezervace(js):
    k = js("out(m.pohybem(A.k, A.p));", k=KARTA, p={"druh": "vydej", "mnozstvi": 10})
    assert k["naSklade"] == 32.5
    assert k["rezervovano"] == 2


def test_vydej_nad_zasobu_spadne(js):
    chyba = js(
        "try { m.pohybem(A.k, A.p); out(null); } catch (e) { out(e.message); }",
        k=KARTA, p={"druh": "vydej", "mnozstvi": 50},
    )
    assert chyba is not None
    assert "42,5" in chyba or "42.5" in chyba


def test_rezervace_jen_do_volneho(js):
    k = js("out(m.pohybem(A.k, A.p));", k=KARTA, p={"druh": "rezervace", "mnozstvi": 30})
    assert k["rezervovano"] == 42
    assert k["naSklade"] == 42.5

    chyba = js(
        "try { m.pohybem(A.k, A.p); out(null); } catch (e) { out(e.message); }",
        k=KARTA, p={"druh": "rezervace", "mnozstvi": 31},
    )
    assert chyba is not None


def test_zruseni_rezervace(js):
    k = js("out(m.pohybem(A.k, A.p));", k=KARTA, p={"druh": "zruseni-rezervace", "mnozstvi": 20})
    assert k["rezervovano"] == 0


def test_nekladne_mnozstvi_spadne(js):
    for mn in (0, -3):
        chyba = js(
            "try { m.pohybem(A.k, A.p); out(null); } catch (e) { out(e.message); }",
            k=KARTA, p={"druh": "prijem", "mnozstvi": mn},
        )
        assert chyba is not None


def test_neznamy_druh_spadne(js):
    chyba = js(
        "try { m.pohybem(A.k, A.p); out(null); } catch (e) { out(e.message); }",
        k=KARTA, p={"druh": "kouzlo", "mnozstvi": 1},
    )
    assert chyba is not None


def test_pohyb_nemeni_puvodni_kartu(js):
    stejna = js(
        "const kopie = JSON.parse(JSON.stringify(A.k));"
        " m.pohybem(A.k, A.p);"
        " out(JSON.stringify(A.k) === JSON.stringify(kopie));",
        k=KARTA, p={"druh": "prijem", "mnozstvi": 5},
    )
    assert stejna is True


# ----------------------------------------------------------------- přehledy

def test_pod_limitem(js):
    pod = js("out(m.podLimitem(A.karty).map((k) => k.kod));", karty=KARTY)
    # volné: ESG 30,5 (limit 15) ok; VSG 2 (limit 10) chybí 8; ZRC 3 (limit 8) chybí 5
    assert pod == ["VSG-442", "ZRC-04"]


def test_pod_limitem_prazdne(js):
    assert js("out(m.podLimitem([]));") == []


def test_hodnota_skladu(js):
    # 42,5*1180 + 18*1420 + 120*890 + 3*760
    assert js("out(m.hodnotaSkladu(A.karty));", karty=KARTY) == 50150 + 25560 + 106800 + 2280


def test_hodnota_prazdneho_skladu(js):
    assert js("out(m.hodnotaSkladu([]));") == 0
