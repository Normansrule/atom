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
const drawn = (page, sel, ms) => until(page, (q) => { const c = document.querySelector(q); if (!c || !c.width) return false; const g = c.getContext("2d"), d = g.getImageData(0, 0, c.width, c.height).data, seen = new Set();
  for (let i = 0; i < d.length; i += 4 * Math.max(1, Math.floor(d.length / 4 / 600))) seen.add(d[i] + "," + d[i + 1] + "," + d[i + 2] + "," + d[i + 3]); return seen.size > 1; }, sel, ms);
const packsKept = (page) => until(page, async () => { const f = AtomI18N.packFiles(); if (!f.length) return true;
  for (const k of await caches.keys()) { const c = await caches.open(k); if ((await Promise.all(f.map((u) => c.match(u)))).every(Boolean)) return true; } return false; });
const ok = (where, what) => console.log(`  ok   ${where}: ${what}`);
// a press that cannot be made (the control is missing, covered, or switched off) is a failed check on the lines after it, not a run that stops
const press = (page, sel) => page.click(sel, { timeout: 8000 }).then(() => true, () => false);
const pick = (page, sel, value) => page.selectOption(sel, value, { timeout: 8000 }).then(() => true, () => false);

console.log(`browser: ${ENGINE}`);
const browser = await launcher.launch(ENGINE === "chromium" ? {
  executablePath: process.env.CHROME_PATH || undefined,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", ...(process.env.ATOM_CHROME_ARGS || "").split(" ").filter(Boolean)],
} : {});

// SMOKE_ONLY=<regex> runs only the visits whose name matches (a slow sandbox cannot finish them all in one go);
// SMOKE_SKIP=<regex> leaves those out. CI sets neither.
// Where one command may run for three minutes at most, the run is taken in three parts, each about half of that:
//   b, the 2.1 visits and the budget:  SMOKE_ONLY='^(particles|a decay chain|below the quarks|particles in es|budget)'
//   c, the 2.2 visits:  SMOKE_ONLY='^(the families lens|isotope bars|an origin sketch|the molecule builder|the cause of the trends|electron energies|the empty atom|site, pause motion|app, pause motion|the address follows|links into the labs|what 2\.2 added)'
//   a, everything else:  SMOKE_SKIP='<b's expression>|<c's expression>'
//   d, the 2.3 visits:  SMOKE_ONLY='^(measured energies|display options|hostile input|site in (fr|ru|zh|ar)|a name in its form)'   (and a skips d's expression too)
// A visit belongs to a part by its name alone, so a new visit that neither expression matches lands in a; when a part nears
// two and a half minutes, move visits or start a fourth.
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
  // 2.2: the chart lit by force, and a particle built from three quarks
  await press(page, '#labsHost [data-smf="s"]');
  await until(page, () => document.querySelectorAll("#labsHost [data-smp][data-lit]").length === 7, null, 5000);
  const strong = await page.evaluate(() => ({ lit: [].map.call(document.querySelectorAll('#labsHost [data-smp][data-lit="1"]'), (b) => b.getAttribute("data-smp")).sort().join(" "), say: ((document.querySelector("#labsHost .lb-smfsay") || {}).textContent || "").trim() }));
  strong.lit === "b c d g s t u" && strong.say.length > 20 ? ok(n, "the strong force lights exactly seven tiles, the six quarks and the gluon, and says why") : fail(n, `the strong force lit "${strong.lit}" and said "${strong.say.slice(0, 80)}"`);
  await press(page, '#labsHost [data-smf="s"]');
  await until(page, () => !document.querySelector("#labsHost [data-smp][data-lit]"), null, 5000);
  const dark = await page.evaluate(() => ({ lit: document.querySelectorAll("#labsHost [data-smp][data-lit]").length, say: ((document.querySelector("#labsHost .lb-smfsay") || {}).textContent || "").trim(), on: (document.querySelector('#labsHost [data-smf="s"]') || {}).getAttribute?.("aria-pressed") }));
  dark.lit === 0 && !dark.say && dark.on === "false" ? ok(n, "a second press clears the chart") : fail(n, "after the second press: " + JSON.stringify(dark));
  // three quarks (u, d, s) and three colors (0, 1, 2): the bag adds the charges, and the sentence names what was made
  const bag = async (quarks, colors, sum, held) => { for (let i = 0; i < 3; i++) { await pick(page, `#labsHost [data-hq="${i}"]`, quarks[i]); await pick(page, `#labsHost [data-hc="${i}"]`, colors[i]); }
    await until(page, ([s, h]) => { const b = document.querySelector("#labsHost .lb-smbag"); return !!b && b.textContent.replace(/\s+/g, "").endsWith(s) && b.getAttribute("data-ok") === h; }, [sum, held], 5000);
    return page.evaluate(() => { const b = document.querySelector("#labsHost .lb-smbag"), s = document.querySelector("#labsHost .lb-smhsay"); return { sum: b ? b.textContent.replace(/\s+/g, "") : "", held: b ? b.getAttribute("data-ok") : null, say: s ? s.textContent : "" }; }); };
  const nn = await bag("udd", "012", "=0", "1"), pp = await bag("uud", "201", "=+1", "1");
  nn.sum.endsWith("=0") && /neutron/.test(nn.say) && pp.sum.endsWith("=+1") && pp.held === "1" && /proton/.test(pp.say) ? ok(n, `three quarks of three colors: up, down, down is a neutron, and up, up, down a proton with charge +1 (${pp.sum})`) : fail(n, "the quark builder: " + JSON.stringify([nn, pp]).slice(0, 300));
  const clash = await bag("uud", "001", "=+1", "0");
  clash.held === "0" && /same color/.test(clash.say) && !/That is/.test(clash.say) ? ok(n, "two quarks of one color: the bag does not hold, and no particle is named") : fail(n, "a color clash: " + JSON.stringify(clash).slice(0, 240));
}, { wait: 7000 });

