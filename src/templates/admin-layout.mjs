/** Kostra administrace: levý panel, lišta, obal stránky.
 *
 *  Administrace je světlá (v tabulkách se čte celý den), web tmavý.
 *  Všechno je statické HTML a nic se neukládá: změny žijí jen v DOM
 *  a při obnovení stránky jsou pryč. Hlídá to tests/test_predavka.py.
 */

import { h, odkaz, koren } from "../lib/cesty.mjs";

/* ------------------------------------------------------------------ ikony */

const TAHY = {
  nastenka: '<path d="M4 13a8 8 0 0 1 16 0"/><path d="M12 13l4-3.5"/><circle cx="12" cy="13" r="1.4"/><path d="M4 13v3h16v-3"/>',
  poptavky: '<path d="M3 7.5 12 13l9-5.5"/><rect x="3" y="5" width="18" height="14" rx="2"/>',
  texty: '<path d="M4 6h16M4 11h16M4 16h9"/>',
  realizace: '<rect x="3" y="4.5" width="18" height="15" rx="2"/><circle cx="8.5" cy="10" r="1.6"/><path d="m3.5 17 5-4.5 4 3.5 3-2.5 5 4"/>',
  sluzby: '<path d="m12 3 8 4.5-8 4.5-8-4.5Z"/><path d="m4 12 8 4.5 8-4.5"/><path d="m4 16.5 8 4.5 8-4.5"/>',
  prehled: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
  nabidky: '<path d="M6 2.75h8L18.5 7v14.25H6Z"/><path d="M13.75 3v4.25H18"/><path d="M9 12.5h6M9 16h4"/>',
  zakazky: '<path d="m14.5 6.5 3-3 3 3-3 3z"/><path d="m16 8-9.5 9.5"/><path d="M3.5 20.5 7 17l-1.5-1.5L2 19z"/><path d="M9 5.5 5.5 2 2 5.5 5.5 9l1.75-1.75"/>',
  klienti: '<circle cx="9" cy="8" r="3.25"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16 5.5a3.25 3.25 0 0 1 0 6.3"/><path d="M17.5 14.5a5.5 5.5 0 0 1 3 5"/>',
  sklad: '<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>',
  faktury: '<path d="M5 3.5h14v17l-2.3-1.6-2.35 1.6-2.35-1.6L9.65 20.5 7.3 18.9 5 20.5z"/><path d="M8.5 8h7M8.5 12h7M8.5 15.5h4"/>',

  fajfka: '<path d="m4.5 12.5 4.5 4.5 10-10.5"/>',
  sipka: '<path d="m9 5 7 7-7 7"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  ven: '<path d="M14 4.5h5.5V10"/><path d="M19 5 11 13"/><path d="M18 14.5v4a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6h4"/>',
  odhlasit: '<path d="M9.5 4.5H6A1.5 1.5 0 0 0 4.5 6v12A1.5 1.5 0 0 0 6 19.5h3.5"/><path d="M15 8.5 18.5 12 15 15.5"/><path d="M18 12H9"/>',
  tisk: '<path d="M7 8.5V3.5h10v5"/><rect x="3.5" y="8.5" width="17" height="7.5" rx="1.5"/><path d="M7 14h10v6.5H7z"/>',
  pridat: '<path d="M12 5.5v13M5.5 12h13"/>',
  koš: '<path d="M4.5 7h15"/><path d="M9.5 7V4.5h5V7"/><path d="M6.5 7v12.5A1.5 1.5 0 0 0 8 21h8a1.5 1.5 0 0 0 1.5-1.5V7"/><path d="M10 11v6M14 11v6"/>',
  nahoru: '<path d="m6 14 6-6 6 6"/>',
  dolu: '<path d="m6 10 6 6 6-6"/>',
  hledat: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 4.5 4.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.75" r="0.9" fill="currentColor" stroke="none"/>',
  pozor: '<path d="M12 3.5 21 19.5H3Z"/><path d="M12 9.5v4.5"/><circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none"/>',
  hodiny: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3.25 2"/>',
  telefon: '<path d="M6.5 3.5h3l1.5 4-2 1.5a10.5 10.5 0 0 0 6 6L16.5 13l4 1.5v3a2.5 2.5 0 0 1-2.75 2.5A16 16 0 0 1 3.5 6.25 2.5 2.5 0 0 1 6 3.5Z"/>',
  obalka: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7.5 8.5 5.5 8.5-5.5"/>',
  fotka: '<rect x="3" y="4.5" width="18" height="15" rx="2"/><circle cx="8.5" cy="10" r="1.6"/><path d="m3.5 17 5-4.5 4 3.5 3-2.5 5 4"/>',
  rust: '<path d="m4 16 5-5 3.5 3L20 7"/><path d="M15.5 7H20v4.5"/>',
  pokles: '<path d="m4 8 5 5 3.5-3L20 17"/><path d="M15.5 17H20v-4.5"/>',
  uloz: '<path d="M5.5 3.5h10L20 8v12.5H5.5z"/><path d="M8.5 3.5v5h7v-5"/><path d="M8.5 20.5v-6h7v6"/>',
  prazdne: '<path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5z"/><path d="M4 8.5 12 13l8-4.5"/>',
};

