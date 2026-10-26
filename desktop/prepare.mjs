// prepare.mjs: copy the one app file, its icon, and the licenses into this
// folder, so the desktop build ships exactly what the website and the Mac app do.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const copy = (from, to) => { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); };

copy(path.join(ROOT, "app", "atom.html"), path.join(HERE, "app", "index.html"));
copy(path.join(ROOT, "docs", "assets", "fonts", "OFL.txt"), path.join(HERE, "app", "Archivo-OFL.txt"));
copy(path.join(ROOT, "LICENSE"), path.join(HERE, "LICENSE.txt"));
copy(path.join(ROOT, "mac", "icon.png"), path.join(HERE, "icon.png"));            // the window icon
copy(path.join(ROOT, "mac", "icon.png"), path.join(HERE, "build", "icon.png"));   // the installer and file icons
console.log("prepared the app, its icon, and its licenses");
