# Event Horizon (Olay Ufku) — General Relativity Black Hole Simulator

A real-time WebGL2 **General Relativity Kerr & Schwarzschild Black Hole Simulator** built with exact relativistic physics, HDR volumetric GRMHD accretion disk raytracing, real non-linear GPU Weyl spaghettification on NASA's public-domain 3D Space Shuttle Orbiter, and a plain-language + peer-reviewed scientific guide.

## Core Scientific & Visual Features

- **Exact 3D Null Geodesic Raytracing (`Symplectic Velocity-Verlet` + HDR Bloom + AgX Tonemapping):**
  - Integrates the 3D Schwarzschild/Kerr null geodesic equation per pixel with Kerr gravitomagnetic frame-dragging (reproducing Bardeen's asymmetric D-shaped shadow at $a^* \to 0.998$), `n=1` / `n=2` critical photon subrings, and gravitational Einstein lensing of the deep-space starfield.
  - Volumetric Novikov–Thorne accretion disk with Beer–Lambert dark dust lanes, Planck blackbody thermal palette, relativistic Doppler beaming ($I_{\mathrm{obs}} = g^4 I_{\mathrm{emit}}$), Blandford–Znajek polar jets ($P_{\mathrm{BZ}} \propto (a^*)^2$), 3D Flamm's Paraboloid + Kerr Ergosphere curvature funnel (`[G]`), and optional magnified Hawking quantum horizon glow.
- **True Non-Linear GPU Weyl Spaghettification & Stephen Hawking Observer Modes:**
  - Real NASA 3D Space Shuttle Orbiter (`Space Shuttle (D).glb`, self-hosted Draco WASM decoder) deformed non-linearly on the GPU via `onBeforeCompile` using exact $1/r^3$ radial stretching, transverse geodesic pinching, Kerr helical twist, tidal shear heating, gravitational redshift, and a 460-particle tidal disruption debris stream.
  - **3 Observer Reference Frames:** `HAWKING EXT.` (distant Schwarzschild observer: horizon time freeze & $I \propto e^{-c^3 t / 4GM}$ fade), `PROPER TIME (τ)` (Gullstrand–Painlevé interior plunge down to $r = 0.004\,r_s$), and `COCKPIT` (`[C]`).
- **4 Peer-Reviewed Real Black Holes:**
  - **Cygnus X-1** ($21.2\,M_\odot, a^* = 0.998$, Miller-Jones et al. 2021 *Science* — Hawking & Thorne's 1974 bet)
  - **Sagittarius A\*** ($4.297 \times 10^6\,M_\odot$, GRAVITY 2023 / EHT 2022)
  - **Messier 87\*** ($6.5 \times 10^9\,M_\odot$, EHT 2019 — 5,000-ly polar jet & gentle horizon tides)
  - **TON 618** ($4.07 \times 10^{10}\,M_\odot$, Shemmer et al. 2004 / Ge et al. 2019)
- **5 Graphics Quality Presets:** `LOW` · `MED` · `HIGH` · `ULTRA` · `AUTO` (adaptive FPS governor).
- **Bilingual (`TR | EN`) Plain-Language + Academic Monograph:** 10-chapter interactive guide with everyday analogies, live computed telemetry, KaTeX equations, clear separation between proven observations vs. open theoretical hypotheses, and 14 clickable peer-reviewed references.

## Local Development & Physics Benchmarks

```bash
npm install
npm run test   # Runs 12 exact Schwarzschild/Kerr/Hawking analytical unit tests
npm run dev    # Starts local Vite dev server on http://localhost:5173
npm run build  # Type-checks (tsc --noEmit) and builds production bundle
```

## Key Scientific References
- Einstein, A. (1915); Schwarzschild, K. (1916); Kerr, R. P. (1963) *PRL* 11, 237.
- Penrose, R. (1965) *PRL* 14, 57; Bardeen, Press & Teukolsky (1972) *ApJ* 178, 347.
- Novikov & Thorne (1973); Hawking, S. W. (1974) *Nature* 248, 30 & (1975) *CMP* 43, 199.
- Blandford & Znajek (1977) *MNRAS* 179, 433; Poisson & Israel (1990) *PRD* 41, 1796.
- James, von Tunzelmann, Franklin & Thorne (2015) *Class. Quantum Grav.* 32, 065001.
- Event Horizon Telescope Collaboration (2019, 2022); Miller-Jones et al. (2021) *Science*; Almheiri et al. (2020) *Rev. Mod. Phys.*
- 3D Spacecraft Asset: NASA 3D Resources (Public Domain).
