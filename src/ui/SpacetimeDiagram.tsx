import React from 'react';
import { ObserverTelemetry } from '../physics/relativity';
import { Lang, tr } from '../i18n/translations';

interface Props {
  telemetry: ObserverTelemetry;
  lang: Lang;
}

/**
 * Live interactive cross-section of Flamm's Paraboloid:
 *   z(r) = 2 * sqrt(r_s * (r - r_s))
 * combined with the local Eddington-Finkelstein future light cone tilt,
 * visualizing in real time why space curves downward into the throat and
 * why light cones tilt completely inward once r <= r_+.
 */
export const SpacetimeDiagram: React.FC<Props> = ({ telemetry, lang }) => {
  const { rInRs, radii, lightConeTiltDeg, insideHorizon } = telemetry;
  const W = 286;
  const H = 118;
  const cx = W * 0.5;
  const topY = 16;
  const throatY = H - 18;

  // Map radial distance r ∈ [0, 14 r_s] smoothly onto half-width
  const mapXOffset = (r: number): number => {
    const clamped = Math.min(14, Math.max(0, r));
    return (Math.log(1 + clamped * 0.72) / Math.log(1 + 14 * 0.72)) * (W * 0.45);
  };

  // Exact Flamm's paraboloid profile: z = 2 sqrt(r - r_+)
  const mapFunnelY = (r: number): number => {
    if (r <= radii.rPlusRs) return throatY + 5;
    const zMax = 2 * Math.sqrt(14 - radii.rPlusRs);
    const z = 2 * Math.sqrt(Math.max(0, r - radii.rPlusRs));
    const norm = Math.min(1, z / zMax);
    return throatY - norm * (throatY - topY);
  };

  const buildCurve = (side: -1 | 1): string => {
    const pts: string[] = [];
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const r = radii.rPlusRs + t * t * (14 - radii.rPlusRs);
      const x = cx + side * mapXOffset(r);
      const y = mapFunnelY(r);
      pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return pts.join(' ');
  };

  const rClamped = Math.min(14, Math.max(0.1, rInRs));
  const shipX = cx + mapXOffset(rClamped);
  const shipY = mapFunnelY(rClamped);

  const ehX = mapXOffset(radii.rPlusRs);
  const phX = mapXOffset(radii.rPhotonProRs);
  const iscoX = mapXOffset(radii.rIscoProRs);

  // Local Future Light Cone anchored at the Space Shuttle's position (tilting inward toward cx!)
  const tiltRad = (lightConeTiltDeg * Math.PI) / 180;
  const coneLen = 24;
  // Center axis of future light cone rotates counter-clockwise (inward to left toward cx) by tiltRad
  const leftRayAng = -Math.PI / 2 - tiltRad - 0.34;
  const rightRayAng = -Math.PI / 2 - tiltRad + 0.34;
  const lx = shipX + Math.cos(leftRayAng) * coneLen;
  const ly = shipY + Math.sin(leftRayAng) * coneLen;
  const rx = shipX + Math.cos(rightRayAng) * coneLen;
  const ry = shipY + Math.sin(rightRayAng) * coneLen;

  return (
    <div className="spacetime-diagram-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="spacetime-svg" role="img" aria-label="Flamm Paraboloid Spacetime Curvature">
        {/* Background subtle coordinate rulings */}
        <line x1={cx} y1={8} x2={cx} y2={H - 4} stroke="rgba(255,46,31,0.35)" strokeDasharray="3 3" strokeWidth="1" />
        <line x1={8} y1={topY} x2={W - 8} y2={topY} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

        {/* Event Horizon throat fill */}
        <rect x={cx - ehX} y={topY} width={ehX * 2} height={H - topY - 4} fill="rgba(255,46,31,0.08)" />

        {/* ISCO & Photon Sphere vertical reference lines */}
        <line x1={cx + iscoX} y1={topY} x2={cx + iscoX} y2={mapFunnelY(radii.rIscoProRs)} stroke="rgba(245,158,11,0.55)" strokeDasharray="2 2" strokeWidth="1" />
        <line x1={cx + phX} y1={topY} x2={cx + phX} y2={mapFunnelY(radii.rPhotonProRs)} stroke="rgba(16,185,129,0.65)" strokeDasharray="2 2" strokeWidth="1" />
        <line x1={cx + ehX} y1={topY} x2={cx + ehX} y2={throatY + 8} stroke="rgba(255,46,31,0.8)" strokeWidth="1.2" />
        <line x1={cx - ehX} y1={topY} x2={cx - ehX} y2={throatY + 8} stroke="rgba(255,46,31,0.8)" strokeWidth="1.2" />

        {/* Flamm's Paraboloid isometric funnel curves */}
        <path d={buildCurve(-1)} fill="none" stroke="#38bdf8" strokeWidth="1.6" />
        <path d={buildCurve(1)} fill="none" stroke="#38bdf8" strokeWidth="1.6" />

        {/* Singularity point at r=0 */}
        <circle cx={cx} cy={H - 8} r="2.6" fill="#ff2e1f" />

        {/* Local Eddington-Finkelstein Future Light Cone at Ship */}
        <polygon
          points={`${shipX.toFixed(1)},${shipY.toFixed(1)} ${lx.toFixed(1)},${ly.toFixed(1)} ${rx.toFixed(1)},${ry.toFixed(1)}`}
          fill={insideHorizon ? 'rgba(255,46,31,0.34)' : 'rgba(56,189,248,0.28)'}
          stroke={insideHorizon ? '#ff453a' : '#7dd3fc'}
          strokeWidth="1"
        />

        {/* Shuttle live marker */}
        <circle cx={shipX} cy={shipY} r="3.8" fill={insideHorizon ? '#ff2e1f' : '#ffffff'} stroke="#08090c" strokeWidth="1.2" />

        {/* Labels */}
        <text x={cx + iscoX} y={12} fill="#f59e0b" fontSize="7.5" fontFamily="JetBrains Mono" textAnchor="middle">
          ISCO
        </text>
        <text x={cx + phX} y={H - 4} fill="#10b981" fontSize="7.5" fontFamily="JetBrains Mono" textAnchor="middle">
          r_ph
        </text>
        <text x={cx} y={12} fill="#ff453a" fontSize="7.5" fontFamily="JetBrains Mono" textAnchor="middle">
          r_+
        </text>
        <text x={12} y={H - 5} fill="rgba(255,255,255,0.45)" fontSize="7.2" fontFamily="JetBrains Mono">
          z(r)=2√(r_s(r-r_s))
        </text>
      </svg>
      <div className="diagram-footer">
        <span>{tr(lang, 'diagramLegendCone')}</span>
        <strong className={insideHorizon ? 'danger-txt' : ''}>
          {lightConeTiltDeg.toFixed(1)}° {insideHorizon ? '(r < r_+)' : ''}
        </strong>
      </div>
    </div>
  );
};
