/** Chování administrace. Modul — přepočet nabídky jede na stejném kódu
 *  (src/lib/nabidka.mjs), kterým se sestavuje web. Nic se neukládá na server:
 *  ukázka si pamatuje změny jen do obnovení stránky.
 */

import { polozkaCelkem, souhrn } from "./lib/nabidka.mjs";
import { koruny, datum, datumKratce, sMnoznym } from "./lib/cestina.mjs";
import { kdy } from "./lib/kdy.mjs";
import { postup, pocty, filtruj, dalsiStav, zmenStav, oznacKrok, STAVY }
  from "./lib/zakazky.mjs";
import { STITKY, prijmi, pocty as poctyPriloh, serad as seradPrilohy, velikost }
  from "./lib/prilohy.mjs";
import { stavFaktury, dnuPoSplatnosti, prehled } from "./lib/faktura.mjs";
import { oznacZaplacenou, vystav, csvProUcetni, nazevSouboru } from "./lib/platba.mjs";
import { lzeFakturovat, zeZakazky } from "./lib/fakturace.mjs";

/** Den, ke kterému je ukázka postavená (sestavení ho dá do <body>). */
const DNES = document.body.dataset.dnes || new Date().toISOString().slice(0, 10);

/* ------------------------------------------------------------------ hlášky */

let hlaskaCas = 0;

function hlaska(text) {
  document.querySelector(".hlaska")?.remove();
  const p = document.createElement("p");
  p.className = "hlaska";
  p.setAttribute("role", "status");
  p.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"`
    + ` stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">`
    + `<path d="m4.5 12.5 4.5 4.5 10-10.5"/></svg><span></span>`;
  p.querySelector("span").textContent = text;
  document.body.append(p);
  clearTimeout(hlaskaCas);
  hlaskaCas = setTimeout(() => p.remove(), 4200);
}

/* ------------------------------------------------------------- levý panel */

function panel() {
  const tlacitko = document.querySelector("[data-panel-prepnout]");
  if (!tlacitko) return;

  const prepni = (stav) => {
    document.body.dataset.panel = stav ? "otevreny" : "";
    tlacitko.setAttribute("aria-expanded", String(stav));
  };

  tlacitko.addEventListener("click", () => {
    prepni(document.body.dataset.panel !== "otevreny");
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.body.dataset.panel === "otevreny") prepni(false);
  });

  document.addEventListener("click", (e) => {
    if (document.body.dataset.panel !== "otevreny") return;
    if (e.target.closest(".boc") || e.target.closest("[data-panel-prepnout]")) return;
    prepni(false);
  });
}

/* ---------------------------------------------------------------- filtry */

/** Jednotky, které se filtrují: řádek tabulky nebo obal rozkládacího řádku. */
function jednotky(obal) {
  return [...obal.querySelectorAll("[data-text], [data-text-filtr], [data-stav]")]
    .filter((e) => !e.matches("input, textarea, select"));
}

function prefiltruj(obal) {
  const hledane = (obal.dataset.hledane || "").trim().toLowerCase();
  const stavy = (obal.dataset.stavy || "").split(",").filter(Boolean);
  let videt = 0;

  for (const j of jednotky(obal)) {
    const text = (j.dataset.text || j.dataset.textFiltr || "").toLowerCase();
    const sedi = (!hledane || text.includes(hledane))
      && (!stavy.length || stavy.includes(j.dataset.stav));
    j.hidden = !sedi;
    if (sedi) videt += 1;
  }

  const prazdno = obal.parentElement?.querySelector("[data-prazdno]");
  if (prazdno) prazdno.hidden = videt > 0;
}

function filtry() {
  for (const pole of document.querySelectorAll("[data-hledat]")) {
    const obal = document.querySelector(pole.dataset.hledat);
    if (!obal) continue;
    pole.addEventListener("input", () => {
      obal.dataset.hledane = pole.value;
      prefiltruj(obal);
    });
  }

  for (const skupina of document.querySelectorAll("[data-filtr]")) {
    const obal = document.querySelector(skupina.dataset.filtr);
    if (!obal) continue;
    skupina.addEventListener("click", (e) => {
      const tl = e.target.closest("[data-hodnota]");
      if (!tl) return;
      for (const b of skupina.querySelectorAll("[data-hodnota]")) {
        b.setAttribute("aria-pressed", String(b === tl));
      }
      obal.dataset.stavy = tl.dataset.hodnota;
      prefiltruj(obal);
    });
  }
}

/* ------------------------------------------------------- ukládání (ukázka) */

function ukladani() {
  document.addEventListener("click", (e) => {
    const tl = e.target.closest("[data-uloz]");
    if (!tl) return;
    hlaska("Takhle se změna uloží. V ukázce zůstane jen do obnovení stránky.");
  });

  document.addEventListener("click", (e) => {
    const tl = e.target.closest("[data-skryj]");
    if (!tl) return;
    hlaska("Realizace by se skryla z webu. Nesmaže se — dá se kdykoli vrátit.");
  });

  document.addEventListener("click", (e) => {
    const tl = e.target.closest("[data-posun]");
    if (!tl) return;
    const radek = tl.closest("details");
    const kam = Number(tl.dataset.posun);
    const soused = kam < 0 ? radek.previousElementSibling : radek.nextElementSibling;
    if (!soused || soused.tagName !== "DETAILS") {
      hlaska(kam < 0 ? "Tahle služba je první." : "Tahle služba je poslední.");
      return;
    }
    if (kam < 0) soused.before(radek); else soused.after(radek);
    radek.scrollIntoView({ block: "nearest" });
    hlaska("Pořadí na webu by se změnilo.");
  });
}

