import React, { useMemo, useState } from 'react';
import katex from 'katex';
import { Lang } from '../i18n/translations';
import { BLACK_HOLE_PRESETS, BlackHolePreset } from '../physics/blackHoles';
import {
  formatDurationSec,
  formatPhysicalDistance,
  formatScientificExp,
  formatTidalG,
  ObserverTelemetry,
  radialTidalAccelMs2,
  schwarzschildRadiusMeters,
} from '../physics/relativity';
import { CONSTANTS } from '../physics/constants';
import { IconClose } from './icons';

interface Props {
  open: boolean;
  lang: Lang;
  preset: BlackHolePreset;
  telemetry: ObserverTelemetry | null;
  onClose: () => void;
}

const MathBlock: React.FC<{ tex: string }> = ({ tex }) => {
  const html = useMemo(
    () =>
      katex.renderToString(tex, {
        displayMode: true,
        throwOnError: false,
      }),
    [tex]
  );
  return <div className="math-block" dangerouslySetInnerHTML={{ __html: html }} />;
};

interface RefItem {
  authors: string;
  year: string;
  title: string;
  journal: string;
  url: string;
  noteTr: string;
  noteEn: string;
}

const ACADEMIC_REFERENCES: RefItem[] = [
  {
    authors: 'Einstein, A.',
    year: '1915',
    title: 'Die Feldgleichungen der Gravitation (Kütleçekim Alan Denklemleri)',
    journal: 'Sitzungsber. Preuss. Akad. Wiss., 844–847',
    url: 'https://einsteinpapers.press.princeton.edu/vol6-trans/129',
    noteTr: 'Uzay-zamanın kütleyle büküldüğünü ortaya koyan Genel Görelilik kuramı.',
    noteEn: 'The founding field equations of General Relativity.',
  },
  {
    authors: 'Schwarzschild, K.',
    year: '1916',
    title: 'Über das Gravitationsfeld eines Massenpunktes nach der Einsteinschen Theorie',
    journal: 'Sitzungsber. Preuss. Akad. Wiss., 189–196 (arXiv:physics/9905030)',
    url: 'https://arxiv.org/abs/physics/9905030',
    noteTr: 'İlk tam kara delik çözümü ve Schwarzschild yarıçapı r_s = 2GM/c².',
    noteEn: 'First exact black hole solution and Schwarzschild radius r_s = 2GM/c².',
  },
  {
    authors: 'Kerr, R. P.',
    year: '1963',
    title: 'Gravitational Field of a Spinning Mass as an Example of Algebraically Special Metrics',
    journal: 'Physical Review Letters 11, 237–238',
    url: 'https://doi.org/10.1103/PhysRevLett.11.237',
    noteTr: 'Dönen kara deliklerin uzay-zaman metriği, ergosfer ve iç ufuk (r_-).',
    noteEn: 'Exact spacetime metric for rotating black holes and ergospheres.',
  },
  {
    authors: 'Penrose, R. (2020 Nobel Fizik Ödülü)',
    year: '1965',
    title: 'Gravitational Collapse and Space-Time Singularities',
    journal: 'Physical Review Letters 14, 57–59',
    url: 'https://doi.org/10.1103/PhysRevLett.14.57',
    noteTr: 'Kara delik oluşumunun ve içindeki tekilliğin Genel Göreliliğin kaçınılmaz sonucu olduğunu kanıtladı.',
    noteEn: 'Proved black hole formation is a robust prediction of General Relativity (2020 Nobel Prize).',
  },
  {
    authors: 'Bardeen, J. M., Press, W. H., & Teukolsky, S. A.',
    year: '1972',
    title: 'Rotating Black Holes: Locally Nonrotating Frames, Energy Extraction, and Scalar Synchrotron Radiation',
    journal: 'The Astrophysical Journal 178, 347–370',
    url: 'https://doi.org/10.1086/151796',
    noteTr: 'ISCO, foton küresi ve Kerr D-şekilli gölge denklemleri.',
    noteEn: 'Exact prograde/retrograde ISCO, photon sphere, and Kerr shadow equations.',
  },
  {
    authors: 'Novikov, I. D., & Thorne, K. S.',
    year: '1973',
    title: 'Astrophysics of Black Holes',
    journal: 'Black Holes (Les Houches), Gordon & Breach, 343–450',
    url: 'https://ui.adsabs.harvard.edu/abs/1973blho.conf..343N',
    noteTr: 'Birikim diskinin sıcaklık profili T(r) ve göreli ışıma modeli.',
    noteEn: 'Relativistic thin accretion disk temperature profile T(r) & radiative model.',
  },
  {
    authors: 'Hawking, S. W.',
    year: '1974 / 1975',
    title: 'Black hole explosions? / Particle creation by black holes',
    journal: 'Nature 248, 30–31 · Commun. Math. Phys. 43, 199–220',
    url: 'https://doi.org/10.1038/248030a0',
    noteTr: 'Hawking radyasyonu, T_H sıcaklığı ve kara deliklerin kuantum buharlaşması.',
    noteEn: 'Discovery of Hawking radiation, black hole temperature T_H, and evaporation.',
  },
  {
    authors: 'Blandford, R. D., & Znajek, R. L.',
    year: '1977',
    title: 'Electromagnetic extraction of energy from Kerr black holes',
    journal: 'MNRAS 179, 433–456',
    url: 'https://doi.org/10.1093/mnras/179.3.433',
    noteTr: 'Dönen kara deliklerin kutuplarından fırlayan dev göreli plazma jetlerinin mekanizması.',
    noteEn: 'Electromagnetic mechanism powering relativistic polar jets from spinning black holes.',
  },
  {
    authors: 'Poisson, E., & Israel, W.',
    year: '1990',
    title: 'Internal structure of black holes (Mass Inflation)',
    journal: 'Physical Review D 41, 1796–1809',
    url: 'https://doi.org/10.1103/PhysRevD.41.1796',
    noteTr: 'Kerr iç ufkunda (Cauchy ufku) kütle şişmesi ve solucan deliğinin neden kararsız olduğu.',
    noteEn: 'Cauchy horizon mass inflation instability inside rotating black holes.',
  },
  {
    authors: 'James, O., von Tunzelmann, E., Franklin, P., & Thorne, K. S.',
    year: '2015',
    title: 'Gravitational lensing by spinning black holes in astrophysics, and in the movie Interstellar',
    journal: 'Classical and Quantum Gravity 32, 065001 (arXiv:1502.03808)',
    url: 'https://arxiv.org/abs/1502.03808',
    noteTr: 'Gerçek zamanlı Kerr ışın izleme ve Interstellar (Gargantua) optik fiziği.',
    noteEn: 'DNGR Kerr raytracing and optical physics behind Interstellar’s Gargantua.',
  },
  {
    authors: 'Event Horizon Telescope (EHT) Collaboration',
    year: '2019 / 2022',
    title: 'First M87 & Sagittarius A* Event Horizon Telescope Results',
    journal: 'The Astrophysical Journal Letters 875:L1 & 930:L12',
    url: 'https://doi.org/10.3847/2041-8213/ab0ec7',
    noteTr: 'İnsanlığın doğrudan çektiği ilk kara delik fotoğrafları (M87* ve Sgr A*).',
    noteEn: 'First direct radio interferometric images of M87* and Sagittarius A*.',
  },
  {
    authors: 'Miller-Jones, J. C. A. et al.',
    year: '2021',
    title: 'Cygnus X-1 contains a 21–solar mass black hole — Implications for massive star winds',
    journal: 'Science 371 (6533), 1046–1049',
    url: 'https://doi.org/10.1126/science.abb3363',
    noteTr: 'Cygnus X-1’in güncel 21,2 M☉ kütlesi ve a* > 0,998 ekstrem dönüş ölçümü.',
    noteEn: 'Updated 21.2 M☉ mass and near-extremal spin a* > 0.998 measurement of Cygnus X-1.',
  },
  {
    authors: 'Almheiri, A., Hartman, T., Maldacena, J., Shaghoulian, E., & Tajdini, A.',
    year: '2020',
    title: 'The entropy of Hawking radiation (Quantum Islands & Page Curve)',
    journal: 'Reviews of Modern Physics 93, 035002 (arXiv:2006.06872)',
    url: 'https://arxiv.org/abs/2006.06872',
    noteTr: 'Kara delik bilgi paradoksunda modern Kuantum Ada (Page Eğrisi) çözümü.',
    noteEn: 'Modern quantum extremal island resolution of the Page curve and Information Paradox.',
  },
  {
    authors: 'NASA 3D Resources Archive & GRAVITY Collaboration',
    year: '2023',
    title: 'Space Shuttle Orbiter 3D Model (Public Domain) · Polarimetric Sgr A* Flare Orbits',
    journal: 'NASA 3D Resources · Astronomy & Astrophysics 677, L10',
    url: 'https://science.nasa.gov/3d-resources/',
    noteTr: 'Simülasyonda kullanılan resmi NASA 3B Uzay Mekiği modeli ve Sgr A* yörünge ölçümleri.',
    noteEn: 'Official NASA public-domain 3D Space Shuttle model & GRAVITY Sgr A* observations.',
  },
];

