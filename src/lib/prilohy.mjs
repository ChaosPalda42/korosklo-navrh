/** Přílohy zakázky — štítky, druhy souborů a limity.
 *  Příloha = { nazev, velikost, stitek, druh, kdy }. `nazev` je jméno souboru
 *  i s příponou, `velikost` je v bajtech, `kdy` je datum RRRR-MM-DD. */

import { cislo } from "./cestina.mjs";

const NBSP = "\u00A0";

/** Pořadí, v jakém se štítky nabízejí i řadí. "jine" je poslední a je to
 *  náhradní štítek. */
export const STITKY = ["smlouva", "zamereni", "navrh", "foto", "faktura", "atest", "jine"];

/** Malá písmena bez diakritiky — pro srovnání jmen a odhad štítku. */
function bezDiacritiky(text) {
  return String(text).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** Odhadne štítek ze jména souboru. Rozhoduje první pravidlo, které sedí. */
export function hadejStitek(nazev) {
  if (typeof nazev !== "string") return "jine";
  const n = bezDiacritiky(nazev);
  if (n.includes("smlouv") || n.includes("objednavk")) return "smlouva";
  if (n.includes("zamer") || n.includes("mereni")) return "zamereni";
  if (n.includes("navrh") || n.includes("vizual") || n.includes("nakres") || n.includes("vykres")) return "navrh";
  if (n.includes("faktur") || n.includes("zaloh")) return "faktura";
  if (n.includes("atest") || n.includes("technick") || n.includes("prohlasen")) return "atest";
  if (n.includes("foto") || n.includes("img") || n.includes("dsc") || n.includes("snimek") || druh(nazev) === "obrazek") return "foto";
  return "jine";
}

/** Druh souboru podle přípony za poslední tečkou, malými písmeny. */
export function druh(nazev) {
  if (typeof nazev !== "string") return "jine";
  const tecka = nazev.lastIndexOf(".");
  if (tecka < 0) return "jine";
  const pripona = nazev.slice(tecka + 1).toLowerCase();
  if (["jpg", "jpeg", "png", "heic", "webp", "gif"].includes(pripona)) return "obrazek";
  if (pripona === "pdf") return "pdf";
  if (["doc", "docx", "odt", "rtf", "txt"].includes(pripona)) return "dokument";
  if (["xls", "xlsx", "ods", "csv"].includes(pripona)) return "tabulka";
  if (["dwg", "dxf", "svg"].includes(pripona)) return "vykres";
  return "jine";
}

/** Lidsky čitelná velikost s pevnou mezerou (NBSP) mezi číslem a jednotkou. */
export function velikost(bajtu) {
  if (typeof bajtu !== "number" || !Number.isFinite(bajtu) || bajtu <= 0) {
    return cislo(0) + NBSP + "B";
  }
  if (bajtu < 1024) return cislo(bajtu) + NBSP + "B";
  if (bajtu < 1024 * 1024) return cislo(bajtu / 1024) + NBSP + "kB";
  return cislo(bajtu / 1048576, 1) + NBSP + "MB";
}

/** Projde `nove` v pořadí a každou buď přijme, nebo odmítne.
 *  Vstupní pole se nemění; `prijate` se do `stavajici` nepřidává. */
export function prijmi(stavajici, nove, volby = {}) {
  const max = volby.max ?? 20;
  const maxBajtu = volby.maxBajtu ?? 15728640;
  const kdy = volby.kdy ?? "";
  const prijate = [];
  const odmitnute = [];
  const jmena = new Set(stavajici.map((p) => bezDiacritiky(p.nazev)));
  for (const n of nove) {
    if (stavajici.length + prijate.length >= max) {
      odmitnute.push({ nazev: n.nazev, duvod: "plno" });
    } else if (n.velikost > maxBajtu) {
      odmitnute.push({ nazev: n.nazev, duvod: "velky" });
    } else if (jmena.has(bezDiacritiky(n.nazev))) {
      odmitnute.push({ nazev: n.nazev, duvod: "duplicitni" });
    } else {
      jmena.add(bezDiacritiky(n.nazev));
      prijate.push({
        nazev: n.nazev,
        velikost: n.velikost,
        stitek: hadejStitek(n.nazev),
        druh: druh(n.nazev),
        kdy,
      });
    }
  }
  return { prijate, odmitnute };
}

/** Počty příloh: celkem a podle každého štítku ze STITKY.
 *  Neznámý štítek se počítá jen do `celkem`. */
export function pocty(prilohy) {
  const podleStitku = {};
  for (const s of STITKY) podleStitku[s] = 0;
  for (const p of prilohy) {
    if (p.stitek in podleStitku) podleStitku[p.stitek] += 1;
  }
  return { celkem: prilohy.length, podleStitku };
}

/** Nové pole seřazené podle pořadí ve STITKY; uvnitř štítku podle `nazev`
 *  vzestupně (localeCompare s "cs"). Neznámý štítek patří úplně na konec.
 *  Vstupní pole se nemění. */
export function serad(prilohy) {
  const poradici = (p) => {
    const i = STITKY.indexOf(p.stitek);
    return i === -1 ? STITKY.length : i;
  };
  return [...prilohy].sort((a, b) => {
    const d = poradici(a) - poradici(b);
    if (d !== 0) return d;
    return a.nazev.localeCompare(b.nazev, "cs");
  });
}

/** Kopie pole, kde příloha na `index` má nový štítek (nová mělká kopie).
 *  Štítek mimo STITKY nebo index mimo rozsah -> chyba. */
export function zmenStitek(prilohy, index, stitek) {
  if (!STITKY.includes(stitek)) {
    throw new Error(`Neznámý štítek „${stitek}“ — štítek musí být jeden ze seznamu štítků.`);
  }
  if (index < 0 || index >= prilohy.length) {
    throw new Error(`Index ${index} je mimo rozsah příloh (je jich ${prilohy.length}).`);
  }
  return prilohy.map((p, i) => (i === index ? { ...p, stitek } : p));
}

/** Kopie pole bez přílohy na `index`. Index mimo rozsah -> chyba. */
export function odeber(prilohy, index) {
  if (index < 0 || index >= prilohy.length) {
    throw new Error(`Index ${index} je mimo rozsah příloh (je jich ${prilohy.length}).`);
  }
  return prilohy.filter((_, i) => i !== index);
}