/* ------------------------------------------------------------------ fotky */

function fotky() {
  document.addEventListener("click", (e) => {
    const posun = e.target.closest("[data-fotka-posun]");
    if (posun) {
      const fotka = posun.closest("[data-fotka]");
      const kam = Number(posun.dataset.fotkaPosun);
      const soused = kam < 0 ? fotka.previousElementSibling : fotka.nextElementSibling;
      if (!soused || !soused.matches("[data-fotka]")) {
        hlaska(kam < 0 ? "Tahle fotka je první." : "Tahle fotka je poslední.");
        return;
      }
      if (kam < 0) soused.before(fotka); else soused.after(fotka);
      precislujFotky(fotka.closest("[data-fotky]"));
      hlaska("Pořadí fotek by se na webu změnilo.");
      return;
    }

    const skryj = e.target.closest("[data-fotka-skryj]");
    if (skryj) {
      const fotka = skryj.closest("[data-fotka]");
      fotka.style.opacity = fotka.style.opacity === "0.3" ? "" : "0.3";
      hlaska(fotka.style.opacity === "0.3"
        ? "Fotka by se z webu skryla. Zůstane uložená."
        : "Fotka je zpátky.");
      return;
    }

    if (e.target.closest("[data-pridat-fotku]")) {
      hlaska("Tady by se vybrala fotka z počítače nebo z mobilu.");
    }
  });
}

function precislujFotky(mriz) {
  if (!mriz) return;
  [...mriz.querySelectorAll("[data-fotka]")].forEach((f, i) => {
    const znak = f.querySelector(".fotka-polozka__poradi");
    if (znak) znak.textContent = String(i + 1);
  });
}

/* -------------------------------------------------------- nabídka: přepočet */

/** Z českého zápisu („1 234,50“) udělá číslo. */
function cisloZTextu(text) {
  const cisty = String(text ?? "")
    .replace(/ | |\s/g, "")
    .replace(/−/g, "-")
    .replace(",", ".");
  const n = Number(cisty);
  return Number.isFinite(n) ? n : 0;
}

function polozkyZDomu(dokument) {
  return [...dokument.querySelectorAll("[data-polozka]")].map((tr) => {
    const dej = (pole) => tr.querySelector(`[data-pole="${pole}"]`)?.value ?? "";
    const sleva = cisloZTextu(dej("sleva"));
    const p = {
      nazev: dej("nazev"),
      mnozstvi: cisloZTextu(dej("mnozstvi")),
      jednotka: dej("jednotka"),
      cena: cisloZTextu(dej("cena")),
      dph: cisloZTextu(tr.querySelector("[data-dph]")?.dataset.dph ?? 21),
    };
    if (sleva) p.sleva = sleva;
    return p;
  });
}

function prepocitej(dokument) {
  const polozky = polozkyZDomu(dokument);

  [...dokument.querySelectorAll("[data-polozka]")].forEach((tr, i) => {
    const bunka = tr.querySelector("[data-celkem]");
    if (bunka) bunka.textContent = koruny(polozkaCelkem(polozky[i]));
  });

  const s = souhrn({
    polozky,
    zaokrouhlit: dokument.dataset.zaokrouhlit !== "false",
    platceDph: dokument.dataset.platceDph !== "false",
  });

  const obal = dokument.querySelector("[data-souhrn]");
  if (!obal) return;

  const radky = [`<div><span>Celkem bez DPH</span><span>${koruny(s.bezDph)}</span></div>`];
  for (const d of s.dph) {
    radky.push(`<div><span>DPH ${d.sazba} % ze ${koruny(d.zaklad)}</span>`
      + `<span>${koruny(d.dan, true)}</span></div>`);
  }
  if (s.zaokrouhleni) {
    radky.push(`<div><span>Zaokrouhlení</span><span>${koruny(s.zaokrouhleni, true)}</span></div>`);
  }
  radky.push(`<div class="souhrn-ceny__celkem"><span>Celkem k zaplacení</span>`
    + `<span>${koruny(s.celkem)}</span></div>`);
  obal.innerHTML = radky.join("");
}

function novaPolozka() {
  const tr = document.createElement("tr");
  tr.setAttribute("data-polozka", "");
  tr.innerHTML = `
  <td><input type="text" value="" data-pole="nazev" aria-label="Co to je"><span class="tisk-jen" data-tisk-text></span></td>
  <td class="cisla"><input type="text" value="1" data-pole="mnozstvi" style="width:5rem;text-align:right" aria-label="Množství"></td>
  <td class="uzke"><input type="text" value="ks" data-pole="jednotka" style="width:4rem" aria-label="Jednotka"></td>
  <td class="cisla"><input type="text" value="0" data-pole="cena" style="width:6rem;text-align:right" aria-label="Cena za jednotku"></td>
  <td class="cisla"><input type="text" value="" data-pole="sleva" placeholder="0" style="width:3.5rem;text-align:right" aria-label="Sleva v procentech"></td>
  <td class="cisla" data-dph="21">21 %</td>
  <td class="cisla"><strong data-celkem>0 Kč</strong></td>
  <td class="uzke netisknout"><button class="tl tl--tichy tl--maly" type="button" data-smaz-polozku aria-label="Odebrat položku">✕</button></td>`;
  return tr;
}

