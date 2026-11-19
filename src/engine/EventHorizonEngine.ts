import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { BLACK_HOLE_MAP, BlackHoleId } from '../physics/blackHoles';
import { computeObserverTelemetry, ObserverTelemetry } from '../physics/relativity';
import {
  BLACK_HOLE_FRAGMENT_SHADER,
  BLOOM_BLUR_FRAG,
  COMPOSITE_FRAG,
  FULLSCREEN_VERT,
} from './blackHoleShader';
import { SpaceAudio } from './SpaceAudio';

export type ObserverFrameMode = 'hawking' | 'proper' | 'cockpit';
export type PerfQuality = 'low' | 'medium' | 'high' | 'ultra' | 'auto';

export interface SimParams {
  blackHoleId: BlackHoleId;
  spin: number;
  dopplerBeaming: boolean;
  spacetimeGrid: boolean;
  relativisticJets: boolean;
  hawkingGlow: boolean;
  observerMode: ObserverFrameMode;
  autoFreeFall: boolean;
  hardHorizonLock: boolean;
  quality: PerfQuality;
}

export interface ShuttleVisualState {
  /** Radial Weyl spaghettification stretch ratio (1.00x -> 12.0x) */
  stretchFactor: number;
  /** Observed gravitational redshift ratio in [0, 1] */
  redshiftRatio: number;
  /** Hawking distant-observer horizon fade/freeze factor in [0, 1] */
  hawkingFreezeRatio: number;
  /** Active raytracer resolution scale */
  renderScale: number;
  /** Whether optical bloom is active */
  bloomActive: boolean;
}

export interface EngineSnapshot {
  telemetry: ObserverTelemetry;
  shuttleState: ShuttleVisualState;
  fps: number;
  shipClockSec: number;
  earthClockSec: number;
  shuttleLoaded: boolean;
  escapeBlockedFlash: boolean;
  params: SimParams;
}

interface QualityPresetConfig {
  scale: number;
  maxSteps: number;
  diskQuality: number;
  bloom: boolean;
  dprMax: number;
}

const QUALITY_CONFIGS: Record<Exclude<PerfQuality, 'auto'>, QualityPresetConfig> = {
  low: { scale: 0.50, maxSteps: 64, diskQuality: 0, bloom: false, dprMax: 1.0 },
  medium: { scale: 0.66, maxSteps: 84, diskQuality: 1, bloom: true, dprMax: 1.1 },
  high: { scale: 0.80, maxSteps: 100, diskQuality: 1, bloom: true, dprMax: 1.15 },
  ultra: { scale: 0.96, maxSteps: 128, diskQuality: 1, bloom: true, dprMax: 1.25 },
};

const MIN_R_RS = 0.004;
const MAX_R_RS = 46.0;
const DEFAULT_R_RS = 18.5;

// Soft volumetric GLSL plasma thruster plume shader (highp matches vertex shader precision!)
const PLUME_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalV;
  varying vec3 vViewPos;
  void main() {
    vUv = uv;
    vNormalV = normalize(normalMatrix * normal);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewPos = -mvPos.xyz;
    gl_Position = projectionMatrix * mvPos;
  }
`;

const PLUME_FRAG = /* glsl */ `
  precision highp float;
  uniform vec3 uColorCore;
  uniform vec3 uColorOuter;
  uniform float uIntensity;
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vNormalV;
  varying vec3 vViewPos;

  void main() {
    float along = 1.0 - vUv.y;
    float throatFade = smoothstep(0.0, 0.16, along);
    float tailFade = pow(clamp(1.0 - along, 0.0, 1.0), 2.85) * smoothstep(0.0, 0.18, 1.0 - along);
    vec3 N = normalize(vNormalV);
    vec3 V = normalize(vViewPos);
    float fresnel = pow(abs(dot(N, V)), 2.8);
    float mach = 0.85 + 0.15 * sin(along * 22.0 - uTime * 28.0);
    float alpha = throatFade * tailFade * fresnel * mach * uIntensity;
    vec3 col = mix(uColorOuter, uColorCore, pow(clamp(1.0 - along, 0.0, 1.0), 1.8) * fresnel);
    gl_FragColor = vec4(col * alpha, alpha);
  }