await visit("a decay chain", `${BASE}#lab=nuclides`, async (page, n) => {
  await until(page, () => !!document.querySelector('#labsHost [data-nc="1"]'), null, 30000);
  const step = () => page.evaluate(() => (document.querySelector("#labsHost .lb-nchain") || {}).textContent || "");
  const stepIs = (k, ms) => until(page, (k) => new RegExp("^Step " + k + " of 10").test((document.querySelector("#labsHost .lb-nchain") || {}).textContent || ""), k, ms);
  // 2.2: the chain opens a close-up and waits for the reader (through 2.1 it played down to lead-208 by itself)
  await press(page, '#labsHost [data-nc="1"]');
  const opened = Date.now(), open = await until(page, () => { const b = document.querySelector("#labsHost .lb-nchainbody"), s = document.querySelector("#labsHost .lb-nchain"); return !!b && !b.hidden && !!s && /^Step 1 of 10: thorium-232/.test(s.textContent); });
  const pic = (await drawn(page, '#labsHost canvas[data-c="nucc"]')) && (await page.evaluate(() => /thorium-232/.test(document.querySelector('#labsHost canvas[data-c="nucc"]').getAttribute("aria-label") || "")));
  pic ? ok(n, "the close-up draws, and its description names thorium-232") : fail(n, "the close-up did not draw, or is not described");
  const bars = await page.evaluate(() => { const li = [...document.querySelectorAll("#labsHost .lb-nhl li")]; return { rows: li.length, bars: li.filter((x) => x.querySelector(".lb-nht i")).length, current: li.filter((x) => x.getAttribute("aria-current") === "step").length }; });
  bars.rows === 11 && bars.bars === 10 && bars.current === 1 ? ok(n, "the half-life list: ten bars and the stable end, one step marked") : fail(n, "half-life list: " + JSON.stringify(bars));
  // that nothing moves cannot be waited for as a state: let more than one step of Play (3.6 s) go by, and look again
  await page.waitForTimeout(Math.max(0, 4200 - (Date.now() - opened)));
  open && /^Step 1 of 10/.test(await step()) ? ok(n, "thorium-232 opens on step 1 of 10 and waits for the reader") : fail(n, "the chain did not open on step 1 and stay there: " + (await step()).slice(0, 120));
  let presses = 0;
  for (let i = 0; i < 10; i++) if (await press(page, '#labsHost [data-ncx="next"]')) presses++;
  const end = await until(page, () => { const z = document.querySelector('#labsHost [data-nu="z"]'), q = document.querySelector('#labsHost [data-nu="n"]'); return !!z && z.value === "82" && q.value === "126"; });
  const said = await step();
  presses === 10 && end && /6 alpha/.test(said) && /4 beta/.test(said) ? ok(n, "ten presses of Next step take thorium-232 down to lead-208: six alpha decays and four beta") : fail(n, `the thorium chain after ${presses} presses: ${said.slice(0, 160)}`);
  (await page.evaluate(() => (document.querySelector('#labsHost [data-ncx="next"]') || {}).getAttribute?.("aria-disabled") === "true")) ? ok(n, "Next step is switched off at the end") : fail(n, "Next step is still on at lead-208");
  // from the end, Play starts over and steps by itself; a second press pauses, and the step holds
  await press(page, '#labsHost [data-ncx="play"]');
  const plays = await stepIs(2, 12000);
  await press(page, '#labsHost [data-ncx="play"]');
  const held = await step(); await page.waitForTimeout(4200);
  plays && /^Step \d+ of 10/.test(held) && held === (await step()) ? ok(n, "Play steps by itself, and Pause holds the step") : fail(n, `Play or Pause: ${plays ? "played" : "did not play"}; "${held.slice(0, 40)}" became "${(await step()).slice(0, 40)}"`);
  await press(page, '#labsHost [data-nc="1"]'); await stepIs(1, 5000);
  await press(page, '#labsHost [data-ncx="next"]'); await stepIs(2, 5000);
  await until(page, () => /Beta-minus/.test((document.querySelector("#labsHost .lb-nk") || {}).textContent || ""), null, 5000);
  const panel = await page.evaluate(() => ((document.querySelector("#labsHost .lb-nk") || {}).textContent || "") + " | " + ((document.querySelector("#labsHost .lb-nsay") || {}).textContent || ""));
  /Beta-minus decay \(measured\)/.test(panel) && /actinium-228/.test(panel) && !/estimate/.test(panel) ? ok(n, "the panel beside the chain agrees with it: radium-228 goes by beta-minus decay (measured) to actinium-228") : fail(n, "the panel at radium-228: " + panel.slice(0, 200));
}, { wait: 7000 });

for (const code of ["en", "es"]) {
  await visit(`below the quarks in ${code}`, `${BASE}?lang=${code}#weak`, async (page, n) => {
    (await until(page, () => !!window.AtomDeep, null, 30000)) ? ok(n, "the deep scenes load when the address points at them") : fail(n, "assets/deep.js did not load");
    // A figure draws only while it is on screen. The page scrolls smoothly and its scenes are pinned, so a request to scroll made
    // while an earlier scroll is still under way can stop far short of the figure, which then never draws: about one run in ten
    // here, and the one failure of 2.3.0's first run on CI. So the test goes to each figure at once, asks again if it has not
    // drawn, and names the one that did not. Each figure is now on screen when it is judged, not drawn earlier in passing.
    const missed = [];
    for (const id of ["deepFields", "deepMass", "deepWeak", "deepOsc", "deepLadder"]) { let got = false;
      for (let k = 0; k < 6 && !got; k++) { await page.evaluate((q) => document.getElementById(q).scrollIntoView({ block: "center", behavior: "instant" }), id); got = await drawn(page, "#" + id, 2500); }
      if (!got) missed.push(await page.evaluate((q) => { const c = document.getElementById(q), r = c.getBoundingClientRect(); return `${q} (its top is at ${Math.round(r.top)} px of a ${innerHeight} px window; canvas ${c.width} by ${c.height})`; }, id)); }
    !missed.length ? ok(n, "five figures draw") : fail(n, `${5 - missed.length} of 5 figures drew; not ${missed.join(", ")}`);
    const osc = await page.evaluate(() => { const a = AtomDeep.oscillate(0), b = AtomDeep.oscillate(500), sum = b[0] + b[1] + b[2]; return { start: a.map((x) => +x.toFixed(6)), sum: +sum.toFixed(9), tau: +b[2].toFixed(3) }; });
    osc.start.join() === "0,1,0" && osc.sum === 1 && osc.tau > 0.9 ? ok(n, `neutrino mixing: a muon beam is all muon at the start, the three shares add to one, and it is ${Math.round(osc.tau * 100)} percent tau at 500 km per GeV`) : fail(n, "oscillation: " + JSON.stringify(osc));
    await page.evaluate(() => document.getElementById("weak").scrollIntoView());
    (await until(page, () => { const a = document.querySelector(".gauge a.on"); return !!a && a.getAttribute("data-depth") === "weak"; })) ? ok(n, "the depth gauge marks the weak force") : fail(n, "the gauge did not mark the weak force");
    // 2.2: the sentence comes when the decay has played (5.6 s), not on the press, and the button then offers it again
    await page.click("#deepDecay");
    const early = await page.evaluate(() => document.getElementById("deepDecaySay").textContent);
    await until(page, () => document.getElementById("deepDecaySay").textContent.length > 40, null, 12000);
    const said = await page.evaluate(() => document.getElementById("deepDecaySay").textContent);
    !early && said.length > 40 && (code === "en" ? /proton/.test(said) : /prot[oó]n/.test(said) && !/became/.test(said)) ? ok(n, "the decay button says what happened, once the decay has played") : fail(n, early ? "decay caption came before the decay had played: " + early.slice(0, 80) : "decay caption: " + said.slice(0, 120));
    const again = await page.evaluate(() => ({ now: document.getElementById("deepDecay").textContent.trim(), want: AtomI18N.T("Play it again") }));
    again.now === again.want && (code === "en") === (again.now === "Play it again") ? ok(n, `the button then reads "${again.now}"`) : fail(n, `after the decay the button reads "${again.now}"; the page's own words for "Play it again" are "${again.want}"`);
    const left = await page.evaluate(() => AtomI18N.missing.length);
    left === 0 ? ok(n, "nothing the scenes ask for is missing from the pack") : fail(n, `${left} strings missing: ${await page.evaluate(() => AtomI18N.missing.slice(0, 5).join(" | "))}`);
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(400);
  }, { wait: 3000 });
}
await visit("particles in es", `${BASE}?lang=es#lab=particles`, async (page, n) => {
  await until(page, () => document.querySelectorAll("#labsHost [data-smp]").length === 17, null, 30000);
  for (const id of ["u", "ne", "g", "H"]) await page.click(`#labsHost [data-smp="${id}"]`);
  for (const k of ["repel", "decay", "color", "annihilate"]) await page.click(`#labsHost [data-sms="${k}"]`);
  for (const f of ["s", "e", "w", "h"]) await press(page, `#labsHost [data-smf="${f}"]`);
  for (const [quarks, colors] of [["uud", "012"], ["udd", "012"], ["uuu", "012"], ["uds", "012"], ["sss", "001"]]) for (let i = 0; i < 3; i++) { await pick(page, `#labsHost [data-hq="${i}"]`, quarks[i]); await pick(page, `#labsHost [data-hc="${i}"]`, colors[i]); }
  const left = await page.evaluate(() => AtomI18N.missing.length);
  left === 0 ? ok(n, "the particles, their cards, the four rules, the four forces, and the quark builder are all in the pack") : fail(n, `${left} strings missing: ${await page.evaluate(() => AtomI18N.missing.slice(0, 6).join(" | "))}`);
}, { wait: 7000, skipAxe: true });