/** Název položky se tiskne jako text — políčko by dlouhý název uřízlo. */
function srovnejTiskovyText(dokument) {
  for (const pole of dokument.querySelectorAll("[data-pole='nazev']")) {
    const text = pole.parentElement.querySelector("[data-tisk-text]");
    if (text) text.textContent = pole.value;
  }
}

function nabidka() {
  const dokument = document.querySelector("[data-nabidka]");
  if (!dokument) return;

  dokument.addEventListener("input", (e) => {
    if (!e.target.matches("[data-pole]")) return;
    if (e.target.matches("[data-pole='nazev']")) srovnejTiskovyText(dokument);
    prepocitej(dokument);
  });

  dokument.addEventListener("click", (e) => {
    if (e.target.closest("[data-pridat-polozku]")) {
      const telo = dokument.querySelector("[data-polozky] tbody");
      const tr = novaPolozka();
      telo.append(tr);
      tr.querySelector("[data-pole='nazev']").focus();
      prepocitej(dokument);
      return;
    }

    const smaz = e.target.closest("[data-smaz-polozku]");
    if (smaz) {
      const radky = dokument.querySelectorAll("[data-polozka]");
      if (radky.length <= 1) {
        hlaska("Nabídka musí mít aspoň jednu položku.");
        return;
      }
      smaz.closest("[data-polozka]").remove();
      prepocitej(dokument);
    }
  });

  for (const tl of document.querySelectorAll("[data-tisk]")) {
    tl.addEventListener("click", () => window.print());
  }
  window.addEventListener("beforeprint", () => srovnejTiskovyText(dokument));

  srovnejTiskovyText(dokument);
  prepocitej(dokument);
}

/* ---------------------------------------------------------------- zakázky */

/** Názvy a barvy stavů — stejný slovník jako v šabloně (src/templates/crm.mjs). */
const STAV_ZAKAZKY = {
  priprava: ["Příprava", ""],
  vyroba: ["Ve výrobě", "modra"],
  montaz: ["Montáž", "zlata"],
  hotovo: ["Hotovo", "zelena"],
};

/** Zakázky, jak je zrovna vidí stránka — čte se z atributů řádků. */
function zakazkyZeStranky(obal) {
  return [...obal.querySelectorAll("[data-zakazka]")].map((el) => ({
    el,
    id: el.dataset.zakazka,
    stav: el.dataset.stav,
    nazev: el.dataset.nazev || "",
    poznamka: el.dataset.poznamka || "",
    nabidka: el.dataset.nabidka || "",
    hledatelne: el.dataset.text || "",
  }));
}

function prekresliOdznak(radek) {
  const [nazev, barva] = STAV_ZAKAZKY[radek.dataset.stav] ?? [radek.dataset.stav, ""];
  const misto = radek.querySelector("[data-odznak]");
  if (!misto) return;
  misto.innerHTML = `<span class="odznak${barva ? ` odznak--${barva}` : ""}">${nazev}</span>`;
}

function prekresliKroky(radek) {
  const polozky = [...radek.querySelectorAll("[data-postup] li")];
  const zakazka = {
    kroky: polozky.map((li) => [
      li.querySelector("span")?.textContent ?? "",
      "",
      li.hasAttribute("data-hotovo"),
    ]),
  };
  const stav = postup(zakazka);
  const pocet = radek.querySelector("[data-kroky]");
  if (pocet) pocet.textContent = `${stav.hotovych}/${stav.celkem} kroků`;

  polozky.forEach((li, i) => {
    const hotovo = zakazka.kroky[i][2];
    const ted = !hotovo && stav.dalsi === zakazka.kroky[i];
    li.toggleAttribute("data-hotovo", hotovo);
    li.toggleAttribute("data-ted", ted);
    const tl = li.querySelector("[data-krok]");
    if (!tl) return;
    tl.setAttribute("aria-pressed", String(hotovo));
    tl.title = hotovo ? "Odškrtnout krok" : "Označit jako hotový";
    tl.innerHTML = hotovo
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"`
        + ` stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">`
        + `<path d="m4.5 12.5 4.5 4.5 10-10.5"/></svg>`
      : String(i + 1);
  });
}

/** Filtr a počty u voleb. Hledá se přes src/lib/zakazky.mjs — stejný kód,
 *  jakým se stránka sestavuje, takže diakritika nerozhoduje. */
function prefiltrujZakazky(obal) {
  const vsechny = zakazkyZeStranky(obal);
  const stavy = (obal.dataset.stavy || "").split(",").filter(Boolean);
  const hledane = obal.dataset.hledane || "";

  const vybrane = new Set(
    filtruj(vsechny.map((z) => ({ ...z, nazev: z.hledatelne })), { stavy, hledane })
      .map((z) => z.id),
  );
  for (const z of vsechny) z.el.hidden = !vybrane.has(z.id);

  const soucty = pocty(vsechny);
  const karta = obal.closest(".karta");
  for (const [klic, kolik] of [["vse", soucty.celkem], ["hotovo", soucty.hotove],
    ["priprava,vyroba,montaz", soucty.vBehu]]) {
    const misto = document.querySelector(`[data-pocet="${klic}"]`);
    if (misto) misto.textContent = String(kolik);
  }
  const videt = karta?.querySelector("[data-videt]");
  if (videt) {
    videt.textContent = vybrane.size === soucty.celkem
      ? `${soucty.celkem} celkem`
      : `${vybrane.size} z ${soucty.celkem}`;
  }
  const prazdno = obal.parentElement?.querySelector("[data-prazdno]");
  if (prazdno) prazdno.hidden = vybrane.size > 0;
}

