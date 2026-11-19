import { CrewTidalStatus, RelativisticZone } from '../physics/relativity';

export type Lang = 'tr' | 'en';

export interface ZoneNarration {
  badgeTr: string;
  badgeEn: string;
  titleTr: string;
  titleEn: string;
  bodyTr: string;
  bodyEn: string;
  formula: string;
}

export const ZONE_NARRATIONS: Record<RelativisticZone, ZoneNarration> = {
  DEEP_SPACE: {
    badgeTr: 'BÖLGE 01 // DERİN UZAY',
    badgeEn: 'ZONE 01 // DEEP SPACE',
    titleTr: 'Güvenli Uzaklık — Uzay Henüz Neredeyse Düz',
    titleEn: 'Safe Distance — Space Is Still Nearly Flat',
    bodyTr:
      'Kara delik gergin bir tramboline konmuş dev bir bowling topu gibidir. Şu an kenardasın: zamanın Dünya ile neredeyse aynı akıyor ve uzay mekiğin sağlam. Yaklaşmak için aşağı kaydır (scroll) ve çekimin nasıl büyüdüğünü izle!',
    bodyEn:
      'A black hole acts like a super-heavy bowling ball on a stretched trampoline. Out here near the edge, time matches Earth and your Shuttle is safe. Scroll down to plunge inward and watch gravity take over!',
    formula: 'ds² ≈ -c²dt² + dr² + r²dΩ²',
  },
  LENSING: {
    badgeTr: 'BÖLGE 02 // GÜÇLÜ MERCEKLENME',
    badgeEn: 'ZONE 02 // STRONG LENSING',
    titleTr: 'Işık Bükülüyor & Sol Taraf Mavi-Beyaz Parlıyor',
    titleEn: 'Light Bends & The Left Side Blazes Blue-White',
    bodyTr:
      'Kara delik dev bir büyüteç gibi ışığı büktüğü için arkasındaki parlak gaz halkasını bile üstte ve altta görüyorsun! Sol taraf bize doğru hızla döndüğü için ambulans sireni gibi sıkışıp mavi-beyaz parlar (Doppler); sağ taraf uzaklaştığı için kızarır.',
    bodyEn:
      'Because gravity bends light like a cosmic magnifying lens, you see the far side of the disk arched above and below the shadow! Like an approaching ambulance siren, the left side beams blazing blue-white while the right dims red.',
    formula: 'Δa = (2GM / r³) Δh · I_obs = g⁴ I_emit',
  },
  ISCO: {
    badgeTr: 'BÖLGE 03 // SON KARARLI YÖRÜNGE (ISCO)',
    badgeEn: 'ZONE 03 // INNERMOST STABLE ORBIT (ISCO)',
    titleTr: 'Yörünge Bitti & Hamur Gibi Uzama (Spagettileşme)',
    titleEn: 'Orbits End & Stretching Like Spaghetti',
    bodyTr:
      'Bu çizginin içinde hiçbir şey etrafta güvenle dönemez, doğrudan içeri düşer. Cygnus X-1 gibi küçük kara deliklerde mekiğin burnu kuyruğundan çok daha sert çekilir — gövde oyun hamuru gibi ince uzun bir spagettiye uzarken parçalar kopar!',
    bodyEn:
      'Inside this ring no stable orbit can survive — everything plunges inward. Around stellar-mass Cygnus X-1, the Shuttle nose is pulled far harder than its tail, stretching it like dough into a glowing spaghetti filament!',
    formula: 'K = 48 G²M² / (c⁴ r⁶)',
  },
  PHOTON_SPHERE: {
    badgeTr: 'BÖLGE 04 // FOTON KÜRESİ',
    badgeEn: 'ZONE 04 // PHOTON SPHERE',
    titleTr: 'Işığın Bile Etrafında Tur Attığı Sınır',
    titleEn: 'Where Even Light Orbits in Circles',
    bodyTr:
      'Çekim burada o kadar güçlü ki ışık ışınları bile kara deliğin etrafında uydu gibi dönüp o jilet gibi ince parlak halkayı çizer! Mekiğin kanatlarındaki yanıp sönen ışıklar zamanın yavaşlamasıyla belirgin şekilde ağırlaşır.',
    bodyEn:
      'Gravity is so intense here that beams of light loop around the black hole like satellites, carving the razor-thin photon ring! Your Shuttle’s wingtip lights visibly blink slower as time stretches.',
    formula: 'r_ph(a*=0) = 1.5 r_s',
  },
  ERGOSPHERE: {
    badgeTr: 'BÖLGE 05 // ERGOSFER (UZAY GİRDABI)',
    badgeEn: 'ZONE 05 // ERGOSPHERE (SPACETIME WHIRLPOOL)',
    titleTr: 'Bal Kavanozundaki Girdap: Sabit Durmak İmkânsız!',
    titleEn: 'Whirlpool in Honey: Standing Still Is Impossible!',
    bodyTr:
      'Dönen kara delik uzayı tıpkı bal içinde dönen bir bilye gibi burgu şeklinde sürükler. Burada motorları tersine yakıp sabit durmaya çalışsan bile uzayın kendisi seni dönme yönüne sürükler; kutuplardaki dev mavi jetler enerjisini bu girdaptan alır!',
    bodyEn:
      'Like a spinning marble twisting honey around it, the black hole drags space itself faster than light here. Standing still is physically impossible — and the twin blue polar jets harvest their power from this whirlpool!',
    formula: 'r_ergo(θ) = M + √(M² - a²cos²θ)',
  },
  HORIZON: {
    badgeTr: 'BÖLGE 06 // OLAY UFKU (r = r_+)',
    badgeEn: 'ZONE 06 // EVENT HORIZON (r = r_+)',
    titleTr: 'Şelalenin Kenarı — Hawking’in Donan Fotoğrafı',
    titleEn: 'Edge of the Waterfall — Hawking’s Frozen Snapshot',
    bodyTr:
      'Tıpkı hızı kürek hızını aşan bir şelale gibi: buradan ışık bile geri dönemez! HAWKING DIŞ modunda uzaktan bakan kişi mekiğin ufukta donup kızıla kayarak yavaşça kaybolduğunu görür. İçeri geçmek için üstten ÖZ ZAMAN (τ) moduna tıkla!',
    bodyEn:
      'Like a canoe crossing a waterfall flowing faster than you can paddle: not even light can return! In HAWKING EXT. mode, a distant observer sees the Shuttle freeze and fade red. Click PROPER TIME (τ) above to plunge inside!',
    formula: 'I(t) ∝ exp(-c³ t / 4GM) · z → ∞',
  },
  INTERIOR: {
    badgeTr: 'BÖLGE 07 // UFUK İÇİ (r → 0)',
    badgeEn: 'ZONE 07 // INSIDE HORIZON (r → 0)',
    titleTr: 'Kaçınılmaz Merkeze Düşüş & Dış Evren Penceresi',
    titleEn: 'Unavoidable Fall to the Center & Outside Sky Window',
    bodyTr:
      'Artık ufkun içindesin! Burada merkeze (tekilliğe) düşmek, yarın sabahın gelmesi kadar kaçınılmazdır. Dev Sgr A* kara deliğinde bile merkeze iyice yaklaştığında uzay bükülmesi patlayıp mekiği spagettiye çevirir; tüm dış evren parlak mavi bir halkaya sıkışır.',
    bodyEn:
      'You are inside the horizon! Falling toward the center is now as unavoidable as tomorrow arriving. Even inside giant Sgr A*, deep near r→0 curvature skyrockets and spaghettifies the Shuttle while the outside sky shrinks into a blazing blue ring.',
    formula: 'τ_sing = (2/3)(r_s/c)(r/r_s)^(3/2) · K ∝ 1/r⁶',
  },
};

