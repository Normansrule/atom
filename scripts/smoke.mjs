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
// the service worker's cache is named for the release: the two versions must agree
{
  const vf = [path.join(ROOT, "..", "VERSION"), path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "VERSION")].find((f) => fs.existsSync(f));
  const v = vf ? fs.readFileSync(vf, "utf8").trim() : null;
  const m = /var VERSION = "([^"]+)"/.exec(fs.readFileSync(path.join(ROOT, "sw.js"), "utf8"));
  if (v && (!m || m[1] !== v)) { console.log(`  FAIL sw.js says ${m ? m[1] : "nothing"} but VERSION says ${v}`); process.exit(1); }
  console.log(`  ok   sw.js cache version ${m ? m[1] : "?"}${v ? "" : " (VERSION file not found here, not compared)"}`);
}
const fail = (where, what) => { failures.push(`${where}: ${what}`); console.log(`  FAIL ${where}: ${what}`); };
const ok = (where, what) => console.log(`  ok   ${where}: ${what}`);

console.log(`browser: ${ENGINE}`);
const browser = await launcher.launch(ENGINE === "chromium" ? {
  executablePath: process.env.CHROME_PATH || undefined,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
} : {});

async function visit(name, url, check, opts = {}) {
  console.log(`\n${name}  ${url}`);
  const page = await browser.newPage({ viewport: opts.viewport || { width: 1440, height: 900 }, ...(opts.context || {}) });
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
  await page.click(".pt-el[data-z='79']"); await page.waitForTimeout(1200);
  (await page.locator("#sheet").isVisible()) ? ok(n, "gold's card opens") : fail(n, "the card did not open");
  // the labs arrive on their own once a reader heads for them
  await page.keyboard.press("Escape");
  await page.evaluate(() => document.getElementById("labs").scrollIntoView());
  await page.waitForFunction(() => window.AtomLabs && document.querySelectorAll("#labsHost [role=tab]").length === 7, null, { timeout: 15000 }).catch(() => {});
  const tabs = await page.locator("#labsHost [role=tab]").count();
  tabs === 7 ? ok(n, "the labs load on approach, seven tabs") : fail(n, `the labs did not load (${tabs} tabs)`);
  const labBad = await page.evaluate(() => window.AtomLabs ? AtomLabs.selfTest().filter((x) => !x[1]).map((x) => x[0]) : ["no AtomLabs"]);
  labBad.length ? fail(n, "labs self-test on the site: " + labBad.join("; ")) : ok(n, "labs self-test passes on the site");
  await page.evaluate(() => document.getElementById("lbTab-math").click()); await page.waitForTimeout(400);
  const mt = await page.evaluate(() => (document.querySelector("#labsHost .lb-mtitle") || {}).textContent || "");
  /gold/i.test(mt) ? ok(n, "The math opens on gold") : fail(n, `The math did not open (${mt})`);
  // back to the top with everything loaded, so the accessibility pass that
  // follows sees the table's bar (Today's element, the lenses) as a reader would
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(400);
  // offline: once the worker has the site, the page loads with the network cut
  const swOk = await page.evaluate(() => navigator.serviceWorker ? navigator.serviceWorker.ready.then(() => true).catch(() => false) : false).catch(() => false);
  if (swOk) {
    await page.waitForTimeout(1500);
    const ctx = page.context();
    await ctx.setOffline(true);
    let loaded = false;
    try { const r = await page.reload({ waitUntil: "load", timeout: 15000 }); await page.waitForTimeout(3000); loaded = !!r && (await page.locator(".pt-el").count()) === 118; } catch (e) { loaded = false; }
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
    const badge = await page.evaluate(() => (document.querySelector(".lang-wrap") || {}).getAttribute?.("data-code"));
    badge === code.toUpperCase() ? ok(n, "the language badge shows it") : fail(n, `badge ${badge}`);
    const left = await page.evaluate(() => AtomI18N.missing.length);
    left === 0 ? ok(n, "every string the page asked for is in the pack") : fail(n, `${left} strings missing from the pack: ${await page.evaluate(() => AtomI18N.missing.slice(0, 5).join(" | "))}`);
    const fe = await page.evaluate(() => ELEMENTS[25][2]);
    fe !== "Iron" ? ok(n, `element names localized (${fe})`) : fail(n, "element names still English");
    await page.evaluate(() => document.getElementById("labs").scrollIntoView());
    await page.waitForFunction(() => window.AtomLabs && document.querySelectorAll("#labsHost [role=tab]").length === 7, null, { timeout: 15000 }).catch(() => {});
    const tabs = await page.locator("#labsHost [role=tab]").count();
    tabs === 7 ? ok(n, "the labs load, seven tabs") : fail(n, `the labs did not load (${tabs} tabs)`);
    const left2 = await page.evaluate(() => AtomI18N.missing.length);
    left2 === 0 ? ok(n, "the labs' strings are all in the pack") : fail(n, `${left2} lab strings missing: ${await page.evaluate(() => AtomI18N.missing.slice(0, 5).join(" | "))}`);
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(400);
  });
  await visit(`app in ${code}`, `${BASE}app/?lang=${code}`, async (page, n) => {
    const lang = await page.evaluate(() => document.documentElement.lang);
    lang === code ? ok(n, `html lang="${code}"`) : fail(n, `html lang="${lang}"`);
    const left = await page.evaluate(async () => { const wait = (ms) => new Promise((r) => setTimeout(r, ms)); frontLabs("build", 26); await wait(400); frontLabs("math", 26); await wait(400); frontLabs("lessons"); await wait(400); return AtomI18N.missing.length; });
    left === 0 ? ok(n, "build, The math and the lessons ask for nothing the pack lacks") : fail(n, `${left} strings missing: ${await page.evaluate(() => AtomI18N.missing.slice(0, 5).join(" | "))}`);
  }, { wait: 7000, viewport: { width: 1440, height: 960 } });
}

