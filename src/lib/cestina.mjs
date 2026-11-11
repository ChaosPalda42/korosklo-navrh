/** České formátování čísel, peněz, dat a množného čísla.
 *  NBSP (U+00A0) je pevná mezera — tam, kde se v textech píše NBSP,
 *  patří přesně tenhle znak. */

const NBSP = "\u00A0";
const MINUS = "\u2212";

/** Rozparsuje ISO datum RRRR-MM-DD na {y, m, d}, jinak null. */
function parseDatum(iso) {
  if (typeof iso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

/** Číslo s pevnou mezerou po tisících a desetinnou čárkou.
 *  Zaokrouhlí na `desetinna` míst a tolik míst vždycky vypíše.
 *  Záporné číslo začíná U+2212. Není-li n konečné číslo, vrací "0". */
export function cislo(n, desetinna = 0) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "0";
  const d = Math.max(0, Math.floor(desetinna));
  let s = n.toFixed(d);
  if (s.startsWith("-")) s = MINUS + s.slice(1);
  const [cel, dec] = s.split(".");
  const sInt = cel.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  const vysledek = dec ? sInt + "," + dec : sInt;
  return vysledek === MINUS + "0" ? "0" : vysledek;
}

/** Číslo korun: cislo(n, halere ? 2 : 0) + NBSP + "Kč". */
export function koruny(n, halere = false) {
  return cislo(n, halere ? 2 : 0) + NBSP + "Kč";
}

/** Množný tvar podle `tvary` = [pro 1, pro 2–4, pro 0 a 5+].
 *  Rozhoduje Math.abs(n) zaokrouhlené dolů: zbytek po 100 v 11–22 -> třetí
 *  tvar; jinak poslední číslice: 1 -> první, 2–4 -> druhý, ostatní -> třetí. */
export function mnozne(n, tvary) {
  const a = Math.floor(Math.abs(n));
  const po100 = a % 100;
  if (po100 >= 11 && po100 <= 22) return tvary[2];
  const pos = a % 10;
  if (pos === 1) return tvary[0];
  if (pos >= 2 && pos <= 4) return tvary[1];
  return tvary[2];
}

/** Číslo + NBSP + množný tvar. */
export function sMnoznym(n, tvary) {
  return cislo(n) + NBSP + mnozne(n, tvary);
}

/** "2026-11-11" -> "11. 11. 2026" (bez vodicích nul, obyčejné mezery).
 *  Prázdný vstup, null nebo undefined -> "". */
export function datum(iso) {
  const p = parseDatum(iso);
  if (!p) return "";
  return `${p.d}. ${p.m}. ${p.y}`;
}

/** Datum bez roku: "2026-01-05" -> "5. 1.". */
export function datumKratce(iso) {
  const p = parseDatum(iso);
  if (!p) return "";
  return `${p.d}. ${p.m}.`;
}

/** Celý počet dní mezi dvěma ISO daty; kladné, když je `doIso` později. */
export function dnuMezi(odIso, doIso) {
  const a = parseDatum(odIso);
  const b = parseDatum(doIso);
  if (!a || !b) return 0;
  const ms = Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d);
  return Math.round(ms / 86400000);
}

/** Datum posunuté o celé dny, vrací RRRR-MM-DD. */
export function posunDnu(iso, oKolik) {
  const p = parseDatum(iso);
  if (!p) return "";
  const t = new Date(Date.UTC(p.y, p.m - 1, p.d) + oKolik * 86400000);
  const y = t.getUTCFullYear();
  const m = String(t.getUTCMonth() + 1).padStart(2, "0");
  const d = String(t.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Slovní odstup do minulosti. */
export function pred(iso, dnesIso) {
  const d = dnuMezi(iso, dnesIso);
  if (d < 0) return datum(iso);
  if (d === 0) return "dnes";
  if (d === 1) return "včera";
  if (d <= 13) return `před ${d} dny`;
  if (d <= 59) return `před ${Math.floor(d / 7)} týdny`;
  if (d <= 364) return `před ${Math.floor(d / 30)} měsíci`;
  return datum(iso);
}
