/** Opakující se části stránek. */

import { h, odkaz } from "../lib/cesty.mjs";
import { fotkaKarta, fotkaPlna, fotkaHero } from "../lib/obrazky.mjs";

/** Hero s fotkou na pozadí a skleněným panelem. */
export function hero(ctx, { kod, nadpis, perex, akce = [], kratky = false, popisFotky = "" }) {
  const s = ctx.stranka;
  return `
<section class="hero${kratky ? " hero--kratky" : ""}">
  ${kod ? `<div class="hero__foto">${fotkaHero(s, kod, popisFotky)}</div>` : ""}
  <div class="obal hero__obsah">
    <div class="tabule odlesk hero__panel">
      <h1>${h(nadpis)}</h1>
      ${perex ? `<p>${h(perex)}</p>` : ""}
      ${akce.length ? `<div class="hero__akce">${akce.map(([cil, text, hlavni]) =>
        `<a class="tl ${hlavni ? "tl--hlavni" : "tl--obrys"}" href="${odkaz(s, cil)}">${h(text)}</a>`).join("")}</div>` : ""}
    </div>
  </div>
</section>`;
}

/** Pás čísel pod herem. */
export function fakta(polozky) {
  return `
<div class="obal">
  <dl class="fakta">
    ${polozky.map(([cislo, popis]) => `<div><dt>${h(cislo)}</dt><dd>${h(popis)}</dd></div>`).join("")}
  </dl>
</div>`;
}

/** Nadpis sekce s ryskou. */
export function hlavickaSekce(ryska, nadpis, perex = "") {
  return `
<div class="hlavicka-sekce">
  ${ryska ? `<p class="ryska">${h(ryska)}</p>` : ""}
  <h2>${h(nadpis)}</h2>
  ${perex ? `<p>${h(perex)}</p>` : ""}
</div>`;
}

/** Karta služby. */
export function kartaSluzba(ctx, sluzba) {
  const s = ctx.stranka;
  const kod = sluzba.fotky[0];
  return `
<a class="karta" href="${odkaz(s, `sluzby/${sluzba.id}.html`)}">
  ${kod ? `<div class="karta__foto">${fotkaKarta(s, kod, sluzba.nazev)}</div>` : ""}
  <div class="karta__telo">
    <h3>${h(sluzba.nazev)}</h3>
    <p>${h(sluzba.perex)}</p>
    <span class="karta__pata">Více o službě →</span>
  </div>
</a>`;
}

/** Karta realizace. */
export function kartaRealizace(ctx, r, sluzbyPodleId) {
  const s = ctx.stranka;
  const kod = r.fotky[0];
  const stitek = sluzbyPodleId[r.kategorie]?.zkratka ?? "";
  return `
<a class="karta" href="${odkaz(s, `realizace/${r.id}.html`)}" data-kategorie="${h(r.kategorie)}">
  <div class="karta__foto">
    ${stitek ? `<span class="karta__stitek">${h(stitek)}</span>` : ""}
    ${fotkaKarta(s, kod, r.nazev)}
  </div>
  <div class="karta__telo">
    <h3>${h(r.nazev)}</h3>
    <p>${h(r.misto)} · ${h(r.rok)}</p>
    <span class="karta__pata">Prohlédnout →</span>
  </div>
</a>`;
}

/** Galerie s lupou. */
export function galerie(ctx, kody, popis) {
  const s = ctx.stranka;
  if (!kody.length) return "";
  const dlazdice = kody.map((kod, i) => `
    <button type="button" data-lupa="${i}" aria-label="Zvětšit fotku ${i + 1} z ${kody.length}">
      ${fotkaKarta(s, kod, `${popis} — fotografie ${i + 1}`, { sizes: "(max-width: 56rem) 50vw, 320px" })}
    </button>`).join("");
  const plne = kody.map((kod, i) => `
    <template data-plna="${i}">${fotkaPlna(s, kod, `${popis} — fotografie ${i + 1}`, ctx.fotky, { lazy: false })}</template>`).join("");
  return `<div class="galerie" data-galerie>${dlazdice}</div>${plne}`;
}

/** Výzva k poptávce na konci stránky. */
export function vyzva(ctx, { nadpis = "Máte představu? Napište nám.", text = "Stačí přibližné rozměry a fotka místa. Ozveme se do dvou pracovních dnů s cenou i termínem.", kod = "29" } = {}) {
  const s = ctx.stranka;
  return `
<section class="sekce vyzva">
  <div class="vyzva__foto">${fotkaKarta(s, kod, "", { sizes: "100vw" })}</div>
  <div class="obal vyzva__obsah">
    <div class="tabule odlesk vyzva__panel">
      <h2>${h(nadpis)}</h2>
      <p>${h(text)}</p>
      <div class="hero__akce">
        <a class="tl tl--hlavni" href="${odkaz(s, "kontakt.html")}">Nezávazná poptávka</a>
        <a class="tl tl--obrys" href="tel:+420602224735">+420 602 224 735</a>
      </div>
    </div>
  </div>
</section>`;
}
