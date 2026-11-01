# Changelog

Atom follows [semantic versioning](https://semver.org). The newest release is at the top.

## [1.3.0] - 2026-10-31

Smoother, calmer, more real, and four new ways to explore: compare any two elements, color the table by its trends, walk the chart of every nucleus, and build molecules.

### A more real picture
- **The electron cloud is drawn smoother for less work.** Each ray now starts at an offset from an evenly spread pattern (interleaved gradient noise) instead of random noise, so the cloud shows no banding and no grain; and while the view holds still, frames are averaged, so each one can take fewer steps and the picture still converges to a smooth one. The cloud's core has a filmic shoulder, so the brightest lobes keep their shape and color instead of clipping to flat white.
- **A quality tier is picked at startup** from the graphics card's own name (nothing is fetched): software and low-power renderers start low, discrete and Apple parts high. The tier sets the ray steps, the buffer size, the sky's detail, and whether the living fields and film grain are on; the frame-time governor still moves within it. A **Quality** control (Auto, Low, Medium, High) sits under Show in the app and under the downloads on the website, says which tier Auto chose and for which card, and keeps your choice on your device. In a software renderer the website's cloud scene went from 151 to 46 ms a frame, the light scene from 125 to 35, the nucleus from 84 to 29, and the app's chamber from 107 to 63.
- **Every emission line is the color the eye would see:** computed from the CIE 1931 color-matching functions and mapped into the screen's gamut, so hydrogen's red is red, its blue-green is blue-green, and sodium's doublet is amber, in the spectrum, the rings around the atom, the light scene, and the Hear lab.
- **The sky has a filmic shoulder, dither, and grain:** a birth's white-hot core rolls off into warm white instead of clipping, the dark gas shows no banding on an 8-bit screen, and on the faster tiers a faint moving grain reads as film. On the high tier the nebula's filaments drift on the curl of a slow noise, the gluon field's glue swirls and tears, and each spectral line carries a faint bloom.
- **The nucleus has a glow and depth,** on the website and in the chamber: a soft halo behind it in the dark theme, and nucleons farther back shaded darker, so it reads as a ball and not a flat pile of discs.
- **The Build lab's atom is lit too:** nucleons are shaded spheres with contact shadows, and each electron is a small glowing sphere with a short trail along its orbit.
- **Molecules are lit:** spheres bright toward the light and dark at the far limb with a glint, bond rods colored half by each atom, a little perspective, and the shadow each nearer atom casts where it touches the next, which is what makes two spheres read as touching.

### Motion with mass
- **Springs instead of fixed curves:** the element card slides in, the table rescales, and lab tabs move on a damped spring that overshoots slightly and settles (browsers without `linear()` easing fall back to the old curve).
- **The atom has inertia:** the camera on the website and in the chamber is a damped spring toward where your hand put it, stepped by each frame's own length so it feels the same at any frame rate; letting go while moving flings it on; the chamber's zoom glides to where the wheel sent it instead of jumping.
- **The quark you pull has mass:** your hand holds it with a stiff spring while the string pulls back with the constant force of the linear potential, so it lags the pointer, overshoots when you stop, and shivers as the string nears breaking. A particle dragged into the Build lab follows on a spring and leans into its motion.
- Reduced motion keeps every one of these still, as before.
- On a phone the element numbers on the table are a point larger.
- In the chamber, the tip in the stage's corner steps aside while you pull a quark, so the quark's own label is never under it.
- The app screenshots on the website are retaken from this version.

### Smoother scrolling
- **The website and the app no longer stutter while you scroll.** The pictures used to resize their canvases almost every frame as they adjusted their own sharpness; now they change in a few fixed steps, at most twice a second, and step down quickly on a slow machine.
- Each frame reads the page's layout before it writes anything, writes a style only when it changes, and hides any full-screen layer with nothing on it. In the app, scrolling an element's card no longer lays out the page every frame, and the table and sky stand still while the labs cover them.
- On phones, the scenery is as tall as the largest screen, so the browser's toolbar sliding in and out no longer resizes it mid-scroll.
- **The website does less drawing.** The electron cloud is redrawn at half rate while the view holds still, the sky does the same once it settles, the quark field switches off below the scenes that use it, and an empty overlay is hidden instead of cleared. In a software renderer, the light scene went from 125 to 48 ms a frame, the nucleus from 89 to 42, and the labs from 37 to 17.

### Calmer to look at
- **The element card has five tabs** (Overview, Electrons, Nucleus, Origin, Future) instead of one long scroll. The tab you are reading stays open from element to element, and the Origins and Frontier lenses turn the card to Origin and Future.
- **The labs have five tabs** (Build, Explore, Predict, Experiment, You), with the labs inside Explore and Experiment on a rail beneath. The challenges in Build fold away with the next one always in view, and the atom's links sit with its name.
- **The website's first screen** keeps one filled button in the bar, drops the tiny compound under every square (the readout and card still have it), and lines up two quiet ways in under the table. On a phone the title, sentence, and readout are shorter, so the table comes into view sooner.
- **The app's top bar** keeps only Find, Today, Labs, the theme, and Open the chamber; the lenses moved under the title, as on the website.

### Nothing covers anything
- **The table's rows are evenly spaced** at every window size. The title, the lenses, and the element readout now fit the gap over the transition metals, stepping down to a compact layout in a smaller window, and a short laptop window scales the whole table so its top never slides under the bar.
- **What a lens means is written under the table**, next to its key, so the words over the table stay put when you switch lenses.
- **Missions moved into the top bar** (on a phone, under the table) instead of floating over the page, and the section guide on the right steps aside at the end of the page.
- On a phone, a section whose text is taller than the screen now scrolls like a page instead of pinning, so none of it is cut off.
- **In the app's chamber**, the readouts over the picture no longer cross in a smaller window, the sources line sits in the table's card instead of over its last row, and the picture keeps room to work in a short window.
- Every square on the app's table shows a clear focus ring when you move through it with the keyboard, as do the website's lens buttons, and the lenses, particle buttons, and text links in the labs respond when you point at them.

### New in the labs
- **A molecule** (in Build): add atoms, and real molecules snap into their measured 3D shapes, with molar mass, bond angle, lone pairs, bond polarity, and whether the whole molecule is polar. Water, carbon dioxide, methane, ammonia, boron trifluoride, hydrogen chloride, hydrogen, oxygen, nitrogen, and table salt, which is shown as the crystal of ions it is.
- **Compare** (in Explore): two elements side by side on thirteen properties, with a paragraph that reads the pair, including the cases that break the usual pattern. Every card has a **Compare it** button.
- **Trends** (in Explore): color the table by electronegativity, ionization energy, atomic radius, Slater's effective charge, density, melting or boiling point, mass, or crustal abundance, and graph any row or column.
- **Nuclides** (in Explore): the chart of the nuclides, colored by stability and decay mode, with the magic numbers marked and a close-up of the neighborhood you pick. Measured where Atom has measurements, and labeled as the liquid-drop model's estimate everywhere else.
- New data, cited: first ionization energies from the NIST Atomic Spectra Database, Pauling electronegativities, and molecular geometries from the NIST CCCBDB. The app's self-test now checks the chart against the Build lab for every nucleus and measures each molecule's angle off its own drawing.

### Fixes
- Polonium is listed as a post-transition metal, not an actinide.
- The app's web copy no longer squeezes the table to nothing in a narrow window; the card covers it instead.

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
