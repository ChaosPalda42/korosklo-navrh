/** Ukázka CRM — nabídky, zakázky, klienti, sklad, faktury.
 *
 *  POZOR: tohle je druhá fáze a samostatná zakázka. V ukázce je to proto,
 *  aby bylo vidět, jak by to mohlo vypadat a že web na to je připravený.
 *  Všechna data tady jsou vymyšlená.
 */

import { h, odkaz } from "../lib/cesty.mjs";
import { cislo, koruny, sMnoznym, datum, datumKratce, pred, dnuMezi } from "../lib/cestina.mjs";
import { polozkaCelkem, souhrn, stavPlatnosti } from "../lib/nabidka.mjs";
import { stavKarty, podLimitem, hodnotaSkladu } from "../lib/sklad.mjs";
import { stavFaktury, dnuPoSplatnosti, prehled, variabilniSymbol } from "../lib/faktura.mjs";
import { iban } from "../lib/platba.mjs";
import { postup, pocty, serad, jeVBehu } from "../lib/zakazky.mjs";
import { STITKY, serad as seradPrilohy, pocty as poctyPriloh, velikost }
  from "../lib/prilohy.mjs";
import { kdy } from "../lib/kdy.mjs";
import { ikona, karta, odznak, poznamka, popis, tabulka, rozbal, prazdno } from "./admin-layout.mjs";

const FAZE = "Druhá fáze — <strong>samostatná zakázka</strong>. Takhle by mohlo vypadat "
  + "to, co dnes děláte v Excelu a v šanonech. Data v ukázce jsou vymyšlená.";

/* --------------------------------------------------------------- pomůcky */

const STAVY_NABIDEK = {
  navrh: ["Rozpracovaná", ""],
  odeslana: ["Odeslaná", "modra"],
  prijata: ["Přijatá", "zelena"],
  zamitnuta: ["Zamítnutá", "cervena"],
};

const STAVY_ZAKAZEK = {
  priprava: ["Příprava", ""],
  vyroba: ["Ve výrobě", "modra"],
  montaz: ["Montáž", "zlata"],
  hotovo: ["Hotovo", "zelena"],
};

const STITKY_PRILOH = {
  smlouva: ["Smlouva", "modra"],
  zamereni: ["Zaměření", "zlata"],
  navrh: ["Návrh", "zlata"],
  foto: ["Fotka", "zelena"],
  faktura: ["Faktura", "modra"],
  atest: ["Atest", ""],
  jine: ["Ostatní", ""],
};

const IKONA_DRUHU = {
  obrazek: "fotka",
  pdf: "soubor",
  dokument: "soubor",
  tabulka: "tabulka",
  vykres: "soubor",
  jine: "soubor",
};

const STAVY_FAKTUR = {
  navrh: ["Návrh", ""],
  vystavena: ["Vystavená", "modra"],
  "po-splatnosti": ["Po splatnosti", "cervena"],
  zaplacena: ["Zaplacená", "zelena"],
};

function odznakZeSlovniku(slovnik, stav) {
  const [nazev, barva] = slovnik[stav] ?? [stav, ""];
  return odznak(nazev, barva);
}

/** Odznak platnosti nabídky i s počtem dní — hlavní bolest: cena drží 5 dní. */
function odznakPlatnosti(n, dnes) {
  const stav = stavPlatnosti(n, dnes);
  const dnu = dnuMezi(dnes, n.platnostDo);
  if (stav === "plati") return odznak(`Platí ${sMnoznym(dnu, ["den", "dny", "dní"])}`, "zelena");
  if (stav === "konci") {
    return odznak(dnu <= 0 ? "Platí jen dnes" : `Končí za ${sMnoznym(dnu, ["den", "dny", "dní"])}`, "zluta");
  }
  return odznak(`Prošlá ${sMnoznym(-dnu, ["den", "dny", "dní"])}`, "cervena");
}

function klient(ctx, id) {
  return ctx.demo.klientiPodleId[id];
}

function adresaKlienta(k) {
  if (!k) return "—";
  const radky = [`<strong>${h(k.jmeno)}</strong>`];
  if (k.ulice) radky.push(h(k.ulice));
  if (k.mesto) radky.push(`${h(k.psc)} ${h(k.mesto)}`);
  if (k.ico) radky.push(`IČ ${h(k.ico)}${k.dic ? ` · DIČ ${h(k.dic)}` : ""}`);
  return radky.join("<br>");
}

/** Hlavička dokladu — kdo ho vystavil. Údaje firmy jsou skutečné. */
function znackaDodavatele(ctx) {
  const { site, stranka } = ctx;
  const a = site.adresa ?? {};
  return `<img src="${odkaz(stranka, "assets/img/logo.svg")}" width="1049" height="348" alt="${h(site.znacka)}">
      ${h(site.firma)}<br>${h(a.ulice)}<br>${h(a.psc)} ${h(a.mesto)}<br>
      IČ ${h(site.ic)} · DIČ ${h(site.dic)}`;
}

/* --------------------------------------------------------- přehled (CRM) */

function dlazdice(nazev, hodnota, popisek, { barva = "" } = {}) {
  return `<article class="cislo">
  <p class="cislo__nazev">${h(nazev)}</p>
  <p class="cislo__hodnota">${hodnota}</p>
  <p class="cislo__popis">${popisek}</p>
</article>`;
}

