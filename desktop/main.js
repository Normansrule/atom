// Atom for Windows and Linux: a window around one HTML file.
//
// The whole app is app/atom.html, copied in as app/index.html by prepare.mjs.
// This shell opens a window, loads that file, sends web links to your browser,
// recovers if the page's process ever stops, and gives the app a normal menu.
// The page gets no Node.js, no preload bridge, and no permissions; it cannot
// navigate anywhere but itself. No network access, no data collected.
"use strict";
const { app, BrowserWindow, Menu, shell, session, dialog, screen } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { pathToFileURL } = require("node:url");

const SITE = "https://normansrule.github.io/atom/";
const REPO = "https://github.com/normansrule/atom";
const ISSUES = REPO + "/issues/new/choose";
const RELEASES = REPO + "/releases";
const PAGE = path.join(__dirname, "app", "index.html");
const PAGE_URL = pathToFileURL(PAGE).href;
const EXTERNAL = /^(https?|mailto):/i;

// Keep Atom's settings in a folder of its own: "Atom" was also the name of a
// retired code editor, whose leftover data should never be mixed with ours.
app.setPath("userData", path.join(app.getPath("appData"), "io.github.normansrule.atom"));
if (process.platform === "win32") app.setAppUserModelId("io.github.normansrule.atom");

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  let win = null;
  let crashes = [];
  const stateFile = () => path.join(app.getPath("userData"), "window.json");
  const readState = () => { try { return JSON.parse(fs.readFileSync(stateFile(), "utf8")); } catch { return {}; } };
  const saveState = () => {
    if (!win || win.isDestroyed()) return;
    try { fs.writeFileSync(stateFile(), JSON.stringify({ ...win.getNormalBounds(), maximized: win.isMaximized() })); } catch { /* not worth failing over */ }
  };
  const openExternal = (url) => { if (EXTERNAL.test(url)) shell.openExternal(url); };
  const isOwnPage = (url) => url.split("#")[0] === PAGE_URL;

  function createWindow() {
    const s = readState();
    // a window last seen on a monitor that has since been unplugged would open off-screen
    const onScreen = s.x != null && screen.getAllDisplays().some(({ workArea: a }) =>
      s.x < a.x + a.width && s.x + (s.width || 0) > a.x && s.y < a.y + a.height && s.y + (s.height || 0) > a.y);
    win = new BrowserWindow({
      width: s.width || 1440, height: s.height || 960,
      x: onScreen ? s.x : undefined, y: onScreen ? s.y : undefined,
      minWidth: 820, minHeight: 600,
      title: "Atom",
      backgroundColor: "#0b0c0d",                       // the chamber's ground, so there is no white flash
      icon: path.join(__dirname, "icon.png"),
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
        spellcheck: false,
      },
    });
    if (s.maximized) win.maximize();
    win.once("ready-to-show", () => win.show());
    win.on("close", saveState);
    win.loadFile(PAGE);
  }

  // Every web view: open http(s) links in the browser, refuse new windows,
  // refuse to navigate anywhere but the app's own page, and come back if the
  // page's process ever stops.
  app.on("web-contents-created", (_e, wc) => {
    wc.setWindowOpenHandler(({ url }) => { openExternal(url); return { action: "deny" }; });
    const guard = (e, url) => { if (!isOwnPage(url)) { e.preventDefault(); openExternal(url); } };
    wc.on("will-navigate", guard);
    wc.on("will-redirect", guard);
    wc.on("render-process-gone", (_ev, details) => {
      if (details.reason === "clean-exit" || !win || win.isDestroyed() || wc !== win.webContents) return;
      const now = Date.now();
      crashes = crashes.filter((t) => now - t < 60000);
      crashes.push(now);
      if (crashes.length <= 3) win.loadFile(PAGE);    // bounded, so a page that keeps failing can't loop forever
      else dialog.showErrorBox("Atom stopped", "The page stopped several times in a minute. Reopen Atom to try again.");
    });
  });

  app.on("second-instance", () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });

  function about() {
    dialog.showMessageBox(win, {
      type: "info",
      title: "About Atom",
      message: `Atom ${app.getVersion()}`,
      detail: "Every element, computed from the equations and set in the cosmos that made it.\n\n" +
              "Made by Thomas J. Norman. MIT License.\nThe Archivo typeface is used under the SIL Open Font License.\n\n" + SITE,
      buttons: ["OK"],
    });
  }

  function buildMenu() {
    const mac = process.platform === "darwin";
    const template = [
      ...(mac ? [{ role: "appMenu" }] : []),
      { label: "&File", submenu: [
        { label: "&Print…", accelerator: "CmdOrCtrl+P", click: () => win && win.webContents.print() },
        { type: "separator" },
        mac ? { role: "close" } : { role: "quit", label: "E&xit" }] },
      { label: "&Edit", submenu: [{ role: "undo" }, { role: "redo" }, { type: "separator" }, { role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" }] },
      {
        label: "&View",
        submenu: [
          { label: "&Reload", accelerator: "CmdOrCtrl+R", click: () => win && win.loadFile(PAGE) },
          { type: "separator" },
          { role: "resetZoom" }, { role: "zoomIn" }, { role: "zoomOut" },
          { type: "separator" },
          { role: "togglefullscreen" },
          { role: "toggleDevTools" },
        ],
      },
      { role: "windowMenu" },
      {
        label: "&Help",
        submenu: [
          { label: "Atom &Website", click: () => shell.openExternal(SITE) },
          { label: "&Source Code on GitHub", click: () => shell.openExternal(REPO) },
          { label: "&Report a Problem or a Science Error…", click: () => shell.openExternal(ISSUES) },
          { label: "Check for &Updates…", click: () => shell.openExternal(RELEASES) },
          { type: "separator" },
          { label: "&About Atom", click: about },
        ],
      },
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  }

  app.whenReady().then(() => {
    // The page needs no camera, microphone, location, notifications, or
    // anything else a website can ask for. Full screen, and writing a link to
    // the clipboard when you press "Copy link", are the two exceptions.
    const allowed = (permission) => permission === "fullscreen" || permission === "clipboard-sanitized-write";
    session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => cb(allowed(permission)));
    session.defaultSession.setPermissionCheckHandler((_wc, permission) => allowed(permission));
    buildMenu();
    createWindow();
  });

  app.on("window-all-closed", () => app.quit());
}
