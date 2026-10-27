# Changelog

Atom follows [semantic versioning](https://semver.org). The newest release is at the top.

## [1.2.0] - 2026-10-26

More to do in the labs, a way for teachers to share them, and a round of fixes from an independent review of every sentence and calculation.

### New in the labs
- **Orbital boxes** (in Build): fill an element's electrons by hand and check them against the Aufbau principle, the Pauli exclusion principle, and Hund's rule, exceptions such as chromium and copper included.
- **Predict** asks fifteen kinds of questions, up from nine: valence electrons, the ions elements form, where they were made, which was discovered first, how common they are in Earth's crust, and naming an element from its configuration.
- **Guess by ear** (in Hear): a mystery element's light as a chord, and four names to choose from. Tones are now exactly 40 octaves below the light, so each chord keeps the light's real proportions.
- **Ions show their own electrons:** iron(II) is [Ar] 3d⁶, because a positive ion gives up its outermost (4s) electrons first.
- Slow primordial isotopes, such as tellurium-130 and indium-115, get their real half-lives and decay modes, and elements with no stable isotope point to their longest-lived one.

### Teaching and sharing
- **Challenges:** pick elements, a number of questions, and the kinds of questions, then share a link or a short code. Everyone who opens it gets the same questions in the same order, then a score, what they missed, and a page to print. Nothing is collected; the questions are rebuilt from the code itself.
- **Share this atom:** a link that opens the atom you built in someone else's Build lab.
- **Print my progress:** a one-page summary of what you have explored, built, and mastered, with badges and challenge scores. The Mac app gains File > Print, and both desktop apps' Edit menus gain Undo, Cut, and Paste for the labs' text fields.
- Three new badges, eighteen in all.

### Fixes from the review
- Nuclei with too few neutrons were sometimes described as having too many; boron-9 is now correctly unbound.
- Configurations typed without spaces (1s22s22p4) or in superscripts are read correctly.
- Hear plays electrons in the order they fill (4s before 3d).
- Ion names only at their usual charge ("an oxide ion" is O²⁻), with "a" and "an" right.
- The melting-point question skips elements that sublime or whose values are only predicted, and its hint matches how it grades; negative answers can be typed on phones.
- The block question uses the elements tables agree on, and atom-size questions use only measured radii.
- Missions notice a step you have already done, keep the focus on Show me, and announce each new step.
- The labs follow the element you pick on the table, a second window shares your progress, and erasing progress asks first, in the page.
- Particle buttons keep their names on phones, and the Build lab tells a screen reader one short summary once you stop clicking.

## [1.1.0] - 2026-10-26

Learn it by doing it. Atom now opens on the table and six hands-on labs, with the scroll-down descent kept as an optional guided tour.

### Labs
- **Build:** put an atom together from protons, neutrons, and electrons by clicking, typing, or dragging. It names the element, isotope, and ion, draws the nucleus and the shells, and says whether the nucleus lasts, which way it decays, or whether it falls apart at once. The lightest nuclei use measured limits (oxygen-24 is the heaviest oxygen that holds together); estimates are labeled as estimates. Eight challenges.
- **Predict:** questions with typed or chosen answers and an explanation every time. Missed questions come back on a widening schedule; three different right answers about an element masters it.
- **Calculate:** an electron's light between any two levels, radioactive decay with presets and a Geiger counter, E = mc² with real comparisons, and the molar mass of any formula you type.
- **Workbench:** the fusion, bond, and battery experiments, now one of the labs.
- **Hear:** an element's visible spectrum played as a chord, and its electrons filling their shells as a melody. Sound plays only when you press Play.
- **You:** today's element and its three tasks, your own table of explored, built, and mastered elements, questions due for review, days in a row, and fifteen badges.

### Exploring
- Every element card has a "try it" row: build it, quiz yourself on it, or hear its light, with your progress on that element.
- A fourth lens, **Yours**, marks what you have explored, built, and mastered.
- **Find an element** by name, symbol, or atomic number, from anywhere on the page.
- Four new missions start the route: build an atom, read the light, weigh a molecule, and date a bone. Sixteen in all.
- Colors by meaning: each lab has its own, and protons, neutrons, and electrons keep theirs everywhere.

### Under the hood
- The labs check their own arithmetic in the app's self-test: molar masses, hydrogen's lines, which nuclei hold together, configurations, and half-lives.
- Typing in a text box no longer triggers the app's keyboard shortcuts.
- Every label in the labs measured at 7:1 contrast or better in both themes; layout, keyboard, and accessibility checks pass.

## [1.0.0] - 2026-10-25

The first public release: on the web, and as a free, open-source desktop app for macOS, Windows, and Linux.

### The table
- A living periodic table: each of the 118 squares ray-marches its element's differentiating electron on your graphics card, straight from the wavefunction.
- A sky made of the elements' origins: a nebula colored by the Big Bang, cosmic rays, merging neutron stars, exploding massive stars, dying low-mass stars, exploding white dwarfs, and laboratories, which replays the birth of whatever element you pick.
- Three lenses: Shapes, Origins (after Johnson, 2019), and Frontier (eleven fields, from fusion energy to medicine).
- A card for every element: configuration, Hund's-rule boxes, Slater's effective charge, the nucleus and the semi-empirical mass formula, spectra, where it was made, what it is building now with a source, and an open problem.

### The fall
- Scroll into any element: its cloud, its light, the empty space inside it, its nucleus, a proton, and the quarks, where you can pull one out until the string snaps.

### Learning by doing
- A workbench: fuse nuclei (with Q values, the Coulomb barrier, and Gamow tunneling), bond two protons around one electron, and build a battery from real electrode materials.
- Twelve missions on a route map, from lighting a star to fighting cancer with atoms, with a Show me button on every step. Progress stays on your device.

### Everywhere
- A website that runs in any modern browser, with nothing to install.
- Desktop apps: macOS 12 or later (Apple silicon and Intel), Windows 10 and 11 (installer or portable zip), and Linux (AppImage, or a .deb for Debian and Ubuntu).
- Every download listed with its SHA-256 checksum.

### For everyone
- Every label measured at 7:1 contrast or better in both themes, keyboard operation throughout, reduced motion respected, and no sound until you ask for it.
- No accounts, no tracking, and no network requests: everything runs from the page itself.