export function crmPrehled(ctx) {
  const { demo, stranka, dnes } = ctx;

  const konci = demo.nabidky.filter((n) => n.stav === "odeslana" && stavPlatnosti(n, dnes) === "konci");
  const prosle = demo.nabidky.filter((n) => n.stav === "odeslana" && stavPlatnosti(n, dnes) === "prosla");
  const vBehu = demo.zakazky.filter((z) => z.stav !== "hotovo");
  const p = prehled(demo.faktury, dnes);
  const chybi = podLimitem(demo.sklad.karty);

  const dlazdiceRada = `<div class="mriz mriz--4">`
    + dlazdice("Nabídky, kterým končí cena", `${konci.length + prosle.length}`,
      `z toho ${prosle.length} už prošlo`)
    + dlazdice("Zakázky v běhu", `${vBehu.length}`,
      `nejbližší montáž ${h(datumKratce(vBehu.map((z) => z.terminMontaze).sort()[0] ?? dnes))}`)
    + dlazdice("Po splatnosti", koruny(p.poSplatnosti),
      `${sMnoznym(p.pocty["po-splatnosti"], ["faktura", "faktury", "faktur"])}`)
    + dlazdice("Hodnota skladu", koruny(hodnotaSkladu(demo.sklad.karty)),
      `${sMnoznym(chybi.length, ["položka", "položky", "položek"])} pod limitem`)
    + `</div>`;

  /* „Co dnes řešit“ — to je celý smysl CRM: žádné hledání v šanonu. */
  const ukoly = [];

  for (const n of [...prosle, ...konci]) {
    const k = klient(ctx, n.klient);
    ukoly.push({
      stav: stavPlatnosti(n, dnes),
      text: `Nabídka <a href="${odkaz(stranka, `administrace/crm/nabidka-${n.cislo}.html`)}">${h(n.cislo)}</a>`
        + ` pro ${h(k?.jmeno ?? "—")} — ${h(n.nazev.toLowerCase())}`,
      vedle: odznakPlatnosti(n, dnes),
    });
  }

  for (const f of demo.faktury) {
    if (stavFaktury(f, dnes) !== "po-splatnosti") continue;
    const k = klient(ctx, f.klient);
    ukoly.push({
      stav: "prosla",
      text: `Faktura <strong>${h(f.cislo)}</strong> pro ${h(k?.jmeno ?? "—")} — ${koruny(f.celkem)}`,
      vedle: odznak(`${sMnoznym(dnuPoSplatnosti(f, dnes), ["den", "dny", "dní"])} po splatnosti`, "cervena"),
    });
  }

  for (const z of vBehu) {
    const dnu = dnuMezi(dnes, z.terminMontaze);
    if (dnu > 7) continue;
    ukoly.push({
      stav: "konci",
      text: `Zakázka <strong>${h(z.id)}</strong> — ${h(z.nazev.toLowerCase())}`,
      vedle: odznak(dnu <= 0 ? "montáž dnes" : `montáž za ${sMnoznym(dnu, ["den", "dny", "dní"])}`, "zlata"),
    });
  }

  for (const k of chybi.slice(0, 3)) {
    const s = stavKarty(k);
    ukoly.push({
      stav: "sklad",
      text: `Doplnit <strong>${h(k.nazev)}</strong> — volné ${cislo(s.volne, 1)} ${h(k.jednotka)},`
        + ` limit ${cislo(k.limit, 1)}`,
      vedle: odznak("sklad", "zluta"),
    });
  }

  const seznamUkolu = ukoly.length
    ? `<ul class="pruhy" style="gap:0">`
      + ukoly.map((u) => `<li style="grid-template-columns:minmax(0,1fr) auto;`
        + `padding:0.6875rem 0;border-bottom:1px solid var(--okraj-vnitřní);align-items:center">`
        + `<span style="white-space:normal;overflow:visible">${u.text}</span>${u.vedle}</li>`).join("")
      + `</ul>`
    : prazdno("Nic nehoří", "Žádná nabídka nekončí, nic není po splatnosti.");

  const posledniPohyby = demo.sklad.pohyby.slice(0, 5);

  const telo = dlazdiceRada
    + `<div class="mriz mriz--sirsi-vlevo">`
    + karta({
      nadpis: "Co dnes řešit",
      vedle: odznak(`${ukoly.length}`, "zlata", true),
      telo: seznamUkolu,
      pata: "Tohle je to, co dneska znamená hledání v šanonu: která nabídka komu končí "
        + "a co se komu slíbilo.",
    })
    + karta({
      nadpis: "Poslední pohyby na skladě",
      vedle: `<a class="tl tl--maly" href="${odkaz(stranka, "administrace/crm/sklad.html")}">Sklad</a>`,
      telo: tabulka({
        sevrena: true,
        sloupce: [{ nazev: "Co" }, { nazev: "Kolik", trida: "cisla" }],
        radky: posledniPohyby.map((x) => {
          const k = demo.sklad.karty.find((y) => y.kod === x.kod);
          const znak = x.druh === "prijem" ? "+" : x.druh === "vydej" ? "−" : "";
          return {
            bunky: [
              `<span class="tabulka__hlavni">${h(k?.nazev ?? x.kod)}</span>`
              + `<span class="tabulka__pod">${h(x.popis)} · ${h(pred(x.kdy, dnes))}</span>`,
              `${znak}${cislo(x.mnozstvi, 1)} ${h(k?.jednotka ?? "")}`
              + `<span class="tabulka__pod">${h(x.druh === "rezervace" ? "rezervace" : x.druh)}</span>`,
            ],
          };
        }),
      }),
      tesne: true,
    })
    + `</div>`
    + poznamka("Z poptávky se udělá nabídka, z přijaté nabídky zakázka a z hotové zakázky "
      + "faktura — a všechno zůstane u klienta v kartotéce. Nic se nepřepisuje ručně podruhé.");

  return {
    titulek: "CRM — přehled",
    nadpis: "Přehled dne",
    ryska: `Dnes je ${datum(dnes)}`,
    perex: "Co má dneska někdo vzít do ruky. Nabídky, kterým končí cena, faktury po splatnosti, "
      + "nejbližší montáže a co chybí na skladě.",
    cesta: [{ nazev: "Administrace", kam: "administrace/nastenka.html" },
      { nazev: "CRM", kam: "administrace/crm/index.html" }, { nazev: "Přehled dne" }],
    faze: FAZE,
    telo,
  };
}

/* --------------------------------------------------------------- nabídky */

export function nabidky(ctx) {
  const { demo, stranka, dnes } = ctx;

  const radky = demo.nabidky.map((n) => {
    const k = klient(ctx, n.klient);
    const s = souhrn(n);
    const cesta = odkaz(stranka, `administrace/crm/nabidka-${n.cislo}.html`);
    return {
      atributy: `data-stav="${h(n.stav)}" data-text="${h([n.cislo, k?.jmeno, n.nazev].join(" ").toLowerCase())}"`,
      bunky: [
        `<a class="tabulka__hlavni" href="${cesta}">${h(n.cislo)}</a>`
        + `<span class="tabulka__pod">${h(datumKratce(n.vystaveno))}</span>`,
        `<span class="tabulka__hlavni">${h(k?.jmeno ?? "—")}</span>`
        + `<span class="tabulka__pod">${h(n.nazev)}</span>`,
        odznakZeSlovniku(STAVY_NABIDEK, n.stav),
        n.stav === "odeslana" ? odznakPlatnosti(n, dnes)
          : `<span class="tabulka__pod">do ${h(datumKratce(n.platnostDo))}</span>`,
        `<strong>${koruny(s.celkem)}</strong>`
        + `<span class="tabulka__pod">${koruny(s.bezDph)} bez DPH</span>`,
      ],
    };
  });

  const telo = `<div class="filtry netisknout">
  <label class="jen-pro-cteni" for="hledat-n">Hledat nabídku</label>
  <input type="search" id="hledat-n" placeholder="Číslo, klient, co to je…" data-hledat="#seznam-nabidek">
  <div class="volby" data-filtr="#seznam-nabidek">
    <button class="volba" type="button" data-hodnota="" aria-pressed="true">Všechny</button>
    <button class="volba" type="button" data-hodnota="odeslana" aria-pressed="false">Odeslané</button>
    <button class="volba" type="button" data-hodnota="prijata" aria-pressed="false">Přijaté</button>
    <button class="volba" type="button" data-hodnota="navrh" aria-pressed="false">Rozpracované</button>
  </div>
  <a class="tl tl--hlavni" href="${odkaz(stranka, `administrace/crm/nabidka-${demo.nabidky[0].cislo}.html`)}">`
    + `${ikona("pridat")} Nová nabídka</a>
</div>`
    + karta({
      nadpis: `Cenové nabídky (${demo.nabidky.length})`,
      telo: `<div id="seznam-nabidek">`
        + tabulka({
          sloupce: [{ nazev: "Číslo", trida: "uzke" }, { nazev: "Klient a zakázka" },
            { nazev: "Stav", trida: "uzke" }, { nazev: "Platnost ceny", trida: "uzke" },
            { nazev: "Celkem", trida: "cisla" }],
          radky,
        })
        + `</div>`
        + `<div class="prazdno" data-prazdno hidden>${ikona("hledat")}<strong>Nic se nenašlo</strong></div>`,
      tesne: true,
      pata: "Nabídku si otevřete, přepíšete položku a cena se přepočítá sama. "
        + "Tisk nebo PDF je jedno kliknutí — a nabídka zůstane dohledatelná i za rok.",
    });

  return {
    titulek: "Cenové nabídky",
    nadpis: "Cenové nabídky",
    perex: "Místo Excelu, PowerPointu a šanonu. U každé nabídky je vidět, "
      + "jak dlouho ještě drží cena.",
    cesta: [{ nazev: "Administrace", kam: "administrace/nastenka.html" },
      { nazev: "CRM", kam: "administrace/crm/index.html" }, { nazev: "Cenové nabídky" }],
    faze: FAZE,
    telo,
  };
}

