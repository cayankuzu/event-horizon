import { CONSTANTS } from './constants';
import { BlackHolePreset } from './blackHoles';

export type RelativisticZone =
  | 'DEEP_SPACE'
  | 'LENSING'
  | 'ISCO'
  | 'PHOTON_SPHERE'
  | 'ERGOSPHERE'
  | 'HORIZON'
  | 'INTERIOR';

export type CrewTidalStatus = 'SAFE' | 'ELEVATED' | 'CRITICAL' | 'SPAGHETTIFICATION';

export interface KerrRadii {
  /** Outer event horizon r_+ in units of r_s (0.5 for a*=1, 1.0 for a*=0) */
  rPlusRs: number;
  /** Inner Cauchy horizon r_- in units of r_s (0.5 for a*=1, 0.0 for a*=0) */
  rMinusRs: number;
  /** Equatorial ergosphere static limit in units of r_s (always 1.0 at equator) */
  rErgoEqRs: number;
  /** Prograde equatorial photon orbit in units of r_s (1.5 for a*=0, 0.5 for a*=1) */
  rPhotonProRs: number;
  /** Retrograde equatorial photon orbit in units of r_s (1.5 for a*=0, 2.0 for a*=1) */
  rPhotonRetroRs: number;
  /** Prograde ISCO in units of r_s (3.0 for a*=0, 0.5 for a*=1) */
  rIscoProRs: number;
  /** Retrograde ISCO in units of r_s (3.0 for a*=0, 4.5 for a*=1) */
  rIscoRetroRs: number;
  /** Critical shadow impact parameter b_crit in units of r_s (~2.598 for Schwarzschild) */
  bCritRs: number;
}

export interface ObserverTelemetry {
  /** Dimensionless radial coordinate r / r_s */
  rInRs: number;
  /** Physical Schwarzschild radius r_s [m] */
  rsMeters: number;
  /** Physical distance r [m] */
  distanceMeters: number;
  /** Kerr characteristic radii (in units of r_s) */
  radii: KerrRadii;
  /** Whether observer is inside the outer event horizon (r <= r_+) */
  insideHorizon: boolean;
  /** Static gravitational time dilation factor dτ / dt in [0, 1] (0 inside horizon) */
  staticTimeDilation: number;
  /** Distant Earth seconds elapsed per 1 ship proper second (Infinity at/inside r_+) */
  earthSecondsPerShipSecond: number;
  /** Gravitational redshift z = (dτ/dt)^-1 - 1 (Infinity at/inside r_+) */
  gravitationalRedshift: number;
  /** Exact Gullstrand-Painlevé radial free-fall velocity v/c = sqrt(r_s / r) */
  freeFallBeta: number;
  /** Effective Lorentz orbital velocity for prograde circular orbit */
  keplerOrbitalBeta: number;
  /** Frame-dragging angular velocity ω [rad/s] at equator */
  frameDragOmegaRadS: number;
  /** Frame-dragging linear velocity v_fd / c at equator */
  frameDragBeta: number;
  /** Remaining proper time to singularity τ_sing [s] in radial free-fall */
  properTimeToSingularitySec: number;
  /** Radial tidal stretching acceleration across a 2m human [in Earth g] */
  tidalHumanG: number;
  /** Radial tidal stretching acceleration across the 37.24m Shuttle hull [in Earth g] */
  tidalShuttleG: number;
  /** Coordinate-independent Kretschmann curvature scalar K = 48 G^2 M^2 / (c^4 r^6) [m^-4] */
  kretschmannScalarM4: number;
  /** Kerr horizon surface gravity κ [m/s^2] */
  surfaceGravityMs2: number;
  /** Stephen Hawking distant-observer horizon luminosity fade timescale τ_fade = 4GM/c^3 [s] */
  horizonFadeTauSec: number;
  /** Log10 of Hawking complete evaporation lifetime [years] (t_evap = 5120 π G^2 M^3 / ħ c^4) */
  log10HawkingEvapYears: number;
  /** Crew structural survivability tier */
  tidalStatus: CrewTidalStatus;
  /** True when Shuttle tidal pull exceeds structural yield (~120 g) causing tidal debris stripping */
  tidalDisruptionActive: boolean;
  /** Hawking temperature T_H [K] (Kerr surface-gravity adjusted) */
  hawkingTempK: number;
  /** Log10 of dimensionless Bekenstein-Hawking entropy S_BH / k_B */
  log10Entropy: number;
  /** Local Eddington-Finkelstein future light cone tilt [degrees] (0 = flat, 45 = horizon) */
  lightConeTiltDeg: number;
  /** Active relativistic regime */
  zone: RelativisticZone;
}

/**
 * Exact Schwarzschild radius r_s = 2 G M / c^2 [meters].
 */