/** Vrátí inline SVG ikonu. */
export function ikona(jmeno, trida = "") {
  const tahy = TAHY[jmeno];
  if (!tahy) throw new Error(`neznámá ikona: ${jmeno}`);
  return `<svg${trida ? ` class="${trida}"` : ""} width="20" height="20" viewBox="0 0 24 24" fill="none"`
    + ` stroke="currentColor" stroke-width="1.5" stroke-linecap="round"`
    + ` stroke-linejoin="round" aria-hidden="true">${tahy}</svg>`;
}

/* -------------------------------------------------------------------- menu */

/** Levý panel. `pocet` je klíč do ctx.pocty, ne pevné číslo. */
export const NAVIGACE = [
  {
    ryska: "Web",
    odkazy: [
      { kam: "administrace/nastenka.html", nazev: "Nástěnka", ikona: "nastenka" },
      { kam: "administrace/poptavky.html", nazev: "Poptávky", ikona: "poptavky", pocet: "novePoptavky" },
      { kam: "administrace/texty.html", nazev: "Texty na webu", ikona: "texty" },
      { kam: "administrace/realizace.html", nazev: "Realizace a fotky", ikona: "realizace" },
      { kam: "administrace/sluzby.html", nazev: "Služby", ikona: "sluzby" },
    ],
  },
  {
    ryska: "CRM",
    faze: "Druhá fáze — <strong>samostatná zakázka</strong>. Tady je jen ukázka, "
      + "jak by to mohlo vypadat; data jsou vymyšlená.",
    odkazy: [
      { kam: "administrace/crm/index.html", nazev: "Přehled dne", ikona: "prehled" },
      { kam: "administrace/crm/nabidky.html", nazev: "Cenové nabídky", ikona: "nabidky", pocet: "konciNabidky" },
      { kam: "administrace/crm/zakazky.html", nazev: "Zakázky", ikona: "zakazky" },
      { kam: "administrace/crm/klienti.html", nazev: "Klienti", ikona: "klienti" },
      { kam: "administrace/crm/sklad.html", nazev: "Sklad", ikona: "sklad", pocet: "podLimitem" },
      { kam: "administrace/crm/faktury.html", nazev: "Faktury", ikona: "faktury", pocet: "poSplatnosti" },
    ],
  },
];