/** Jedna nabídka — dokument s živým přepočtem a tiskem. */
export function nabidkaDetail(ctx, n) {
  const { site, stranka, dnes } = ctx;
  const k = klient(ctx, n.klient);
  const s = souhrn(n);
  const stav = stavPlatnosti(n, dnes);
  const dnu = dnuMezi(dnes, n.platnostDo);

  const hlaskaPlatnosti = {
    plati: `Cena platí do <strong>${h(datum(n.platnostDo))}</strong>`
      + ` — ještě ${sMnoznym(dnu, ["den", "dny", "dní"])}.`,
    konci: `Cena platí do <strong>${h(datum(n.platnostDo))}</strong>`
      + (dnu <= 0 ? " — dnes je poslední den." : ` — zbývají ${sMnoznym(dnu, ["den", "dny", "dní"])}.`),
    prosla: `Cena platila do <strong>${h(datum(n.platnostDo))}</strong>`
      + ` — prošla ${sMnoznym(-dnu, ["den", "dny", "dní"])}. Před odpovědí zákazníkovi ji přepočítejte.`,
  }[stav];

  const radkyPolozek = n.polozky.map((p, i) => `<tr data-polozka>
  <td><input type="text" value="${h(p.nazev)}" data-pole="nazev" aria-label="Položka ${i + 1} — co to je">`
  + `<span class="tisk-jen" data-tisk-text>${h(p.nazev)}</span></td>
  <td class="cisla"><input type="text" value="${h(cislo(p.mnozstvi, p.mnozstvi % 1 ? 2 : 0))}" data-pole="mnozstvi" style="width:5rem;text-align:right" aria-label="Množství"></td>
  <td class="uzke"><input type="text" value="${h(p.jednotka)}" data-pole="jednotka" style="width:4rem" aria-label="Jednotka"></td>
  <td class="cisla"><input type="text" value="${h(cislo(p.cena, p.cena % 1 ? 2 : 0))}" data-pole="cena" style="width:6rem;text-align:right" aria-label="Cena za jednotku"></td>
  <td class="cisla"><input type="text" value="${p.sleva ? h(cislo(p.sleva, 0)) : ""}" data-pole="sleva" placeholder="0" style="width:3.5rem;text-align:right" aria-label="Sleva v procentech"></td>
  <td class="cisla" data-dph="${p.dph ?? 21}">${p.dph ?? 21} %</td>
  <td class="cisla"><strong data-celkem>${koruny(polozkaCelkem(p))}</strong></td>
  <td class="uzke netisknout"><button class="tl tl--tichy tl--maly" type="button" data-smaz-polozku aria-label="Odebrat položku">${ikona("koš")}</button></td>
</tr>`).join("");

  const souhrnCeny = `<div class="souhrn-ceny" data-souhrn>
  <div><span>Celkem bez DPH</span><span data-bez-dph>${koruny(s.bezDph)}</span></div>
  ${s.dph.map((d) => `<div><span>DPH ${d.sazba} % ze ${koruny(d.zaklad)}</span>`
    + `<span>${koruny(d.dan, true)}</span></div>`).join("")}
  ${s.zaokrouhleni ? `<div><span>Zaokrouhlení</span><span>${koruny(s.zaokrouhleni, true)}</span></div>` : ""}
  <div class="souhrn-ceny__celkem"><span>Celkem k zaplacení</span><span data-celkem-vse>${koruny(s.celkem)}</span></div>
</div>`;

  const dokument = `<div class="dokument" data-nabidka data-zaokrouhlit="${n.zaokrouhlit !== false}"
  data-platce-dph="${n.platceDph !== false}">
  <header class="dokument__hlava">
    <div>
      <p class="ryska">Cenová nabídka</p>
      <h2>${h(n.cislo)} — ${h(n.nazev)}</h2>
      <p style="color:var(--text-tlumený);margin-top:0.25rem">Vystaveno ${h(datum(n.vystaveno))}</p>
    </div>
    <div class="dokument__znacka">${znackaDodavatele(ctx)}</div>
  </header>

  <div class="dokument__strany">
    <div>
      <h3>Pro</h3>
      <p>${adresaKlienta(k)}</p>
      ${k?.email ? `<p style="color:var(--text-tlumený)">${h(k.email)}${k.telefon ? ` · ${h(k.telefon)}` : ""}</p>` : ""}
    </div>
    <div>
      <h3>Místo montáže</h3>
      <p>${h(n.mistoMontaze)}</p>
    </div>
    <div>
      <h3>Platnost ceny</h3>
      <p><strong>${h(datum(n.platnostDo))}</strong></p>
      <p style="color:var(--text-tlumený)">${sMnoznym(dnuMezi(n.vystaveno, n.platnostDo), ["den", "dny", "dní"])} od vystavení</p>
    </div>
  </div>

  <div class="tabulka-obal">
    <table class="tabulka" data-polozky>
      <thead><tr>
        <th>Položka</th><th class="cisla">Množství</th><th>Jedn.</th>
        <th class="cisla">Cena / jedn.</th><th class="cisla">Sleva</th>
        <th class="cisla">DPH</th><th class="cisla">Celkem</th><th class="netisknout"></th>
      </tr></thead>
      <tbody>${radkyPolozek}</tbody>
    </table>
  </div>

  <p class="netisknout" style="margin-top:0.75rem">
    <button class="tl tl--maly" type="button" data-pridat-polozku>${ikona("pridat")} Přidat položku</button>
  </p>

  <div style="margin-top:1.5rem">${souhrnCeny}</div>

  ${n.poznamka ? `<div style="margin-top:1.5rem;padding-top:1.25rem;border-top:1px solid var(--okraj)">
    <h3 style="font-size:0.75rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-slabý);font-family:var(--f-text)">Poznámka</h3>
    <p style="margin-top:0.375rem">${h(n.poznamka)}</p>
  </div>` : ""}

  <p class="tisk-jen" style="margin-top:2rem;font-size:9pt;color:#555">
    Nabídka je nezávazná a platí do uvedeného data. Ceny jsou včetně dopravy a montáže,
    pokud je montáž uvedena jako položka.
  </p>
</div>`;

  const akce = `<button class="tl tl--hlavni" type="button" data-tisk>${ikona("tisk")} Tisk nebo PDF</button>`
    + (k?.email
      ? `<a class="tl" href="mailto:${h(k.email)}?subject=${encodeURIComponent(`Cenová nabídka ${n.cislo} — KORO-SKLO`)}">`
        + `${ikona("obalka")} Odeslat e-mailem</a>`
      : "")
    + `<a class="tl" href="${odkaz(stranka, "administrace/crm/zakazky.html")}">${ikona("zakazky")} Udělat zakázku</a>`
    + `<a class="tl" href="${odkaz(stranka, "administrace/crm/faktury.html")}">${ikona("faktury")} Vytvořit fakturu</a>`;

  const telo = `<div class="platnost platnost--${stav} netisknout">`
    + ikona(stav === "prosla" ? "pozor" : "hodiny")
    + `<span>${hlaskaPlatnosti}</span></div>`
    + dokument
    + poznamka("Čísla se přepočítávají hned, jak něco změníte — DPH, zaokrouhlení i celková cena. "
      + "Tady jde o ukázku; v ostré verzi se nabídka uloží a zůstane dohledatelná pod svým číslem.",
      { tisknout: false });

  return {
    titulek: `Nabídka ${n.cislo}`,
    nadpis: `Nabídka ${n.cislo}`,
    perex: h(n.nazev),
    cesta: [{ nazev: "Administrace", kam: "administrace/nastenka.html" },
      { nazev: "CRM", kam: "administrace/crm/index.html" },
      { nazev: "Cenové nabídky", kam: "administrace/crm/nabidky.html" },
      { nazev: n.cislo }],
    akce,
    faze: FAZE,
    telo,
  };
}

/* --------------------------------------------------------------- zakázky */

