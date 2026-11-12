"""Akceptační test C-008 — src/lib/platba.mjs (IBAN, vystavení, zaplacení, export)."""
from __future__ import annotations

import pytest

CRLF = "\r\n"
HLAVICKA = (
    "Číslo;Variabilní symbol;Klient;Popis;Vystaveno;Splatnost;Zaplaceno;Stav;Celkem"
)


@pytest.fixture()
def js():
    from tests.jsmod import run_js

    def call(body, **args):
        return run_js("platba.mjs", body, args=args)

    return call


def f(
    cislo="2026-0115",
    stav="vystavena",
    vystaveno="2026-11-01",
    splatnost="2026-11-15",
    celkem=1000,
    **navic,
):
    z = {
        "cislo": cislo,
        "klient": "K-0042",
        "popis": "Zábradlí",
        "vystaveno": vystaveno,
        "splatnost": splatnost,
        "stav": stav,
        "celkem": celkem,
    }
    z.update(navic)
    return z


# ------------------------------------------------------------------- iban


@pytest.mark.parametrize(
    "ucet,cekam",
    [
        ("19-123457/0100", "CZ5601000000190000123457"),
        ("123456789/0800", "CZ7508000000000123456789"),
        ("1234567890/5500", "CZ7155000000001234567890"),
        ("0-1/0710", "CZ5307100000000000000001"),
    ],
)
def test_iban_pocita_kontrolni_cislice(js, ucet, cekam):
    assert js("out(m.iban(A.u));", u=ucet) == cekam


def test_iban_ma_vzdy_24_znaku(js):
    delky = js(
        "out(A.u.map((x) => m.iban(x).length));",
        u=["19-123457/0100", "123456789/0800", "0-1/0710", "1/0300", "7-7/0600"],
    )
    assert delky == [24, 24, 24, 24, 24]


def test_iban_zacina_cz(js):
    assert js("out(m.iban(A.u).slice(0, 2));", u="19-123457/0100") == "CZ"


def test_iban_s_mezerami_je_po_ctvericich(js):
    assert (
        js("out(m.iban(A.u, { mezery: true }));", u="19-123457/0100")
        == "CZ56 0100 0000 1900 0012 3457"
    )


def test_iban_s_mezerami_ma_sest_ctveric(js):
    casti = js("out(m.iban(A.u, { mezery: true }).split(' '));", u="123456789/0800")
    assert len(casti) == 6
    assert all(len(c) == 4 for c in casti)


def test_iban_bez_mezer_je_vychozi(js):
    assert js("out(m.iban(A.u) === m.iban(A.u, {}));", u="19-123457/0100") is True


@pytest.mark.parametrize(
    "ucet",
    [
        "123456789",  # chybí kód banky
        "123456789/",  # prázdný kód banky
        "/0800",  # prázdné číslo účtu
        "12345678901/0800",  # číslo účtu je delší než 10 číslic
        "1234567-1/0800",  # předčíslí je delší než 6 číslic
        "19-123457/01000",  # kód banky je delší než 4 číslice
        "abc/0800",  # nečíselné znaky
        "19-12x457/0100",
        "",
    ],
)
def test_iban_nesmyslny_vstup_je_prazdny(js, ucet):
    assert js("out(m.iban(A.u));", u=ucet) == ""


@pytest.mark.parametrize("hodnota", [None, 123, True, [], {}])
def test_iban_mimo_retezec_je_prazdny(js, hodnota):
    assert js("out(m.iban(A.u));", u=hodnota) == ""


# ------------------------------------------------------------------ vystav


def test_vystav_nastavi_stav_datum_a_splatnost(js):
    v = js(
        "out(m.vystav(A.f, { kdy: '2026-11-12' }));",
        f=f(cislo="2026-0116", stav="navrh", vystaveno="", splatnost=""),
    )
    assert v["stav"] == "vystavena"
    assert v["vystaveno"] == "2026-11-12"
    assert v["splatnost"] == "2026-11-26"