// 2.2: a fifth lens on the table, isotope bars and an origin sketch on the card, Lewis structures and bond electrons,
// the cause of the trends, the photoelectron's energy bookkeeping, the empty atom drawn to scale, Pause motion,
// and an address that follows the open lab
const familiesLens = (table, legend) => async (page, n) => {
  await until(page, ([t]) => document.querySelectorAll(t + " .pt-el").length === 118 && document.querySelectorAll(t + " button[data-lens]").length === 5, [table], 30000);
  const lenses = await page.$$eval(`${table} button[data-lens]`, (bs) => bs.map((b) => b.getAttribute("data-lens") + " " + b.textContent.trim()));
  lenses.length === 5 && lenses[4] === "groups Families" ? ok(n, "five lenses on the table, and the fifth is Families") : fail(n, "lenses: " + lenses.join(", "));
  // the colors sweep across the table square by square, so the squares left lit are waited for by number, then read by name
  const lit = (want) => until(page, ([t, w]) => document.querySelectorAll(t + " .pt-el.pt-g:not(.pt-dim)").length === w, [table, want], 10000);
  const key = () => page.evaluate(([t, l]) => ({ key: !!document.querySelector(l + " .pt-key"), modes: [].map.call(document.querySelectorAll(l + " [data-gm]"), (b) => b.getAttribute("data-gm") + (b.getAttribute("aria-pressed") === "true" ? "*" : "")).join(" "),
    kinds: document.querySelectorAll(l + " [data-gk]").length, colored: document.querySelectorAll(t + " .pt-el.pt-g").length, lit: [].map.call(document.querySelectorAll(t + " .pt-el.pt-g:not(.pt-dim)"), (e) => +e.getAttribute("data-z")).sort((a, b) => a - b).join(" "),
    say: ((document.querySelector(l + " .pt-ksay") || {}).textContent || "").trim(), why: ((document.querySelector(l + " .pt-kwhy") || {}).textContent || "").trim() }), [table, legend]);
  const run = (a, b) => Array.from({ length: b - a + 1 }, (x, i) => a + i).join(" ");
  await press(page, `${table} button[data-lens="groups"]`); await lit(118);
  const fam = await key();
  fam.key && fam.modes === "family* block state" && fam.kinds === 11 && fam.colored === 118 && fam.why.length > 40 ? ok(n, "Family: all 118 squares take a family's color; the key has eleven families and says why they are families") : fail(n, "Family: " + JSON.stringify({ ...fam, lit: fam.lit.split(" ").length }).slice(0, 300));
  await press(page, `${legend} [data-gm="block"]`); await press(page, `${legend} [data-gk="f"]`); await lit(30);
  const blk = await key();
  await press(page, `${legend} [data-gk="f"]`); const all = await lit(118);
  blk.modes === "family block* state" && blk.kinds === 4 && blk.lit === run(57, 71) + " " + run(89, 103) && /30/.test(blk.say) && all ? ok(n, `Block: the f block lights 30 squares, lanthanum to lutetium and actinium to lawrencium (${blk.say}), and a second press lights all 118 again`) : fail(n, `Block: lit "${blk.lit}", said "${blk.say}", ${all ? "" : "not "}all lit after a second press`);
  await press(page, `${legend} [data-gm="state"]`); await press(page, `${legend} [data-gk="liquid"]`); await lit(2);
  const liq = await key();
  await press(page, `${legend} [data-gk="unknown"]`); await until(page, ([l]) => /21/.test((document.querySelector(l + " .pt-ksay") || {}).textContent || ""), [legend], 5000); await lit(21);
  const unk = await key();
  liq.lit === "35 80" && unk.lit === "85 87 " + run(100, 118) ? ok(n, `State: the liquids are exactly bromine and mercury, and 21 elements are not known (${unk.say})`) : fail(n, `State: liquid lit "${liq.lit}", not known lit "${unk.lit}"`);
  await press(page, `${table} button[data-lens="shapes"]`);
  (await until(page, ([t]) => !document.querySelector(".pt-key") && !document.querySelector(t + " .pt-el.pt-g"), [table], 10000)) ? ok(n, "another lens puts the key and the colors away") : fail(n, "the key or the colors stayed after choosing Shapes");
  // on again, so the accessibility pass that follows sees the key
  await press(page, `${table} button[data-lens="groups"]`); await until(page, ([l]) => !!document.querySelector(l + " .pt-key"), [legend], 5000);
};
const pauseMotion = (button, kept) => async (page, n) => {
  const state = () => page.evaluate(([b, k]) => { const e = document.getElementById(b); let v = null; try { v = localStorage.getItem(k); } catch (x) {} return { calm: document.documentElement.classList.contains("calm"), pressed: e ? e.getAttribute("aria-pressed") : null, kept: v }; }, [button, kept]);
  const calm = (on) => until(page, ([b, on]) => { const e = document.getElementById(b); return !!e && document.documentElement.classList.contains("calm") === on && e.getAttribute("aria-pressed") === String(on); }, [button, on], 15000);
  await calm(false); const before = await state();
  await press(page, "#" + button); await calm(true); const paused = await state();
  !before.calm && before.pressed === "false" && paused.calm && paused.pressed === "true" && paused.kept === "off" ? ok(n, "Pause motion: the page goes calm, the button is pressed, and the choice is kept") : fail(n, "Pause motion, before and after the press: " + JSON.stringify([before, paused]));
  await page.reload({ waitUntil: "load" }).catch(() => {}); await calm(true); const back = await state();
  await press(page, "#" + button); await calm(false); const moving = await state();
  back.calm && back.pressed === "true" && !moving.calm && moving.pressed === "false" && moving.kept !== "off" ? ok(n, "the choice survives a reload, and a second press lets the page move again") : fail(n, "Pause motion, after a reload and after a second press: " + JSON.stringify([back, moving]));
};

await visit("the families lens", `${BASE}`, familiesLens("main", "#lensLegend"), { wait: 1500 });

await visit("isotope bars on a card", `${BASE}?el=Cl`, async (page, n) => {
  await page.locator("#sheet").waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
  await press(page, '#sheet [data-pdt="nucleus"]');
  await until(page, () => { const p = document.getElementById("pdP-nucleus"); return !!p && !p.hidden && p.querySelectorAll(".pd-iso .pd-ibars li").length === 3; });
  // a row is "name share bar", the bar's length as a percent of its track; the average sits between the isotopes it falls between.
  // The bar is the track's ::after. An engine gives its width as drawn, in px; one that gives the percentage back is read that way.
  const rows = await page.evaluate(() => [].map.call(document.querySelectorAll("#pdP-nucleus .pd-iso .pd-ibars li"), (li) => { const i = li.querySelector("i"), s = li.querySelector("span"), b = li.querySelector("b");
    const w = i ? getComputedStyle(i, "::after").width : "", track = i ? i.getBoundingClientRect().width : 0, bar = /px$/.test(w) && track ? parseFloat(w) / track * 100 : parseFloat(/%$/.test(w) ? w : i ? getComputedStyle(i).getPropertyValue("--w") : "");
    return li.classList.contains("pd-iavg") ? li.textContent.trim() : (s ? s.textContent.trim() : "?") + " " + (b ? b.textContent.trim() : "?") + " bar " + (i ? Math.round(bar) : "none"); }));
  rows.join(" | ") === "chlorine-35 75.76% bar 76 | average: 35.45 u | chlorine-37 24.24% bar 24" ? ok(n, "chlorine's Nucleus tab: two bars as long as their shares, 75.76% and 24.24%, and between them the average: 35.45 u") : fail(n, "chlorine's isotopes: " + rows.join(" | "));
  await press(page, ".pt-el[data-z='43']");
  await until(page, () => /Technetium/.test((document.getElementById("pdName") || {}).textContent || "") && !!document.querySelector("#pdP-nucleus .pd-iso"), null, 8000);
  const tc = await page.evaluate(() => { const s = document.querySelector("#pdP-nucleus .pd-iso"); return { bars: s ? s.querySelectorAll(".pd-ibars li").length : -1, text: s ? s.textContent : "" }; });
  tc.bars === 0 && /no stable isotope/.test(tc.text) && /\[98\]/.test(tc.text) ? ok(n, "technetium, with no stable isotope, shows no bars and says what the number in brackets is") : fail(n, "technetium's isotopes: " + JSON.stringify(tc).slice(0, 240));
}, { wait: 1500 });