export function zakazky(ctx) {
  const { demo, dnes } = ctx;
  const p = pocty(demo.zakazky);
  const radky = serad(demo.zakazky, dnes).map((z) => zakazkaRadek(ctx, z)).join("");

  const volba = (hodnota, nazev, kolik, stisknuto) =>
    `<button class="volba" type="button" data-hodnota="${h(hodnota)}"`
    + ` aria-pressed="${stisknuto ? "true" : "false"}">${h(nazev)}`
    + `<span class="volba__pocet" data-pocet="${h(hodnota || "vse")}">${cislo(kolik)}</span></button>`;

  const filtr = `<div class="filtry netisknout">
  <label class="jen-pro-cteni" for="hledat-z">Hledat zakázku</label>
  <input type="search" id="hledat-z" placeholder="Číslo, klient, co se dělá…"
         data-hledat-z="#seznam-zakazek">
  <div class="volby" data-filtr-z="#seznam-zakazek">`
    + volba("priprava,vyroba,montaz", "V běhu", p.vBehu, true)
    + volba("hotovo", "Hotové", p.hotove, false)
    + volba("", "Všechny", p.celkem, false)
    + `</div>
  <button class="tl tl--hlavni" type="button" data-nova-zakazka>${ikona("pridat")} Nová zakázka</button>
</div>`;

  const telo = filtr + karta({
    nadpis: "Zakázky",
    vedle: `<span class="karta__pocet" data-videt>${cislo(p.vBehu)} v běhu</span>`,
    telo: `<div id="seznam-zakazek" data-stavy="priprava,vyroba,montaz">${radky}</div>`
      + `<div class="prazdno" data-prazdno hidden>${ikona("hledat")}`
      + `<strong>Žádná zakázka tomu neodpovídá</strong>`
      + `<p>Zkuste jiný filtr nebo jiné slovo.</p></div>`,
    tesne: true,
    pata: "Hotové zakázky se schovají samy — filtr nahoře je kdykoli vytáhne zpátky. "
      + "Stav se dá přepnout přímo v řádku, krok odškrtnout kliknutím. "
      + "Přílohy se štítkem drží smlouvu, zaměření i fotky u jedné zakázky.",
  }) + vzorPrilohy();

  return {
    titulek: "Zakázky",
    nadpis: "Zakázky",
    perex: "Z přijaté nabídky se stane zakázka. Je u ní vidět, co je hotové "
      + "a co se má dělat dál — bez volání po dílně.",
    cesta: [{ nazev: "Administrace", kam: "administrace/nastenka.html" },
      { nazev: "CRM", kam: "administrace/crm/index.html" }, { nazev: "Zakázky" }],
    faze: FAZE,
    telo,
  };
}

/** Jeden rozkládací řádek zakázky i s úpravami, stavem a mazáním. */
function zakazkaRadek(ctx, z) {
  const { stranka, dnes } = ctx;
  const k = klient(ctx, z.klient);
  const stav = postup(z);

  const hlavni = `<strong>${h(z.id)} — <span data-zobraz="nazev">${h(z.nazev)}</span></strong>`
    + `<span class="tabulka__pod">${h(k?.jmeno ?? "—")}</span>`;
  const vedle = (jeVBehu(z) && z.terminMontaze
    ? `<span class="tabulka__pod">montáž ${h(kdy(z.terminMontaze, dnes))}</span>` : "")
    + `<span class="spinatko" data-pocet-priloh${(z.prilohy ?? []).length ? "" : " hidden"}`
    + ` title="Přílohy">${ikona("spona")}`
    + `<span data-pocet-priloh-cislo>${cislo((z.prilohy ?? []).length)}</span></span>`
    + `<span data-kroky>${stav.hotovych}/${stav.celkem} kroků</span>`
    + `<span data-odznak>${odznakZeSlovniku(STAVY_ZAKAZEK, z.stav)}</span>`;

  const postupHtml = `<ol class="postup" data-postup>`
    + z.kroky.map(([nazev, kdy, hotovo], i) => {
      const ted = !hotovo && stav.dalsi && stav.dalsi[0] === nazev;
      return `<li${hotovo ? " data-hotovo" : ""}${ted ? " data-ted" : ""}>`
        + `<button type="button" class="postup__znak" data-krok="${i}"`
        + ` aria-pressed="${hotovo ? "true" : "false"}"`
        + ` title="${hotovo ? "Odškrtnout krok" : "Odškrtnout jako hotový"}">`
        + `${hotovo ? ikona("fajfka") : i + 1}</button>`
        + `<span>${h(nazev)}</span>`
        + `<span class="postup__kdy">${h(datumKratce(kdy))}</span></li>`;
    }).join("")
    + `</ol>`;

  const prehledHtml = `<div data-zobrazeni>` + popis([
    ["Klient", k
      ? `<a href="${odkaz(stranka, "administrace/crm/klienti.html")}#${h(k.id)}">${h(k.jmeno)}</a>`
      : "—"],
    ["Z nabídky", z.nabidka
      ? `<a href="${odkaz(stranka, `administrace/crm/nabidka-${z.nabidka}.html`)}">${h(z.nabidka)}</a>`
      : "—"],
    ["Zahájeno", h(datum(z.zahajeno))],
    ["Montáž", `<span data-zobraz="terminDatum">${h(datum(z.terminMontaze))}</span> `
      + `<span class="tabulka__pod" data-zobraz="terminPred">${h(kdy(z.terminMontaze, dnes))}</span>`],
    ["Poznámka", `<span data-zobraz="poznamka">${h(z.poznamka || "—")}</span>`],
  ], { sloupce: true }) + `</div>`;

  const uprava = `<form class="uprava netisknout" data-uprava hidden>
  <div class="pole"><label for="nazev-${h(z.id)}">Co se dělá</label>
    <input type="text" id="nazev-${h(z.id)}" data-pole="nazev" value="${h(z.nazev)}"></div>
  <div class="pole"><label for="termin-${h(z.id)}">Termín montáže</label>
    <input type="date" id="termin-${h(z.id)}" data-pole="termin" value="${h(z.terminMontaze)}"></div>
  <div class="pole pole--siroke"><label for="pozn-${h(z.id)}">Poznámka</label>
    <textarea id="pozn-${h(z.id)}" rows="2" data-pole="poznamka">${h(z.poznamka || "")}</textarea></div>
  <div class="uprava__akce">
    <button type="submit" class="tl tl--hlavni tl--maly">${ikona("uloz")} Uložit</button>
    <button type="button" class="tl tl--maly" data-zrusit>Zrušit</button>
  </div>
</form>`;

  const moznosti = Object.entries(STAVY_ZAKAZEK)
    .map(([hodnota, [nazev]]) =>
      `<option value="${h(hodnota)}"${hodnota === z.stav ? " selected" : ""}>${h(nazev)}</option>`)
    .join("");

  const akce = `<div class="akce-radku netisknout">
  <label class="jen-pro-cteni" for="stav-${h(z.id)}">Stav zakázky</label>
  <select id="stav-${h(z.id)}" data-stav-volba>${moznosti}</select>
  <button type="button" class="tl tl--maly" data-dal>Posunout dál</button>
  <span class="akce-radku__mezera"></span>
  <button type="button" class="tl tl--maly" data-upravit>${ikona("tuzka")} Upravit</button>
  <button type="button" class="tl tl--maly tl--nebezpecny" data-smazat>${ikona("koš")} Smazat</button>
</div>
<div class="potvrzeni netisknout" data-potvrzeni hidden>
  ${ikona("pozor")}
  <p>Opravdu zakázku smazat? V ostré verzi se přesune do archivu a jde vrátit zpátky.</p>
  <button type="button" class="tl tl--maly tl--nebezpecny" data-smazat-ano>Ano, smazat</button>
  <button type="button" class="tl tl--maly" data-smazat-ne>Nechat</button>
</div>`;

  const prilohyHtml = prilohySekce(z);

  const telo = akce + prehledHtml + uprava
    + `<p class="ryska" style="margin-top:1.25rem">Kde to stojí</p>`
    + postupHtml + prilohyHtml;

  const proHledani = [z.id, z.nazev, z.nabidka, z.poznamka, k?.jmeno, k?.mesto]
    .filter(Boolean).join(" ");

  return rozbal({
    hlavni,
    vedle,
    telo,
    otevreno: jeVBehu(z),
    atributy: {
      "data-zakazka": z.id,
      "data-stav": z.stav,
      "data-text": proHledani,
      "data-nazev": z.nazev,
      "data-poznamka": z.poznamka || "",
      "data-nabidka": z.nabidka || "",
    },
  });
}

