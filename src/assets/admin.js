/** Chování administrace. Modul — přepočet nabídky jede na stejném kódu
 *  (src/lib/nabidka.mjs), kterým se sestavuje web. Nic se neukládá na server:
 *  ukázka si pamatuje změny jen do obnovení stránky.
 */

import { polozkaCelkem, souhrn } from "./lib/nabidka.mjs";
import { koruny, datum } from "./lib/cestina.mjs";
import { kdy } from "./lib/kdy.mjs";
import { postup, pocty, filtruj, dalsiStav, zmenStav, oznacKrok, STAVY }
  from "./lib/zakazky.mjs";

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

function zakazky() {
  const obal = document.querySelector("#seznam-zakazek");
  if (!obal) return;
  zakazkyFiltr(obal);
  zakazkyAkce(obal);
  prefiltrujZakazky(obal);

  for (const tl of document.querySelectorAll("[data-nova-zakazka]")) {
    tl.addEventListener("click", () => hlaska(
      "Nová zakázka se obvykle založí z přijaté nabídky — převezme klienta, "
      + "položky i cenu. V ukázce je to jen ukázka tlačítka."));
  }
}

/* ------------------------------------------------------------------ start */

panel();
filtry();
ukladani();
fotky();
nabidka();
zakazky();
