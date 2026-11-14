#!/usr/bin/env python3
"""check_budget.py: the site's weight against scripts/budgets.json.

Every group of files is gzipped the way a server would send it and compared
with its limit; every language pack's slices are held to the pack limits. Exit
1 on anything over. The point is that a heavier first screen is a decision,
made in the commit that raises the limit, and never an accident.
"""
import glob, gzip, json, os, sys
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
B = json.load(open(os.path.join(HERE, "scripts", "budgets.json"), encoding="utf-8"))
def size(rel, raw=False):
    data = open(os.path.join(HERE, rel), "rb").read()
    return len(data) if raw else len(gzip.compress(data, 9, mtime=0))
over = 0
for name, g in B["bytes"].items():
    kb = sum(size(f, g.get("raw")) for f in g["files"]) / 1024
    bad = kb > g["kb"]; over += bad
    print("%s %-74s %7.1f KB of %d" % ("OVER" if bad else "ok  ", name, kb, g["kb"]))
for name, g in B["packs"].items():
    for p in sorted(glob.glob(os.path.join(HERE, "docs", "assets", "i18n", "*" + g["suffix"]))):
        kb = size(os.path.relpath(p, HERE)) / 1024; bad = kb > g["kb"]; over += bad
        print("%s %-74s %7.1f KB of %d" % ("OVER" if bad else "ok  ", os.path.basename(p) + ", " + name, kb, g["kb"]))
print("budgets: %s" % ("all within their limits" if not over else "%d over; make it lighter, or raise the limit in scripts/budgets.json and say why" % over))
sys.exit(1 if over else 0)