/** Jedna příloha v seznamu. Stejná značka se používá i jako vzor pro JS,
 *  aby nahraný soubor vypadal přesně jako ten, co přišel ze sestavení. */
function prilohaPolozka(x) {
  const volby = STITKY
    .map((s) => `<option value="${h(s)}"${s === x.stitek ? " selected" : ""}>`
      + `${h(STITKY_PRILOH[s][0])}</option>`)
    .join("");
  return `<li data-priloha data-stitek="${h(x.stitek)}" data-nazev="${h(x.nazev)}"
    data-velikost="${h(String(x.velikost ?? 0))}" data-druh="${h(x.druh ?? "jine")}"
    data-kdy="${h(x.kdy ?? "")}">
  <span class="priloha__znak">${ikona(IKONA_DRUHU[x.druh] ?? "soubor")}</span>
  <span class="priloha__nazev" data-zobraz="nazev">${h(x.nazev)}</span>
  <span class="priloha__meta" data-zobraz="meta">${h(velikost(x.velikost))}${
    x.kdy ? " · " + h(datumKratce(x.kdy)) : ""}</span>
  <select class="stitek-volba netisknout" data-stitek-volba
          aria-label="Štítek přílohy ${h(x.nazev)}">${volby}</select>
  <span class="stitek-tisk tisk-jen">${h(STITKY_PRILOH[x.stitek]?.[0] ?? x.stitek)}</span>
  <button type="button" class="priloha__tl netisknout" data-stahnout
          title="Stáhnout ${h(x.nazev)}">${ikona("stahnout")}</button>
  <button type="button" class="priloha__tl priloha__tl--pryc netisknout" data-priloha-pryc
          title="Odebrat ${h(x.nazev)}">${ikona("koš")}</button>
</li>`;
}

/** Přílohy zakázky: seznam se štítky, souhrn po štítcích a nahrávání. */
function prilohySekce(z) {
  const prilohy = seradPrilohy(z.prilohy ?? []);
  const p = poctyPriloh(prilohy);

  const souhrnStitku = STITKY
    .filter((s) => p.podleStitku[s] > 0)
    .map((s) => `<span class="stitek-pocet" data-stitek-pocet="${h(s)}">`
      + odznakZeSlovniku(STITKY_PRILOH, s)
      + `<span data-cislo>${cislo(p.podleStitku[s])}</span></span>`)
    .join("");

  return `<div class="prilohy" data-prilohy>
  <p class="ryska" style="margin-top:1.25rem">Přílohy
    <span class="stitky-souhrn" data-stitky-souhrn>${souhrnStitku}</span></p>
  <ul class="prilohy__seznam" data-prilohy-seznam>${prilohy.map(prilohaPolozka).join("")}</ul>
  <p class="prilohy__prazdno" data-prilohy-prazdno${prilohy.length ? " hidden" : ""}>Zatím tu nic není.
    Smlouva, zaměření, návrh i fotky z montáže patří sem — ať je všechno u zakázky pohromadě.</p>
  <div class="nahraj nahraj--priloha netisknout" data-prilohy-nahraj>
    <input type="file" id="soubory-${h(z.id)}" multiple hidden>
    <label class="tl tl--maly" for="soubory-${h(z.id)}">${ikona("pridat")} Přidat soubory</label>
    <span class="nahraj__text">nebo je sem přetáhněte — štítek se podle názvu nabídne sám</span>
  </div>
</div>`;
}

/** Vzor jedné přílohy pro JS: na stránce jednou, mimo seznamy. */
function vzorPrilohy() {
  return `<template data-vzor-prilohy>`
    + prilohaPolozka({ nazev: "", velikost: 0, stitek: "jine", druh: "jine", kdy: "" })
    + `</template>`;
}

/* ---------------------------------------------------------------- klienti */

export function klienti(ctx) {
  const { demo, stranka, dnes } = ctx;

  const radky = demo.klienti.map((k) => {
    const jehoPoptavky = demo.poptavky.filter((p) => p.klient === k.id);
    const jehoNabidky = demo.nabidky.filter((n) => n.klient === k.id);
    const jehoZakazky = demo.zakazky.filter((z) => z.klient === k.id);
    const jehoFaktury = demo.faktury.filter((f) => f.klient === k.id);
    const utratil = jehoFaktury.filter((f) => f.stav === "zaplacena")
      .reduce((s, f) => s + f.celkem, 0);

    const hlavni = `<strong>${h(k.jmeno)}</strong>`
      + `<span class="tabulka__pod">${h(k.mesto)}`
      + (k.typ === "firma" ? ` · IČ ${h(k.ico)}` : "") + `</span>`;
    const vedle = odznak(k.typ === "firma" ? "Firma" : "Koncový zákazník",
      k.typ === "firma" ? "modra" : "", true)
      + `<span>${sMnoznym(jehoNabidky.length, ["nabídka", "nabídky", "nabídek"])}</span>`;

    const historie = [
      ...jehoPoptavky.map((p) => ({ kdy: p.prijato, co: `Poptávka — ${h(p.zprava.slice(0, 60))}…`, kam: null })),
      ...jehoNabidky.map((n) => ({
        kdy: n.vystaveno,
        co: `Nabídka ${h(n.cislo)} — ${h(n.nazev)}`,
        kam: `administrace/crm/nabidka-${n.cislo}.html`,
      })),
      ...jehoZakazky.map((z) => ({ kdy: z.zahajeno, co: `Zakázka ${h(z.id)} — ${h(z.nazev)}`, kam: "administrace/crm/zakazky.html" })),
      ...jehoFaktury.filter((f) => f.vystaveno).map((f) => ({ kdy: f.vystaveno, co: `Faktura ${h(f.cislo)} — ${koruny(f.celkem)}`, kam: "administrace/crm/faktury.html" })),
    ].sort((a, b) => (a.kdy < b.kdy ? 1 : -1));

    const seznamHistorie = historie.length
      ? `<ul class="postup">` + historie.map((x) => `<li>`
        + `<span class="postup__znak" aria-hidden="true">·</span>`
        + `<span>${x.kam ? `<a href="${odkaz(stranka, x.kam)}">${x.co}</a>` : x.co}</span>`
        + `<span class="postup__kdy">${h(datumKratce(x.kdy))}</span></li>`).join("") + `</ul>`
      : `<p style="color:var(--text-tlumený)">Zatím nic.</p>`;

    const telo = popis([
      ["Spojení", `<a href="tel:${h(k.telefon.replace(/\s/g, ""))}">${h(k.telefon)}</a>`
        + (k.email ? `<br><a href="mailto:${h(k.email)}">${h(k.email)}</a>` : "")],
      ["Adresa", `${h(k.ulice)}<br>${h(k.psc)} ${h(k.mesto)}`],
      ...(k.ico ? [["IČ a DIČ", `${h(k.ico)}${k.dic ? ` · ${h(k.dic)}` : ""}`]] : []),
      ["V kartotéce od", h(datum(k.zalozen))],
      ["Zaplaceno celkem", `<strong>${koruny(utratil)}</strong>`],
      ...(k.poznamka ? [["Naše poznámka", h(k.poznamka)]] : []),
    ], { sloupce: true })
      + `<p class="ryska" style="margin-top:1.25rem">Co s ním bylo</p>`
      + seznamHistorie;

    return `<div id="${h(k.id)}" data-text-filtr="${h([k.jmeno, k.mesto, k.email, k.ico ?? ""].join(" ").toLowerCase())}">`
      + rozbal({ hlavni, vedle, telo })
      + `</div>`;
  }).join("");

  return {
    titulek: "Klienti",
    nadpis: "Kartotéka klientů",
    perex: "Zákazník zavolá po čtrnácti dnech a vy do něj napíšete jméno. Je u něj všechno — "
      + "co poptával, co se mu nabídlo, za kolik a jak to skončilo.",
    cesta: [{ nazev: "Administrace", kam: "administrace/nastenka.html" },
      { nazev: "CRM", kam: "administrace/crm/index.html" }, { nazev: "Klienti" }],
    faze: FAZE,
    telo: `<div class="filtry netisknout">`
      + `<label class="jen-pro-cteni" for="hledat-k">Hledat klienta</label>`
      + `<input type="search" id="hledat-k" placeholder="Jméno, město, IČ, e-mail…" data-hledat="#seznam-klientu">`
      + `<a class="tl tl--hlavni" href="#">${ikona("pridat")} Nový klient</a>`
      + `</div>`
      + karta({
        nadpis: `Klienti (${demo.klienti.length})`,
        telo: `<div id="seznam-klientu">${radky}</div>`
          + `<div class="prazdno" data-prazdno hidden>${ikona("hledat")}<strong>Nic se nenašlo</strong></div>`,
        tesne: true,
      }),
  };
}