await visit("an origin sketch", `${BASE}?el=Au`, async (page, n) => {
  await page.locator("#sheet").waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
  await press(page, '#sheet [data-pdt="origin"]');
  await until(page, () => document.querySelectorAll("#sheet [data-ost]").length === 3 && !!document.querySelector("#sheet .pd-ofig canvas"));
  // the sketch also plays through its stages by itself, forward only: the third stage and then back to the first is the buttons' doing
  const stage = (k) => until(page, (k) => { const c = document.querySelector("#sheet .pd-ofig canvas"), b = document.querySelector(`#sheet [data-ost="${k}"]`); return !!c && !!b && (c.getAttribute("aria-label") || "").indexOf(`stage ${k + 1} of 3: ` + b.textContent.trim()) > 0 && b.hasAttribute("aria-current"); }, k, 8000);
  const label = () => page.evaluate(() => { const c = document.querySelector("#sheet .pd-ofig canvas"); return c ? (c.getAttribute("role") || "no role") + ": " + (c.getAttribute("aria-label") || "") : "no canvas"; });
  await press(page, '#sheet [data-ost="2"]'); const third = (await stage(2)) && (await drawn(page, "#sheet .pd-ofig canvas")), l3 = await label();
  third && /^img: Merging neutron stars, stage 3 of 3: /.test(l3) ? ok(n, `gold's origin, the third stage: drawn, and described with that stage's caption (${l3.slice(5, 70)}…)`) : fail(n, "after pressing the third stage: " + l3.slice(0, 160));
  await press(page, '#sheet [data-ost="0"]'); const first = await stage(0), l1 = await label();
  first && l1 !== l3 && /stage 1 of 3: /.test(l1) && (await page.evaluate(() => document.querySelectorAll("#sheet [data-ost][aria-current]").length)) === 1 ? ok(n, "pressing the first stage changes the description back, and marks that stage alone") : fail(n, "after pressing the first stage: " + l1.slice(0, 160));
}, { wait: 1500 });

await visit("the molecule builder", `${BASE}#lab=molecule`, async (page, n) => {
  const texts = (sel) => page.evaluate((q) => [].map.call(document.querySelectorAll("#labsHost " + q), (e) => e.textContent.trim()), sel);
  const reads = (sel, re, ms = 10000) => until(page, ([q, r]) => [].some.call(document.querySelectorAll("#labsHost " + q), (e) => new RegExp(r).test(e.textContent.trim())), [sel, re], ms);
  const pic = () => page.evaluate(() => (document.querySelector('#labsHost canvas[data-c="mol"]') || {}).getAttribute?.("aria-label") || "");
  const go = (hash) => page.goto(ORIGIN + BASE + hash).catch(() => {});   // the same page at another address: the labs follow the change
  await reads(".lb-lwlist li", "^O: ", 30000);
  const water = { drawn: await page.evaluate(() => !!document.querySelector('#labsHost svg.lb-lewis[role="img"] line, #labsHost svg.lb-lewis[role="img"] path')), lines: await texts(".lb-lwlist li"), pic: await pic() };
  water.drawn && water.lines.length === 2 && /^O: 4 in lone pairs \+ 4 shared = 8 electrons around it/.test(water.lines[0]) && /as balls and sticks/.test(water.pic) ? ok(n, "water's Lewis structure is drawn, and its list counts oxygen's electrons: 4 in lone pairs + 4 shared = 8") : fail(n, "water's Lewis structure: " + JSON.stringify(water).slice(0, 300));
  await go("#lab=molecule&mol=bf3"); await reads(".lb-lwlist li.x", "exception");
  const bf3 = await texts(".lb-lwlist li.x");
  bf3.length === 1 && /^B: .*only 6 electrons around it.*exception to the octet rule/.test(bf3[0]) ? ok(n, "boron trifluoride has one line marked as an exception to the octet rule: boron, with only 6 electrons") : fail(n, "boron trifluoride's exceptions: " + (bf3.join(" | ") || "none").slice(0, 200));
  await go("#lab=molecule&mol=co2&view=e"); await reads(".lb-mxcap", "cancel");
  const co2 = (await texts(".lb-mxcap"))[0] || "", shown = await page.evaluate(() => (document.querySelector("#labsHost [data-mxv]") || {}).getAttribute?.("aria-pressed")), picCo2 = await pic();
  shown === "true" && /so they cancel: no net pull/.test(co2) && picCo2.indexOf(co2) > 0 ? ok(n, "carbon dioxide with its bond electrons shown: the two pulls cancel, in the caption and in the picture's description") : fail(n, "carbon dioxide's electrons: " + co2.slice(0, 200));
  await go("#lab=molecule&mol=h2o&view=e"); await reads(".lb-mxcap", "net pull, so the molecule");
  const h2o = (await texts(".lb-mxcap"))[0] || "";
  /add up to a net pull, so the molecule has a negative end and a positive end/.test(h2o) ? ok(n, "water with its bond electrons shown: a net pull, so the molecule has a negative end and a positive end") : fail(n, "water's electrons: " + h2o.slice(0, 200));
  await go("#lab=molecule&mol=nacl&view=e"); await reads(".lb-mxcap", "^Before the hand-over");
  await press(page, "#labsHost [data-mxp]"); await reads(".lb-mxcap", "^After the hand-over", 15000);
  const salt = (await texts(".lb-mxcap"))[0] || "", again = (await texts("[data-mxp]"))[0] || "";
  /^After the hand-over/.test(salt) && /102 pm/.test(salt) && /180 pm/.test(salt) && /282 pm/.test(salt) && again === "Play it again" ? ok(n, "salt: the hand-over plays, and then Na⁺ is 102 pm and Cl⁻ 180 pm of the 282 pm between neighbors in the crystal") : fail(n, `salt's hand-over: "${salt.slice(0, 200)}", button "${again}"`);
}, { wait: 1500 });

await visit("the cause of the trends", `${BASE}#lab=trends`, async (page, n) => {
  await until(page, () => !!document.querySelector('#labsHost canvas[data-c="tatoms"]'), null, 30000);
  const label = () => page.evaluate(() => (document.querySelector('#labsHost canvas[data-c="tatoms"]') || {}).getAttribute?.("aria-label") || ""), cap = () => page.evaluate(() => ((document.querySelector("#labsHost .lb-tcap") || {}).textContent || "").trim());
  const says = (re) => until(page, (r) => new RegExp(r).test((document.querySelector("#labsHost .lb-tcap") || {}).textContent || ""), re, 8000);
  await press(page, '#labsHost [data-tz="17"]'); await press(page, '#labsHost [data-tl="period"]'); await says("Across period 3");
  const a = await label(), ca = await cap();
  (await drawn(page, '#labsHost canvas[data-c="tatoms"]')) && (a.match(/3 rings/g) || []).length === 8 && /Sodium: 11 protons, 3 rings, 180 pm, pull 2\.20/.test(a) && /Argon: 18 protons, 3 rings, 71 pm, pull 6\.75/.test(a) ? ok(n, "period 3 is drawn as eight atoms of three rings, sodium to argon, with the pull on the outer electron rising from 2.20 to 6.75") : fail(n, "period 3: " + a.slice(0, 200));
  await press(page, '#labsHost [data-tl="group"]'); await says("Down group 17");
  const b = await label(), cb = await cap();
  /Fluorine: 9 protons, 2 rings/.test(b) && /Chlorine: 17 protons, 3 rings/.test(b) && /Bromine: 35 protons, 4 rings/.test(b) && /Iodine: 53 protons, 5 rings/.test(b) && ca !== cb && /^Across period 3/.test(ca) && /^Down group 17/.test(cb) ? ok(n, "group 17 adds a ring at each step, fluorine to iodine, and the caption follows the line") : fail(n, "group 17: " + b.slice(0, 200) + " / " + cb.slice(0, 80));
  await pick(page, "#labsHost [data-tp]", "rad"); await says("atoms grow");
  const cc = await cap();
  cc !== cb && /atoms grow/.test(cc) ? ok(n, "the caption follows the property: down the group the atoms grow") : fail(n, "caption after choosing radius: " + cc.slice(0, 120));
  const stops = await page.evaluate(() => [...document.querySelectorAll("#labsHost .lb-heat button")].filter((x) => x.tabIndex >= 0).length);
  stops === 1 ? ok(n, "the trends table is one tab stop") : fail(n, stops + " tab stops in the trends table");
}, { wait: 1500 });

