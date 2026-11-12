"""Akceptační test C-009 — src/lib/fakturace.mjs (faktura ze zakázky)."""
from __future__ import annotations

import pytest


@pytest.fixture()
def js():
    from tests.jsmod import run_js

    def call(body, **args):
        return run_js("fakturace.mjs", body, args=args)

    return call


def zakazka(**zmeny):
    z = {
        "id": "Z-2026-0031",
        "nabidka": "2026-0042",
        "klient": "K-0042",
        "nazev": "Zábradlí k dřevěnému schodišti",
        "stav": "hotovo",
    }
    z.update(zmeny)
    return z


def nabidka(**zmeny):
    n = {
        "cislo": "2026-0042",
        "klient": "K-0042",
        "platceDph": True,
        "zaokrouhlit": True,
        "polozky": [
            {"nazev": "Kalené sklo", "mnozstvi": 10.4, "jednotka": "m²", "cena": 3180, "dph": 21},
            {"nazev": "Montáž", "mnozstvi": 14, "jednotka": "h", "cena": 650, "dph": 21},
        ],
    }
    n.update(zmeny)
    return n


FAKTURY = [
    {"cislo": "2026-0115", "zNabidky": "2026-0042", "stav": "navrh"},
    {"cislo": "2026-0114", "zNabidky": "2026-0036", "stav": "vystavena"},
    {"cislo": "2026-0108", "zNabidky": None, "stav": "zaplacena"},
]


# ------------------------------------------------------------- dalsiCislo


@pytest.mark.parametrize(
    "faktury,rok,cekano",
    [
        ([{"cislo": "2026-0115"}, {"cislo": "2026-0108"}], 2026, "2026-0116"),
        ([], "2026", "2026-0001"),
        ([{"cislo": "2025-0999"}], 2026, "2026-0001"),
        ([{"cislo": "2026-0009"}], 2026, "2026-0010"),
        ([{"cislo": "2026-0001"}], "2026", "2026-0002"),
        ([{"cislo": "2026-9998"}], 2026, "2026-9999"),
    ],
)
def test_dalsi_cislo(js, faktury, rok, cekano):
    assert js("out(m.dalsiCislo(A.f, A.r));", f=faktury, r=rok) == cekano


def test_dalsi_cislo_bere_nejvetsi_ne_posledni(js):
    faktury = [{"cislo": "2026-0115"}, {"cislo": "2026-0003"}, {"cislo": "2026-0042"}]
    assert js("out(m.dalsiCislo(A.f, 2026));", f=faktury) == "2026-0116"


def test_dalsi_cislo_preskoci_jiny_tvar(js):
    faktury = [{"cislo": "FA/2026/7"}, {"cislo": "2026-12"}, {}, {"cislo": "2026-0007"}]
    assert js("out(m.dalsiCislo(A.f, 2026));", f=faktury) == "2026-0008"


@pytest.mark.parametrize("rok", [26, "abc", None, 1999, 3000, "202", "20266", ""])
def test_dalsi_cislo_neplatny_rok(js, rok):
    assert js("out(m.dalsiCislo([], A.r));", r=rok) == ""


@pytest.mark.parametrize("faktury", [None, "ne", 7, {}])
def test_dalsi_cislo_nepole(js, faktury):
    assert js("out(m.dalsiCislo(A.f, 2026));", f=faktury) == "2026-0001"


def test_dalsi_cislo_nemeni_vstup(js):
    stejne = js(
        "const f = A.f; m.dalsiCislo(f, 2026); out(JSON.stringify(f));",
        f=[{"cislo": "2026-0115"}],
    )
    assert stejne == '[{"cislo":"2026-0115"}]'


# -------------------------------------------------------- fakturaZakazky


def test_faktura_zakazky_najde_podle_nabidky(js):
    f = js("out(m.fakturaZakazky(A.z, A.f));", z=zakazka(), f=FAKTURY)
    assert f["cislo"] == "2026-0115"


def test_faktura_zakazky_vrati_tentyz_objekt(js):
    stejny = js(
        "out(m.fakturaZakazky(A.z, A.f) === A.f[0]);", z=zakazka(), f=FAKTURY
    )
    assert stejny is True


def test_faktura_zakazky_bez_shody(js):
    f = js("out(m.fakturaZakazky(A.z, A.f));", z=zakazka(nabidka="2026-0041"), f=FAKTURY)
    assert f is None


@pytest.mark.parametrize("z", [None, {}, {"nabidka": ""}, {"nabidka": None}])
def test_faktura_zakazky_bez_nabidky(js, z):
    assert js("out(m.fakturaZakazky(A.z, A.f));", z=z, f=FAKTURY) is None


