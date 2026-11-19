/**
 * Procedural Web Audio deep-space relativistic soundscape.
 * Generates zero external audio fetches:
 *  - Sub-bass gravitational drone pitching deeper with gravitational redshift near r_+
 *  - Soft high-harmonic photon-ring shimmer near r_ph
 *  - Filtered noise OMS thruster rumble when accelerating/braking via scroll
 */
export class SpaceAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private droneFilter: BiquadFilterNode | null = null;
  private shimmerOsc: OscillatorNode | null = null;
  private shimmerGain: GainNode | null = null;
  private thrustGain: GainNode | null = null;
  private thrustFilter: BiquadFilterNode | null = null;
  public enabled = false;

  public toggle(): boolean {
    if (!this.enabled) {
      this.start();
      return true;
    } else {
      this.stop();
      return false;
    }
  }

  private start(): void {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AudioCtx();

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.0001;
        this.masterGain.connect(this.ctx.destination);

        // Deep gravitational sub-bass drone
        this.droneFilter = this.ctx.createBiquadFilter();
        this.droneFilter.type = 'lowpass';
        this.droneFilter.frequency.value = 140;
        this.droneFilter.Q.value = 2.2;
        this.droneFilter.connect(this.masterGain);

        const droneGain = this.ctx.createGain();
        droneGain.gain.value = 0.32;
        droneGain.connect(this.droneFilter);

        this.droneOsc1 = this.ctx.createOscillator();
        this.droneOsc1.type = 'sawtooth';
        this.droneOsc1.frequency.value = 46;
        this.droneOsc1.connect(droneGain);
        this.droneOsc1.start();

        this.droneOsc2 = this.ctx.createOscillator();
        this.droneOsc2.type = 'sine';
        this.droneOsc2.frequency.value = 31;
        this.droneOsc2.connect(droneGain);
        this.droneOsc2.start();

        // Subtle high photon-sphere resonance
        this.shimmerGain = this.ctx.createGain();
        this.shimmerGain.gain.value = 0.0;
        this.shimmerGain.connect(this.masterGain);

        this.shimmerOsc = this.ctx.createOscillator();
        this.shimmerOsc.type = 'triangle';
        this.shimmerOsc.frequency.value = 220;
        this.shimmerOsc.connect(this.shimmerGain);
        this.shimmerOsc.start();

        // OMS thruster filtered noise
        const bufferSize = this.ctx.sampleRate * 2;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noiseSrc = this.ctx.createBufferSource();
        noiseSrc.buffer = noiseBuffer;
        noiseSrc.loop = true;

        this.thrustFilter = this.ctx.createBiquadFilter();
        this.thrustFilter.type = 'bandpass';
        this.thrustFilter.frequency.value = 180;
        this.thrustFilter.Q.value = 0.9;

        this.thrustGain = this.ctx.createGain();
        this.thrustGain.gain.value = 0.0;

        noiseSrc.connect(this.thrustFilter);
        this.thrustFilter.connect(this.thrustGain);
        this.thrustGain.connect(this.masterGain);
        noiseSrc.start();
      }

      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      this.masterGain?.gain.setTargetAtTime(0.45, this.ctx.currentTime, 0.25);
      this.enabled = true;
    } catch {
      this.enabled = false;
    }
  }

  private stop(): void {
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.18);
    }
    this.enabled = false;
  }

  public update(rInRs: number, rPlusRs: number, thrustIntensity: number, tidalG: number): void {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;

    // Gravitational redshift stretches acoustic pitch downward as observer nears horizon
    const gravFactor = Math.max(0.28, Math.min(1.0, Math.sqrt(Math.max(0.04, 1 - rPlusRs / Math.max(rInRs, rPlusRs + 0.04)))));
    const baseHz = 26 + 34 * gravFactor;
    this.droneOsc1?.frequency.setTargetAtTime(baseHz, now, 0.12);
    this.droneOsc2?.frequency.setTargetAtTime(baseHz * 0.66, now, 0.12);

    const filterCut = 90 + (1 - gravFactor) * 260 + Math.min(250, Math.log10(1 + tidalG) * 65);
    this.droneFilter?.frequency.setTargetAtTime(filterCut, now, 0.12);

    // Photon-sphere eerie resonance
    const proxPh = Math.exp(-Math.pow((rInRs - 1.5) / 0.85, 2));
    this.shimmerGain?.gain.setTargetAtTime(proxPh * 0.075, now, 0.18);
    this.shimmerOsc?.frequency.setTargetAtTime(160 + 180 * gravFactor, now, 0.15);

    // OMS rocket thrust rumble
    const th = Math.min(1, Math.max(0, thrustIntensity));
    this.thrustGain?.gain.setTargetAtTime(th * 0.28, now, 0.08);
    this.thrustFilter?.frequency.setTargetAtTime(140 + th * 340, now, 0.08);
  }

  public dispose(): void {
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
