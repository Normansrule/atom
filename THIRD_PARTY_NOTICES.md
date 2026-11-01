# Third-party notices

## Typeface

**Archivo**, by Omnibus-Type (Héctor Gatti and the Archivo Project Authors).
Copyright 2020 The Archivo Project Authors (https://github.com/Omnibus-Type/Archivo).
Licensed under the SIL Open Font License, Version 1.1. The full license is in
[`docs/assets/fonts/OFL.txt`](docs/assets/fonts/OFL.txt), embedded in `app/atom.html`
beside the font, and shipped inside the Mac app as `Archivo-OFL.txt`.

## Desktop runtime (Windows and Linux)

The Windows and Linux apps are built with **Electron** (MIT License, https://www.electronjs.org), which includes **Chromium** and its third-party components under their own licenses. Every packaged app carries those licenses beside the program as `LICENSE.electron.txt` and `LICENSES.chromium.html`. The Mac app uses the WebKit that comes with macOS.

## Data

Atom uses published scientific values, cited in full (APA style) at the bottom of the website and in the app:

- Fundamental constants: CODATA 2022 recommended values (NIST).
- Quark masses and particle data: Particle Data Group, 2026 Review of Particle Physics.
- Spectral lines and first ionization energies: NIST Atomic Spectra Database.
- Electronegativities: Pauling's scale, the WebElements set (after Allred, 1961).
- Molecular geometries: NIST Computational Chemistry Comparison and Benchmark Database; covalent radii from Cordero et al. (2008).
- Standard atomic weights: IUPAC 2021.
- Nuclear masses: the 2020 Atomic Mass Evaluation (AME2020).
- Where each element was made: shares reconstructed after Johnson, J. A. (2019), *Populating the periodic table: Nucleosynthesis of the elements*, Science, 363(6426), 474-478, rounded to about a tenth.

Each frontier note on an element's card links to its own source.

## Formulas from published work

Two short published formulas are used in the renderers; both are implemented from the paper, not copied from any codebase.

- The color of each wavelength is computed from the CIE 1931 color-matching functions in the analytic multi-lobe fit of Wyman, C., Sloan, P.-P., & Shirley, P. (2013), *Simple analytic approximations to the CIE XYZ color matching functions*, Journal of Computer Graphics Techniques, 2(2), 1-11.
- The ray offsets in the electron-cloud renderer and the dither in the sky use interleaved gradient noise, after Jimenez, J. (2014), *Next generation post processing in Call of Duty: Advanced Warfare*, SIGGRAPH Advances in Real-Time Rendering course.

## Everything else

The code, text, drawings, and icons are original to Atom and released under the MIT License in [`LICENSE`](LICENSE).
