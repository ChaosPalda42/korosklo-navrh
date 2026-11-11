/** Skládání <img> pro fotky realizací.
 *  Varianty vyrábí tools/fotky.py: NN-k-400, NN-k-800 (ořez 3:2)
 *  a NN-1200, NN-2000 (plná fotka, delší hrana). */

import { h, koren } from "./cesty.mjs";

const KARTA = [400, 800];
const PLNA = [1200, 2000];

/** Fotka v kartě — ořez 3:2, vždy stejný poměr. */
export function fotkaKarta(stranka, kod, popis, { sizes = "(max-width: 56rem) 100vw, 400px", lazy = true } = {}) {
  const z = koren(stranka) + "assets/img/foto/";
  const sada = KARTA.map((w) => `${z}${kod}-k-${w}.webp ${w}w`).join(", ");
  return (
    `<img src="${z}${kod}-k-800.webp" srcset="${sada}" sizes="${sizes}"` +
    ` width="800" height="533" alt="${h(popis)}"` +
    (lazy ? ` loading="lazy" decoding="async"` : ` fetchpriority="high"`) +
    `>`
  );
}

/** Plná fotka — zachovaný původní poměr. */
export function fotkaPlna(stranka, kod, popis, soupis, { sizes = "(max-width: 56rem) 100vw, 1200px", lazy = true } = {}) {
  const z = koren(stranka) + "assets/img/foto/";
  const sada = PLNA.map((w) => `${z}${kod}-${w}.webp ${w}w`).join(", ");
  const info = soupis?.[kod];
  const delsi = info && info.sirka >= info.vyska;
  const sirka = info ? (delsi ? 1200 : Math.round((info.sirka / info.vyska) * 1200)) : 1200;
  const vyska = info ? (delsi ? Math.round((info.vyska / info.sirka) * 1200) : 1200) : 800;
  return (
    `<img src="${z}${kod}-1200.webp" srcset="${sada}" sizes="${sizes}"` +
    ` width="${sirka}" height="${vyska}" alt="${h(popis)}"` +
    (lazy ? ` loading="lazy" decoding="async"` : ` fetchpriority="high"`) +
    `>`
  );
}

/** Fotka na celou šířku v heru — ořez dělá CSS (object-fit). */
export function fotkaHero(stranka, kod, popis) {
  const z = koren(stranka) + "assets/img/foto/";
  const sada = PLNA.map((w) => `${z}${kod}-${w}.webp ${w}w`).join(", ");
  return (
    `<img src="${z}${kod}-2000.webp" srcset="${sada}" sizes="100vw"` +
    ` alt="${h(popis)}" fetchpriority="high" decoding="async">`
  );
}
