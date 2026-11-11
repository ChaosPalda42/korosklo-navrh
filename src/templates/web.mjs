/** Veřejné stránky webu. Každá funkce dostane ctx (se ctx.stranka nastavenou
 *  na cestu té stránky) a vrátí { titulek, popis, telo }. */

import { h, odkaz } from "../lib/cesty.mjs";
import { fotkaKarta, fotkaPlna } from "../lib/obrazky.mjs";
import { hero, fakta, hlavickaSekce, kartaSluzba, kartaRealizace, galerie, vyzva } from "./casti.mjs";

/* ------------------------------------------------------------------ úvod */

export function uvod(ctx) {
  const { texty, sluzby, realizace, sluzbyPodleId } = ctx;
  const t = texty.uvod;
  const s = ctx.stranka;
  const vybrane = realizace.slice(0, 6);

  const telo = `
${hero(ctx, {
  kod: t.fotka,
  nadpis: t.nadpis,
  perex: t.perex,
  popisFotky: "Zasklená pergola u rodinného domu",
  akce: [["kontakt.html", "Nezávazná poptávka", true], ["realizace/index.html", "Prohlédnout realizace", false]],
})}
${fakta(t.fakta)}

<section class="sekce">
  <div class="obal">
    <div class="mrizka mrizka--3">
      ${t.vstupy.map((v) => `
        <a class="vstup" href="${odkaz(s, v.cil)}">
          <span class="vstup__cislo">${h(v.cislo)}</span>
          <h3>${h(v.nazev)}</h3>
          <p>${h(v.text)}</p>
          <span class="vstup__sipka">${h(v.sipka)} →</span>
        </a>`).join("")}
    </div>
  </div>
</section>

<section class="sekce sekce--plocha">
  <div class="obal">
    ${hlavickaSekce("Co děláme", "Sklenářské práce na míru",
      "Jedenáct druhů práce, které zvládneme od návrhu až po montáž. Všechno vyrábíme v Plzni.")}
    <div class="mrizka mrizka--3">
      ${sluzby.filter((x) => x.fotky.length).slice(0, 6).map((x) => kartaSluzba(ctx, x)).join("")}
    </div>
    <p style="margin-top:2rem"><a class="tl tl--tichy" href="${odkaz(s, "sluzby/index.html")}">Všech ${sluzby.length} služeb</a></p>
  </div>
</section>

<section class="sekce">
  <div class="obal">
    ${hlavickaSekce("Realizace", "Vybrané zakázky",
      "Zábradlí, sprchové kouty, příčky i zasklené pergoly. Fotografie jsou z našich realizací.")}
    <div class="mrizka mrizka--3">
      ${vybrane.map((r) => kartaRealizace(ctx, r, sluzbyPodleId)).join("")}
    </div>
    <p style="margin-top:2rem"><a class="tl tl--tichy" href="${odkaz(s, "realizace/index.html")}">Všechny realizace</a></p>
  </div>
</section>

<section class="sekce sekce--plocha">
  <div class="obal">
    ${hlavickaSekce("Jak to u nás probíhá", "Od poptávky k hotové montáži",
      "Čtyři kroky. U každého víte, co se děje a kdo to má v ruce.")}
    <div class="postup">
      ${t.postup.map(([nadpis, text]) => `
        <div class="postup__krok"><h3>${h(nadpis)}</h3><p>${h(text)}</p></div>`).join("")}
    </div>
  </div>
</section>

<section class="sekce">
  <div class="obal">
    ${hlavickaSekce("Proč k nám", "Čtyři důvody, proč to zadat nám")}
    <div class="mrizka mrizka--pul">
      ${t.proc.map(([nadpis, text]) => `
        <div class="hrana-vlevo" style="padding-left:1.5rem">
          <h3 style="margin-bottom:0.5rem">${h(nadpis)}</h3>
          <p style="color:var(--text-tlumený);margin:0">${h(text)}</p>
        </div>`).join("")}
    </div>
  </div>
</section>

${vyzva(ctx)}`;

  return {
    titulek: "",
    popis: t.perex,
    telo,
  };
}

