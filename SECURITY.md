# Security

Atom is a static website and small Mac, Windows, and Linux apps that show one local HTML file. It makes no network requests, stores nothing but your display choices and your labs and mission progress (in your own browser or app), and has no accounts or servers. A link you share (`#build=`, `#challenge=`, `#lab=`) carries only what it shows; nothing is sent to anyone.

## Reporting a problem

If you find a security problem, please report it privately through GitHub: open the repository's **Security** tab and choose **Report a vulnerability**. Please don't open a public issue for it. You'll get a reply within a week.

The newest release is the supported one. The website always runs the newest release.

## What holds the promise in place

Each of these is checked by a test that fails the build, not by good intentions.

**Nothing leaves the device.**

- Every page carries a Content-Security-Policy with `connect-src 'none'`, so the browser itself refuses any request a script might try to make. No page loads a script, style sheet, font, image, or frame from another site, and links out send no referrer.
- The test suite loads every page and lab in three browser engines and fails on any request that leaves the site.
- The Windows and Linux apps cancel every `http`, `https`, and `ws` request. Every desktop app refuses to navigate anywhere but its own page and opens web links in your browser instead.

**Nothing foreign runs on the page.**

- No page allows inline script except its own, named in the policy by SHA-256 hash. There is no `eval`, and no inline event handler or `javascript:` link anywhere. `scripts/check_csp.py` fails the build if any page's policy loosens, or if a script's hash and the policy drift apart.
- Text from outside reaches Atom in three ways: the address (`?lang=`, `#lab=`, and the rest), what the browser saved from an earlier visit, and what a reader pastes (a progress file, turn-in codes). The test suite feeds each of them markup and prototype keys (`<img onerror=…>`, `__proto__`) on the site and in the app, and fails if anything runs, if any element the text asked for appears, or if the page stops working.
- Language packs are data (JSON), checked before they ship: every placeholder and every HTML tag in a translation must match the English it stands for.

**The desktop apps are boxed in.**

- Windows and Linux (Electron): the page runs sandboxed with context isolation, no Node.js, and no preload bridge. Every permission request is refused except fullscreen and copying to the clipboard. Electron's fuses are set so the app cannot be run as plain Node, ignores `NODE_OPTIONS` and inspector flags, and loads only its own packaged, integrity-checked code.
- Mac (WKWebView): the page is one local file with read access to its own folder only. The single bridge to native code prints the current page and takes no input.

**The release pipeline is pinned.**

- Every GitHub Action the workflows use is pinned to an exact commit, not a movable tag, and Dependabot proposes updates once a month. Workflows run with read-only permission, except the job that publishes a release and the code scanner's own report.
- CodeQL scans the scripts, the build tools, and the workflows on every push and once a week.
- A release is built only by GitHub's machines from a tag whose name matches `VERSION`, after the full test suite passes in Chromium, WebKit, and Firefox.

## Checking a download

Every release lists the SHA-256 of each file in `SHA256SUMS.txt`:

```sh
shasum -a 256 ~/Downloads/Atom-mac.zip
```

From 2.3.0, releases also carry a signed build attestation, where GitHub could make one. It states that the file came out of this repository's release workflow:

```sh
gh attestation verify ~/Downloads/Atom-mac.zip --repo Normansrule/atom
```

The Mac and Windows apps are not yet signed with a paid developer certificate, so each asks you to confirm the first launch. `SIGNING.md` says what that would take.

## Known and accepted

- `npm audit` reports a moderate advisory in `minimatch`, deep inside electron-builder. It is a build tool that runs on GitHub's machines against this repository's own file list; it is not part of any app Atom ships.
- The pages allow inline styles (`style-src 'unsafe-inline'`), because the drawings set sizes and colors on elements as they go. Styles cannot run code or make requests under this policy.
- A website cannot stop another site from showing it inside a frame without a server header, and GitHub Pages does not let a project set one. Atom has no accounts and no actions that spend or delete anything on a server, so a framed copy has nothing to trick you into.