function zakazkyFiltr(obal) {
  for (const pole of document.querySelectorAll("[data-hledat-z]")) {
    pole.addEventListener("input", () => {
      obal.dataset.hledane = pole.value;
      prefiltrujZakazky(obal);
    });
  }
  for (const skupina of document.querySelectorAll("[data-filtr-z]")) {
    skupina.addEventListener("click", (e) => {
      const tl = e.target.closest("[data-hodnota]");
      if (!tl) return;
      for (const b of skupina.querySelectorAll("[data-hodnota]")) {
        b.setAttribute("aria-pressed", String(b === tl));
      }
      obal.dataset.stavy = tl.dataset.hodnota;
      prefiltrujZakazky(obal);
    });
  }
}

function zakazkyAkce(obal) {
  obal.addEventListener("click", (e) => {
    const radek = e.target.closest("[data-zakazka]");
    if (!radek) return;

    /* odškrtnutí kroku */
    const krok = e.target.closest("[data-krok]");
    if (krok) {
      e.preventDefault();
      const i = Number(krok.dataset.krok);
      const bylo = krok.closest("li").hasAttribute("data-hotovo");
      const polozky = [...radek.querySelectorAll("[data-postup] li")];
      const zakazka = {
        kroky: polozky.map((li) => ["", "", li.hasAttribute("data-hotovo")]),
      };
      const nova = oznacKrok(zakazka, i, !bylo);
      polozky.forEach((li, j) => li.toggleAttribute("data-hotovo", nova.kroky[j][2]));
      prekresliKroky(radek);
      hlaska(bylo ? "Krok se zase otevřel." : "Krok je hotový. Zapíše se, kdo a kdy ho odškrtl.");
      return;
    }

    /* posun o stav dál */
    if (e.target.closest("[data-dal]")) {
      const dalsi = dalsiStav(radek.dataset.stav);
      if (!dalsi) {
        hlaska("Zakázka je hotová — dál už to nejde.");
        return;
      }
      nastavStav(radek, dalsi, obal);
      return;
    }

    /* faktura ze zakázky */
    if (e.target.closest("[data-fakturovat]")) {
      const kontrola = lzeFakturovat(zakazkaZPrvku(radek), fakturyProZakazky());
      if (!kontrola.muze) {
        hlaska(kontrola.duvod);
        return;
      }
      if (kontrola.varovani) {
        const potvrzeni = radek.querySelector("[data-fakturovat-potvrzeni]");
        potvrzeni.querySelector("[data-fakturovat-duvod]").textContent =
          `${kontrola.varovani} Fakturu můžete vystavit i tak.`;
        potvrzeni.hidden = false;
        return;
      }
      fakturujZakazku(radek);
      return;
    }
    if (e.target.closest("[data-fakturovat-ne]")) {
      radek.querySelector("[data-fakturovat-potvrzeni]").hidden = true;
      return;
    }
    if (e.target.closest("[data-fakturovat-ano]")) {
      radek.querySelector("[data-fakturovat-potvrzeni]").hidden = true;
      fakturujZakazku(radek);
      return;
    }

    /* úprava */
    if (e.target.closest("[data-upravit]")) {
      radek.querySelector("[data-uprava]").hidden = false;
      radek.querySelector("[data-zobrazeni]").hidden = true;
      radek.querySelector("[data-uprava] [data-pole='nazev']")?.focus();
      return;
    }
    if (e.target.closest("[data-zrusit]")) {
      radek.querySelector("[data-uprava]").hidden = true;
      radek.querySelector("[data-zobrazeni]").hidden = false;
      return;
    }

    /* mazání */
    if (e.target.closest("[data-smazat]")) {
      radek.querySelector("[data-potvrzeni]").hidden = false;
      return;
    }
    if (e.target.closest("[data-smazat-ne]")) {
      radek.querySelector("[data-potvrzeni]").hidden = true;
      return;
    }
    if (e.target.closest("[data-smazat-ano]")) {
      radek.remove();
      prefiltrujZakazky(obal);
      hlaska("Zakázka by se přesunula do archivu — smazat ji nadobro umí jen majitel.");
    }
  });

  /* změna stavu výběrem */
  obal.addEventListener("change", (e) => {
    const volba = e.target.closest("[data-stav-volba]");
    if (!volba) return;
    nastavStav(e.target.closest("[data-zakazka]"), volba.value, obal);
  });

  /* uložení úpravy */
  obal.addEventListener("submit", (e) => {
    const form = e.target.closest("[data-uprava]");
    if (!form) return;
    e.preventDefault();
    const radek = e.target.closest("[data-zakazka]");
    const hodnota = (jmeno) => form.querySelector(`[data-pole='${jmeno}']`)?.value.trim() ?? "";

    const nazev = hodnota("nazev") || radek.dataset.nazev;
    const termin = hodnota("termin");
    const pozn = hodnota("poznamka");

    radek.dataset.nazev = nazev;
    radek.dataset.poznamka = pozn;
    radek.dataset.text = [radek.dataset.zakazka, nazev, radek.dataset.nabidka, pozn].join(" ");
    radek.querySelector("[data-zobraz='nazev']").textContent = nazev;
    radek.querySelector("[data-zobraz='poznamka']").textContent = pozn || "—";
    if (termin) {
      radek.querySelector("[data-zobraz='terminDatum']").textContent = datum(termin);
      radek.querySelector("[data-zobraz='terminPred']").textContent = kdy(termin, DNES);
    }
    form.hidden = true;
    radek.querySelector("[data-zobrazeni]").hidden = false;
    prefiltrujZakazky(obal);
    hlaska("Takhle se změna uloží. V ukázce zůstane jen do obnovení stránky.");
  });
}

