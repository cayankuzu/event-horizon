/** Exact CODATA 2018 / IAU 2015 physical & astronomical constants (SI units). */
export const CONSTANTS = {
  /** Speed of light in vacuum [m/s] (exact) */
  C: 299_792_458,
  /** Newtonian gravitational constant [m^3 kg^-1 s^-2] */
  G: 6.674_30e-11,
  /** Reduced Planck constant [J s] (exact) */
  HBAR: 1.054_571_817e-34,
  /** Boltzmann constant [J K^-1] (exact) */
  KB: 1.380_649e-23,
  /** Solar gravitational parameter GM_sun [m^3 s^-2] (IAU 2015 exact) */
  GM_SUN: 1.327_124_4e20,
  /** Solar mass [kg] */
  M_SUN: 1.988_47e30,
  /** Astronomical Unit [m] (IAU 2012 exact) */
  AU: 149_597_870_700,
  /** Julian light-year [m] */
  LIGHT_YEAR: 9.460_730_472_580_8e15,
  /** Standard Earth surface gravity [m/s^2] */
  G0: 9.806_65,
  /** NASA Space Shuttle Orbiter real fuselage length [m] */
  SHUTTLE_LENGTH_M: 37.24,
  /** Reference human astronaut height [m] */
  ASTRONAUT_HEIGHT_M: 2.0,
} as const;
