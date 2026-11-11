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