export function schwarzschildRadiusMeters(massSolar: number): number {
  return (2 * massSolar * CONSTANTS.GM_SUN) / (CONSTANTS.C * CONSTANTS.C);
}

/**
 * Exact Kerr metric characteristic radii (Bardeen 1972; Bardeen, Press & Teukolsky 1972).
 * Returned in dimensionless units of Schwarzschild radius r_s = 2 M_g.
 */
export function computeKerrRadii(spinInput: number): KerrRadii {
  const a = Math.max(0, Math.min(0.999999, spinInput));
  const sq = Math.sqrt(Math.max(0, 1 - a * a));

  const rPlusRs = 0.5 * (1 + sq);
  const rMinusRs = 0.5 * (1 - sq);
  const rErgoEqRs = 1.0;

  const rPhotonProRs = 1 + Math.cos((2 / 3) * Math.acos(-a));
  const rPhotonRetroRs = 1 + Math.cos((2 / 3) * Math.acos(a));

  const z1 = 1 + Math.cbrt(1 - a * a) * (Math.cbrt(1 + a) + Math.cbrt(1 - a));
  const z2 = Math.sqrt(3 * a * a + z1 * z1);
  const rootTerm = Math.sqrt(Math.max(0, (3 - z1) * (3 + z1 + 2 * z2)));
  const rIscoProRs = 0.5 * (3 + z2 - rootTerm);
  const rIscoRetroRs = 0.5 * (3 + z2 + rootTerm);

  const bCritRs = (3 * Math.sqrt(3)) / 2;

  return {
    rPlusRs,
    rMinusRs,
    rErgoEqRs,
    rPhotonProRs,
    rPhotonRetroRs,
    rIscoProRs,
    rIscoRetroRs,
    bCritRs,
  };
}

/**
 * Exact Schwarzschild Hawking temperature T_H = (ħ c^3) / (8 π G M k_B) [K].
 */
export function hawkingTemperatureKelvin(massSolar: number): number {
  const gm = massSolar * CONSTANTS.GM_SUN;
  return (CONSTANTS.HBAR * Math.pow(CONSTANTS.C, 3)) / (8 * Math.PI * gm * CONSTANTS.KB);
}

/**
 * Exact Kerr horizon surface gravity κ = c^4 sqrt(1 - a*^2) / (2 G M (1 + sqrt(1 - a*^2))) [m/s^2].
 * Reduces to c^4 / (4 G M) = c^2 / (2 r_s) for Schwarzschild (a* = 0).
 */
export function kerrSurfaceGravityMs2(massSolar: number, spinInput: number): number {
  const a = Math.max(0, Math.min(0.999999, spinInput));
  const sq = Math.sqrt(Math.max(0, 1 - a * a));
  const gm = massSolar * CONSTANTS.GM_SUN;
  return (Math.pow(CONSTANTS.C, 4) * sq) / (2 * gm * (1 + sq));
}

/**
 * Log10 of Hawking total evaporation lifetime in Julian years:
 * t_evap = (5120 π G^2 M^3) / (ħ c^4).
 */
export function log10HawkingEvaporationYears(massSolar: number): number {
  // Use log arithmetic to prevent float64 overflow for 10^10 M_sun ultramassive black holes!
  const gm = massSolar * CONSTANTS.GM_SUN;
  const massKg = gm / CONSTANTS.G;
  const secPerYear = 365.25 * 86400;
  const log10Num =
    Math.log10(5120 * Math.PI) + 2 * Math.log10(CONSTANTS.G) + 3 * Math.log10(massKg);
  const log10Den =
    Math.log10(CONSTANTS.HBAR) + 4 * Math.log10(CONSTANTS.C) + Math.log10(secPerYear);
  return log10Num - log10Den;
}

/**
 * Exact Kretschmann curvature invariant K = R_{μνρσ} R^{μνρσ} = 12 r_s^2 / r^6 [m^-4].
 * Coordinate-independent proof that r = r_s is smooth while r -> 0 is a true curvature singularity.
 */
export function kretschmannScalarM4(rsMeters: number, rMeters: number): number {
  const rSafe = Math.max(1, rMeters);
  return (12 * rsMeters * rsMeters) / Math.pow(rSafe, 6);
}

/**
 * Log10 of dimensionless Bekenstein-Hawking entropy S_BH / k_B = A / (4 l_P^2),
 * where A = 4 π (r_+^2 + a^2) = 8 π M_g r_+.
 */