await visit("electron energies", `${BASE}#lab=pes&z=26`, async (page, n) => {
  await until(page, () => document.querySelectorAll("#labsHost [data-pk]").length === 7 && !!document.querySelector('#labsHost canvas[data-c="pat"]'), null, 30000);
  (await drawn(page, '#labsHost canvas[data-c="pat"]')) ? ok(n, "iron's shells are drawn beside its spectrum") : fail(n, "the atom beside the spectrum stayed blank");
  const books = [];
  for (let k = 0; k < 7; k++) { await press(page, `#labsHost [data-pk="${k}"]`);
    await until(page, (k) => { const b = document.querySelector(`#labsHost [data-pk="${k}"]`), p = document.querySelector("#labsHost .lb-pbar"); return !!b && !!p && b.getAttribute("aria-pressed") === "true" && p.textContent.trim().indexOf(b.textContent.trim() + ":") === 0; }, k, 5000);
    books.push(await page.evaluate((k) => { const b = document.querySelector(`#labsHost [data-pk="${k}"]`), p = document.querySelector("#labsHost .lb-pbar"); return { peak: b ? b.textContent.trim() : "?", eV: ((p ? p.textContent : "").match(/[\d,.]+(?= eV)/g) || []).map((x) => +x.replace(/,/g, "")) }; }, k)); }
  // each sentence gives three energies in eV: the photon's, the one that removes the electron, and the kinetic energy left over
  const off = books.filter((b) => !(b.eV.length === 3 && b.eV[0] === 9250 && b.eV[1] + b.eV[2] === 9250));
  books.length === 7 && !off.length ? ok(n, `iron's seven peaks (${books.map((b) => b.peak).join(", ")}): for each one, the energy to remove the electron plus its kinetic energy is the photon's 9,250 eV`) : fail(n, "the energy bookkeeping does not add up to 9,250 eV for: " + JSON.stringify(off).slice(0, 260));
}, { wait: 1500 });

await visit("the empty atom", `${BASE}?el=Fe#empty`, async (page, n) => {
  await until(page, () => !!window.AtomDeep && !!document.getElementById("scaleCanvas"), null, 30000);
  const label = () => page.evaluate(() => (document.getElementById("scaleCanvas") || {}).getAttribute?.("aria-label") || "");
  const pic = (await drawn(page, "#scaleCanvas")) && (await page.evaluate(() => { const f = document.getElementById("scaleFig"); return !!f && !f.hidden; })), above = await label();
  pic && /^Seen from above/.test(above) && /460/.test(above) ? ok(n, "iron to scale, seen from above: the atom's edge is a ring 460 meters across around a football field") : fail(n, "the scale drawing: " + (pic ? above.slice(0, 140) : "not drawn"));
  await press(page, "#scaleBtn");
  const fell = await until(page, () => /^The center spot/.test(document.getElementById("scaleCanvas").getAttribute("aria-label") || "") && /^At the marble/.test(document.getElementById("scaleSay").textContent || ""), null, 15000);
  fell ? ok(n, "the button falls to the marble on the center spot, and says so on arrival") : fail(n, `after the button: "${(await label()).slice(0, 80)}", said "${await page.evaluate(() => (document.getElementById("scaleSay") || {}).textContent || "")}"`);
}, { wait: 1500 });

await visit("site, pause motion", `${BASE}`, pauseMotion("motionBtn", "atom.site.motion"), { wait: 1500, skipAxe: true });

await visit("app, pause motion and the families lens", `${BASE}app/`, async (page, n) => {
  await pauseMotion("frontMotion", "atom.motion")(page, n);
  await familiesLens("#front", "#frontLegend")(page, n);
}, { wait: 3000, viewport: { width: 1440, height: 960 } });

await visit("the address follows the lab", `${BASE}#lab=build`, async (page, n) => {
  await until(page, () => document.querySelectorAll("#labsHost [role=tab]").length === 7, null, 30000);
  // the page takes the link in a moment after it loads, and then scrolls itself to the labs: the reader's turn starts there
  const atLabs = () => until(page, () => { const l = document.getElementById("labs"); if (!l) return false; const r = l.getBoundingClientRect(); return r.top < innerHeight / 2 && r.bottom > innerHeight / 2; });
  const is = (lab) => until(page, (lab) => { const h = document.getElementById("labsHost"), t = document.getElementById("lbTab-" + lab); return !!h && h.getAttribute("data-tab") === lab && !!t && t.getAttribute("aria-selected") === "true" && location.hash.indexOf("#lab=" + lab) === 0; }, lab);
  const now = () => page.evaluate(() => { const h = document.getElementById("labsHost"); return h ? h.getAttribute("data-tab") + " open at " + location.hash : "the page is no longer the site (" + location.href + ")"; });
  (await atLabs()) && (await is("build")) ? ok(n, "a link to Build comes to rest at the labs, with Build open") : fail(n, "arriving by #lab=build: " + (await now()));
  await press(page, "#lbTab-lessons");
  (await is("lessons")) ? ok(n, `opening Lessons puts it in the address (${await now()})`) : fail(n, "after opening Lessons: " + (await now()));
  await press(page, "#lbTab-you"); const you = await is("you"); await page.goBack().catch(() => {});
  you && (await is("lessons")) ? ok(n, "Back returns from You to Lessons") : fail(n, `${you ? "" : "You did not open; "}after Back: ${await now()}`);
  await page.reload({ waitUntil: "load" }).catch(() => {});
  (await is("lessons")) ? ok(n, "after a reload the same lab is open") : fail(n, "after a reload: " + (await now()));
}, { wait: 1500, skipAxe: true });

await visit("links into the labs", `${BASE}#lab=build&z=6&a=14`, async (page, n) => {
  const go = (hash) => page.goto(ORIGIN + BASE + hash).catch(() => {});
  const stage = () => page.evaluate(() => { const g = document.querySelector("#labsHost .lb-bgoal"); let built = []; try { built = Object.keys((JSON.parse(localStorage.getItem("atom.progress") || "{}") || {}).built || {}); } catch (e) {}
    return { sum: ((document.querySelector("#labsHost .lb-sum") || {}).textContent || "").trim(), note: g && !g.hidden && g.getBoundingClientRect().width > 0 ? g.textContent.trim() : "", built: built.join(" ") }; });
  const sums = (re, ms = 10000) => until(page, (r) => new RegExp(r).test(((document.querySelector("#labsHost .lb-sum") || {}).textContent || "").trim()), re, ms);
  await sums("carbon-14", 30000);
  const c14 = await stage();
  /carbon-14/.test(c14.sum) && c14.note.length > 20 && !c14.built ? ok(n, `a link to carbon-14 shows the atom with a note, and credits nothing (${c14.note})`) : fail(n, "arriving by a link to carbon-14: " + JSON.stringify(c14).slice(0, 260));
  await press(page, '#labsHost [data-step="n"][data-d="1"]'); await sums("carbon-15");
  await until(page, () => { try { return (JSON.parse(localStorage.getItem("atom.progress") || "{}").built || {})["6"]["15"] === 1; } catch (e) { return false; } }, null, 5000);
  const c15 = await stage();
  /carbon-15/.test(c15.sum) && c15.built === "6" ? ok(n, "one neutron more, by the reader's own hand, is carbon-15, and that atom is credited") : fail(n, "after adding a neutron: " + JSON.stringify(c15).slice(0, 260));
  await go("#lab=build&z=26&a=56&goal=1"); await sums("^Nothing built");
  await until(page, () => /iron-56/.test((document.querySelector("#labsHost .lb-bgoal") || {}).textContent || ""), null, 5000);
  const fe = await stage();
  /^Nothing built/.test(fe.sum) && /iron-56/.test(fe.note) && fe.built === "6" ? ok(n, "the teacher guide's goal link opens an empty stage with iron-56 as the goal: nothing is credited on arrival") : fail(n, "arriving by the goal link: " + JSON.stringify(fe).slice(0, 260));
  await go("#lab=nuclides&chain=2");
  const chain = await until(page, () => { const s = document.querySelector("#labsHost .lb-nchain"), b = document.querySelector("#labsHost .lb-nchainbody"), c = document.querySelector('#labsHost [data-nc="1"]'); return !!s && !!b && !!c && !b.hidden && /^Step 1 of 10: thorium-232/.test(s.textContent) && c.getAttribute("aria-pressed") === "true"; }, null, 10000);
  chain ? ok(n, "#lab=nuclides&chain=2 opens the thorium chain's close-up on step 1 of 10") : fail(n, "arriving by &chain=2: " + (await page.evaluate(() => (document.querySelector("#labsHost .lb-nchain") || {}).textContent || "no chain open")).slice(0, 120));
}, { wait: 1500, skipAxe: true });

