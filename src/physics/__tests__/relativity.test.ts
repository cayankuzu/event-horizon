import { describe, expect, it } from 'vitest';
import { BLACK_HOLE_MAP } from '../blackHoles';
import {
  computeKerrRadii,
  computeObserverTelemetry,
  flammParaboloidZInRs,
  hawkingTemperatureKelvin,
  kretschmannScalarM4,
  log10HawkingEvaporationYears,
  novikovThorneTempRatio,
  schwarzschildRadiusMeters,
} from '../relativity';

describe('General Relativity Physics Benchmarks (Schwarzschild & Kerr)', () => {
  it('computes exact solar Schwarzschild radius r_s(M_sun) ≈ 2953.25 m', () => {
    const rsSun = schwarzschildRadiusMeters(1);
    expect(rsSun).toBeCloseTo(2953.25, 1);
  });

  it('matches Sagittarius A* GRAVITY 2023 Schwarzschild radius (~1.269×10^10 m)', () => {
    const rsSgrA = schwarzschildRadiusMeters(BLACK_HOLE_MAP.sgr_a.massSolar);
    expect(rsSgrA / 1e10).toBeCloseTo(1.269, 2);
  });

  it('reproduces exact Schwarzschild characteristic radii at a* = 0', () => {
    const r = computeKerrRadii(0);
    expect(r.rPlusRs).toBeCloseTo(1.0, 6);
    expect(r.rMinusRs).toBeCloseTo(0.0, 6);
    expect(r.rPhotonProRs).toBeCloseTo(1.5, 6);
    expect(r.rPhotonRetroRs).toBeCloseTo(1.5, 6);
    expect(r.rIscoProRs).toBeCloseTo(3.0, 6);
    expect(r.rIscoRetroRs).toBeCloseTo(3.0, 6);
    expect(r.bCritRs).toBeCloseTo(2.598076, 5);
  });

  it('reproduces extremal Kerr limit (a* -> 1): r_+, r_ph+, r_ISCO+ -> 0.5 r_s', () => {
    const r = computeKerrRadii(0.999999);
    expect(r.rPlusRs).toBeCloseTo(0.5, 2);
    expect(r.rPhotonProRs).toBeCloseTo(0.5, 2);
    expect(r.rIscoProRs).toBeCloseTo(0.5, 1);
    expect(r.rPhotonRetroRs).toBeCloseTo(2.0, 2);
    expect(r.rIscoRetroRs).toBeCloseTo(4.5, 2);
  });

  it('reproduces exact Gullstrand-Painlevé free-fall velocity β(r_s) = 1.0 c', () => {
    const t = computeObserverTelemetry(BLACK_HOLE_MAP.sgr_a, 0, 1.0);
    expect(t.freeFallBeta).toBeCloseTo(1.0, 6);
    expect(t.insideHorizon).toBe(true);
    expect(t.staticTimeDilation).toBe(0);
  });

  it('verifies Schwarzschild gravitational time dilation at r = 4 r_s: dτ/dt = sqrt(0.75)', () => {
    const t = computeObserverTelemetry(BLACK_HOLE_MAP.m87, 0, 4.0);
    expect(t.staticTimeDilation).toBeCloseTo(Math.sqrt(0.75), 5);
    expect(t.earthSecondsPerShipSecond).toBeCloseTo(1 / Math.sqrt(0.75), 4);
  });

  it('verifies real tidal spaghettification difference: Cygnus X-1 lethal vs M87* gentle at horizon', () => {
    const cyg = computeObserverTelemetry(BLACK_HOLE_MAP.cygnus_x1, 0, 1.05);
    const m87 = computeObserverTelemetry(BLACK_HOLE_MAP.m87, 0, 1.05);
    expect(cyg.tidalHumanG).toBeGreaterThan(1e6);
    expect(cyg.tidalStatus).toBe('SPAGHETTIFICATION');
    expect(m87.tidalHumanG).toBeLessThan(1e-3);
    expect(m87.tidalStatus).toBe('SAFE');
  });

  it('matches exact solar Hawking temperature T_H(M_sun) ≈ 6.17×10^-8 K', () => {
    const tSun = hawkingTemperatureKelvin(1);
    expect(tSun / 1e-8).toBeCloseTo(6.17, 1);
  });

  it('verifies Flamm paraboloid embedding z(2 r_s) = 2 r_s and Novikov-Thorne disk cutoff at ISCO', () => {
    expect(flammParaboloidZInRs(2.0)).toBeCloseTo(2.0, 6);
    expect(flammParaboloidZInRs(1.0)).toBe(0);
    expect(novikovThorneTempRatio(2.9, 3.0)).toBe(0);
    expect(novikovThorneTempRatio(4.1, 3.0)).toBeGreaterThan(0.8);
  });

  it('verifies exact Kretschmann curvature invariant K = 12 / r_s^4 at r = r_s', () => {
    const rs = schwarzschildRadiusMeters(10);
    const kHorizon = kretschmannScalarM4(rs, rs);
    expect(kHorizon).toBeCloseTo(12 / Math.pow(rs, 4), 16);
  });

  it('matches exact solar Hawking evaporation lifetime (~2.1×10^67 yr) and M^3 scaling', () => {
    const logSun = log10HawkingEvaporationYears(1);
    const log10Sun = log10HawkingEvaporationYears(10);
    expect(logSun).toBeCloseTo(67.32, 1);
    expect(log10Sun - logSun).toBeCloseTo(3.0, 6);
  });

  it('verifies Hawking supermassive interior tidal physics: Sgr A* gentle at horizon, spaghettifies deep near r -> 0', () => {
    const sgrHorizon = computeObserverTelemetry(BLACK_HOLE_MAP.sgr_a, 0.9, 0.72);
    const sgrDeep = computeObserverTelemetry(BLACK_HOLE_MAP.sgr_a, 0.9, 0.005);
    expect(sgrHorizon.tidalShuttleG).toBeLessThan(1.0);
    expect(sgrDeep.tidalShuttleG).toBeGreaterThan(10000);
    expect(sgrDeep.tidalStatus).toBe('SPAGHETTIFICATION');
  });
});
