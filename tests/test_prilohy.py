"""Akceptační test C-007 — src/lib/prilohy.mjs (přílohy zakázky)."""
from __future__ import annotations

import pytest

NBSP = " "


@pytest.fixture()
def js():
    from tests.jsmod import run_js

    def call(body, **args):
        return run_js("prilohy.mjs", body, args=args)

    return call


def p(nazev, stitek="jine", velikost=1000, druh="jine", kdy="2026-11-12"):
    return {"nazev": nazev, "stitek": stitek, "velikost": velikost, "druh": druh, "kdy": kdy}


# --------------------------------------------------------------- STITKY

def test_stitky_jsou_v_dohodnutem_poradi(js):
    assert js("out(m.STITKY);") == [
        "smlouva", "zamereni", "navrh", "foto", "faktura", "atest", "jine",
    ]


# ------------------------------------------------------------ hadejStitek

@pytest.mark.parametrize(
    "nazev,cekam",
    [
        ("Smlouva-o-dilo.pdf", "smlouva"),
        ("objednavka-2026-0042.pdf", "smlouva"),
        ("zamereni-schodiste.pdf", "zamereni"),
        ("Zaměření schodiště.pdf", "zamereni"),
        ("mereni-rozmeru.xlsx", "zamereni"),
        ("navrh-zabradli-v2.pdf", "navrh"),
        ("Návrh zábradlí.pdf", "navrh"),
        ("vizualizace.png", "navrh"),
        ("nakres.dwg", "navrh"),
        ("vykres-kotveni.dxf", "navrh"),
        ("faktura-2026-0115.pdf", "faktura"),
        ("zalohova-faktura.pdf", "faktura"),
        ("atest-kaleneho-skla.pdf", "atest"),
        ("technicky-list.pdf", "atest"),
        ("prohlaseni-o-shode.pdf", "atest"),
        ("foto-po-montazi.jpg", "foto"),
        ("IMG_8841.HEIC", "foto"),
        ("DSC_0012.jpg", "foto"),
        ("snimek-obrazovky.png", "foto"),
        ("nejaky-soubor.png", "foto"),
        ("predavaci-protokol.pdf", "jine"),
        ("poznamky.txt", "jine"),
    ],
)
def test_stitek_se_hada_ze_jmena(js, nazev, cekam):
    assert js("out(m.hadejStitek(A.n));", n=nazev) == cekam


def test_prvni_pravidlo_vyhraje(js):
    # obsahuje zaměření i foto — zaměření je v pořadí dřív
    assert js("out(m.hadejStitek(A.n));", n="zamereni-foto.jpg") == "zamereni"
    # obsahuje smlouvu i fakturu — smlouva je dřív
    assert js("out(m.hadejStitek(A.n));", n="smlouva-a-faktura.pdf") == "smlouva"


def test_nesmyslny_vstup_je_jine(js):
    assert js("out(m.hadejStitek(null));") == "jine"
    assert js("out(m.hadejStitek(A.n));", n="") == "jine"


# ------------------------------------------------------------------ druh

@pytest.mark.parametrize(
    "nazev,cekam",
    [
        ("foto.JPG", "obrazek"),
        ("foto.jpeg", "obrazek"),
        ("snimek.png", "obrazek"),
        ("IMG.heic", "obrazek"),
        ("obrazek.webp", "obrazek"),
        ("animace.gif", "obrazek"),
        ("smlouva.pdf", "pdf"),
        ("smlouva.PDF", "pdf"),
        ("zapis.docx", "dokument"),
        ("zapis.doc", "dokument"),
        ("zapis.odt", "dokument"),
        ("poznamky.txt", "dokument"),
        ("rozmery.xlsx", "tabulka"),
        ("rozmery.csv", "tabulka"),
        ("vykres.dwg", "vykres"),
        ("vykres.dxf", "vykres"),
        ("logo.svg", "vykres"),
        ("archiv.zip", "jine"),
        ("soubor_bez_pripony", "jine"),
    ],
)
def test_druh_podle_pripony(js, nazev, cekam):
    assert js("out(m.druh(A.n));", n=nazev) == cekam


def test_rozhoduje_posledni_tecka(js):
    assert js("out(m.druh(A.n));", n="smlouva.v2.pdf") == "pdf"


# -------------------------------------------------------------- velikost

def test_bajty(js):
    assert js("out(m.velikost(820));") == f"820{NBSP}B"


def test_kilobajty(js):
    assert js("out(m.velikost(A.b));", b=1024 * 12) == f"12{NBSP}kB"


def test_kilobajty_se_zaokrouhli_na_cele(js):
    assert js("out(m.velikost(A.b));", b=1500) == f"1{NBSP}kB"


