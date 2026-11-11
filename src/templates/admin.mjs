/** Administrace webu — nástěnka, poptávky, texty, realizace, služby.
 *  To je první fáze: tohle je součástí zakázky na web.
 */

import { h, odkaz } from "../lib/cesty.mjs";
import { cislo, koruny, sMnoznym, datum, datumKratce, posunDnu, pred } from "../lib/cestina.mjs";
import { fotkaKarta } from "../lib/obrazky.mjs";
import { ikona, karta, odznak, poznamka, popis, tabulka, rozbal, prazdno } from "./admin-layout.mjs";

/* --------------------------------------------------------------- pomůcky */

const DRUHY_POPTAVEK = {
  "vnitrni-zabradli": "Vnitřní zábradlí",
  "venkovni-zabradli": "Venkovní zábradlí",
  "sprchove-kouty": "Sprchové kouty",
  "zasklivani-pergol": "Zasklívání pergol",
  "sklenene-pricky": "Skleněné příčky a dveře",
  zrcadla: "Zrcadla",
  obklady: "Obklady a lakobel",
  zasklivani: "Zasklívání",
  jine: "Jiné",
};

const STAVY_POPTAVEK = {
  nova: ["Nová", "zlata"],
  "v-jednani": ["V jednání", "modra"],
  nabidka: ["Odeslaná nabídka", "modra"],
  zakazka: ["Zakázka", "zelena"],
  hotovo: ["Hotovo", "zelena"],
  odmitnuta: ["Odmítnutá", ""],
};

export function stavPoptavky(stav) {
  const [nazev, barva] = STAVY_POPTAVEK[stav] ?? [stav, ""];
  return odznak(nazev, barva);
}

export function druhPoptavky(druh) {
  return DRUHY_POPTAVEK[druh] ?? druh;
}

/** Jméno klienta z kartotéky, nebo jen text z poptávky. */
export function jmenoKlienta(ctx, id, nahrada = "—") {
  const k = ctx.demo.klientiPodleId[id];
  return k ? k.jmeno : nahrada;
}

/** Sloupec s telefonem a e-mailem. */
function spojeni(p) {
  const radky = [];
  if (p.telefon) {
    radky.push(`<a href="tel:${h(p.telefon.replace(/\s/g, ""))}">${h(p.telefon)}</a>`);
  }
  if (p.email) radky.push(`<a href="mailto:${h(p.email)}">${h(p.email)}</a>`);
  return radky.join("<br>") || "—";
}

/* -------------------------------------------------------------- nástěnka */

function dlazdiceCisla(s) {
  const smer = s.zmena >= 0 ? "nahoru" : "dolu";
  const znak = s.zmena >= 0 ? "+" : "−";
  return `<article class="cislo">
  <p class="cislo__nazev">${h(s.nazev)}</p>
  <p class="cislo__hodnota">${cislo(s.hodnota)}<span class="zmena zmena--${smer}">`
    + ikona(s.zmena >= 0 ? "rust" : "pokles")
    + `${znak}${Math.abs(s.zmena)} %</span></p>
  <p class="cislo__popis">${h(s.popis)}</p>
</article>`;
}

/** i-tý den řady, která začíná dnem `od`. */
function denVRade(od, i) {
  return posunDnu(od, i);
}

function grafDni(statistiky) {
  const data = statistiky.denne;
  const max = Math.max(...data, 1);
  const sloupce = data.map((n, i) => {
    const den = denVRade(statistiky.od, i);
    return `<div class="graf__den" title="${h(datum(den))}: ${n} návštěv">`
      + `<div class="graf__sloupec" style="height:${Math.round((n / max) * 100)}%"></div></div>`;
  }).join("");

  return `<div class="graf" role="img" aria-label="Návštěvy po dnech za posledních 30 dní,`
    + ` nejvíc ${max} za den">${sloupce}</div>
<p class="graf__popis"><span>${h(datum(statistiky.od))}</span><span>dnes</span></p>`;
}

function pruhy(polozky, { jednotka = "", hrana = false } = {}) {
  const max = Math.max(...polozky.map(([, n]) => n), 1);
  return `<ul class="pruhy${hrana ? " pruhy--hrana" : ""}">`
    + polozky.map(([nazev, n]) => `<li><span>${h(nazev)}</span>`
      + `<b>${cislo(n)}${jednotka}</b>`
      + `<span class="pruhy__draha"><i style="width:${Math.round((n / max) * 100)}%"></i></span></li>`).join("")
    + `</ul>`;
}

