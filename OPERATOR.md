# OPERATOR — korosklo

## Co a proč
Klikatelna ukazka noveho webu KORO-SKLO s.r.o. (Plzen) vcetne administrace obsahu a ukazky CRM: poptavky, cenove nabidky, zakazky, sklad, faktury.

## Kde jsme
Viz STATE.md (generuje harness). Poslední shrnutí operátora: —

## Rozhodnutí
- 2026-11-11: projekt založen.
- 2026-11-11: dělba práce. Factory dostala čistou logiku (C-001 čeština,
  C-002 nabídky, C-003 sklad, C-004 faktury), Claude napsal data ukázky
  a šablony administrace. Všechny čtyři kontrakty zelené, 53 testů.
- 2026-11-11: administrace je světlá, veřejný web zůstává tmavý; sdílejí
  názvy tokenů, aby to byl jeden systém. Zlatá na světlém jen jako plocha
  s tmavým textem, nikdy jako text (`--zlata-tmavá` pro výjimky).
- 2026-11-11: `src/lib/nabidka.mjs` a `cestina.mjs` se kopírují do
  `out/web/assets/lib/` a administrace je importuje v prohlížeči. Živý
  přepočet nabídky tak nemůže utéct od sestavení — je to stejný kód.
- 2026-11-11: data ukázky (poptávky, klienti, nabídky, zakázky, sklad,
  faktury, statistiky) jsou vymyšlená a postavená ke dni 11. 11. 2026.
  Co je skutečné a co ne, je v `data/demo/CO-JE-VYMYSLENE.md`; ten
  dokument jde klientce spolu s ukázkou.
- 2026-11-11: CRM je v ukázce označené jako druhá fáze a samostatná
  zakázka — v panelu, na každé stránce CRM i v nabídce z poptávky.
- 2026-11-11: během běhu Factory se v repozitáři nesáhlo na nic. Šablony
  vznikly ve scratchpadu nad zkušební kopií s dočasnou náhradou za
  `faktura.mjs`; po doběhnutí se zkopírovaly a sestavení vyšlo byte po
  bytu stejně jako se skutečným modulem od Factory.
- 2026-11-11: předávka `data/demo/CO-JE-VYMYSLENE.md` má bránu
  (`tests/test_predavka.py`, 28 testů). Čísla v ní se porovnávají s daty,
  slib „nic se neukládá“ s kódem (žádné localStorage, fetch, cookie),
  den ukázky s `DNES` v `build.mjs` a vynechaný konfigurátor a chatbot
  s šablonami. Ověřeno i naopak: přepsané číslo v dokumentu bránu zčervená.
