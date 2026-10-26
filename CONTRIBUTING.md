# Contributing

Thank you for helping. The most valuable contribution to Atom is a **correction**: a fact that is wrong, out of date, or misleading. Use the **Science correction** issue form and include a source.

## Reporting a problem

- **A science error:** open an issue with the *Science correction* form. Name the element or section, quote the text, and link a source.
- **A bug:** open an issue with the *Bug report* form. Say which browser or macOS version you use and what you expected to happen.

## How the project is put together

- `app/atom.html` is the whole app in one file, and the single source of truth. The website's physics, data, renderer, and table (`docs/assets/atom-*.js`) are generated from it by `scripts/sync-from-lab.sh`, so please propose changes to the app's content as issues rather than editing the generated files.
- `docs/` is the website, served by GitHub Pages. `docs/assets/site.js` and `site.css` are written by hand.
- `mac/` is a small Swift window around the app, built by `mac/build-mac-app.sh`.
- `desktop/` is the Windows and Linux app, an Electron window around the same file. `cd desktop && npm ci && npm start` runs it; `node build.mjs win` or `node build.mjs linux` packages it.

## Checking a change

```sh
cd docs && python3 -m http.server 8000          # then open http://localhost:8000
npm install --no-save playwright axe-core html-validate
npx playwright install chromium
npx html-validate docs/index.html docs/404.html
node scripts/smoke.mjs                           # every page loads, the self-test passes, no accessibility errors
```

The same checks run on every pull request, along with builds of the Mac app on a real Mac and of the Windows and Linux apps, each started and self-tested.

## Style

US English, plain words, sources for every claim, and no em dashes. Approximations say they are approximations.
