"""Akceptační test C-005 — src/lib/zakazky.mjs (zakázky: postup, stavy, filtr)."""
from __future__ import annotations

import pytest


@pytest.fixture()
def js():
    from tests.jsmod import run_js

    def call(body, **args):
        return run_js("zakazky.mjs", body, args=args)

    return call


def z(**zmeny):
    """Vzorová zakázka; `zmeny` přepíšou jednotlivá pole."""
    zakazka = {
        "id": "Z-2026-0031",
        "nabidka": "2026-0042",
        "klient": "K-0042",
        "nazev": "Zábradlí k dřevěnému schodišti",
        "stav": "montaz",
        "zahajeno": "2026-11-03",
        "terminMontaze": "2026-11-13",
        "kroky": [
            ["Zaměření", "2026-11-02", True],
            ["Objednávka skla", "2026-11-03", True],
            ["Výroba a broušení", "2026-11-08", True],
            ["Montáž", "2026-11-13", False],
            ["Předání a fakturace", "2026-11-14", False],
        ],
        "poznamka": "Sklo dorazilo z kalírny 6. 11.",
    }
    zakazka.update(zmeny)
    return zakazka


# --------------------------------------------------------------- STAVY


def test_stavy_jsou_v_poradi_od_pripravy_po_hotovo(js):
    assert js("out(m.STAVY)") == ["priprava", "vyroba", "montaz", "hotovo"]


# --------------------------------------------------------------- postup


def test_postup_spocita_hotove_kroky(js):
    v = js("out(m.postup(A.z))", z=z())
    assert v["hotovych"] == 3
    assert v["celkem"] == 5
    assert v["zbyva"] == 2


def test_postup_vrati_procenta_zaokrouhlena(js):
    assert js("out(m.postup(A.z).procento)", z=z()) == 60


def test_postup_ukaze_dalsi_krok(js):
    assert js("out(m.postup(A.z).dalsi)", z=z()) == ["Montáž", "2026-11-13", False]


def test_postup_hotove_zakazky_nema_dalsi_krok(js):
    hotova = z(stav="hotovo", kroky=[["Zaměření", "2026-10-01", True]])
    v = js("out(m.postup(A.z))", z=hotova)
    assert v["dalsi"] is None
    assert v["procento"] == 100


def test_postup_bez_kroku_nespadne(js):
    v = js("out(m.postup(A.z))", z=z(kroky=[]))
    assert (v["hotovych"], v["celkem"], v["procento"], v["dalsi"]) == (0, 0, 0, None)


# ------------------------------------------------------------ další stav


@pytest.mark.parametrize(
    "stav,ocekavano",
    [("priprava", "vyroba"), ("vyroba", "montaz"), ("montaz", "hotovo"), ("hotovo", None)],
)
def test_dalsi_stav_posouva_po_pipeline(js, stav, ocekavano):
    assert js("out(m.dalsiStav(A.stav))", stav=stav) == ocekavano


def test_dalsi_stav_neznamy_hodi_chybu(js):
    with pytest.raises(AssertionError) as chyba:
        js("out(m.dalsiStav(A.stav))", stav="archiv")
    assert "archiv" in str(chyba.value)


def test_je_v_behu(js):
    assert js("out(m.jeVBehu(A.z))", z=z()) is True
    assert js("out(m.jeVBehu(A.z))", z=z(stav="hotovo")) is False


# ----------------------------------------------------------------- počty


def test_pocty_secte_stavy(js):
    zakazky = [z(stav="priprava"), z(stav="vyroba"), z(stav="montaz"), z(stav="hotovo"),
               z(stav="hotovo")]
    v = js("out(m.pocty(A.zakazky))", zakazky=zakazky)
    assert v["celkem"] == 5
    assert v["vBehu"] == 3
    assert v["hotove"] == 2
    assert v["podleStavu"] == {"priprava": 1, "vyroba": 1, "montaz": 1, "hotovo": 2}


def test_pocty_prazdneho_seznamu_jsou_nuly(js):
    v = js("out(m.pocty(A.zakazky))", zakazky=[])
    assert v["celkem"] == 0 and v["vBehu"] == 0 and v["hotove"] == 0
    assert v["podleStavu"] == {"priprava": 0, "vyroba": 0, "montaz": 0, "hotovo": 0}


# ----------------------------------------------------------------- filtr


def test_filtr_bez_omezeni_vrati_vsechno(js):
    zakazky = [z(id="A"), z(id="B", stav="hotovo")]
    assert js("out(m.filtruj(A.zakazky).map((x) => x.id))", zakazky=zakazky) == ["A", "B"]


def test_filtr_podle_stavu(js):
    zakazky = [z(id="A", stav="vyroba"), z(id="B", stav="hotovo"), z(id="C", stav="montaz")]
    v = js("out(m.filtruj(A.zakazky, { stavy: A.stavy }).map((x) => x.id))",
           zakazky=zakazky, stavy=["vyroba", "montaz"])
    assert v == ["A", "C"]


def test_filtr_hleda_v_cisle_nazvu_i_poznamce(js):
    zakazky = [
        z(id="Z-1", nazev="Sprchový kout", poznamka="", nabidka="2026-0001"),
        z(id="Z-2", nazev="Zábradlí", poznamka="čeká se na kalírnu", nabidka="2026-0002"),
    ]
    hledej = "out(m.filtruj(A.zakazky, { hledane: A.q }).map((x) => x.id))"
    assert js(hledej, zakazky=zakazky, q="sprchový") == ["Z-1"]
    assert js(hledej, zakazky=zakazky, q="kalírnu") == ["Z-2"]
    assert js(hledej, zakazky=zakazky, q="2026-0002") == ["Z-2"]
    assert js(hledej, zakazky=zakazky, q="Z-1") == ["Z-1"]