// what 2.2 added that has words, used once in Spanish: every step must be reached, and none may ask for a string the pack lacks
// (the particles have their own visit above)
await visit("what 2.2 added, in es", `${BASE}?lang=es&el=Cl`, async (page, n) => {
  const lost = [], reach = async (what, state) => { if (!(await state)) lost.push(what); };
  const go = (hash) => page.evaluate((h) => { location.hash = h; }, hash);   // the address changes under the open page, as a link pressed in the teacher guide's tab would change it
  const text = (sel) => page.evaluate((q) => ((document.querySelector(q) || {}).textContent || "").trim(), sel);
  const reads = (sel, ms = 10000) => until(page, (q) => ((document.querySelector(q) || {}).textContent || "").trim().length > 10, sel, ms);
  const changes = (sel, was, ms = 10000) => until(page, ([q, w]) => { const t = ((document.querySelector(q) || {}).textContent || "").trim(); return t.length > 10 && t !== w; }, [sel, was], ms);
  await page.locator("#sheet").waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
  const lens = await text('main button[data-lens="groups"]');
  // the card: two isotopes, one, none, and a mix that is all radioactive; then gold's origin sketch and its sources
  await press(page, '#sheet [data-pdt="nucleus"]'); await reach("chlorine's isotopes", reads("#pdP-nucleus .pd-iso .pd-iavg", 8000));
  for (const z of [9, 43, 92]) { await press(page, `main .pt-el[data-z='${z}']`); await reach(`the isotopes of element ${z}`, until(page, (z) => !!document.querySelector(`#sheet [data-z="${z}"] .pd-iso`), z, 8000)); }
  await press(page, "main .pt-el[data-z='79']"); await press(page, '#sheet [data-pdt="origin"]');
  await reach("gold's origin sketch", until(page, () => document.querySelectorAll('#sheet [data-z="79"] [data-ost]').length === 3, null, 8000));
  for (const k of [1, 2]) await press(page, `#sheet [data-ost="${k}"]`);
  for (const b of await page.$$("#sheet [data-osrc]")) await b.click({ timeout: 8000 }).catch(() => {});
  await press(page, "#sheet [data-oplay]"); await press(page, "#sheet [data-oplay]");
  await page.keyboard.press("Escape");
  // the lens: one group lit in each of its three modes
  await press(page, 'main button[data-lens="groups"]');
  for (const [mode, kind] of [["family", "ak"], ["block", "f"], ["state", "unknown"]]) { await press(page, `#lensLegend [data-gm="${mode}"]`); await press(page, `#lensLegend [data-gk="${kind}"]`); await reach(`the lens by ${mode}`, reads("#lensLegend .pt-ksay", 5000)); }
  // the labs
  await go("#lab=molecule&mol=nacl&view=e"); await reach("salt's electrons", reads("#labsHost .lb-mxcap", 30000));
  const before = await text("#labsHost .lb-mxcap"); await press(page, "#labsHost [data-mxp]"); await reach("salt's hand-over", changes("#labsHost .lb-mxcap", before, 15000));
  await go("#lab=molecule&mol=bf3"); await reach("boron trifluoride's Lewis structure", reads("#labsHost .lb-lwlist li.x"));
  for (const line of await page.$$("#labsHost .lb-lwlist [data-lw]")) await line.click({ timeout: 8000 }).catch(() => {});
  const salt = await text("#labsHost .lb-mxcap"); await go("#lab=molecule&mol=co2&view=e"); await reach("carbon dioxide's electrons", changes("#labsHost .lb-mxcap", salt));
  const co2 = await text("#labsHost .lb-mxcap"); await go("#lab=molecule&mol=h2o&view=e"); await reach("water's electrons", changes("#labsHost .lb-mxcap", co2));
  await go("#lab=trends"); await reach("the trends row", until(page, () => !!document.querySelector('#labsHost canvas[data-c="tatoms"]') && ((document.querySelector("#labsHost .lb-tcap") || {}).textContent || "").trim().length > 10));
  for (const [z, line, prop] of [[17, "period", "rad"], [17, "group", "ie"], [46, "period", "en"], [2, "period", "rad"], [79, "period", "rad"]]) { await press(page, `#labsHost [data-tz="${z}"]`); await press(page, `#labsHost [data-tl="${line}"]`); await pick(page, "#labsHost [data-tp]", prop); }
  await go("#lab=pes&z=27"); await reach("cobalt's electron energies", until(page, () => document.querySelectorAll("#labsHost [data-pk]").length > 6 && ((document.querySelector("#labsHost .lb-pbar") || {}).textContent || "").trim().length > 10));
  for (const k of [1, 0]) { const was = await text("#labsHost .lb-pbar"); await press(page, `#labsHost [data-pk="${k}"]`); await reach(`cobalt's peak ${k + 1}`, changes("#labsHost .lb-pbar", was, 5000)); }
  await go("#lab=nuclides&chain=2"); await reach("the thorium chain's close-up", reads("#labsHost .lb-nchain"));
  for (let i = 0; i < 10; i++) await press(page, '#labsHost [data-ncx="next"]');
  await reach("the end of the chain", until(page, () => (document.querySelector('#labsHost [data-ncx="next"]') || {}).getAttribute?.("aria-disabled") === "true", null, 8000));
  await press(page, '#labsHost [data-ncx="play"]'); await press(page, '#labsHost [data-ncx="play"]');
  // the empty atom: the drawing's three descriptions, and the sentence on arrival at the marble
  await go("#empty"); await reach("the empty atom's drawing", until(page, () => !!window.AtomDeep && ((document.getElementById("scaleCanvas") || {}).getAttribute?.("aria-label") || "").length > 10, null, 30000));
  await press(page, "#scaleBtn"); await reach("the fall to the marble", reads("#scaleSay", 15000));
  const st = await page.evaluate(() => ({ lang: document.documentElement.lang, left: AtomI18N.missing.length, first: AtomI18N.missing.slice(0, 6).join(" | ") }));
  !lost.length ? ok(n, "every step was reached: the card's isotopes and origin sketch, the lens, the molecule builder, the trends, the electron energies, the chain's close-up, the empty atom") : fail(n, "could not reach: " + lost.join("; "));
  st.lang === "es" && lens && lens !== "Families" && st.left === 0 ? ok(n, `none of it asks for a string the pack lacks (the lens is called ${lens})`) : fail(n, st.left ? `${st.left} strings missing: ${st.first}` : `the page is not in Spanish: html lang="${st.lang}", and the lens reads "${lens}"`);
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(400);
}, { wait: 1500 });