def test_vystav_umi_jinou_splatnost(js):
    v = js(
        "out(m.vystav(A.f, { kdy: '2026-11-12', splatnostDnu: 30 }));",
        f=f(stav="navrh"),
    )
    assert v["splatnost"] == "2026-12-12"


def test_vystav_splatnost_pres_konec_mesice(js):
    v = js("out(m.vystav(A.f, { kdy: '2026-12-28' }));", f=f(stav="navrh"))
    assert v["splatnost"] == "2027-01-11"


def test_vystav_nemeni_puvodni_objekt(js):
    stav = js(
        "const p = A.f; m.vystav(p, { kdy: '2026-11-12' }); out([p.stav, p.vystaveno]);",
        f=f(stav="navrh", vystaveno=""),
    )
    assert stav == ["navrh", ""]


def test_vystav_zachova_ostatni_pole(js):
    v = js(
        "out(m.vystav(A.f, { kdy: '2026-11-12' }));",
        f=f(stav="navrh", celkem=68850, zNabidky="2026-0042"),
    )
    assert v["cislo"] == "2026-0115"
    assert v["celkem"] == 68850
    assert v["zNabidky"] == "2026-0042"
    assert v["popis"] == "Zábradlí"


@pytest.mark.parametrize("stav", ["vystavena", "zaplacena", "", "neco"])
def test_vystav_jen_z_navrhu(js, stav):
    chyba = js(
        "try { m.vystav(A.f, { kdy: '2026-11-12' }); out(null); }"
        " catch (e) { out(e.message); }",
        f=f(stav=stav),
    )
    assert isinstance(chyba, str) and chyba
    assert stav in chyba


@pytest.mark.parametrize("kdy", [None, "", "12.11.2026", "2026-11", "2026-13-01x"])
def test_vystav_chce_iso_datum(js, kdy):
    chyba = js(
        "try { m.vystav(A.f, { kdy: A.kdy }); out(null); } catch (e) { out(e.message); }",
        f=f(stav="navrh"),
        kdy=kdy,
    )
    assert isinstance(chyba, str) and chyba


# --------------------------------------------------------- oznacZaplacenou


def test_oznac_zaplacenou_nastavi_stav_a_datum(js):
    v = js("out(m.oznacZaplacenou(A.f, '2026-11-12'));", f=f())
    assert v["stav"] == "zaplacena"
    assert v["zaplaceno"] == "2026-11-12"


def test_oznac_zaplacenou_nemeni_puvodni(js):
    stav = js(
        "const p = A.f; m.oznacZaplacenou(p, '2026-11-12');"
        " out([p.stav, p.zaplaceno ?? null]);",
        f=f(),
    )
    assert stav == ["vystavena", None]


def test_oznac_zaplacenou_zachova_ostatni_pole(js):
    v = js("out(m.oznacZaplacenou(A.f, '2026-11-12'));", f=f(celkem=25620))
    assert v["celkem"] == 25620
    assert v["splatnost"] == "2026-11-15"


def test_oznac_zaplacenou_navrh_rekne_vystavit(js):
    chyba = js(
        "try { m.oznacZaplacenou(A.f, '2026-11-12'); out(null); }"
        " catch (e) { out(e.message); }",
        f=f(stav="navrh"),
    )
    assert isinstance(chyba, str)
    assert "vystavit" in chyba.lower()


def test_oznac_zaplacenou_dvakrat_nejde(js):
    chyba = js(
        "try { m.oznacZaplacenou(A.f, '2026-11-12'); out(null); }"
        " catch (e) { out(e.message); }",
        f=f(stav="zaplacena", zaplaceno="2026-11-10"),
    )
    assert isinstance(chyba, str) and chyba


