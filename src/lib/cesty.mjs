/** Cesty a odkazy. Web je statický a běží i z podsložky (GitHub Pages),
 *  takže všechny odkazy jsou relativní k aktuální stránce. */

/** Ošetří text do HTML. */
export function h(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Odkaz z jedné stránky na druhou. Obě jsou zadané jako cesta od korene
 *  webu bez úvodního lomítka, např. "sluzby/zrcadla.html". */
export function odkaz(odkud, kam) {
  const zpet = "../".repeat(Math.max(0, odkud.split("/").length - 1));
  return (zpet + kam) || "./";
}

/** Cesta ke korenu webu z dané stránky ("" nebo "../"). */
export function koren(odkud) {
  return "../".repeat(Math.max(0, odkud.split("/").length - 1));
}

/** Z názvu udělá bezpečný kus adresy. */
export function uhel(text) {
  const bez = String(text)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  return bez.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