/* ---------------------------------------------------------------- služby */

export function sluzbyPrehled(ctx) {
  const { sluzby } = ctx;
  const naMiru = sluzby.filter((x) => x.vetev === "na-miru");
  const firmy = sluzby.filter((x) => x.vetev === "firmy");

  const telo = `
${hero(ctx, {
  kod: "12",
  kratky: true,
  nadpis: "Služby",
  perex: "Co u nás můžete zadat. Každou zakázku navrhujeme individuálně — od zaměření po montáž.",
  popisFotky: "Celoskleněné zábradlí na galerii",
})}
<section class="sekce">
  <div class="obal">
    ${hlavickaSekce("Zakázky na míru", "Pro domy, byty a interiéry")}
    <div class="mrizka mrizka--3">${naMiru.map((x) => kartaSluzba(ctx, x)).join("")}</div>
  </div>
</section>
<section class="sekce sekce--plocha">
  <div class="obal">
    ${hlavickaSekce("Pro provozy a firmy", "Vybavení obchodů a provozoven")}
    <div class="mrizka mrizka--3">${firmy.map((x) => kartaSluzba(ctx, x)).join("")}</div>
  </div>
</section>
${vyzva(ctx, { nadpis: "Nenašli jste svoji práci?", text: "Sklenářské práce děláme i mimo tenhle seznam. Zavolejte a řekneme vám, jestli to jde." })}`;

  return {
    titulek: "Služby",
    popis: "Skleněná zábradlí, sprchové kouty, příčky, zrcadla, obklady, zasklívání pergol a další sklenářské práce na míru. Plzeň a okolí.",
    telo,
  };
}

export function sluzbaDetail(ctx, sluzba) {
  const { realizace, sluzby } = ctx;
  const s = ctx.stranka;
  const souvisejici = realizace.filter((r) => r.kategorie === sluzba.id);
  const dalsi = sluzby.filter((x) => x.id !== sluzba.id && x.fotky.length).slice(0, 3);

  const telo = `
${hero(ctx, {
  kod: sluzba.fotky[0] ?? "12",
  kratky: true,
  nadpis: sluzba.nazev,
  perex: sluzba.perex,
  popisFotky: sluzba.nazev,
  akce: [["kontakt.html", "Poptat tuhle službu", true]],
})}
<section class="sekce">
  <div class="obal">
    <div class="proza">${sluzba.odstavce.map((o) => `<p>${h(o)}</p>`).join("")}</div>
  </div>
</section>
${sluzba.fotky.length > 1 ? `
<section class="sekce sekce--tesna sekce--plocha">
  <div class="obal">
    ${hlavickaSekce("", "Z naší práce")}
    ${galerie(ctx, sluzba.fotky, sluzba.nazev)}
  </div>
</section>` : ""}
${souvisejici.length ? `
<section class="sekce">
  <div class="obal">
    ${hlavickaSekce("Realizace", "Takhle to dopadlo u zákazníků")}
    <div class="mrizka mrizka--3">${souvisejici.map((r) => kartaRealizace(ctx, r, ctx.sluzbyPodleId)).join("")}</div>
  </div>
</section>` : ""}
<section class="sekce sekce--tesna">
  <div class="obal">
    ${hlavickaSekce("", "Další služby")}
    <div class="mrizka mrizka--3">${dalsi.map((x) => kartaSluzba(ctx, x)).join("")}</div>
  </div>
</section>
${vyzva(ctx, { nadpis: `Potřebujete ${sluzba.zkratka.toLowerCase()}?`, kod: sluzba.fotky[1] ?? sluzba.fotky[0] ?? "29" })}`;

  return { titulek: sluzba.nazev, popis: sluzba.perex, telo };
}

/* -------------------------------------------------------------- realizace */

