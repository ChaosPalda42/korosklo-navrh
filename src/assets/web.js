/* Chování veřejného webu. Bez knihoven, bez sledování. */
(() => {
  "use strict";
  const $ = (s, k = document) => k.querySelector(s);
  const $$ = (s, k = document) => [...k.querySelectorAll(s)];

  /* ------------------------------------------------- hlavička při posunu */
  const hlava = $("[data-hlava]");
  if (hlava) {
    const prepni = () => hlava.setAttribute("data-posunuta", window.scrollY > 24 ? "ano" : "ne");
    prepni();
    addEventListener("scroll", prepni, { passive: true });
  }

  /* ------------------------------------------------------ menu na mobilu */
  const prepinac = $("[data-prepinac-menu]");
  const menu = $("[data-menu]");
  if (prepinac && menu) {
    const uzke = () => matchMedia("(max-width: 62rem)").matches;
    const zavri = () => { menu.hidden = true; prepinac.setAttribute("aria-expanded", "false"); };
    const srovnej = () => {
      if (uzke()) zavri();
      else { menu.hidden = false; prepinac.setAttribute("aria-expanded", "false"); }
    };
    srovnej();
    addEventListener("resize", srovnej);
    prepinac.addEventListener("click", () => {
      const otevreno = prepinac.getAttribute("aria-expanded") === "true";
      menu.hidden = otevreno;
      prepinac.setAttribute("aria-expanded", String(!otevreno));
    });
    addEventListener("keydown", (e) => { if (e.key === "Escape" && uzke()) zavri(); });
  }

  /* ----------------------------------------------------------------- lupa */
  const mrizka = $("[data-galerie]");
  if (mrizka) {
    const tlacitka = $$("[data-lupa]", mrizka);
    const plne = $$("[data-plna]").map((t) => t.innerHTML);
    let kde = 0;

    const dialog = document.createElement("dialog");
    dialog.className = "lupa";
    dialog.innerHTML =
      '<button class="lupa__zavrit" type="button" aria-label="Zavřít">✕</button>' +
      '<button class="lupa__zpet" type="button" aria-label="Předchozí fotka">‹</button>' +
      '<button class="lupa__dal" type="button" aria-label="Další fotka">›</button>' +
      '<div><div data-misto></div><p class="lupa__popis" data-pocet></p></div>';
    document.body.append(dialog);
    const misto = $("[data-misto]", dialog);
    const pocet = $("[data-pocet]", dialog);

    const ukaz = (i) => {
      kde = (i + plne.length) % plne.length;
      misto.innerHTML = plne[kde];
      pocet.textContent = `${kde + 1} z ${plne.length}`;
      const jedna = plne.length < 2;
      $(".lupa__zpet", dialog).hidden = jedna;
      $(".lupa__dal", dialog).hidden = jedna;
    };

    tlacitka.forEach((b, i) => b.addEventListener("click", () => { ukaz(i); dialog.showModal(); }));
    $(".lupa__zavrit", dialog).addEventListener("click", () => dialog.close());
    $(".lupa__dal", dialog).addEventListener("click", () => ukaz(kde + 1));
    $(".lupa__zpet", dialog).addEventListener("click", () => ukaz(kde - 1));
    dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); ukaz(kde + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); ukaz(kde - 1); }
    });
  }

  /* ----------------------------------------------------- filtr realizací */
  const filtr = $("[data-filtr]");
  const seznam = $("[data-seznam-realizaci]");
  if (filtr && seznam) {
    const nic = $("[data-nic]");
    filtr.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      const k = b.dataset.kategorie;
      $$("button", filtr).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      let videt = 0;
      $$("[data-kategorie]", seznam).forEach((karta) => {
        const ano = !k || karta.dataset.kategorie === k;
        karta.hidden = !ano;
        if (ano) videt++;
      });
      if (nic) nic.hidden = videt > 0;
    });
  }

  /* ----------------------------------------------------- nahrávání fotek */
  const nahraj = $("[data-nahraj]");
  if (nahraj) {
    const vstup = $("input[type=file]", nahraj);
    const vypis = $("[data-nahraj-seznam]", nahraj);
    const soubory = [];
    const MAX = 5;
    const MAX_B = 10 * 1024 * 1024;
    const cist = (s) => String(s).replace(/[<>&"]/g, "");

    const prekresli = () => {
      vypis.innerHTML = soubory.map((f, i) =>
        `<span class="nahraj__kus">${cist(f.name)} <button type="button" data-pryc="${i}"`
        + ` aria-label="Odebrat ${cist(f.name)}">✕</button></span>`).join("");
    };
    const pridej = (nove) => {
      for (const f of nove) {
        if (soubory.length >= MAX) break;
        if (!f.type.startsWith("image/") || f.size > MAX_B) continue;
        soubory.push(f);
      }
      prekresli();
    };

    vstup.addEventListener("change", () => pridej(vstup.files));
    vypis.addEventListener("click", (e) => {
      const b = e.target.closest("[data-pryc]");
      if (!b) return;
      e.preventDefault();
      soubory.splice(Number(b.dataset.pryc), 1);
      prekresli();
    });
    ["dragenter", "dragover"].forEach((t) => nahraj.addEventListener(t, (e) => {
      e.preventDefault();
      nahraj.setAttribute("data-nad", "ano");
    }));
    ["dragleave", "drop"].forEach((t) => nahraj.addEventListener(t, (e) => {
      e.preventDefault();
      nahraj.removeAttribute("data-nad");
    }));
    nahraj.addEventListener("drop", (e) => pridej(e.dataTransfer.files));
  }

  /* ------------------------------------------------- poptávkový formulář */
  const form = $("[data-poptavka]");
  if (form) {
    const vysledek = $("[data-vysledek]", form);

    const chyba = (jmeno, text) => {
      const p = $(`[data-chyba-pro="${jmeno}"]`, form);
      const pole = $(`[name="${jmeno}"]`, form)?.closest(".pole");
      if (p) { p.textContent = text || ""; p.hidden = !text; }
      if (pole) {
        if (text) pole.setAttribute("data-chyba", "ano");
        else pole.removeAttribute("data-chyba");
      }
    };

    const telefonOk = (v) => {
      const cisla = v.replace(/[^\d+]/g, "");
      return /^(\+420)?\d{9}$/.test(cisla) || /^\+\d{9,15}$/.test(cisla);
    };

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const d = new FormData(form);
      let ok = true;

      const jmeno = String(d.get("jmeno") || "").trim();
      if (jmeno.length < 3) { chyba("jmeno", "Napište prosím jméno a příjmení."); ok = false; }
      else chyba("jmeno", "");

      const telefon = String(d.get("telefon") || "").trim();
      if (!telefonOk(telefon)) { chyba("telefon", "Telefon nevypadá správně — zkuste třeba +420 601 234 567."); ok = false; }
      else chyba("telefon", "");

      const email = String(d.get("email") || "").trim();
      if (email && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) { chyba("email", "E-mail nevypadá správně."); ok = false; }
      else chyba("email", "");

      const zprava = String(d.get("zprava") || "").trim();
      if (zprava.length < 10) { chyba("zprava", "Napište prosím pár slov o tom, co potřebujete."); ok = false; }
      else chyba("zprava", "");

      if (!d.get("souhlas")) {
        vysledek.hidden = false;
        vysledek.className = "hlaska";
        vysledek.innerHTML = "<span>Bez souhlasu se zpracováním údajů poptávku odeslat nemůžeme.</span>";
        ok = false;
      }

      if (!ok) {
        $("[data-chyba] input, [data-chyba] textarea", form)?.focus();
        return;
      }

      vysledek.hidden = false;
      vysledek.className = "hlaska hlaska--ukazka";
      vysledek.innerHTML = "<span><strong>Takhle to bude vypadat.</strong> V ukázce se poptávka neodesílá — "
        + "na hotovém webu by teď odešla na info@korosklo.cz a zároveň se objevila v administraci "
        + "mezi poptávkami.</span>";
      vysledek.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }
})();
