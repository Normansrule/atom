#!/usr/bin/env python3
"""stamp_sw.py [--check]: write the hash of the site's files into docs/sw.js.

The service worker's cache is named for VERSION and BUILD. BUILD is the first
eight hex digits of a SHA-256 over every file in its CORE list and every
language file under docs/assets/i18n/, so any change to what a reader would be
served changes the cache name and reaches returning readers, version bump or
not. --check exits 1 if the stamp in sw.js is not the one these files give
(scripts/smoke.mjs and CI run it).
"""
import hashlib, json, os, re, sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(HERE, "docs")
SW = os.path.join(DOCS, "sw.js")

def stamp():
    sw = open(SW, encoding="utf-8").read()
    m = re.search(r"var CORE = (\[.*?\]);", sw, re.S)
    if not m: sys.exit("stamp_sw: no CORE list in sw.js")
    core = json.loads(m.group(1))
    files = sorted(set(("index.html" if f == "./" else f) for f in core))
    i18n = os.path.join(DOCS, "assets", "i18n")
    files += sorted("assets/i18n/" + f for f in os.listdir(i18n) if f.endswith(".js")) if os.path.isdir(i18n) else []
    h = hashlib.sha256()
    for f in files:
        p = os.path.join(DOCS, f)
        if not os.path.exists(p): sys.exit("stamp_sw: sw.js lists %s, which does not exist" % f)
        h.update(f.encode()); h.update(b"\0"); h.update(open(p, "rb").read()); h.update(b"\0")
    return sw, h.hexdigest()[:8]

if __name__ == "__main__":
    sw, want = stamp()
    have = re.search(r'var BUILD = "([0-9a-f]*)";', sw)
    if not have: sys.exit("stamp_sw: no BUILD line in sw.js")
    if "--check" in sys.argv:
        if have.group(1) != want: sys.exit("docs/sw.js says BUILD %s but the files give %s: run python3 scripts/stamp_sw.py" % (have.group(1), want))
        print("sw.js BUILD", want, "matches the files")
    else:
        if have.group(1) != want: open(SW, "w", encoding="utf-8").write(sw.replace(have.group(0), 'var BUILD = "%s";' % want))
        print("sw.js BUILD", want)