export function realizacePrehled(ctx) {
  const { realizace, sluzbyPodleId } = ctx;
  const kategorie = [...new Set(realizace.map((r) => r.kategorie))];

  const telo = `
${hero(ctx, {
  kod: "08",
  kratky: true,
  nadpis: "Realizace",
  perex: "Výběr z naší práce. Zábradlí, sprchové kouty, příčky, obklady i zasklené pergoly.",
  popisFotky: "Celoskleněné zábradlí u dřevěného schodiště",
})}
<section class="sekce">
  <div class="obal">
    <div class="filtr" data-filtr role="group" aria-label="Filtr podle druhu práce">
      <button type="button" data-kategorie="" aria-pressed="true">Vše (${realizace.length})</button>
      ${kategorie.map((k) => {
        const pocet = realizace.filter((r) => r.kategorie === k).length;
        return `<button type="button" data-kategorie="${h(k)}" aria-pressed="false">${h(sluzbyPodleId[k]?.zkratka ?? k)} (${pocet})</button>`;
      }).join("")}
    </div>
    <div class="mrizka mrizka--3" data-seznam-realizaci>
      ${realizace.map((r) => kartaRealizace(ctx, r, sluzbyPodleId)).join("")}
    </div>
    <p class="hlaska" data-nic hidden style="margin-top:1.5rem">V téhle kategorii zatím nic nemáme.</p>
  </div>
</section>
${vyzva(ctx)}`;

  return {
    titulek: "Realizace",
    popis: "Fotogalerie dokončených zakázek: skleněná zábradlí, sprchové kouty, příčky, obklady a zasklení pergol v Plzni a okolí.",
    telo,
  };
}

export function realizaceDetail(ctx, r) {
  const { realizace, sluzbyPodleId } = ctx;
  const s = ctx.stranka;
  const sluzba = sluzbyPodleId[r.kategorie];
  const dalsi = realizace.filter((x) => x.id !== r.id && x.kategorie === r.kategorie)
    .concat(realizace.filter((x) => x.id !== r.id && x.kategorie !== r.kategorie)).slice(0, 3);

  const telo = `
<nav class="drobky obal" aria-label="Kde jste">
  <a href="${odkaz(s, "index.html")}">Úvod</a> <span aria-hidden="true">/</span>
  <a href="${odkaz(s, "realizace/index.html")}">Realizace</a> <span aria-hidden="true">/</span>
  <span aria-current="page">${h(r.nazev)}</span>
</nav>
<section class="sekce sekce--tesna">
  <div class="obal">
    <div class="detail">
      <div class="detail__text">
        ${sluzba ? `<p class="ryska">${h(sluzba.zkratka)}</p>` : ""}
        <h1>${h(r.nazev)}</h1>
        <p class="detail__perex">${h(r.perex)}</p>
        <div class="proza"><p>${h(r.popis)}</p></div>
      </div>
      <aside class="detail__parametry tabule">
        <h2>Parametry</h2>
        <table class="tabulka-parametru">
          <tbody>
            <tr><th>Místo</th><td>${h(r.misto)}</td></tr>
            <tr><th>Rok</th><td>${h(r.rok)}</td></tr>
            ${r.parametry.map(([k, v]) => `<tr><th>${h(k)}</th><td>${h(v)}</td></tr>`).join("")}
          </tbody>
        </table>
        ${sluzba ? `<p style="margin-top:1.25rem"><a class="tl tl--tichy" href="${odkaz(s, `sluzby/${sluzba.id}.html`)}">O službě ${h(sluzba.zkratka.toLowerCase())}</a></p>` : ""}
      </aside>
    </div>
  </div>
</section>
<section class="sekce sekce--tesna">
  <div class="obal">${galerie(ctx, r.fotky, r.nazev)}</div>
</section>
<section class="sekce sekce--plocha">
  <div class="obal">
    ${hlavickaSekce("", "Další realizace")}
    <div class="mrizka mrizka--3">${dalsi.map((x) => kartaRealizace(ctx, x, sluzbyPodleId)).join("")}</div>
  </div>
</section>
${vyzva(ctx, { kod: r.fotky[0] })}`;

  return { titulek: r.nazev, popis: r.perex, telo };
}

/* ------------------------------------------------- designéři a velkoobchod */