@pytest.mark.parametrize("f", [None, "ne", 7, {}])
def test_faktura_zakazky_nepole(js, f):
    assert js("out(m.fakturaZakazky(A.z, A.f));", z=zakazka(), f=f) is None


# ---------------------------------------------------------- lzeFakturovat


def test_lze_fakturovat_hotovou(js):
    v = js("out(m.lzeFakturovat(A.z, A.f));", z=zakazka(nabidka="2026-0041"), f=FAKTURY)
    assert v["muze"] is True
    assert v["duvod"] == ""
    assert v["varovani"] == ""


@pytest.mark.parametrize("stav", ["priprava", "vyroba", "montaz"])
def test_lze_fakturovat_nehotovou_varuje(js, stav):
    v = js(
        "out(m.lzeFakturovat(A.z, A.f));",
        z=zakazka(nabidka="2026-0041", stav=stav),
        f=FAKTURY,
    )
    assert v["muze"] is True
    assert v["duvod"] == ""
    assert "hotová" in v["varovani"]


def test_lze_fakturovat_uz_ma_fakturu(js):
    v = js("out(m.lzeFakturovat(A.z, A.f));", z=zakazka(), f=FAKTURY)
    assert v["muze"] is False
    assert "2026-0115" in v["duvod"]
    assert v["varovani"] == ""


@pytest.mark.parametrize("z", [None, {}, {"stav": "hotovo"}, {"nabidka": ""}])
def test_lze_fakturovat_bez_nabidky(js, z):
    v = js("out(m.lzeFakturovat(A.z, A.f));", z=z, f=FAKTURY)
    assert v["muze"] is False
    assert "nabídky" in v["duvod"]
    assert v["varovani"] == ""


def test_lze_fakturovat_bez_faktur(js):
    v = js("out(m.lzeFakturovat(A.z, []));", z=zakazka())
    assert v["muze"] is True


# -------------------------------------------------------------- zeZakazky


def novy(js, **volby):
    args = {"z": volby.pop("z", zakazka(nabidka="2026-0041")),
            "v": {"nabidka": volby.pop("nabidka", nabidka(cislo="2026-0041")),
                  "faktury": volby.pop("faktury", FAKTURY),
                  "rok": volby.pop("rok", 2026)}}
    return js("out(m.zeZakazky(A.z, A.v));", **args)


def test_ze_zakazky_zaklad(js):
    f = novy(js)
    assert f["cislo"] == "2026-0116"
    assert f["zNabidky"] == "2026-0041"
    assert f["klient"] == "K-0042"
    assert f["popis"] == "Zábradlí k dřevěnému schodišti"
    assert f["stav"] == "navrh"


def test_ze_zakazky_je_bez_datumu(js):
    f = novy(js)
    assert f["vystaveno"] == ""
    assert f["splatnost"] == ""
    assert f["zaplaceno"] == ""


def test_ze_zakazky_polozky_z_nabidky(js):
    f = novy(js)
    assert len(f["polozky"]) == 2
    assert f["polozky"][0]["nazev"] == "Kalené sklo"
    assert f["polozky"][1]["cena"] == 650


def test_ze_zakazky_celkem_z_polozek(js):
    # 10,4 × 3180 = 33 072; 14 × 650 = 9100; bez DPH 42 172; s 21 % 51 028,12 -> 51 028
    f = novy(js)
    assert f["celkem"] == 51028


def test_ze_zakazky_neplatce_dph(js):
    f = novy(js, nabidka=nabidka(cislo="2026-0041", platceDph=False))
    assert f["platceDph"] is False
    assert f["celkem"] == 42172


def test_ze_zakazky_bez_zaokrouhleni(js):
    f = novy(js, nabidka=nabidka(cislo="2026-0041", zaokrouhlit=False))
    assert f["zaokrouhlit"] is False
    assert f["celkem"] == pytest.approx(51028.12)


def test_ze_zakazky_chybejici_priznaky_jsou_pravda(js):
    n = nabidka(cislo="2026-0041")
    del n["platceDph"]
    del n["zaokrouhlit"]
    f = novy(js, nabidka=n)
    assert f["platceDph"] is True
    assert f["zaokrouhlit"] is True


def test_ze_zakazky_bez_polozek(js):
    n = nabidka(cislo="2026-0041")
    del n["polozky"]
    f = novy(js, nabidka=n)
    assert f["polozky"] == []
    assert f["celkem"] == 0


def test_ze_zakazky_klient_z_nabidky_kdyz_chybi(js):
    z = zakazka(nabidka="2026-0041")
    del z["klient"]
    f = novy(js, z=z)
    assert f["klient"] == "K-0042"