function panel(ctx) {
  const { stranka, site, pocty = {} } = ctx;
  const z = koren(stranka);

  const skupiny = NAVIGACE.map((skupina) => {
    const odkazy = skupina.odkazy.map((o) => {
      const tu = o.kam === stranka;
      const pocet = o.pocet ? pocty[o.pocet] : 0;
      return `<li><a href="${odkaz(stranka, o.kam)}"${tu ? ' aria-current="page"' : ""}>`
        + ikona(o.ikona, "boc__ikona")
        + `<span>${h(o.nazev)}</span>`
        + (pocet ? `<b class="boc__pocet">${pocet}</b>` : "")
        + `</a></li>`;
    }).join("");

    return `<div class="boc__skupina">`
      + `<p class="boc__ryska">${h(skupina.ryska)}</p>`
      + (skupina.faze ? `<p class="boc__faze">${skupina.faze}</p>` : "")
      + `<ul class="boc__odkazy">${odkazy}</ul>`
      + `</div>`;
  }).join("");

  return `<aside class="boc" id="panel">
  <a class="boc__znacka" href="${odkaz(stranka, "administrace/nastenka.html")}">
    <img src="${z}assets/img/znacka-mala.webp" width="303" height="337" alt="">
    <span>${h(site.znacka)}<small>administrace</small></span>
  </a>
  <nav class="boc__nav" aria-label="Administrace">${skupiny}</nav>
  <div class="boc__pata">
    <p class="boc__kdo">
      <span class="boc__avatar" aria-hidden="true">JK</span>
      <span><strong>Jaroslava K.</strong><small>majitelka</small></span>
    </p>
    <a href="${odkaz(stranka, "index.html")}">${ikona("ven", "boc__ikona")} Zobrazit web</a><br>
    <a href="${odkaz(stranka, "administrace/index.html")}">${ikona("odhlasit", "boc__ikona")} Odhlásit</a>
  </div>
</aside>`;
}

function lista(ctx, { cesta = [], akce = "" }) {
  const { stranka } = ctx;
  const kousky = cesta.map((c, i) => {
    const posledni = i === cesta.length - 1;
    const text = posledni
      ? `<span aria-current="page">${h(c.nazev)}</span>`
      : `<a href="${odkaz(stranka, c.kam)}">${h(c.nazev)}</a>`;
    return (i ? `<span aria-hidden="true">/</span>` : "") + text;
  }).join("");

  return `<div class="lista">
  <button class="lista__menu" type="button" data-panel-prepnout aria-expanded="false" aria-controls="panel">
    ${ikona("menu")} Menu
  </button>
  <nav class="lista__cesta" aria-label="Kde jsem">${kousky}</nav>
  ${akce ? `<div class="lista__akce">${akce}</div>` : ""}
</div>`;
}

/* ------------------------------------------------------------------- obal */

/** Obal jedné stránky administrace. */
export function strankaAdmin(ctx, { titulek, nadpis, ryska, perex, cesta, akce, telo, faze }) {
  const { stranka, site } = ctx;
  const z = koren(stranka);

  const hlava = nadpis
    ? `<header class="hlava-stranky">
  <div class="hlava-stranky__radek">
    <div>
      ${ryska ? `<p class="ryska">${h(ryska)}</p>` : ""}
      <h1>${h(nadpis)}</h1>
      ${perex ? `<p>${perex}</p>` : ""}
    </div>
    ${akce ? `<div class="hlava-stranky__akce netisknout">${akce}</div>` : ""}
  </div>
</header>`
    : "";

  const pruhFaze = faze
    ? `<div class="poznamka poznamka--faze netisknout">${ikona("info")}<p>${faze}</p></div>`
    : "";

  return `<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${h(titulek)} | Administrace ${h(site.znacka)}</title>
<link rel="icon" href="${z}assets/img/favicon.png" type="image/png">
<link rel="preload" href="${z}assets/fonts/Inter-400-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${z}assets/fonts/Barlow-600-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${z}assets/admin.css">
</head>
<body>
<p class="panel-ukazka netisknout">
  <span><strong>Ukázka administrace.</strong> Změny se nikam neukládají — po obnovení stránky je ukázka zahodí.</span>
  <a href="${odkaz(stranka, "index.html")}">Zpět na web</a>
</p>
<div class="rozvrh">
${panel(ctx)}
<main class="obsah">
${lista(ctx, { cesta, akce: "" })}
<div class="stranka">
${hlava}
${pruhFaze}
${telo}
</div>
</main>
</div>
<script type="module" src="${z}assets/admin.js"></script>
</body>
</html>
`;
}

