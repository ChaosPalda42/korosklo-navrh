/** Rozvržení stránky: hlava dokumentu, hlavička, patička. */

import { h, odkaz, koren } from "../lib/cesty.mjs";
import { podpisAutora } from "./podpis.mjs";

export const MENU = [
  ["sluzby/index.html", "Služby"],
  ["realizace/index.html", "Realizace"],
  ["pro-designery.html", "Pro designéry a firmy"],
  ["o-nas.html", "O nás"],
  ["kontakt.html", "Kontakt"],
];

/** Hlavička s logem a menu. */
export function hlavicka(ctx) {
  const { stranka, site } = ctx;
  const z = koren(stranka);
  const aktivni = (cil) => {
    const stejna = cil === stranka;
    const sekce = cil.endsWith("/index.html") && stranka.startsWith(cil.slice(0, cil.indexOf("/") + 1));
    return stejna || sekce ? ' aria-current="page"' : "";
  };
  const polozky = MENU.map(([cil, text]) =>
    `<a href="${odkaz(stranka, cil)}"${aktivni(cil)}>${h(text)}</a>`).join("");
  return `
<header class="hlava" data-hlava>
  <div class="obal hlava__vnitrek">
    <a class="znacka" href="${odkaz(stranka, "index.html")}" aria-label="${h(site.firma)} — domovská stránka">
      <img class="znacka__sklo" src="${z}assets/img/znacka-mala.webp" width="303" height="337" alt="">
      <img class="znacka__slovo" src="${z}assets/img/slovo.svg" width="706" height="232" alt="${h(site.znacka)}">
    </a>
    <button class="prepinac-menu" type="button" aria-expanded="false" aria-controls="menu" data-prepinac-menu>
      <span aria-hidden="true">☰</span> Menu
    </button>
    <nav class="menu" id="menu" aria-label="Hlavní rozcestník" data-menu>
      ${polozky}
      <a class="tl tl--hlavni tl--maly" href="${odkaz(stranka, "kontakt.html")}">Nezávazná poptávka</a>
    </nav>
    <a class="tl tl--hlavni tl--maly" href="${odkaz(stranka, "kontakt.html")}">Nezávazná poptávka</a>
  </div>
</header>`;
}

/** Pruh „tohle je ukázka" nad hlavičkou. */
export function pruhUkazky(ctx) {
  return `<div class="pruh-ukazky">Ukázka nového webu pro ${h(ctx.site.firma)} — `
    + `<a href="${odkaz(ctx.stranka, "administrace/index.html")}">ukázka administrace a CRM</a></div>`;
}

/** Patička. */
export function patka(ctx) {
  const { stranka, site, sluzby } = ctx;
  const z = koren(stranka);
  const a = site.adresa;

  const sloupec = (nadpis, polozky) => `
    <div>
      <h4>${h(nadpis)}</h4>
      <ul>${polozky.map(([cil, text]) =>
        `<li><a href="${odkaz(stranka, cil)}">${h(text)}</a></li>`).join("")}</ul>
    </div>`;

  const doba = site.oteviraciDoba.map((d) =>
    `<span>${h(d.den)}</span><span>${h(d.od ? `${d.od}–${d.do}` : "zavřeno")}</span>`).join("");

  const telefony = site.telefony.map((t) => `
    <div class="pata__telefon">
      <span class="pata__role">${h(t.role)}</span>
      ${t.cisla.map((c) => `<a href="tel:${h(c.replace(/\s/g, ""))}">${h(c)}</a>`).join("")}
    </div>`).join("");

  return `
<footer class="pata">
  <div class="obal">
    <div class="pata__mrizka">
      <div class="pata__znacka">
        <img src="${z}assets/img/znacka.webp" width="303" height="337" alt="">
        <img src="${z}assets/img/slovo.svg" width="706" height="232" alt="${h(site.znacka)}" style="height:1.3rem;margin-bottom:1rem">
        <address>
          ${h(site.firma)}<br>
          ${h(a.ulice)}<br>${h(a.psc)} ${h(a.mesto)}<br>
          <br>
          IČO ${h(site.ic)} · DIČ ${h(site.dic)}
        </address>
      </div>
      ${sloupec("Služby", sluzby.slice(0, 6).map((s) => [`sluzby/${s.id}.html`, s.nazev]))}
      ${sloupec("Web", [
        ["sluzby/index.html", "Všechny služby"],
        ["realizace/index.html", "Realizace"],
        ["pro-designery.html", "Pro designéry a firmy"],
        ["velkoobchod.html", "Velkoobchod"],
        ["o-nas.html", "O nás"],
        ["kontakt.html", "Kontakt a poptávka"],
      ])}
      <div>
        <h4>Spojení</h4>
        ${telefony}
        <p style="margin-top:1rem"><a href="mailto:${h(site.email)}">${h(site.email)}</a></p>
        <h4 style="margin-top:1.75rem">Otevírací doba</h4>
        <div class="pata__doba">${doba}</div>
      </div>
    </div>
    <div class="pata__spodek">
      <p>© ${new Date().getFullYear()} ${h(site.firma)} · <a href="${odkaz(stranka, "ochrana-osobnich-udaju.html")}">Ochrana osobních údajů</a></p>
      ${podpisAutora(h(site.domena))}
    </div>
  </div>
</footer>`;
}

/** Celá stránka. */
export function stranka(ctx, { titulek, popis, telo, trida = "", bezPruhu = false, obrazek = null }) {
  const { stranka: s, site } = ctx;
  const z = koren(s);
  const plnyTitulek = titulek ? `${titulek} | ${site.znacka}` : `${site.znacka} — ${site.podtitul} v Plzni`;
  const og = obrazek ? `${site.web}/${obrazek}` : null;

  return `<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${h(plnyTitulek)}</title>
<meta name="description" content="${h(popis)}">
<meta name="theme-color" content="#090d10">
<link rel="icon" href="${z}assets/img/favicon.png" sizes="64x64">
<link rel="preload" href="${z}assets/fonts/Barlow-600-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${z}assets/fonts/Inter-400-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${z}assets/style.css">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${h(site.firma)}">
<meta property="og:title" content="${h(plnyTitulek)}">
<meta property="og:description" content="${h(popis)}">
<meta property="og:locale" content="cs_CZ">
${og ? `<meta property="og:image" content="${h(og)}">` : ""}
<meta name="robots" content="noindex, nofollow">
</head>
<body class="${trida}">
<a class="preskocit" href="#obsah">Přeskočit na obsah</a>
${bezPruhu ? "" : pruhUkazky(ctx)}
${hlavicka(ctx)}
<main id="obsah">
${telo}
</main>
${patka(ctx)}
<script src="${z}assets/web.js" defer></script>
</body>
</html>
`;
}
