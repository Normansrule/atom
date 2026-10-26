// build.mjs: package the desktop app for one platform, stamped with the version
// in the repository's VERSION file.
//
//   node build.mjs win      Atom-Windows-Setup.exe and Atom-Windows-portable.zip
//   node build.mjs linux    Atom-Linux.AppImage and Atom-Linux.deb
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const target = process.argv[2];
const flag = { win: "--win", linux: "--linux", mac: "--mac" }[target];
if (!flag) { console.error("usage: node build.mjs win|linux"); process.exit(2); }

const version = fs.readFileSync(path.join(HERE, "..", "VERSION"), "utf8").trim();
if (!/^\d+\.\d+\.\d+$/.test(version)) { console.error(`VERSION is "${version}", not x.y.z`); process.exit(1); }

const run = (args) => {
  const r = spawnSync(process.execPath, args, { cwd: HERE, stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status || 1);
};
run([path.join(HERE, "prepare.mjs")]);
run([require.resolve("electron-builder/cli.js"), flag, "--publish", "never", `-c.extraMetadata.version=${version}`]);
console.log(`built Atom ${version} for ${target} in desktop/dist`);
