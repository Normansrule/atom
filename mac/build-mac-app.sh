#!/bin/sh
# build-mac-app.sh: build Atom.app from app/atom.html, sign it, and zip it.
#
#   mac/build-mac-app.sh
#       builds dist/Atom.app, dist/Atom-mac.zip, and dist/Atom-mac.zip.sha256
#
# Needs the Xcode command line tools (xcode-select --install). Nothing else.
#
# SIGNING. With no settings the app is signed ad hoc: it runs, but macOS asks
# the person who downloads it to approve it once in System Settings. To ship
# an app that opens without that step, sign it with an Apple Developer ID and
# have Apple notarize it (an Apple Developer Program membership is needed):
#
#   DEVELOPER_ID="Developer ID Application: Your Name (TEAMID)" \
#   NOTARY_PROFILE=atom-notary \
#   mac/build-mac-app.sh
#
# where atom-notary was saved once with
#   xcrun notarytool store-credentials atom-notary \
#     --apple-id you@example.com --team-id TEAMID --password <app-specific password>
#
# VERSION comes from the VERSION file at the top of the repository unless it
# is set in the environment; BUILD_NUMBER defaults to the number of commits.
set -eu
HERE="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="${VERSION:-$(cat "$HERE/VERSION" 2>/dev/null || echo 1.0.0)}"
BUILD_NUMBER="${BUILD_NUMBER:-$(git -C "$HERE" rev-list --count HEAD 2>/dev/null || echo 1)}"
DEVELOPER_ID="${DEVELOPER_ID:-}"
NOTARY_PROFILE="${NOTARY_PROFILE:-}"
NOTARY_KEYCHAIN="${NOTARY_KEYCHAIN:-}"   # only needed when the profile lives in a non-default keychain (CI)
DIST="$HERE/dist"
APP="$DIST/Atom.app"
ZIP="$DIST/Atom-mac.zip"
SRC="$HERE/app/atom.html"

say() { printf '\n== %s\n' "$*"; }
[ -f "$SRC" ] || { echo "missing $SRC" >&2; exit 1; }
for t in swiftc lipo sips iconutil codesign ditto plutil shasum; do
  command -v "$t" >/dev/null || { echo "$t not found: run xcode-select --install" >&2; exit 1; }
done
if [ -n "$NOTARY_PROFILE" ] && [ -z "$DEVELOPER_ID" ]; then
  echo "NOTARY_PROFILE is set but DEVELOPER_ID is not: Apple only notarizes Developer ID signed apps" >&2; exit 1
fi

rm -rf "$APP" "$ZIP" "$ZIP.sha256"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"

say "compiling the window, version $VERSION ($BUILD_NUMBER), for Apple silicon and Intel"
swiftc -O -target arm64-apple-macos12  -o "$DIST/atom-arm64"  "$HERE/mac/main.swift"
swiftc -O -target x86_64-apple-macos12 -o "$DIST/atom-x86_64" "$HERE/mac/main.swift"
lipo -create -output "$APP/Contents/MacOS/Atom" "$DIST/atom-arm64" "$DIST/atom-x86_64"
rm -f "$DIST/atom-arm64" "$DIST/atom-x86_64"

cp "$SRC" "$APP/Contents/Resources/index.html"
# the typeface inside the page is Archivo, under the SIL Open Font License; its
# license travels with every copy, and so does the app's own
cp "$HERE/docs/assets/fonts/OFL.txt" "$APP/Contents/Resources/Archivo-OFL.txt"
cp "$HERE/LICENSE" "$APP/Contents/Resources/LICENSE.txt"

say "making the icon"
ICONSET="$DIST/Atom.iconset"; rm -rf "$ICONSET"; mkdir -p "$ICONSET"
for s in 16 32 128 256 512; do
  sips -z $s $s "$HERE/mac/icon.png" --out "$ICONSET/icon_${s}x${s}.png" >/dev/null
  d=$((s*2)); sips -z $d $d "$HERE/mac/icon.png" --out "$ICONSET/icon_${s}x${s}@2x.png" >/dev/null
done
iconutil -c icns "$ICONSET" -o "$APP/Contents/Resources/Atom.icns"
rm -rf "$ICONSET"

cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleInfoDictionaryVersion</key><string>6.0</string>
  <key>CFBundleName</key><string>Atom</string>
  <key>CFBundleDisplayName</key><string>Atom</string>
  <key>CFBundleIdentifier</key><string>io.github.normansrule.atom</string>
  <key>CFBundleVersion</key><string>$BUILD_NUMBER</string>
  <key>CFBundleShortVersionString</key><string>$VERSION</string>
  <key>CFBundleExecutable</key><string>Atom</string>
  <key>CFBundleIconFile</key><string>Atom</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleDevelopmentRegion</key><string>en</string>
  <key>LSMinimumSystemVersion</key><string>12.0</string>
  <key>LSApplicationCategoryType</key><string>public.app-category.education</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>NSSupportsAutomaticGraphicsSwitching</key><true/>
  <key>NSHumanReadableCopyright</key><string>Thomas J. Norman. MIT License. Archivo typeface under the SIL Open Font License.</string>
</dict>
</plist>
PLIST
plutil -lint "$APP/Contents/Info.plist" >/dev/null

# Finder info or a resource fork on any copied file makes codesign refuse to sign
xattr -cr "$APP"

if [ -n "$DEVELOPER_ID" ]; then
  say "signing with $DEVELOPER_ID (hardened runtime, secure timestamp)"
  codesign --force --options runtime --timestamp --sign "$DEVELOPER_ID" "$APP"
else
  say "signing ad hoc (no Developer ID given)"
  codesign --force --sign - "$APP"
fi
codesign --verify --strict --verbose=2 "$APP"

zipit() { rm -f "$ZIP"; ( cd "$DIST" && ditto -c -k --sequesterRsrc --keepParent "Atom.app" "Atom-mac.zip" ); }
zipit

if [ -n "$NOTARY_PROFILE" ]; then
  say "sending to Apple for notarization (this usually takes a few minutes)"
  set -- --keychain-profile "$NOTARY_PROFILE"
  [ -n "$NOTARY_KEYCHAIN" ] && set -- "$@" --keychain "$NOTARY_KEYCHAIN"
  OUT="$DIST/notary.txt"
  xcrun notarytool submit "$ZIP" "$@" --wait | tee "$OUT"
  if ! grep -q "status: Accepted" "$OUT"; then
    ID="$(sed -n 's/^ *id: *\([0-9a-f-]*\).*/\1/p' "$OUT" | head -1)"
    echo "Apple did not accept the app. Its log follows." >&2
    [ -n "$ID" ] && xcrun notarytool log "$ID" "$@" >&2 || true
    exit 1
  fi
  say "stapling the ticket so the app opens even offline"
  xcrun stapler staple "$APP"
  xcrun stapler validate "$APP"
  spctl --assess --type execute --verbose=2 "$APP"
  zipit
fi

( cd "$DIST" && shasum -a 256 "Atom-mac.zip" > "Atom-mac.zip.sha256" )
say "built"
echo "  $APP"
echo "  $ZIP"
echo "  $(cat "$ZIP.sha256")"
if [ -z "$NOTARY_PROFILE" ]; then
  echo
  echo "  This build is not notarized. People who download it approve it once in"
  echo "  System Settings > Privacy & Security > Open Anyway."
fi