def test_filtr_nehledi_na_diakritiku_ani_velka_pismena(js):
    zakazky = [z(id="Z-1", nazev="Zábradlí k schodišti")]
    hledej = "out(m.filtruj(A.zakazky, { hledane: A.q }).map((x) => x.id))"
    assert js(hledej, zakazky=zakazky, q="ZABRADLI") == ["Z-1"]
    assert js(hledej, zakazky=zakazky, q="zábradlí") == ["Z-1"]


def test_filtr_samych_mezer_neomezuje(js):
    zakazky = [z(id="Z-1"), z(id="Z-2")]
    assert js("out(m.filtruj(A.zakazky, { hledane: '   ' }).map((x) => x.id))",
              zakazky=zakazky) == ["Z-1", "Z-2"]


def test_filtr_spoji_stav_a_hledani(js):
    zakazky = [z(id="A", stav="vyroba", nazev="Sprchový kout"),
               z(id="B", stav="hotovo", nazev="Sprchový kout")]
    v = js("out(m.filtruj(A.zakazky, { stavy: ['vyroba'], hledane: 'sprchový' }).map((x) => x.id))",
           zakazky=zakazky)
    assert v == ["A"]


def test_filtr_nemeni_vstupni_pole(js):
    zakazky = [z(id="A", stav="vyroba"), z(id="B", stav="hotovo")]
    v = js("const p = A.zakazky; m.filtruj(p, { stavy: ['vyroba'] }); out(p.map((x) => x.id));",
           zakazky=zakazky)
    assert v == ["A", "B"]


# ---------------------------------------------------------------- řazení


def test_serad_da_bezici_dopredu_podle_montaze(js):
    zakazky = [
        z(id="hotova", stav="hotovo", terminMontaze="2026-11-01"),
        z(id="pozdni", stav="vyroba", terminMontaze="2026-11-20"),
        z(id="blizka", stav="montaz", terminMontaze="2026-11-13"),
    ]
    v = js("out(m.serad(A.zakazky, '2026-11-11').map((x) => x.id))", zakazky=zakazky)
    assert v == ["blizka", "pozdni", "hotova"]


def test_serad_hotove_od_nejnovejsi(js):
    zakazky = [
        z(id="stara", stav="hotovo", terminMontaze="2026-09-01"),
        z(id="nova", stav="hotovo", terminMontaze="2026-10-28"),
    ]
    v = js("out(m.serad(A.zakazky, '2026-11-11').map((x) => x.id))", zakazky=zakazky)
    assert v == ["nova", "stara"]


def test_serad_vrati_nove_pole(js):
    zakazky = [z(id="A", terminMontaze="2026-12-01"), z(id="B", terminMontaze="2026-11-01")]
    v = js("const p = A.zakazky; const s = m.serad(p, '2026-11-11');"
           "out({ vstup: p.map((x) => x.id), vysledek: s.map((x) => x.id) });", zakazky=zakazky)
    assert v["vstup"] == ["A", "B"]
    assert v["vysledek"] == ["B", "A"]


# ------------------------------------------------------------ změna stavu


def test_zmen_stav_vrati_kopii_a_vstup_nechá_být(js):
    v = js("const p = A.z; const n = m.zmenStav(p, 'hotovo');"
           "out({ puvodni: p.stav, novy: n.stav, jine: p !== n });", z=z())
    assert v == {"puvodni": "montaz", "novy": "hotovo", "jine": True}


def test_zmen_stav_na_hotovo_odskrtne_vsechny_kroky(js):
    v = js("out(m.zmenStav(A.z, 'hotovo').kroky.map((k) => k[2]))", z=z())
    assert v == [True] * 5


def test_zmen_stav_na_hotovo_nezmeni_kroky_vstupu(js):
    v = js("const p = A.z; m.zmenStav(p, 'hotovo'); out(p.kroky.map((k) => k[2]));", z=z())
    assert v == [True, True, True, False, False]


def test_zmen_stav_dozadu_kroky_nemeni(js):
    v = js("out(m.zmenStav(A.z, 'vyroba').kroky.map((k) => k[2]))", z=z())
    assert v == [True, True, True, False, False]


def test_zmen_stav_na_neznamy_hodi_chybu(js):
    with pytest.raises(AssertionError) as chyba:
        js("out(m.zmenStav(A.z, 'zruseno'))", z=z())
    assert "zruseno" in str(chyba.value)


# -------------------------------------------------------------- krok


def test_oznac_krok_zaskrtne_a_vrati_kopii(js):
    v = js("const p = A.z; const n = m.oznacKrok(p, 3, true);"
           "out({ novy: n.kroky[3][2], puvodni: p.kroky[3][2] });", z=z())
    assert v == {"novy": True, "puvodni": False}


def test_oznac_krok_umi_i_odskrtnout(js):
    assert js("out(m.oznacKrok(A.z, 0, false).kroky[0][2])", z=z()) is False


def test_oznac_krok_mimo_rozsah_hodi_chybu(js):
    with pytest.raises(AssertionError):
        js("out(m.oznacKrok(A.z, 9, true))", z=z())


def test_oznac_krok_nechá_ostatni_kroky_stejne(js):
    v = js("out(m.oznacKrok(A.z, 3, true).kroky.map((k) => k[2]))", z=z())
    assert v == [True, True, True, True, False]