def test_ze_zakazky_klient_prazdny_kdyz_neni_nikde(js):
    z = zakazka(nabidka="2026-0041")
    del z["klient"]
    n = nabidka(cislo="2026-0041")
    del n["klient"]
    f = novy(js, z=z, nabidka=n)
    assert f["klient"] == ""


def test_ze_zakazky_pole_presne(js):
    f = novy(js)
    assert sorted(f) == sorted([
        "cislo", "zNabidky", "klient", "popis", "polozky", "platceDph",
        "zaokrouhlit", "celkem", "vystaveno", "splatnost", "zaplaceno", "stav",
    ])


def test_ze_zakazky_nemeni_vstupy(js):
    pred = js(
        "const z = A.z, v = A.v; m.zeZakazky(z, v);"
        " out([JSON.stringify(z), JSON.stringify(v.nabidka), v.faktury.length]);",
        z=zakazka(nabidka="2026-0041"),
        v={"nabidka": nabidka(cislo="2026-0041"), "faktury": FAKTURY, "rok": 2026},
    )
    assert "2026-0031" in pred[0]
    assert "Kalené sklo" in pred[1]
    assert pred[2] == 3


def test_ze_zakazky_polozky_jsou_hluboka_kopie(js):
    v_nabidce = js(
        "const v = A.v; const f = m.zeZakazky(A.z, v);"
        " f.polozky[0].cena = 1; out(v.nabidka.polozky[0].cena);",
        z=zakazka(nabidka="2026-0041"),
        v={"nabidka": nabidka(cislo="2026-0041"), "faktury": FAKTURY, "rok": 2026},
    )
    assert v_nabidce == 3180


def test_ze_zakazky_nehotova_zakazka_projde(js):
    f = novy(js, z=zakazka(nabidka="2026-0041", stav="vyroba"))
    assert f["cislo"] == "2026-0116"


def test_ze_zakazky_bez_faktur_zacina_od_jedne(js):
    f = novy(js, faktury=[])
    assert f["cislo"] == "2026-0001"


# ------------------------------------------------- zeZakazky: co vyhodí


def chyba(js, **volby):
    return js(
        "try { m.zeZakazky(A.z, A.v); out(null); } catch (e) { out(String(e.message)); }",
        z=volby.pop("z", zakazka(nabidka="2026-0041")),
        v={"nabidka": volby.pop("nabidka", nabidka(cislo="2026-0041")),
           "faktury": volby.pop("faktury", FAKTURY),
           "rok": volby.pop("rok", 2026)},
    )


def test_ze_zakazky_uz_fakturovana_vyhodi(js):
    zprava = chyba(js, z=zakazka(), nabidka=nabidka())
    assert zprava is not None
    assert "2026-0115" in zprava


def test_ze_zakazky_bez_nabidky_vyhodi(js):
    zprava = chyba(js, z=zakazka(nabidka=""))
    assert zprava is not None
    assert "nabídk" in zprava


def test_ze_zakazky_jina_nabidka_vyhodi(js):
    zprava = chyba(js, nabidka=nabidka(cislo="2026-0042"))
    assert zprava is not None
    assert "nabídk" in zprava


def test_ze_zakazky_chybejici_nabidka_vyhodi(js):
    zprava = chyba(js, nabidka=None)
    assert zprava is not None
    assert "nabídk" in zprava


@pytest.mark.parametrize("rok", [26, "abc", None, 1999])
def test_ze_zakazky_neplatny_rok_vyhodi(js, rok):
    zprava = chyba(js, rok=rok)
    assert zprava is not None
    assert "rok" in zprava.lower()


# ------------------------------------------------------------- hygiena


def test_modul_je_cisty():
    from pathlib import Path

    zdroj = (Path(__file__).resolve().parents[1] / "src" / "lib" / "fakturace.mjs")
    assert zdroj.exists(), "modul src/lib/fakturace.mjs chybí"
    obsah = zdroj.read_text(encoding="utf8")
    for zakazane in ("require(", "process.", "document", "window", "fetch(", "Buffer"):
        assert zakazane not in obsah, f"modul sahá na {zakazane}"


def test_modul_importuje_jen_nabidku():
    import re
    from pathlib import Path

    zdroj = (Path(__file__).resolve().parents[1] / "src" / "lib" / "fakturace.mjs")
    importy = set(re.findall(r'from\s+"([^"]+)"', zdroj.read_text(encoding="utf8")))
    assert importy <= {"./nabidka.mjs"}, f"modul importuje i {sorted(importy)}"
