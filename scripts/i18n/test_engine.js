/* test_engine.js <path to i18n.js or atom-i18n.js>: the language engine alone, in Node, with small made-up packs.
   It checks the parts a translator leans on: forms of names, names recognized from plain strings, isotopes,
   lists, plurals chosen from a written number, context tags, entry of numbers, and right-to-left wrapping. */
const fs = require("fs"), vm = require("vm");
const src = fs.readFileSync(process.argv[2], "utf8");
let fails = 0, n = 0;
const eq = (got, want, what) => { n++; if (String(got) !== String(want)) { fails++; console.log("FAIL " + what + "\n   got:  " + JSON.stringify(String(got)) + "\n   want: " + JSON.stringify(String(want))); } };
function boot(lang, pack, navLangs, code) {
  const listeners = {}, cls = new Set();
  const attrs = {}, html = { className: "", lang: "", dir: "", attrs, classList: { add: c => cls.add(c), remove: c => cls.delete(c), contains: c => cls.has(c) }, setAttribute(k, v) { attrs[k] = v; }, removeAttribute(k) { delete attrs[k]; }, getAttribute: k => (k in attrs ? attrs[k] : null) };
  const doc = { readyState: "loading", documentElement: html, currentScript: null, write() {}, addEventListener: (e, f) => { listeners[e] = f; }, getElementById: () => null, querySelectorAll: () => [], head: null, createElement: () => ({}) };
  const names = ["Hydrogen", "Helium", "Lithium", "Beryllium", "Boron", "Carbon", "Nitrogen", "Oxygen"];
  const q = /^[?]/.test(lang || "") ? lang : (lang ? "?lang=" + lang : ""); if (q !== (lang ? "?lang=" + lang : "")) lang = "";
  const win = { location: { search: q, href: "http://x/" + q }, ELEMENTS: names.map((nm, i) => [i + 1, ["H", "He", "Li", "Be", "B", "C", "N", "O"][i], nm]), addEventListener() {}, dispatchEvent() {} };
  const ctx = { window: win, document: doc, navigator: { languages: navLangs || ["en-US"], language: "en-US" }, localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, Intl, console, URL, Promise, setTimeout, Event: function () {} };
  ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(src.replace(/var AVAILABLE = \[[^\]]*\];/, 'var AVAILABLE = ["en","es","fr","ru","ar","bn","pt","zh","id","hi","ur"];') + "\nthis.AtomI18N=AtomI18N;", ctx);
  const A = ctx.AtomI18N;
  if (pack) A.load(code || lang, pack);
  if (listeners.DOMContentLoaded) listeners.DOMContentLoaded();
  return { A, html, h: s => A.hash(s) };
}
const mk = (A, t) => { const o = {}; for (const k in t) o[A.hash(k)] = t[k]; return o; };

