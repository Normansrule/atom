// smoke.mjs: load the website and the in-browser app the way GitHub Pages
// serves them (under /atom/), and fail on anything a visitor would hit:
//
//   * a script error, or a console error
//   * a request that fails, or any request that leaves the site (Atom makes none)
//   * the table not building all 118 squares, or the app's own physics self-test failing
//   * a missing 404 page
//   * serious or critical accessibility problems found by axe-core
//
//   npm install --no-save playwright axe-core && npx playwright install chromium
//   node scripts/smoke.mjs
//   ATOM_BROWSER=webkit node scripts/smoke.mjs      (Safari's engine; also firefox)
//
// CHROME_PATH points it at a browser you already have, if you prefer.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
let pw;
try { pw = await import("playwright"); } catch { pw = await import("playwright-core"); }
const ENGINE = process.env.ATOM_BROWSER || "chromium";
const launcher = pw[ENGINE];
if (!launcher) { console.error(`no such browser: ${ENGINE} (chromium, webkit, firefox)`); process.exit(2); }
const AXE = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

const ROOT = path.resolve(process.env.DOCS_ROOT || path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "docs"));
const BASE = "/atom/";
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png",
  ".jpg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2", ".txt": "text/plain", ".xml": "application/xml", ".json": "application/json" };

const server = http.createServer((req, res) => {
  let u;
  try { u = decodeURIComponent(new URL(req.url, "http://x").pathname); } catch { res.writeHead(400); return res.end(); }
  if (!u.startsWith(BASE)) { res.writeHead(404); return res.end(); }
  let f = path.join(ROOT, u.slice(BASE.length));
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
  if (!fs.existsSync(f)) { res.writeHead(404, { "content-type": TYPES[".html"] }); return res.end(fs.readFileSync(path.join(ROOT, "404.html"))); }
  res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" });
  res.end(fs.readFileSync(f));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;

const failures = [];
// the service worker's cache is named for the release and for the files in it: the version
// must be VERSION's, and the build stamp must be the hash of the files (scripts/stamp_sw.py writes it)
{
  const { createHash } = await import("node:crypto");
  const vf = [path.join(ROOT, "..", "VERSION"), path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "VERSION")].find((f) => fs.existsSync(f));
  const v = vf ? fs.readFileSync(vf, "utf8").trim() : null;
  const sw = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
  const m = /var VERSION = "([^"]+)"/.exec(sw), bm = /var BUILD = "([0-9a-f]*)"/.exec(sw), cm = /var CORE = (\[[\s\S]*?\]);/.exec(sw);
  if (v && (!m || m[1] !== v)) { console.log(`  FAIL sw.js says ${m ? m[1] : "nothing"} but VERSION says ${v}`); process.exit(1); }
  console.log(`  ok   sw.js cache version ${m ? m[1] : "?"}${v ? "" : " (VERSION file not found here, not compared)"}`);
  if (!bm || !cm) { console.log("  FAIL sw.js has no BUILD stamp or no CORE list"); process.exit(1); }
  const files = [...new Set(JSON.parse(cm[1]).map((f) => (f === "./" ? "index.html" : f)))].sort();
  const packDir = path.join(ROOT, "assets", "i18n");
  if (fs.existsSync(packDir)) files.push(...fs.readdirSync(packDir).filter((f) => f.endsWith(".js")).sort().map((f) => "assets/i18n/" + f));
  const h = createHash("sha256");
  for (const f of files) { h.update(f); h.update("\0"); h.update(fs.readFileSync(path.join(ROOT, f))); h.update("\0"); }
  const want = h.digest("hex").slice(0, 8);
  if (bm[1] !== want) { console.log(`  FAIL sw.js says BUILD ${bm[1]} but the files give ${want}: run python3 scripts/stamp_sw.py`); process.exit(1); }
  console.log(`  ok   sw.js build stamp ${want} matches the ${files.length} files it names`);
}
const fail = (where, what) => { failures.push(`${where}: ${what}`); console.log(`  FAIL ${where}: ${what}`);
  // on GitHub the line also becomes an annotation: the run's page shows it to anyone, where the log itself needs a sign-in
  if (process.env.GITHUB_ACTIONS) console.log(`::error title=Smoke test (${ENGINE})::${(where + ": " + what).replace(/%/g, "%25").replace(/\r?\n/g, " ").slice(0, 900)}`); };