function nastavStav(radek, stav, obal) {
  if (!radek || !STAVY.includes(stav)) return;
  const zakazka = {
    stav: radek.dataset.stav,
    kroky: [...radek.querySelectorAll("[data-postup] li")]
      .map((li) => ["", "", li.hasAttribute("data-hotovo")]),
  };
  const nova = zmenStav(zakazka, stav);

  radek.dataset.stav = nova.stav;
  const volba = radek.querySelector("[data-stav-volba]");
  if (volba) volba.value = nova.stav;
  [...radek.querySelectorAll("[data-postup] li")]
    .forEach((li, i) => li.toggleAttribute("data-hotovo", nova.kroky[i][2]));

  prekresliOdznak(radek);
  prekresliKroky(radek);
  prefiltrujZakazky(obal);

  hlaska(stav === "hotovo"
    ? "Zakázka je hotová — zbylé kroky se odškrtly a zmizí z filtru „V běhu“."
    : `Stav je teď „${STAV_ZAKAZKY[stav][0]}“. V ostré verzi se zapíše i to, kdo ho změnil.`);
}

/* --------------------------------------------------------------- přílohy */

const STITKY_PRILOH = {
  smlouva: ["Smlouva", "modra"],
  zamereni: ["Zaměření", "zlata"],
  navrh: ["Návrh", "zlata"],
  foto: ["Fotka", "zelena"],
  faktura: ["Faktura", "modra"],
  atest: ["Atest", ""],
  jine: ["Ostatní", ""],
};

/** Přílohy tak, jak je zrovna vidí stránka. */
function prilohyZeStranky(seznam) {
  return [...seznam.querySelectorAll("[data-priloha]")].map((el) => ({
    el,
    nazev: el.dataset.nazev,
    velikost: Number(el.dataset.velikost) || 0,
    stitek: el.dataset.stitek,
    druh: el.dataset.druh,
    kdy: el.dataset.kdy || "",
  }));
}

/** Souhrn štítků nad seznamem a sponka v hlavičce řádku. */
function prekresliPrilohy(radek) {
  const obal = radek.querySelector("[data-prilohy]");
  if (!obal) return;
  const seznam = obal.querySelector("[data-prilohy-seznam]");
  const prilohy = prilohyZeStranky(seznam);
  const p = poctyPriloh(prilohy);

  obal.querySelector("[data-stitky-souhrn]").innerHTML = STITKY
    .filter((s) => p.podleStitku[s] > 0)
    .map((s) => {
      const [nazev, barva] = STITKY_PRILOH[s];
      return `<span class="stitek-pocet" data-stitek-pocet="${s}">`
        + `<span class="odznak${barva ? ` odznak--${barva}` : ""}">${nazev}</span>`
        + `<span data-cislo>${p.podleStitku[s]}</span></span>`;
    }).join("");

  obal.querySelector("[data-prilohy-prazdno]").hidden = p.celkem > 0;

  const spinatko = radek.querySelector("[data-pocet-priloh]");
  if (spinatko) {
    spinatko.hidden = p.celkem === 0;
    spinatko.querySelector("[data-pocet-priloh-cislo]").textContent = String(p.celkem);
  }

  /* pořadí podle štítků — stejně, jako to seřadí sestavení */
  for (const x of seradPrilohy(prilohy)) seznam.appendChild(x.el);
}

/** Nová položka seznamu ze vzoru na stránce. */
function vyrobPrilohu(priloha) {
  const vzor = document.querySelector("[data-vzor-prilohy]");
  const el = vzor.content.firstElementChild.cloneNode(true);
  el.dataset.nazev = priloha.nazev;
  el.dataset.velikost = String(priloha.velikost);
  el.dataset.stitek = priloha.stitek;
  el.dataset.druh = priloha.druh;
  el.dataset.kdy = priloha.kdy;
  el.querySelector("[data-zobraz='nazev']").textContent = priloha.nazev;
  el.querySelector("[data-zobraz='meta']").textContent =
    velikost(priloha.velikost) + (priloha.kdy ? " · " + datumKratce(priloha.kdy) : "");
  const volba = el.querySelector("[data-stitek-volba]");
  volba.value = priloha.stitek;
  volba.setAttribute("aria-label", `Štítek přílohy ${priloha.nazev}`);
  el.querySelector(".stitek-tisk").textContent = STITKY_PRILOH[priloha.stitek][0];
  el.querySelector("[data-stahnout]").title = `Stáhnout ${priloha.nazev}`;
  el.querySelector("[data-priloha-pryc]").title = `Odebrat ${priloha.nazev}`;
  return el;
}

const DUVODY = {
  velky: (n) => `Soubor ${n} je větší než 15 MB. Takhle velké přílohy se posílají odkazem.`,
  duplicitni: (n) => `Soubor ${n} už u zakázky je.`,
  plno: () => "U jedné zakázky může být nejvýš 20 příloh.",
};