export function nastenka(ctx) {
  const { demo, stranka } = ctx;
  const st = demo.statistiky;

  const dlazdice = `<div class="mriz mriz--4">${st.souhrn.map(dlazdiceCisla).join("")}</div>`;

  const nejnovejsi = demo.poptavky.slice(0, 5);
  const seznamPoptavek = tabulka({
    sevrena: true,
    sloupce: [{ nazev: "Kdo" }, { nazev: "Co" }, { nazev: "Kdy", trida: "uzke" }],
    radky: nejnovejsi.map((p) => ({
      bunky: [
        `<span class="tabulka__hlavni">${h(p.jmeno)}</span>`
        + `<span class="tabulka__pod">${h(p.mesto)}</span>`,
        `${h(druhPoptavky(p.druh))}`
        + (p.fotek ? `<span class="tabulka__pod">${sMnoznym(p.fotek, ["fotka", "fotky", "fotek"])}</span>` : ""),
        `${h(pred(p.prijato, ctx.dnes))}<br>${stavPoptavky(p.stav)}`,
      ],
    })),
  });

  const telo = dlazdice
    + `<div class="mriz mriz--sirsi-vlevo">`
    + karta({
      nadpis: "Návštěvy po dnech",
      vedle: `<span class="odznak odznak--bez odznak--modra">${h(st.obdobi)}</span>`,
      telo: grafDni(st) + `<div class="mriz mriz--2" style="margin-top:1.25rem">`
        + `<div><p class="ryska">Poptávky za poslední týden</p>`
        + pruhy(st.poptavkyDenne
          .map((n, i) => [datumKratce(denVRade(st.od, i)), n])
          .slice(-7), { hrana: true })
        + `</div>`
        + `<div><p class="ryska">Čím k nám přišli</p>${pruhy(st.zdroje, { jednotka: " %" })}</div>`
        + `</div>`,
    })
    + karta({
      nadpis: "Nejnovější poptávky",
      vedle: `<a class="tl tl--maly" href="${odkaz(stranka, "administrace/poptavky.html")}">Všechny</a>`,
      telo: seznamPoptavek,
      tesne: true,
      pata: `Dnes přišly ${sMnoznym(demo.poptavky.filter((p) => p.prijato === ctx.dnes).length,
        ["poptávka", "poptávky", "poptávek"])}.`,
    })
    + `</div>`
    + `<div class="mriz mriz--2">`
    + karta({
      nadpis: "Co lidé na webu čtou",
      telo: pruhy(st.strankyNejcastejsi),
      pata: "Pomůže poznat, co lidi zajímá — a čemu se na webu věnovat víc.",
    })
    + karta({
      nadpis: "Co hledali ve vyhledávači",
      telo: pruhy(st.dotazy, { hrana: true })
        + `<p class="ryska" style="margin-top:1.25rem">Z čeho se na web koukali</p>`
        + pruhy(st.zarizeni, { jednotka: " %" }),
      pata: "Většina lidí přijde z mobilu — proto je web navržený nejdřív pro mobil.",
    })
    + `</div>`
    + poznamka(h(st.poznamka));

  return {
    titulek: "Nástěnka",
    nadpis: "Nástěnka",
    ryska: `Dnes je ${datum(ctx.dnes)}`,
    perex: "Kolik lidí se na web podívalo, co je zajímalo a kolik z toho přišlo poptávek. "
      + "Nic se nikde nenastavuje, čísla si web natáhne sám.",
    cesta: [{ nazev: "Administrace", kam: "administrace/nastenka.html" }, { nazev: "Nástěnka" }],
    telo,
  };
}

/* -------------------------------------------------------------- poptávky */

