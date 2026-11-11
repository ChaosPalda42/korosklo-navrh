"""Akceptační test C-006 — src/lib/kdy.mjs (slovní odstup oběma směry)."""
from __future__ import annotations

import pytest

NBSP = " "
DNES = "2026-11-11"


@pytest.fixture()
def kdy():
    from tests.jsmod import run_js

    def call(iso, dnes=DNES):
        return run_js("kdy.mjs", "out(m.kdy(A.iso, A.dnes));", args={"iso": iso, "dnes": dnes})

    return call


# ------------------------------------------------------------ blízké dny

def test_dnes(kdy):
    assert kdy("2026-11-11") == "dnes"


def test_zitra(kdy):
    assert kdy("2026-11-12") == "zítra"


def test_pozitri(kdy):
    assert kdy("2026-11-13") == "pozítří"


def test_vcera(kdy):
    assert kdy("2026-11-10") == "včera"


# ------------------------------------------------------------ dny dopředu

def test_za_tri_dny(kdy):
    assert kdy("2026-11-14") == f"za 3{NBSP}dny"


def test_za_ctyri_dny(kdy):
    assert kdy("2026-11-15") == f"za 4{NBSP}dny"


def test_za_pet_dni(kdy):
    assert kdy("2026-11-16") == f"za 5{NBSP}dní"


def test_za_trinact_dni_je_jeste_ve_dnech(kdy):
    assert kdy("2026-11-24") == f"za 13{NBSP}dní"


def test_mezi_cislem_a_slovem_je_pevna_mezera(kdy):
    text = kdy("2026-11-16")
    assert " " not in text.split("za ", 1)[1]


# ------------------------------------------------------------ týdny dopředu

def test_ctrnact_dni_uz_jsou_dva_tydny(kdy):
    assert kdy("2026-11-25") == f"za 2{NBSP}týdny"


def test_za_pet_tydnu(kdy):
    assert kdy("2026-12-16") == f"za 5{NBSP}týdnů"


def test_tydny_se_zaokrouhluji(kdy):
    # 17 dní -> round(17/7) = 2
    assert kdy("2026-11-28") == f"za 2{NBSP}týdny"
    # 18 dní -> round(18/7) = 3
    assert kdy("2026-11-29") == f"za 3{NBSP}týdny"


def test_jeden_tyden_ma_svuj_tvar(kdy):
    # 50 dní od 2026-11-11, ať to není hraniční případ zaokrouhlení
    assert kdy("2026-12-31") == f"za 7{NBSP}týdnů"


# ------------------------------------------------------------ dny dozadu

def test_pred_dvema_dny(kdy):
    assert kdy("2026-11-09") == f"před 2{NBSP}dny"


def test_pred_peti_dny(kdy):
    assert kdy("2026-11-06") == f"před 5{NBSP}dny"


def test_pred_trinacti_dny(kdy):
    assert kdy("2026-10-29") == f"před 13{NBSP}dny"


def test_jeden_den_zpatky_neni_pred_jednim_dnem(kdy):
    assert kdy("2026-11-10") == "včera"


# ------------------------------------------------------------ týdny dozadu

def test_pred_dvema_tydny(kdy):
    assert kdy("2026-10-28") == f"před 2{NBSP}týdny"


def test_pred_osmi_tydny(kdy):
    # 56 dní zpátky
    assert kdy("2026-09-16") == f"před 8{NBSP}týdny"


# ------------------------------------------------------------ daleko = datum

def test_daleka_budoucnost_je_datum(kdy):
    assert kdy("2027-03-01") == "1. 3. 2027"


def test_daleka_minulost_je_datum(kdy):
    assert kdy("2026-01-05") == "5. 1. 2026"


def test_hranice_sedesati_dnu_dopredu_je_datum(kdy):
    assert kdy("2027-01-10") == "10. 1. 2027"


def test_padesat_devet_dnu_dopredu_jsou_jeste_tydny(kdy):
    assert kdy("2027-01-09") == f"za 8{NBSP}týdnů"


def test_hranice_sedesati_dnu_dozadu_je_datum(kdy):
    assert kdy("2026-09-12") == "12. 9. 2026"


def test_padesat_devet_dnu_dozadu_jsou_jeste_tydny(kdy):
    assert kdy("2026-09-13") == f"před 8{NBSP}týdny"


# ------------------------------------------------------------ nesmysly

def test_prazdne_datum_je_prazdny_retezec(kdy):
    assert kdy("") == ""


def test_nesmyslne_datum_je_prazdny_retezec(kdy):
    assert kdy("tohle není datum") == ""


def test_neuplne_datum_je_prazdny_retezec(kdy):
    assert kdy("2026-11") == ""


def test_nesmyslny_dnesek_vrati_jen_datum(kdy):
    assert kdy("2026-11-13", "") == "13. 11. 2026"


def test_null_datum_je_prazdny_retezec(kdy):
    assert kdy(None) == ""


# ------------------------------------------------------------ přelomy

def test_prelom_mesice_dopredu(kdy):
    assert kdy("2026-12-01", "2026-11-30") == "zítra"


def test_prelom_roku_dozadu(kdy):
    assert kdy("2025-12-31", "2026-01-01") == "včera"


def test_prestupny_rok_se_pocita_spravne(kdy):
    # 2028 je přestupný: z 28. 2. na 1. 3. jsou dva dny
    assert kdy("2028-03-01", "2028-02-28") == "pozítří"


def test_cas_ani_pasmo_do_toho_nemluvi(kdy):
    assert kdy("2026-11-12", "2026-11-11") == "zítra"
    assert kdy("2026-06-12", "2026-06-11") == "zítra"


# ------------------------------------------------------------ nic jiného navíc

def test_veta_nekonci_teckou(kdy):
    for iso in ("2026-11-11", "2026-11-14", "2026-11-25", "2026-11-06", "2026-10-28"):
        assert not kdy(iso).endswith(".")


def test_veta_zacina_malym_pismenem(kdy):
    for iso in ("2026-11-11", "2026-11-14", "2026-11-25", "2026-11-06", "2026-10-28"):
        prvni = kdy(iso)[0]
        assert prvni == prvni.lower()
