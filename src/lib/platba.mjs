/** Faktury — IBAN, vystavení, zaplacení a export pro účetní. */

import { posunDnu } from "./cestina.mjs";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Je-li `iso` platné datum RRRR-MM-DD, vrací {y, m, d}, jinak null. */
function parseDatum(iso) {
  if (typeof iso !== "string" || !ISO.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d) {
    return null;
  }
  return { y, m, d };
}

/** Z českého čísla účtu udělá IBAN; nesmyslný vstup -> "". */
export function iban(ucet, volby = {}) {
  if (typeof ucet !== "string") return "";
  const p = ucet.match(/^(\d{1,6}-)?(\d{1,10})\/(\d{1,4})$/);
  if (!p) return "";
  const predcisli = (p[1] ? p[1].slice(0, -1) : "").padStart(6, "0");
  const ucetCislo = p[2].padStart(10, "0");
  const banka = p[3].padStart(4, "0");
  // BBBBPPPPPPUUUUUUUUUU + "CZ00", písmena jako čísla (C=12, Z=35).
  const cistota = banka + predcisli + ucetCislo + "123500";
  let zbytek = 0;
  for (const c of cistota) zbytek = (zbytek * 10 + Number(c)) % 97;
  const kontrola = String(98 - zbytek).padStart(2, "0");
  const vysledek = "CZ" + kontrola + banka + predcisli + ucetCislo;
  if (volby.mezery) {
    return vysledek.match(/.{1,4}/g).join(" ");
  }
  return vysledek;
}

/** Z návrhu udělá vystavenou fakturu (nový objekt). */
export function vystav(faktura, volby = {}) {
  const { kdy, splatnostDnu = 14 } = volby;
  if (faktura.stav !== "navrh") {
    throw new Error(`Fakturu v stavu „${faktura.stav}" nelze vystavit — vystavuje se jen návrh.`);
  }
  if (!parseDatum(kdy)) {
    throw new Error("Datum vystavení musí být v tvaru RRRR-MM-DD.");
  }
  return {
    ...faktura,
    stav: "vystavena",
    vystaveno: kdy,
    splatnost: posunDnu(kdy, splatnostDnu),
  };
}

/** Označí fakturu jako zaplacenou (nový objekt). */
export function oznacZaplacenou(faktura, kdy) {
  if (faktura.stav === "navrh") {
    throw new Error("Nejdřív je fakturu třeba vystavit, teprve pak ji lze zaplatit.");
  }
  if (faktura.stav === "zaplacena") {
    throw new Error("Faktura je už zaplacená.");
  }
  if (!parseDatum(kdy)) {
    throw new Error("Datum zaplacení musí být v tvaru RRRR-MM-DD.");
  }
  return { ...faktura, stav: "zaplacena", zaplaceno: kdy };
}

/** Hlavička exportu pro účetní. */
export const SLOUPCE = [
  "Číslo",
  "Variabilní symbol",
  "Klient",
  "Popis",
  "Vystaveno",
  "Splatnost",
  "Zaplaceno",
  "Stav",
  "Celkem",
];

/** Datum česky dd.mm.rrrr bez vodicích nul; neplatné -> "". */
function datumBezMezer(iso) {
  const p = parseDatum(iso);
  if (!p) return "";
  return `${p.d}.${p.m}.${p.y}`;
}

/** Jen číslice z čísla faktury; víc než deset -> posledních deset. */
function variabilniSymbol(cislo) {
  const cislice = String(cislo ?? "").replace(/\D/g, "");
  return cislice.slice(-10);
}

/** Číslo s desetinnou čárkou, bez oddělovače tisíců; nečíslo -> "0". */
function celkemDoCsv(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "0";
  return String(n).replace(".", ",");
}

const STAVY_LIDSKY = { navrh: "Návrh", vystavena: "Vystavena", zaplacena: "Zaplacena" };

/** Pole CSV: obalí uvozovkami jen tehdy, když to obsah vyžaduje. */
function poleCsv(hodnota) {
  const s = String(hodnota ?? "");
  if (/[;"\r\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/** Středníkem oddělený CSV pro účetní; řádky CRLF, poslední bez CRLF. */
export function csvProUcetni(faktury, volby = {}) {
  const klienti = volby.klienti ?? {};
  const radky = [SLOUPCE.join(";")];
  if (Array.isArray(faktury)) {
    for (const f of faktury) {
      const pole = [
        f.cislo ?? "",
        variabilniSymbol(f.cislo),
        f.stav === "navrh" ? "" : klienti[f.klient] ?? f.klient ?? "",
        f.popis ?? "",
        datumBezMezer(f.vystaveno),
        datumBezMezer(f.splatnost),
        datumBezMezer(f.zaplaceno),
        STAVY_LIDSKY[f.stav] ?? f.stav ?? "",
        celkemDoCsv(f.celkem),
      ];
      radky.push(pole.map(poleCsv).join(";"));
    }
  }
  return radky.join("\r\n");
}

/** "faktury-RRRR-MM-DD.csv" z platného ISO data, jinak "faktury.csv". */
export function nazevSouboru(dnesIso) {
  return parseDatum(dnesIso) ? `faktury-${dnesIso}.csv` : "faktury.csv";
}