function detailPoptavky(ctx, p) {
  const { stranka, fotky: soupis } = ctx;
  const kody = Object.keys(soupis);
  const zacatek = [...p.id].reduce((s, z) => s + z.charCodeAt(0), 0) % kody.length;

  const fotky = p.fotek
    ? `<p class="ryska" style="margin-top:1.25rem">Fotky od zákazníka (${p.fotek})</p>`
      + `<div class="fotky-mriz">`
      + Array.from({ length: p.fotek }, (_, i) =>
        `<div class="fotka-polozka">${fotkaKarta(stranka, kody[(zacatek + i) % kody.length],
          `Fotka od zákazníka ${i + 1}`, { lazy: true })}</div>`).join("")
      + `</div>`
    : "";

  const dalsi = p.klient
    ? `<a class="tl tl--maly" href="${odkaz(stranka, "administrace/crm/klienti.html")}#${h(p.klient)}">`
      + `Karta klienta</a>`
    : "";

  return popis([
    ["Zpráva", `<p>${h(p.zprava)}</p>`],
    ["Spojení", spojeni(p)],
    ["Místo", h(p.mesto)],
    ["Přišlo", `${h(datum(p.prijato))} · ${h(p.zdroj)}`],
    ...(p.klient ? [["V kartotéce", `${h(jmenoKlienta(ctx, p.klient))} <span class="odznak odznak--bez odznak--modra">${h(p.klient)}</span>`]] : []),
    ...(p.duvod ? [["Proč odmítnuto", h(p.duvod)]] : []),
  ])
    + fotky
    + `<div class="hlava-stranky__akce netisknout" style="margin-top:1.25rem">`
    + (p.email
      ? `<a class="tl tl--hlavni" href="mailto:${h(p.email)}?subject=${encodeURIComponent("Vaše poptávka — KORO-SKLO")}">`
        + `${ikona("obalka")} Odpovědět e-mailem</a>`
      : `<a class="tl tl--hlavni" href="tel:${h((p.telefon || "").replace(/\s/g, ""))}">${ikona("telefon")} Zavolat</a>`)
    + dalsi
    + `<a class="tl" href="${odkaz(stranka, "administrace/crm/nabidky.html")}">`
    + `${ikona("nabidky")} Udělat nabídku <span class="znacka-faze">2. fáze</span></a>`
    + `</div>`;
}

export function poptavky(ctx) {
  const { demo } = ctx;

  const filtry = `<div class="filtry netisknout">
  <label class="jen-pro-cteni" for="hledat">Hledat v poptávkách</label>
  <input type="search" id="hledat" placeholder="Hledat jméno, město, text…" data-hledat="#seznam-poptavek">
  <div class="volby" data-filtr="#seznam-poptavek">
    <button class="volba" type="button" data-hodnota="" aria-pressed="true">Všechny</button>
    <button class="volba" type="button" data-hodnota="nova" aria-pressed="false">Nové</button>
    <button class="volba" type="button" data-hodnota="v-jednani" aria-pressed="false">V jednání</button>
    <button class="volba" type="button" data-hodnota="nabidka" aria-pressed="false">S nabídkou</button>
    <button class="volba" type="button" data-hodnota="zakazka,hotovo" aria-pressed="false">Zakázky</button>
  </div>
</div>`;

  const radky = demo.poptavky.map((p) => {
    const hlavni = `<strong>${h(p.jmeno)}</strong>`
      + `<span class="tabulka__pod">${h(druhPoptavky(p.druh))} · ${h(p.mesto)}</span>`;
    const vedle = [
      p.fotek ? `<span class="pocet-fotek">${ikona("fotka")}${p.fotek}</span>` : "",
      `<span>${h(pred(p.prijato, ctx.dnes))}</span>`,
      stavPoptavky(p.stav),
    ].filter(Boolean).join("");

    return `<div data-stav="${h(p.stav)}" data-text="${h([p.jmeno, p.mesto, p.zprava, druhPoptavky(p.druh)].join(" ").toLowerCase())}">`
      + rozbal({ hlavni, vedle, telo: detailPoptavky(ctx, p) })
      + `</div>`;
  }).join("");

  const telo = filtry
    + karta({
      nadpis: `Poptávky (${demo.poptavky.length})`,
      vedle: `<span class="odznak odznak--zlata">${demo.pocty.novePoptavky} nových</span>`,
      telo: `<div id="seznam-poptavek">${radky}</div>`
        + `<div class="prazdno" data-prazdno hidden>${ikona("hledat")}`
        + `<strong>Nic se nenašlo</strong><p>Zkuste jiné slovo nebo jiný filtr.</p></div>`,
      tesne: true,
      pata: "Poptávka z webu přijde na e-mail a zároveň se objeví tady. Fotky od zákazníka "
        + "jsou u ní rovnou vidět, nikam se nemusí stahovat.",
    });

  return {
    titulek: "Poptávky",
    nadpis: "Poptávky",
    perex: "Všechno, co přišlo z webu, telefonem nebo e-mailem — na jednom místě a dohledatelné.",
    cesta: [{ nazev: "Administrace", kam: "administrace/nastenka.html" }, { nazev: "Poptávky" }],
    telo,
  };
}