await visit("teachers", `${BASE}teachers.html`, async (page, n) => {
  const links = await page.$$eval("main a[href^='./#lab=']", (as) => as.map((a) => a.getAttribute("href")));
  links.length >= 9 ? ok(n, `${links.length} lab links`) : fail(n, `${links.length} lab links`);
  const unknown = links.map((h) => (/#lab=([a-z]+)/.exec(h) || [])[1]).filter((p) => !/^(build|boxes|molecule|compare|trends|nuclides|hear|pes|sun|math|predict|calc|bench|lessons|you)$/.test(p));
  unknown.length ? fail(n, "links to labs that do not exist: " + unknown.join(", ")) : ok(n, "every lab link names a real lab");
  (await page.locator("table").count()) >= 2 ? ok(n, "the link table and the standards table") : fail(n, "a table is missing");
}, { wait: 1500 });

await visit("handout", `${BASE}handout.html`, async (page, n) => {
  (await page.locator("svg.qr path").count()) === 1 ? ok(n, "the QR code is drawn") : fail(n, "no QR code");
  (await page.locator("main section").count()) === 3 ? ok(n, "three columns: students, teachers, families") : fail(n, "the three sections are not all there");
  const badge = await page.evaluate(() => (document.querySelector(".lang-wrap") || {}).getAttribute?.("data-code"));
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
  const badge = await page.evaluate(() => (document.querySelector(".lang-wrap") || {}).getAttribute?.("data-code"));
  badge === "ES" ? ok(n, "the language menu shows ES") : fail(n, `language badge: ${badge}`);
}, { wait: 1500 });

await visit("404", `${BASE}no-such-page`, async (page, n) => {
  (await page.locator("a[href]").count()) > 0 ? ok(n, "the 404 page links home") : fail(n, "no link home");
}, { allow404: true, skipAxe: false, wait: 500 });

await browser.close();
server.close();
console.log(failures.length ? `\n${failures.length} problem(s)` : "\nall clear");
process.exit(failures.length ? 1 : 0);