export function log10BekensteinHawkingEntropy(massSolar: number, spin: number): number {
  const rs = schwarzschildRadiusMeters(massSolar);
  const mg = 0.5 * rs;
  const radii = computeKerrRadii(spin);
  const rPlus = radii.rPlusRs * rs;
  const area = 8 * Math.PI * mg * rPlus;
  const planckLengthSq = (CONSTANTS.HBAR * CONSTANTS.G) / Math.pow(CONSTANTS.C, 3);
  return Math.log10(area / (4 * planckLengthSq));
}

/**
 * Exact Flamm's Paraboloid isometric embedding height z(r) = 2 sqrt(r_s (r - r_s))
 * in units of r_s (returns 0 inside horizon r <= r_s).
 */
export function flammParaboloidZInRs(rInRs: number): number {
  if (rInRs <= 1) return 0;
  return 2 * Math.sqrt(rInRs - 1);
}

/**
 * Exact Weyl curvature tidal radial stretching acceleration Δa = (2 G M / r^3) Δh [m/s^2].
 */
export function radialTidalAccelMs2(massSolar: number, rMeters: number, deltaHeightM: number): number {
  const gm = massSolar * CONSTANTS.GM_SUN;
  const rClamped = Math.max(1, rMeters);
  return ((2 * gm) / Math.pow(rClamped, 3)) * deltaHeightM;
}

/**
 * Computes full live General Relativity observer telemetry at radius r (in units of r_s).
 */
export function computeObserverTelemetry(
  preset: BlackHolePreset,
  spinInput: number,
  rInRs: number
): ObserverTelemetry {
  const spin = Math.max(0, Math.min(0.998, spinInput));
  const rsMeters = schwarzschildRadiusMeters(preset.massSolar);
  const mgMeters = 0.5 * rsMeters;
  const radii = computeKerrRadii(spin);
  const rSafe = Math.max(0.003, rInRs);
  const distanceMeters = rSafe * rsMeters;
  const insideHorizon = rSafe <= radii.rPlusRs + 1e-4;

  const rM = rSafe * 2;
  const a = spin;
  const delta = rM * rM - 2 * rM + a * a;

  const denomZamo = Math.pow(rM * rM + a * a, 2) - a * a * delta;
  const staticTimeDilation =
    !insideHorizon && delta > 0 && denomZamo > 0
      ? Math.sqrt(Math.max(0, (rM * rM * delta) / denomZamo))
      : 0;

  const earthSecondsPerShipSecond =
    staticTimeDilation > 1e-5 ? 1 / staticTimeDilation : Number.POSITIVE_INFINITY;
  const gravitationalRedshift =
    staticTimeDilation > 1e-5 ? 1 / staticTimeDilation - 1 : Number.POSITIVE_INFINITY;

  const freeFallBeta = Math.sqrt(1 / rSafe);
  const keplerOrbitalBeta =
    rSafe >= radii.rPhotonProRs
      ? Math.min(0.9999, 1 / (Math.sqrt(rM) + a / Math.max(0.5, rM)))
      : 1;

  const omegaDimless = denomZamo > 0 ? (2 * a * rM) / denomZamo : 0;
  const frameDragOmegaRadS = (omegaDimless * CONSTANTS.C) / mgMeters;
  const frameDragBeta = Math.min(0.999, omegaDimless * Math.sqrt(rM * rM + a * a));

  const properTimeToSingularitySec = (2 / 3) * (rsMeters / CONSTANTS.C) * Math.pow(rSafe, 1.5);

  const tidalHumanG =
    radialTidalAccelMs2(preset.massSolar, distanceMeters, CONSTANTS.ASTRONAUT_HEIGHT_M) / CONSTANTS.G0;
  const tidalShuttleG =
    radialTidalAccelMs2(preset.massSolar, distanceMeters, CONSTANTS.SHUTTLE_LENGTH_M) / CONSTANTS.G0;

  const kretschmann = kretschmannScalarM4(rsMeters, distanceMeters);
  const surfaceGravityMs2 = kerrSurfaceGravityMs2(preset.massSolar, spin);
  const horizonFadeTauSec = (2 * rsMeters) / CONSTANTS.C; // 4 G M / c^3
  const log10HawkingEvapYears = log10HawkingEvaporationYears(preset.massSolar);

  let tidalStatus: CrewTidalStatus = 'SAFE';
  if (tidalHumanG >= 25 || tidalShuttleG >= 450) tidalStatus = 'SPAGHETTIFICATION';
  else if (tidalHumanG >= 5 || tidalShuttleG >= 90) tidalStatus = 'CRITICAL';
  else if (tidalHumanG >= 0.5 || tidalShuttleG >= 10) tidalStatus = 'ELEVATED';

  const tidalDisruptionActive = tidalShuttleG >= 120;

  const lightConeTiltDeg = Math.atan(radii.rPlusRs / rSafe) * (180 / Math.PI);

  let zone: RelativisticZone = 'DEEP_SPACE';
  if (insideHorizon) {
    zone = rSafe > radii.rPlusRs * 0.84 ? 'HORIZON' : 'INTERIOR';
  } else if (rSafe <= radii.rErgoEqRs + 0.04 && spin > 0.15) {
    zone = 'ERGOSPHERE';
  } else if (rSafe <= radii.rPhotonProRs + 0.25) {
    zone = 'PHOTON_SPHERE';
  } else if (rSafe <= Math.max(radii.rIscoProRs + 0.4, 3.2)) {
    zone = 'ISCO';
  } else if (rSafe <= 14) {
    zone = 'LENSING';
  }

  return {
    rInRs: rSafe,
    rsMeters,
    distanceMeters,
    radii,
    insideHorizon,
    staticTimeDilation,
    earthSecondsPerShipSecond,
    gravitationalRedshift,
    freeFallBeta,
    keplerOrbitalBeta,
    frameDragOmegaRadS,
    frameDragBeta,
    properTimeToSingularitySec,
    tidalHumanG,
    tidalShuttleG,
    kretschmannScalarM4: kretschmann,
    surfaceGravityMs2,
    horizonFadeTauSec,
    log10HawkingEvapYears,
    tidalStatus,
    tidalDisruptionActive,
    hawkingTempK: hawkingTemperatureKelvin(preset.massSolar),
    log10Entropy: log10BekensteinHawkingEntropy(preset.massSolar, spin),
    lightConeTiltDeg,
    zone,
  };
}