/* ----------------------------------------------------------------- texty */

/** Co se dá na webu přepsat. Cesta je do data/texty.json. */
const TEXTY_SKUPINY = [
  {
    nazev: "Úvodní stránka",
    kam: "index.html",
    pole: [
      { cesta: "uvod.nadpis", nazev: "Hlavní nadpis", druh: "text" },
      { cesta: "uvod.perex", nazev: "Úvodní odstavec", druh: "textarea",
        napoveda: "První věty, které člověk na webu přečte. Krátce, bez marketingových frází." },
      { cesta: "uvod.fakta", nazev: "Tři čísla pod nadpisem", druh: "pole-dvojic" },
    ],
  },
  {
    nazev: "O nás",
    kam: "o-nas.html",
    pole: [
      { cesta: "oNas.nadpis", nazev: "Nadpis", druh: "text" },
      { cesta: "oNas.odstavce", nazev: "Odstavce", druh: "pole-textu",
        napoveda: "Tenhle text je převzatý z vašeho dnešního webu, slovo za slovem." },
    ],
  },
  {
    nazev: "Pro designéry a firmy",
    kam: "pro-designery.html",
    pole: [
      { cesta: "proDesignery.nadpis", nazev: "Nadpis", druh: "text" },
      { cesta: "proDesignery.perex", nazev: "Úvodní odstavec", druh: "textarea" },
      { cesta: "proDesignery.poznamka", nazev: "Poznámka na konci", druh: "textarea" },
    ],
  },
  {
    nazev: "Velkoobchod",
    kam: "velkoobchod.html",
    pole: [
      { cesta: "velkoobchod.nadpis", nazev: "Nadpis", druh: "text" },
      { cesta: "velkoobchod.perex", nazev: "Úvodní odstavec", druh: "textarea" },
      { cesta: "velkoobchod.poznamka", nazev: "Poznámka na konci", druh: "textarea" },
    ],
  },
  {
    nazev: "Kontakt a poptávka",
    kam: "kontakt.html",
    pole: [
      { cesta: "kontakt.nadpis", nazev: "Nadpis", druh: "text" },
      { cesta: "kontakt.perex", nazev: "Úvodní odstavec", druh: "textarea" },
      { cesta: "kontakt.napoveda", nazev: "Nápověda u formuláře", druh: "textarea",
        napoveda: "Co má zákazník napsat, aby se dala rovnou udělat nabídka." },
    ],
  },
];

function hodnotaTextu(texty, cesta) {
  return cesta.split(".").reduce((o, k) => (o == null ? o : o[k]), texty);
}

function poleTextu(texty, p) {
  const id = `t-${p.cesta.replace(/\./g, "-")}`;
  const v = hodnotaTextu(texty, p.cesta);
  const napoveda = p.napoveda ? `<p class="pole__napoveda">${h(p.napoveda)}</p>` : "";

  if (p.druh === "text") {
    return `<div class="pole"><label for="${id}">${h(p.nazev)}</label>${napoveda}`
      + `<input type="text" id="${id}" value="${h(v)}" data-text="${h(p.cesta)}"></div>`;
  }

  if (p.druh === "textarea") {
    const rady = Math.min(8, Math.max(3, Math.ceil(String(v).length / 85)));
    return `<div class="pole"><label for="${id}">${h(p.nazev)}</label>${napoveda}`
      + `<textarea id="${id}" rows="${rady}" data-text="${h(p.cesta)}">${h(v)}</textarea></div>`;
  }

  if (p.druh === "pole-textu") {
    const polozky = v.map((t, i) =>
      `<div class="pole"><label for="${id}-${i}">${i + 1}. odstavec</label>`
      + `<textarea id="${id}-${i}" rows="${Math.min(7, Math.max(3, Math.ceil(t.length / 85)))}"`
      + ` data-text="${h(p.cesta)}.${i}">${h(t)}</textarea></div>`).join("");
    return `<fieldset style="border:0;padding:0;margin:0 0 0.5rem">`
      + `<legend class="pole__nazev" style="padding:0">${h(p.nazev)}</legend>${napoveda}`
      + polozky + `</fieldset>`;
  }

  if (p.druh === "pole-dvojic") {
    const polozky = v.map((dvojice, i) => {
      const [cisloText, popisekText] = dvojice;
      return `<div class="radek-poli">`
        + `<div class="pole"><label for="${id}-${i}-a">Číslo</label>`
        + `<input type="text" id="${id}-${i}-a" value="${h(cisloText)}" data-text="${h(p.cesta)}.${i}.0"></div>`
        + `<div class="pole"><label for="${id}-${i}-b">Popisek</label>`
        + `<input type="text" id="${id}-${i}-b" value="${h(popisekText)}" data-text="${h(p.cesta)}.${i}.1"></div>`
        + `</div>`;
    }).join("");
    return `<fieldset style="border:0;padding:0;margin:0 0 0.5rem">`
      + `<legend class="pole__nazev" style="padding:0">${h(p.nazev)}</legend>${napoveda}`
      + polozky + `</fieldset>`;
  }

  throw new Error(`neznámý druh pole: ${p.druh}`);
}