// Wait for a state, not for a guessed number of milliseconds. 2.0.0's first push failed here in Chromium and
// WebKit, and only in CI: the depth-gauge check slept 900 ms after a smooth scroll that takes 800 ms on a fast
// machine and 1.7 s on one core. `taskset -c 0 node scripts/smoke.mjs` is the slow machine; run it before a release.
const until = (page, fn, arg, ms = 15000) => page.waitForFunction(fn, arg, { timeout: ms }).then(() => true, () => false);
// the worker is told which language files this reader uses and fetches them itself: offline is fair to ask for once they are kept
// a 2D canvas has been drawn on: more than one color among a few hundred sampled pixels
const drawn = (page, sel) => until(page, (q) => { const c = document.querySelector(q); if (!c || !c.width) return false; const g = c.getContext("2d"), d = g.getImageData(0, 0, c.width, c.height).data, seen = new Set();
  for (let i = 0; i < d.length; i += 4 * Math.max(1, Math.floor(d.length / 4 / 600))) seen.add(d[i] + "," + d[i + 1] + "," + d[i + 2] + "," + d[i + 3]); return seen.size > 1; }, sel);
const packsKept = (page) => until(page, async () => { const f = AtomI18N.packFiles(); if (!f.length) return true;
  for (const k of await caches.keys()) { const c = await caches.open(k); if ((await Promise.all(f.map((u) => c.match(u)))).every(Boolean)) return true; } return false; });
const ok = (where, what) => console.log(`  ok   ${where}: ${what}`);

console.log(`browser: ${ENGINE}`);
const browser = await launcher.launch(ENGINE === "chromium" ? {
  executablePath: process.env.CHROME_PATH || undefined,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", ...(process.env.ATOM_CHROME_ARGS || "").split(" ").filter(Boolean)],
} : {});

// SMOKE_ONLY=<regex> runs only the visits whose name matches (a slow sandbox cannot finish them all in one go);
// SMOKE_SKIP=<regex> leaves those out. CI sets neither.
const ONLY = process.env.SMOKE_ONLY ? new RegExp(process.env.SMOKE_ONLY) : null, SKIP = process.env.SMOKE_SKIP ? new RegExp(process.env.SMOKE_SKIP) : null;
async function visit(name, url, check, opts = {}) {
  if ((ONLY && !ONLY.test(name)) || (SKIP && SKIP.test(name))) return;
  console.log(`\n${name}  ${url}`);
  const page = await browser.newPage({ viewport: opts.viewport || { width: 1440, height: 900 }, ...(opts.context || {}) });
  if (opts.init) await page.addInitScript(opts.init);
  const errors = [], outside = [], broken = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
  page.on("console", (m) => { if (m.type() === "error" && !(opts.allow404 && /404/.test(m.text()))) errors.push(m.text().slice(0, 200)); });
  page.on("request", (r) => { const u = r.url(); if (!u.startsWith(ORIGIN) && !u.startsWith("data:") && !u.startsWith("blob:")) outside.push(u); });
  page.on("requestfailed", (r) => broken.push(r.url()));
  page.on("response", (r) => { if (r.status() >= 400 && !opts.allow404) broken.push(`${r.status()} ${r.url()}`); });
  const resp = await page.goto(ORIGIN + url, { waitUntil: "load" });
  await page.waitForTimeout(opts.wait || 6000);
  if (!opts.allow404 && resp.status() !== 200) fail(name, `HTTP ${resp.status()}`);
  errors.length ? fail(name, `script or console errors: ${errors.join(" | ")}`) : ok(name, "no script or console errors");
  outside.length ? fail(name, `requests leaving the site: ${outside.join(", ")}`) : ok(name, "no requests leave the site");
  broken.length ? fail(name, `failed requests: ${broken.join(", ")}`) : ok(name, "every request succeeded");
  await check(page, name);
  if (!opts.skipAxe) {
    await page.evaluate(AXE);   // through the debugger, so the page's own CSP still guards everything else
    const r = await page.evaluate(async () => await window.axe.run(document, {
      resultTypes: ["violations"],
      // contrast is measured pixel by pixel elsewhere: axe cannot see a WebGL
      // canvas, so it guesses the ground behind every label over the scene wrong
      rules: { "color-contrast": { enabled: false } },
    }));
    const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    bad.length ? fail(name, "accessibility: " + bad.map((v) => `${v.id} (${v.nodes.length}) ${v.help}`).join("; "))
               : ok(name, `accessibility: no serious or critical issues (${r.violations.length} minor)`);
  }
  await page.close();
}

