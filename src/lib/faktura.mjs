/** Faktury: vznik z nabídky, splatnost, stav, přehled.
 *
 * Faktura = { cislo, variabilniSymbol, zNabidky, zakaznik, polozky,
 *             vystaveno, splatnost, stav, celkem? }
 * `stav` je "navrh", "vystavena" nebo "zaplacena".
 */

/** Zaokrouhlí na 2 desetinná místa. */
function zaokr2(n) {
  return Math.round(n * 100) / 100;
}

/** Rozparsuje ISO datum RRRR-MM-DD na {y, m, d}, jinak null. */
function parseDatum(iso) {
  if (typeof iso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

/** Datum RRRR-MM-DD posunuté o `dnu` dní dopředu. */
function posunDnu(iso, dnu) {
  const p = parseDatum(iso);
  if (!p) return "";
  const t = new Date(Date.UTC(p.y, p.m - 1, p.d) + dnu * 86400000);
  const y = t.getUTCFullYear();
  const m = String(t.getUTCMonth() + 1).padStart(2, "0");
  const d = String(t.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Celý počet dní mezi dvěma ISO daty; kladné, když je `doIso` později. */
function dnuMezi(odIso, doIso) {
  const a = parseDatum(odIso);
  const b = parseDatum(doIso);
  if (!a || !b) return 0;
  const ms = Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d);
  return Math.round(ms / 86400000);
}

/** Z řetězce vybere jen číslice; je-li jich víc než deset, vrátí POSLEDNÍCH
 *  deset. Žádná číslice -> "". */
export function variabilniSymbol(cislo) {
  const c = String(cislo ?? "");
  const cislice = c.replace(/\D/g, "");
  return cislice.length > 10 ? cislice.slice(-10) : cislice;
}

/** Nová faktura z nabídky.
 *  volby = { cislo, vystaveno, splatnostDnu = 14 }.
 *  zakaznik a polozky jsou hlubokou kopií z nabídky. */
export function zNabidky(nabidka, volby) {
  const splatnostDnu =
    typeof volby?.splatnostDnu === "number" && Number.isFinite(volby.splatnostDnu)
      ? volby.splatnostDnu
      : 14;
  const vystaveno = volby?.vystaveno;
  return {
    cislo: volby?.cislo,
    variabilniSymbol: variabilniSymbol(volby?.cislo),
    zNabidky: nabidka?.cislo,
    zakaznik: JSON.parse(JSON.stringify(nabidka?.zakaznik ?? null)),
    polozky: JSON.parse(JSON.stringify(Array.isArray(nabidka?.polozky) ? nabidka.polozky : [])),
    vystaveno,
    splatnost: posunDnu(vystaveno, splatnostDnu),
    stav: "navrh",
  };
}

/** Stav faktury podle dnešního data: "zaplacena" a "navrh" beze změny;
 *  jinak dnesIso po splatnosti -> "po-splatnosti", den splatnosti i dřív
 *  -> "vystavena". */
export function stavFaktury(faktura, dnesIso) {
  const stav = faktura?.stav;
  if (stav === "zaplacena" || stav === "navrh") return stav;
  if (dnuMezi(faktura?.splatnost, dnesIso) > 0) return "po-splatnosti";
  return "vystavena";
}

/** Kolik celých dní je faktura po splatnosti; není-li po splatnosti, 0. */
export function dnuPoSplatnosti(faktura, dnesIso) {
  if (stavFaktury(faktura, dnesIso) !== "po-splatnosti") return 0;
  return dnuMezi(faktura?.splatnost, dnesIso);
}

/** Přehled faktur k dnešnímu dni:
 *  { zaplaceno, nezaplaceno, poSplatnosti, pocty }. */
export function prehled(faktury, dnesIso) {
  const zaplaceno = 0;
  const nezaplaceno = 0;
  const poSplatnosti = 0;
  const pocty = { navrh: 0, vystavena: 0, "po-splatnosti": 0, zaplacena: 0 };
  let sZaplaceno = 0;
  let sNezaplaceno = 0;
  let sPoSplatnosti = 0;
  for (const f of Array.isArray(faktury) ? faktury : []) {
    const stav = stavFaktury(f, dnesIso);
    pocty[stav] = (pocty[stav] ?? 0) + 1;
    const celkem = typeof f?.celkem === "number" && Number.isFinite(f.celkem) ? f.celkem : 0;
    if (stav === "zaplacena") sZaplaceno += celkem;
    else if (stav === "vystavena" || stav === "po-splatnosti") {
      sNezaplaceno += celkem;
      if (stav === "po-splatnosti") sPoSplatnosti += celkem;
    }
  }
  return {
    zaplaceno: zaokr2(sZaplaceno),
    nezaplaceno: zaokr2(sNezaplaceno),
    poSplatnosti: zaokr2(sPoSplatnosti),
    pocty,
  };
}