export function texty(ctx) {
  const { texty: t, stranka } = ctx;

  const skupiny = TEXTY_SKUPINY.map((s) => karta({
    nadpis: s.nazev,
    vedle: `<a class="tl tl--maly" href="${odkaz(stranka, s.kam)}" target="_blank" rel="noopener">`
      + `${ikona("ven")} Zobrazit stránku</a>`,
    telo: s.pole.map((p) => poleTextu(t, p)).join(""),
    pata: `<button class="tl tl--hlavni tl--maly" type="button" data-uloz>${ikona("uloz")} Uložit změny</button>`
      + `<span>Změní se jen text, vzhled zůstane.</span>`,
  })).join("");

  return {
    titulek: "Texty na webu",
    nadpis: "Texty na webu",
    perex: "Přepíšete text, dáte uložit a na webu je to hned. Nic se nerozsype — "
      + "vzhled a rozvržení stránky se tím nemění.",
    cesta: [{ nazev: "Administrace", kam: "administrace/nastenka.html" }, { nazev: "Texty na webu" }],
    telo: poznamka("<strong>V ukázce se nic neukládá.</strong> Tlačítko <em>Uložit</em> jen ukáže, "
      + "jak se to bude chovat; po obnovení stránky je text zpátky jako dřív.")
      + skupiny,
  };
}

/* ------------------------------------------------------------- realizace */

function fotkyRealizace(ctx, r) {
  const { stranka } = ctx;
  const polozky = r.fotky.map((kod, i) => `<div class="fotka-polozka" data-fotka="${h(kod)}">`
    + `<span class="fotka-polozka__poradi">${i + 1}</span>`
    + fotkaKarta(stranka, kod, `${r.nazev} — fotka ${i + 1}`, { lazy: true })
    + `<div class="fotka-polozka__akce">`
    + `<button type="button" data-fotka-posun="-1" title="Posunout dřív" aria-label="Posunout dřív">↑</button>`
    + `<button type="button" data-fotka-posun="1" title="Posunout později" aria-label="Posunout později">↓</button>`
    + `<button type="button" data-fotka-skryj title="Skrýt z webu" aria-label="Skrýt z webu">Skrýt</button>`
    + `</div></div>`).join("");

  return `<div class="fotky-mriz" data-fotky>${polozky}`
    + `<button class="pridat-fotku" type="button" data-pridat-fotku>`
    + `${ikona("pridat")} Přidat fotku</button></div>`;
}