/** Přidání souborů — z tlačítka i z přetažení. */
function pridejPrilohy(radek, soubory) {
  const seznam = radek.querySelector("[data-prilohy-seznam]");
  const stavajici = prilohyZeStranky(seznam);
  const { prijate, odmitnute } = prijmi(
    stavajici,
    [...soubory].map((f) => ({ nazev: f.name, velikost: f.size })),
    { kdy: DNES },
  );
  for (const x of prijate) seznam.appendChild(vyrobPrilohu(x));
  prekresliPrilohy(radek);

  if (odmitnute.length) {
    const prvni = odmitnute[0];
    hlaska(DUVODY[prvni.duvod](prvni.nazev));
    return;
  }
  if (!prijate.length) return;
  const stitky = [...new Set(prijate.map((x) => STITKY_PRILOH[x.stitek][0]))];
  hlaska(prijate.length === 1
    ? `Soubor by se nahrál a dostal štítek „${stitky[0]}“. Štítek jde přepsat.`
    : `${prijate.length} soubory by se nahrály se štítky ${stitky.map((s) => `„${s}“`).join(", ")}.`);
}

function prilohyAkce(obal) {
  obal.addEventListener("click", (e) => {
    const radek = e.target.closest("[data-zakazka]");
    const polozka = e.target.closest("[data-priloha]");
    if (!radek || !polozka) return;

    if (e.target.closest("[data-stahnout]")) {
      hlaska(`Soubor ${polozka.dataset.nazev} by se stáhl. V ukázce je jenom v seznamu.`);
      return;
    }
    if (e.target.closest("[data-priloha-pryc]")) {
      const jmeno = polozka.dataset.nazev;
      polozka.remove();
      prekresliPrilohy(radek);
      hlaska(`Příloha ${jmeno} by se odebrala. U zakázky zůstane stopa, kdo ji smazal.`);
    }
  });

  obal.addEventListener("change", (e) => {
    const volba = e.target.closest("[data-stitek-volba]");
    if (volba) {
      const polozka = volba.closest("[data-priloha]");
      polozka.dataset.stitek = volba.value;
      polozka.querySelector(".stitek-tisk").textContent = STITKY_PRILOH[volba.value][0];
      prekresliPrilohy(e.target.closest("[data-zakazka]"));
      hlaska(`Štítek je teď „${STITKY_PRILOH[volba.value][0]}“. Takhle je na první pohled vidět, co v příloze je.`);
      return;
    }
    const vstup = e.target.closest("[data-prilohy-nahraj] input[type=file]");
    if (!vstup || !vstup.files.length) return;
    pridejPrilohy(e.target.closest("[data-zakazka]"), vstup.files);
    vstup.value = "";
  });

  /* přetažení souborů na zakázku */
  for (const zona of obal.querySelectorAll("[data-prilohy-nahraj]")) {
    ["dragenter", "dragover"].forEach((t) => zona.addEventListener(t, (e) => {
      e.preventDefault();
      zona.setAttribute("data-nad", "ano");
    }));
    ["dragleave", "drop"].forEach((t) => zona.addEventListener(t, (e) => {
      e.preventDefault();
      zona.removeAttribute("data-nad");
    }));
    zona.addEventListener("drop", (e) => {
      if (e.dataTransfer?.files?.length) {
        pridejPrilohy(zona.closest("[data-zakazka]"), e.dataTransfer.files);
      }
    });
  }
}

/* ------------------------------------------- faktura rovnou ze zakázky */

/** JSON schovaný ve stránce — data, ze kterých sestavení stavělo. */
function jsonZPrvku(el) {
  if (!el) return null;
  try {
    return JSON.parse(el.textContent);
  } catch {
    return null;
  }
}

/** Faktury, jak je zná stránka zakázek. Co tady přibude, platí do obnovení. */
let fakturyStranky = null;

function fakturyProZakazky() {
  if (!fakturyStranky) {
    fakturyStranky = jsonZPrvku(document.querySelector("[data-faktury-json]")) ?? [];
  }
  return fakturyStranky;
}

function zakazkaZPrvku(radek) {
  return {
    id: radek.dataset.zakazka,
    nabidka: radek.dataset.nabidka || "",
    klient: radek.dataset.klient || "",
    nazev: radek.dataset.nazev || "",
    stav: radek.dataset.stav,
  };
}

/** Udělá ze zakázky návrh faktury — stejným modulem, jakým by to udělal server. */
function fakturujZakazku(radek) {
  const nabidka = jsonZPrvku(radek.querySelector("[data-nabidka-json]"));
  let faktura;
  try {
    faktura = zeZakazky(zakazkaZPrvku(radek), {
      nabidka,
      faktury: fakturyProZakazky(),
      rok: DNES.slice(0, 4),
    });
  } catch (chyba) {
    hlaska(chyba.message);
    return;
  }

  fakturyProZakazky().push(faktura);
  const pole = radek.querySelector("[data-faktura-pole]");
  if (pole) {
    pole.textContent = "";
    const cislo = document.createElement("strong");
    cislo.textContent = faktura.cislo;
    const odznak = document.createElement("span");
    odznak.className = "odznak";
    odznak.textContent = "Návrh";
    pole.append(cislo, " ", odznak);
  }
  const tlacitko = radek.querySelector("[data-fakturovat]");
  if (tlacitko) tlacitko.hidden = true;
  hlaska(`Faktura ${faktura.cislo} je připravená jako návrh na ${koruny(faktura.celkem)}`
    + " — položky se vzaly z nabídky. V ostré verzi by se rovnou otevřela k vystavení.");
}

/** Proklik na jednu zakázku (zakazky.html#Z-2026-0028) — třeba z nabídky
 *  nebo z faktury. Když ji filtr schovává, přepne se na Všechny, řádek se
 *  rozbalí a stránka na něj odskočí. */
