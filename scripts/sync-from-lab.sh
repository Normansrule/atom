#!/bin/sh
# sync-from-lab.sh — copy the app out of the private lab and regenerate the
# site's generated files from it. The app (app/atom.html) is the one source:
# the website's renderer, physics and data are cut out of it, never retyped.
#
#   scripts/sync-from-lab.sh path/to/lab     (the private workspace the app is developed in)
set -eu
HERE="$(cd "$(dirname "$0")/.." && pwd)"
LAB="${1:?usage: scripts/sync-from-lab.sh path/to/lab}"
SRC="$LAB/native/atom/index.html"
[ -f "$SRC" ] || { echo "no app at $SRC" >&2; exit 1; }

cp "$SRC" "$HERE/app/atom.html"
cp "$SRC" "$HERE/docs/app/index.html"
# mac/icon.png is the 1024-pixel master the Mac build needs for Retina; the
# lab keeps a 512-pixel copy, so it is not copied over here

sh "$HERE/scripts/extract-site.sh" "$HERE/app/atom.html" "$HERE/docs/assets"
echo "synced from $SRC"