`;

// GPU Tidal Disruption Plasma & Stripped Thermal-Tile Debris Stream shader
const DEBRIS_VERT = /* glsl */ `
  attribute float aPhase;
  attribute float aSpread;
  attribute float aSize;
  uniform float uTime;
  uniform float uIntensity;
  uniform vec3 uOrigin;
  uniform float uStretch;
  uniform float uTwist;
  varying float vLife;
  varying float vHeat;

  void main() {
    float life = fract(aPhase + uTime * (0.48 + 0.36 * aSpread));
    vLife = life;
    vHeat = 1.0 - life;

    // Particles rip from the stretched nose & wingtips and spiral along curved Kerr geodesics into BH!
    float ang = aPhase * 6.2831853 + life * (1.8 + uTwist * 3.5);
    float rad = (0.04 + 0.36 * aSpread) * (1.0 - life * 0.72) / (1.0 + uStretch * 0.40);
    float zPull = -0.35 - life * (2.8 + uStretch * 1.45);
    float arcUp = pow(life, 1.50) * (1.05 + uStretch * 0.28);

    vec3 pos = uOrigin + vec3(
      cos(ang) * rad + life * 0.16,
      sin(ang) * rad * 0.65 + arcUp,
      zPull
    );

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = aSize * (280.0 / max(-mvPos.z, 0.5)) * (0.35 + 0.65 * sin(life * 3.14159)) * clamp(uIntensity, 0.0, 1.0);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const DEBRIS_FRAG = /* glsl */ `
  precision highp float;
  uniform float uIntensity;
  uniform float uRedshift;
  varying float vLife;
  varying float vHeat;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = dot(c, c);
    if (d > 0.25) discard;
    float glow = exp(-d * 18.0);
    vec3 hotCol = mix(vec3(1.0, 0.35, 0.08), vec3(1.0, 0.94, 0.74), pow(vHeat, 1.4));
    vec3 redCol = vec3(0.92, 0.14, 0.07);
    vec3 col = mix(hotCol, redCol, uRedshift * 0.78);
    float alpha = glow * sin(vLife * 3.14159) * uIntensity;
    gl_FragColor = vec4(col * alpha * 1.85, alpha);
  }
`;

function createSoftGlowTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0.0, 'rgba(255,255,255,1.0)');
  grad.addColorStop(0.22, 'rgba(255,255,255,0.75)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.18)');
  grad.addColorStop(1.0, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export class EventHorizonEngine {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly hdrType: THREE.TextureDataType;

  // Pass 1: HDR Geodesic Black Hole Raytracer -> Quarter-Res Separable Bloom -> AgX Composite
  private readonly bgScene: THREE.Scene;
  private readonly bgCamera: THREE.OrthographicCamera;
  private readonly bhMaterial: THREE.ShaderMaterial;
  private bhTarget: THREE.WebGLRenderTarget;
  private bloomTargetA: THREE.WebGLRenderTarget;
  private bloomTargetB: THREE.WebGLRenderTarget;
  private readonly bloomScene: THREE.Scene;
  private readonly bloomMat: THREE.ShaderMaterial;
  private readonly compositeScene: THREE.Scene;
  private readonly compositeMat: THREE.ShaderMaterial;

  // Pass 2: 100% Native-Resolution 3D NASA Space Shuttle (with GPU Non-Linear Weyl Spaghettification!) + Debris + Cockpit
  private readonly fgScene: THREE.Scene;
  private readonly fgCamera: THREE.PerspectiveCamera;
  private readonly shuttleRoot = new THREE.Group();
  private readonly shuttleModelHolder = new THREE.Group();
  private readonly cockpitGroup = new THREE.Group();

  // Shared GPU Uniforms injected into EVERY NASA Space Shuttle PBR material via onBeforeCompile!
  private readonly weylUniforms = {
    uShuttleCenter: { value: new THREE.Vector3(-0.18, -1.02, -4.35) },
    uSpaghetti: { value: 0.0 },
    uTwist: { value: 0.0 },
    uRedshift: { value: 0.0 },
    uHorizonFade: { value: 1.0 },
    uTidalHeat: { value: 0.0 },
    uSimTime: { value: 0.0 },
  };

  // GPU Tidal Disruption Debris & Ionized Plasma Stream
  private readonly debrisPoints: THREE.Points;
  private readonly debrisMat: THREE.ShaderMaterial;

  // Dynamic lights illuminating the NASA Space Shuttle from the Accretion Disk
  private readonly diskKeyLight: THREE.DirectionalLight;
  private readonly blueDopplerRim: THREE.DirectionalLight;
  private readonly redRecedingRim: THREE.DirectionalLight;
  private readonly spaceAmbient: THREE.HemisphereLight;
  private readonly aftFillLight: THREE.DirectionalLight;

  // Volumetric GLSL SSME/OMS thruster plumes
  private readonly plumeMeshes: THREE.Mesh[] = [];
  private readonly plumeBasePos: THREE.Vector3[] = [];
  private readonly plumeMats: THREE.ShaderMaterial[] = [];
  // Time-dilated wingtip & tail-fin navigation beacons
  private readonly strobeGroups: THREE.Group[] = [];
  private readonly strobeBasePos: THREE.Vector3[] = [];
  private readonly strobeCoreMats: THREE.MeshBasicMaterial[] = [];
  private readonly strobeSpriteMats: THREE.SpriteMaterial[] = [];
  private readonly glowTex: THREE.CanvasTexture;
  private strobePhase = 0;

  public readonly audio = new SpaceAudio();

  // Default: Cygnus X-1 (Hawking & Thorne's 1974 bet stellar-mass BH -> immediate real Weyl spaghettification!)
  private params: SimParams = {
    blackHoleId: 'cygnus_x1',
    spin: BLACK_HOLE_MAP.cygnus_x1.defaultSpin,
    dopplerBeaming: true,
    spacetimeGrid: false,
    relativisticJets: true,
    hawkingGlow: false,
    observerMode: 'hawking',
    autoFreeFall: false,
    hardHorizonLock: false,
    quality: 'high',
  };

  // Active quality settings
  private renderScale = QUALITY_CONFIGS.high.scale;
  private currentMaxSteps = QUALITY_CONFIGS.high.maxSteps;
  private diskQuality = QUALITY_CONFIGS.high.diskQuality;
  private bloomEnabled = QUALITY_CONFIGS.high.bloom;
  private dprMax = QUALITY_CONFIGS.high.dprMax;
  private viewportW = 1280;
  private viewportH = 720;
  private autoScaleTimer = 0;

  // Smooth logarithmic radial & orbit camera state
  private currentR = DEFAULT_R_RS;
  private targetR = DEFAULT_R_RS;
  private orbitYaw = 0.24;
  private targetYaw = 0.24;
  private orbitPitch = 0.21;
  private targetPitch = 0.21;

  // Relativistic visual state
  private thrustSignal = 0;
  private shuttlePitchOffset = 0;
  private shuttleRollOffset = 0;
  private escapeBlockedTimer = 0;
  private currentSpaghetti = 0.0;
  private currentStretchFactor = 1.0;
  private currentRedshiftRatio = 0.0;
  private currentHawkingFreeze = 0.0;

  // Dual relativistic clocks
  private shipClockSec = 0;
  private earthClockSec = 0;
  private simTime = 0;

  // Pointer drag state
  private isDragging = false;
  private lastPtrX = 0;
  private lastPtrY = 0;

  // Telemetry & lifecycle
  private shuttleLoaded = false;
  private rafId = 0;
  private lastFrameMs = performance.now();
  private fpsAccum = 0;
  private fpsFrames = 0;
  private currentFps = 60;
  private telemetryAccum = 0;
  private disposed = false;

  // Reusable per-frame vectors (ZERO GC allocation!)
  private readonly tmpCamPos = new THREE.Vector3();
  private readonly tmpForward = new THREE.Vector3();
  private readonly tmpRight = new THREE.Vector3();
  private readonly tmpUp = new THREE.Vector3();
  private readonly worldUp = new THREE.Vector3(0, 1, 0);

  constructor(
    private readonly container: HTMLElement,
    private readonly onSnapshot: (snap: EngineSnapshot) => void
  ) {
    this.viewportW = container.clientWidth || window.innerWidth;
    this.viewportH = container.clientHeight || window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.autoClear = false;
    this.renderer.setSize(this.viewportW, this.viewportH);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.dprMax));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    container.appendChild(this.renderer.domElement);

    // Safe HDR HalfFloat detection (falls back cleanly to UnsignedByte if GPU lacks float FBO)
    const gl = this.renderer.getContext();
    const supportsHalfFloat =
      this.renderer.capabilities.isWebGL2 &&
      (!!gl.getExtension('EXT_color_buffer_float') || !!gl.getExtension('EXT_color_buffer_half_float'));
    this.hdrType = supportsHalfFloat ? THREE.HalfFloatType : THREE.UnsignedByteType;

    this.glowTex = createSoftGlowTexture();

    // Pass 1: HDR Geodesic Raytracer + Quarter-Res Separable Optical Bloom
    this.bgScene = new THREE.Scene();
    this.bgCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const rtW = Math.max(360, Math.round(this.viewportW * this.renderScale));
    const rtH = Math.max(220, Math.round(this.viewportH * this.renderScale));
    const rtOpts: THREE.RenderTargetOptions = {
      type: this.hdrType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
      stencilBuffer: false,
    };
    this.bhTarget = new THREE.WebGLRenderTarget(rtW, rtH, rtOpts);

    const bloomW = Math.max(128, Math.round(this.viewportW * 0.25));
    const bloomH = Math.max(96, Math.round(this.viewportH * 0.25));
    this.bloomTargetA = new THREE.WebGLRenderTarget(bloomW, bloomH, rtOpts);
    this.bloomTargetB = new THREE.WebGLRenderTarget(bloomW, bloomH, rtOpts);

    const preset = BLACK_HOLE_MAP[this.params.blackHoleId];
    const initTel = computeObserverTelemetry(preset, this.params.spin, this.currentR);

    this.bhMaterial = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: BLACK_HOLE_FRAGMENT_SHADER,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        uResolution: { value: new THREE.Vector2(rtW, rtH) },
        uTime: { value: 0 },
        uCamPos: { value: new THREE.Vector3(0, 3, DEFAULT_R_RS) },
        uCamBasis: { value: new THREE.Matrix3() },
        uFovRad: { value: THREE.MathUtils.degToRad(50) },
        uSpin: { value: this.params.spin },
        uRPlus: { value: initTel.radii.rPlusRs },
        uRisco: { value: initTel.radii.rIscoProRs },
        uRPhoton: { value: initTel.radii.rPhotonProRs },
        uDiskTempK: { value: preset.diskPeakTempK },
        uDiskExp: { value: preset.diskExposure },
        uDopplerOn: { value: 1.0 },
        uGridOn: { value: 0.0 },
        uJetPower: { value: preset.jetPower },
        uHawkingOn: { value: 0.0 },
        uStarBoost: { value: 1.35 },
        uInfallBeta: { value: 0.0 },
        uMaxSteps: { value: this.currentMaxSteps },
        uDiskQuality: { value: this.diskQuality },
      },
    });
    const quadGeo = new THREE.PlaneGeometry(2, 2);
    this.bgScene.add(new THREE.Mesh(quadGeo, this.bhMaterial));

    this.bloomScene = new THREE.Scene();
    this.bloomMat = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: BLOOM_BLUR_FRAG,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        tInput: { value: this.bhTarget.texture },
        uTexelDir: { value: new THREE.Vector2(1 / bloomW, 0) },
        uThreshold: { value: 0.85 },
      },
    });
    this.bloomScene.add(new THREE.Mesh(quadGeo, this.bloomMat));

    this.compositeScene = new THREE.Scene();
    this.compositeMat = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: COMPOSITE_FRAG,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        tScene: { value: this.bhTarget.texture },
        tBloom: { value: this.bloomTargetB.texture },
        uBloomStrength: { value: this.bloomEnabled ? 0.34 : 0.0 },
      },
    });
    this.compositeScene.add(new THREE.Mesh(quadGeo, this.compositeMat));

    // Pass 2: Crisp 100% Native-Resolution 3D NASA Space Shuttle + Tidal Disruption Plasma Stream + Cockpit
    this.fgScene = new THREE.Scene();
    this.fgCamera = new THREE.PerspectiveCamera(50, this.viewportW / this.viewportH, 0.05, 100);
    this.fgCamera.position.set(0, 0, 0);

    this.spaceAmbient = new THREE.HemisphereLight(0xb8d4ff, 0x261d18, 0.88);
    this.diskKeyLight = new THREE.DirectionalLight(0xffe6c7, 2.85);
    this.diskKeyLight.position.set(0.0, 2.2, -8.0);
    this.blueDopplerRim = new THREE.DirectionalLight(0x7fd4ff, 2.7);
    this.blueDopplerRim.position.set(-7.5, 2.5, -2.5);
    this.redRecedingRim = new THREE.DirectionalLight(0xff7d3b, 1.9);
    this.redRecedingRim.position.set(7.5, -0.8, -2.5);
    this.aftFillLight = new THREE.DirectionalLight(0xcbd8ec, 1.25);
    this.aftFillLight.position.set(2.2, 4.2, 6.5);

    this.fgScene.add(
      this.spaceAmbient,
      this.diskKeyLight,
      this.blueDopplerRim,
      this.redRecedingRim,
      this.aftFillLight
    );

    this.shuttleRoot.position.set(-0.18, -1.04, -4.35);
    this.shuttleRoot.add(this.shuttleModelHolder);
    this.fgScene.add(this.shuttleRoot);

    // Build GPU Tidal Disruption Plasma & Stripped Thermal-Tile Debris Stream (460 particles)
    const debrisCount = 460;
    const debrisGeo = new THREE.BufferGeometry();
    const posArr = new Float32Array(debrisCount * 3);
    const phaseArr = new Float32Array(debrisCount);
    const spreadArr = new Float32Array(debrisCount);
    const sizeArr = new Float32Array(debrisCount);
    for (let i = 0; i < debrisCount; i++) {
      phaseArr[i] = Math.random();
      spreadArr[i] = Math.random();
      sizeArr[i] = 0.045 + Math.random() * 0.095;
    }
    debrisGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    debrisGeo.setAttribute('aPhase', new THREE.BufferAttribute(phaseArr, 1));
    debrisGeo.setAttribute('aSpread', new THREE.BufferAttribute(spreadArr, 1));
    debrisGeo.setAttribute('aSize', new THREE.BufferAttribute(sizeArr, 1));
    this.debrisMat = new THREE.ShaderMaterial({
      vertexShader: DEBRIS_VERT,
      fragmentShader: DEBRIS_FRAG,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 0 },
        uOrigin: { value: this.shuttleRoot.position.clone() },
        uStretch: { value: 0 },
        uTwist: { value: 0 },
        uRedshift: { value: 0 },
      },
    });
    this.debrisPoints = new THREE.Points(debrisGeo, this.debrisMat);
    this.debrisPoints.frustumCulled = false;
    this.fgScene.add(this.debrisPoints);

    this.buildCockpitCanopy();
    this.cockpitGroup.visible = false;
    this.fgScene.add(this.cockpitGroup);

    void this.loadNasaSpaceShuttle();

    this.bindEvents();
    this.emitSnapshot();
    this.lastFrameMs = performance.now();
    this.loop(this.lastFrameMs);
  }

  private applyQualityConfig(cfg: QualityPresetConfig): void {
    this.renderScale = cfg.scale;
    this.currentMaxSteps = cfg.maxSteps;
    this.diskQuality = cfg.diskQuality;
    this.bloomEnabled = cfg.bloom;
    this.dprMax = cfg.dprMax;

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.dprMax));
    this.bhMaterial.uniforms.uMaxSteps.value = this.currentMaxSteps;
    this.bhMaterial.uniforms.uDiskQuality.value = this.diskQuality;
    this.compositeMat.uniforms.uBloomStrength.value = this.bloomEnabled ? 0.34 : 0.0;
    this.resizeRaytracerTarget();
  }

  private resizeRaytracerTarget(): void {
    const rtW = Math.max(360, Math.round(this.viewportW * this.renderScale));
    const rtH = Math.max(220, Math.round(this.viewportH * this.renderScale));
    if (this.bhTarget.width !== rtW || this.bhTarget.height !== rtH) {
      this.bhTarget.setSize(rtW, rtH);
      this.bhMaterial.uniforms.uResolution.value.set(rtW, rtH);
    }
    const bloomW = Math.max(128, Math.round(this.viewportW * 0.25));
    const bloomH = Math.max(96, Math.round(this.viewportH * 0.25));
    if (this.bloomTargetA.width !== bloomW || this.bloomTargetA.height !== bloomH) {
      this.bloomTargetA.setSize(bloomW, bloomH);
      this.bloomTargetB.setSize(bloomW, bloomH);
    }
  }

  /**
   * Injects TRUE NON-LINEAR WEYL CURVATURE SPAGHETTIFICATION + GRAVITATIONAL REDSHIFT
   * + TIDAL SHEAR INCANDESCENCE + HAWKING HORIZON FADE directly into every NASA Shuttle PBR shader!
   */
  private patchMaterialForRelativity(std: THREE.MeshStandardMaterial): void {
    std.roughness = Math.min(0.66, Math.max(0.24, std.roughness));
    std.metalness = Math.min(0.52, Math.max(0.10, std.metalness));
    std.transparent = true; // allows Hawking asymptotic horizon transparency fade!
    std.customProgramCacheKey = () => 'nasa_shuttle_weyl_spaghetti_v5';

    std.onBeforeCompile = (shader) => {
      shader.uniforms.uShuttleCenter = this.weylUniforms.uShuttleCenter;
      shader.uniforms.uSpaghetti = this.weylUniforms.uSpaghetti;
      shader.uniforms.uTwist = this.weylUniforms.uTwist;
      shader.uniforms.uRedshift = this.weylUniforms.uRedshift;
      shader.uniforms.uHorizonFade = this.weylUniforms.uHorizonFade;
      shader.uniforms.uTidalHeat = this.weylUniforms.uTidalHeat;
      shader.uniforms.uSimTime = this.weylUniforms.uSimTime;

      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          /* glsl */ `
          #include <common>
          uniform vec3 uShuttleCenter;
          uniform float uSpaghetti;
          uniform float uTwist;
          uniform float uSimTime;
          varying float vWeylS;
          `
        )
        .replace(
          '#include <project_vertex>',
          /* glsl */ `
          vec4 mvPosition = vec4( transformed, 1.0 );
          #ifdef USE_INSTANCING
            mvPosition = instanceMatrix * mvPosition;
          #endif
          mvPosition = modelViewMatrix * mvPosition;

          // Exact non-linear Weyl 1/r^3 tidal deformation in camera/shuttle frame (seamless across all 42 NASA meshes!)
          vec3 relS = mvPosition.xyz - uShuttleCenter;
          // s = 0.0 at aft tail engines (+1.22), s = 1.0 at forward nose tip closest to Black Hole (-1.22)
          float sWeyl = clamp((1.22 - relS.z) / 2.44, 0.0, 1.0);
          vWeylS = sWeyl;

          if (uSpaghetti > 0.001) {
            // Non-linear radial stretching: nose pulls violently faster into a thin noodle toward the Black Hole!
            float pullFwd = uSpaghetti * (0.24 * sWeyl + 1.42 * pow(sWeyl, 1.92)) * 2.15;
            float pullAft = uSpaghetti * 0.22 * (1.0 - sWeyl);

            // Transverse geodesic convergence (wings & fuselage crush radically inward conserving/pinching cross-section!)
            float pinch = 1.0 / pow(1.0 + uSpaghetti * (0.55 + 2.45 * pow(sWeyl, 1.28)), 0.65);

            // Kerr Lense-Thirring helical frame-dragging torsion + micro tidal resonance
            float twistAng = uTwist * pow(sWeyl, 1.35) * 1.55;
            float csT = cos(twistAng);
            float snT = sin(twistAng);
            vec2 xyPinched = mat2(csT, -snT, snT, csT) * (relS.xy * pinch);

            // Elongated spaghetti filament arcs upward straight toward the Black Hole shadow mouth!
            float arcY = uSpaghetti * pow(sWeyl, 2.05) * 0.44;
            float arcX = uSpaghetti * pow(sWeyl, 1.95) * 0.14;

            relS.x = xyPinched.x + arcX;
            relS.y = xyPinched.y + arcY;
            relS.z = relS.z - pullFwd + pullAft * 0.2;
            mvPosition.xyz = uShuttleCenter + relS;
          }

          gl_Position = projectionMatrix * mvPosition;
          `
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          /* glsl */ `
          #include <common>
          uniform float uRedshift;
          uniform float uHorizonFade;
          uniform float uTidalHeat;
          uniform float uSimTime;
          varying float vWeylS;
          `
        )
        .replace(
          '#include <dithering_fragment>',
          /* glsl */ `
          // 1. Structural tidal compression & shear incandescence (strongest on hyper-stretched nose!)
          if (uTidalHeat > 0.005) {
            float noseHot = pow(clamp(vWeylS, 0.0, 1.0), 1.45);
            float stressPulse = 0.85 + 0.15 * sin(vWeylS * 28.0 - uSimTime * 11.0);
            vec3 thermal = mix(vec3(0.95, 0.22, 0.04), vec3(1.0, 0.86, 0.52), noseHot * uTidalHeat);
            gl_FragColor.rgb += thermal * uTidalHeat * (0.28 + 1.15 * noseHot) * stressPulse;
          }

          // 2. Exact Relativistic Gravitational Redshift (white -> amber -> crimson -> dim infrared at r_+)
          if (uRedshift > 0.005) {
            float rScale = 1.0 - uRedshift * 0.16;
            float gScale = max(0.09, 1.0 - uRedshift * 0.88);
            float bScale = max(0.05, 1.0 - uRedshift * 0.94);
            // Nose closer to horizon redshifts even slightly faster than tail!
            float localZ = clamp(uRedshift * (0.85 + 0.28 * vWeylS), 0.0, 1.0);
            vec3 zTint = mix(vec3(1.0), vec3(rScale, gScale, bScale), localZ);
            gl_FragColor.rgb *= zTint * mix(1.0, 0.45, localZ);
          }

          // 3. Stephen Hawking Distant-Observer Asymptotic Horizon Dimming (I ∝ exp(-t / 4M))
          gl_FragColor.rgb *= uHorizonFade;
          gl_FragColor.a *= clamp(0.24 + 0.76 * uHorizonFade, 0.22, 1.0);

          #include <dithering_fragment>
          `
        );
    };

    std.needsUpdate = true;
  }

  private async loadNasaSpaceShuttle(): Promise<void> {
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');
    loader.setDRACOLoader(dracoLoader);

    try {
      const orbiterGltf = await loader.loadAsync('/models/space_shuttle.glb');
      dracoLoader.dispose();
      if (this.disposed) return;

      const orbiter = orbiterGltf.scene;
      const patchedMats = new Set<THREE.Material>();

      orbiter.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          // Prevent frustum culling when vertices stretch dramatically into a long spaghetti filament!
          mesh.frustumCulled = false;
          const handleMat = (m: THREE.Material) => {
            if ((m as THREE.MeshStandardMaterial).isMeshStandardMaterial && !patchedMats.has(m)) {
              patchedMats.add(m);
              this.patchMaterialForRelativity(m as THREE.MeshStandardMaterial);
            }
          };
          if (Array.isArray(mesh.material)) mesh.material.forEach(handleMat);
          else if (mesh.material) handleMat(mesh.material);
        }
      });

      orbiter.updateMatrixWorld(true);
      const rawBox = new THREE.Box3().setFromObject(orbiter);
      const rawSize = new THREE.Vector3();
      const rawCenter = new THREE.Vector3();
      rawBox.getSize(rawSize);
      rawBox.getCenter(rawCenter);

      const maxDim = Math.max(rawSize.x, rawSize.y, rawSize.z, 1);
      const normScale = 2.40 / maxDim;

      const centered = new THREE.Group();
      orbiter.position.set(-rawCenter.x, -rawCenter.y, -rawCenter.z);
      centered.add(orbiter);

      centered.rotation.order = 'YXZ';
      centered.rotation.x = -Math.PI / 2;
      centered.rotation.y = Math.PI / 2;
      centered.scale.setScalar(normScale);

      this.shuttleModelHolder.add(centered);

      centered.updateMatrixWorld(true);
      const nBox = new THREE.Box3().setFromObject(centered);
      const nSize = new THREE.Vector3();
      nBox.getSize(nSize);

      const aftZ = nBox.max.z;
      const wingHalfX = (nBox.max.x - nBox.min.x) * 0.5;
      const hullH = nSize.y;

      // Soft volumetric GLSL exhaust plumes pointing aft (+Z) out of the built-in 3 SSME + 2 OMS nozzles
      const plumeDefs: [number, number, number, number, number][] = [
        [0.0, nBox.min.y + hullH * 0.36, aftZ - 0.14, 0.088, 0.65],
        [-0.092, nBox.min.y + hullH * 0.22, aftZ - 0.12, 0.084, 0.62],
        [0.092, nBox.min.y + hullH * 0.22, aftZ - 0.12, 0.084, 0.62],
        [-0.175, nBox.min.y + hullH * 0.41, aftZ - 0.20, 0.044, 0.42],
        [0.175, nBox.min.y + hullH * 0.41, aftZ - 0.20, 0.044, 0.42],
      ];

      for (const [px, py, pz, rNozzle, len] of plumeDefs) {
        const geo = new THREE.CylinderGeometry(rNozzle, rNozzle * 0.03, len, 16, 1, true);
        geo.translate(0, -len * 0.5, 0);
        geo.rotateX(Math.PI / 2);

        const mat = new THREE.ShaderMaterial({
          vertexShader: PLUME_VERT,
          fragmentShader: PLUME_FRAG,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
          uniforms: {
            uColorCore: { value: new THREE.Color(0xe0f2fe) },
            uColorOuter: { value: new THREE.Color(0x38bdf8) },
            uIntensity: { value: 0.16 },
            uTime: { value: 0 },
          },
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(px, py, pz);
        this.shuttleModelHolder.add(mesh);
        this.plumeMeshes.push(mesh);
        this.plumeBasePos.push(new THREE.Vector3(px, py, pz));
        this.plumeMats.push(mat);
      }

      // Flush wingtip & tail-fin Time-Dilated Navigation Beacons (visibly freeze in Hawking mode at r_+!)
      const strobeDefs: [number, number, number, number][] = [
        [-wingHalfX * 0.96, nBox.min.y + hullH * 0.15, aftZ * 0.56, 0xff3b30],
        [wingHalfX * 0.96, nBox.min.y + hullH * 0.15, aftZ * 0.56, 0x22c55e],
        [0.0, nBox.max.y * 0.98, aftZ * 0.72, 0xf8fafc],
      ];

      const coreGeo = new THREE.SphereGeometry(0.0085, 8, 8);
      for (const [bx, by, bz, hex] of strobeDefs) {
        const grp = new THREE.Group();
        grp.position.set(bx, by, bz);

        const coreMat = new THREE.MeshBasicMaterial({
          color: hex,
          transparent: true,
          opacity: 0.95,
          depthWrite: false,
        });
        const coreDot = new THREE.Mesh(coreGeo, coreMat);

        const spriteMat = new THREE.SpriteMaterial({
          map: this.glowTex,
          color: hex,
          transparent: true,
          opacity: 0.72,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const halo = new THREE.Sprite(spriteMat);
        halo.scale.set(0.088, 0.088, 1);

        grp.add(coreDot, halo);
        this.shuttleModelHolder.add(grp);
        this.strobeGroups.push(grp);
        this.strobeBasePos.push(new THREE.Vector3(bx, by, bz));
        this.strobeCoreMats.push(coreMat);
        this.strobeSpriteMats.push(spriteMat);
      }

      this.shuttleLoaded = true;
      this.emitSnapshot();
    } catch (err) {
      dracoLoader.dispose();
      console.error('[EventHorizon] NASA Space Shuttle GLB load error:', err);
      this.shuttleLoaded = true;
      this.emitSnapshot();
    }
  }

  private buildCockpitCanopy(): void {
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x222836,
      roughness: 0.42,
      metalness: 0.78,
    });
    const innerTrimMat = new THREE.MeshStandardMaterial({
      color: 0x353f54,
      roughness: 0.35,
      metalness: 0.85,
    });
    const hudCyanMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const glareShield = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.24, 0.32), frameMat);
    glareShield.position.set(0, -0.62, -1.42);
    glareShield.rotation.x = 0.22;
    this.cockpitGroup.add(glareShield);

    const dashGlow = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.008, 0.015), hudCyanMat);
    dashGlow.position.set(0, -0.495, -1.27);
    this.cockpitGroup.add(dashGlow);

    const browBeam = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.16, 0.22), frameMat);
    browBeam.position.set(0, 0.64, -1.42);
    browBeam.rotation.x = -0.18;
    this.cockpitGroup.add(browBeam);

    const mullionGeo = new THREE.BoxGeometry(0.068, 1.42, 0.12);
    const leftMullion = new THREE.Mesh(mullionGeo, innerTrimMat);
    leftMullion.position.set(-0.92, 0.01, -1.40);
    leftMullion.rotation.z = -0.22;
    leftMullion.rotation.y = 0.25;

    const rightMullion = new THREE.Mesh(mullionGeo, innerTrimMat);
    rightMullion.position.set(0.92, 0.01, -1.40);
    rightMullion.rotation.z = 0.22;
    rightMullion.rotation.y = -0.25;

    const reticleRing = new THREE.Mesh(new THREE.RingGeometry(0.055, 0.060, 32), hudCyanMat);
    reticleRing.position.set(0, 0.02, -1.35);

    const tickL = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.003), hudCyanMat);
    tickL.position.set(-0.15, 0.02, -1.35);
    const tickR = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.003), hudCyanMat);
    tickR.position.set(0.15, 0.02, -1.35);

    this.cockpitGroup.add(leftMullion, rightMullion, reticleRing, tickL, tickR);
  }

  // --- Public Controls API ---
  public updateParams(patch: Partial<SimParams>): void {
    const prevBh = this.params.blackHoleId;
    Object.assign(this.params, patch);

    if (patch.blackHoleId && patch.blackHoleId !== prevBh && patch.spin === undefined) {
      this.params.spin = BLACK_HOLE_MAP[patch.blackHoleId].defaultSpin;
    }

    if (patch.observerMode) {
      const isCockpit = this.params.observerMode === 'cockpit';
      this.shuttleRoot.visible = !isCockpit;
      this.debrisPoints.visible = !isCockpit;
      this.cockpitGroup.visible = isCockpit;
    }

    if (patch.quality) {
      if (patch.quality === 'auto') {
        this.applyQualityConfig(QUALITY_CONFIGS.medium);
      } else {
        this.applyQualityConfig(QUALITY_CONFIGS[patch.quality]);
      }
    }

    this.emitSnapshot();
  }

  public setTargetRadiusRs(rInRs: number): void {
    const clamped = THREE.MathUtils.clamp(rInRs, MIN_R_RS, MAX_R_RS);
    const preset = BLACK_HOLE_MAP[this.params.blackHoleId];
    const tel = computeObserverTelemetry(preset, this.params.spin, this.currentR);

    if (this.params.hardHorizonLock && tel.insideHorizon && clamped > this.currentR) {
      this.escapeBlockedTimer = 2.0;
      this.thrustSignal = 1.0;
      this.emitSnapshot();
      return;
    }

    this.thrustSignal = clamped > this.targetR ? 0.9 : -0.65;
    this.targetR = clamped;
  }

  public resetOrbit(): void {
    this.params.autoFreeFall = false;
    this.targetR = DEFAULT_R_RS;
    this.currentR = DEFAULT_R_RS;
    this.targetYaw = 0.24;
    this.targetPitch = 0.21;
    this.shipClockSec = 0;
    this.earthClockSec = 0;
    this.escapeBlockedTimer = 0;
    this.emitSnapshot();
  }

  public getParams(): SimParams {
    return { ...this.params };
  }

  // --- Input Handling ---
  private readonly handleWheel = (e: WheelEvent): void => {
    if ((e.target as HTMLElement)?.closest('.dossier-drawer, .scrollable-panel')) return;
    e.preventDefault();

    const preset = BLACK_HOLE_MAP[this.params.blackHoleId];
    const tel = computeObserverTelemetry(preset, this.params.spin, this.currentR);

    const logStep = e.deltaY * 0.00145;
    if (this.params.hardHorizonLock && tel.insideHorizon && logStep < 0) {
      this.escapeBlockedTimer = 2.0;
      this.thrustSignal = 1.0;
      this.emitSnapshot();
      return;
    }

    if (this.params.autoFreeFall && Math.abs(e.deltaY) > 6) {
      this.params.autoFreeFall = false;
    }

    const nextLog = Math.log(this.targetR) - logStep;
    this.targetR = THREE.MathUtils.clamp(Math.exp(nextLog), MIN_R_RS, MAX_R_RS);
    this.thrustSignal = THREE.MathUtils.clamp(-Math.sign(e.deltaY) * 0.95, -1, 1);
  };

  private readonly handlePointerDown = (e: PointerEvent): void => {
    if (e.button !== 0 && e.button !== 2) return;
    if ((e.target as HTMLElement) !== this.renderer.domElement) return;
    this.isDragging = true;
    this.lastPtrX = e.clientX;
    this.lastPtrY = e.clientY;
    this.renderer.domElement.setPointerCapture(e.pointerId);
  };

  private readonly handlePointerMove = (e: PointerEvent): void => {
    if (!this.isDragging) return;
    const dx = e.clientX - this.lastPtrX;
    const dy = e.clientY - this.lastPtrY;
    this.lastPtrX = e.clientX;
    this.lastPtrY = e.clientY;

    this.targetYaw -= dx * 0.0052;
    this.targetPitch = THREE.MathUtils.clamp(this.targetPitch + dy * 0.0048, -1.18, 1.18);
    this.shuttleRollOffset = THREE.MathUtils.clamp(this.shuttleRollOffset - dx * 0.004, -0.45, 0.45);
  };

  private readonly handlePointerUp = (): void => {
    this.isDragging = false;
  };

  private readonly handleResize = (): void => {
    this.viewportW = this.container.clientWidth || window.innerWidth;
    this.viewportH = this.container.clientHeight || window.innerHeight;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.dprMax));
    this.renderer.setSize(this.viewportW, this.viewportH);
    this.fgCamera.aspect = this.viewportW / this.viewportH;
    this.fgCamera.updateProjectionMatrix();
    this.resizeRaytracerTarget();
  };

  private bindEvents(): void {
    const dom = this.renderer.domElement;
    window.addEventListener('wheel', this.handleWheel, { passive: false });
    dom.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    window.addEventListener('pointercancel', this.handlePointerUp);
    dom.addEventListener('contextmenu', (e) => e.preventDefault());
    dom.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      // Gracefully step down quality if GPU watchdog interrupts context
      this.applyQualityConfig(QUALITY_CONFIGS.low);
    });
    window.addEventListener('resize', this.handleResize);
  }

  private emitSnapshot(): void {
    const preset = BLACK_HOLE_MAP[this.params.blackHoleId];
    const telemetry = computeObserverTelemetry(preset, this.params.spin, this.currentR);
    this.onSnapshot({
      telemetry,
      shuttleState: {
        stretchFactor: this.currentStretchFactor,
        redshiftRatio: this.currentRedshiftRatio,
        hawkingFreezeRatio: this.currentHawkingFreeze,
        renderScale: this.renderScale,
        bloomActive: this.bloomEnabled,
      },
      fps: this.currentFps,
      shipClockSec: this.shipClockSec,
      earthClockSec: this.earthClockSec,
      shuttleLoaded: this.shuttleLoaded,
      escapeBlockedFlash: this.escapeBlockedTimer > 0,
      params: { ...this.params },
    });
  }

  private readonly loop = (nowMs: number): void => {
    if (this.disposed) return;
    this.rafId = requestAnimationFrame(this.loop);

    const dt = Math.min(0.05, Math.max(0.001, (nowMs - this.lastFrameMs) / 1000));
    this.lastFrameMs = nowMs;
    this.simTime += dt;

    const preset = BLACK_HOLE_MAP[this.params.blackHoleId];

    // FPS counter + Optional Auto-FPS Governor (ONLY active when user selects quality === 'auto'!)
    this.fpsFrames++;
    this.fpsAccum += dt;
    if (this.fpsAccum >= 0.45) {
      this.currentFps = Math.round(this.fpsFrames / this.fpsAccum);
      this.fpsFrames = 0;
      this.fpsAccum = 0;

      if (this.params.quality === 'auto') {
        this.autoScaleTimer += 0.45;
        if (this.autoScaleTimer >= 0.9) {
          this.autoScaleTimer = 0;
          const rPlusCur = computeObserverTelemetry(preset, this.params.spin, this.currentR).radii.rPlusRs;
          const isInterior = this.currentR <= rPlusCur * 1.02;
          if (this.currentFps < 44 && this.renderScale > 0.50) {
            this.renderScale = Math.max(0.50, Number((this.renderScale - 0.06).toFixed(2)));
            this.currentMaxSteps = Math.max(68, this.currentMaxSteps - 10);
            this.bhMaterial.uniforms.uMaxSteps.value = this.currentMaxSteps;
            if (this.currentFps < 30 && this.bloomEnabled) {
              this.bloomEnabled = false;
              this.compositeMat.uniforms.uBloomStrength.value = 0.0;
            }
            this.resizeRaytracerTarget();
          } else if (!isInterior && this.currentFps >= 56 && this.renderScale < 0.88) {
            this.renderScale = Math.min(0.88, Number((this.renderScale + 0.04).toFixed(2)));
            this.currentMaxSteps = Math.min(124, this.currentMaxSteps + 6);
            this.bhMaterial.uniforms.uMaxSteps.value = this.currentMaxSteps;
            if (!this.bloomEnabled) {
              this.bloomEnabled = true;
              this.compositeMat.uniforms.uBloomStrength.value = 0.34;
            }
            this.resizeRaytracerTarget();
          }
        }
      }
    }

    // Auto Free-Fall radial plunge
    if (this.params.autoFreeFall) {
      const pullRate = 0.30 * Math.sqrt(1 / Math.max(0.18, this.targetR));
      this.targetR = Math.max(MIN_R_RS, this.targetR * Math.exp(-pullRate * dt));
      this.thrustSignal = -0.35;
      if (this.targetR <= MIN_R_RS + 0.001) {
        this.params.autoFreeFall = false;
      }
    }

    // Smooth logarithmic radial & angular interpolation
    const damp = 1 - Math.exp(-6.8 * dt);
    const curLog = Math.log(this.currentR);
    const tgtLog = Math.log(this.targetR);
    this.currentR = Math.exp(curLog + (tgtLog - curLog) * damp);

    this.orbitYaw += (this.targetYaw - this.orbitYaw) * damp;
    this.orbitPitch += (this.targetPitch - this.orbitPitch) * damp;

    const tel = computeObserverTelemetry(preset, this.params.spin, this.currentR);
    const isHawkingMode = this.params.observerMode === 'hawking';

    // Dual Relativistic Clocks
    this.shipClockSec += dt;
    if (Number.isFinite(tel.earthSecondsPerShipSecond)) {
      this.earthClockSec += dt * Math.min(tel.earthSecondsPerShipSecond, 1e5);
    }

    // Time-dilated strobe frequency (freezes dead-still at Event Horizon!)
    const strobeDilate = tel.insideHorizon ? 0.0 : Math.max(0.03, tel.staticTimeDilation);
    this.strobePhase += dt * 4.2 * strobeDilate;

    this.thrustSignal *= Math.exp(-4.2 * dt);
    this.shuttleRollOffset *= Math.exp(-4.5 * dt);
    if (this.escapeBlockedTimer > 0) {
      this.escapeBlockedTimer = Math.max(0, this.escapeBlockedTimer - dt);
    }

    // In Hawking External Observer mode, the distant camera stays just outside r_+ watching the Shuttle
    // asymptotically freeze, redshift, and fade on the horizon even as the Shuttle's radial coordinate plunges!
    const effectiveCamR = isHawkingMode
      ? Math.max(this.currentR, tel.radii.rPlusRs * 1.65)
      : this.currentR;

    const cosP = Math.cos(this.orbitPitch);
    this.tmpCamPos.set(
      effectiveCamR * cosP * Math.sin(this.orbitYaw),
      effectiveCamR * Math.sin(this.orbitPitch),
      effectiveCamR * cosP * Math.cos(this.orbitYaw)
    );

    this.tmpForward.copy(this.tmpCamPos).negate().normalize();
    this.tmpRight.crossVectors(this.tmpForward, this.worldUp).normalize();
    this.tmpUp.crossVectors(this.tmpRight, this.tmpForward).normalize();

    // Structural tidal shudder (damped in Hawking freeze mode as distant observer sees motion slow down!)
    const motionDilation = isHawkingMode ? Math.max(0.05, tel.staticTimeDilation) : 1.0;
    const tidalShakeAmp =
      tel.tidalShuttleG > 10
        ? Math.min(0.022, Math.log10(1 + tel.tidalShuttleG / 10) * 0.0038) * motionDilation
        : 0;
    const shakeX = (Math.random() - 0.5) * tidalShakeAmp;
    const shakeY = (Math.random() - 0.5) * tidalShakeAmp;

    // Update Geodesic Raytracer Uniforms
    const basis = this.bhMaterial.uniforms.uCamBasis.value as THREE.Matrix3;
    basis.set(
      this.tmpRight.x, this.tmpUp.x, this.tmpForward.x + shakeX,
      this.tmpRight.y, this.tmpUp.y, this.tmpForward.y + shakeY,
      this.tmpRight.z, this.tmpUp.z, this.tmpForward.z
    );

    const u = this.bhMaterial.uniforms;
    u.uTime.value = this.simTime;
    u.uCamPos.value.copy(this.tmpCamPos);
    u.uSpin.value = this.params.spin;
    u.uRPlus.value = tel.radii.rPlusRs;
    u.uRisco.value = tel.radii.rIscoProRs;
    u.uRPhoton.value = tel.radii.rPhotonProRs;
    u.uDiskTempK.value = preset.diskPeakTempK;
    u.uDiskExp.value = preset.diskExposure;
    u.uDopplerOn.value = this.params.dopplerBeaming ? 1.0 : 0.0;
    u.uGridOn.value = this.params.spacetimeGrid ? 1.0 : 0.0;
    u.uJetPower.value = this.params.relativisticJets ? preset.jetPower : 0.0;
    u.uHawkingOn.value = this.params.hawkingGlow ? 1.0 : 0.0;
    u.uInfallBeta.value = isHawkingMode
      ? Math.min(0.45, Math.sqrt(tel.radii.rPlusRs / Math.max(effectiveCamR, tel.radii.rPlusRs)) * 0.45)
      : Math.min(0.92, Math.sqrt(tel.radii.rPlusRs / Math.max(this.currentR, tel.radii.rPlusRs)) * 0.85);

    // =========================================================================
    // TRUE NON-LINEAR WEYL SPAGHETTIFICATION & STEPHEN HAWKING HORIZON PHYSICS
    // =========================================================================
    // 1. Driven strictly by real physical tidal acceleration across the 37.24m NASA Space Shuttle!
    //    - Initial approach on Cygnus X-1 (18.5 r_s, ~9,000 g) & M87* horizon (< 1e-8 g): 1.00x INTACT!
    //    - Scrolling inward on Cygnus X-1 (> 10,000 g -> 5.8e8 g) OR deep Sgr A* interior (r -> 0.004 r_s, 33,100 g):
    //      uSpaghetti climbs smoothly 0.0 -> 5.2 -> dramatic razor-thin glowing spaghetti filament!
    const rawSpaghetti =
      tel.tidalShuttleG > 9500
        ? Math.min(5.2, Math.pow(Math.log10(tel.tidalShuttleG / 9500), 1.05) * 1.02)
        : 0.0;
    this.currentSpaghetti += (rawSpaghetti - this.currentSpaghetti) * Math.min(1, dt * 6.5);
    this.currentStretchFactor = 1.0 + this.currentSpaghetti * 2.1;

    // 2. Real Gravitational Redshift (strongest in Hawking External Observer mode!)
    const dilation = tel.insideHorizon ? 0.02 : tel.staticTimeDilation;
    const targetRedshift = THREE.MathUtils.clamp((0.92 - dilation) / 0.88, 0, 1);
    this.currentRedshiftRatio += (targetRedshift - this.currentRedshiftRatio) * Math.min(1, dt * 6);

    // 3. Hawking Distant-Observer Asymptotic Freeze & Exponential Luminosity Decay (I ∝ exp(-t / 4M))
    const targetFreeze = isHawkingMode
      ? THREE.MathUtils.clamp((0.72 - dilation) / 0.72, 0, 1)
      : THREE.MathUtils.clamp((0.35 - dilation) / 0.35, 0, 0.35);
    this.currentHawkingFreeze += (targetFreeze - this.currentHawkingFreeze) * Math.min(1, dt * 5);
    const horizonFade = isHawkingMode ? 1.0 - this.currentHawkingFreeze * 0.68 : 1.0 - this.currentHawkingFreeze * 0.25;

    // 4. Tidal shear heating incandescence (glows molten orange/white-gold along the stretched nose!)
    const tidalHeat = THREE.MathUtils.clamp(this.currentSpaghetti * 0.34, 0, 1.0);

    // 5. Dynamic External-Observer Plunge Position & Zero-G Attitude (visibly freezes in Hawking mode!)
    const plungeNorm = THREE.MathUtils.clamp(
      (Math.log(MAX_R_RS) - Math.log(Math.max(this.currentR, tel.radii.rPlusRs * 0.5))) /
        (Math.log(MAX_R_RS) - Math.log(tel.radii.rPlusRs * 0.5)),
      0,
      1
    );
    const zeroGBob = Math.sin(this.simTime * 1.1 * motionDilation) * 0.032 * motionDilation;
    const zeroGRoll = Math.sin(this.simTime * 0.68 * motionDilation) * 0.025 * motionDilation;
    const targetShuttlePitch = (this.thrustSignal * 0.11 - plungeNorm * 0.12) * motionDilation;
    this.shuttlePitchOffset += (targetShuttlePitch - this.shuttlePitchOffset) * (1 - Math.exp(-5 * dt));

    // As the Shuttle spaghettifies, keep its center cleanly framed so the entire stretched noodle arching into the BH is dramatically visible!
    this.shuttleRoot.position.set(
      -0.18 + shakeX * 2.5,
      -1.06 + plungeNorm * 0.22 + zeroGBob + shakeY * 2.5,
      -4.35 - plungeNorm * 0.55 + this.currentSpaghetti * 0.06 + this.thrustSignal * 0.18
    );
    this.shuttleModelHolder.rotation.set(
      0.12 + this.shuttlePitchOffset,
      0.19 + Math.sin(this.simTime * 0.5 * motionDilation) * 0.02,
      zeroGRoll + this.shuttleRollOffset
    );

    // Push shared Weyl Spaghettification & Hawking Relativity uniforms to all 42 NASA Shuttle PBR shaders!
    this.weylUniforms.uShuttleCenter.value.copy(this.shuttleRoot.position);
    this.weylUniforms.uSpaghetti.value = this.currentSpaghetti;
    this.weylUniforms.uTwist.value = tel.frameDragBeta * this.params.spin * (0.4 + this.currentSpaghetti * 0.35);
    this.weylUniforms.uRedshift.value = this.currentRedshiftRatio;
    this.weylUniforms.uHorizonFade.value = horizonFade;
    this.weylUniforms.uTidalHeat.value = tidalHeat;
    this.weylUniforms.uSimTime.value = this.simTime;

    // Update GPU Tidal Disruption Plasma & Stripped Thermal-Tile Debris Stream!
    const debrisIntensity =
      tel.tidalShuttleG > 11000
        ? THREE.MathUtils.clamp(Math.log10(tel.tidalShuttleG / 11000) * 0.42, 0, 1.0) * horizonFade
        : 0.0;
    this.debrisMat.uniforms.uTime.value = this.simTime * Math.max(0.15, motionDilation);
    this.debrisMat.uniforms.uIntensity.value = debrisIntensity;
    this.debrisMat.uniforms.uOrigin.value.copy(this.shuttleRoot.position);
    this.debrisMat.uniforms.uStretch.value = this.currentSpaghetti;
    this.debrisMat.uniforms.uTwist.value = tel.frameDragBeta * this.params.spin;
    this.debrisMat.uniforms.uRedshift.value = this.currentRedshiftRatio;

    // Cockpit flight deck vibration
    this.cockpitGroup.position.set(shakeX * 1.2, shakeY * 1.2 + zeroGBob * 0.18, 0);
    this.cockpitGroup.rotation.z = zeroGRoll * 0.45 + this.shuttleRollOffset * 0.30;

    // Accretion-Disk Dynamic Illumination on Shuttle Hull
    const proxGlow = THREE.MathUtils.clamp(12 / Math.max(effectiveCamR, 1.0), 0.72, 4.0);
    this.diskKeyLight.intensity = tel.insideHorizon && !isHawkingMode ? 1.15 : 2.3 + proxGlow * 0.72;
    this.blueDopplerRim.intensity = this.params.dopplerBeaming ? 1.9 + proxGlow * 0.85 : 1.3 + proxGlow * 0.45;
    this.redRecedingRim.intensity = this.params.dopplerBeaming ? 1.3 + proxGlow * 0.55 : 1.3 + proxGlow * 0.45;
    this.aftFillLight.intensity = tel.insideHorizon && !isHawkingMode ? 0.85 : 1.28;

    // Soft Volumetric GLSL SSME/OMS Plasma Plumes (pinch in lockstep with aft nozzles during spaghettification!)
    const activeThrust = Math.max(0, this.thrustSignal > 0 ? this.thrustSignal : Math.abs(this.thrustSignal) * 0.45);
    const isRedshiftedPlume = this.escapeBlockedTimer > 0 || this.currentRedshiftRatio > 0.58;
    const aftPinch = 1 / Math.pow(1 + this.currentSpaghetti * 0.58, 0.65);
    for (let i = 0; i < this.plumeMeshes.length; i++) {
      const m = this.plumeMeshes[i];
      const baseP = this.plumeBasePos[i];
      const mat = this.plumeMats[i];
      const isOms = i >= 3;
      m.position.set(baseP.x * aftPinch, baseP.y * aftPinch, baseP.z);
      const scaleLen = (isOms ? 0.52 : 0.65) + activeThrust * (isOms ? 0.95 : 1.7);
      m.scale.set((0.90 + activeThrust * 0.25) * aftPinch, (0.90 + activeThrust * 0.25) * aftPinch, scaleLen);

      mat.uniforms.uTime.value = this.simTime * Math.max(0.08, motionDilation);
      mat.uniforms.uIntensity.value =
        Math.min(0.95, (isOms ? 0.14 : 0.18) + activeThrust * 0.78) * horizonFade;

      if (isRedshiftedPlume) {
        (mat.uniforms.uColorCore.value as THREE.Color).setHex(0xffb4a2);
        (mat.uniforms.uColorOuter.value as THREE.Color).setHex(0xff3b30);
      } else {
        (mat.uniforms.uColorCore.value as THREE.Color).setHex(0xf0f9ff);
        (mat.uniforms.uColorOuter.value as THREE.Color).setHex(0x38bdf8);
      }
    }

    // Flush Wingtip & Tail-Fin Time-Dilated Navigation Beacons (track exact Weyl pinch & freeze at r_+!)
    const pulse = 0.18 + 0.82 * Math.pow(0.5 + 0.5 * Math.sin(this.strobePhase), 4);
    for (let i = 0; i < this.strobeGroups.length; i++) {
      const bp = this.strobeBasePos[i];
      const sLoc = THREE.MathUtils.clamp((1.22 - bp.z) / 2.44, 0, 1);
      const pinchS = 1 / Math.pow(1 + this.currentSpaghetti * (0.55 + 2.45 * Math.pow(sLoc, 1.28)), 0.65);
      const pullZ = this.currentSpaghetti * (0.24 * sLoc + 1.42 * Math.pow(sLoc, 1.92)) * 2.15;
      const arcY = this.currentSpaghetti * Math.pow(sLoc, 2.05) * 0.44;
      this.strobeGroups[i].position.set(bp.x * pinchS, bp.y * pinchS + arcY, bp.z - pullZ);

      const b = (i === 2 ? pulse : 0.55 + 0.45 * pulse) * horizonFade * Math.max(0.15, pinchS);
      this.strobeCoreMats[i].opacity = Math.min(1, b + 0.08);
      this.strobeSpriteMats[i].opacity = b * 0.76;
    }

    this.audio.update(this.currentR, tel.radii.rPlusRs, Math.abs(this.thrustSignal), tel.tidalHumanG);

    // =========================================================================
    // MULTI-PASS HDR RENDERING PIPELINE
    // =========================================================================
    // PASS 1: HDR Geodesic Black Hole Raytracer -> bhTarget
    this.renderer.setRenderTarget(this.bhTarget);
    this.renderer.render(this.bgScene, this.bgCamera);

    // PASS 1B: Quarter-Res Separable Physical Optical Bloom (MED / HIGH / ULTRA)
    if (this.bloomEnabled) {
      const bw = this.bloomTargetA.width;
      const bh = this.bloomTargetA.height;

      this.bloomMat.uniforms.tInput.value = this.bhTarget.texture;
      this.bloomMat.uniforms.uTexelDir.value.set(1.65 / bw, 0.0);
      this.bloomMat.uniforms.uThreshold.value = 0.78;
      this.renderer.setRenderTarget(this.bloomTargetA);
      this.renderer.render(this.bloomScene, this.bgCamera);

      this.bloomMat.uniforms.tInput.value = this.bloomTargetA.texture;
      this.bloomMat.uniforms.uTexelDir.value.set(0.0, 1.65 / bh);
      this.bloomMat.uniforms.uThreshold.value = 0.0;
      this.renderer.setRenderTarget(this.bloomTargetB);
      this.renderer.render(this.bloomScene, this.bgCamera);
    }

    // PASS 1C: HDR + Physical Bloom -> AgX Filmic Tonemapping to Screen
    this.renderer.setRenderTarget(null);
    this.renderer.clear();
    this.renderer.render(this.compositeScene, this.bgCamera);

    // PASS 2: Crisp 100% Native-Resolution 3D NASA Space Shuttle (with Non-Linear Weyl Spaghettification!) + Debris + Cockpit
    this.renderer.clearDepth();
    this.renderer.render(this.fgScene, this.fgCamera);

    // Throttle React telemetry HUD updates (~12 Hz)
    this.telemetryAccum += dt;
    if (this.telemetryAccum >= 0.08) {
      this.telemetryAccum = 0;
      this.emitSnapshot();
    }
  };

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('wheel', this.handleWheel);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    window.removeEventListener('pointercancel', this.handlePointerUp);
    window.removeEventListener('resize', this.handleResize);
    this.audio.dispose();
    this.glowTex.dispose();
    this.bhTarget.dispose();
    this.bloomTargetA.dispose();
    this.bloomTargetB.dispose();
    this.bhMaterial.dispose();
    this.bloomMat.dispose();
    this.compositeMat.dispose();
    this.debrisMat.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