def test_megabajty_s_jednim_desetinnym(js):
    assert js("out(m.velikost(A.b));", b=int(1.25 * 1048576)) == f"1,3{NBSP}MB"


def test_hranice_kilobajtu(js):
    assert js("out(m.velikost(1023));") == f"1{NBSP}023{NBSP}B"
    assert js("out(m.velikost(1024));") == f"1{NBSP}kB"


def test_hranice_megabajtu(js):
    assert js("out(m.velikost(A.b));", b=1048576) == f"1,0{NBSP}MB"


def test_nesmysl_je_nula_bajtu(js):
    assert js("out(m.velikost(-5));") == f"0{NBSP}B"
    assert js("out(m.velikost(null));") == f"0{NBSP}B"
    assert js("out(m.velikost(A.b));", b="hodně") == f"0{NBSP}B"


# ---------------------------------------------------------------- prijmi

def test_prijata_priloha_dostane_stitek_druh_i_datum(js):
    v = js(
        "out(m.prijmi([], A.nove, { kdy: A.kdy }));",
        nove=[{"nazev": "Smlouva-o-dilo.pdf", "velikost": 240000}],
        kdy="2026-11-12",
    )
    assert v["odmitnute"] == []
    assert v["prijate"] == [{
        "nazev": "Smlouva-o-dilo.pdf",
        "velikost": 240000,
        "stitek": "smlouva",
        "druh": "pdf",
        "kdy": "2026-11-12",
    }]


def test_velky_soubor_se_odmitne(js):
    v = js(
        "out(m.prijmi([], A.nove, { maxBajtu: A.max }));",
        nove=[{"nazev": "video.mp4", "velikost": 40_000_000}],
        max=15_728_640,
    )
    assert v["prijate"] == []
    assert v["odmitnute"] == [{"nazev": "video.mp4", "duvod": "velky"}]


def test_vychozi_limit_je_patnact_megabajtu(js):
    v = js(
        "out(m.prijmi([], A.nove));",
        nove=[{"nazev": "a.pdf", "velikost": 15_728_640},
              {"nazev": "b.pdf", "velikost": 15_728_641}],
    )
    assert [x["nazev"] for x in v["prijate"]] == ["a.pdf"]
    assert v["odmitnute"] == [{"nazev": "b.pdf", "duvod": "velky"}]


def test_stejne_jmeno_podruhe_se_odmitne(js):
    v = js(
        "out(m.prijmi(A.stav, A.nove));",
        stav=[p("smlouva.pdf")],
        nove=[{"nazev": "SMLOUVA.PDF", "velikost": 100}],
    )
    assert v["prijate"] == []
    assert v["odmitnute"] == [{"nazev": "SMLOUVA.PDF", "duvod": "duplicitni"}]


def test_duplicita_i_mezi_prave_prijimanymi(js):
    v = js(
        "out(m.prijmi([], A.nove));",
        nove=[{"nazev": "a.pdf", "velikost": 10}, {"nazev": "a.pdf", "velikost": 20}],
    )
    assert len(v["prijate"]) == 1
    assert v["odmitnute"] == [{"nazev": "a.pdf", "duvod": "duplicitni"}]


def test_plno_se_pozna_i_z_uz_nahranych(js):
    v = js(
        "out(m.prijmi(A.stav, A.nove, { max: 3 }));",
        stav=[p("a.pdf"), p("b.pdf"), p("c.pdf")],
        nove=[{"nazev": "d.pdf", "velikost": 10}],
    )
    assert v["prijate"] == []
    assert v["odmitnute"] == [{"nazev": "d.pdf", "duvod": "plno"}]


def test_plno_prebije_ostatni_duvody(js):
    v = js(
        "out(m.prijmi(A.stav, A.nove, { max: 1 }));",
        stav=[p("a.pdf")],
        nove=[{"nazev": "a.pdf", "velikost": 99_000_000}],
    )
    assert v["odmitnute"] == [{"nazev": "a.pdf", "duvod": "plno"}]


def test_prijmi_nemeni_vstupni_pole(js):
    v = js(
        "const s = A.stav; m.prijmi(s, A.nove); out(s.length);",
        stav=[p("a.pdf")],
        nove=[{"nazev": "b.pdf", "velikost": 10}],
    )
    assert v == 1


def test_bez_data_je_kdy_prazdne(js):
    v = js("out(m.prijmi([], A.nove));", nove=[{"nazev": "a.pdf", "velikost": 10}])
    assert v["prijate"][0]["kdy"] == ""


# ----------------------------------------------------------------- pocty

