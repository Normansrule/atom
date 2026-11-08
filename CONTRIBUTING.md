# Contributing

Thank you for helping. The most valuable contribution to Atom is a **correction**: a fact that is wrong, out of date, or misleading. Use the **Science correction** issue form and include a source.

## Reporting a problem

- **A science error:** open an issue with the *Science correction* form. Name the element or section, quote the text, and link a source.
- **A bug:** open an issue with the *Bug report* form. Say which browser or macOS version you use and what you expected to happen.
- **A translation that reads wrong:** every sentence is one line in `app/i18n/es.js` (or the pack for that language); a corrected line is a one-line pull request. Keep the `{placeholders}`, the tags, and the `{n, plural, …}` forms as they are, and run the check below.
- **A classroom pilot:** after you have used Atom with a class, the *Classroom report* form asks six questions about the software and none about students.

## How the project is put together

- `app/atom.html` is the whole app in one file, and the single source of truth. The website's physics, data, renderer, and table (`docs/assets/atom-*.js`) are generated from it by `scripts/extract-site.sh` (which `scripts/sync-from-lab.sh` runs after copying the app in from the private workspace it is developed in, so a change made only to `app/atom.html` here is overwritten by the next sync), so please propose changes to the app's content as issues rather than editing the generated files.
- `docs/` is the website, served by GitHub Pages. `docs/assets/site.js` and `site.css` are written by hand.
- `mac/` is a small Swift window around the app, built by `mac/build-mac-app.sh`.
- `desktop/` is the Windows and Linux app, an Electron window around the same file. `cd desktop && npm ci && npm start` runs it; `node build.mjs win` or `node build.mjs linux` packages it.
- `app/i18n/` holds the language packs, one file per language; `i18n/en.catalog.json` is every English string the pages contain, and `scripts/i18n/` extracts it and checks each pack against it. A pack is the only thing a new language needs.

## Checking a change

```sh
cd docs && python3 -m http.server 8000          # then open http://localhost:8000
npm install --no-save playwright axe-core html-validate
npx playwright install chromium
npx html-validate docs/index.html docs/404.html docs/teachers.html docs/handout.html app/atom.html
node scripts/smoke.mjs                           # every page loads, in English and Spanish, the self-test passes, no accessibility errors
python3 scripts/i18n/i18n_tool.py extract .      # the catalog must come out unchanged
python3 scripts/i18n/i18n_tool.py check . app/i18n/es.js   # missing 0, stale 0, problems 0
```

The same checks run on every pull request, along with builds of the Mac app on a real Mac and of the Windows and Linux apps, each started and self-tested.

## Style

US English, plain words, sources for every claim, and no em dashes. Approximations say they are approximations.