// a language Atom does not have, a name every object has, and a language on the list with no pack yet (German):
// the page stays English and says nothing
for (const bad of ["xx", "constructor", "de"]) {
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
  // 2.2: one Build link sets the atom as a goal, so the student builds it (the visit "links into the labs" opens that address)
  const goals = links.filter((h) => /#lab=build&z=\d+&a=\d+&goal=1$/.test(h));
  goals.length ? ok(n, `a Build link that sets a goal (${goals[0]})`) : fail(n, "no Build link sets a goal: " + links.filter((h) => /#lab=build/.test(h)).join(", "));
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

// ------------------------------------------------------------------ 2.3: measured energies, display options, hostile input
await visit("measured energies", `${BASE}#lab=pes&z=26`, async (page, n) => {
  await until(page, () => !!document.querySelector('#labsHost [data-pp="meas"]') && document.querySelectorAll("#labsHost [data-pk]").length === 7, null, 30000);
  const before = await page.evaluate(() => document.querySelector("#labsHost .lb-pmeas").hidden);
  await press(page, '#labsHost [data-pp="meas"]'); await until(page, () => document.querySelectorAll("#labsHost .lb-pmeas tbody tr").length === 7, null, 5000);
  const t = await page.evaluate(() => ({ pressed: document.querySelector('#labsHost [data-pp="meas"]').getAttribute("aria-pressed"), rows: [...document.querySelectorAll("#labsHost .lb-pmeas tbody tr")].map((r) => [...r.children].map((c) => c.textContent.trim())), cap: (document.querySelector("#labsHost .lb-pmeas caption") || {}).textContent || "" }));
  const row = (name) => t.rows.find((r) => r[0] === name) || [];
  // iron's 1s edge is 7,112 eV, which is 686 MJ/mol; 3d sits under the 40 eV line and is left out; 4s takes the atom's first ionization energy
  before && t.pressed === "true" && /Iron/.test(t.cap) && row("1s")[2] === "686" && row("1s")[3] === "1.3" && row("3d")[2] === "not measured" && /^0\.76 \*$/.test(row("4s")[2] || "")
    ? ok(n, "the table sets Slater's estimate beside the measured value: iron's 1s at 686 MJ/mol (estimate 1.3 times too high), 3d left out, 4s from the first ionization energy")
    : fail(n, "the measured table: " + JSON.stringify(t).slice(0, 300));
  await press(page, '#labsHost [data-pp="guess"]'); await page.waitForTimeout(300);
  (await page.evaluate(() => document.querySelector("#labsHost .lb-pmeas").hidden)) ? ok(n, "a mystery element keeps its measured values to itself until it is named") : fail(n, "the measured table shows during a mystery element");
}, { wait: 1500 });

await visit("display options", `${BASE}`, async (page, n) => {
  await until(page, () => !!document.querySelector(".disp-menu summary"), null, 15000);
  await press(page, ".disp-menu summary");
  const sw = await page.evaluate(() => [...document.querySelectorAll(".disp-menu [role=switch]")].map((b) => b.getAttribute("data-disp") + "=" + b.getAttribute("aria-checked")));
  sw.join() === "contrast=false,spacing=false" ? ok(n, "the Aa menu offers two switches, both off") : fail(n, "switches: " + sw.join());
  await Promise.all([page.waitForNavigation({ waitUntil: "load" }).catch(() => {}), press(page, '.disp-menu [data-disp="contrast"]')]);
  await until(page, () => document.documentElement.getAttribute("data-contrast") === "more" && document.querySelectorAll(".pt-el").length === 118, null, 20000);
  const st = await page.evaluate(() => ({ attr: document.documentElement.getAttribute("data-contrast"), kept: localStorage.getItem("atom.contrast"), ink: getComputedStyle(document.documentElement).getPropertyValue("--ink").trim(), on: (document.querySelector('.disp-menu [data-disp="contrast"]') || {}).getAttribute?.("aria-checked") }));
  st.attr === "more" && st.kept === "more" && (st.ink === "#fff" || st.ink === "#000") && st.on === "true" ? ok(n, "More contrast is set on the page before it paints, kept on the device, and the switch says on") : fail(n, JSON.stringify(st));
}, { wait: 1200, skipAxe: true });
await visit("display options, phone", `${BASE}teachers.html?spacing=wide`, async (page, n) => {
  const st = await page.evaluate(() => ({ attr: document.documentElement.getAttribute("data-spacing"), own: !!(document.querySelector(".disp-menu") || {}).offsetParent, over: document.documentElement.scrollWidth - innerWidth }));
  await press(page, ".lang-menu summary");
  const inMenu = await page.evaluate(() => [...document.querySelectorAll(".lang-menu .disp-li [role=switch]")].filter((b) => b.offsetParent).map((b) => b.getAttribute("data-disp") + "=" + b.getAttribute("aria-checked")).join());
  st.attr === "wide" && !st.own && st.over <= 0 && inMenu === "contrast=false,spacing=true" ? ok(n, "on a phone the switches sit in the language menu; wider spacing came from the address and nothing scrolls sideways") : fail(n, JSON.stringify(st) + " " + inMenu);
}, { wait: 1000, viewport: { width: 360, height: 760 }, context: { isMobile: ENGINE !== "firefox", hasTouch: true } });

// Text from outside reaches Atom in three ways: the address, what the browser saved, and what a reader pastes. Each is fed
// markup and prototype keys. Nothing may run, no element the text asked for may appear, and the page must still work.
for (const [where, at] of [["site", ""], ["app", "app/"]]) {
  await visit(`hostile input, ${where}`, `${BASE}${at}`, async (page, n) => {
    const X = ['"><img src=x onerror=window.__x=1>', "<svg onload=window.__x=1>", "<script>window.__x=1</script>", "__proto__", "1e999"], enc = encodeURIComponent;
    let dialogs = 0; page.on("dialog", (d) => { dialogs++; d.dismiss().catch(() => {}); });
    const whole = () => page.evaluate(() => { const bad = []; for (const e of document.querySelectorAll("*")) { for (const a of e.attributes) if (/^on/i.test(a.name)) bad.push(e.tagName + "[" + a.name + "]");
        if (/^(IFRAME|OBJECT|EMBED)$/.test(e.tagName) || (e.tagName === "IMG" && e.getAttribute("src") === "x") || (e.tagName === "SCRIPT" && !e.src && /__x/.test(e.textContent))) bad.push(e.tagName); }
      return !bad.length && window.__x !== 1 && {}.polluted === undefined && document.querySelectorAll(".pt-el").length === 118 && /^[a-z]{2,3}(-[A-Za-z]+)?$/.test(document.documentElement.lang) ? "" : JSON.stringify({ bad: bad.slice(0, 4), ran: window.__x === 1, polluted: {}.polluted !== undefined, tiles: document.querySelectorAll(".pt-el").length, lang: document.documentElement.lang }); });
    const broke = [];
    for (const x of X) for (const u of [`?lang=${enc(x)}&el=${enc(x)}&level=${enc(x)}&contrast=${enc(x)}&spacing=${enc(x)}#lab=${enc(x)}&z=${enc(x)}&step=${enc(x)}&mol=${enc(x)}&chain=${enc(x)}`, `?el=${enc(x)}#card=${enc(x)}`]) {
      await page.goto(ORIGIN + BASE + at + u, { waitUntil: "load" }); await until(page, () => document.querySelectorAll(".pt-el").length === 118, null, 15000); const w = await whole(); if (w) broke.push(u.slice(0, 50) + " " + w); }
    !broke.length ? ok(n, "ten addresses made of markup and prototype keys: nothing ran, nothing was added to the page, and the table is whole") : fail(n, broke.slice(0, 2).join(" | ").slice(0, 400));
    await page.evaluate(() => { const S = { "atom.progress": '{"__proto__":{"polluted":1},"seen":{"<img src=x onerror=window.__x=1>":1,"26":"<svg onload=window.__x=1>"},"built":["<script>window.__x=1</script>"],"badges":{"\\"><img src=x onerror=window.__x=1>":1},"mastered":"nope","daily":{"z":"<img src=x onerror=window.__x=1>"}}',
        "atom.site.theme": '"><script>window.__x=1</script>', "atom.theme": "<svg onload=window.__x=1>", "atom.lang": "<img src=x onerror=window.__x=1>", "atom.level": "<b>", "atom.contrast": '"onmouseover="window.__x=1', "atom.spacing": "<i>", "atom.site.motion": "<b>", "atom.motion": "<b>", "atom.site.quality": "<b>", "atom.challenge": '{"__proto__":{"polluted":1},"keys":["<img src=x onerror=window.__x=1>"]}' };
      for (const k in S) localStorage.setItem(k, S[k]); });
    const broke2 = [];
    for (const u of ["", "#lab=you", "#lab=build&z=26"]) { await page.goto(ORIGIN + BASE + at + u, { waitUntil: "load" }); await until(page, () => document.querySelectorAll(".pt-el").length === 118, null, 15000); await page.waitForTimeout(700); const w = await whole(); if (w) broke2.push((u || "front") + " " + w); }
    !broke2.length ? ok(n, "saved data that Atom did not write (markup in every key, a __proto__ entry): read without harm on three screens") : fail(n, broke2.slice(0, 2).join(" | ").slice(0, 400));
    if (where === "site") {
      await page.evaluate(() => localStorage.clear()); await page.goto(ORIGIN + BASE + "#lab=you", { waitUntil: "load" }); await until(page, () => !!document.querySelector("#labsHost [data-yimport]"), null, 30000);
      await page.evaluate(() => { const h = document.querySelector("#labsHost"), t = h.querySelector("[data-yimport]"); t.hidden = false;
        t.value = '{"__proto__":{"polluted":1},"app":"atom","v":1,"progress":{"__proto__":{"polluted":1},"seen":{"<img src=x onerror=window.__x=1>":1},"badges":{"<svg onload=window.__x=1>":1},"built":{"constructor":{"prototype":{"polluted":1}}}}}';
        h.querySelector('[data-ya="import-go"]').click(); const r = h.querySelector("[data-yread]"); r.value = '<img src=x onerror=window.__x=1> A1.AAAA\n"><svg onload=window.__x=1>\nA9.' + "Z".repeat(3000) + "\n__proto__ constructor"; h.querySelector('[data-ya="read"]').click(); });
      await page.waitForTimeout(600); const w = await whole();
      !w ? ok(n, "a pasted progress file and pasted turn-in codes full of markup are shown as text or refused") : fail(n, w.slice(0, 300)); }
    !dialogs ? ok(n, "no dialog opened") : fail(n, dialogs + " dialogs opened");
  }, { wait: 800, skipAxe: true });
}

// 2.3: nine more languages. One screen each for a Latin-script language (fr), one that bends its nouns (ru), one written
// without spaces (zh), and one read from the right (ar): the page is in that language, the pack has every sentence, no
// placeholder is left unfilled, nothing spills sideways, and the menu marks the language as not yet reviewed. In Arabic
// the table of elements still starts with hydrogen on the left, a configuration is drawn in its own order, and on a row
// of tabs the left arrow is the one that goes on.
for (const code of ["fr", "ru", "zh", "ar"]) {
  await visit(`site in ${code}`, `${BASE}?lang=${code}#lab=build&z=26`, async (page, n) => {
    await until(page, () => !!document.querySelector("#labsHost .lb-pane:not([hidden]) .lb-cfg"), null, 30000); await page.waitForTimeout(600);
    const r = await page.evaluate(() => { const t = document.body.innerText, h = document.documentElement; return { lang: AtomI18N.lang, failed: AtomI18N.failed, html: h.lang, dir: h.dir, miss: AtomI18N.missing.slice(0, 3),
      raw: (t.match(/\{[A-Za-z_][\w:]*\}|\[\[[^\]]*\]\]/g) || []).slice(0, 3), over: h.scrollWidth - innerWidth, beta: !!document.querySelector('.lang-list a[aria-current="true"] .lang-beta'), note: !!document.querySelector(".lang-list .lang-note, .lang-list small, .lang-list p") }; });
    r.lang === code && !r.failed ? ok(n, `the page is in ${code} (html lang "${r.html}", ${r.dir})`) : fail(n, `the page is in ${r.lang}; the pack for ${r.failed} did not load`);
    !r.miss.length && !r.raw.length ? ok(n, "the pack has every sentence on this screen, and no placeholder is left unfilled") : fail(n, `missing: ${JSON.stringify(r.miss)}; unfilled: ${r.raw.join(" ")}`);
    r.over <= 1 ? ok(n, "nothing spills sideways") : fail(n, `the page is ${r.over}px wider than the window`);
    r.beta ? ok(n, "the language menu marks it Beta") : fail(n, "no Beta mark beside the language in the menu");
    if (code === "ar") {
      const g = await page.evaluate(() => { const x = (z) => document.querySelector('.pt-el[data-z="' + z + '"]').getBoundingClientRect().left;
        const c = document.querySelector("#labsHost .lb-pane:not([hidden]) .lb-cfg"), w = document.createTreeWalker(c, NodeFilter.SHOW_TEXT), rg = document.createRange(), xs = []; let k;
        while ((k = w.nextNode())) for (let i = 0; i < k.data.length; i++) { if (!/[A-Za-z0-9\[\]]/.test(k.data[i])) continue; rg.setStart(k, i); rg.setEnd(k, i + 1); const q = rg.getClientRects()[0]; if (q && q.width) xs.push([k.data[i], q.left, q.top]); }
        let inOrder = xs.length > 4; for (let i = 1; i < xs.length; i++) if (Math.abs(xs[i][2] - xs[i - 1][2]) < 8 && xs[i][1] < xs[i - 1][1] - 0.6) inOrder = false;
        return { dir: document.documentElement.dir, h: x(1), he: x(2), li: x(3), cfg: xs.map((q) => q[0]).join(""), inOrder }; });
      g.dir === "rtl" && g.h < g.he && g.h <= g.li + 1 ? ok(n, "read from the right, and the table of elements still starts with hydrogen on the left") : fail(n, `dir ${g.dir}; hydrogen at ${g.h}, helium at ${g.he}`);
      g.inOrder ? ok(n, `iron's configuration is drawn in its own order (${g.cfg})`) : fail(n, `the configuration is out of order on the page (${g.cfg})`);
      const tab = await page.evaluate(() => { const t = [...document.querySelectorAll('#labsHost .lb-tabs [role="tab"]')]; t[0].focus(); return t.map((b) => b.id); });
      await page.keyboard.press("ArrowLeft"); const at = await page.evaluate(() => document.activeElement && document.activeElement.id);
      at === tab[1] ? ok(n, "on the row of tabs the left arrow goes on to the next tab") : fail(n, `after the left arrow the focus is on ${at}, not ${tab[1]}`);
    }
  }, { wait: 1500 });
}

// a name takes the form its sentence asks for: the pack's own forms, reached by reference and by recognizing a plain name
for (const [code, form] of [["ru", "gen"], ["fr", "du"], ["ar", "def"], ["hi", "obl"], ["bn", "gen"]]) {
  await visit(`a name in its form, ${code}`, `${BASE}?lang=${code}`, async (page, n) => {
    await until(page, () => window.AtomI18N && AtomI18N.lang !== "en" && !!AtomI18N.forms && document.querySelectorAll(".pt-el").length === 118, null, 15000);
    const r = await page.evaluate((form) => { const F = AtomI18N.forms || {}, z = 8, want = F[form] ? F[form][z - 1] : null, plain = String(AtomI18N.el(z));
      return { lang: AtomI18N.lang, want, plain, byRef: String(AtomI18N.formed(AtomI18N.el(z), form)), byName: String(AtomI18N.formed(plain, form)), iso: String(AtomI18N.formed(AtomI18N.iso(6, 14), form)), isoPlain: String(AtomI18N.iso(6, 14)), forms: Object.keys(F) }; }, form);
    r.want && r.byRef === r.want && r.byName === r.want ? ok(n, `${code}: oxygen as "${r.plain}", and in the form "${form}" as "${r.byRef}", by reference and from the plain name`) : fail(n, `${code} ${form}: wanted ${r.want}, got ${r.byRef} by reference and ${r.byName} from the name (forms: ${r.forms.join(", ")})`);
    r.iso && /14/.test(r.iso) ? ok(n, `${code}: carbon-14 is "${r.isoPlain}", in that form "${r.iso}"`) : fail(n, `${code}: no isotope form (${r.iso})`);
  }, { wait: 600, skipAxe: true });
}

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
