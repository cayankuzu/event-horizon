import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BLACK_HOLE_MAP, BLACK_HOLE_PRESETS, BlackHoleId } from './physics/blackHoles';
import {
  formatDurationSec,
  formatPhysicalDistance,
  formatScientificExp,
  formatTidalG,
} from './physics/relativity';
import {
  EngineSnapshot,
  EventHorizonEngine,
  ObserverFrameMode,
  PerfQuality,
} from './engine/EventHorizonEngine';
import { Lang, TIDAL_STATUS_LABELS, tr, ZONE_NARRATIONS } from './i18n/translations';
import {
  IconAudioOff,
  IconAudioOn,
  IconBook,
  IconChevron,
  IconEye,
  IconGrid,
  IconPlunge,
  IconReset,
  IconWarning,
} from './ui/icons';
import { SpacetimeDiagram } from './ui/SpacetimeDiagram';
import { ScientificDossier } from './ui/ScientificDossier';

const LOG_MIN = Math.log(0.004);
const LOG_MAX = Math.log(46.0);

function rToRailPercent(r: number): number {
  const clamped = Math.max(0.004, Math.min(46.0, r));
  return ((LOG_MAX - Math.log(clamped)) / (LOG_MAX - LOG_MIN)) * 100;
}

function railPercentToR(pct: number): number {
  const c = Math.max(0, Math.min(100, pct)) / 100;
  return Math.exp(LOG_MAX - c * (LOG_MAX - LOG_MIN));
}