def test_pocty_maji_klic_pro_kazdy_stitek(js):
    v = js("out(m.pocty(A.pr));", pr=[p("a.pdf", "smlouva"), p("b.pdf", "smlouva")])
    assert v["celkem"] == 2
    assert v["podleStitku"] == {
        "smlouva": 2, "zamereni": 0, "navrh": 0, "foto": 0,
        "faktura": 0, "atest": 0, "jine": 0,
    }


def test_neznamy_stitek_se_pocita_jen_do_celkem(js):
    v = js("out(m.pocty(A.pr));", pr=[p("a.pdf", "vymysl"), p("b.pdf", "foto")])
    assert v["celkem"] == 2
    assert v["podleStitku"]["foto"] == 1
    assert "vymysl" not in v["podleStitku"]


def test_prazdne_pole(js):
    v = js("out(m.pocty([]));")
    assert v["celkem"] == 0
    assert sum(v["podleStitku"].values()) == 0


# ----------------------------------------------------------------- serad

def test_radi_se_podle_poradi_stitku(js):
    v = js(
        "out(m.serad(A.pr).map((x) => x.nazev));",
        pr=[p("c.pdf", "jine"), p("a.pdf", "navrh"), p("b.pdf", "smlouva")],
    )
    assert v == ["b.pdf", "a.pdf", "c.pdf"]


def test_uvnitr_stitku_podle_jmena(js):
    v = js(
        "out(m.serad(A.pr).map((x) => x.nazev));",
        pr=[p("beta.pdf", "foto"), p("alfa.pdf", "foto"), p("Cesta.pdf", "foto")],
    )
    assert v == ["alfa.pdf", "beta.pdf", "Cesta.pdf"]


def test_neznamy_stitek_jde_nakonec(js):
    v = js(
        "out(m.serad(A.pr).map((x) => x.nazev));",
        pr=[p("x.pdf", "vymysl"), p("y.pdf", "jine"), p("z.pdf", "smlouva")],
    )
    assert v == ["z.pdf", "y.pdf", "x.pdf"]


def test_serad_nemeni_vstupni_pole(js):
    v = js(
        "const s = A.pr; m.serad(s); out(s.map((x) => x.nazev));",
        pr=[p("c.pdf", "jine"), p("a.pdf", "smlouva")],
    )
    assert v == ["c.pdf", "a.pdf"]


# ------------------------------------------------------------ zmenStitek

def test_zmena_stitku_vrati_nove_pole(js):
    v = js(
        "out(m.zmenStitek(A.pr, 1, 'faktura').map((x) => x.stitek));",
        pr=[p("a.pdf", "smlouva"), p("b.pdf", "jine")],
    )
    assert v == ["smlouva", "faktura"]


def test_zmena_stitku_nemeni_original(js):
    v = js(
        "const s = A.pr; m.zmenStitek(s, 0, 'foto'); out(s[0].stitek);",
        pr=[p("a.pdf", "smlouva")],
    )
    assert v == "smlouva"


def test_neznamy_stitek_je_chyba(js):
    v = js(
        "try { m.zmenStitek(A.pr, 0, 'vymysl'); out('bez chyby'); }"
        " catch (e) { out(e.message); }",
        pr=[p("a.pdf")],
    )
    assert "vymysl" in v


def test_index_mimo_rozsah_je_chyba(js):
    v = js(
        "try { m.zmenStitek(A.pr, 7, 'foto'); out('bez chyby'); }"
        " catch (e) { out(e.message); }",
        pr=[p("a.pdf")],
    )
    assert "7" in v


# ---------------------------------------------------------------- odeber

def test_odebrani_vrati_pole_bez_te_prilohy(js):
    v = js(
        "out(m.odeber(A.pr, 1).map((x) => x.nazev));",
        pr=[p("a.pdf"), p("b.pdf"), p("c.pdf")],
    )
    assert v == ["a.pdf", "c.pdf"]


def test_odebrani_nemeni_original(js):
    v = js("const s = A.pr; m.odeber(s, 0); out(s.length);", pr=[p("a.pdf"), p("b.pdf")])
    assert v == 2


def test_odebrani_mimo_rozsah_je_chyba(js):
    v = js(
        "try { m.odeber(A.pr, 5); out('bez chyby'); } catch (e) { out(e.message); }",
        pr=[p("a.pdf")],
    )
    assert "5" in v


def test_chybove_hlasky_jsou_cesky(js):
    for telo in (
        "try { m.odeber(A.pr, 9); } catch (e) { out(e.message); }",
        "try { m.zmenStitek(A.pr, 9, 'foto'); } catch (e) { out(e.message); }",
    ):
        zprava = js(telo, pr=[p("a.pdf")])
        assert any(z in zprava.lower() for z in ("příloh", "index", "štítek", "stitek"))
