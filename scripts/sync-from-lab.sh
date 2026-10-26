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

# the shared engines, exactly as the app ships them
awk '/\/\* ATOM-ENGINES BEGIN \*\//{p=1} p{print} /\/\* ATOM-ENGINES END \*\//{p=0}' "$SRC" \
  > "$HERE/docs/assets/atom-engines.js"
grep -q "ATOM-ENGINES END" "$HERE/docs/assets/atom-engines.js" || { echo "engine markers missing" >&2; exit 1; }
awk '/\/\* ATOM-PTABLE BEGIN \*\//{p=1} p{print} /\/\* ATOM-PTABLE END \*\//{p=0}' "$SRC" \
  > "$HERE/docs/assets/atom-ptable.js"
grep -q "ATOM-PTABLE END" "$HERE/docs/assets/atom-ptable.js" || { echo "table markers missing" >&2; exit 1; }
# the labs' stylesheet (Build, Predict, Calculate, Hear, You), shared with the app
awk '/\/\* ATOM-LABS-CSS BEGIN \*\//{p=1} p{print} /\/\* ATOM-LABS-CSS END \*\//{p=0}' "$SRC" \
  > "$HERE/docs/assets/atom-labs.css"
grep -q "ATOM-LABS-CSS END" "$HERE/docs/assets/atom-labs.css" || { echo "labs stylesheet markers missing" >&2; exit 1; }

# the app's physics and element data, verbatim, plus the binding curve its code computes
node "$HERE/scripts/extract-site-data.js" "$SRC" "$HERE/docs/assets/atom-data.js"
echo "synced from $SRC"
