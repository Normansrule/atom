// smoke-desktop.mjs: start the packaged desktop app the way a person would,
// connect to its window through the Chrome DevTools Protocol, and fail if the
// page throws, the physics self-test fails, or the table does not build.
//
//   node build.mjs linux   (or win)   first
//   node smoke-desktop.mjs            on Linux, run it under xvfb-run when there is no display
//
// The app's hardened build refuses Node's own --inspect switches, so this uses
// Chromium's --remote-debugging-port instead, which needs nothing from the app.
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

let chromium;
try { ({ chromium } = await import("playwright")); } catch { ({ chromium } = await import("playwright-core")); }

const HERE = path.dirname(fileURLToPath(import.meta.url));
const exe = process.env.ATOM_EXE ? path.resolve(process.env.ATOM_EXE)      // e.g. the AppImage itself
          : process.platform === "win32" ? path.join(HERE, "dist", "win-unpacked", "Atom.exe")
          : process.platform === "linux" ? path.join(HERE, "dist", "linux-unpacked", "atom-periodic-table")
          : null;
if (!exe || !fs.existsSync(exe)) { console.error(`no packaged app at ${exe}; run node build.mjs first`); process.exit(2); }

const PORT = 9333;
// CI machines have no GPU: let Chromium draw WebGL in software there, so the
// clouds are exercised too. People's own machines use their graphics card.
const args = [`--remote-debugging-port=${PORT}`];
if (process.env.CI) args.push("--enable-unsafe-swiftshader", "--use-angle=swiftshader");
const proc = spawn(exe, args, { stdio: ["ignore", "inherit", "inherit"] });
let exited = null;
proc.on("exit", (code) => { exited = code; });

const failures = [];
const fail = (m) => { failures.push(m); console.log("  FAIL " + m); };
const ok = (m) => console.log("  ok   " + m);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let browser = null;
try {
  for (let i = 0; i < 60 && !browser; i++) {
    if (exited !== null) throw new Error(`the app exited with code ${exited} before its window appeared`);
    try { browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`); } catch { await sleep(1000); }
  }
  if (!browser) throw new Error("could not reach the app's window within 60 seconds");
  ok(`the app started (${path.basename(exe)})`);

  const ctx = browser.contexts()[0];
  let page = ctx.pages().find((p) => p.url().startsWith("file:"));
  for (let i = 0; i < 30 && !page; i++) { await sleep(500); page = ctx.pages().find((p) => p.url().startsWith("file:")); }
  if (!page) throw new Error("the window never loaded the app's page");
  // listen first, then reload, so an error thrown while the page starts is caught too
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(9000);

  const title = await page.title();
  /Atom/.test(title) ? ok(`title "${title}"`) : fail(`title "${title}"`);
  const st = await page.evaluate(() => window.__ATOM_SELFTEST__ && { ok: window.__ATOM_SELFTEST__.ok, bad: window.__ATOM_SELFTEST__.lines.filter((l) => /FAIL/.test(l)) });
  st && st.ok ? ok("physics self-test passes") : fail("physics self-test: " + JSON.stringify(st));
  const tiles = await page.locator("#front .pt-el").count();
  tiles === 118 ? ok("118 squares on the table") : fail(`${tiles} squares on the table`);
  const gl = await page.evaluate(() => !!document.createElement("canvas").getContext("webgl2"));
  ok(gl ? "WebGL 2 is available" : "WebGL 2 is not available on this machine; the table shows its fallback");
  const blocked = await page.evaluate(() => window.open("about:blank") === null);
  blocked ? ok("new windows are refused (links go to the browser instead)") : fail("window.open opened a window");
  errors.length ? fail("page errors: " + errors.join(" | ")) : ok("no page errors");
  await page.screenshot({ path: path.join(HERE, "dist", `smoke-${process.platform}.png`) });
  ok(`screenshot saved to dist/smoke-${process.platform}.png`);
} catch (e) {
  fail(e.message);
} finally {
  if (browser) await browser.close().catch(() => {});
  if (exited === null) proc.kill();
}
console.log(failures.length ? `\n${failures.length} problem(s)` : "\nall clear");
process.exit(failures.length ? 1 : 0);
