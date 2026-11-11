import { datum, dnuMezi, sMnoznym } from "./cestina.mjs";

/** Krátká česká věta o tom, jak daleko je datum `iso` od dne `dnes`.
 *  Na rozdíl od `pred()` umí i budoucnost. */
export function kdy(iso, dnes) {
  if (
    typeof iso !== "string" ||
    typeof dnes !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(iso) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(dnes)
  ) {
    return datum(iso);
  }
  const d = dnuMezi(dnes, iso);
  if (d === 0) return "dnes";
  if (d === 1) return "zítra";
  if (d === 2) return "pozítří";
  if (d >= 3 && d <= 13) return `za ${sMnoznym(d, ["den", "dny", "dní"])}`;
  if (d >= 14 && d <= 59) return `za ${sMnoznym(Math.round(d / 7), ["týden", "týdny", "týdnů"])}`;
  if (d === -1) return "včera";
  if (d >= -13 && d <= -2) return `před ${sMnoznym(-d, ["dnem", "dny", "dny"])}`;
  if (d >= -59 && d <= -14) return `před ${sMnoznym(Math.round(-d / 7), ["týdnem", "týdny", "týdny"])}`;
  return datum(iso);
}
