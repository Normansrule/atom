#!/bin/sh
# extract-site.sh — cut the website's generated files out of the app, which is
# the one source. The renderers, the table, the labs, the labs' stylesheet,
# and the physics and element data are copied verbatim between markers the
# app carries; nothing is retyped. The sync runs this, and so does CI, which
# compares the result with what docs/assets holds.
#
#   scripts/extract-site.sh app/atom.html docs/assets
set -eu
HERE="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${1:?usage: scripts/extract-site.sh app.html outdir}"
OUT="${2:?usage: scripts/extract-site.sh app.html outdir}"
mkdir -p "$OUT"

region(){ # region NAME: the lines between /* NAME BEGIN */ and /* NAME END */
  awk -v b="/* $1 BEGIN */" -v e="/* $1 END */" 'index($0,b){p=1} p{print} index($0,e){p=0}' "$SRC"
}
need(){ grep -q "$1 END" "$2" || { echo "$1 markers missing" >&2; exit 1; }; }

# the shared engines, exactly as the app ships them
region ATOM-ENGINES > "$OUT/atom-engines.js"; need ATOM-ENGINES "$OUT/atom-engines.js"
# the table, the sky, the sims, and the missions, with the labs cut out: the
# site loads them on their own, when a reader gets near the labs
region ATOM-PTABLE | awk 'index($0,"/* ATOM-LABS BEGIN */"){skip=1} !skip{print} index($0,"/* ATOM-LABS END */"){skip=0}' > "$OUT/atom-ptable.js"
need ATOM-PTABLE "$OUT/atom-ptable.js"
region ATOM-LABS > "$OUT/atom-labs.js"; need ATOM-LABS "$OUT/atom-labs.js"
# the labs' stylesheet (Build, Explore, The math, Predict, Experiment, You), shared with the app
region ATOM-LABS-CSS > "$OUT/atom-labs.css"; need ATOM-LABS-CSS "$OUT/atom-labs.css"
# the app's physics and element data, verbatim, plus the binding curve its code computes
node "$HERE/scripts/extract-site-data.js" "$SRC" "$OUT/atom-data.js"