function zakazkaZOdkazu(obal) {
  const ukaz = () => {
    const id = decodeURIComponent((window.location.hash || "").slice(1));
    if (!id || /["\\]/.test(id)) return;
    const radek = obal.querySelector(`[data-zakazka="${id}"]`);
    if (!radek) return;
    if (radek.hidden) {
      const vse = document.querySelector('[data-filtr-z] [data-hodnota=""]');
      if (vse) vse.click();
    }
    radek.open = true;
    radek.scrollIntoView({ block: "start", behavior: "smooth" });
    radek.classList.add("rozbal--naraz");
    window.setTimeout(() => radek.classList.remove("rozbal--naraz"), 2500);
  };
  ukaz();
  window.addEventListener("hashchange", ukaz);
}

function zakazky() {
  const obal = document.querySelector("#seznam-zakazek");
  if (!obal) return;
  zakazkyFiltr(obal);
  zakazkyAkce(obal);
  prilohyAkce(obal);
  prefiltrujZakazky(obal);
  zakazkaZOdkazu(obal);

  for (const tl of document.querySelectorAll("[data-nova-zakazka]")) {
    tl.addEventListener("click", () => hlaska(
      "Nová zakázka se obvykle založí z přijaté nabídky — převezme klienta, "
      + "položky i cenu. V ukázce je to jen ukázka tlačítka."));
  }
}

/* ---------------------------------------------------------------- faktury */

/** Názvy a barvy stavů faktur — stejný slovník jako v šabloně. */
const STAV_FAKTURY = {
  navrh: ["Návrh", ""],
  vystavena: ["Vystavená", "modra"],
  "po-splatnosti": ["Po splatnosti", "cervena"],
  zaplacena: ["Zaplacená", "zelena"],
};

const DNY = ["den", "dny", "dní"];
const FAKTURY = ["faktura", "faktury", "faktur"];

/** Faktura, jak ji zrovna vidí stránka — čte se z atributů prvku. */
function fakturaZPrvku(el) {
  return {
    cislo: el.dataset.faktura,
    klient: el.dataset.klient ?? "",
    popis: el.dataset.popis ?? "",
    celkem: Number(el.dataset.celkem ?? 0),
    vystaveno: el.dataset.vystaveno ?? "",
    splatnost: el.dataset.splatnost ?? "",
    zaplaceno: el.dataset.zaplaceno ?? "",
    stav: el.dataset.vlastniStav,
  };
}

/** Všechny faktury na stránce, v pořadí, jak jsou v seznamu. */
function fakturyZeStranky(obal) {
  return [...obal.querySelectorAll("[data-faktura]")].map((el) => ({ el, ...fakturaZPrvku(el) }));
}

/** Zapíše fakturu zpátky do atributů prvku. */
function doPrvku(el, f) {
  el.dataset.vlastniStav = f.stav;
  el.dataset.vystaveno = f.vystaveno ?? "";
  el.dataset.splatnost = f.splatnost ?? "";
  el.dataset.zaplaceno = f.zaplaceno ?? "";
  el.dataset.stav = stavFaktury(f, DNES);
}

/** Datum do prvku: na dokladu celé (data-dlouhe), v tabulce bez roku. */
function napisDatum(iso, prvek) {
  if (!iso) return "—";
  return prvek.dataset.dlouhe === undefined ? datumKratce(iso) : datum(iso);
}

/** Překreslí odznak, data a počet dní po splatnosti. */
function prekresliFakturu(el, f) {
  const stav = stavFaktury(f, DNES);
  const [nazev, barva] = STAV_FAKTURY[stav] ?? [stav, ""];
  const misto = el.querySelector("[data-odznak]");
  if (misto) {
    misto.innerHTML = `<span class="odznak${barva ? ` odznak--${barva}` : ""}">${nazev}</span>`;
  }
  for (const x of el.querySelectorAll("[data-vystaveno-text]")) {
    x.textContent = napisDatum(f.vystaveno, x);
  }
  for (const x of el.querySelectorAll("[data-splatnost-text]")) {
    x.textContent = napisDatum(f.splatnost, x);
  }
  const po = el.querySelector("[data-po-splatnosti]");
  if (po) {
    const d = dnuPoSplatnosti(f, DNES);
    po.textContent = d ? `+${sMnoznym(d, DNY)}` : "";
    po.hidden = !d;
  }
}

/** Tlačítka podle stavu: vystavit jen u návrhu, zaplaceno u vystavené. */
function nastavTlacitka(kde, f) {
  for (const tl of kde.querySelectorAll("[data-tl-vystavit]")) {
    tl.hidden = f.stav !== "navrh";
  }
  for (const tl of kde.querySelectorAll("[data-tl-zaplaceno]")) {
    tl.hidden = f.stav === "navrh" || f.stav === "zaplacena";
  }
}

/** Dlaždice nahoře — počítá je stejný modul jako sestavení. */
function prekresliPrehledFaktur(obal) {
  const mriz = document.querySelector("[data-prehled]");
  if (!mriz) return;
  const p = prehled(fakturyZeStranky(obal), DNES);
  const sucty = {
    zaplaceno: p.zaplaceno,
    nezaplaceno: p.nezaplaceno,
    poSplatnosti: p.poSplatnosti,
  };
  for (const [klic, hodnota] of Object.entries(sucty)) {
    const x = mriz.querySelector(`[data-sucet="${klic}"]`);
    if (x) x.textContent = koruny(hodnota);
  }
  const pocty = {
    zaplacena: p.pocty.zaplacena,
    nezaplacene: p.pocty.vystavena + p.pocty["po-splatnosti"],
    "po-splatnosti": p.pocty["po-splatnosti"],
  };
  for (const [klic, kolik] of Object.entries(pocty)) {
    const x = mriz.querySelector(`[data-pocet="${klic}"]`);
    if (x) x.textContent = sMnoznym(kolik, FAKTURY);
  }
}

/** Pruh nad dokladem na detailu faktury. */
function prekresliPruhFaktury(f) {
  const pruh = document.querySelector("[data-pruh]");
  const text = pruh?.querySelector("[data-pruh-text]");
  if (!pruh || !text) return;
  const stav = stavFaktury(f, DNES);
  if (stav === "zaplacena") {
    pruh.className = "platnost platnost--plati netisknout";
    text.innerHTML = `Zaplaceno <strong>${datum(f.zaplaceno)}</strong>`
      + (f.splatnost ? ` — splatnost byla ${datum(f.splatnost)}.` : ".");
    return;
  }
  if (stav === "po-splatnosti") {
    pruh.className = "platnost platnost--prosla netisknout";
    text.innerHTML = `Po splatnosti o <strong>${sMnoznym(dnuPoSplatnosti(f, DNES), DNY)}</strong>`
      + ` — splatnost byla ${datum(f.splatnost)}. Na tuhle zavolat.`;
    return;
  }
  pruh.className = "platnost platnost--plati netisknout";
  text.innerHTML = `Splatnost <strong>${datum(f.splatnost)}</strong>`
    + ` — vystaveno ${datum(f.vystaveno)}.`;
}

/** Stáhne tabulku pro účetní. Soubor vznikne v prohlížeči, nikam se neposílá. */
function exportUcetni(obal) {
  const faktury = fakturyZeStranky(obal).map(({ el, ...f }) => f);
  const text = csvProUcetni(faktury);
  const soubor = new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(soubor);
  const a = document.createElement("a");
  a.href = url;
  a.download = nazevSouboru(DNES);
  a.click();
  URL.revokeObjectURL(url);
  hlaska(`Stahuje se ${a.download} — ${sMnoznym(faktury.length, FAKTURY)} pro účetní. `
    + "Středníky a desetinná čárka, ať to otevře Excel.");
}

/** Jedna změna stavu faktury: přepočítá prvek, dlaždice i pruh na detailu.
 *  `uklid` je prvek, ve kterém se odebírají tlačítka, co už nemají co dělat —
 *  v seznamu jen ten jeden řádek, na detailu celá stránka. */
function zmenFakturu(prvek, { obal = null, uklid = prvek, jak }) {
  const f = fakturaZPrvku(prvek);
  let zmenena;
  try {
    zmenena = jak(f);
  } catch (chyba) {
    hlaska(chyba.message);
    return null;
  }
  doPrvku(prvek, zmenena);
  prekresliFakturu(prvek, zmenena);
  nastavTlacitka(uklid, zmenena);
  if (obal) prekresliPrehledFaktur(obal);
  prekresliPruhFaktury(zmenena);
  return zmenena;
}

/** Kliknutí na „zaplaceno" a „vystavit"; `kde` je prvek, kde se klikání poslouchá. */
function fakturyAkce(kde, { najdiPrvek, obal = null, celaStranka = false }) {
  kde.addEventListener("click", (e) => {
    const zaplaceno = e.target.closest("[data-tl-zaplaceno]");
    const vystavit = e.target.closest("[data-tl-vystavit]");
    if (!zaplaceno && !vystavit) return;
    const prvek = najdiPrvek(e);
    if (!prvek) return;
    const volby = { obal, uklid: celaStranka ? document : prvek };

    if (zaplaceno) {
      const zmenena = zmenFakturu(prvek, { ...volby, jak: (f) => oznacZaplacenou(f, DNES) });
      if (zmenena) {
        hlaska(`Faktura ${zmenena.cislo} je zaplacená ${datum(DNES)}. `
          + "V ostré verzi by se k ní zapsala i platba z banky.");
      }
      return;
    }

    const zmenena = zmenFakturu(prvek, {
      ...volby,
      jak: (f) => vystav(f, { kdy: DNES, splatnostDnu: 14 }),
    });
    if (zmenena) {
      hlaska(`Faktura ${zmenena.cislo} je vystavená ${datum(DNES)}, `
        + `splatnost ${datum(zmenena.splatnost)}. Odsud by odešla klientovi e-mailem.`);
    }
  });
}

function faktury() {
  const seznam = document.querySelector("#seznam-faktur");
  if (seznam) {
    fakturyAkce(seznam, { najdiPrvek: (e) => e.target.closest("[data-faktura]"), obal: seznam });
    for (const tl of document.querySelectorAll("[data-export-ucetni]")) {
      tl.addEventListener("click", () => exportUcetni(seznam));
    }
    prekresliPrehledFaktur(seznam);
  }

  const doklad = document.querySelector(".dokument[data-faktura]");
  if (doklad) {
    fakturyAkce(document, { najdiPrvek: () => doklad, celaStranka: true });
    for (const tl of document.querySelectorAll("[data-tisk]")) {
      tl.addEventListener("click", () => window.print());
    }
  }
}

/* ------------------------------------------------------------------ start */


panel();
filtry();
ukladani();
fotky();
nabidka();
zakazky();
faktury();
