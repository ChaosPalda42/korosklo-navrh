/** Faktura ze zakázky: další volné číslo, kontrola a návrh faktury.
 *
 * Zakázka = { id, nabidka, klient, nazev, stav, ... }
 * Faktura = { cislo, zNabidky, klient, popis, polozky, platceDph, zaokrouhlit,
 *             celkem, vystaveno, splatnost, zaplaceno, stav }
 * Nabídka = { cislo, klient, polozky, platceDph?, zaokrouhlit? }
 */

import { souhrn } from "./nabidka.mjs";

const RE_CISLO = /^(\d{4})-(\d{4})$/;

/** Je `rok` platný čtyřmístný letopočet 2000–2999? */
function platnyRok(rok) {
  const r = typeof rok === "number" ? rok : Number(rok);
  return Number.isInteger(r) && r >= 2000 && r <= 2999 ? r : null;
}

/** Další volné číslo faktury v daném roce ve tvaru "RRRR-NNNN".
 *  Neplatný rok -> "". Čísla v jiném tvaru se přeskakují. */
export function dalsiCislo(faktury, rok) {
  const r = platnyRok(rok);
  if (r === null) return "";
  const rokStr = String(r);
  let max = 0;
  for (const f of Array.isArray(faktury) ? faktury : []) {
    const c = f?.cislo;
    if (typeof c !== "string") continue;
    const m = RE_CISLO.exec(c);
    if (!m || m[1] !== rokStr) continue;
    const poradi = Number(m[2]);
    if (poradi > max) max = poradi;
  }
  return `${rokStr}-${String(max + 1).padStart(4, "0")}`;
}

/** První faktura, která vznikla z nabídky této zakázky (ten samý objekt),
 *  jinak null. */
export function fakturaZakazky(zakazka, faktury) {
  const nabidka = zakazka?.nabidka;
  if (typeof nabidka !== "string" || nabidka === "") return null;
  if (!Array.isArray(faktury)) return null;
  return faktury.find((f) => f?.zNabidky === nabidka) ?? null;
}

/** Lze zakázku fakturovat? { muze, duvod, varovani }. */
export function lzeFakturovat(zakazka, faktury) {
  const nabidka = zakazka?.nabidka;
  if (typeof nabidka !== "string" || nabidka === "") {
    return {
      muze: false,
      duvod: "Zakázka nemá nabídky, ze které by šlo vzít položky faktury.",
      varovani: "",
    };
  }
  const existujici = fakturaZakazky(zakazka, faktury);
  if (existujici) {
    return {
      muze: false,
      duvod: `Zakázka už má fakturu ${existujici.cislo}.`,
      varovani: "",
    };
  }
  const varovani =
    zakazka.stav !== "hotovo"
      ? "Zakázka ještě není hotová, obvykle se fakturuje až po předání."
      : "";
  return { muze: true, duvod: "", varovani };
}

/** Nový návrh faktury ze zakázky. volby = { nabidka, faktury = [], rok }. */
export function zeZakazky(zakazka, volby) {
  const kontrola = lzeFakturovat(zakazka, volby?.faktury ?? []);
  if (!kontrola.muze) throw new Error(kontrola.duvod);

  const nabidka = volby?.nabidka;
  if (!nabidka || nabidka.cislo !== zakazka.nabidka) {
    throw new Error("Chybí nabídky, ze které má být faktura, nebo neodpovídá zakázce.");
  }

  const faktury = volby?.faktury ?? [];
  const cislo = dalsiCislo(faktury, volby?.rok);
  if (cislo === "") {
    throw new Error("Neplatný rok pro číslo faktury.");
  }

  const polozky = Array.isArray(nabidka.polozky)
    ? structuredClone(nabidka.polozky)
    : [];
  const platceDph = nabidka.platceDph !== false;
  const zaokrouhlit = nabidka.zaokrouhlit !== false;

  return {
    cislo,
    zNabidky: zakazka.nabidka,
    klient: zakazka.klient ?? nabidka.klient ?? "",
    popis: zakazka.nazev ?? "",
    polozky,
    platceDph,
    zaokrouhlit,
    celkem: souhrn({ polozky, platceDph, zaokrouhlit }).celkem,
    vystaveno: "",
    splatnost: "",
    zaplaceno: "",
    stav: "navrh",
  };
}