/* ------------------------------------------------------------------ sklad */

export function sklad(ctx) {
  const { demo, dnes } = ctx;
  const karty = demo.sklad.karty;
  const chybi = podLimitem(karty);
  const chybiKody = new Set(chybi.map((k) => k.kod));

  const radky = karty.map((k) => {
    const s = stavKarty(k);
    const pod = chybiKody.has(k.kod);
    return {
      atributy: `data-text="${h([k.kod, k.nazev, k.umisteni].join(" ").toLowerCase())}"`
        + (pod ? ` data-stav="pod-limitem"` : ` data-stav="v-poradku"`),
      bunky: [
        `<span class="tabulka__hlavni">${h(k.nazev)}</span>`
        + `<span class="tabulka__pod">${h(k.kod)} · ${h(k.umisteni)}</span>`,
        `${cislo(s.naSklade, 1)} ${h(k.jednotka)}`,
        s.rezervovano ? `${cislo(s.rezervovano, 1)} ${h(k.jednotka)}` : "—",
        `<strong>${cislo(s.volne, 1)} ${h(k.jednotka)}</strong>`
        + (pod ? `<span class="tabulka__pod">${odznak(`chybí ${cislo(k.limit - s.volne, 1)}`, "zluta")}</span>` : ""),
        `${cislo(k.limit, 1)}`,
        koruny(s.naSklade * k.cena),
      ],
    };
  });

  const sloupce = [{ nazev: "Materiál" }, { nazev: "Na skladě", trida: "cisla" },
    { nazev: "Rezervováno", trida: "cisla" }, { nazev: "Volné", trida: "cisla" },
    { nazev: "Limit", trida: "cisla" }, { nazev: "Hodnota", trida: "cisla" }];

  const pata = `<tr><td colspan="5">Hodnota skladu celkem</td>`
    + `<td class="cisla">${koruny(hodnotaSkladu(karty))}</td></tr>`;

  const pohyby = tabulka({
    sevrena: true,
    sloupce: [{ nazev: "Kdy", trida: "uzke" }, { nazev: "Co" }, { nazev: "Kolik", trida: "cisla" },
      { nazev: "Kdo", trida: "uzke" }],
    radky: demo.sklad.pohyby.map((x) => {
      const k = karty.find((y) => y.kod === x.kod);
      const znak = x.druh === "prijem" ? "+" : x.druh === "vydej" ? "−" : "";
      const barva = { prijem: "zelena", vydej: "modra", rezervace: "zluta" }[x.druh] ?? "";
      return {
        bunky: [
          `${h(datumKratce(x.kdy))}<span class="tabulka__pod">${h(pred(x.kdy, dnes))}</span>`,
          `<span class="tabulka__hlavni">${h(k?.nazev ?? x.kod)}</span>`
          + `<span class="tabulka__pod">${h(x.popis)}</span>`,
          `<strong>${znak}${cislo(x.mnozstvi, 1)} ${h(k?.jednotka ?? "")}</strong>`
          + `<span class="tabulka__pod">${odznak(x.druh === "prijem" ? "příjem"
            : x.druh === "vydej" ? "výdej" : "rezervace", barva)}</span>`,
          h(x.kdo),
        ],
      };
    }),
  });

  const telo = `<div class="mriz mriz--3">`
    + dlazdice("Hodnota skladu", koruny(hodnotaSkladu(karty)), `${sMnoznym(karty.length, ["karta", "karty", "karet"])}`)
    + dlazdice("Pod limitem", `${chybi.length}`, chybi.length
      ? `nejvíc chybí ${h(chybi[0].nazev.toLowerCase())}`
      : "všechno je nad limitem")
    + dlazdice("Rezervováno na zakázky",
      `${cislo(karty.reduce((s, k) => s + stavKarty(k).rezervovano * k.cena, 0))} Kč`,
      "materiál, který už má svého zákazníka")
    + `</div>`
    + (chybi.length
      ? poznamka(`Pod limitem je <strong>${sMnoznym(chybi.length, ["položka", "položky", "položek"])}</strong>. `
        + `Nejdřív doplnit: ${chybi.slice(0, 3).map((k) => h(k.nazev)).join(", ")}.`, { jmenoIkony: "pozor" })
      : "")
    + karta({
      nadpis: "Skladové karty",
      vedle: `<div class="volby" data-filtr="#seznam-skladu">`
        + `<button class="volba" type="button" data-hodnota="" aria-pressed="true">Všechny</button>`
        + `<button class="volba" type="button" data-hodnota="pod-limitem" aria-pressed="false">Pod limitem</button>`
        + `</div>`,
      telo: `<div id="seznam-skladu">${tabulka({ sloupce, radky, pata })}</div>`,
      tesne: true,
      pata: "Papírová karta skončí. Příjem, výdej a rezervace na zakázku jsou tady "
        + "a volné množství se počítá samo.",
    })
    + karta({
      nadpis: "Pohyby na skladě",
      telo: pohyby,
      tesne: true,
    });

  return {
    titulek: "Sklad",
    nadpis: "Sklad",
    perex: "Co je na skladě, co je rezervované na rozdělané zakázky a co je potřeba doplnit.",
    cesta: [{ nazev: "Administrace", kam: "administrace/nastenka.html" },
      { nazev: "CRM", kam: "administrace/crm/index.html" }, { nazev: "Sklad" }],
    faze: FAZE,
    telo,
  };
}

/* ------------------------------------------------------- detail faktury */