export const TIDAL_STATUS_LABELS: Record<CrewTidalStatus, { tr: string; en: string }> = {
  SAFE: { tr: 'GÜVENLİ', en: 'NOMINAL' },
  ELEVATED: { tr: 'GELGİT GERİLİMİ', en: 'TIDAL STRESS' },
  CRITICAL: { tr: 'YAPISAL YIRTILMA', en: 'STRUCTURAL YIELD' },
  SPAGHETTIFICATION: { tr: 'SPAGETTİFİKASYON', en: 'SPAGHETTIFICATION' },
};

export const UI_COPY: Record<Lang, Record<string, string>> = {
  tr: {
    subtitle: 'GENEL GÖRELİLİK KARA DELİK SİMÜLATÖRÜ',
    obsHawking: 'HAWKING DIŞ',
    obsProper: 'ÖZ ZAMAN (τ)',
    obsCockpit: 'KOKPİT',
    gridBtn: 'UZAY-ZAMAN AĞI',
    freeFallBtn: 'SERBEST DÜŞÜŞ',
    freeFallStop: 'DURDUR',
    dossierBtn: 'BİLİMSEL REHBER',
    resetBtn: 'SIFIRLA',
    hideHud: 'ARAYÜZÜ GİZLE [H]',
    showHud: 'ARAYÜZÜ GÖSTER [H]',
    tipObsHawking: 'Stephen Hawking Uzak Gözlemci: Uzaktan bakan kişi mekiğin ufukta yavaşlayıp donduğunu, kızıla kaydığını ve spagettileştiğini görür.',
    tipObsProper: 'Öz Zaman (τ) Modu: Mekiğin kendi zamanıyla olay ufkunu geçip kara deliğin derinliklerine (r→0) düş!',
    tipObsCockpit: '1. Şahıs NASA Uzay Mekiği Kokpit Penceresinden Bak [C]',
    tipGrid: 'Uzay-zamanın trambolin gibi nasıl huni şeklinde büküldüğünü 3B ızgarayla göster [G]',
    tipFreeFall: 'Motorları kapatıp otomatik olarak kara deliğe serbest düşüş başlat [Space]',
    tipDossier: 'Herkes İçin Basit Anlatımlı Kara Delik Rehberi, Bilimsel Teoriler, Hipotezler & Kaynakça',
    qualityLabel: 'GÖRÜNTÜ KALİTESİ',
    qLow: 'DÜŞÜK',
    qMed: 'ORTA',
    qHigh: 'YÜKSEK',
    qUltra: 'ULTRA',
    qAuto: 'OTO',
    shuttleStretch: 'SPAGETTİ UZAMA',
    shuttleRedshift: 'KIZILA KAYMA',
    shuttleFreeze: 'UFUK DONMASI',
    scrollPrompt: 'AŞAĞI KAYDIR: KARA DELİĞE ÇEKİL VE SPAGETTİLEŞMEYİ İZLE · SÜRÜKLE: YÖRÜNGEDE DÖN',
    telHeader: '01 // CANLI UZAY TELEMETRİSİ',
    metricDist: 'MESAFE (r)',
    metricDilation: 'ZAMAN YAVAŞLAMASI',
    metricClocks: 'GEMİ / DÜNYA SAATİ',
    metricSpeed: 'DÜŞÜŞ HIZI',
    metricRedshift: 'KIZILA KAYMA (z)',
    metricTidal: 'SPAGETTİ ÇEKİMİ (2m / MEKİK)',
    metricSingularity: 'MERKEZE KALAN SÜRE',
    metricFrameDrag: 'UZAY GİRDABI',
    metricKretschmann: 'UZAY BÜKÜLMESİ (K)',
    metricHawking: 'HAWKING T_H',
    metricEvap: 'BUHARLAŞMA',
    metricEntropy: 'ENTROPİ S',
    // Plain-language kid-friendly hover tooltips for every metric & control!
    expDist: 'Kara deliğin merkezine uzaklığın. 1 r_s = kara deliğin temel yarıçapı (Schwarzschild yarıçapı).',
    expDilation: 'Ağır kütleçekimi zamanı yavaşlatır! Senin geminde 1 saniye geçerken Dünya’da kaç saniye geçtiğini gösterir.',
    expClocks: 'Sol: mekikteki saat (τ). Sağ: uzaktaki Dünya saati (t). Ufka yaklaştıkça Dünya saati hızla öne geçer!',
    expSpeed: 'Motor kullanmadan düşerken ulaştığın hız (1.000 c = ışık hızı). Kızıl kayma (z) ışığın ne kadar uzayıp kızardığıdır.',
    expTidal: 'Başın ile ayakların (2m) veya mekiğin burnu ile kuyruğu (37m) arasındaki çekim farkı. Yüksek g mekiği spagetti gibi uzatır!',
    expSingularity: 'Mekiğin kendi saatine göre merkeze (tekilliğe) düşene kadar kalan süre ve dönen uzayın seni sürükleme hızı.',
    expStretch: 'Weyl gelgit kuvvetinin 3B NASA mekiğini burnundan tutup ne kadar uzattığını gösterir (1.00× = tamamen sağlam).',
    expRedshift: 'Işık yerçekimine karşı tırmanırken enerji kaybedip kırmızıya kayar (%100 = olay ufkunda görünmez kızılötesi).',
    expKretschmann: 'Kretschmann Skaları (K): Uzayın o noktada gerçekte ne kadar keskin büküldüğünü ölçen evrensel sayı.',
    expHawking: 'Hawking Sıcaklığı (T_H): Kuantum etkilerle kara deliğin yaydığı aşırı soğuk termal ışıma sıcaklığı.',
    expEvap: 'Hawking Radyasyonu ile bu kara deliğin tamamen buharlaşıp yok olması için gereken yıl sayısı.',
    expEntropy: 'Bekenstein–Hawking Entropisi: Kara deliğin yüzey alanında saklayabileceği maksimum kuantum bilgi miktarı.',
    ctrlHeader: '02 // KARA DELİK AYARLARI & KALİTE',
    spinLabel: 'DÖNÜŞ HIZI (KERR a*)',
    spinSchw: 'DÖNMEYEN (0)',
    spinThorne: 'MAX HIZ (0.998)',
    dopplerToggle: 'DOPPLER PARLAKLIĞI (SOL MAVİ / SAĞ KIZIL)',
    jetsToggle: 'KUTUP LAZER JETLERİ (BLANDFORD–ZNAJEK)',
    gridToggle: '3B UZAY-ZAMAN BÜKÜLME HUNİSİ (FLAMM)',
    hawkingToggle: 'HAWKING KUANTUM UFUK IŞIMASI (BÜYÜTMELİ)',
    lockToggle: 'GERÇEK OLAY UFKU KİLİDİ (İÇERİDEN KAÇIŞ YOK)',
    diagramHeader: '03 // UZAY HUNİSİ & IŞIK KONİSİ EĞİMİ',
    diagramLegendCone: 'IŞIK KONİSİ EĞİMİ',
    depthTitle: 'RADYAL DERİNLİK',
    escapeAlertTitle: 'KAÇIŞ İMKÂNSIZ — OLAY UFKU İÇİNDESİN!',
    escapeAlertBody:
      'Şelalenin kenarını geçtin! Tüm roket motorları %100 güçte olsa bile r < r_+ içinde tüm yollar merkeze çıkar. Dışarı dönmek için Sıfırla [R] tuşuna bas.',
    loadingShuttle: '3B NASA UZAY MEKİĞİ & KARA DELİK MOTORU BAŞLATILIYOR...',
    earthRatioSuffix: 'sn Dünya / 1 sn Gemi',
    frozenAtHorizon: '∞ (Ufukta dondu)',
    collapsePanel: 'Paneli Küçült / Aç',
    audioTip: 'Uzay & Çekim Sesi [M]',
  },
  en: {
    subtitle: 'GENERAL RELATIVITY BLACK HOLE SIMULATOR',
    obsHawking: 'HAWKING EXT.',
    obsProper: 'PROPER TIME (τ)',
    obsCockpit: 'COCKPIT',
    gridBtn: 'SPACETIME GRID',
    freeFallBtn: 'FREE-FALL',
    freeFallStop: 'STOP',
    dossierBtn: 'SCIENCE GUIDE',
    resetBtn: 'RESET',
    hideHud: 'HIDE HUD [H]',
    showHud: 'SHOW HUD [H]',
    tipObsHawking: 'Stephen Hawking Distant Observer: Watch the Shuttle slow down, freeze at the horizon, redshift, and spaghettify.',
    tipObsProper: 'Proper Time (τ) Mode: Cross the event horizon in the Shuttle’s own clock and plunge all the way to r→0!',
    tipObsCockpit: '1st-Person NASA Space Shuttle Flight Deck Window [C]',
    tipGrid: 'Show how gravity bends spacetime like a 3D trampoline funnel [G]',
    tipFreeFall: 'Cut engines and fall freely into the black hole [Space]',
    tipDossier: 'Plain-Language Black Hole Guide (ELI10), Scientific Theories, Hypotheses & Citations',
    qualityLabel: 'GRAPHICS QUALITY',
    qLow: 'LOW',
    qMed: 'MED',
    qHigh: 'HIGH',
    qUltra: 'ULTRA',
    qAuto: 'AUTO',
    shuttleStretch: 'SPAGHETTI STRETCH',
    shuttleRedshift: 'REDSHIFT',
    shuttleFreeze: 'HORIZON FREEZE',
    scrollPrompt: 'SCROLL DOWN: PLUNGE & WATCH SPAGHETTIFICATION · DRAG: ORBIT CAMERA',
    telHeader: '01 // LIVE SPACE TELEMETRY',
    metricDist: 'DISTANCE (r)',
    metricDilation: 'TIME SLOWDOWN',
    metricClocks: 'SHIP / EARTH CLOCK',
    metricSpeed: 'FALL SPEED',
    metricRedshift: 'REDSHIFT (z)',
    metricTidal: 'SPAGHETTI PULL (2m / SHIP)',
    metricSingularity: 'TIME TO CENTER',
    metricFrameDrag: 'SPACE WHIRLPOOL',
    metricKretschmann: 'SPACE CURVATURE (K)',
    metricHawking: 'HAWKING T_H',
    metricEvap: 'EVAP. TIME',
    metricEntropy: 'ENTROPY S',
    expDist: 'Your distance from the black hole center. 1 r_s is its fundamental Schwarzschild radius.',
    expDilation: 'Strong gravity slows down time! Shows how many Earth seconds tick for every 1 second on your ship.',
    expClocks: 'Left: ship wristwatch (τ). Right: distant Earth clock (t). Near the horizon Earth races ahead!',
    expSpeed: 'Free-fall speed (1.000 c = speed of light). Redshift (z) measures how much escaping light stretches red.',
    expTidal: 'Gravity difference between head & feet (2m) or Shuttle nose & tail (37m). High g stretches the ship like spaghetti!',
    expSingularity: 'Ship time left before hitting the center (r=0), plus how fast spinning spacetime drags you sideways.',
    expStretch: 'How much Weyl tidal curvature is stretching the 3D NASA Shuttle nose-to-tail (1.00× = completely intact).',
    expRedshift: 'Light loses energy climbing out of gravity and shifts red (100% = invisible infrared right at the horizon).',
    expKretschmann: 'Kretschmann Scalar (K): The true coordinate-free measurement of how sharply spacetime curves here.',
    expHawking: 'Hawking Temperature (T_H): The ultra-cold quantum thermal glow predicted by Stephen Hawking (1974).',
    expEvap: 'Total years required for this black hole to completely evaporate via Hawking radiation.',
    expEntropy: 'Bekenstein–Hawking Entropy: Maximum quantum information stored on the black hole’s horizon area.',
    ctrlHeader: '02 // BLACK HOLE OPTICS & QUALITY',
    spinLabel: 'SPIN SPEED (KERR a*)',
    spinSchw: 'NON-SPINNING (0)',
    spinThorne: 'MAX SPIN (0.998)',
    dopplerToggle: 'DOPPLER BRIGHTNESS (BLUE LEFT / RED RIGHT)',
    jetsToggle: 'POLAR PLASMA JETS (BLANDFORD–ZNAJEK)',
    gridToggle: '3D SPACETIME TRAMPOLINE FUNNEL (FLAMM)',
    hawkingToggle: 'HAWKING QUANTUM HORIZON GLOW (MAGNIFIED)',
    lockToggle: 'REAL EVENT HORIZON LOCK (NO ESCAPE)',
    diagramHeader: '03 // SPACETIME FUNNEL & LIGHT CONE TILT',
    diagramLegendCone: 'LIGHT CONE TILT',
    depthTitle: 'RADIAL DEPTH',
    escapeAlertTitle: 'ESCAPE IMPOSSIBLE — INSIDE THE EVENT HORIZON!',
    escapeAlertBody:
      'You crossed the waterfall edge! Even at 100% engine thrust, every path inside r < r_+ leads inward. Press Reset [R] to restart outside.',
    loadingShuttle: 'INITIALIZING 3D NASA SPACE SHUTTLE & BLACK HOLE ENGINE...',
    earthRatioSuffix: 's Earth / 1s Ship',
    frozenAtHorizon: '∞ (Frozen at horizon)',
    collapsePanel: 'Collapse / Expand Panel',
    audioTip: 'Relativistic Space Audio [M]',
  },
};

export function tr(lang: Lang, key: string): string {
  return UI_COPY[lang][key] ?? UI_COPY.tr[key] ?? key;
}