export function proDesignery(ctx) {
  const t = ctx.texty.proDesignery;
  const telo = `
${hero(ctx, {
  kod: t.fotka,
  kratky: true,
  nadpis: t.nadpis,
  perex: t.perex,
  popisFotky: "Skleněná příčka a dveře v interiéru",
  akce: [["kontakt.html", "Poslat výkres nebo poptávku", true]],
})}
<section class="sekce">
  <div class="obal">
    <div class="mrizka mrizka--3">
      ${t.bloky.map((b) => `
        <div class="tabule" style="padding:1.75rem">
          <h3 style="margin-bottom:0.75rem">${h(b.nadpis)}</h3>
          <p style="color:var(--text-tlumený)">${h(b.text)}</p>
          <ul class="odrazky">${b.odrazky.map((o) => `<li>${h(o)}</li>`).join("")}</ul>
        </div>`).join("")}
    </div>
    <p class="hlaska" style="margin-top:2.5rem">${h(t.poznamka)}</p>
  </div>
</section>
${vyzva(ctx, {
  nadpis: "Máme výkres, potřebujeme sklo",
  text: "Pošlete výkres nebo rozměrový list na info@korosklo.cz. Ozveme se s cenou a termínem.",
  kod: "06",
})}`;
  return { titulek: t.nadpis, popis: t.perex, telo };
}

export function velkoobchod(ctx) {
  const t = ctx.texty.velkoobchod;
  const telo = `
${hero(ctx, {
  kod: t.fotka,
  kratky: true,
  nadpis: t.nadpis,
  perex: t.perex,
  popisFotky: "Zasklívání okenního rámu",
})}
<section class="sekce">
  <div class="obal">
    ${hlavickaSekce("Sortiment", "Co dodáváme")}
    <div class="mrizka mrizka--2">
      ${t.sortiment.map(([nazev, popis]) => `
        <div class="hrana-vlevo" style="padding-left:1.5rem">
          <h3 style="margin-bottom:0.35rem;font-size:1.1875rem">${h(nazev)}</h3>
          <p style="color:var(--text-tlumený);margin:0">${h(popis)}</p>
        </div>`).join("")}
    </div>
  </div>
</section>
<section class="sekce sekce--plocha">
  <div class="obal obal--uzky">
    ${hlavickaSekce("Úpravy", "Co se sklem umíme udělat")}
    <ul class="odrazky">${t.sluzby.map((x) => `<li>${h(x)}</li>`).join("")}</ul>
    <p class="hlaska" style="margin-top:2rem">${h(t.poznamka)}</p>
  </div>
</section>
${vyzva(ctx, { nadpis: "Potřebujete ceník nebo dostupnost?", text: "Objednávky řešíme individuálně podle množství a formátu. Zavolejte na kancelář.", kod: "17" })}`;
  return { titulek: t.nadpis, popis: t.perex, telo };
}

/* ----------------------------------------------------------------- o nás */

export function oNas(ctx) {
  const t = ctx.texty.oNas;
  const telo = `
${hero(ctx, {
  kod: t.fotka,
  kratky: true,
  nadpis: t.nadpis,
  perex: "Od velkoobchodu s plochým sklem k zakázkové výrobě. Tři desítky let v jednom městě.",
  popisFotky: "Skleněná příčka v interiéru",
})}
${fakta(t.cisla)}
<section class="sekce">
  <div class="obal obal--uzky">
    <div class="proza">${t.odstavce.map((o) => `<p>${h(o)}</p>`).join("")}</div>
  </div>
</section>
<section class="sekce sekce--plocha">
  <div class="obal">
    ${hlavickaSekce("Kde nás najdete", "Provozovna v Plzni na Roudné")}
    <div class="mrizka mrizka--2">
      <div>
        <p style="color:var(--text-tlumený)">Provozovna i výroba jsou na jedné adrese. Můžete se zastavit, podívat se na vzorky skla a kování a probrat zakázku osobně — nejlépe po telefonické dohodě, abychom byli na místě.</p>
        <p><a class="tl tl--obrys" href="https://www.google.com/maps/search/?api=1&amp;query=Na+Roudn%C3%A9+1134%2F68%2C+301+00+Plze%C5%88" target="_blank" rel="noopener">Otevřít v mapách</a></p>
      </div>
      <div class="tabule" style="padding:1.75rem">
        <h3 style="margin-bottom:0.75rem">KORO-SKLO s.r.o.</h3>
        <p style="color:var(--text-tlumený);margin:0">Na Roudné 1134/68<br>301 00 Plzeň</p>
      </div>
    </div>
  </div>
</section>
${vyzva(ctx, { kod: "26" })}`;
  return {
    titulek: "O nás",
    popis: "Rodinné sklenářství v Plzni od roku 1995. Vlastní výroba, zakázková sklenářská práce a velkoobchod s plochým sklem.",
    telo,
  };
}