/** Pruh nad dokladem: co je s fakturou teď a co s ní udělat. */
function pruhFaktury(f, dnes) {
  const stav = stavFaktury(f, dnes);
  if (stav === "zaplacena") {
    return ["plati", "hodiny",
      `Zaplaceno <strong>${h(datum(f.zaplaceno))}</strong>`
      + (f.splatnost ? ` — splatnost byla ${h(datum(f.splatnost))}.` : ".")];
  }
  if (stav === "po-splatnosti") {
    const d = dnuPoSplatnosti(f, dnes);
    return ["prosla", "pozor",
      `Po splatnosti o <strong>${sMnoznym(d, ["den", "dny", "dní"])}</strong>`
      + ` — splatnost byla ${h(datum(f.splatnost))}. Na tuhle zavolat.`];
  }
  if (stav === "navrh") {
    return ["konci", "hodiny",
      "Návrh — faktura ještě není vystavená. Dokud ji nevystavíte, dá se do ní sahat."];
  }
  const d = dnuMezi(dnes, f.splatnost);
  return ["plati", "hodiny",
    `Splatnost <strong>${h(datum(f.splatnost))}</strong>`
    + (d === 0 ? " — dnes je poslední den." : ` — ještě ${sMnoznym(d, ["den", "dny", "dní"])}.`)];
}

export function fakturaDetail(ctx, f) {
  const { demo, stranka, dnes } = ctx;
  const k = klient(ctx, f.klient);
  const s = souhrn(f);
  const stav = stavFaktury(f, dnes);
  const platba = demo.platba;
  const vs = variabilniSymbol(f.cislo);
  const [tridaPruhu, ikonaPruhu, textPruhu] = pruhFaktury(f, dnes);

  const radkyPolozek = f.polozky.map((p) => `<tr>
  <td>${h(p.nazev)}</td>
  <td class="cisla">${h(cislo(p.mnozstvi, p.mnozstvi % 1 ? 2 : 0))}</td>
  <td class="uzke">${h(p.jednotka)}</td>
  <td class="cisla">${koruny(p.cena)}</td>
  <td class="cisla">${p.sleva ? `${h(cislo(p.sleva, 0))} %` : "—"}</td>
  <td class="cisla">${p.dph ?? 21} %</td>
  <td class="cisla"><strong>${koruny(polozkaCelkem(p))}</strong></td>
</tr>`).join("");

  const souhrnCeny = `<div class="souhrn-ceny">
  <div><span>Celkem bez DPH</span><span>${koruny(s.bezDph)}</span></div>
  ${s.dph.map((d) => `<div><span>DPH ${d.sazba} % ze ${koruny(d.zaklad)}</span>`
    + `<span>${koruny(d.dan, true)}</span></div>`).join("")}
  ${s.zaokrouhleni ? `<div><span>Zaokrouhlení</span><span>${koruny(s.zaokrouhleni, true)}</span></div>` : ""}
  <div class="souhrn-ceny__celkem"><span>Celkem k zaplacení</span><span>${koruny(s.celkem)}</span></div>
</div>`;

  const dokument = `<div class="dokument" data-faktura="${h(f.cislo)}"
  data-stav="${h(stav)}" data-vlastni-stav="${h(f.stav)}" data-celkem="${s.celkem}"
  data-klient="${h(k?.jmeno ?? "")}" data-popis="${h(f.popis ?? "")}"
  data-vystaveno="${h(f.vystaveno ?? "")}" data-splatnost="${h(f.splatnost ?? "")}"
  data-zaplaceno="${h(f.zaplaceno ?? "")}">
  <header class="dokument__hlava">
    <div>
      <p class="ryska">Faktura — daňový doklad</p>
      <h2>${h(f.cislo)}</h2>
      <p style="color:var(--text-tlumený);margin-top:0.25rem">Vystaveno
        <span data-vystaveno-text data-dlouhe>${f.vystaveno ? h(datum(f.vystaveno)) : "—"}</span></p>
    </div>
    <div class="dokument__znacka">${znackaDodavatele(ctx)}</div>
  </header>

  <div class="dokument__strany">
    <div>
      <h3>Odběratel</h3>
      <p>${adresaKlienta(k)}</p>
      ${k?.email ? `<p style="color:var(--text-tlumený)">${h(k.email)}${k.telefon ? ` · ${h(k.telefon)}` : ""}</p>` : ""}
    </div>
    <div>
      <h3>Platební údaje</h3>
      <p><strong>${h(platba.ucet)}</strong></p>
      <p style="color:var(--text-tlumený)">${h(platba.banka)}<br>
        IBAN ${h(iban(platba.ucet, { mezery: true }))}</p>
      <p style="margin-top:0.375rem">Variabilní symbol <strong>${h(vs)}</strong></p>
    </div>
    <div>
      <h3>Splatnost</h3>
      <p><strong data-splatnost-text data-dlouhe>${f.splatnost ? h(datum(f.splatnost)) : "—"}</strong></p>
      <p style="color:var(--text-tlumený)">${h(platba.forma)}${
        f.zNabidky ? `<br>Z nabídky ${h(f.zNabidky)}` : ""}</p>
    </div>
  </div>

  <div class="tabulka-obal">
    <table class="tabulka">
      <thead><tr>
        <th>Položka</th><th class="cisla">Množství</th><th>Jedn.</th>
        <th class="cisla">Cena / jedn.</th><th class="cisla">Sleva</th>
        <th class="cisla">DPH</th><th class="cisla">Celkem</th>
      </tr></thead>
      <tbody>${radkyPolozek}</tbody>
    </table>
  </div>

  <div style="margin-top:1.5rem">${souhrnCeny}</div>

  <div class="k-zaplaceni" data-k-zaplaceni>
    <div>
      <p class="ryska">K zaplacení</p>
      <p class="k-zaplaceni__castka">${koruny(s.celkem)}</p>
    </div>
    <dl class="k-zaplaceni__udaje">
      <div><dt>Účet</dt><dd>${h(platba.ucet)}</dd></div>
      <div><dt>Variabilní symbol</dt><dd>${h(vs)}</dd></div>
      <div><dt>Splatnost</dt><dd><span data-splatnost-text data-dlouhe>${f.splatnost ? h(datum(f.splatnost)) : "—"}</span></dd></div>
    </dl>
  </div>

  ${f.popis ? `<p style="margin-top:1.5rem;color:var(--text-tlumený)">${h(f.popis)}</p>` : ""}

  <p class="tisk-jen" style="margin-top:2rem;font-size:9pt;color:#555">
    Faktura je daňový doklad. Nejsme plátci ani příjemci záloh nad rámec uvedených položek.
    Při platbě uveďte variabilní symbol ${h(vs)}.
  </p>
</div>`;

  const akce = `<button class="tl tl--hlavni" type="button" data-tisk>${ikona("tisk")} Tisk nebo PDF</button>`
    + `<button class="tl" type="button" data-tl-vystavit`
    + `${f.stav === "navrh" ? "" : " hidden"}>${ikona("faktury")} Vystavit fakturu</button>`
    + `<button class="tl" type="button" data-tl-zaplaceno`
    + `${f.stav === "navrh" || f.stav === "zaplacena" ? " hidden" : ""}>`
    + `${ikona("fajfka")} Označit jako zaplacenou</button>`
    + (k?.email
      ? `<a class="tl" href="mailto:${h(k.email)}?subject=${encodeURIComponent(`Faktura ${f.cislo} — KORO-SKLO`)}">`
        + `${ikona("obalka")} Odeslat e-mailem</a>`
      : "")
    + (f.zNabidky
      ? `<a class="tl" href="${odkaz(stranka, `administrace/crm/nabidka-${f.zNabidky}.html`)}">`
        + `${ikona("nabidky")} Nabídka ${h(f.zNabidky)}</a>`
      : "");

  const telo = `<div class="platnost platnost--${tridaPruhu} netisknout" data-pruh>`
    + ikona(ikonaPruhu)
    + `<span data-pruh-text>${textPruhu}</span></div>`
    + dokument
    + poznamka("Položky se berou z přijaté nabídky, takže se nepřepisují podruhé. "
      + "Variabilní symbol a IBAN se počítají z čísla faktury a z čísla účtu. "
      + "Tady jde o ukázku — v ostré verzi se faktura uloží a zůstane dohledatelná.",
      { tisknout: false });

  return {
    titulek: `Faktura ${f.cislo}`,
    nadpis: `Faktura ${f.cislo}`,
    perex: k ? `${k.jmeno} — ${f.popis}` : f.popis,
    cesta: [{ nazev: "Administrace", kam: "administrace/nastenka.html" },
      { nazev: "CRM", kam: "administrace/crm/index.html" },
      { nazev: "Faktury", kam: "administrace/crm/faktury.html" },
      { nazev: f.cislo }],
    faze: FAZE,
    akce,
    telo,
  };
}

