export type BlackHoleId = 'cygnus_x1' | 'sgr_a' | 'm87' | 'ton_618';

export interface BlackHolePreset {
  id: BlackHoleId;
  nameTr: string;
  nameEn: string;
  code: string;
  catalogRef: string;
  /** Mass in solar masses (M_sun) from published astrophysical measurements */
  massSolar: number;
  /** Default dimensionless Kerr spin parameter a* = Jc / (GM^2) in [0, 0.998] */
  defaultSpin: number;
  /** Distance from Earth in light-years */
  distanceLy: number;
  /** Characteristic inner accretion disk temperature [K] for visual Planck palette */
  diskPeakTempK: number;
  /** Disk visual radiance exposure */
  diskExposure: number;
  /** Relativistic Blandford-Znajek polar jet strength [0..1] */
  jetPower: number;
  /** Real astrophysical observation note */
  noteTr: string;
  noteEn: string;
}

export const BLACK_HOLE_PRESETS: BlackHolePreset[] = [
  {
    id: 'cygnus_x1',
    nameTr: 'Cygnus X-1',
    nameEn: 'Cygnus X-1',
    code: 'CYG X-1',
    catalogRef: 'Miller-Jones et al. 2021 (Science) · Hawking–Thorne 1974',
    massSolar: 21.2,
    defaultSpin: 0.998,
    distanceLy: 7_200,
    diskPeakTempK: 11800,
    diskExposure: 1.08,
    jetPower: 0.65,
    noteTr:
      'Stephen Hawking ile Kip Thorne’un ünlü 1974 bahsine konu olan, Thorne sınırında (a* = 0,998) dönen yıldız kütleli kara delik (r_s = 62,6 km). Gelgit kuvveti 1/M² ile büyüdüğünden mekik olay ufkuna varmadan çok önce gerçek Weyl spagettifikasyonuna uğrar!',
    noteEn:
      'The stellar-mass black hole of Stephen Hawking & Kip Thorne’s famous 1974 bet (a* = 0.998, r_s = 62.6 km). Because horizon tides scale as 1/M², the Shuttle undergoes violent Weyl spaghettification long before reaching r_+.',
  },
  {
    id: 'sgr_a',
    nameTr: 'Sagittarius A*',
    nameEn: 'Sagittarius A*',
    code: 'SGR A*',
    catalogRef: 'GRAVITY 2023 · EHT 2022',
    massSolar: 4.297e6,
    defaultSpin: 0.9,
    distanceLy: 26_673,
    diskPeakTempK: 7600,
    diskExposure: 1.0,
    jetPower: 0.14,
    noteTr:
      'Samanyolu merkezindeki süperkütleli kara delik (4,3 milyon M☉, r_s = 12,7M km). Olay ufkundan sağlam geçilir; ancak Hawking’in açıkladığı gibi tekilliğe (r→0) yaklaşırken Kretschmann eğriliği (1/r⁶) mekiği içeride spagettiye çevirir.',
    noteEn:
      'The Milky Way’s supermassive black hole (4.3M M☉, r_s = 12.7M km). You cross r_+ intact, yet as Hawking explained, Kretschmann curvature (1/r⁶) inevitably spaghettifies the Shuttle deep inside toward r→0.',
  },
  {
    id: 'm87',
    nameTr: 'Messier 87*',
    nameEn: 'Messier 87*',
    code: 'M87*',
    catalogRef: 'EHT Collaboration 2019 · Blandford–Znajek Jet',
    massSolar: 6.5e9,
    defaultSpin: 0.9,
    distanceLy: 53_500_000,
    diskPeakTempK: 5800,
    diskExposure: 1.06,
    jetPower: 1.0,
    noteTr:
      'İnsanlığın doğrudan görüntülediği ilk kara delik ve 5.000 ışık yılı uzunluğundaki göreli jeti. 6,5 milyar M☉ kütlesiyle ufkunda gelgit neredeyse sıfırdır (10⁻¹⁰ g) — Cygnus X-1 ile zıtlığı doğrudan kıyasla!',
    noteEn:
      'The first black hole directly imaged, launching a 5,000-ly relativistic jet. At 6.5 billion M☉ horizon tides are near zero (10⁻¹⁰ g) — compare directly with Cygnus X-1!',
  },
  {
    id: 'ton_618',
    nameTr: 'TON 618',
    nameEn: 'TON 618',
    code: 'TON 618',
    catalogRef: 'Shemmer et al. 2004 · Ge et al. 2019',
    massSolar: 4.07e10,
    defaultSpin: 0.78,
    distanceLy: 10_400_000_000,
    diskPeakTempK: 6800,
    diskExposure: 1.08,
    jetPower: 0.85,
    noteTr:
      'Bilinen en dev ultrakütleli kuasar kara deliklerinden biri (40,7 milyar M☉, r_s ≈ 803 AU). Olay ufkunu geçtikten sonra tekilliğe düşmek saatlerce öz zaman (τ) alır.',
    noteEn:
      'One of the largest ultramassive quasar black holes known (40.7 billion M☉, r_s ≈ 803 AU). After crossing r_+, plunging to the singularity takes hours of proper time.',
  },
];

export const BLACK_HOLE_MAP: Record<BlackHoleId, BlackHolePreset> = {
  cygnus_x1: BLACK_HOLE_PRESETS[0],
  sgr_a: BLACK_HOLE_PRESETS[1],
  m87: BLACK_HOLE_PRESETS[2],
  ton_618: BLACK_HOLE_PRESETS[3],
};
