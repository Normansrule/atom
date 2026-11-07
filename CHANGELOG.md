# Changelog

Atom follows [semantic versioning](https://semver.org). The newest release is at the top.

## [1.6.0] - 2026-11-07

A release for the classroom: two new labs (electron energies and the Sun's light), a guide for teachers mapped to the standards, worksheets with answer keys, turn-in codes that need no accounts, a website that works with no connection at all, and tests that check Atom's numbers against outside data.

### New labs
- **Electron energies.** Photoelectron spectroscopy as a lab: one peak per subshell, as tall as the number of electrons in it, on a log scale from the core to the valence shell, for any element. **Mystery element** hides the name and asks you to read the configuration off the peaks. The energies are Slater's estimates and the lab says so; the pattern is the lesson.
- **The Sun.** The Sun's spectrum with its dark Fraunhofer lines. Pick an element and its measured lines (NIST) are laid over the Sun's; five of the candidates match and the lab tells you which lines, in which order they were found, and why helium, the Sun's second ingredient, shows no dark line at all.
- **Common mistakes.** Six questions in Predict about the things people get wrong: a nucleus a meter across and where the electrons would be, what an orbital is, where a proton's mass comes from, what binding energy does to a nucleus's mass, which electrons a transition metal loses first, and how much of an atom's mass is electrons. Each wrong choice is the common belief, and the explanation says why it is wrong.
- **Where the model breaks, drawn.** Trends draws Slater's estimate of the ionization energy as a dashed line against NIST's measured values, so the gap for p electrons is visible; step 7 of The math says the same in words.

### For teachers
- **A teacher guide** at `teachers.html`: a link for every lab, six twenty-minute activities with what to collect, how to collect work without accounts, and a table mapping each lab to NGSS (HS-PS1-1, HS-PS1-3, HS-PS1-8, HS-PS4-3, HS-ESS1-3) and AP Chemistry (1.5 to 1.8, Unit 2). Linked from the top bar and from the Get section.
- **Worksheets.** In The math, **Worksheet** prints the ten questions for the chosen element, with the answer key on its own last page.
- **Turn-in codes.** The You tab makes a one-line code with the date, the counts, which elements, and a check digit, and no name; **Read the codes** turns a class's codes into a table. Nothing is sent anywhere.
- **Progress travels.** **Save my progress** writes a small file and **Bring progress back** merges it in on another computer, for shared machines and carts.
- A ready-made challenge, `#challenge=A1.empty.6.w.Fe`, deals the six common-mistakes questions on iron in a fixed order; the challenge maker can build one from any elements and question types, Common mistakes included.

### The website
- **Works offline.** A service worker keeps the site after the first visit, so a Chromebook cart or an iPad keeps working when the Wi-Fi does not, and the site can be installed as an app from the browser. The cache is named for the release, and the smoke test refuses a release whose cache name disagrees with VERSION.
- **The bar stays one line** between 901 and 1180 px wide; before, the Missions button wrapped to three lines and the bar grew to 94 px.
- **In-page links land below the bar.** Elements, Labs, Tour, and Get Atom used to scroll their section's top under the fixed bar.
- **The labs' toast is never hidden.** Near the foot of the labs, the "Opened from a shared link" and "Badge earned" notices slid under the tour section; the labs now sit above it.
- The frontier notes on the neutron's lifetime and the thorium nuclear clock cite the newest work (J-PARC 2024; Nature 2026, two papers) and four sources join the list.

### Checks
- **Outside data.** The labs' self-test now checks the stored first ionization energies against NIST for eight elements, the liquid-drop formula against AME2020 (within 3 percent from oxygen-16 up, 9 percent or more off up to lithium-6), Slater's rules against the measured values (outer s within 25 percent at the median, every outer p up to radon at least twice too high), and that every common-mistakes question builds with exactly one right answer.
- **The app's HTML is validated** in CI along with the site's pages; 24 markup faults were fixed to get there (implicit button types, inline styles).
- The smoke test visits the teacher page, checks every lab link names a real lab, and reloads the site offline.

## [1.5.1] - 2026-11-04

The 1.5.0 release never published: its own checks caught a mistake of 1.5.0's, in every browser. Fixed here.

### Fixed
- **The "Today's element" button's spoken name did not contain its visible text.** 1.5.0 renamed the button from "Today" but left its accessible name as it was, so a screen reader and the screen disagreed, and the accessibility check failed. The name now begins with the visible words.
- The smoke test scrolls back to the top with everything loaded before its accessibility pass, so a mismatch in the table's bar is always seen, not only when timing happens to show it.
- The release workflow's WebKit check is advisory until it has been seen green once, as the push check's already was.

## [1.5.0] - 2026-11-03

A release for classrooms and for Safari: links to any lab, step, and element; a website that loads a third lighter and stays right without a graphics card; checks in Safari's engine on every push; and the fixes from a full audit, including five wrong numbers a student would have met.

### For teachers
- **A link to any lab.** `#lab=math&z=79&step=8` opens The math on gold at step 8; `#lab=compare&pair=79-47`, `#lab=nuclides&z=6&a=14`, `#lab=build&z=6&a=14`, `#lab=trends&prop=ie`, and `#lab=predict&z=26` work the same way. A **Copy link** button in The math makes one for whatever is on the screen. Bad values in a link are dropped, never run.
- **The math says when it is working on the ion.** Steps 4 to 6 use the one-electron ion (Fe²⁵⁺ for iron); a badge now says so where the eye lands, not only in the text.
- **Follow the table again.** Typing an element in The math used to stop it following the table for good; a **Follow the table** button brings it back.
- **A wrong answer gets a real hint.** Off by a factor of 1,000 or a million (a unit slip), the wrong sign, half or twice the answer, a factor of 4 (a square), the square or the root, within 12 percent, or far off: each gets its own sentence instead of "Not quite."
- Step 4's question at n = 8 no longer asks about the jump already on the screen.

### The website
- **A third lighter to start.** The labs are their own file now and arrive on their own when you scroll toward them, open a card, search, or follow a link; until then the first screen owes them nothing. Code and styles on first load went from 278 KB to 192 KB (gzipped).
- **The cloud still shows without a graphics card.** Where WebGL 2 is off, the cloud scene used to be an empty stage. It now draws the same Monte-Carlo sample of the orbital the sparkle comes from, 2,600 points shaded by depth, and it still turns under the hand.
- **The sky and the quark field come back after a graphics reset.** When the browser takes the graphics context away (a GPU reset, a tab left in the background) and returns it, both are rebuilt; before, they stayed blank until a reload. The electron clouds already recovered.
- **The sky rests while you read.** Below the descent (the labs, the questions, the downloads, the sources) it is drawn once and then left alone until the window, the theme, or the element changes, so reading costs the battery nothing.
- The card's four actions sit in two even columns; the picture-quality control looks like the buttons beside it; the step rail in The math is two rows of five that line up; a scrollable tab row fades at its edge so you can tell; on a phone, **Copy link** takes its own row.

### The apps
- The Mac app reloads a stopped page at most three times a minute, then asks, as the Windows and Linux apps already did. Developer tools are no longer in a released app's menu.

### Checks
- **Every push is now tested in Safari's engine (WebKit) and in Firefox** as well as Chromium. The Mac app and every iPhone and iPad run WebKit, and the text-selection bug below was WebKit-only. These two are advisory until they have been seen green once, then they become required.
- The website's checks run again at release time, so a tag can't publish a page that fails them.
- CI compares the site's generated files with the app they are cut from, and the release workflow gives write access only to the one job that publishes and pins the versions of its checkers.
- The labs' self-test adds two checks on links: a link reads back exactly, and bad values are dropped.

### Fixed
- The text-selection and audit fixes below, which were prepared as 1.4.1 and never published, ship here.
- **Pulling a quark or turning the atom no longer highlights the page's text.** A press on the stage that missed a quark fell through to the browser's drag-to-select, and Safari could start a selection even during a drag. The stage now keeps every press, the page can't be selected while something is held, and the same guard covers the app's chamber and the labs' canvases. The quarks are also easier to catch (the grab reaches past their drawn edge, further for a finger), the pointer only turns into a hand over a quark, and letting go after the string snaps always releases the cursor.
- **On a phone, the quark scene scrolls like the rest of the page** unless your finger lands on a quark. Before, half the screen there ignored swipes.
- **Hydrogen no longer has a negative binding energy** in The math, step 9. The liquid-drop formula fails for the lightest nuclei (it gives −25.8 MeV for a single proton), so the step now shows the formula's answer, says when it fails, and uses the measured binding energy (AME2020) wherever Atom has one. A lone proton binds nothing, so its value is 0, and step 10's nucleus mass follows.
- **Palladium's outer electron is its 4d,** the one atom with no s electron in its outer shell. Steps 1 to 3 and 7, Compare, and Trends used a 4s or 4p electron instead and showed an estimate of hundreds of electron-volts.
- **Electric against gravity** in step 1 now uses the gravity of the whole nucleus, not one proton, so the ratio is right (for iron, about 1.5 × 10³⁸ rather than 8 × 10³⁹).
- **The proton's mass budget** now gives Yang et al.'s figures (32, 36, 23, and 9 percent, summing to 100) and explains why the quark-mass share (9%) is bigger than the three quarks' 1%: it also counts the short-lived quark pairs inside. Step 10 now says a nucleon's mass is the energy of the quarks' motion and the gluon field, rather than calling it binding energy, and uses the down-quark mass of 4.70 MeV, as the app's quark depth already did.
- **Clearer wording:** hydrogen and helium get their own sentences in steps 1 and 7 (hydrogen has no inner electrons, and it is the one atom solved exactly); step 1 says when a radius is estimated rather than measured (past curium); the phase of a single state turns at one rate across the whole cloud; antihydrogen falls down to within about 20%; and the strong CP sentence says what is measured.
- Two "Try it" questions asked for a number already on the screen. Step 7 now asks for the estimate without Slater's n*, and step 10 asks what one more neutron adds.
- Typing a word like "constructor" where an element goes no longer throws an error.

### Checks, from the audit
- The labs' self-test adds three checks: palladium's outer electron is 4d and every other element's is s or p; the liquid-drop formula fails for hydrogen and deuterium and the measured values shown instead are right; and words that are not elements are not read as elements.
- The smoke test (and so every push to GitHub) now runs the labs' self-test and every step of The math for hydrogen, helium, iron, palladium, gold, and oganesson, and fails on NaN, undefined, or a negative binding energy. Run against 1.4.0, it catches the hydrogen bug.

## [1.4.0] - 2026-11-01

A new lab, **The math**: pick any element and work through the physics of its atom in ten steps, classical and quantum, with that element's own numbers.

### The math
- **Ten steps from the outside in.** Coulomb's pull on the outer electron, a planet-like orbit, and why that orbit can't last; then Bohr's rule, de Broglie's matter waves, Schrödinger's orbitals, and Slater's shielding in a real many-electron atom; then relativity near a heavy nucleus, the nucleus and its binding energy, and the quarks and strong force inside each nucleon.
- **Every number is the element you picked.** Its effective charge, its measured radius and ionization energy, its most common isotope, and the liquid-drop coefficients Atom uses everywhere else. The one-electron steps use the element's hydrogen-like ion (for iron, Fe²⁵⁺) and say so.
- **Equations in proper notation.** Each one is written in MathML, so it reads as math, scales with the text, and can be spoken by a screen reader, with a line beneath that substitutes the numbers and gives the result.
- **Pictures that move with your inputs.** The pull and orbit at any distance; the spiral collapse of a classical electron; Bohr's orbits with a jump and the light it gives off, in its true color; a wave around the loop that cancels itself when the count isn't whole; a slice through any orbital (n, l, m) with its sign in two colors, and a mix of two that sloshes at exactly the frequency of the light; the shells with the electrons that shield; the speed of the innermost electron against Z, with the break at 137; the packed nucleus with its five binding terms as bars; and three quarks joined by gluons beside the electric and strong forces between two protons.
- **Try it, with the working shown.** Each step asks a question you can only answer by using the step's idea (the pull at twice the distance, the wavelength from another jump, the number of nodes in a bigger orbital), checks your number, and shows the worked answer on request.
- **Where each picture stops being right** is stated at the end of every step.
- The labs now have six tabs; the arrow keys move across all six, and on a narrow screen the ten steps shrink to numbers with the current step named.
- The labs' self-test now also checks that the shielding shown term by term adds up to Atom's effective charge for every element and subshell, that the orbitals are normalized and have n − l − 1 spherical nodes, that Bohr's lines match the Calculate lab's, that a classical hydrogen atom collapses in about 16 picoseconds, that the five binding terms add up to Atom's binding energy, and that Yukawa's range and gold's 1s speed come out right.
- Nine primary sources added to the list: Rutherford (1911), Bohr (1913), de Broglie (1925), Schrödinger (1926), Dirac (1928), Yukawa (1935), Larmor (1897), Pyykkö (1988) on relativity in gold, and Greiner, Müller, and Rafelski (1985) on fields past Z = 137.

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