await visit("site", `${BASE}`, async (page, n) => {
  const tiles = await page.locator(".pt-el").count();
  tiles === 118 ? ok(n, "118 squares") : fail(n, `${tiles} squares`);
  const title = await page.title();
  /Atom/.test(title) ? ok(n, `title "${title}"`) : fail(n, `title "${title}"`);
  await page.click(".pt-el[data-z='79']"); await page.locator("#sheet").waitFor({ state: "visible", timeout: 15000 }).catch(() => {}); await page.waitForTimeout(800);
  (await page.locator("#sheet").isVisible()) ? ok(n, "gold's card opens") : fail(n, "the card did not open");
  await page.click('#sheet [data-pdt="origin"]').catch(() => {});
  (await drawn(page, "#sheet canvas.pd-ocv")) ? ok(n, "the card's Origin tab draws how gold was made") : fail(n, "the origin drawing stayed blank");
  // the labs arrive on their own once a reader heads for them
  await page.keyboard.press("Escape");
  await page.evaluate(() => document.getElementById("labs").scrollIntoView());
  await page.waitForFunction(() => window.AtomLabs && document.querySelectorAll("#labsHost [role=tab]").length === 7, null, { timeout: 30000 }).catch(() => {});
  const tabs = await page.locator("#labsHost [role=tab]").count();
  tabs === 7 ? ok(n, "the labs load on approach, seven tabs") : fail(n, `the labs did not load (${tabs} tabs)`);
  const labBad = await page.evaluate(() => window.AtomLabs ? AtomLabs.selfTest().filter((x) => !x[1]).map((x) => x[0]) : ["no AtomLabs"]);
  labBad.length ? fail(n, "labs self-test on the site: " + labBad.join("; ")) : ok(n, "labs self-test passes on the site");
  // the ground behind the text panels. From 1.3.0 to 1.7.0 a stray "}" in site.css closed :root early, --veil was
  // never set, and the labs' text sat straight on the moving scene; nothing looked at the panel's own background.
  const veil = await page.evaluate(() => { const c = getComputedStyle(document.querySelector(".labs-panel")).backgroundColor, m = c.match(/[\d.]+/g) || [];
    return { c, a: c === "transparent" ? 0 : c.includes("/") ? +m[m.length - 1] : /^rgba\(/.test(c) ? +m[3] : 1 }; });
  veil.a >= 0.9 ? ok(n, `the labs' text has its ground (${veil.c})`) : fail(n, `the labs panel is see-through (${veil.c}): --veil is not set`);
  await page.evaluate(() => document.getElementById("lbTab-math").click());
  await until(page, () => /gold/i.test((document.querySelector("#labsHost .lb-mtitle") || {}).textContent || ""));
  const mt = await page.evaluate(() => (document.querySelector("#labsHost .lb-mtitle") || {}).textContent || "");
  /gold/i.test(mt) ? ok(n, "The math opens on gold") : fail(n, `The math did not open (${mt})`);
  // back to the top with everything loaded, so the accessibility pass that
  // follows sees the table's bar (Today's element, the lenses) as a reader would
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(400);
  // offline: once the worker has the site, the page loads with the network cut
  const swOk = await page.evaluate(() => navigator.serviceWorker ? navigator.serviceWorker.ready.then(() => true).catch(() => false) : false).catch(() => false);
  if (swOk) {
    await packsKept(page); await page.waitForTimeout(1500);
    const ctx = page.context();
    await ctx.setOffline(true);
    let loaded = false;
    try { const r = await page.reload({ waitUntil: "load", timeout: 30000 }); await until(page, () => document.querySelectorAll(".pt-el").length === 118); await page.waitForTimeout(1000); loaded = !!r && (await page.locator(".pt-el").count()) === 118; } catch (e) { loaded = false; }
    await ctx.setOffline(false);
    loaded ? ok(n, "loads offline from the service worker (118 squares)") : fail(n, "did not load offline");
  } else fail(n, "the service worker did not register");
});

await visit("site, phone", `${BASE}?el=Fe`, async (page, n) => {
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  sw <= 390 ? ok(n, "no sideways scroll at 390 px") : fail(n, `page is ${sw}px wide at 390`);
}, { viewport: { width: 390, height: 844 }, context: { isMobile: true, hasTouch: true }, skipAxe: true });

await visit("site, reduced motion", `${BASE}`, async (page, n) => {
  (await page.evaluate(() => document.documentElement.classList.contains("calm"))) ? ok(n, "calm mode on") : fail(n, "calm mode off");
}, { context: { reducedMotion: "reduce" }, skipAxe: true, wait: 3000 });

await visit("app in the browser", `${BASE}app/`, async (page, n) => {
  const st = await page.evaluate(() => window.__ATOM_SELFTEST__ && { ok: window.__ATOM_SELFTEST__.ok, bad: window.__ATOM_SELFTEST__.lines.filter((l) => /FAIL/.test(l)) });
  st && st.ok ? ok(n, "physics self-test passes") : fail(n, "physics self-test: " + JSON.stringify(st));
  const tiles = await page.locator("#front .pt-el").count();
  tiles === 118 ? ok(n, "118 squares on the front table") : fail(n, `${tiles} squares`);
  // the labs: every self-test, then every step of The math for the elements
  // most likely to break it (one electron, two, a d-shell oddity, the heaviest)
  const labBad = await page.evaluate(() => AtomLabs.selfTest().filter((x) => !x[1]).map((x) => x[0]));
  labBad.length ? fail(n, "labs self-test: " + labBad.join("; ")) : ok(n, "labs self-test passes");
  const mathBad = await page.evaluate(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    frontLabs("math"); await wait(500);
    const host = document.querySelector("#frontBenchHost"), out = [];
    for (const name of ["Hydrogen", "Helium", "Iron", "Palladium", "Gold", "Oganesson"]) {
      const box = host.querySelector("[data-mz]"); box.value = name; box.dispatchEvent(new Event("change", { bubbles: true })); await wait(60);
      for (let k = 0; k < 10; k++) {
        host.querySelector(`[data-mch="${k}"]`).click(); await wait(40);
        const t = host.querySelector("[data-lp=math] .lb-math").innerText;
        if (/NaN|undefined|Infinity/.test(t)) out.push(`${name} step ${k + 1}`);
        if (k === 8 && /Binding energy\s*−/.test(t)) out.push(`${name}: negative binding energy`);
      }
    }
    return out;
  });
  mathBad.length ? fail(n, "The math: " + mathBad.join(", ")) : ok(n, "The math: 6 elements × 10 steps render cleanly");
}, { wait: 9000, viewport: { width: 1440, height: 960 } });