function formatClock(sec: number): string {
  if (!Number.isFinite(sec)) return '∞';
  if (sec >= 86400 * 365) return `${(sec / (86400 * 365)).toFixed(1)}y`;
  if (sec >= 86400) return `${(sec / 86400).toFixed(1)}d`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${s.toFixed(0).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${s.toFixed(1).padStart(4, '0')}`;
}

export const App: React.FC = () => {
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<EventHorizonEngine | null>(null);

  const [snap, setSnap] = useState<EngineSnapshot | null>(null);
  const [webglError, setWebglError] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>('tr');
  const [audioOn, setAudioOn] = useState(false);
  const [cinematic, setCinematic] = useState(false);
  const [dossierOpen, setDossierOpen] = useState(false);
  const [telCollapsed, setTelCollapsed] = useState(false);
  const [ctrlCollapsed, setCtrlCollapsed] = useState(false);
  const [narrCollapsed, setNarrCollapsed] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) return;
    let eng: EventHorizonEngine | null = null;
    try {
      eng = new EventHorizonEngine(host, (nextSnap) => {
        setSnap(nextSnap);
      });
      engineRef.current = eng;
      setWebglError(null);
    } catch (err) {
      console.warn('[EventHorizon] WebGL initialization fallback:', err);
      setWebglError(err instanceof Error ? err.message : 'WebGL context unavailable');
    }
    return () => {
      eng?.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    const onWheelHint = () => setHasScrolled(true);
    window.addEventListener('wheel', onWheelHint, { passive: true });
    return () => window.removeEventListener('wheel', onWheelHint);
  }, []);

  const toggleAudio = useCallback(() => {
    if (!engineRef.current) return;
    const next = engineRef.current.audio.toggle();
    setAudioOn(next);
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      const eng = engineRef.current;
      if (!eng) return;
      const p = eng.getParams();

      switch (e.code) {
        case 'KeyC': {
          const order: ObserverFrameMode[] = ['hawking', 'proper', 'cockpit'];
          const next = order[(order.indexOf(p.observerMode) + 1) % order.length];
          eng.updateParams({ observerMode: next });
          break;
        }
        case 'KeyG':
          eng.updateParams({ spacetimeGrid: !p.spacetimeGrid });
          break;
        case 'Space':
          e.preventDefault();
          eng.updateParams({ autoFreeFall: !p.autoFreeFall });
          break;
        case 'KeyR':
          eng.resetOrbit();
          break;
        case 'KeyM':
          toggleAudio();
          break;
        case 'KeyH':
          setCinematic((v) => !v);
          break;
        case 'Escape':
          setDossierOpen(false);
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggleAudio]);

  const selectBlackHole = (id: BlackHoleId) => {
    engineRef.current?.updateParams({ blackHoleId: id });
  };

  const handleRailClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = ((e.clientY - rect.top) / rect.height) * 100;
    engineRef.current?.setTargetRadiusRs(railPercentToR(pct));
    setHasScrolled(true);
  };

  const tel = snap?.telemetry;
  const params = snap?.params;
  const shuttleSt = snap?.shuttleState;
  const preset = params ? BLACK_HOLE_MAP[params.blackHoleId] : BLACK_HOLE_PRESETS[0];
  const zoneInfo = tel ? ZONE_NARRATIONS[tel.zone] : ZONE_NARRATIONS.DEEP_SPACE;

  // Non-overlapping staggered physical milestone markers along 46 r_s -> 0.004 r_s
  const railMarks = tel
    ? (() => {
        const raw = [
          { key: '32', label: '32 r_s', r: 32, cls: '' },
          { key: '5', label: '5 r_s', r: 5.0, cls: '' },
          { key: 'isco', label: `ISCO ${tel.radii.rIscoProRs.toFixed(2)}`, r: tel.radii.rIscoProRs, cls: 'gold' },
          { key: 'ph', label: `r_ph ${tel.radii.rPhotonProRs.toFixed(2)}`, r: tel.radii.rPhotonProRs, cls: 'mint' },
          { key: 'eh', label: `r_+ ${tel.radii.rPlusRs.toFixed(2)}`, r: tel.radii.rPlusRs, cls: 'red' },
          { key: 'sing', label: 'r→0', r: 0.008, cls: 'red' },
        ].map((m) => ({ ...m, topPct: rToRailPercent(m.r), displayPct: rToRailPercent(m.r) }));

        const minGap = 6.8;
        raw[raw.length - 1].displayPct = 97;
        for (let i = 1; i < raw.length - 1; i++) {
          if (raw[i].displayPct - raw[i - 1].displayPct < minGap) {
            raw[i].displayPct = raw[i - 1].displayPct + minGap;
          }
        }
        for (let i = raw.length - 2; i >= 1; i--) {
          if (raw[i + 1].displayPct - raw[i].displayPct < minGap) {
            raw[i].displayPct = Math.max(12, raw[i + 1].displayPct - minGap);
          }
        }
        return raw;
      })()
    : [];

  return (
    <div className={`app-shell ${cinematic ? 'cinematic' : ''} ${tel?.insideHorizon ? 'in-horizon' : ''}`}>
      {/* Fullscreen WebGL2 HDR Geodesic Raytracer + GPU Weyl Spaghettification NASA Space Shuttle Canvas */}
      <div ref={canvasHostRef} className="canvas-viewport" />

      {snap && !snap.shuttleLoaded && (
        <div className="boot-pill">{tr(lang, 'loadingShuttle')}</div>
      )}

      {webglError && (
        <div className="boot-pill">
          {lang === 'tr'
            ? 'WebGL 3B bağlamı başlatılamadı — donanım hızlandırmayı açıp sayfayı yenileyin. Bilimsel Rehber aktif.'
            : 'WebGL 3D context unavailable — enable hardware acceleration and reload. Science Guide remains active.'}
        </div>
      )}

      {cinematic && (
        <button className="restore-hud-btn" onClick={() => setCinematic(false)}>
          <IconEye size={13} />
          <span>{tr(lang, 'showHud')}</span>
        </button>
      )}

      {/* TOP SWISS-BRUTALIST OBSERVATORY BAR */}
      <header className="top-bar hud-el">
        <div className="top-left">
          <a href="https://fikkis.vercel.app/" target="_blank" rel="noopener noreferrer" className="brand-link">
            fikkis<span className="dot">.</span>
          </a>
          <div className="title-block">
            <span className="main-title">EVENT HORIZON</span>
            <span className={`zone-pill ${tel?.insideHorizon ? 'danger' : ''}`}>
              {lang === 'tr' ? zoneInfo.badgeTr.split('// ')[1] : zoneInfo.badgeEn.split('// ')[1]}
            </span>
          </div>
        </div>

        {/* 4 Real Peer-Reviewed Black Hole Presets */}
        <div className="bh-presets" role="group" aria-label="Black Hole Presets">
          {BLACK_HOLE_PRESETS.map((bh) => (
            <button
              key={bh.id}
              className={`bh-btn ${params?.blackHoleId === bh.id ? 'active' : ''}`}
              onClick={() => selectBlackHole(bh.id)}
              title={lang === 'tr' ? bh.noteTr : bh.noteEn}
            >
              {bh.code}
            </button>
          ))}
        </div>

        {/* 3-Way Scientific Observer Frame Switcher (Hawking Distant / Proper Time / Cockpit) */}
        <div className="obs-presets" role="group" aria-label="Observer Reference Frame">
          {(
            [
              ['hawking', 'obsHawking', 'tipObsHawking'],
              ['proper', 'obsProper', 'tipObsProper'],
              ['cockpit', 'obsCockpit', 'tipObsCockpit'],
            ] as [ObserverFrameMode, string, string][]
          ).map(([mode, lblKey, tipKey]) => (
            <button
              key={mode}
              className={`bh-btn ${params?.observerMode === mode ? 'active-blue' : ''}`}
              onClick={() => engineRef.current?.updateParams({ observerMode: mode })}
              title={tr(lang, tipKey)}
              aria-label={tr(lang, tipKey)}
            >
              {tr(lang, lblKey)}
            </button>
          ))}
        </div>

        {/* Action Controls */}
        <div className="top-right">
          <button
            className={`hud-btn ${params?.spacetimeGrid ? 'active' : ''}`}
            onClick={() => engineRef.current?.updateParams({ spacetimeGrid: !params?.spacetimeGrid })}
            title={tr(lang, 'tipGrid')}
            aria-label={tr(lang, 'tipGrid')}
          >
            <IconGrid size={13} />
            <span>{tr(lang, 'gridBtn')}</span>
          </button>

          <button
            className={`hud-btn ${params?.autoFreeFall ? 'active-danger' : ''}`}
            onClick={() => engineRef.current?.updateParams({ autoFreeFall: !params?.autoFreeFall })}
            title={tr(lang, 'tipFreeFall')}
            aria-label={tr(lang, 'tipFreeFall')}
          >
            <IconPlunge size={13} />
            <span>{params?.autoFreeFall ? tr(lang, 'freeFallStop') : tr(lang, 'freeFallBtn')}</span>
          </button>

          <button
            className="hud-btn accent"
            onClick={() => setDossierOpen(true)}
            title={tr(lang, 'tipDossier')}
            aria-label={tr(lang, 'tipDossier')}
          >
            <IconBook size={13} />
            <span>{tr(lang, 'dossierBtn')}</span>
          </button>

          <button
            className="icon-btn"
            onClick={() => engineRef.current?.resetOrbit()}
            title={`${tr(lang, 'resetBtn')} [R]`}
            aria-label={`${tr(lang, 'resetBtn')} [R]`}
          >
            <IconReset size={14} />
          </button>

          <button
            className={`icon-btn ${audioOn ? 'active' : ''}`}
            onClick={toggleAudio}
            title={tr(lang, 'audioTip')}
            aria-label={tr(lang, 'audioTip')}
          >
            {audioOn ? <IconAudioOn size={14} /> : <IconAudioOff size={14} />}
          </button>

          <button
            className="icon-btn mono"
            onClick={() => setLang((l) => (l === 'tr' ? 'en' : 'tr'))}
            title="TR / EN"
            aria-label="Language TR / EN"
          >
            {lang.toUpperCase()}
          </button>

          <button
            className="icon-btn"
            onClick={() => setCinematic(true)}
            title={tr(lang, 'hideHud')}
            aria-label={tr(lang, 'hideHud')}
          >
            <IconEye size={14} />
          </button>
        </div>
      </header>

      {/* TOP-CENTER CONTEXTUAL RELATIVISTIC NARRATOR */}
      {tel && (
        <section className={`narrator-bar hud-el ${narrCollapsed ? 'collapsed' : ''} ${tel.insideHorizon ? 'danger' : ''}`}>
          <div className="narrator-head">
            <div className="narrator-titles">
              <span className="narrator-kicker">{lang === 'tr' ? zoneInfo.badgeTr : zoneInfo.badgeEn}</span>
              <strong className="narrator-title">{lang === 'tr' ? zoneInfo.titleTr : zoneInfo.titleEn}</strong>
            </div>
            <div className="narrator-right">
              <code className="narrator-formula">{zoneInfo.formula}</code>
              <button
                className="mini-icon-btn"
                onClick={() => setNarrCollapsed((c) => !c)}
                title={tr(lang, 'collapsePanel')}
              >
                <IconChevron size={12} />
              </button>
            </div>
          </div>
          {!narrCollapsed && (
            <p className="narrator-body">
              {lang === 'tr' ? zoneInfo.bodyTr : zoneInfo.bodyEn}
              <span className="bh-ref-inline"> · {preset.catalogRef}</span>
            </p>
          )}
        </section>
      )}

      {/* STRICT HORIZON NO-ESCAPE ALERT BANNER */}
      {snap?.escapeBlockedFlash && (
        <div className="escape-alert hud-el">
          <IconWarning size={16} />
          <div>
            <strong>{tr(lang, 'escapeAlertTitle')}</strong>
            <span>{tr(lang, 'escapeAlertBody')}</span>
          </div>
          <button className="hud-btn active-danger" onClick={() => engineRef.current?.resetOrbit()}>
            {tr(lang, 'resetBtn')} [R]
          </button>
        </div>
      )}

      {/* RIGHT VERTICAL LOGARITHMIC RADIAL DEPTH SCRUBBER (46 r_s -> 0.004 r_s) */}
      {tel && (
        <aside className="depth-rail hud-el" aria-label={tr(lang, 'depthTitle')}>
          <div className="depth-header">r / r_s</div>
          <div className="depth-track" onClick={handleRailClick}>
            <div
              className="depth-horizon-fill"
              style={{ top: `${rToRailPercent(tel.radii.rPlusRs)}%`, bottom: '0%' }}
            />

            {railMarks.map((mk) => (
              <button
                key={mk.key}
                className={`depth-mark ${mk.cls}`}
                style={{ top: `${mk.displayPct}%` }}
                onClick={(e) => {
                  e.stopPropagation();
                  engineRef.current?.setTargetRadiusRs(mk.r);
                  setHasScrolled(true);
                }}
              >
                <span>{mk.label}</span>
              </button>
            ))}

            <div
              className={`depth-cursor ${tel.insideHorizon ? 'danger' : ''}`}
              style={{ top: `${rToRailPercent(tel.rInRs)}%` }}
            >
              <span className="cursor-readout">
                {tel.rInRs < 0.1 ? tel.rInRs.toFixed(3) : tel.rInRs.toFixed(2)} r_s
              </span>
            </div>
          </div>
          <div className="depth-fps">{snap.fps} FPS</div>
        </aside>
      )}

      {/* BOTTOM-LEFT LIVE GENERAL RELATIVITY & HAWKING TELEMETRY DECK */}
      {tel && (
        <aside className={`lab-panel bottom-left hud-el ${telCollapsed ? 'collapsed' : ''}`}>
          <div className="panel-head">
            <span className="panel-title">{tr(lang, 'telHeader')}</span>
            <button
              className="mini-icon-btn"
              onClick={() => setTelCollapsed((c) => !c)}
              title={tr(lang, 'collapsePanel')}
            >
              <IconChevron size={12} />
            </button>
          </div>
          {!telCollapsed && (
            <div className="panel-body">
              <div className="bh-identity">
                <strong>{lang === 'tr' ? preset.nameTr : preset.nameEn}</strong>
                <span>
                  M = {formatScientificExp(preset.massSolar)} M☉ · r_s = {formatPhysicalDistance(tel.rsMeters)}
                </span>
              </div>

              <div className="telemetry-grid">
                <div className="t-cell" title={tr(lang, 'expDist')}>
                  <span className="t-lbl">{tr(lang, 'metricDist')}</span>
                  <strong className="t-val">
                    {tel.rInRs < 0.1 ? tel.rInRs.toFixed(3) : tel.rInRs.toFixed(2)} r_s
                  </strong>
                  <span className="t-sub">{formatPhysicalDistance(tel.distanceMeters)}</span>
                </div>

                <div className="t-cell" title={tr(lang, 'expDilation')}>
                  <span className="t-lbl">{tr(lang, 'metricDilation')}</span>
                  <strong className={`t-val ${tel.insideHorizon ? 'danger-txt' : ''}`}>
                    {Number.isFinite(tel.earthSecondsPerShipSecond)
                      ? `${tel.earthSecondsPerShipSecond.toFixed(3)}×`
                      : '∞'}
                  </strong>
                  <span className="t-sub">
                    {Number.isFinite(tel.earthSecondsPerShipSecond)
                      ? tr(lang, 'earthRatioSuffix')
                      : tr(lang, 'frozenAtHorizon')}
                  </span>
                </div>

                <div className="t-cell" title={tr(lang, 'expClocks')}>
                  <span className="t-lbl">{tr(lang, 'metricClocks')}</span>
                  <strong className="t-val">
                    {formatClock(snap.shipClockSec)} / {formatClock(snap.earthClockSec)}
                  </strong>
                  <span className="t-sub">τ_ship · t_Earth</span>
                </div>

                <div className="t-cell" title={tr(lang, 'expSpeed')}>
                  <span className="t-lbl">{tr(lang, 'metricSpeed')}</span>
                  <strong className={`t-val ${tel.freeFallBeta >= 1 ? 'danger-txt' : ''}`}>
                    {tel.freeFallBeta.toFixed(3)} c
                  </strong>
                  <span className="t-sub">
                    {tr(lang, 'metricRedshift')}:{' '}
                    {Number.isFinite(tel.gravitationalRedshift) ? tel.gravitationalRedshift.toFixed(2) : '∞'}
                  </span>
                </div>

                <div className="t-cell" title={tr(lang, 'expTidal')}>
                  <span className="t-lbl">{tr(lang, 'metricTidal')}</span>
                  <strong className={`t-val tidal-${tel.tidalStatus.toLowerCase()}`}>
                    {formatTidalG(tel.tidalHumanG)}
                  </strong>
                  <span className="t-sub">
                    {lang === 'tr' ? TIDAL_STATUS_LABELS[tel.tidalStatus].tr : TIDAL_STATUS_LABELS[tel.tidalStatus].en}{' '}
                    · {formatTidalG(tel.tidalShuttleG)}
                  </span>
                </div>

                <div className="t-cell" title={tr(lang, 'expSingularity')}>
                  <span className="t-lbl">{tr(lang, 'metricSingularity')}</span>
                  <strong className="t-val">{formatDurationSec(tel.properTimeToSingularitySec, lang)}</strong>
                  <span className="t-sub">
                    {tr(lang, 'metricFrameDrag')}: {(tel.frameDragBeta * 100).toFixed(1)}% c
                  </span>
                </div>
              </div>

              {shuttleSt && (
                <div className="shuttle-phys-strip">
                  <span title={tr(lang, 'expStretch')}>
                    {tr(lang, 'shuttleStretch')}:{' '}
                    <strong className={shuttleSt.stretchFactor > 1.2 ? 'danger-txt' : ''}>
                      {shuttleSt.stretchFactor.toFixed(2)}×
                    </strong>
                  </span>
                  <span title={tr(lang, 'expRedshift')}>
                    {tr(lang, 'shuttleRedshift')}:{' '}
                    <strong className={shuttleSt.redshiftRatio > 0.35 ? 'danger-txt' : ''}>
                      {Math.round(shuttleSt.redshiftRatio * 100)}%
                    </strong>
                  </span>
                  <span title={tr(lang, 'expKretschmann')}>
                    K:{' '}
                    <strong>{formatScientificExp(tel.kretschmannScalarM4)}</strong>
                  </span>
                </div>
              )}

              <div className="quantum-strip">
                <span title={tr(lang, 'expHawking')}>
                  {tr(lang, 'metricHawking')}: <strong>{formatScientificExp(tel.hawkingTempK)} K</strong>
                </span>
                <span title={tr(lang, 'expEvap')}>
                  t_evap: <strong>10^{tel.log10HawkingEvapYears.toFixed(1)}y</strong>
                </span>
                <span title={tr(lang, 'expEntropy')}>
                  S: <strong>10^{tel.log10Entropy.toFixed(1)}</strong>
                </span>
              </div>
            </div>
          )}
        </aside>
      )}

      {/* BOTTOM-RIGHT KERR METRIC, OPTICS, GRAPHICS QUALITY & FLAMM FUNNEL */}
      {tel && params && (
        <aside className={`lab-panel bottom-right hud-el ${ctrlCollapsed ? 'collapsed' : ''}`}>
          <div className="panel-head">
            <span className="panel-title">{tr(lang, 'ctrlHeader')}</span>
            <button
              className="mini-icon-btn"
              onClick={() => setCtrlCollapsed((c) => !c)}
              title={tr(lang, 'collapsePanel')}
            >
              <IconChevron size={12} />
            </button>
          </div>
          {!ctrlCollapsed && (
            <div className="panel-body">
              {/* Prominent 5-Option Graphics Quality Selector (LOW / MED / HIGH / ULTRA / AUTO) */}
              <div className="perf-row">
                <div className="perf-head">
                  <span className="perf-lbl">{tr(lang, 'qualityLabel')}</span>
                  <span className="perf-meta">
                    {Math.round((shuttleSt?.renderScale ?? 0.88) * 100)}% ·{' '}
                    {shuttleSt?.bloomActive ? 'HDR BLOOM' : 'FAST'}
                  </span>
                </div>
                <div className="perf-segs five">
                  {(
                    [
                      ['low', 'qLow'],
                      ['medium', 'qMed'],
                      ['high', 'qHigh'],
                      ['ultra', 'qUltra'],
                      ['auto', 'qAuto'],
                    ] as [PerfQuality, string][]
                  ).map(([q, k]) => (
                    <button
                      key={q}
                      className={`perf-btn ${params.quality === q ? 'active' : ''}`}
                      onClick={() => engineRef.current?.updateParams({ quality: q })}
                    >
                      {tr(lang, k)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="slider-box">
                <div className="slider-head">
                  <span>{tr(lang, 'spinLabel')}</span>
                  <strong>a* = {params.spin.toFixed(3)}</strong>
                </div>
                <input
                  type="range"
                  min={0}
                  max={0.998}
                  step={0.002}
                  value={params.spin}
                  onChange={(e) => engineRef.current?.updateParams({ spin: parseFloat(e.target.value) })}
                />
                <div className="slider-scale">
                  <span>{tr(lang, 'spinSchw')}</span>
                  <span>{tr(lang, 'spinThorne')}</span>
                </div>
              </div>

              <div className="toggle-stack">
                <button
                  className={`toggle-row ${params.dopplerBeaming ? 'active' : ''}`}
                  onClick={() => engineRef.current?.updateParams({ dopplerBeaming: !params.dopplerBeaming })}
                >
                  <span>{tr(lang, 'dopplerToggle')}</span>
                  <span className="toggle-state">{params.dopplerBeaming ? 'ON' : 'OFF'}</span>
                </button>

                <button
                  className={`toggle-row ${params.relativisticJets ? 'active' : ''}`}
                  onClick={() => engineRef.current?.updateParams({ relativisticJets: !params.relativisticJets })}
                >
                  <span>{tr(lang, 'jetsToggle')}</span>
                  <span className="toggle-state">{params.relativisticJets ? 'ON' : 'OFF'}</span>
                </button>

                <button
                  className={`toggle-row ${params.spacetimeGrid ? 'active' : ''}`}
                  onClick={() => engineRef.current?.updateParams({ spacetimeGrid: !params.spacetimeGrid })}
                >
                  <span>{tr(lang, 'gridToggle')}</span>
                  <span className="toggle-state">{params.spacetimeGrid ? 'ON' : 'OFF'}</span>
                </button>

                <button
                  className={`toggle-row ${params.hawkingGlow ? 'active' : ''}`}
                  onClick={() => engineRef.current?.updateParams({ hawkingGlow: !params.hawkingGlow })}
                >
                  <span>{tr(lang, 'hawkingToggle')}</span>
                  <span className="toggle-state">{params.hawkingGlow ? 'ON' : 'OFF'}</span>
                </button>

                <button
                  className={`toggle-row ${params.hardHorizonLock ? 'active-danger' : ''}`}
                  onClick={() => engineRef.current?.updateParams({ hardHorizonLock: !params.hardHorizonLock })}
                >
                  <span>{tr(lang, 'lockToggle')}</span>
                  <span className="toggle-state">{params.hardHorizonLock ? 'ON' : 'OFF'}</span>
                </button>
              </div>

              <div className="diagram-section">
                <div className="diagram-kicker">{tr(lang, 'diagramHeader')}</div>
                <SpacetimeDiagram telemetry={tel} lang={lang} />
              </div>
            </div>
          )}
        </aside>
      )}

      {!hasScrolled && !cinematic && (
        <div className="scroll-cue hud-el">
          <span className="scroll-mouse" />
          <span>{tr(lang, 'scrollPrompt')}</span>
        </div>
      )}

      {/* BILINGUAL KATEX SCIENTIFIC THEORIES & HYPOTHESES MONOGRAPH */}
      <ScientificDossier
        open={dossierOpen}
        lang={lang}
        preset={preset}
        telemetry={tel ?? null}
        onClose={() => setDossierOpen(false)}
      />
    </div>
  );
};
