/** Počty v cenové nabídce: položky, DPH, zaokrouhlení, platnost, čísla.
 *
 * Položka = { nazev, mnozstvi, jednotka, cena, sleva?, dph? }
 *   `sleva` jsou procenta (výchozí 0), `dph` je sazba v procentech (výchozí 21).
 * Nabídka = { cislo?, zakaznik?, polozky, platnostDo?, zaokrouhlit?, platceDph? }
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

/** Celková cena jedné položky: zaokr2(mnozstvi * cena * (1 - sleva / 100)).
 *  Chybějící mnozstvi nebo cena -> 0. */
export function polozkaCelkem(p) {
  const mnozstvi = p?.mnozstvi;
  const cena = p?.cena;
  if (typeof mnozstvi !== "number" || !Number.isFinite(mnozstvi)) return 0;
  if (typeof cena !== "number" || !Number.isFinite(cena)) return 0;
  const sleva = typeof p.sleva === "number" && Number.isFinite(p.sleva) ? p.sleva : 0;
  return zaokr2(mnozstvi * cena * (1 - sleva / 100));
}

/** Souhrn nabídky: { bezDph, dph, danCelkem, sDphPresne, zaokrouhleni, celkem }.
 *  Vstupní nabídku ani její položky nemění. */
export function souhrn(nabidka) {
  const polozky = Array.isArray(nabidka?.polozky) ? nabidka.polozky : [];
  const bezDph = zaokr2(polozky.reduce((s, p) => s + polozkaCelkem(p), 0));

  let dph = [];
  let danCelkem = 0;
  if (nabidka?.platceDph !== false) {
    const sazby = new Map();
    for (const p of polozky) {
      const sazba =
        typeof p?.dph === "number" && Number.isFinite(p.dph) ? p.dph : 21;
      const celkem = polozkaCelkem(p);
      const pred = sazby.get(sazba) ?? 0;
      sazby.set(sazba, pred + celkem);
    }
    dph = [...sazby.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([sazba, soucet]) => {
        const zaklad = zaokr2(soucet);
        return { sazba, zaklad, dan: zaokr2((zaklad * sazba) / 100) };
      });
    danCelkem = zaokr2(dph.reduce((s, r) => s + r.dan, 0));
  }

  const sDphPresne = zaokr2(bezDph + danCelkem);
  const celkem = nabidka?.zaokrouhlit !== false ? Math.round(sDphPresne) : sDphPresne;
  const zaokrouhleni = nabidka?.zaokrouhlit !== false ? zaokr2(celkem - sDphPresne) : 0;

  return { bezDph, dph, danCelkem, sDphPresne, zaokrouhleni, celkem };
}

/** Datum RRRR-MM-DD posunuté o `dnu` dní dopředu. */
export function platnostDo(odIso, dnu) {
  const p = parseDatum(odIso);
  if (!p) return "";
  const t = new Date(Date.UTC(p.y, p.m - 1, p.d) + dnu * 86400000);
  const y = t.getUTCFullYear();
  const m = String(t.getUTCMonth() + 1).padStart(2, "0");
  const d = String(t.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Stav platnosti nabídky podle nabidka.platnostDo a dnešního data:
 *  chybí -> "plati"; dnesIso je po platnostDo -> "prosla";
 *  zbývají 2 dny nebo míň (včetně dneška) -> "konci"; jinak "plati". */
export function stavPlatnosti(nabidka, dnesIso) {
  const doIso = nabidka?.platnostDo;
  const a = parseDatum(dnesIso);
  const b = parseDatum(doIso);
  if (!a || !b) return "plati";
  const dnu = Math.round(
    (Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86400000
  );
  if (dnu < 0) return "prosla";
  if (dnu <= 2) return "konci";
  return "plati";
}

/** Další číslo nabídky "RRRR-NNNN" pro daný rok: nejvyšší čtyřmístné pořadí
 *  mezi čísly daného roku + 1, doplněné nulami na čtyři místa.
 *  Žádné takové číslo -> "<rok>-0001". Nesmyslné řetězce se přeskočí. */
export function dalsiCislo(cisla, rok) {
  const re = /^(\d{4})-(\d{4})$/;
  const rokStr = String(rok);
  let max = 0;
  for (const c of Array.isArray(cisla) ? cisla : []) {
    if (typeof c !== "string") continue;
    const m = re.exec(c);
    if (!m || m[1] !== rokStr) continue;
    const poradi = Number(m[2]);
    if (poradi > max) max = poradi;
  }
  return `${rokStr}-${String(max + 1).padStart(4, "0")}`;
}