// every language pack: the page comes up in that language, the labs load, no
// English sentence is left where the pack has a translation, and axe still passes
for (const code of ["es"]) {
  await visit(`site in ${code}`, `${BASE}?lang=${code}`, async (page, n) => {
    const lang = await page.evaluate(() => document.documentElement.lang);
    lang === code ? ok(n, `html lang="${code}"`) : fail(n, `html lang="${lang}"`);
    const badge = await page.evaluate(() => ((document.querySelector(".lang-menu .lang-sum") || {}).textContent || "").trim());
    badge === code.toUpperCase() ? ok(n, "the language badge shows it") : fail(n, `badge ${badge}`);
    const left = await page.evaluate(() => AtomI18N.missing.length);
    left === 0 ? ok(n, "every string the page asked for is in the pack") : fail(n, `${left} strings missing from the pack: ${await page.evaluate(() => AtomI18N.missing.slice(0, 5).join(" | "))}`);
    const fe = await page.evaluate(() => ELEMENTS[25][2]);
    fe !== "Iron" ? ok(n, `element names localized (${fe})`) : fail(n, "element names still English");
    await page.evaluate(() => document.getElementById("labs").scrollIntoView());
    await page.waitForFunction(() => window.AtomLabs && document.querySelectorAll("#labsHost [role=tab]").length === 7, null, { timeout: 30000 }).catch(() => {});
    const tabs = await page.locator("#labsHost [role=tab]").count();
    tabs === 7 ? ok(n, "the labs load, seven tabs") : fail(n, `the labs did not load (${tabs} tabs)`);
    const left2 = await page.evaluate(() => AtomI18N.missing.length);
    left2 === 0 ? ok(n, "the labs' strings are all in the pack") : fail(n, `${left2} lab strings missing: ${await page.evaluate(() => AtomI18N.missing.slice(0, 5).join(" | "))}`);
    // sentences are whole: an article meets its preposition by the language's rule, and no other word is touched
    if (code === "es") {
      const said = await page.evaluate(() => [AtomI18N.T("About {el}", { z: 26 }), AtomI18N.T("About {el}", { z: 47 }),
        AtomI18N.T("{n, plural, one {# question} other {# questions}} about {m, plural, one {# element} other {# elements}}. Send the link, or read out the code.", { n: 2, m: 1 })]);
      said[0] === "Acerca del hierro" && said[1] === "Acerca de la plata" && /Envía el enlace/.test(said[2]) && /1 elemento\./.test(said[2])
        ? ok(n, `articles, contractions and plurals: ${said[0]}; ${said[1]}; ${said[2]}`) : fail(n, "a sentence is put together wrong: " + said.join(" | "));
    }
    // the depth gauge is translated and still marks where the reader is
    await page.evaluate(() => document.getElementById("cloud").scrollIntoView());
    await until(page, () => { const a = document.querySelector(".gauge a.on, .gauge a[aria-current]"); return !!a && a.getAttribute("data-depth") === "cloud"; });
    const here = await page.evaluate(() => { const a = document.querySelector(".gauge a.on, .gauge a[aria-current]"); return a ? a.getAttribute("data-depth") + ":" + a.textContent.trim() : null; });
    here && /^cloud:/.test(here) && !/Atom$/.test(here) ? ok(n, `the depth gauge marks the scene (${here.replace(/\s+/g, " ")})`) : fail(n, `the depth gauge did not mark the cloud scene (${here})`);
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(400);
    // offline in this language: the pack files are kept with the site
    const swOk = await page.evaluate(() => navigator.serviceWorker ? navigator.serviceWorker.ready.then(() => true).catch(() => false) : false).catch(() => false);
    if (swOk) {
      await packsKept(page); await page.waitForTimeout(1500);
      const ctx = page.context(); await ctx.setOffline(true);
      let state = null;
      try { await page.reload({ waitUntil: "load", timeout: 30000 }); await until(page, () => document.querySelectorAll(".pt-el").length === 118); await page.waitForTimeout(1000); state = await page.evaluate(() => ({ lang: document.documentElement.lang, tiles: document.querySelectorAll(".pt-el").length, failed: AtomI18N.failed, name: ELEMENTS[25][2] })); } catch (e) { state = null; }
      await ctx.setOffline(false);
      state && state.lang === code && state.tiles === 118 && !state.failed && state.name !== "Iron" ? ok(n, `loads offline in ${code} (${state.name})`) : fail(n, "offline in " + code + ": " + JSON.stringify(state));
    } else fail(n, "the service worker did not register");
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(400);
  });
  // Term help: a unit's symbol is matched in its own case only, and a term's card opens from the keyboard
  await visit(`term help in ${code}`, `${BASE}?lang=${code}&terms=1#lab=predict`, async (page, n) => {
    await page.waitForFunction(() => document.querySelector("#labsHost .lb-qtext"), null, { timeout: 30000 }).catch(() => {});
    const marked = await page.evaluate(async () => { const q = document.querySelector("#labsHost .lb-qtext"); if (!q) return null;
      q.textContent = "Pm 140 pm. Fm 5 MeV."; const seen = () => [].map.call(q.querySelectorAll("dfn.lb-term"), (d) => d.textContent).join(",");
      for (let i = 0; i < 40 && seen() !== "pm,MeV"; i++) await new Promise((r) => setTimeout(r, 250));   // the marker runs on a throttled observer
      await new Promise((r) => setTimeout(r, 400)); return seen(); });
    marked === "pm,MeV" ? ok(n, "pm and MeV are marked; the symbols Pm and Fm are not") : fail(n, `marked: ${marked}`);
    const card = await page.evaluate(async () => { const d = document.querySelector("#labsHost .lb-qtext dfn.lb-term"); if (!d) return null; d.focus();
      d.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      for (let i = 0; i < 40 && !document.querySelector("#labsHost .lb-termcard"); i++) await new Promise((r) => setTimeout(r, 100));
      const c = document.querySelector("#labsHost .lb-termcard"), open = d.getAttribute("aria-expanded");
      d.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      for (let i = 0; i < 40 && document.querySelector("#labsHost .lb-termcard"); i++) await new Promise((r) => setTimeout(r, 100));
      return { text: c ? c.textContent : null, role: c ? c.getAttribute("role") : null, open, closed: !document.querySelector("#labsHost .lb-termcard") }; });
    card && card.text && card.role === "status" && card.open === "true" && card.closed ? ok(n, `a term's card opens with Enter and closes with Escape (${card.text.slice(0, 40)}…)`) : fail(n, "term card: " + JSON.stringify(card));
  }, { wait: 7000, skipAxe: true });
  await visit(`app in ${code}`, `${BASE}app/?lang=${code}`, async (page, n) => {
    const lang = await page.evaluate(() => document.documentElement.lang);
    lang === code ? ok(n, `html lang="${code}"`) : fail(n, `html lang="${lang}"`);
    const left = await page.evaluate(async () => { const wait = (ms) => new Promise((r) => setTimeout(r, ms)); frontLabs("build", 26); await wait(400); frontLabs("math", 26); await wait(400); frontLabs("lessons"); await wait(400); return AtomI18N.missing.length; });
    left === 0 ? ok(n, "build, The math and the lessons ask for nothing the pack lacks") : fail(n, `${left} strings missing: ${await page.evaluate(() => AtomI18N.missing.slice(0, 5).join(" | "))}`);
  }, { wait: 7000, viewport: { width: 1440, height: 960 } });
}