/* ------------------------------------------------------- malé stavebnice */

/** Odznak se stavem. */
export function odznak(text, barva = "", bezTecky = false) {
  const tridy = ["odznak", barva ? `odznak--${barva}` : "", bezTecky ? "odznak--bez" : ""]
    .filter(Boolean).join(" ");
  return `<span class="${tridy}">${h(text)}</span>`;
}

/** Karta s hlavou a tělem. */
export function karta({ nadpis, vedle, telo, pata, tesne, uroven = 2 }) {
  const Hx = `h${uroven}`;
  return `<section class="karta">`
    + (nadpis
      ? `<div class="karta__hlava"><${Hx}>${h(nadpis)}</${Hx}>${vedle ? `<div>${vedle}</div>` : ""}</div>`
      : "")
    + `<div class="karta__telo${tesne ? " karta__telo--tesne" : ""}">${telo}</div>`
    + (pata ? `<div class="karta__pata">${pata}</div>` : "")
    + `</section>`;
}

/** Poznámka s ikonou. */
export function poznamka(text, { druh = "", jmenoIkony = "info", tisknout = true } = {}) {
  return `<div class="poznamka${druh ? ` poznamka--${druh}` : ""}${tisknout ? "" : " netisknout"}">`
    + `${ikona(jmenoIkony)}<p>${text}</p></div>`;
}

/** Prázdný stav. */
export function prazdno(nadpis, text) {
  return `<div class="prazdno">${ikona("prazdne")}<strong>${h(nadpis)}</strong>`
    + (text ? `<p>${h(text)}</p>` : "") + `</div>`;
}

/** Rozkládací řádek (detail bez další stránky). */
export function rozbal({ hlavni, vedle, telo, otevreno = false }) {
  return `<details class="rozbal"${otevreno ? " open" : ""}>`
    + `<summary>${ikona("sipka", "rozbal__sipka")}`
    + `<span class="rozbal__hlavni">${hlavni}</span>`
    + (vedle ? `<span class="rozbal__vedle">${vedle}</span>` : "")
    + `</summary>`
    + `<div class="rozbal__telo">${telo}</div>`
    + `</details>`;
}

/** Dvojice popisků. `pary` je [[klíč, hodnota], …], hodnota už je HTML. */
export function popis(pary, { sloupce = false } = {}) {
  if (sloupce) {
    return `<dl class="popis popis--sloupce">`
      + pary.map(([k, v]) => `<div><dt>${h(k)}</dt><dd>${v}</dd></div>`).join("")
      + `</dl>`;
  }
  return `<dl class="popis">`
    + pary.map(([k, v]) => `<dt>${h(k)}</dt><dd>${v}</dd>`).join("")
    + `</dl>`;
}

/** Tabulka. `sloupce` = [{nazev, trida}], `radky` = pole polí HTML. */
export function tabulka({ sloupce, radky, pata, sevrena = false }) {
  const th = sloupce.map((s) => `<th${s.trida ? ` class="${s.trida}"` : ""}>${h(s.nazev)}</th>`).join("");
  const tr = radky.map((r) => {
    const td = r.bunky.map((b, i) => {
      const trida = sloupce[i]?.trida;
      return `<td${trida ? ` class="${trida}"` : ""}>${b}</td>`;
    }).join("");
    return `<tr${r.atributy ? " " + r.atributy : ""}>${td}</tr>`;
  }).join("");

  return `<div class="tabulka-obal"><table class="tabulka${sevrena ? " tabulka--sevrena" : ""}">`
    + `<thead><tr>${th}</tr></thead><tbody>${tr}</tbody>`
    + (pata ? `<tfoot>${pata}</tfoot>` : "")
    + `</table></div>`;
}
