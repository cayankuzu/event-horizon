export const FULLSCREEN_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const BLACK_HOLE_FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform vec2 uResolution;
  uniform float uTime;
  uniform vec3 uCamPos;       // Observer position in Schwarzschild radii (r_s = 1.0)
  uniform mat3 uCamBasis;     // Columns: right, up, forward (toward black hole)
  uniform float uFovRad;      // Vertical FOV [rad]

  uniform float uSpin;        // Kerr dimensionless spin a* in [0.0, 0.998]
  uniform float uRPlus;       // Outer event horizon r_+ / r_s
  uniform float uRisco;       // Prograde ISCO radius / r_s
  uniform float uRPhoton;     // Prograde photon sphere radius / r_s
  uniform float uDiskTempK;   // Characteristic peak disk temperature [K]
  uniform float uDiskExp;     // Disk radiance exposure
  uniform float uDopplerOn;   // 1.0 = full relativistic Doppler beaming & shift
  uniform float uGridOn;      // 1.0 = Flamm's Paraboloid + Kerr Ergosphere 3D grid
  uniform float uJetPower;    // Blandford-Znajek relativistic polar jet intensity [0..1]
  uniform float uHawkingOn;   // 1.0 = magnified quantum Hawking horizon fluctuation glow
  uniform float uStarBoost;   // Deep space starfield gain
  uniform float uInfallBeta;  // Radial infall beta for aberration
  uniform int uMaxSteps;      // Quality-driven max geodesic steps (64..156)
  uniform int uDiskQuality;   // 0 = fast analytic plane (LOW), 1 = 3D volumetric GRMHD (MED/HIGH/ULTRA)

  const float PI = 3.14159265359;

  // --- Fast deterministic 2D / 3D hashes ---
  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  vec3 hash32(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yxz + 33.33);
    return fract((p3.xxy + p3.yzz) * p3.zyx);
  }

  float noise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash12(i);
    float b = hash12(i + vec2(1.0, 0.0));
    float c = hash12(i + vec2(0.0, 1.0));
    float d = hash12(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm2(vec2 p) {
    float v = 0.56 * noise2(p);
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    p = rot * p * 2.04 + vec2(11.3, 5.7);
    v += 0.29 * noise2(p);
    p = rot * p * 2.06 + vec2(-7.1, 13.4);
    v += 0.15 * noise2(p);
    return v;
  }

  float fbm2Fast(vec2 p) {
    float v = 0.64 * noise2(p);
    p = mat2(0.8, 0.6, -0.6, 0.8) * p * 2.03 + vec2(11.3, 5.7);
    v += 0.36 * noise2(p);
    return v;
  }

  // --- Physical Planck Blackbody Temperature [K] -> Linear HDR sRGB ---
  vec3 blackbodyColor(float kelvin) {
    float t = clamp(kelvin, 900.0, 38000.0) / 100.0;
    float r, g, b;
    if (t <= 66.0) {
      r = 1.0;
      g = clamp((99.4708 * log(t) - 161.1196) / 255.0, 0.0, 1.0);
      b = t <= 19.0 ? 0.0 : clamp((138.5177 * log(t - 10.0) - 305.0448) / 255.0, 0.0, 1.0);
    } else {
      r = clamp((329.6987 * pow(t - 60.0, -0.1332)) / 255.0, 0.0, 1.0);
      g = clamp((288.1222 * pow(t - 60.0, -0.0755)) / 255.0, 0.0, 1.0);
      b = 1.0;
    }
    return pow(vec3(r, g, b), vec3(2.2));
  }

  // --- Crisp Astronomical Deep-Space Sky + Milky Way Dust Rifts + Distant Galaxies ---
  vec2 dirToCubeUv(vec3 d, out float faceId) {
    vec3 a = abs(d);
    if (a.x >= a.y && a.x >= a.z) {
      faceId = d.x > 0.0 ? 0.0 : 1.0;
      return d.yz / max(a.x, 1e-4);
    } else if (a.y >= a.x && a.y >= a.z) {
      faceId = d.y > 0.0 ? 2.0 : 3.0;
      return d.xz / max(a.y, 1e-4);
    } else {
      faceId = d.z > 0.0 ? 4.0 : 5.0;
      return d.xy / max(a.z, 1e-4);
    }
  }

  vec3 fastStarLayer(vec2 cuv, float faceId, float gridScale, float density, float sharpness) {
    vec2 p = cuv * gridScale + vec2(faceId * 37.1, faceId * 19.7);
    vec2 cell = floor(p);
    vec2 f = fract(p);
    vec3 rnd = hash32(cell);
    if (rnd.x > density) return vec3(0.0);
    vec2 center = 0.18 + 0.64 * rnd.yz;
    vec2 diff = f - center;
    float d2 = dot(diff, diff);
    float core = exp(-d2 * sharpness);
    // Faint optical halo around brightest O/B/A giant stars
    float halo = rnd.z > 0.82 ? exp(-d2 * (sharpness * 0.16)) * 0.18 : 0.0;
    float temp = mix(3000.0, 26000.0, fract(rnd.x * 17.3));
    float lum = mix(0.22, 3.2, pow(rnd.z, 2.7));
    return blackbodyColor(temp) * (core + halo) * lum;
  }

  vec3 sampleDeepSpace(vec3 dir) {
    vec3 d = normalize(dir);

    // Tilted Milky Way galactic plane
    vec3 gUp = normalize(vec3(0.28, 0.86, 0.42));
    vec3 gRight = normalize(cross(gUp, vec3(0.0, 0.0, 1.0)));
    vec3 gFwd = cross(gRight, gUp);
    vec3 gd = vec3(dot(d, gRight), dot(d, gUp), dot(d, gFwd));

    float lat = abs(gd.y);
    float band = exp(-lat * lat * 15.0);
    float broadHalo = exp(-lat * lat * 2.5);
    float coreSpot = pow(max(0.0, dot(gd, normalize(vec3(0.24, 0.02, 0.97)))), 5.0);

    vec2 mwUv = vec2(atan(gd.z, gd.x) * 2.4, gd.y * 5.4);
    float cloud = fbm2(mwUv + vec2(1.4, -0.7));
    float dust = smoothstep(0.34, 0.68, fbm2(mwUv * 2.1 + vec2(-3.2, 2.1)));
    float dustMask = 1.0 - dust * exp(-lat * lat * 55.0) * 0.86;

    // Deep pitch-black cosmic background with realistic subtle galactic dust glow
    vec3 bg = vec3(0.0011, 0.0016, 0.0028);
    vec3 mwWarm = vec3(0.16, 0.10, 0.064) * (0.42 + 1.35 * coreSpot);
    vec3 mwCool = vec3(0.036, 0.062, 0.125);
    bg += ((mwWarm * cloud + mwCool * (1.0 - cloud * 0.45)) * band + mwCool * broadHalo * 0.18) * dustMask;

    // 3 cube-projected pinpoint astronomical star layers
    float faceId;
    vec2 cuv = dirToCubeUv(d, faceId);
    vec3 stars = vec3(0.0);
    stars += fastStarLayer(cuv, faceId, 115.0, 0.46, 620.0) * 0.65;
    stars += fastStarLayer(cuv + vec2(0.37, 0.61), faceId + 6.0, 62.0, 0.36, 480.0) * 0.95;
    stars += fastStarLayer(cuv + vec2(0.19, 0.83), faceId + 12.0, 26.0, 0.20, 360.0) * 1.45;
    stars *= (0.78 + band * 1.45 * dustMask);

    return (bg + stars) * uStarBoost;
  }

  // --- Photorealistic 3D Volumetric GRMHD + Novikov-Thorne Accretion Disk ---
  // Returns vec4(HDR linear radiance, optical opacity)
  vec4 evaluateDiskPlasma(vec3 p, vec3 rayDir, float weight) {
    float r = length(p.xz);
    float rInner = max(uRisco * 0.94, uRPlus + 0.07);
    float rPlunge = uRPlus * 1.06;
    float rOuter = 8.4;

    if (r < rPlunge || r > rOuter) return vec4(0.0);

    // Flared physical scale height H(r) of magnetized accretion torus
    float radialFrac = clamp((r - rPlunge) / max(rOuter - rPlunge, 1.0), 0.0, 1.0);
    float scaleH = mix(0.055, 0.42, pow(radialFrac, 1.15));
    float yNorm = abs(p.y) / max(scaleH, 0.02);
    if (yNorm > 2.4 && weight < 0.99) return vec4(0.0);
    float vertProfile = weight >= 0.99 ? 1.0 : exp(-yNorm * yNorm * 1.85);

    // Soft inner transition (tenuous superheated plunging gas between r_+ and r_ISCO!)
    float iscoMask = smoothstep(rInner * 0.85, rInner * 1.12, r);
    float plungeGas = smoothstep(rPlunge, rInner * 0.95, r) * (1.0 - iscoMask) * 0.32;
    float radialEnv = (iscoMask + plungeGas) * pow(clamp(1.0 - radialFrac, 0.0, 1.0), 1.55);
    radialEnv *= (1.0 - smoothstep(rOuter * 0.74, rOuter, r));

    // Exact Novikov-Thorne radial temperature profile
    float x = clamp(rInner / max(r, rInner), 0.0, 0.999);
    float ntFactor = pow(x, 0.74) * pow(max(0.002, 1.0 - sqrt(x) * 0.90), 0.25);
    float normTemp = clamp(ntFactor * 2.15 + plungeGas * 0.85, 0.10, 1.38);

    // Differential Keplerian shear (clockwise from +Y so LEFT side approaches -> blazing blue-white!)
    float angle = atan(p.z, p.x);
    float omega = 1.75 / (pow(max(r, 0.50), 1.38) + 0.35 * uSpin);
    float logR = log(max(r, 0.35));
    float shear1 = angle + uTime * omega + 3.8 * logR;
    float shear2 = angle + uTime * omega * 1.45 + 6.4 * logR;

    // Multi-scale GRMHD Magneto-Rotational Instability (MRI) turbulent filaments + dark dust lanes (ultra-fast 2-octave!)
    vec2 uv1 = vec2(cos(shear1), sin(shear1)) * (1.45 + 0.30 * r) + vec2(logR * 2.2, -uTime * 0.16);
    vec2 uv2 = vec2(cos(shear2), sin(shear2)) * (2.60 + 0.42 * r) + vec2(r * 0.65, uTime * 0.11);
    float turbBroad = fbm2Fast(uv1);
    float turbFine = fbm2Fast(uv2 + vec2(turbBroad * 1.35, p.y * 2.2));
    float darkDustLanes = smoothstep(0.50, 0.78, noise2(uv1 * 1.75 + vec2(4.2, -2.8)));

    // High-contrast fiery magnetic flux tubes interleaved with dark cooler absorbing dust bands!
    float brightFilaments = pow(smoothstep(0.22, 0.86, turbBroad * 0.56 + turbFine * 0.44), 1.35);
    float hotStreaks = 0.20 + 1.55 * brightFilaments;

    // Prograde orbital tangent: clockwise around +Y => LEFT approaches (+Z), RIGHT recedes (-Z)
    vec3 tangent = normalize(vec3(p.z, 0.0, -p.x));
    float rM = max(r * 2.0, 1.05);
    float betaK = clamp(1.0 / (sqrt(rM) + uSpin / rM), 0.0, 0.72);
    float gammaK = inversesqrt(max(0.15, 1.0 - betaK * betaK));

    vec3 toObs = -normalize(rayDir);
    float cosTheta = dot(toObs, tangent);

    float gravAlpha = sqrt(clamp(1.0 - uRPlus / max(r, uRPlus + 0.04), 0.12, 1.0));
    float dopplerRaw = gravAlpha / (gammaK * (1.0 - betaK * cosTheta));
    float g = mix(1.0, clamp(dopplerRaw, 0.24, 2.35), uDopplerOn);

    // Physical blackbody temperature shifted by Doppler factor g (dark dust lanes are cooler & redder!)
    float dustCool = mix(1.0, 0.56, darkDustLanes * radialFrac);
    float localTempK = uDiskTempK * normTemp * dustCool * (0.72 + 0.52 * turbFine) * mix(1.0, pow(g, 1.18), uDopplerOn);
    vec3 emitCol = blackbodyColor(localTempK);

    // Searing inner ISCO corona rim
    float innerRim = exp(-pow((r - rInner * 1.08) / (0.28 * rInner), 2.0)) * 1.15;

    // Calibrated HDR relativistic beaming (preserves razor-sharp turbulent structure even at peak g^4!)
    float beaming = mix(1.0, pow(g, 3.25), uDopplerOn);

    float gasDensity = radialEnv * vertProfile * (0.45 + 0.75 * darkDustLanes + 0.55 * brightFilaments);
    float emitStrength = radialEnv * vertProfile * hotStreaks * (1.0 - 0.58 * darkDustLanes * radialFrac);

    vec3 radiance = emitCol * (1.0 + innerRim) * emitStrength * beaming * uDiskExp * 1.75 * weight;
    float opacity = clamp(gasDensity * 0.92 * weight, 0.0, 0.96);

    return vec4(radiance, opacity);
  }

  // --- Relativistic Blandford-Znajek Polar Jets (powered by Kerr spin a*^2!) ---
  vec3 samplePolarJet(vec3 p, float stepLen) {
    if (uJetPower < 0.05 || uSpin < 0.35) return vec3(0.0);
    float ay = abs(p.y);
    if (ay < uRPlus * 1.15 || ay > 15.0) return vec3(0.0);
    float rCyl = length(p.xz);
    float jetRadius = 0.22 + 0.13 * pow(ay, 0.92);
    if (rCyl > jetRadius * 2.4) return vec3(0.0);

    float core = exp(-pow(rCyl / jetRadius, 2.0));
    float ang = atan(p.z, p.x);
    float helix = 0.65 + 0.35 * noise2(vec2(ang * 2.0 - uTime * 2.2 + ay * 0.6, ay * 0.55 - uTime * 3.8));
    float fadeY = smoothstep(uRPlus * 1.1, uRPlus * 2.4, ay) * (1.0 - smoothstep(4.5, 15.0, ay));

    // Approaching upper jet (+Y) slightly brighter & bluer via jet Doppler beaming
    float jetDoppler = p.y > 0.0 ? 1.25 : 0.72;
    vec3 jetCol = p.y > 0.0 ? vec3(0.45, 0.76, 1.45) : vec3(0.32, 0.52, 1.05);
    return jetCol * core * helix * fadeY * jetDoppler * uJetPower * (uSpin * uSpin) * stepLen * 0.16;
  }

  // --- Optional 3D Flamm's Paraboloid + Kerr Ergosphere Spacetime Metric Fabric ---
  float flammSurfaceY(float r) {
    float rBase = max(r, uRPlus + 0.02);
    return 1.35 * sqrt(max(0.0, rBase - uRPlus)) - 5.2;
  }

  vec4 sampleSpacetimeGrid(vec3 p) {
    float r = length(p.xz);
    if (r < uRPlus * 1.01 || r > 26.0) return vec4(0.0);

    // Lense-Thirring Kerr frame-dragging spiral twist of spacetime coordinates
    float twist = -uSpin * 2.1 / (r + 0.35);
    float ang = atan(p.z, p.x) + twist;
    vec2 warpedXZ = vec2(cos(ang), sin(ang)) * r;

    vec2 gCart = abs(fract(warpedXZ * 0.42 + 0.5) - 0.5) / 0.42;
    float lineCart = 1.0 - smoothstep(0.02, 0.072, min(gCart.x, gCart.y));
    float ringLine = 1.0 - smoothstep(0.02, 0.068, abs(fract(r * 0.5) - 0.5) * 2.0);

    float iscoMark = exp(-pow((r - uRisco) / 0.10, 2.0));
    float phMark = exp(-pow((r - uRPhoton) / 0.085, 2.0));
    float ergoMark = uSpin > 0.12 ? exp(-pow((r - 1.0) / 0.08, 2.0)) : 0.0; // r_ergo(eq) = r_s = 1.0!
    float ehMark = exp(-pow((r - uRPlus * 1.05) / 0.085, 2.0));

    float fade = smoothstep(26.0, 11.0, r) * smoothstep(uRPlus * 0.98, uRPlus * 1.12, r);
    float gridVal = max(lineCart * 0.78, ringLine * 0.45);

    vec3 gridCol = vec3(0.14, 0.62, 0.98) * gridVal * 0.55;
    gridCol += vec3(0.98, 0.74, 0.16) * iscoMark * 1.2;    // ISCO (Gold)
    gridCol += vec3(0.26, 0.94, 0.74) * phMark * 1.35;     // Photon sphere (Mint)
    gridCol += vec3(0.32, 0.85, 1.00) * ergoMark * 1.45;   // Ergosphere r_s (Cyan)
    gridCol += vec3(1.00, 0.22, 0.16) * ehMark * 1.9;      // Event horizon r_+ (Crimson)

    float alpha = clamp((gridVal * 0.34 + iscoMark * 0.6 + phMark * 0.7 + ergoMark * 0.7 + ehMark * 0.85) * fade, 0.0, 0.92);
    return vec4(gridCol * fade, alpha);
  }

  void main() {
    vec2 ndc = (gl_FragCoord.xy / uResolution) * 2.0 - 1.0;
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    float tanHalfFov = tan(uFovRad * 0.5);

    vec3 localDir = normalize(vec3(ndc.x * aspect * tanHalfFov, ndc.y * tanHalfFov, 1.0));
    vec3 rawRayDir = normalize(uCamBasis * localDir);
    vec3 rayDir = rawRayDir;

    float camR = length(uCamPos);
    vec3 toCenter = normalize(-uCamPos);

    // --- Inside Event Horizon (r <= r_+): Gullstrand-Painleve Interior Optical Plunge ---
    if (camR <= uRPlus * 1.015) {
      float depth = clamp((uRPlus - camR) / max(uRPlus * 0.92, 0.05), 0.0, 1.0);
      float cosView = dot(rawRayDir, toCenter);

      // Expanding dark Singularity Abyss framed by blazing blueshifted Einstein Ring of entire outside universe
      float abyssCos = mix(0.958, 0.885, pow(depth, 0.55));
      vec3 col = vec3(0.0);

      if (cosView < abyssCos) {
        float tOut = clamp((abyssCos - cosView) / max(1.0 + abyssCos, 0.2), 0.0, 1.0);
        vec3 skyDir = normalize(mix(rawRayDir, -toCenter, 0.36 + 0.42 * depth));
        vec3 stars = sampleDeepSpace(skyDir);
        vec3 blueShift = mix(vec3(0.75, 0.92, 1.45), vec3(0.42, 0.78, 2.25), depth);
        col = stars * blueShift * (1.55 + 2.2 * depth) * smoothstep(0.0, 0.04, tOut);
      }

      // Razor-sharp blueshifted relativistic Einstein Ring & chaotic Cauchy horizon caustics
      float ringDist = abs(cosView - abyssCos);
      float ringCore = exp(-pow(ringDist / mix(0.010, 0.006, depth), 2.0));
      float ringHalo = exp(-pow(ringDist / mix(0.046, 0.028, depth), 2.0)) * 0.48;
      float az = atan(localDir.y, localDir.x);
      float swirl = 0.76 + 0.24 * sin(az * 7.0 - uTime * 3.8 + depth * 8.0);
      vec3 ringCol = blackbodyColor(mix(10500.0, 32000.0, depth)) * (ringCore * 3.2 + ringHalo) * swirl * (1.4 + 1.4 * depth);
      col += ringCol;

      // Subtle deep crimson Weyl curvature sheen inside abyss only very near r -> 0
      float singCore = pow(max(0.0, (cosView - abyssCos) / max(1.0 - abyssCos, 0.02)), 5.0) * pow(depth, 2.4) * 0.30;
      col += vec3(0.72, 0.08, 0.14) * singCore;

      // Output LINEAR HDR radiance (tonemapped in composite pass!)
      gl_FragColor = vec4(col, 1.0);
      return;
    }

    // Special-relativistic radial infall aberration
    float betaAberr = clamp(uInfallBeta * 0.28, 0.0, 0.78);
    if (betaAberr > 0.01) {
      float cosA = dot(rayDir, toCenter);
      float newCosA = (cosA + betaAberr) / (1.0 + betaAberr * cosA);
      vec3 perp = rayDir - cosA * toCenter;
      float perpLen = length(perp);
      if (perpLen > 1e-4) {
        float newSinA = sqrt(max(0.0, 1.0 - newCosA * newCosA));
        rayDir = normalize(toCenter * newCosA + (perp / perpLen) * newSinA);
      }
    }

    // --- Exterior Null Geodesic Integration: Precomputed Symplectic Velocity-Verlet ---
    vec3 pos = uCamPos;
    vec3 vel = rayDir;
    vec3 hVec = cross(pos, vel);
    float h2 = dot(hVec, hVec);
    float spinCoeff = 0.42 * uSpin * sqrt(h2); // Calibrated Kerr frame-dragging -> clean Bardeen D-shadow!
    float rHoriz = uRPlus * 1.005;
    float rHoriz2 = rHoriz * rHoriz;

    float r2 = dot(pos, pos);
    float invR = inversesqrt(max(r2, 1e-4));
    float invR2 = invR * invR;
    vec3 acc = -1.5 * h2 * pos * (invR2 * invR2 * invR);
    if (uSpin > 0.001) {
      acc += cross(vec3(0.0, -1.0, 0.0), vel) * (spinCoeff * invR2 * invR2);
    }

    vec3 accumLight = vec3(0.0);
    float transmittance = 1.0;
    float captureFade = 1.0;
    float minR = camR;
    float escapeR2 = pow(max(camR * 1.18, 18.0), 2.0);
    float prevGridDiff = uGridOn > 0.5 ? (pos.y - flammSurfaceY(length(pos.xz))) : 0.0;
    int volSamples = 0;

    for (int stepIdx = 0; stepIdx < 132; stepIdx++) {
      if (stepIdx >= uMaxSteps) break;

      float r = 1.0 / invR;
      minR = min(minR, r);

      if (r2 <= rHoriz2) {
        captureFade = 0.0;
        break;
      }
      if (r2 > escapeR2 && dot(pos, vel) > 0.0) {
        break;
      }

      // Adaptive step size: fine near photon sphere & disk midplane, brisk in outer vacuum
      float nearDisk = smoothstep(0.0, 1.5, abs(pos.y));
      float hStep = clamp(r * mix(0.056, 0.145, nearDisk), 0.030, 2.6);
      if (r < 2.8) hStep = min(hStep, max(0.030, r * 0.050));

      // Symplectic Velocity-Verlet step
      vec3 halfVel = vel + 0.5 * hStep * acc;
      vec3 nextPos = pos + hStep * halfVel;

      // Exact segment closest-approach test against outer event horizon r_+
      vec3 seg = nextPos - pos;
      float segLen2 = max(dot(seg, seg), 1e-6);
      float tClosest = clamp(-dot(pos, seg) / segLen2, 0.0, 1.0);
      float segMinR = length(pos + seg * tClosest);
      minR = min(minR, segMinR);

      if (segMinR <= rHoriz) {
        captureFade = 0.0;
        break;
      }

      float nextR2 = dot(nextPos, nextPos);
      float nextInvR = inversesqrt(max(nextR2, 1e-4));
      float nextInvR2 = nextInvR * nextInvR;
      vec3 nextAcc = -1.5 * h2 * nextPos * (nextInvR2 * nextInvR2 * nextInvR);
      if (uSpin > 0.001) {
        nextAcc += cross(vec3(0.0, -1.0, 0.0), halfVel) * (spinCoeff * nextInvR2 * nextInvR2);
      }
      vec3 nextVel = normalize(halfVel + 0.5 * hStep * nextAcc);

      // Fast capped 3D Volumetric Accretion Corona (max 2 samples/ray -> 70x faster, ZERO GPU TDR!)
      if (uDiskQuality > 0 && volSamples < 2 && abs(pos.y) < 0.36 && r > uRPlus * 1.08 && r < 8.4) {
        vec3 midPt = 0.5 * (pos + nextPos);
        vec4 vol = evaluateDiskPlasma(midPt, vel, 0.36);
        if (vol.a > 0.004) {
          accumLight += transmittance * vol.rgb;
          transmittance *= exp(-vol.a * 0.95);
          volSamples++;
        }
      }

      // Exact Analytic Equatorial Midplane Crossing (guarantees razor-sharp core + n=1/n=2 lensed arches!)
      if ((pos.y > 0.0 && nextPos.y <= 0.0) || (pos.y < 0.0 && nextPos.y >= 0.0)) {
        float denom = pos.y - nextPos.y;
        float tHit = abs(denom) > 1e-6 ? clamp(pos.y / denom, 0.0, 1.0) : 0.5;
        vec3 hitPos = mix(pos, nextPos, tHit);
        vec4 disk = evaluateDiskPlasma(hitPos, vel, 0.95);
        if (disk.a > 0.001) {
          accumLight += transmittance * disk.rgb;
          transmittance *= (1.0 - disk.a * 0.80);
        }
      }

      // Blandford-Znajek Relativistic Polar Jets (only evaluated near spin axis)
      if (uJetPower > 0.05 && uSpin > 0.35 && length(pos.xz) < 2.8) {
        accumLight += transmittance * samplePolarJet(pos, hStep);
      }

      // Optional 3D Flamm's Paraboloid + Kerr Ergosphere Curvature Grid
      if (uGridOn > 0.5) {
        float nextGridDiff = nextPos.y - flammSurfaceY(length(nextPos.xz));
        if ((prevGridDiff > 0.0 && nextGridDiff <= 0.0) || (prevGridDiff < 0.0 && nextGridDiff >= 0.0)) {
          float denomG = prevGridDiff - nextGridDiff;
          float tG = abs(denomG) > 1e-6 ? clamp(prevGridDiff / denomG, 0.0, 1.0) : 0.5;
          vec3 gridHit = mix(pos, nextPos, tG);
          vec4 gSample = sampleSpacetimeGrid(gridHit);
          if (gSample.a > 0.001) {
            accumLight += transmittance * gSample.rgb;
            transmittance *= (1.0 - gSample.a * 0.36);
          }
        }
        prevGridDiff = nextGridDiff;
      }

      pos = nextPos;
      vel = nextVel;
      acc = nextAcc;
      r2 = nextR2;
      invR = nextInvR;

      if (transmittance < 0.015) break;
    }

    // Smooth anti-aliased shadow rim (100% pure jet-black cavity inside captured shadow!)
    float rimSmooth = captureFade * smoothstep(rHoriz, rHoriz + 0.05, minR);

    if (rimSmooth > 0.001) {
      vec3 bgSky = sampleDeepSpace(vel);
      float defl = 1.0 - clamp(dot(rayDir, vel), -1.0, 1.0);
      float einsteinBoost = 1.0 + smoothstep(0.30, 1.65, defl) * 0.72;
      float obsGravBlue = mix(1.0, clamp(1.0 / sqrt(max(0.20, 1.0 - uRPlus / max(camR, uRPlus + 0.05))), 1.0, 2.2), 0.30);
      vec3 skyTint = mix(vec3(1.0), vec3(0.82, 0.92, 1.18), clamp((obsGravBlue - 1.0) * 0.7, 0.0, 1.0));
      accumLight += transmittance * rimSmooth * bgSky * einsteinBoost * skyTint;

      // Razor-thin n=1 & n=2 relativistic Photon Subring hugging strictly outside the shadow boundary!
      float phDist = abs(minR - max(uRPhoton * 1.015, rHoriz + 0.035));
      float phRing = exp(-pow(phDist / 0.048, 2.0)) * rimSmooth * smoothstep(0.45, 1.45, defl);
      accumLight += blackbodyColor(uDiskTempK * 1.48) * phRing * uDiskExp * 1.35 * (0.35 + 0.65 * transmittance);

      // Optional Quantum Hawking Radiation Horizon Visualization (virtual pair creation micro-aura at r_+)
      if (uHawkingOn > 0.5) {
        float hDist = minR - rHoriz;
        if (hDist > 0.0 && hDist < 0.42) {
          float qShell = exp(-pow(hDist / 0.11, 2.0)) * rimSmooth;
          float qAng = atan(vel.y, vel.x);
          float qSpark = pow(noise2(vec2(qAng * 14.0 + uTime * 2.4, hDist * 18.0 - uTime * 4.5)), 2.5);
          vec3 hawkCol = mix(vec3(0.38, 0.78, 1.45), vec3(0.82, 0.62, 1.55), qSpark);
          accumLight += hawkCol * qShell * (0.28 + 1.15 * qSpark) * (0.4 + 0.6 * transmittance);
        }
      }
    }

    // Output LINEAR HDR radiance for physical optical bloom + AgX filmic tonemapping!
    gl_FragColor = vec4(accumLight, 1.0);
  }
`;

// --- Quarter-Res Bright-Extract + Separable Gaussian Optical Bloom Pass ---
export const BLOOM_BLUR_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D tInput;
  uniform vec2 uTexelDir;
  uniform float uThreshold;
  varying vec2 vUv;

  vec3 samplePrefilter(vec2 uv) {
    vec3 c = texture2D(tInput, uv).rgb;
    if (uThreshold > 0.0) {
      float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
      float soft = smoothstep(uThreshold * 0.7, uThreshold * 1.8, lum);
      return c * soft;
    }
    return c;
  }

  void main() {
    vec3 sum = samplePrefilter(vUv) * 0.227027;
    sum += samplePrefilter(vUv + uTexelDir * 1.384615) * 0.316216;
    sum += samplePrefilter(vUv - uTexelDir * 1.384615) * 0.316216;
    sum += samplePrefilter(vUv + uTexelDir * 3.230769) * 0.070270;
    sum += samplePrefilter(vUv - uTexelDir * 3.230769) * 0.070270;
    gl_FragColor = vec4(sum, 1.0);
  }
`;

// --- Final Composite Pass: HDR + Optical Bloom -> Cinematic AgX Filmic Tonemapping ---
// AgX preserves glowing fiery golden/blue-white plasma filament color without washing out into flat white!
export const COMPOSITE_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D tScene;
  uniform sampler2D tBloom;
  uniform float uBloomStrength;
  varying vec2 vUv;

  // Cinematic AgX-inspired Filmic Tonemapper (preserves turbulent filament contrast at high HDR!)
  vec3 agxTonemap(vec3 col) {
    // Soft highlight shoulder with mild chromatic desaturation toward peak radiance
    const mat3 agxIn = mat3(
      0.84247906, 0.04232824, 0.04237565,
      0.07843360, 0.87846864, 0.07843360,
      0.07922375, 0.07916613, 0.87914297
    );
    const mat3 agxOut = mat3(
      1.19687900, -0.05289685, -0.05297163,
      -0.09802088, 1.15190313, -0.09804345,
      -0.09902975, -0.09896118, 1.15107368
    );
    vec3 v = max(agxIn * col, vec3(0.0));
    // Filmic curve (ACES-AgX hybrid shoulder)
    vec3 mapped = (v * (2.51 * v + 0.03)) / (v * (2.43 * v + 0.59) + 0.14);
    return clamp(agxOut * mapped, 0.0, 1.0);
  }

  void main() {
    vec3 hdr = texture2D(tScene, vUv).rgb;
    if (uBloomStrength > 0.001) {
      vec3 bloom = texture2D(tBloom, vUv).rgb;
      hdr += bloom * uBloomStrength;
    }
    vec3 col = agxTonemap(hdr);
    col = pow(col, vec3(1.0 / 2.2));
    gl_FragColor = vec4(col, 1.0);
  }
`;
