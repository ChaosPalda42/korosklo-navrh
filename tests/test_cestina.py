"""Akceptační test C-001 — src/lib/cestina.mjs (české formátování)."""
from __future__ import annotations

import pytest

NBSP = " "


@pytest.fixture()
def js():
    from tests.jsmod import run_js

    def call(body, **args):
        return run_js("cestina.mjs", body, args=args)

    return call


# ------------------------------------------------------------------ koruny

def test_koruny_oddeluje_tisice_pevnou_mezerou(js):
    assert js("out(m.koruny(12345));") == f"12{NBSP}345{NBSP}Kč"
    assert js("out(m.koruny(0));") == f"0{NBSP}Kč"
    assert js("out(m.koruny(999));") == f"999{NBSP}Kč"
    assert js("out(m.koruny(1234567));") == f"1{NBSP}234{NBSP}567{NBSP}Kč"


def test_koruny_bez_desetinnych_zaokrouhli(js):
    assert js("out(m.koruny(1234.56));") == f"1{NBSP}235{NBSP}Kč"
    assert js("out(m.koruny(1234.4));") == f"1{NBSP}234{NBSP}Kč"


def test_koruny_s_halerii(js):
    assert js("out(m.koruny(1234.5, true));") == f"1{NBSP}234,50{NBSP}Kč"
    assert js("out(m.koruny(12, true));") == f"12,00{NBSP}Kč"


def test_koruny_zaporne(js):
    assert js("out(m.koruny(-1500));") == f"−1{NBSP}500{NBSP}Kč"


# ------------------------------------------------------------------- cislo

def test_cislo_formatuje_bez_meny(js):
    assert js("out(m.cislo(12345));") == f"12{NBSP}345"
    assert js("out(m.cislo(3.5, 1));") == "3,5"
    assert js("out(m.cislo(1234.567, 2));") == f"1{NBSP}234,57"


# ------------------------------------------------------------------ mnozne

TVARY = ["položka", "položky", "položek"]


def test_mnozne_vraci_spravny_tvar(js):
    def t(n):
        return js("out(m.mnozne(A.n, A.t));", n=n, t=TVARY)

    assert t(1) == "položka"
    assert t(2) == "položky"
    assert t(3) == "položky"
    assert t(4) == "položky"
    assert t(5) == "položek"
    assert t(0) == "položek"
    assert t(11) == "položek"
    assert t(21) == "položek"
    assert t(22) == "položek"
    assert t(101) == "položka"
    assert t(102) == "položky"


def test_mnozne_se_zapornym_cislem(js):
    assert js("out(m.mnozne(-1, A.t));", t=TVARY) == "položka"
    assert js("out(m.mnozne(-5, A.t));", t=TVARY) == "položek"


def test_sMnoznym_spoji_cislo_a_tvar(js):
    assert js("out(m.sMnoznym(3, A.t));", t=TVARY) == f"3{NBSP}položky"
    assert js("out(m.sMnoznym(12, A.t));", t=TVARY) == f"12{NBSP}položek"


# ------------------------------------------------------------------- datum

def test_datum_ceskym_zpusobem(js):
    assert js('out(m.datum("2026-11-11"));') == "11. 11. 2026"
    assert js('out(m.datum("2026-01-05"));') == "5. 1. 2026"


def test_datum_kratce_bez_roku(js):
    assert js('out(m.datumKratce("2026-01-05"));') == "5. 1."


def test_datum_prazdne(js):
    assert js("out(m.datum(null));") == ""
    assert js('out(m.datum(""));') == ""


# --------------------------------------------------------------- odstup

def test_pred_popisuje_odstup(js):
    def p(co, dnes="2026-11-11"):
        return js("out(m.pred(A.co, A.dnes));", co=co, dnes=dnes)

    assert p("2026-11-11") == "dnes"
    assert p("2026-11-10") == "včera"
    assert p("2026-11-08") == "před 3 dny"
    assert p("2026-11-06") == "před 5 dny"
    assert p("2026-11-01") == "před 10 dny"
    assert p("2026-10-28") == "před 2 týdny"
    assert p("2026-09-11") == "před 2 měsíci"
    assert p("2024-11-11") == "11. 11. 2024"


def test_pred_v_budoucnu_vraci_datum(js):
    assert js('out(m.pred("2026-12-01", "2026-11-11"));') == "1. 12. 2026"


# ------------------------------------------------------------------- dnu

def test_dnuMezi_pocita_cele_dny(js):
    assert js('out(m.dnuMezi("2026-11-11", "2026-11-16"));') == 5
    assert js('out(m.dnuMezi("2026-11-16", "2026-11-11"));') == -5
    assert js('out(m.dnuMezi("2026-11-11", "2026-11-11"));') == 0
    assert js('out(m.dnuMezi("2026-02-28", "2026-03-01"));') == 1


def test_posunDnu_vraci_iso(js):
    assert js('out(m.posunDnu("2026-11-11", 5));') == "2026-11-16"
    assert js('out(m.posunDnu("2026-12-30", 5));') == "2027-01-04"
    assert js('out(m.posunDnu("2026-03-01", -1));') == "2026-02-28"
