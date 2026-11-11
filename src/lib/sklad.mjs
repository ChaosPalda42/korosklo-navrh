/** Skladová evidence — stav karty, pohyby, podlimitní zásoby.
 *  Karta = { kod, nazev, jednotka, naSklade, rezervovano, limit, cena }.
 *  Chybějící čísla se berou jako 0. */

/** Zaokrouhlí na 2 desetinná místa. */
function zaokr2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Číslo jako konečné číslo, jinak 0. */
function cisloZ(karta, klic) {
  const v = karta ? karta[klic] : undefined;
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/** Číslo s desetinnou čárkou (bez pevných mezer) pro chybové zprávy. */
function sCarckou(n) {
  return String(zaokr2(n)).replace(".", ",");
}

/** Stav karty: { naSklade, rezervovano, volne }. */
export function stavKarty(karta) {
  const naSklade = cisloZ(karta, "naSklade");
  const rezervovano = cisloZ(karta, "rezervovano");
  return {
    naSklade,
    rezervovano,
    volne: zaokr2(naSklade - rezervovano),
  };
}

/** Ponechá jen číselná pole karty, jinak původní hodnotu. */
function upravit(hodnota) {
  return typeof hodnota === "number" ? zaokr2(hodnota) : hodnota;
}

/** Vráti mělkou kopii karty se změněnými čísly podle `pohyb = { druh, mnozstvi }`.
 *  Vstupní kartu nemění. */
export function pohybem(karta, pohyb) {
  const mn = pohyb ? pohyb.mnozstvi : undefined;
  if (typeof mn !== "number" || !Number.isFinite(mn) || mn <= 0) {
    throw new Error("Množství pohybu musí být kladné číslo.");
  }
  const druh = pohyb ? pohyb.druh : undefined;
  const kopie = { ...karta };
  const naSklade = cisloZ(karta, "naSklade");
  const rezervovano = cisloZ(karta, "rezervovano");
  const volne = naSklade - rezervovano;

  switch (druh) {
    case "prijem":
      kopie.naSklade = upravit(naSklade + mn);
      kopie.rezervovano = upravit(rezervovano);
      break;
    case "vydej":
      if (mn > naSklade) {
        throw new Error(
          `Nedostatek zásoby: dostupné je jen ${sCarckou(naSklade)}.`
        );
      }
      kopie.naSklade = upravit(naSklade - mn);
      kopie.rezervovano = upravit(Math.max(0, rezervovano - mn));
      break;
    case "rezervace":
      if (mn > volne) {
        throw new Error(
          `Nedostatek volné zásoby: dostupné je jen ${sCarckou(volne)}.`
        );
      }
      kopie.naSklade = upravit(naSklade);
      kopie.rezervovano = upravit(rezervovano + mn);
      break;
    case "zruseni-rezervace":
      kopie.naSklade = upravit(naSklade);
      kopie.rezervovano = upravit(Math.max(0, rezervovano - mn));
      break;
    default:
      throw new Error(`Neznámý druh pohybu: ${druh}`);
  }
  return kopie;
}

/** Karty, kde volne < limit, seřazené vzestupně podle (volne - limit) —
 *  nejhorší schodek první. Vrací původní objekty karet. */
export function podLimitem(karty) {
  if (!Array.isArray(karty)) return [];
  const pod = karty
    .map((k) => {
      const s = stavKarty(k);
      const limit = cisloZ(k, "limit");
      return { k, schodek: s.volne - limit };
    })
    .filter((x) => x.schodek < 0);
  pod.sort((a, b) => a.schodek - b.schodek);
  return pod.map((x) => x.k);
}

/** Zaokrouhlený součet naSklade * cena přes všechny karty. */
export function hodnotaSkladu(karty) {
  if (!Array.isArray(karty)) return 0;
  const soucet = karty.reduce(
    (s, k) => s + cisloZ(k, "naSklade") * cisloZ(k, "cena"),
    0
  );
  return zaokr2(soucet);
}