@pytest.mark.parametrize("kdy", [None, "", "12.11.2026", 20261112])
def test_oznac_zaplacenou_chce_iso_datum(js, kdy):
    chyba = js(
        "try { m.oznacZaplacenou(A.f, A.kdy); out(null); } catch (e) { out(e.message); }",
        f=f(),
        kdy=kdy,
    )
    assert isinstance(chyba, str) and chyba


# ----------------------------------------------------------------- SLOUPCE


def test_sloupce_jsou_v_dohodnutem_poradi(js):
    assert js("out(m.SLOUPCE);") == [
        "Číslo",
        "Variabilní symbol",
        "Klient",
        "Popis",
        "Vystaveno",
        "Splatnost",
        "Zaplaceno",
        "Stav",
        "Celkem",
    ]


# ------------------------------------------------------------ csvProUcetni


def test_csv_zacina_hlavickou(js):
    text = js("out(m.csvProUcetni([]));")
    assert text == HLAVICKA


def test_csv_bez_faktur_je_jen_hlavicka(js):
    for arg in (None, "ne", 5, {}):
        assert js("out(m.csvProUcetni(A.x));", x=arg) == HLAVICKA


def test_csv_radek_ma_ceska_data_a_desetinnou_carku(js):
    text = js(
        "out(m.csvProUcetni([A.f], { klienti: { 'K-0042': 'Jan Novák' } }));",
        f=f(
            cislo="2026-0115",
            vystaveno="2026-11-01",
            splatnost="2026-11-15",
            celkem=68850,
        ),
    )
    radky = text.split(CRLF)
    assert len(radky) == 2
    assert radky[1] == (
        "2026-0115;20260115;Jan Novák;Zábradlí;1.11.2026;15.11.2026;;Vystavena;68850"
    )


def test_csv_haleres_ma_carku(js):
    text = js("out(m.csvProUcetni([A.f]));", f=f(celkem=1234.5))
    assert text.split(CRLF)[1].endswith(";1234,5")


def test_csv_nema_oddelovac_tisicu(js):
    text = js("out(m.csvProUcetni([A.f]));", f=f(celkem=1234567))
    assert ";1234567" in text
    assert "1 234 567" not in text
    assert "1234 567" not in text


def test_csv_konci_bez_prazdneho_radku(js):
    text = js("out(m.csvProUcetni([A.f, A.f]));", f=f())
    assert not text.endswith(CRLF)
    assert len(text.split(CRLF)) == 3


def test_csv_oddeluje_radky_crlf(js):
    text = js("out(m.csvProUcetni([A.f]));", f=f())
    assert CRLF in text
    assert text.count("\n") == text.count(CRLF)


@pytest.mark.parametrize(
    "stav,cekam",
    [
        ("navrh", "Návrh"),
        ("vystavena", "Vystavena"),
        ("zaplacena", "Zaplacena"),
        ("neco-jineho", "neco-jineho"),
    ],
)
def test_csv_stav_je_lidsky(js, stav, cekam):
    text = js("out(m.csvProUcetni([A.f]));", f=f(stav=stav, zaplaceno="2026-11-09"))
    assert f";{cekam};" in text


def test_csv_zaplaceno_je_datum(js):
    text = js(
        "out(m.csvProUcetni([A.f]));",
        f=f(stav="zaplacena", zaplaceno="2026-10-09"),
    )
    assert ";9.10.2026;Zaplacena;" in text


def test_csv_chybejici_datum_je_prazdne(js):
    text = js(
        "out(m.csvProUcetni([A.f]));",
        f=f(cislo="2026-0116", stav="navrh", vystaveno="", splatnost=""),
    )
    assert text.split(CRLF)[1].startswith("2026-0116;20260116;;Zábradlí;;;;Návrh;")


def test_csv_neznamy_klient_projde_jak_je(js):
    text = js(
        "out(m.csvProUcetni([A.f], { klienti: { 'K-0001': 'Někdo' } }));",
        f=f(),
    )
    assert ";K-0042;" in text