// 2.1: the Standard Model lab, a decay chain on the chart of nuclides, and the scenes below the quarks
await visit("particles", `${BASE}#lab=particles`, async (page, n) => {
  await until(page, () => document.querySelectorAll("#labsHost [data-smp]").length === 17, null, 30000);
  const tiles = await page.locator("#labsHost [data-smp]").count();
  tiles === 17 ? ok(n, "seventeen particles on the chart") : fail(n, `${tiles} particles`);
  await page.click('#labsHost [data-smp="t"]');
  const card = await page.evaluate(() => (document.querySelector("#labsHost .lb-smcard") || {}).textContent || "");
  /172\.6/.test(card) && /\+2\/3/.test(card) ? ok(n, "the top quark's card gives its mass and charge") : fail(n, "top quark card: " + card.slice(0, 120));
  let scenes = 0;
  for (const k of ["repel", "decay", "color", "annihilate"]) { await page.click(`#labsHost [data-sms="${k}"]`); if ((await drawn(page, '#labsHost [data-c="sm"]')) && (await page.evaluate(() => document.querySelector('#labsHost [data-c="sm"]').getAttribute("aria-label").length > 40))) scenes++; }
  scenes === 4 ? ok(n, "four rules draw, each with its description") : fail(n, `${scenes} of 4 rules drew`);
}, { wait: 7000 });

