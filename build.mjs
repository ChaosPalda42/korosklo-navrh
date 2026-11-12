/** Sestavení webu: data + šablony → out/web/ */

import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import * as web from "./src/templates/web.mjs";
import * as admin from "./src/templates/admin.mjs";
import * as crm from "./src/templates/crm.mjs";
import { stranka } from "./src/templates/layout.mjs";
import { strankaAdmin } from "./src/templates/admin-layout.mjs";
import { stavPlatnosti } from "./src/lib/nabidka.mjs";
import { podLimitem } from "./src/lib/sklad.mjs";
import { stavFaktury } from "./src/lib/faktura.mjs";

const KOREN = dirname(fileURLToPath(import.meta.url));
const VEN = join(KOREN, "out", "web");

/** Den, ke kterému je ukázka postavená (schůzka s klientkou). */
const DNES = "2026-11-11";

const nacti = (jmeno) => JSON.parse(readFileSync(join(KOREN, "data", jmeno), "utf8"));

const site = nacti("site.json");
const sluzby = nacti("sluzby.json");
const realizace = nacti("realizace.json");
const fotky = nacti("fotky.json");
const texty = nacti("texty.json");

/* Vymyšlená data pro ukázku administrace a CRM — viz data/demo/CO-JE-VYMYSLENE.md */
const demo = {
  poptavky: nacti("demo/poptavky.json"),
  klienti: nacti("demo/klienti.json"),
  nabidky: nacti("demo/nabidky.json"),
  zakazky: nacti("demo/zakazky.json"),
  sklad: nacti("demo/sklad.json"),
  faktury: nacti("demo/faktury.json"),
  platba: nacti("demo/platba.json"),
  statistiky: nacti("demo/statistiky.json"),
};

demo.klientiPodleId = Object.fromEntries(demo.klienti.map((k) => [k.id, k]));
demo.pocty = {
  novePoptavky: demo.poptavky.filter((p) => p.stav === "nova").length,
  konciNabidky: demo.nabidky
    .filter((n) => n.stav === "odeslana" && stavPlatnosti(n, DNES) !== "plati").length,
  podLimitem: podLimitem(demo.sklad.karty).length,
  poSplatnosti: demo.faktury.filter((f) => stavFaktury(f, DNES) === "po-splatnosti").length,
};

const sluzbyPodleId = Object.fromEntries(sluzby.map((x) => [x.id, x]));
const zaklad = {
  site, sluzby, realizace, fotky, texty, sluzbyPodleId,
  demo, pocty: demo.pocty, dnes: DNES,
};

/** Veřejný web: [cesta, funkce] */
const stranky = [
  ["index.html", web.uvod],
  ["sluzby/index.html", web.sluzbyPrehled],
  ["realizace/index.html", web.realizacePrehled],
  ["pro-designery.html", web.proDesignery],
  ["velkoobchod.html", web.velkoobchod],
  ["o-nas.html", web.oNas],
  ["kontakt.html", web.kontakt],
  ["ochrana-osobnich-udaju.html", web.gdpr],
  ["404.html", web.nenalezeno],
  ...sluzby.map((s) => [`sluzby/${s.id}.html`, (ctx) => web.sluzbaDetail(ctx, s)]),
  ...realizace.map((r) => [`realizace/${r.id}.html`, (ctx) => web.realizaceDetail(ctx, r)]),
];

/** Administrace: [cesta, funkce] — vrací díly pro strankaAdmin. */
const strankyAdmin = [
  ["administrace/nastenka.html", admin.nastenka],
  ["administrace/poptavky.html", admin.poptavky],
  ["administrace/texty.html", admin.texty],
  ["administrace/realizace.html", admin.realizace],
  ["administrace/sluzby.html", admin.sluzby],
  ["administrace/crm/index.html", crm.crmPrehled],
  ["administrace/crm/nabidky.html", crm.nabidky],
  ["administrace/crm/zakazky.html", crm.zakazky],
  ["administrace/crm/klienti.html", crm.klienti],
  ["administrace/crm/sklad.html", crm.sklad],
  ["administrace/crm/faktury.html", crm.faktury],
  ...demo.nabidky.map((n) => [
    `administrace/crm/nabidka-${n.cislo}.html`,
    (ctx) => crm.nabidkaDetail(ctx, n),
  ]),
  ...demo.faktury.map((f) => [
    `administrace/crm/faktura-${f.cislo}.html`,
    (ctx) => crm.fakturaDetail(ctx, f),
  ]),
];

/** Stránky, které si celé HTML dělají samy. */
const strankyCele = [
  ["administrace/index.html", admin.prihlaseni],
];

function zapis(cesta, obsah) {
  const cil = join(VEN, cesta);
  mkdirSync(dirname(cil), { recursive: true });
  writeFileSync(cil, obsah, "utf8");
}

function hlavni() {
  rmSync(VEN, { recursive: true, force: true });
  mkdirSync(VEN, { recursive: true });

  // statické soubory
  cpSync(join(KOREN, "src", "assets"), join(VEN, "assets"), { recursive: true });
  // čistá logika jede i v prohlížeči (živý přepočet nabídky)
  cpSync(join(KOREN, "src", "lib"), join(VEN, "assets", "lib"), { recursive: true });

  let bajtu = 0;

  for (const [cesta, fn] of stranky) {
    const ctx = { ...zaklad, stranka: cesta };
    const { titulek, popis, telo, trida, obrazek } = fn(ctx);
    const html = stranka(ctx, { titulek, popis, telo, trida, obrazek });
    zapis(cesta, html);
    bajtu += Buffer.byteLength(html);
  }

  for (const [cesta, fn] of strankyAdmin) {
    const ctx = { ...zaklad, stranka: cesta };
    const html = strankaAdmin(ctx, fn(ctx));
    zapis(cesta, html);
    bajtu += Buffer.byteLength(html);
  }

  for (const [cesta, fn] of strankyCele) {
    const ctx = { ...zaklad, stranka: cesta };
    const html = fn(ctx);
    zapis(cesta, html);
    bajtu += Buffer.byteLength(html);
  }

  // robots.txt — ukázka se nemá indexovat
  zapis("robots.txt", "User-agent: *\nDisallow: /\n");

  const pocet = stranky.length + strankyAdmin.length + strankyCele.length;
  console.log(`hotovo: ${pocet} stránek (${stranky.length} web, `
    + `${strankyAdmin.length + strankyCele.length} administrace), `
    + `${(bajtu / 1024).toFixed(0)} kB HTML → out/web`);
}

hlavni();