/* ---- English: nothing changes, and a context tag is never shown */
{ const { A } = boot("");
  eq(A.T("Volume [[sound]]"), "Volume", "en: a context tag is stripped");
  eq(A.bidi("iron: [Ar] 3d⁶ 4s²"), "iron: [Ar] 3d⁶ 4s²", "en: a left-to-right page adds no marks");
  eq(A.T("{El} has {n, plural, one {# proton} other {# protons}}.", { z: 6, n: 6 }), "Carbon has 6 protons.", "en: element and plural");
  eq(A.T("It decays to {next}.", { next: A.iso(6, 14) }), "It decays to carbon-14.", "en: an isotope reference reads as before");
  eq(A.T("{el:gen} and {El:the}", { z: 2 }), "helium and Helium", "en: a form English does not have falls back to the name");
  eq(A.low("Big Bang fusion"), "big Bang fusion", "low() lowers the first letter only");
  eq(A.list(["a", "b", "c"]), "a, b, and c", "en: a list");
  eq(A.list([]) === "", true, "an empty list is an empty primitive string (falsy)");
  eq(A.parseNumber("1,234"), 1234, "en entry: 1,234 is grouping");
  eq(A.parseNumber("35.45"), 35.45, "en entry: decimal point");
  eq(isNaN(A.parseNumber("abc")), true, "entry: not a number");
  eq(A.parseNumber("٣٥٫٤٥"), 35.45, "entry: Arabic-Indic digits and decimal mark");
  eq(A.parseNumber("৩৫.৪৫"), 35.45, "entry: Bengali digits");
  eq(A.parseNumber("−2"), -2, "entry: a real minus sign");
}
/* ---- Russian: cases, isotopes that decline inside, names recognized from strings, plural from "1,5" */
{ const ruEl = ["водород", "гелий", "литий", "бериллий", "бор", "углерод", "азот", "кислород"], gen = ["водорода", "гелия", "лития", "бериллия", "бора", "углерода", "азота", "кислорода"], ins = ["водородом", "гелием", "литием", "бериллием", "бором", "углеродом", "азотом", "кислородом"];
  const pre = boot("ru", null); const A0 = pre.A;
  const t = mk(A0, { "No isotope of {el} is stable.": "У {el:gen} нет стабильных изотопов.", "{Iso} decays by {mode} to {next}.": "{Iso} превращается в {next:acc} в результате {mode:gen}.",
    "{El}'s atoms are about {r} times as wide.": "Атомы {el:gen} примерно в {r, plural, one {# раз} few {# раза} many {# раз} other {# раза}} шире.", "alpha decay": "альфа-распад", "It bonds to {other}.": "Он соединяется с {other:ins}.",
    "Between {list}.": "Между {list:ins}.", "{el:g, select, f {made} other {made}}": "{el:g, select, f {получена} n {получено} other {получен}}" });
  const { A, html } = boot("ru", { meta: { locale: "ru-RU", forms: ["gen", "acc", "ins", "g"] }, el: ruEl, forms: { gen: gen, acc: ruEl, ins: ins, g: ["m", "m", "m", "m", "m", "m", "m", "m"] }, terms: { "альфа-распад": { gen: "альфа-распада" } }, t: t, s: {}, g: {} });
  eq(html.lang, "ru", "ru: html lang");
  eq(A.T("No isotope of {el} is stable.", { z: 6 }), "У углерода нет стабильных изотопов.", "ru: genitive from z");
  eq(A.T("{Iso} decays by {mode} to {next}.", { Iso: A.iso(6, 14, true), mode: A.T("alpha decay"), next: A.iso(7, 14) }), "Углерод-14 превращается в азот-14 в результате альфа-распада.", "ru: isotope forms and a term's form from its plain text");
  eq(A.T("{Iso} decays by {mode} to {next}.", { Iso: "Углерод-14", mode: "альфа-распад", next: "азот-14" }), "Углерод-14 превращается в азот-14 в результате альфа-распада.", "ru: the same from finished strings");
  eq(A.T("{El}'s atoms are about {r} times as wide.", { z: 2, r: A.N(1.5, 1) }), "Атомы гелия примерно в 1,5 раза шире.", "ru: 1,5 is read as 1.5 and takes the fraction form");
  eq(A.T("{El}'s atoms are about {r} times as wide.", { z: 2, r: 5 }), "Атомы гелия примерно в 5 раз шире.", "ru: 5 takes many");
  eq(A.T("It bonds to {other}.", { other: A.theEl(8) }), "Он соединяется с кислородом.", "ru: instrumental of a second element passed by theEl");
  eq(A.T("It bonds to {other}.", { other: "Кислород" }), "Он соединяется с кислородом.", "ru: instrumental of a name passed as a capitalized string");
  eq(A.T("Between {list}.", { list: A.list([A.el(1), A.el(2), A.el(3)]) }), "Между водородом, гелием и литием.", "ru: a list in a form");
  eq(A.T("{el:g, select, f {made} other {made}}", { z: 1 }), "получен", "ru: select on a form (gender)");
  eq(A.parseNumber("660,5"), 660.5, "ru entry: decimal comma");
  eq(A.parseNumber("1 234,5"), 1234.5, "ru entry: space grouping");
}
/* ---- French: elision through forms, isotope with a space */
{ const el = ["hydrogène", "hélium", "lithium", "béryllium", "bore", "carbone", "azote", "oxygène"], the = ["l’hydrogène", "l’hélium", "le lithium", "le béryllium", "le bore", "le carbone", "l’azote", "l’oxygène"], du = ["de l’hydrogène", "de l’hélium", "du lithium", "du béryllium", "du bore", "du carbone", "de l’azote", "de l’oxygène"];
  const A0 = boot("fr", null).A;
  const t = mk(A0, { "No isotope of {el} is stable.": "Aucun isotope {el:du} n’est stable.", "Fall into {el}": "Plonger dans {el:the}", "{Iso} is stable.": "{Iso:the} est stable.", "{The_el} bonds.": "{The_el} se lie." });
  const { A } = boot("fr", { meta: { locale: "fr-FR", iso: "{el} {A}", forms: ["the", "du"] }, el: el, forms: { the: the, du: du }, t: t, s: {}, g: {} });
  eq(A.T("No isotope of {el} is stable.", { z: 1 }), "Aucun isotope de l’hydrogène n’est stable.", "fr: du with elision");
  eq(A.T("No isotope of {el} is stable.", { z: 6 }), "Aucun isotope du carbone n’est stable.", "fr: du");
  eq(A.T("Fall into {el}", { z: 8 }), "Plonger dans l’oxygène", "fr: the");
  eq(A.T("{Iso} is stable.", { Iso: A.iso(6, 12, true) }), "Le carbone 12 est stable.", "fr: an isotope with its article, capitalized, with a space");
  eq(A.T("{The_el} bonds.", { z: 7 }), "L’azote se lie.", "fr: {The_el} still works, from forms.the");
  eq(A.theEl(1), "l’hydrogène", "fr: theEl()");
}
/* ---- Arabic: joined prefixes are not broken by an isolate; numbers and Latin still are wrapped */
{ const el = ["هيدروجين", "هيليوم", "ليثيوم", "بيريليوم", "بورون", "كربون", "نيتروجين", "أكسجين"], def = el.map(x => "ال" + x);
  const A0 = boot("ar", null).A;
  const t = mk(A0, { "It bonds to {other}.": "يرتبط ب{other:def}.", "Mass {m} u": "الكتلة {m} u", "{El}: {v}.": "{El:def}: {v}." });
  const { A, html } = boot("ar", { meta: { locale: "ar", forms: ["def"] }, el: el, forms: { def: def }, t: t, s: {}, g: {} });
  eq(html.dir, "rtl", "ar: dir");
  eq(A.T("It bonds to {other}.", { other: A.el(6) }), "يرتبط بالكربون.", "ar: a name from the pack is not isolated, so it joins its prefix");
  eq(A.T("Mass {m} u", { m: "12.011" }), "الكتلة ⁦⁨12.011⁩ u⁩", "ar: a number is isolated, and stays in one left-to-right run with its unit");
  /* a left-to-right expression typed into a right-to-left sentence keeps its order */
  const L = "⁦", P = "⁩";
  eq(A.bidi("حديد: [Ar] 3d⁶ 4s²"), "حديد: " + L + "[Ar] 3d⁶ 4s²" + P, "ar: a configuration is one run, bracket included");
  eq(A.bidi("بروتون (p⁺) موجب"), "بروتون (" + L + "p⁺" + P + ") موجب", "ar: a symbol with its sign; the sentence's own brackets stay outside");
  eq(A.bidi("الشحنة −1"), "الشحنة " + L + "−1" + P, "ar: a leading sign stays in front of its number");
  eq(A.bidi("الكثافة 19.3 g/cm³."), "الكثافة " + L + "19.3 g/cm³" + P + ".", "ar: a number with its unit; the full stop stays with the sentence");
  eq(A.bidi("1,337.3 K (1,064.2 °C)"), L + "1,337.3 K (1,064.2 °C)" + P, "ar: a value with a bracket inside is one run");
  eq(A.bidi("العناصر 57–71 هنا"), "العناصر " + L + "57–71" + P + " هنا", "ar: a range reads low to high");
  eq(A.bidi("عمر النصف 4.468 مليار سنة"), "عمر النصف 4.468 مليار سنة", "ar: a plain number needs nothing");
  eq(A.bidi("الرمز Fe، والنسبة 75.76%"), "الرمز Fe، والنسبة 75.76%", "ar: a lone Latin word and a percentage need nothing");
  eq(A.bidi(A.bidi("حديد: [Ar] 3d⁶ 4s²")), A.bidi("حديد: [Ar] 3d⁶ 4s²"), "ar: wrapping twice changes nothing");
  eq(A.plain(A.bidi("الشحنة −1")), "الشحنة −1", "ar: plain() takes the marks out again");
  const t2 = mk(A0, { "Water is H<sub>2</sub>O here.": "الماء H<sub>2</sub>O هنا.", "Step {k}: {what}": "الخطوة {k}: {what}" });
  const B = boot("ar", { meta: { locale: "ar" }, el: el, t: t2, s: {}, g: {} }).A;
  eq(B.T("Water is H<sub>2</sub>O here."), "الماء " + L + "H<sub>2</sub>O" + P + " هنا.", "ar: a formula with markup inside is wrapped whole");
  eq(B.T("Step {k}: {what}", { k: 3, what: "E = mc²" }), "الخطوة ⁨3⁩: ⁨E = mc²⁩", "ar: values the engine already isolated are not wrapped again");
  eq(A.T("{El}: {v}.", { z: 6, v: "1s² 2s² 2p²" }), "الكربون: ⁨1s² 2s² 2p²⁩.", "ar: a Latin value is isolated, the name is not");
}
/* ---- Bengali: the ending follows the number */
{ const el = ["হাইড্রোজেন", "হিলিয়াম", "লিথিয়াম", "বেরিলিয়াম", "বোরন", "কার্বন", "নাইট্রোজেন", "অক্সিজেন"];
  const A0 = boot("bn", null).A;
  const t = mk(A0, { "The nucleus of {iso}": "{iso:gen} নিউক্লিয়াস" });
  const { A } = boot("bn", { meta: { locale: "bn", iso: { "": "{el}-{A}", gen: "{el}-{A}-এর" }, forms: ["gen"] }, el: el, forms: { gen: el.map(x => x + "ের") }, t: t, s: {}, g: {} });
  eq(A.T("The nucleus of {iso}", { iso: A.iso(6, 14) }), "কার্বন-14-এর নিউক্লিয়াস", "bn: a per-form isotope pattern");
}
/* ---- which pack a browser's language asks for, and the tag the page carries */
{ const tiny = { meta: {}, t: {}, s: {}, g: {} };
  eq(boot("", null, ["zh-TW", "en"]).A.lang, "en", "zh-TW is not handed the Simplified pack");
  eq(boot("", tiny, ["zh-CN"], "zh").A.lang, "zh", "zh-CN gets zh");
  eq(boot("", tiny, ["in-ID"], "id").A.lang, "id", "in-ID is Indonesian");
  eq(boot("zh", tiny).html.lang, "zh-Hans", "zh: html lang is zh-Hans");
  eq(boot("pt", tiny).html.lang, "pt-BR", "pt: html lang is pt-BR");
  eq(boot("fr", null).A.failed, "fr", "a pack that does not arrive is reported, and the page is English");
}
/* ---- display options: set on <html> from the address, and only the values Atom knows */
{ let b1 = boot("?contrast=more&spacing=wide");
  eq(b1.html.attrs["data-contrast"] + "," + b1.html.attrs["data-spacing"], "more,wide", "display: contrast and spacing from the address");
  b1 = boot('?contrast=%22%3E%3Cimg%3E&spacing=WIDE');
  eq(("data-contrast" in b1.html.attrs) + "," + ("data-spacing" in b1.html.attrs), "false,false", "display: a value Atom does not know sets nothing");
  eq(boot("").A.display("contrast"), "", "display: off by default");
}
console.log(fails ? fails + " of " + n + " engine checks FAILED" : "engine: " + n + " checks pass");
process.exit(fails ? 1 : 0);