await visit("a decay chain", `${BASE}#lab=nuclides`, async (page, n) => {
  await until(page, () => !!document.querySelector('#labsHost [data-nc="1"]'), null, 30000);
  await page.click('#labsHost [data-nc="1"]');
  const end = await until(page, () => { const z = document.querySelector('#labsHost [data-nu="z"]'), q = document.querySelector('#labsHost [data-nu="n"]'); return !!z && z.value === "82" && q.value === "126"; }, null, 45000);
  const said = await page.evaluate(() => (document.querySelector("#labsHost .lb-nchain") || {}).textContent || "");
  end && /6 alpha/.test(said) && /4 beta/.test(said) ? ok(n, "thorium-232 plays down to lead-208: six alpha decays and four beta") : fail(n, "the thorium chain: " + said.slice(0, 160));
}, { wait: 7000, skipAxe: true });

for (const code of ["en", "es"]) {
  await visit(`below the quarks in ${code}`, `${BASE}?lang=${code}#weak`, async (page, n) => {
    (await until(page, () => !!window.AtomDeep, null, 30000)) ? ok(n, "the deep scenes load when the address points at them") : fail(n, "assets/deep.js did not load");
    let figs = 0;
    for (const id of ["deepFields", "deepMass", "deepWeak", "deepOsc", "deepLadder"]) { await page.evaluate((q) => document.getElementById(q).scrollIntoView({ block: "center" }), id); if (await drawn(page, "#" + id)) figs++; }
    figs === 5 ? ok(n, "five figures draw") : fail(n, `${figs} of 5 figures drew`);
    const osc = await page.evaluate(() => { const a = AtomDeep.oscillate(0), b = AtomDeep.oscillate(500), sum = b[0] + b[1] + b[2]; return { start: a.map((x) => +x.toFixed(6)), sum: +sum.toFixed(9), tau: +b[2].toFixed(3) }; });
    osc.start.join() === "0,1,0" && osc.sum === 1 && osc.tau > 0.9 ? ok(n, `neutrino mixing: a muon beam is all muon at the start, the three shares add to one, and it is ${Math.round(osc.tau * 100)} percent tau at 500 km per GeV`) : fail(n, "oscillation: " + JSON.stringify(osc));
    await page.evaluate(() => document.getElementById("weak").scrollIntoView());
    (await until(page, () => { const a = document.querySelector(".gauge a.on"); return !!a && a.getAttribute("data-depth") === "weak"; })) ? ok(n, "the depth gauge marks the weak force") : fail(n, "the gauge did not mark the weak force");
    await page.click("#deepDecay");
    const said = await page.evaluate(() => document.getElementById("deepDecaySay").textContent);
    said.length > 40 && (code === "en" ? /proton/.test(said) : /prot[oó]n/.test(said) && !/became/.test(said)) ? ok(n, "the decay button says what happened") : fail(n, "decay caption: " + said.slice(0, 120));
    const left = await page.evaluate(() => AtomI18N.missing.length);
    left === 0 ? ok(n, "nothing the scenes ask for is missing from the pack") : fail(n, `${left} strings missing: ${await page.evaluate(() => AtomI18N.missing.slice(0, 5).join(" | "))}`);
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(400);
  }, { wait: 3000 });
}
await visit("particles in es", `${BASE}?lang=es#lab=particles`, async (page, n) => {
  await until(page, () => document.querySelectorAll("#labsHost [data-smp]").length === 17, null, 30000);
  for (const id of ["u", "ne", "g", "H"]) await page.click(`#labsHost [data-smp="${id}"]`);
  for (const k of ["repel", "decay", "color", "annihilate"]) await page.click(`#labsHost [data-sms="${k}"]`);
  const left = await page.evaluate(() => AtomI18N.missing.length);
  left === 0 ? ok(n, "the particles, their cards, and the four rules are all in the pack") : fail(n, `${left} strings missing: ${await page.evaluate(() => AtomI18N.missing.slice(0, 6).join(" | "))}`);
}, { wait: 7000, skipAxe: true });