- 2026-11-11: ukázka je veřejně na GitHub Pages
  (https://chaospalda42.github.io/korosklo-navrh/), repozitář
  ChaosPalda42/korosklo-navrh. Nasazuje ji workflow, které nejdřív sestaví
  web a pustí testy a brány — červené sestavení se nenasadí. `robots.txt`
  zakazuje indexování. Před prvním pushem proběhla kontrola na osobní data
  nad 249 soubory (jen čísla a cesty na obrazovku): žádný cizí e-mail,
  telefon jen zástupný z nápovědy, z přepisu schůzky se v repu neobjevuje
  nic než „Google Analytics“.

## Pravidla projektu
- Stack: python
- Testy: `uv run pytest -q`
- Nic nad rámec harnessu; obecná pravidla jsou v ~/factory/docs.

## Jak spustit
- `factory run` — spustí běh (kontrakty → workeři → brány → checkpointy)
- `factory status` — stav, otevřené balíčky
- `factory packets` — balíčky čekající na rozhodnutí; `factory answer <id> …`

## 2026-11-11 — zakázky: stavy, úprava, mazání a filtr

Po prokliknutí ukázky přišlo zadání: *„Jak můžu měnit stavy zakázky? Upravit jí
případně smazat? … filtrovat podle stavu … za pár let tam bude překážet
hromada hotových zakázek."*

Rozhodnuto a uděláno:
- Logika zakázek patří do knihovny, ne do stránky — kontrakt **C-005**
  (`src/lib/zakazky.mjs`): postup prací, `dalsiStav`, `pocty`, `filtruj`
  (bez diakritiky), `serad` (běžící dopředu podle nejbližší montáže, hotové
  dozadu), `zmenStav`, `oznacKrok`. Zelený na 4 iterace, 32 testů v bráně.
- Termín v budoucnosti vypisoval datum dvakrát, protože `pred()` z cestina.mjs
  umí jen minulost. Místo záplaty kontrakt **C-006** (`src/lib/kdy.mjs`):
  slovní odstup oběma směry. Zelený na 3 iterace.
- Výchozí filtr je **V běhu**, aby hotové zakázky nepřekážely; volby nesou
  počty a jdou kdykoli přepnout na *Hotové* / *Všechny*. Totéž počítá stránka
  i prohlížeč ze stejné knihovny — `src/lib` se kopíruje do
  `out/web/assets/lib/`, takže se filtr po kliknutí přepočítá stejně.
- Mazání se ptá a hláska říká, že v ostré verzi jde zakázka do archivu.
  V ukázce se nic neukládá; předávka `data/demo/CO-JE-VYMYSLENE.md` to teď
  říká i o zakázkách a hlídá to `tests/test_predavka.py`.

Práce běžela ve zkušební kopii ve scratchpadu, protože na projektu jel
`factory run`; do repozitáře šla až po zeleném běhu, bez obou ručních
náhražek knihoven.

## 2026-11-12 — přílohy u zakázek se štítky

Zadání: k zakázce se musí dát nahrát soubory a každý nese štítek, aby bylo
na první pohled vidět, co v příloze je.

- Logika je kontrakt **C-007** `src/lib/prilohy.mjs` (sedm štítků, odhad
  štítku ze jména souboru bez diakritiky, druh podle přípony, lidská
  velikost, limity 20 souborů / 15 MB, řazení a počty). Factory zelená
  na třetí iteraci, 226 testů.
- Administrace jen volá ten modul — prohlížeč si ho bere z
  `assets/lib/prilohy.mjs`, takže web i administrace počítají totéž.
- Řádek zakázky má sponu s počtem, souhrn po štítcích, seznam příloh
  s volbou štítku (přebarvená podle štítku) a plochu na přetažení souborů.
- V ukázce se nic nenahrává: hlášky říkají, co by se stalo. Hlídá to
  `tests/test_predavka.py`, kde je nově i počet příloh proti
  `data/demo/zakazky.json`.

## 2026-11-12 — faktury: doklad, vystavení, zaplacení, export

Zadání: ukázka faktur. Druhá polovina zadání z 12. 11.

- Logika je kontrakt **C-008** `src/lib/platba.mjs`: IBAN z českého čísla
  účtu (kontrolní číslice mod 97 po blocích), `vystav` (stav, datum,
  splatnost přes `posunDnu`), `oznacZaplacenou` a CSV pro účetní
  (středníky, CRLF, datum `d.m.yyyy`, desetinná čárka bez tisíců).
  Factory zelená na čtvrté iteraci, 306 testů.
- Každá z osmi faktur má **svůj doklad k tisku** `faktura-<číslo>.html`
  s dodavatelem, odběratelem, položkami, rozpisem DPH a platebními údaji
  včetně IBAN. Čísla na dokladu počítá `souhrn` z `nabidka.mjs` — ten samý
  kód jako u nabídek.
- Faktury dostaly položky (`data/demo/faktury.json`), takže částka už není
  ručně napsané číslo: `tests/test_predavka.py` ji přepočítává z položek.
- Seznam umí **vystavit návrh** a **označit zaplacenou**; dlaždice
  (po splatnosti / vystavené / zaplacené) se přepočítají na místě přes
  `prehled` z `faktura.mjs`.
- **Export pro účetní** složí CSV v prohlížeči a nabídne ho ke stažení
  (`faktury-RRRR-MM-DD.csv`, BOM kvůli Excelu). Nic se nikam neposílá.
- Číslo účtu v `data/demo/platba.json` je zástupné; předávka to říká
  a brána hlídá, že se to číslo v předávce opravdu objeví.
- Při kontrole proti skutečnému modulu se našla **chyba v mém akceptačním
  testu**: u návrhu jsem v očekávaném řádku CSV nechal prázdné pole Klient,
  takže modul klienta u návrhů zahazoval. Test je opravený a přibyl k němu
  druhý, který tvrdí, že stav na jméno klienta nesmí sahat. Modul to opraví
  Factory dalším během C-008.
- Opravená i stará chyba v `crm.mjs`: hlavička dodavatele brala
  `site.ulice/psc/mesto/ico`, které v `site.json` nejsou, takže na nabídce
  byla prázdná adresa a „IČ “. Teď to sází jeden společný `znackaDodavatele`.
- Návrh 2026-0115 nemá datum vystavení ani splatnost (v seznamu i na dokladu
  je pomlčka) — jinak by řádek tvrdil „vystaveno 10. 11.“ a zároveň nabízel
  tlačítko *Vystavit*. Datum dosadí až vystavení. V historii klienta se
  nevystavená faktura neukazuje.

## 2026-11-12 — fakturu lze vystavit přímo ze zakázky

Zadání: *„Já bych chtěl mít možnost vytvořit tu fakturu přímo ze zakázky.."*

- Logika je kontrakt **C-009** `src/lib/fakturace.mjs`: `dalsiCislo` (další
  volné číslo v roce ve tvaru RRRR-NNNN), `fakturaZakazky` (která faktura už
  ze zakázky vznikla), `lzeFakturovat` (důvod, proč ne, a varování u nehotové
  zakázky) a `zeZakazky` (návrh faktury — klient, popis a hluboká kopie
  položek z nabídky, celkem přes `souhrn`). Factory zelená na pátou iteraci,
  377 testů.
- Řádek zakázky má v přehledu nové pole **Faktura**: číslo s odznakem stavu
  a prokliknutím na doklad, nebo pomlčku. Dokud faktura není, je v akcích
  tlačítko *Vystavit fakturu*; u nehotové zakázky se nejdřív zeptá
  („obvykle se fakturuje až po předání“) a jde to potvrdit.
- Prohlížeč bere `zeZakazky` z `assets/lib/fakturace.mjs`, takže částka na
  nové faktuře vyjde stejně jako na dokladu ze sestavení. Ověřeno na
  Z-2026-0030: nová faktura 2026-0116 na 114 363 Kč = `souhrn` nabídky
  2026-0041.
- Číslo se nepřidělí dvakrát: `dalsiCislo` kouká na čísla faktur, která
  stránka nese v `faktury-json`. Brána navíc hlídá, že žádné dvě faktury
  nevznikly z jedné nabídky a že každá zakázka míří na existující nabídku.
- Ukázka nic neukládá — předávka to říká i o faktuře udělané ze zakázky.