/* --------------------------------------------------------------- kontakt */

export function kontakt(ctx) {
  const { site } = ctx;
  const t = ctx.texty.kontakt;
  const telefony = site.telefony.map((tel) => `
    <div class="tabule" style="padding:1.5rem">
      <p class="ryska">${h(tel.role)}</p>
      ${tel.cisla.map((c) => `<p style="margin:0 0 0.25rem"><a href="tel:${h(c.replace(/\s/g, ""))}" style="font-family:var(--f-nadpis);font-weight:600;font-size:1.25rem;text-decoration:none">${h(c)}</a></p>`).join("")}
      ${tel.popis ? `<p style="color:var(--text-slabý);font-size:0.9rem;margin:0.5rem 0 0">${h(tel.popis)}</p>` : ""}
    </div>`).join("");

  const telo = `
<section class="sekce">
  <div class="obal">
    ${hlavickaSekce("Kontakt", t.nadpis, t.perex)}
    <div class="kontakt-mrizka">
      <form class="formular tabule" style="padding:clamp(1.5rem,1rem+2vw,2.5rem)" data-poptavka novalidate>
        <div class="dvojice">
          <div class="pole">
            <label for="jmeno">Jméno a příjmení <span aria-hidden="true">*</span></label>
            <input id="jmeno" name="jmeno" type="text" autocomplete="name" required>
            <p class="pole__chyba" data-chyba-pro="jmeno" hidden></p>
          </div>
          <div class="pole">
            <label for="telefon">Telefon <span aria-hidden="true">*</span></label>
            <input id="telefon" name="telefon" type="tel" autocomplete="tel" inputmode="tel" required placeholder="+420 601 234 567">
            <p class="pole__chyba" data-chyba-pro="telefon" hidden></p>
          </div>
        </div>
        <div class="dvojice">
          <div class="pole">
            <label for="email">E-mail</label>
            <input id="email" name="email" type="email" autocomplete="email">
            <p class="pole__chyba" data-chyba-pro="email" hidden></p>
          </div>
          <div class="pole">
            <label for="druh">Co potřebujete</label>
            <select id="druh" name="druh">
              <option value="">— vyberte —</option>
              ${ctx.sluzby.map((x) => `<option value="${h(x.id)}">${h(x.nazev)}</option>`).join("")}
              <option value="velkoobchod">Velkoobchod s plochým sklem</option>
              <option value="jine">Něco jiného</option>
            </select>
          </div>
        </div>
        <div class="pole">
          <label for="zprava">Zpráva <span aria-hidden="true">*</span></label>
          <p class="pole__napoveda">${h(t.napoveda)}</p>
          <textarea id="zprava" name="zprava" required></textarea>
          <p class="pole__chyba" data-chyba-pro="zprava" hidden></p>
        </div>
        <div class="pole">
          <label for="fotky">Fotografie místa</label>
          <p class="pole__napoveda">Nepovinné, ale hodně pomůže. Až 5 fotek, každá do 10 MB.</p>
          <label class="nahraj" data-nahraj for="fotky">
            <input id="fotky" name="fotky" type="file" accept="image/*" multiple>
            <strong>Přetáhněte fotky sem</strong><br>nebo klikněte a vyberte z počítače
            <div class="nahraj__seznam" data-nahraj-seznam></div>
          </label>
        </div>
        <label class="souhlas">
          <input type="checkbox" name="souhlas" required>
          <span>Souhlasím, aby KORO-SKLO s.r.o. použilo moje údaje k vyřízení téhle poptávky. Víc v <a href="${odkaz(ctx.stranka, "ochrana-osobnich-udaju.html")}">ochraně osobních údajů</a>.</span>
        </label>
        <div>
          <button class="tl tl--hlavni" type="submit">Odeslat poptávku</button>
        </div>
        <p class="hlaska hlaska--ukazka" data-vysledek hidden></p>
      </form>

      <aside class="kontakt-strana">
        ${telefony}
        <div class="tabule" style="padding:1.5rem">
          <p class="ryska">E-mail</p>
          <p style="margin:0"><a href="mailto:${h(site.email)}" style="font-family:var(--f-nadpis);font-weight:600;font-size:1.125rem;text-decoration:none">${h(site.email)}</a></p>
        </div>
        <div class="tabule" style="padding:1.5rem">
          <p class="ryska">Provozovna</p>
          <p style="margin:0;color:var(--text-tlumený)">${h(site.adresa.ulice)}<br>${h(site.adresa.psc)} ${h(site.adresa.mesto)}</p>
          <p style="margin:0.75rem 0 0"><a class="tl tl--tichy" href="https://www.google.com/maps/search/?api=1&amp;query=Na+Roudn%C3%A9+1134%2F68%2C+301+00+Plze%C5%88" target="_blank" rel="noopener">Otevřít v mapách</a></p>
        </div>
        <div class="tabule" style="padding:1.5rem">
          <p class="ryska">Otevírací doba</p>
          <div class="pata__doba">
            ${site.oteviraciDoba.map((d) =>
              `<span>${h(d.den)}</span><span>${h(d.od ? `${d.od}–${d.do}` : "zavřeno")}</span>`).join("")}
          </div>
        </div>
        <div class="tabule" style="padding:1.5rem">
          <p class="ryska">Kde pracujeme</p>
          <p style="margin:0;color:var(--text-tlumený)">${site.pusobnost.map((x) => h(x)).join(" · ")}</p>
        </div>
      </aside>
    </div>
  </div>
</section>`;

  return {
    titulek: "Kontakt a poptávka",
    popis: "Napište nám, co potřebujete. Poptávka je nezávazná a zdarma — ozveme se do dvou pracovních dnů. Na Roudné 1134/68, Plzeň.",
    telo,
  };
}