// a language Atom does not have, and a name every object has: the page stays English and says nothing
for (const bad of ["xx", "constructor", "ar"]) {
  await visit(`?lang=${bad}`, `${BASE}handout.html?lang=${bad}`, async (page, n) => {
    const st = await page.evaluate(() => ({ lang: document.documentElement.lang, dir: document.documentElement.dir || "ltr", cur: AtomI18N.lang, wait: document.documentElement.classList.contains("i18n-wait") }));
    st.lang === "en" && st.cur === "en" && st.dir !== "rtl" && !st.wait ? ok(n, "refused: the page is English, left to right") : fail(n, JSON.stringify(st));
  }, { wait: 800, skipAxe: true });
}
// a browser that refuses storage (private windows, locked-down school machines): the language
// rides in the address instead, and the menu's links carry it
await visit("storage refused, in es", `${BASE}handout.html?lang=es`, async (page, n) => {
  const st = await page.evaluate(() => ({ lang: document.documentElement.lang, h1: document.querySelector("h1").textContent, en: (document.querySelector('.lang-list a[hreflang="en"]') || {}).getAttribute?.("href") }));
  st.lang === "es" && /periódica/.test(st.h1) && /lang=en/.test(st.en || "") ? ok(n, "Spanish from the address alone; the menu links to ?lang=en") : fail(n, JSON.stringify(st));
}, { wait: 1200, skipAxe: true, init: () => { const no = () => { throw new DOMException("refused", "SecurityError"); }; try { Storage.prototype.getItem = no; Storage.prototype.setItem = no; Storage.prototype.removeItem = no; } catch (e) {} } });

