/** Zakázky — postup prací, posun stavu, filtr a řazení.
 *  Zakázka = { id, nabidka, klient, nazev, stav, zahajeno, terminMontaze, kroky, poznamka }.
 *  `kroky` je pole trojic [nazev, kdy, hotovo]; pole mohou chybět. */

/** Pořadí, jak zakázka postupuje. */
export const STAVY = ["priprava", "vyroba", "montaz", "hotovo"];

/** Bezpečně vráti pole kroků (chybějící pole = prázdné). */
function kroky(zakazka) {
  return Array.isArray(zakazka.kroky) ? zakazka.kroky : [];
}

/** Postup zakázky: { hotovych, celkem, zbyva, procento, dalsi }. */
export function postup(zakazka) {
  const k = kroky(zakazka);
  const celkem = k.length;
  const hotovych = k.filter((krok) => krok[2] === true).length;
  const zbyva = celkem - hotovych;
  const procento = celkem === 0 ? 0 : Math.round((hotovych / celkem) * 100);
  const dalsi = k.find((krok) => krok[2] !== true) ?? null;
  return { hotovych, celkem, zbyva, procento, dalsi };
}

/** Následující stav ze STAVY; pro "hotovo" vrací null. Neznámý stav -> chyba. */
export function dalsiStav(stav) {
  const i = STAVY.indexOf(stav);
  if (i === -1) {
    throw new Error(`Neznámý stav zakázky: ${stav}`);
  }
  return i + 1 < STAVY.length ? STAVY[i + 1] : null;
}

/** true pro všechno kromě stavu "hotovo". */
export function jeVBehu(zakazka) {
  return zakazka.stav !== "hotovo";
}

/** Počty: { celkem, vBehu, hotove, podleStavu } — podleStavu má klíč pro každý stav. */
export function pocty(zakazky) {
  const seznam = Array.isArray(zakazky) ? zakazky : [];
  const podleStavu = Object.fromEntries(STAVY.map((s) => [s, 0]));
  let vBehu = 0;
  let hotove = 0;
  for (const zakazka of seznam) {
    if (zakazka.stav === "hotovo") {
      hotove += 1;
    } else {
      vBehu += 1;
    }
    if (zakazka.stav in podleStavu) {
      podleStavu[zakazka.stav] += 1;
    }
  }
  return { celkem: seznam.length, vBehu, hotove, podleStavu };
}

/** Normalizace pro hledání: malá písmena bez diakritiky. */
function bezDiakritiky(text) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Filtr zakázek podle stavů a hledaného textu; vrací nové pole v pořadí vstupu. */
export function filtruj(zakazky, { stavy = [], hledane = "" } = {}) {
  const seznam = Array.isArray(zakazky) ? zakazky : [];
  const stavove = Array.isArray(stavy) && stavy.length > 0 ? stavy : null;
  const dotaz = String(hledane ?? "").trim();
  const hledany = bezDiakritiky(dotaz);
  return seznam.filter((zakazka) => {
    if (stavove && !stavove.includes(zakazka.stav)) return false;
    if (!hledany) return true;
    const texty = [zakazka.id, zakazka.nazev, zakazka.poznamka, zakazka.nabidka];
    return texty.some((t) => bezDiakritiky(t).includes(hledany));
  });
}

/** Seřadí: v běhu vzestupně podle terminMontaze, hotové sestupně;
 *  chybějící termin na konec své skupiny. Vrací nové pole. */
export function serad(zakazky, _dnes) {
  const seznam = Array.isArray(zakazky) ? zakazky : [];
  const behem = seznam.filter(jeVBehu);
  const hotove = seznam.filter((z) => z.stav === "hotovo");
  const sTerminem = (z) => typeof z.terminMontaze === "string" && z.terminMontaze !== "";
  behem.sort((a, b) => {
    const at = sTerminem(a);
    const bt = sTerminem(b);
    if (at && bt) return a.terminMontaze < b.terminMontaze ? -1 : a.terminMontaze > b.terminMontaze ? 1 : 0;
    if (at) return -1;
    if (bt) return 1;
    return 0;
  });
  hotove.sort((a, b) => {
    const at = sTerminem(a);
    const bt = sTerminem(b);
    if (at && bt) return a.terminMontaze > b.terminMontaze ? -1 : a.terminMontaze < b.terminMontaze ? 1 : 0;
    if (at) return -1;
    if (bt) return 1;
    return 0;
  });
  return [...behem, ...hotove];
}

/** Mělká kopie zakázky se změněným stavem; vstup nemění.
 *  Přechod na "hotovo" označí všechny kroky jako hotové (nové trojice). */
export function zmenStav(zakazka, stav) {
  if (!STAVY.includes(stav)) {
    throw new Error(`Neznámý stav zakázky: ${stav}`);
  }
  const kopie = { ...zakazka };
  if (stav === "hotovo") {
    kopie.kroky = kroky(zakazka).map((krok) => [krok[0], krok[1], true]);
  }
  kopie.stav = stav;
  return kopie;
}

/** Mělká kopie zakázky s novým polem kroků, kde krok na `index` má zadané `hotovo`. */
export function oznacKrok(zakazka, index, hotovo) {
  const k = kroky(zakazka);
  if (!Number.isInteger(index) || index < 0 || index >= k.length) {
    throw new Error(`Krok na pozici ${index} neexistuje — zakázka má jen ${k.length} kroků.`);
  }
  const novyKrok = [k[index][0], k[index][1], Boolean(hotovo)];
  return {
    ...zakazka,
    kroky: k.map((krok, i) => (i === index ? novyKrok : krok)),
  };
}