/* ------------------------------------------------------------ GDPR, 404 */

export function gdpr(ctx) {
  const t = ctx.texty.gdpr;
  const telo = `
<section class="sekce">
  <div class="obal obal--uzky">
    ${hlavickaSekce("", t.nadpis)}
    <div class="proza">${t.odstavce.map((o) => `<p>${h(o)}</p>`).join("")}</div>
    <p class="hlaska hlaska--ukazka" style="margin-top:2rem">${h(t.poznamka)}</p>
  </div>
</section>`;
  return { titulek: t.nadpis, popis: "Jak zpracováváme osobní údaje z poptávkového formuláře.", telo };
}

export function nenalezeno(ctx) {
  const s = ctx.stranka;
  const telo = `
<section class="sekce">
  <div class="obal obal--uzky" style="text-align:center;padding-block:clamp(2rem,1rem+5vw,6rem)">
    <p class="ryska" style="justify-content:center">Chyba 404</p>
    <h1>Tuhle stránku nemáme</h1>
    <p style="color:var(--text-tlumený);font-size:1.125rem">Nejspíš jsme ji přesunuli, nebo je v odkazu překlep. Zkuste to z úvodu — nebo nám napište a najdeme to za vás.</p>
    <div class="hero__akce" style="justify-content:center">
      <a class="tl tl--hlavni" href="${odkaz(s, "index.html")}">Na úvod</a>
      <a class="tl tl--obrys" href="${odkaz(s, "kontakt.html")}">Napsat nám</a>
    </div>
  </div>
</section>`;
  return { titulek: "Stránka nenalezena", popis: "Tuhle stránku jsme nenašli.", telo };
}