/* ---------------------------------------------------------------- faktury */

export function faktury(ctx) {
  const { demo, stranka, dnes } = ctx;
  const p = prehled(demo.faktury, dnes);

  const radky = demo.faktury.map((f) => {
    const k = klient(ctx, f.klient);
    const stav = stavFaktury(f, dnes);
    const poSplatnosti = dnuPoSplatnosti(f, dnes);
    const detail = odkaz(stranka, `administrace/crm/faktura-${f.cislo}.html`);
    return {
      atributy: `data-stav="${h(stav)}" data-faktura="${h(f.cislo)}"`
        + ` data-klient="${h(k?.jmeno ?? "")}" data-popis="${h(f.popis ?? "")}"`
        + ` data-celkem="${f.celkem}" data-vystaveno="${h(f.vystaveno ?? "")}"`
        + ` data-splatnost="${h(f.splatnost ?? "")}" data-zaplaceno="${h(f.zaplaceno ?? "")}"`
        + ` data-vlastni-stav="${h(f.stav)}"`
        + ` data-text="${h([f.cislo, k?.jmeno, f.popis].join(" ").toLowerCase())}"`,
      bunky: [
        `<a class="tabulka__hlavni" href="${detail}">${h(f.cislo)}</a>`
        + `<span class="tabulka__pod">VS ${h(variabilniSymbol(f.cislo))}</span>`,
        `<span class="tabulka__hlavni">${h(k?.jmeno ?? "—")}</span>`
        + `<span class="tabulka__pod">${h(f.popis)}</span>`,
        f.zNabidky
          ? `<a href="${odkaz(stranka, `administrace/crm/nabidka-${f.zNabidky}.html`)}">${h(f.zNabidky)}</a>`
          : `<span style="color:var(--text-slabý)">—</span>`,
        `<span data-vystaveno-text>${f.vystaveno ? h(datumKratce(f.vystaveno)) : "—"}</span>`,
        `<span data-splatnost-text>${f.splatnost ? h(datumKratce(f.splatnost)) : "—"}</span>`
        + `<span class="tabulka__pod" data-po-splatnosti${poSplatnosti ? "" : " hidden"}>`
        + (poSplatnosti ? `+${sMnoznym(poSplatnosti, ["den", "dny", "dní"])}` : "") + `</span>`,
        `<span data-odznak>${odznakZeSlovniku(STAVY_FAKTUR, stav)}</span>`,
        `<strong>${koruny(f.celkem)}</strong>`,
        `<span class="radek-akce netisknout">`
        + `<button class="tl tl--tichy tl--maly" type="button" data-tl-vystavit`
        + `${f.stav === "navrh" ? "" : " hidden"}`
        + ` title="Vystavit fakturu">${ikona("faktury")}`
        + `<span class="jen-pro-cteni">Vystavit</span></button>`
        + `<button class="tl tl--tichy tl--maly" type="button" data-tl-zaplaceno`
        + `${f.stav === "navrh" || f.stav === "zaplacena" ? " hidden" : ""}`
        + ` title="Označit jako zaplacenou">${ikona("fajfka")}`
        + `<span class="jen-pro-cteni">Zaplaceno</span></button>`
        + `<a class="tl tl--tichy tl--maly" href="${detail}" title="Otevřít fakturu">`
        + `${ikona("sipka")}<span class="jen-pro-cteni">Otevřít</span></a>`
        + `</span>`,
      ],
    };
  });

  const telo = `<div class="mriz mriz--3" data-prehled>`
    + dlazdice("Zaplaceno", `<span data-sucet="zaplaceno">${koruny(p.zaplaceno)}</span>`,
      `<span data-pocet="zaplacena">${sMnoznym(p.pocty.zaplacena, ["faktura", "faktury", "faktur"])}</span>`)
    + dlazdice("Nezaplaceno", `<span data-sucet="nezaplaceno">${koruny(p.nezaplaceno)}</span>`,
      `<span data-pocet="nezaplacene">${sMnoznym(p.pocty.vystavena + p.pocty["po-splatnosti"], ["faktura", "faktury", "faktur"])}</span> vystavených`)
    + dlazdice("Po splatnosti", `<span data-sucet="poSplatnosti">${koruny(p.poSplatnosti)}</span>`,
      `<span data-pocet="po-splatnosti">${sMnoznym(p.pocty["po-splatnosti"], ["faktura", "faktury", "faktur"])}</span> — na tyhle zavolat`)
    + `</div>`
    + `<div class="filtry netisknout">`
    + `<label class="jen-pro-cteni" for="hledat-f">Hledat fakturu</label>`
    + `<input type="search" id="hledat-f" placeholder="Číslo, klient, co to bylo…" data-hledat="#seznam-faktur">`
    + `<div class="volby" data-filtr="#seznam-faktur">`
    + `<button class="volba" type="button" data-hodnota="" aria-pressed="true">Všechny</button>`
    + `<button class="volba" type="button" data-hodnota="po-splatnosti" aria-pressed="false">Po splatnosti</button>`
    + `<button class="volba" type="button" data-hodnota="vystavena" aria-pressed="false">Vystavené</button>`
    + `<button class="volba" type="button" data-hodnota="zaplacena" aria-pressed="false">Zaplacené</button>`
    + `</div>`
    + `<button class="tl tl--maly" type="button" data-export-ucetni>${ikona("stahnout")} Export pro účetní</button>`
    + `</div>`
    + karta({
      nadpis: `Faktury (${demo.faktury.length})`,
      telo: `<div id="seznam-faktur">`
        + tabulka({
          sloupce: [{ nazev: "Číslo", trida: "uzke" }, { nazev: "Klient a co to bylo" },
            { nazev: "Z nabídky", trida: "uzke" }, { nazev: "Vystaveno", trida: "uzke" },
            { nazev: "Splatnost", trida: "uzke" }, { nazev: "Stav", trida: "uzke" },
            { nazev: "Celkem", trida: "cisla" }, { nazev: "", trida: "uzke netisknout" }],
          radky,
        })
        + `</div>`
        + `<div class="prazdno" data-prazdno hidden>${ikona("hledat")}<strong>Nic se nenašlo</strong></div>`,
      tesne: true,
      pata: "Faktura se dělá z přijaté nabídky, takže se položky nepřepisují podruhé. "
        + "Variabilní symbol se bere z čísla faktury. Zaplacenou fakturu označíte "
        + "fajfkou v řádku — čísla nahoře se přepočítají hned.",
    })
    + poznamka("Export pro účetní stáhne tabulku se středníky, kterou otevře Excel "
      + "i účetní program. Přímé napojení se dá dodělat podle toho, co vaše účetní používá.");

  return {
    titulek: "Faktury",
    nadpis: "Faktury",
    perex: "Z hotové zakázky vznikne faktura. Je vidět, kdo ještě nezaplatil "
      + "a jak dlouho už je po splatnosti.",
    cesta: [{ nazev: "Administrace", kam: "administrace/nastenka.html" },
      { nazev: "CRM", kam: "administrace/crm/index.html" }, { nazev: "Faktury" }],
    faze: FAZE,
    telo,
  };
}