export function realizace(ctx) {
  const { realizace: seznam, stranka, sluzbyPodleId } = ctx;

  const radky = seznam.map((r) => {
    const sluzba = sluzbyPodleId[r.kategorie];
    const hlavni = `<strong>${h(r.nazev)}</strong>`
      + `<span class="tabulka__pod">${h(r.misto)} · ${h(r.rok)}`
      + (sluzba ? ` · ${h(sluzba.zkratka || sluzba.nazev)}` : "") + `</span>`;
    const vedle = `<span class="pocet-fotek">${ikona("fotka")}${r.fotky.length}</span>`
      + `<a class="tl tl--maly" href="${odkaz(stranka, `realizace/${r.id}.html`)}" target="_blank" rel="noopener">Na webu</a>`;

    const telo = `<div class="pole"><label for="n-${h(r.id)}">Název realizace</label>`
      + `<input type="text" id="n-${h(r.id)}" value="${h(r.nazev)}" data-text="realizace.${h(r.id)}.nazev"></div>`
      + `<div class="radek-poli">`
      + `<div class="pole"><label for="m-${h(r.id)}">Místo</label>`
      + `<input type="text" id="m-${h(r.id)}" value="${h(r.misto)}" data-text="realizace.${h(r.id)}.misto"></div>`
      + `<div class="pole"><label for="r-${h(r.id)}">Rok</label>`
      + `<input type="text" id="r-${h(r.id)}" value="${h(r.rok)}" data-text="realizace.${h(r.id)}.rok"></div>`
      + `</div>`
      + `<div class="pole"><label for="p-${h(r.id)}">Krátký popis</label>`
      + `<textarea id="p-${h(r.id)}" rows="3" data-text="realizace.${h(r.id)}.perex">${h(r.perex)}</textarea></div>`
      + `<p class="ryska">Fotky — přetahovat nemusíte, stačí šipky</p>`
      + fotkyRealizace(ctx, r)
      + `<div class="hlava-stranky__akce" style="margin-top:1.25rem">`
      + `<button class="tl tl--hlavni tl--maly" type="button" data-uloz>${ikona("uloz")} Uložit změny</button>`
      + `<button class="tl tl--maly" type="button" data-skryj>Skrýt celou realizaci z webu</button>`
      + `</div>`;

    return `<div data-text-filtr="${h([r.nazev, r.misto, r.rok].join(" ").toLowerCase())}">`
      + rozbal({ hlavni, vedle, telo })
      + `</div>`;
  }).join("");

  return {
    titulek: "Realizace a fotky",
    nadpis: "Realizace a fotky",
    perex: "Tady se vyměňují fotky hotových prací a upravují jejich popisky. "
      + "Nic se nedá smazat omylem — realizace se jen skryje a dá se vrátit.",
    cesta: [{ nazev: "Administrace", kam: "administrace/nastenka.html" }, { nazev: "Realizace a fotky" }],
    telo: poznamka("Fotky na webu jsou <strong>skutečné, z vaší dnešní galerie</strong>. "
      + "Názvy, místa, roky a technické parametry jsou v ukázce vymyšlené — budeme je u vás "
      + "doplňovat podle pravdy.")
      + `<div class="filtry netisknout">`
      + `<label class="jen-pro-cteni" for="hledat-r">Hledat realizaci</label>`
      + `<input type="search" id="hledat-r" placeholder="Hledat název nebo místo…" data-hledat="#seznam-realizaci">`
      + `<a class="tl tl--hlavni" href="#">${ikona("pridat")} Přidat realizaci</a>`
      + `</div>`
      + karta({
        nadpis: `Realizace (${seznam.length})`,
        telo: `<div id="seznam-realizaci">${radky}</div>`
          + `<div class="prazdno" data-prazdno hidden>${ikona("hledat")}<strong>Nic se nenašlo</strong></div>`,
        tesne: true,
      }),
  };
}

/* ----------------------------------------------------------------- služby */