def test_csv_bez_mapy_klientu(js):
    text = js("out(m.csvProUcetni([A.f]));", f=f())
    assert ";K-0042;" in text


def test_csv_chybejici_klient_je_prazdny(js):
    radek = js(
        "out(m.csvProUcetni([A.f]).split('\\r\\n')[1]);",
        f={"cislo": "2026-0120", "popis": "Nic", "stav": "navrh"},
    )
    assert radek.startswith("2026-0120;20260120;;Nic;")


def test_csv_obali_pole_se_strednikem(js):
    text = js(
        "out(m.csvProUcetni([A.f]));",
        f=f(popis="Zrcadla; lakobel"),
    )
    assert '"Zrcadla; lakobel"' in text


def test_csv_zdvoji_uvozovku(js):
    text = js("out(m.csvProUcetni([A.f]));", f=f(popis='Sklo 6 mm "čiré"'))
    assert '"Sklo 6 mm ""čiré"""' in text


def test_csv_obali_pole_s_novou_radkou(js):
    text = js("out(m.csvProUcetni([A.f]));", f=f(popis="První\nDruhý"))
    assert '"První\nDruhý"' in text


def test_csv_bezne_pole_se_neobaluje(js):
    text = js("out(m.csvProUcetni([A.f]));", f=f(popis="Posuvné dveře"))
    assert ";Posuvné dveře;" in text
    assert '"Posuvné dveře"' not in text


def test_csv_variabilni_symbol_je_bez_pomlcky(js):
    text = js("out(m.csvProUcetni([A.f]));", f=f(cislo="2026-0115"))
    assert ";20260115;" in text


def test_csv_ma_devet_poli_na_radek(js):
    pocty = js(
        "out(m.csvProUcetni(A.fs).split('\\r\\n').map((r) => r.split(';').length));",
        fs=[f(), f(cislo="2026-0114", stav="zaplacena", zaplaceno="2026-11-02")],
    )
    assert pocty == [9, 9, 9]


def test_csv_drzi_poradi_faktur(js):
    text = js(
        "out(m.csvProUcetni(A.fs));",
        fs=[f(cislo="2026-0115"), f(cislo="2026-0110"), f(cislo="2026-0112")],
    )
    radky = text.split(CRLF)[1:]
    assert [r.split(";")[0] for r in radky] == ["2026-0115", "2026-0110", "2026-0112"]


def test_csv_nemeni_vstup(js):
    stejne = js(
        "const p = JSON.stringify(A.fs); m.csvProUcetni(A.fs);"
        " out(JSON.stringify(A.fs) === p);",
        fs=[f(), f(cislo="2026-0114")],
    )
    assert stejne is True


# -------------------------------------------------------------- nazevSouboru


def test_nazev_souboru_z_data(js):
    assert js("out(m.nazevSouboru('2026-11-12'));") == "faktury-2026-11-12.csv"


@pytest.mark.parametrize("kdy", [None, "", "12.11.2026", 5, "2026-11"])
def test_nazev_souboru_bez_data(js, kdy):
    assert js("out(m.nazevSouboru(A.kdy));", kdy=kdy) == "faktury.csv"


# ------------------------------------------------------------------ hygiena


def test_modul_nesaha_na_node_ani_dom():
    from pathlib import Path

    kod = Path("src/lib/platba.mjs").read_text(encoding="utf8")
    for zakazane in ("require(", "process.", "document", "window", "fetch(", "Buffer"):
        assert zakazane not in kod, f"modul používá {zakazane}"


def test_modul_importuje_jen_cestinu():
    import re
    from pathlib import Path

    kod = Path("src/lib/platba.mjs").read_text(encoding="utf8")
    zdroje = re.findall(r"""^import[^;]*?from\s+["']([^"']+)["']""", kod, re.M)
    assert zdroje and set(zdroje) <= {"./cestina.mjs"}, zdroje