/**
 * Novikov-Thorne relativistic thin accretion disk temperature ratio T(r)/T_max.
 */
export function novikovThorneTempRatio(rInRs: number, rIscoRs: number): number {
  if (rInRs <= rIscoRs) return 0;
  const x = rIscoRs / rInRs;
  const raw = Math.pow(rIscoRs / rInRs, 0.75) * Math.pow(Math.max(0, 1 - Math.sqrt(x)), 0.25);
  return Math.min(1, raw * 2.05);
}

/**
 * Converts physical blackbody temperature [K] to sRGB [0..1].
 */
export function blackbodyKelvinToRgb(kelvin: number): [number, number, number] {
  const t = Math.max(1000, Math.min(40000, kelvin)) / 100;
  let r: number;
  let g: number;
  let b: number;

  if (t <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(t) - 161.1195681661;
    b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0448;
  } else {
    r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
    b = 255;
  }

  return [
    Math.max(0, Math.min(1, r / 255)),
    Math.max(0, Math.min(1, g / 255)),
    Math.max(0, Math.min(1, b / 255)),
  ];
}

export function formatPhysicalDistance(meters: number): string {
  const au = meters / CONSTANTS.AU;
  if (au >= 0.2) {
    return au >= 100 ? `${au.toFixed(0)} AU` : `${au.toFixed(2)} AU`;
  }
  const km = meters / 1000;
  if (km >= 1e6) return `${(km / 1e6).toFixed(2)}M km`;
  if (km >= 1e3) return `${(km / 1e3).toFixed(1)}k km`;
  if (km >= 10) return `${km.toFixed(1)} km`;
  return `${km.toFixed(2)} km`;
}

export function formatDurationSec(sec: number, lang: 'tr' | 'en'): string {
  if (!Number.isFinite(sec)) return '∞';
  if (sec < 1e-3) return `${(sec * 1e6).toFixed(1)} µs`;
  if (sec < 1) return `${(sec * 1e3).toFixed(1)} ms`;
  if (sec < 120) return `${sec.toFixed(2)} ${lang === 'tr' ? 'sn' : 's'}`;
  const mins = sec / 60;
  if (mins < 120) return `${mins.toFixed(1)} ${lang === 'tr' ? 'dk' : 'min'}`;
  const hrs = mins / 60;
  if (hrs < 48) return `${hrs.toFixed(1)} ${lang === 'tr' ? 'sa' : 'hr'}`;
  return `${(hrs / 24).toFixed(1)} ${lang === 'tr' ? 'gün' : 'd'}`;
}

export function formatTidalG(g: number): string {
  if (g < 1e-4) return `${g.toExponential(1).replace('e+', 'e')} g`;
  if (g < 0.01) return `${g.toFixed(4)} g`;
  if (g < 10) return `${g.toFixed(2)} g`;
  if (g < 10_000) return `${g.toFixed(0)} g`;
  return `${g.toExponential(1).replace('e+', 'e')} g`;
}

export function formatScientificExp(val: number): string {
  if (val === 0) return '0';
  const exp = Math.floor(Math.log10(Math.abs(val)));
  const mant = val / Math.pow(10, exp);
  return `${mant.toFixed(2)}×10^${exp}`;
}