await visit("teachers", `${BASE}teachers.html`, async (page, n) => {
  const links = await page.$$eval("main a[href^='./#lab=']", (as) => as.map((a) => a.getAttribute("href")));
  links.length >= 9 ? ok(n, `${links.length} lab links`) : fail(n, `${links.length} lab links`);
  const unknown = links.map((h) => (/#lab=([a-z]+)/.exec(h) || [])[1]).filter((p) => !/^(build|boxes|molecule|compare|trends|nuclides|hear|pes|sun|particles|math|predict|calc|bench|lessons|you)$/.test(p));
  unknown.length ? fail(n, "links to labs that do not exist: " + unknown.join(", ")) : ok(n, "every lab link names a real lab");
  (await page.locator("table").count()) >= 2 ? ok(n, "the link table and the standards table") : fail(n, "a table is missing");
}, { wait: 1500 });

await visit("handout", `${BASE}handout.html`, async (page, n) => {
  (await page.locator("svg.qr path").count()) === 1 ? ok(n, "the QR code is drawn") : fail(n, "no QR code");
  (await page.locator("main section").count()) === 3 ? ok(n, "three columns: students, teachers, families") : fail(n, "the three sections are not all there");
  const badge = await page.evaluate(() => ((document.querySelector(".lang-menu .lang-sum") || {}).textContent || "").trim());
  badge === "EN" ? ok(n, "the language menu mounted on its own") : fail(n, `language badge: ${badge}`);
}, { wait: 1500 });

await visit("handout in es", `${BASE}handout.html?lang=es`, async (page, n) => {
  const h1 = await page.evaluate(() => document.querySelector("h1").textContent);
  /periódica/.test(h1) ? ok(n, `Spanish title: ${h1}`) : fail(n, `title still English: ${h1}`);
  const left = await page.evaluate(() => AtomI18N.missing.length);
  left === 0 ? ok(n, "every string on the page is in the pack") : fail(n, `${left} missing: ${await page.evaluate(() => AtomI18N.missing.slice(0, 5).join(" | "))}`);
}, { wait: 1500 });

await visit("teachers in es", `${BASE}teachers.html?lang=es`, async (page, n) => {
  const left = await page.evaluate(() => AtomI18N.missing.length);
  left === 0 ? ok(n, "every string on the page is in the pack") : fail(n, `${left} missing: ${await page.evaluate(() => AtomI18N.missing.slice(0, 5).join(" | "))}`);
  const badge = await page.evaluate(() => ((document.querySelector(".lang-menu .lang-sum") || {}).textContent || "").trim());
  badge === "ES" ? ok(n, "the language menu shows ES") : fail(n, `language badge: ${badge}`);
}, { wait: 1500 });

await visit("404", `${BASE}no-such-page`, async (page, n) => {
  (await page.locator("a[href]").count()) > 0 ? ok(n, "the 404 page links home") : fail(n, "no link home");
}, { allow404: true, skipAxe: false, wait: 500 });

// the time budgets (scripts/budgets.json): the first screen on a slow machine. Chromium only: it is the one engine that can
// slow its own CPU. First picture is first contentful paint; "table ready" is all 118 squares in the page; "blocked" is the
// time the main thread was held past 50 ms at a stretch while loading. CI has no graphics card, so frame time only warns.
if (ENGINE === "chromium" && !(ONLY && !ONLY.test("budget")) && !(SKIP && SKIP.test("budget"))) {
  const T = JSON.parse(fs.readFileSync(path.join(ROOT, "..", "scripts", "budgets.json"), "utf8")).time, n = "budget";
  console.log(`\n${n}  ${BASE} at ${T.cpuSlowdown}x CPU`);
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  await page.addInitScript(() => { window.__b = { long: 0 }; try { new PerformanceObserver((l) => l.getEntries().forEach((e) => { window.__b.long += Math.max(0, e.duration - 50); })).observe({ type: "longtask", buffered: true }); } catch (e) {}
    const t = setInterval(() => { if (document.querySelectorAll(".pt-el").length === 118) { window.__b.table = performance.now(); clearInterval(t); } }, 10); });
  const cdp = await page.context().newCDPSession(page); await cdp.send("Emulation.setCPUThrottlingRate", { rate: T.cpuSlowdown });
  await page.goto(ORIGIN + BASE, { waitUntil: "load" }); await until(page, () => window.__b && window.__b.table > 0, null, 30000); await page.waitForTimeout(1500);
  const m = await page.evaluate(() => new Promise((res) => { const fcp = (performance.getEntriesByType("paint").find((e) => e.name === "first-contentful-paint") || {}).startTime || 0, gaps = []; let last = 0;
    const f = (now) => { if (last) gaps.push(now - last); last = now; if (gaps.length < 60 && performance.now() < 60000) requestAnimationFrame(f); else { gaps.sort((a, b) => a - b); res({ fcp, table: window.__b.table, long: window.__b.long, frame: gaps[Math.floor(gaps.length / 2)] || 0 }); } };
    requestAnimationFrame(f); setTimeout(() => { gaps.sort((a, b) => a - b); res({ fcp, table: window.__b.table, long: window.__b.long, frame: gaps[Math.floor(gaps.length / 2)] || 0 }); }, 8000); }));
  const r = (x) => Math.round(x);
  m.fcp > 0 && m.fcp <= T.firstPictureMs ? ok(n, `first picture in ${r(m.fcp)} ms (limit ${T.firstPictureMs})`) : fail(n, `first picture took ${r(m.fcp)} ms, over the ${T.firstPictureMs} ms limit`);
  m.table > 0 && m.table <= T.tableReadyMs ? ok(n, `all 118 squares in ${r(m.table)} ms (limit ${T.tableReadyMs})`) : fail(n, `the table took ${r(m.table)} ms, over the ${T.tableReadyMs} ms limit`);
  m.long <= T.blockedMs ? ok(n, `main thread held ${r(m.long)} ms past 50 ms while loading (limit ${T.blockedMs})`) : fail(n, `the main thread was held ${r(m.long)} ms while loading, over the ${T.blockedMs} ms limit`);
  console.log(`  note ${n}: a frame every ${r(m.frame)} ms at rest on this machine` + (m.frame > T.frameWarnMs ? ` (over ${T.frameWarnMs} ms; a machine without a graphics card draws the sky in software)` : ""));
  if (m.frame > T.frameWarnMs && process.env.GITHUB_ACTIONS) console.log(`::warning title=Frame time::a frame every ${r(m.frame)} ms on the CI machine, which has no graphics card`);
  await page.close();
}

await browser.close();
server.close();
console.log(failures.length ? `\n${failures.length} problem(s)` : "\nall clear");
process.exit(failures.length ? 1 : 0);