const SCALE_COMPARISONS: Record<string, { tr: string; en: string }> = {
  cygnus_x1: {
    tr: 'Çapı ~125 km — Neredeyse İstanbul’un bir ucundan diğer ucuna kadar!',
    en: '~125 km wide — roughly the diameter of a single major city!',
  },
  sgr_a: {
    tr: 'Çapı ~25 milyon km — Merkür gezegeninin yörüngesinin yaklaşık beşte biri.',
    en: '~25M km wide — about a fifth of Mercury’s orbit around the Sun.',
  },
  m87: {
    tr: 'Çapı ~38 milyar km — Tüm Güneş Sistemimizin 3 katından daha geniş!',
    en: '~38 billion km wide — more than 3× wider than our entire Solar System!',
  },
  ton_618: {
    tr: 'Çapı ~1.600 AU — Yan yana 40 Güneş Sistemi sığacak kadar akıl almaz devlikte!',
    en: '~1,600 AU wide — wide enough to fit 40 Solar Systems side-by-side!',
  },
};

export const ScientificDossier: React.FC<Props> = ({ open, lang, preset, telemetry, onClose }) => {
  const [simpleOnly, setSimpleOnly] = useState(false);

  if (!open) return null;
  const isTr = lang === 'tr';

  return (
    <div className="dossier-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="dossier-drawer" role="dialog" aria-modal="true">
        <div className="dossier-head">
          <div>
            <div className="dossier-kicker">
              {isTr
                ? 'HERKES İÇİN KARA DELİK REHBERİ // BİLİMSEL VERİLER, TEORİLER & KAYNAKÇA'
                : 'PLAIN-LANGUAGE BLACK HOLE GUIDE // VERIFIED SCIENCE, THEORIES & CITATIONS'}
            </div>
            <h2>
              {isTr
                ? 'Kara Delikler Nasıl Çalışır? (Basit Anlatım + Gerçek Fizik)'
                : 'How Do Black Holes Work? (Plain English + Real Physics)'}
            </h2>
            <div className="reading-mode-bar">
              <button
                className={`rm-btn ${simpleOnly ? 'active' : ''}`}
                onClick={() => setSimpleOnly(true)}
              >
                {isTr ? 'SADECE BASİT ANLATIM (FORMÜLSÜZ)' : 'SIMPLE EXPLANATION ONLY (NO MATH)'}
              </button>
              <button
                className={`rm-btn ${!simpleOnly ? 'active' : ''}`}
                onClick={() => setSimpleOnly(false)}
              >
                {isTr ? 'TAM BİLİMSEL (BASİT + FORMÜLLER)' : 'FULL SCIENCE (SIMPLE + EQUATIONS)'}
              </button>
            </div>
          </div>
          <button className="icon-btn close-x" onClick={onClose} title={isTr ? 'Kapat [Esc]' : 'Close [Esc]'}>
            <IconClose size={15} />
          </button>
        </div>

        <div className="dossier-body">
          {/* LIVE NUMERICAL SNAPSHOT FOR CURRENT BLACK HOLE */}
          {telemetry && (
            <section className="dossier-sec live-box">
              <h3>
                {isTr
                  ? `Şu An Ekranda Gördüğün Kara Delik: ${preset.nameTr} (r = ${telemetry.rInRs.toFixed(3)} r_s)`
                  : `Currently Simulated Black Hole: ${preset.nameEn} (r = ${telemetry.rInRs.toFixed(3)} r_s)`}
              </h3>
              <p className="scale-callout">
                {isTr ? SCALE_COMPARISONS[preset.id]?.tr : SCALE_COMPARISONS[preset.id]?.en}
              </p>
              <div className="dossier-stats">
                <div>
                  <span>{isTr ? 'Temel Yarıçap (r_s)' : 'Base Radius (r_s)'}</span>
                  <strong>{formatPhysicalDistance(telemetry.rsMeters)}</strong>
                  <small>{isTr ? 'Işığın kaçamadığı sınır' : 'No-escape scale'}</small>
                </div>
                <div>
                  <span>{isTr ? 'Mekik Spagetti Çekimi' : 'Shuttle Tidal Pull'}</span>
                  <strong>{formatTidalG(telemetry.tidalShuttleG)}</strong>
                  <small>{isTr ? 'Burun-kuyruk çekim farkı' : 'Nose-to-tail pull gap'}</small>
                </div>
                <div>
                  <span>{isTr ? 'Uzay Bükülmesi (K)' : 'Space Curvature (K)'}</span>
                  <strong>{formatScientificExp(telemetry.kretschmannScalarM4)} m⁻⁴</strong>
                  <small>{isTr ? 'Büyük sayı = keskin uçurum' : 'Higher = sharper bend'}</small>
                </div>
                <div>
                  <span>{isTr ? 'Hawking Sönüm Süresi' : 'Hawking Fade τ'}</span>
                  <strong>{formatDurationSec(telemetry.horizonFadeTauSec, lang)}</strong>
                  <small>{isTr ? 'Ufukta kararma hızı' : 'Horizon dimming rate'}</small>
                </div>
                <div>
                  <span>{isTr ? 'Hawking Sıcaklığı' : 'Hawking Temp T_H'}</span>
                  <strong>{formatScientificExp(telemetry.hawkingTempK)} K</strong>
                  <small>{isTr ? 'Buzdolabından trilyon× soğuk' : 'Trillions× colder than ice'}</small>
                </div>
                <div>
                  <span>{isTr ? 'Tam Buharlaşma Ömrü' : 'Full Evaporation'}</span>
                  <strong>10^{telemetry.log10HawkingEvapYears.toFixed(1)} {isTr ? 'yıl' : 'yr'}</strong>
                  <small>{isTr ? 'Evren yaşının katrilyonlarca katı' : 'Far older than universe'}</small>
                </div>
              </div>
            </section>
          )}

          {/* CHAPTER 1: WHAT IS A BLACK HOLE? */}
          <section className="dossier-sec">
            <div className="status-tag verified">
              {isTr ? 'KANITLANMIŞ GERÇEK // EINSTEIN 1915 · EHT 2019 · LIGO 2015' : 'PROVEN REALITY // EINSTEIN 1915 · EHT 2019 · LIGO 2015'}
            </div>
            <h3>{isTr ? '1. Kara Delik Nedir? (Gergin Trambolindeki Bowling Topu)' : '1. What Is a Black Hole? (The Bowling Ball on a Trampoline)'}</h3>
            <div className="eli10-box">
              <div className="eli10-kicker">{isTr ? 'BASİTÇE ANLATIRSAK' : 'IN SIMPLE WORDS'}</div>
              <p>
                {isTr
                  ? 'Uzayı gergin bir trambolin çarşafı gibi hayal et. Üzerine bir misket (Dünya) koyarsan hafifçe çöker. Bir basketbol topu (Güneş) koyarsan daha çok çöker. Şimdi Güneş’ten 20 kat ağır devasa bir yıldızın yakıtı bitip kendi içine çöktüğünü ve bütün o ağırlığın küçücük bir şehrin içine sıkıştığını düşün: trambolin o kadar derin çöker ki dibi görünmeyen bir huni oluşur! İşte kara delik bir "delik" değil, uzayı akıl almaz derecede büken süper yoğun bir kütleçekim hunisidir.'
                  : 'Imagine space as a giant stretched trampoline. Put a marble (Earth) on it and it dips a tiny bit. Put a basketball (the Sun) on it and it dips much deeper. Now imagine crushing 20 Suns into the width of a single city: the trampoline sinks into a bottomless funnel! A black hole isn’t an empty hole — it is an ultra-dense gravity funnel bending spacetime itself.'}
              </p>
            </div>
            {!simpleOnly && (
              <>
                <p>
                  {isTr
                    ? 'Albert Einstein’ın 1915 Genel Görelilik kuramına göre kütleçekimi bir kuvvet değil, kütle ve enerjinin uzay-zaman geometrisini bükmesidir. Karl Schwarzschild 1916’da küresel bir kütlenin kritik yarıçapı olan r_s = 2GM/c² değerini hesapladı; bir cisim bu yarıçapın içine sıkışırsa kaçış hızı ışık hızını aşar ve kara delik oluşur. [G] tuşuna basarak bu 3B Flamm Paraboloidi hunisini ekranda canlı görebilirsin.'
                    : 'In Einstein’s General Relativity (1915), gravity is the curvature of spacetime geometry. Schwarzschild (1916) showed that compressing any mass M within r_s = 2GM/c² makes escape velocity exceed the speed of light. Press [G] to visualize Flamm’s 3D Paraboloid curvature funnel live.'}
                </p>
                <MathBlock
                  tex={String.raw`r_s = \frac{2GM}{c^2}, \qquad z_{\mathrm{Flamm}}(r) = 2\sqrt{r_s\,(r - r_s)}`}
                />
              </>
            )}
          </section>

          {/* CHAPTER 2: EVENT HORIZON */}
          <section className="dossier-sec">
            <div className="status-tag verified">
              {isTr ? 'KANITLANMIŞ GERÇEK // PENROSE 1965 NOBEL ÖDÜLÜ' : 'PROVEN REALITY // PENROSE 1965 NOBEL PRIZE'}
            </div>
            <h3>{isTr ? '2. Olay Ufku Nedir? (Şelaleye Yaklaşan Kano)' : '2. What Is the Event Horizon? (The Canoe & Waterfall)'}</h3>
            <div className="eli10-box">
              <div className="eli10-kicker">{isTr ? 'BASİTÇE ANLATIRSAK' : 'IN SIMPLE WORDS'}</div>
              <p>
                {isTr
                  ? 'Büyük bir şelaleye doğru akan nehirde kürek çeken bir kano düşün. Senin en hızlı kürek çekme hızın saatte 10 km olsun. Şelaleden uzaktayken nehir yavaş akar, kolayca geri dönebilirsin. Ama şelaleye yaklaştıkça suyun akış hızı tam saatte 10 km’ye ulaşır — işte o görünmez çizgi "Olay Ufku"dur! O çizgiyi bir santim geçersen su senden hızlı akar; ne kadar güçlü kürek çekersen çek (evrendeki en hızlı şey olan ışık bile olsan!) artık geri dönemezsin.'
                  : 'Imagine paddling a canoe down a river toward a waterfall. Your fastest paddle speed is 10 km/h. Far upstream, the river flows slowly and you can easily turn back. Right where the water hits 10 km/h lies the invisible "Event Horizon"! Cross it by one inch and the river flows faster than your maximum speed — even light, the fastest thing in the universe, can never paddle back out.'}
              </p>
            </div>
            {!simpleOnly && (
              <>
                <p>
                  {isTr
                    ? 'Matematiksel olarak olay ufku (r_+) sert bir duvar değil, nedensellik sınırıdır. Sağ alttaki grafikte gördüğün gibi r = r_+ noktasında gelecek ışık konisi tam 45° içeri devrilir; ufkun içinde (r < r_+) ise radyal mesafe zaman benzeri (timelike) hâle gelir. Bu yüzden tekilliğe (r=0) doğru hareket etmek bir yön seçimi değil, zamanın yarından sonraya akması kadar kaçınılmazdır.'
                    : 'Mathematically, r_+ is a causal boundary rather than a solid surface. As shown in the bottom-right diagram, the future light cone tilts 45° inward at r_+. Inside r_+, the radial direction turns timelike: reaching r=0 becomes your unavoidable future.'}
                </p>
                <MathBlock
                  tex={String.raw`r_{\pm} = \frac{r_s}{2}\!\left(1 \pm \sqrt{1 - a_*^2}\right), \qquad \tau_{\mathrm{sing}} = \frac{2}{3}\frac{r_s}{c}\!\left(\frac{r}{r_s}\right)^{3/2}`}
                />
              </>
            )}
          </section>

          {/* CHAPTER 3: SPAGHETTIFICATION */}
          <section className="dossier-sec">
            <div className="status-tag verified">
              {isTr ? 'KESİN FİZİK // HAWKING’İN ÜNLÜ SPAGETTİ ETKİSİ' : 'EXACT PHYSICS // HAWKING’S FAMOUS SPAGHETTI EFFECT'}
            </div>
            <h3>{isTr ? '3. Uzay Mekiği Neden Spagetti Gibi Uzuyor? (Küçük vs Dev Kara Delik Sürprizi!)' : '3. Why Does the Shuttle Stretch Like Spaghetti? (Small vs. Giant Surprise!)'}</h3>
            <div className="eli10-box">
              <div className="eli10-kicker">{isTr ? 'BASİTÇE ANLATIRSAK' : 'IN SIMPLE WORDS'}</div>
              <p>
                {isTr
                  ? 'Bir oyun hamurunu tek elinle sabit tutup diğer elinle hızlıca çektiğini düşün: hamur hem incelir hem uzar! Uzay mekiği kara deliğe burnu önde yaklaşırken, burnu kara deliğe kuyruğundan 37 metre daha yakındır. Bu yüzden kara delik burnunu kuyruğundan ÇOK daha sert çeker, kanatları da diş macunu tüpü gibi yanlardan merkeze sıkıştırır! Mekiğin burnundan kopan kızgın parçalar işte bu yüzden uzaya savrulur.'
                  : 'Imagine pulling one end of a ball of play-dough fast while the other lags behind: it stretches long and thin! Because the Shuttle’s nose is 37 meters closer to the black hole than its tail, gravity pulls the nose way harder than the tail while squeezing the wings inward like a toothpaste tube!'}
              </p>
              <p>
                {isTr
                  ? 'EN BÜYÜK SÜRPRİZ: Küçük kara delikler çok daha tehlikelidir! Üstten CYG X-1’i seçersen (sadece 125 km genişlikte), mekik olay ufkuna varmadan çok önce spagettiye dönüşür. Ama dev M87*’yi seçersen (Güneş Sistemimizin 3 katı genişlikte!), olay ufkundaki yokuş çok yumuşaktır — mekik 1.00× tamamen sağlam geçer! Yine de Stephen Hawking’in anlattığı gibi, ÖZ ZAMAN (τ) modunda dev SGR A*’nın derinliklerine (r→0) düşmeye devam edersen, sonunda orada da spagetti olmaktan kurtulamazsın!'
                  : 'THE BIGGEST SURPRISE: Small black holes shred you MUCH earlier! Around compact CYG X-1 (125 km wide), the Shuttle stretches into glowing spaghetti far outside the horizon. Click giant M87* (3× our Solar System!) and the Shuttle snaps right back to 1.00× completely intact at the horizon — yet as Hawking explained, plunge deep toward r→0 inside SGR A* in PROPER TIME mode and curvature still inevitably turns you into spaghetti!'}
              </p>
            </div>
            {!simpleOnly && (
              <>
                <p>
                  {isTr
                    ? 'Gelgit gerilmesi Weyl eğrilik tensöründen doğar ve Δa = (2GM/r³)Δh yasasıyla 1/r³ oranında büyür. Olay ufkunda (r = r_s ∝ M) bu fark 1/M² ile ters orantılıdır: kütle büyüdükçe ufuktaki gelgit kuvveti dramatik biçimde azalır. Koordinattan bağımsız Kretschmann skaları K = 48G²M²/(c⁴r⁶), r = r_+ noktasında sonluyken r→0’da sonsuza gider.'
                    : 'Tidal shear originates from the Weyl curvature tensor (Δa = 2GMΔh / r³). At the horizon (r ∝ M), tides scale as 1/M², explaining why supermassive horizons are gentle while the Kretschmann invariant K = 48G²M²/(c⁴r⁶) still diverges as r→0.'}
                </p>
                <MathBlock
                  tex={String.raw`\Delta a_{\mathrm{radial}} = \frac{2GM}{r^3}\,\Delta h, \qquad \Delta a_{\perp} = -\frac{GM}{r^3}\,\Delta x_{\perp}, \qquad K = \frac{48\,G^2 M^2}{c^4 r^6}`}
                />
              </>
            )}
          </section>

          {/* CHAPTER 4: TIME DILATION & HAWKING EXTERNAL OBSERVER */}
          <section className="dossier-sec">
            <div className="status-tag verified">
              {isTr ? 'KANITLANMIŞ GERÇEK // GPS UYDULARI & GRAVITY 2018' : 'PROVEN REALITY // GPS SATELLITES & GRAVITY 2018'}
            </div>
            <h3>{isTr ? '4. Zaman Neden Yavaşlar ve Ufukta Donar? (Stephen Hawking’in İki Gözlemcisi)' : '4. Why Does Time Slow Down & Freeze? (Hawking’s Two Observers)'}</h3>
            <div className="eli10-box">
              <div className="eli10-kicker">{isTr ? 'BASİTÇE ANLATIRSAK' : 'IN SIMPLE WORDS'}</div>
              <p>
                {isTr
                  ? 'Büyük kütleçekimi sadece uzayı değil, ZAMANI da yavaşlatır! (Bu o kadar gerçektir ki telefonundaki GPS haritası bile bunu her gün düzeltmezse adresin 11 km şaşar!) Şimdi iki arkadaş hayal et: Biri uzay mekiğiyle kara deliğe düşüyor, diğeri uzaktan teleskopla onu izliyor (HAWKING DIŞ modu). Düşen arkadaşın kol saati normal akar ve birkaç milisaniyede olay ufkundan geçer. Ama uzaktan bakan arkadaş, mekiğin saatlerinin ve kanat ışıklarının giderek yavaşladığını, renginin beyazdan koyu kırmızıya döndüğünü ve tam olay ufkunda donmuş bir fotoğraf gibi donup karanlıkta kaybolduğunu görür!'
                  : 'Strong gravity slows down TIME itself! (Even your phone’s GPS must correct for this daily or maps would drift by 11 km!) Imagine two friends: one plunges in the Shuttle while the other watches from afar (HAWKING EXT. mode). For the astronaut inside, their wristwatch ticks normally and they cross right in. For the distant watcher, the Shuttle’s blinking lights slow to a dead stop, its color shifts deep red, and it freezes like a fading photograph right on the horizon!'}
              </p>
            </div>
            {!simpleOnly && (
              <>
                <p>
                  {isTr
                    ? 'Kütleçekim kuyusundan tırmanan her foton enerji kaybeder (kütleçekimsel kızıla kayma z → ∞) ve ardışık ışık sinyalleri arasındaki süre uzak gözlemcide üstel olarak uzar. Sonuç olarak uzak gözlemcinin gördüğü parlaklık I(t) ∝ exp(-t / τ_fade) yasasıyla (τ_fade = 4GM/c³) hızla sıfıra sönümlenir.'
                    : 'Every photon climbing out of the gravitational well loses energy (z → ∞), and arrival intervals stretch exponentially so distant luminosity decays as I(t) ∝ exp(-t / τ_fade) where τ_fade = 4GM/c³.'}
                </p>
                <MathBlock
                  tex={String.raw`\frac{d\tau}{dt} = \sqrt{1 - \frac{r_s}{r}}, \qquad I(t) \propto \exp\!\left(-\frac{c^3 t}{4GM}\right)`}
                />
              </>
            )}
          </section>

          {/* CHAPTER 5: LIGHT BENDING & DOPPLER BEAMING */}
          <section className="dossier-sec">
            <div className="status-tag verified">
              {isTr ? 'DOĞRUDAN FOTOĞRAFLANDI // EHT 2019 (M87*) & 2022 (SGR A*)' : 'DIRECTLY PHOTOGRAPHED // EHT 2019 (M87*) & 2022 (SGR A*)'}
            </div>
            <h3>{isTr ? '5. Parlak Halkanın Solu Neden Mavi-Beyaz, Sağı Neden Turuncu-Kızıl? (Ambulans Sireni!)' : '5. Why Is the Left Side Blue-White & the Right Side Orange-Red? (Ambulance Siren!)'}</h3>
            <div className="eli10-box">
              <div className="eli10-kicker">{isTr ? 'BASİTÇE ANLATIRSAK' : 'IN SIMPLE WORDS'}</div>
              <p>
                {isTr
                  ? 'Bir ambulans sana doğru gelirken sireni ince ve yüksek sesli, yanından geçip uzaklaşırken kalın ve kısık duyulur (Doppler Etkisi). Kara deliğin etrafındaki ateş gibi sıcak gaz halkası ışık hızının yarısına yakın hızla dönüyor! Sol taraftaki gaz BİZİM YÖNÜMÜZE doğru fırladığı için ışığı üst üste yığılıp göz kamaştırıcı mavi-beyaz parlar; sağ taraftaki gaz bizden UZAKLAŞTIĞI için ışığı esneyip sönük turuncu-kırmızı görünür. Ayrıca kara delik dev bir cam büyüteç gibi ışığı büktüğü için halkanın arka kısmını bile kara deliğin üstünde ve altında kemer gibi görürsün!'
                  : 'When an ambulance rushes toward you, its siren sounds high-pitched and loud; as it speeds away, it sounds low and muffled (Doppler effect). Glowing gas orbits this black hole at nearly half the speed of light! The LEFT side rushes toward us — piling its light into blazing blue-white — while the RIGHT side races away, stretching dim orange-red. And because gravity bends light like a glass lens, even the far side of the ring arches above and below the black shadow!'}
              </p>
            </div>
            {!simpleOnly && (
              <>
                <p>
                  {isTr
                    ? 'Bu simülasyon ekrandaki her piksel için 3B null jeodezik denklemini çözer (sahte 2B efekt değildir). Novikov–Thorne ince birikim diskinin bolometrik parlaklığı göreli Doppler faktörünün 4. kuvvetiyle (I_obs = g⁴ I_emit) ölçeklenir; karanlık toz şeritleri Beer–Lambert öz-soğurmasıyla sıcak filamentlerin önünü keser. Olay Ufku Teleskobu (EHT) 2019’da M87* fotoğrafında bu tek taraflı Doppler parlaklık asimetrisini doğrudan görüntüledi.'
                    : 'Every pixel integrates the 3D null geodesic equation. Bolometric disk radiance scales as g⁴ (relativistic beaming), with Beer–Lambert dust self-absorption — the exact one-sided brightness asymmetry directly imaged in M87* by the EHT (2019).'}
                </p>
                <MathBlock
                  tex={String.raw`\frac{d^2\mathbf{x}}{d\lambda^2} = -\frac{3}{2}\,r_s\,h^2\,\frac{\mathbf{x}}{|\mathbf{x}|^5} + \mathbf{a}_{\mathrm{Kerr}}, \qquad I_{\mathrm{obs}} = g^4\,I_{\mathrm{emit}}`}
                />
              </>
            )}
          </section>

          {/* CHAPTER 6: ROTATING KERR BLACK HOLES & JETS */}
          <section className="dossier-sec">
            <div className="status-tag verified">
              {isTr ? 'GÖZLEMLENDİ // CHANDRA · VLA · M87* 5.000 IŞIK YILI JETİ' : 'OBSERVED // CHANDRA · VLA · M87* 5,000-LY JET'}
            </div>
            <h3>{isTr ? '6. Dönen Kara Delikler: Bal Kavanozundaki Girdap & Kutup Lazer Jetleri' : '6. Spinning Black Holes: Honey Whirlpool & Polar Plasma Jets'}</h3>
            <div className="eli10-box">
              <div className="eli10-kicker">{isTr ? 'BASİTÇE ANLATIRSAK' : 'IN SIMPLE WORDS'}</div>
              <p>
                {isTr
                  ? 'Evrendeki neredeyse tüm kara delikler topaç gibi çok hızlı döner! Bir bal kavanozunun içinde bir bilyeyi hızla döndürdüğünü düşün: bilyeye dokunan bal da onunla birlikte girdap gibi dönmeye başlar. Dönen kara delik de çevresindeki uzayı aynı böyle burgu gibi sürükler (Ergosfer)! Kara deliğe dolanan güçlü manyetik çizgiler bu dev kozmik topaçtan enerji çalarak kuzey ve güney kutuplarından binlerce ışık yılı uzağa mavi-beyaz dev plazma jetleri fırlatır — ekranda dikey parlayan mavi sütunlar tam olarak budur!'
                  : 'Almost every black hole spins like a cosmic top! Imagine spinning a marble inside a jar of honey: the honey around it gets dragged into a whirlpool. A spinning black hole drags space itself the same way (the Ergosphere)! Magnetic fields twisted in that whirlpool siphon rotational energy to blast twin blue-white plasma jets thousands of light-years from both poles — the vertical blue beams glowing in our scene!'}
              </p>
            </div>
            {!simpleOnly && (
              <>
                <p>
                  {isTr
                    ? 'Roy Kerr (1963) çözümüyle dönen kara deliğin gölgesinin sol kenarı düzleşir (Bardeen D-şekilli gölgesi — sağ paneldeki a* kaydırıcısını 0 ile 0.998 arasında oynatarak canlı izle!). Roger Blandford ve Roman Znajek (1977), ergosferdeki manyetik alan sürüklenmesinin P_BZ ∝ (a*)² gücünde göreli jetler ürettiğini gösterdi.'
                    : 'Roy Kerr’s (1963) metric flattens the prograde shadow edge into Bardeen’s D-shape (drag the a* spin slider 0 ↔ 0.998 to watch it morph live!). Blandford & Znajek (1977) showed magnetic fields threading the ergosphere power jets scaling as (a*)².'}
                </p>
                <MathBlock
                  tex={String.raw`r_{\mathrm{ergo}}(\theta) = \frac{r_s}{2}\!\left(1 + \sqrt{1 - a_*^2\cos^2\theta}\right), \qquad P_{\mathrm{BZ}} \propto a_*^2\, B_{\perp}^2\, r_+^2\, c`}
                />
              </>
            )}
          </section>

          {/* CHAPTER 7: HAWKING RADIATION */}
          <section className="dossier-sec">
            <div className="status-tag theory">
              {isTr ? 'KUANTUM + GENEL GÖRELİLİK TEORİSİ // HAWKING 1974' : 'QUANTUM + GENERAL RELATIVITY THEORY // HAWKING 1974'}
            </div>
            <h3>{isTr ? '7. Kara Delikler Sonsuza Kadar Yaşar mı? (Güneşte Eriyen Dev Buz Küpü)' : '7. Do Black Holes Live Forever? (The Giant Ice Cube in the Sun)'}</h3>
            <div className="eli10-box">
              <div className="eli10-kicker">{isTr ? 'BASİTÇE ANLATIRSAK' : 'IN SIMPLE WORDS'}</div>
              <p>
                {isTr
                  ? 'Eskiden kara deliklerin hiçbir şeyi dışarı vermediği ve sonsuza kadar yaşadığı sanılırdı. Ama 1974’te Stephen Hawking tüm dünyayı şaşırtan bir keşif yaptı! Kuantum fiziğine göre "boş uzay" aslında hiç boş değildir; her an ikiz parçacık çiftleri belirip birbirini yok eder. Eğer bir çift tam olay ufkunun kenarında doğarsa, biri kara deliğe düşerken diğer ikiz uzaya kaçabilir! Kaçan her parçacık kara delikten minicik bir parça enerji çalar. Böylece kara delikler katrilyonlarca×katrilyonlarca yıl içinde dev bir buz küpü gibi yavaşça eriyip tamamen buharlaşır!'
                  : 'Scientists once thought nothing could ever leave a black hole. Then in 1974 Stephen Hawking shocked physics! In quantum mechanics, "empty space" buzzes with twin virtual particles popping in and out of existence. Right on the event horizon edge, one twin can fall in while the other escapes into space — stealing a tiny speck of energy! Over unimaginable trillions of trillions of years, every black hole slowly melts away like a cosmic ice cube!'}
              </p>
              <p className="honesty-note">
                {isTr
                  ? 'Dürüst Bilim Notu: Gerçek yıldızsal kara deliklerin Hawking ışıması aşırı zayıf ve soğuktur (mutlak sıfıra çok yakın). Sağ paneldeki "Hawking Kuantum Ufuk Işıması" anahtarı bu görünmez kuantum sürecini insan gözünün anlayabilmesi için büyütmeli (temsili) olarak gösterir.'
                  : 'Scientific Honesty Note: Real Hawking glow for astrophysical black holes is far too cold and dim for human eyes. The "Hawking Quantum Horizon Glow" toggle renders a deliberately magnified false-color visualization of this process.'}
              </p>
            </div>
            {!simpleOnly && (
              <MathBlock
                tex={String.raw`T_H = \frac{\hbar c^3}{8\pi G M k_B}, \qquad t_{\mathrm{evap}} = \frac{5120\pi G^2 M^3}{\hbar c^4}, \qquad S_{\mathrm{BH}} = \frac{k_B c^3 A}{4 G \hbar}`}
              />
            )}
          </section>

          {/* CHAPTER 8: FRONTIER HYPOTHESES */}
          <section className="dossier-sec">
            <div className="status-tag hypothesis">
              {isTr ? 'AÇIK BİLİMSEL HİPOTEZLER // HENÜZ DOĞRUDAN KANITLANMADI' : 'OPEN SCIENTIFIC HYPOTHESES // NOT YET DIRECTLY PROVEN'}
            </div>
            <h3>{isTr ? '8. Bilimin Sınırı: Bilim İnsanlarının Hâlâ Araştırdığı 4 Büyük Gizem' : '8. Edge of Science: 4 Great Mysteries Physicists Are Still Solving'}</h3>
            <div className="eli10-box">
              <div className="eli10-kicker">{isTr ? 'DÜRÜST AYIRIM: TEORİ VS HİPOTEZ' : 'HONEST DISTINCTION: PROVEN VS HYPOTHESIS'}</div>
              <p>
                {isTr
                  ? 'Bilimde neyi kesin bildiğimiz ile neyin hâlâ araştırılan bir hipotez olduğunu ayırmak çok önemlidir. Yukarıdaki 6 bölüm teleskoplar ve kütleçekim dalgalarıyla doğrulandı. Aşağıdaki 4 konu ise henüz deneyle kanıtlanmamış, fiziğin en heyecanlı açık sorularıdır:'
                  : 'Good science always separates proven measurements from open hypotheses. The first 6 chapters are confirmed by telescopes and gravitational waves; the 4 mysteries below are the exciting unproven frontiers of modern physics:'}
              </p>
            </div>
            <ul className="hypo-list">
              <li>
                <strong>{isTr ? '1. Bilgi Paradoksu (Yanan Günlüğün Hikâyesi Nereye Gider?):' : '1. Information Paradox (Where Does a Burned Diary’s Story Go?):'}</strong>{' '}
                {isTr
                  ? 'Bir defteri yakarsan duman ve küllerdeki atomları inceleyerek teoride yazılanları geri çözebilirsin; kuantum fiziğine göre bilgi asla yok olamaz. Peki defteri kara deliğe atıp kara delik buharlaşırsa bilgi yok mu olur? 2019–2024 "Kuantum Ada (Page Eğrisi)" hesapları, bilginin Hawking radyasyonuna gizlice kodlanıp geri çıktığını öne sürüyor.'
                  : 'Burn a notebook and its atoms still carry the information in smoke and ash. If you drop it into an evaporating black hole, does the information vanish? Modern 2019–2024 "Quantum Island / Page Curve" calculations suggest the information sneaks back out encoded in Hawking radiation.'}
              </li>
              <li>
                <strong>{isTr ? '2. Solucan Deliği / Başka Evrene Geçit (Einstein–Rosen Köprüsü) Gerçek mi?:' : '2. Are Black Holes Wormhole Portals to Other Universes?:'}</strong>{' '}
                {isTr
                  ? 'Filmlerde dönen kara delikler başka evrenlere açılan tüneller gibi gösterilir. Kâğıt üstünde ideal Kerr denklemleri içeride (r_-) bir tünel barındırır; ANCAK Poisson ve Israel (1990) içeri düşen tek bir ışık ışınının bile bu iç kapıda sonsuz enerji biriktirip ("Kütle Şişmesi") tüneli anında çökerttiğini gösterdi.'
                  : 'Sci-fi movies depict spinning black holes as portals to other universes. Idealized Kerr math does contain an inner tunnel beyond r_-, BUT Poisson & Israel (1990) showed that even a single infalling photon piles up infinite blueshifted energy ("Mass Inflation"), instantly collapsing the wormhole.'}
              </li>
              <li>
                <strong>{isTr ? '3. Merkezde Gerçekten "Sonsuzluk" mu Var? (Planck Yıldızı Hipotezi):' : '3. Is the Center Really Infinitely Small? (Planck Star Hypothesis):'}</strong>{' '}
                {isTr
                  ? 'Einstein’ın denklemleri merkezde her şeyin sıfır hacme sıkıştığını (tekillik) söyler. Ancak Carlo Rovelli gibi kuantum kütleçekimi fizikçileri, maddenin evrenin en küçük ölçeğinde ("Planck yoğunluğu") süper sert bir yay gibi geri sekip "Planck Yıldızı" oluşturduğunu öne sürüyor.'
                  : 'Classical equations predict infinite density at r=0. Loop Quantum Gravity researchers like Carlo Rovelli hypothesize that matter cannot compress past the microscopic Planck density and bounces back like an ultra-stiff spring — a "Planck Star."'}
              </li>
              <li>
                <strong>{isTr ? '4. Ateş Duvarı (AMPS Firewall) Hipotezi:' : '4. The AMPS Firewall Hypothesis:'}</strong>{' '}
                {isTr
                  ? '2012’de bazı fizikçiler, kuantum dolanıklık kurallarını kurtarmak için olay ufkunun sakin bir boşluk değil, içeri giren her şeyi anında yakıp buharlaştıran yüksek enerjili bir "ateş duvarı" olabileceğini öne sürdü. Bu tartışma fizik dünyasında hâlâ sürüyor.'
                  : 'In 2012, physicists proposed that strict quantum entanglement rules might replace the calm event horizon with a sizzling wall of high-energy particles ("Firewall"). The debate remains active today.'}
              </li>
            </ul>
          </section>

          {/* CHAPTER 9: 4 REAL BLACK HOLES COMPARISON TABLE */}
          <section className="dossier-sec">
            <h3>{isTr ? '9. Simülatördeki 4 Gerçek Kara Delik Karşılaştırması' : '9. Comparison of All 4 Real Black Holes in This Simulator'}</h3>
            <div className="bh-table-wrap">
              <table className="bh-compare-table">
                <thead>
                  <tr>
                    <th>{isTr ? 'Kara Delik' : 'Black Hole'}</th>
                    <th>{isTr ? 'Kütle (M☉)' : 'Mass (M☉)'}</th>
                    <th>{isTr ? 'Çap (2 r_s)' : 'Width (2 r_s)'}</th>
                    <th>{isTr ? 'Ufukta Mekik Çekimi' : 'Shuttle Tide at r_s'}</th>
                    <th>{isTr ? 'Günlük Kıyaslama' : 'Everyday Scale'}</th>
                  </tr>
                </thead>
                <tbody>
                  {BLACK_HOLE_PRESETS.map((bh) => {
                    const rs = schwarzschildRadiusMeters(bh.massSolar);
                    const tideAtRs = radialTidalAccelMs2(bh.massSolar, rs, CONSTANTS.SHUTTLE_LENGTH_M) / CONSTANTS.G0;
                    return (
                      <tr key={bh.id} className={bh.id === preset.id ? 'active-row' : ''}>
                        <td><strong>{bh.code}</strong></td>
                        <td>{formatScientificExp(bh.massSolar)}</td>
                        <td>{formatPhysicalDistance(rs * 2)}</td>
                        <td>{formatTidalG(tideAtRs)}</td>
                        <td>{isTr ? SCALE_COMPARISONS[bh.id]?.tr : SCALE_COMPARISONS[bh.id]?.en}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* CHAPTER 10: CLICKABLE PEER-REVIEWED REFERENCES */}
          <section className="dossier-sec refs">
            <h3>
              {isTr
                ? '10. Hakemli Akademik Kaynakça & Gözlem Referansları (Tıklanabilir)'
                : '10. Peer-Reviewed Academic References & Observatory Citations (Clickable)'}
            </h3>
            <ol className="ref-list">
              {ACADEMIC_REFERENCES.map((ref, idx) => (
                <li key={idx}>
                  <a href={ref.url} target="_blank" rel="noopener noreferrer" className="ref-link">
                    <strong>{ref.authors} ({ref.year}).</strong> {ref.title}.
                  </a>{' '}
                  <em>{ref.journal}</em> — <span>{isTr ? ref.noteTr : ref.noteEn}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </aside>
    </div>
  );
};