export function sluzby(ctx) {
  const { sluzby: seznam, stranka } = ctx;

  const radky = seznam.map((s, i) => {
    const hlavni = `<strong>${h(s.nazev)}</strong>`
      + `<span class="tabulka__pod">${h(s.vetev === "firmy" ? "Pro firmy" : "Na míru")}`
      + ` · ${s.fotky.length ? sMnoznym(s.fotky.length, ["fotka", "fotky", "fotek"]) : "bez fotek"}</span>`;
    const vedle = `<span class="odznak odznak--bez">${i + 1}. v pořadí</span>`
      + `<a class="tl tl--maly" href="${odkaz(stranka, `sluzby/${s.id}.html`)}" target="_blank" rel="noopener">Na webu</a>`;

    const telo = `<div class="pole"><label for="sn-${h(s.id)}">Název</label>`
      + `<input type="text" id="sn-${h(s.id)}" value="${h(s.nazev)}" data-text="sluzby.${h(s.id)}.nazev"></div>`
      + `<div class="pole"><label for="sp-${h(s.id)}">Krátký popis (v přehledu služeb)</label>`
      + `<textarea id="sp-${h(s.id)}" rows="3" data-text="sluzby.${h(s.id)}.perex">${h(s.perex)}</textarea></div>`
      + s.odstavce.map((o, j) => `<div class="pole"><label for="so-${h(s.id)}-${j}">`
        + `${j + 1}. odstavec na stránce služby</label>`
        + `<textarea id="so-${h(s.id)}-${j}" rows="${Math.min(6, Math.max(3, Math.ceil(o.length / 85)))}"`
        + ` data-text="sluzby.${h(s.id)}.odstavce.${j}">${h(o)}</textarea></div>`).join("")
      + `<div class="hlava-stranky__akce" style="margin-top:0.5rem">`
      + `<button class="tl tl--hlavni tl--maly" type="button" data-uloz>${ikona("uloz")} Uložit změny</button>`
      + `<button class="tl tl--maly" type="button" data-posun="-1">${ikona("nahoru")} Posunout výš</button>`
      + `<button class="tl tl--maly" type="button" data-posun="1">${ikona("dolu")} Posunout níž</button>`
      + `</div>`;

    return rozbal({ hlavni, vedle, telo });
  }).join("");

  return {
    titulek: "Služby",
    nadpis: "Služby",
    perex: "Jedenáct služeb, které máte na webu. Pořadí se dá měnit — nahoře má být to, "
      + "co chcete prodávat nejvíc.",
    cesta: [{ nazev: "Administrace", kam: "administrace/nastenka.html" }, { nazev: "Služby" }],
    telo: poznamka("Texty služeb jsou <strong>doslova z vašeho dnešního webu</strong>. "
      + "Nic jsme nevymýšleli, jen přerovnali.")
      + karta({ nadpis: `Služby (${seznam.length})`, telo: radky, tesne: true }),
  };
}

/* ------------------------------------------------------------- přihlášení */

export function prihlaseni(ctx) {
  const { site, stranka, fotky } = ctx;
  const z = odkaz(stranka, "");
  const kod = "09";
  const soupis = fotky[kod] ?? {};

  return `<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Přihlášení | Administrace ${h(site.znacka)}</title>
<link rel="icon" href="${z}assets/img/favicon.png" type="image/png">
<link rel="preload" href="${z}assets/fonts/Inter-400-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${z}assets/admin.css">
</head>
<body>
<div class="prihlaseni">
  <div class="prihlaseni__obraz">
    <img src="${z}assets/img/foto/${h(kod)}-1200.webp" alt=""
      ${soupis.sirka ? `width="1200" height="${Math.round(1200 * (soupis.vyska / soupis.sirka))}"` : ""}>
    <div class="prihlaseni__slovo">
      <h2>Jedna adresa, dvě přihlášení</h2>
      <p>Web i administrace běží na stejném hostingu. Až budete chtít přidat nabídky,
         sklad a faktury, nic se nepřeklápí — jen se k tomu přihlásíte.</p>
    </div>
  </div>
  <div class="prihlaseni__formular">
    <div>
      <p class="prihlaseni__znacka">
        <img src="${z}assets/img/znacka.webp" width="303" height="337" alt="">
        <span><strong>${h(site.znacka)}</strong><small>administrace</small></span>
      </p>
      <h1>Přihlášení</h1>
      <p class="uvodem">Do administrace se dostanete jen vy a kdo dostane přístup od vás.</p>
      <form action="nastenka.html" method="get">
        <div class="pole">
          <label for="jmeno">E-mail</label>
          <input type="email" id="jmeno" name="jmeno" value="info@korosklo.cz" autocomplete="username">
        </div>
        <div class="pole">
          <label for="heslo">Heslo</label>
          <input type="password" id="heslo" name="heslo" value="ukazka" autocomplete="current-password">
        </div>
        <button class="tl tl--hlavni" type="submit">Přihlásit se</button>
      </form>
      <p class="prihlaseni__napoveda"><strong>Ukázka.</strong> Přihlašovat se nemusíte —
        stačí kliknout na <em>Přihlásit se</em>. Žádné heslo se nikam neposílá.</p>
      <p class="prihlaseni__pata"><a href="${z}index.html">← Zpět na web</a></p>
    </div>
  </div>
</div>
</body>
</html>
`;
}
